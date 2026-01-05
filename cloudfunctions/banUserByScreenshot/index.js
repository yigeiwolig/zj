const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const OPENID = wxContext.OPENID;
  const banType = event.type || 'screenshot'; // 'screenshot' 或 'record'

  console.log('[banUserByScreenshot] ========== 开始执行 ==========');
  console.log('[banUserByScreenshot] OPENID:', OPENID);
  console.log('[banUserByScreenshot] banType:', banType);

  try {
    // 🔴 关键：查找最新的 login_logbutton 记录
    let buttonRecordId = null;
    let buttonRecordData = null;
    try {
      const buttonCheck = await db.collection('login_logbutton')
        .where({ _openid: OPENID })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      if (buttonCheck.data && buttonCheck.data.length > 0) {
        buttonRecordId = buttonCheck.data[0]._id;
        buttonRecordData = buttonCheck.data[0];
      }
    } catch (err) {
      console.error('[banUserByScreenshot] 查询 login_logbutton 失败:', err);
    }

    const banReason = banType === 'screenshot' ? 'screenshot' : 'screen_record';

    if (buttonRecordId) {
      // 更新现有记录
      await db.collection('login_logbutton').doc(buttonRecordId).update({
        data: {
          isBanned: true,
          banReason: banReason,
          bypassLocationCheck: buttonRecordData && buttonRecordData.bypassLocationCheck === true,
          updateTime: db.serverDate()
        }
      });
      console.log('[banUserByScreenshot] ✅ 已更新 login_logbutton 封禁状态（截屏/录屏拦截）');
    } else {
      // 创建新记录
      const buttonAddResult = await db.collection('login_logbutton').add({
        data: {
          _openid: OPENID,
          isBanned: true,
          banReason: banReason,
          bypassLocationCheck: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      console.log('[banUserByScreenshot] ✅ 已创建 login_logbutton 封禁记录（截屏/录屏拦截）');
    }

    console.log('[banUserByScreenshot] ✅ 封禁状态已更新到 login_logbutton 集合');
    
    return { 
      success: true, 
      updated: true
    };
  } catch (err) {
    console.error('[banUserByScreenshot] ❌❌❌ 更新 login_logbutton 失败:', err);
    console.error('[banUserByScreenshot] 错误详情:', {
      message: err.message,
      code: err.errCode,
      stack: err.stack
    });
    return { 
      success: false, 
      errMsg: err.message || String(err),
      errCode: err.errCode || 'UNKNOWN_ERROR'
    };
  }
};
