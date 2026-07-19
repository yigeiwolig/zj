// 云函数：管理员维修单查询/更新（客户端 shouhou_repair 仅允许本人读写）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const SERVER_DATE_FLAG = '__SERVER_DATE__'
/** 录单备件且勾选需要寄回：约 3 天后提醒用户寄回故障件 */
const USER_RETURN_REMIND_DELAY_MS = 3 * 24 * 60 * 60 * 1000

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

function normalizePatch(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const patch = { ...raw }
  delete patch._id
  delete patch._openid
  delete patch.openid
  Object.keys(patch).forEach((key) => {
    if (patch[key] === SERVER_DATE_FLAG || (patch[key] === true && /Time$/.test(key))) {
      patch[key] = db.serverDate()
    }
  })
  return patch
}

function filterPendingRepairs(items) {
  return (items || []).filter((item) => {
    if (!item || item.deletedByAdmin || item.isDeleted) return false
    const st = String(item.status || '').toUpperCase()
    if (st === 'DELETED' || st === 'CANCELLED') return false
    if (item.needPurchaseParts === true) return false
    if (item.purchasePartsStatus === 'completed') return false
    return true
  })
}

function isWarrantyDeductedRecord(item) {
  return !!(item && (item.warrantyDeducted === true || item.isWarrantyDeducted === true))
}

/** 用户是否曾被扣过质保（任一历史维修单） */
async function findOpenidsWithWarrantyDeduction(openids) {
  const set = new Set()
  const ids = [...new Set((openids || []).filter(Boolean))]
  const chunkSize = 20
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    try {
      const res = await db.collection('shouhou_repair')
        .where({
          _openid: _.in(chunk),
          warrantyDeducted: true
        })
        .field({ _openid: true })
        .limit(1000)
        .get()
      ;(res.data || []).forEach((row) => {
        if (row && row._openid) set.add(row._openid)
      })
    } catch (e) {
      console.warn('[adminUpdateRepair] findOpenidsWithWarrantyDeduction failed:', e)
    }
    // 兼容旧字段 isWarrantyDeducted
    try {
      const res2 = await db.collection('shouhou_repair')
        .where({
          _openid: _.in(chunk),
          isWarrantyDeducted: true
        })
        .field({ _openid: true })
        .limit(1000)
        .get()
      ;(res2.data || []).forEach((row) => {
        if (row && row._openid) set.add(row._openid)
      })
    } catch (e) { /* ignore */ }
  }
  return set
}

async function assertNoPriorWarrantyDeduction(repairDoc) {
  const openid = repairDoc && repairDoc._openid
  if (!openid) return
  if (isWarrantyDeductedRecord(repairDoc)) {
    throw new Error('该用户曾被扣质保，仅可要求寄回维修，无法录单备件或免费处理')
  }
  const deducted = await findOpenidsWithWarrantyDeduction([openid])
  if (deducted.has(openid)) {
    throw new Error('该用户曾被扣质保，仅可要求寄回维修，无法录单备件或免费处理')
  }
}

async function enrichPendingWithWarrantyDeduction(items) {
  const list = items || []
  const deducted = await findOpenidsWithWarrantyDeduction(list.map((i) => i && i._openid))
  return list.map((item) => ({
    ...item,
    hadWarrantyDeducted: isWarrantyDeductedRecord(item) || !!(item && item._openid && deducted.has(item._openid))
  }))
}

const PAID_ORDER_STATUSES = ['PAID', 'SHIPPED', 'SIGNED', 'COMPLETED']

/** 待处理报修卡允许删除；已付钱 / 已寄出 / 已完成换机 禁止 */
function assertRepairDeletable(repair) {
  if (!repair) throw new Error('维修单不存在')
  const status = String(repair.status || '').toUpperCase()
  if (status && status !== 'PENDING' && status !== 'ADMIN_REVIEWED') {
    throw new Error('仅「待处理报修 / 已诊断待发出」状态的工单可删除（已寄出/已处理不可删）')
  }
  if (repair.repairPaid === true || repair.feePaid === true) {
    throw new Error('该工单已关联付款，不可删除')
  }
  if (repair.replacementNewSn || repair.replacementCompleted === true) {
    throw new Error('该工单已完成换机，不可删除')
  }
  if (repair.returnStatus === 'USER_SENT' || status === 'USER_SENT') {
    throw new Error('用户已寄出快递，不可删除')
  }
  if (repair.returnCompleted === true || status === 'RETURN_RECEIVED') {
    throw new Error('寄回流程已推进，不可删除')
  }
  if (String(repair.trackingId || '').trim()) {
    throw new Error('已录单/已填运单号，不可删除')
  }
  return true
}

async function unlockOneSnDoc(row, unlocked, seen) {
  if (!row || !row._id || seen.has(row._id)) return
  seen.add(row._id)
  await db.collection('sn').doc(row._id).update({
    data: {
      snLocked: false,
      snLockReason: _.remove(),
      snLockRepairId: _.remove(),
      snLockTime: _.remove()
    }
  })
  unlocked.push(row.sn || row._id)
}

async function unlockSnLocksForRepair(repairId, repair) {
  const unlocked = []
  const seen = new Set()
  try {
    const res = await db.collection('sn')
      .where({ snLockRepairId: String(repairId) })
      .limit(50)
      .get()
    for (const row of res.data || []) {
      try {
        await unlockOneSnDoc(row, unlocked, seen)
      } catch (e) {
        console.warn('[adminUpdateRepair] unlock by repairId failed', row && row._id, e)
      }
    }
  } catch (e) {
    console.warn('[adminUpdateRepair] unlockSnLocksForRepair query failed:', e)
  }

  // 兜底：按诊断换机锁定的旧 SN 再解一次
  const oldSn = String((repair && repair.replacementOldSn) || '').trim()
  if (oldSn) {
    try {
      const snRes = await db.collection('sn').where({ sn: oldSn }).limit(5).get()
      for (const row of snRes.data || []) {
        if (!row) continue
        if (row.snLockRepairId && String(row.snLockRepairId) !== String(repairId)) continue
        if (!row.snLocked && !row.snLockRepairId) continue
        try {
          await unlockOneSnDoc(row, unlocked, seen)
        } catch (e) {
          console.warn('[adminUpdateRepair] unlock by oldSn failed', row._id, e)
        }
      }
    } catch (e) {
      console.warn('[adminUpdateRepair] unlock by replacementOldSn failed:', e)
    }
  }
  return unlocked
}

async function assertNoPaidShopOrders(repairId) {
  const orderRes = await db.collection('shop_orders')
    .where({ repairId: String(repairId) })
    .limit(50)
    .get()
  const orders = orderRes.data || []
  const paid = orders.filter((o) => o && PAID_ORDER_STATUSES.includes(String(o.status || '').toUpperCase()))
  if (paid.length) {
    throw new Error('该工单已有付款/已发货配件订单，不可删除')
  }
  return orders
}

async function cleanupRepairSideData(repairId, unpaidOrders) {
  const cleaned = { ordersRemoved: 0, ordersBlocked: 0, guoqiRemoved: 0 }
  const orders = unpaidOrders || []

  for (const o of orders) {
    if (!o || !o._id) continue
    try {
      await db.collection('shop_orders').doc(o._id).remove()
      cleaned.ordersRemoved += 1
    } catch (e) {
      console.warn('[adminUpdateRepair] remove shop_order failed', o._id, e)
    }
  }

  try {
    const gRes = await db.collection('shouhouguoqi')
      .where({ repairId: String(repairId) })
      .limit(50)
      .get()
    for (const g of gRes.data || []) {
      if (!g || !g._id) continue
      try {
        await db.collection('shouhouguoqi').doc(g._id).remove()
        cleaned.guoqiRemoved += 1
      } catch (e) {
        console.warn('[adminUpdateRepair] remove shouhouguoqi failed', g._id, e)
      }
    }
  } catch (e) {
    console.warn('[adminUpdateRepair] cleanup shouhouguoqi failed:', e)
  }

  return cleaned
}

/**
 * 工单删除后：撤销诊断 A/B 方案对故障核验档案的「待录入 SN」标记
 * 否则 FAULT SN ENTRY 列表会残留孤儿卡
 */
async function clearFaultPendingLinkedToRepair(repairId, repair) {
  const id = String(repairId || '').trim()
  const cleared = []
  const seen = new Set()
  if (!id) return cleared

  const revertRow = async (row) => {
    if (!row || !row._id || seen.has(row._id)) return
    seen.add(row._id)

    const claimId = String(row.faultClaimId || '').trim()
    const claimSn = claimId
      ? `FAULT-CLAIM-${claimId.slice(-8).toUpperCase()}`
      : ''
    const curSn = String(row.sn || '').trim().toUpperCase()
    const patch = {
      snPending: false,
      faultAwaitingDiagnosis: true,
      faultAutoBind: false,
      faultScheme: '',
      replacementRepairId: _.remove()
    }
    if (claimSn && (row.snPending || curSn.startsWith('PENDING-FAULT-'))) {
      patch.sn = claimSn
    }
    try {
      await db.collection('sn').doc(row._id).update({ data: patch })
      cleared.push(row._id)
    } catch (e) {
      console.warn('[adminUpdateRepair] revert fault pending sn failed', row._id, e)
    }
  }

  try {
    const byRepair = await db.collection('sn')
      .where({ replacementRepairId: id })
      .limit(20)
      .get()
    for (const row of byRepair.data || []) {
      await revertRow(row)
    }
  } catch (e) {
    console.warn('[adminUpdateRepair] query sn by replacementRepairId failed:', e)
  }

  const pendingSn = `PENDING-FAULT-${id.slice(-8).toUpperCase()}`
  try {
    const bySn = await db.collection('sn').where({ sn: pendingSn }).limit(5).get()
    for (const row of bySn.data || []) {
      await revertRow(row)
    }
  } catch (e) {
    console.warn('[adminUpdateRepair] query sn by PENDING-FAULT failed:', e)
  }

  const snDocId = repair && (repair.faultClaimSnDocId || '')
  if (snDocId) {
    try {
      const doc = await db.collection('sn').doc(String(snDocId)).get()
      if (doc.data) await revertRow(doc.data)
    } catch (e) {
      console.warn('[adminUpdateRepair] load faultClaimSnDocId failed:', e)
    }
  }

  return cleared
}

async function deleteRepairCascade(docId, forceAdmin = false) {
  const id = String(docId)
  const doc = await db.collection('shouhou_repair').doc(id).get()
  if (!doc.data) throw new Error('维修单不存在')
  
  // 管理员强制删除时跳过所有检查
  if (!forceAdmin) {
    assertRepairDeletable(doc.data)
  }
  const repair = doc.data

  // 已付先拦；主单尽快删除并返回，旁路清理不拖垮客户端等待
  let unpaidOrders = []
  try {
    unpaidOrders = await assertNoPaidShopOrders(id)
  } catch (e) {
    const msg = String((e && e.message) || e || '')
    // 管理员强制删除时只警告，不抛出错误
    if (forceAdmin) {
      console.warn('[adminUpdateRepair] forceAdmin bypassed shop order check:', msg)
      unpaidOrders = []
    } else {
      if (msg.includes('不可删除')) throw e
      throw new Error(msg || '无法校验配件订单，暂不删除')
    }
  }

  let unlockedSns = []
  try {
    unlockedSns = await unlockSnLocksForRepair(id, repair)
  } catch (e) {
    console.warn('[adminUpdateRepair] unlock before delete failed:', e)
  }

  let clearedFaultPending = []
  try {
    clearedFaultPending = await clearFaultPendingLinkedToRepair(id, repair)
  } catch (e) {
    console.warn('[adminUpdateRepair] clear fault pending before delete failed:', e)
  }

  // 先软删再硬删：即使硬删超时/失败，用户端 checkRepair 也不再拦「未完结工单」
  try {
    await db.collection('shouhou_repair').doc(id).update({
      data: {
        status: 'DELETED',
        deletedByAdmin: true,
        isDeleted: true,
        deletedAt: db.serverDate()
      }
    })
  } catch (softErr) {
    console.warn('[adminUpdateRepair] soft delete mark failed:', softErr)
  }

  try {
    await db.collection('shouhou_repair').doc(id).remove()
  } catch (hardErr) {
    console.warn('[adminUpdateRepair] hard remove failed, soft delete remains:', hardErr)
  }

  let side = { ordersRemoved: 0, ordersBlocked: 0, guoqiRemoved: 0 }
  try {
    side = await cleanupRepairSideData(id, unpaidOrders)
  } catch (e) {
    console.warn('[adminUpdateRepair] side cleanup after delete failed:', e)
  }

  return {
    success: true,
    deletedRepairId: id,
    unlockedSns,
    clearedFaultPending,
    userMayResubmit: true,
    ...side
  }
}

async function enrichReturnRequiredMeta(items) {
  const list = items || []
  const openids = [...new Set(list.map((i) => i._openid).filter(Boolean))]
  const nicknameDict = {}
  for (const openid of openids) {
    try {
      const validRes = await db.collection('valid_users').where({ _openid: openid }).limit(1).get()
      if (validRes.data && validRes.data[0] && validRes.data[0].nickname) {
        nicknameDict[openid] = validRes.data[0].nickname
      }
    } catch (e) { /* ignore */ }
  }

  const sns = [...new Set(list.map((i) => i && i.device && i.device.sn).filter(Boolean))]
  const snExpiryMap = {}
  if (sns.length) {
    try {
      const snRes = await db.collection('sn').where({ sn: _.in(sns), isActive: true }).get()
      ;(snRes.data || []).forEach((d) => {
        if (d && d.sn && d.expiryDate && !snExpiryMap[d.sn]) snExpiryMap[d.sn] = d.expiryDate
      })
    } catch (e) { /* ignore */ }
  }

  // 换主板/换机完成状态：旧流程只写了设备档案（replacementRepairId 指向工单），
  // 没回写工单的 replacementNewSn，这里从 sn 集合反查补全
  const repairIds = list.map((i) => i && i._id).filter(Boolean)
  const replacementMap = {}
  for (let i = 0; i < repairIds.length; i += 20) {
    const batch = repairIds.slice(i, i + 20)
    try {
      const res = await db.collection('sn').where({ replacementRepairId: _.in(batch) }).get()
      ;(res.data || []).forEach((d) => {
        const rid = String(d.replacementRepairId || '').trim()
        if (!rid || replacementMap[rid]) return
        const snVal = String(d.sn || '').trim()
        const isPlaceholder = /^(PENDING-FAULT-|FAULT-CLAIM-)/i.test(snVal)
        if (d.snPending === true || isPlaceholder || !snVal) return
        replacementMap[rid] = {
          newSn: snVal,
          isActive: !!d.isActive,
          openid: String(d.openid || '').trim()
        }
      })
    } catch (e) {
      console.warn('[adminUpdateRepair] replacement map batch failed', e)
    }
  }

  // 寄出运单号兜底：给用户寄新配件走的是物料订单（shop_orders），
  // 运单号写在订单上而不是维修工单上，这里按 repairId 反查补全
  const trackingMap = {}
  for (let i = 0; i < repairIds.length; i += 20) {
    const batch = repairIds.slice(i, i + 20)
    try {
      const res = await db.collection('shop_orders')
        .where({ repairId: _.in(batch.map((x) => String(x))) })
        .get()
      ;(res.data || []).forEach((o) => {
        const rid = String(o.repairId || '').trim()
        const tid = String(o.trackingId || '').trim()
        if (!rid || !tid) return
        // 同一工单多张订单时，保留最新一条有单号的
        const prev = trackingMap[rid]
        const ts = o.updateTime || o.createTime || 0
        if (prev && prev._ts && ts && new Date(ts) <= new Date(prev._ts)) return
        trackingMap[rid] = {
          trackingId: tid,
          expressCompany: String(o.expressCompany || '').trim(),
          _ts: ts
        }
      })
    } catch (e) {
      console.warn('[adminUpdateRepair] tracking map batch failed', e)
    }
  }

  // 二次兜底已移除：按 openid 模糊匹配容易张冠李戴（同一用户多工单）。
  // 寄出单号主链路统一写 shouhou_repair.trackingId；无 repairId 的旧商城订单不再自动猜。

  return { nicknameDict, snExpiryMap, replacementMap, trackingMap }
}

async function listRepairs(listType) {
  const limit = 200
  if (listType === 'pending') {
    const res = await db.collection('shouhou_repair')
      .where({
        status: _.in(['PENDING', 'ADMIN_REVIEWED']),
        needReturn: _.neq(true),
        needPurchaseParts: _.neq(true)
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()
    const filtered = filterPendingRepairs(res.data)
    const enriched = await enrichPendingWithWarrantyDeduction(filtered)
    return { data: enriched }
  }

  if (listType === 'returnRequired') {
    const res = await db.collection('shouhou_repair')
      .where({
        needReturn: true,
        returnCompleted: _.neq(true),
        status: _.nin(['COMPLETED', 'RETURN_RECEIVED', 'DELETED', 'CANCELLED'])
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()
    const meta = await enrichReturnRequiredMeta(res.data)
    return { data: res.data || [], ...meta }
  }

  throw new Error('Unknown listType')
}

exports.main = async (event) => {
  const ev = event || {}
  const {
    id,
    repairId,
    action,
    trackingId = '',
    note = '',
    data
  } = ev

  const listType = ev.listType || ev.type || (ev.op === 'list' ? ev.listType || ev.type : '')

  const docId = id || repairId

  // 列表查询优先处理（兼容 op=list + listType）
  if (listType === 'pending' || listType === 'returnRequired') {
    try {
      await assertAdmin()
      const listed = await listRepairs(listType)
      return {
        success: true,
        data: listed.data,
        nicknameDict: listed.nicknameDict || {},
        snExpiryMap: listed.snExpiryMap || {},
        replacementMap: listed.replacementMap || {},
        trackingMap: listed.trackingMap || {}
      }
    } catch (e) {
      const msg = String((e && e.message) || e || '')
      if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
        return { success: false, errMsg: '无管理员权限' }
      }
      return { success: false, errMsg: msg }
    }
  }

  try {
    await assertAdmin()
  } catch (e) {
    const msg = String((e && e.message) || e || '')
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: msg }
  }

  try {
    if (action === 'get' && docId) {
      const doc = await db.collection('shouhou_repair').doc(docId).get()
      if (!doc.data) return { success: false, errMsg: '维修单不存在' }
      return { success: true, data: doc.data }
    }

    if (action === 'delete' && docId) {
      try {
        const forceAdmin = ev.forceAdmin === true || ev.force === true
        const result = await deleteRepairCascade(String(docId), forceAdmin)
        return result
      } catch (delErr) {
        return { success: false, errMsg: (delErr && delErr.message) || String(delErr) }
      }
    }

    if (data && docId) {
      const patch = normalizePatch(data)
      if (!Object.keys(patch).length) {
        return { success: false, errMsg: '无有效更新字段' }
      }
      const blocksFreeSupport = (
        patch.status === 'SHIPPED'
        || patch.status === 'TUTORIAL'
        || patch.needPurchaseParts === true
      )
      if (blocksFreeSupport) {
        const doc = await db.collection('shouhou_repair').doc(docId).get()
        if (!doc.data) return { success: false, errMsg: '维修单不存在' }
        try {
          await assertNoPriorWarrantyDeduction(doc.data)
        } catch (deductErr) {
          return { success: false, errMsg: (deductErr && deductErr.message) || String(deductErr) }
        }
      }
      await db.collection('shouhou_repair').doc(docId).update({ data: patch })
      return { success: true }
    }

    if (!docId || !action) {
      return { success: false, errMsg: 'Missing id or action' }
    }

    let updateObj = {}
    if (action === 'ship') {
      const shipRemark = String(ev.shipRemark || ev.note || '').trim()
      updateObj = {
        status: 'SHIPPED',
        solveTime: db.serverDate()
      }
      // 只在本次真的传了单号时才写；空值不允许覆盖掉已录入的单号
      const newTracking = String(trackingId || '').trim()
      if (newTracking) updateObj.trackingId = newTracking
      if (shipRemark) updateObj.shipRemark = shipRemark

      // 以管理员开关为准同步「需要寄回」，避免 UI 已关但库里残留 true
      if (Object.prototype.hasOwnProperty.call(ev, 'needReturn')) {
        updateObj.needReturn = ev.needReturn === true
      }

      const repairDoc = await db.collection('shouhou_repair').doc(docId).get()
      if (!repairDoc.data) return { success: false, errMsg: '维修单不存在' }
      try {
        await assertNoPriorWarrantyDeduction(repairDoc.data)
      } catch (deductErr) {
        return { success: false, errMsg: (deductErr && deductErr.message) || String(deductErr) }
      }

      // 内联校验，避免再嵌套调用 deviceReplacement（慢、易卡住）
      const repair = repairDoc.data || {}
      const hasDiagnosis = repair.diagnosisDone === true || !!String(repair.adminDiagnosis || '').trim()
      if (!hasDiagnosis) {
        return { success: false, errMsg: '请先填写诊断书' }
      }
      if (
        repair.awaitingSnReplacement === true &&
        repair.replacementDetectSource === 'manual_board_replacement'
      ) {
        return { success: false, errMsg: '该工单待换机，请维修专员先完成 SN 更换后再录单发货' }
      }

      const finalNeedReturn = Object.prototype.hasOwnProperty.call(ev, 'needReturn')
        ? ev.needReturn === true
        : repair.needReturn === true

      if (finalNeedReturn) {
        // 约 3 天后推「记得寄回故障配件」（由 sendSubscribeMessage 定时 tick）
        updateObj.needReturn = true
        updateObj.userReturnRemindAt = new Date(Date.now() + USER_RETURN_REMIND_DELAY_MS)
        updateObj.userReturnRemindScheduledAt = db.serverDate()
        updateObj.userReturnRemindSent = false
        updateObj.userReturnRemindLastError = ''
      } else if (Object.prototype.hasOwnProperty.call(ev, 'needReturn')) {
        // 明确不需要寄回：取消计划中的提醒
        updateObj.userReturnRemindSent = true
        updateObj.userReturnRemindAt = _.remove()
        updateObj.userReturnRemindLastError = 'cancelled_no_need_return'
      }

      await db.collection('shouhou_repair').doc(docId).update({ data: updateObj })
      return {
        success: true,
        needReturn: finalNeedReturn,
        userReturnRemindAt: finalNeedReturn ? updateObj.userReturnRemindAt : null
      }
    } else if (action === 'tutorial') {
      const repairDoc = await db.collection('shouhou_repair').doc(docId).get()
      if (!repairDoc.data) return { success: false, errMsg: '维修单不存在' }
      try {
        await assertNoPriorWarrantyDeduction(repairDoc.data)
      } catch (deductErr) {
        return { success: false, errMsg: (deductErr && deductErr.message) || String(deductErr) }
      }
      updateObj = {
        status: 'TUTORIAL',
        trackingId: '',
        solveNote: note || '请查看维修教程，可自行修复。如仍无法解决，请联系客服。',
        solveTime: db.serverDate()
      }
    } else {
      return { success: false, errMsg: 'Unknown action' }
    }

    await db.collection('shouhou_repair').doc(docId).update({ data: updateObj })
    return { success: true }
  } catch (e) {
    return { success: false, errMsg: (e && e.message) || String(e) }
  }
}
