// miniprogram/pages/index/index.js
const app = getApp();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js');
const referralPendingBind = require('../../utils/referralPendingBind.js');
const { normalizeAccessCode, isAccessCodeFormat, extractPlainAccessCode } = require('../../utils/accessCode.js');
const shareApp = require('../../utils/shareApp.js');
const { redirectToPcBlockedIfNeeded } = require('../../utils/runtimeEnv.js');
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
    nicknameUiClosing: false,
    isAuthorized: false,
    inputNickName: '',
    inputInviteCode: '',
    inviteCodeInputInvalid: false,
    showInviteCodeInput: false,
    step: 0, 
    locationResult: null,
    // 🔴 动画完成后的跳转目标（等待动画完成后再跳转）
    pendingJumpTarget: null,
    pendingJumpData: null,
    
    // 原有弹窗控制
    showAuthModal: false,
    authModalClosing: false,
    showAuthForceModal: false,
    authForceModalClosing: false,
    showLocationPermissionModal: false,
    locationPermissionModalClosing: false,
    authMissingType: '',

    // 【新增】控制自定义错误弹窗 (黑白风)
    showCustomErrorModal: false,
    customErrorModalClosing: false,
    
    // 【新增】控制自定义成功提示弹窗 (黑白风)
    showCustomSuccessModal: false,
    customSuccessModalClosing: false,
    successModalTitle: '',
    successModalContent: '',
    
    // 【新增】控制"内容已复制"弹窗
    showCopySuccessModal: false,
    copySuccessModalClosing: false,
    
    // 【新增】控制二次确认弹窗
    showConfirmModal: false,
    confirmModalClosing: false,
    confirmModalContent: '',
    _pendingUnbanData: null, // 存储待执行的放行数据
    
    // 【新增】首次进入提示弹窗
    showXianyuWarningModal: false,
    xianyuWarningModalEnterReady: false,
    xianyuWarningModalClosing: false,
    xianyuWarningActionReady: false,
    xianyuWarningActionCountdown: 5,
    xianyuWarningProgress: 0,
    showFirstTimeModal: false,
    firstTimeModalEnterReady: false, // 下一帧再开过渡，避免 wx:if 首帧「硬切」
    firstTimeModalClosing: false,
    showWechatQRCode: false, // 是否显示微信二维码
    adminWechat: 'MT-摩改社', // 管理员微信号（可以修改）
    copyWechatBusy: false, // 复制微信号进行中（用于即时反馈）
    qrPressing: false, // 二维码按压态（触摸即下沉）
    firstTimeActionReady: false, // 弹窗打开 2 秒后才可操作主按钮
    firstTimeActionCountdown: 2,

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
    adminViewMode: 'banned', // banned | bannedIgnored | suspicious | suspiciousBanned | suspiciousIgnored | nickname
    manualBannedMode: false, // true: 仅手动封禁名单
    suspiciousManualBannedMode: false, // true: 仅可疑人员处理中手动封禁留存名单
    bannedUsers: [],       // 被封禁的用户列表
    screenshotRiskUsers: [], // 截图超限待审核列表
    suspiciousUsers: [],   // 可疑用户列表（多次进入/长停留）
    suspiciousDisplayList: [], // 展示用列表（含搜索高亮标记，始终含全部人员）
    suspiciousSearchMatchCount: 0, // 当前关键词命中人数
    adminSuspiciousSearch: '', // 可疑人员搜索关键词
    adminSuspiciousSearchTrim: '', // 去空格后的关键词（供 WXML 判断）
    ignoredUsers: [], // 已无视人员留档
    ignoredDisplayList: [],
    ignoredSearchMatchCount: 0,
    adminIgnoredSearch: '',
    adminIgnoredSearchTrim: '',
    isLoadingIgnoredUsers: false,
    bannedIgnoredUsers: [],
    bannedIgnoredDisplayList: [],
    bannedIgnoredSearchMatchCount: 0,
    adminBannedIgnoredSearch: '',
    adminBannedIgnoredSearchTrim: '',
    isLoadingBannedIgnoredUsers: false,
    isLoadingBannedUsers: false,  // 是否正在加载封禁用户列表
    isLoadingScreenshotRiskUsers: false,
    isLoadingSuspiciousUsers: false,
    adminListRefreshing: false,
    adminExpandedCardKeys: {}, // 管理员卡片展开状态 rowKey -> true
    // 🔴 访问口令管理
    accessCodeList: [],
    isGeneratingAccessCode: false,
    isLoadingAccessCodes: false,
    accessCodeBypassLocation: false,
    blockedRegionValue: ['广东省', '广州市', '天河区'],
    blockedRegionText: '广东省 广州市 天河区',
    blockedWholeCity: false,
    blockedCitiesDisplay: [],
    blockingRulesActive: true,
    isLoadingBlockedRegions: false,
    isSubmittingBlockedRegion: false
  },

  _clearNoLoadingTimer() {
    if (this._noLoadingTimer) {
      clearInterval(this._noLoadingTimer);
      this._noLoadingTimer = null;
    }
  },

  _closeWithAnimation(showKey, closingKey, afterClosePatch = {}, duration = 360) {
    if (!this.data[showKey]) {
      if (Object.keys(afterClosePatch).length) {
        this.setData(afterClosePatch);
      }
      return;
    }
    this.setData({ [closingKey]: true });
    setTimeout(() => {
      this.setData({
        [showKey]: false,
        [closingKey]: false,
        ...afterClosePatch
      });
    }, duration);
  },

  _showNicknameUI() {
    if (this.data.isAdmin) return;
    this.setData({
      isShowNicknameUI: true,
      nicknameUiClosing: false
    });
  },

  _hideNicknameUIWithAnimation(extraPatch = {}, duration = 320) {
    if (!this.data.isShowNicknameUI) {
      if (Object.keys(extraPatch).length) {
        this.setData(extraPatch);
      }
      return;
    }
    this.setData({ nicknameUiClosing: true });
    setTimeout(() => {
      this.setData({
        isShowNicknameUI: false,
        nicknameUiClosing: false,
        ...extraPatch
      });
    }, duration);
  },

  async _isReviewPassMode() {
    if (typeof this._reviewPassModeCache === 'boolean') {
      return this._reviewPassModeCache;
    }
    try {
      const res = await db.collection('app_config').doc('blocking_rules').get();
      const config = res && res.data ? res.data : {};
      const reviewPassMode = config.is_active === false;
      this._reviewPassModeCache = reviewPassMode;
      return reviewPassMode;
    } catch (e) {
      this._reviewPassModeCache = false;
      return false;
    }
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
    if (redirectToPcBlockedIfNeeded()) return;

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

    this._allowScreenCaptureOnIndex();

    // 1. 先校验身份（管理员优先，无需填昵称/口令）
    this._initIndexAuthFlow();

    // 2. 异步检查全局黑名单（避免死循环）
    this.checkGlobalBanStatus();
  },

  async _initIndexAuthFlow() {
    this._indexAuthFlowInProgress = true;
    try {
      const isAdmin = await this._checkAdminPrivilegeAsync();
      if (isAdmin) {
        this._bypassAuthForAdmin();
        return;
      }

      // 必须以 valid_users 云端记录为准，避免本地残留昵称跳过「抖音/闲鱼」引导
      await this.checkValidUserFromDatabase();
    } finally {
      this._indexAuthFlowInProgress = false;
    }
  },

  /** 管理员：跳过昵称/口令与「专属体验」引导 */
  _bypassAuthForAdmin() {
    wx.setStorageSync('has_seen_first_time_modal', true);
    this._hideNicknameUIWithAnimation({
      isAdmin: true,
      isAuthorized: true,
      isShowNicknameUI: false,
      showFirstTimeModal: false,
      firstTimeModalEnterReady: false,
      firstTimeModalClosing: false,
      showXianyuWarningModal: false,
      xianyuWarningModalEnterReady: false,
      xianyuWarningModalClosing: false
    });
  },

  onShow() {
    if (redirectToPcBlockedIfNeeded()) return;
    this._pageAlive = true;
    this._allowScreenCaptureOnIndex();
    // 🔴 启动定时检查 qiangli 强制封禁
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    this._startSuspiciousAutoRefresh();
    this._retryPendingReferralBindIfAuthed();
    this._refreshNewUserGuideOnShow();
  },

  /** 全局守卫清掉本地昵称后，补拉「抖音/闲鱼」引导或昵称层 */
  _refreshNewUserGuideOnShow() {
    if (this._indexAuthFlowInProgress) return;
    if (this.data.isAdmin || this.data.isAuthorized) return;
    const hasAuth = wx.getStorageSync('has_permanent_auth');
    const nick = wx.getStorageSync('user_nickname');
    if (hasAuth && nick) return;
    if (
      this.data.showFirstTimeModal ||
      this.data.showXianyuWarningModal ||
      this.data.xianyuWarningModalClosing ||
      this.data.isShowNicknameUI
    ) {
      return;
    }
    this._showUnauthorizedEntryUI();
  },

  onHide() {
    this._pageAlive = false;
    // 🔴 停止定时检查
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    this._stopWaitingForPendingJump();
    this._stopSuspiciousAutoRefresh();
    this._clearNoLoadingTimer();
  },

  onUnload() {
    this._pageAlive = false;
    // 🔴 停止定时检查
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    this._stopWaitingForPendingJump();
    this._stopSuspiciousAutoRefresh();
    if (this._firstTimeModalEnterTimer) {
      clearTimeout(this._firstTimeModalEnterTimer);
      this._firstTimeModalEnterTimer = null;
    }
    if (this._firstTimeModalEnterFallbackTimer) {
      clearTimeout(this._firstTimeModalEnterFallbackTimer);
      this._firstTimeModalEnterFallbackTimer = null;
    }
    this._clearFirstTimeActionCooldown();
    this._clearXianyuWarningActionCooldown();
    this._clearNoLoadingTimer();
  },

  onShareAppMessage() {
    return shareApp.getShareAppMessage();
  },

  onShareTimeline() {
    return shareApp.getShareTimeline();
  },

  _clearXianyuWarningActionCooldown() {
    if (this._xianyuWarningActionCooldownTimer) {
      clearInterval(this._xianyuWarningActionCooldownTimer);
      this._xianyuWarningActionCooldownTimer = null;
    }
  },

  _startXianyuWarningActionCooldown() {
    const total = 5;
    this._clearXianyuWarningActionCooldown();
    this.setData({
      xianyuWarningActionReady: false,
      xianyuWarningActionCountdown: total,
      xianyuWarningProgress: 0
    });
    this._xianyuWarningActionCooldownTimer = setInterval(() => {
      const next = (this.data.xianyuWarningActionCountdown || 0) - 1;
      if (next <= 0) {
        this._clearXianyuWarningActionCooldown();
        this.setData({
          xianyuWarningActionReady: true,
          xianyuWarningActionCountdown: 0,
          xianyuWarningProgress: 100
        });
        return;
      }
      const progress = Math.round(((total - next) / total) * 100);
      this.setData({
        xianyuWarningActionCountdown: next,
        xianyuWarningProgress: progress
      });
    }, 1000);
  },

  _clearFirstTimeActionCooldown() {
    if (this._firstTimeActionCooldownTimer) {
      clearInterval(this._firstTimeActionCooldownTimer);
      this._firstTimeActionCooldownTimer = null;
    }
  },

  /** 引导弹窗区域允许系统截图（关闭其它页可能残留的防截屏黑屏） */
  _allowScreenCaptureOnIndex() {
    if (!wx.setVisualEffectOnCapture) return;
    try {
      wx.setVisualEffectOnCapture({ visualEffect: 'none' });
    } catch (e) {}
  },

  _startFirstTimeActionCooldown() {
    this._clearFirstTimeActionCooldown();
    this.setData({ firstTimeActionReady: false, firstTimeActionCountdown: 2 });
    this._firstTimeActionCooldownTimer = setInterval(() => {
      const next = (this.data.firstTimeActionCountdown || 0) - 1;
      if (next <= 0) {
        this._clearFirstTimeActionCooldown();
        this.setData({ firstTimeActionReady: true, firstTimeActionCountdown: 0 });
        return;
      }
      this.setData({ firstTimeActionCountdown: next });
    }, 1000);
  },

  // 🔴 从 valid_users 集合检查用户是否有记录
  async checkValidUserFromDatabase() {
    if (this.data.isAdmin) return;
    try {
      const reviewPassMode = await this._isReviewPassMode();
      if (reviewPassMode) {
        const cachedNick = wx.getStorageSync('user_nickname');
        if (!cachedNick) {
          wx.setStorageSync('user_nickname', '审核用户');
        }
        wx.setStorageSync('has_permanent_auth', true);
        wx.setStorageSync('has_seen_first_time_modal', true);
        this.setData({
          isAuthorized: true,
          isShowNicknameUI: false,
          showFirstTimeModal: false,
          firstTimeModalEnterReady: false,
          firstTimeModalClosing: false,
          showXianyuWarningModal: false,
          xianyuWarningModalEnterReady: false,
          xianyuWarningModalClosing: false
        });
        return;
      }

      // 1. 获取当前用户 openid
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result?.openid;
      
      if (!openid) {
        console.warn('[index] 无法获取 openid，显示抖音/闲鱼引导');
        this._clearStaleLocalAuthOnly();
        this._showUnauthorizedEntryUI();
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
          // 云端已有昵称 = 已录入，不再展示抖音/闲鱼专属引导（并关掉可能因定时器已拉起的弹窗）
          wx.setStorageSync('has_seen_first_time_modal', true);
          this._hideNicknameUIWithAnimation({
            isAuthorized: true,
            inputNickName: nickname,
            showFirstTimeModal: false,
            firstTimeModalEnterReady: false,
            firstTimeModalClosing: false,
            showXianyuWarningModal: false,
            xianyuWarningModalEnterReady: false,
            xianyuWarningModalClosing: false
          });
          this._retryPendingReferralBindIfAuthed();
          console.log('[index] 从 valid_users 自动恢复用户昵称:', nickname);
          return;
        }
      }
      
      // 没有找到记录：清掉可能残留的本地授权，先展示抖音/闲鱼加微信引导
      console.log('[index] valid_users 中未找到用户记录，先展示抖音/闲鱼引导');
      this._clearStaleLocalAuthOnly();
      this.setData({ isAuthorized: false, inputNickName: '' });
      this._showUnauthorizedEntryUI();
      
    } catch (err) {
      console.error('[index] 检查 valid_users 失败:', err);
      this._clearStaleLocalAuthOnly();
      this._showUnauthorizedEntryUI();
    }
  },

  /** 仅清理本地残留授权，不重置本会话已展示的引导状态（避免弹窗重复弹出） */
  _clearStaleLocalAuthOnly() {
    wx.removeStorageSync('has_permanent_auth');
    wx.removeStorageSync('user_nickname');
  },

  /** 未录入用户：每次冷启动重置引导；勿在引导已展示/已关闭后再调用 */
  _resetDouyinXianyuGuideState() {
    this._xianyuWarningDismissedThisSession = false;
    this._xianyuWarningShownOnce = false;
    this._firstTimeGuideDismissedThisSession = false;
    this._firstTimeModalShownOnce = false;
    wx.removeStorageSync('has_seen_first_time_modal');
  },

  _markXianyuWarningDismissed() {
    this._xianyuWarningDismissedThisSession = true;
  },

  _markDouyinXianyuGuideDismissed() {
    this._firstTimeGuideDismissedThisSession = true;
    wx.setStorageSync('has_seen_first_time_modal', true);
  },

  _xianyuWarningModalPatch(closed = true) {
    return closed ? {
      showXianyuWarningModal: false,
      xianyuWarningModalEnterReady: false,
      xianyuWarningModalClosing: false
    } : {
      showXianyuWarningModal: true,
      xianyuWarningModalEnterReady: true,
      xianyuWarningModalClosing: false
    };
  },

  /** 未授权入口：新用户先闲鱼须知，再加微信引导，否则直接昵称验证（互斥，不叠两层） */
  _showUnauthorizedEntryUI() {
    if (this.data.isAdmin || this.data.isAuthorized) return;
    if (this.data.showXianyuWarningModal || this.data.showFirstTimeModal) return;
    if (this._openXianyuWarningModalIfNeeded()) return;
    if (this._openFirstTimeModalIfNeeded()) return;
    this._showNicknameUI();
  },

  /** @returns {boolean} 是否已拉起闲鱼须知 */
  _openXianyuWarningModalIfNeeded() {
    if (this.data.isAdmin || this.data.isAuthorized) return false;
    if (this._xianyuWarningDismissedThisSession) return false;
    if (this.data.showXianyuWarningModal || this.data.xianyuWarningModalClosing) return false;
    if (wx.getStorageSync('has_permanent_auth') && wx.getStorageSync('user_nickname')) return false;
    return this._openXianyuWarningModalAnimated();
  },

  /** @returns {boolean} 是否已拉起首次引导 */
  _openFirstTimeModalIfNeeded() {
    if (this.data.isAdmin || this.data.isAuthorized) return false;
    if (this._firstTimeGuideDismissedThisSession) return false;
    if (wx.getStorageSync('has_permanent_auth') && wx.getStorageSync('user_nickname')) return false;
    return this._openFirstTimeModalAnimated();
  },

  // === 全局封号检查 ===
  checkGlobalBanStatus() {
    this._isReviewPassMode().then(reviewPassMode => {
      if (reviewPassMode) {
        console.log('[index] 审核放行模式：跳过全局封禁检查');
        return;
      }
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
    }).catch(() => {});
  },

  // === 昵称输入处理 ===
  onNickNameInput(e) {
    const val = (e.detail && e.detail.value) || '';
    const compact = val.replace(/\s/g, '').toUpperCase();
    this.setData({ inputNickName: compact.length >= 2 && /^(VK|MT)/.test(compact) ? compact : val });
  },

  onNickNameChange(e) {
    const name = e.detail.value;
    this.setData({ inputNickName: name });
  },

  onInviteCodeInput(e) {
    const val = (e.detail && e.detail.value) || '';
    const inviteCodeInputInvalid = referralPendingBind.isInviteCodeInputInvalid(val);
    this.setData({ inputInviteCode: val, inviteCodeInputInvalid });
    if (!inviteCodeInputInvalid) {
      referralPendingBind.setPendingInviteCode(val);
    }
  },

  openInviteCodeInput() {
    this.setData({ showInviteCodeInput: true });
  },

  closeInviteCodeInput() {
    this.setData({
      showInviteCodeInput: false,
      inputInviteCode: '',
      inviteCodeInputInvalid: false
    });
    referralPendingBind.clearPendingInviteCode();
  },

  _bindReferralInviteAfterAuth() {
    const raw = (this.data.inputInviteCode || referralPendingBind.getPendingInviteCode() || '').trim();
    if (!raw) return Promise.resolve();
    referralPendingBind.setPendingInviteCode(raw);
    return referralPendingBind.flushPendingReferralBind({
      onToast: (title, content) => this.showAutoToast(title, content)
    });
  },

  _retryPendingReferralBindIfAuthed() {
    const hasAuth = wx.getStorageSync('has_permanent_auth');
    if (!hasAuth) return;
    referralPendingBind.flushPendingReferralBind({ silent: true });
  },

  // === 核心验证逻辑 ===
  async handleLogin() {
    if (this.data.isLoading) return;
    const raw = this.data.inputNickName.trim();
    if (!raw) {
      this.showAutoToast('提示', '请输入访问口令');
      return;
    }
    const normalizedCode = normalizeAccessCode(raw);
    const isShareCode = /^MT[A-Z0-9]{6}$/.test(normalizedCode);
    const isAccessCode = isAccessCodeFormat(normalizedCode);
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
      this._hideNicknameUIWithAnimation({
        inputNickName: normalizedCode,
        isAuthorized: true,
        showFirstTimeModal: false,
        firstTimeModalEnterReady: false,
        firstTimeModalClosing: false,
        showXianyuWarningModal: false,
        xianyuWarningModalEnterReady: false,
        xianyuWarningModalClosing: false
      });
      setTimeout(() => {
        wx.reLaunch({ url: '/package-biz/pages/azjc/azjc' });
      }, 320);
      return;
    }
    const name = isAccessCode ? normalizedCode : raw;
    if (this.data.inviteCodeInputInvalid) {
      referralPendingBind.clearPendingInviteCode();
    } else {
      referralPendingBind.setPendingInviteCode(this.data.inputInviteCode);
    }
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
        if (!this._pageAlive) return;
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
      this._clearNoLoadingTimer();
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
          accessCode: isAccessCode ? normalizedCode : '',
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
          const storedName = result.nickname || name;
          if (wx.__mt_oldHideLoading) {
            wx.__mt_oldHideLoading();
          }
          wx.setStorageSync('has_permanent_auth', true);
          wx.setStorageSync('user_nickname', storedName);
          if (result.accessCode || isAccessCode) {
            wx.setStorageSync('user_access_code', result.accessCode || normalizedCode);
          }
          wx.setStorageSync('has_seen_first_time_modal', true);
          wx.removeStorageSync('is_user_banned');
          this._bindReferralInviteAfterAuth().finally(() => {
            const keepInvite = !!referralPendingBind.getPendingInviteCode();
            this._hideNicknameUIWithAnimation({
              isAuthorized: true,
              showFirstTimeModal: false,
              firstTimeModalEnterReady: false,
              firstTimeModalClosing: false,
              showXianyuWarningModal: false,
              xianyuWarningModalEnterReady: false,
              xianyuWarningModalClosing: false,
              showCustomSuccessModal: false,
              inputInviteCode: keepInvite ? this.data.inputInviteCode : ''
            });
          });
        } else {
          if (result.isBlocked === true || result.type === 'banned') {
            referralPendingBind.setPendingInviteCode(this.data.inputInviteCode);
            referralPendingBind.clearBoundFlagIfNeeded();
            wx.setStorageSync('is_user_banned', true);
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          } else {
            this.setData({
              showCustomErrorModal: true,
              customErrorModalClosing: false
            });
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
        this._closeWithAnimation('showCustomErrorModal', 'customErrorModalClosing');
          // 显示自定义"内容已复制"弹窗
          this.setData({
            showCopySuccessModal: true,
            copySuccessModalClosing: false
          });
          // 2秒后自动关闭
          setTimeout(() => {
            this._closeWithAnimation('showCopySuccessModal', 'copySuccessModalClosing');
          }, 2000);
        }, 800);
      }
    });
  },

  // 【新增】关闭弹窗
  closeCustomErrorModal() {
    this._closeWithAnimation('showCustomErrorModal', 'customErrorModalClosing');
  },

  // 自定义提示弹窗：点击任意位置立即关闭
  dismissTransientModals() {
    this._closeWithAnimation('showCustomErrorModal', 'customErrorModalClosing');
    this._closeWithAnimation('showCustomSuccessModal', 'customSuccessModalClosing');
    this._closeWithAnimation('showConfirmModal', 'confirmModalClosing', {
      confirmModalContent: '',
      _pendingUnbanData: null
    });
    this._closeWithAnimation('showCopySuccessModal', 'copySuccessModalClosing');
    this._closeWithAnimation('showAuthModal', 'authModalClosing');
    this._closeWithAnimation('showAuthForceModal', 'authForceModalClosing');
    this._closeWithAnimation('showLocationPermissionModal', 'locationPermissionModalClosing');
    if (this.data.showFirstTimeModal) {
      this._clearFirstTimeActionCooldown();
      this._markDouyinXianyuGuideDismissed();
      this.setData({
        firstTimeModalEnterReady: false,
        firstTimeModalClosing: false,
        showFirstTimeModal: false,
        ...this._xianyuWarningModalPatch(true),
        isShowNicknameUI: !this.data.isAuthorized,
        nicknameUiClosing: false
      });
    } else if (this.data.showXianyuWarningModal) {
      this._clearXianyuWarningActionCooldown();
      this._markXianyuWarningDismissed();
      this.setData({
        ...this._xianyuWarningModalPatch(true),
        isShowNicknameUI: !this.data.isAuthorized,
        nicknameUiClosing: false
      });
    }
    if (this.data.dialog && this.data.dialog.show) {
      this.closeCustomDialog();
    }
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
      wx.reLaunch({ url: '/package-biz/pages/azjc/azjc' });
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
            authForceModalClosing: false,
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
              authForceModalClosing: false,
              authMissingType: 'location',
            });
            return;
          }
          this.runAnimation();
          this.showAutoToast('提示', '无法获取当前位置，将使用默认设置');
          this.setData({
            pendingJumpTarget: '/package-app/pages/products/products',
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
    this._preloadNewArrivalCacheForProducts();
    // 强震动配合巨幕展开，极具冲击力
    wx.vibrateShort({ type: 'heavy' });
    
    this.setData({ step: 1 }); // 触发纯白巨幕
    
    const t1 = setTimeout(() => {
      this.setData({ step: 3 }); // 显示深色文字
      
      const t2 = setTimeout(() => {
        this.doFallAndSwitch(); // 结束跳转
      }, 1600); // 稍微多留一点时间欣赏文字
      this.addAnimationTimer(t2);
    }, 600); // 延迟出字，配合变慢的巨幕
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
      this._relaunchToProductsAfterIntro();
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
          this._relaunchToProductsAfterIntro();
        }
        return;
      }
      console.log('[index] 目标已就绪，立即跳转:', target);
      if (this.data.pendingJumpData && this.data.pendingJumpData.collectionName) {
        this._syncPendingDataInBackground();
      }
      this._stopWaitingForPendingJump();
      if (String(target).indexOf('/products/products') !== -1) {
        this._relaunchToProductsAfterIntro();
      } else {
        wx.reLaunch({ url: target });
      }
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
          pendingJumpTarget: '/package-app/pages/products/products',
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
        pendingJumpTarget: '/package-app/pages/products/products',
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
          pendingJumpTarget: '/package-app/pages/products/products',
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
          pendingJumpTarget: '/package-app/pages/products/products',
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
          pendingJumpTarget: '/package-app/pages/products/products',
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

        // 查询 login_logbutton / valid_users 检查地域放行
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
          if (!hasGoldMedal) {
            const validRes = await db.collection('valid_users').where({ _openid: openid }).limit(1).get();
            if (validRes.data && validRes.data.length > 0) {
              hasGoldMedal = validRes.data[0].bypassLocationCheck === true;
              console.log('[index] valid_users 地域放行:', hasGoldMedal);
            }
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
            pendingJumpTarget: '/package-app/pages/products/products',
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
        pendingJumpTarget: '/package-app/pages/products/products',
        pendingJumpData: { collectionName: 'user_list', locData: locData }
      });

    } catch (err) {
      console.error('[index] 地址检查异常:', err);
      console.error('[index] 错误详情:', err.message, err.stack);
      this.setData({
        pendingJumpTarget: '/package-app/pages/products/products',
        pendingJumpData: { collectionName: 'user_list', locData: locData }
      });
    }
  },

  /** 跳转 products 前预拉新品数据，缩短 products 页弹窗等待 */
  _preloadNewArrivalCacheForProducts() {
    try {
      if (!wx.cloud) return;
      const app = getApp();
      if (!app.globalData) return;
      if (!app.globalData.newArrivalCache) {
        app.globalData.newArrivalCache = { list: null, cacheTime: 0 };
      }
      const cache = app.globalData.newArrivalCache;
      const now = Date.now();
      if (cache.list && cache.list.length && now - cache.cacheTime < 5 * 60 * 1000) return;
      if (app._newArrivalPreloadInflight) return;
      app._newArrivalPreloadInflight = true;
      db.collection('products').get().then((res) => {
        const list = (res.data || []).map((item) => ({
          ...item,
          jumpNumber: item.jumpNumber || null
        }));
        if (list.length) {
          app.globalData.newArrivalCache = { list, cacheTime: Date.now() };
        }
      }).catch(() => {}).finally(() => {
        app._newArrivalPreloadInflight = false;
      });
    } catch (e) {}
  },

  /** index 入场动画结束后进入 products：写入一次性标记，供 products 页弹「产品上新」 */
  _relaunchToProductsAfterIntro() {
    this._preloadNewArrivalCacheForProducts();
    try {
      wx.setStorageSync('__products_new_arrival_from_index__', Date.now());
    } catch (e) {}
    wx.reLaunch({ url: '/package-app/pages/products/products' });
  },

  // 🔴 执行待跳转（动画完成后调用）
  _executePendingJump() {
    const targetPage = this.data.pendingJumpTarget || '/package-app/pages/products/products';
    this._syncPendingDataInBackground();
    if (String(targetPage).indexOf('/products/products') !== -1) {
      this._preloadNewArrivalCacheForProducts();
      try {
        wx.setStorageSync('__products_new_arrival_from_index__', Date.now());
      } catch (e) {}
    }
    wx.reLaunch({ url: targetPage });
  },

  appendDataAndJump(collectionName, locData, targetPage) {
    this.setData({
      pendingJumpData: { collectionName, locData },
      pendingJumpTarget: targetPage || '/package-app/pages/products/products'
    });
    this._executePendingJump();
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

  toggleAdminCardExpand(e) {
    const rowKey = e.currentTarget.dataset.rowKey;
    if (!rowKey) return;
    const expanded = { ...(this.data.adminExpandedCardKeys || {}) };
    if (expanded[rowKey]) {
      delete expanded[rowKey];
    } else {
      expanded[rowKey] = true;
    }
    this.setData({ adminExpandedCardKeys: expanded });
  },

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
        customSuccessModalClosing: false,
        successModalTitle: '定位已开启',
        successModalContent: ''
      });
      setTimeout(() => {
        this._closeWithAnimation('showCustomSuccessModal', 'customSuccessModalClosing');
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
  hideLocationPermissionModal() {
    this._closeWithAnimation('showLocationPermissionModal', 'locationPermissionModalClosing');
  },
  openLocationSetting() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting && res.authSetting['scope.userLocation']) {
          this._closeWithAnimation('showLocationPermissionModal', 'locationPermissionModalClosing');
          this.handleAccess();
        }
      }
    });
  },
  retryBluetooth() {
    this._closeWithAnimation('showAuthForceModal', 'authForceModalClosing');
  },
  onOpenSetting(e) {
     if (e.detail.authSetting && e.detail.authSetting['scope.userLocation']) {
      this._closeWithAnimation('showAuthModal', 'authModalClosing');
      // 显示自定义成功弹窗
      this._closeAllPopups();
      this.setData({
        showCustomSuccessModal: true,
        customSuccessModalClosing: false,
        successModalTitle: '授权成功',
        successModalContent: ''
      });
      setTimeout(() => {
        this._closeWithAnimation('showCustomSuccessModal', 'customSuccessModalClosing');
        // 🔴 关键修复：用户开启权限后，自动重新尝试获取位置
        console.log('[onOpenSetting] 用户已开启定位权限，重新获取位置');
        this.handleAccess();
      }, 1500);
    } else {
      // 显示自定义错误弹窗
      this.setData({ 
        showCustomErrorModal: true,
        customErrorModalClosing: false
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
    return this._checkAdminPrivilegeAsync();
  },

  async _checkAdminPrivilegeAsync() {
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
        return true;
      }
      this.setData({ isAdmin: false });
      console.log('[index] 未在管理员白名单中');
      return false;
    } catch (err) {
      console.error('[index] 权限检查失败', err);
      this.setData({ isAdmin: false });
      return false;
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
      this.setData({ adminViewMode: 'banned', manualBannedMode: false, suspiciousManualBannedMode: false });
      this.loadBannedUsers();
      this.loadScreenshotRiskUsers();
      this.loadSuspiciousUsers();
    }
    
    // 如果退出管理员模式，重置 step
    if (!newMode) {
      this.setData({
        step: 0,
        adminViewMode: 'banned',
        manualBannedMode: false,
        suspiciousManualBannedMode: false,
        bannedUsers: [],
        screenshotRiskUsers: [],
        suspiciousUsers: [],
        suspiciousDisplayList: [],
        suspiciousSearchMatchCount: 0,
        adminSuspiciousSearch: '',
        adminSuspiciousSearchTrim: ''
      });
    }
  },

  // 退出管理员模式
  exitAdminMode() {
    this.setData({
      isAdminMode: false,
      step: 0,
      adminViewMode: 'banned',
      manualBannedMode: false,
      suspiciousManualBannedMode: false,
      bannedUsers: [],
      screenshotRiskUsers: [],
      suspiciousUsers: [],
      suspiciousDisplayList: [],
      suspiciousSearchMatchCount: 0,
      adminSuspiciousSearch: '',
      adminSuspiciousSearchTrim: '',
      ignoredUsers: [],
      ignoredDisplayList: [],
      ignoredSearchMatchCount: 0,
      adminIgnoredSearch: '',
      adminIgnoredSearchTrim: '',
      adminExpandedCardKeys: {}
    });
    console.log('[index] 已退出管理员模式');
  },

  _parseSuspiciousSearchTokens(keyword) {
    return String(keyword || '')
      .trim()
      .toLowerCase()
      .split(/[\s,，;；、]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  },

  _formatStayDuration(minutesInput) {
    const minutes = Number(minutesInput);
    if (!Number.isFinite(minutes) || minutes <= 0) return '不足 1 分钟';
    const totalMin = Math.round(minutes * 100) / 100;
    if (totalMin < 1) return '不足 1 分钟';
    if (totalMin < 60) {
      const m = totalMin >= 10 ? Math.round(totalMin) : Math.round(totalMin * 10) / 10;
      return `${m} 分钟`;
    }
    const hours = Math.floor(totalMin / 60);
    const mins = Math.round(totalMin % 60);
    if (hours < 24) {
      if (mins > 0) return `${hours} 小时 ${mins} 分钟`;
      return `${hours} 小时`;
    }
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    let text = `${days} 天`;
    if (remainHours > 0) text += ` ${remainHours} 小时`;
    if (mins > 0) text += ` ${mins} 分钟`;
    return text;
  },

  _calcAdminSuspicionScore(item) {
    if (!item) return 0;
    const enterCount = Number(item.enterCount || 0);
    const pageVisits = Number(
      item.sectionClicksTotal != null ? item.sectionClicksTotal : (item.pageVisitsCount || 0)
    );
    const stayMinutes = Number(item.totalStayMinutesText || item.totalStayMinutes || 0);
    const dailyCount = Number(item.dailyCount || 0);
    const hourlyCount = Number(item.hourlyCount || 0);
    if (dailyCount || hourlyCount) {
      return hourlyCount * 10000 + dailyCount * 1000 + pageVisits;
    }
    return enterCount * 1000 + pageVisits * 100 + stayMinutes;
  },

  _compareAdminSuspicion(a, b) {
    const scoreDiff = this._calcAdminSuspicionScore(b) - this._calcAdminSuspicionScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.lastViewTs || b.ignoredAtTs || 0) - (a.lastViewTs || a.ignoredAtTs || 0);
  },

  _sortAdminUsersBySuspicion(list) {
    return (Array.isArray(list) ? list : []).slice().sort((a, b) => this._compareAdminSuspicion(a, b));
  },

  _decorateAdminUserCard(item) {
    if (!item) return item;
    const enterCount = Number(item.enterCount || 0);
    const pageVisits = Number(
      item.sectionClicksTotal != null ? item.sectionClicksTotal : (item.pageVisitsCount || 0)
    );
    const stayMinutes = Number(item.totalStayMinutesText || item.totalStayMinutes || 0);
    const stayDurationText = this._formatStayDuration(stayMinutes);
    return {
      ...item,
      enterCount,
      sectionClicksTotal: pageVisits,
      stayDurationText,
      enterSummaryText: `进入 ${enterCount} 次（会话）`,
      pageVisitSummaryText: `页面访问 ${pageVisits} 次`,
      staySummaryText: `停留 ${stayDurationText}`
    };
  },

  _mapAdminDisplayList(list) {
    return (Array.isArray(list) ? list : []).map((item) => this._decorateAdminUserCard(item));
  },

  copyAdminNickname(e) {
    const text = String((e.currentTarget.dataset.text || '')).trim();
    if (!text) return;
    const hideOfficialToast = () => {
      try {
        if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
        if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
      } catch (err) {}
    };
    hideOfficialToast();
    wx.setClipboardData({
      data: text,
      success: () => {
        hideOfficialToast();
        this.setData({
          showCopySuccessModal: true,
          copySuccessModalClosing: false
        });
        setTimeout(() => {
          this._closeWithAnimation('showCopySuccessModal', 'copySuccessModalClosing');
        }, 2000);
      },
      fail: () => {
        this.showAutoToast('提示', '复制失败，请重试');
      }
    });
  },

  _suspiciousUserHaystack(item) {
    if (!item) return '';
    const pageDetail = (item.pageVisitsDetailList || [])
      .map((p) => `${p.pageName || ''} ${p.pageKey || ''} ${p.count || 0}`)
      .join(' ');
    return [
      item.viewerNickname,
      item.viewerOpenid,
      item.nickname,
      item.creatorNickname,
      item.shareCode,
      item.triggerReasonText,
      item.regionText,
      item.province,
      item.city,
      item.district,
      item.address,
      item.addressDisplay,
      item.geoText,
      item.lastViewTime,
      item.enterCount != null ? `${item.enterCount}次` : '',
      item.sectionClicksTotal != null ? `${item.sectionClicksTotal}次` : '',
      item.totalStayMinutesText != null ? `${item.totalStayMinutesText}分` : '',
      item.stayDurationText,
      item.enterSummaryText,
      item.pageVisitSummaryText,
      item.staySummaryText,
      pageDetail
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  },

  _itemMatchesSuspiciousSearchTokens(item, tokens) {
    if (!tokens || !tokens.length) return true;
    const haystack = this._suspiciousUserHaystack(item);
    return tokens.every((token) => haystack.indexOf(token) !== -1);
  },

  _filterSuspiciousUsers(users, keyword) {
    const list = Array.isArray(users) ? users : [];
    const tokens = this._parseSuspiciousSearchTokens(keyword);
    if (!tokens.length) return list;
    return list.filter((item) => this._itemMatchesSuspiciousSearchTokens(item, tokens));
  },

  _syncSuspiciousDisplayList() {
    const users = this._mapAdminDisplayList(this.data.suspiciousUsers);
    const kw = String(this.data.adminSuspiciousSearch || '').trim();
    const tokens = this._parseSuspiciousSearchTokens(kw);
    let displayList;
    let matchCount;
    if (!tokens.length) {
      displayList = this._sortAdminUsersBySuspicion(users);
      matchCount = users.length;
    } else {
      const matched = this._filterSuspiciousUsers(users, kw);
      const matchKeys = new Set(matched.map((u) => u.rowKey).filter(Boolean));
      displayList = users
        .map((u) => ({ ...u, _searchMatch: matchKeys.has(u.rowKey) }))
        .sort((a, b) => {
          const matchDiff = Number(b._searchMatch) - Number(a._searchMatch);
          return matchDiff !== 0 ? matchDiff : this._compareAdminSuspicion(a, b);
        });
      matchCount = matched.length;
    }
    this.setData({
      suspiciousDisplayList: displayList,
      suspiciousSearchMatchCount: matchCount,
      adminSuspiciousSearchTrim: kw
    });
  },

  _applySuspiciousUsersList(users) {
    const list = this._sortAdminUsersBySuspicion(Array.isArray(users) ? users : []);
    this.setData({ suspiciousUsers: list }, () => this._syncSuspiciousDisplayList());
  },

  _ignoredUserHaystack(item) {
    if (!item) return '';
    const base = this._suspiciousUserHaystack(item);
    return [
      base,
      item.sourceTypeLabel,
      item.fromSourceType,
      item.ignoredAt,
      item.viewerOpenid
    ].filter(Boolean).join(' ').toLowerCase();
  },

  _itemMatchesIgnoredSearchTokens(item, tokens) {
    if (!tokens || !tokens.length) return true;
    const haystack = this._ignoredUserHaystack(item);
    return tokens.every((token) => haystack.indexOf(token) !== -1);
  },

  _syncIgnoredDisplayList() {
    const users = this._mapAdminDisplayList(this.data.ignoredUsers);
    const kw = String(this.data.adminIgnoredSearch || '').trim();
    const tokens = this._parseSuspiciousSearchTokens(kw);
    let displayList;
    let matchCount;
    if (!tokens.length) {
      displayList = this._sortAdminUsersBySuspicion(users);
      matchCount = users.length;
    } else {
      const matched = users.filter((item) => this._itemMatchesIgnoredSearchTokens(item, tokens));
      const matchKeys = new Set(matched.map((u) => u.rowKey).filter(Boolean));
      displayList = users
        .map((u) => ({ ...u, _searchMatch: matchKeys.has(u.rowKey) }))
        .sort((a, b) => {
          const matchDiff = Number(b._searchMatch) - Number(a._searchMatch);
          return matchDiff !== 0 ? matchDiff : this._compareAdminSuspicion(a, b);
        });
      matchCount = matched.length;
    }
    this.setData({
      ignoredDisplayList: displayList,
      ignoredSearchMatchCount: matchCount,
      adminIgnoredSearchTrim: kw
    });
  },

  _applyIgnoredUsersList(users, options = {}) {
    const list = Array.isArray(users) ? users : [];
    const silent = !!(options && options.silent);
    const localList = this.data.ignoredUsers || [];
    if (!list.length && silent && localList.length) {
      return;
    }
    this.setData({ ignoredUsers: this._sortAdminUsersBySuspicion(list) }, () => this._syncIgnoredDisplayList());
  },

  _mergeIgnoredUsersFromServer(serverUsers, options = {}) {
    const serverList = Array.isArray(serverUsers) ? serverUsers : [];
    const localList = this.data.ignoredUsers || [];
    if (!serverList.length) {
      if (localList.length) return;
      this._applyIgnoredUsersList([]);
      return;
    }
    const serverKeys = new Set(
      serverList.map((u) => u && (u.rowKey || u.viewerOpenid)).filter(Boolean)
    );
    const localOnly = localList.filter((u) => {
      if (!u) return false;
      const key = u.rowKey || u.viewerOpenid;
      return key && !serverKeys.has(key) && !serverKeys.has(u.viewerOpenid);
    });
    const merged = serverList.concat(localOnly);
    this._applyIgnoredUsersList(merged);
  },

  onAdminIgnoredSearchInput(e) {
    const keyword = (e.detail && e.detail.value) || '';
    this.setData({ adminIgnoredSearch: keyword }, () => this._syncIgnoredDisplayList());
  },

  onAdminIgnoredSearchClear() {
    this.setData({ adminIgnoredSearch: '' }, () => this._syncIgnoredDisplayList());
  },

  async loadIgnoredUsers(options = {}) {
    const silent = !!options.silent;
    if (!silent) {
      this.setData({ isLoadingIgnoredUsers: true });
    }
    try {
      let res = null;
      try {
        res = await wx.cloud.callFunction({
          name: 'getSuspiciousUsers',
          data: { scope: 'ignored_only' }
        });
      } catch (primaryErr) {
        console.warn('[index] getSuspiciousUsers ignored_only 失败，尝试 getIgnoredUsers:', primaryErr);
      }
      if (!res || !res.result || !res.result.success) {
        res = await wx.cloud.callFunction({ name: 'getIgnoredUsers' });
      }
      if (res.result && res.result.success) {
        this._mergeIgnoredUsersFromServer(res.result.users || [], { silent });
      } else {
        console.error('[index] 加载无视人员列表失败:', res.result?.error);
        if (!silent) {
          this.showAutoToast('提示', res.result?.error || '加载无视人员失败');
          this._applyIgnoredUsersList([]);
        }
      }
    } catch (err) {
      console.error('[index] 加载无视人员列表异常:', err);
      if (!silent) {
        this.showAutoToast('提示', '加载无视人员失败，请重新部署 getSuspiciousUsers');
        this._applyIgnoredUsersList([]);
      }
    } finally {
      if (!silent) {
        this.setData({ isLoadingIgnoredUsers: false });
      }
    }
  },

  _bannedIgnoredUserHaystack(item) {
    if (!item) return '';
    return [
      item.viewerNickname,
      item.viewerOpenid,
      item.banReasonText,
      item.banPageText,
      item.triggerReasonText,
      item.sourceTypeLabel,
      item.regionText,
      item.province,
      item.city,
      item.district,
      item.address,
      item.addressDisplay,
      item.geoText,
      item.phoneModel,
      item.ignoredAt,
      item.bannedAt,
      item.totalVisits != null ? `${item.totalVisits}次` : '',
      item.failCount != null ? `${item.failCount}次` : ''
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  },

  _itemMatchesBannedIgnoredSearchTokens(item, tokens) {
    if (!tokens || !tokens.length) return true;
    const haystack = this._bannedIgnoredUserHaystack(item);
    return tokens.every((token) => haystack.indexOf(token) !== -1);
  },

  _syncBannedIgnoredDisplayList() {
    const users = Array.isArray(this.data.bannedIgnoredUsers) ? this.data.bannedIgnoredUsers : [];
    const kw = String(this.data.adminBannedIgnoredSearch || '').trim();
    const tokens = this._parseSuspiciousSearchTokens(kw);
    let displayList;
    let matchCount;
    if (!tokens.length) {
      displayList = users.slice().sort((a, b) => (b.ignoredAtTs || 0) - (a.ignoredAtTs || 0));
      matchCount = users.length;
    } else {
      const matched = users.filter((item) => this._itemMatchesBannedIgnoredSearchTokens(item, tokens));
      const matchKeys = new Set(matched.map((u) => u.rowKey).filter(Boolean));
      displayList = users
        .map((u) => ({ ...u, _searchMatch: matchKeys.has(u.rowKey) }))
        .sort((a, b) => {
          const matchDiff = Number(b._searchMatch) - Number(a._searchMatch);
          return matchDiff !== 0 ? matchDiff : (b.ignoredAtTs || 0) - (a.ignoredAtTs || 0);
        });
      matchCount = matched.length;
    }
    this.setData({
      bannedIgnoredDisplayList: displayList,
      bannedIgnoredSearchMatchCount: matchCount,
      adminBannedIgnoredSearchTrim: kw
    });
  },

  _applyBannedIgnoredUsersList(users, options = {}) {
    const list = Array.isArray(users) ? users : [];
    const silent = !!(options && options.silent);
    const localList = this.data.bannedIgnoredUsers || [];
    if (!list.length && silent && localList.length) {
      return;
    }
    this.setData({ bannedIgnoredUsers: list }, () => this._syncBannedIgnoredDisplayList());
  },

  _mergeBannedIgnoredUsersFromServer(serverUsers, options = {}) {
    const serverList = Array.isArray(serverUsers) ? serverUsers : [];
    const localList = this.data.bannedIgnoredUsers || [];
    if (!serverList.length) {
      if (localList.length) return;
      this._applyBannedIgnoredUsersList([]);
      return;
    }
    const serverKeys = new Set(
      serverList.map((u) => u && (u.rowKey || u.viewerOpenid || u.buttonId)).filter(Boolean)
    );
    const localOnly = localList.filter((u) => {
      if (!u) return false;
      const key = u.rowKey || u.viewerOpenid || u.buttonId;
      return key && !serverKeys.has(key);
    });
    this._applyBannedIgnoredUsersList(serverList.concat(localOnly));
  },

  onAdminBannedIgnoredSearchInput(e) {
    const keyword = (e.detail && e.detail.value) || '';
    this.setData({ adminBannedIgnoredSearch: keyword }, () => this._syncBannedIgnoredDisplayList());
  },

  onAdminBannedIgnoredSearchClear() {
    this.setData({ adminBannedIgnoredSearch: '' }, () => this._syncBannedIgnoredDisplayList());
  },

  async loadBannedIgnoredUsers(options = {}) {
    const silent = !!options.silent;
    if (!silent) {
      this.setData({ isLoadingBannedIgnoredUsers: true });
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'getIgnoredUsers',
        data: { scope: 'banned_ignored_only' }
      });
      if (res.result && res.result.success) {
        this._mergeBannedIgnoredUsersFromServer(res.result.users || [], { silent });
      } else {
        console.error('[index] 加载封禁无视人员列表失败:', res.result?.error);
        if (!silent) {
          this.showAutoToast('提示', res.result?.error || '加载无视人员失败');
          this._applyBannedIgnoredUsersList([]);
        }
      }
    } catch (err) {
      console.error('[index] 加载封禁无视人员列表异常:', err);
      if (!silent) {
        this.showAutoToast('提示', '加载无视人员失败，请重新部署云函数');
        this._applyBannedIgnoredUsersList([]);
      }
    } finally {
      if (!silent) {
        this.setData({ isLoadingBannedIgnoredUsers: false });
      }
    }
  },

  _prependBannedIgnoredUserFromCard(card) {
    if (!card) return;
    const record = {
      rowKey: `bign_local_${card._id || card.buttonId || card._openid}`,
      buttonId: card._id || card.buttonId || '',
      viewerOpenid: card._openid || card.viewerOpenid || '',
      viewerNickname: card.nickname || card.viewerNickname || '该用户',
      banReason: card.banReason || '',
      banPage: card.banPage || '',
      banReasonText: card.banReasonText || '',
      banPageText: card.banPageText || '',
      triggerReasonText: card.banReasonText ? `${card.banReasonText}（已无视）` : '封禁（已无视）',
      ignoredAt: this._formatIgnoredAtNow(),
      ignoredAtTs: Date.now(),
      bannedAt: card.updateTime || '',
      regionText: [card.province, card.city, card.district].filter(Boolean).join(' ') || '-',
      province: card.province || '',
      city: card.city || '',
      district: card.district || '',
      address: card.address || '',
      addressDisplay: card.address || '-',
      latitude: card.latitude,
      longitude: card.longitude,
      geoText: card.latitude && card.longitude ? `${card.latitude}, ${card.longitude}` : '-',
      totalVisits: Number(card.totalVisits || 0),
      failCount: Number(card.failCount || 0),
      phoneModel: card.phoneModel || '',
      sourceTypeLabel: '封禁列表'
    };
    const list = (this.data.bannedIgnoredUsers || []).filter((item) => {
      if (!item) return false;
      if (record.buttonId && item.buttonId === record.buttonId) return false;
      if (record.viewerOpenid && item.viewerOpenid === record.viewerOpenid) return false;
      return true;
    });
    this._applyBannedIgnoredUsersList([record].concat(list));
  },

  _removeBannedIgnoredUserCard({ rowKey, viewerOpenid, buttonId } = {}) {
    const list = (this.data.bannedIgnoredUsers || []).filter((item) => {
      if (!item) return false;
      if (rowKey && item.rowKey === rowKey) return false;
      if (buttonId && item.buttonId === buttonId) return false;
      if (viewerOpenid && item.viewerOpenid === viewerOpenid) return false;
      return true;
    });
    this._applyBannedIgnoredUsersList(list);
  },

  async handleBannedDecision(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const buttonId = dataset.buttonId || '';
    const userIndex = dataset.index;
    const nickname = dataset.nickname || '该用户';
    if (!buttonId) return;

    const sourceCard = Number.isFinite(Number(userIndex))
      ? (this.data.bannedUsers || [])[Number(userIndex)]
      : (this.data.bannedUsers || []).find((item) => item && item._id === buttonId);

    this.showMyDialog({
      title: '确认操作',
      content: `确定要无视「${nickname}」吗？用户将被放行并留档到无视人员追溯。`,
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          this.showMyLoading('处理中...');
          const result = await wx.cloud.callFunction({
            name: 'handleBannedUserDecision',
            data: {
              action: 'ignore',
              buttonId,
              snapshot: sourceCard ? {
                nickname: sourceCard.nickname,
                banReason: sourceCard.banReason,
                banPage: sourceCard.banPage,
                banReasonText: sourceCard.banReasonText,
                banPageText: sourceCard.banPageText,
                triggerReasonText: sourceCard.banReasonText ? `${sourceCard.banReasonText}（已无视）` : '',
                totalVisits: sourceCard.totalVisits,
                failCount: sourceCard.failCount,
                phoneModel: sourceCard.phoneModel,
                province: sourceCard.province,
                city: sourceCard.city,
                district: sourceCard.district,
                address: sourceCard.address,
                latitude: sourceCard.latitude,
                longitude: sourceCard.longitude,
                bannedAt: sourceCard.updateTime
              } : {}
            }
          });
          this.hideMyLoading();
          if (result.result && result.result.success) {
            if (result.result.archiveOk === false) {
              const detail = result.result.archiveError || '留档写入失败';
              this.showAutoToast('提示', `已无视，但留档失败：${detail}`);
            } else {
              this.showAutoToast('成功', '已无视');
            }
            if (sourceCard) {
              this._prependBannedIgnoredUserFromCard(sourceCard);
            }
            const bannedUsers = (this.data.bannedUsers || []).filter((item) => item && item._id !== buttonId);
            this.setData({ bannedUsers });
            this.loadBannedIgnoredUsers({ silent: true });
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

  handleBannedIgnoredUserUnban(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const itemRowKey = dataset.itemRowKey || '';
    const card = itemRowKey
      ? (this.data.bannedIgnoredUsers || []).find((item) => item && item.rowKey === itemRowKey)
      : null;
    if (!card || !card.buttonId) return;
    const nickname = card.viewerNickname || '该用户';
    this.setData({
      showConfirmModal: true,
      confirmModalClosing: false,
      confirmModalContent: `确定要解除对「${nickname}」的封禁吗？`,
      _pendingUnbanData: {
        buttonId: card.buttonId,
        banReason: card.banReason,
        openid: card.viewerOpenid,
        nickname,
        fromBannedIgnored: true,
        itemRowKey
      }
    });
  },

  _formatIgnoredAtNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  _prependIgnoredUserFromCard(card) {
    if (!card) return;
    const record = this._decorateAdminUserCard({
      ...card,
      rowKey: card.archiveId ? `ign_${card.archiveId}` : `ign_${card.rowKey || card.viewerOpenid || Date.now()}`,
      ignoredAt: this._formatIgnoredAtNow(),
      ignoredAtTs: Date.now(),
      sourceTypeLabel: card.sourceTypeLabel || (card.sourceType === 'screenshot' ? '截图风险' : '会话可疑'),
      fromSourceType: card.sourceType || card.fromSourceType || 'session',
      shareCode: card.shareCode || '小程序访问'
    });
    const list = (this.data.ignoredUsers || []).filter(
      (item) => item && item.rowKey !== record.rowKey && item.viewerOpenid !== record.viewerOpenid
    );
    this._applyIgnoredUsersList([record].concat(list));
  },

  _removeIgnoredUserCard({ rowKey, viewerOpenid, riskId } = {}) {
    const list = (this.data.ignoredUsers || []).filter((item) => {
      if (!item) return false;
      if (rowKey && item.rowKey === rowKey) return false;
      if (riskId && item.riskId === riskId) return false;
      if (viewerOpenid && item.viewerOpenid === viewerOpenid) return false;
      return true;
    });
    this._applyIgnoredUsersList(list);
  },

  _removeSuspiciousCard({ rowKey, viewerOpenid, riskId, sourceType } = {}) {
    const list = (this.data.suspiciousUsers || []).filter((item) => {
      if (!item) return false;
      if (rowKey && item.rowKey === rowKey) return false;
      if (riskId && item.riskId === riskId) return false;
      if (
        viewerOpenid &&
        item.viewerOpenid === viewerOpenid &&
        (!sourceType || !item.sourceType || item.sourceType === sourceType || item.sourceType === 'session')
      ) {
        return false;
      }
      return true;
    });
    this._applySuspiciousUsersList(list);
  },

  onAdminSuspiciousSearchInput(e) {
    const keyword = (e.detail && e.detail.value) || '';
    this.setData({ adminSuspiciousSearch: keyword }, () => this._syncSuspiciousDisplayList());
  },

  onAdminSuspiciousSearchClear() {
    this.setData({ adminSuspiciousSearch: '' }, () => this._syncSuspiciousDisplayList());
  },

  switchAdminTab(e) {
    const mode = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'banned';
    if (!mode || mode === this.data.adminViewMode) return;
    const patch = { adminViewMode: mode };
    if (mode === 'banned') {
      patch.manualBannedMode = false;
      patch.suspiciousManualBannedMode = false;
    }
    if (mode !== 'suspicious') {
      patch.adminSuspiciousSearch = '';
      patch.adminSuspiciousSearchTrim = '';
    }
    if (mode !== 'suspiciousIgnored') {
      patch.adminIgnoredSearch = '';
      patch.adminIgnoredSearchTrim = '';
    }
    if (mode !== 'bannedIgnored') {
      patch.adminBannedIgnoredSearch = '';
      patch.adminBannedIgnoredSearchTrim = '';
    }
    if (mode === 'suspicious') {
      patch.adminViewMode = 'suspicious';
      patch.suspiciousManualBannedMode = false;
    }
    this.setData(patch, () => {
      if (mode === 'suspicious') {
        this._syncSuspiciousDisplayList();
      }
      if (mode === 'suspiciousIgnored') {
        this._syncIgnoredDisplayList();
      }
      if (mode === 'bannedIgnored') {
        this._syncBannedIgnoredDisplayList();
      }
    });
    if (mode === 'banned' && this.data.bannedUsers.length === 0) {
      this.loadBannedUsers();
      this.loadScreenshotRiskUsers();
    } else if (mode === 'bannedIgnored' && this.data.bannedIgnoredUsers.length === 0) {
      this.loadBannedIgnoredUsers();
    } else if (mode === 'suspicious' && this.data.suspiciousUsers.length === 0) {
      this.loadSuspiciousUsers();
    } else if (mode === 'suspiciousIgnored' && this.data.ignoredUsers.length === 0) {
      this.loadIgnoredUsers();
    } else if (mode === 'nickname') {
      this.loadAccessCodeList();
      this.loadBlockedRegionsAdmin();
    }
    this._startSuspiciousAutoRefresh();
  },

  goToBannedIgnoredUsersFromHeader() {
    if (this.data.adminViewMode === 'bannedIgnored') return;
    this.setData({
      adminViewMode: 'bannedIgnored',
      manualBannedMode: false,
      suspiciousManualBannedMode: false
    });
    this.loadBannedIgnoredUsers();
    this._stopSuspiciousAutoRefresh();
  },

  goBackToBannedFromHeader() {
    if (this.data.adminViewMode === 'banned') return;
    this.setData({
      adminViewMode: 'banned',
      manualBannedMode: false,
      suspiciousManualBannedMode: false
    });
    if (!this.data.bannedUsers.length) {
      this.loadBannedUsers();
      this.loadScreenshotRiskUsers();
    }
  },

  goToIgnoredUsersFromHeader() {
    if (this.data.adminViewMode === 'suspiciousIgnored') return;
    this.setData({
      adminViewMode: 'suspiciousIgnored',
      manualBannedMode: false,
      suspiciousManualBannedMode: false
    });
    this.loadIgnoredUsers();
    this._stopSuspiciousAutoRefresh();
  },

  goBackToSuspiciousFromHeader() {
    if (this.data.adminViewMode === 'suspicious') return;
    this.setData({
      adminViewMode: 'suspicious',
      manualBannedMode: false,
      suspiciousManualBannedMode: false
    });
    if (!this.data.suspiciousUsers.length) {
      this.loadSuspiciousUsers();
    }
    this._startSuspiciousAutoRefresh();
  },

  goToBannedUsersFromHeader() {
    if (this.data.adminViewMode === 'suspiciousBanned') return;
    this.setData({
      adminViewMode: 'suspiciousBanned',
      manualBannedMode: false,
      suspiciousManualBannedMode: true
    });
    this.loadBannedUsers({ suspiciousManualOnly: true });
    this._stopSuspiciousAutoRefresh();
  },

  _suspiciousAutoRefreshTimer: null,

  _startSuspiciousAutoRefresh() {
    this._stopSuspiciousAutoRefresh();
    if (!this.data.isAdminMode || this.data.adminViewMode !== 'suspicious') return;
    this._suspiciousAutoRefreshTimer = setInterval(() => {
      if (this.data.isLoadingSuspiciousUsers) return;
      this.loadSuspiciousUsers({ silent: true });
    }, 15000);
  },

  _stopSuspiciousAutoRefresh() {
    if (this._suspiciousAutoRefreshTimer) {
      clearInterval(this._suspiciousAutoRefreshTimer);
      this._suspiciousAutoRefreshTimer = null;
    }
  },

  // 管理页列表下拉刷新
  async onAdminListRefresh() {
    if (this.data.adminListRefreshing) return;
    this.setData({ adminListRefreshing: true });
    try {
      if (this.data.adminViewMode === 'banned' || this.data.adminViewMode === 'suspiciousBanned') {
        if (this.data.suspiciousManualBannedMode) {
          await this.loadBannedUsers({ suspiciousManualOnly: true });
        } else {
          await Promise.all([this.loadBannedUsers(), this.loadScreenshotRiskUsers()]);
        }
      } else if (this.data.adminViewMode === 'suspicious') {
        await this.loadSuspiciousUsers();
      } else if (this.data.adminViewMode === 'suspiciousIgnored') {
        await this.loadIgnoredUsers();
      } else if (this.data.adminViewMode === 'bannedIgnored') {
        await this.loadBannedIgnoredUsers();
      }
    } catch (err) {
      console.warn('[index] 管理列表刷新失败:', err);
    } finally {
      this.setData({ adminListRefreshing: false });
    }
  },

  // 🔴 加载被封禁的用户列表
  async loadBannedUsers(options = {}) {
    const manualOnly = options.manualOnly === true ? true : !!this.data.manualBannedMode;
    const suspiciousManualOnly = options.suspiciousManualOnly === true ? true : !!this.data.suspiciousManualBannedMode;
    this.setData({ isLoadingBannedUsers: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getBannedUsers',
        data: { manualOnly, suspiciousManualOnly }
      });
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

  _isSameSuspiciousUsers(oldList = [], newList = []) {
    if (oldList.length !== newList.length) return false;
    for (let i = 0; i < oldList.length; i += 1) {
      const a = oldList[i] || {};
      const b = newList[i] || {};
      if ((a.rowKey || '') !== (b.rowKey || '')) return false;
      if ((a.lastViewTime || '') !== (b.lastViewTime || '')) return false;
      if ((a.totalStayMinutesText || '') !== (b.totalStayMinutesText || '')) return false;
      if ((a.enterCount || 0) !== (b.enterCount || 0)) return false;
      if ((a.sectionClicksTotal || 0) !== (b.sectionClicksTotal || 0)) return false;
      if ((a.viewerNickname || '') !== (b.viewerNickname || '')) return false;
    }
    return true;
  },

  async loadSuspiciousUsers(options = {}) {
    const silent = !!options.silent;
    if (!silent) {
      this.setData({ isLoadingSuspiciousUsers: true });
    }
    try {
      await this._backfillLegacyScreenshotRiskQueue();
      const res = await wx.cloud.callFunction({ name: 'getSuspiciousUsers' });
      if (res.result && res.result.success) {
        const version = res.result.version || '';
        if (version && version.indexOf('v2_sessions_fenxi_') !== 0) {
          console.warn('[index] getSuspiciousUsers 版本异常:', version);
        }
        console.log('[index] getSuspiciousUsers version/stats:', version, res.result.stats || {});
        const nextUsers = res.result.users || [];
        const force = !!options.force;
        if (force || !this._isSameSuspiciousUsers(this.data.suspiciousUsers || [], nextUsers)) {
          this._applySuspiciousUsersList(nextUsers);
        } else if (String(this.data.adminSuspiciousSearch || '').trim()) {
          this._syncSuspiciousDisplayList();
        }
      } else {
        console.error('[index] 加载可疑用户列表失败:', res.result?.error);
        if (!silent) this._applySuspiciousUsersList([]);
      }
    } catch (err) {
      console.error('[index] 加载可疑用户列表异常:', err);
      if (!silent) this._applySuspiciousUsersList([]);
    } finally {
      if (!silent) {
        this.setData({ isLoadingSuspiciousUsers: false });
      }
    }
  },

  async _backfillLegacyScreenshotRiskQueue() {
    if (this._legacyScreenshotBackfillDone) return;
    this._legacyScreenshotBackfillDone = true;
    try {
      await wx.cloud.callFunction({ name: 'backfillScreenshotRiskQueue' });
    } catch (err) {
      console.warn('[index] 旧截图数据回填失败（已忽略）:', err);
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

  handleIgnoredUserBan(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const itemRowKey = dataset.itemRowKey || '';
    const card = itemRowKey
      ? (this.data.ignoredUsers || []).find((item) => item && item.rowKey === itemRowKey)
      : null;
    if (!card) return;
    this.handleSuspiciousDecision({
      currentTarget: {
        dataset: {
          action: 'ban',
          sourceType: card.fromSourceType || 'session',
          viewerNickname: card.viewerNickname || '该用户',
          riskId: card.riskId || '',
          viewerOpenid: card.viewerOpenid || '',
          rowKey: card.sessionRowKey || card.archiveId || '',
          province: card.province || '',
          city: card.city || '',
          district: card.district || '',
          address: card.address || '',
          latitude: card.latitude,
          longitude: card.longitude,
          fromIgnored: '1',
          ignoredRowKey: card.rowKey || itemRowKey
        }
      }
    });
  },

  // 可疑人员页：截图记录的手动处理（无视/封禁）
  async handleSuspiciousScreenshotDecision(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const riskId = dataset.riskId;
    const action = dataset.action; // ban | ignore
    const viewerNickname = dataset.viewerNickname || '该用户';
    const fromIgnored = dataset.fromIgnored === '1' || dataset.fromIgnored === 1;
    const ignoredRowKey = dataset.ignoredRowKey || '';
    const viewerOpenid = dataset.viewerOpenid || '';
    if (!riskId || !action) return;
    const actionText = action === 'ban' ? '封禁' : '无视';
    this.showMyDialog({
      title: '确认操作',
      content: `确定要${actionText}「${viewerNickname}」吗？`,
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
            this._removeSuspiciousCard({
              riskId,
              viewerOpenid,
              sourceType: 'screenshot'
            });
            this.loadSuspiciousUsers({ silent: true, force: true });
            this.loadScreenshotRiskUsers();
            if (action === 'ignore') {
              this.loadIgnoredUsers({ silent: true });
            }
            if (action === 'ban') {
              this.loadBannedUsers({ suspiciousManualOnly: true });
              if (fromIgnored) {
                this._removeIgnoredUserCard({ rowKey: ignoredRowKey, viewerOpenid, riskId });
              }
            }
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

  // 可疑人员页统一处理（每张卡都支持：无视/封禁）
  async handleSuspiciousDecision(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const action = dataset.action; // ban | ignore
    const sourceType = dataset.sourceType || '';
    const viewerNickname = dataset.viewerNickname || '该用户';
    const riskId = dataset.riskId || '';
    const viewerOpenid = dataset.viewerOpenid || '';
    const rowKey = dataset.rowKey || '';
    const fromIgnored = dataset.fromIgnored === '1' || dataset.fromIgnored === 1;
    const ignoredRowKey = dataset.ignoredRowKey || '';
    if (!action) return;

    // 截图待审核仍走原有云函数，保持兼容
    if (sourceType === 'screenshot' && riskId) {
      this.handleSuspiciousScreenshotDecision({
        currentTarget: {
          dataset: {
            riskId,
            action,
            viewerNickname,
            viewerOpenid,
            fromIgnored: dataset.fromIgnored,
            ignoredRowKey: dataset.ignoredRowKey
          }
        }
      });
      return;
    }

    const actionText = action === 'ban' ? '封禁' : '无视';
    this.showMyDialog({
      title: '确认操作',
      content: `确定要${actionText}「${viewerNickname}」吗？`,
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        const suspiciousList = this.data.suspiciousUsers || [];
        let sourceCard = null;
        if (fromIgnored) {
          sourceCard = ignoredRowKey
            ? (this.data.ignoredUsers || []).find((item) => item && item.rowKey === ignoredRowKey)
            : null;
          if (!sourceCard && viewerOpenid) {
            sourceCard = (this.data.ignoredUsers || []).find((item) => item && item.viewerOpenid === viewerOpenid);
          }
        } else {
          sourceCard = rowKey
            ? suspiciousList.find((item) => item && item.rowKey === rowKey)
            : null;
          if (!sourceCard && viewerOpenid) {
            sourceCard = suspiciousList.find((item) => item && item.viewerOpenid === viewerOpenid);
          }
        }
        try {
          this.showMyLoading('处理中...');
          const result = await wx.cloud.callFunction({
            name: 'handleSuspiciousUserDecision',
            data: {
              action,
              sourceType,
              viewerOpenid,
              viewerNickname,
              rowKey,
              riskId,
              locationInfo: {
                province: dataset.province || '',
                city: dataset.city || '',
                district: dataset.district || '',
                address: dataset.address || '',
                latitude: dataset.latitude,
                longitude: dataset.longitude
              },
              snapshot: sourceCard ? {
                enterCount: sourceCard.enterCount,
                sectionClicksTotal: sourceCard.sectionClicksTotal,
                totalStayMinutes: sourceCard.totalStayMinutesText,
                triggerReasonText: sourceCard.triggerReasonText,
                lastViewTime: sourceCard.lastViewTime
              } : {}
            }
          });
          this.hideMyLoading();
          if (result.result && result.result.success) {
            if (action === 'ignore' && result.result.archiveOk === false) {
              const detail = result.result.archiveError || '留档写入失败';
              this.showAutoToast('提示', `已无视，但留档失败：${detail}`);
            } else {
              this.showAutoToast('成功', `已${actionText}`);
            }
            if (action === 'ignore' && sourceCard && !fromIgnored) {
              this._prependIgnoredUserFromCard(sourceCard);
            }
            if (!fromIgnored) {
              this._removeSuspiciousCard({
                rowKey,
                viewerOpenid,
                riskId,
                sourceType: sourceType || 'session'
              });
            }
            if (fromIgnored && action === 'ban') {
              this._removeIgnoredUserCard({ rowKey: ignoredRowKey, viewerOpenid, riskId });
            }
            this.loadSuspiciousUsers({ silent: true, force: true });
            this.loadScreenshotRiskUsers();
            if (action === 'ignore') {
              this.loadIgnoredUsers({ silent: true });
            }
            if (action === 'ban') this.loadBannedUsers({ suspiciousManualOnly: true });
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
      confirmModalClosing: false,
      confirmModalContent: `确定要解除对"${nickname}"的封禁吗？`,
      _pendingUnbanData: { buttonId, userIndex, banReason, openid, nickname }
    });
  },

  // 🔴 隐藏确认弹窗
  hideConfirmModal() {
    this._closeWithAnimation('showConfirmModal', 'confirmModalClosing', {
      confirmModalContent: '',
      _pendingUnbanData: null
    });
  },

  /** @returns {boolean} 是否实际打开了闲鱼须知 */
  _openXianyuWarningModalAnimated() {
    if (this._xianyuWarningShownOnce) return false;
    if (this.data.isAuthorized) return false;
    if (this._xianyuWarningDismissedThisSession) return false;
    if (this.data.showXianyuWarningModal || this.data.xianyuWarningModalClosing) return false;
    if (wx.getStorageSync('has_permanent_auth') && wx.getStorageSync('user_nickname')) return false;
    this._xianyuWarningShownOnce = true;
    this.setData({
      ...this._xianyuWarningModalPatch(false),
      isShowNicknameUI: false,
      nicknameUiClosing: false,
      showFirstTimeModal: false,
      firstTimeModalEnterReady: false,
      firstTimeModalClosing: false
    });
    this._allowScreenCaptureOnIndex();
    this._startXianyuWarningActionCooldown();
    return true;
  },

  closeXianyuWarningModal() {
    if (this.data.xianyuWarningModalClosing) return;
    if (!this.data.xianyuWarningActionReady) return;
    this._clearXianyuWarningActionCooldown();
    this._markXianyuWarningDismissed();
    this.setData({ xianyuWarningModalClosing: true });
    setTimeout(() => {
      this.setData({
        ...this._xianyuWarningModalPatch(true),
        xianyuWarningModalClosing: false
      });
      if (!this.data.isAuthorized && !this.data.isAdmin) {
        if (!this._openFirstTimeModalIfNeeded()) {
          this._showNicknameUI();
        }
      }
    }, 380);
  },

  /** @returns {boolean} 是否实际打开了首次引导 */
  _openFirstTimeModalAnimated() {
    // 防抖：本次进入 index 只允许弹一次，避免异步流程里重复触发
    if (this._firstTimeModalShownOnce) return false;
    if (this.data.isAuthorized) return false;
    if (this._firstTimeGuideDismissedThisSession) return false;
    if (this.data.showFirstTimeModal || this.data.firstTimeModalClosing) return false;
    if (wx.getStorageSync('has_permanent_auth') && wx.getStorageSync('user_nickname')) return false;
    if (this._firstTimeModalEnterTimer) {
      clearTimeout(this._firstTimeModalEnterTimer);
      this._firstTimeModalEnterTimer = null;
    }
    this._firstTimeModalShownOnce = true;
    // 首帧即 enter-ready，避免 opacity:0 期间白屏；与昵称层互斥，不再延迟盖住昵称弹窗
    this.setData({
      showFirstTimeModal: true,
      firstTimeModalEnterReady: true,
      firstTimeModalClosing: false,
      showXianyuWarningModal: false,
      xianyuWarningModalEnterReady: false,
      xianyuWarningModalClosing: false,
      isShowNicknameUI: false,
      nicknameUiClosing: false,
      showWechatQRCode: true,
      copyWechatBusy: false,
    });
    this._allowScreenCaptureOnIndex();
    this._startFirstTimeActionCooldown();
    this._preloadFirstTimeQrcode();
    return true;
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

  onFirstTimeQrTouchStart() {
    this.setData({ qrPressing: true });
  },

  onFirstTimeQrTouchEnd() {
    this.setData({ qrPressing: false });
  },

  saveFirstTimeQrcode() {
    const src = '/images/qrcode.jpg';
    wx.getImageInfo({
      src,
      success: (imgRes) => {
        const filePath = imgRes && imgRes.path;
        if (!filePath) {
          this.showAutoToast('提示', '二维码读取失败，请重试');
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            this.showAutoToast('成功', '二维码已保存到相册');
          },
          fail: (err) => {
            const msg = (err && err.errMsg) || '';
            if (msg.indexOf('auth deny') > -1 || msg.indexOf('authorize') > -1) {
              this.showMyDialog({
                title: '需要相册权限',
                content: '请在设置中开启“保存到相册”权限后重试',
                showCancel: false,
                confirmText: '知道了'
              });
              return;
            }
            this.showAutoToast('提示', '保存失败，请重试');
          }
        });
      },
      fail: () => {
        this.showAutoToast('提示', '二维码读取失败，请重试');
      }
    });
  },

  // 🔴 关闭首次进入提示弹窗
  closeFirstTimeModal() {
    if (this.data.firstTimeModalClosing) return;
    if (!this.data.firstTimeActionReady) return;
    this._clearFirstTimeActionCooldown();
    this._markDouyinXianyuGuideDismissed();
    this.setData({ firstTimeModalClosing: true });
    setTimeout(() => {
      this.setData({
        showFirstTimeModal: false,
        firstTimeModalClosing: false,
        firstTimeModalEnterReady: false,
        showWechatQRCode: false,
        isShowNicknameUI: true,
        nicknameUiClosing: false,
      });
    }, 380);
  },

  // 🔴 复制管理员微信号
  copyAdminWechat() {
    if (!this.data.firstTimeActionReady) return;
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
          copyWechatBusy: false,
          showCopySuccessModal: true,
          copySuccessModalClosing: false,
        });
        // 2秒后自动关闭
        setTimeout(() => {
          this._closeWithAnimation('showCopySuccessModal', 'copySuccessModalClosing');
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
    this._clearFirstTimeActionCooldown();
    this._markDouyinXianyuGuideDismissed();
    this.setData({ firstTimeModalClosing: true });
    setTimeout(() => {
      this.setData({
        showFirstTimeModal: false,
        firstTimeModalClosing: false,
        firstTimeModalEnterReady: false,
        showWechatQRCode: false,
        isShowNicknameUI: true,
        nicknameUiClosing: false,
      });
    }, 380);
  },

  // 🔴 确认执行放行
  async handleConfirmAction() {
    const {
      buttonId,
      userIndex,
      banReason,
      openid,
      fromBannedIgnored,
      itemRowKey
    } = this.data._pendingUnbanData || {};
    
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
      if (banReason === 'screenshot' || banReason === 'screen_record' || banReason === 'screenshot_risk_review') {
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
      if (fromBannedIgnored) {
        this._removeBannedIgnoredUserCard({
          rowKey: itemRowKey,
          viewerOpenid: openid,
          buttonId
        });
      } else if (Number.isFinite(Number(userIndex))) {
        const users = this.data.bannedUsers;
        users.splice(userIndex, 1);
        this.setData({ bannedUsers: users });
      }

      console.log('[unbanUser] 操作成功，已从列表中移除');

      this.hideMyLoading();

      // 🔴 2. 使用自定义白底黑字弹窗显示成功
      this._closeAllPopups();
      this.setData({
        showCustomSuccessModal: true,
        customSuccessModalClosing: false,
        successModalTitle: '已解除封禁',
        successModalContent: '用户现在可以正常访问了'
      });

      // 2秒后自动关闭弹窗并刷新列表
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
        // 延迟重新加载列表，等待数据库更新生效
        setTimeout(() => {
          if (fromBannedIgnored) {
            this.loadBannedIgnoredUsers({ silent: true });
          } else {
            this.loadBannedUsers();
          }
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
    const entering = this.data.adminViewMode !== 'nickname';
    this.setData({
      adminViewMode: entering ? 'nickname' : 'banned',
      accessCodeBypassLocation: false
    }, () => {
      if (entering) {
        this.loadAccessCodeList();
        this.loadBlockedRegionsAdmin();
      }
    });
  },

  toggleAccessCodeBypass(e) {
    this.setData({
      accessCodeBypassLocation: !!(e && e.detail && e.detail.value)
    });
  },

  _decorateAccessCodeList(list) {
    return (Array.isArray(list) ? list : []).map((item) => {
      const accessCode = extractPlainAccessCode(item.accessCode || item.nickname || '');
      return {
        ...item,
        accessCode,
        statusClass: item.bound ? 'used' : 'unused'
      };
    });
  },

  async loadAccessCodeList() {
    if (this.data.isLoadingAccessCodes) return;
    this.setData({ isLoadingAccessCodes: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'addNicknameToWhitelist',
        data: { action: 'list' }
      });
      if (res.result && res.result.success) {
        this.setData({
          accessCodeList: this._decorateAccessCodeList(res.result.list)
        });
      } else {
        this.showAutoToast('提示', (res.result && res.result.errMsg) || '加载口令列表失败');
      }
    } catch (err) {
      console.error('[index] 加载口令列表失败:', err);
      this.showAutoToast('提示', '加载口令列表失败');
    } finally {
      this.setData({ isLoadingAccessCodes: false });
    }
  },

  async generateAccessCode() {
    if (this.data.isGeneratingAccessCode) return;
    this.setData({ isGeneratingAccessCode: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'addNicknameToWhitelist',
        data: {
          action: 'generate',
          bypassLocationCheck: this.data.accessCodeBypassLocation
        }
      });
      if (res.result && res.result.success) {
        const code = extractPlainAccessCode(res.result.accessCode || res.result.nickname || '');
        this.setData({ accessCodeBypassLocation: false });
        await this.loadAccessCodeList();
        if (code) {
          wx.setClipboardData({
            data: code,
            success: () => {
              this.showMyDialog({
                title: '口令已生成',
                content: `${res.result.message || '生成成功'}\n\n已复制到剪贴板：${code}`,
                showCancel: false
              });
            },
            fail: () => {
              this.showMyDialog({
                title: '口令已生成',
                content: `${res.result.message || '生成成功'}\n\n口令：${code}`,
                showCancel: false
              });
            }
          });
        } else {
          this.showMyDialog({
            title: '口令已生成',
            content: res.result.message || '生成成功',
            showCancel: false
          });
        }
      } else {
        this.showAutoToast('生成失败', (res.result && res.result.errMsg) || '请稍后重试');
      }
    } catch (err) {
      console.error('[index] 生成口令失败:', err);
      this.showAutoToast('生成失败', err.errMsg || '网络错误');
    } finally {
      this.setData({ isGeneratingAccessCode: false });
    }
  },

  copyAccessCode(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const code = extractPlainAccessCode(dataset.code || dataset.nickname || '');
    if (!code) return;
    wx.setClipboardData({
      data: code,
      success: () => {
        this.showAutoToast('已复制', code);
      }
    });
  },

  revokeAccessCode(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const recordId = dataset.id || '';
    const code = dataset.code || '';
    this.showMyDialog({
      title: '作废口令',
      content: `确定作废口令「${code}」吗？作废后用户将无法使用该码登录。`,
      showCancel: true,
      confirmText: '作废',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          this.showMyLoading('处理中...');
          const result = await wx.cloud.callFunction({
            name: 'addNicknameToWhitelist',
            data: { action: 'revoke', recordId, accessCode: code }
          });
          this.hideMyLoading();
          if (result.result && result.result.success) {
            this.showAutoToast('成功', result.result.message || '已作废');
            this.loadAccessCodeList();
          } else {
            this.showAutoToast('失败', (result.result && result.result.errMsg) || '作废失败');
          }
        } catch (err) {
          this.hideMyLoading();
          this.showAutoToast('失败', err.errMsg || '作废失败');
        }
      }
    });
  },

  _syncBlockedCitiesDisplay(config) {
    const list = (config && config.blocked_cities) || [];
    const display = list.map((item, index) => {
      const normalized = typeof item === 'string'
        ? { city: item, district: '' }
        : { city: (item && item.city) || '', district: (item && item.district) || '' };
      const label = normalized.district
        ? `${normalized.city} ${normalized.district}`
        : `${normalized.city}（整市）`;
      return {
        city: normalized.city,
        district: normalized.district,
        label,
        index
      };
    }).filter((item) => item.city);
    this.setData({
      blockedCitiesDisplay: display,
      blockingRulesActive: config ? config.is_active !== false : true
    });
    this._reviewPassModeCache = config ? config.is_active === false : false;
  },

  async loadBlockedRegionsAdmin() {
    if (this.data.isLoadingBlockedRegions) return;
    this.setData({ isLoadingBlockedRegions: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'updateBlockingRules',
        data: { action: 'get' }
      });
      if (res.result && res.result.success) {
        this._syncBlockedCitiesDisplay(res.result.config);
      } else {
        this.showAutoToast('提示', (res.result && res.result.errMsg) || '加载封禁地址失败');
      }
    } catch (err) {
      console.error('[index] 加载封禁地址失败:', err);
      this.showAutoToast('提示', '加载封禁地址失败，请部署 updateBlockingRules 云函数');
    } finally {
      this.setData({ isLoadingBlockedRegions: false });
    }
  },

  onBlockedRegionChange(e) {
    const value = (e && e.detail && e.detail.value) || [];
    this.setData({
      blockedRegionValue: value,
      blockedRegionText: value.filter(Boolean).join(' ')
    });
  },

  toggleBlockedWholeCity(e) {
    this.setData({
      blockedWholeCity: !!(e && e.detail && e.detail.value)
    });
  },

  async toggleBlockingRulesActive(e) {
    const isActive = !!(e && e.detail && e.detail.value);
    try {
      this.showMyLoading('保存中...');
      const res = await wx.cloud.callFunction({
        name: 'updateBlockingRules',
        data: { action: 'set_active', is_active: isActive }
      });
      this.hideMyLoading();
      if (res.result && res.result.success) {
        this._syncBlockedCitiesDisplay(res.result.config);
        this.showAutoToast('成功', res.result.message || (isActive ? '已开启地域拦截' : '已关闭地域拦截'));
      } else {
        this.setData({ blockingRulesActive: !isActive });
        this.showAutoToast('失败', (res.result && res.result.errMsg) || '保存失败');
      }
    } catch (err) {
      this.hideMyLoading();
      this.setData({ blockingRulesActive: !isActive });
      this.showAutoToast('失败', err.errMsg || '保存失败');
    }
  },

  async submitBlockedRegion() {
    const region = this.data.blockedRegionValue || [];
    const province = region[0] || '';
    const city = region[1] || '';
    const district = this.data.blockedWholeCity ? '' : (region[2] || '');
    if (!city) {
      this.showMyDialog({
        title: '提示',
        content: '请先选择省 / 市 / 区',
        showCancel: false
      });
      return;
    }
    if (this.data.isSubmittingBlockedRegion) return;

    this.setData({ isSubmittingBlockedRegion: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'updateBlockingRules',
        data: {
          action: 'add_city',
          province,
          city,
          district,
          wholeCity: this.data.blockedWholeCity
        }
      });
      if (res.result && res.result.success) {
        this._syncBlockedCitiesDisplay(res.result.config);
        this.showMyDialog({
          title: '添加成功',
          content: res.result.message || '封禁地址已保存到 app_config',
          showCancel: false
        });
      } else {
        this.showAutoToast('添加失败', (res.result && res.result.errMsg) || '请稍后重试');
      }
    } catch (err) {
      console.error('[index] 添加封禁地址失败:', err);
      this.showAutoToast('添加失败', err.errMsg || '网络错误，请稍后重试');
    } finally {
      this.setData({ isSubmittingBlockedRegion: false });
    }
  },

  removeBlockedRegion(e) {
    const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const index = Number(dataset.index);
    const city = dataset.city || '';
    const district = dataset.district || '';
    const label = dataset.label || city || '该地址';
    this.showMyDialog({
      title: '确认移除',
      content: `确定要从封禁列表移除「${label}」吗？`,
      showCancel: true,
      confirmText: '移除',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          this.showMyLoading('处理中...');
          const result = await wx.cloud.callFunction({
            name: 'updateBlockingRules',
            data: {
              action: 'remove_city',
              index: Number.isInteger(index) ? index : -1,
              city,
              district
            }
          });
          this.hideMyLoading();
          if (result.result && result.result.success) {
            this._syncBlockedCitiesDisplay(result.result.config);
            this.showAutoToast('成功', result.result.message || '已移除');
          } else {
            this.showAutoToast('失败', (result.result && result.result.errMsg) || '移除失败');
          }
        } catch (err) {
          this.hideMyLoading();
          this.showAutoToast('失败', err.errMsg || '移除失败');
        }
      }
    });
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
