// miniprogram/pages/blocked/blocked.js
Page({
  data: {
    checkTimer: null,
    type: '', // 封禁类型
    canCheck: false, // 冷却期间禁止检查
    showCopySuccessModal: false, // 自定义"内容已复制"弹窗
    // 【新增】自定义成功提示弹窗
    showCustomSuccessModal: false,
    customSuccessModalClosing: false, // 成功提示弹窗退出动画中
    successModalTitle: '',
    successModalContent: ''
  },

  // 互斥：确保同一时间只显示一个弹窗/提示
  _closeAllPopups() {
    try { wx.hideToast(); } catch (e) {}
    try { wx.hideLoading(); } catch (e) {}
    const patch = {};
    if (this.data.showCustomSuccessModal) patch.showCustomSuccessModal = false;
    if (this.data.customSuccessModalClosing) patch.customSuccessModalClosing = false;
    if (this.data.showCopySuccessModal) patch.showCopySuccessModal = false;
    if (Object.keys(patch).length) this.setData(patch);
  },

  // 统一方法：显示"内容已复制"弹窗（互斥）
  _showCopySuccessOnce() {
    // 🔴 清理之前的定时器，避免快速连续调用时状态混乱
    if (this._copySuccessTimer) {
      clearTimeout(this._copySuccessTimer);
      this._copySuccessTimer = null;
    }
    this._closeAllPopups();
    this.setData({ showCopySuccessModal: true });
    this._copySuccessTimer = setTimeout(() => {
      this.setData({ showCopySuccessModal: false });
      this._copySuccessTimer = null;
    }, 1500);
  },

  onLoad(options) {
    // 🔴 1. 隐藏左上角返回首页按钮（极为重要）
    if (wx.hideHomeButton) {
      wx.hideHomeButton();
    }
    
    // 🔴 2. 禁用右上角胶囊菜单的转发分享功能，防止用户分享出去
    if (wx.hideShareMenu) {
      wx.hideShareMenu();
    }

    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('blocked');
    }
    
    
    const type = options.type || '';
    this.setData({ type });
    
    // 🔴 重置跳转标志，允许后续跳转
    app.globalData._isJumpingToBlocked = false;

    // 🔴 PC端不需要自动检查，直接返回
    if (type === 'pc' || type === 'pc_banned') {
      console.log('[blocked] PC端访问，停止自动检查');
      return;
    }

    // 🔴 已移除开发工具环境限制，允许在开发工具中也能正常检查 Auto 模式
    // 之前代码：开发环境下不启动云函数检查，避免自动解封
    // 现在允许开发工具环境也执行检查，方便调试 Auto 功能

    // 🔴 优化：减少延迟时间，让截屏封禁响应更快
    const isScreenshotType = type === 'screenshot' || type === 'record';
    const initialDelay = type === 'location' ? 2000 : (isScreenshotType ? 500 : 0); // 截屏从3000ms改为500ms
    
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

  onShow() {
    // 🔴 每次页面显示时，再次确保隐藏返回按钮和分享功能
    if (wx.hideHomeButton) {
      wx.hideHomeButton();
    }
    if (wx.hideShareMenu) {
      wx.hideShareMenu();
    }
  },

  onHide() {
    // 🔴 关键修复：页面隐藏/切页时也停止定时轮询，避免 setInterval 在页面销毁边缘继续执行
    this._isPageDestroyed = true;
    this.stopAutoCheck();
  },

  // 🔴 3. 禁用下拉刷新，防止用户试图操作
  onPullDownRefresh() {
    wx.stopPullDownRefresh();
  },

  onUnload() {
    this._isPageDestroyed = true;
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
        if (this._isPageDestroyed) return;
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
    if (this._isPageDestroyed) return;
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
          // 🔴 使用自定义弹窗替代微信官方弹窗
          this._closeAllPopups();
          this.setData({ 
            showCustomSuccessModal: true,
            successModalTitle: '已解封',
            successModalContent: ''
          });
          setTimeout(() => {
            this.setData({ customSuccessModalClosing: true });
            setTimeout(() => {
              this.setData({ 
                showCustomSuccessModal: false,
                customSuccessModalClosing: false
              });
              wx.reLaunch({ url: '/pages/index/index' });
            }, 420);
          }, 1500);
        } else {
          // 其他情况：设置永久授权和昵称，直接放行
          console.log('[blocked] 非地址拦截解封，设置永久授权，nickname:', nickname);
        wx.setStorageSync('has_permanent_auth', true);
        if (nickname) {
          wx.setStorageSync('user_nickname', nickname);
        }
        
        // 🔴 使用自定义弹窗替代微信官方弹窗
          console.log('[blocked] 显示"验证通过"弹窗');
        this._closeAllPopups();
        this.setData({ 
          showCustomSuccessModal: true,
          successModalTitle: '验证通过',
          successModalContent: '',
          customSuccessModalClosing: false
        });

        setTimeout(() => {
            console.log('[blocked] 弹窗即将关闭，准备跳转到首页');
          this.setData({ customSuccessModalClosing: true });
        setTimeout(() => {
          this.setData({ showCustomSuccessModal: false });
          // 直接跳回首页，用户已通过验证，不需要重新输入昵称
          wx.reLaunch({ url: '/pages/index/index' });
          }, 400); // 关闭动画时间
        }, 2000); // 显示2秒
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
          
          // 🔴 使用自定义弹窗替代微信官方弹窗
            this._closeAllPopups();
            this.setData({ 
            showCustomSuccessModal: true,
            successModalTitle: '已解封',
            successModalContent: ''
          });
          setTimeout(() => {
            this.setData({ showCustomSuccessModal: false });
            wx.reLaunch({ url: '/pages/products/products' });
          }, 1500);
        } else {
          // 其他情况：需要重新验证昵称
          // 🔴 使用自定义弹窗替代微信官方弹窗
            this._closeAllPopups();
            this.setData({ 
            showCustomSuccessModal: true,
            successModalTitle: '请重新验证',
            successModalContent: ''
          });

          // 清除所有封禁标记和授权状态
        wx.removeStorageSync('is_user_banned');
          wx.removeStorageSync('is_screenshot_banned');
        wx.removeStorageSync('has_permanent_auth'); 
        
        setTimeout(() => {
            this.setData({ showCustomSuccessModal: false });
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
    // 🔴 复制前先关闭所有可能的弹窗和自动检测
    try {
      wx.hideToast();
      wx.hideLoading();
    } catch (e) {}
    
    // 🔴 关键修复：暂时关闭自动检测，避免"验证通过"弹窗和"复制成功"弹窗冲突
    this.stopAutoCheck();
    
    // 🔴 清除可能正在显示的验证通过弹窗
    if (this.data.showCustomSuccessModal) {
      this.setData({ 
        showCustomSuccessModal: false,
        customSuccessModalClosing: false
      });
    }
    
    wx.setClipboardData({ 
      data: 'MT-mogaishe',
      success: () => {
        // 🔴 立即疯狂隐藏微信官方弹窗（多次尝试，不同时机）
        const hideOfficialToast = () => {
          try {
        wx.hideToast();
            wx.hideLoading();
          } catch (e) {}
        };
        
        // 立即执行多次
        hideOfficialToast();
        setTimeout(hideOfficialToast, 10);
        setTimeout(hideOfficialToast, 30);
        setTimeout(hideOfficialToast, 50);
        setTimeout(hideOfficialToast, 80);
        setTimeout(hideOfficialToast, 120);
        setTimeout(hideOfficialToast, 180);
        setTimeout(hideOfficialToast, 250);
        setTimeout(hideOfficialToast, 350);
        setTimeout(hideOfficialToast, 500);
        
        // 🔴 延迟显示自定义"内容已复制"弹窗（等待微信官方弹窗消失）
        setTimeout(() => {
          // 显示自定义"内容已复制"弹窗（互斥）
          this._showCopySuccessOnce();
          
          // 🔴 复制弹窗完全关闭后，恢复自动检测
          setTimeout(() => {
            if (!this._isPageDestroyed) {
              this.startAutoCheck();
            }
          }, 1500);
        }, 800); // 等待 800ms，确保微信官方弹窗已消失
      }
    });
  }
});
