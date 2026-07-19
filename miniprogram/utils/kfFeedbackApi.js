const userIdentity = require('./userIdentity.js');
const { isAccessCodeFormat } = require('./accessCode.js');

const COLLECTION = 'kf_feedback';
const MAX_LEN = 500;
const RATE_MS = 60 * 1000;

function trimContent(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

function errMsg(err) {
  return String((err && err.errMsg) || (err && err.message) || err || '');
}

function isCloudFnMissing(msg) {
  const text = String(msg || '');
  return text.indexOf('FUNCTION_NOT_FOUND') >= 0
    || text.indexOf('-501000') >= 0
    || text.indexOf('fn not found') >= 0
    || text.indexOf('FunctionName parameter could not be found') >= 0;
}

function isPermissionDenied(err) {
  const msg = errMsg(err);
  return (err && err.errCode === -502003)
    || msg.indexOf('permission denied') >= 0
    || msg.indexOf('Permission denied') >= 0
    || msg.indexOf('-502003') >= 0;
}

function isCollectionMissing(err) {
  const msg = errMsg(err);
  return msg.indexOf('collection not exists') >= 0
    || msg.indexOf('-502005') >= 0
    || msg.indexOf('Db or Table not exist') >= 0;
}

function resolveSubmitIdentity() {
  const type = userIdentity.getLoginIdentityType();
  if (type === userIdentity.IDENTITY_TYPE.ACCESS_CODE) return 'access_code';
  if (type === userIdentity.IDENTITY_TYPE.NICKNAME) return 'nickname';
  return 'unknown';
}

function inferUserTypeLabel(item) {
  if (!item) return '未知用户';
  if (item.userTypeLabel) return item.userTypeLabel;
  if (item.identityType === 'access_code') return '防伪码用户';
  if (item.identityType === 'nickname') return '昵称用户';
  const nick = trimContent(item.nickName);
  if (nick && isAccessCodeFormat(nick)) return '防伪码用户';
  if (nick && nick !== '微信用户') return '昵称用户';
  return '未知用户';
}

function mapAdminMessage(item) {
  return {
    _id: item._id,
    content: item.content,
    createTime: item.createTime,
    userTypeLabel: inferUserTypeLabel(item),
    timeText: formatTime(item.createTime)
  };
}

async function callKfFeedback(data) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'kfFeedback',
      data
    });
    return (res && res.result) || { success: false, error: 'EMPTY' };
  } catch (err) {
    const msg = errMsg(err);
    console.warn('[kfFeedbackApi] callFunction fail', msg);
    if (isCloudFnMissing(msg)) {
      return { success: false, error: 'FN_NOT_FOUND', detail: msg };
    }
    return { success: false, error: 'NETWORK', detail: msg };
  }
}

async function submitDirect(content, identityType) {
  if (!wx.cloud) {
    return { success: false, error: 'NO_CLOUD' };
  }
  const db = wx.cloud.database();
  const _ = db.command;
  const trimmed = trimContent(content);
  if (!trimmed) {
    return { success: false, error: 'EMPTY' };
  }
  if (trimmed.length > MAX_LEN) {
    return { success: false, error: 'TOO_LONG' };
  }

  try {
    const since = new Date(Date.now() - RATE_MS);
    const recent = await db.collection(COLLECTION)
      .where({
        content: trimmed,
        createTime: _.gte(since)
      })
      .limit(1)
      .get();
    if (recent.data && recent.data.length > 0) {
      return { success: false, error: 'DUPLICATE' };
    }
  } catch (e) {
    console.warn('[kfFeedbackApi] duplicate check skip', errMsg(e));
  }

  const addRes = await db.collection(COLLECTION).add({
    data: {
      content: trimmed,
      identityType: identityType || 'unknown',
      status: 'pending',
      createTime: db.serverDate()
    }
  });
  return { success: true, id: addRes._id };
}

async function submit(content) {
  const identityType = resolveSubmitIdentity();
  const cfRes = await callKfFeedback({
    action: 'submit',
    content,
    identityType
  });
  if (cfRes.success) return cfRes;

  const keepCf = ['DUPLICATE', 'RATE_LIMIT', 'TOO_LONG', 'EMPTY', 'UNAUTHORIZED', 'NO_COLLECTION', 'SERVER_ERROR'];
  if (keepCf.indexOf(cfRes.error) >= 0) return cfRes;

  // 仅云函数未部署时尝试客户端直连（需已手动建好集合并开放写权限）
  if (cfRes.error !== 'FN_NOT_FOUND') return cfRes;

  try {
    return await submitDirect(content, identityType);
  } catch (err) {
    console.warn('[kfFeedbackApi] submitDirect fail', errMsg(err));
    if (isPermissionDenied(err)) {
      return { success: false, error: 'NO_PERMISSION' };
    }
    if (isCollectionMissing(err)) {
      return { success: false, error: 'NO_COLLECTION' };
    }
    return { success: false, error: 'NETWORK', detail: errMsg(err) };
  }
}

function listAdmin() {
  return callKfFeedback({ action: 'listAdmin' });
}

function markRead(id) {
  return callKfFeedback({ action: 'markRead', id });
}

function remove(id) {
  return callKfFeedback({ action: 'delete', id });
}

function tipForError(error) {
  const map = {
    DUPLICATE: '相同内容刚提交过，请修改后再试',
    RATE_LIMIT: '发送太频繁，请稍后再试',
    TOO_LONG: '内容过长，请精简后重试',
    EMPTY: '写点什么再提交',
    NO_PERMISSION: '反馈功能暂未开通，请联系管理员',
    NO_COLLECTION: '反馈服务初始化中，请部署 kfFeedback 云函数后重试',
    NO_CLOUD: '当前环境不支持云能力',
    FN_NOT_FOUND: '反馈服务未就绪，请稍后再试',
    NO_ADMIN_PERMISSION: '无管理员权限',
    NO_ID: '留言不存在',
    SERVER_ERROR: '操作失败，请稍后重试',
    NETWORK: '网络异常，请重试'
  };
  return map[error] || '操作失败，请稍后重试';
}

function formatTime(ts) {
  if (!ts) return '';
  if (typeof ts === 'object') {
    if (ts.$date) return formatTime(ts.$date);
    if (typeof ts.toDate === 'function') return formatTime(ts.toDate());
  }
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = {
  submit,
  listAdmin,
  markRead,
  remove,
  mapAdminMessage,
  tipForError,
  formatTime
};
