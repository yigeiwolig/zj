const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 微信支付成功后的回调
exports.main = async (event, context) => {
  const { outTradeNo, resultCode } = event
  const db = cloud.database()

  // 当微信通知支付成功时
  if (resultCode === 'SUCCESS') {
    try {
      await db.collection('shop_orders').where({
        orderId: outTradeNo
      }).update({
        data: {
          status: 'PAID', // 改为已支付
          payTime: db.serverDate()
        }
      })
      return { errcode: 0, errmsg: 'SUCCESS' }
    } catch (e) {
      return { errcode: 1, errmsg: 'FAIL' }
    }
  }

  // 必须按这个格式返回，否则微信会不停重试回调
  return { errcode: 0, errmsg: 'SUCCESS' }
}



