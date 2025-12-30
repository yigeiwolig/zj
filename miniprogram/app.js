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

  // ======================== 生命周期 ========================
  onLaunch: function () {
    // ======================== 方案A：全局拦截微信官方弹窗 ========================
    // 将 wx.showModal / wx.showToast / wx.showLoading / wx.hideLoading 统一替换为自定义白底黑字 UI
    // 不改业务逻辑，只改 UI 展现
    try {
      // 1) showModal
      if (!wx.__mt_oldShowModal) wx.__mt_oldShowModal = wx.showModal;
      wx.showModal = (opt = {}) => {
        // 如果使用了 editable 等高级特性，直接调用官方原方法
        if (opt && opt.editable) {
          return wx.__mt_oldShowModal ? wx.__mt_oldShowModal(opt) : undefined;
        }
        this.showDialog({
          title: opt.title || '提示',
          content: opt.content || '',
          showCancel: opt.showCancel !== false && !!opt.showCancel,
          confirmText: opt.confirmText || '确定',
          cancelText: opt.cancelText || '取消',
          maskClosable: opt.showCancel === false ? false : true,
          onConfirm: () => opt.success && opt.success({ confirm: true, cancel: false }),
          onCancel: () => opt.success && opt.success({ confirm: false, cancel: true })
        });
      };

      // 2) showToast
      if (!wx.__mt_oldShowToast) wx.__mt_oldShowToast = wx.showToast;
      wx.showToast = (opt = {}) => {
        const msg = (typeof opt === 'string') ? opt : (opt.title || '');
        const duration = (opt && opt.duration) ? opt.duration : 1500;
        // 用全局 dialog 的轻提示也可以，但这里复用 dialog 可能太频繁；
        // 直接用 dialog 作为白底提示：无取消按钮，自动关闭
        this.showDialog({ title: '提示', content: msg, showCancel: false, confirmText: '知道了' });
        if (this.globalData._toastTimer) clearTimeout(this.globalData._toastTimer);
        this.globalData._toastTimer = setTimeout(() => {
          this.hideDialog();
        }, duration);
      };

      // 3) showLoading/hideLoading
      if (!wx.__mt_oldShowLoading) wx.__mt_oldShowLoading = wx.showLoading;
      if (!wx.__mt_oldHideLoading) wx.__mt_oldHideLoading = wx.hideLoading;
      wx.showLoading = (opt = {}) => {
        const title = (typeof opt === 'string') ? opt : (opt.title || '加载中...');
        this.showLoading(title);
      };
      wx.hideLoading = () => {
        this.hideLoading();
      };
    } catch (e) {
      // ignore
    }

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-4gn1heip7c38ec6c',
        traceUser: true,
      });
      console.log('✅ 云开发已在 app.js 初始化，环境ID: cloudbase-4gn1heip7c38ec6c');
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
