const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const DOC_ID = 'hubHomeConfig';

async function assertAdmin(openid) {
  if (!openid) throw new Error('UNAUTHORIZED');
  let r = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (r.data && r.data.length) return;
  r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  if (r.data && r.data.length) return;
  throw new Error('FORBIDDEN');
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  try {
    await assertAdmin(OPENID);
    const hubNewCover = String((event && event.hubNewCover) || '').trim();
    const payload = {
      hubNewCover,
      updateTime: db.serverDate(),
      _openid: OPENID
    };
    try {
      await db.collection('shop_config').doc(DOC_ID).set({ data: payload });
    } catch (setErr) {
      await db.collection('shop_config').doc(DOC_ID).update({ data: payload });
    }
    return { success: true, hubNewCover };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('FORBIDDEN') || msg.includes('UNAUTHORIZED')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: msg };
  }
};
