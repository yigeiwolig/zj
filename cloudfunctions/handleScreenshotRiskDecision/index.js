const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get()
  if (byOpenid.data.length > 0) return OPENID
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return OPENID
  throw new Error('FORBIDDEN')
}

exports.main = async (event) => {
  const riskId = event && event.riskId
  const action = event && event.action // ban | ignore
  if (!riskId || !action) return { success: false, error: 'MISSING_PARAMS' }

  try {
    await assertAdmin()

    const riskRes = await db.collection('screenshot_risk_queue').doc(riskId).get()
    const risk = riskRes.data
    if (!risk) return { success: false, error: 'RISK_NOT_FOUND' }

    const openid = risk._openid
    if (!openid) return { success: false, error: 'OPENID_NOT_FOUND' }

    if (action === 'ban') {
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()

      const updateData = {
        isBanned: true,
        banReason: 'screenshot_risk_review',
        banPage: risk.page || 'scan',
        updateTime: db.serverDate()
      }

      if (buttonRes.data && buttonRes.data.length > 0) {
        await db.collection('login_logbutton').doc(buttonRes.data[0]._id).update({ data: updateData })
      } else {
        await db.collection('login_logbutton').add({
          data: {
            _openid: openid,
            ...updateData,
            bypassLocationCheck: false,
            qiangli: false,
            createTime: db.serverDate()
          }
        })
      }
    }

    await db.collection('screenshot_risk_queue').doc(riskId).update({
      data: {
        status: 'resolved',
        decision: action === 'ban' ? 'ban' : 'ignore',
        updateTime: db.serverDate()
      }
    })

    return { success: true }
  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' }
    }
    return { success: false, error: err.message || String(err) }
  }
}

