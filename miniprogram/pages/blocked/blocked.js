// miniprogram/pages/blocked/blocked.js
Page({
  data: {
    checkTimer: null,
    type: '' // 封禁类型：'banned' 或其他
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
    // 🔴 修改：允许截图封禁也调用云函数，以便响应管理员在后台的解封操作
    // 管理员可以在后台将 login_logs 中的 isBanned 改为 false 来解封
    
    // 🔴 关键修复：如果是截图封禁，先直接检查云端状态，不依赖云函数返回
    const isScreenshotBanned = wx.getStorageSync('is_screenshot_banned');
    if (isScreenshotBanned && this.data.type === 'screenshot') {
      // 直接查询 login_logs，确认云端状态
      wx.cloud.callFunction({ name: 'login' }).then(loginRes => {
        const openid = loginRes.result.openid;
        const db = wx.cloud.database();
        
        db.collection('login_logs')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get()
          .then(res => {
            if (res.data.length > 0 && res.data[0].isBanned === true) {
              // 云端确认仍然是封禁状态，继续等待
              console.log('🔒 [截图封禁] 云端确认仍为封禁状态，继续等待管理员解封');
              return;
            } else if (res.data.length > 0 && res.data[0].isBanned === false) {
              // 管理员已在后台解封，清除标记并放行
              console.log('✅ [截图封禁] 管理员已解封，清除封禁标记');
              this.stopAutoCheck();
              wx.removeStorageSync('is_user_banned');
              wx.removeStorageSync('is_screenshot_banned');
              wx.showToast({ title: '已解封', icon: 'success' });
              setTimeout(() => {
                wx.reLaunch({ url: '/pages/index/index' });
              }, 1500);
            }
          })
          .catch(err => {
            console.error('❌ [截图封禁] 查询 login_logs 失败:', err);
          });
      });
      return; // 截图封禁不调用云函数，直接返回
    }
    
    wx.cloud.callFunction({
      name: 'checkUnlockStatus' // 调用刚才新建的云函数
    }).then(res => {
      const result = res.result || {};
      const action = result.action;

      console.log('📡 云端指令:', action);

      // --- 指令 A: PASS (自动录入，直接放行) ---
      if (action === 'PASS') {
        // 🔴 关键修复：即使是 PASS，也要检查是否是截图封禁
        const isScreenshotBanned = wx.getStorageSync('is_screenshot_banned');
        if (isScreenshotBanned && this.data.type === 'screenshot') {
          console.log('🔒 [截图封禁] 检测到截图封禁，不允许通过 PASS 自动解封');
          return;
        }
        
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
        // 🔴 关键修复：如果是截图封禁，不允许通过 RETRY 自动解封
        // 截图封禁必须由管理员在后台明确解封（将 isBanned 改为 false）
        const isScreenshotBanned = wx.getStorageSync('is_screenshot_banned');
        if (isScreenshotBanned && this.data.type === 'screenshot') {
          console.log('🔒 [截图封禁] 检测到截图封禁，不允许通过 RETRY 自动解封，继续等待管理员解封');
          // 继续等待，不执行解封逻辑
          return;
        }
        
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
