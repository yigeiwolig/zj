// cloudfunctions/adminGetOrders/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  
  let orders = { data: [] };
  let repairs = { data: [] };

  try {
    // 1. 获取所有订单，按时间倒序
    // 默认 .get() 仅 20 条，待处理订单多时新单会被截断；拉足近期订单供管理员端展示
    orders = await db.collection('shop_orders')
      .orderBy('createTime', 'desc')
      .limit(200)
      .get()

    // 注意：这里不再做 repairId 推断补全。
    // 只有订单本身明确写入了 repairId，才允许前端显示“引导购配件”黄卡。
  } catch (err) {
    console.error('[adminGetOrders] 查询 shop_orders 失败:', err);
    // 如果集合不存在，orders.data 会是 undefined，下面已处理
  }

  try {
    // 2. 获取所有维修工单，按时间倒序
    // 🔴 修复：集合名从 repair_tickets 改为 shouhou_repair
    repairs = await db.collection('shouhou_repair')
      .orderBy('createTime', 'desc')
      .get()
  } catch (err) {
    console.error('[adminGetOrders] 查询 shouhou_repair 失败:', err);
    // 如果集合不存在，repairs.data 会是 undefined，下面已处理
  }
  
  return {
    data: orders.data || [], // 保持兼容，订单数据放在 data 字段
    repairs: repairs.data || [] // 新增维修工单数据
  }
}
