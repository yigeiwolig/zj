const app = getApp();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
// 🔴 使用专门的行政区key（用于省市区选择器 - getCityList）
const MAP_KEY = 'CGRBZ-FLLLL-CNCPC-MQ6YK-YENYT-2MFCD'; // 行政区key（专门用于省市区选择器）
console.log('[my] ✅ 初始化腾讯地图SDK（城市列表），使用的key:', MAP_KEY);
var qqmapsdk = new QQMapWX({
    key: MAP_KEY
});

// 🔴 使用专门的行政区划子key（用于区县选择器 - getDistrictByCityId）
const DISTRICT_KEY = 'ICRBZ-VEELI-CQZGO-UE5G6-BHRMS-VQBIK'; // 行政区划子key（专门用于区县选择器）
console.log('[my] ✅ 初始化腾讯地图SDK（区县列表），使用的key:', DISTRICT_KEY);
var qqmapsdkDistrict = new QQMapWX({
    key: DISTRICT_KEY
});

Page({
  data: {
    countdownTimer: null, // 🔴 倒计时定时器
    currentOrderIndex: 0,
    showModal: false,
    hasModalOpen: false, // 🔴 是否有弹窗打开（用于锁定页面滚动）
    bluetoothReady: false,
    modelOptions: ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'],
    modelIndex: null,
    buyDate: '',
    userName: 'Alexander', // 用户昵称，从存储中读取
    userNameFontSize: 64, // 顶部昵称字体大小（动态调整）
    
    // 蓝牙相关状态
    isScanning: false,      // 是否正在扫描(控制动画)
    connectStatusText: '点击搜索设备',
    currentSn: '', // 【新增】用来存提取出来的纯数字SN
    isDeviceLocked: false, // [新增] 是否被锁
    lockedReason: '',      // [新增] 被锁原因
    connectedDeviceName: '', // [新增] 连接的设备名称
    
    // [新增] 弹窗控制数据
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },
    dialogClosing: false, // 自定义弹窗退出动画中
    autoToastClosing: false, // 自动提示退出动画中
    inputDialogClosing: false, // 输入弹窗退出动画中
    returnAddressDialogClosing: false, // 退货地址弹窗退出动画中
    testPasswordModalClosing: false, // 测试密码弹窗退出动画中
    // 输入弹窗（用于需要输入的场景）
    inputDialog: { show: false, title: '', placeholder: '', value: '', callback: null },
    
    // 图片路径
    imgReceipt: '', // 购买截图
    imgChat: '',    // 聊天记录
    
    // 绑定类型 (new/used)
    bindType: 'new', // 默认新机

    // 这里先留空，等 onShow 自动去云端拉取
    orders: [],

    // 设备数据 (从云端 sn 集合读取)
    deviceList: [],
    
    // 审核列表 (管理员用)
    auditList: [],
    
    // 【新增】管理员审核弹窗数据
    showAuditModal: false,
    currentAuditItem: null, // 当前正在审的那一条
    adminSetDate: '',       // 管理员修改的日期
    adminSetDaysIndex: 1,   // 选中的天数索引（默认365天）
    warrantyOptions: ['180天 (半年)', '365天 (一年)', '500天', '720天 (两年)'], // 选项文案
    warrantyValues: [180, 365, 500, 720], // 对应的值

    myOpenid: '', // 【新增】用来存当前用户的 OpenID

    isAuthorized: false, // 是否是授权管理员
    isAdmin: false,      // 是否开启了管理模式
    
    // 【新增】控制视图模式
    
    // 【新增】拆分数据源
    pendingList: [], // 待物料发出 (PAID)
    
    // Swiper 动态高度
    swiperHeight: 900, // 默认高度，单位 px
    
    // Loading 状态（使用和 index.js 一样的白色背景进度条动画）
    showLoadingAnimation: false,
    loadingText: '加载中...',
    
    // 【新增】我的申请记录
    myActivityList: [], // 存放所有的审核记录
    
    // 【新增】维修工单列表（管理员用）
    repairList: [], // 管理员用的维修列表

    // 【新增】需寄回订单相关
    showReturnRequiredModal: false, // 是否显示需寄回订单确认弹窗
    returnRequiredList: [], // 需寄回订单列表
    myReturnRequiredRepair: null, // 用户当前需要寄回的维修单
    myPurchasePartsRepair: null,  // 仅需购买配件的维修单（needPurchaseParts 且无 needReturn）
    
    // 🔴 新增：权限拒绝提示弹窗
    showPermissionModal: false,
    permissionModalClosing: false,
    
    // 🔴 新增：图标数据
    icons: {
      moreDark: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTIiIHI9IjIiIGZpbGw9IiMxQzFDMUUiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSIjMUMxQzFFIi8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxMiIgcj0iMiIgZmlsbD0iIzFDMUMxRSIvPjwvc3ZnPg==',
      gearSmall: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4LjUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0iIzFDMUMxRSIvPjxwYXRoIGQ9Ik0xMiA0VjJNMTIgMjJWMjBNMjAgMTJIMjJNMiAxMkg0TTE4LjY2IDUuMzRMMTkuNzggNC4yMk0xOS43OCAxOS43OEwxOC42NiAxOC42Nk00LjIyIDE5Ljc4TDUuMzQgMTguNjZNNS4zNCA1LjM0TDQuMjIgNC4yMiIgc3Ryb2tlPSIjMUMxQzFFIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==',
      btDark: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI2LjUgNi41IDE3LjUgMTcuNSAxMiAyMyAxMiAxIDE3LjUgNi41IDYuNSAxNy41Ij48L3BvbHlsaW5lPjwvc3ZnPg=='
    }
    
    // 🔴 新增：购买配件相关
    showPurchasePartsModal: false, // 是否显示购买配件弹窗
    purchasePartsModalModel: '', // 弹窗标题用型号（打开时设，避免标题不见了）
    currentRepairItem: null, // 当前操作的维修单
    purchasePartsList: [], // 配件列表（按型号分类）
    selectedParts: [], // 选中的配件
    purchasePartsNote: '', // 购买配件备注
    
    // 🔴 新增：付费维修确认弹窗
    showPaidRepairConfirmModal: false, // 是否显示付费维修确认弹窗
    currentPaidRepairItem: null, // 当前需要确认的维修单

    
    // 【新增】分享码生成弹窗
    showShareCodeGenerateModal: false,
    shareCodeValue: '',
    
    // 【新增】控制"内容已复制"弹窗
    showCopySuccessModal: false,
    
    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },
    
    // 【新增】用户填写地址信息（在用户端的卡片中）
    userReturnAddress: { name: '', phone: '', address: '' },
    
    // 【新增】底部弹窗控制
    showReturnAddressModal: false,
    returnTrackingIdInput: '', // 运单号输入
    
    // 【新增】物流查询弹窗
    showLogisticsModal: false,
    currentTrackingId: '', // 当前查看的运单号
    logisticsData: null, // 物流查询结果
    logisticsLoading: false, // 是否正在加载
    logisticsError: null, // 物流查询错误信息
    
    // 🔴 管理员填写用户地址（临时数据）
    showReturnAddressDialog: false,
    tempReturnAddress: { name: '', phone: '', address: '' },
    
    // 🔴 智能分析弹窗相关
    showSmartAnalyzeModal: false,
    smartAnalyzeVal: '',
    
    // 🔴 新增：省市区选择（复制自 shouhou 页面）
    selectedProvince: '',  // 选中的省份
    selectedCity: '',      // 选中的城市
    selectedDistrict: '',  // 选中的区县
    provinceList: [],      // 省份列表
    cityList: [],          // 城市列表
    districtList: [],      // 区县列表
    provinceIndex: -1,     // 省份选择索引
    cityIndex: -1,         // 城市选择索引
    districtIndex: -1,     // 区县选择索引

    // 【新增】测试密码输入弹窗
    showTestPasswordModal: false,
    testPasswordInput: '',
    isClearingData: false, // 是否正在清空数据
    clearProgress: { current: 0, total: 0, currentCollection: '' }, // 清空进度
    
    // 🔴 定位权限相关
    showLocationPermissionModal: false, // 是否显示定位权限提示遮罩
    locationPermissionChecking: false, // 是否正在检查定位权限
    
    // 🔴 新增：填写售后单弹窗相关
    showFillRepairModal: false, // 是否显示填写售后单弹窗
    currentFillRepairItem: null, // 当前填写的维修单
    fillRepairItems: [], // 维修项目列表 [{name: '主板', price: 100}, ...]
    fillRepairTrackingId: '', // 运单号（未过质保时使用）
    fillRepairTotalPrice: 0, // 总价
    fillRepairTotalPriceFormatted: '0.00', // 格式化后的总价（用于显示）
    
    // 🔴 新增：过质保用户支付后填写运单号
    returnTrackingIdForPaidRepair: '', // 过质保用户支付后填写的运单号
  },

  // 互斥：确保同一时间只显示一个弹窗/提示
  _closeAllPopups() {
    try { wx.hideToast(); } catch (e) {}
    try { wx.hideLoading(); } catch (e) {}
    const patch = {};
    if (this.data.showShareCodeGenerateModal) patch.showShareCodeGenerateModal = false;
    if (this.data.showModal) patch.showModal = false;
    if (this.data.showCopySuccessModal) patch.showCopySuccessModal = false;
    if (this.data.autoToast && this.data.autoToast.show) {
      patch['autoToast.show'] = false;
      if (this.data.autoToastClosing) patch.autoToastClosing = false;
    }
    if (Object.keys(patch).length) this.setData(patch);
  },

  _showCopySuccessOnce() {
    // 🔴 清理之前的定时器，避免快速连续调用时状态混乱
    if (this._copySuccessTimer) {
      clearTimeout(this._copySuccessTimer);
      this._copySuccessTimer = null;
    }
    this._closeAllPopups();
    this.setData({ showCopySuccessModal: true });
    this.updateModalState(); // 🔴 更新弹窗状态
    this._copySuccessTimer = setTimeout(() => {
      this.setData({ showCopySuccessModal: false });
      this.updateModalState(); // 🔴 更新弹窗状态
      this._copySuccessTimer = null;
    }, 1500);
  },


  onLoad(options) {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('my');
    }
    
    // 🔴 my页面不启用截屏/录屏封禁
    // this.initScreenshotProtection();
    
    // 读取用户昵称
    const savedNickname = wx.getStorageSync('user_nickname');
    if (savedNickname) {
      this.setData({ 
        userName: savedNickname,
        userNameFontSize: this.calculateNameFontSize(savedNickname, 64) // 顶部昵称默认64rpx
      });
    } else {
      // 即使没有保存的昵称，也要计算默认昵称的字体大小
      this.setData({ 
        userNameFontSize: this.calculateNameFontSize(this.data.userName, 64)
      });
    }
    
    this.checkAdminPrivilege();
    
    // 1. 初始化蓝牙助手
    this.ble = new BLEHelper(wx);
    this.setupBleCallbacks();
    
    // 🔴 【新增】电商模式：根据 orderId 参数跳转到对应订单
    if (options && options.orderId) {
      this.pendingOrderId = options.orderId; // 保存待跳转的订单号
      console.log('[my] 收到订单号参数，等待订单列表加载后跳转:', options.orderId);
    }
    
    // 🔴 加载省份列表（省市区选择器）
    this.loadProvinceList();
  },

  onShow() {
    // 🔴 my页面不检查录屏状态
    // if (wx.getScreenRecordingState) {
    //   wx.getScreenRecordingState({
    //     success: (res) => {
    //       if (res.state === 'on' || res.recording) {
    //         this.handleIntercept('record');
    //       }
    //     }
    //   });
    // }
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    // 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('[my] 🛡️ 硬件级防偷拍锁定')
      });
    }

    // 截屏监听
    wx.onUserCaptureScreen(() => {
      this.handleIntercept('screenshot');
    });

    // 录屏监听
    if (wx.onUserScreenRecord) {
      wx.onUserScreenRecord(() => {
        this.handleIntercept('record');
      });
    }
  },

  // 🔴 检查定位权限状态
  async _checkLocationPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.userLocation'] === true) {
            resolve(true); // 已授权
          } else if (res.authSetting['scope.userLocation'] === false) {
            resolve(false); // 已拒绝
          } else {
            resolve(null); // 未询问过
          }
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  },

  // 🔴 等待用户授权定位权限（轮询检查）
  async _waitForLocationPermission() {
    return new Promise((resolve) => {
      // 显示权限提示遮罩
      this.setData({ 
        showLocationPermissionModal: true,
        locationPermissionChecking: true
      });
      this.updateModalState();

      // 轮询检查权限状态
      const checkInterval = setInterval(async () => {
        const hasPermission = await this._checkLocationPermission();
        
        if (hasPermission === true) {
          // 用户已授权
          clearInterval(checkInterval);
          this.setData({ 
            showLocationPermissionModal: false,
            locationPermissionChecking: false
          });
          this.updateModalState();
          resolve(true);
        } else if (hasPermission === false) {
          // 用户已拒绝，继续等待（不关闭遮罩）
          // 遮罩会一直显示，等待用户去设置页面开启权限
        }
        // hasPermission === null 表示未询问过，继续等待
      }, 500); // 每500ms检查一次

      // 🔴 不设置超时，一直等待直到用户授权
      // 这样可以确保用户必须授权才能继续使用
    });
  },

  // 🔴 关闭定位权限提示遮罩（拒绝按钮）
  closeLocationPermissionModal() {
    // 不允许关闭，必须授权才能继续
    this._showCustomToast('需要授权定位才能使用此功能', 'none', 2000);
  },

  // 🔴 打开设置页面让用户授权
  _openLocationSetting() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation'] === true) {
          // 用户已授权，关闭遮罩
          this.setData({ 
            showLocationPermissionModal: false,
            locationPermissionChecking: false
          });
          this.updateModalState();
          // 重新尝试获取定位
          this._getLocationAndDeviceInfo().then(locationData => {
            // 继续执行后续逻辑
            console.log('[my] 定位权限已授权，位置信息获取成功');
          }).catch(err => {
            console.error('[my] 获取位置信息失败:', err);
            // 如果还是失败，继续等待
            this._waitForLocationPermission();
          });
        } else {
          // 用户仍未授权，继续等待
          this._showCustomToast('请在设置中开启定位权限', 'none', 2000);
        }
      }
    });
  },

  // 🔴 获取位置和设备信息的辅助函数（必须解析出详细地址）
  async _getLocationAndDeviceInfo() {
    const devInfo = wx.getDeviceInfo();
    const deviceInfo = {
      deviceInfo: devInfo.system || '',
      phoneModel: devInfo.model || ''
    };
    
    // 🔴 循环检查权限，直到用户授权
    while (true) {
      // 检查权限状态
      const hasPermission = await this._checkLocationPermission();
      
      // 如果未授权或已拒绝，等待用户授权
      if (hasPermission !== true) {
        await this._waitForLocationPermission();
        // 等待后继续循环检查
        continue;
      }
      
      // 已授权，尝试获取定位
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
        
        // 🔴 使用带重试机制的逆地理编码获取详细地址
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
        // 如果获取定位失败（可能是权限被拒绝），继续等待授权
        if (err.errMsg && (err.errMsg.includes('auth deny') || err.errMsg.includes('permission'))) {
          console.log('[my] 定位权限被拒绝，继续等待授权...');
          await this._waitForLocationPermission();
          continue; // 继续循环等待
        } else {
          // 其他错误，抛出
          throw err;
        }
      }
    }
  },

  // 🔴 处理截屏/录屏拦截
  async handleIntercept(type) {
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[my] 🔴 截屏/录屏检测，立即跳转');
    
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const devInfo = wx.getDeviceInfo();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'my',
        deviceInfo: devInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        console.log('[my] ✅ 设置封禁状态成功:', res);
      },
      fail: (err) => {
        console.error('[my] ⚠️ 设置封禁状态失败:', err);
      }
    });

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'my',
          ...locationData
        },
        success: (res) => {
          console.log('[my] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[my] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      console.log('[my] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[my] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[my] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[my] 跳转到 blocked 页面成功');
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[my] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        wx.exitMiniProgram();
      }
    });
  },

  onUnload() {
    // 页面销毁时断开蓝牙，释放资源
    if (this.ble) {
      this.ble.stopScan();
      this.ble.disconnect();
    }
    // 🔴 清除倒计时定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },

  // --- 1. 页面显示时，加载云端数据 ---
  onShow() {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/my/my.js:onShow',
        message: 'onShow called',
        data: { 
          timestamp: Date.now(),
          hasLoading: this.data.showLoadingAnimation
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'scroll-performance',
        hypothesisId: 'onShow-freq'
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

    // 🔴 防抖：如果正在加载，不重复加载
    if (this._isLoading) {
      console.log('[onShow] 正在加载中，跳过重复加载');
      return;
    }

    // 🔴 检查录屏状态
    if (wx.getScreenRecordingState) {
      wx.getScreenRecordingState({
        success: (res) => {
          if (res.state === 'on' || res.recording) {
            this.handleIntercept('record');
          }
        }
      });
    }

    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }

    // 🔴 修复：页面显示时重置滚动锁定状态，防止页面卡住
    this.updateModalState();

    // 🔴 立即显示 loading，提升用户体验
    this.showMyLoading('同步中...');
    this._isLoading = true;
    
    // 每次显示时重新读取昵称（可能在其他页面修改了）
    const savedNickname = wx.getStorageSync('user_nickname');
    if (savedNickname) {
      this.setData({ 
        userName: savedNickname,
        userNameFontSize: this.calculateNameFontSize(savedNickname, 64) // 顶部昵称默认64rpx
      });
    } else {
      // 即使没有保存的昵称，也要计算默认昵称的字体大小
      this.setData({ 
        userNameFontSize: this.calculateNameFontSize(this.data.userName, 64)
      });
    }
    
    // 🔴 清理表单数据，避免残留
    // 但如果绑定弹窗打开状态（用户正在选图片），不清空绑定相关数据
    if (!this.data.showModal) {
      this.setData({
        userReturnAddress: { name: '', phone: '', address: '' },
        tempReturnAddress: { name: '', phone: '', address: '' },
        returnTrackingIdInput: '',
        imgReceipt: '',
        imgChat: '',
        buyDate: '',
        modelIndex: null,
        testPasswordInput: '',
        showReturnAddressDialog: false,
        showReturnAddressModal: false
      });
    } else {
      // 绑定弹窗打开时，只清理非绑定相关的数据
      this.setData({
        userReturnAddress: { name: '', phone: '', address: '' },
        tempReturnAddress: { name: '', phone: '', address: '' },
        returnTrackingIdInput: '',
        testPasswordInput: '',
        showReturnAddressDialog: false,
        showReturnAddressModal: false
      });
    }
    
    // 🔴 先检查权限获取 openid，然后再加载数据
    this.checkAdminPrivilege().then(() => {
      // 确保 myOpenid 已获取后再加载数据，等待所有数据加载完成后再隐藏 loading
      const loadPromises = [
        this.loadMyOrdersPromise(),
        this.loadMyActivitiesPromise()
      ];
      
      // 🔴 如果是管理员，同时加载待处理维修工单列表
      if (this.data.isAdmin) {
        loadPromises.push(
          new Promise((resolve) => {
            this.loadPendingRepairs();
            // loadPendingRepairs 是异步的，但不需要等待，直接 resolve
            setTimeout(resolve, 100);
          })
        );
      }
      
      Promise.all(loadPromises).then(() => {
        // 🔴 每次进入页面时检测购买配件状态
        this.checkPurchasePartsStatusOnPageLoad().then(() => {
        this.hideMyLoading();
        this._isLoading = false;
        }).catch(() => {
          this.hideMyLoading();
          this._isLoading = false;
        });
      }).catch((err) => {
        console.error('[onShow] 加载数据失败:', err);
        this.hideMyLoading();
        this._isLoading = false;
      });
    }).catch((err) => {
      console.warn('[onShow] 权限检查失败，尝试作为普通用户加载:', err);
      // 🔴 修复：即使权限检查失败，也要尝试获取 openid 并加载订单
      if (!this.data.myOpenid) {
        // 如果还没有 openid，先获取
        wx.cloud.callFunction({ name: 'login' }).then(res => {
          const myOpenid = res.result.openid;
          this.setData({ myOpenid: myOpenid });
          console.log('[onShow] 权限检查失败后获取 openid:', myOpenid.substring(0, 10) + '...');
          // 获取到 openid 后加载数据
          return Promise.all([
            this.loadMyOrdersPromise(),
            this.loadMyActivitiesPromise()
          ]);
        }).then(() => {
          this.hideMyLoading();
          this._isLoading = false;
        }).catch((loadErr) => {
          console.error('[onShow] 获取 openid 后加载数据失败:', loadErr);
          this.hideMyLoading();
          this._isLoading = false;
        });
      } else {
        // 如果已经有 openid，直接加载数据
        Promise.all([
          this.loadMyOrdersPromise(),
          this.loadMyActivitiesPromise()
        ]).then(() => {
          this.hideMyLoading();
          this._isLoading = false;
        }).catch((loadErr) => {
          console.error('[onShow] 加载数据失败:', loadErr);
          this.hideMyLoading();
          this._isLoading = false;
        });
      }
    });
  },

  // ================== 权限检查逻辑 ==================
  async checkAdminPrivilege() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      
      // 【关键】存下来，给所有查询用
      this.setData({ myOpenid: myOpenid });
      console.log('✅ [checkAdminPrivilege] 已获取 openid:', myOpenid);

      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      
      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }
      
      if (adminCheck.data.length > 0) {
        this.setData({ 
          isAuthorized: true, 
          isAdmin: true 
        });
        // 权限确认后，如果是管理员，加载审核列表
        this.loadAuditList();
      }
      
      // 不管是不是管理员，都要加载我的设备
      // 放在这里调用，确保 myOpenid 已经拿到了
      this.loadMyDevices();
      
      return Promise.resolve(); // 🔴 返回 Promise，让调用者知道已完成

    } catch (err) {
      console.error('[my.js] 权限检查失败', err);
      return Promise.reject(err); // 🔴 返回 rejected Promise
    }
  },

  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this.showAutoToast('提示', '无权限');
      return;
    }
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    this.showAutoToast('提示', nextState ? '管理模式开启' : '已回到用户模式');
    
    // 🔴 修复：切换模式后重新加载订单，确保订单正确显示
    // 特别是从管理员模式切换到用户模式时，需要重新加载所有订单到 orders 数组
    this.loadMyOrdersPromise().catch(err => {
      console.error('[toggleAdminMode] 重新加载订单失败:', err);
    });
    
    // 🔴 修复：切换模式后重新加载活动记录，确保用户模式下的维修单正确显示
    this.loadMyActivitiesPromise().catch(err => {
      console.error('[toggleAdminMode] 重新加载活动记录失败:', err);
    });
  },

  // ================== 管理员物料发出功能 ==================
  // 1. 修复：物料发出逻辑改用云函数 (之前是前端直连，没权限改别人的)
  adminShipOrder(e) {
    const orderDocId = e.currentTarget.dataset.id; // 数据库 _id
    const orderNumber = e.currentTarget.dataset.orderid || '';
    const expressRaw = e.currentTarget.dataset.express || '';
    const expressCompany = expressRaw ? expressRaw.toUpperCase() : '';
    
    this.showInputDialog({
      title: '录入物料运单号',
      placeholder: '请输入顺丰/圆通运单号',
      success: (res) => {
        if (res.confirm && res.content) {
          const sn = res.content.trim();
          if (!sn) {
            this.showAutoToast('提示', '请输入运单号');
            return;
          }
          this.showMyLoading('正在提交...');

          // 【核心修改】调用云函数去修改，而不是直接 db.update
          wx.cloud.callFunction({
            name: 'adminUpdateOrder',
            data: {
              id: orderDocId,
              orderId: orderNumber,
              action: 'ship',
              trackingId: sn,
              expressCompany: expressCompany
            },
            success: r => {
              this.hideMyLoading();
              
              // ✅ [替换]
              this.showAutoToast('物料发出成功', '物料运单号已录入，用户端已同步。');
              this.loadMyOrders(); // 刷新订单列表
            },
            fail: err => {
              this.hideMyLoading();
              this.showAutoToast('失败', err.toString());
            }
          })
        }
      }
    });
  },


  // --- 2. 从云数据库拉取订单 ---
  // 🔴 将 loadMyOrders 改为返回 Promise 的版本
  loadMyOrdersPromise() {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/my/my.js:loadMyOrdersPromise',
        message: 'loadMyOrdersPromise called',
        data: { 
          isAdmin: this.data.isAdmin,
          myOpenid: this.data.myOpenid ? this.data.myOpenid.substring(0, 10) + '...' : 'none'
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'scroll-performance',
        hypothesisId: 'load-data-freq'
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

    return new Promise(async (resolve, reject) => {
      // 🔴 如果是普通用户且还没有 myOpenid，先获取 openid
      if (!this.data.isAdmin && !this.data.myOpenid) {
        try {
          const res = await wx.cloud.callFunction({ name: 'login' });
          const myOpenid = res.result.openid;
          this.setData({ myOpenid: myOpenid });
          console.log('[loadMyOrdersPromise] 已获取 openid:', myOpenid);
        } catch (err) {
          console.error('[loadMyOrdersPromise] 获取 openid 失败:', err);
          resolve({ data: [] }); // 获取失败，返回空数组
          return;
        }
      }

      const getAction = this.data.isAdmin 
        ? wx.cloud.callFunction({ name: 'adminGetOrders' }) 
        : // 🔴 普通用户：确保只查询当前用户的订单（系统会自动注入 _openid，但为了保险，我们确保 myOpenid 已获取）
          (this.data.myOpenid 
            ? wx.cloud.database().collection('shop_orders')
                .where({ _openid: this.data.myOpenid }) // 🔴 明确指定当前用户的 openid
                .orderBy('createTime', 'desc')
                .get()
                .then(res => {
                  // 🔴 调试日志：记录查询详情
                  console.log('[loadMyOrdersPromise] 数据库查询结果:', {
                    myOpenid: this.data.myOpenid ? this.data.myOpenid.substring(0, 10) + '...' : '未获取',
                    queryCount: res.data ? res.data.length : 0,
                    orderIds: res.data ? res.data.map(o => o.orderId) : []
                  });
                  return res;
                })
            : (() => {
                // 🔴 如果还没获取到 openid，记录警告并返回空数组
                console.warn('[loadMyOrdersPromise] ⚠️ 普通用户模式但 myOpenid 未获取，无法查询订单');
                return Promise.resolve({ data: [] });
              })()); // 如果还没获取到 openid，返回空数组

      const promise = this.data.isAdmin ? getAction.then(res => res.result) : getAction;

      promise.then(res => {
        // 🔴 loading 统一在 onShow 中管理，这里不隐藏
      
        // 数据清洗 (保持之前的逻辑不变)
        // 注意：管理员模式下 res.data 是数组，普通用户模式下 res.data 也是数组
        const orderData = Array.isArray(res.data) ? res.data : (res.data || []);
        
        // 🔴 调试日志：记录查询结果
        console.log('[loadMyOrdersPromise] 查询结果:', {
          isAdmin: this.data.isAdmin,
          myOpenid: this.data.myOpenid ? this.data.myOpenid.substring(0, 10) + '...' : '未获取',
          orderCount: orderData.length,
          rawData: orderData
        });
        
        const formatted = orderData.map(item => {
          const userName = item.address ? item.address.name : '匿名';
          const userNickname = item.userNickname || ''; // 🔴 获取用户昵称
          return {
            id: item._id,
            orderId: item.orderId,
            transactionId: item.transactionId || '', // 🔴 【必须加上】确认收货组件必填字段
            realStatus: item.status, 
            statusText: this.getStatusText(item.status),
            amount: item.totalFee,
            userName: userName,
            userNickname: userNickname, // 🔴 保存用户昵称
            userNameFontSize: this.calculateNameFontSize(userName, 30), // 🔴 订单卡片昵称默认30rpx
            userPhone: item.address ? item.address.phone : '',
            userAddr: item.address ? item.address.address : '',
            goodsList: item.goodsList || [],
            createTime: this.formatTime(item.createTime),
            trackingId: item.trackingId || "",
            shippingMethod: item.shipping && item.shipping.method ? item.shipping.method : ''
          };
        });

        // === 【核心修改：管理员数据分流】 ===
        if (this.data.isAdmin) {
          // [修复] 管理员：同时加载维修工单（兼容云函数未返回 repairs 的情况）
          if (res && Array.isArray(res.repairs)) {
            // 🔴 只显示 PENDING 的维修单，排除已标记需要寄回、已标记需要购买配件的
            const pendingRepairs = res.repairs.filter(i =>
              i.status === 'PENDING' && !i.needReturn && i.needPurchaseParts !== true
            );
            this.setData({ repairList: pendingRepairs });
          } else {
            // 云函数没返回 repairs，就直接从数据库拉取（只拉取PENDING）
            this.loadPendingRepairs();
          }
          
          // 1. 待物料发出列表 (只保留 PAID，发货后自动消失)
          // 🔴 过滤掉维修支付的订单（这些订单应该在"需寄回订单确认"中处理）
          const pending = formatted.filter(i => {
            if (i.realStatus !== 'PAID') return false;
            // 检查是否为维修支付订单（通过 goodsList 中的 spec 字段判断）
            const isRepairOrder = i.goodsList && i.goodsList.some(g => g.spec === '维修项目');
            return !isRepairOrder; // 排除维修订单
          });

          this.setData({ 
            pendingList: pending,
            orders: [] // 管理员不使用这个混杂的数组了
          }, () => {
            // 【修改】数据存完了，界面画完了，再算高度
            this.calcSwiperHeight(0);
            
            // 🔴 【新增】电商模式：管理员模式下，如果有待跳转的订单号，自动跳转到对应订单
            if (this.pendingOrderId) {
              const targetIndex = pending.findIndex(item => item.orderId === this.pendingOrderId);
              if (targetIndex !== -1) {
                console.log('[my] 管理员模式：找到订单，跳转到索引:', targetIndex);
                this.setData({ currentOrderIndex: targetIndex });
                this.pendingOrderId = null; // 清除待跳转标记
              } else {
                console.warn('[my] 管理员模式：未找到订单号:', this.pendingOrderId);
                this.pendingOrderId = null;
              }
            }
            
            resolve(); // 🔴 Promise 完成
          });
          
          console.log('待物料发出:', pending.length);
        } else {
          // 普通用户看所有
          console.log('[loadMyOrdersPromise] 普通用户模式，设置订单数量:', formatted.length);
          this.setData({ orders: formatted }, () => {
             // 【修改】
             this.calcSwiperHeight(0);
             
             // 🔴 【新增】电商模式：如果有待跳转的订单号，自动跳转到对应订单
             if (this.pendingOrderId) {
               const targetIndex = formatted.findIndex(item => item.orderId === this.pendingOrderId);
               if (targetIndex !== -1) {
                 console.log('[my] 找到订单，跳转到索引:', targetIndex);
                 this.setData({ currentOrderIndex: targetIndex });
                 this.pendingOrderId = null; // 清除待跳转标记
               } else {
                 console.warn('[my] 未找到订单号:', this.pendingOrderId);
                 this.pendingOrderId = null;
               }
             }
             
             resolve(); // 🔴 Promise 完成
          });
        }
      }).catch(err => {
        console.error('[loadMyOrdersPromise] 查询订单失败:', err);
        reject(err); // 🔴 Promise 失败
      });
    });
  },

  // 🔴 保留原方法以兼容其他地方的调用
  loadMyOrders() {
    this.loadMyOrdersPromise().catch(() => {});
  },

  // [新增] 管理员：加载待处理维修工单（只显示未处理的，点击任意按钮后卡片消失）
  loadPendingRepairs() {
    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('shouhou_repair')
      .where({ 
        status: 'PENDING',
        needReturn: _.neq(true),       // 排除已标记为需要寄回的
        // 🔴 修复：排除已标记为需要购买配件的（无论purchasePartsStatus是什么，只要needPurchaseParts为true就排除）
        // 使用 _.or([_.neq(true), _.exists(false)]) 来排除 true 和不存在的情况
        // 但微信小程序数据库不支持 _.exists，所以直接使用 _.neq(true) 即可
        // 注意：如果字段不存在，_.neq(true) 会匹配，所以需要确保字段存在时才排除
        // 实际上，当管理员设置 needPurchaseParts: true 后，这个字段一定存在，所以 _.neq(true) 应该能正确排除
        needPurchaseParts: _.neq(true) // 排除已标记为需要购买配件的
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        // 🔴 二次过滤：确保排除所有 needPurchaseParts 为 true 的记录（防止数据库查询条件不生效）
        const filtered = (res.data || []).filter(item => {
          // 如果 needPurchaseParts 为 true，排除
          if (item.needPurchaseParts === true) {
            return false;
          }
          // 如果 purchasePartsStatus 为 'completed'，也排除（配件已购买完成）
          if (item.purchasePartsStatus === 'completed') {
            return false;
          }
          return true;
        });
        console.log('[loadPendingRepairs] 查询结果:', res.data?.length, '条，过滤后:', filtered.length, '条');
        this.setData({ repairList: filtered });
      })
      .catch(err => {
        console.error('❌ [loadPendingRepairs] 加载维修工单失败:', err);
      });
  },

  // 状态映射辅助
  mapStatus(status) {
    if (status === 'UNPAID') return 0; // 待支付
    if (status === 'PAID') return 0;   // 已支付(待物料发出)
    if (status === 'SHIPPED') return 1; // 已物料发出
    return 2; // 已签收
  },

  // 辅助：状态转中文 (确保这里的对应关系正确)
  getStatusText(status) {
    if (status === 'UNPAID') return '待付款';
    if (status === 'PAID') return '产品待发出';   // 只有这个状态才显示"录入运单号"
    if (status === 'SHIPPED') return '运输中';
    if (status === 'SIGNED') return '已确认收货';
    return '状态未知'; // 调试用
  },

  // --- 3. 辅助：时间格式化函数 ---
  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  },


  // 2. [真实] 重新发起支付
  repayOrder(e) {
    const item = e.currentTarget.dataset.item;
    
    if (!item || !item.id) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }

    // 从订单中获取支付所需信息
    const goods = item.goodsList || [];
    const addressData = {
      name: item.userName || '',
      phone: item.userPhone || '',
      address: item.userAddr || ''
    };
    let totalPrice = item.amount || 0;
    const shippingFee = 0; // 从订单中获取，如果有的话
    const shippingMethod = 'zto'; // 默认中通

    // 管理员身份（授权或已点EDIT）：支付 0.01 元
    if (this.data.isAdmin || this.data.isAuthorized) {
      totalPrice = 0.01;
    }

    if (totalPrice <= 0) {
      this.showAutoToast('提示', '订单金额异常');
      return;
    }

    console.log('[repayOrder] 准备重新支付，订单信息:', {
      orderId: item.orderId,
      totalPrice,
      goodsCount: goods.length
    });

    this.showMyLoading('唤起收银台...');

    // 调用云函数获取支付参数（使用原订单信息）
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: totalPrice,
        goods: goods,
        addressData: addressData,
        shippingFee: shippingFee,
        shippingMethod: shippingMethod
      },
      success: res => {
        console.log('[repayOrder] 云函数调用成功，返回结果:', res);
        this.hideMyLoading();
        const payment = res.result;
        console.log('[repayOrder] 支付参数:', payment);

        // 检查云函数返回的错误
        if (payment && payment.error) {
          console.error('[repayOrder] 云函数返回错误:', payment);
          this.showMyDialog({ 
            title: '支付失败', 
            content: payment.msg || '支付系统异常，请稍后再试', 
            showCancel: false 
          });
          return;
        }

        if (!payment || !payment.paySign) {
          console.error('[repayOrder] 支付参数缺失:', payment);
          this.showAutoToast('提示', '支付系统对接中，请稍后再试');
          return;
        }

        console.log('[repayOrder] 准备调用 wx.requestPayment');
        // 唤起微信原生支付界面
        wx.requestPayment({
          ...payment,
          success: (payRes) => {
            console.log('[repayOrder] 支付成功:', payRes);
            this.showAutoToast('成功', '支付成功');
            const orderId = payment.outTradeNo;
            if (orderId) {
              this.callCheckPayResult(orderId);
            }
            
            // 刷新订单列表
            setTimeout(() => {
              this.loadMyOrders();
            }, 1000);
          },
          fail: (err) => {
            console.error('[repayOrder] 支付失败:', err);
            // 根据错误类型显示不同的提示
            let errorMsg = '支付已取消';
            if (err.errMsg) {
              if (err.errMsg.indexOf('cancel') > -1 || err.errMsg.indexOf('取消') > -1) {
                errorMsg = '支付已取消';
              } else if (err.errMsg.indexOf('fail') > -1 || err.errMsg.indexOf('失败') > -1) {
                errorMsg = '支付失败，请重试';
              } else {
                errorMsg = err.errMsg;
              }
            }
            this.showAutoToast('支付提示', errorMsg);
          }
        });
      },
      fail: err => {
        console.error('[repayOrder] 云函数调用失败:', err);
        this.hideMyLoading();
        this.showAutoToast('创建订单失败', err.errMsg || '网络错误，请重试');
      }
    });
  },

  callCheckPayResult(orderId, attempt = 1) {
    if (!orderId) return;
    const maxAttempts = 3;
    this.showMyLoading(attempt === 1 ? '确认订单中...' : '再次确认...');

    wx.cloud.callFunction({
      name: 'checkPayResult',
      data: { orderId },
      success: (res) => {
        const result = res.result || {};
        console.log('[my] checkPayResult 返回:', result);
        if (result.success) {
          this.showAutoToast('成功', '订单已确认');
        } else if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          this.showAutoToast('提示', result.msg || '支付状态待确认，请稍候刷新订单');
        }
      },
      fail: (err) => {
        console.error('[my] checkPayResult 调用失败:', err);
        if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          this.showAutoToast('提示', '网络异常，请稍后再试');
        }
      },
      complete: () => {
        this.hideMyLoading();
      }
    });
  },

  // 3. 【核心修复】查看教程并唤起官方收货组件（dest=shouhou 时跳售后页并自动解锁，否则跳安装教程页）
  viewTutorialAndSign(e) {
    const id = e.currentTarget.dataset.id
    const modelName = (e.currentTarget.dataset.model || '').trim()
    const dest = e.currentTarget.dataset.dest || '' // 'shouhou' 表示跳售后页对应维修教程并自动输入 123456 解锁
    
    console.log('[viewTutorialAndSign] 开始执行，订单ID:', id, 'dest:', dest)
    
    // 1. 查找订单
    const order = this.data.orders.find(item => item.id === id)
    if (!order) {
      console.error('[viewTutorialAndSign] 订单不存在')
      this.showAutoToast('提示', '订单数据异常');
      return;
    }

    console.log('[viewTutorialAndSign] 订单信息:', order)

    // 2. 如果已经是"已签收"或"已完成"，直接看教程，不弹窗
    if (order.realStatus === 'SIGNED' || order.realStatus === 'COMPLETED') {
      console.log('[viewTutorialAndSign] 订单已签收，直接跳转教程')
      wx.navigateTo({
        url: '/pages/azjc/azjc' + (modelName ? '?model=' + encodeURIComponent(modelName) : '')
      })
      return
    }

    // 3. 校验必要参数
    if (!order.transactionId) {
      console.error('[viewTutorialAndSign] 缺少 transactionId:', order)
      this.showAutoToast('提示', '缺少支付单号，无法确认');
      return
    }

    console.log('[viewTutorialAndSign] 准备唤起确认收货组件，参数:', {
      orderId: order.orderId,
      transactionId: order.transactionId
    })

    // 4. 唤起微信官方确认收货组件 (半屏弹窗)
    wx.openBusinessView({
      businessType: 'weappOrderConfirm', // 🔴 必须是这个
      extraData: {
        merchant_trade_no: order.orderId,
        transaction_id: order.transactionId // 🔴 必填
      },
      success: (res) => {
        console.log('[viewTutorialAndSign] ✅ 组件返回:', res)
        
        // extraData.status === 'success' 代表用户点击了确认收货
        if (res.extraData && res.extraData.status === 'success') {
          console.log('[viewTutorialAndSign] ✅ 用户已确认收货')
          // 执行后续逻辑：改数据库状态 -> 跳转（dest=shouhou 跳售后页并自动解锁）
          this.confirmReceiptAndViewTutorial(id, modelName, dest)
        } else {
          console.log('[viewTutorialAndSign] 用户取消或关闭')
          // 🔴 修复：用户点击关闭按钮时，显示自定义弹窗提示
          this.showMyDialog({
            title: '提示',
            content: '需要确认收货后才能查看教程',
            showCancel: false,
            confirmText: '知道了',
            success: () => {
              // 用户点击确定后，不做任何操作
            }
          });
        }
      },
      fail: (err) => {
        console.error('[viewTutorialAndSign] ❌ 组件唤起失败:', err)
        console.error('[viewTutorialAndSign] 错误详情:', JSON.stringify(err))
        // 🔴 修复：组件唤起失败时，也显示自定义弹窗提示
        this.showMyDialog({
          title: '提示',
          content: '无法唤起确认收货组件，请检查订单是否已发货',
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            // 用户点击确定后，不做任何操作
          }
        });
      }
    })
  },

  // 🔴 新增：确认收货并查看教程的统一处理函数
  // 确认收货并跳转的实际执行逻辑（dest=shouhou 时跳售后页并传 autoUnlock=1）
  confirmReceiptAndViewTutorial(id, modelName, dest) {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/my/my.js:confirmReceiptAndViewTutorial',
        message: 'confirmReceiptAndViewTutorial called',
        data: { 
          id,
          modelName,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'confirm-receipt-issue',
        hypothesisId: 'timing-issue'
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

    this.showMyLoading('解锁教程中...')
    
    console.log('[confirmReceiptAndViewTutorial] 开始调用云函数，订单ID:', id)
    
    // 1. 调用云函数，更新订单状态为"已签收/已完成"
    wx.cloud.callFunction({
      name: 'adminUpdateOrder',
      data: {
        id: id,
        action: 'sign' // 你的云函数里要有处理 'sign' 的逻辑
      },
      success: (r) => {
        // #region agent log
        try {
          const logData = {
            location: 'miniprogram/pages/my/my.js:confirmReceiptAndViewTutorial:success',
            message: '云函数调用成功',
            data: { 
              id,
              result: r.result,
              success: r.result?.success,
              timestamp: Date.now()
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'confirm-receipt-issue',
            hypothesisId: 'cloud-function-success'
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
        
        console.log('[confirmReceiptAndViewTutorial] 云函数返回:', r)
        
        // 只要云函数不报错，就认为成功
        if (r.result && r.result.success !== false) {
          
          // 2. 更新本地列表状态 (避免返回后按钮状态没变)
          const newOrders = this.data.orders.map(item => {
             if(item.id === id) {
                item.realStatus = 'SIGNED'; 
                item.statusText = '已确认收货';
             }
             return item;
          });
          this.setData({ orders: newOrders });

          // 🔴 关键修复：等待数据库更新完成后再跳转，避免时序问题
          // 等待 800ms 确保数据库更新完成
          setTimeout(() => {
            this.hideMyLoading();
            
            // #region agent log
            try {
              const logData = {
                location: 'miniprogram/pages/my/my.js:confirmReceiptAndViewTutorial:navigate',
                message: '准备跳转到教程页面',
                data: { 
                  id,
                  modelName,
                  waitTime: 800,
                  timestamp: Date.now()
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'confirm-receipt-issue',
                hypothesisId: 'navigation-timing'
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

            // 3. 跳转到教程页面：dest=shouhou 跳售后页并自动输入 123456 解锁，否则跳安装教程页
            const isShouhou = dest === 'shouhou';
            const tutorialUrl = isShouhou
              ? '/pages/shouhou/shouhou' + (modelName ? '?model=' + encodeURIComponent(modelName) + '&autoUnlock=1' : '')
              : '/pages/azjc/azjc' + (modelName ? '?model=' + encodeURIComponent(modelName) : '') + '&justConfirmed=1';
            wx.navigateTo({
              url: tutorialUrl,
              success: () => {
                this.showAutoToast('成功', isShouhou ? '售后教程已解锁' : '教程已解锁');
              },
              fail: (err) => {
                console.error('[confirmReceiptAndViewTutorial] 跳转失败:', err);
                this.showAutoToast('提示', '跳转失败，请重试');
              }
            });
          }, 800); // 等待 800ms
          
        } else {
          this.hideMyLoading();
          console.error('[confirmReceiptAndViewTutorial] 云函数返回失败:', r)
          this.showAutoToast('操作失败', r.result.errMsg || '同步状态失败');
        }
      },
      fail: (err) => {
        this.hideMyLoading()
        // #region agent log
        try {
          const logData = {
            location: 'miniprogram/pages/my/my.js:confirmReceiptAndViewTutorial:fail',
            message: '云函数调用失败',
            data: { 
              id,
              error: err.errMsg || err,
              timestamp: Date.now()
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'confirm-receipt-issue',
            hypothesisId: 'cloud-function-fail'
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

        console.error('[confirmReceiptAndViewTutorial] 云函数调用失败:', err)
        // 即使同步失败，如果用户已经在微信组件里确认了，也可以考虑让他跳转
        // 这里偏向严格，失败就不跳
        this.showAutoToast('网络异常', err.errMsg || '请稍后重试');
      }
    })
  },

  // 4. 仅查看教程（已签收状态）
  viewTutorialOnly(e) {
    const modelName = e.currentTarget.dataset.model || ''; // 产品型号（可选）
    
    // 显示提示后跳转
    this.showAutoToast('提示', '即将跳转到安装教程页面');
    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      const modelName = e.currentTarget.dataset.model || '';
      wx.navigateTo({
        url: '/pages/azjc/azjc' + (modelName ? '?model=' + encodeURIComponent(modelName) : '')
      });
    }, 3000);
  },

  // 🔴 生成安装教程分享码
  async generateShareCode(e) {
    const orderId = e.currentTarget.dataset.orderid
    const orderDbId = e.currentTarget.dataset.id

    if (!orderId) {
      this.showAutoToast('提示', '订单信息异常')
      return
    }

    this.showMyLoading('生成分享码中...')

    try {
      // 🔴 获取用户昵称
      let creatorNickname = '';
      try {
        const userInfo = wx.getStorageSync('userInfo');
        creatorNickname = userInfo?.nickName || '';
        
        // 如果缓存中没有，尝试获取
        if (!creatorNickname) {
          const userProfile = await wx.getUserProfile({
            desc: '用于生成分享码'
          }).catch(() => null);
          if (userProfile && userProfile.userInfo) {
            creatorNickname = userProfile.userInfo.nickName || '';
            wx.setStorageSync('userInfo', userProfile.userInfo);
          }
        }
      } catch (e) {
        console.log('[generateShareCode] 获取用户昵称失败:', e);
      }

      const res = await wx.cloud.callFunction({
        name: 'generateShareCode',
        data: {
          orderId: orderId,
          creatorNickname: creatorNickname // 🔴 传递分享用户昵称
        }
      })

      this.hideMyLoading()

      if (res.result.success) {
        const shareCode = res.result.code
        const expiresAt = res.result.expiresAt

        // 🔴 显示自定义分享码生成弹窗（白底黑字，清晰排版）
        this.setData({
          showShareCodeGenerateModal: true,
          shareCodeValue: shareCode
        })
        this.updateModalState();
      } else {
        // 如果用户已生成过，显示已存在的分享码（使用自定义弹窗）
        if (res.result.existingCode) {
          const existingCode = res.result.existingCode
          this.setData({
            showShareCodeGenerateModal: true,
            shareCodeValue: existingCode
          })
          this.updateModalState();
        } else {
          this.showAutoToast('失败', res.result.errMsg || '生成分享码失败')
        }
      }
    } catch (err) {
      this.hideMyLoading()
      console.error('[generateShareCode] 错误:', err)
      this.showAutoToast('错误', err.errMsg || '生成分享码失败，请重试')
    }
  },

  // [修改] 调试状态切换
  debugSetStatus(e) {
    const status = parseInt(e.currentTarget.dataset.status);
    let orders = this.data.orders ? [...this.data.orders] : [];
    
    if (!orders.length) return;

    let current = orders[this.data.currentOrderIndex];
    current.status = status;

    // 模拟填充数据
    if (status === 1) { // 状态变成"运输中"
      // ⚠️ 这里填一个真实的顺丰/圆通单号，方便你测试跳转效果
      // 比如下面这个是顺丰的旧单号示例
      current.trackingId = "SF144290031";
      current.lastLogistics = "正在跳转第三方查询...";
    } else if (status === 2) {
      current.trackingId = "YT99820102";
      current.signTime = "2025-12-20";
    } else {
      current.trackingId = "";
      current.lastLogistics = "";
    }

    this.setData({ orders });
  },

  // --- 轮播图切换 ---
  onOrderChange(e) {
    this.setData({ currentOrderIndex: e.detail.current });
    // 必须调用
    this.calcSwiperHeight(e.detail.current);
  },
  
  // 【核心函数】测量高度 (防报错增强版)
  calcSwiperHeight(index) {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/my/my.js:calcSwiperHeight',
        message: 'calcSwiperHeight called',
        data: { 
          index,
          isAdmin: this.data.isAdmin,
          pendingListLength: this.data.pendingList?.length || 0,
          ordersLength: this.data.orders?.length || 0,
          showShippedMode: this.data.showShippedMode
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'scroll-performance',
        hypothesisId: 'calc-height-freq'
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

    // 1. 先判断当前应该查哪个列表
    // 如果是管理员，查待物料发出(pendingList)；如果是用户，查全部(orders)
    const currentList = this.data.isAdmin ? this.data.pendingList : this.data.orders;

    // 2. 如果列表是空的，或者是管理员且切到了历史视图，就不需要计算高度
    if (!currentList || currentList.length === 0 || (this.data.isAdmin && this.data.showShippedMode)) {
      console.log('无需计算高度 (列表为空或在历史视图)');
      // 给个默认高度，防止塌陷
      this.setData({ swiperHeight: 600 });
      return;
    }

    // 🔴 防抖：如果已经有定时器在运行，取消它
    if (this._calcHeightTimer) {
      clearTimeout(this._calcHeightTimer);
    }

    // 3. 延迟执行，确保界面渲染完毕
    this._calcHeightTimer = setTimeout(() => {
      const query = wx.createSelectorQuery().in(this);
      const id = '#card-' + index;
      
      query.select(id).boundingClientRect(rect => {
        if (rect) {
          // 成功找到，设置高度
          this.setData({ 
            swiperHeight: rect.height + 60 
          });
        } else {
          // 没找到（可能是滑太快了，或者索引越界）
          // 尝试重置为第0个的高度，或者保持原状
          console.warn(`未找到元素 ${id}，尝试重新测量第0个...`);
          if (index !== 0) this.calcSwiperHeight(0);
        }
        this._calcHeightTimer = null;
      }).exec();
    }, 200); // 延迟加大到 200ms，更稳
  },
  
  // 🔴 下拉刷新处理
  onPullDownRefresh() {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/my/my.js:onPullDownRefresh',
        message: 'onPullDownRefresh called',
        data: { 
          isAdmin: this.data.isAdmin,
          isLoading: this._isLoading
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'scroll-performance',
        hypothesisId: 'pull-refresh'
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

    // 如果正在加载，不重复加载
    if (this._isLoading) {
      wx.stopPullDownRefresh();
      return;
    }

    this._isLoading = true;
    this.showMyLoading('刷新中...');
    
    Promise.all([
      this.loadMyOrdersPromise(),
      this.loadMyActivitiesPromise()
    ]).then(() => {
      this.hideMyLoading();
      this._isLoading = false;
      wx.stopPullDownRefresh();
    }).catch((err) => {
      console.error('[onPullDownRefresh] 刷新失败:', err);
      this.hideMyLoading();
      this._isLoading = false;
      wx.stopPullDownRefresh();
    });
  },
  
  // 使用探数API查询物流（通过云函数）
  viewLogisticsDetail(e) {
    // #region agent log
    try {
      const logData = {
        location: 'miniprogram/pages/my/my.js:viewLogisticsDetail',
        message: 'viewLogisticsDetail called',
        data: { 
          dataset: e.currentTarget.dataset,
          logisticsData: this.data.logisticsData
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'fix-wxml-error',
        hypothesisId: 'wxml-syntax'
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

    const sn = String(e.currentTarget.dataset.sn || '').trim().toUpperCase();
    const expressCompany = String(e.currentTarget.dataset.company || '').trim();
    const phone = String(e.currentTarget.dataset.phone || '').trim();
    
    console.log('[物流查询] 开始查询运单号:', sn);
    
    if (!sn) {
      this.showMyDialog({
        title: '提示',
        content: '运单号为空，无法查询物流信息',
        showCancel: false,
        confirmText: '知道了',
        success: () => {}
      });
      return;
    }

    // 显示物流查询弹窗并开始加载
    this.setData({
      showLogisticsModal: true,
      currentTrackingId: sn,
      logisticsData: null,
      logisticsLoading: true,
      logisticsError: null
    });
    this.updateModalState();
    
    // 调用云函数查询物流
    wx.cloud.callFunction({
      name: 'queryLogistics',
      data: {
        trackingId: sn,
        expressCompany: expressCompany || '',
        receiverPhone: phone || ''
      },
      success: (res) => {
        console.log('[物流查询] 云函数返回:', res);
        
        if (res.result && res.result.success) {
          // 查询成功
          const logisticsData = res.result.data;
          
          // 🔴 格式化时间，拆分日期和时间，适配 WXML
          if (logisticsData && logisticsData.path_list) {
            logisticsData.path_list.forEach(item => {
              if (item.time && item.time.indexOf(' ') > -1) {
                const parts = item.time.split(' ');
                item._dateStr = parts[0]; // "2026-01-26"
                item.time = parts[1];     // "04:41:58"
          } else {
                // 如果格式不对，或者只有时间/日期，保持原样，_dateStr 为空
                // 这样 WXML 会走 wx:else 显示完整的 item.time
                item._dateStr = ''; 
              }
            });
          }

          this.setData({
            logisticsData: logisticsData,
            logisticsLoading: false,
            logisticsError: null
          });
        } else {
          // 查询失败
          const errorMsg = res.result?.errMsg || '查询失败，请稍后重试';
          this.setData({
            logisticsData: null,
            logisticsLoading: false,
            logisticsError: errorMsg
          });
        }
      },
      fail: (err) => {
        console.error('[物流查询] 云函数调用失败:', err);
        this.setData({
          logisticsData: null,
          logisticsLoading: false,
          logisticsError: err.errMsg || '网络错误，请稍后重试'
        });
      }
    });
  },

  // 关闭物流查询弹窗
  closeLogisticsModal() {
    this.setData({
      showLogisticsModal: false,
      currentTrackingId: '',
      logisticsData: null, // 关闭时清空数据
      logisticsError: null,
      logisticsLoading: false
    });
    this.updateModalState();
  },

  // 复制运单号
  copyTrackingId(e) {
    const sn = e.currentTarget.dataset.sn;
    if (sn) {
      wx.setClipboardData({
        data: sn,
        success: () => {
          // 自带提示，这里不需要额外的toast
        }
      });
    }
  },

  // 1. [新增] 用户取消订单
  userCancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showMyDialog({
      title: '取消订单',
      content: '确定要取消并删除该订单吗？',
      showCancel: true,
      confirmText: '确定取消',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('处理中...');
          
          // 调用云函数删除订单
          wx.cloud.callFunction({
            name: 'adminUpdateOrder',
            data: { id: id, action: 'delete' },
            success: () => {
              this.hideMyLoading();
              this.showMyDialog({ title: '已取消', content: '订单已删除' });
              this.loadMyOrders(); // 刷新列表，订单消失
            },
            fail: err => {
              this.hideMyLoading();
              console.error(err);
              this.showAutoToast('失败', err.errMsg || '操作失败');
            }
          });
        }
      }
    });
  },

  // 2. [新增] 管理员点击金额改价
  // [新增] 管理员处理维修单
  resolveRepair(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type; // 'ship' 或 'tutorial'
    
    if (type === 'ship') {
       // 录入单号逻辑（使用自定义输入弹窗）
       this.showInputDialog({
         title: '备件寄出',
         placeholder: '请输入物料运单号',
         success: (res) => {
           if (res.confirm && res.content) {
             const trackingId = res.content.trim();
             if (!trackingId) {
               this.showAutoToast('提示', '请输入运单号');
               return;
             }
             this.updateRepairStatus(id, 'SHIPPED', trackingId);
           }
         }
       });
    } else {
       // 无需录入（使用自定义弹窗）
       this.showMyDialog({
         title: '确认操作',
         content: '将通知用户"查看维修教程可修复"，确定吗？',
         showCancel: true,
         confirmText: '确定',
         cancelText: '取消',
         success: (res) => {
           if (res && res.confirm) {
             this.updateRepairStatus(id, 'TUTORIAL');
           }
         }
       });
    }
  },

  // 🔴 新增：打开购买配件弹窗（从数据库读取配件数据）
  openPurchasePartsModal(e) {
    const item = e.currentTarget.dataset.item;
    if (!item || !item.model) {
      this.showAutoToast('提示', '维修单信息异常');
      return;
    }
    
    this.showMyLoading('加载配件数据...');
    const db = wx.cloud.database();
    const model = item.model;
    
    // 🔴 与售后页一致：从 shouhou 集合读取配件，新加的配件也会出现在弹窗中
    db.collection('shouhou')
      .where({ modelName: model })
      .get()
      .then(res => {
        this.hideMyLoading();
        
        // 构建配件列表（按型号分类）
        const partsList = [];
        if (res.data && res.data.length > 0) {
          // 按 order 排序后映射为弹窗所需格式
          const sorted = (res.data || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
          const parts = sorted.map(p => ({ name: p.name, selected: false }));
          partsList.push({
            model: model,
            parts: parts
          });
        } else {
          // 如果数据库没有数据，使用默认数据（兼容性处理）
          const DB_PARTS = {
            'F1 PRO': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
            'F1 MAX': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
            'F2 PRO': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
            'F2 MAX': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
            'F2 PRO Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
            'F2 MAX Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"]
          };
          
          if (DB_PARTS[model]) {
            partsList.push({
              model: model,
              parts: DB_PARTS[model].map(part => ({ name: part, selected: false }))
            });
          }
        }
        
        // 清理partsList中每个group.model，去掉可能混入的「请购买配件」
        partsList.forEach(group => {
          if (group.model) {
            group.model = String(group.model).replace(/^请购买配件\s*/i, '').trim() || group.model;
          }
        });
        
        // 如果已有选中的配件，恢复选中状态
        const selectedParts = item.purchasePartsList || [];
        partsList.forEach(group => {
          group.parts.forEach(part => {
            if (selectedParts.some(sp => sp.model === group.model && sp.parts.includes(part.name))) {
              part.selected = true;
            }
          });
        });
        
        // 弹窗标题只显示型号，去掉可能混入的「请购买配件」
        let modelStr = (item.model && String(item.model).trim()) || (partsList[0] && partsList[0].model) || '';
        modelStr = modelStr.replace(/^请购买配件\s*/i, '').trim() || modelStr;
        this.setData({
          showPurchasePartsModal: true,
          purchasePartsModalModel: modelStr,
          currentRepairItem: item,
          purchasePartsList: partsList,
          selectedParts: selectedParts,
          purchasePartsNote: item.purchasePartsNote || ''
        });
        this.updateModalState(); // 🔴 更新弹窗状态，锁定页面滚动
      })
      .catch(err => {
        this.hideMyLoading();
        const msg = (err.errMsg || err.message || '') + '';
        if (msg.indexOf('access_token') !== -1) {
          console.warn('[my] 云会话未就绪，请稍后重试或检查云环境');
          this.showAutoToast('提示', '网络未就绪，请稍后重试');
          return;
        }
        console.error('加载配件数据失败:', err);
        this.showAutoToast('提示', '加载配件数据失败，请稍后重试');
      });
  },
  
  // 🔴 新增：切换配件选中状态
  togglePartSelection(e) {
    const { model, partName } = e.currentTarget.dataset;
    const { purchasePartsList } = this.data;
    
    const group = purchasePartsList.find(g => g.model === model);
    if (!group) return;
    
    const part = group.parts.find(p => p.name === partName);
    if (!part) return;
    
    part.selected = !part.selected;
    
    // 更新选中的配件列表
    const selectedParts = [];
    purchasePartsList.forEach(g => {
      const selected = g.parts.filter(p => p.selected).map(p => p.name);
      if (selected.length > 0) {
        selectedParts.push({ model: g.model, parts: selected });
      }
    });
    
    this.setData({
      purchasePartsList: purchasePartsList,
      selectedParts: selectedParts
    });
  },
  
  // 🔴 新增：输入购买配件备注
  onPurchasePartsNoteInput(e) {
    this.setData({
      purchasePartsNote: e.detail.value
    });
  },
  
  // 🔴 新增：提交购买配件信息
  submitPurchaseParts() {
    const { currentRepairItem, selectedParts, purchasePartsNote } = this.data;
    
    if (!currentRepairItem || !currentRepairItem._id) {
      this.showAutoToast('提示', '维修单信息异常');
      return;
    }
    
    if (selectedParts.length === 0) {
      this.showAutoToast('提示', '请至少选择一个配件');
      return;
    }
    
    this.showMyLoading('提交中...');
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(currentRepairItem._id).update({
      data: {
        needPurchaseParts: true,
        purchasePartsList: selectedParts,
        purchasePartsNote: purchasePartsNote.trim(),
        purchasePartsStatus: 'pending'
      }
    }).then(() => {
      this.hideMyLoading();
      this.setData({ showPurchasePartsModal: false });
      
      console.log('✅ [submitPurchaseParts] 数据库更新成功，开始刷新数据');
      
      // 🔴 立即刷新数据，不等待用户点击确认
      this.loadPendingRepairs(); // 刷新管理员待处理列表
      // 添加延迟确保数据库同步完成
      setTimeout(() => {
        console.log('🔄 [submitPurchaseParts] 开始刷新活动列表');
        this.loadMyActivitiesPromise()
          .then(() => {
            console.log('✅ [submitPurchaseParts] 活动列表刷新完成');
          })
          .catch((err) => {
            console.error('❌ [submitPurchaseParts] 活动列表刷新失败:', err);
          });
      }, 500); // 增加延迟到500ms，确保数据库同步
      
      this.showMyDialog({
        title: '操作成功',
        content: '已标记为待购配件\n用户端将显示购买提示',
        showCancel: false,
        confirmText: '好的'
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error('更新失败:', err);
      this.showMyDialog({
        title: '操作失败',
        content: err.errMsg || '请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },
  
  // 🔴 新增：关闭购买配件弹窗
  closePurchasePartsModal() {
    this.setData({
      showPurchasePartsModal: false,
      purchasePartsModalModel: '',
      currentRepairItem: null,
      purchasePartsList: [],
      selectedParts: [],
      purchasePartsNote: ''
    });
    this.updateModalState(); // 🔴 更新弹窗状态，解锁页面滚动
  },
  
  // 🔴 新增：确认付费维修
  confirmPaidRepair() {
    const { currentPaidRepairItem } = this.data;
    if (!currentPaidRepairItem || !currentPaidRepairItem._id) {
      this.showAutoToast('提示', '维修单信息异常');
      return;
    }
    
    this.showMyLoading('处理中...');
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(currentPaidRepairItem._id).update({
      data: {
        paidRepairAgreed: true,
        paidRepairAgreedTime: db.serverDate()
      }
    }).then(() => {
      this.hideMyLoading();
      this.setData({ 
        showPaidRepairConfirmModal: false,
        currentPaidRepairItem: null
      });
      this.updateModalState(); // 🔴 更新弹窗状态，解锁页面滚动
      this.showMyDialog({
        title: '已确认',
        content: '您已同意付费维修\n维修完成后需要支付维修费用30元+配件费用',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          this.loadMyActivitiesPromise().catch(() => {});
        }
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error('更新失败:', err);
      this.showMyDialog({
        title: '操作失败',
        content: err.errMsg || '请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },
  
  // 🔴 新增：拒绝付费维修
  rejectPaidRepair() {
    const { currentPaidRepairItem } = this.data;
    if (!currentPaidRepairItem || !currentPaidRepairItem._id) {
      this.showAutoToast('提示', '维修单信息异常');
      return;
    }
    
    this.showMyLoading('处理中...');
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(currentPaidRepairItem._id).update({
      data: {
        paidRepairAgreed: false,
        paidRepairAgreedTime: db.serverDate()
      }
    }).then(() => {
      this.hideMyLoading();
      this.setData({ 
        showPaidRepairConfirmModal: false,
        currentPaidRepairItem: null
      });
      this.updateModalState(); // 🔴 更新弹窗状态，解锁页面滚动
      this.showMyDialog({
        title: '已拒绝',
        content: '您已拒绝付费维修\n如需继续维修，请联系客服',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          this.loadMyActivitiesPromise().catch(() => {});
        }
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error('更新失败:', err);
      this.showMyDialog({
        title: '操作失败',
        content: err.errMsg || '请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },
  
  // 【新增】管理员点击"需要用户寄回"按钮，只填写备注
  requestUserReturn(e) {
    const id = e.currentTarget.dataset.id;
    
    // 🔴 查询维修单信息，检查是否质保过期
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(id).get().then(res => {
      const repair = res.data;
      const isWarrantyExpired = repair.warrantyExpired === true;
      
      // 弹出输入框，让管理员填写备注
      this.showInputDialog({
        title: '需要用户寄回',
        placeholder: '请输入备注信息（选填）',
        success: (res) => {
          if (res.confirm) {
            const returnNote = res.content ? res.content.trim() : '';
            this.showMyLoading('处理中...');
            
            // 🔴 如果质保过期，需要记录付费维修信息
            const updateData = {
              needReturn: true,
              returnNote: returnNote,
              returnStatus: 'PENDING_RETURN' // 待用户寄回
            };
            
            if (isWarrantyExpired) {
              updateData.repairFee = 30; // 维修费用30元
              updateData.partsFee = 0; // 配件费用（根据实际购买计算）
              updateData.paidRepairAgreed = null; // 用户是否同意（待用户确认）
            }
            
            db.collection('shouhou_repair').doc(id).update({
              data: updateData
            }).then(() => {
              this.hideMyLoading();
              this.showMyDialog({
                title: '操作成功',
                content: isWarrantyExpired ? 
                  '已标记为需要用户寄回\n用户质保已过期，将提示付费维修' : 
                  '已标记为需要用户寄回\n用户端将显示寄回提示',
                showCancel: false,
                confirmText: '好的',
                success: () => {
                  this.loadMyOrders(); // 刷新订单列表
                  this.loadPendingRepairs(); // 🔴 刷新待处理列表（卡片会消失）
                  this.loadReturnRequiredList(); // 刷新需寄回列表
                }
              });
            }).catch(err => {
              this.hideMyLoading();
              console.error('更新失败:', err);
              this.showMyDialog({
                title: '操作失败',
                content: err.errMsg || '请稍后重试',
                showCancel: false,
                confirmText: '知道了'
              });
            });
          }
        }
      });
    }).catch(err => {
      console.error('查询维修单失败:', err);
      this.showAutoToast('提示', '查询维修单信息失败');
    });
  },

  // 【新增】用户填写地址信息（在用户端的卡片中）
  onUserReturnAddressInput(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;
    this.setData({
      [`userReturnAddress.${key}`]: val
    });
  },

  // 【新增】用户提交地址信息
  submitUserReturnAddress() {
    const { userReturnAddress, myReturnRequiredRepair } = this.data;
    
    if (!myReturnRequiredRepair || !myReturnRequiredRepair._id) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }
    
    // 验证必填项
    if (!userReturnAddress.name || !userReturnAddress.name.trim()) {
      this.showAutoToast('提示', '请填写收件人姓名');
      return;
    }
    if (!userReturnAddress.phone || !userReturnAddress.phone.trim()) {
      this.showAutoToast('提示', '请填写收件人手机号');
      return;
    }
    // 手机号格式验证
    if (!/^1[3-9]\d{9}$/.test(userReturnAddress.phone)) {
      this.showAutoToast('提示', '请输入正确的11位手机号');
      return;
    }
    if (!userReturnAddress.address || !userReturnAddress.address.trim()) {
      this.showAutoToast('提示', '请填写详细地址');
      return;
    }
    
    // 地址格式验证
    const parsed = this.parseAddressForShipping(userReturnAddress.address);
    if (!parsed.province && !parsed.city) {
      this.showAutoToast('提示', '请填写省、市、区');
      return;
    }
    
    // 保存到数据库
    this.showMyLoading('提交中...');
    const db = wx.cloud.database();
    const fullAddress = parsed.fullAddress || userReturnAddress.address;
    
    db.collection('shouhou_repair').doc(myReturnRequiredRepair._id).update({
      data: {
        returnAddress: {
          name: userReturnAddress.name.trim(),
          phone: userReturnAddress.phone.trim(),
          address: fullAddress
        }
      }
    }).then(() => {
      this.hideMyLoading();
      this.showMyDialog({
        title: '提交成功',
        content: '地址信息已保存\n管理员修好后将按此地址寄回',
        showCancel: false,
        confirmText: '好的',
        success: () => {
          // 关闭弹窗并清理数据
          this.setData({
            showReturnAddressModal: false,
            userReturnAddress: { name: '', phone: '', address: '' },
            returnTrackingIdInput: ''
          });
          // 刷新数据（会更新弹窗内容，显示运单号输入框）
          this.loadMyActivitiesPromise().catch(() => {});
        }
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error('提交失败:', err);
      this.showAutoToast('提交失败', err.errMsg || '请稍后重试');
    });
  },

  // 【新增】切换需要寄回开关
  toggleReturnRequired(e) {
    const id = e.currentTarget.dataset.id;
    const checked = e.detail.value;
    
    // 静默更新，不显示任何提示
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(id).update({
      data: {
        needReturn: checked
      }
    }).then(() => {
      // 更新本地数据
      const repairList = this.data.repairList.map(item => {
        if (item._id === id) {
          return { ...item, needReturn: checked };
        }
        return item;
      });
      this.setData({ repairList });
      console.log('✅ [toggleReturnRequired] 开关已更新:', checked);
    }).catch(err => {
      console.error('❌ [toggleReturnRequired] 更新失败:', err);
      // 更新失败时也不显示弹窗，静默处理
      // 如果失败，恢复开关状态
      const repairList = this.data.repairList.map(item => {
        if (item._id === id) {
          return { ...item, needReturn: !checked };
        }
        return item;
      });
      this.setData({ repairList });
    });
  },

  // 【新增】一键复制地址（管理员地址）
  copyReturnAddress() {
    console.log('[copyReturnAddress] 点击复制地址');
    const address = `收件人: MT
手机号码: 13527692427
所在地区: 广东省佛山市南海区桂城街道
详细地址: 创智路2号保利心语花园三期（驿站）（到付直接拒收，无需派送）`;
    
    // 🔴 复制前立即隐藏可能的官方弹窗（使用原生API）
    const hideOfficialToast = () => {
      try {
        if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
        if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
      } catch (e) {}
    };
    hideOfficialToast();
    
    wx.setClipboardData({
      data: address,
      success: (res) => {
        console.log('[copyReturnAddress] 复制成功', res);
        // 🔴 立即疯狂隐藏官方弹窗（使用原生API，多次尝试）
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
        // 使用统一的"内容已复制"自定义弹窗（互斥）
        this._showCopySuccessOnce();
      },
      fail: (err) => {
        console.error('[copyReturnAddress] 复制失败', err);
        hideOfficialToast();
        this.showAutoToast('复制失败', '请手动复制地址');
      }
    });
  },

  // 【新增】一键复制用户地址（在需寄回订单确认弹窗中）
  copyUserAddress(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.returnRequiredList[index];
    
    if (!item) {
      this.showAutoToast('提示', '地址信息不存在');
      return;
    }
    
    // 🔴 优先使用 returnAddress，否则使用 contact
    let addressText = '';
    if (item.returnAddress) {
      addressText = `${item.returnAddress.name || ''} ${item.returnAddress.phone || ''} ${item.returnAddress.address || ''}`.trim();
    } else if (item.contact) {
      addressText = `${item.contact.name || ''} ${item.contact.phone || ''} ${item.contact.address || ''}`.trim();
    }
    
    if (!addressText) {
      this.showAutoToast('提示', '地址信息为空');
      return;
    }
    
    // 🔴 复制前立即隐藏可能的官方弹窗（使用原生API）
    const hideOfficialToast = () => {
      try {
        if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
        if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
      } catch (e) {}
    };
    hideOfficialToast();
    
    wx.setClipboardData({
      data: addressText,
      success: (res) => {
        console.log('[copyUserAddress] 复制成功', res);
        // 🔴 立即疯狂隐藏官方弹窗（使用原生API，多次尝试）
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
        // 使用统一的"内容已复制"自定义弹窗（互斥）
        this._showCopySuccessOnce();
      },
      fail: (err) => {
        console.error('[copyUserAddress] 复制失败', err);
        hideOfficialToast();
        this.showAutoToast('提示', '复制失败，请手动复制');
      }
    });
  },

  // 🔴 新增：复制订单地址（在订单卡片中）
  copyOrderAddress(e) {
    const address = e.currentTarget.dataset.address || '';
    const name = e.currentTarget.dataset.name || '匿名用户';
    const phone = e.currentTarget.dataset.phone || '';
    
    if (!address) {
      this.showAutoToast('提示', '地址信息不存在');
      return;
    }
    
    // 格式化地址文本：姓名 电话 地址
    const addressText = `${name} ${phone}\n${address}`;
    
    // 🔴 复制前立即隐藏可能的官方弹窗（使用原生API）
    const hideOfficialToast = () => {
      try {
        if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
        if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
      } catch (e) {}
    };
    hideOfficialToast();
    
    wx.setClipboardData({
      data: addressText,
      success: (res) => {
        console.log('[copyOrderAddress] 复制成功', res);
        // 🔴 立即疯狂隐藏官方弹窗（使用原生API，多次尝试）
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
        // 使用统一的"内容已复制"自定义弹窗（互斥）
        this._showCopySuccessOnce();
      },
      fail: (err) => {
        console.error('[copyOrderAddress] 复制失败', err);
        hideOfficialToast();
        this.showAutoToast('提示', '复制失败，请手动复制');
      }
    });
  },
  
  // 🔴 从分享码生成弹窗复制分享码
  copyShareCodeFromModal() {
    const shareCode = this.data.shareCodeValue
    if (!shareCode) {
      this.showAutoToast('提示', '分享码不存在')
      return
    }

    // 🔴 复制前先关闭微信官方弹窗 (使用原生API)
    const hideOfficialToast = () => {
      try {
        // 优先使用原生方法
        if (wx.__mt_oldHideToast) {
          wx.__mt_oldHideToast()
        } else {
          // 兜底（虽然 wx.hideToast 可能被拦截，但也没办法）
          // @ts-ignore
          wx.hideToast()
        }
        
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading()
        } else {
          // @ts-ignore
          wx.hideLoading()
        }
      } catch (e) {}
    }
    
    hideOfficialToast()
    setTimeout(hideOfficialToast, 5)
    setTimeout(hideOfficialToast, 10)
    setTimeout(hideOfficialToast, 15)
    
    wx.setClipboardData({
      data: shareCode,
      success: () => {
        // 🔴 复制后疯狂隐藏微信官方弹窗
        hideOfficialToast()
        setTimeout(hideOfficialToast, 5)
        setTimeout(hideOfficialToast, 10)
        setTimeout(hideOfficialToast, 15)
        setTimeout(hideOfficialToast, 20)
        setTimeout(hideOfficialToast, 30)
        setTimeout(hideOfficialToast, 40)
        setTimeout(hideOfficialToast, 50)
        setTimeout(hideOfficialToast, 60)
        setTimeout(hideOfficialToast, 80)
        setTimeout(hideOfficialToast, 100)
        setTimeout(hideOfficialToast, 120)
        setTimeout(hideOfficialToast, 150)
        setTimeout(hideOfficialToast, 180)
        setTimeout(hideOfficialToast, 200)
        setTimeout(hideOfficialToast, 250)
        setTimeout(hideOfficialToast, 300)
        setTimeout(hideOfficialToast, 350)
        setTimeout(hideOfficialToast, 400)
        setTimeout(hideOfficialToast, 450)
        setTimeout(hideOfficialToast, 500)
        setTimeout(hideOfficialToast, 600)

        // 🔴 关闭分享码生成弹窗，显示"内容已复制"弹窗（互斥）
        this.setData({ showShareCodeGenerateModal: false });
        this._showCopySuccessOnce(); // 🔴 内部已调用 _closeAllPopups() 和 updateModalState()
      },
      fail: (err) => {
        console.error('[copyShareCodeFromModal] 复制失败', err)
        hideOfficialToast() // 失败也要隐藏可能的loading
        this.showAutoToast('复制失败', '请手动复制分享码')
      }
    })
  },

  // 【新增】打开需寄回订单确认弹窗
  openReturnRequiredModal() {
    this.loadReturnRequiredList();
    this.setData({ 
      showReturnRequiredModal: true
    });
    this.updateModalState(); // 🔴 更新弹窗状态，锁定页面滚动
  },

  // 【新增】关闭需寄回订单确认弹窗
  closeReturnRequiredModal() {
    this.setData({ 
      showReturnRequiredModal: false
    });
    this.updateModalState(); // 🔴 更新弹窗状态，解锁页面滚动
  },

  // 【新增】加载需寄回订单列表（只显示维修单，不显示普通订单）
  loadReturnRequiredList() {
    this.showMyLoading('加载中...');
    const db = wx.cloud.database();
    // 查询需要寄回且未完成的维修单（只查 shouhou_repair，不查 shop_orders）
    // 排除条件：returnCompleted为true，或status为COMPLETED/RETURN_RECEIVED
    db.collection('shouhou_repair')
      .where({
        needReturn: true,
        returnCompleted: db.command.neq(true), // 未完成的
        status: db.command.nin(['COMPLETED', 'RETURN_RECEIVED']) // 排除已完成和售后完结的
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        // 🔴 获取所有维修单的 openid，批量查询 valid_users 获取昵称
        const openids = [...new Set((res.data || []).map(item => item._openid).filter(Boolean))];
        
        // 批量查询 valid_users 获取昵称
        const nicknamePromises = openids.map(openid => 
          db.collection('valid_users')
            .where({ _openid: openid })
            .limit(1)
            .get()
            .then(validRes => ({
              openid,
              nickname: validRes.data && validRes.data.length > 0 ? validRes.data[0].nickname : null
            }))
            .catch(() => ({ openid, nickname: null }))
        );
        
        Promise.all(nicknamePromises).then(nicknameMap => {
          // 构建 openid -> nickname 的映射
          const nicknameDict = {};
          nicknameMap.forEach(({ openid, nickname }) => {
            nicknameDict[openid] = nickname;
          });
          
          // 格式化数据，添加配件发出时间和用户昵称
        const filtered = (res.data || []).map(item => {
            // #region agent log
            console.log('[DEBUG] loadReturnRequiredList item from db', {
              itemId: item._id,
              warrantyExpired: item.warrantyExpired,
              warrantyExpiredType: typeof item.warrantyExpired,
              hasWarrantyExpired: 'warrantyExpired' in item
            });
            wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2557',message:'loadReturnRequiredList item from db',data:{itemId:item._id,warrantyExpired:item.warrantyExpired,warrantyExpiredType:typeof item.warrantyExpired,hasWarrantyExpired:'warrantyExpired' in item,itemKeys:Object.keys(item).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'},fail:()=>{}});
            // #endregion
          return {
            ...item,
              shipTime: item.solveTime ? this.formatTime(item.solveTime) : (item.createTime ? this.formatTime(item.createTime) : '未知'),
              userNickname: nicknameDict[item._openid] || null // 🔴 添加用户昵称
          };
        });
          
          this.hideMyLoading();
        this.setData({ returnRequiredList: filtered });
        console.log('✅ [loadReturnRequiredList] 加载需寄回维修单:', filtered.length, '条');
          
          // #region agent log
          console.log('[DEBUG] loadReturnRequiredList after setData', {
            filteredCount: filtered.length,
            firstItemWarrantyExpired: filtered[0]?.warrantyExpired,
            firstItemId: filtered[0]?._id
          });
          wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2563',message:'loadReturnRequiredList after setData',data:{filteredCount:filtered.length,firstItemWarrantyExpired:filtered[0]?.warrantyExpired,firstItemId:filtered[0]?._id},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'},fail:()=>{}});
          // #endregion
        }).catch(err => {
          this.hideMyLoading();
          console.error('[loadReturnRequiredList] 查询用户昵称失败:', err);
          // 即使查询昵称失败，也显示列表（不显示昵称）
          const filtered = (res.data || []).map(item => ({
            ...item,
            shipTime: item.solveTime ? this.formatTime(item.solveTime) : (item.createTime ? this.formatTime(item.createTime) : '未知'),
            userNickname: null
          }));
          this.setData({ returnRequiredList: filtered });
        });
      })
      .catch(err => {
        this.hideMyLoading();
        console.error('加载需寄回订单失败:', err);
        this.showAutoToast('加载失败', err.errMsg || '请稍后重试');
      });
  },

  // 🔴 新增：打开填写售后单弹窗
  openFillRepairModal(e) {
    const item = e.currentTarget.dataset.item;
    const index = e.currentTarget.dataset.index;
    
    // #region agent log
    console.log('[DEBUG] openFillRepairModal entry', {itemId: item?._id, itemWarrantyExpired: item?.warrantyExpired, itemWarrantyExpiredType: typeof item?.warrantyExpired, itemExpiryDate: item?.expiryDate, itemRemainingDays: item?.remainingDays});
    wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2581',message:'openFillRepairModal entry',data:{itemId:item?._id,itemWarrantyExpired:item?.warrantyExpired,itemWarrantyExpiredType:typeof item?.warrantyExpired,itemExpiryDate:item?.expiryDate,itemRemainingDays:item?.remainingDays,itemKeys:item?Object.keys(item).slice(0,15):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'},fail:()=>{}});
    // #endregion
    
    if (!item || !item._id) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }
    
    // 🔴 修复：如果 warrantyExpired 为 false 或 undefined，重新计算是否过保
    // 方案1：如果 expiryDate 存在，直接计算
    // 方案2：如果 expiryDate 为 null，但 remainingDays <= 0，判断为过保
    // 方案3：如果都没有，从设备表查询
    let actualWarrantyExpired = item.warrantyExpired;
    
    if (item.expiryDate) {
      // 方案1：根据 expiryDate 重新计算
      const now = new Date();
      const exp = new Date(item.expiryDate);
      const diff = Math.ceil((exp - now) / (86400000));
      actualWarrantyExpired = diff <= 0;
      
      // #region agent log
      console.log('[DEBUG] recalculated warrantyExpired from expiryDate', {
        original: item.warrantyExpired,
        expiryDate: item.expiryDate,
        diff: diff,
        recalculated: actualWarrantyExpired
      });
      wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2595',message:'recalculated warrantyExpired from expiryDate',data:{original:item.warrantyExpired,expiryDate:item.expiryDate,diff:diff,recalculated:actualWarrantyExpired},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'F'},fail:()=>{}});
      // #endregion
    } else if (item.remainingDays !== undefined && item.remainingDays !== null) {
      // 方案2：根据 remainingDays 判断
      actualWarrantyExpired = item.remainingDays <= 0;
      
      // #region agent log
      console.log('[DEBUG] recalculated warrantyExpired from remainingDays', {
        original: item.warrantyExpired,
        remainingDays: item.remainingDays,
        recalculated: actualWarrantyExpired
      });
      wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2605',message:'recalculated warrantyExpired from remainingDays',data:{original:item.warrantyExpired,remainingDays:item.remainingDays,recalculated:actualWarrantyExpired},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'G'},fail:()=>{}});
      // #endregion
    } else if (item._openid && item.model) {
      // 方案3：从设备表查询（异步，先使用默认值，查询后再更新）
      const db = wx.cloud.database();
      db.collection('sn')
        .where({
          _openid: item._openid,
          productModel: item.model,
          isActive: true
        })
        .get()
        .then(deviceRes => {
          if (deviceRes.data.length > 0) {
            const device = deviceRes.data[0];
            if (device.expiryDate) {
              const now = new Date();
              const exp = new Date(device.expiryDate);
              const diff = Math.ceil((exp - now) / (86400000));
              const deviceWarrantyExpired = diff <= 0;
              
              // #region agent log
              console.log('[DEBUG] queried warrantyExpired from device', {
                deviceExpiryDate: device.expiryDate,
                diff: diff,
                deviceWarrantyExpired: deviceWarrantyExpired
              });
              wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2620',message:'queried warrantyExpired from device',data:{deviceExpiryDate:device.expiryDate,diff:diff,deviceWarrantyExpired:deviceWarrantyExpired},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H'},fail:()=>{}});
              // #endregion
              
              // 更新 currentFillRepairItem
              if (this.data.currentFillRepairItem && this.data.currentFillRepairItem._id === item._id) {
                this.setData({
                  'currentFillRepairItem.warrantyExpired': deviceWarrantyExpired
                });
              }
            }
          }
        })
        .catch(err => {
          console.error('[openFillRepairModal] 查询设备质保信息失败:', err);
        });
    }
    
    // 使用重新计算的值更新 item
    const itemWithCorrectWarranty = {
      ...item,
      warrantyExpired: actualWarrantyExpired
    };
    
    // #region agent log
    console.log('[DEBUG] before setData warrantyExpired check', {
      warrantyExpired: itemWithCorrectWarranty.warrantyExpired,
      warrantyExpiredType: typeof itemWithCorrectWarranty.warrantyExpired,
      warrantyExpiredStrictTrue: itemWithCorrectWarranty.warrantyExpired === true,
      warrantyExpiredLooseTrue: itemWithCorrectWarranty.warrantyExpired == true,
      notWarrantyExpired: !itemWithCorrectWarranty.warrantyExpired
    });
    wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2608',message:'before setData warrantyExpired check',data:{warrantyExpired:itemWithCorrectWarranty.warrantyExpired,warrantyExpiredType:typeof itemWithCorrectWarranty.warrantyExpired,warrantyExpiredStrictTrue:itemWithCorrectWarranty.warrantyExpired===true,warrantyExpiredLooseTrue:itemWithCorrectWarranty.warrantyExpired==true,notWarrantyExpired:!itemWithCorrectWarranty.warrantyExpired},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'B'},fail:()=>{}});
    // #endregion
    
    // 初始化维修项目列表（如果已有数据则使用，否则创建空列表）
    const repairItems = itemWithCorrectWarranty.repairItems && itemWithCorrectWarranty.repairItems.length > 0 
      ? JSON.parse(JSON.stringify(itemWithCorrectWarranty.repairItems)) // 深拷贝
      : [{ name: '', price: 0 }];
    
    // 计算总价
    const totalPrice = repairItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0);
    }, 0);
    
    // 格式化总价（保留两位小数）
    const totalPriceFormatted = totalPrice.toFixed(2);
    
    // 🔴 修复：打开填写售后单弹窗时，先关闭需寄回订单确认弹窗，避免遮挡
    this.setData({
      showFillRepairModal: true,
      showReturnRequiredModal: false, // 关闭需寄回订单确认弹窗
      currentFillRepairItem: itemWithCorrectWarranty,
      fillRepairItems: repairItems,
      fillRepairTrackingId: itemWithCorrectWarranty.trackingId || '',
      fillRepairTotalPrice: totalPrice,
      fillRepairTotalPriceFormatted: totalPriceFormatted
    }, () => {
      // #region agent log
      console.log('[DEBUG] after setData callback', {
        currentFillRepairItemWarrantyExpired: this.data.currentFillRepairItem?.warrantyExpired,
        currentFillRepairItemId: this.data.currentFillRepairItem?._id
      });
      wx.request({url:'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',method:'POST',header:{'Content-Type':'application/json'},data:{location:'my.js:2625',message:'after setData callback currentFillRepairItem',data:{currentFillRepairItemWarrantyExpired:this.data.currentFillRepairItem?.warrantyExpired,currentFillRepairItemId:this.data.currentFillRepairItem?._id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'},fail:()=>{}});
      // #endregion
      this.updateModalState(); // 🔴 更新弹窗状态，锁定页面滚动
    });
  },
  
  // 🔴 新增：关闭填写售后单弹窗
  closeFillRepairModal() {
    this.setData({
      showFillRepairModal: false,
      currentFillRepairItem: null,
      fillRepairItems: [],
      fillRepairTrackingId: '',
      fillRepairTotalPrice: 0,
      fillRepairTotalPriceFormatted: '0.00'
    });
    this.updateModalState(); // 🔴 更新弹窗状态，解锁页面滚动
  },
  
  // 🔴 新增：添加维修项目
  addRepairItem() {
    const items = [...this.data.fillRepairItems, { name: '', price: 0 }];
    // 🔴 实时计算总价（使用最新的 items 数据）
    const totalPrice = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0);
    }, 0);
    
    // 格式化总价（保留两位小数）
    const totalPriceFormatted = totalPrice.toFixed(2);
    
    this.setData({
      fillRepairItems: items,
      fillRepairTotalPrice: totalPrice,
      fillRepairTotalPriceFormatted: totalPriceFormatted
    });
  },
  
  // 🔴 新增：删除维修项目
  deleteRepairItem(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const items = this.data.fillRepairItems.filter((_, i) => i !== index);
    
    // 至少保留一项
    if (items.length === 0) {
      items.push({ name: '', price: 0 });
    }
    
    // 🔴 实时计算总价（使用最新的 items 数据）
    const totalPrice = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0);
    }, 0);
    
    // 格式化总价（保留两位小数）
    const totalPriceFormatted = totalPrice.toFixed(2);
    
    this.setData({
      fillRepairItems: items,
      fillRepairTotalPrice: totalPrice,
      fillRepairTotalPriceFormatted: totalPriceFormatted
    });
  },
  
  // 🔴 新增：维修项目输入
  onRepairItemInput(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    if (isNaN(index) || index < 0) {
      console.error('[onRepairItemInput] 无效的索引', index);
      return;
    }
    
    const items = [...this.data.fillRepairItems];
    if (!items[index]) {
      console.error('[onRepairItemInput] 项目不存在', index, items);
      return;
    }
    
    if (field === 'price') {
      // 处理价格输入，支持小数
      // 移除所有非数字字符（保留小数点和负号）
      const cleanValue = value.replace(/[^\d.]/g, '');
      const numValue = parseFloat(cleanValue) || 0;
      items[index][field] = numValue;
    } else {
      items[index][field] = value;
    }
    
    // 🔴 实时计算总价（使用最新的 items 数据）
    const totalPrice = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      return sum + price;
    }, 0);
    
    // 格式化总价（保留两位小数）
    const totalPriceFormatted = totalPrice.toFixed(2);
    
    console.log('[onRepairItemInput] 计算总价', {
      index: index,
      field: field,
      value: value,
      items: JSON.parse(JSON.stringify(items)),
      totalPrice: totalPrice,
      totalPriceFormatted: totalPriceFormatted
    });
    
    // 同时更新项目列表和总价
    this.setData({
      fillRepairItems: items,
      fillRepairTotalPrice: totalPrice,
      fillRepairTotalPriceFormatted: totalPriceFormatted
    }, () => {
      console.log('[onRepairItemInput] setData 完成', {
        fillRepairTotalPrice: this.data.fillRepairTotalPrice,
        fillRepairTotalPriceFormatted: this.data.fillRepairTotalPriceFormatted
      });
    });
  },
  
  // 🔴 新增：计算总价（用于其他场景，如删除项目后）
  calculateFillRepairTotal() {
    const totalPrice = this.data.fillRepairItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0);
    }, 0);
    
    // 格式化总价（保留两位小数）
    const totalPriceFormatted = totalPrice.toFixed(2);
    
    this.setData({
      fillRepairTotalPrice: totalPrice,
      fillRepairTotalPriceFormatted: totalPriceFormatted
    });
  },
  
  // 🔴 新增：运单号输入
  onFillRepairTrackingIdInput(e) {
    this.setData({
      fillRepairTrackingId: e.detail.value
    });
  },
  
  // 🔴 新增：提交填写售后单（未过质保，直接提交）
  submitFillRepair() {
    const { currentFillRepairItem, fillRepairItems, fillRepairTrackingId } = this.data;
    
    if (!currentFillRepairItem || !currentFillRepairItem._id) {
      setTimeout(() => {
        this.showAutoToast('提示', '订单信息异常');
      }, 100);
      return;
    }
    
    // 验证维修项目
    const validItems = fillRepairItems.filter(item => item.name && item.name.trim() && (parseFloat(item.price) || 0) > 0);
    if (validItems.length === 0) {
      // 🔴 修复：延迟显示提示，确保弹窗层级正确，显示在填写售后单弹窗之上
      setTimeout(() => {
        this.showAutoToast('提示', '请至少添加一个有效的维修项目');
      }, 100);
      return;
    }
    
    // 验证运单号（未过质保时必须填写）
    if (!currentFillRepairItem.warrantyExpired && !fillRepairTrackingId.trim()) {
      this.showAutoToast('提示', '请输入寄回运单号');
      return;
    }
    
    this.showMyLoading('提交中...');
    const db = wx.cloud.database();
    
    // 计算总价
    const totalPrice = validItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0);
    }, 0);
    
    // 构建更新数据
    const updateData = {
      repairItems: validItems,
      repairTotalPrice: totalPrice,
      repairPaid: false // 未过质保，不需要支付
    };
    
    // 如果有运单号，直接更新状态
    if (fillRepairTrackingId.trim()) {
      updateData.trackingId = fillRepairTrackingId.trim();
      updateData.status = 'REPAIR_COMPLETED_SENT';
      updateData.repairCompleteTime = db.serverDate();
      updateData.returnCompleted = true;
    }
    
    db.collection('shouhou_repair').doc(currentFillRepairItem._id).update({
      data: updateData
    }).then(() => {
      this.hideMyLoading();
      
      // 关闭填写售后单弹窗
      this.closeFillRepairModal();
      
      // 🔴 测试模式：不移除卡片，保持显示以便测试
      // // 🔴 立即从列表中移除该订单（优化体验，无需等待数据库刷新）
      // const currentList = this.data.returnRequiredList || [];
      // const updatedList = currentList.filter(item => item._id !== currentFillRepairItem._id);
      // 
      // // 如果列表为空，关闭"需寄回订单确认"弹窗
      // if (updatedList.length === 0) {
      //   this.setData({
      //     returnRequiredList: updatedList,
      //     showReturnRequiredModal: false
      //   });
      // } else {
      //   this.setData({
      //     returnRequiredList: updatedList
      //   });
      // }
      
      // 刷新列表（确保数据同步）
      setTimeout(() => {
        this.loadReturnRequiredList();
      }, 300);
      
      this.loadMyOrders(); // 刷新订单列表
      
      let successMsg = '售后单已提交';
      if (fillRepairTrackingId.trim()) {
        successMsg = '售后单已提交，已寄出快递\n用户端已更新状态';
      }
      
      this.showAutoToast('提交成功', successMsg);
    }).catch(err => {
      this.hideMyLoading();
      console.error('提交失败:', err);
      this.showMyDialog({
        title: '提交失败',
        content: err.errMsg || '请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },
  
  // 🔴 新增：提交填写售后单（过质保，用户需要支付）
  // 管理员提交后，数据保存到数据库，用户在界面查看并支付
  submitFillRepairWithPayment() {
    const { currentFillRepairItem, fillRepairItems } = this.data;
    
    if (!currentFillRepairItem || !currentFillRepairItem._id) {
      setTimeout(() => {
        this.showAutoToast('提示', '订单信息异常');
      }, 100);
      return;
    }
    
    // 验证维修项目
    const validItems = fillRepairItems.filter(item => item.name && item.name.trim() && (parseFloat(item.price) || 0) > 0);
    if (validItems.length === 0) {
      // 🔴 修复：延迟显示提示，确保弹窗层级正确，显示在填写售后单弹窗之上
      setTimeout(() => {
        this.showAutoToast('提示', '请至少添加一个有效的维修项目');
      }, 100);
      return;
    }
    
    // 计算总价
    const totalPrice = validItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0);
    }, 0);
    
    if (totalPrice <= 0) {
      this.showAutoToast('提示', '总价必须大于0');
      return;
    }
    
    // 保存维修项目到数据库，用户待支付
    this.showMyLoading('提交中...');
    const db = wx.cloud.database();
    
    db.collection('shouhou_repair').doc(currentFillRepairItem._id).update({
      data: {
        repairItems: validItems,
        repairTotalPrice: totalPrice,
        repairPaid: false, // 待用户支付
        repairSubmitTime: db.serverDate() // 记录提交时间
      }
    }).then((updateRes) => {
      console.log('✅ [submitFillRepairWithPayment] 数据已保存到数据库:', {
        repairId: currentFillRepairItem._id,
        repairItems: validItems,
        repairTotalPrice: totalPrice,
        updateRes: updateRes
      });
      this.hideMyLoading();
      
      // 关闭填写售后单弹窗
      this.closeFillRepairModal();
      
      // 🔴 测试模式：不移除卡片，保持显示以便测试
      // // 🔴 立即从列表中移除该订单（优化体验，无需等待数据库刷新）
      // const currentList = this.data.returnRequiredList || [];
      // const updatedList = currentList.filter(item => item._id !== currentFillRepairItem._id);
      // 
      // // 如果列表为空，关闭"需寄回订单确认"弹窗
      // if (updatedList.length === 0) {
      //   this.setData({
      //     returnRequiredList: updatedList,
      //     showReturnRequiredModal: false
      //   });
      // } else {
      //   this.setData({
      //     returnRequiredList: updatedList
      //   });
      // }
      
      // 刷新列表（确保数据同步）
      setTimeout(() => {
        this.loadReturnRequiredList();
      }, 300);
      
      this.loadMyOrders();
      
      // 提示管理员
      this.showAutoToast('提交成功', '用户可在界面查看并支付维修费用');
    }).catch(err => {
      this.hideMyLoading();
      console.error('保存失败:', err);
      this.showMyDialog({
        title: '提交失败',
        content: err.errMsg || '请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },
  
  // 🔴 新增：执行维修支付
  doRepairPayment(repairId, repairItems, totalPrice) {
    const app = getApp();
    const isAdmin = this.data.isAdmin || (app && app.globalData && app.globalData.isAdmin);
    const isAuthorized = this.data.isAuthorized || (app && app.globalData && app.globalData.isAuthorized);
    
    // 管理员或授权用户支付金额为0.01元（测试）
    const payAmount = (isAdmin || isAuthorized) ? 0.01 : totalPrice;
    
    this.showMyLoading('唤起收银台...');
    
    // 🔴 获取用户昵称
    let userNickname = '';
    try {
      const savedNickname = wx.getStorageSync('user_nickname');
      if (savedNickname) {
        userNickname = savedNickname;
      } else {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.nickName) {
          userNickname = userInfo.nickName;
        }
      }
    } catch (e) {
      console.error('[doRepairPayment] 获取用户昵称失败:', e);
    }
    
    // 构建商品列表（用于支付）
    const goodsList = repairItems.map((item, index) => ({
      id: `repair_${repairId}_${index}`,
      name: item.name,
      spec: '维修项目',
      quantity: 1,
      total: parseFloat(item.price) || 0
    }));
    
    // 调用云函数获取支付参数
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: payAmount,
        goods: goodsList,
        addressData: {}, // 维修支付不需要地址
        shippingFee: 0,
        shippingMethod: 'none',
        userNickname: userNickname,
        repairId: repairId, // 🔴 传递维修单ID，用于支付成功后更新状态
        isRepairPayment: true // 🔴 标记这是维修支付
      },
      success: res => {
        this.hideMyLoading();
        const payment = res.result;
        
        if (payment && payment.error) {
          this.showMyDialog({
            title: '支付失败',
            content: payment.msg || '支付系统异常，请稍后再试',
            showCancel: false,
            confirmText: '知道了'
          });
          return;
        }
        
        if (!payment || !payment.paySign) {
          this.showMyDialog({
            title: '支付失败',
            content: '获取支付参数失败，请稍后再试',
            showCancel: false,
            confirmText: '知道了'
          });
          return;
        }
        
        // 调用微信支付
        wx.requestPayment({
          ...payment,
          success: () => {
            this.showAutoToast('支付成功', '维修费用已支付');
            
            // 支付成功后，更新维修单状态
            const db = wx.cloud.database();
            db.collection('shouhou_repair').doc(repairId).update({
              data: {
                repairPaid: true,
                repairPaidTime: db.serverDate()
              }
            }).then(() => {
              // 刷新列表
              this.loadReturnRequiredList();
              this.loadMyOrders();
              // 🔴 刷新用户端数据，确保支付后显示运单号输入框
              this.loadMyActivitiesPromise().catch(() => {});
            }).catch(err => {
              console.error('[doRepairPayment] 更新维修单状态失败:', err);
            });
          },
          fail: (err) => {
            console.error('[doRepairPayment] 支付失败:', err);
            if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
              this.showAutoToast('提示', '支付已取消');
            } else {
              this.showMyDialog({
                title: '支付失败',
                content: err.errMsg || '支付失败，请稍后再试',
                showCancel: false,
                confirmText: '知道了'
              });
            }
          }
        });
      },
      fail: err => {
        this.hideMyLoading();
        console.error('[doRepairPayment] 调用云函数失败:', err);
        this.showMyDialog({
          title: '支付失败',
          content: err.errMsg || '支付系统异常，请稍后再试',
          showCancel: false,
          confirmText: '知道了'
        });
      }
      });
  },

  // 【新增】管理员维修完成后寄出快递
  // 🔴 新增：用户支付维修费用
  payRepairFee(e) {
    const repairId = e.currentTarget.dataset.id;
    const repair = this.data.myReturnRequiredRepair;
    
    if (!repair || !repair.repairItems || repair.repairItems.length === 0) {
      this.showAutoToast('提示', '维修信息异常');
      return;
    }
    
    const totalPrice = repair.repairTotalPrice || 0;
    if (totalPrice <= 0) {
      this.showAutoToast('提示', '维修费用异常');
      return;
    }
    
    // 调用支付逻辑
    this.doRepairPayment(repairId, repair.repairItems, totalPrice);
  },

  adminShipOutAfterRepair(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showInputDialog({
      title: '寄出快递',
      placeholder: '请输入寄回给用户的运单号',
      success: (res) => {
        if (res.confirm && res.content) {
          const trackingId = res.content.trim();
          if (!trackingId) {
            this.showAutoToast('提示', '请输入运单号');
            return;
          }
          this.showMyLoading('处理中...');
          const db = wx.cloud.database();
          db.collection('shouhou_repair').doc(id).update({
            data: {
              status: 'REPAIR_COMPLETED_SENT',
              trackingId: trackingId, // 寄回给用户的单号
              repairCompleteTime: db.serverDate(),
              returnCompleted: true // 标记为已完成，卡片会消失
            }
          }).then(() => {
            this.hideMyLoading();
            this.showMyDialog({
              title: '操作成功',
              content: '维修完成，已寄出快递\n用户端已更新状态',
              showCancel: false,
              confirmText: '好的',
              success: () => {
                this.loadReturnRequiredList(); // 刷新列表，卡片会消失
                this.loadMyOrders(); // 刷新订单列表
              }
            });
          }).catch(err => {
            this.hideMyLoading();
            console.error('更新失败:', err);
            this.showMyDialog({
              title: '操作失败',
              content: err.errMsg || '请稍后重试',
              showCancel: false,
              confirmText: '知道了'
            });
          });
        }
      }
    });
  },

  // 🔴 新增：打开录入单号弹窗（用于已支付的订单）
  openEnterTrackingModal(e) {
    const item = e.currentTarget.dataset.item;
    const index = e.currentTarget.dataset.index;
    
    if (!item || !item._id) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }
    
    // 使用 showInputDialog 打开录入运单号弹窗
    this.showInputDialog({
      title: '录入单号',
      placeholder: '请输入寄回给用户的运单号',
      success: (res) => {
        if (res.confirm && res.content) {
          const trackingId = res.content.trim();
          if (!trackingId) {
            this.showAutoToast('提示', '请输入运单号');
            return;
          }
          this.showMyLoading('处理中...');
          const db = wx.cloud.database();
          
          // 🔴 第一步：更新维修单状态
          db.collection('shouhou_repair').doc(item._id).update({
            data: {
              status: 'REPAIR_COMPLETED_SENT',
              trackingId: trackingId, // 寄回给用户的单号
              repairCompleteTime: db.serverDate(),
              returnCompleted: true // 标记为已完成，卡片会消失
            }
          }).then(() => {
            // 🔴 第二步：查找对应的 shop_orders 订单并同步到微信订单中心
            // 通过用户的 openid 和维修项目来匹配订单
            const userOpenId = item._openid;
            if (!userOpenId) {
              console.warn('[openEnterTrackingModal] 维修单缺少用户 openid，无法同步到订单管理');
              this.hideMyLoading();
              this.showMyDialog({
                title: '操作成功',
                content: '运单号已录入\n用户端已更新状态',
                showCancel: false,
                confirmText: '好的',
                success: () => {
                  this.loadReturnRequiredList(); // 刷新列表
                  this.loadMyOrders(); // 刷新订单列表
                }
              });
              return;
            }
            
            // 查找该用户的已支付订单，匹配维修项目
            db.collection('shop_orders')
              .where({
                _openid: userOpenId,
                status: 'PAID' // 已支付的订单
              })
              .orderBy('createTime', 'desc')
              .limit(10)
              .get()
              .then(ordersRes => {
                if (!ordersRes.data || ordersRes.data.length === 0) {
                  console.warn('[openEnterTrackingModal] 未找到对应的订单');
                  this.hideMyLoading();
                  this.showMyDialog({
                    title: '操作成功',
                    content: '运单号已录入\n用户端已更新状态',
                    showCancel: false,
                    confirmText: '好的',
                    success: () => {
                      this.loadReturnRequiredList(); // 刷新列表
                      this.loadMyOrders(); // 刷新订单列表
                    }
                  });
                  return;
                }
                
                // 尝试匹配订单：查找包含维修项目的订单
                let matchedOrder = null;
                if (item.repairItems && item.repairItems.length > 0) {
                  // 构建维修项目名称列表用于匹配
                  const repairItemNames = item.repairItems.map(ri => ri.name);
                  
                  // 查找包含这些维修项目的订单
                  matchedOrder = ordersRes.data.find(order => {
                    if (!order.goodsList || order.goodsList.length === 0) return false;
                    // 检查订单商品是否包含维修项目
                    const orderItemNames = order.goodsList.map(g => g.name || g.spec || '');
                    return repairItemNames.some(name => orderItemNames.includes(name));
                  });
                }
                
                // 如果没找到匹配的，使用最近的一个已支付订单
                if (!matchedOrder) {
                  matchedOrder = ordersRes.data[0];
                }
                
                if (matchedOrder && matchedOrder.orderId) {
                  // 🔴 调用云函数同步到微信订单中心
                  wx.cloud.callFunction({
                    name: 'adminUpdateOrder',
                    data: {
                      id: matchedOrder._id,
                      orderId: matchedOrder.orderId,
                      action: 'ship',
                      trackingId: trackingId,
                      expressCompany: '' // 默认快递公司
                    },
                    success: (shipRes) => {
                      this.hideMyLoading();
                      if (shipRes.result && shipRes.result.success) {
                        this.showMyDialog({
                          title: '操作成功',
                          content: '运单号已录入并同步到订单管理\n用户端已更新状态',
                          showCancel: false,
                          confirmText: '好的',
                          success: () => {
                            this.loadReturnRequiredList(); // 刷新列表
                            this.loadMyOrders(); // 刷新订单列表
                          }
                        });
                      } else {
                        // 同步失败，但维修单已更新
                        this.showMyDialog({
                          title: '部分成功',
                          content: '运单号已录入\n但同步到订单管理失败：' + (shipRes.result?.errMsg || '未知错误'),
                          showCancel: false,
                          confirmText: '好的',
                          success: () => {
                            this.loadReturnRequiredList(); // 刷新列表
                            this.loadMyOrders(); // 刷新订单列表
                          }
                        });
                      }
                    },
                    fail: (shipErr) => {
                      console.error('[openEnterTrackingModal] 同步到订单管理失败:', shipErr);
                      this.hideMyLoading();
                      // 即使同步失败，维修单已更新成功
                      this.showMyDialog({
                        title: '部分成功',
                        content: '运单号已录入\n但同步到订单管理失败，请手动在订单管理中录入',
                        showCancel: false,
                        confirmText: '好的',
                        success: () => {
                          this.loadReturnRequiredList(); // 刷新列表
                          this.loadMyOrders(); // 刷新订单列表
                        }
                      });
                    }
                  });
                } else {
                  // 没找到订单，只更新维修单
                  this.hideMyLoading();
                  this.showMyDialog({
                    title: '操作成功',
                    content: '运单号已录入\n用户端已更新状态\n未找到对应订单，请手动在订单管理中录入',
                    showCancel: false,
                    confirmText: '好的',
                    success: () => {
                      this.loadReturnRequiredList(); // 刷新列表
                      this.loadMyOrders(); // 刷新订单列表
                    }
                  });
                }
              })
              .catch(err => {
                console.error('[openEnterTrackingModal] 查找订单失败:', err);
                this.hideMyLoading();
                // 即使查找订单失败，维修单已更新成功
                this.showMyDialog({
                  title: '操作成功',
                  content: '运单号已录入\n用户端已更新状态\n查找订单失败，请手动在订单管理中录入',
                  showCancel: false,
                  confirmText: '好的',
                  success: () => {
                    this.loadReturnRequiredList(); // 刷新列表
                    this.loadMyOrders(); // 刷新订单列表
                  }
                });
            });
          }).catch(err => {
            this.hideMyLoading();
            console.error('更新失败:', err);
            this.showMyDialog({
              title: '操作失败',
              content: err.errMsg || '请稍后重试',
              showCancel: false,
              confirmText: '知道了'
            });
          });
        }
      }
    });
  },

  // 🔴 场景B：管理员确认收货
  confirmReturnReceived(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showMyDialog({
      title: '确认收货',
      content: '确认已收到用户寄回的配件？确认后将标记为"售后完结"。',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('处理中...');
          const db = wx.cloud.database();
          // 标记为售后完结
          db.collection('shouhou_repair').doc(id).update({
            data: {
              returnCompleted: true,
              returnCompleteTime: db.serverDate(),
              status: 'RETURN_RECEIVED' // 标记为售后完结状态
            }
          }).then(() => {
            this.hideMyLoading();
            this.showMyDialog({
              title: '操作成功',
              content: '已确认收货，订单已标记为售后完结',
              showCancel: false,
              confirmText: '好的',
              success: () => {
                this.loadReturnRequiredList(); // 刷新列表
                this.loadMyActivitiesPromise().catch(() => {}); // 刷新用户端数据
                this.loadPendingRepairs(); // 刷新待处理列表
              }
            });
          }).catch(err => {
            this.hideMyLoading();
            console.error('操作失败:', err);
            this.showMyDialog({
              title: '操作失败',
              content: err.errMsg || '请稍后重试',
              showCancel: false,
              confirmText: '知道了'
            });
          });
        }
      }
    });
  },

  // 🔴 场景B：管理员扣除质保
  deductWarrantyForRepair(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showMyDialog({
      title: '扣除质保',
      content: '确认扣除用户30天质保？扣除后将显示"配件错误·扣30天"。',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('处理中...');
          // 调用云函数扣除质保
          wx.cloud.callFunction({
            name: 'deductWarrantyForOverdue',
            data: {
              repairId: id,
              force: true, // 强制扣除，不检查时间
              reason: '配件错误' // 扣除原因
            }
          }).then((res) => {
            this.hideMyLoading();
            
            console.log('扣除质保结果:', res.result);

            if (res.result && res.result.success) {
              // 检查是否有成功扣除的记录
              const resultData = res.result.results;
              if (resultData && resultData.totalDeducted > 0) {
                // 成功扣除（云函数已经更新了数据库状态，前端只需刷新）
                this.showMyDialog({
                  title: '操作成功',
                  content: '已扣除用户30天质保',
                  showCancel: false,
                  confirmText: '好的',
                  success: () => {
                    this.loadReturnRequiredList(); // 刷新列表
                    this.loadMyActivitiesPromise().catch(() => {}); // 刷新用户端数据
                    this.loadPendingRepairs(); // 刷新待处理列表
                  }
                });
              } else {
                // 执行成功但没有扣除任何记录（可能是找不到设备或已扣除）
                let failReason = '未能扣除质保';
                if (resultData && resultData.failed && resultData.failed.length > 0) {
                  failReason += '：' + resultData.failed[0].reason;
                } else if (res.result.message) {
                  failReason += '：' + res.result.message;
                }
                
                this.showAutoToast('操作失败', failReason);
              }
            } else {
              this.showAutoToast('操作失败', (res.result && res.result.message) || res.result?.error || '扣除质保失败，请稍后重试');
            }
          }).catch(err => {
            this.hideMyLoading();
            console.error('云函数调用失败:', err);
            this.showAutoToast('操作失败', '请求失败：' + (err.errMsg || '网络错误'));
          });
        }
      }
    });
  },

  // 【新增】管理员标记需寄回订单为已完成（删除订单）
  completeReturnRequired(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showMyDialog({
      title: '确认完成',
      content: '确认该订单已完成？完成后将删除该订单记录。',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('处理中...');
          const db = wx.cloud.database();
          // 标记为已完成（会从列表中移除）
          db.collection('shouhou_repair').doc(id).update({
            data: {
              returnCompleted: true,
              returnCompleteTime: db.serverDate(),
              status: 'COMPLETED' // 标记为已完成状态
            }
          }).then(() => {
            this.hideMyLoading();
            this.showMyDialog({
              title: '操作成功',
              content: '订单已完成，已从列表中移除',
              showCancel: false,
              confirmText: '好的',
              success: () => {
                this.loadReturnRequiredList(); // 刷新列表
                this.loadMyActivitiesPromise().catch(() => {}); // 刷新用户端数据，移除用户端的卡片
                this.loadPendingRepairs(); // 刷新待处理列表
              }
            });
          }).catch(err => {
            this.hideMyLoading();
            console.error('操作失败:', err);
            this.showMyDialog({
              title: '操作失败',
              content: err.errMsg || '请稍后重试',
              showCancel: false,
              confirmText: '知道了'
            });
          });
        }
      }
    });
  },

  // 【新增】管理员取消需寄回订单
  cancelReturnRequired(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showMyDialog({
      title: '确认取消',
      content: '确定要取消该订单的寄回要求吗？',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res && res.confirm) {
          this.showMyLoading('处理中...');
          const db = wx.cloud.database();
          db.collection('shouhou_repair').doc(id).update({
            data: {
              needReturn: false
            }
          }).then(() => {
            this.hideMyLoading();
            this.showMyDialog({
              title: '操作成功',
              content: '已取消寄回要求',
              showCancel: false,
              confirmText: '好的',
              success: () => {
                this.loadReturnRequiredList(); // 刷新列表
                this.loadPendingRepairs(); // 刷新待处理列表
              }
            });
          }).catch(err => {
            this.hideMyLoading();
            console.error('更新失败:', err);
            this.showMyDialog({
              title: '操作失败',
              content: err.errMsg || '请稍后重试',
              showCancel: false,
              confirmText: '知道了'
            });
          });
        }
      }
    });
  },

  // 更新数据库状态
  updateRepairStatus(id, status, trackingId = '') {
    this.showMyLoading('处理中...');
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(id).update({
      data: {
        status: status,
        trackingId: trackingId,
        solveTime: db.serverDate()
      }
    }).then(() => {
      this.hideMyLoading();
      
      // 根据状态显示不同的成功提示
      let successMsg = '处理完成';
      if (status === 'SHIPPED') {
        successMsg = '备件寄出成功\n运单号已录入，用户端已同步';
      } else if (status === 'TUTORIAL') {
        successMsg = '已通知用户查看维修教程\n用户可在个人中心查看教程进行修复';
      }
      
      this.showMyDialog({
        title: '操作成功',
        content: successMsg,
        showCancel: false,
        confirmText: '好的',
        success: () => {
          this.loadMyOrders();
          this.loadPendingRepairs(); // 🔴 刷新待处理列表，卡片消失
          if (!this.data.isAdmin) {
            this.loadMyActivities();
          }
        }
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error('更新失败:', err);
      this.showMyDialog({
        title: '处理失败',
        content: err.errMsg || '操作失败，请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },

  adminModifyPrice(e) {
    // 如果不是管理员，或者订单不是"待付款"或"待物料发出"状态，不让改
    const status = e.currentTarget.dataset.status;
    if (!this.data.isAdmin || (status !== 'UNPAID' && status !== 'PAID')) return;

    const id = e.currentTarget.dataset.id;
    const currentPrice = e.currentTarget.dataset.price;

    // 注意：自定义弹窗不支持 editable，需要改用其他方式输入
    // 这里先用简单提示，后续可以改为自定义输入框
    this.showMyDialog({
      title: '修改订单金额',
      content: `当前金额：¥${currentPrice}\n\n提示：改价功能需要输入框支持，请使用其他方式修改。`,
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消'
    });
  },

  // --- 复制 ---
  copyData(e) {
    const text = e.currentTarget.dataset.text;
    if(!text) return;
    
    // 🔴 复制前立即隐藏可能的官方弹窗（使用原生API）
    const hideOfficialToast = () => {
      try {
        if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
        if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
      } catch (e) {}
    };
    hideOfficialToast();
    
    wx.setClipboardData({
      data: text,
      success: () => {
        // 🔴 立即疯狂隐藏官方弹窗（使用原生API，多次尝试）
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
        // 使用统一的"内容已复制"弹窗（互斥）
        this._showCopySuccessOnce();
      },
      fail: () => {
        hideOfficialToast();
        setTimeout(hideOfficialToast, 50);
      }
    });
  },

  // --- 申请退款 ---
  onRefund() {
    this.showMyDialog({
      title: '申请退款',
      content: '请联系客服进行人工退款审核。',
      confirmText: '联系客服',
      showCancel: true,
      success: (res) => {
        if(res.confirm) {
          // 可以在这里跳转客服
        }
      }
    });
  },

  // --- 绑定设备相关逻辑 ---
  openBindModal() { 
    this.resetBluetoothState(); // 这一步保证了每次进来都是干净的
    this.setData({ showModal: true });
    this.updateModalState();
  },
  closeBindModal() { 
    this.resetBluetoothState(); // 关闭时也重置
    this.setData({ showModal: false });
    this.updateModalState();
  },
  
  // [新增] 重置蓝牙和表单状态
  resetBluetoothState() {
    // 1. 断开物理连接
    if (this.ble) {
      this.ble.stopScan();
      this.ble.disconnect();
    }

    // 2. 清空数据
    this.setData({
      isScanning: false,
      bluetoothReady: false,
      connectStatusText: '点击搜索设备',
      currentSn: '',
      connectedDeviceName: '',
      
      // 锁状态清空
      isDeviceLocked: false,
      lockedReason: '',
      
      // 表单清空
      modelIndex: null,
      buyDate: '',
      imgReceipt: '',
      imgChat: ''
    });
  },
  
  // [工具] 呼叫自定义弹窗
  showMyDialog(options) {
    this.setData({
      'dialog.show': true,
      'dialog.title': options.title || '提示',
      'dialog.content': options.content || '',
      'dialog.showCancel': options.showCancel || false,
      'dialog.confirmText': options.confirmText || '确定',
      'dialog.cancelText': options.cancelText || '取消',
      'dialog.callback': options.success || null // 存下回调函数
    });
    this.updateModalState();
  },

  // [交互] 点击弹窗确定（带收缩退出动画）
  onDialogConfirm() {
    const cb = this.data.dialog.callback;
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
      this.updateModalState();
      if (cb) cb({ confirm: true });
    }, 420);
  },

  // [交互] 点击取消（带收缩退出动画）
  closeCustomDialog() {
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
      this.updateModalState();
    }, 420);
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
        console.warn('[my] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 【新增】自动消失提示（无按钮，2秒后自动消失，带收缩退出动画）
  showAutoToast(title = '提示', content = '') {
    // 🔴 互斥：先关闭其他弹窗，避免重叠
    this._closeAllPopups();
    // 如果已有toast在显示，先关闭它
    if (this.data.autoToast.show) {
      this._closeAutoToastWithAnimation();
      setTimeout(() => {
        this._showAutoToastInternal(title, content);
      }, 420);
    } else {
      this._showAutoToastInternal(title, content);
    }
  },

  // 内部方法：显示自动提示
  _showAutoToastInternal(title, content) {
    this.setData({
      'autoToast.show': true,
      'autoToast.title': title,
      'autoToast.content': content,
      autoToastClosing: false
    });
    this.updateModalState();
    // 2秒后自动消失（带退出动画）
    setTimeout(() => {
      this._closeAutoToastWithAnimation();
    }, 2000);
  },

  // 关闭自动提示（带收缩退出动画）
  _closeAutoToastWithAnimation() {
    if (!this.data.autoToast.show) return;
    this.setData({ autoToastClosing: true });
    setTimeout(() => {
      this.setData({ 
        'autoToast.show': false,
        autoToastClosing: false
      });
      this.updateModalState();
    }, 420);
  },

  // 🔴 测试按钮：打开密码输入弹窗
  openTestPasswordModal() {
    this.setData({
      showTestPasswordModal: true,
      testPasswordInput: '',
      isClearingData: false
    });
    this.updateModalState();
  },

  // 🔴 关闭测试密码弹窗（带收缩退出动画）
  closeTestPasswordModal() {
    this.setData({ testPasswordModalClosing: true });
    setTimeout(() => {
      this.setData({
        showTestPasswordModal: false,
        testPasswordInput: '',
        testPasswordModalClosing: false
      });
      this.updateModalState();
    }, 420);
  },

  // 🔴 测试密码输入
  onTestPasswordInput(e) {
    this.setData({
      testPasswordInput: e.detail.value
    });
  },

  // 🔴 确认测试密码并清空数据
  confirmTestPassword() {
    const password = this.data.testPasswordInput;
    
    if (!password) {
      this.showAutoToast('提示', '请输入密码');
      return;
    }

    if (password !== '123456') {
      this.showAutoToast('提示', '密码错误');
      return;
    }

    // 密码正确，开始清空数据
    this.setData({
      showTestPasswordModal: false,
      testPasswordInput: '',
      isClearingData: true
    });
    this.updateModalState();

    this.clearAllCollections();
  },

  // 🔴 清空所有集合数据（排除 app_config、guanliyuan）
  // 使用云函数来删除，避免权限问题
  async clearAllCollections() {
    try {
      // 调用云函数清空所有集合
      const res = await wx.cloud.callFunction({
        name: 'clearAllCollections',
        data: {
          password: '123456' // 密码在云函数中再次验证
        }
      });

      // 清空完成
      this.setData({
        isClearingData: false,
        'clearProgress.current': 0,
        'clearProgress.total': 0,
        'clearProgress.currentCollection': ''
      });
      this.updateModalState();

      if (res.result && res.result.success) {
        const results = res.result.results;
        const successCount = results.success.length;
        const failCount = results.failed.length;
        const totalDeleted = results.totalDeleted;

        if (failCount === 0) {
          this.showAutoToast('提示', `清空完成！成功清空 ${successCount} 个集合，共删除 ${totalDeleted} 条数据`);
        } else {
          this.showAutoToast('提示', `清空完成！成功 ${successCount} 个，失败 ${failCount} 个，共删除 ${totalDeleted} 条数据`);
          console.warn('部分集合清空失败:', results.failed);
        }
      } else {
        this.setData({
          isClearingData: false,
          'clearProgress.current': 0,
          'clearProgress.total': 0,
          'clearProgress.currentCollection': ''
        });
        this.updateModalState();
        this.showAutoToast('提示', res.result?.error || '清空失败，请重试');
        console.error('云函数调用失败:', res.result);
      }
    } catch (err) {
      // 清空完成
      this.setData({
        isClearingData: false,
        'clearProgress.current': 0,
        'clearProgress.total': 0,
        'clearProgress.currentCollection': ''
      });
      this.updateModalState();
      this.showAutoToast('提示', '清空失败：' + (err.message || err.errMsg || '未知错误'));
      console.error('清空集合失败:', err);
    }
  },

  // 显示 Loading
  // 显示 Loading（使用和 index.js 一样的白色背景进度条动画）
  showMyLoading(title = '加载中...') {
    // 🔴 关键：先隐藏微信官方的 loading（如果存在），避免覆盖自定义 loading
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    this.setData({ showLoadingAnimation: true, loadingText: title });
    this.updateModalState();
  },

  // 隐藏 Loading
  hideMyLoading() {
    this.setData({ showLoadingAnimation: false });
    this.updateModalState();
  },

  // 显示输入弹窗
  showInputDialog(options) {
    this.setData({
      'inputDialog.show': true,
      'inputDialog.title': options.title || '输入',
      'inputDialog.placeholder': options.placeholder || '请输入',
      'inputDialog.value': options.value || '',
      'inputDialog.callback': options.success || null
    });
    this.updateModalState();
  },

  // 关闭输入弹窗（带收缩退出动画）
  // 🔴 新增：关闭权限提示弹窗
  closePermissionModal() {
    this.setData({ permissionModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showPermissionModal: false,
        permissionModalClosing: false
      });
    }, 420);
  },

  closeInputDialog() {
    this.setData({ inputDialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'inputDialog.show': false,
        inputDialogClosing: false
      });
      this.updateModalState();
      this.updateModalState();
    }, 420);
  },

  // 输入弹窗输入监听
  onInputDialogInput(e) {
    this.setData({ 'inputDialog.value': e.detail.value });
  },

  // 输入弹窗确认（带收缩退出动画）
  onInputDialogConfirm() {
    const callback = this.data.inputDialog.callback;
    const value = this.data.inputDialog.value;
    this.setData({ inputDialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'inputDialog.show': false,
        inputDialogClosing: false
      });
      this.updateModalState();
      if (callback) callback({ confirm: true, content: value });
    }, 420);
  },

  // --- 配置蓝牙回调 ---
  setupBleCallbacks() {
    // 状态：连接中
    this.ble.onConnecting = () => {
      this.setData({ 
        isScanning: true, // 保持动画
        connectStatusText: '正在连接设备...' 
      });
    };

    // 状态：连接成功 -> 开始走业务逻辑
    this.ble.onConnected = (device) => {
      console.log('蓝牙已连接:', device);
      this.handleDeviceBound(device);
    };

    // 状态：连接断开
    this.ble.onDisconnected = () => {
      this.setData({ 
        isScanning: false,
        bluetoothReady: false,
        connectStatusText: '连接断开，请重试' 
      });
    };

    // 状态：错误
    this.ble.onError = (err) => {
      this.hideMyLoading();
      
      // 🔴 处理蓝牙权限错误
      if (err && ((err.errMsg && err.errMsg.includes('auth deny')) || (err.type === 'auth_deny'))) {
        this.setData({ 
          isScanning: false, 
          connectStatusText: '蓝牙错误，请检查权限',
          showPermissionModal: true
        });
        return;
      }
      
      this.setData({ 
        isScanning: false, 
        connectStatusText: '蓝牙错误，请检查权限' 
      });
      console.error(err);
    };
  },

  // --- 点击按钮：开始扫描 ---
  async startConnect() {
    if (this.data.bluetoothReady) return; // 已连接就不点了

    // 🔴 检查 app_config.is_active，如果为 false 则管理员审核模式，模拟蓝牙连接成功
    const db = wx.cloud.database();
    try {
      const configRes = await db.collection('app_config').doc('blocking_rules').get();
      if (configRes.data && configRes.data.is_active === false) {
        console.log('[startConnect] 管理员审核模式，模拟蓝牙连接成功');
        // 模拟连接成功
        this.setData({ 
          isScanning: false,
          bluetoothReady: true,
          connectStatusText: '设备已连接（模拟）',
          connectedDeviceName: 'NB-TEST-DEVICE'
        });
        // 模拟设备对象
        const mockDevice = {
          deviceId: 'mock-device-id',
          name: 'NB-TEST-DEVICE',
          localName: 'NB-TEST-DEVICE'
        };
        this.handleDeviceBound(mockDevice);
        return;
      }
    } catch (e) {
      // 配置加载失败，继续正常流程
      console.log('[startConnect] 配置加载失败，使用正常流程');
    }

    this.setData({ 
      isScanning: true, 
      connectStatusText: '搜索附近设备中...' 
    });

    // 初始化并开始扫描
    this.ble.initBluetoothAdapter()
      .then(() => {
        // 这里的逻辑主要在 BLEHelper 内部的 setupDeviceFoundListener
        // 它会自动寻找 NB 开头的设备并连接
        this.ble.startScan(); 
      })
      .catch(() => {
        this.showAutoToast('提示', '请开启手机蓝牙');
        this.setData({ isScanning: false, connectStatusText: '请开启蓝牙后重试' });
      });
  },

  // --- 核心业务：处理设备绑定 (连接成功后调用) ---
  handleDeviceBound(device) {
    const rawName = device.name || device.localName || '';
    
    // 1. 【搜 NB】只允许 NB 开头的设备连接
    if (!rawName.toUpperCase().startsWith('NB')) {
      console.log('非NB设备，忽略:', rawName);
      return; 
    }

    // 2. 【取 SN】去掉 NB，剩下的就是纯数字 SN
    const sn = rawName.replace(/^NB/i, '').trim(); 

    if (!sn) {
      this.showAutoToast('错误', '无法识别SN码');
      this.ble.disconnect();
      return;
    }

    // 3. 【变 MT】生成一个假的显示名称，给用户看，也给数据库存
    const displayName = 'MT' + sn;

    // 更新界面提示
    this.setData({ 
      isScanning: false,
      connectStatusText: `正在验证: ${displayName}...` 
    });

    // 4. 调用云函数 (传过去的 deviceName 是 MT 开头的)
    // 🔴 添加重试机制
    this._bindDeviceWithRetry(sn, displayName, 0);
  },

  // 🔴 新增：带重试机制的绑定设备函数
  _bindDeviceWithRetry(sn, displayName, retryCount = 0) {
    const maxRetries = 3;
    
    wx.cloud.callFunction({
      name: 'bindDevice',
      data: {
        sn: sn,
        deviceName: displayName // 告诉云端这个设备叫 MTxxx
      },
      success: res => {
        const result = res.result;
        
        // 只要物理连接成功，界面上就显示 MTxxx
        this.setData({
          bluetoothReady: true,
          connectedDeviceName: displayName, // 【关键】界面显示 MT
          connectStatusText: '已连接'
        });

        if (result && result.success) {
          // 情况1：自动通过 (重绑/二手)
          if (result.status === 'AUTO_APPROVED') {
            // 使用自定义弹窗，而不是 Toast
            this.showMyDialog({
              title: '绑定成功',
              content: '设备已激活并连接，数据已同步。',
              confirmText: '好的',
              success: () => {
                this.closeBindModal();
                this.loadMyDevices();
              }
            });
          } 
          // 情况2：新机需审核
          else if (result.status === 'NEED_AUDIT') {
            // 这里不需要弹窗，只需要 Toast 提示一下让用户填表，或者直接静默
            // 如果非要弹窗，可以用 showMyDialog
            // 但建议这里用这一行轻提示即可，否则太打断流程
            this.showAutoToast('提示', '验证通过，请填表');
            
            this.setData({ 
              currentSn: sn,
              isDeviceLocked: false 
            });
          }

        } else {
          // 失败情况 (被锁)
          this.setData({
            isDeviceLocked: true,
            lockedReason: result?.msg || '设备绑定失败'
          });
        }
      },
      fail: (err) => {
        console.error('[bindDevice] 云函数调用失败:', err);
        
        // 🔴 改进错误处理：显示详细错误信息，并支持重试
        const errMsg = err.errMsg || err.message || '未知错误';
        const isNetworkError = errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('网络');
        
        if (retryCount < maxRetries && isNetworkError) {
          // 网络错误，自动重试
          const nextRetry = retryCount + 1;
          console.log(`[bindDevice] 网络错误，${1000 * nextRetry}ms 后重试 (${nextRetry}/${maxRetries})`);
          this.setData({ 
            connectStatusText: `网络校验失败，正在重试 (${nextRetry}/${maxRetries})...` 
          });
          
          setTimeout(() => {
            this._bindDeviceWithRetry(sn, displayName, nextRetry);
          }, 1000 * nextRetry); // 递增延迟：1s, 2s, 3s
        } else {
          // 达到最大重试次数或其他错误，显示错误信息
          const errorText = retryCount >= maxRetries 
            ? `网络校验失败，已重试 ${maxRetries} 次，请检查网络后重试` 
            : `网络校验失败: ${errMsg}`;
          
          this.showMyDialog({
            title: '绑定失败',
            content: errorText,
            confirmText: '重试',
            showCancel: true,
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                // 用户点击重试，重新开始绑定流程
                this._bindDeviceWithRetry(sn, displayName, 0);
              } else {
                // 用户取消，重置蓝牙状态
                this.resetBluetoothState();
              }
            }
          });
        }
      }
    });
  },

  // ==========================================
  // 2. 图片上传逻辑
  // ==========================================
  chooseProofImage(e) {
    const type = e.currentTarget.dataset.type; // 'receipt' or 'chat'
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.showMyLoading('上传中...');
        
        // 上传到云存储
        const cloudPath = `proofs/${Date.now()}-${Math.floor(Math.random()*1000)}.png`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempPath,
          success: uploadRes => {
            this.hideMyLoading();
            // 🔴 更新页面显示，同时保留 modelIndex（防止被清空）
            const updateData = {};
            if (type === 'receipt') {
              updateData.imgReceipt = uploadRes.fileID;
            } else {
              updateData.imgChat = uploadRes.fileID;
            }
            // 确保 modelIndex 不会被清空
            if (this.data.modelIndex !== null && this.data.modelIndex !== undefined) {
              updateData.modelIndex = this.data.modelIndex;
            }
            this.setData(updateData);
          },
          fail: err => {
            this.hideMyLoading();
            this.showAutoToast('上传失败', err.errMsg || '请重试');
          }
        });
      }
    });
  },

  // ==========================================
  // 3. 提交审核 (存入 my_read)
  // ==========================================
  submitAudit() {
    // A. 校验蓝牙是否连接 (必须有 SN)
    if (!this.data.bluetoothReady || !this.data.currentSn) {
      this.showAutoToast('提示', '请先连接MT设备');
      return;
    }

    // B. 校验型号
    if (this.data.modelIndex === null) {
      this.showAutoToast('提示', '请选择型号');
      return;
    }

    // C. 校验图片 (购买截图必传)
    if (!this.data.imgReceipt) {
      this.showAutoToast('提示', '请上传购买截图');
      return;
    }
    // 如果是二手，校验聊天记录
    if (this.data.bindType === 'used' && !this.data.imgChat) {
      this.showAutoToast('提示', '请上传聊天记录');
      return;
    }

    this.showMyLoading('提交中...');

    // D. 存入数据库 my_read
    const db = wx.cloud.database();
    
    db.collection('my_read').add({
      data: {
        // openid 会自动被云开发注入，不用手动传
        sn: this.data.currentSn, // 只有后面的数字
        fullDeviceName: 'MT' + this.data.currentSn, // 完整蓝牙名
        
        productModel: this.data.modelOptions[this.data.modelIndex],
        buyDate: this.data.buyDate,
        bindType: this.data.bindType, // new / used
        
        imgReceipt: this.data.imgReceipt,
        imgChat: this.data.imgChat || '',
        
        status: 'PENDING', // 审核状态
        createTime: db.serverDate()
      }
    }).then(res => {
      this.hideMyLoading();
      
      // 使用自定义弹窗
      this.showMyDialog({
        title: '已提交',
        content: '审核通过后将自动生效。',
        success: () => {
          this.closeBindModal();
          this.resetBluetoothState(); // 【关键】提交成功后，断开连接，清空状态
        }
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error(err);
      this.showAutoToast('提交失败', err.errMsg || '网络错误，请重试');
    });
  },

  changeBindType(e) {
    this.setData({ bindType: e.currentTarget.dataset.type });
  },

  onModelChange(e) { this.setData({ modelIndex: e.detail.value }); },
  onDateChange(e) { this.setData({ buyDate: e.detail.value }); },

  // 点击设备卡片右上角的 X
  removeDevice(e) {
    const index = e.currentTarget.dataset.index;
    const device = this.data.deviceList[index];
    
    // 这里的 device.sn 前端显示时加了 'MT'，我们需要去掉
    // 假设 device.sn 是 "MT8820"，我们要取 "8820"
    const rawSn = device.sn.replace(/^MT/i, ''); 

    // 使用自定义弹窗替代 wx.showModal
    this.showMyDialog({
      title: '解除绑定',
      content: '解绑后您将无法查看该设备状态。如果设备转让给他人，解绑后对方才可连接。确定操作吗？',
      showCancel: true,
      confirmText: '确定解绑',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('正在解绑...');
          
          wx.cloud.callFunction({
            name: 'unbindDevice',
            data: { sn: rawSn },
            success: res => {
              this.hideMyLoading();
              if (res.result.success) {
                
                // ✅ [替换]
                this.showMyDialog({
                  title: '解绑成功',
                  content: '设备已移除',
                  success: () => {
                    this.loadMyDevices(); // 刷新设备列表
                  }
                });
              } else {
                this.showAutoToast('失败', res.result.msg);
              }
            },
            fail: err => {
              this.hideMyLoading();
              this.showAutoToast('错误', '网络异常');
            }
          });
        }
      }
    });
  },

  // --- 返回上一页 ---
  goBack() {
    // 学习产品上新页面的返回逻辑：直接返回，失败则跳转到 products
    wx.navigateBack({
      fail: () => { 
        wx.reLaunch({ url: '/pages/products/products' }); 
      }
    });
  },

  // ================== 设备管理相关 ==================
  // 1. 【核心修改】修复加载设备的查询条件
  loadMyDevices() {
    // 如果还没拿到 OpenID，先不查
    if (!this.data.myOpenid) return;

    const db = wx.cloud.database();
    
    // 【修改】这里使用我们之前在 bindDevice 里存的 'openid' 字段
    // 并且不再写 '{openid}' 这种无效代码
    db.collection('sn').where({
      openid: this.data.myOpenid,  // 必须匹配当前用户
      isActive: true               // 必须是审核通过的
    }).get().then(res => {
      console.log('查到的设备:', res.data); // 调试打印

      // === 【新增】前端去重逻辑 ===
      const uniqueMap = new Map();
      const uniqueList = [];

      res.data.forEach(item => {
        // 如果这个 SN 还没出现过，才放进去
        if (!uniqueMap.has(item.sn)) {
          uniqueMap.set(item.sn, true);
          
          // 原有的计算逻辑
          const now = new Date();
          const exp = new Date(item.expiryDate);
          const diff = Math.ceil((exp - now) / (86400000));
          const isExpired = diff <= 0;

          uniqueList.push({
            name: item.productModel || '未知型号',
            sn: 'MT' + item.sn,
            days: diff > 0 ? diff : 0,
            isExpired: isExpired, // 🔴 新增：是否过期
            hasExtra: item.hasExtra,
            expiryDate: item.expiryDate,
            activations: item.activations,
            firmware: item.firmware
          });
        }
      });
      // ==========================
      
      this.setData({ deviceList: uniqueList });
    }).catch(err => {
      console.error('设备加载失败:', err);
    });
  },

  // 2. 加载待审核列表 (管理员用)
  loadAuditList() {
    if (!this.data.isAdmin) return;
    
    wx.cloud.database().collection('my_read')
      .where({ status: 'PENDING' }) // 只看待审核
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        this.setData({ auditList: res.data });
      })
      .catch(err => {
        console.error('加载审核列表失败', err);
      });
  },

  // 3. 打开审核弹窗（点击"审核设置"按钮）
  openAuditModal(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showAuditModal: true,
      currentAuditItem: item,
      adminSetDate: item.buyDate, // 默认填用户写的日期
      adminSetDaysIndex: 1        // 默认选 365天
    });
    this.updateModalState();
  },

  // 4. 关闭弹窗
  closeAuditModal() {
    this.setData({ showAuditModal: false, currentAuditItem: null });
    this.updateModalState();
  },

  // 5. 弹窗里的输入监听
  onAdminDateChange(e) { 
    this.setData({ adminSetDate: e.detail.value }); 
  },
  
  onAdminDaysChange(e) { 
    this.setData({ adminSetDaysIndex: e.detail.value }); 
  },

  // 6. 【核心】确认通过 -> 调用云函数
  confirmApprove() {
    const { currentAuditItem, adminSetDate, adminSetDaysIndex, warrantyValues } = this.data;
    const days = warrantyValues[adminSetDaysIndex];

    // #region agent log
    wx.request({
      url: 'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        location: 'miniprogram/pages/my/my.js:confirmApprove',
        message: '准备调用 adminAuditDevice 云函数',
        data: { id: currentAuditItem._id, action: 'approve', customDate: adminSetDate, customDays: days, sn: currentAuditItem.sn },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'warranty-debug',
        hypothesisId: 'E'
      },
      success: () => {},
      fail: () => {}
    });
    // #endregion

    this.showMyLoading('正在同步...');

    wx.cloud.callFunction({
      name: 'adminAuditDevice',
      data: { 
        id: currentAuditItem._id, 
        action: 'approve',
        customDate: adminSetDate, // 传修改后的日期
        customDays: days          // 传选择的天数
      },
      success: res => {
        // #region agent log
        wx.request({
          url: 'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: {
            location: 'miniprogram/pages/my/my.js:confirmApprove:success',
            message: 'adminAuditDevice 云函数调用成功',
            data: { success: res.result.success, msg: res.result.msg, errMsg: res.result.errMsg },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'warranty-debug',
            hypothesisId: 'E'
          },
          success: () => {},
          fail: () => {}
        });
        // #endregion
        
        this.hideMyLoading();
        if (res.result.success) {
          
          // ✅ [替换为自定义弹窗]
          this.showMyDialog({
            title: '审核完成',
            content: '该设备已激活，数据已同步给用户。',
            confirmText: '好的',
            success: () => {
              this.closeAuditModal(); // 关闭审核框
              this.loadAuditList();   // 刷新列表
              this.loadMyDevices();   // 刷新设备
            }
          });
        } else {
          // ✅ 替换
          this.showAutoToast('失败', res.result.errMsg);
        }
      },
      fail: err => {
        // #region agent log
        wx.request({
          url: 'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: {
            location: 'miniprogram/pages/my/my.js:confirmApprove:fail',
            message: 'adminAuditDevice 云函数调用失败',
            data: { errMsg: err.errMsg, error: err.toString() },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'warranty-debug',
            hypothesisId: 'E'
          },
          success: () => {},
          fail: () => {}
        });
        // #endregion
        
        this.hideMyLoading();
        console.error(err);
        this.showAutoToast('操作失败', err.errMsg || '网络错误，请重试');
      }
    });
  },

  // 🔴 将 loadMyActivities 改为返回 Promise 的版本
  loadMyActivitiesPromise() {
    return new Promise((resolve, reject) => {
      console.log('🔍 [loadMyActivities] 开始加载申请记录');
      
      // 🔴 确保已获取 openid
      if (!this.data.myOpenid) {
        console.warn('⚠️ [loadMyActivities] myOpenid 未获取，等待获取后再查询');
        // 如果还没获取到，延迟一下再试
        setTimeout(() => {
          if (this.data.myOpenid) {
            this.loadMyActivitiesPromise().then(resolve).catch(reject);
          } else {
            resolve(); // 如果还是没有，直接 resolve，避免卡住
          }
        }, 500);
        return;
      }
      
      const db = wx.cloud.database();
      
      // 🔴 修复：明确指定当前用户的 _openid，确保只查询当前用户的数据
      // 1. 查设备绑定申请
      const p1 = db.collection('my_read')
        .where({ _openid: this.data.myOpenid }) // 🔴 明确指定当前用户的 openid
        .orderBy('createTime', 'desc')
        .get();
      
      // 2. 查视频投稿申请
      const p2 = db.collection('video')
        .where({ _openid: this.data.myOpenid }) // 🔴 明确指定当前用户的 openid
        .orderBy('createTime', 'desc')
        .get();

      // 3. 查维修工单 (新增)
      const p3 = db.collection('shouhou_repair')
        .where({ _openid: this.data.myOpenid })
        .orderBy('createTime', 'desc')
        .get();

      // 4. 查用户需寄回的维修单
      // 🔴 修复：不过滤 repairItems，确保已填写售后单的订单也能显示给用户
      const p4 = db.collection('shouhou_repair')
        .where({
          _openid: this.data.myOpenid,
          needReturn: true,
          returnCompleted: db.command.neq(true)
        })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();

      // 5. 查仅需购买配件的维修单（needPurchaseParts 且非 needReturn，排除已完成购买的）
      // 🔴 修复：排除 purchasePartsStatus === 'completed' 的维修单，避免已购买后重新显示卡片
      const p5 = db.collection('shouhou_repair')
        .where({
          _openid: this.data.myOpenid,
          needPurchaseParts: true,
          needReturn: db.command.neq(true),
          purchasePartsStatus: db.command.neq('completed') // 🔴 排除已完成的
        })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();

      // 6. 查用户已支付订单（用于回退检查：是否已下单配件且至少 2 项与所需配件一致）
      // 🔴 注意：订单表可能使用 realStatus 字段，需要同时查询 status 和 realStatus 为 PAID 的订单
      const p6 = this.data.myOpenid
        ? db.collection('shop_orders')
            .where(db.command.or([
              { _openid: this.data.myOpenid, status: 'PAID' },
              { _openid: this.data.myOpenid, realStatus: 'PAID' }
            ]))
            .orderBy('createTime', 'desc')
            .limit(50)
            .get()
        : Promise.resolve({ data: [] });

      // 7. 🔴 查询 shouhouguoqi 集合，判断用户是否已经购买过配件
      const p7 = this.data.myOpenid
        ? db.collection('shouhouguoqi')
            .where({
              _openid: this.data.myOpenid,
              hasPurchased: true
            })
            .get()
        : Promise.resolve({ data: [] });

      Promise.all([p1, p2, p3, p4, p5, p6, p7]).then(res => {
      console.log('📋 [loadMyActivities] 查询结果 - 设备申请:', res[0].data.length, '条, 视频申请:', res[1].data.length, '条');
      console.log('📋 [loadMyActivities] 设备申请详情:', res[0].data);
      console.log('📋 [loadMyActivities] 视频申请详情:', res[1].data);
      
      // 处理设备数据
      const deviceApps = res[0].data.map(i => {
        // 🔴 统一状态值：设备申请使用字符串，需要转换为数字
        let statusNum = 0; // 默认审核中
        if (i.status === 'APPROVED') {
          statusNum = 1; // 已通过
        } else if (i.status === 'REJECTED') {
          statusNum = -1; // 已驳回
        } else if (i.status === 'PENDING') {
          statusNum = 0; // 审核中
        }
        
        return {
          ...i, 
          type: 'device', 
          title: '绑定: ' + (i.productModel || '未知设备'),
          status: statusNum, // 🔴 统一转换为数字状态
          originalCreateTime: i.createTime, // 🔴 保留原始时间用于排序
          // 格式化时间用于显示
          createTime: i.createTime ? this.formatTimeSimple(i.createTime) : '刚刚'
        };
      });
      
      // 处理视频数据
      const videoApps = res[1].data.map(i => {
        // 🔴 确保视频投稿不包含维修相关属性，避免显示错误的标签
        const { needReturn, returnStatus, returnCompleted, repairItems, repairTotalPrice, repairPaid, warrantyExpired, remainingDays, needPurchaseParts, purchasePartsStatus, type, ...videoData } = i;
        // 🔴 构建干净的视频数据对象，不包含任何维修相关属性
        const cleanVideoData = {};
        // 只复制需要的字段
        Object.keys(videoData).forEach(key => {
          // 排除所有维修相关字段
          if (!['needReturn', 'returnStatus', 'returnCompleted', 'repairItems', 'repairTotalPrice', 'repairPaid', 'warrantyExpired', 'remainingDays', 'needPurchaseParts', 'purchasePartsStatus'].includes(key)) {
            cleanVideoData[key] = videoData[key];
          }
        });
        return {
          ...cleanVideoData,
          type: 'video', // 🔴 强制设置为 'video'，覆盖任何可能的错误值
          title: '投稿: ' + (i.vehicleName || '未知车型'),
          // 视频申请已经是数字状态（0/1/-1），直接使用
          originalCreateTime: i.createTime, // 🔴 保留原始时间用于排序
          // 格式化时间用于显示
          createTime: i.createTime ? this.formatTimeSimple(i.createTime) : '刚刚'
        };
      });
      
      // [新增] 处理维修工单
      const repairApps = res[2].data.map(i => {
        // 🔴 调试日志：检查每条维修单的数据
        if (i._id) {
          console.log('🔍 [loadMyActivities] 维修单数据:', {
            _id: i._id,
            model: i.model,
            status: i.status,
            needPurchaseParts: i.needPurchaseParts,
            purchasePartsList: i.purchasePartsList,
            purchasePartsStatus: i.purchasePartsStatus
          });
        }
        
        let statusText = '审核中';
        let statusClass = 'processing';
        let statusNum = 0; // 统一状态值，用于过滤逻辑
        
        // 处理各种状态
        // 🔴 优先检查是否需要购买配件（必须在其他状态判断之前）
        const hasNeedPurchaseParts = i.needPurchaseParts === true || i.needPurchaseParts === 'true';
        const hasPurchasePartsList = i.purchasePartsList && Array.isArray(i.purchasePartsList) && i.purchasePartsList.length > 0;
        
        if (hasNeedPurchaseParts || hasPurchasePartsList) {
          console.log('✅ [loadMyActivities] 检测到需要购买配件:', {
            _id: i._id,
            needPurchaseParts: i.needPurchaseParts,
            hasPurchasePartsList: hasPurchasePartsList
          });
          // 🔴 工程师审核中 → 需要购买配件：管理员一旦标记（needPurchaseParts 或 有 purchasePartsList），就显示「需要购买配件」不再显示「工程师审核中」
          if (i.purchasePartsStatus === 'completed') {
            statusText = '已购配件';
            statusClass = 'success';
            statusNum = 1; // 已处理
          } else {
            statusText = '待购配件';
            statusClass = 'fail';
            statusNum = 0; // 待处理
            console.log('✅ [loadMyActivities] 设置状态为"待购配件":', i._id, 'statusText:', statusText);
          }
        } else if (i.warrantyDeducted || i.isWarrantyDeducted) {
        // 🔴 优先检查扣除质保状态
          if (i.deductionReason === '配件错误' || i.deductionReason === 'wrong_part') {
            statusText = '配件错误·扣30天';
            statusClass = 'fail';
          } else if (i.deductionReason === '超时' || i.deductionReason === 'timeout') {
            statusText = '超时未寄·扣30天';
            statusClass = 'fail';
          } else {
            statusText = '扣30天质保';
            statusClass = 'fail';
          }
          statusNum = 1; // 已处理
        } else if (i.status === 'RETURN_RECEIVED' || i.status === 'COMPLETED') {
          // 🔴 场景A：售后完结；场景B：已维修完成
          if (i.returnStatus !== 'PENDING_RETURN') {
            statusText = '售后完结';
            statusClass = 'success';
          } else {
            statusText = '已维修完成';
            statusClass = 'success';
          }
          statusNum = 1; // 已处理
        } else if (i.status === 'REPAIR_COMPLETED_SENT') {
          statusText = '已维修完成';
          statusClass = 'success';
          statusNum = 1; // 已处理
        } else if (i.status === 'USER_SENT' || i.returnStatus === 'USER_SENT') {
          // 🔴 场景A：如果returnStatus不是PENDING_RETURN，显示"等待管理员确认收货"
          if (i.returnStatus !== 'PENDING_RETURN') {
            statusText = '待确认收货';
            statusClass = 'processing';
          } else {
            // 场景B：检查是否已支付（过保用户）
            const isWarrantyExpired = i.warrantyExpired === true || i.remainingDays === 0;
            const hasRepairItems = i.repairItems && i.repairItems.length > 0 && i.repairTotalPrice > 0;
            if (isWarrantyExpired && hasRepairItems && i.repairPaid === true) {
              // 🔴 已支付：显示"已支付·待维修"（绿色）
              statusText = '已支付·待维修';
              statusClass = 'success';
            } else {
              // 未支付或其他情况：显示"正在维修中"
            statusText = '正在维修中';
            statusClass = 'processing';
            }
          }
          statusNum = 0; // 维修中
        } else if (i.status === 'SHIPPED') {
          // 🔴 场景A：如果needReturn为true，显示"需寄回故障配件"（红色），否则显示"配件已寄出"（绿色）
          if (i.needReturn && i.returnStatus !== 'PENDING_RETURN') {
            statusText = '故障需寄回';
            statusClass = 'fail';
          } else {
            statusText = '已寄出';
            statusClass = 'success';
          }
          statusNum = 1; // 已处理
        } else if (i.status === 'TUTORIAL') {
          statusText = '教程可修复'; // 用户看到这个状态
          statusClass = 'info'; // 蓝色
          statusNum = 1; // 已处理
        } else if (i.needReturn && !i.returnCompleted && i.status !== 'REPAIR_COMPLETED_SENT' && i.status !== 'SHIPPED') {
          // 🔴 场景B：需要寄回维修，且未完成寄回，显示"需要寄回维修"
          if (i.returnStatus === 'PENDING_RETURN') {
            // 🔴 过保用户：如果有维修项目和价格，显示支付状态
            const isWarrantyExpired = i.warrantyExpired === true || i.remainingDays === 0;
            const hasRepairItems = i.repairItems && i.repairItems.length > 0 && i.repairTotalPrice > 0;
            if (isWarrantyExpired && hasRepairItems) {
              if (i.repairPaid === true) {
                statusText = '已支付·待维修';
                statusClass = 'success'; // 🔴 已支付显示绿色
              } else {
                statusText = '待支付·需寄回';
                statusClass = 'fail'; // 🔴 待支付显示红色
              }
            } else {
              statusText = '需寄回维修';
              statusClass = 'fail'; // 🔴 默认红色
            }
          } else {
            statusText = '待寄回维修';
            statusClass = 'processing';
          }
          statusNum = 0; // 待处理
        } else if (i.status === 'PENDING') {
          statusText = '审核中';
          statusClass = 'processing';
          statusNum = 0; // 审核中
          console.log('⚠️ [loadMyActivities] 设置状态为"工程师审核中":', i._id, 'needPurchaseParts:', i.needPurchaseParts);
        }
        
        const result = {
          ...i,
          type: 'repair',
          title: '故障报修: ' + (i.model || '未知型号'),
          statusText: statusText, // 自定义显示文本
          statusClass: statusClass,
          status: i.status, // 保留原始状态字符串，用于判断
          originalCreateTime: i.createTime,
          createTime: i.createTime ? this.formatTimeSimple(i.createTime) : '刚刚',
          trackingId: i.trackingId || '', // 确保有 trackingId 字段
          needReturn: i.needReturn || false, // 确保有 needReturn 字段
          returnStatus: i.returnStatus || '', // 确保有 returnStatus 字段
          needPurchaseParts: i.needPurchaseParts || false, // 🔴 确保有 needPurchaseParts 字段
          purchasePartsList: i.purchasePartsList || [], // 🔴 确保有 purchasePartsList 字段
          purchasePartsStatus: i.purchasePartsStatus || '', // 🔴 确保有 purchasePartsStatus 字段
          warrantyExpired: i.warrantyExpired || false, // 🔴 确保有 warrantyExpired 字段
          remainingDays: i.remainingDays !== undefined ? i.remainingDays : null, // 🔴 确保有 remainingDays 字段
          repairItems: i.repairItems || [], // 🔴 确保有 repairItems 字段
          repairTotalPrice: i.repairTotalPrice || 0, // 🔴 确保有 repairTotalPrice 字段
          repairPaid: i.repairPaid || false // 🔴 确保有 repairPaid 字段
        };
        
        console.log('📝 [loadMyActivities] 最终返回的维修单状态:', {
          _id: result._id,
          model: result.model,
          statusText: result.statusText,
          needPurchaseParts: result.needPurchaseParts
        });
        
        return result;
      });
      
      // 🔴 调试：检查视频投稿数据
      videoApps.forEach(v => {
        if (v.type !== 'video' || v.needReturn !== undefined || v.returnStatus !== undefined) {
          console.error('❌ [loadMyActivities] 视频投稿数据异常:', {
            _id: v._id,
            type: v.type,
            needReturn: v.needReturn,
            returnStatus: v.returnStatus,
            title: v.title
          });
        }
      });
      
      // 合并并按时间倒序（使用原始时间对象排序）
      const all = [...deviceApps, ...videoApps, ...repairApps].sort((a, b) => {
        // 使用原始 createTime 对象排序
        const timeA = a.originalCreateTime ? new Date(a.originalCreateTime).getTime() : 0;
        const timeB = b.originalCreateTime ? new Date(b.originalCreateTime).getTime() : 0;
        return timeB - timeA;
      });
      
      // 🔴 再次检查合并后的数据，强制清理视频投稿的维修相关属性
      all.forEach(item => {
        if (item.type === 'video') {
          // 🔴 强制删除所有维修相关属性
          delete item.needReturn;
          delete item.returnStatus;
          delete item.returnCompleted;
          delete item.repairItems;
          delete item.repairTotalPrice;
          delete item.repairPaid;
          delete item.warrantyExpired;
          delete item.remainingDays;
          delete item.needPurchaseParts;
          delete item.purchasePartsStatus;
          // 确保 type 正确
          item.type = 'video';
        }
      });
      
      // 🔴 过滤规则：
      // - 设备 / 视频申请：显示「审核中 / 已通过 / 已驳回」
      // - 维修工单：全部展示（含 SHIPPED / TUTORIAL），因为用户需要看到处理结果
      const filtered = all.filter(i => {
        // 维修工单始终保留
        if (i.type === 'repair') return true;
        const status = i.status;
        // 设备 / 视频：保留 审核中(0/PENDING)、已通过(1/APPROVED) 和 已驳回(-1/REJECTED)
        return status === 0 || status === 'PENDING' || 
               status === 1 || status === 'APPROVED' || 
               status === -1 || status === 'REJECTED';
      });
      
      console.log('📋 [loadMyActivities] 过滤后的申请记录（已通过已排除）:', filtered);
      console.log('📋 [loadMyActivities] 记录数量:', filtered.length);
      
      // 【新增】设置用户需寄回的维修单（取最新的一个未完成的，且未标记为COMPLETED）
      // 🔴 修复：从 p4 的查询结果中获取需寄回的维修单（res[3] 是 p3，res[3] 是 p4）
      // Promise.all 的顺序：[p1, p2, p3, p4, p5, p6, p7]
      // res[0] = p1, res[1] = p2, res[2] = p3, res[3] = p4, res[4] = p5, res[5] = p6, res[6] = p7
      // 🔴 修复：即使 status 是 USER_SENT，如果有 repairItems 且未支付，也要显示
      const returnRequiredRepairs = (res[3].data || []).filter(item => {
        // 如果已填写售后单且未支付，即使有 returnTrackingId 也要显示
        const hasUnpaidRepair = item.repairItems && item.repairItems.length > 0 && item.repairPaid === false;
        // 基本过滤条件
        const basicFilter = !item.returnCompleted && item.status !== 'COMPLETED';
        // 如果有未支付的维修单，即使 status 是 USER_SENT 也显示
        return basicFilter && (hasUnpaidRepair || item.status !== 'USER_SENT');
      });
      console.log('🔍 [loadMyActivities] p4 查询结果:', {
        totalCount: res[3].data?.length || 0,
        filteredCount: returnRequiredRepairs.length,
        allItems: res[3].data?.map(item => ({
          id: item._id,
          needReturn: item.needReturn,
          returnCompleted: item.returnCompleted,
          status: item.status,
          hasRepairItems: !!item.repairItems,
          repairItemsLength: item.repairItems?.length || 0,
          repairPaid: item.repairPaid,
          returnTrackingId: item.returnTrackingId
        })) || []
      });
      let myReturnRequiredRepair = returnRequiredRepairs.length > 0 ? returnRequiredRepairs[0] : null;
      
      // 🔴 调试：如果查询结果为空，检查是否有未支付的维修单
      if (!myReturnRequiredRepair && res[3].data && res[3].data.length > 0) {
        const unpaidRepairs = res[3].data.filter(item => 
          item.repairItems && item.repairItems.length > 0 && item.repairPaid === false
        );
        console.log('⚠️ [loadMyActivities] 查询结果为空，但发现未支付的维修单:', unpaidRepairs.length, unpaidRepairs);
        if (unpaidRepairs.length > 0) {
          // 如果有未支付的维修单，即使有 returnTrackingId 也要显示
          myReturnRequiredRepair = unpaidRepairs[0];
          console.log('✅ [loadMyActivities] 使用未支付的维修单:', myReturnRequiredRepair._id);
        }
      }
      
      // 🔴 修复：确保 repairItems 和 repairTotalPrice 被正确传递
      if (myReturnRequiredRepair) {
        // 🔴 重新计算 warrantyExpired（如果数据库中的值是 false 或 undefined，但 expiryDate 存在）
        if (myReturnRequiredRepair.expiryDate && (myReturnRequiredRepair.warrantyExpired === false || myReturnRequiredRepair.warrantyExpired === undefined)) {
          const now = new Date();
          const exp = new Date(myReturnRequiredRepair.expiryDate);
          const diff = Math.ceil((exp - now) / (86400000));
          myReturnRequiredRepair.warrantyExpired = diff <= 0;
          console.log('🔍 [loadMyActivities] 重新计算 warrantyExpired:', {
            original: myReturnRequiredRepair.warrantyExpired,
            expiryDate: myReturnRequiredRepair.expiryDate,
            diff: diff,
            recalculated: myReturnRequiredRepair.warrantyExpired
          });
        }
        
        console.log('✅ [loadMyActivities] 需寄回维修单数据（格式化前）:', {
          id: myReturnRequiredRepair._id,
          hasRepairItems: !!myReturnRequiredRepair.repairItems,
          repairItemsLength: myReturnRequiredRepair.repairItems?.length || 0,
          repairItems: myReturnRequiredRepair.repairItems,
          repairTotalPrice: myReturnRequiredRepair.repairTotalPrice,
          repairPaid: myReturnRequiredRepair.repairPaid,
          warrantyExpired: myReturnRequiredRepair.warrantyExpired,
          expiryDate: myReturnRequiredRepair.expiryDate,
          allKeys: Object.keys(myReturnRequiredRepair)
        });
      }
      
      // 格式化时间用于显示，并计算倒计时（场景A：管理员录单备件寄出）
      if (myReturnRequiredRepair && myReturnRequiredRepair.createTime) {
        // 🔴 场景A：计算30天倒计时（returnStatus !== 'PENDING_RETURN'）
        let countdownDays = null;
        let isOverdue = false;
        if (myReturnRequiredRepair.returnStatus !== 'PENDING_RETURN' && myReturnRequiredRepair.status === 'SHIPPED') {
          const now = new Date();
          const startTime = myReturnRequiredRepair.solveTime ? new Date(myReturnRequiredRepair.solveTime) : (myReturnRequiredRepair.createTime ? new Date(myReturnRequiredRepair.createTime) : null);
          if (startTime) {
            const daysDiff = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
            countdownDays = Math.max(0, 30 - daysDiff);
            isOverdue = daysDiff >= 30;
          }
        }
        
        myReturnRequiredRepair = {
          ...myReturnRequiredRepair,
          createTime: this.formatTimeSimple(myReturnRequiredRepair.createTime),
          countdownDays: countdownDays,
          isOverdue: isOverdue
        };
        
        // 🔴 调试：检查格式化后是否保留了 repairItems
        console.log('✅ [loadMyActivities] 需寄回维修单数据（格式化后）:', {
          id: myReturnRequiredRepair._id,
          hasRepairItems: !!myReturnRequiredRepair.repairItems,
          repairItemsLength: myReturnRequiredRepair.repairItems?.length || 0,
          repairItems: myReturnRequiredRepair.repairItems,
          repairTotalPrice: myReturnRequiredRepair.repairTotalPrice,
          repairPaid: myReturnRequiredRepair.repairPaid
        });
        
        // 🔴 检查是否需要显示付费确认弹窗（质保过期 + 需要寄回 + 未确认）
        if (myReturnRequiredRepair.warrantyExpired === true && 
            myReturnRequiredRepair.needReturn === true && 
            (myReturnRequiredRepair.paidRepairAgreed === null || myReturnRequiredRepair.paidRepairAgreed === undefined)) {
          // 延迟显示弹窗，确保页面已渲染
          setTimeout(() => {
            this.setData({
              showPaidRepairConfirmModal: true,
              currentPaidRepairItem: myReturnRequiredRepair
            });
            this.updateModalState(); // 🔴 更新弹窗状态，锁定页面滚动
          }, 500);
        }
      }

      // 设置仅需购买配件的维修单（needPurchaseParts 且无 needReturn，排除已完成购买的）
      const purchasePartsRepairs = res[4].data || [];
      let myPurchasePartsRepair = purchasePartsRepairs.length > 0 ? purchasePartsRepairs[0] : null;
      
      // 🔴 从 shouhouguoqi 集合读取，判断用户是否已经购买过配件
      const guoqiRecords = res[6].data || [];
      const purchasedRepairIds = new Set(guoqiRecords.map(r => r.repairId).filter(id => id));
      console.log('🔍 [loadMyActivities] shouhouguoqi 记录数:', guoqiRecords.length, '已购买配件维修单ID:', Array.from(purchasedRepairIds));
      
      // 🔴 二次过滤：确保排除 purchasePartsStatus === 'completed' 的维修单（防止数据库查询条件不生效）
      if (myPurchasePartsRepair && myPurchasePartsRepair.purchasePartsStatus === 'completed') {
        console.log('🔍 [loadMyActivities] 检测到 purchasePartsStatus 为 completed，排除该维修单');
        myPurchasePartsRepair = null;
      }
      
      // 🔴 如果 shouhouguoqi 中有该维修单的记录，说明已经购买过，排除该维修单
      if (myPurchasePartsRepair && purchasedRepairIds.has(myPurchasePartsRepair._id)) {
        console.log('🔍 [loadMyActivities] shouhouguoqi 中已有该维修单的购买记录，排除该维修单');
        myPurchasePartsRepair = null;
      }
      
      if (myPurchasePartsRepair && myPurchasePartsRepair.createTime) {
        myPurchasePartsRepair = {
          ...myPurchasePartsRepair,
          createTime: this.formatTimeSimple(myPurchasePartsRepair.createTime)
        };
      }
      // 🔴 回退检查：若维修单上未标 completed，则根据用户已支付订单判断是否已购买配件（至少 2 项与所需配件一致则视为已购买，卡片消失）
      if (myPurchasePartsRepair && myPurchasePartsRepair.purchasePartsStatus !== 'completed') {
        const paidOrders = (res[5] && res[5].data) ? res[5].data : [];
        const requiredParts = [];
        (myPurchasePartsRepair.purchasePartsList || []).forEach(g => {
          (g.parts || []).forEach(p => {
            const name = typeof p === 'string' ? p : (p && p.name ? p.name : '');
            if (name && name.trim()) requiredParts.push(name.trim());
          });
        });
        const orderedNames = [];
        console.log('🔍 [loadMyActivities] 回退检查：已支付订单数量', paidOrders.length);
        console.log('🔍 [loadMyActivities] 回退检查：已支付订单详情', paidOrders);
        paidOrders.forEach((order, orderIndex) => {
          console.log(`🔍 [loadMyActivities] 订单 ${orderIndex}:`, {
            _id: order._id,
            orderId: order.orderId || order.id,
            status: order.status,
            realStatus: order.realStatus,
            goodsList: order.goodsList,
            goodsListType: typeof order.goodsList,
            goodsListLength: Array.isArray(order.goodsList) ? order.goodsList.length : 'not array',
            goodsListKeys: order.goodsList && typeof order.goodsList === 'object' ? Object.keys(order.goodsList) : 'N/A'
          });
          // 🔴 确保 goodsList 是数组
          const goodsList = Array.isArray(order.goodsList) ? order.goodsList : [];
          goodsList.forEach((g, gIndex) => {
            // 🔴 尝试多种可能的字段名
            const name = (g && (
              (g.name != null) ? String(g.name).trim() :
              (g.title != null) ? String(g.title).trim() :
              (g.productName != null) ? String(g.productName).trim() :
              ''
            )) || '';
            console.log(`  - 商品 ${gIndex}: name="${name}"`, '完整对象:', g);
            if (name) orderedNames.push(name);
          });
        });
        console.log('🔍 [loadMyActivities] 提取的已订购配件名称:', orderedNames);
        let matchCount = 0;
        const requiredSet = [...new Set(requiredParts)];
        for (let i = 0; i < requiredSet.length && matchCount < 2; i++) {
          const r = requiredSet[i];
          const found = orderedNames.some(o => r === o || r.indexOf(o) !== -1 || o.indexOf(r) !== -1);
          if (found) matchCount++;
        }
        // 🔴 如果匹配数量足够（至少2项，或者只有1项但已全部匹配），视为已购买
        const totalRequired = requiredSet.length;
        const isAllMatched = matchCount >= totalRequired && totalRequired > 0;
        const isMostlyMatched = matchCount >= 2;
        
        if (isAllMatched || isMostlyMatched) {
          // 🔴 不仅临时设置，还要更新数据库
          const db = wx.cloud.database();
          db.collection('shouhou_repair').doc(myPurchasePartsRepair._id).update({
            data: { purchasePartsStatus: 'completed' }
          }).then(() => {
            console.log('✅ [loadMyActivities] 回退检查：已更新数据库 purchasePartsStatus 为 completed');
          }).catch(err => {
            console.error('❌ [loadMyActivities] 回退检查：更新数据库失败', err);
          });
          
          // 🔴 如果已购买，将 myPurchasePartsRepair 设置为 null，避免显示卡片
          myPurchasePartsRepair = null;
          console.log('✅ [loadMyActivities] 回退检查：订单中已有至少 2 项与所需配件一致，视为已购买，已排除卡片', {
            matchCount: matchCount,
            totalRequired: totalRequired,
            isAllMatched: isAllMatched,
            isMostlyMatched: isMostlyMatched,
            requiredParts: requiredSet,
            orderedNames: orderedNames
          });
        } else {
          console.log('ℹ️ [loadMyActivities] 回退检查：订单中配件匹配数量不足', {
            matchCount: matchCount,
            totalRequired: totalRequired,
            requiredParts: requiredSet,
            orderedNames: orderedNames
          });
        }
      }
      
      // 🔴 最终检查：如果 purchasePartsStatus 为 'completed'，确保不显示卡片
      if (myPurchasePartsRepair && myPurchasePartsRepair.purchasePartsStatus === 'completed') {
        console.log('🔍 [loadMyActivities] 最终检查：purchasePartsStatus 为 completed，排除该维修单');
        myPurchasePartsRepair = null;
      }
      // 🔴 用 p5（仅需购买配件）反哺活动列表：同一条维修单在列表中不再显示「工程师审核中」，改为「需要购买配件」或「已购买配件」
      if (myPurchasePartsRepair && myPurchasePartsRepair._id) {
        const pid = myPurchasePartsRepair._id;
        const completed = myPurchasePartsRepair.purchasePartsStatus === 'completed';
        console.log('🔄 [loadMyActivities] 反哺逻辑：查找维修单', pid, 'completed:', completed);
        let found = false;
        filtered.forEach(item => {
          if (item.type === 'repair' && item._id === pid) {
            console.log('✅ [loadMyActivities] 找到匹配的维修单，更新状态:', {
              _id: item._id,
              oldStatusText: item.statusText,
              oldPurchasePartsStatus: item.purchasePartsStatus,
              newStatusText: completed ? '已购配件' : '待购配件',
              myPurchasePartsRepairStatus: myPurchasePartsRepair.purchasePartsStatus
            });
            // 🔴 更新状态文本和样式
            item.statusText = completed ? '已购配件' : '待购配件';
            item.statusClass = completed ? 'success' : 'fail';
            item.statusNum = completed ? 1 : 0;
            // 🔴 同步更新 purchasePartsStatus，确保 WXML 中的判断也能正确工作
            item.purchasePartsStatus = myPurchasePartsRepair.purchasePartsStatus;
            found = true;
          }
        });
        if (!found) {
          console.log('⚠️ [loadMyActivities] 反哺逻辑：未找到匹配的维修单', pid);
        }
      }

      this.setData({ 
        myActivityList: filtered,
        myReturnRequiredRepair: myReturnRequiredRepair,
        myPurchasePartsRepair: myPurchasePartsRepair
      }, () => {
        console.log('✅ [loadMyActivities] 数据已更新到页面，当前 myActivityList 长度:', this.data.myActivityList.length);
        if (myReturnRequiredRepair) {
          console.log('✅ [loadMyActivities] 检测到需寄回维修单:', myReturnRequiredRepair._id);
          console.log('✅ [loadMyActivities] setData 后的 myReturnRequiredRepair:', {
            id: myReturnRequiredRepair._id,
            hasRepairItems: !!myReturnRequiredRepair.repairItems,
            repairItemsLength: myReturnRequiredRepair.repairItems?.length || 0,
            repairItems: myReturnRequiredRepair.repairItems,
            repairTotalPrice: myReturnRequiredRepair.repairTotalPrice,
            repairPaid: myReturnRequiredRepair.repairPaid,
            returnTrackingId: myReturnRequiredRepair.returnTrackingId,
            isAdmin: this.data.isAdmin,
            warrantyExpired: myReturnRequiredRepair.warrantyExpired
          });
          
          // 🔴 计算并输出显示条件
          const hasRepairItems = myReturnRequiredRepair.repairItems && myReturnRequiredRepair.repairItems.length > 0;
          const isUnpaid = myReturnRequiredRepair.repairPaid === false;
          const hasTrackingId = !!myReturnRequiredRepair.returnTrackingId;
          const condition1 = !hasTrackingId;
          const condition2 = hasRepairItems && isUnpaid;
          const shouldShow = !this.data.isAdmin && (condition1 || condition2);
          
          console.log('🔍 [loadMyActivities] 显示条件检查:', {
            isAdmin: this.data.isAdmin,
            hasRepairItems: hasRepairItems,
            isUnpaid: isUnpaid,
            hasTrackingId: hasTrackingId,
            condition1: condition1,
            condition2: condition2,
            shouldShow: shouldShow,
            finalCondition: `!isAdmin(${!this.data.isAdmin}) && (!returnTrackingId(${condition1}) || (hasRepairItems(${hasRepairItems}) && isUnpaid(${isUnpaid})))`
          });
          // 🔴 立即检查一次是否需要自动扣除（不等待定时器）
          this.checkAndAutoDeductWarranty(myReturnRequiredRepair);
          // 🔴 启动倒计时定时器
          this.startCountdownTimer();
        }
        resolve(); // 🔴 Promise 完成
      });
      }).catch(err => {
        console.error('❌ [loadMyActivities] 加载申请记录失败:', err);
        reject(err); // 🔴 Promise 失败
      });
    });
  },

  // 🔴 保留原方法以兼容其他地方的调用
  loadMyActivities() {
    this.loadMyActivitiesPromise().catch(() => {});
  },

  // 🔴 每次进入页面时检测购买配件状态（检查所有需要购买配件的维修单）
  checkPurchasePartsStatusOnPageLoad() {
    if (!this.data.myOpenid) {
      console.log('🔍 [checkPurchasePartsStatus] myOpenid 未获取，跳过检测');
      return Promise.resolve();
    }

    console.log('🔍 [checkPurchasePartsStatus] 开始检测购买配件状态');
    const db = wx.cloud.database();
    const _ = db.command;

    // 1. 查询所有需要购买配件且未完成的维修单
    const p1 = db.collection('shouhou_repair')
      .where({
        _openid: this.data.myOpenid,
        needPurchaseParts: true,
        purchasePartsStatus: _.neq('completed') // 排除已完成的
      })
      .get();

    // 2. 查询用户的已支付订单（使用 or 查询，兼容 status 和 realStatus）
    // 🔴 注意：订单表可能使用 realStatus 字段，需要同时查询 status 和 realStatus 为 PAID 的订单
    const p2 = db.collection('shop_orders')
      .where(_.or([
        { _openid: this.data.myOpenid, status: 'PAID' },
        { _openid: this.data.myOpenid, realStatus: 'PAID' }
      ]))
      .orderBy('createTime', 'desc')
      .limit(50) // 限制查询数量，避免数据过多
      .get();

    // 3. 🔴 查询 shouhouguoqi 集合，判断用户是否已经购买过配件
    const p3 = db.collection('shouhouguoqi')
      .where({
        _openid: this.data.myOpenid,
        hasPurchased: true
      })
      .get();

    return Promise.all([p1, p2, p3]).then(([repairsRes, ordersRes, guoqiRes]) => {
      const repairs = repairsRes.data || [];
      const paidOrders = ordersRes.data || [];
      const guoqiRecords = guoqiRes.data || [];
      const purchasedRepairIds = new Set(guoqiRecords.map(r => r.repairId).filter(id => id));

      console.log('🔍 [checkPurchasePartsStatus] 找到需要检测的维修单:', repairs.length, '条');
      console.log('🔍 [checkPurchasePartsStatus] 找到已支付订单:', paidOrders.length, '条');
      console.log('🔍 [checkPurchasePartsStatus] shouhouguoqi 记录数:', guoqiRecords.length, '已购买配件维修单ID:', Array.from(purchasedRepairIds));

      // 🔴 过滤掉已经在 shouhouguoqi 中有记录的维修单
      const repairsToCheck = repairs.filter(repair => !purchasedRepairIds.has(repair._id));
      
      if (repairsToCheck.length === 0) {
        console.log('🔍 [checkPurchasePartsStatus] 没有需要检测的维修单（已全部在 shouhouguoqi 中）');
        return;
      }

      // 提取已订购的配件名称
      const orderedNames = [];
      paidOrders.forEach((order) => {
        const goodsList = Array.isArray(order.goodsList) ? order.goodsList : [];
        goodsList.forEach((g) => {
          const name = (g && (
            (g.name != null) ? String(g.name).trim() :
            (g.title != null) ? String(g.title).trim() :
            (g.productName != null) ? String(g.productName).trim() :
            ''
          )) || '';
          if (name) orderedNames.push(name);
        });
      });

      console.log('🔍 [checkPurchasePartsStatus] 提取的已订购配件名称:', orderedNames);

      // 对每个维修单进行检测
      const updatePromises = [];
      repairsToCheck.forEach((repair) => {
        const requiredParts = [];
        (repair.purchasePartsList || []).forEach(g => {
          (g.parts || []).forEach(p => {
            const name = typeof p === 'string' ? p : (p && p.name ? p.name : '');
            if (name && name.trim()) requiredParts.push(name.trim());
          });
        });

        if (requiredParts.length === 0) {
          console.log('🔍 [checkPurchasePartsStatus] 维修单', repair._id, '没有所需配件列表');
          return;
        }

        // 计算匹配数量
        let matchCount = 0;
        const requiredSet = [...new Set(requiredParts)];
        for (let i = 0; i < requiredSet.length && matchCount < 2; i++) {
          const r = requiredSet[i];
          const found = orderedNames.some(o => r === o || r.indexOf(o) !== -1 || o.indexOf(r) !== -1);
          if (found) matchCount++;
        }

        const totalRequired = requiredSet.length;
        const isAllMatched = matchCount >= totalRequired && totalRequired > 0;
        const isMostlyMatched = matchCount >= 2;

        if (isAllMatched || isMostlyMatched) {
          console.log('✅ [checkPurchasePartsStatus] 维修单', repair._id, '已购买配件，更新状态', {
            matchCount,
            totalRequired,
            requiredParts: requiredSet,
            orderedNames
          });

          // 更新数据库
          const updatePromise = db.collection('shouhou_repair').doc(repair._id).update({
            data: { purchasePartsStatus: 'completed' }
          }).then(() => {
            console.log('✅ [checkPurchasePartsStatus] 维修单', repair._id, '状态已更新为 completed');
          }).catch(err => {
            console.error('❌ [checkPurchasePartsStatus] 维修单', repair._id, '更新失败:', err);
          });

          updatePromises.push(updatePromise);
        } else {
          console.log('ℹ️ [checkPurchasePartsStatus] 维修单', repair._id, '配件匹配数量不足', {
            matchCount,
            totalRequired,
            requiredParts: requiredSet
          });
        }
      });

      // 等待所有更新完成
      if (updatePromises.length > 0) {
        return Promise.all(updatePromises).then(() => {
          console.log('✅ [checkPurchasePartsStatus] 所有维修单状态检测完成');
          // 检测完成后，重新加载活动列表
          return this.loadMyActivitiesPromise().catch(() => {});
        });
      } else {
        console.log('ℹ️ [checkPurchasePartsStatus] 没有需要更新的维修单');
      }
    }).catch(err => {
      console.error('❌ [checkPurchasePartsStatus] 检测失败:', err);
    });
  },

  // 🔴 检查并自动扣除质保（提取为独立方法，供定时器和页面加载时调用）
  checkAndAutoDeductWarranty(repair) {
    if (!repair || repair.returnStatus === 'PENDING_RETURN' || repair.status !== 'SHIPPED' || repair.returnTrackingId) {
      return;
    }
    
    // 如果已经扣除过，直接返回
    if (repair.warrantyDeducted || repair.isWarrantyDeducted) {
      return;
    }
    
    // 如果正在处理中，避免重复触发
    if (this._autoDeducting) {
      return;
    }
    
    const now = new Date();
    const startTime = repair.solveTime ? new Date(repair.solveTime) : (repair.createTime ? new Date(repair.createTime) : null);
    if (!startTime) {
      return;
    }
    
    const daysDiff = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const isOverdue = daysDiff >= 30;
    
    // 🔴 自动扣除质保：当超时且未扣除过时，自动触发扣除
    if (isOverdue) {
      this._autoDeducting = true;
      console.log('[自动扣除质保] 检测到超时，开始自动扣除质保，repairId:', repair._id, 'daysDiff:', daysDiff);
      
      wx.cloud.callFunction({
        name: 'deductWarrantyForOverdue',
        data: {
          repairId: repair._id,
          force: true,
          reason: '超时未寄'
        }
      }).then((res) => {
        console.log('[自动扣除质保] 扣除成功:', res.result);
        this._autoDeducting = false;
        // 刷新数据，更新扣除状态
        this.loadMyActivitiesPromise().catch(() => {});
      }).catch((err) => {
        console.error('[自动扣除质保] 扣除失败:', err);
        this._autoDeducting = false;
        // 扣除失败不影响倒计时继续运行
      });
    }
  },

  // 🔴 启动倒计时定时器
  startCountdownTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    
    // 🔴 修复：初始化自动扣除标志，避免重复触发
    this._autoDeducting = false;
    
    this.countdownTimer = setInterval(() => {
      const repair = this.data.myReturnRequiredRepair;
      if (repair && repair.returnStatus !== 'PENDING_RETURN' && repair.status === 'SHIPPED' && !repair.returnTrackingId) {
        const now = new Date();
        const startTime = repair.solveTime ? new Date(repair.solveTime) : (repair.createTime ? new Date(repair.createTime) : null);
        if (startTime) {
          const daysDiff = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
          const countdownDays = Math.max(0, 30 - daysDiff);
          const isOverdue = daysDiff >= 30;
          
          this.setData({
            'myReturnRequiredRepair.countdownDays': countdownDays,
            'myReturnRequiredRepair.isOverdue': isOverdue
          });
          
          // 🔴 调用统一的检查方法
          this.checkAndAutoDeductWarranty(repair);
        }
      } else {
        // 如果不符合条件，清除定时器
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }
    }, 1000); // 每秒更新一次
  },

  // 【新增】打开寄回运单号录入
  // 【修改】打开底部弹窗（录入单号/填写地址）
  openReturnAddressModal(e) {
    const repair = this.data.myReturnRequiredRepair;
    
    if (!repair) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }
    
    // 设置当前运单号（如果有）
    this.setData({
      returnTrackingIdInput: repair.returnTrackingId || '',
      showReturnAddressModal: true
    });
    this.updateModalState();
  },
  
  // 关闭底部弹窗
  closeReturnAddressModal() {
    this.setData({
      showReturnAddressModal: false,
      returnTrackingIdInput: '',
      // 🔴 清理用户填写的地址信息，避免残留
      userReturnAddress: { name: '', phone: '', address: '' }
    });
    this.updateModalState();
  },

  // 🔴 关闭管理员填写地址弹窗（带收缩退出动画）
  closeReturnAddressDialog() {
    this.setData({ returnAddressDialogClosing: true });
    setTimeout(() => {
      this.setData({
        showReturnAddressDialog: false,
        // 🔴 清理临时地址数据，避免残留
        tempReturnAddress: { name: '', phone: '', address: '' },
        returnAddressDialogClosing: false
      });
      this.updateModalState();
    }, 420);
  },

  // 🔴 管理员填写地址输入处理
  onReturnAddressInput(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;
    this.setData({
      [`tempReturnAddress.${key}`]: val
    });
  },

  // 🔴 确认管理员填写的地址（如果需要的话，可以在这里添加保存逻辑）
  confirmReturnAddress() {
    // 这里可以添加保存逻辑
    // 暂时只关闭弹窗并清理数据
    this.closeReturnAddressDialog();
  },
  
  // 🔴 智能分析相关方法
  // 1. 打开智能分析弹窗
  openSmartAnalyzeModal() {
    this.setData({
      showSmartAnalyzeModal: true,
      smartAnalyzeVal: '' // 每次打开清空
    });
    this.updateModalState();
  },
  
  // 2. 关闭智能分析弹窗
  closeSmartAnalyzeModal() {
    this.setData({ showSmartAnalyzeModal: false });
    this.updateModalState();
  },
  
  // 3. 监听智能分析输入
  onSmartAnalyzeInput(e) {
    this.setData({ smartAnalyzeVal: e.detail.value });
  },
  
  // 4. 确认智能分析（解析地址并填充到表单）- 使用腾讯地图API精准解析（完整版，复制自 shouhou 页面）
  async confirmSmartAnalyze() {
    const text = this.data.smartAnalyzeVal.trim();
    if (!text) {
      this.showAutoToast('提示', '内容不能为空');
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '智能解析中...',
      mask: true
    });
    
    try {
      // 使用腾讯地图API进行精准解析
      const { parseSmartAddress } = require('../../utils/smartAddressParser.js');
      const result = await parseSmartAddress(text);
      
      // 🔴 调试：打印完整的解析结果
      console.log('[confirmSmartAnalyze] 完整解析结果:', JSON.stringify(result, null, 2));
      console.log('[confirmSmartAnalyze] result.detail:', result.detail);
      console.log('[confirmSmartAnalyze] result.address:', result.address);

      // 构造更新数据
      let updateData = {
        showSmartAnalyzeModal: false
      };

      if (result.name) updateData['userReturnAddress.name'] = result.name;
      if (result.phone) updateData['userReturnAddress.phone'] = result.phone;
      
      // 🔴 修复：如果解析结果中没有省份，但有城市，尝试从城市推断省份
      let finalProvince = result.province;
      if (!finalProvince && result.city) {
        // 常见城市到省份的映射
        const cityToProvince = {
          '东莞市': '广东省', '深圳市': '广东省', '广州市': '广东省', '佛山市': '广东省', '中山市': '广东省',
          '珠海市': '广东省', '惠州市': '广东省', '江门市': '广东省', '肇庆市': '广东省', '汕头市': '广东省',
          '潮州市': '广东省', '揭阳市': '广东省', '汕尾市': '广东省', '湛江市': '广东省', '茂名市': '广东省',
          '阳江市': '广东省', '韶关市': '广东省', '清远市': '广东省', '云浮市': '广东省', '梅州市': '广东省',
          '河源市': '广东省', '北京市': '北京市', '上海市': '上海市', '天津市': '天津市', '重庆市': '重庆市',
          '杭州市': '浙江省', '宁波市': '浙江省', '温州市': '浙江省', '嘉兴市': '浙江省', '湖州市': '浙江省',
          '绍兴市': '浙江省', '金华市': '浙江省', '衢州市': '浙江省', '舟山市': '浙江省', '台州市': '浙江省',
          '丽水市': '浙江省', '南京市': '江苏省', '苏州市': '江苏省', '无锡市': '江苏省', '常州市': '江苏省',
          '镇江市': '江苏省', '扬州市': '江苏省', '泰州市': '江苏省', '南通市': '江苏省', '盐城市': '江苏省',
          '淮安市': '江苏省', '宿迁市': '江苏省', '连云港市': '江苏省', '徐州市': '江苏省', '成都市': '四川省',
          '武汉市': '湖北省', '长沙市': '湖南省', '郑州市': '河南省', '西安市': '陕西省', '济南市': '山东省',
          '青岛市': '山东省', '石家庄市': '河北省', '太原市': '山西省', '沈阳市': '辽宁省', '长春市': '吉林省',
          '哈尔滨市': '黑龙江省', '合肥市': '安徽省', '福州市': '福建省', '厦门市': '福建省', '南昌市': '江西省',
          '南宁市': '广西壮族自治区', '海口市': '海南省', '昆明市': '云南省', '贵阳市': '贵州省', '拉萨市': '西藏自治区',
          '兰州市': '甘肃省', '西宁市': '青海省', '银川市': '宁夏回族自治区', '乌鲁木齐市': '新疆维吾尔自治区',
          '呼和浩特市': '内蒙古自治区'
        };
        
        finalProvince = cityToProvince[result.city] || '';
        if (finalProvince) {
          console.log('[confirmSmartAnalyze] 从城市推断省份:', result.city, '->', finalProvince);
        }
      }
      
      // 🔴 修复：如果还是没有省份，清空之前的选择，让用户手动选择
      if (!finalProvince) {
        updateData['provinceIndex'] = -1;
        updateData['selectedProvince'] = '';
        updateData['cityList'] = [];
        updateData['districtList'] = [];
        updateData['cityIndex'] = -1;
        updateData['districtIndex'] = -1;
        updateData['selectedCity'] = '';
        updateData['selectedDistrict'] = '';
        console.log('[confirmSmartAnalyze] ⚠️ 无法确定省份，已清空省市区选择，请用户手动选择');
      } else if (finalProvince) {
        // 尝试匹配省份
        const provinceName = finalProvince.replace('省', '').replace('市', '').replace('自治区', '').replace('特别行政区', '');
        const provinceIndex = this.data.provinceList.findIndex(p => {
          const pName = p.name.replace('省', '').replace('自治区', '').replace('市', '').replace('特别行政区', '');
          return p.name === finalProvince || 
                 p.name.includes(provinceName) || 
                 provinceName.includes(pName) ||
                 pName === provinceName;
        });
        
        if (provinceIndex !== -1) {
          updateData['provinceIndex'] = provinceIndex;
          updateData['selectedProvince'] = this.data.provinceList[provinceIndex].name;
          // 🔴 修复：先清空城市和区县，然后立即加载并匹配
          updateData['cityList'] = [];
          updateData['districtList'] = [];
          updateData['cityIndex'] = -1;
          updateData['districtIndex'] = -1;
          updateData['selectedCity'] = '';
          updateData['selectedDistrict'] = '';
          
          // 🔴 修复：先设置详细地址，然后再执行 setData
          // 详细地址只填充详细部分（优先使用detail字段）
          if (result.detail && result.detail.trim()) {
            console.log('[confirmSmartAnalyze] 使用result.detail填充详细地址:', result.detail);
            updateData['userReturnAddress.address'] = result.detail.trim();
          } else if (result.address && result.address.trim()) {
            // 如果没有detail，从address中移除省市区
            console.log('[confirmSmartAnalyze] 从result.address提取详细地址:', result.address);
            let detail = result.address;
            if (result.province) detail = detail.replace(result.province, '').trim();
            if (result.city) detail = detail.replace(result.city, '').trim();
            if (result.district) detail = detail.replace(result.district, '').trim();
            updateData['userReturnAddress.address'] = detail.trim() || result.address.trim();
            console.log('[confirmSmartAnalyze] 提取后的详细地址:', updateData['userReturnAddress.address']);
          }
          
          // 🔴 修复：先执行 setData，然后立即加载城市列表（异步，但会在加载完成后自动匹配）
          this.setData(updateData, () => {
            console.log('[confirmSmartAnalyze] ✅ setData完成，详细地址已更新:', this.data.userReturnAddress.address);
            // 在 setData 回调中加载城市列表，确保数据已更新
            if (this.data.provinceList[provinceIndex].id) {
              this.loadCityListForSmartAnalyze(this.data.provinceList[provinceIndex].id, result.city, result.district);
            }
          });
          
          // 🔴 修复：不在这里继续执行，等待 loadCityListForSmartAnalyze 完成
          wx.hideLoading();
        this.showAutoToast('提示', '解析完成');
          return;
      } else {
          // 如果找不到匹配的省份，清空选择
          updateData['provinceIndex'] = -1;
          updateData['selectedProvince'] = '';
          updateData['cityList'] = [];
          updateData['districtList'] = [];
          updateData['cityIndex'] = -1;
          updateData['districtIndex'] = -1;
          updateData['selectedCity'] = '';
          updateData['selectedDistrict'] = '';
          console.log('[confirmSmartAnalyze] ⚠️ 无法匹配省份:', finalProvince);
        }
      }
      
      // 🔴 修复：详细地址只填充详细部分（优先使用detail字段）
      if (result.detail && result.detail.trim()) {
        console.log('[confirmSmartAnalyze] 使用result.detail填充详细地址:', result.detail);
        updateData['userReturnAddress.address'] = result.detail.trim();
      } else if (result.address && result.address.trim()) {
        // 如果没有detail，从address中移除省市区
        console.log('[confirmSmartAnalyze] 从result.address提取详细地址:', result.address);
        let detail = result.address;
        if (result.province) detail = detail.replace(result.province, '').trim();
        if (result.city) detail = detail.replace(result.city, '').trim();
        if (result.district) detail = detail.replace(result.district, '').trim();
        updateData['userReturnAddress.address'] = detail.trim() || result.address.trim();
        console.log('[confirmSmartAnalyze] 提取后的详细地址:', updateData['userReturnAddress.address']);
      } else {
        console.log('[confirmSmartAnalyze] ⚠️ 没有找到详细地址，result.detail和result.address都为空');
      }

      this.setData(updateData);
      
      wx.hideLoading();
      
      if (result.name || result.phone || updateData['userReturnAddress.address']) {
        this.showAutoToast('提示', '解析完成');
        } else {
          this.showAutoToast('提示', '未能解析出有效信息，请手动填写');
        }
    } catch (error) {
      console.error('[my] 智能地址解析失败:', error);
        wx.hideLoading();
      
      // 失败时使用本地解析作为备用方案
      const result = this.parseSmartAddress(text);
      let updateData = {
          showSmartAnalyzeModal: false
      };
      if (result.name) updateData['userReturnAddress.name'] = result.name;
      if (result.phone) updateData['userReturnAddress.phone'] = result.phone;
      if (result.address) {
        updateData['userReturnAddress.address'] = result.address;
      }
      this.setData(updateData);
      this.showAutoToast('提示', '解析完成（使用备用方案）');
    }
  },
  
  // 5. 智能解析地址（解析姓名、电话、地址）- 更精准版本
  parseSmartAddress(text) {
    if (!text || !text.trim()) {
      return { name: '', phone: '', address: '' };
    }
    
    let name = '';
    let phone = '';
    let address = '';
    
    // 保存原始文本用于后续分析
    const originalText = text;
    
    // 🔴 改进1：更精准的电话提取（支持多种格式）
    // 1.1 提取手机号（支持多种格式：13800138000、138-0013-8000、138 0013 8000、138.0013.8000）
    const phonePatterns = [
      /1[3-9]\d[\s\-\.]?\d{4}[\s\-\.]?\d{4}/g,  // 带分隔符的
      /\b1[3-9]\d{9}\b/g,                        // 标准11位
      /\+?86[\s\-]?1[3-9]\d{9}/g,               // 带国家码
    ];
    
    for (const pattern of phonePatterns) {
      const matches = originalText.match(pattern);
      if (matches && matches.length > 0) {
        // 取第一个匹配的电话，移除所有非数字字符
        phone = matches[0].replace(/[\s\-\.\+86]/g, '');
        if (phone.length === 11 && phone.startsWith('1') && /^1[3-9]\d{9}$/.test(phone)) {
          break;
        }
      }
    }
    
    // 1.2 提取固定电话（支持多种格式）
    if (!phone) {
      const telPatterns = [
        /0\d{2,3}[\s\-]?\d{7,8}/g,              // 标准格式
        /\(0\d{2,3}\)[\s\-]?\d{7,8}/g,          // 带括号
      ];
      
      for (const pattern of telPatterns) {
        const matches = originalText.match(pattern);
        if (matches && matches.length > 0) {
          phone = matches[0].replace(/[\s\-\(\)]/g, '');
          break;
        }
      }
    }
    
    // 🔴 改进2：更精准的姓名提取（支持更多位置和格式）
    const addressKeywords = ['省', '市', '区', '县', '镇', '街道', '路', '街', '道', '号', '室', '楼', '苑', '村', '组', '栋', '单元', '层', '房', '门', '座', '广场', '大厦', '中心', '花园', '小区'];
    const commonSurnames = ['欧阳', '太史', '端木', '上官', '司马', '东方', '独孤', '南宫', '万俟', '闻人', '夏侯', '诸葛', '尉迟', '公羊', '赫连', '澹台', '皇甫', '宗政', '濮阳', '公冶', '太叔', '申屠', '公孙', '慕容', '仲孙', '钟离', '长孙', '宇文', '司徒', '鲜于', '司空', '闾丘', '子车', '亓官', '司寇', '巫马', '公西', '颛孙', '壤驷', '公良', '漆雕', '乐正', '宰父', '谷梁', '拓跋', '夹谷', '轩辕', '令狐', '段干', '百里', '呼延', '东郭', '南门', '羊舌', '微生', '公户', '公玉', '公仪', '梁丘', '公仲', '公上', '公门', '公山', '公坚', '左丘', '公伯', '西门', '公祖', '第五', '公乘', '贯丘', '公皙', '南荣', '东里', '东宫', '仲长', '子书', '子桑', '即墨', '达奚', '褚师'];
    
    // 2.1 从标签后提取姓名（如"收件人：张三"）
    const labelPatterns = [
      /(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]+([\u4e00-\u9fa5]{2,5})/i,
      /([\u4e00-\u9fa5]{2,5})[:：\s]*(?:收件人|收货人|姓名|联系人)/i,
    ];
    
    for (const pattern of labelPatterns) {
      const match = originalText.match(pattern);
      if (match) {
        const candidateName = match[1];
        const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
        if (!hasAddressKeyword && candidateName.length >= 2 && candidateName.length <= 5) {
          name = candidateName;
          break;
        }
      }
    }
    
    // 2.2 从电话前后提取姓名
    if (!name && phone) {
      const phoneInText = originalText.replace(/[\s\-\.]/g, '').indexOf(phone);
      if (phoneInText !== -1) {
        // 提取电话前的2-5个汉字
        const beforePhone = originalText.substring(0, phoneInText).trim();
        const nameBeforeMatch = beforePhone.match(/([\u4e00-\u9fa5]{2,5})\s*$/);
        if (nameBeforeMatch) {
          const candidateName = nameBeforeMatch[1];
          const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
          if (!hasAddressKeyword) {
            name = candidateName;
          }
        }
        
        // 如果还没找到，提取电话后的2-5个汉字（但要排除地址关键词）
        if (!name) {
          const afterPhone = originalText.substring(phoneInText + phone.length).trim();
          const nameAfterMatch = afterPhone.match(/^\s*([\u4e00-\u9fa5]{2,5})/);
          if (nameAfterMatch) {
            const candidateName = nameAfterMatch[1];
            const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
            // 检查是否是复姓
            const isCompoundSurname = commonSurnames.some(surname => candidateName.startsWith(surname));
            if (!hasAddressKeyword && (candidateName.length <= 4 || isCompoundSurname)) {
              name = candidateName;
            }
          }
        }
      }
    }
    
    // 2.3 从文本开头提取姓名（如果还没找到）
    if (!name) {
      let cleanText = originalText
      .replace(/收件人[:：]?|收货人[:：]?|姓名[:：]?|联系人[:：]?|联系电话[:：]?|电话[:：]?|手机[:：]?|地址[:：]?|详细地址[:：]?|收件地址[:：]?|收货地址[:：]?/g, ' ')
      .replace(/号码[:：]?|编号[:：]?|单号[:：]?|订单号[:：]?|运单号[:：]?/g, ' ')
      .replace(/[()（）【】\[\]<>《》""''""''、，。；：！？]/g, ' ')
        .replace(/\d+/g, ' ')  // 移除所有数字
      .replace(/\s+/g, ' ')
      .trim();
    
      const namePattern = /^([\u4e00-\u9fa5]{2,5})/;
    const nameMatch = cleanText.match(namePattern);
    if (nameMatch) {
      const candidateName = nameMatch[1];
      const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
        const isCompoundSurname = commonSurnames.some(surname => candidateName.startsWith(surname));
        if (!hasAddressKeyword && (candidateName.length <= 4 || isCompoundSurname)) {
        name = candidateName;
        }
      }
    }
    
    // 🔴 改进3：更精准的地址提取（保留更多地址信息）
    let addressText = originalText;
    
    // 🔴 优化：先移除标签和分隔符，再移除姓名和电话（避免误删地址信息）
    // 第一步：移除明显的标签和分隔符
    addressText = addressText
      .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
      .replace(/(?:联系电话|电话|手机|号码)[:：\s]*/gi, ' ')
      .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
      .replace(/[()（）【】\[\]<>《》""''""'']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 第二步：移除已提取的姓名（只移除完全匹配的，避免误删地址中的相同字）
    if (name && name.length >= 2) {
      // 只在姓名前后有空格或标点时移除，避免误删地址中的字
      const namePattern = new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'g');
      addressText = addressText.replace(namePattern, ' ').trim();
    }
    
    // 第三步：移除电话号码（保留地址中的数字，只移除11位手机号）
    if (phone) {
      // 移除所有格式的手机号
      addressText = addressText.replace(new RegExp(phone.replace(/(\d)/g, '\\$1'), 'g'), ' ');
      addressText = addressText.replace(/1[3-9]\d[\s\-\.]?\d{4}[\s\-\.]?\d{4}/g, ' ');
      addressText = addressText.replace(/\+?86[\s\-]?1[3-9]\d{9}/g, ' ');
    }
    
    // 第四步：最后清理（只移除明显的无用词汇，保留地址信息）
    addressText = addressText
      .replace(/(?:号码|编号|单号|订单号|运单号)[:：\s]*/g, ' ')
      .replace(/[、，。；：！？]/g, ' ')  // 只移除标点，保留地址中的分隔符
      .replace(/\s+/g, ' ')
      .trim();
    
    address = addressText;
    
    return { name: name.trim(), phone: phone.trim(), address: address.trim() };
  },
  
  // 运单号输入
  onReturnTrackingIdInput(e) {
    this.setData({
      returnTrackingIdInput: e.detail.value
    });
  },
  
  // 🔴 省市区选择器相关函数（复制自 shouhou 页面）
  loadProvinceList() {
    // 🔴 优化：先检查缓存，避免频繁调用API
    const cachedProvinceList = wx.getStorageSync('province_list');
    const cacheTime = wx.getStorageSync('province_list_time') || 0;
    const now = Date.now();
    const cacheValidTime = 24 * 60 * 60 * 1000; // 24小时有效期
    
    // 如果缓存存在且未过期，直接使用
    if (cachedProvinceList && cachedProvinceList.length > 0 && (now - cacheTime) < cacheValidTime) {
      console.log('[my] 使用缓存的省份列表（未过期）');
      this.setData({
        provinceList: cachedProvinceList
      });
      return;
    }
    
    // 如果缓存过期，清除旧缓存
    if (cachedProvinceList && (now - cacheTime) >= cacheValidTime) {
      console.log('[my] 省份列表缓存已过期，重新加载');
      wx.removeStorageSync('province_list');
      wx.removeStorageSync('province_list_time');
    }
    
    // 🔴 修复：如果API配额用完，直接使用本地数据，不调用API
    // 先尝试使用默认省份列表（不依赖API）
    console.log('[my] 使用本地省份列表（避免API配额限制）');
    this.setDefaultProvinceList();
  },
  
  // [新增] 默认省份列表（备用方案，不依赖API）
  setDefaultProvinceList() {
    const defaultProvinces = [
      { name: '北京市', id: '110000' },
      { name: '天津市', id: '120000' },
      { name: '河北省', id: '130000' },
      { name: '山西省', id: '140000' },
      { name: '内蒙古自治区', id: '150000' },
      { name: '辽宁省', id: '210000' },
      { name: '吉林省', id: '220000' },
      { name: '黑龙江省', id: '230000' },
      { name: '上海市', id: '310000' },
      { name: '江苏省', id: '320000' },
      { name: '浙江省', id: '330000' },
      { name: '安徽省', id: '340000' },
      { name: '福建省', id: '350000' },
      { name: '江西省', id: '360000' },
      { name: '山东省', id: '370000' },
      { name: '河南省', id: '410000' },
      { name: '湖北省', id: '420000' },
      { name: '湖南省', id: '430000' },
      { name: '广东省', id: '440000' },
      { name: '广西壮族自治区', id: '450000' },
      { name: '海南省', id: '460000' },
      { name: '重庆市', id: '500000' },
      { name: '四川省', id: '510000' },
      { name: '贵州省', id: '520000' },
      { name: '云南省', id: '530000' },
      { name: '西藏自治区', id: '540000' },
      { name: '陕西省', id: '610000' },
      { name: '甘肃省', id: '620000' },
      { name: '青海省', id: '630000' },
      { name: '宁夏回族自治区', id: '640000' },
      { name: '新疆维吾尔自治区', id: '650000' }
    ];
    
    // 保存到缓存
    wx.setStorageSync('province_list', defaultProvinces);
    
    this.setData({
      provinceList: defaultProvinces
    });
    console.log('[my] 使用默认省份列表（不依赖API）');
  },
  
  // [新增] 省份选择变化
  onProvinceChange(e) {
    const index = parseInt(e.detail.value);
    const province = this.data.provinceList[index];
    
    if (!province) return;
    
    this.setData({
      provinceIndex: index,
      selectedProvince: province.name,
      selectedCity: '',
      selectedDistrict: '',
      cityList: [],
      districtList: [],
      cityIndex: -1,
      districtIndex: -1
    });
    
    // 加载该省份下的城市列表
    if (province.id) {
      this.loadCityList(province.id);
    }
  },
  
  // [新增] 加载城市列表
  loadCityList(provinceId) {
    // 🔴 优化：先检查缓存
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
      console.log('[my] 使用缓存的城市列表');
      this.setData({
        cityList: cachedCityList
      });
      return;
    }
    
    // 🔴 修复：使用 getCityList 获取所有城市，然后筛选出该省份的城市
    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          // result[1] 是所有城市列表
          const allCities = res.result[1] || [];
          
          // 🔴 筛选出属于该省份的城市（通过城市ID的前2位匹配省份ID的前2位）
          const provincePrefix = provinceId.substring(0, 2);
          const cityList = allCities
            .filter(c => {
              const cityId = (c.id || '').toString();
              return cityId.substring(0, 2) === provincePrefix;
            })
            .map(c => ({
              id: c.id,
              name: c.fullname || c.name
            }));
          
          // 保存到缓存
          wx.setStorageSync(cacheKey, cityList);
          
          this.setData({
            cityList: cityList
          });
          console.log('[my] 城市列表加载成功:', cityList.length, '个城市');
        } else {
          // 如果 getCityList 失败，尝试使用 getDistrictByCityId（备用方案）
          qqmapsdkDistrict.getDistrictByCityId({
            id: provinceId,
            success: (res2) => {
              if (res2.status === 0 && res2.result && res2.result.length > 0) {
                const cities = res2.result[0] || [];
                const cityList = cities.map(c => ({
                  id: c.id,
                  name: c.fullname || c.name
                }));
                
                // 保存到缓存
                wx.setStorageSync(cacheKey, cityList);
                
                this.setData({
                  cityList: cityList
                });
                console.log('[my] 城市列表加载成功（备用方案）:', cityList.length, '个城市');
              }
            },
            fail: (err) => {
              console.error('[my] 加载城市列表失败:', err);
            }
          });
        }
      },
      fail: (err) => {
        console.error('[my] getCityList 失败，尝试备用方案:', err);
        // 备用方案：使用 getDistrictByCityId
        qqmapsdkDistrict.getDistrictByCityId({
          id: provinceId,
          success: (res2) => {
            if (res2.status === 0 && res2.result && res2.result.length > 0) {
              const cities = res2.result[0] || [];
              const cityList = cities.map(c => ({
                id: c.id,
                name: c.fullname || c.name
              }));
              
              // 保存到缓存
              wx.setStorageSync(cacheKey, cityList);
              
              this.setData({
                cityList: cityList
              });
              console.log('[my] 城市列表加载成功（备用方案）:', cityList.length, '个城市');
            }
          },
          fail: (err2) => {
            console.error('[my] 加载城市列表失败:', err2);
          }
        });
      }
    });
  },
  
  // [新增] 为智能分析加载城市列表（并自动匹配城市和区县）
  loadCityListForSmartAnalyze(provinceId, targetCity, targetDistrict) {
    // 🔴 优化：先检查缓存
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
      console.log('[my] 使用缓存的城市列表（智能分析）');
      this.setData({
        cityList: cachedCityList
      });
      
      // 🔴 优化：尝试匹配城市（改进匹配逻辑，提高准确度）
      if (targetCity) {
        console.log('[my] 开始匹配城市，目标城市:', targetCity, '城市列表长度:', cachedCityList.length);
        
        // 方法1：精确匹配（包含"市"字）
        let cityIndex = cachedCityList.findIndex(c => c.name === targetCity);
        
        // 方法2：去除"市"字后匹配
        if (cityIndex === -1) {
          const cityName = targetCity.replace('市', '').replace('自治州', '').replace('地区', '');
          cityIndex = cachedCityList.findIndex(c => {
            const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
            return cName === cityName;
          });
        }
        
        // 方法3：包含匹配（更宽松）
        if (cityIndex === -1) {
          const cityName = targetCity.replace('市', '');
          cityIndex = cachedCityList.findIndex(c => {
            return c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''));
          });
        }
        
        if (cityIndex !== -1) {
          console.log('[my] ✅ 城市匹配成功，索引:', cityIndex, '城市名:', cachedCityList[cityIndex].name);
          wx.nextTick(() => {
            this.setData({
              cityIndex: cityIndex,
              selectedCity: cachedCityList[cityIndex].name
            }, () => {
              console.log('[my] ✅ 城市数据已更新到UI（缓存）');
              
              // 加载区县列表
              if (cachedCityList[cityIndex].id && targetDistrict) {
                this.loadDistrictListForSmartAnalyze(cachedCityList[cityIndex].id, targetDistrict);
              }
            });
          });
        } else {
          console.log('[my] ⚠️ 城市匹配失败，目标城市:', targetCity);
          this.setData({
            selectedCity: targetCity
          });
        }
      }
      return;
    }
    
    // 🔴 修复：使用 getCityList 获取所有城市，然后筛选出该省份的城市
    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          const allCities = res.result[1] || [];
          const provincePrefix = provinceId.substring(0, 2);
          const cityList = allCities
            .filter(c => {
              const cityId = (c.id || '').toString();
              return cityId.substring(0, 2) === provincePrefix;
            })
            .map(c => ({
              id: c.id,
              name: c.fullname || c.name
            }));
          
          wx.setStorageSync(cacheKey, cityList);
          
          this.setData({
            cityList: cityList
          });
          
          // 🔴 优化：尝试匹配城市
          if (targetCity) {
            let cityIndex = cityList.findIndex(c => c.name === targetCity);
            if (cityIndex === -1) {
              const cityName = targetCity.replace('市', '').replace('自治州', '').replace('地区', '');
              cityIndex = cityList.findIndex(c => {
                const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
                return cName === cityName;
              });
            }
            if (cityIndex === -1) {
              const cityName = targetCity.replace('市', '');
              cityIndex = cityList.findIndex(c => {
                return c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''));
              });
            }
            
            if (cityIndex !== -1) {
              wx.nextTick(() => {
                this.setData({
                  cityIndex: cityIndex,
                  selectedCity: cityList[cityIndex].name
                }, () => {
                  if (cityList[cityIndex].id && targetDistrict) {
                    this.loadDistrictListForSmartAnalyze(cityList[cityIndex].id, targetDistrict);
                  }
                });
              });
            } else {
              this.setData({
                selectedCity: targetCity
              });
            }
          }
        }
      },
      fail: (err) => {
        console.error('[my] getCityList 失败:', err);
      }
    });
  },
  
  // [新增] 为智能分析加载区县列表（并自动匹配区县）
  loadDistrictListForSmartAnalyze(cityId, targetDistrict) {
    qqmapsdkDistrict.getDistrictByCityId({
      id: cityId,
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 0) {
          const districts = res.result[0] || [];
          const districtList = districts.map(d => ({
            id: d.id,
            name: d.fullname || d.name
          }));
          
          this.setData({
            districtList: districtList
          });
          
          // 尝试匹配区县
          if (targetDistrict) {
            const districtName = targetDistrict.replace('区', '').replace('县', '').replace('镇', '').replace('街道', '');
            const districtIndex = districtList.findIndex(d => {
              const dName = d.name.replace('区', '').replace('县', '').replace('自治县', '').replace('市辖区', '');
              return d.name === targetDistrict || 
                     d.name.includes(districtName) || 
                     districtName.includes(dName) ||
                     dName === districtName;
            });
            
            if (districtIndex !== -1) {
              this.setData({
                districtIndex: districtIndex,
                selectedDistrict: districtList[districtIndex].name
              });
            } else {
              this.setData({
                selectedDistrict: targetDistrict
              });
            }
          }
        }
      },
      fail: (err) => {
        console.error('[my] 加载区县列表失败:', err);
        if (targetDistrict) {
          this.setData({
            selectedDistrict: targetDistrict,
            districtList: []
          });
        }
      }
    });
  },
  
  // [新增] 城市选择变化
  onCityChange(e) {
    const index = parseInt(e.detail.value);
    const city = this.data.cityList[index];
    
    if (!city) return;
    
    this.setData({
      cityIndex: index,
      selectedCity: city.name,
      selectedDistrict: '',
      districtList: [],
      districtIndex: -1
    });
    
    // 加载该城市下的区县列表
    if (city.id) {
      this.loadDistrictList(city.id);
    }
  },
  
  // [新增] 加载区县列表
  loadDistrictList(cityId) {
    // 🔴 优化：先检查缓存
    const cacheKey = `district_list_${cityId}`;
    const cachedDistrictList = wx.getStorageSync(cacheKey);
    if (cachedDistrictList && cachedDistrictList.length > 0) {
      console.log('[my] 使用缓存的区县列表');
      this.setData({
        districtList: cachedDistrictList
      });
      return;
    }
    
    // 🔴 使用专门的行政区划子key来获取区县列表
    qqmapsdkDistrict.getDistrictByCityId({
      id: cityId,
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 0) {
          const districts = res.result[0] || [];
          const districtList = districts.map(d => ({
            id: d.id,
            name: d.fullname || d.name
          }));
          
          // 保存到缓存
          wx.setStorageSync(cacheKey, districtList);
          
          this.setData({
            districtList: districtList
          });
          console.log('[my] 区县列表加载成功:', districtList.length, '个区县');
        }
      },
      fail: (err) => {
        console.error('[my] 加载区县列表失败:', err);
        this.setData({
          districtList: []
        });
      }
    });
  },
  
  // [新增] 区县选择变化
  onDistrictChange(e) {
    const index = parseInt(e.detail.value);
    const district = this.data.districtList[index];
    
    if (!district) return;
    
    this.setData({
      districtIndex: index,
      selectedDistrict: district.name
    });
  },
  
  // 🔴 计算昵称字体大小（根据昵称长度动态调整）
  calculateNameFontSize(name, defaultSize) {
    if (!name) return defaultSize;
    
    const length = name.length;
    let fontSize = defaultSize;
    
    // 根据长度调整字体大小
    if (length <= 4) {
      fontSize = defaultSize; // 4个字以内，使用默认大小
    } else if (length <= 6) {
      fontSize = defaultSize * 0.85; // 5-6个字，缩小到85%
    } else if (length <= 8) {
      fontSize = defaultSize * 0.7; // 7-8个字，缩小到70%
    } else if (length <= 10) {
      fontSize = defaultSize * 0.6; // 9-10个字，缩小到60%
    } else {
      fontSize = defaultSize * 0.5; // 10个字以上，缩小到50%
    }
    
    // 确保最小字体大小（至少24rpx）
    return Math.max(fontSize, 24);
  },

  // 【新增】提交寄回运单号（保留原来的逻辑，支持可选回调）
  submitReturnTrackingId(id, trackingId, onSuccessCallback) {
    this.showMyLoading('提交中...');
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(id).update({
      data: {
        returnTrackingId: trackingId,
        returnTrackingTime: db.serverDate(),
        returnStatus: 'USER_SENT', // 用户已寄出
        status: 'USER_SENT' // 更新主状态
      }
    }).then(() => {
      this.hideMyLoading();
      this.showMyDialog({
        title: '提交成功',
        content: '运单号已录入，管理员可查看物流信息',
        showCancel: false,
        confirmText: '好的',
        success: () => {
          // 如果有回调函数，执行回调（比如关闭弹窗）
          if (onSuccessCallback && typeof onSuccessCallback === 'function') {
            onSuccessCallback();
          }
          // 刷新数据
          this.loadMyActivitiesPromise().catch(() => {});
        }
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error('提交失败:', err);
      this.showMyDialog({
        title: '提交失败',
        content: err.errMsg || '请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },
  
  // 【新增】在弹窗中提交运单号（调用原来的逻辑）
  submitReturnTrackingIdInModal() {
    const { returnTrackingIdInput, myReturnRequiredRepair } = this.data;
    
    if (!myReturnRequiredRepair || !myReturnRequiredRepair._id) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }
    
    const trackingId = returnTrackingIdInput.trim();
    if (!trackingId) {
      this.showAutoToast('提示', '请输入运单号');
      return;
    }
    
    // 🔴 检查是否超时，如果超时则自动扣除质保
    const repair = myReturnRequiredRepair;
    const now = new Date();
    const solveTime = repair.solveTime ? new Date(repair.solveTime) : (repair.createTime ? new Date(repair.createTime) : null);
    
    if (solveTime) {
      const daysDiff = Math.floor((now - solveTime) / (1000 * 60 * 60 * 24));
      // 🔴 修复：改为 >= 30，与倒计时显示逻辑一致（刚好30天也应该扣除）
      if (daysDiff >= 30 && !repair.warrantyDeducted && !repair.isWarrantyDeducted) {
        // 超时了，自动扣除质保
        wx.cloud.callFunction({
          name: 'deductWarrantyForOverdue',
          data: {
            repairId: repair._id,
            force: true,
            reason: '超时' // 超时原因
          }
        }).then(() => {
          // 扣除质保后，继续提交运单号
          this.submitReturnTrackingId(myReturnRequiredRepair._id, trackingId, () => {
            // 提交成功后的回调：关闭弹窗
            this.setData({
              showReturnAddressModal: false,
              returnTrackingIdInput: ''
            });
          });
        }).catch(err => {
          console.error('自动扣除质保失败:', err);
          // 即使扣除失败，也继续提交运单号
          this.submitReturnTrackingId(myReturnRequiredRepair._id, trackingId, () => {
            this.setData({
              showReturnAddressModal: false,
              returnTrackingIdInput: ''
            });
          });
        });
        return;
      }
    }
    
    // 🔴 调用原来的 submitReturnTrackingId 函数（保留原来的逻辑）
    this.submitReturnTrackingId(myReturnRequiredRepair._id, trackingId, () => {
      // 提交成功后的回调：关闭弹窗
      this.setData({
        showReturnAddressModal: false,
        returnTrackingIdInput: ''
      });
    });
  },
  
  // 【新增】统一提交地址和运单号
  submitAddressAndTrackingId() {
    const { userReturnAddress, returnTrackingIdInput, myReturnRequiredRepair, selectedProvince, selectedCity, selectedDistrict } = this.data;
    
    if (!myReturnRequiredRepair || !myReturnRequiredRepair._id) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }
    
    const repair = myReturnRequiredRepair;
    // 🔴 场景A：管理员录单备件寄出，只需要运单号；场景B：管理员手动标记，需要地址和运单号
    const isAdminMarkedReturn = repair.returnStatus === 'PENDING_RETURN';
    const needsAddress = isAdminMarkedReturn && !repair.returnAddress;
    const trackingId = returnTrackingIdInput.trim();
    const needsTrackingId = !repair.returnTrackingId && trackingId;
    
    // 🔴 场景B：管理员手动标记，需要地址和运单号
    if (isAdminMarkedReturn) {
      // 检查地址是否完整
      if (needsAddress) {
        if (!userReturnAddress.name || !userReturnAddress.name.trim()) {
          this.showAutoToast('提示', '请填写收件人姓名');
          return;
        }
        if (!userReturnAddress.phone || !userReturnAddress.phone.trim()) {
          this.showAutoToast('提示', '请填写收件人手机号');
          return;
        }
        if (!/^1[3-9]\d{9}$/.test(userReturnAddress.phone)) {
          this.showAutoToast('提示', '请输入正确的11位手机号');
          return;
        }
        // 🔴 修改：检查省市区选择器，而不是详细地址
        if (!selectedProvince || !selectedProvince.trim()) {
          this.showAutoToast('提示', '请选择省份');
          return;
        }
        if (!selectedCity || !selectedCity.trim()) {
          this.showAutoToast('提示', '请选择城市');
          return;
        }
        if (!selectedDistrict || !selectedDistrict.trim()) {
          this.showAutoToast('提示', '请选择区县');
          return;
        }
        if (!userReturnAddress.address || !userReturnAddress.address.trim()) {
          this.showAutoToast('提示', '请填写详细地址');
          return;
        }
      }
      if (!trackingId) {
        this.showAutoToast('提示', '请输入运单号');
        return;
      }
    } else {
      // 场景A：管理员录单备件寄出，只需要运单号
      // 如果既没有地址也没有运单号，提示至少填写一项
      if (needsAddress && !needsTrackingId) {
        // 检查地址是否完整
        if (!userReturnAddress.name || !userReturnAddress.name.trim()) {
          this.showAutoToast('提示', '请填写收件人姓名');
          return;
        }
        if (!userReturnAddress.phone || !userReturnAddress.phone.trim()) {
          this.showAutoToast('提示', '请填写收件人手机号');
          return;
        }
        if (!/^1[3-9]\d{9}$/.test(userReturnAddress.phone)) {
          this.showAutoToast('提示', '请输入正确的11位手机号');
          return;
        }
        // 🔴 修改：检查省市区选择器，而不是详细地址
        if (!selectedProvince || !selectedProvince.trim()) {
          this.showAutoToast('提示', '请选择省份');
          return;
        }
        if (!selectedCity || !selectedCity.trim()) {
          this.showAutoToast('提示', '请选择城市');
          return;
        }
        if (!selectedDistrict || !selectedDistrict.trim()) {
          this.showAutoToast('提示', '请选择区县');
          return;
        }
        if (!userReturnAddress.address || !userReturnAddress.address.trim()) {
          this.showAutoToast('提示', '请填写详细地址');
          return;
        }
      }
      
      if (!needsAddress && !needsTrackingId) {
        this.showAutoToast('提示', '请至少填写地址或运单号');
        return;
      }
      
      if (needsTrackingId && !trackingId) {
        this.showAutoToast('提示', '请输入运单号');
        return;
      }
    }
    
    // 先提交地址（如果需要），然后提交运单号（如果需要）
    this.showMyLoading('提交中...');
    const db = wx.cloud.database();
    
    // 构建更新数据
    const updateData = {};
    
    // 如果需要更新地址
    if (needsAddress) {
      // 🔴 修改：使用省市区选择器的值组合完整地址，而不是解析详细地址
      const addressParts = [];
      if (selectedProvince) addressParts.push(selectedProvince);
      if (selectedCity) addressParts.push(selectedCity);
      if (selectedDistrict) addressParts.push(selectedDistrict);
      if (userReturnAddress.address && userReturnAddress.address.trim()) {
        addressParts.push(userReturnAddress.address.trim());
      }
      const fullAddress = addressParts.join(' ');
      
      updateData.returnAddress = {
        name: userReturnAddress.name.trim(),
        phone: userReturnAddress.phone.trim(),
        address: fullAddress
      };
    }
    
    // 如果需要更新运单号
    if (needsTrackingId) {
      updateData.returnTrackingId = trackingId;
      updateData.returnTrackingTime = db.serverDate();
      // 🔴 场景B：保持 returnStatus 为 'PENDING_RETURN'，只更新 status
      if (isAdminMarkedReturn) {
        // 场景B：保持 returnStatus: 'PENDING_RETURN'，只更新 status
        updateData.status = 'USER_SENT';
      } else {
        // 场景A：更新 returnStatus 和 status
        updateData.returnStatus = 'USER_SENT';
        updateData.status = 'USER_SENT';
      }
    }
    
    // 执行更新
    db.collection('shouhou_repair').doc(repair._id).update({
      data: updateData
    }).then(() => {
      this.hideMyLoading();
      
      let successMsg = '';
      if (needsAddress && needsTrackingId) {
        successMsg = '地址和运单号已提交成功';
      } else if (needsAddress) {
        successMsg = '地址信息已保存\n管理员修好后将按此地址寄回';
      } else {
        successMsg = '运单号已录入，管理员可查看物流信息';
      }
      
      // 显示成功提示，在用户点击确认后关闭弹窗并刷新数据
      this.showMyDialog({
        title: '提交成功',
        content: successMsg,
        showCancel: false,
        confirmText: '好的',
        success: () => {
          // 关闭地址弹窗
          this.setData({
            showReturnAddressModal: false,
            returnTrackingIdInput: '',
            userReturnAddress: { name: '', phone: '', address: '' }
          });
          
          // 刷新数据，卡片会自动消失（因为 returnTrackingId 已存在）
          this.loadMyActivitiesPromise().catch(() => {});
        }
      });
    }).catch(err => {
      this.hideMyLoading();
      console.error('提交失败:', err);
      this.showAutoToast('提交失败', err.errMsg || '请稍后重试');
    });
  },

  // 重新上传逻辑 (点击驳回条目)
  reUpload(e) {
    const item = e.currentTarget.dataset.item;
    if (item.type === 'device') {
      // 重新打开设备绑定
      this.openBindModal();
    } else {
      // 视频被拒，跳去 case 页面
      wx.switchTab({ url: '/pages/case/case' });
      // 可以在这里存个标记，让 case 页面知道是要重传
      wx.setStorageSync('reupload_video', true);
    }
  },
  
  // 简单时间格式化 (用于申请记录列表)
  formatTimeSimple(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  },

  // 🔴 优化：地址解析方法（用于验证地址格式）
  parseAddressForShipping(addressText) {
    if (!addressText || !addressText.trim()) {
      return { province: '', city: '', district: '', detail: '', fullAddress: addressText };
    }
    
    let text = addressText.trim();
    let province = '';
    let city = '';
    let district = '';
    let detail = '';
    
    // 🔴 优化：更智能地清理地址文本（保留更多有用信息）
    text = text
      // 移除明显的标签（但保留地址关键词）
      .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
      .replace(/(?:电话|手机|联系电话|号码)[:：\s]*/gi, ' ')
      .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
      // 移除号码、编号等无用词汇
      .replace(/(?:编号|单号|订单号|运单号)[:：\s]*/g, ' ')
      // 移除所有括号（但保留地址内容）
      .replace(/[()（）【】\[\]<>《》""'']/g, ' ')
      // 统一空格（保留地址中的分隔符）
      .replace(/\s+/g, ' ')
      .trim();
    
    // 方法1: 按顺序识别 省 -> 市 -> 区/县 -> 镇/街道 -> 详细地址
    let remaining = text;
    
    // 🔴 改进：识别省（支持带"省"字和不带"省"字的省份）
    const provincePattern = /([\u4e00-\u9fa5]{1,10}省)/;
    const provinceMatch = remaining.match(provincePattern);
    if (provinceMatch) {
      const candidate = provinceMatch[1].trim();
      // 确保不是"省市区"这样的错误匹配
      if (!candidate.includes('市') && !candidate.includes('区') && !candidate.includes('县')) {
        province = candidate;
        remaining = remaining.replace(new RegExp(province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }
    
    // 🔴 改进：如果没识别到省，尝试识别不带"省"字的省份（如"广东"、"江苏"）
    if (!province) {
      const provinceNames = ['广东', '江苏', '浙江', '山东', '河南', '四川', '湖北', '湖南', '安徽', '河北', '福建', '江西', '陕西', '山西', '云南', '贵州', '辽宁', '黑龙江', '吉林', '内蒙古', '新疆', '西藏', '青海', '甘肃', '宁夏', '海南', '广西'];
      for (const pName of provinceNames) {
        if (remaining.startsWith(pName) || remaining.includes(' ' + pName + ' ') || remaining.includes(pName + '省')) {
          province = pName + '省';
          remaining = remaining.replace(new RegExp(pName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
          break;
        }
      }
    }
    
    // 识别市（必须包含"市"字，排除已识别的省和"省市区"组合）
    const cityPattern = /([\u4e00-\u9fa5]{1,10}市)/;
    const cityMatch = remaining.match(cityPattern);
    if (cityMatch) {
      const candidate = cityMatch[1].trim();
      // 确保不是"市区"或"市县"这样的错误匹配
      if (!candidate.includes('区') && !candidate.includes('县') && !candidate.includes('省')) {
        city = candidate;
        remaining = remaining.replace(new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }
    
    // 🔴 改进：识别区/县/镇（支持更多行政级别）
    const districtPattern = /([\u4e00-\u9fa5]{1,10}[区县])/;
    const districtMatch = remaining.match(districtPattern);
    if (districtMatch) {
      const candidate = districtMatch[1].trim();
      // 确保不是"省市区"这样的错误匹配
      if (!candidate.includes('省') && !candidate.includes('市')) {
        district = candidate;
        remaining = remaining.replace(new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }
    
    // 🔴 新增：识别镇/街道（如果前面没有识别到区县）
    if (!district) {
      const townPattern = /([\u4e00-\u9fa5]{1,10}(?:镇|街道|乡))/;
      const townMatch = remaining.match(townPattern);
      if (townMatch) {
        const candidate = townMatch[1].trim();
        // 镇/街道可以作为区县的一部分
        district = candidate;
        remaining = remaining.replace(new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }
    
    // 方法2: 如果没识别到省市，尝试识别特殊格式（直辖市）
    if (!province && !city && !district) {
      // 直辖市特殊处理：北京、上海、天津、重庆
      const directCities = ['北京市', '上海市', '天津市', '重庆市'];
      for (const dc of directCities) {
        if (text.includes(dc)) {
          city = dc;
          remaining = text.replace(dc, '').trim();
          
          // 继续识别区
          const districtMatch2 = remaining.match(districtPattern);
          if (districtMatch2) {
            const candidate = districtMatch2[1].trim();
            if (!candidate.includes('省') && !candidate.includes('市')) {
              district = candidate;
              remaining = remaining.replace(new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
            }
          }
          break;
        }
      }
    }
    
    // 🔴 优化：剩余部分作为详细地址（保留更多信息，只清理明显无用词汇）
    detail = remaining
      .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
      .replace(/(?:电话|手机|联系电话|号码)[:：\s]*/gi, ' ')
      .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
      .replace(/(?:编号|单号|订单号|运单号)[:：\s]*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 组装完整地址（格式化输出，用空格连接）
    let fullAddress = '';
    const parts = [];
    if (province) parts.push(province);
    if (city) parts.push(city);
    if (district) parts.push(district);
    if (detail) parts.push(detail);
    
    fullAddress = parts.join(' ').trim();
    
    // 🔴 改进：如果解析失败或地址不完整，使用原始文本（但清理明显标签）
    if (!fullAddress || (!province && !city)) {
      // 如果原始地址有内容，使用原始地址（只清理标签）
      const cleanedOriginal = addressText
        .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
        .replace(/(?:电话|手机|联系电话|号码)[:：\s]*/gi, ' ')
        .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      fullAddress = cleanedOriginal || addressText;
    }
    
    return {
      province,
      city,
      district,
      detail,
      fullAddress
    };
  },

  // 【新增】空操作函数（用于阻止事件冒泡）
  noop() {
    // 空函数，用于阻止事件冒泡
  },
  
  // 阻止页面滚动（仅在弹窗 mask 层使用）
  preventScroll(e) {
    // 阻止默认滚动行为
    return false;
  },
  
  // 🔴 检查是否有弹窗打开，更新 hasModalOpen 状态
  updateModalState() {
    const hasModal = 
      this.data.showModal ||
      this.data.showAuditModal ||
      this.data.showReturnRequiredModal ||
      this.data.showReturnAddressModal ||
      this.data.showReturnAddressDialog ||
      this.data.showSmartAnalyzeModal ||
      this.data.showTestPasswordModal ||
      this.data.showLocationPermissionModal ||
      this.data.showLogisticsModal ||
      this.data.showShareCodeGenerateModal ||
      this.data.showFillRepairModal ||
      this.data.showPurchasePartsModal ||
      this.data.showPaidRepairConfirmModal ||
      this.data.showCopySuccessModal ||
      this.data.showLoadingAnimation ||
      this.data.isClearingData ||
      (this.data.dialog && this.data.dialog.show) ||
      (this.data.inputDialog && this.data.inputDialog.show) ||
      (this.data.autoToast && this.data.autoToast.show);
    
    if (this.data.hasModalOpen !== hasModal) {
      this.setData({ hasModalOpen: hasModal });
    }
  },

  // 7. 拒绝操作
  handleReject(e) {
    const id = e.currentTarget.dataset.id;
    
    // 原生 wx.showModal 替换为 this.showMyDialog
    this.showMyDialog({
      title: '拒绝申请',
      content: '确定要拒绝该设备的绑定申请吗？此操作不可撤销。',
      showCancel: true,     // 显示取消按钮
      confirmText: '确认拒绝',
      cancelText: '手滑了',
      success: (res) => {
        // 只有点击确定才执行
        if (res.confirm) {
          this.showMyLoading('处理中...');
          wx.cloud.callFunction({
            name: 'adminAuditDevice',
            data: { id: id, action: 'reject' },
            success: () => {
              this.hideMyLoading();
              // 操作完成后也提示一下
              this.showMyDialog({ title: '已拒绝', content: '该申请已被驳回。' });
              this.loadAuditList();
            },
            fail: err => {
              this.hideMyLoading();
              console.error(err);
              this.showAutoToast('操作失败', '网络错误，请重试');
            }
          });
        }
      }
    });
  },

  // 4. 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    
    wx.previewImage({
      urls: [url],
      current: url
    });
  },

  // [新增] 跳转去商城
  // 跳转到预约维修服务
  goToRepairService() {
    wx.navigateTo({
      url: '/pages/shouhou/shouhou',
      success: () => {
        console.log('[my.js] 跳转到预约维修服务成功');
      },
      fail: (err) => {
        console.error('[my.js] 跳转到预约维修服务失败:', err);
        this.showAutoToast('提示', '跳转失败，请稍后重试');
      }
    });
  },

  // 跳转到联系在线客服
  goToCustomerService() {
    wx.navigateTo({
      url: '/pages/call/call',
      success: () => {
        console.log('[my.js] 跳转到联系在线客服成功');
      },
      fail: (err) => {
        console.error('[my.js] 跳转到联系在线客服失败:', err);
        this.showAutoToast('提示', '跳转失败，请稍后重试');
      }
    });
  },

  // 🔴 「去购买配件」专用：只跳售后中心（shouhou）对应型号卡，绝不跳 shop
  goToShouhouForParts() {
    const { myReturnRequiredRepair, myPurchasePartsRepair } = this.data;
    const repair = (myReturnRequiredRepair && myReturnRequiredRepair.needPurchaseParts)
      ? myReturnRequiredRepair
      : myPurchasePartsRepair;
    let model = repair && repair.model ? String(repair.model).trim() : '';
    // 兼容 "F1 MAX - 12" 等形式，只取型号部分
    if (model && model.indexOf(' - ') !== -1) {
      model = model.split(' - ')[0].trim();
    }
    const url = model
      ? '/pages/shouhou/shouhou?model=' + encodeURIComponent(model)
      : '/pages/shouhou/shouhou';
    // 用全局变量传 model 和需预选配件，避免开发者工具/真机对 URL 参数解析不一致导致收不到
    if (model) {
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.shouhouOpenModel = model;
        app.globalData.shouhouRepairId = repair && repair._id ? repair._id : null; // 支付成功后更新该维修单的 purchasePartsStatus
        app.globalData.shouhouPreselectParts = [];
        if (repair && repair.purchasePartsList && repair.purchasePartsList.length) {
          let group = null;
          for (let i = 0; i < repair.purchasePartsList.length; i++) {
            const g = repair.purchasePartsList[i];
            const gm = (g.model || '').trim();
            const base = gm.indexOf(' - ') >= 0 ? gm.split(' - ')[0].trim() : gm;
            if (gm === model || base === model) {
              group = g;
              break;
            }
          }
          if (group && group.parts && group.parts.length) {
            app.globalData.shouhouPreselectParts = group.parts;
          }
        }
      }
    }
    if (model) {
      wx.redirectTo({ url });
    } else {
      wx.navigateTo({ url });
    }
  },

  // 跳转售后中心/商城（空订单卡片「去选购商品」等用）
  goToShop() {
    const { myReturnRequiredRepair, myPurchasePartsRepair } = this.data;
    const repair = (myReturnRequiredRepair && myReturnRequiredRepair.needPurchaseParts)
      ? myReturnRequiredRepair
      : myPurchasePartsRepair;
    if (repair && repair.needPurchaseParts && repair.model) {
      const model = encodeURIComponent(String(repair.model).trim());
      wx.navigateTo({ url: '/pages/shouhou/shouhou?model=' + model });
    } else {
      wx.navigateTo({ url: '/pages/shouhou/shouhou' });
    }
  },

  // [新增] 跳转去商城（旧版本，保留兼容）
  goToShopOld() {
    // 使用 reLaunch 确保跳转成功，并清除页面栈
    wx.reLaunch({
      url: '/pages/products/products',
      success: () => {
        console.log('跳转到产品列表页成功');
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        // 如果失败，尝试跳转到主页
        wx.reLaunch({
          url: '/pages/index/index',
          fail: () => {
            this.showMyDialog({ 
              title: '跳转失败', 
              content: '请手动返回首页' 
            });
          }
        });
      }
    });
  }

});

// ==========================================
// BLEHelper 蓝牙助手类
// ==========================================
class BLEHelper {
  constructor(wx) {
    this.wx = wx;
    this.deviceId = null;
    this.serviceId = null;
    this.characteristicId = null;
    this.isConnected = false;
    this.isScanning = false;
    
    // 回调函数
    this.onConnecting = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
  }

  // 初始化蓝牙适配器
  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      this.wx.openBluetoothAdapter({
        success: () => {
          console.log('蓝牙适配器初始化成功');
          resolve();
        },
        fail: (err) => {
          console.error('蓝牙适配器初始化失败', err);
          reject(err);
        }
      });
    });
  }

  // 开始扫描设备
  startScan() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => {
        console.log('开始扫描蓝牙设备');
        this.setupDeviceFoundListener();
      },
      fail: (err) => {
        console.error('扫描失败', err);
        this.isScanning = false;
        if (this.onError) this.onError(err);
      }
    });
  }

  // 停止扫描
  stopScan() {
    if (!this.isScanning) return;
    
    this.wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('停止扫描');
        this.isScanning = false;
      }
    });
  }

  // 监听设备发现事件
  setupDeviceFoundListener() {
    this.wx.onBluetoothDeviceFound((res) => {
      const devices = res.devices || [];
      
      // 识别 NB 开头的设备
      const targetDevice = devices.find(device => {
        const name = device.name || device.localName || '';
        return name.toUpperCase().startsWith('NB');
      });

      if (targetDevice) {
        console.log('找到目标设备:', targetDevice);
        this.stopScan();
        this.connectDevice(targetDevice);
      }
    });
  }

  // 连接设备
  connectDevice(device) {
    if (this.onConnecting) this.onConnecting();
    
    this.deviceId = device.deviceId;
    
    this.wx.createBLEConnection({
      deviceId: this.deviceId,
      success: () => {
        console.log('蓝牙连接成功');
        this.isConnected = true;
        if (this.onConnected) this.onConnected(device);
      },
      fail: (err) => {
        console.error('连接失败', err);
        this.isConnected = false;
        if (this.onError) this.onError(err);
      }
    });

    // 监听连接断开
    this.wx.onBLEConnectionStateChange((res) => {
      if (!res.connected) {
        console.log('蓝牙连接已断开');
        this.isConnected = false;
        if (this.onDisconnected) this.onDisconnected();
      }
    });
  }

  // 断开连接
  disconnect() {
    if (!this.deviceId || !this.isConnected) return;
    
    this.wx.closeBLEConnection({
      deviceId: this.deviceId,
      success: () => {
        console.log('已断开连接');
        this.isConnected = false;
        this.deviceId = null;
      }
    });
  }
}
