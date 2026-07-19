/**
 * 管理待办企微提醒（失败不影响主流程）
 * kind: repair_pending | case_video | ...
 */
function notifyAdminTodo(kind, oneLine) {
  try {
    if (!wx.cloud || !wx.cloud.callFunction) return
    wx.cloud.callFunction({
      name: 'wecomNotify',
      data: {
        action: 'notifyAdminTodo',
        kind: String(kind || '').trim(),
        oneLine: String(oneLine || '').trim()
      }
    }).catch(function () {})
  } catch (e) {
    // ignore
  }
}

module.exports = {
  notifyAdminTodo
}
