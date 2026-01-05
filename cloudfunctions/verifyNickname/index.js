const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const nickname = (event && event.nickname ? String(event.nickname) : '').trim();

  // 0. 基本校验
  if (!nickname) {
    return { success: false, isBlocked: false, error: 'EMPTY_NICKNAME' };
  }

  try {
    // 1. 读取配置 (auto 模式)
    let autoMode = false;
    try {
      const cfgDoc = await db.collection('app_config').doc('nickname_settings').get();
      if (cfgDoc && cfgDoc.data && cfgDoc.data.auto === true) {
        autoMode = true;
      }
    } catch (e) {} // 忽略配置不存在的错误

    // 2. 查找最新的 login_logs (获取上次失败次数)
    // 🔴 必须按 updateTime 倒序
    let lastLog = null;
    try {
      const lastRes = await db.collection('login_logs')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      if (lastRes.data.length > 0) {
        lastLog = lastRes.data[0];
      }
    } catch (e) {}

    let lastFailCount = lastLog ? (lastLog.failCount || 0) : 0;
    
    // 3. 🔴 检查 login_logbutton 封禁状态
    // 🔴 必须按 updateTime 倒序
    let alreadyBanned = false;
    let latestButtonRecord = null;
    try {
      const buttonCheck = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      
      if (buttonCheck.data && buttonCheck.data.length > 0) {
        const btn = buttonCheck.data[0];
        latestButtonRecord = btn;
        const isBanned = btn.isBanned === true || btn.isBanned === 1 || btn.isBanned === 'true';
        
        if (isBanned) {
          // 🛑 核心修复点：如果有免死金牌，且原因是地址拦截，则允许验证昵称
          const isLocationBan = btn.banReason === 'location_blocked';
          const hasGoldMedal = btn.bypassLocationCheck === true;
          
          if (isLocationBan && hasGoldMedal) {
             console.log('[verifyNickname] 金牌用户 (地址拦截+免死金牌)，允许验证昵称');
             alreadyBanned = false; // 放行！
          } else {
             // 其他情况（昵称封禁，或地址拦截没金牌），视为封号
             alreadyBanned = true;
             console.log('[verifyNickname] 用户已被封禁，原因:', btn.banReason);
          }
        }
      }
    } catch (e) {
      console.warn('[verifyNickname] 查询 login_logbutton 失败:', e);
    }

    // 如果管理员开启了 auto 模式，并且是昵称封禁，可以覆盖封禁继续执行写白名单逻辑
    if (alreadyBanned && autoMode && latestButtonRecord && latestButtonRecord.banReason === 'nickname_verify_fail') {
      console.log('[verifyNickname] auto 模式覆盖昵称封禁，继续执行白名单流程');
      alreadyBanned = false;
    }

    // 如果确实被封号，直接返回
    if (alreadyBanned) {
      return { success: false, isBlocked: true, type: 'banned' };
    }

    // 4. 检查是否在白名单 (valid_users)
    let isWhitelisted = false;
    try {
      const validRes = await db.collection('valid_users').where({ nickname }).limit(1).get();
      if (validRes.data.length > 0) {
        isWhitelisted = true;
      }
    } catch (e) {}

    // 5. 自动录入模式 (Auto Mode)
    // 如果开启了自动模式，且没在白名单，自动加白
    if (autoMode && !isWhitelisted) {
      try {
        await db.collection('valid_users').add({
          data: {
            nickname,
            _openid: openid,
            desc: 'auto 模式自动录入',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
        isWhitelisted = true;
        console.log('[verifyNickname] auto 模式自动加白');
      } catch (e) {
        console.error('[verifyNickname] auto 模式写入失败:', e);
      }
    }

    // ==========================================================
    // 🟢 场景 A: 验证通过 (白名单命中)
    // ==========================================================
    if (isWhitelisted) {
      // 更新 login_logs 为成功状态，重置 failCount
      const successData = {
        nickname,
        success: true,
        failCount: 0, // 重置计数
        auto: autoMode,
        updateTime: db.serverDate()
      };

      if (lastLog) {
        await db.collection('login_logs').doc(lastLog._id).update({ data: successData });
      } else {
        await db.collection('login_logs').add({ data: { ...successData, _openid: openid, createTime: db.serverDate() } });
      }

      // 尝试解除 login_logbutton 的昵称封禁（如果存在）
      // 注意：我们不解除地址封禁，只解除昵称封禁
      try {
         const btnRes = await db.collection('login_logbutton')
            .where({ _openid: openid })
            .orderBy('updateTime', 'desc')
            .limit(1)
            .get();
         
         if (btnRes.data.length > 0) {
             const btn = btnRes.data[0];
             // 只有当原因是昵称验证失败时，才解封。如果是地址拦截，保持原样（反正金牌能过）
             if (btn.banReason === 'nickname_verify_fail') {
                 await db.collection('login_logbutton').doc(btn._id).update({
                     data: { isBanned: false, updateTime: db.serverDate() }
                 });
             }
         }
      } catch(e) {}

      return { success: true, isBlocked: false };
    }

    // ==========================================================
    // 🔴 场景 B: 验证失败
    // ==========================================================
    const newFailCount = lastFailCount + 1;
    const willBan = newFailCount >= 3;

    // 更新 login_logs
    const failData = {
      nickname,
      success: false,
      failCount: newFailCount,
      auto: false,
      updateTime: db.serverDate()
    };

    if (lastLog) {
      await db.collection('login_logs').doc(lastLog._id).update({ data: failData });
    } else {
      await db.collection('login_logs').add({ data: { ...failData, _openid: openid, createTime: db.serverDate() } });
    }

    // 触发封号
    if (willBan) {
      // 更新或创建 login_logbutton
      const latestBtnRes = await db.collection('login_logbutton')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();

      if (latestBtnRes.data.length > 0) {
        await db.collection('login_logbutton').doc(latestBtnRes.data[0]._id).update({
          data: {
            isBanned: true,
            banReason: 'nickname_verify_fail', // 明确是昵称封禁
            failCount: newFailCount,
            updateTime: db.serverDate()
          }
        });
      } else {
        await db.collection('login_logbutton').add({
          data: {
            _openid: openid,
            isBanned: true,
            banReason: 'nickname_verify_fail',
            failCount: newFailCount,
            bypassLocationCheck: false, // 默认没金牌
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
      }
      return { success: false, isBlocked: true, type: 'banned', failCount: newFailCount };
    }

    // 失败但未封号
    return { success: false, isBlocked: false, type: 'invalid_nickname', failCount: newFailCount };

  } catch (err) {
    console.error('[verifyNickname] 系统错误:', err);
    return { success: false, isBlocked: false, error: 'INTERNAL_ERROR' };
  }
};
