/**
 * 功能引导：首次直接进入分步教程；再次进入先弹「查看教程 | 跳过」；跳过则永久不再自动弹。
 */
function getGuideIntroKeys(baseKey) {
  return {
    permSkip: `${baseKey}_perm_skip_v1`,
    introSeen: `${baseKey}_intro_seen_v1`,
    legacyDone: baseKey
  };
}

function migrateLegacyGuideDone(keys) {
  try {
    if (wx.getStorageSync(keys.permSkip) || wx.getStorageSync(keys.introSeen)) return;
    if (wx.getStorageSync(keys.legacyDone)) {
      wx.setStorageSync(keys.introSeen, true);
    }
  } catch (e) { /* ignore */ }
}

function isGuidePermSkipped(keys) {
  try {
    return !!wx.getStorageSync(keys.permSkip);
  } catch (e) {
    return false;
  }
}

function hasGuideIntroSeen(keys) {
  try {
    return !!wx.getStorageSync(keys.introSeen);
  } catch (e) {
    return false;
  }
}

function markGuideIntroSeen(keys) {
  try {
    wx.setStorageSync(keys.introSeen, true);
  } catch (e) { /* ignore */ }
}

function markGuidePermSkip(keys) {
  try {
    wx.setStorageSync(keys.permSkip, true);
  } catch (e) { /* ignore */ }
}

/** @returns {'none'|'intro'|'steps'} */
function resolveGuideAutoEntry(keys) {
  migrateLegacyGuideDone(keys);
  if (isGuidePermSkipped(keys)) return 'none';
  if (hasGuideIntroSeen(keys)) return 'intro';
  return 'steps';
}

module.exports = {
  getGuideIntroKeys,
  migrateLegacyGuideDone,
  isGuidePermSkipped,
  hasGuideIntroSeen,
  markGuideIntroSeen,
  markGuidePermSkip,
  resolveGuideAutoEntry
};
