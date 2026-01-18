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
  onLaunch: function () {
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
      // 注意：先检查PC端，如果是PC端则不继续执行其他检查
      const isPC = this.checkPCEnvironment();
      if (isPC) {
        // PC端直接返回，不执行后续检查
        return;
      }
      this.checkBanStatusOnLaunch();
    }
  },

  // 🔴 检测PC端环境，禁止在电脑上打开
  checkPCEnvironment() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const platform = systemInfo.platform || '';
      
      // PC端平台：windows、mac（微信PC版）
      const isPC = platform === 'windows' || platform === 'mac';
      
      if (isPC) {
        console.warn('[app] ⚠️ 检测到PC端环境，禁止使用');
        
        // 延迟显示提示，确保页面加载完成
        setTimeout(() => {
          wx.showModal({
            title: '不支持PC端',
            content: '本小程序仅支持在手机上使用，请在微信手机端打开。',
            showCancel: false,
            confirmText: '知道了',
            success: (res) => {
              if (res.confirm) {
                // 跳转到禁止页面，显示PC端提示
                wx.reLaunch({
                  url: '/pages/blocked/blocked?type=pc'
                });
              }
            }
          });
        }, 500);
        
        return true; // 返回true表示检测到PC端
      }
      
      return false; // 返回false表示非PC端
    } catch (err) {
      console.error('[app] 检测PC环境失败:', err);
      return false; // 检测失败时允许继续
    }
  },

  // 🔴 应用启动时检查封禁状态
  async checkBanStatusOnLaunch() {
    try {
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
