const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/** 单文档 viewers 过大时云库 update 会返回 updated:0 或直接失败 */
const MAX_VIEWERS = 400;

function trimViewers(list) {
  const arr = Array.isArray(list) ? list : [];
  if (arr.length <= MAX_VIEWERS) return arr;
  return arr.slice(arr.length - MAX_VIEWERS);
}

function isDocTooLargeError(err) {
  const msg = String((err && err.message) || err || '');
  return /超过|过大|too large|size|16MB|文档/i.test(msg);
}

function buildViewer(openid, viewerData, viewTime) {
  const vd = viewerData || {};
  const row = {
    openid: openid || '',
    nickname: vd.nickname || '',
    viewTime: viewTime,
    durationMinutes: vd.durationMs ? Math.round((vd.durationMs / 60000) * 100) / 100 : 0,
    province: vd.province || '',
    city: vd.city || '',
    district: vd.district || '',
    address: vd.address || '',
    latitude: vd.latitude != null ? vd.latitude : null,
    longitude: vd.longitude != null ? vd.longitude : null
  };

  const sectionClicks = vd.sectionClicks || {};
  Object.keys(sectionClicks).forEach((key) => {
    row[`sectionClicks_${String(key).replace(/-/g, '_')}`] = sectionClicks[key];
  });

  const sectionDurations = vd.sectionDurations || {};
  Object.keys(sectionDurations).forEach((key) => {
    row[`sectionDurations_${String(key).replace(/-/g, '_')}`] =
      Math.round((Number(sectionDurations[key]) / 60000) * 100) / 100;
  });

  return row;
}

function mergeViewer(existing, next) {
  const keepTime = existing && existing.viewTime ? existing.viewTime : next.viewTime;
  return Object.assign({}, existing || {}, next, { viewTime: keepTime });
}

async function writeViewers(shareCodeId, list) {
  let next = trimViewers(list);
  let lastErr = null;
  for (let i = 0; i < 4; i++) {
    try {
      const updateRes = await db.collection('chakan').doc(shareCodeId).update({
        data: { viewers: next }
      });
      return { updateRes, written: next };
    } catch (err) {
      lastErr = err;
      if (!isDocTooLargeError(err) || next.length <= 40) break;
      next = next.slice(Math.ceil(next.length / 2));
    }
  }
  throw lastErr || new Error('写入 viewers 失败');
}

function lastMatchingIndex(viewers, openid) {
  if (!openid) return -1;
  for (let i = viewers.length - 1; i >= 0; i--) {
    if (viewers[i] && viewers[i].openid === openid) return i;
  }
  return -1;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || '';

  const { shareCodeId, viewerData, isUpdate } = event || {};

  if (!shareCodeId) {
    return { success: false, error: '缺少 shareCodeId 参数' };
  }

  try {
    const docRes = await db.collection('chakan').doc(shareCodeId).get();
    if (!docRes.data) {
      return { success: false, error: '分享码记录不存在' };
    }

    const existingData = docRes.data;
    const viewers = Array.isArray(existingData.viewers) ? existingData.viewers.slice() : [];
    const newViewer = buildViewer(openid, viewerData, db.serverDate());

    let lastIndex = -1;
    if (isUpdate === true) lastIndex = lastMatchingIndex(viewers, openid);

    if (lastIndex >= 0) {
      viewers[lastIndex] = mergeViewer(viewers[lastIndex], newViewer);
    } else {
      viewers.push(newViewer);
    }

    const { updateRes, written } = await writeViewers(shareCodeId, viewers);
    const updated = !!(updateRes && updateRes.stats && updateRes.stats.updated > 0);

    // 整数组覆盖时偶发 updated:0，以文档仍可写视为成功
    if (!updated) {
      const verifyRes = await db.collection('chakan').doc(shareCodeId).get();
      const verifyList = (verifyRes.data && verifyRes.data.viewers) || [];
      const idx = lastMatchingIndex(verifyList, openid);
      const ok =
        idx >= 0 &&
        Number(verifyList[idx].durationMinutes) === Number(newViewer.durationMinutes);
      if (!ok) {
        return {
          success: false,
          error: '数据库更新失败',
          updateStats: updateRes && updateRes.stats
        };
      }
    }

    return {
      success: true,
      viewersCount: written.length
    };
  } catch (err) {
    console.error('[recordShareCodeViewer]', err);
    return { success: false, error: err.message || '记录失败' };
  }
};
