// 云函数：管理员维修单查询/更新（客户端 shouhou_repair 仅允许本人读写）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const SERVER_DATE_FLAG = '__SERVER_DATE__'

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

function normalizePatch(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const patch = { ...raw }
  delete patch._id
  delete patch._openid
  delete patch.openid
  Object.keys(patch).forEach((key) => {
    if (patch[key] === SERVER_DATE_FLAG || (patch[key] === true && /Time$/.test(key))) {
      patch[key] = db.serverDate()
    }
  })
  return patch
}

function filterPendingRepairs(items) {
  return (items || []).filter((item) => {
    if (item.needPurchaseParts === true) return false
    if (item.purchasePartsStatus === 'completed') return false
    return true
  })
}

async function enrichReturnRequiredMeta(items) {
  const list = items || []
  const openids = [...new Set(list.map((i) => i._openid).filter(Boolean))]
  const nicknameDict = {}
  for (const openid of openids) {
    try {
      const validRes = await db.collection('valid_users').where({ _openid: openid }).limit(1).get()
      if (validRes.data && validRes.data[0] && validRes.data[0].nickname) {
        nicknameDict[openid] = validRes.data[0].nickname
      }
    } catch (e) { /* ignore */ }
  }

  const sns = [...new Set(list.map((i) => i && i.device && i.device.sn).filter(Boolean))]
  const snExpiryMap = {}
  if (sns.length) {
    try {
      const snRes = await db.collection('sn').where({ sn: _.in(sns), isActive: true }).get()
      ;(snRes.data || []).forEach((d) => {
        if (d && d.sn && d.expiryDate && !snExpiryMap[d.sn]) snExpiryMap[d.sn] = d.expiryDate
      })
    } catch (e) { /* ignore */ }
  }

  return { nicknameDict, snExpiryMap }
}

async function listRepairs(listType) {
  const limit = 200
  if (listType === 'pending') {
    const res = await db.collection('shouhou_repair')
      .where({
        status: 'PENDING',
        needReturn: _.neq(true),
        needPurchaseParts: _.neq(true)
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()
    return { data: filterPendingRepairs(res.data) }
  }

  if (listType === 'returnRequired') {
    const res = await db.collection('shouhou_repair')
      .where({
        needReturn: true,
        returnCompleted: _.neq(true),
        status: _.nin(['COMPLETED', 'RETURN_RECEIVED'])
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()
    const meta = await enrichReturnRequiredMeta(res.data)
    return { data: res.data || [], ...meta }
  }

  throw new Error('Unknown listType')
}

exports.main = async (event) => {
  const ev = event || {}
  const {
    id,
    repairId,
    action,
    trackingId = '',
    note = '',
    data
  } = ev

  const listType = ev.listType || ev.type || (ev.op === 'list' ? ev.listType || ev.type : '')

  const docId = id || repairId

  // 列表查询优先处理（兼容 op=list + listType）
  if (listType === 'pending' || listType === 'returnRequired') {
    try {
      await assertAdmin()
      const listed = await listRepairs(listType)
      return {
        success: true,
        data: listed.data,
        nicknameDict: listed.nicknameDict || {},
        snExpiryMap: listed.snExpiryMap || {}
      }
    } catch (e) {
      const msg = String((e && e.message) || e || '')
      if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
        return { success: false, errMsg: '无管理员权限' }
      }
      return { success: false, errMsg: msg }
    }
  }

  try {
    await assertAdmin()
  } catch (e) {
    const msg = String((e && e.message) || e || '')
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: msg }
  }

  try {
    if (action === 'get' && docId) {
      const doc = await db.collection('shouhou_repair').doc(docId).get()
      if (!doc.data) return { success: false, errMsg: '维修单不存在' }
      return { success: true, data: doc.data }
    }

    if (data && docId) {
      const patch = normalizePatch(data)
      if (!Object.keys(patch).length) {
        return { success: false, errMsg: '无有效更新字段' }
      }
      await db.collection('shouhou_repair').doc(docId).update({ data: patch })
      return { success: true }
    }

    if (!docId || !action) {
      return { success: false, errMsg: 'Missing id or action' }
    }

    let updateObj = {}
    if (action === 'ship') {
      const shipRemark = String(ev.shipRemark || ev.note || '').trim()
      updateObj = {
        status: 'SHIPPED',
        trackingId: trackingId || '',
        solveTime: db.serverDate()
      }
      if (shipRemark) updateObj.shipRemark = shipRemark

      let canShipRes = { canShip: true }
      try {
        const gate = await cloud.callFunction({
          name: 'deviceReplacement',
          data: { action: 'checkCanShip', repairId: docId }
        })
        canShipRes = (gate.result && gate.result.success) ? gate.result : canShipRes
      } catch (gateErr) {
        console.warn('[adminUpdateRepair] checkCanShip failed:', gateErr)
      }
      if (canShipRes.canShip === false) {
        return { success: false, errMsg: canShipRes.msg || '暂不可录单发货' }
      }

      await db.collection('shouhou_repair').doc(docId).update({ data: updateObj })
      return { success: true }
    } else if (action === 'tutorial') {
      updateObj = {
        status: 'TUTORIAL',
        trackingId: '',
        solveNote: note || '请查看维修教程，可自行修复。如仍无法解决，请联系客服。',
        solveTime: db.serverDate()
      }
    } else {
      return { success: false, errMsg: 'Unknown action' }
    }

    await db.collection('shouhou_repair').doc(docId).update({ data: updateObj })
    return { success: true }
  } catch (e) {
    return { success: false, errMsg: (e && e.message) || String(e) }
  }
}
