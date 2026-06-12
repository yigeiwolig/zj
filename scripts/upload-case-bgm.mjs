/**
 * 一次性上传案例 BGM 到 COS（与 getCosUploadUrl 同桶）
 *
 * 用法（PowerShell，密钥与云函数环境变量相同）：
 *   $env:COS_SECRET_ID="你的SecretId"
 *   $env:COS_SECRET_KEY="你的SecretKey"
 *   $env:COS_BUCKET="mt-1392958388"
 *   $env:COS_REGION="ap-guangzhou"
 *   node scripts/upload-case-bgm.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import COS from '../cloudfunctions/getCosUploadUrl/node_modules/cos-nodejs-sdk-v5/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MP3 = path.join(ROOT, 'assets', 'audio', 'case-bgm.mp3');
const KEY = 'case/bgm/case-bgm.mp3';

const secretId = process.env.COS_SECRET_ID || '';
const secretKey = process.env.COS_SECRET_KEY || '';
const bucket = (process.env.COS_BUCKET || 'mt-1392958388').trim();
const region = (process.env.COS_REGION || 'ap-guangzhou').trim();

if (!secretId || !secretKey) {
  console.error('请设置 COS_SECRET_ID 和 COS_SECRET_KEY（与云开发云函数环境变量相同）');
  process.exit(1);
}
if (!fs.existsSync(MP3)) {
  console.error('找不到', MP3);
  process.exit(1);
}

const body = fs.readFileSync(MP3);
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

const publicUrl = `https://${bucket}.cos.${region}.myqcloud.com/${KEY}`;
console.log('上传成功:', publicUrl);
console.log('\n请在云数据库 config / case_bgm 写入：');
console.log(JSON.stringify({ _id: 'case_bgm', audioUrl: publicUrl }, null, 2));
