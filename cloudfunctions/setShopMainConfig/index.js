const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const DOC_ID = 'shopMain';

async function assertAdmin(openid) {
  if (!openid) throw new Error('UNAUTHORIZED');
  let r = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (r.data && r.data.length) return;
  r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  if (r.data && r.data.length) return;
  throw new Error('FORBIDDEN');
}

function inferTopMediaType(url) {
  const u = String(url || '').toLowerCase();
  if (
    u.endsWith('.mp4') ||
    u.endsWith('.mov') ||
    u.endsWith('.m4v') ||
    u.indexOf('.mp4?') !== -1 ||
    u.indexOf('.mov?') !== -1 ||
    u.indexOf('.m4v?') !== -1
  ) {
    return 'video';
  }
  return 'image';
}

function normalizeTopMediaList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const url = String(item.url || '').trim();
    if (!url) return null;
    const type = item.type || inferTopMediaType(url);
    const next = { type, url };
    if (type === 'video' && item.autoplay === true) next.autoplay = true;
    if (typeof item.poster === 'string') {
      const p = item.poster.trim();
      if (p && p.indexOf('wxfile://') !== 0 && p.indexOf('http://tmp/') !== 0) {
        next.poster = p;
      }
    }
    return next;
  }).filter(Boolean);
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  try {
    await assertAdmin(OPENID);
    const payload = { updateTime: db.serverDate() };

    if (Array.isArray(event.topMediaList)) {
      payload.topMediaList = normalizeTopMediaList(event.topMediaList);
    }
    if (typeof event.autoCarouselEnabled === 'boolean') {
      payload.autoCarouselEnabled = event.autoCarouselEnabled;
    }
    if (event.title != null && String(event.title).trim()) {
      payload.title = String(event.title).trim();
    }

    if (Object.keys(payload).length <= 1) {
      return { success: false, error: '无有效保存字段' };
    }

    let existing = null;
    try {
      const snap = await db.collection('shop_config').doc(DOC_ID).get();
      existing = snap.data || null;
    } catch (e) {
      existing = null;
    }

    if (existing) {
      await db.collection('shop_config').doc(DOC_ID).update({ data: payload });
    } else {
      await db.collection('shop_config').doc(DOC_ID).set({
        data: {
          title: payload.title || '选购',
          topMediaList: payload.topMediaList || [],
          autoCarouselEnabled: payload.autoCarouselEnabled === true,
          updateTime: payload.updateTime
        }
      });
    }

    return {
      success: true,
      topMediaList: payload.topMediaList,
      autoCarouselEnabled: payload.autoCarouselEnabled,
      title: payload.title
    };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('FORBIDDEN') || msg.includes('UNAUTHORIZED')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: msg || '保存失败' };
  }
};
