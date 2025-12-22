const cloud = require('wx-server-sdk')

// 使用当前环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { totalPrice, goods, addressData } = event
  
  // 生成商户订单号 (MT + 时间戳 + 随机数)
  const outTradeNo = `MT${Date.now()}${Math.floor(Math.random() * 1000)}`
  
  try {
    const res = await cloud.cloudPay.unifiedOrder({
      body: 'MT摩改社-车辆定制改装与维修服务费',
      outTradeNo: outTradeNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: '1103782674',
      totalFee: Math.round(totalPrice * 100),
      envId: 'cloudbase-4gn1heip7c38ec6c',
      functionName: 'payCallback',
    })

    // 【新增检测】如果统一下单失败，打印出来并返回错误
    if (res.returnCode === 'FAIL') {
      console.error('微信支付下单失败:', res.returnMsg);
      return { error: true, msg: res.returnMsg };
    }

    const db = cloud.database()
    // 写入数据库，状态设为 UNPAID (待支付)
    // 支付成功后，由 payCallback 云函数自动改为 PAID
    await db.collection('shop_orders').add({
      data: {
        _openid: wxContext.OPENID,
        orderId: outTradeNo,
        goodsList: goods,
        totalFee: totalPrice,
        address: addressData,
        status: 'UNPAID', 
        createTime: db.serverDate()
      }
    })

    return res.payment // 确保返回的是支付参数
  } catch (err) {
    console.error('云函数运行崩溃:', err)
    return { error: true, msg: '系统繁忙' }
  }
}

