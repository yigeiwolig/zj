/**
 * 企业微信群机器人通知
 *
 * 环境变量（云开发控制台 → 云函数 wecomNotify → 配置）：
 *   WECOM_WEBHOOK_RETURN      = 寄回/维修/诊断默认群（必填）
 *   WECOM_WEBHOOK_DIAGNOSIS   = 诊断书专用 Webhook（可选；未配则复用 RETURN）
 *   WECOM_WEBHOOK_SHOP        = 购物待发货专用群
 *   WECOM_WEBHOOK_ADMIN       = 管理待办 1~6（可选覆盖；未配时用内置管理群 Webhook）
 *
 * 能力：
 * - 寄回运单满 2 天提醒（定时 tick）
 * - 保存诊断书立刻推送（notifyDiagnosis）
 * - 管理员手动重推寄回（resendReturnArrive）
 * - 购物付款成功待发货（notifyShopOrderPaid → SHOP Webhook）
 * - 管理待办：绑定/故障/报修/案例视频/截图风险/可疑人员（notifyAdminTodo → 管理群，不复用寄回群）
 */
const cloud = require('wx-server-sdk')
const https = require('https')
const { URL } = require('url')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const DELAY_MS = 2 * 24 * 60 * 60 * 1000 // 满 2 天（今天寄、后天发）
const TERMINAL_STATUS = new Set([
  'REPAIR_COMPLETED_SENT',
  'RETURN_RECEIVED',
  'COMPLETED',
  'DELETED',
  'CANCELLED'
])

function getEnv(name) {
  return String((process.env && process.env[name]) || '').trim()
}

function getReturnWebhook() {
  return getEnv('WECOM_WEBHOOK_RETURN')
}

/** 诊断书推送：可单独配 WECOM_WEBHOOK_DIAGNOSIS；未配则复用寄回群 */
function getDiagnosisWebhook() {
  return getEnv('WECOM_WEBHOOK_DIAGNOSIS') || getReturnWebhook()
}

/** 购物待发货：必须单独配 WECOM_WEBHOOK_SHOP（另一群，不复用寄回群） */
function getShopWebhook() {
  return getEnv('WECOM_WEBHOOK_SHOP')
}

/**
 * 管理待办 1~6 专用群（绑定/故障/报修/案例/截图/可疑）
 * - 绝不回退到寄回群 / 诊断群
 * - 可用 WECOM_WEBHOOK_ADMIN 覆盖；未配则用默认管理群
 */
const DEFAULT_ADMIN_TODO_WEBHOOK =
  'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=b6699957-2693-4aaf-875b-faafdc2c767a'

function getAdminTodoWebhook() {
  return getEnv('WECOM_WEBHOOK_ADMIN') || DEFAULT_ADMIN_TODO_WEBHOOK
}

function postJson(urlStr, body) {
  return new Promise((resolve, reject) => {
    let u
    try {
      u = new URL(urlStr)
    } catch (e) {
      reject(new Error('Webhook 地址无效'))
      return
    }
    const payload = JSON.stringify(body)
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 12000
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => { raw += c })
        res.on('end', () => {
          let json = null
          try { json = JSON.parse(raw || '{}') } catch (e) { json = { raw } }
          if (res.statusCode >= 200 && res.statusCode < 300 && (!json || json.errcode === 0 || json.errcode == null)) {
            resolve(json)
          } else {
            reject(new Error((json && (json.errmsg || json.errMsg)) || raw || `HTTP ${res.statusCode}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Webhook 请求超时'))
    })
    req.write(payload)
    req.end()
  })
}

function fmtTime(v) {
  if (!v) return ''
  if (typeof v === 'string' && (v === '__SERVER_DATE__' || v.indexOf('SERVER_DATE') >= 0)) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 业务日按北京时间（UTC+8）切日 */
function chinaDateParts(date = new Date()) {
  const ms = (date instanceof Date ? date : new Date(date)).getTime() + 8 * 60 * 60 * 1000
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const p = (n) => (n < 10 ? `0${n}` : `${n}`)
  return {
    key: `${y}-${p(m)}-${p(day)}`,
    label: `${y}年${m}月${day}日`
  }
}

function formatDailyOrderLine(label, seq) {
  return `${label} · 第 ${seq} 单`
}

/**
 * 分配当日第几单（全集共享计数：寄回/诊断/付费等每推一条 +1）
 * 集合 wecom_daily_seq，文档 id = YYYY-MM-DD
 * 注意：云库对不存在的 doc 调 update 会报 document.update:fail，须先 get/set
 */
async function allocDailyOrderSeq() {
  const { key, label } = chinaDateParts()
  const ref = db.collection('wecom_daily_seq').doc(key)

  const readExistingSeq = async () => {
    try {
      const g = await ref.get()
      const cur = g && g.data
      if (cur && cur.seq != null && !Number.isNaN(Number(cur.seq))) {
        return Number(cur.seq)
      }
      // 文档存在但无 seq，或 get 到空 data
      return cur ? 0 : null
    } catch (e) {
      // 部分环境对不存在文档会直接抛 DOCUMENT_NOT_EXIST
      const msg = String((e && (e.errMsg || e.message)) || e || '')
      if (/not exist|DoesNotExist|DOCUMENT_NOT_EXIST|not found/i.test(msg)) return null
      throw e
    }
  }

  try {
    const existing = await readExistingSeq()
    if (existing === null) {
      try {
        await ref.set({
          data: { seq: 1, date: key, updatedAt: db.serverDate() }
        })
        return { key, label, seq: 1, line: formatDailyOrderLine(label, 1) }
      } catch (setErr) {
        // 并发创建：再 read + inc
        const again = await readExistingSeq()
        if (again == null) throw setErr
        const next = Number(again) + 1
        await ref.update({ data: { seq: next, updatedAt: db.serverDate() } })
        return { key, label, seq: next, line: formatDailyOrderLine(label, next) }
      }
    }
    const next = Number(existing) + 1
    await ref.update({
      data: { seq: next, updatedAt: db.serverDate() }
    })
    return { key, label, seq: next, line: formatDailyOrderLine(label, next) }
  } catch (e) {
    console.warn('[wecomNotify] allocDailyOrderSeq failed, use soft seq', e)
    // 不阻断推送：用「当天分钟序」作软序号
    const soft = (new Date().getHours() * 60 + new Date().getMinutes()) + 1
    return { key, label, seq: soft, line: formatDailyOrderLine(label, soft), soft: true }
  }
}

function withDailyOrderLine(content, line) {
  const body = String(content || '').trim()
  const head = String(line || '').trim()
  if (!head) return body
  if (!body) return head
  return `${head}\n\n${body}`
}

function formatAddress(repair) {
  const ra = repair.returnAddress || {}
  if (ra.name || ra.phone || ra.address) {
    return [ra.name, ra.phone, ra.address].filter(Boolean).join(' ')
  }
  const c = repair.contact || {}
  return [c.name, c.phone, c.address].filter(Boolean).join(' ') || '未填写'
}

function formatWarranty(repair) {
  if (repair.warrantyExpired === true) return '已过保'
  const days = repair.remainingDays
  if (days !== undefined && days !== null && !Number.isNaN(Number(days))) {
    const n = Number(days)
    return n > 0 ? `剩余 ${n} 天` : '已过保'
  }
  if (repair.device && repair.device.days !== undefined && repair.device.days !== null) {
    const n = Number(repair.device.days)
    if (!Number.isNaN(n)) return n > 0 ? `剩余 ${n} 天` : '已过保'
  }
  if (repair.expiryDate) {
    const exp = new Date(repair.expiryDate)
    if (!Number.isNaN(exp.getTime())) {
      const diff = Math.ceil((exp.getTime() - Date.now()) / 86400000)
      return diff > 0 ? `剩余 ${diff} 天` : '已过保'
    }
  }
  return '未知'
}

async function resolveNickname(repair) {
  if (repair.userNickname) return String(repair.userNickname)
  if (repair.creatorNickname) return String(repair.creatorNickname)
  if (repair.nickName) return String(repair.nickName)
  if (repair.nickname) return String(repair.nickname)
  const openid = repair._openid
  if (!openid) return '未知用户'
  const tryColl = async (name) => {
    try {
      const r = await db.collection(name).where({ _openid: openid }).limit(1).get()
      const u = r.data && r.data[0]
      if (!u) return ''
      return String(
        (u.userInfo && u.userInfo.nickName) ||
        u.nickName ||
        u.nickname ||
        ''
      ).trim()
    } catch (e) {
      return ''
    }
  }
  const fromUsers = await tryColl('users')
  if (fromUsers) return fromUsers
  const fromList = await tryColl('user_list')
  if (fromList) return fromList
  return '未知用户'
}

function isWarrantyExpiredRepair(repair) {
  if (!repair) return false
  if (repair.warrantyExpired === true) return true
  const days = repair.remainingDays
  if (days !== undefined && days !== null && !Number.isNaN(Number(days))) {
    return Number(days) <= 0
  }
  if (repair.expiryDate) {
    const exp = new Date(repair.expiryDate)
    if (!Number.isNaN(exp.getTime())) return exp.getTime() <= Date.now()
  }
  return false
}

function isRepairFeePaid(repair) {
  return !!(repair && (repair.repairPaid === true || repair.feePaid === true))
}

function formatOrderAddress(address) {
  if (!address || typeof address !== 'object') return ''
  const parts = [
    address.name || address.receiver || address.userName,
    address.phone || address.tel || address.mobile,
    address.province || address.selectedProvince,
    address.city || address.selectedCity,
    address.district || address.selectedDistrict,
    address.address || address.detail || address.detailAddress
  ].filter(Boolean)
  if (parts.length) return parts.join(' ')
  return String(address.fullAddress || address.full_address || '').trim()
}

function formatShopGoodsBrief(goodsList) {
  const list = Array.isArray(goodsList) ? goodsList : []
  if (!list.length) return '无'
  return list
    .map((g) => {
      const name = String((g && (g.name || g.title)) || '商品').trim()
      const qty = Number((g && (g.quantity != null ? g.quantity : g.count)) || 1)
      return `${name}×${qty > 0 ? qty : 1}`
    })
    .join('；')
}

function formatShopPayYuan(order) {
  const n = Number(order && order.totalFee)
  if (!Number.isFinite(n)) return ''
  return `¥${n.toFixed(2)}`
}

function formatShipMethod(shippingOrCode) {
  const raw = (shippingOrCode && typeof shippingOrCode === 'object')
    ? (shippingOrCode.method || shippingOrCode.shippingMethod || '')
    : shippingOrCode
  const m = String(raw || '').toLowerCase().trim()
  if (m === 'sf' || m === 'shunfeng' || m.indexOf('顺丰') >= 0) return '顺丰速运'
  if (m === 'zto' || m === 'zt' || m === 'zhongtong' || m.indexOf('中通') >= 0) return '中通快递'
  if (!m || m === 'none') return '未选择（请核对）'
  return String(raw)
}

/** 维修单上用户选的寄出快递（填写收货信息时写入 contact.shippingMethod） */
function resolveRepairExpressLabel(repair) {
  const c = (repair && repair.contact) || {}
  const code =
    c.shippingMethod ||
    (repair && repair.shippingMethod) ||
    (repair && repair.shipping && repair.shipping.method) ||
    ''
  return formatShipMethod(code)
}

/** 购物付款成功：待发货（售后配件 / MT商城），不含维修费 */
function buildShopOrderPaidText(order) {
  const source = String((order && order.orderSource) || '').trim()
  const channel = source === 'shouhou' ? '售后配件' : 'MT商城'
  const nick = String((order && (order.userNickname || order.nickName || order.nickname)) || '用户').trim()
  const orderId = String((order && order.orderId) || '').trim() || '未知'
  const amount = formatShopPayYuan(order)
  const goods = formatShopGoodsBrief(order && order.goodsList)
  const address = formatOrderAddress(order && order.address) || '未填写'
  const ship = formatShipMethod(order && order.shipping)
  const guided = !!(order && order.repairId) && source === 'shouhou'

  return [
    `### 【待发货】${channel}`,
    '要做：按收货地址发货',
    guided ? '说明：引导购买配件订单' : '',
    `用户：${nick}`,
    amount ? `实付：${amount}` : '',
    `商品：${goods}`,
    `寄出快递：${ship}`,
    `收货地址（用户填写）：${address}`,
    `订单号：${orderId}`
  ].filter(Boolean).join('\n')
}

async function loadShopOrderByOrderId(orderId) {
  const id = String(orderId || '').trim()
  if (!id) return null
  try {
    const res = await db.collection('shop_orders').where({ orderId: id }).limit(1).get()
    return (res.data && res.data[0]) || null
  } catch (e) {
    console.warn('[wecomNotify] load shop_orders failed', e)
    return null
  }
}

function buildReturnArriveText(repair, nick, opts = {}) {
  const tracking = String(repair.returnTrackingId || '').trim() || '未填写'
  const internal = String(repair.returnNoteInternal || '').trim() || '无'
  const model = String(repair.model || (repair.device && repair.device.model) || '').trim() || '未知型号'
  const expired = isWarrantyExpiredRepair(repair)
  const paid = isRepairFeePaid(repair)
  // returnAddress / contact：用户填写的「收件地址」，不是用户寄出包裹的发件地
  const address = formatAddress(repair)
  const express = resolveRepairExpressLabel(repair)
  const rePush = opts.manual ? '（重推）' : ''

  // 过保未付：只要催款 + 用户寄回运单，不要地址
  if (expired && !paid) {
    return [
      `### 【待收款】${rePush}`,
      '要做：联系用户付维修费',
      `用户：${nick}　｜　${model}`,
      `用户寄回运单：${tracking}`,
      `内部备注：${internal}`
    ].join('\n')
  }

  // 过保已付 / 支付触发：可回寄，突出用户填写的收货地址 + 寄出快递
  if (expired && paid) {
    return [
      `### 【可回寄】过保${rePush}`,
      '要做：按收货地址把修好的寄回给用户',
      `用户：${nick}　｜　${model}`,
      `用户寄回运单：${tracking}`,
      `寄出快递：${express}`,
      `收货地址（用户填写）：${address}`,
      `内部备注：${internal}`
    ].join('\n')
  }

  // 在保
  return [
    `### 【可回寄】在保${rePush}`,
    '要做：按收货地址寄回给用户',
    `用户：${nick}　｜　${model}`,
    `用户寄回运单：${tracking}`,
    `质保：${formatWarranty(repair)}`,
    `寄出快递：${express}`,
    `收货地址（用户填写）：${address}`,
    `内部备注：${internal}`
  ].join('\n')
}

function buildDiagnosisText(repair, nick, opts = {}) {
  const model = String(repair.model || (repair.device && repair.device.model) || '').trim() || '未知型号'
  const diagnosis = String(opts.adminDiagnosis || repair.adminDiagnosis || '').trim() || '（无）'
  const needsBoard = !!opts.needsBoard
  const sn = String(repair.replacementOldSn || (repair.device && repair.device.sn) || '').trim()
  const address = formatAddress(repair)
  const express = resolveRepairExpressLabel(repair)

  if (needsBoard) {
    return [
      '### 【诊断·主板】先换绑 SN',
      '要做：控制中心完成 SN 替换后再发货',
      `用户：${nick}　｜　${model}${sn ? `　｜　SN ${sn}` : ''}`,
      `结论：${diagnosis}`,
      `寄出快递：${express}`,
      `收货地址（用户填写）：${address}`
    ].join('\n')
  }

  return [
    '### 【诊断】备料发货',
    '要做：按结论备料并寄出',
    `用户：${nick}　｜　${model}`,
    `结论：${diagnosis}`,
    `寄出快递：${express}`,
    `收货地址（用户填写）：${address}`
  ].join('\n')
}

async function sendMarkdown(webhook, content) {
  // 企业微信群机器人 markdown；过长时退回 text
  const body = content.length > 3500
    ? { msgtype: 'text', text: { content: content.slice(0, 2000) } }
    : { msgtype: 'markdown', markdown: { content } }
  return postJson(webhook, body)
}

/** 正式推送：自动带上「YYYY年M月D日 · 第 N 单」（序号失败也不挡推送） */
async function sendMarkdownWithDailyOrder(webhook, content) {
  let meta
  try {
    meta = await allocDailyOrderSeq()
  } catch (e) {
    console.warn('[wecomNotify] daily order meta failed', e)
    const day = chinaDateParts()
    meta = {
      key: day.key,
      label: day.label,
      seq: 0,
      line: formatDailyOrderLine(day.label, '?'),
      soft: true
    }
  }
  await sendMarkdown(webhook, withDailyOrderLine(content, meta.line))
  return meta
}

async function markNotifyResult(repairId, ok, errMsg) {
  const patch = {
    wecomReturnNotifySent: !!ok,
    wecomReturnNotifyTriedAt: db.serverDate()
  }
  if (ok) patch.wecomReturnNotifySentAt = db.serverDate()
  if (!ok && errMsg) patch.wecomReturnNotifyLastError = String(errMsg).slice(0, 200)
  await db.collection('shouhou_repair').doc(String(repairId)).update({ data: patch })
}

async function processDueReturnNotifies(limit = 20) {
  const webhook = getReturnWebhook()
  if (!webhook) {
    return { ok: false, skipped: true, errMsg: '未配置环境变量 WECOM_WEBHOOK_RETURN', sent: 0 }
  }

  const now = new Date()
  let rows = []
  try {
    const res = await db.collection('shouhou_repair')
      .where({
        wecomReturnNotifySent: _.neq(true),
        wecomReturnNotifyAt: _.lte(now),
        returnTrackingId: _.exists(true).and(_.neq(''))
      })
      .limit(limit)
      .get()
    rows = res.data || []
  } catch (e) {
    // 无索引或字段从未写入时可能失败：降级扫少量 USER_SENT
    console.warn('[wecomNotify] query by notifyAt failed', e)
    const res = await db.collection('shouhou_repair')
      .where({ status: 'USER_SENT', wecomReturnNotifySent: _.neq(true) })
      .limit(50)
      .get()
    rows = (res.data || []).filter((item) => {
      const at = item.wecomReturnNotifyAt ? new Date(item.wecomReturnNotifyAt) : null
      if (at && !Number.isNaN(at.getTime())) return at.getTime() <= now.getTime()
      const submitted = item.returnTrackingTime ? new Date(item.returnTrackingTime) : null
      if (!submitted || Number.isNaN(submitted.getTime())) return false
      return submitted.getTime() + DELAY_MS <= now.getTime()
    }).slice(0, limit)
  }

  let sent = 0
  const errors = []
  for (const repair of rows) {
    const st = String(repair.status || '')
    if (TERMINAL_STATUS.has(st) || repair.returnCompleted === true) {
      await markNotifyResult(repair._id, true, 'skipped_terminal')
      continue
    }
    if (!String(repair.returnTrackingId || '').trim()) continue

    try {
      const nick = await resolveNickname(repair)
      const text = buildReturnArriveText(repair, nick)
      const meta = await sendMarkdownWithDailyOrder(webhook, text)
      await markNotifyResult(repair._id, true)
      try {
        await db.collection('shouhou_repair').doc(String(repair._id)).update({
          data: {
            wecomDailyOrderDate: meta.key,
            wecomDailyOrderSeq: meta.seq,
            wecomDailyOrderLabel: `${meta.label} · 第 ${meta.seq} 单`
          }
        })
      } catch (e3) { /* ignore */ }
      sent += 1
    } catch (e) {
      const msg = (e && e.message) || String(e)
      errors.push({ id: repair._id, msg })
      try { await markNotifyResult(repair._id, false, msg) } catch (e2) { /* ignore */ }
    }
  }

  return { ok: true, scanned: rows.length, sent, errors }
}

async function assertAdmin() {
  const openid = cloud.getWXContext().OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data && byOpenid.data.length > 0) return openid
  const bySystem = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystem.data && bySystem.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

/** 管理员手动立刻重推某一单 */
async function resendReturnArrive(repairId) {
  await assertAdmin()
  const webhook = getReturnWebhook()
  if (!webhook) {
    return { ok: false, errMsg: '未配置环境变量 WECOM_WEBHOOK_RETURN' }
  }
  if (!repairId) return { ok: false, errMsg: '缺少 repairId' }

  const doc = await db.collection('shouhou_repair').doc(String(repairId)).get()
  const repair = doc && doc.data
  if (!repair) return { ok: false, errMsg: '维修单不存在' }

  const tracking = String(repair.returnTrackingId || '').trim()
  if (!tracking) return { ok: false, errMsg: '用户尚未填写寄回运单号' }

  const nick = await resolveNickname(repair)
  const text = buildReturnArriveText(repair, nick, { manual: true })
  const meta = await sendMarkdownWithDailyOrder(webhook, text)
  await markNotifyResult(repairId, true)
  try {
    await db.collection('shouhou_repair').doc(String(repairId)).update({
      data: {
        wecomDailyOrderDate: meta.key,
        wecomDailyOrderSeq: meta.seq,
        wecomDailyOrderLabel: `${meta.label} · 第 ${meta.seq} 单`
      }
    })
  } catch (e) { /* ignore */ }
  return { ok: true, sent: 1, dailyOrder: `${meta.label} · 第 ${meta.seq} 单` }
}

/** 保存诊断书后立刻推群（可由 deviceReplacement 内部调用，不强制校验管理员） */
async function notifyDiagnosisSaved(event = {}) {
  const webhook = getDiagnosisWebhook()
  if (!webhook) {
    return { ok: false, errMsg: '未配置 WECOM_WEBHOOK_DIAGNOSIS / WECOM_WEBHOOK_RETURN' }
  }
  const repairId = event.repairId || event.id
  if (!repairId) return { ok: false, errMsg: '缺少 repairId' }

  let repair = event.repairSnapshot || null
  if (!repair) {
    const doc = await db.collection('shouhou_repair').doc(String(repairId)).get()
    repair = doc && doc.data
  }
  if (!repair) return { ok: false, errMsg: '维修单不存在' }

  const adminDiagnosis = event.adminDiagnosis != null
    ? event.adminDiagnosis
    : repair.adminDiagnosis
  const needsBoard = event.needsBoard != null
    ? !!event.needsBoard
    : /主板|控制器/.test(String(adminDiagnosis || ''))

  const merged = { ...repair, adminDiagnosis }
  const nick = await resolveNickname(merged)
  const text = buildDiagnosisText(merged, nick, { adminDiagnosis, needsBoard })
  const meta = await sendMarkdownWithDailyOrder(webhook, text)

  try {
    await db.collection('shouhou_repair').doc(String(repairId)).update({
      data: {
        wecomDiagnosisNotifyAt: db.serverDate(),
        wecomDiagnosisNotifySent: true,
        wecomDailyOrderDate: meta.key,
        wecomDailyOrderSeq: meta.seq,
        wecomDailyOrderLabel: `${meta.label} · 第 ${meta.seq} 单`
      }
    })
  } catch (e) {
    console.warn('[wecomNotify] mark diagnosis notify failed', e)
  }

  return { ok: true, sent: 1, needsBoard, dailyOrder: `${meta.label} · 第 ${meta.seq} 单` }
}

/**
 * 维修费支付成功：推「寄回处理·可回寄」（与过保已付费寄回同一套文案）
 * 不再单独推「付款到账 / 订单号」类消息
 */
async function notifyRepairFeePaid(event = {}) {
  const webhook = getReturnWebhook()
  if (!webhook) {
    return { ok: false, errMsg: '未配置 WECOM_WEBHOOK_RETURN' }
  }
  const repairId = event.repairId || event.id
  if (!repairId) return { ok: false, errMsg: '缺少 repairId' }

  const doc = await db.collection('shouhou_repair').doc(String(repairId)).get()
  const repair = doc && doc.data
  if (!repair) return { ok: false, errMsg: '维修单不存在' }

  if (repair.wecomRepairPaidNotifySent === true && !event.force) {
    return { ok: true, skipped: true, msg: '已推送过' }
  }

  const payOrderId = String(event.payOrderId || event.orderId || repair.repairPayOrderId || '').trim()
  const shopOrder = payOrderId ? await loadShopOrderByOrderId(payOrderId) : null

  // 优先把支付订单地址写到维修单快照，便于 buildReturnArriveText 读出
  let merged = {
    ...repair,
    repairPaid: true,
    feePaid: true,
    repairPayOrderId: payOrderId || repair.repairPayOrderId
  }
  const orderAddressText = formatOrderAddress(shopOrder && shopOrder.address)
  if (orderAddressText) {
    const a = (shopOrder && shopOrder.address) || {}
    merged = {
      ...merged,
      returnAddress: {
        name: a.name || a.receiver || a.userName || (repair.returnAddress && repair.returnAddress.name) || '',
        phone: a.phone || a.tel || a.mobile || (repair.returnAddress && repair.returnAddress.phone) || '',
        address: orderAddressText
      }
    }
  }

  const nick = await resolveNickname(merged)
  const text = buildReturnArriveText(merged, nick, {
    fromPayment: true,
    payOrderId
  })
  const meta = await sendMarkdownWithDailyOrder(webhook, text)

  const patch = {
    wecomRepairPaidNotifySent: true,
    wecomRepairPaidNotifyAt: db.serverDate(),
    // 已付费回寄文案刚推过，避免稍后到期 tick 再推一条重复的「可回寄」
    wecomReturnNotifySent: true,
    wecomReturnNotifySentAt: db.serverDate(),
    repairPaid: true,
    wecomDailyOrderDate: meta.key,
    wecomDailyOrderSeq: meta.seq,
    wecomDailyOrderLabel: `${meta.label} · 第 ${meta.seq} 单`
  }
  if (payOrderId) patch.repairPayOrderId = payOrderId
  if (orderAddressText && merged.returnAddress) {
    patch.returnAddress = merged.returnAddress
  }
  try {
    await db.collection('shouhou_repair').doc(String(repairId)).update({ data: patch })
  } catch (e) {
    console.warn('[wecomNotify] mark repair paid notify failed', e)
  }

  return {
    ok: true,
    sent: 1,
    payOrderId: payOrderId || '',
    hasOrderAddress: !!orderAddressText,
    dailyOrder: `${meta.label} · 第 ${meta.seq} 单`
  }
}

/**
 * 管理待办（简单提醒：去小程序处理）
 * kind: bind_audit | fault_audit | repair_pending | case_video | screenshot_risk | suspicious
 */
function buildAdminTodoText(kind, extra = {}) {
  const titles = {
    bind_audit: '【待处理】蓝牙绑定审核',
    fault_audit: '【待处理】故障核验审核',
    repair_pending: '【待处理】售后报修',
    case_video: '【待处理】案例视频审核',
    screenshot_risk: '【待处理】截图超限',
    suspicious: '【待处理】可疑人员',
    return_signed: '【待处理】故障配件已签收'
  }
  const title = titles[kind] || '【待处理】管理待办'
  const lines = [`### ${title}`]
  if (kind === 'return_signed') {
    lines.push('故障配件已签收，请注意查收')
  } else {
    lines.push('请到小程序里处理')
  }
  const nick = String(extra.nick || extra.nickname || '').trim()
  const oneLine = String(extra.oneLine || extra.detail || '').trim()
  if (nick) lines.push(`用户：${nick}`)
  if (oneLine) lines.push(oneLine)
  return lines.join('\n')
}

async function notifyAdminTodo(event = {}) {
  const webhook = getAdminTodoWebhook()
  if (!webhook) {
    return { ok: false, errMsg: '管理待办 Webhook 未配置' }
  }
  const kind = String(event.kind || event.type || '').trim()
  if (!kind) return { ok: false, errMsg: '缺少 kind' }
  const text = buildAdminTodoText(kind, event)
  // 待办不走「第 N 单」序号，避免和发货单混在一起
  await sendMarkdown(webhook, text)
  return { ok: true, sent: 1, kind, webhookHost: 'admin-todo' }
}

/** 寄回运单物流已签收 → 管理待办群提醒「故障配件已签收，请注意查收」 */
async function processReturnSignedAdminNotifies(limit = 15) {
  let rows = []
  try {
    const res = await db.collection('shouhou_repair')
      .where({
        needReturn: true,
        returnSignedAdminNotifySent: _.neq(true),
        returnTrackingId: _.exists(true).and(_.neq(''))
      })
      .limit(Math.min(50, Math.max(5, limit * 2)))
      .get()
    rows = (res.data || []).filter((item) => {
      if (item.returnCompleted === true) return true
      if (String(item.status || '').toUpperCase() === 'RETURN_RECEIVED') return true
      return !!String(item.returnTrackingId || '').trim()
    }).slice(0, limit)
  } catch (e) {
    console.warn('[wecomNotify] query return signed candidates failed', e)
    return { ok: false, scanned: 0, sent: 0, errMsg: (e && e.message) || String(e) }
  }

  let sent = 0
  const errors = []
  for (const repair of rows) {
    const id = repair._id
    try {
      let signed = repair.returnCompleted === true ||
        String(repair.status || '').toUpperCase() === 'RETURN_RECEIVED' ||
        repair.returnLogisticsSigned === true

      if (!signed) {
        const tracking = String(repair.returnTrackingId || '').trim()
        if (!tracking) continue
        const phone = (repair.contact && repair.contact.phone) || ''
        let logistics = null
        try {
          const lr = await cloud.callFunction({
            name: 'queryLogistics',
            data: { trackingId: tracking, phone }
          })
          logistics = (lr && lr.result) || null
        } catch (e) {
          console.warn('[wecomNotify] queryLogistics for return signed failed', id, e)
        }
        const statusCode = String(
          (logistics && logistics.data && logistics.data.status) ||
          (logistics && logistics.status) ||
          ''
        )
        const statusText = String(
          (logistics && logistics.data && (logistics.data.status_text || logistics.data.statusText)) ||
          (logistics && logistics.statusText) ||
          ''
        )
        signed = statusCode === '3' || /签收|送达/.test(statusText)
        if (signed) {
          try {
            await db.collection('shouhou_repair').doc(String(id)).update({
              data: {
                returnLogisticsSigned: true,
                returnLogisticsStatus: statusCode || '3',
                returnLogisticsStatusText: statusText || '已签收',
                returnLogisticsCheckedAt: db.serverDate()
              }
            })
          } catch (e2) { /* ignore */ }
        }
      }

      if (!signed) continue

      const nick = await resolveNickname(repair)
      await notifyAdminTodo({
        kind: 'return_signed',
        nick,
        oneLine: [
          repair.model || (repair.device && repair.device.productModel) || '',
          String(repair.returnTrackingId || '').trim()
        ].filter(Boolean).join(' · ')
      })
      await db.collection('shouhou_repair').doc(String(id)).update({
        data: {
          returnSignedAdminNotifySent: true,
          returnSignedAdminNotifyAt: db.serverDate()
        }
      })
      sent += 1
    } catch (err) {
      errors.push({ id, msg: (err && err.message) || String(err) })
    }
  }

  return { ok: true, scanned: rows.length, sent, errors }
}

/**
 * 购物订单付款成功 → 【待发货】
 * 仅售后配件 / MT商城等非维修费单
 */
async function notifyShopOrderPaid(event = {}) {
  const webhook = getShopWebhook()
  if (!webhook) {
    return { ok: false, errMsg: '未配置 WECOM_WEBHOOK_SHOP（购物待发货专用群）' }
  }

  const orderId = String(event.orderId || event.outTradeNo || '').trim()
  let order = event.orderSnapshot || event.order || null
  if (!order && orderId) {
    order = await loadShopOrderByOrderId(orderId)
  }
  if (!order) return { ok: false, errMsg: '订单不存在' }
  if (order.isRepairPayment) {
    return { ok: true, skipped: true, msg: '维修费单不走待发货推送' }
  }
  if (order.wecomShopPaidNotifySent === true && !event.force) {
    return { ok: true, skipped: true, msg: '已推送过' }
  }

  const text = buildShopOrderPaidText(order)
  const meta = await sendMarkdownWithDailyOrder(webhook, text)

  const patch = {
    wecomShopPaidNotifySent: true,
    wecomShopPaidNotifyAt: db.serverDate(),
    wecomDailyOrderDate: meta.key,
    wecomDailyOrderSeq: meta.seq,
    wecomDailyOrderLabel: `${meta.label} · 第 ${meta.seq} 单`
  }
  try {
    if (order._id) {
      await db.collection('shop_orders').doc(String(order._id)).update({ data: patch })
    } else if (order.orderId) {
      const found = await loadShopOrderByOrderId(order.orderId)
      if (found && found._id) {
        await db.collection('shop_orders').doc(String(found._id)).update({ data: patch })
      }
    }
  } catch (e) {
    console.warn('[wecomNotify] mark shop paid notify failed', e)
  }

  return {
    ok: true,
    sent: 1,
    orderId: order.orderId || orderId,
    dailyOrder: `${meta.label} · 第 ${meta.seq} 单`
  }
}

/** 供 userUpdateRepair 计算：提交运单后的计划推送时间 */
function computeNotifyAt(fromDate) {
  const base = fromDate instanceof Date ? fromDate.getTime() : Date.now()
  return new Date(base + DELAY_MS)
}

exports.main = async (event = {}) => {
  // 定时触发器 / 手动
  const action = event.action || (event.Type === 'Timer' || event.triggerName ? 'tick' : 'tick')
  if (action === 'tick' || action === 'flushReturnArrive') {
    const wecom = await processDueReturnNotifies(Number(event.limit) || 20)
    // 顺带刷用户「3 天后寄回提醒」订阅消息
    let userRemind = null
    try {
      userRemind = await cloud.callFunction({
        name: 'sendSubscribeMessage',
        data: { action: 'flushReturnRemind', limit: Number(event.limit) || 20 }
      })
      userRemind = (userRemind && userRemind.result) || userRemind
    } catch (e) {
      userRemind = { ok: false, errMsg: (e && e.message) || String(e) }
    }
    let returnSigned = null
    try {
      returnSigned = await processReturnSignedAdminNotifies(Number(event.limit) || 15)
    } catch (e) {
      returnSigned = { ok: false, errMsg: (e && e.message) || String(e) }
    }
    return { ...wecom, userReturnRemind: userRemind, returnSignedAdmin: returnSigned }
  }
  if (action === 'notifyDiagnosis' || action === 'notifyDiagnosisSaved') {
    try {
      return await notifyDiagnosisSaved(event)
    } catch (e) {
      return { ok: false, errMsg: (e && e.message) || String(e) }
    }
  }
  if (action === 'notifyRepairPaid' || action === 'notifyRepairFeePaid') {
    try {
      return await notifyRepairFeePaid(event)
    } catch (e) {
      return { ok: false, errMsg: (e && e.message) || String(e) }
    }
  }
  if (action === 'notifyShopOrderPaid' || action === 'notifyShopPaid') {
    try {
      return await notifyShopOrderPaid(event)
    } catch (e) {
      return { ok: false, errMsg: (e && (e.errMsg || e.message)) || String(e) }
    }
  }
  if (action === 'notifyAdminTodo' || action === 'adminTodo') {
    try {
      return await notifyAdminTodo(event)
    } catch (e) {
      return { ok: false, errMsg: (e && (e.errMsg || e.message)) || String(e) }
    }
  }
  if (action === 'resendReturnArrive') {
    try {
      return await resendReturnArrive(event.repairId || event.id)
    } catch (e) {
      const msg = (e && e.message) || String(e)
      if (msg === 'FORBIDDEN' || msg === 'UNAUTHORIZED') {
        return { ok: false, errMsg: '无管理员权限' }
      }
      return { ok: false, errMsg: msg }
    }
  }
  if (action === 'ping') {
    return {
      ok: true,
      hasWebhook: !!getReturnWebhook(),
      hasDiagnosisWebhook: !!getDiagnosisWebhook(),
      hasShopWebhook: !!getShopWebhook(),
      hasAdminTodoWebhook: !!getAdminTodoWebhook(),
      delayMs: DELAY_MS
    }
  }
  return { ok: false, errMsg: '未知 action' }
}

exports.DELAY_MS = DELAY_MS
exports.computeNotifyAt = computeNotifyAt
