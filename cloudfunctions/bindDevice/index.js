// cloudfunctions/bindDevice/index.js

const cloud = require('wx-server-sdk')
const {
  normalizeSn,
  snCandidates,
  buildActivationFields,
  warrantyDaysForModel
} = require('./snUtils')

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

/** 解析云库日期字段为 Date；无效则返回 null */
function toValidDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'object' && value.$date != null) {
    const d = new Date(value.$date)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/**
 * 质保起算日（不允许用「当天」兜底）：
 * 1) 本次激活前已有普通用户蓝牙连接记录 firstBleConnectAt → 按首次连蓝牙日
 * 2) 否则若有管理员录入日 registeredAt → 按管理员录入日
 * 3) 都没有 → null（走 NEED_AUDIT）
 *
 * 注意：本函数只用「激活前已存在」的 firstBleConnectAt；
 * 本次连接刚写下的连接时间不参与起算，避免「第一次连就激活」误当成已连过。
 */
function resolveWarrantyBaseDate(preReg, priorBleConnectAt) {
  if (priorBleConnectAt) return priorBleConnectAt
  return toValidDate(preReg && preReg.registeredAt) || null
}

async function isAdminOpenid(db, openid) {
  if (!openid) return false
  try {
    const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
    if (byOpenid.data && byOpenid.data.length > 0) return true
    const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
    return !!(bySystemOpenid.data && bySystemOpenid.data.length > 0)
  } catch (err) {
    console.warn('[bindDevice] isAdminOpenid failed', err)
    return false
  }
}

function formatYmdLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysLocal(d, days) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + Number(days || 0))
  return x
}

function remainingDaysFromExpiry(expiryDateObj) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const exp = new Date(
    expiryDateObj.getFullYear(),
    expiryDateObj.getMonth(),
    expiryDateObj.getDate()
  )
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000)
}

/**
 * 普通用户连蓝牙时打点：只记第一次，不覆盖。
 * 管理员连接不打点。
 */
async function stampFirstBleConnectAt(db, _, {
  callerIsAdmin,
  device,
  normalizedSn,
  myOpenid,
  deviceName,
  extra = {}
}) {
  if (callerIsAdmin) return device
  if (device && toValidDate(device.firstBleConnectAt)) {
    if (Object.keys(extra).length === 0) return device
    await db.collection('sn').doc(device._id).update({ data: extra })
    return { ...device, ...extra }
  }

  const stamp = {
    firstBleConnectAt: db.serverDate(),
    firstBleConnectBy: myOpenid,
    ...extra
  }

  if (device && device._id) {
    await db.collection('sn').doc(device._id).update({
      data: {
        sn: normalizedSn,
        ...stamp
      }
    })
    return { ...device, sn: normalizedSn, ...stamp, firstBleConnectAt: new Date() }
  }

  const addRes = await db.collection('sn').add({
    data: {
      sn: normalizedSn,
      name: deviceName || normalizedSn,
      openid: myOpenid,
      isActive: false,
      activations: 0,
      createTime: db.serverDate(),
      ...stamp
    }
  })
  return {
    _id: addRes._id,
    sn: normalizedSn,
    name: deviceName || normalizedSn,
    openid: myOpenid,
    isActive: false,
    activations: 0,
    firstBleConnectAt: new Date(),
    firstBleConnectBy: myOpenid,
    ...extra
  }
}

/** 无管理员录入日、也无历史蓝牙连接：走上传截图审核 */
async function prepareNeedAudit(db, normalizedSn, myOpenid, deviceName, device, callerIsAdmin) {
  await stampFirstBleConnectAt(db, null, {
    callerIsAdmin,
    device,
    normalizedSn,
    myOpenid,
    deviceName,
    extra: {
      openid: myOpenid,
      name: deviceName || (device && device.name) || normalizedSn
    }
  })
  // 管理员调用且库里还没有档案时，stamp 不会建档，这里补一条
  if (callerIsAdmin && !(device && device._id)) {
    await db.collection('sn').add({
      data: {
        sn: normalizedSn,
        name: deviceName || normalizedSn,
        openid: myOpenid,
        isActive: false,
        activations: 0,
        createTime: db.serverDate()
      }
    })
  }
  return {
    success: true,
    status: 'NEED_AUDIT',
    msg: '新设备，请提交审核'
  }
}

async function activatePreRegistered(
  db,
  _,
  normalizedSn,
  productModel,
  myOpenid,
  deviceName,
  device,
  preReg,
  priorBleConnectAt,
  callerIsAdmin
) {
  // 已激活过：后续连接只更新绑定信息，不重算质保；仍补记首次蓝牙连接
  if (device && device._id && device.isActive) {
    await stampFirstBleConnectAt(db, _, {
      callerIsAdmin,
      device,
      normalizedSn,
      myOpenid,
      deviceName,
      extra: {
        sn: normalizedSn,
        openid: myOpenid,
        bindCount: _.inc(1),
        activations: _.inc(1),
        lastBindTime: db.serverDate()
      }
    })
    await applyPendingWarranty(db, _, myOpenid, normalizedSn)
    return {
      success: true,
      status: 'AUTO_APPROVED',
      msg: '绑定成功',
      fromPreRegister: true,
      productModel
    }
  }

  const baseDate = resolveWarrantyBaseDate(preReg, priorBleConnectAt)
  if (!baseDate) {
    return await prepareNeedAudit(db, normalizedSn, myOpenid, deviceName, device, callerIsAdmin)
  }

  const activation = buildActivationFields(productModel, baseDate)
  const totalDays = warrantyDaysForModel(productModel)
  const expiryDateObj = addDaysLocal(baseDate, totalDays)
  const expiryDate = formatYmdLocal(expiryDateObj)
  const remainingRaw = remainingDaysFromExpiry(expiryDateObj)
  const bindData = {
    productModel: activation.productModel,
    firmware: activation.firmwareVer,
    expiryDate,
    remainingDays: remainingRaw > 0 ? remainingRaw : 0,
    totalDays,
    bindTime: baseDate,
    sn: normalizedSn,
    name: deviceName || normalizedSn,
    openid: myOpenid,
    isActive: true,
    activations: 1,
    bindCount: 1,
    preRegistered: false,
    snPending: false,
    lastBindTime: db.serverDate(),
    warrantyBaseSource: priorBleConnectAt ? 'first_ble_connect' : 'admin_registered_at'
  }

  if (!callerIsAdmin && !priorBleConnectAt) {
    // 第一次连蓝牙就激活：质保按管理员录入日，同时记下本次为首次蓝牙连接
    bindData.firstBleConnectAt = db.serverDate()
    bindData.firstBleConnectBy = myOpenid
  } else if (priorBleConnectAt) {
    bindData.firstBleConnectAt = priorBleConnectAt
  }

  if (device && device._id) {
    await db.collection('sn').doc(device._id).update({ data: bindData })
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
    productModel,
    warrantyBaseSource: bindData.warrantyBaseSource
  }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID

  try {
    const normalizedSn = normalizeSn(event.sn)
    const { deviceName } = event

    if (!normalizedSn) {
      return { success: false, msg: 'SN 不能为空' }
    }

    const callerIsAdmin = await isAdminOpenid(db, myOpenid)

    const pendingBlock = await db.collection('sn').where({
      openid: myOpenid,
      isActive: true,
      snPending: true
    }).limit(1).get()
    if (pendingBlock.data.length > 0) {
      return {
        success: false,
        status: 'FAULT_PENDING_BLOCK',
        msg: '您已有待录入的故障设备档案，请联系售后录入新设备序列号'
      }
    }

    // B 方案：故障核验档案已确认非主板故障，下次连接自动写入真实 SN
    const faultAutoBindRes = await db.collection('sn').where({
      openid: myOpenid,
      isActive: true,
      bindSource: 'fault_claim',
      faultAutoBind: true
    }).limit(1).get()
    if (faultAutoBindRes.data.length > 0) {
      const card = faultAutoBindRes.data[0]
      await stampFirstBleConnectAt(db, _, {
        callerIsAdmin,
        device: card,
        normalizedSn,
        myOpenid,
        deviceName,
        extra: {
          sn: normalizedSn,
          name: deviceName || normalizedSn,
          faultAutoBind: false,
          faultAwaitingDiagnosis: false,
          isActive: true,
          activations: _.inc(1),
          lastBindTime: db.serverDate()
        }
      })
      await applyPendingWarranty(db, _, myOpenid, normalizedSn)
      return {
        success: true,
        status: 'AUTO_APPROVED',
        msg: '设备已连接并绑定到档案',
        fromFaultAutoBind: true
      }
    }

    const candidates = snCandidates(normalizedSn)

    const preReg = await findPreRegister(db, _, normalizedSn)
    const res = await db.collection('sn').where({ sn: _.in(candidates) }).get()
    let device = res.data.length > 0 ? res.data[0] : null
    // 激活前已存在的首次蓝牙连接（不含本次刚连）
    const priorBleConnectAt = callerIsAdmin ? null : toValidDate(device && device.firstBleConnectAt)

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
        await stampFirstBleConnectAt(db, _, {
          callerIsAdmin,
          device,
          normalizedSn,
          myOpenid,
          deviceName,
          extra: device.sn !== normalizedSn ? { sn: normalizedSn } : {}
        })
        await applyPendingWarranty(db, _, myOpenid, normalizedSn)
        return { success: true, status: 'AUTO_APPROVED', msg: '设备已连接', fromPreRegister: true }
      }
      return await activatePreRegistered(
        db,
        _,
        normalizedSn,
        productModel,
        myOpenid,
        deviceName,
        device,
        preReg,
        priorBleConnectAt,
        callerIsAdmin
      )
    }

    if (res.data.length === 0) {
      await stampFirstBleConnectAt(db, _, {
        callerIsAdmin,
        device: null,
        normalizedSn,
        myOpenid,
        deviceName,
        extra: {}
      })
      // 管理员连且无档案时仍建一条待审
      if (callerIsAdmin) {
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
      }
      return { success: true, status: 'NEED_AUDIT', msg: '新设备，请提交审核' }
    }

    if (device.openid === myOpenid) {
      if (device.isActive) {
        await stampFirstBleConnectAt(db, _, {
          callerIsAdmin,
          device,
          normalizedSn,
          myOpenid,
          deviceName,
          extra: device.sn !== normalizedSn ? { sn: normalizedSn } : {}
        })
        await applyPendingWarranty(db, _, myOpenid, normalizedSn)
        return { success: true, status: 'AUTO_APPROVED', msg: '设备已连接' }
      }
      await stampFirstBleConnectAt(db, _, {
        callerIsAdmin,
        device,
        normalizedSn,
        myOpenid,
        deviceName
      })
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
      await stampFirstBleConnectAt(db, _, {
        callerIsAdmin,
        device: fresh || device,
        normalizedSn,
        myOpenid,
        deviceName,
        extra: {
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
    await stampFirstBleConnectAt(db, _, {
      callerIsAdmin,
      device: freshDev || device,
      normalizedSn,
      myOpenid,
      deviceName,
      extra: { openid: myOpenid, sn: normalizedSn }
    })
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
