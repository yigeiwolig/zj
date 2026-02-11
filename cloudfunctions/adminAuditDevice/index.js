// cloudfunctions/adminAuditDevice/index.js

const cloud = require('wx-server-sdk')
const http = require('http')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 🔴 调试日志辅助函数
function sendDebugLog(location, message, data, hypothesisId) {
  // 同时使用 console.log 和 HTTP 请求
  console.log('[DEBUG]', location, message, JSON.stringify(data))
  
  try {
    const logData = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'warranty-debug',
      hypothesisId
    })
    
    const options = {
      hostname: '127.0.0.1',
      port: 7242,
      path: '/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(logData)
      },
      timeout: 1000 // 1秒超时
    }
    
    const req = http.request(options, () => {})
    req.on('error', (e) => {
      console.error('[DEBUG] HTTP log failed:', e.message)
    })
    req.on('timeout', () => {
      req.destroy()
    })
    req.write(logData)
    req.end()
  } catch (e) {
    console.error('[DEBUG] Log function error:', e)
  }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  
  // 接收前端传来的自定义参数：customDate(管理员改的时间), customDays(管理员选的天数)
  const { id, action, customDate, customDays } = event

  try {
    // 1. 获取申请详情
    const applyRes = await db.collection('my_read').doc(id).get()
    const applyData = applyRes.data
    
    // 🔴 获取申请人的 openid（从文档的 _openid 字段获取，这是云开发自动注入的）
    // 注意：在云函数中，_openid 字段可以直接访问
    // 🔴 修复：如果 _openid 不存在，尝试从文档的 openid 字段获取（某些情况下可能存储在这里）
    let applicantOpenid = applyData._openid || applyData.openid
    
    // 🔴 如果还是没有，尝试从查询结果中获取（云开发会自动注入 _openid）
    if (!applicantOpenid && applyRes.data) {
      // 在某些情况下，_openid 可能不在 data 中，需要从其他地方获取
      // 但通常 _openid 应该在 data 中
      applicantOpenid = applyData._openid
    }
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:main', '获取申请详情', { 
      id, 
      applicantOpenid, 
      sn: applyData.sn, 
      hasOpenid: !!applicantOpenid,
      has_openid: !!applyData._openid,
      has_openid_field: !!applyData.openid,
      allKeys: Object.keys(applyData)
    }, 'B')
    // #endregion
    
    // 🔴 如果还是没有 openid，记录错误
    if (!applicantOpenid) {
      console.error('[adminAuditDevice] 无法获取申请人 openid，申请记录:', applyData)
      return { success: false, errMsg: '无法获取申请人信息，请重试' }
    }

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

      // === E. 更新 sn 集合 ===
      // 🔴 获取申请人的 openid（从 my_read 文档的 _openid 字段）
      const userOpenid = applicantOpenid
      
      console.log('[adminAuditDevice] 申请人 openid:', userOpenid, 'SN:', applyData.sn)
      
      // 🔴 先检查是否有待生效延保记录，计算总延保天数
      let pendingWarrantyDays = 0
      if (userOpenid) {
        const pendingRes = await db.collection('pending_warranty')
          .where({
            openid: userOpenid,
            status: 'pending'
          })
          .get()
        
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '查询待生效延保记录', { userOpenid, sn: applyData.sn, recordCount: pendingRes.data.length, records: pendingRes.data.map(r => ({ _id: r._id, warrantyDays: r.warrantyDays })) }, 'E')
        // #endregion
        
        pendingRes.data.forEach(record => {
          pendingWarrantyDays += record.warrantyDays || 30
        })
        
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '计算待生效延保总天数', { userOpenid, sn: applyData.sn, pendingWarrantyDays }, 'E')
        // #endregion
      }
      
      // 计算最终的总天数（基础天数 + 待生效延保天数）
      const finalTotalDays = days + pendingWarrantyDays
      const finalExpiryDateObj = new Date(finalDate.getTime() + finalTotalDays * 24 * 60 * 60 * 1000)
      const finalExpiryDateStr = finalExpiryDateObj.toISOString().split('T')[0]
      
      // === D. 计算剩余天数（使用包含待生效延保的最终日期） ===
      const now = new Date()
      // 如果购买日期是未来的，或者刚买，剩余天数就是总天数；否则减去已过天数
      const diffTime = finalExpiryDateObj - now
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '计算最终延保信息', { userOpenid, sn: applyData.sn, baseDays: days, pendingWarrantyDays, finalTotalDays, finalExpiryDate: finalExpiryDateStr, remainingDays }, 'E')
      // #endregion
      
      // 更新 sn 集合，确保设置 openid
      // 🔴 修复：先查询设备是否存在
      const deviceRes = await db.collection('sn').where({
        sn: applyData.sn
      }).get()
      
      if (deviceRes.data.length === 0) {
        console.error('[adminAuditDevice] 设备不存在，SN:', applyData.sn)
        return { success: false, errMsg: '设备不存在，请检查SN是否正确' }
      }
      
      // 🔴 修复：确保 openid 被设置（必须设置，不能为空）
      const updateData = {
        productModel: applyData.productModel,
        firmware: firmwareVer,
        expiryDate: finalExpiryDateStr, // 🔴 使用包含待生效延保的最终日期
        totalDays: finalTotalDays, // 🔴 使用包含待生效延保的最终天数
        remainingDays: remainingDays > 0 ? remainingDays : 0,
        
        // 【核心修复】新机审核通过，激活次数初始为 1
        activations: 1, 
        
        hasExtra: false,
        bindTime: finalDate, // 绑定时间改为购买时间
        imgReceipt: applyData.imgReceipt,
        
        // 【核心修复】标记为已激活，用户端靠这个字段过滤显示
        isActive: true,
        
        // 🔴 修复：必须设置 openid，不能为空
        openid: userOpenid
      }
      
      console.log('[adminAuditDevice] 准备更新设备，SN:', applyData.sn, 'openid:', userOpenid, 'updateData keys:', Object.keys(updateData))
      
      const updateResult = await db.collection('sn').where({
        sn: applyData.sn
      }).update({
        data: updateData
      })
      
      console.log('[adminAuditDevice] 设备更新结果，updated:', updateResult.stats?.updated || 0)
      
      // 🔴 验证更新是否成功
      const verifyRes = await db.collection('sn').where({
        sn: applyData.sn,
        openid: userOpenid,
        isActive: true
      }).get()
      
      console.log('[adminAuditDevice] 验证更新结果，查询到的设备数量:', verifyRes.data.length)
      if (verifyRes.data.length === 0) {
        console.error('[adminAuditDevice] 警告：更新后验证失败，设备可能未正确更新，SN:', applyData.sn, 'openid:', userOpenid)
      }

      // 更新申请单状态
      await db.collection('my_read').doc(id).update({ data: { status: 'APPROVED' } })

      // 🔴 设备审核通过：更新待生效延保记录状态为"已生效"
      if (userOpenid && pendingWarrantyDays > 0) {
        const pendingRes = await db.collection('pending_warranty')
          .where({
            openid: userOpenid,
            status: 'pending'
          })
          .get()
        
        const recordIds = pendingRes.data.map(r => r._id)
        for (const recordId of recordIds) {
          await db.collection('pending_warranty').doc(recordId).update({
            data: {
              status: 'applied',
              appliedAt: db.serverDate(),
              appliedSn: applyData.sn
            }
          })
        }
        
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '待生效延保记录状态更新完成', { userOpenid, sn: applyData.sn, recordIdsCount: recordIds.length }, 'E')
        // #endregion
        
        console.log('[adminAuditDevice] 已更新', recordIds.length, '条待生效延保记录为已生效')
      }

      return { success: true, msg: '同步成功' }
    }

  } catch (err) {
    return { success: false, errMsg: err.toString() }
  }
}

// 🔴 新增：应用待生效延保记录（与 bindDevice 中的逻辑一致）
async function applyPendingWarranty(db, _, openid, sn) {
  // #region agent log
  sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '函数入口', { openid, sn }, 'C')
  // #endregion
  
  try {
    // 1. 查询该 openid 的所有待生效延保记录
    const pendingRes = await db.collection('pending_warranty')
      .where({
        openid: openid,
        status: 'pending'
      })
      .get()
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '查询待生效延保记录结果', { openid, sn, recordCount: pendingRes.data.length, records: pendingRes.data.map(r => ({ _id: r._id, warrantyDays: r.warrantyDays })) }, 'C')
    // #endregion
    
    if (pendingRes.data.length === 0) {
      console.log('[adminAuditDevice] 该用户无待生效延保记录')
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '无待生效延保记录，提前返回', { openid, sn }, 'C')
      // #endregion
      return
    }
    
    // 2. 计算总延保天数（累加所有待生效记录）
    let totalDays = 0
    pendingRes.data.forEach(record => {
      totalDays += record.warrantyDays || 30
    })
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '计算总延保天数', { openid, sn, totalDays, recordCount: pendingRes.data.length }, 'D')
    // #endregion
    
    // 3. 给设备增加延保时间
    const devRes = await db.collection('sn').where({ sn: sn }).get()
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '查询设备结果', { openid, sn, deviceFound: devRes.data.length > 0, deviceId: devRes.data[0]?._id, oldExpiryDate: devRes.data[0]?.expiryDate, oldTotalDays: devRes.data[0]?.totalDays }, 'D')
    // #endregion
    
    if (devRes.data.length > 0) {
      const device = devRes.data[0]
      
      // 🔴 检查设备是否有到期日，如果没有则使用当前时间作为基准
      if (!device.expiryDate) {
        console.warn('[adminAuditDevice] 设备没有到期日，使用当前时间作为基准:', sn)
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '设备没有到期日，使用当前时间', { openid, sn }, 'D')
        // #endregion
      }
      
      const oldDate = device.expiryDate ? new Date(device.expiryDate) : new Date()
      const newDate = new Date(oldDate.getTime() + totalDays * 24 * 60 * 60 * 1000)
      const newDateStr = newDate.toISOString().split('T')[0]
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '准备更新设备延保', { openid, sn, deviceId: device._id, oldExpiryDate: device.expiryDate, newExpiryDate: newDateStr, totalDays, oldTotalDays: device.totalDays }, 'D')
      // #endregion
      
      const updateResult = await db.collection('sn').doc(device._id).update({
        data: {
          expiryDate: newDateStr,
          hasReward: true,
          totalDays: _.inc(totalDays)
        }
      })
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '设备延保更新结果', { openid, sn, deviceId: device._id, updated: updateResult.stats.updated, newExpiryDate: newDateStr, totalDays }, 'D')
      // #endregion
      
      console.log('[adminAuditDevice] 已应用待生效延保，总天数:', totalDays)
    }
    
    // 4. 更新所有待生效记录状态为"已生效"
    const recordIds = pendingRes.data.map(r => r._id)
    for (const recordId of recordIds) {
      await db.collection('pending_warranty').doc(recordId).update({
        data: {
          status: 'applied',
          appliedAt: db.serverDate(),
          appliedSn: sn
        }
      })
    }
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '待生效延保记录状态更新完成', { openid, sn, recordIdsCount: recordIds.length }, 'D')
    // #endregion
    
    console.log('[adminAuditDevice] 已更新', recordIds.length, '条待生效延保记录为已生效')
  } catch (err) {
    console.error('[adminAuditDevice] 应用待生效延保失败:', err)
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '应用待生效延保失败', { openid, sn, error: err.toString(), errorMessage: err.message }, 'D')
    // #endregion
    // 不抛出错误，避免影响审核流程
  }
}
