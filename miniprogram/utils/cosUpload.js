/**
 * 小程序端 COS 直传（依赖云函数 getCosUploadUrl）。
 * 写入数据库请使用返回的 publicUrl（https），读侧可直接绑定 image/video，无需 getTempFileURL。
 *
 * 部署：云函数环境变量 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION / COS_PUBLIC_DOMAIN
 * 域名：小程序后台把实际用于访问图片/视频的 COS 域名（默认桶域名、CDN 或 COS_PUBLIC_DOMAIN）配进 downloadFile、request 合法域名。云函数可省略 COS_PUBLIC_DOMAIN 时使用桶默认域名；勿将 *.tcb.qcloud.la 填为 COS_PUBLIC_DOMAIN（会 403）。
 */

function readBinaryForCos(readablePath) {
  return new Promise((resolve, reject) => {
    const p = String(readablePath || '');
    if (p.indexOf('http://tmp/') === 0 || /^https?:\/\//.test(p)) {
      wx.request({
        url: p,
        method: 'GET',
        responseType: 'arraybuffer',
        success: res => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.data) resolve(res.data);
          else reject(new Error(`读取临时文件失败: ${res.statusCode || ''}`));
        },
        fail: reject
      });
      return;
    }
    wx.getFileSystemManager().readFile({
      filePath: p,
      success: r => resolve(r.data),
      fail: reject
    });
  });
}

function inferContentType(ext) {
  const e = (ext || '.bin').toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4'
  };
  return map[e] || 'application/octet-stream';
}

/**
 * @param {string} filePath 本地临时路径
 * @param {{ folder: string, ext?: string, contentType?: string }} options folder 如 case/shooting-guide
 * @returns {Promise<string>} publicUrl
 */
function uploadLocalFileToCos(filePath, options = {}) {
  const folder = String(options.folder || 'uploads').replace(/^\/+|\/+$/g, '') || 'uploads';
  const extMatch = String(filePath || '').match(/\.[^.]+?$/i);
  const extRaw = (options.ext || (extMatch ? extMatch[0] : '.bin')).toLowerCase();
  const ext = extRaw.startsWith('.') ? extRaw : `.${extRaw}`;
  const contentType = options.contentType || inferContentType(ext);

  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callFunction) {
      reject(new Error('wx.cloud 未就绪'));
      return;
    }
    wx.cloud
      .callFunction({
        name: 'getCosUploadUrl',
        data: { folder, ext, contentType }
      })
      .then(signRes => {
        const payload = (signRes && signRes.result) || {};
        if (!payload.success || !payload.uploadUrl || !payload.publicUrl) {
          reject(new Error(payload.message || '获取 COS 上传地址失败'));
          return;
        }
        readBinaryForCos(filePath)
          .then(bin => {
            wx.request({
              url: payload.uploadUrl,
              method: 'PUT',
              data: bin,
              header: { 'Content-Type': contentType },
              success: putRes => {
                if (putRes.statusCode >= 200 && putRes.statusCode < 300) resolve(payload.publicUrl);
                else reject(new Error(`COS 上传失败 HTTP ${putRes.statusCode}`));
              },
              fail: reject
            });
          })
          .catch(reject);
      })
      .catch(reject);
  });
}

function uploadImageToCos(filePath, folder) {
  const ext = (String(filePath).match(/\.[^.]+?$/i) || ['.jpg'])[0].toLowerCase();
  const e = ext.startsWith('.') ? ext : `.${ext}`;
  return uploadLocalFileToCos(filePath, {
    folder,
    ext: e,
    contentType: inferContentType(e)
  });
}

function uploadVideoToCos(filePath, folder) {
  const ext = (String(filePath).match(/\.[^.]+?$/i) || ['.mp4'])[0].toLowerCase();
  const e = ext.startsWith('.') ? ext : `.${ext}`;
  return uploadLocalFileToCos(filePath, {
    folder,
    ext: e,
    contentType: inferContentType(e)
  });
}

module.exports = {
  uploadLocalFileToCos,
  uploadImageToCos,
  uploadVideoToCos,
  readBinaryForCos,
  inferContentType
};
