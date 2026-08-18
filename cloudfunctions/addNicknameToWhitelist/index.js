// 管理员：生成访问口令 / 维护 valid_users 白名单
// 一用户一码：accessCode 未绑定前可作废，绑定后不可复用

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ACCESS_CODE_PREFIX = 'VK';
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ACCESS_CODE_TTL_MS = 24 * 60 * 60 * 1000;
const VK_CODE_RE = /^VK[A-Z0-9]{6}$/;

function toMs(raw) {
  if (!raw && raw !== 0) return 0;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return raw < 1e12 ? raw * 1000 : raw;
  }
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof raw === 'object') {
    if (raw.$date) return toMs(raw.$date);
    if (typeof raw.seconds === 'number') return toMs(raw.seconds * 1000);
    if (typeof raw.getTime === 'function') {
      try {
        const t = raw.getTime();
        return Number.isFinite(t) ? t : 0;
      } catch (e) {}
    }
  }
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function idTimeMs(id) {
  const s = String(id || '');
  if (s.length < 8 || !/^[0-9a-fA-F]{8}/.test(s)) return 0;
  const sec = parseInt(s.slice(0, 8), 16);
  if (!Number.isFinite(sec) || sec < 1500000000 || sec > 4000000000) return 0;
  return sec * 1000;
}

function isVkAccessCode(raw) {
  return VK_CODE_RE.test(extractPlainAccessCode(raw));
}

function getAccessCodeCreatedAtMs(doc) {
  if (!doc) return 0;
  // 只用生成时间，不能用 updateTime，否则一改记录 24 小时会重新起算
  return toMs(doc.createTime) || idTimeMs(doc._id);
}

function getAccessCodeExpiresAtMs(doc) {
  if (!doc) return 0;
  const explicit = toMs(doc.expiresAt);
  if (explicit > 0) return explicit;
  const created = getAccessCodeCreatedAtMs(doc);
  return created > 0 ? created + ACCESS_CODE_TTL_MS : 0;
}

function isUnusedVkCode(doc) {
  if (!doc) return false;
  if (!isEmptyOpenid(doc._openid)) return false;
  return isVkAccessCode(doc.accessCode || doc.nickname || '');
}

function isAccessCodeExpired(doc) {
  if (!isUnusedVkCode(doc)) return false;
  const expiresAtMs = getAccessCodeExpiresAtMs(doc);
  if (expiresAtMs > 0) return Date.now() > expiresAtMs;
  // 旧数据没有时间字段：未使用的 VK 口令一律收回
  return true;
}

async function removeExpiredDocs(rows) {
  const leftover = [];
  for (let i = 0; i < (rows || []).length; i++) {
    const doc = rows[i];
    if (!doc || !doc._id) continue;
    if (!isAccessCodeExpired(doc)) {
      leftover.push(doc);
      continue;
    }
    try {
      await db.collection('valid_users').doc(doc._id).remove();
    } catch (e) {
      console.warn('[addNicknameToWhitelist] purge expired failed', doc._id, e);
    }
  }
  return leftover;
}

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

function isEmptyOpenid(value) {
  return !value || String(value).trim() === '' || value === null || value === undefined;
}

async function fetchUnusedAccessCodeRows() {
  const _ = db.command;
  const buckets = [];
  try {
    buckets.push(await db.collection('valid_users').where({ _openid: '' }).limit(100).get());
  } catch (e) {}
  try {
    buckets.push(await db.collection('valid_users').where({ _openid: _.exists(false) }).limit(100).get());
  } catch (e) {}
  try {
    buckets.push(await db.collection('valid_users').where({ _openid: _.eq(null) }).limit(100).get());
  } catch (e) {}
  const map = {};
  buckets.forEach((res) => {
    (res && res.data ? res.data : []).forEach((row) => {
      if (row && row._id) map[row._id] = row;
    });
  });
  return Object.keys(map).map((id) => map[id]);
}

async function purgeAllExpiredUnused() {
  const unused = await fetchUnusedAccessCodeRows();
  await removeExpiredDocs(unused);
}

async function generateUniqueAccessCode() {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    let body = '';
    for (let i = 0; i < 6; i += 1) {
      body += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    const code = ACCESS_CODE_PREFIX + body;
    const exist = await db.collection('valid_users').where({ accessCode: code }).limit(1).get();
    if (!exist.data || exist.data.length === 0) {
      return code;
    }
    const hit = exist.data[0];
    if (hit && isAccessCodeExpired(hit)) {
      try {
        await db.collection('valid_users').doc(hit._id).remove();
        return code;
      } catch (e) {}
    }
  }
  throw new Error('GENERATE_FAILED');
}

function extractPlainAccessCode(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (s.indexOf('用户-') === 0) {
    s = s.slice(3);
  }
  const normalized = s.replace(/[\s-]/g, '').toUpperCase();
  if (/^VK[A-Z0-9]{6}$/.test(normalized)) return normalized;
  return s.trim();
}

function formatListItem(doc) {
  const bound = !isEmptyOpenid(doc._openid);
  const accessCode = extractPlainAccessCode(doc.accessCode || doc.nickname || '');
  const expired = !bound && isAccessCodeExpired(doc);
  let statusLabel = bound ? '已使用' : '未使用';
  if (expired) statusLabel = '已过期';
  return {
    _id: doc._id,
    accessCode,
    nickname: doc.nickname || '',
    bound,
    expired,
    statusLabel,
    expiresAtMs: getAccessCodeExpiresAtMs(doc),
    bypassLocationCheck: doc.bypassLocationCheck === true,
    bindTime: doc.bindTime || '',
    createTime: doc.createTime || '',
    updateTime: doc.updateTime || ''
  };
}

async function handleGenerate(bypassLocationCheck) {
  const accessCode = await generateUniqueAccessCode();
  const nickname = accessCode;
  const expiresAt = new Date(Date.now() + ACCESS_CODE_TTL_MS);
  const addRes = await db.collection('valid_users').add({
    data: {
      accessCode,
      nickname,
      _openid: '',
      desc: '管理员生成口令',
      bypassLocationCheck: bypassLocationCheck === true,
      expiresAt,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
  return {
    success: true,
    accessCode,
    nickname,
    recordId: addRes._id,
    expiresAt,
    message: `口令 ${accessCode} 已生成，24 小时内有效，请发给用户使用（一码一人）`
  };
}

async function handleList() {
  await purgeAllExpiredUnused();
  let rows = [];
  try {
    const res = await db.collection('valid_users')
      .orderBy('createTime', 'desc')
      .limit(200)
      .get();
    rows = res.data || [];
  } catch (e) {
    const fallback = await db.collection('valid_users').limit(200).get();
    rows = fallback.data || [];
  }
  rows = await removeExpiredDocs(rows);
  const list = rows
    .filter((item) => item && isVkAccessCode(item.accessCode || item.nickname || ''))
    .slice(0, 80)
    .map(formatListItem);
  return { success: true, list };
}

async function handleRevoke(recordId, accessCode) {
  let doc = null;
  if (recordId) {
    try {
      const one = await db.collection('valid_users').doc(recordId).get();
      doc = one.data || null;
    } catch (e) {}
  }
  if (!doc && accessCode) {
    const byCode = await db.collection('valid_users').where({ accessCode }).limit(1).get();
    doc = byCode.data && byCode.data[0] ? byCode.data[0] : null;
  }
  if (!doc || !doc._id) {
    return { success: false, errMsg: '口令不存在' };
  }
  if (isAccessCodeExpired(doc)) {
    try {
      await db.collection('valid_users').doc(doc._id).remove();
    } catch (e) {}
    return { success: true, message: `口令 ${doc.accessCode || ''} 已过期并自动收回` };
  }
  if (!isEmptyOpenid(doc._openid)) {
    return { success: false, errMsg: '该口令已被使用，无法作废' };
  }
  await db.collection('valid_users').doc(doc._id).remove();
  return { success: true, message: `口令 ${doc.accessCode || ''} 已作废` };
}

async function handleLegacyNickname(nickname, bypassLocationCheck) {
  const existingRes = await db.collection('valid_users')
    .where({ nickname })
    .get();

  if (existingRes.data && existingRes.data.length > 0) {
    const emptySlot = existingRes.data.find((item) => isEmptyOpenid(item._openid));
    if (emptySlot) {
      if (bypassLocationCheck) {
        await db.collection('valid_users').doc(emptySlot._id).update({
          data: {
            bypassLocationCheck: true,
            updateTime: db.serverDate()
          }
        });
        await updateUserListBypass(db, nickname, true);
        await updateLoginLogbuttonBypass(db, nickname, true);
      }
      return {
        success: false,
        errMsg: `昵称 "${nickname}" 已存在且有空位，无需重复录入${bypassLocationCheck ? '（已更新地域放行设置）' : ''}`
      };
    }
  }

  await db.collection('valid_users').add({
    data: {
      nickname,
      _openid: '',
      desc: '管理员直接录入（旧版昵称）',
      bypassLocationCheck: bypassLocationCheck === true,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });

  if (bypassLocationCheck) {
    await updateUserListBypass(db, nickname, true);
    await updateLoginLogbuttonBypass(db, nickname, true);
  }

  return {
    success: true,
    message: `昵称 "${nickname}" 已成功录入到白名单（旧版）${bypassLocationCheck ? '，已开启地域放行' : ''}`,
    isNew: true
  };
}

exports.main = async (event = {}) => {
  const isTimer = event.Type === 'Timer' || event.triggerType === 'timer';
  if (isTimer || event.action === 'purgeExpired') {
    try {
      if (!isTimer) await assertAdmin();
      await purgeAllExpiredUnused();
      return { success: true };
    } catch (err) {
      console.error('[addNicknameToWhitelist] purgeExpired failed:', err);
      return { success: false, errMsg: err.message || '清理失败' };
    }
  }

  try {
    await assertAdmin();
    const action = event.action || 'generate';

    if (action === 'generate') {
      return await handleGenerate(event.bypassLocationCheck === true);
    }

    if (action === 'list') {
      return await handleList();
    }

    if (action === 'revoke') {
      return await handleRevoke(event.recordId || '', String(event.accessCode || '').trim().toUpperCase());
    }

    if (action === 'add_nickname') {
      const nickname = (event.nickname ? String(event.nickname) : '').trim();
      if (!nickname) {
        return { success: false, errMsg: '昵称不能为空' };
      }
      return await handleLegacyNickname(nickname, event.bypassLocationCheck === true);
    }

    return { success: false, errMsg: 'INVALID_ACTION' };
  } catch (err) {
    console.error('[addNicknameToWhitelist] failed:', err);
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' };
    }
    return {
      success: false,
      errMsg: err.message || '操作失败，请稍后重试'
    };
  }
};

async function updateUserListBypass(db, nickname, bypassLocationCheck) {
  try {
    const userListRes = await db.collection('user_list').where({ nickName: nickname }).get();
    if (userListRes.data && userListRes.data.length > 0) {
      await Promise.all(userListRes.data.map((user) =>
        db.collection('user_list').doc(user._id).update({
          data: {
            bypassLocationCheck,
            updateTime: db.serverDate()
          }
        })
      ));
    }
  } catch (err) {
    console.error('[addNicknameToWhitelist] 更新 user_list 失败:', err);
  }
}

async function updateLoginLogbuttonBypass(db, nickname, bypassLocationCheck) {
  try {
    const buttonRes = await db.collection('login_logbutton').where({ nickname }).get();
    if (buttonRes.data && buttonRes.data.length > 0) {
      await Promise.all(buttonRes.data.map((button) =>
        db.collection('login_logbutton').doc(button._id).update({
          data: {
            bypassLocationCheck,
            updateTime: db.serverDate()
          }
        })
      ));
    }
  } catch (err) {
    console.error('[addNicknameToWhitelist] 更新 login_logbutton 失败:', err);
  }
}
