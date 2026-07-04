const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COL = 'remote_assist_sessions';
const PENDING_TTL_MS = 2 * 60 * 60 * 1000;
const ACTIVE_TTL_MS = 60 * 60 * 1000;
const MAX_PENDING_COMMANDS = 8;

async function isGuanliyuan(openid) {
  if (!openid) return false;
  let r = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (r.data && r.data.length > 0) return true;
  r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  return !!(r.data && r.data.length > 0);
}

function now() {
  return Date.now();
}

function fail(msg) {
  return { success: false, msg };
}

function ok(data) {
  return { success: true, ...data };
}

async function getSessionById(sessionId) {
  if (!sessionId) return null;
  try {
    const res = await db.collection(COL).doc(sessionId).get();
    return res.data || null;
  } catch (e) {
    return null;
  }
}

async function expireStaleSessions() {
  const ts = now();
  await db.collection(COL).where({
    status: 'pending',
    expiresAt: _.lt(ts)
  }).update({
    data: { status: 'ended', endedAt: ts, endReason: 'expired' }
  }).catch(() => {});
  await db.collection(COL).where({
    status: 'active',
    expiresAt: _.lt(ts)
  }).update({
    data: { status: 'ended', endedAt: ts, endReason: 'expired' }
  }).catch(() => {});
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || '';

  if (!openid) return fail('未登录');

  try {
    if (action === 'request' || action === 'accept' || action === 'hasPending') {
      await expireStaleSessions();
    }

    if (action === 'request') {
      const productKey = String(event.productKey || '').trim();
      if (!productKey) return fail('缺少产品型号');
      const existing = await db.collection(COL).where({
        userOpenid: openid,
        status: _.in(['pending', 'active'])
      }).limit(1).get();
      if (existing.data && existing.data.length) {
        const doc = existing.data[0];
        if (doc.productKey !== productKey) {
          return fail('您已在其他型号上发起远协，请先结束');
        }
        await db.collection(COL).doc(doc._id).update({
          data: {
            bleConnected: !!event.bleConnected,
            deviceSn: String(event.deviceSn || ''),
            deviceState: event.deviceState || doc.deviceState || {},
            updatedAt: now(),
            expiresAt: now() + PENDING_TTL_MS
          }
        });
        return ok({ sessionId: doc._id, status: doc.status });
      }

      const activeOther = await db.collection(COL).where({
        productKey,
        status: 'active'
      }).limit(1).get();
      if (activeOther.data && activeOther.data.length) {
        return fail('该产品已有技师正在远协，请稍后再试');
      }

      const ts = now();
      const addRes = await db.collection(COL).add({
        data: {
          userOpenid: openid,
          productKey,
          productName: String(event.productName || ''),
          productType: String(event.productType || ''),
          status: 'pending',
          adminOpenid: '',
          bleConnected: !!event.bleConnected,
          deviceSn: String(event.deviceSn || ''),
          deviceState: event.deviceState || {},
          commands: [],
          createdAt: ts,
          updatedAt: ts,
          expiresAt: ts + PENDING_TTL_MS
        }
      });
      return ok({ sessionId: addRes._id, status: 'pending' });
    }

    if (action === 'cancel' || action === 'end') {
      const sessionId = String(event.sessionId || '');
      const session = await getSessionById(sessionId);
      if (!session) return fail('会话不存在');
      const isUser = session.userOpenid === openid;
      const isAdmin = session.adminOpenid === openid;
      if (!isUser && !isAdmin) {
        const admin = await isGuanliyuan(openid);
        if (!admin) return fail('无权限');
      }
      if (session.status === 'ended') return ok({ sessionId, status: 'ended' });
      const ts = now();
      await db.collection(COL).doc(sessionId).update({
        data: {
          status: 'ended',
          endedAt: ts,
          endReason: action,
          updatedAt: ts
        }
      });
      return ok({ sessionId, status: 'ended' });
    }

    if (action === 'hasPending') {
      const admin = await isGuanliyuan(openid);
      if (!admin) return ok({ hasPending: false, sessions: [] });
      const productKey = String(event.productKey || '').trim();
      const all = event.all === true || !productKey;
      if (all) {
        const res = await db.collection(COL).where({
          status: 'pending'
        }).limit(50).get();
        const sessions = (res.data || []).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const first = sessions[0] || null;
        return ok({
          hasPending: sessions.length > 0,
          sessions,
          sessionId: first ? first._id : '',
          session: first
        });
      }
      if (!productKey) return ok({ hasPending: false, sessions: [] });
      const res = await db.collection(COL).where({
        productKey,
        status: 'pending'
      }).limit(20).get();
      const sessions = (res.data || []).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const first = sessions[0] || null;
      return ok({
        hasPending: sessions.length > 0,
        sessions,
        sessionId: first ? first._id : '',
        session: first
      });
    }

    if (action === 'accept') {
      const sessionId = String(event.sessionId || '');
      const admin = await isGuanliyuan(openid);
      if (!admin) return fail('无管理员权限');
      const session = await getSessionById(sessionId);
      if (!session) return fail('会话不存在');
      if (session.status !== 'pending') return fail('会话不可接入');
      const activeOther = await db.collection(COL).where({
        productKey: session.productKey,
        status: 'active'
      }).limit(1).get();
      if (activeOther.data && activeOther.data.length && activeOther.data[0]._id !== sessionId) {
        return fail('该产品已有技师正在远协，请先结束当前会话');
      }
      const ts = now();
      await db.collection(COL).doc(sessionId).update({
        data: {
          status: 'active',
          adminOpenid: openid,
          acceptedAt: ts,
          updatedAt: ts,
          expiresAt: ts + ACTIVE_TTL_MS
        }
      });
      const fresh = await getSessionById(sessionId);
      return ok({ session: fresh });
    }

    if (action === 'getSession') {
      const sessionId = String(event.sessionId || '');
      const session = await getSessionById(sessionId);
      if (!session) return fail('会话不存在');
      const admin = await isGuanliyuan(openid);
      const isUser = session.userOpenid === openid;
      const isAdmin = session.adminOpenid === openid;
      if (!isUser && !isAdmin && !admin) return fail('无权限');
      if (session.status === 'active') {
        await db.collection(COL).doc(sessionId).update({
          data: { updatedAt: now(), expiresAt: now() + ACTIVE_TTL_MS }
        }).catch(() => {});
        const fresh = await getSessionById(sessionId);
        return ok({ session: fresh || session });
      }
      return ok({ session });
    }

    if (action === 'pushState') {
      const sessionId = String(event.sessionId || '');
      const session = await getSessionById(sessionId);
      if (!session) return fail('会话不存在');
      if (session.userOpenid !== openid) return fail('无权限');
      if (session.status !== 'active' && session.status !== 'pending') return fail('会话已结束');
      const patch = {
        deviceState: event.deviceState || {},
        bleConnected: event.bleConnected !== undefined ? !!event.bleConnected : session.bleConnected,
        deviceSn: event.deviceSn !== undefined ? String(event.deviceSn || '') : session.deviceSn,
        updatedAt: now()
      };
      if (session.status === 'active') {
        patch.expiresAt = now() + ACTIVE_TTL_MS;
      }
      if (event.lastCmdFeedback && typeof event.lastCmdFeedback === 'object') {
        const fb = event.lastCmdFeedback;
        const commandId = String(fb.commandId || '').trim();
        if (commandId) {
          patch.lastCmdFeedback = {
            commandId,
            cmd: String(fb.cmd || ''),
            ok: fb.ok !== false,
            at: Number(fb.at) || now()
          };
        }
      }
      if (event.userAccepted !== undefined) {
        patch.userAccepted = !!event.userAccepted;
        if (patch.userAccepted) patch.userAcceptedAt = now();
      }
      await db.collection(COL).doc(sessionId).update({ data: patch });
      return ok({ sessionId });
    }

    if (action === 'enqueueCommand') {
      const sessionId = String(event.sessionId || '');
      const cmd = String(event.cmd || '').trim();
      if (!cmd) return fail('指令为空');
      const session = await getSessionById(sessionId);
      if (!session) return fail('会话不存在');
      const admin = await isGuanliyuan(openid);
      if (!admin || session.adminOpenid !== openid) return fail('无权限');
      if (session.status !== 'active') return fail('会话未激活');
      const times = Math.min(5, Math.max(1, Number(event.times) || 1));
      const intervalRaw = Number(event.interval);
      const interval = Number.isFinite(intervalRaw)
        ? Math.min(2000, Math.max(0, intervalRaw))
        : 300;

      let commands = Array.isArray(session.commands) ? [...session.commands] : [];
      const pending = commands.filter((c) => c && c.status === 'pending');

      const dup = pending.find((c) => c.cmd === cmd && c.times === times && c.interval === interval);
      if (dup) {
        await db.collection(COL).doc(sessionId).update({
          data: { updatedAt: now(), expiresAt: now() + ACTIVE_TTL_MS }
        }).catch(() => {});
        return ok({ commandId: dup.id, coalesced: true });
      }

      while (pending.length >= MAX_PENDING_COMMANDS) {
        const drop = pending.shift();
        commands = commands.map((c) => (
          c && c.id === drop.id ? { ...c, status: 'dropped', ackAt: now() } : c
        ));
      }

      const id = `${now()}_${Math.random().toString(36).slice(2, 8)}`;
      const entry = { id, cmd, times, interval, status: 'pending', createdAt: now() };
      commands.push(entry);
      await db.collection(COL).doc(sessionId).update({
        data: {
          commands,
          updatedAt: now(),
          expiresAt: now() + ACTIVE_TTL_MS
        }
      });
      return ok({ commandId: id });
    }

    if (action === 'pullCommands') {
      const sessionId = String(event.sessionId || '');
      const session = await getSessionById(sessionId);
      if (!session) return fail('会话不存在');
      if (session.userOpenid !== openid) return fail('无权限');
      if (session.status === 'active') {
        await db.collection(COL).doc(sessionId).update({
          data: { updatedAt: now(), expiresAt: now() + ACTIVE_TTL_MS }
        }).catch(() => {});
      }
      const fresh = await getSessionById(sessionId);
      const allPending = ((fresh && fresh.commands) || session.commands || [])
        .filter((c) => c && c.status === 'pending')
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const commands = allPending.length ? [allPending[0]] : [];
      return ok({ commands, session: fresh || session });
    }

    if (action === 'ackCommand') {
      const sessionId = String(event.sessionId || '');
      const commandId = String(event.commandId || '');
      const session = await getSessionById(sessionId);
      if (!session) return fail('会话不存在');
      if (session.userOpenid !== openid) return fail('无权限');
      
      // 使用拉取到的待处理指令列表，防止更新整个超大数组导致并发覆盖或超时
      const pendingIds = Array.isArray(event.commandIds) ? event.commandIds : [commandId];
      if (!pendingIds.length || !pendingIds[0]) return ok({ sessionId });

      const currentTs = now();
      const commands = (session.commands || []).map((c) => {
        if (c && pendingIds.includes(c.id)) {
          return { ...c, status: event.ok === false ? 'failed' : 'done', ackAt: currentTs };
        }
        return c;
      });

      const ackedCmd = (session.commands || []).find((c) => c && pendingIds.includes(c.id));
      const lastCmdFeedback = ackedCmd ? {
        commandId: ackedCmd.id,
        cmd: ackedCmd.cmd || '',
        ok: event.ok !== false,
        at: currentTs
      } : null;

      const cleanedCommands = commands.filter(c => {
        if (c.status === 'pending') return true;
        if (!c.ackAt || (currentTs - c.ackAt < 60000)) return true;
        return false; 
      });

      const updateData = { commands: cleanedCommands, updatedAt: currentTs };
      if (lastCmdFeedback) updateData.lastCmdFeedback = lastCmdFeedback;

      await db.collection(COL).doc(sessionId).update({
        data: updateData
      });
      return ok({ sessionId });
    }

    return fail('未知操作');
  } catch (err) {
    console.error('[remoteAssist]', err);
    return fail(String(err.message || err));
  }
};
