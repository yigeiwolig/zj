// cloudfunctions/checkUnlockStatus/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    // 🔴 统一封禁逻辑：只检查 login_logs
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
      
      // 🔴 关键：无论是否有 nickname，只要 AUTO 开启，就立即更新所有 isBanned = false
      let loginLogsUpdated = false
      try {
        // 更新 login_logs：解除封禁
        const updateResult = await db.collection('login_logs').doc(record._id).update({
          data: {
            isBanned: false,
            failCount: 0,
            auto: true,
            success: true,
            updateTime: db.serverDate()
          }
        })
        loginLogsUpdated = (updateResult.stats?.updated || 0) > 0
        console.log('[checkUnlockStatus] ✅ AUTO 模式：已更新 login_logs.isBanned = false')
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

      // 🔴 关键：同步更新 blocked_logs 中的封禁记录（如果存在）
      try {
        const blockedLogsResult = await db.collection('blocked_logs')
          .where({ _openid: OPENID })
          .update({
            data: {
              isBanned: false,
              updateTime: db.serverDate()
            }
          })
        console.log('[checkUnlockStatus] ✅ AUTO 模式：已更新 blocked_logs.isBanned = false, 更新结果:', blockedLogsResult.stats?.updated || 0)
      } catch (e) {
        // 集合不存在或没有记录，不影响主流程
        if (e.errCode === 'DATABASE_COLLECTION_NOT_EXIST' || e.errCode === -502005 || e.errCode === -1) {
          console.log('[checkUnlockStatus] ⚠️ blocked_logs 集合不存在或没有记录，跳过')
        } else {
          console.error('[checkUnlockStatus] ❌ 更新 blocked_logs 失败:', e.message || e, '错误码:', e.errCode)
        }
      }

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

      // 🔴 关键：AUTO 模式开启时，直接取消封禁并放行
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
          // 如果 valid_users 中存在该昵称，则放行
          // 更新 login_logs：解除封禁
          try {
            await db.collection('login_logs').doc(record._id).update({
              data: {
                isBanned: false,
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

          // 🔴 关键：同步更新 blocked_logs 中的封禁记录（如果存在）
          try {
            await db.collection('blocked_logs')
              .where({ _openid: OPENID })
              .update({
                data: {
                  isBanned: false,
                  updateTime: db.serverDate()
                }
              })
          } catch (e) {
            console.error('[checkUnlockStatus] update blocked_logs error:', e)
          }

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
    
    // 🔴 核心：检查 login_logs 中的 isBanned 状态
    if (record.isBanned === true) {
      // 如果被封禁，直接让前端等待，除非管理员手动解封或开启 AUTO
      return { action: 'WAIT', msg: '全局封禁中' };
    }

    // --- 场景 B: login_logs 记录中的 auto 字段为 true（之前自动录入产生的记录） ---
    if (record.auto === true && nickname) {
      // 搬运到 valid_users（如果还没有）
      try {
      const validCheck = await db.collection('valid_users').where({ nickname: nickname }).get()
      if (validCheck.data.length === 0) {
        await db.collection('valid_users').add({
          data: {
            nickname: nickname,
            _openid: OPENID,
            createTime: db.serverDate(),
            updateTime: db.serverDate(),
            desc: '管理员放行'
          }
        })
      }
      } catch (e) {
        console.error('[checkUnlockStatus] add valid_users error:', e)
      }

      return { action: 'PASS', nickname: nickname }
    }

    // --- 场景 C: 管理员开启【允许重试】 ---
    if (record.allowRetry === true) {
      await db.collection('login_logs').doc(record._id).update({
        data: { isBanned: false, failCount: 0, allowRetry: false, updateTime: db.serverDate() }
      })
      return { action: 'RETRY' }
    }

    // --- 场景 D: 普通解封检测 ---
    // 如果 login_logs 里显示没封号 (isBanned: false)，且尝试次数未超限
    if (record.isBanned === false && (record.failCount || 0) < 3) {
      return { action: 'RETRY' }
    }

    return { action: 'WAIT' }

  } catch (err) {
    console.error(err)
    return { action: 'WAIT', error: err }
  }
}
