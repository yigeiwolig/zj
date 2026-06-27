const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const DELETE_KEY_RE = /^(video_go|video\/user|case|shop|uploads|hub|proofs|repair|repair_image|tutorial|avatar|home|azjc|shouhou|paihang|mt_products|products|can-capture|can-config)(\/|$)/;

function getEnv(name) {
  return (process.env[name] || '').trim();
}

function shouldUseAccelerateHost() {
  return (
    getEnv('COS_PUBLIC_USE_ACCELERATE') === '1' ||
    /^true$/i.test(getEnv('COS_PUBLIC_USE_ACCELERATE'))
  );
}

function normalizeBucket(bucket) {
  const raw = String(bucket || '').trim();
  if (!raw) return '';
  // 兼容用户误填：可能写成 bucket-appid.cos.ap-region.myqcloud.com
  return raw
    .replace(/^https?:\/\//i, '')
    .replace(/\.cos\..*$/i, '')
    .replace(/\/+$/g, '');
}

const OBJECT_ACL = 'public-read';

/** 与 PUT 的桶一致的可读直链域名（勿填云开发 *.tcb.qcloud.la，否则会 403） */
function resolvePublicBase(bucket, region) {
  let base = getEnv('COS_PUBLIC_DOMAIN');
  let note = '';
  if (base && /\.tcb\.qcloud\.la/i.test(base)) {
    note = 'COS_PUBLIC_DOMAIN 为云开发静态域名，已忽略并改用 COS 桶默认域名（文件实际在 COS，与 tcb 域名不一致会导致 403）';
    base = '';
  }
  const useAcc = shouldUseAccelerateHost();
  if (!base) {
    const fallback = useAcc
      ? `https://${bucket}.cos.accelerate.myqcloud.com`
      : `https://${bucket}.cos.${region}.myqcloud.com`;
    return { publicBase: fallback, note: note || (useAcc ? '使用桶全球加速默认域名' : '使用桶地域默认域名（未配置 COS_PUBLIC_DOMAIN）') };
  }
  return { publicBase: base, note: note || '使用 COS_PUBLIC_DOMAIN' };
}

const ALLOWED_FOLDERS = new Set([
  'shop/topMedia',
  'shop/accessories',
  'shop/series',
  'shop/detailMedia',
  'shop/covers',
  'shop/options',
  'shop/compare_videos',
  'hub/home',
  'uploads',
  'mt_products',
  'products',
  'proofs',
  'repair',
  'repair_image',
  'tutorial',
  'case',
  'avatar',
  'home',
  'azjc',
  'shouhou',
  'paihang',
  'video_go',
  'can-capture',
  'can-config'
])

/** 云函数直传上限（避免 callFunction 体过大） */
const MAX_CLOUD_PUT_BYTES = 4 * 1024 * 1024

function normalizeFolder(raw) {
  const folder = String(raw || 'uploads').replace(/^\/+|\/+$/g, '') || 'uploads'
  const base = folder.split('/')[0] === 'shop' ? folder.replace(/^shop\/+/, 'shop/') : folder
  for (const allowed of ALLOWED_FOLDERS) {
    if (base === allowed || base.startsWith(allowed + '/')) return base
  }
  return 'uploads'
}

function makeCosClient(secretId, secretKey) {
  return new COS({ SecretId: secretId, SecretKey: secretKey })
}

function buildObjectKey(event) {
  const extRaw = String(event.ext || '.jpg').toLowerCase()
  const ext = extRaw.startsWith('.') ? extRaw : `.${extRaw}`
  const folder = normalizeFolder(event.folder || 'uploads')
  const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`
  const contentType = String(event.contentType || 'image/jpeg')
  return { ext, folder, key, contentType }
}

function putObjectViaCloud(cos, bucket, region, key, body, contentType) {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: OBJECT_ACL
      },
      (err) => {
        if (err) reject(err)
        else resolve()
      }
    )
  })
}

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get()
  if (byOpenid.data.length > 0) return OPENID
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return OPENID
  throw new Error('FORBIDDEN')
}

async function isAdminOpenid(openid) {
  if (!openid) return false
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return true
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  return bySystemOpenid.data.length > 0
}

/** 云函数互调时 OPENID 可能丢失，支持内部密钥或父函数已校验的管理员 openid */
async function verifyDeletePermission(event) {
  const internalSecret = getEnv('INTERNAL_CALL_SECRET')
  if (internalSecret && event && event._internalSecret === internalSecret) {
    return true
  }
  if (event && event._trustedAdminOpenid && await isAdminOpenid(event._trustedAdminOpenid)) {
    return true
  }
  await assertAdmin()
  return true
}

function isCosNotFoundError(err) {
  const code = String((err && err.code) || '')
  const status = Number(err && err.statusCode)
  const msg = String((err && err.message) || err || '')
  return status === 404 || code === 'NoSuchKey' || msg.indexOf('NoSuchKey') >= 0
}

function sanitizeDeleteKeys(rawKeys) {
  const keys = [...new Set((Array.isArray(rawKeys) ? rawKeys : []).map((k) => String(k || '').replace(/^\/+/, '').trim()).filter(Boolean))]
  return keys.filter((key) => DELETE_KEY_RE.test(key))
}

async function handleDeleteObjects(event) {
  try {
    await verifyDeletePermission(event)
  } catch (e) {
    const msg = String((e && e.message) || e || '')
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, message: '无管理员权限' }
    }
    return { success: false, message: msg }
  }

  const secretId = getEnv('COS_SECRET_ID')
  const secretKey = getEnv('COS_SECRET_KEY')
  const bucket = normalizeBucket(getEnv('COS_BUCKET'))
  const region = getEnv('COS_REGION')
  if (!secretId || !secretKey || !bucket || !region) {
    return {
      success: false,
      message: '缺少 COS 环境变量，请配置 COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET/COS_REGION'
    }
  }

  const keys = sanitizeDeleteKeys(event.keys)
  if (!keys.length) {
    return { success: true, deleted: 0, failed: [] }
  }

  const cos = makeCosClient(secretId, secretKey)
  let deleted = 0
  const failed = []

  for (const key of keys) {
    try {
      await new Promise((resolve, reject) => {
        cos.deleteObject({ Bucket: bucket, Region: region, Key: key }, (err, data) =>
          err ? reject(err) : resolve(data)
        )
      })
      deleted += 1
    } catch (err) {
      if (isCosNotFoundError(err)) {
        deleted += 1
        continue
      }
      console.warn('[getCosUploadUrl] deleteObject failed:', key, err)
      failed.push(key)
    }
  }

  if (failed.length) {
    return {
      success: false,
      message: `COS 删除失败（${failed.length} 个）`,
      deleted,
      failed
    }
  }

  return { success: true, deleted, failed: [] }
}

const CAN_LEARN_COS_PREFIXES = ['can-capture/', 'can-config/'];
const CAN_LEARN_COLLECTIONS = ['can_capture_sessions', 'can_moto_profiles'];
const DB_FETCH_BATCH = 100;
const DB_IN_LIMIT = 20;

async function deleteCosByPrefix(cos, bucket, region, prefix) {
  let deleted = 0;
  let marker = '';
  while (true) {
    const params = { Bucket: bucket, Region: region, Prefix: prefix, MaxKeys: 1000 };
    if (marker) params.Marker = marker;
    const listData = await new Promise((resolve, reject) => {
      cos.getBucket(params, (err, data) => (err ? reject(err) : resolve(data)));
    });
    const contents = listData.Contents || [];
    if (!contents.length) break;
    const objects = contents.map((c) => ({ Key: c.Key }));
    await new Promise((resolve, reject) => {
      cos.deleteMultipleObject(
        { Bucket: bucket, Region: region, Objects: objects },
        (err, data) => (err ? reject(err) : resolve(data))
      );
    });
    deleted += objects.length;
    if (!listData.IsTruncated) break;
    marker = listData.NextMarker || contents[contents.length - 1].Key;
  }
  return deleted;
}

async function removeCollectionAll(collectionName) {
  let deleted = 0;
  while (true) {
    const res = await db.collection(collectionName).field({ _id: true }).limit(DB_FETCH_BATCH).get();
    const rows = res.data || [];
    if (!rows.length) break;
    const ids = rows.map((doc) => doc._id);
    for (let i = 0; i < ids.length; i += DB_IN_LIMIT) {
      const chunk = ids.slice(i, i + DB_IN_LIMIT);
      const del = await db.collection(collectionName).where({ _id: _.in(chunk) }).remove();
      deleted += del.stats.removed || 0;
    }
    if (rows.length < DB_FETCH_BATCH) break;
  }
  return deleted;
}

async function handleClearCanLearnData(event) {
  try {
    await verifyDeletePermission(event);
  } catch (e) {
    const msg = String((e && e.message) || e || '');
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, message: '无管理员权限' };
    }
    return { success: false, message: msg };
  }

  const secretId = getEnv('COS_SECRET_ID');
  const secretKey = getEnv('COS_SECRET_KEY');
  const bucket = normalizeBucket(getEnv('COS_BUCKET'));
  const region = getEnv('COS_REGION');

  let cosDeleted = 0;
  const cosDetails = [];

  if (secretId && secretKey && bucket && region) {
    const cos = makeCosClient(secretId, secretKey);
    for (const prefix of CAN_LEARN_COS_PREFIXES) {
      try {
        const n = await deleteCosByPrefix(cos, bucket, region, prefix);
        cosDeleted += n;
        cosDetails.push({ prefix, deleted: n });
      } catch (err) {
        console.warn('[getCosUploadUrl] clearCanLearn prefix fail', prefix, err);
        cosDetails.push({ prefix, deleted: 0, error: err.message || String(err) });
      }
    }
  } else {
    cosDetails.push({ skipped: true, message: 'COS 未配置，已跳过' });
  }

  const dbDetails = [];
  let dbDeleted = 0;
  for (const name of CAN_LEARN_COLLECTIONS) {
    try {
      const n = await removeCollectionAll(name);
      dbDeleted += n;
      dbDetails.push({ collection: name, deleted: n });
    } catch (err) {
      console.warn('[getCosUploadUrl] clearCanLearn db fail', name, err);
      dbDetails.push({ collection: name, deleted: 0, error: err.message || String(err) });
    }
  }

  return {
    success: true,
    cosDeleted,
    dbDeleted,
    cosDetails,
    dbDetails,
    message: `已清空 CAN 数据：COS ${cosDeleted} 个文件，数据库 ${dbDeleted} 条`
  };
}

const CASE_BGM_KEY = 'case/bgm/case-bgm.mp3';

async function handlePublishCaseBgm() {
  const secretId = getEnv('COS_SECRET_ID');
  const secretKey = getEnv('COS_SECRET_KEY');
  const bucket = normalizeBucket(getEnv('COS_BUCKET'));
  const region = getEnv('COS_REGION');
  if (!secretId || !secretKey || !bucket || !region) {
    return {
      ok: false,
      success: false,
      errMsg: '缺少 COS 环境变量，请在云开发环境变量配置 COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET/COS_REGION'
    };
  }

  const localPath = path.join(__dirname, 'case-bgm.mp3');
  if (!fs.existsSync(localPath)) {
    return { ok: false, success: false, errMsg: '云函数目录缺少 case-bgm.mp3' };
  }

  const body = fs.readFileSync(localPath);
  if (!body.length) {
    return { ok: false, success: false, errMsg: 'case-bgm.mp3 为空' };
  }

  const cos = makeCosClient(secretId, secretKey);
  await putObjectViaCloud(cos, bucket, region, CASE_BGM_KEY, body, 'audio/mpeg');
  const { publicBase } = resolvePublicBase(bucket, region);
  const audioUrl = `${publicBase.replace(/\/+$/g, '')}/${CASE_BGM_KEY}`;

  try {
    await db.collection('config').doc('case_bgm').set({
      data: { audioUrl, updatedAt: db.serverDate() }
    });
  } catch (e) {
    try {
      await db.collection('config').doc('case_bgm').update({
        data: { audioUrl, updatedAt: db.serverDate() }
      });
    } catch (e2) {
      return {
        ok: true,
        success: true,
        via: 'publishCaseBgm',
        audioUrl,
        publicUrl: audioUrl,
        size: body.length,
        warn: 'COS 已上传，写入 config/case_bgm 失败，请手动填 audioUrl'
      };
    }
  }

  return { ok: true, success: true, via: 'publishCaseBgm', audioUrl, publicUrl: audioUrl, size: body.length, key: CASE_BGM_KEY };
}

exports.main = async (event = {}) => {
  try {
    if (String(event.action || '') === 'deleteObjects') {
      return await handleDeleteObjects(event)
    }

    if (String(event.action || '') === 'clearCanLearnData') {
      return await handleClearCanLearnData(event)
    }

    if (String(event.action || '') === 'publishCaseBgm') {
      return await handlePublishCaseBgm()
    }

    const { OPENID } = cloud.getWXContext()
    if (!OPENID) {
      return { success: false, message: '未登录，无法获取上传凭证' }
    }

    const secretId = getEnv('COS_SECRET_ID');
    const secretKey = getEnv('COS_SECRET_KEY');
    const bucket = normalizeBucket(getEnv('COS_BUCKET'));
    const region = getEnv('COS_REGION');

    if (!secretId || !secretKey || !bucket || !region) {
      return {
        success: false,
        message: '缺少 COS 环境变量，请配置 COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET/COS_REGION（COS_PUBLIC_DOMAIN 可选，见文档）'
      };
    }

    // bucket 建议格式：bucketName-appid（通常 appid 为纯数字）
    if (!/-\d{5,}$/.test(bucket)) {
      return {
        success: false,
        message: `COS_BUCKET 格式疑似不正确：${bucket}。应为完整 bucket 名（例如 bucketname-1250000000）`
      };
    }

    const cos = makeCosClient(secretId, secretKey)
    const { key, contentType } = buildObjectKey(event)

    // 小程序未配置 COS request 合法域名时，小文件可走云函数直传（免客户端 PUT）
    if (String(event.action || '') === 'putObject') {
      const rawB64 = String(event.base64 || '').replace(/^data:[^;]+;base64,/, '').trim()
      if (!rawB64) {
        return { success: false, message: '缺少文件数据' }
      }
      const body = Buffer.from(rawB64, 'base64')
      if (!body.length) {
        return { success: false, message: '文件数据为空' }
      }
      if (body.length > MAX_CLOUD_PUT_BYTES) {
        return {
          success: false,
          message: `文件超过 ${Math.round(MAX_CLOUD_PUT_BYTES / 1024 / 1024)}MB，请在小程序后台配置 COS 为 request 合法域名后使用直传`
        }
      }
      await putObjectViaCloud(cos, bucket, region, key, body, contentType)
      const { publicBase, note } = resolvePublicBase(bucket, region)
      const publicUrl = `${publicBase.replace(/\/+$/g, '')}/${key}`
      return {
        success: true,
        publicUrl,
        key,
        contentType,
        via: 'cloudPutObject',
        debug: { publicBase, publicUrlNote: note }
      }
    }

    const uploadUrl = cos.getObjectUrl({
      Bucket: bucket,
      Region: region,
      Key: key,
      Sign: true,
      Method: 'PUT',
      Expires: 1200,
      UseAccelerate: shouldUseAccelerateHost(),
      Headers: {
        'x-cos-acl': OBJECT_ACL
      }
    });

    const { publicBase, note } = resolvePublicBase(bucket, region);
    const publicUrl = `${publicBase.replace(/\/+$/g, '')}/${key}`;

    return {
      success: true,
      uploadUrl,
      publicUrl,
      key,
      contentType,
      uploadHeaders: {
        'x-cos-acl': OBJECT_ACL
      },
      debug: {
        bucket,
        region,
        host: uploadUrl.split('?')[0],
        publicBase,
        publicUrlNote: note
      }
    };
  } catch (err) {
    return {
      success: false,
      message: err && err.message ? err.message : '生成 COS 上传地址失败'
    };
  }
};
