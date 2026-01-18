const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  try {
    // 1. 获取 login_logs (获取昵称、failCount、auto 标记)
    let record = null;
    let nickname = '';
    let recordId = null;
    let globalAutoMode = false
    try {
      const logRes = await db.collection('login_logs')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      if (logRes.data.length > 0) {
        record = logRes.data[0];
        recordId = record._id;
        nickname = record.nickname || '';
        if (record.auto === true) {
        globalAutoMode = true
        }
      }
    } catch (e) {}

    // 3. 获取 login_logbutton (封禁令牌)
    let buttonRecord = null
    try {
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
      if (buttonRes.data.length > 0) {
        buttonRecord = buttonRes.data[0]
        // 如果 login_logs 中没有 nickname，尝试从 login_logbutton 获取
        if ((!nickname || nickname.length === 0) && buttonRecord.nickname) {
          nickname = buttonRecord.nickname
        }
      }
    } catch (e) {}

    // 🔴 最高优先级：检查强制封禁按钮 qiangli
    const qiangli = buttonRecord && (buttonRecord.qiangli === true || buttonRecord.qiangli === 1 || buttonRecord.qiangli === 'true' || buttonRecord.qiangli === '1')
    if (qiangli) {
      console.log('[checkUnlockStatus] ⚠️ 检测到强制封禁按钮 qiangli 已开启，无视一切放行，直接封禁')
      return { action: 'WAIT', msg: '强制封禁中：qiangli按钮已开启' }
    }
    
    // 解析状态
    const rawFlag = buttonRecord ? buttonRecord.isBanned : undefined
    const isBanned = buttonRecord && (rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1')
    const isExplicitlyUnbanned = buttonRecord && (rawFlag === false || rawFlag === 0 || rawFlag === 'false' || rawFlag === '0')
    const isLocationBlock = buttonRecord && buttonRecord.banReason === 'location_blocked'
    const bypassLocationCheck = buttonRecord && buttonRecord.bypassLocationCheck === true

    // 🔴 关键修复：如果是截屏/录屏封禁，但 isBanned = false，可能是数据库还没更新完成
    // 检查 updateTime，如果是在最近3秒内更新的，可能是刚封禁，需要等待
    const isScreenshotBanCheck = buttonRecord && (buttonRecord.banReason === 'screenshot' || buttonRecord.banReason === 'screen_record');
    if (isScreenshotBanCheck && buttonRecord && buttonRecord.updateTime && !isBanned) {
      try {
        let updateTime = buttonRecord.updateTime;
        if (updateTime && typeof updateTime.getTime === 'function') {
          updateTime = updateTime;
        } else if (typeof updateTime === 'number') {
          updateTime = new Date(updateTime);
        } else if (typeof updateTime === 'string') {
          updateTime = new Date(updateTime);
        } else {
          updateTime = null;
        }
        
        if (updateTime && !isNaN(updateTime.getTime())) {
          const now = new Date();
          const timeDiff = now.getTime() - updateTime.getTime();
          const recentUpdate = timeDiff < 3000 && timeDiff >= 0; // 3秒内更新的
          
          // 如果是截屏封禁，但 isBanned = false 且是最近更新的，可能是数据库还没更新完成，返回 WAIT
          if (recentUpdate) {
            console.log('[checkUnlockStatus] ⏳ 截屏封禁可能还在更新中（最近3秒内更新），等待数据库同步...');
            console.log('[checkUnlockStatus] ⏳ 时间差:', timeDiff, 'ms, isBanned:', isBanned);
            return { action: 'WAIT', msg: '等待封禁状态更新...' };
          }
        }
      } catch (e) {
        console.warn('[checkUnlockStatus] 检查更新时间失败:', e);
      }
    }

    // ==========================================================
    // 🚀 2. 检查 Auto 模式 (超级绿灯)
    //    只要 Auto 开启，无视 failCount，直接洗白并放行
    //    🔴 但是：截屏/录屏封禁不能被 Auto 模式自动放行
    // ==========================================================
    const isScreenshotBan = buttonRecord && (buttonRecord.banReason === 'screenshot' || buttonRecord.banReason === 'screen_record');
    
    if (globalAutoMode && (!isBanned || (buttonRecord && buttonRecord.banReason === 'nickname_verify_fail'))) {
        // 🔴 关键修复：如果是因为截屏/录屏被封禁，Auto 模式不能自动放行
        if (isScreenshotBan && isBanned) {
            console.log('[checkUnlockStatus] 🚫 Auto 模式不能自动放行截屏/录屏封禁');
            return { action: 'WAIT', msg: '封禁中：截屏/录屏封禁需要管理员手动解封' };
        }
        
        console.log('[checkUnlockStatus] 🚀 Auto 模式开启，执行自动放行');
        
        // A. 写入白名单
      if (nickname) {
        try {
                const validCheck = await db.collection('valid_users').where({ nickname }).get();
          if (validCheck.data.length === 0) {
            await db.collection('valid_users').add({
                        data: { nickname, _openid: OPENID, createTime: db.serverDate(), updateTime: db.serverDate() }
                    });
                    console.log('[checkUnlockStatus] AUTO: 已写入 valid_users ->', nickname)
          } else {
                    console.log('[checkUnlockStatus] AUTO: valid_users 已存在 ->', nickname)
          }
        } catch (e) {
                console.error('[checkUnlockStatus] AUTO: 写入 valid_users 失败', e)
            }
          } else {
            console.log('[checkUnlockStatus] AUTO: 未找到可写入的 nickname')
      }

        // B. 重置 login_logs 的失败次数 (防止被卡住)
        if (recordId) {
        try {
                await db.collection('login_logs').doc(recordId).update({
                    data: { failCount: 0, success: true, auto: true, updateTime: db.serverDate() }
                });
            } catch (e) {}
        }

        // C. 确保 login_logbutton 是解封状态
        if (buttonRecord && buttonRecord._id) {
        try {
                await db.collection('login_logbutton').doc(buttonRecord._id).update({
                    data: { isBanned: false, updateTime: db.serverDate() }
                });
            } catch (e) {}
      }
      
        return { action: 'PASS', nickname }
    }

    // ==========================================================
    // 🛑 1. 检查封禁
    // ==========================================================
    if (isBanned) {
      // 特权豁免：如果是地址拦截 且 有免死金牌 -> 放行
      if (isLocationBlock && bypassLocationCheck) {
        console.log('[checkUnlockStatus] ✅ 免死金牌生效，跳过封禁检查')
        if (buttonRecord && buttonRecord._id) {
          try {
            await db.collection('login_logbutton').doc(buttonRecord._id).update({
              data: { isBanned: false, updateTime: db.serverDate() }
            })
          } catch (e) {
            console.error('[checkUnlockStatus] 免死金牌解除封禁失败:', e)
          }
        }
        return { action: 'PASS', nickname }
      }
      // 否则：真的被封了
      return { action: 'WAIT', msg: `封禁中：${buttonRecord.banReason || '未知'}` }
    }

    // ==========================================================
    // 🛠️ 3. 检查手动解封 (isBanned 被改为 false)
    //    只要管理员手动解封，检查封禁原因：
    //    - 地址拦截：直接 PASS，返回 index 页面
    //    - 截屏/录屏：如果已在白名单，直接 PASS；否则 RETRY
    //    - 昵称验证失败：RETRY（需要重新验证昵称）
    // ==========================================================
    if (isExplicitlyUnbanned) {
        console.log('[checkUnlockStatus] 🛠️ 检测到手动解封');
        
        const banReason = buttonRecord ? buttonRecord.banReason : '';
        
        // 🔴 关键修复：如果是地址拦截被解封，直接 PASS，返回 index 页面
        if (banReason === 'location_blocked') {
            console.log('[checkUnlockStatus] 🛠️ 地址拦截解封，直接放行到 index 页面');
            // 重置失败次数（如果有）
            if (recordId) {
                try {
                    await db.collection('login_logs').doc(recordId).update({
                        data: { failCount: 0, updateTime: db.serverDate() }
                    });
                } catch (e) {}
            }
            return { action: 'PASS', nickname, returnToIndex: true };
        }
        
        // 🔴 关键修复：如果是截屏/录屏封禁被解封，且用户已在白名单中，直接放行
        const wasScreenshotBan = banReason === 'screenshot' || banReason === 'screen_record';
        
        if (wasScreenshotBan && nickname) {
            // 检查是否在白名单中
      try {
                const validCheck = await db.collection('valid_users').where({ nickname }).limit(1).get();
                if (validCheck.data.length > 0) {
                    console.log('[checkUnlockStatus] 🛠️ 截屏封禁解封，用户已在白名单，直接放行');
                    // 重置失败次数
                    if (recordId) {
                        try {
                            await db.collection('login_logs').doc(recordId).update({
                                data: { failCount: 0, success: true, updateTime: db.serverDate() }
                            });
                        } catch (e) {}
                    }
                    return { action: 'PASS', nickname };
        }
      } catch (e) {
                console.error('[checkUnlockStatus] 检查白名单失败:', e);
            }
        }
        
        // 其他情况（昵称验证失败等）：重置失败次数，返回 RETRY（需要重新验证昵称）
        console.log('[checkUnlockStatus] 🛠️ 手动解封，允许重试');
        if (recordId) {
             try {
                await db.collection('login_logs').doc(recordId).update({
                    data: { failCount: 0, allowRetry: false, updateTime: db.serverDate() }
                });
            } catch (e) {}
        }
        
        return { action: 'RETRY', nickname }
    }

    // ==========================================================
    // 🏳️ 4. 检查白名单 (valid_users)
    //    🔴 但是：截屏/录屏封禁不能被白名单自动放行
    // ==========================================================
    if (nickname) {
        try {
         const validCheck = await db.collection('valid_users').where({ nickname }).limit(1).get()
         if (validCheck.data.length > 0) {
            // 🔴 关键修复：如果是因为截屏/录屏被封禁，白名单不能自动放行
            if (isScreenshotBan && isBanned) {
                console.log('[checkUnlockStatus] 🚫 白名单不能自动放行截屏/录屏封禁');
                return { action: 'WAIT', msg: '封禁中：截屏/录屏封禁需要管理员手动解封' };
      }
            
            if (!buttonRecord && (record ? record.failCount : 0) === 0) {
               return { action: 'WAIT', msg: '核实身份中...' }
            }
            return { action: 'PASS', nickname }
         }
       } catch (e) {}
    }

    // ==========================================================
    // 🔄 5. 默认逻辑
    // ==========================================================
    const currentFailCount = record ? (record.failCount || 0) : 0;
    
    if (!buttonRecord && currentFailCount < 3) {
      return { action: 'RETRY' }
    }

    return { action: 'WAIT' }

  } catch (err) {
    console.error(err)
    return { action: 'WAIT', error: err }
  }
}
