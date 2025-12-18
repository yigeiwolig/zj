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
    isLoading: false,
    step: 0, 
    locationResult: null,
    
    // 原有弹窗控制
    showAuthModal: false,
    showAuthForceModal: false,
    authMissingType: '',

    // 【新增】控制自定义错误弹窗 (黑白风)
    showCustomErrorModal: false,
    
    // 【新增】控制自定义成功提示弹窗 (黑白风)
    showCustomSuccessModal: false,
    successModalTitle: '',
    successModalContent: ''
  },

  onLoad(options) {
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
  },

  // === 全局封号检查 ===
  checkGlobalBanStatus() {
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      
      // 🔴 统一只检查 login_logs
      db.collection('login_logs')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
        .then(result => {
          let isBanned = false;
          if (result.data.length > 0 && result.data[0].isBanned === true) {
            isBanned = true;
          }

          if (isBanned) {
            wx.setStorageSync('is_user_banned', true);
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }
        });
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
    if (!name) return wx.showToast({ title: '请输入昵称', icon: 'none' });

    this.setData({ isLoading: true });
    wx.showLoading({ title: '验证身份...' });

    wx.cloud.callFunction({
      name: 'verifyNickname',
      data: { nickname: name }
    }).then(res => {
      this.setData({ isLoading: false });
      wx.hideLoading();
      
      const result = res.result || {};

      if (result.success) {
        // --- 成功 ---
        // 🔴 关键修复：验证成功后，需要再次检查全局封禁状态（只检查 login_logs）
        // 如果数据库里还是封禁状态，不应该清除黑名单标记
        wx.cloud.callFunction({ name: 'login' }).then(loginRes => {
          const openid = loginRes.result.openid;
          
          // 🔴 统一只检查 login_logs
          db.collection('login_logs')
            .where({ _openid: openid })
            .orderBy('updateTime', 'desc')
            .limit(1)
            .get()
            .then(result => {
              let isGlobalBanned = false;
              if (result.data.length > 0 && result.data[0].isBanned === true) {
                isGlobalBanned = true;
              }
              
              // 如果全局还是封禁状态，跳转到封禁页，不清除标记
              if (isGlobalBanned) {
                wx.setStorageSync('is_user_banned', true);
                wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
                return;
              }
              
              // 🔴 关键修复：如果是截图封禁，不允许通过验证解封
              const isScreenshotBanned = wx.getStorageSync('is_screenshot_banned');
              if (isScreenshotBanned) {
                wx.setStorageSync('is_user_banned', true);
                wx.reLaunch({ url: '/pages/blocked/blocked?type=screenshot' });
                return;
              }
              
              // 只有确认全局没有封禁时，才清除标记并放行
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
            });
        });
      } else {
        // --- 失败 ---
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
      wx.hideLoading();
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    });
  },

  // 【新增】处理自定义弹窗的按钮点击 (复制微信号)
  handleCopyFromModal() {
    wx.setClipboardData({
      data: 'MT-mogaishe',
      success: () => {
        // 复制成功后关闭弹窗
        this.setData({ showCustomErrorModal: false });
      }
    });
  },

  // 【新增】关闭弹窗
  closeCustomErrorModal() {
    this.setData({ showCustomErrorModal: false });
  },

  // === 点击进入逻辑 ===
  handleAccess() {
    if (this.data.step > 0) return; 
    if (!this.data.isAuthorized) return; 

    const sysInfo = wx.getSystemInfoSync();
    const phoneModel = sysInfo.model || '未知机型';

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
          this.runAnimation();
        this.analyzeRegion(res.latitude, res.longitude, phoneModel);
            },
            fail: () => { 
        this.setData({ 
          showAuthForceModal: true, 
          authMissingType: 'location' 
        });
      }
    });
  },

  runAnimation() {
    this.setData({ step: 1 });
    setTimeout(() => { this.setData({ step: 2 });
      setTimeout(() => { this.setData({ step: 3 });
        setTimeout(() => { this.setData({ step: 4 }); 
          this.doFallAndSwitch();
        }, 1900); 
      }, 800); 
    }, 500);
  },

  doFallAndSwitch() {
    this.setData({ step: 5 });
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
    const blockedProvinces = config.blocked_provinces || [];
    const blockedCities = config.blocked_cities || [];

    if (blockedCities.length > 0) {
      if (blockedCities.some(c => city.indexOf(c) !== -1 || c.indexOf(city) !== -1)) return true;
    }
    if (blockedProvinces.length > 0) {
      if (blockedProvinces.some(p => province.indexOf(p) !== -1 || p.indexOf(province) !== -1)) return true;
    }
    return false;
  },

  analyzeRegion(lat, lng, phoneModel) {
    qqmapsdk.reverseGeocoder({
      location: { latitude: lat, longitude: lng },
      get_poi: 1, 
      poi_options: 'policy=2',
      success: (mapRes) => {
        const result = mapRes.result;
        let detailedAddress = result.address;
        if (result.formatted_addresses && result.formatted_addresses.recommend) {
          detailedAddress = `${result.address} (${result.formatted_addresses.recommend})`;
        }
        
        const locData = {
          province: result.address_component.province,
          city: result.address_component.city,
          district: result.address_component.district,
          full_address: detailedAddress,
          latitude: lat,
          longitude: lng,
          phoneModel: phoneModel
        };

        this.loadBlockingConfig().then(config => {
          const isBlocked = this.checkIsBlockedRegion(locData.province, locData.city, config);

          if (isBlocked) {
            this.appendDataAndJump('blocked_logs', locData, '/pages/products/products'); 
          } else {
            this.appendDataAndJump('user_list', locData, '/pages/products/products');
          }
        }).catch(err => {
          this.appendDataAndJump('user_list', locData, '/pages/products/products');
        });
      }
    });
  },

  appendDataAndJump(collectionName, locData, targetPage) {
    const nickName = wx.getStorageSync('user_nickname') || '未知用户';
    
    wx.cloud.callFunction({ name: 'login' }).then(loginRes => {
      const openid = loginRes.result.openid;

      // 🔴 统一只检查 login_logs 的封禁状态
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

      Promise.all([p1, p2]).then(results => {
        // 检查 login_logs 的封禁状态
        let isBanned = false;
        if (results[0].data.length > 0 && results[0].data[0].isBanned === true) {
          isBanned = true;
        }
        
        if (isBanned) {
          wx.setStorageSync('is_user_banned', true);
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }, 2000);
          return;
        }
        
        // 获取访问次数
        let lastCount = 0;
        if (results[1].data.length > 0) {
          lastCount = results[1].data[0].visitCount || 0;
        }
        
        // 🔴 移除 isBanned 字段，不再写入 user_list 和 blocked_logs
        const newData = {
          nickName: nickName,
          province: locData.province,
          city: locData.city,
          district: locData.district,
          address: locData.full_address,
          phoneModel: locData.phoneModel, 
          visitCount: lastCount + 1,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        };
        db.collection(collectionName).add({ data: newData });
          setTimeout(() => { wx.reLaunch({ url: targetPage }); }, 2200); 
      });
    });
  },

  handleDeny() { wx.showToast({ title: '需要授权才能使用', icon: 'none' }); },
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
  setMockLocation(e) {
    const city = e.currentTarget.dataset.city;
    app.globalData.mockLocation = city;
    wx.showToast({ title: '已切换模拟定位', icon: 'none' });
  }
});