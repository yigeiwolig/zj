const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const DOC_ID = 'productFeatureFlags';

function isFlagEnabled(val) {
  if (val === undefined || val === null) return true;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  if (val === true || val === 1 || val === '1' || val === 'true') return true;
  return !!val;
}

function normalizeFlags(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  Object.keys(src).forEach((k) => {
    const key = String(k).trim();
    if (!key) return;
    out[key] = isFlagEnabled(src[k]);
  });
  return out;
}

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
    const flags = normalizeFlags(event && event.flags);
    if (!Object.keys(flags).length) {
      return { success: false, error: 'flags 不能为空' };
    }
    const payload = {
      flags,
      updateTime: db.serverDate(),
      _openid: OPENID
    };
    try {
      await db.collection('shop_config').doc(DOC_ID).set({ data: payload });
    } catch (setErr) {
      await db.collection('shop_config').doc(DOC_ID).update({ data: payload });
    }
    return { success: true, flags };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('FORBIDDEN') || msg.includes('UNAUTHORIZED')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: msg };
  }
};
