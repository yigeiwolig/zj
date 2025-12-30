// cloudfunctions/checkUnlockStatus/index.js
const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  try {
    // ==========================================================
    // 🔴 优先检查：全局 AUTO 开关（app_config.nickname_settings.auto）
    // ==========================================================
    let globalAutoMode = false
    try {
      const cfgDoc = await db.collection('app_config').doc('nickname_settings').get()
      console.log('[checkUnlockStatus] 📋 读取配置文档:', cfgDoc ? JSON.stringify(cfgDoc.data) : 'null')
      if (cfgDoc && cfgDoc.data && cfgDoc.data.auto === true) {
        globalAutoMode = true
        console.log('[checkUnlockStatus] ✅ AUTO 模式已开启！')
      } else {
        console.log('[checkUnlockStatus] ❌ AUTO 模式未开启，auto =', cfgDoc?.data?.auto)
      }
    } catch (e) {
      // 配置不存在或查询失败，视为未开启
      console.error('[checkUnlockStatus] ⚠️ 读取配置失败:', e.message || e)
    }

    // ==========================================================
    // 🔴 统一封禁逻辑：优先检查 login_logbutton 集合
    // ==========================================================
    let buttonRecord = null
    try {
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
      if (buttonRes.data && buttonRes.data.length > 0) {
        buttonRecord = buttonRes.data[0]
        console.log('[checkUnlockStatus] 找到 login_logbutton 记录:', {
          isBanned: buttonRecord.isBanned,
          banReason: buttonRecord.banReason
        })
      }
    } catch (e) {
      console.warn('[checkUnlockStatus] 查询 login_logbutton 失败:', e.message || e)
    }

    // 🔴 核心：优先检查 login_logbutton 的封禁状态
    if (buttonRecord && buttonRecord.isBanned === true) {
      console.log('[checkUnlockStatus] 🚫 login_logbutton 显示用户被封禁，原因:', buttonRecord.banReason || '未知')
      return { action: 'WAIT', msg: `封禁中：${buttonRecord.banReason === 'nickname_verify_fail' ? '昵称验证失败' : buttonRecord.banReason === 'location_blocked' ? '地址拦截' : '未知原因'}` }
    }

    // ==========================================================
    // 🔴 检查 login_logs（用于获取昵称等信息）
    // ==========================================================
    const logRes = await db.collection('login_logs')
      .where({ _openid: OPENID })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get()

    // 如果没有登录记录，说明还没开始验证，让他回去
    if (logRes.data.length === 0) {
      return { action: 'RETRY' }
    }

    const record = logRes.data[0]
    const nickname = record.nickname || ''

    // ==========================================================
    // 🔴 场景 A: 全局 AUTO 开关开启 => 最高优先级，立即解除所有封禁
    // ==========================================================
    if (globalAutoMode) {
      console.log('[checkUnlockStatus] 🚀 开始执行 AUTO 模式解封流程...')
      console.log('[checkUnlockStatus] 📋 当前记录状态:', JSON.stringify({
        recordId: record._id,
        nickname: nickname,
        isBanned: record.isBanned,
        failCount: record.failCount
      }))
      
      // 🔴 关键：AUTO 模式开启时，解除 login_logbutton 的封禁状态
      let buttonUpdated = false
      try {
        // 更新 login_logbutton：解除封禁
        if (buttonRecord && buttonRecord._id) {
          const buttonUpdateResult = await db.collection('login_logbutton').doc(buttonRecord._id).update({
            data: {
              isBanned: false,
              bypassLocationCheck: buttonRecord.bypassLocationCheck !== undefined ? buttonRecord.bypassLocationCheck : false, // 保留现有值，如果不存在则默认为 false
              updateTime: db.serverDate()
            }
          })
          buttonUpdated = (buttonUpdateResult.stats?.updated || 0) > 0
          console.log('[checkUnlockStatus] ✅ AUTO 模式：已更新 login_logbutton.isBanned = false')
        } else {
          // 如果不存在 login_logbutton 记录，创建一条解封记录
          await db.collection('login_logbutton').add({
            data: {
              _openid: OPENID,
              isBanned: false,
              banReason: 'auto_unbanned',
              bypassLocationCheck: false, // 🔴 自动添加免死金牌字段，默认为 false
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
          buttonUpdated = true
          console.log('[checkUnlockStatus] ✅ AUTO 模式：已创建 login_logbutton 解封记录')
        }
        
        // 更新 login_logs（不更新 isBanned，因为已由 login_logbutton 管理）
        const updateResult = await db.collection('login_logs').doc(record._id).update({
          data: {
            failCount: 0,
            auto: true,
            success: true,
            updateTime: db.serverDate()
          }
        })
        console.log('[checkUnlockStatus] ✅ AUTO 模式：已更新 login_logs（不更新 isBanned）')
        console.log('[checkUnlockStatus] 📊 更新详情:', JSON.stringify({
          updated: updateResult.stats?.updated || 0,
          recordId: record._id,
          openid: OPENID,
          success: loginLogsUpdated
        }))
      } catch (e) {
        console.error('[checkUnlockStatus] ❌ 更新 login_logs 失败:', e.message || e, '错误码:', e.errCode)
        console.error('[checkUnlockStatus] ❌ 错误详情:', JSON.stringify({
          errCode: e.errCode,
          errMsg: e.errMsg,
          recordId: record._id
        }))
        // 即使更新失败，也继续执行后续逻辑，确保返回 PASS
      }

      // 同步更新 user_list（如果存在）
      try {
        const userListResult = await db.collection('user_list')
          .where({ _openid: OPENID })
          .update({
            data: {
              isBanned: false,
              updateTime: db.serverDate()
            }
          })
        console.log('[checkUnlockStatus] ✅ AUTO 模式：已更新 user_list.isBanned = false, 更新结果:', userListResult.stats?.updated || 0)
      } catch (e) {
        // 集合不存在或没有记录，不影响主流程
        if (e.errCode === 'DATABASE_COLLECTION_NOT_EXIST' || e.errCode === -502005 || e.errCode === -1) {
          console.log('[checkUnlockStatus] ⚠️ user_list 集合不存在或没有记录，跳过')
        } else {
          console.error('[checkUnlockStatus] ❌ 更新 user_list 失败:', e.message || e, '错误码:', e.errCode)
        }
      }

      // 🔴 blocked_logs 仅作为历史记录，不再更新 isBanned（封禁控制已由 login_logbutton 管理）
      // 移除对 blocked_logs.isBanned 的更新

      // 🔴 关键：如果有 nickname，写入 valid_users（白名单）
      if (nickname) {
        try {
          const validCheck = await db.collection('valid_users').where({ nickname: nickname }).get()
          if (validCheck.data.length === 0) {
            await db.collection('valid_users').add({
              data: {
                nickname: nickname,
                _openid: OPENID,
                createTime: db.serverDate(),
                updateTime: db.serverDate(),
                desc: 'AUTO 模式自动放行'
              }
            })
            console.log('[checkUnlockStatus] ✅ AUTO 模式：已写入 valid_users（白名单）')
          } else {
            console.log('[checkUnlockStatus] ✅ AUTO 模式：valid_users 中已存在该昵称')
          }
        } catch (e) {
          if (e.errCode === 'DATABASE_COLLECTION_NOT_EXIST' || e.errCode === -502005 || e.errCode === -1) {
            console.log('[checkUnlockStatus] ⚠️ valid_users 集合不存在，跳过写入（不影响放行）')
          } else {
            console.error('[checkUnlockStatus] ❌ 写入 valid_users 失败:', e.message || e)
          }
        }
      }

      // 🔴 关键：AUTO 模式开启时，解除 login_logbutton 的封禁状态
      // 如果 login_logbutton 中 isBanned = true，先解除封禁
      if (buttonRecord && buttonRecord._id && buttonRecord.isBanned === true) {
        try {
          await db.collection('login_logbutton').doc(buttonRecord._id).update({
            data: { 
              isBanned: false, 
              bypassLocationCheck: buttonRecord.bypassLocationCheck !== undefined ? buttonRecord.bypassLocationCheck : false, // 保留现有值，如果不存在则默认为 false
              updateTime: db.serverDate() 
            }
          })
          console.log('[checkUnlockStatus] ✅ AUTO 模式：已解除 login_logbutton 封禁状态')
        } catch (e) {
          console.error('[checkUnlockStatus] ❌ 解除 login_logbutton 封禁失败:', e)
        }
      } else if (!buttonRecord) {
        // 如果不存在 login_logbutton 记录，创建一条解封记录
        try {
          await db.collection('login_logbutton').add({
            data: {
              _openid: OPENID,
              isBanned: false,
              banReason: 'auto_unbanned',
              bypassLocationCheck: false, // 🔴 自动添加免死金牌字段，默认为 false
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
          console.log('[checkUnlockStatus] ✅ AUTO 模式：已创建 login_logbutton 解封记录')
        } catch (e) {
          console.error('[checkUnlockStatus] ❌ 创建 login_logbutton 解封记录失败:', e)
        }
      }
      
      // 🔴 关键：AUTO 模式开启时，直接放行（已解除封禁）
      console.log('[checkUnlockStatus] ✅ AUTO 模式：已取消所有封禁，直接放行')
      return { action: 'PASS', nickname: nickname || '' }
    }

    // ==========================================================
    // 🔴 场景 B: 检查白名单（valid_users）
    // ==========================================================
    if (nickname) {
      try {
        const validCheck = await db
          .collection('valid_users')
          .where({ nickname: nickname })
          .limit(1)
          .get()

        if (validCheck.data && validCheck.data.length > 0) {
          // 如果 valid_users 中存在该昵称，检查 login_logbutton 的封禁状态
          // 🔴 关键：即使白名单通过，也要检查 login_logbutton.isBanned
          // 如果 login_logbutton.isBanned = true，即使白名单通过也不放行
          if (buttonRecord && buttonRecord.isBanned === true) {
            console.log('[checkUnlockStatus] ⚠️ 用户在白名单中，但 login_logbutton.isBanned = true，仍被封禁')
            return { action: 'WAIT', msg: '封禁中', nickname: nickname }
          }
          
          // 如果 login_logbutton.isBanned = false 或不存在，则放行
          // 更新 login_logs（不更新 isBanned，因为已由 login_logbutton 管理）
          try {
            await db.collection('login_logs').doc(record._id).update({
              data: {
                failCount: 0,
                success: true,
                auto: true,
                updateTime: db.serverDate()
              }
            })
          } catch (e) {
            console.error('[checkUnlockStatus] update login_logs error:', e)
          }

          // 同步更新 user_list（如果存在）
          try {
            await db.collection('user_list')
              .where({ _openid: OPENID })
              .update({
                data: {
                  isBanned: false,
                  updateTime: db.serverDate()
                }
              })
          } catch (e) {
            console.error('[checkUnlockStatus] update user_list error:', e)
          }

          // 🔴 blocked_logs 仅作为历史记录，不再更新 isBanned（封禁控制已由 login_logbutton 管理）
          // 移除对 blocked_logs.isBanned 的更新

          return { action: 'PASS', nickname: nickname }
        }
      } catch (e) {
        // 集合不存在或查询失败，不影响主流程，继续后续检查
        if (e.errCode === 'DATABASE_COLLECTION_NOT_EXIST' || e.errCode === -502005 || e.errCode === -1) {
          console.log('[checkUnlockStatus] ⚠️ valid_users 集合不存在，跳过白名单检查')
        } else {
          console.error('[checkUnlockStatus] ❌ 查询 valid_users 失败:', e.message || e)
        }
      }
    }
    
    // 🔴 关键修复：先检查 auto 字段
    // --- 场景 B: login_logs 记录中的 auto 字段为 true（管理员手动设置） ---
    // #region agent log
    logToServer('checkUnlockStatus/index.js:268', '检查 auto 字段', { auto: record.auto, nickname: nickname }, 'H2');
    // #endregion
    if (record.auto === true && nickname) {
      // #region agent log
      logToServer('checkUnlockStatus/index.js:271', 'auto=true 分支执行', { auto: record.auto, nickname: nickname }, 'H1');
      // #endregion
      // 🔴 新需求：当 auto = true 时，只写入白名单，不解除封禁
      // 封禁状态由 login_logbutton 控制
      try {
        const validCheck = await db.collection('valid_users').where({ nickname: nickname }).get()
        // #region agent log
        logToServer('checkUnlockStatus/index.js:278', '检查 valid_users', { exists: validCheck.data.length > 0, nickname: nickname }, 'H3');
        // #endregion
        if (validCheck.data.length === 0) {
          const addResult = await db.collection('valid_users').add({
            data: {
              nickname: nickname,
              _openid: OPENID,
              createTime: db.serverDate(),
              updateTime: db.serverDate(),
              desc: '管理员放行（auto=true）'
            }
          })
          // #region agent log
          logToServer('checkUnlockStatus/index.js:291', '已添加 valid_users', { recordId: addResult._id, nickname: nickname }, 'H3');
          // #endregion
          console.log('[checkUnlockStatus] ✅ auto=true 时已写入白名单，但封禁状态由 login_logbutton 控制')
        } else {
          console.log('[checkUnlockStatus] ✅ auto=true 时，白名单中已存在该昵称')
        }
      } catch (e) {
        // #region agent log
        logToServer('checkUnlockStatus/index.js:297', '添加 valid_users 失败', { error: e.message || String(e) }, 'H3');
        // #endregion
        console.error('[checkUnlockStatus] add valid_users error:', e)
      }

      // 🔴 关键：auto = true 时，不解除封禁，封禁状态由 login_logbutton 控制
      // 如果 login_logbutton 中 isBanned = true，仍然返回 WAIT
      if (buttonRecord && buttonRecord.isBanned === true) {
        return { action: 'WAIT', msg: '已记录到白名单，但封禁状态未解除', nickname: nickname }
      }
      // 如果 login_logbutton 中 isBanned = false 或不存在，则放行
      return { action: 'PASS', nickname: nickname }
    }

    // --- 场景 C: 管理员开启【允许重试】 ---
    if (record.allowRetry === true) {
      // 🔴 同时解除 login_logbutton 的封禁状态
      if (buttonRecord && buttonRecord._id) {
        try {
          await db.collection('login_logbutton').doc(buttonRecord._id).update({
            data: { 
              isBanned: false, 
              bypassLocationCheck: buttonRecord.bypassLocationCheck !== undefined ? buttonRecord.bypassLocationCheck : false, // 保留现有值，如果不存在则默认为 false
              updateTime: db.serverDate() 
            }
          })
        } catch (e) {
          console.error('[checkUnlockStatus] 更新 login_logbutton 失败:', e)
        }
      }
      await db.collection('login_logs').doc(record._id).update({
        data: { failCount: 0, allowRetry: false, updateTime: db.serverDate() }
      })
      return { action: 'RETRY' }
    }

    // --- 场景 D: 普通解封检测 ---
    // 如果 login_logbutton 中没有封禁，且尝试次数未超限
    if ((!buttonRecord || buttonRecord.isBanned !== true) && (record.failCount || 0) < 3) {
      return { action: 'RETRY' }
    }

    return { action: 'WAIT' }

  } catch (err) {
    console.error(err)
    return { action: 'WAIT', error: err }
  }
}
