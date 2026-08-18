/**
 * 教程类视频：压到适合小程序原生 video 的 1080p / ~1.8Mbps。
 * 4K 即使码率很低，每帧仍要解 3840×2160，真机列表播放会明显卡顿。
 */

const TARGET_MAX_EDGE = 1920;
const TARGET_BITRATE_KBPS = 1800;
const TARGET_FPS = 30;

function readVideoMeta(src) {
  return new Promise((resolve) => {
    if (!src || typeof wx.getVideoInfo !== 'function') {
      resolve(null);
      return;
    }
    wx.getVideoInfo({
      src,
      success: (info) => resolve(info || null),
      fail: () => resolve(null)
    });
  });
}

function maxEdgeOf(meta, fallbackW, fallbackH) {
  const w = Number((meta && meta.width) || fallbackW || 0) || 0;
  const h = Number((meta && meta.height) || fallbackH || 0) || 0;
  return Math.max(w, h);
}

function bitrateKbpsFromMeta(meta) {
  const raw = Number(meta && meta.bitrate) || 0;
  if (!(raw > 0)) return 0;
  return raw > 100000 ? Math.round(raw / 1000) : raw;
}

function compressVideoForUpload(filePath, extra = {}) {
  const src = String(filePath || '').trim();
  const knownSize = extra.knownSize;
  const knownW = extra.width;
  const knownH = extra.height;
  const knownFps = extra.fps;

  if (!src) {
    return Promise.resolve({ path: src, size: knownSize, compressed: false });
  }

  return readVideoMeta(src).then((meta) => {
    const edge = maxEdgeOf(meta, knownW, knownH);
    const needScale = edge > TARGET_MAX_EDGE;
    const scale = needScale ? Math.max(0.1, Math.min(1, TARGET_MAX_EDGE / edge)) : 1;
    const bitrateKbps = bitrateKbpsFromMeta(meta);
    const needBitrate = bitrateKbps > TARGET_BITRATE_KBPS * 1.15;
    if (!needScale && !needBitrate) {
      return {
        path: src,
        size: knownSize,
        compressed: false,
        width: Number((meta && meta.width) || knownW) || 0,
        height: Number((meta && meta.height) || knownH) || 0
      };
    }
    if (typeof wx.compressVideo !== 'function') {
      return {
        path: src,
        size: knownSize,
        compressed: false,
        skipped: 'no-api',
        tooHeavy: needScale
      };
    }
    const fpsRaw =
      Number((meta && (meta.fps || meta.frameRate)) || knownFps || TARGET_FPS) || TARGET_FPS;
    const fps = Math.max(15, Math.min(TARGET_FPS, Math.round(fpsRaw)));
    return new Promise((resolve) => {
      wx.compressVideo({
        src,
        quality: needScale ? 'medium' : 'medium',
        bitrate: TARGET_BITRATE_KBPS,
        fps,
        resolution: scale,
        success: (res) => {
          const out = (res && res.tempFilePath) || src;
          const size = res && typeof res.size === 'number' ? res.size : knownSize;
          if (knownSize && size && size > knownSize * 1.05) {
            resolve({ path: src, size: knownSize, compressed: false, skipped: 'larger' });
            return;
          }
          resolve({
            path: out,
            size,
            compressed: true,
            scale,
            tooHeavy: needScale
          });
        },
        fail: (err) => {
          console.warn('[compressVideoForUpload] 压缩失败，改用原片', err);
          resolve({
            path: src,
            size: knownSize,
            compressed: false,
            skipped: 'fail',
            tooHeavy: needScale
          });
        }
      });
    });
  });
}

module.exports = {
  compressVideoForUpload,
  TARGET_MAX_EDGE
};
