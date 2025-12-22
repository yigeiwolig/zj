// cloudfunctions/adminUpdateOrder/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { id, action, trackingId } = event

  try {
    // 1. 发货逻辑
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
    
    // 2. 删除逻辑
    if (action === 'delete') {
      return await db.collection('shop_orders').doc(id).remove()
    }

    // 3. 【你缺的就是这段】模拟支付逻辑
    if (action === 'simulate_pay') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          status: 'PAID', // 强制改为已支付
          payTime: db.serverDate()
        }
      })
    }

    return { success: true }

  } catch (err) {
    return { success: false, errMsg: err }
  }
}
