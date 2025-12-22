const app = getApp();

Page({
  data: {
    currentOrderIndex: 0,
    showModal: false,
    bluetoothReady: false,
    modelOptions: ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'],
    modelIndex: null,
    buyDate: '',

    // 这里先留空，等 onShow 自动去云端拉取
    orders: [],

    // 模拟设备数据 (这个暂时保持静态，后续也可以上云)
    deviceList: [
      { name: 'F2 PRO Long', sn: 'F2L-882019902', days: 482, hasExtra: true, expiryDate: '2026-12-15', activations: 12, firmware: 'v3.2.1' },
      { name: 'F1 MAX', sn: 'F1M-110293308', days: 28, hasExtra: false, expiryDate: '2026-01-20', activations: 1, firmware: 'v1.0.5' }
    ],

    isAuthorized: false, // 是否是授权管理员
    isAdmin: false,      // 是否开启了管理模式
  },

  // --- 1. 页面显示时，加载云端数据 ---
  onShow() {
    this.checkAdminPrivilege(); // 登录时检查权限
    this.loadMyOrders();
  },

  // ================== 权限检查逻辑 ==================
  async checkAdminPrivilege() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      const db = wx.cloud.database();
      const adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      if (adminCheck.data.length > 0) {
        this.setData({ 
          isAuthorized: true, 
          isAdmin: true 
        });
        // 权限确认后，立刻重新加载订单，这样才能切到管理员视图
        this.loadMyOrders();
      }
    } catch (err) {
      console.error('[my.js] 权限检查失败', err);
    }
  },

  // ================== 管理员发货功能 ==================
  // 1. 修复：发货逻辑改用云函数 (之前是前端直连，没权限改别人的)
  adminShipOrder(e) {
    const orderId = e.currentTarget.dataset.id; // 数据库 _id
    
    wx.showModal({
      title: '录入快递单号',
      editable: true,
      placeholderText: '请输入顺丰/圆通单号',
      success: (res) => {
        if (res.confirm && res.content) {
          const sn = res.content.trim();
          wx.showLoading({ title: '正在同步...' });

          // 【核心修改】调用云函数去修改，而不是直接 db.update
          wx.cloud.callFunction({
            name: 'adminUpdateOrder',
            data: {
              id: orderId,
              action: 'ship',
              trackingId: sn
            },
            success: r => {
              wx.hideLoading();
              wx.showToast({ title: '发货成功' });
              this.loadMyOrders(); // 刷新列表
            },
            fail: err => {
              wx.hideLoading();
              wx.showModal({ title: '失败', content: err.toString() });
            }
          })
        }
      }
    });
  },

  // --- 2. 从云数据库拉取订单 ---
  loadMyOrders() {
    wx.showLoading({ title: '同步订单...' });

    // 1. 判断身份，决定查谁的数据
    // 管理员 -> 调云函数 (看全部)
    // 普通用户 -> 查数据库 (看自己)
    let getAction;
    
    if (this.data.isAdmin) {
      console.log('我是管理员，正在获取全量订单...');
      getAction = wx.cloud.callFunction({ name: 'adminGetOrders' }).then(res => res.result);
    } else {
      console.log('我是普通用户，正在获取我的订单...');
      const db = wx.cloud.database();
      getAction = db.collection('shop_orders').orderBy('createTime', 'desc').get();
    }

    // 2. 执行查询并处理数据
    getAction.then(res => {
      wx.hideLoading();
      console.log('订单数据获取成功:', res.data);

      if (!res.data || res.data.length === 0) {
        this.setData({ orders: [] });
        return;
      }

      const formatted = res.data.map(item => {
        return {
          id: item._id, // 数据库ID
          orderId: item.orderId, // 订单号
          
          // 核心：拿到真实状态
          realStatus: item.status, 
          // 转换中文显示
          statusText: this.getStatusText(item.status), 
          
          amount: item.totalFee,
          // 防止地址为空报错
          userName: item.address ? item.address.name : '匿名',
          userPhone: item.address ? item.address.phone : '',
          userAddr: item.address ? item.address.address : '',
          goodsList: item.goodsList || [],
          createTime: this.formatTime(item.createTime),
          trackingId: item.trackingId || ""
        };
      });

      this.setData({ orders: formatted });
      
    }).catch(err => {
      wx.hideLoading();
      console.error('加载订单失败:', err);
      wx.showToast({ title: '同步失败', icon: 'none' });
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
    wx.showLoading({ title: '模拟支付中...' });

    // 直接调用云函数强行改状态
    wx.cloud.callFunction({
      name: 'adminUpdateOrder', // 复用之前的更新函数
      data: {
        id: id,
        action: 'simulate_pay' // 需要去云函数里加这个 case
      },
      success: res => {
        wx.hideLoading();
        wx.showToast({ title: '模拟成功', icon: 'success' });
        this.loadMyOrders(); // 刷新列表
      },
      fail: err => {
        wx.hideLoading();
        // 【修改】把错误打印在控制台，截图给我看
        console.error("模拟支付失败，详细报错:", err); 
        
        // 把 err.errMsg 弹出来，这样我就知道具体错哪了
        wx.showModal({ 
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
    
    wx.showModal({
      title: '重新支付',
      content: '是否重新发起支付请求？',
      success: (res) => {
        if(res.confirm) {
           // 这里调用和 shop.js 一样的支付逻辑
           // 由于代码复用问题，建议引导用户重新下单，或者把 shop.js 的支付逻辑抽离到 app.js
           wx.showToast({ title: '功能开发中', icon: 'none' });
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
  },
  
  // 跳转快递100查询（服务类物流说明）
  viewLogisticsDetail(e) {
    const sn = e.currentTarget.dataset.sn;
    console.log("尝试跳转查单号:", sn);

    if (!sn) return wx.showToast({ title: '无单号', icon: 'none' });

    wx.navigateToMiniProgram({
      // 👇👇👇【这里也要改】把 a 改成 c 👇👇👇
      appId: 'wx6885acbedba59c14', 
      path: `pages/result/result?nu=${sn}&querysource=third_xcx`, // 加上 querysource 更稳
      envVersion: 'release', 
      success(res) {
        console.log('跳转成功');
      },
      fail(err) {
        console.error('跳转失败', err);
        wx.showModal({
          title: '跳转失败',
          // 把错误打印出来看，通常是因为 app.json 没生效
          content: err.errMsg, 
          showCancel: false
        });
      }
    });
  },

  // --- 复制 ---
  copyData(e) {
    const text = e.currentTarget.dataset.text;
    if(!text) return;
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'none' })
    });
  },

  // --- 申请退款 ---
  onRefund() {
    wx.showModal({
      title: '申请退款',
      content: '请联系客服进行人工退款审核。',
      confirmText: '联系客服',
      success: (res) => {
        if(res.confirm) {
          // 可以在这里跳转客服
        }
      }
    });
  },

  // --- 绑定设备相关逻辑 ---
  openBindModal() { this.setData({ showModal: true }); },
  closeBindModal() { this.setData({ showModal: false }); },

  startConnect() {
    this.setData({ bluetoothReady: false });
    wx.showLoading({ title: '搜索中...' });
    setTimeout(() => {
      wx.hideLoading();
      this.setData({ bluetoothReady: true });
    }, 1500);
  },

  changeBindType(e) {
    this.setData({ bindType: e.currentTarget.dataset.type });
  },

  onModelChange(e) { this.setData({ modelIndex: e.detail.value }); },
  onDateChange(e) { this.setData({ buyDate: e.detail.value }); },

  removeDevice(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '解除绑定',
      content: '确定要移除该设备并放弃相关质保权益吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          let list = this.data.deviceList;
          list.splice(index, 1);
          this.setData({ deviceList: list });
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
  }

});
