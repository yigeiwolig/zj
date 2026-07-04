// 管理员：生成访问口令 / 维护 valid_users 白名单
// 一用户一码：accessCode 未绑定前可作废，绑定后不可复用

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ACCESS_CODE_PREFIX = 'VK';
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

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
  return !value || value === '' || value === null || value === undefined;
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
  return {
    _id: doc._id,
    accessCode,
    nickname: doc.nickname || '',
    bound,
    statusLabel: bound ? '已使用' : '未使用',
    bypassLocationCheck: doc.bypassLocationCheck === true,
    bindTime: doc.bindTime || '',
    createTime: doc.createTime || '',
    updateTime: doc.updateTime || ''
  };
}

async function handleGenerate(bypassLocationCheck) {
  const accessCode = await generateUniqueAccessCode();
  const nickname = accessCode;
  const addRes = await db.collection('valid_users').add({
    data: {
      accessCode,
      nickname,
      _openid: '',
      desc: '管理员生成口令',
      bypassLocationCheck: bypassLocationCheck === true,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
  return {
    success: true,
    accessCode,
    nickname,
    recordId: addRes._id,
    message: `口令 ${accessCode} 已生成，请发给用户使用（一码一人）`
  };
}

async function handleList() {
  const res = await db.collection('valid_users')
    .orderBy('createTime', 'desc')
    .limit(120)
    .get();
  const list = (res.data || [])
    .filter((item) => item && extractPlainAccessCode(item.accessCode || item.nickname || ''))
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
  const action = event.action || 'generate';

  try {
    await assertAdmin();

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
