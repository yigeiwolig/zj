const SERVER_DATE = '__SERVER_DATE__';

function serializeData(data) {
  const out = { ...(data || {}) };
  Object.keys(out).forEach((key) => {
    const val = out[key];
    if (val && typeof val === 'object' && typeof val.getTime !== 'function') {
      if (/Time$/.test(key)) out[key] = SERVER_DATE;
    }
  });
  return out;
}

function isPermissionDenied(err) {
  const msg = String((err && err.errMsg) || (err && err.message) || err || '');
  return msg.indexOf('permission denied') >= 0
    || msg.indexOf('Permission denied') >= 0
    || msg.indexOf('-502003') >= 0
    || (err && err.errCode === -502003);
}

function updateRepair(repairId, data) {
  return wx.cloud.callFunction({
    name: 'userUpdateRepair',
    data: { repairId, data: serializeData(data) }
  }).then((res) => {
    const result = res.result || {};
    if (!result.success) {
      return Promise.reject(new Error(result.errMsg || '更新失败'));
    }
    return result;
  });
}

/**
 * 先客户端更新；若数据库权限拒绝则走云函数（校验本人 _openid）
 */
function patchRepair(repairId, data) {
  const db = wx.cloud.database();
  return db.collection('shouhou_repair').doc(repairId).update({ data })
    .catch((err) => {
      if (!isPermissionDenied(err)) return Promise.reject(err);
      return updateRepair(repairId, data);
    });
}

module.exports = {
  SERVER_DATE,
  updateRepair,
  patchRepair,
  isPermissionDenied
};
