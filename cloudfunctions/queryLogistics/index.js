// cloudfunctions/queryLogistics/index.js
// 使用微信官方物流查询API

const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 🔹 配置信息
const CONFIG = {
  appId: 'wxf1a81dd77d810edf',
  appSecret: 'bc6cf6a358e84c3f88c105cf19b70fbd'
}

// 🔹 缓存配置（避免频繁查询相同运单号）
const CACHE_DURATION = 10 * 60 * 1000 // 10分钟缓存，确保数据一致性

// 📦 微信官方快递公司编码映射表
// 微信要求传代码(如 SF, ZTO)，不能传中文(如 顺丰, 中通)
const WX_EXPRESS_MAP = {
  '顺丰': 'SF', '顺丰速运': 'SF', '顺丰快递': 'SF', 'shunfeng': 'SF',
  '中通': 'ZTO', '中通快递': 'ZTO', 'zhongtong': 'ZTO',
  '圆通': 'YTO', '圆通速递': 'YTO', 'yuantong': 'YTO',
  '申通': 'STO', '申通快递': 'STO', 'shentong': 'STO',
  '韵达': 'YD', '韵达快递': 'YD', 'yunda': 'YD',
  '邮政': 'YZPY', '中国邮政': 'YZPY', '邮政平邮': 'YZPY', 'youzhengguonei': 'YZPY',
  'EMS': 'EMS', '邮政EMS': 'EMS', 'ems': 'EMS',
  '京东': 'JD', '京东快递': 'JD', 'jd': 'JD',
  '极兔': 'JTSD', '极兔速递': 'JTSD', 'jitu': 'JTSD',
  '德邦': 'DBL', '德邦快递': 'DBL', 'debangwuliu': 'DBL',
  '百世': 'HTKY', '百世快递': 'HTKY', 'huitongkuaidi': 'HTKY',
  '天天': 'HHTT', '天天快递': 'HHTT', 'tiantian': 'HHTT',
  '宅急送': 'ZJS', 'zhaijisong': 'ZJS',
  '优速': 'UC', '优速快递': 'UC', 'youshuwuliu': 'UC',
  '全峰': 'QFKD', '全峰快递': 'QFKD', 'quanfengkuaidi': 'QFKD',
  '国通': 'GTO', '国通快递': 'GTO', 'guotongkuaidi': 'GTO',
  '快捷': 'FAST', '快捷快递': 'FAST', 'kuaijiesudi': 'FAST'
}

// 📦 反向映射：微信代码 -> 中文名
const WX_EXPRESS_NAME_MAP = {
  'SF': '顺丰速运',
  'ZTO': '中通快递',
  'YTO': '圆通速递',
  'STO': '申通快递',
  'YD': '韵达快递',
  'YZPY': '中国邮政',
  'EMS': 'EMS',
  'JD': '京东快递',
  'JTSD': '极兔速递',
  'DBL': '德邦快递',
  'HTKY': '百世快递',
  'HHTT': '天天快递',
  'ZJS': '宅急送',
  'UC': '优速快递',
  'QFKD': '全峰快递',
  'GTO': '国通快递',
  'FAST': '快捷快递'
}

// 🔹 获取 AccessToken
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.appId}&secret=${CONFIG.appSecret}`
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.access_token) {
            console.log('[物流查询] 获取 access_token 成功')
            resolve(result.access_token)
          } else {
            reject(new Error(`获取Token失败: ${result.errmsg || JSON.stringify(result)}`))
          }
        } catch (e) {
          reject(new Error('解析 access_token 响应失败: ' + e.message))
        }
      })
    }).on('error', reject)
  })
}

// 🔹 将快递公司名称转换为微信官方代码
function getWxExpressCode(trackingId, expressCompany) {
  // 如果传入了快递公司名称，优先使用
  if (expressCompany) {
    // 如果已经是微信格式（大写字母），直接返回
    if (/^[A-Z]+$/.test(expressCompany)) {
      console.log(`[快递识别] 使用传入的微信快递代码: ${expressCompany}`)
      return expressCompany
    }
    // 模糊匹配中文名或小写代码
    const key = Object.keys(WX_EXPRESS_MAP).find(k => 
      expressCompany.toLowerCase().includes(k.toLowerCase()) || 
      k.toLowerCase().includes(expressCompany.toLowerCase())
    )
    if (key) {
      const code = WX_EXPRESS_MAP[key]
      console.log(`[快递识别] 匹配到快递公司: ${expressCompany} -> ${code}`)
      return code
    }
  }
  
  // 根据运单号前缀自动识别（常见快递）
  if (!trackingId) {
    console.log(`[快递识别] 无运单号，无法识别`)
    return null
  }
  
  const upperId = trackingId.toUpperCase()
  
  // 顺丰：SF开头，或12位纯数字
  if (upperId.startsWith('SF') || (upperId.length === 12 && /^\d+$/.test(upperId))) {
    console.log(`[快递识别] 识别为顺丰: ${trackingId}`)
    return 'SF'
  }
  // 中通：ZTO开头，或7开头，或10-14位数字
  if (upperId.startsWith('ZTO') || (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('7'))) {
    console.log(`[快递识别] 识别为中通: ${trackingId}`)
    return 'ZTO'
  }
  // 圆通：YTO开头，或8开头，或10-14位数字
  if (upperId.startsWith('YTO') || (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('8'))) {
    console.log(`[快递识别] 识别为圆通: ${trackingId}`)
    return 'YTO'
  }
  // 申通：STO开头，或2开头，或10-14位数字
  if (upperId.startsWith('STO') || (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('2'))) {
    console.log(`[快递识别] 识别为申通: ${trackingId}`)
    return 'STO'
  }
  // 京东：JD开头，或V开头
  if (upperId.startsWith('JD') || upperId.startsWith('V')) {
    console.log(`[快递识别] 识别为京东: ${trackingId}`)
    return 'JD'
  }
  // EMS：EMS开头，或E开头，或13位数字
  if (upperId.startsWith('EMS') || (upperId.startsWith('E') && upperId.length === 13)) {
    console.log(`[快递识别] 识别为EMS: ${trackingId}`)
    return 'EMS'
  }
  // 韵达：1开头，或10-14位数字
  if (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('1') && /^\d+$/.test(upperId)) {
    console.log(`[快递识别] 识别为韵达: ${trackingId}`)
    return 'YD'
  }
  
  // 对于14位数字的运单号，根据开头数字判断
  if (upperId.length === 14 && /^\d+$/.test(upperId)) {
    if (upperId.startsWith('7')) {
      console.log(`[快递识别] 14位数字，识别为中通: ${trackingId}`)
      return 'ZTO'
    } else if (upperId.startsWith('8')) {
      console.log(`[快递识别] 14位数字，识别为圆通: ${trackingId}`)
      return 'YTO'
    } else if (upperId.startsWith('2')) {
      console.log(`[快递识别] 14位数字，识别为申通: ${trackingId}`)
      return 'STO'
    } else if (upperId.startsWith('1')) {
      console.log(`[快递识别] 14位数字，识别为韵达: ${trackingId}`)
      return 'YD'
    }
  }
  
  // 对于其他长度的纯数字，默认尝试中通
  if (/^\d+$/.test(upperId) && upperId.length >= 10 && upperId.length <= 15) {
    console.log(`[快递识别] ${upperId.length}位数字，默认尝试中通: ${trackingId}`)
    return 'ZTO'
  }
  
  console.log(`[快递识别] 无法识别快递公司: ${trackingId}`)
  return null
}

// 🔹 检查缓存
async function getCachedResult(trackingId) {
  try {
    const cacheRes = await db.collection('logistics_cache')
      .where({ tracking_id: trackingId })
      .orderBy('update_time', 'desc')
      .limit(1)
      .get()
    
    if (cacheRes.data && cacheRes.data.length > 0) {
      const cache = cacheRes.data[0]
      const now = Date.now()
      const cacheTime = cache.update_time ? new Date(cache.update_time).getTime() : 0
      
      // 如果缓存未过期
      if (now - cacheTime < CACHE_DURATION) {
        console.log(`[物流查询] 使用缓存数据: ${trackingId}, 轨迹数量: ${cache.result?.data?.path_list?.length || 0}`)
        return cache.result
      }
    }
  } catch (e) {
    console.warn('[物流查询] 读取缓存失败:', e)
  }
  return null
}

// 🔹 保存缓存
async function saveCache(trackingId, result) {
  try {
    const existing = await db.collection('logistics_cache')
      .where({ tracking_id: trackingId })
      .limit(1)
      .get()
    
    if (existing.data && existing.data.length > 0) {
      await db.collection('logistics_cache')
        .doc(existing.data[0]._id)
        .update({
          data: {
            result: result,
            update_time: db.serverDate()
          }
        })
    } else {
      await db.collection('logistics_cache').add({
        data: {
          tracking_id: trackingId,
          result: result,
          update_time: db.serverDate()
        }
      })
    }
  } catch (e) {
    console.warn('[物流查询] 保存缓存失败:', e)
  }
}

// 🔹 调用微信官方物流查询API
async function queryWxLogistics(accessToken, trackingId, deliveryId, openid, receiverPhone) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/express/delivery/open_msg/trace_waybill?access_token=${accessToken}`
    
    const requestData = {
      waybill_id: trackingId,
      delivery_id: deliveryId,
      openid: openid || '',
      receiver_phone: receiverPhone || ''
    }
    
    console.log(`[物流查询] 调用微信API - 运单号: ${trackingId}, 快递公司: ${deliveryId}, openid: ${openid || '未提供'}, 手机号: ${receiverPhone || '未提供'}`)
    
    const postData = JSON.stringify(requestData)
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          console.log('[物流查询] 微信API响应:', JSON.stringify(result))
          
          if (result.errcode && result.errcode !== 0) {
            reject(new Error(`微信API错误: ${result.errmsg || result.errcode}`))
            return
          }
          
          resolve(result)
        } catch (e) {
          reject(new Error('解析微信API响应失败: ' + e.message))
        }
      })
    })
    
    req.on('error', (e) => {
      reject(new Error('请求微信API失败: ' + e.message))
    })
    
    req.write(postData)
    req.end()
  })
}

// 🔹 查询物流信息（使用微信官方API）
async function queryLogistics(trackingId, expressCompany, openid, receiverPhone) {
  // 标准化运单号
  const normalizedTrackingId = String(trackingId || '').trim().toUpperCase()
  
  if (!normalizedTrackingId) {
    throw new Error('运单号不能为空')
  }
  
  // 先检查缓存
  const cached = await getCachedResult(normalizedTrackingId)
  if (cached) {
    return cached
  }
  
  // 获取快递公司代码（微信格式）
  const deliveryId = getWxExpressCode(normalizedTrackingId, expressCompany)
  if (!deliveryId) {
    throw new Error('无法识别快递公司，请手动指定')
  }
  
  console.log(`[物流查询] 开始查询 - 运单号: ${normalizedTrackingId}, 快递公司: ${deliveryId}`)
  
  // 获取 access_token
  const accessToken = await getAccessToken()
  
  // 调用微信官方API
  const wxResult = await queryWxLogistics(accessToken, normalizedTrackingId, deliveryId, openid, receiverPhone)
  
  // 处理返回数据
  if (wxResult.waybill_trace && wxResult.waybill_trace.length > 0) {
    // 转换格式为统一格式
    const trackingList = wxResult.waybill_trace
      .map(item => ({
        desc: (item.desc || '').trim(),
        time: (item.time || '').trim(),
        location: (item.location || '').trim()
      }))
      .filter(item => item.desc && item.time) // 过滤空数据
      .sort((a, b) => {
        // 按时间倒序排列（最新的在前）
        try {
          const normalizeTime = (timeStr) => timeStr.replace(/-/g, '/').replace(/\s+/g, ' ')
          const timeA = normalizeTime(a.time)
          const timeB = normalizeTime(b.time)
          const dateA = new Date(timeA).getTime()
          const dateB = new Date(timeB).getTime()
          if (dateA === dateB) return a.desc.localeCompare(b.desc)
          return dateB - dateA
        } catch (e) {
          return b.time.localeCompare(a.time)
        }
      })
      .reduce((acc, current) => {
        // 去重
        const exists = acc.find(item => {
          const timeMatch = item.time.trim() === current.time.trim()
          const descMatch = item.desc.trim() === current.desc.trim()
          return timeMatch && descMatch
        })
        if (!exists) acc.push(current)
        return acc
      }, [])
    
    const responseData = {
      success: true,
      data: {
        waybill_id: normalizedTrackingId,
        express_company_name: WX_EXPRESS_NAME_MAP[deliveryId] || expressCompany || '未知',
        path_list: trackingList,
        status: String(wxResult.status || '0'),
        status_text: getStatusText(String(wxResult.status || '0'))
      }
    }
    
    // 保存缓存
    saveCache(normalizedTrackingId, responseData).catch(err => {
      console.warn('[物流查询] 保存缓存失败:', err)
    })
    
    console.log(`[物流查询] 查询成功: ${normalizedTrackingId}, 快递公司: ${deliveryId}, 轨迹数量: ${trackingList.length}`)
    
    return responseData
  } else {
    // 无轨迹信息
    const responseData = {
      success: true,
      data: {
        waybill_id: normalizedTrackingId,
        express_company_name: WX_EXPRESS_NAME_MAP[deliveryId] || expressCompany || '未知',
        path_list: [],
        status: String(wxResult.status || '0'),
        status_text: getStatusText(String(wxResult.status || '0'))
      }
    }
    
    // 保存缓存
    saveCache(normalizedTrackingId, responseData).catch(err => {
      console.warn('[物流查询] 保存缓存失败:', err)
    })
    
    console.log(`[物流查询] 查询成功但无轨迹: ${normalizedTrackingId}, 快递公司: ${deliveryId}`)
    
    return responseData
  }
}

// 🔹 获取状态文本
function getStatusText(status) {
  const statusMap = {
    '0': '在途',
    '1': '揽收',
    '2': '疑难',
    '3': '已签收',
    '4': '退签',
    '5': '派件',
    '6': '退回',
    '7': '转投',
    '10': '待清关',
    '11': '清关中',
    '12': '已清关',
    '13': '拒收'
  }
  return statusMap[status] || '未知状态'
}

// 🔹 主入口函数
exports.main = async (event, context) => {
  try {
    const { trackingId, expressCompany, openid, receiverPhone } = event
    
    // 标准化输入参数
    const normalizedTrackingId = String(trackingId || '').trim().toUpperCase()
    const normalizedCompany = expressCompany ? String(expressCompany).trim() : ''
    
    if (!normalizedTrackingId) {
      return {
        success: false,
        errMsg: '运单号不能为空'
      }
    }
    
    // 🔴 获取 openid（优先使用传入的，否则从 WXContext 获取）
    const wxContext = cloud.getWXContext()
    const userOpenid = openid || wxContext.OPENID || ''
    
    if (!userOpenid) {
      return {
        success: false,
        errMsg: '无法获取用户 openid，请确保用户已登录'
      }
    }
    
    console.log(`[物流查询] 开始查询 - 运单号: ${normalizedTrackingId}, 快递公司: ${normalizedCompany || '未指定'}, openid: ${userOpenid}, 手机号: ${receiverPhone || '未提供'}`)
    
    const result = await queryLogistics(normalizedTrackingId, normalizedCompany, userOpenid, receiverPhone)
    
    console.log(`[物流查询] 查询完成 - 运单号: ${normalizedTrackingId}, 成功: ${result.success}`)
    
    return result
    
  } catch (err) {
    console.error('[物流查询] 执行失败:', err)
    return {
      success: false,
      errMsg: err.message || '查询失败，请稍后重试'
    }
  }
}
