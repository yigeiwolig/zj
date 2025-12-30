const app = getApp();

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
    showShippedMode: false, // false=显示待发货(横滑), true=显示已发货(竖滑)
    
    // 【新增】拆分数据源
    pendingList: [], // 待发货 (PAID)
    shippedList: [], // 已发货 + 已完成 (SHIPPED + SIGNED)
    
    // Swiper 动态高度
    swiperHeight: 900, // 默认高度，单位 px
    
    // Loading 状态
    isLoading: false,
    loadingText: '加载中...',
    
    // 【新增】我的申请记录
    myActivityList: [], // 存放所有的审核记录
    
    // 【新增】维修工单列表（管理员用）
    repairList: [], // 管理员用的维修列表

    // 统一的“内容已复制”弹窗（和首页一致）
    showCopySuccessModal: false,
  },

  onLoad() {
    // 读取用户昵称
    const savedNickname = wx.getStorageSync('user_nickname');
    if (savedNickname) {
      this.setData({ userName: savedNickname });
    }
    
    this.checkAdminPrivilege();
    
    // 1. 初始化蓝牙助手
    this.ble = new BLEHelper(wx);
    this.setupBleCallbacks();
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
    // 每次显示时重新读取昵称（可能在其他页面修改了）
    const savedNickname = wx.getStorageSync('user_nickname');
    if (savedNickname) {
      this.setData({ userName: savedNickname });
    }
    
    // 🔴 先检查权限获取 openid，然后再加载数据
    this.checkAdminPrivilege().then(() => {
      // 确保 myOpenid 已获取后再加载数据
      this.loadMyOrders();
      this.loadMyActivities();
    }).catch(() => {
      // 如果权限检查失败，也尝试加载（可能只是普通用户）
      if (this.data.myOpenid) {
        this.loadMyOrders();
        this.loadMyActivities();
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

  // ================== 管理员发货功能 ==================
  // 1. 修复：发货逻辑改用云函数 (之前是前端直连，没权限改别人的)
  adminShipOrder(e) {
    const orderId = e.currentTarget.dataset.id; // 数据库 _id
    
    this.showInputDialog({
      title: '录入快递单号',
      placeholder: '请输入顺丰/圆通单号',
      success: (res) => {
        if (res.confirm && res.content) {
          const sn = res.content.trim();
          if (!sn) {
            this.showMyDialog({ title: '提示', content: '请输入单号' });
            return;
          }
          this.showMyLoading('正在提交...');

          // 【核心修改】调用云函数去修改，而不是直接 db.update
          wx.cloud.callFunction({
            name: 'adminUpdateOrder',
            data: {
              id: orderId,
              action: 'ship',
              trackingId: sn
            },
            success: r => {
              this.hideMyLoading();
              
              // ✅ [替换]
              this.showMyDialog({
                title: '发货成功',
                content: '物流单号已录入，用户端已同步。',
                success: () => {
                  this.loadMyOrders(); // 刷新订单列表
                }
              });
            },
            fail: err => {
              this.hideMyLoading();
              this.showMyDialog({ title: '失败', content: err.toString() });
            }
          })
        }
      }
    });
  },

  // 1. 切换视图模式的按钮函数
  toggleViewMode() {
    this.setData({
      showShippedMode: !this.data.showShippedMode
    }, () => {
      // 如果切回了"待处理"Swiper 视图，重新计算高度
      if (!this.data.showShippedMode) {
        this.calcSwiperHeight(0);
      }
    });
  },

  // --- 2. 从云数据库拉取订单 ---
  loadMyOrders() {
    this.showMyLoading('同步中...');

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
      this.hideMyLoading();
      
      // [修复] 管理员：同时加载维修工单（兼容云函数未返回 repairs 的情况）
      if (this.data.isAdmin) {
        if (res && Array.isArray(res.repairs)) {
          const pendingRepairs = res.repairs.filter(i => i.status === 'PENDING');
          this.setData({ repairList: pendingRepairs });
        } else {
          // 云函数没返回 repairs，就直接从数据库拉取
          this.loadPendingRepairs();
        }
      }
      
      // 数据清洗 (保持之前的逻辑不变)
      // 注意：管理员模式下 res.data 是数组，普通用户模式下 res.data 也是数组
      const orderData = Array.isArray(res.data) ? res.data : (res.data || []);
      const formatted = orderData.map(item => {
        return {
          id: item._id,
          orderId: item.orderId,
          realStatus: item.status, 
          statusText: this.getStatusText(item.status),
          amount: item.totalFee,
          userName: item.address ? item.address.name : '匿名',
          userPhone: item.address ? item.address.phone : '',
          userAddr: item.address ? item.address.address : '',
          goodsList: item.goodsList || [],
          createTime: this.formatTime(item.createTime),
          trackingId: item.trackingId || ""
        };
      });

      // === 【核心修改：管理员数据分流】 ===
      if (this.data.isAdmin) {
        // 1. 待发货列表 (只看 PAID)
        const pending = formatted.filter(i => i.realStatus === 'PAID');
        
        // 2. 已发货列表 (看 SHIPPED 和 SIGNED)，UNPAID 直接丢弃不看
        const shipped = formatted.filter(i => i.realStatus === 'SHIPPED' || i.realStatus === 'SIGNED');

        this.setData({ 
          pendingList: pending,
          shippedList: shipped,
          orders: [] // 管理员不使用这个混杂的数组了
        }, () => {
          // 【修改】数据存完了，界面画完了，再算高度
          // 只有在"待处理"视图下才算
          if (!this.data.showShippedMode) {
             this.calcSwiperHeight(0);
          }
        });
        
        console.log('待发货:', pending.length, '已发货:', shipped.length);
      } else {
        // 普通用户看所有
        this.setData({ orders: formatted }, () => {
           // 【修改】
           this.calcSwiperHeight(0);
        });
      }

    }).catch(err => {
      this.hideMyLoading();
      console.error(err);
    });
  },

  // [新增] 管理员：加载待处理维修工单
  loadPendingRepairs() {
    const db = wx.cloud.database();
    db.collection('shouhou_repair')
      .where({ status: 'PENDING' })
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
    if (status === 'PAID') return 0;   // 已支付(待发货)
    if (status === 'SHIPPED') return 1; // 已发货
    return 2; // 已签收
  },

  // 辅助：状态转中文 (确保这里的对应关系正确)
  getStatusText(status) {
    if (status === 'UNPAID') return '待付款';
    if (status === 'PAID') return '待发货';   // 只有这个状态才显示"录入单号"
    if (status === 'SHIPPED') return '运输中';
    if (status === 'SIGNED') return '已完成';
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

  // 1. [调试] 模拟支付成功 (直接改数据库状态)
  debugSimulatePay(e) {
    const id = e.currentTarget.dataset.id;
    this.showMyLoading('模拟支付中...');

    // 直接调用云函数强行改状态
    wx.cloud.callFunction({
      name: 'adminUpdateOrder', // 复用之前的更新函数
      data: {
        id: id,
        action: 'simulate_pay' // 需要去云函数里加这个 case
      },
      success: res => {
        this.hideMyLoading();
        this.showMyDialog({ title: '模拟成功', content: '订单状态已更新' });
        this.loadMyOrders(); // 刷新列表
      },
      fail: err => {
        this.hideMyLoading();
        // 【修改】把错误打印在控制台，截图给我看
        console.error("模拟支付失败，详细报错:", err); 
        
        // 把 err.errMsg 弹出来，这样我就知道具体错哪了
        this.showMyDialog({ 
          title: '调用失败', 
          content: err.errMsg || JSON.stringify(err),
          showCancel: false
        });
      }
    });
  },

  // 2. [真实] 重新发起支付
  repayOrder(e) {
    const item = e.currentTarget.dataset.item;
    const { cart, orderInfo, cartTotalPrice } = getApp().globalData; // 这里其实应该传参
    
    // 简单起见，提示用户去首页重拍，或者重新调用 createOrder
    // 真正的"重新支付"需要后端支持原单号支付，比较复杂。
    // 建议这里简单处理：
    
    this.showMyDialog({
      title: '重新支付',
      content: '是否重新发起支付请求？',
      showCancel: true,
      success: (res) => {
        if(res.confirm) {
           // 这里调用和 shop.js 一样的支付逻辑
           // 由于代码复用问题，建议引导用户重新下单，或者把 shop.js 的支付逻辑抽离到 app.js
           this.showMyDialog({ title: '提示', content: '功能开发中' });
        }
      }
    })
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
    // 如果是管理员，查待发货(pendingList)；如果是用户，查全部(orders)
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
  
  // 跳转快递100查询（服务类物流说明）
  viewLogisticsDetail(e) {
    const sn = e.currentTarget.dataset.sn;
    console.log("尝试跳转查单号:", sn);

    if (!sn) {
      this.showMyDialog({ title: '提示', content: '无单号' });
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
              this.showMyDialog({ title: '失败', content: err.errMsg || '操作失败' });
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
       // 录入单号逻辑
       wx.showModal({
         title: '发货维修件',
         editable: true,
         placeholderText: '输入快递单号',
         success: (res) => {
           if (res.confirm && res.content) {
             this.updateRepairStatus(id, 'SHIPPED', res.content);
           }
         }
       });
    } else {
       // 无需录入
       wx.showModal({
         title: '确认',
         content: '将通知用户"查看维修教程可修复"，确定吗？',
         success: (res) => {
           if (res.confirm) {
             this.updateRepairStatus(id, 'TUTORIAL');
           }
         }
       });
    }
  },

  // 更新数据库状态
  updateRepairStatus(id, status, trackingId = '') {
    wx.showLoading({ title: '处理中...' });
    const db = wx.cloud.database();
    db.collection('shouhou_repair').doc(id).update({
      data: {
        status: status,
        trackingId: trackingId,
        solveTime: db.serverDate()
      }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '处理完成', icon: 'success' });
      this.loadMyOrders(); // 刷新订单列表
      // 如果是用户模式，也刷新申请进度
      if (!this.data.isAdmin) {
        this.loadMyActivities();
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('更新失败:', err);
      wx.showToast({ title: '处理失败', icon: 'none' });
    });
  },

  adminModifyPrice(e) {
    // 如果不是管理员，或者订单不是"待付款"或"待发货"状态，不让改
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
    wx.setClipboardData({
      data: text,
      success: () => {
        // 先干掉系统“已复制”toast，避免和自定义弹窗打架
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 60);
        // 使用统一的“内容已复制”大弹窗
        this.setData({ showCopySuccessModal: true });
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
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

  // 显示 Loading
  showMyLoading(title = '加载中...') {
    this.setData({ isLoading: true, loadingText: title });
  },

  // 隐藏 Loading
  hideMyLoading() {
    this.setData({ isLoading: false });
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
  startConnect() {
    if (this.data.bluetoothReady) return; // 已连接就不点了

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
        this.showMyDialog({ title: '提示', content: '请开启手机蓝牙' });
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
      this.showMyDialog({ title: '错误', content: '无法识别SN码' });
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
            this.showMyDialog({ title: '提示', content: '验证通过，请填表' });
            
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
        this.showMyDialog({ title: '错误', content: '网络校验失败' });
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
            this.showMyDialog({ title: '上传失败', content: err.errMsg || '请重试' });
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
      this.showMyDialog({ title: '提示', content: '请先连接MT设备' });
      return;
    }

    // B. 校验型号
    if (this.data.modelIndex === null) {
      this.showMyDialog({ title: '提示', content: '请选择型号' });
      return;
    }

    // C. 校验图片 (购买截图必传)
    if (!this.data.imgReceipt) {
      this.showMyDialog({ title: '提示', content: '请上传购买截图' });
      return;
    }
    // 如果是二手，校验聊天记录
    if (this.data.bindType === 'used' && !this.data.imgChat) {
      this.showMyDialog({ title: '提示', content: '请上传聊天记录' });
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
      this.showMyDialog({ title: '提交失败', content: err.errMsg || '网络错误，请重试' });
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
                this.showMyDialog({ title: '失败', content: res.result.msg });
              }
            },
            fail: err => {
              this.hideMyLoading();
              this.showMyDialog({ title: '错误', content: '网络异常' });
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
          this.showMyDialog({ title: '失败', content: res.result.errMsg });
        }
      },
      fail: err => {
        this.hideMyLoading();
        console.error(err);
        this.showMyDialog({ title: '操作失败', content: err.errMsg || '网络错误，请重试' });
      }
    });
  },

  // 加载审核记录
  loadMyActivities() {
    console.log('🔍 [loadMyActivities] 开始加载申请记录');
    
    // 🔴 确保已获取 openid
    if (!this.data.myOpenid) {
      console.warn('⚠️ [loadMyActivities] myOpenid 未获取，等待获取后再查询');
      // 如果还没获取到，延迟一下再试
      setTimeout(() => {
        if (this.data.myOpenid) {
          this.loadMyActivities();
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

    Promise.all([p1, p2, p3]).then(res => {
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
        
        if (i.status === 'SHIPPED') {
          statusText = '维修件已发货';
          statusClass = 'success';
          statusNum = 1; // 已处理
        } else if (i.status === 'TUTORIAL') {
          statusText = '查看教程可修复'; // 用户看到这个状态
          statusClass = 'info'; // 蓝色
          statusNum = 1; // 已处理
        } else if (i.status === 'PENDING') {
          statusText = '审核中';
          statusClass = 'processing';
          statusNum = 0; // 审核中
        }
        
        return {
          ...i,
          type: 'repair',
          title: '故障报修: ' + (i.model || '未知型号'),
          statusText: statusText, // 自定义显示文本
          statusClass: statusClass,
          status: statusNum, // 统一状态值
          originalCreateTime: i.createTime,
          createTime: i.createTime ? this.formatTimeSimple(i.createTime) : '刚刚',
          trackingId: i.trackingId || '' // 确保有 trackingId 字段
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
      
      this.setData({ myActivityList: filtered }, () => {
        console.log('✅ [loadMyActivities] 数据已更新到页面，当前 myActivityList 长度:', this.data.myActivityList.length);
      });
    }).catch(err => {
      console.error('❌ [loadMyActivities] 加载申请记录失败:', err);
      wx.showToast({ title: '加载失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 });
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
              this.showMyDialog({ title: '操作失败', content: '网络错误，请重试' });
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
