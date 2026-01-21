const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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
        // 🔴 修复：支持多种格式的 auto 字段（布尔值、字符串、数字）
        const autoValue = record.auto;
        console.log('[checkUnlockStatus] 📋 login_logs 记录 - auto 值:', autoValue, ', 类型:', typeof autoValue);
        if (autoValue === true || autoValue === 1 || autoValue === 'true' || autoValue === '1') {
          globalAutoMode = true;
          console.log('[checkUnlockStatus] ✅ 检测到 Auto 模式开启，auto 值:', autoValue);
        } else {
          console.log('[checkUnlockStatus] ❌ Auto 模式未开启，auto 值:', autoValue);
        }
      } else {
        console.log('[checkUnlockStatus] ⚠️ 未找到 login_logs 记录');
      }
    } catch (e) {
      console.error('[checkUnlockStatus] 查询 login_logs 失败:', e);
    }

    // 🔴 关键修复：不要只依赖“最新一条 login_logs”判断 auto
    // 很多情况下你在控制台只改了某条记录的 auto=true，但 updateTime 不一定是最新，导致这里永远读不到。
    // 只要该用户任意一条 login_logs 的 auto 为真（支持多种类型），就视为 Auto 已开启。
    if (!globalAutoMode) {
      try {
        const autoRes = await db.collection('login_logs')
          .where({
            _openid: OPENID,
            auto: _.in([true, 1, 'true', '1'])
          })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();
        if (autoRes.data && autoRes.data.length > 0) {
          globalAutoMode = true;
          // 如果当前 nickname 为空，优先用 auto 记录里的 nickname
          if ((!nickname || nickname.trim().length === 0) && autoRes.data[0].nickname) {
            nickname = String(autoRes.data[0].nickname);
          }
          console.log('[checkUnlockStatus] ✅ 从历史 login_logs 命中 auto=true，开启 Auto 模式');
        }
      } catch (e1) {
        // 某些历史数据可能没有 updateTime，orderBy 会报错；兜底按 createTime 再试一次
        try {
          const autoRes2 = await db.collection('login_logs')
            .where({
              _openid: OPENID,
              auto: _.in([true, 1, 'true', '1'])
            })
            .orderBy('createTime', 'desc')
            .limit(1)
            .get();
          if (autoRes2.data && autoRes2.data.length > 0) {
            globalAutoMode = true;
            if ((!nickname || nickname.trim().length === 0) && autoRes2.data[0].nickname) {
              nickname = String(autoRes2.data[0].nickname);
            }
            console.log('[checkUnlockStatus] ✅ 从历史 login_logs(createTime) 命中 auto=true，开启 Auto 模式');
          }
        } catch (e2) {
          console.warn('[checkUnlockStatus] 查询历史 auto=true 记录失败:', e2);
        }
      }
    }

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
    console.log('[checkUnlockStatus] 📋 login_logbutton 记录 - qiangli 值:', buttonRecord?.qiangli, ', isBanned:', buttonRecord?.isBanned, ', banReason:', buttonRecord?.banReason);
    if (qiangli) {
      console.log('[checkUnlockStatus] ⚠️ 检测到强制封禁按钮 qiangli 已开启，无视一切放行，直接封禁');
      console.log('[checkUnlockStatus] ⚠️ 即使 auto=true，qiangli 也会阻止自动放行');
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
    // 🚀 2. 优先检查免死金牌（针对地址拦截封禁）
    //    如果用户有免死金牌且是地址拦截封禁，直接放行到 index 页面
    // ==========================================================
    const isScreenshotBan = buttonRecord && (buttonRecord.banReason === 'screenshot' || buttonRecord.banReason === 'screen_record');
    const isLocationBan = buttonRecord && buttonRecord.banReason === 'location_blocked';
    
    if (isLocationBan && isBanned && bypassLocationCheck) {
        console.log('[checkUnlockStatus] 🎖️ 检测到免死金牌，地址拦截封禁自动解封');
        // 🔴 重置封禁状态
        if (buttonRecord._id) {
            try {
                await db.collection('login_logbutton').doc(buttonRecord._id).update({
                    data: { 
                        isBanned: false, 
                        updateTime: db.serverDate() 
                    }
                });
                console.log('[checkUnlockStatus] 🎖️ 已解除地址拦截封禁（免死金牌）');
            } catch (e) {
                console.error('[checkUnlockStatus] 解除封禁失败:', e);
            }
        }
        // 重置失败次数
        if (recordId) {
            try {
                await db.collection('login_logs').doc(recordId).update({
                    data: { failCount: 0, updateTime: db.serverDate() }
                });
            } catch (e) {}
        }
        return { action: 'PASS', nickname, returnToIndex: true };
    }
    
    // ==========================================================
    // 🚀 3. 检查 Auto 模式 (超级绿灯)
    //    只要 Auto 开启，无视 failCount，直接洗白并放行
    //    🔴 但是：截屏/录屏封禁不能被 Auto 模式自动放行
    //    🔴 但是：地址拦截封禁不能被 Auto 模式自动放行（需要管理员手动解封或免死金牌）
    //    🔴 但是：qiangli 强制封禁不能被 Auto 模式自动放行（最高优先级）
    // ==========================================================
    
    // 🔴 修复：Auto 模式的检查条件，只要 auto=true，就尝试自动放行（除非被 qiangli、截屏封禁、地址拦截阻止）
    if (globalAutoMode) {
        console.log('[checkUnlockStatus] 🚀 Auto 模式已开启，开始检查放行条件...');
        console.log('[checkUnlockStatus] 当前状态 - qiangli:', qiangli, ', isBanned:', isBanned, ', banReason:', buttonRecord?.banReason, ', isScreenshotBan:', isScreenshotBan, ', isLocationBan:', isLocationBan);
        
        // 🔴 最高优先级：如果 qiangli 强制封禁开启，Auto 模式不能自动放行
        if (qiangli) {
            console.log('[checkUnlockStatus] 🚫 Auto 模式不能自动放行 qiangli 强制封禁');
            return { action: 'WAIT', msg: '强制封禁中：qiangli按钮已开启，需要管理员手动解封' };
        }
        
        // 🔴 关键修复：如果是因为地址拦截被封禁，Auto 模式不能自动放行
        if (isLocationBan && isBanned) {
            console.log('[checkUnlockStatus] 🚫 Auto 模式不能自动放行地址拦截封禁，需要管理员手动解封或使用免死金牌');
            return { action: 'WAIT', msg: '封禁中：地址拦截封禁需要管理员手动解封或使用免死金牌' };
        }
        
        // 🔴 关键修复：如果是因为截屏/录屏被封禁，Auto 模式不能自动放行
        if (isScreenshotBan && isBanned) {
            console.log('[checkUnlockStatus] 🚫 Auto 模式不能自动放行截屏/录屏封禁');
            return { action: 'WAIT', msg: '封禁中：截屏/录屏封禁需要管理员手动解封' };
        }
        
        console.log('[checkUnlockStatus] ✅ Auto 模式开启，所有条件通过，执行自动放行（仅限昵称验证失败）');
        console.log('[checkUnlockStatus] 当前状态 - isBanned:', isBanned, ', banReason:', buttonRecord?.banReason);
        console.log('[checkUnlockStatus] 当前 nickname:', nickname, ', OPENID:', OPENID);
        
        // A. 写入白名单
        if (nickname && nickname.trim().length > 0) {
          try {
            console.log('[checkUnlockStatus] AUTO: 开始检查白名单，nickname:', nickname);
            const validCheck = await db.collection('valid_users').where({ nickname }).get();
            console.log('[checkUnlockStatus] AUTO: 白名单查询结果，数量:', validCheck.data.length);
            
            if (validCheck.data.length === 0) {
              console.log('[checkUnlockStatus] AUTO: 白名单中不存在，开始添加...');
              const addResult = await db.collection('valid_users').add({
                data: { 
                  nickname, 
                  _openid: OPENID, 
                  createTime: db.serverDate(), 
                  updateTime: db.serverDate() 
                }
              });
              console.log('[checkUnlockStatus] AUTO: ✅ 已成功写入 valid_users ->', nickname, ', 记录ID:', addResult._id);
            } else {
              console.log('[checkUnlockStatus] AUTO: ✅ valid_users 已存在 ->', nickname);
            }
          } catch (e) {
            console.error('[checkUnlockStatus] AUTO: ❌ 写入 valid_users 失败', e);
            console.error('[checkUnlockStatus] AUTO: 错误详情:', JSON.stringify(e, null, 2));
            // 即使写入白名单失败，也继续执行后续操作
          }
        } else {
          console.log('[checkUnlockStatus] AUTO: ⚠️ 未找到可写入的 nickname，nickname 值:', nickname);
          // 如果没有 nickname，尝试从 login_logbutton 获取
          if (buttonRecord && buttonRecord.nickname) {
            nickname = buttonRecord.nickname;
            console.log('[checkUnlockStatus] AUTO: 从 login_logbutton 获取 nickname:', nickname);
            try {
              const validCheck = await db.collection('valid_users').where({ nickname }).get();
              if (validCheck.data.length === 0) {
                const addResult = await db.collection('valid_users').add({
                  data: { 
                    nickname, 
                    _openid: OPENID, 
                    createTime: db.serverDate(), 
                    updateTime: db.serverDate() 
                  }
                });
                console.log('[checkUnlockStatus] AUTO: ✅ 已成功写入 valid_users (从 login_logbutton) ->', nickname, ', 记录ID:', addResult._id);
              } else {
                console.log('[checkUnlockStatus] AUTO: ✅ valid_users 已存在 (从 login_logbutton) ->', nickname);
              }
            } catch (e) {
              console.error('[checkUnlockStatus] AUTO: ❌ 从 login_logbutton 写入 valid_users 失败', e);
            }
          }
        }

        // B. 重置 login_logs 的失败次数 (防止被卡住)
        if (recordId) {
          try {
            console.log('[checkUnlockStatus] AUTO: 开始更新 login_logs，recordId:', recordId);
            const updateResult = await db.collection('login_logs').doc(recordId).update({
              data: { failCount: 0, success: true, auto: true, updateTime: db.serverDate() }
            });
            console.log('[checkUnlockStatus] AUTO: ✅ 已更新 login_logs，更新结果:', updateResult);
          } catch (e) {
            console.error('[checkUnlockStatus] AUTO: ❌ 更新 login_logs 失败', e);
          }
        } else {
          console.log('[checkUnlockStatus] AUTO: ⚠️ 未找到 recordId，无法更新 login_logs');
        }

        // C. 确保 login_logbutton 是解封状态（但必须确保 qiangli 不是 true）
        if (buttonRecord && buttonRecord._id && !qiangli) {
          try {
            console.log('[checkUnlockStatus] AUTO: 开始更新 login_logbutton，buttonRecordId:', buttonRecord._id);
            const updateResult = await db.collection('login_logbutton').doc(buttonRecord._id).update({
              data: { isBanned: false, updateTime: db.serverDate() }
            });
            console.log('[checkUnlockStatus] AUTO: ✅ 已更新 login_logbutton，更新结果:', updateResult);
          } catch (e) {
            console.error('[checkUnlockStatus] AUTO: ❌ 更新 login_logbutton 失败', e);
          }
        } else {
          if (!buttonRecord) {
            console.log('[checkUnlockStatus] AUTO: ⚠️ 未找到 buttonRecord');
          } else if (qiangli) {
            console.log('[checkUnlockStatus] AUTO: ⚠️ qiangli 为 true，跳过更新 login_logbutton');
          }
        }
      
        console.log('[checkUnlockStatus] AUTO: ✅ 所有操作完成，返回 PASS，nickname:', nickname);
        return { action: 'PASS', nickname }
    }

    // ==========================================================
    // 🛑 1. 检查封禁
    // ==========================================================
    if (isBanned) {
      // 🔴 最高优先级：如果 qiangli 强制封禁开启，免死金牌也不能绕过
      if (qiangli) {
        console.log('[checkUnlockStatus] 🚫 qiangli 强制封禁开启，免死金牌无效');
        return { action: 'WAIT', msg: '强制封禁中：qiangli按钮已开启，需要管理员手动解封' };
      }
      
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
    //    🔴 但是：qiangli 强制封禁不能被手动解封绕过（除非管理员在后台手动将 qiangli 改为 false）
    // ==========================================================
    if (isExplicitlyUnbanned) {
        // 🔴 最高优先级：如果 qiangli 强制封禁开启，即使 isBanned = false，也不能放行
        if (qiangli) {
            console.log('[checkUnlockStatus] 🚫 qiangli 强制封禁开启，即使 isBanned = false 也不能放行');
            return { action: 'WAIT', msg: '强制封禁中：qiangli按钮已开启，需要管理员在后台手动将 qiangli 改为 false' };
        }
        
        console.log('[checkUnlockStatus] 🛠️ 检测到手动解封');
        
        const banReason = buttonRecord ? buttonRecord.banReason : '';
        console.log('[checkUnlockStatus] 🔍 当前 banReason 值:', banReason, '类型:', typeof banReason);
        console.log('[checkUnlockStatus] 🔍 buttonRecord 完整内容:', JSON.stringify(buttonRecord));
        
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
        } else {
            console.log('[checkUnlockStatus] ⚠️ banReason 不是 location_blocked，进入其他解封逻辑');
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
    //    🔴 但是：qiangli 强制封禁不能被白名单自动放行（最高优先级）
    // ==========================================================
    if (nickname) {
        try {
         const validCheck = await db.collection('valid_users').where({ nickname }).limit(1).get()
         if (validCheck.data.length > 0) {
            // 🔴 最高优先级：如果 qiangli 强制封禁开启，白名单不能自动放行
            if (qiangli) {
                console.log('[checkUnlockStatus] 🚫 qiangli 强制封禁开启，白名单不能自动放行');
                return { action: 'WAIT', msg: '强制封禁中：qiangli按钮已开启，需要管理员手动解封' };
            }
            
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
