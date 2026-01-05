const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 页面名称映射（中文名称）
const PAGE_NAME_MAP = {
  'index': '登录页',
  'products': '产品页',
  'shop': '商店页',
  'case': '案例页',
  'my': '个人中心',
  'home': '首页',
  'paihang': '排行榜',
  'shouhou': '维修中心',
  'blocked': '封禁页',
  'admin': '管理员页',
  'adminLite': '管理员精简页',
  'azjc': '安装教程',
  'call': '联系页',
  'scan': '扫描页',
  'ota': 'OTA页',
  'pagenew': '新页面'
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const pageRoute = event.pageRoute || ''; // 例如 'pages/my/my' 或 'my'
  
  // 从路由中提取页面名称
  let pageName = '';
  if (pageRoute.includes('/')) {
    // 如果是完整路由，提取最后一部分
    const parts = pageRoute.split('/');
    pageName = parts[parts.length - 1] || parts[parts.length - 2] || '';
  } else {
    // 如果直接是页面名称
    pageName = pageRoute;
  }
  
  // 获取中文页面名称
  const chinesePageName = PAGE_NAME_MAP[pageName] || pageName;
  
  if (!chinesePageName) {
    console.warn('[updatePageVisit] 未找到页面名称映射:', pageRoute);
    return { success: false, error: 'INVALID_PAGE_NAME' };
  }
  
  try {
    // 查找该用户的记录
    const recordRes = await db.collection('fenxishuju')
      .where({ _openid: openid })
      .limit(1)
      .get();
    
    const now = db.serverDate();
    
    if (recordRes.data && recordRes.data.length > 0) {
      // 更新现有记录
      const record = recordRes.data[0];
      const currentCount = record[chinesePageName] || 0;
      
      await db.collection('fenxishuju').doc(record._id).update({
        data: {
          [chinesePageName]: currentCount + 1,
          updateTime: now
        }
      });
      
      console.log(`[updatePageVisit] ✅ 已更新 ${chinesePageName} 访问次数: ${currentCount + 1}`);
    } else {
      // 创建新记录
      const initialData = {
        _openid: openid,
        [chinesePageName]: 1,
        createTime: now,
        updateTime: now
      };
      
      await db.collection('fenxishuju').add({
        data: initialData
      });
      
      console.log(`[updatePageVisit] ✅ 已创建新记录，${chinesePageName} 访问次数: 1`);
    }
    
    return { success: true, pageName: chinesePageName };
  } catch (err) {
    console.error('[updatePageVisit] ❌ 更新访问统计失败:', err);
    return { success: false, error: err.message };
  }
};
