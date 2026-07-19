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

async function findFaultClaimDevice(userOpenid) {
  if (!userOpenid) return null
  const res = await db.collection('sn').where({
    openid: userOpenid,
    isActive: true,
    bindSource: 'fault_claim'
  }).limit(1).get()
  return res.data[0] || null
}

/** 诊断命中主板/控制器 → 故障核验档案升级为待录入 SN（A 方案） */
async function applyFaultSchemeA(userOpenid, repairId) {
  const device = await findFaultClaimDevice(userOpenid)
  if (!device || !device._id) return { applied: false, reason: 'no_fault_device' }

  const pendingSn = `PENDING-FAULT-${String(repairId || device.faultClaimId || device._id).slice(-8).toUpperCase()}`
  await db.collection('sn').doc(device._id).update({
    data: {
      sn: pendingSn,
      snPending: true,
      faultAwaitingDiagnosis: false,
      faultAutoBind: false,
      faultScheme: 'A',
      replacementRepairId: repairId || ''
    }
  })
  return { applied: true, scheme: 'A', pendingSn }
}

/** 诊断未命中主板/控制器 → B 方案：不出待录入卡，下次蓝牙连上自动写入 SN */
async function applyFaultSchemeB(userOpenid, repairId) {
  const device = await findFaultClaimDevice(userOpenid)
  if (!device || !device._id) return { applied: false, reason: 'no_fault_device' }

  await db.collection('sn').doc(device._id).update({
    data: {
      snPending: false,
      faultAwaitingDiagnosis: false,
      faultAutoBind: true,
      faultScheme: 'B',
      replacementRepairId: repairId || ''
    }
  })
  return { applied: true, scheme: 'B' }
}

async function syncFaultClaimAfterDiagnosis(repairId, adminDiagnosis) {
  const repair = await getRepair(repairId)
  if (!repair) return { synced: false, reason: 'repair_not_found' }

  const userOpenid = String(
    repair.replacementUserOpenid || repair._openid || repair.openid || ''
  ).trim()
  if (!userOpenid) return { synced: false, reason: 'no_user' }

  const faultDevice = await findFaultClaimDevice(userOpenid)
  if (!faultDevice) return { synced: false, reason: 'no_fault_device' }

  const needsBoard = needsReplacementByText(adminDiagnosis)
  if (needsBoard) {
    const scheme = await applyFaultSchemeA(userOpenid, repairId)
    return { synced: true, ...scheme, needsBoard: true }
  }

  const scheme = await applyFaultSchemeB(userOpenid, repairId)
  return { synced: true, ...scheme, needsBoard: false }
}

async function saveDiagnosis(repairId, adminDiagnosis, adminOpenid) {
  const text = String(adminDiagnosis || '').trim()
  if (!repairId) return { success: false, msg: '工单无效' }
  if (!text) return { success: false, msg: '请填写诊断内容' }

  const repair = await getRepair(repairId)
  if (!repair) return { success: false, msg: '工单不存在' }

  // 诊断完成后进入「管理员已审核，待发出设备」；后续录单/教程/寄回等会再改状态
  const st = String(repair.status || '').trim().toUpperCase()
  const keepTerminal = ['SHIPPED', 'TUTORIAL', 'USER_SENT', 'REPAIR_COMPLETED_SENT', 'RETURN_RECEIVED', 'COMPLETED', 'DELETED', 'CANCELLED'].includes(st)
  const patch = {
    adminDiagnosis: text,
    diagnosisDone: true,
    diagnosisBy: adminOpenid,
    diagnosisAt: db.serverDate()
  }
  // 旧逻辑只要备注出现“主板/控制器”就自动标记待换机，容易把“检查主板”误判成换主板。
  // 非管理员明确点击产生的旧标记在再次保存诊断时清理。
  if (
    repair.awaitingSnReplacement === true &&
    repair.replacementDetectSource !== 'manual_board_replacement'
  ) {
    patch.awaitingSnReplacement = false
    patch.replacementDetectNote = _.remove()
  }
  if (!keepTerminal) {
    patch.status = 'ADMIN_REVIEWED'
  }
  await db.collection('shouhou_repair').doc(repairId).update({ data: patch })

  // 普通维修不再根据文字自动判定换主板；故障核验 A/B 方案仍由下方逻辑处理。
  const lockResult = { locked: false, awaitingSnReplacement: false, reason: 'manual_confirmation_required' }
  const faultSync = await syncFaultClaimAfterDiagnosis(repairId, text)

  let msg = lockResult.locked
    ? '诊断已保存，已标记待换机'
    : '诊断已保存'
  if (faultSync.synced && faultSync.scheme === 'A') {
    msg = '诊断已保存：判定主板/控制器故障，用户档案已转为待录入 SN'
  } else if (faultSync.synced && faultSync.scheme === 'B') {
    msg = '诊断已保存：非主板/控制器故障，用户下次蓝牙连接将自动绑定到设备卡'
  }

  const needsBoard = !!(
    lockResult.locked ||
    lockResult.awaitingSnReplacement ||
    (faultSync && faultSync.scheme === 'A') ||
    /主板|控制器/.test(text)
  )

  // 企业微信：每次保存诊断都推（失败不影响保存结果）
  let wecomNotify = null
  try {
    wecomNotify = await cloud.callFunction({
      name: 'wecomNotify',
      data: {
        action: 'notifyDiagnosis',
        repairId,
        adminDiagnosis: text,
        needsBoard,
        repairSnapshot: {
          ...repair,
          adminDiagnosis: text,
          diagnosisDone: true,
          status: keepTerminal ? repair.status : 'ADMIN_REVIEWED'
        }
      }
    })
  } catch (e) {
    console.warn('[deviceReplacement] wecomNotify diagnosis failed', e)
    wecomNotify = { err: (e && e.message) || String(e) }
  }

  return {
    success: true,
    msg,
    needsReplacement: !!lockResult.locked || !!lockResult.awaitingSnReplacement,
    replacement: lockResult,
    faultSync,
    wecomNotify: (wecomNotify && wecomNotify.result) || wecomNotify
  }
}

async function checkReturnNote(repairId, returnNote) {
  if (!repairId) return { success: false, msg: '工单无效' }
  const repair = await getRepair(repairId)
  if (!repair) return { success: false, msg: '工单不存在' }
  // 寄回备注提到“主板/控制器”只代表检查/维修内容，不再自动进入换主板流程。
  if (
    repair.awaitingSnReplacement === true &&
    repair.replacementDetectSource !== 'manual_board_replacement'
  ) {
    await db.collection('shouhou_repair').doc(repairId).update({
      data: {
        awaitingSnReplacement: false,
        replacementDetectNote: _.remove()
      }
    })
  }
  const lockResult = { locked: false, awaitingSnReplacement: false, reason: 'manual_confirmation_required' }
  return {
    success: true,
    needsReplacement: !!lockResult.locked || !!lockResult.awaitingSnReplacement,
    replacement: lockResult
  }
}

/** 寄回维修完成后，管理员明确选择“更换主板”并进入蓝牙录入流程 */
async function startMotherboardReplacement(repairId) {
  if (!repairId) return { success: false, msg: '工单无效' }
  const repair = await getRepair(repairId)
  if (!repair) return { success: false, msg: '工单不存在' }
  if (repair.returnStatus !== 'PENDING_RETURN') {
    return { success: false, msg: '只有寄回维修的工单可以使用更换主板功能' }
  }
  if (repair.replacementNewSn && repair.awaitingSnReplacement !== true) {
    return {
      success: true,
      alreadyCompleted: true,
      msg: `该工单已完成主板更换：${repair.replacementNewSn}`,
      repairId,
      newSn: repair.replacementNewSn
    }
  }

  const result = await applyReplacementLock(repairId, '更换主板', 'manual_board_replacement')
  if (!result.locked && !result.awaitingSnReplacement) {
    return { success: false, msg: '未找到用户当前设备 SN，无法开始更换主板' }
  }
  // applyReplacementLock 对历史待换机记录会幂等返回，需显式升级为管理员确认的主板更换。
  await db.collection('shouhou_repair').doc(repairId).update({
    data: {
      awaitingSnReplacement: true,
      replacementDetectSource: 'manual_board_replacement',
      motherboardReplacementConfirmedAt: db.serverDate()
    }
  })
  const confirmedOldSn = normalizeSn(result.oldSn || repair.replacementOldSn || '')
  if (confirmedOldSn) {
    const oldDevice = await findSnRecord(confirmedOldSn)
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
  }
  return {
    success: true,
    msg: '已进入更换主板流程，请连接新主板蓝牙',
    repairId,
    oldSn: confirmedOldSn || result.oldSn || repair.replacementOldSn || ''
  }
}

async function checkCanShip(repairId) {
  const repair = await getRepair(repairId)
  if (!repair) return { success: false, canShip: false, msg: '工单不存在' }

  const hasDiagnosis = repair.diagnosisDone === true || String(repair.adminDiagnosis || '').trim()
  if (!hasDiagnosis) {
    return { success: true, canShip: false, msg: '请先填写诊断书' }
  }

  if (
    repair.awaitingSnReplacement === true &&
    repair.replacementDetectSource === 'manual_board_replacement'
  ) {
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
    replacementNewSn: item.replacementNewSn || '',
    replacementDetectSource: item.replacementDetectSource || '',
    replacementUserOpenid: item.replacementUserOpenid || item._openid || item.openid || '',
    adminDiagnosis: item.adminDiagnosis || '',
    returnNote: item.returnNote || '',
    status: item.status || '',
    returnStatus: item.returnStatus || '',
    contact: item.contact || null,
    createTime: item.createTime || null
  }))
}

/** 清理旧逻辑误标的待换机/误锁（仅保留管理员「更换主板」产生的） */
async function cleanupStaleReplacements() {
  await assertAdmin()

  const repairRes = await db.collection('shouhou_repair')
    .where({ awaitingSnReplacement: true })
    .limit(100)
    .get()
    .catch(() => ({ data: [] }))

  const staleRepairs = (repairRes.data || []).filter(
    (repair) => String(repair.replacementDetectSource || '').trim() !== 'manual_board_replacement'
  )

  let clearedRepairs = 0
  for (let i = 0; i < staleRepairs.length; i++) {
    const repair = staleRepairs[i]
    try {
      await db.collection('shouhou_repair').doc(repair._id).update({
        data: {
          awaitingSnReplacement: false,
          replacementDetectNote: _.remove(),
          replacementStaleClearedAt: db.serverDate(),
          replacementStaleClearedFrom: String(repair.replacementDetectSource || 'unknown')
        }
      })
      clearedRepairs += 1
    } catch (e) {
      console.warn('[deviceReplacement] clear stale repair failed', repair._id, e)
    }
  }

  const lockedRes = await db.collection('sn')
    .where({ snLocked: true, snLockReason: 'replacement_pending' })
    .limit(100)
    .get()
    .catch(() => ({ data: [] }))

  let unlockedDevices = 0
  for (let i = 0; i < (lockedRes.data || []).length; i++) {
    const device = lockedRes.data[i]
    const repairId = String(device.snLockRepairId || '').trim()
    let keepLock = false
    if (repairId) {
      try {
        const repair = await getRepair(repairId)
        keepLock = !!(
          repair &&
          repair.awaitingSnReplacement === true &&
          String(repair.replacementDetectSource || '').trim() === 'manual_board_replacement'
        )
      } catch (e) {
        keepLock = false
      }
    }
    if (keepLock) continue
    try {
      await db.collection('sn').doc(device._id).update({
        data: {
          snLocked: false,
          snLockReason: _.remove(),
          snLockRepairId: _.remove(),
          snLockTime: _.remove()
        }
      })
      unlockedDevices += 1
    } catch (e) {
      console.warn('[deviceReplacement] unlock stale sn failed', device._id, e)
    }
  }

  return {
    success: true,
    clearedRepairs,
    unlockedDevices,
    staleRepairIds: staleRepairs.map((r) => r._id)
  }
}

/** 管理员调试：控制中心相关换机/待录入全量快照 */
async function debugControlCenterDump(options = {}) {
  const autoClean = options.autoClean !== false
  let cleanup = null
  if (autoClean) {
    cleanup = await cleanupStaleReplacements()
  } else {
    await assertAdmin()
  }

  const [repairRes, pendingSnRes, lockedSnRes] = await Promise.all([
    db.collection('shouhou_repair')
      .where({ awaitingSnReplacement: true })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()
      .catch(() => ({ data: [] })),
    db.collection('sn')
      .where({ isActive: true, snPending: true })
      .limit(100)
      .get()
      .catch(() => ({ data: [] })),
    db.collection('sn')
      .where({ snLocked: true, snLockReason: 'replacement_pending' })
      .limit(100)
      .get()
      .catch(() => ({ data: [] }))
  ])

  const repairs = repairRes.data || []
  const pendingSn = pendingSnRes.data || []
  const lockedSn = lockedSnRes.data || []

  const openids = [
    ...new Set(
      [
        ...repairs.map((r) => r.replacementUserOpenid || r._openid || r.openid || ''),
        ...pendingSn.map((d) => d.openid || d.userOpenid || d._openid || ''),
        ...lockedSn.map((d) => d.openid || d.userOpenid || d._openid || '')
      ]
        .map((x) => String(x || '').trim())
        .filter(Boolean)
    )
  ]

  const nickMap = {}
  for (let i = 0; i < openids.length; i += 20) {
    const batch = openids.slice(i, i + 20)
    try {
      const userRes = await db.collection('user_list').where({ _openid: _.in(batch) }).get()
      ;(userRes.data || []).forEach((row) => {
        const oid = row._openid || row.openid || ''
        if (oid) nickMap[oid] = row.nickName || row.nickname || ''
      })
    } catch (e) {
      console.warn('[deviceReplacement] debug nick failed', e)
    }
  }

  const fmtTime = (t) => {
    if (!t) return ''
    try {
      const d = t instanceof Date ? t : new Date(t)
      if (Number.isNaN(d.getTime())) return String(t)
      const p = (n) => (n < 10 ? `0${n}` : `${n}`)
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    } catch (e) {
      return String(t)
    }
  }

  const mapRepair = (item) => {
    const oid = String(item.replacementUserOpenid || item._openid || item.openid || '').trim()
    const source = String(item.replacementDetectSource || '').trim() || '(空/旧逻辑)'
    const visibleInCenter = source === 'manual_board_replacement'
    return {
      repairId: item._id,
      model: item.model || '',
      nick: nickMap[oid] || '',
      openidTail: oid ? oid.slice(-8) : '',
      openid: oid,
      oldSn: item.replacementOldSn || (item.device && item.device.sn) || '',
      newSn: item.replacementNewSn || '',
      source,
      visibleInCenter,
      status: item.status || '',
      returnStatus: item.returnStatus || '',
      diagnosis: String(item.adminDiagnosis || '').slice(0, 80),
      returnNote: String(item.returnNote || '').slice(0, 80),
      createTime: fmtTime(item.createTime)
    }
  }

  const mapDevice = (item) => {
    const oid = String(item.openid || item.userOpenid || item._openid || '').trim()
    return {
      deviceId: item._id,
      sn: item.sn || '',
      model: item.productModel || '',
      nick: nickMap[oid] || '',
      openidTail: oid ? oid.slice(-8) : '',
      openid: oid,
      snPending: !!item.snPending,
      snLocked: !!item.snLocked,
      snLockReason: item.snLockReason || '',
      snLockRepairId: item.snLockRepairId || '',
      replacementRepairId: item.replacementRepairId || '',
      deviceStatus: item.deviceStatus || ''
    }
  }

  const awaitingRepairs = repairs.map(mapRepair)
  const controlCenterVisible = awaitingRepairs.filter((r) => r.visibleInCenter)
  const legacyAwaiting = awaitingRepairs.filter((r) => !r.visibleInCenter)
  const pendingDevices = pendingSn.map(mapDevice)
  const lockedDevices = lockedSn.map(mapDevice)

  return {
    success: true,
    cleanup,
    summary: {
      awaitingTotal: awaitingRepairs.length,
      controlCenterVisible: controlCenterVisible.length,
      legacyAwaiting: legacyAwaiting.length,
      snPending: pendingDevices.length,
      snLocked: lockedDevices.length,
      clearedRepairs: cleanup ? cleanup.clearedRepairs : 0,
      unlockedDevices: cleanup ? cleanup.unlockedDevices : 0
    },
    controlCenterVisible,
    legacyAwaiting,
    pendingDevices,
    lockedDevices
  }
}

async function checkSnStatus(normalizedSn) {
  const device = await findSnRecord(normalizedSn)
  if (!device) return { ok: true, status: 'unknown' }
  if (device.deviceStatus === 'scrapped') {
    return { ok: false, status: 'SCRAPPED', msg: '该设备已报废，无法连接' }
  }
  if (device.snLocked && device.snLockReason === 'replacement_pending') {
    const lockRepairId = String(device.snLockRepairId || '').trim()
    let explicitlyConfirmed = false
    if (lockRepairId) {
      try {
        const repair = await getRepair(lockRepairId)
        explicitlyConfirmed = !!(
          repair &&
          repair.awaitingSnReplacement === true &&
          repair.replacementDetectSource === 'manual_board_replacement'
        )
      } catch (e) {
        console.warn('[deviceReplacement] validate replacement lock failed', e)
      }
    }
    if (!explicitlyConfirmed) {
      // 清理旧版“备注提到主板就自动锁 SN”产生的误锁。
      await db.collection('sn').doc(device._id).update({
        data: {
          snLocked: false,
          snLockReason: _.remove(),
          snLockRepairId: _.remove(),
          snLockTime: _.remove()
        }
      })
      return { ok: true, status: device.deviceStatus || 'active', staleLockCleared: true }
    }
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

  // 写入后回读核对：新 SN 是否真的挂到了用户名下
  let verified = false
  let verifyDetail = ''
  try {
    const checkRes = await db.collection('sn').where({ sn: _.in(snCandidates(newSn)) }).limit(1).get()
    const rec = checkRes.data[0] || null
    if (rec && rec.openid === userOpenid && rec.isActive === true) {
      verified = true
      verifyDetail = `已核对：${newSn} 已绑定到用户名下，质保到期 ${rec.expiryDate || '未设置'}`
    } else if (rec) {
      verifyDetail = `警告：${newSn} 已写入，但绑定状态异常（openid ${rec.openid === userOpenid ? '正确' : '不符'}，isActive ${rec.isActive}）`
    } else {
      verifyDetail = `警告：写入后未查到 ${newSn} 的档案，请手动核查`
    }
  } catch (e) {
    console.warn('[deviceReplacement] verify after complete failed', e)
    verifyDetail = '写入完成，但回读核对失败（网络问题），请手动核查'
  }

  return {
    success: true,
    msg: '换机完成',
    oldSn,
    newSn,
    userOpenid,
    productModel: model,
    replacementKind:
      repair.replacementDetectSource === 'manual_board_replacement'
        ? 'motherboard'
        : 'device',
    verified,
    verifyDetail
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

    if (action === 'startMotherboardReplacement') {
      await assertAdmin()
      return await startMotherboardReplacement(event.repairId || event.id)
    }

    if (action === 'checkCanShip') {
      await assertAdmin()
      return await checkCanShip(event.repairId || event.id)
    }

    if (action === 'listAwaiting') {
      await cleanupStaleReplacements()
      const list = await listAwaitingReplacements()
      // 列表也只返回真正「手动换主板」的，避免旧残留干扰
      return {
        success: true,
        data: (list || []).filter(
          (item) => String(item.replacementDetectSource || '').trim() === 'manual_board_replacement'
        )
      }
    }

    if (action === 'cleanupStale') {
      return await cleanupStaleReplacements()
    }

    if (action === 'debugDump') {
      return await debugControlCenterDump({ autoClean: event.autoClean !== false })
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
