// cloudfunctions/adminUpdateOrder/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { id, action, trackingId, newPrice } = event // 接收 newPrice

  try {
    // 1. 发货
    if (action === 'ship') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          status: 'SHIPPED',
          trackingId: trackingId,
          lastLogistics: '卖家已发货，等待揽收',
          updateTime: db.serverDate()
        }
      })
    }
    
    // 2. 删除/取消订单 (用户点取消，或管理员删单)
    if (action === 'delete') {
      return await db.collection('shop_orders').doc(id).remove()
    }

    // 3. 模拟支付
    if (action === 'simulate_pay') {
      return await db.collection('shop_orders').doc(id).update({
        data: { status: 'PAID', payTime: db.serverDate() }
      })
    }

    // 4. 【新增】管理员改价
    if (action === 'update_price') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          totalFee: Number(newPrice), // 确保是数字
          updateTime: db.serverDate()
        }
      })
    }

    return { success: true }

  } catch (err) {
    return { success: false, errMsg: err }
  }
}
