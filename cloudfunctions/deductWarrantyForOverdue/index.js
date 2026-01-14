// cloudfunctions/deductWarrantyForOverdue/index.js
// 检查并扣除超过30天未上传运单号的质保

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    let overdueRepairs = []
    
    // 🔴 如果传入了 repairId，只处理单个维修单
    if (event.repairId) {
      const repairRes = await db.collection('shouhou_repair').doc(event.repairId).get()
      if (repairRes.data) {
        const repair = repairRes.data
        // 🔴 如果是管理员手动扣除（force: true），直接扣除，不检查时间条件
        if (event.force === true) {
          // 检查是否已经扣除过
          if (repair.warrantyDeducted) {
            return {
              success: false,
              message: '该订单已扣除过质保',
              results: { success: [], failed: [{ repairId: event.repairId, reason: '已扣除过质保' }], totalDeducted: 0 }
            }
          }
          // 直接加入待处理列表
          overdueRepairs = [repair]
        } else {
          // 自动模式：检查是否满足扣除条件（超过30天）
          if (repair.needReturn && 
              !repair.warrantyDeducted &&
              repair.solveTime) {
            const solveTime = new Date(repair.solveTime)
            if (solveTime < thirtyDaysAgo) {
              overdueRepairs = [repair]
            }
          }
        }
      }
    } else {
      // 1. 查找所有状态为 SHIPPED，超过30天未上传运单号的维修单
      overdueRepairs = (await db.collection('shouhou_repair')
        .where(_.and([
          { status: 'SHIPPED' },
          { needReturn: true },
          { returnTrackingId: _.exists(false) }, // 未上传运单号
          { solveTime: _.lt(thirtyDaysAgo) }, // 超过30天
          { warrantyDeducted: _.neq(true) } // 未扣除过质保
        ]))
        .get()).data
    }
    
    console.log(`[deductWarrantyForOverdue] 找到 ${overdueRepairs.length} 个超时维修单`)
    
    const results = {
      success: [],
      failed: [],
      totalDeducted: 0
    }
    
    // 2. 对每个超时维修单，扣除对应设备的质保
    for (const repair of overdueRepairs) {
      try {
        // 通过 openid 和 model 找到对应的设备
        // 注意：这里假设一个用户可能有多个相同型号的设备，我们取第一个
        const deviceRes = await db.collection('sn')
          .where({
            _openid: repair._openid,
            productModel: repair.model,
            isActive: true
          })
          .limit(1)
          .get()
        
        if (deviceRes.data.length === 0) {
          console.warn(`[deductWarrantyForOverdue] 未找到设备: openid=${repair._openid}, model=${repair.model}`)
          results.failed.push({
            repairId: repair._id,
            reason: '未找到对应设备'
          })
          continue
        }
        
        const device = deviceRes.data[0]
        const currentExpiryDate = new Date(device.expiryDate)
        
        // 扣除30天质保
        const newExpiryDate = new Date(currentExpiryDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        const newExpiryDateStr = newExpiryDate.toISOString().split('T')[0]
        
        // 计算新的剩余天数
        const remainingDays = Math.ceil((newExpiryDate - now) / (1000 * 60 * 60 * 24))
        
        // 更新设备质保
        await db.collection('sn').doc(device._id).update({
          data: {
            expiryDate: newExpiryDateStr,
            remainingDays: remainingDays > 0 ? remainingDays : 0,
            totalDays: device.totalDays ? device.totalDays - 30 : 0
          }
        })
        
        // 标记维修单已扣除质保
        await db.collection('shouhou_repair').doc(repair._id).update({
          data: {
            warrantyDeducted: true,
            warrantyDeductedTime: db.serverDate()
          }
        })
        
        results.success.push({
          repairId: repair._id,
          deviceSn: device.sn,
          oldExpiryDate: device.expiryDate,
          newExpiryDate: newExpiryDateStr
        })
        results.totalDeducted++
        
        console.log(`[deductWarrantyForOverdue] 成功扣除质保: repairId=${repair._id}, deviceSn=${device.sn}`)
      } catch (err) {
        console.error(`[deductWarrantyForOverdue] 处理失败: repairId=${repair._id}`, err)
        results.failed.push({
          repairId: repair._id,
          reason: err.message || '未知错误'
        })
      }
    }
    
    return {
      success: true,
      message: `处理完成，成功扣除 ${results.totalDeducted} 个设备的质保`,
      results: results
    }
  } catch (err) {
    console.error('[deductWarrantyForOverdue] 执行失败:', err)
    return {
      success: false,
      errMsg: err.toString()
    }
  }
}
