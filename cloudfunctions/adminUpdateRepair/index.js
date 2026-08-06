// 云函数：管理员维修单查询/更新（客户端 shouhou_repair 仅允许本人读写）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const SERVER_DATE_FLAG = '__SERVER_DATE__'
/** 录单备件且勾选需要寄回：约 3 天后提醒用户寄回故障件 */
const USER_RETURN_REMIND_DELAY_MS = 3 * 24 * 60 * 60 * 1000

function parseYmdLocal(raw) {
  const s = String(raw || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0)
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function remainingDaysFromExpiry(expiryRaw) {
  const exp = typeof expiryRaw === 'string' ? parseYmdLocal(expiryRaw) : expiryRaw
  if (!exp || Number.isNaN(exp.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  const expNoon = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate(), 12, 0, 0, 0)
  return Math.max(0, Math.round((expNoon.getTime() - today.getTime()) / 86400000))
}

function buildLiveWarrantyEntry(d) {
  if (!d || !d.expiryDate) return null
  const rem = remainingDaysFromExpiry(d.expiryDate)
  return {
    expiryDate: d.expiryDate,
    remainingDays: rem != null ? rem : (Number(d.remainingDays) || 0),
    totalDays: Number(d.totalDays) || 0,
    productModel: String(d.productModel || '').trim(),
    controlVariant: String(d.controlVariant || '').trim(),
    sn: String(d.sn || '').trim(),
    _isActive: !!d.isActive
  }
}

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
  for (let i = 0; i < openids.length; i += 20) {
    const batch = openids.slice(i, i + 20)
    try {
      const validRes = await db.collection('valid_users')
        .where({ _openid: _.in(batch) })
        .field({ _openid: true, nickname: true })
        .get()
      ;(validRes.data || []).forEach((u) => {
        if (u && u._openid && u.nickname) nicknameDict[u._openid] = u.nickname
      })
    } catch (e) { /* ignore */ }
  }

  const sns = [...new Set(list.map((i) => {
    if (!i) return ''
    return String((i.device && i.device.sn) || i.sn || '').trim()
  }).filter(Boolean))]
  // sn → 实时质保（配置回溯后以 sn 集合为准，不能只用工单快照）
  const snExpiryMap = {}
  if (sns.length) {
    try {
      // 不强制 isActive：故障核验/待激活档案也要能刷出正确到期日
      const snRes = await db.collection('sn').where({ sn: _.in(sns) }).get()
      ;(snRes.data || []).forEach((d) => {
        const entry = buildLiveWarrantyEntry(d)
        if (!entry || !d.sn) return
        const existing = snExpiryMap[d.sn]
        if (existing && existing._isActive && !d.isActive) return
        snExpiryMap[d.sn] = entry
      })
      Object.keys(snExpiryMap).forEach((k) => {
        if (snExpiryMap[k]) delete snExpiryMap[k]._isActive
      })
    } catch (e) { /* ignore */ }
  }

  // 工单缺 SN / SN 对不上时：按 openid + 型号从 sn 档案兜底（配置回溯后仍显示旧剩余天数的主因）
  const warrantyByRepairId = {}
  const needFallback = list.filter((i) => {
    if (!i || !i._id) return false
    const sn = String((i.device && i.device.sn) || i.sn || '').trim()
    return !(sn && snExpiryMap[sn] && snExpiryMap[sn].expiryDate)
  })
  if (needFallback.length) {
    const openids = [...new Set(needFallback.map((i) =>
      String(i._openid || i.openid || (i.device && i.device.openid) || '').trim()
    ).filter(Boolean))]
    const snByOpenid = {}
    for (let i = 0; i < openids.length; i += 20) {
      const batch = openids.slice(i, i + 20)
      try {
        const snRes = await db.collection('sn').where({ openid: _.in(batch) }).get()
        ;(snRes.data || []).forEach((d) => {
          const oid = String(d.openid || '').trim()
          if (!oid) return
          if (!snByOpenid[oid]) snByOpenid[oid] = []
          snByOpenid[oid].push(d)
        })
      } catch (e) { /* ignore */ }
    }
    needFallback.forEach((item) => {
      const oid = String(item._openid || item.openid || (item.device && item.device.openid) || '').trim()
      const model = String((item.device && item.device.productModel) || item.model || '').trim()
      const candidates = (snByOpenid[oid] || []).filter((d) => d && d.expiryDate)
      if (!candidates.length) return
      let match = null
      if (model) {
        match = candidates.find((d) => String(d.productModel || '').trim() === model) || null
      }
      if (!match) {
        const active = candidates.filter((d) => d.isActive)
        match = (active.length === 1 ? active[0] : null) || (candidates.length === 1 ? candidates[0] : null)
      }
      if (!match) return
      const entry = buildLiveWarrantyEntry(match)
      if (!entry) return
      delete entry._isActive
      warrantyByRepairId[item._id] = entry
      const snKey = String(match.sn || '').trim()
      if (snKey && !snExpiryMap[snKey]) snExpiryMap[snKey] = entry
    })
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

  // 注意：列表接口必须快，不能在这里串行调用物流接口（会触发 3s 超时）。
  // 签收状态改为前端按需查询并回写（_refreshReturnLogisticsStatuses）。

  return { nicknameDict, snExpiryMap, warrantyByRepairId, replacementMap, trackingMap }
}

/** 用 sn 实时质保覆盖工单快照字段（配置回溯后必须看 sn） */
function applyLiveWarrantyToRepairs(items, snExpiryMap, warrantyByRepairId) {
  const map = snExpiryMap || {}
  const byId = warrantyByRepairId || {}
  return (items || []).map((item) => {
    if (!item) return item
    const deviceSn = String((item.device && item.device.sn) || item.sn || '').trim()
    const live = (deviceSn && map[deviceSn]) || (item._id && byId[item._id]) || null
    if (!live || !live.expiryDate) return item
    const expiryDate = live.expiryDate
    const rem = live.remainingDays != null
      ? Number(live.remainingDays)
      : remainingDaysFromExpiry(expiryDate)
    const remainingDays = Number.isFinite(rem) ? Math.max(0, rem) : 0
    const totalDays = Number(live.totalDays) || Number(item.totalDays) || 0
    const liveSn = String(live.sn || deviceSn || '').trim()
    return {
      ...item,
      expiryDate,
      remainingDays,
      totalDays: totalDays || item.totalDays,
      warrantyExpired: remainingDays <= 0,
      device: {
        ...(item.device || {}),
        sn: (item.device && item.device.sn) || liveSn || deviceSn,
        expiryDate,
        days: remainingDays,
        totalDays: totalDays || (item.device && item.device.totalDays) || 0,
        productModel: live.productModel || (item.device && item.device.productModel) || item.model || '',
        controlVariant: live.controlVariant || (item.device && item.device.controlVariant) || item.controlVariant || ''
      }
    }
  })
}

async function syncReturnLogisticsSigned(items) {
  const list = items || []
  const CACHE_MS = 10 * 60 * 1000
  for (const item of list) {
    if (!item || !item._id) continue
    if (item.returnLogisticsSigned === true || item.returnCompleted === true) {
      // 已签收但还没推过企微 → 直接推
      if (item.returnLogisticsSigned === true && item.returnSignedAdminNotifySent !== true) {
        await pushReturnSignedWecom(item)
      }
      continue
    }
    if (String(item.status || '').toUpperCase() === 'RETURN_RECEIVED') continue
    const tracking = String(item.returnTrackingId || '').trim()
    if (!tracking) continue

    const checkedAt = item.returnLogisticsCheckedAt
    if (checkedAt) {
      const t = new Date(checkedAt).getTime()
      if (Number.isFinite(t) && Date.now() - t < CACHE_MS) {
        const text = String(item.returnLogisticsStatusText || '')
        const code = String(item.returnLogisticsStatus || '')
        if (code === '3' || /签收|送达|代收/.test(text)) {
          item.returnLogisticsSigned = true
          await pushReturnSignedWecom(item)
        }
        continue
      }
    }

    try {
      const phone = (item.contact && item.contact.phone) || ''
      const lr = await cloud.callFunction({
        name: 'queryLogistics',
        data: {
          trackingId: tracking,
          receiverPhone: phone,
          phone,
          expressCompany: item.returnExpressCompany || item.expressCompany || ''
        }
      })
      const result = (lr && lr.result) || {}
      if (!result.success || !result.data) continue
      const statusCode = String(result.data.status || '')
      const statusText = String(result.data.status_text || result.data.statusText || '')
      const signed = statusCode === '3' || /签收|送达|代收/.test(statusText)
      const patch = {
        returnLogisticsStatus: statusCode,
        returnLogisticsStatusText: statusText,
        returnLogisticsCheckedAt: db.serverDate()
      }
      if (signed) {
        patch.returnLogisticsSigned = true
        item.returnLogisticsSigned = true
        item.returnLogisticsStatus = statusCode || '3'
        item.returnLogisticsStatusText = statusText || '已签收'
      } else {
        item.returnLogisticsStatus = statusCode
        item.returnLogisticsStatusText = statusText
      }
      try {
        await db.collection('shouhou_repair').doc(String(item._id)).update({ data: patch })
      } catch (e2) {
        console.warn('[adminUpdateRepair] persist return logistics failed', item._id, e2)
      }
      if (signed) {
        await pushReturnSignedWecom(item)
      }
    } catch (e) {
      console.warn('[adminUpdateRepair] sync return logistics failed', item._id, e)
    }
  }
}

/** 签收后立刻推企微（只推一次） */
async function pushReturnSignedWecom(item) {
  if (!item || !item._id) return
  if (item.returnSignedAdminNotifySent === true) return
  const model = item.model || (item.device && item.device.productModel) || ''
  const tracking = String(item.returnTrackingId || '').trim()
  const oneLine = [model, tracking].filter(Boolean).join(' · ')
  try {
    await cloud.callFunction({
      name: 'wecomNotify',
      data: {
        action: 'notifyAdminTodo',
        kind: 'return_signed',
        oneLine
      }
    })
    await db.collection('shouhou_repair').doc(String(item._id)).update({
      data: {
        returnSignedAdminNotifySent: true,
        returnSignedAdminNotifyAt: db.serverDate()
      }
    })
    item.returnSignedAdminNotifySent = true
  } catch (e) {
    console.warn('[adminUpdateRepair] return signed wecom push failed', item._id, e)
  }
}

async function listRepairs(listType) {
  const limit = 120
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
    // 与需寄回一致：附带 sn 实时质保，避免待处理卡仍显示建单快照
    const meta = await enrichReturnRequiredMeta(enriched)
    const withLiveWarranty = applyLiveWarrantyToRepairs(
      enriched,
      meta.snExpiryMap || {},
      meta.warrantyByRepairId || {}
    )
    return { data: withLiveWarranty, ...meta }
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
    const withLiveWarranty = applyLiveWarrantyToRepairs(
      res.data || [],
      meta.snExpiryMap || {},
      meta.warrantyByRepairId || {}
    )
    return { data: withLiveWarranty, ...meta }
  }

  // 寄回回溯：
  // 1) 误完结 → 撤销完结
  // 2) 误备单且未勾需要寄回 → 撤销寄出回待处理
  // 3) 误把「需寄回+运单」撤回待处理 → 恢复需寄回（查运单记录）
  // SHIPPED+needReturn 本身在「需寄回确认」，不进回溯列表
  if (listType === 'returnCompletedRecent' || listType === 'returnRollbackRecent') {
    const toMs = (raw) => {
      if (!raw) return 0
      try {
        if (typeof raw === 'object' && raw.$date) return new Date(raw.$date).getTime() || 0
        return new Date(raw).getTime() || 0
      } catch (e) {
        return 0
      }
    }

    const [completedRes, shippedNoReturnRes, mistakenPendingRes] = await Promise.all([
      db.collection('shouhou_repair')
        .where({ needReturn: true, returnCompleted: true })
        .orderBy('createTime', 'desc')
        .limit(80)
        .get(),
      db.collection('shouhou_repair')
        .where({ status: 'SHIPPED', needReturn: _.neq(true), returnCompleted: _.neq(true) })
        .orderBy('createTime', 'desc')
        .limit(80)
        .get(),
      db.collection('shouhou_repair')
        .where({ status: _.in(['PENDING', 'ADMIN_REVIEWED']), shipRollbackAt: _.exists(true) })
        .orderBy('createTime', 'desc')
        .limit(80)
        .get()
    ])

    const completed = (completedRes.data || []).map((row) => ({ ...row, rollbackKind: 'complete' }))
    const shipped = (shippedNoReturnRes.data || []).map((row) => ({ ...row, rollbackKind: 'ship' }))

    const mistakenRows = mistakenPendingRes.data || []
    const restoreCandidates = []
    for (let i = 0; i < mistakenRows.length; i++) {
      const row = mistakenRows[i]
      if (!row || !row._id) continue
      if (row.needReturn === true) continue
      const tracking = await resolveOutboundTracking(row)
      const savedTracking = String(row.shipRollbackTrackingId || '').trim()
      // 只要走过寄出回溯（有 shipRollbackAt），就允许恢复到需寄回；并尽量找回运单号
      restoreCandidates.push({
        ...row,
        trackingId: tracking || savedTracking || row.trackingId || '',
        rollbackKind: 'restore',
        needReturn: true
      })
    }

    const merged = completed.concat(shipped).concat(restoreCandidates)
    merged.sort((a, b) => {
      const ta = toMs(a.returnCompleteTime) || toMs(a.shipRollbackAt) || toMs(a.solveTime) || toMs(a.updateTime) || toMs(a.createTime)
      const tb = toMs(b.returnCompleteTime) || toMs(b.shipRollbackAt) || toMs(b.solveTime) || toMs(b.updateTime) || toMs(b.createTime)
      return tb - ta
    })
    return { data: merged.slice(0, 40) }
  }

  throw new Error('Unknown listType')
}

/** 查备件寄出运单：工单字段 → shop_orders.repairId */
async function resolveOutboundTracking(repair) {
  if (!repair) return ''
  const direct = String(
    repair.trackingId ||
    repair.spareTrackingId ||
    repair.expressNo ||
    repair.shipTrackingId ||
    repair.shipRollbackTrackingId ||
    ''
  ).trim()
  if (direct) return direct
  const rid = String(repair._id || '').trim()
  if (!rid) return ''
  try {
    const res = await db.collection('shop_orders').where({ repairId: rid }).limit(10).get()
    const rows = res.data || []
    for (let i = 0; i < rows.length; i++) {
      const tid = String(rows[i].trackingId || '').trim()
      if (tid) return tid
    }
  } catch (e) { /* ignore */ }
  return ''
}

/** 确认收货后「修回+新件同寄」：归档上一轮，同一运单寄出修好件+新配件，并强制继续需寄回 */
async function reshipRepairedPlusSpare(docId, adminOpenid, ev) {
  const trackingId = String((ev && ev.trackingId) || '').trim()
  if (!trackingId) throw new Error('请填写运单号')
  const shipRemark = String((ev && (ev.shipRemark || ev.note)) || '').trim()

  const doc = await db.collection('shouhou_repair').doc(String(docId)).get()
  if (!doc.data) throw new Error('维修单不存在')
  const repair = doc.data

  if (repair.needReturn !== true) {
    throw new Error('非需寄回工单，无法走此分支')
  }
  if (repair.returnCompleted === true) {
    throw new Error('工单已完结，请先寄回回溯后再操作')
  }

  const returnTid = String(repair.returnTrackingId || '').trim()
  const isWholeUnitRepair = String(repair.returnStatus || '').toUpperCase() === 'PENDING_RETURN'
  const userSent =
    !!returnTid ||
    String(repair.status || '').toUpperCase() === 'USER_SENT' ||
    String(repair.returnStatus || '').toUpperCase() === 'USER_SENT' ||
    repair.returnLogisticsSigned === true
  if (!userSent) {
    throw new Error('用户尚未寄回，无法确认收货后重寄')
  }

  const prevCycles = Array.isArray(repair.repairCycles) ? repair.repairCycles.length : 0
  const archived = {
    cycleIndex: prevCycles + 1,
    outboundTrackingId: String(repair.trackingId || '').trim(),
    outboundContains: Array.isArray(repair.outboundContains)
      ? repair.outboundContains
      : (repair.outboundMode ? [String(repair.outboundMode)] : (isWholeUnitRepair ? ['whole_unit_return'] : ['new_spare'])),
    outboundMode: String(repair.outboundMode || (isWholeUnitRepair ? 'whole_unit_return' : 'new_spare')),
    returnTrackingId: returnTid,
    returnStatusBefore: String(repair.returnStatus || ''),
    returnReceivedAt: db.serverDate(),
    closedReason: 'reship_repaired_plus_spare',
    closedAt: db.serverDate(),
    closedBy: adminOpenid || ''
  }

  const updateObj = {
    repairCycles: _.push(archived),
    lastReturnReceivedAt: db.serverDate(),
    // 清空上一轮寄回（整机寄回维修也从此进入「再寄故障件」轮次）
    returnTrackingId: _.remove(),
    returnTrackingTime: _.remove(),
    returnStatus: _.remove(),
    returnLogisticsSigned: false,
    returnLogisticsStatus: _.remove(),
    returnLogisticsStatusText: _.remove(),
    returnLogisticsCheckedAt: _.remove(),
    returnSignedAdminNotifySent: false,
    // 修回+新件：同一运单号
    trackingId,
    solveTime: db.serverDate(),
    reshipAt: db.serverDate(),
    reshipBy: adminOpenid || '',
    shipRemark: shipRemark || '修回+新件同寄',
    outboundContains: ['repaired_return', 'new_spare'],
    outboundMode: 'repaired_plus_spare',
    status: 'SHIPPED',
    needReturn: true,
    returnCompleted: false,
    returnCompleteTime: _.remove(),
    userReturnRemindAt: new Date(Date.now() + USER_RETURN_REMIND_DELAY_MS),
    userReturnRemindScheduledAt: db.serverDate(),
    userReturnRemindSent: false,
    userReturnRemindLastError: ''
  }

  await db.collection('shouhou_repair').doc(String(docId)).update({ data: updateObj })
  return {
    success: true,
    trackingId,
    outboundMode: 'repaired_plus_spare',
    needReturn: true,
    cycleIndex: archived.cycleIndex
  }
}

/** 误完结后撤销：拉回需寄回；有运单则保持 SHIPPED */
async function undoReturnComplete(docId, adminOpenid) {
  const doc = await db.collection('shouhou_repair').doc(String(docId)).get()
  if (!doc.data) throw new Error('维修单不存在')
  const repair = doc.data
  if (repair.needReturn !== true) {
    throw new Error('该工单不是需寄回单，无法撤销完结')
  }
  if (repair.returnCompleted !== true) {
    throw new Error('该工单尚未完结，无需撤销')
  }

  const outboundTracking = await resolveOutboundTracking(repair)
  const terminal = ['COMPLETED', 'RETURN_RECEIVED', 'DELETED', 'CANCELLED', 'REPAIR_COMPLETED_SENT']
  let nextStatus = String(repair.statusBeforeComplete || '').trim().toUpperCase()
  if (!nextStatus || terminal.includes(nextStatus)) {
    nextStatus = String(repair.returnTrackingId || '').trim() ? 'USER_SENT' : 'SHIPPED'
  }
  if (outboundTracking && ['PENDING', 'ADMIN_REVIEWED'].includes(nextStatus)) {
    nextStatus = 'SHIPPED'
  }

  const patch = {
    returnCompleted: false,
    returnCompleteTime: _.remove(),
    status: nextStatus,
    needReturn: true,
    returnCompleteRollbackAt: db.serverDate(),
    returnCompleteRollbackBy: adminOpenid || ''
  }
  if (outboundTracking && !String(repair.trackingId || '').trim()) {
    patch.trackingId = outboundTracking
  }

  const snapReturnStatus = String(repair.returnStatusBeforeComplete || '').trim()
  if (snapReturnStatus) {
    patch.returnStatus = snapReturnStatus
  } else if (nextStatus === 'USER_SENT' && !repair.returnStatus) {
    patch.returnStatus = 'USER_SENT'
  }

  const curStatus = String(repair.status || '').toUpperCase()
  if (curStatus === 'RETURN_RECEIVED' || repair.returnLogisticsSigned === true) {
    patch.returnLogisticsSigned = false
    patch.returnSignedAdminNotifySent = false
    patch.returnSignedAdminNotifyAt = _.remove()
  }

  await db.collection('shouhou_repair').doc(String(docId)).update({ data: patch })
  return {
    success: true,
    status: nextStatus,
    trackingId: outboundTracking || repair.trackingId || '',
    returnStatus: patch.returnStatus || repair.returnStatus || '',
    backTo: 'returnRequired'
  }
}

/** 误点录单备件寄出后撤销（仅未勾需要寄回） */
async function undoShip(docId, adminOpenid) {
  const doc = await db.collection('shouhou_repair').doc(String(docId)).get()
  if (!doc.data) throw new Error('维修单不存在')
  const repair = doc.data
  const st = String(repair.status || '').toUpperCase()
  if (st !== 'SHIPPED') {
    throw new Error('仅「备单寄出 / SHIPPED」状态可撤销寄出')
  }
  if (repair.returnCompleted === true) {
    throw new Error('该单已完结，请先用「撤销完结」')
  }
  if (repair.returnStatus === 'USER_SENT' || String(repair.returnTrackingId || '').trim()) {
    throw new Error('用户已填写寄回运单，无法撤销备单寄出')
  }

  const outboundTracking = await resolveOutboundTracking(repair)
  if (repair.needReturn === true || outboundTracking) {
    throw new Error('该单已录运单或已勾选需要寄回，请到「需寄回确认」处理；不要撤回待处理')
  }

  let nextStatus = String(repair.statusBeforeShip || '').trim().toUpperCase()
  if (!nextStatus || !['PENDING', 'ADMIN_REVIEWED'].includes(nextStatus)) {
    nextStatus = repair.diagnosisDone === true || String(repair.adminDiagnosis || '').trim()
      ? 'ADMIN_REVIEWED'
      : 'PENDING'
  }

  const prevTracking = String(repair.trackingId || '').trim()
  const patch = {
    status: nextStatus,
    trackingId: _.remove(),
    solveTime: _.remove(),
    shipRemark: _.remove(),
    needReturn: false,
    shipRollbackHadNeedReturn: false,
    userReturnRemindAt: _.remove(),
    userReturnRemindScheduledAt: _.remove(),
    userReturnRemindSent: true,
    userReturnRemindLastError: 'cancelled_undo_ship',
    shipRollbackAt: db.serverDate(),
    shipRollbackBy: adminOpenid || ''
  }
  if (prevTracking) patch.shipRollbackTrackingId = prevTracking

  await db.collection('shouhou_repair').doc(String(docId)).update({ data: patch })
  return {
    success: true,
    status: nextStatus,
    needReturn: false,
    backTo: 'pending'
  }
}

/** 把误撤回待处理、且曾有运单/需寄回的单，恢复到需寄回确认 */
async function restoreNeedReturnShip(docId, adminOpenid) {
  const doc = await db.collection('shouhou_repair').doc(String(docId)).get()
  if (!doc.data) throw new Error('维修单不存在')
  const repair = doc.data
  const st = String(repair.status || '').toUpperCase()
  if (!['PENDING', 'ADMIN_REVIEWED', 'SHIPPED'].includes(st)) {
    throw new Error('当前状态无法恢复为需寄回')
  }
  if (repair.returnCompleted === true) {
    throw new Error('该单已完结，请先用「撤销完结」')
  }

  const tracking = await resolveOutboundTracking(repair)
  const tid = tracking || String(repair.trackingId || '').trim() || String(repair.shipRollbackTrackingId || '').trim()
  // 有 shipRollbackAt 说明曾被误撤，即使暂时找不到运单也允许恢复到需寄回（可再录单号）
  if (!tid && !repair.shipRollbackAt && repair.shipRollbackHadNeedReturn !== true && repair.needReturn !== true) {
    throw new Error('未查到备件运单记录，无法自动恢复；请确认是否录过运单号')
  }

  const patch = {
    status: 'SHIPPED',
    needReturn: true,
    returnCompleted: false,
    shipRestoreAt: db.serverDate(),
    shipRestoreBy: adminOpenid || ''
  }
  if (tid) patch.trackingId = tid

  await db.collection('shouhou_repair').doc(String(docId)).update({ data: patch })
  return {
    success: true,
    status: 'SHIPPED',
    needReturn: true,
    trackingId: tid || '',
    backTo: 'returnRequired'
  }
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
  if (listType === 'pending' || listType === 'returnRequired' || listType === 'returnCompletedRecent' || listType === 'returnRollbackRecent') {
    try {
      await assertAdmin()
      const listed = await listRepairs(listType)
      return {
        success: true,
        data: listed.data,
        nicknameDict: listed.nicknameDict || {},
        snExpiryMap: listed.snExpiryMap || {},
        warrantyByRepairId: listed.warrantyByRepairId || {},
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

  let adminOpenid = ''
  try {
    adminOpenid = await assertAdmin()
  } catch (e) {
    const msg = String((e && e.message) || e || '')
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: msg }
  }

  try {
    if (action === 'undoReturnComplete' && docId) {
      try {
        return await undoReturnComplete(String(docId), adminOpenid)
      } catch (undoErr) {
        return { success: false, errMsg: (undoErr && undoErr.message) || String(undoErr) }
      }
    }

    if (action === 'undoShip' && docId) {
      try {
        return await undoShip(String(docId), adminOpenid)
      } catch (undoErr) {
        return { success: false, errMsg: (undoErr && undoErr.message) || String(undoErr) }
      }
    }

    if (action === 'restoreNeedReturnShip' && docId) {
      try {
        return await restoreNeedReturnShip(String(docId), adminOpenid)
      } catch (undoErr) {
        return { success: false, errMsg: (undoErr && undoErr.message) || String(undoErr) }
      }
    }

    if (action === 'reshipRepairedPlusSpare' && docId) {
      try {
        return await reshipRepairedPlusSpare(String(docId), adminOpenid, ev)
      } catch (reshipErr) {
        return { success: false, errMsg: (reshipErr && reshipErr.message) || String(reshipErr) }
      }
    }

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

      const prevStatus = String(repair.status || '').trim().toUpperCase()
      updateObj = {
        status: 'SHIPPED',
        solveTime: db.serverDate(),
        statusBeforeShip: ['PENDING', 'ADMIN_REVIEWED'].includes(prevStatus) ? prevStatus : (hasDiagnosis ? 'ADMIN_REVIEWED' : 'PENDING')
      }
      // 只在本次真的传了单号时才写；空值不允许覆盖掉已录入的单号
      const newTracking = String(trackingId || '').trim()
      if (newTracking) updateObj.trackingId = newTracking
      if (shipRemark) updateObj.shipRemark = shipRemark

      // 以管理员开关为准同步「需要寄回」，避免 UI 已关但库里残留 true
      if (Object.prototype.hasOwnProperty.call(ev, 'needReturn')) {
        updateObj.needReturn = ev.needReturn === true
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
