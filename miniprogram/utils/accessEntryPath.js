/**
 * 记录用户如何拿到访问口令：
 * - kf：点过「联系客服」领取
 * - direct：点「我已有口令」直接粘贴进入
 * 直接粘贴进主页时弹一次「请先看教程」提醒；走客服的不弹。
 */
const PATH_KEY = 'mt_access_entry_path_v1';
const SEEN_KEY = 'mt_direct_code_tutorial_notice_seen_v1';
const PENDING_KEY = '__mt_pending_direct_code_tutorial_notice__';

function _readPath() {
  try {
    return String(wx.getStorageSync(PATH_KEY) || '');
  } catch (e) {
    return '';
  }
}

function markAccessEntryViaKf() {
  try {
    wx.setStorageSync(PATH_KEY, 'kf');
  } catch (e) { /* ignore */ }
}

/** 仅当尚未标记为客服路径时，记为直接粘贴 */
function markAccessEntryViaDirectCode() {
  try {
    if (_readPath() === 'kf') return;
    wx.setStorageSync(PATH_KEY, 'direct');
  } catch (e) { /* ignore */ }
}

function clearAccessEntryPath() {
  try {
    wx.removeStorageSync(PATH_KEY);
  } catch (e) { /* ignore */ }
}

function hasSeenDirectCodeTutorialNotice() {
  try {
    return !!wx.getStorageSync(SEEN_KEY);
  } catch (e) {
    return false;
  }
}

function markDirectCodeTutorialNoticeSeen() {
  try {
    wx.setStorageSync(SEEN_KEY, true);
  } catch (e) { /* ignore */ }
}

/** 口令登录成功后：若为直接粘贴且未看过提醒，则挂起待主页弹出 */
function maybeQueueDirectCodeTutorialNotice({ isAccessCodeLogin } = {}) {
  if (!isAccessCodeLogin) {
    clearAccessEntryPath();
    return false;
  }
  const path = _readPath();
  clearAccessEntryPath();
  if (path !== 'direct') return false;
  if (hasSeenDirectCodeTutorialNotice()) return false;
  try {
    wx.setStorageSync(PENDING_KEY, Date.now());
    return true;
  } catch (e) {
    return false;
  }
}

/** 主页消费：有待弹则返回 true 并清除 pending */
function consumePendingDirectCodeTutorialNotice() {
  try {
    const pending = wx.getStorageSync(PENDING_KEY);
    if (!pending) return false;
    wx.removeStorageSync(PENDING_KEY);
    if (hasSeenDirectCodeTutorialNotice()) return false;
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  PATH_KEY,
  SEEN_KEY,
  PENDING_KEY,
  markAccessEntryViaKf,
  markAccessEntryViaDirectCode,
  clearAccessEntryPath,
  maybeQueueDirectCodeTutorialNotice,
  consumePendingDirectCodeTutorialNotice,
  markDirectCodeTutorialNoticeSeen,
  hasSeenDirectCodeTutorialNotice
};
