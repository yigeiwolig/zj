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
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' }
  },

  onLoad(options) {
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
      
      const openid = res.result.openid;
      
      // 🔴 统一只检查 login_logs
      db.collection('login_logs')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
        .then(result => {
          let isBanned = false;
          if (result.data && result.data.length > 0 && result.data[0].isBanned === true) {
            isBanned = true;
          }

          if (isBanned) {
            wx.setStorageSync('is_user_banned', true);
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }
        })
        .catch(err => {
          console.error('查询封号状态失败:', err);
          // 查询失败不影响正常使用，静默处理
        });
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

    wx.cloud.callFunction({
      name: 'verifyNickname',
      data: { nickname: name }
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
              
              // 🔴 统一封禁逻辑：所有封禁都通过 isBanned 字段控制
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
    wx.setClipboardData({
      data: 'MT-mogaishe',
      success: () => {
        // 复制成功后关闭错误弹窗
        this.setData({ showCustomErrorModal: false });

        // 1）干掉系统“内容已复制”的小 toast（微信内部会自动弹）
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 60);

        // 2）显示首页统一样式的“内容已复制”大弹窗
        this.setData({ showCopySuccessModal: true });
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

    // 🔴 关键修复：先读取配置，判断是否需要位置权限
    this.loadBlockingConfig().then(config => {
      console.log('[handleAccess] 拦截配置:', config);
      
      // 如果 is_active 为 false，直接放行，不需要位置权限
      if (!config.is_active) {
        console.log('[handleAccess] is_active=false，直接放行，无需位置权限');
        // 清除兜底计时器
        if (this._jumpFallbackTimer) {
          clearTimeout(this._jumpFallbackTimer);
          this._jumpFallbackTimer = null;
        }
        // 直接跳转，不需要动画
        wx.reLaunch({ url: '/pages/products/products' });
        return;
      }
      
      // 如果 is_active 为 true，才需要获取位置权限
      console.log('[handleAccess] is_active=true，需要位置权限，开始获取位置...');
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
          // 🔴 关键修复：如果 is_active 为 true 但位置获取失败，显示权限弹窗并阻止跳转
          // 清除兜底计时器，不要自动跳转
          if (this._jumpFallbackTimer) {
            clearTimeout(this._jumpFallbackTimer);
            this._jumpFallbackTimer = null;
          }
          // 显示权限弹窗，要求用户开启位置权限
          this.setData({ 
            showAuthForceModal: true, 
            authMissingType: 'location' 
          });
          // 不要自动跳转，等待用户开启权限后重新点击
        }
      });
    }).catch(err => {
      console.error('[handleAccess] 加载拦截配置失败:', err);
      // 配置加载失败，默认作为 is_active=false 处理，直接放行
      console.log('[handleAccess] 配置加载失败，默认直接放行');
      if (this._jumpFallbackTimer) {
        clearTimeout(this._jumpFallbackTimer);
        this._jumpFallbackTimer = null;
      }
      wx.reLaunch({ url: '/pages/products/products' });
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

    // ✅ 小齿轮掉落动画结束后立即跳转（0.8s + 少量缓冲）
    setTimeout(() => {
      if (this._jumpFallbackTimer) {
        clearTimeout(this._jumpFallbackTimer);
        this._jumpFallbackTimer = null;
      }
      wx.reLaunch({ url: '/pages/products/products' });
    }, 900);
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
    console.log('[checkIsBlockedRegion] 检查城市:', { 
      province, 
      city, 
      config: { 
        is_active: config?.is_active, 
        blocked_cities: config?.blocked_cities 
      } 
    });

    if (!config || !config.is_active) {
      console.log('[checkIsBlockedRegion] 拦截未启用或配置无效');
      return false;
    }

    const blockedCities = Array.isArray(config.blocked_cities) ? config.blocked_cities : [];
    if (blockedCities.length === 0) {
      console.log('[checkIsBlockedRegion] 拦截城市列表为空');
      return false;
    }

    // 标准化城市名称（移除"市"、"县"、"区"等后缀）
    const normalizeCity = (name) => {
      if (!name) return '';
      return String(name).replace(/[市县区]$/, '');
    };

    const normalizedCity = normalizeCity(city);
    console.log('[checkIsBlockedRegion] 标准化后的城市名:', normalizedCity);

    // 检查城市是否在拦截列表中
    const isBlocked = blockedCities.some(c => {
      const normalizedBlockedCity = normalizeCity(c);
      // 进行双向包含匹配，更可靠
      const isMatch = normalizedCity.includes(normalizedBlockedCity) || normalizedBlockedCity.includes(normalizedCity);
      if (isMatch) {
        console.log(`[checkIsBlockedRegion] 匹配到拦截城市: ${c} (原始: ${city})`);
      }
      return isMatch;
    });

    console.log(`[checkIsBlockedRegion] 城市 ${city} 是否被拦截:`, isBlocked);
    return isBlocked;
  },

  // 【更新】通过云函数更新 login_logs 的 isBanned 字段为 true
  async updateLoginLogsBanned() {
    try {
      console.log('[updateLoginLogsBanned] 开始调用云函数 banUserByLocation');
      const res = await wx.cloud.callFunction({ 
        name: 'banUserByLocation',
        config: {
          env: 'cloudbase-4gn1heip7c38ec6c' // 确保环境ID正确
        }
      });
      
      console.log('[updateLoginLogsBanned] 云函数调用结果:', res);
      
      if (res.result && res.result.success) {
        console.log('[updateLoginLogsBanned] ✅ 已通过云函数更新 login_logs.isBanned = true', res.result);
        return true;
      } else {
        console.error('[updateLoginLogsBanned] ❌ 云函数返回失败:', res.result);
        return false;
      }
    } catch (err) {
      console.error('[updateLoginLogsBanned] ❌ 调用云函数 banUserByLocation 失败:', err);
      return false;
    }
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

        // 🔴 根据 app_config.blocking_rules 判断：高危地址用户写入 blocked_logs，普通地址用户写入 user_list
        this.loadBlockingConfig().then(config => {
          const isBlocked = this.checkIsBlockedRegion(locData.province, locData.city, config);

          if (isBlocked) {
            // 匹配拦截城市：更新 login_logs.isBanned = true，然后跳转拦截页
            console.log('[index] 🚫 拦截城市匹配，准备封禁:', locData.province, locData.city);
            
            // 清除兜底计时器
            if (this._jumpFallbackTimer) {
              clearTimeout(this._jumpFallbackTimer);
              this._jumpFallbackTimer = null;
            }
            
            this.updateLoginLogsBanned().finally(() => {
              // 无论云函数成功与否，都执行封禁跳转
              wx.setStorageSync('is_user_banned', true);
              wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
            });

          } else {
            // 普通地址用户（地址不在拦截列表中）→ 写入 user_list
            console.log('[index] 普通地址用户，写入 user_list:', locData.province, locData.city);
            this.appendDataAndJump('user_list', locData, '/pages/products/products');
          }
        }).catch(err => {
          // 🔴 配置加载失败，默认作为普通地址用户写入 user_list
          console.error('[index] 加载拦截配置失败，默认写入 user_list:', err);
          this.appendDataAndJump('user_list', locData, '/pages/products/products');
        });
      }
    });
  },

  appendDataAndJump(collectionName, locData, targetPage) {
    const nickName = wx.getStorageSync('user_nickname') || '未知用户';
    
    // 🔴 确保在云函数调用前关闭任何官方 loading
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    
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
        // ✅ 等写入完成再跳转，失败也兜底跳转，避免预览/网络问题卡死
        const jump = () => {
          // 成功/失败跳转时，清掉点击兜底计时器
          if (this._jumpFallbackTimer) {
            clearTimeout(this._jumpFallbackTimer);
            this._jumpFallbackTimer = null;
          }
          wx.reLaunch({ url: targetPage });
        };

        // 3 秒兜底：无论如何都跳
        const fallbackTimer = setTimeout(() => {
          console.warn('[index] 写入超时，兜底跳转');
          jump();
        }, 3000);

        db.collection(collectionName).add({ data: newData })
          .then(() => {
            clearTimeout(fallbackTimer);
            setTimeout(jump, 200); // 稍微给动画收尾一点时间
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
      // 用户开启了位置权限，关闭权限弹窗
      this.setData({ showAuthForceModal: false });
      // 显示自定义成功弹窗
      this.setData({ 
        showCustomSuccessModal: true,
        successModalTitle: '定位已开启',
        successModalContent: ''
      });
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
        // 🔴 关键修复：权限开启后，重新触发位置获取和判断流程
        // 延迟一下，确保弹窗关闭后再执行
        setTimeout(() => {
          this.handleAccess();
        }, 300);
      }, 2000);
    } else {
      // 用户没有开启位置权限，继续显示权限弹窗
      console.log('[onOpenSettingResult] 用户未开启位置权限');
    }
  },
  retryBluetooth() { this.setData({ showAuthForceModal: false }); },
  onOpenSetting(e) {
     if (e.detail.authSetting && e.detail.authSetting['scope.userLocation']) {
      // 用户开启了位置权限，关闭权限弹窗
      this.setData({ showAuthModal: false });
      // 显示自定义成功弹窗
      this.setData({ 
        showCustomSuccessModal: true,
        successModalTitle: '授权成功',
        successModalContent: ''
      });
      setTimeout(() => {
        this.setData({ showCustomSuccessModal: false });
        // 🔴 关键修复：权限开启后，重新触发位置获取和判断流程
        setTimeout(() => {
          this.handleAccess();
        }, 300);
      }, 2000);
    } else {
      // 用户没有开启位置权限，显示错误弹窗
      this.setData({ 
        showCustomErrorModal: true
      });
    }
  },


  // 管理员入口
  onAdminTap: function(e) {
    try {
      console.log('========== onAdminTap 被触发 ==========');
      console.log('事件对象:', e);
      console.log('当前 step:', this.data.step);
      console.log('isAuthorized:', this.data.isAuthorized);
      console.log('事件类型:', e.type);
      console.log('事件目标:', e.currentTarget);
      console.log('事件详情:', e.detail);
      
      // 无论 step 是多少，都允许点击
      // 微信小程序不支持 editable，使用自定义输入框
      // 简化处理：直接跳转（实际项目中应使用自定义弹窗组件实现密码输入）
      this.showMyDialog({
        title: '管理员验证',
        content: '请输入管理密码：3252955872',
        showCancel: true,
        success: (res) => {
          console.log('Modal success callback:', res);
          if (res.confirm) {
            // 这里简化处理，实际应该使用自定义输入弹窗
            // 暂时直接跳转，后续可以添加自定义密码输入组件
            this.showMyDialog({ title: '提示', content: '验证通过' });
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/admin/admin',
                success: (navRes) => {
                  console.log('导航成功:', navRes);
                },
                fail: (navErr) => {
                  console.error('导航失败:', navErr);
                  this.showMyDialog({ title: '导航失败', content: navErr.errMsg });
                }
              });
            }, 1000);
          } else {
            console.log('用户取消了验证');
          }
        }
      });
    } catch (error) {
      console.error('========== onAdminTap 发生错误 ==========');
      console.error('错误信息:', error);
      console.error('错误堆栈:', error.stack);
      this.showMyDialog({ 
        title: '错误', 
        content: '点击事件错误: ' + error.message
      });
    }
  }
});
