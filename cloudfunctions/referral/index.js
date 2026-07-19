const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const COUPON_AMOUNT_FEN = 1500
const MIN_TRIGGER_YUAN = 300
const MIN_SPEND_FEN = COUPON_AMOUNT_FEN + 1
const CODE_PREFIX = 'INV'
const CODE_BODY_LEN = 6
const COUPON_ONLY_BY_REFERRAL_MSG = '优惠券仅可通过邀请新用户下单获得'
const COUPON_RESERVATION_MS = 2 * 60 * 60 * 1000

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

function couponOwner(c) {
  return (c && (c.ownerOpenid || c._openid)) || ''
}

function formatCheckoutCoupon(c) {
  const amountFen = Number(c.amountFen) || 0
  const minSpendFen = Number(c.minSpendFen) || amountFen + 1
  const amountYuan = amountFen / 100
  const custom = String((c && c.title) || '').trim()
  let title = '商城优惠券'
  if (custom && !/^MT\s/.test(custom)) {
    title = custom.replace(/^MT\s*/, '')
  } else if (c.source === 'referral') {
    title = '邀请有礼券'
  } else if (c.source === 'owner_gift') {
    title = '新客体验券'
  }
  return {
    id: c._id,
    amountYuan: amountYuan % 1 === 0 ? String(amountYuan) : amountYuan.toFixed(2),
    amountFen,
    minSpendYuan: (minSpendFen / 100).toFixed(2),
    brand: 'MT',
    title,
    subtitle: '摩改社商城 · 可叠加'
  }
}

async function listCheckoutCoupons(db, openid) {
  const res = await db.collection('user_coupons').where({
    ownerOpenid: openid
  }).limit(100).get()
  const now = Date.now()
  const list = (res.data || [])
    .filter((c) => {
      if (!c || c.source !== 'referral') return false
      if (c.status === 'available') return true
      const expiresAt = c.reservedUntil ? new Date(c.reservedUntil).getTime() : 0
      return c.status === 'reserved' && expiresAt > 0 && expiresAt <= now
    })
    .map(formatCheckoutCoupon)
  list.sort((a, b) => (b.amountFen || 0) - (a.amountFen || 0))
  return { success: true, coupons: list }
}

async function computeCouponDiscount(db, openid, couponIds, fullTotalYuan, pricingMode, reservationOrderId) {
  if (pricingMode && pricingMode !== 'shop') {
    return { success: false, error: '仅商城订单可使用优惠券' }
  }
  const ids = [...new Set((couponIds || []).map((id) => String(id).trim()).filter(Boolean))]
  if (!ids.length) {
    return { success: true, discountYuan: 0, appliedIds: [], payAmountYuan: roundMoney(fullTotalYuan) }
  }

  const coupons = []
  for (const id of ids) {
    let doc
    try {
      doc = await db.collection('user_coupons').doc(id).get()
    } catch (e) {
      return { success: false, error: '优惠券不存在或已失效' }
    }
    const c = doc.data
    if (!c) return { success: false, error: '优惠券不存在或已失效' }
    if (couponOwner(c) !== openid) return { success: false, error: '无权使用该优惠券' }
    const expiresAt = c.reservedUntil ? new Date(c.reservedUntil).getTime() : 0
    const reservedByThisOrder = c.status === 'reserved' && c.reservedOrderId === reservationOrderId
    const expiredReservation = c.status === 'reserved' && expiresAt > 0 && expiresAt <= Date.now()
    if (c.status !== 'available' && !reservedByThisOrder && !expiredReservation) {
      return { success: false, error: '部分优惠券已使用或已被其他订单占用，请重新选择' }
    }
    if (c.source !== 'referral') {
      return { success: false, error: COUPON_ONLY_BY_REFERRAL_MSG }
    }
    coupons.push(c)
  }

  const totalDiscountFen = coupons.reduce((s, c) => s + (Number(c.amountFen) || 0), 0)
  const discountYuan = roundMoney(totalDiscountFen / 100)
  const full = roundMoney(fullTotalYuan)
  const minRequiredYuan = roundMoney(discountYuan + 0.01)

  if (!Number.isFinite(full) || full <= 0) {
    return { success: false, error: '订单金额异常' }
  }
  if (full < minRequiredYuan) {
    return {
      success: false,
      error: `订单满 ¥${minRequiredYuan.toFixed(2)} 才可抵扣 ¥${discountYuan.toFixed(2)}`
    }
  }

  let payAmountYuan = roundMoney(full - discountYuan)
  if (payAmountYuan < 0.01) payAmountYuan = 0.01

  return {
    success: true,
    discountYuan,
    appliedIds: ids,
    payAmountYuan,
    preCouponTotalYuan: full
  }
}

/**
 * 生成支付单前原子占用优惠券，防止同一张券被多个未支付订单同时使用。
 * 同一订单重试支付时允许续期；超时占用可被新订单接管。
 */
async function reserveCouponDiscount(db, openid, couponIds, fullTotalYuan, pricingMode, orderId) {
  if (!orderId) return { success: false, error: '缺少订单号，无法占用优惠券' }

  try {
    return await db.runTransaction(async (transaction) => {
      const result = await computeCouponDiscount(
        transaction,
        openid,
        couponIds,
        fullTotalYuan,
        pricingMode,
        orderId
      )
      if (!result.success) throw new Error(result.error || '优惠券不可用')

      const now = Date.now()
      const reservedUntil = now + COUPON_RESERVATION_MS
      const docs = []

      for (const cid of result.appliedIds || []) {
        const doc = await transaction.collection('user_coupons').doc(cid).get()
        const coupon = doc.data
        const expiresAt = coupon && coupon.reservedUntil
          ? new Date(coupon.reservedUntil).getTime()
          : 0
        const reservedByThisOrder = coupon && coupon.status === 'reserved' && coupon.reservedOrderId === orderId
        const expiredReservation = coupon && coupon.status === 'reserved' && expiresAt > 0 && expiresAt <= now

        if (!coupon || couponOwner(coupon) !== openid || coupon.source !== 'referral') {
          throw new Error('优惠券不存在或无权使用')
        }
        if (coupon.status !== 'available' && !reservedByThisOrder && !expiredReservation) {
          throw new Error('部分优惠券已被其他订单占用，请重新选择')
        }
        docs.push(cid)
      }

      for (const cid of docs) {
        await transaction.collection('user_coupons').doc(cid).update({
          data: {
            status: 'reserved',
            reservedOrderId: orderId,
            reservedTime: db.serverDate(),
            reservedUntil: new Date(reservedUntil)
          }
        })
      }

      return { ...result, reservedUntil }
    })
  } catch (err) {
    return { success: false, error: (err && err.message) || '优惠券占用失败' }
  }
}

async function releaseCouponReservation(db, openid, couponIds, orderId) {
  const ids = [...new Set((couponIds || []).map((id) => String(id).trim()).filter(Boolean))]
  if (!openid || !orderId || !ids.length) return { success: true, skipped: true }

  await db.runTransaction(async (transaction) => {
    for (const cid of ids) {
      const doc = await transaction.collection('user_coupons').doc(cid).get()
      const coupon = doc.data
      if (!coupon || couponOwner(coupon) !== openid) continue
      if (coupon.status === 'reserved' && coupon.reservedOrderId === orderId) {
        await transaction.collection('user_coupons').doc(cid).update({
          data: {
            status: 'available',
            reservedOrderId: '',
            reservedTime: null,
            reservedUntil: null
          }
        })
      }
    }
  })
  return { success: true }
}

async function markCouponsUsed(db, orderId) {
  if (!orderId) return { success: false, skipped: true }

  const orderRes = await db.collection('shop_orders').where({ orderId }).limit(1).get()
  if (!orderRes.data || !orderRes.data.length) return { success: false, skipped: true }
  const order = orderRes.data[0]
  const ids = order.couponIds || []
  if (!ids.length) return { success: true, skipped: true }

  try {
    await db.runTransaction(async (transaction) => {
      const coupons = []
      for (const cid of ids) {
        const doc = await transaction.collection('user_coupons').doc(cid).get()
        const coupon = doc.data
        const alreadyUsedByThisOrder = coupon && coupon.status === 'used' && coupon.usedOrderId === orderId
        const reservedByThisOrder = coupon && coupon.status === 'reserved' && coupon.reservedOrderId === orderId
        const legacyAvailable = coupon && coupon.status === 'available' && !order.couponReservationRequired
        if (!coupon || (!alreadyUsedByThisOrder && !reservedByThisOrder && !legacyAvailable)) {
          throw new Error(`优惠券 ${cid} 未被当前订单占用`)
        }
        coupons.push({ cid, alreadyUsedByThisOrder })
      }

      for (const item of coupons) {
        if (item.alreadyUsedByThisOrder) continue
        await transaction.collection('user_coupons').doc(item.cid).update({
          data: {
            status: 'used',
            usedOrderId: orderId,
            usedTime: db.serverDate(),
            reservedOrderId: '',
            reservedTime: null,
            reservedUntil: null
          }
        })
      }
    })
    return { success: true }
  } catch (e) {
    console.error('[referral] markCouponsUsed transaction failed:', e)
    return { success: false, error: (e && e.message) || '优惠券核销失败' }
  }
}

async function restoreCouponsForOrder(db, order) {
  const ids = (order && order.couponIds) || []
  if (!ids.length) return { success: true, skipped: true }
  const orderId = order.orderId

  for (const cid of ids) {
    try {
      const doc = await db.collection('user_coupons').doc(cid).get()
      const c = doc.data
      if (!c) continue
      const usedByOrder = c.status === 'used' && c.usedOrderId === orderId
      const reservedByOrder = c.status === 'reserved' && c.reservedOrderId === orderId
      if (usedByOrder || reservedByOrder) {
        await db.collection('user_coupons').doc(cid).update({
          data: {
            status: 'available',
            usedOrderId: '',
            usedTime: null,
            reservedOrderId: '',
            reservedTime: null,
            reservedUntil: null,
            restoredTime: db.serverDate()
          }
        })
      }
    } catch (e) {
      console.warn('[referral] restore coupon failed:', cid, e)
    }
  }
  return { success: true }
}

function normalizeInviteCode(raw) {
  if (!raw) return ''
  return String(raw).replace(/[\s-]/g, '').toUpperCase()
}

function isValidInviteCode(code) {
  return new RegExp(`^${CODE_PREFIX}[A-Z0-9]{${CODE_BODY_LEN}}$`).test(code)
}

function randomCodeBody() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < CODE_BODY_LEN; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
}

/** 订单 totalFee 在库中多为「元」；大额整数也可能是「分」 */
function orderPayYuan(order) {
  const raw = Number(order && order.totalFee)
  if (!Number.isFinite(raw)) return NaN
  if (Number.isInteger(raw) && raw >= 10000) return raw / 100
  return raw
}

function orderTriggerYuan(order) {
  const pricingAudit = (order && order.pricingAudit) || {}
  const preCoupon = Number(pricingAudit.preCouponTotalYuan)
  if (Number.isFinite(preCoupon) && preCoupon > 0) return preCoupon
  const serverFull = Number(pricingAudit.serverFullTotal)
  if (Number.isFinite(serverFull) && serverFull > 0) return serverFull
  return orderPayYuan(order)
}

async function hasBoundDevice(db, openid) {
  const byOpenid = await db.collection('sn').where({ openid }).limit(1).count()
  if (byOpenid.total > 0) return true
  const bySystem = await db.collection('sn').where({ _openid: openid }).limit(1).count()
  return bySystem.total > 0
}

async function countPaidShopOrders(db, openid) {
  const res = await db.collection('shop_orders').where({
    _openid: openid,
    status: 'PAID'
  }).count()
  return res.total || 0
}

async function isFirstPaidOrder(db, openid, order) {
  if (!openid || !order) return false
  const res = await db.collection('shop_orders').where({
    _openid: openid,
    status: 'PAID'
  }).orderBy('payTime', 'asc').orderBy('createTime', 'asc').limit(1).get()
  const first = res.data && res.data[0]
  if (!first) return false
  if (first.orderId && order.orderId) return first.orderId === order.orderId
  return String(first._id || '') === String(order._id || '')
}

async function getInviteeBinding(db, inviteeOpenid) {
  const res = await db.collection('referral_bindings').where({ inviteeOpenid }).limit(1).get()
  return res.data && res.data[0] ? res.data[0] : null
}

/** 是否仍可填写好友邀请码（须为未绑设备、未下单、未绑好友码的新人） */
async function canBindInviterCode(db, inviteeOpenid) {
  const binding = await getInviteeBinding(db, inviteeOpenid)
  if (binding) {
    return { ok: false, reason: '已绑定邀请码' }
  }
  const paidCount = await countPaidShopOrders(db, inviteeOpenid)
  if (paidCount > 0) {
    return { ok: false, reason: '已有商城支付订单，无法绑定邀请码' }
  }
  if (await hasBoundDevice(db, inviteeOpenid)) {
    return { ok: false, reason: '已绑定过设备，无法绑定邀请码' }
  }
  return { ok: true }
}

async function getOrCreateReferralCode(db, ownerOpenid) {
  const existing = await db.collection('referral_codes').where({ ownerOpenid }).limit(1).get()
  if (existing.data && existing.data.length > 0) {
    return existing.data[0].code
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = CODE_PREFIX + randomCodeBody()
    const dup = await db.collection('referral_codes').where({ code }).limit(1).get()
    if (dup.data && dup.data.length > 0) continue
    await db.collection('referral_codes').add({
      data: {
        code,
        ownerOpenid,
        createTime: db.serverDate()
      }
    })
    return code
  }
  throw new Error('生成邀请码失败，请稍后重试')
}

async function isAdminOpenid(openid, db) {
  if (!openid) return false
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data && byOpenid.data.length > 0) return true
  const bySystem = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  return !!(bySystem.data && bySystem.data.length > 0)
}

async function getPanel(db, openid) {
  const eligibility = await canBindInviterCode(db, openid)
  const myReferralCode = await getOrCreateReferralCode(db, openid)
  const binding = await getInviteeBinding(db, openid)

  const couponRes = await db.collection('user_coupons').where({
    ownerOpenid: openid,
    status: 'available'
  }).get()
  const referralCoupons = (couponRes.data || []).filter((c) => c && c.source === 'referral')
  let availableCouponTotalFen = 0
  referralCoupons.forEach((c) => {
    availableCouponTotalFen += Number(c.amountFen) || 0
  })

  const inviteCountRes = await db.collection('referral_rewards').where({
    inviterOpenid: openid,
    granted: true
  }).count()

  return {
    success: true,
    canBindInvite: eligibility.ok,
    bindBlockReason: eligibility.ok ? '' : eligibility.reason,
    hasBoundInvite: !!binding,
    myReferralCode,
    availableCouponCount: referralCoupons.length,
    inviteSuccessCount: inviteCountRes.total || 0,
    availableCouponTotalYuan: (availableCouponTotalFen / 100).toFixed(0),
    showMyReferralBlock: true,
    boundInviterCode: binding ? binding.code : '',
    canClaimGiftCoupon: false
  }
}

async function claimGiftCoupon() {
  return { success: false, error: COUPON_ONLY_BY_REFERRAL_MSG }
}

async function grantCouponAdmin() {
  return { success: false, error: COUPON_ONLY_BY_REFERRAL_MSG }
}

async function bindInviteCode(db, inviteeOpenid, rawCode) {
  const code = normalizeInviteCode(rawCode)
  if (!isValidInviteCode(code)) {
    return { success: false, error: '邀请码格式不正确' }
  }

  const existingBinding = await getInviteeBinding(db, inviteeOpenid)
  if (existingBinding) {
    const boundCode = normalizeInviteCode(existingBinding.code)
    if (boundCode === code) {
      const panel = await getPanel(db, inviteeOpenid)
      return { success: true, alreadyBound: true, ...panel }
    }
    return { success: false, error: '已绑定过邀请码' }
  }

  const eligibility = await canBindInviterCode(db, inviteeOpenid)
  if (!eligibility.ok) {
    return { success: false, error: eligibility.reason }
  }

  const codeDocRes = await db.collection('referral_codes').where({ code }).limit(1).get()
  if (!codeDocRes.data || !codeDocRes.data.length) {
    return { success: false, error: '邀请码不存在' }
  }
  const codeDoc = codeDocRes.data[0]
  const inviterOpenid = codeDoc.ownerOpenid
  if (!inviterOpenid) {
    return { success: false, error: '邀请码无效' }
  }
  if (inviterOpenid === inviteeOpenid) {
    return { success: false, error: '不能填写自己的邀请码' }
  }

  try {
    await db.collection('referral_bindings').add({
      data: {
        inviteeOpenid,
        inviterOpenid,
        code,
        bindTime: db.serverDate()
      }
    })
  } catch (err) {
    const msg = String((err && err.message) || err)
    if (msg.includes('duplicate') || msg.includes('唯一')) {
      return { success: false, error: '您已绑定过邀请码' }
    }
    throw err
  }

  const panel = await getPanel(db, inviteeOpenid)
  return { success: true, ...panel }
}

async function grantOnOrderPaid(db, orderId) {
  if (!orderId) return { success: false, skipped: true, reason: 'no orderId' }

  const orderRes = await db.collection('shop_orders').where({ orderId }).limit(1).get()
  if (!orderRes.data || !orderRes.data.length) {
    return { success: false, skipped: true, reason: 'order not found' }
  }
  const order = orderRes.data[0]
  if (order.status !== 'PAID') {
    return { success: false, skipped: true, reason: 'order not PAID' }
  }

  const inviteeOpenid = order._openid
  if (!inviteeOpenid) {
    return { success: false, skipped: true, reason: 'no invitee openid' }
  }

  const paidCount = await countPaidShopOrders(db, inviteeOpenid)
  if (paidCount !== 1) {
    return { success: false, skipped: true, reason: 'not first paid order' }
  }

  const firstPaid = await isFirstPaidOrder(db, inviteeOpenid, order)
  if (!firstPaid) {
    return { success: false, skipped: true, reason: 'not earliest paid order' }
  }

  const triggerYuan = orderTriggerYuan(order)
  if (!Number.isFinite(triggerYuan) || triggerYuan <= MIN_TRIGGER_YUAN) {
    await db.collection('referral_rewards').add({
      data: {
        inviteeOpenid,
        inviterOpenid: '',
        orderId,
        couponId: '',
        amountFen: 0,
        granted: false,
        lockReason: 'first_order_below_threshold',
        triggerYuan: roundMoney(triggerYuan || 0),
        createTime: db.serverDate()
      }
    })
    return { success: false, skipped: true, reason: 'first order below threshold, permanently locked' }
  }

  const binding = await getInviteeBinding(db, inviteeOpenid)
  if (!binding) {
    return { success: false, skipped: true, reason: 'no referral binding' }
  }

  const rewardExists = await db.collection('referral_rewards').where({ inviteeOpenid }).limit(1).get()
  if (rewardExists.data && rewardExists.data.length > 0) {
    return { success: true, skipped: true, reason: 'already rewarded' }
  }

  const inviterOpenid = binding.inviterOpenid
  const couponAdd = await db.collection('user_coupons').add({
    data: {
      ownerOpenid: inviterOpenid,
      amountFen: COUPON_AMOUNT_FEN,
      minSpendFen: MIN_SPEND_FEN,
      status: 'available',
      source: 'referral',
      inviteeOpenid,
      grantFromOrderId: orderId,
      createTime: db.serverDate()
    }
  })

  await db.collection('referral_rewards').add({
    data: {
      inviteeOpenid,
      inviterOpenid,
      orderId,
      couponId: couponAdd._id,
      amountFen: COUPON_AMOUNT_FEN,
      granted: true,
      createTime: db.serverDate()
    }
  })

  try {
    await cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: { openid: inviterOpenid, scene: 'referral_reward' }
    })
  } catch (e) {
    console.warn('[referral] subscribe referral_reward failed', e)
  }

  return { success: true, granted: true, couponId: couponAdd._id }
}

async function revokeOnOrderInvalid(db, orderId, orderDocId) {
  let order = null
  if (orderId) {
    const res = await db.collection('shop_orders').where({ orderId }).limit(1).get()
    order = res.data && res.data[0]
  }
  if (!order && orderDocId) {
    try {
      const doc = await db.collection('shop_orders').doc(orderDocId).get()
      order = doc.data
    } catch (e) {}
  }
  if (!order) {
    return { success: false, skipped: true, reason: 'order not found' }
  }

  try {
    await restoreCouponsForOrder(db, order)
  } catch (e) {
    console.warn('[referral] restoreCouponsForOrder failed:', e)
  }

  const lookupOrderId = order.orderId || orderId
  const inviteeOpenid = order._openid
  if (!lookupOrderId || !inviteeOpenid) {
    return { success: false, skipped: true, reason: 'incomplete order' }
  }

  const rewardRes = await db.collection('referral_rewards').where({
    inviteeOpenid,
    orderId: lookupOrderId
  }).limit(1).get()
  if (!rewardRes.data || !rewardRes.data.length) {
    return { success: true, skipped: true, reason: 'no reward for order' }
  }

  const reward = rewardRes.data[0]
  if (reward.revoked) {
    return { success: true, skipped: true, reason: 'already revoked' }
  }

  if (reward.couponId) {
    try {
      const couponDoc = await db.collection('user_coupons').doc(reward.couponId).get()
      const coupon = couponDoc.data
      if (coupon && coupon.status === 'available') {
        await db.collection('user_coupons').doc(reward.couponId).update({
          data: {
            status: 'revoked',
            revokedTime: db.serverDate(),
            revokeReason: 'order_cancelled_or_refunded'
          }
        })
      } else if (coupon && coupon.status === 'used') {
        await db.collection('user_coupons').doc(reward.couponId).update({
          data: {
            status: 'revoked',
            revokedTime: db.serverDate(),
            revokeReason: 'order_cancelled_after_coupon_used',
            needsManualReview: true
          }
        })
      }
    } catch (e) {
      console.warn('[referral] revoke coupon failed:', e)
    }
  }

  await db.collection('referral_rewards').doc(reward._id).update({
    data: {
      revoked: true,
      revokedTime: db.serverDate()
    }
  })

  return { success: true, revoked: true }
}

exports.main = async (event) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event && event.action

  try {
    if (action === 'getPanel') {
      if (!openid) return { success: false, error: '未登录' }
      return await getPanel(db, openid)
    }

    if (action === 'bindInviteCode') {
      if (!openid) return { success: false, error: '未登录' }
      return await bindInviteCode(db, openid, event.code)
    }

    const internalOnly = new Set([
      'grantOnOrderPaid',
      'revokeOnOrderInvalid',
      'markCouponsUsed',
      'releaseCouponReservation'
    ])
    if (internalOnly.has(action)) {
      const secret = process.env.INTERNAL_CALL_SECRET
      if (!secret || !event || event._internalSecret !== secret) {
        return { success: false, error: '无权调用' }
      }
    }

    if (action === 'grantOnOrderPaid') {
      return await grantOnOrderPaid(db, event.orderId)
    }

    if (action === 'revokeOnOrderInvalid') {
      return await revokeOnOrderInvalid(db, event.orderId, event.orderDocId)
    }

    if (action === 'listCheckoutCoupons') {
      if (!openid) return { success: false, error: '未登录' }
      return await listCheckoutCoupons(db, openid)
    }

    if (action === 'computeCouponDiscount') {
      if (!openid) return { success: false, error: '未登录' }
      return await computeCouponDiscount(
        db,
        openid,
        event.couponIds,
        event.fullTotalYuan,
        event.pricingMode || 'shop'
      )
    }

    if (action === 'reserveCouponDiscount') {
      if (!openid) return { success: false, error: '未登录' }
      return await reserveCouponDiscount(
        db,
        openid,
        event.couponIds,
        event.fullTotalYuan,
        event.pricingMode || 'shop',
        event.orderId
      )
    }

    if (action === 'releaseCouponReservation') {
      if (!openid) return { success: false, error: '未登录' }
      return await releaseCouponReservation(db, openid, event.couponIds, event.orderId)
    }

    if (action === 'markCouponsUsed') {
      return await markCouponsUsed(db, event.orderId)
    }

    if (action === 'claimGiftCoupon' || action === 'grantCouponAdmin') {
      return action === 'claimGiftCoupon'
        ? await claimGiftCoupon()
        : await grantCouponAdmin()
    }

    return { success: false, error: 'unknown action' }
  } catch (err) {
    console.error('[referral]', action, err)
    return { success: false, error: (err && err.message) || '系统错误' }
  }
}
