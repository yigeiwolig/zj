const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isGuanliyuan(openid) {
  if (!openid) return false;
  let r = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (r.data && r.data.length > 0) return true;
  r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  return !!(r.data && r.data.length > 0);
}

// 日志发送函数（Node.js 环境）
const logToServer = (location, message, data, hypothesisId) => {
  try {
    const payload = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    });
    const options = {
      hostname: '127.0.0.1',
      port: 7242,
      path: '/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, () => {});
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (e) {
    // 忽略日志发送错误
  }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const OPENID = wxContext.OPENID;

  // 🔴 接收前端传递的地址信息、设备信息
  const {
    province,          // 省份
    city,              // 城市
    district,          // 区/县
    address,           // 详细地址
    full_address,      // 完整地址
    latitude,          // 纬度
    longitude,          // 经度
    deviceInfo,        // 设备信息
    phoneModel         // 手机型号
  } = event;

    console.log('[banUserByLocation] ========== 开始执行 ==========');
    console.log('[banUserByLocation] OPENID:', OPENID);
    console.log('[banUserByLocation] 地址信息:', { province, city, district, address });
    // #region agent log
    logToServer('banUserByLocation/index.js:10', '云函数开始执行', { OPENID }, 'H6');
    // #endregion

  try {
    if (await isGuanliyuan(OPENID)) {
      console.log('[banUserByLocation] 管理员账号，跳过地址封禁写入');
      return { success: true, skippedByAdmin: true };
    }

    // 1. 查找 login_logs（仅用于日志打印）
    try {
      const logRes = await db.collection('login_logs')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
      console.log('[banUserByLocation] 查询 login_logs 结果:', logRes.data ? logRes.data.length : 0)
    } catch (err) {
      console.warn('[banUserByLocation] 查询 login_logs 失败:', err)
    }

    // 🔴 关键：查找最新的 login_logbutton 记录
    let buttonRecordId = null
    let buttonRecordData = null
    try {
      const buttonCheck = await db.collection('login_logbutton')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
      
      if (buttonCheck.data && buttonCheck.data.length > 0) {
        buttonRecordId = buttonCheck.data[0]._id
        buttonRecordData = buttonCheck.data[0]
      }
    } catch (err) {
      console.error('[banUserByLocation] 查询 login_logbutton 失败:', err)
    }
    
    // 🔴 构建地址和设备信息对象
    const locationInfo = {
      province: province || '',
      city: city || '',
      district: district || '',
      address: address || full_address || '',
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    };
    
    const deviceInfoObj = {
      device: deviceInfo || '',
      phoneModel: phoneModel || ''
    };

    // 🔴 关键修复：保留/写回昵称，避免后续 Auto 模式无法写入 valid_users
    // 优先级：event.nickname（如果未来前端传了）> login_logbutton.nickname > login_logs.nickname
    let preservedNickname = '';
    if (event && event.nickname) {
      preservedNickname = String(event.nickname).trim();
    }
    if (!preservedNickname && buttonRecordData && buttonRecordData.nickname) {
      preservedNickname = String(buttonRecordData.nickname).trim();
    }

    if (buttonRecordId) {
      if (buttonRecordData && buttonRecordData.bypassLocationCheck === true) {
        console.log('[banUserByLocation] ⚠️ 用户拥有免死金牌，跳过地址封禁写入')
        logToServer('banUserByLocation/index.js:95', '跳过封禁（免死金牌）', { recordId: buttonRecordId }, 'H6')
      } else {
        await db.collection('login_logbutton').doc(buttonRecordId).update({
          data: {
            isBanned: true,
            banReason: 'location_blocked',
            banPage: 'index', // 地址拦截发生在 index 页面
            ...(preservedNickname ? { nickname: preservedNickname } : (buttonRecordData && buttonRecordData.nickname ? { nickname: buttonRecordData.nickname } : {})),
            ...locationInfo,   // 地址信息
            ...deviceInfoObj,  // 设备信息
            bypassLocationCheck: buttonRecordData && buttonRecordData.bypassLocationCheck === true,
            updateTime: db.serverDate()
          }
        })
        console.log('[banUserByLocation] ✅ 已更新 login_logbutton 封禁状态（地址拦截）')
        logToServer('banUserByLocation/index.js:95', '已更新 login_logbutton', { recordId: buttonRecordId }, 'H6')
      }
      } else {
        const buttonAddResult = await db.collection('login_logbutton').add({
          data: {
            _openid: OPENID,
            isBanned: true,
            banReason: 'location_blocked',
          banPage: 'index', // 地址拦截发生在 index 页面
          ...(preservedNickname ? { nickname: preservedNickname } : {}),
          ...locationInfo,   // 地址信息
          ...deviceInfoObj,  // 设备信息
          bypassLocationCheck: false,
          qiangli: false, // 🔴 自动添加qiangli字段，默认false
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
        console.log('[banUserByLocation] ✅ 已创建 login_logbutton 封禁记录（地址拦截）')
      logToServer('banUserByLocation/index.js:108', '已创建 login_logbutton', { recordId: buttonAddResult._id }, 'H6')
    }
    
    // 🔴 同时更新 login_logs，记录封禁信息
    try {
      const logRes = await db.collection('login_logs')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      if (!preservedNickname && logRes.data && logRes.data.length > 0 && logRes.data[0].nickname) {
        preservedNickname = String(logRes.data[0].nickname).trim();
      }
      
      const logUpdateData = {
        ...(preservedNickname ? { nickname: preservedNickname } : {}),
        banReason: 'location_blocked',
        banPage: 'index',
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
      console.log('[banUserByLocation] ✅ 已更新 login_logs 封禁信息');
    } catch (err) {
      console.error('[banUserByLocation] 更新 login_logs 失败:', err);
    }

    // 🔴 封禁控制已完全由 login_logbutton 管理，不再更新 login_logs.isBanned
    console.log('[banUserByLocation] ✅ 封禁状态已更新到 login_logbutton 集合')
    
    return { 
      success: true, 
      updated: true
    };
  } catch (err) {
    console.error('[banUserByLocation] ❌❌❌ 更新 login_logbutton 失败:', err);
    console.error('[banUserByLocation] 错误详情:', {
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



