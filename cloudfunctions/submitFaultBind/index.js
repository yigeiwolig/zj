const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function softWecomAdminTodo(kind, oneLine) {
  try {
    await cloud.callFunction({
      name: 'wecomNotify',
      data: { action: 'notifyAdminTodo', kind, oneLine: oneLine || '' }
    })
  } catch (e) {
    console.warn('[submitFaultBind] wecomAdminTodo failed', e)
  }
}

async function isAdmin(db, openid) {
  if (!openid) return false
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return true
  const bySystem = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  return bySystem.data.length > 0
}

function isPendingApplyStatus(status) {
  const st = String(status == null ? '' : status).trim().toUpperCase()
  return !st || st === 'PENDING' || st === '0'
}

/** 售后工单是否仍未完结（完结/管理员删除后才允许再次申报） */
function isRepairOpen(repair) {
  if (!repair) return false
  if (repair.deletedByAdmin || repair.isDeleted) return false
  if (repair.warrantyDeducted || repair.isWarrantyDeducted) return false
  const st = String(repair.status || '').trim().toUpperCase()
  if (['COMPLETED', 'RETURN_RECEIVED', 'REPAIR_COMPLETED_SENT', 'TUTORIAL', 'DELETED', 'CANCELLED'].includes(st)) {
    return false
  }
  // 仅备件寄出、无需寄回 → 视为已处理完
  if (st === 'SHIPPED' && !repair.needReturn) return false
  if (st === 'SHIPPED' && repair.needReturn && repair.returnCompleted) return false
  return true
}

async function findByOpenidOrSys(db, collection, openid, extraWhere = {}) {
  const _ = db.command
  const orConds = [
    { ...extraWhere, openid },
    { ...extraWhere, _openid: openid }
  ]
  // 维修门禁需扫到更多历史单，避免双提交残留的打开单不在前 20 条
  const limit = collection === 'shouhou_repair' ? 100 : 20
  return db.collection(collection).where(_.or(orConds)).limit(limit).get()
}

/**
 * 统一门禁：有设备 / 无设备核验、维修申报共用
 * - 有未完结售后工单 → 禁止再次申请
 * - 有审核中的绑定/核验申请 → 禁止重复提交
 * - 有待录入 SN 档案 → 禁止再走核验
 * - 无设备核验：普通用户终身 1 次；管理员最多 100 次
 */
async function checkEligibility(db, openid, opts = {}) {
  const forFault = opts.forFault === true
  const forRepair = opts.forRepair === true
  const _ = db.command

  // 1) 未完结售后工单
  const repairRes = await findByOpenidOrSys(db, 'shouhou_repair', openid)
  const openRepair = (repairRes.data || []).find(isRepairOpen)
  if (openRepair) {
    return {
      ok: false,
      msg: '您有未完结的售后工单，处理完成前无法再次提交申请。'
    }
  }

  if (forRepair) {
    return { ok: true }
  }

  // 2) 审核中的绑定/核验申请（有设备 new/used、无设备 fault 都算）
  const applyRes = await db.collection('my_read').where(_.or([
    { openid },
    { _openid: openid }
  ])).limit(50).get()
  const pendingApply = (applyRes.data || []).find((row) => isPendingApplyStatus(row && row.status))
  if (pendingApply) {
    const bt = String((pendingApply && pendingApply.bindType) || '')
    if (bt === 'fault') {
      return { ok: false, msg: '您已有一条故障核验申请正在审核中，请耐心等待，勿重复提交。' }
    }
    return { ok: false, msg: '您已有一条设备绑定申请正在审核中，请耐心等待，勿重复提交。' }
  }

  // 3) 已建成、待录入 SN 的档案
  const pendingDevice = await db.collection('sn').where({
    openid,
    isActive: true,
    snPending: true
  }).limit(1).get()
  if (pendingDevice.data.length > 0) {
    return {
      ok: false,
      msg: '您已有序列号待录入的设备档案，请等待售后处理完成，勿重复申请。'
    }
  }

  // 4) 无设备核验：普通用户终身 1 次；管理员最多 100 次
  if (forFault) {
    const faultCountRes = await db.collection('my_read').where(_.and([
      _.or([{ openid }, { _openid: openid }]),
      { bindType: 'fault' }
    ])).count()
    const faultCount = (faultCountRes && faultCountRes.total) || 0
    if (faultCount > 0) {
      const admin = await isAdmin(db, openid)
      const limit = admin ? 100 : 1
      if (faultCount >= limit) {
        return {
          ok: false,
          msg: admin
            ? '管理员无设备核验最多可申请100次。'
            : '无设备核验每位用户仅可申请一次。'
        }
      }
    }
  }

  return { ok: true }
}

exports.main = async (event) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action || 'submit'

  if (!openid) {
    return { success: false, msg: '未登录，请重试' }
  }

  try {
    // 维修申报前仅查未完结工单
    if (action === 'checkRepair') {
      const eligibility = await checkEligibility(db, openid, { forRepair: true })
      if (!eligibility.ok) {
        return { success: false, blocked: true, msg: eligibility.msg }
      }
      return { success: true, blocked: false }
    }

    // 有设备绑定审核：校验 / 提交
    if (action === 'checkDevice' || action === 'submitDevice') {
      const eligibility = await checkEligibility(db, openid, { forFault: false })
      if (!eligibility.ok) {
        return { success: false, blocked: true, msg: eligibility.msg }
      }
      if (action === 'checkDevice') {
        return { success: true, blocked: false }
      }

      const sn = String(event.sn || '').trim().toUpperCase()
      const productModel = String(event.productModel || '').trim()
      const buyDate = String(event.buyDate || '').trim()
      const bindType = String(event.bindType || 'new').trim() || 'new'
      const imgReceipt = String(event.imgReceipt || '').trim()
      const imgChat = String(event.imgChat || '').trim()
      const fullDeviceName = String(event.fullDeviceName || sn).trim()

      if (!sn) return { success: false, msg: '请先连接设备' }
      if (!productModel) return { success: false, msg: '请选择型号' }
      if (!imgReceipt) return { success: false, msg: '请上传购买截图' }
      if (bindType === 'used' && !imgChat) return { success: false, msg: '请上传聊天记录' }
      if (!buyDate) return { success: false, msg: '请选择购买日期' }

      await db.collection('my_read').add({
        data: {
          openid,
          sn,
          fullDeviceName,
          productModel,
          buyDate,
          bindType,
          imgReceipt,
          imgChat,
          status: 'PENDING',
          createTime: db.serverDate()
        }
      })
      await softWecomAdminTodo('bind_audit', `${productModel} / ${sn}`)
      return { success: true, msg: '提交成功' }
    }

    // 无设备核验：校验 / 提交
    const eligibility = await checkEligibility(db, openid, { forFault: true })
    if (!eligibility.ok) {
      return { success: false, blocked: true, msg: eligibility.msg }
    }

    if (action === 'check') {
      return { success: true, blocked: false }
    }

    const productModel = String(event.productModel || '').trim()
    const buyDate = String(event.buyDate || '').trim()
    const imgReceipt = String(event.imgReceipt || '').trim()

    if (!productModel) return { success: false, msg: '请选择型号' }
    if (!imgReceipt) return { success: false, msg: '请上传购买截图' }
    if (!buyDate) return { success: false, msg: '请选择购买日期' }

    const submittedByAdmin = await isAdmin(db, openid)

    await db.collection('my_read').add({
      data: {
        openid,
        submittedByAdmin,
        sn: '',
        fullDeviceName: '',
        productModel,
        buyDate,
        bindType: 'fault',
        imgReceipt,
        imgChat: '',
        status: 'PENDING',
        createTime: db.serverDate()
      }
    })
    await softWecomAdminTodo('fault_audit', productModel)
    return { success: true, msg: '提交成功' }
  } catch (err) {
    console.error('[submitFaultBind]', err)
    return { success: false, msg: err.message || '提交失败' }
  }
}
