const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

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

function resolvePublicBase(bucket, region) {
  let base = getEnv('COS_PUBLIC_DOMAIN');
  if (base && /\.tcb\.qcloud\.la/i.test(base)) base = '';
  const useAcc =
    getEnv('COS_PUBLIC_USE_ACCELERATE') === '1' ||
    /^true$/i.test(getEnv('COS_PUBLIC_USE_ACCELERATE'));
  if (!base) {
    const fallback = useAcc
      ? `https://${bucket}.cos.accelerate.myqcloud.com`
      : `https://${bucket}.cos.${region}.myqcloud.com`;
    return { publicBase: fallback };
  }
  return { publicBase: base };
}

function shouldUseAccelerateHost() {
  return (
    getEnv('COS_PUBLIC_USE_ACCELERATE') === '1' ||
    /^true$/i.test(getEnv('COS_PUBLIC_USE_ACCELERATE'))
  );
}

const MAX_OBJECT_BYTES = 1024 * 1024 * 1024; // 1GB 上限（与客户端一致）
const MIN_PART_SIZE = 1024 * 1024; // COS 除末块外最小 1MB
const MAX_PART_SIZE = 256 * 1024 * 1024; // 单块上限（SDK/服务端保护）
const OBJECT_ACL = 'public-read';

function makeCos() {
  const secretId = getEnv('COS_SECRET_ID');
  const secretKey = getEnv('COS_SECRET_KEY');
  if (!secretId || !secretKey) {
    throw new Error('缺少 COS_SECRET_ID/COS_SECRET_KEY');
  }
  return new COS({ SecretId: secretId, SecretKey: secretKey });
}

function presignPartUrlSync(cos, bucket, region, key, uploadId, partNumber, expires) {
  try {
    const url = cos.getObjectUrl({
      Bucket: bucket,
      Region: region,
      Key: key,
      Sign: true,
      Method: 'PUT',
      UseAccelerate: shouldUseAccelerateHost(),
      Expires: expires || 7200,
      Query: {
        partNumber: String(partNumber),
        uploadId: String(uploadId)
      }
    });
    if (typeof url === 'string') return url;
    if (url && typeof url === 'object' && url.Url) return url.Url;
    return '';
  } catch (e) {
    return '';
  }
}

exports.main = async (event = {}) => {
  try {
    const action = String(event.action || 'init');
    const secretId = getEnv('COS_SECRET_ID');
    const secretKey = getEnv('COS_SECRET_KEY');
    const bucket = normalizeBucket(getEnv('COS_BUCKET'));
    const region = getEnv('COS_REGION');

    if (!secretId || !secretKey || !bucket || !region) {
      return {
        success: false,
        message: '缺少 COS 环境变量，请配置 COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET/COS_REGION（与 getCosUploadUrl 相同）'
      };
    }

    const cos = makeCos();

    if (action === 'init') {
      const extRaw = String(event.ext || '.bin').toLowerCase();
      const ext = extRaw.startsWith('.') ? extRaw : `.${extRaw}`;
      const folderRaw = String(event.folder || 'uploads').replace(/^\/+|\/+$/g, '');
      const folder = folderRaw || 'uploads';
      const contentType = String(event.contentType || 'application/octet-stream');
      const fileSize = Number(event.fileSize);
      let partSize = Number(event.partSize) || 8 * 1024 * 1024;

      if (!Number.isFinite(fileSize) || fileSize <= 0) {
        return { success: false, message: '缺少有效的 fileSize' };
      }
      if (fileSize > MAX_OBJECT_BYTES) {
        return { success: false, message: '单文件最大支持 1GB，请压缩或剪辑后再上传' };
      }
      if (partSize < MIN_PART_SIZE || partSize > MAX_PART_SIZE) {
        return { success: false, message: 'partSize 不合法' };
      }

      const partCount = Math.ceil(fileSize / partSize);
      if (partCount < 1 || partCount > 2048) {
        return { success: false, message: '分块数量异常' };
      }

      const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;

      const initRes = await new Promise((resolve, reject) => {
        cos.multipartInit(
          {
            Bucket: bucket,
            Region: region,
            Key: key,
            ContentType: contentType,
            ACL: OBJECT_ACL
          },
          (err, data) => (err ? reject(err) : resolve(data))
        );
      });

      const uploadId = initRes && initRes.UploadId;
      if (!uploadId) {
        return { success: false, message: '初始化分片上传失败（无 UploadId）' };
      }

      const partUrls = [];
      for (let p = 1; p <= partCount; p += 1) {
        const url = presignPartUrlSync(cos, bucket, region, key, uploadId, p, 7200);
        if (!url) {
          try {
            await new Promise((resolve) => {
              cos.multipartAbort(
                { Bucket: bucket, Region: region, Key: key, UploadId: uploadId },
                () => resolve()
              );
            });
          } catch (e) {
            /* ignore */
          }
          return { success: false, message: '生成分片上传地址失败' };
        }
        partUrls.push(url);
      }

      const { publicBase } = resolvePublicBase(bucket, region);
      const publicUrl = `${publicBase.replace(/\/+$/g, '')}/${key}`;

      return {
        success: true,
        key,
        uploadId,
        partSize,
        partCount,
        partUrls,
        publicUrl,
        contentType
      };
    }

    if (action === 'complete') {
      const key = String(event.key || '');
      const uploadId = String(event.uploadId || '');
      const rawParts = Array.isArray(event.parts) ? event.parts : [];
      if (!key || !uploadId || !rawParts.length) {
        return { success: false, message: 'complete 缺少 key/uploadId/parts' };
      }

      const parts = rawParts
        .map((p) => ({
          PartNumber: Number(p.PartNumber != null ? p.PartNumber : p.partNumber),
          ETag: String(p.ETag != null ? p.ETag : p.etag || '')
        }))
        .filter((p) => p.PartNumber > 0 && p.ETag)
        .sort((a, b) => a.PartNumber - b.PartNumber);

      if (!parts.length) {
        return { success: false, message: 'parts 无效' };
      }

      await new Promise((resolve, reject) => {
        cos.multipartComplete(
          {
            Bucket: bucket,
            Region: region,
            Key: key,
            UploadId: uploadId,
            Parts: parts
          },
          (err, data) => (err ? reject(err) : resolve(data))
        );
      });

      const { publicBase } = resolvePublicBase(bucket, region);
      const publicUrl = `${publicBase.replace(/\/+$/g, '')}/${key}`;
      return { success: true, publicUrl, key };
    }

    if (action === 'abort') {
      const key = String(event.key || '');
      const uploadId = String(event.uploadId || '');
      if (!key || !uploadId) {
        return { success: false, message: 'abort 缺少 key/uploadId' };
      }
      await new Promise((resolve) => {
        cos.multipartAbort(
          { Bucket: bucket, Region: region, Key: key, UploadId: uploadId },
          () => resolve()
        );
      });
      return { success: true };
    }

    return { success: false, message: `未知 action: ${action}` };
  } catch (err) {
    return {
      success: false,
      message: err && err.message ? err.message : '分片断点上传失败'
    };
  }
};
