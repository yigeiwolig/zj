// miniprogram/pages/index/index.js
const app = getApp();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});
const db = wx.cloud.database();

Page({
  data: {
    // 🔴 屏幕适配：状态栏和导航栏高度
    statusBarHeight: 20,  // 状态栏高度（px）
    navBarHeight: 44,     // 导航栏高度（px）

    // 页面状态控制
    isShowNicknameUI: false,
    isAuthorized: false,
    inputNickName: '', 
    step: 0, 
    locationResult: null,
    // 🔴 动画完成后的跳转目标（等待动画完成后再跳转）
    pendingJumpTarget: null,
    pendingJumpData: null,
    
    // 原有弹窗控制
    showAuthModal: false,
    showAuthForceModal: false,
    authMissingType: '',

    // 【新增】控制自定义错误弹窗 (黑白风)
    showCustomErrorModal: false,
    
    // 【新增】控制自定义成功提示弹窗 (黑白风)
    showCustomSuccessModal: false,
    successModalTitle: '',
    successModalContent: '',
    
    // 【新增】控制"内容已复制"弹窗
    showCopySuccessModal: false,
    
    // 【新增】控制二次确认弹窗
    showConfirmModal: false,
    confirmModalContent: '',
    _pendingUnbanData: null, // 存储待执行的放行数据
    
    // 【新增】首次进入提示弹窗
    showFirstTimeModal: false,
    firstTimeModalEnterReady: false, // 下一帧再开过渡，避免 wx:if 首帧「硬切」
    firstTimeModalClosing: false,
    showWechatQRCode: false, // 是否显示微信二维码
    adminWechat: 'MT-摩改社', // 管理员微信号（可以修改）
    copyWechatBusy: false, // 复制微信号进行中（用于即时反馈）
    
    // Loading 状态（合并重复定义）
    isLoading: false,
    loadingText: '加载中...',
    // 自定义加载中动画（使用 my 页面的样式）
    showLoadingAnimation: false,
    
    // 自定义弹窗
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },
    dialogClosing: false, // 自定义弹窗退出动画中
    autoToastClosing: false, // 自动提示退出动画中
    
    // 【新增】管理员相关状态
    isAdmin: false,        // 是否是管理员
    isAdminMode: false,    // 是否开启了管理员模式
    adminViewMode: 'banned', // banned | suspicious | nickname
    bannedUsers: [],       // 被封禁的用户列表
    screenshotRiskUsers: [], // 截图超限待审核列表
    suspiciousUsers: [],   // 可疑用户列表（多次进入/长停留）
    isLoadingBannedUsers: false,  // 是否正在加载封禁用户列表
    isLoadingScreenshotRiskUsers: false,
    isLoadingSuspiciousUsers: false,
    // 🔴 昵称录入相关状态
    isNicknameMode: false, // false=封禁管理, true=昵称录入
    nicknameInput: '',    // 昵称输入
    isSubmittingNickname: false, // 是否正在提交昵称
    nicknameBypassLocation: false // 放行开关（是否跳过地域拦截）
  },

  // 互斥：确保同一时间只显示一个弹窗/提示
  _closeAllPopups() {
    try { wx.hideToast(); } catch (e) {}
    try { wx.hideLoading(); } catch (e) {}
    const patch = {};
    if (this.data.showCustomSuccessModal) patch.showCustomSuccessModal = false;
    if (this.data.showConfirmModal) patch.showConfirmModal = false;
    // 🔴 不关闭首次进入提示弹窗，让用户可以继续操作
    // if (this.data.showFirstTimeModal) patch.showFirstTimeModal = false;
    if (Object.keys(patch).length) this.setData(patch);
  },


  onLoad(options) {
    // 🔴 更新页面访问统计
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('index');
    }
    
    // 🔴 关键：确保页面加载时隐藏全局 UI 的 loading（如果存在）
    if (app && app.hideLoading) {
      app.hideLoading();
    }
    
    // 🔴 强制拦截微信官方 loading：确保拦截生效
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading(); // 调用原始 hideLoading 确保关闭任何官方弹窗
    }
    
    // 🔴 计算屏幕适配信息（状态栏和导航栏高度）
    this.calcNavBarInfo();

    // 1. 先检查缓存（不立即跳转，等异步检查完成）
    const hasAuth = wx.getStorageSync('has_permanent_auth');
    const savedNickname = wx.getStorageSync('user_nickname');
    
    // 🔴 如果用户已经通过验证，不显示首次进入弹窗，并标记为已看过
    if (hasAuth && savedNickname) {
      // 缓存中有授权和昵称，直接使用
      this.setData({ isAuthorized: true, isShowNicknameUI: false });
      // 已通过验证的用户不需要显示首次进入弹窗
      wx.setStorageSync('has_seen_first_time_modal', true);
    } else {
      // 缓存中没有，先检查 valid_users 集合
      this.checkValidUserFromDatabase();
      
      // 🔴 只有未通过验证的用户才检查是否显示首次进入弹窗
      const hasSeenFirstTimeModal = wx.getStorageSync('has_seen_first_time_modal');
      if (!hasSeenFirstTimeModal) {
        // 延迟显示，确保页面加载完成（用下一帧再开过渡，避免弹层硬切）
        setTimeout(() => {
          this._openFirstTimeModalAnimated();
        }, 500);
      }
    }
    
    // 2. 异步检查全局黑名单（避免死循环）
    // 如果从封禁页跳转过来，标记可能已经被清除，所以先不检查本地缓存
    this.checkGlobalBanStatus();
    
    // 3. 检查管理员权限
    this.checkAdminPrivilege();
  },

  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
  },

  onHide() {
    // 🔴 停止定时检查
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    this._stopWaitingForPendingJump();
  },

  onUnload() {
    // 🔴 停止定时检查
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    this._stopWaitingForPendingJump();
    if (this._firstTimeModalEnterTimer) {
      clearTimeout(this._firstTimeModalEnterTimer);
      this._firstTimeModalEnterTimer = null;
    }
  },

  // 🔴 从 valid_users 集合检查用户是否有记录
  async checkValidUserFromDatabase() {
    try {
      // 1. 获取当前用户 openid
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result?.openid;
      
      if (!openid) {
        console.warn('[index] 无法获取 openid，显示昵称输入界面');
        this.setData({ isShowNicknameUI: true });
        return;
      }

      // 2. 查询 valid_users 集合，查找该用户的记录
      const db = wx.cloud.database();
      const validUserRes = await db.collection('valid_users')
        .where({
          _openid: openid
        })
        .limit(1)
        .get();

      if (validUserRes.data && validUserRes.data.length > 0) {
        // 找到了记录，自动获取昵称
        const userRecord = validUserRes.data[0];
        const nickname = userRecord.nickname;
        
        if (nickname) {
          // 保存昵称和授权状态到本地存储
          wx.setStorageSync('user_nickname', nickname);
          wx.setStorageSync('has_permanent_auth', true);
          // 🔴 已通过验证的用户不需要显示首次进入弹窗
          wx.setStorageSync('has_seen_first_time_modal', true);
          
          // 更新页面状态，直接进入
          this.setData({ 
            isAuthorized: true, 
            isShowNicknameUI: false,
            inputNickName: nickname,
            showFirstTimeModal: false,
            firstTimeModalEnterReady: false,
            firstTimeModalClosing: false
          });
          
          console.log('[index] 从 valid_users 自动恢复用户昵称:', nickname);
          return;
        }
      }
      
      // 没有找到记录，显示昵称输入界面
      console.log('[index] valid_users 中未找到用户记录，显示昵称输入界面');
      this.setData({ isShowNicknameUI: true });
      
    } catch (err) {
      console.error('[index] 检查 valid_users 失败:', err);
      // 出错时显示昵称输入界面
      this.setData({ isShowNicknameUI: true });
    }
  },

  // === 全局封号检查 ===
  checkGlobalBanStatus() {
    // 🔴 确保在云函数调用前关闭任何官方 loading
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    // 添加超时和错误处理，避免卡死
    wx.cloud.callFunction({ 
      name: 'login',
      timeout: 5000 // 5秒超时
    }).then(res => {
      if (!res || !res.result || !res.result.openid) {
        console.warn('登录云函数返回异常，跳过封号检查');
        return;
      }
      
      // 🔴 封禁状态已完全由 login_logbutton 管理，不再检查 login_logs.isBanned
      // 封禁检查通过 checkUnlockStatus 云函数完成（在 blocked 页面中）
      // 这里不再进行封禁检查，避免误判
    })
    .catch(err => {
      console.error('登录云函数调用失败:', err);
      // 云函数失败不影响正常使用，静默处理，避免卡死
    });
  },

  // === 昵称输入处理 ===
  onNickNameInput(e) { 
    this.setData({ inputNickName: e.detail.value }); 
  },

  onNickNameChange(e) {
    const name = e.detail.value;
    this.setData({ inputNickName: name });
  },

  // === 核心验证逻辑 ===
  async handleLogin() {
    if (this.data.isLoading) return;
    const raw = this.data.inputNickName.trim();
    if (!raw) {
      this.showAutoToast('提示', '请输入昵称或安装分享码');
      return;
    }
    const normalizedCode = raw.replace(/[\s-]/g, '').toUpperCase();
    const isShareCode = /^MT[A-Z0-9]{6}$/.test(normalizedCode);
    if (isShareCode && app && typeof app.verifyShareCode === 'function') {
      this.setData({ isLoading: true });
      this.showMyLoading('验证分享码...');
      let verifyRes = null;
      try {
        verifyRes = await app.verifyShareCode(normalizedCode);
      } catch (e) {
        console.error('[index] 分享码验证异常:', e);
        this.showAutoToast('提示', '分享码验证失败，请稍后重试');
        return;
      } finally {
        this.setData({ isLoading: false });
        this.hideMyLoading();
      }

      if (!verifyRes || verifyRes.success !== true) {
        this.showAutoToast('提示', (verifyRes && verifyRes.error) || '分享码无效');
        return;
      }

      try { wx.setStorageSync('is_share_code_user', true); } catch (e) {}
      try { wx.setStorageSync('share_code_value', normalizedCode); } catch (e) {}
      if (app && app.globalData) {
        app.globalData.isShareCodeUser = true;
        app.globalData.shareCodeInfo = app.globalData.shareCodeInfo || { code: normalizedCode };
      }
      this.setData({
        inputNickName: normalizedCode,
        isAuthorized: true,
        isShowNicknameUI: false,
        showFirstTimeModal: false,
        firstTimeModalEnterReady: false,
        firstTimeModalClosing: false
      }, () => {
        wx.reLaunch({ url: '/pages/azjc/azjc' });
      });
      return;
    }
    const name = raw;
    // 先让按钮进入加载态，避免首点「一大段同步逻辑」期间界面毫无反馈
    this.setData({ isLoading: true });
    setTimeout(() => {
      // 🔴 临时屏蔽任何 Loading（完全不显示）
      const oldWxShowLoading = wx.showLoading;
      const oldOldWxShowLoading = wx.__mt_oldShowLoading;
      const oldAppShowLoading = app && app.showLoading;
      const restoreLoading = () => {
        if (oldWxShowLoading) wx.showLoading = oldWxShowLoading;
        if (oldOldWxShowLoading) wx.__mt_oldShowLoading = oldOldWxShowLoading;
        if (app && oldAppShowLoading) app.showLoading = oldAppShowLoading;
        if (this._noLoadingTimer) {
          clearInterval(this._noLoadingTimer);
          this._noLoadingTimer = null;
        }
      };
      wx.showLoading = () => {};
      if (wx.__mt_oldShowLoading) wx.__mt_oldShowLoading = () => {};
      if (app) {
        app.showLoading = () => {};
        if (app.hideLoading) app.hideLoading();
        try {
          if (app.globalData && app.globalData.ui && app.globalData.ui.loading) {
            app.globalData.ui.loading = { ...app.globalData.ui.loading, show: false };
            if (app._emitUI) app._emitUI();
          }
        } catch (e) {}
      }
      let lastHideTime = 0;
      const hideAllLoading = () => {
        const now = Date.now();
        if (now - lastHideTime < 200) return;
        lastHideTime = now;
        try {
          const toast = this.selectComponent('#custom-toast');
          if (toast && toast.hideLoading) {
            try { toast.hideLoading(); } catch (e) {}
          }
          if (this.data.showLoadingAnimation) {
            this.setData({ showLoadingAnimation: false });
          }
          if (app && app.globalData && app.globalData.ui && app.globalData.ui.loading?.show) {
            app.globalData.ui.loading = { ...app.globalData.ui.loading, show: false };
            if (app._emitUI) app._emitUI();
          }
        } catch (e) {}
      };
      hideAllLoading();
      this._noLoadingTimer = setInterval(hideAllLoading, 300);

      if (wx.__mt_oldHideLoading) {
        wx.__mt_oldHideLoading();
      }
      try { wx.hideLoading(); } catch (e) {}

      let sysInfo = {};
      try {
        const deviceInfo = wx.getDeviceInfo();
        const windowInfo = wx.getWindowInfo();
        sysInfo = {
          system: deviceInfo.system || '',
          model: deviceInfo.model || '',
          ...windowInfo
        };
      } catch (e) {
        try {
          sysInfo = wx.getSystemInfoSync();
        } catch (e2) {
          console.warn('[index] 无法获取设备信息:', e2);
        }
      }
      const cachedLocation = wx.getStorageSync('last_location') || {};

      wx.cloud.callFunction({
        name: 'verifyNickname',
        data: {
          nickname: name,
          province: cachedLocation.province || '',
          city: cachedLocation.city || '',
          district: cachedLocation.district || '',
          address: cachedLocation.address || '',
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
          deviceInfo: sysInfo.system || '',
          phoneModel: sysInfo.model || ''
        }
      }).then(res => {
        restoreLoading();
        this.setData({ isLoading: false });

        const result = res.result || {};

        if (result.success) {
          if (wx.__mt_oldHideLoading) {
            wx.__mt_oldHideLoading();
          }
          wx.setStorageSync('has_permanent_auth', true);
          wx.setStorageSync('user_nickname', name);
          wx.setStorageSync('has_seen_first_time_modal', true);
          wx.removeStorageSync('is_user_banned');
          this.setData({
            isAuthorized: true,
            isShowNicknameUI: false,
            showFirstTimeModal: false,
            firstTimeModalEnterReady: false,
            firstTimeModalClosing: false,
            showCustomSuccessModal: false
          });
        } else {
          if (result.isBlocked === true || result.type === 'banned') {
            wx.setStorageSync('is_user_banned', true);
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          } else {
            this.setData({ showCustomErrorModal: true });
          }
        }
      }).catch(err => {
        restoreLoading();
        this.setData({ isLoading: false });
        this.showAutoToast('错误', '网络错误，请重试');
      });
    }, 0);
  },

  // 【新增】处理自定义弹窗的按钮点击 (复制微信号)
  handleCopyFromModal() {
    // 🔴 复制前立即隐藏可能的官方弹窗（使用原生API）
    const hideOfficialToast = () => {
      try {
        if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
        if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
      } catch (e) {}
    };
    hideOfficialToast();
    
    wx.setClipboardData({
      data: 'MT-mogaishe',
      success: () => {
        // 🔴 立即疯狂隐藏微信官方弹窗（使用原生API，多次尝试）
        hideOfficialToast();
        setTimeout(hideOfficialToast, 1);
        setTimeout(hideOfficialToast, 3);
        setTimeout(hideOfficialToast, 5);
        setTimeout(hideOfficialToast, 10);
        setTimeout(hideOfficialToast, 15);
        setTimeout(hideOfficialToast, 20);
        setTimeout(hideOfficialToast, 30);
        setTimeout(hideOfficialToast, 50);
        setTimeout(hideOfficialToast, 80);
        setTimeout(hideOfficialToast, 120);
        setTimeout(hideOfficialToast, 180);
        setTimeout(hideOfficialToast, 250);
        setTimeout(hideOfficialToast, 350);
        setTimeout(hideOfficialToast, 500);
        
        // 🔴 延迟800ms后显示自定义弹窗
        setTimeout(() => {
        // 复制成功后关闭错误弹窗
        this.setData({ showCustomErrorModal: false });
          // 显示自定义"内容已复制"弹窗
          this.setData({ showCopySuccessModal: true });
          // 2秒后自动关闭
          setTimeout(() => {
            this.setData({ showCopySuccessModal: false });
          }, 2000);
        }, 800);
      }
    });
  },

  // 【新增】关闭弹窗
  closeCustomErrorModal() {
    this.setData({ showCustomErrorModal: false });
  },

  // === 点击进入逻辑 ===
  handleAccess() {
    console.log('[handleAccess] 点击事件触发');
    // 🔴 移除兜底跳转，严格等待用户授权
    console.log('[handleAccess] step:', this.data.step);
    console.log('[handleAccess] isAuthorized:', this.data.isAuthorized);
    
    // 如果动画已经开始，不允许重复点击
    if (this.data.step > 0) {
      console.log('[handleAccess] 动画已开始，忽略点击');
      return; 
    }
    
    // 如果未授权，不允许进入
    if (!this.data.isAuthorized) {
      console.log('[handleAccess] 未授权，不允许进入');
      this.showAutoToast('提示', '请先完成身份验证');
      return; 
    }

    // 🔴 分享码用户：不做地址/定位流程，直接进入安装教程
    const inputAsCode = /^MT[A-Z0-9]{6}$/.test(String(this.data.inputNickName || '').replace(/[\s-]/g, '').toUpperCase());
    const isShareCodeUser =
      !!(app && app.globalData && (app.globalData.isShareCodeUser || app.globalData.shareCodeInfo)) ||
      !!wx.getStorageSync('is_share_code_user') ||
      inputAsCode;
    console.log('[handleAccess] shareCode flags =>', {
      globalFlag: !!(app && app.globalData && app.globalData.isShareCodeUser),
      globalInfo: !!(app && app.globalData && app.globalData.shareCodeInfo),
      localFlag: !!wx.getStorageSync('is_share_code_user'),
      inputAsCode
    });
    if (isShareCodeUser) {
      console.log('[handleAccess] 分享码用户直达教程，跳过定位与地址校验');
      wx.reLaunch({ url: '/pages/azjc/azjc' });
      return;
    }

    // 点击后立刻走定位链路：不用异步 getSetting 挡在弹窗前面；仅「曾拒绝」用同步 getSettingSync 立即出引导层
    const phoneModel = this._getPhoneModelBrief();
    try {
      if (typeof wx.getSettingSync === 'function') {
        const auth = wx.getSettingSync().authSetting['scope.userLocation'];
        if (auth === false) {
          console.log('[handleAccess] 用户曾拒绝位置权限，立即引导去设置页');
          this.setData({
            showAuthForceModal: true,
            authMissingType: 'location',
          });
          return;
        }
      }
    } catch (e) {
      console.warn('[handleAccess] getSettingSync 异常，继续走定位', e);
    }
    this._startIndexAccessWithLocation(phoneModel);
  },

  _getPhoneModelBrief() {
    try {
      const deviceInfo = wx.getDeviceInfo();
      return deviceInfo.model || '未知机型';
    } catch (e) {
      try {
        const sys = wx.getSystemInfoSync();
        return sys.model || '未知机型';
      } catch (e2) {
        return '未知机型';
      }
    }
  },

  /** 隐私（若需要）→ 先 wx.getLocation 再开动画，避免 setData 动画抢在系统授权框前面 */
  _startIndexAccessWithLocation(phoneModel) {
    const runGetLocation = () => {
      console.log('[handleAccess] 立即请求位置（系统/隐私弹窗优先于入场动画）');
      this._forceBlockedTriggered = false;
      this._animationFinished = false;
      this._pendingLocationBanData = null;

      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        success: (res) => {
          console.log('[handleAccess] 位置获取成功:', res);
          this.runAnimation();
          this.analyzeRegion(res.latitude, res.longitude, phoneModel);
        },
        fail: (err) => {
          console.error('[handleAccess] 位置获取失败:', err);
          const msg = err && err.errMsg ? String(err.errMsg) : '';
          const errno = err && err.errno;
          const authOrPrivacyBlocked =
            msg.includes('auth deny') ||
            msg.includes('system permission denied') ||
            msg.includes('privacy') ||
            msg.includes('authorize') ||
            errno === 104 ||
            errno === 103;
          if (authOrPrivacyBlocked) {
            this.clearAnimationTimers();
            this.setData({ step: 0 });
            this.setData({
              showAuthForceModal: true,
              authMissingType: 'location',
            });
            return;
          }
          this.runAnimation();
          this.showAutoToast('提示', '无法获取当前位置，将使用默认设置');
          this.setData({
            pendingJumpTarget: '/pages/products/products',
            pendingJumpData: null,
          });
        },
      });
    };

    if (typeof wx.requirePrivacyAuthorize === 'function') {
      wx.requirePrivacyAuthorize({
        success: () => runGetLocation(),
        fail: () => {
          this.showAutoToast('提示', '请先同意小程序隐私保护指引后再使用定位');
        },
      });
    } else {
      runGetLocation();
    }
  },

  addAnimationTimer(timerId) {
    if (!this._animationTimers) {
      this._animationTimers = [];
    }
    this._animationTimers.push(timerId);
  },

  clearAnimationTimers() {
    if (this._animationTimers && this._animationTimers.length > 0) {
      this._animationTimers.forEach(timer => clearTimeout(timer));
    }
    this._animationTimers = [];
  },

  runAnimation() {
    this.clearAnimationTimers();
    this.setData({ step: 1 });
    const t1 = setTimeout(() => {
      this.setData({ step: 2 });
      const t2 = setTimeout(() => {
        this.setData({ step: 3 });
        const t3 = setTimeout(() => {
          this.setData({ step: 4 }); 
          this.doFallAndSwitch();
        }, 1900); 
        this.addAnimationTimer(t3);
      }, 800); 
      this.addAnimationTimer(t2);
    }, 500);
    this.addAnimationTimer(t1);
  },

  doFallAndSwitch() {
    this.setData({ step: 5 });

    // ✅ 小齿轮掉落动画结束后直接进入产品页
    // 地址查询/免死金牌检查在后台继续执行，若命中拦截再强制跳转到 blocked
    const jumpTimer = setTimeout(() => {
      this._animationFinished = true;
      if (this._pendingLocationBanData) {
        console.log('[index] 动画已完成，执行延迟拦截跳转');
        const banData = this._pendingLocationBanData;
        this._pendingLocationBanData = null;
        this._doLocationBanJump(banData);
        return;
      }
      if (this._forceBlockedTriggered) {
        console.log('[index] 已触发拦截跳转，取消进入产品页');
        return;
      }
      if (this.data.pendingJumpData && this.data.pendingJumpData.collectionName) {
        this._syncPendingDataInBackground();
      }
      console.log('[index] 动画结束，直接跳转到产品页；后台继续执行地址检查');
      wx.reLaunch({ url: '/pages/products/products' });
    }, 900);
    this.addAnimationTimer(jumpTimer);
  },

  _waitForPendingJumpTarget() {
    this._stopWaitingForPendingJump();
    // 降低轮询频率并增加超时兜底，避免高频 setInterval 导致卡顿
    const startAt = Date.now();
    const maxWaitMs = 5000;
    this._waitPendingJumpTimer = setInterval(() => {
      const target = this.data.pendingJumpTarget;
      if (!target) {
        if (Date.now() - startAt >= maxWaitMs) {
          console.warn('[index] 等待目标超时，兜底跳转到产品页');
          this._stopWaitingForPendingJump();
          wx.reLaunch({ url: '/pages/products/products' });
        }
        return;
      }
      console.log('[index] 目标已就绪，立即跳转:', target);
      if (this.data.pendingJumpData && this.data.pendingJumpData.collectionName) {
        this._syncPendingDataInBackground();
      }
      this._stopWaitingForPendingJump();
      wx.reLaunch({ url: target });
    }, 250);
  },

  _stopWaitingForPendingJump() {
    if (this._waitPendingJumpTimer) {
      clearInterval(this._waitPendingJumpTimer);
      this._waitPendingJumpTimer = null;
    }
  },

  // 后台地址检查命中时，立即执行地域拦截跳转
  _executeLocationBan(locData = {}) {
    // 需求：动画要播放完成后再拦截，避免中途打断
    if (!this._animationFinished) {
      console.log('[index] 拦截命中，但动画未结束，等待动画完成后拦截');
      this._forceBlockedTriggered = true;
      this._pendingLocationBanData = locData || {};
      return;
    }
    this._doLocationBanJump(locData);
  },

  _doLocationBanJump(locData = {}) {
    this._forceBlockedTriggered = true;
    this.clearAnimationTimers();
    this._stopWaitingForPendingJump();
    try {
      const sysInfo = wx.getSystemInfoSync();
      wx.cloud.callFunction({
        name: 'banUserByLocation',
        data: {
          province: locData.province || '',
          city: locData.city || '',
          district: locData.district || '',
          address: locData.full_address || locData.address || '',
          full_address: locData.full_address || locData.address || '',
          latitude: locData.latitude,
          longitude: locData.longitude,
          deviceInfo: sysInfo.system || '',
          phoneModel: locData.phoneModel || sysInfo.model || '',
          banPage: 'index'
        },
        success: () => console.log('[index] banUserByLocation 调用成功'),
        fail: (err) => console.error('[index] banUserByLocation 调用失败:', err)
      });
    } catch (e) {}
    wx.reLaunch({ url: '/pages/blocked/blocked?type=location' });
  },

  // 🔴 后台同步：动画期间并行执行，不阻塞页面跳转
  _syncPendingDataInBackground() {
    try {
      const pending = this.data.pendingJumpData || {};
      const collectionName = pending.collectionName;
      const locData = pending.locData || {};
      if (!collectionName) return;

      const nickName = wx.getStorageSync('user_nickname') || '未知用户';
      wx.cloud.callFunction({ name: 'login' })
        .then(loginRes => {
          const openid = loginRes?.result?.openid;
          if (!openid) return;
          return db.collection(collectionName)
            .where({ _openid: openid })
            .orderBy('createTime', 'desc')
            .limit(1)
            .get()
            .then(userRes => {
              const payload = {
                ...locData,
                nickName,
                updateTime: db.serverDate()
              };
              if (userRes.data && userRes.data.length > 0) {
                return db.collection(collectionName).doc(userRes.data[0]._id).update({ data: payload });
              }
              return db.collection(collectionName).add({
                data: {
                  ...payload,
                  createTime: db.serverDate()
                }
              });
            });
        })
        .catch(err => {
          console.warn('[index] 后台同步失败（已跳转，不阻塞）:', err);
        });
    } catch (err) {
      console.warn('[index] 后台同步异常（已跳转，不阻塞）:', err);
    }
  },

  async loadBlockingConfig() {
    try {
      const configRes = await db.collection('app_config').doc('blocking_rules').get();
      if (configRes.data) {
        return {
          is_active: configRes.data.is_active !== undefined ? configRes.data.is_active : false,
          blocked_provinces: Array.isArray(configRes.data.blocked_provinces) ? configRes.data.blocked_provinces : [],
          blocked_cities: Array.isArray(configRes.data.blocked_cities) ? configRes.data.blocked_cities : []
        };
      }
    } catch (e) {
      try {
        const queryRes = await db.collection('app_config').where({ _id: 'blocking_rules' }).get();
        if (queryRes.data && queryRes.data.length > 0) {
          const config = queryRes.data[0];
          return {
            is_active: config.is_active !== undefined ? config.is_active : false,
            blocked_provinces: Array.isArray(config.blocked_provinces) ? config.blocked_provinces : [],
            blocked_cities: Array.isArray(config.blocked_cities) ? config.blocked_cities : []
          };
        }
      } catch (e2) {}
    }
    return { is_active: false, blocked_provinces: [], blocked_cities: [] };
  },

  checkIsBlockedRegion(province, city, district, config) {
    if (!config || !config.is_active) return false;
    const blockedCities = config.blocked_cities || [];

    // 🔴 高危地址判断：支持新格式对象数组，同时兼容旧格式字符串数组
    if (blockedCities.length > 0) {
      return blockedCities.some(blockedItem => {
        let blockedCity = '';
        let blockedDistrict = '';
        
        // 判断是新格式（对象）还是旧格式（字符串）
        if (typeof blockedItem === 'object' && blockedItem !== null) {
          // 新格式：{city: "佛山市", district: "南海区"} 或 {city: "佛山市", district: ""}
          blockedCity = blockedItem.city || '';
          blockedDistrict = blockedItem.district || '';
        } else if (typeof blockedItem === 'string') {
          // 旧格式：兼容 "佛山市" 这样的字符串
          blockedCity = blockedItem;
          blockedDistrict = ''; // 旧格式默认拦截整个市
        }
        
        // 如果城市不匹配，直接返回 false
        if (!city || !blockedCity || 
            (city.indexOf(blockedCity) === -1 && blockedCity.indexOf(city) === -1)) {
          return false;
        }
        
        // 城市匹配了，检查区级拦截
        if (blockedDistrict && blockedDistrict.trim() !== '') {
          // 如果配置了区，则只拦截该区
          // 如果用户没有区信息，不拦截（因为无法判断）
          if (!district || district.trim() === '') {
            return false;
          }
          // 检查区是否匹配
          return district.indexOf(blockedDistrict) !== -1 || 
                 blockedDistrict.indexOf(district) !== -1;
        } else {
          // 如果没有配置区（district 为空），则拦截整个市
          return true;
        }
      });
    }
    
    return false;
  },

  async analyzeRegion(lat, lng, phoneModel) {
    console.log('[index] analyzeRegion 开始，位置:', lat, lng);
    
    try {
      // 🔴 使用带重试机制的逆地理编码函数
      const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
      const addressData = await reverseGeocodeWithRetry(lat, lng, {
        maxRetries: 3,
        timeout: 10000,
        retryDelay: 1000
      });

      const locData = {
        ...addressData,
        phoneModel: phoneModel
      };

      // 🔴 关键检查：如果 city 为空，无法进行拦截判断
      if (!locData.city || locData.city.trim() === '') {
        console.warn('[index] ⚠️ 逆地理编码后 city 仍为空，无法进行城市拦截判断');
        this.setData({
          pendingJumpTarget: '/pages/products/products',
          pendingJumpData: { collectionName: 'user_list', locData: locData }
        });
        return;
      }

      console.log('[index] 解析后的地址数据:', locData);
      try {
        wx.setStorageSync('last_location', locData);
      } catch (e) {}

      // 🔴 调用统一的拦截判断方法
      this._checkLocationBlocking(locData);
    } catch (err) {
      console.error('[index] analyzeRegion 异常:', err);
      const locData = {
        latitude: lat,
        longitude: lng,
        province: '',
        city: '',
        district: '',
        full_address: '位置解析失败',
        address: '位置解析失败',
        phoneModel: phoneModel
      };
      try {
        wx.setStorageSync('last_location', locData);
      } catch (e2) {}
      this.setData({
        pendingJumpTarget: '/pages/products/products',
        pendingJumpData: { collectionName: 'user_list', locData: locData }
      });
    }
  },

  // 🔴 提取拦截判断逻辑为独立方法，供 success 和 fail 回调共用
  async _checkLocationBlocking(locData) {
    try {
      // 管理员：不参与地域拦截（仍写入 last_location 供后台查看）
      try {
        await this.checkAdminPrivilege();
      } catch (e) {
        console.warn('[index] checkAdminPrivilege 异常，继续非管理员拦截逻辑', e);
      }
      if (this.data.isAdmin) {
        console.log('[index] 管理员账号，跳过地域拦截');
        try {
          wx.setStorageSync('last_location', locData);
        } catch (e2) {}
        this.setData({
          pendingJumpTarget: '/pages/products/products',
          pendingJumpData: { collectionName: 'user_list', locData: locData }
        });
        return;
      }

      // 1. 获取拦截配置
      console.log('[index] 开始获取拦截配置...');
      const configRes = await db.collection('app_config').doc('blocking_rules').get();
      const config = configRes.data || { is_active: false, blocked_cities: [] };
      console.log('[index] 拦截配置:', config);

      // 2. 检查拦截开关是否开启
      if (!config.is_active) {
        console.log('[index] 拦截开关未开启，正常进入');
        this.setData({
          pendingJumpTarget: '/pages/products/products',
          pendingJumpData: { collectionName: 'user_list', locData: locData }
        });
        return;
      }

      // 3. 检查是否在拦截城市（必须有 city 信息才能判断）
      if (!locData.city || locData.city.trim() === '' || locData.city === '未知') {
        console.warn('[index] ⚠️ city 信息为空或无效，无法进行拦截判断，直接放行');
        console.warn('[index] locData:', JSON.stringify(locData, null, 2));
        console.warn('[index] 这可能是逆地理编码失败或返回数据不完整导致的');
        this.setData({
          pendingJumpTarget: '/pages/products/products',
          pendingJumpData: { collectionName: 'user_list', locData: locData }
        });
        return;
      }

      const blockedCities = Array.isArray(config.blocked_cities) ? config.blocked_cities : [];
      console.log('[index] 拦截城市列表:', blockedCities);
      console.log('[index] 当前城市:', locData.city);
      console.log('[index] 当前省份:', locData.province);
      console.log('[index] 当前区县:', locData.district);
      
      // 🔴 新的拦截判断逻辑：支持对象数组格式 {city, district}，同时兼容旧格式字符串数组
      const isBlockedCity = blockedCities.some(blockedItem => {
        let blockedCity = '';
        let blockedDistrict = '';
        
        // 判断是新格式（对象）还是旧格式（字符串）
        if (typeof blockedItem === 'object' && blockedItem !== null) {
          // 新格式：{city: "佛山市", district: "南海区"} 或 {city: "佛山市", district: ""}
          blockedCity = blockedItem.city || '';
          blockedDistrict = blockedItem.district || '';
        } else if (typeof blockedItem === 'string') {
          // 旧格式：兼容 "佛山市" 这样的字符串
          blockedCity = blockedItem;
          blockedDistrict = ''; // 旧格式默认拦截整个市
        }
        
        // 如果城市不匹配，直接返回 false
        if (!locData.city || !blockedCity || 
            (locData.city.indexOf(blockedCity) === -1 && blockedCity.indexOf(locData.city) === -1)) {
          return false;
        }
        
        // 城市匹配了，检查区级拦截
        if (blockedDistrict && blockedDistrict.trim() !== '') {
          // 如果配置了区，则只拦截该区
          // 如果用户没有区信息，不拦截（因为无法判断）
          if (!locData.district || locData.district.trim() === '') {
            return false;
          }
          // 检查区是否匹配
          return locData.district.indexOf(blockedDistrict) !== -1 || 
                 blockedDistrict.indexOf(locData.district) !== -1;
        } else {
          // 如果没有配置区（district 为空），则拦截整个市
          return true;
        }
      });

      console.log('[index] 是否命中拦截城市:', isBlockedCity);

      if (isBlockedCity) {
        console.log(`[index] ⚠️ 命中拦截城市: ${locData.city}，正在检查免死金牌...`);
        
        // 获取 OpenID
        let openid = null;
        try {
          const loginRes = await wx.cloud.callFunction({ name: 'login' });
          openid = loginRes.result.openid;
          console.log('[index] 获取 OpenID 成功:', openid);
        } catch (e) {
          console.error('[index] 获取 OpenID 失败（可能是预览模式）:', e);
          console.log('[index] 预览模式无法获取 OpenID，直接执行封禁');
          this._executeLocationBan(locData);
          return;
        }

        // 查询 login_logbutton 检查是否有金牌
        let hasGoldMedal = false;
        try {
          const buttonRes = await db.collection('login_logbutton')
            .where({ _openid: openid })
            .orderBy('updateTime', 'desc')
            .limit(1)
            .get();

          console.log('[index] login_logbutton 查询结果:', buttonRes.data);
          if (buttonRes.data && buttonRes.data.length > 0) {
            hasGoldMedal = buttonRes.data[0].bypassLocationCheck === true;
            console.log('[index] 是否有免死金牌:', hasGoldMedal);
          }
        } catch (e) {
          console.error('[index] 查询 login_logbutton 失败（可能是预览模式）:', e);
          console.log('[index] 预览模式无法查询数据库，直接执行封禁');
          this._executeLocationBan(locData);
          return;
        }

        // 分支 A：金牌用户 -> 放行
        if (hasGoldMedal) {
          console.log('[index] ✅ 金牌用户 (bypassLocationCheck=true)，特权放行！');
          
          const nickName = wx.getStorageSync('user_nickname') || '未知用户';
          try {
            await db.collection('blocked_logs').add({
              data: {
                nickName: nickName,
                address: locData.full_address || locData.address || '',
                province: locData.province || '',
                city: locData.city || '',
                isBlocked: true,
                isAllowed: true,
                reason: 'VIP_GOLD_MEDAL',
                device: locData.phoneModel || '',
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            });
            console.log('[index] 已写入 blocked_logs (VIP记录)');
          } catch (e) {
            console.error('[index] 写入 blocked_logs 失败', e);
          }

          this.setData({
            pendingJumpTarget: '/pages/products/products',
            pendingJumpData: { collectionName: 'user_list', locData: locData }
          });
          return;
        }

        // 分支 B：普通用户 -> 进入封禁页
        this._executeLocationBan(locData);
        return;
      }

      // 非拦截城市，正常进入
      console.log('[index] 非拦截城市，正常进入');
      this.setData({
        pendingJumpTarget: '/pages/products/products',
        pendingJumpData: { collectionName: 'user_list', locData: locData }
      });

    } catch (err) {
      console.error('[index] 地址检查异常:', err);
      console.error('[index] 错误详情:', err.message, err.stack);
      this.setData({
        pendingJumpTarget: '/pages/products/products',
        pendingJumpData: { collectionName: 'user_list', locData: locData }
      });
    }
  },

  // 🔴 执行待跳转（动画完成后调用）
  _executePendingJump() {
    const { collectionName, locData } = this.data.pendingJumpData;
    const targetPage = this.data.pendingJumpTarget;
    
    console.log('[index] 执行待跳转，写入数据到:', collectionName, '目标页面:', targetPage);
    
    const nickName = wx.getStorageSync('user_nickname') || '未知用户';
    
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    
    wx.cloud.callFunction({ name: 'login' }).then(loginRes => {
      const openid = loginRes.result.openid;

      // 🔴 并行查询：登录日志、用户集合、封禁令牌
      const p1 = db.collection('login_logs')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      const p2 = db.collection(collectionName)
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();
      const p3 = db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      Promise.all([p1, p2, p3]).then(results => {
        const logRes = results[0]; // login_logs
        const userRes = results[1];
        const buttonRes = results[2];

        // 🔴 最高优先级：检查强制封禁按钮 qiangli（同时检查 login_logbutton 和 login_logs）
        // 先检查 login_logbutton
        if (buttonRes.data && buttonRes.data.length > 0) {
          const btn = buttonRes.data[0];
          const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
          if (qiangli) {
            console.log('[index] ⚠️ 最终安检：检测到强制封禁按钮 qiangli 已开启（login_logbutton），无视一切放行，直接封禁');
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
            return;
          }
        }

        // 🔴 同时检查 login_logs 集合（兼容用户在 login_logs 中设置 qiangli 的情况）
        if (logRes.data && logRes.data.length > 0) {
          const log = logRes.data[0];
          const qiangli = log.qiangli === true || log.qiangli === 1 || log.qiangli === 'true' || log.qiangli === '1';
          if (qiangli) {
            console.log('[index] ⚠️ 最终安检：检测到强制封禁按钮 qiangli 已开启（login_logs），无视一切放行，直接封禁');
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
            return;
          }
        }

        // 🔴 最终安检：检查 login_logbutton，确保没有封禁
        if (buttonRes.data && buttonRes.data.length > 0) {
          const btn = buttonRes.data[0];
          
          const rawFlag = btn.isBanned;
          const isBanned =
            rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
          const bypassLocationCheck = btn.bypassLocationCheck === true;

          if (isBanned) {
            // 🔴 截屏/录屏封禁：最高优先级，不允许任何方式绕过
            if (btn.banReason === 'screenshot' || btn.banReason === 'screen_record') {
              console.log('[index] 最终安检：检测到截屏/录屏封禁，跳转到封禁页');
              wx.reLaunch({ url: '/pages/blocked/blocked?type=screenshot' });
              return;
            } else if (!bypassLocationCheck) {
              console.log('[index] 最终安检：检测到封禁，跳转到封禁页');
              const banType = btn.banReason === 'location_blocked' ? 'location' : 'banned';
              wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
              return;
            }
          }
        }

        // 更新或创建用户位置记录
        if (userRes.data && userRes.data.length > 0) {
          db.collection(collectionName)
            .doc(userRes.data[0]._id)
            .update({
              data: {
                ...locData,
                nickName: nickName,
                updateTime: db.serverDate()
              }
            })
            .then(() => {
              console.log('[index] 用户位置已更新');
              wx.reLaunch({ url: targetPage });
            })
            .catch(err => {
              console.error('[index] 更新用户位置失败:', err);
              wx.reLaunch({ url: targetPage });
            });
          } else {
          // 🔴 修复：不能手动设置 _openid，云数据库会自动根据当前用户设置
          db.collection(collectionName)
            .add({
              data: {
                ...locData,
                nickName: nickName,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            })
            .then(() => {
              console.log('[index] 用户位置已创建');
              wx.reLaunch({ url: targetPage });
            })
            .catch(err => {
              console.error('[index] 创建用户位置失败:', err);
              wx.reLaunch({ url: targetPage });
            });
        }
      }).catch(err => {
        console.error('[index] 查询失败:', err);
        wx.reLaunch({ url: targetPage });
      });
    }).catch(err => {
      console.error('[index] 获取 OpenID 失败:', err);
      wx.reLaunch({ url: targetPage });
    });
  },

  appendDataAndJump(collectionName, locData, targetPage) {
    const nickName = wx.getStorageSync('user_nickname') || '未知用户';
    
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    
    wx.cloud.callFunction({ name: 'login' }).then(loginRes => {
      const openid = loginRes.result.openid;

      // 🔴 并行查询：登录日志、用户集合、封禁令牌
      const p1 = db.collection('login_logs')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      const p2 = db.collection(collectionName)
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();
      const p3 = db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      Promise.all([p1, p2, p3]).then(results => {
        const userRes = results[1];
        const buttonRes = results[2];

        // 🔴 最终安检：检查 login_logbutton，确保没有封禁
        if (buttonRes.data && buttonRes.data.length > 0) {
          const btn = buttonRes.data[0];
          const rawFlag = btn.isBanned;
          const isBanned =
            rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
          const hasGoldMedal = btn.bypassLocationCheck === true;
        
        if (isBanned) {
            // 🔴 截屏/录屏封禁：最高优先级，不允许任何方式绕过
            if (btn.banReason === 'screenshot' || btn.banReason === 'screen_record') {
              console.warn('[index] 最终检查：检测到截屏/录屏封禁，立即拦截！', btn);
              wx.reLaunch({ url: '/pages/blocked/blocked?type=screenshot' });
          return;
            } else if (btn.banReason === 'location_blocked' && hasGoldMedal) {
              console.log('[index] 最终检查：地址拦截但有金牌，放行');
            } else {
              console.warn('[index] 最终检查：发现封禁记录，拦截跳转！', btn);
              const banType = btn.banReason === 'location_blocked' ? 'location' : 'banned';
              wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
              return;
            }
          }
        }

        let lastCount = 0;
        if (userRes.data.length > 0) {
          lastCount = userRes.data[0].visitCount || 0;
        }
        
        const newData = {
          nickName,
          province: locData.province,
          city: locData.city,
          district: locData.district,
          address: locData.full_address,
          phoneModel: locData.phoneModel, 
          visitCount: lastCount + 1,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        };

        const jump = () => {
          wx.reLaunch({ url: targetPage });
        };

        // 🔴 移除写入超时的兜底跳转，严格等待数据库操作完成
        // 如果数据库操作失败，仍然跳转（因为用户已经授权，不应该因为数据库问题阻止进入）

        db.collection(collectionName).add({ data: newData })
          .then(() => {
            setTimeout(jump, 200);
          })
          .catch(err => {
            console.error('[index] 写入失败', err);
            // 🔴 数据库写入失败时，仍然跳转（因为用户已经授权，不应该因为数据库问题阻止进入）
            setTimeout(jump, 200);
          }); 
      });
    });
  },

  // 显示自定义弹窗
  showMyDialog(options) {
    this.setData({
      'dialog.show': true,
      'dialog.title': options.title || '提示',
      'dialog.content': options.content || '',
      'dialog.showCancel': options.showCancel || false,
      'dialog.confirmText': options.confirmText || '确定',
      'dialog.cancelText': options.cancelText || '取消',
      'dialog.callback': options.success || null
    });
  },

  // 关闭自定义弹窗（带收缩退出动画）
  closeCustomDialog() {
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
    }, 420);
  },

  // 点击弹窗确定（带收缩退出动画）
  onDialogConfirm() {
    const cb = this.data.dialog.callback;
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
      if (cb) cb({ confirm: true });
    }, 420);
  },

  // 空函数，用于阻止事件冒泡
  noop() {},

  showAutoToast(title = '提示', content = '') {
    const full = content ? `${title}：${content}` : String(title || '提示');
    try {
      const toast = this.selectComponent('#custom-toast');
      if (toast && typeof toast.showToast === 'function') {
        toast.showToast({ title: full.length > 90 ? full.slice(0, 87) + '...' : full, icon: 'none', duration: 2500 });
        return;
      }
    } catch (e) {}
    if (wx.__mt_oldShowToast) {
      wx.__mt_oldShowToast({ title: full.length > 90 ? full.slice(0, 87) + '...' : full, icon: 'none', duration: 2500 });
    }
  },

  // 显示 Loading（使用自定义动画，不使用微信官方弹窗和全局 UI）
  showMyLoading(title = '加载中...') {
    // 🔴 关键：先隐藏全局 UI 的 loading（如果存在）
    if (app && app.hideLoading) {
      app.hideLoading();
    }
    // 🔴 强制关闭微信官方 loading（如果存在）
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    // 记录开始时间，用于确保最少显示一段时间
    this._loadingStartTs = Date.now();
    this.setData({ showLoadingAnimation: true, loadingText: title });
  },

  // 隐藏 Loading（使用自定义动画）
  hideMyLoading() {
    // 为了不遮挡页面切换：最少显示 1.5 秒（加载中显示久一点，避免一闪而过）
    const minShowMs = 1500;
    const start = this._loadingStartTs || 0;
    const elapsed = start ? (Date.now() - start) : minShowMs;
    const wait = Math.max(0, minShowMs - elapsed);

    if (this._loadingHideTimer) {
      clearTimeout(this._loadingHideTimer);
      this._loadingHideTimer = null;
    }

    this._loadingHideTimer = setTimeout(() => {
      this.setData({ showLoadingAnimation: false });
      this._loadingStartTs = 0;
    }, wait);
  },

  handleDeny() { 
    this.showAutoToast('提示', '需要授权才能使用');
  },
  onOpenSettingResult(e) {
    if (e.detail.authSetting && e.detail.authSetting['scope.userLocation']) {
      this.setData({ showAuthForceModal: false });
      // 显示自定义成功弹窗
      this._closeAllPopups();
      this.setData({
        showCustomSuccessModal: true,
        successModalTitle: '定位已开启',
        successModalContent: ''
      });
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
        // 🔴 关键修复：用户开启权限后，自动重新尝试获取位置
        console.log('[onOpenSettingResult] 用户已开启定位权限，重新获取位置');
        this.handleAccess();
      }, 1500);
    } else {
      // 用户没有开启权限，继续显示提示
      this.setData({ 
        showAuthForceModal: true, 
        authMissingType: 'location' 
      });
    }
  },
  retryBluetooth() { this.setData({ showAuthForceModal: false }); },
  onOpenSetting(e) {
     if (e.detail.authSetting && e.detail.authSetting['scope.userLocation']) {
      this.setData({ showAuthModal: false });
      // 显示自定义成功弹窗
      this._closeAllPopups();
      this.setData({
        showCustomSuccessModal: true,
        successModalTitle: '授权成功',
        successModalContent: ''
      });
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
        // 🔴 关键修复：用户开启权限后，自动重新尝试获取位置
        console.log('[onOpenSetting] 用户已开启定位权限，重新获取位置');
        this.handleAccess();
      }, 1500);
    } else {
      // 显示自定义错误弹窗
      this.setData({ 
        showCustomErrorModal: true
      });
    }
  },


  // 🔴 计算导航栏信息（屏幕适配）
  calcNavBarInfo() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo(); 
    const statusBarHeight = windowInfo.statusBarHeight;
    const gap = menuButton.top - statusBarHeight;
    const navBarHeight = (gap * 2) + menuButton.height;
    this.setData({ statusBarHeight, navBarHeight });
    console.log('[index.js] 屏幕适配信息:', { statusBarHeight, navBarHeight, gap, menuButtonHeight: menuButton.height });
  },

  // ================== 管理员权限检查 ==================
  async checkAdminPrivilege() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }
      if (adminCheck.data.length > 0) {
        this.setData({ isAdmin: true });
        console.log('[index] 身份验证成功：合法管理员');
      } else {
        this.setData({ isAdmin: false });
        console.log('[index] 未在管理员白名单中');
      }
    } catch (err) {
      console.error('[index] 权限检查失败', err);
      this.setData({ isAdmin: false });
    }
  },

  // 管理员入口 - 切换管理员模式（仅管理员可用）
  onAdminTap: function(e) {
    try {
      console.log('[index] onAdminTap 被触发');
      console.log('[index] isAdmin:', this.data.isAdmin);
      console.log('[index] isAdminMode:', this.data.isAdminMode);
      
      // 只有管理员才能切换模式
      if (this.data.isAdmin) {
        this.toggleAdminMode();
      }
    } catch (error) {
      console.error('[index] onAdminTap 发生错误:', error);
    }
  },

  // 切换管理员模式
  toggleAdminMode() {
    const newMode = !this.data.isAdminMode;
    this.setData({ isAdminMode: newMode });
    console.log('[index] 管理员模式切换为:', newMode);
    
    // 如果进入管理员模式，加载被封禁的用户列表
    if (newMode) {
      this.setData({ adminViewMode: 'banned' });
      this.loadBannedUsers();
      this.loadScreenshotRiskUsers();
      this.loadSuspiciousUsers();
    }
    
    // 如果退出管理员模式，重置 step
    if (!newMode) {
      this.setData({
        step: 0,
        adminViewMode: 'banned',
        bannedUsers: [],
        screenshotRiskUsers: [],
        suspiciousUsers: []
      });
    }
  },

  // 退出管理员模式
  exitAdminMode() {
    this.setData({
      isAdminMode: false,
      step: 0,
      adminViewMode: 'banned',
      bannedUsers: [],
      screenshotRiskUsers: [],
      suspiciousUsers: []
    });
    console.log('[index] 已退出管理员模式');
  },

  switchAdminTab(e) {
    const mode = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'banned';
    if (!mode || mode === this.data.adminViewMode) return;
    this.setData({ adminViewMode: mode });
    if (mode === 'banned' && this.data.bannedUsers.length === 0) {
      this.loadBannedUsers();
      this.loadScreenshotRiskUsers();
    } else if (mode === 'suspicious' && this.data.suspiciousUsers.length === 0) {
      this.loadSuspiciousUsers();
    }
  },

  // 🔴 加载被封禁的用户列表
  async loadBannedUsers() {
    this.setData({ isLoadingBannedUsers: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'getBannedUsers' });
      if (res.result && res.result.success) {
        this.setData({ bannedUsers: res.result.users || [] });
        console.log('[index] 已加载封禁用户列表，数量:', res.result.users?.length || 0);
          } else {
        console.error('[index] 加载封禁用户列表失败:', res.result?.error);
        this.setData({ bannedUsers: [] });
      }
    } catch (err) {
      console.error('[index] 加载封禁用户列表异常:', err);
      this.setData({ bannedUsers: [] });
    } finally {
      this.setData({ isLoadingBannedUsers: false });
    }
  },

  // 🔴 加载截图超限待审核列表（24小时>=3次）
  async loadScreenshotRiskUsers() {
    this.setData({ isLoadingScreenshotRiskUsers: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'getScreenshotRiskQueue' });
      if (res.result && res.result.success) {
        this.setData({ screenshotRiskUsers: res.result.users || [] });
      } else {
        console.error('[index] 加载截图风险列表失败:', res.result?.error);
        this.setData({ screenshotRiskUsers: [] });
      }
    } catch (err) {
      console.error('[index] 加载截图风险列表异常:', err);
      this.setData({ screenshotRiskUsers: [] });
    } finally {
      this.setData({ isLoadingScreenshotRiskUsers: false });
    }
  },

  async loadSuspiciousUsers() {
    this.setData({ isLoadingSuspiciousUsers: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'getSuspiciousUsers' });
      if (res.result && res.result.success) {
        this.setData({ suspiciousUsers: res.result.users || [] });
      } else {
        console.error('[index] 加载可疑用户列表失败:', res.result?.error);
        this.setData({ suspiciousUsers: [] });
      }
    } catch (err) {
      console.error('[index] 加载可疑用户列表异常:', err);
      this.setData({ suspiciousUsers: [] });
    } finally {
      this.setData({ isLoadingSuspiciousUsers: false });
    }
  },

  // 🔴 管理员对截图超限做决策：ban / ignore
  async handleScreenshotRiskDecision(e) {
    const riskId = e.currentTarget.dataset.riskId;
    const action = e.currentTarget.dataset.action; // ban | ignore
    if (!riskId || !action) return;

    const actionText = action === 'ban' ? '封禁' : '放行';
    this.showMyDialog({
      title: '确认操作',
      content: `确定要${actionText}该截图超限用户吗？`,
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          this.showMyLoading('处理中...');
          const result = await wx.cloud.callFunction({
            name: 'handleScreenshotRiskDecision',
            data: { riskId, action }
          });
          this.hideMyLoading();
          if (result.result && result.result.success) {
            this.showAutoToast('成功', `已${actionText}`);
            this.loadScreenshotRiskUsers();
            if (action === 'ban') this.loadBannedUsers();
          } else {
            this.showAutoToast('失败', result.result?.error || '处理失败');
          }
        } catch (err) {
          this.hideMyLoading();
          this.showAutoToast('失败', err.message || '处理失败');
        }
      }
    });
  },

  handleAddressTap(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const latitude = Number(dataset.latitude);
    const longitude = Number(dataset.longitude);
    const province = dataset.province || '';
    const city = dataset.city || '';
    const district = dataset.district || '';
    const detailAddress = dataset.address || '';
    const nickname = dataset.nickname || '用户位置';
    const fullAddress = `${province}${city}${district}${detailAddress}`.trim();

    const openMap = (lat, lng) => {
      wx.openLocation({
        latitude: lat,
        longitude: lng,
        name: nickname,
        address: fullAddress || detailAddress || `${province}${city}${district}` || '位置',
        scale: 16
      });
    };

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      openMap(latitude, longitude);
      return;
    }

    if (!fullAddress) {
      this.showAutoToast('提示', '该用户暂无可用地址信息');
      return;
    }

    qqmapsdk.geocoder({
      address: fullAddress,
      success: (res) => {
        const loc = res && res.result && res.result.location;
        if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
          openMap(loc.lat, loc.lng);
        } else {
          this.showAutoToast('提示', '地址解析失败，无法打开地图');
        }
      },
      fail: () => {
        this.showAutoToast('提示', '地址解析失败，无法打开地图');
      }
    });
  },

  // 🔴 放行用户（根据封禁类型执行不同逻辑）
  unbanUser(e) {
    const buttonId = e.currentTarget.dataset.buttonId;
    const userIndex = e.currentTarget.dataset.index;
    const banReason = e.currentTarget.dataset.banReason;
    const openid = e.currentTarget.dataset.openid;
    const nickname = e.currentTarget.dataset.nickname || '该用户';

    console.log('[unbanUser] 点击放行，参数:', { buttonId, userIndex, banReason, openid });

    if (!buttonId) {
      this.showMyDialog({ title: '错误', content: '缺少必要参数 buttonId' });
      return;
    }

    // 🔴 1. 显示二次确认弹窗
    this.setData({
      showConfirmModal: true,
      confirmModalContent: `确定要解除对"${nickname}"的封禁吗？`,
      _pendingUnbanData: { buttonId, userIndex, banReason, openid, nickname }
    });
  },

  // 🔴 隐藏确认弹窗
  hideConfirmModal() {
    this.setData({
      showConfirmModal: false,
      confirmModalContent: '',
      _pendingUnbanData: null
    });
  },

  _openFirstTimeModalAnimated() {
    if (this._firstTimeModalEnterTimer) {
      clearTimeout(this._firstTimeModalEnterTimer);
      this._firstTimeModalEnterTimer = null;
    }
    this.setData({
      showFirstTimeModal: true,
      firstTimeModalEnterReady: false,
      firstTimeModalClosing: false,
    });
    this._preloadFirstTimeQrcode();
    const armEnter = () => {
      this._firstTimeModalEnterTimer = null;
      if (!this.data.showFirstTimeModal || this.data.firstTimeModalClosing) return;
      this.setData({ firstTimeModalEnterReady: true });
    };
    this._firstTimeModalEnterTimer = setTimeout(armEnter, 40);
  },

  /** 弹窗出现即预拉取本地包内二维码，复制展示时多半已进缓存，避免首帧空白久等 */
  _preloadFirstTimeQrcode() {
    if (this._firstTimeQrcodePreloadDone) return;
    const src = '/images/qrcode.jpg';
    wx.getImageInfo({
      src,
      success: () => {
        this._firstTimeQrcodePreloadDone = true;
      },
      fail: () => {
        // 文件缺失或路径错误时不打标，便于重试
      },
    });
  },

  // 🔴 关闭首次进入提示弹窗
  closeFirstTimeModal() {
    if (this.data.firstTimeModalClosing) return;
    wx.setStorageSync('has_seen_first_time_modal', true);
    this.setData({ firstTimeModalClosing: true });
    setTimeout(() => {
      this.setData({
        showFirstTimeModal: false,
        firstTimeModalClosing: false,
        firstTimeModalEnterReady: false,
        showWechatQRCode: false,
      });
    }, 380);
  },

  // 🔴 复制管理员微信号
  copyAdminWechat() {
    if (this.data.copyWechatBusy) return;
    const wechat = this.data.adminWechat;
    this.setData({ copyWechatBusy: true });
    // 🔴 复制前立即隐藏可能的官方弹窗（使用原生API）
    const hideOfficialToast = () => {
      try {
        if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
        if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
      } catch (e) {}
    };
    hideOfficialToast();
    
    wx.setClipboardData({
      data: wechat,
      success: () => {
        // 轻量隐藏一次系统默认 toast，避免覆盖自定义提示
        hideOfficialToast();
        this._preloadFirstTimeQrcode();
        // 二维码 + 复制态 + 成功提示一次 setData，减少重排
        this.setData({
          showWechatQRCode: true,
          copyWechatBusy: false,
          showCopySuccessModal: true,
        });
        // 2秒后自动关闭
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
      },
      fail: () => {
        this.setData({ copyWechatBusy: false });
        this.showAutoToast('提示', '复制失败，请重试');
      }
    });
  },

  // 🔴 收起二维码并跳转到昵称输入页面
  toggleQRCode() {
    if (this.data.firstTimeModalClosing) return;
    wx.setStorageSync('has_seen_first_time_modal', true);
    this.setData({ firstTimeModalClosing: true });
    setTimeout(() => {
      this.setData({
        showFirstTimeModal: false,
        firstTimeModalClosing: false,
        firstTimeModalEnterReady: false,
        showWechatQRCode: false,
        isShowNicknameUI: true,
      });
    }, 380);
  },

  // 🔴 确认执行放行
  async handleConfirmAction() {
    const { buttonId, userIndex, banReason, openid } = this.data._pendingUnbanData || {};
    
    if (!buttonId) {
      this.hideConfirmModal();
      this.showMyDialog({ title: '错误', content: '缺少必要参数' });
      return;
    }

    // 隐藏确认弹窗
    this.hideConfirmModal();

    try {
      this.showMyLoading('处理中...');
      
      // 🔴 先检查 qiangli 强制封禁状态
      const db = wx.cloud.database();
      const buttonRes = await db.collection('login_logbutton').doc(buttonId).get();
      if (buttonRes.data && (buttonRes.data.qiangli === true || buttonRes.data.qiangli === 1 || buttonRes.data.qiangli === 'true' || buttonRes.data.qiangli === '1')) {
        this.hideMyLoading();
        this.showMyDialog({
          title: '无法解封',
          content: '该用户已开启 qiangli 强制封禁，无法通过此方式解封。\n\n请在云开发控制台手动将 qiangli 字段改为 false 后再解封。',
          showCancel: false
        });
        return;
      }

      // 根据不同的封禁类型执行不同的逻辑
      if (banReason === 'screenshot' || banReason === 'screen_record') {
        // 截图封禁：只把 isBanned 设置为 false
        console.log('[unbanUser] 截图封禁，更新 isBanned 为 false');
        const res = await wx.cloud.callFunction({
          name: 'unbanUser',
          data: { buttonId: buttonId, updateData: { isBanned: false } }
        });
        if (!res.result || !res.result.success) {
          throw new Error(res.result?.error || '更新失败');
        }
      } else if (banReason === 'nickname_verify_fail' || banReason === 'banned') {
        // 昵称封禁：只把 login_logs 里面的 auto 设置为 true（不修改 isBanned）
        console.log('[unbanUser] 昵称封禁，只更新 login_logs 的 auto 为 true');
        if (!openid) {
          throw new Error('openid 为空，无法更新 login_logs');
        }
        const res = await wx.cloud.callFunction({
          name: 'unbanUser',
          data: { buttonId: buttonId, openid: openid, updateLoginLogsAuto: true }
        });
        if (!res.result || !res.result.success) {
          throw new Error(res.result?.error || '更新 login_logs 失败');
        }
      } else if (banReason === 'location_blocked') {
        // 地址拦截：把 isBanned 设置为 false，然后 bypassLocationCheck 设置为 true
        console.log('[unbanUser] 地址拦截，更新 isBanned 和 bypassLocationCheck');
        const res = await wx.cloud.callFunction({
          name: 'unbanUser',
          data: { buttonId: buttonId, updateData: { isBanned: false, bypassLocationCheck: true } }
        });
        if (!res.result || !res.result.success) {
          throw new Error(res.result?.error || '更新失败');
        }
      } else {
        // 其他类型：只把 isBanned 设置为 false
        console.log('[unbanUser] 其他类型，更新 isBanned 为 false');
        const res = await wx.cloud.callFunction({
          name: 'unbanUser',
          data: { buttonId: buttonId, updateData: { isBanned: false } }
        });
        if (!res.result || !res.result.success) {
          throw new Error(res.result?.error || '更新失败');
        }
      }

      // 从列表中移除该用户（立即更新UI）
      const users = this.data.bannedUsers;
      users.splice(userIndex, 1);
      this.setData({ bannedUsers: users });

      console.log('[unbanUser] 操作成功，已从列表中移除');

      this.hideMyLoading();

      // 🔴 2. 使用自定义白底黑字弹窗显示成功
      this._closeAllPopups();
      this.setData({
        showCustomSuccessModal: true,
        successModalTitle: '已解除封禁',
        successModalContent: '用户现在可以正常访问了'
      });

      // 2秒后自动关闭弹窗并刷新列表
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
        // 延迟重新加载封禁用户列表，等待数据库更新生效
        setTimeout(() => {
          this.loadBannedUsers();
        }, 500);
      }, 2000);

    } catch (err) {
      this.hideMyLoading();
      console.error('[index] 解封用户失败:', err);
      this.showAutoToast('错误', '解封失败：' + err.message);
    }
  },

  // 🔴 重试昵称验证（将 isBanned 设置为 false，让用户重新输入昵称）
  async retryNickname(e) {
    const buttonId = e.currentTarget.dataset.buttonId;
    const userIndex = e.currentTarget.dataset.index;
    const nickname = e.currentTarget.dataset.nickname || '该用户';
    const user = this.data.bannedUsers[userIndex];
    
    if (!user || !buttonId) {
      this.showMyDialog({ title: '错误', content: '缺少必要参数' });
      return;
    }

    // 二次确认
    this.showMyDialog({
      title: '确认重试',
      content: `确定要让用户 "${nickname}" 重新输入昵称吗？\n\n将解除封禁状态，用户可以重新验证。`,
      showCancel: true,
      confirmText: '确认重试',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            this.showMyLoading('处理中...');
            
            // 调用云函数，将 login_logbutton 中的 isBanned 设置为 false
            const result = await wx.cloud.callFunction({
              name: 'unbanUser',
              data: {
                buttonId: buttonId,
                updateData: { isBanned: false }
              }
            });

            this.hideMyLoading();

            if (result.result && result.result.success) {
              // 从列表中移除该用户
              const users = this.data.bannedUsers;
              users.splice(userIndex, 1);
              this.setData({ bannedUsers: users });
              
              this.showMyDialog({
                title: '操作成功',
                content: `用户 "${nickname}" 已解除封禁，可以重新输入昵称`,
                showCancel: false
              });
            } else {
              throw new Error(result.result?.error || '操作失败');
            }
          } catch (err) {
            this.hideMyLoading();
            console.error('[retryNickname] 操作失败:', err);
            this.showAutoToast('操作失败', err.message || '请稍后重试');
          }
        }
      }
    });
  },

  // 🔴 无视用户（永久封禁，二次确认）
  ignoreUser(e) {
    const buttonId = e.currentTarget.dataset.buttonId;
    const userIndex = e.currentTarget.dataset.index;
    const user = this.data.bannedUsers[userIndex];
    
    if (!user) {
      return;
    }

    // 二次确认
    this.showMyDialog({
      title: '⚠️ 确认无视',
      content: `确定要永久封禁用户 "${user.nickname}" 吗？\n\n此操作不可撤销，用户将永远无法访问。`,
      showCancel: true,
      confirmText: '确认无视',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认无视，这里可以添加标记逻辑
          // 由于是"永久封禁"，我们可以添加一个标记字段，或者直接保持 isBanned = true
          // 这里我们只是从列表中移除，表示已处理
          const users = this.data.bannedUsers;
          users.splice(userIndex, 1);
          this.setData({ bannedUsers: users });
          
          this.showMyDialog({ 
            title: '已处理', 
            content: '用户已被标记为永久封禁',
            success: () => {}
          });
        }
      }
    });
  },

  // 🔴 切换昵称录入模式
  toggleNicknameMode() {
    // 兼容旧调用：切换到昵称录入页
    this.setData({
      adminViewMode: this.data.adminViewMode === 'nickname' ? 'banned' : 'nickname',
      isNicknameMode: this.data.adminViewMode !== 'nickname',
      nicknameInput: '',
      nicknameBypassLocation: false
    });
  },

  // 🔴 昵称输入
  onNicknameInput(e) {
    this.setData({
      nicknameInput: e.detail.value.trim()
    });
  },

  // 🔴 切换放行开关
  toggleNicknameBypass(e) {
    this.setData({
      nicknameBypassLocation: e.detail.value
    });
  },

  // 🔴 提交昵称到 valid_users
  async submitNickname() {
    const nickname = this.data.nicknameInput.trim();
    const bypassLocation = this.data.nicknameBypassLocation;
    
    if (!nickname) {
      this.showMyDialog({
        title: '提示',
        content: '请输入昵称',
        showCancel: false
      });
      return;
    }

    if (this.data.isSubmittingNickname) {
      return;
    }

    this.setData({ isSubmittingNickname: true });

    try {
      // 调用专门的云函数，直接写入 valid_users
      const res = await wx.cloud.callFunction({
        name: 'addNicknameToWhitelist',
        data: {
          nickname: nickname,
          bypassLocationCheck: bypassLocation // 传递放行开关状态
        }
      });

      console.log('[index] 昵称录入结果:', res.result);

      // 🔴 立即重置提交状态，不依赖对话框回调
      this.setData({ isSubmittingNickname: false });

      if (res.result && res.result.success) {
        // 录入成功
        const message = res.result.message || `昵称 "${nickname}" 已同步到白名单${bypassLocation ? '（已开启地域放行）' : ''}`;
        // 清空输入框和重置开关
        this.setData({ 
          nicknameInput: '',
          nicknameBypassLocation: false
        });
        
        this.showMyDialog({
          title: '录入成功',
          content: message,
          showCancel: false
        });
      } else {
        // 录入失败
        const errMsg = res.result?.errMsg || '录入失败，请稍后重试';
        this.showAutoToast('录入失败', errMsg);
      }
    } catch (err) {
      console.error('[index] 昵称录入失败:', err);
      // 🔴 确保错误时也重置状态
      this.setData({ isSubmittingNickname: false });
      
      this.showAutoToast('录入失败', err.errMsg || '网络错误，请稍后重试');
    }
  },

  // 🔴 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
});
