/**
 * 商城图：选图 → 比例裁切（可选）→ 缩放压缩 → 控制体积
 */

const PRESETS = {
  cover: {
    cropScale: '4:3',
    maxWidth: 1200,
    maxHeight: 900,
    quality: 82,
    maxBytes: 420 * 1024,
    ratioLabel: '4:3',
    sizeHint: '1200×900',
    desc: '列表封面'
  },
  option: {
    cropScale: '1:1',
    maxWidth: 800,
    maxHeight: 800,
    quality: 82,
    maxBytes: 300 * 1024,
    ratioLabel: '1:1',
    sizeHint: '800×800',
    desc: '配置方案图'
  },
  accThumb: {
    cropScale: '1:1',
    maxWidth: 600,
    maxHeight: 600,
    quality: 80,
    maxBytes: 220 * 1024,
    ratioLabel: '1:1',
    sizeHint: '600×600',
    desc: '配件缩略图'
  },
  accDetail: {
    cropScale: '4:3',
    maxWidth: 1200,
    maxHeight: 900,
    quality: 82,
    maxBytes: 420 * 1024,
    ratioLabel: '4:3',
    sizeHint: '1200×900',
    desc: '配件详情主图'
  },
  detail: {
    maxWidth: 1600,
    maxHeight: 2400,
    quality: 80,
    maxBytes: 650 * 1024,
    ratioLabel: '原比例',
    sizeHint: '宽≤1600',
    desc: '详情长图'
  },
  topMedia: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 82,
    maxBytes: 500 * 1024,
    ratioLabel: '原比例',
    sizeHint: '宽≤1600',
    desc: '顶部轮播图'
  }
};

const HINTS = PRESETS;

function getPreset(key) {
  return PRESETS[key] || PRESETS.detail;
}

function getFileSize(filePath) {
  return new Promise((resolve) => {
    try {
      wx.getFileSystemManager().getFileInfo({
        filePath,
        success: (res) => resolve((res && res.size) || 0),
        fail: () => resolve(0)
      });
    } catch (e) {
      resolve(0);
    }
  });
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: reject
    });
  });
}

function cropImageIfSupported(src, cropScale) {
  if (!cropScale || typeof wx.cropImage !== 'function') {
    return Promise.resolve(src);
  }
  return new Promise((resolve) => {
    wx.cropImage({
      src,
      cropScale,
      success: (res) => resolve((res && res.tempFilePath) || src),
      fail: () => resolve(src)
    });
  });
}

function compressOnce(src, compressedWidth, compressedHeight, quality) {
  return new Promise((resolve) => {
    const opts = {
      src,
      quality: Math.max(40, Math.min(95, quality)),
      success: (res) => resolve((res && res.tempFilePath) || src),
      fail: () => resolve(src)
    };
    if (compressedWidth > 0 && compressedHeight > 0) {
      opts.compressedWidth = compressedWidth;
      opts.compressedHeight = compressedHeight;
    }
    wx.compressImage(opts);
  });
}

function fitInsideBox(width, height, maxW, maxH) {
  let w = width;
  let h = height;
  if (w <= maxW && h <= maxH) return { w, h };
  const ratio = Math.min(maxW / w, maxH / h);
  return {
    w: Math.max(1, Math.round(w * ratio)),
    h: Math.max(1, Math.round(h * ratio))
  };
}

/**
 * 将本地图片压到预设尺寸与体积内（上传前调用）
 * @param {string} filePath
 * @param {string} presetKey
 * @returns {Promise<string>}
 */
async function prepareImageFile(filePath, presetKey) {
  const preset = getPreset(presetKey);
  if (!filePath) return filePath;

  let path = filePath;
  if (preset.cropScale) {
    path = await cropImageIfSupported(path, preset.cropScale);
  }

  let info;
  try {
    info = await getImageInfo(path);
  } catch (e) {
    return path;
  }

  let w = Number(info.width) || 1;
  let h = Number(info.height) || 1;
  const ori = Number(info.orientation) || 0;
  if (ori === 90 || ori === -90 || ori === 270) {
    const t = w;
    w = h;
    h = t;
  }

  const fitted = fitInsideBox(w, h, preset.maxWidth, preset.maxHeight);
  let quality = preset.quality || 80;
  let current = path;

  for (let i = 0; i < 6; i += 1) {
    current = await compressOnce(current, fitted.w, fitted.h, quality);
    const size = await getFileSize(current);
    if (!preset.maxBytes || size <= preset.maxBytes) {
      return current;
    }
    quality -= 10;
    if (quality < 48) break;
  }

  return current;
}

function chooseMedia(count) {
  const n = Math.max(1, Math.min(9, count || 1));
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: n,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean);
        if (!paths.length) {
          reject(new Error('no image'));
          return;
        }
        resolve(paths);
      },
      fail: reject
    });
  });
}

/**
 * 选图并处理（单张返回 path，多张返回 paths）
 * @param {string} presetKey
 * @param {{ count?: number }} options
 */
async function chooseAndPrepare(presetKey, options = {}) {
  const count = options.count || 1;
  const paths = await chooseMedia(count);
  const prepared = [];
  for (let i = 0; i < paths.length; i += 1) {
    prepared.push(await prepareImageFile(paths[i], presetKey));
  }
  return count === 1 ? prepared[0] : prepared;
}

module.exports = {
  PRESETS,
  HINTS,
  getPreset,
  prepareImageFile,
  chooseAndPrepare
};
