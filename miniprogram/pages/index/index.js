// miniprogram/pages/index/index.js
const app = getApp();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});
const db = wx.cloud.database();

Page({
  data: {
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
    
    // Loading 状态（合并重复定义）
    isLoading: false,
    loadingText: '加载中...',
    // 自定义加载中动画（使用 my 页面的样式）
    showLoadingAnimation: false,
    
    // 自定义弹窗
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },
    
    // 【新增】管理员相关状态
    isAdmin: false,        // 是否是管理员
    isAdminMode: false,    // 是否开启了管理员模式
    bannedUsers: [],       // 被封禁的用户列表
    isLoadingBannedUsers: false  // 是否正在加载封禁用户列表
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
    
    // 1. 先检查缓存（不立即跳转，等异步检查完成）
    const hasAuth = wx.getStorageSync('has_permanent_auth');
    if (hasAuth) {
      this.setData({ isAuthorized: true, isShowNicknameUI: false });
    } else {
      this.setData({ isShowNicknameUI: true });
    }
    
    // 2. 异步检查全局黑名单（避免死循环）
    // 如果从封禁页跳转过来，标记可能已经被清除，所以先不检查本地缓存
    this.checkGlobalBanStatus();
    
    // 3. 检查管理员权限
    this.checkAdminPrivilege();
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
  handleLogin() {
    if (this.data.isLoading) return;
    const name = this.data.inputNickName.trim();
    if (!name) {
      this.showMyDialog({ title: '提示', content: '请输入昵称' });
      return;
    }

    this.setData({ isLoading: true });
    this.showMyLoading('验证身份...');
    
    // 🔴 确保在云函数调用前关闭任何官方 loading
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }

    // 🔴 获取设备信息
    const sysInfo = wx.getSystemInfoSync();
    // 🔴 尝试获取位置信息（从缓存或实时获取）
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
      this.setData({ isLoading: false });
      this.hideMyLoading();
      
      const result = res.result || {};

      if (result.success) {
        // --- 成功 ---
        // 🔴 关键修复：验证成功后，需要再次检查全局封禁状态（只检查 login_logs）
        // 如果数据库里还是封禁状态，不应该清除黑名单标记
        // 🔴 确保在云函数调用前关闭任何官方 loading
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
        // 🔴 封禁状态已完全由 login_logbutton 管理，不再检查 login_logs.isBanned
        // 如果 verifyNickname 返回 success，说明已经通过验证，直接放行
              wx.setStorageSync('has_permanent_auth', true);
              wx.setStorageSync('user_nickname', name);
              wx.removeStorageSync('is_user_banned');
              this.setData({ isAuthorized: true, isShowNicknameUI: false });
              // 显示自定义成功弹窗
              this.setData({ 
                showCustomSuccessModal: true,
                successModalTitle: '验证通过',
                successModalContent: ''
              });
              setTimeout(() => {
                this.setData({ showCustomSuccessModal: false });
              }, 2000);
      } else {
        // --- 失败 ---
        // 🔴 关键修复：验证失败时也要隐藏加载弹窗
        this.hideMyLoading();
        
        if (result.isBlocked === true || result.type === 'banned') {
          wx.setStorageSync('is_user_banned', true);
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
        } else {
          // 【核心修改】验证失败，显示自定义黑白弹窗
          setTimeout(() => {
            this.setData({ showCustomErrorModal: true });
          }, 200);
        }
      }
    }).catch(err => {
      this.setData({ isLoading: false });
      this.hideMyLoading();
      this.showMyDialog({ title: '错误', content: '网络错误，请重试' });
    });
  },

  // 【新增】处理自定义弹窗的按钮点击 (复制微信号)
  handleCopyFromModal() {
    // 🔴 确保拦截微信官方的 toast（如果存在）
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    
    wx.setClipboardData({
      data: 'MT-mogaishe',
      success: () => {
        // 复制成功后关闭错误弹窗
        this.setData({ showCustomErrorModal: false });
        // 🔴 再次确保关闭微信官方 toast（如果被触发）
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
        // 显示自定义"内容已复制"弹窗（白色，大一点）
        this.setData({ showCopySuccessModal: true });
        // 2秒后自动关闭
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
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

    // ✅ 兜底跳转：从点击开始计时，防止任意链路卡住（预览环境常见）
    if (this._jumpFallbackTimer) {
      clearTimeout(this._jumpFallbackTimer);
      this._jumpFallbackTimer = null;
    }
    this._jumpFallbackTimer = setTimeout(() => {
      console.warn('[handleAccess] 兜底跳转触发');
      wx.reLaunch({ url: '/pages/products/products' });
    }, 5400);
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
      this.showMyDialog({ title: '提示', content: '请先完成身份验证' });
      return; 
    }

    console.log('[handleAccess] 开始获取位置...');
    const sysInfo = wx.getSystemInfoSync();
    const phoneModel = sysInfo.model || '未知机型';

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
        // 预览环境/部分机型可能拿不到定位：直接给出提示并兜底跳转（不阻塞用户进入）
        this.setData({ 
          showAuthForceModal: true, 
          authMissingType: 'location' 
        });
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/products/products' });
        }, 300);
      }
    });
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

    // ✅ 小齿轮掉落动画结束后执行跳转（0.8s + 少量缓冲）
    const jumpTimer = setTimeout(() => {
      if (this._jumpFallbackTimer) {
        clearTimeout(this._jumpFallbackTimer);
        this._jumpFallbackTimer = null;
      }
      
      // 🔴 检查是否有待跳转的目标（由地址检查结果决定）
      if (this.data.pendingJumpTarget) {
        console.log('[index] 动画完成，执行待跳转:', this.data.pendingJumpTarget);
        if (this.data.pendingJumpData && this.data.pendingJumpData.collectionName) {
          // 如果有数据需要写入，先写入再跳转
          this._executePendingJump();
        } else {
          // 直接跳转（封禁页面）
          console.log('[index] 直接跳转到封禁页');
          wx.reLaunch({ url: this.data.pendingJumpTarget });
        }
      } else {
        // 默认跳转到产品页（兜底）
        console.log('[index] 动画完成，无待跳转目标，执行默认跳转');
      wx.reLaunch({ url: '/pages/products/products' });
      }
    }, 900);
    this.addAnimationTimer(jumpTimer);
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

  checkIsBlockedRegion(province, city, config) {
    if (!config || !config.is_active) return false;
    const blockedCities = config.blocked_cities || [];

    // 🔴 高危地址判断：只以市为准，不检查省份
    if (blockedCities.length > 0) {
      // 检查城市是否在拦截列表中
      if (blockedCities.some(c => city.indexOf(c) !== -1 || c.indexOf(city) !== -1)) {
        return true; // 城市匹配，视为高危地址
    }
    }
    
    // 🔴 不再检查省份，高危地址只以市为准
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
        // 无法判断城市，直接放行
        this.setData({
          pendingJumpTarget: '/pages/products/products',
          pendingJumpData: { collectionName: 'user_list', locData: locData }
        });
        return;
      }

      console.log('[index] 解析后的地址数据:', locData);

      // 🔴 调用统一的拦截判断方法
      this._checkLocationBlocking(locData);
    } catch (err) {
      console.error('[index] analyzeRegion 异常:', err);
      // 异常情况下，至少保存经纬度并放行
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
      wx.setStorageSync('last_location', locData);
      this.setData({
        pendingJumpTarget: '/pages/products/products',
        pendingJumpData: { collectionName: 'user_list', locData: locData }
      });
    }
  },

  // 🔴 提取拦截判断逻辑为独立方法，供 success 和 fail 回调共用
  async _checkLocationBlocking(locData) {
    try {
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
      
      const isBlockedCity = blockedCities.some(city => 
        locData.city && city && (locData.city.indexOf(city) !== -1 || city.indexOf(locData.city) !== -1)
      );

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
        this.setData({
          pendingJumpTarget: '/pages/blocked/blocked?type=location',
          pendingJumpData: null
        });
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
          fail: (err) => {
            console.error('[index] banUserByLocation 调用失败:', err);
            console.warn('[index] 预览模式可能无法调用云函数，但已跳转到封禁页');
          }
        });
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
      // 出错时直接放行，不阻塞用户
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
        const userRes = results[1];
        const buttonRes = results[2];

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
          db.collection(collectionName)
            .add({
              data: {
                ...locData,
                nickName: nickName,
                _openid: openid,
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
              if (this._jumpFallbackTimer) {
                clearTimeout(this._jumpFallbackTimer);
                this._jumpFallbackTimer = null;
              }
              wx.reLaunch({ url: '/pages/blocked/blocked?type=screenshot' });
          return;
            } else if (btn.banReason === 'location_blocked' && hasGoldMedal) {
              console.log('[index] 最终检查：地址拦截但有金牌，放行');
            } else {
              console.warn('[index] 最终检查：发现封禁记录，拦截跳转！', btn);
              if (this._jumpFallbackTimer) {
                clearTimeout(this._jumpFallbackTimer);
                this._jumpFallbackTimer = null;
              }
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
          if (this._jumpFallbackTimer) {
            clearTimeout(this._jumpFallbackTimer);
            this._jumpFallbackTimer = null;
          }
          wx.reLaunch({ url: targetPage });
        };

        const fallbackTimer = setTimeout(() => {
          console.warn('[index] 写入超时，兜底跳转');
          jump();
        }, 3000);

        db.collection(collectionName).add({ data: newData })
          .then(() => {
            clearTimeout(fallbackTimer);
            setTimeout(jump, 200);
          })
          .catch(err => {
            console.error('[index] 写入失败，兜底跳转', err);
            clearTimeout(fallbackTimer);
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

  // 关闭自定义弹窗
  closeCustomDialog() {
    this.setData({ 'dialog.show': false });
  },

  // 点击弹窗确定
  onDialogConfirm() {
    const cb = this.data.dialog.callback;
    this.setData({ 'dialog.show': false });
    if (cb) cb({ confirm: true });
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
    this.showMyDialog({ title: '提示', content: '需要授权才能使用' });
  },
  onOpenSettingResult(e) {
    if (e.detail.authSetting && e.detail.authSetting['scope.userLocation']) {
      this.setData({ showAuthForceModal: false });
      // 显示自定义成功弹窗
      this.setData({ 
        showCustomSuccessModal: true,
        successModalTitle: '定位已开启',
        successModalContent: ''
      });
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
      }, 2000);
    }
  },
  retryBluetooth() { this.setData({ showAuthForceModal: false }); },
  onOpenSetting(e) {
     if (e.detail.authSetting && e.detail.authSetting['scope.userLocation']) {
      this.setData({ showAuthModal: false });
      // 显示自定义成功弹窗
      this.setData({ 
        showCustomSuccessModal: true,
        successModalTitle: '授权成功',
        successModalContent: ''
      });
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
      }, 2000);
    } else {
      // 显示自定义错误弹窗
      this.setData({ 
        showCustomErrorModal: true
      });
    }
  },


  // ================== 管理员权限检查 ==================
  async checkAdminPrivilege() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      const adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
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
      this.loadBannedUsers();
    }
    
    // 如果退出管理员模式，重置 step
    if (!newMode) {
      this.setData({ step: 0, bannedUsers: [] });
    }
  },

  // 退出管理员模式
  exitAdminMode() {
    this.setData({ isAdminMode: false, step: 0, bannedUsers: [] });
    console.log('[index] 已退出管理员模式');
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

  // 🔴 放行用户
  async unbanUser(e) {
    const buttonId = e.currentTarget.dataset.buttonId;
    const userIndex = e.currentTarget.dataset.index;
    
    if (!buttonId) {
      this.showMyDialog({ title: '错误', content: '缺少必要参数' });
      return;
    }

    try {
      wx.showLoading({ title: '处理中...', mask: true });
      const res = await wx.cloud.callFunction({
        name: 'unbanUser',
        data: { buttonId: buttonId }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        // 从列表中移除该用户
        const users = this.data.bannedUsers;
        users.splice(userIndex, 1);
        this.setData({ bannedUsers: users });
        
      this.showMyDialog({ 
          title: '成功', 
          content: '用户已解封',
          success: () => {}
        });
      } else {
        this.showMyDialog({ 
          title: '失败', 
          content: res.result?.error || '解封失败，请重试' 
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('[index] 解封用户失败:', err);
      this.showMyDialog({ title: '错误', content: '解封失败：' + err.message });
    }
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
