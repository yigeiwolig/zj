// cloudfunctions/sendBlockedUser/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 只允许写入的字段（保证 blocked_logs 干净，只存地址 + app_config 对应数据）
const pick = (obj, keys) => {
  const out = {}
  keys.forEach(k => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) {
      out[k] = obj[k]
    }
  })
  return out
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    const allowed = pick(event || {}, [
      // 地址信息
      'province',
      'city',
      'district',
      'address',
      'full_address',
      'latitude',
      'longitude',
      'phoneModel',
      // app_config.blocking_rules 对应信息/结果
      'is_active',
      'blocked_cities',
      'blocked_provinces',
      'hitBlocked',
      'hitCity',
      // 免死金牌标记（放行也要记录）
      'bypassLocationCheck'
    ])

    // 统一字段：address 优先 full_address
    const finalAddress = allowed.address || allowed.full_address || ''

    // 每次 add（留历史）
    const dataToWrite = {
      _openid: wxContext.OPENID,
      address: finalAddress,
      province: allowed.province || '',
      city: allowed.city || '',
      district: allowed.district || '',
      latitude: typeof allowed.latitude === 'number' ? allowed.latitude : (allowed.latitude ? Number(allowed.latitude) : undefined),
      longitude: typeof allowed.longitude === 'number' ? allowed.longitude : (allowed.longitude ? Number(allowed.longitude) : undefined),
      phoneModel: allowed.phoneModel,

      is_active: allowed.is_active,
      blocked_cities: allowed.blocked_cities,
      blocked_provinces: allowed.blocked_provinces,
      hitBlocked: allowed.hitBlocked,
      hitCity: allowed.hitCity,
      bypassLocationCheck: allowed.bypassLocationCheck === true,

      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      serverTime: new Date()
    }

    return await db.collection('blocked_logs').add({ data: dataToWrite })
  } catch (err) {
    console.error(err)
    return { success: false, error: err }
  }
}
