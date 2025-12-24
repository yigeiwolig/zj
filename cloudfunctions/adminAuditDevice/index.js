// cloudfunctions/adminAuditDevice/index.js

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // 接收前端传来的自定义参数：customDate(管理员改的时间), customDays(管理员选的天数)
  const { id, action, customDate, customDays } = event

  try {
    // 1. 获取申请详情
    const applyRes = await db.collection('my_read').doc(id).get()
    const applyData = applyRes.data

    if (action === 'reject') {
      await db.collection('my_read').doc(id).update({ data: { status: 'REJECTED' } })
      return { success: true, msg: '已拒绝' }
    }

    if (action === 'approve') {
      // === A. 使用管理员设定的日期 ===
      const finalDate = customDate ? new Date(customDate) : new Date(applyData.buyDate)
      
      // === B. 计算固件版本 (V年尾.月.3) ===
      // 基于设定的购买日期来生成版本，或者基于当前时间，这里建议用设定日期
      const yearShort = finalDate.getFullYear() % 10
      const month = finalDate.getMonth() + 1
      const firmwareVer = `V${yearShort}.${month}.3`

      // === C. 计算到期日 ===
      const days = parseInt(customDays) || 365 // 使用管理员传来的天数
      const expiryDateObj = new Date(finalDate.getTime() + days * 24 * 60 * 60 * 1000)
      const expiryDateStr = expiryDateObj.toISOString().split('T')[0]

      // === D. 计算剩余天数 ===
      const now = new Date()
      // 如果购买日期是未来的，或者刚买，剩余天数就是总天数；否则减去已过天数
      const diffTime = expiryDateObj - now
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // === E. 更新 sn 集合 ===
      // 关键：确保找到对应的 SN 且 openid 匹配
      await db.collection('sn').where({
        sn: applyData.sn
      }).update({
        data: {
          productModel: applyData.productModel,
          firmware: firmwareVer,
          expiryDate: expiryDateStr,
          totalDays: days,
          remainingDays: remainingDays > 0 ? remainingDays : 0,
          
          // 【核心修复】新机审核通过，激活次数初始为 1
          activations: 1, 
          
          hasExtra: false,
          bindTime: finalDate, // 绑定时间改为购买时间
          imgReceipt: applyData.imgReceipt,
          
          // 【核心修复】标记为已激活，用户端靠这个字段过滤显示
          isActive: true 
        }
      })

      // 更新申请单状态
      await db.collection('my_read').doc(id).update({ data: { status: 'APPROVED' } })

      return { success: true, msg: '同步成功' }
    }

  } catch (err) {
    return { success: false, errMsg: err.toString() }
  }
}




const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // 接收前端传来的自定义参数：customDate(管理员改的时间), customDays(管理员选的天数)
  const { id, action, customDate, customDays } = event

  try {
    // 1. 获取申请详情
    const applyRes = await db.collection('my_read').doc(id).get()
    const applyData = applyRes.data

    if (action === 'reject') {
      await db.collection('my_read').doc(id).update({ data: { status: 'REJECTED' } })
      return { success: true, msg: '已拒绝' }
    }

    if (action === 'approve') {
      // === A. 使用管理员设定的日期 ===
      const finalDate = customDate ? new Date(customDate) : new Date(applyData.buyDate)
      
      // === B. 计算固件版本 (V年尾.月.3) ===
      // 基于设定的购买日期来生成版本，或者基于当前时间，这里建议用设定日期
      const yearShort = finalDate.getFullYear() % 10
      const month = finalDate.getMonth() + 1
      const firmwareVer = `V${yearShort}.${month}.3`

      // === C. 计算到期日 ===
      const days = parseInt(customDays) || 365 // 使用管理员传来的天数
      const expiryDateObj = new Date(finalDate.getTime() + days * 24 * 60 * 60 * 1000)
      const expiryDateStr = expiryDateObj.toISOString().split('T')[0]

      // === D. 计算剩余天数 ===
      const now = new Date()
      // 如果购买日期是未来的，或者刚买，剩余天数就是总天数；否则减去已过天数
      const diffTime = expiryDateObj - now
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // === E. 更新 sn 集合 ===
      // 关键：确保找到对应的 SN 且 openid 匹配
      await db.collection('sn').where({
        sn: applyData.sn
      }).update({
        data: {
          productModel: applyData.productModel,
          firmware: firmwareVer,
          expiryDate: expiryDateStr,
          totalDays: days,
          remainingDays: remainingDays > 0 ? remainingDays : 0,
          
          // 【核心修复】新机审核通过，激活次数初始为 1
          activations: 1, 
          
          hasExtra: false,
          bindTime: finalDate, // 绑定时间改为购买时间
          imgReceipt: applyData.imgReceipt,
          
          // 【核心修复】标记为已激活，用户端靠这个字段过滤显示
          isActive: true 
        }
      })

      // 更新申请单状态
      await db.collection('my_read').doc(id).update({ data: { status: 'APPROVED' } })

      return { success: true, msg: '同步成功' }
    }

  } catch (err) {
    return { success: false, errMsg: err.toString() }
  }
}


const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // 接收前端传来的自定义参数：customDate(管理员改的时间), customDays(管理员选的天数)
  const { id, action, customDate, customDays } = event

  try {
    // 1. 获取申请详情
    const applyRes = await db.collection('my_read').doc(id).get()
    const applyData = applyRes.data

    if (action === 'reject') {
      await db.collection('my_read').doc(id).update({ data: { status: 'REJECTED' } })
      return { success: true, msg: '已拒绝' }
    }

    if (action === 'approve') {
      // === A. 使用管理员设定的日期 ===
      const finalDate = customDate ? new Date(customDate) : new Date(applyData.buyDate)
      
      // === B. 计算固件版本 (V年尾.月.3) ===
      // 基于设定的购买日期来生成版本，或者基于当前时间，这里建议用设定日期
      const yearShort = finalDate.getFullYear() % 10
      const month = finalDate.getMonth() + 1
      const firmwareVer = `V${yearShort}.${month}.3`

      // === C. 计算到期日 ===
      const days = parseInt(customDays) || 365 // 使用管理员传来的天数
      const expiryDateObj = new Date(finalDate.getTime() + days * 24 * 60 * 60 * 1000)
      const expiryDateStr = expiryDateObj.toISOString().split('T')[0]

      // === D. 计算剩余天数 ===
      const now = new Date()
      // 如果购买日期是未来的，或者刚买，剩余天数就是总天数；否则减去已过天数
      const diffTime = expiryDateObj - now
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // === E. 更新 sn 集合 ===
      // 关键：确保找到对应的 SN 且 openid 匹配
      await db.collection('sn').where({
        sn: applyData.sn
      }).update({
        data: {
          productModel: applyData.productModel,
          firmware: firmwareVer,
          expiryDate: expiryDateStr,
          totalDays: days,
          remainingDays: remainingDays > 0 ? remainingDays : 0,
          
          // 【核心修复】新机审核通过，激活次数初始为 1
          activations: 1, 
          
          hasExtra: false,
          bindTime: finalDate, // 绑定时间改为购买时间
          imgReceipt: applyData.imgReceipt,
          
          // 【核心修复】标记为已激活，用户端靠这个字段过滤显示
          isActive: true 
        }
      })

      // 更新申请单状态
      await db.collection('my_read').doc(id).update({ data: { status: 'APPROVED' } })

      return { success: true, msg: '同步成功' }
    }

  } catch (err) {
    return { success: false, errMsg: err.toString() }
  }
}




const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // 接收前端传来的自定义参数：customDate(管理员改的时间), customDays(管理员选的天数)
  const { id, action, customDate, customDays } = event

  try {
    // 1. 获取申请详情
    const applyRes = await db.collection('my_read').doc(id).get()
    const applyData = applyRes.data

    if (action === 'reject') {
      await db.collection('my_read').doc(id).update({ data: { status: 'REJECTED' } })
      return { success: true, msg: '已拒绝' }
    }

    if (action === 'approve') {
      // === A. 使用管理员设定的日期 ===
      const finalDate = customDate ? new Date(customDate) : new Date(applyData.buyDate)
      
      // === B. 计算固件版本 (V年尾.月.3) ===
      // 基于设定的购买日期来生成版本，或者基于当前时间，这里建议用设定日期
      const yearShort = finalDate.getFullYear() % 10
      const month = finalDate.getMonth() + 1
      const firmwareVer = `V${yearShort}.${month}.3`

      // === C. 计算到期日 ===
      const days = parseInt(customDays) || 365 // 使用管理员传来的天数
      const expiryDateObj = new Date(finalDate.getTime() + days * 24 * 60 * 60 * 1000)
      const expiryDateStr = expiryDateObj.toISOString().split('T')[0]

      // === D. 计算剩余天数 ===
      const now = new Date()
      // 如果购买日期是未来的，或者刚买，剩余天数就是总天数；否则减去已过天数
      const diffTime = expiryDateObj - now
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // === E. 更新 sn 集合 ===
      // 关键：确保找到对应的 SN 且 openid 匹配
      await db.collection('sn').where({
        sn: applyData.sn
      }).update({
        data: {
          productModel: applyData.productModel,
          firmware: firmwareVer,
          expiryDate: expiryDateStr,
          totalDays: days,
          remainingDays: remainingDays > 0 ? remainingDays : 0,
          
          // 【核心修复】新机审核通过，激活次数初始为 1
          activations: 1, 
          
          hasExtra: false,
          bindTime: finalDate, // 绑定时间改为购买时间
          imgReceipt: applyData.imgReceipt,
          
          // 【核心修复】标记为已激活，用户端靠这个字段过滤显示
          isActive: true 
        }
      })

      // 更新申请单状态
      await db.collection('my_read').doc(id).update({ data: { status: 'APPROVED' } })

      return { success: true, msg: '同步成功' }
    }

  } catch (err) {
    return { success: false, errMsg: err.toString() }
  }
}
