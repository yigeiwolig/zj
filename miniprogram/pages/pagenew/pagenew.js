// pages/pagenew/pagenew.js
const app = getApp()

Page({
  data: {
    // 🔴 导航栏高度相关
    statusBarHeight: 44,
    navBarHeight: 44,
    
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式
    currentIndex: 0,
    products: [], 
    defaultCover: '',
    
    // 新增：自定义编辑弹窗
    showCustomEditModal: false,
    customEditTitle: '',
    customEditVal: '',
    customEditCallback: null,
    customEditModalClosing: false // 编辑弹窗退出动画中
  },

  onLoad: function() {
    // #region agent log
    wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'miniprogram/pages/pagenew/pagenew.js:onLoad',message:'onLoad called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'loading-trace',hypothesisId:'A'},fail:()=>{}});
    // #endregion
    // 🔴 计算导航栏高度（适配所有机型）
    this.calcNavBarInfo();
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('pagenew');
    }
    
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true });
      this.db = wx.cloud.database();
      this.fetchProducts();
    }
    
    // 检查管理员权限
    this.checkAdminPrivilege();

    // 🔴 初始化截屏/录屏封号保护
    this.initScreenshotProtection();

    // 🔴 首次进入时检查封禁状态
    this.checkBanStatus();
  },

  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }

    // 🔴 回到页面时再次检查封禁状态
    this.checkBanStatus();
  },

  onHide() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
  },

  onUnload() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
  },

  // ================== 权限检查逻辑 ==================
  async checkAdminPrivilege() {
    // #region agent log
    wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'miniprogram/pages/pagenew/pagenew.js:checkAdminPrivilege',message:'checkAdminPrivilege called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'loading-trace',hypothesisId:'C'},fail:()=>{}});
    // #endregion
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
        this.setData({ isAuthorized: true });
        console.log('[pagenew.js] 身份验证成功：合法管理员');
      }
    } catch (err) {
      console.error('[pagenew.js] 权限检查失败', err);
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    // #region agent log
    wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'miniprogram/pages/pagenew/pagenew.js:toggleAdminMode',message:'toggleAdminMode called',data:{isAuthorized:this.data.isAuthorized,isAdmin:this.data.isAdmin},timestamp:Date.now(),sessionId:'debug-session',runId:'admin-toggle',hypothesisId:'A'},fail:()=>{}});
    // #endregion
    console.log('[pagenew] toggleAdminMode called, isAuthorized:', this.data.isAuthorized, 'isAdmin:', this.data.isAdmin);
    
    if (!this.data.isAuthorized) {
      console.log('[pagenew] 无权限，显示提示');
      this._showCustomToast('无权限', 'none');
      return;
    }
    const nextState = !this.data.isAdmin;
    console.log('[pagenew] 切换管理员模式，新状态:', nextState);
    this.setData({ isAdmin: nextState });
    this._showCustomToast(nextState ? '管理模式开启' : '已回到用户模式', 'none');
  },

  // 🔴 计算导航栏高度（标准方法，适配所有机型）
  calcNavBarInfo() {
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = (gap * 2) + menuButton.height;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      // 降级方案：使用默认值
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  // 左上角返回
  goBack: function() {
    wx.navigateBack({
      fail: () => { wx.reLaunch({ url: '/pages/index/index' }); }
    });
  },

  // 读取数据
  fetchProducts: function() {
    // #region agent log
    wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'miniprogram/pages/pagenew/pagenew.js:fetchProducts',message:'fetchProducts called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'loading-trace',hypothesisId:'B'},fail:()=>{}});
    // #endregion
    var _this = this;
    this.db.collection('products').get().then(res => {
      // 确保每个产品都有jumpNumber字段
      const products = (res.data || []).map(item => ({
        ...item,
        jumpNumber: item.jumpNumber || null
      }));
      _this.setData({ products: products });
      console.log('[pagenew] 加载产品列表成功，数量:', products.length);
    }).catch(console.error);
  },

  onSwiperChange: function(e) {
    this.setData({ currentIndex: e.detail.current });
  },


  // 1. 新增
  handleAddNew: function() {
    var _this = this;
    wx.showLoading({ title: '创建中' }); // 🔴 保留原生 Loading（因为自定义组件可能没有实现）
    const newProduct = { title: 'New Product', price: '0', cover: '' }; // 不再需要 details 字段
    this.db.collection('products').add({ data: newProduct }).then(() => {
      wx.hideLoading();
      this._showCustomToast('已创建', 'success');
      _this.fetchProducts();
    });
  },

  // 2. 改名
  handleEditTitle: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    wx.showModal({
      title: '修改标题', editable: true, content: item.title,
      success(res) {
        if (res.confirm && res.content) {
          _this.setData({ [`products[${idx}].title`]: res.content });
          _this.db.collection('products').doc(item._id).update({ data: { title: res.content } });
        }
      }
    });
  },

  // 3. 改价
  handleEditPrice: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    wx.showModal({
      title: '修改价格', editable: true, content: item.price,
      success(res) {
        if (res.confirm && res.content) {
          _this.setData({ [`products[${idx}].price`]: res.content });
          _this.db.collection('products').doc(item._id).update({ data: { price: res.content } });
        }
      }
    });
  },

  // 4. 删除
  handleDeleteProduct: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    this._showCustomModal({
      title: '删除', 
      content: '确认删除？', 
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success(res) {
        if(res.confirm) {
          _this.db.collection('products').doc(item._id).remove().then(() => {
            _this.setData({ currentIndex: 0 });
            _this.fetchProducts();
          });
        }
      }
    });
  },

  // 5. 换图
  handleUploadCover: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: function(res) {
        var path = res.tempFiles[0].tempFilePath;
        _this.setData({ [`products[${idx}].cover`]: path }); // 预览
        _this.uploadFile(path, 'cover').then(id => {
          _this.db.collection('products').doc(item._id).update({ data: { cover: id } });
        });
      }
    });
  },

  uploadFile: function(path, prefix) {
    return new Promise((resolve, reject) => {
      var suffix = path.match(/\.[^.]+?$/)[0] || '.png';
      wx.cloud.uploadFile({
        cloudPath: 'mt_products/' + prefix + '_' + Date.now() + suffix,
        filePath: path,
        success: res => resolve(res.fileID),
        fail: reject
      });
    });
  },

  // 触发管理员（已废弃旧逻辑）
  handleTitleClick: function() {
    // 废弃旧逻辑，不再使用
  },
  
  // ========================================================
  // 点击卡片：根据号码跳转到shop页面
  // ========================================================
  handleCardClick: function(e) {
    // 管理员模式下，点击卡片不跳转（由号码编辑按钮处理）
    if (this.data.isAdmin) {
      return;
    }
    
    const index = e.currentTarget.dataset.index;
    const product = this.data.products[index];
    
    // 如果没有号码，静默返回，不显示任何提示
    if (!product || !product.jumpNumber) {
      return;
    }
    
    // 快速跳转到shop页面（静默跳转，失败也不提示）
    wx.navigateTo({
      url: `/pages/shop/shop?jumpNumber=${product.jumpNumber}`,
      animationType: 'none', // 禁用动画，加快跳转速度
      fail: (err) => {
        // 静默处理，不显示错误提示
        console.log('[pagenew] 跳转失败（静默）:', err);
      }
    });
  },
  
  // ========================================================
  // 编辑跳转号码（带唯一性校验）
  // ========================================================
  handleEditJumpNumber: function(e) {
    // 注意：微信小程序中，使用catchtap已经阻止了冒泡，不需要stopPropagation
    
    if (!this.data.isAdmin) {
      this._showCustomToast('请先进入管理员模式', 'none');
      return;
    }
    
    const idx = parseInt(e.currentTarget.dataset.index);
    const product = this.data.products[idx];
    
    if (!product) {
      this._showCustomToast('产品数据错误', 'none');
      return;
    }
    
    const currentNumber = product.jumpNumber ? product.jumpNumber.toString() : '';
    
    this._input(currentNumber, (v) => {
      // 校验：必须是纯数字
      const numValue = v.trim();
      if (numValue && !/^\d+$/.test(numValue)) {
        this._showCustomToast('号码必须是纯数字', 'none');
        return;
      }
      
      // 校验：唯一性（检查products集合中所有产品的号码）
      if (numValue) {
        this.db.collection('products')
          .where({
            jumpNumber: parseInt(numValue)
          })
          .get()
          .then(res => {
            // 检查是否有其他产品使用了这个号码
            const otherProduct = res.data.find(item => item._id !== product._id);
            if (otherProduct) {
              this._showCustomToast('号码已存在，请使用其他号码', 'none');
              return;
            }
            
            // 更新数据
            this.updateProductJumpNumber(product._id, parseInt(numValue), idx);
          })
          .catch(err => {
            console.error('[pagenew] 校验号码失败:', err);
            this._showCustomToast('校验失败', 'none');
          });
      } else {
        // 清空号码
        this.updateProductJumpNumber(product._id, null, idx);
      }
    });
  },
  
  // ========================================================
  // 更新产品号码到云端
  // ========================================================
  updateProductJumpNumber: function(productId, jumpNumber, localIdx) {
    if (!this.db || !productId) {
      this._showCustomToast('数据错误', 'none');
      return;
    }
    
    this.db.collection('products').doc(productId).update({
      data: { jumpNumber: jumpNumber }
    }).then(() => {
      // 更新本地数据
      const updatedProducts = [...this.data.products];
      updatedProducts[localIdx].jumpNumber = jumpNumber;
      this.setData({ products: updatedProducts });
      this._showCustomToast('号码已更新', 'success');
    }).catch(err => {
      console.error('[pagenew] 更新号码失败:', err);
      this._showCustomToast('更新失败', 'none');
    });
  },
  
  // ========================================================
  // 通用输入弹窗
  // ========================================================
  _input: function(initVal, callback) {
    this.setData({
      showCustomEditModal: true,
      customEditTitle: '编辑跳转号码',
      customEditVal: initVal || '',
      customEditCallback: callback
    });
  },
  
  onCustomEditInput: function(e) {
    this.setData({ customEditVal: e.detail.value });
  },
  
  closeCustomEditModal: function() {
    this.setData({ customEditModalClosing: true });
    setTimeout(() => {
      this.setData({
        showCustomEditModal: false,
        customEditTitle: '',
        customEditVal: '',
        customEditCallback: null,
        customEditModalClosing: false
      });
    }, 420);
  },
  
  closeCustomEditModal() {
    this.setData({ customEditModalClosing: true });
    setTimeout(() => {
      this.setData({
        showCustomEditModal: false,
        customEditTitle: '',
        customEditVal: '',
        customEditCallback: null,
        customEditModalClosing: false
      });
    }, 420);
  },
  
  confirmCustomEdit: function() {
    const callback = this.data.customEditCallback;
    if (callback) {
      callback(this.data.customEditVal);
    }
    this.closeCustomEditModal();
  },

  // 空函数，用于阻止事件冒泡和滚动
  noop() {},

  // ===============================================
  // 🔴 统一的自定义弹窗方法（替换所有 wx.showModal 和 wx.showToast）
  // ===============================================
  
  // 🔴 统一的自定义 Toast 方法（替换所有 wx.showToast）
  _showCustomToast(title, icon = 'none', duration = 2000) {
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showToast) {
        toast.showToast({ title, icon, duration });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级
        console.warn('[pagenew] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 🔴 统一的自定义 Modal 方法（替换所有 wx.showModal，除了 editable 的情况）
  _showCustomModal(options) {
    // 如果 editable 为 true，使用原生（因为自定义组件不支持输入框）
    if (options.editable) {
      return wx.showModal(options);
    }
    
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showModal) {
        toast.showModal({
          title: options.title || '提示',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          success: options.success
        });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级
        console.warn('[pagenew] custom-toast 组件未找到，使用降级方案');
        wx.showModal(options);
      }
    };
    tryShow();
  },

  // ================= 截屏 / 录屏封号逻辑（与 products 页保持一致） =================

  // 🔴 计算位置信息和设备信息
  async _getLocationAndDeviceInfo() {
    const sysInfo = wx.getSystemInfoSync();
    const deviceInfo = {
      deviceInfo: sysInfo.system || '',
      phoneModel: sysInfo.model || ''
    };
    
    const cachedLocation = wx.getStorageSync('last_location');
    if (cachedLocation && cachedLocation.province && cachedLocation.city) {
      return {
        ...cachedLocation,
        ...deviceInfo
      };
    }
    
    try {
      const locationRes = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        });
      });

      const lat = locationRes.latitude;
      const lng = locationRes.longitude;

      const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
      const addressData = await reverseGeocodeWithRetry(lat, lng, {
        maxRetries: 3,
        timeout: 10000,
        retryDelay: 1000
      });

      return {
        ...addressData,
        ...deviceInfo
      };
    } catch (err) {
      console.error('[pagenew] 获取位置信息失败:', err);
      if (cachedLocation) {
        return {
          ...cachedLocation,
          ...deviceInfo
        };
      }
      return deviceInfo;
    }
  },

  // 🔴 截屏/录屏拦截：本地立即封禁 + 云端记录
  async handleIntercept(type) {
    wx.removeStorageSync('has_permanent_auth');
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[pagenew] 🔴 截屏/录屏检测，立即跳转封禁页');
    this._jumpToBlocked(type);

    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type,
        banPage: 'pagenew',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      }
    });

    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type,
          banPage: 'pagenew',
          ...locationData
        }
      });
    }).catch(() => {});
  },

  _jumpToBlocked(type) {
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      return;
    }

    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: () => {
        app.globalData._isJumpingToBlocked = false;
        wx.exitMiniProgram();
      }
    });
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('[pagenew] 🛡️ 硬件级防偷拍锁定')
      });
    }

    wx.onUserCaptureScreen(() => {
      this.handleIntercept('screenshot');
    });

    if (wx.onUserScreenRecord) {
      wx.onUserScreenRecord(() => {
        this.handleIntercept('record');
      });
    }
  },

  // 🔴 检查封禁状态（与 products 保持同一套规则）
  async checkBanStatus() {
    try {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();

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

      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        if (qiangli) {
          console.log('[pagenew] ⚠️ 检测到强制封禁（login_logbutton）');
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }

      if (logRes.data && logRes.data.length > 0) {
        const log = logRes.data[0];
        const qiangli = log.qiangli === true || log.qiangli === 1 || log.qiangli === 'true' || log.qiangli === '1';
        if (qiangli) {
          console.log('[pagenew] ⚠️ 检测到强制封禁（login_logs）');
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }

      const adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();

      if (adminCheck.data && adminCheck.data.length > 0) {
        console.log('[pagenew] ✅ 管理员豁免封禁检查');
        return;
      }

      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const rawFlag = btn.isBanned;
        const isBanned = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
        if (isBanned) {
          console.log('[pagenew] 检测到封禁状态，跳转封禁页');
          const banType = btn.banReason === 'screenshot' || btn.banReason === 'screen_record'
            ? 'screenshot'
            : (btn.banReason === 'location_blocked' ? 'location' : 'banned');
          wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
          return;
        }
      }
    } catch (err) {
      const msg = (err.errMsg || err.message || '') + '';
      if (msg.indexOf('access_token') !== -1) {
        console.warn('[pagenew] 云会话未就绪，跳过封禁检查');
        return;
      }
      console.error('[pagenew] 检查封禁状态失败:', err);
    }
  }
})