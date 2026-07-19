/**
 * 管理员「调试全流程」：以普通用户视角重跑入场弹窗 / 各页教程。
 * 不注销管理员身份，仅绕过 isAuthorized / isAdmin 对自动引导的屏蔽。
 */
const FLAG_KEY = '__mt_debug_user_flow_v1';
const TTL_MS = 45 * 60 * 1000;

const GUIDE_BASE_KEYS = [
  'mt_home_first_visit_guide_done_v1',
  'mt_kf_first_visit_guide_done_v1',
  'mt_profile_first_visit_guide_done_v1',
  'mt_case_first_visit_guide_done_v1',
  'mt_scan_first_visit_guide_done_v1',
  'mt_shouhou_first_visit_guide_done_v1'
];

const EXTRA_KEYS = [
  'has_seen_first_time_modal',
  'mt_shouhou_guide_show_count_v1',
  'mt_shop_exchange_policy_seen_v2',
  'mt_shop_budget_guide_seen_v1',
  'mt_scan_ble_connected_once_v1',
  'scan_model_pick_tip_seen_v1',
  'hasShownNewProductHint_F1',
  '__products_new_arrival_from_index__'
];

function _setAppFlag(on) {
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.__mt_debugUserFlow = !!on;
    }
  } catch (e) { /* ignore */ }
}

function clearGuideStorage() {
  GUIDE_BASE_KEYS.forEach((base) => {
    try {
      wx.removeStorageSync(base);
      wx.removeStorageSync(`${base}_intro_seen_v1`);
      wx.removeStorageSync(`${base}_perm_skip_v1`);
    } catch (e) { /* ignore */ }
  });
  EXTRA_KEYS.forEach((k) => {
    try {
      wx.removeStorageSync(k);
    } catch (e) { /* ignore */ }
  });
  // 遗留 onboarding 键（scan 等）
  try {
    const info = wx.getStorageInfoSync();
    (info.keys || []).forEach((k) => {
      if (/^hasShownOnboardingGuide_/.test(k)) {
        try { wx.removeStorageSync(k); } catch (e2) { /* ignore */ }
      }
    });
  } catch (e) { /* ignore */ }
}

function start() {
  clearGuideStorage();
  const payload = { active: true, ts: Date.now() };
  try {
    wx.setStorageSync(FLAG_KEY, payload);
  } catch (e) { /* ignore */ }
  _setAppFlag(true);
  try {
    wx.setStorageSync('__products_new_arrival_from_index__', Date.now());
  } catch (e) { /* ignore */ }
  return payload;
}

function stop() {
  try {
    wx.removeStorageSync(FLAG_KEY);
  } catch (e) { /* ignore */ }
  _setAppFlag(false);
}

function isActive() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.__mt_debugUserFlow === true) {
      // 仍校验 TTL
    }
  } catch (e) { /* ignore */ }
  try {
    const raw = wx.getStorageSync(FLAG_KEY);
    if (!raw || !raw.active) return false;
    if (Date.now() - (Number(raw.ts) || 0) > TTL_MS) {
      stop();
      return false;
    }
    _setAppFlag(true);
    return true;
  } catch (e) {
    return false;
  }
}

/** 自动引导处：true 表示按普通用户强制弹 */
function shouldForceUserGuides() {
  return isActive();
}

module.exports = {
  FLAG_KEY,
  start,
  stop,
  isActive,
  shouldForceUserGuides,
  clearGuideStorage
};
