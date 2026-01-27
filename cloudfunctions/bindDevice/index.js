// cloudfunctions/bindDevice/index.js

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { sn, deviceName } = event

  try {
    // 1. 查询设备
    const res = await db.collection('sn').where({ sn: sn }).get()

    // A. 全新设备 -> 需审核
    if (res.data.length === 0) {
      await db.collection('sn').add({
        data: {
          sn: sn,
          name: deviceName,
          openid: myOpenid,
          isActive: false,
          activations: 0, // 初始为0，审核通过变1
          createTime: db.serverDate()
        }
      })
      return { success: true, status: 'NEED_AUDIT', msg: '新设备，请提交审核' }
    }

    const device = res.data[0]

    // B. 是我自己的设备 (防抖，防止重复点)
    if (device.openid === myOpenid) {
      if (device.isActive) {
        // 🔴 绑定成功：检查是否有待生效延保记录
        await applyPendingWarranty(db, _, myOpenid, sn)
        return { success: true, status: 'AUTO_APPROVED', msg: '设备已连接' }
      } else {
        return { success: true, status: 'NEED_AUDIT', msg: '审核未通过，请继续' }
      }
    }

    // C. 别人的设备 (拒绝)
    if (device.openid && device.openid !== '') {
      return { success: false, status: 'LOCKED', msg: '设备已被绑定，请联系原主解绑' }
    }

    // D. 无主设备 (openid 为空，且已激活)
    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          openid: myOpenid,      // 归我了
          bindCount: _.inc(1),   // 绑定记录+1
          activations: _.inc(1), // 激活次数+1 (易主/重连算一次)
          lastBindTime: db.serverDate()
        }
      })
      
      // 🔴 绑定成功：检查是否有待生效延保记录
      await applyPendingWarranty(db, _, myOpenid, sn)
      
      // 【修改】文案统一改为"绑定成功"，不提"二手"
      return { success: true, status: 'AUTO_APPROVED', msg: '绑定成功' }
    } else {
      // E. 未激活的无主设备
      await db.collection('sn').doc(device._id).update({ data: { openid: myOpenid } })
      return { success: true, status: 'NEED_AUDIT', msg: '请提交审核' }
    }

  } catch (err) {
    console.error('[bindDevice] 云函数执行失败:', err);
    return { success: false, msg: err.message || err.errMsg || '网络校验失败，请重试' }
  }
}

// 🔴 新增：应用待生效延保记录
async function applyPendingWarranty(db, _, openid, sn) {
  try {
    // 1. 查询该 openid 的所有待生效延保记录
    const pendingRes = await db.collection('pending_warranty')
      .where({
        openid: openid,
        status: 'pending'
      })
      .get()
    
    if (pendingRes.data.length === 0) {
      console.log('[bindDevice] 该用户无待生效延保记录')
      return
    }
    
    // 2. 计算总延保天数（累加所有待生效记录）
    let totalDays = 0
    pendingRes.data.forEach(record => {
      totalDays += record.warrantyDays || 30
    })
    
    // 3. 给设备增加延保时间
    const devRes = await db.collection('sn').where({ sn: sn }).get()
    if (devRes.data.length > 0) {
      const device = devRes.data[0]
      const oldDate = new Date(device.expiryDate)
      const newDate = new Date(oldDate.getTime() + totalDays * 24 * 60 * 60 * 1000)
      const newDateStr = newDate.toISOString().split('T')[0]
      
      await db.collection('sn').doc(device._id).update({
        data: {
          expiryDate: newDateStr,
          hasReward: true,
          totalDays: _.inc(totalDays)
        }
      })
      
      console.log('[bindDevice] 已应用待生效延保，总天数:', totalDays)
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
    
    console.log('[bindDevice] 已更新', recordIds.length, '条待生效延保记录为已生效')
  } catch (err) {
    console.error('[bindDevice] 应用待生效延保失败:', err)
    // 不抛出错误，避免影响绑定流程
  }
}