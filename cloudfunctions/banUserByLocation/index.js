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
    // 🔴 查找最新的 login_logs 记录
    // 先尝试按 updateTime 降序查询，如果失败则查询所有记录后排序
    let logRes;
    try {
      logRes = await db.collection('login_logs')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      console.log('[banUserByLocation] 方法1查询成功，找到记录数:', logRes.data ? logRes.data.length : 0);
    } catch (err) {
      console.warn('[banUserByLocation] 方法1查询失败（可能 updateTime 字段不存在或未建立索引），尝试方法2:', err.message || err);
      // 如果 orderBy 失败，查询所有记录，然后在代码中排序
      const allRes = await db.collection('login_logs')
        .where({ _openid: OPENID })
        .get();
      console.log('[banUserByLocation] 方法2查询成功，找到记录数:', allRes.data ? allRes.data.length : 0);
      
      if (allRes.data && allRes.data.length > 0) {
        // 按时间排序（优先 updateTime，其次 createTime）
        const sorted = allRes.data.sort((a, b) => {
          const getTime = (time) => {
            if (!time) return 0;
            if (time instanceof Date) return time.getTime();
            if (typeof time === 'number') return time;
            if (typeof time === 'string') {
              const d = new Date(time);
              return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            return 0;
          };
          const aTime = getTime(a.updateTime) || getTime(a.createTime) || 0;
          const bTime = getTime(b.updateTime) || getTime(b.createTime) || 0;
          return bTime - aTime; // 降序
        });
        logRes = { data: [sorted[0]] };
        console.log('[banUserByLocation] 方法2排序后，使用最新记录:', sorted[0]._id);
      } else {
        logRes = { data: [] };
      }
    }

    console.log('[banUserByLocation] 最终查询结果，找到记录数:', logRes.data ? logRes.data.length : 0);

    // 🔴 关键：在 login_logbutton 中设置封禁状态（新的封禁控制方式）
    try {
      const buttonCheck = await db.collection('login_logbutton')
        .where({ _openid: OPENID })
        .get()
      
      if (buttonCheck.data && buttonCheck.data.length > 0) {
        // 如果已存在记录，更新它
        const buttonUpdateResult = await db.collection('login_logbutton').doc(buttonCheck.data[0]._id).update({
          data: {
            isBanned: true,
            banReason: 'location_blocked',
            bypassLocationCheck: buttonCheck.data[0].bypassLocationCheck !== undefined ? buttonCheck.data[0].bypassLocationCheck : false, // 保留现有值，如果不存在则默认为 false
            updateTime: db.serverDate()
          }
        })
        console.log('[banUserByLocation] ✅ 已更新 login_logbutton 封禁状态（地址拦截）')
        // #region agent log
        logToServer('banUserByLocation/index.js:95', '已更新 login_logbutton', { recordId: buttonCheck.data[0]._id, updated: buttonUpdateResult.stats?.updated || 0 }, 'H6');
        // #endregion
      } else {
        // 如果不存在，创建新记录
        const buttonAddResult = await db.collection('login_logbutton').add({
          data: {
            _openid: OPENID,
            isBanned: true,
            banReason: 'location_blocked',
            bypassLocationCheck: false, // 🔴 自动添加免死金牌字段，默认为 false
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
        console.log('[banUserByLocation] ✅ 已创建 login_logbutton 封禁记录（地址拦截）')
        // #region agent log
        logToServer('banUserByLocation/index.js:108', '已创建 login_logbutton', { recordId: buttonAddResult._id }, 'H6');
        // #endregion
      }
    } catch (e) {
      console.error('[banUserByLocation] ❌ 更新 login_logbutton 失败:', e);
      // #region agent log
      logToServer('banUserByLocation/index.js:113', '更新 login_logbutton 失败', { error: e.message || String(e) }, 'H6');
      // #endregion
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



