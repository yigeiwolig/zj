const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 页面名称映射（英文名称，用于后台）
const PAGE_NAME_MAP = {
  'index': 'Login',
  'products': 'Products',
  'shop': 'Shop',
  'case': 'Case',
  'my': 'My',
  'home': 'Home',
  'paihang': 'Ranking',
  'shouhou': 'Repair',
  'blocked': 'Blocked',
  'admin': 'Admin',
  'adminLite': 'AdminLite',
  'azjc': 'Tutorial',
  'call': 'Contact',
  'scan': 'Scan',
  'ota': 'OTA',
  'pagenew': 'NewPage'
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
  
  // 获取英文页面名称（用于后台）
  const pageNameEn = PAGE_NAME_MAP[pageName] || pageName;
  
  if (!pageNameEn) {
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
      const currentCount = record[pageNameEn] || 0;
      
      await db.collection('fenxishuju').doc(record._id).update({
        data: {
          [pageNameEn]: currentCount + 1,
          updateTime: now
        }
      });
      
      console.log(`[updatePageVisit] ✅ 已更新 ${pageNameEn} 访问次数: ${currentCount + 1}`);
    } else {
      // 创建新记录
      const initialData = {
        _openid: openid,
        [pageNameEn]: 1,
        createTime: now,
        updateTime: now
      };
      
      await db.collection('fenxishuju').add({
        data: initialData
      });
      
      console.log(`[updatePageVisit] ✅ 已创建新记录，${pageNameEn} 访问次数: 1`);
    }
    
    return { success: true, pageName: pageNameEn };
  } catch (err) {
    console.error('[updatePageVisit] ❌ 更新访问统计失败:', err);
    return { success: false, error: err.message };
  }
};
