const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')

// 使用当前环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 🔴 微信支付配置
const WX_PAY_CONFIG = {
  // 优先读取环境变量，未配置时回退到当前值（兼容旧部署）
  mchId: process.env.WX_PAY_MCH_ID || '1103782674',
  appId: process.env.WX_PAY_APP_ID || 'wxf1a81dd77d810edf',
  apiV3Key: process.env.WX_PAY_API_V3_KEY || 'MTMoGaiSheWeChatPay2025Key888888',
  serialNo: process.env.WX_PAY_SERIAL_NO || '73F820E3A9CBFF6FF509EAB7B2449CEBAB33E479', // 🔴 从证书中提取的实际序列号
  certPath: path.join(__dirname, 'apiclient_cert.p12'),
  keyPath: path.join(__dirname, 'apiclient_key.pem'), // 私钥文件路径
  certPassword: process.env.WX_PAY_CERT_PASSWORD || '1103782674' // p12证书密码通常是商户号
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

async function isAdminOpenid(openid, db) {
  if (!openid) return false
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data && byOpenid.data.length > 0) return true
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  return !!(bySystemOpenid.data && bySystemOpenid.data.length > 0)
}

/** 从地址对象或拼接字符串猜测省份（与小程序顺丰运费规则配套） */
function guessProvince(addressData) {
  if (!addressData || typeof addressData !== 'object') return ''
  const direct = addressData.province || addressData.selectedProvince
  if (direct && String(direct).trim()) return String(direct).trim()
  const addr = addressData.address ? String(addressData.address) : ''
  if (!addr) return ''
  const seg = addr.split(/[\s\n]+/).filter(Boolean)
  const first = seg[0] || ''
  if (/省|自治区|北京市|天津市|上海市|重庆市/.test(first)) return first
  if (first.indexOf('广东') !== -1) return first
  return first
}

/** 购物车是否仅含配件（单独购买配件，无主机） */
function cartIsAccessoryOnly(goods) {
  const typed = (goods || []).filter(it => it && (it.type === 'main' || it.type === 'accessory'))
  if (typed.length === 0) return false
  return typed.every(it => it.type === 'accessory')
}

/** 省内 13 / 省外 22（单位：元） */
function provinceShippingFee(province) {
  const p = province ? String(province).trim() : ''
  if (!p) return 0
  if (p.indexOf('广东') !== -1) return 13
  return 22
}

/** 与小页面 shop.reCalcFinalPrice 一致：主机订单中通包邮；仅配件订单中通/顺丰均按省计费 */
function computeShippingFeeServer(shippingMethod, addressData, goods) {
  const m = String(shippingMethod || 'zto').toLowerCase()
  if (m === 'none' || m === '') return 0
  const province = guessProvince(addressData || {})
  if (m === 'zto') {
    if (cartIsAccessoryOnly(goods)) return provinceShippingFee(province)
    return 0
  }
  if (m === 'sf') return provinceShippingFee(province)
  return 0
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

/** 商城购物车：仅含 main / accessory */
async function computeShopCartSubtotal(db, goods) {
  if (!Array.isArray(goods) || goods.length === 0) throw new Error('购物车为空')
  const [seriesRes, accRes] = await Promise.all([
    db.collection('shop_series').get(),
    db.collection('shop_accessories').get()
  ])
  const seriesList = seriesRes.data || []
  const accList = accRes.data || []

  function findSeries(seriesId) {
    return seriesList.find(s => s.id === seriesId || s._id === seriesId)
  }
  function findAcc(name) {
    return accList.find(a => a.name === name)
  }

  let subtotal = 0
  for (const item of goods) {
    if (item.type === 'main') {
      const s = findSeries(item.seriesId)
      if (!s) throw new Error('商品系列不存在或已下架')
      const models = s.models || []
      const model = models.find(m => m.name === item.modelName)
      if (!model) throw new Error('型号不存在：' + item.modelName)
      const opts = s.options || []
      let optionPrice = 0
      if (item.optionName && opts.length > 0) {
        const opt = opts.find(o => o.name === item.optionName)
        if (opt) optionPrice = Number(opt.price) || 0
        else if (item.optionName !== '默认配置') throw new Error('配置不存在：' + item.optionName)
      }
      const unit = (Number(model.price) || 0) + optionPrice
      const qty = Math.max(1, Number(item.quantity) || 1)
      subtotal += unit * qty
    } else if (item.type === 'accessory') {
      const a = findAcc(item.name)
      if (!a) throw new Error('配件不存在：' + item.name)
      const unit = Number(a.price) || 0
      const qty = Math.max(1, Number(item.quantity) || 1)
      subtotal += unit * qty
    } else {
      throw new Error('购物车包含未知条目类型')
    }
  }
  return roundMoney(subtotal)
}

/** 售后配件页：按型号读 shouhou 集合价格 */
async function computeShouhouPartsSubtotal(db, goods) {
  if (!Array.isArray(goods) || goods.length === 0) throw new Error('订单商品为空')
  const modelName = goods[0].spec || goods[0].modelName
  if (!modelName) throw new Error('无法确定配件型号')

  const res = await db.collection('shouhou').where({ modelName }).get()
  const rows = res.data || []
  const byName = {}
  rows.forEach(r => {
    if (r && r.name) byName[r.name] = Number(r.price) || 0
  })

  let subtotal = 0
  for (const g of goods) {
    const name = g.name
    const qty = Math.max(1, Number(g.quantity) || 1)
    if (byName[name] === undefined) {
      throw new Error('配件「' + name + '」价格未配置')
    }
    subtotal += byName[name] * qty
  }
  return roundMoney(subtotal)
}

async function computeRepairSubtotal(db, repairId) {
  if (!repairId) throw new Error('缺少维修单 ID')
  const res = await db.collection('shouhou_repair').doc(repairId).get()
  if (!res.data) throw new Error('维修单不存在')
  const items = res.data.repairItems || []
  const sum = items.reduce((s, it) => s + (Number(it.price) || 0), 0)
  return roundMoney(sum)
}

/** 从补款商品 id 解析 repairId：repair_<id>_<index> */
function extractRepairIdFromGoods(goods) {
  if (!goods || !goods[0]) return ''
  const id = goods[0].id
  if (!id) return ''
  const m = String(id).match(/^repair_(.+)_(\d+)$/)
  return m ? m[1] : ''
}

function classifyGoods(goods) {
  if (!Array.isArray(goods) || goods.length === 0) return 'empty'
  const typed = goods.filter(it => it && (it.type === 'main' || it.type === 'accessory'))
  if (typed.length === goods.length) return 'shop'
  if (typed.length > 0) throw new Error('购物车数据异常，请清空购物车后重试')
  return 'shouhou_parts'
}

/**
 * 服务端权威金额（普通用户以此为准；管理员测付仍为 0.01，但会写入定价快照）
 */
async function resolveServerPricing(db, event, wxOpenId) {
  const {
    goods,
    shippingMethod,
    addressData,
    isRepairPayment,
    repairId
  } = event

  const adminUser = await isAdminOpenid(wxOpenId, db)

  let goodsSubtotal = 0
  let shippingFee = 0
  let mode = 'unknown'

  // --- 维修费用支付（个人中心发起）---
  if (isRepairPayment && repairId) {
    goodsSubtotal = await computeRepairSubtotal(db, repairId)
    shippingFee = 0
    mode = 'repair'
  } else {
    const first = (goods && goods[0]) || {}
    const ridGuess = extractRepairIdFromGoods(goods)
    if (first.spec === '维修项目' && ridGuess) {
      goodsSubtotal = await computeRepairSubtotal(db, ridGuess)
      shippingFee = 0
      mode = 'repair_repay'
    } else {
      const cat = classifyGoods(goods || [])
      if (cat === 'empty') throw new Error('订单商品为空')
      shippingFee = computeShippingFeeServer(shippingMethod, addressData, goods)
      if (cat === 'shop') {
        goodsSubtotal = await computeShopCartSubtotal(db, goods)
        mode = 'shop'
      } else {
        goodsSubtotal = await computeShouhouPartsSubtotal(db, goods)
        mode = 'shouhou_parts'
      }
    }
  }

  const fullTotal = roundMoney(goodsSubtotal + shippingFee)

  if (adminUser) {
    return {
      adminUser: true,
      payAmountYuan: 0.01,
      goodsSubtotal,
      shippingFee: mode === 'repair' || mode === 'repair_repay' ? 0 : shippingFee,
      serverFullTotal: fullTotal,
      pricingMode: mode
    }
  }

  return {
    adminUser: false,
    payAmountYuan: fullTotal,
    goodsSubtotal,
    shippingFee: mode === 'repair' || mode === 'repair_repay' ? 0 : shippingFee,
    serverFullTotal: fullTotal,
    pricingMode: mode
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const {
    goods,
    addressData,
    shippingMethod,
    action,
    userNickname,
    repairId,
    isRepairPayment,
    orderSource,
    existingOrderId
  } = event

  let outTradeNo = `MT${Date.now()}${Math.floor(Math.random() * 1000)}`
  const db = cloud.database()
  let repayExistingDoc = null

  try {
    let pricingInput = { ...event }

    if (action === 'repay' && existingOrderId) {
      const existRes = await db.collection('shop_orders').where({
        orderId: String(existingOrderId).trim(),
        _openid: wxContext.OPENID
      }).limit(1).get()

      if (!existRes.data || !existRes.data.length) {
        return { error: true, msg: '订单不存在或无权操作' }
      }

      const existing = existRes.data[0]
      if (existing.status !== 'UNPAID') {
        return { error: true, msg: '该订单当前不可重新支付' }
      }

      repayExistingDoc = existing
      outTradeNo = existing.orderId
      pricingInput = {
        goods: existing.goodsList || goods,
        addressData: existing.address || addressData,
        shippingMethod: (existing.shipping && existing.shipping.method) || shippingMethod || 'zto',
        isRepairPayment: !!existing.isRepairPayment,
        repairId: existing.repairId || repairId || ''
      }
    }

    const pricing = await resolveServerPricing(db, pricingInput, wxContext.OPENID)
    console.log('[createOrder] server pricing:', pricing)

    const auditBase = {
      goodsSubtotal: pricing.goodsSubtotal,
      shippingFee: pricing.shippingFee,
      serverFullTotal: pricing.serverFullTotal,
      pricingMode: pricing.pricingMode,
      adminTestPay: !!pricing.adminUser,
      serverPricedAt: new Date()
    }

    // === 情况1: 定制/存单（金额以服务端为准，便于后台核价）===
    if (action === 'save_only') {
      await db.collection('shop_orders').add({
        data: {
          _openid: wxContext.OPENID,
          orderId: outTradeNo,
          goodsList: goods,
          totalFee: pricing.serverFullTotal,
          address: addressData,
          shipping: { fee: pricing.shippingFee, method: shippingMethod || 'zto' },
          status: 'UNPAID',
          isCustom: true,
          userNickname: userNickname || '',
          isRepairPayment: isRepairPayment || false,
          repairId: repairId || '',
          orderSource: orderSource || '',
          pricingAudit: auditBase,
          createTime: db.serverDate()
        }
      })
      return { success: true, msg: '订单已提交，等待改价' }
    }

    // === 情况2: 立即支付（应付金额完全由服务端计算；管理员仍为 0.01 测付）===
    const payYuan = pricing.payAmountYuan
    if (!Number.isFinite(payYuan) || payYuan <= 0) {
      return { error: true, msg: '订单金额异常，请返回购物车刷新后重试' }
    }
    // 非管理员且非维修类：应付通常应大于 0.01（防止未配置价格却被下单）
    const repairLike = pricing.pricingMode === 'repair' || pricing.pricingMode === 'repair_repay'
    if (!pricing.adminUser && payYuan <= 0.01 && !repairLike) {
      return { error: true, msg: '订单金额过低，请确认商品价格已配置' }
    }

    const shipMethod = (repayExistingDoc && repayExistingDoc.shipping && repayExistingDoc.shipping.method)
      || shippingMethod
      || 'zto'
    const orderPayload = {
      goodsList: (repayExistingDoc && repayExistingDoc.goodsList) || goods,
      totalFee: payYuan,
      address: (repayExistingDoc && repayExistingDoc.address) || addressData,
      shipping: { fee: pricing.shippingFee, method: shipMethod },
      userNickname: userNickname || (repayExistingDoc && repayExistingDoc.userNickname) || '',
      isRepairPayment: repayExistingDoc ? !!repayExistingDoc.isRepairPayment : !!isRepairPayment,
      repairId: (repayExistingDoc && repayExistingDoc.repairId) || repairId || '',
      orderSource: (repayExistingDoc && repayExistingDoc.orderSource) || orderSource || '',
      pricingAudit: auditBase
    }

    if (repayExistingDoc) {
      await db.collection('shop_orders').doc(repayExistingDoc._id).update({
        data: orderPayload
      })
    } else {
      await db.collection('shop_orders').add({
        data: {
          _openid: wxContext.OPENID,
          orderId: outTradeNo,
          ...orderPayload,
          status: 'UNPAID',
          createTime: db.serverDate()
        }
      })
    }

    const orderData = {
      body: 'MT摩改社-车辆定制改装与维修服务费',
      outTradeNo: outTradeNo,
      totalFee: Math.round(payYuan * 100), // 转为分
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
