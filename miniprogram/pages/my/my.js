const app = getApp();

Page({
  data: {
    currentOrderIndex: 0,
    showModal: false,
    bluetoothReady: false,
    modelOptions: ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'],
    modelIndex: null,
    buyDate: '',
    
    // 蓝牙相关状态
    isScanning: false,      // 是否正在扫描(控制动画)
    connectStatusText: '📡 点击连接蓝牙设备',
    currentSn: '', // 【新增】用来存提取出来的纯数字SN
    
    // 图片路径
    imgReceipt: '', // 购买截图
    imgChat: '',    // 聊天记录

    // 这里先留空，等 onShow 自动去云端拉取
    orders: [],

    // 模拟设备数据 (这个暂时保持静态，后续也可以上云)
    deviceList: [
      { name: 'F2 PRO Long', sn: 'F2L-882019902', days: 482, hasExtra: true, expiryDate: '2026-12-15', activations: 12, firmware: 'v3.2.1' },
      { name: 'F1 MAX', sn: 'F1M-110293308', days: 28, hasExtra: false, expiryDate: '2026-01-20', activations: 1, firmware: 'v1.0.5' }
    ],

    isAuthorized: false, // 是否是授权管理员
    isAdmin: false,      // 是否开启了管理模式
    
    // 【新增】控制视图模式
    showShippedMode: false, // false=显示待发货(横滑), true=显示已发货(竖滑)
    
    // 【新增】拆分数据源
    pendingList: [], // 待发货 (PAID)
    shippedList: [], // 已发货 + 已完成 (SHIPPED + SIGNED)
    
    // 普通用户还是用这个
    orders: [],
    
    // Swiper 动态高度
    swiperHeight: 900 // 默认高度，单位 px
  },

  onLoad() {
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
    wx.showLoading({ title: '同步中...' });

    const getAction = this.data.isAdmin 
      ? wx.cloud.callFunction({ name: 'adminGetOrders' }) 
      : wx.cloud.database().collection('shop_orders').orderBy('createTime', 'desc').get();

    const promise = this.data.isAdmin ? getAction.then(res => res.result) : getAction;

    promise.then(res => {
      wx.hideLoading();
      
      // 数据清洗 (保持之前的逻辑不变)
      const formatted = res.data.map(item => {
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
      wx.hideLoading();
      console.error(err);
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

  // 1. [新增] 用户取消订单
  userCancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '取消订单',
      content: '确定要取消并删除该订单吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          
          // 调用云函数删除订单
          wx.cloud.callFunction({
            name: 'adminUpdateOrder',
            data: { id: id, action: 'delete' },
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '已取消' });
              this.loadMyOrders(); // 刷新列表，订单消失
            },
            fail: err => {
              wx.hideLoading();
              console.error(err);
            }
          });
        }
      }
    });
  },

  // 2. [新增] 管理员点击金额改价
  adminModifyPrice(e) {
    // 如果不是管理员，或者订单不是"待付款"或"待发货"状态，不让改
    const status = e.currentTarget.dataset.status;
    if (!this.data.isAdmin || (status !== 'UNPAID' && status !== 'PAID')) return;

    const id = e.currentTarget.dataset.id;
    const currentPrice = e.currentTarget.dataset.price;

    wx.showModal({
      title: '修改订单金额',
      content: `当前金额：¥${currentPrice}`,
      editable: true,
      placeholderText: '输入新金额 (如 888)',
      success: (res) => {
        if (res.confirm && res.content) {
          const price = parseFloat(res.content);
          if (isNaN(price) || price < 0) {
            return wx.showToast({ title: '金额无效', icon: 'none' });
          }

          wx.showLoading({ title: '正在改价...' });
          
          wx.cloud.callFunction({
            name: 'adminUpdateOrder',
            data: { 
              id: id, 
              action: 'update_price',
              newPrice: price
            },
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '改价成功', icon: 'success' });
              this.loadMyOrders(); // 刷新显示新价格
            },
            fail: err => {
              wx.hideLoading();
              wx.showToast({ title: '改价失败', icon: 'none' });
            }
          });
        }
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
      wx.hideLoading();
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
        wx.showToast({ title: '请开启手机蓝牙', icon: 'none' });
        this.setData({ isScanning: false, connectStatusText: '请开启蓝牙后重试' });
      });
  },

  // --- 核心业务：处理设备绑定 (连接成功后调用) ---
  handleDeviceBound(device) {
    const deviceName = device.name || device.localName || '';
    
    // 扫描时识别的是 NB 开头，但连接后显示为 MT
    // 如果设备名是 NB 开头，提取后面的部分作为 SN
    // 如果设备名是 MT 开头，也提取后面的部分作为 SN
    let sn = '';
    
    if (deviceName.toUpperCase().startsWith('NB')) {
      // NB 开头的设备，去掉 NB 前缀，剩下的就是 SN
      sn = deviceName.replace(/^NB/i, '').trim();
    } else if (deviceName.toUpperCase().startsWith('MT')) {
      // MT 开头的设备，去掉 MT 前缀
      sn = deviceName.replace(/^MT/i, '').trim();
    } else {
      // 既不是 NB 也不是 MT，可能是误连
      console.log('非目标设备，忽略:', deviceName);
      return;
    } 

    if (!sn) {
      wx.showModal({ title: '错误', content: 'SN码解析失败', showCancel: false });
      this.ble.disconnect();
      return;
    }

    // 存到 data 里，给后面的提交按钮用
    // 显示时使用 MT + SN 格式
    const displayName = 'MT' + sn;
    this.setData({ 
      currentSn: sn,
      connectStatusText: `正在验证: ${displayName}` 
    });

    // 调用之前的 bindDevice 云函数 (锁定设备)
    // 这一步是 "抢占设备"，防止别人连
    // 注意：云函数中存储的 deviceName 使用 MT 前缀显示
    wx.cloud.callFunction({
      name: 'bindDevice', // 这个云函数保持之前的逻辑，它负责存 sn 集合
      data: {
        sn: sn,
        deviceName: displayName // 存储时使用 MT + SN
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '设备验证通过', icon: 'success' });
          this.setData({ 
            isScanning: false,
            bluetoothReady: true,
            connectStatusText: `✅ 已连接: ${displayName}` 
          });
        } else {
          wx.showModal({ title: '绑定失败', content: res.result.msg, showCancel: false });
          this.ble.disconnect();
        }
      },
      fail: () => {
        this.ble.disconnect();
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
        wx.showLoading({ title: '上传中...' });
        
        // 上传到云存储
        const cloudPath = `proofs/${Date.now()}-${Math.floor(Math.random()*1000)}.png`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempPath,
          success: uploadRes => {
            wx.hideLoading();
            // 更新页面显示
            if (type === 'receipt') {
              this.setData({ imgReceipt: uploadRes.fileID });
            } else {
              this.setData({ imgChat: uploadRes.fileID });
            }
          },
          fail: err => {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
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
      return wx.showToast({ title: '请先连接MT设备', icon: 'none' });
    }

    // B. 校验型号
    if (this.data.modelIndex === null) {
      return wx.showToast({ title: '请选择型号', icon: 'none' });
    }

    // C. 校验图片 (购买截图必传)
    if (!this.data.imgReceipt) {
      return wx.showToast({ title: '请上传购买截图', icon: 'none' });
    }
    // 如果是二手，校验聊天记录
    if (this.data.bindType === 'used' && !this.data.imgChat) {
      return wx.showToast({ title: '请上传聊天记录', icon: 'none' });
    }

    wx.showLoading({ title: '提交中...' });

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
      wx.hideLoading();
      wx.showModal({
        title: '提交成功',
        content: '您的绑定申请已提交，审核通过后生效。',
        showCancel: false,
        success: () => {
          this.closeBindModal();
          // 清空表单
          this.setData({
            imgReceipt: '',
            imgChat: '',
            modelIndex: null,
            bluetoothReady: false,
            currentSn: ''
          });
          // 断开蓝牙
          if(this.ble) this.ble.disconnect();
        }
      });
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '提交失败', icon: 'none' });
    });
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
