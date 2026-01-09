// cloudfunctions/adminUpdateOrder/index.js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 🔴 微信支付配置（需要和 createOrder 保持一致）
const WX_PAY_CONFIG = {
  mchId: '1103782674',
  appId: 'wxf1a81dd77d810edf',
  apiV3Key: 'MTMoGaiSheWeChatPay2025Key888888',
  serialNo: '73F820E3A9CBFF6FF509EAB7B2449CEBAB33E479',
  keyPath: path.join(__dirname, '../createOrder/apiclient_key.pem') // 复用 createOrder 的私钥文件
}

// 🔴 加载私钥（复用 createOrder 的逻辑）
let privateKey = null
function getPrivateKey() {
  if (privateKey) return privateKey
  
  try {
    if (fs.existsSync(WX_PAY_CONFIG.keyPath)) {
      privateKey = fs.readFileSync(WX_PAY_CONFIG.keyPath, 'utf8')
      console.log('[adminUpdateOrder] 从私钥文件加载成功')
      return privateKey
    }
    throw new Error('私钥文件不存在')
  } catch (err) {
    console.error('加载私钥失败:', err)
    throw err
  }
}

// 🔴 生成微信支付 API v3 签名
function generateWxPaySignature(method, url, timestamp, nonce, body) {
  const privateKeyPem = getPrivateKey()
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`
  
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signStr, 'utf8')
  const signature = sign.sign({
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, 'base64')
  
  return signature
}

// 🔴 调用微信支付 API v3 发货信息同步接口
function syncDeliveryToWxPay(outTradeNo, trackingId) {
  return new Promise((resolve, reject) => {
    const { mchId, serialNo } = WX_PAY_CONFIG
    const url = '/v3/ecommerce/delivery/delivery-notify'
    const method = 'POST'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // 构建请求体
    const requestBody = {
      out_trade_no: outTradeNo, // 商户订单号
      delivery_result: 'SUCCESS', // 发货结果：SUCCESS-成功，FAIL-失败
      delivery_msg: '商品已发货', // 发货信息
      logistics_type: 'EXPRESS' // 物流类型：EXPRESS-快递，POST-平邮，EMS-EMS
    }
    
    // 如果有物流单号，添加到参数中
    if (trackingId && trackingId.trim()) {
      requestBody.logistics_id = trackingId.trim()
    }
    
    const bodyStr = JSON.stringify(requestBody)
    
    // 生成签名
    const signature = generateWxPaySignature(method, url, timestamp, nonce, bodyStr)
    
    // 构建 Authorization 头
    const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`
    
    // 发送请求
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'WeChatPay-APIv3-NodeJS'
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data))
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        } catch (e) {
          reject(new Error(`解析响应失败: ${e.message}`))
        }
      })
    })
    
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const { id, action, trackingId, newPrice } = event // 接收 newPrice

  try {
    // 1. 发货
    if (action === 'ship') {
      // 🔴 【新增】电商模式：先获取订单信息，用于同步发货信息到微信
      const orderRes = await db.collection('shop_orders').doc(id).get()
      if (!orderRes.data) {
        return { success: false, errMsg: '订单不存在' }
      }
      
      const order = orderRes.data
      const outTradeNo = order.orderId // 商户订单号
      
      // 🔴 【新增】电商模式：调用微信支付 API v3 发货信息同步接口
      try {
        const deliveryRes = await syncDeliveryToWxPay(outTradeNo, trackingId)
        console.log('[adminUpdateOrder] 发货信息同步成功:', outTradeNo, deliveryRes)
      } catch (deliveryErr) {
        console.error('[adminUpdateOrder] 发货信息同步失败:', deliveryErr)
        console.error('[adminUpdateOrder] 错误详情:', JSON.stringify(deliveryErr, null, 2))
        // 即使同步失败，也继续更新数据库状态（避免阻塞发货流程）
        // 但记录错误，方便排查问题
      }
      
      // 更新数据库订单状态
      return await db.collection('shop_orders').doc(id).update({
        data: {
          status: 'SHIPPED',
          trackingId: trackingId,
          lastLogistics: '卖家已发货，等待揽收',
          updateTime: db.serverDate()
        }
      })
    }
    
    // 2. 删除/取消订单 (用户点取消，或管理员删单)
    if (action === 'delete') {
      return await db.collection('shop_orders').doc(id).remove()
    }

    // 3. 模拟支付
    if (action === 'simulate_pay') {
      return await db.collection('shop_orders').doc(id).update({
        data: { status: 'PAID', payTime: db.serverDate() }
      })
    }

    // 4. 【新增】管理员改价
    if (action === 'update_price') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          totalFee: Number(newPrice), // 确保是数字
          updateTime: db.serverDate()
        }
      })
    }

    return { success: true }

  } catch (err) {
    return { success: false, errMsg: err }
  }
}
