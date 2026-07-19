const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function softWecomAdminTodo(kind, oneLine) {
  try {
    await cloud.callFunction({
      name: 'wecomNotify',
      data: { action: 'notifyAdminTodo', kind, oneLine: oneLine || '' }
    })
  } catch (e) {
    console.warn('[reportScreenshotRisk] wecomAdminTodo failed', e)
  }
}

async function isGuanliyuan(openid) {
  if (!openid) return false
  let r = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (r.data && r.data.length > 0) return true
  r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  return !!(r.data && r.data.length > 0)
}

function getDateKey(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function countScreenshotEvents(openid, page, sinceMs) {
  const _ = db.command
  const where = {
    _openid: openid,
    page,
    createTime: _.gte(new Date(sinceMs))
  }
  const res = await db.collection('screenshot_risk_queue').where(where).count()
  return (res && res.total) || 0
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { success: false, error: 'NO_OPENID' }

  if (await isGuanliyuan(OPENID)) {
    return { success: true, skipped: true, reason: 'admin_exempt' }
  }

  const page = (event && event.page) || 'scan'
  const now = Date.now()
  const dateKey = getDateKey(now)

  let hourlyCount = 0
  let dailyCount = 0
  try {
    hourlyCount = await countScreenshotEvents(OPENID, page, now - 60 * 60 * 1000)
    dailyCount = await countScreenshotEvents(OPENID, page, now - 24 * 60 * 60 * 1000)
  } catch (countErr) {
    console.warn('[reportScreenshotRisk] server count failed, fallback to client:', countErr)
    hourlyCount = Number((event && event.hourlyCount) || 0)
    dailyCount = Number((event && event.dailyCount) || 0)
  }

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
      return { success: true, queued: true, updated: true, hourlyCount, dailyCount }
    }

    await db.collection('screenshot_risk_queue').add({
      data: {
        _openid: OPENID,
        page,
        dateKey,
        hourlyCount,
        dailyCount,
        status: 'pending',
        decision: '',
        reason: 'SCREENSHOT_CAPTURED',
        lastScreenshotAt: db.serverDate(),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    await softWecomAdminTodo(
      'screenshot_risk',
      `${page || '未知页'} · 1小时${hourlyCount}次 / 24小时${dailyCount}次`
    )
    return { success: true, queued: true, created: true, hourlyCount, dailyCount }
  } catch (err) {
    console.error('[reportScreenshotRisk] failed:', err)
    return { success: false, error: err.message || String(err) }
  }
}
