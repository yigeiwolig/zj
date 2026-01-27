const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')

// 使用当前环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 🔴 微信支付配置
const WX_PAY_CONFIG = {
  mchId: '1103782674',
  appId: 'wxf1a81dd77d810edf',
  apiV3Key: 'MTMoGaiSheWeChatPay2025Key888888',
  serialNo: '73F820E3A9CBFF6FF509EAB7B2449CEBAB33E479', // 🔴 从证书中提取的实际序列号
  certPath: path.join(__dirname, 'apiclient_cert.p12'),
  keyPath: path.join(__dirname, 'apiclient_key.pem'), // 私钥文件路径
  certPassword: '1103782674' // p12证书密码通常是商户号
}

// 🔴 加载私钥（优先使用单独的私钥文件）
let privateKey = null
function getPrivateKey() {
  if (privateKey) return privateKey
  
  try {
    // 🔴 方式1：直接读取私钥文件（更可靠）
    if (fs.existsSync(WX_PAY_CONFIG.keyPath)) {
      privateKey = fs.readFileSync(WX_PAY_CONFIG.keyPath, 'utf8')
      console.log('[createOrder] 从私钥文件加载成功')
      return privateKey
    }
    
    // 🔴 方式2：从p12证书中提取（备用方案）
    const forge = require('node-forge')
    const p12Buffer = fs.readFileSync(WX_PAY_CONFIG.certPath)
    
    let p12
    try {
      const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, WX_PAY_CONFIG.certPassword)
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
    
    console.log('[createOrder] 从p12证书提取私钥成功')
    return privateKey
  } catch (err) {
    console.error('加载私钥失败:', err)
    throw err
  }
}

// 🔴 生成微信支付 API v3 签名
function generateWxPaySignature(method, url, timestamp, nonce, body) {
  const privateKeyPem = getPrivateKey()
  
  // 🔴 微信支付 API v3 签名字符串格式（注意：最后有一个换行符）
  // 格式：请求方法\nURL\n时间戳\n随机字符串\n请求体\n
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`
  
  console.log('[createOrder] 签名字符串（前100字符）:', signStr.substring(0, 100))
  console.log('[createOrder] 签名字符串长度:', signStr.length)
  
  try {
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(signStr, 'utf8')
    const signature = sign.sign({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, 'base64')
    
    console.log('[createOrder] 生成的签名（前50字符）:', signature.substring(0, 50) + '...')
    console.log('[createOrder] 签名长度:', signature.length)
    
    return signature
  } catch (err) {
    console.error('[createOrder] 签名生成失败:', err)
    throw err
  }
}

// 🔴 调用微信支付统一下单接口
function createWxPayOrder(orderData) {
  return new Promise((resolve, reject) => {
    const { mchId, appId, serialNo } = WX_PAY_CONFIG
    const url = '/v3/pay/transactions/jsapi'
    const method = 'POST'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // 构建请求体
    const requestBody = {
      appid: appId,
      mchid: mchId,
      description: orderData.body || 'MT摩改社-车辆定制改装与维修服务费',
      out_trade_no: orderData.outTradeNo,
      // 🔴 回调地址：云开发控制台配置的 payCallback 云函数 HTTP 触发地址
      // 已在云开发控制台配置：域名关联资源 -> /payCallback -> payCallback 云函数
      notify_url: `https://cloudbase-4gn1heip7c38ec6c-1392958388.ap-shanghai.app.tcloudbase.com/payCallback`,
      amount: {
        total: orderData.totalFee,
        currency: 'CNY'
      },
      payer: {
        openid: orderData.openid
      }
    }
    
    const bodyStr = JSON.stringify(requestBody)
    
    // 生成签名
    const signature = generateWxPaySignature(method, url, timestamp, nonce, bodyStr)
    
    // 🔴 构建 Authorization 头（微信支付 API v3 标准格式）
    // 格式：WECHATPAY2-SHA256-RSA2048 mchid="xxx",nonce_str="xxx",signature="xxx",timestamp="xxx",serial_no="xxx"
    const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`
    
    console.log('[createOrder] 请求URL:', url)
    console.log('[createOrder] 请求方法:', method)
    console.log('[createOrder] 时间戳:', timestamp)
    console.log('[createOrder] 随机字符串:', nonce)
    console.log('[createOrder] 商户号:', mchId)
    console.log('[createOrder] 证书序列号:', serialNo)
    console.log('[createOrder] Authorization 头（前150字符）:', authHeader.substring(0, 150) + '...')
    
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

// 🔴 生成前端支付参数（小程序支付）
function generatePaymentParams(prepayId) {
  const { appId, mchId, apiV3Key } = WX_PAY_CONFIG
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const packageStr = `prepay_id=${prepayId}`
  
  // 🔴 注意：小程序支付签名需要使用私钥，不是 HMAC
  const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`
  const privateKeyPem = getPrivateKey()
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signStr, 'utf8')
  const paySign = sign.sign(privateKeyPem, 'base64')
  
  return {
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { totalPrice, goods, addressData, shippingFee, shippingMethod, action, userNickname } = event
  
  const outTradeNo = `MT${Date.now()}${Math.floor(Math.random() * 1000)}`
  const db = cloud.database()

  try {
    // === 情况1: 定制/存单 ===
    if (action === 'save_only') {
      await db.collection('shop_orders').add({
        data: {
          _openid: wxContext.OPENID,
          orderId: outTradeNo,
          goodsList: goods,
          totalFee: totalPrice,
          address: addressData,
          shipping: { fee: shippingFee || 0, method: shippingMethod || 'zto' },
          status: 'UNPAID',
          isCustom: true,
          userNickname: userNickname || '', // 🔴 保存用户昵称
          createTime: db.serverDate()
        }
      })
      return { success: true, msg: '订单已提交，等待改价' }
    }

    // === 情况2: 正常立即支付（使用微信支付原生API v3）===
    
    // 先写入数据库
    await db.collection('shop_orders').add({
      data: {
        _openid: wxContext.OPENID,
        orderId: outTradeNo,
        goodsList: goods,
        totalFee: totalPrice,
        address: addressData,
        shipping: { fee: shippingFee || 0, method: shippingMethod || 'zto' },
        status: 'UNPAID',
        userNickname: userNickname || '', // 🔴 保存用户昵称
        createTime: db.serverDate()
      }
    })
    
    // 调用微信支付统一下单
    const orderData = {
      body: 'MT摩改社-车辆定制改装与维修服务费',
      outTradeNo: outTradeNo,
      totalFee: Math.round(totalPrice * 100), // 转为分
      openid: wxContext.OPENID
    }
    
    console.log('[createOrder] 调用微信支付统一下单:', orderData)
    const wxPayRes = await createWxPayOrder(orderData)
    console.log('[createOrder] 微信支付响应:', wxPayRes)
    
    if (!wxPayRes.prepay_id) {
      console.error('微信支付下单失败:', wxPayRes)
      return { error: true, msg: wxPayRes.message || JSON.stringify(wxPayRes) }
    }
    
    // 生成前端支付参数
    const paymentParams = generatePaymentParams(wxPayRes.prepay_id)
    
    // 🔴 返回订单号，用于支付成功后主动更新订单状态
    paymentParams.outTradeNo = outTradeNo
    
    return paymentParams
    
  } catch (err) {
    console.error('云函数运行崩溃:', err)
    return { error: true, msg: err.message || '系统繁忙' }
  }
}
