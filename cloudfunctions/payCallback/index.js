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
  keyPath: path.join(__dirname, 'apiclient_key.pem') // 私钥文件（已复制到当前目录）
}

// 🔴 加载私钥（优先使用单独的私钥文件，如果没有则从p12证书提取）
let privateKey = null
function getPrivateKey() {
  if (privateKey) return privateKey
  
  try {
    // 🔴 方式1：直接读取私钥文件（更可靠）
    if (fs.existsSync(WX_PAY_CONFIG.keyPath)) {
      privateKey = fs.readFileSync(WX_PAY_CONFIG.keyPath, 'utf8')
      console.log('[payCallback] 从私钥文件加载成功')
      return privateKey
    }
    
    // 🔴 方式2：从p12证书中提取（备用方案）
    const p12Path = path.join(__dirname, 'apiclient_cert.p12')
    if (fs.existsSync(p12Path)) {
      const forge = require('node-forge')
      const p12Buffer = fs.readFileSync(p12Path)
      
      let p12
      try {
        const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
        p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '1103782674')
      } catch (e1) {
        try {
          const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
          p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '')
        } catch (e2) {
          throw new Error(`证书加载失败: ${e1.message}`)
        }
      }
      
      let keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
      if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
        keyBags = p12.getBags({ bagType: forge.pki.oids.keyBag })
        if (!keyBags[forge.pki.oids.keyBag] || keyBags[forge.pki.oids.keyBag].length === 0) {
          throw new Error('无法从证书中提取私钥')
        }
        const privateKeyObj = keyBags[forge.pki.oids.keyBag][0]
        privateKey = forge.pki.privateKeyToPem(privateKeyObj.key)
      } else {
        const privateKeyObj = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0]
        privateKey = forge.pki.privateKeyToPem(privateKeyObj.key)
      }
      
      console.log('[payCallback] 从p12证书提取私钥成功')
      return privateKey
    }
    
    throw new Error('私钥文件不存在，且无法从证书中提取')
  } catch (err) {
    console.error('[payCallback] 加载私钥失败:', err)
    throw err
  }
}

// 🔴 生成微信支付 API v3 签名
function generateWxPaySignature(method, url, timestamp, nonce, body) {
  const privateKeyPem = getPrivateKey()
  
  // 🔴 微信支付 API v3 签名字符串格式（注意：最后有一个换行符）
  // 格式：请求方法\nURL\n时间戳\n随机字符串\n请求体\n
  const bodyStr = body || ''
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${bodyStr}\n`
  
  console.log('[payCallback] 签名字符串长度:', signStr.length)
  console.log('[payCallback] 签名字符串（前100字符）:', signStr.substring(0, 100))
  
  try {
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(signStr, 'utf8')
    const signature = sign.sign({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, 'base64')
    
    console.log('[payCallback] 生成的签名长度:', signature.length)
    console.log('[payCallback] 生成的签名（前50字符）:', signature.substring(0, 50) + '...')
    
    return signature
  } catch (err) {
    console.error('[payCallback] 签名生成失败:', err)
    throw err
  }
}

// 🔴 调用订单信息录入接口（同步订单到小程序订单系统）
function syncOrderInfoToMiniProgram(outTradeNo, transactionId, orderData) {
  return new Promise((resolve, reject) => {
    const { mchId, appId, serialNo } = WX_PAY_CONFIG
    const url = '/v3/ecommerce/order/order-info'
    const method = 'POST'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // 构建请求体
    const requestBody = {
      out_trade_no: outTradeNo, // 商户订单号
      transaction_id: transactionId, // 微信支付订单号
      appid: appId, // 小程序 AppID
      order_detail: {
        product_infos: orderData.goodsList ? orderData.goodsList.map(goods => ({
          product_name: goods.name || '商品',
          product_price: Math.round((goods.total || 0) * 100), // 转为分
          product_quantity: goods.quantity || 1
        })) : [{
          product_name: 'MT摩改社-车辆定制改装与维修服务费',
          product_price: Math.round((orderData.totalFee || 0) * 100),
          product_quantity: 1
        }]
      }
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
    
    console.log('[payCallback] 订单信息录入 - 请求 URL:', url)
    console.log('[payCallback] 订单信息录入 - 请求方法:', method)
    console.log('[payCallback] 订单信息录入 - 商户号:', mchId)
    console.log('[payCallback] 订单信息录入 - 证书序列号:', serialNo)
    console.log('[payCallback] 订单信息录入 - 请求体:', bodyStr)
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          console.log('[payCallback] 订单信息录入响应状态码:', res.statusCode)
          console.log('[payCallback] 订单信息录入响应头:', JSON.stringify(res.headers, null, 2))
          console.log('[payCallback] 订单信息录入响应数据:', data)
          
          if (res.statusCode === 200) {
            const result = JSON.parse(data)
            console.log('[payCallback] ✅ 订单信息录入成功:', JSON.stringify(result, null, 2))
            resolve(result)
          } else {
            console.error('[payCallback] ❌ 订单信息录入失败，状态码:', res.statusCode, '响应:', data)
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        } catch (e) {
          console.error('[payCallback] 解析响应失败:', e)
          reject(new Error(`解析响应失败: ${e.message}`))
        }
      })
    })
    
    req.on('error', (err) => {
      console.error('[payCallback] 请求错误:', err)
      reject(err)
    })
    req.write(bodyStr)
    req.end()
  })
}

// 🔴 解密回调数据（API v3 使用 AES-256-GCM 加密）
function decryptCallbackData(encryptedData, nonce, associatedData) {
  try {
    console.log('[payCallback] 开始解密，加密数据长度:', encryptedData ? encryptedData.length : 0)
    console.log('[payCallback] nonce:', nonce)
    console.log('[payCallback] associatedData:', associatedData)
    
    const key = Buffer.from(WX_PAY_CONFIG.apiV3Key, 'utf8')
    const encrypted = Buffer.from(encryptedData, 'base64')
    const nonceBuf = Buffer.from(nonce, 'utf8') // 🔴 nonce 是 UTF-8 字符串，不是 base64
    const associated = Buffer.from(associatedData || 'transaction', 'utf8')
    
    console.log('[payCallback] 准备解密，key 长度:', key.length, 'nonce 长度:', nonceBuf.length)
    
    // 🔴 GCM 模式解密：最后 16 字节是 auth tag
    const authTagLength = 16
    const authTag = encrypted.slice(encrypted.length - authTagLength)
    const ciphertext = encrypted.slice(0, encrypted.length - authTagLength)
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonceBuf)
    decipher.setAuthTag(authTag)
    decipher.setAAD(associated)
    
    let decrypted = decipher.update(ciphertext, null, 'utf8')
    decrypted += decipher.final('utf8')
    
        console.log('[payCallback] ✅ 解密成功')
        const result = JSON.parse(decrypted)
        console.log('[payCallback] 解密数据关键字段 - trade_state:', result.trade_state, 'out_trade_no:', result.out_trade_no)
        return result
  } catch (err) {
    console.error('[payCallback] 解密回调数据失败:', err)
    console.error('[payCallback] 错误详情:', err.message)
    console.error('[payCallback] 错误堆栈:', err.stack)
    throw err
  }
}

// 🔴 微信支付 API v3 回调处理
exports.main = async (event, context) => {
  const db = cloud.database()
  
  console.log('[payCallback] ========== 收到支付回调 ==========')
  // 🔴 避免序列化整个 event（可能太大导致超时），只输出关键信息
  console.log('[payCallback] event.httpMethod:', event.httpMethod)
  console.log('[payCallback] event.path:', event.path)
  console.log('[payCallback] event.body 类型:', typeof event.body)
  console.log('[payCallback] event.body 长度:', typeof event.body === 'string' ? event.body.length : 'N/A')
  console.log('[payCallback] event.headers 存在:', !!event.headers)
  // 只输出 body 的前 500 个字符，避免太大
  if (event.body && typeof event.body === 'string') {
    console.log('[payCallback] event.body (前500字符):', event.body.substring(0, 500))
  }
  
  try {
    // 🔴 HTTP 触发的 event 格式处理
    // 云开发 HTTP 触发时，event 可能包含：
    // - event.headers: 请求头（对象）
    // - event.body: 请求体（字符串，需要 JSON.parse）
    // - event.path: 请求路径
    // - event.httpMethod: 请求方法
    // - event.queryString: 查询字符串
    // - event.pathParameters: 路径参数
    
    let headers = {}
    let body = null
    
    // 🔴 检查是否是 HTTP 触发格式
    if (event.httpMethod || event.path || event.headers || event.body !== undefined) {
      console.log('[payCallback] 检测到 HTTP 触发格式')
      headers = event.headers || {}
      
      // body 可能是字符串，需要解析
      if (event.body !== undefined && event.body !== null) {
        try {
          if (typeof event.body === 'string') {
            console.log('[payCallback] body 是字符串，开始解析 JSON...')
            body = JSON.parse(event.body)
            console.log('[payCallback] body JSON 解析成功')
          } else {
            body = event.body
            console.log('[payCallback] body 不是字符串，直接使用')
          }
        } catch (e) {
          console.error('[payCallback] 解析 body 失败:', e)
          console.error('[payCallback] 原始 body 类型:', typeof event.body)
          console.error('[payCallback] 原始 body 内容（前500字符）:', typeof event.body === 'string' ? event.body.substring(0, 500) : event.body)
          // 如果解析失败，可能是其他格式，保留原始值
          body = event.body
        }
      }
    } else {
      // 兼容旧格式（直接传递的对象）
      console.log('[payCallback] 使用兼容格式处理')
      headers = event.headers || {}
      body = event.body || event
    }
    
    console.log('[payCallback] headers:', JSON.stringify(headers, null, 2))
    console.log('[payCallback] body:', JSON.stringify(body, null, 2))
    console.log('[payCallback] body 类型:', typeof body)
    console.log('[payCallback] event.httpMethod:', event.httpMethod)
    console.log('[payCallback] event.path:', event.path)
    
    // 获取签名信息（微信支付 API v3 回调的请求头）
    const signature = headers['Wechatpay-Signature'] || headers['wechatpay-signature'] || headers['wechatpay-signature'.toLowerCase()]
    const timestamp = headers['Wechatpay-Timestamp'] || headers['wechatpay-timestamp'] || headers['wechatpay-timestamp'.toLowerCase()]
    const nonce = headers['Wechatpay-Nonce'] || headers['wechatpay-nonce'] || headers['wechatpay-nonce'.toLowerCase()]
    const serial = headers['Wechatpay-Serial'] || headers['wechatpay-serial'] || headers['wechatpay-serial'.toLowerCase()]
    
    console.log('[payCallback] 签名信息:', { signature, timestamp, nonce, serial })
    console.log('[payCallback] 所有请求头键名:', Object.keys(headers))
    
    // 🔴 如果 body 是字符串，需要解析（HTTP 触发的 body 通常是字符串）
    if (typeof body === 'string') {
      try {
        console.log('[payCallback] body 是字符串，开始解析 JSON...')
        body = JSON.parse(body)
        console.log('[payCallback] body 解析成功:', JSON.stringify(body, null, 2))
      } catch (parseErr) {
        console.error('[payCallback] body JSON 解析失败:', parseErr)
        console.error('[payCallback] 原始 body 内容:', body)
        // 解析失败时，尝试继续处理
      }
    }
    
    // 如果 body 为空或不存在，尝试兼容其他格式
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      console.warn('[payCallback] body 为空，尝试从 event 中获取数据...')
      body = event
    }
    
    // 🔴 简化日志，避免超时
    console.log('[payCallback] body 有效性检查:', !!body, '是否有 resource:', !!(body && body.resource))
    
    // 如果有加密数据，需要解密
    if (body && body.resource) {
      console.log('[payCallback] ✅ 开始解密支付回调数据')
      const resource = body.resource
      
      try {
        const decryptedData = decryptCallbackData(
          resource.ciphertext,
          resource.nonce,
          resource.associated_data
        )
        
        console.log('[payCallback] 🎯 开始处理支付结果')
        
        // 处理支付结果
        if (decryptedData.trade_state === 'SUCCESS') {
          const outTradeNo = decryptedData.out_trade_no
          const transactionId = decryptedData.transaction_id
          console.log('[payCallback] 支付成功，订单号:', outTradeNo, '交易单号:', transactionId)
          
          // 1. 先获取订单信息
          const orderRes = await db.collection('shop_orders').where({
            orderId: outTradeNo
          }).get()
          
          if (orderRes.data && orderRes.data.length > 0) {
            const order = orderRes.data[0]
            
            // 2. 更新订单状态
            const updateRes = await db.collection('shop_orders').where({
              orderId: outTradeNo
            }).update({
              data: {
                status: 'PAID',
                payTime: db.serverDate(),
                transactionId: transactionId // 微信支付订单号
              }
            })
            
            console.log('[payCallback] 订单状态更新结果:', updateRes)
            
            // 3. 🔴 同步订单信息到小程序订单系统
            try {
              const orderInfoRes = await syncOrderInfoToMiniProgram(
                outTradeNo,
                transactionId,
                {
                  goodsList: order.goodsList || [],
                  totalFee: order.totalFee || 0
                }
              )
              console.log('[payCallback] 订单信息录入成功:', orderInfoRes)
            } catch (orderInfoErr) {
              console.error('[payCallback] 订单信息录入失败:', orderInfoErr)
              // 即使录入失败，也不影响订单状态更新
            }
            
            console.log('[payCallback] 订单', outTradeNo, '状态已更新为 PAID')
          } else {
            console.warn('[payCallback] 未找到订单:', outTradeNo)
          }
          
          return { code: 'SUCCESS', message: '成功' }
        } else {
          console.log('[payCallback] 支付状态非成功:', decryptedData.trade_state)
        }
      } catch (decryptErr) {
        console.error('[payCallback] 解密失败:', decryptErr)
        throw decryptErr
      }
    } else {
      console.log('[payCallback] 未找到加密数据，尝试兼容格式...')
    }
    
    // 兼容旧格式（如果还有）
    if (event.outTradeNo && event.resultCode === 'SUCCESS') {
      await db.collection('shop_orders').where({
        orderId: event.outTradeNo
      }).update({
        data: {
          status: 'PAID',
          payTime: db.serverDate()
        }
      })
      return { errcode: 0, errmsg: 'SUCCESS' }
    }
    
    // 必须返回成功，否则微信会重试
    return { code: 'SUCCESS', message: '成功' }
    
  } catch (err) {
    console.error('支付回调处理失败:', err)
    // 即使出错也要返回成功，避免微信重复回调
    return { code: 'SUCCESS', message: '成功' }
  }
}
