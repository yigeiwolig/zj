const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get()
  if (byOpenid.data.length > 0) return OPENID
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return OPENID
  throw new Error('FORBIDDEN')
}

exports.main = async () => {
  try {
    await assertAdmin()
    const queueRes = await db.collection('screenshot_risk_queue')
      .where({
        status: 'pending',
        dailyCount: _.gte(3)
      })
      .orderBy('updateTime', 'desc')
      .limit(100)
      .get()

    const users = (queueRes.data || []).map((it) => ({
      _id: it._id,
      _openid: it._openid,
      page: it.page || 'scan',
      dateKey: it.dateKey || '',
      hourlyCount: Number(it.hourlyCount || 0),
      dailyCount: Number(it.dailyCount || 0),
      reason: it.reason || '',
      updateTime: it.updateTime || it.createTime || null
    }))

    return { success: true, users }
  } catch (err) {
    const errText = (err && (err.message || err.errMsg || String(err))) || '';
    if (errText.includes('collection not exists') || errText.includes('Db or Table not exist')) {
      // 首次上线未创建集合时，前端按空列表处理，避免管理页报错
      return { success: true, users: [] };
    }
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限', users: [] }
    }
    return { success: false, error: err.message || String(err), users: [] }
  }
}

