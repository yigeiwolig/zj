const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function assertAdmin(openid) {
  if (!openid) throw new Error('UNAUTHORIZED');
  let r = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (r.data && r.data.length) return;
  r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  if (r.data && r.data.length) return;
  throw new Error('FORBIDDEN');
}

function sanitizeDetailImages(detailImages) {
  return (detailImages || [])
    .map((d) => {
      if (typeof d === 'string') {
        const url = d.trim();
        if (!url || url.indexOf('wxfile://') === 0 || url.indexOf('http://tmp') === 0) return null;
        return { type: 'image', url };
      }
      if (!d || typeof d !== 'object') return d;
      const item = { ...d };
      delete item.urlDisplay;
      delete item.previewUrl;
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      if (
        !url ||
        url.indexOf('wxfile://') === 0 ||
        url.indexOf('http://tmp') === 0 ||
        url.indexOf('https://tmp') === 0
      ) {
        return null;
      }
      item.url = url;
      const poster = typeof item.poster === 'string' ? item.poster.trim() : '';
      if (
        !poster ||
        poster.indexOf('wxfile://') === 0 ||
        poster.indexOf('http://tmp') === 0 ||
        poster.indexOf('https://tmp') === 0
      ) {
        delete item.poster;
      }
      return item;
    })
    .filter(Boolean);
}

function urlsSignature(detailImages) {
  const items = sanitizeDetailImages(detailImages);
  return items.map((item) => String(item.url || '').trim().toLowerCase()).sort().join('|');
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  try {
    await assertAdmin(OPENID);
    const seriesId = String(event.seriesId || event.docId || '').trim();
    if (!seriesId) {
      return { success: false, error: '缺少 seriesId' };
    }
    if (!Array.isArray(event.detailImages)) {
      return { success: false, error: 'detailImages 必须是数组' };
    }

    const detailImages = sanitizeDetailImages(event.detailImages);
    const wantSig = urlsSignature(detailImages);
    const coll = db.collection('shop_series');

    const readSaved = async () => {
      const snap = await coll.doc(seriesId).field({
        detailImages: true,
        updateTime: true
      }).get();
      return {
        detailImages: (snap.data && snap.data.detailImages) || [],
        updateTime: snap.data && snap.data.updateTime
      };
    };

    const writeOnce = async () => {
      await coll.doc(seriesId).update({
        data: {
          detailImages,
          updateTime: db.serverDate()
        }
      });
    };

    await writeOnce();
    let saved = await readSaved();
    if (urlsSignature(saved.detailImages) !== wantSig) {
      await writeOnce();
      saved = await readSaved();
    }
    if (urlsSignature(saved.detailImages) !== wantSig) {
      return {
        success: false,
        error: '详情图未写入数据库，请重试',
        expected: wantSig,
        saved: urlsSignature(saved.detailImages)
      };
    }

    return {
      success: true,
      detailImages: saved.detailImages,
      updateTime: saved.updateTime
    };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('FORBIDDEN') || msg.includes('UNAUTHORIZED')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: msg || '保存详情图失败' };
  }
};
