const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 生成安装教程分享码
 * 功能：
 * 1. 检查用户是否已生成过分享码（每个用户只能生成一次）
 * 2. 生成随机分享码（8位字母数字组合）
 * 3. 保存到 chakan 集合，设置10天有效期
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { orderId, creatorNickname } = event // 🔴 新增：接收分享用户昵称
  
  if (!orderId) {
    return { success: false, errMsg: '缺少订单号' }
  }

  const openid = wxContext.OPENID
  if (!openid) {
    return { success: false, errMsg: '无法获取用户身份' }
  }

  try {
    // 1. 检查用户是否已生成过分享码
    const existingRes = await db.collection('chakan')
      .where({
        creatorOpenid: openid
      })
      .get()

    if (existingRes.data && existingRes.data.length > 0) {
      // 用户已生成过分享码
      const existingCode = existingRes.data[0]
      return {
        success: false,
        errMsg: '您已生成过分享码，无法重复生成',
        existingCode: existingCode.code // 返回已存在的分享码
      }
    }

    // 2. 生成随机分享码（MT开头 + 6位字母数字组合，总共8位）
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = 'MT' // 固定前缀
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code // 格式：MT123ABC
    }

    // 确保分享码唯一（检查是否已存在）
    let shareCode = generateCode()
    let codeExists = true
    let retryCount = 0
    while (codeExists && retryCount < 10) {
      const checkRes = await db.collection('chakan')
        .where({ code: shareCode })
        .count()
      
      if (checkRes.total === 0) {
        codeExists = false
      } else {
        shareCode = generateCode()
        retryCount++
      }
    }

    if (codeExists) {
      return { success: false, errMsg: '生成分享码失败，请重试' }
    }

    // 3. 计算过期时间（10天后）
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // 10天后

    // 4. 保存到数据库
    const addRes = await db.collection('chakan').add({
      data: {
        code: shareCode,
        creatorOpenid: openid,
        creatorNickname: creatorNickname || '', // 🔴 保存分享用户昵称
        creatorOrderId: orderId,
        createdAt: db.serverDate(),
        expiresAt: expiresAt,
        totalViews: 3,
        usedViews: 0,
        status: 'active',
        viewers: [] // 🔴 初始化 viewers 数组
      }
    })

    return {
      success: true,
      code: shareCode,
      expiresAt: expiresAt,
      _id: addRes._id
    }

  } catch (err) {
    console.error('[generateShareCode] 错误:', err)
    return {
      success: false,
      errMsg: err.message || '生成分享码失败'
    }
  }
}
