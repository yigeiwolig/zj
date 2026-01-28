// 临时脚本：添加用户"321"到 user_list
// 使用方法：在微信开发者工具的控制台中运行

wx.cloud.callFunction({
  name: 'addUserToList',
  data: {
    nickname: '321',
    bypassLocationCheck: false // 可以设置为 true 来开启地域放行
  }
}).then(res => {
  console.log('添加结果:', res.result);
  if (res.result.success) {
    console.log('✅ 用户"321"已成功添加到 user_list');
  } else {
    console.error('❌ 添加失败:', res.result.errMsg);
  }
}).catch(err => {
  console.error('调用失败:', err);
});
