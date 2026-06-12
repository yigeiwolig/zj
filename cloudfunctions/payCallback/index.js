const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

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
    keyPath: path.join(__dirname, 'apiclient_key.pem')
  }
  return _wxPayConfigCache
}

function internalCallData(data) {
  const secret = process.env.INTERNAL_CALL_SECRET
  if (!secret) {
    console.error('[payCallback] INTERNAL_CALL_SECRET 未配置')
    return data
  }
  return { ...data, _internalSecret: secret }
}

function verifyWechatPayNotify({ timestamp, nonce, signature, bodyStr }) {
  const pem = process.env.WECHATPAY_PLATFORM_PUB_PEM
  if (!pem) {
    console.error('[payCallback] WECHATPAY_PLATFORM_PUB_PEM 未配置')
    return false
  }
  const pubKey = pem.replace(/\\n/g, '\n')
  const message = `${timestamp}\n${nonce}\n${bodyStr}\n`
  const verify = crypto.createVerify('RSA-SHA256')
  verify.update(message, 'utf8')
  return verify.verify(pubKey, signature, 'base64')
}

// 🔴 加载私钥（优先使用单独的私钥文件，如果没有则从p12证书提取）
let privateKey = null
function getPrivateKey() {
  if (privateKey) return privateKey
  
  try {
    // 🔴 方式1：直接读取私钥文件（更可靠）
    const cfg = getWxPayConfig()
    if (fs.existsSync(cfg.keyPath)) {
      privateKey = fs.readFileSync(cfg.keyPath, 'utf8')
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
        p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, getWxPayConfig().mchId)
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

// 🔴 解密回调数据（API v3 使用 AES-256-GCM 加密）
function decryptCallbackData(encryptedData, nonce, associatedData) {
  try {
    console.log('[payCallback] 开始解密，加密数据长度:', encryptedData ? encryptedData.length : 0)
    console.log('[payCallback] nonce:', nonce)
    console.log('[payCallback] associatedData:', associatedData)
    
    const key = Buffer.from(getWxPayConfig().apiV3Key, 'utf8')
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

function normalizeToFen(amount) {
  if (amount === null || amount === undefined || amount === '') return NaN
  const num = Number(amount)
  if (!Number.isFinite(num)) return NaN
  if (Number.isInteger(num) && num >= 100) return num
  return Math.round(num * 100)
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
    let rawBody = null
    
    // 🔴 检查是否是 HTTP 触发格式
    if (event.httpMethod || event.path || event.headers || event.body !== undefined) {
      console.log('[payCallback] 检测到 HTTP 触发格式')
      headers = event.headers || {}
      
      // body 可能是 base64 字符串 / 普通 JSON 字符串 / 对象
      rawBody = event.body
      if (event.isBase64Encoded && typeof rawBody === 'string') {
        try {
          rawBody = Buffer.from(rawBody, 'base64').toString('utf8')
          console.log('[payCallback] body 已从 base64 解码')
        } catch (decodeErr) {
          console.error('[payCallback] body base64 解码失败:', decodeErr.message || decodeErr)
        }
      }
      if (rawBody !== undefined && rawBody !== null) {
        try {
          if (typeof rawBody === 'string') {
            console.log('[payCallback] body 是字符串，开始解析 JSON...')
            body = JSON.parse(rawBody)
            console.log('[payCallback] body JSON 解析成功')
          } else {
            body = rawBody
            console.log('[payCallback] body 不是字符串，直接使用')
          }
        } catch (e) {
          console.error('[payCallback] 解析 body 失败:', e)
          console.error('[payCallback] 原始 body 类型:', typeof rawBody)
          console.error('[payCallback] 原始 body 内容（前500字符）:', typeof rawBody === 'string' ? rawBody.substring(0, 500) : rawBody)
          // 如果解析失败，可能是其他格式，保留原始值
          body = rawBody
        }
      }
    } else {
      // 兼容旧格式（直接传递的对象）
      console.log('[payCallback] 使用兼容格式处理')
      headers = event.headers || {}
      body = event.body || event
    }
    
    console.log('[payCallback] body 类型:', typeof body)
    console.log('[payCallback] headers 键名:', Object.keys(headers || {}))
    console.log('[payCallback] event.httpMethod:', event.httpMethod)
    console.log('[payCallback] event.path:', event.path)
    
    // 获取签名信息（微信支付 API v3 回调的请求头）
    const signature = headers['Wechatpay-Signature'] || headers['wechatpay-signature'] || headers['wechatpay-signature'.toLowerCase()]
    const timestamp = headers['Wechatpay-Timestamp'] || headers['wechatpay-timestamp'] || headers['wechatpay-timestamp'.toLowerCase()]
    const nonce = headers['Wechatpay-Nonce'] || headers['wechatpay-nonce'] || headers['wechatpay-nonce'.toLowerCase()]
    const serial = headers['Wechatpay-Serial'] || headers['wechatpay-serial'] || headers['wechatpay-serial'.toLowerCase()]
    
    console.log('[payCallback] 签名信息:', { signature, timestamp, nonce, serial })
    console.log('[payCallback] 所有请求头键名:', Object.keys(headers))

    // 🔴 基础安全校验：回调头必须存在，且时间窗不能过旧
    if (!signature || !timestamp || !nonce || !serial) {
      console.error('[payCallback] 缺少必要回调签名头，拒绝处理')
      return { code: 'FAIL', message: 'missing headers' }
    }
    const callbackTs = Number(timestamp)
    if (!Number.isFinite(callbackTs) || Math.abs(Math.floor(Date.now() / 1000) - callbackTs) > 300) {
      console.error('[payCallback] 回调时间戳异常，拒绝处理')
      return { code: 'FAIL', message: 'invalid timestamp' }
    }

    const bodyStrForVerify = typeof rawBody === 'string'
      ? rawBody
      : (rawBody != null ? JSON.stringify(rawBody) : '')
    if (!verifyWechatPayNotify({ timestamp, nonce, signature, bodyStr: bodyStrForVerify })) {
      console.error('[payCallback] 微信支付回调签名校验失败')
      return { code: 'FAIL', message: 'invalid signature' }
    }
    
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

    // 某些网关会把真正 payload 包一层 body 字段，这里做兼容剥离
    if (body && !body.resource && body.body) {
      const nested = body.body
      if (typeof nested === 'string') {
        try {
          body = JSON.parse(nested)
          console.log('[payCallback] 已解析 nested body 字符串')
        } catch (e) {
          // 保持原样，后续继续走兼容逻辑
        }
      } else if (typeof nested === 'object') {
        body = nested
        console.log('[payCallback] 已使用 nested body 对象')
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

            // 幂等：已处理成功直接返回
            if (order.status === 'PAID' && order.transactionId === transactionId) {
              console.log('[payCallback] 命中幂等，订单已是 PAID，直接返回 SUCCESS')
              return { code: 'SUCCESS', message: '成功' }
            }

            // 🔴 核验 appid/mchid/金额，避免串单和伪造回调
            const wxCfg = getWxPayConfig()
            if (decryptedData.appid !== wxCfg.appId || decryptedData.mchid !== wxCfg.mchId) {
              console.error('[payCallback] appid/mchid 不匹配，拒绝更新订单', {
                gotAppId: decryptedData.appid,
                gotMchId: decryptedData.mchid
              })
              return { code: 'FAIL', message: 'appid or mchid mismatch' }
            }
            const paidFen = decryptedData.amount && Number(decryptedData.amount.total)
            const orderFen = normalizeToFen(order.totalFee)
            if (!Number.isFinite(paidFen) || !Number.isFinite(orderFen) || paidFen !== orderFen) {
              console.error('[payCallback] 支付金额与订单金额不一致，拒绝更新订单', { paidFen, orderFen })
              return { code: 'FAIL', message: 'amount mismatch' }
            }
            
            // 2. 更新订单状态（不做 repairId 推断，避免把普通订单误判为引导购配件）
            const updateData = {
              status: 'PAID',
              payTime: db.serverDate(),
              transactionId: transactionId // 微信支付订单号
            }

            const updateRes = await db.collection('shop_orders').where({
              orderId: outTradeNo
            }).update({
              data: updateData
            })
            
            console.log('[payCallback] 订单状态更新结果:', updateRes)
            
            // 3. 调用新的主动查单云函数，复用统一逻辑同步订单中心
            try {
              await cloud.callFunction({
                name: 'checkPayResult',
                data: { orderId: outTradeNo }
              })
            } catch (orderInfoErr) {
              console.error('[payCallback] 调用 checkPayResult 失败:', orderInfoErr)
            }
            
            console.log('[payCallback] 订单', outTradeNo, '状态已更新为 PAID')

            try {
              await cloud.callFunction({
                name: 'referral',
                data: internalCallData({ action: 'grantOnOrderPaid', orderId: outTradeNo })
              })
            } catch (referralErr) {
              console.error('[payCallback] 推荐奖励发放失败:', referralErr)
            }
            try {
              await cloud.callFunction({
                name: 'referral',
                data: internalCallData({ action: 'markCouponsUsed', orderId: outTradeNo })
              })
            } catch (couponErr) {
              console.error('[payCallback] 优惠券核销失败:', couponErr)
            }
          } else {
            console.warn('[payCallback] 未找到订单:', outTradeNo)
            return { code: 'FAIL', message: 'order not found' }
          }
          
          return { code: 'SUCCESS', message: '成功' }
        } else {
          console.log('[payCallback] 支付状态非成功:', decryptedData.trade_state)
        }
      } catch (decryptErr) {
        console.error('[payCallback] 解密失败:', decryptErr)
        throw decryptErr
      }
    }

    console.error('[payCallback] 缺少 resource 加密体，拒绝处理')
    return { code: 'FAIL', message: 'invalid notify body' }
    
  } catch (err) {
    console.error('支付回调处理失败:', err)
    // 返回 FAIL 让微信重试，避免静默丢单
    return { code: 'FAIL', message: 'internal error' }
  }
}
