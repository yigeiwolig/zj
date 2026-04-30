/**
 * 全站图/视频上传统一走 COS 数据桶（与云函数 getCosUploadUrl 配合）。
 * 禁止再使用 wx.cloud.uploadFile 写入微信云存储。
 */
module.exports = require('./cosUpload.js');
