const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function getDateKey(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { success: false, error: 'NO_OPENID' }

  const page = (event && event.page) || 'scan'
  const hourlyCount = Number((event && event.hourlyCount) || 0)
  const dailyCount = Number((event && event.dailyCount) || 0)
  const now = Date.now()
  const dateKey = getDateKey(now)

  try {
    const existed = await db.collection('screenshot_risk_queue')
      .where({
        _openid: OPENID,
        page,
        dateKey,
        status: 'pending'
      })
      .limit(1)
      .get()

    if (existed.data.length > 0) {
      const doc = existed.data[0]
      await db.collection('screenshot_risk_queue').doc(doc._id).update({
        data: {
          hourlyCount,
          dailyCount,
          lastScreenshotAt: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      return { success: true, queued: true, updated: true }
    }

    await db.collection('screenshot_risk_queue').add({
      data: {
        page,
        dateKey,
        hourlyCount,
        dailyCount,
        status: 'pending',
        decision: '',
        reason: 'DAILY_SCREENSHOT_OVER_3',
        lastScreenshotAt: db.serverDate(),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    return { success: true, queued: true, created: true }
  } catch (err) {
    console.error('[reportScreenshotRisk] failed:', err)
    return { success: false, error: err.message || String(err) }
  }
}

