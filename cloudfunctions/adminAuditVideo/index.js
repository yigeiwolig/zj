// cloudfunctions/adminAuditVideo/index.js
const cloud = require('wx-server-sdk')
const http = require('http')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function assertAdmin(db) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

// 🔴 调试日志辅助函数
function sendDebugLog(location, message, data, hypothesisId) {
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
      }
    }
    
    const req = http.request(options, () => {})
    req.on('error', () => {})
    req.write(logData)
    req.end()
  } catch (e) {
    // 静默失败
  }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // item: 包含 _id 的对象, action: 动作名称, rejectReason: 拒绝理由
  const { item, action, rejectReason } = event

  try {
    await assertAdmin(db)

    // 1. 拒绝逻辑
    if (action === 'reject') {
      await db.collection('video').doc(item._id).update({
        data: { 
          status: -1,
          rejectReason: rejectReason || '未填写理由' // 保存拒绝理由
        }
      })
      return { success: true, msg: '已驳回' }
    }

    // 2. 通过并发布 (自动存入 video_go)
    if (action === 'approve') {
      // 🔴 从数据库查询视频记录，获取完整的 openid 和 sn
      const videoRes = await db.collection('video').doc(item._id).get()
      const videoData = videoRes.data
      const videoOpenid = videoData.openid || null
      const videoSn = videoData.sn || item.sn || null
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditVideo/index.js:approve', '从数据库查询视频记录', { videoId: item._id, hasOpenid: !!videoOpenid, hasSn: !!videoSn, openid: videoOpenid, sn: videoSn }, 'A')
      // #endregion
      
      // A. 存入官方案例库
      await db.collection('video_go').add({
        data: {
          vehicleName: videoData.vehicleName || item.vehicleName,
          category: videoData.category || item.category,
          categoryName: videoData.categoryName || item.categoryName,
          model: videoData.model || item.model,
          videoFileID: videoData.videoFileID || item.videoFileID,
          coverFileID: '', 
          type: 'user_upload',
          sn: videoSn,
          createTime: db.serverDate()
        }
      })

      // B. 更新原记录状态
      await db.collection('video').doc(item._id).update({
        data: { status: 1 }
      })

      // C. 赠送延保
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditVideo/index.js:approve', '视频审核通过，检查延保条件', { hasSn: !!videoSn, hasOpenid: !!videoOpenid, sn: videoSn, openid: videoOpenid }, 'A')
      // #endregion
      
      if (videoSn) {
        // 🔴 已绑定设备：直接给设备增加延保
        await giveReward(db, _, videoSn)
      } else if (videoOpenid) {
        // 🔴 未绑定设备：创建待生效延保记录
        try {
          await createPendingWarranty(db, videoOpenid, item._id)
        } catch (err) {
          console.error('[adminAuditVideo] 创建待生效延保记录失败，但继续执行:', err)
          // #region agent log
          sendDebugLog('cloudfunctions/adminAuditVideo/index.js:approve', '创建待生效延保记录失败，但继续执行', { videoOpenid, videoId: item._id, error: err.toString() }, 'A')
          // #endregion
          // 不抛出错误，避免影响审核流程
        }
      } else {
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditVideo/index.js:approve', '既无SN也无OpenID，无法创建待生效延保记录', { videoSn, videoOpenid }, 'A')
        // #endregion
        console.warn('[adminAuditVideo] 既无SN也无OpenID，无法创建待生效延保记录')
      }

      return { success: true, msg: '审核通过，已发布' }
    }

    // 3. 【你缺的就是这个】仅标记为已采纳 (不发布，只改状态)
    if (action === 'mark_pass') {
      // 🔴 从数据库查询视频记录，获取完整的 openid 和 sn
      const videoRes = await db.collection('video').doc(item._id).get()
      const videoData = videoRes.data
      const videoOpenid = videoData.openid || null
      const videoSn = videoData.sn || item.sn || null
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditVideo/index.js:mark_pass', '从数据库查询视频记录', { videoId: item._id, hasOpenid: !!videoOpenid, hasSn: !!videoSn, openid: videoOpenid, sn: videoSn }, 'A')
      // #endregion
      
      // A. 更新用户视频状态为 1 (已通过/已采纳)
      await db.collection('video').doc(item._id).update({
        data: { status: 1 }
      })
      
      // B. 既然采纳了，也要给用户发奖励 (赠送延保)
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditVideo/index.js:mark_pass', '视频标记采纳，检查延保条件', { hasSn: !!videoSn, hasOpenid: !!videoOpenid, sn: videoSn, openid: videoOpenid }, 'A')
      // #endregion
      
      if (videoSn) {
        // 🔴 已绑定设备：直接给设备增加延保
        await giveReward(db, _, videoSn)
      } else if (videoOpenid) {
        // 🔴 未绑定设备：创建待生效延保记录
        try {
          await createPendingWarranty(db, videoOpenid, item._id)
        } catch (err) {
          console.error('[adminAuditVideo] 创建待生效延保记录失败，但继续执行:', err)
          // #region agent log
          sendDebugLog('cloudfunctions/adminAuditVideo/index.js:mark_pass', '创建待生效延保记录失败，但继续执行', { videoOpenid, videoId: item._id, error: err.toString() }, 'A')
          // #endregion
          // 不抛出错误，避免影响审核流程
        }
      } else {
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditVideo/index.js:mark_pass', '既无SN也无OpenID，无法创建待生效延保记录', { videoSn, videoOpenid }, 'A')
        // #endregion
        console.warn('[adminAuditVideo] 既无SN也无OpenID，无法创建待生效延保记录')
      }

      return { success: true, msg: '已标记采纳，奖励已发' }
    }

  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: err.toString() }
  }
}

// 辅助函数：赠送延保（已绑定设备）
async function giveReward(db, _, sn) {
  try {
    const devRes = await db.collection('sn').where({ sn: sn }).get()
    if (devRes.data.length === 0) {
      console.warn('[adminAuditVideo] 设备不存在，无法赠送延保:', sn)
      return
    }
    
    const device = devRes.data[0]
    
    // 🔴 检查设备是否有到期日，如果没有则使用当前时间作为基准
    if (!device.expiryDate) {
      console.warn('[adminAuditVideo] 设备没有到期日，使用当前时间作为基准:', sn)
    }
    
    const now = new Date()
    const oldDate = device.expiryDate ? new Date(device.expiryDate) : now
    // 🔴 如果设备已过期，从当前时间开始计算30天；否则从原到期日增加30天
    const baseDate = oldDate < now ? now : oldDate
    const newDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const newDateStr = newDate.toISOString().split('T')[0]
    
    // 🔴 重新计算剩余天数
    const remainingDays = Math.ceil((newDate - now) / (1000 * 60 * 60 * 24))

    await db.collection('sn').doc(device._id).update({
      data: {
        expiryDate: newDateStr,
        hasReward: true, 
        totalDays: _.inc(30),
        remainingDays: remainingDays > 0 ? remainingDays : 0,
        warrantyExpired: false // 🔴 增加延保后，标记为未过期
      }
    })
    
    console.log('[adminAuditVideo] 已成功赠送延保:', sn, '新到期日:', newDateStr, '剩余天数:', remainingDays)
  } catch (err) {
    console.error('[adminAuditVideo] 赠送延保失败:', sn, err)
    // 不抛出错误，避免影响审核流程
  }
}

// 🔴 新增：创建待生效延保记录（未绑定设备）
async function createPendingWarranty(db, openid, videoId) {
  // #region agent log
  sendDebugLog('cloudfunctions/adminAuditVideo/index.js:createPendingWarranty', '创建待生效延保记录', { openid, videoId, warrantyDays: 30 }, 'A')
  // #endregion
  
  try {
    const result = await db.collection('pending_warranty').add({
      data: {
        openid: openid,
        videoId: videoId,
        warrantyDays: 30,
        status: 'pending', // pending: 待生效, applied: 已生效
        approvedAt: db.serverDate(),
        appliedAt: null
      }
    })
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditVideo/index.js:createPendingWarranty', '待生效延保记录创建结果', { openid, videoId, _id: result._id, success: true }, 'A')
    // #endregion
    
    console.log('[adminAuditVideo] 已创建待生效延保记录，openid:', openid, 'videoId:', videoId, '_id:', result._id)
    return result
  } catch (err) {
    console.error('[adminAuditVideo] 创建待生效延保记录失败:', err)
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditVideo/index.js:createPendingWarranty', '创建待生效延保记录失败', { openid, videoId, error: err.toString(), errorMessage: err.message }, 'A')
    // #endregion
    throw err // 重新抛出错误，让调用者知道失败了
  }
}
