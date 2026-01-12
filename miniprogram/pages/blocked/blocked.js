// miniprogram/pages/blocked/blocked.js
Page({
  data: {
    checkTimer: null,
    type: '', // 封禁类型
    canCheck: false, // 冷却期间禁止检查
    showCopySuccessModal: false // 自定义"内容已复制"弹窗
  },

  onLoad(options) {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('blocked');
    }
    
    const type = options.type || '';
    this.setData({ type });
    
    // 🔴 重置跳转标志，允许后续跳转
    app.globalData._isJumpingToBlocked = false;
    
    wx.hideHomeButton();

    // 🔴 关键修复：截屏/录屏封禁需要延迟更长时间，等待 banUserByScreenshot 云函数执行完成
    const isScreenshotType = type === 'screenshot' || type === 'record';
    const initialDelay = type === 'location' ? 3000 : (isScreenshotType ? 3000 : 0);
    
    if (initialDelay > 0) {
      if (isScreenshotType) {
        console.log(`🛡️ 截屏/录屏封禁模式：启动 ${initialDelay}ms 延迟，等待数据库更新完成...`);
      } else {
        console.log(`🛡️ 地址拦截模式：启动 ${initialDelay}ms 写入保护期...`);
      }
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
        const returnToIndex = result.returnToIndex === true; // 地址拦截解封标记
        
        // 🔴 关键：清除所有封禁标记（包括截图封禁标记）
        wx.removeStorageSync('is_user_banned');
        wx.removeStorageSync('is_screenshot_banned'); // 清除截图封禁标记
        
        if (returnToIndex) {
          // 🔴 地址拦截解封：直接返回 index 页面，不设置永久授权（让用户重新走流程）
          console.log('[blocked] 地址拦截解封，返回 index 页面');
          wx.showToast({ title: '已解封', icon: 'success' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' });
          }, 1500);
        } else {
          // 其他情况：设置永久授权和昵称，直接放行
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
      } 
      
      // --- 指令 B: RETRY (允许重试) ---
      else if (action === 'RETRY') {
        this.stopAutoCheck();
        
        // 🔴 关键修复：检查是否是截屏封禁类型
        // 如果是截屏封禁被解封，且用户之前已经通过验证，应该保持授权状态
        const wasScreenshotBan = this.data.type === 'screenshot' || this.data.type === 'record';
        const hadAuth = wx.getStorageSync('has_permanent_auth');
        const hadNickname = wx.getStorageSync('user_nickname');
        
        if (wasScreenshotBan && hadAuth && hadNickname) {
          // 截屏封禁解封，且用户之前已通过验证，直接放行到产品页
          console.log('[blocked] 截屏封禁解封，用户之前已通过验证，直接放行');
          wx.removeStorageSync('is_user_banned');
          wx.removeStorageSync('is_screenshot_banned');
          // 保持 has_permanent_auth 和 user_nickname，不清除
          
          wx.showToast({ title: '已解封', icon: 'success' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/products/products' });
          }, 1500);
        } else {
          // 其他情况：需要重新验证昵称
        wx.showToast({ title: '请重新验证', icon: 'none' });

          // 清除所有封禁标记和授权状态
        wx.removeStorageSync('is_user_banned');
          wx.removeStorageSync('is_screenshot_banned');
        wx.removeStorageSync('has_permanent_auth'); 
        
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
        }
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
    wx.setClipboardData({ 
      data: 'MT-mogaishe',
      success: () => {
        // 立即隐藏微信原生的"内容已复制"提示（多次尝试确保隐藏）
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
        setTimeout(() => { wx.hideToast(); }, 100);
        setTimeout(() => { wx.hideToast(); }, 150);
        
        // 显示自定义"内容已复制"弹窗
        this.setData({ showCopySuccessModal: true });
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
      }
    });
  }
});
