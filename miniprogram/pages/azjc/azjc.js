const db = wx.cloud.database();

Page({
  data: {
    // 🔴 状态栏高度
    statusBarHeight: 44,
    
    // 🔴 分享码用户标识
    isShareCodeUser: false,
    shareCodeViewsExhausted: false, // 分享码查看次数是否已用完（用于隐藏教程内容）
    
    // 基础交互数据
    isVideoFullScreen: false,
    fullScreenVideoUrl: '', // 🔴 全屏视频URL
    fullScreenVideoIndex: -1, // 🔴 全屏视频索引
    stepIndex: 0,
    pageTitle: '请选择产品', // 🔴 动态标题
    pIndex: -1,
    tIndex: -1,
    mode: 'v',
    showAll: false, // 显示全部模式（管理员专用）
    startY: 0,
    scrollToId: 'step1',
    canScroll: false,

    // 管理员相关
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式
    
    // 匹配码选择弹窗
    showMatchCodePicker: false,
    matchCodePickerClosing: false, // 匹配码选择器退出动画中
    availableProducts: [], // 可用的产品列表（已创建的）
    availableTypes: [], // 可用的车型列表（已创建的）
    matchCodeProductNum: 1,
    matchCodeTypeNum: 1,
    matchCodeProductIndex: 0,
    matchCodeTypeIndex: 0,
    currentProductName: '',
    currentTypeName: '',
    tempUploadData: null, // 临时保存上传数据

    // 预设数据（将从云数据库加载）
    products: [], // 产品型号 [{name: '', series: '', suffix: '', number: 1, _id: ''}]
    types: [],    // 车型分类 [{name: '', number: 1, _id: ''}]
    
    // 教程数据（从云数据库加载，根据选择的product+type过滤）
    chapters: [], // 视频分段 [{title: '', url: '', matchCode: '1+1', _id: ''}]
    graphics: [], // 图文详情 [{title: '', img: '', desc: '', matchCode: '1+1', _id: ''}]
    
    // 过滤后的显示数据
    filteredChapters: [], // 根据选择的product+type过滤后的视频
    filteredGraphics: [], // 根据选择的product+type过滤后的图文
    
    // 拖拽排序相关
    dragIndex: -1,        // 当前拖拽的卡片索引
    dragStartY: 0,        // 拖拽开始时的Y坐标
    dragCurrentY: 0,     // 当前拖拽的Y坐标
    dragOffsetY: 0,      // 拖拽偏移量（px）
    isDragging: false,   // 是否正在拖拽
    dragType: '',        // 拖拽类型：'chapters' 或 'graphics'
    longPressTimer: null, // 长按定时器
    lastSwapIndex: -1,   // 上次交换的位置
    lastVibrateTime: 0,  // 上次震动时间
    
    // 编辑相关
    showEditModal: false,
    editModalClosing: false, // 编辑弹窗退出动画中
    editItemData: null,  // 正在编辑的项目数据
    editItemType: '',    // 编辑类型：'chapters' 或 'graphics'
    editItemIndex: -1,
    // 新增：用于布局的精确高度变量
    winHeight: 0,
    scrollViewHeight: 0,

    // 滚动控制
    scrollTopValue: 0,
    locked: false,
    
    // 🔴 全屏视频控制
    fullScreenVideoPaused: false, // 全屏视频是否暂停
    fullScreenVideoTransform: '', // 全屏视频的初始transform（用于动画）
    fullScreenVideoInitialStyle: '', // 全屏视频的初始样式（用于动画）
    fullScreenVideoMaskClosing: false, // 🔴 背景遮罩层关闭状态（用于同步背景变透明动画）
    videoSlideEndTime: 0, // 🔴 视频拖拽结束时间戳（用于阻止后续1秒内的页面滚动）
    videoSlideDirection: '', // 🔴 视频拖拽方向（'down'=向下，'up'=向上）
    
    // 🔴 自定义加载动画
    showLoadingAnimation: false,
    
    // 🔴 分享码用户行为统计
    sessionStartTime: 0,           // 页面进入时间戳
    sectionClicks: {},             // 各板块点击次数 { 'product-1': 3, 'type-2': 1, 'video-0': 5 }
    sectionDurations: {},          // 各板块停留时间 { 'video-0': 12000, 'graphic-1': 5000 } (毫秒)
    currentSectionKey: null,       // 当前停留的板块key
    currentSectionStartTime: 0,    // 当前板块进入时间
    autoSaveTimer: null,           // 🔴 定时保存定时器
    shareCodeLocationInfo: null,   // 🔴 分享码用户地址信息（仅在进入时获取一次）
    shareCodeRecordCreated: false  // 🔴 是否已创建分享码记录（用于区分首次保存和更新）
  },

  // 关闭分享码提示弹窗
  closeShareCodeModal() {
    this.setData({
      showShareCodeModal: false
    });
  },

  // 页面加载时从云数据库读取数据
  onLoad: function(options) {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/azjc/azjc.js:onLoad',
        message: 'azjc page onLoad',
        data: { 
          options,
          justConfirmed: options.justConfirmed,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'confirm-receipt-issue',
        hypothesisId: 'page-load-timing'
      };
      wx.request({
        url: 'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: logData,
        success: () => {},
        fail: () => {}
      });
    } catch (err) {}
    // #endregion

    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('azjc');
    }
    
    // 🔴 检查是否是分享码用户
    const isShareCodeUser = app.globalData.isShareCodeUser || false
    this.setData({
      isShareCodeUser: isShareCodeUser
    })

    // 🔴 如果是分享码用户，开始计时（次数更新在 checkAccessPermission 中处理）
    if (isShareCodeUser) {
      // 开始整体计时
      const startTime = Date.now();
      
      // 🔴 只在进入页面时获取一次地址信息，之后不再更新
      let locationInfo = {
        province: '',
        city: '',
        district: '',
        address: '',
        latitude: null,
        longitude: null
      };
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
        console.log('[azjc] onLoad: 分享码用户获取地址信息（仅此一次）:', locationInfo);
      } catch (e) {
        console.log('[azjc] 获取地址信息失败:', e);
      }
      
      this.setData({
        sessionStartTime: startTime,
        sectionClicks: {},
        sectionDurations: {},
        shareCodeLocationInfo: locationInfo // 🔴 保存地址信息到页面数据，之后不再更新
      });
      console.log('[azjc] onLoad: 分享码用户开始计时，sessionStartTime:', startTime);
      
      // 🔴 启动定时保存（每30秒保存一次，防止数据丢失）
      this._startAutoSave();
    }
    
    // 🔴 启动定时检查 qiangli 强制封禁
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    
    // 1. 获取系统屏幕高度（px）和状态栏高度
    const winInfo = wx.getWindowInfo();
    const winHeight = winInfo.windowHeight;
    const statusBarHeight = winInfo.statusBarHeight || 44;

    // 2. 计算滚动区域高度（按你页面结构预留顶部区域）
    const scrollViewHeight = winHeight - 90;

    this.setData({
      winHeight,
      scrollViewHeight,
      statusBarHeight
    });

    // 🔴 检查访问权限（如果是从订单页面进入，直接放行）
    if (options && options.from === 'order') {
      console.log('[azjc] 从订单页进入，直接放行');
      this.checkAdminPrivilege().then(() => {
      this.loadDataFromCloud();
      });
    } else {
      // 🔴 关键修复：如果刚确认收货，延迟检查权限，确保数据库更新完成
      if (options && options.justConfirmed === '1') {
        console.log('[azjc] onLoad: 刚确认收货，延迟 1000ms 后检查权限');
        setTimeout(() => {
          this.checkAccessPermission();
        }, 1000); // 延迟 1 秒，确保数据库更新完成
    } else {
      // 否则进行权限检查
      this.checkAccessPermission();
      }
    }
  },

  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
  },

  async onHide() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
    // 🔴 停止定时保存
    this._stopAutoSave();
    
    // 🔴 如果是分享码用户，记录当前板块时长并上传统计
    if (this.data.isShareCodeUser && this.data.sessionStartTime > 0) {
      console.log('[azjc] onHide: 开始上传统计数据');
      await this._uploadSessionStats();
    } else {
      console.log('[azjc] onHide: 不是分享码用户或未开始计时，跳过上传统计');
    }
  },

  async onUnload() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
    // 🔴 停止定时保存
    this._stopAutoSave();
    
    // 🔴 如果是分享码用户，记录当前板块时长并上传统计
    if (this.data.isShareCodeUser && this.data.sessionStartTime > 0) {
      console.log('[azjc] onUnload: 开始上传统计数据');
      // 注意：onUnload 中的异步操作可能无法完成，但至少尝试保存
      try {
        await this._uploadSessionStats();
      } catch (err) {
        console.error('[azjc] onUnload: 上传统计数据失败:', err);
      }
    } else {
      console.log('[azjc] onUnload: 不是分享码用户或未开始计时，跳过上传统计');
    }
  },

  // 🔴 页面渲染完成，确保组件已准备好
  onReady() {
    // 延迟检查组件，确保已渲染，最多重试5次
    let retryCount = 0;
    const checkComponent = () => {
      const toast = this.selectComponent('#custom-toast');
      if (toast) {
        this._customToastInstance = toast; // 缓存组件实例
        this._customToastReady = true;
        console.log('[azjc] custom-toast 组件已准备好');
      } else if (retryCount < 5) {
        retryCount++;
        setTimeout(checkComponent, 200 * retryCount); // 递增延迟
      } else {
        console.warn('[azjc] custom-toast 组件未找到，将使用降级方案');
      }
    };
    setTimeout(checkComponent, 100);
  },

  // ================== 权限检查逻辑 ==================
  
  // 🔴 核心入口检查：限制普通用户访问
  async checkAccessPermission() {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/azjc/azjc.js:checkAccessPermission',
        message: 'checkAccessPermission called',
        data: { 
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'confirm-receipt-issue',
        hypothesisId: 'permission-check'
      };
      wx.request({
        url: 'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: logData,
        success: () => {},
        fail: () => {}
      });
    } catch (err) {}
    // #endregion

    const app = getApp();

    // 🔴 分享码用户：先检查云数据库中的剩余次数，次数用完后禁止访问
    if (app && app.globalData && app.globalData.isShareCodeUser) {
      console.log('[azjc checkAccessPermission] 分享码用户，检查剩余次数');
      
      // 🔴 从云数据库检查剩余次数（不更新次数，只检查）
      try {
        const codeInfo = app.globalData.shareCodeInfo;
        if (!codeInfo || !codeInfo._id) {
          console.error('[azjc checkAccessPermission] 分享码信息不存在');
          this.hideMyLoading && this.hideMyLoading();
          this.showRejectModal('分享码信息无效');
          return;
        }

        // 直接查询云数据库获取最新次数
        const db = wx.cloud.database();
        const codeRes = await db.collection('chakan').doc(codeInfo._id).get();
        
        if (!codeRes.data) {
          console.error('[azjc checkAccessPermission] 分享码记录不存在');
          this.hideMyLoading && this.hideMyLoading();
          this.showRejectModal('分享码记录不存在');
          return;
        }

        const shareCodeData = codeRes.data;
        const currentUsedViews = shareCodeData.usedViews || 0;
        const totalViews = shareCodeData.totalViews || 3;
        const remaining = totalViews - currentUsedViews;

        console.log('[azjc checkAccessPermission] 分享码剩余次数:', remaining, '/', totalViews, '(已使用:', currentUsedViews, ')');

        // 🔴 如果次数已用完，允许进入但隐藏教程内容，显示次数已用完弹窗
        if (remaining <= 0) {
          console.log('[azjc checkAccessPermission] 分享码查看次数已用完，允许进入但隐藏内容');
          this.hideMyLoading && this.hideMyLoading(); // 🔴 先隐藏 loading
          this.setData({ 
            isAuthorized: true,
            shareCodeViewsExhausted: true // 标记次数已用完，隐藏教程内容
          });
          // 显示次数已用完弹窗
          this.setData({
            showShareCodeModal: true,
            shareCodeRemaining: 0,
            shareCodeTotal: totalViews,
            shareCodeExhausted: true // 显示"次数已用完"样式
          });
          // 不加载教程内容，页面保持空白
          return;
        }

        // 🔴 次数未用完，先更新次数（调用云函数），然后允许访问
        console.log('[azjc checkAccessPermission] 分享码用户，剩余次数充足，开始更新次数');
        
        // 防止重复计数：检查是否已经在这个会话中计数过
        const sessionKey = `shareCodeCounted_${codeInfo._id}`;
        const hasCounted = wx.getStorageSync(sessionKey) || false;
        
        if (!hasCounted && app.updateShareCodeViews) {
          // 标记已计数，防止重复
          wx.setStorageSync(sessionKey, true);
          
          // 调用云函数更新次数
          app.updateShareCodeViews().then(res => {
            // 🔴 先隐藏 loading，确保弹窗能正常显示
            this.hideMyLoading && this.hideMyLoading();
            
            if (res && res.success) {
              console.log('[azjc checkAccessPermission] 查看次数更新成功，剩余:', res.remaining);
              
              // 更新全局数据
              if (app.globalData.shareCodeInfo) {
                app.globalData.shareCodeInfo.usedViews = res.usedViews;
                app.globalData.shareCodeInfo.totalViews = res.total;
              }
              
              // 🔴 如果次数已用完，允许进入但隐藏教程内容，显示次数已用完弹窗
              if (res.isExhausted || res.remaining <= 0) {
                console.log('[azjc checkAccessPermission] 更新后次数已用完，允许进入但隐藏教程内容');
                this.setData({ 
                  isAuthorized: true,
                  shareCodeViewsExhausted: true // 标记次数已用完，隐藏教程内容
                });
                // 显示次数已用完弹窗
                this.setData({
                  showShareCodeModal: true,
                  shareCodeRemaining: 0,
                  shareCodeTotal: res.total,
                  shareCodeExhausted: true // 显示"次数已用完"的弹窗样式
                });
                // 不加载教程内容，页面保持空白
                return;
              }
              
              // 🔴 显示剩余次数弹窗（先隐藏 loading 再显示弹窗）
              this.setData({
                showShareCodeModal: true,
                shareCodeRemaining: res.remaining,
                shareCodeTotal: res.total,
                shareCodeExhausted: false
              });
              
              // 允许访问并加载教程内容
              this.setData({ isAuthorized: true });
              this.loadDataFromCloud();
            } else {
              console.error('[azjc checkAccessPermission] 查看次数更新失败:', res);
              this.showRejectModal('更新查看次数失败，请重试');
            }
          }).catch(err => {
            console.error('[azjc checkAccessPermission] 更新查看次数异常:', err);
            wx.removeStorageSync(sessionKey); // 清除标记，允许下次重试
            this.hideMyLoading && this.hideMyLoading();
            this.showRejectModal('更新查看次数失败，请重试');
          });
        } else {
          // 已计数过，直接允许访问（显示剩余次数）
          console.log('[azjc checkAccessPermission] 本次会话已计数，直接允许访问');
          this.hideMyLoading && this.hideMyLoading(); // 🔴 先隐藏 loading
          
          const codeInfo = app.globalData.shareCodeInfo;
          if (codeInfo) {
            const remaining = codeInfo.totalViews - codeInfo.usedViews;
            
            // 🔴 检查剩余次数，如果已用完则显示弹窗并隐藏内容
            if (remaining <= 0) {
              console.log('[azjc checkAccessPermission] 已计数过但次数已用完，允许进入但隐藏内容');
              this.setData({ 
                isAuthorized: true,
                shareCodeViewsExhausted: true // 标记次数已用完，隐藏教程内容
              });
              // 显示次数已用完弹窗
              this.setData({
                showShareCodeModal: true,
                shareCodeRemaining: 0,
                shareCodeTotal: codeInfo.totalViews,
                shareCodeExhausted: true // 显示"次数已用完"样式
              });
              // 不加载教程内容，页面保持空白
              return;
            }
            
            // 🔴 显示剩余次数弹窗
            this.setData({
              showShareCodeModal: true,
              shareCodeRemaining: remaining,
              shareCodeTotal: codeInfo.totalViews,
              shareCodeExhausted: false
            });
          }
          this.setData({ isAuthorized: true });
          this.loadDataFromCloud();
        }
        return;
      } catch (err) {
        console.error('[azjc checkAccessPermission] 检查分享码次数失败:', err);
        this.hideMyLoading && this.hideMyLoading();
        this.showRejectModal('检查分享码次数失败，请重试');
        return;
      }
    }

    this.showMyLoading('验证权限中...');
    
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 1. 获取当前用户 openid
      const { result: { openid } } = await wx.cloud.callFunction({ name: 'login' });

      // 2. 检查管理员
      let adminCheck = await db.collection('guanliyuan').where({ openid: openid }).count();
      if (adminCheck.total === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: openid }).count();
      }
      
      if (adminCheck.total > 0) {
        // 是管理员：授权并放行
        this.setData({ isAuthorized: true });
        this.hideMyLoading();
        this.checkAdminPrivilege();
        this.loadDataFromCloud();
        return; 
      }

      // 3. 检查是否有订单（任何状态的订单）
      const allOrdersRes = await db.collection('shop_orders').where({
        _openid: openid
      }).get();

      // 4. 检查是否绑定了设备（使用 openid 字段，因为 bindDevice 云函数存储的是 openid）
      // 🔴 修复：同时检查 openid 和 _openid，确保兼容不同的数据格式
      // 🔴 必须检查 isActive: true，只有审核通过的设备才算绑定成功
      let deviceCheck1 = await db.collection('sn').where({
        openid: openid,
        isActive: true
      }).count();
      
      let deviceCheck2 = await db.collection('sn').where({
        _openid: openid,
        isActive: true
      }).count();
      
      const hasDevice = deviceCheck1.total > 0 || deviceCheck2.total > 0;
      
      console.log('[azjc checkAccessPermission] 设备检查结果:', {
        openid: openid.substring(0, 10) + '...',
        deviceCheck1: deviceCheck1.total,
        deviceCheck2: deviceCheck2.total,
        hasDevice
      });

      // 🔴 修改逻辑：检查订单状态
      // 过滤出真正未确认收货的订单（status 是 1 或 'SHIPPED'，且不是 'SIGNED' 或 'COMPLETED'）
      const realPendingOrders = allOrdersRes.data.filter(order => {
        const status = order.status;
        const realStatus = order.realStatus;
        // 只统计真正未确认收货的订单
        return (status === 1 || status === 'SHIPPED') 
            && status !== 'SIGNED' && status !== 'COMPLETED'
            && realStatus !== 'SIGNED' && realStatus !== 'COMPLETED';
      });

      // 🔴 检查是否有已确认收货的订单
      const confirmedOrders = allOrdersRes.data.filter(order => {
        const status = order.status;
        const realStatus = order.realStatus;
        // 已确认收货的订单：status 或 realStatus 是 'SIGNED' 或 'COMPLETED'
        return status === 'SIGNED' || status === 'COMPLETED' 
            || realStatus === 'SIGNED' || realStatus === 'COMPLETED';
      });

      // #region agent log
      try {
        const logData = {
          location: 'miniprogram/pages/azjc/azjc.js:checkAccessPermission:order-check',
          message: '订单检查结果',
          data: { 
            totalOrders: allOrdersRes.data.length,
            pendingOrders: realPendingOrders.length,
            confirmedOrders: confirmedOrders.length,
            orders: allOrdersRes.data.map(o => ({ 
              orderId: o.orderId, 
              status: o.status, 
              realStatus: o.realStatus 
            })),
            timestamp: Date.now()
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'confirm-receipt-issue',
          hypothesisId: 'order-status-check'
        };
        wx.request({
          url: 'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: logData,
          success: () => {},
          fail: () => {}
        });
      } catch (err) {}
      // #endregion

      console.log('[azjc checkAccessPermission] 订单检查结果:', {
        totalOrders: allOrdersRes.data.length,
        pendingOrders: realPendingOrders.length,
        confirmedOrders: confirmedOrders.length
      });

      // 🔴 新逻辑（修复）：
      // 1. 如果绑定了设备（不管有没有订单或订单状态）-> 直接放行
      if (hasDevice) {
        console.log('[azjc checkAccessPermission] ✅ 用户已绑定设备，直接放行');
        this.hideMyLoading();
        await this.checkAdminPrivilege(); // 🔴 等待管理员权限检查完成
        this.loadDataFromCloud();
        return; 
      }

      // 2. 🔴 关键修复：如果有已确认收货的订单 -> 直接放行（不需要绑定设备）
      if (confirmedOrders.length > 0) {
        console.log('[azjc checkAccessPermission] ✅ 用户有已确认收货的订单，直接放行');
        this.hideMyLoading();
        await this.checkAdminPrivilege(); // 🔴 等待管理员权限检查完成
        this.loadDataFromCloud();
        return;
      }

      // 3. 如果有未确认收货的订单 -> 提示先确认收货
      if (realPendingOrders.length > 0) {
        console.log('[azjc checkAccessPermission] ⚠️ 有未确认收货的订单:', realPendingOrders.length);
        this.hideMyLoading();
        this.showRejectModal('请前往个人中心-我的订单\n确认收货后解锁教程');
        return;
      }

      // 4. 既没订单也没绑定设备 -> 显示提示（只给这种情况）
      // 🔴 这个提示只显示给：没下过单，并且没绑定设备的用户
      if (allOrdersRes.data.length === 0 && !hasDevice) {
        console.log('[azjc checkAccessPermission] ⚠️ 既没订单也没绑定设备');
        this.hideMyLoading();
        this.showRejectModal('请前往个人中心-我的订单\n确认收货后解锁教程');
        return;
      }

      // 5. 其他情况（理论上不应该到这里，但保留兜底逻辑）
      console.log('[azjc checkAccessPermission] ⚠️ 未知情况，拒绝访问');
      this.hideMyLoading();
      this.showRejectModal('请前往个人中心-我的订单\n确认收货后解锁教程');

    } catch (err) {
      console.error('权限检查异常', err);
      this.hideMyLoading();
      this.showRejectModal('权限验证失败，请重试');
    }
  },

  // 🔴 显示拒绝访问的提示
  showRejectModal(content) {
    this._showCustomModal({
      title: '提示',
      content: content,
      showCancel: false,
      confirmText: '返回',
      success: () => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      }
    });
  },

  async checkAdminPrivilege() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      console.log('[azjc.js] 检查管理员权限，openid:', myOpenid);
      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      console.log('[azjc.js] 第一次查询结果:', adminCheck.data);
      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
        console.log('[azjc.js] 第二次查询结果（使用_openid）:', adminCheck.data);
      }
      if (adminCheck.data.length > 0) {
        this.setData({ isAuthorized: true });
        console.log('[azjc.js] ✅ 身份验证成功：合法管理员，isAuthorized已设置为true');
      } else {
        console.log('[azjc.js] ❌ 未找到管理员记录，isAuthorized保持false');
      }
    } catch (err) {
      console.error('[azjc.js] 权限检查失败', err);
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this._showCustomToast('无权限', 'none');
      return;
    }
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    this._showCustomToast(nextState ? '管理模式开启' : '已回到用户模式', 'none');
  },

  // 从云数据库加载数据
  loadDataFromCloud: function() {
    // 🔴 如果分享码次数已用完，不加载教程内容（保持页面空白）
    if (this.data.shareCodeViewsExhausted) {
      console.log('[azjc loadDataFromCloud] 分享码次数已用完，跳过加载教程内容');
      return;
    }
    
    // 1. 读取产品型号
    db.collection('azjc').where({
      type: 'product'
    }).orderBy('order', 'asc').get({
      success: (productRes) => {
        const products = productRes.data.length > 0 
          ? productRes.data.map(item => ({
              name: item.name,
              series: item.series || '',
              suffix: item.suffix || '',
              number: item.number || 1,
              _id: item._id
            }))
          : [
              { name: 'F1 PRO / MAX', series: '智能系列', suffix: 'F1', number: 1 },
              { name: 'F2 PRO / MAX', series: '性能系列', suffix: 'F2', number: 2 },
              { name: 'F2 MAX LONG', series: '长续航系列', suffix: 'L', number: 3 }
            ];
        
        // 2. 读取车型分类
        db.collection('azjc').where({
          type: 'type'
        }).orderBy('order', 'asc').get({
          success: (typeRes) => {
            const types = typeRes.data.length > 0
              ? typeRes.data.map(item => ({
                  name: item.name,
                  number: item.number || 1,
                  _id: item._id
                }))
              : [
                  { name: '踏板车', number: 1 },
                  { name: '跨骑车', number: 2 },
                  { name: '电摩/电动自行车', number: 3 }
                ];
            
            this.setData({ products, types });
            
            // 3. 读取视频章节
            this.loadVideosAndGraphics();
          },
          fail: (err) => {
            console.error('加载车型数据失败:', err);
            // 使用默认数据
            const types = [
              { name: '踏板车', number: 1 },
              { name: '跨骑车', number: 2 },
              { name: '电摩/电动自行车', number: 3 }
            ];
            this.setData({ types });
            this.loadVideosAndGraphics();
          }
        });
      },
      fail: (err) => {
        console.error('加载产品数据失败:', err);
        // 使用默认数据
        const products = [
          { name: 'F1 PRO / MAX', series: '智能系列', suffix: 'F1', number: 1 },
          { name: 'F2 PRO / MAX', series: '性能系列', suffix: 'F2', number: 2 },
          { name: 'F2 MAX LONG', series: '长续航系列', suffix: 'L', number: 3 }
        ];
        this.setData({ products });
        
        // 读取车型
        db.collection('azjc').where({
          type: 'type'
        }).orderBy('order', 'asc').get({
          success: (typeRes) => {
            const types = typeRes.data.length > 0
              ? typeRes.data.map(item => ({
                  name: item.name,
                  number: item.number || 1,
                  _id: item._id
                }))
              : [
                  { name: '踏板车', number: 1 },
                  { name: '跨骑车', number: 2 },
                  { name: '电摩/电动自行车', number: 3 }
                ];
            this.setData({ types });
            this.loadVideosAndGraphics();
          },
          fail: () => {
            const types = [
              { name: '踏板车', number: 1 },
              { name: '跨骑车', number: 2 },
              { name: '电摩/电动自行车', number: 3 }
            ];
            this.setData({ types });
            this.loadVideosAndGraphics();
          }
        });
      }
    });
  },

  // 加载视频和图文数据
  loadVideosAndGraphics: function() {
    // 读取视频章节 - 🔴 关键修复：按 order 字段排序
    db.collection('azjc').where({
      type: 'video'
    }).orderBy('order', 'asc').get({
      success: (res) => {
        if (res.data.length === 0) {
          // 没有视频数据，继续读取图文
          this.loadGraphicsData([]);
          return;
        }
        
        // 获取所有视频文件ID
        const videoFileIDs = res.data.map(item => item.url).filter(id => id);
        
        if (videoFileIDs.length > 0) {
          // 批量获取临时链接
          wx.cloud.getTempFileURL({
            fileList: videoFileIDs,
            success: (urlRes) => {
              // 创建 fileID 到 tempURL 的映射
              const urlMap = {};
              urlRes.fileList.forEach(file => {
                urlMap[file.fileID] = file.tempFileURL;
              });
              
              const chapters = res.data.map(item => {
                // 检查是否有临时链接，如果没有或获取失败，标记需要重新获取
                const tempURL = urlMap[item.url];
                return {
                  title: item.title,
                  url: tempURL || item.url, // 使用临时链接，如果没有则使用原ID
                  fileID: item.url, // 保存原始fileID用于删除和重新获取
                  matchCode: item.matchCode || '', // 匹配码，如 '1+1', '1+2' 等
                  order: item.order || 0, // 🔴 关键修复：包含 order 字段
                  _id: item._id,
                  needRefresh: !tempURL // 标记是否需要刷新链接
                };
              });
              
              this.setData({ chapters });
              this.filterContent(); // 根据当前选择过滤内容
              
              // 读取图文详情
              this.loadGraphicsData(chapters);
            },
            fail: (err) => {
              console.error('获取视频临时链接失败:', err);
              // 即使获取失败，也使用原始fileID
              const chapters = res.data.map(item => ({
                title: item.title,
                url: item.url,
                fileID: item.url,
                matchCode: item.matchCode || '',
                order: item.order || 0, // 🔴 关键修复：包含 order 字段
                _id: item._id
              }));
              this.setData({ chapters });
              this.filterContent();
              this.loadGraphicsData(chapters);
            }
          });
        } else {
          this.loadGraphicsData([]);
        }
      },
      fail: (err) => {
        console.error('加载视频数据失败:', err);
        this._showCustomToast('加载数据失败', 'none');
      }
    });
  },

  // 加载图文数据 - 🔴 关键修复：按 order 字段排序
  loadGraphicsData: function(chapters) {
    db.collection('azjc').where({
      type: 'image'
    }).orderBy('order', 'asc').get({
      success: (imgRes) => {
        if (imgRes.data.length === 0) {
          this.setData({
            chapters: chapters,
            graphics: []
          });
          this.filterContent();
          return;
        }
        
        // 获取所有图片文件ID
        const imageFileIDs = imgRes.data.map(item => item.img).filter(id => id);
        
        if (imageFileIDs.length > 0) {
          // 批量获取临时链接
          wx.cloud.getTempFileURL({
            fileList: imageFileIDs,
            success: (urlRes) => {
              // 创建 fileID 到 tempURL 的映射
              const urlMap = {};
              urlRes.fileList.forEach(file => {
                urlMap[file.fileID] = file.tempFileURL;
              });
              
              const graphics = imgRes.data.map(item => ({
                title: item.title,
                img: urlMap[item.img] || item.img, // 使用临时链接
                fileID: item.img, // 保存原始fileID用于删除
                desc: item.desc || '',
                matchCode: item.matchCode || '', // 匹配码，如 '1+1', '1+2' 等
                order: item.order || 0, // 🔴 关键修复：包含 order 字段
                _id: item._id
              }));
              
              this.setData({ graphics });
              this.filterContent(); // 根据当前选择过滤内容
            },
            fail: (err) => {
              console.error('获取图片临时链接失败:', err);
              // 即使获取失败，也使用原始fileID
              const graphics = imgRes.data.map(item => ({
                title: item.title,
                img: item.img,
                fileID: item.img,
                desc: item.desc || '',
                matchCode: item.matchCode || '',
                order: item.order || 0, // 🔴 关键修复：包含 order 字段
                _id: item._id
              }));
              
              this.setData({
                chapters: chapters,
                graphics: graphics
              });
              this.filterContent();
            }
          });
        } else {
          this.setData({ graphics: [] });
          this.filterContent();
        }
      },
      fail: (err) => {
        console.error('加载图文数据失败:', err);
        this._showCustomToast('加载数据失败', 'none');
      }
    });
  },

  // 🔴 更新页面标题
  updatePageTitle: function(stepIndex) {
    let title = '请选择产品';
    if (stepIndex === 1) {
      title = '请选择车型';
    } else if (stepIndex === 2) {
      title = '请选择车型'; // 🔴 选择车型后，标题保持为"请选择车型"
    }
    this.setData({ pageTitle: title });
  },

  // 第一步：选产品
  selectProduct: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ pIndex: index });
    wx.vibrateShort({ type: 'medium' });
    
    // 🔴 分享码用户：记录点击和切换板块
    const sectionKey = `product-${index}`
    this._trackSectionClick(sectionKey)
    this._switchToSection(sectionKey)
    
    setTimeout(() => {
      this.setData({ stepIndex: 1, canScroll: true });
      this.updatePageTitle(1); // 🔴 更新标题
      this.filterContent(); // 选择产品后重新过滤内容
    }, 450);
  },

  // 第二步：选车型
  selectType: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ tIndex: index });
    wx.vibrateShort({ type: 'medium' });
    
    // 🔴 分享码用户：记录点击和切换板块
    const sectionKey = `type-${index}`
    this._trackSectionClick(sectionKey)
    this._switchToSection(sectionKey)
    
    setTimeout(() => {
      this.setData({ stepIndex: 2 });
      this.updatePageTitle(2); // 🔴 立即更新标题为"请选择车型"
      this.filterContent(); // 选择车型后重新过滤内容
    }, 450);
  },

  // 根据选择的product+type过滤内容
  filterContent: function() {
    const { products, types, chapters, graphics, pIndex, tIndex, showAll, isAdmin } = this.data;
    
    // 管理员模式下，如果开启了"显示全部"，显示所有内容
    if (isAdmin && showAll) {
      const allChapters = [...chapters].sort((a, b) => {
        // 先按匹配码分组，再按order排序
        if (a.matchCode !== b.matchCode) {
          return (a.matchCode || '').localeCompare(b.matchCode || '');
        }
        return (a.order || 0) - (b.order || 0);
      });
      
      const allGraphics = [...graphics].sort((a, b) => {
        if (a.matchCode !== b.matchCode) {
          return (a.matchCode || '').localeCompare(b.matchCode || '');
        }
        return (a.order || 0) - (b.order || 0);
      });
      
      this.setData({
        filteredChapters: allChapters,
        filteredGraphics: allGraphics
      });
      return;
    }
    
    if (pIndex < 0 || tIndex < 0) {
      // 如果还没选择完整，不显示内容
      this.setData({
        filteredChapters: [],
        filteredGraphics: []
      });
      return;
    }
    
    const product = products[pIndex];
    const type = types[tIndex];
    
    if (!product || !type) {
      this.setData({
        filteredChapters: [],
        filteredGraphics: []
      });
      return;
    }
    
    // 构建匹配码，如 '1+1', '2+3' 等
    const matchCode = `${product.number || (pIndex + 1)}+${type.number || (tIndex + 1)}`;
    
    // 过滤视频：只显示匹配码相同的内容，并按order排序
    const filteredChapters = chapters.filter(item => {
      if (!item.matchCode) return false; // 没有匹配码的不显示
      return item.matchCode === matchCode;
    }).sort((a, b) => {
      // 相同匹配码的内容按order排序
      if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
      return 0;
    });
    
    // 过滤图文：只显示匹配码相同的内容，并按order排序
    const filteredGraphics = graphics.filter(item => {
      if (!item.matchCode) return false; // 没有匹配码的不显示
      return item.matchCode === matchCode;
    }).sort((a, b) => {
      // 相同匹配码的内容按order排序
      if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
      return 0;
    });
    
    this.setData({
      filteredChapters: filteredChapters,
      filteredGraphics: filteredGraphics
    });
  },

  // 模式切换
  switchMode: function(e) {
    const newMode = e.currentTarget.dataset.mode
    this.setData({ mode: newMode });
    
    // 🔴 分享码用户：记录切换到视频或图文模式
    const sectionKey = newMode === 'v' ? 'mode-video' : 'mode-graphic'
    this._trackSectionClick(sectionKey)
    this._switchToSection(sectionKey)
    
    this.filterContent(); // 重新过滤内容
  },

  // 切换显示全部模式
  toggleShowAll: function() {
    const showAll = !this.data.showAll;
    this.setData({ showAll: showAll });
    this.filterContent(); // 重新过滤内容
  },


  // 真实媒体上传
  uploadMedia: function(e) {
    const mediaType = e.currentTarget.dataset.type; // 'video' 或 'image'
    wx.chooseMedia({
      count: 1,
      mediaType: [mediaType],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        wx.showModal({
          title: '设置标题',
          editable: true,
          placeholderText: '例如：支架固定指导',
          success: (resModal) => {
            if (resModal.confirm) {
              const title = resModal.content || '未命名步骤';
              
              // 显示上传进度
              this.showMyLoading('上传中...');
              
              // 生成云存储路径
              const suffix = mediaType === 'video' ? '.mp4' : '.jpg';
              const cloudPath = `azjc/${mediaType}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${suffix}`;
              
              // 上传到云存储
              wx.cloud.uploadFile({
                cloudPath: cloudPath,
                filePath: tempPath,
                success: (uploadRes) => {
                  // 上传成功，保存到云数据库
                  const fileID = uploadRes.fileID;
                  const data = {
                    type: mediaType,
                    title: title,
                    createTime: db.serverDate()
                  };
                  
                  if (mediaType === 'video') {
                    data.url = fileID;
                  } else {
                    data.img = fileID;
                    data.desc = ''; // 留空，不显示描述
                  }
                  
                  // 弹出设置匹配码的弹窗
                  this.showMatchCodeModal(mediaType, fileID, title, data);
              // 关闭上传中的 loading，等待用户选择匹配码
              this.hideMyLoading();
                },
                fail: (err) => {
                  console.error('上传文件失败:', err);
                  this.hideMyLoading();
                  this._showCustomToast('上传失败: ' + (err.errMsg || '未知错误'), 'none', 3000);
                }
              });
            }
          }
        });
      }
    });
  },

  // 添加数据项
  addItem: function(e) {
    const type = e.currentTarget.dataset.type;
    wx.showModal({
      title: '新增数据',
      editable: true,
      placeholderText: '请输入内容名称',
      success: (res) => {
        if (res.confirm && res.content) {
          // 弹出设置号码的弹窗
          this.showNumberModal(type, res.content);
        }
      }
    });
  },

  // 显示号码设置弹窗
  showNumberModal: function(type, content) {
    wx.showModal({
      title: '设置号码',
      editable: true,
      placeholderText: '请输入号码（如：1、2、3）',
      success: (numRes) => {
        if (numRes.confirm) {
          const number = parseInt(numRes.content) || 1;
          
          // 准备数据
          // 将前端用的 "products" / "types" 转换为数据库字段 "product" / "type"
          const typeField = (type === 'products') ? 'product' : (type === 'types' ? 'type' : type);
          let data = {
            type: typeField,
            createTime: db.serverDate(),
            order: number // 用于排序
          };
          
          if (type === 'products') {
            data.name = content;
            data.series = '新系列';
            data.suffix = 'NEW';
            data.number = number;
          } else if (type === 'types') {
            data.name = content;
            data.number = number;
          }
          
          // 保存到云数据库
          db.collection('azjc').add({
            data: data,
            success: (addRes) => {
              // 更新本地数据
              if (type === 'products') {
                let list = [...this.data.products];
                list.push({ 
                  name: content, 
                  series: '新系列', 
                  suffix: 'NEW',
                  number: number,
                  _id: addRes._id
                });
                // 按number排序
                list.sort((a, b) => (a.number || 0) - (b.number || 0));
                this.setData({ products: list });
              } else if (type === 'types') {
                let list = [...this.data.types];
                list.push({ 
                  name: content,
                  number: number,
                  _id: addRes._id
                });
                // 按number排序
                list.sort((a, b) => (a.number || 0) - (b.number || 0));
                this.setData({ types: list });
              }
              
              this._showCustomToast('添加成功', 'success');
            },
            fail: (err) => {
              console.error('保存到数据库失败:', err);
              this._showCustomToast('保存失败', 'none');
            }
          });
        }
      }
    });
  },

  // 显示匹配码选择弹窗
  showMatchCodeModal: function(mediaType, fileID, title, data) {
    const { products, types } = this.data;
    
    // 显示所有从云端读取的产品和车型（有_id的，说明是已创建并保存到云端的）
    // 如果没有从云端读取到数据，则使用当前data中的数据（可能是默认数据或刚创建的）
    const availableProducts = products.filter(p => p._id).length > 0 
      ? products.filter(p => p._id)  // 优先使用从云端读取的
      : products;  // 如果没有云端数据，使用当前数据（包括默认数据）
    
    const availableTypes = types.filter(t => t._id).length > 0
      ? types.filter(t => t._id)  // 优先使用从云端读取的
      : types;  // 如果没有云端数据，使用当前数据（包括默认数据）
    
    console.log('可用产品:', availableProducts);
    console.log('可用车型:', availableTypes);
    
    // 如果确实没有任何数据，才提示
    if (availableProducts.length === 0 || availableTypes.length === 0) {
      this._showCustomToast('请先创建产品和车型', 'none', 2000);
      this.hideMyLoading();
      return;
    }
    
    const firstProduct = availableProducts[0];
    const firstType = availableTypes[0];
    
    // 保存临时数据
    this.setData({
      showMatchCodePicker: true,
      tempUploadData: { mediaType, fileID, title, data },
      availableProducts: availableProducts, // 显示所有可用的产品
      availableTypes: availableTypes, // 显示所有可用的车型
      matchCodeProductNum: firstProduct ? (firstProduct.number || 1) : 1,
      matchCodeTypeNum: firstType ? (firstType.number || 1) : 1,
      matchCodeProductIndex: 0,
      matchCodeTypeIndex: 0,
      currentProductName: firstProduct ? firstProduct.name : '请选择',
      currentTypeName: firstType ? firstType.name : '请选择'
    });
  },

  // 关闭匹配码选择弹窗
  hideMatchCodePicker: function() {
    this.setData({ matchCodePickerClosing: true });
    setTimeout(() => {
      this.setData({
        showMatchCodePicker: false,
        tempUploadData: null,
        matchCodePickerClosing: false
      });
    }, 420);
  },

  // 选择产品号码
  onProductNumChange: function(e) {
    const selectedIndex = parseInt(e.detail.value);
    const availableProducts = this.data.availableProducts || [];
    const selectedProduct = availableProducts[selectedIndex];
    
    if (!selectedProduct) return;
    
    const productNum = selectedProduct.number || (selectedIndex + 1);
    this.setData({
      matchCodeProductNum: productNum,
      matchCodeProductIndex: selectedIndex,
      currentProductName: selectedProduct.name || '请选择'
    });
  },

  // 选择车型号码
  onTypeNumChange: function(e) {
    const selectedIndex = parseInt(e.detail.value);
    const availableTypes = this.data.availableTypes || [];
    const selectedType = availableTypes[selectedIndex];
    
    if (!selectedType) return;
    
    const typeNum = selectedType.number || (selectedIndex + 1);
    this.setData({
      matchCodeTypeNum: typeNum,
      matchCodeTypeIndex: selectedIndex,
      currentTypeName: selectedType.name || '请选择'
    });
  },

  // 确认匹配码选择
  confirmMatchCode: function() {
    const { tempUploadData, matchCodeProductNum, matchCodeTypeNum, products, types, chapters, graphics } = this.data;
    
    if (!tempUploadData) {
      this._showCustomToast('上传数据丢失，请重新上传', 'none');
      this.hideMatchCodePicker();
      return;
    }
    
    const { mediaType, fileID, title, data, isEdit } = tempUploadData;
    const matchCode = `${matchCodeProductNum}+${matchCodeTypeNum}`;
    
    // 如果是编辑模式，更新现有记录
    if (isEdit && data._id) {
      db.collection('azjc').doc(data._id).update({
        data: { matchCode: matchCode },
        success: () => {
          // 更新本地数据
          const allList = mediaType === 'video' ? this.data.chapters : this.data.graphics;
          const item = allList.find(i => i._id === data._id);
          if (item) {
            item.matchCode = matchCode;
            this.setData({
              [mediaType === 'video' ? 'chapters' : 'graphics']: allList
            });
            this.filterContent();
          }
          
          this.hideMatchCodePicker();
          this._showCustomToast('匹配码已更新', 'success');
        },
        fail: (err) => {
          console.error('更新匹配码失败:', err);
          this._showCustomToast('更新失败', 'none');
        }
      });
      return;
    }
    
    // 计算当前匹配码的最大order值
    const sameMatchCodeItems = mediaType === 'video' 
      ? chapters.filter(item => item.matchCode === matchCode)
      : graphics.filter(item => item.matchCode === matchCode);
    const maxOrder = sameMatchCodeItems.length > 0 
      ? Math.max(...sameMatchCodeItems.map(item => item.order || 0))
      : -1;
    
    // 保存到云数据库
    data.matchCode = matchCode;
    data.order = maxOrder + 1; // 新上传的排在最后
    
    console.log('保存到数据库，数据:', data);
    this.showMyLoading('保存中...');
    
    db.collection('azjc').add({
      data: data,
      success: (addRes) => {
        // 获取临时访问链接用于显示
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: (urlRes) => {
            const tempURL = urlRes.fileList[0].tempFileURL;
            
            // 添加到本地数据
            if (mediaType === 'video') {
              let list = [...this.data.chapters];
              list.push({ 
                title: title, 
                url: tempURL,
                fileID: fileID,
                matchCode: matchCode,
                order: data.order,
                _id: addRes._id 
              });
              // 重新排序
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ chapters: list });
            } else {
              let list = [...this.data.graphics];
              list.push({ 
                title: title, 
                img: tempURL,
                fileID: fileID,
                matchCode: matchCode,
                order: data.order,
                desc: '',
                _id: addRes._id 
              });
              // 重新排序
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ graphics: list });
            }
            
            this.filterContent(); // 重新过滤内容
            this.hideMatchCodePicker(); // 关闭弹窗
            this.hideMyLoading();
            this._showCustomToast('上传成功', 'success');
          },
          fail: (err) => {
            console.error('获取临时链接失败:', err);
            // 即使获取失败，也添加到本地
            if (mediaType === 'video') {
              let list = [...this.data.chapters];
              list.push({ title: title, url: fileID, fileID: fileID, matchCode: matchCode, order: data.order, _id: addRes._id });
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ chapters: list });
            } else {
              let list = [...this.data.graphics];
              list.push({ title: title, img: fileID, fileID: fileID, matchCode: matchCode, order: data.order, desc: '', _id: addRes._id });
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ graphics: list });
            }
            this.filterContent();
            this.hideMatchCodePicker();
            this.hideMyLoading();
            this._showCustomToast('上传成功', 'success');
          }
        });
      },
      fail: (err) => {
        console.error('保存到数据库失败:', err);
        this.hideMyLoading();
        this._showCustomToast('保存失败', 'none');
      }
    });
  },

  // 设置号码（修改已有项的号码）
  setNumber: function(e) {
    const { type, index } = e.currentTarget.dataset;
    const item = this.data[type][index];
    const currentNumber = item.number || (index + 1);
    
    wx.showModal({
      title: '设置号码',
      editable: true,
      placeholderText: `当前号码：${currentNumber}`,
      success: (res) => {
        if (res.confirm) {
          const number = parseInt(res.content) || currentNumber;
          
          // 更新云数据库
          if (item._id) {
            db.collection('azjc').doc(item._id).update({
              data: {
                number: number,
                order: number
              },
              success: () => {
                // 更新本地数据
                let list = [...this.data[type]];
                list[index].number = number;
                // 重新排序
                list.sort((a, b) => (a.number || 0) - (b.number || 0));
                this.setData({ [type]: list });
                this.filterContent(); // 重新过滤内容
                this._showCustomToast('设置成功', 'success');
              },
              fail: (err) => {
                console.error('更新失败:', err);
                this._showCustomToast('更新失败', 'none');
              }
            });
          } else {
            // 如果没有_id，只更新本地
            let list = [...this.data[type]];
            list[index].number = number;
            list.sort((a, b) => (a.number || 0) - (b.number || 0));
            this.setData({ [type]: list });
            this.filterContent();
            this._showCustomToast('设置成功', 'success');
          }
        }
      }
    });
  },

  // 上移视频/图文
  moveItemUp: function(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = type === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    
    if (index <= 0) return; // 已经在最上面
    
    const item = list[index];
    const prevItem = list[index - 1];
    
    // 交换order
    const tempOrder = item.order || 0;
    const newOrder = prevItem.order || 0;
    
    // 更新云数据库
    const updatePromises = [];
    if (item._id) {
      updatePromises.push(
        db.collection('azjc').doc(item._id).update({
          data: { order: newOrder }
        })
      );
    }
    if (prevItem._id) {
      updatePromises.push(
        db.collection('azjc').doc(prevItem._id).update({
          data: { order: tempOrder }
        })
      );
    }
    
    Promise.all(updatePromises).then(() => {
      // 更新本地数据
      const allList = type === 'chapters' ? this.data.chapters : this.data.graphics;
      const allItem = allList.find(i => i._id === item._id);
      const allPrevItem = allList.find(i => i._id === prevItem._id);
      
      if (allItem) allItem.order = newOrder;
      if (allPrevItem) allPrevItem.order = tempOrder;
      
      this.setData({
        [type === 'chapters' ? 'chapters' : 'graphics']: allList
      });
      this.filterContent();
      this._showCustomToast('已上移', 'success');
    }).catch(err => {
      console.error('更新排序失败:', err);
      this._showCustomToast('更新失败', 'none');
    });
  },

  // 下移视频/图文
  moveItemDown: function(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = type === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    
    if (index >= list.length - 1) return; // 已经在最下面
    
    const item = list[index];
    const nextItem = list[index + 1];
    
    // 交换order
    const tempOrder = item.order || 0;
    const newOrder = nextItem.order || 0;
    
    // 更新云数据库
    const updatePromises = [];
    if (item._id) {
      updatePromises.push(
        db.collection('azjc').doc(item._id).update({
          data: { order: newOrder }
        })
      );
    }
    if (nextItem._id) {
      updatePromises.push(
        db.collection('azjc').doc(nextItem._id).update({
          data: { order: tempOrder }
        })
      );
    }
    
    Promise.all(updatePromises).then(() => {
      // 更新本地数据
      const allList = type === 'chapters' ? this.data.chapters : this.data.graphics;
      const allItem = allList.find(i => i._id === item._id);
      const allNextItem = allList.find(i => i._id === nextItem._id);
      
      if (allItem) allItem.order = newOrder;
      if (allNextItem) allNextItem.order = tempOrder;
      
      this.setData({
        [type === 'chapters' ? 'chapters' : 'graphics']: allList
      });
      this.filterContent();
      this._showCustomToast('已下移', 'success');
    }).catch(err => {
      console.error('更新排序失败:', err);
      this._showCustomToast('更新失败', 'none');
    });
  },

  // 原地删除数据
  deleteItem: function(e) {
    const { type, index } = e.currentTarget.dataset;
    this._showCustomModal({
      title: '确认删除',
      content: '删除后无法撤销',
      success: (res) => {
        if (res.confirm) {
          const list = this.data[type];
          const item = list[index];
          
          if (!item._id) {
            // 如果没有 _id，说明是本地数据，直接删除
            list.splice(index, 1);
            this.setData({ [type]: list });
            this._showCustomToast('已删除', 'success');
            return;
          }
          
          // 显示删除进度
          this.showMyLoading('删除中...');
          
          // 删除云数据库记录
          db.collection('azjc').doc(item._id).remove({
            success: () => {
              // 删除云存储文件（使用保存的fileID）
              const fileID = item.fileID || (type === 'chapters' ? item.url : item.img);
              // 判断是否是云存储fileID（以cloud://开头）
              if (fileID && fileID.startsWith('cloud://')) {
                wx.cloud.deleteFile({
                  fileList: [fileID],
                  success: () => {
                    console.log('云存储文件删除成功');
                  },
                  fail: (err) => {
                    console.error('云存储文件删除失败:', err);
                    // 即使文件删除失败，也继续删除本地数据
                  }
                });
              }
              
              // 更新本地数据
              list.splice(index, 1);
              this.setData({ [type]: list });
              // 重新过滤以刷新显示
              this.filterContent();
              
              this.hideMyLoading();
              this._showCustomToast('已删除', 'success');
            },
            fail: (err) => {
              console.error('删除数据库记录失败:', err);
              this.hideMyLoading();
              this._showCustomToast('删除失败', 'none');
            }
          });
        }
      }
    });
  },

  // 编辑项目
  editItem: function(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = type === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    const item = list[index];
    
    if (!item) return;
    
    this.setData({
      showEditModal: true,
      editItemData: { ...item },
      editItemType: type,
      editItemIndex: index
    });
  },

  // 关闭编辑弹窗
  hideEditModal: function() {
    this.setData({ editModalClosing: true });
    setTimeout(() => {
      this.setData({
        showEditModal: false,
        editItemData: null,
        editItemType: '',
        editItemIndex: -1,
        editModalClosing: false
      });
    }, 420);
  },

  // 空函数，用于阻止事件冒泡和滚动
  noop() {},

  // 保存编辑
  saveEdit: function() {
    const { editItemData, editItemType, editItemIndex } = this.data;
    
    if (!editItemData || !editItemData._id) {
      this._showCustomToast('数据错误', 'none');
      return;
    }
    
    wx.showModal({
      title: '编辑内容',
      editable: true,
      placeholderText: '请输入新标题',
      content: editItemData.title || '',
      success: (res) => {
        if (res.confirm && res.content) {
          const newTitle = res.content;
          
          // 更新云数据库
          db.collection('azjc').doc(editItemData._id).update({
            data: { title: newTitle },
            success: () => {
              // 更新本地数据
              const allList = editItemType === 'chapters' ? this.data.chapters : this.data.graphics;
              const item = allList.find(i => i._id === editItemData._id);
              if (item) {
                item.title = newTitle;
                this.setData({
                  [editItemType === 'chapters' ? 'chapters' : 'graphics']: allList
                });
                this.filterContent();
              }
              
              this.hideEditModal();
              this._showCustomToast('编辑成功', 'success');
            },
            fail: (err) => {
              console.error('更新失败:', err);
              this._showCustomToast('更新失败', 'none');
            }
          });
        }
      }
    });
  },

  // 编辑匹配码
  editMatchCode: function() {
    const { editItemData } = this.data;
    
    if (!editItemData) return;
    
    // 显示匹配码选择弹窗
    const availableProducts = this.data.products.filter(p => p._id);
    const availableTypes = this.data.types.filter(t => t._id);
    
    let productNum = 1;
    let typeNum = 1;
    let productIndex = 0;
    let typeIndex = 0;
    
    // 如果有现有匹配码，解析并设置
    if (editItemData.matchCode) {
      const matchParts = editItemData.matchCode.split('+');
      if (matchParts.length === 2) {
        productNum = parseInt(matchParts[0]);
        typeNum = parseInt(matchParts[1]);
        
        productIndex = availableProducts.findIndex(p => p.number === productNum);
        typeIndex = availableTypes.findIndex(t => t.number === typeNum);
        
        if (productIndex < 0) productIndex = 0;
        if (typeIndex < 0) typeIndex = 0;
      }
    }
    
    this.setData({
      showMatchCodePicker: true,
      tempUploadData: {
        mediaType: editItemData.url ? 'video' : 'image',
        fileID: editItemData.fileID,
        title: editItemData.title,
        data: { _id: editItemData._id },
        isEdit: true // 标记为编辑模式
      },
      availableProducts: availableProducts,
      availableTypes: availableTypes,
      matchCodeProductNum: productNum,
      matchCodeTypeNum: typeNum,
      matchCodeProductIndex: productIndex,
      matchCodeTypeIndex: typeIndex,
      currentProductName: availableProducts[productIndex] ? availableProducts[productIndex].name : '',
      currentTypeName: availableTypes[typeIndex] ? availableTypes[typeIndex].name : ''
    });
    
    this.hideEditModal();
  },

  // 长按开始拖拽
  onDragStart: function(e) {
    if (!this.data.isAdmin) return;
    
    const index = parseInt(e.currentTarget.dataset.index);
    const type = e.currentTarget.dataset.type;
    const startY = e.touches[0].clientY;
    
    this.setData({
      dragStartY: startY,
      dragCurrentY: startY,
      dragIndex: index,
      dragType: type,
      isDragging: false
    });
    
    // 设置长按定时器
    this.data.longPressTimer = setTimeout(() => {
      wx.vibrateShort({ type: 'medium' });
      this.setData({
        isDragging: true,
        lastVibrateTime: Date.now()
      });
    }, 300);
  },

  // 拖拽移动
  onDragMove: function(e) {
    if (!this.data.isAdmin) return;
    
    // 如果还没开始拖拽，但移动距离超过阈值，取消长按定时器
    if (!this.data.isDragging && this.data.longPressTimer) {
      const moveY = Math.abs(e.touches[0].clientY - this.data.dragStartY);
      if (moveY > 10) {
        clearTimeout(this.data.longPressTimer);
        this.data.longPressTimer = null;
      }
      return;
    }
    
    if (!this.data.isDragging) return;
    
    e.preventDefault && e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.data.dragStartY;
    
    // 卡片跟随手指移动
    this.setData({
      dragCurrentY: currentY,
      dragOffsetY: deltaY
    });
    
    // 计算卡片高度（rpx转px）
    const winInfo = wx.getWindowInfo();
    const cardHeightPx = 540 * winInfo.windowWidth / 750; // 假设卡片高度540rpx
    
    // 计算目标位置索引
    const moveIndex = Math.round(deltaY / cardHeightPx);
    const targetIndex = this.data.dragIndex + moveIndex;
    const list = this.data.dragType === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    
    // 交换位置
    if (targetIndex >= 0 && 
        targetIndex < list.length && 
        targetIndex !== this.data.dragIndex &&
        targetIndex !== this.data.lastSwapIndex) {
      
      const newList = [...list];
      const temp = newList[this.data.dragIndex];
      newList[this.data.dragIndex] = newList[targetIndex];
      newList[targetIndex] = temp;
      
      // 更新order值
      const allList = this.data.dragType === 'chapters' ? this.data.chapters : this.data.graphics;
      const allItem1 = allList.find(i => i._id === list[this.data.dragIndex]._id);
      const allItem2 = allList.find(i => i._id === list[targetIndex]._id);
      
      if (allItem1 && allItem2) {
        const tempOrder = allItem1.order || 0;
        allItem1.order = allItem2.order || 0;
        allItem2.order = tempOrder;
        
        // 同步到云数据库
        const updatePromises = [];
        if (allItem1._id) {
          updatePromises.push(
            db.collection('azjc').doc(allItem1._id).update({
              data: { order: allItem1.order }
            })
          );
        }
        if (allItem2._id) {
          updatePromises.push(
            db.collection('azjc').doc(allItem2._id).update({
              data: { order: allItem2.order }
            })
          );
        }
        
        Promise.all(updatePromises).catch(err => {
          console.error('更新排序失败:', err);
        });
      }
      
      const remainingOffset = deltaY - (moveIndex * cardHeightPx);
      
      this.setData({
        [this.data.dragType === 'chapters' ? 'filteredChapters' : 'filteredGraphics']: newList,
        [this.data.dragType === 'chapters' ? 'chapters' : 'graphics']: allList,
        dragIndex: targetIndex,
        dragStartY: currentY - remainingOffset,
        dragOffsetY: remainingOffset,
        lastSwapIndex: targetIndex
      });
      
      // 震动反馈（节流）
      const now = Date.now();
      if (now - this.data.lastVibrateTime > 100) {
        wx.vibrateShort({ type: 'light' });
        this.setData({ lastVibrateTime: now });
      }
    }
  },

  // 拖拽结束
  onDragEnd: function(e) {
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.data.longPressTimer = null;
    }
    
    if (!this.data.isDragging) return;
    
    const { dragType, dragIndex } = this.data;
    const list = dragType === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    const allList = dragType === 'chapters' ? this.data.chapters : this.data.graphics;
    
    // 重新计算所有项目的order值（根据当前显示顺序）
    const updatePromises = [];
    list.forEach((item, index) => {
      const allItem = allList.find(i => i._id === item._id);
      if (allItem && allItem.order !== index) {
        allItem.order = index;
        if (allItem._id) {
          updatePromises.push(
            db.collection('azjc').doc(allItem._id).update({
              data: { order: index }
            }).catch(err => {
              console.error('更新order失败:', err);
            })
          );
        }
      }
    });
    
    // 等待所有更新完成
    Promise.all(updatePromises).then(() => {
      // 更新本地数据
      this.setData({
        [dragType === 'chapters' ? 'chapters' : 'graphics']: allList
      });
      
      // 重置拖拽状态
      this.setData({
        isDragging: false,
        dragIndex: -1,
        dragOffsetY: 0,
        dragStartY: 0,
        dragCurrentY: 0,
        lastSwapIndex: -1,
        dragType: ''
      });
      
      // 重新过滤内容以更新显示
      this.filterContent();
      
      this._showCustomToast('排序已保存', 'success', 1000);
    }).catch(err => {
      console.error('保存排序失败:', err);
      // 即使失败也重置状态
      this.setData({
        isDragging: false,
        dragIndex: -1,
        dragOffsetY: 0,
        dragStartY: 0,
        dragCurrentY: 0,
        lastSwapIndex: -1,
        dragType: ''
      });
      this.filterContent();
    });
  },

  // 手势监听（滑回重置）
  // 🔴 新增：视频容器触摸开始（阻止事件传播到页面）
  onVideoContainerTouchStart(e) {
    // 阻止事件传播，防止触发页面滚动
    e.stopPropagation && e.stopPropagation();
    this.onVideoTouchStart(e);
  },

  // 🔴 新增：视频容器触摸移动（阻止事件传播到页面）
  onVideoContainerTouchMove(e) {
    // 阻止事件传播，防止触发页面滚动
    e.stopPropagation && e.stopPropagation();
    this.onVideoTouchMove(e);
  },

  // 🔴 新增：视频容器触摸结束（阻止事件传播到页面）
  onVideoContainerTouchEnd(e) {
    // 阻止事件传播，防止触发页面滚动
    e.stopPropagation && e.stopPropagation();
    this.onVideoTouchEnd(e);
  },

  // 🔴 新增：视频触摸开始
  onVideoTouchStart(e) {
    // 记录触摸开始位置，用于判断滑动方向
    if (e.touches && e.touches.length > 0) {
      this._videoTouchStartY = e.touches[0].clientY;
      this._isVideoTouching = true;
      this._videoTouchMoved = false; // 标记是否发生了移动
    }
  },

  // 🔴 新增：视频触摸移动
  onVideoTouchMove(e) {
    // 视频拖拽中，记录移动距离
    if (e.touches && e.touches.length > 0 && this._videoTouchStartY !== undefined) {
      const moveY = e.touches[0].clientY - this._videoTouchStartY;
      // 如果移动距离超过阈值，认为是有效拖拽
      if (Math.abs(moveY) > 10) {
        this._videoTouchMoved = true;
        this._videoLastMoveY = moveY; // 记录最后移动方向（正数=向下，负数=向上）
      }
    }
    this._isVideoTouching = true;
  },

  // 🔴 新增：视频触摸结束
  onVideoTouchEnd(e) {
    // 只有发生了移动才记录拖拽结束时间
    if (this._videoTouchMoved) {
      // 记录视频拖拽结束时间和方向（向下拖拽为正数）
      const slideDirection = this._videoLastMoveY > 0 ? 'down' : 'up';
      this.setData({
        videoSlideEndTime: Date.now(),
        videoSlideDirection: slideDirection // 记录滑动方向
      });
      
      console.log('🔴 [onVideoTouchEnd] 视频拖拽结束，方向:', slideDirection, '移动距离:', this._videoLastMoveY);
      
      // 1.5秒后清除锁定（延长锁定时间，确保完全阻止）
      setTimeout(() => {
        this.setData({
          videoSlideEndTime: 0,
          videoSlideDirection: ''
        });
      }, 1500);
    }
    
    this._isVideoTouching = false;
    this._videoTouchMoved = false;
  },

  touchStart: function(e) {
    // 🔴 修复：如果视频拖拽刚结束（1秒内），不记录起始位置，防止触发翻页
    const now = Date.now();
    const videoSlideEndTime = this.data.videoSlideEndTime;
    if (videoSlideEndTime && (now - videoSlideEndTime) < 1000) {
      console.log('🔴 [touchStart] 视频拖拽刚结束（1秒内），阻止记录起始位置');
      return;
    }
    
    // 如果正在全屏或已锁定，不记录起始位置，防止误触发翻页
    if (this.data.isVideoFullScreen || this.data.locked) {
      return;
    }
    this.setData({ startY: e.touches[0].pageY });
  },

  touchEnd: function(e) {
    // 🔴 修复：如果视频拖拽刚结束（1秒内），完全阻止页面滚动
    const now = Date.now();
    const videoSlideEndTime = this.data.videoSlideEndTime;
    
    // 如果正在全屏或已锁定，不处理翻页
    // 🔴 额外检查：如果正在处理全屏切换，也不处理翻页（防止点击全屏按钮时触发）
    if (this.data.isVideoFullScreen || this.data.locked || this._isHandlingFullScreen) return;

    // 🔴 修复：如果视频拖拽刚结束（1.5秒内），完全阻止页面滚动（不管什么方向）
    if (videoSlideEndTime && (now - videoSlideEndTime) < 1500) {
      console.log('🔴 [touchEnd] 视频拖拽刚结束（1.5秒内），完全阻止页面滚动');
      return; // 完全阻止，不管什么方向
    }

    let endY = e.changedTouches[0].pageY;
    let distance = endY - this.data.startY;
    
    // 🔴 管理员模式：可以上下滑动，无限制
    if (this.data.isAdmin) {
      if (Math.abs(distance) > 50) {
        if (distance > 0 && this.data.stepIndex > 0) {
          // 向下滑动 -> 回退上一页
          const newStepIndex = this.data.stepIndex - 1;
          this.setData({ stepIndex: newStepIndex });
          this.updatePageTitle(newStepIndex); // 🔴 更新标题
        } else if (distance < 0 && this.data.stepIndex < 2) {
          // 向上滑动 -> 进入下一页
          const newStepIndex = this.data.stepIndex + 1;
          this.setData({ stepIndex: newStepIndex });
          this.updatePageTitle(newStepIndex); // 🔴 更新标题
        }
      }
      return; // 管理员逻辑执行完直接结束，不走下面的普通用户逻辑
    }

    // --- 以下是普通用户逻辑：只能往下滑返回，不能往上滑 ---
    if (distance > 80) { // 向下滑动
      // 仅在非视频列表页（stepIndex不为2）时才允许向下滑动返回
      if (this.data.stepIndex === 1) {
        this.setData({ stepIndex: 0 }); // 产品保持记录
        this.updatePageTitle(0); // 🔴 更新标题
      }
    }
    // 🔴 普通用户模式下，向上滑动被禁止（不处理 distance < 0 的情况）
  },

  // 1. 新增：拦截视频区域的触摸，防止翻页
  doNothing: function() {},
  videoTouchStart: function() { 
    // 立即锁定，防止点击全屏按钮时触发翻页
    this.setData({ locked: true }); 
  },
  videoTouchEnd: function() { 
    // 延迟释放，防止误触
    // 注意：如果正在全屏，锁定会由 onVideoFullScreen 管理，这里不释放
    setTimeout(() => { 
      if (!this.data.isVideoFullScreen) {
        this.setData({ locked: false }); 
      }
    }, 150); 
  },

// 3. 修改：滚动监听 (只记录不渲染)

  onScroll(e) {
    if (!this.data.isVideoFullScreen) {
      this.privateScrollTop = e.detail.scrollTop;
    this.scrollTopValue = e.detail.scrollTop;
    }
  },

  // 🔴 打开全屏视频遮罩层（自定义按钮触发）
  openFullScreenVideo(e) {
    const index = e.currentTarget.dataset.index;
    const videoUrl = this.data.filteredChapters[index]?.url || '';

    // 🔴 标记正在处理全屏切换，防止 touchEnd 事件干扰
    this._isHandlingFullScreen = true;

    // 🔴 获取原视频卡片的位置信息
    const query = wx.createSelectorQuery().in(this);
    query.select(`#video-card-${index}`).boundingClientRect((rect) => {
      if (!rect) {
        // 如果获取不到位置，使用默认动画
        this.setData({
          isVideoFullScreen: true,
          fullScreenVideoUrl: videoUrl,
          fullScreenVideoIndex: index,
          fullScreenVideoPaused: false,
          fullScreenVideoInitialStyle: '',
          locked: true
        });
        return;
      }

      // 获取窗口尺寸
      const winInfo = wx.getWindowInfo();
      const windowWidth = winInfo.windowWidth;
      const windowHeight = winInfo.windowHeight;

      // 计算原视频卡片的位置和尺寸（rpx转px）
      const cardLeft = rect.left;
      const cardTop = rect.top;
      const cardWidth = rect.width;
      const cardHeight = rect.height;

      // 计算中心点偏移
      const centerX = windowWidth / 2;
      const centerY = windowHeight / 2;
      const cardCenterX = cardLeft + cardWidth / 2;
      const cardCenterY = cardTop + cardHeight / 2;

      // 计算缩放比例（使用较大的缩放值，确保填满屏幕）
      const scale = Math.max(windowWidth / cardWidth, windowHeight / cardHeight);
      
      // 计算位移（从卡片中心移动到屏幕中心）
      // 目标位置(卡片中心) - 初始位置(屏幕中心)
      const moveX = cardCenterX - centerX;
      const moveY = cardCenterY - centerY;

      // 设置初始transform（从原位置开始，缩小到卡片大小）
      const initialStyle = `transform: translate(${moveX}px, ${moveY}px) scale(${1/scale});`;

      // 🔴 先显示遮罩层（初始状态：在原位置，不添加active类）
      // 同时清除关闭状态，确保动画流畅
      // 注意：原视频的暂停状态会在打开时保持（默认播放，如果用户在全屏中暂停，关闭时会同步）
      this.setData({
        isVideoFullScreen: true,
        fullScreenVideoUrl: videoUrl,
        fullScreenVideoIndex: index,
        fullScreenVideoPaused: false, // 🔴 默认播放状态，如果原视频是暂停的，需要手动处理
        fullScreenVideoInitialStyle: initialStyle,
        fullScreenVideoTransform: '', // 先不设置transform，使用内联样式
        fullScreenVideoMaskClosing: false, // 🔴 清除关闭状态，确保打开动画流畅
        locked: true
      });
      
      // 🔴 修复：禁用页面滚动，防止视频拖拽结束后触发页面滚动
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && currentPage.setData) {
        // 通过设置页面样式禁用滚动
        wx.setPageStyle({
          style: {
            overflow: 'hidden',
            height: '100vh'
          }
        });
      }

      // 🔴 延迟一帧后添加active类触发动画，确保初始状态已渲染
      // 这样会先显示白色背景（opacity变为1），然后视频飞出来，最后背景渐变到黑色
      setTimeout(() => {
        this.setData({
          fullScreenVideoTransform: 'active' // 添加active类触发视频放大动画
        });
        
        // 🔴 修复：动画开始后，延迟一点时间再播放视频，确保视频已渲染
        setTimeout(() => {
          const videoContext = wx.createVideoContext('fullscreen-video-player');
          videoContext.play();
        }, 100);
      }, 50);
    }).exec();
  },

  // 🔴 切换全屏视频播放/暂停
  toggleFullScreenVideoPlay(e) {
    // 如果点击的是关闭按钮，不处理
    if (e.target && e.target.classList && e.target.classList.contains('fullscreen-close-btn')) {
      return;
    }
    
    const paused = !this.data.fullScreenVideoPaused;
    this.setData({ fullScreenVideoPaused: paused });
    
    // 控制视频播放/暂停
    const videoContext = wx.createVideoContext('fullscreen-video-player');
    if (paused) {
      videoContext.pause();
    } else {
      videoContext.play();
    }
  },

  // 🔴 关闭全屏视频遮罩层
  closeFullScreenVideo(e) {
    console.log('🔴 [closeFullScreenVideo] 点击关闭按钮');
    
    // 🔴 防止重复点击
    if (this._isClosingFullScreen) {
      console.log('⚠️ [closeFullScreenVideo] 正在关闭中，忽略重复点击');
      return;
    }
    this._isClosingFullScreen = true;
    
    // 🔴 保存当前全屏视频的暂停状态
    const pausedState = this.data.fullScreenVideoPaused;
    const videoIndex = this.data.fullScreenVideoIndex;
    
    console.log('🔴 [closeFullScreenVideo] 开始关闭，pausedState:', pausedState, 'videoIndex:', videoIndex);
    
    // 🔴 修复：直接触发关闭动画，不设置暂停状态，不调用 pause()
    // 让视频继续播放直到动画完成，然后通过清空 URL 来停止播放
    // 同时触发视频缩小和背景变透明，让动画同步进行
    this.setData({
      fullScreenVideoTransform: '', // 移除active类，触发视频缩小动画
      fullScreenVideoMaskClosing: true // 🔴 添加关闭状态，触发背景变透明
      // 🔴 不设置 fullScreenVideoPaused，避免视频立即暂停
    });
    
    console.log('🔴 [closeFullScreenVideo] 已设置关闭状态');
    
    // 🔴 延迟后隐藏遮罩层，并同步暂停状态到原视频（等待动画完成）
    setTimeout(() => {
      // 🔴 在动画完成后才暂停视频（此时用户已经看不到视频了）
      const videoContext = wx.createVideoContext('fullscreen-video-player');
      videoContext.pause();
      
      // 🔴 同步暂停状态到原视频
      if (videoIndex >= 0) {
        const originalVideoContext = wx.createVideoContext(`video-${videoIndex}`);
        if (pausedState) {
          originalVideoContext.pause(); // 如果全屏时是暂停的，原视频也暂停
        } else {
          originalVideoContext.play(); // 如果全屏时是播放的，原视频也播放
        }
      }
      
      this.setData({
        isVideoFullScreen: false,
        fullScreenVideoUrl: '', // 🔴 清空 URL 停止播放
        fullScreenVideoIndex: -1,
        fullScreenVideoPaused: false,
        fullScreenVideoInitialStyle: '',
        fullScreenVideoMaskClosing: false // 🔴 清除关闭状态
      });
      
      // 🔴 修复：恢复页面滚动
      wx.setPageStyle({
        style: {
          overflow: 'auto',
          height: 'auto'
        }
      });
      
      setTimeout(() => {
        this.setData({ locked: false });
        this._isHandlingFullScreen = false;
        this._isClosingFullScreen = false; // 🔴 重置关闭标志
      }, 100);
    }, 500); // 🔴 调整时间与动画时间一致（0.5s，与打开时同步）
  },

  // 视频进入/退出全屏（保留此函数以防万一，但不再使用）
  onVideoFullScreen(e) {
    // 🔴 完全禁用原视频组件的全屏功能，防止页面跳转
    // 如果原视频组件仍然触发了全屏事件，立即关闭它
    if (e.detail.fullScreen) {
      // 阻止原视频组件的全屏功能
      const videoContext = wx.createVideoContext(`video-${e.currentTarget.dataset.index}`);
      if (videoContext) {
        videoContext.exitFullScreen();
      }
    }
  },

  // 视频播放错误处理
  onVideoPlay: function(e) {
    const index = e.currentTarget.dataset.index
    // 🔴 分享码用户：记录视频播放点击
    const sectionKey = `video-${index}`
    this._trackSectionClick(sectionKey)
    this._switchToSection(sectionKey)
  },

  onGraphicTap: function(e) {
    const index = e.currentTarget.dataset.index
    // 🔴 分享码用户：记录图文点击
    const sectionKey = `graphic-${index}`
    this._trackSectionClick(sectionKey)
    this._switchToSection(sectionKey)
  },

  onVideoError: function(e) {
    const { index, fileid } = e.currentTarget.dataset;
    console.error('视频播放失败:', e.detail, 'fileID:', fileid);
    
    // 如果播放失败，尝试重新获取临时链接
    if (fileid && fileid.startsWith('cloud://')) {
      this.showMyLoading('重新加载...');
      
      wx.cloud.getTempFileURL({
        fileList: [fileid],
        success: (urlRes) => {
          if (urlRes.fileList && urlRes.fileList.length > 0 && urlRes.fileList[0].tempFileURL) {
            const tempURL = urlRes.fileList[0].tempFileURL;
            const chapters = [...this.data.chapters];
            if (chapters[index]) {
              chapters[index].url = tempURL;
              chapters[index].needRefresh = false;
              this.setData({ chapters: chapters });
              this.hideMyLoading();
              this._showCustomToast('视频已重新加载', 'success', 1500);
            }
          } else {
            this.hideMyLoading();
            this._showCustomToast('视频加载失败，请稍后重试', 'none');
          }
        },
        fail: (err) => {
          console.error('重新获取临时链接失败:', err);
          this.hideMyLoading();
          this._showCustomToast('视频加载失败', 'none');
        }
      });
    } else {
      this._showCustomToast('视频文件无效', 'none');
    }
  },

  // 🔴 统一的自定义 Loading 显示方法（替换所有 wx.showLoading 和 getApp().showLoading）
  showMyLoading(title = '加载中...') {
    this.setData({
      showLoadingAnimation: true
    });
  },

  // 🔴 统一的自定义 Loading 隐藏方法（替换所有 wx.hideLoading 和 getApp().hideLoading）
  hideMyLoading() {
    this.setData({
      showLoadingAnimation: false
    });
  },

  // 🔴 辅助函数：获取 custom-toast 组件并调用（优先使用缓存的实例）
  _getCustomToast() {
    // 优先使用缓存的实例
    if (this._customToastInstance) {
      return this._customToastInstance;
    }
    // 如果缓存不存在，尝试获取
    const toast = this.selectComponent('#custom-toast');
    if (toast) {
      this._customToastInstance = toast; // 缓存实例
      return toast;
    }
    return null;
  },

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
        console.warn('[azjc] custom-toast 组件未找到，使用降级方案');
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
        console.warn('[azjc] custom-toast 组件未找到，使用降级方案');
        wx.showModal(options);
      }
    };
    tryShow();
  },

  // 返回键处理
  handleBack: function() {
    wx.navigateBack({
      fail: () => {
        // 如果没有上一页，则跳转到首页
        wx.reLaunch({
          url: '/pages/home/home'
        });
      }
    });
  },

  // 🔴 记录板块点击（分享码用户专用）
  _trackSectionClick(sectionKey) {
    if (!this.data.isShareCodeUser) return
    
    const clicks = this.data.sectionClicks
    clicks[sectionKey] = (clicks[sectionKey] || 0) + 1
    this.setData({ sectionClicks: clicks })
  },

  // 🔴 记录板块停留时长（切换板块时调用）
  _recordCurrentSectionDuration() {
    if (!this.data.isShareCodeUser || !this.data.currentSectionKey) return
    
    const now = Date.now()
    const duration = now - this.data.currentSectionStartTime
    if (duration > 0) {
      const durations = this.data.sectionDurations
      durations[this.data.currentSectionKey] = (durations[this.data.currentSectionKey] || 0) + duration
      this.setData({ sectionDurations: durations })
    }
  },

  // 🔴 切换到新板块（记录旧板块时长，开始新板块计时）
  _switchToSection(newSectionKey) {
    if (!this.data.isShareCodeUser) return
    
    // 先记录当前板块时长
    this._recordCurrentSectionDuration()
    
    // 切换到新板块
    this.setData({
      currentSectionKey: newSectionKey,
      currentSectionStartTime: Date.now()
    })
  },

  // 🔴 上传统计数据到云数据库
  async _uploadSessionStats() {
    if (!this.data.isShareCodeUser) {
      console.log('[azjc] 不是分享码用户，跳过上传统计');
      return
    }
    
    const app = getApp()
    if (!app || !app.recordShareCodeSession) {
      console.warn('[azjc] app.recordShareCodeSession 不存在，无法上传统计数据');
      return
    }
    
    // 确保记录当前板块时长
    this._recordCurrentSectionDuration()
    
    const totalDuration = Date.now() - this.data.sessionStartTime
    
    // 🔴 使用页面保存的地址信息（仅在进入时获取一次，之后不再更新）
    const locationInfo = this.data.shareCodeLocationInfo || {
      province: '',
      city: '',
      district: '',
      address: '',
      latitude: null,
      longitude: null
    };
    
    const stats = {
      durationMs: totalDuration,
      sectionClicks: this.data.sectionClicks || {},
      sectionDurations: this.data.sectionDurations || {},
      locationInfo: locationInfo // 🔴 传递固定地址信息（不会重复获取）
    }
    
    console.log('[azjc] 准备上传统计数据:', stats);
    console.log('[azjc] sessionStartTime:', this.data.sessionStartTime);
    console.log('[azjc] 总时长:', totalDuration, 'ms');
    console.log('[azjc] 板块点击次数:', stats.sectionClicks);
    console.log('[azjc] 板块停留时长:', stats.sectionDurations);
    console.log('[azjc] 地址信息（固定，不再更新）:', locationInfo);
    
    try {
      // 🔴 根据是否已创建记录决定是创建新记录还是更新现有记录
      const isUpdate = this.data.shareCodeRecordCreated;
      console.log('[azjc] 调用 recordShareCodeSession，isUpdate:', isUpdate);
      
      await app.recordShareCodeSession(stats, isUpdate);
      
      // 🔴 标记已创建记录，后续调用都是更新
      if (!isUpdate) {
        this.setData({ shareCodeRecordCreated: true });
      }
      
      console.log('[azjc] ✅ 统计数据上传成功');
    } catch (err) {
      console.error('[azjc] ❌ 统计数据上传失败:', err);
    }
  },

  // 🔴 启动定时自动保存
  _startAutoSave() {
    if (!this.data.isShareCodeUser) {
      return;
    }
    
    // 清除旧的定时器
    this._stopAutoSave();
    
    console.log('[azjc] 启动定时自动保存（每30秒）');
    
    // 🔴 修复：定时器ID存储在实例变量中，而不是 data 中
    this.autoSaveTimer = setInterval(() => {
      if (this.data.isShareCodeUser && this.data.sessionStartTime > 0) {
        console.log('[azjc] 定时自动保存触发');
        this._uploadSessionStats().catch(err => {
          console.error('[azjc] 定时自动保存失败:', err);
        });
      }
    }, 30000); // 30秒
  },

  // 🔴 停止定时自动保存
  _stopAutoSave() {
    // 🔴 修复：从实例变量中获取定时器ID
    if (this.autoSaveTimer) {
      console.log('[azjc] 停止定时自动保存');
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
});
