/**
 * 全站图/视频上传统一走 COS 数据桶（与云函数 getCosUploadUrl 配合）。
 * 统一走 COS（cosUpload），不使用 wx.cloud.uploadFile。
 */
module.exports = require('./cosUpload.js');
