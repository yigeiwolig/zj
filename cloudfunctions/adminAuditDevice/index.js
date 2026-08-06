// cloudfunctions/adminAuditDevice/index.js

const cloud = require('wx-server-sdk')
const http = require('http')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function normalizeControlVariant(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (!s) return ''
  if (
    s === 'button' || s === 'btn' ||
    s === 'bluetooth' || s === 'ble' || s === 'bt' ||
    s.indexOf('按钮') >= 0 || s.indexOf('按键') >= 0 || s.indexOf('蓝牙') >= 0
  ) return 'button'
  if (s === 'remote' || s === '遥控' || s.indexOf('遥控') >= 0) return 'remote'
  return ''
}

function controlVariantLabel(raw) {
  const key = normalizeControlVariant(raw)
  if (key === 'button') return '按钮版'
  if (key === 'remote') return '遥控版'
  return ''
}

function normalizeSensorStamp(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'imu' || s === 'gyro' || s === 'mpu') return 'imu'
  if (s === 'tof' || s === 'height' || s === 'vl53') return 'tof'
  return ''
}

/** 管理端只读：无章视为测高旧版 */
function sensorStampLabel(raw) {
  const key = normalizeSensorStamp(raw)
  if (key === 'imu') return 'IMU(陀螺仪)'
  if (key === 'tof') return 'TOF(测高)'
  return ''
}

function sensorStampLabelForAdmin(raw, productModel) {
  const label = sensorStampLabel(raw)
  if (label) return label
  // 仅 F3 MAX 无章时标测高，避免其它型号刷屏
  if (String(productModel || '').trim().toUpperCase() === 'F3 MAX') return 'TOF(测高·无章)'
  return ''
}

/** YYYY-MM-DD 按本地日历解析，避免 new Date('YYYY-MM-DD') 走 UTC 导致差一天 */
function parseYmdLocal(raw) {
  const s = String(raw || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0)
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatYmdLocal(d) {
  if (!d || Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function addDaysLocal(base, days) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + Number(days || 0), 12, 0, 0, 0)
}

/** 到期日 → 剩余整天数（本地日历，当天算在保） */
function remainingDaysFromExpiry(expiryRaw) {
  const exp = typeof expiryRaw === 'string' ? parseYmdLocal(expiryRaw) : expiryRaw
  if (!exp || Number.isNaN(exp.getTime())) return 0
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  const expNoon = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate(), 12, 0, 0, 0)
  return Math.max(0, Math.round((expNoon.getTime() - today.getTime()) / 86400000))
}

async function assertAdmin(db) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

async function handleListPending(db) {
  const res = await db.collection('my_read')
    .where({ status: 'PENDING' })
    .orderBy('createTime', 'desc')
    .limit(50)
    .get()

  const data = (res.data || []).map((item) => {
    const openid = String(item.openid || item._openid || item.userOpenid || '').trim()
    return {
      ...item,
      openid,
      userOpenid: openid
    }
  })

  return { success: true, data }
}

/** 配置回溯：用户绑定申请历史（排除管理员自己提交的），含当前质保信息 */
async function handleListAudited(db, _) {
  // 1. 管理员 openid 集合，用于排除管理员自己提交的申请
  const adminSet = new Set()
  try {
    const adminRes = await db.collection('guanliyuan').limit(100).get()
    ;(adminRes.data || []).forEach((a) => {
      if (a.openid) adminSet.add(String(a.openid).trim())
      if (a._openid) adminSet.add(String(a._openid).trim())
    })
  } catch (e) {
    console.warn('[adminAuditDevice] list_audited load admins failed', e)
  }

  // 2. 分页拉取全部申请记录（含待审核/已通过，刚申请的也能看到）
  const PAGE = 100
  const rows = []
  let skip = 0
  for (let round = 0; round < 5; round++) {
    const res = await db.collection('my_read')
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(PAGE)
      .get()
    const batch = res.data || []
    rows.push(...batch)
    if (batch.length < PAGE) break
    skip += PAGE
  }

  // 3. 过滤规则：
  //    - 已拒绝的不显示
  //    - 管理员自己提交的申请：2026-07-18 之前的旧自测单隐藏，之后的显示（测试用）
  const ADMIN_SHOW_SINCE = new Date('2026-07-18T00:00:00+08:00').getTime()
  const isAdminApply = (r) => {
    if (r.submittedByAdmin === true) return true
    const openid = String(r.openid || r.userOpenid || r._openid || '').trim()
    return !!(openid && adminSet.has(openid))
  }
  const filtered = rows.filter((r) => {
    const status = String(r.status || '').trim().toUpperCase()
    if (status === 'REJECTED') return false
    if (isAdminApply(r)) {
      const t = r.createTime ? new Date(r.createTime).getTime() : 0
      if (!t || t < ADMIN_SHOW_SINCE) return false
    }
    return true
  })

  // 4. 关联 sn 集合档案：
  //    - 普通绑定按 my_read.sn 匹配
  //    - 故障核验按 faultClaimId = 申请ID 匹配（SN 可能已被补录改写）
  const snList = [...new Set(filtered.map((r) => String(r.sn || '').trim()).filter(Boolean))]
  const claimIds = filtered
    .filter((r) => (r.bindType || 'normal') === 'fault')
    .map((r) => r._id)

  const snMap = {}
  const claimMap = {}

  for (let i = 0; i < snList.length; i += 20) {
    const batch = snList.slice(i, i + 20)
    try {
      const devRes = await db.collection('sn').where({ sn: _.in(batch) }).get()
      ;(devRes.data || []).forEach((d) => {
        snMap[String(d.sn || '').trim()] = d
      })
    } catch (e) {
      console.warn('[adminAuditDevice] list_audited sn batch failed', e)
    }
  }

  for (let i = 0; i < claimIds.length; i += 20) {
    const batch = claimIds.slice(i, i + 20)
    try {
      const devRes = await db.collection('sn').where({ faultClaimId: _.in(batch) }).get()
      ;(devRes.data || []).forEach((d) => {
        claimMap[String(d.faultClaimId || '').trim()] = d
      })
    } catch (e) {
      console.warn('[adminAuditDevice] list_audited claim batch failed', e)
    }
  }

  const data = filtered.map((r) => {
    const isFault = (r.bindType || 'normal') === 'fault'
    const sn = String(r.sn || '').trim()
    // 故障核验优先用 faultClaimId 关联，找不到再退回按 SN
    const dev = (isFault ? claimMap[r._id] : null) || snMap[sn] || {}
    const status = String(r.status || '').trim().toUpperCase()
    const approved = status === 'APPROVED'
    // 只要档案存在且有质保天数就允许回溯修改（不再强绑 status）
    const editable = !!dev._id && Number(dev.totalDays) > 0
    const controlVariant =
      normalizeControlVariant(dev.controlVariant) ||
      normalizeControlVariant(r.controlVariant) ||
      ''
    const productModel = String(dev.productModel || r.productModel || '').trim()
    const sensorStamp = normalizeSensorStamp(dev.sensorStamp)
    let buyDate = ''
    if (dev.bindTime) {
      try {
        buyDate = formatYmdLocal(new Date(dev.bindTime))
      } catch (e) {
        buyDate = ''
      }
    }
    if (!buyDate) buyDate = String(r.buyDate || '').trim()
    return {
      _id: r._id,
      sn: String(dev.sn || sn || '').trim(),
      productModel,
      controlVariant,
      controlVariantLabel: controlVariantLabel(controlVariant),
      sensorStamp,
      sensorStampLabel: sensorStampLabelForAdmin(sensorStamp, productModel),
      bindType: r.bindType || 'normal',
      isAdminApply: isAdminApply(r),
      status: status || 'PENDING',
      buyDate,
      createTime: r.createTime || null,
      // 当前质保信息（来自 sn 集合）
      hasDevice: editable,
      approved,
      totalDays: dev.totalDays || 0,
      expiryDate: dev.expiryDate || '',
      remainingDays: (() => {
        if (!dev.expiryDate) return Number(dev.remainingDays) || 0
        try {
          return remainingDaysFromExpiry(dev.expiryDate)
        } catch (e) {
          return Number(dev.remainingDays) || 0
        }
      })(),
      bindTime: dev.bindTime || null,
      isActive: !!dev.isActive,
      warrantyRollbackAt: dev.warrantyRollbackAt || null
    }
  })

  return { success: true, data }
}

/** 配置回溯：完整重填型号 / 控制版本 / 购买日 / 质保（管理员纠错） */
async function handleRollbackWarranty(db, _, event, adminOpenid) {
  const targetSn = String(event.sn || '').trim()
  const claimId = String(event.claimId || event.recordId || '').trim()
  const days = parseInt(event.customDays)
  if (!days || days <= 0) return { success: false, errMsg: '质保天数无效' }

  const productModel = String(event.productModel || '').trim()
  const controlVariant = normalizeControlVariant(event.controlVariant || '')
  const customDateRaw = String(event.customDate || event.buyDate || '').trim()

  // 先按 SN 找；找不到再按 faultClaimId 兜底（故障核验补录后 SN 可能已变）
  let dev = null
  if (targetSn) {
    const devRes = await db.collection('sn').where({ sn: targetSn }).limit(1).get()
    if (devRes.data && devRes.data.length > 0) dev = devRes.data[0]
  }
  if (!dev && claimId) {
    const byClaim = await db.collection('sn').where({ faultClaimId: claimId }).limit(1).get()
    if (byClaim.data && byClaim.data.length > 0) dev = byClaim.data[0]
  }
  if (!dev) {
    return { success: false, errMsg: `设备档案不存在或已被删除` }
  }

  // 以原购买/绑定时间为基准重算到期日；允许传 customDate 顺带修正购买日期
  // 用本地日历日计算，避免 UTC 解析把购买日/到期日偏移一天
  let baseDate = null
  if (customDateRaw) {
    baseDate = parseYmdLocal(customDateRaw)
  } else if (dev.bindTime) {
    baseDate = parseYmdLocal(dev.bindTime) || new Date(dev.bindTime)
  }
  if (!baseDate || isNaN(baseDate.getTime())) baseDate = new Date()

  const expiryDateObj = addDaysLocal(baseDate, days)
  const expiryDateStr = formatYmdLocal(expiryDateObj)
  const remainingDays = remainingDaysFromExpiry(expiryDateObj)
  const buyDateStr = formatYmdLocal(baseDate)

  const updateData = {
    totalDays: days,
    expiryDate: expiryDateStr,
    remainingDays: remainingDays > 0 ? remainingDays : 0,
    warrantyRollbackAt: db.serverDate(),
    warrantyRollbackBy: adminOpenid,
    warrantyRollbackFrom: dev.totalDays || 0,
    configRollbackAt: db.serverDate(),
    configRollbackBy: adminOpenid
  }
  if (customDateRaw) {
    updateData.bindTime = baseDate
  }
  if (productModel) {
    updateData.productModel = productModel
  }
  if (controlVariant) {
    updateData.controlVariant = controlVariant
  }

  await db.collection('sn').doc(dev._id).update({ data: updateData })

  // 同步申请单，方便列表与再次审核看到最新值
  if (claimId) {
    const claimPatch = {}
    if (productModel) claimPatch.productModel = productModel
    if (controlVariant) claimPatch.controlVariant = controlVariant
    if (customDateRaw) claimPatch.buyDate = buyDateStr
    if (Object.keys(claimPatch).length > 0) {
      try {
        await db.collection('my_read').doc(claimId).update({ data: claimPatch })
      } catch (e) {
        console.warn('[adminAuditDevice] rollback sync my_read failed', e)
      }
    }
  }

  // 同步未完结报修单上的质保快照（需寄回/待处理列表否则仍显示旧剩余天数）
  const warrantyExpiredFlag = remainingDays <= 0
  const repairWarrantyPatch = {
    expiryDate: expiryDateStr,
    remainingDays: remainingDays > 0 ? remainingDays : 0,
    totalDays: days,
    warrantyExpired: warrantyExpiredFlag,
    'device.expiryDate': expiryDateStr,
    'device.days': remainingDays > 0 ? remainingDays : 0,
    'device.totalDays': days
  }
  if (productModel) {
    repairWarrantyPatch.model = productModel
    repairWarrantyPatch['device.productModel'] = productModel
  }
  if (controlVariant) {
    repairWarrantyPatch.controlVariant = controlVariant
    repairWarrantyPatch['device.controlVariant'] = controlVariant
  }
  try {
    const snForRepair = String(dev.sn || targetSn || '').trim()
    const openidForRepair = String(dev.openid || '').trim()
    const seen = new Set()
    const collect = async (where) => {
      const openRepairs = await db.collection('shouhou_repair').where({
        ...where,
        status: _.nin(['COMPLETED', 'RETURN_RECEIVED', 'DELETED', 'CANCELLED', 'REPAIR_COMPLETED_SENT'])
      }).limit(50).get()
      return openRepairs.data || []
    }
    let rows = []
    if (snForRepair) {
      rows = rows.concat(await collect({ 'device.sn': snForRepair }))
      rows = rows.concat(await collect({ sn: snForRepair }))
    }
    if (openidForRepair) {
      rows = rows.concat(await collect({ _openid: openidForRepair }))
      rows = rows.concat(await collect({ openid: openidForRepair }))
    }
    const modelForRepair = String(productModel || dev.productModel || '').trim()
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row._id || seen.has(row._id)) continue
      const rowSn = String((row.device && row.device.sn) || row.sn || '').trim()
      const rowModel = String((row.device && row.device.productModel) || row.model || '').trim()
      // openid 兜底：同 SN 直接改；无 SN 时按同型号改；有不同 SN 则跳过
      if (openidForRepair && snForRepair && rowSn && rowSn !== snForRepair) continue
      if (openidForRepair && !rowSn && modelForRepair && rowModel && rowModel !== modelForRepair) continue
      seen.add(row._id)
      const patch = { ...repairWarrantyPatch }
      // 工单缺 SN 时补上，后续列表才能按 sn 实时刷质保
      if (snForRepair && !rowSn) {
        patch.sn = snForRepair
        patch['device.sn'] = snForRepair
      }
      try {
        await db.collection('shouhou_repair').doc(row._id).update({ data: patch })
      } catch (e) {
        console.warn('[adminAuditDevice] rollback sync repair failed', row._id, e)
      }
    }
  } catch (e) {
    console.warn('[adminAuditDevice] rollback sync repairs query failed', e)
  }

  const remShow = remainingDays > 0 ? remainingDays : 0
  const parts = [
    `总质保 ${days} 天`,
    `剩余 ${remShow} 天`,
    `到期 ${expiryDateStr}`
  ]
  if (productModel) parts.push(`型号 ${productModel}`)
  if (controlVariant) parts.push(controlVariantLabel(controlVariant))
  if (customDateRaw) parts.push(`购买日 ${buyDateStr}`)

  return {
    success: true,
    msg: parts.join(' · '),
    totalDays: days,
    expiryDate: expiryDateStr,
    remainingDays: remShow,
    productModel: productModel || String(dev.productModel || '').trim(),
    controlVariant: controlVariant || normalizeControlVariant(dev.controlVariant) || '',
    controlVariantLabel: controlVariantLabel(controlVariant || dev.controlVariant),
    buyDate: buyDateStr
  }
}

function resolveApplicantOpenid(applyData, applicantOpenidFromClient, adminOpenid) {
  let applicantOpenid = String(
    applyData.openid ||
    applyData.userOpenid ||
    applyData._openid ||
    applicantOpenidFromClient ||
    ''
  ).trim()

  // 故障核验：管理员自测 / 历史单缺 openid
  if (!applicantOpenid && applyData.bindType === 'fault') {
    if (applyData.submittedByAdmin === true) {
      applicantOpenid = String(applyData.openid || applyData._openid || adminOpenid || '').trim()
    } else if (applicantOpenidFromClient) {
      applicantOpenid = String(applicantOpenidFromClient).trim()
    } else if (
      adminOpenid &&
      !applyData.openid &&
      !applyData.userOpenid &&
      !applyData._openid
    ) {
      // 无任何申请人字段的历史自测单：审核管理员即申请人
      applicantOpenid = adminOpenid
    }
  }

  return applicantOpenid
}

// 🔴 调试日志辅助函数
function sendDebugLog(location, message, data, hypothesisId) {
  // 同时使用 console.log 和 HTTP 请求
  console.log('[DEBUG]', location, message, JSON.stringify(data))
  
  try {
    const logData = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'warranty-debug',
      hypothesisId
    })
    
    const options = {
      hostname: '127.0.0.1',
      port: 7242,
      path: '/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(logData)
      },
      timeout: 1000 // 1秒超时
    }
    
    const req = http.request(options, () => {})
    req.on('error', (e) => {
      console.error('[DEBUG] HTTP log failed:', e.message)
    })
    req.on('timeout', () => {
      req.destroy()
    })
    req.write(logData)
    req.end()
  } catch (e) {
    console.error('[DEBUG] Log function error:', e)
  }
}


async function notifyUserSubscribe(openid, scene) {
  const touser = String(openid || '').trim()
  if (!touser || !scene) return
  try {
    await cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: { openid: touser, scene }
    })
  } catch (e) {
    console.warn('[adminAuditDevice] subscribe notify failed', scene, e)
  }
}
exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  // 接收前端传来的自定义参数：customDate(管理员改的时间), customDays(管理员选的天数)
  // productModel：管理员可修正用户申报的设备型号
  // applicantOpenid：前端列表里带的申请人 openid，作为兜底（历史单据可能缺字段）
  const {
    id,
    action,
    customDate,
    customDays,
    productModel: productModelFromClient,
    controlVariant: controlVariantFromClient,
    applicantOpenid: applicantOpenidFromClient
  } = event

  const PRODUCT_DETAIL_OPTIONS = [
    'F1 PRO', 'F1 MAX', 'F1 ULTRA',
    'F2 PRO', 'F2 MAX', 'F2 ULTRA', 'F2 Long',
    'F3 PRO', 'F3 MAX'
  ]
  function normalizeAuditProductModel(raw) {
    const s = String(raw || '').trim()
    if (!s) return ''
    const aliases = {
      'F1 Pro Max': 'F1 ULTRA',
      'F1 ultra': 'F1 ULTRA',
      'F2 MAX Long': 'F2 Long',
      'F2 MAX LONG': 'F2 Long',
      'F2 Max Long': 'F2 Long'
    }
    if (aliases[s]) return aliases[s]
    const hit = PRODUCT_DETAIL_OPTIONS.find((m) => m.toUpperCase() === s.toUpperCase())
    return hit || s
  }

  try {
    const adminOpenid = await assertAdmin(db)

    if (action === 'list_pending') {
      return await handleListPending(db)
    }

    if (action === 'list_audited') {
      return await handleListAudited(db, _)
    }

    if (action === 'rollback_warranty') {
      return await handleRollbackWarranty(db, _, event, adminOpenid)
    }

    if (!id || String(id).startsWith('preview-')) {
      return { success: false, errMsg: '无效的申请记录，请刷新后重试' }
    }

    // 1. 获取申请详情
    const applyRes = await db.collection('my_read').doc(id).get()
    const applyData = applyRes.data || {}

    const applicantOpenid = resolveApplicantOpenid(
      applyData,
      applicantOpenidFromClient,
      adminOpenid
    )

    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:main', '获取申请详情', { 
      id, 
      applicantOpenid, 
      sn: applyData.sn, 
      hasOpenid: !!applicantOpenid,
      has_openid: !!applyData._openid,
      has_openid_field: !!applyData.openid,
      submittedByAdmin: !!applyData.submittedByAdmin,
      allKeys: Object.keys(applyData)
    }, 'B')
    // #endregion
    
    if (!applicantOpenid) {
      console.error('[adminAuditDevice] 无法获取申请人 openid，申请记录:', {
        id,
        keys: Object.keys(applyData),
        bindType: applyData.bindType
      })
      return {
        success: false,
        errMsg: '无法获取申请人信息。请让用户重新提交故障核验申请后再审（旧申请缺 openid）'
      }
    }

    // 补写 openid，避免后续步骤 / 再次审核再踩坑
    if (!applyData.openid) {
      try {
        await db.collection('my_read').doc(id).update({
          data: { openid: applicantOpenid }
        })
      } catch (e) {
        console.warn('[adminAuditDevice] backfill openid failed', e)
      }
    }

    if (action === 'reject') {
      await db.collection('my_read').doc(id).update({ data: { status: 'REJECTED' } })
      return { success: true, msg: '已拒绝' }
    }

    if (action === 'approve') {
      // === A. 使用管理员设定的日期 ===
      const finalDate = customDate ? new Date(customDate) : new Date(applyData.buyDate)
      // 管理员可修正用户申报的型号（蓝牙申报不一定准）
      const finalProductModel =
        normalizeAuditProductModel(productModelFromClient) ||
        normalizeAuditProductModel(applyData.productModel) ||
        String(applyData.productModel || '').trim()
      if (!finalProductModel) {
        return { success: false, errMsg: '请选择设备型号' }
      }
      const finalControlVariant =
        normalizeControlVariant(controlVariantFromClient) ||
        normalizeControlVariant(applyData.controlVariant) ||
        ''
      if (!finalControlVariant) {
        return { success: false, errMsg: '请选择按钮版或遥控版' }
      }
      
      // === B. 计算固件版本 (V年尾.月.3) ===
      // 基于设定的购买日期来生成版本，或者基于当前时间，这里建议用设定日期
      const yearShort = finalDate.getFullYear() % 10
      const month = finalDate.getMonth() + 1
      const firmwareVer = `V${yearShort}.${month}.3`

      // === C. 计算到期日 ===
      const days = parseInt(customDays) || 365 // 使用管理员传来的天数
      const expiryDateObj = new Date(finalDate.getTime() + days * 24 * 60 * 60 * 1000)
      const expiryDateStr = expiryDateObj.toISOString().split('T')[0]

      // === E. 更新 sn 集合 ===
      // 🔴 获取申请人的 openid（从 my_read 文档的 _openid 字段）
      const userOpenid = applicantOpenid
      
      console.log('[adminAuditDevice] 申请人 openid:', userOpenid, 'SN:', applyData.sn)
      
      // 🔴 先检查是否有待生效延保记录，计算总延保天数
      let pendingWarrantyDays = 0
      if (userOpenid) {
        const pendingRes = await db.collection('pending_warranty')
          .where({
            openid: userOpenid,
            status: 'pending'
          })
          .get()
        
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '查询待生效延保记录', { userOpenid, sn: applyData.sn, recordCount: pendingRes.data.length, records: pendingRes.data.map(r => ({ _id: r._id, warrantyDays: r.warrantyDays })) }, 'E')
        // #endregion
        
        pendingRes.data.forEach(record => {
          pendingWarrantyDays += record.warrantyDays || 30
        })
        
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '计算待生效延保总天数', { userOpenid, sn: applyData.sn, pendingWarrantyDays }, 'E')
        // #endregion
      }
      
      // 计算最终的总天数（基础天数 + 待生效延保天数）
      const finalTotalDays = days + pendingWarrantyDays
      const finalExpiryDateObj = new Date(finalDate.getTime() + finalTotalDays * 24 * 60 * 60 * 1000)
      const finalExpiryDateStr = finalExpiryDateObj.toISOString().split('T')[0]
      
      // === D. 计算剩余天数（使用包含待生效延保的最终日期） ===
      const now = new Date()
      // 如果购买日期是未来的，或者刚买，剩余天数就是总天数；否则减去已过天数
      const diffTime = finalExpiryDateObj - now
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '计算最终延保信息', { userOpenid, sn: applyData.sn, baseDays: days, pendingWarrantyDays, finalTotalDays, finalExpiryDate: finalExpiryDateStr, remainingDays }, 'E')
      // #endregion

      const isFaultClaim = applyData.bindType === 'fault'
      let targetSn = String(applyData.sn || '').trim()

      if (isFaultClaim) {
        const existingFault = await db.collection('sn').where({
          openid: userOpenid,
          isActive: true,
          bindSource: 'fault_claim'
        }).limit(1).get()

        if (existingFault.data.length > 0) {
          return { success: false, errMsg: '该用户已有故障核验档案，请勿重复审核' }
        }

        // 仅保存质保档案，不立即待录入 SN；是否待录入由售后诊断书（主板/控制器）决定
        const claimSn = `FAULT-CLAIM-${String(id).slice(-8).toUpperCase()}`

        const addRes = await db.collection('sn').add({
          data: {
            sn: claimSn,
            name: finalProductModel,
            productModel: finalProductModel,
            controlVariant: finalControlVariant,
            firmware: firmwareVer,
            expiryDate: finalExpiryDateStr,
            totalDays: finalTotalDays,
            remainingDays: remainingDays > 0 ? remainingDays : 0,
            activations: 0,
            hasExtra: false,
            bindTime: finalDate instanceof Date ? finalDate.toISOString() : finalDate,
            imgReceipt: applyData.imgReceipt,
            isActive: true,
            openid: userOpenid,
            snPending: false,
            faultAwaitingDiagnosis: true,
            faultAutoBind: false,
            faultScheme: '',
            bindSource: 'fault_claim',
            faultClaimId: id,
            createTime: db.serverDate()
          }
        })

        await db.collection('my_read').doc(id).update({
          data: {
            status: 'APPROVED',
            sn: claimSn,
            productModel: finalProductModel,
            controlVariant: finalControlVariant
          }
        })

        // 关联用户未完结售后工单，供诊断书判定 A/B 方案
        try {
          const repairRes = await db.collection('shouhou_repair')
            .where(_.or([{ _openid: userOpenid }, { openid: userOpenid }]))
            .orderBy('createTime', 'desc')
            .limit(20)
            .get()
          const openRepair = (repairRes.data || []).find((row) => {
            const st = String(row.status || '').trim().toUpperCase()
            return !['COMPLETED', 'RETURN_RECEIVED', 'REPAIR_COMPLETED_SENT', 'TUTORIAL'].includes(st)
          })
          if (openRepair && openRepair._id) {
            await db.collection('shouhou_repair').doc(openRepair._id).update({
              data: {
                faultClaimId: id,
                faultClaimSnDocId: addRes._id
              }
            })
          }
        } catch (linkErr) {
          console.warn('[adminAuditDevice] link fault claim to repair failed', linkErr)
        }

        if (userOpenid && pendingWarrantyDays > 0) {
          const pendingRes = await db.collection('pending_warranty')
            .where({ openid: userOpenid, status: 'pending' })
            .get()
          const recordIds = pendingRes.data.map(r => r._id)
          for (const recordId of recordIds) {
            await db.collection('pending_warranty').doc(recordId).update({
              data: {
                status: 'applied',
                appliedAt: db.serverDate(),
                appliedSn: claimSn
              }
            })
          }
        }

        await notifyUserSubscribe(userOpenid, 'fault_bind_ok')
        return {
          success: true,
          msg: '故障核验已通过，质保档案已创建；待售后诊断书确认是否需录入新机 SN'
        }
      }

      if (!targetSn) {
        return { success: false, errMsg: '设备 SN 无效' }
      }
      
      // 更新 sn 集合，确保设置 openid
      // 🔴 修复：先查询设备是否存在
      const deviceRes = await db.collection('sn').where({
        sn: targetSn
      }).get()
      
      if (deviceRes.data.length === 0) {
        console.error('[adminAuditDevice] 设备不存在，SN:', targetSn)
        return { success: false, errMsg: '设备不存在，请检查SN是否正确' }
      }
      
      // 🔴 修复：确保 openid 被设置（必须设置，不能为空）
      const updateData = {
        productModel: finalProductModel,
        name: finalProductModel,
        controlVariant: finalControlVariant,
        firmware: firmwareVer,
        expiryDate: finalExpiryDateStr, // 🔴 使用包含待生效延保的最终日期
        totalDays: finalTotalDays, // 🔴 使用包含待生效延保的最终天数
        remainingDays: remainingDays > 0 ? remainingDays : 0,
        
        // 【核心修复】新机审核通过，激活次数初始为 1
        activations: 1, 
        
        hasExtra: false,
        bindTime: finalDate, // 绑定时间改为购买时间
        imgReceipt: applyData.imgReceipt,
        
        // 【核心修复】标记为已激活，用户端靠这个字段过滤显示
        isActive: true,
        
        // 🔴 修复：必须设置 openid，不能为空
        openid: userOpenid
      }
      
      console.log('[adminAuditDevice] 准备更新设备，SN:', targetSn, 'openid:', userOpenid, 'updateData keys:', Object.keys(updateData))
      
      const updateResult = await db.collection('sn').where({
        sn: targetSn
      }).update({
        data: updateData
      })
      
      console.log('[adminAuditDevice] 设备更新结果，updated:', updateResult.stats?.updated || 0)
      
      // 🔴 验证更新是否成功
      const verifyRes = await db.collection('sn').where({
        sn: targetSn,
        openid: userOpenid,
        isActive: true
      }).get()
      
      console.log('[adminAuditDevice] 验证更新结果，查询到的设备数量:', verifyRes.data.length)
      if (verifyRes.data.length === 0) {
        console.error('[adminAuditDevice] 警告：更新后验证失败，设备可能未正确更新，SN:', targetSn, 'openid:', userOpenid)
      }

      // 更新申请单状态（同步修正后的型号）
      await db.collection('my_read').doc(id).update({
        data: {
          status: 'APPROVED',
          productModel: finalProductModel,
          controlVariant: finalControlVariant
        }
      })

      // 🔴 设备审核通过：更新待生效延保记录状态为"已生效"
      if (userOpenid && pendingWarrantyDays > 0) {
        const pendingRes = await db.collection('pending_warranty')
          .where({
            openid: userOpenid,
            status: 'pending'
          })
          .get()
        
        const recordIds = pendingRes.data.map(r => r._id)
        for (const recordId of recordIds) {
          await db.collection('pending_warranty').doc(recordId).update({
            data: {
              status: 'applied',
              appliedAt: db.serverDate(),
              appliedSn: targetSn
            }
          })
        }
        
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:approve', '待生效延保记录状态更新完成', { userOpenid, sn: applyData.sn, recordIdsCount: recordIds.length }, 'E')
        // #endregion
        
        console.log('[adminAuditDevice] 已更新', recordIds.length, '条待生效延保记录为已生效')
      }

      await notifyUserSubscribe(userOpenid, 'bind_approved')
      return { success: true, msg: '同步成功' }
    }

  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: err.toString() }
  }
}

// 🔴 新增：应用待生效延保记录（与 bindDevice 中的逻辑一致）
async function applyPendingWarranty(db, _, openid, sn) {
  // #region agent log
  sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '函数入口', { openid, sn }, 'C')
  // #endregion
  
  try {
    // 1. 查询该 openid 的所有待生效延保记录
    const pendingRes = await db.collection('pending_warranty')
      .where({
        openid: openid,
        status: 'pending'
      })
      .get()
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '查询待生效延保记录结果', { openid, sn, recordCount: pendingRes.data.length, records: pendingRes.data.map(r => ({ _id: r._id, warrantyDays: r.warrantyDays })) }, 'C')
    // #endregion
    
    if (pendingRes.data.length === 0) {
      console.log('[adminAuditDevice] 该用户无待生效延保记录')
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '无待生效延保记录，提前返回', { openid, sn }, 'C')
      // #endregion
      return
    }
    
    // 2. 计算总延保天数（累加所有待生效记录）
    let totalDays = 0
    pendingRes.data.forEach(record => {
      totalDays += record.warrantyDays || 30
    })
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '计算总延保天数', { openid, sn, totalDays, recordCount: pendingRes.data.length }, 'D')
    // #endregion
    
    // 3. 给设备增加延保时间
    const devRes = await db.collection('sn').where({ sn: sn }).get()
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '查询设备结果', { openid, sn, deviceFound: devRes.data.length > 0, deviceId: devRes.data[0]?._id, oldExpiryDate: devRes.data[0]?.expiryDate, oldTotalDays: devRes.data[0]?.totalDays }, 'D')
    // #endregion
    
    if (devRes.data.length > 0) {
      const device = devRes.data[0]
      
      // 🔴 检查设备是否有到期日，如果没有则使用当前时间作为基准
      if (!device.expiryDate) {
        console.warn('[adminAuditDevice] 设备没有到期日，使用当前时间作为基准:', sn)
        // #region agent log
        sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '设备没有到期日，使用当前时间', { openid, sn }, 'D')
        // #endregion
      }
      
      const oldDate = device.expiryDate ? new Date(device.expiryDate) : new Date()
      const newDate = new Date(oldDate.getTime() + totalDays * 24 * 60 * 60 * 1000)
      const newDateStr = newDate.toISOString().split('T')[0]
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '准备更新设备延保', { openid, sn, deviceId: device._id, oldExpiryDate: device.expiryDate, newExpiryDate: newDateStr, totalDays, oldTotalDays: device.totalDays }, 'D')
      // #endregion
      
      const updateResult = await db.collection('sn').doc(device._id).update({
        data: {
          expiryDate: newDateStr,
          hasReward: true,
          totalDays: _.inc(totalDays)
        }
      })
      
      // #region agent log
      sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '设备延保更新结果', { openid, sn, deviceId: device._id, updated: updateResult.stats.updated, newExpiryDate: newDateStr, totalDays }, 'D')
      // #endregion
      
      console.log('[adminAuditDevice] 已应用待生效延保，总天数:', totalDays)
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
    
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '待生效延保记录状态更新完成', { openid, sn, recordIdsCount: recordIds.length }, 'D')
    // #endregion
    
    console.log('[adminAuditDevice] 已更新', recordIds.length, '条待生效延保记录为已生效')
  } catch (err) {
    console.error('[adminAuditDevice] 应用待生效延保失败:', err)
    // #region agent log
    sendDebugLog('cloudfunctions/adminAuditDevice/index.js:applyPendingWarranty', '应用待生效延保失败', { openid, sn, error: err.toString(), errorMessage: err.message }, 'D')
    // #endregion
    // 不抛出错误，避免影响审核流程
  }
}
