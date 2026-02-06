const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 删除 valid_users 中指定用户的记录，让用户重新输入昵称
exports.main = async (event, context) => {
  const { openid, nickname } = event;
  
  if (!openid && !nickname) {
    return { success: false, error: '缺少 openid 或 nickname' };
  }

  try {
    let deleteCount = 0;

    // 根据 openid 删除
    if (openid) {
      const res = await db.collection('valid_users')
        .where({ _openid: openid })
        .remove();
      deleteCount += res.stats.removed || 0;
      console.log('[deleteValidUser] 按 openid 删除:', openid, '删除数量:', res.stats.removed);
    }

    // 根据 nickname 删除（如果提供了）
    if (nickname) {
      const res = await db.collection('valid_users')
        .where({ nickname: nickname })
        .remove();
      deleteCount += res.stats.removed || 0;
      console.log('[deleteValidUser] 按 nickname 删除:', nickname, '删除数量:', res.stats.removed);
    }

    return { 
      success: true, 
      deleteCount: deleteCount,
      message: `已删除 ${deleteCount} 条记录`
    };
  } catch (err) {
    console.error('[deleteValidUser] 删除失败:', err);
    return { success: false, error: err.message };
  }
};
