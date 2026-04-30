const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function getEnv(name) {
  return (process.env[name] || '').trim();
}

function normalizeBucket(bucket) {
  const raw = String(bucket || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^https?:\/\//i, '')
    .replace(/\.cos\..*$/i, '')
    .replace(/\/+$/g, '');
}

/**
 * 清空 COS 桶内全部对象（与 getCosUploadUrl 使用同一套环境变量）
 */
async function emptyCosBucket() {
  const secretId = getEnv('COS_SECRET_ID');
  const secretKey = getEnv('COS_SECRET_KEY');
  const bucket = normalizeBucket(getEnv('COS_BUCKET'));
  const region = getEnv('COS_REGION');

  if (!secretId || !secretKey || !bucket || !region) {
    return {
      skipped: true,
      message: '未配置 COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET/COS_REGION，已跳过清空存储桶'
    };
  }

  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  let deleted = 0;

  // 每次从桶首取一批删除，直到列空（避免 Marker 分页差异）
  while (true) {
    const listData = await new Promise((resolve, reject) => {
      cos.getBucket({ Bucket: bucket, Region: region, MaxKeys: 1000 }, (err, data) =>
        err ? reject(err) : resolve(data)
      );
    });

    const contents = listData.Contents || [];
    if (contents.length === 0) break;

    const objects = contents.map(c => ({ Key: c.Key }));
    await new Promise((resolve, reject) => {
      cos.deleteMultipleObject(
        { Bucket: bucket, Region: region, Objects: objects },
        (err, data) => (err ? reject(err) : resolve(data))
      );
    });
    deleted += objects.length;
  }

  return { skipped: false, deleted, bucket, region };
}

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

exports.main = async (event, context) => {
  const { password } = event;
  const adminPassword = getEnv('CLEAR_ALL_PASSWORD');
  
  try {
    await assertAdmin();
  } catch (err) {
    return { success: false, error: '无管理员权限' };
  }

  // 验证密码（仅允许环境变量配置，不再使用硬编码默认密码）
  if (!adminPassword || password !== adminPassword) {
    return { success: false, error: '密码错误' };
  }

  // 需要清空的集合列表（排除 app_config、guanliyuan）
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
    'shouhou',           // 售后主集合
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

  let cosResult;
  try {
    cosResult = await emptyCosBucket();
  } catch (cosErr) {
    cosResult = {
      skipped: false,
      error: cosErr.message || String(cosErr),
      deleted: 0
    };
  }

  return {
    success: true,
    results: results,
    cos: cosResult,
    message: `清空完成！成功 ${results.success.length} 个集合，失败 ${results.failed.length} 个集合，共删除 ${results.totalDeleted} 条数据`
  };
};
