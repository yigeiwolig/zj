const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get()
  if ((byOpenid.data || []).length > 0) return
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get()
  if ((bySystemOpenid.data || []).length > 0) return
  throw new Error('FORBIDDEN')
}

exports.main = async () => {
  try {
    await assertAdmin()

    const legacyRes = await db.collection('login_logbutton')
      .where({
        banReason: _.in(['screenshot', 'screen_record', 'screenshot_risk_review'])
      })
      .orderBy('updateTime', 'desc')
      .limit(500)
      .get()

    const rows = Array.isArray(legacyRes.data) ? legacyRes.data : []
    if (!rows.length) {
      return { success: true, backfilled: 0, scanned: 0 }
    }

    const openids = [...new Set(rows.map((r) => r && r._openid).filter(Boolean))]
    const existingMap = {}
    const BATCH = 100
    for (let i = 0; i < openids.length; i += BATCH) {
      const batch = openids.slice(i, i + BATCH)
      const existRes = await db.collection('screenshot_risk_queue')
        .where({
          _openid: _.in(batch),
          status: 'pending'
        })
        .get()
      ;(existRes.data || []).forEach((it) => {
        if (it && it._openid) existingMap[it._openid] = true
      })
    }

    let backfilled = 0
    for (const row of rows) {
      const openid = row && row._openid
      if (!openid || existingMap[openid]) continue
      await db.collection('screenshot_risk_queue').add({
        data: {
          _openid: openid,
          page: row.banPage || 'unknown',
          dateKey: '',
          hourlyCount: Number(row.hourlyCount || 1),
          dailyCount: Number(row.dailyCount || 1),
          status: 'pending',
          decision: '',
          reason: 'SCREENSHOT_CAPTURED_LEGACY',
          province: row.province || '',
          city: row.city || '',
          district: row.district || '',
          address: row.address || '',
          latitude: row.latitude != null ? row.latitude : null,
          longitude: row.longitude != null ? row.longitude : null,
          lastScreenshotAt: db.serverDate(),
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      existingMap[openid] = true
      backfilled += 1
    }

    return { success: true, backfilled, scanned: rows.length }
  } catch (err) {
    const msg = String((err && err.message) || err || '')
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' }
    }
    if (msg.includes('collection not exists')) {
      return { success: true, backfilled: 0, scanned: 0 }
    }
    return { success: false, error: msg }
  }
}
