// miniprogram/pages/blocked/blocked.js
Page({
  data: {
    checkTimer: null,
    type: '', // 封禁类型：'banned' 或其他
    showCopySuccessModal: false // 控制"内容已复制"弹窗
  },

  onLoad(options) {
    // 接收封禁类型参数
    const type = options.type || '';
    this.setData({ type: type });
    
    wx.hideHomeButton(); // 锁死
    
    // 🔴 修改：截图封禁也启动自动检查，以便响应管理员在后台的解封操作
    // 管理员可以在后台将 login_logs 中的 isBanned 改为 false 来解封
    this.startAutoCheck();
  },

  onUnload() {
    this.stopAutoCheck();
  },

  startAutoCheck() {
    this.stopAutoCheck();
    console.log('⏳ 开启云端状态检测 (5秒/次)...');
    
    // 立即执行一次
    this.callCheckCloud();

    this.setData({
      checkTimer: setInterval(() => {
        this.callCheckCloud();
      }, 5000)
    });
  },

  stopAutoCheck() {
    if (this.data.checkTimer) {
      clearInterval(this.data.checkTimer);
      this.setData({ checkTimer: null });
    }
  },

  // === 核心：呼叫云函数查询指令 ===
  callCheckCloud() {
    // 🔴 统一封禁逻辑：所有封禁都通过 isBanned 字段控制
    // 管理员可以在后台将 login_logs 中的 isBanned 改为 false 来解封
    
    wx.cloud.callFunction({
      name: 'checkUnlockStatus' // 调用云函数检查解封状态
    }).then(res => {
      const result = res.result || {};
      const action = result.action;

      console.log('📡 云端指令:', action);

      // --- 指令 A: PASS (自动录入，直接放行) ---
      if (action === 'PASS') {
        this.stopAutoCheck();
        const nickname = result.nickname || '';
        
        // 🔴 关键：清除所有封禁标记
        wx.removeStorageSync('is_user_banned');
        wx.removeStorageSync('is_screenshot_banned'); // 清除旧的截图封禁标记（兼容旧数据）
        // 设置永久授权和昵称，直接放行
        wx.setStorageSync('has_permanent_auth', true);
        if (nickname) {
          wx.setStorageSync('user_nickname', nickname);
        }
        
        wx.showToast({ title: '验证通过', icon: 'success' });

        setTimeout(() => {
          // 直接跳回首页，用户已通过验证，不需要重新输入昵称
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
      } 
      
      // --- 指令 B: RETRY (允许重试) ---
      else if (action === 'RETRY') {
        this.stopAutoCheck();
        wx.showToast({ title: '请重新验证', icon: 'none' });

        // 🔴 关键：RETRY 表示云函数已确认 login_logs 中的 isBanned 为 false
        // 说明管理员已经在后台解封，可以清除所有封禁标记
        wx.removeStorageSync('is_user_banned');
        wx.removeStorageSync('is_screenshot_banned'); // 清除旧的截图封禁标记（兼容旧数据）
        wx.removeStorageSync('has_permanent_auth'); 
        
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
      }

      // --- 指令 C: WAIT (继续等) ---
      else {
        // 如果返回 WAIT，说明 login_logs 中的 isBanned 仍为 true，继续等待管理员解封
        console.log('⏳ 等待管理员解封...');
      }

    }).catch(err => {
      console.error('云函数调用失败', err);
    });
  },

  handleCopyWechat() {
    // 🔴 确保拦截微信官方的 toast（如果存在）
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    
    wx.setClipboardData({ 
      data: 'MT-mogaishe',
      success: () => {
        // 🔴 再次确保关闭微信官方 toast（如果被触发）
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
        // 显示自定义"内容已复制"弹窗（白色，大一点）
        this.setData({ showCopySuccessModal: true });
        // 2秒后自动关闭
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
      }
    });
  }
});
