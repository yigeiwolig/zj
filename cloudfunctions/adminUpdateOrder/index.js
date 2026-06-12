// cloudfunctions/adminUpdateOrder/index.js
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function internalCallData(data) {
  const secret = process.env.INTERNAL_CALL_SECRET
  if (!secret) return data
  return { ...data, _internalSecret: secret }
}

async function assertAdmin(db) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

function getAdminPayConfig() {
  const mchId = process.env.WX_PAY_MCH_ID
  const appId = process.env.WX_PAY_APP_ID
  const appSecret = process.env.WX_APP_SECRET || process.env.WX_PAY_APP_SECRET || ''
  if (!mchId || !appId) {
    throw new Error('缺少 WX_PAY_MCH_ID / WX_PAY_APP_ID')
  }
  return { mchId, appId, appSecret }
}

// 📦 微信官方物流编码映射表 (常用快递)
// 微信要求传代码(如 SF)，不能传中文(如 顺丰)
const EXPRESS_MAP = {
  '顺丰': 'SF', '顺丰速运': 'SF', '顺丰快递': 'SF',
  '中通': 'ZTO', '中通快递': 'ZTO',
  '圆通': 'YTO', '圆通速递': 'YTO',
  '申通': 'STO', '申通快递': 'STO',
  '韵达': 'YD', '韵达快递': 'YD',
  '邮政': 'YZPY', '中国邮政': 'YZPY', '邮政平邮': 'YZPY',
  'EMS': 'EMS', '邮政EMS': 'EMS',
  '京东': 'JD', '京东快递': 'JD',
  '极兔': 'JTSD', '极兔速递': 'JTSD',
  '德邦': 'DBL', '德邦快递': 'DBL'
}

// 🔹 获取 AccessToken
async function getAccessToken() {
  const CONFIG = getAdminPayConfig()
  if (!CONFIG.appSecret) {
    throw new Error('未配置 WX_APP_SECRET 环境变量')
  }
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.appId}&secret=${CONFIG.appSecret}`
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.access_token) {
            resolve(result.access_token)
          } else {
            reject(new Error(`获取Token失败: ${result.errmsg}`))
          }
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

function formatUploadTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOffset = Math.abs(offset)
  const hh = pad(Math.floor(absOffset / 60))
  const mm = pad(absOffset % 60)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}${sign}${hh}:${mm}`
}

function buildItemDesc(order) {
  if (!order || !Array.isArray(order.goodsList) || order.goodsList.length === 0) {
    return '商品/服务×1'
  }
  const names = order.goodsList.map((g, idx) => {
    const name = g.name || g.title || g.modelName || `商品${idx + 1}`
    const qty = g.quantity || g.product_cnt || 1
    return `${name}×${qty}`
  })
  return names.join('、').substring(0, 120)
}

// 🔹 同步发货信息到微信订单中心
async function syncShippingToOrderCenter(outTradeNo, trackingId, shippingCompany, userOpenId, orderDetail) {
  const CONFIG = getAdminPayConfig()
  const accessToken = await getAccessToken()
  
  // 1. 自动转换快递公司名称为代码
  let companyCode = 'OTHER' // 默认为其他
  if (shippingCompany) {
    // 如果已经是全大写字母，假设已经是代码
    if (/^[A-Z]+$/.test(shippingCompany)) {
      companyCode = shippingCompany
    } else {
      // 模糊匹配中文名
      const key = Object.keys(EXPRESS_MAP).find(k => shippingCompany.includes(k))
      if (key) companyCode = EXPRESS_MAP[key]
    }
  }

  console.log(`[发货] 原始公司名: ${shippingCompany}, 转换后代码: ${companyCode}`)

  // 2. 构建请求体
  const shippingInfo = {
    order_key: {
      order_number_type: 1, // 1-商户订单号
      out_trade_no: outTradeNo,
      mchid: CONFIG.mchId
    },
    logistics_type: 1, // 1-实体物流
    delivery_mode: 1,  // 1-统一发货
    is_all_delivered: true,
    shipping_list: [{
      tracking_no: trackingId,
      express_company: companyCode,
      item_desc: buildItemDesc(orderDetail)
    }],
    upload_time: formatUploadTime(),
    payer: {
      openid: userOpenId
    }
  }
  
  const bodyStr = JSON.stringify(shippingInfo)
  console.log('[发货] 请求体:', bodyStr)
  
  // 3. 发起请求
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.weixin.qq.com',
      path: `/wxa/sec/order/upload_shipping_info?access_token=${accessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          console.log('[发货] 微信响应:', JSON.stringify(result))
          
          if (result.errcode === 0) {
            resolve(result)
          } else {
            // 抛出带有错误码的异常，方便前端展示
            // 常见错误：100100(订单不存在), 100101(快递编码不对)
            reject(new Error(`微信接口错误(${result.errcode}): ${result.errmsg}`))
          }
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      })
    })
    
    req.on('error', (e) => reject(new Error('请求网络错误: ' + e.message)))
    req.write(bodyStr)
    req.end()
  })
}

// 🔹 主入口函数
exports.main = async (event, context) => {
  const db = cloud.database()
  // 支持传 id (数据库_id) 或 orderId (商户单号)
  const { id, orderId, action, trackingId, expressCompany, newPrice } = event

  console.log('[main] 开始处理:', { action, orderId, id })

  try {
    await assertAdmin(db)

    // ===========================================
    // 场景 1: 确认发货 (核心逻辑)
    // ===========================================
    if (action === 'ship') {
      if (!trackingId) return { success: false, errMsg: '请填写运单号' }

      // 1. 查询订单
      let query = {}
      if (id) query._id = id
      else if (orderId) query.orderId = orderId
      else return { success: false, errMsg: '缺少订单标识' }

      const orderRes = await db.collection('shop_orders').where(query).get()
      if (!orderRes.data || orderRes.data.length === 0) {
        return { success: false, errMsg: '订单不存在' }
      }
      
      const order = orderRes.data[0]
      const outTradeNo = order.orderId
      const userOpenId = order._openid

      // 校验 OpenID
      if (!userOpenId) {
        return { success: false, errMsg: '数据异常：订单缺少用户OpenID，无法同步微信' }
      }

      // 2. 🔴 关键步骤：同步到微信发货 (强制阻塞)
      // 如果这一步报错，直接跳到 catch，不更新数据库
      try {
        await syncShippingToOrderCenter(outTradeNo, trackingId, expressCompany, userOpenId, order)
        console.log('✅ 微信发货同步成功')
      } catch (wxErr) {
        console.error('❌ 微信发货同步失败:', wxErr)
        // 返回失败给前端，让管理员知道出错了
        return { success: false, errMsg: '发货失败: ' + wxErr.message }
      }

      // 3. 微信同步成功后，更新本地数据库状态
      await db.collection('shop_orders').where({
        orderId: outTradeNo
      }).update({
        data: {
          status: 'SHIPPED',
          trackingId: trackingId,
          expressCompany: expressCompany, // 建议存入数据库
          lastLogistics: '卖家已发货',
          updateTime: db.serverDate()
        }
      })

      return { success: true, msg: '发货成功，已同步至微信' }
    }

    // ===========================================
    // 场景 2: 删除订单
    // ===========================================
    if (action === 'delete') {
      let orderBeforeDelete = null
      try {
        const snap = await db.collection('shop_orders').doc(id).get()
        orderBeforeDelete = snap.data
      } catch (e) {}

      const removeRes = await db.collection('shop_orders').doc(id).remove()

      if (orderBeforeDelete && orderBeforeDelete.status === 'PAID') {
        try {
          await cloud.callFunction({
            name: 'referral',
            data: internalCallData({
              action: 'revokeOnOrderInvalid',
              orderId: orderBeforeDelete.orderId,
              orderDocId: id
            })
          })
        } catch (referralErr) {
          console.error('[adminUpdateOrder] 推荐券追回失败:', referralErr)
        }
      }

      return removeRes
    }

    // ===========================================
    // 场景 3: 修改价格
    // ===========================================
    if (action === 'update_price') {
      return await db.collection('shop_orders').doc(id).update({
        data: {
          totalFee: Number(newPrice),
          updateTime: db.serverDate()
        }
      })
    }
    
    // ===========================================
    // 场景 4: 确认收货
    // ===========================================
    if (action === 'sign') {
      if (!id && !orderId) {
        return { success: false, errMsg: '缺少订单标识' }
      }

      // 支持通过 id 或 orderId 更新
      let updateRes
      if (id) {
        updateRes = await db.collection('shop_orders').doc(id).update({
          data: { 
            status: 'SIGNED',
            signTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      } else {
        updateRes = await db.collection('shop_orders').where({ orderId }).update({
          data: { 
            status: 'SIGNED',
            signTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }

      return { success: true, msg: '确认收货成功' }
    }

    // ===========================================
    // 场景 5: 模拟支付 (测试用)
    // ===========================================
    if (action === 'simulate_pay') {
        const snap = await db.collection('shop_orders').doc(id).get()
        const order = snap.data
        await db.collection('shop_orders').doc(id).update({
            data: { status: 'PAID', payTime: db.serverDate() }
        })
        if (order && order.orderId) {
          try {
            await cloud.callFunction({
              name: 'referral',
              data: internalCallData({ action: 'grantOnOrderPaid', orderId: order.orderId })
            })
          } catch (referralErr) {
            console.error('[adminUpdateOrder] simulate_pay 推荐奖励:', referralErr)
          }
          try {
            await cloud.callFunction({
              name: 'referral',
              data: internalCallData({ action: 'markCouponsUsed', orderId: order.orderId })
            })
          } catch (couponErr) {
            console.error('[adminUpdateOrder] simulate_pay 优惠券核销:', couponErr)
          }
        }
        return { success: true }
    }

    return { success: true }

  } catch (err) {
    console.error('[main] 全局异常:', err)
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: '系统异常: ' + err.message }
  }
}