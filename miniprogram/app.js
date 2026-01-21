// app.js
App({
  globalData: {
    blockedLocation: null, // 被拦截的位置信息

    // 全局 UI 弹窗状态（由 app.wxml 渲染）
    ui: {
      loading: { show: false, text: '加载中...' },
      dialog: { show: false, title: '提示', content: '', showCancel: false, confirmText: '确定', cancelText: '取消', maskClosable: true },
      sheet: { show: false, title: '', items: [] },
      input: { show: false, title: '请输入', placeholder: '', value: '', maskClosable: true }
    },

    // Toast 专用计时器
    _toastTimer: null,

    // 回调暂存
    _uiCb: {
      dialogConfirm: null,
      dialogCancel: null,
      sheetSelect: null,
      inputConfirm: null,
      inputCancel: null
    },

    // 🔴 防止重复跳转到 blocked 页面的标志
    _isJumpingToBlocked: false,

    // 🔴 分享码相关
    isShareCodeUser: false, // 是否是通过分享码进入的用户
    shareCodeInfo: null,     // 分享码信息 { code, usedViews, totalViews, expiresAt }
    
    // 🔴 更新页面访问统计的辅助函数
    updatePageVisit: function(pageRoute) {
      // 异步调用，不阻塞页面加载
      wx.cloud.callFunction({
        name: 'updatePageVisit',
        data: { pageRoute: pageRoute },
        success: (res) => {
          console.log('[app] 页面访问统计更新成功:', pageRoute, res);
        },
        fail: (err) => {
          console.error('[app] 页面访问统计更新失败:', pageRoute, err);
        }
      });
    }
  },

  // ======================== 全局 UI API（替代 wx.showToast/showModal/showLoading/showActionSheet） ========================
  // 统一 Loading：既支持字符串，也支持对象({ title:'...', mask:true })
  showLoading(option = '加载中...') {
    const text = typeof option === 'string' ? option : (option.title || '加载中...');
    this.globalData.ui.loading = { show: true, text };
    this._emitUI();
  },
  hideLoading() {
    this.globalData.ui.loading = { show: false, text: this.globalData.ui.loading.text };
    this._emitUI();
  },

  showDialog({
    title = '提示',
    content = '',
    showCancel = false,
    confirmText = '确定',
    cancelText = '取消',
    maskClosable = true,
    onConfirm = null,
    onCancel = null
  } = {}) {
    this.globalData.ui.dialog = { show: true, title, content, showCancel, confirmText, cancelText, maskClosable };
    this.globalData._uiCb.dialogConfirm = typeof onConfirm === 'function' ? onConfirm : null;
    this.globalData._uiCb.dialogCancel = typeof onCancel === 'function' ? onCancel : null;
    this._emitUI();
  },
  hideDialog() {
    this.globalData.ui.dialog = { ...this.globalData.ui.dialog, show: false };
    this.globalData._uiCb.dialogConfirm = null;
    this.globalData._uiCb.dialogCancel = null;
    this._emitUI();
  },

  showSheet({ title = '', items = [], onSelect = null } = {}) {
    this.globalData.ui.sheet = { show: true, title, items };
    this.globalData._uiCb.sheetSelect = typeof onSelect === 'function' ? onSelect : null;
    this._emitUI();
  },
  hideSheet() {
    this.globalData.ui.sheet = { ...this.globalData.ui.sheet, show: false };
    this.globalData._uiCb.sheetSelect = null;
    this._emitUI();
  },

  showInput({ title = '请输入', placeholder = '', value = '', maskClosable = true, onConfirm = null, onCancel = null } = {}) {
    this.globalData.ui.input = { show: true, title, placeholder, value, maskClosable };
    this.globalData._uiCb.inputConfirm = typeof onConfirm === 'function' ? onConfirm : null;
    this.globalData._uiCb.inputCancel = typeof onCancel === 'function' ? onCancel : null;
    this._emitUI();
  },
  hideInput() {
    this.globalData.ui.input = { ...this.globalData.ui.input, show: false };
    this.globalData._uiCb.inputConfirm = null;
    this.globalData._uiCb.inputCancel = null;
    this._emitUI();
  },

  // 事件派发：通知当前页面刷新 ui
  _emitUI() {
    // 用 getCurrentPages() 通知所有已挂载页面刷新 ui（避免进入新页面时 ui 未同步导致 loading 不显示）
    try {
      const pages = getCurrentPages();
      if (pages && pages.length) {
        pages.forEach(p => {
          if (p && typeof p.setData === 'function') {
            try { p.setData({ ui: this.globalData.ui }); } catch (e) {}
          }
        });
      }
    } catch (e) {
      // ignore
    }
  },

  // 内部辅助：获取当前页面上的自定义弹窗组件
  _getCustomToast() {
    try {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        return curPage.selectComponent('#custom-toast');
      }
    } catch (e) {
      console.error('[app] 获取custom-toast组件失败', e);
    }
    return null;
  },

  // ======================== 生命周期 ========================
  onLaunch: function (options) {
    // 🔴 1. 启动时立即检查PC端
    this.checkIsPC();

    // 🔴 2. 检测分享码参数
    if (options && options.query && options.query.shareCode) {
      const shareCode = options.query.shareCode
      console.log('[app] 检测到分享码参数:', shareCode)
      this.verifyShareCode(shareCode)
    }

    // ======================== 方案A：全局拦截微信官方弹窗 ========================
    // 将 wx.showModal / wx.showToast / wx.showLoading / wx.hideLoading 统一替换为自定义白底黑字 UI
    try {
      // 保存原生 API (防止重复保存)
      if (!wx.__mt_oldShowModal) wx.__mt_oldShowModal = wx.showModal;
      if (!wx.__mt_oldShowToast) wx.__mt_oldShowToast = wx.showToast;
      if (!wx.__mt_oldHideToast) wx.__mt_oldHideToast = wx.hideToast;
      if (!wx.__mt_oldShowLoading) wx.__mt_oldShowLoading = wx.showLoading;
      if (!wx.__mt_oldHideLoading) wx.__mt_oldHideLoading = wx.hideLoading;
      if (!wx.__mt_oldSetClipboardData) wx.__mt_oldSetClipboardData = wx.setClipboardData;

      // 辅助函数：获取自定义弹窗组件
      const getToast = () => {
        try {
          const pages = getCurrentPages();
          const curPage = pages[pages.length - 1];
          if (curPage) {
            return curPage.selectComponent('#custom-toast');
          }
        } catch (e) {
          console.error('[app] 获取custom-toast组件失败', e);
        }
        return null;
      };

      // 1) showModal
      wx.showModal = (opt = {}) => {
        // 如果使用了 editable 等高级特性，直接调用官方原方法（组件暂不支持）
        if (opt && opt.editable) {
          return wx.__mt_oldShowModal ? wx.__mt_oldShowModal(opt) : undefined;
        }
        
        const toast = getToast();
        if (toast) {
          toast.showModal(opt);
        } else {
          // 降级回退到原生
          console.warn('[app] 当前页面未找到 #custom-toast 组件，降级使用原生 showModal');
          return wx.__mt_oldShowModal(opt);
        }
      };

      // 2) showToast
      wx.showToast = (opt = {}) => {
        // 处理字符串参数（兼容 wx.showToast('提示') 这种调用方式）
        if (typeof opt === 'string') {
          opt = { title: opt };
        }
        
        const toast = getToast();
        if (toast) {
          console.log('[app] 使用自定义弹窗显示 Toast:', opt);
          toast.showToast(opt);
        } else {
          console.warn('[app] 当前页面未找到 #custom-toast 组件，降级使用原生 showToast', opt);
          return wx.__mt_oldShowToast(opt);
        }
      };
      wx.hideToast = () => {
        const toast = getToast();
        if (toast) toast.hideToast();
        else wx.__mt_oldHideToast();
      };

      // 3) showLoading/hideLoading
      wx.showLoading = (opt = {}) => {
        const toast = getToast();
        if (toast) {
          toast.showLoading(opt);
        } else {
          console.warn('[app] 当前页面未找到 #custom-toast 组件，降级使用原生 showLoading');
          return wx.__mt_oldShowLoading(opt);
        }
      };
      wx.hideLoading = () => {
        const toast = getToast();
        if (toast) toast.hideLoading();
        else wx.__mt_oldHideLoading();
      };

      // 4) setClipboardData - 拦截复制API，自动隐藏原生提示并显示自定义提示
      wx.setClipboardData = (opt = {}) => {
        const originalSuccess = opt.success;
        const originalFail = opt.fail;
        
        // 🔴 策略：在复制前就显示自定义提示，抢占显示时机
        const toast = getToast();
        if (toast) {
          // 立即显示自定义提示（抢占显示时机）
          toast.showToast({ title: '内容已复制', icon: 'success', duration: 2000 });
        }
        
        // 包装 success 回调
        opt.success = (res) => {
          // 尝试隐藏原生提示（虽然可能无法完全隐藏，但尽力尝试）
          try {
            wx.hideToast();
            // 多次尝试隐藏
            for (let i = 1; i <= 5; i++) {
              setTimeout(() => {
                try { wx.hideToast(); } catch (e) {}
              }, i * 30);
            }
          } catch (e) {}
          
          // 如果自定义提示还没显示，现在显示
          if (!toast) {
            setTimeout(() => {
              const t = getToast();
              if (t) {
                t.showToast({ title: '内容已复制', icon: 'success', duration: 1500 });
              }
            }, 100);
          }
          
          // 执行原始 success 回调
          if (originalSuccess) originalSuccess(res);
        };
        
        // 调用原生 API
        return wx.__mt_oldSetClipboardData(opt);
      };
    } catch (e) {
      console.error('[app] 替换API失败:', e);
    }

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-4gn1heip7c38ec6c',
        traceUser: true,
      });
      console.log('✅ 云开发已在 app.js 初始化，环境ID: cloudbase-4gn1heip7c38ec6c');
      
      // 🔴 应用启动时检查封禁状态（确保重启后也能拦截）
      // PC端检测已在onLaunch最开始执行，这里不再重复检查
      // 开发环境下跳过封禁检查，避免误判和自动解封
      try {
        const deviceInfo = wx.getDeviceInfo();
        const isDevTools = deviceInfo.platform === 'devtools';
        if (!isDevTools) {
          this.checkBanStatusOnLaunch();
        } else {
          console.log('[app] 开发工具环境，跳过封禁状态检查');
        }
      } catch (e) {
        console.warn('[app] 无法判断环境，跳过封禁检查', e);
      }
    }
  },

  onShow: function () {
    // 🔴 2. 每次从后台切回前台，或者从别的页面切回来时，再次检查
    // 防止用户通过"浮窗"、"分享卡片"等方式绕过
    this.checkIsPC();
  },

  // --- 🔴 核心检测函数 ---
  checkIsPC() {
    try {
      const deviceInfo = wx.getDeviceInfo();
      const platform = deviceInfo.platform.toLowerCase();

      // 🔴 开发工具环境下跳过检测，允许开发调试
      if (platform === 'devtools') {
        console.log('[app] 开发工具环境，跳过PC端检测');
        return;
      }

      // 定义要封禁的平台
      // windows: PC微信
      // mac: Mac微信
      const bannedPlatforms = ['windows', 'mac']; 

      if (bannedPlatforms.includes(platform)) {
        console.warn('[app] 检测到非法设备访问:', platform);
        
        // 获取当前页面栈，避免在 blocked 页面重复跳转导致死循环
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && currentPage.route && currentPage.route.includes('pages/blocked/blocked')) {
          console.log('[app] 已在封禁页面，跳过重复跳转');
          return; 
        }

        // 强制重启动到封禁页 (使用 reLaunch 清空所有页面栈，让用户无法返回)
        wx.reLaunch({
          url: '/pages/blocked/blocked?type=pc',
          fail: (err) => {
            // 如果跳转失败，延迟重试
            console.error('[app] PC端跳转失败，延迟重试:', err);
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/blocked/blocked?type=pc'
              });
            }, 300);
          }
        });
        
        // 再次隐藏 home 按钮（虽然 reLaunch 已经清空了栈，加一层保险）
        if (wx.hideHomeButton) {
          wx.hideHomeButton();
        }
      }
    } catch (e) {
      // 如果获取失败，为了安全起见，可以选择放行或阻断
      // 这里选择放行，避免误判导致正常用户无法使用
      console.error('[app] 设备检测失败', e);
    }
  },

  // 🔴 应用启动时检查封禁状态
  async checkBanStatusOnLaunch() {
    try {
      // 🔴 开发环境下跳过封禁检查，避免误判
      const deviceInfo = wx.getDeviceInfo();
      const isDevTools = deviceInfo.platform === 'devtools';
      if (isDevTools) {
        console.log('[app] 开发工具环境，跳过封禁检查');
        return;
      }

      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();
      
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        
        // 🔴 最高优先级：检查强制封禁按钮 qiangli
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        if (qiangli) {
          console.log('[app] ⚠️ 检测到强制封禁按钮 qiangli 已开启，无视一切放行，直接封禁');
          // 延迟一下，确保页面加载完成
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }, 500);
          return; // 强制封禁，直接返回，不执行后续任何检查
        }
      }
      
      // 🔴 关键修复：先检查是否是管理员，管理员豁免封禁检查（但qiangli优先级更高）
      const adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        console.log('[app] ✅ 检测到管理员身份，豁免封禁检查');
        return; // 管理员直接返回，不检查封禁状态
      }
      
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const rawFlag = btn.isBanned;
        const isBanned = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
        
        if (isBanned) {
          console.log('[app] 应用启动时检测到封禁状态，跳转到封禁页');
          const banType = btn.banReason === 'screenshot' || btn.banReason === 'screen_record' 
            ? 'screenshot' 
            : (btn.banReason === 'location_blocked' ? 'location' : 'banned');
          
          // 延迟一下，确保页面加载完成
          setTimeout(() => {
            wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
          }, 500);
          return;
        }
      }
    } catch (err) {
      console.error('[app] 启动时检查封禁状态失败:', err);
    }
  },

  // 🔴 全局定时检查 qiangli 强制封禁（所有页面都会调用）
  _qiangliCheckTimer: null, // 定时器ID

  // 🔴 启动定时检查 qiangli 强制封禁
  startQiangliCheck() {
    // 清除旧的定时器
    if (this._qiangliCheckTimer) {
      clearInterval(this._qiangliCheckTimer);
      this._qiangliCheckTimer = null;
    }

    // 立即检查一次
    this.checkQiangliStatus();

    // 每2秒检查一次
    this._qiangliCheckTimer = setInterval(() => {
      this.checkQiangliStatus();
    }, 2000);
  },

  // 🔴 停止定时检查
  stopQiangliCheck() {
    if (this._qiangliCheckTimer) {
      clearInterval(this._qiangliCheckTimer);
      this._qiangliCheckTimer = null;
    }
  },

  // 🔴 检查 qiangli 强制封禁状态
  async checkQiangliStatus() {
    try {
      // 🔴 开发环境下跳过封禁检查，避免误判
      const deviceInfo = wx.getDeviceInfo();
      const isDevTools = deviceInfo.platform === 'devtools';
      if (isDevTools) {
        return; // 开发工具环境，直接返回
      }

      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();

      // 🔴 先检查是否是管理员，管理员豁免检查
      const adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        return; // 管理员直接返回，不检查封禁状态
      }

      // 🔴 检查 qiangli 强制封禁
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        
        if (qiangli) {
          console.log('[app] 🚫 定时检查：检测到 qiangli 强制封禁，立即跳转');
          // 停止定时检查
          this.stopQiangliCheck();
          // 立即跳转，不延迟
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }
    } catch (err) {
      console.error('[app] 定时检查 qiangli 状态失败:', err);
    }
  },

  // 🔴 验证分享码
  async verifyShareCode(shareCode) {
    try {
      const db = wx.cloud.database()
      
      // 查询分享码
      const codeRes = await db.collection('chakan')
        .where({ code: shareCode })
        .get()

      if (!codeRes.data || codeRes.data.length === 0) {
        console.log('[app] 分享码不存在:', shareCode)
        wx.showToast({
          title: '分享码无效',
          icon: 'none',
          duration: 2000
        })
        return false
      }

      const codeInfo = codeRes.data[0]

      // 检查是否过期
      const now = new Date()
      const expiresAt = new Date(codeInfo.expiresAt)
      if (now > expiresAt) {
        console.log('[app] 分享码已过期')
        wx.showToast({
          title: '分享码已过期',
          icon: 'none',
          duration: 2000
        })
        return false
      }

      // 检查查看次数
      if (codeInfo.usedViews >= codeInfo.totalViews) {
        console.log('[app] 分享码查看次数已用完')
        wx.showToast({
          title: '分享码查看次数已用完',
          icon: 'none',
          duration: 2000
        })
        return false
      }

      // 检查状态
      if (codeInfo.status !== 'active') {
        console.log('[app] 分享码已失效')
        wx.showToast({
          title: '分享码已失效',
          icon: 'none',
          duration: 2000
        })
        return false
      }

      // 验证通过，设置全局标识
      this.globalData.isShareCodeUser = true
      this.globalData.shareCodeInfo = {
        code: shareCode,
        usedViews: codeInfo.usedViews,
        totalViews: codeInfo.totalViews,
        expiresAt: codeInfo.expiresAt,
        _id: codeInfo._id
      }

      console.log('[app] ✅ 分享码验证通过:', this.globalData.shareCodeInfo)
      // 位置权限改由首页在用户点击后统一请求，这里只负责验证和标记状态
      return true
    } catch (err) {
      console.error('[app] 验证分享码失败:', err)
      wx.showToast({
        title: '验证分享码失败',
        icon: 'none',
        duration: 2000
      })
      return false
    }
  },

  // 🔴 更新分享码查看次数
  async updateShareCodeViews() {
    if (!this.globalData.isShareCodeUser || !this.globalData.shareCodeInfo) {
      return
    }

    try {
      const db = wx.cloud.database()
      const codeInfo = this.globalData.shareCodeInfo
      const newUsedViews = codeInfo.usedViews + 1

      // 更新数据库
      await db.collection('chakan').doc(codeInfo._id).update({
        data: {
          usedViews: newUsedViews
        }
      })

      // 更新全局数据
      this.globalData.shareCodeInfo.usedViews = newUsedViews

      // 显示剩余次数提示（使用带确认键的弹窗）
      const remaining = codeInfo.totalViews - newUsedViews
      if (remaining > 0) {
        wx.showModal({
          title: '提示',
          content: `剩余查看次数：${remaining}/3`,
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showModal({
          title: '提示',
          content: '查看次数已用完',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    } catch (err) {
      console.error('[app] 更新分享码查看次数失败:', err)
      }
    },

  // 🔴 记录分享码用户在 azjc 页面的停留和行为统计
  async recordShareCodeSession(sessionStats) {
    if (!this.globalData.isShareCodeUser || !this.globalData.shareCodeInfo) {
      return
    }

    try {
      const db = wx.cloud.database()
      const _ = db.command

      // 获取当前用户 openid（用于 viewers 记录）
      let openid = ''
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' })
        openid = loginRes.result.openid || ''
      } catch (e) {}

      const baseInfo = this.globalData.shareCodeInfo
      const durationMs = sessionStats && typeof sessionStats.durationMs === 'number'
        ? sessionStats.durationMs
        : 0
      const sectionClicks = sessionStats && sessionStats.sectionClicks ? sessionStats.sectionClicks : {}
      const sectionDurations = sessionStats && sessionStats.sectionDurations ? sessionStats.sectionDurations : {}

      await db.collection('chakan').doc(baseInfo._id).update({
        data: {
          viewers: _.push({
            openid,
            viewTime: db.serverDate(),
            durationMs,
            sectionClicks,       // { 'product-1': 3, 'type-2': 1, 'video-0': 5, ... }
            sectionDurations     // { 'video-0': 12000, 'graphic-1': 5000, ... }
          })
        }
      })
    } catch (err) {
      console.error('[app] 记录分享码会话失败:', err)
    }
  },

  // 获取模拟定位坐标
  getMockLocation: function(city) {
    const mockLocations = {
      'shenzhen': {
        latitude: 22.5431,
        longitude: 114.0579
      },
      'hangzhou': {
        latitude: 30.2741,
        longitude: 120.1551
      }
    };
    return mockLocations[city] || mockLocations['shenzhen'];
  },

  getLocationAndCheck: function() {
    const that = this;

    if (this.globalData.mockLocation) {
      const mockLoc = this.getMockLocation(this.globalData.mockLocation);
      console.log('=== 使用模拟定位 ===');
      console.log('模拟定位城市:', this.globalData.mockLocation);
      console.log('模拟定位坐标:', mockLoc);
      this.callCloudCheck(mockLoc.latitude, mockLoc.longitude);
      return;
    }

    console.log('=== 获取真实定位 ===');

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success(res) {
        const latitude = res.latitude;
        const longitude = res.longitude;
        console.log('前端获取定位成功:', latitude, longitude);
        that.callCloudCheck(latitude, longitude);
      },
      fail(err) {
        console.error('获取定位失败或用户拒绝:', err);
      }
    });
  },

  // 获取用户昵称（静默方式，不弹授权弹窗）
  getUserNickName: function() {
    return new Promise((resolve) => {
      const cachedUserInfo = wx.getStorageSync('userInfo');
      if (cachedUserInfo && cachedUserInfo.nickName) {
        resolve(cachedUserInfo.nickName);
        return;
      }

      try {
        wx.getUserInfo({
          success: (res) => {
            const nickName = res.userInfo?.nickName || '未获取到昵称';
            if (nickName !== '未获取到昵称') {
              wx.setStorageSync('userInfo', res.userInfo);
            }
            resolve(nickName);
          },
          fail: () => resolve('未获取到昵称')
        });
      } catch (err) {
        resolve('未获取到昵称');
      }
    });
  },

  requestUserNickName: function() {
    return new Promise((resolve) => {
      const cachedUserInfo = wx.getStorageSync('userInfo');
      if (cachedUserInfo && cachedUserInfo.nickName) {
        resolve(cachedUserInfo.nickName);
        return;
      }

      wx.getUserProfile({
        desc: '用于记录访问信息',
        success: (res) => {
          const nickName = res.userInfo?.nickName || '未获取到昵称';
          wx.setStorageSync('userInfo', res.userInfo);
          resolve(nickName);
        },
        fail: () => resolve('未获取到昵称')
      });
    });
  },

  callCloudCheck: async function(lat, lng) {
    if (this._isCallingCloudCheck) return;
    this._isCallingCloudCheck = true;

    let nickName = '未获取到昵称';
    try {
      nickName = await this.getUserNickName();
    } catch (err) {}

    const deviceInfo = wx.getDeviceInfo();

    wx.cloud.callFunction({
      name: 'accessControl',
      data: {
        latitude: lat,
        longitude: lng,
        nickName: nickName,
        deviceInfo: deviceInfo.model
      },
      success: res => {
        this._isCallingCloudCheck = false;
        if (res.result && res.result.isBlocked === true) {
          this.globalData.blockedLocation = {
            city: res.result.city || '未知城市',
            province: res.result.province || '浙江省',
            location: res.result.location || '浙江省',
            latitude: res.result.latitude,
            longitude: res.result.longitude
          };
          wx.reLaunch({ url: '/pages/blocked/blocked' });
        }
      },
      fail: err => {
        this._isCallingCloudCheck = false;
        console.error('云函数调用失败:', err);
      }
    });
  },

  checkAccess: function() {
    this.getLocationAndCheck();
  }
})
