// cloudfunctions/syncOrderInfo/index.js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 🔹 配置信息
const WX_PAY_CONFIG = {
  mchId: '1103782674',
  appId: 'wxf1a81dd77d810edf',
  apiV3Key: 'MTMoGaiSheWeChatPay2025Key888888',
  serialNo: '73F820E3A9CBFF6FF509EAB7B2449CEBAB33E479',
  keyPath: path.join(__dirname, 'apiclient_key.pem'),
  certPath: path.join(__dirname, 'apiclient_cert.p12')
}

// 🔹 加载私钥
let privateKey = null
function getPrivateKey() {
  if (privateKey) return privateKey
  try {
    if (fs.existsSync(WX_PAY_CONFIG.keyPath)) {
      privateKey = fs.readFileSync(WX_PAY_CONFIG.keyPath, 'utf8')
      return privateKey
    }
    // 只有在没pem文件时尝试从p12提取，代码略（为你原来的逻辑保留即可）
    if (fs.existsSync(WX_PAY_CONFIG.certPath)) {
        const forge = require('node-forge')
        const p12Buffer = fs.readFileSync(WX_PAY_CONFIG.certPath)
        const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, WX_PAY_CONFIG.mchId)
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
        const privateKeyObj = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0]
        privateKey = forge.pki.privateKeyToPem(privateKeyObj.key)
        return privateKey
    }
    throw new Error('找不到私钥文件')
  } catch (err) {
    console.error('加载私钥失败:', err)
    throw err
  }
}

// 🔹 生成签名
function generateWxPaySignature(method, url, timestamp, nonce, body) {
  const privateKeyPem = getPrivateKey()
  const bodyStr = body || ''
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${bodyStr}\n`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signStr, 'utf8')
  return sign.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, 'base64')
}

// 🔹 查询订单 (已修复签名问题)
function queryOrderByOutTradeNo(outTradeNo) {
  return new Promise((resolve, reject) => {
    const { mchId, serialNo } = WX_PAY_CONFIG
    // ✅ 修复：URL Path 和 Query 必须合并
    const urlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchId}`
    const method = 'GET'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // ✅ 修复：签名使用带参数的完整 URL Path
    const signature = generateWxPaySignature(method, urlPath, timestamp, nonce, '')
    const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`
    
    const req = https.request({
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: urlPath,
      method: method,
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'WeChatPay-APIv3-NodeJS'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data))
        } else {
          console.error('查询订单失败:', data)
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// 🔹 获取 AccessToken
async function getAccessToken() {
  // 注意：如果是云开发环境，建议直接使用 cloud.openapi.request 不需要自己换取token
  // 但为了兼容你的逻辑，保留 HTTP 请求方式
  const { appId } = WX_PAY_CONFIG
  // ⚠️ 警告：请确保这里填入了正确的小程序 AppSecret
  const appSecret = 'bc6cf6a358e84c3f88c105cf19b70fbd' 
  
  // 优先尝试使用云调用（更稳定，不需要 appSecret）
  try {
      // 这里的 cloud.getWXContext() 只能在客户端调用或特定触发器下获取，
      // 云函数间调用推荐用 requestContext 或直接 http
  } catch(e){}

  return new Promise((resolve, reject) => {
    https.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const result = JSON.parse(data)
        result.access_token ? resolve(result.access_token) : reject(new Error(result.errmsg))
      })
    }).on('error', reject)
  })
}

// 🔹 上传订单到微信 (已修复缺少 payer 问题)
async function syncOrderInfoToMiniProgram(outTradeNo, transactionId, orderData, openId) {
  console.log('[sync] 开始构建上传数据，用户OpenID:', openId)
  
  if (!openId) {
    throw new Error('上传订单失败：缺失用户 openId')
  }

  const accessToken = await getAccessToken()
  
  const orderInfo = {
    order_key: {
      order_number_type: 1, // 1:商户订单号
      order_number: outTradeNo,
      mchid: WX_PAY_CONFIG.mchId
    },
    // ✅ 必须包含 payer
     payer: {
       openid: openId
     },
     logistics_type: 1, // ✅ 修正：1-实体物流配送（需要填写运单号）
                        // 🔴 重要：如果设为 4(自提)，后续将无法添加物流信息！
    create_time: orderData.createTime ? Math.floor(new Date(orderData.createTime).getTime() / 1000).toString() : Math.floor(Date.now() / 1000).toString(),
    // pay_finish_time 等字段有些接口是选填，但在 upload_order 中主要看 order_detail
     order_detail: {
       product_infos: orderData.goodsList ? orderData.goodsList.map(goods => {
         const productId = goods.modelName || goods._id || 'default'
         return {
           out_product_id: productId,
           product_cnt: Number(goods.quantity) || 1,
           sale_price: Math.round((goods.total || 0) * 100),
           title: goods.name || '商品',
           path: 'pages/index/index', // 🔴 强制使用首页路径，先保证能上传成功
           head_img: (goods.img && goods.img.startsWith('http')) ? goods.img : undefined
         }
       }) : []
     },
    // 总金额等其他字段视 API 版本而定，当前版本主要依赖 product_infos 计算
  }

   // 如果没有商品，塞一个默认的
   if (orderInfo.order_detail.product_infos.length === 0) {
       orderInfo.order_detail.product_infos.push({
           out_product_id: 'service_default',
           product_cnt: 1,
           sale_price: Math.round((orderData.totalFee || 0) * 100),
           title: '改装维修服务',
           path: 'pages/index/index' // 🔴 强制使用首页路径
       })
   }

  const bodyStr = JSON.stringify(orderInfo)
  console.log('[sync] 上传Payload:', bodyStr)

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
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const result = JSON.parse(data)
        console.log('[sync] 微信响应:', result)
        if (result.errcode === 0) {
          resolve(result)
        } else {
          // 常见错误：48001(未授权), 100800(缺参数)
          reject(new Error(`API Error ${result.errcode}: ${result.errmsg}`))
        }
      })
    })
    req.write(bodyStr)
    req.end()
  })
}

// 🔹 主函数
exports.main = async (event, context) => {
  const db = cloud.database()
  // 从参数获取 orderId
  const { orderId } = event 
  
  console.log('[main] 处理订单:', orderId)

  try {
    // 1. 查库获取订单详情 (必须拿到 openid)
    const orderRes = await db.collection('shop_orders').where({ orderId }).get()
    
    if (!orderRes.data.length) return { success: false, msg: '订单不存在' }
    
    const order = orderRes.data[0]
    // 关键点：获取用户的 openid，通常存放在 _openid 字段
    const userOpenId = order._openid 

    if (!userOpenId) {
        return { success: false, msg: '订单数据缺失 openid，无法同步' }
    }

    // 2. 状态修正与查询交易号
    let transactionId = order.transactionId
    
    // 如果没有交易单号，去微信查
    if (!transactionId) {
       try {
           console.log('[main] 尝试查询微信支付单号...')
           const wxOrder = await queryOrderByOutTradeNo(orderId)
           if (wxOrder.trade_state === 'SUCCESS') {
               transactionId = wxOrder.transaction_id
               // 回写数据库
               await db.collection('shop_orders').where({ orderId }).update({
                   data: { 
                       transactionId, 
                       status: 'PAID',
                       payTime: db.serverDate()
                   }
               })
           } else {
               return { success: false, msg: '订单未支付' }
           }
       } catch (e) {
           console.error('[main] 查询订单失败:', e.message)
           return { success: false, msg: '查询支付状态失败: ' + e.message }
       }
    }

    // 3. 上传到小程序订单中心
    await syncOrderInfoToMiniProgram(orderId, transactionId, {
        goodsList: order.goodsList,
        totalFee: order.totalFee,
        createTime: order.createTime || order._createTime,
        payTime: order.payTime
    }, userOpenId) // ✅ 传入 openid

    return { success: true, msg: '同步成功' }

  } catch (err) {
    console.error('[main] 全局异常:', err)
    return { success: false, msg: err.message }
  }
}