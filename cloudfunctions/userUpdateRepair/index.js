const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const SERVER_DATE_FLAG = '__SERVER_DATE__'
/** 用户提交寄回运单后延迟再推企业微信。正式：满 2 天（今天寄、后天发） */
const WECOM_RETURN_DELAY_MS = 2 * 24 * 60 * 60 * 1000

const ALLOWED_KEYS = new Set([
  'returnAddress',
  'returnTrackingId',
  'returnTrackingTime',
  'returnStatus',
  'status',
  'paidRepairAgreed',
  'paidRepairAgreedTime'
])

function normalizePatch(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const patch = {}
  Object.keys(raw).forEach((key) => {
    if (!ALLOWED_KEYS.has(key)) return
    let val = raw[key]
    if (val === SERVER_DATE_FLAG || (val === true && /Time$/.test(key))) {
      val = db.serverDate()
    }
    patch[key] = val
  })
  return patch
}

function scheduleWecomReturnNotify(patch, prev) {
  // 仅在本次显式写入运单号时排队 / 改期
  if (patch.returnTrackingId === undefined) return
  const nextTracking = String(patch.returnTrackingId || '').trim()
  if (!nextTracking) return

  const prevTracking = String((prev && prev.returnTrackingId) || '').trim()
  const alreadyQueued =
    prevTracking === nextTracking &&
    prev &&
    prev.wecomReturnNotifyAt &&
    prev.wecomReturnNotifySent !== true

  if (alreadyQueued) return

  patch.wecomReturnNotifyAt = new Date(Date.now() + WECOM_RETURN_DELAY_MS)
  patch.wecomReturnNotifyScheduledAt = db.serverDate()
  patch.wecomReturnNotifySent = false
  patch.wecomReturnNotifyLastError = ''
}

function normalizeSn(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return ''
  if (raw.startsWith('PENDING-FAULT-') || raw.startsWith('FAULT-CLAIM-')) return raw
  if (raw.startsWith('MT-')) return raw
  if (raw.startsWith('MT')) return `MT-${raw.slice(2).replace(/^-/, '')}`
  if (raw.startsWith('NB')) return `MT-${raw.replace(/^NB-?/, '')}`
  return `MT-${raw.replace(/^-/, '')}`
}

function snCandidates(normalizedSn) {
  const suffix = String(normalizedSn || '').replace(/^MT-?/, '')
  const set = new Set()
  if (normalizedSn) set.add(normalizedSn)
  if (suffix) {
    set.add(suffix)
    set.add(`MT${suffix}`)
    set.add(`NB${suffix}`)
    set.add(`NB-${suffix}`)
  }
  return Array.from(set)
}

/**
 * 清理当前用户的孤儿售后记录（设备已不在名下的维修/待购配件记录，不限状态）：
 * - 用户已无绑定设备 → 名下记录全部标记隐藏
 * - 仍有设备 → 只处理 SN 与剩余设备对不上的记录
 * 处理方式：orphanHidden=true（用户端申请进度不再显示，后台数据保留），
 * 未完结的同时关闭待购配件/待寄回标记。
 * 在途售后（已填运单 / 用户已寄出）不动。
 */
async function cleanupOrphanRepairs(openid) {
  const _ = db.command
  const remainRes = await db.collection('sn').where({
    openid,
    isActive: true
  }).limit(50).get()
  const devices = remainRes.data || []

  const recordsRes = await db.collection('shouhou_repair')
    .where({
      _openid: openid,
      orphanHidden: _.neq(true)
    })
    .limit(100)
    .get()
  const records = recordsRes.data || []
  if (!records.length) return { success: true, cleaned: 0 }

  const deviceSns = new Set()
  devices.forEach((d) => {
    snCandidates(normalizeSn(d.sn)).forEach((s) => deviceSns.add(String(s).toUpperCase()))
  })

  let cleaned = 0
  for (const r of records) {
    // 在途售后不动：已寄出待收货/待处理的流程走完再说
    const inTransit = (r.status === 'USER_SENT' || r.returnStatus === 'USER_SENT') && r.returnCompleted !== true
    if (inTransit) continue
    // 未完结的待寄回（已填运单）也不动
    if (r.needReturn === true && r.returnCompleted !== true && r.returnTrackingId) continue

    let shouldClean = false
    if (!devices.length) {
      shouldClean = true
    } else {
      const rSn = String(r.sn || r.deviceSn || '').trim()
      if (rSn && rSn.length >= 3) {
        const cands = snCandidates(normalizeSn(rSn)).map((s) => String(s).toUpperCase())
        shouldClean = !cands.some((c) => deviceSns.has(c))
      }
    }
    if (!shouldClean) continue

    const patch = {
      orphanHidden: true,
      needPurchaseParts: false,
      purchasePartsList: [],
      needReturn: false,
      returnCompleted: true,
      autoCleanedOrphan: true,
      autoCleanedAt: db.serverDate()
    }
    if (r.status === 'PENDING' || r.status === 'ADMIN_REVIEWED') {
      patch.status = 'COMPLETED'
    }
    await db.collection('shouhou_repair').doc(r._id).update({ data: patch })
    cleaned++
  }
  console.log('[userUpdateRepair] 孤儿售后清理：', { openid: openid.slice(0, 8) + '***', devicesLeft: devices.length, cleaned })
  return { success: true, cleaned }
}

/** 列出当前用户可用设备（云端查，避免客户端权限/字段不一致漏设备） */
async function listMyDevices(openid) {
  const _ = db.command
  const seen = new Set()
  const merged = []

  const pushRows = (rows) => {
    (rows || []).forEach((row) => {
      if (!row || !row._id) return
      const snKey = String(row.sn || row._id).trim().toUpperCase()
      if (!snKey || seen.has(snKey)) return
      // 明确未激活的不要；缺 isActive 但已挂 openid 的旧数据仍给用
      if (row.isActive === false || row.isActive === 0 || row.isActive === 'false') return
      if (row.isActive !== true && row.isActive !== 1 && row.isActive !== 'true') {
        // 无激活标记时：必须已绑定到该用户才算
        const oid = String(row.openid || row._openid || '').trim()
        if (oid !== openid) return
      }
      seen.add(snKey)
      merged.push(row)
    })
  }

  const q1 = await db.collection('sn').where({ openid, isActive: true }).limit(50).get()
  pushRows(q1.data)
  try {
    const q2 = await db.collection('sn').where({ _openid: openid, isActive: true }).limit(50).get()
    pushRows(q2.data)
  } catch (e) {
    /* ignore */
  }
  // 兜底：只按 openid 拉，再在内存过滤（兼容 isActive 类型不统一）
  if (!merged.length) {
    const q3 = await db.collection('sn').where({ openid }).limit(50).get()
    pushRows(q3.data)
  }

  const now = Date.now()
  const devices = merged.map((device) => {
    let warrantyExpired = false
    let remainingDays = null
    if (device.expiryDate) {
      const exp = new Date(device.expiryDate)
      const diff = Math.ceil((exp.getTime() - now) / 86400000)
      remainingDays = diff
      warrantyExpired = diff <= 0
    }
    const snPending = !!device.snPending || String(device.sn || '').startsWith('PENDING-FAULT-') || String(device.sn || '').startsWith('FAULT-CLAIM-')
    const rawSn = String(device.sn || '').trim()
    const displaySn = snPending
      ? (String(device.sn || '').startsWith('FAULT-CLAIM-') ? '质保档案（待诊断）' : '待录入')
      : (device.displaySn || (rawSn.toUpperCase().startsWith('MT') ? rawSn : ('MT' + rawSn)))
    return {
      _id: device._id,
      sn: device.sn,
      name: device.name || '',
      productModel: device.productModel || device.name || '未知型号',
      controlVariant: device.controlVariant || '',
      expiryDate: device.expiryDate || '',
      isActive: device.isActive,
      snPending,
      faultAwaitingDiagnosis: !!device.faultAwaitingDiagnosis,
      bindSource: device.bindSource || '',
      displaySn,
      warrantyExpired,
      remainingDays
    }
  })

  return { success: true, devices }
}

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID
  if (!openid) {
    return { success: false, errMsg: '未登录' }
  }

  // 我的页加载时触发：清理设备已移除后残留的售后记录
  if (event && event.action === 'cleanupOrphanRepairs') {
    try {
      return await cleanupOrphanRepairs(openid)
    } catch (e) {
      return { success: false, errMsg: (e && e.message) || String(e) }
    }
  }

  if (event && event.action === 'listMyDevices') {
    try {
      return await listMyDevices(openid)
    } catch (e) {
      return { success: false, errMsg: (e && e.message) || String(e), devices: [] }
    }
  }

  const repairId = event && (event.repairId || event.id)
  const rawData = event && event.data

  if (!repairId || !rawData) {
    return { success: false, errMsg: '缺少 repairId 或 data' }
  }

  try {
    const doc = await db.collection('shouhou_repair').doc(String(repairId)).get()
    if (!doc.data) {
      return { success: false, errMsg: '维修单不存在' }
    }

    const owner = doc.data._openid || ''
    if (owner && owner !== openid) {
      return { success: false, errMsg: '无权操作该维修单' }
    }

    const patch = normalizePatch(rawData)
    if (!Object.keys(patch).length) {
      return { success: false, errMsg: '无有效更新字段' }
    }

    if (!owner) {
      patch._openid = openid
    }

    scheduleWecomReturnNotify(patch, doc.data)

    // 用户已填寄回运单：取消「3 天后记得寄回」提醒
    if (patch.returnTrackingId !== undefined && String(patch.returnTrackingId || '').trim()) {
      patch.userReturnRemindSent = true
      patch.userReturnRemindLastError = 'cancelled_user_submitted_tracking'
    }

    await db.collection('shouhou_repair').doc(String(repairId)).update({ data: patch })

    // 正式：延迟满 2 天才由定时器推送；仅当 DELAY=0（测试）时才立刻 tick
    if (WECOM_RETURN_DELAY_MS === 0 && patch.wecomReturnNotifyAt) {
      try {
        await cloud.callFunction({
          name: 'wecomNotify',
          data: { action: 'tick', limit: 20 }
        })
      } catch (e) {
        console.warn('[userUpdateRepair] wecomNotify tick failed', e)
      }
    }

    return {
      success: true,
      wecomReturnNotifyAt: patch.wecomReturnNotifyAt || null
    }
  } catch (e) {
    return { success: false, errMsg: (e && e.message) || String(e) }
  }
}
