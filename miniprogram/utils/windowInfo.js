/** 替代已废弃的 wx.getSystemInfoSync */
function getWindowInfoSafe() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      return wx.getWindowInfo();
    }
  } catch (e) {}
  return {
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 44,
    safeArea: { top: 44, bottom: 667, left: 0, right: 375 }
  };
}

module.exports = { getWindowInfoSafe };
