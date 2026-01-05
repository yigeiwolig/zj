const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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

    console.log('[banUserByLocation] ========== 开始执行 ==========');
    console.log('[banUserByLocation] OPENID:', OPENID);
    // #region agent log
    logToServer('banUserByLocation/index.js:10', '云函数开始执行', { OPENID }, 'H6');
    // #endregion

  try {
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

    if (buttonRecordId) {
      if (buttonRecordData && buttonRecordData.bypassLocationCheck === true) {
        console.log('[banUserByLocation] ⚠️ 用户拥有免死金牌，跳过地址封禁写入')
        logToServer('banUserByLocation/index.js:95', '跳过封禁（免死金牌）', { recordId: buttonRecordId }, 'H6')
      } else {
        await db.collection('login_logbutton').doc(buttonRecordId).update({
          data: {
            isBanned: true,
            banReason: 'location_blocked',
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
          bypassLocationCheck: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      console.log('[banUserByLocation] ✅ 已创建 login_logbutton 封禁记录（地址拦截）')
      logToServer('banUserByLocation/index.js:108', '已创建 login_logbutton', { recordId: buttonAddResult._id }, 'H6')
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



