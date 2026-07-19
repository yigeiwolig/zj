/**
 * 用户订阅消息推送（服务进度 / 发货 / 待支付）
 *
 * A 服务进度  3fLmcXWdGMpYtnHbpSxjGFnW0zubj52IAA-go7uRxlY
 *   thing2 / phrase37(≤5) / thing6
 * B 订单发货  SrAJkbpEWoo3EUGnmuQu4aFG8LM2MOlfwnyX6GeENSg
 *   thing6 / thing7 / character_string16 / phrase14(≤5) / thing4
 * C 待支付    ekcNRwB-aUObfL4_AsFBOoBbCvoBnzDtCYKCKWu3jwc
 *   amount16 / thing10 / thing5
 *
 * event.scene 见 SCENE_MAP；也可传 template + 字段覆盖。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 录单备件且需要寄回：约 3 天后提醒用户寄回故障件 */
const USER_RETURN_REMIND_DELAY_MS = 3 * 24 * 60 * 60 * 1000

const TMPL = {
  progress: '3fLmcXWdGMpYtnHbpSxjGFnW0zubj52IAA-go7uRxlY',
  ship: 'SrAJkbpEWoo3EUGnmuQu4aFG8LM2MOlfwnyX6GeENSg',
  pay: 'ekcNRwB-aUObfL4_AsFBOoBbCvoBnzDtCYKCKWu3jwc'
}

const DEFAULT_PAGE = 'package-app/pages/my/my'

function clip(text, max, fallback) {
  const s = String(text == null ? '' : text).trim() || String(fallback || '')
  if (s.length <= max) return s
  return s.slice(0, max)
}

function clipThing(text, fallback) {
  return clip(text, 20, fallback)
}

function clipPhrase(text, fallback) {
  return clip(text, 5, fallback)
}

/** A 服务进度默认文案 */
const PROGRESS_COPY = {
  accepted: {
    thing2: '报修已提交',
    phrase37: '审核中',
    thing6: '工程师评估后将通知您'
  },
  tutorial: {
    thing2: '可教程自修',
    phrase37: '看教程',
    thing6: '请到「常见问题」选择对应机型查看'
  },
  need_return: {
    thing2: '请寄回设备维修',
    phrase37: '需寄回',
    thing6: '请到「我的」填写寄回信息'
  },
  /** 备件寄出约 3 天后：提醒用户寄回故障件 */
  return_remind: {
    thing2: '记得寄回故障配件',
    phrase37: '待寄回',
    thing6: '请到「我的」填写寄回信息'
  },
  need_parts: {
    thing2: '请购买配件',
    phrase37: '待购配件',
    thing6: '请到「我的」购买配件'
  },
  need_pay: {
    thing2: '维修费待支付',
    phrase37: '待支付',
    thing6: '请到「我的」完成支付'
  },
  paid_ok: {
    thing2: '维修费已支付',
    phrase37: '已支付',
    thing6: '我们将尽快寄出'
  },
  bind_approved: {
    thing2: '设备审核已通过',
    phrase37: '已通过',
    thing6: '可到「我的」查看设备档案'
  },
  fault_bind_ok: {
    thing2: '故障核验已通过',
    phrase37: '已通过',
    thing6: '可继续提交故障报修'
  },
  shop_queued: {
    thing2: '订单排单中',
    phrase37: '排单中',
    thing6: '预计2～3天发货，F3MAX约10天'
  },
  case_approved: {
    thing2: '案例审核已通过',
    phrase37: '已通过',
    thing6: '感谢分享，奖励已发放'
  },
  case_rejected: {
    thing2: '案例审核未通过',
    phrase37: '未通过',
    thing6: '请到「案例库」查看原因可再投'
  },
  referral_reward: {
    thing2: '邀请奖励已到账',
    phrase37: '已到账',
    thing6: '请到「我的」查看优惠券'
  },
  // 兼容旧调用：发货仍可用 progress 兜底，但优选 ship 模板
  shipped: {
    thing2: '备件已寄出',
    phrase37: '已寄出',
    thing6: '请到「我的」查看物流'
  },
  completed_sent: {
    thing2: '维修完成已寄回',
    phrase37: '修好寄回',
    thing6: '请到「我的」查看物流'
  }
}

/** scene → 模板类型 */
const SCENE_TEMPLATE = {
  accepted: 'progress',
  tutorial: 'progress',
  need_return: 'progress',
  return_remind: 'progress',
  need_parts: 'progress',
  need_pay: 'progress',
  paid_ok: 'progress',
  bind_approved: 'progress',
  fault_bind_ok: 'progress',
  shop_queued: 'progress',
  case_approved: 'progress',
  case_rejected: 'progress',
  referral_reward: 'progress',
  shipped: 'ship',
  completed_sent: 'ship',
  shop_unpaid: 'pay'
}

function carrierLabel(method) {
  const m = String(method || '').toLowerCase()
  if (m === 'sf' || m.indexOf('顺丰') >= 0) return '顺丰'
  if (m === 'zto' || m.indexOf('中通') >= 0) return '中通'
  return clipThing(method, '快递')
}

function addrFromRepair(repair) {
  if (!repair) return '见小程序「我的」'
  const c = repair.contact || {}
  const parts = [
    c.province || '',
    c.city || '',
    c.district || '',
    c.address || c.detail || c.fullAddress || ''
  ].filter(Boolean)
  if (parts.length) return parts.join('')
  if (repair.returnAddress) return String(repair.returnAddress)
  if (repair.address) return String(repair.address)
  return '见小程序「我的」'
}

function itemNameFromRepair(repair, scene) {
  const model =
    (repair && (repair.model || (repair.device && repair.device.productModel))) || ''
  if (scene === 'completed_sent') {
    return clipThing(model ? `${model}修好寄回` : '维修完成寄回', '维修完成寄回')
  }
  return clipThing(model ? `${model}备件` : '维修备件', '维修备件')
}

function buildProgressData(event, repair) {
  const scene = String(event.scene || 'custom').trim()
  const base = PROGRESS_COPY[scene] || {
    thing2: '售后进度更新',
    phrase37: '已更新',
    thing6: '请到「我的」查看详情'
  }
  let tip = event.thing6 != null ? event.thing6 : base.thing6
  const model = repair && (repair.model || (repair.device && repair.device.productModel))
  if (!event.thing6 && model && String(tip).length <= 12) {
    tip = clipThing(`${String(model).slice(0, 8)} ${tip}`, tip)
  }
  return {
    thing2: { value: clipThing(event.thing2 != null ? event.thing2 : base.thing2, '售后进度更新') },
    phrase37: { value: clipPhrase(event.phrase37 != null ? event.phrase37 : base.phrase37, '已更新') },
    thing6: { value: clipThing(tip, '请到「我的」查看详情') }
  }
}

function buildShipData(event, repair) {
  const scene = String(event.scene || 'shipped').trim()
  const tracking =
    event.character_string16 ||
    event.trackingId ||
    (repair && (repair.trackingId || repair.expressNo)) ||
    ''
  const method =
    event.thing7 ||
    (repair &&
      (repair.shippingMethod ||
        (repair.contact && repair.contact.shippingMethod) ||
        repair.expressCompany)) ||
    ''
  return {
    thing6: {
      value: clipThing(
        event.thing6 != null ? event.thing6 : itemNameFromRepair(repair, scene),
        '维修发货'
      )
    },
    thing7: { value: clipThing(carrierLabel(method), '快递') },
    character_string16: {
      value: clip(String(tracking || event.trackingId || '请查看物流'), 32, '请查看物流')
    },
    phrase14: {
      value: clipPhrase(event.phrase14 != null ? event.phrase14 : '已发货', '已发货')
    },
    thing4: {
      value: clipThing(event.thing4 != null ? event.thing4 : addrFromRepair(repair), '见小程序「我的」')
    }
  }
}

function formatAmountYuan(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0.00'
  return (Math.round(n * 100) / 100).toFixed(2)
}

function buildPayData(event, order) {
  let amount = event.amount16
  if (amount == null && order) {
    if (order.totalFee != null) amount = Number(order.totalFee) / 100
    else if (order.amountFen != null) amount = Number(order.amountFen) / 100
    else if (order.payAmount != null) amount = order.payAmount
    else if (order.totalPrice != null) amount = order.totalPrice
  }
  let name = event.thing10
  if (name == null && order) {
    const items = order.items || order.goods || order.cart || []
    if (Array.isArray(items) && items.length) {
      name = items
        .map((it) => it.name || it.title || it.model || '')
        .filter(Boolean)
        .join('、')
    }
    if (!name) name = order.productName || order.title || '商城订单'
  }
  return {
    amount16: { value: formatAmountYuan(amount) },
    thing10: { value: clipThing(name, '商城订单') },
    thing5: {
      value: clipThing(
        event.thing5 != null ? event.thing5 : '请尽快到「订单」完成支付',
        '请尽快到「订单」完成支付'
      )
    }
  }
}

async function loadRepair(repairId) {
  if (!repairId) return null
  try {
    const res = await db.collection('shouhou_repair').doc(repairId).get()
    return (res && res.data) || null
  } catch (e) {
    return null
  }
}

async function loadOrder(orderId) {
  if (!orderId) return null
  try {
    const res = await db
      .collection('shop_orders')
      .where({ orderId: String(orderId) })
      .limit(1)
      .get()
    if (res.data && res.data.length) return res.data[0]
  } catch (e) {
    /* ignore */
  }
  try {
    const res = await db.collection('shop_orders').doc(String(orderId)).get()
    return (res && res.data) || null
  } catch (e) {
    return null
  }
}

async function resolveOpenid(event, repair, order) {
  if (event.openid) return String(event.openid).trim()
  if (repair) {
    const o = String(repair._openid || repair.openid || '').trim()
    if (o) return o
  }
  if (order) {
    const o = String(order._openid || order.openid || '').trim()
    if (o) return o
  }
  return ''
}

async function markUserReturnRemind(repairId, ok, errMsg) {
  const patch = {
    userReturnRemindTriedAt: db.serverDate()
  }
  if (ok) {
    patch.userReturnRemindSent = true
    patch.userReturnRemindSentAt = db.serverDate()
  } else if (errMsg) {
    // 跳过类也视为已处理，避免死循环；发送失败则不置 sent，下个小时再试
    const skip = String(errMsg).indexOf('skipped_') === 0
    if (skip) patch.userReturnRemindSent = true
    patch.userReturnRemindLastError = String(errMsg).slice(0, 200)
  }
  await db.collection('shouhou_repair').doc(String(repairId)).update({ data: patch })
}

async function sendOneSubscribe(payload) {
  const scene = String(payload.scene || 'custom').trim()
  const tmplKey =
    (payload.template && TMPL[payload.template] && payload.template) ||
    SCENE_TEMPLATE[scene] ||
    'progress'
  const templateId = TMPL[tmplKey] || TMPL.progress
  const repairId = String(payload.repairId || '').trim()
  const orderId = String(payload.orderId || '').trim()
  const repair = payload.repair || (await loadRepair(repairId))
  const order =
    tmplKey === 'pay' || scene === 'shop_queued' ? await loadOrder(orderId) : null
  const openid = await resolveOpenid(payload, repair, order)
  if (!openid) {
    return { success: false, errMsg: '缺少用户 openid' }
  }

  let data
  if (tmplKey === 'ship') {
    data = buildShipData(payload, repair)
  } else if (tmplKey === 'pay') {
    data = buildPayData(payload, order)
  } else {
    data = buildProgressData(payload, repair)
  }

  const page = String(payload.page || DEFAULT_PAGE).trim() || DEFAULT_PAGE
  const result = await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId,
    page,
    data,
    miniprogramState: payload.miniprogramState || 'formal'
  })

  return {
    success: true,
    errCode: (result && result.errCode) || 0,
    scene,
    template: tmplKey,
    data
  }
}

/**
 * 到期推送：备件寄出约 3 天后提醒用户寄回故障配件
 * （依赖用户此前授权过「服务进度」订阅额度）
 */
async function processDueUserReturnReminds(limit = 20) {
  const now = new Date()
  let rows = []
  try {
    const res = await db
      .collection('shouhou_repair')
      .where({
        needReturn: true,
        userReturnRemindSent: _.neq(true),
        userReturnRemindAt: _.lte(now)
      })
      .limit(limit)
      .get()
    rows = res.data || []
  } catch (e) {
    console.warn('[sendSubscribeMessage] query return remind failed', e)
    try {
      const res = await db
        .collection('shouhou_repair')
        .where({ needReturn: true, status: 'SHIPPED', userReturnRemindSent: _.neq(true) })
        .limit(50)
        .get()
      rows = (res.data || [])
        .filter((item) => {
          const at = item.userReturnRemindAt ? new Date(item.userReturnRemindAt) : null
          return at && !Number.isNaN(at.getTime()) && at.getTime() <= now.getTime()
        })
        .slice(0, limit)
    } catch (e2) {
      return { ok: false, sent: 0, errMsg: (e2 && e2.message) || String(e2) }
    }
  }

  let sent = 0
  const errors = []
  const TERMINAL = new Set([
    'RETURN_RECEIVED',
    'COMPLETED',
    'DELETED',
    'CANCELLED',
    'REPAIR_COMPLETED_SENT'
  ])

  for (const repair of rows) {
    const id = repair._id
    try {
      if (repair.returnCompleted === true || TERMINAL.has(String(repair.status || ''))) {
        await markUserReturnRemind(id, true, 'skipped_terminal')
        continue
      }
      if (String(repair.returnTrackingId || '').trim()) {
        await markUserReturnRemind(id, true, 'skipped_already_returned')
        continue
      }
      if (repair.needReturn !== true) {
        await markUserReturnRemind(id, true, 'skipped_no_need_return')
        continue
      }

      const result = await sendOneSubscribe({
        scene: 'return_remind',
        repairId: id,
        repair
      })
      if (result && result.success) {
        await markUserReturnRemind(id, true)
        sent += 1
      } else {
        const msg = (result && result.errMsg) || 'send failed'
        errors.push({ id, msg })
        await markUserReturnRemind(id, false, msg)
      }
    } catch (err) {
      const msg = (err && (err.errMsg || err.message)) || String(err)
      errors.push({ id, msg })
      try {
        await markUserReturnRemind(id, false, msg)
      } catch (e2) {
        /* ignore */
      }
    }
  }

  return { ok: true, scanned: rows.length, sent, errors, delayMs: USER_RETURN_REMIND_DELAY_MS }
}

exports.main = async (event = {}) => {
  try {
    const action = String(event.action || '').trim()
    const isTimer = event.Type === 'Timer' || !!event.triggerName
    if (action === 'tick' || action === 'flushReturnRemind' || (isTimer && !event.scene && !event.repairId)) {
      return await processDueUserReturnReminds(Number(event.limit) || 20)
    }

    return await sendOneSubscribe(event)
  } catch (err) {
    const msg = (err && (err.errMsg || err.message)) || String(err)
    console.error('[sendSubscribeMessage] fail', msg, err)
    return {
      success: false,
      errMsg: msg,
      errCode: err && err.errCode
    }
  }
}

module.exports.USER_RETURN_REMIND_DELAY_MS = USER_RETURN_REMIND_DELAY_MS
module.exports.processDueUserReturnReminds = processDueUserReturnReminds

