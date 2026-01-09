const app = getApp();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});

Page({
  data: {
    currentOrderIndex: 0,
    showModal: false,
    bluetoothReady: false,
    modelOptions: ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'],
    modelIndex: null,
    buyDate: '',
    userName: 'Alexander', // 用户昵称，从存储中读取
    
    // 蓝牙相关状态
    isScanning: false,      // 是否正在扫描(控制动画)
    connectStatusText: '点击搜索设备',
    currentSn: '', // 【新增】用来存提取出来的纯数字SN
    isDeviceLocked: false, // [新增] 是否被锁
    lockedReason: '',      // [新增] 被锁原因
    connectedDeviceName: '', // [新增] 连接的设备名称
    
    // [新增] 弹窗控制数据
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },
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

    // 统一的"内容已复制"弹窗（和首页一致）
    showCopySuccessModal: false,
    
    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },
    
    // 【新增】用户填写地址信息（在用户端的卡片中）
    userReturnAddress: { name: '', phone: '', address: '' },
    
    // 【新增】底部弹窗控制
    showReturnAddressModal: false,
    returnTrackingIdInput: '', // 运单号输入
  },

  onLoad(options) {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('my');
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();
    
    // 读取用户昵称
    const savedNickname = wx.getStorageSync('user_nickname');
    if (savedNickname) {
      this.setData({ userName: savedNickname });
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
  },

  onShow() {
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

  // 🔴 获取位置和设备信息的辅助函数（必须解析出详细地址）
  async _getLocationAndDeviceInfo() {
    const sysInfo = wx.getSystemInfoSync();
    const deviceInfo = {
      deviceInfo: sysInfo.system || '',
      phoneModel: sysInfo.model || ''
    };
    
    // 尝试从缓存获取位置信息
    const cachedLocation = wx.getStorageSync('last_location');
    if (cachedLocation && cachedLocation.province && cachedLocation.city) {
      // 如果缓存中有完整的地址信息，直接使用
      return {
        ...cachedLocation,
        ...deviceInfo
      };
    }
    
    try {
      // 获取当前位置
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
      console.error('[my] 获取位置信息失败:', err);
      // 获取定位失败，尝试使用缓存的位置信息
      if (cachedLocation) {
        return {
          ...cachedLocation,
          ...deviceInfo
        };
      } else {
        // 完全失败，只返回设备信息
        return deviceInfo;
      }
    }
  },

  // 🔴 处理截屏/录屏拦截
  handleIntercept(type) {
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    // 🔴 关键优化：立即跳转到 blocked 页面，不等待位置信息获取和云函数调用
    console.log('[my] 🔴 截屏/录屏检测，立即跳转到封禁页');
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数写入数据库封禁状态（不阻塞跳转）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'my', // 封禁页面
          ...locationData
        },
        success: (res) => {
          console.log('[my] banUserByScreenshot 调用成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[my] banUserByScreenshot 调用失败:', err);
        }
      });
    }).catch(() => {
      // 如果获取位置失败，仍然调用云函数（不带位置信息）
      const sysInfo = wx.getSystemInfoSync();
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'my',
          deviceInfo: sysInfo.system || '',
          phoneModel: sysInfo.model || ''
        },
        success: (res) => {
          console.log('[my] banUserByScreenshot 调用成功（无位置信息）');
        },
        fail: (err) => {
          console.error('[my] banUserByScreenshot 调用失败:', err);
        }
      });
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
  },

  // --- 1. 页面显示时，加载云端数据 ---
  onShow() {
    // 🔴 立即显示 loading，提升用户体验
    this.showMyLoading('同步中...');
    
    // 每次显示时重新读取昵称（可能在其他页面修改了）
    const savedNickname = wx.getStorageSync('user_nickname');
    if (savedNickname) {
      this.setData({ userName: savedNickname });
    }
    
    // 🔴 先检查权限获取 openid，然后再加载数据
    this.checkAdminPrivilege().then(() => {
      // 确保 myOpenid 已获取后再加载数据，等待所有数据加载完成后再隐藏 loading
      Promise.all([
        this.loadMyOrdersPromise(),
        this.loadMyActivitiesPromise()
      ]).then(() => {
        this.hideMyLoading();
      }).catch(() => {
        this.hideMyLoading();
      });
    }).catch(() => {
      // 如果权限检查失败，也尝试加载（可能只是普通用户）
      if (this.data.myOpenid) {
        Promise.all([
          this.loadMyOrdersPromise(),
          this.loadMyActivitiesPromise()
        ]).then(() => {
          this.hideMyLoading();
        }).catch(() => {
          this.hideMyLoading();
        });
      } else {
        // 如果连 openid 都没有，隐藏 loading
        this.hideMyLoading();
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
      const adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      
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
      wx.showToast({ title: '无权限', icon: 'none' });
      return;
    }
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    wx.showToast({
      title: nextState ? '管理模式开启' : '已回到用户模式',
      icon: 'none'
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
              this.showMyDialog({
                title: '物料发出成功',
                content: '物料运单号已录入，用户端已同步。',
                success: () => {
                  this.loadMyOrders(); // 刷新订单列表
                }
              });
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
            : Promise.resolve({ data: [] })); // 如果还没获取到 openid，返回空数组

      const promise = this.data.isAdmin ? getAction.then(res => res.result) : getAction;

      promise.then(res => {
        // 🔴 loading 统一在 onShow 中管理，这里不隐藏
      
        // 数据清洗 (保持之前的逻辑不变)
        // 注意：管理员模式下 res.data 是数组，普通用户模式下 res.data 也是数组
        const orderData = Array.isArray(res.data) ? res.data : (res.data || []);
        const formatted = orderData.map(item => {
          return {
            id: item._id,
            orderId: item.orderId,
            transactionId: item.transactionId || '', // 🔴 【必须加上】确认收货组件必填字段
            realStatus: item.status, 
            statusText: this.getStatusText(item.status),
            amount: item.totalFee,
            userName: item.address ? item.address.name : '匿名',
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
            // 🔴 只显示 PENDING 状态的维修单（待处理），排除已标记为需要寄回的
            const pendingRepairs = res.repairs.filter(i => i.status === 'PENDING' && !i.needReturn);
            this.setData({ repairList: pendingRepairs });
          } else {
            // 云函数没返回 repairs，就直接从数据库拉取（只拉取PENDING）
            this.loadPendingRepairs();
          }
          
          // 1. 待物料发出列表 (只保留 PAID，发货后自动消失)
          const pending = formatted.filter(i => i.realStatus === 'PAID');

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
        console.error(err);
        reject(err); // 🔴 Promise 失败
      });
    });
  },

  // 🔴 保留原方法以兼容其他地方的调用
  loadMyOrders() {
    this.loadMyOrdersPromise().catch(() => {});
  },

  // [新增] 管理员：加载待处理维修工单
  loadPendingRepairs() {
    const db = wx.cloud.database();
    db.collection('shouhou_repair')
      .where({ 
        status: 'PENDING',
        needReturn: db.command.neq(true) // 🔴 排除已标记为需要寄回的订单
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        this.setData({ repairList: res.data || [] });
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
    if (status === 'PAID') return '待物料发出';   // 只有这个状态才显示"录入运单号"
    if (status === 'SHIPPED') return '运输中';
    if (status === 'SIGNED') return '确认件齐';
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
    const totalPrice = item.amount || 0;
    const shippingFee = 0; // 从订单中获取，如果有的话
    const shippingMethod = 'zto'; // 默认中通

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
          this.showMyDialog({ 
            title: '提示', 
            content: '支付系统对接中，请稍后再试', 
            showCancel: false 
          });
          return;
        }

        console.log('[repayOrder] 准备调用 wx.requestPayment');
        // 唤起微信原生支付界面
        wx.requestPayment({
          ...payment,
          success: (payRes) => {
            console.log('[repayOrder] 支付成功:', payRes);
            wx.showToast({ title: '支付成功', icon: 'success' });
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
            this.showMyDialog({ 
              title: '支付提示', 
              content: errorMsg, 
              showCancel: false 
            });
          }
        });
      },
      fail: err => {
        console.error('[repayOrder] 云函数调用失败:', err);
        this.hideMyLoading();
        this.showMyDialog({ 
          title: '创建订单失败', 
          content: err.errMsg || '网络错误，请重试', 
          showCancel: false 
        });
      }
    });
  },

  callCheckPayResult(orderId, attempt = 1) {
    if (!orderId) return;
    const maxAttempts = 3;
    wx.showLoading({
      title: attempt === 1 ? '确认订单中...' : '再次确认...',
      mask: true
    });

    wx.cloud.callFunction({
      name: 'checkPayResult',
      data: { orderId },
      success: (res) => {
        const result = res.result || {};
        console.log('[my] checkPayResult 返回:', result);
        if (result.success) {
          wx.showToast({ title: '订单已确认', icon: 'success' });
        } else if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          wx.showToast({
            title: result.msg || '支付状态待确认，请稍候刷新订单',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('[my] checkPayResult 调用失败:', err);
        if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          wx.showToast({
            title: '网络异常，请稍后再试',
            icon: 'none'
          });
        }
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 3. 【核心修复】查看教程并唤起官方收货组件
  viewTutorialAndSign(e) {
    const id = e.currentTarget.dataset.id
    const modelName = e.currentTarget.dataset.model || ''
    
    console.log('[viewTutorialAndSign] 开始执行，订单ID:', id)
    
    // 1. 查找订单
    const order = this.data.orders.find(item => item.id === id)
    if (!order) {
      console.error('[viewTutorialAndSign] 订单不存在')
      return wx.showToast({ title: '订单数据异常', icon: 'none' })
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
      wx.showToast({ title: '缺少支付单号，无法确认', icon: 'none' })
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
          // 执行后续逻辑：改数据库状态 -> 跳转
          this.confirmReceiptAndViewTutorial(id, modelName)
        } else {
          console.log('[viewTutorialAndSign] 用户取消或关闭')
          // 用户点了取消或关闭，不做操作
          wx.showToast({ title: '需要确认收货才能观看哦', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('[viewTutorialAndSign] ❌ 组件唤起失败:', err)
        console.error('[viewTutorialAndSign] 错误详情:', JSON.stringify(err))
        // 常见错误：订单未发货(shipped)，或者 transaction_id 错误
        wx.showToast({ title: '无法唤起确认组件(请检查是否已发货)', icon: 'none' })
      }
    })
  },

  // 🔴 新增：确认收货并查看教程的统一处理函数
  // 确认收货并跳转的实际执行逻辑
  confirmReceiptAndViewTutorial(id, modelName) {
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
        this.hideMyLoading()
        
        console.log('[confirmReceiptAndViewTutorial] 云函数返回:', r)
        
        // 只要云函数不报错，就认为成功
        if (r.result && r.result.success !== false) {
          
          // 2. 更新本地列表状态 (避免返回后按钮状态没变)
          const newOrders = this.data.orders.map(item => {
             if(item.id === id) {
                item.realStatus = 'SIGNED'; 
                item.statusText = '确认件齐';
             }
             return item;
          });
          this.setData({ orders: newOrders });

          // 3. 跳转到教程页面
          wx.navigateTo({
            url: '/pages/azjc/azjc' + (modelName ? '?model=' + encodeURIComponent(modelName) : ''),
            success: () => {
              wx.showToast({ 
                title: '教程已解锁', 
                icon: 'success',
                duration: 2000
              })
            }
          })
          
        } else {
          console.error('[confirmReceiptAndViewTutorial] 云函数返回失败:', r)
          this.showMyDialog({ 
            title: '操作失败', 
            content: r.result.errMsg || '同步状态失败',
            showCancel: false
          })
        }
      },
      fail: (err) => {
        this.hideMyLoading()
        console.error('[confirmReceiptAndViewTutorial] 云函数调用失败:', err)
        // 即使同步失败，如果用户已经在微信组件里确认了，也可以考虑让他跳转
        // 这里偏向严格，失败就不跳
        this.showMyDialog({ 
          title: '网络异常', 
          content: err.errMsg || '请稍后重试',
          showCancel: false
        })
      }
    })
  },

  // 4. 仅查看教程（已签收状态）
  viewTutorialOnly(e) {
    const modelName = e.currentTarget.dataset.model || ''; // 产品型号（可选）
    
    // 显示提示后跳转
    this.showMyDialog({
      title: '查看教程',
      content: '即将跳转到安装教程页面',
      showCancel: false,
      confirmText: '好的',
      success: () => {
        wx.navigateTo({
          url: '/pages/azjc/azjc' + (modelName ? '?model=' + encodeURIComponent(modelName) : '')
        });
      }
    });
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

    // 3. 延迟执行，确保界面渲染完毕
    setTimeout(() => {
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
      }).exec();
    }, 200); // 延迟加大到 200ms，更稳
  },
  
  // 跳转快递100查询（服务类进度说明）
  viewLogisticsDetail(e) {
    const sn = e.currentTarget.dataset.sn;
    console.log("尝试跳转查运单号:", sn);

    if (!sn) {
      this.showAutoToast('提示', '无运单号');
      return;
    }

    wx.navigateToMiniProgram({
      // 👇👇👇【这里也要改】把 a 改成 c 👇👇👇
      appId: 'wx6885acbedba59c14', 
      path: `pages/result/result?nu=${sn}&querysource=third_xcx`, // 加上 querysource 更稳
      envVersion: 'release', 
      success(res) {
        console.log('跳转成功');
      },
      fail: (err) => {
        console.error('跳转失败', err);
        
        // 🔴 如果是用户取消，不显示错误弹窗
        const errMsg = err.errMsg || '';
        if (errMsg.includes('cancel') || errMsg.includes('取消') || errMsg.includes('user cancel')) {
          console.log('用户取消了跳转');
          return; // 静默处理，不显示任何提示
        }
        
        // 其他错误才显示弹窗
        this.showMyDialog({
          title: '跳转失败',
          // 把错误打印出来看，通常是因为 app.json 没生效
          content: err.errMsg, 
          showCancel: false
        });
      }
    });
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
               this.showMyDialog({ 
                 title: '提示', 
                 content: '请输入运单号', 
                 showCancel: false 
               });
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

  // 【新增】管理员点击"需要用户寄回"按钮，只填写备注
  requestUserReturn(e) {
    const id = e.currentTarget.dataset.id;
    
    // 弹出输入框，让管理员填写备注
    this.showInputDialog({
      title: '需要用户寄回',
      placeholder: '请输入备注信息（选填）',
      success: (res) => {
        if (res.confirm) {
          const returnNote = res.content ? res.content.trim() : '';
          this.showMyLoading('处理中...');
          const db = wx.cloud.database();
          db.collection('shouhou_repair').doc(id).update({
            data: {
              needReturn: true,
              returnNote: returnNote,
              returnStatus: 'PENDING_RETURN' // 待用户寄回
            }
          }).then(() => {
            this.hideMyLoading();
            this.showMyDialog({
              title: '操作成功',
              content: '已标记为需要用户寄回\n用户端将显示寄回提示',
              showCancel: false,
              confirmText: '好的',
              callback: () => {
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
      this.showAutoToast('提示', '地址格式不正确，请包含省市区信息，如：广东省 佛山市 南海区 某某街道101号');
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
        callback: () => {
          // 关闭弹窗
          this.setData({
            showReturnAddressModal: false
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
    
    wx.setClipboardData({
      data: address,
      success: (res) => {
        console.log('[copyReturnAddress] 复制成功', res);
        // 立即隐藏官方的"内容已复制" Toast
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
        // 使用统一的"内容已复制"自定义弹窗
        this.setData({ showCopySuccessModal: true });
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
      },
      fail: (err) => {
        console.error('[copyReturnAddress] 复制失败', err);
        wx.hideToast();
        this.showMyDialog({
          title: '复制失败',
          content: '请手动复制地址',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  // 【新增】一键复制用户地址（在需寄回订单确认弹窗中）
  copyUserAddress(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.returnRequiredList[index];
    
    if (!item || !item.contact) {
      this.showAutoToast('提示', '地址信息不存在');
      return;
    }
    
    // 组装用户地址信息
    const addressText = `${item.contact.name || ''} ${item.contact.phone || ''} ${item.contact.address || ''}`.trim();
    
    if (!addressText) {
      this.showAutoToast('提示', '地址信息为空');
      return;
    }
    
    wx.setClipboardData({
      data: addressText,
      success: (res) => {
        console.log('[copyUserAddress] 复制成功', res);
        // 立即隐藏官方的"内容已复制" Toast
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
        // 使用统一的"内容已复制"自定义弹窗
        this.setData({ showCopySuccessModal: true });
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
      },
      fail: (err) => {
        console.error('[copyUserAddress] 复制失败', err);
        wx.hideToast();
        this.showAutoToast('提示', '复制失败，请手动复制');
      }
    });
  },

  // 【新增】打开需寄回订单确认弹窗
  openReturnRequiredModal() {
    this.loadReturnRequiredList();
    this.setData({ showReturnRequiredModal: true });
  },

  // 【新增】关闭需寄回订单确认弹窗
  closeReturnRequiredModal() {
    this.setData({ showReturnRequiredModal: false });
  },

  // 【新增】加载需寄回订单列表（只显示维修单，不显示普通订单）
  loadReturnRequiredList() {
    this.showMyLoading('加载中...');
    const db = wx.cloud.database();
    // 查询需要寄回且未完成的维修单（只查 shouhou_repair，不查 shop_orders）
    db.collection('shouhou_repair')
      .where({
        needReturn: true,
        returnCompleted: db.command.neq(true), // 未完成的
        status: db.command.neq('COMPLETED') // 排除已完成的
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        this.hideMyLoading();
        // 格式化数据，添加配件发出时间
        const filtered = (res.data || []).map(item => {
          return {
            ...item,
            shipTime: item.solveTime ? this.formatTime(item.solveTime) : (item.createTime ? this.formatTime(item.createTime) : '未知')
          };
        });
        this.setData({ returnRequiredList: filtered });
        console.log('✅ [loadReturnRequiredList] 加载需寄回维修单:', filtered.length, '条');
      })
      .catch(err => {
        this.hideMyLoading();
        console.error('加载需寄回订单失败:', err);
        this.showMyDialog({
          title: '加载失败',
          content: err.errMsg || '请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        });
      });
  },

  // 【新增】管理员维修完成后寄出快递
  adminShipOutAfterRepair(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showInputDialog({
      title: '寄出快递',
      placeholder: '请输入寄回给用户的运单号',
      success: (res) => {
        if (res.confirm && res.content) {
          const trackingId = res.content.trim();
          if (!trackingId) {
            this.showMyDialog({ 
              title: '提示', 
              content: '请输入运单号', 
              showCancel: false 
            });
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
              callback: () => {
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

  // 【新增】管理员标记需寄回订单为已完成（删除订单）
  completeReturnRequired(e) {
    const id = e.currentTarget.dataset.id;
    
    this.showMyDialog({
      title: '确认完成',
      content: '确认该订单已完成？完成后将删除该订单记录。',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      callback: () => {
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
            callback: () => {
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
          this.loadMyOrders(); // 刷新订单列表
          // 如果是用户模式，也刷新申请进度
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
    // 🔴 提前隐藏可能的 toast
    wx.hideToast();
    
    wx.setClipboardData({
      data: text,
      success: () => {
        // 立即干掉系统"已复制"toast，多次尝试确保隐藏
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
        setTimeout(() => { wx.hideToast(); }, 100);
        setTimeout(() => { wx.hideToast(); }, 150);
        // 使用统一的"内容已复制"大弹窗
        this.setData({ showCopySuccessModal: true });
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
      },
      fail: () => {
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
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
  },
  closeBindModal() { 
    this.resetBluetoothState(); // 关闭时也重置
    this.setData({ showModal: false }); 
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
  },

  // [交互] 点击弹窗确定
  onDialogConfirm() {
    const cb = this.data.dialog.callback;
    this.setData({ 'dialog.show': false }); // 先关弹窗
    if (cb) cb({ confirm: true }); // 执行回调
  },

  // [交互] 点击取消
  closeCustomDialog() {
    this.setData({ 'dialog.show': false });
  },

  // 【新增】自动消失提示（无按钮，2秒后自动消失）
  showAutoToast(title = '提示', content = '') {
    this.setData({
      'autoToast.show': true,
      'autoToast.title': title,
      'autoToast.content': content
    });
    // 2秒后自动消失
    setTimeout(() => {
      this.setData({ 'autoToast.show': false });
    }, 2000);
  },

  // 显示 Loading
  // 显示 Loading（使用和 index.js 一样的白色背景进度条动画）
  showMyLoading(title = '加载中...') {
    // 🔴 关键：先隐藏微信官方的 loading（如果存在），避免覆盖自定义 loading
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    this.setData({ showLoadingAnimation: true, loadingText: title });
  },

  // 隐藏 Loading
  hideMyLoading() {
    this.setData({ showLoadingAnimation: false });
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
  },

  // 关闭输入弹窗
  closeInputDialog() {
    this.setData({ 'inputDialog.show': false });
  },

  // 输入弹窗输入监听
  onInputDialogInput(e) {
    this.setData({ 'inputDialog.value': e.detail.value });
  },

  // 输入弹窗确认
  onInputDialogConfirm() {
    const callback = this.data.inputDialog.callback;
    const value = this.data.inputDialog.value;
    this.setData({ 'inputDialog.show': false });
    if (callback) callback({ confirm: true, content: value });
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

        if (result.success) {
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
            lockedReason: result.msg
          });
        }
      },
      fail: () => {
        this.showAutoToast('错误', '网络校验失败');
        this.resetBluetoothState();
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
            // 更新页面显示
            if (type === 'receipt') {
              this.setData({ imgReceipt: uploadRes.fileID });
            } else {
              this.setData({ imgChat: uploadRes.fileID });
            }
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

          uniqueList.push({
            name: item.productModel || '未知型号',
            sn: 'MT' + item.sn,
            days: diff > 0 ? diff : 0,
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
  },

  // 4. 关闭弹窗
  closeAuditModal() {
    this.setData({ showAuditModal: false, currentAuditItem: null });
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

      // 4. 【新增】查用户需寄回的维修单
      const p4 = db.collection('shouhou_repair')
        .where({
          _openid: this.data.myOpenid,
          needReturn: true,
          returnCompleted: db.command.neq(true) // 未完成的
        })
        .orderBy('createTime', 'desc')
        .limit(1) // 只取最新的一个
        .get();

      Promise.all([p1, p2, p3, p4]).then(res => {
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
      const videoApps = res[1].data.map(i => ({
        ...i, 
        type: 'video', 
        title: '投稿: ' + (i.vehicleName || '未知车型'),
        // 视频申请已经是数字状态（0/1/-1），直接使用
        originalCreateTime: i.createTime, // 🔴 保留原始时间用于排序
        // 格式化时间用于显示
        createTime: i.createTime ? this.formatTimeSimple(i.createTime) : '刚刚'
      }));
      
      // [新增] 处理维修工单
      const repairApps = res[2].data.map(i => {
        let statusText = '审核中';
        let statusClass = 'processing';
        let statusNum = 0; // 统一状态值，用于过滤逻辑
        
        // 处理各种状态
        if (i.status === 'REPAIR_COMPLETED_SENT') {
          statusText = '已维修完成';
          statusClass = 'success';
          statusNum = 1; // 已处理
        } else if (i.status === 'USER_SENT' || i.returnStatus === 'USER_SENT') {
          statusText = '正在维修中';
          statusClass = 'processing';
          statusNum = 0; // 维修中
        } else if (i.status === 'SHIPPED') {
          statusText = '配件已寄出';
          statusClass = 'success';
          statusNum = 1; // 已处理
        } else if (i.status === 'TUTORIAL') {
          statusText = '查看教程可修复'; // 用户看到这个状态
          statusClass = 'info'; // 蓝色
          statusNum = 1; // 已处理
        } else if (i.status === 'PENDING') {
          statusText = '工程师审核中';
          statusClass = 'processing';
          statusNum = 0; // 审核中
        }
        
        return {
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
          returnStatus: i.returnStatus || '' // 确保有 returnStatus 字段
        };
      });
      
      // 合并并按时间倒序（使用原始时间对象排序）
      const all = [...deviceApps, ...videoApps, ...repairApps].sort((a, b) => {
        // 使用原始 createTime 对象排序
        const timeA = a.originalCreateTime ? new Date(a.originalCreateTime).getTime() : 0;
        const timeB = b.originalCreateTime ? new Date(b.originalCreateTime).getTime() : 0;
        return timeB - timeA;
      });
      
      // 🔴 过滤规则：
      // - 设备 / 视频申请：只显示「审核中 / 已驳回」
      // - 维修工单：全部展示（含 SHIPPED / TUTORIAL），因为用户需要看到处理结果
      const filtered = all.filter(i => {
        // 维修工单始终保留
        if (i.type === 'repair') return true;
        const status = i.status;
        // 设备 / 视频：只保留 审核中(0/PENDING) 和 已驳回(-1/REJECTED)
        return status === 0 || status === 'PENDING' || status === -1 || status === 'REJECTED';
      });
      
      console.log('📋 [loadMyActivities] 过滤后的申请记录（已通过已排除）:', filtered);
      console.log('📋 [loadMyActivities] 记录数量:', filtered.length);
      
      // 【新增】设置用户需寄回的维修单（取最新的一个未完成的，且未标记为COMPLETED）
      const returnRequiredRepairs = (res[3].data || []).filter(item => 
        !item.returnCompleted && item.status !== 'COMPLETED'
      );
      let myReturnRequiredRepair = returnRequiredRepairs.length > 0 ? returnRequiredRepairs[0] : null;
      
      // 格式化时间用于显示
      if (myReturnRequiredRepair && myReturnRequiredRepair.createTime) {
        myReturnRequiredRepair = {
          ...myReturnRequiredRepair,
          createTime: this.formatTimeSimple(myReturnRequiredRepair.createTime)
        };
      }
      
      this.setData({ 
        myActivityList: filtered,
        myReturnRequiredRepair: myReturnRequiredRepair
      }, () => {
        console.log('✅ [loadMyActivities] 数据已更新到页面，当前 myActivityList 长度:', this.data.myActivityList.length);
        if (myReturnRequiredRepair) {
          console.log('✅ [loadMyActivities] 检测到需寄回维修单:', myReturnRequiredRepair._id);
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
  },
  
  // 关闭底部弹窗
  closeReturnAddressModal() {
    this.setData({
      showReturnAddressModal: false,
      returnTrackingIdInput: ''
    });
  },
  
  // 运单号输入
  onReturnTrackingIdInput(e) {
    this.setData({
      returnTrackingIdInput: e.detail.value
    });
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
        callback: () => {
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
    const { userReturnAddress, returnTrackingIdInput, myReturnRequiredRepair } = this.data;
    
    if (!myReturnRequiredRepair || !myReturnRequiredRepair._id) {
      this.showAutoToast('提示', '订单信息异常');
      return;
    }
    
    const repair = myReturnRequiredRepair;
    const needsAddress = !repair.returnAddress;
    const trackingId = returnTrackingIdInput.trim();
    const needsTrackingId = !repair.returnTrackingId && trackingId;
    
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
    
    // 先提交地址（如果需要），然后提交运单号（如果需要）
    this.showMyLoading('提交中...');
    const db = wx.cloud.database();
    
    // 构建更新数据
    const updateData = {};
    
    // 如果需要更新地址
    if (needsAddress) {
      const parsed = this.parseAddressForShipping(userReturnAddress.address);
      const fullAddress = parsed.fullAddress || userReturnAddress.address;
      
      if (!parsed.province && !parsed.city) {
        this.hideMyLoading();
        this.showAutoToast('提示', '地址格式不正确，请包含省市区信息');
        return;
      }
      
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
      updateData.returnStatus = 'USER_SENT';
      updateData.status = 'USER_SENT';
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
      
      this.showMyDialog({
        title: '提交成功',
        content: successMsg,
        showCancel: false,
        confirmText: '好的',
        callback: () => {
          // 关闭弹窗
          this.setData({
            showReturnAddressModal: false,
            returnTrackingIdInput: ''
          });
          // 刷新数据
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

  // 【新增】地址解析方法（用于验证地址格式）
  parseAddressForShipping(addressText) {
    if (!addressText || !addressText.trim()) {
      return { province: '', city: '', district: '', street: '', fullAddress: addressText };
    }
    
    let text = addressText.trim();
    let province = '';
    let city = '';
    let district = '';
    let detail = '';
    
    // 移除常见的分隔符，统一处理
    text = text.replace(/[\/、]/g, ' ').replace(/[,，]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 方法1: 按顺序识别 省 -> 市 -> 区/县 -> 详细地址
    let remaining = text;
    
    // 识别省（必须包含"省"字）
    const provincePattern = /([^省\s]+省)/;
    const provinceMatch = remaining.match(provincePattern);
    if (provinceMatch) {
      province = provinceMatch[1].trim();
      remaining = remaining.replace(province, '').trim();
    }
    
    // 识别市（必须包含"市"字，排除"省"字）
    const cityPattern = /([^省市\s]+市)/;
    const cityMatch = remaining.match(cityPattern);
    if (cityMatch) {
      city = cityMatch[1].trim();
      remaining = remaining.replace(city, '').trim();
    }
    
    // 识别区/县（必须包含"区"或"县"字）
    const districtPattern = /([^省市区县\s]+[区县])/;
    const districtMatch = remaining.match(districtPattern);
    if (districtMatch) {
      district = districtMatch[1].trim();
      remaining = remaining.replace(district, '').trim();
    }
    
    // 剩余部分作为详细地址
    detail = remaining.trim();
    
    // 方法2: 如果没识别到，尝试识别特殊格式（如：北京市朝阳区）
    if (!province && !city && !district) {
      // 直辖市特殊处理：北京、上海、天津、重庆
      const directCityPattern = /(北京市|上海市|天津市|重庆市)/;
      const directCityMatch = text.match(directCityPattern);
      if (directCityMatch) {
        city = directCityMatch[1];
        remaining = text.replace(city, '').trim();
        
        // 继续识别区
        const districtMatch2 = remaining.match(districtPattern);
        if (districtMatch2) {
          district = districtMatch2[1].trim();
          remaining = remaining.replace(district, '').trim();
        }
        detail = remaining;
      }
    }
    
    // 组装完整地址（格式化输出）
    let fullAddress = '';
    const parts = [];
    if (province) parts.push(province);
    if (city) parts.push(city);
    if (district) parts.push(district);
    if (detail) parts.push(detail);
    
    fullAddress = parts.join(' ');
    
    // 如果解析失败，使用原始文本
    if (!fullAddress) {
      fullAddress = addressText;
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
  goToShop() {
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
