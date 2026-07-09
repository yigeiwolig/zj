const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const COLLECTION = 'kf_feedback';
const MAX_LEN = 500;
const RATE_MS = 60 * 1000;

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

      const since = new Date(Date.now() - RATE_MS);
      const recent = await db.collection(COLLECTION)
        .where({
          _openid: openid,
          createTime: _.gte(since)
        })
        .limit(1)
        .get();
      if (recent.data && recent.data.length > 0) {
        return { success: false, error: 'RATE_LIMIT' };
      }

      const nickName = trimContent(event.nickName) || '微信用户';
      const now = db.serverDate();
      const addRes = await db.collection(COLLECTION).add({
        data: {
          _openid: openid,
          content,
          nickName,
          status: 'pending',
          createTime: now
        }
      });

      return { success: true, id: addRes._id };
    }

    if (action === 'listAdmin') {
      await assertAdmin();
      const res = await db.collection(COLLECTION)
        .where({ status: 'pending' })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get();
      return { success: true, list: res.data || [] };
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

    return { success: false, error: 'UNKNOWN_ACTION' };
  } catch (err) {
    const msg = err && err.message ? String(err.message) : 'FAIL';
    if (msg === 'FORBIDDEN' || msg === 'UNAUTHORIZED') {
      return { success: false, error: 'NO_ADMIN_PERMISSION' };
    }
    console.error('[kfFeedback]', err);
    return { success: false, error: 'SERVER_ERROR' };
  }
};
