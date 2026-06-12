const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');
const https = require('https');
const http = require('http');

const DEFAULT_ENV = 'cloudbase-4gn1heip7c38ec6c';
const COS_KEY = 'case/bgm/case-bgm.mp3';
const OBJECT_ACL = 'public-read';

function initCloud(env) {
  cloud.init({ env: env || DEFAULT_ENV });
}

function getEnv(name) {
  return (process.env[name] || '').trim();
}

function isHttpUrl(src) {
  return /^https?:\/\//i.test(String(src || ''));
}

function isTcbHost(url) {
  return /\.tcb\.qcloud\.la/i.test(String(url || ''));
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
  if (base && isTcbHost(base)) base = '';
  if (!base) {
    const useAcc = getEnv('COS_PUBLIC_USE_ACCELERATE') === '1';
    return useAcc
      ? `https://${bucket}.cos.accelerate.myqcloud.com`
      : `https://${bucket}.cos.${region}.myqcloud.com`;
  }
  return base.replace(/\/+$/, '');
}

function isMp3Buffer(buf) {
  if (!buf || buf.length < 3) return false;
  const isId3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
  const isFrame = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
  return isId3 || isFrame;
}

function fetchUrlBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = String(url).startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchCloudFileBody(fileID) {
  let lastErr = null;
  try {
    const dl = await cloud.downloadFile({ fileID });
    if (dl && dl.fileContent && dl.fileContent.length > 0) {
      return { body: dl.fileContent, via: 'downloadFile' };
    }
    lastErr = new Error('downloadFile empty');
  } catch (e) {
    lastErr = e;
  }

  try {
    const urlRes = await cloud.getTempFileURL({ fileList: [fileID] });
    const row = urlRes.fileList && urlRes.fileList[0];
    if (!row || row.status !== 0 || !row.tempFileURL) {
      throw new Error((row && row.errMsg) || 'getTempFileURL failed');
    }
    const body = await fetchUrlBuffer(row.tempFileURL);
    return { body, via: 'tempFileURL' };
  } catch (e) {
    throw lastErr || e;
  }
}

async function uploadToCosPublic(body) {
  const secretId = getEnv('COS_SECRET_ID');
  const secretKey = getEnv('COS_SECRET_KEY');
  const bucket = normalizeBucket(getEnv('COS_BUCKET'));
  const region = getEnv('COS_REGION');
  if (!secretId || !secretKey || !bucket || !region) {
    throw new Error('缺少 COS 环境变量，请在 getCaseBgmResolve 配置 COS_SECRET_ID/COS_SECRET_KEY/COS_BUCKET/COS_REGION');
  }
  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  await new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: COS_KEY,
        Body: body,
        ContentType: 'audio/mpeg',
        ACL: OBJECT_ACL
      },
      (err) => (err ? reject(err) : resolve())
    );
  });
  return `${resolvePublicBase(bucket, region)}/${COS_KEY}`;
}

async function readCaseBgmConfig(db) {
  const cfg = await db.collection('config').doc('case_bgm').get();
  return (cfg && cfg.data) || {};
}

exports.main = async (event) => {
  const env = (event && event.env) || DEFAULT_ENV;
  initCloud(env);
  const db = cloud.database();

  let data = {};
  try {
    data = await readCaseBgmConfig(db);
  } catch (e) {
    return { ok: false, errMsg: '读取 config/case_bgm 失败', detail: e.message || String(e) };
  }

  const audioUrl = String(data.audioUrl || '').trim();
  const fileID = String((event && event.fileID) || data.audioFileID || '').trim();

  if (isHttpUrl(audioUrl) && !isTcbHost(audioUrl)) {
    return { ok: true, tempFileURL: audioUrl, source: 'audioUrl' };
  }

  if (!fileID.startsWith('cloud://')) {
    return { ok: false, errMsg: 'config/case_bgm 未配置有效的 audioFileID 或 COS audioUrl' };
  }

  try {
    const fetched = await fetchCloudFileBody(fileID);
    const body = fetched.body;
    const size = body ? body.length : 0;
    if (size < 4096 || !isMp3Buffer(body)) {
      return { ok: false, errMsg: '云存储 BGM 不是有效 MP3', size, fileID, via: fetched.via };
    }
    const publicUrl = await uploadToCosPublic(body);
    try {
      await db.collection('config').doc('case_bgm').update({
        data: {
          audioUrl: publicUrl,
          cosSyncedAt: db.serverDate()
        }
      });
    } catch (e) {
      // 写入失败不影响本次播放
    }
    return { ok: true, tempFileURL: publicUrl, source: 'cos', fileID, size, via: fetched.via };
  } catch (e) {
    return {
      ok: false,
      errMsg: e.errMsg || e.message || String(e),
      fileID,
      hint: '方案1: 云函数配置 COS 环境变量后重新部署；方案2: 手动上传 MP3 到 COS 的 case/bgm/case-bgm.mp3，在 case_bgm 填 audioUrl（COS 公开 HTTPS 链）'
    };
  }
};
