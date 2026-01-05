const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { buttonId } = event; // login_logbutton 的 _id
  
  if (!buttonId) {
    return { success: false, error: 'MISSING_BUTTON_ID' };
  }

  try {
    // 更新 login_logbutton，将 isBanned 设置为 false
    await db.collection('login_logbutton').doc(buttonId).update({
      data: {
        isBanned: false,
        updateTime: db.serverDate()
      }
    });

    console.log('[unbanUser] ✅ 已解封用户，buttonId:', buttonId);
    return { success: true };
  } catch (err) {
    console.error('[unbanUser] ❌ 解封失败:', err);
    return { success: false, error: err.message };
  }
};
