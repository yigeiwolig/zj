// app.js
const GLOBAL_ACCESS_GUARD_INTERVAL_MS = 5 * 60 * 1000;
const { redirectToPcBlockedIfNeeded, isPcBannedClient } = require('./utils/runtimeEnv.js');
const { clearLoginIdentity } = require('./utils/userIdentity.js');
const screenshotExempt = require('./utils/screenshotAdminExempt.js');

/** 必须在首个 Page() 注册前执行，否则 index 等页面 onShow 套不上守卫 */
function _installGlobalPageLifecycleGuard() {
  if (wx.__mt_page_guard_installed) return;
  const rawPage = Page;
  Page = function(definition) {
    const pageDef = definition || {};
    const originalOnLoad = pageDef.onLoad;
    const originalOnShow = pageDef.onShow;

    pageDef.onLoad = function(...args) {
      if (redirectToPcBlockedIfNeeded()) return;
      try {
        // 尽早确认管理员，避免页面 init 先锁黑屏、管理员短暂无法截图
        screenshotExempt.applyAdminCaptureOnPageShow(this);
      } catch (e) {}
      if (typeof originalOnLoad === 'function') {
        return originalOnLoad.apply(this, args);
      }
    };

    pageDef.onShow = async function(...args) {
      try {
        if (redirectToPcBlockedIfNeeded()) return;
        const app = getApp();
        if (app && typeof app.enforceGlobalAccessGuard === 'function') {
          const pass = await app.enforceGlobalAccessGuard({ silent: true });
          if (!pass) return;
        }
      } catch (e) {}
      try {
        // 任意界面：管理员始终允许截图/录屏（防截屏是全局态，会被其它页重新锁上）
        screenshotExempt.applyAdminCaptureOnPageShow(this);
      } catch (e) {}
      if (typeof originalOnShow === 'function') {
        return originalOnShow.apply(this, args);
      }
    };
    return rawPage(pageDef);
  };
  wx.__mt_page_guard_installed = true;
}

_installGlobalPageLifecycleGuard();

App({
  globalData: {
    blockedLocation: null, // ????????

    // UI ?????? app.wxml ??
    ui: {
      loading: { show: false, text: '????..' },
      dialog: { show: false, title: '??', content: '', showCancel: false, confirmText: '??', cancelText: '??', maskClosable: true },
      sheet: { show: false, title: '', items: [] },
      input: { show: false, title: '???', placeholder: '', value: '', maskClosable: true }
    },

    // Toast ???
    _toastTimer: null,

    // ????
    _uiCb: {
      dialogConfirm: null,
      dialogCancel: null,
      sheetSelect: null,
      inputConfirm: null,
      inputCancel: null
    },

    // ?????? blocked
    _isJumpingToBlocked: false,

    // ???????
    isShareCodeUser: false, // ??????????
    shareCodeInfo: null,     // ??????{ code, usedViews, totalViews, expiresAt }
    
    // ?? ??????????????????????????'F1 MAX'??shouhou ????
    shouhouOpenModel: '',
    // ?? ???????????????['??????,'??????']??shouhou ????
    shouhouPreselectParts: [],
    
    // ????????
    updatePageVisit: function(pageRoute) {
      let finalRoute = String(pageRoute || '').trim();
      try {
        const pages = getCurrentPages();
        const current = pages && pages.length ? pages[pages.length - 1] : null;
        if (current && current.route) {
          finalRoute = current.route;
        }
      } catch (e) {}
      if (!finalRoute) return;

      const now = Date.now();
      const lastMap = this._pageVisitLastTsMap || (this._pageVisitLastTsMap = {});
      const lastTs = Number(lastMap[finalRoute] || 0);
      if (now - lastTs < 1200) {
        return;
      }
      lastMap[finalRoute] = now;

      const send = (retryLeft = 1) => {
        wx.cloud.callFunction({
          name: 'updatePageVisit',
          data: { pageRoute: finalRoute },
          success: (res) => {
          },
          fail: (err) => {
            if (retryLeft > 0) {
              setTimeout(() => send(retryLeft - 1), 350);
              return;
            }
            console.error('[app] page visit update failed:', finalRoute, err);
          }
        });
      };
      send(1);
    },
    
    // products 页功能开关（云 shop_config.productFeatureFlags）
    productFeatureFlags: null,

    // shop ???????????????????
    shopDataCache: {
      shopTitle: null,
      topMediaList: null,
      heroAutoCarouselEnabled: false,
      seriesList: null,
      accessoryList: null,
      cacheTime: null, // ????
      isLoading: false // ????
    },
    // ??????PRODUCTS ???? UI ??????????????????????????????
    shopUiSnapshot: null,
    // 审核放行模式（app_config.blocking_rules.is_active === false）
    reviewPassMode: null
  },

  // ======================== ?? UI API????wx.showToast/showModal/showLoading/showActionSheet??========================
  // ?? Loading??????????????{ title:'...', mask:true })
  showLoading(option = '????..') {
    const text = typeof option === 'string' ? option : (option.title || '????..');
    this.globalData.ui.loading = { show: true, text };
    this._emitUI();
  },
  hideLoading() {
    this.globalData.ui.loading = { show: false, text: this.globalData.ui.loading.text };
    this._emitUI();
  },

  showDialog({
    title = '??',
    content = '',
    showCancel = false,
    confirmText = '??',
    cancelText = '??',
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

  showInput({ title = '???', placeholder = '', value = '', maskClosable = true, onConfirm = null, onCancel = null } = {}) {
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

  // ????????????? ui
  _emitUI() {
    // ??getCurrentPages() ??????????? ui??????????ui ??????loading ????
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

  // ????????????????????
  _getCustomToast() {
    try {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        return curPage.selectComponent('#custom-toast');
      }
    } catch (e) {
      console.error('[app] ??custom-toast????', e);
    }
    return null;
  },

  _isTrueFlag(v) {
    return v === true || v === 1 || v === 'true' || v === '1';
  },

  _resolveBlockedTypeFromReason(reason) {
    if (reason === 'location_blocked') return 'location';
    if (reason === 'screenshot' || reason === 'screen_record' || reason === 'screenshot_risk_review') {
      return 'screenshot';
    }
    return 'banned';
  },

  _isBlockedPageRoute(route) {
    return route === 'pages/blocked/blocked';
  },

  _isLocationInBlockedCities(blockedCities = [], locData = {}) {
    const city = String(locData.city || '');
    const district = String(locData.district || '');
    if (!city) return false;
    return blockedCities.some((blockedItem) => {
      let blockedCity = '';
      let blockedDistrict = '';
      if (typeof blockedItem === 'object' && blockedItem) {
        blockedCity = String(blockedItem.city || '');
        blockedDistrict = String(blockedItem.district || '');
      } else if (typeof blockedItem === 'string') {
        blockedCity = blockedItem;
      }
      if (!blockedCity) return false;
      const cityMatched = city.indexOf(blockedCity) !== -1 || blockedCity.indexOf(city) !== -1;
      if (!cityMatched) return false;
      if (!blockedDistrict) return true;
      if (!district) return false;
      return district.indexOf(blockedDistrict) !== -1 || blockedDistrict.indexOf(district) !== -1;
    });
  },

  async _resolveLocationForGlobalAccessGuard() {
    const cached = wx.getStorageSync('last_location') || {};
    if (cached && cached.city) return cached;
    try {
      const locRes = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          isHighAccuracy: true,
          success: resolve,
          fail: reject
        });
      });
      const { reverseGeocodeWithRetry } = require('./utils/reverseGeocode.js');
      const addr = await reverseGeocodeWithRetry(locRes.latitude, locRes.longitude, {
        maxRetries: 2,
        timeout: 8000,
        retryDelay: 600
      });
      const merged = {
        ...addr,
        latitude: locRes.latitude,
        longitude: locRes.longitude
      };
      try { wx.setStorageSync('last_location', merged); } catch (e) {}
      return merged;
    } catch (e) {
      return cached || {};
    }
  },

  async enforceGlobalAccessGuard(options = {}) {
    if (isPcBannedClient()) {
      redirectToPcBlockedIfNeeded();
      return false;
    }
    if (this._accessGuardInFlight) return true;
    this._accessGuardInFlight = true;
    try {
      const pages = getCurrentPages();
      const currentPage = pages && pages.length ? pages[pages.length - 1] : null;
      const currentRoute = currentPage && currentPage.route ? currentPage.route : '';
      if (this._isBlockedPageRoute(currentRoute)) return true;

      const reviewPassMode = await this._isReviewPassMode();
      if (reviewPassMode) return true;

      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes && loginRes.result ? loginRes.result.openid : '';
      if (!openid) return true;

      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({ openid }).limit(1).get();
      if (!adminCheck.data || adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
      }
      if (adminCheck.data && adminCheck.data.length > 0) {
        try {
          screenshotExempt.markGuanliyuanCache(true);
          screenshotExempt.allowScreenCaptureIfExempt();
        } catch (e) {}
        return true;
      }

      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      const button = (buttonRes.data && buttonRes.data[0]) || null;
      if (button) {
        const qiangli = this._isTrueFlag(button.qiangli);
        const isBanned = this._isTrueFlag(button.isBanned);
        if (qiangli || isBanned) {
          const type = this._resolveBlockedTypeFromReason(button.banReason || '');
          wx.setStorageSync('is_user_banned', true);
          wx.reLaunch({ url: `/pages/blocked/blocked?type=${type}` });
          return false;
        }
      }

      const validRes = await db.collection('valid_users').where({ _openid: openid }).limit(1).get();
      if (!validRes.data || validRes.data.length === 0) {
        wx.removeStorageSync('has_permanent_auth');
        clearLoginIdentity();
        wx.removeStorageSync('is_user_banned');
        if (isPcBannedClient()) {
          redirectToPcBlockedIfNeeded();
          return false;
        }
        // 已在首页：由 index 自行展示昵称/引导，勿 reLaunch（否则会闪屏且 onShow 被短路）
        if (currentRoute === 'pages/index/index') {
          return true;
        }
        wx.reLaunch({ url: '/pages/index/index' });
        return false;
      }

      // 地域拦截不在全局守卫里主动定位封禁，仅 index 点击中间按钮后由 banUserByLocation 写入封禁态；
      // 若用户已被封禁（login_logbutton.isBanned），上面 button 检查会送进 blocked 页。

      return true;
    } catch (e) {
      return true;
    } finally {
      this._accessGuardInFlight = false;
    }
  },

  _startGlobalAccessGuardTimer() {
    this._stopGlobalAccessGuardTimer();
    this._globalAccessGuardTimer = setInterval(() => {
      if (isPcBannedClient()) {
        redirectToPcBlockedIfNeeded();
        return;
      }
      this.enforceGlobalAccessGuard({ silent: true });
    }, GLOBAL_ACCESS_GUARD_INTERVAL_MS);
  },

  _stopGlobalAccessGuardTimer() {
    if (this._globalAccessGuardTimer) {
      clearInterval(this._globalAccessGuardTimer);
      this._globalAccessGuardTimer = null;
    }
  },

  // ======================== ???? ========================
  onLaunch: function (options) {
    this.checkIsPC();

    // 2. 记录分享码入口（供后续页面消费）
    if (options && options.query && options.query.shareCode) {
      const shareCode = String(options.query.shareCode || '').trim();
      if (shareCode) {
        this.globalData.shareCodeInfo = this.globalData.shareCodeInfo || {};
        this.globalData.shareCodeInfo.code = shareCode;
      }
    }

    try {
      if (!wx.__mt_oldShowModal) wx.__mt_oldShowModal = wx.showModal.bind(wx);
      if (!wx.__mt_oldShowToast) wx.__mt_oldShowToast = wx.showToast.bind(wx);
      if (!wx.__mt_oldHideToast) wx.__mt_oldHideToast = wx.hideToast.bind(wx);
      if (!wx.__mt_oldShowLoading) wx.__mt_oldShowLoading = wx.showLoading.bind(wx);
      if (!wx.__mt_oldHideLoading) wx.__mt_oldHideLoading = wx.hideLoading.bind(wx);
      if (!wx.__mt_oldSetClipboardData) wx.__mt_oldSetClipboardData = wx.setClipboardData.bind(wx);

      const getToast = () => {
        try {
          const pages = getCurrentPages();
          const curPage = pages[pages.length - 1];
          if (curPage) {
            return curPage.selectComponent('#custom-toast');
          }
        } catch (e) {}
        return null;
      };

      // ????????????????????/?????? custom-toast ??
      const hideKnownPagePopups = () => {
        try {
          const pages = getCurrentPages();
          const curPage = pages[pages.length - 1];
          if (!curPage || !curPage.setData || !curPage.data) return;
          const d = curPage.data || {};
          const patch = {};
          const knownFlags = [
            'showCustomSuccessModal',
            'customSuccessModalClosing',
            'showCopySuccessModal',
            'showShareCodeGenerateModal',
            'showConfirmModal',
            'showModal', // my ?????? modal
            'autoToastClosing' // my ?????? toast
          ];
          knownFlags.forEach(k => {
            if (d[k]) patch[k] = false;
          });
          // ?????? autoToast ??
          if (d.autoToast && d.autoToast.show) {
            patch['autoToast.show'] = false;
          }
          if (Object.keys(patch).length) curPage.setData(patch);
        } catch (e) {
          // ignore
        }
      };

      // 1) showModal
      wx.showModal = (opt = {}) => {
        const toast = getToast();
        if (toast) {
          hideKnownPagePopups();
          toast.showModal(opt);
        } else {
          // ????????          console.warn('[app] ????????#custom-toast ??????????showModal');
          return wx.__mt_oldShowModal(opt);
        }
      };

      // 2) showToast
      wx.showToast = (opt = {}) => {
        // ?? wx.showToast('text') ??
        if (typeof opt === 'string') {
          opt = { title: opt };
        }
        
        const toast = getToast();
        if (toast) {
          hideKnownPagePopups();
          toast.showToast(opt);
        } else {
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
          hideKnownPagePopups();
          toast.showLoading(opt);
        } else {
          return wx.__mt_oldShowLoading(opt);
        }
      };
      wx.hideLoading = () => {
        const toast = getToast();
        if (toast) toast.hideLoading();
        else wx.__mt_oldHideLoading();
      };

      // 4) setClipboardData - ???????????
      wx.setClipboardData = (opt = {}) => {
        const originalSuccess = opt.success;
        const originalFail = opt.fail;
        
        // ?? ??????????????
        if (wx.__mt_oldHideToast) {
          wx.__mt_oldHideToast();
        }
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
        
        // ?? success ??
        opt.success = (res) => {
          // ???????? toast/loading
          const hideOfficialToast = () => {
            try {
              if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
              if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
            } catch (e) {}
          };
          
          // ???????????
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
          
          // ???? success ??
          if (originalSuccess) originalSuccess(res);
        };
        
        // ???? API
        return wx.__mt_oldSetClipboardData(opt);
      };
    } catch (e) {
      console.error('[app] ??API??:', e);
    }

    if (!wx.cloud) {
      console.error('??? 2.2.3 ????????????');
    } else {
      wx.cloud.init({
        env: 'cloudbase-4gn1heip7c38ec6c',
        traceUser: true,
      });
      this.preloadProductFeatureFlags();
      this.preloadShopData();
      this.preloadNewArrivalData();
      
      // ?????????????????????
      try {
        const deviceInfo = wx.getDeviceInfo();
        const isDevTools = deviceInfo.platform === 'devtools';
        if (!isDevTools) {
          this.checkBanStatusOnLaunch();
        } else {
        }
      } catch (e) {
      }
    }
  },

  onShow: function () {
    this.checkIsPC();
    if (!isPcBannedClient()) {
      this.enforceGlobalAccessGuard({ silent: true });
    }
    try {
      // 从后台回前台时也恢复管理员截图权限
      if (screenshotExempt.isScreenshotBanExempt({ data: {} })) {
        screenshotExempt.allowScreenCaptureIfExempt();
      } else {
        screenshotExempt.applyAdminCaptureOnPageShow({ data: {} });
      }
    } catch (e) {}
    this._startGlobalAccessGuardTimer();
    this._suspiciousSessionStartAt = Date.now();
    this._startSuspiciousSessionHeartbeat();
  },

  onHide: function () {
    this._stopGlobalAccessGuardTimer();
    this._stopSuspiciousSessionHeartbeat();
    this._flushSuspiciousSession();
  },

  onError: function () {
    this._stopSuspiciousSessionHeartbeat();
    this._flushSuspiciousSession();
  },

  _suspiciousSessionHeartbeatTimer: null,
  _suspiciousSessionFlushInFlight: false,
  _suspiciousSessionRetryQueue: [],
  _suspiciousSessionRetryTimer: null,

  _startSuspiciousSessionHeartbeat: function () {
    if (this._suspiciousSessionHeartbeatTimer) {
      clearInterval(this._suspiciousSessionHeartbeatTimer);
      this._suspiciousSessionHeartbeatTimer = null;
    }
    this._suspiciousSessionHeartbeatTimer = setInterval(() => {
      this._flushSuspiciousSession(true);
    }, 60000);
    this._startSuspiciousSessionRetryDrain();
  },

  _stopSuspiciousSessionHeartbeat: function () {
    if (this._suspiciousSessionHeartbeatTimer) {
      clearInterval(this._suspiciousSessionHeartbeatTimer);
      this._suspiciousSessionHeartbeatTimer = null;
    }
    if (this._suspiciousSessionRetryTimer) {
      clearInterval(this._suspiciousSessionRetryTimer);
      this._suspiciousSessionRetryTimer = null;
    }
  },

  _startSuspiciousSessionRetryDrain: function () {
    if (this._suspiciousSessionRetryTimer) return;
    this._suspiciousSessionRetryTimer = setInterval(() => {
      this._drainSuspiciousSessionRetryQueue();
    }, 20000);
  },

  _drainSuspiciousSessionRetryQueue: function () {
    if (this._suspiciousSessionFlushInFlight) return;
    const queue = this._suspiciousSessionRetryQueue || [];
    if (!queue.length) return;
    const payload = queue.shift();
    this._suspiciousSessionFlushInFlight = true;
    wx.cloud.callFunction({
      name: 'recordSuspiciousSession',
      data: payload
    }).catch((err) => {
      console.error('[app] retry recordSuspiciousSession failed', err);
      queue.unshift(payload);
      if (queue.length > 30) queue.length = 30;
    }).finally(() => {
      this._suspiciousSessionFlushInFlight = false;
    });
  },

  _flushSuspiciousSession: function (keepRunning = false) {
    try {
      if (this._suspiciousSessionFlushInFlight) return;
      const startAt = Number(this._suspiciousSessionStartAt || 0);
      if (!startAt) return;
      const now = Date.now();
      const durationMs = Math.max(0, now - startAt);
      if (durationMs < 3000) return;

      const pages = getCurrentPages();
      const current = pages && pages.length ? pages[pages.length - 1] : null;
      const route = current && current.route ? current.route : '';
      const loc = wx.getStorageSync('last_location') || {};
      const payload = {
        durationMs,
        route,
        locationInfo: {
          province: loc.province || '',
          city: loc.city || '',
          district: loc.district || '',
          address: loc.address || '',
          latitude: loc.latitude,
          longitude: loc.longitude
        }
      };

      this._suspiciousSessionFlushInFlight = true;
      wx.cloud.callFunction({
        name: 'recordSuspiciousSession',
        data: payload
      }).then(() => {
        this._suspiciousSessionStartAt = keepRunning ? now : 0;
      }).catch((err) => {
        // ???????? startAt?????????
        console.error('[app] recordSuspiciousSession failed', err);
        this._suspiciousSessionRetryQueue.push(payload);
        if (this._suspiciousSessionRetryQueue.length > 30) {
          this._suspiciousSessionRetryQueue = this._suspiciousSessionRetryQueue.slice(-30);
        }
      }).finally(() => {
        this._suspiciousSessionFlushInFlight = false;
      });
    } catch (e) {
    }
  },

  // --- ?? ???????---
  checkIsPC() {
    redirectToPcBlockedIfNeeded();
  },

  async _isReviewPassMode(forceRefresh) {
    if (!forceRefresh && typeof this.globalData.reviewPassMode === 'boolean') {
      return this.globalData.reviewPassMode;
    }
    try {
      const db = wx.cloud.database();
      const res = await db.collection('app_config').doc('blocking_rules').get();
      const cfg = (res && res.data) || {};
      const enabled = cfg.is_active === false;
      this.globalData.reviewPassMode = enabled;
      return enabled;
    } catch (e) {
      this.globalData.reviewPassMode = false;
      return false;
    }
  },

  // ???????????
  async checkBanStatusOnLaunch() {
    try {
      const reviewPassMode = await this._isReviewPassMode();
      if (reviewPassMode) {
        return;
      }

      // ?? ????????????????
      const deviceInfo = wx.getDeviceInfo();
      const isDevTools = deviceInfo.platform === 'devtools';
      if (isDevTools) {
        return;
      }

      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();
      
      // ?? ?????login_logbutton ??login_logs ????
      const [buttonRes, logRes] = await Promise.all([
        db.collection('login_logbutton')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get(),
        db.collection('login_logs')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get()
      ]);
      
      // ???login_logbutton ??
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        if (qiangli) {
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }, 500);
          return;
        }
      }

      // ?? ?????login_logs ???????? login_logs ????qiangli ????
      if (logRes.data && logRes.data.length > 0) {
        const log = logRes.data[0];
        const qiangli = log.qiangli === true || log.qiangli === 1 || log.qiangli === 'true' || log.qiangli === '1';
        if (qiangli) {
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }, 500);
          return;
        }
      }
      
      // ?? ??????????????????????????qiangli??????
      let adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      // ??? openid ????????? _openid ????
      if (adminCheck.data && adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan')
          .where({ _openid: openid })
          .limit(1)
          .get();
      }
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        try {
          screenshotExempt.markGuanliyuanCache(true);
          screenshotExempt.allowScreenCaptureIfExempt();
        } catch (e) {}
        return; // ???????
      }
      
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const rawFlag = btn.isBanned;
        const isBanned = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
        
        if (isBanned) {
          const banType = btn.banReason === 'screenshot' || btn.banReason === 'screen_record' || btn.banReason === 'screenshot_risk_review'
            ? 'screenshot' 
            : (btn.banReason === 'location_blocked' ? 'location' : 'banned');
          
          // ?????????????
          setTimeout(() => {
            wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
          }, 500);
          return;
        }
      }
    } catch (err) {
      const msg = (err.errMsg || err.message || '') + '';
      if (msg.indexOf('access_token') !== -1) {
        return;
      }
      console.error('[app] ????????????', err);
    }
  },

  // ?? ???????qiangli ??????????????
  _qiangliCheckTimer: null, // ???ID

  // ?? ???????qiangli ????
  startQiangliCheck() {
    // ???????
    if (this._qiangliCheckTimer) {
      clearInterval(this._qiangliCheckTimer);
      this._qiangliCheckTimer = null;
    }

    // ???????
    this.checkQiangliStatus();

    // ??????
    this._qiangliCheckTimer = setInterval(() => {
      this.checkQiangliStatus();
    }, 30000);
  },

  // ????
  stopQiangliCheck() {
    if (this._qiangliCheckTimer) {
      clearInterval(this._qiangliCheckTimer);
      this._qiangliCheckTimer = null;
    }
  },

  // ?? qiangli ??
  async checkQiangliStatus() {
    try {
      const reviewPassMode = await this._isReviewPassMode();
      if (reviewPassMode) {
        return;
      }

      // ?? ????????????????
      const deviceInfo = wx.getDeviceInfo();
      const isDevTools = deviceInfo.platform === 'devtools';
      if (isDevTools) {
        return; // ???????????
      }

      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();

      // ?????
      let adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      // ?????? _openid ???
      if (adminCheck.data && adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan')
          .where({ _openid: openid })
          .limit(1)
          .get();
      }
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        try {
          screenshotExempt.markGuanliyuanCache(true);
          screenshotExempt.allowScreenCaptureIfExempt();
        } catch (e) {}
        return; // ???????
      }

      // ???? login_logbutton ? login_logs
      const [buttonRes, logRes] = await Promise.all([
        db.collection('login_logbutton')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get(),
        db.collection('login_logs')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get()
      ]);

      // ???login_logbutton ??
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        
        if (qiangli) {
          this.stopQiangliCheck();
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }

      // ?? ?????login_logs ???????? login_logs ????qiangli ????
      if (logRes.data && logRes.data.length > 0) {
        const log = logRes.data[0];
        const qiangli = log.qiangli === true || log.qiangli === 1 || log.qiangli === 'true' || log.qiangli === '1';
        
        if (qiangli) {
          this.stopQiangliCheck();
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }
    } catch (err) {
      console.error('[app] ?????qiangli ?????', err);
    }
  },

  // ?????
  async verifyShareCode(shareCode) {
    try {
      const db = wx.cloud.database()
      
      // ?? ????????????
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('???????')), 5000);
      });
      
      // ??????????
      const codeRes = await Promise.race([
        db.collection('chakan')
        .where({ code: shareCode })
          .get(),
        timeoutPromise
      ])

      if (!codeRes.data || codeRes.data.length === 0) {
        return { success: false, error: '分享码不存在' }
      }

      const codeInfo = codeRes.data[0]
      const now = new Date()
      const expiresAt = new Date(codeInfo.expiresAt)
      if (now > expiresAt) {
        return { success: false, error: '分享码已过期' }
      }
      if (codeInfo.usedViews >= codeInfo.totalViews) {
        return { success: false, error: '分享码查看次数已用完' }
      }
      if (codeInfo.status !== 'active') {
        return { success: false, error: '分享码无效' }
      }

      this.globalData.isShareCodeUser = true
      this.globalData.shareCodeInfo = {
        code: shareCode,
        usedViews: codeInfo.usedViews,
        totalViews: codeInfo.totalViews,
        expiresAt: codeInfo.expiresAt,
        _id: codeInfo._id
      }
      return { success: true }
    } catch (err) {
      console.error('[app] 分享码验证失败', err)
      return { success: false, error: err.message || '分享码验证失败' }
    }
  },

  // 分享码查看次数 +1
  async updateShareCodeViews() {
    if (!this.globalData.isShareCodeUser || !this.globalData.shareCodeInfo) {
      return { success: false, error: '当前不是分享码用户' }
    }
    try {
      const codeInfo = this.globalData.shareCodeInfo
      const shareCodeId = codeInfo._id
      const res = await wx.cloud.callFunction({
        name: 'updateShareCodeViews',
        data: { shareCodeId }
      })
      if (!res.result || !res.result.success) {
        return { success: false, error: res.result?.error || '更新失败' }
      }
      this.globalData.shareCodeInfo.usedViews = res.result.usedViews
      this.globalData.shareCodeInfo.totalViews = res.result.total
      return {
        success: true,
        remaining: res.result.remaining,
        total: res.result.total,
        usedViews: res.result.usedViews,
        isExhausted: res.result.isExhausted
      }
    } catch (err) {
      console.error('[app] 分享码次数更新失败:', err)
      return { success: false, error: err.message || '更新失败' }
    }
  },

  // 记录分享码会话统计（azjc 页面调用）
  async recordShareCodeSession(sessionStats, isUpdate = false, poolId = null) {
    if (!poolId && (!this.globalData.isShareCodeUser || !this.globalData.shareCodeInfo)) {
      return;
    }

    try {
      let openid = ''
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' })
        openid = loginRes.result.openid || ''
      } catch (e) {
        console.error('[app] 获取 openid 失败:', e);
      }

      const baseInfo = poolId ? { _id: poolId, code: 'POOL' } : this.globalData.shareCodeInfo;
      if (!baseInfo || !baseInfo._id) {
        console.error('[app] 缺少分享码 _id:', baseInfo);
        return;
      }

      const durationMs = sessionStats && typeof sessionStats.durationMs === 'number'
        ? sessionStats.durationMs
        : 0
      const sectionClicks = sessionStats && sessionStats.sectionClicks ? sessionStats.sectionClicks : {}
      const sectionDurations = sessionStats && sessionStats.sectionDurations ? sessionStats.sectionDurations : {}

      let viewerNickname = '';
      try {
        const { getDisplayIdentity } = require('./utils/userIdentity.js');
        viewerNickname = getDisplayIdentity({ fallback: '' });
      } catch (e) {}

      let locationInfo = sessionStats.locationInfo || {
        province: '',
        city: '',
        district: '',
        address: '',
        latitude: null,
        longitude: null
      };
      if (!sessionStats.locationInfo) {
        try {
          const cachedLocation = wx.getStorageSync('last_location') || {};
          locationInfo = {
            province: cachedLocation.province || '',
            city: cachedLocation.city || '',
            district: cachedLocation.district || '',
            address: cachedLocation.address || '',
            latitude: cachedLocation.latitude || null,
            longitude: cachedLocation.longitude || null
          };
        } catch (e) {}
      }

      const cloudRes = await wx.cloud.callFunction({
        name: 'recordShareCodeViewer',
        data: {
          shareCodeId: poolId || baseInfo._id,
          isUpdate: isUpdate,
          viewerData: {
            nickname: viewerNickname,
            durationMs: durationMs,
            sectionClicks: sectionClicks,
            sectionDurations: sectionDurations,
            province: locationInfo.province,
            city: locationInfo.city,
            district: locationInfo.district,
            address: locationInfo.address,
            latitude: locationInfo.latitude,
            longitude: locationInfo.longitude
          }
        }
      });
      if (!(cloudRes.result && cloudRes.result.success)) {
        console.error('[app] 记录分享会话失败', cloudRes.result?.error || '未知错误');
      }
    } catch (err) {
      console.error('[app] 记录分享会话异常', err)
      console.error('[app] 错误详情:', JSON.stringify(err, null, 2))
    }
  },

  // ????????
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
      this.callCloudCheck(mockLoc.latitude, mockLoc.longitude);
      return;
    }
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success(res) {
        const latitude = res.latitude;
        const longitude = res.longitude;
        that.callCloudCheck(latitude, longitude);
      },
      fail(err) {
        console.error('????????????', err);
      }
    });
  },

  // ??????
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
            const nickName = res.userInfo?.nickName || '??????';
            if (nickName !== '??????') {
              wx.setStorageSync('userInfo', res.userInfo);
            }
            resolve(nickName);
          },
          fail: () => resolve('??????')
        });
      } catch (err) {
        resolve('??????');
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
        desc: '????????',
        success: (res) => {
          const nickName = res.userInfo?.nickName || '??????';
          wx.setStorageSync('userInfo', res.userInfo);
          resolve(nickName);
        },
        fail: () => resolve('??????')
      });
    });
  },

  callCloudCheck: async function(lat, lng) {
    if (this._isCallingCloudCheck) return;
    this._isCallingCloudCheck = true;

    let nickName = '??????';
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
            city: res.result.city || '????',
            province: res.result.province || '????',
            location: res.result.location || '????',
            latitude: res.result.latitude,
            longitude: res.result.longitude
          };
          wx.reLaunch({ url: '/pages/blocked/blocked' });
        }
      },
      fail: err => {
        this._isCallingCloudCheck = false;
        console.error('????????', err);
      }
    });
  },

  checkAccess: function() {
    this.getLocationAndCheck();
  },

  /**
   * ?????????????????????????????????????   * @param {number} maxMs ????????? 4000
   * @returns {Promise<void>}
   */
  waitShopPreloadReady(maxMs = 4000) {
    const p = this.preloadShopData();
    if (!maxMs || maxMs <= 0) return Promise.resolve();
    return Promise.race([
      p.catch(() => {}),
      new Promise(resolve => setTimeout(resolve, maxMs))
    ]);
  },

  preloadProductFeatureFlags() {
    if (!wx.cloud) return Promise.resolve();
    if (this._productFlagsPreloadInflight) return this._productFlagsPreloadInflight;
    this._productFlagsPreloadInflight = wx.cloud
      .callFunction({ name: 'getProductFeatureFlags' })
      .then((res) => {
        const result = res && res.result;
        if (result && result.success && result.flags) {
          this.globalData.productFeatureFlags = result.flags;
        }
      })
      .catch((err) => {
      })
      .finally(() => {
        this._productFlagsPreloadInflight = null;
      });
    return this._productFlagsPreloadInflight;
  },

  // 🆕 预拉取产品上新数据，避免 products 页弹窗慢
  preloadNewArrivalData() {
    if (!wx.cloud) return;
    const now = Date.now();
    if (!this.globalData.newArrivalCache) {
      this.globalData.newArrivalCache = { list: null, cacheTime: 0 };
    }
    const cache = this.globalData.newArrivalCache;
    if (cache.list && cache.list.length && now - cache.cacheTime < 5 * 60 * 1000) {
      return;
    }
    const db = wx.cloud.database();
    db.collection('products').get().then(async res => {
      let products = (res.data || []).map(item => ({
        ...item,
        jumpNumber: item.jumpNumber || null
      }));
      
      // 预先转换 cloud:// 链接为 https://
      const cloudIds = [...new Set(
        products.map(i => i && i.cover).filter(c => c && String(c).indexOf('cloud://') === 0)
      )];
      if (cloudIds.length > 0) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: cloudIds });
          const urlMap = {};
          (urlRes.fileList || []).forEach(f => {
            if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
          });
          products = products.map(item => {
            const c = item.cover;
            if (c && urlMap[c]) return { ...item, cover: urlMap[c] };
            return item;
          });
        } catch (e) {
        }
      }

      this.globalData.newArrivalCache = {
        list: products,
        cacheTime: Date.now()
      };
    }).catch(err => {
      console.error('[app] 预拉取产品上新数据失败:', err);
    });
  },

  // 🆕 预拉取 shop 页面所需核心数据 + cloud 存储桶补全 + 聚合组装为 Promise 返回给页面
  preloadShopData() {
    if (this._shopPreloadInflight) {
      return this._shopPreloadInflight;
    }

    let shopPreload;
    try {
      shopPreload = require('./utils/shopPreloadBundle.js');
    } catch (reqErr) {
      console.error('[app] ?? shopPreloadBundle ??:', reqErr);
      this.globalData.shopDataCache.isLoading = false;
      return Promise.resolve();
    }

    const ttl = shopPreload.SHOP_GLOBAL_CACHE_TTL_MS || 12 * 60 * 1000;
    const now = Date.now();
    const cacheTime = this.globalData.shopDataCache.cacheTime;
    if (cacheTime && now - cacheTime < ttl) {
      return Promise.resolve();
    }

    if (!wx.cloud) {
      this.globalData.shopDataCache.isLoading = false;
      return Promise.resolve();
    }
    this.globalData.shopDataCache.isLoading = true;

    const db = wx.cloud.database();
    const cache = this.globalData.shopDataCache;
    const isDocNotFoundError = (err) => {
      const msg = (err && (err.errMsg || err.message)) || '';
      return msg.indexOf('cannot find document') !== -1;
    };

    this._shopPreloadInflight = Promise.all([
      db.collection('shop_config').doc('shopMain').get().catch(err => {
        if (isDocNotFoundError(err)) {
        } else {
        }
        return { data: null };
      }),
      db.collection('shop_series').get().catch(err => {
        return { data: [] };
      }),
      db.collection('shop_accessories').get().catch(err => {
        return { data: [] };
      })
    ])
      .then(async ([shopMainRes, seriesRes, accRes]) => {
        let fixedTop = [];
        let autoCarouselEnabled = false;

        if (shopMainRes.data) {
          if (shopMainRes.data.title) cache.shopTitle = shopMainRes.data.title;
          const fixed = shopPreload.fixTopMediaListFromDoc(shopMainRes.data);
          fixedTop = fixed.list;
          autoCarouselEnabled = fixed.autoCarouselEnabled;
        } else {
          const [titleRes, mediaRes] = await Promise.all([
            db.collection('shop_config').doc('shopTitle').get().catch(() => ({ data: null })),
            db.collection('shop_config').doc('topMedia').get().catch(() => ({ data: null }))
          ]);
          if (titleRes.data && titleRes.data.title) cache.shopTitle = titleRes.data.title;
          if (mediaRes.data) {
            const fixed = shopPreload.fixTopMediaListFromDoc(mediaRes.data);
            fixedTop = fixed.list;
            autoCarouselEnabled = fixed.autoCarouselEnabled;
          }
        }
        cache.heroAutoCarouselEnabled = autoCarouselEnabled;

        const seriesData = Array.isArray(seriesRes.data) ? seriesRes.data : [];
        const accRaw = Array.isArray(accRes.data) ? accRes.data : [];
        const decorated = shopPreload.decorateSeriesImageFields(shopPreload.normalizeSeriesListFromDb(seriesData));
        const cleanList = accRaw.map(item => ({
          ...item,
          selected: false,
          isRequired: false
        }));

        let topRender = fixedTop;
        let seriesOut = decorated;
        let accOut = cleanList;
        try {
          const needsTop = shopPreload.topMediaNeedsCloudResolve(fixedTop);
          const needsLists = !shopPreload.listsHaveCompleteCloudDisplays(decorated, cleanList) &&
            (shopPreload.collectSeriesCloudFileIdsFromList(decorated).length > 0 ||
              shopPreload.collectAccessoryCloudFileIdsFromList(cleanList).length > 0);
          if (needsTop || needsLists) {
            const hydrated = await shopPreload.hydrateShopFirstScreenTogether(
              fixedTop,
              decorated,
              cleanList,
              u => u
            );
            topRender = hydrated.topRender;
            seriesOut = hydrated.series;
            accOut = hydrated.accessories;
          } else {
            topRender = await shopPreload.resolveTopMediaRenderUrls(fixedTop);
          }
        } catch (e) {
          topRender = fixedTop.map(item => (item ? { ...item, renderUrl: item.url } : item));
          seriesOut = decorated;
          accOut = cleanList;
        }

        cache.topMediaList = fixedTop;
        cache.seriesList = seriesOut;
        cache.accessoryList = accOut;

        cache.cacheTime = Date.now();

        if (!this.globalData.__shopWarmImageSet) {
          this.globalData.__shopWarmImageSet = new Set();
        }
        const warmUrls = shopPreload.collectShopWarmImageUrls(topRender, seriesOut, accOut, {
          top: 16,
          seriesCovers: 40,
          accThumbs: 40
        });
        shopPreload.runShopImageWarm(warmUrls, this.globalData.__shopWarmImageSet);
      })
      .catch(err => {
        console.error('[app] shop????????', err);
      })
      .finally(() => {
        this.globalData.shopDataCache.isLoading = false;
        this._shopPreloadInflight = null;
      });

    return this._shopPreloadInflight;
  },

  // ?? ??shop??????????????????
  refreshShopDataCache() {
    this.globalData.shopDataCache.cacheTime = null; // ????????????    this.preloadShopData();
  }
})
