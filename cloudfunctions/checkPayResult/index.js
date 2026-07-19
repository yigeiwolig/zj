// cloudfunctions/checkPayResult/index.js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')
const forge = require('node-forge')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

let _wxPayConfigCache = null

function getWxPayConfig() {
  if (_wxPayConfigCache) return _wxPayConfigCache
  const mchId = process.env.WX_PAY_MCH_ID
  const appId = process.env.WX_PAY_APP_ID
  const apiV3Key = process.env.WX_PAY_API_V3_KEY
  if (!mchId || !appId || !apiV3Key) {
    throw new Error('缺少微信支付环境变量 WX_PAY_MCH_ID / WX_PAY_APP_ID / WX_PAY_API_V3_KEY')
  }
  _wxPayConfigCache = {
    mchId,
    appId,
    apiV3Key,
    serialNo: process.env.WX_PAY_SERIAL_NO || '',
    keyPath: path.join(__dirname, 'apiclient_key.pem'),
    certPath: path.join(__dirname, 'apiclient_cert.p12')
  }
  return _wxPayConfigCache
}

let privateKeyCache = null
function getPrivateKey() {
  if (privateKeyCache) return privateKeyCache
  const cfg = getWxPayConfig()
  if (fs.existsSync(cfg.keyPath)) {
    privateKeyCache = fs.readFileSync(cfg.keyPath, 'utf8')
    return privateKeyCache
  }
  if (!fs.existsSync(cfg.certPath)) {
    throw new Error('私钥文件不存在，且无法从证书中提取')
  }
  const p12Buffer = fs.readFileSync(cfg.certPath)
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, cfg.mchId)
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const privateKeyObj = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0]
  if (!privateKeyObj) {
    throw new Error('无法从证书中提取私钥')
  }
  privateKeyCache = forge.pki.privateKeyToPem(privateKeyObj.key)
  return privateKeyCache
}

function generateWxPaySignature(method, url, timestamp, nonce, body) {
  const privateKeyPem = getPrivateKey()
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body || ''}\n`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signStr, 'utf8')
  return sign.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, 'base64')
}

function queryOrderByOutTradeNo(outTradeNo) {
  return new Promise((resolve, reject) => {
    const { mchId, serialNo } = getWxPayConfig()
    const urlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchId}`
    const method = 'GET'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    const signature = generateWxPaySignature(method, urlPath, timestamp, nonce, '')
    const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`
    const req = https.request({
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: urlPath,
      method,
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
        'User-Agent': 'WeChatPay-APIv3-NodeJS'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error('解析微信返回失败'))
          }
        } else {
          console.error('[checkPayResult] 查询订单失败:', data)
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function getAccessToken() {
  const { appId } = getWxPayConfig()
  const appSecret = process.env.WX_APP_SECRET || process.env.WX_PAY_APP_SECRET || ''
  if (!appSecret) {
    throw new Error('未配置 WX_APP_SECRET 环境变量')
  }
  return new Promise((resolve, reject) => {
    https.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.access_token) {
            resolve(result.access_token)
          } else {
            reject(new Error(result.errmsg || '获取 access_token 失败'))
          }
        } catch (e) {
          reject(new Error('解析 access_token 响应失败'))
        }
      })
    }).on('error', reject)
  })
}

async function syncOrderInfoToMiniProgram(outTradeNo, transactionId, orderData, openId) {
  if (!openId) {
    throw new Error('上传订单失败：缺失用户 openId')
  }
  const accessToken = await getAccessToken()
  const orderInfo = {
    order_key: {
      order_number_type: 1,
      order_number: outTradeNo,
      mchid: getWxPayConfig().mchId
    },
    payer: {
      openid: openId
    },
    logistics_type: 1,
    create_time: orderData.createTime
      ? Math.floor(new Date(orderData.createTime).getTime() / 1000).toString()
      : Math.floor(Date.now() / 1000).toString(),
    order_detail: {
      product_infos: (orderData.goodsList || []).map(goods => ({
        out_product_id: goods.modelName || goods._id || goods.name || 'default',
        product_cnt: Number(goods.quantity) || 1,
        sale_price: Math.round((goods.total || goods.price || orderData.totalFee || 0) * 100),
        title: goods.name || '商品',
        path: 'pages/index/index',
        head_img: goods.img && goods.img.startsWith('http') ? goods.img : undefined
      }))
    }
  }
  if (orderInfo.order_detail.product_infos.length === 0) {
    orderInfo.order_detail.product_infos.push({
      out_product_id: 'service_default',
      product_cnt: 1,
      sale_price: Math.round((orderData.totalFee || 0) * 100),
      title: '改装维修服务',
      path: 'pages/index/index'
    })
  }
  const bodyStr = JSON.stringify(orderInfo)
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.weixin.qq.com',
      path: `/wxa/sec/order/upload_order?access_token=${accessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.errcode === 0) {
            resolve(result)
          } else {
            reject(new Error(`订单中心错误 ${result.errcode}: ${result.errmsg}`))
          }
        } catch (e) {
          reject(new Error('解析订单中心响应失败'))
        }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

/** 支付成功后的业务副作用（维修费、引导购配件、购物待发货推群等），幂等可重试 */
async function postOrderPaidSideEffects(orderDoc) {
  if (!orderDoc || !orderDoc.orderId) return

  const repairId = orderDoc.repairId ? String(orderDoc.repairId).trim() : ''
  const orderSource = (orderDoc.orderSource || '').toString().trim()

  // 购物单（售后配件 / MT商城）：付款成功 → 【待发货】推群（不含维修费）
  if (!orderDoc.isRepairPayment) {
    try {
      await cloud.callFunction({
        name: 'wecomNotify',
        data: {
          action: 'notifyShopOrderPaid',
          orderId: orderDoc.orderId,
          orderSnapshot: orderDoc
        }
      })
      console.log('[checkPayResult] wecomNotify shop paid 已触发', orderDoc.orderId)
    } catch (err) {
      console.error('[checkPayResult] wecomNotify shop paid 失败:', err)
    }
    // 用户：订单排单中（服务进度模板）
    try {
      await cloud.callFunction({
        name: 'sendSubscribeMessage',
        data: {
          scene: 'shop_queued',
          orderId: orderDoc.orderId,
          openid: orderDoc._openid || orderDoc.openid || ''
        }
      })
    } catch (subErr) {
      console.warn('[checkPayResult] subscribe shop_queued failed', subErr)
    }
  }

  if (orderDoc.isRepairPayment && repairId) {
    try {
      await db.collection('shouhou_repair').doc(repairId).update({
        data: {
          repairPaid: true,
          repairPaidTime: db.serverDate(),
          repairPayOrderId: orderDoc.orderId || ''
        }
      })
      console.log('[checkPayResult] repairPaid 已更新', repairId)
      try {
        await cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: { repairId, scene: 'paid_ok' }
        })
      } catch (subErr) {
        console.warn('[checkPayResult] subscribe paid_ok failed', subErr)
      }
    } catch (err) {
      console.error('[checkPayResult] 更新 repairPaid 失败:', err)
    }
    // 付费成功后再推地址+单号（过保流程关键：付费前通知不含地址）
    try {
      await cloud.callFunction({
        name: 'wecomNotify',
        data: {
          action: 'notifyRepairPaid',
          repairId,
          payOrderId: orderDoc.orderId || '',
          orderId: orderDoc.orderId || ''
        }
      })
      console.log('[checkPayResult] wecomNotify repairPaid 已触发', repairId)
    } catch (err) {
      console.error('[checkPayResult] wecomNotify repairPaid 失败:', err)
    }
  }

  if (repairId && orderSource === 'shouhou') {
    try {
      const repairRes = await db.collection('shouhou_repair').doc(repairId).get()
      if (repairRes.data && repairRes.data.purchasePartsStatus === 'completed') {
        console.log('[checkPayResult] 引导购配件已完成，跳过 writeShouhouguoqi', repairId)
        return
      }
      await cloud.callFunction({
        name: 'writeShouhouguoqi',
        data: {
          repairId,
          goodsList: orderDoc.goodsList || [],
          addressData: orderDoc.address || {},
          userNickname: orderDoc.userNickname || '',
          orderId: orderDoc.orderId
        }
      })
      console.log('[checkPayResult] writeShouhouguoqi 已触发', repairId)
    } catch (err) {
      console.error('[checkPayResult] writeShouhouguoqi 失败:', err)
    }
  }
}

async function handleOrderPayment(orderDoc) {
  if (!orderDoc || !orderDoc.orderId) {
    return { success: false, msg: '订单数据异常' }
  }
  const processedStatus = ['PAID', 'SHIPPED', 'SIGNED', 'COMPLETED']
  if (processedStatus.includes(orderDoc.status) && orderDoc.transactionId) {
    return { success: true, msg: '订单已处理' }
  }

  let wxOrder
  try {
    wxOrder = await queryOrderByOutTradeNo(orderDoc.orderId)
  } catch (err) {
    console.error('[checkPayResult] 查询微信订单失败:', err)
    return { success: false, msg: '查询微信支付状态失败: ' + err.message }
  }

  if (!wxOrder || wxOrder.trade_state !== 'SUCCESS') {
    return { success: false, msg: '微信返回状态: ' + (wxOrder ? wxOrder.trade_state : '未知') }
  }

  const transactionId = wxOrder.transaction_id
  const payTime = wxOrder.success_time ? new Date(wxOrder.success_time) : new Date()

  // 先原子核销当前订单占用的优惠券，再把订单标记为已支付。
  if (Array.isArray(orderDoc.couponIds) && orderDoc.couponIds.length > 0) {
    const secret = process.env.INTERNAL_CALL_SECRET
    if (!secret) return { success: false, msg: '优惠券核销配置缺失' }
    const couponCall = await cloud.callFunction({
      name: 'referral',
      data: { action: 'markCouponsUsed', orderId: orderDoc.orderId, _internalSecret: secret }
    })
    const couponResult = couponCall && couponCall.result
    if (!couponResult || !couponResult.success) {
      return { success: false, msg: (couponResult && couponResult.error) || '优惠券核销失败' }
    }
  }

  await db.collection('shop_orders').where({ orderId: orderDoc.orderId }).update({
    data: {
      status: 'PAID',
      transactionId,
      payTime
    }
  })

  const paidOrder = {
    ...orderDoc,
    status: 'PAID',
    transactionId,
    payTime
  }
  await postOrderPaidSideEffects(paidOrder)

  try {
    await syncOrderInfoToMiniProgram(orderDoc.orderId, transactionId, {
      goodsList: orderDoc.goodsList || [],
      totalFee: orderDoc.totalFee || 0,
      createTime: orderDoc.createTime || orderDoc._createTime || payTime,
      payTime
    }, orderDoc._openid)
  } catch (syncErr) {
    console.error('[checkPayResult] 同步订单中心失败:', syncErr)
    return {
      success: true,
      msg: '支付已确认，但同步订单中心失败: ' + syncErr.message,
      orderId: orderDoc.orderId,
      transactionId,
      syncError: syncErr.message
    }
  }

  return {
    success: true,
    msg: '支付确认成功',
    orderId: orderDoc.orderId,
    transactionId
  }
}

async function batchCheckUnpaidOrders(limit = 20) {
  const res = await db.collection('shop_orders')
    .where({ status: 'UNPAID' })
    .limit(limit)
    .get()

  const cutoff = Date.now() - 60 * 1000
  const orders = res.data.filter(item => {
    const time = item.createTime || item._createTime
    if (!time) return true
    return new Date(time).getTime() <= cutoff
  })

  const results = []
  for (const order of orders) {
    try {
      const result = await handleOrderPayment(order)
      results.push({ orderId: order.orderId, ...result })
    } catch (err) {
      results.push({ orderId: order.orderId, success: false, msg: err.message })
    }
  }
  return results
}

function isTimerEvent(event) {
  if (!event) return false
  if (typeof event === 'string') {
    try {
      const parsed = JSON.parse(event)
      return isTimerEvent(parsed)
    } catch (e) {
      return false
    }
  }
  if (event.Type === 'Timer' || event.type === 'timer') return true
  if (event.TriggerSource === 'timer' || event.triggerSource === 'timer') return true
  if (event.TriggerName || event.triggerName) return true
  if (event.source === 'timer') return true
  return false
}

function verifyInternalTimerSecret(event) {
  const secret = process.env.INTERNAL_CALL_SECRET
  if (!secret) {
    console.error('[checkPayResult] INTERNAL_CALL_SECRET 未配置，拒绝定时查单')
    return false
  }
  return !!(event && event._internalSecret === secret)
}

exports.main = async (event = {}) => {
  try {
    if (isTimerEvent(event)) {
      if (!verifyInternalTimerSecret(event)) {
        return { success: false, msg: '无权执行定时查单' }
      }
      const batchSize = event.batchSize || 20
      const batchResult = await batchCheckUnpaidOrders(batchSize)
      return { success: true, msg: '定时查单完成', data: batchResult }
    }

    const orderId = event.orderId || event.outTradeNo
    if (!orderId) {
      return { success: false, msg: '缺少 orderId 参数' }
    }

    const callerOpenid = cloud.getWXContext().OPENID
    if (!callerOpenid) {
      return { success: false, msg: '未登录' }
    }

    const orderRes = await db.collection('shop_orders').where({ orderId }).get()
    if (!orderRes.data.length) {
      return { success: false, msg: '订单不存在' }
    }

    const orderDoc = orderRes.data[0]
    if (orderDoc._openid && orderDoc._openid !== callerOpenid) {
      const byOpenid = await db.collection('guanliyuan').where({ openid: callerOpenid }).limit(1).get()
      const bySystem = await db.collection('guanliyuan').where({ _openid: callerOpenid }).limit(1).get()
      const isAdmin = (byOpenid.data && byOpenid.data.length) || (bySystem.data && bySystem.data.length)
      if (!isAdmin) {
        return { success: false, msg: '无权查询该订单' }
      }
    }

    return await handleOrderPayment(orderDoc)
  } catch (err) {
    console.error('[checkPayResult] 全局异常:', err)
    return { success: false, msg: err.message }
  }
}
