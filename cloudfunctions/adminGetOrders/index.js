// cloudfunctions/adminGetOrders/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
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
