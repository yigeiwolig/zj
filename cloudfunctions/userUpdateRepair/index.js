const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const SERVER_DATE_FLAG = '__SERVER_DATE__'

const ALLOWED_KEYS = new Set([
  'returnAddress',
  'returnTrackingId',
  'returnTrackingTime',
  'returnStatus',
  'status',
  'paidRepairAgreed',
  'paidRepairAgreedTime'
])

function normalizePatch(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const patch = {}
  Object.keys(raw).forEach((key) => {
    if (!ALLOWED_KEYS.has(key)) return
    let val = raw[key]
    if (val === SERVER_DATE_FLAG || (val === true && /Time$/.test(key))) {
      val = db.serverDate()
    }
    patch[key] = val
  })
  return patch
}

exports.main = async (event) => {
  const repairId = event && (event.repairId || event.id)
  const rawData = event && event.data

  if (!repairId || !rawData) {
    return { success: false, errMsg: '缺少 repairId 或 data' }
  }

  const openid = cloud.getWXContext().OPENID
  if (!openid) {
    return { success: false, errMsg: '未登录' }
  }

  try {
    const doc = await db.collection('shouhou_repair').doc(String(repairId)).get()
    if (!doc.data) {
      return { success: false, errMsg: '维修单不存在' }
    }

    const owner = doc.data._openid || ''
    if (owner && owner !== openid) {
      return { success: false, errMsg: '无权操作该维修单' }
    }

    const patch = normalizePatch(rawData)
    if (!Object.keys(patch).length) {
      return { success: false, errMsg: '无有效更新字段' }
    }

    if (!owner) {
      patch._openid = openid
    }

    await db.collection('shouhou_repair').doc(String(repairId)).update({ data: patch })
    return { success: true }
  } catch (e) {
    return { success: false, errMsg: (e && e.message) || String(e) }
  }
}
