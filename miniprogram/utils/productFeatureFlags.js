/** 与 products 页功能开关一致（shop_config.productFeatureFlags） */
const FEATURE_FLAGS_LOCAL_KEY = '__products_feature_flags__';
const FEATURE_ID_SHOP = 4;

function isFlagEnabled(val) {
  if (val === undefined || val === null) return true;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  if (val === true || val === 1 || val === '1' || val === 'true') return true;
  return !!val;
}

function readLocalFlags() {
  try {
    const cache = wx.getStorageSync(FEATURE_FLAGS_LOCAL_KEY);
    if (cache && cache.flags && cache.ts && Date.now() - cache.ts < 7 * 24 * 60 * 60 * 1000) {
      return cache.flags;
    }
  } catch (e) {}
  return null;
}

function getGlobalFlags() {
  try {
    const app = getApp();
    const flags = app && app.globalData && app.globalData.productFeatureFlags;
    return flags && typeof flags === 'object' ? flags : null;
  } catch (e) {
    return null;
  }
}

/** 功能是否对用户开放；管理员 isAuthorized 始终放行 */
function isProductFeatureEnabled(id, opts = {}) {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return false;
  if (opts.isAuthorized) return true;

  const key = String(numId);
  const globalFlags = getGlobalFlags();
  if (globalFlags && Object.prototype.hasOwnProperty.call(globalFlags, key)) {
    return isFlagEnabled(globalFlags[key]);
  }
  const localFlags = readLocalFlags();
  if (localFlags && Object.prototype.hasOwnProperty.call(localFlags, key)) {
    return isFlagEnabled(localFlags[key]);
  }
  return true;
}

function getFeatureClosedMessage(id) {
  const titles = { '4': '产品选购' };
  const title = titles[String(id)] || '该功能';
  return `${title}正在开发中，敬请期待`;
}

module.exports = {
  FEATURE_FLAGS_LOCAL_KEY,
  FEATURE_ID_SHOP,
  isFlagEnabled,
  isProductFeatureEnabled,
  getFeatureClosedMessage
};
