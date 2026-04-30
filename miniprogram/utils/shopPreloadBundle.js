/**
 * 商城预拉：与 shop 页一致的 normalize / decorate / 合并 getTempFileURL，
 * 供 app.onLaunch 后台写入 globalData.shopDataCache，减少进页白等。
 */

/** 内存中 shopDataCache 命中时长（app 预拉、shop 首屏、后台刷新共用） */
const SHOP_GLOBAL_CACHE_TTL_MS = 12 * 60 * 1000;

function chunkArray(arr, size) {
  const out = [];
  const a = arr || [];
  for (let i = 0; i < a.length; i += size) out.push(a.slice(i, i + size));
  return out;
}

async function batchResolveCloudFileIds(fileIdList) {
  const map = {};
  const ids = [...new Set((fileIdList || []).filter(id => typeof id === 'string' && id.indexOf('cloud://') === 0))];
  if (!ids.length || !wx.cloud || !wx.cloud.getTempFileURL) return map;
  const chunks = chunkArray(ids, 50);
  const partials = await Promise.all(
    chunks.map(async ch => {
      const part = {};
      try {
        const resp = await wx.cloud.getTempFileURL({ fileList: ch });
        (resp.fileList || []).forEach(f => {
          if (f && f.fileID && f.tempFileURL) part[f.fileID] = f.tempFileURL;
        });
      } catch (e) {
        console.warn('[shopPreloadBundle] getTempFileURL 批量失败:', e);
      }
      return part;
    })
  );
  partials.forEach(part => {
    Object.assign(map, part);
  });
  return map;
}

function normalizeSeriesListFromDb(list = []) {
  return (list || []).map(series => {
    const fixedDetailImages = (series.detailImages || []).map(item => {
      if (!item || item.type) return item;
      const url = (item.url || '').toLowerCase();
      const isVideo =
        url.endsWith('.mp4') ||
        url.endsWith('.mov') ||
        url.indexOf('.mp4?') !== -1 ||
        url.indexOf('.mov?') !== -1;
      return { type: isVideo ? 'video' : 'image', ...item };
    });
    return { ...series, detailImages: fixedDetailImages };
  });
}

function decorateSeriesImageFields(seriesList = []) {
  const buildLowQualityUrl = u => u;
  return (seriesList || []).map(series => {
    const detailImages = (series.detailImages || []).map(item => {
      if (!item || item.type !== 'image' || !item.url) return item;
      return {
        ...item,
        previewUrl: item.previewUrl || buildLowQualityUrl(item.url)
      };
    });
    return {
      ...series,
      coverPreview: series.coverPreview || buildLowQualityUrl(series.cover),
      detailImages
    };
  });
}

function collectSeriesCloudFileIdsFromList(seriesList) {
  const ids = [];
  const add = id => {
    if (typeof id === 'string' && id.indexOf('cloud://') === 0) ids.push(id);
  };
  (seriesList || []).forEach(s => {
    add(s.cover);
    add(s.compareVideo);
    (s.options || []).forEach(o => o && add(o.img));
    (s.detailImages || []).forEach(d => d && add(d.url));
  });
  return ids;
}

function collectAccessoryCloudFileIdsFromList(list) {
  const ids = [];
  const add = id => {
    if (typeof id === 'string' && id.indexOf('cloud://') === 0) ids.push(id);
  };
  (list || []).forEach(acc => {
    add(acc.img);
    (acc.detailImages || []).forEach(u => add(u));
  });
  return ids;
}

function applySeriesCloudUrlMap(seriesList, map) {
  const m = map || {};
  return (seriesList || []).map(s => ({
    ...s,
    coverDisplay: (s.cover && m[s.cover]) || '',
    compareVideoDisplay: (s.compareVideo && m[s.compareVideo]) || '',
    options: (s.options || []).map(o => ({
      ...o,
      imgDisplay: (o && o.img && m[o.img]) || ''
    })),
    detailImages: (s.detailImages || []).map(d => {
      if (!d || typeof d !== 'object') return d;
      const u = d.url;
      return { ...d, urlDisplay: (u && m[u]) || '' };
    })
  }));
}

function applyAccessoryCloudUrlMap(list, map) {
  const m = map || {};
  return (list || []).map(acc => ({
    ...acc,
    imgDisplay: (acc.img && m[acc.img]) || '',
    detailImagesDisplay: (acc.detailImages || []).map(u => (u && m[u]) || '')
  }));
}

async function hydrateSeriesAndAccessoriesTogether(decoratedSeriesList, accessoryCleanList) {
  const sid = collectSeriesCloudFileIdsFromList(decoratedSeriesList);
  const aid = collectAccessoryCloudFileIdsFromList(accessoryCleanList);
  const map = await batchResolveCloudFileIds([...new Set([...sid, ...aid])]);
  return {
    series: applySeriesCloudUrlMap(decoratedSeriesList, map),
    accessories: applyAccessoryCloudUrlMap(accessoryCleanList, map)
  };
}

/** 与 shop 页 topMedia 读取逻辑一致：补 type、读轮播开关 */
function fixTopMediaListFromDoc(docData) {
  if (!docData || !Array.isArray(docData.list)) {
    return { list: [], autoCarouselEnabled: false };
  }
  const autoCarouselEnabled = docData.autoCarouselEnabled === true;
  const list = (docData.list || []).map(item => {
    if (item.type) return item;
    const url = (item.url || '').toLowerCase();
    const isVideo =
      url.endsWith('.mp4') ||
      url.endsWith('.mov') ||
      url.indexOf('.mp4?') !== -1 ||
      url.indexOf('.mov?') !== -1;
    return {
      type: isVideo ? 'video' : 'image',
      ...item
    };
  });
  return { list, autoCarouselEnabled };
}

async function resolveTopMediaRenderUrls(list) {
  const safeList = Array.isArray(list) ? list : [];
  const cloudFileIds = [];
  safeList.forEach(item => {
    if (!item || typeof item.url !== 'string' || item.url.indexOf('cloud://') !== 0) return;
    cloudFileIds.push(item.url);
  });
  const uniqueFileIds = [...new Set(cloudFileIds)];
  if (uniqueFileIds.length === 0) {
    return safeList.map(item => (item ? { ...item, renderUrl: item.url } : item));
  }
  const tempUrlMap = await batchResolveCloudFileIds(uniqueFileIds);
  return safeList.map(item => {
    if (!item) return item;
    const mapped = tempUrlMap[item.url];
    if (mapped && typeof item.url === 'string' && item.url.indexOf('cloud://') === 0) {
      return { ...item, renderUrl: mapped };
    }
    return { ...item, renderUrl: item.url };
  });
}

/** 若每条 cloud:// 已有对应 *Display，则无需再 getTempFileURL */
function listsHaveCompleteCloudDisplays(seriesList, accList) {
  for (const s of seriesList || []) {
    if (!s) continue;
    if (typeof s.cover === 'string' && s.cover.indexOf('cloud://') === 0) {
      if (!s.coverDisplay) return false;
    }
    if (typeof s.compareVideo === 'string' && s.compareVideo.indexOf('cloud://') === 0) {
      if (!s.compareVideoDisplay) return false;
    }
    for (const o of s.options || []) {
      if (o && typeof o.img === 'string' && o.img.indexOf('cloud://') === 0) {
        if (!o.imgDisplay) return false;
      }
    }
    for (const d of s.detailImages || []) {
      if (d && typeof d.url === 'string' && d.url.indexOf('cloud://') === 0) {
        if (!d.urlDisplay) return false;
      }
    }
  }
  for (const acc of accList || []) {
    if (!acc) continue;
    if (typeof acc.img === 'string' && acc.img.indexOf('cloud://') === 0) {
      if (!acc.imgDisplay) return false;
    }
    const di = acc.detailImages || [];
    const dd = acc.detailImagesDisplay || [];
    for (let i = 0; i < di.length; i++) {
      const u = di[i];
      if (typeof u === 'string' && u.indexOf('cloud://') === 0) {
        if (!dd[i]) return false;
      }
    }
  }
  return true;
}

/**
 * 收集可预热图片 URL（https 或已解析的临时链），限制数量避免启动期过量请求。
 */
function collectShopWarmImageUrls(topMediaList, seriesList, accessoryList, limits) {
  const lim = limits || { top: 12, seriesCovers: 30, accThumbs: 30 };
  const urls = [];
  const seen = new Set();
  const push = u => {
    if (!u || typeof u !== 'string') return;
    if (u.indexOf('cloud://') === 0) return;
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  (topMediaList || []).slice(0, lim.top).forEach(item => {
    if (item && item.type === 'image') {
      push(item.renderUrl || item.url);
    }
  });
  (seriesList || []).slice(0, lim.seriesCovers).forEach(s => {
    if (!s) return;
    push(s.coverDisplay || s.cover);
  });
  (accessoryList || []).slice(0, lim.accThumbs).forEach(a => {
    if (!a) return;
    push(a.imgDisplay || a.img);
  });
  return urls;
}

function runShopImageWarm(urls, warmSet) {
  const set = warmSet || new Set();
  const list = (urls || []).filter(Boolean);
  if (!list.length) return;
  const batchSize = 6;
  let currentIndex = 0;
  const preloadBatch = () => {
    const batch = list.slice(currentIndex, currentIndex + batchSize);
    batch.forEach((url, index) => {
      if (set.has(url)) return;
      setTimeout(() => {
        wx.getImageInfo({
          src: url,
          success: () => {
            set.add(url);
          },
          fail: () => {}
        });
      }, index * 6);
    });
    currentIndex += batchSize;
    if (currentIndex < list.length) {
      setTimeout(preloadBatch, 40);
    }
  };
  preloadBatch();
}

module.exports = {
  SHOP_GLOBAL_CACHE_TTL_MS,
  batchResolveCloudFileIds,
  normalizeSeriesListFromDb,
  decorateSeriesImageFields,
  hydrateSeriesAndAccessoriesTogether,
  fixTopMediaListFromDoc,
  resolveTopMediaRenderUrls,
  listsHaveCompleteCloudDisplays,
  collectShopWarmImageUrls,
  runShopImageWarm
};
