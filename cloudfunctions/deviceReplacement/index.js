// 售后换机：诊断书/寄回备注检测、控制中心 SN 替换、报废设备拦截
const cloud = require('wx-server-sdk')
const { normalizeSn, snCandidates, needsReplacementByText } = require('./snUtils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function assertAdmin() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

async function getRepair(repairId) {
  if (!repairId) return null
  const doc = await db.collection('shouhou_repair').doc(repairId).get()
  return doc.data || null
}

async function findSnRecord(normalizedSn) {
  const res = await db.collection('sn').where({ sn: _.in(snCandidates(normalizedSn)) }).limit(1).get()
  return res.data[0] || null
}

async function resolveOldSnFromRepair(repair) {
  const fromDevice = repair && repair.device && repair.device.sn
  if (fromDevice) return normalizeSn(fromDevice)
  const userOpenid = repair._openid || repair.openid || ''
  if (!userOpenid) return ''
  const model = String(repair.model || (repair.device && repair.device.productModel) || '').trim()
  const query = { openid: userOpenid, isActive: true }
  if (model) query.productModel = model
  const snRes = await db.collection('sn').where(query).limit(1).get()
  if (snRes.data.length > 0) return normalizeSn(snRes.data[0].sn)
  const anyRes = await db.collection('sn').where({ openid: userOpenid, isActive: true }).limit(1).get()
  if (anyRes.data.length > 0) return normalizeSn(anyRes.data[0].sn)
  return ''
}

/** 诊断书或寄回备注命中主板/控制器 → 锁 SN + 待换机（幂等） */
async function applyReplacementLock(repairId, detectText, source) {
  if (!repairId) return { locked: false, reason: 'missing_repair_id' }

  const text = String(detectText || '').trim()
  if (!needsReplacementByText(text)) {
    return { locked: false, reason: 'no_keyword', source }
  }

  const repair = await getRepair(repairId)
  if (!repair) return { locked: false, reason: 'repair_not_found' }

  if (repair.awaitingSnReplacement === true && repair.replacementOldSn) {
    return {
      locked: true,
      already: true,
      oldSn: repair.replacementOldSn,
      repairId,
      source
    }
  }

  const oldSn = await resolveOldSnFromRepair(repair)
  if (!oldSn) {
    await db.collection('shouhou_repair').doc(repairId).update({
      data: {
        awaitingSnReplacement: true,
        replacementOldSn: '',
        replacementDetectSource: source || '',
        replacementDetectNote: '未找到用户 SN，请在控制中心手动选择工单',
        replacementDetectedAt: db.serverDate()
      }
    })
    return { locked: false, reason: 'sn_not_found', awaitingSnReplacement: true, source }
  }

  const oldDevice = await findSnRecord(oldSn)
  if (oldDevice && oldDevice._id) {
    await db.collection('sn').doc(oldDevice._id).update({
      data: {
        snLocked: true,
        snLockReason: 'replacement_pending',
        snLockRepairId: repairId,
        snLockTime: db.serverDate()
      }
    })
  }

  await db.collection('shouhou_repair').doc(repairId).update({
    data: {
      awaitingSnReplacement: true,
      replacementOldSn: oldSn,
      replacementUserOpenid: repair._openid || repair.openid || (oldDevice && oldDevice.openid) || '',
      replacementDetectSource: source || '',
      replacementDetectedAt: db.serverDate()
    }
  })

  return { locked: true, oldSn, repairId, source }
}

async function saveDiagnosis(repairId, adminDiagnosis, adminOpenid) {
  const text = String(adminDiagnosis || '').trim()
  if (!repairId) return { success: false, msg: '工单无效' }
  if (!text) return { success: false, msg: '请填写诊断内容' }

  const repair = await getRepair(repairId)
  if (!repair) return { success: false, msg: '工单不存在' }

  await db.collection('shouhou_repair').doc(repairId).update({
    data: {
      adminDiagnosis: text,
      diagnosisDone: true,
      diagnosisBy: adminOpenid,
      diagnosisAt: db.serverDate()
    }
  })

  const lockResult = await applyReplacementLock(repairId, text, 'diagnosis')
  return {
    success: true,
    msg: lockResult.locked ? '诊断已保存，已标记待换机' : '诊断已保存',
    needsReplacement: !!lockResult.locked || !!lockResult.awaitingSnReplacement,
    replacement: lockResult
  }
}

async function checkReturnNote(repairId, returnNote) {
  if (!repairId) return { success: false, msg: '工单无效' }
  const lockResult = await applyReplacementLock(repairId, returnNote, 'return_note')
  return {
    success: true,
    needsReplacement: !!lockResult.locked || !!lockResult.awaitingSnReplacement,
    replacement: lockResult
  }
}

async function checkCanShip(repairId) {
  const repair = await getRepair(repairId)
  if (!repair) return { success: false, canShip: false, msg: '工单不存在' }

  const hasDiagnosis = repair.diagnosisDone === true || String(repair.adminDiagnosis || '').trim()
  if (!hasDiagnosis) {
    return { success: true, canShip: false, msg: '请先填写诊断书' }
  }

  if (repair.awaitingSnReplacement === true) {
    return {
      success: true,
      canShip: false,
      msg: '该工单待换机，请维修专员先在控制中心完成 SN 更换'
    }
  }

  return { success: true, canShip: true }
}

async function listAwaitingReplacements() {
  const res = await db.collection('shouhou_repair')
    .where({ awaitingSnReplacement: true })
    .orderBy('createTime', 'desc')
    .limit(50)
    .get()
  return (res.data || []).map((item) => ({
    _id: item._id,
    model: item.model || '',
    description: item.description || '',
    replacementOldSn: item.replacementOldSn || (item.device && item.device.sn) || '',
    adminDiagnosis: item.adminDiagnosis || '',
    returnNote: item.returnNote || '',
    status: item.status || '',
    contact: item.contact || null,
    createTime: item.createTime || null
  }))
}

async function checkSnStatus(normalizedSn) {
  const device = await findSnRecord(normalizedSn)
  if (!device) return { ok: true, status: 'unknown' }
  if (device.deviceStatus === 'scrapped') {
    return { ok: false, status: 'SCRAPPED', msg: '该设备已报废，无法连接' }
  }
  if (device.snLocked && device.snLockReason === 'replacement_pending') {
    return {
      ok: false,
      status: 'LOCKED_REPLACEMENT',
      msg: '该设备正在售后换机中，请使用新设备'
    }
  }
  return { ok: true, status: device.deviceStatus || 'active' }
}

async function completeReplacement(repairId, newSnRaw, productModel, adminOpenid) {
  const newSn = normalizeSn(newSnRaw)
  if (!repairId || !newSn) {
    return { success: false, msg: '工单或 SN 无效' }
  }

  const repair = await getRepair(repairId)
  if (!repair) return { success: false, msg: '工单不存在' }
  if (!repair.awaitingSnReplacement) {
    return { success: false, msg: '该工单未标记为待换机' }
  }

  const userOpenid =
    repair.replacementUserOpenid ||
    repair._openid ||
    repair.openid ||
    ''
  if (!userOpenid) return { success: false, msg: '无法确定工单所属用户' }

  const oldSn = normalizeSn(repair.replacementOldSn || (repair.device && repair.device.sn) || '')
  const oldDevice = oldSn ? await findSnRecord(oldSn) : null
  const model =
    String(productModel || '').trim() ||
    (oldDevice && oldDevice.productModel) ||
    String(repair.model || '').trim() ||
    '未知型号'

  const inherit = {}
  if (oldDevice) {
    if (oldDevice.productModel) inherit.productModel = oldDevice.productModel
    if (oldDevice.firmware) inherit.firmware = oldDevice.firmware
    if (oldDevice.expiryDate) inherit.expiryDate = oldDevice.expiryDate
    if (oldDevice.totalDays != null) inherit.totalDays = oldDevice.totalDays
    if (oldDevice.remainingDays != null) inherit.remainingDays = oldDevice.remainingDays
    inherit.hasExtra = !!oldDevice.hasExtra
    inherit.hasReward = !!oldDevice.hasReward
    inherit.activations = oldDevice.activations || 1
    inherit.bindTime = oldDevice.bindTime || db.serverDate()
    if (oldDevice.imgReceipt) inherit.imgReceipt = oldDevice.imgReceipt
  }
  inherit.productModel = model

  const newExisting = await findSnRecord(newSn)
  if (newExisting && newExisting.openid && newExisting.openid !== userOpenid) {
    return { success: false, msg: '新 SN 已被其他用户绑定' }
  }

  const newPayload = {
    sn: newSn,
    name: newSn,
    openid: userOpenid,
    isActive: true,
    deviceStatus: 'active',
    snLocked: false,
    snLockReason: _.remove(),
    snLockRepairId: _.remove(),
    snLockTime: _.remove(),
    replacedFrom: oldSn || _.remove(),
    replacementRepairId: repairId,
    replacementCompletedAt: db.serverDate(),
    lastBindTime: db.serverDate(),
    preRegistered: true,
    ...inherit
  }

  if (newExisting && newExisting._id) {
    await db.collection('sn').doc(newExisting._id).update({ data: newPayload })
  } else {
    await db.collection('sn').add({
      data: { ...newPayload, createTime: db.serverDate() }
    })
  }

  if (oldDevice && oldDevice._id) {
    await db.collection('sn').doc(oldDevice._id).update({
      data: {
        openid: '',
        isActive: false,
        deviceStatus: 'scrapped',
        snLocked: false,
        snLockReason: _.remove(),
        snLockRepairId: _.remove(),
        scrappedAt: db.serverDate(),
        replacedBy: newSn,
        scrappedReason: 'after_sales_replacement'
      }
    })
  }

  try {
    const preReg = await db.collection('guanliyuanSN').where({ sn: _.in(snCandidates(newSn)) }).limit(1).get()
    const prePayload = {
      sn: newSn,
      productModel: model,
      registeredBy: adminOpenid,
      registeredAt: db.serverDate(),
      source: 'replacement_control_center'
    }
    if (preReg.data.length > 0) {
      await db.collection('guanliyuanSN').doc(preReg.data[0]._id).update({ data: prePayload })
    } else {
      await db.collection('guanliyuanSN').add({ data: prePayload })
    }
  } catch (e) {
    console.warn('[deviceReplacement] guanliyuanSN upsert failed', e)
  }

  await db.collection('shouhou_repair').doc(repairId).update({
    data: {
      awaitingSnReplacement: false,
      replacementNewSn: newSn,
      replacementCompletedAt: db.serverDate(),
      replacementCompletedBy: adminOpenid,
      device: {
        ...(repair.device || {}),
        sn: newSn,
        displaySn: newSn,
        productModel: model
      }
    }
  })

  return {
    success: true,
    msg: '换机完成',
    oldSn,
    newSn,
    userOpenid,
    productModel: model
  }
}

exports.main = async (event) => {
  const action = event.action || ''

  try {
    if (action === 'checkSn') {
      const normalizedSn = normalizeSn(event.sn)
      if (!normalizedSn) return { success: false, msg: 'SN 无效' }
      const status = await checkSnStatus(normalizedSn)
      return { success: true, ...status }
    }

    if (action === 'saveDiagnosis') {
      const adminOpenid = await assertAdmin()
      return await saveDiagnosis(
        event.repairId || event.id,
        event.adminDiagnosis || event.diagnosis,
        adminOpenid
      )
    }

    if (action === 'checkReturnNote') {
      await assertAdmin()
      return await checkReturnNote(event.repairId || event.id, event.returnNote || '')
    }

    if (action === 'checkCanShip') {
      await assertAdmin()
      return await checkCanShip(event.repairId || event.id)
    }

    if (action === 'listAwaiting') {
      await assertAdmin()
      const list = await listAwaitingReplacements()
      return { success: true, data: list }
    }

    if (action === 'complete') {
      const adminOpenid = await assertAdmin()
      return await completeReplacement(
        event.repairId || event.id,
        event.newSn || event.sn,
        event.productModel,
        adminOpenid
      )
    }

    return { success: false, msg: '未知操作' }
  } catch (err) {
    const msg = String((err && err.message) || err || '')
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, msg: '无管理员权限' }
    }
    console.error('[deviceReplacement]', err)
    return { success: false, msg: msg || '操作失败' }
  }
}

module.exports.applyReplacementLock = applyReplacementLock
module.exports.needsReplacementByText = needsReplacementByText
module.exports.normalizeSn = normalizeSn
module.exports.snCandidates = snCandidates
module.exports.checkCanShip = checkCanShip
