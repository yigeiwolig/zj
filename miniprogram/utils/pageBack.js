/**
 * 统一页面返回：避免 redirectTo / 单页栈时误回启动页 index（MT 动画入口）
 */
const INDEX_URL = '/pages/index/index';
const HUB_URL = '/package-app/pages/products/products';

function getPages() {
  return getCurrentPages() || [];
}

function findRouteIndex(part) {
  const pages = getPages();
  return pages.findIndex((p) => (p.route || '').indexOf(part) >= 0);
}

/** 启动页 index 仅作入场，不应作为子页 navigateBack 的目标 */
function isIndexRoute(route) {
  const r = route || '';
  return r === 'pages/index/index' || r.indexOf('index/index') >= 0;
}

function resolveFallbackUrl(fallback, fallbackUrl) {
  if (fallbackUrl) return fallbackUrl;
  if (fallback === 'index') return INDEX_URL;
  if (typeof fallback === 'string' && fallback.indexOf('/') === 0) return fallback;
  return HUB_URL;
}

function reLaunchFallback(fallback, fallbackUrl) {
  wx.reLaunch({ url: resolveFallbackUrl(fallback, fallbackUrl) });
}

/**
 * @param {object} [options]
 * @param {number} [options.delta] 指定返回层数
 * @param {boolean} [options.preferProducts] 栈内有 products 时优先回到枢纽页
 * @param {() => boolean} [options.onBeforePop] 返回 true 表示已处理（如先关子层）
 * @param {'hub'|'index'|string} [options.fallback] 无法 pop 时的兜底
 * @param {string} [options.fallbackUrl]
 */
function goBack(options = {}) {
  const {
    delta,
    preferProducts = true,
    onBeforePop,
    fallback = 'hub',
    fallbackUrl
  } = options;

  if (typeof onBeforePop === 'function' && onBeforePop()) {
    return;
  }

  const pages = getPages();
  if (pages.length <= 1) {
    reLaunchFallback(fallback, fallbackUrl);
    return;
  }

  if (preferProducts && delta == null) {
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      wx.navigateBack({
        delta: pages.length - 1 - productsIdx,
        fail: () => reLaunchFallback(fallback, fallbackUrl)
      });
      return;
    }
  }

  const prev = pages[pages.length - 2];
  if (isIndexRoute(prev && prev.route)) {
    reLaunchFallback(fallback, fallbackUrl);
    return;
  }

  wx.navigateBack({
    delta: delta != null ? delta : 1,
    fail: () => reLaunchFallback(fallback, fallbackUrl)
  });
}

/** 子功能页默认：回到枢纽 products，而不是启动页 index */
function popOrHub(options = {}) {
  goBack({ fallback: 'hub', ...options });
}

/**
 * 按层数返回，若落点会是 index 则改 reLaunch 枢纽（供支付成功、hubNav 等复用）
 * @param {number} delta
 */
function safePop(delta, options = {}) {
  const { fallback = 'hub', fallbackUrl } = options;
  const pages = getPages();
  if (pages.length <= 1) {
    reLaunchFallback(fallback, fallbackUrl);
    return;
  }
  const d = Math.min(Math.max(1, delta || 1), pages.length - 1);
  const target = pages[pages.length - 1 - d];
  if (isIndexRoute(target && target.route)) {
    reLaunchFallback(fallback, fallbackUrl);
    return;
  }
  wx.navigateBack({
    delta: d,
    fail: () => reLaunchFallback(fallback, fallbackUrl)
  });
}

/** 栈内存在 route 片段则 pop 到该页，否则枢纽 */
function popToRoute(part, options = {}) {
  const idx = findRouteIndex(part);
  const pages = getPages();
  if (idx >= 0 && idx < pages.length - 1) {
    safePop(pages.length - 1 - idx, options);
    return true;
  }
  return false;
}

module.exports = {
  INDEX_URL,
  HUB_URL,
  getPages,
  findRouteIndex,
  isIndexRoute,
  goBack,
  popOrHub,
  safePop,
  popToRoute,
  reLaunchFallback
};
