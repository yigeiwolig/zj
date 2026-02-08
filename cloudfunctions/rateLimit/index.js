// 频率限制云函数 - 防止爬虫和恶意请求
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 参数说明：
  // action: 操作类型（如 'query_data', 'submit_form' 等）
  // maxCount: 时间窗口内允许的最大请求次数（默认10次）
  // windowMs: 时间窗口（毫秒，默认60000即1分钟）
  const { action = 'default', maxCount = 10, windowMs = 60000 } = event;
  
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 查询该用户在时间窗口内的请求次数
    const countRes = await db.collection('rate_limit_logs')
      .where({
        openid: openid,
        action: action,
        timestamp: db.command.gte(windowStart)
      })
      .count();
    
    const currentCount = countRes.total;
    
    // 如果超过限制，返回错误
    if (currentCount >= maxCount) {
      const retryAfter = Math.ceil((windowMs - (now - windowStart)) / 1000);
      console.warn(`[rateLimit] 用户 ${openid.substring(0, 8)}... 操作 ${action} 请求过于频繁，当前 ${currentCount}/${maxCount}，${retryAfter}秒后可重试`);
      
      return { 
        success: false, 
        error: '请求过于频繁，请稍后再试',
        retryAfter: retryAfter,
        currentCount: currentCount,
        maxCount: maxCount
      };
    }
    
    // 记录本次请求
    await db.collection('rate_limit_logs').add({
      data: {
        openid: openid,
        action: action,
        timestamp: now,
        createdAt: db.serverDate()
      }
    });
    
    // 清理过期记录（异步执行，不阻塞）
    if (Math.random() < 0.1) { // 10% 概率清理，避免每次都清理
      db.collection('rate_limit_logs')
        .where({
          timestamp: db.command.lt(now - windowMs * 2) // 清理2个时间窗口前的记录
        })
        .remove()
        .catch(err => console.error('[rateLimit] 清理过期记录失败:', err));
    }
    
    return { 
      success: true,
      remaining: maxCount - currentCount - 1
    };
  } catch (error) {
    console.error('[rateLimit] 频率限制检查失败:', error);
    // 出错时放行，避免影响正常用户
    return { success: true, error: '检查失败，已放行' };
  }
};
