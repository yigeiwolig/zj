const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/** 与 miniprogram/utils/clearAllCollectionsMeta.js 保持同步 */
const COLLECTIONS_TO_CLEAR = [
  // 商城与订单（shop_orders 优先清空，避免超时后订单残留）
  'shop_orders',
  'shop_series',
  'shop_accessories',
  'shop_config',
  'products',
  'logistics_cache',
  // 邀请与优惠券
  'user_coupons',
  'referral_codes',
  'referral_bindings',
  'referral_rewards',
  // 售后与维修
  'shouhou',
  'shouhou_repair',
  'shouhou_read',
  'shouhouvideo',
  'shouhouguoqi',
  // 设备与延保
  'sn',
  'guanliyuanSN',
  'pending_warranty',
  'my_read',
  'ota_connections',
  // 案例与视频
  'video',
  'video_go',
  'config',
  // 内容与教程
  'home',
  'azjc',
  'chakan',
  'faq_items',
  // 用户与登录
  'user_list',
  'valid_users',
  'login_logs',
  'login_logbutton',
  'blocked_logs',
  'rate_limit_logs',
  // 风控与统计
  'fenxishuju',
  'suspicious_user_sessions',
  'screenshot_risk_queue',
  'suspicious_review_archive',
  'moto_records_cloud',
  // 其它
  'system_config'
];

const PRESERVED_COLLECTIONS = ['app_config', 'guanliyuan'];

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

  while (true) {
    const listData = await new Promise((resolve, reject) => {
      cos.getBucket({ Bucket: bucket, Region: region, MaxKeys: 1000 }, (err, data) =>
        err ? reject(err) : resolve(data)
      );
    });

    const contents = listData.Contents || [];
    if (contents.length === 0) break;

    const objects = contents.map((c) => ({ Key: c.Key }));
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

/** 微信云数据库 where.in 数组最多 20 个元素 */
const IN_QUERY_LIMIT = 20;
const FETCH_BATCH_SIZE = 100;

async function removeIdsInChunks(collectionName, ids) {
  let removed = 0;
  for (let i = 0; i < ids.length; i += IN_QUERY_LIMIT) {
    const chunk = ids.slice(i, i + IN_QUERY_LIMIT);
    const deleteRes = await db.collection(collectionName)
      .where({ _id: _.in(chunk) })
      .remove();
    removed += deleteRes.stats.removed || 0;
  }
  return removed;
}

async function clearAllDatabaseCollections() {
  const collectionsToClear = COLLECTIONS_TO_CLEAR.slice();
  const results = {
    success: [],
    failed: [],
    totalDeleted: 0
  };

  for (const collectionName of collectionsToClear) {
    try {
      let deletedCount = 0;
      while (true) {
        const res = await db.collection(collectionName)
          .field({ _id: true })
          .limit(FETCH_BATCH_SIZE)
          .get();
        const rows = res.data || [];
        if (rows.length === 0) break;
        const ids = rows.map((doc) => doc._id);
        deletedCount += await removeIdsInChunks(collectionName, ids);
        if (rows.length < FETCH_BATCH_SIZE) break;
      }

      results.success.push({
        collection: collectionName,
        deleted: deletedCount
      });
      results.totalDeleted += deletedCount;
      console.log(
        deletedCount > 0
          ? `✅ 清空集合 ${collectionName} 成功，共删除 ${deletedCount} 条`
          : `ℹ️ 集合 ${collectionName} 为空，跳过`
      );
    } catch (err) {
      results.failed.push({
        collection: collectionName,
        error: err.message || err.errMsg || '未知错误'
      });
      console.error(`❌ 清空集合 ${collectionName} 失败:`, err);
    }
  }

  return {
    results,
    collectionCount: collectionsToClear.length,
    clearedCollections: collectionsToClear
  };
}

exports.main = async (event, context) => {
  const { password } = event;
  const phase = (event && event.phase) ? String(event.phase).toLowerCase() : 'all';

  try {
    await assertAdmin();
  } catch (err) {
    return { success: false, error: '无管理员权限' };
  }

  const adminPassword = getEnv('CLEAR_ALL_PASSWORD');
  if (!adminPassword || password !== adminPassword) {
    return { success: false, error: '密码错误' };
  }

  let results = { success: [], failed: [], totalDeleted: 0 };
  let collectionCount = 0;
  let clearedCollections = [];

  if (phase === 'db' || phase === 'all') {
    const dbOut = await clearAllDatabaseCollections();
    results = dbOut.results;
    collectionCount = dbOut.collectionCount;
    clearedCollections = dbOut.clearedCollections;
  }

  let cosResult = { skipped: true, message: '本阶段未清空存储桶' };
  if (phase === 'cos' || phase === 'all') {
    try {
      cosResult = await emptyCosBucket();
    } catch (cosErr) {
      cosResult = {
        skipped: false,
        error: cosErr.message || String(cosErr),
        deleted: 0
      };
    }
  }

  const successCount = results.success.length;
  const failCount = results.failed.length;
  const totalDeleted = results.totalDeleted;
  let message = '';
  if (phase === 'db') {
    message = `数据库清空完成：成功 ${successCount} 个集合，失败 ${failCount} 个，共删除 ${totalDeleted} 条`;
  } else if (phase === 'cos') {
    message = cosResult.skipped
      ? `存储桶：${cosResult.message || '已跳过'}`
      : `存储桶清空完成，已删 ${cosResult.deleted || 0} 个对象`;
  } else {
    message = `清空完成！成功 ${successCount} 个集合，失败 ${failCount} 个，共删除 ${totalDeleted} 条数据`;
  }

  return {
    success: true,
    phase,
    results,
    cos: cosResult,
    preservedCollections: PRESERVED_COLLECTIONS,
    clearedCollections,
    collectionCount,
    message
  };
};
