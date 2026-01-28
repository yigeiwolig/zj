// cloudfunctions/addNicknameToWhitelist/index.js
// 管理员直接录入昵称到 valid_users 白名单（不经过验证）
// 🔴 录入时 _openid 为空，供其他用户绑定

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const nickname = (event && event.nickname ? String(event.nickname) : '').trim();
  const bypassLocationCheck = event && event.bypassLocationCheck === true; // 🔴 放行开关

  // 基本校验
  if (!nickname) {
    return { 
      success: false, 
      errMsg: '昵称不能为空' 
    };
  }

  try {
    // 检查昵称是否已存在
    const existingRes = await db.collection('valid_users')
      .where({ nickname: nickname })
      .get();

    if (existingRes.data && existingRes.data.length > 0) {
      // 如果已存在，检查是否有空位（未绑定 openid）
      // 🔴 与 verifyNickname 保持一致：查找 _openid 不存在或为空/null 的记录
      const emptySlot = existingRes.data.find(item => !item._openid);
      
      if (emptySlot) {
        // 有空位，说明已经有一个空位了，不需要再添加
        // 🔴 但如果放行开关打开，需要更新 valid_users 中的 bypassLocationCheck，并同步到 user_list 和 login_logbutton
        if (bypassLocationCheck) {
          // 更新 valid_users 中的 bypassLocationCheck
          await db.collection('valid_users').doc(emptySlot._id).update({
            data: {
              bypassLocationCheck: true,
              updateTime: db.serverDate()
            }
          });
          // 同步更新 user_list 和 login_logbutton
          await updateUserListBypass(db, nickname, true);
          await updateLoginLogbuttonBypass(db, nickname, true);
        }
        return {
          success: false,
          errMsg: `昵称 "${nickname}" 已存在且有空位，无需重复录入${bypassLocationCheck ? '（已更新地域放行设置）' : ''}`
        };
      } else {
        // 所有位置都被占用，可以再添加一个空位
        // 继续执行下面的添加逻辑
      }
    }

    // 🔴 不存在或需要添加新空位：添加新记录，不设置 _openid 字段（或设置为空字符串）
    // 注意：微信数据库可能会自动生成 _openid，所以我们需要明确不设置或设置为空
    // 为了与 verifyNickname 的占位逻辑兼容（!r._openid），我们设置为空字符串
    await db.collection('valid_users').add({
      data: {
        nickname: nickname,
        // 🔴 不设置 _openid 字段，或者设置为空字符串，让 verifyNickname 的 !r._openid 能匹配到
        // 微信数据库可能会自动添加 _openid，所以我们显式设置为空字符串更安全
        _openid: '', 
        desc: '管理员直接录入',
        bypassLocationCheck: bypassLocationCheck, // 🔴 地域放行开关存储在 valid_users 中
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 🔴 如果放行开关打开，同步更新 user_list 和 login_logbutton 中该昵称对应的所有记录
    if (bypassLocationCheck) {
      await updateUserListBypass(db, nickname, true);
      await updateLoginLogbuttonBypass(db, nickname, true);
    }

    return {
      success: true,
      message: `昵称 "${nickname}" 已成功录入到白名单（空位）${bypassLocationCheck ? '，已开启地域放行' : ''}`,
      isNew: true
    };

  } catch (err) {
    console.error('[addNicknameToWhitelist] 录入失败:', err);
    return {
      success: false,
      errMsg: err.message || '录入失败，请稍后重试'
    };
  }
};

// 🔴 更新 user_list 中指定昵称的所有记录的 bypassLocationCheck 字段
async function updateUserListBypass(db, nickname, bypassLocationCheck) {
  try {
    // 查找 user_list 中所有匹配该昵称的记录
    const userListRes = await db.collection('user_list')
      .where({ nickName: nickname })
      .get();
    
    if (userListRes.data && userListRes.data.length > 0) {
      // 批量更新所有匹配的记录
      const updatePromises = userListRes.data.map(user => 
        db.collection('user_list').doc(user._id).update({
          data: {
            bypassLocationCheck: bypassLocationCheck,
            updateTime: db.serverDate()
          }
        })
      );
      await Promise.all(updatePromises);
      console.log(`[addNicknameToWhitelist] 已更新 ${userListRes.data.length} 条 user_list 记录的 bypassLocationCheck 为 ${bypassLocationCheck}`);
    } else {
      console.log(`[addNicknameToWhitelist] user_list 中未找到昵称 "${nickname}" 的记录，跳过更新`);
    }
  } catch (err) {
    console.error('[addNicknameToWhitelist] 更新 user_list 失败:', err);
    // 不抛出错误，因为 valid_users 的添加已经成功
  }
}

// 🔴 更新 login_logbutton 中指定昵称的所有记录的 bypassLocationCheck 字段
async function updateLoginLogbuttonBypass(db, nickname, bypassLocationCheck) {
  try {
    // 查找 login_logbutton 中所有匹配该昵称的记录
    const buttonRes = await db.collection('login_logbutton')
      .where({ nickname: nickname })
      .get();
    
    if (buttonRes.data && buttonRes.data.length > 0) {
      // 批量更新所有匹配的记录
      const updatePromises = buttonRes.data.map(button => 
        db.collection('login_logbutton').doc(button._id).update({
          data: {
            bypassLocationCheck: bypassLocationCheck,
            updateTime: db.serverDate()
          }
        })
      );
      await Promise.all(updatePromises);
      console.log(`[addNicknameToWhitelist] 已更新 ${buttonRes.data.length} 条 login_logbutton 记录的 bypassLocationCheck 为 ${bypassLocationCheck}`);
    } else {
      console.log(`[addNicknameToWhitelist] login_logbutton 中未找到昵称 "${nickname}" 的记录，跳过更新`);
    }
  } catch (err) {
    console.error('[addNicknameToWhitelist] 更新 login_logbutton 失败:', err);
    // 不抛出错误，因为 valid_users 的添加已经成功
  }
}
