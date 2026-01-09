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

const WX_PAY_CONFIG = {
  mchId: '1103782674',
  appId: 'wxf1a81dd77d810edf',
  apiV3Key: 'MTMoGaiSheWeChatPay2025Key888888',
  serialNo: '73F820E3A9CBFF6FF509EAB7B2449CEBAB33E479',
  keyPath: path.join(__dirname, 'apiclient_key.pem'),
  certPath: path.join(__dirname, 'apiclient_cert.p12')
}

let privateKeyCache = null
function getPrivateKey() {
  if (privateKeyCache) return privateKeyCache
  if (fs.existsSync(WX_PAY_CONFIG.keyPath)) {
    privateKeyCache = fs.readFileSync(WX_PAY_CONFIG.keyPath, 'utf8')
    return privateKeyCache
  }
  if (!fs.existsSync(WX_PAY_CONFIG.certPath)) {
    throw new Error('私钥文件不存在，且无法从证书中提取')
  }
  const p12Buffer = fs.readFileSync(WX_PAY_CONFIG.certPath)
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, WX_PAY_CONFIG.mchId)
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
    const { mchId, serialNo } = WX_PAY_CONFIG
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
  const { appId } = WX_PAY_CONFIG
  const appSecret = 'bc6cf6a358e84c3f88c105cf19b70fbd'
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
      mchid: WX_PAY_CONFIG.mchId
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

  await db.collection('shop_orders').where({ orderId: orderDoc.orderId }).update({
    data: {
      status: 'PAID',
      transactionId,
      payTime
    }
  })

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

exports.main = async (event = {}) => {
  try {
    if (isTimerEvent(event)) {
      const batchSize = event.batchSize || 20
      const batchResult = await batchCheckUnpaidOrders(batchSize)
      return { success: true, msg: '定时查单完成', data: batchResult }
    }

    const orderId = event.orderId || event.outTradeNo
    if (!orderId) {
      return { success: false, msg: '缺少 orderId 参数' }
    }

    const orderRes = await db.collection('shop_orders').where({ orderId }).get()
    if (!orderRes.data.length) {
      return { success: false, msg: '订单不存在' }
    }

    return await handleOrderPayment(orderRes.data[0])
  } catch (err) {
    console.error('[checkPayResult] 全局异常:', err)
    return { success: false, msg: err.message }
  }
}
