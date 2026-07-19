const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const COLLECTION = 'kf_feedback';
const MAX_LEN = 500;
const RATE_MS = 60 * 1000;
const ACCESS_CODE_RE = /^VK[A-Z0-9]{6}$/;

async function assertAdmin() {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (byOpenid.data.length > 0) return openid;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return openid;
  throw new Error('FORBIDDEN');
}

function trimContent(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

function normalizeIdentityType(raw) {
  const type = trimContent(raw);
  if (type === 'access_code' || type === 'nickname') return type;
  return 'unknown';
}

function looksLikeAccessCode(raw) {
  const text = trimContent(raw).replace(/^用户-/, '').replace(/[\s-]/g, '').toUpperCase();
  return ACCESS_CODE_RE.test(text);
}

function resolveIdentityType(identityType, legacyNickName) {
  const normalized = normalizeIdentityType(identityType);
  if (normalized !== 'unknown') return normalized;
  const nick = trimContent(legacyNickName);
  if (looksLikeAccessCode(nick)) return 'access_code';
  if (nick && nick !== '微信用户') return 'nickname';
  return 'unknown';
}

function userTypeLabel(record) {
  const type = resolveIdentityType(record.identityType, record.nickName);
  if (type === 'access_code') return '防伪码用户';
  if (type === 'nickname') return '昵称用户';
  return '未知用户';
}

function sanitizeAdminItem(row) {
  return {
    _id: row._id,
    content: row.content,
    createTime: row.createTime,
    userTypeLabel: userTypeLabel(row)
  };
}

function isCollectionMissingErr(err) {
  const msg = String((err && err.message) || (err && err.errMsg) || err || '');
  return msg.indexOf('not exist') >= 0
    || msg.indexOf('NOT_EXIST') >= 0
    || msg.indexOf('Db or Table not exist') >= 0;
}

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (err) {
    if (isCollectionMissingErr(err)) throw err;
    const msg = String((err && err.message) || (err && err.errMsg) || err || '');
    if (msg.indexOf('already exist') >= 0
      || msg.indexOf('ResourceExist') >= 0
      || msg.indexOf('Table exist') >= 0
      || msg.indexOf('已存在') >= 0) {
      return;
    }
    throw err;
  }
}

async function hasRecentDuplicate(openid, content) {
  const since = new Date(Date.now() - RATE_MS);
  try {
    const recent = await db.collection(COLLECTION)
      .where({
        _openid: openid,
        content,
        createTime: _.gte(since)
      })
      .limit(1)
      .get();
    return !!(recent.data && recent.data.length > 0);
  } catch (err) {
    if (!isCollectionMissingErr(err)) throw err;
    await ensureCollection();
    return false;
  }
}

exports.main = async (event) => {
  const action = event && event.action;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  try {
    if (action === 'submit') {
      const content = trimContent(event.content);
      if (!content) {
        return { success: false, error: 'EMPTY' };
      }
      if (content.length > MAX_LEN) {
        return { success: false, error: 'TOO_LONG' };
      }

      if (await hasRecentDuplicate(openid, content)) {
        return { success: false, error: 'DUPLICATE' };
      }

      await ensureCollection();
      const identityType = resolveIdentityType(event.identityType, event.nickName);
      const now = db.serverDate();
      const addRes = await db.collection(COLLECTION).add({
        data: {
          _openid: openid,
          content,
          identityType,
          status: 'pending',
          createTime: now
        }
      });

      return { success: true, id: addRes._id };
    }

    if (action === 'listAdmin') {
      await assertAdmin();
      await ensureCollection();
      const res = await db.collection(COLLECTION)
        .where({ status: 'pending' })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get();
      const list = (res.data || []).map(sanitizeAdminItem);
      return { success: true, list };
    }

    if (action === 'markRead') {
      await assertAdmin();
      const id = event.id ? String(event.id) : '';
      if (!id) {
        return { success: false, error: 'NO_ID' };
      }
      await db.collection(COLLECTION).doc(id).update({
        data: {
          status: 'read',
          readTime: db.serverDate()
        }
      });
      return { success: true };
    }

    if (action === 'delete') {
      await assertAdmin();
      const id = event.id ? String(event.id) : '';
      if (!id) {
        return { success: false, error: 'NO_ID' };
      }
      await db.collection(COLLECTION).doc(id).remove();
      return { success: true };
    }

    return { success: false, error: 'UNKNOWN_ACTION' };
  } catch (err) {
    const msg = err && err.message ? String(err.message) : 'FAIL';
    if (msg === 'FORBIDDEN' || msg === 'UNAUTHORIZED') {
      return { success: false, error: 'NO_ADMIN_PERMISSION' };
    }
    if (isCollectionMissingErr(err)) {
      return { success: false, error: 'NO_COLLECTION' };
    }
    console.error('[kfFeedback]', err);
    return { success: false, error: 'SERVER_ERROR' };
  }
};
