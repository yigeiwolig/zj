const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { buttonId, updateData, openid, updateLoginLogsAuto } = event; // login_logbutton 的 _id
  
  if (!buttonId) {
    return { success: false, error: 'MISSING_BUTTON_ID' };
  }

  try {
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
    return { success: false, error: err.message };
  }
};
