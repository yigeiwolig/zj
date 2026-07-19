// 管理员白名单维护：仅已有管理员可添加/查询/移除
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

function normalizeOpenid(raw) {
  return String(raw || '').trim()
}

async function findByOpenid(openid) {
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data && byOpenid.data[0]) return byOpenid.data[0]
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data && bySystemOpenid.data[0]) return bySystemOpenid.data[0]
  return null
}

async function handleAdd(openid, note) {
  const target = normalizeOpenid(openid)
  if (!target) return { success: false, msg: 'openid 不能为空' }
  const existing = await findByOpenid(target)
  if (existing) {
    return { success: true, msg: '该 openid 已是管理员', existed: true, _id: existing._id }
  }
  const addRes = await db.collection('guanliyuan').add({
    data: {
      openid: target,
      note: note ? String(note).trim() : '',
      createTime: db.serverDate()
    }
  })
  return { success: true, msg: '管理员已添加', _id: addRes._id, openid: target }
}

async function handleList() {
  const res = await db.collection('guanliyuan').limit(100).get()
  const list = (res.data || []).map((row) => ({
    _id: row._id,
    openid: row.openid || row._openid || '',
    note: row.note || ''
  }))
  return { success: true, list }
}

async function handleRemove(openid) {
  const target = normalizeOpenid(openid)
  if (!target) return { success: false, msg: 'openid 不能为空' }
  const existing = await findByOpenid(target)
  if (!existing) return { success: false, msg: '未找到该管理员' }
  await db.collection('guanliyuan').doc(existing._id).remove()
  return { success: true, msg: '管理员已移除', openid: target }
}

exports.main = async (event = {}) => {
  const action = event.action || 'add'
  try {
    await assertAdmin()
    if (action === 'add') {
      return await handleAdd(event.openid, event.note)
    }
    if (action === 'list') {
      return await handleList()
    }
    if (action === 'remove') {
      return await handleRemove(event.openid)
    }
    return { success: false, msg: 'INVALID_ACTION' }
  } catch (err) {
    console.error('[manageGuanliyuan] failed:', err)
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, msg: '无管理员权限' }
    }
    return { success: false, msg: err.message || '操作失败' }
  }
}
