const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 写入 shouhouguoqi 集合的云函数
 * 在用户支付配件费用成功后调用
 * 
 * @param {string} repairId - 维修单ID
 * @param {Array} goodsList - 用户购买的配件列表
 * @param {Object} addressData - 用户地址信息 {name, phone, address}
 * @param {string} userNickname - 用户昵称
 * @param {string} _openid - 用户openid（从云函数上下文获取）
 */
exports.main = async (event, context) => {
  const { repairId, goodsList, addressData, userNickname } = event
  const _openid = cloud.getWXContext().OPENID

  console.log('[writeShouhouguoqi] 开始执行', {
    repairId,
    _openid,
    goodsListLength: goodsList?.length,
    hasAddressData: !!addressData
  })

  // 参数验证
  if (!repairId) {
    return {
      success: false,
      errMsg: '缺少 repairId 参数'
    }
  }

  if (!_openid) {
    return {
      success: false,
      errMsg: '无法获取用户 openid'
    }
  }

  try {
    // 1. 查询维修单信息
    const repairRes = await db.collection('shouhou_repair').doc(repairId).get()
    
    if (!repairRes.data) {
      return {
        success: false,
        errMsg: '未找到对应的维修单'
      }
    }

    const repairData = repairRes.data

    // 2. 更新维修单的 purchasePartsStatus 为 'completed'
    await db.collection('shouhou_repair').doc(repairId).update({
      data: {
        purchasePartsStatus: 'completed'
      }
    })

    console.log('[writeShouhouguoqi] 维修单配件购买状态已更新')

    // 3. 准备写入 shouhouguoqi 的数据
    const guoqiData = {
      _openid: _openid,
      userNickname: userNickname || '',
      // 用户的收货地址
      userAddress: {
        name: addressData?.name || '',
        phone: addressData?.phone || '',
        address: addressData?.address || ''
      },
      // 实际的地址（可能是从订单中获取的）
      actualAddress: {
        name: addressData?.name || '',
        phone: addressData?.phone || '',
        address: addressData?.address || ''
      },
      // 用户实际购买了些什么
      purchasedItems: goodsList || [],
      // 本来应该需要买什么
      requiredParts: repairData.purchasePartsList || [],
      // 是否已经购买
      hasPurchased: true,
      // 关联的维修单ID
      repairId: repairId,
      // 创建时间
      createTime: db.serverDate()
    }

    // 4. 写入 shouhouguoqi 集合
    const addRes = await db.collection('shouhouguoqi').add({
      data: guoqiData
    })

    console.log('[writeShouhouguoqi] 数据已写入 shouhouguoqi 集合', {
      _id: addRes._id
    })

    return {
      success: true,
      data: {
        _id: addRes._id,
        repairId: repairId
      }
    }

  } catch (err) {
    console.error('[writeShouhouguoqi] 执行失败:', err)
    return {
      success: false,
      errMsg: err.message || err.toString()
    }
  }
}
