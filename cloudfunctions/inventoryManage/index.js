/**
 * 耗材出入库
 * action:
 *   list | getByBarcode | inbound | outbound | update | remove
 *   listStaff | addStaff | removeStaff | listLogs
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const COL_ITEMS = 'inventory_items'
const COL_LOGS = 'inventory_logs'
const COL_STAFF = 'inventory_staff'
const UNIT_TYPES = new Set(['status', 'piece', 'qty'])
/** 多100 / 较足75 / 够用50 / 紧缺25 / 没货0 */
const STATUS_SET = new Set(['many', 'plenty', 'enough', 'scarce', 'empty'])
const USAGE_FREQ_SET = new Set(['common', 'uncommon'])
const STATUS_PICK_HINT = '请选择：多 / 较足 / 够用 / 紧缺 / 没货'

async function assertAdmin() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data && byOpenid.data.length) return openid
  const bySys = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySys.data && bySys.data.length) return openid
  throw new Error('FORBIDDEN')
}

function normalizeBarcode(raw) {
  return String(raw || '').trim()
}

/** 厂家条码必须恰好 9 位数字 */
function isValidInventoryBarcode(code) {
  return /^\d{9}$/.test(String(code || '').trim())
}

function requireInventoryBarcode(raw) {
  const barcode = normalizeBarcode(raw)
  if (!barcode) return { ok: false, errMsg: '缺少条码' }
  if (!isValidInventoryBarcode(barcode)) {
    return {
      ok: false,
      errMsg: `条码必须是 9 位数字（当前 ${barcode.length} 位）`,
      code: 'BARCODE_LEN'
    }
  }
  return { ok: true, barcode }
}

function normalizeUnitType(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'status' || s === '状态') return 'status'
  if (s === 'piece' || s === '件数' || s === '件') return 'piece'
  if (s === 'qty' || s === 'quantity' || s === '数量' || s === '数') return 'qty'
  return ''
}

function normalizeStatus(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'many' || s === '多' || s === '多（100%）' || s === '多（高于50%）' || s === '100' || s === '100%') {
    return 'many'
  }
  if (
    s === 'plenty' ||
    s === 'high' ||
    s === '较足' ||
    s === '较足（75%）' ||
    s === '充足' ||
    s === '75' ||
    s === '75%'
  ) {
    return 'plenty'
  }
  if (
    s === 'enough' ||
    s === '够用' ||
    s === '够用（50%）' ||
    s === '够用（70%）' ||
    s === 'mid' ||
    s === '适中' ||
    s === '中' ||
    s === '50' ||
    s === '50%'
  ) {
    return 'enough'
  }
  if (
    s === 'scarce' ||
    s === '紧缺' ||
    s === '紧缺（25%）' ||
    s === 'few' ||
    s === '少' ||
    s === '少（低于50%）' ||
    s === '缺' ||
    s === '25' ||
    s === '25%'
  ) {
    return 'scarce'
  }
  if (
    s === 'empty' ||
    s === 'none' ||
    s === '没货' ||
    s === '没货（0%）' ||
    s === '无货' ||
    s === '0' ||
    s === '0%'
  ) {
    return 'empty'
  }
  return ''
}

function normalizeUsageFreq(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'uncommon' || s === '不常用' || s === 'rare' || s === 'low') return 'uncommon'
  if (s === 'common' || s === '常用' || s === 'normal' || s === 'freq') return 'common'
  // 历史缺字段：一律视为常用
  return 'common'
}

function usageFreqLabel(freq) {
  return normalizeUsageFreq(freq) === 'uncommon' ? '不常用' : '常用'
}

function toNonNegNumber(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 1000) / 1000
}

function statusLabel(st) {
  if (st === 'many') return '多（100%）'
  if (st === 'plenty' || st === 'high') return '较足（75%）'
  if (st === 'enough' || st === 'mid') return '够用（50%）'
  if (st === 'scarce' || st === 'few') return '紧缺（25%）'
  if (st === 'empty' || st === 'none') return '没货（0%）'
  return ''
}

function statusShortLabel(st) {
  if (st === 'many') return '多'
  if (st === 'plenty' || st === 'high') return '较足'
  if (st === 'enough' || st === 'mid') return '够用'
  if (st === 'scarce' || st === 'few') return '紧缺'
  if (st === 'empty' || st === 'none') return '没货'
  return ''
}

function migrateStatus(st) {
  if (st === 'mid') return 'enough'
  if (st === 'high') return 'plenty'
  if (st === 'few') return 'scarce'
  if (st === 'none') return 'empty'
  return st || ''
}

function unitTypeLabel(t) {
  if (t === 'status') return '状态'
  if (t === 'piece') return '件数'
  if (t === 'qty') return '数量'
  return ''
}

function actionLabel(action) {
  if (action === 'inbound') return '入库'
  if (action === 'outbound') return '出库'
  if (action === 'update') return '修改'
  return action || ''
}

function formatChinaTime(raw) {
  if (!raw) return ''
  try {
    const d = raw instanceof Date ? raw : new Date(raw)
    if (Number.isNaN(d.getTime())) return ''
    // 云函数多为 UTC；按东八区展示
    const cn = new Date(d.getTime() + 8 * 60 * 60 * 1000)
    const y = cn.getUTCFullYear()
    const m = String(cn.getUTCMonth() + 1).padStart(2, '0')
    const day = String(cn.getUTCDate()).padStart(2, '0')
    const hh = String(cn.getUTCHours()).padStart(2, '0')
    const mm = String(cn.getUTCMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}`
  } catch (e) {
    return ''
  }
}

/** 集合尚未在云控制台创建时，where/get 会报 -502005 */
function isCollectionMissingError(err) {
  const msg = String((err && (err.errMsg || err.message)) || err || '')
  const code = err && (err.errCode || err.code)
  if (code === -502005 || msg.indexOf('-502005') >= 0) return true
  // 索引不存在也会带 "not exist"，绝不能当成集合缺失（否则 list 会误返回空）
  if (/index not exist|索引不存在|请创建索引|suggest index/i.test(msg)) return false
  return /collection not exists|DATABASE_COLLECTION_NOT_EXIST|Db or Table not exist/i.test(msg)
}

function isCollectionAlreadyExistsError(err) {
  const msg = String((err && (err.errMsg || err.message)) || err || '')
  return /already exist|ResourceExist|Table exist|已存在/i.test(msg)
}

/** 云环境未手动建表时，先 createCollection 再写入 */
async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (err) {
    if (isCollectionAlreadyExistsError(err)) return
    // 已存在以外的错误再抛；部分环境文案不一，尽量宽容
    const msg = String((err && (err.errMsg || err.message)) || err || '')
    if (/exist/i.test(msg) && !isCollectionMissingError(err)) return
    throw err
  }
}

async function addDoc(collectionName, data) {
  try {
    return await db.collection(collectionName).add({ data })
  } catch (err) {
    if (!isCollectionMissingError(err)) throw err
    await ensureCollection(collectionName)
    return await db.collection(collectionName).add({ data })
  }
}

function decorateItem(doc) {
  if (!doc) return null
  const unitType = doc.unitType || ''
  let status = migrateStatus(doc.status || '')
  const usageFreq = normalizeUsageFreq(doc.usageFreq)
  let summary = ''
  if (unitType === 'status') summary = statusLabel(status) || '未设'
  else if (unitType === 'piece') summary = `${Number(doc.quantity) || 0} 件`
  else if (unitType === 'qty') summary = String(Number(doc.quantity) || 0)
  return {
    ...doc,
    status,
    usageFreq,
    usageFreqLabel: usageFreqLabel(usageFreq),
    unitTypeLabel: unitTypeLabel(unitType),
    statusLabel: statusLabel(status),
    statusShortLabel: statusShortLabel(status),
    summary
  }
}

/**
 * 低库存推送：
 * - 常用：状态 ≤25%（紧缺/没货）；件数/数量 < 10
 * - 不常用：状态仅没货(0%)；件数/数量 < 2
 */
function isLowStockItem(item) {
  if (!item) return false
  const unitType = item.unitType || ''
  const uncommon = normalizeUsageFreq(item.usageFreq) === 'uncommon'
  if (unitType === 'status') {
    const st = migrateStatus(item.status)
    if (uncommon) return st === 'empty'
    return st === 'scarce' || st === 'empty'
  }
  if (unitType === 'piece' || unitType === 'qty') {
    const q = Number(item.quantity) || 0
    return uncommon ? q < 2 : q < 10
  }
  return false
}

function wasLowStock(prev) {
  return isLowStockItem(prev)
}

async function softNotifyInventoryLow(item, prev) {
  if (!isLowStockItem(item)) return
  // 已是低库存：件数/数量不重复推；状态型仅换档（紧缺↔没货）才再推，同档重复保存不刷屏
  if (prev && wasLowStock(prev)) {
    if (item.unitType === 'piece' || item.unitType === 'qty') return
    if (migrateStatus(prev.status) === migrateStatus(item.status)) return
  }
  try {
    // 完全异步：企微拉照片很慢，绝不能拖慢入库/出库主流程
    cloud
      .callFunction({
        name: 'wecomNotify',
        data: {
          action: 'notifyInventoryLow',
          name: item.name || '',
          barcode: item.barcode || '',
          statusText: `${usageFreqLabel(item.usageFreq)} · ${item.summary || item.statusLabel || ''}`,
          photoUrl: item.photoUrl || ''
        }
      })
      .catch((e) => {
        console.warn('[inventoryManage] wecom inventory low failed', e)
      })
  } catch (e) {
    console.warn('[inventoryManage] wecom inventory low failed', e)
  }
}

function buildLogSummary(doc) {
  const unitType = doc.unitType || ''
  if (doc.action === 'inbound') {
    if (doc.isNew) {
      if (unitType === 'status') return `新建 · 状态→${statusLabel(doc.statusAfter)}`
      if (unitType === 'piece') return `新建 · ${Number(doc.addQty) || 0} 件`
      return `新建 · 数量 ${Number(doc.addQty) || 0}`
    }
    if (doc.autoStatusMany || unitType === 'status') return '再入库 · 状态→多（100%）'
    if (unitType === 'piece') return `再入库 · +${Number(doc.addQty) || 0} 件（余 ${Number(doc.quantityAfter) || 0}）`
    return `再入库 · +${Number(doc.addQty) || 0}（余 ${Number(doc.quantityAfter) || 0}）`
  }
  if (doc.action === 'outbound') {
    if (unitType === 'status') return `状态→${statusLabel(doc.statusAfter)}`
    if (unitType === 'piece') return `用了 ${Number(doc.usedQty) || 0} 件（余 ${Number(doc.quantityAfter) || 0}）`
    return `用了 ${Number(doc.usedQty) || 0}（余 ${Number(doc.quantityAfter) || 0}）`
  }
  if (doc.action === 'update') {
    const patch = doc.patch || {}
    const parts = []
    if (doc.barcodeChanged || (patch.barcode && doc.barcodeBefore && patch.barcode !== doc.barcodeBefore)) {
      parts.push(`条码→${patch.barcode || doc.barcode}`)
    }
    if (patch.name != null) parts.push(`名称→${patch.name}`)
    if (patch.unitType) parts.push(`类型→${unitTypeLabel(patch.unitType)}`)
    if (patch.status) parts.push(`状态→${statusLabel(migrateStatus(patch.status))}`)
    if (patch.quantity != null) parts.push(`数量→${patch.quantity}`)
    if (patch.usageFreq) parts.push(`频次→${usageFreqLabel(patch.usageFreq)}`)
    if (patch.photoUrl) parts.push('更换照片')
    return parts.length ? parts.join(' · ') : '修改资料'
  }
  return ''
}

function decorateLog(doc) {
  if (!doc) return null
  return {
    ...doc,
    actionLabel: actionLabel(doc.action),
    timeText: formatChinaTime(doc.createdAt),
    operatorName: doc.operatorName || '未知',
    summary: buildLogSummary(doc)
  }
}

async function findByBarcode(barcode) {
  const code = normalizeBarcode(barcode)
  if (!code) return null
  try {
    const res = await db.collection(COL_ITEMS).where({ barcode: code }).limit(1).get()
    return (res.data && res.data[0]) || null
  } catch (e) {
    if (isCollectionMissingError(e)) return null
    throw e
  }
}

async function writeLog(payload) {
  try {
    await addDoc(COL_LOGS, {
      ...payload,
      createdAt: db.serverDate()
    })
  } catch (e) {
    // 日志写入失败不挡主流程
    console.warn('[inventoryManage] writeLog failed', e)
  }
}

async function actionList(event) {
  // 历史数据缺 usageFreq：一律写成常用（分批，不阻塞太久）
  let migratedUsage = 0
  try {
    migratedUsage = await migrateHistoricalUsageCommon(80)
  } catch (e) {
    console.warn('[inventoryManage] migrate usageFreq failed', e)
  }
  const limit = Math.min(Math.max(Number(event.limit) || 100, 1), 200)
  try {
    const res = await db.collection(COL_ITEMS)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get()
    const list = (res.data || []).map(decorateItem)
    return { ok: true, list, migratedUsage }
  } catch (e) {
    if (isCollectionMissingError(e)) {
      return { ok: true, list: [], hint: '集合未创建，完成首次入库后自动可用', migratedUsage }
    }
    // 无索引时 orderBy 可能失败，降级为普通拉取
    try {
      const res = await db.collection(COL_ITEMS).limit(limit).get()
      const list = (res.data || []).map(decorateItem)
      list.sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return tb - ta
      })
      return { ok: true, list, migratedUsage }
    } catch (e2) {
      if (isCollectionMissingError(e2)) return { ok: true, list: [], migratedUsage }
      throw e2
    }
  }
}

/** 把未标记频次的旧耗材全部同步为「常用」 */
async function migrateHistoricalUsageCommon(limit = 80) {
  const max = Math.min(Math.max(Number(limit) || 80, 1), 200)
  let patched = 0
  // 缺字段
  try {
    const res = await db.collection(COL_ITEMS).where({ usageFreq: _.exists(false) }).limit(max).get()
    for (const row of res.data || []) {
      if (!row || !row._id) continue
      await db.collection(COL_ITEMS).doc(String(row._id)).update({
        data: { usageFreq: 'common' }
      })
      patched += 1
    }
  } catch (e) {
    console.warn('[inventoryManage] migrate exists(false) failed', e)
  }
  // 空字符串
  if (patched < max) {
    try {
      const res2 = await db.collection(COL_ITEMS).where({ usageFreq: '' }).limit(max - patched).get()
      for (const row of res2.data || []) {
        if (!row || !row._id) continue
        await db.collection(COL_ITEMS).doc(String(row._id)).update({
          data: { usageFreq: 'common' }
        })
        patched += 1
      }
    } catch (e2) {
      console.warn('[inventoryManage] migrate empty usageFreq failed', e2)
    }
  }
  return patched
}

async function actionGetByBarcode(event) {
  const checked = requireInventoryBarcode(event.barcode)
  if (!checked.ok) return checked
  const barcode = checked.barcode
  const item = await findByBarcode(barcode)
  if (!item) return { ok: true, found: false, item: null }
  return { ok: true, found: true, item: decorateItem(item) }
}

async function actionInbound(event, openid) {
  const op = await resolveOperatorName(event, openid)
  if (!op.ok) return op
  const operatorName = op.name

  const checked = requireInventoryBarcode(event.barcode)
  if (!checked.ok) return checked
  const barcode = checked.barcode
  const name = String(event.name || '').trim()
  let photoUrl = String(event.photoUrl || '').trim()
  const unitType = normalizeUnitType(event.unitType)
  if (!name) return { ok: false, errMsg: '请填写名称' }
  if (!UNIT_TYPES.has(unitType)) return { ok: false, errMsg: '请选择单位类型：状态 / 件数 / 数量' }

  const existing = await findByBarcode(barcode)

  // 首次入库必须拍照；再次入库沿用原图，可不重拍
  if (!existing) {
    if (!photoUrl) return { ok: false, errMsg: '入库必须拍照' }
  } else if (!photoUrl) {
    photoUrl = String(existing.photoUrl || '').trim()
  }

  const nowPatch = {
    name,
    unitType,
    updatedAt: db.serverDate(),
    updatedBy: openid
  }
  // 有新图才覆盖；再次入库未重拍则不改 photoUrl
  if (photoUrl) nowPatch.photoUrl = photoUrl
  const usageFreq = normalizeUsageFreq(
    event.usageFreq != null ? event.usageFreq : (existing && existing.usageFreq)
  )
  nowPatch.usageFreq = usageFreq

  if (!existing) {
    // 首次入库
    let status = ''
    let quantity = 0
    if (unitType === 'status') {
      status = normalizeStatus(event.status) || 'many'
      if (!STATUS_SET.has(status)) {
        status = 'many'
      }
    } else {
      const q = toNonNegNumber(event.quantity)
      if (q == null) return { ok: false, errMsg: unitType === 'piece' ? '请填写件数' : '请填写数量' }
      quantity = q
    }
    const addRes = await addDoc(COL_ITEMS, {
      barcode,
      name,
      photoUrl,
      unitType,
      usageFreq,
      status: unitType === 'status' ? status : '',
      quantity: unitType === 'status' ? 0 : quantity,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      createdBy: openid,
      updatedBy: openid
    })
    await writeLog({
      action: 'inbound',
      itemId: addRes._id,
      barcode,
      unitType,
      name,
      photoUrl,
      statusAfter: unitType === 'status' ? status : '',
      addQty: unitType === 'status' ? 0 : quantity,
      quantityAfter: unitType === 'status' ? 0 : quantity,
      isNew: true,
      operatorName,
      operatorOpenid: openid
    })
    const item = await findByBarcode(barcode)
    const decorated = decorateItem(item)
    // 企微上报不阻塞入库结果，避免客户端 3s 超时误报失败
    softNotifyInventoryLow(decorated, null)
    return { ok: true, isNew: true, item: decorated }
  }

  // 同码再入库
  if (existing.unitType && existing.unitType !== unitType) {
    // 再入库不允许悄悄改类型；改类型走 update
    return {
      ok: false,
      errMsg: `该条码已按「${unitTypeLabel(existing.unitType)}」建档，如需改类型请点修改`
    }
  }
  const lockedType = existing.unitType || unitType
  nowPatch.unitType = lockedType

  if (lockedType === 'status') {
    nowPatch.status = 'many' // 再入库自动变多
    await db.collection(COL_ITEMS).doc(existing._id).update({ data: nowPatch })
    await writeLog({
      action: 'inbound',
      itemId: existing._id,
      barcode,
      unitType: lockedType,
      name,
      photoUrl: photoUrl || existing.photoUrl || '',
      statusAfter: 'many',
      isNew: false,
      autoStatusMany: true,
      operatorName,
      operatorOpenid: openid
    })
  } else {
    const addQty = toNonNegNumber(event.quantity)
    if (addQty == null || addQty <= 0) {
      return { ok: false, errMsg: lockedType === 'piece' ? '请填写要增加的件数' : '请填写要增加的数量' }
    }
    const nextQty = (Number(existing.quantity) || 0) + addQty
    nowPatch.quantity = nextQty
    await db.collection(COL_ITEMS).doc(existing._id).update({ data: nowPatch })
    await writeLog({
      action: 'inbound',
      itemId: existing._id,
      barcode,
      unitType: lockedType,
      name,
      photoUrl: photoUrl || existing.photoUrl || '',
      addQty,
      quantityAfter: nextQty,
      isNew: false,
      operatorName,
      operatorOpenid: openid
    })
  }

  const item = await findByBarcode(barcode)
  return { ok: true, isNew: false, item: decorateItem(item) }
}

async function actionOutbound(event, openid) {
  const op = await resolveOperatorName(event, openid)
  if (!op.ok) return op
  const operatorName = op.name

  const checked = requireInventoryBarcode(event.barcode)
  if (!checked.ok) return checked
  const barcode = checked.barcode
  const existing = await findByBarcode(barcode)
  if (!existing) return { ok: false, errMsg: '未找到该条码，请先入库' }

  const unitType = existing.unitType
  if (unitType === 'status') {
    const status = normalizeStatus(event.status)
    if (!STATUS_SET.has(status)) return { ok: false, errMsg: STATUS_PICK_HINT }
    await db.collection(COL_ITEMS).doc(existing._id).update({
      data: {
        status,
        updatedAt: db.serverDate(),
        updatedBy: openid
      }
    })
    await writeLog({
      action: 'outbound',
      itemId: existing._id,
      barcode,
      unitType,
      name: existing.name || '',
      statusAfter: status,
      operatorName,
      operatorOpenid: openid
    })
    const item = await findByBarcode(barcode)
    const decorated = decorateItem(item)
    await softNotifyInventoryLow(decorated, existing)
    return { ok: true, item: decorated }
  }

  // 件数 / 数量：问用了多少，扣减
  const used = toNonNegNumber(event.usedQty)
  if (used == null || used <= 0) {
    return { ok: false, errMsg: unitType === 'piece' ? '请填写用了多少件' : '请填写用了多少' }
  }
  const cur = Number(existing.quantity) || 0
  if (used > cur) {
    return {
      ok: false,
      errMsg: unitType === 'piece'
        ? `当前仅剩 ${cur} 件，不能超过`
        : `当前仅剩 ${cur}，不能超过`
    }
  }
  const nextQty = Math.round((cur - used) * 1000) / 1000
  await db.collection(COL_ITEMS).doc(existing._id).update({
    data: {
      quantity: nextQty,
      updatedAt: db.serverDate(),
      updatedBy: openid
    }
  })
  await writeLog({
    action: 'outbound',
    itemId: existing._id,
    barcode,
    unitType,
    name: existing.name || '',
    usedQty: used,
    quantityAfter: nextQty,
    operatorName,
    operatorOpenid: openid
  })
  const item = await findByBarcode(barcode)
  const decorated = decorateItem(item)
  await softNotifyInventoryLow(decorated, existing)
  return { ok: true, item: decorated }
}

async function actionUpdate(event, openid) {
  const barcode = normalizeBarcode(event.barcode || (event.item && event.item.barcode))
  const itemId = String(event.itemId || '').trim()
  let existing = null
  if (itemId) {
    try {
      const doc = await db.collection(COL_ITEMS).doc(itemId).get()
      existing = doc.data || null
      if (existing) existing._id = itemId
    } catch (e) {
      existing = null
    }
  }
  if (!existing && barcode) existing = await findByBarcode(barcode)
  if (!existing) return { ok: false, errMsg: '未找到产品' }

  const patch = {
    updatedAt: db.serverDate(),
    updatedBy: openid
  }
  if (event.name != null) {
    const name = String(event.name || '').trim()
    if (!name) return { ok: false, errMsg: '名称不能为空' }
    patch.name = name
  }
  if (event.photoUrl != null && String(event.photoUrl).trim()) {
    patch.photoUrl = String(event.photoUrl).trim()
  }
  // 修改条码：重新扫码变更
  const nextBarcode = normalizeBarcode(event.newBarcode != null ? event.newBarcode : event.barcode)
  const oldBarcode = normalizeBarcode(existing.barcode)
  if (nextBarcode && nextBarcode !== oldBarcode) {
    const nextChecked = requireInventoryBarcode(nextBarcode)
    if (!nextChecked.ok) return nextChecked
    const clash = await findByBarcode(nextChecked.barcode)
    if (clash && String(clash._id) !== String(existing._id)) {
      return { ok: false, errMsg: '该条码已存在，不能改成重复码' }
    }
    patch.barcode = nextChecked.barcode
  }
  if (event.unitType != null && String(event.unitType).trim()) {
    const unitType = normalizeUnitType(event.unitType)
    if (!UNIT_TYPES.has(unitType)) return { ok: false, errMsg: '单位类型无效' }
    patch.unitType = unitType
    if (unitType === 'status') {
      const st = normalizeStatus(event.status) || existing.status || 'many'
      patch.status = STATUS_SET.has(st) ? st : 'many'
      patch.quantity = 0
    } else {
      const q = event.quantity != null ? toNonNegNumber(event.quantity) : (Number(existing.quantity) || 0)
      if (q == null) return { ok: false, errMsg: '数量无效' }
      patch.quantity = q
      patch.status = ''
    }
  } else if (existing.unitType === 'status' && event.status != null) {
    const st = normalizeStatus(event.status)
    if (!STATUS_SET.has(st)) return { ok: false, errMsg: STATUS_PICK_HINT }
    patch.status = st
  } else if ((existing.unitType === 'piece' || existing.unitType === 'qty') && event.quantity != null) {
    const q = toNonNegNumber(event.quantity)
    if (q == null) return { ok: false, errMsg: '数量无效' }
    patch.quantity = q
  }
  if (event.usageFreq != null && String(event.usageFreq).trim() !== '') {
    const uf = normalizeUsageFreq(event.usageFreq)
    if (!USAGE_FREQ_SET.has(uf)) return { ok: false, errMsg: '请选择：常用 / 不常用' }
    patch.usageFreq = uf
  }

  await db.collection(COL_ITEMS).doc(existing._id).update({ data: patch })
  const op = await resolveOperatorName(event, openid)
  const finalBarcode = patch.barcode || existing.barcode
  await writeLog({
    action: 'update',
    itemId: existing._id,
    barcode: finalBarcode,
    barcodeBefore: oldBarcode,
    barcodeChanged: !!(patch.barcode && patch.barcode !== oldBarcode),
    name: patch.name != null ? patch.name : (existing.name || ''),
    unitType: patch.unitType != null ? patch.unitType : existing.unitType,
    patch,
    operatorName: op.ok ? op.name : '管理员',
    operatorOpenid: openid
  })
  const item = await findByBarcode(finalBarcode)
  const decorated = decorateItem(item)
  await softNotifyInventoryLow(decorated, existing)
  return { ok: true, item: decorated }
}

/** 按条件分批物理删除集合文档 */
async function removeDocsByWhere(collectionName, whereObj, maxBatches = 30) {
  let removed = 0
  for (let i = 0; i < maxBatches; i++) {
    let rows = []
    try {
      const res = await db.collection(collectionName).where(whereObj).limit(50).get()
      rows = res.data || []
    } catch (e) {
      if (isCollectionMissingError(e)) return removed
      throw e
    }
    if (!rows.length) break
    for (const row of rows) {
      if (!row || !row._id) continue
      try {
        await db.collection(collectionName).doc(String(row._id)).remove()
        removed += 1
      } catch (e) {
        console.warn('[inventoryManage] remove doc failed', collectionName, row._id, e)
      }
    }
  }
  return removed
}

/**
 * 全量删除耗材：inventory_items + 相关出入库记录(inventory_logs)
 * 按 itemId / barcode 双匹配，避免漏删旧日志
 */
async function actionRemove(event, openid) {
  const itemId = String(event.itemId || event.id || '').trim()
  let barcode = normalizeBarcode(event.barcode || '')
  let existing = null

  if (itemId) {
    try {
      const doc = await db.collection(COL_ITEMS).doc(itemId).get()
      existing = doc.data || null
      if (existing) existing._id = itemId
    } catch (e) {
      existing = null
    }
  }
  if (!existing && barcode) existing = await findByBarcode(barcode)
  if (!existing) return { ok: false, errMsg: '未找到该耗材，可能已删除' }

  const id = String(existing._id)
  barcode = normalizeBarcode(existing.barcode || barcode)
  const name = String(existing.name || '').trim()

  let logsRemoved = 0
  if (id) {
    logsRemoved += await removeDocsByWhere(COL_LOGS, { itemId: id })
  }
  if (barcode) {
    logsRemoved += await removeDocsByWhere(COL_LOGS, { barcode })
  }

  try {
    await db.collection(COL_ITEMS).doc(id).remove()
  } catch (e) {
    if (!isCollectionMissingError(e)) {
      return { ok: false, errMsg: '删除耗材失败：' + ((e && e.message) || String(e)) }
    }
  }

  // 再扫一遍，防止删除过程中新写入/漏网
  if (id) logsRemoved += await removeDocsByWhere(COL_LOGS, { itemId: id }, 5)
  if (barcode) logsRemoved += await removeDocsByWhere(COL_LOGS, { barcode }, 5)

  console.log('[inventoryManage] remove ok', { id, barcode, name, logsRemoved, by: openid })
  return {
    ok: true,
    removedItemId: id,
    barcode,
    name,
    logsRemoved
  }
}

async function loadStaffRows() {
  try {
    const res = await db.collection(COL_STAFF).limit(200).get()
    return res.data || []
  } catch (e) {
    if (isCollectionMissingError(e)) return []
    throw e
  }
}

function isStaffOwnedBy(row, openid) {
  if (!row || !openid) return false
  return String(row.openid || '') === openid || String(row.createdBy || '') === openid
}

function findMyStaff(rows, openid) {
  return (rows || []).find((x) => x && x.active !== false && isStaffOwnedBy(x, openid)) || null
}

/** 按当前 openid 绑定的昵称作为操作人（一个账号对应一个操作人） */
async function resolveOperatorName(event, openid) {
  try {
    const rows = await loadStaffRows()
    const mine = findMyStaff(rows, openid)
    if (mine && String(mine.name || '').trim()) {
      return { ok: true, name: String(mine.name).trim() }
    }
  } catch (e) {
    console.warn('[inventoryManage] resolveOperatorName', e)
  }
  return { ok: false, errMsg: '请先在人员管理绑定你的操作昵称' }
}

async function actionListStaff(event, openid) {
  const normalize = (rows) => {
    const list = (rows || []).filter((x) => x && x.active !== false && String(x.name || '').trim())
    list.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    return list
  }

  let rows = []
  try {
    rows = await loadStaffRows()
  } catch (e) {
    if (isCollectionMissingError(e)) {
      return { ok: true, list: [], myName: '', myBound: false }
    }
    throw e
  }
  const list = normalize(rows)
  const mine = findMyStaff(list, openid)
  const myName = mine ? String(mine.name || '').trim() : ''
  return {
    ok: true,
    list,
    myName,
    myBound: !!myName,
    myStaffId: mine ? mine._id : ''
  }
}

async function actionAddStaff(event, openid) {
  const name = String(event.name || '').trim()
  if (!name) return { ok: false, errMsg: '请输入你的操作昵称' }
  const nameKey = name.toLowerCase()

  let existingList = []
  try {
    existingList = await loadStaffRows()
  } catch (e) {
    if (!isCollectionMissingError(e)) throw e
  }

  // 一个 openid 只绑一个昵称：已有则更新
  const mine = findMyStaff(existingList, openid)
  if (mine && mine._id) {
    await db.collection(COL_STAFF).doc(mine._id).update({
      data: {
        name,
        openid,
        active: true,
        updatedAt: db.serverDate()
      }
    })
    return {
      ok: true,
      updated: true,
      staff: { _id: mine._id, name, active: true, openid }
    }
  }

  const nameTaken = existingList.find(
    (x) =>
      x.active !== false &&
      String(x.name || '').trim().toLowerCase() === nameKey &&
      !isStaffOwnedBy(x, openid)
  )
  if (nameTaken) return { ok: false, errMsg: '该昵称已被其他账号使用' }

  const addRes = await addDoc(COL_STAFF, {
    name,
    openid,
    active: true,
    createdAt: db.serverDate(),
    createdBy: openid
  })
  return {
    ok: true,
    updated: false,
    staff: {
      _id: addRes._id,
      name,
      active: true,
      openid
    }
  }
}

async function actionRemoveStaff(event) {
  const staffId = String(event.staffId || '').trim()
  if (!staffId) return { ok: false, errMsg: '缺少人员 ID' }
  try {
    await db.collection(COL_STAFF).doc(staffId).update({
      data: {
        active: false,
        removedAt: db.serverDate()
      }
    })
    return { ok: true }
  } catch (e) {
    if (isCollectionMissingError(e)) return { ok: false, errMsg: '人员不存在' }
    try {
      await db.collection(COL_STAFF).doc(staffId).remove()
      return { ok: true }
    } catch (e2) {
      return { ok: false, errMsg: '删除失败' }
    }
  }
}

async function actionListLogs(event) {
  const limit = Math.min(Math.max(Number(event.limit) || 100, 1), 200)
  try {
    const res = await db.collection(COL_LOGS)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    return { ok: true, list: (res.data || []).map(decorateLog) }
  } catch (e) {
    if (isCollectionMissingError(e)) return { ok: true, list: [] }
    try {
      const res = await db.collection(COL_LOGS).limit(limit).get()
      const list = (res.data || []).map(decorateLog)
      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      return { ok: true, list }
    } catch (e2) {
      if (isCollectionMissingError(e2)) return { ok: true, list: [] }
      throw e2
    }
  }
}

exports.main = async (event = {}) => {
  try {
    const openid = await assertAdmin()
    const action = String(event.action || '').trim()
    if (action === 'list') return await actionList(event)
    if (action === 'migrateUsageCommon') {
      const n = await migrateHistoricalUsageCommon(Number(event.limit) || 200)
      return { ok: true, migrated: n }
    }
    if (action === 'getByBarcode') return await actionGetByBarcode(event)
    if (action === 'inbound') return await actionInbound(event, openid)
    if (action === 'outbound') return await actionOutbound(event, openid)
    if (action === 'update') return await actionUpdate(event, openid)
    if (action === 'remove' || action === 'delete') return await actionRemove(event, openid)
    if (action === 'listStaff') return await actionListStaff(event, openid)
    if (action === 'addStaff') return await actionAddStaff(event, openid)
    if (action === 'removeStaff') return await actionRemoveStaff(event)
    if (action === 'listLogs') return await actionListLogs(event)
    return { ok: false, errMsg: `未知 action: ${action}` }
  } catch (e) {
    const msg = String((e && (e.message || e.errMsg)) || e || '')
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return { ok: false, errMsg: '仅管理员可操作', code: msg }
    }
    if (isCollectionMissingError(e)) {
      return { ok: false, errMsg: '数据库集合未就绪，请重试一次' }
    }
    console.error('[inventoryManage]', e)
    return { ok: false, errMsg: msg || '服务异常' }
  }
}
