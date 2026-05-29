/**
 * 小程序端 COS 上传（小文件：getCosUploadUrl 单次 PUT；大文件：分片 + cosMultipartUpload，避免整文件进内存）。
 * 大于 MULTIPART_THRESHOLD 的本地文件自动走分片，最高 MAX_OBJECT_BYTES（1GB）。
 *
 * 部署：getCosUploadUrl（原有）+ cosMultipartUpload（新增，相同 COS 环境变量）
 * 播放：HTTPS 直链支持 Range；起播速度与码率、MP4 faststart 等相关。
 *
 * 仅上传腾讯云 COS（预签名 PUT / 分片），不使用微信云存储 wx.cloud.uploadFile 作为兜底。
 */

const MULTIPART_THRESHOLD = 8 * 1024 * 1024;
const PART_SIZE = 8 * 1024 * 1024;
const MAX_OBJECT_BYTES = 1024 * 1024 * 1024;
const PART_CONCURRENCY = 3;
const REQUEST_RETRY_TIMES = 3;
const SINGLE_PUT_RESIGN_RETRY = 1;

function isInterruptedRequestError(err) {
  const msg = String((err && err.errMsg) || err || '').toLowerCase();
  return msg.indexOf('interrupted') !== -1 || msg.indexOf('abort') !== -1;
}

function isRetryableRequestError(err) {
  const msg = String((err && err.errMsg) || err || '').toLowerCase();
  return (
    isInterruptedRequestError(err) ||
    msg.indexOf('timeout') !== -1 ||
    msg.indexOf('timed out') !== -1 ||
    msg.indexOf('network') !== -1 ||
    msg.indexOf('fail') !== -1 ||
    msg.indexOf('connection') !== -1 ||
    msg.indexOf('reset') !== -1 ||
    msg.indexOf('econn') !== -1
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** wxfile / 无 scheme 的本地绝对路径 */
function isBareLocalPath(p) {
  const s = String(p || '');
  if (!s) return false;
  if (s.indexOf('wxfile://') === 0) return true;
  if (!/^https?:\/\//i.test(s)) return true;
  return false;
}

/**
 * 开发者工具、真机「预览」里临时路径常为 http://tmp/* 或已展开的 http://127.0.0.1:端口/*
 * 必须用 FileSystemManager 读写，禁止 wx.request（非调试模式会报合法域名校验 / 127.0.0.1）
 */
function isPseudoLocalHttpPath(p) {
  const lower = String(p || '').toLowerCase();
  if (!lower) return false;
  if (lower.indexOf('http://tmp') === 0 || lower.indexOf('https://tmp') === 0) return true;
  if (lower.indexOf('http://usr') === 0 || lower.indexOf('https://usr') === 0) return true;
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(lower)) return true;
  return false;
}

function isDevtoolsEnv() {
  try {
    return (wx.getSystemInfoSync() || {}).platform === 'devtools';
  } catch (e) {
    return false;
  }
}

function shouldReadViaFileSystem(p) {
  return isBareLocalPath(p) || isPseudoLocalHttpPath(p);
}

async function requestWithRetry(options, retryTimes = REQUEST_RETRY_TIMES) {
  let lastErr = null;
  for (let i = 0; i <= retryTimes; i += 1) {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          ...options,
          success: resolve,
          fail: reject
        });
      });
      return res;
    } catch (err) {
      lastErr = err;
      if (!isRetryableRequestError(err) || i >= retryTimes) break;
      await sleep(280 * (i + 1));
    }
  }
  throw lastErr || new Error('请求失败');
}

function isRetryableHttpStatus(statusCode) {
  const code = Number(statusCode || 0);
  return code === 408 || code === 429 || (code >= 500 && code <= 599);
}

function getPreferredPartConcurrency() {
  return new Promise((resolve) => {
    if (!wx.getNetworkType) {
      resolve(PART_CONCURRENCY);
      return;
    }
    wx.getNetworkType({
      success: (res) => {
        const type = String((res && res.networkType) || '').toLowerCase();
        if (!type || type === 'unknown') {
          resolve(2);
          return;
        }
        if (type === 'wifi') {
          resolve(PART_CONCURRENCY);
          return;
        }
        resolve(1);
      },
      fail: () => resolve(2)
    });
  });
}

function readFileBinaryFromPath(filePath) {
  return new Promise((resolve, reject) => {
    const p = String(filePath || '');
    if (isDevtoolsEnv() && String(p).toLowerCase().indexOf('http://usr') === 0) {
      reject(
        new Error(
          '开发者工具下请勿使用 http://usr 路径上传，请重新编译后再试（应直接使用 http://tmp 原路径）'
        )
      );
      return;
    }
    const fsm = wx.getFileSystemManager();
    fsm.readFile({
      filePath: p,
      success: (r) => {
        if (r && r.data) {
          resolve(r.data);
          return;
        }
        reject(new Error('本地文件读取为空'));
      },
      fail: (err) => {
        fsm.readFile({
          filePath: p,
          encoding: 'base64',
          success: (r2) => {
            try {
              const b64 = (r2 && r2.data) || '';
              if (!b64) throw new Error('base64 empty');
              resolve(wx.base64ToArrayBuffer(b64));
            } catch (e) {
              reject(err || e || new Error('本地文件读取失败'));
            }
          },
          fail: () => reject(err || new Error('本地文件读取失败'))
        });
      }
    });
  });
}

function readBinaryForCos(readablePath) {
  const p = String(readablePath || '');
  if (!shouldReadViaFileSystem(p)) {
    return requestWithRetry({
      url: p,
      method: 'GET',
      responseType: 'arraybuffer'
    }).then((res) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && res.data) return res.data;
      throw new Error(`读取远程文件失败: ${res.statusCode || ''}`);
    });
  }
  return readFileBinaryFromPath(p);
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
    '.m4v': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska'
  };
  return map[e] || 'application/octet-stream';
}

function getLocalFileSize(filePath) {
  return new Promise((resolve) => {
    const p = String(filePath || '');
    if (/^https?:\/\//.test(p) && !isPseudoLocalHttpPath(p)) {
      resolve(-1);
      return;
    }
    wx.getFileSystemManager().getFileInfo({
      filePath: p,
      success: (r) => resolve(typeof r.size === 'number' ? r.size : 0),
      fail: () => resolve(-1)
    });
  });
}

/**
 * 规范化上传路径：
 * - 开发者工具：禁止 copy 到 http://usr（readFile 仍会走 127.0.0.1 → 域名校验失败），直接用 http://tmp
 * - 真机：伪 http 临时链用 saveFile 落到 wxfile://；大文件再 copy 到 USER_DATA_PATH（真机一般为 wxfile 路径）
 */
function normalizeLocalUploadPath(filePath) {
  return new Promise((resolve, reject) => {
    const p = String(filePath || '');
    if (!p) {
      reject(new Error('文件路径无效'));
      return;
    }
    if (isBareLocalPath(p) && !isPseudoLocalHttpPath(p)) {
      resolve(p);
      return;
    }

    if (isDevtoolsEnv() && isPseudoLocalHttpPath(p)) {
      console.log('[cosUpload] 开发者工具：跳过 copy/saveFile，直接 readFile 原临时路径');
      resolve(p);
      return;
    }

    const fsm = wx.getFileSystemManager();

    if (isPseudoLocalHttpPath(p)) {
      fsm.saveFile({
        tempFilePath: p,
        success: (r) => {
          const saved = (r && r.savedFilePath) || p;
          if (isDevtoolsEnv() && String(saved).toLowerCase().indexOf('http://usr') === 0) {
            resolve(p);
            return;
          }
          resolve(saved);
        },
        fail: () => copyPseudoPathToUserData(fsm, p).then(resolve).catch(reject)
      });
      return;
    }

    copyPseudoPathToUserData(fsm, p).then(resolve).catch(reject);
  });
}

function copyPseudoPathToUserData(fsm, srcPath) {
  return new Promise((resolve, reject) => {
    const extMatch = String(srcPath).match(/\.[^.?#/]+(?=([?#].*)?$)/);
    const ext = extMatch ? extMatch[0] : '.bin';
    const target = `${wx.env.USER_DATA_PATH}/cos_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const lowerTarget = target.toLowerCase();
    if (isDevtoolsEnv() && lowerTarget.indexOf('http://usr') === 0) {
      resolve(srcPath);
      return;
    }
    fsm.copyFile({
      srcPath,
      destPath: target,
      success: () => resolve(target),
      fail: (err) => {
        const msg = String((err && err.errMsg) || '');
        if (msg.indexOf('maximum size') !== -1 || msg.indexOf('storage limit') !== -1) {
          resolve(srcPath);
          return;
        }
        if (isPseudoLocalHttpPath(srcPath)) {
          console.warn('[cosUpload] copyFile 失败，回退原临时路径:', msg);
          resolve(srcPath);
          return;
        }
        reject(err || new Error('临时文件复制失败'));
      }
    });
  });
}

function cleanupCopiedUploadPath(copiedPath, originalPath) {
  const p = String(copiedPath || '');
  const o = String(originalPath || '');
  if (!p || p === o) return;
  if (p.indexOf(`${wx.env.USER_DATA_PATH}/cos_upload_`) !== 0) return;
  try {
    wx.getFileSystemManager().unlink({ filePath: p, fail: () => {} });
  } catch (e) {}
}

/** 优先 knownSize；否则多次 getFileInfo（相册返回的 size + 真机路径通常可靠） */
function resolveFileSize(filePath, knownSize) {
  if (typeof knownSize === 'number' && knownSize > 0) {
    return Promise.resolve(knownSize);
  }
  return getLocalFileSize(filePath)
    .then((sz) => {
      if (sz > 0) return sz;
      return sleep(120).then(() => getLocalFileSize(filePath));
    })
    .then((sz) => {
      if (sz > 0) return sz;
      return sleep(200).then(() => getLocalFileSize(filePath));
    });
}

function readFileSlice(filePath, position, length) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      position,
      length,
      success: (r) => {
        const d = r && r.data;
        if (!d) {
          reject(new Error('readFile 返回空'));
          return;
        }
        const bl = typeof d.byteLength === 'number' ? d.byteLength : d.length || 0;
        // 旧基础库可能忽略 position/length，整文件读入导致内存暴涨、合并失败
        if (length > 0 && bl > length + 64 * 1024) {
          reject(new Error('当前微信版本不支持分片读取，请升级微信后再试大文件上传'));
          return;
        }
        resolve(d);
      },
      fail: reject
    });
  });
}

function putPart(url, buffer, retriesLeft = 1) {
  return new Promise((resolve, reject) => {
    requestWithRetry(
      {
        url,
        method: 'PUT',
        data: buffer,
        // 分片 UploadPart 的预签名一般不含 Content-Type，带上可能 403
        header: {},
        timeout: 600000
      },
      REQUEST_RETRY_TIMES
    )
      .then((putRes) => {
        if (putRes.statusCode >= 200 && putRes.statusCode < 300) {
          const h = putRes.header || {};
          const etag = h.ETag || h.Etag || h.etag || '';
          resolve(String(etag).trim());
        } else if (isRetryableHttpStatus(putRes.statusCode) && retriesLeft > 0) {
          putPart(url, buffer, retriesLeft - 1).then(resolve).catch(reject);
        } else reject(new Error(`分片上传失败 HTTP ${putRes.statusCode}`));
      })
      .catch((err) => reject(err || new Error('分片上传网络失败')));
  });
}

function tryAbortMultipart(key, uploadId) {
  if (!wx.cloud || !wx.cloud.callFunction || !key || !uploadId) return;
  wx.cloud.callFunction({
    name: 'cosMultipartUpload',
    data: { action: 'abort', key, uploadId }
  }).catch(() => {});
}

async function runPool(taskFactories, concurrency) {
  const results = new Array(taskFactories.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= taskFactories.length) break;
      results[idx] = await taskFactories[idx]();
    }
  }
  const n = Math.min(concurrency, taskFactories.length) || 1;
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/**
 * @param {string} filePath
 * @param {{ folder: string, ext: string, contentType: string, fileSize: number, onProgress?: function }} opts
 */
async function uploadMultipartToCos(filePath, opts) {
  const { folder, ext, contentType, fileSize, onProgress } = opts;
  const initRes = await wx.cloud.callFunction({
    name: 'cosMultipartUpload',
    data: {
      action: 'init',
      folder,
      ext,
      contentType,
      fileSize,
      partSize: PART_SIZE
    }
  });
  const payload = (initRes && initRes.result) || {};
  if (!payload.success || !payload.partUrls || !payload.uploadId || !payload.key) {
    throw new Error(payload.message || '分片上传初始化失败，请部署云函数 cosMultipartUpload');
  }

  const { partUrls, uploadId, key, partSize } = payload;
  const partCount = partUrls.length;
  const sliceSize = partSize || PART_SIZE;

  try {
    const factories = partUrls.map((url, index) => async () => {
      const start = index * sliceSize;
      const len = Math.min(sliceSize, fileSize - start);
      const buf = await readFileSlice(filePath, start, len);
      const etag = await putPart(url, buf);
      if (!etag) throw new Error('分片响应缺少 ETag');
      if (typeof onProgress === 'function') {
        onProgress({
          loaded: Math.min(start + len, fileSize),
          total: fileSize,
          partIndex: index + 1,
          partCount
        });
      }
      return { PartNumber: index + 1, ETag: etag };
    });

    const dynamicConcurrency = await getPreferredPartConcurrency();
    const partResults = await runPool(factories, dynamicConcurrency);
    partResults.sort((a, b) => a.PartNumber - b.PartNumber);

    const done = await wx.cloud.callFunction({
      name: 'cosMultipartUpload',
      data: {
        action: 'complete',
        key,
        uploadId,
        parts: partResults.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag }))
      }
    });
    const donePayload = (done && done.result) || {};
    if (!donePayload.success || !donePayload.publicUrl) {
      throw new Error(donePayload.message || '合并分片失败');
    }
    return donePayload.publicUrl;
  } catch (e) {
    tryAbortMultipart(key, uploadId);
    throw e;
  }
}

function uploadSinglePutToCos(filePath, folder, ext, contentType, retriesLeft = SINGLE_PUT_RESIGN_RETRY) {
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
      .then((signRes) => {
        const payload = (signRes && signRes.result) || {};
        const uploadUrl = payload.uploadUrl || '';
        console.log('[cosUpload] getCosUploadUrl result:', {
          success: !!payload.success,
          publicUrl: payload.publicUrl,
          uploadHost: uploadUrl ? String(uploadUrl).split('?')[0] : '',
          debug: payload.debug || null,
          message: payload.message || ''
        });
        if (!payload.success || !uploadUrl || !payload.publicUrl) {
          reject(new Error(payload.message || '获取 COS 上传地址失败，请检查 getCosUploadUrl 云函数与环境变量'));
          return;
        }
        readBinaryForCos(filePath)
          .then((bin) => {
            const uploadHeaders = payload.uploadHeaders || {};
            requestWithRetry(
              {
                url: uploadUrl,
                method: 'PUT',
                data: bin,
                header: {
                  'Content-Type': contentType,
                  'x-cos-acl': uploadHeaders['x-cos-acl'] || 'public-read'
                },
                timeout: 600000
              },
              REQUEST_RETRY_TIMES
            )
              .then((putRes) => {
                if (putRes.statusCode >= 200 && putRes.statusCode < 300) {
                  resolve(payload.publicUrl);
                } else {
                  if (isRetryableHttpStatus(putRes.statusCode) && retriesLeft > 0) {
                    uploadSinglePutToCos(filePath, folder, ext, contentType, retriesLeft - 1)
                      .then(resolve)
                      .catch(reject);
                    return;
                  }
                  reject(
                    new Error(
                      `COS 上传失败 HTTP ${putRes.statusCode}，请检查桶权限、预签名域名与小程序合法域名`
                    )
                  );
                }
              })
              .catch((err) => {
                reject(err || new Error('COS 上传网络失败，请检查网络与合法域名'));
              });
          })
          .catch((err) => {
            console.warn('[cosUpload] 读取本地文件失败 filePath=', filePath, err);
            reject(err || new Error('读取本地文件失败，请重试'));
          });
      })
      .catch((err) => {
        console.warn('[cosUpload] 调用 getCosUploadUrl 失败', err);
        reject(err || new Error('调用 getCosUploadUrl 失败，请检查云开发与云函数是否已部署'));
      });
  });
}

/**
 * @param {string} filePath 本地临时路径
 * @param {{ folder: string, ext?: string, contentType?: string, knownSize?: number, onProgress?: function }} options
 * @returns {Promise<string>} COS public HTTPS URL
 */
function uploadLocalFileToCos(filePath, options = {}) {
  const folder = String(options.folder || 'uploads').replace(/^\/+|\/+$/g, '') || 'uploads';
  const extMatch = String(filePath || '').match(/\.[^.]+?$/i);
  const extRaw = (options.ext || (extMatch ? extMatch[0] : '.bin')).toLowerCase();
  const ext = extRaw.startsWith('.') ? extRaw : `.${extRaw}`;
  const contentType = options.contentType || inferContentType(ext);
  const onProgress = options.onProgress;

  return normalizeLocalUploadPath(filePath).then((normalizedPath) => {
    if (isPseudoLocalHttpPath(filePath)) {
      console.log('[cosUpload] 临时媒体路径(伪http)，使用本地 readFile/copyFile，禁止 request:', String(filePath).slice(0, 96));
    }
    const finishCleanup = () => cleanupCopiedUploadPath(normalizedPath, filePath);

    return new Promise((resolve, reject) => {
      if (!wx.cloud || !wx.cloud.callFunction) {
        reject(new Error('wx.cloud 未就绪'));
        return;
      }

      resolveFileSize(normalizedPath, options.knownSize)
        .then((fileSize) => {
          if (fileSize > MAX_OBJECT_BYTES) {
            reject(new Error('文件超过 1GB，请压缩或剪辑后再上传'));
            return;
          }

          const p = String(normalizedPath || '');
          const isRemoteOnly = /^https?:\/\//.test(p) && !isPseudoLocalHttpPath(p);

          if (fileSize <= 0) {
            if (isRemoteOnly) {
              uploadSinglePutToCos(normalizedPath, folder, ext, contentType).then(resolve).catch(reject);
              return;
            }
            reject(new Error('无法读取文件大小，请重新选择文件后再试'));
            return;
          }

          const useMultipart = fileSize > MULTIPART_THRESHOLD && !isRemoteOnly;

          if (useMultipart) {
            uploadMultipartToCos(normalizedPath, {
              folder,
              ext,
              contentType,
              fileSize,
              onProgress
            })
              .then(resolve)
              .catch(reject);
            return;
          }

          uploadSinglePutToCos(normalizedPath, folder, ext, contentType).then(resolve).catch(reject);
        })
        .catch(reject);
    }).finally(finishCleanup);
  });
}

function uploadImageToCos(filePath, folder, extra = {}) {
  const ext = (String(filePath).match(/\.[^.]+?$/i) || ['.jpg'])[0].toLowerCase();
  const e = ext.startsWith('.') ? ext : `.${ext}`;
  return uploadLocalFileToCos(filePath, {
    folder,
    ext: e,
    contentType: inferContentType(e),
    ...extra
  });
}

function uploadVideoToCos(filePath, folder, extra = {}) {
  const ext = (String(filePath).match(/\.[^.]+?$/i) || ['.mp4'])[0].toLowerCase();
  const e = ext.startsWith('.') ? ext : `.${ext}`;
  return uploadLocalFileToCos(filePath, {
    folder,
    ext: e,
    contentType: inferContentType(e),
    ...extra
  });
}

module.exports = {
  uploadLocalFileToCos,
  uploadImageToCos,
  uploadVideoToCos,
  readBinaryForCos,
  normalizeLocalUploadPath,
  cleanupCopiedUploadPath,
  inferContentType,
  MULTIPART_THRESHOLD,
  MAX_OBJECT_BYTES,
  PART_SIZE
};
