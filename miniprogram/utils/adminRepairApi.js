/** 云函数内转为 db.serverDate() */
const SERVER_DATE = '__SERVER_DATE__';

/**
 * 管理员维修单：走 adminUpdateRepair 云函数（绕过 shouhou_repair 客户端写权限）
 */
function call(data) {
  return wx.cloud.callFunction({ name: 'adminUpdateRepair', data }).then((res) => res.result || {});
}

function isLegacyAdminRepairError(res) {
  const msg = String((res && res.errMsg) || '');
  return msg.indexOf('Missing id or action') >= 0;
}

/** 旧版 adminUpdateRepair 未部署时，用 adminGetOrders.repairs 在本地筛选 */
function listFromAdminGetOrders(kind) {
  return wx.cloud.callFunction({ name: 'adminGetOrders' }).then((r) => {
    const result = r.result || {};
    if (result.success === false || result.error === 'NO_ADMIN_PERMISSION') {
      return { success: false, errMsg: result.error || '无管理员权限' };
    }
    const repairs = result.repairs || [];
    if (kind === 'returnRequired') {
      const data = repairs.filter((item) => (
        item.needReturn === true
        && item.returnCompleted !== true
        && item.status !== 'COMPLETED'
        && item.status !== 'RETURN_RECEIVED'
      ));
      return { success: true, data, nicknameDict: {}, snExpiryMap: {} };
    }
    if (kind === 'pending') {
      const data = repairs.filter((item) => {
        const st = String(item.status || '').toUpperCase();
        if (st !== 'PENDING' && st !== 'ADMIN_REVIEWED') return false;
        if (item.needReturn === true) return false;
        if (item.needPurchaseParts === true) return false;
        if (item.purchasePartsStatus === 'completed') return false;
        return true;
      });
      return { success: true, data };
    }
    return { success: true, data: repairs };
  });
}

function listPending() {
  return call({ op: 'list', listType: 'pending' }).then((res) => {
    if (res && res.success) return res;
    if (isLegacyAdminRepairError(res)) return listFromAdminGetOrders('pending');
    return res;
  });
}

function listReturnRequired() {
  return call({ op: 'list', listType: 'returnRequired' }).then((res) => {
    if (res && res.success) return res;
    if (isLegacyAdminRepairError(res)) return listFromAdminGetOrders('returnRequired');
    return res;
  });
}

function getRepair(id) {
  return call({ action: 'get', id });
}

function patchRepair(id, data) {
  return call({ id, data: data || {} });
}

/** 管理员删除待处理报修（级联解锁 SN / 未付配件单） */
function deleteRepair(id, forceAdmin = false) {
  return wx.cloud.callFunction({
    name: 'adminUpdateRepair',
    data: { 
      action: 'delete', 
      id: String(id || ''),
      forceAdmin: forceAdmin === true
    },
    config: { timeout: 20000 }
  }).then((res) => res.result || {});
}

module.exports = {
  SERVER_DATE,
  call,
  listPending,
  listReturnRequired,
  getRepair,
  patchRepair,
  deleteRepair
};
