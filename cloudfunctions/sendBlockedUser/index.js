// cloudfunctions/sendBlockedUser/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // event 里就是前端传过来的 standardData
  const wxContext = cloud.getWXContext()
  
  try {
    // 直接往 blocked_logs 里加数据
    return await db.collection('blocked_logs').add({
      data: {
        ...event, // 把前端传来的所有字段（地址、布尔值等）展开存入
        _openid: wxContext.OPENID, // 补上 OpenID
        serverTime: new Date()     // 补上服务器时间
      }
    })
  } catch (err) {
    console.error(err)
    return { success: false, error: err }
  }
}
