// cloudfunctions/queryLogistics/index.js
// 使用探数API物流查询

const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 🔹 探数API配置
const TANSU_API_CONFIG = {
  apiKey: 'f3cb439c7700cbc370f469d07b557609',
  apiUrl: 'https://api.tanshuapi.com/api/exp/v1/index'
}

// 🔹 缓存配置（避免频繁查询相同运单号）
const CACHE_DURATION = 10 * 60 * 1000 // 10分钟缓存，确保数据一致性

// 📦 探数API快递公司编码映射表（小写格式）
// 探数API使用小写编码，如 zto, sf, yto 等
const TANSU_EXPRESS_MAP = {
  // 中文名 -> 探数API编码
  '顺丰': 'sf', '顺丰速运': 'sf', '顺丰快递': 'sf', 'SF': 'sf', 'shunfeng': 'sf',
  '中通': 'zto', '中通快递': 'zto', 'ZTO': 'zto', 'zhongtong': 'zto',
  '圆通': 'yto', '圆通速递': 'yto', 'YTO': 'yto', 'yuantong': 'yto',
  '申通': 'sto', '申通快递': 'sto', 'STO': 'sto', 'shentong': 'sto',
  '韵达': 'yd', '韵达快递': 'yd', 'YD': 'yd', 'yunda': 'yd',
  '邮政': 'youzhengguonei', '中国邮政': 'youzhengguonei', '邮政平邮': 'youzhengguonei', 'YZPY': 'youzhengguonei',
  'EMS': 'ems', '邮政EMS': 'ems', 'ems': 'ems',
  '京东': 'jd', '京东快递': 'jd', 'JD': 'jd', 'jd': 'jd',
  '极兔': 'jitu', '极兔速递': 'jitu', 'JTSD': 'jitu', 'jitu': 'jitu',
  '德邦': 'debangwuliu', '德邦快递': 'debangwuliu', 'DBL': 'debangwuliu', 'debangwuliu': 'debangwuliu',
  '百世': 'huitongkuaidi', '百世快递': 'huitongkuaidi', 'HTKY': 'huitongkuaidi', 'huitongkuaidi': 'huitongkuaidi',
  '天天': 'tiantian', '天天快递': 'tiantian', 'HHTT': 'tiantian', 'tiantian': 'tiantian',
  '宅急送': 'zhaijisong', 'ZJS': 'zhaijisong', 'zhaijisong': 'zhaijisong',
  '优速': 'youshuwuliu', 'UC': 'youshuwuliu', 'youshuwuliu': 'youshuwuliu',
  '全峰': 'quanfengkuaidi', 'QFKD': 'quanfengkuaidi', 'quanfengkuaidi': 'quanfengkuaidi',
  '国通': 'guotongkuaidi', 'GTO': 'guotongkuaidi', 'guotongkuaidi': 'guotongkuaidi',
  '快捷': 'kuaijiesudi', 'FAST': 'kuaijiesudi', 'kuaijiesudi': 'kuaijiesudi'
}

// 📦 探数API编码 -> 中文名映射
const TANSU_EXPRESS_NAME_MAP = {
  'sf': '顺丰速运',
  'zto': '中通快递',
  'yto': '圆通速递',
  'sto': '申通快递',
  'yd': '韵达快递',
  'youzhengguonei': '中国邮政',
  'ems': 'EMS',
  'jd': '京东快递',
  'jitu': '极兔速递',
  'debangwuliu': '德邦快递',
  'huitongkuaidi': '百世快递',
  'tiantian': '天天快递',
  'zhaijisong': '宅急送',
  'youshuwuliu': '优速快递',
  'quanfengkuaidi': '全峰快递',
  'guotongkuaidi': '国通快递',
  'kuaijiesudi': '快捷快递'
}

// 🔹 将快递公司名称转换为探数API编码（小写）
function getTansuExpressCode(trackingId, expressCompany) {
  // 如果传入了快递公司名称，优先使用
  if (expressCompany) {
    // 如果已经是小写格式，直接返回
    if (/^[a-z]+$/.test(expressCompany.toLowerCase())) {
      const code = expressCompany.toLowerCase()
      console.log(`[快递识别] 使用传入的探数API编码: ${code}`)
      return code
    }
    // 模糊匹配中文名或大写代码
    const key = Object.keys(TANSU_EXPRESS_MAP).find(k => 
      expressCompany.toLowerCase().includes(k.toLowerCase()) || 
      k.toLowerCase().includes(expressCompany.toLowerCase())
    )
    if (key) {
      const code = TANSU_EXPRESS_MAP[key]
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
    return 'sf'
  }
  // 中通：ZTO开头，或7开头，或10-14位数字
  if (upperId.startsWith('ZTO') || (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('7'))) {
    console.log(`[快递识别] 识别为中通: ${trackingId}`)
    return 'zto'
  }
  // 圆通：YTO开头，或8开头，或10-14位数字
  if (upperId.startsWith('YTO') || (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('8'))) {
    console.log(`[快递识别] 识别为圆通: ${trackingId}`)
    return 'yto'
  }
  // 申通：STO开头，或2开头，或10-14位数字
  if (upperId.startsWith('STO') || (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('2'))) {
    console.log(`[快递识别] 识别为申通: ${trackingId}`)
    return 'sto'
  }
  // 京东：JD开头，或V开头
  if (upperId.startsWith('JD') || upperId.startsWith('V')) {
    console.log(`[快递识别] 识别为京东: ${trackingId}`)
    return 'jd'
  }
  // EMS：EMS开头，或E开头，或13位数字
  if (upperId.startsWith('EMS') || (upperId.startsWith('E') && upperId.length === 13)) {
    console.log(`[快递识别] 识别为EMS: ${trackingId}`)
    return 'ems'
  }
  // 韵达：1开头，或10-14位数字
  if (upperId.length >= 10 && upperId.length <= 14 && upperId.startsWith('1') && /^\d+$/.test(upperId)) {
    console.log(`[快递识别] 识别为韵达: ${trackingId}`)
    return 'yd'
  }
  
  // 对于14位数字的运单号，根据开头数字判断
  if (upperId.length === 14 && /^\d+$/.test(upperId)) {
    if (upperId.startsWith('7')) {
      console.log(`[快递识别] 14位数字，识别为中通: ${trackingId}`)
      return 'zto'
    } else if (upperId.startsWith('8')) {
      console.log(`[快递识别] 14位数字，识别为圆通: ${trackingId}`)
      return 'yto'
    } else if (upperId.startsWith('2')) {
      console.log(`[快递识别] 14位数字，识别为申通: ${trackingId}`)
      return 'sto'
    } else if (upperId.startsWith('1')) {
      console.log(`[快递识别] 14位数字，识别为韵达: ${trackingId}`)
      return 'yd'
    }
  }
  
  // 对于其他长度的纯数字，默认尝试中通
  if (/^\d+$/.test(upperId) && upperId.length >= 10 && upperId.length <= 15) {
    console.log(`[快递识别] ${upperId.length}位数字，默认尝试中通: ${trackingId}`)
    return 'zto'
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

// 🔹 调用探数API查询物流
async function queryTansuLogistics(trackingId, expressCode, phone) {
  return new Promise((resolve, reject) => {
    // 构建请求URL（使用GET方式）
    let url = `${TANSU_API_CONFIG.apiUrl}?key=${encodeURIComponent(TANSU_API_CONFIG.apiKey)}&no=${encodeURIComponent(trackingId)}`
    
    // 如果提供了快递公司编码，添加到URL
    if (expressCode) {
      url += `&com=${encodeURIComponent(expressCode)}`
    }
    
    // 如果提供了手机号后四位，添加到URL
    if (phone && phone.length >= 4) {
      const phoneLast4 = phone.slice(-4)
      url += `&phone=${encodeURIComponent(phoneLast4)}`
    }
    
    console.log(`[物流查询] 调用探数API - URL: ${url}`)
    
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    
    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          console.log('[物流查询] 探数API响应:', JSON.stringify(result))
          
          // 探数API返回 code: 1 表示成功
          if (result.code === 1 && result.data) {
            resolve(result)
          } else {
            reject(new Error(result.msg || `探数API错误: code=${result.code}`))
          }
        } catch (e) {
          reject(new Error('解析探数API响应失败: ' + e.message))
        }
      })
    })
    
    req.on('error', (e) => {
      reject(new Error('请求探数API失败: ' + e.message))
    })
    
    req.end()
  })
}

// 🔹 转换探数API状态码为统一格式
function convertStatus(statusDetail) {
  // 探数API状态：1 揽件 2 运输中 3 派送中 4 已签收 5 包裹异常/签收失败 10 退回
  const statusMap = {
    1: { status: '1', text: '揽收' },
    2: { status: '0', text: '运输中' },
    3: { status: '5', text: '派件' },
    4: { status: '3', text: '已签收' },
    5: { status: '2', text: '异常' },
    10: { status: '6', text: '退回' }
  }
  
  const converted = statusMap[statusDetail] || { status: '0', text: '在途' }
  return converted
}

// 🔹 查询物流信息（使用探数API）
async function queryLogistics(trackingId, expressCompany, phone) {
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
  
  // 获取快递公司代码（探数API格式，小写）
  const expressCode = getTansuExpressCode(normalizedTrackingId, expressCompany)
  // 注意：探数API支持自动识别，所以即使没有快递公司编码也可以查询
  
  console.log(`[物流查询] 开始查询 - 运单号: ${normalizedTrackingId}, 快递公司: ${expressCode || '自动识别'}`)
  
  // 调用探数API
  const tansuResult = await queryTansuLogistics(normalizedTrackingId, expressCode, phone)
  
  // 处理返回数据
  const tansuData = tansuResult.data
  
  if (tansuData && tansuData.list && tansuData.list.length > 0) {
    // 转换格式为统一格式
    const trackingList = tansuData.list
      .map(item => ({
        desc: (item.remark || '').trim(),
        time: (item.datetime || '').trim(),
        location: '' // 探数API的remark中可能包含地址信息，但格式不统一，这里留空
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
    
    // 转换状态
    const statusInfo = convertStatus(tansuData.status_detail || 0)
    
    const responseData = {
      success: true,
      data: {
        waybill_id: normalizedTrackingId,
        express_company_name: tansuData.company || TANSU_EXPRESS_NAME_MAP[tansuData.com] || expressCompany || '未知',
        path_list: trackingList,
        status: statusInfo.status,
        status_text: tansuData.status_desc || statusInfo.text
      }
    }
    
    // 保存缓存
    saveCache(normalizedTrackingId, responseData).catch(err => {
      console.warn('[物流查询] 保存缓存失败:', err)
    })
    
    console.log(`[物流查询] 查询成功: ${normalizedTrackingId}, 快递公司: ${tansuData.company || expressCode}, 轨迹数量: ${trackingList.length}`)
    
    return responseData
  } else {
    // 无轨迹信息
    const statusInfo = convertStatus(tansuData?.status_detail || 0)
    
    const responseData = {
      success: true,
      data: {
        waybill_id: normalizedTrackingId,
        express_company_name: tansuData?.company || TANSU_EXPRESS_NAME_MAP[tansuData?.com] || expressCompany || '未知',
        path_list: [],
        status: statusInfo.status,
        status_text: tansuData?.status_desc || statusInfo.text
      }
    }
    
    // 保存缓存
    saveCache(normalizedTrackingId, responseData).catch(err => {
      console.warn('[物流查询] 保存缓存失败:', err)
    })
    
    console.log(`[物流查询] 查询成功但无轨迹: ${normalizedTrackingId}, 快递公司: ${tansuData?.company || expressCode}`)
    
    return responseData
  }
}

// 🔹 主入口函数
exports.main = async (event, context) => {
  try {
    const { trackingId, expressCompany, receiverPhone } = event
    
    // 标准化输入参数
    const normalizedTrackingId = String(trackingId || '').trim().toUpperCase()
    const normalizedCompany = expressCompany ? String(expressCompany).trim() : ''
    const normalizedPhone = receiverPhone ? String(receiverPhone).trim() : ''
    
    if (!normalizedTrackingId) {
      return {
        success: false,
        errMsg: '运单号不能为空'
      }
    }
    
    console.log(`[物流查询] 开始查询 - 运单号: ${normalizedTrackingId}, 快递公司: ${normalizedCompany || '未指定'}, 手机号: ${normalizedPhone || '未提供'}`)
    
    const result = await queryLogistics(normalizedTrackingId, normalizedCompany, normalizedPhone)
    
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
