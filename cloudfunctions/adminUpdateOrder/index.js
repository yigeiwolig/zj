// cloudfunctions/adminUpdateOrder/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const db = cloud.database()
  const { id, action, trackingId, newPrice } = event // 接收 newPrice

  // 🔴 安全：检查调用者是否是管理员
  const adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get()
  if (adminCheck.data.length === 0) {
    return { success: false, errMsg: '权限不足，仅管理员可操作' }
  }

  try {
    // 1. 物料发出
    if (action === 'ship') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          status: 'SHIPPED',
          trackingId: trackingId,
          lastLogistics: '卖家已物料发出，等待揽收',
          updateTime: db.serverDate()
        }
      })
    }
    
    // 2. 删除/取消订单 (用户点取消，或管理员删单)
    if (action === 'delete') {
      return await db.collection('shop_orders').doc(id).remove()
    }

    // 3. 【新增】管理员改价
    if (action === 'update_price') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          totalFee: Number(newPrice), // 确保是数字
          updateTime: db.serverDate()
        }
      })
    }

    // 4. 【新增】用户确认收货（查看安装教程时触发）
    if (action === 'sign') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          status: 'SIGNED',
          lastLogistics: '用户已确认件齐',
          updateTime: db.serverDate()
        }
      })
    }

    return { success: true }

  } catch (err) {
    return { success: false, errMsg: err }
  }
}
