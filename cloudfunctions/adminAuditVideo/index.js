// cloudfunctions/adminAuditVideo/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // item: 包含 _id 的对象, action: 动作名称, rejectReason: 拒绝理由
  const { item, action, rejectReason } = event

  try {
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
      // A. 存入官方案例库
      await db.collection('video_go').add({
        data: {
          vehicleName: item.vehicleName,
          category: item.category,
          categoryName: item.categoryName,
          model: item.model,
          videoFileID: item.videoFileID,
          coverFileID: '', 
          type: 'user_upload',
          sn: item.sn,
          createTime: db.serverDate()
        }
      })

      // B. 更新原记录状态
      await db.collection('video').doc(item._id).update({
        data: { status: 1 }
      })

      // C. 赠送延保
      if (item.sn) {
        await giveReward(db, _, item.sn)
      }

      return { success: true, msg: '审核通过，已发布' }
    }

    // 3. 【你缺的就是这个】仅标记为已采纳 (不发布，只改状态)
    if (action === 'mark_pass') {
      // A. 更新用户视频状态为 1 (已通过/已采纳)
      await db.collection('video').doc(item._id).update({
        data: { status: 1 }
      })
      
      // B. 既然采纳了，也要给用户发奖励 (赠送延保)
      if (item.sn) {
        await giveReward(db, _, item.sn)
      }

      return { success: true, msg: '已标记采纳，奖励已发' }
    }

  } catch (err) {
    return { success: false, errMsg: err.toString() }
  }
}

// 辅助函数：赠送延保
async function giveReward(db, _, sn) {
  const devRes = await db.collection('sn').where({ sn: sn }).get()
  if (devRes.data.length > 0) {
    const device = devRes.data[0]
    const oldDate = new Date(device.expiryDate)
    const newDate = new Date(oldDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const newDateStr = newDate.toISOString().split('T')[0]

    await db.collection('sn').doc(device._id).update({
      data: {
        expiryDate: newDateStr,
        hasReward: true, 
        totalDays: _.inc(30)
      }
    })
  }
}
