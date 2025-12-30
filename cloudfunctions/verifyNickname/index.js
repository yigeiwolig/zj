const cloud = require('wx-server-sdk');

// 初始化云环境（使用当前小程序所选环境）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 昵称验证云函数（方案二：带白名单 + 错误计数 + 自动封号）
 *
 * 前端预期调用方式：
 * wx.cloud.callFunction({
 *   name: 'verifyNickname',
 *   data: { nickname }
 * })
 *
 * 返回约定：
 * - 成功通过：{ success: true,  isBlocked: false }
 * - 未通过但未到封号：{ success: false, isBlocked: false, type: 'invalid_nickname', failCount }
 * - 已被封号：{ success: false, isBlocked: true,  type: 'banned' }
 *
 * 注意：本函数内部捕获所有异常，**不抛出到外层**，这样前端不会出现“网络错误”，
 * 而是统一当作 { success: false } 处理，走你在页面里自定义的弹窗逻辑。
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const nickname = (event && event.nickname ? String(event.nickname) : '').trim();

  if (!nickname) {
    return {
      success: false,
      isBlocked: false,
      error: 'EMPTY_NICKNAME',
    };
  }

  try {
    // 1. 读取昵称验证配置，判断是否开启自动录入（auto）
    // 建议在 app_config 集合中创建一条文档：
    // { _id: 'nickname_settings', auto: true/false, createTime, updateTime }
    let autoMode = false;
    try {
      const cfgDoc = await db.collection('app_config').doc('nickname_settings').get();
      if (cfgDoc && cfgDoc.data && cfgDoc.data.auto === true) {
        autoMode = true;
      }
    } catch (e) {
      // 配置不存在或查询失败，视为未开启自动模式
      console.error('[verifyNickname] load nickname_settings config error:', e);
    }

    // 2. 读取该用户最近一条 login_logs 记录，用于获取上一次失败次数 / 封号状态
    let lastLog = null;
    try {
      const lastRes = await db
        .collection('login_logs')
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();

      if (lastRes && Array.isArray(lastRes.data) && lastRes.data.length > 0) {
        lastLog = lastRes.data[0];
      }
    } catch (e) {
      console.error('[verifyNickname] query login_logs error:', e);
      // 查询失败不影响后续逻辑，只是视为没有历史记录
    }

    let lastFailCount = 0;
    let alreadyBanned = false;

    // 🔴 检查 login_logbutton 中的封禁状态（新的封禁控制方式）
    try {
      const buttonCheck = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
      
      if (buttonCheck.data && buttonCheck.data.length > 0 && buttonCheck.data[0].isBanned === true) {
        alreadyBanned = true
        console.log('[verifyNickname] 用户已被封禁（login_logbutton），原因:', buttonCheck.data[0].banReason)
      }
    } catch (e) {
      console.warn('[verifyNickname] 查询 login_logbutton 失败:', e.message || e)
    }

    if (lastLog) {
      lastFailCount = Number(lastLog.failCount || 0) || 0;
    }

    // 如果之前已经被标记为封号，则直接返回封号状态
    if (alreadyBanned) {
      return {
        success: false,
        isBlocked: true,
        type: 'banned',
      };
    }

    // 2. 如果开启了自动录入模式：写入白名单(valid_users)并取消封禁放行
    if (autoMode) {
      try {
        // 🔴 关键：写入白名单（valid_users）
        const validCheck = await db
          .collection('valid_users')
          .where({ nickname })
          .limit(1)
          .get();

        if (!validCheck.data || validCheck.data.length === 0) {
          await db.collection('valid_users').add({
            data: {
              nickname,
              _openid: openid,
              desc: 'auto 模式自动录入',
              createTime: db.serverDate(),
              updateTime: db.serverDate(),
            },
          });
        }

        // 🔴 关键：更新 login_logs（同一 openid 只保留一条记录）
        if (lastLog && lastLog._id) {
          // 如果已存在记录，则更新而不是新增
          await db.collection('login_logs').doc(lastLog._id).update({
            data: {
              nickname,
              success: true,
              isBanned: false,
              failCount: 0,
              auto: true,
              updateTime: db.serverDate(),
            },
          });
      } else {
          // 如果不存在，才新增
          await db.collection('login_logs').add({
            data: {
              _openid: openid,
              nickname,
              success: true,
              isBanned: false,
              failCount: 0,
              auto: true,
              createTime: db.serverDate(),
              updateTime: db.serverDate(),
            },
                 });
               }

        // 把 user_list 中该用户的封禁状态解除（如果存在）
        try {
          await db
            .collection('user_list')
            .where({ _openid: openid })
            .update({
              data: {
                isBanned: false,
                updateTime: db.serverDate(),
              },
            });
        } catch (e) {
          console.error('[verifyNickname] autoMode update user_list unban error:', e);
        }

        // 🔴 blocked_logs 仅作为历史记录，不再更新 isBanned（封禁控制已由 login_logbutton 管理）
        // 移除对 blocked_logs.isBanned 的更新

        return {
          success: true,
          isBlocked: false,
          auto: true,
        };
      } catch (e) {
        console.error('[verifyNickname] autoMode process error:', e);
        // 自动模式流程失败时，不直接抛出，让后续白名单/计数逻辑继续兜底
      }
    }

    // 3. 检查昵称白名单（集合：valid_users）
    // 结构：{ nickname: 'xxx', _openid: 'xxx', desc: '备注', createTime, updateTime }
    let isWhitelisted = false;
    try {
      const validRes = await db
        .collection('valid_users')
        .where({ nickname })
        .limit(1)
        .get();

      if (validRes && Array.isArray(validRes.data) && validRes.data.length > 0) {
        // 如果 valid_users 中存在该昵称，视为有效白名单
        isWhitelisted = true;
      }
    } catch (e) {
      // 如果集合不存在或查询异常，不抛出，让逻辑继续执行，只是当作“没有命中白名单”
      if (e.errCode === 'DATABASE_COLLECTION_NOT_EXIST' || e.errCode === -502005 || e.errCode === -1) {
        console.log('[verifyNickname] ⚠️ valid_users 集合不存在，跳过白名单检查');
      } else {
        console.error('[verifyNickname] query valid_users error:', e);
        }
    }

    // 4. 命中白名单 => 通过验证，更新登录日志，并确保取消封号标记
    if (isWhitelisted) {
      try {
        // 🔴 关键：更新 login_logs（同一 openid 只保留一条记录）
        if (lastLog && lastLog._id) {
          await db.collection('login_logs').doc(lastLog._id).update({
            data: {
              nickname,
              success: true,
              isBanned: false,
              failCount: 0,
              auto: false, // 白名单通过，非自动模式
              updateTime: db.serverDate(),
            },
          });
        } else {
          await db.collection('login_logs').add({
            data: {
              _openid: openid,
              nickname,
              success: true,
              isBanned: false,
              failCount: 0,
              auto: false, // 白名单通过，非自动模式
              createTime: db.serverDate(),
              updateTime: db.serverDate(),
            },
          });
        }
      } catch (e) {
        console.error('[verifyNickname] update success login_logs error:', e);
      }

      // 尝试把 user_list 里该用户的 isBanned 解除（如果存在）
      try {
        await db
          .collection('user_list')
          .where({ _openid: openid })
          .update({
            data: {
              isBanned: false,
              updateTime: db.serverDate(),
            },
          });
      } catch (e) {
        console.error('[verifyNickname] update user_list unban error:', e);
      }

      return {
        success: true,
        isBlocked: false,
      };
    }

    // 5. 未命中白名单 => 视为一次失败尝试，叠加失败次数，达到 3 次即封号
    const newFailCount = lastFailCount + 1;
    const willBan = newFailCount >= 3;

    try {
      // 🔴 关键：更新 login_logs（同一 openid 只保留一条记录）
      // 注意：不再更新 isBanned 字段，封禁控制由 login_logbutton 管理
      if (lastLog && lastLog._id) {
        await db.collection('login_logs').doc(lastLog._id).update({
          data: {
            nickname,
            success: false,
            failCount: newFailCount,
            auto: false, // 失败记录，非自动模式
            updateTime: db.serverDate(),
          },
        });
          } else {
        await db.collection('login_logs').add({
          data: {
            _openid: openid,
            nickname,
            success: false,
            failCount: newFailCount,
            auto: false, // 失败记录，非自动模式
            createTime: db.serverDate(),
            updateTime: db.serverDate(),
          },
        });
      }
    } catch (e) {
      console.error('[verifyNickname] update failed login_logs error:', e);
          }

    // 如果达到封号阈值，写入 login_logbutton 集合（新的封禁控制）
    if (willBan) {
      try {
        // 🔴 关键：在 login_logbutton 中设置封禁状态
        const buttonCheck = await db.collection('login_logbutton')
          .where({ _openid: openid })
          .get()
        
        if (buttonCheck.data && buttonCheck.data.length > 0) {
          // 如果已存在记录，更新它
          await db.collection('login_logbutton').doc(buttonCheck.data[0]._id).update({
            data: {
              isBanned: true,
              banReason: 'nickname_verify_fail',
              nickname: nickname,
              failCount: newFailCount,
              bypassLocationCheck: buttonCheck.data[0].bypassLocationCheck !== undefined ? buttonCheck.data[0].bypassLocationCheck : false, // 保留现有值，如果不存在则默认为 false
              updateTime: db.serverDate()
            }
          })
          console.log('[verifyNickname] ✅ 已更新 login_logbutton 封禁状态（昵称验证失败）')
        } else {
          // 如果不存在，创建新记录
          await db.collection('login_logbutton').add({
            data: {
              _openid: openid,
              isBanned: true,
              banReason: 'nickname_verify_fail',
              nickname: nickname,
              failCount: newFailCount,
              bypassLocationCheck: false, // 🔴 自动添加免死金牌字段，默认为 false
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
          console.log('[verifyNickname] ✅ 已创建 login_logbutton 封禁记录（昵称验证失败）')
        }
      } catch (e) {
        console.error('[verifyNickname] ❌ 更新 login_logbutton 失败:', e);
      }

      // 🔴 保留 blocked_logs 作为历史记录（不更新 isBanned，因为封禁控制已由 login_logbutton 管理）
      try {
        await db.collection('blocked_logs').add({
          data: {
            _openid: openid,
            nickname,
            reason: 'nickname_verify_fail',
            // 🔴 移除 isBanned 字段，封禁控制已由 login_logbutton 管理
            failCount: newFailCount,
            createTime: db.serverDate(),
            updateTime: db.serverDate(),
          },
        });
      } catch (e) {
        console.error('[verifyNickname] add blocked_logs error:', e);
      }

      try {
        await db
          .collection('user_list')
          .where({ _openid: openid })
          .update({
            data: {
              isBanned: true,
              updateTime: db.serverDate(),
            },
          });
      } catch (e) {
        console.error('[verifyNickname] update user_list ban error:', e);
      }

      return {
        success: false,
        isBlocked: true,
        type: 'banned',
        failCount: newFailCount,
      };
    }

    // 未通过，且未到封号次数
    return {
      success: false,
      isBlocked: false,
      type: 'invalid_nickname',
      failCount: newFailCount,
    };
  } catch (err) {
    // 兜底异常处理，保证不抛出到前端
    console.error('[verifyNickname] unexpected error:', err);
    return {
      success: false,
      isBlocked: false,
      error: 'INTERNAL_ERROR',
    };
  }
};


