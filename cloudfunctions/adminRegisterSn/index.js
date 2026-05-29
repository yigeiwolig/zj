// cloudfunctions/adminRegisterSn/index.js
// 管理员在控制中心预登记 SN（不激活、不写质保）

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

function normModel(s) {
  return String(s || '').trim().toUpperCase()
}

async function assertAdmin(db) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

async function findSnRecord(db, _, normalizedSn) {
  const res = await db.collection('sn').where({ sn: _.in(snCandidates(normalizedSn)) }).get()
  return res.data[0] || null
}

async function findPreRegister(db, _, normalizedSn) {
  const res = await db.collection('guanliyuanSN').where({ sn: _.in(snCandidates(normalizedSn)) }).get()
  return res.data[0] || null
}

async function upsertPreRegister(db, _, normalizedSn, productModel, adminOpenid) {
  const existing = await db.collection('guanliyuanSN').where({ sn: _.in(snCandidates(normalizedSn)) }).limit(1).get()
  const payload = {
    sn: normalizedSn,
    productModel,
    registeredBy: adminOpenid,
    registeredAt: db.serverDate(),
    source: 'scan_control_center'
  }
  if (existing.data.length > 0) {
    await db.collection('guanliyuanSN').doc(existing.data[0]._id).update({ data: payload })
    return existing.data[0]._id
  }
  const addRes = await db.collection('guanliyuanSN').add({ data: payload })
  return addRes._id
}

async function upsertInactiveSn(db, normalizedSn, productModel, deviceName) {
  const _ = db.command
  const existing = await findSnRecord(db, _, normalizedSn)
  const base = {
    sn: normalizedSn,
    name: deviceName || normalizedSn,
    productModel,
    openid: '',
    isActive: false,
    activations: 0,
    updateTime: db.serverDate()
  }
  if (existing) {
    await db.collection('sn').doc(existing._id).update({
      data: {
        sn: normalizedSn,
        productModel,
        name: base.name,
        openid: '',
        isActive: false,
        preRegistered: true,
        activations: 0,
        expiryDate: _.remove(),
        firmware: _.remove(),
        totalDays: _.remove(),
        remainingDays: _.remove()
      }
    })
    return existing._id
  }
  const addRes = await db.collection('sn').add({
    data: { ...base, preRegistered: true, createTime: db.serverDate() }
  })
  return addRes._id
}

async function handleCheck(db, _, normalizedSn, productModel) {
  if (!normalizedSn) {
    return { success: false, msg: '无法识别 SN' }
  }
  if (!productModel) {
    return { success: false, msg: '产品型号无效' }
  }

  const device = await findSnRecord(db, _, normalizedSn)
  const preReg = await findPreRegister(db, _, normalizedSn)

  if (device && device.openid) {
    return {
      success: true,
      showDialog: false,
      reason: device.isActive ? 'user_bound' : 'pending_audit'
    }
  }

  if (preReg && normModel(preReg.productModel) === normModel(productModel)) {
    return {
      success: true,
      showDialog: false,
      reason: 'already_registered',
      sn: normalizedSn
    }
  }

  if (preReg && normModel(preReg.productModel) !== normModel(productModel)) {
    return {
      success: true,
      showDialog: true,
      mode: 'change_model',
      sn: normalizedSn,
      existingModel: preReg.productModel,
      targetModel: productModel
    }
  }

  return {
    success: true,
    showDialog: true,
    mode: 'confirm_new',
    sn: normalizedSn,
    targetModel: productModel
  }
}

async function handleRegister(db, _, normalizedSn, productModel, deviceName, adminOpenid) {
  if (!normalizedSn || !productModel) {
    return { success: false, msg: '参数不完整' }
  }

  const device = await findSnRecord(db, _, normalizedSn)
  if (device && device.openid) {
    if (device.isActive) {
      return { success: false, msg: '该设备已被用户绑定，无法修改登记' }
    }
    return { success: false, msg: '该设备有待审核绑定，请先处理后再预登记' }
  }

  await upsertPreRegister(db, _, normalizedSn, productModel, adminOpenid)
  await upsertInactiveSn(db, normalizedSn, productModel, deviceName)

  return {
    success: true,
    msg: '预登记成功',
    sn: normalizedSn,
    productModel
  }
}

exports.main = async (event) => {
  const db = cloud.database()
  const _ = db.command

  try {
    const adminOpenid = await assertAdmin(db)
    const action = event.action || 'check'
    const normalizedSn = normalizeSn(event.sn)
    const productModel = String(event.productModel || '').trim()
    const deviceName = event.deviceName || normalizedSn

    if (action === 'check') {
      return await handleCheck(db, _, normalizedSn, productModel)
    }

    if (action === 'register' || action === 'update_model') {
      return await handleRegister(db, _, normalizedSn, productModel, deviceName, adminOpenid)
    }

    return { success: false, msg: '未知操作' }
  } catch (err) {
    if (err.message === 'FORBIDDEN' || err.message === 'UNAUTHORIZED') {
      return { success: false, msg: '无管理员权限' }
    }
    console.error('[adminRegisterSn]', err)
    return { success: false, msg: err.message || '操作失败' }
  }
}
