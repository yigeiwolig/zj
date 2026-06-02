const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const COUPON_AMOUNT_FEN = 1500
const MIN_TRIGGER_YUAN = 300
const MIN_SPEND_FEN = COUPON_AMOUNT_FEN + 1
const CODE_PREFIX = 'INV'
const CODE_BODY_LEN = 6

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

async function getInviteeBinding(db, inviteeOpenid) {
  const res = await db.collection('referral_bindings').where({ inviteeOpenid }).limit(1).get()
  return res.data && res.data[0] ? res.data[0] : null
}

async function canBeInvitee(db, inviteeOpenid) {
  const binding = await getInviteeBinding(db, inviteeOpenid)
  if (binding) {
    return { ok: false, reason: '已绑定邀请码' }
  }
  const paidCount = await countPaidShopOrders(db, inviteeOpenid)
  if (paidCount > 0) {
    return { ok: false, reason: '已有商城支付订单，无法作为新用户绑定' }
  }
  if (await hasBoundDevice(db, inviteeOpenid)) {
    return { ok: false, reason: '已绑定过设备，无法作为新用户绑定' }
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

async function getPanel(db, openid) {
  const eligibility = await canBeInvitee(db, openid)
  const myReferralCode = await getOrCreateReferralCode(db, openid)
  const binding = await getInviteeBinding(db, openid)

  const couponRes = await db.collection('user_coupons').where({
    ownerOpenid: openid,
    status: 'available'
  }).get()
  const coupons = couponRes.data || []
  let availableCouponTotalFen = 0
  coupons.forEach((c) => {
    availableCouponTotalFen += Number(c.amountFen) || 0
  })

  return {
    success: true,
    canBindInvite: eligibility.ok,
    bindBlockReason: eligibility.ok ? '' : eligibility.reason,
    hasBoundInvite: !!binding,
    myReferralCode,
    availableCouponCount: coupons.length,
    availableCouponTotalYuan: (availableCouponTotalFen / 100).toFixed(0),
    showMyReferralBlock: !eligibility.ok || !!binding
  }
}

async function bindInviteCode(db, inviteeOpenid, rawCode) {
  const code = normalizeInviteCode(rawCode)
  if (!isValidInviteCode(code)) {
    return { success: false, error: '邀请码格式不正确' }
  }

  const eligibility = await canBeInvitee(db, inviteeOpenid)
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

  const paidYuan = orderPayYuan(order)
  if (!Number.isFinite(paidYuan) || paidYuan < MIN_TRIGGER_YUAN) {
    return { success: false, skipped: true, reason: 'amount below threshold' }
  }

  const paidCount = await countPaidShopOrders(db, inviteeOpenid)
  if (paidCount !== 1) {
    return { success: false, skipped: true, reason: 'not first paid order' }
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
      createTime: db.serverDate()
    }
  })

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

    if (action === 'grantOnOrderPaid') {
      return await grantOnOrderPaid(db, event.orderId)
    }

    if (action === 'revokeOnOrderInvalid') {
      return await revokeOnOrderInvalid(db, event.orderId, event.orderDocId)
    }

    return { success: false, error: 'unknown action' }
  } catch (err) {
    console.error('[referral]', action, err)
    return { success: false, error: (err && err.message) || '系统错误' }
  }
}
