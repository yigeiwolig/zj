function getDeviceInfo() {
  try {
    if (typeof wx.getDeviceInfo === 'function') {
      return wx.getDeviceInfo() || {};
    }
    return wx.getSystemInfoSync() || {};
  } catch (e) {
    return {};
  }
}

/** 是否在微信开发者工具中运行（真机预览/正式版为 false） */
function isDevtoolsEnv() {
  try {
    const platform = String(getDeviceInfo().platform || '').toLowerCase();
    if (platform) return platform === 'devtools';
    if (typeof wx.getAppBaseInfo === 'function') {
      return (wx.getAppBaseInfo() || {}).platform === 'devtools';
    }
    return false;
  } catch (e) {
    return false;
  }
}

/** 是否 PC 端需拦截（微信 PC 客户端等；开发者工具放行便于本地调试） */
function isPcBannedClient() {
  try {
    if (isDevtoolsEnv()) return false;
    const info = getDeviceInfo();
    const platform = String(info.platform || '').toLowerCase();
    if (['windows', 'mac', 'macos', 'desktop'].includes(platform)) return true;
    const system = String(info.system || '').toLowerCase();
    if (/windows|mac\s*os|macos|macintosh/.test(system)) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/** 已在 blocked 页则不再跳转 */
function isOnBlockedPage() {
  try {
    const pages = getCurrentPages();
    const cur = pages && pages.length ? pages[pages.length - 1] : null;
    return !!(cur && cur.route && cur.route.indexOf('pages/blocked/blocked') !== -1);
  } catch (e) {
    return false;
  }
}

/** 命中 PC 则 reLaunch 到 blocked；返回 true 表示已拦截 */
function redirectToPcBlockedIfNeeded() {
  if (!isPcBannedClient()) return false;
  if (isOnBlockedPage()) return true;

  let app = null;
  try {
    app = getApp();
  } catch (e) {}

  if (app && app.globalData && app.globalData._isJumpingToPcBlocked) {
    return true;
  }
  if (app && app.globalData) {
    app.globalData._isJumpingToPcBlocked = true;
  }

  wx.reLaunch({
    url: '/pages/blocked/blocked?type=pc',
    complete: () => {
      if (app && app.globalData) {
        app.globalData._isJumpingToPcBlocked = false;
      }
    },
    fail: () => {
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/blocked/blocked?type=pc' });
      }, 300);
    }
  });

  if (wx.hideHomeButton) {
    try { wx.hideHomeButton(); } catch (e) {}
  }
  return true;
}

module.exports = {
  getDeviceInfo,
  isDevtoolsEnv,
  isPcBannedClient,
  redirectToPcBlockedIfNeeded
};
