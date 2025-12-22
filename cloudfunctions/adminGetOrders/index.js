// cloudfunctions/adminGetOrders/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  // 获取所有订单，按时间倒序
  // 这里的 shop_orders 必须和你数据库里的集合名一致
  return await db.collection('shop_orders')
    .orderBy('createTime', 'desc')
    .get()
}
