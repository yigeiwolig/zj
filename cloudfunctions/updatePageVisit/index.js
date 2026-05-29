const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 🔴 重要：页面名称映射（必须使用拼音，用于后台同步数据）
 * ⚠️ 禁止使用中文字段名！所有字段名必须是拼音！
 * 
 * 字段名映射规则：
 * - 所有字段名必须是拼音（全小写）
 * - 禁止使用中文：如 "个人中心"、"产品页"、"封禁页"、"登录页" 等
 * - 禁止使用英文：如 "Login"、"Products"、"Blocked" 等
 * - 如果新增页面，必须使用拼音名称
 */
const PAGE_NAME_MAP = {
  'index': 'dengluye',              // 登录页
  'products': 'chanpinye',          // 产品页
  'shop': 'shangdianye',            // 商店页
  'case': 'anliye',                 // 案例页
  'my': 'gerenzhongxin',            // 个人中心
  'home': 'shouye',                 // 首页
  'paihang': 'paihangbang',         // 排行榜
  'shouhou': 'weixiuzhongxin',       // 维修中心
  'blocked': 'fengjingye',           // 封禁页
  'admin': 'guanliyuanye',          // 管理员页
  'adminLite': 'guanliyuanjingjianye', // 管理员精简页
  'azjc': 'anzhuangjiaocheng',      // 安装教程
  'call': 'lianxieye',              // 联系页
  'scan': 'saomiaoye',              // 扫描页
  'ota': 'otaye',                   // OTA页
  'pagenew': 'xinyemian'            // 新页面
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const pageRoute = event.pageRoute || ''; // 例如 'pages/my/my' / 'my'
  
  // 从路由中提取页面名称（优先 pages/x/x 结构，兜底再用最后段）
  let pageName = '';
  const routeText = String(pageRoute || '').trim();
  const match = routeText.match(/^pages\/([^/]+)\/\1$/);
  if (match && match[1]) {
    pageName = match[1];
  } else if (routeText.includes('/')) {
    const parts = routeText.split('/').filter(Boolean);
    pageName = parts[parts.length - 1] || parts[parts.length - 2] || '';
  } else {
    pageName = routeText;
  }
  
  // 🔴 获取拼音页面名称（用于后台，禁止使用中文！）
  const pageNamePinyin = PAGE_NAME_MAP[pageName];
  
  if (!pageNamePinyin) {
    console.error('[updatePageVisit] ❌ 未找到页面名称映射:', pageRoute, '页面名称:', pageName);
    console.error('[updatePageVisit] ⚠️ 如果这是新页面，请在 PAGE_NAME_MAP 中添加拼音映射（禁止使用中文！）');
    return { success: false, error: 'INVALID_PAGE_NAME', pageName: pageName };
  }
  
  // 🔴 安全检查：确保字段名不包含中文字符
  if (/[\u4e00-\u9fa5]/.test(pageNamePinyin)) {
    console.error('[updatePageVisit] ❌ 错误：字段名包含中文字符！', pageNamePinyin);
    return { success: false, error: 'FIELD_NAME_CONTAINS_CHINESE', pageName: pageNamePinyin };
  }
  
  try {
    // 查找该用户记录
    const recordRes = await db.collection('fenxishuju')
      .where({ _openid: openid })
      .limit(1)
      .get();
    
    const now = db.serverDate();
    
    if (recordRes.data && recordRes.data.length > 0) {
      const record = recordRes.data[0];
      // 兼容旧字段：中文/英文旧字段合并到拼音字段后删除
      const OLD_FIELD_MAP = {
        '登录页': 'dengluye',
        '产品页': 'chanpinye',
        '商店页': 'shangdianye',
        '案例页': 'anliye',
        '个人中心': 'gerenzhongxin',
        '首页': 'shouye',
        '排行榜': 'paihangbang',
        '维修中心': 'weixiuzhongxin',
        '封禁页': 'fengjingye',
        '管理员页': 'guanliyuanye',
        '管理员精简页': 'guanliyuanjingjianye',
        '安装教程': 'anzhuangjiaocheng',
        '联系页': 'lianxieye',
        '扫描页': 'saomiaoye',
        'OTA页': 'otaye',
        '新页面': 'xinyemian',
        // 英文字段名 → 拼音
        'Login': 'dengluye',
        'Products': 'chanpinye',
        'Shop': 'shangdianye',
        'Case': 'anliye',
        'My': 'gerenzhongxin',
        'Home': 'shouye',
        'Ranking': 'paihangbang',
        'Repair': 'weixiuzhongxin',
        'Blocked': 'fengjingye',
        'Admin': 'guanliyuanye',
        'AdminLite': 'guanliyuanjingjianye',
        'Tutorial': 'anzhuangjiaocheng',
        'Contact': 'lianxieye',
        'Scan': 'saomiaoye',
        'OTA': 'otaye',
        'NewPage': 'xinyemian'
      };
      
      let migrateDelta = 0;
      const updateData = {
        [pageNamePinyin]: db.command.inc(1),
        updateTime: now
      };

      for (const [oldName, pinyinName] of Object.entries(OLD_FIELD_MAP)) {
        if (pinyinName === pageNamePinyin && record[oldName] !== undefined) {
          const oldVal = Number(record[oldName] || 0);
          if (oldVal > 0) migrateDelta += oldVal;
          updateData[oldName] = db.command.remove();
        }
      }

      if (migrateDelta > 0) {
        updateData[pageNamePinyin] = db.command.inc(1 + migrateDelta);
      }

      // 一次性清理其他旧字段（避免后续读取歧义）
      const allOldFields = Object.keys(OLD_FIELD_MAP);
      for (const oldField of allOldFields) {
        if (record[oldField] !== undefined && updateData[oldField] === undefined) {
          updateData[oldField] = db.command.remove();
        }
      }

      await db.collection('fenxishuju').doc(record._id).update({
        data: updateData
      });
      console.log(`[updatePageVisit] ✅ 已原子更新 ${pageNamePinyin}`);
    } else {
      // 创建新记录
      const initialData = {
        _openid: openid,
        [pageNamePinyin]: 1,
        createTime: now,
        updateTime: now
      };
      
      await db.collection('fenxishuju').add({
        data: initialData
      });
      
      console.log(`[updatePageVisit] ✅ 已创建新记录，${pageNamePinyin}: 1`);
    }
    
    return { success: true, pageName: pageNamePinyin };
  } catch (err) {
    console.error('[updatePageVisit] ❌ 更新访问统计失败:', err);
    return { success: false, error: err.message };
  }
};
