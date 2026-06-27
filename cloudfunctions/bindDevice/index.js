// cloudfunctions/bindDevice/index.js

const cloud = require('wx-server-sdk')
const { normalizeSn, snCandidates, buildActivationFields } = require('./snUtils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function findPreRegister(db, _, normalizedSn) {
  const candidates = snCandidates(normalizedSn)
  try {
    const res = await db.collection('guanliyuanSN').where({ sn: _.in(candidates) }).limit(1).get()
    if (res.data && res.data.length > 0) return res.data[0]
    const exact = await db.collection('guanliyuanSN').where({ sn: normalizedSn }).limit(1).get()
    if (exact.data && exact.data.length > 0) return exact.data[0]
  } catch (err) {
    console.error('[bindDevice] 查询 guanliyuanSN 失败，将尝试 sn.productModel 兜底:', err)
  }
  return null
}

/** 预登记型号：优先 guanliyuanSN，其次未激活 sn 上的 productModel（管理员预登记写入） */
function resolvePreRegisterModel(preReg, device, myOpenid) {
  const fromReg = preReg && String(preReg.productModel || '').trim()
  if (fromReg) return fromReg
  if (!device) return ''
  const pm = String(device.productModel || '').trim()
  if (!pm) return ''
  const oid = device.openid || ''
  if (device.isActive && oid && oid !== myOpenid) return ''
  if (device.isActive && oid === myOpenid) return ''
  if (!oid || oid === myOpenid) return pm
  return ''
}

async function activatePreRegistered(db, _, normalizedSn, productModel, myOpenid, deviceName, device) {
  const activation = buildActivationFields(productModel)
  const bindData = {
    ...activation,
    sn: normalizedSn,
    name: deviceName || normalizedSn,
    openid: myOpenid,
    lastBindTime: db.serverDate()
  }

  if (device && device._id) {
    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          sn: normalizedSn,
          openid: myOpenid,
          bindCount: _.inc(1),
          activations: _.inc(1),
          lastBindTime: db.serverDate()
        }
      })
    } else {
      await db.collection('sn').doc(device._id).update({ data: bindData })
    }
  } else {
    await db.collection('sn').add({
      data: { ...bindData, createTime: db.serverDate() }
    })
  }

  await applyPendingWarranty(db, _, myOpenid, normalizedSn)
  return {
    success: true,
    status: 'AUTO_APPROVED',
    msg: '绑定成功',
    fromPreRegister: true,
    productModel
  }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const normalizedSn = normalizeSn(event.sn)
  const { deviceName } = event

  try {
    if (!normalizedSn) {
      return { success: false, msg: 'SN 不能为空' }
    }
    const candidates = snCandidates(normalizedSn)

    const preReg = await findPreRegister(db, _, normalizedSn)
    const res = await db.collection('sn').where({ sn: _.in(candidates) }).get()
    const device = res.data.length > 0 ? res.data[0] : null

    if (device && device.deviceStatus === 'scrapped') {
      return { success: false, status: 'SCRAPPED', msg: '该设备已报废，无法连接' }
    }
    if (device && device.snLocked && device.snLockReason === 'replacement_pending') {
      return {
        success: false,
        status: 'LOCKED_REPLACEMENT',
        msg: '该设备正在售后换机中，请使用新设备'
      }
    }

    if (device && device.openid && device.openid !== '' && device.openid !== myOpenid) {
      return { success: false, status: 'LOCKED', msg: '设备已被绑定，请联系原主解绑' }
    }

    const productModel = resolvePreRegisterModel(preReg, device, myOpenid)
    if (productModel) {
      if (device && device.openid === myOpenid && device.isActive) {
        if (device.sn !== normalizedSn) {
          await db.collection('sn').doc(device._id).update({ data: { sn: normalizedSn } })
        }
        await applyPendingWarranty(db, _, myOpenid, normalizedSn)
        return { success: true, status: 'AUTO_APPROVED', msg: '设备已连接', fromPreRegister: true }
      }
      return await activatePreRegistered(db, _, normalizedSn, productModel, myOpenid, deviceName, device)
    }

    if (res.data.length === 0) {
      await db.collection('sn').add({
        data: {
          sn: normalizedSn,
          name: deviceName,
          openid: myOpenid,
          isActive: false,
          activations: 0,
          createTime: db.serverDate()
        }
      })
      return { success: true, status: 'NEED_AUDIT', msg: '新设备，请提交审核' }
    }

    if (device.openid === myOpenid) {
      if (device.isActive) {
        if (device.sn !== normalizedSn) {
          await db.collection('sn').doc(device._id).update({ data: { sn: normalizedSn } })
        }
        await applyPendingWarranty(db, _, myOpenid, normalizedSn)
        return { success: true, status: 'AUTO_APPROVED', msg: '设备已连接' }
      }
      return { success: true, status: 'NEED_AUDIT', msg: '审核未通过，请继续' }
    }

    if (device.openid && device.openid !== '') {
      return { success: false, status: 'LOCKED', msg: '设备已被绑定，请联系原主解绑' }
    }

    if (device.isActive) {
      const freshRes = await db.collection('sn').doc(device._id).get()
      const fresh = freshRes.data
      if (fresh && fresh.openid && fresh.openid !== '' && fresh.openid !== myOpenid) {
        return { success: false, status: 'LOCKED', msg: '设备已被绑定，请联系原主解绑' }
      }
      await db.collection('sn').doc(device._id).update({
        data: {
          sn: normalizedSn,
          openid: myOpenid,
          bindCount: _.inc(1),
          activations: _.inc(1),
          lastBindTime: db.serverDate()
        }
      })

      await applyPendingWarranty(db, _, myOpenid, normalizedSn)
      return { success: true, status: 'AUTO_APPROVED', msg: '绑定成功' }
    }

    const freshInactive = await db.collection('sn').doc(device._id).get()
    const freshDev = freshInactive.data
    if (freshDev && freshDev.openid && freshDev.openid !== '' && freshDev.openid !== myOpenid) {
      return { success: false, status: 'LOCKED', msg: '设备已被绑定，请联系原主解绑' }
    }
    await db.collection('sn').doc(device._id).update({ data: { openid: myOpenid, sn: normalizedSn } })
    return { success: true, status: 'NEED_AUDIT', msg: '请提交审核' }
  } catch (err) {
    console.error('[bindDevice] 云函数执行失败:', err)
    return { success: false, msg: err.message || err.errMsg || '网络校验失败，请重试' }
  }
}

async function applyPendingWarranty(db, _, openid, sn) {
  try {
    const pendingRes = await db.collection('pending_warranty')
      .where({
        openid: openid,
        status: 'pending'
      })
      .get()

    if (pendingRes.data.length === 0) {
      return
    }

    let totalDays = 0
    pendingRes.data.forEach(record => {
      totalDays += record.warrantyDays || 30
    })

    const devRes = await db.collection('sn').where({ sn: _.in(snCandidates(sn)) }).get()
    if (devRes.data.length > 0) {
      const device = devRes.data[0]
      const oldDate = device.expiryDate ? new Date(device.expiryDate) : new Date()
      const newDate = new Date(oldDate.getTime() + totalDays * 24 * 60 * 60 * 1000)
      const newDateStr = newDate.toISOString().split('T')[0]

      await db.collection('sn').doc(device._id).update({
        data: {
          expiryDate: newDateStr,
          hasReward: true,
          totalDays: _.inc(totalDays)
        }
      })
    }

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
  } catch (err) {
    console.error('[bindDevice] 应用待生效延保失败:', err)
  }
}
