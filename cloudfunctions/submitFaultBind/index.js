const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function checkEligibility(db, openid) {
  const pendingApply = await db.collection('my_read').where({
    _openid: openid,
    bindType: 'fault',
    status: 'PENDING'
  }).limit(1).get()

  if (pendingApply.data.length > 0) {
    return { ok: false, msg: '您已有一条故障核验申请正在审核中，请耐心等待。' }
  }

  const pendingDevice = await db.collection('sn').where({
    openid,
    isActive: true,
    snPending: true
  }).limit(1).get()

  if (pendingDevice.data.length > 0) {
    return { ok: false, msg: '您已有一个序列号待录入的设备，无需重复申请。' }
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
    const eligibility = await checkEligibility(db, openid)
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

    await db.collection('my_read').add({
      data: {
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

    return { success: true, msg: '提交成功' }
  } catch (err) {
    console.error('[submitFaultBind]', err)
    return { success: false, msg: err.message || '提交失败' }
  }
}
