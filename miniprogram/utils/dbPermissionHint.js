function isPermissionDenied(err) {
  const msg = String((err && err.errMsg) || (err && err.message) || err || '');
  return err && err.errCode === -502003
    || msg.indexOf('permission denied') >= 0
    || msg.indexOf('Permission denied') >= 0
    || msg.indexOf('-502003') >= 0;
}

function toastPermissionDenied(collectionName) {
  const coll = collectionName ? `「${collectionName}」` : '该集合';
  wx.showModal({
    title: '无法保存',
    content: `${coll}已开启数据库写保护。管理员保存请在云开发控制台将该集合写权限设为 true，或联系开发者。普通用户功能不受影响。`,
    showCancel: false,
    confirmText: '知道了'
  });
}

module.exports = {
  isPermissionDenied,
  toastPermissionDenied
};
