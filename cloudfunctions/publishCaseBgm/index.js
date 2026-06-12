const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

const KEY = 'case/bgm/case-bgm.mp3';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function getEnv(name) {
  return (process.env[name] || '').trim();
}

function normalizeBucket(bucket) {
  return String(bucket || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\.cos\..*$/i, '')
    .replace(/\/+$/g, '');
}

function resolvePublicBase(bucket, region) {
  let base = getEnv('COS_PUBLIC_DOMAIN');
  if (base && /\.tcb\.qcloud\.la/i.test(base)) base = '';
  if (!base) {
    const useAcc = getEnv('COS_PUBLIC_USE_ACCELERATE') === '1';
    base = useAcc
      ? `https://${bucket}.cos.accelerate.myqcloud.com`
      : `https://${bucket}.cos.${region}.myqcloud.com`;
  }
  return base.replace(/\/+$/, '');
}

exports.main = async () => {
  const secretId = getEnv('COS_SECRET_ID');
  const secretKey = getEnv('COS_SECRET_KEY');
  const bucket = normalizeBucket(getEnv('COS_BUCKET') || 'mt-1392958388');
  const region = getEnv('COS_REGION') || 'ap-guangzhou';

  if (!secretId || !secretKey) {
    return { ok: false, errMsg: '缺少 COS_SECRET_ID / COS_SECRET_KEY（与 getCosUploadUrl 相同）' };
  }

  const localPath = path.join(__dirname, 'case-bgm.mp3');
  if (!fs.existsSync(localPath)) {
    return { ok: false, errMsg: '云函数目录缺少 case-bgm.mp3' };
  }

  const body = fs.readFileSync(localPath);
  if (!body.length) {
    return { ok: false, errMsg: 'case-bgm.mp3 为空' };
  }

  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  await new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: KEY,
        Body: body,
        ContentType: 'audio/mpeg',
        ACL: 'public-read'
      },
      (err) => (err ? reject(err) : resolve())
    );
  });

  const audioUrl = `${resolvePublicBase(bucket, region)}/${KEY}`;

  try {
    await db.collection('config').doc('case_bgm').set({
      data: {
        audioUrl,
        updatedAt: db.serverDate()
      }
    });
  } catch (e) {
    try {
      await db.collection('config').doc('case_bgm').update({
        data: { audioUrl, updatedAt: db.serverDate() }
      });
    } catch (e2) {
      return {
        ok: true,
        audioUrl,
        size: body.length,
        warn: 'COS 已上传，但写入 config/case_bgm 失败，请手动填 audioUrl',
        dbErr: e2.message || String(e2)
      };
    }
  }

  return { ok: true, audioUrl, size: body.length, key: KEY };
};
