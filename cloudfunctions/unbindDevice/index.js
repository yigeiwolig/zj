// cloudfunctions/unbindDevice/index.js

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { sn } = event // 前端传 SN 码过来

  try {
    // 1. 查设备，确保这设备是我的 (安全校验)
    const res = await db.collection('sn').where({
      sn: sn,
      openid: myOpenid
    }).get()

    if (res.data.length === 0) {
      return { success: false, msg: '无权操作或设备不存在' }
    }

    const device = res.data[0]

    // === 分支 A: 设备已激活 (正常的解绑) ===
    // 动作：保留数据，清空 openid，让下一个人可以连
    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          openid: '' // 设为空字符串，代表"自由身"
        }
      })
      return { success: true, msg: '解绑成功，设备已释放' }
    } 
    
    // === 分支 B: 设备未激活 (填错资料了/不想绑了) ===
    // 动作：物理删除，允许作为新机重新绑定
    else {
      await db.collection('sn').doc(device._id).remove()
      // 同时清理可能存在的审核记录 (可选)
      await db.collection('my_read').where({ sn: sn }).remove()
      return { success: true, msg: '绑定记录已清除' }
    }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}



const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { sn } = event // 前端传 SN 码过来

  try {
    // 1. 查设备，确保这设备是我的 (安全校验)
    const res = await db.collection('sn').where({
      sn: sn,
      openid: myOpenid
    }).get()

    if (res.data.length === 0) {
      return { success: false, msg: '无权操作或设备不存在' }
    }

    const device = res.data[0]

    // === 分支 A: 设备已激活 (正常的解绑) ===
    // 动作：保留数据，清空 openid，让下一个人可以连
    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          openid: '' // 设为空字符串，代表"自由身"
        }
      })
      return { success: true, msg: '解绑成功，设备已释放' }
    } 
    
    // === 分支 B: 设备未激活 (填错资料了/不想绑了) ===
    // 动作：物理删除，允许作为新机重新绑定
    else {
      await db.collection('sn').doc(device._id).remove()
      // 同时清理可能存在的审核记录 (可选)
      await db.collection('my_read').where({ sn: sn }).remove()
      return { success: true, msg: '绑定记录已清除' }
    }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}

// cloudfunctions/unbindDevice/index.js

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { sn } = event // 前端传 SN 码过来

  try {
    // 1. 查设备，确保这设备是我的 (安全校验)
    const res = await db.collection('sn').where({
      sn: sn,
      openid: myOpenid
    }).get()

    if (res.data.length === 0) {
      return { success: false, msg: '无权操作或设备不存在' }
    }

    const device = res.data[0]

    // === 分支 A: 设备已激活 (正常的解绑) ===
    // 动作：保留数据，清空 openid，让下一个人可以连
    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          openid: '' // 设为空字符串，代表"自由身"
        }
      })
      return { success: true, msg: '解绑成功，设备已释放' }
    } 
    
    // === 分支 B: 设备未激活 (填错资料了/不想绑了) ===
    // 动作：物理删除，允许作为新机重新绑定
    else {
      await db.collection('sn').doc(device._id).remove()
      // 同时清理可能存在的审核记录 (可选)
      await db.collection('my_read').where({ sn: sn }).remove()
      return { success: true, msg: '绑定记录已清除' }
    }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}



const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { sn } = event // 前端传 SN 码过来

  try {
    // 1. 查设备，确保这设备是我的 (安全校验)
    const res = await db.collection('sn').where({
      sn: sn,
      openid: myOpenid
    }).get()

    if (res.data.length === 0) {
      return { success: false, msg: '无权操作或设备不存在' }
    }

    const device = res.data[0]

    // === 分支 A: 设备已激活 (正常的解绑) ===
    // 动作：保留数据，清空 openid，让下一个人可以连
    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          openid: '' // 设为空字符串，代表"自由身"
        }
      })
      return { success: true, msg: '解绑成功，设备已释放' }
    } 
    
    // === 分支 B: 设备未激活 (填错资料了/不想绑了) ===
    // 动作：物理删除，允许作为新机重新绑定
    else {
      await db.collection('sn').doc(device._id).remove()
      // 同时清理可能存在的审核记录 (可选)
      await db.collection('my_read').where({ sn: sn }).remove()
      return { success: true, msg: '绑定记录已清除' }
    }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}

































































