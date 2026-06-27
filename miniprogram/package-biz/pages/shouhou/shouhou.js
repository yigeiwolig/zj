// pages/shouhou/shouhou.js
const cosUpload = require('../../../utils/cosUpload.js');
const shopImagePrepare = require('../../../utils/shopImagePrepare.js');
const screenshotExempt = require('../../../utils/screenshotAdminExempt.js');
const { normalizeProductDetailModel } = require('../../../utils/productModels.js');
var QQMapWX = require('../../../utils/qqmap-wx-jssdk.js'); 
// 🔴 统一使用已验证可用的腾讯key，避免多key在不同环境权限不一致导致选择器异常
const MAP_KEY = 'CFDBZ-B6K6N-B3EFF-SPDJ2-Y2MRZ-7UBH2';
console.log('[shouhou] ✅ 初始化腾讯地图SDK（城市列表），使用的key:', MAP_KEY);
var qqmapsdk = new QQMapWX({
    key: MAP_KEY
});

// 🔴 区县接口使用独立 key（该 key 在控制台可见有行政区划子级查询配额）
const DISTRICT_KEY = 'ICRBZ-VEELI-CQZGO-UE5G6-BHRMS-VQBIK';
console.log('[shouhou] ✅ 初始化腾讯地图SDK（区县列表），使用的key:', DISTRICT_KEY);
var qqmapsdkDistrict = new QQMapWX({
    key: DISTRICT_KEY
});

// 通用测试视频地址（可替换为你自己的云存储链接）
const TEST_VIDEO_URL = "https://wxsnsdy.tc.qq.com/105/20210/snsdyvideodownload?filekey=30280201010421301f0201690402534804102ca905ce620b1241b726bc41dcff44e00204012882540400&bizid=1023&hy=SH&fileparam=302c020101042530230204136ffd93020457e3c4ff02024ef202031e8d7f02030f42400204045a320a0201000400";

function buildShippingDisplay(method, fee, freeShipping) {
  const m = String(method || 'zto').toLowerCase();
  const f = Number(fee) || 0;
  const shippingMethodLabel = m === 'sf' ? '顺丰速运' : '中通快递';
  let shippingFeeText = '包邮';
  if (!freeShipping) {
    shippingFeeText = f > 0 ? `运费 ¥${f}` : '运费待计算';
  }
  return { shippingMethodLabel, shippingFeeText };
}

const F2_STYLE_PARTS = ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"];

// 配件数据 - 按型号独立存储（标准明细名）
const DB_PARTS = {
  'F1 PRO': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
  'F1 MAX': F2_STYLE_PARTS.slice(),
  'F1 ULTRA': F2_STYLE_PARTS.slice(),
  'F2 PRO': F2_STYLE_PARTS.slice(),
  'F2 MAX': F2_STYLE_PARTS.slice(),
  'F2 ULTRA': F2_STYLE_PARTS.slice(),
  'F2 Long': F2_STYLE_PARTS.slice(),
  'F3 PRO': F2_STYLE_PARTS.slice(),
  'F3 MAX': F2_STYLE_PARTS.slice()
};

// 视频数据 - 按组同步（同组型号共享视频）
const VIDEO_GROUPS = {
  'F1': ['F1 PRO', 'F1 MAX'],
  'F1 Ultra': ['F1 ULTRA'],
  'F2': ['F2 PRO', 'F2 MAX'],
  'F2 Ultra': ['F2 ULTRA'],
  'F2 Long': ['F2 Long'],
  'F3': ['F3 PRO', 'F3 MAX']
};

// 型号到组的映射（含历史别名）
const MODEL_TO_GROUP = {
  'F1 PRO': 'F1',
  'F1 MAX': 'F1',
  'F1 ULTRA': 'F1 Ultra',
  'F2 PRO': 'F2',
  'F2 MAX': 'F2',
  'F2 ULTRA': 'F2 Ultra',
  'F2 Long': 'F2 Long',
  'F3 PRO': 'F3',
  'F3 MAX': 'F3',
  'F1 Pro Max': 'F1 Ultra',
  'F2 MAX Long': 'F2 Long',
  'F2 MAX LONG': 'F2 Long',
  'F2 Max Long': 'F2 Long'
};

// 本地视频数据（已清空演示视频）
const DB_VIDEOS = {
  'F1 PRO': [],
  'F1 MAX': [],
  'F1 ULTRA': [],
  'F2 PRO': [],
  'F2 MAX': [],
  'F2 ULTRA': [],
  'F2 Long': [],
  'F3 PRO': [],
  'F3 MAX': []
};

// 直辖市区县兜底（腾讯行政区接口在部分环境偶发返回空时使用）
const { MUNICIPALITY_DISTRICTS } = require('../../../utils/smartAddressParser.js');

// 密码 - 按型号独立设置（可以设置不同密码）
const CODES = {
  'F1 PRO': '123456',
  'F1 MAX': '123456',
  'F1 ULTRA': '123456',
  'F2 PRO': '123456',
  'F2 MAX': '123456',
  'F2 ULTRA': '123456',
  'F2 Long': '123456',
  'F3 PRO': '123456',
  'F3 MAX': '123456'
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
    detailNavTitle: '',
    currentSeries: '', // F1 或 F2
    activeTab: 'order', // order 或 tutorial
    serviceType: 'parts', // parts 或 repair

    // 数据列表
    currentPartsList: [],
    currentVideoList: [],
    /** 维修教程搜索（标题关键字） */
    tutorialSearchKeyword: '',
    tutorialSearchActive: false,
    tutorialSearchMatchCount: 0,
    tutorialSearchAnimGen: 0,
    /** 列表内嵌 video 的 cover-view 暂停层（与 azjc chapterInline* 一致） */
    tutorialInlinePlaying: [],
    tutorialInlinePauseExitAnim: [],
    /** 仅挂载一个列表内 video，避免多原生层叠导致渲染错乱 */
    tutorialInlineMountIndex: -1,

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
    
    // 故障设备选择
    myDevices: [],            // 当前用户已绑定的设备列表
    selectedDeviceIndex: null, // 选中的故障设备索引（null 表示未选）
    showDevicePicker: false,   // 是否显示自定义故障设备选择器
    devicePickerActive: false, // 底部设备选择器是否处于上滑展开态
    tempDeviceIndex: null,     // 选择器中临时高亮的索引
    isDevicePickerClosing: false, // 底部选择器是否处于关闭动画中
    deviceScrollId: '',        // 设备列表滚动到选中项的 id
    
    // [新增] 订单信息（统一格式）
    orderInfo: { name: '', phone: '', address: '' },

    // 🔴 从「去购买配件」带来的维修单 ID，支付成功后更新 purchasePartsStatus
    repairId: null,
    
    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },

    // 密码锁
    isLocked: true,
    passInput: '',
    passError: false,
    focusPass: false,

    // 弹窗
    showModal: false,
    showModalClosing: false,
    modalMode: '', // part 或 video
    modalInputVal: '',
    modalPriceVal: '0',

    // 全局自定义弹窗
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },
    dialogClosing: false, // 自定义弹窗退出动画中
    showRepairTermsModal: false,
    repairTermsClosing: false,
    repairTermsConfirmLabel: '确认并继续',
    repairTermsConfirmReady: false,
    repairTermsConfirmCountdown: 5,
    autoToastClosing: false, // 自动提示退出动画中

    // 自定义视频预览弹窗
    showVideoPreview: false,
    isVideoPlaying: true, // 视频播放状态（用于预览弹窗）

    // 临时视频信息
    tempVideoPath: '',
    // chooseMedia 返回的 size，供 COS 大文件分片（避免 getFileInfo 失败时整文件进内存）
    tempVideoKnownSize: null,
    // 临时故障图片（与视频二选一）
    tempImagePath: '',

    // 上传视频封面预览
    tempVideoThumb: '',

    // 联系信息折叠
    isContactExpanded: true,

    // 维修教程：全屏自定义播放器（与 azjc 同款）
    isTutorialVideoFullScreen: false,
    tutorialFullScreenVideoUrl: '',
    tutorialFullScreenIndex: -1,
    tutorialFullScreenPaused: false,
    tutorialFullScreenCurrentTime: 0,
    tutorialFullScreenCurrentText: '00:00',
    tutorialFullScreenDuration: 0,
    tutorialFullScreenDurationText: '00:00',
    tutorialFullScreenProgress: 0,
    tutorialFullScreenProgressPercent: 0,
    tutorialFullScreenInitialStyle: '',
    tutorialFullScreenTransform: '',
    tutorialFullScreenMaskClosing: false,
    tutorialFullScreenLandscapeOk: false,
    tutorialFullScreenExitPortraitHint: false,
    tutorialFullScreenRotateHintDismissed: false,
    tutorialFullScreenPortraitFallback: false,
    tutorialFullScreenGateStage: 1,
    tutorialFullScreenCloseCoverStyle: '',
    /** 全屏 video 带原生控件挂载（横屏门闸通过后再 true，避免 controls 动态开启不渲染） */
    tutorialFullScreenNativeUiReady: false,
    tutorialFullScreenNativeKey: 0,

    // 是否正在提取封面
    extractingThumb: false,

    // 是否正在上传视频（防止重复点击）
    isUploadingVideo: false,

    // 🔴 上传选项和录制相关状态（参考 case 页面）
    showUploadOptions: false, // 显示上传选项弹窗（选择相册/录制）
    uploadOptionsClosing: false,
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
    
    // 状态栏高度（默认 44，与 azjc 一致，避免首屏顶得太高）
    statusBarHeight: 44,
    /** 二级顶：仅状态栏/安全区高度（刘海），不含胶囊行 */
    detailSafeTopPx: 44,
    /** 自定义导航行高度 = 胶囊下缘 − 状态栏底，与系统胶囊垂直对齐 */
    detailNavBandPx: 40,

    // [新增] 智能粘贴弹窗相关
    showSmartPasteModal: false,
    smartPasteModalClosing: false,
    smartPasteVal: '',
    
    // [新增] 购物车相关 (为了复用 shop 页面的 UI)
    cart: [],
    cartTotalPrice: 0,
    finalTotalPrice: 0,
    showOrderModal: false,
    orderModalClosing: false,
    orderModalActive: false, // 与 showOrderModal 分离：下一帧再加 active，才能从底部滑入
    popupAnimationActive: false, // 专门控制弹窗动画状态
    tempBuyItemIds: [], // 记录立即购买的临时ID
    showCartSuccess: false, // [新增] 控制成功弹窗
    cartSuccessClosing: false,
    showPreselectTip: false, // 从「购买配件」过来时的预选完成提示小弹窗
    arrowTranslateY: 0,      // 红色箭头上下位移（rpx），用于弹跳
    _arrowBounceTimer: null, // 箭头弹跳定时器（不参与渲染）

    // [新增] 运费与地址逻辑
    detailAddress: '',    // 详细地址，如 '某某街道101号'
    
    // [新增] 省市区选择
    selectedProvince: '',  // 选中的省份
    selectedCity: '',      // 选中的城市
    selectedDistrict: '',  // 选中的区县
    provinceList: [],      // 省份列表
    cityList: [],          // 城市列表
    districtList: [],      // 区县列表
    provinceIndex: -1,     // 省份选择索引
    cityIndex: -1,         // 城市选择索引
    districtIndex: -1,     // 区县选择索引

    shippingMethod: 'zto',// 默认中通
    shippingFee: 0,
    shippingMethodLabel: '中通快递',
    shippingFeeText: '包邮',
    checkoutFreeShipping: false, // 仅「故障报修/申请售后」包邮

    // [新增] 自定义加载动画
    showLoadingAnimation: false,
    loadingText: '加载中...'
  },

  // 页面加载时初始化
  onLoad(options) {
    // 🔴 计算导航栏高度（适配所有机型）
    this.calcNavBarInfo();
    
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('shouhou');
    }

    // 全屏教程横竖屏实时监听：不能只依赖 timeupdate（门闸阶段视频暂停时不会触发）
    this._shouhouWindowResize = () => {
      if (!this.data.isTutorialVideoFullScreen) return;
      if (this._maybeCompleteCloseForTutorialPortraitExitHint()) return;
      this._syncTutorialFullscreenOrientationFromWindow();
      this._syncTutorialFullscreenOrientationFromLayoutRect({ immediate: true });
      wx.nextTick(() => {
        if (this._maybeCompleteCloseForTutorialPortraitExitHint()) return;
        this._syncTutorialFullscreenOrientationFromWindow();
        this._syncTutorialFullscreenOrientationFromLayoutRect({ immediate: true });
        this._refreshTutorialFullscreenTrackRect();
        this._syncTutorialFullscreenCloseCoverLayout();
      });
    };
    if (typeof wx.onWindowResize === 'function') {
      wx.onWindowResize(this._shouhouWindowResize);
    }

    this._shouhouDeviceOrientationHandler = (res) => {
      if (!this.data.isTutorialVideoFullScreen || this._isClosingTutorialFullScreen) return;
      const raw = res && (res.value != null ? res.value : res.deviceOrientation);
      const v = String(raw || '').toLowerCase();
      if (/landscape/i.test(v)) {
        const { ww, hh } = this._readTutorialFullscreenViewport();
        if (ww > 0 && hh > 0) {
          this._applyTutorialFullscreenOrientation(ww, hh, { forceLandscape: true });
        }
        this._syncTutorialFullscreenOrientationFromLayoutRect({ immediate: true });
        wx.nextTick(() => {
          this._syncTutorialFullscreenOrientationFromWindow();
          this._syncTutorialFullscreenOrientationFromLayoutRect({ immediate: true });
          this._syncTutorialFullscreenCloseCoverLayout();
        });
      } else if (v && /portrait/i.test(v)) {
        this._syncTutorialFullscreenOrientationFromWindow();
        this._maybeCompleteCloseForTutorialPortraitExitHint();
      }
    };
    if (typeof wx.onDeviceOrientationChange === 'function') {
      wx.onDeviceOrientationChange(this._shouhouDeviceOrientationHandler);
    }
    
    // 🔴 从「我的」页「去购买配件」跳转：优先用全局变量，其次用 URL 参数，进入对应型号卡
    let modelToOpen = '';
    if (app && app.globalData && app.globalData.shouhouOpenModel) {
      modelToOpen = String(app.globalData.shouhouOpenModel).trim();
      app.globalData.shouhouOpenModel = '';
    }
    if (!modelToOpen && options && options.model != null) {
      const rawModel = String(options.model);
      modelToOpen = rawModel ? decodeURIComponent(rawModel) : '';
    }
    // 🔴 从「我的」订单卡「查看售后教程」确认收货后跳转：自动输入密码 123456 解锁维修教程
    if (options && options.autoUnlock === '1') {
      this._autoUnlockFromQuery = true;
    }
    // 从「我的-跳转教程」进入：仅切到教程页签，不自动解锁
    this._openTutorialTabFromQuery = !!(options && options.tutorial === '1');
    if (modelToOpen) {
      const baseModel = modelToOpen.split(/\s*-\s*/)[0].trim();
      const normalizedBase = normalizeProductDetailModel(baseModel) || baseModel;
      const normalizedFull = normalizeProductDetailModel(modelToOpen) || modelToOpen;
      if (MODEL_TO_GROUP[normalizedBase]) {
        this._openModelFromQuery = normalizedBase;
      } else if (MODEL_TO_GROUP[normalizedFull]) {
        this._openModelFromQuery = normalizedFull;
      } else if (MODEL_TO_GROUP[baseModel]) {
        this._openModelFromQuery = baseModel;
      } else if (MODEL_TO_GROUP[modelToOpen]) {
        this._openModelFromQuery = modelToOpen;
      }
      // 兜底：若 onShow/onReady 未触发进卡，50ms 后在此直接进卡
      const self = this;
      setTimeout(() => {
        if (self._openModelFromQuery && MODEL_TO_GROUP[self._openModelFromQuery]) {
          const name = self._openModelFromQuery;
          self._openModelFromQuery = null;
          self.enterModelByModelName(name);
        }
      }, 50);
    }
    
    // [新增] 加载省份列表（延迟加载，避免与其他API冲突）
    // 🔴 优化：延迟500ms加载，避免页面加载时与其他API并发调用
    setTimeout(() => {
      this.loadProvinceList();
    }, 500);
  },

  // [新增] 加载省份列表
  loadProvinceList() {
    // 🔴 优化：先检查缓存，避免频繁调用API
    const cachedProvinceList = wx.getStorageSync('province_list');
    const cacheTime = wx.getStorageSync('province_list_time') || 0;
    const now = Date.now();
    const cacheValidTime = 24 * 60 * 60 * 1000; // 24小时有效期
    
    // 如果缓存存在且未过期，直接使用
    if (cachedProvinceList && cachedProvinceList.length > 0 && (now - cacheTime) < cacheValidTime) {
      console.log('[shouhou] 使用缓存的省份列表（未过期）');
      this.setData({
        provinceList: cachedProvinceList
      });
      return;
    }
    
    // 如果缓存过期，清除旧缓存
    if (cachedProvinceList && (now - cacheTime) >= cacheValidTime) {
      console.log('[shouhou] 省份列表缓存已过期，重新加载');
      wx.removeStorageSync('province_list');
      wx.removeStorageSync('province_list_time');
    }
    
    // 🔴 修复：如果API配额用完，直接使用本地数据，不调用API
    // 先尝试使用默认省份列表（不依赖API）
    console.log('[shouhou] 使用本地省份列表（避免API配额限制）');
    this.setDefaultProvinceList();
    
    // 可选：如果需要从API获取最新数据，可以取消下面的注释
    // 但建议在配额充足时再启用
    /*
    console.log('[shouhou] 准备调用getCityList，使用的key:', MAP_KEY);
    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result) {
          // 提取省份列表（result[0]是省份）
          const provinces = res.result[0] || [];
          const provinceList = provinces.map(p => ({
            id: p.id,
            name: p.fullname || p.name
          }));
          
          // 保存到缓存（有效期24小时）
          wx.setStorageSync('province_list', provinceList);
          wx.setStorageSync('province_list_time', Date.now());
          
          this.setData({
            provinceList: provinceList
          });
          console.log('[shouhou] 省份列表加载成功:', provinceList.length, '个省份');
        }
      },
      fail: (err) => {
        console.error('[shouhou] 加载省份列表失败:', err);
        // 失败时使用默认省份列表
        this.setDefaultProvinceList();
      }
    });
*/
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
    console.log('[shouhou] 使用默认省份列表（不依赖API）');
  },
  
  // [新增] 省份选择变化
  onProvinceChange(e) {
    const index = parseInt(e.detail.value, 10);
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

    if (province.id) this.loadCityList(province.id);
    this.reCalcFinalPrice();
  },
  
  // [新增] 加载城市列表
  loadCityList(provinceId) {
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    const provincePrefix = String(provinceId || '').substring(0, 2);
    const isValidCachedCityList = Array.isArray(cachedCityList) && cachedCityList.length > 0 &&
      cachedCityList.every(c => String((c && c.id) || '').substring(0, 2) === provincePrefix);
    if (isValidCachedCityList) {
      this.setData({ cityList: cachedCityList });
      return;
    }

    const setCityList = (cities) => {
      const cityList = (cities || []).map(c => ({ id: c.id, name: c.fullname || c.name }));
      wx.setStorageSync(cacheKey, cityList);
      this.setData({ cityList });
    };

    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          const allCities = res.result[1] || [];
          const cityList = allCities
            .filter(c => String(c.id || '').substring(0, 2) === provincePrefix)
            .map(c => ({ id: c.id, name: c.fullname || c.name }));
          wx.setStorageSync(cacheKey, cityList);
          this.setData({ cityList });
          return;
        }
        qqmapsdkDistrict.getDistrictByCityId({
          id: provinceId,
          success: (res2) => {
            if (res2.status === 0 && res2.result && res2.result.length > 0) {
              setCityList(res2.result[0] || []);
            } else {
              this.setData({ cityList: [] });
            }
          },
          fail: () => this.setData({ cityList: [] })
        });
      },
      fail: () => {
        qqmapsdkDistrict.getDistrictByCityId({
          id: provinceId,
          success: (res2) => {
            if (res2.status === 0 && res2.result && res2.result.length > 0) {
              setCityList(res2.result[0] || []);
            } else {
              this.setData({ cityList: [] });
            }
          },
          fail: () => this.setData({ cityList: [] })
        });
      }
    });
  },
  
  // [新增] 为智能粘贴加载城市列表（并自动匹配城市和区县）
  loadCityListForSmartPaste(provinceId, targetCity, targetDistrict) {
    // 🔴 优化：先检查缓存
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    const provincePrefix = String(provinceId || '').substring(0, 2);
    const isValidCachedCityList = Array.isArray(cachedCityList) && cachedCityList.length > 0 &&
      cachedCityList.every(c => String((c && c.id) || '').substring(0, 2) === provincePrefix);
    if (isValidCachedCityList) {
      console.log('[shouhou] 使用缓存的城市列表（智能粘贴）');
      // 🔴 修复：只更新 cityList，不覆盖其他字段（如 detailAddress）
      this.setData({
        cityList: cachedCityList
      });
      
      // 🔴 优化：尝试匹配城市（改进匹配逻辑，提高准确度）
      if (targetCity) {
        console.log('[shouhou] 开始匹配城市，目标城市:', targetCity, '城市列表长度:', cachedCityList.length);
        
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
        // 方法4：直辖市兼容（天津市/天津城区/市辖区等）
        if (cityIndex === -1 && /(北京|上海|天津|重庆)/.test(targetCity)) {
          const muni = targetCity.replace(/市/g, '');
          cityIndex = cachedCityList.findIndex(c => String(c.name || '').includes(muni));
        }
        
        if (cityIndex !== -1) {
          console.log('[shouhou] ✅ 城市匹配成功，索引:', cityIndex, '城市名:', cachedCityList[cityIndex].name);
          // 🔴 修复：使用 wx.nextTick 确保 setData 立即生效
          wx.nextTick(() => {
            this.setData({
              cityIndex: cityIndex,
              selectedCity: cachedCityList[cityIndex].name
            }, () => {
              console.log('[shouhou] ✅ 城市数据已更新到UI（缓存）');
              
              // 加载区县列表
              if (cachedCityList[cityIndex].id && targetDistrict) {
                this.loadDistrictListForSmartPaste(cachedCityList[cityIndex].id, targetDistrict);
              }
            });
          });
        } else {
          console.log('[shouhou] ⚠️ 城市匹配失败，目标城市:', targetCity, '可用城市:', cachedCityList.map(c => c.name).slice(0, 10));
          // 匹配失败时兜底到首项，避免“看起来有结果但选择器不可用”
          if (cachedCityList[0]) {
            this.setData({
              cityIndex: 0,
              selectedCity: cachedCityList[0].name
            }, () => {
              if (cachedCityList[0].id && targetDistrict) {
                this.loadDistrictListForSmartPaste(cachedCityList[0].id, targetDistrict);
              }
            });
          } else {
            this.setData({ selectedCity: targetCity });
          }
        }
      }
      return;
    }
    
    // 🔴 修复：使用 getCityList 获取所有城市，然后筛选出该省份的城市
    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          // result[1] 是所有城市列表
          const allCities = res.result[1] || [];
          
          // 🔴 筛选出属于该省份的城市（通过城市ID的前2位匹配省份ID的前2位）
          const provincePrefix = String(provinceId).substring(0, 2);
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
          
          // 🔴 优化：尝试匹配城市（改进匹配逻辑，提高准确度）
          if (targetCity) {
            console.log('[shouhou] 开始匹配城市，目标城市:', targetCity, '城市列表长度:', cityList.length);
            
            // 方法1：精确匹配（包含"市"字）
            let cityIndex = cityList.findIndex(c => c.name === targetCity);
            
            // 方法2：去除"市"字后匹配
            if (cityIndex === -1) {
              const cityName = targetCity.replace('市', '').replace('自治州', '').replace('地区', '');
              cityIndex = cityList.findIndex(c => {
                const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
                return cName === cityName;
              });
            }
            
            // 方法3：包含匹配（更宽松）
            if (cityIndex === -1) {
              const cityName = targetCity.replace('市', '');
              cityIndex = cityList.findIndex(c => {
                return c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''));
              });
            }
            // 方法4：直辖市兼容（天津市/天津城区/市辖区等）
            if (cityIndex === -1 && /(北京|上海|天津|重庆)/.test(targetCity)) {
              const muni = targetCity.replace(/市/g, '');
              cityIndex = cityList.findIndex(c => String(c.name || '').includes(muni));
            }
            
            if (cityIndex !== -1) {
              console.log('[shouhou] ✅ 城市匹配成功，索引:', cityIndex, '城市名:', cityList[cityIndex].name);
              // 🔴 修复：使用 wx.nextTick 确保 setData 立即生效
              wx.nextTick(() => {
                this.setData({
                  cityIndex: cityIndex,
                  selectedCity: cityList[cityIndex].name
                }, () => {
                  console.log('[shouhou] ✅ 城市数据已更新到UI（API加载）');
                  
                  // 加载区县列表
                  if (cityList[cityIndex].id && targetDistrict) {
                    this.loadDistrictListForSmartPaste(cityList[cityIndex].id, targetDistrict);
                  }
                });
              });
            } else {
              console.log('[shouhou] ⚠️ 城市匹配失败，目标城市:', targetCity, '可用城市:', cityList.map(c => c.name).slice(0, 10));
              if (cityList[0]) {
                this.setData({
                  cityIndex: 0,
                  selectedCity: cityList[0].name
                }, () => {
                  if (cityList[0].id && targetDistrict) {
                    this.loadDistrictListForSmartPaste(cityList[0].id, targetDistrict);
                  }
                });
              } else {
                this.setData({ selectedCity: targetCity });
              }
            }
          }
        } else {
          // 如果 getCityList 失败，尝试使用 getDistrictByCityId（备用方案）
          // 🔴 使用行政区划子key作为备用方案
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
                
                // 🔴 优化：尝试匹配城市（改进匹配逻辑，提高准确度）
                if (targetCity) {
                  console.log('[shouhou] 开始匹配城市（备用方案），目标城市:', targetCity, '城市列表长度:', cityList.length);
                  
                  // 方法1：精确匹配（包含"市"字）
                  let cityIndex = cityList.findIndex(c => c.name === targetCity);
                  
                  // 方法2：去除"市"字后匹配
                  if (cityIndex === -1) {
                    const cityName = targetCity.replace('市', '').replace('自治州', '').replace('地区', '');
                    cityIndex = cityList.findIndex(c => {
                      const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
                      return cName === cityName;
                    });
                  }
                  
                  // 方法3：包含匹配（更宽松）
                  if (cityIndex === -1) {
                    const cityName = targetCity.replace('市', '');
                    cityIndex = cityList.findIndex(c => {
                      return c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''));
                    });
                  }
                  
                  if (cityIndex !== -1) {
                    console.log('[shouhou] ✅ 城市匹配成功（备用方案），索引:', cityIndex, '城市名:', cityList[cityIndex].name);
                    this.setData({
                      cityIndex: cityIndex,
                      selectedCity: cityList[cityIndex].name
                    });
                    
                    // 加载区县列表
                    if (cityList[cityIndex].id && targetDistrict) {
                      this.loadDistrictListForSmartPaste(cityList[cityIndex].id, targetDistrict);
                    }
                  } else {
                    console.log('[shouhou] ⚠️ 城市匹配失败（备用方案），目标城市:', targetCity, '可用城市:', cityList.map(c => c.name).slice(0, 10));
                    this.setData({
                      selectedCity: targetCity
                    });
                  }
                }
              }
            },
            fail: (err) => {
              console.error('[shouhou] 加载城市列表失败:', err);
            }
          });
        }
      },
      fail: (err) => {
        console.error('[shouhou] getCityList 失败，尝试备用方案:', err);
        // 备用方案：使用 getDistrictByCityId
        // 🔴 使用行政区划子key作为备用方案
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
              
              // 尝试匹配城市
              if (targetCity) {
                const cityName = targetCity.replace('市', '');
                const cityIndex = cityList.findIndex(c => {
                  const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
                  return c.name === targetCity || 
                         c.name.includes(cityName) || 
                         cityName.includes(cName) ||
                         cName === cityName;
                });
                
                if (cityIndex !== -1) {
                  this.setData({
                    cityIndex: cityIndex,
                    selectedCity: cityList[cityIndex].name
                  });
                  
                  // 加载区县列表
                  if (cityList[cityIndex].id && targetDistrict) {
                    this.loadDistrictListForSmartPaste(cityList[cityIndex].id, targetDistrict);
                  }
                } else {
                  this.setData({
                    selectedCity: targetCity
                  });
                }
              }
            }
          },
          fail: (err2) => {
            console.error('[shouhou] 加载城市列表失败（备用方案也失败）:', err2);
            // 🔴 修复：如果API都失败，至少设置城市文本，让用户知道解析到了什么
            if (targetCity) {
              this.setData({
                selectedCity: targetCity,
                cityList: [] // 清空列表，避免显示错误数据
              });
              console.log('[shouhou] ⚠️ API调用失败，已设置城市文本:', targetCity);
            }
          }
        });
      }
    });
  },
  
  // [新增] 为智能粘贴加载区县列表（并自动匹配区县）
  loadDistrictListForSmartPaste(cityId, targetDistrict) {
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
              // 🔴 修复：如果匹配失败，不设置selectedDistrict，让它保持为空，显示"请选择区县"
              // 不设置selectedDistrict，这样WXML会显示"请选择区县"
              console.log('[shouhou] ⚠️ 区县匹配失败，目标区县:', targetDistrict, '不设置selectedDistrict，让用户手动选择');
            }
          }
        }
      },
      fail: (err) => {
        console.error('[shouhou] 加载区县列表失败:', err);
        // 🔴 修复：如果API失败，不设置selectedDistrict，让它保持为空，显示"请选择区县"
        // 不设置selectedDistrict，这样WXML会显示"请选择区县"
        this.setData({
          districtList: [] // 清空列表，避免显示错误数据
        });
        console.log('[shouhou] ⚠️ API调用失败，不设置selectedDistrict，让用户手动选择');
      }
    });
  },
  
  // [新增] 城市选择变化
  onCityChange(e) {
    const index = parseInt(e.detail.value, 10);
    const city = this.data.cityList[index];
    if (!city) return;

    this.setData({
      cityIndex: index,
      selectedCity: city.name,
      selectedDistrict: '',
      districtList: [],
      districtIndex: -1
    });

    if (city.id) this.loadDistrictList(city.id);
    this.reCalcFinalPrice();
  },
  
  // [新增] 加载区县列表
  loadDistrictList(cityId) {
    const cacheKey = `district_list_${cityId}`;
    const cachedDistrictList = wx.getStorageSync(cacheKey);
    if (cachedDistrictList && cachedDistrictList.length > 0) {
      this.setData({ districtList: cachedDistrictList });
      return;
    }

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
          this.setData({ districtList: districtList });
        } else {
          this._applyDistrictFallbackBySelectedCity();
        }
      },
      fail: () => this._applyDistrictFallbackBySelectedCity()
    });
  },

  _applyDistrictFallbackBySelectedCity() {
    const selectedCity = String(this.data.selectedCity || '').trim();
    const selectedProvince = String(this.data.selectedProvince || '').trim();
    const key = selectedCity || selectedProvince;
    const fallback = MUNICIPALITY_DISTRICTS[key] || [];
    if (!fallback.length) {
      this.setData({ districtList: [] });
      return;
    }
    const districtList = fallback.map((name, idx) => ({ id: `fallback_${idx}`, name }));
    this.setData({ districtList });
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
    
    // 重新计算运费
    this.reCalcFinalPrice();
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
    const winInfo = wx.getWindowInfo();
    this._systemInfo = winInfo;
    this._cardHeightPx = DRAG_CONFIG.CARD_HEIGHT_RPX * (winInfo.windowWidth / 750);
    
    // 布局就绪后再算导航与详情顶距（onLoad 时 getMenuButtonBoundingClientRect 偶发不准）
    this.calcNavBarInfo();
    wx.nextTick(() => {
      try {
        this._syncDetailSafeTop();
      } catch (e) {}
      // 与首个 onReady 合并：此前第二个 onReady 覆盖第一个，此处须在 calcNavBarInfo 之后再进卡
      if (this._openModelFromQuery) {
        const modelName = this._openModelFromQuery;
        this._openModelFromQuery = null;
        if (modelName && MODEL_TO_GROUP[modelName]) {
          this.enterModelByModelName(modelName);
        }
      }
    });
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
      let adminCheck = await db.collection('guanliyuan').where({
        openid: myOpenid
      }).get();

      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }

      // 3. 如果找到了记录，说明你是受信任的管理员
      if (adminCheck.data.length > 0) {
        screenshotExempt.markGuanliyuanCache(true);
        screenshotExempt.allowScreenCaptureIfExempt();
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

  _clearRepairTermsConfirmTimer() {
    if (this._repairTermsCountdownTimer) {
      clearInterval(this._repairTermsCountdownTimer);
      this._repairTermsCountdownTimer = null;
    }
  },

  _startRepairTermsConfirmCountdown() {
    this._clearRepairTermsConfirmTimer();
    let left = Number(this.data.repairTermsConfirmCountdown) || 5;
    this._repairTermsCountdownTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        this._clearRepairTermsConfirmTimer();
        this.setData({ repairTermsConfirmReady: true, repairTermsConfirmCountdown: 0 });
        return;
      }
      this.setData({ repairTermsConfirmCountdown: left });
    }, 1000);
  },

  closeRepairTermsModal() {
    this._clearRepairTermsConfirmTimer();
    this._repairTermsOnConfirm = null;
    if (!this.data.showRepairTermsModal) return;
    this.setData({ repairTermsClosing: true });
    setTimeout(() => {
      this.setData({
        showRepairTermsModal: false,
        repairTermsClosing: false,
        repairTermsConfirmReady: false,
        repairTermsConfirmCountdown: 5
      });
    }, 360);
  },

  onRepairTermsConfirm() {
    if (!this.data.repairTermsConfirmReady) return;
    const cb = this._repairTermsOnConfirm;
    this._repairTermsOnConfirm = null;
    this._repairTermsAcked = true;
    this._clearRepairTermsConfirmTimer();
    this.setData({
      showRepairTermsModal: false,
      repairTermsClosing: false,
      repairTermsConfirmReady: false,
      repairTermsConfirmCountdown: 5
    });
    if (typeof cb === 'function') cb();
  },

  /** 故障报修：运费与旧件寄回须知（专用弹窗 + 确认按钮倒计时） */
  _showRepairSubmitTermsDialog(onConfirm, options = {}) {
    this._clearRepairTermsConfirmTimer();
    this._repairTermsOnConfirm = onConfirm;
    const countdown = 5;
    this.setData({
      showRepairTermsModal: true,
      repairTermsClosing: false,
      repairTermsConfirmLabel: options.confirmText || '确认并继续',
      repairTermsConfirmReady: false,
      repairTermsConfirmCountdown: countdown
    });
    this._startRepairTermsConfirmCountdown();
  },
  _closeWithAnimation(showKey, closingKey, extraPatch = {}, duration = 360) {
    if (!this.data[showKey]) {
      if (Object.keys(extraPatch).length) this.setData(extraPatch);
      return;
    }
    this.setData({ [closingKey]: true, ...extraPatch });
    setTimeout(() => {
      this.setData({ [showKey]: false, [closingKey]: false, ...extraPatch });
    }, duration);
  },

  /** 确认工单：先挂载 DOM，下一帧再加 active，底部滑入 */
  _openOrderModal(patch = {}) {
    if (this._arrowBounceTimer) {
      clearInterval(this._arrowBounceTimer);
      this._arrowBounceTimer = null;
    }
    this.setData({
      showOrderModal: true,
      showPreselectTip: false,
      arrowTranslateY: 0,
      orderModalClosing: false,
      orderModalActive: false,
      ...patch
    }, () => {
      this.reCalcFinalPrice();
      const tick = typeof wx.nextTick === 'function' ? wx.nextTick : (fn) => setTimeout(fn, 20);
      tick(() => {
        if (this.data.showOrderModal && !this.data.orderModalClosing) {
          this.setData({ orderModalActive: true });
        }
      });
    });
  },

  // 【新增】自动消失提示（无按钮，2秒后自动消失，带收缩退出动画）
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

  _hideAllLoadingLayers() {
    try {
      if (wx.hideLoading) wx.hideLoading();
    } catch (e) {}
    try {
      const app = getApp();
      if (app && app.hideLoading) app.hideLoading();
    } catch (e) {}
    const toast = this._getCustomToast();
    if (toast && toast.hideLoading) toast.hideLoading();
  },

  // 🔴 统一的自定义 Loading（只保留本页一套：转圈 + 文案 + 进度条，避免与 wx/custom-toast 叠在一起）
  showMyLoading(title = '加载中...') {
    this._hideAllLoadingLayers();
    this.setData({
      showLoadingAnimation: true,
      loadingText: title || '加载中...'
    });
  },

  hideMyLoading() {
    this._hideAllLoadingLayers();
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
  dismissTransientModals() {
    if (this.data.dialog && this.data.dialog.show) this.closeCustomDialog();
    if (this.data.autoToast && this.data.autoToast.show) this._closeAutoToastWithAnimation();
    if (this.data.showCartSuccess) this._closeWithAnimation('showCartSuccess', 'cartSuccessClosing');
  },
  noop() {},
  doNothing() {},

  // ================= 视频预览 =================
  openVideoPreview() {
    if (!this.data.tempVideoPath) return;
    this.setData({ 
      showVideoPreview: true,
      isVideoPlaying: true // 打开时默认播放
    });
  },

  openRepairMediaPreview() {
    if (this.data.tempImagePath) {
      wx.previewImage({
        urls: [this.data.tempImagePath],
        current: this.data.tempImagePath
      });
      return;
    }
    this.openVideoPreview();
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
      tempVideoKnownSize: null,
      tempVideoThumb: '',
      tempImagePath: '',
      videoFileName: '',
      extractingThumb: false
    });
  },

  onUnload() {
    this._clearRepairTermsConfirmTimer();
    try {
      if (this._shouhouWindowResize && typeof wx.offWindowResize === 'function') {
        wx.offWindowResize(this._shouhouWindowResize);
      }
    } catch (e) {}
    this._shouhouWindowResize = null;
    this._stopTutorialFullscreenOrientPoll();
    if (this._tutorialFsCloseDelayTimer) {
      clearTimeout(this._tutorialFsCloseDelayTimer);
      this._tutorialFsCloseDelayTimer = null;
    }
    if (this._shouhouDeviceOrientationHandler && typeof wx.offDeviceOrientationChange === 'function') {
      try {
        wx.offDeviceOrientationChange(this._shouhouDeviceOrientationHandler);
      } catch (e) {}
    }
    this._shouhouDeviceOrientationHandler = null;

    if (this._tutorialInlineExitAnimTimers) {
      Object.keys(this._tutorialInlineExitAnimTimers).forEach((k) => {
        const t = this._tutorialInlineExitAnimTimers[k];
        if (t) clearTimeout(t);
      });
      this._tutorialInlineExitAnimTimers = {};
    }

    if (this._devicePickerTimer) {
      clearTimeout(this._devicePickerTimer);
      this._devicePickerTimer = null;
    }
    if (this._arrowBounceTimer) {
      clearInterval(this._arrowBounceTimer);
      this._arrowBounceTimer = null;
    }
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null, isRecording: false });
    }
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
    this._pageDestroyed = true;
    this._cancelPaymentVerification();
    this._teardownScreenshotProtection();
    this._cleanupDrag();
  },

  // 页面隐藏时清理（防止拖拽过程中切换页面）
  onHide() {
    if (this._devicePickerTimer) {
      clearTimeout(this._devicePickerTimer);
      this._devicePickerTimer = null;
    }
    if (this._arrowBounceTimer) {
      clearInterval(this._arrowBounceTimer);
      this._arrowBounceTimer = null;
    }
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
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
    if (this._partDragWatchdogTimer) {
      clearTimeout(this._partDragWatchdogTimer);
      this._partDragWatchdogTimer = null;
    }
  },

  // 1. 首页逻辑（已废弃点击计数逻辑）
  triggerAdmin() {
    // 废弃旧逻辑，不再使用
  },

  enterModel(e) {
    const { name, series } = e.currentTarget.dataset;
    this.enterModelByModelName(name, series);
  },

  // 按型号名直接进入对应卡（用于从「我的」页「去购买配件」带 model 参数跳转）
  enterModelByModelName(modelName, series) {
    const name = normalizeProductDetailModel(modelName || '');
    const seriesVal = series || (MODEL_TO_GROUP[name] || '');
    const openTutorialTab = !!this._openTutorialTabFromQuery;
    // 先只更新页面状态，让详情视图立即滑入，避免被后续 setData 覆盖或延迟
    this.setData({
      currentModelName: name,
      currentSeries: seriesVal,
      inDetail: true,
      activeTab: openTutorialTab ? 'tutorial' : 'order',
      serviceType: 'parts',
      currentVideoList: [],
      selectedCount: 0,
      totalPrice: 0,
      ...this._tutorialInlinePlayingArrays(0)
    }, () => {
      this._openTutorialTabFromQuery = false;
      this._syncDetailNavTitle();
      this._syncDetailSafeTop();
      wx.nextTick(() => {
        this._syncDetailNavTitle();
        this._syncDetailSafeTop();
      });
      // 侧滑动画首帧后胶囊/窗口信息偶发为 0，延迟再同步两次
      const self = this;
      [90, 220].forEach((ms) => {
        setTimeout(() => {
          try {
            self._syncDetailSafeTop();
          } catch (e) {}
        }, ms);
      });
      this.loadParts(name);
      this.resetLock();
      // 🔴 确认收货后带 autoUnlock=1 进入：自动输入 123456 解锁该型号维修教程（仅当该型号密码为 123456 时）
      if (this._autoUnlockFromQuery && name && CODES[name] === '123456') {
        this._autoUnlockFromQuery = false;
        const self = this;
        setTimeout(() => {
          self.setData({ passInput: '123456', isLocked: false, passError: false, activeTab: 'tutorial' });
          self.renderVideos();
        }, 400);
      } else if (this._autoUnlockFromQuery) {
        this._autoUnlockFromQuery = false;
      }
    });
  },

  exitModel() {
    if (this.data.isTutorialVideoFullScreen) {
      this._forceCloseTutorialFullScreen();
    }
    this._repairTermsAcked = false;
    this.closeRepairTermsModal();
    // 直接返回选择界面，不需要管理员模式
    this.setData({ inDetail: false });
    this.setData({
      contactName: '', contactPhone: '', contactAddr: '', contactWechat: '', videoFileName: '', repairDescription: ''
    });
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
    this._syncDetailSafeTop();
  },

  /**
   * 侧滑详情顶栏：占位 + 导航行高度之和 = menuButton.bottom（与系统胶囊对齐）。
   * 有胶囊坐标时必须用 menuButton.top 作占位高度，勿与 safeArea.top 取 max——
   * 开发者工具/部分机型上 safeArea.top 会偏大，出现「刘海下巨大空白」。
   */
  _syncDetailSafeTop() {
    try {
      const win = wx.getWindowInfo() || {};
      const status = Number(win.statusBarHeight) || 44;

      let mbTop = 0;
      let mbBottom = 0;
      try {
        const mb = wx.getMenuButtonBoundingClientRect();
        if (mb && typeof mb.top === 'number' && mb.top > 0) {
          mbTop = mb.top;
        }
        if (mb && typeof mb.bottom === 'number' && mb.bottom > 0) {
          mbBottom = mb.bottom;
        }
      } catch (e2) {}

      let detailSafeTopPx;
      let detailNavBandPx;

      if (mbTop > 0 && mbBottom > mbTop) {
        detailSafeTopPx = Math.max(20, Math.ceil(mbTop));
        detailNavBandPx = Math.max(28, Math.ceil(mbBottom - mbTop));
      } else {
        let topPad = status;
        const sa = win.safeArea;
        if (sa && typeof sa.top === 'number') {
          topPad = Math.max(topPad, sa.top);
        }
        const si = win.safeAreaInsets;
        if (si && typeof si.top === 'number') {
          topPad = Math.max(topPad, si.top);
        }
        detailSafeTopPx = Math.max(20, Math.ceil(topPad));
        const nb = Number(this.data.navBarHeight) || 44;
        detailNavBandPx = Math.max(32, Math.ceil(nb));
      }

      const patch = {};
      if (this.data.detailSafeTopPx !== detailSafeTopPx) patch.detailSafeTopPx = detailSafeTopPx;
      if (this.data.detailNavBandPx !== detailNavBandPx) patch.detailNavBandPx = detailNavBandPx;
      if (Object.keys(patch).length) {
        this.setData(patch);
      }
    } catch (e) {
      const patch = {};
      if (this.data.detailSafeTopPx !== 44) patch.detailSafeTopPx = 44;
      if (this.data.detailNavBandPx !== 44) patch.detailNavBandPx = 44;
      if (Object.keys(patch).length) {
        this.setData(patch);
      }
    }
  },

  // 返回上一页（勿回启动页 index；栈空时回枢纽 products）
  goBack() {
    if (this.data.inDetail) {
      this.exitModel();
      return;
    }
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  onBackPress() {
    if (this.data.inDetail) {
      this.exitModel();
      return true;
    }
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
    return true;
  },

  _syncDetailNavTitle() {
    const name = this.data.currentModelName || '';
    const title =
      this.data.activeTab === 'tutorial' && name ? `${name} 维修教程库` : name;
    if (title !== this.data.detailNavTitle) {
      this.setData({ detailNavTitle: title });
    }
  },

  // 2. 详情页逻辑
  switchTab(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode !== 'tutorial' && this.data.isTutorialVideoFullScreen) {
      this._forceCloseTutorialFullScreen();
    }
    this.setData({ activeTab: mode }, () => this._syncDetailNavTitle());
    if (mode === 'order') {
      this.renderParts();
    }
    // 切换到教程页时重置播放状态并重新加载视频
    if (mode === 'tutorial') {
      this.setData({
        currentVideoList: [],
        tutorialSearchKeyword: '',
        tutorialSearchActive: false,
        tutorialSearchMatchCount: 0
      });
      this._tutorialSourceVideoList = [];
      if (this.data.isLocked) {
        // 锁屏时自动拉起键盘，避免用户点了无响应
        this.focusInput();
      } else {
        // 延迟一点再加载，确保状态已更新
        setTimeout(() => {
          this.renderVideos();
        }, 50);
      }
    }
  },

  toggleService(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.serviceType) return;
    
    if (type === 'repair') {
      // 管理员：无绑定设备也可进入故障报修
      if (this.data.isAuthorized) {
        this.setData({ serviceType: 'repair' }, () => this.reCalcFinalPrice());
        this.checkDeviceBeforeRepair({ fallbackToParts: true, allowSwitch: false });
        return;
      }
      // 普通用户：先校验绑定，通过后再切换（未绑定只弹窗，不跳转）
      this.checkDeviceBeforeRepair({ fallbackToParts: false, allowSwitch: true });
      return;
    }
    this._repairTermsAcked = false;
    this.setData({ serviceType: type }, () => this.reCalcFinalPrice());
  },

  /** 未绑定设备：弹窗选择去绑定或稍后绑定（不自动跳转） */
  _showRepairBindDevicePrompt(options = {}) {
    const { revertToParts = false } = options;
    if (revertToParts && this.data.serviceType === 'repair') {
      this.setData({ serviceType: 'parts' }, () => this.reCalcFinalPrice());
    }
    this._showCustomModal({
      title: '提示',
      content: '您尚未绑定设备，暂无法提交故障报修。绑定后可正常提交工单并享受质保服务。',
      showCancel: true,
      cancelText: '稍后绑定',
      confirmText: '去绑定',
      success: (res) => {
        if (res && res.confirm) {
          wx.navigateTo({
            url: '/package-app/pages/profile/profile',
            animationType: 'none',
            fail: () => {
              this._showCustomToast('跳转失败，请手动前往「我的」页面', 'none');
            }
          });
        }
      }
    });
  },

  // 🔴 检查设备绑定（在切换到故障报修时调用）
  async checkDeviceBeforeRepair(options = {}) {
    const { fallbackToParts = false, allowSwitch = true } = options;
    if (this._repairCheckInFlight) return;
    this._repairCheckInFlight = true;
    try {
      const db = wx.cloud.database();
      const now = Date.now();
      const cache = this._repairDeviceCache;
      const adminBypassDevice = !!this.data.isAuthorized;
      
      // 1. 获取当前用户 openid
      let openid = this.data.myOpenid || '';
      if (!openid) {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        openid = loginRes.result?.openid || '';
        if (openid) {
          this.setData({ myOpenid: openid });
        }
      }
      
      if (!openid) {
        if (fallbackToParts && this.data.serviceType === 'repair') {
          this.setData({ serviceType: 'parts' });
        }
        this._showCustomModal({
          title: '提示',
          content: '无法获取用户信息，请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      if (adminBypassDevice) {
        this.checkUnfinishedReturn(openid, { fallbackToParts, allowSwitch });
        return;
      }

      // 2. 命中短缓存（30 秒）时直接使用，避免重复云查询
      if (
        cache &&
        cache.openid === openid &&
        now - cache.ts < 30000
      ) {
        if (!cache.hasDevice) {
          this._showRepairBindDevicePrompt({ revertToParts: fallbackToParts });
          return;
        }
        this.checkUnfinishedReturn(openid, { fallbackToParts, allowSwitch });
        return;
      }

      // 2. 检查是否绑定了设备（使用 openid 字段，必须检查 isActive: true）
      const deviceRes = await db.collection('sn').where({
        openid: openid,
        isActive: true  // 🔴 只有已激活的设备才算绑定成功
      }).count();
      this._repairDeviceCache = {
        ts: Date.now(),
        openid,
        hasDevice: deviceRes.total > 0
      };

      if (deviceRes.total === 0) {
        this._showRepairBindDevicePrompt({ revertToParts: fallbackToParts });
        return;
      }
      
      // 3. 绑定了设备，继续检查是否有未完成的寄回订单
      this.checkUnfinishedReturn(openid, { fallbackToParts, allowSwitch });
    } catch (err) {
      console.error('[checkDeviceBeforeRepair] 检查设备失败:', err);
      if (fallbackToParts && this.data.serviceType === 'repair') {
        this.setData({ serviceType: 'parts' });
      }
      // 检查失败时，使用自定义弹窗提示
      this._showCustomModal({
        title: '提示',
        content: '检查设备状态失败，请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      });
    } finally {
      this._repairCheckInFlight = false;
    }
  },

  // 【新增】检查是否有未完成的寄回订单
  async checkUnfinishedReturn(openidParam, options = {}) {
    const { fallbackToParts = false, allowSwitch = true } = options;
    try {
      const db = wx.cloud.database();
      let openid = openidParam || this.data.myOpenid || '';
      if (!openid) {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        openid = loginRes.result?.openid || '';
        if (openid) {
          this.setData({ myOpenid: openid });
        }
      }
      if (!openid) return;
      db.collection('shouhou_repair')
      .where({
        needReturn: true,
        _openid: openid
      })
      .get()
      .then(checkRes => {
        // 过滤出未完成且用户未录入运单号的订单
        const unfinishedReturns = (checkRes.data || []).filter(item => 
          !item.returnCompleted && !item.returnTrackingId
        );
        
        if (unfinishedReturns.length > 0) {
          // 有未完成的寄回订单，显示提示并阻止切换
          if (fallbackToParts && this.data.serviceType === 'repair') {
            this.setData({ serviceType: 'parts' });
          }
          this.showAutoToast('提示', '检测到您有一笔未完成的售后，未寄回维修配件，请先处理完成');
          // 立即跳转，避免点击后体感卡顿
          console.log('[checkUnfinishedReturn] 准备跳转到 my 页面');
          wx.navigateTo({ 
            url: '/package-app/pages/profile/profile',
            animationType: 'none',
            success: () => {
              console.log('[checkUnfinishedReturn] 跳转成功');
            },
            fail: (err) => {
              console.error('[checkUnfinishedReturn] 跳转失败:', err);
              this._showCustomToast('跳转失败，请手动进入个人中心', 'none');
            }
          });
          return; // 不切换服务类型
        }
        
        // 没有未完成的寄回订单，正常切换
        if (allowSwitch && this.data.serviceType !== 'repair') {
          this.setData({ serviceType: 'repair' });
        }
      })
      .catch(err => {
        const msg = (err.errMsg || err.message || '') + '';
        if (msg.indexOf('access_token') !== -1) {
          console.warn('[shouhou] 云会话未就绪，跳过寄回订单检查');
        } else {
          console.error('检查寄回订单失败:', err);
        }
        if (allowSwitch && this.data.serviceType !== 'repair') {
          // 检查失败也允许切换，避免阻塞用户
          this.setData({ serviceType: 'repair' });
        }
      });
    } catch (err) {
      console.error('检查寄回订单失败:', err);
      if (allowSwitch && this.data.serviceType !== 'repair') {
        this.setData({ serviceType: 'repair' });
      }
    }
  },

  /**
   * 合并本地默认配件名与云端 shouhou 记录。
   * 避免：管理员只给「无 _id 的默认行」改过一次价时，云端仅插入 1 条，loadParts 又只读云端导致其余配件「全部消失」。
   */
  _mergeDefaultPartsWithCloud(modelName, cloudRows) {
    const canonical = normalizeProductDetailModel(modelName);
    const defaultNames = DB_PARTS[canonical] || DB_PARTS[modelName] || [];
    const cloudByName = {};
    (cloudRows || []).forEach((item) => {
      if (item && item.name) cloudByName[String(item.name).trim()] = item;
    });
    const parts = [];
    if (defaultNames.length > 0) {
      defaultNames.forEach((name, index) => {
        const key = String(name).trim();
        let item = cloudByName[key];
        let consumedKey = key;
        if (!item) {
          const altKey = Object.keys(cloudByName).find((k) => {
            const row = cloudByName[k];
            return row && String(row.defaultName || '').trim() === key;
          });
          if (altKey) {
            item = cloudByName[altKey];
            consumedKey = altKey;
          }
        }
        if (item) {
          parts.push({
            _id: item._id,
            name: item.name,
            price: item.price || 0,
            modelName: item.modelName || modelName,
            order: item.order != null ? item.order : index,
            defaultName: item.defaultName || key,
            selected: false,
            preselected: false
          });
          delete cloudByName[consumedKey];
        } else {
          parts.push({
            name,
            price: 0,
            modelName,
            order: index,
            selected: false,
            preselected: false
          });
        }
      });
    }
    Object.keys(cloudByName).forEach((key) => {
      const item = cloudByName[key];
      parts.push({
        _id: item._id,
        name: item.name,
        price: item.price || 0,
        modelName: item.modelName || modelName,
        order: item.order != null ? item.order : parts.length,
        selected: false,
        preselected: false
      });
    });
    parts.sort((a, b) => (a.order || 0) - (b.order || 0));
    return parts;
  },

  /** 云数据库 .get() 默认最多 20 条，配件多时必须分页拉全 */
  _fetchShouhouPartsByModel(modelName) {
    const db = wx.cloud.database();
    const PAGE = 100;
    const all = [];
    const load = (skip) => db.collection('shouhou')
      .where({ modelName })
      .skip(skip)
      .limit(PAGE)
      .get()
      .then((res) => {
        const batch = res.data || [];
        all.push(...batch);
        if (batch.length >= PAGE) return load(skip + PAGE);
        return all;
      });
    return load(0);
  },

  /** 底部固定栏高度约 180rpx + 安全区，占位不足时最后一行会被挡住 */
  _calcPartsPlaceholderHeight(partsCount, isAdmin) {
    const DOCK_PADDING = 260;
    return DOCK_PADDING + 'rpx';
  },

  _assignPartListKeys(parts, modelName) {
    const model = modelName || this.data.currentModelName || '';
    return (parts || []).map((p, i) => ({
      ...p,
      listKey: p._id || `${model}-${i}-${p.name || ''}`
    }));
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
    
    // 从 shouhou 集合读取（分页，避免默认 20 条上限漏掉新配件）
    this._fetchShouhouPartsByModel(modelName).then(cloudRows => {
      console.log(`[loadParts] ${modelName} 从云端读取到 ${cloudRows.length} 条数据`);
      const defaultNames = DB_PARTS[modelName] || [];
      let parts = [];

      if (defaultNames.length > 0) {
        parts = this._mergeDefaultPartsWithCloud(modelName, cloudRows);
        console.log(`[loadParts] ${modelName} 默认+云端合并，共 ${parts.length} 个配件`);
      } else if (cloudRows.length > 0) {
        parts = cloudRows.map(item => ({
          _id: item._id,
          name: item.name,
          price: item.price || 0,
          modelName: item.modelName,
          order: item.order || 0,
          selected: false,
          preselected: false
        }));
        parts.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log(`[loadParts] ${modelName} 无本地默认列表，仅使用云端，共 ${parts.length} 个配件`);
      } else {
        console.log(`[loadParts] ${modelName} 云端与默认均为空`);
      }

      console.log(`[loadParts] ${modelName} 最终加载 ${parts.length} 个配件:`, parts.map(p => p.name));
      // 🔴 从「去购买配件」带来的需购配件：预选并标记为「管理员要求」，样式与点击选中区分
      const app = getApp();
      const preselect = (app && app.globalData && app.globalData.shouhouPreselectParts) ? app.globalData.shouhouPreselectParts : [];
      if (preselect.length) {
        const set = new Set(preselect.map(p => String(p).trim()));
        parts.forEach(p => {
          if (set.has(String(p.name).trim())) {
            p.selected = true;
            p.preselected = true;
          }
        });
        app.globalData.shouhouPreselectParts = [];
      }
      const selectedCount = parts.filter(p => p.selected).length;
      const totalPrice = parts.filter(p => p.selected).reduce((sum, p) => sum + (p.price || 0), 0);
      // 先渲染列表且预选项暂不标 preselected，下一帧再统一标上，使呼吸动画同时开始
      const listForPaint = this._assignPartListKeys(
        parts.map(p => ({ ...p, preselected: false })),
        modelName
      );
      this.setData({ currentPartsList: listForPaint, selectedCount, totalPrice });
      if (parts.some(p => p.preselected)) {
        const that = this;
        setTimeout(function () {
          that.setData({
            currentPartsList: that._assignPartListKeys(parts, modelName),
            showPreselectTip: true
          });
          that._startArrowBounce();
        }, 50);
      }
      
      this.setData({
        partsPlaceholderHeight: this._calcPartsPlaceholderHeight(parts.length, this.data.isAdmin)
      });
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
        selected: false,
        preselected: false
      }));
      const app2 = getApp();
      const preselect2 = (app2 && app2.globalData && app2.globalData.shouhouPreselectParts) ? app2.globalData.shouhouPreselectParts : [];
      if (preselect2.length) {
        const set2 = new Set(preselect2.map(p => String(p).trim()));
        parts.forEach(p => {
          if (set2.has(String(p.name).trim())) {
            p.selected = true;
            p.preselected = true;
          }
        });
        app2.globalData.shouhouPreselectParts = [];
      }
      const selectedCount = parts.filter(p => p.selected).length;
      const totalPrice = parts.filter(p => p.selected).reduce((sum, p) => sum + (p.price || 0), 0);
      const listForPaint = this._assignPartListKeys(
        parts.map(p => ({ ...p, preselected: false })),
        modelName
      );
      this.setData({ currentPartsList: listForPaint, selectedCount, totalPrice });
      if (parts.some(p => p.preselected)) {
        const that = this;
        setTimeout(function () {
          that.setData({
            currentPartsList: that._assignPartListKeys(parts, modelName),
            showPreselectTip: true
          });
          that._startArrowBounce();
        }, 50);
      }
      
      this.setData({
        partsPlaceholderHeight: this._calcPartsPlaceholderHeight(parts.length, this.data.isAdmin)
      });
    });
  },

  // 保留旧的 renderParts 用于兼容（如果其他地方还在调用）
  renderParts() {
    this.loadParts(this.data.currentModelName);
  },

  // 同步配件数据到云端（按型号独立）
  syncPartsToCloud(modelName, partsList) {
    if (!partsList || partsList.length === 0) return;
    if (!this.data.isAdmin) return;
    this._showCustomToast('请使用「一键同步到云端」', 'none');
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
      content: '将强制覆盖全部 9 个明细型号（F1 PRO、F1 MAX、F1 ULTRA、F2 PRO、F2 MAX、F2 ULTRA、F2 Long、F3 PRO、F3 MAX）的配件数据到云端，云端旧数据将被删除并替换为本地数据，是否继续？',
      showCancel: true,
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('同步中...');
          wx.cloud.callFunction({
            name: 'initShouhouParts',
            data: { force: true }
          }).then((cfRes) => {
            this.hideMyLoading();
            const result = cfRes.result || {};
            if (result.success) {
              const added = result.summary && result.summary.totalAdded != null
                ? result.summary.totalAdded
                : '';
              this._showCustomToast(
                added !== '' ? `同步完成，共 ${added} 条` : (result.message || '同步完成'),
                'success',
                3000
              );
              if (this.data.inDetail && this.data.currentModelName) {
                setTimeout(() => this.loadParts(this.data.currentModelName), 800);
              }
            } else {
              this._showCustomModal({
                title: '同步失败',
                content: result.message || '请确认已部署 initShouhouParts 云函数',
                showCancel: false
              });
            }
          }).catch((err) => {
            this.hideMyLoading();
            console.error('[syncAllPartsToCloud]', err);
            this._showCustomModal({
              title: '同步失败',
              content: err.errMsg || err.message || '网络错误',
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
    const idx = Number(e.currentTarget.dataset.index);
    const list = [...(this.data.currentPartsList || [])];
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    
    console.log('[togglePart] 索引:', idx, '配件:', list[idx]);
    
    list[idx] = { ...list[idx], selected: !list[idx].selected };
    this._recalcPartsSummary(list);
  },

  _toPriceNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value === null || value === undefined) return 0;
    const s = String(value).trim();
    if (!s) return 0;
    const direct = Number(s);
    if (Number.isFinite(direct)) return direct;
    const cleaned = s.replace(/[^\d.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  },

  _recalcPartsSummary(partsList) {
    const list = Array.isArray(partsList) ? partsList : [];
    let count = 0;
    let total = 0;
    list.forEach((p) => {
      if (p && p.selected) {
        count += 1;
        total += this._toPriceNumber(p.price);
      }
    });
    this.setData({
      currentPartsList: list,
      selectedCount: count,
      totalPrice: Number(total.toFixed(2))
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
        this._lastPartDragTouchTs = Date.now();
        this._armPartDragWatchdog();
      }
    });
  },

  _armPartDragWatchdog() {
    if (this._partDragWatchdogTimer) {
      clearTimeout(this._partDragWatchdogTimer);
      this._partDragWatchdogTimer = null;
    }
    this._partDragWatchdogTimer = setTimeout(() => {
      this._partDragWatchdogTimer = null;
      if (!this.data.isDragging) return;
      const lastTs = Number(this._lastPartDragTouchTs || 0);
      if (!lastTs || Date.now() - lastTs > 1800) {
        this.setData({
          isDragging: false,
          dragIndex: -1,
          dragX: 0,
          dragY: 0,
          touchStartX: 0,
          touchStartY: 0
        });
      } else {
        this._armPartDragWatchdog();
      }
    }, 900);
  },

  handleAdminContainerTouchMove(e) {
    if (!this.data.isAdmin || !this.data.isDragging) return;
    this.handleTouchMove(e);
  },

  handleAdminContainerTouchEnd(e) {
    if (!this.data.isAdmin || !this.data.isDragging) return;
    this.handleTouchEnd(e);
  },

  // [新增] 触摸移动
  handleTouchMove(e) {
    if (!this.data.isAdmin || !this.data.isDragging) return;
    this._lastPartDragTouchTs = Date.now();
    this._armPartDragWatchdog();
    
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
    if (!this.data.isDragging) return;
    
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
    if (this._partDragWatchdogTimer) {
      clearTimeout(this._partDragWatchdogTimer);
      this._partDragWatchdogTimer = null;
    }
    this._stableTarget = { index: -1, time: 0, touchX: 0, touchY: 0 };
    this._lastSwapTime = 0;
    this._lastTouchX = 0;
    this._lastTouchY = 0;
    
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

  // [新增] 管理员添加配件（用页面级弹窗，避免 wx.showModal 被全局拦截后在详情页无反应）
  adminAddPart() {
    if (!this.data.isAdmin) return;
    if (this.data.isDragging) {
      this.setData({
        isDragging: false,
        dragIndex: -1,
        dragX: 0,
        dragY: 0
      });
    }
    this.setData({
      showModal: true,
      showModalClosing: false,
      modalMode: 'part',
      modalInputVal: '',
      modalPriceVal: '0'
    });
  },

  // [新增] 添加配件到云端和本地
  addPartToCloud(name, price) {
    const currentList = this.data.currentPartsList || [];
    const trimmed = String(name || '').trim();
    if (currentList.some((p) => String(p.name || '').trim() === trimmed)) {
      this._showCustomToast('已有同名配件', 'none');
      return;
    }

    this.showMyLoading('添加中...');
    const db = wx.cloud.database();
    
    // 获取当前配件列表的最大 order 值
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

      const nextList = this._assignPartListKeys(currentList.concat([{
        _id: res._id,
        name: trimmed,
        price,
        modelName: this.data.currentModelName,
        order: maxOrder + 1,
        selected: false,
        preselected: false
      }]), this.data.currentModelName);
      this.setData({
        currentPartsList: nextList,
        partsPlaceholderHeight: this._calcPartsPlaceholderHeight(nextList.length, this.data.isAdmin)
      });
      
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
    const defaultSlotKey = String(part.defaultName || part.name || '').trim();
    if (type === 'price') {
      dataToUpdate.price = Number(value); // 价格转数字
    } else {
      dataToUpdate.name = value; // 名字保持字符串
      if (defaultSlotKey) dataToUpdate.defaultName = defaultSlotKey;
    }

    // A. 如果是云端已有数据 (有 _id)，直接调用云函数更新（避免权限问题）
    if (part._id) {
      if (type === 'price' && defaultSlotKey && !part.defaultName) {
        dataToUpdate.defaultName = defaultSlotKey;
      }
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
        name: type === 'name' ? value : part.name,
        price: type === 'price' ? Number(value) : (part.price || 0),
        order: part.order != null ? part.order : 0,
        defaultName: defaultSlotKey || undefined,
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
        if (!list[idx].defaultName) {
          list[idx].defaultName = String(list[idx].name || '').trim();
        }
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

  _isAdminTutorialUpload() {
    return !!(this.data.showModal && this.data.modalMode === 'video');
  },

  _applyAdminTutorialVideoFromFile(file) {
    if (!file || !file.tempFilePath) return;
    const videoPath = file.tempFilePath;
    const thumbPath = file.thumbTempFilePath;
    const knownSz = typeof file.size === 'number' && file.size > 0 ? file.size : null;
    if (thumbPath) {
      this.setData({
        tempVideoPath: videoPath,
        tempVideoKnownSize: knownSz,
        tempVideoThumb: thumbPath,
        extractingThumb: false
      });
    } else {
      this.setData({
        tempVideoPath: videoPath,
        tempVideoKnownSize: knownSz,
        tempVideoThumb: '',
        extractingThumb: true
      });
      this.showMyLoading('正在提取封面...');
      setTimeout(() => this.captureVideoFrame(), 500);
    }
    if (!this.data.modalInputVal) {
      this.setData({ modalInputVal: '新上传教程' });
    }
    this._showCustomToast('视频已选择', 'success');
  },

  // 🔴 修改：显示上传选项弹窗（参考 case 页面）
  chooseVideo() {
    this.setData({ showUploadOptions: true, uploadOptionsClosing: false });
  },

  // 🔴 新增：关闭上传选项弹窗
  closeUploadOptions() {
    this._closeWithAnimation('showUploadOptions', 'uploadOptionsClosing');
  },

  // 从相册选择素材（照片/视频二选一）
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
      const adminTutorial = this._isAdminTutorialUpload();
      wx.chooseMedia({
        count: 1,
        mediaType: adminTutorial ? ['video'] : ['image', 'video'],
        sourceType: ['album'],
        success: (res) => {
          console.log('✅ 从相册选择素材成功:', res);
          const file = res && res.tempFiles && res.tempFiles[0];
          const filePath = file && file.tempFilePath ? file.tempFilePath : '';
          const fileType = file && file.fileType ? file.fileType : '';
          if (filePath && adminTutorial) {
            if (fileType !== 'video') {
              this._showCustomToast('请选择视频文件', 'none');
              return;
            }
            this._applyAdminTutorialVideoFromFile(file);
            return;
          }
          if (filePath) {
            if (fileType === 'video') {
              // 视频模式
              const knownSz = typeof file.size === 'number' && file.size > 0 ? file.size : null;
              if (file.thumbTempFilePath) {
                this.setData({
                  videoFileName: '已选择视频 (点击重新上传)',
                  tempVideoPath: filePath,
                  tempVideoKnownSize: knownSz,
                  tempImagePath: '',
                  tempVideoThumb: file.thumbTempFilePath
                });
              } else {
                this.setData({
                  videoFileName: '已选择视频 (点击重新上传)',
                  tempVideoPath: filePath,
                  tempVideoKnownSize: knownSz,
                  tempImagePath: '',
                  tempVideoThumb: '',
                  extractingThumb: true
                });
                setTimeout(() => {
                  this.captureRepairVideoFrame();
                }, 500);
              }
            } else {
              // 图片模式（裁切后预览）
              shopImagePrepare.prepareImageFile(filePath, 'shouhou').then((prepared) => {
                this.setData({
                  videoFileName: '已选择照片 (点击重新上传)',
                  tempImagePath: prepared,
                  tempVideoPath: '',
                  tempVideoKnownSize: null,
                  tempVideoThumb: '',
                  extractingThumb: false
                });
              }).catch((err) => {
                if (!shopImagePrepare.isCropCancelled(err)) {
                  console.error('[shouhou] repair image crop', err);
                  this._showCustomToast('图片处理失败', 'none');
                }
              });
            }
          } else {
            console.error('素材文件路径不存在');
            this._showCustomToast('文件异常，请重试', 'none');
          }
        },
        fail: (err) => {
          // 用户取消不提示
          if (err && (err.errMsg || '').includes('cancel')) {
            return;
          }
          console.error('❌ 从相册选择失败:', err);
          // 根据错误类型显示友好的中文提示
          let errorMsg = '选择失败';
          if (err && err.errMsg) {
            if (err.errMsg.includes('cancel')) {
              return; // 用户取消，不提示
            } else if (err.errMsg.includes('permission') || err.errMsg.includes('权限')) {
              errorMsg = '需要相册权限，请在设置中开启';
            } else if (err.errMsg.includes('size') || err.errMsg.includes('大小')) {
              errorMsg = '视频文件过大，请选择较小的视频';
            } else if (err.errMsg.includes('format') || err.errMsg.includes('格式')) {
              errorMsg = '视频格式不支持，请选择其他视频';
            }
          }
          this._showCustomToast(errorMsg, 'none', 3000);
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
              tempVideoKnownSize: typeof res.size === 'number' && res.size > 0 ? res.size : null,
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

  // [新增] 提取故障报修视频封面（使用 poster 属性自动生成）
  captureRepairVideoFrame() {
    console.log('🎬 开始提取视频封面');
    
    const videoPath = this.data.tempVideoPath;
    if (!videoPath) {
      console.warn('视频路径为空，无法提取封面');
      this.setData({ extractingThumb: false });
      getApp().hideDialog();
      return;
    }

    // 🔴 关键方案：使用 video 组件的 poster 属性
    // 微信会自动从视频中提取第一帧作为 poster
    // 我们只需要设置一个特殊标记，让 WXML 渲染带 poster 的 video
    this.setData({
      tempVideoThumb: 'AUTO_GENERATE', // 特殊标记：让 WXML 知道要自动生成封面
      extractingThumb: false
    });
    
    getApp().hideDialog();
    console.log('✅ 已设置自动封面模式');
  },

  // ========================================================
  // [修改] 智能粘贴相关逻辑
  // ========================================================
  
  // 1. 打开智能粘贴弹窗
  openSmartPasteModal() {
    console.log('点击了智能粘贴按钮'); // 调试用：确认按钮是否被点击
    this.setData({
      showSmartPasteModal: true,
      smartPasteModalClosing: false,
      smartPasteVal: '' // 每次打开清空
    });
  },

  // 2. 关闭弹窗
  closeSmartPasteModal() {
    this._closeWithAnimation('showSmartPasteModal', 'smartPasteModalClosing');
  },

  // 3. 监听弹窗输入
  onSmartPasteInput(e) {
    this.setData({ smartPasteVal: e.detail.value });
  },

  // [修改] 高级智能粘贴 - 使用腾讯地图API精准解析
  async confirmSmartPaste() {
    const text = this.data.smartPasteVal.trim();
    if (!text) {
      this._showCustomToast('内容不能为空', 'none');
      return;
    }

    this.showMyLoading('智能解析中...');

    try {
      // 使用腾讯地图API进行精准解析
      const { parseSmartAddress } = require('../../../utils/smartAddressParser.js');
      const result = await parseSmartAddress(text);
      
      // 🔴 调试：打印完整的解析结果
      console.log('[confirmSmartPaste] 完整解析结果:', JSON.stringify(result, null, 2));
      console.log('[confirmSmartPaste] result.detail:', result.detail);
      console.log('[confirmSmartPaste] result.address:', result.address);

      // 构造更新数据
      let updateData = {
        showSmartPasteModal: false
      };
      const { MUNICIPALITY_PROVINCES } = require('../../../utils/smartAddressParser.js');

      if (result.name) updateData['orderInfo.name'] = result.name;
      if (result.phone) updateData['orderInfo.phone'] = result.phone;
      
      // 🔴 修改：将省市区和详细地址分开填充
      // 省市区填充到选择器（直辖市与普通省已在 smartAddressParser 内统一）
      
      const finalProvince = result.province || '';
      // 直辖市规则：中间「市」字段一律留空（不自动填）
      const cityForFill = MUNICIPALITY_PROVINCES.includes(finalProvince) ? '' : (result.city || '');
      const districtForFill = result.district || '';
      
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
        console.log('[confirmSmartPaste] ⚠️ 无法确定省份，已清空省市区选择，请用户手动选择');
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
            console.log('[confirmSmartPaste] 使用result.detail填充详细地址:', result.detail);
            updateData['detailAddress'] = result.detail.trim();
          } else if (result.address && result.address.trim()) {
            // 如果没有detail，从address中移除省市区
            console.log('[confirmSmartPaste] 从result.address提取详细地址:', result.address);
            let detail = result.address;
            if (result.province) detail = detail.replace(result.province, '').trim();
            if (cityForFill) detail = detail.replace(cityForFill, '').trim();
            if (districtForFill) detail = detail.replace(districtForFill, '').trim();
            updateData['detailAddress'] = detail.trim() || result.address.trim();
            console.log('[confirmSmartPaste] 提取后的详细地址:', updateData['detailAddress']);
          }
          
          // 组装完整地址用于orderInfo.address（兼容旧逻辑）
          const fullAddressParts = [];
          if (result.province) fullAddressParts.push(result.province);
          if (cityForFill) fullAddressParts.push(cityForFill);
          if (districtForFill) fullAddressParts.push(districtForFill);
          if (result.detail) fullAddressParts.push(result.detail);
          const fullAddress = fullAddressParts.join(' ').trim() || result.address || '';
          if (fullAddress) {
            updateData['orderInfo.address'] = fullAddress;
          }
          
          // 🔴 修复：先执行 setData，然后立即加载城市列表（异步，但会在加载完成后自动匹配）
          this.setData(updateData, () => {
            console.log('[confirmSmartPaste] ✅ setData完成，详细地址已更新:', this.data.detailAddress);
            // 在 setData 回调中加载城市列表，确保数据已更新
            if (this.data.provinceList[provinceIndex].id) {
              this.loadCityListForSmartPaste(this.data.provinceList[provinceIndex].id, cityForFill, districtForFill);
            }
            
            // 如果解析到了地址，重新计算运费
            if (fullAddress && fullAddress.trim()) {
              this.reCalcFinalPrice();
            }
          });
          
          // 🔴 修复：不在这里继续执行，等待 loadCityListForSmartPaste 完成
          this.hideMyLoading();
          this._showCustomToast('解析完成', 'success');
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
          console.log('[confirmSmartPaste] ⚠️ 无法匹配省份:', finalProvince);
        }
      }
      
      // 🔴 修复：详细地址只填充详细部分（优先使用detail字段）
      if (result.detail && result.detail.trim()) {
        console.log('[confirmSmartPaste] 使用result.detail填充详细地址:', result.detail);
        updateData['detailAddress'] = result.detail.trim();
      } else if (result.address && result.address.trim()) {
        // 如果没有detail，从address中移除省市区
        console.log('[confirmSmartPaste] 从result.address提取详细地址:', result.address);
        let detail = result.address;
        if (result.province) detail = detail.replace(result.province, '').trim();
        if (cityForFill) detail = detail.replace(cityForFill, '').trim();
        if (districtForFill) detail = detail.replace(districtForFill, '').trim();
        updateData['detailAddress'] = detail.trim() || result.address.trim();
        console.log('[confirmSmartPaste] 提取后的详细地址:', updateData['detailAddress']);
      } else {
        console.log('[confirmSmartPaste] ⚠️ 没有找到详细地址，result.detail和result.address都为空');
      }
      
      // 组装完整地址用于orderInfo.address（兼容旧逻辑）
      const fullAddressParts = [];
      if (result.province) fullAddressParts.push(result.province);
      if (cityForFill) fullAddressParts.push(cityForFill);
      if (districtForFill) fullAddressParts.push(districtForFill);
      if (result.detail) fullAddressParts.push(result.detail);
      const fullAddress = fullAddressParts.join(' ').trim() || result.address || '';
      if (fullAddress) {
        updateData['orderInfo.address'] = fullAddress;
      }

      this.setData(updateData);
      
      // 如果解析到了地址，重新计算运费
      if (fullAddress && fullAddress.trim()) {
        this.reCalcFinalPrice();
      }
      
      this.hideMyLoading();
      this._showCustomToast('解析完成', 'success');
    } catch (error) {
      console.error('[shouhou] 智能地址解析失败:', error);
      this.hideMyLoading();
      
      // 失败时使用本地解析作为备用方案
      const result = this.parseAddress(text);
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
      if (result.address && result.address.trim()) {
        this.reCalcFinalPrice();
      }
      this._showCustomToast('解析完成（使用备用方案）', 'success');
    }
  },
  
  // 🔴 优化：高级解析算法（解析姓名、电话、地址）- 更精准版本
  parseAddress(text) {
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
    
    // 使用现有的地址解析函数
    if (addressText) {
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
      showCartSuccess: true,
      cartSuccessClosing: false
    });
    
    this.setData({
      currentPartsList: resetList,
      selectedCount: 0,
      totalPrice: 0,
      showCartSuccess: true, // 弹出成功提示
      cartSuccessClosing: false
    });
    
    console.log('[shouhou] setData 完成，当前 showCartSuccess:', this.data.showCartSuccess);
  },

  // 2. [新增] 成功弹窗的两个按钮逻辑
  onContinueShopping() {
    this._closeWithAnimation('showCartSuccess', 'cartSuccessClosing');
  },

  // 关闭「已预选完成」小弹窗（加 try 避免偶尔 setData 异常导致卡住）
  closePreselectTip() {
    if (this._arrowBounceTimer) {
      clearInterval(this._arrowBounceTimer);
      this._arrowBounceTimer = null;
    }
    try {
      this.setData({ showPreselectTip: false, arrowTranslateY: 0 });
    } catch (e) {
      console.warn('[shouhou] closePreselectTip setData:', e);
    }
  },

  // 红色箭头上下弹跳；用 nextTick 延后 setData 减轻主线程压力，降低「偶尔卡住」概率
  _startArrowBounce() {
    if (this._arrowBounceTimer) return;
    const that = this;
    const run = () => {
      if (!that.data.showPreselectTip) {
        if (that._arrowBounceTimer) {
          clearInterval(that._arrowBounceTimer);
          that._arrowBounceTimer = null;
        }
        return;
      }
      const tick = typeof wx.nextTick === 'function' ? wx.nextTick : (fn) => setTimeout(fn, 0);
      tick(() => {
        if (!that.data.showPreselectTip) return;
        that.setData({ arrowTranslateY: -20 });
      });
      setTimeout(() => {
        if (!that.data.showPreselectTip) return;
        tick(() => {
          if (!that.data.showPreselectTip) return;
          that.setData({ arrowTranslateY: 0 });
        });
      }, 400);
    };
    run();
    this._arrowBounceTimer = setInterval(run, 1500);
  },

  onGoToCheckout() {
    // 从本地存储加载购物车到页面数据
    const cart = wx.getStorageSync('my_cart') || [];
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    
    this._openOrderModal({
      showCartSuccess: false,
      cart: cart,
      cartTotalPrice: total
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
  },

  // 4. [新增/确保有] 统一的保存函数
  saveCartToCache(newCart) {
    console.log('[shouhou] saveCartToCache 被调用，购物车数据:', newCart);
    try {
      const newTotal = (newCart || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      wx.setStorageSync('my_cart', newCart);
      this.setData({ 
        cart: newCart,
        cartTotalPrice: newTotal
      });
      // 统一在这里重算应付金额，确保购物车数量变化后总价实时刷新
      this.reCalcFinalPrice(newCart);
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

  /** 与商城一致：无主机且全是配件/售后零件 → 中通按省收费 */
  _cartIsAccessoryOnly(cart) {
    const list = cart || this.data.cart || [];
    if (!list.length) return false;
    if (list.some((item) => item && item.type === 'main')) return false;
    return list.every((item) => item && (item.type === 'accessory' || item.type === 'part'));
  },

  _ztoAccessoryShippingFee(province) {
    const p = (province || '').trim();
    if (!p) return 0;
    if (p.indexOf('广东') > -1) return 12;
    return 15;
  },

  _provinceShippingFee(province) {
    const p = (province || '').trim();
    if (!p) return 0;
    if (p.indexOf('广东') > -1) return 13;
    return 22;
  },

  _resolveProvinceForShipping() {
    const { selectedProvince, detailAddress } = this.data;
    if (selectedProvince && String(selectedProvince).trim()) {
      return String(selectedProvince).trim();
    }
    if (detailAddress && String(detailAddress).trim()) {
      const parsed = this.parseAddressForShipping(detailAddress);
      return (parsed.province || '').trim();
    }
    return '';
  },

  // [新增] 计算含运费的总价（仅故障报修/申请售后包邮；购买配件等收运费）
  reCalcFinalPrice(cart = this.data.cart) {
    console.log('[shouhou] reCalcFinalPrice 开始计算，购物车数据:', cart);
    const goodsTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const { shippingMethod } = this.data;
    const freeShipping = this.data.serviceType === 'repair';
    const province = this._resolveProvinceForShipping();
    let fee = 0;

    if (!freeShipping) {
      if (shippingMethod === 'zto') {
        fee = this._ztoAccessoryShippingFee(province);
      } else if (shippingMethod === 'sf') {
        fee = this._provinceShippingFee(province);
        if (!province && this.data.detailAddress && String(this.data.detailAddress).trim()) {
          this.showAutoToast('提示', '无法从地址中识别省份，请检查「省市区」和详细地址是否填写完整');
        }
      }
    }

    console.log('[shouhou] 价格计算完成:', {
      goodsTotal,
      shippingMethod,
      freeShipping,
      shippingFee: fee,
      finalTotalPrice: goodsTotal + fee
    });

    this.setData({
      cart,
      cartTotalPrice: goodsTotal,
      shippingFee: fee,
      finalTotalPrice: goodsTotal + fee,
      checkoutFreeShipping: freeShipping,
      ...buildShippingDisplay(shippingMethod, fee, freeShipping)
    });
  },

  // [核心修复] 立即购买 / 去下单
  openCartOrder() {
    console.log('点击立即购买'); // 调试用
    const { currentPartsList, selectedCount, currentModelName } = this.data;
    // 有管理员预选过、但用户取消勾选的配件 -> 弹窗确认是否继续下单
    const preselectedButUnchecked = (currentPartsList || []).filter(p => p.preselected === true && p.selected !== true);
    if (preselectedButUnchecked.length > 0) {
      this.showMyDialog({
        title: '提示',
        content: '您有未选中的配件，是否继续下单？',
        showCancel: true,
        confirmText: '继续下单',
        cancelText: '返回选择',
        maskClosable: false,
        callback: () => { this._doOpenCartOrder(); }
      });
      return;
    }
    this._doOpenCartOrder();
  },

  _doOpenCartOrder() {
    const { currentPartsList, selectedCount, currentModelName } = this.data;
    let cart = wx.getStorageSync('my_cart') || [];
    cart = cart.filter(item => !item.isTemp);

    if (selectedCount === 0) {
      if (cart.length === 0) {
        this.showAutoToast('提示', '请选择配件');
        return;
      }
      this.reCalcFinalPrice(cart);
      this._openOrderModal({ cart });
      return;
    }

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
    this._openOrderModal();
  },

  // [新增] 打开故障报修订单弹窗
  openRepairOrder() {
    const { repairDescription, tempVideoPath, tempImagePath } = this.data;
    
    // 校验
    if (!repairDescription || repairDescription.trim() === '') {
      this.showAutoToast('提示', '请填写故障描述');
      return;
    }
    if (!tempVideoPath && !tempImagePath) {
      this.showAutoToast('提示', '请上传故障视频或照片');
      return;
    }
    
    const proceed = () => {
      this.loadRepairDevices();
      this._openOrderModal();
    };
    if (this._repairTermsAcked) {
      proceed();
      return;
    }
    this._showRepairSubmitTermsDialog(proceed, { confirmText: '确认并继续' });
  },

  // [新增] 关闭订单弹窗（立刻去掉 active，面板即开始下滑）
  closeOrderModal() {
    if (!this.data.showOrderModal && !this.data.orderModalClosing) return;
    if (this.data.dialog && this.data.dialog.show) {
      this.closeCustomDialog();
    }
    this._closeWithAnimation('showOrderModal', 'orderModalClosing', { orderModalActive: false }, 320);
  },

  // [新增] 最终支付 (对应弹窗里的黑色按钮)
  submitRealOrder() {
    if (this._paying) return;
    const { cart, orderInfo, detailAddress, finalTotalPrice, shippingFee, shippingMethod, serviceType, repairDescription, tempVideoPath, tempImagePath, currentModelName } = this.data;

    // 如果是故障报修模式，走故障报修提交逻辑
    if (serviceType === 'repair') {
      // 校验
      if (!repairDescription || repairDescription.trim() === '') {
        this.showAutoToast('提示', '请填写故障描述');
        return;
      }
      if (!tempVideoPath && !tempImagePath) {
        this.showAutoToast('提示', '请上传故障视频或照片');
        return;
      }
      // 🔴 修改：检查省市区和详细地址
      const { selectedProvince, selectedCity, selectedDistrict, detailAddress } = this.data;
      
      if (!orderInfo.name || !orderInfo.phone) {
        this.showAutoToast('提示', '请完善联系信息');
        return;
      }
      
      // 🔴 检查省市区是否完整填写
      if (!selectedProvince || !selectedCity || !selectedDistrict) {
        this.showAutoToast('提示', '请完整填写省、市、区');
        return;
      }
      
      // 🔴 额外检查：如果区县为空，也要阻止提交
      if (!selectedDistrict || selectedDistrict.trim() === '') {
        this.showAutoToast('提示', '请选择区县');
        return;
      }
      
      if (!detailAddress || !detailAddress.trim()) {
        this.showAutoToast('提示', '请填写详细地址');
        return;
      }

      // 如果用户有绑定设备，则要求选择具体故障设备
      const { myDevices, selectedDeviceIndex } = this.data;
      if (myDevices && myDevices.length > 0 && (selectedDeviceIndex === null || selectedDeviceIndex === undefined)) {
        this.showAutoToast('提示', '请选择故障设备');
        return;
      }
      
      // 手机号格式验证
      if (!/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
        this.showAutoToast('提示', '请输入正确的11位手机号');
        return;
      }
      
      // 组装完整地址
      const addressParts = [];
      if (selectedProvince) addressParts.push(selectedProvince);
      if (selectedCity) addressParts.push(selectedCity);
      if (selectedDistrict) addressParts.push(selectedDistrict);
      if (detailAddress) addressParts.push(detailAddress);
      const address = addressParts.join(' ').trim();

      const doSubmit = () => this.submitRepairTicket();
      if (this._repairTermsAcked) {
        doSubmit();
        return;
      }
      this._showRepairSubmitTermsDialog(doSubmit, { confirmText: '确认提交' });
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
    
    // 直接检查省市区选择器是否已选
    const { selectedProvince, selectedCity, selectedDistrict } = this.data;
    if (!selectedProvince || !selectedCity || !selectedDistrict) {
      this.showAutoToast('提示', '请完整填写省、市、区');
      return;
    }
    
    // 🔴 额外检查：如果区县为空，也要阻止支付
    if (!selectedDistrict || selectedDistrict.trim() === '') {
      this.showAutoToast('提示', '请选择区县');
      return;
    }
    
    if (!detailAddress || !detailAddress.trim()) {
      this.showAutoToast('提示', '请填写详细地址');
      return;
    }

    // 🔴 重新计算运费，确保金额准确
    this.reCalcFinalPrice();
    const currentShippingFee = this.data.shippingFee;
    const currentFinalTotalPrice = this.data.finalTotalPrice;
    
    const needShipFee = !this.data.checkoutFreeShipping;
    if (needShipFee && currentShippingFee === 0) {
      console.log('[shouhou] 校验失败：运费未计算', shippingMethod);
      return this.showAutoToast('提示', '请完善地址信息以计算运费');
    }

    // 拼装地址：省市区选择器 + 详细地址
    const addressParts = [];
    if (selectedProvince) addressParts.push(selectedProvince);
    if (selectedCity) addressParts.push(selectedCity);
    if (selectedDistrict) addressParts.push(selectedDistrict);
    if (detailAddress) addressParts.push(detailAddress.trim());
    const fullAddressString = addressParts.join(' ').trim();
    const finalInfo = { ...orderInfo, address: fullAddressString };

    // 先关闭可能存在的自动提示，确保确认弹窗能正常显示
    this.setData({ 'autoToast.show': false });
    
    // 🔴 仅管理员身份支付 0.01 元，运费不计
    const isAdminPay = this.data.isAdmin;
    // 🔴 使用重新计算后的价格和运费
    const payAmount = isAdminPay ? 0.01 : currentFinalTotalPrice;
    const payFee = isAdminPay ? 0 : currentShippingFee;
    
    // 调支付
    this.showMyDialog({
      title: '确认支付',
      content: '定制服务不支持退款。',
      showCancel: true,
      confirmText: '支付',
      cancelText: '取消',
      callback: () => {
        this.doCloudSubmit('pay', cart, finalInfo, payAmount, payFee, shippingMethod);
      }
    });
  },

  // 统一的云函数调用
  doCloudSubmit(action, goods, addr, total, fee, method) {
    if (this._paying) return;
    this._paying = true;
    this.showMyLoading('处理中...');
    
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
      console.error('[doCloudSubmit] 获取用户昵称失败:', e);
    }
    
    const addrPayload = {
      ...(addr || {}),
      province: this.data.selectedProvince,
      city: this.data.selectedCity,
      district: this.data.selectedDistrict
    };
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        action,
        totalPrice: total,
        goods,
        addressData: addrPayload,
        shippingFee: fee,
        shippingMethod: method,
        orderSource: 'shouhou',
        userNickname: userNickname, // 🔴 传递用户昵称
        repairId: (() => {
          let r = (this.data.repairId || '').toString().trim();
          if (r) return r;
          try {
            r = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
          } catch (e) {}
          return r;
        })() // 🔴 引导购配件订单标记
      },
      success: res => {
        this.hideMyLoading();
        const payment = res.result;

        if (payment && payment.error) {
          this._paying = false;
          this._showCustomToast(payment.msg || '支付系统异常，请稍后再试', 'none');
          return;
        }

        if (action === 'pay' && payment && payment.paySign) {
          wx.requestPayment({
            ...payment,
            success: () => {
              this._showCustomToast('支付成功', 'success');
              this.closeOrderModal();
              this._cartClearedAfterPay = false;

              const orderId = payment.outTradeNo;
              let repairId = (this.data.repairId || '').toString().trim();
              if (!repairId) {
                try {
                  repairId = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
                } catch (e) {}
              }
              this._pendingPayCtx = {
                orderId,
                repairId,
                cart: goods || [],
                addr: addrPayload
              };
              if (orderId) {
                this.startPaymentVerification(orderId, {
                  clearCartOnConfirm: true,
                  finalizeRepairParts: true
                });
              }
            },
            fail: () => {
              this._showCustomToast('支付取消', 'none');
            },
            complete: () => {
              this._paying = false;
            }
          });
          return;
        }

        this._paying = false;
        if (action === 'pay') {
          this._showCustomToast('获取支付参数失败，请稍后再试', 'none');
        }
      },
      fail: () => {
        this._paying = false;
        this.hideMyLoading();
        this._showCustomToast('下单失败', 'none');
      }
    });
  },

  // 7. 兼容旧入口：统一走 submitRealOrder（含运费重算与校验）
  submitOrder() {
    this.submitRealOrder();
  },

  // [修改] 支付执行函数 (适配新的参数结构)
  doPayment(goodsList, totalPrice, addressData) {
    this.showMyLoading('正在下单...');

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
      console.error('[doPayment] 获取用户昵称失败:', e);
    }

    // 仅管理员身份支付 0.01 元，运费不计
    const isAdminPay = this.data.isAdmin;
    const payAmount = isAdminPay ? 0.01 : totalPrice;

    const addrPayloadPay = {
      ...(addressData || {}),
      province: this.data.selectedProvince,
      city: this.data.selectedCity,
      district: this.data.selectedDistrict
    };
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: payAmount,
        goods: goodsList, // 直接传购物车数组
        addressData: addrPayloadPay,
        shippingFee: isAdminPay ? 0 : (this.data.shippingFee || 0),
        shippingMethod: this.data.shippingMethod || 'zto',
        orderSource: 'shouhou',
        userNickname: userNickname, // 🔴 传递用户昵称
        repairId: (() => {
          let r = (this.data.repairId || '').toString().trim();
          if (r) return r;
          try {
            r = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
          } catch (e) {}
          return r;
        })() // 🔴 引导购配件订单标记（含本地存储兜底）
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
            // 🔴 如果是从「去购买配件」来的，更新维修单配件购买状态，并刷新我的页面
            let repairId = (this.data.repairId || '').toString().trim();
            if (!repairId) {
              try {
                repairId = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
              } catch (e) {}
            }
            const orderIdPatch = payment.outTradeNo;
            if (orderIdPatch && repairId && wx.cloud) {
              wx.cloud.database().collection('shop_orders').where({ orderId: orderIdPatch }).update({
                data: { repairId }
              }).catch(() => {});
            }
            try {
              wx.removeStorageSync('guided_parts_repair_id');
            } catch (e) {}
            
            if (repairId) {
              // 🔴 调用云函数写入 shouhouguoqi 集合
              // 获取实际地址（优先使用 addressData，如果没有则使用 orderInfo）
              const actualAddress = addressData || this.data.orderInfo || {};
              
              wx.cloud.callFunction({
                name: 'writeShouhouguoqi',
                data: {
                  repairId: repairId,
                  goodsList: goodsList || [],
                  addressData: actualAddress,
                  userNickname: userNickname || '',
                  orderId: orderIdPatch || ''
                },
                success: (res) => {
                  if (res.result && res.result.success) {
                    console.log('[shouhou doPayment] 数据已写入 shouhouguoqi 集合', res.result.data);
                  } else {
                    console.error('[shouhou doPayment] 写入 shouhouguoqi 失败:', res.result?.errMsg || '未知错误');
                  }
                },
                fail: (err) => {
                  console.error('[shouhou doPayment] 调用云函数失败:', err);
            }
              });
            }
            if (orderIdPatch) {
              this.startPaymentVerification(orderIdPatch);
            }
            
            this.showMyDialog({
              title: '支付成功',
              content: '是否前往个人中心查看订单？',
              showCancel: true,
              confirmText: '去个人中心',
              cancelText: '继续选购',
              callback: () => {
                // 🔴 更新成功后，按原逻辑返回/跳转 my
                setTimeout(() => {
                  const pages = getCurrentPages();
                  // 如果页面栈中有上一页，则返回上一页；否则跳转到 my 页面
                  if (pages.length > 1) {
                    const pageBack = require('../../../utils/pageBack.js');
                    const prevPage = pages[pages.length - 2];
                    const refreshPrev = () => {
                      setTimeout(() => {
                        const stack = getCurrentPages();
                        const top = stack[stack.length - 1];
                        const p = top || prevPage;
                        if (p && p.route && (p.route.indexOf('products/products') >= 0 || p.route.endsWith('/profile/profile') || p.route.endsWith('/my/my'))) {
                          if (typeof p.loadMyActivitiesPromise === 'function') {
                            p.loadMyActivitiesPromise();
                          }
                        }
                      }, 300);
                    };
                    if (pageBack.isIndexRoute(prevPage && prevPage.route)) {
                      wx.reLaunch({
                        url: '/package-app/pages/products/products?hubTab=2',
                        success: refreshPrev
                      });
                    } else {
                      pageBack.popOrHub({
                        onBeforePop: () => false,
                        preferProducts: true
                      });
                      setTimeout(refreshPrev, 300);
                    }
                  } else {
                    // 如果没有上一页，跳转到 my 页面
                    wx.navigateTo({ url: '/package-app/pages/profile/profile', animationType: 'none' });
                    setTimeout(() => {
                      const pages = getCurrentPages();
                      const myPage = pages[pages.length - 1];
                      if (myPage && typeof myPage.loadMyActivitiesPromise === 'function') {
                          myPage.loadMyActivitiesPromise().then(() => {
                            console.log('[shouhou doPayment] my页面数据已刷新');
                          });
                      }
                    }, 500);
                  }
                }, 500);
              }
            });
          },
          fail: () => {
            this._showCustomToast('支付取消', 'none');
          }
        });
      },
      fail: () => {
        this.hideMyLoading();
        this._showCustomToast('支付失败', 'none');
      }
    });
  },

  _clearCartAfterPaid() {
    if (this._cartClearedAfterPay) return;
    this._cartClearedAfterPay = true;
    try {
      wx.removeStorageSync('my_cart');
    } catch (e) {}
    this.setData({
      cart: [],
      cartTotalPrice: 0,
      finalTotalPrice: 0,
      shippingFee: 0
    });
  },

  _syncRepairPartsAfterPaid(ctx) {
    const orderId = ctx && ctx.orderId;
    const repairId = ctx && ctx.repairId;
    if (!orderId || !repairId) return;
    let nick = '';
    try {
      nick = wx.getStorageSync('user_nickname') || '';
      if (!nick) {
        const ui = wx.getStorageSync('userInfo');
        if (ui && ui.nickName) nick = ui.nickName;
      }
    } catch (e) {}
    wx.cloud.callFunction({
      name: 'writeShouhouguoqi',
      data: {
        repairId,
        goodsList: (ctx && ctx.cart) || [],
        addressData: (ctx && ctx.addr) || {},
        userNickname: nick,
        orderId
      },
      fail: (err) => console.error('[shouhou] writeShouhouguoqi:', err)
    });
    try {
      wx.removeStorageSync('guided_parts_repair_id');
    } catch (e) {}
  },

  _showPaidSuccessDialog() {
    if (this._paidDialogShown) return;
    this._paidDialogShown = true;
    this.showMyDialog({
      title: '支付成功',
      content: '是否前往个人中心查看订单？',
      showCancel: true,
      confirmText: '去个人中心',
      cancelText: '继续选购',
      callback: () => {
        wx.navigateTo({ url: '/package-app/pages/profile/profile', animationType: 'none' });
      }
    });
  },

  _cancelPaymentVerification() {
    this._payVerifyToken = (this._payVerifyToken || 0) + 1;
    if (this._payVerifyDelayTimers && this._payVerifyDelayTimers.length) {
      this._payVerifyDelayTimers.forEach((tid) => clearTimeout(tid));
    }
    this._payVerifyDelayTimers = [];
  },

  startPaymentVerification(orderId, opts = {}) {
    if (!orderId || this._pageDestroyed) return;
    this._cancelPaymentVerification();
    const token = this._payVerifyToken;
    const baseOpts = {
      maxAttempts: 6,
      intervalMs: 2500,
      showLoading: true,
      silent: false,
      verifyToken: token,
      clearCartOnConfirm: !!opts.clearCartOnConfirm,
      finalizeRepairParts: !!opts.finalizeRepairParts
    };
    this.callCheckPayResult(orderId, 1, baseOpts);
    this._payVerifyDelayTimers = [
      setTimeout(() => {
        if (this._pageDestroyed || token !== this._payVerifyToken) return;
        this.callCheckPayResult(orderId, 1, {
          maxAttempts: 4,
          intervalMs: 3000,
          showLoading: false,
          silent: true,
          verifyToken: token,
          clearCartOnConfirm: baseOpts.clearCartOnConfirm,
          finalizeRepairParts: baseOpts.finalizeRepairParts
        });
      }, 12000),
      setTimeout(() => {
        if (this._pageDestroyed || token !== this._payVerifyToken) return;
        this.callCheckPayResult(orderId, 1, {
          maxAttempts: 3,
          intervalMs: 3500,
          showLoading: false,
          silent: true,
          verifyToken: token,
          clearCartOnConfirm: baseOpts.clearCartOnConfirm,
          finalizeRepairParts: baseOpts.finalizeRepairParts
        });
      }, 28000)
    ];
  },

  callCheckPayResult(orderId, attempt = 1, options = {}) {
    if (!orderId || this._pageDestroyed) return;
    if (options.verifyToken != null && options.verifyToken !== this._payVerifyToken) return;
    const maxAttempts = options.maxAttempts || 6;
    const intervalMs = options.intervalMs || 2500;
    const silent = !!options.silent;
    const showLoading = !!options.showLoading && !silent;
    if (showLoading) {
      this.showMyLoading(attempt === 1 ? '确认订单中...' : '再次确认...');
    }

    wx.cloud.callFunction({
      name: 'checkPayResult',
      data: { orderId },
      success: (res) => {
        const result = res.result || {};
        console.log('[shouhou] checkPayResult 返回:', result);
        if (result.success) {
          if (options.clearCartOnConfirm) {
            this._clearCartAfterPaid();
          }
          if (options.finalizeRepairParts && this._pendingPayCtx) {
            this._syncRepairPartsAfterPaid(this._pendingPayCtx);
            this._pendingPayCtx = null;
            this._showPaidSuccessDialog();
          }
          if (!silent) {
            this._showCustomToast('订单已确认', 'success');
          }
        } else if (attempt < maxAttempts) {
          setTimeout(() => {
            if (this._pageDestroyed) return;
            if (options.verifyToken != null && options.verifyToken !== this._payVerifyToken) return;
            this.callCheckPayResult(orderId, attempt + 1, options);
          }, intervalMs);
        } else if (!silent) {
          this._showCustomToast(
            result.msg || '支付状态待确认，请稍后查看"我的订单"',
            'none'
          );
        }
      },
      fail: (err) => {
        console.error('[shouhou] checkPayResult 调用失败:', err);
        if (attempt < maxAttempts) {
          setTimeout(() => {
            if (this._pageDestroyed) return;
            if (options.verifyToken != null && options.verifyToken !== this._payVerifyToken) return;
            this.callCheckPayResult(orderId, attempt + 1, options);
          }, intervalMs);
        } else if (!silent) {
          this._showCustomToast(
            '网络异常，请稍后在"我的订单"查看',
            'none'
          );
        }
      },
      complete: () => {
        if (showLoading) {
          this.hideMyLoading();
        }
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

  _enrichTutorialVideoRows(list) {
    return (list || []).map((item, index) => ({
      ...item,
      _listKey: item._id || `tutorial-${index}-${item.title || ''}`,
      _shellKey: item._shellKey || item._id || `tutorial-${index}-${item.title || ''}`,
      _paused: true,
      _progressPercent: 0,
      _currentText: '00:00',
      _durationText: '00:00',
      _currentTime: 0,
      _duration: 0,
      _progress: 0,
      _searchPop: !!item._searchPop,
      _popDelayMs: item._popDelayMs || 0
    }));
  },

  _isCloudFileId(u) {
    return typeof u === 'string' && u.indexOf('cloud://') === 0;
  },

  _isDirectMediaUrl(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u);
  },

  _buildShouhouMediaUrlMap(urls) {
    const list = [...new Set((urls || []).filter(Boolean))];
    const map = {};
    const cloudIds = [];
    list.forEach((u) => {
      if (this._isDirectMediaUrl(u)) {
        map[u] = u;
      } else if (this._isCloudFileId(u)) {
        cloudIds.push(u);
      } else {
        map[u] = u;
      }
    });
    if (!cloudIds.length || !wx.cloud || !wx.cloud.getTempFileURL) {
      return Promise.resolve(map);
    }
    return new Promise((resolve) => {
      wx.cloud.getTempFileURL({
        fileList: cloudIds,
        success: (urlRes) => {
          (urlRes.fileList || []).forEach((file) => {
            map[file.fileID] = file.tempFileURL || file.fileID;
          });
          cloudIds.forEach((id) => {
            if (!map[id]) map[id] = id;
          });
          resolve(map);
        },
        fail: () => {
          cloudIds.forEach((id) => {
            map[id] = id;
          });
          resolve(map);
        }
      });
    });
  },

  _resolveTutorialMediaUrl(fileId, urlMap) {
    if (!fileId) return '';
    const resolved = (urlMap && urlMap[fileId]) || fileId;
    if (this._isDirectMediaUrl(resolved)) return resolved;
    if (this._isCloudFileId(resolved)) return '';
    return resolved;
  },

  _mapTutorialRowsFromDb(data) {
    return (data || [])
      .map((item) => ({
        _id: item._id,
        title: item.title,
        time: item.time || this.formatDuration(item.duration) || '00:00',
        videoFileID: item.videoFileID || item.src || '',
        thumbFileID: item.thumbFileID || item.thumb || '',
        coverColor: item.coverColor || '#1c1c1e',
        createTime: item.createTime,
        order: item.order || 0
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  _hydrateTutorialVideosFromDb(data, modelName, requestId) {
    const rows = this._mapTutorialRowsFromDb(data);
    if (!rows.length) {
      if (this._lastVideoRequestId !== requestId || this.data.currentModelName !== modelName) return;
      this._setTutorialVideoList([]);
      console.log(`⚠️ ${modelName} 没有云端视频`);
      return;
    }
    const fileIds = [];
    rows.forEach((r) => {
      if (r.videoFileID) fileIds.push(r.videoFileID);
      if (r.thumbFileID) fileIds.push(r.thumbFileID);
    });
    return this._buildShouhouMediaUrlMap(fileIds).then((urlMap) => {
      if (this._lastVideoRequestId !== requestId || this.data.currentModelName !== modelName) {
        return;
      }
      const videoList = rows.map((r) => {
        const src = this._resolveTutorialMediaUrl(r.videoFileID, urlMap) || TEST_VIDEO_URL;
        const thumb = this._resolveTutorialMediaUrl(r.thumbFileID, urlMap);
        return {
          ...r,
          src,
          thumb
        };
      });
      this._setTutorialVideoList(videoList);
      console.log(`✅ 加载 ${modelName} 维修教程视频，共 ${videoList.length} 个`);
    });
  },

  _setTutorialVideoList(videoList) {
    const list = this._enrichTutorialVideoRows(videoList || []);
    this._tutorialSourceVideoList = list;
    const kw = String(this.data.tutorialSearchKeyword || '').trim().toLowerCase();
    if (kw) {
      this._applyTutorialSearch(kw, list);
      return;
    }
    this.setData({
      currentVideoList: list,
      tutorialInlineMountIndex: -1,
      tutorialSearchActive: false,
      tutorialSearchMatchCount: list.length,
      ...this._tutorialInlinePlayingArrays(list.length)
    });
  },

  onTutorialSearchInput(e) {
    const keyword = String((e.detail && e.detail.value) || '').trim();
    this.setData({ tutorialSearchKeyword: keyword });
    this._applyTutorialSearch(keyword.toLowerCase());
  },

  onTutorialSearchClear() {
    this.setData({ tutorialSearchKeyword: '' });
    this._applyTutorialSearch('');
  },

  /** 按标题关键字过滤；匹配项带自下而上弹出动画 */
  _applyTutorialSearch(keyword, sourceList) {
    const source = sourceList || this._tutorialSourceVideoList || this.data.currentVideoList || [];
    if (!keyword) {
      const list = source.map((item) => ({
        ...item,
        _searchPop: false,
        _popDelayMs: 0,
        _shellKey: item._listKey || item._shellKey
      }));
      this.setData({
        currentVideoList: list,
        tutorialInlineMountIndex: -1,
        tutorialSearchActive: false,
        tutorialSearchMatchCount: list.length,
        ...this._tutorialInlinePlayingArrays(list.length)
      });
      return;
    }
    const matched = source.filter(
      (item) => String(item.title || '').toLowerCase().indexOf(keyword) !== -1
    );
    const animGen = (this.data.tutorialSearchAnimGen || 0) + 1;
    const list = matched.map((item, i) => ({
      ...item,
      _searchPop: true,
      _popDelayMs: i * 55,
      _shellKey: `${item._listKey || i}-s${animGen}`
    }));
    this.setData({
      currentVideoList: list,
      tutorialInlineMountIndex: -1,
      tutorialSearchActive: true,
      tutorialSearchMatchCount: matched.length,
      tutorialSearchAnimGen: animGen,
      ...this._tutorialInlinePlayingArrays(list.length)
    });
  },

  renderVideos() {
    // 从云数据库 shouhouvideo 读取视频列表（按组同步）
    const modelName = this.data.currentModelName;
    this._tutorialVideoProgressMap = {};
    this._tutorialVideoDurationMap = {};
    this._tutorialVideoPausedMap = {};

    // 立即清空列表，避免显示旧数据
    this._tutorialSourceVideoList = [];
    this.setData({
      currentVideoList: [],
      tutorialInlineMountIndex: -1,
      tutorialSearchActive: false,
      tutorialSearchMatchCount: 0,
      ...this._tutorialInlinePlayingArrays(0)
    });

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
            this._hydrateTutorialVideosFromDb(res.data, modelName, requestId);
          } else {
            const localList = DB_VIDEOS[modelName] || [];
            this._setTutorialVideoList(localList);
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
                this._hydrateTutorialVideosFromDb(res.data, modelName, requestId);
              } else {
                this._setTutorialVideoList(DB_VIDEOS[modelName] || []);
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
              this._setTutorialVideoList(DB_VIDEOS[modelName] || []);
            });
        });
    } else {
      this._setTutorialVideoList(DB_VIDEOS[modelName] || []);
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

  _formatVideoTime(sec) {
    const total = Math.max(0, Math.floor(Number(sec) || 0));
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    const mStr = mm < 10 ? `0${mm}` : `${mm}`;
    const sStr = ss < 10 ? `0${ss}` : `${ss}`;
    return `${mStr}:${sStr}`;
  },

  _listShTutorialVideoIndexFromEvent(e) {
    const ds = e.currentTarget && e.currentTarget.dataset;
    let raw = ds && ds.index;
    if (raw === undefined || raw === null || raw === '') {
      const mk = e.mark || {};
      raw = mk.listIdx !== undefined && mk.listIdx !== '' ? mk.listIdx : mk.idx;
    }
    const n = Number(raw);
    return Number.isNaN(n) || n < 0 ? -1 : n;
  },

  /** 与 currentVideoList 等长的播放态数组（列表内嵌 video 上 cover-view 暂停热区） */
  _tutorialInlinePlayingArrays(len) {
    const n = Math.max(0, Math.floor(Number(len) || 0));
    return {
      tutorialInlinePlaying: new Array(n).fill(false),
      tutorialInlinePauseExitAnim: new Array(n).fill(false)
    };
  },

  _clearTutorialInlineExitAnimTimer(idx) {
    this._tutorialInlineExitAnimTimers = this._tutorialInlineExitAnimTimers || {};
    const t = this._tutorialInlineExitAnimTimers[idx];
    if (t) {
      clearTimeout(t);
      this._tutorialInlineExitAnimTimers[idx] = null;
    }
  },

  onTutorialCoverTap(e) {
    const idx = this._listShTutorialVideoIndexFromEvent(e);
    if (idx < 0) return;
    const item = (this.data.currentVideoList || [])[idx];
    if (!item || !item.src) {
      this._showCustomToast('视频加载中，请稍候', 'none');
      return;
    }
    const prev = Number(this.data.tutorialInlineMountIndex);
    if (prev === idx) return;
    if (prev >= 0) {
      try {
        wx.createVideoContext(`sh-tutorial-inline-${prev}`, this).pause();
      } catch (err) {}
    }
    this.setData({ tutorialInlineMountIndex: idx }, () => {
      wx.nextTick(() => {
        try {
          wx.createVideoContext(`sh-tutorial-inline-${idx}`, this).play();
        } catch (err) {}
      });
    });
  },

  onTutorialInlineLoadedMeta(e) {
    const idx = this._listShTutorialVideoIndexFromEvent(e);
    const dur = Number((e.detail && e.detail.duration) || 0) || 0;
    if (idx >= 0 && dur > 0) {
      this._tutorialVideoDurationMap = this._tutorialVideoDurationMap || {};
      this._tutorialVideoDurationMap[idx] = Math.floor(dur);
    }
  },

  onTutorialInlineTimeUpdate(e) {
    const idx = this._listShTutorialVideoIndexFromEvent(e);
    if (idx < 0) return;
    const cur = Number((e.detail && e.detail.currentTime) || 0) || 0;
    this._tutorialVideoProgressMap = this._tutorialVideoProgressMap || {};
    this._tutorialVideoProgressMap[idx] = cur;
  },

  onTutorialInlinePlay(e) {
    const idx = this._listShTutorialVideoIndexFromEvent(e);
    if (idx < 0) return;
    this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
    const n = (this.data.currentVideoList || []).length;
    const patch = {};
    for (let i = 0; i < n; i++) {
      if (i === idx) continue;
      try {
        wx.createVideoContext(`sh-tutorial-inline-${i}`, this).pause();
      } catch (err) {}
      patch[`tutorialInlinePlaying[${i}]`] = false;
      patch[`tutorialInlinePauseExitAnim[${i}]`] = false;
      this._clearTutorialInlineExitAnimTimer(i);
    }
    this._tutorialVideoPausedMap[idx] = false;
    patch[`tutorialInlinePlaying[${idx}]`] = true;
    if (Object.keys(patch).length) this.setData(patch);
  },

  onTutorialInlinePause(e) {
    const idx = this._listShTutorialVideoIndexFromEvent(e);
    this._clearTutorialInlineExitAnimTimer(idx);
    this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
    if (idx >= 0) {
      this.setData({
        [`tutorialInlinePlaying[${idx}]`]: false,
        [`tutorialInlinePauseExitAnim[${idx}]`]: false
      });
      this._tutorialVideoPausedMap[idx] = true;
    }
  },

  onTutorialInlineEnded(e) {
    const idx = this._listShTutorialVideoIndexFromEvent(e);
    this._clearTutorialInlineExitAnimTimer(idx);
    if (idx >= 0) {
      this.setData({
        [`tutorialInlinePlaying[${idx}]`]: false,
        [`tutorialInlinePauseExitAnim[${idx}]`]: false
      });
    }
    const dur = (this._tutorialVideoDurationMap && this._tutorialVideoDurationMap[idx]) || 0;
    if (idx >= 0 && dur > 0) {
      this._tutorialVideoProgressMap = this._tutorialVideoProgressMap || {};
      this._tutorialVideoProgressMap[idx] = dur;
    }
    this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
    if (idx >= 0) this._tutorialVideoPausedMap[idx] = true;
  },

  onTutorialInlineError(e) {
    console.error('教程列表视频播放失败', e.detail);
    this._showCustomToast('视频加载失败，请稍后再试', 'none');
  },

  _setTutorialVideoPlaybackRate(videoId, rate) {
    try {
      const ctx = wx.createVideoContext(videoId, this);
      if (ctx && typeof ctx.playbackRate === 'function') {
        ctx.playbackRate(rate);
      }
    } catch (e) {}
  },

  _forceCloseTutorialFullScreen() {
    if (this._tutorialFsCloseDelayTimer) {
      clearTimeout(this._tutorialFsCloseDelayTimer);
      this._tutorialFsCloseDelayTimer = null;
    }
    this._shFsSessionHadPlayback = false;
    this._shFsPortraitHoldSince = 0;
    this._stopTutorialFullscreenOrientPoll();
    if (this._tutorialFsSpeedHoldTimer) {
      clearTimeout(this._tutorialFsSpeedHoldTimer);
      this._tutorialFsSpeedHoldTimer = null;
    }
    if (this._tutorialFsSpeedHoldActive) {
      this._setTutorialVideoPlaybackRate('sh-fullscreen-tutorial-video', 1);
      this._tutorialFsSpeedHoldActive = false;
    }
    wx.setPageStyle({
      style: {
        overflow: 'auto',
        height: 'auto'
      }
    });
    this._forceShouhouPortraitExitForTutorial();
    this.setData({
      isTutorialVideoFullScreen: false,
      tutorialFullScreenVideoUrl: '',
      tutorialFullScreenIndex: -1,
      tutorialFullScreenPaused: false,
      tutorialFullScreenCurrentTime: 0,
      tutorialFullScreenCurrentText: '00:00',
      tutorialFullScreenDuration: 0,
      tutorialFullScreenDurationText: '00:00',
      tutorialFullScreenProgress: 0,
      tutorialFullScreenProgressPercent: 0,
      tutorialFullScreenInitialStyle: '',
      tutorialFullScreenTransform: '',
      tutorialFullScreenMaskClosing: false,
      tutorialFullScreenLandscapeOk: false,
      tutorialFullScreenExitPortraitHint: false,
      tutorialFullScreenRotateHintDismissed: false,
      tutorialFullScreenPortraitFallback: false,
      tutorialFullScreenGateStage: 1,
      tutorialFullScreenNativeUiReady: false,
      tutorialFullScreenNativeKey: 0,
    });
    this._clearTutorialRotateHintDismissTimer();
    this._clearTutorialGateTimers();
    this._fullScreenTutorialCurrentTime = 0;
    this._isClosingTutorialFullScreen = false;
    this._isHandlingTutorialFullScreen = false;
  },

  _clearTutorialRotateHintDismissTimer() {
    if (this._tutorialRotateHintDismissTimer) {
      clearTimeout(this._tutorialRotateHintDismissTimer);
      this._tutorialRotateHintDismissTimer = null;
    }
  },

  _stopTutorialFullscreenOrientPoll() {
    if (this._tutorialFullscreenOrientInterval) {
      clearInterval(this._tutorialFullscreenOrientInterval);
      this._tutorialFullscreenOrientInterval = null;
    }
  },

  /**
   * 门闸阶段：部分机型 onWindowResize 滞后或不触发，短周期轮询补判横竖屏（与 sync 共用一套读数逻辑）
   */
  _startTutorialFullscreenOrientPoll() {
    this._stopTutorialFullscreenOrientPoll();
    const TICK_MS = 56;
    const MAX_TICKS = Math.ceil(120000 / TICK_MS);
    let ticks = 0;
    this._tutorialFullscreenOrientInterval = setInterval(() => {
      ticks += 1;
      if (!this.data.isTutorialVideoFullScreen || this._isClosingTutorialFullScreen) {
        this._stopTutorialFullscreenOrientPoll();
        return;
      }
      if (this.data.tutorialFullScreenPortraitFallback || this.data.tutorialFullScreenLandscapeOk) {
        this._stopTutorialFullscreenOrientPoll();
        return;
      }
      if (ticks > MAX_TICKS) {
        this._stopTutorialFullscreenOrientPoll();
        return;
      }
      this._syncTutorialFullscreenOrientationFromWindow();
    }, TICK_MS);
  },

  /** 合并 window/screen 与 deviceOrientation，减轻「已横握但 window 仍为竖屏数值」的漏检 */
  _readTutorialFullscreenViewport() {
    try {
      const win =
        (wx.getWindowInfo && wx.getWindowInfo()) ||
        (wx.getSystemInfoSync && wx.getSystemInfoSync()) ||
        {};
      const sw = Number(win.screenWidth) || 0;
      const sh = Number(win.screenHeight) || 0;
      let ww = win.windowWidth != null ? Number(win.windowWidth) : 0;
      let hh = win.windowHeight != null ? Number(win.windowHeight) : 0;
      if (!(ww > 0)) ww = sw;
      if (!(hh > 0)) hh = sh;
      let deviceOrientation = String(win.deviceOrientation || '').toLowerCase();
      if (!deviceOrientation && wx.getSystemSetting && typeof wx.getSystemSetting === 'function') {
        try {
          const ss = wx.getSystemSetting();
          const o = ss && ss.deviceOrientation;
          if (o) deviceOrientation = String(o).toLowerCase();
        } catch (e1) {}
      }
      if (wx.getDeviceInfo && typeof wx.getDeviceInfo === 'function') {
        try {
          const di = wx.getDeviceInfo();
          const o = di && di.deviceOrientation;
          if (o) deviceOrientation = String(o).toLowerCase();
        } catch (e2) {}
      }
      const screenLandscape = sw > 0 && sh > 0 && sw > sh;
      const windowPortrait = ww > 0 && hh > 0 && ww <= hh;
      if (screenLandscape && windowPortrait) {
        ww = sw;
        hh = sh;
      }
      return { ww, hh, deviceOrientation, sw, sh };
    } catch (e) {
      return { ww: 0, hh: 0, deviceOrientation: '', sw: 0, sh: 0 };
    }
  },

  /** 与 azjc._forceAzjcPortraitExit 一致：退出全屏时多次尝试恢复竖屏 */
  _forceShouhouPortraitExitForTutorial() {
    if (typeof wx.setPageOrientation !== 'function') return;
    const run = () => {
      try {
        wx.setPageOrientation({ orientation: 'portrait' });
      } catch (e) {}
    };
    run();
    setTimeout(run, 40);
    setTimeout(run, 200);
    setTimeout(run, 520);
  },

  /**
   * 退出全屏时调用了 setPageOrientation('portrait')，会覆盖 json 的 pageOrientation:auto。
   * 第二次再进全屏若不恢复 auto，真机旋转时 window 尺寸不变，横屏门闸永远过不了。
   */
  _restoreShouhouPageOrientationAutoForTutorial() {
    if (typeof wx.setPageOrientation !== 'function') return;
    const run = () => {
      try {
        wx.setPageOrientation({ orientation: 'auto' });
      } catch (e) {}
    };
    run();
    setTimeout(run, 40);
    setTimeout(run, 200);
    setTimeout(run, 520);
  },

  _clearTutorialGateTimers() {
    this._stopTutorialLandscapeGatePhoneTilt();
  },

  _stopTutorialLandscapeGatePhoneTilt() {
    if (this._tutorialGateTiltTimer) {
      clearInterval(this._tutorialGateTiltTimer);
      this._tutorialGateTiltTimer = null;
    }
    if (this._tutorialGateTiltStartTimer) {
      clearTimeout(this._tutorialGateTiltStartTimer);
      this._tutorialGateTiltStartTimer = null;
    }
  },

  _startTutorialLandscapeGatePhoneTilt() {},

  _startTutorialGateStageSequence() {
    if (!this.data.isTutorialVideoFullScreen || this.data.tutorialFullScreenLandscapeOk) return;
    this._startTutorialLandscapeGatePhoneTilt();
  },

  _maybeCompleteCloseForTutorialPortraitExitHint() {
    if (!this.data.isTutorialVideoFullScreen || this._isClosingTutorialFullScreen) return false;
    if (!this.data.tutorialFullScreenExitPortraitHint) return false;
    const { ww, hh } = this._readTutorialFullscreenViewport();
    if (ww > 0 && hh > 0 && ww <= hh) {
      this._runCloseTutorialFullScreenVideoImmediate();
      return true;
    }
    return false;
  },

  _syncTutorialFullscreenOrientationFromWindow() {
    try {
      if (this.data.tutorialFullScreenExitPortraitHint) {
        this._maybeCompleteCloseForTutorialPortraitExitHint();
        return;
      }
      const { ww, hh, deviceOrientation } = this._readTutorialFullscreenViewport();
      if (ww > 0 && hh > 0) {
        let forceLandscape = false;
        if (ww <= hh && deviceOrientation && /landscape/i.test(deviceOrientation)) {
          forceLandscape = true;
        }
        this._applyTutorialFullscreenOrientation(ww, hh, { forceLandscape });
      }
    } catch (e) {}
    // 开发者工具/部分机型旋转后 getWindowInfo 仍为竖屏比例，用实际布局宽高兜底
    this._syncTutorialFullscreenOrientationFromLayoutRect();
  },

  /** 全屏容器真实渲染宽高（px），模拟器横屏时常比系统 API 更可靠 */
  _syncTutorialFullscreenOrientationFromLayoutRect(options) {
    if (!this.data.isTutorialVideoFullScreen || this._isClosingTutorialFullScreen) return;
    // 勿在「竖屏小窗」模式下短路：此时 landscapeOk 与 portraitFallback 同时为 true，需用容器 rect
    // 识别真实横屏并清掉 portraitFallback，否则 object-fit 一直为 contain 会出现左右大黑边。
    if (this.data.tutorialFullScreenLandscapeOk && !this.data.tutorialFullScreenPortraitFallback) return;
    const immediate = !!(options && options.immediate);
    const run = () => {
      if (!this.data.isTutorialVideoFullScreen || this._isClosingTutorialFullScreen) return;
      if (this.data.tutorialFullScreenLandscapeOk && !this.data.tutorialFullScreenPortraitFallback) return;
      wx.createSelectorQuery()
        .in(this)
        .select('.fullscreen-video-container')
        .boundingClientRect((rect) => {
          if (!this.data.isTutorialVideoFullScreen || this._isClosingTutorialFullScreen) return;
          if (this.data.tutorialFullScreenLandscapeOk && !this.data.tutorialFullScreenPortraitFallback) return;
          if (!rect || rect.width <= 0 || rect.height <= 0) return;
          if (rect.width > rect.height) {
            this._applyTutorialFullscreenOrientation(rect.width, rect.height);
          }
        })
        .exec();
    };
    try {
      if (immediate) {
        run();
      } else {
        wx.nextTick(run);
      }
    } catch (e2) {}
  },

  /**
   * 与 azjc._applyFullscreenOrientation 一致：用窗口宽高判断横竖屏，勿强制 page landscape。
   * options.forceLandscape：系统已报横屏但 window 宽高尚未交换时的兜底。
   */
  _applyTutorialFullscreenOrientation(w, h, options) {
    const opt = options || {};
    const ww = Number(w) || 0;
    const hh = Number(h) || 0;
    if (!this.data.isTutorialVideoFullScreen || ww <= 0 || hh <= 0) return;
    const forceLandscape = !!opt.forceLandscape;
    const isLs = forceLandscape || ww > hh;
    const wasOk = !!this.data.tutorialFullScreenLandscapeOk;

    if (isLs) {
      this._shFsPortraitHoldSince = 0;
      if (!wasOk) {
        this._stopTutorialFullscreenOrientPoll();
        const wantPlay =
          this._fsTutorialSavedWantPlay !== undefined && this._fsTutorialSavedWantPlay !== null
            ? !!this._fsTutorialSavedWantPlay
            : !!this._fullScreenTutorialPlayIntent;
        this._fsTutorialSavedWantPlay = undefined;
        this._clearTutorialRotateHintDismissTimer();
        this._clearTutorialGateTimers();
        this.setData(
          {
            tutorialFullScreenLandscapeOk: true,
            tutorialFullScreenPortraitFallback: false,
            tutorialFullScreenPaused: !wantPlay,
          },
          () => {
            this._enableTutorialFullScreenNativeUi(wantPlay);
            setTimeout(() => {
              if (!this.data.isTutorialVideoFullScreen || this._isClosingTutorialFullScreen) return;
              if (!this.data.tutorialFullScreenLandscapeOk) return;
              this._syncTutorialFullscreenOrientationFromLayoutRect({ immediate: true });
              this._syncTutorialFullscreenCloseCoverLayout();
            }, 0);
          }
        );
      } else if (this.data.tutorialFullScreenPortraitFallback) {
        this.setData({ tutorialFullScreenPortraitFallback: false });
      }
    } else if (this.data.tutorialFullScreenPortraitFallback) {
      wx.nextTick(() => this._refreshTutorialFullscreenTrackRect());
    } else {
      if (
        this.data.tutorialFullScreenLandscapeOk &&
        this._shFsSessionHadPlayback &&
        !this.data.tutorialFullScreenPaused
      ) {
        const now = Date.now();
        if (!this._shFsPortraitHoldSince) this._shFsPortraitHoldSince = now;
        if (now - this._shFsPortraitHoldSince < 2000) {
          return;
        }
      }

      const playedSeconds = Number(this._fullScreenTutorialCurrentTime || 0) || 0;
      const sessionHadPlayback = !!this._shFsSessionHadPlayback;
      const playingInLandscape =
        this.data.tutorialFullScreenLandscapeOk && !this.data.tutorialFullScreenPaused;
      const timelineLooksUsed = playedSeconds > 0.2 || !this.data.tutorialFullScreenPaused;
      const hasStartedPlayback =
        (sessionHadPlayback || playingInLandscape) && timelineLooksUsed;
      if (hasStartedPlayback) {
        if (
          this.data.tutorialFullScreenPortraitFallback &&
          this.data.tutorialFullScreenRotateHintDismissed &&
          this.data.tutorialFullScreenLandscapeOk
        ) {
          return;
        }
        this._shFsPortraitHoldSince = 0;
        this._stopTutorialFullscreenOrientPoll();
        this._clearTutorialRotateHintDismissTimer();
        this._clearTutorialGateTimers();
        const wantPlay =
          this._fsTutorialSavedWantPlay !== undefined && this._fsTutorialSavedWantPlay !== null
            ? !!this._fsTutorialSavedWantPlay
            : !!this._fullScreenTutorialPlayIntent;
        this._fsTutorialSavedWantPlay = undefined;
        this.setData(
          {
            tutorialFullScreenPortraitFallback: true,
            tutorialFullScreenLandscapeOk: true,
            tutorialFullScreenRotateHintDismissed: true,
            tutorialFullScreenPaused: !wantPlay
          },
          () => {
            this._enableTutorialFullScreenNativeUi(wantPlay);
            wx.nextTick(() => {
              this._refreshTutorialFullscreenTrackRect();
              this._syncTutorialFullscreenCloseCoverLayout();
            });
          }
        );
        return;
      }
      this._shFsPortraitHoldSince = 0;
      if (wasOk) {
        this._fsTutorialSavedWantPlay = !this.data.tutorialFullScreenPaused;
      }
      this.setData(
        {
          tutorialFullScreenLandscapeOk: false,
          tutorialFullScreenRotateHintDismissed: false,
          tutorialFullScreenGateStage: 1,
          tutorialFullScreenPaused: true,
        },
        () => {
          try {
            wx.createVideoContext('sh-fullscreen-tutorial-video', this).pause();
          } catch (e) {}
          wx.nextTick(() => this._refreshTutorialFullscreenTrackRect());
          this._startTutorialGateStageSequence();
          this._startTutorialFullscreenOrientPoll();
        }
      );
    }
  },

  /** 与 azjc._refreshAzjcFullscreenTrackRect 对齐（选择器 id 不同） */
  _refreshTutorialFullscreenTrackRect() {
    if (!this.data.isTutorialVideoFullScreen) return;
    wx.createSelectorQuery()
      .in(this)
      .select('#sh-fullscreen-tutorial-track')
      .boundingClientRect((rect) => {
        if (rect && rect.width > 0) {
          this._tutorialFsTrackRectCached = rect;
        }
      })
      .exec();
  },

  _syncTutorialFullscreenCloseCoverLayout() {
    if (
      !this.data.isTutorialVideoFullScreen ||
      !this.data.tutorialFullScreenLandscapeOk ||
      this._isClosingTutorialFullScreen
    ) {
      return;
    }
    wx.nextTick(() => {
      if (
        !this.data.isTutorialVideoFullScreen ||
        !this.data.tutorialFullScreenLandscapeOk ||
        this._isClosingTutorialFullScreen
      ) {
        return;
      }
      wx.createSelectorQuery()
        .in(this)
        .select('#sh-fullscreen-tutorial-video')
        .boundingClientRect((rect) => {
          if (!rect || rect.width <= 0 || rect.height <= 0) return;
          if (
            !this.data.isTutorialVideoFullScreen ||
            !this.data.tutorialFullScreenLandscapeOk ||
            this._isClosingTutorialFullScreen
          ) {
            return;
          }
          let topPx = 10;
          let leftPx = 10;
          try {
            let win = {};
            try {
              win = (wx.getWindowInfo && wx.getWindowInfo()) || (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {};
            } catch (e) {
              win = {};
            }
            const sa = win.safeArea || {};
            const saLeft = typeof sa.left === 'number' ? sa.left : 0;
            const saTop = typeof sa.top === 'number' ? sa.top : 0;
            let anchorTop = -1;
            if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
              const mb = wx.getMenuButtonBoundingClientRect();
              if (mb && typeof mb.top === 'number' && mb.top >= 0) anchorTop = mb.top;
            }
            if (anchorTop < 0) {
              const sb = Number(win.statusBarHeight || 0) || 0;
              anchorTop = sb > 0 ? sb + 4 : saTop + 8;
            }
            topPx = Math.max(6, Math.round(anchorTop - rect.top));
            leftPx = Math.max(6, Math.round(Math.max(saLeft, 8) + 8 - rect.left));
          } catch (e) {}
          const nextStyle = `top:${topPx}px;left:${leftPx}px;right:auto;`;
          if (this.data.tutorialFullScreenCloseCoverStyle === nextStyle) return;
          this.setData({ tutorialFullScreenCloseCoverStyle: nextStyle });
        })
        .exec();
    });
  },

  _enableTutorialFullScreenNativeUi(wantPlay) {
    const key = (Number(this.data.tutorialFullScreenNativeKey) || 0) + 1;
    const seekTime = Number(this._fullScreenTutorialCurrentTime || 0) || 0;
    const shouldPlay = typeof wantPlay === 'boolean' ? wantPlay : !!this._fullScreenTutorialPlayIntent;
    this.setData(
      {
        tutorialFullScreenNativeUiReady: true,
        tutorialFullScreenNativeKey: key,
        tutorialFullScreenPaused: !shouldPlay
      },
      () => {
        wx.nextTick(() => {
          try {
            const ctx = wx.createVideoContext('sh-fullscreen-tutorial-video', this);
            if (typeof ctx.playbackRate === 'function') ctx.playbackRate(1);
            if (seekTime > 0) ctx.seek(seekTime);
            if (shouldPlay) {
              this._shFsSessionHadPlayback = true;
              ctx.play();
            } else {
              ctx.pause();
            }
          } catch (err) {}
          wx.nextTick(() => {
            this._refreshTutorialFullscreenTrackRect();
            this._syncTutorialFullscreenCloseCoverLayout();
          });
        });
      }
    );
  },

  openTutorialFullScreenVideo(e) {
    const index = this._listShTutorialVideoIndexFromEvent(e);
    if (index < 0) return;
    const videoUrl = (this.data.currentVideoList[index] && this.data.currentVideoList[index].src) || '';
    if (!videoUrl) {
      this._showCustomToast('暂无视频', 'none');
      return;
    }

    try {
      wx.createVideoContext(`sh-tutorial-inline-${index}`, this).pause();
    } catch (err) {}
    this._clearTutorialInlineExitAnimTimer(index);
    this.setData({
      [`tutorialInlinePlaying[${index}]`]: false,
      [`tutorialInlinePauseExitAnim[${index}]`]: false
    });

    const mainCurrentTime = Number((this._tutorialVideoProgressMap && this._tutorialVideoProgressMap[index]) || 0) || 0;
    const mainPaused = !!(this._tutorialVideoPausedMap && this._tutorialVideoPausedMap[index]);

    // 上一次关闭全屏有 380ms 延迟；若在此期间点开另一个视频，必须取消旧定时器并重置标志，否则轮询/布局兜底会失效，且旧回调会把新全屏关掉
    if (this._tutorialFsCloseDelayTimer) {
      clearTimeout(this._tutorialFsCloseDelayTimer);
      this._tutorialFsCloseDelayTimer = null;
    }
    this._isClosingTutorialFullScreen = false;
    this._shFsSessionHadPlayback = false;
    this._shFsPortraitHoldSince = 0;

    this._isHandlingTutorialFullScreen = true;

    if (this._shSpeedHoldTimer) {
      clearTimeout(this._shSpeedHoldTimer);
      this._shSpeedHoldTimer = null;
    }
    if (this._shSpeedHoldActive && index !== undefined && index !== null) {
      this._setTutorialVideoPlaybackRate(`sh-tutorial-inline-${index}`, 1);
      this._shSpeedHoldActive = false;
    }
    this._shSpeedHoldIdx = undefined;

    if (this._tutorialExitPortraitAnimTimer) {
      clearTimeout(this._tutorialExitPortraitAnimTimer);
      this._tutorialExitPortraitAnimTimer = null;
    }
    this._clearTutorialRotateHintDismissTimer();
    this._clearTutorialGateTimers();

    this.setData(
      {
        isTutorialVideoFullScreen: true,
        tutorialFullScreenVideoUrl: videoUrl,
        tutorialFullScreenIndex: index,
        tutorialFullScreenPaused: true,
        tutorialFullScreenCurrentTime: mainCurrentTime,
        tutorialFullScreenCurrentText: this._formatVideoTime(mainCurrentTime),
        tutorialFullScreenDuration: 0,
        tutorialFullScreenDurationText: '00:00',
        tutorialFullScreenProgress: 0,
        tutorialFullScreenProgressPercent: 0,
        tutorialFullScreenInitialStyle: '',
        tutorialFullScreenTransform: 'active',
        tutorialFullScreenMaskClosing: false,
        tutorialFullScreenLandscapeOk: false,
        tutorialFullScreenExitPortraitHint: false,
        tutorialFullScreenRotateHintDismissed: false,
        tutorialFullScreenPortraitFallback: false,
        tutorialFullScreenGateStage: 1,
        tutorialFullScreenCloseCoverStyle: '',
        tutorialFullScreenNativeUiReady: false,
        tutorialFullScreenNativeKey: 0
      },
      () => {
        this._startTutorialGateStageSequence();
      }
    );
    this._fullScreenTutorialCurrentTime = mainCurrentTime;
    this._fullScreenTutorialPlayIntent = !mainPaused;
    this._fullScreenTutorialExitPausedFallback = mainPaused;
    this._fsTutorialSavedWantPlay = undefined;
    this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
    this._tutorialVideoPausedMap[index] = mainPaused;
    this._tutorialVideoProgressMap = this._tutorialVideoProgressMap || {};
    this._tutorialVideoProgressMap[index] = mainCurrentTime;
    wx.setPageStyle({
      style: {
        overflow: 'hidden',
        height: '100vh'
      }
    });
    this._restoreShouhouPageOrientationAutoForTutorial();
    this._shFsOrientPollAt = 0;

    wx.nextTick(() => {
      this._syncTutorialFullscreenOrientationFromWindow();
      this._startTutorialFullscreenOrientPoll();
    });
  },

  onTutorialFullScreenCoverTap() {
    this.toggleTutorialFullScreenPlay();
  },

  toggleTutorialFullScreenPlay() {
    if (!this.data.tutorialFullScreenLandscapeOk) return;
    const paused = !this.data.tutorialFullScreenPaused;
    const idx = this.data.tutorialFullScreenIndex;
    this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
    if (idx >= 0) this._tutorialVideoPausedMap[idx] = paused;
    this.setData({ tutorialFullScreenPaused: paused }, () => {
      const ctx = wx.createVideoContext('sh-fullscreen-tutorial-video', this);
      try {
        if (paused) ctx.pause();
        else ctx.play();
      } catch (err) {}
    });
  },

  closeTutorialFullScreenVideo() {
    if (this._tutorialFsSpeedHoldTimer) {
      clearTimeout(this._tutorialFsSpeedHoldTimer);
      this._tutorialFsSpeedHoldTimer = null;
    }
    if (this._tutorialFsSpeedHoldActive) {
      this._setTutorialVideoPlaybackRate('sh-fullscreen-tutorial-video', 1);
      this._tutorialFsSpeedHoldActive = false;
    }

    if (this.data.tutorialFullScreenExitPortraitHint) {
      if (this._tutorialExitPortraitAnimTimer) {
        clearTimeout(this._tutorialExitPortraitAnimTimer);
        this._tutorialExitPortraitAnimTimer = null;
      }
      this._runCloseTutorialFullScreenVideoImmediate();
      return;
    }

    if (this._isClosingTutorialFullScreen) {
      return;
    }

    if (
      this.data.tutorialFullScreenLandscapeOk &&
      !this.data.tutorialFullScreenExitPortraitHint &&
      !this.data.tutorialFullScreenPortraitFallback
    ) {
      this.setData({ tutorialFullScreenExitPortraitHint: true });
      return;
    }

    this._runCloseTutorialFullScreenVideoImmediate();
  },

  _runCloseTutorialFullScreenVideoImmediate() {
    if (this._isClosingTutorialFullScreen) return;
    this._isClosingTutorialFullScreen = true;
    this._shFsSessionHadPlayback = false;
    this._shFsPortraitHoldSince = 0;
    this._stopTutorialFullscreenOrientPoll();
    this._forceShouhouPortraitExitForTutorial();

    const pausedState = this.data.tutorialFullScreenLandscapeOk
      ? this.data.tutorialFullScreenPaused
      : !!this._fullScreenTutorialExitPausedFallback;
    this._fullScreenTutorialExitPausedFallback = undefined;
    const videoIndex = this.data.tutorialFullScreenIndex;
    const exitTime = Number(this._fullScreenTutorialCurrentTime || 0) || 0;

    this.setData({
      tutorialFullScreenExitPortraitHint: false,
      tutorialFullScreenTransform: '',
      tutorialFullScreenMaskClosing: true
    });

    try {
      const fsCtx = wx.createVideoContext('sh-fullscreen-tutorial-video', this);
      if (fsCtx) fsCtx.pause();
    } catch (e) {}

    if (videoIndex >= 0) {
      this._tutorialVideoProgressMap = this._tutorialVideoProgressMap || {};
      this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
      this._tutorialVideoProgressMap[videoIndex] = exitTime;
      this._tutorialVideoPausedMap[videoIndex] = pausedState;
    }

    this._clearTutorialRotateHintDismissTimer();
    this._clearTutorialGateTimers();

    const closeDelayMs = 380;
    this._tutorialFsCloseDelayTimer = setTimeout(() => {
      this._tutorialFsCloseDelayTimer = null;
      this.setData(
        {
          isTutorialVideoFullScreen: false,
          tutorialFullScreenVideoUrl: '',
          tutorialFullScreenIndex: -1,
          tutorialFullScreenPaused: false,
          tutorialFullScreenCurrentTime: 0,
          tutorialFullScreenCurrentText: '00:00',
          tutorialFullScreenDuration: 0,
          tutorialFullScreenDurationText: '00:00',
          tutorialFullScreenProgress: 0,
          tutorialFullScreenProgressPercent: 0,
          tutorialFullScreenInitialStyle: '',
          tutorialFullScreenMaskClosing: false,
          tutorialFullScreenLandscapeOk: false,
          tutorialFullScreenExitPortraitHint: false,
          tutorialFullScreenRotateHintDismissed: false,
          tutorialFullScreenPortraitFallback: false,
          tutorialFullScreenGateStage: 1,
          tutorialFullScreenCloseCoverStyle: '',
          tutorialFullScreenNativeUiReady: false,
          tutorialFullScreenNativeKey: 0
        },
        () => {
          wx.nextTick(() => {
            wx.setPageStyle({
              style: {
                overflow: 'auto',
                height: 'auto'
              }
            });
            if (typeof wx.setPageOrientation === 'function') {
              try {
                wx.setPageOrientation({ orientation: 'portrait' });
              } catch (e) {}
            }

            setTimeout(() => {
              this._isHandlingTutorialFullScreen = false;
              this._isClosingTutorialFullScreen = false;
              if (videoIndex >= 0) {
                wx.nextTick(() => {
                  try {
                    const ictx = wx.createVideoContext(`sh-tutorial-inline-${videoIndex}`, this);
                    if (exitTime > 0.05 && ictx && typeof ictx.seek === 'function') ictx.seek(exitTime);
                    if (ictx) ictx.pause();
                  } catch (e) {}
                });
              }
            }, 100);
          });
        }
      );
    }, closeDelayMs);
  },

  onAllowTutorialPortraitPlayback() {
    if (!this.data.isTutorialVideoFullScreen || this.data.tutorialFullScreenLandscapeOk) return;
    this._shFsSessionHadPlayback = true;
    this._stopTutorialFullscreenOrientPoll();
    this._clearTutorialRotateHintDismissTimer();
    this._clearTutorialGateTimers();
    const wantPlay =
      this._fsTutorialSavedWantPlay !== undefined && this._fsTutorialSavedWantPlay !== null
        ? !!this._fsTutorialSavedWantPlay
        : !!this._fullScreenTutorialPlayIntent;
    this._fsTutorialSavedWantPlay = undefined;
    this.setData(
      {
        tutorialFullScreenPortraitFallback: true,
        tutorialFullScreenLandscapeOk: true,
        tutorialFullScreenPaused: !wantPlay,
      },
      () => {
        this._enableTutorialFullScreenNativeUi(wantPlay);
      }
    );
  },

  onTutorialFullScreenVideoError(e) {
    console.error('[shouhou] 教程全屏视频错误', e && e.detail);
    this._showCustomToast('视频加载失败', 'none');
  },

  onTutorialFullScreenVideoTimeUpdate(e) {
    if (this._tutorialFsTrackDragging) return;
    if (this._tutorialFsSeekSettlingUntil && Date.now() < this._tutorialFsSeekSettlingUntil) return;
    const current = Number((e && e.detail && e.detail.currentTime) || 0) || 0;
    if (this.data.isTutorialVideoFullScreen) {
      if (this.data.tutorialFullScreenExitPortraitHint) {
        this._maybeCompleteCloseForTutorialPortraitExitHint();
      }
      const now = Date.now();
      let orientGap = 140;
      if (!this.data.tutorialFullScreenLandscapeOk) orientGap = 56;
      else if (this.data.tutorialFullScreenExitPortraitHint) orientGap = 72;
      if (!this._shFsOrientPollAt || now - this._shFsOrientPollAt > orientGap) {
        this._shFsOrientPollAt = now;
        this._syncTutorialFullscreenOrientationFromWindow();
      }
    }
    this._fullScreenTutorialCurrentTime = current;
    if (this.data.isTutorialVideoFullScreen && this.data.tutorialFullScreenLandscapeOk && current > 0.05) {
      this._shFsSessionHadPlayback = true;
    }
    const duration = Number(this.data.tutorialFullScreenDuration || 0) || 0;
    const progress = duration > 0 ? Math.min(1000, Math.max(0, Math.floor((current / duration) * 1000))) : 0;
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    const inTutorialLandscapeGate =
      this.data.isTutorialVideoFullScreen && !this.data.tutorialFullScreenLandscapeOk;
    if (!inTutorialLandscapeGate) {
      this.setData({
        tutorialFullScreenCurrentTime: current,
        tutorialFullScreenProgress: progress,
        tutorialFullScreenProgressPercent: percent,
        tutorialFullScreenCurrentText: this._formatVideoTime(current)
      });
    }
  },

  onTutorialFullScreenVideoLoadedMetadata(e) {
    const duration = Number((e && e.detail && e.detail.duration) || 0) || 0;
    const current = Number(this._fullScreenTutorialCurrentTime || 0) || 0;
    const progress = duration > 0 ? Math.min(1000, Math.max(0, Math.floor((current / duration) * 1000))) : 0;
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    this.setData({
      tutorialFullScreenDuration: duration,
      tutorialFullScreenDurationText: this._formatVideoTime(duration),
      tutorialFullScreenCurrentText: this._formatVideoTime(current),
      tutorialFullScreenProgress: progress,
      tutorialFullScreenProgressPercent: percent
    });
    wx.nextTick(() => {
      this._refreshTutorialFullscreenTrackRect();
      this._syncTutorialFullscreenCloseCoverLayout();
    });
  },

  onTutorialFullScreenNativePlay() {
    if (!this.data.isTutorialVideoFullScreen) return;
    this._shFsSessionHadPlayback = true;
    const idx = this.data.tutorialFullScreenIndex;
    this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
    if (idx >= 0) this._tutorialVideoPausedMap[idx] = false;
    if (this.data.tutorialFullScreenPaused) {
      this.setData({ tutorialFullScreenPaused: false });
    }
  },

  onTutorialFullScreenNativePause() {
    if (!this.data.isTutorialVideoFullScreen) return;
    const idx = this.data.tutorialFullScreenIndex;
    this._tutorialVideoPausedMap = this._tutorialVideoPausedMap || {};
    if (idx >= 0) this._tutorialVideoPausedMap[idx] = true;
    if (!this.data.tutorialFullScreenPaused) {
      this.setData({ tutorialFullScreenPaused: true });
    }
  },

  _getTutorialFsTrackRatioByTouchX(touchX) {
    const rect = this._tutorialFsTrackDrag || this._tutorialFsTrackRectCached;
    if (!rect || !rect.width || touchX === undefined || touchX === null) return null;
    const raw = (touchX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, raw));
  },

  _applyTutorialFsDragPreviewByRatio(ratio) {
    if (ratio === null || ratio === undefined) return;
    const duration = Number(this.data.tutorialFullScreenDuration || 0) || 0;
    const target = duration > 0 ? ratio * duration : 0;
    this._tutorialFsDragTargetTime = target;
    this._fullScreenTutorialCurrentTime = target;
    this.setData({
      tutorialFullScreenCurrentTime: target,
      tutorialFullScreenCurrentText: this._formatVideoTime(target),
      tutorialFullScreenProgress: Math.round(ratio * 1000),
      tutorialFullScreenProgressPercent: ratio * 100
    });
  },

  _commitTutorialFsDragSeekAndRestore() {
    const target = Number(this._tutorialFsDragTargetTime || 0) || 0;
    const shouldResume = !!this._tutorialFsWasPlayingBeforeDrag;
    this._tutorialFsWasPlayingBeforeDrag = false;
    const ctx = wx.createVideoContext('sh-fullscreen-tutorial-video', this);
    try {
      if (ctx && typeof ctx.seek === 'function') ctx.seek(target);
    } catch (err) {}
    this._fullScreenTutorialCurrentTime = target;
    this._tutorialFsSeekSettlingUntil = Date.now() + 260;
    this.setData({ tutorialFullScreenPaused: !shouldResume });
    setTimeout(() => {
      try {
        if (shouldResume) ctx.play();
        else ctx.pause();
      } catch (err) {}
    }, shouldResume ? 60 : 0);
  },

  onTutorialFullScreenTrackTouchStart(e) {
    if (!this.data.tutorialFullScreenLandscapeOk) return;
    this._tutorialFsTrackDragging = true;
    this._tutorialFsWasPlayingBeforeDrag = !this.data.tutorialFullScreenPaused;
    this._tutorialFsDragTargetTime = Number(this._fullScreenTutorialCurrentTime || 0) || 0;
    try {
      wx.createVideoContext('sh-fullscreen-tutorial-video', this).pause();
    } catch (err) {}
    this.setData({ tutorialFullScreenPaused: true });
    const gen = (this._tutorialFsTrackGen = (this._tutorialFsTrackGen || 0) + 1);
    const touch = e.touches && e.touches[0];
    const clientX = touch ? (touch.clientX != null ? touch.clientX : touch.pageX) : undefined;
    this._tutorialFsLastTouchX = clientX;
    const cached = this._tutorialFsTrackRectCached;
    if (cached && cached.width > 0) {
      this._tutorialFsTrackDrag = { left: cached.left, width: cached.width };
      if (clientX !== undefined) this._applyTutorialFsDragPreviewByRatio(this._getTutorialFsTrackRatioByTouchX(clientX));
    }
    wx.createSelectorQuery()
      .in(this)
      .select('#sh-fullscreen-tutorial-track')
      .boundingClientRect((rect) => {
        if (this._tutorialFsTrackGen !== gen) return;
        if (!rect || !rect.width) return;
        this._tutorialFsTrackRectCached = rect;
        this._tutorialFsTrackDrag = { left: rect.left, width: rect.width };
        const x = this._tutorialFsLastTouchX !== undefined ? this._tutorialFsLastTouchX : clientX;
        if (x !== undefined) this._applyTutorialFsDragPreviewByRatio(this._getTutorialFsTrackRatioByTouchX(x));
      })
      .exec();
  },

  onTutorialFullScreenTrackTouchMove(e) {
    if (!this.data.tutorialFullScreenLandscapeOk) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const clientX = touch.clientX != null ? touch.clientX : touch.pageX;
    this._tutorialFsLastTouchX = clientX;
    if (!this._tutorialFsTrackRectCached || !this._tutorialFsTrackRectCached.width) {
      wx.createSelectorQuery()
        .in(this)
        .select('#sh-fullscreen-tutorial-track')
        .boundingClientRect((rect) => {
          if (!rect || !rect.width) return;
          this._tutorialFsTrackRectCached = rect;
          this._tutorialFsTrackDrag = { left: rect.left, width: rect.width };
          this._applyTutorialFsDragPreviewByRatio(this._getTutorialFsTrackRatioByTouchX(clientX));
        })
        .exec();
      return;
    }
    this._applyTutorialFsDragPreviewByRatio(this._getTutorialFsTrackRatioByTouchX(clientX));
  },

  onTutorialFullScreenTrackTouchEnd(e) {
    if (!this.data.tutorialFullScreenLandscapeOk) return;
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (touch) {
      const clientX = touch.clientX != null ? touch.clientX : touch.pageX;
      this._tutorialFsLastTouchX = clientX;
      this._applyTutorialFsDragPreviewByRatio(this._getTutorialFsTrackRatioByTouchX(clientX));
    }
    this._tutorialFsTrackGen = (this._tutorialFsTrackGen || 0) + 1;
    this._tutorialFsTrackDrag = null;
    this._tutorialFsTrackDragging = false;
    this._commitTutorialFsDragSeekAndRestore();
  },

  onTutorialFullScreenSpeedHoldStart() {
    if (!this.data.isTutorialVideoFullScreen) return;
    if (this._tutorialFsSpeedHoldTimer) clearTimeout(this._tutorialFsSpeedHoldTimer);
    this._tutorialFsSpeedHoldTimer = setTimeout(() => {
      this._tutorialFsSpeedHoldTimer = null;
      this._setTutorialVideoPlaybackRate('sh-fullscreen-tutorial-video', 2);
      this._tutorialFsSpeedHoldActive = true;
    }, 400);
  },

  onTutorialFullScreenSpeedHoldEnd() {
    if (this._tutorialFsSpeedHoldTimer) {
      clearTimeout(this._tutorialFsSpeedHoldTimer);
      this._tutorialFsSpeedHoldTimer = null;
      return;
    }
    if (this._tutorialFsSpeedHoldActive) {
      this._setTutorialVideoPlaybackRate('sh-fullscreen-tutorial-video', 1);
      this._tutorialFsSpeedHoldActive = false;
    }
  },

  /** 列表内视频：长按约 0.4s 倍速，松手恢复 1x */
  onTutorialVideoSpeedHoldStart(e) {
    if (this.data.isAdmin) return;
    const idx = e.currentTarget.dataset.index;
    if (idx === undefined || idx === null) return;
    this._shSpeedHoldIdx = Number(idx);
    if (this._shSpeedHoldTimer) clearTimeout(this._shSpeedHoldTimer);
    this._shSpeedHoldTimer = setTimeout(() => {
      this._shSpeedHoldTimer = null;
      this._setTutorialVideoPlaybackRate(`sh-tutorial-inline-${this._shSpeedHoldIdx}`, 2);
      this._shSpeedHoldActive = true;
    }, 400);
  },

  onTutorialVideoSpeedHoldEnd() {
    if (this.data.isAdmin) return;
    if (this._shSpeedHoldTimer) {
      clearTimeout(this._shSpeedHoldTimer);
      this._shSpeedHoldTimer = null;
      this._shSpeedHoldIdx = undefined;
      return;
    }
    const idx = this._shSpeedHoldIdx;
    this._shSpeedHoldIdx = undefined;
    if (this._shSpeedHoldActive) {
      if (idx !== undefined && idx !== null) {
        this._setTutorialVideoPlaybackRate(`sh-tutorial-inline-${idx}`, 1);
      }
      this._shSpeedHoldActive = false;
    }
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
        lastSwapIndex: targetIndex, // 记录本次交换的位置
        ...this._tutorialInlinePlayingArrays(newList.length)
      });
      if (!this.data.tutorialSearchActive) {
        this._tutorialSourceVideoList = newList;
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
            this.setData({ currentVideoList: videoList, ...this._tutorialInlinePlayingArrays(videoList.length) });
            if (!this.data.tutorialSearchActive) {
              this._tutorialSourceVideoList = videoList;
            }

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
    if (this.data.isTutorialVideoFullScreen) {
      this._forceCloseTutorialFullScreen();
    }
    this.setData({
      isLocked: true,
      passInput: '',
      passError: false
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
    }, 16);
  },

  // 4. 模态框逻辑
  openModal(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      showModal: true,
      showModalClosing: false,
      modalMode: mode,
      modalInputVal: '',
      modalPriceVal: '0',
      tempVideoPath: '',
      tempVideoKnownSize: null,
      tempVideoThumb: ''
    });
  },

  closeModal() {
    this._closeWithAnimation('showModal', 'showModalClosing');
  },

  confirmModal() {
    // 🔴 防止重复点击：如果正在上传，直接返回
    if (this.data.isUploadingVideo) {
      console.log('[confirmModal] 正在上传中，忽略重复点击');
      return;
    }

    const val = (this.data.modalInputVal || '').trim();
    if (!val) {
      this._showCustomToast('请输入名称', 'none');
      return;
    }

    if (this.data.modalMode === 'part') {
      const price = Number(this.data.modalPriceVal) || 0;
      this.closeModal();
      this.addPartToCloud(val, price);
      return;
    }

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

    cosUpload
      .uploadVideoToCos(this.data.tempVideoPath, `shouhou/videos/${modelName}`, {
        knownSize: this.data.tempVideoKnownSize
      })
      .then(videoUrl => {
        if (this.data.tempVideoThumb) {
          return cosUpload
            .uploadImageToCos(this.data.tempVideoThumb, `shouhou/thumbs/${modelName}`)
            .then(thumbUrl => ({ videoUrl, thumbUrl }))
            .catch(err => {
              console.error('封面上传失败:', err);
              return { videoUrl, thumbUrl: null };
            });
        }
        return { videoUrl, thumbUrl: null };
      })
      .then(({ videoUrl, thumbUrl }) => {
        this.saveVideoToDB(val, modelName, videoUrl, thumbUrl);
      })
      .catch(err => {
        this.setData({
          showLoadingAnimation: false,
          isUploadingVideo: false
        });
        console.error('视频上传失败:', err);
        this._showCustomToast('视频上传失败', 'none');
      });
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

  // 管理员选择视频：走居中「相册/录制」弹窗，避免系统选择器压在底部且被 detail-view 挡住
  adminChooseVideo() {
    this.chooseVideo();
  },

  // 视频元数据加载完成，准备截图
  // 🔴 不再需要这些方法，因为我们直接使用 video 组件显示第一帧

  // 截取视频第一帧（管理员上传教程视频）
  captureVideoFrame() {
    console.log('🎬 开始提取教程视频封面');
    
    // 🔴 使用 video 组件自动显示第一帧作为封面
    this.setData({
      tempVideoThumb: 'AUTO_GENERATE', // 特殊标记：让 WXML 知道要自动生成封面
      extractingThumb: false
    });
    
    this.hideMyLoading();
    this._showCustomToast('视频已选择', 'success');
    console.log('✅ 已设置自动封面模式');
  },

  // ================= 故障设备选择相关 =================

  // 加载当前用户的设备列表（用于选择哪个设备故障）
  loadRepairDevices() {
    const db = wx.cloud.database();

    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result && res.result.openid;
      if (!openid) {
        console.warn('[loadRepairDevices] 未获取到 openid');
        return;
      }

      db.collection('sn').where({
        openid: openid,
        isActive: true
      }).get().then(devRes => {
        const devices = devRes.data || [];
        // 为每个设备添加 displaySn 字段（和 case 页保持一致），并计算质保是否过期
        const now = new Date();
        const devicesWithDisplaySn = devices.map(device => {
          let warrantyExpired = false;
          if (device.expiryDate) {
            const exp = new Date(device.expiryDate);
            const diff = Math.ceil((exp - now) / 86400000);
            warrantyExpired = diff <= 0;
          }
          return {
          ...device,
          displaySn: device.displaySn || ('MT' + (device.sn || '')),
            productModel: device.productModel || device.name || '未知型号',  // 🔴 确保 productModel 有值
            warrantyExpired
          };
        });

        const nextState = {
          myDevices: devicesWithDisplaySn
        };
        // 如果只有 1 个设备，自动选中
        if (devicesWithDisplaySn.length === 1) {
          nextState.selectedDeviceIndex = 0;
        }
        this.setData(nextState);
        console.log('[loadRepairDevices] 加载到设备列表:', devicesWithDisplaySn);
        // 🔴 调试：打印每个设备的 productModel
        devicesWithDisplaySn.forEach((dev, idx) => {
          console.log(`[loadRepairDevices] 设备 ${idx}:`, {
            displaySn: dev.displaySn,
            productModel: dev.productModel,
            name: dev.name
          });
        });
      }).catch(err => {
        console.error('[loadRepairDevices] 查询设备失败:', err);
      });
    }).catch(err => {
      console.error('[loadRepairDevices] 调用 login 云函数失败:', err);
    });
  },

  // 打开自定义故障设备选择器
  openDevicePicker() {
    const { myDevices, selectedDeviceIndex } = this.data;
    if (!myDevices || myDevices.length === 0) return;
    if (this._devicePickerTimer) {
      clearTimeout(this._devicePickerTimer);
      this._devicePickerTimer = null;
    }
    let tempIndex = selectedDeviceIndex;
    if (tempIndex === null || tempIndex === undefined) {
      tempIndex = 0;
    }
    this.setData({
      showDevicePicker: true,
      devicePickerActive: false,
      tempDeviceIndex: tempIndex,
      isDevicePickerClosing: false,
      deviceScrollId: `device-${tempIndex}`
    });
    // 先挂载在底部，再切换为 active，确保出现「从下往上滑」动画
    this._devicePickerTimer = setTimeout(() => {
      if (this.data.showDevicePicker) {
        this.setData({ devicePickerActive: true });
      }
      this._devicePickerTimer = null;
    }, 20);
  },

  // 关闭自定义选择器（不修改已选值）
  closeDevicePicker() {
    // 先触发下滑动画，再真正隐藏
    if (this.data.isDevicePickerClosing) return;
    if (this._devicePickerTimer) {
      clearTimeout(this._devicePickerTimer);
      this._devicePickerTimer = null;
    }
    this.setData({
      isDevicePickerClosing: true,
      devicePickerActive: false
    });
    this._devicePickerTimer = setTimeout(() => {
      this.setData({
        showDevicePicker: false,
        isDevicePickerClosing: false,
        devicePickerActive: false
      });
      this._devicePickerTimer = null;
    }, 280);
  },

  // 在选择器中临时高亮某个设备
  chooseDeviceTemp(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({
      tempDeviceIndex: index,
      deviceScrollId: `device-${index}`
    });
  },

  // 确认选择故障设备
  confirmDevicePicker() {
    const { myDevices, tempDeviceIndex } = this.data;
    if (!myDevices || myDevices.length === 0) {
      this.closeDevicePicker();
      return;
    }
    let idx = tempDeviceIndex;
    if (idx === null || idx === undefined) {
      idx = 0;
    }
    this.setData({ selectedDeviceIndex: idx });
    this.closeDevicePicker();
  },

  // 监听设备选择
  onDeviceChange(e) {
    const index = Number(e.detail.value);
    this.setData({ selectedDeviceIndex: index });
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
      currentModelName, repairDescription, videoFileName, tempVideoPath, tempImagePath,
      orderInfo, // 复用收货信息
      myDevices, selectedDeviceIndex
    } = this.data;

    console.log('[submitRepairTicket] 当前数据:', {
      currentModelName,
      repairDescription: repairDescription ? repairDescription.substring(0, 20) + '...' : '',
      tempVideoPath: tempVideoPath ? '已设置' : '未设置',
      tempImagePath: tempImagePath ? '已设置' : '未设置',
      orderInfo,
      detailAddress: this.data.detailAddress ? this.data.detailAddress.substring(0, 20) + '...' : ''
    });

    // 直接提交，不再检查（检查已在 toggleService 中完成）
    this.doSubmitRepairTicket();
  },

  // 【新增】实际提交维修工单的方法（从 submitRepairTicket 中分离出来）
  doSubmitRepairTicket() {
    const { 
      currentModelName,
      repairDescription,
      videoFileName,
      tempVideoPath,
      tempImagePath,
      orderInfo,
      myDevices,
      selectedDeviceIndex
    } = this.data;

    // 1. 校验
    if (!repairDescription || repairDescription.trim() === '') {
      console.warn('[submitRepairTicket] 校验失败：故障描述为空');
      this.showAutoToast('提示', '请填写故障描述');
      return;
    }
    if (!tempVideoPath && !tempImagePath) {
      console.warn('[submitRepairTicket] 校验失败：视频/图片均为空');
      this.showAutoToast('提示', '请上传故障视频或照片');
      return;
    }
    // 如果用户有绑定设备，则要求选择具体故障设备
    if (myDevices && myDevices.length > 0 && (selectedDeviceIndex === null || selectedDeviceIndex === undefined)) {
      this.showAutoToast('提示', '请选择故障设备');
      return;
    }
    // 🔴 修改：检查省市区和详细地址
    const { selectedProvince, selectedCity, selectedDistrict, detailAddress } = this.data;
    
    if (!orderInfo.name || !orderInfo.phone) {
      console.warn('[submitRepairTicket] 校验失败：联系信息不完整');
      this.showAutoToast('提示', '请完善联系信息');
      return;
    }
    
    if (!selectedProvince || !selectedCity) {
      this.showAutoToast('提示', '请选择省市区');
      return;
    }
    
    if (!detailAddress || !detailAddress.trim()) {
      this.showAutoToast('提示', '请填写详细地址');
      return;
    }
    
    // 手机号格式验证
    if (!/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
      this.showAutoToast('提示', '请输入正确的11位手机号');
      return;
    }
    
    // 组装完整地址
    const addressParts = [];
    if (selectedProvince) addressParts.push(selectedProvince);
    if (selectedCity) addressParts.push(selectedCity);
    if (selectedDistrict) addressParts.push(selectedDistrict);
    if (detailAddress) addressParts.push(detailAddress);
    const address = addressParts.join(' ').trim();

    console.log('[doSubmitRepairTicket] 所有校验通过，开始上传流程');
    // 显示自定义加载动画（立即显示，确保在系统提示之前）
    this.setData({ showLoadingAnimation: true });
    
    // 使用很短的延迟确保动画已经渲染，然后再开始上传（避免微信原生提示覆盖）
    // 注意：如果微信系统提示仍然出现，可能需要使用其他上传方式
    setTimeout(() => {
      const isVideo = !!tempVideoPath;
      const mediaPath = isVideo ? tempVideoPath : tempImagePath;
      const uploadTask = isVideo
        ? cosUpload.uploadVideoToCos(mediaPath, 'repair_video', {
            knownSize: this.data.tempVideoKnownSize
          })
        : cosUpload.uploadImageToCos(mediaPath, 'repair_image');
      console.log('[submitRepairTicket] 开始上传故障素材(COS)，类型:', isVideo ? 'video' : 'image', '路径:', mediaPath);
      uploadTask
        .then(async publicUrl => {
        const fileID = publicUrl;
        const mediaPayload = isVideo
          ? { videoFileID: fileID, imageFileID: '', mediaType: 'video' }
          : { videoFileID: '', imageFileID: fileID, mediaType: 'image' };
        console.log('[submitRepairTicket] 故障素材上传成功，URL:', fileID);
        
        // 3. 写入数据库
        const db = wx.cloud.database();
        // 🔴 修改：组装完整地址（省市区 + 详细地址）
        const { selectedProvince, selectedCity, selectedDistrict, detailAddress, myDevices, selectedDeviceIndex } = this.data;
        const addressParts = [];
        if (selectedProvince) addressParts.push(selectedProvince);
        if (selectedCity) addressParts.push(selectedCity);
        if (selectedDistrict) addressParts.push(selectedDistrict);
        if (detailAddress) addressParts.push(detailAddress);
        const finalAddress = addressParts.join(' ').trim();
        
        const finalContact = {
          ...orderInfo,
          address: finalAddress,
          shippingMethod: this.data.shippingMethod || 'zto' // 让维修工单也记录快递方式
        };

        // 选中的故障设备信息（如果有的话）
        let selectedDevice = null;
        if (myDevices && myDevices.length > 0 && selectedDeviceIndex !== null && selectedDeviceIndex !== undefined) {
          const idx = Number(selectedDeviceIndex);
          if (!Number.isNaN(idx) && idx >= 0 && idx < myDevices.length) {
            const dev = myDevices[idx];
            selectedDevice = {
              deviceId: dev._id,
              sn: dev.sn,
              displaySn: dev.displaySn || ('MT' + (dev.sn || '')),
              productModel: dev.productModel || currentModelName
            };
          }
        }
        // 🔴 维修单型号优先使用“用户选中的故障设备型号”，避免与当前页面型号不一致
        const repairModelName = (selectedDevice && selectedDevice.productModel) || currentModelName;
        
        console.log('[submitRepairTicket] 准备写入数据库，数据:', {
          model: repairModelName,
          description: repairDescription.trim(),
          contact: finalContact
        });
        
        // 🔴 注意：_openid 是系统自动管理的字段，不能手动设置
        // 系统会自动根据当前登录用户设置 _openid
        
        // 🔴 获取 openid：getWXContext 只能在云函数中调用，客户端必须通过云函数获取
        let userOpenid = this.data.myOpenid;
        if (!userOpenid) {
          try {
            const loginRes = await wx.cloud.callFunction({ name: 'login' });
            userOpenid = loginRes.result?.openid;
            if (userOpenid) this.setData({ myOpenid: userOpenid });
          } catch (e) {
            console.warn('[submitRepairTicket] 获取openid失败:', e);
          }
        }
        
        // 设置超时：如果查询设备超过10秒，直接跳过查询，使用默认质保信息
        const deviceQueryTimeout = setTimeout(() => {
          console.warn('[submitRepairTicket] 查询设备超时，使用默认质保信息');
          // 使用默认质保信息直接写入数据库
          db.collection('shouhou_repair').add({
            data: {
              type: 'repair',
              model: repairModelName,
              description: repairDescription.trim(),
              ...mediaPayload,
              contact: finalContact,
              device: selectedDevice || null,
              status: 'PENDING',
              warrantyExpired: false,
              expiryDate: null,
              remainingDays: 0,
              createTime: db.serverDate()
            },
            success: (addRes) => {
              console.log('[submitRepairTicket] 数据库写入成功（超时分支），_id:', addRes._id);
              this.setData({ showLoadingAnimation: false });
              this.setData({ showOrderModal: false });
              setTimeout(() => {
                this.showAutoToast('提交成功', '售后工程师将在后台查看您的视频并进行评估。');
                setTimeout(() => {
                  this.setData({ 
                    repairDescription: '', 
                    videoFileName: '', 
                    tempVideoPath: '',
                    tempVideoKnownSize: null,
                    tempImagePath: '',
                    tempVideoThumb: '',
                    orderInfo: { name: '', phone: '', address: '' },
                    detailAddress: '',
                    selectedProvince: '',
                    selectedCity: '',
                    selectedDistrict: '',
                    provinceIndex: -1,
                    cityIndex: -1,
                    districtIndex: -1,
                    cityList: [],
                    districtList: []
                  });
                }, 3000);
              }, 300);
            },
            fail: addErr => {
              this.setData({ showLoadingAnimation: false });
              console.error('[submitRepairTicket] 数据库写入失败（超时分支）:', addErr);
              if (addErr.errCode === -502005 || addErr.errMsg.includes('collection not exists')) {
                this.showAutoToast('提示', '数据库集合不存在，请联系管理员创建 shouhou_repair 集合');
              } else {
                this.showAutoToast('提交失败', addErr.errMsg || '未知错误');
              }
            }
          });
        }, 10000); // 10秒超时
        
        // 无 openid 时跳过设备查询，直接使用默认质保
        const doAddWithWarranty = (warrantyInfo) => {
          clearTimeout(deviceQueryTimeout);
          const writeTimeout = setTimeout(() => {
            this.setData({ showLoadingAnimation: false });
            this.showAutoToast('提交失败', '数据库操作超时，请检查网络后重试');
          }, 15000);
          db.collection('shouhou_repair').add({
            data: {
              type: 'repair',
              model: repairModelName,
              description: repairDescription.trim(),
              ...mediaPayload,
              contact: finalContact,
              device: selectedDevice || null,
              status: 'PENDING',
              warrantyExpired: warrantyInfo.warrantyExpired,
              expiryDate: warrantyInfo.expiryDate,
              remainingDays: warrantyInfo.remainingDays,
              createTime: db.serverDate()
            },
            success: (addRes) => {
              clearTimeout(writeTimeout);
              this.setData({ showLoadingAnimation: false, showOrderModal: false });
              setTimeout(() => {
                this.showAutoToast('提交成功', '售后工程师将在后台查看您的视频并进行评估。');
                setTimeout(() => {
                  this.setData({
                    repairDescription: '', videoFileName: '', tempVideoPath: '', tempVideoKnownSize: null, tempImagePath: '', tempVideoThumb: '',
                    orderInfo: { name: '', phone: '', address: '' }, detailAddress: '',
                    selectedProvince: '', selectedCity: '', selectedDistrict: '',
                    provinceIndex: -1, cityIndex: -1, districtIndex: -1, cityList: [], districtList: []
                  });
                }, 3000);
              }, 300);
            },
            fail: (err) => {
              clearTimeout(writeTimeout);
              this.setData({ showLoadingAnimation: false });
              if (err.errCode === -502005 || err.errMsg?.includes('collection not exists')) {
                this.showAutoToast('提示', '数据库集合不存在，请联系管理员创建 shouhou_repair 集合');
              } else {
                this.showAutoToast('提交失败', err.errMsg || '未知错误');
              }
            }
          });
        };

        if (!userOpenid) {
          doAddWithWarranty({ warrantyExpired: false, expiryDate: null, remainingDays: 0 });
          return;
        }
        
        // 查询用户设备（匹配当前型号）
        const deviceQuery = (selectedDevice && selectedDevice.sn)
          ? { openid: userOpenid, sn: selectedDevice.sn, isActive: true }
          : { openid: userOpenid, productModel: repairModelName, isActive: true };

        db.collection('sn').where(deviceQuery).get().then(deviceRes => {
          // 清除超时定时器
          clearTimeout(deviceQueryTimeout);
          
          let warrantyInfo = {
            warrantyExpired: false,
            expiryDate: null,
            remainingDays: 0
          };
          
          if (deviceRes.data.length > 0) {
            const device = deviceRes.data[0];
            if (device.expiryDate) {
              const now = new Date();
              const exp = new Date(device.expiryDate);
              const diff = Math.ceil((exp - now) / (86400000));
              warrantyInfo = {
                warrantyExpired: diff <= 0,
                expiryDate: device.expiryDate,
                remainingDays: diff > 0 ? diff : 0
              };
            }
          }
          
          // 写入数据库（添加超时处理）
          const writeTimeout = setTimeout(() => {
            console.error('[submitRepairTicket] 数据库写入超时');
            this.setData({ showLoadingAnimation: false });
            this.showAutoToast('提交失败', '数据库操作超时，请检查网络后重试');
          }, 15000); // 15秒超时
          
          db.collection('shouhou_repair').add({
            data: {
              // 不设置 _openid，系统会自动设置
              type: 'repair', // 类型标记
              model: repairModelName,
              description: repairDescription.trim(),
              ...mediaPayload,
              contact: finalContact, // 存入联系人信息（包含完整地址）
              device: selectedDevice || null,
              status: 'PENDING',  // 初始状态
              // 🔴 新增：质保信息
              warrantyExpired: warrantyInfo.warrantyExpired,
              expiryDate: warrantyInfo.expiryDate,
              remainingDays: warrantyInfo.remainingDays,
              createTime: db.serverDate()
            },
          success: (addRes) => {
            // 清除写入超时定时器
            clearTimeout(writeTimeout);
            
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
                  tempVideoKnownSize: null,
                  tempImagePath: '',
                  tempVideoThumb: '',
                  orderInfo: { name: '', phone: '', address: '' },
                  detailAddress: '',
                  // [新增] 清空省市区选择
                  selectedProvince: '',
                  selectedCity: '',
                  selectedDistrict: '',
                  provinceIndex: -1,
                  cityIndex: -1,
                  districtIndex: -1,
                  cityList: [],
                  districtList: []
                });
                // 不自动跳转到个人页，停留在当前页面（订单弹窗已经在上面关闭了）
              }, 3000);
            }, 300); // 等待订单弹窗关闭动画完成
          },
          fail: err => {
            // 清除写入超时定时器
            clearTimeout(writeTimeout);
            
            // 隐藏自定义加载动画
            this.setData({ showLoadingAnimation: false });
            console.error('[submitRepairTicket] 数据库写入失败:', err);
            
            // 如果是集合不存在错误，提示用户（使用自定义弹窗）
            if (err.errCode === -502005 || err.errMsg.includes('collection not exists')) {
              this.showAutoToast('提示', '数据库集合不存在，请联系管理员创建 shouhou_repair 集合');
            } else {
              this.showAutoToast('提交失败', err.errMsg || '未知错误');
            }
          }
          });
        }).catch(deviceErr => {
          // 清除查询超时定时器
          clearTimeout(deviceQueryTimeout);
          
          console.error('[submitRepairTicket] 查询设备失败:', deviceErr);
          // 即使查询失败，也继续提交维修单（质保信息为空）
          const writeTimeout = setTimeout(() => {
            console.error('[submitRepairTicket] 数据库写入超时（catch分支）');
            this.setData({ showLoadingAnimation: false });
            this.showAutoToast('提交失败', '数据库操作超时，请检查网络后重试');
          }, 15000); // 15秒超时
          
          db.collection('shouhou_repair').add({
            data: {
              type: 'repair',
              model: repairModelName,
              description: repairDescription.trim(),
              ...mediaPayload,
              contact: finalContact,
              status: 'PENDING',
              warrantyExpired: false,
              expiryDate: null,
              remainingDays: 0,
              createTime: db.serverDate()
            },
            success: (addRes) => {
              // 清除写入超时定时器
              clearTimeout(writeTimeout);
              
              this.setData({ showLoadingAnimation: false });
              this.setData({ showOrderModal: false });
              setTimeout(() => {
                this.showAutoToast('提交成功', '售后工程师将在后台查看您的视频并进行评估。');
                setTimeout(() => {
                  this.setData({ 
                    repairDescription: '', 
                    videoFileName: '', 
                    tempVideoPath: '',
                    tempVideoKnownSize: null,
                    tempImagePath: '',
                    tempVideoThumb: '',
                    orderInfo: { name: '', phone: '', address: '' },
                    detailAddress: '',
                    selectedProvince: '',
                    selectedCity: '',
                    selectedDistrict: '',
                    provinceIndex: -1,
                    cityIndex: -1,
                    districtIndex: -1,
                    cityList: [],
                    districtList: []
                  });
                }, 3000);
              }, 300);
            },
            fail: addErr => {
              // 清除写入超时定时器
              clearTimeout(writeTimeout);
              
              this.setData({ showLoadingAnimation: false });
              console.error('[submitRepairTicket] 数据库写入失败（catch分支）:', addErr);
              if (addErr.errCode === -502005 || addErr.errMsg.includes('collection not exists')) {
                this.showAutoToast('提示', '数据库集合不存在，请联系管理员创建 shouhou_repair 集合');
              } else {
                this.showAutoToast('提交失败', addErr.errMsg || '未知错误');
              }
            }
          });
        });
      })
      .catch(err => {
        this.setData({ showLoadingAnimation: false });
        console.error('[submitRepairTicket] 视频上传失败:', err);
        this.showAutoToast('上传失败', (err && err.message) || (err && err.errMsg) || '视频上传失败，请检查网络后重试');
      });
    });
  },

  onShow() {
    this._syncDetailSafeTop();

    // 🔴 启动定时检查 qiangli 强制封禁（合并自原 onShow，避免重复定义被覆盖）
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    if (this.data.isTutorialVideoFullScreen) {
      this._restoreShouhouPageOrientationAutoForTutorial();
      wx.nextTick(() => {
        this._syncTutorialFullscreenOrientationFromWindow();
        this._startTutorialFullscreenOrientPoll();
      });
    }

    // 兜底：若预选提示已关但定时器未清（偶尔卡住），在此清理
    if (!this.data.showPreselectTip && this._arrowBounceTimer) {
      clearInterval(this._arrowBounceTimer);
      this._arrowBounceTimer = null;
    }
    
    // 🔴 从「去购买配件」带来的 repairId：globalData + 本地存储（切 Tab / 重进小程序不丢）
    const GUIDED_KEY = 'guided_parts_repair_id';
    let rid = '';
    try {
      rid = (app && app.globalData && app.globalData.shouhouRepairId) || wx.getStorageSync(GUIDED_KEY) || '';
    } catch (e) {
      rid = (app && app.globalData && app.globalData.shouhouRepairId) || '';
    }
    if (rid) {
      rid = String(rid).trim();
      this.setData({ repairId: rid });
      if (app && app.globalData) {
        app.globalData.shouhouRepairId = null;
      }
      // 不在此处 removeStorage，支付成功后再清，避免中途丢 repairId
    }
    
    // 🔴 从「去购买配件」带 model 进入：onShow 比 onReady 更早/稳定，在此处打开对应型号卡
    if (this._openModelFromQuery) {
      const modelName = this._openModelFromQuery;
      this._openModelFromQuery = null;
      if (modelName && MODEL_TO_GROUP[modelName]) {
        this.enterModelByModelName(modelName);
      }
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
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    if (screenshotExempt.isScreenshotBanExempt(this)) {
      screenshotExempt.allowScreenCaptureIfExempt();
      return;
    }
    // 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('[shouhou] 🛡️ 硬件级防偷拍锁定')
      });
    }

    try {
      this._onCaptureScreenHandler = () => this.handleIntercept('screenshot');
      wx.onUserCaptureScreen(this._onCaptureScreenHandler);
    } catch (e) {}

    if (wx.onUserScreenRecord) {
      try {
        this._onScreenRecordHandler = () => this.handleIntercept('record');
        wx.onUserScreenRecord(this._onScreenRecordHandler);
      } catch (e) {}
    }
  },

  _teardownScreenshotProtection() {
    if (this._onCaptureScreenHandler && wx.offUserCaptureScreen) {
      try { wx.offUserCaptureScreen(this._onCaptureScreenHandler); } catch (e) {}
      this._onCaptureScreenHandler = null;
    }
    if (this._onScreenRecordHandler && wx.offUserScreenRecord) {
      try { wx.offUserScreenRecord(this._onScreenRecordHandler); } catch (e) {}
      this._onScreenRecordHandler = null;
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
      const { reverseGeocodeWithRetry } = require('../../../utils/reverseGeocode.js');
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
    if (screenshotExempt.isScreenshotBanExempt(this)) return;

    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[shouhou] 🔴 截屏/录屏检测，立即跳转');
    
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'shouhou',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        console.log('[shouhou] ✅ 设置封禁状态成功:', res);
      },
      fail: (err) => {
        console.error('[shouhou] ⚠️ 设置封禁状态失败:', err);
      }
    });

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
