// cloudfunctions/adminGetOrders/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const db = cloud.database()
  
  // 🔴 安全：检查调用者是否是管理员
  const adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get()
  if (adminCheck.data.length === 0) {
    return { error: true, msg: '权限不足，仅管理员可访问' }
  }
  
  // 1. 获取所有订单，按时间倒序
  const orders = await db.collection('shop_orders')
    .orderBy('createTime', 'desc')
    .get()
  
  // 2. 获取所有维修工单，按时间倒序
  const repairs = await db.collection('repair_tickets')
    .orderBy('createTime', 'desc')
    .get()
  
  return {
    data: orders.data, // 保持兼容，订单数据放在 data 字段
    repairs: repairs.data // 新增维修工单数据
  }
}
