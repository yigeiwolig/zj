/**
 * 枢纽底栏「我的」红点：有售后待办 / 未读进度时提示，无需订阅消息。
 */
const SEEN_KEY = 'hub_profile_badge_seen_v1';

function readSeenMap() {
  try {
    const raw = wx.getStorageSync(SEEN_KEY);
    if (raw && typeof raw === 'object') return raw;
  } catch (e) { /* ignore */ }
  return {};
}

function writeSeenMap(map) {
  try {
    wx.setStorageSync(SEEN_KEY, map || {});
  } catch (e) { /* ignore */ }
}

function statusSeenKey(repair) {
  if (!repair || !repair._id) return '';
  return `${repair._id}:${String(repair.status || '')}`;
}

/** 仍有用户待办 → 一直亮红点，直到办完 */
function isActionTodo(repair) {
  if (!repair) return false;
  if (repair.needReturn === true && repair.returnCompleted !== true) return true;
  if (repair.needPurchaseParts === true && repair.purchasePartsStatus !== 'completed') return true;
  if (repair.paidRepairAgreed === false) return true;
  if (
    repair.repairFee > 0
    && repair.repairPaid !== true
    && (repair.warrantyExpired === true || repair.needReturn === true)
  ) {
    return true;
  }
  return false;
}

/** 进度类通知：进过「我的」看过后可消掉 */
function isProgressNotice(repair) {
  if (!repair) return false;
  const st = String(repair.status || '');
  return st === 'SHIPPED' || st === 'TUTORIAL' || st === 'REPAIR_COMPLETED_SENT';
}

function repairNeedsBadge(repair, seenMap) {
  if (!repair) return false;
  if (isActionTodo(repair)) return true;
  if (!isProgressNotice(repair)) return false;
  const key = statusSeenKey(repair);
  if (!key) return false;
  return !(seenMap && seenMap[key]);
}

function anyRepairNeedsBadge(list, seenMap) {
  const rows = Array.isArray(list) ? list : [];
  const seen = seenMap || readSeenMap();
  return rows.some((r) => repairNeedsBadge(r, seen));
}

/** 用户打开「我的」时：把当前进度类通知记为已读（待办仍会继续亮） */
function markProgressNoticesSeen(list) {
  const rows = Array.isArray(list) ? list : [];
  const seen = readSeenMap();
  let changed = false;
  rows.forEach((r) => {
    if (!isProgressNotice(r) || isActionTodo(r)) return;
    const key = statusSeenKey(r);
    if (!key || seen[key]) return;
    seen[key] = Date.now();
    changed = true;
  });
  if (changed) writeSeenMap(seen);
  return seen;
}

/**
 * 拉取当前用户近期维修单，判断是否应亮红点。
 * @returns {Promise<{ show: boolean, list: Array }>}
 */
function fetchProfileBadgeState() {
  const db = wx.cloud.database();
  const _ = db.command;
  return db.collection('shouhou_repair')
    .orderBy('createTime', 'desc')
    .limit(30)
    .get()
    .then((res) => {
      const list = (res && res.data) || [];
      const relevant = list.filter((r) => (
        isActionTodo(r) || isProgressNotice(r)
      ));
      const seen = readSeenMap();
      return {
        show: anyRepairNeedsBadge(relevant, seen),
        list: relevant
      };
    })
    .catch((err) => {
      console.warn('[hubProfileBadge] fetch failed', err);
      return { show: false, list: [] };
    });
}

module.exports = {
  SEEN_KEY,
  readSeenMap,
  writeSeenMap,
  isActionTodo,
  isProgressNotice,
  repairNeedsBadge,
  anyRepairNeedsBadge,
  markProgressNoticesSeen,
  fetchProfileBadgeState
};
