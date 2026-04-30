// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function assertAdmin() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { id, action, trackingId = '', note = '' } = event

  if (!id || !action) {
    return { success: false, errMsg: 'Missing id or action' }
  }

  // 根据 action 推导 status / 字段
  let status = ''
  let updateObj = {}

  if (action === 'ship') {
    status = 'SHIPPED'
    updateObj = {
      status,
      trackingId: trackingId || '',
      solveTime: db.serverDate(),
    }
  } else if (action === 'tutorial') {
    status = 'TUTORIAL'
    updateObj = {
      status,
      trackingId: '', // 清空单号，避免前端条件冲突
      solveNote: note || '请查看维修教程，可自行修复。如仍无法解决，请联系客服。',
      solveTime: db.serverDate(),
    }
  } else {
    return { success: false, errMsg: 'Unknown action' }
  }

  try {
    await assertAdmin()
    await db.collection('shouhou_repair').doc(id).update({ data: updateObj })
    return { success: true }
  } catch (e) {
    if (String(e && e.message).includes('UNAUTHORIZED') || String(e && e.message).includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: e.message }
  }
}




















