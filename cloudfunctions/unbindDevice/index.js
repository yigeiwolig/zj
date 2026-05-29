const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function normalizeSn(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return ''
  if (raw.startsWith('MT-')) return raw
  if (raw.startsWith('MT')) return `MT-${raw.slice(2).replace(/^-/, '')}`
  if (raw.startsWith('NB')) return `MT-${raw.replace(/^NB-?/, '')}`
  return `MT-${raw.replace(/^-/, '')}`
}

function snCandidates(normalizedSn) {
  const suffix = String(normalizedSn || '').replace(/^MT-?/, '')
  const set = new Set()
  if (normalizedSn) set.add(normalizedSn)
  if (suffix) {
    set.add(suffix)
    set.add(`MT${suffix}`)
    set.add(`NB${suffix}`)
    set.add(`NB-${suffix}`)
  }
  return Array.from(set)
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const normalizedSn = normalizeSn(event.sn)

  try {
    if (!normalizedSn) {
      return { success: false, msg: 'SN 无效' }
    }
    const candidates = snCandidates(normalizedSn)
    const res = await db.collection('sn').where({
      sn: _.in(candidates),
      openid: myOpenid
    }).get()

    if (res.data.length === 0) {
      return { success: false, msg: '无权操作或设备不存在' }
    }

    const device = res.data[0]

    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          sn: normalizedSn,
          openid: ''
        }
      })
      return { success: true, msg: '解绑成功，设备已释放' }
    }

    await db.collection('sn').doc(device._id).remove()
    await db.collection('my_read').where({ sn: _.in(candidates) }).remove()
    return { success: true, msg: '绑定记录已清除' }
  } catch (err) {
    return { success: false, msg: err.message || err.errMsg || '解绑失败' }
  }
}











































































