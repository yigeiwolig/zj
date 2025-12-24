// cloudfunctions/bindDevice/index.js

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { sn, deviceName } = event

  try {
    // 1. 查询设备
    const res = await db.collection('sn').where({ sn: sn }).get()

    // A. 全新设备 -> 需审核
    if (res.data.length === 0) {
      await db.collection('sn').add({
        data: {
          sn: sn,
          name: deviceName,
          openid: myOpenid,
          isActive: false,
          activations: 0, // 初始为0，审核通过变1
          createTime: db.serverDate()
        }
      })
      return { success: true, status: 'NEED_AUDIT', msg: '新设备，请提交审核' }
    }

    const device = res.data[0]

    // B. 是我自己的设备 (防抖，防止重复点)
    if (device.openid === myOpenid) {
      if (device.isActive) {
        return { success: true, status: 'AUTO_APPROVED', msg: '设备已连接' }
      } else {
        return { success: true, status: 'NEED_AUDIT', msg: '审核未通过，请继续' }
      }
    }

    // C. 别人的设备 (拒绝)
    if (device.openid && device.openid !== '') {
      return { success: false, status: 'LOCKED', msg: '设备已被绑定，请联系原主解绑' }
    }

    // D. 无主设备 (openid 为空，且已激活)
    if (device.isActive) {
      await db.collection('sn').doc(device._id).update({
        data: {
          openid: myOpenid,      // 归我了
          bindCount: _.inc(1),   // 绑定记录+1
          activations: _.inc(1), // 激活次数+1 (易主/重连算一次)
          lastBindTime: db.serverDate()
        }
      })
      
      // 【修改】文案统一改为"绑定成功"，不提"二手"
      return { success: true, status: 'AUTO_APPROVED', msg: '绑定成功' }
    } 
    
    // E. 未激活的无主设备
    else {
      await db.collection('sn').doc(device._id).update({ data: { openid: myOpenid } })
      return { success: true, status: 'NEED_AUDIT', msg: '请提交审核' }
    }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}


    else {
      await db.collection('sn').doc(device._id).update({ data: { openid: myOpenid } })
      return { success: true, status: 'NEED_AUDIT', msg: '请提交审核' }
    }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}

    else {
      await db.collection('sn').doc(device._id).update({ data: { openid: myOpenid } })
      return { success: true, status: 'NEED_AUDIT', msg: '请提交审核' }
    }

  } catch (err) {
    return { success: false, msg: err.errMsg }
  }
}
