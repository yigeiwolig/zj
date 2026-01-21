const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  const { shareCodeId } = event; // 分享码记录的 _id
  
  if (!shareCodeId) {
    console.error('[updateShareCodeViews] 缺少 shareCodeId 参数');
    return { success: false, error: '缺少 shareCodeId 参数' };
  }

  try {
    // 🔴 从数据库读取最新的分享码信息
    const codeRes = await db.collection('chakan').doc(shareCodeId).get();
    
    if (!codeRes.data) {
      console.error('[updateShareCodeViews] 分享码记录不存在:', shareCodeId);
      return { success: false, error: '分享码记录不存在' };
    }

    const codeInfo = codeRes.data;
    const currentUsedViews = codeInfo.usedViews || 0;
    const totalViews = codeInfo.totalViews || 3;

    console.log('[updateShareCodeViews] 当前已使用次数:', currentUsedViews, ', 总次数:', totalViews);

    // 🔴 检查是否已用完
    if (currentUsedViews >= totalViews) {
      console.log('[updateShareCodeViews] 分享码查看次数已用完');
      return {
        success: true,
        remaining: 0,
        total: totalViews,
        usedViews: currentUsedViews,
        isExhausted: true
      };
    }

    // 🔴 在数据库中更新次数（原子操作）
    const newUsedViews = currentUsedViews + 1;
    
    await db.collection('chakan').doc(shareCodeId).update({
      data: {
        usedViews: newUsedViews,
        updateTime: db.serverDate()
      }
    });

    console.log('[updateShareCodeViews] ✅ 已更新查看次数:', currentUsedViews, '→', newUsedViews);

    // 🔴 计算剩余次数
    const remaining = totalViews - newUsedViews;

    return {
      success: true,
      remaining: remaining,
      total: totalViews,
      usedViews: newUsedViews,
      isExhausted: remaining <= 0
    };

  } catch (err) {
    console.error('[updateShareCodeViews] ❌ 更新分享码查看次数失败:', err);
    return { success: false, error: err.message };
  }
};