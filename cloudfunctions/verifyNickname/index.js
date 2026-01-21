const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const nickname = (event && event.nickname ? String(event.nickname) : '').trim();

  // 🔴 接收前端传递的地址信息、设备信息
  const {
    province,          // 省份
    city,              // 城市
    district,           // 区/县
    address,            // 详细地址
    latitude,           // 纬度
    longitude,          // 经度
    deviceInfo,         // 设备信息
    phoneModel          // 手机型号
  } = event;

  // 0. 基本校验
  if (!nickname) {
    return { success: false, isBlocked: false, error: 'EMPTY_NICKNAME' };
  }

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

  try {
    // 1. 读取配置 (auto 模式)
    // 🔴 支持两种 auto 模式：
    //    - app_config.nickname_settings.auto (全局配置)
    //    - login_logs.auto (用户级配置，优先级更高)
    let autoMode = false;
    
    // 1.1 先检查 login_logs 中的 auto 字段（用户级，优先级更高）
    try {
      const lastRes = await db.collection('login_logs')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      if (lastRes.data.length > 0) {
        const lastLog = lastRes.data[0];
        const autoValue = lastLog.auto;
        console.log('[verifyNickname] 📋 login_logs.auto 值:', autoValue, ', 类型:', typeof autoValue);
        if (autoValue === true || autoValue === 1 || autoValue === 'true' || autoValue === '1') {
          autoMode = true;
          console.log('[verifyNickname] ✅ 从 login_logs 检测到 Auto 模式开启');
        }
      }
    } catch (e) {
      console.error('[verifyNickname] 查询 login_logs.auto 失败:', e);
    }
    
    // 1.2 如果 login_logs 中没有 auto，再检查全局配置
    if (!autoMode) {
      try {
        const cfgDoc = await db.collection('app_config').doc('nickname_settings').get();
        if (cfgDoc && cfgDoc.data && cfgDoc.data.auto === true) {
          autoMode = true;
          console.log('[verifyNickname] ✅ 从 app_config 检测到 Auto 模式开启');
        }
      } catch (e) {
        console.log('[verifyNickname] app_config 不存在或查询失败:', e.message);
      }
    }
    
    console.log('[verifyNickname] 📋 最终 autoMode 状态:', autoMode);

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
    // 支持占位逻辑：
    // - 优先查找已绑定当前用户的记录
    // - 其次查找未绑定任何用户的空位记录
    let isWhitelisted = false;
    let targetValidUserDocId = null;
    let isNewBinding = false;

    try {
      const validRes = await db.collection('valid_users').where({ nickname }).get();
      
      if (validRes.data.length > 0) {
        const records = validRes.data;
        
        // 4.1 优先查找已绑定当前用户的记录
        const myRecord = records.find(r => r._openid === openid);
        
        if (myRecord) {
          isWhitelisted = true;
          targetValidUserDocId = myRecord._id;
          console.log('[verifyNickname] 老用户回归，命中白名单');
        } else {
          // 4.2 查找未绑定的空位 (没有 _openid 字段，或者 _openid 为空/null/空字符串)
          // 注意：有些历史数据可能有 _openid 但不是当前用户，那些是被占用的
          // 🔴 更严格的空位判断：_openid 不存在、为 null、为空字符串、或为 undefined
          const emptyRecord = records.find(r => {
            const openidValue = r._openid;
            return !openidValue || openidValue === '' || openidValue === null || openidValue === undefined;
          });
          
          if (emptyRecord) {
            isWhitelisted = true;
            targetValidUserDocId = emptyRecord._id;
            isNewBinding = true;
            console.log('[verifyNickname] 发现空位，准备绑定 - 记录ID:', emptyRecord._id, '当前_openid值:', emptyRecord._openid);
          } else {
            console.log('[verifyNickname] 昵称存在但所有位置已被占用，记录数:', records.length);
            // 🔴 调试：打印所有记录的 _openid 值
            records.forEach((r, idx) => {
              console.log(`[verifyNickname] 记录${idx}: _id=${r._id}, _openid=${r._openid}, nickname=${r.nickname}`);
            });
          }
        }
      }
    } catch (e) {
      console.error('[verifyNickname] 查询 valid_users 失败:', e);
    }

    // 如果是新绑定，执行绑定操作
    if (isNewBinding && targetValidUserDocId) {
        try {
            console.log('[verifyNickname] 开始绑定操作 - 记录ID:', targetValidUserDocId, 'openid:', openid);
            
            // 🔴 执行绑定操作
            const updateResult = await db.collection('valid_users').doc(targetValidUserDocId).update({
                data: {
                    _openid: openid,
                    bindTime: db.serverDate(),
                    updateTime: db.serverDate()
                }
            });
            console.log('[verifyNickname] 绑定操作完成，更新结果:', updateResult);
            
            // 🔴 绑定成功后，重新查询确认绑定状态（防止并发问题）
            const verifyRes = await db.collection('valid_users').doc(targetValidUserDocId).get();
            console.log('[verifyNickname] 绑定后验证查询结果:', verifyRes.data);
            
            if (verifyRes.data && verifyRes.data._openid === openid) {
                console.log('[verifyNickname] ✅ 绑定确认成功，_openid 已正确设置为:', verifyRes.data._openid);
                isWhitelisted = true; // 确保状态为 true
            } else {
                console.error('[verifyNickname] ❌ 绑定后验证失败 - 期望openid:', openid, '实际openid:', verifyRes.data?._openid);
                isWhitelisted = false;
            }
        } catch (e) {
            console.error('[verifyNickname] ❌ 绑定失败，错误信息:', e);
            // 绑定失败（可能是并发冲突），视为验证失败
            isWhitelisted = false;
        }
    }

    // 5. 自动录入模式 (Auto Mode)
    // 如果开启了自动模式，且没在白名单，自动加白
    if (autoMode && !isWhitelisted) {
      console.log('[verifyNickname] 🚀 Auto 模式开启，开始自动添加白名单...');
      console.log('[verifyNickname] 当前状态 - nickname:', nickname, ', openid:', openid, ', isWhitelisted:', isWhitelisted);
      try {
        const addResult = await db.collection('valid_users').add({
          data: {
            nickname,
            _openid: openid,
            desc: 'auto 模式自动录入',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
        isWhitelisted = true;
        console.log('[verifyNickname] ✅ Auto 模式自动加白成功，记录ID:', addResult._id);
      } catch (e) {
        console.error('[verifyNickname] ❌ Auto 模式写入失败:', e);
        console.error('[verifyNickname] 错误详情:', JSON.stringify(e, null, 2));
        // 即使写入失败，也继续执行后续逻辑
      }
    } else {
      if (!autoMode) {
        console.log('[verifyNickname] ⚠️ Auto 模式未开启，跳过自动加白');
      } else if (isWhitelisted) {
        console.log('[verifyNickname] ⚠️ 用户已在白名单，无需自动加白');
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
        ...locationInfo,  // 地址信息
        ...deviceInfoObj, // 设备信息
        updateTime: db.serverDate()
      };

      if (lastLog) {
        await db.collection('login_logs').doc(lastLog._id).update({ data: successData });
        } else {
        await db.collection('login_logs').add({ data: { ...successData, _openid: openid, createTime: db.serverDate() } });
        }

      // 尝试解除 login_logbutton 的昵称封禁（如果存在）
      // 注意：我们不解除地址封禁，只解除昵称封禁
      // 🔴 但是：qiangli 强制封禁不能被自动解封（最高优先级）
      try {
         const btnRes = await db.collection('login_logbutton')
          .where({ _openid: openid })
            .orderBy('updateTime', 'desc')
            .limit(1)
            .get();
         
         if (btnRes.data.length > 0) {
             const btn = btnRes.data[0];
             // 🔴 最高优先级：如果 qiangli 强制封禁开启，不能自动解封
             const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
             if (qiangli) {
                 console.log('[verifyNickname] 🚫 qiangli 强制封禁开启，不能自动解封昵称封禁');
                 // 即使验证通过，也不解封
                 return { success: true, isBlocked: true, type: 'banned', qiangliBlocked: true };
             }
             
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
      ...locationInfo,  // 地址信息
      ...deviceInfoObj, // 设备信息
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
            banPage: 'index', // 昵称验证发生在 index 页面
              failCount: newFailCount,
            ...locationInfo,  // 地址信息
            ...deviceInfoObj, // 设备信息
              updateTime: db.serverDate()
            }
        });
        } else {
          await db.collection('login_logbutton').add({
            data: {
              _openid: openid,
              isBanned: true,
              banReason: 'nickname_verify_fail',
            banPage: 'index', // 昵称验证发生在 index 页面
            failCount: newFailCount,
            ...locationInfo,  // 地址信息
            ...deviceInfoObj, // 设备信息
            bypassLocationCheck: false, // 默认没金牌
            qiangli: false, // 🔴 自动添加qiangli字段，默认false
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
