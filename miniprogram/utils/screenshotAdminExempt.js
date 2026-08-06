/**
 * 管理员（guanliyuan）豁免截屏/录屏封禁
 * setVisualEffectOnCapture 是小程序全局态：任一页设为 hidden，其它页也会黑屏，
 * 因此管理员需在「任意界面」持续允许截屏/录屏。
 */
const ADMIN_CACHE_KEY = '__guanliyuan_screenshot_exempt__';
const ADMIN_CACHE_TTL = 10 * 60 * 1000;

let _ensureInFlight = null;
/** null=未确认，true/false=本会话已确认 */
let _sessionIsGuanliyuan = null;

function isTruthyFlag(v) {
  return v === true || v === 1 || v === 'true' || v === '1';
}

function readLegacyAdminCache() {
  try {
    const scanCache = wx.getStorageSync('__scan_admin_privilege_cache__');
    if (scanCache && scanCache.isAdmin === true && scanCache.ts && (Date.now() - scanCache.ts < ADMIN_CACHE_TTL)) {
      return true;
    }
    const productsCache = wx.getStorageSync('__products_admin_privilege_cache__');
    if (productsCache && productsCache.isAuthorized === true && productsCache.ts && (Date.now() - productsCache.ts < ADMIN_CACHE_TTL)) {
      return true;
    }
    const shopCache = wx.getStorageSync('__shop_admin_privilege_cache__');
    if (shopCache && shopCache.isAuthorized === true && shopCache.ts && (Date.now() - shopCache.ts < ADMIN_CACHE_TTL)) {
      return true;
    }
    const pagenewCache = wx.getStorageSync('__pagenew_admin_privilege_cache__');
    if (pagenewCache && pagenewCache.isAuthorized === true && pagenewCache.ts && (Date.now() - pagenewCache.ts < ADMIN_CACHE_TTL)) {
      return true;
    }
  } catch (e) {}
  return false;
}

/** 同步判断：页面 data + 本地缓存 + 本会话确认 */
function isScreenshotBanExempt(ctx) {
  if (_sessionIsGuanliyuan === true) return true;
  if (!ctx) return false;
  const d = ctx.data || {};
  if (isTruthyFlag(d.isAdmin)) return true;
  if (isTruthyFlag(d.isAuthorized)) return true;
  try {
    const cache = wx.getStorageSync(ADMIN_CACHE_KEY);
    if (cache && cache.isGuanliyuan === true && cache.ts && (Date.now() - cache.ts < ADMIN_CACHE_TTL)) {
      return true;
    }
  } catch (e) {}
  return readLegacyAdminCache();
}

function markGuanliyuanCache(isGuanliyuan) {
  _sessionIsGuanliyuan = !!isGuanliyuan;
  try {
    wx.setStorageSync(ADMIN_CACHE_KEY, { isGuanliyuan: !!isGuanliyuan, ts: Date.now() });
  } catch (e) {}
}

/** 管理员允许正常截屏（取消黑屏） */
function allowScreenCaptureIfExempt() {
  try {
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({ visualEffect: 'none', success: () => {}, fail: () => {} });
    }
  } catch (e) {}
}

/** 异步校验 guanliyuan 并更新缓存 */
async function ensureScreenshotBanExempt(ctx) {
  if (isScreenshotBanExempt(ctx)) {
    allowScreenCaptureIfExempt();
    return true;
  }
  try {
    const res = await wx.cloud.callFunction({ name: 'login' });
    const openid = res && res.result && res.result.openid;
    if (!openid) return false;
    const db = wx.cloud.database();
    let adminCheck = await db.collection('guanliyuan').where({ openid }).limit(1).get();
    if (!adminCheck.data || adminCheck.data.length === 0) {
      adminCheck = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
    }
    const isGuanliyuan = !!(adminCheck.data && adminCheck.data.length);
    markGuanliyuanCache(isGuanliyuan);
    if (isGuanliyuan) {
      allowScreenCaptureIfExempt();
      if (ctx && ctx.setData) {
        const patch = {};
        if (ctx.data && 'isAuthorized' in ctx.data && !ctx.data.isAuthorized) {
          patch.isAuthorized = true;
        }
        // hub 内嵌页勿强行打开 isAdmin；独立页可同步，避免 UI 误亮管理员开关
        if (
          ctx.data &&
          'isAdmin' in ctx.data &&
          !ctx.data.isAdmin &&
          !ctx.data.hubInShell
        ) {
          patch.isAdmin = true;
        }
        if (Object.keys(patch).length) ctx.setData(patch);
      }
    }
    return isGuanliyuan;
  } catch (e) {
    return false;
  }
}

/**
 * 每个页面 onShow 调用：管理员在任意界面保持可截图/录屏。
 * 非管理员只做一次云端确认，避免每页都打 login。
 */
function applyAdminCaptureOnPageShow(ctx) {
  if (isScreenshotBanExempt(ctx)) {
    allowScreenCaptureIfExempt();
    return;
  }
  if (_sessionIsGuanliyuan === false) return;
  if (_ensureInFlight) return;
  _ensureInFlight = ensureScreenshotBanExempt(ctx)
    .then((ok) => {
      if (_sessionIsGuanliyuan === null) {
        _sessionIsGuanliyuan = !!ok;
      }
      return ok;
    })
    .catch(() => false)
    .finally(() => {
      _ensureInFlight = null;
    });
}

module.exports = {
  ADMIN_CACHE_KEY,
  isScreenshotBanExempt,
  markGuanliyuanCache,
  allowScreenCaptureIfExempt,
  ensureScreenshotBanExempt,
  applyAdminCaptureOnPageShow
};
