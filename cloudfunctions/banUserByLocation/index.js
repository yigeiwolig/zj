const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const OPENID = wxContext.OPENID;

  try {
    // 查找最新的 login_logs 记录
    const logRes = await db.collection('login_logs')
      .where({ _openid: OPENID })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();

    if (logRes.data && logRes.data.length > 0) {
      // 如果存在记录，更新 isBanned 为 true
      const recordId = logRes.data[0]._id;
      const updateResult = await db.collection('login_logs').doc(recordId).update({
        data: {
          isBanned: true,
          updateTime: db.serverDate()
        }
      });
      
      console.log('[banUserByLocation] ✅ 已更新 login_logs.isBanned = true, recordId:', recordId);
      return { 
        success: true, 
        updated: true,
        recordId: recordId 
      };
    } else {
      // 如果不存在记录，创建新记录
      const addResult = await db.collection('login_logs').add({
        data: {
          _openid: OPENID,
          isBanned: true,
          success: false,
          failCount: 0,
          auto: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      
      console.log('[banUserByLocation] ✅ 已创建 login_logs 记录，isBanned = true');
      return { 
        success: true, 
        created: true,
        recordId: addResult._id 
      };
    }
  } catch (err) {
    console.error('[banUserByLocation] ❌ 更新 login_logs.isBanned 失败:', err);
    return { 
      success: false, 
      errMsg: err.message || String(err) 
    };
  }
};

