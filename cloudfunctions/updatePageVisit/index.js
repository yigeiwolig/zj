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
    // 查找该用户的记录
    const recordRes = await db.collection('fenxishuju')
      .where({ _openid: openid })
      .limit(1)
      .get();
    
    const now = db.serverDate();
    
    if (recordRes.data && recordRes.data.length > 0) {
      // 更新现有记录
      const record = recordRes.data[0];
      
      // 🔴 兼容旧数据：如果存在中文字段名或英文字段名，尝试迁移到拼音字段名
      // 旧字段名映射（仅用于读取旧数据，新数据必须使用拼音）
      const OLD_FIELD_MAP = {
        // 中文字段名 → 拼音
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
      
      // 🔴 检查是否存在对应的旧字段名（用于数据迁移）
      let hasOldField = false;
      let oldFieldName = null;
      let oldFieldValue = 0;
      
      // 检查中文字段和英文字段
      for (const [oldName, pinyinName] of Object.entries(OLD_FIELD_MAP)) {
        if (pinyinName === pageNamePinyin && record[oldName] !== undefined) {
          hasOldField = true;
          oldFieldName = oldName;
          oldFieldValue = record[oldName] || 0;
          break;
        }
      }
      
      // 计算当前计数（合并旧字段和拼音字段的值）
      const pinyinCount = record[pageNamePinyin] || 0;
      const totalCount = pinyinCount + oldFieldValue;
      const newCount = totalCount + 1;
      
      // 准备更新数据
      const updateData = {
        [pageNamePinyin]: newCount,
        updateTime: now
      };
      
      // 🔴 如果存在旧的字段（中文或英文），删除它（使用 remove 命令）
      if (hasOldField && oldFieldName) {
        updateData[oldFieldName] = db.command.remove();
        console.log(`[updatePageVisit] 🔄 发现旧的字段 "${oldFieldName}"，正在迁移到 "${pageNamePinyin}"`);
        console.log(`[updatePageVisit] 📊 合并数据：旧字段=${oldFieldValue}, 拼音=${pinyinCount}, 总计=${newCount}`);
      }
      
      // 🔴 同时检查并删除所有其他旧字段（一次性清理所有旧数据）
      const allOldFields = Object.keys(OLD_FIELD_MAP);
      for (const oldField of allOldFields) {
        if (record[oldField] !== undefined && oldField !== oldFieldName) {
          updateData[oldField] = db.command.remove();
          console.log(`[updatePageVisit] 🗑️ 删除其他旧字段: "${oldField}"`);
        }
      }
      
      // 执行更新
      await db.collection('fenxishuju').doc(record._id).update({
        data: updateData
      });
      
      if (hasOldField) {
        console.log(`[updatePageVisit] ✅ 已迁移并更新 ${pageNamePinyin} 访问次数: ${newCount}`);
        return { success: true, pageName: pageNamePinyin, migrated: true };
      } else {
        console.log(`[updatePageVisit] ✅ 已更新 ${pageNamePinyin} 访问次数: ${newCount}`);
      }
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
      
      console.log(`[updatePageVisit] ✅ 已创建新记录，${pageNamePinyin} 访问次数: 1`);
    }
    
    return { success: true, pageName: pageNamePinyin };
  } catch (err) {
    console.error('[updatePageVisit] ❌ 更新访问统计失败:', err);
    return { success: false, error: err.message };
  }
};
