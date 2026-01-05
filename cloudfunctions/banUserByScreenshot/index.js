const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const OPENID = wxContext.OPENID;
  const banType = event.type || 'screenshot'; // 'screenshot' 或 'record'
  
  // 🔴 接收前端传递的地址信息、页面信息、设备信息
  const {
    banPage,           // 封禁页面：'case' | 'my' | 'products' | 'shop' | 'home' | 'paihang' | 'shouhou'
    province,          // 省份
    city,              // 城市
    district,          // 区/县
    address,           // 详细地址
    latitude,           // 纬度
    longitude,          // 经度
    deviceInfo,         // 设备信息
    phoneModel          // 手机型号
  } = event;

  console.log('[banUserByScreenshot] ========== 开始执行 ==========');
  console.log('[banUserByScreenshot] OPENID:', OPENID);
  console.log('[banUserByScreenshot] banType:', banType);
  console.log('[banUserByScreenshot] banPage:', banPage);
  console.log('[banUserByScreenshot] 地址信息:', { province, city, district, address });

  try {
    // 🔴 关键：查找最新的 login_logbutton 记录
    let buttonRecordId = null;
    let buttonRecordData = null;
    try {
      const buttonCheck = await db.collection('login_logbutton')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      if (buttonCheck.data && buttonCheck.data.length > 0) {
        buttonRecordId = buttonCheck.data[0]._id;
        buttonRecordData = buttonCheck.data[0];
      }
    } catch (err) {
      console.error('[banUserByScreenshot] 查询 login_logbutton 失败:', err);
    }

    const banReason = banType === 'screenshot' ? 'screenshot' : 'screen_record';
    
    // 🔴 构建地址和设备信息对象
    const locationInfo = {
      province: province || '',
      city: city || '',
      district: district || '',
      address: address || '',
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    };
    
    const deviceInfoObj = {
      device: deviceInfo || '',
      phoneModel: phoneModel || ''
    };

    if (buttonRecordId) {
      // 更新现有记录
      await db.collection('login_logbutton').doc(buttonRecordId).update({
        data: {
          isBanned: true,
          banReason: banReason,
          banPage: banPage || 'unknown', // 封禁页面
          ...locationInfo,               // 地址信息
          ...deviceInfoObj,              // 设备信息
          bypassLocationCheck: buttonRecordData && buttonRecordData.bypassLocationCheck === true,
          updateTime: db.serverDate()
        }
      });
      console.log('[banUserByScreenshot] ✅ 已更新 login_logbutton 封禁状态（截屏/录屏拦截）');
    } else {
      // 创建新记录
      const buttonAddResult = await db.collection('login_logbutton').add({
        data: {
          _openid: OPENID,
          isBanned: true,
          banReason: banReason,
          banPage: banPage || 'unknown', // 封禁页面
          ...locationInfo,               // 地址信息
          ...deviceInfoObj,              // 设备信息
          bypassLocationCheck: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      console.log('[banUserByScreenshot] ✅ 已创建 login_logbutton 封禁记录（截屏/录屏拦截）');
    }
    
    // 🔴 同时更新 login_logs，记录封禁信息
    try {
      const logRes = await db.collection('login_logs')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      
      const logUpdateData = {
        banReason: banReason,
        banPage: banPage || 'unknown',
        ...locationInfo,
        ...deviceInfoObj,
        updateTime: db.serverDate()
      };
      
      if (logRes.data && logRes.data.length > 0) {
        await db.collection('login_logs').doc(logRes.data[0]._id).update({
          data: logUpdateData
        });
      } else {
        await db.collection('login_logs').add({
          data: {
            _openid: OPENID,
            ...logUpdateData,
            createTime: db.serverDate()
          }
        });
      }
      console.log('[banUserByScreenshot] ✅ 已更新 login_logs 封禁信息');
    } catch (err) {
      console.error('[banUserByScreenshot] 更新 login_logs 失败:', err);
    }

    console.log('[banUserByScreenshot] ✅ 封禁状态已更新到 login_logbutton 集合');
    
    return { 
      success: true, 
      updated: true
    };
  } catch (err) {
    console.error('[banUserByScreenshot] ❌❌❌ 更新 login_logbutton 失败:', err);
    console.error('[banUserByScreenshot] 错误详情:', {
      message: err.message,
      code: err.errCode,
      stack: err.stack
    });
    return { 
      success: false, 
      errMsg: err.message || String(err),
      errCode: err.errCode || 'UNKNOWN_ERROR'
    };
  }
};
