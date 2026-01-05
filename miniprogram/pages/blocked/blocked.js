// miniprogram/pages/blocked/blocked.js
Page({
  data: {
    checkTimer: null,
    type: '', // 封禁类型
    canCheck: false // 冷却期间禁止检查
  },

  onLoad(options) {
    const type = options.type || '';
    this.setData({ type });
    
    // 🔴 重置跳转标志，允许后续跳转
    const app = getApp();
    app.globalData._isJumpingToBlocked = false;
    
    wx.hideHomeButton();

    const initialDelay = type === 'location' ? 3000 : 0;
    if (initialDelay > 0) {
      console.log(`🛡️ 地址拦截模式：启动 ${initialDelay}ms 写入保护期...`);
    }

    setTimeout(() => {
      this.setData({ canCheck: true });
      console.log('🛡️ 写入保护期结束，开始检测');
      this.startAutoCheck();
    }, initialDelay);
  },

  onUnload() {
    this.stopAutoCheck();
  },

  startAutoCheck() {
    this.stopAutoCheck();
    console.log('⏳ 开启云端状态检测 (4秒/次)...');
    
    if (this.data.canCheck) {
      this.callCheckCloud();
    }

    this.setData({
      checkTimer: setInterval(() => {
        if (this.data.canCheck) {
          this.callCheckCloud();
        }
      }, 4000)
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
    if (!this.data.canCheck) {
      console.log('⌛ 写入保护期内，跳过检测');
      return;
    }

    wx.cloud.callFunction({
      name: 'checkUnlockStatus'
    }).then(res => {
      const result = res.result || {};
      const action = result.action;

      console.log('📡 云端指令:', action);

      // --- 指令 A: PASS (自动录入，直接放行) ---
      if (action === 'PASS') {
        this.stopAutoCheck();
        const nickname = result.nickname || '';
        
        // 🔴 关键：清除所有封禁标记（包括截图封禁标记）
        wx.removeStorageSync('is_user_banned');
        wx.removeStorageSync('is_screenshot_banned'); // 清除截图封禁标记
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

        // 🔴 关键修复：RETRY 表示云函数已确认 login_logs 中的 isBanned 为 false
        // 说明管理员已经在后台解封，可以清除所有封禁标记
        wx.removeStorageSync('is_user_banned');
        wx.removeStorageSync('is_screenshot_banned'); // 清除截图封禁标记
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
    wx.setClipboardData({ data: 'MT-mogaishe' });
  }
});
