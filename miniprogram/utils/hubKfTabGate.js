/** 底栏「客服」：首次冷启动隐藏，第二次及以后显示 */
const STORAGE_KEY = 'mp_launch_count';

function getLaunchCount() {
  const n = Number(wx.getStorageSync(STORAGE_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** app.onLaunch 调用：递增并返回是否显示客服 Tab */
function recordLaunch() {
  const next = getLaunchCount() + 1;
  try {
    wx.setStorageSync(STORAGE_KEY, next);
  } catch (e) {}
  return next >= 2;
}

function shouldShowHubKfTab() {
  return getLaunchCount() >= 2;
}

function resolveShowHubKfTab() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.showHubKfTab != null) {
      return !!app.globalData.showHubKfTab;
    }
  } catch (e) {}
  return shouldShowHubKfTab();
}

module.exports = {
  STORAGE_KEY,
  getLaunchCount,
  recordLaunch,
  shouldShowHubKfTab,
  resolveShowHubKfTab
};
