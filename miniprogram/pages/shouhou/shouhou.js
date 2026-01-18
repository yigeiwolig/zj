// pages/shouhou/shouhou.js
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});

// 通用测试视频地址（可替换为你自己的云存储链接）
const TEST_VIDEO_URL = "https://wxsnsdy.tc.qq.com/105/20210/snsdyvideodownload?filekey=30280201010421301f0201690402534804102ca905ce620b1241b726bc41dcff44e00204012882540400&bizid=1023&hy=SH&fileparam=302c020101042530230204136ffd93020457e3c4ff02024ef202031e8d7f02030f42400204045a320a0201000400";

// 配件数据 - 按型号独立存储
const DB_PARTS = {
  'F1 PRO': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
  'F1 MAX': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
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
    myOpenid: '',        // 🔴 当前用户的 openid（用于数据隔离）

    // 当前页面状态
    currentModelName: '',
    currentSeries: '', // F1 或 F2
    activeTab: 'order', // order 或 tutorial
    serviceType: 'parts', // parts 或 repair

    // 数据列表
    currentPartsList: [],
    currentVideoList: [],
    
    // 动态占位高度
    partsPlaceholderHeight: '180rpx',
    
    // 拖拽相关
    isDragging: false,
    dragIndex: -1,
    dragX: 0,
    dragY: 0,
    touchStartX: 0,
    touchStartY: 0,
    cardWidth: 0,
    cardHeight: 0,
    cardInitX: 0,
    cardInitY: 0,

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
    
    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },

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
    dialogClosing: false, // 自定义弹窗退出动画中
    autoToastClosing: false, // 自动提示退出动画中

    // 自定义视频预览弹窗
    showVideoPreview: false,
    isVideoPlaying: true, // 视频播放状态（用于预览弹窗）

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

    // 是否正在上传视频（防止重复点击）
    isUploadingVideo: false,

    // 🔴 上传选项和录制相关状态（参考 case 页面）
    showUploadOptions: false, // 显示上传选项弹窗（选择相册/录制）
    showCamera: false, // 显示录制界面
    cameraAnimating: false, // 录制页面动画状态
    isRecording: false, // 是否正在录制
    recTimeStr: "00:00", // 录制时间字符串
    timer: null, // 录制计时器
    showPrivacyTip: false, // 隐私提示显隐控制
    isStopping: false, // 防止重复点击停止按钮

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
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('shouhou');
    }
  },

  // 🔴 新增：页面准备就绪，初始化 camera context（参考 case 页面）
  onReady() {
    this.ctx = wx.createCameraContext();
    
    // 🔴 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      try {
        wx.setVisualEffectOnCapture({
          visualEffect: 'hidden',
          success: () => console.log('🛡️ 硬件级防偷拍锁定'),
          fail: (err) => {
            console.warn('⚠️ setVisualEffectOnCapture 失败（可能是预览模式）:', err);
          }
        });
      } catch (e) {
        console.warn('⚠️ setVisualEffectOnCapture 不可用:', e);
      }
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();
    
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

  // ================== 权限检查逻辑 ==================
  async checkAdminPrivilege() {
    try {
      // 1. 获取当前用户的 OpenID (利用云函数)
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;

      // 🔴 保存 openid 到 data，供后续使用（提交维修工单时需要）
      this.setData({ myOpenid: myOpenid });

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
    console.log('[showMyDialog] 显示弹窗:', { title, content, showCancel, confirmText });
    this.setData({
      dialog: { show: true, title, content, showCancel, confirmText, cancelText, callback, maskClosable }
    });
    console.log('[showMyDialog] 弹窗状态已更新，dialog.show:', this.data.dialog.show);
  },
  closeCustomDialog() {
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        dialog: { ...this.data.dialog, show: false, callback: null },
        dialogClosing: false
      });
    }, 420);
  },

  // 【新增】自动消失提示（无按钮，3秒后自动消失，带收缩退出动画）
  showAutoToast(title = '提示', content = '') {
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
    // 3秒后自动消失（带退出动画）
    setTimeout(() => {
      this._closeAutoToastWithAnimation();
    }, 3000);
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
    }, 420);
  },

  // 🔴 辅助函数：获取 custom-toast 组件并调用
  _getCustomToast() {
    return this.selectComponent('#custom-toast');
  },

  // 🔴 统一的自定义 Toast 方法（替换所有 wx.showToast）
  _showCustomToast(title, icon = 'none', duration = 2000) {
    const toast = this._getCustomToast();
    if (toast) {
      toast.showToast({ title, icon, duration });
    } else {
      // 降级：如果组件不存在，使用全局拦截（理论上不会到这里）
      wx.showToast({ title, icon, duration });
    }
  },

  // 🔴 统一的自定义 Modal 方法（替换所有 wx.showModal，除了 editable 的情况）
  _showCustomModal(options) {
    // 如果 editable 为 true，使用原生（因为自定义组件不支持输入框）
    if (options.editable) {
      return wx.showModal(options);
    }
    
    const toast = this._getCustomToast();
    if (toast) {
      toast.showModal({
        title: options.title || '提示',
        content: options.content || '',
        showCancel: options.showCancel !== false,
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        success: options.success
      });
    } else {
      // 降级
      wx.showModal(options);
    }
  },

  // 🔴 统一的自定义 Loading 方法（替换所有 wx.showLoading 和 getApp().showLoading）
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
  onDialogConfirm() {
    console.log('[onDialogConfirm] 用户点击了确定按钮');
    const cb = this.data.dialog && this.data.dialog.callback;
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        dialog: { ...this.data.dialog, show: false, callback: null },
        dialogClosing: false
      });
      if (typeof cb === 'function') {
        console.log('[onDialogConfirm] 执行回调函数');
        cb();
      }
    }, 420);
  },
  onDialogMaskTap() {
    if (this.data.dialog && this.data.dialog.maskClosable) {
      this.closeCustomDialog();
    }
  },
  noop() {},

  // ================= 视频预览 =================
  openVideoPreview() {
    if (!this.data.tempVideoPath) return;
    this.setData({ 
      showVideoPreview: true,
      isVideoPlaying: true // 打开时默认播放
    });
  },
  closeVideoPreview() {
    // 停止视频播放
    const videoContext = wx.createVideoContext('repairVideoPreviewPlayer');
    if (videoContext) {
      videoContext.pause();
    }
    
    this.setData({ 
      showVideoPreview: false,
      isVideoPlaying: true // 重置播放状态
    });
  },

  // 🔴 新增：切换播放/暂停（预览弹窗）
  toggleVideoPlayPause() {
    const videoContext = wx.createVideoContext('repairVideoPreviewPlayer');
    if (!videoContext) {
      return;
    }

    if (this.data.isVideoPlaying) {
      videoContext.pause();
    } else {
      videoContext.play();
    }
  },

  // 🔴 新增：视频播放事件（预览弹窗）
  onVideoPlay() {
    this.setData({
      isVideoPlaying: true
    });
  },

  // 🔴 新增：视频暂停事件（预览弹窗）
  onVideoPause() {
    this.setData({
      isVideoPlaying: false
    });
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
    const type = e.currentTarget.dataset.type;
    
    // 如果切换到故障报修，先检查是否绑定了设备
    if (type === 'repair') {
      this.checkDeviceBeforeRepair();
    } else {
      this.setData({ serviceType: type });
    }
  },

  // 🔴 检查设备绑定（在切换到故障报修时调用）
  async checkDeviceBeforeRepair() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 1. 获取当前用户 openid
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result?.openid;
      
      if (!openid) {
        this._showCustomModal({
          title: '提示',
          content: '无法获取用户信息，请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      // 2. 检查是否绑定了设备（使用 openid 字段，必须检查 isActive: true）
      const deviceRes = await db.collection('sn').where({
        openid: openid,
        isActive: true  // 🔴 只有已激活的设备才算绑定成功
      }).count();

      if (deviceRes.total === 0) {
        // 🔴 没有绑定设备，显示自定义弹窗
        this._showCustomModal({
          title: '提示',
          content: '您尚未绑定设备，无法进行故障报修。请先前往个人中心绑定设备。',
          showCancel: false,
          confirmText: '知道了'
        });
        return; // 不切换服务类型
      }
      
      // 3. 绑定了设备，继续检查是否有未完成的寄回订单
      this.checkUnfinishedReturn();
    } catch (err) {
      console.error('[checkDeviceBeforeRepair] 检查设备失败:', err);
      // 检查失败时，使用自定义弹窗提示
      this._showCustomModal({
        title: '提示',
        content: '检查设备状态失败，请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 【新增】检查是否有未完成的寄回订单
  checkUnfinishedReturn() {
    const db = wx.cloud.database();
    db.collection('shouhou_repair')
      .where({
        needReturn: true
      })
      .get()
      .then(checkRes => {
        // 过滤出未完成且用户未录入运单号的订单
        const unfinishedReturns = (checkRes.data || []).filter(item => 
          !item.returnCompleted && !item.returnTrackingId
        );
        
        if (unfinishedReturns.length > 0) {
          // 有未完成的寄回订单，显示提示并阻止切换
          this.showAutoToast('提示', '检测到您有一笔未完成的售后，未寄回维修配件，请先处理完成');
          // 延迟跳转，让用户看到提示
          setTimeout(() => {
            // 跳转到个人中心
            console.log('[checkUnfinishedReturn] 准备跳转到 my 页面');
            wx.navigateTo({ 
              url: '/pages/my/my',
              success: () => {
                console.log('[checkUnfinishedReturn] 跳转成功');
              },
              fail: (err) => {
                console.error('[checkUnfinishedReturn] 跳转失败:', err);
                this._showCustomToast('跳转失败，请手动进入个人中心', 'none');
              }
            });
          }, 3000);
          return; // 不切换服务类型
        }
        
        // 没有未完成的寄回订单，正常切换
        this.setData({ serviceType: 'repair' });
      })
      .catch(err => {
        console.error('检查寄回订单失败:', err);
        // 检查失败也允许切换，避免阻塞用户
        this.setData({ serviceType: 'repair' });
      });
  },

  // 3. 加载配件 (支持云端价格) - 新版本
  loadParts(modelName) {
    if (!modelName) {
      console.error('[loadParts] 型号名称未设置');
      return;
    }
    
    console.log('[loadParts] 开始加载配件，型号:', modelName);
    console.log('[loadParts] 当前管理员状态 - isAdmin:', this.data.isAdmin);
    console.log('[loadParts] 当前管理员状态 - isAuthorized:', this.data.isAuthorized);
    const db = wx.cloud.database();
    
    // 从 shouhou 集合读取，如果没有就用本地默认
    db.collection('shouhou').where({ modelName: modelName }).get().then(res => {
      console.log(`[loadParts] ${modelName} 从云端读取到 ${res.data.length} 条数据`);
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
        console.log(`[loadParts] ${modelName} 使用云端数据，共 ${parts.length} 个配件`);
      } else {
        // 云端没数据，加载本地默认，价格默认为 0
        const defaultNames = DB_PARTS[modelName] || [];
        console.log(`[loadParts] ${modelName} 云端无数据，使用本地默认，共 ${defaultNames.length} 个配件`);
        parts = defaultNames.map((name, index) => ({
          name: name,
          price: 0, // 默认价格
          modelName: modelName,
          order: index,
          selected: false
        }));
      }

      console.log(`[loadParts] ${modelName} 最终加载 ${parts.length} 个配件:`, parts.map(p => p.name));
      this.setData({ currentPartsList: parts });
      
      // 动态计算占位高度：最小化空白
      // 底部按钮高度约120rpx，只需要少量缓冲即可
      const rows = Math.ceil(parts.length / 3);
      // 配件较少时只留少量空间，配件多时稍微增加
      const calculatedHeight = rows <= 3 ? 80 : Math.min(120, (rows - 3) * 20 + 80);
      this.setData({ partsPlaceholderHeight: calculatedHeight + 'rpx' });
    }).catch(err => {
      console.error('[loadParts] 读取配件失败:', err);
      // 失败时使用本地数据
      const defaultNames = DB_PARTS[modelName] || [];
      console.log(`[loadParts] ${modelName} 读取失败，使用本地数据，共 ${defaultNames.length} 个配件`);
      const parts = defaultNames.map((name, index) => ({
        name: name,
        price: 0,
        modelName: modelName,
        order: index,
        selected: false
      }));
      this.setData({ currentPartsList: parts });
      
      // 动态计算占位高度
      const rows = Math.ceil(parts.length / 3);
      const calculatedHeight = rows <= 3 ? 80 : Math.min(120, (rows - 3) * 20 + 80);
      this.setData({ partsPlaceholderHeight: calculatedHeight + 'rpx' });
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

  // 一键同步所有本地配件数据到云端（管理员功能）- 强制覆盖旧数据
  syncAllPartsToCloud() {
    console.log('[syncAllPartsToCloud] 开始执行，isAdmin:', this.data.isAdmin, 'db:', !!this.db);
    
    if (!this.data.isAdmin) {
      this._showCustomToast('需要管理员权限', 'none');
      return;
    }

    if (!this.db) {
      // 如果 db 未初始化，尝试重新初始化
      this.db = wx.cloud.database();
      if (!this.db) {
        this._showCustomToast('云服务未初始化', 'none');
        return;
      }
    }

    this._showCustomModal({
      title: '确认同步',
      content: '将强制覆盖所有6个型号（F1 PRO、F1 MAX、F2 PRO、F2 MAX、F2 PRO Long、F2 MAX Long）的配件数据到云端，云端旧数据将被删除并替换为本地数据，是否继续？',
      showCancel: true,
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          console.log('[syncAllPartsToCloud] 用户确认，开始同步');
          this.showMyLoading('同步中...');
          
          // 所有型号列表
          const allModels = ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'];
          let totalParts = 0;
          let successCount = 0;
          let failCount = 0;
          
          // 统计需要同步的配件数量
          allModels.forEach(modelName => {
            totalParts += (DB_PARTS[modelName] || []).length;
          });

          console.log('[syncAllPartsToCloud] 总计需要同步', totalParts, '个配件');

          // 逐个型号同步（6个独立型号）- 强制覆盖旧数据
          const syncPromises = allModels.map(modelName => {
            const partsList = DB_PARTS[modelName] || [];
            if (partsList.length === 0) {
              console.log(`[syncAllPartsToCloud] ${modelName} 没有配件数据，跳过`);
              return Promise.resolve({ modelName, success: true, count: 0 });
            }

            console.log(`[syncAllPartsToCloud] 开始处理 ${modelName}，共 ${partsList.length} 个配件`);

            // 先查询并删除该型号的所有旧数据
            console.log(`[syncAllPartsToCloud] 准备查询 ${modelName} 的旧数据...`);
            return this.db.collection('shouhou')
              .where({ modelName: modelName })
              .get()
              .then(queryRes => {
                console.log(`[syncAllPartsToCloud] ${modelName} 查询成功，共 ${queryRes.data.length} 条旧数据`);
                // 如果有旧数据，先删除
                if (queryRes.data.length > 0) {
                  console.log(`[syncAllPartsToCloud] ${modelName} 发现 ${queryRes.data.length} 个旧配件，正在删除...`);
                  const deletePromises = queryRes.data.map(item => {
                    return this.db.collection('shouhou').doc(item._id).remove();
                  });
                  return Promise.all(deletePromises).then(() => {
                    console.log(`[syncAllPartsToCloud] ${modelName} 旧数据已删除`);
                    return Promise.resolve();
                  }).catch(err => {
                    console.error(`[syncAllPartsToCloud] ${modelName} 删除旧数据失败:`, err);
                    // 删除失败也继续，尝试添加新数据
                    return Promise.resolve();
                  });
                } else {
                  console.log(`[syncAllPartsToCloud] ${modelName} 没有旧数据，直接添加`);
                  return Promise.resolve();
                }
              })
              .then(() => {
                // 删除完成后，添加新数据
                console.log(`[syncAllPartsToCloud] ${modelName} 开始添加新数据，共 ${partsList.length} 个配件:`, partsList);
                const addPromises = partsList.map((name, index) => {
                  const dataToAdd = {
                    modelName: modelName,
                    name: name,
                    order: index,
                    price: 0, // 初始价格设为0
                    createTime: this.db.serverDate()
                  };
                  console.log(`[syncAllPartsToCloud] ${modelName} 准备添加配件 ${index + 1}/${partsList.length}: ${name}`, dataToAdd);
                  return this.db.collection('shouhou').add({
                    data: dataToAdd
                  }).then(res => {
                    console.log(`[syncAllPartsToCloud] ${modelName} 配件 "${name}" 添加成功，ID:`, res._id);
                    return res;
                  }).catch(err => {
                    console.error(`[syncAllPartsToCloud] ${modelName} 配件 "${name}" 添加失败:`, err);
                    throw err;
                  });
                });
                
                return Promise.all(addPromises)
                  .then((results) => {
                    console.log(`[syncAllPartsToCloud] ${modelName} 所有配件添加完成，共 ${results.length} 个，结果:`, results);
                    successCount += partsList.length;
                    return { modelName, success: true, count: partsList.length };
                  })
                  .catch(err => {
                    console.error(`[syncAllPartsToCloud] ${modelName} 添加数据失败:`, err);
                    console.error(`[syncAllPartsToCloud] ${modelName} 错误详情:`, JSON.stringify(err));
                    failCount += partsList.length;
                    return { modelName, success: false, count: partsList.length, error: err.message || JSON.stringify(err) };
                  });
              })
              .catch(err => {
                console.error(`[syncAllPartsToCloud] ${modelName} 同步过程出错:`, err);
                failCount += (partsList.length || 0);
                return { modelName, success: false, count: 0, error: err.message };
              });
          });

          // 等待所有同步完成
          Promise.all(syncPromises)
            .then((results) => {
              console.log('[syncAllPartsToCloud] 所有型号同步完成，结果:', results);
              this.hideMyLoading();
              
              const successModels = results.filter(r => r.success).map(r => r.modelName);
              const failModels = results.filter(r => !r.success);
              
              if (failModels.length === 0) {
                this._showCustomToast(
                  `同步完成！共 ${totalParts} 个配件`,
                  'success',
                  3000
                );
              } else {
                this._showCustomModal({
                  title: '部分同步失败',
                  content: `成功：${successModels.join('、')}\n失败：${failModels.map(r => r.modelName).join('、')}`,
                  showCancel: false
                });
              }
              
              // 如果当前在详情页，重新加载配件列表
              if (this.data.inDetail && this.data.currentModelName) {
                setTimeout(() => {
                  console.log('[syncAllPartsToCloud] 重新加载配件列表:', this.data.currentModelName);
                  this.loadParts(this.data.currentModelName);
                }, 1000);
              }
            })
            .catch(err => {
              this.hideMyLoading();
              console.error('[syncAllPartsToCloud] 同步过程出错:', err);
              this._showCustomModal({
                title: '同步失败',
                content: err.message || '请检查网络连接后重试',
                showCancel: false
              });
            });
        }
      }
    });
  },

  // 4. 选择配件 & 计算总价
  togglePart(e) {
    console.log('[togglePart] 点击配件卡片，event:', e);
    console.log('[togglePart] target:', e.target);
    console.log('[togglePart] currentTarget:', e.currentTarget);
    
    if (e.target.dataset.type === 'del') return;
    const idx = e.currentTarget.dataset.index;
    const list = this.data.currentPartsList;
    
    console.log('[togglePart] 索引:', idx, '配件:', list[idx]);
    
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
    console.log('[adminEditPartPrice] ========== 点击编辑按钮 ==========');
    console.log('[adminEditPartPrice] isAdmin:', this.data.isAdmin);
    console.log('[adminEditPartPrice] event:', e);
    
    if (!this.data.isAdmin) {
      console.warn('[adminEditPartPrice] 非管理员，退出');
      this._showCustomToast('需要管理员权限', 'none');
      return;
    }

    const idx = e.currentTarget.dataset.index;
    const part = this.data.currentPartsList[idx];
    
    console.log('[adminEditPartPrice] 索引:', idx);
    console.log('[adminEditPartPrice] 配件:', part);

    // 1. 弹出菜单让选
    console.log('[adminEditPartPrice] 准备弹出菜单');
    wx.showActionSheet({
      itemList: ['修改名称', '修改价格', '删除配件'],
      itemColor: '#000000',
      success: (res) => {
        console.log('[adminEditPartPrice] 菜单选择结果:', res.tapIndex);
        if (res.tapIndex === 0) {
          console.log('[adminEditPartPrice] 选择：修改名称');
          this.showEditModal('name', part, idx);  // 改名，传递索引
        } else if (res.tapIndex === 1) {
          console.log('[adminEditPartPrice] 选择：修改价格');
          this.showEditModal('price', part, idx); // 改价，传递索引
        } else if (res.tapIndex === 2) {
          console.log('[adminEditPartPrice] 选择：删除配件');
          this.adminDeletePart(part, idx); // 删除配件
        }
      },
      fail: (err) => {
        console.error('[adminEditPartPrice] 菜单弹出失败:', err);
      }
    });
  },

  // [新增] 长按开始拖拽
  handleLongPress(e) {
    if (!this.data.isAdmin) {
      console.log('[handleLongPress] 非管理员模式');
      return;
    }
    
    const idx = e.currentTarget.dataset.index;
    console.log('[handleLongPress] 长按触发，索引:', idx);
    
    // 震动反馈
    wx.vibrateShort({ type: 'heavy' });
    
    // 获取卡片信息
    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.part-tag').boundingClientRect();
    query.exec((res) => {
      if (res && res[0] && res[0][idx]) {
        const rect = res[0][idx];
        console.log('[handleLongPress] 卡片位置:', rect);
        
        this.setData({
          isDragging: true,
          dragIndex: idx,
          cardWidth: rect.width,
          cardHeight: rect.height,
          cardInitX: rect.left,
          cardInitY: rect.top,
          dragX: rect.left,
          dragY: rect.top,
          touchStartX: 0,
          touchStartY: 0
        });
      }
    });
  },

  // [新增] 触摸移动
  handleTouchMove(e) {
    if (!this.data.isAdmin || !this.data.isDragging) return;
    
    const touch = e.touches[0];
    
    // 记录初始位置（如果还没记录）
    if (this.data.touchStartX === 0 && this.data.touchStartY === 0) {
      this.setData({
        touchStartX: touch.pageX,
        touchStartY: touch.pageY
      });
    }
    
    // 计算新位置（卡片中心跟随手指）
    // 使用 pageX/pageY 相对于页面的位置
    const newX = touch.pageX - this.data.cardWidth / 2;
    const newY = touch.pageY - this.data.cardHeight / 2;
    
    // 限制在屏幕范围内
    const systemInfo = wx.getSystemInfoSync();
    const minX = 0;
    const maxX = systemInfo.windowWidth - this.data.cardWidth;
    const minY = 0;
    const maxY = systemInfo.windowHeight - this.data.cardHeight;
    
    const clampedX = Math.max(minX, Math.min(maxX, newX));
    const clampedY = Math.max(minY, Math.min(maxY, newY));
    
    this.setData({
      dragX: clampedX,
      dragY: clampedY
    });
    
    // 检测是否需要交换位置（同时传递 X 和 Y 坐标）
    this.checkSwap(touch.clientX || touch.pageX, touch.clientY || touch.pageY);
  },

  // [新增] 触摸结束
  handleTouchEnd(e) {
    if (!this.data.isAdmin) return;
    
    if (!this.data.isDragging) {
      return; // 如果不在拖动状态，直接返回
    }
    
    const dragIndex = this.data.dragIndex;
    console.log('[handleTouchEnd] 触摸结束，当前 dragIndex:', dragIndex);
    
    // 直接重置状态，让卡片回到正常流式布局（因为顺序已经更新了）
    // 保存到云端
    this.updatePartsOrderToCloud(this.data.currentPartsList);
    
    // 重置状态
    this.setData({
      isDragging: false,
      dragIndex: -1,
      dragX: 0,
      dragY: 0,
      touchStartX: 0,
      touchStartY: 0
    });
    
    console.log('[handleTouchEnd] 拖动完成，状态已重置');
  },

  // [新增] 检测交换位置（优化版：稳定检测 + 防弹跳 + 左右列识别）
  checkSwap(touchX, touchY) {
    const list = this.data.currentPartsList;
    const dragIndex = this.data.dragIndex;
    
    if (dragIndex === -1 || !list || list.length === 0) return;
    
    // 🔴 稳定检测：需要手指在目标位置停留一段时间才交换
    const MIN_MOVE_THRESHOLD = 15; // 最小移动阈值（px）
    const STABLE_TIME = 150; // 稳定时间（ms）
    const LOCK_TIME = 400; // 锁定时间（ms），防止频繁交换
    
    // 初始化稳定检测相关变量
    if (!this._stableTarget) {
      this._stableTarget = { index: -1, time: 0, touchX: 0, touchY: 0 };
    }
    if (!this._lastSwapTime) {
      this._lastSwapTime = 0;
    }
    if (!this._lastTouchX) {
      this._lastTouchX = touchX;
    }
    if (!this._lastTouchY) {
      this._lastTouchY = touchY;
    }
    
    // 检查移动距离是否超过阈值（同时考虑 X 和 Y）
    const moveDistanceX = Math.abs(touchX - this._lastTouchX);
    const moveDistanceY = Math.abs(touchY - this._lastTouchY);
    const moveDistance = Math.sqrt(moveDistanceX * moveDistanceX + moveDistanceY * moveDistanceY);
    
    if (moveDistance < MIN_MOVE_THRESHOLD) {
      // 移动距离太小，不处理
      return;
    }
    this._lastTouchX = touchX;
    this._lastTouchY = touchY;
    
    // 检查是否在锁定期内
    const now = Date.now();
    if (now - this._lastSwapTime < LOCK_TIME) {
      return; // 还在锁定期内，不处理
    }
    
    // 使用查询获取所有卡片的实际位置
    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.part-tag-wrapper').boundingClientRect();
    query.exec((res) => {
      if (!res || !res[0]) return;
      
      const rects = res[0];
      let targetIndex = -1;
      let minDistance = Infinity;
      
      // 🔴 关键修复：同时考虑 X 和 Y 坐标，计算到卡片中心的欧几里得距离
      for (let i = 0; i < rects.length; i++) {
        if (i === dragIndex) continue; // 跳过自己
        
        const rect = rects[i];
        if (!rect) continue;
        
        // 计算卡片中心点
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 计算手指到卡片中心的欧几里得距离
        const deltaX = touchX - centerX;
        const deltaY = touchY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 检查手指是否在卡片范围内（增加 padding，同时考虑 X 和 Y）
        const paddingX = 30; // X 方向容错范围（更大，因为左右列）
        const paddingY = 20; // Y 方向容错范围
        const isInCardX = touchX >= rect.left - paddingX && touchX <= rect.right + paddingX;
        const isInCardY = touchY >= rect.top - paddingY && touchY <= rect.bottom + paddingY;
        const isInCard = isInCardX && isInCardY;
        
        // 🔴 关键优化：优先考虑同一列（X 坐标接近），然后再考虑距离
        const currentRect = rects[dragIndex];
        if (currentRect) {
          const currentCenterX = currentRect.left + currentRect.width / 2;
          const isSameColumn = Math.abs(centerX - currentCenterX) < rect.width; // 判断是否在同一列
          
          // 如果在同一列，降低距离权重（优先同列）
          // 如果不在同一列，增加距离权重（允许跨列，但需要更精确）
          const distanceWeight = isSameColumn ? distance * 0.8 : distance * 1.2;
          
          if (isInCard && distanceWeight < minDistance) {
            minDistance = distanceWeight;
          targetIndex = i;
          }
        } else {
          // 如果无法获取当前卡片位置，直接使用距离
          if (isInCard && distance < minDistance) {
            minDistance = distance;
            targetIndex = i;
          }
        }
      }
      
      // 如果没找到，根据Y坐标判断是向上还是向下（保持原有逻辑作为后备）
      if (targetIndex === -1 && rects.length > 0) {
        const currentRect = rects[dragIndex];
        if (currentRect) {
          if (touchY < currentRect.top && dragIndex > 0) {
            targetIndex = dragIndex - 1;
          } else if (touchY > currentRect.bottom && dragIndex < list.length - 1) {
            targetIndex = dragIndex + 1;
          }
        }
      }
      
      // 🔴 稳定检测：检查目标是否稳定
      if (targetIndex !== -1 && targetIndex !== dragIndex) {
        if (this._stableTarget.index === targetIndex) {
          // 目标相同，检查是否稳定足够长时间
          const stableDuration = now - this._stableTarget.time;
          if (stableDuration >= STABLE_TIME) {
            // 稳定时间足够，执行交换
            this._performSwap(dragIndex, targetIndex, list, rects);
            this._stableTarget = { index: -1, time: 0, touchX: 0, touchY: 0 }; // 重置
            this._lastSwapTime = now;
          }
        } else {
          // 目标改变，重新开始计时
          this._stableTarget = { index: targetIndex, time: now, touchX: touchX, touchY: touchY };
        }
      } else {
        // 没有有效目标，重置稳定检测
        this._stableTarget = { index: -1, time: 0, touchX: 0, touchY: 0 };
      }
    });
  },
  
  // 🔴 执行交换操作（抽离出来）
  _performSwap(dragIndex, targetIndex, list, rects) {
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
        console.log('[checkSwap] 交换位置:', dragIndex, '→', targetIndex);
        
        const newList = [...list];
        const [movedItem] = newList.splice(dragIndex, 1);
        newList.splice(targetIndex, 0, movedItem);
        
        // 更新 order
        newList.forEach((item, index) => {
          item.order = index;
        });
        
        // 更新初始位置（使用实际位置）
        if (rects[targetIndex]) {
          this.setData({
            currentPartsList: newList,
            dragIndex: targetIndex,
            cardInitY: rects[targetIndex].top
          });
        } else {
          this.setData({
            currentPartsList: newList,
            dragIndex: targetIndex
          });
        }
        
        // 震动反馈
        wx.vibrateShort({ type: 'light' });
  },

  // [新增] 移动配件位置
  movePart(fromIndex, toIndex) {
    console.log('[movePart] 移动配件，从', fromIndex, '到', toIndex);
    
    const list = [...this.data.currentPartsList];
    
    // 移除原位置的元素
    const [movedItem] = list.splice(fromIndex, 1);
    // 插入到新位置
    list.splice(toIndex, 0, movedItem);
    
    // 更新 order 字段
    list.forEach((item, index) => {
      item.order = index;
    });
    
    console.log('[movePart] 新顺序:', list.map((p, i) => `${i}: ${p.name}`));
    
    // 更新本地显示
    this.setData({ currentPartsList: list });
    
    // 保存到云端
    this.updatePartsOrderToCloud(list);
    
    this._showCustomToast('排序已更新', 'success');
  },

  // [新增] 更新配件顺序到云端
  updatePartsOrderToCloud(list) {
    console.log('[updatePartsOrderToCloud] 开始更新云端顺序');
    
    this.showMyLoading('保存中...');
    
    // 批量更新：只更新有 _id 的配件
    const updatePromises = list
      .filter(item => item._id)
      .map(item => {
        console.log('[updatePartsOrderToCloud] 更新配件:', item.name, 'order:', item.order);
        return wx.cloud.callFunction({
          name: 'updateShouhouPart',
          data: {
            _id: item._id,
            updateData: {
              order: item.order
            }
          }
        });
      });
    
    if (updatePromises.length === 0) {
      this.hideMyLoading();
      console.log('[updatePartsOrderToCloud] 没有需要更新的配件（都没有 _id）');
      return;
    }
    
    Promise.all(updatePromises)
      .then((results) => {
        this.hideMyLoading();
        console.log('[updatePartsOrderToCloud] 所有配件顺序更新完成，结果:', results);
        
        const failedCount = results.filter(r => !r.result || !r.result.success).length;
        if (failedCount > 0) {
          console.warn('[updatePartsOrderToCloud] 有', failedCount, '个配件更新失败');
            this._showCustomToast(
              `排序已保存（${failedCount}个失败）`,
              'none',
              2000
            );
        } else {
          console.log('[updatePartsOrderToCloud] ✅ 所有配件顺序更新成功');
        }
      })
      .catch((err) => {
        this.hideMyLoading();
        console.error('[updatePartsOrderToCloud] 更新顺序失败:', err);
        this._showCustomToast(
          '保存失败: ' + (err.errMsg || '未知错误'),
          'none',
          3000
        );
      });
  },

  // [新增] 管理员添加配件
  adminAddPart() {
    if (!this.data.isAdmin) return;
    
    // 先输入名称
    wx.showModal({
      title: '添加配件',
      editable: true,
      placeholderText: '请输入配件名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const partName = res.content.trim();
          if (!partName) {
            this._showCustomToast('名称不能为空', 'none');
            return;
          }
          
          // 再输入价格
          wx.showModal({
            title: '设置价格',
            editable: true,
            placeholderText: '请输入价格（元）',
            content: '0',
            success: (priceRes) => {
              if (priceRes.confirm) {
                const price = Number(priceRes.content) || 0;
                this.addPartToCloud(partName, price);
              }
            }
          });
        }
      }
    });
  },

  // [新增] 添加配件到云端和本地
  addPartToCloud(name, price) {
    this.showMyLoading('添加中...');
    const db = wx.cloud.database();
    
    // 获取当前配件列表的最大 order 值
    const currentList = this.data.currentPartsList || [];
    const maxOrder = currentList.length > 0 
      ? Math.max(...currentList.map(p => p.order || 0))
      : -1;
    
    const newPart = {
      modelName: this.data.currentModelName,
      name: name,
      price: price,
      order: maxOrder + 1,
      createTime: db.serverDate()
    };
    
    console.log('[addPartToCloud] 添加新配件:', newPart);
    
    db.collection('shouhou').add({
      data: newPart
    }).then((res) => {
      console.log('[addPartToCloud] ✅ 添加成功，_id:', res._id);
      this.hideMyLoading();
      this._showCustomToast('添加成功', 'success');
      
      // 重新加载配件列表
      this.loadParts(this.data.currentModelName);
    }).catch(err => {
      this.hideMyLoading();
      console.error('[addPartToCloud] ❌ 添加失败:', err);
      this._showCustomToast('添加失败: ' + (err.errMsg || '未知错误'), 'none', 3000);
    });
  },

  // [新增] 管理员删除配件
  adminDeletePart(part, idx) {
    console.log('[adminDeletePart] ========== 进入删除确认 ==========');
    console.log('[adminDeletePart] isAdmin:', this.data.isAdmin);
    console.log('[adminDeletePart] part:', part);
    console.log('[adminDeletePart] idx:', idx);
    
    if (!this.data.isAdmin) {
      console.warn('[adminDeletePart] 非管理员，退出');
      return;
    }
    
    console.log('[adminDeletePart] 准备弹出确认对话框');
    
    // 延迟一下，确保前一个 ActionSheet 已关闭
    setTimeout(() => {
      console.log('[adminDeletePart] 延迟后开始弹出确认对话框');
    this._showCustomModal({
        title: '确认删除',
        content: `确定要删除配件"${part.name}"吗？`,
        confirmText: '删除',
        cancelText: '取消',
        success: (res) => {
          console.log('[adminDeletePart] 对话框返回结果:', res);
          console.log('[adminDeletePart] res.confirm:', res.confirm);
          if (res.confirm) {
            console.log('[adminDeletePart] 用户确认删除，调用 deletePartFromCloud');
            this.deletePartFromCloud(part, idx);
          } else {
            console.log('[adminDeletePart] 用户取消删除');
          }
        },
        fail: (err) => {
          console.error('[adminDeletePart] 对话框弹出失败:', err);
        },
        complete: () => {
          console.log('[adminDeletePart] 对话框 complete 回调');
        }
      });
    }, 300); // 延迟 300ms
  },

  // [新增] 从云端和本地删除配件
  deletePartFromCloud(part, idx) {
    console.log('[deletePartFromCloud] ========== 开始删除配件 ==========');
    console.log('[deletePartFromCloud] 配件名称:', part.name);
    console.log('[deletePartFromCloud] 配件索引:', idx);
    console.log('[deletePartFromCloud] 配件_id:', part._id);
    console.log('[deletePartFromCloud] 配件完整数据:', JSON.stringify(part));
    
    this.showMyLoading('删除中...');
    
    // 如果有 _id，从云端删除
    if (part._id) {
      console.log('[deletePartFromCloud] 配件有 _id，准备调用云函数删除');
      console.log('[deletePartFromCloud] 调用参数:', { _id: part._id });
      
      wx.cloud.callFunction({
        name: 'deleteShouhouPart',
        data: {
          _id: part._id
        }
      }).then((res) => {
        console.log('[deletePartFromCloud] 云函数调用返回 - 完整结果:', JSON.stringify(res));
        console.log('[deletePartFromCloud] res.result:', res.result);
        console.log('[deletePartFromCloud] res.errMsg:', res.errMsg);
        
        const result = res.result || {};
        console.log('[deletePartFromCloud] result.success:', result.success);
        console.log('[deletePartFromCloud] result.error:', result.error);
        console.log('[deletePartFromCloud] result.message:', result.message);
        
        if (result.success) {
          console.log('[deletePartFromCloud] ✅ 云端删除成功');
          this.hideMyLoading();
            this._showCustomToast('删除成功', 'success');
          
          // 从本地列表中删除
          const list = [...this.data.currentPartsList];
          console.log('[deletePartFromCloud] 删除前列表长度:', list.length);
          list.splice(idx, 1);
          console.log('[deletePartFromCloud] 删除后列表长度:', list.length);
          console.log('[deletePartFromCloud] 删除后列表内容:', list.map(p => p.name));
          
          this.setData({ currentPartsList: list });
          
          // 重新计算动态高度
          const rows = Math.ceil(list.length / 3);
          const calculatedHeight = rows <= 3 ? 80 : Math.min(120, (rows - 3) * 20 + 80);
          this.setData({ partsPlaceholderHeight: calculatedHeight + 'rpx' });
          
          console.log('[deletePartFromCloud] ========== 删除完成 ==========');
        } else {
          console.error('[deletePartFromCloud] 云函数返回 success = false');
          throw new Error(result.error || result.message || '云函数删除失败');
        }
      }).catch(err => {
        this.hideMyLoading();
        console.error('[deletePartFromCloud] ❌ 删除失败 - 捕获到错误');
        console.error('[deletePartFromCloud] 错误对象:', err);
        console.error('[deletePartFromCloud] err.errMsg:', err.errMsg);
        console.error('[deletePartFromCloud] err.message:', err.message);
        console.error('[deletePartFromCloud] err.stack:', err.stack);
        
        // 检查是否是云函数未部署的问题
        const errMsg = err.errMsg || err.message || '未知错误';
        if (errMsg.includes('FunctionName') || errMsg.includes('not found')) {
          this._showCustomModal({
            title: '删除失败',
            content: '云函数未部署或未找到，请检查：\n1. 云函数是否已上传\n2. 云函数名称是否为 deleteShouhouPart',
            showCancel: false
          });
        } else {
          this._showCustomModal({
            title: '删除失败',
            content: '错误信息：' + errMsg + '\n\n请查看控制台日志获取详细信息',
            showCancel: false
          });
        }
      });
    } else {
      // 如果没有 _id，只从本地删除
      console.log('[deletePartFromCloud] 配件无 _id，仅删除本地数据');
      this.hideMyLoading();
      const list = [...this.data.currentPartsList];
      list.splice(idx, 1);
      this.setData({ currentPartsList: list });
      
      // 重新计算动态高度
      const rows = Math.ceil(list.length / 3);
      const calculatedHeight = rows <= 3 ? 80 : Math.min(120, (rows - 3) * 20 + 80);
      this.setData({ partsPlaceholderHeight: calculatedHeight + 'rpx' });
      
            this._showCustomToast('删除成功', 'success');
      console.log('[deletePartFromCloud] ========== 本地删除完成 ==========');
    }
  },

  // [新增] 显示输入弹窗
  showEditModal(type, part, idx) {
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
          // 执行更新，传递索引
          this.updatePartData(part, type, res.content, idx);
        }
      }
    });
  },

  // [新增] 执行数据库更新
  updatePartData(part, type, value, idx) {
    this.showMyLoading('保存中...');
    const db = wx.cloud.database();
    
    // 准备要更新的数据
    let dataToUpdate = {};
    if (type === 'price') {
      dataToUpdate.price = Number(value); // 价格转数字
    } else {
      dataToUpdate.name = value; // 名字保持字符串
    }

    // A. 如果是云端已有数据 (有 _id)，直接调用云函数更新（避免权限问题）
    if (part._id) {
      console.log('[updatePartData] 通过云函数更新云端数据，_id:', part._id, '数据:', dataToUpdate);
      
      // 调用云函数来更新数据（云函数有管理员权限）
      wx.cloud.callFunction({
        name: 'updateShouhouPart',
        data: {
          _id: part._id,
          updateData: dataToUpdate
        }
      }).then((res) => {
        console.log('[updatePartData] 云函数返回结果:', res);
        const result = res.result || {};
        
        if (result.success) {
          console.log('[updatePartData] ✅ 云端更新成功');
          // 更新本地列表显示
          this.updateLocalPartList(idx, type, value);
          this.afterUpdateSuccess();
        } else {
          throw new Error(result.error || '云函数更新失败');
        }
      }).catch(err => {
        this.hideMyLoading();
        console.error('[updatePartData] ❌ 云端更新失败:', err);
        this._showCustomToast('更新失败: ' + (err.errMsg || err.message || '未知错误'), 'none', 3000);
      });
    } 
    // B. 如果是本地默认数据 (还没存过云端)，先添加到云端
    else {
      const newData = {
        modelName: this.data.currentModelName,
        name: type === 'name' ? value : part.name, // 如果改名就用新名
        price: type === 'price' ? Number(value) : (part.price || 0), // 如果改价就用新价
        order: part.order || 0,
        createTime: db.serverDate()
      };
      console.log('[updatePartData] 新建云端数据:', newData);
      db.collection('shouhou').add({
        data: newData
      }).then((res) => {
        console.log('[updatePartData] 云端新建返回结果:', res);
        if (res._id) {
          console.log('[updatePartData] ✅ 云端新建成功，_id:', res._id);
          // 云端新建成功后，更新本地列表显示，并保存新的 _id
          this.updateLocalPartList(idx, type, value, res._id);
          this.afterUpdateSuccess();
        } else {
          console.error('[updatePartData] ❌ 云端新建失败：未返回 _id');
          this.hideMyLoading();
          this._showCustomToast('新建失败：未返回ID', 'none');
        }
      }).catch(err => {
        this.hideMyLoading();
        console.error('[updatePartData] ❌ 云端新建失败:', err);
        this._showCustomToast('新建失败: ' + (err.errMsg || err.message || '未知错误'), 'none', 3000);
      });
    }
  },

  // [新增] 更新本地配件列表（不重新从云端读取）
  updateLocalPartList(idx, type, value, newId = null) {
    const list = [...this.data.currentPartsList];
    
    if (idx >= 0 && idx < list.length) {
      // 直接通过索引更新
      if (type === 'price') {
        list[idx].price = Number(value);
      } else {
        list[idx].name = value;
      }
      // 如果是新建的，更新 _id
      if (newId) {
        list[idx]._id = newId;
      }
      this.setData({ currentPartsList: list });
      console.log('[updateLocalPartList] 本地列表已更新，索引:', idx, '无需重新从云端读取');
    } else {
      console.warn('[updateLocalPartList] 索引无效:', idx);
    }
  },

  // [新增] 更新成功后的刷新
  afterUpdateSuccess() {
    this.hideMyLoading();
    this._showCustomToast('修改成功', 'success');
    // 不再重新从云端读取，直接使用已更新的本地列表
  },

  // 管理员删除配件
  deletePart(e) {
    const idx = e.currentTarget.dataset.index;
    const modelName = this.data.currentModelName;
    const part = this.data.currentPartsList[idx];
    const partName = part.name;

    this._showCustomModal({
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
                this._showCustomToast('已删除', 'success');
              })
              .catch(err => {
                console.error('删除失败:', err);
                this._showCustomToast('删除失败', 'none');
              });
          } else {
            // 本地删除（兼容旧数据）
            if (DB_PARTS[modelName]) {
              DB_PARTS[modelName].splice(idx, 1);
            }
            this.loadParts(this.data.currentModelName);
            this._showCustomToast('已删除', 'success');
          }
        }
      }
    });
  },

  // 🔴 修改：显示上传选项弹窗（参考 case 页面）
  chooseVideo() {
    this.setData({ showUploadOptions: true });
  },

  // 🔴 新增：关闭上传选项弹窗
  closeUploadOptions() {
    this.setData({ showUploadOptions: false });
  },

  // 🔴 新增：从相册选择视频（参考 case 页面）
  chooseVideoFromAlbum(e) {
    console.log('✅ chooseVideoFromAlbum 被调用', e);
    
    // 🔴 强制关闭录制层，防止它的 z-index 盖住表单
    this.setData({ 
      showUploadOptions: false,
      showCamera: false,
      cameraAnimating: false,
      isRecording: false
    });
    
    setTimeout(() => {
      wx.chooseVideo({
        sourceType: ['album'],
        maxDuration: 60,
        camera: 'back',
        success: (res) => {
          console.log('✅ 选择视频成功:', res);
          if (res.tempFilePath) {
            // 如果有微信自动生成的封面，直接使用
            if (res.thumbTempFilePath) {
              this.setData({ 
                videoFileName: '已选择视频 (点击重新上传)',
                tempVideoPath: res.tempFilePath,
                tempVideoThumb: res.thumbTempFilePath
              });
            } else {
              // 如果没有封面，先保存视频路径，然后尝试提取封面
              this.setData({ 
                videoFileName: '已选择视频 (点击重新上传)',
                tempVideoPath: res.tempFilePath,
                tempVideoThumb: '',
                extractingThumb: true
              });
              // 延迟一下，确保视频组件已准备好
              setTimeout(() => {
                this.captureRepairVideoFrame();
              }, 500);
            }
          } else {
            console.error('视频文件路径不存在');
            this._showCustomToast('视频文件异常，请重试', 'none');
          }
        },
        fail: (err) => {
          // 用户取消不提示
          if (err && (err.errMsg || '').includes('cancel')) {
            return;
          }
          console.error('❌ 选择视频失败:', err);
          this._showCustomToast('选择失败: ' + (err.errMsg || '未知错误'), 'none', 3000);
        }
      });
    }, 300);
  },

  // 🔴 新增：选择录制（参考 case 页面）
  chooseRecord(e) {
    console.log('✅ chooseRecord 被调用', e);
    
    // 🔴 确保关闭上传选项弹窗，避免层级冲突
    this.setData({ showUploadOptions: false });
    
    // 先请求摄像头和麦克风权限
    this.requestCameraAndMicrophonePermission().then(() => {
      // 权限获取成功，延迟一下让弹窗关闭动画完成
      setTimeout(() => {
        if (typeof this.openCamera === 'function') {
          console.log('📷 权限已获取，准备调用 openCamera');
          this.openCamera();
        } else {
          console.error('❌ openCamera 方法不存在');
          this._showCustomToast('打开相机失败：方法不存在', 'none', 3000);
        }
      }, 300);
    }).catch((err) => {
      console.error('❌ 权限获取失败:', err);
      // 权限获取失败，不打开相机
    });
  },

  // 🔴 新增：请求摄像头和麦克风权限（参考 case 页面）
  requestCameraAndMicrophonePermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          const cameraAuth = res.authSetting['scope.camera'];
          const recordAuth = res.authSetting['scope.record'];
          
          // 如果两个权限都已授权，直接resolve
          if (cameraAuth === true && recordAuth === true) {
            console.log('✅ 摄像头和麦克风权限已授权');
            resolve();
            return;
          }
          
          // 如果有权限被拒绝且不可再次请求，提示用户去设置
          if (cameraAuth === false || recordAuth === false) {
            this.showMyDialog({
              title: '需要权限',
              content: '录制视频需要摄像头和麦克风权限，请在设置中开启',
              showCancel: true,
              confirmText: '去设置',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.camera'] && settingRes.authSetting['scope.record']) {
                        resolve();
                      } else {
                        reject(new Error('用户未开启权限'));
                      }
                    },
                    fail: () => {
                      reject(new Error('打开设置失败'));
                    }
                  });
                } else {
                  reject(new Error('用户取消授权'));
                }
              }
            });
            return;
          }
          
          // 请求摄像头权限
          const requestCamera = () => {
            return new Promise((resolveCam, rejectCam) => {
              if (cameraAuth === true) {
                resolveCam();
                return;
              }
              wx.authorize({
                scope: 'scope.camera',
                success: () => {
                  console.log('✅ 摄像头权限授权成功');
                  resolveCam();
                },
                fail: (err) => {
                  console.error('❌ 摄像头权限授权失败:', err);
                  rejectCam(err);
                }
              });
            });
          };
          
          // 请求麦克风权限
          const requestRecord = () => {
            return new Promise((resolveRec, rejectRec) => {
              if (recordAuth === true) {
                resolveRec();
                return;
              }
              wx.authorize({
                scope: 'scope.record',
                success: () => {
                  console.log('✅ 麦克风权限授权成功');
                  resolveRec();
                },
                fail: (err) => {
                  console.error('❌ 麦克风权限授权失败:', err);
                  rejectRec(err);
                }
              });
            });
          };
          
          // 依次请求两个权限
          requestCamera().then(() => {
            return requestRecord();
          }).then(() => {
            resolve();
          }).catch((err) => {
            reject(err);
          });
        },
        fail: (err) => {
          console.error('❌ 获取权限设置失败:', err);
          reject(err);
        }
      });
    });
  },

  // 🔴 新增：阻止事件冒泡
  preventBubble(e) {
    if (e) {
      e.stopPropagation && e.stopPropagation();
    }
  },

  // 🔴 新增：阻止滚动
  preventScroll() {
    return false;
  },

  // 🔴 新增：相机准备就绪（在 onReady 中调用，用于创建 camera context）
  onCameraReady() {
    this.ctx = wx.createCameraContext();
  },

  // 🔴 新增：打开相机（参考 case 页面）
  openCamera() {
    // 1. 先设置显示状态
    this.setData({ 
      showCamera: true, 
      cameraAnimating: true,
      showPrivacyTip: true 
    }); 
    
    // 2. 使用短延迟触发弹出动画
    if (typeof wx.nextTick === 'function') {
      wx.nextTick(() => {
        this.setData({ cameraAnimating: false });
      });
    } else {
      setTimeout(() => {
        this.setData({ cameraAnimating: false });
      }, 16);
    }
    
    // 3. 隐私提示显示 4 秒后自动消失
    setTimeout(() => {
      this.setData({ showPrivacyTip: false });
    }, 4000);
  },

  // 🔴 新增：关闭相机（参考 case 页面）
  closeCamera() {
    this.setData({ 
      showPrivacyTip: false,
      isRecording: false,
      recTimeStr: "00:00"
    });
    
    if(this.data.isRecording) {
      this.stopRecordLogic(false); 
      setTimeout(() => {
        this.setData({ cameraAnimating: true });
        setTimeout(() => {
          this.setData({ showCamera: false, cameraAnimating: false });
        }, 200);
      }, 30);
    } else {
      this.setData({ cameraAnimating: true });
      setTimeout(() => {
        this.setData({ 
          showCamera: false, 
          cameraAnimating: false 
        }); 
      }, 200);
    }
  },

  // 🔴 新增：切换录制（参考 case 页面）
  toggleRecord() {
    if (this.data.isStopping) {
      console.log('⚠️ 正在停止录制，请稍候...');
      return;
    }
    
    if(this.data.isRecording) {
      this.stopRecordLogic(true); 
    } else {
      wx.vibrateShort();
      this.startRecordLogic(); 
    }
  },

  // 🔴 新增：开始录制逻辑（参考 case 页面）
  startRecordLogic() {
    if (!this.ctx) {
      this.ctx = wx.createCameraContext();
    }
    
    this.ctx.startRecord({ 
      timeoutCallback: { duration: 60 },
      success:()=>{
        this.setData({isRecording: true, recTimeStr: "00:00"});
        this.startTime = Date.now();
        
        if(this.data.timer) clearInterval(this.data.timer);
        let seconds = 0;
        this.data.timer = setInterval(() => {
          seconds++;
          const min = Math.floor(seconds / 60).toString().padStart(2, '0');
          const sec = (seconds % 60).toString().padStart(2, '0');
          this.setData({ recTimeStr: `${min}:${sec}` });
        }, 1000);
      },
      fail: (err) => {
        console.error('录制失败', err);
        this._showCustomToast('录制启动失败', 'none');
        this.setData({ isRecording: false });
      }
    }); 
  },

  // 🔴 新增：停止录制逻辑（参考 case 页面）
  stopRecordLogic(save) {
    if (!this.data.isRecording) {
      console.log('⚠️ [警告] 当前未在录制，无需停止');
      return;
    }
    
    this.setData({ isStopping: true });
    wx.vibrateShort();
    
    if (!this.ctx) {
      console.error('❌ camera context 不存在');
      this.setData({ 
        isRecording: false, 
        isStopping: false 
      });
      return;
    }
    
    console.log('🔄 开始停止录制...');
    
    this.ctx.stopRecord({ 
      success:(res)=>{
        console.log('✅ 录制结束，返回结果:', res);
        
        if (this.data.timer) {
          clearInterval(this.data.timer);
          this.setData({ timer: null });
        }

        this.setData({
          isRecording: false, 
          recTimeStr: "00:00",
          isStopping: false
        }); 

        setTimeout(() => {
          if(save && res.tempVideoPath) {
            // 🔴 关闭相机层，设置视频路径
            this.setData({
              showCamera: false, 
              cameraAnimating: false,
              tempVideoPath: res.tempVideoPath,
              tempVideoThumb: '' // 先清空封面，稍后提取
            });
            
            // 提取封面
            setTimeout(() => {
              this.setData({ extractingThumb: true });
              setTimeout(() => {
                this.captureRepairVideoFrame();
              }, 500);
            }, 300);
          } else if (save) {
            this._showCustomToast('录制无效', 'none');
          }
        }, 250);
      },
      fail: (err) => {
        console.error('❌ 停止失败', err);
        this.setData({
          isRecording: false,
          isStopping: false
        });
        this._showCustomToast('停止录制失败', 'none');
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
      this._showCustomToast('内容不能为空', 'none');
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
    
    this._showCustomToast('解析完成', 'success');
  },
  
  // 🔴 优化：高级解析算法（解析姓名、电话、地址）
  parseAddress(text) {
    if (!text || !text.trim()) {
      return { name: '', phone: '', address: '' };
    }
    
    let cleanText = text.trim();
    let name = '';
    let phone = '';
    let address = '';
    
    // 1. 提取手机号（更严格）
    const phonePattern = /\b1[3-9]\d{9}\b/;
    const phoneMatch = cleanText.match(phonePattern);
    if (phoneMatch) {
      phone = phoneMatch[0];
      cleanText = cleanText.replace(phonePattern, ' ').trim();
    }

    // 2. 提取固定电话（带区号的）
    if (!phone) {
      const telPattern = /\b0\d{2,3}-?\d{7,8}\b/;
      const telMatch = cleanText.match(telPattern);
      if (telMatch) {
        phone = telMatch[0];
        cleanText = cleanText.replace(telPattern, ' ').trim();
      }
    }
    
    // 3. 🔴 优化：更彻底地清理杂质，移除所有标签和无用词汇
    cleanText = cleanText
      // 移除所有地址相关标签
      .replace(/收件人[:：]?|收货人[:：]?|姓名[:：]?|联系人[:：]?|联系电话[:：]?|电话[:：]?|手机[:：]?|地址[:：]?|详细地址[:：]?|收件地址[:：]?|收货地址[:：]?/g, ' ')
      // 移除号码、编号等无用词汇
      .replace(/号码[:：]?|编号[:：]?|单号[:：]?|订单号[:：]?|运单号[:：]?/g, ' ')
      // 移除所有括号和特殊符号
      .replace(/[()（）【】\[\]<>《》""''""''、，。；：！？]/g, ' ')
      // 移除多余空格
      .replace(/\s+/g, ' ')
      .trim();

    // 4. 提取姓名（更智能的判断）
    const addressKeywords = ['省', '市', '区', '县', '镇', '街道', '路', '街', '道', '号', '室', '楼', '苑', '村', '组', '栋', '单元', '层', '房'];
    const namePattern = /^([\u4e00-\u9fa5]{2,4})/;
    const nameMatch = cleanText.match(namePattern);
    
    if (nameMatch) {
      const candidateName = nameMatch[1];
      // 检查候选姓名是否包含地址关键词
      const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
      
      // 如果候选姓名不包含地址关键词，且长度合理，则认为是姓名
      if (!hasAddressKeyword && candidateName.length >= 2 && candidateName.length <= 4) {
        name = candidateName;
        cleanText = cleanText.replace(new RegExp('^' + candidateName), '').trim();
      }
    }
    
    // 5. 如果姓名没提取到，尝试从电话前后提取
    if (!name && phone && text.includes(phone)) {
      const phoneIndex = text.indexOf(phone);
      const beforePhone = text.substring(0, phoneIndex).trim();
      const afterPhone = text.substring(phoneIndex + phone.length).trim();
      
      // 检查电话前面的内容
      const nameBeforeMatch = beforePhone.match(/([\u4e00-\u9fa5]{2,4})\s*$/);
      if (nameBeforeMatch) {
        const candidateName = nameBeforeMatch[1];
        const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
        if (!hasAddressKeyword) {
          name = candidateName;
          cleanText = cleanText.replace(new RegExp(candidateName), '').trim();
        }
      }
      
      // 检查电话后面的内容（通常是地址）
      if (!name) {
        const nameAfterMatch = afterPhone.match(/^\s*([\u4e00-\u9fa5]{2,4})/);
        if (nameAfterMatch) {
          const candidateName = nameAfterMatch[1];
          const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
          if (!hasAddressKeyword) {
            name = candidateName;
            cleanText = cleanText.replace(new RegExp(candidateName), '').trim();
      }
        }
      }
    }

    // 6. 🔴 优化：剩余部分作为地址，再次清理后解析
    if (cleanText) {
      // 再次清理地址文本，移除可能的残留标签
      let addressText = cleanText
        .replace(/收件人|收货人|姓名|联系人|电话|手机|地址|详细地址|号码|编号/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const parsedAddress = this.parseAddressForShipping(addressText);
      address = parsedAddress.fullAddress || addressText;
    }

    return {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim()
    };
  },

  // 🔴 优化：地址解析函数（智能识别省市区，用于计算运费）
  // ========================================================
  parseAddressForShipping(addressText) {
    if (!addressText || !addressText.trim()) {
      return { province: '', city: '', district: '', detail: '', fullAddress: addressText };
    }
    
    let text = addressText.trim();
    let province = '';
    let city = '';
    let district = '';
    let detail = '';
    
    // 🔴 优化：更彻底地清理地址文本，移除所有标签和无用词汇
    text = text
      // 移除所有地址相关标签
      .replace(/收件人|收货人|姓名|联系人|电话|手机|地址|详细地址|收件地址|收货地址/g, ' ')
      // 移除号码、编号等无用词汇
      .replace(/号码|编号|单号|订单号|运单号/g, ' ')
      // 移除常见分隔符
      .replace(/[\/、，。；：！？]/g, ' ')
      // 移除所有括号
      .replace(/[()（）【】\[\]<>《》""'']/g, ' ')
      // 统一空格
      .replace(/\s+/g, ' ')
      .trim();
    
    // 方法1: 按顺序识别 省 -> 市 -> 区/县 -> 详细地址
    let remaining = text;
    
    // 识别省（必须包含"省"字，但不能是"省市区"这样的组合）
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
    
    // 识别区/县（必须包含"区"或"县"字，排除已识别的省市）
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
    
    // 🔴 优化：剩余部分作为详细地址，再次清理无用词汇
    detail = remaining
      .replace(/收件人|收货人|姓名|联系人|电话|手机|地址|详细地址|号码|编号/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 组装完整地址（格式化输出）
    let fullAddress = '';
    const parts = [];
    if (province) parts.push(province);
    if (city) parts.push(city);
    if (district) parts.push(district);
    if (detail) parts.push(detail);
    
    fullAddress = parts.join(' ').trim();
    
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
      this._showCustomModal({
        title: '提示',
        content: `当前 ${currentModelName} 型号的配件列表为空，请先添加配件或联系管理员`,
        showCancel: false
      });
      return;
    }

    if (selectedCount === 0) {
      // 提示用户选择配件，并显示所有可用配件
      const partNames = currentPartsList.map(p => p.name).join('、');
      this.showAutoToast('提示', `请先点击配件进行选择。可用配件：${partNames.substring(0, 50)}${partNames.length > 50 ? '...' : ''}`);
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
      if (cart.length === 0) {
        this.showAutoToast('提示', '请选择配件');
        return;
      }
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
      this.showAutoToast('提示', '请填写故障描述');
      return;
    }
    if (!tempVideoPath) {
      this.showAutoToast('提示', '请上传故障视频');
      return;
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
        this.showAutoToast('提示', '请填写故障描述');
        return;
      }
      if (!tempVideoPath) {
        this.showAutoToast('提示', '请上传故障视频');
        return;
      }
      // 检查地址：优先使用 detailAddress，如果没有则使用 orderInfo.address
      const address = this.data.detailAddress || orderInfo.address;
      if (!orderInfo.name || !orderInfo.phone || !address) {
        this.showAutoToast('提示', '请完善联系信息');
        return;
      }
      
      // 手机号格式验证
      if (!/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
        this.showAutoToast('提示', '请输入正确的11位手机号');
        return;
      }
      
      // 地址格式验证
      if (address && address.trim()) {
        const parsed = this.parseAddressForShipping(address);
        if (!parsed.province && !parsed.city) {
          this.showAutoToast('提示', '地址格式不正确，请包含省市区信息，如：广东省 佛山市 南海区 某某街道101号');
          return;
        }
      }

      // 先关闭可能存在的自动提示，确保确认弹窗能正常显示
      this.setData({ 'autoToast.show': false });
      
      // 支付/提交之前先弹出确认：定制维修服务不支持退款
      this.showMyDialog({
        title: '维修服务确认',
        content: '此为定制维修配件服务，下单后不支持退款。',
        showCancel: true,
        confirmText: '提交',
        cancelText: '取消',
        callback: () => {
          this.submitRepairTicket();
        }
      });
      return;
    }

    // 配件购买模式（原有逻辑）
    // 校验
    if (cart.length === 0) {
      this.showAutoToast('提示', '清单为空');
      return;
    }
    if (!orderInfo.name || !orderInfo.phone) {
      this.showAutoToast('提示', '请填写联系人');
      return;
    }
    
    // 手机号格式验证
    if (!/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
      this.showAutoToast('提示', '请输入正确的11位手机号');
      return;
    }
    
    if (!detailAddress || !detailAddress.trim()) {
      this.showAutoToast('提示', '请填写详细地址');
      return;
    }

    // 解析地址，验证是否包含省市区信息
    const parsed = this.parseAddressForShipping(detailAddress);
    if (!parsed.province && !parsed.city) {
      this.showAutoToast('提示', '地址格式不正确，请包含省市区信息，如：广东省 佛山市 南海区 某某街道101号');
      return;
    }

    // 顺丰运费校验
    if (shippingMethod === 'sf' && shippingFee === 0) {
      this.showAutoToast('提示', '请完善地址信息以计算运费');
      return;
    }

    // 拼装地址
    const fullAddressString = parsed.fullAddress || detailAddress;
    const finalInfo = { ...orderInfo, address: fullAddressString };

    // 先关闭可能存在的自动提示，确保确认弹窗能正常显示
    this.setData({ 'autoToast.show': false });
    
    // 调支付
    this.showMyDialog({
      title: '确认支付',
      content: '定制服务不支持退款。',
      showCancel: true,
      confirmText: '支付',
      cancelText: '取消',
      callback: () => {
        this.doCloudSubmit('pay', cart, finalInfo, finalTotalPrice, shippingFee, shippingMethod);
      }
    });
  },

  // 统一的云函数调用
  doCloudSubmit(action, goods, addr, total, fee, method) {
    this.showMyLoading('处理中...');
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
        this.hideMyLoading();
        const payment = res.result;

        if (action === 'pay' && payment && payment.paySign) {
          wx.requestPayment({
            ...payment,
            success: () => {
              this._showCustomToast('支付成功', 'success');
              this.closeOrderModal();
              wx.removeStorageSync('my_cart');
              this.setData({
                cart: [],
                cartTotalPrice: 0,
                finalTotalPrice: 0,
                shippingFee: 0
              });
              
              // 🔴 支付成功后，延迟同步订单信息（等待支付回调先处理，获得交易单号）
              const orderId = payment.outTradeNo;
              if (orderId) {
                this.callCheckPayResult(orderId);
              }
              
              wx.navigateTo({ url: '/pages/my/my' });
            },
            fail: () => {
              this._showCustomToast('支付取消', 'none');
            }
          });
        }
      },
      fail: () => {
        this.hideMyLoading();
        this._showCustomToast('下单失败', 'none');
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
        this._showCustomToast('请填写故障描述', 'none');
        return;
      }
      
      if (!contactName || !contactPhone || !contactAddr || !contactWechat) {
        this._showCustomToast('请完善收货信息', 'none');
        return;
      }
      
      // 提交到 shouhou_read 集合（故障报修逻辑）
      this.showMyLoading('提交中...');
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
          this.hideMyLoading();
          this._showCustomToast('提交成功', 'success');
          setTimeout(() => {
            this.setData({
              repairDescription: '',
              videoFileName: ''
            });
          }, 1500);
        },
        fail: (err) => {
          this.hideMyLoading();
          console.error('提交失败:', err);
          this._showCustomToast('提交失败，请重试', 'none');
        }
      });
      return;
    }

    // 配件购买逻辑
    // 校验
    if (selectedCount === 0) {
      this._showCustomToast('请选择配件', 'none');
      return;
    }
    if (!orderInfo.name || !orderInfo.phone || !orderInfo.address) {
      this.showAutoToast('提示', '请完善收货信息');
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

    // 先关闭可能存在的自动提示，确保确认弹窗能正常显示
    this.setData({ 'autoToast.show': false });
    
    // 弹出免责声明
    this.showMyDialog({
      title: '维修服务确认',
      content: '此为定制维修配件服务，下单后不支持退款。',
      showCancel: true,
      confirmText: '支付',
      cancelText: '取消',
      callback: () => {
        this.doPayment(goods, totalPrice, orderInfo);
      }
    });
  },

  // [修改] 支付执行函数 (适配新的参数结构)
  doPayment(goodsList, totalPrice, addressData) {
    this.showMyLoading('正在下单...');

    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: totalPrice,
        goods: goodsList, // 直接传购物车数组
        addressData: addressData
      },
      success: res => {
        this.hideMyLoading();
        const payment = res.result;
        
        if (!payment || !payment.paySign) {
           return this._showCustomToast('系统审核中', 'none');
        }

        wx.requestPayment({
          ...payment,
          success: () => {
            this._showCustomToast('支付成功', 'success');
            this.closeOrderModal();
            // 清空选中状态
            this.loadParts(this.data.currentModelName); 
            this.setData({ 
              cart: [], 
              cartTotalPrice: 0,
              selectedCount: 0,
              totalPrice: 0
            });
            
            const orderId = payment.outTradeNo;
            if (orderId) {
              this.callCheckPayResult(orderId);
            }

            setTimeout(() => {
              wx.navigateTo({ url: '/pages/my/my' });
            }, 1000);
          },
          fail: () => {
            this._showCustomToast('支付取消', 'none');
          }
        });
      },
      fail: err => {
        this.hideMyLoading();
        this._showCustomToast('下单失败', 'none');
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
        console.log('[shouhou] checkPayResult 返回:', result);
        if (result.success) {
          this._showCustomToast('订单已确认', 'success');
        } else if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          this._showCustomToast(
            result.msg || '支付状态待确认，请稍后查看"我的订单"',
            'none'
          );
        }
      },
      fail: (err) => {
        console.error('[shouhou] checkPayResult 调用失败:', err);
        if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          this._showCustomToast(
            '网络异常，请稍后在"我的订单"查看',
            'none'
          );
        }
      },
      complete: () => {
        this.hideMyLoading();
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

    this._showCustomModal({
      title: '提示',
      content: `确定删除教程「${target.title}」吗？\n（同组型号的视频也会被删除）`,
      success: (res) => {
        if (res.confirm) {
          // 从云数据库删除（同组共享，删除一个即可）
          if (this.db && target._id) {
            this.db.collection('shouhouvideo').doc(target._id).remove()
              .then(() => {
                this.renderVideos();
                this._showCustomToast('已删除', 'success');
              })
              .catch(err => {
                console.error('删除失败:', err);
                this._showCustomToast('删除失败', 'none');
              });
          } else {
            // 本地删除（兼容旧数据）
            const modelName = this.data.currentModelName;
            if (DB_VIDEOS[modelName]) {
              DB_VIDEOS[modelName].splice(idx, 1);
            }
            this.renderVideos();
            this._showCustomToast('已删除', 'success');
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
      
      // 更新 order 值（根据当前显示顺序）
      newList.forEach((item, index) => {
        item.order = index;
      });
      
      this.setData({
        currentVideoList: newList,
        dragIndex: targetIndex,
        dragStartY: currentY - remainingOffset, // 更新起始位置，保持连续性
        dragOffsetY: remainingOffset, // 保持剩余偏移量，让卡片继续跟随
        lastSwapIndex: targetIndex // 记录本次交换的位置
      });
      
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
      
      // 🔴 优化：统一保存所有 order 值（类似 azjc 页面的实现）
      if (this.db && videoList.length > 0) {
        const updatePromises = [];
        videoList.forEach((item, index) => {
          // 只更新 order 值有变化的项
          if (item._id && item.order !== index) {
            updatePromises.push(
            this.db.collection('shouhouvideo').doc(item._id).update({
              data: { order: index }
            }).catch(err => {
                console.error('更新order失败:', err);
              })
            );
          }
        });
        
        // 等待所有更新完成
        if (updatePromises.length > 0) {
          Promise.all(updatePromises).then(() => {
            // 更新本地数据的 order 值
            videoList.forEach((item, index) => {
              item.order = index;
            });
            this.setData({ currentVideoList: videoList });
            
            this._showCustomToast('顺序已保存', 'success', 1000);
          }).catch(err => {
            console.error('批量更新order失败:', err);
            this._showCustomToast('保存失败，请重试', 'none', 2000);
          });
        } else {
          // 没有需要更新的项，直接提示
          this._showCustomToast('顺序已保存', 'success', 1000);
        }
      } else {
        // 只有在实际移动了位置时才提示
        if (this.data.dragIndex !== this.data.lastSwapIndex || Math.abs(this.data.dragOffsetY) > 10) {
          this._showCustomToast('顺序已保存', 'success', 1000);
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
    // 🔴 防止重复点击：如果正在上传，直接返回
    if (this.data.isUploadingVideo) {
      console.log('[confirmModal] 正在上传中，忽略重复点击');
      return;
    }

    const val = this.data.modalInputVal;
    if (!val) {
      this._showCustomToast('请输入名称', 'none');
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
                this._showCustomToast('配件已添加', 'success');
                this.closeModal();
              },
              fail: (err) => {
                console.error('添加配件失败:', err);
                this._showCustomToast('添加失败，请重试', 'none');
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
                this._showCustomToast('配件已添加', 'success');
                this.closeModal();
              },
              fail: (err2) => {
                console.error('添加配件失败:', err2);
                this._showCustomToast('添加失败，请重试', 'none');
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
        this._showCustomToast('配件已添加', 'success');
        this.closeModal();
      }
    } else {
      // 视频模式：校验是否选择了视频
      if (!this.data.tempVideoPath) {
        this._showCustomToast('请先选择视频', 'none');
        return;
      }

      // 🔴 立即设置上传状态和加载动画，防止重复点击
      this.setData({ 
        isUploadingVideo: true,
        showLoadingAnimation: true 
      });

      // 上传视频到云存储并写入 shouhouvideo 集合（按型号独立）
      
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
          // 🔴 上传失败时清除上传状态
          this.setData({ 
            showLoadingAnimation: false,
            isUploadingVideo: false 
          });
          console.error('视频上传失败:', err);
          this._showCustomToast('视频上传失败', 'none');
        }
      });
    }
  },

  // 保存视频信息到数据库（按组同步，同组型号共享视频）
  saveVideoToDB(title, modelName, videoFileID, thumbFileID) {
    if (!this.db) {
      // 🔴 清除上传状态
      this.setData({ 
        showLoadingAnimation: false,
        isUploadingVideo: false 
      });
      this._showCustomToast('云服务未初始化', 'none');
      return;
    }

    // 获取当前型号所属的组
    const groupName = MODEL_TO_GROUP[modelName];
    if (!groupName) {
      // 🔴 清除上传状态
      this.setData({ 
        showLoadingAnimation: false,
        isUploadingVideo: false 
      });
      this._showCustomToast('型号分组错误', 'none');
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
            // 🔴 清除上传状态
            this.setData({ 
              showLoadingAnimation: false,
              isUploadingVideo: false 
            });
            this._showCustomToast('教程发布成功', 'success');
            this.closeModal();
            // 重新加载视频列表
            this.renderVideos();
          },
          fail: (err) => {
            // 🔴 清除上传状态
            this.setData({ 
              showLoadingAnimation: false,
              isUploadingVideo: false 
            });
            console.error('保存失败:', err);
            this._showCustomToast('保存失败，请重试', 'none');
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
            // 🔴 清除上传状态
            this.setData({ 
              showLoadingAnimation: false,
              isUploadingVideo: false 
            });
            this._showCustomToast('教程发布成功', 'success');
            this.closeModal();
            this.renderVideos();
          },
          fail: (err2) => {
            // 🔴 清除上传状态
            this.setData({ 
              showLoadingAnimation: false,
              isUploadingVideo: false 
            });
            console.error('保存失败:', err2);
            this._showCustomToast('保存失败，请重试', 'none');
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
          this._showCustomToast('视频已选择', 'success');
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
          this.showMyLoading('正在提取封面...');
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
          this.hideMyLoading();
          this._showCustomToast('视频已选择', 'success');
        },
        fail: (err) => {
          // 截图失败，使用占位提示
          console.error('截图失败:', err);
          this.setData({
            extractingThumb: false
          });
          this.hideMyLoading();
          this._showCustomToast('视频已选择（封面提取失败）', 'none', 2000);
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
    this._showCustomModal({
      title: '清空购物车',
      content: '确定要清空所有商品吗？',
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

          this._showCustomToast('已清空', 'none');
        }
      }
    });
  },

  // [新增] 提交维修工单
  submitRepairTicket() {
    console.log('[submitRepairTicket] ========== 开始提交维修工单 ==========');
    const { 
      currentModelName, repairDescription, videoFileName, tempVideoPath, 
      orderInfo // 复用收货信息
    } = this.data;

    console.log('[submitRepairTicket] 当前数据:', {
      currentModelName,
      repairDescription: repairDescription ? repairDescription.substring(0, 20) + '...' : '',
      tempVideoPath: tempVideoPath ? '已设置' : '未设置',
      orderInfo,
      detailAddress: this.data.detailAddress ? this.data.detailAddress.substring(0, 20) + '...' : ''
    });

    // 直接提交，不再检查（检查已在 toggleService 中完成）
    this.doSubmitRepairTicket();
  },

  // 【新增】实际提交维修工单的方法（从 submitRepairTicket 中分离出来）
  doSubmitRepairTicket() {
    const { 
      currentModelName, repairDescription, videoFileName, tempVideoPath, 
      orderInfo
    } = this.data;

    // 1. 校验
    if (!repairDescription || repairDescription.trim() === '') {
      console.warn('[submitRepairTicket] 校验失败：故障描述为空');
      this.showAutoToast('提示', '请填写故障描述');
      return;
    }
    if (!tempVideoPath) {
      console.warn('[submitRepairTicket] 校验失败：视频路径为空');
      this.showAutoToast('提示', '请上传故障视频');
      return;
    }
    // 检查地址：优先使用 detailAddress，如果没有则使用 orderInfo.address
    const address = this.data.detailAddress || orderInfo.address;
    if (!orderInfo.name || !orderInfo.phone || !address) {
      console.warn('[submitRepairTicket] 校验失败：联系信息不完整', {
        name: orderInfo.name,
        phone: orderInfo.phone,
        address: address ? '已设置' : '未设置'
      });
      this.showAutoToast('提示', '请完善联系信息');
      return;
    }
    
    // 手机号格式验证
    if (!/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
      this.showAutoToast('提示', '请输入正确的11位手机号');
      return;
    }
    
    // 地址格式验证
    if (address && address.trim()) {
      const parsed = this.parseAddressForShipping(address);
      if (!parsed.province && !parsed.city) {
        this.showAutoToast('提示', '地址格式不正确，请包含省市区信息，如：广东省 佛山市 南海区 某某街道101号');
        return;
      }
    }

    console.log('[doSubmitRepairTicket] 所有校验通过，开始上传流程');
    // 显示自定义加载动画（立即显示，确保在系统提示之前）
    this.setData({ showLoadingAnimation: true });
    
    // 使用很短的延迟确保动画已经渲染，然后再开始上传（避免微信原生提示覆盖）
    // 注意：如果微信系统提示仍然出现，可能需要使用其他上传方式
    setTimeout(() => {
      console.log('[submitRepairTicket] 开始上传视频，路径:', tempVideoPath);
      // 2. 上传视频
      const cloudPath = `repair_video/${Date.now()}_${Math.floor(Math.random()*1000)}.mp4`;
      wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempVideoPath,
      success: res => {
        console.log('[submitRepairTicket] 视频上传成功，fileID:', res.fileID);
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
        
        console.log('[submitRepairTicket] 准备写入数据库，数据:', {
          model: currentModelName,
          description: repairDescription.trim(),
          contact: finalContact
        });
        
        // 🔴 注意：_openid 是系统自动管理的字段，不能手动设置
        // 系统会自动根据当前登录用户设置 _openid
        
        // 先检查集合是否存在，如果不存在则先创建一条记录
        db.collection('shouhou_repair').add({
          data: {
            // 不设置 _openid，系统会自动设置
            type: 'repair', // 类型标记
            model: currentModelName,
            description: repairDescription.trim(),
            videoFileID: fileID,
            contact: finalContact, // 存入联系人信息（包含完整地址）
            status: 'PENDING',  // 初始状态
            createTime: db.serverDate()
          },
          success: (addRes) => {
            console.log('[submitRepairTicket] 数据库写入成功，_id:', addRes._id);
            // 隐藏自定义加载动画
            this.setData({ showLoadingAnimation: false });
            
            // 先关闭订单弹窗，避免遮挡成功提示
            this.setData({ showOrderModal: false });
            
            // 等待订单弹窗关闭动画完成后再显示成功弹窗
            setTimeout(() => {
              console.log('[submitRepairTicket] 准备显示成功弹窗');
              // 成功提示（自动消失）
              this.showAutoToast('提交成功', '售后工程师将在后台查看您的视频并进行评估。');
              // 延迟清空表单，让用户看到提示
              setTimeout(() => {
                console.log('[submitRepairTicket] 自动清空表单');
                // 清空表单
                this.setData({ 
                  repairDescription: '', 
                  videoFileName: '', 
                  tempVideoPath: '',
                  tempVideoThumb: '',
                  orderInfo: { name: '', phone: '', address: '' },
                  detailAddress: ''
                });
                // 不自动跳转到个人页，停留在当前页面（订单弹窗已经在上面关闭了）
              }, 3000);
            }, 300); // 等待订单弹窗关闭动画完成
          },
          fail: err => {
            // 隐藏自定义加载动画
            this.setData({ showLoadingAnimation: false });
            console.error('提交失败:', err);
            
            // 如果是集合不存在错误，提示用户（使用自定义弹窗）
            if (err.errCode === -502005 || err.errMsg.includes('collection not exists')) {
              this.showAutoToast('提示', '数据库集合不存在，请联系管理员创建 shouhou_repair 集合');
            } else {
              this.showAutoToast('提交失败', err.errMsg || '未知错误');
            }
          }
        });
      },
      fail: err => {
        // 隐藏自定义加载动画
        this.setData({ showLoadingAnimation: false });
        console.error('[submitRepairTicket] 视频上传失败:', err);
        this.showAutoToast('上传失败', err.errMsg || '视频上传失败，请检查网络后重试');
      }
      });
    });
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
        success: () => console.log('[shouhou] 🛡️ 硬件级防偷拍锁定')
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

  // 🔴 获取位置和设备信息的辅助函数
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
      console.error('[shouhou] 获取位置信息失败:', err);
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
  async handleIntercept(type) {
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[shouhou] 🔴 截屏/录屏检测，立即设置封禁状态');
    
    // 🔴 关键修复：立即调用云函数设置 isBanned = true，不等待位置信息
    try {
      const sysInfo = wx.getSystemInfoSync();
      const immediateRes = await wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'shouhou',
          deviceInfo: sysInfo.system || '',
          phoneModel: sysInfo.model || ''
        }
      });
      console.log('[shouhou] ✅ 立即设置封禁状态成功:', immediateRes);
    } catch (err) {
      console.error('[shouhou] ⚠️ 立即设置封禁状态失败:', err);
        }

    // 🔴 跳转到封禁页面
    console.log('[shouhou] 🔴 跳转到封禁页');
    this._jumpToBlocked(type);

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'shouhou',
          ...locationData
        },
        success: (res) => {
          console.log('[shouhou] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[shouhou] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      console.log('[shouhou] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[shouhou] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[shouhou] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[shouhou] 跳转到 blocked 页面成功');
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[shouhou] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        wx.exitMiniProgram();
      }
    });
  },
})
