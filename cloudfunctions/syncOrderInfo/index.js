// cloudfunctions/syncOrderInfo/index.js
// 🔴 同步订单信息到小程序订单系统
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
  keyPath: path.join(__dirname, 'apiclient_key.pem'), // 🔴 使用当前目录的私钥文件
  certPath: path.join(__dirname, 'apiclient_cert.p12') // 🔴 使用当前目录的证书文件
}

// 🔴 加载私钥（优先使用单独的私钥文件，如果没有则从p12证书提取）
let privateKey = null
function getPrivateKey() {
  if (privateKey) return privateKey
  
  try {
    // 🔴 方式1：直接读取私钥文件（更可靠）
    if (fs.existsSync(WX_PAY_CONFIG.keyPath)) {
      privateKey = fs.readFileSync(WX_PAY_CONFIG.keyPath, 'utf8')
      console.log('[syncOrderInfo] 从私钥文件加载成功')
      return privateKey
    }
    
    // 🔴 方式2：从p12证书中提取（备用方案）
    if (fs.existsSync(WX_PAY_CONFIG.certPath)) {
      const forge = require('node-forge')
      const p12Buffer = fs.readFileSync(WX_PAY_CONFIG.certPath)
      
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
      
      console.log('[syncOrderInfo] 从p12证书提取私钥成功')
      return privateKey
    }
    
    throw new Error('私钥文件不存在，且无法从证书中提取')
  } catch (err) {
    console.error('[syncOrderInfo] 加载私钥失败:', err)
    throw err
  }
}

// 🔴 生成微信支付 API v3 签名
function generateWxPaySignature(method, url, timestamp, nonce, body) {
  const privateKeyPem = getPrivateKey()
  
  // 🔴 微信支付 API v3 签名字符串格式（注意：最后有一个换行符）
  // 格式：请求方法\nURL\n时间戳\n随机字符串\n请求体\n
  // 对于 GET 请求，body 应该为空字符串（不是 null 或 undefined）
  const bodyStr = body || ''
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${bodyStr}\n`
  
  console.log('[syncOrderInfo] 签名字符串长度:', signStr.length)
  console.log('[syncOrderInfo] 签名字符串（前100字符）:', signStr.substring(0, 100))
  console.log('[syncOrderInfo] 签名字符串（最后20字符）:', signStr.substring(Math.max(0, signStr.length - 20)))
  
  try {
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(signStr, 'utf8')
    const signature = sign.sign({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, 'base64')
    
    console.log('[syncOrderInfo] 生成的签名长度:', signature.length)
    console.log('[syncOrderInfo] 生成的签名（前50字符）:', signature.substring(0, 50) + '...')
    
    return signature
  } catch (err) {
    console.error('[syncOrderInfo] 签名生成失败:', err)
    throw err
  }
}

// 🔴 查询订单获取交易单号（JSAPI 支付使用普通商户接口）
function queryOrderByOutTradeNo(outTradeNo) {
  return new Promise((resolve, reject) => {
    const { mchId, serialNo } = WX_PAY_CONFIG
    // 🔴 修复：JSAPI 支付应该使用普通商户接口，URL 中需要包含商户号参数
    const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchId}`
    const method = 'GET'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // 🔴 修复：签名字符串应该不包含查询参数（微信支付 API v3 规则）
    const urlForSign = `/v3/pay/transactions/out-trade-no/${outTradeNo}`
    
    console.log('[syncOrderInfo] 查询订单 - 请求方法:', method)
    console.log('[syncOrderInfo] 查询订单 - 签名用 URL:', urlForSign)
    console.log('[syncOrderInfo] 查询订单 - 实际请求 URL:', url)
    console.log('[syncOrderInfo] 查询订单 - 时间戳:', timestamp)
    console.log('[syncOrderInfo] 查询订单 - 随机字符串:', nonce)
    console.log('[syncOrderInfo] 查询订单 - 商户号:', mchId)
    console.log('[syncOrderInfo] 查询订单 - 证书序列号:', serialNo)
    
    // 生成签名（GET 请求 body 为空字符串）
    const signature = generateWxPaySignature(method, urlForSign, timestamp, nonce, '')
    
    // 构建 Authorization 头
    const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`
    
    // 发送请求
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: url,
      method: method,
      headers: {
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
          console.log('[syncOrderInfo] 查询订单响应状态码:', res.statusCode)
          console.log('[syncOrderInfo] 查询订单响应头:', JSON.stringify(res.headers, null, 2))
          console.log('[syncOrderInfo] 查询订单响应数据:', data)
          
          if (res.statusCode === 200) {
            const result = JSON.parse(data)
            console.log('[syncOrderInfo] 查询订单成功:', JSON.stringify(result, null, 2))
            resolve(result)
          } else {
            console.error('[syncOrderInfo] 查询订单失败，状态码:', res.statusCode, '响应:', data)
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        } catch (e) {
          console.error('[syncOrderInfo] 解析响应失败:', e)
          reject(new Error(`解析响应失败: ${e.message}`))
        }
      })
    })
    
    req.on('error', (err) => {
      console.error('[syncOrderInfo] 请求错误:', err)
      reject(err)
    })
    req.end()
  })
}

// 🔴 同步订单信息到小程序订单中心（目前微信订单中心 API 较复杂，暂时跳过）
// 注意：这个功能不是必需的，订单数据已经在数据库中，用户可以在小程序内查看
async function syncOrderInfoToMiniProgram(outTradeNo, transactionId, orderData) {
  console.log('[syncOrderInfo] ⚠️ 微信小程序订单中心同步功能暂未实现')
  console.log('[syncOrderInfo] 订单数据已在数据库中，用户可在小程序内查看订单')
  console.log('[syncOrderInfo] 如需同步到微信订单管理后台，请参考官方文档配置')
  
  // 🔴 返回成功，不阻塞主流程
  return {
    success: true,
    msg: '订单已保存到数据库，微信订单中心同步功能待配置'
  }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const { orderId, transactionId: manualTransactionId } = event // 商户订单号，可选的交易单号
  
  try {
    console.log('[syncOrderInfo] 开始同步订单信息，订单号:', orderId)
    
    // 1. 获取订单信息
    const orderRes = await db.collection('shop_orders').where({
      orderId: orderId
    }).get()
    
    if (!orderRes.data || orderRes.data.length === 0) {
      return { success: false, msg: '订单不存在' }
    }
    
    const order = orderRes.data[0]
    
    // 🔴 更新订单状态为已支付（如果还不是 PAID 状态）
    if (order.status !== 'PAID') {
      console.log('[syncOrderInfo] 更新订单状态为 PAID')
      await db.collection('shop_orders').where({
        orderId: orderId
      }).update({
        data: {
          status: 'PAID',
          payTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }
    
    // 2. 优先使用手动传入的交易单号，否则从数据库获取，最后尝试查询订单
    let transactionId = manualTransactionId || order.transactionId
    
    if (!transactionId) {
      console.log('[syncOrderInfo] 未找到交易单号，尝试查询订单...')
      try {
        const orderQueryRes = await queryOrderByOutTradeNo(orderId)
        console.log('[syncOrderInfo] 查询订单响应:', JSON.stringify(orderQueryRes, null, 2))
        transactionId = orderQueryRes.transaction_id || orderQueryRes.transactionId
        
        if (transactionId) {
          console.log('[syncOrderInfo] 查询到交易单号:', transactionId)
          // 保存交易单号到数据库
          await db.collection('shop_orders').where({
            orderId: orderId
          }).update({
            data: {
              transactionId: transactionId
            }
          })
        } else {
          console.warn('[syncOrderInfo] 查询订单成功但未找到交易单号')
        }
      } catch (queryErr) {
        console.error('[syncOrderInfo] 查询订单失败:', queryErr)
        console.error('[syncOrderInfo] 错误详情:', queryErr.message)
        // 🔴 查询失败时不立即返回错误，而是继续尝试，因为支付回调可能会稍后更新交易单号
        // 但如果真的没有交易单号，会在后面返回错误
        console.warn('[syncOrderInfo] 查询订单失败，可能订单还在处理中，继续尝试...')
      }
    } else {
      console.log('[syncOrderInfo] 使用交易单号:', transactionId, manualTransactionId ? '(手动传入)' : '(数据库已有)')
    }
    
    // 3. 如果没有交易单号，尝试使用商户订单号作为临时方案
    if (!transactionId) {
      console.warn('[syncOrderInfo] ⚠️ 未找到交易单号，可能订单还未支付成功，或支付回调未触发')
      // 可以从订单详情页面手动获取交易单号后，再次调用此云函数
      return { 
        success: false, 
        msg: '未找到交易单号，请确认订单已支付。如果已支付，请在小程序后台手动录入订单信息，或从订单详情中获取交易单号后重试',
        needManualInput: true
      }
    }
    
    // 4. 调用订单信息录入接口
    try {
      console.log('[syncOrderInfo] 准备录入订单信息')
      console.log('[syncOrderInfo] 订单号:', orderId)
      console.log('[syncOrderInfo] 交易单号:', transactionId)
      console.log('[syncOrderInfo] 订单商品数量:', order.goodsList ? order.goodsList.length : 0)
      console.log('[syncOrderInfo] 订单总金额:', order.totalFee)
      
      const syncRes = await syncOrderInfoToMiniProgram(
        orderId,
        transactionId,
        {
          goodsList: order.goodsList || [],
          totalFee: order.totalFee || 0
        }
      )
      console.log('[syncOrderInfo] ✅ 订单信息录入成功:', JSON.stringify(syncRes, null, 2))
      return { success: true, msg: '订单信息已同步到小程序订单系统', data: syncRes }
    } catch (syncErr) {
      console.error('[syncOrderInfo] ❌ 订单信息录入失败:', syncErr)
      console.error('[syncOrderInfo] 错误详情:', syncErr.message)
      // 输出完整的错误信息以便调试
      if (syncErr.message) {
        console.error('[syncOrderInfo] 错误消息:', syncErr.message)
      }
      return { success: false, msg: '订单信息录入失败: ' + syncErr.message }
    }
    
  } catch (err) {
    console.error('[syncOrderInfo] 处理失败:', err)
    return { success: false, msg: err.message || '处理失败' }
  }
}
