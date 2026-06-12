const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

async function upsertArchive(payload = {}) {
  const rowKey = payload.rowKey || '';
  const openid = payload._openid || '';
  let existed = null;
  try {
    if (rowKey) {
      const byRowKey = await db.collection('suspicious_review_archive').where({ rowKey }).limit(1).get();
      if (byRowKey.data && byRowKey.data.length > 0) existed = byRowKey.data[0];
    }
    if (!existed && openid) {
      try {
        const byOpenid = await db.collection('suspicious_review_archive')
          .where({
            _openid: openid,
            sourceType: payload.sourceType || 'suspicious_manual'
          })
          .limit(50)
          .get();
        const rows = byOpenid.data || [];
        if (rows.length) {
          existed = rows.sort(
            (a, b) => toArchiveMillis(b) - toArchiveMillis(a)
          )[0];
        }
      } catch (innerErr) {
        const innerMsg = String((innerErr && innerErr.message) || innerErr || '');
        if (!innerMsg.includes('collection not exists') && !innerMsg.includes('Db or Table not exist')) {
          throw innerErr;
        }
      }
    }
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (!msg.includes('collection not exists') && !msg.includes('Db or Table not exist')) throw err;
  }

  try {
    if (existed && existed._id) {
      await db.collection('suspicious_review_archive').doc(existed._id).update({ data: payload });
      return { ok: true, id: existed._id };
    }
    const addRes = await db.collection('suspicious_review_archive').add({
      data: {
        ...payload,
        createTime: db.serverDate()
      }
    });
    return { ok: true, id: addRes._id };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('collection not exists') || msg.includes('Db or Table not exist')) {
      return { ok: false, error: 'ARCHIVE_COLLECTION_MISSING' };
    }
    throw err;
  }
}

function toArchiveMillis(input) {
  if (!input) return 0;
  if (input instanceof Date) return input.getTime();
  if (typeof input === 'object' && typeof input.toDate === 'function') {
    const d = input.toDate();
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  }
  if (typeof input === 'object' && input.$date) {
    const d = new Date(input.$date);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

async function markSessionReviewed({ rowKey, viewerOpenid, action, extra = {} }) {
  const patch = {
    reviewStatus: 'archived',
    reviewDecision: action,
    archivedAt: db.serverDate(),
    updateTime: db.serverDate(),
    ...extra
  };
  const tryUpdateDoc = async (docId) => {
    if (!docId) return false;
    try {
      await db.collection('suspicious_user_sessions').doc(docId).update({ data: patch });
      return true;
    } catch (err) {
      const msg = String((err && err.message) || err || '');
      if (msg.includes('document non-exist') || msg.includes('does not exist')) return false;
      if (msg.includes('collection not exists') || msg.includes('Db or Table not exist')) {
        return false;
      }
      throw err;
    }
  };

  try {
    if (rowKey && await tryUpdateDoc(rowKey)) {
      return { ok: true, id: rowKey };
    }
    if (viewerOpenid) {
      const sessionRes = await db.collection('suspicious_user_sessions')
        .where({ _openid: viewerOpenid })
        .limit(1)
        .get();
      const docId = sessionRes.data && sessionRes.data[0] && sessionRes.data[0]._id;
      if (docId && await tryUpdateDoc(docId)) {
        return { ok: true, id: docId };
      }
    }
    return { ok: false, error: 'SESSION_NOT_FOUND' };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('collection not exists') || msg.includes('Db or Table not exist')) {
      return { ok: false, error: 'SESSION_COLLECTION_MISSING' };
    }
    throw err;
  }
}

exports.main = async (event = {}) => {
  const action = event.action; // ban | ignore
  const sourceType = event.sourceType || 'session';
  const viewerOpenid = event.viewerOpenid || '';
  const viewerNickname = event.viewerNickname || '';
  const rowKey = event.rowKey || '';
  const riskId = event.riskId || '';
  const loc = event.locationInfo || {};
  const snapshot = event.snapshot || {};

  if (!action || !['ban', 'ignore'].includes(action)) {
    return { success: false, error: 'INVALID_ACTION' };
  }

  try {
    await assertAdmin();
    let resolvedOpenid = String(viewerOpenid || '').trim();
    if (!resolvedOpenid && rowKey) {
      try {
        const sessionDoc = await db.collection('suspicious_user_sessions').doc(rowKey).get();
        if (sessionDoc.data && sessionDoc.data._openid) {
          resolvedOpenid = String(sessionDoc.data._openid).trim();
        }
      } catch (e) {}
    }
    if (action === 'ban' && !resolvedOpenid) {
      return { success: false, error: 'OPENID_REQUIRED' };
    }
    if (action === 'ignore' && !resolvedOpenid && !rowKey) {
      return { success: false, error: 'TARGET_REQUIRED' };
    }
    let resolvedNickname = String(viewerNickname || '').trim();
    if (!resolvedNickname && resolvedOpenid) {
      try {
        const validRes = await db.collection('valid_users').where({ _openid: resolvedOpenid }).limit(1).get();
        if (validRes.data && validRes.data[0] && validRes.data[0].nickname) {
          resolvedNickname = String(validRes.data[0].nickname).trim();
        }
      } catch (e) {}
    }
    if (!resolvedNickname && resolvedOpenid) {
      try {
        const logRes = await db.collection('login_logs')
          .where({ _openid: resolvedOpenid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();
        if (logRes.data && logRes.data[0] && logRes.data[0].nickname) {
          resolvedNickname = String(logRes.data[0].nickname).trim();
        }
      } catch (e) {}
    }

    if (action === 'ban') {
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: resolvedOpenid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      const updateData = {
        isBanned: true,
        banReason: 'suspicious_manual',
        banPage: 'index',
        province: loc.province || '',
        city: loc.city || '',
        district: loc.district || '',
        address: loc.address || '',
        latitude: loc.latitude != null ? loc.latitude : null,
        longitude: loc.longitude != null ? loc.longitude : null,
        updateTime: db.serverDate()
      };
      if (resolvedNickname) {
        updateData.nickname = resolvedNickname;
      }
      if (buttonRes.data && buttonRes.data.length > 0) {
        await db.collection('login_logbutton').doc(buttonRes.data[0]._id).update({ data: updateData });
      } else {
        await db.collection('login_logbutton').add({
          data: {
            _openid: resolvedOpenid,
            ...updateData,
            bypassLocationCheck: false,
            qiangli: false,
            createTime: db.serverDate()
          }
        });
      }
    }

    const sessionExtra = {
      viewerNickname: resolvedNickname || viewerNickname || '',
      snapshotEnterCount: Number(snapshot.enterCount || 0),
      snapshotSectionClicksTotal: Number(snapshot.sectionClicksTotal || 0),
      snapshotTotalStayMinutes: Number(snapshot.totalStayMinutes || snapshot.totalStayMinutesText || 0),
      triggerReasonText: snapshot.triggerReasonText || '',
      lastViewTime: snapshot.lastViewTime || '',
      province: loc.province || '',
      city: loc.city || '',
      district: loc.district || '',
      address: loc.address || '',
      latitude: loc.latitude != null ? loc.latitude : null,
      longitude: loc.longitude != null ? loc.longitude : null
    };
    const sessionResult = await markSessionReviewed({
      rowKey,
      viewerOpenid: resolvedOpenid,
      action,
      extra: sessionExtra
    });

    const archiveResult = await upsertArchive({
      rowKey,
      riskId,
      _openid: resolvedOpenid,
      viewerNickname: resolvedNickname || viewerNickname,
      sourceType: 'suspicious_manual',
      fromSourceType: sourceType,
      decision: action,
      status: 'archived',
      enterCount: Number(snapshot.enterCount || 0),
      sectionClicksTotal: Number(snapshot.sectionClicksTotal || 0),
      totalStayMinutes: Number(snapshot.totalStayMinutes || snapshot.totalStayMinutesText || 0),
      triggerReasonText: snapshot.triggerReasonText || '',
      lastViewTime: snapshot.lastViewTime || '',
      province: loc.province || '',
      city: loc.city || '',
      district: loc.district || '',
      address: loc.address || '',
      latitude: loc.latitude != null ? loc.latitude : null,
      longitude: loc.longitude != null ? loc.longitude : null,
      archivedAt: db.serverDate(),
      updateTime: db.serverDate()
    });

    const archiveOk = !!(sessionResult && sessionResult.ok) || !!(archiveResult && archiveResult.ok);
    return {
      success: true,
      archiveOk,
      archiveId: (archiveResult && archiveResult.id) || (sessionResult && sessionResult.id) || '',
      archiveError: archiveOk
        ? ''
        : ((archiveResult && archiveResult.error) || (sessionResult && sessionResult.error) || 'ARCHIVE_FAILED')
    };
  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: err.message || String(err) };
  }
};

