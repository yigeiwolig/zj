const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

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

exports.main = async (event = {}) => {
  try {
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

    const extRaw = String(event.ext || '.jpg').toLowerCase();
    const ext = extRaw.startsWith('.') ? extRaw : `.${extRaw}`;
    const folderRaw = String(event.folder || 'shop/topMedia').replace(/^\/+|\/+$/g, '');
    const folder = folderRaw || 'shop/topMedia';
    const contentType = String(event.contentType || 'image/jpeg');
    const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;

    const cos = new COS({
      SecretId: secretId,
      SecretKey: secretKey
    });

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
