function callKfFeedback(data) {
  return wx.cloud.callFunction({
    name: 'kfFeedback',
    data
  }).then((res) => (res && res.result) || { success: false, error: 'EMPTY' });
}

function submit(content, nickName) {
  return callKfFeedback({
    action: 'submit',
    content,
    nickName: nickName || ''
  });
}

function listAdmin() {
  return callKfFeedback({ action: 'listAdmin' });
}

function markRead(id) {
  return callKfFeedback({ action: 'markRead', id });
}

function resolveNickName() {
  try {
    const app = getApp();
    const g = app && app.globalData;
    if (g && g.userInfo && g.userInfo.nickName) {
      return String(g.userInfo.nickName);
    }
    const cached = wx.getStorageSync('user_nickname');
    if (cached) return String(cached);
  } catch (e) {}
  return '微信用户';
}

function formatTime(ts) {
  if (!ts) return '';
  if (typeof ts === 'object') {
    if (ts.$date) return formatTime(ts.$date);
    if (typeof ts.toDate === 'function') return formatTime(ts.toDate());
  }
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = {
  submit,
  listAdmin,
  markRead,
  resolveNickName,
  formatTime
};
