const cloud = require('wx-server-sdk')

// 使用当前环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  // 增加 action 参数
  const { totalPrice, goods, addressData, shippingFee, shippingMethod, action } = event
  
  // 生成商户订单号 (MT + 时间戳 + 随机数)
  const outTradeNo = `MT${Date.now()}${Math.floor(Math.random() * 1000)}`
  const db = cloud.database()

  try {
    // === 情况1: 定制/存单 (只存数据库，不调支付接口) ===
    if (action === 'save_only') {
      await db.collection('shop_orders').add({
        data: {
          _openid: wxContext.OPENID,
          orderId: outTradeNo,
          goodsList: goods,
          totalFee: totalPrice, // 包含运费的总价
          address: addressData,
          shipping: { fee: shippingFee || 0, method: shippingMethod || 'zto' }, // 记录运费信息
          status: 'UNPAID', // 待支付
          isCustom: true,   // 标记为定制单
          createTime: db.serverDate()
        }
      })
      return { success: true, msg: '订单已提交，等待改价' }
    }

    // === 情况2: 正常立即支付 ===
    console.log('[createOrder] 准备调用 unifiedOrder，参数:', {
      totalPrice,
      totalFee: Math.round(totalPrice * 100),
      outTradeNo
    });
    
    // 构建支付参数（根据实际情况决定是否使用 subMchId）
    // 如果是普通商户模式，不传 subMchId
    // 如果是服务商模式，需要确保受理关系已建立
    const payParams = {
      body: 'MT摩改社-车辆定制改装与维修服务费',
      outTradeNo: outTradeNo,
      spbillCreateIp: '127.0.0.1',
      totalFee: Math.round(totalPrice * 100),
      envId: 'cloudbase-4gn1heip7c38ec6c',
      functionName: 'payCallback',
    };
    
    // 【可选】如果使用服务商模式，取消下面的注释并配置正确的 subMchId
    // 注意：使用服务商模式需要先在微信支付商户平台建立受理关系
    // payParams.subMchId = '1103782674';
    
    const res = await cloud.cloudPay.unifiedOrder(payParams)

    console.log('[createOrder] unifiedOrder 返回结果:', res);

    // 【新增检测】如果统一下单失败，打印出来并返回错误
    if (res.returnCode === 'FAIL') {
      console.error('[createOrder] 微信支付下单失败:', res.returnMsg);
      
      // 针对常见错误提供更友好的提示
      let errorMsg = res.returnMsg;
      if (res.returnMsg && res.returnMsg.includes('受理关系不存在')) {
        errorMsg = '支付配置未完成，请联系管理员配置支付参数';
      } else if (res.returnMsg && res.returnMsg.includes('商户号')) {
        errorMsg = '商户号配置错误，请联系管理员';
      }
      
      return { error: true, msg: errorMsg };
    }

    // 检查返回的 payment 对象
    if (!res.payment) {
      console.error('[createOrder] 支付参数缺失，返回结果:', res);
      return { error: true, msg: '支付参数获取失败' };
    }

    console.log('[createOrder] 支付参数:', res.payment);

    // 写入数据库，状态设为 UNPAID (待支付)
    // 支付成功后，由 payCallback 云函数自动改为 PAID
    await db.collection('shop_orders').add({
      data: {
        _openid: wxContext.OPENID,
        orderId: outTradeNo,
        goodsList: goods,
        totalFee: totalPrice,
        address: addressData,
        shipping: { fee: shippingFee || 0, method: shippingMethod || 'zto' },
        status: 'UNPAID', 
        createTime: db.serverDate()
      }
    })

    console.log('[createOrder] 订单已写入数据库，返回支付参数');
    return res.payment // 确保返回的是支付参数
  } catch (err) {
    console.error('云函数运行崩溃:', err)
    return { error: true, msg: '系统繁忙' }
  }
}

