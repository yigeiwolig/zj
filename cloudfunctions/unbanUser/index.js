const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

exports.main = async (event, context) => {
  const { buttonId, updateData, openid, updateLoginLogsAuto } = event; // login_logbutton 的 _id
  
  if (!buttonId) {
    return { success: false, error: 'MISSING_BUTTON_ID' };
  }

  try {
    await assertAdmin();

    // 🔴 如果传入了 updateData，使用自定义更新数据
    const updateButtonData = updateData || {
      isBanned: false,
      updateTime: db.serverDate()
    };
    
    // 确保 updateTime 存在
    if (!updateButtonData.updateTime) {
      updateButtonData.updateTime = db.serverDate();
    }

    // 更新 login_logbutton
    await db.collection('login_logbutton').doc(buttonId).update({
      data: updateButtonData
    });

    console.log('[unbanUser] ✅ 已更新 login_logbutton，buttonId:', buttonId, 'updateData:', updateButtonData);

    // 🔴 如果设置了 bypassLocationCheck: true，同步更新 valid_users 白名单和 user_list 中对应记录的 bypassLocationCheck
    if (updateButtonData.bypassLocationCheck === true) {
      try {
        // 先获取 login_logbutton 记录，获取 nickname
        const buttonRes = await db.collection('login_logbutton').doc(buttonId).get();
        const buttonData = buttonRes.data;
        const nickname = buttonData?.nickname;

        if (openid || nickname) {
          // 1. 更新 valid_users 白名单中的 bypassLocationCheck
          try {
            const validUsersRes = openid
              ? await db.collection('valid_users').where({ _openid: openid }).get()
              : await db.collection('valid_users').where({ nickname: nickname }).get();
            
            if (validUsersRes.data && validUsersRes.data.length > 0) {
              const updateValidPromises = validUsersRes.data.map(valid => 
                db.collection('valid_users').doc(valid._id).update({
                  data: {
                    bypassLocationCheck: true,
                    updateTime: db.serverDate()
                  }
                })
              );
              await Promise.all(updateValidPromises);
              console.log(`[unbanUser] ✅ 已同步更新 ${validUsersRes.data.length} 条 valid_users 记录的 bypassLocationCheck 为 true`);
            }
          } catch (e) {
            console.error('[unbanUser] ❌ 同步更新 valid_users 失败:', e);
          }

          // 2. 更新 user_list 中所有匹配该 openid 或 nickname 的记录
          if (openid || nickname) {
            const orList = [];
            if (openid) orList.push({ _openid: openid });
            if (nickname) orList.push({ nickName: nickname });
            const userListRes = await db.collection('user_list')
              .where(_.or(orList))
              .get();

            if (userListRes.data && userListRes.data.length > 0) {
              const updateUserPromises = userListRes.data.map(user =>
                db.collection('user_list').doc(user._id).update({
                  data: {
                    bypassLocationCheck: true,
                    updateTime: db.serverDate()
                  }
                })
              );
              await Promise.all(updateUserPromises);
              console.log(`[unbanUser] ✅ 已同步更新 ${userListRes.data.length} 条 user_list 记录的 bypassLocationCheck 为 true`);
            }
          }
        } else {
          console.log(`[unbanUser] ⚠️ login_logbutton 中未找到 nickname，跳过同步更新`);
        }
      } catch (e) {
        console.error('[unbanUser] ❌ 同步更新失败:', e);
        // 不影响主流程，继续返回成功
      }
    }

    // 🔴 如果需要更新 login_logs 的 auto 字段
    if (updateLoginLogsAuto && openid) {
      try {
        // 查找最新的 login_logs 记录
        const logRes = await db.collection('login_logs')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();
        
        if (logRes.data && logRes.data.length > 0) {
          await db.collection('login_logs').doc(logRes.data[0]._id).update({
            data: {
              auto: true,
              updateTime: db.serverDate()
            }
          });
          console.log('[unbanUser] ✅ 已更新 login_logs 的 auto 字段');
        }
      } catch (e) {
        console.warn('[unbanUser] 更新 login_logs 失败:', e);
        // 不影响主流程，继续返回成功
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[unbanUser] ❌ 解封失败:', err);
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: err.message };
  }
};
