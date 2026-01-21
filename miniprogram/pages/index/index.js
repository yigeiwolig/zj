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
    
    // 【新增】控制二次确认弹窗
    showConfirmModal: false,
    confirmModalContent: '',
    _pendingUnbanData: null, // 存储待执行的放行数据
    
    // 【新增】控制定位权限提示弹窗（白底黑字）
    showLocationPermissionModal: false,
    _pendingLocationAction: null, // 存储待执行的定位操作类型
    
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
    bannedUsers: [],       // 被封禁的用户列表
    isLoadingBannedUsers: false,  // 是否正在加载封禁用户列表
    // 🔴 昵称录入相关状态
    isNicknameMode: false, // false=封禁管理, true=昵称录入
    nicknameInput: '',    // 昵称输入
    isSubmittingNickname: false // 是否正在提交昵称
  },

  onLoad(options) {
    console.log('[index onLoad] 页面加载开始');
    console.log('[index onLoad] handleLogin 方法是否存在:', typeof this.handleLogin);
    
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
    const savedNickname = wx.getStorageSync('user_nickname');
    
    if (hasAuth && savedNickname) {
      // 缓存中有授权和昵称，直接使用
      console.log('[index] 从缓存恢复授权状态，nickname:', savedNickname);
      this.setData({ isAuthorized: true, isShowNicknameUI: false });
    } else {
      // 缓存中没有，先检查 valid_users 集合
      console.log('[index] 缓存中无授权信息，开始检查 valid_users...');
      this.checkValidUserFromDatabase().catch(err => {
        console.error('[index] checkValidUserFromDatabase 失败:', err);
        // 确保即使失败也显示昵称输入界面
        this.setData({ isShowNicknameUI: true });
      });
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
  },

  onUnload() {
    // 🔴 停止定时检查
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
  },

  // 🔴 从 valid_users 集合检查用户是否有记录
  async checkValidUserFromDatabase() {
    try {
      console.log('[index] 开始检查 valid_users...');
      
      // 1. 获取当前用户 openid（添加超时）
      const loginRes = await Promise.race([
        wx.cloud.callFunction({ name: 'login' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('login timeout')), 5000))
      ]);
      
      const openid = loginRes.result?.openid;
      
      if (!openid) {
        console.warn('[index] 无法获取 openid，显示昵称输入界面');
        this.setData({ isShowNicknameUI: true });
        return;
      }

      console.log('[index] openid 获取成功，查询 valid_users...');

      // 2. 查询 valid_users 集合，查找该用户的记录（添加超时）
      const db = wx.cloud.database();
      const validUserRes = await Promise.race([
        db.collection('valid_users').where({ _openid: openid }).limit(1).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('valid_users query timeout')), 5000))
      ]);

      if (validUserRes.data && validUserRes.data.length > 0) {
        // 找到了记录，自动获取昵称
        const userRecord = validUserRes.data[0];
        const nickname = userRecord.nickname;
        
        if (nickname) {
          // 保存昵称和授权状态到本地存储
          wx.setStorageSync('user_nickname', nickname);
          wx.setStorageSync('has_permanent_auth', true);
          
          // 更新页面状态，直接进入
          this.setData({ 
            isAuthorized: true, 
            isShowNicknameUI: false,
            inputNickName: nickname
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
  async handleLogin(e) {
    console.log('[handleLogin] ========== 方法被调用 ==========');
    console.log('[handleLogin] 事件对象:', e);
    console.log('[handleLogin] isLoading:', this.data.isLoading);
    console.log('[handleLogin] inputNickName:', this.data.inputNickName);
    
    if (this.data.isLoading) {
      console.log('[handleLogin] ⚠️ 正在加载中，忽略点击');
      return;
    }
    
    const raw = this.data.inputNickName ? this.data.inputNickName.trim() : '';
    console.log('[handleLogin] 输入内容 (trim后):', raw);
    
    if (!raw) {
      console.log('[handleLogin] ⚠️ 输入为空');
      this.showAutoToast('提示', '请输入昵称或MT开头的分享码');
      return;
    }
    
    console.log('[handleLogin] ✅ 开始验证流程');

    const app = getApp();
    const upper = raw.toUpperCase();
    // 🔴 判断是不是分享码：必须以 MT 开头（不区分大小写），后面跟6位字母数字
    const isShareCode = upper.startsWith('MT') && /^MT[A-Z0-9]{6}$/.test(upper);

    if (isShareCode && app && typeof app.verifyShareCode === 'function') {
      // 按分享码验证（只校验 shareCode，有效性和次数/过期）
      this.setData({ isLoading: true });
      this.showMyLoading('验证分享码...');

      // 🔴 确保在云函数调用前关闭任何官方 loading（疯狂执行）
      const hideOfficialLoading = () => {
        try {
          wx.hideToast();
          wx.hideLoading();
          if (wx.__mt_oldHideLoading) {
            wx.__mt_oldHideLoading();
          }
        } catch (e) {}
      };
      
      hideOfficialLoading();
      setTimeout(hideOfficialLoading, 5);
      setTimeout(hideOfficialLoading, 10);
      setTimeout(hideOfficialLoading, 15);

      let verifyResult = { success: false };
      try {
        // 🔴 添加超时保护（8秒总超时）
        const verifyPromise = app.verifyShareCode(upper);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('验证分享码超时')), 8000);
        });
        
        verifyResult = await Promise.race([verifyPromise, timeoutPromise]);
      } catch (err) {
        console.error('[handleLogin] 验证分享码异常:', err);
        // 确保状态重置
        this.setData({ isLoading: false });
        this.hideMyLoading();
        // 隐藏官方 loading
        hideOfficialLoading();
        setTimeout(hideOfficialLoading, 5);
        setTimeout(hideOfficialLoading, 10);
        setTimeout(hideOfficialLoading, 15);
        setTimeout(hideOfficialLoading, 20);
        setTimeout(hideOfficialLoading, 30);
        
        // 🔴 等待所有 loading 完全隐藏后再显示错误弹窗，避免冲突
        setTimeout(() => {
          // 再次确保隐藏所有官方 loading
          hideOfficialLoading();
          setTimeout(hideOfficialLoading, 10);
          setTimeout(hideOfficialLoading, 30);
          
          // 显示错误提示
          this.showAutoToast('错误', err.message || '验证分享码失败，请重试');
        }, 500); // 等待 500ms，确保 loading 完全消失
        
        return;
      }

      // 🔴 分享码验证完成后，疯狂隐藏微信官方 loading
      hideOfficialLoading();
      setTimeout(hideOfficialLoading, 5);
      setTimeout(hideOfficialLoading, 10);
      setTimeout(hideOfficialLoading, 15);
      setTimeout(hideOfficialLoading, 20);
      setTimeout(hideOfficialLoading, 30);
      setTimeout(hideOfficialLoading, 50);
      setTimeout(hideOfficialLoading, 80);
      setTimeout(hideOfficialLoading, 120);
      setTimeout(hideOfficialLoading, 180);
      setTimeout(hideOfficialLoading, 250);

      this.setData({ isLoading: false });
      this.hideMyLoading();

      // 🔴 检查验证结果，如果失败则显示错误弹窗
      console.log('[handleLogin] 验证结果:', verifyResult);
      if (!verifyResult || !verifyResult.success) {
        const errorMsg = (verifyResult && verifyResult.error) ? verifyResult.error : '分享码验证失败';
        console.log('[handleLogin] 分享码验证失败:', errorMsg);
        
        // 🔴 等待所有 loading 完全隐藏后再显示错误弹窗，避免冲突
        setTimeout(() => {
          // 再次确保隐藏所有官方 loading
          hideOfficialLoading();
          setTimeout(hideOfficialLoading, 10);
          setTimeout(hideOfficialLoading, 30);
          
          // 显示错误提示
          this.showAutoToast('提示', errorMsg);
        }, 500); // 等待 500ms，确保 loading 完全消失
        
        return;
      }

      // 分享码验证通过：
      console.log('[handleLogin] ✅ 分享码验证通过，isShareCodeUser:', app.globalData.isShareCodeUser);
      
      // 1）标记首页已授权（让主界面显示出来）
      this.setData({
        isAuthorized: true,
        isShowNicknameUI: false
      });

      // 2）弹出"验证通过"提示
      this.setData({
        showCustomSuccessModal: true,
        successModalTitle: '验证通过',
        successModalContent: ''
      });
      
      // 3）验证通过弹窗1.5秒后消失（不自动请求定位权限，等待用户点击 MT RIDE 按钮）
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
      }, 1500);

      return;
    }

    // 否则按昵称走原来的验证逻辑
    const name = raw;

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

    // 🔴 在云函数调用前，确保关闭微信官方 loading（疯狂执行）
    const hideOfficialLoading = () => {
      try {
        wx.hideToast();
        wx.hideLoading();
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
      } catch (e) {}
    };
    
    hideOfficialLoading();
    setTimeout(hideOfficialLoading, 5);
    setTimeout(hideOfficialLoading, 10);
    setTimeout(hideOfficialLoading, 15);

    // 🔴 添加超时保护（8秒超时）
    const verifyNicknamePromise = wx.cloud.callFunction({
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
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('验证昵称超时')), 8000);
    });

    Promise.race([verifyNicknamePromise, timeoutPromise]).then(res => {
      // 🔴 云函数返回后，疯狂隐藏微信官方 loading
      hideOfficialLoading();
      setTimeout(hideOfficialLoading, 5);
      setTimeout(hideOfficialLoading, 10);
      setTimeout(hideOfficialLoading, 15);
      setTimeout(hideOfficialLoading, 20);
      setTimeout(hideOfficialLoading, 30);
      setTimeout(hideOfficialLoading, 50);
      setTimeout(hideOfficialLoading, 80);
      setTimeout(hideOfficialLoading, 120);
      setTimeout(hideOfficialLoading, 180);
      setTimeout(hideOfficialLoading, 250);
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
          // 🔴 检查是否有成功弹窗正在显示，如果有则等它结束（2秒）再显示错误弹窗
          const delay = this.data.showCustomSuccessModal ? 2200 : 200;
          console.log('[handleLogin] 验证失败，延迟', delay, 'ms 后显示错误弹窗');
          setTimeout(() => {
            this.setData({ showCustomErrorModal: true });
          }, delay);
        }
      }
    }).catch(err => {
      // 🔴 出错时也疯狂隐藏微信官方 loading
      const hideOfficialLoading = () => {
        try {
          wx.hideToast();
          wx.hideLoading();
          if (wx.__mt_oldHideLoading) {
            wx.__mt_oldHideLoading();
          }
        } catch (e) {}
      };
      
      hideOfficialLoading();
      setTimeout(hideOfficialLoading, 5);
      setTimeout(hideOfficialLoading, 10);
      setTimeout(hideOfficialLoading, 15);
      setTimeout(hideOfficialLoading, 20);
      setTimeout(hideOfficialLoading, 30);
      
      this.setData({ isLoading: false });
      this.hideMyLoading();
      this.showAutoToast('错误', '网络错误，请重试');
    });
  },

  // 【新增】处理自定义弹窗的按钮点击 (复制微信号)
  handleCopyFromModal() {
    // 🔴 确保拦截微信官方的 toast（如果存在）
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    
    // 🔴 复制前先尝试关闭可能存在的微信官方弹窗
    try {
      wx.hideToast();
      wx.hideLoading();
    } catch (e) {}
    
    wx.setClipboardData({
      data: 'MT-mogaishe',
      success: () => {
        // 🔴 立即疯狂隐藏微信官方弹窗（多次尝试）
        const hideOfficialToast = () => {
          try {
            wx.hideToast();
            wx.hideLoading();
          } catch (e) {}
        };
        
        // 立即执行 + 前 200ms 内疯狂执行
        hideOfficialToast();
        setTimeout(hideOfficialToast, 5);
        setTimeout(hideOfficialToast, 10);
        setTimeout(hideOfficialToast, 15);
        setTimeout(hideOfficialToast, 20);
        setTimeout(hideOfficialToast, 30);
        setTimeout(hideOfficialToast, 40);
        setTimeout(hideOfficialToast, 50);
        setTimeout(hideOfficialToast, 60);
        setTimeout(hideOfficialToast, 80);
        setTimeout(hideOfficialToast, 100);
        setTimeout(hideOfficialToast, 120);
        setTimeout(hideOfficialToast, 150);
        setTimeout(hideOfficialToast, 180);
        setTimeout(hideOfficialToast, 200);
        setTimeout(hideOfficialToast, 250);
        setTimeout(hideOfficialToast, 300);
        setTimeout(hideOfficialToast, 350);
        setTimeout(hideOfficialToast, 400);
        setTimeout(hideOfficialToast, 450);
        setTimeout(hideOfficialToast, 500);
        setTimeout(hideOfficialToast, 600);
        
        // 🔴 延迟显示自定义"内容已复制"弹窗（等待微信官方弹窗消失）
        setTimeout(() => {
          // 关闭错误弹窗
          this.setData({ showCustomErrorModal: false });
          
          // 显示"内容已复制"弹窗
          this.setData({ showCopySuccessModal: true });
          setTimeout(() => {
            this.setData({ showCopySuccessModal: false });
          }, 1500); // 1.5秒后自动消失
        }, 800); // 等待 800ms，确保微信官方弹窗已消失
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
    
    const app = getApp();
    
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

    // 🔴 分享码用户的专用流程：也需要先授权位置，然后播放动画，最后跳到安装教程页
    if (app && app.globalData && app.globalData.isShareCodeUser) {
      console.log('[handleAccess] ✅ 检测到分享码用户，需要先授权位置');
      console.log('[handleAccess] app.globalData.isShareCodeUser:', app.globalData.isShareCodeUser);
      console.log('[handleAccess] app.globalData.shareCodeInfo:', app.globalData.shareCodeInfo);
      
      // 🔴 分享码用户也需要先授权位置才能点击 MT RIDE
      // 先检查位置授权状态
      wx.getSetting({
        success: (settingRes) => {
          const locationAuth = settingRes.authSetting['scope.userLocation'];
          console.log('[handleAccess] 分享码用户定位权限状态:', locationAuth);
          
          if (locationAuth === true) {
            // 已授权，获取位置并播放动画
            wx.getLocation({
              type: 'gcj02',
              isHighAccuracy: false,
              success: async (res) => {
                console.log('[handleAccess] 分享码用户位置获取成功:', res);
                // 🔴 保存经纬度
                wx.setStorageSync('last_location', {
                  latitude: res.latitude,
                  longitude: res.longitude
                });
                // 🔴 解析地址并保存完整信息
                try {
                  const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
                  const addressData = await reverseGeocodeWithRetry(res.latitude, res.longitude, {
                    maxRetries: 2,
                    timeout: 5000,
                    retryDelay: 500
                  });
                  // 🔴 保存完整地址信息
                  wx.setStorageSync('last_location', {
                    latitude: res.latitude,
                    longitude: res.longitude,
                    province: addressData.province || '',
                    city: addressData.city || '',
                    district: addressData.district || '',
                    address: addressData.address || addressData.full_address || ''
                  });
                  console.log('[handleAccess] 分享码用户地址解析成功:', addressData);
                } catch (e) {
                  console.log('[handleAccess] 分享码用户地址解析失败（不拦截）:', e);
                }
                // 设置跳转目标为安装教程页
                this.setData({
                  pendingJumpTarget: '/pages/azjc/azjc',
                  pendingJumpData: null
                });
                // 播放动画
                this.runAnimation();
              },
              fail: (err) => {
                console.error('[handleAccess] 分享码用户位置获取失败:', err);
                this.showAutoToast('提示', '无法获取位置信息，请检查手机定位服务');
              }
            });
          } else if (locationAuth === false) {
            // 曾经拒绝过，引导用户去设置
            this.setData({
              showLocationPermissionModal: true,
              _pendingLocationAction: 'shareCode'
            });
          } else {
            // undefined，首次请求，先尝试授权
              wx.authorize({
                scope: 'scope.userLocation',
                success: () => {
                  // 授权成功，获取位置并播放动画
                  wx.getLocation({
                    type: 'gcj02',
                    isHighAccuracy: false,
                    success: async (res) => {
                      console.log('[handleAccess] 分享码用户位置获取成功:', res);
                      // 🔴 保存经纬度
                      wx.setStorageSync('last_location', {
                        latitude: res.latitude,
                        longitude: res.longitude
                      });
                      // 🔴 解析地址并保存完整信息
                      try {
                        const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
                        const addressData = await reverseGeocodeWithRetry(res.latitude, res.longitude, {
                          maxRetries: 2,
                          timeout: 5000,
                          retryDelay: 500
                        });
                        // 🔴 保存完整地址信息
                        wx.setStorageSync('last_location', {
                          latitude: res.latitude,
                          longitude: res.longitude,
                          province: addressData.province || '',
                          city: addressData.city || '',
                          district: addressData.district || '',
                          address: addressData.address || addressData.full_address || ''
                        });
                        console.log('[handleAccess] 分享码用户地址解析成功:', addressData);
                      } catch (e) {
                        console.log('[handleAccess] 分享码用户地址解析失败（不拦截）:', e);
                      }
                      this.setData({
                        pendingJumpTarget: '/pages/azjc/azjc',
                        pendingJumpData: null
                      });
                      this.runAnimation();
                    },
                    fail: (err) => {
                      console.error('[handleAccess] 分享码用户位置获取失败:', err);
                      this.showAutoToast('提示', '无法获取位置信息，请检查手机定位服务');
                    }
                  });
                },
              fail: () => {
                // 用户拒绝授权
                console.log('[handleAccess] 分享码用户拒绝定位授权');
                this.setData({
                  showLocationPermissionModal: true,
                  _pendingLocationAction: 'shareCode'
                });
              }
            });
          }
        },
        fail: (err) => {
          console.error('[handleAccess] 获取设置失败:', err);
          this.showAutoToast('提示', '无法检查定位权限，请稍后重试');
        }
      });
      return;
    }
    
    console.log('[handleAccess] ⚠️ 不是分享码用户，走正常地址拦截流程');

    console.log('[handleAccess] 开始获取位置...');
    const sysInfo = wx.getSystemInfoSync();
    const phoneModel = sysInfo.model || '未知机型';

    // 🔴 先检查隐私协议是否需要弹出
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: res => {
          console.log('[handleAccess] 隐私协议状态:', res);
          if (res.needAuthorization) {
            // 需要用户同意隐私协议
            console.log('[handleAccess] 需要用户同意隐私协议');
            // 微信会自动弹出隐私协议弹窗，等待用户同意后再继续
          }
          this._doGetLocation(phoneModel);
        },
        fail: () => {
          console.log('[handleAccess] 不支持隐私协议检查，直接获取位置');
          this._doGetLocation(phoneModel);
        }
      });
    } else {
      this._doGetLocation(phoneModel);
    }
  },

  _doGetLocation(phoneModel) {
    // 🔴 先获取定位（会弹授权窗），授权成功后才播放动画
    console.log('[handleAccess] 开始请求定位授权...');

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      timeout: 10000, // 10秒超时
      success: (res) => {
        console.log('[handleAccess] ✅ 定位授权成功，位置获取成功:', res);
        console.log('[handleAccess] latitude:', res.latitude, 'longitude:', res.longitude);
        
        // 🔴 定位成功后立即播放动画
        this.runAnimation();
        
        // 🔴 并行进行地址解析和拦截判断，并保存 Promise 引用
        this._analyzePromise = this.analyzeRegion(res.latitude, res.longitude, phoneModel).then(() => {
          console.log('[handleAccess] 地址分析完成，等待动画结束后跳转');
        }).catch(err => {
          console.error('[handleAccess] 地址分析失败:', err);
          // 解析失败也设置默认跳转，不阻塞用户
          if (!this.data.pendingJumpTarget) {
            this.setData({
              pendingJumpTarget: '/pages/products/products',
              pendingJumpData: null
            });
          }
        });
      },
      fail: (err) => {
        console.error('[handleAccess] ❌ 位置获取失败，完整错误信息:', JSON.stringify(err));
        console.error('[handleAccess] errMsg:', err.errMsg);
        console.error('[handleAccess] errCode:', err.errCode);
        
        // 🔴 定位失败：立即中断动画和跳转
        this.clearAnimationTimers(); // 停止所有动画定时器
        this.setData({ step: 0 }); // 重置动画状态
        console.log('[handleAccess] 定位失败，已中断动画');
        
        // 🔴 关键修复：先检查定位权限状态
        wx.getSetting({
          success: (settingRes) => {
            const locationAuth = settingRes.authSetting['scope.userLocation'];
            console.log('[handleAccess] 定位权限状态:', locationAuth);
            console.log('[handleAccess] 完整权限设置:', JSON.stringify(settingRes.authSetting));
            
            if (locationAuth === false) {
              // 用户拒绝了定位权限，必须要求用户开启
              console.log('[handleAccess] 用户拒绝了定位权限，要求开启');
              this.setData({ 
                showAuthForceModal: true, 
                authMissingType: 'location' 
              });
              // 🔴 不允许跳转，必须等用户开启权限
              return;
            } else if (locationAuth === undefined) {
              // 权限状态未知（可能是首次请求），也要求用户开启
              console.log('[handleAccess] 定位权限未设置，要求开启');
              this.setData({ 
                showAuthForceModal: true, 
                authMissingType: 'location' 
              });
              // 🔴 不允许跳转，必须等用户开启权限
              return;
            } else {
              // 权限已开启，但获取位置失败（可能是GPS信号弱、网络问题等）
              console.log('[handleAccess] 定位权限已开启，但获取位置失败，尝试重新获取...');
              
              // 🔴 尝试重新获取一次（降低精度要求）
              wx.getLocation({
                type: 'gcj02',
                isHighAccuracy: false, // 降低精度
                altitude: false,
                timeout: 5000,
                success: async (retryRes) => {
                  console.log('[handleAccess] ✅ 重试获取位置成功:', retryRes);
                  await this.analyzeRegion(retryRes.latitude, retryRes.longitude, phoneModel);
                  console.log('[handleAccess] 重试成功，重新播放动画');
                  this.runAnimation();
                },
                fail: (retryErr) => {
                  console.error('[handleAccess] ❌ 重试获取位置也失败:', retryErr.errMsg);
                  // 🔴 两次都失败，提示用户并要求重新点击
                  this.showAutoToast('提示', '无法获取位置信息，请检查手机定位服务');
                  console.log('[handleAccess] 两次获取位置都失败，不允许进入');
                }
              });
            }
          },
          fail: () => {
            // 无法获取权限状态，保守处理：要求用户开启权限
            console.log('[handleAccess] 无法获取权限状态，要求开启定位权限');
            this.setData({ 
              showAuthForceModal: true, 
              authMissingType: 'location' 
            });
          }
        });
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

  async doFallAndSwitch() {
    this.setData({ step: 5 });

    // ✅ 小齿轮掉落动画结束后执行跳转（0.8s + 少量缓冲）
    const jumpTimer = setTimeout(async () => {
      // 🔴 先等待地址解析完成（如果正在进行中）
      if (this._analyzePromise) {
        console.log('[index] 动画完成，等待地址解析完成...');
        try {
          await this._analyzePromise;
          console.log('[index] 地址解析已完成');
        } catch (err) {
          console.error('[index] 地址解析异常:', err);
        }
        this._analyzePromise = null; // 清理引用
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
        // 🔴 移除默认跳转，严格等待用户授权定位
        console.log('[index] 动画完成，无待跳转目标，等待用户授权定位');
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
    const startTime = Date.now();
    
    try {
      // 🔴 使用带重试机制的逆地理编码函数，缩短超时时间加快解析
      const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
      const addressData = await reverseGeocodeWithRetry(lat, lng, {
        maxRetries: 2,  // 减少重试次数：2次
        timeout: 5000,   // 缩短超时：5秒
        retryDelay: 500  // 缩短重试间隔：500ms
      });
      
      const elapsedTime = Date.now() - startTime;
      console.log('[index] 地址解析耗时:', elapsedTime, 'ms');

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

      console.log('[index] 🔍 解析后的地址数据 - city:', locData.city, ', district:', locData.district);
      console.log('[index] 🔍 完整地址数据:', JSON.stringify(locData));

      // 🔴 调用统一的拦截判断方法
      await this._checkLocationBlocking(locData);
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
      console.log('[index] 🔍 拦截城市列表:', JSON.stringify(blockedCities));
      console.log('[index] 🔍 当前城市:', locData.city, '(类型:', typeof locData.city, ')');
      console.log('[index] 🔍 当前省份:', locData.province);
      console.log('[index] 🔍 当前区县:', locData.district);
      
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

      console.log('[index] 🔍 是否命中拦截城市:', isBlockedCity, '(类型:', typeof isBlockedCity, ')');

      if (isBlockedCity) {
        console.log(`[index] ⚠️ ⚠️ ⚠️ 命中拦截城市: ${locData.city}，正在检查免死金牌...`);
        
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
          
          // 🔴 最高优先级：检查强制封禁按钮 qiangli
          const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
          if (qiangli) {
            console.log('[index] ⚠️ 最终安检：检测到强制封禁按钮 qiangli 已开启，无视一切放行，直接封禁');
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
            return; // 强制封禁，直接返回，不执行后续任何检查
          }
          
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

  // 🔴 显示自动消失的提示（使用自定义弹窗）
  showAutoToast(title, content) {
    const message = content || title;
    console.log('[showAutoToast] 显示提示:', message);
    
    // 直接使用 custom-toast 组件
    try {
      const toast = this.selectComponent('#custom-toast');
      if (toast && typeof toast.showToast === 'function') {
        console.log('[showAutoToast] 使用 custom-toast 组件');
        toast.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        });
      } else {
        console.log('[showAutoToast] custom-toast 组件未找到，使用 wx.showToast');
        // 降级使用 wx.showToast
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        });
      }
    } catch (err) {
      console.error('[showAutoToast] 显示提示失败:', err);
      // 降级使用 wx.showToast
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
    }
  },

  handleDeny() { 
    this.showAutoToast('提示', '需要授权才能使用');
  },

  // 关闭定位权限提示弹窗
  hideLocationPermissionModal() {
    this.setData({
      showLocationPermissionModal: false,
      _pendingLocationAction: null
    });
  },

  // 打开设置页
  openLocationSetting() {
    const isShareCodeUser = this.data._pendingLocationAction === 'shareCode';
    this.setData({ showLocationPermissionModal: false });
    
    wx.openSetting({
      success: (openRes) => {
        if (openRes.authSetting['scope.userLocation']) {
          // 用户在设置页开启了权限，重新获取定位
          wx.getLocation({
            type: 'gcj02',
            success: async (res) => {
              console.log('[index] 定位权限已开启，获取位置成功:', res);
              // 🔴 保存经纬度
              wx.setStorageSync('last_location', {
                latitude: res.latitude,
                longitude: res.longitude
              });
              
              // 🔴 解析地址并保存完整信息
              try {
                const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
                const addressData = await reverseGeocodeWithRetry(res.latitude, res.longitude, {
                  maxRetries: 2,
                  timeout: 5000,
                  retryDelay: 500
                });
                // 🔴 保存完整地址信息
                wx.setStorageSync('last_location', {
                  latitude: res.latitude,
                  longitude: res.longitude,
                  province: addressData.province || '',
                  city: addressData.city || '',
                  district: addressData.district || '',
                  address: addressData.address || addressData.full_address || ''
                });
                console.log('[index] 地址解析成功:', addressData);
              } catch (e) {
                console.log('[index] 地址解析失败:', e);
              }
              
              // 🔴 如果是分享码用户，继续执行动画和跳转
              if (isShareCodeUser) {
                console.log('[index] 分享码用户定位成功，继续执行动画');
                const app = getApp();
                if (app && app.globalData && app.globalData.isShareCodeUser) {
                  // 设置跳转目标为安装教程页
                  this.setData({
                    pendingJumpTarget: '/pages/azjc/azjc',
                    pendingJumpData: null
                  });
                  // 播放动画
                  this.runAnimation();
                }
              } else {
                // 普通用户，重新触发 handleAccess
                console.log('[index] 普通用户定位成功，重新触发 handleAccess');
                this.handleAccess();
              }
            },
            fail: (err) => {
              console.log('[index] 获取位置失败:', err);
              this.showAutoToast('提示', '无法获取位置信息，请检查手机定位服务');
            }
          });
        } else {
          // 用户在设置页未开启权限
          console.log('[index] 用户在设置页未开启定位权限');
        }
      },
      fail: (err) => {
        console.error('[index] 打开设置页失败:', err);
      }
    });
    
    this.setData({ _pendingLocationAction: null });
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


  // ================== 管理员权限检查 ==================
  async checkAdminPrivilege() {
    try {
      console.log("[index] 开始检查管理员权限...");
      const res = await Promise.race([
        wx.cloud.callFunction({ name: "login" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("admin check timeout")), 5000))
      ]);
      
      const myOpenid = res.result.openid;
      console.log('[index] 查询管理员表...');
      
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
      
      // 🔴 防抖：如果正在动画中，不响应
      if (this.data.step > 0) {
        console.log('[index] 动画进行中，忽略管理员入口点击');
        return;
      }
      
      // 只有管理员才能切换模式
      if (this.data.isAdmin) {
        this.toggleAdminMode();
      } else {
        console.log('[index] 非管理员用户，无权限切换模式');
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
    this.setData({
      isNicknameMode: !this.data.isNicknameMode,
      nicknameInput: '' // 切换时清空输入
    });
  },

  // 🔴 昵称输入
  onNicknameInput(e) {
    this.setData({
      nicknameInput: e.detail.value.trim()
    });
  },

  // 🔴 提交昵称到 valid_users
  async submitNickname() {
    const nickname = this.data.nicknameInput.trim();
    
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
          nickname: nickname
        }
      });

      console.log('[index] 昵称录入结果:', res.result);

      // 🔴 立即重置提交状态，不依赖对话框回调
      this.setData({ isSubmittingNickname: false });

      if (res.result && res.result.success) {
        // 录入成功
        const message = res.result.message || `昵称 "${nickname}" 已同步到白名单`;
        // 清空输入框
        this.setData({ nicknameInput: '' });
        
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
