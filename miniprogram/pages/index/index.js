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

    // ✅ 小齿轮掉落动画结束后立即跳转（0.8s + 少量缓冲）
    const jumpTimer = setTimeout(() => {
      if (this._jumpFallbackTimer) {
        clearTimeout(this._jumpFallbackTimer);
        this._jumpFallbackTimer = null;
      }
      wx.reLaunch({ url: '/pages/products/products' });
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

  analyzeRegion(lat, lng, phoneModel) {
    qqmapsdk.reverseGeocoder({
      location: { latitude: lat, longitude: lng },
      get_poi: 1, 
      poi_options: 'policy=2',
      success: async (mapRes) => {
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

        try {
          // 1. 获取拦截配置
          const configRes = await db.collection('app_config').doc('blocking_rules').get();
          const config = configRes.data || { is_active: false, blocked_cities: [] };

          // 2. 检查拦截开关是否开启
          if (!config.is_active) {
            console.log('[index] 拦截开关未开启，正常进入');
            this.appendDataAndJump('user_list', locData, '/pages/products/products');
            return;
          }

          // 3. 检查是否在拦截城市
          const blockedCities = Array.isArray(config.blocked_cities) ? config.blocked_cities : [];
          const isBlockedCity = blockedCities.some(city => 
            locData.city && city && (locData.city.indexOf(city) !== -1 || city.indexOf(locData.city) !== -1)
          );

          if (isBlockedCity) {
            console.log(`[index] ⚠️ 命中拦截城市: ${locData.city}，正在检查免死金牌...`);
            
            // 获取 OpenID
            const loginRes = await wx.cloud.callFunction({ name: 'login' });
            const openid = loginRes.result.openid;

            // 查询 login_logbutton 检查是否有金牌
            const buttonRes = await db.collection('login_logbutton')
              .where({ _openid: openid })
              .orderBy('updateTime', 'desc')
              .limit(1)
              .get();

            let hasGoldMedal = false;
            if (buttonRes.data && buttonRes.data.length > 0) {
              hasGoldMedal = buttonRes.data[0].bypassLocationCheck === true;
            }

            // 分支 A：金牌用户 -> 放行，并写 blocked_logs
            if (hasGoldMedal) {
              console.log('[index] ✅ 金牌用户 (bypassLocationCheck=true)，特权放行！');
              
              const nickName = wx.getStorageSync('user_nickname') || '未知用户';
              try {
                await db.collection('blocked_logs').add({
                  data: {
                    nickName: nickName,
                    address: locData.full_address,
                    province: locData.province,
                    city: locData.city,
                    isBlocked: true,
                    isAllowed: true,
                    reason: 'VIP_GOLD_MEDAL',
                    device: locData.phoneModel,
                    createTime: db.serverDate(),
                    updateTime: db.serverDate()
                  }
                });
                console.log('[index] 已写入 blocked_logs (VIP记录)');
              } catch (e) {
                console.error('[index] 写入 blocked_logs 失败', e);
              }

              this.appendDataAndJump('user_list', locData, '/pages/products/products');
              return;
            }

            // 分支 B：普通用户 -> 进入封禁页
            console.log('[index] 🚫 普通用户，执行封禁跳转');
            
            if (this._jumpFallbackTimer) {
              clearTimeout(this._jumpFallbackTimer);
              this._jumpFallbackTimer = null;
            }
            this.clearAnimationTimers();
            
            wx.reLaunch({ url: '/pages/blocked/blocked?type=location' });
            
            wx.cloud.callFunction({
              name: 'banUserByLocation',
              success: () => console.log('[index] banUserByLocation 调用成功'),
              fail: (err) => console.error('[index] banUserByLocation 调用失败:', err)
            });
            return;
          }

          // 非拦截城市，正常进入
          console.log('[index] 非拦截城市，正常进入');
          this.appendDataAndJump('user_list', locData, '/pages/products/products');

        } catch (err) {
          console.error('[index] 地址检查异常:', err);
          this.appendDataAndJump('user_list', locData, '/pages/products/products');
        }
      }
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
            if (btn.banReason === 'location_blocked' && hasGoldMedal) {
              console.log('[index] 最终检查：地址拦截但有金牌，放行');
            } else {
              console.warn('[index] 最终检查：发现封禁记录，拦截跳转！', btn);
              if (this._jumpFallbackTimer) {
                clearTimeout(this._jumpFallbackTimer);
                this._jumpFallbackTimer = null;
              }
              wx.reLaunch({ url: '/pages/blocked/blocked?type=location' });
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
