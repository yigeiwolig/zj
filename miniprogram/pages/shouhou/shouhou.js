// pages/shouhou/shouhou.js
// 通用测试视频地址（可替换为你自己的云存储链接）
const TEST_VIDEO_URL = "https://wxsnsdy.tc.qq.com/105/20210/snsdyvideodownload?filekey=30280201010421301f0201690402534804102ca905ce620b1241b726bc41dcff44e00204012882540400&bizid=1023&hy=SH&fileparam=302c020101042530230204136ffd93020457e3c4ff02024ef202031e8d7f02030f42400204045a320a0201000400";

// 配件数据 - 按型号独立存储
const DB_PARTS = {
  'F1 PRO': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
  'F1 MAX': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
  'F2 PRO': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 MAX': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 PRO Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 MAX Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"]
};

// 视频数据 - 按组同步（同组型号共享视频）
// 分组：F1 PRO + F1 MAX 一组，F2 PRO + F2 MAX 一组，F2 PRO Long + F2 MAX Long 一组
const VIDEO_GROUPS = {
  'F1': ['F1 PRO', 'F1 MAX'],           // F1 组
  'F2': ['F2 PRO', 'F2 MAX'],           // F2 组
  'F2 Long': ['F2 PRO Long', 'F2 MAX Long'] // F2 Long 组
};

// 型号到组的映射
const MODEL_TO_GROUP = {
  'F1 PRO': 'F1',
  'F1 MAX': 'F1',
  'F2 PRO': 'F2',
  'F2 MAX': 'F2',
  'F2 PRO Long': 'F2 Long',
  'F2 MAX Long': 'F2 Long'
};

// 本地视频数据（已清空演示视频）
const DB_VIDEOS = {
  'F1 PRO': [],
  'F1 MAX': [],
  'F2 PRO': [],
  'F2 MAX': [],
  'F2 PRO Long': [],
  'F2 MAX Long': []
};

// 密码 - 按型号独立设置（可以设置不同密码）
const CODES = { 
  'F1 PRO': '123456', 
  'F1 MAX': '123456',
  'F2 PRO': '456789',
  'F2 MAX': '456789',
  'F2 PRO Long': '456789',
  'F2 MAX Long': '456789'
};
const ADMIN_PASSWORD = '3252955872'; // 管理员密码

// 拖拽相关常量
const DRAG_CONFIG = {
  LONG_PRESS_DELAY: 300,    // 长按触发延迟（ms）
  MOVE_THRESHOLD: 10,       // 移动阈值（px），超过此值取消长按定时器
  CARD_HEIGHT_RPX: 540,     // 卡片总高度（rpx）
  VIBRATE_INTERVAL: 200     // 震动反馈最小间隔（ms），避免过于频繁
};

Page({
  data: {
    inDetail: false,
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式

    // 当前页面状态
    currentModelName: '',
    currentSeries: '', // F1 或 F2
    activeTab: 'order', // order 或 tutorial
    serviceType: 'parts', // parts 或 repair

    // 数据列表
    currentPartsList: [],
    currentVideoList: [],

    // 选中状态
    selectedCount: 0,
    totalPrice: 0, // [新增] 总价

    // 表单数据
    contactName: '',
    contactPhone: '',
    contactAddr: '',
    contactWechat: '',
    videoFileName: '',
    repairDescription: '', // 故障描述
    
    // [新增] 订单信息（统一格式）
    orderInfo: { name: '', phone: '', address: '' },

    // 密码锁
    isLocked: true,
    passInput: '',
    passError: false,
    focusPass: false,

    // 弹窗
    showModal: false,
    modalMode: '', // part 或 video
    modalInputVal: '',

    // 全局自定义弹窗
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },

    // 自定义视频预览弹窗
    showVideoPreview: false,
    

    // 临时视频信息
    tempVideoPath: '',

    // 上传视频封面预览
    tempVideoThumb: '',

    // 联系信息折叠
    isContactExpanded: true,

    // 当前正在播放的视频索引 (-1 表示都没播)
    playingIndex: -1,

    // 是否正在提取封面
    extractingThumb: false,

    // 拖拽排序相关
    dragIndex: -1,        // 当前拖拽的卡片索引
    dragStartY: 0,        // 拖拽开始时的Y坐标（相对于页面）
    dragCurrentY: 0,      // 当前拖拽的Y坐标
    dragOffsetY: 0,       // 拖拽偏移量（用于动画，单位px）
    isDragging: false,    // 是否正在拖拽
    longPressTimer: null, // 长按定时器
    lastSwapIndex: -1,    // 上次交换的位置，避免重复交换
    lastVibrateTime: 0,   // 上次震动时间，用于节流
    
    // 状态栏高度
    statusBarHeight: 0,

    // [新增] 智能粘贴弹窗相关
    showSmartPasteModal: false,
    smartPasteVal: '',
    
    // [新增] 购物车相关 (为了复用 shop 页面的 UI)
    cart: [],
    cartTotalPrice: 0,
    finalTotalPrice: 0,
    showOrderModal: false,
    popupAnimationActive: false, // 专门控制弹窗动画状态
    tempBuyItemIds: [], // 记录立即购买的临时ID
    showCartSuccess: false, // [新增] 控制成功弹窗

    // [新增] 运费与地址逻辑
    detailAddress: '',    // 详细地址，如 '广东省 佛山市 南海区 某某街道101号'

    shippingMethod: 'zto',// 默认中通
    shippingFee: 0,

    // [新增] 自定义加载动画
    showLoadingAnimation: false
  },

  // 页面加载时初始化
  onLoad() {
    // 🔴 物理防线：确保录屏、截屏出来的全是黑屏 (这是最稳的)
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('🛡️ 硬件级防偷拍锁定')
      });
    }

    // 🔴 截屏监听：安卓和iOS通常都很灵敏
    wx.onUserCaptureScreen(() => {
      this.handleIntercept('screenshot');
    });

    // 🔴 录屏监听：尽力而为，抓到信号就跳
    if (wx.onUserScreenRecord) {
      wx.onUserScreenRecord(() => {
        this.handleIntercept('record');
      });
    }

    // 初始化云数据库
    if (wx.cloud) {
      this.db = wx.cloud.database();
    }
    
    // 检查管理员权限
    this.checkAdminPrivilege();
    
    // 缓存系统信息，避免拖拽时重复调用
    const systemInfo = wx.getSystemInfoSync();
    this._systemInfo = systemInfo;
    this._cardHeightPx = DRAG_CONFIG.CARD_HEIGHT_RPX * (systemInfo.screenWidth / 750);
    
    // 获取状态栏高度，用于适配导航栏
    // 如果没有状态栏高度，使用安全区域，如果都没有，默认 44px（iPhone X 系列）
    const statusBarHeight = systemInfo.statusBarHeight || 44;
    this.setData({ statusBarHeight });
    console.log('状态栏高度:', statusBarHeight);
  },
  
  onShow() {
    // 针对进入页面前就在录屏的情况，尝试抓一次
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

  // ================== 权限检查逻辑 ==================
  async checkAdminPrivilege() {
    try {
      // 1. 获取当前用户的 OpenID (利用云函数)
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;

      // 2. 去数据库比对白名单
      const db = wx.cloud.database();
      const adminCheck = await db.collection('guanliyuan').where({
        openid: myOpenid
      }).get();

      // 3. 如果找到了记录，说明你是受信任的管理员
      if (adminCheck.data.length > 0) {
        this.setData({ isAuthorized: true });
        console.log('[shouhou.js] 身份验证成功：合法管理员');
      } else {
        console.log('[shouhou.js] 未在管理员白名单中');
      }
    } catch (err) {
      console.error('[shouhou.js] 权限检查失败', err);
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      getApp().showDialog({ title: '提示', content: '无权限' });
      return;
    }
    
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    
    getApp().showDialog({
      title: '提示',
      content: nextState ? '管理模式开启' : '已回到用户模式',
      showCancel: false
    });
  },


  // ================= 自定义弹窗工具 =================
  showMyDialog({ title = '提示', content = '', showCancel = false, confirmText = '确定', cancelText = '取消', callback = null, maskClosable = true } = {}) {
    this.setData({
      dialog: { show: true, title, content, showCancel, confirmText, cancelText, callback, maskClosable }
    });
  },
  closeCustomDialog() {
    this.setData({ dialog: { ...this.data.dialog, show: false, callback: null } });
  },
  onDialogConfirm() {
    const cb = this.data.dialog && this.data.dialog.callback;
    getApp().hideDialog();
    if (typeof cb === 'function') cb();
  },
  onDialogMaskTap() {
    if (this.data.dialog && this.data.dialog.maskClosable) {
      getApp().hideDialog();
    }
  },
  noop() {},

  // ================= 视频预览 =================
  openVideoPreview() {
    if (!this.data.tempVideoPath) return;
    this.setData({ showVideoPreview: true });
  },
  closeVideoPreview() {
    this.setData({ showVideoPreview: false });
  },

  // 删除已选择的故障视频
  removeRepairVideo(e) {
    // 阻止触发 chooseVideo
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    this.setData({
      tempVideoPath: '',
      tempVideoThumb: '',
      videoFileName: '',
      extractingThumb: false
    });
  },

  // 页面卸载时清理
  onUnload() {
    this._cleanupDrag();
  },

  // 页面隐藏时清理（防止拖拽过程中切换页面）
  onHide() {
    this._cleanupDrag();
  },

  // 清理拖拽状态
  _cleanupDrag() {
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.data.longPressTimer = null;
    }
    if (this.data.isDragging) {
      this.setData({
        isDragging: false,
        dragIndex: -1,
        dragStartY: 0,
        dragCurrentY: 0,
        dragOffsetY: 0,
        lastSwapIndex: -1
      });
    }
  },

  // 1. 首页逻辑（已废弃点击计数逻辑）
  triggerAdmin() {
    // 废弃旧逻辑，不再使用
  },

  enterModel(e) {
    const { name, series } = e.currentTarget.dataset;
    // 使用 modelName 作为唯一标识，每个型号数据完全独立
    this.setData({
      currentModelName: name,
      currentSeries: series, // 保留 series 用于显示，但数据查询使用 modelName
      inDetail: true,
      activeTab: 'order',
      serviceType: 'parts',
      playingIndex: -1,
      currentVideoList: [], // 立即清空视频列表，避免显示旧数据
      selectedCount: 0,
      totalPrice: 0 // 重置总价
    });
    this.loadParts(name); // 改用新的 loadParts 函数
    this.resetLock();
  },

  exitModel() {
    // 直接返回选择界面，不需要管理员模式
    this.setData({ inDetail: false, playingIndex: -1 });
    this.setData({
      contactName: '', contactPhone: '', contactAddr: '', contactWechat: '', videoFileName: '', repairDescription: ''
    });
  },

  // 返回上一页
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      // 如果没有上一页，跳转到首页
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 2. 详情页逻辑
  switchTab(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ activeTab: mode });
    if (mode === 'order') {
      this.renderParts();
    }
    // 切换到教程页时重置播放状态并重新加载视频
    if (mode === 'tutorial') {
      this.setData({ 
        playingIndex: -1,
        currentVideoList: [] // 先清空，避免显示旧数据
      });
      if (!this.data.isLocked) {
        // 延迟一点再加载，确保状态已更新
        setTimeout(() => {
          this.renderVideos();
        }, 50);
      }
    }
  },

  toggleService(e) {
    this.setData({ serviceType: e.currentTarget.dataset.type });
  },

  // 3. 加载配件 (支持云端价格) - 新版本
  loadParts(modelName) {
    if (!modelName) {
      console.error('型号名称未设置');
      return;
    }
    
    const db = wx.cloud.database();
    
    // 从 shouhou 集合读取，如果没有就用本地默认
    db.collection('shouhou').where({ modelName: modelName }).get().then(res => {
      let parts = [];
      
      if (res.data.length > 0) {
        // 云端有数据 (包含自定义价格)
        parts = res.data.map(item => ({
          _id: item._id,
          name: item.name,
          price: item.price || 0, // 云端价格
          modelName: item.modelName,
          order: item.order || 0,
          selected: false
        }));
        // 按 order 排序
        parts.sort((a, b) => (a.order || 0) - (b.order || 0));
      } else {
        // 云端没数据，加载本地默认，价格默认为 0
        const defaultNames = DB_PARTS[modelName] || [];
        parts = defaultNames.map((name, index) => ({
          name: name,
          price: 0, // 默认价格
          modelName: modelName,
          order: index,
          selected: false
        }));
      }

      this.setData({ currentPartsList: parts });
    }).catch(err => {
      console.error('读取配件失败:', err);
      // 失败时使用本地数据
      const defaultNames = DB_PARTS[modelName] || [];
      const parts = defaultNames.map((name, index) => ({
        name: name,
        price: 0,
        modelName: modelName,
        order: index,
        selected: false
      }));
      this.setData({ currentPartsList: parts });
    });
  },

  // 保留旧的 renderParts 用于兼容（如果其他地方还在调用）
  renderParts() {
    this.loadParts(this.data.currentModelName);
  },

  // 同步配件数据到云端（按型号独立）
  syncPartsToCloud(modelName, partsList) {
    if (!this.db || !partsList || partsList.length === 0) return;
    
    // 循环单个添加配件到 shouhou 集合（更可靠）
    let addPromises = partsList.map((name, index) => {
      return this.db.collection('shouhou').add({
        data: {
          modelName: modelName, // 使用 modelName 作为唯一标识
          name: name,
          order: index,
          createTime: this.db.serverDate()
        }
      });
    });
    
    Promise.all(addPromises)
      .then(() => {
        console.log(`${modelName} 配件数据已同步到云端，共 ${partsList.length} 个`);
      })
      .catch(err => {
        console.error('同步配件失败:', err);
      });
  },

  // 一键同步所有本地配件数据到云端（管理员功能）
  syncAllPartsToCloud() {
    if (!this.data.isAdmin) {
      getApp().showDialog({ title: '提示', content: '需要管理员权限', showCancel: false });
      return;
    }

    if (!this.db) {
      getApp().showDialog({ title: '提示', content: '云服务未初始化', showCancel: false });
      return;
    }

    getApp().showDialog({
      title: '确认同步',
      content: '将同步所有6个型号（F1 PRO、F1 MAX、F2 PRO、F2 MAX、F2 PRO Long、F2 MAX Long）的配件数据到云端，是否继续？',
      showCancel: true,
      confirmText: '继续',
      cancelText: '取消',
      onConfirm: () => {
          getApp().showLoading('同步中...');
          
          // 先检查云端是否已有数据（6个独立型号）
          const allModels = ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'];
          let totalParts = 0;
          let syncedCount = 0;
          
          // 统计需要同步的配件数量
          allModels.forEach(modelName => {
            totalParts += (DB_PARTS[modelName] || []).length;
          });

          // 逐个型号同步（6个独立型号）
          const syncPromises = allModels.map(modelName => {
            const partsList = DB_PARTS[modelName] || [];
            if (partsList.length === 0) {
              return Promise.resolve();
            }

            // 先检查云端是否已有该型号的数据
            return this.db.collection('shouhou')
              .where({ modelName: modelName }) // 使用 modelName 查询
              .count()
              .then(countRes => {
                if (countRes.total > 0) {
                  // 已有数据，跳过
                  console.log(`${modelName} 已有 ${countRes.total} 个配件，跳过同步`);
                  syncedCount += partsList.length;
                  return Promise.resolve();
                } else {
                  // 没有数据，开始同步（使用循环单个添加，避免 batch 问题）
                  const addPromises = partsList.map((name, index) => {
                    return this.db.collection('shouhou').add({
                      data: {
                        modelName: modelName, // 使用 modelName 作为标识
                        name: name,
                        order: index,
                        createTime: this.db.serverDate()
                      }
                    });
                  });
                  
                  return Promise.all(addPromises)
                    .then(() => {
                      syncedCount += partsList.length;
                      console.log(`${modelName} 同步完成，共 ${partsList.length} 个配件`);
                    })
                    .catch(err => {
                      console.error(`${modelName} 同步失败:`, err);
                    });
                }
              })
              .catch(err => {
                console.error(`检查 ${modelName} 失败:`, err);
              });
          });

          // 等待所有同步完成
          Promise.all(syncPromises)
            .then(() => {
              getApp().hideDialog();
              if (syncedCount > 0) {
                getApp().showDialog({ title: '完成', content: `同步完成！共 ${syncedCount} 个配件`, showCancel: false });
                // 如果当前在详情页，重新加载配件列表
                if (this.data.inDetail && this.data.currentSeries) {
                  setTimeout(() => {
                    this.renderParts();
                  }, 500);
                }
              } else {
                getApp().showDialog({ title: '提示', content: '所有数据已存在，无需同步', showCancel: false });
              }
            })
            .catch(err => {
              getApp().hideDialog();
              console.error('同步过程出错:', err);
              getApp().showDialog({ title: '提示', content: '同步失败，请重试', showCancel: false });
            });
      }
    });
  },

  // 4. 选择配件 & 计算总价
  togglePart(e) {
    if (e.target.dataset.type === 'del') return;
    const idx = e.currentTarget.dataset.index;
    const list = this.data.currentPartsList;
    
    list[idx].selected = !list[idx].selected;
    
    // 计算
    let count = 0;
    let total = 0;
    list.forEach(p => {
      if (p.selected) {
        count++;
        total += Number(p.price || 0);
      }
    });

    this.setData({
      currentPartsList: list,
      selectedCount: count,
      totalPrice: total
    });
  },

  // [修改] 管理员编辑配件（点击铅笔触发）
  adminEditPartPrice(e) {
    if (!this.data.isAdmin) return;

    const idx = e.currentTarget.dataset.index;
    const part = this.data.currentPartsList[idx];

    // 1. 弹出菜单让选
    wx.showActionSheet({
      itemList: ['修改名称', '修改价格'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showEditModal('name', part);  // 改名
        } else if (res.tapIndex === 1) {
          this.showEditModal('price', part); // 改价
        }
      }
    });
  },

  // [新增] 显示输入弹窗
  showEditModal(type, part) {
    const title = type === 'name' ? '修改配件名称' : '修改价格';
    // 如果是改名，填入旧名字；如果是改价，填入旧价格
    const defaultVal = type === 'name' ? part.name : String(part.price || 0);

    wx.showModal({
      title: title,
      editable: true,
      placeholderText: `请输入新的${type === 'name' ? '名称' : '价格'}`,
      content: defaultVal, // 预填旧值
      success: (res) => {
        if (res.confirm && res.content) {
          // 执行更新
          this.updatePartData(part, type, res.content);
        }
      }
    });
  },

  // [新增] 执行数据库更新
  updatePartData(part, type, value) {
    getApp().showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    
    // 准备要更新的数据
    let dataToUpdate = {};
    if (type === 'price') {
      dataToUpdate.price = Number(value); // 价格转数字
    } else {
      dataToUpdate.name = value; // 名字保持字符串
    }

    // A. 如果是云端已有数据 (有 _id)，直接更新
    if (part._id) {
      db.collection('shouhou').doc(part._id).update({
        data: dataToUpdate
      }).then(() => {
        this.afterUpdateSuccess();
      }).catch(err => {
        getApp().hideLoading();
        wx.showToast({ title: '更新失败', icon: 'none' });
        console.error(err);
      });
    } 
    // B. 如果是本地默认数据 (还没存过云端)
    else {
      // 需要先新建一条完整的记录
      db.collection('shouhou').add({
        data: {
          modelName: this.data.currentModelName,
          name: type === 'name' ? value : part.name, // 如果改名就用新名
          price: type === 'price' ? Number(value) : (part.price || 0), // 如果改价就用新价
          order: part.order || 0,
          createTime: db.serverDate()
        }
      }).then(() => {
        this.afterUpdateSuccess();
      }).catch(err => {
        getApp().hideLoading();
        wx.showToast({ title: '新建失败', icon: 'none' });
        console.error(err);
      });
    }
  },

  // [新增] 更新成功后的刷新
  afterUpdateSuccess() {
    getApp().hideLoading();
    wx.showToast({ title: '修改成功', icon: 'success' });
    this.loadParts(this.data.currentModelName); // 重新拉取列表
  },

  // 管理员删除配件
  deletePart(e) {
    const idx = e.currentTarget.dataset.index;
    const modelName = this.data.currentModelName;
    const part = this.data.currentPartsList[idx];
    const partName = part.name;

    wx.showModal({
      title: '提示',
      content: `确定删除配件: ${partName}?`,
      success: (res) => {
        if (res.confirm) {
          // 从云数据库删除
          if (this.db && part._id) {
            this.db.collection('shouhou').doc(part._id).remove()
              .then(() => {
                // 重新加载配件列表
                this.loadParts(this.data.currentModelName);
                wx.showToast({ title: '已删除', icon: 'success' });
              })
              .catch(err => {
                console.error('删除失败:', err);
                wx.showToast({ title: '删除失败', icon: 'none' });
              });
          } else {
            // 本地删除（兼容旧数据）
            if (DB_PARTS[modelName]) {
              DB_PARTS[modelName].splice(idx, 1);
            }
            this.loadParts(this.data.currentModelName);
            wx.showToast({ title: '已删除', icon: 'success' });
          }
        }
      }
    });
  },

  // 视频上传模拟
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'], // 允许从相册或相机选择
      success: (res) => {
        console.log('选择视频成功:', res);
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          console.log('视频文件信息:', file);
          if (file.tempFilePath) {
            // 如果有微信自动生成的封面，直接使用
            if (file.thumbTempFilePath) {
              this.setData({ 
                videoFileName: '已选择视频 (点击重新上传)',
                tempVideoPath: file.tempFilePath,
                tempVideoThumb: file.thumbTempFilePath // 保存封面
              });
              // 静默成功（不使用原生 toast）
            } else {
              // 如果没有封面，先保存视频路径，然后尝试提取封面
              this.setData({ 
                videoFileName: '已选择视频 (点击重新上传)',
                tempVideoPath: file.tempFilePath,
                tempVideoThumb: '', // 先清空封面
                extractingThumb: true // 标记正在提取封面
              });
              // 不使用原生 loading
              getApp().showDialog({ title: '处理中', content: '正在提取封面，请稍后...', showCancel: false });
              // 延迟一下，确保视频组件已准备好
              setTimeout(() => {
                this.captureRepairVideoFrame();
              }, 500);
            }
          } else {
            console.error('视频文件路径不存在');
            wx.showToast({ title: '视频文件异常，请重试', icon: 'none' });
          }
        } else {
          console.error('未选择到视频文件');
          wx.showToast({ title: '未选择视频', icon: 'none' });
        }
      },
      fail: (err) => {
        // 用户取消不提示
        if (err && (err.errMsg || '').includes('fail cancel')) {
          return;
        }
        console.error('选择视频失败:', err);
        getApp().showDialog({ title: '提示', content: '选择视频失败，请重试' });
      }
    });
  },

  // [新增] 提取故障报修视频封面
  captureRepairVideoFrame() {
    const videoContext = wx.createVideoContext('repairVideoPreview', this);
    
    // 先定位到第一帧
    videoContext.seek(0);
    
    // 等待定位完成后再截图
    setTimeout(() => {
      videoContext.snapshot({
        success: (res) => {
          // 截图成功，保存封面路径
          this.setData({
            tempVideoThumb: res.tempImagePath,
            extractingThumb: false
          });
          // 关闭提示弹窗
          getApp().hideDialog();
        },
        fail: (err) => {
          // 截图失败，使用占位提示
          console.error('截图失败:', err);
          this.setData({
            extractingThumb: false
          });
          getApp().hideDialog();
          // 封面失败也不弹原生提示
        }
      });
    }, 500);
  },

  // ========================================================
  // [修改] 智能粘贴相关逻辑
  // ========================================================
  
  // 1. 打开智能粘贴弹窗
  openSmartPasteModal() {
    console.log('点击了智能粘贴按钮'); // 调试用：确认按钮是否被点击
    this.setData({
      showSmartPasteModal: true,
      smartPasteVal: '' // 每次打开清空
    });
  },

  // 2. 关闭弹窗
  closeSmartPasteModal() {
    this.setData({ showSmartPasteModal: false });
  },

  // 3. 监听弹窗输入
  onSmartPasteInput(e) {
    this.setData({ smartPasteVal: e.detail.value });
  },

  // [修改] 高级智能粘贴 (复用 shop.js 逻辑)
  confirmSmartPaste() {
    const text = this.data.smartPasteVal.trim();
    if (!text) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }

    const result = this.parseAddress(text);

    // 构造更新数据
    let updateData = {
      showSmartPasteModal: false
    };

    if (result.name) updateData['orderInfo.name'] = result.name;
    if (result.phone) updateData['orderInfo.phone'] = result.phone;
    if (result.address) {
      updateData['detailAddress'] = result.address;
      updateData['orderInfo.address'] = result.address;
    }

    this.setData(updateData);
    
    // 如果解析到了地址，重新计算运费
    if (result.address && result.address.trim()) {
      this.reCalcFinalPrice();
    }
    
    wx.showToast({ title: '解析完成', icon: 'success' });
  },
  
  // [修改] 高级解析算法（解析姓名、电话、地址）
  parseAddress(text) {
    let cleanText = text.trim();
    
    // 1. 提取手机号
    let phone = '';
    const phoneReg = /(1[3-9]\d{9})/;
    const phoneMatch = cleanText.match(phoneReg);
    if (phoneMatch) {
      phone = phoneMatch[1];
      cleanText = cleanText.replace(phoneReg, ' ');
    }

    // 2. 清理杂质
    cleanText = cleanText
      .replace(/收货人[:：]?|姓名[:：]?|联系电话[:：]?|电话[:：]?|手机[:：]?|地址[:：]?/g, ' ')
      .replace(/[()（）\[\]]/g, ' ')
      .replace(/\s+/g, ' ');

    // 3. 切分片段
    const fragments = cleanText.split(/[ ,，;；\n\t]+/).filter(v => v && v.trim().length > 0);

    let name = '';
    let addressBuffer = [];
    const addrKeywords = ['省', '市', '区', '县', '镇', '街道', '路', '街', '道', '号', '室', '楼', '苑'];

    fragments.forEach(frag => {
      const isAddress = addrKeywords.some(k => frag.includes(k)) || frag.length > 5;
      // 名字通常短且无关键字
      if (!isAddress && frag.length >= 2 && frag.length <= 4 && !name) {
        name = frag;
      } else {
        addressBuffer.push(frag);
      }
    });

    return {
      name: name,
      phone: phone,
      address: addressBuffer.join('')
    };
  },

  // ========================================================
  // [新增] 地址解析函数（智能识别省市区，用于计算运费）
  // ========================================================
  parseAddressForShipping(addressText) {
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

  // 联系信息输入处理（保留兼容）
  handleContactInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({ [field]: value });
    // 同步到 orderInfo
    if (field === 'contactName') this.setData({ 'orderInfo.name': value });
    if (field === 'contactPhone') this.setData({ 'orderInfo.phone': value });
    if (field === 'contactAddr') this.setData({ 'orderInfo.address': value });
  },



  // 6. 表单输入（统一格式）
  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;
    
    if (key === 'detailAddress') {
      this.setData({ 
        detailAddress: val,
        'orderInfo.address': val // 同步到 orderInfo.address
      });
      // 输入详细地址后，解析地址并重新计算运费
      if (val && val.trim()) {
        this.reCalcFinalPrice();
      }
    } else {
      this.setData({ [`orderInfo.${key}`]: val });
      // 同步到旧字段（兼容）
      if (key === 'name') this.setData({ contactName: val });
      if (key === 'phone') this.setData({ contactPhone: val });
      if (key === 'address') {
        this.setData({ 
          contactAddr: val,
          detailAddress: val // 同步到 detailAddress
        });
      }
    }
  },

  // 故障描述输入处理
  handleRepairInput(e) {
    this.setData({ repairDescription: e.detail.value });
  },

  // 1. [加入购物车] -> 永久保存，不打标
  addToCart() {
    console.log('[shouhou] addToCart click', {
      selectedCount: this.data.selectedCount,
      currentPartsList: this.data.currentPartsList,
      currentPartsListLength: this.data.currentPartsList.length,
      showSmartPasteModal: this.data.showSmartPasteModal,
      showModal: this.data.showModal,
      showOrderModal: this.data.showOrderModal,
      currentModelName: this.data.currentModelName,
      serviceType: this.data.serviceType
    });

    const { currentPartsList, selectedCount, currentModelName } = this.data;

    // 增强调试：检查配件列表状态
    if (!currentPartsList || currentPartsList.length === 0) {
      console.warn('[shouhou] 当前配件列表为空，型号:', currentModelName);
      wx.showModal({
        title: '提示',
        content: `当前 ${currentModelName} 型号的配件列表为空，请先添加配件或联系管理员`,
        showCancel: false
      });
      return;
    }

    if (selectedCount === 0) {
      // 提示用户选择配件，并显示所有可用配件
      const partNames = currentPartsList.map(p => p.name).join('、');
      wx.showModal({
        title: '请选择配件',
        content: `请先点击配件进行选择。\n可用配件：${partNames.substring(0, 50)}${partNames.length > 50 ? '...' : ''}`,
        showCancel: false
      });
      return;
    }

    // 1. 读取现有购物车
    let cart = wx.getStorageSync('my_cart') || [];

    // 2. 遍历当前选中的配件
    currentPartsList.forEach(part => {
      if (part.selected) {
        // 查找是否已存在 (只找非临时的)
        const existIdx = cart.findIndex(item => 
          !item.isTemp && 
          item.type === 'part' && 
          item.name === part.name && 
          item.spec === currentModelName
        );

        if (existIdx > -1) {
          cart[existIdx].quantity++;
          cart[existIdx].total = cart[existIdx].quantity * cart[existIdx].price;
        } else {
          cart.push({
            id: Date.now() + Math.random(),
            type: 'part',
            name: part.name,
            spec: currentModelName,
            price: Number(part.price || 0),
            quantity: 1,
            total: Number(part.price || 0),
            isTemp: false // 【关键】永久标记
          });
        }
      }
    });

    // 3. 保存并弹窗
    console.log('[shouhou] 准备保存购物车:', cart);
    this.saveCartToCache(cart);
    console.log('[shouhou] 购物车已保存，准备显示成功弹窗');
    
    // 重置页面选中状态
    const resetList = currentPartsList.map(p => ({ ...p, selected: false }));
    console.log('[shouhou] 准备 setData:', {
      resetList: resetList,
      selectedCount: 0,
      totalPrice: 0,
      showCartSuccess: true
    });
    
    this.setData({
      currentPartsList: resetList,
      selectedCount: 0,
      totalPrice: 0,
      showCartSuccess: true // 弹出成功提示
    });
    
    console.log('[shouhou] setData 完成，当前 showCartSuccess:', this.data.showCartSuccess);
  },

  // 2. [新增] 成功弹窗的两个按钮逻辑
  onContinueShopping() {
    this.setData({ showCartSuccess: false });
  },

  onGoToCheckout() {
    // 从本地存储加载购物车到页面数据
    const cart = wx.getStorageSync('my_cart') || [];
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    
    this.setData({ 
      showCartSuccess: false,
      cart: cart,
      cartTotalPrice: total,
      showOrderModal: true // 直接打开结算单
    });
    // 重新计算价格（包含运费）
    this.reCalcFinalPrice(cart);
  },

  // 3. [新增] 购物车加减数量逻辑
  handleCartQty(e) {
    const idx = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    const cart = [...this.data.cart]; // 复制副本
    
    if (type === 'plus') {
      cart[idx].quantity++;
    } else {
      if (cart[idx].quantity > 1) {
        cart[idx].quantity--;
      } else {
        // 数量为1时点击减号，删除该项
        cart.splice(idx, 1);
      }
    }
    
    // 重新计算单项总价 (如果还没被删)
    if(cart[idx]) {
      cart[idx].total = cart[idx].quantity * cart[idx].price;
    }

    // 保存并更新 UI，并重新计算
    this.saveCartToCache(cart);
    this.reCalcFinalPrice(cart);
  },

  // 4. [新增/确保有] 统一的保存函数
  saveCartToCache(newCart) {
    console.log('[shouhou] saveCartToCache 被调用，购物车数据:', newCart);
    try {
      wx.setStorageSync('my_cart', newCart);
      this.setData({ cart: newCart });
      console.log('[shouhou] 购物车保存成功');
    } catch (error) {
      console.error('[shouhou] 购物车保存失败:', error);
    }
  },


  // ========================================================
  // [新增] 切换快递方式
  // ========================================================
  changeShipping(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({ shippingMethod: method });
    this.reCalcFinalPrice();
  },

  // [新增] 计算含运费的总价（从详细地址解析省市区）
  reCalcFinalPrice(cart = this.data.cart) {
    console.log('[shouhou] reCalcFinalPrice 开始计算，购物车数据:', cart);
    const goodsTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const { shippingMethod, detailAddress } = this.data;
    let fee = 0;

    if (shippingMethod === 'zto') {
      fee = 12; // 中通运费12元
    } else if (shippingMethod === 'sf') {
      // 顺丰逻辑：从详细地址中解析省市区
      if (!detailAddress || !detailAddress.trim()) {
        fee = 0; // 没填地址，运费暂计为0
      } else {
        // 解析地址，提取省份信息
        const parsed = this.parseAddressForShipping(detailAddress);
        const province = parsed.province || '';
        
        // 判断是否广东
        if (province.indexOf('广东') > -1) {
          fee = 13;
        } else if (province) {
          // 如果解析到了省份但不是广东，则按省外计算
          fee = 22;
        } else {
          // 如果解析不到省份，运费暂计为0（待用户完善地址）
          fee = 0;
        }
      }
    }

    console.log('[shouhou] 价格计算完成:', {
      goodsTotal,
      shippingMethod,
      shippingFee: fee,
      finalTotalPrice: goodsTotal + fee
    });

    this.setData({
      cart,
      cartTotalPrice: goodsTotal,
      shippingFee: fee,
      finalTotalPrice: goodsTotal + fee
    });
  },

  // [核心修复] 立即购买 / 去下单
  openCartOrder() {
    console.log('点击立即购买'); // 调试用
    const { currentPartsList, selectedCount, currentModelName } = this.data;
    let cart = wx.getStorageSync('my_cart') || [];
    
    // 清理旧临时
    cart = cart.filter(item => !item.isTemp);

    // 没选新配件 -> 尝试直接结算购物车
    if (selectedCount === 0) {
      if (cart.length === 0) return wx.showToast({ title: '请选择配件', icon: 'none' });
      this.reCalcFinalPrice(cart);
      this.setData({ cart, showOrderModal: true }); // 打开弹窗
      return;
    }

    // 选了新配件 -> 添加临时项
    currentPartsList.forEach((part, index) => {
      if (part.selected) {
        cart.push({
          id: Date.now() + index, type: 'part', name: part.name, spec: currentModelName,
          price: Number(part.price||0), quantity: 1, total: Number(part.price||0), isTemp: true
        });
      }
    });

    this.saveCartToCache(cart);
    this.reCalcFinalPrice(cart);
    this.setData({ showOrderModal: true }); // 打开弹窗
  },

  // [新增] 打开故障报修订单弹窗
  openRepairOrder() {
    const { repairDescription, tempVideoPath } = this.data;
    
    // 校验
    if (!repairDescription || repairDescription.trim() === '') {
      return wx.showToast({ title: '请填写故障描述', icon: 'none' });
    }
    if (!tempVideoPath) {
      return wx.showToast({ title: '请上传故障视频', icon: 'none' });
    }
    
    // 打开订单弹窗
    this.setData({ showOrderModal: true });
  },

  // [新增] 关闭订单弹窗
  closeOrderModal() {
    // 先移除动画状态，让弹窗滑下去
    this.setData({ popupAnimationActive: false });
    // 等待动画完成后再隐藏元素
    setTimeout(() => {
      this.setData({ showOrderModal: false });
    }, 300); // 与 CSS transition 时间匹配
  },

  // [新增] 最终支付 (对应弹窗里的黑色按钮)
  submitRealOrder() {
    const { cart, orderInfo, detailAddress, finalTotalPrice, shippingFee, shippingMethod, serviceType, repairDescription, tempVideoPath, currentModelName } = this.data;

    // 如果是故障报修模式，走故障报修提交逻辑
    if (serviceType === 'repair') {
      // 校验
      if (!repairDescription || repairDescription.trim() === '') {
        return wx.showToast({ title: '请填写故障描述', icon: 'none' });
      }
      if (!tempVideoPath) {
        return wx.showToast({ title: '请上传故障视频', icon: 'none' });
      }
      // 检查地址：优先使用 detailAddress，如果没有则使用 orderInfo.address
      const address = this.data.detailAddress || orderInfo.address;
      if (!orderInfo.name || !orderInfo.phone || !address) {
        return wx.showToast({ title: '请完善联系信息', icon: 'none' });
      }

      // 调用故障报修提交函数
      this.submitRepairTicket();
      return;
    }

    // 配件购买模式（原有逻辑）
    // 校验
    if (cart.length === 0) return wx.showToast({ title: '清单为空', icon: 'none' });
    if (!orderInfo.name || !orderInfo.phone) return wx.showToast({ title: '请填写联系人', icon: 'none' });
    if (!detailAddress || !detailAddress.trim()) {
      return wx.showToast({ title: '请填写详细地址', icon: 'none' });
    }

    // 解析地址，验证是否包含省市区信息
    const parsed = this.parseAddressForShipping(detailAddress);
    if (!parsed.province && !parsed.city) {
      return wx.showToast({ 
        title: '地址格式不正确，请包含省市区信息，如：广东省 佛山市 南海区 某某街道101号', 
        icon: 'none',
        duration: 3000
      });
    }

    // 顺丰运费校验
    if (shippingMethod === 'sf' && shippingFee === 0) {
      return wx.showToast({ title: '请完善地址信息以计算运费', icon: 'none' });
    }

    // 拼装地址
    const fullAddressString = parsed.fullAddress || detailAddress;
    const finalInfo = { ...orderInfo, address: fullAddressString };

    // 调支付
    wx.showModal({
      title: '确认支付',
      content: '定制服务不支持退款。',
      confirmText: '支付',
      success: (res) => {
        if (res.confirm) {
          this.doCloudSubmit('pay', cart, finalInfo, finalTotalPrice, shippingFee, shippingMethod);
        }
      }
    });
  },

  // 统一的云函数调用
  doCloudSubmit(action, goods, addr, total, fee, method) {
    getApp().showLoading({ title: '处理中...' });
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        action,
        totalPrice: total,
        goods,
        addressData: addr,
        shippingFee: fee,
        shippingMethod: method
      },
      success: res => {
        getApp().hideLoading();
        const payment = res.result;

        if (action === 'pay' && payment && payment.paySign) {
          wx.requestPayment({
            ...payment,
            success: () => {
              wx.showToast({ title: '支付成功' });
              this.closeOrderModal();
              wx.removeStorageSync('my_cart');
              this.setData({
                cart: [],
                cartTotalPrice: 0,
                finalTotalPrice: 0,
                shippingFee: 0
              });
              wx.navigateTo({ url: '/pages/my/my' });
            },
            fail: () => {
              wx.showToast({ title: '支付取消', icon: 'none' });
            }
          });
        }
      },
      fail: () => {
        getApp().hideLoading();
        wx.showToast({ title: '下单失败', icon: 'none' });
      }
    });
  },

  // 7. [核心] 提交订单并支付 (复用 createOrder) - 仅配件购买（保留兼容）
  submitOrder() {
    const { selectedCount, totalPrice, orderInfo, currentPartsList, currentModelName, serviceType } = this.data;

    // 只处理配件购买，故障报修保持原逻辑
    if (serviceType === 'repair') {
      // 故障报修保持原有逻辑
      const { contactName, contactPhone, contactAddr, contactWechat, repairDescription, videoFileName } = this.data;
      
      if (!repairDescription || repairDescription.trim() === '') {
        wx.showToast({ title: '请填写故障描述', icon: 'none' });
        return;
      }
      
      if (!contactName || !contactPhone || !contactAddr || !contactWechat) {
        wx.showToast({ title: '请完善收货信息', icon: 'none' });
        return;
      }
      
      // 提交到 shouhou_read 集合（故障报修逻辑）
      getApp().showLoading({ title: '提交中...', mask: true });
      const db = wx.cloud.database();
      db.collection('shouhou_read').add({
        data: {
          serviceType: 'repair',
          modelName: currentModelName,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactAddr: contactAddr.trim(),
          contactWechat: contactWechat.trim(),
          repairDescription: repairDescription.trim(),
          videoFileName: videoFileName || '',
          createTime: db.serverDate(),
          status: 'pending'
        },
        success: () => {
          getApp().hideLoading();
          wx.showToast({ title: '提交成功', icon: 'success' });
          setTimeout(() => {
            this.setData({
              repairDescription: '',
              videoFileName: ''
            });
          }, 1500);
        },
        fail: (err) => {
          getApp().hideLoading();
          console.error('提交失败:', err);
          wx.showToast({ title: '提交失败，请重试', icon: 'none' });
        }
      });
      return;
    }

    // 配件购买逻辑
    // 校验
    if (selectedCount === 0) {
      wx.showToast({ title: '请选择配件', icon: 'none' });
      return;
    }
    if (!orderInfo.name || !orderInfo.phone || !orderInfo.address) {
      wx.showToast({ title: '请完善收货信息', icon: 'none' });
      return;
    }

    // 组装商品数据 (为了适配 my 页面的显示)
    const goods = currentPartsList
      .filter(p => p.selected)
      .map(p => ({
        name: p.name,
        spec: currentModelName, // 规格显示为型号
        quantity: 1,
        price: p.price || 0,
        total: p.price || 0
      }));

    // 弹出免责声明
    wx.showModal({
      title: '维修服务确认',
      content: '此为定制维修配件服务，下单后不支持退款。',
      confirmText: '支付',
      success: (res) => {
        if (res.confirm) {
          this.doPayment(goods, totalPrice, orderInfo);
        }
      }
    });
  },

  // [修改] 支付执行函数 (适配新的参数结构)
  doPayment(goodsList, totalPrice, addressData) {
    getApp().showLoading({ title: '正在下单...', mask: true });

    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: totalPrice,
        goods: goodsList, // 直接传购物车数组
        addressData: addressData
      },
      success: res => {
        getApp().hideLoading();
        const payment = res.result;
        
        if (!payment || !payment.paySign) {
           return wx.showToast({ title: '系统审核中', icon: 'none' });
        }

        wx.requestPayment({
          ...payment,
          success: () => {
            wx.showToast({ title: '支付成功', icon: 'success' });
            this.closeOrderModal();
            // 清空选中状态
            this.loadParts(this.data.currentModelName); 
            this.setData({ 
              cart: [], 
              cartTotalPrice: 0,
              selectedCount: 0,
              totalPrice: 0
            });
            
            setTimeout(() => {
              wx.navigateTo({ url: '/pages/my/my' });
            }, 1000);
          },
          fail: () => {
            wx.showToast({ title: '支付取消', icon: 'none' });
          }
        });
      },
      fail: err => {
        getApp().hideLoading();
        wx.showToast({ title: '下单失败', icon: 'none' });
      }
    });
  },

  // 3. 教程逻辑
  onPassInput(e) {
    const val = e.detail.value;
    this.setData({ passInput: val });

    if (val.length === 6) {
      const modelName = this.data.currentModelName;
      // 使用 modelName 查找对应的密码
      if (val === CODES[modelName]) {
        this.setData({ isLocked: false, passError: false });
        this.renderVideos();
      } else {
        this.setData({ passError: true, passInput: '' });
      }
    } else {
      this.setData({ passError: false });
    }
  },

  renderVideos() {
    // 从云数据库 shouhouvideo 读取视频列表（按组同步）
    const modelName = this.data.currentModelName;
    
    // 立即清空列表，避免显示旧数据
    this.setData({ currentVideoList: [] });
    
    if (!modelName) {
      return;
    }
    
    // 获取当前型号所属的组
    const groupName = MODEL_TO_GROUP[modelName];
    if (!groupName) {
      console.warn('未找到型号对应的组:', modelName);
      return;
    }
    
    // 生成请求标识，确保只使用最新的请求结果
    const requestId = Date.now();
    this._lastVideoRequestId = requestId;
    
    if (this.db) {
      // 先尝试按 order 排序（使用 groupName 查询，同组共享视频）
      this.db.collection('shouhouvideo')
        .where({
          groupName: groupName // 使用 groupName 查询，同组型号共享视频
        })
        .orderBy('order', 'asc')
        .get()
        .then(res => {
          // 检查请求是否已过期（防止异步请求时序问题）
          if (this._lastVideoRequestId !== requestId) {
            console.log('视频请求已过期，忽略结果');
            return;
          }
          
          // 再次验证当前型号是否匹配
          if (this.data.currentModelName !== modelName) {
            console.log('型号已切换，忽略旧请求结果');
            return;
          }
          
          if (res.data && res.data.length > 0) {
            // 有数据，使用云数据库数据
            const videoList = res.data.map(item => ({
              _id: item._id,
              title: item.title,
              time: item.time || this.formatDuration(item.duration) || '00:00',
              src: item.videoFileID || item.src || TEST_VIDEO_URL,
              thumb: item.thumbFileID || item.thumb || '',
              coverColor: item.coverColor || '#1c1c1e',
              createTime: item.createTime,
              order: item.order || 0
            }));
            // 按 order 排序（如果数据库排序失败）
            videoList.sort((a, b) => (a.order || 0) - (b.order || 0));
            this.setData({ currentVideoList: videoList });
            console.log(`✅ 加载 ${modelName} (${groupName}组) 的视频，共 ${videoList.length} 个`);
          } else {
            // 没有数据，使用本地数据
            this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
            console.log(`⚠️ ${modelName} (${groupName}组) 没有云端视频，使用本地数据`);
          }
        })
        .catch(err => {
          // 检查请求是否已过期
          if (this._lastVideoRequestId !== requestId) {
            return;
          }
          
          console.error('读取视频失败（尝试按 createTime 排序）:', err);
          // 如果 orderBy order 失败，尝试按 createTime 排序
          this.db.collection('shouhouvideo')
            .where({
              groupName: groupName
            })
            .orderBy('createTime', 'desc')
            .get()
            .then(res => {
              // 再次检查请求是否已过期
              if (this._lastVideoRequestId !== requestId || this.data.currentModelName !== modelName) {
                return;
              }
              
              if (res.data && res.data.length > 0) {
                const videoList = res.data.map(item => ({
                  _id: item._id,
                  title: item.title,
                  time: item.time || this.formatDuration(item.duration) || '00:00',
                  src: item.videoFileID || item.src || TEST_VIDEO_URL,
                  thumb: item.thumbFileID || item.thumb || '',
                  coverColor: item.coverColor || '#1c1c1e',
                  createTime: item.createTime,
                  order: item.order || 0
                }));
                // 按 order 排序
                videoList.sort((a, b) => (a.order || 0) - (b.order || 0));
                this.setData({ currentVideoList: videoList });
                console.log(`✅ 加载 ${modelName} (${groupName}组) 的视频，共 ${videoList.length} 个`);
              } else {
                this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
                console.log(`⚠️ ${modelName} (${groupName}组) 没有云端视频，使用本地数据`);
              }
            })
            .catch(err2 => {
              // 检查请求是否已过期
              if (this._lastVideoRequestId !== requestId || this.data.currentModelName !== modelName) {
                return;
              }
              
              console.error('读取视频完全失败:', err2);
              // 完全失败时使用本地数据
              this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
            });
        });
    } else {
      // 没有云数据库时使用本地数据
      this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
      console.log(`⚠️ 云数据库未初始化，${modelName} 使用本地数据`);
    }
  },

  // 格式化时长（秒转 mm:ss）
  formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  // 核心：点击播放某个视频
  playVideo(e) {
    // 如果正在拖拽，不触发播放
    if (this.data.isDragging) return;
    
    const idx = Number(e.currentTarget.dataset.index); // dataset 中是字符串，这里转成数字
    this.setData({ playingIndex: idx });
  },

  // 管理员删除视频（删除同组的所有视频）
  deleteVideo(e) {
    if (!this.data.isAdmin) return;
    // 如果正在拖拽，不触发删除
    if (this.data.isDragging) return;
    
    const idx = Number(e.currentTarget.dataset.index);
    const videoList = this.data.currentVideoList;
    const target = videoList[idx];
    if (!target) return;

    wx.showModal({
      title: '提示',
      content: `确定删除教程「${target.title}」吗？\n（同组型号的视频也会被删除）`,
      success: (res) => {
        if (res.confirm) {
          // 从云数据库删除（同组共享，删除一个即可）
          if (this.db && target._id) {
            this.db.collection('shouhouvideo').doc(target._id).remove()
              .then(() => {
                this.renderVideos();
                wx.showToast({ title: '已删除', icon: 'success' });
              })
              .catch(err => {
                console.error('删除失败:', err);
                wx.showToast({ title: '删除失败', icon: 'none' });
              });
          } else {
            // 本地删除（兼容旧数据）
            const modelName = this.data.currentModelName;
            if (DB_VIDEOS[modelName]) {
              DB_VIDEOS[modelName].splice(idx, 1);
            }
            this.renderVideos();
            wx.showToast({ title: '已删除', icon: 'success' });
          }
        }
      }
    });
  },

  // 长按开始拖拽
  onLongPress(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    const startY = e.touches[0].clientY;
    
    // 清除可能存在的定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.data.longPressTimer = null;
    }
    
    wx.vibrateShort({ type: 'medium' });
    this.setData({
      isDragging: true,
      dragIndex: idx,
      dragStartY: startY,
      dragCurrentY: startY,
      dragOffsetY: 0,
      lastSwapIndex: idx,
      lastVibrateTime: Date.now()
    });
  },

  // 触摸开始（用于记录初始位置）
  onDragStart(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    const startY = e.touches[0].clientY;
    
    // 先记录初始位置
    this.setData({
      dragStartY: startY,
      dragCurrentY: startY,
      dragOffsetY: 0,
      lastSwapIndex: idx
    });
    
    // 清除可能存在的定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
    }
    
    // 设置长按定时器
    this.data.longPressTimer = setTimeout(() => {
      wx.vibrateShort({ type: 'medium' });
      this.setData({
        isDragging: true,
        dragIndex: idx,
        lastVibrateTime: Date.now()
      });
    }, DRAG_CONFIG.LONG_PRESS_DELAY);
  },

  // 拖拽移动
  onDragMove(e) {
    if (!this.data.isAdmin) return;
    
    // 如果还没开始拖拽，但移动距离超过阈值，取消长按定时器
    if (!this.data.isDragging && this.data.longPressTimer) {
      const moveY = Math.abs(e.touches[0].clientY - this.data.dragStartY);
      if (moveY > DRAG_CONFIG.MOVE_THRESHOLD) {
        clearTimeout(this.data.longPressTimer);
        this.data.longPressTimer = null;
      }
      return;
    }
    
    if (!this.data.isDragging) return;
    
    // 阻止默认滚动行为
    e.preventDefault && e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.data.dragStartY;
    
    // 直接 1:1 跟手，让卡片平滑跟随手指
    this.setData({
      dragCurrentY: currentY,
      dragOffsetY: deltaY
    });

    // 使用缓存的卡片高度（避免重复计算）
    const cardHeightPx = this._cardHeightPx || (DRAG_CONFIG.CARD_HEIGHT_RPX * (this._systemInfo?.screenWidth || 375) / 750);
    
    // 计算目标位置索引
    const moveIndex = Math.round(deltaY / cardHeightPx);
    const targetIndex = this.data.dragIndex + moveIndex;
    const list = this.data.currentVideoList;
    
    // 只在目标位置有效且与上次交换位置不同时才交换（避免重复交换导致跳跃）
    if (targetIndex >= 0 && 
        targetIndex < list.length && 
        targetIndex !== this.data.dragIndex &&
        targetIndex !== this.data.lastSwapIndex) {
      
      // 交换位置
      const newList = [...list];
      const temp = newList[this.data.dragIndex];
      newList[this.data.dragIndex] = newList[targetIndex];
      newList[targetIndex] = temp;
      
      // 计算剩余偏移量（交换后，卡片应该继续跟随手指）
      // 关键：保持视觉连续性，不跳跃
      const remainingOffset = deltaY - (moveIndex * cardHeightPx);
      
      this.setData({
        currentVideoList: newList,
        dragIndex: targetIndex,
        dragStartY: currentY - remainingOffset, // 更新起始位置，保持连续性
        dragOffsetY: remainingOffset, // 保持剩余偏移量，让卡片继续跟随
        lastSwapIndex: targetIndex // 记录本次交换的位置
      });
      
      // 同步到云数据库（更新排序）- 同组共享，更新一个即可
      if (this.db) {
        const modelName = this.data.currentModelName;
        const groupName = MODEL_TO_GROUP[modelName];
        // 更新云数据库中的 order 字段
        newList.forEach((item, index) => {
          if (item._id) {
            this.db.collection('shouhouvideo').doc(item._id).update({
              data: { order: index }
            }).catch(err => console.error('更新排序失败:', err));
          }
        });
      }
      
      // 同步到本地 DB_VIDEOS（兼容）
      const modelName = this.data.currentModelName;
      if (DB_VIDEOS[modelName]) {
        DB_VIDEOS[modelName] = newList;
      }
      
      // 震动反馈（节流，避免过于频繁）
      const now = Date.now();
      if (now - this.data.lastVibrateTime > DRAG_CONFIG.VIBRATE_INTERVAL) {
        wx.vibrateShort({ type: 'light' });
        this.setData({ lastVibrateTime: now });
      }
    }
  },

  // 拖拽结束
  onDragEnd(e) {
    if (!this.data.isAdmin) return;
    
    // 清除长按定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.data.longPressTimer = null;
    }
    
    if (this.data.isDragging) {
      // 保存最终顺序到云数据库（同组共享）
      const videoList = this.data.currentVideoList;
      const modelName = this.data.currentModelName;
      const groupName = MODEL_TO_GROUP[modelName];
      
      // 同步到本地（兼容）
      if (DB_VIDEOS[modelName]) {
        DB_VIDEOS[modelName] = videoList;
      }
      
      // 更新云数据库中的 order 字段
      if (this.db) {
        let updateCount = 0;
        videoList.forEach((item, index) => {
          if (item._id) {
            this.db.collection('shouhouvideo').doc(item._id).update({
              data: { order: index }
            }).then(() => {
              updateCount++;
              // 所有更新完成后提示
              if (updateCount === videoList.filter(v => v._id).length) {
                wx.showToast({ 
                  title: '顺序已更新', 
                  icon: 'success',
                  duration: 1000
                });
              }
            }).catch(err => {
              console.error('更新排序失败:', err);
            });
          }
        });
        
        // 如果没有需要更新的项，直接提示
        if (videoList.filter(v => v._id).length === 0) {
          wx.showToast({ 
            title: '顺序已更新', 
            icon: 'success',
            duration: 1000
          });
        }
      } else {
        // 只有在实际移动了位置时才提示
        if (this.data.dragIndex !== this.data.lastSwapIndex || Math.abs(this.data.dragOffsetY) > 10) {
          wx.showToast({ 
            title: '顺序已更新', 
            icon: 'success',
            duration: 1000
          });
        }
      }
    }
    
    // 重置拖拽状态，添加过渡动画让卡片回到原位
    this.setData({
      isDragging: false,
      dragIndex: -1,
      dragStartY: 0,
      dragCurrentY: 0,
      dragOffsetY: 0,
      lastSwapIndex: -1,
      lastVibrateTime: 0
    });
  },

  resetLock() {
    this.setData({
      isLocked: true,
      passInput: '',
      passError: false,
      playingIndex: -1
    });
  },

  reLock() {
    this.resetLock();
  },

  // 点击锁屏区域时，强制触发输入框聚焦（主要照顾开发者工具）
  focusInput() {
    this.setData({ focusPass: false });
    setTimeout(() => {
      this.setData({ focusPass: true });
    }, 50);
  },

  // 4. 模态框逻辑
  openModal(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      showModal: true,
      modalMode: mode,
      modalInputVal: '',
      tempVideoPath: '',
      tempVideoThumb: ''
    });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  confirmModal() {
    const val = this.data.modalInputVal;
    if (!val) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    const series = this.data.currentSeries;

    if (this.data.modalMode === 'part') {
      // 配件模式：添加到云数据库 shouhou 集合（按型号独立）
      const modelName = this.data.currentModelName;
      if (this.db) {
        // 获取当前最大 order 值
        this.db.collection('shouhou')
          .where({
            modelName: modelName // 使用 modelName 查询
          })
          .orderBy('order', 'desc')
          .limit(1)
          .get()
          .then(res => {
            const maxOrder = (res.data && res.data.length > 0) 
              ? (res.data[0].order || 0) 
              : -1;
            
            // 添加新配件到云端
            this.db.collection('shouhou').add({
              data: {
                modelName: modelName, // 使用 modelName 作为标识
                name: val,
                order: maxOrder + 1,
                createTime: this.db.serverDate()
              },
              success: () => {
                // 重新加载配件列表
                this.renderParts();
                wx.showToast({ title: '配件已添加', icon: 'success' });
                this.closeModal();
              },
              fail: (err) => {
                console.error('添加配件失败:', err);
                wx.showToast({ title: '添加失败，请重试', icon: 'none' });
              }
            });
          })
          .catch(err => {
            console.error('获取 order 失败:', err);
            // 如果获取失败，直接添加，order 设为 0
            this.db.collection('shouhou').add({
              data: {
                modelName: modelName,
                name: val,
                order: 0,
                createTime: this.db.serverDate()
              },
              success: () => {
                this.renderParts();
                wx.showToast({ title: '配件已添加', icon: 'success' });
                this.closeModal();
              },
              fail: (err2) => {
                console.error('添加配件失败:', err2);
                wx.showToast({ title: '添加失败，请重试', icon: 'none' });
              }
            });
          });
      } else {
        // 没有云数据库时使用本地数据
        if (!DB_PARTS[modelName]) {
          DB_PARTS[modelName] = [];
        }
        DB_PARTS[modelName].push(val);
        this.renderParts();
        wx.showToast({ title: '配件已添加', icon: 'success' });
        this.closeModal();
      }
    } else {
      // 视频模式：校验是否选择了视频
      if (!this.data.tempVideoPath) {
        wx.showToast({ title: '请先选择视频', icon: 'none' });
        return;
      }

      // 上传视频到云存储并写入 shouhouvideo 集合（按型号独立）
      getApp().showLoading({ title: '上传中...', mask: true });
      
      const modelName = this.data.currentModelName;
      const timestamp = Date.now();
      const videoCloudPath = `shouhou/videos/${modelName}/${timestamp}_${val}.mp4`;
      const thumbCloudPath = this.data.tempVideoThumb 
        ? `shouhou/thumbs/${modelName}/${timestamp}_${val}.jpg`
        : null;

      // 先上传视频文件
      wx.cloud.uploadFile({
        cloudPath: videoCloudPath,
        filePath: this.data.tempVideoPath,
        success: (videoRes) => {
              // 视频上传成功，如果有封面则上传封面
              if (thumbCloudPath && this.data.tempVideoThumb) {
                wx.cloud.uploadFile({
                  cloudPath: thumbCloudPath,
                  filePath: this.data.tempVideoThumb,
                  success: (thumbRes) => {
                    // 封面上传成功，写入数据库
                    this.saveVideoToDB(val, modelName, videoRes.fileID, thumbRes.fileID);
                  },
                  fail: (err) => {
                    console.error('封面上传失败:', err);
                    // 封面上传失败，只保存视频
                    this.saveVideoToDB(val, modelName, videoRes.fileID, null);
                  }
                });
              } else {
                // 没有封面，直接保存视频
                this.saveVideoToDB(val, modelName, videoRes.fileID, null);
              }
        },
        fail: (err) => {
          getApp().hideLoading();
          console.error('视频上传失败:', err);
          wx.showToast({ title: '视频上传失败', icon: 'none' });
        }
      });
    }
  },

  // 保存视频信息到数据库（按组同步，同组型号共享视频）
  saveVideoToDB(title, modelName, videoFileID, thumbFileID) {
    if (!this.db) {
      getApp().hideLoading();
      wx.showToast({ title: '云服务未初始化', icon: 'none' });
      return;
    }

    // 获取当前型号所属的组
    const groupName = MODEL_TO_GROUP[modelName];
    if (!groupName) {
      getApp().hideLoading();
      wx.showToast({ title: '型号分组错误', icon: 'none' });
      return;
    }

    // 获取当前组最大 order 值
    this.db.collection('shouhouvideo')
      .where({ groupName: groupName })
      .orderBy('order', 'desc')
      .limit(1)
      .get()
      .then(res => {
        const maxOrder = (res.data && res.data.length > 0) 
          ? (res.data[0].order || 0) 
          : -1;

        // 保存视频到数据库（使用 groupName，同组共享）
        this.db.collection('shouhouvideo').add({
          data: {
            title: title,
            groupName: groupName, // 使用 groupName，同组型号共享
            videoFileID: videoFileID,
            thumbFileID: thumbFileID || '',
            coverColor: '#1c1c1e', // 默认封面颜色
            createTime: this.db.serverDate(),
            order: maxOrder + 1 // 用于排序，管理员可以调整
          },
          success: () => {
            getApp().hideLoading();
            wx.showToast({ title: '教程发布成功', icon: 'success' });
            this.closeModal();
            // 重新加载视频列表
            this.renderVideos();
          },
          fail: (err) => {
            getApp().hideLoading();
            console.error('保存失败:', err);
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          }
        });
      })
      .catch(err => {
        console.error('获取 order 失败:', err);
        // 如果获取失败，直接添加，order 设为 0
        this.db.collection('shouhouvideo').add({
          data: {
            title: title,
            groupName: groupName,
            videoFileID: videoFileID,
            thumbFileID: thumbFileID || '',
            coverColor: '#1c1c1e',
            createTime: this.db.serverDate(),
            order: 0
          },
          success: () => {
            getApp().hideLoading();
            wx.showToast({ title: '教程发布成功', icon: 'success' });
            this.closeModal();
            this.renderVideos();
          },
          fail: (err2) => {
            getApp().hideLoading();
            console.error('保存失败:', err2);
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          }
        });
      });
  },

  onModalInput(e) {
    this.setData({ modalInputVal: e.detail.value });
  },

  // 管理员选择视频
  adminChooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        const videoPath = file.tempFilePath;
        const thumbPath = file.thumbTempFilePath;

        // 如果微信已经生成了封面，直接使用
        if (thumbPath) {
          this.setData({
            tempVideoPath: videoPath,
            tempVideoThumb: thumbPath
          });
          if (!this.data.modalInputVal) {
            this.setData({ modalInputVal: "新上传教程" });
          }
          wx.showToast({ title: '视频已选择', icon: 'success' });
        } else {
          // 如果没有封面，使用 video 组件的 snapshot 方法提取第一帧
          this.setData({
            tempVideoPath: videoPath,
            tempVideoThumb: '',
            extractingThumb: true
          });
          if (!this.data.modalInputVal) {
            this.setData({ modalInputVal: "新上传教程" });
          }
          getApp().showLoading({ title: '正在提取封面...', mask: true });
        }
      }
    });
  },

  // 视频元数据加载完成，准备截图
  onVideoMetadataLoaded() {
    // 等待一小段时间确保视频帧已准备好
    setTimeout(() => {
      // 判断是管理员上传教程还是故障报修
      if (this.data.modalMode === 'video') {
        this.captureVideoFrame();
      } else if (this.data.serviceType === 'repair') {
        this.captureRepairVideoFrame();
      }
    }, 300);
  },

  // 视频时间更新（用于确保第一帧已加载）
  onVideoTimeUpdate() {
    // 如果当前时间接近0秒，可以尝试截图
    // 这个事件主要用于确保视频帧已准备好
  },

  // 截取视频第一帧
  captureVideoFrame() {
    const videoContext = wx.createVideoContext('thumbVideo', this);
    
    // 先定位到第一帧
    videoContext.seek(0);
    
    // 等待定位完成后再截图
    setTimeout(() => {
      videoContext.snapshot({
        success: (res) => {
          // 截图成功，保存封面路径
          this.setData({
            tempVideoThumb: res.tempImagePath,
            extractingThumb: false
          });
          getApp().hideLoading();
          wx.showToast({ title: '视频已选择', icon: 'success' });
        },
        fail: (err) => {
          // 截图失败，使用占位提示
          console.error('截图失败:', err);
          this.setData({
            extractingThumb: false
          });
          getApp().hideLoading();
          wx.showToast({ 
            title: '视频已选择（封面提取失败）', 
            icon: 'none',
            duration: 2000
          });
        }
      });
    }, 500);
  },

  // 联系信息折叠/展开
  toggleContact() {
    this.setData({
      isContactExpanded: !this.data.isContactExpanded
    });
  },

  // [新增] 清空购物车
  clearCart() {
    wx.showModal({
      title: '清空购物车',
      content: '确定要清空所有商品吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          // 1. 清除本地缓存
          wx.removeStorageSync('my_cart');
          
          // 2. 清除页面数据
          this.setData({
            cart: [],
            cartTotalPrice: 0,
            showOrderModal: false, // 既然空了，就关掉弹窗
          });

          // 3. 针对 shouhou 页面的额外重置
          if (this.data.currentPartsList) {
             const resetList = this.data.currentPartsList.map(p => ({...p, selected: false}));
             this.setData({ 
               currentPartsList: resetList,
               selectedCount: 0,
               totalPrice: 0
             });
          }

          wx.showToast({ title: '已清空', icon: 'none' });
        }
      }
    });
  },

  // [新增] 提交维修工单
  submitRepairTicket() {
    const { 
      currentModelName, repairDescription, videoFileName, tempVideoPath, 
      orderInfo // 复用收货信息
    } = this.data;

    // 1. 校验
    if (!repairDescription || repairDescription.trim() === '') {
      return wx.showToast({ title: '请填写故障描述', icon: 'none' });
    }
    if (!tempVideoPath) {
      return wx.showToast({ title: '请上传故障视频', icon: 'none' });
    }
    // 检查地址：优先使用 detailAddress，如果没有则使用 orderInfo.address
    const address = this.data.detailAddress || orderInfo.address;
    if (!orderInfo.name || !orderInfo.phone || !address) {
      return wx.showToast({ title: '请完善联系信息', icon: 'none' });
    }

    // 显示自定义加载动画（立即显示，确保在系统提示之前）
    this.setData({ showLoadingAnimation: true });
    
    // 使用很短的延迟确保动画已经渲染，然后再开始上传（避免微信原生提示覆盖）
    // 注意：如果微信系统提示仍然出现，可能需要使用其他上传方式
    setTimeout(() => {
      // 2. 上传视频
      const cloudPath = `repair_video/${Date.now()}_${Math.floor(Math.random()*1000)}.mp4`;
      wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempVideoPath,
      success: res => {
        const fileID = res.fileID;
        
        // 3. 写入数据库
        const db = wx.cloud.database();
        // 确保地址字段正确（优先使用 detailAddress）
        const finalAddress = this.data.detailAddress || orderInfo.address || '';
        const finalContact = {
          ...orderInfo,
          address: finalAddress,
          shippingMethod: this.data.shippingMethod || 'zto' // 让维修工单也记录快递方式
        };
        // 先检查集合是否存在，如果不存在则先创建一条记录
        db.collection('shouhou_repair').add({
          data: {
            type: 'repair', // 类型标记
            model: currentModelName,
            description: repairDescription.trim(),
            videoFileID: fileID,
            contact: finalContact, // 存入联系人信息（包含完整地址）
            status: 'PENDING',  // 初始状态
            createTime: db.serverDate()
          },
          success: () => {
            // 隐藏自定义加载动画
            this.setData({ showLoadingAnimation: false });
            
            // 成功弹窗
            wx.showModal({
              title: '提交成功',
              content: '售后工程师将在后台查看您的视频并进行评估。',
              confirmText: '好的',
              showCancel: false,
              success: () => {
                // 清空表单并跳转
                this.setData({ 
                  repairDescription: '', 
                  videoFileName: '', 
                  tempVideoPath: '',
                  tempVideoThumb: '',
                  orderInfo: { name: '', phone: '', address: '' },
                  detailAddress: ''
                });
                // 不自动跳转到个人页，停留在当前页面
                this.setData({ showOrderModal: false });
              }
            });
          },
          fail: err => {
            // 隐藏自定义加载动画
            this.setData({ showLoadingAnimation: false });
            console.error('提交失败:', err);
            
            // 如果是集合不存在错误，提示用户
            if (err.errCode === -502005 || err.errMsg.includes('collection not exists')) {
              wx.showModal({
                title: '提示',
                content: '数据库集合不存在，请联系管理员创建 shouhou_repair 集合',
                showCancel: false,
                confirmText: '知道了'
              });
            } else {
              wx.showToast({ title: '提交失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 });
            }
          }
        });
      },
      fail: err => {
        // 隐藏自定义加载动画
        this.setData({ showLoadingAnimation: false });
        console.error('视频上传失败:', err);
        wx.showToast({ title: '视频上传失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 });
      }
      });
    });
  },

  // 🔴 截图和录屏拦截处理
  handleIntercept(type) {
    // 1. 标记封禁
    wx.setStorageSync('is_user_banned', true);

    // 2. 强制跳转拦截页
    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      fail: () => {
        // 路径万一错了，直接退出
        wx.exitMiniProgram();
      }
    });
  },
})
