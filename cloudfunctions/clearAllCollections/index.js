const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { password } = event;
  
  // 验证密码
  if (password !== '123456') {
    return { success: false, error: '密码错误' };
  }

  // 需要清空的集合列表（排除 app_config、guanliyuan、shouhou）
  const collectionsToClear = [
    'azjc',
    'blocked_logs',
    'home',
    'login_logbutton',
    'login_logs',
    'moto_records_cloud',
    'my_read',
    'ota_connections',
    'products',
    'shop_accessories',
    'shop_config',
    'shop_orders',
    'shop_series',
    'shouhou_read',
    'shouhou_repair',
    'shouhouvideo',
    'sn',
    'system_config',
    'user_list',
    'valid_users',
    'video',
    'video_go'
  ];

  const results = {
    success: [],
    failed: [],
    totalDeleted: 0
  };

  // 遍历每个集合，批量删除所有文档
  for (const collectionName of collectionsToClear) {
    try {
      // 使用云函数的批量删除能力
      // 先获取所有文档的 _id
      const res = await db.collection(collectionName)
        .field({ _id: true })
        .get();

      if (res.data && res.data.length > 0) {
        // 分批删除（每次最多删除 500 条）
        const batchSize = 500;
        let deletedCount = 0;
        
        for (let i = 0; i < res.data.length; i += batchSize) {
          const batch = res.data.slice(i, i + batchSize);
          const ids = batch.map(doc => doc._id);
          
          // 批量删除
          const deleteRes = await db.collection(collectionName)
            .where({
              _id: _.in(ids)
            })
            .remove();
          
          deletedCount += deleteRes.stats.removed || 0;
        }

        results.success.push({
          collection: collectionName,
          deleted: deletedCount
        });
        results.totalDeleted += deletedCount;
        
        console.log(`✅ 清空集合 ${collectionName} 成功，共删除 ${deletedCount} 条数据`);
      } else {
        results.success.push({
          collection: collectionName,
          deleted: 0,
          message: '集合为空'
        });
        console.log(`ℹ️ 集合 ${collectionName} 为空，跳过`);
      }
    } catch (err) {
      results.failed.push({
        collection: collectionName,
        error: err.message || err.errMsg || '未知错误'
      });
      console.error(`❌ 清空集合 ${collectionName} 失败:`, err);
    }
  }

  return {
    success: true,
    results: results,
    message: `清空完成！成功 ${results.success.length} 个集合，失败 ${results.failed.length} 个集合，共删除 ${results.totalDeleted} 条数据`
  };
};
