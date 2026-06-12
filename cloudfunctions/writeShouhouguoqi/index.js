const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PAID_STATUSES = ['PAID', 'SHIPPED', 'SIGNED', 'COMPLETED']

/**
 * 写入 shouhouguoqi：必须在订单已支付且与维修单关联后执行（防未付款刷「已购配件」）
 */
exports.main = async (event) => {
  const { repairId, goodsList, addressData, userNickname, orderId } = event
  const callerOpenid = cloud.getWXContext().OPENID

  if (!repairId) {
    return { success: false, errMsg: '缺少 repairId 参数' }
  }

  const outNo = orderId ? String(orderId).trim() : ''
  if (!outNo) {
    return { success: false, errMsg: '缺少 orderId，无法校验支付状态' }
  }

  try {
    const orderRes = await db.collection('shop_orders').where({ orderId: outNo }).limit(1).get()
    const order = orderRes.data && orderRes.data[0]
    if (!order) {
      return { success: false, errMsg: '订单不存在' }
    }

    const orderStatus = order.status || order.realStatus || ''
    if (!PAID_STATUSES.includes(orderStatus)) {
      return { success: false, errMsg: '订单尚未支付成功，请稍后在订单中心查看' }
    }

    if (callerOpenid) {
      if (order._openid && order._openid !== callerOpenid) {
        return { success: false, errMsg: '无权操作该订单' }
      }
    }

    const rid = String(repairId).trim()
    const orderRepairId = order.repairId ? String(order.repairId).trim() : ''
    if (!orderRepairId || orderRepairId !== rid) {
      return { success: false, errMsg: '订单与维修单不匹配，请从维修引导重新下单' }
    }

    const repairRes = await db.collection('shouhou_repair').doc(rid).get()
    if (!repairRes.data) {
      return { success: false, errMsg: '未找到对应的维修单' }
    }

    const repairData = repairRes.data
    const repairOwner = repairData._openid || ''
    if (callerOpenid && repairOwner && repairOwner !== callerOpenid) {
      return { success: false, errMsg: '无权操作该维修单' }
    }

    if (repairData.purchasePartsStatus === 'completed') {
      return {
        success: true,
        data: { repairId: rid, skipped: true },
        errMsg: ''
      }
    }

    await db.collection('shouhou_repair').doc(rid).update({
      data: { purchasePartsStatus: 'completed' }
    })

    const guoqiData = {
      _openid: callerOpenid || order._openid || repairOwner,
      userNickname: userNickname || order.userNickname || '',
      userAddress: {
        name: addressData?.name || order.address?.name || '',
        phone: addressData?.phone || order.address?.phone || '',
        address: addressData?.address || order.address?.address || ''
      },
      actualAddress: {
        name: addressData?.name || order.address?.name || '',
        phone: addressData?.phone || order.address?.phone || '',
        address: addressData?.address || order.address?.address || ''
      },
      purchasedItems: goodsList || order.goodsList || [],
      requiredParts: repairData.purchasePartsList || [],
      hasPurchased: true,
      repairId: rid,
      orderId: outNo,
      createTime: db.serverDate()
    }

    const addRes = await db.collection('shouhouguoqi').add({ data: guoqiData })

    return {
      success: true,
      data: { _id: addRes._id, repairId: rid }
    }
  } catch (err) {
    console.error('[writeShouhouguoqi] 执行失败:', err)
    return { success: false, errMsg: err.message || String(err) }
  }
}
