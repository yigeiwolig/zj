/**
 * 选图 → 按页面上真实展示比例裁切（wx.cropImage）→ 缩放压缩
 * cropScale 由 displayAspect / displayAspectRpx 推导，与 aspectFill+比例盒一致，而非写死的理论比例
 */

const WECHAT_CROP_SCALES = [
  { key: '16:9', ratio: 16 / 9 },
  { key: '9:16', ratio: 9 / 16 },
  { key: '4:3', ratio: 4 / 3 },
  { key: '3:4', ratio: 3 / 4 },
  { key: '5:4', ratio: 5 / 4 },
  { key: '4:5', ratio: 4 / 5 },
  { key: '1:1', ratio: 1 }
];

const PRESETS = {
  /** 商城系列列表封面：.shop-hero-cover 4:3 + aspectFill；仅裁切，不压缩 */
  cover: {
    displayAspect: [4, 3],
    noCompress: true,
    sizeHint: '原图',
    desc: '列表封面'
  },
  /** 配置方案图：widthFix 原比例展示 */
  option: {
    displayMode: 'free',
    maxWidth: 800,
    maxHeight: 800,
    quality: 82,
    maxBytes: 300 * 1024,
    ratioLabel: '原比例',
    sizeHint: '800×800',
    desc: '配置方案图'
  },
  accThumb: {
    displayAspect: [4, 3],
    maxWidth: 1200,
    maxHeight: 900,
    quality: 82,
    maxBytes: 420 * 1024,
    sizeHint: '1200×900',
    desc: '配件列表封面'
  },
  /** 配件详情轮播：aspectFit，不强制裁切 */
  accDetail: {
    displayMode: 'free',
    maxWidth: 1200,
    maxHeight: 900,
    quality: 82,
    maxBytes: 420 * 1024,
    ratioLabel: '原比例',
    sizeHint: '1200×900',
    desc: '配件详情主图'
  },
  /** 商品详情长图：widthFix */
  detail: {
    displayMode: 'free',
    maxWidth: 1600,
    maxHeight: 2400,
    quality: 80,
    maxBytes: 650 * 1024,
    ratioLabel: '原比例',
    sizeHint: '宽≤1600',
    desc: '详情长图'
  },
  /** 商城顶部轮播图：图片 widthFix；视频 slide 为 16:9（视频不走本工具） */
  topMedia: {
    displayMode: 'free',
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 82,
    maxBytes: 500 * 1024,
    ratioLabel: '原比例',
    sizeHint: '宽≤1600',
    desc: '顶部轮播图'
  },
  avatar: {
    displayAspect: [1, 1],
    maxWidth: 800,
    maxHeight: 800,
    quality: 82,
    maxBytes: 280 * 1024,
    sizeHint: '800×800',
    desc: '头像'
  },
  /** 我的-凭证：.upload-box 16:9 + aspectFill */
  proof: {
    displayAspect: [16, 9],
    maxWidth: 1200,
    maxHeight: 675,
    quality: 82,
    maxBytes: 420 * 1024,
    sizeHint: '1280×720',
    desc: '凭证截图'
  },
  /** 附近门店：.p-image-box 展开 16:9 + aspectFill */
  home: {
    displayAspect: [16, 9],
    maxWidth: 1280,
    maxHeight: 720,
    quality: 82,
    maxBytes: 420 * 1024,
    sizeHint: '1280×720',
    desc: '首页配图'
  },
  /** 产品列表大卡：与 .card-cover 3:4 竖版；仅裁切，不压缩 */
  pagenew: {
    displayAspect: [3, 4],
    noCompress: true,
    sizeHint: '原图',
    desc: '产品封面'
  },
  /** 安装教程图文：widthFix */
  azjc: {
    displayMode: 'free',
    maxWidth: 1200,
    maxHeight: 2400,
    quality: 82,
    maxBytes: 420 * 1024,
    ratioLabel: '原比例',
    sizeHint: '宽≤1200',
    desc: '安装教程配图'
  },
  /** 案例封面上传框：16:9 + aspectFill */
  caseThumb: {
    displayAspect: [16, 9],
    maxWidth: 1280,
    maxHeight: 720,
    quality: 82,
    maxBytes: 450 * 1024,
    sizeHint: '1280×720',
    desc: '案例封面'
  },
  /** 维修说明配图预览区：16:9 + aspectFill */
  shouhou: {
    displayAspect: [16, 9],
    maxWidth: 1280,
    maxHeight: 720,
    quality: 82,
    maxBytes: 420 * 1024,
    sizeHint: '1280×720',
    desc: '维修说明配图'
  },
  /** 枢纽首页「产品上新」：.new-card-media 75% 比例盒 + aspectFill */
  hubHome: {
    displayAspect: [4, 3],
    maxWidth: 1200,
    maxHeight: 900,
    quality: 82,
    maxBytes: 420 * 1024,
    sizeHint: '1200×900',
    desc: '首页轮播图'
  }
};

const HINTS = PRESETS;
const CROP_CANCELLED = 'CROP_CANCELLED';

let _windowWidthPx = 0;

function getWindowWidthPx() {
  if (_windowWidthPx > 0) return _windowWidthPx;
  try {
    const win = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
    _windowWidthPx = Number(win.windowWidth) || 375;
  } catch (e) {
    _windowWidthPx = 375;
  }
  return _windowWidthPx;
}

function rpxToPx(rpx) {
  return (Number(rpx) || 0) * (getWindowWidthPx() / 750);
}

/** 从展示宽高比中选取最接近的微信 cropScale */
function pickNearestCropScale(displayRatio) {
  const target = Number(displayRatio);
  if (!Number.isFinite(target) || target <= 0) return '';
  let best = WECHAT_CROP_SCALES[0];
  let bestDiff = Infinity;
  WECHAT_CROP_SCALES.forEach((item) => {
    const diff = Math.abs(Math.log(item.ratio) - Math.log(target));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = item;
    }
  });
  return best.key;
}

function getDisplayRatioFromPreset(preset) {
  if (!preset || preset.displayMode === 'free') return 0;
  if (Array.isArray(preset.displayAspectRpx) && preset.displayAspectRpx.length >= 2) {
    const wPx = rpxToPx(preset.displayAspectRpx[0]);
    const hPx = rpxToPx(preset.displayAspectRpx[1]);
    if (wPx > 0 && hPx > 0) return wPx / hPx;
  }
  if (Array.isArray(preset.displayAspect) && preset.displayAspect.length >= 2) {
    const aw = Number(preset.displayAspect[0]);
    const ah = Number(preset.displayAspect[1]);
    if (aw > 0 && ah > 0) return aw / ah;
  }
  return 0;
}

/** 解析某上传位应对应的微信裁切比例（与页面展示框一致） */
function resolveCropScaleForPreset(presetKey, options = {}) {
  if (options.cropScale) return options.cropScale;
  const preset = getPreset(presetKey);
  if (!preset || preset.displayMode === 'free') return '';
  const ratio = getDisplayRatioFromPreset(preset);
  if (!ratio) return '';
  return pickNearestCropScale(ratio);
}

function getPreset(key) {
  return PRESETS[key] || PRESETS.cover;
}

function getCropHint(presetKey) {
  const preset = getPreset(presetKey);
  if (preset.displayMode === 'free') {
    return { ratioLabel: preset.ratioLabel || '原比例', cropScale: '' };
  }
  const cropScale = resolveCropScaleForPreset(presetKey);
  return { ratioLabel: cropScale || preset.ratioLabel || '原比例', cropScale };
}

function isCropCancelled(err) {
  if (!err) return false;
  if (err.message === CROP_CANCELLED || err.code === CROP_CANCELLED) return true;
  const msg = String(err.errMsg || err.message || '');
  return msg.indexOf('cancel') !== -1;
}

function isVideoTempFile(file) {
  return String((file && file.fileType) || '').toLowerCase() === 'video';
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
  if (!cropScale) {
    return Promise.resolve(src);
  }
  if (typeof wx.cropImage !== 'function') {
    return Promise.reject(new Error('当前微信版本不支持裁切，请升级后重试'));
  }
  return new Promise((resolve, reject) => {
    wx.cropImage({
      src,
      cropScale,
      success: (res) => {
        const out = res && res.tempFilePath;
        if (out) resolve(out);
        else reject(new Error('crop empty'));
      },
      fail: (err) => {
        if (isCropCancelled(err)) {
          const e = new Error(CROP_CANCELLED);
          e.code = CROP_CANCELLED;
          reject(e);
          return;
        }
        reject(err || new Error('crop failed'));
      }
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
 * 将本地图片压到预设尺寸与体积内（上传前调用，含裁切）
 */
async function prepareImageFile(filePath, presetKey, options = {}) {
  const preset = getPreset(presetKey);
  if (!filePath) return filePath;

  let path = filePath;
  const cropScale = resolveCropScaleForPreset(presetKey, options);
  if (cropScale) {
    path = await cropImageIfSupported(path, cropScale);
  }

  if (preset.noCompress || options.noCompress) {
    return path;
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

/** chooseMedia 选中的条目：仅图片时裁切+压缩，视频原样返回 */
async function prepareChosenMediaFile(file, presetKey, options = {}) {
  if (!file || !file.tempFilePath) return file;
  if (isVideoTempFile(file)) return file;
  const prepared = await prepareImageFile(file.tempFilePath, presetKey, options);
  return { ...file, tempFilePath: prepared };
}

function chooseMedia(count, options = {}) {
  const n = Math.max(1, Math.min(9, count || 1));
  const sourceType = options.sourceType || ['album', 'camera'];
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: n,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean);
        if (!paths.length) {
          reject(new Error('no image'));
          return;
        }
        resolve(paths);
      },
      fail: (err) => {
        if (isCropCancelled(err)) {
          const e = new Error(CROP_CANCELLED);
          e.code = CROP_CANCELLED;
          reject(e);
          return;
        }
        reject(err);
      }
    });
  });
}

/**
 * 选图并裁切处理（单张返回 path，多张返回 paths）
 */
async function chooseAndPrepare(presetKey, options = {}) {
  const count = options.count || 1;
  const paths = await chooseMedia(count, options);
  const prepared = [];
  for (let i = 0; i < paths.length; i += 1) {
    prepared.push(await prepareImageFile(paths[i], presetKey, options));
  }
  return count === 1 ? prepared[0] : prepared;
}

module.exports = {
  PRESETS,
  HINTS,
  CROP_CANCELLED,
  getPreset,
  getCropHint,
  resolveCropScaleForPreset,
  pickNearestCropScale,
  isCropCancelled,
  isVideoTempFile,
  prepareImageFile,
  prepareChosenMediaFile,
  chooseAndPrepare
};
