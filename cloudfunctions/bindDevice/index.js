const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  
  // 前端传来的 SN 码 (例如从蓝牙名解析出来的)
  const { sn, deviceName } = event

  try {
    // 1. 先查询这个 SN 是否存在于数据库
    const res = await db.collection('sn').where({
      sn: sn
    }).get()

    // --- 情况 A: 数据库里完全没这个设备 (第一次出现) ---
    if (res.data.length === 0) {
      // 新增记录，直接绑定给当前用户
      await db.collection('sn').add({
        data: {
          sn: sn,
          name: deviceName, // 蓝牙原始名称
          openid: myOpenid, // 绑定当前用户
          bindCount: 1,     // 绑定次数初始化
          bindTime: db.serverDate(),
          createTime: db.serverDate()
        }
      })
      return { success: true, msg: '新设备绑定成功' }
    }

    // --- 情况 B: 设备已存在，检查绑定状态 ---
    const device = res.data[0]

    // B1: 设备当前绑定的就是我自己 -> 成功 (视为重新绑定或刷新)
    if (device.openid === myOpenid) {
      return { success: true, msg: '设备已在您名下' }
    }

    // B2: 设备当前绑定了别人 (openid 不为空，且不是我) -> 失败
    if (device.openid && device.openid !== '') {
      return { success: false, msg: '该设备已被其他用户绑定，需原主解绑后方可操作。' }
    }

    // B3: 设备当前是"自由身" (openid 为空，说明前主人解绑了) -> 成功 (抢占)
    await db.collection('sn').doc(device._id).update({
      data: {
        openid: myOpenid, // 写入我的ID
        bindCount: _.inc(1), // 绑定次数 +1
        bindTime: db.serverDate()
      }
    })
    return { success: true, msg: '设备绑定成功' }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}

