/** 换机残留清理（旧逻辑误标 awaiting / 误锁） */

function cleanupStaleReplacements() {
  return wx.cloud
    .callFunction({
      name: 'deviceReplacement',
      data: { action: 'cleanupStale' }
    })
    .then((res) => (res && res.result) || {})
}

module.exports = {
  cleanupStaleReplacements
}
