const app = getApp();
const db = wx.cloud.database();
const dbPermissionHint = require('../../../utils/dbPermissionHint.js');
const { CASE_MODEL_OPTIONS } = require('../../../utils/productModels.js');

/** 案例库顶部 Tab：车型与 F 系列同级，互斥单选 */
const CASE_TAB_LIST = [
  { id: 'all', label: '全部' },
  { id: 'F1', label: 'F1' },
  { id: 'F2', label: 'F2' },
  { id: 'F3', label: 'F3' },
  { id: 'street', label: '街车' },
  { id: 'sport', label: '仿赛' },
  { id: 'scooter', label: '踏板' },
  { id: 'cruise', label: '巡航' },
  { id: 'rally', label: '拉力' },
  { id: 'touring', label: '旅行车' },
  { id: 'ebike', label: '电摩' },
  { id: 'bicycle', label: '电动自行车' }
];
const CASE_MODEL_TAB_SET = new Set(['F1', 'F2', 'F3']);
const screenshotExempt = require('../../../utils/screenshotAdminExempt.js');
const { getDisplayIdentity } = require('../../../utils/userIdentity.js');
const { notifyAdminTodo } = require('../../../utils/wecomAdminTodo.js');
const { withRepairProgressSubscribe } = require('../../../utils/subscribeMessage.js');

const {
  getGuideIntroKeys,
  markGuideIntroSeen,
  markGuidePermSkip,
  resolveGuideAutoEntry
} = require('../../../utils/usageGuideIntro.js');
const { startGuideBtnCountdown, clearGuideBtnCountdown } = require('../../../utils/guideBtnCountdown.js');

/** 案例库功能引导 */
const CASE_GUIDE_BASE_KEY = 'mt_case_first_visit_guide_done_v1';
const CASE_GUIDE_INTRO_KEYS = getGuideIntroKeys(CASE_GUIDE_BASE_KEY);

function buildCaseGuideSteps(pageData) {
  const d = pageData || {};
  const steps = [
    {
      key: 'tabs',
      anchor: '#caseGuideTabAnchor',
      scrollIntoView: '',
      title: '按分类筛选案例',
      desc: '左右滑动切换「全部、F1/F2/F3、街车、仿赛」等标签，快速找到对应产品或车型的安装案例。'
    },
    {
      key: 'search',
      anchor: '#case-search-inner',
      scrollIntoView: '',
      title: '搜索车型',
      desc: '在这里输入车型名称（如 XMAX、NMAX），即可查找相关案例。向上浏览时搜索栏会收起，向下滑动会再次出现。'
    }
  ];
  if ((d.displayList || []).length > 0) {
    steps.push({
      key: 'card',
      anchor: '#case-guide-thumb',
      resetListScroll: true,
      title: '观看案例视频',
      desc: '点击案例卡片可全屏播放，查看实车安装效果与细节展示。'
    });
  }
  if (!d.isAdmin || d.adminSubMode === 'manage') {
    steps.push({
      key: 'fab',
      anchor: '#caseGuideFabAnchor',
      scrollIntoView: '',
      title: '上传您的案例',
      desc: '点底部「+」可从相册选择或现场录制视频，填写车型信息后提交，审核通过有机会获得延保奖励。'
    });
  }
  return steps.map((step, idx, arr) => ({
    ...step,
    tag: `第 ${idx + 1} 步`,
    stepNo: idx + 1,
    total: arr.length
  }));
}

let _cosUploadMod;
function getCosUpload() {
  if (!_cosUploadMod) _cosUploadMod = require('../../../utils/cosUpload.js');
  return _cosUploadMod;
}

let _shopImagePrepareMod;
function getShopImagePrepare() {
  if (!_shopImagePrepareMod) _shopImagePrepareMod = require('../../../utils/shopImagePrepare.js');
  return _shopImagePrepareMod;
}

// 🔴 静默发送调试日志（不显示错误）
// ⚠️ 性能优化：调试日志上报在正式环境关闭，避免多余的 HTTP 请求拖慢加载
function silentAgentLog(data) {
  // 直接返回，不再发起网络请求（保留函数占位，防止调用报错）
  return;
}

// 案例库 BGM：COS 公开链（与案例视频同桶，不上传进代码包）
const CASE_BGM_COS_URL = 'https://mt-1392958388.cos.ap-guangzhou.myqcloud.com/case/bgm/case-bgm.mp3';
/** 连续 timeupdate 推进次数达到此值才认为画面真正在播，才允许启 BGM */
const CASE_BGM_STABLE_TICKS = 2;
/** 缓冲等待多久后展示 buffering UI（BGM 在 waiting 时已立即暂停） */
const CASE_FS_WAITING_UI_MS = 900;
/** 列表首屏预加载视频条数 */
const CASE_VIDEO_PRELOAD_COUNT = 5;
/** 仅当画面进度真正停住这么久，才自动重挂载（避免一卡一顿时误重挂） */
const CASE_FS_STALL_RECOVER_MS = 4500;
/** 首次打开多久仍无出画，直接强制重挂载 */
const CASE_FS_FIRST_OPEN_REMOUNT_MS = 1800;
/** 单次播放最多自动重连次数 */
const CASE_FS_STALL_RECOVER_MAX = 3;

function isCaseBgmMp3Url(url) {
  const u = String(url || '').trim().toLowerCase();
  if (!/^https?:\/\//.test(u) || /\.tcb\.qcloud\.la/.test(u)) return false;
  return /\.mp3(\?|$)/.test(u) || u.indexOf('/case/bgm/') >= 0;
}

Page({
  data: {
    statusBarHeight: 20,
    currentTab: 'all',
    showRecordStartTip: false, // 🆕 显示录制开始提示
    
    // --- 🆕 滑块动画核心数据 ---
    sliderLeft: 0,    // 滑块距离左边的距离 (px)
    sliderWidth: 0,   // 滑块的宽度 (px)
    scrollLeft: 0,    // 滚动条的位置 (用于自动居中)
    
    // --- 页面状态 ---
    showIntro: true,
    introClosing: false, // 介绍弹窗退出动画中
    introAnimIn: false,
    showLotteryPromo: false,
    lotteryPromoClosing: false,
    lotteryPromoAnimIn: false,
    showCamera: false,
    showForm: false,
    formClosing: false, // 表单弹窗退出动画中
    showSuccess: false,
    successClosing: false,
    showUploadOptions: false, // 显示上传选项弹窗（选择相册/录制）
    uploadOptionsClosing: false,
    showVideoPreview: false, // 🔴 显示视频预览弹窗
    videoPreviewClosing: false,
    showShootingGuide: false, // 显示拍摄角度演示弹窗
    shootingGuideClosing: false,
    shootingGuideMode: 'guide', // 拍摄指南弹窗模式：'guide' 编辑教学页面，'publish' 发布官方案例
    shootingGuideVideoUrl: '', // 拍摄角度演示视频URL（用于播放的临时URL）
    shootingGuideVideoFileID: '', // 拍摄角度演示视频的云存储 fileID（用于删除）
    showBindDeviceTip: false, // 显示绑定设备提示弹窗
    bindDeviceTipClosing: false,
    
    // 拍摄指南按钮状态
    guideBtnDisabled: true,
    guideBtnText: '我知道了 (3s)',
    guideTimer: null,
    showCategoryPickerModal: false,
    categoryPickerClosing: false, // 分类选择器退出动画中   
    
    // --- 播放器与管理员状态 ---
    showVideoPlayer: false, 
    currentVideo: null,     
    /** false：blocking_rules.is_active===false 时只展示截图，点击提示完善视频号 */
    caseVideoPlaybackEnabled: true,
    videoWatermarkNickname: '', // 播放器昵称水印（淡色）
    /** 全屏自定义控件（叠在 video 之上，不嵌在 video 内） */
    caseFullscreenDuration: 0,
    caseFullscreenProgressPercent: 0,
    caseFullscreenProgressRatio: 0,
    caseFullscreenCurrentStr: '00:00',
    caseFullscreenDurationStr: '00:00',
    caseFullscreenPaused: false,
    /** 播放到结尾：居中显示重播，不自动退出 */
    caseFullscreenEnded: false,
    /** 全屏视频缓冲中（播放中短暂卡顿）；此期间不播 BGM */
    caseFullscreenBuffering: false,
    /** 打开后长时间未出画：顶部 MT 加载条（非常规首屏必显） */
    caseFullscreenInitialLoading: false,
    /** 卡死后重连续播的起点（秒） */
    caseFullscreenInitialTime: 0,
    /** 强制销毁/重建原生 video（首次卡住、换线路时用） */
    caseFsVideoAlive: true,
    /** 全屏水印/进度条层 */
    caseFullscreenChromeReady: false,
    /** 全屏退场：translateY(px)，下拉跟手与动画共用 */
    caseFullscreenTy: 0,
    caseFullscreenNoTrans: true,
    /** 全屏退场动画中：顶栏保持挂载并提前露出，避免关闭后整页重绘卡顿 */
    caseFullscreenExiting: false,
    /** 退场时先隐藏 chrome 层 */
    caseFullscreenCoverHidden: false,

    // --- 🆕 搜索栏状态 ---
    showSearchBar: true, // 默认显示
    searchText: '',       
    searchTip: '',        

    // 滚动相关
    lastScrollTop: 0, // 上一次滚动的位置
    caseMainScrollTop: 0,
    caseMainScrollHeight: 0,
    caseListScrollTop: 0,
    caseGuideScrollIntoView: '',

    // --- 案例库分步功能引导 ---
    showCaseUsageGuide: false,
    showCaseGuideIntro: false,
    caseUsageGuideStep: 1,
    caseGuideStepTag: '',
    caseGuideTitle: '',
    caseGuideDesc: '',
    caseGuideBtnText: '下一步',
    caseGuideBtnLocked: true,
    caseGuideArrowDir: 'down',
    caseGuideBubbleStyle: '',
    caseGuideArrowStyle: '',
    caseGuideSpotStyle: '',

    // --- 录制状态 ---
    isRecording: false,
    recTimeStr: "00:00",
    timer: null,
    videoPath: null,
    videoKnownSize: null,
    showPrivacyTip: false, // 🆕 隐私提示显隐控制
    isStopping: false, // 🆕 防止重复点击停止按钮
    cameraAnimating: false, // 🆕 录制页面动画状态
    
    // --- 管理员上传/编辑相关 ---
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式（使用 isAdminUnlocked 的别名）
    adminSubMode: 'edit', // 管理员子模式：'edit' 视频编辑，'manage' 管理现有视频
    showAdminForm: false,
    
    // 🆕 编辑模式状态
    isEditing: false,     // 是否正在编辑现有案例
    editingId: null,      //正在编辑的ID
    
    adminVideoPath: null,
    adminThumbPath: null,
    adminVideoKnownSize: null,

    // --- 表单数据 ---
    vehicleName: '',
    categoryArray: ['街车', '仿赛', '踏板', '巡航', '拉力', '旅行车', '电摩', '电动自行车'],
    categoryValueArray: ['street', 'sport', 'scooter', 'cruise', 'rally', 'touring', 'ebike', 'bicycle'],
    categoryIndex: null, // 🔴 修复：按照 zj4 的写法，使用 null
    modelArray: CASE_MODEL_OPTIONS,
    modelIndex: null, // 🔴 修复：按照 zj4 的写法，使用 null
    isSubmitting: false,
    
    // 🔴 新增：表单错误提示相关
    showFormError: false,
    formErrorMsg: '',
    formShake: false, // 抖动动画状态
    formErrorClosing: false,
    
    // --- 列表数据 ---
    list: [],        
    displayList: [],
    caseCoverLoadedMap: {},
    adminThumbLoaded: false,
    // 🔴 拖拽排序状态（仅管理员管理模式使用）
    isDraggingCard: false,     // 是否正在拖拽卡片
    draggingCardId: null,      // 当前拖拽的卡片 _id
    draggingCardIndex: -1,     // 当前拖拽卡片在 displayList 中的索引
    
    // 🔴 长按飞起拖拽（参考 shouhou 页面配件拖拽）
    cardWidth: 0,              // 拖拽卡片的宽度（px）
    cardHeight: 0,             // 拖拽卡片的高度（px）
    cardInitX: 0,              // 拖拽卡片的初始 X 坐标（px）
    cardInitY: 0,              // 拖拽卡片的初始 Y 坐标（px）
    dragX: 0,                  // 当前拖拽卡片的 X 坐标（px，用于 fixed 定位）
    dragY: 0,                  // 当前拖拽卡片的 Y 坐标（px，用于 fixed 定位）
    touchStartX: 0,            // 触摸起始 X 坐标
    touchStartY: 0,            // 触摸起始 Y 坐标
    
    // --- 🆕 待审核列表 ---
    pendingList: [],  // 管理员待审核的用户投稿
    
    // --- 🆕 设备选择相关 ---
    myDevices: [], // 用户已绑定的设备
    selectedSnIndex: null, // 选中的设备索引
    
    // 🔴 新增：环境检测和自定义选择器
    isSimulator: false,
    useCustomPicker: false,
    showCategoryPickerModal: false,
    categoryPickerValue: [0],
    showModelPickerModal: false,
    modelPickerClosing: false,
    modelPickerValue: [0],
    showDevicePickerModal: false,
    devicePickerClosing: false,
    devicePickerValue: [0],
    tempCategoryIndex: null,
    tempModelIndex: null,
    tempDeviceIndex: null,

    // 🆕 复用 my 页同款 Loading
    showLoadingAnimation: false,
    loadingText: '请稍候...'
  },

  buildLowQualityUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const u = url.trim();
    if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) return url;
    if (/imageMogr2|imageView2/i.test(u)) return u;
    const host = (() => {
      try { return new URL(u).hostname || ''; } catch (e) { return ''; }
    })();
    const cosLike = /myqcloud\.com$|tencentcos\.cn$|file\.myqcloud\.com$/i.test(host) || /^cos\.[^.]+\.myqcloud\.com$/i.test(host);
    if (!cosLike) return u;
    // cloudbase 临时链接带签名参数，追加 imageMogr2 容易触发 403
    if (/\.tcb\.qcloud\.la$/i.test(host)) return u;
    const sep = u.indexOf('?') === -1 ? '?' : '&';
    return `${u}${sep}imageMogr2/thumbnail/960x`;
  },

  async _hydrateCloudFileUrls(list) {
    const rows = Array.isArray(list) ? list : [];
    const cloudIds = [];
    rows.forEach((item) => {
      const v = item && item.videoUrl;
      const c = item && item.coverFull;
      if (typeof v === 'string' && v.indexOf('cloud://') === 0) cloudIds.push(v);
      if (typeof c === 'string' && c.indexOf('cloud://') === 0) cloudIds.push(c);
    });
    if (!cloudIds.length || !wx.cloud || !wx.cloud.getTempFileURL) return rows;
    const uniq = Array.from(new Set(cloudIds));
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: uniq });
      const map = {};
      (res.fileList || []).forEach((f) => {
        if (f && f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL;
      });
      return rows.map((item) => {
        const next = { ...item };
        if (typeof next.videoUrl === 'string' && next.videoUrl.indexOf('cloud://') === 0) {
          const cloudId = next.videoUrl;
          if (!next.originalVideoRef) next.originalVideoRef = cloudId;
          const resolved = map[cloudId] || cloudId;
          next.videoUrl = this._swapCosHost(resolved, { forVideo: true }) || resolved;
        }
        if (typeof next.coverFull === 'string' && next.coverFull.indexOf('cloud://') === 0) {
          const resolved = map[next.coverFull] || next.coverFull;
          next.coverFull = this._swapCosHost(resolved) || resolved;
          next.coverUrl = next.coverFull;
          const thumb = this.buildLowQualityUrl(next.coverFull);
          next.coverThumb = thumb;
          next.dualCover = !!(next.coverFull && thumb && thumb !== next.coverFull);
        }
        return next;
      });
    } catch (e) {
      return rows;
    }
  },

  _swapCosHost(url, opts) {
    if (!url || typeof url !== 'string') return url;
    // forVideo 保留参数兼容调用方；视频/封面都走全球加速，避免广州地域链路上行慢导致一直缓冲
    void opts;
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return url;
    }
    const host = parsed.hostname || '';
    // 兼容历史错误链接：把云开发静态域名的 video_go 资源切到 COS 桶加速域
    if (/\.tcb\.qcloud\.la$/i.test(host)) {
      parsed.hostname = 'mt-1392958388.cos.accelerate.myqcloud.com';
      return parsed.toString();
    }
    if (/^([^.]+)\.cos\.accelerate\.myqcloud\.com$/i.test(host)) {
      return url;
    }
    const region = host.match(/^([^.]+)\.cos\.(ap-[^.]+)\.myqcloud\.com$/i);
    if (region && region[1]) {
      parsed.hostname = `${region[1]}.cos.accelerate.myqcloud.com`;
      return parsed.toString();
    }
    return url;
  },

  _buildRetryVideoUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.indexOf('cloud://') === 0) return url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) return url;
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return url;
    }
    const host = parsed.hostname || '';
    const acc = host.match(/^([^.]+)\.cos\.accelerate\.myqcloud\.com$/i);
    const region = host.match(/^([^.]+)\.cos\.(ap-[^.]+)\.myqcloud\.com$/i);
    // 卡顿重连：加速 ↔ 地域来回切，避开坏节点
    if (acc && acc[1]) {
      parsed.hostname = `${acc[1]}.cos.ap-guangzhou.myqcloud.com`;
    } else if (region && region[1]) {
      parsed.hostname = `${region[1]}.cos.accelerate.myqcloud.com`;
    }
    let swapped = parsed.toString().replace(/([?&])rt=\d+/g, '$1').replace(/[?&]$/, '');
    const joiner = swapped.indexOf('?') === -1 ? '?' : '&';
    return `${swapped}${joiner}rt=${Date.now()}`;
  },

  _isWxDevtools() {
    try {
      const info = wx.getAppBaseInfo && wx.getAppBaseInfo();
      if (info && info.platform === 'devtools') return true;
    } catch (e) {}
    try {
      const sys = wx.getSystemInfoSync();
      if (sys && sys.platform === 'devtools') return true;
    } catch (e) {}
    return false;
  },

  async _buildRetryImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.indexOf('cloud://') === 0 && wx.cloud && wx.cloud.getTempFileURL) {
      try {
        const resp = await wx.cloud.getTempFileURL({ fileList: [url] });
        const temp = resp && resp.fileList && resp.fileList[0] && resp.fileList[0].tempFileURL;
        if (temp) return temp;
      } catch (e) {}
      return url;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const swapped = this._swapCosHost(url);
      if (swapped && swapped !== url) {
        const joiner = swapped.indexOf('?') === -1 ? '?' : '&';
        return `${swapped}${joiner}rt=${Date.now()}`;
      }
      const joiner = url.indexOf('?') === -1 ? '?' : '&';
      return `${url}${joiner}rt=${Date.now()}`;
    }
    return url;
  },

  async onCaseCoverImageError(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || index < 0) return;
    this._caseImgRetryMap = this._caseImgRetryMap || {};
    if (this._caseImgRetryMap[`cover_${index}`]) return;
    this._caseImgRetryMap[`cover_${index}`] = true;
    const cur = (this.data.displayList || [])[index];
    if (!cur || !cur.coverUrl) return;
    const next = await this._buildRetryImageUrl(cur.coverFull || cur.coverUrl);
    const thumb = this.buildLowQualityUrl(next);
    this.setData({
      [`displayList[${index}].coverUrl`]: next,
      [`displayList[${index}].coverFull`]: next,
      [`displayList[${index}].coverThumb`]: thumb,
      [`displayList[${index}].dualCover`]: thumb !== next,
      [`caseCoverLoadedMap.${index}`]: false
    });
  },

  onCaseCoverHdLoad(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || index < 0) return;
    this.setData({ [`caseCoverLoadedMap.${index}`]: true });
  },

  onCaseFullscreenVideoError() {
    const cur = this.data.currentVideo;
    if (!cur || !cur.videoUrl) return;
    this._pauseCaseBgm();
    this._caseVideoRetryMap = this._caseVideoRetryMap || {};
    const key = cur._id || cur.videoUrl;
    const tries = Number(this._caseVideoRetryMap[key] || 0);
    if (tries >= 2) {
      if (!this.data.caseFullscreenInitialLoading) {
        this.setData({ caseFullscreenInitialLoading: true });
      }
      this._showCustomToast('视频加载失败，请稍后重试', 'none');
      return;
    }
    this._caseVideoRetryMap[key] = tries + 1;
    const retryUrl = this._buildRetryVideoUrl(cur.videoUrl) || cur.videoUrl;
    this._caseFsPlaybackStarted = false;
    this._remountCaseFullscreenVideo(retryUrl, Number(this._caseFsPlaybackCur) || 0);
  },

  onCaseCoverImageLoad(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || index < 0) return;
    this.setData({ [`caseCoverLoadedMap.${index}`]: true });
  },

  async onCaseAdminThumbError() {
    this._caseImgRetryMap = this._caseImgRetryMap || {};
    if (this._caseImgRetryMap.adminThumb) return;
    this._caseImgRetryMap.adminThumb = true;
    const cur = this.data.adminThumbPath;
    if (!cur) return;
    const next = await this._buildRetryImageUrl(cur);
    this.setData({ adminThumbPath: next });
  },

  onCaseAdminThumbLoad() {
    this.setData({ adminThumbLoaded: true });
  },

  onLoad() {
    const appInst = getApp();
    if (appInst && appInst.globalData && appInst.globalData.updatePageVisit) {
      appInst.globalData.updatePageVisit('case');
    }
    this.calcNavBarInfo();
    if (this.data.showIntro) {
      this._playCasePromoDialogIn('introAnimIn');
    }
    wx.nextTick(() => {
      setTimeout(() => this._initCasePageDeferred(), 0);
    });
  },

  /** 延后初始化，避免 onLoad 阻塞 navigateTo 导致超时 */
  _initCasePageDeferred() {
    if (this._pageDestroyed) return;

    this._syncCaseVideoPlaybackGate(true);

    this.ctx = wx.createCameraContext();
    this.loadShootingGuideVideo();
    this.loadCaseBgmAudio();
    if (wx.setInnerAudioOption) {
      try {
        wx.setInnerAudioOption({
          mixWithOther: true,
          obeyMuteSwitch: false,
          speakerOn: true
        });
      } catch (e) {}
    }

    if (wx.setVisualEffectOnCapture && !screenshotExempt.isScreenshotBanExempt(this)) {
      try {
        wx.setVisualEffectOnCapture({
          visualEffect: 'hidden',
          success: () => console.log('🛡️ 硬件级防偷拍锁定'),
          fail: (err) => {
            console.warn('⚠️ setVisualEffectOnCapture 失败（可能是预览模式）:', err);
          }
        });
      } catch (e) {
        console.warn('⚠️ setVisualEffectOnCapture 不支持（可能是预览模式）:', e);
      }
    } else if (!wx.setVisualEffectOnCapture) {
      console.warn('⚠️ setVisualEffectOnCapture API 不存在（可能是预览模式）');
    } else {
      screenshotExempt.allowScreenCaptureIfExempt();
    }

    if (!screenshotExempt.isScreenshotBanExempt(this)) {
    try {
      this._onCaptureScreenHandler = () => {
        console.log('🛡️ [case] 检测到截屏');
        this.handleIntercept('screenshot');
      };
      wx.onUserCaptureScreen(this._onCaptureScreenHandler);
    } catch (e) {
      console.warn('⚠️ onUserCaptureScreen 不支持（可能是预览模式）:', e);
    }

    if (wx.onUserScreenRecord) {
      try {
        this._onScreenRecordHandler = () => {
          console.log('🛡️ [case] 检测到录屏');
          this.handleIntercept('record');
        };
        wx.onUserScreenRecord(this._onScreenRecordHandler);
      } catch (e) {
        console.warn('⚠️ onUserScreenRecord 不支持（可能是预览模式）:', e);
      }
    }
    } else {
      console.warn('⚠️ onUserScreenRecord API 不存在（可能是预览模式）');
    }

    this.fetchCloudData();
    this.checkAdminPrivilege();
    this.loadUserDevices();
    this.detectEnvironment();
    this.refreshVideoWatermarkNickname();

    setTimeout(() => { this.initTabPosition(); }, 500);
    this._scheduleCaseMainScrollLayout();
  },

  /** 免单抽奖活动截止日（含当天） */
  _isLotteryPromoActive() {
    const deadline = new Date('2026-08-08T23:59:59').getTime();
    return Date.now() <= deadline;
  },

  _shouldShowLotteryPromo() {
    return this._isLotteryPromoActive();
  },

  _playCasePromoDialogIn(animKey) {
    this.setData({ [animKey]: false });
    wx.nextTick(() => {
      setTimeout(() => {
        const patch = {};
        patch[animKey] = true;
        this.setData(patch);
      }, 48);
    });
  },

  _openLotteryPromo() {
    if (!this._shouldShowLotteryPromo()) return;
    this.setData({
      showLotteryPromo: true,
      lotteryPromoClosing: false,
      lotteryPromoAnimIn: false
    });
    this._playCasePromoDialogIn('lotteryPromoAnimIn');
  },

  onReady() {
    this._scheduleCaseMainScrollLayout();
  },
  
  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    
    // 针对进入页面前就在录屏的情况，尝试抓一次
    if (wx.getScreenRecordingState) {
      try {
      wx.getScreenRecordingState({
        success: (res) => {
          if (res.state === 'on' || res.recording) {
              console.log('🛡️ [case] onShow 检测到录屏');
            if (!screenshotExempt.isScreenshotBanExempt(this)) {
              this.handleIntercept('record');
            }
          }
          },
          fail: (err) => {
            console.warn('⚠️ getScreenRecordingState 失败（可能是预览模式）:', err);
        }
      });
      } catch (e) {
        console.warn('⚠️ getScreenRecordingState 不支持（可能是预览模式）:', e);
      }
    } else {
      console.warn('⚠️ getScreenRecordingState API 不存在（可能是预览模式）');
    }

    // 刷新视频昵称水印，避免用户改昵称后仍显示旧值
    this.refreshVideoWatermarkNickname();
    if (!this.data.showVideoPlayer) {
      this._forceStopCaseBgm();
    } else {
      this._beginCaseBgmSession();
    }
    this._syncCaseMainScrollLayout();
    this._syncCaseVideoPlaybackGate(false);
  },

  /**
   * blocking_rules.is_active === false → 审核放行：案例库不播放，只显示截图
   * is_active === true → 正常播放
   */
  async _syncCaseVideoPlaybackGate(forceRefresh) {
    try {
      const appInst = getApp();
      let reviewPass = false;
      if (appInst && typeof appInst._isReviewPassMode === 'function') {
        reviewPass = !!(await appInst._isReviewPassMode(!!forceRefresh));
      }
      const enabled = !reviewPass;
      if (this.data.caseVideoPlaybackEnabled !== enabled) {
        this.setData({ caseVideoPlaybackEnabled: enabled });
      }
      if (!enabled && this.data.showVideoPlayer) {
        this.setData({
          showVideoPlayer: false,
          currentVideo: null
        });
        this._forceStopCaseBgm();
      }
    } catch (e) {
      /* ignore */
    }
  },

  refreshVideoWatermarkNickname() {
    const nickname = getDisplayIdentity({ fallback: '匿名用户', maxLen: 18 });
    if (this.data.videoWatermarkNickname !== nickname) {
      this.setData({ videoWatermarkNickname: nickname });
    }
  },

  onHide() {
    this._forceStopCaseBgm();
    this._stopCaseFsProgressUiLoop();
    if (this.data.showVideoPlayer) {
      this._stopCaseFullscreenVideoPlayback();
    }
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
  },

  // 🔴 计算导航栏信息（屏幕适配）
  calcNavBarInfo() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo(); 
    const statusBarHeight = windowInfo.statusBarHeight;
    const gap = menuButton.top - statusBarHeight;
    const navBarHeight = (gap * 2) + menuButton.height;
    this.setData({ statusBarHeight, navBarHeight }, () => {
      this.setData({ caseMainScrollTop: this._caseScrollPaddingFallback() });
      this._syncCaseMainScrollLayout();
    });
    console.log('[case.js] 屏幕适配信息:', { statusBarHeight, navBarHeight, gap, menuButtonHeight: menuButton.height });
  },

  _caseScrollPaddingFallback() {
    const sb = this.data.statusBarHeight || 0;
    const nb = this.data.navBarHeight || 44;
    const ww = wx.getWindowInfo().windowWidth || 375;
    const rpx = (n) => Math.ceil((ww / 750) * n);
    const tabH = (this.data.isAdmin && this.data.adminSubMode === 'edit') ? 0 : rpx(80);
    const searchH = (this.data.isAdmin && this.data.adminSubMode === 'edit')
      ? 0
      : (this.data.showSearchBar ? rpx(88) : 0);
    const adminH = this.data.isAdmin ? rpx(72) : 0;
    return sb + nb + adminH + tabH + searchH + 4;
  },

  /** 只量可见底边：视频编辑量管理子栏；否则量搜索框/顶栏 */
  _syncCaseMainScrollLayout() {
    wx.nextTick(() => {
      const q = this.createSelectorQuery();
      const editPending = !!(this.data.isAdmin && this.data.adminSubMode === 'edit');
      if (editPending) {
        q.select('#caseAdminSubmodeAnchor').boundingClientRect();
      } else if (this.data.showSearchBar) {
        q.select('#case-search-inner').boundingClientRect();
      } else {
        q.select('.case-top-chrome').boundingClientRect();
      }
      q.exec((res) => {
        const rect = res && res[0];
        const GAP = editPending ? 0 : 6;
        let top = rect && rect.bottom > 0
          ? Math.ceil(rect.bottom) + GAP
          : this._caseScrollPaddingFallback();
        if (!top || top < 80) top = this._caseScrollPaddingFallback();

        const wh = wx.getWindowInfo().windowHeight;
        const height = Math.max(200, Math.ceil(wh - top));
        if (top === this.data.caseMainScrollTop && height === this.data.caseMainScrollHeight) return;
        this.setData({ caseMainScrollTop: top, caseMainScrollHeight: height });
      });
    });
  },

  _clearCaseLayoutTimers() {
    if (this._caseLayoutTimers && this._caseLayoutTimers.length) {
      this._caseLayoutTimers.forEach((tid) => clearTimeout(tid));
    }
    this._caseLayoutTimers = [];
  },

  _scheduleCaseMainScrollLayout() {
    this._clearCaseLayoutTimers();
    this._syncCaseMainScrollLayout();
    this._caseLayoutTimers = [80, 280, 600].map((ms) =>
      setTimeout(() => this._syncCaseMainScrollLayout(), ms)
    );
  },

  _teardownScreenshotProtection() {
    if (this._onCaptureScreenHandler && wx.offUserCaptureScreen) {
      try {
        wx.offUserCaptureScreen(this._onCaptureScreenHandler);
      } catch (e) {}
      this._onCaptureScreenHandler = null;
    }
    if (this._onScreenRecordHandler && wx.offUserScreenRecord) {
      try {
        wx.offUserScreenRecord(this._onScreenRecordHandler);
      } catch (e) {}
      this._onScreenRecordHandler = null;
    }
  },

  // 🔴 新增：检测运行环境
  detectEnvironment() {
    const sysInfo = wx.getSystemInfoSync();
    // 模拟器通常 platform 是 'devtools'，或者可以通过其他方式判断
    const isSimulator = sysInfo.platform === 'devtools' || 
                        sysInfo.system.indexOf('devtools') !== -1 ||
                        !sysInfo.brand || // 模拟器可能没有品牌信息
                        sysInfo.model === 'devtools';
    
    // 🔴 检测预览模式（通过二维码扫描进入）
    // 预览模式通常没有完整的 API 支持，特别是截屏/录屏检测
    const isPreview = sysInfo.platform !== 'devtools' && 
                      !sysInfo.brand && 
                      !sysInfo.model;
    
    this.setData({ 
      isSimulator: isSimulator,
      useCustomPicker: isSimulator, // 模拟器使用自定义选择器
      isPreview: isPreview
    });
    
    console.log('🔵 [环境检测] 运行环境:', isSimulator ? '模拟器' : (isPreview ? '预览模式' : '真机'));
    
    if (isPreview) {
      console.warn('⚠️ [环境检测] 预览模式可能不支持截屏/录屏检测 API');
    }
  },

  onUnload() {
    this._pageDestroyed = true;
    this._clearCaseBgmStartTimers();
    this._destroyCaseBgmAudio();
    this._clearCaseLayoutTimers();
    this._teardownScreenshotProtection();
    if (this.data.timer) clearInterval(this.data.timer);
    if (this.data.guideTimer) clearInterval(this.data.guideTimer);
    if (this._caseUsageGuideStartTimer) {
      clearTimeout(this._caseUsageGuideStartTimer);
      this._caseUsageGuideStartTimer = null;
    }
    if (this._caseCardLongPressTimer) clearTimeout(this._caseCardLongPressTimer);
    if (this._caseFullscreenExitTimer) clearTimeout(this._caseFullscreenExitTimer);
    if (this._loadingHideTimer) clearTimeout(this._loadingHideTimer);
    const app = getApp();
    if (app && app.stopQiangliCheck) app.stopQiangliCheck();
  },

  // ==========================================
  // 🆕 核心：监听屏幕滚动，控制搜索框显隐
  // ==========================================
  // 🔴 新增：处理 ScrollView 的滚动，替代原来的 onPageScroll
  handleScrollViewScroll(e) {
    const currentTop = e.detail.scrollTop;
    this._caseListScrollPos = currentTop;
    
    // 1. 防止负值
    if (currentTop < 0) return;

    // 2. 只有滚动距离超过一定阈值（比如 20px）才触发，防止手指微颤导致闪烁
    const diff = currentTop - this.data.lastScrollTop;
    
    if (Math.abs(diff) < 20) return;

    if (diff > 0) {
      if (this.data.showSearchBar) {
        this.setData({ showSearchBar: false, lastScrollTop: currentTop }, () => this._syncCaseMainScrollLayout());
        return;
      }
    } else {
      if (!this.data.showSearchBar) {
        this.setData({ showSearchBar: true, lastScrollTop: currentTop }, () => this._syncCaseMainScrollLayout());
        return;
      }
    }

    this.setData({ lastScrollTop: currentTop });
  },

  // 原来的 onPageScroll 已失效（因为 disableScroll: true），保留为空函数
  onPageScroll(e) {},

  /** 小程序端单次 get 最多 20 条，分页拉全量（skip 上限 1000） */
  async _fetchCollectionAll(buildQuery, pageSize = 20) {
    const MAX_SKIP = 1000;
    const all = [];
    let skip = 0;
    while (skip <= MAX_SKIP) {
      const res = await buildQuery().skip(skip).limit(pageSize).get();
      const batch = res.data || [];
      all.push(...batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
    }
    if (skip > MAX_SKIP) {
      console.warn('[case] 分页 skip 已达上限，可能仍有未加载记录');
    }
    return all;
  },

  // ==========================================
  // 1. 拉取数据
  // ==========================================
  async fetchCloudData() {
    // 稍微延迟一下loading，防止动画冲突
    if (this.data.list.length === 0) getApp().showLoading({ title: '加载中...' });

    try {
      const rawList = await this._fetchCollectionAll(() =>
        db.collection('video_go').orderBy('createTime', 'desc')
      );
      getApp().hideLoading();
      const cloudListWithIndex = rawList.map((item, idx) => {
          const rawVideo = item.videoFileID || item.videoUrl || item.videoURL || '';
          const rawCover = item.coverFileID || item.coverUrl || item.thumbFileID || item.thumbUrl || '';
          const videoUrl = this._swapCosHost(rawVideo || '', { forVideo: true }) || rawVideo || '';
          const coverFull = this._swapCosHost(rawCover || '') || rawCover || null;
          const coverThumb = coverFull ? this.buildLowQualityUrl(coverFull) : null;
          const vehicleName = item.vehicleName || item.title || '';
          return ({
            _id: item._id,
            type: item.category || 'street',
            vehicleName: vehicleName || '无标题',
            title: vehicleName || '无标题',
            model: item.model || '未知',
            categoryName: item.categoryName || null,
            color: this.getRandomColor(),
            videoUrl: videoUrl,
            originalVideoRef: rawVideo,
            coverUrl: coverFull,
            coverFull: coverFull,
            coverThumb: coverThumb,
            dualCover: !!(coverFull && coverThumb && coverThumb !== coverFull),
          displayTime: item.createTime ? this.formatTime(item.createTime) : null,
          // 🔴 新增：用于排序的字段（没有则为 null）
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : null,
          originalIndex: idx,
          });
        });

        // 先把有 sortOrder 的按 sortOrder 排在前面，其余保持原顺序
        const withOrder = cloudListWithIndex
          .filter(i => i.sortOrder !== null)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const withoutOrder = cloudListWithIndex
          .filter(i => i.sortOrder === null)
          .sort((a, b) => a.originalIndex - b.originalIndex);
        const finalList = withOrder.concat(withoutOrder);
        const hydratedList = await this._hydrateCloudFileUrls(finalList);

        this.setData({ list: hydratedList, displayList: hydratedList, caseCoverLoadedMap: {}, adminThumbLoaded: false }, () => {
          this._syncCaseMainScrollLayout();
          this._preloadCaseVideosFromList(hydratedList);
        });
        
      // 数据回来后再次校准滑块
      setTimeout(() => this.initTabPosition(), 200);
    } catch (err) {
      getApp().hideLoading();
      console.error(err);
    }

    // 🆕 如果是管理员，同时加载待审核列表
    if (this.data.isAdmin) {
      this.fetchPendingVideos();
    }
  },
  
  // 🆕 检查管理员权限
  async checkAdminPrivilege() {
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
        screenshotExempt.markGuanliyuanCache(true);
        screenshotExempt.allowScreenCaptureIfExempt();
        this.setData({ isAuthorized: true });
      }
    } catch (err) {
      console.error('[case.js] 权限检查失败', err);
    }
  },
  
  // 🆕 切换管理员模式
  toggleAdminMode() {
    if (!this.data.isAuthorized) return;
    const newState = !this.data.isAdmin;
    
    this.setData({
      isAdmin: newState,
      adminSubMode: 'edit'
    }, () => {
      this._scheduleCaseMainScrollLayout();
    });
    this._showCustomToast(newState ? '管理模式' : '浏览模式', 'none');

    if (newState) {
      this.fetchPendingVideos();
    }
  },
  
  // 🆕 切换管理员子模式
  switchAdminSubMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ adminSubMode: mode }, () => {
      this._scheduleCaseMainScrollLayout();
    });
    if (mode === 'edit') {
      this.fetchPendingVideos();
    }
    this._showCustomToast(mode === 'edit' ? '视频编辑：下载待审用户视频' : '管理现有视频模式', 'none');
  },

  // ==========================================
  // [新增] 管理员拖拽排序官方案例（长按飞起 + 跟手移动）
  // 参考 shouhou 页面配件拖拽实现
  // ==========================================

  _clearCaseCardLongPressTimer() {
    if (this._caseCardLongPressTimer) {
      clearTimeout(this._caseCardLongPressTimer);
      this._caseCardLongPressTimer = null;
    }
  },

  /** 管理员排序：按下后延迟再进入拖拽，移动超过阈值则取消（比系统 longpress 更不敏感） */
  onCaseCardPressStart(e) {
    if (!this.data.isAdmin || this.data.isDraggingCard) return;
    this._clearCaseCardLongPressTimer();
    const t0 = e.touches && e.touches[0];
    if (!t0) return;
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const id = e.currentTarget.dataset.id;
    this._caseCardPressStartX = t0.clientX;
    this._caseCardPressStartY = t0.clientY;
    this._caseCardLongPressIndex = index;
    this._caseCardLongPressId = id;
    this._caseCardLongPressTimer = setTimeout(() => {
      this._caseCardLongPressTimer = null;
      if (!this.data.isAdmin || this.data.isDraggingCard) return;
      this._beginAdminCaseCardDrag(this._caseCardLongPressIndex, this._caseCardLongPressId);
    }, 560);
  },

  onCaseCardPressMove(e) {
    if (!this.data.isAdmin || this.data.isDraggingCard) return;
    if (!this._caseCardLongPressTimer) return;
    const t0 = e.touches && e.touches[0];
    if (!t0) return;
    const dx = Math.abs(t0.clientX - this._caseCardPressStartX);
    const dy = Math.abs(t0.clientY - this._caseCardPressStartY);
    if (dx > 16 || dy > 16) {
      this._clearCaseCardLongPressTimer();
    }
  },

  onCaseCardPressEnd() {
    this._clearCaseCardLongPressTimer();
    if (this.data.isDraggingCard && this.data.isAdmin) {
      this.onCardTouchEnd();
    }
  },

  _beginAdminCaseCardDrag(index, id) {
    if (!this.data.isAdmin) {
      return;
    }
    console.log('[case.js] 长按触发拖拽，索引:', index, 'ID:', id);

    wx.vibrateShort({ type: 'heavy' });

    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.ios-card').boundingClientRect();
    query.exec((res) => {
      if (res && res[0] && res[0][index]) {
        const rect = res[0][index];
        console.log('[case.js] 卡片位置:', rect);

        this.setData({
          isDraggingCard: true,
          draggingCardId: id,
          draggingCardIndex: index,
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

  // 长按触发拖拽（保留给可能的外部调用）
  onCardLongPress(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const id = e.currentTarget.dataset.id;
    this._beginAdminCaseCardDrag(index, id);
  },

  // 触摸移动（卡片跟手 + 智能判断上下 / 左右）
  onCardTouchMove(e) {
    if (!this.data.isDraggingCard || !this.data.isAdmin) return;
    
    const touch = e.touches[0];
    
    // 记录初始位置（如果还没记录）
    if (this.data.touchStartX === 0 && this.data.touchStartY === 0) {
      this.setData({
        touchStartX: touch.pageX,
        touchStartY: touch.pageY
      });
    }
    
    // 计算新位置（卡片中心跟随手指）
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
    
    // 检测是否需要交换位置（同时传入 X/Y，用于判断左右列）
    this.checkCardSwap(touch.clientX || touch.pageX, touch.clientY || touch.pageY);
  },

  // 检测卡片交换
  checkCardSwap(currentX, currentY) {
    const { draggingCardIndex, displayList } = this.data;
    if (!displayList || displayList.length <= 1) return;
    
    // 获取所有卡片的位置
    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.ios-card').boundingClientRect();
    query.exec((res) => {
      if (!res || !res[0]) return;
      
      const rects = res[0];

      // 当前拖拽卡片中心点 X（用 dragX + cardWidth/2，更稳定）
      const dragCenterX = this.data.dragX + this.data.cardWidth / 2;

      // 找到手指当前覆盖的卡片
      for (let i = 0; i < rects.length; i++) {
        if (i === draggingCardIndex) continue; // 跳过自己
        
        const rect = rects[i];

        // 1）先判断是否在同一列：中心点 X 距离不能太大
        const targetCenterX = rect.left + rect.width / 2;
        const sameColumnThreshold = rect.width * 0.8; // 阈值：约等于一列宽度
        const isSameColumn = Math.abs(targetCenterX - dragCenterX) < sameColumnThreshold;

        if (!isSameColumn) {
          // 不在同一列，忽略这个卡片，避免左右乱跳
          continue;
        }

        // 2）在同一列的前提下，判断手指是否在这个卡片的垂直中心区域
        if (currentY > rect.top + rect.height * 0.3 && currentY < rect.bottom - rect.height * 0.3) {
          // 交换位置（只在同一列里上下交换）
          const newList = displayList.slice();
          const [moved] = newList.splice(draggingCardIndex, 1);
          newList.splice(i, 0, moved);
          
          console.log('[case.js] 交换卡片:', draggingCardIndex, '->', i);
          
          this.setData({
            displayList: newList,
            draggingCardIndex: i
          });
          break;
        }
      }
    });
  },

  // 触摸结束
  onCardTouchEnd() {
    if (!this.data.isDraggingCard || !this.data.isAdmin) {
      return;
    }

    console.log('[case.js] 拖拽结束，保存顺序到云端');

    // 重置状态
    this.setData({
      isDraggingCard: false,
      draggingCardId: null,
      draggingCardIndex: -1,
      dragX: 0,
      dragY: 0,
      touchStartX: 0,
      touchStartY: 0
    });

    // 保存到云端
    this.saveCaseOrderToCloud();
  },

  // 把当前 displayList 的顺序保存到云端（video_go.sortOrder）
  saveCaseOrderToCloud() {
    const { displayList } = this.data;
    if (!displayList || displayList.length === 0) return;

    const tasks = displayList.map((item, index) => {
      return db.collection('video_go').doc(item._id).update({
        data: {
          sortOrder: index,
        },
      });
    });

    this._callAdminVideoGo({
      action: 'sort',
      sortList: displayList.map((item) => ({ _id: item._id }))
    })
      .then(() => {
        console.log('[case.js] ✅ 官方案例排序已保存到云端');
        this._showCustomToast('排序已保存', 'none');
      })
      .catch((err) => {
        const msg = String((err && err.message) || (err && err.errMsg) || '');
        const notDeployed = msg.indexOf('FUNCTION_NOT_FOUND') >= 0
          || msg.indexOf('FunctionName') >= 0
          || msg.indexOf('-501000') >= 0;
        if (!notDeployed) {
          console.error('[case.js] ❌ 保存排序失败:', err);
          if (dbPermissionHint.isPermissionDenied(err)) {
            dbPermissionHint.toastPermissionDenied('video_go');
            return;
          }
          this._showCustomToast(msg || '排序保存失败', 'error');
          return;
        }
        // 云函数未部署时，尝试客户端直写（需集合写权限）
        Promise.all(tasks)
          .then(() => {
            console.log('[case.js] ✅ 官方案例排序已保存到云端');
            this._showCustomToast('排序已保存', 'none');
          })
          .catch((dbErr) => {
            console.error('[case.js] ❌ 保存排序失败:', dbErr);
            if (dbPermissionHint.isPermissionDenied(dbErr)) {
              dbPermissionHint.toastPermissionDenied('video_go');
              return;
            }
            this._showCustomToast('排序保存失败', 'error');
          });
      });
  },

  _callAdminVideoGo(payload) {
    return wx.cloud.callFunction({
      name: 'adminUpdateVideoGo',
      data: payload
    }).then((res) => {
      const result = (res && res.result) || {};
      if (!result.success) {
        const err = new Error(result.errMsg || '保存失败');
        throw err;
      }
      return result;
    });
  },

  _handleAdminVideoGoError(err, logPrefix) {
    if (logPrefix) console.error(logPrefix, err);
    getApp().hideLoading();
    this.setData({ isSubmitting: false });
    const msg = String((err && err.errMsg) || (err && err.message) || err || '');
    if (msg.indexOf('FUNCTION_NOT_FOUND') >= 0 || msg.indexOf('FunctionName') >= 0 || msg.indexOf('-501000') >= 0) {
      wx.showModal({
        title: '需要部署云函数',
        content: '请在微信开发者工具中右键 cloudfunctions/adminUpdateVideoGo → 上传并部署：云端安装依赖，然后再保存案例。',
        showCancel: false
      });
      return;
    }
    if (dbPermissionHint.isPermissionDenied(err)) {
      dbPermissionHint.toastPermissionDenied('video_go');
      return;
    }
    this._showCustomToast(msg || '保存失败', 'none');
  },

  // ==========================================
  // [新增] 管理员审核逻辑模块
  // ==========================================

  // 1. 加载用户可用设备（按 sn 去重 + MT 前缀防重复）
  loadUserDevices() {
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      db.collection('sn').where({
        openid: openid,
        isActive: true // 必须是已激活的
      }).get().then(devRes => {
        const raw = Array.isArray(devRes.data) ? devRes.data : [];
        const seen = new Set();
        const devices = [];
        raw.forEach(device => {
          const sn = String(device && device.sn || '').trim();
          if (!sn || seen.has(sn)) return;
          seen.add(sn);
          const upper = sn.toUpperCase();
          const displaySn = upper.startsWith('MT') ? sn : ('MT' + sn);
          devices.push({ ...device, displaySn });
        });

        const patch = { myDevices: devices };
        // 只有 1 个设备时自动选中；否则保持当前选择或重置
        if (devices.length === 1) {
          patch.selectedSnIndex = 0;
        } else if (
          this.data.selectedSnIndex !== null &&
          this.data.selectedSnIndex !== undefined &&
          !devices[this.data.selectedSnIndex]
        ) {
          patch.selectedSnIndex = null;
        }
        this.setData(patch);
      });
    });
  },

  // 2. 监听设备选择
  bindSnChange(e) {
    this.setData({ selectedSnIndex: e.detail.value });
  },

  // [修改] 获取待审核视频 (修复时间显示问题)
  async fetchPendingVideos() {
    try {
      const rawList = await this._fetchCollectionAll(() =>
        db.collection('video').where({ status: 0 }).orderBy('createTime', 'desc')
      );
      const formattedList = rawList.map(item => ({
        ...item,
        displayTime: this.formatTime(item.createTime)
      }));
      const listWithStats = await this.enrichPendingStats(formattedList);
      this.convertVideoUrls(listWithStats);
    } catch (err) {
      console.error('[case] fetchPendingVideos failed:', err);
    }
  },
  
  // 🆕 为待审核列表补充统计信息：同 SN 的通过次数/拒绝次数/总投稿次数
  // 返回 Promise<list>
  enrichPendingStats(list) {
    if (!list || list.length === 0) return Promise.resolve(list);

    // 🔴 分别处理有 sn 和没有 sn 的记录
    const itemsWithSn = list.filter(i => i.sn);
    const itemsWithoutSn = list.filter(i => !i.sn);

    const tasks = [];

    // 1. 按 SN 统计（有 sn 的记录）
    const sns = Array.from(new Set(itemsWithSn.map(i => i.sn)));
    sns.forEach(sn => {
      tasks.push(
        Promise.all([
          db.collection('video').where({ sn, status: 1 }).count(),
          db.collection('video').where({ sn, status: -1 }).count(),
          db.collection('video').where({ sn }).count(),
        ]).then(([passRes, rejectRes, totalRes]) => {
          return {
            key: sn,
            keyType: 'sn',
            passCount: passRes.total || 0,
            rejectCount: rejectRes.total || 0,
            totalCount: totalRes.total || 0,
          };
        }).catch(err => {
          console.error('❌ [enrichPendingStats] 统计失败 sn=', sn, err);
          return { key: sn, keyType: 'sn', passCount: 0, rejectCount: 0, totalCount: 0 };
        })
      );
    });

    // 2. 按 openid 统计（没有 sn 的记录，统计该用户所有投稿）
    const openids = Array.from(new Set(itemsWithoutSn.map(i => i.openid || i._openid).filter(Boolean)));
    openids.forEach(openid => {
      tasks.push(
        Promise.all([
          db.collection('video').where({ _openid: openid, status: 1 }).count(),
          db.collection('video').where({ _openid: openid, status: -1 }).count(),
          db.collection('video').where({ _openid: openid }).count(),
        ]).then(([passRes, rejectRes, totalRes]) => {
          return {
            key: openid,
            keyType: 'openid',
            passCount: passRes.total || 0,
            rejectCount: rejectRes.total || 0,
            totalCount: totalRes.total || 0,
          };
        }).catch(err => {
          console.error('❌ [enrichPendingStats] 统计失败 openid=', openid, err);
          return { key: openid, keyType: 'openid', passCount: 0, rejectCount: 0, totalCount: 0 };
        })
      );
    });

    if (tasks.length === 0) {
      // 如果没有需要统计的，直接返回，但确保所有记录都有默认值
      return Promise.resolve(list.map(item => ({
        ...item,
        passCount: item.passCount || 0,
        rejectCount: item.rejectCount || 0,
        totalCount: item.totalCount || 0,
      })));
    }

    return Promise.all(tasks).then(statArr => {
      const snStatMap = {};
      const openidStatMap = {};
      
      statArr.forEach(s => {
        if (s.keyType === 'sn') {
          snStatMap[s.key] = s;
        } else {
          openidStatMap[s.key] = s;
        }
      });

      return list.map(item => {
        let s = null;
        if (item.sn) {
          s = snStatMap[item.sn];
        } else {
          const openid = item.openid || item._openid;
          if (openid) {
            s = openidStatMap[openid];
          }
        }
        
        if (!s) {
          // 🔴 如果没有找到统计信息，返回默认值
          return {
            ...item,
            passCount: item.passCount || 0,
            rejectCount: item.rejectCount || 0,
            totalCount: item.totalCount || 0,
          };
        }
        
        return {
          ...item,
          passCount: s.passCount,
          rejectCount: s.rejectCount,
          totalCount: s.totalCount,
        };
      });
    });
  },

  // 🔴 新增：转换云存储路径为临时 URL
  convertVideoUrls(list) {
    const fileIDs = list.map(item => item.videoFileID).filter(id => id && id.startsWith('cloud://'));
    
    if (fileIDs.length === 0) {
      // 如果没有云存储路径，直接使用原数据
      this.setData({ pendingList: list }, () => {
        this._scheduleCaseMainScrollLayout();
      });
      return;
    }
    
    // 批量获取临时 URL
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: async (res) => {
        // 创建 fileID 到 tempURL 的映射
        const urlMap = {};
        res.fileList.forEach(file => {
          urlMap[file.fileID] = file.tempFileURL;
        });
        
        // 更新列表中的视频路径（保留原始 fileID 用于下载）
        const updatedList = list.map(item => {
          if (item.videoFileID && item.videoFileID.startsWith('cloud://')) {
            return {
              ...item,
              videoFileID: urlMap[item.videoFileID] || item.videoFileID, // 用于显示/播放的临时 URL
              originalFileID: item.videoFileID // 🔴 保留原始云存储路径用于下载
            };
          }
          return item;
        });
        
        this.setData({ pendingList: updatedList }, () => {
          this._scheduleCaseMainScrollLayout();
        });
        console.log('🔵 [视频] 已转换视频路径:', updatedList);
      },
      fail: err => {
        console.error('❌ [视频] 转换视频路径失败:', err);
        // 转换失败时使用原数据
        this.setData({ pendingList: list }, () => {
          this._scheduleCaseMainScrollLayout();
        });
      }
    });
  },

  // [新增] 简易时间格式化工具
  formatTime(dateInput) {
    if (!dateInput) return '刚刚';
    const date = new Date(dateInput);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${m}-${d} ${h}:${min}`;
  },

  // 2. 审核通过：调用云函数处理（包含自动延保）
  approvePending(e) {
    const item = e.currentTarget.dataset.item;
    
    this._showCustomModal({
      title: '确认通过',
      content: '该视频将发布到公开案例列表，并自动赠送30天延保',
      success: (res) => {
        if (res.confirm) {
          getApp().showLoading({ title: '处理中...' });
          
          // 调用云函数处理审核和延保
          wx.cloud.callFunction({
            name: 'adminAuditVideo',
            data: {
              item: item,
              action: 'approve'
            }
          }).then(result => {
            this.hideMyLoading();
            if (result.result.success) {
              this._showCustomToast(result.result.msg || '已发布', 'success');
              
              // 刷新两个列表
              this.fetchPendingVideos(); 
              this.fetchCloudData();
            } else {
              this._showCustomToast(result.result.errMsg || '操作失败', 'none');
            }
          }).catch(err => {
            getApp().hideLoading();
            console.error('审核失败:', err);
            this._showCustomToast('操作失败', 'none');
          });
        }
      }
    });
  },

  // 3. 审核拒绝：调用云函数处理（需要填写拒绝理由）
  rejectPending(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.pendingList.find(i => i._id === id);
    if (!item) return;
    
    // 使用输入框让管理员填写拒绝理由
    this._showCustomModal({
      title: '拒绝理由',
      editable: true,
      placeholderText: '请输入拒绝理由（必填）',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          const rejectReason = res.content.trim();
          if (!rejectReason) {
            this._showCustomToast('请填写拒绝理由', 'none');
            return;
          }
          
          getApp().showLoading({ title: '处理中...' });
          
          // 调用云函数处理，传递拒绝理由
          wx.cloud.callFunction({
            name: 'adminAuditVideo',
            data: {
              item: item,
              action: 'reject',
              rejectReason: rejectReason // 传递拒绝理由
            }
          }).then(result => {
            getApp().hideLoading();
            if (result.result.success) {
              this._showCustomToast(result.result.msg || '已驳回', 'none');
              this.fetchPendingVideos(); // 刷新列表
            } else {
              this._showCustomToast(result.result.errMsg || '操作失败', 'none');
            }
          }).catch(err => {
            getApp().hideLoading();
            console.error('拒绝失败:', err);
            this._showCustomToast('操作失败', 'none');
          });
        }
      }
    });
  },

  // [新增] 标记为已采纳 (告诉用户视频通过了，可以领奖励了)
  markAsProcessed(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.pendingList.find(i => i._id === id);
    if (!item) return;
    
    this._showCustomModal({
      title: '确认采纳',
      content: '将通知用户审核通过并发放奖励，但不会直接发布此视频（需您手动打码后上传）。',
      success: (res) => {
        if (res.confirm) {
          getApp().showLoading({ title: '处理中...' });
          // 调用云函数，只改状态，不搬运数据
          // 必须是 item: { _id: ..., sn: ... } 这种结构，因为云函数里需要 item._id 和 item.sn
          wx.cloud.callFunction({
            name: 'adminAuditVideo',
            data: { 
              item: {
                _id: item._id,
                sn: item.sn // 为了能发奖励，必须传 sn
              },
              action: 'mark_pass'
            },
            success: (result) => {
              getApp().hideLoading();
              if (result.result && result.result.success) {
                this._showCustomToast(result.result.msg || '已标记', 'success');
                this.fetchPendingVideos(); // 刷新列表
              } else {
                // 如果失败，把错误弹出来看
                this._showCustomModal({ 
                  title: '操作失败', 
                  content: result.result ? result.result.errMsg || '未知错误' : '返回数据异常',
                  showCancel: false
                });
              }
            },
            fail: (err) => {
              getApp().hideLoading();
              console.error('标记失败:', err);
              this._showCustomModal({ 
                title: '调用失败', 
                content: err.errMsg || '网络错误，请重试',
                showCancel: false
              });
            }
          });
        }
      }
    });
  },

  /** 管理员：下载视频到相册（支持 cloud:// 与 COS/HTTP） */
  _downloadVideoRefToAlbum(playUrl, originalRef) {
    const playRef = String(playUrl || '').trim();
    const origRef = String(originalRef || playRef || '').trim();
    if (!playRef && !origRef) {
      this._showCustomToast('暂无视频地址', 'none');
      return;
    }
    if (this._caseVideoDownloading) return;
    this._caseVideoDownloading = true;
    getApp().showLoading({ title: '下载中...', mask: true });

    const fail = (err, msg) => {
      this._caseVideoDownloading = false;
      getApp().hideLoading();
      if (err) console.error('❌ [下载] 失败:', err);
      this._showCustomToast(msg || '下载文件失败', 'none');
    };

    const done = (tempFilePath) => {
      this._caseVideoDownloading = false;
      this.saveVideoToAlbum(tempFilePath);
    };

    if (origRef.startsWith('cloud://')) {
      wx.cloud.downloadFile({
        fileID: origRef,
        success: (res) => done(res.tempFilePath),
        fail: (err) => fail(err)
      });
      return;
    }

    const httpUrl = playRef.startsWith('http') ? playRef : (origRef.startsWith('http') ? origRef : '');
    if (httpUrl) {
      wx.downloadFile({
        url: httpUrl,
        success: (res) => {
          if (res.statusCode === 200) done(res.tempFilePath);
          else fail(null, '下载失败');
        },
        fail: (err) => fail(err)
      });
      return;
    }

    if (playRef.startsWith('cloud://')) {
      wx.cloud.downloadFile({
        fileID: playRef,
        success: (res) => done(res.tempFilePath),
        fail: (err) => fail(err)
      });
      return;
    }

    fail(null, '无法识别的视频地址');
  },

  downloadPending(e) {
    if (!this.data.isAdmin) return;
    const fileID = e.currentTarget.dataset.fileid;
    if (!fileID) return;
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.pendingList.find(i => i._id === itemId);
    const originalFileID = (item && item.originalFileID) || fileID;
    this._downloadVideoRefToAlbum(fileID, originalFileID);
  },

  downloadOfficialCase(e) {
    if (e) {
      e.stopPropagation && e.stopPropagation();
    }
    if (!this.data.isAdmin) return;
    const id = e.currentTarget.dataset.id;
    const item = this.data.displayList.find(i => i._id === id);
    if (!item || !item.videoUrl) {
      this._showCustomToast('暂无视频资源', 'none');
      return;
    }
    this._downloadVideoRefToAlbum(item.videoUrl, item.originalVideoRef || item.videoFileID);
  },

  downloadCurrentFullscreenVideo() {
    if (!this.data.isAdmin) return;
    const v = this.data.currentVideo;
    if (!v || !v.videoUrl) {
      this._showCustomToast('暂无视频资源', 'none');
      return;
    }
    this._downloadVideoRefToAlbum(v.videoUrl, v.originalVideoRef || v.videoFileID);
  },
  
  // 🔴 新增：保存视频到相册的通用方法
  saveVideoToAlbum(tempFilePath) {
    wx.saveVideoToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        this._caseVideoDownloading = false;
        getApp().hideLoading();
        this._showCustomToast('已保存到相册', 'success');
      },
      fail: (err) => {
        this._caseVideoDownloading = false;
        getApp().hideLoading();
        console.error('❌ [保存] 保存到相册失败:', err);
        // 如果用户拒绝授权，提示去设置
        if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
          this._showCustomModal({
            title: '权限不足',
            content: '需要保存视频权限，请在设置中开启',
            confirmText: '去设置',
            success: (settingRes) => {
              if (settingRes.confirm) wx.openSetting();
            }
          });
        } else {
          this._showCustomToast('保存失败: ' + (err.errMsg || '未知错误'), 'none');
        }
      }
    });
  },

  getRandomColor() {
    const colors = ['#E0E0E0', '#D6D6D6', '#CCCCCC', '#C2C2C2', '#B8B8B8', '#ADADAD'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // ==========================================
  // 🆕 2. 智能底部按钮 (录制 vs 上传)
  // ==========================================
  handleFabTap() {
    if (this.data.isAdmin && this.data.adminSubMode === 'edit') {
      // 管理员编辑模式：显示拍摄指南弹窗（带切换功能）
      this.setData({ 
        showShootingGuide: true,
        shootingGuideMode: 'guide' // 默认显示教学页面
      });
      // 管理员不需要倒计时，直接启用按钮
      this.setData({
        guideBtnDisabled: false,
        guideBtnText: '关闭'
      });
      // 弹窗渲染完成后立刻播放视频，尽量消除等待感
      wx.nextTick(() => {
        this.playShootingGuideVideo();
      });
    } else {
      // 普通用户：先显示拍摄角度演示，然后显示选择弹窗
      this.setData({ 
        showShootingGuide: true,
        shootingGuideMode: 'guide',
        guideBtnDisabled: true,
        guideBtnText: '我知道了 (3s)'
      });
      this.startGuideTimer();
      // 弹窗渲染完成后立刻播放视频，尽量消除等待感
      wx.nextTick(() => {
        this.playShootingGuideVideo();
      });
    }
  },

  // 拍摄指南倒计时
  startGuideTimer() {
    let seconds = 3;
    if (this.data.guideTimer) clearInterval(this.data.guideTimer);
    
    const timer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(timer);
        this.setData({
          guideBtnDisabled: false,
          guideBtnText: '我知道了',
          guideTimer: null
        });
      } else {
        this.setData({
          guideBtnText: `我知道了 (${seconds}s)`
        });
      }
    }, 1000);
    
    this.setData({ guideTimer: timer });
  },

  // 切换拍摄指南弹窗模式
  switchShootingGuideMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ shootingGuideMode: mode });
    
    if (mode === 'publish') {
      // 切换到发布模式：关闭拍摄指南弹窗，打开管理员表单
      if (this.data.guideTimer) clearInterval(this.data.guideTimer); // 清除倒计时
      this._closeWithAnimation('showShootingGuide', 'shootingGuideClosing');
      setTimeout(() => {
        const patch = {
          showAdminForm: true,
          adminFormClosing: false,
          shootingGuideMode: 'publish'
        };
        // 编辑已有案例时切到「发布」，不能清空 isEditing / 表单内容
        if (!this.data.isEditing) {
          patch.isEditing = false;
          patch.editingId = null;
          patch.vehicleName = '';
          patch.categoryIndex = null;
          patch.modelIndex = null;
          patch.adminVideoPath = null;
          patch.adminThumbPath = null;
          patch.adminVideoKnownSize = null;
        }
        this.setData(patch);
      }, 420);
    } else if (mode === 'guide') {
      // 切换到教学模式：关闭管理员表单，打开拍摄指南弹窗
      this.setData({ 
        showAdminForm: false,
    adminFormClosing: false,
        showShootingGuide: true,
        // 管理员切换回来不需要倒计时
        guideBtnDisabled: false,
        guideBtnText: '关闭'
      });
      // 弹窗渲染完成后立刻播放视频
      wx.nextTick(() => {
        this.playShootingGuideVideo();
      });
    }
  },

  // 选择相册
  chooseVideoFromAlbum(e) {
    console.log('✅ chooseVideoFromAlbum 被调用', e);
    console.log('📱 当前设备列表:', this.data.myDevices);
    console.log('📱 设备数量:', this.data.myDevices ? this.data.myDevices.length : 0);
    
    // 🔴 致命修复：必须强行关闭录制层，防止它的 z-index 盖住表单
    this.setData({ 
      showUploadOptions: false,
      showCamera: false, // 强制关闭录制层
      cameraAnimating: false,
      isRecording: false // 确保录制状态也关闭
    });
    
    // 🔴 移除绑定设备检查：允许用户先上传视频，后续绑定设备后再审核
    console.log('✅ 准备打开相册');
    setTimeout(() => {
      console.log('📂 调用 wx.chooseVideo');
      wx.chooseVideo({
        sourceType: ['album'],
        maxDuration: 60,
        camera: 'back',
        success: (res) => {
          console.log('✅ 选择视频成功:', res);
          // 🔴 先显示预览，确认后再打开表单
          this.setData({
            videoPath: res.tempFilePath,
            videoKnownSize: typeof res.size === 'number' ? res.size : null,
            showVideoPreview: true,
            isVideoPlaying: true
          });
          // 🔴 调试：延迟检查数据是否正确传递到页面
          setTimeout(() => {
            console.log('🔵 [调试] 表单已打开，检查数据:', {
              showForm: this.data.showForm,
              categoryArray: this.data.categoryArray,
              categoryIndex: this.data.categoryIndex
            });
          }, 100);
        },
        fail: (err) => {
          // 用户取消不提示
          if (err && (err.errMsg || '').includes('cancel')) {
            return;
          }
          console.error('❌ 选择视频失败:', err);
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

  // 选择录制
  chooseRecord(e) {
    console.log('✅ chooseRecord 被调用', e);
    console.log('📱 当前设备列表:', this.data.myDevices);
    console.log('📱 设备数量:', this.data.myDevices ? this.data.myDevices.length : 0);
    
    // 🔴 致命修复：确保关闭上传选项弹窗，避免层级冲突
    this.setData({ showUploadOptions: false });
    
    // 🔴 移除绑定设备检查：允许用户先录制视频，后续绑定设备后再审核
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

  // 请求摄像头和麦克风权限
  requestCameraAndMicrophonePermission() {
    return new Promise((resolve, reject) => {
      // 先检查当前权限状态
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
            this._showCustomModal({
              title: '需要权限',
              content: '录制视频需要摄像头和麦克风权限，请在设置中开启',
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

  // 关闭上传选项弹窗
  closeUploadOptions() {
    this._closeWithAnimation('showUploadOptions', 'uploadOptionsClosing');
  },

  // 关闭拍摄指南弹窗
  closeShootingGuide() {
    if (this.data.guideTimer) clearInterval(this.data.guideTimer);
    this._closeWithAnimation('showShootingGuide', 'shootingGuideClosing');
  },

  // 跳过拍摄指南，直接进入上传选项
  skipShootingGuide() {
    if (this.data.guideBtnDisabled) return; // 禁用时不可点击
    
    if (this.data.guideTimer) clearInterval(this.data.guideTimer);
    this._closeWithAnimation('showShootingGuide', 'shootingGuideClosing');
    setTimeout(() => {
      this.setData({ showUploadOptions: true, uploadOptionsClosing: false });
    }, 420);
  },

  // 手动触发视频播放
  playShootingGuideVideo() {
    if (!this.data.shootingGuideVideoUrl) {
      console.log('📝 没有视频URL，跳过播放');
      // #region agent log
      silentAgentLog({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
        location: 'case.js:playShootingGuideVideo',
        message: 'no video url, skip play',
        data: { shootingGuideVideoUrl: this.data.shootingGuideVideoUrl },
        timestamp: Date.now()
      });
      // #endregion
      return;
    }
    const videoContext = wx.createVideoContext('shootingGuideVideo', this);
    if (videoContext) {
      videoContext.play();
      console.log('▶️ 手动触发视频播放');
      // #region agent log
      silentAgentLog({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
        location: 'case.js:playShootingGuideVideo',
        message: 'called videoContext.play',
        data: { shootingGuideVideoUrl: this.data.shootingGuideVideoUrl },
        timestamp: Date.now()
      });
      // #endregion
    }
  },

  // 视频播放事件处理
  onShootingGuideVideoPlay(e) {
    console.log('✅ 拍摄指南视频开始播放', e);
    // #region agent log
    silentAgentLog({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H2',
      location: 'case.js:onShootingGuideVideoPlay',
      message: 'video play event',
      data: {},
      timestamp: Date.now()
    });
    // #endregion
  },

  onShootingGuideVideoError(e) {
    console.error('❌ 拍摄指南视频播放错误:', e.detail);
    // #region agent log
    silentAgentLog({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H3',
      location: 'case.js:onShootingGuideVideoError',
      message: 'video error event',
      data: { err: e.detail && e.detail.errMsg },
      timestamp: Date.now()
    });
    // #endregion
    const errMsg = e.detail.errMsg || '';
    if (errMsg.includes('MEDIA_ERR_SRC_NOT_SUPPORTED')) {
      wx.showToast({
        title: '视频格式不支持',
        icon: 'none',
        duration: 2000
      });
    } else if (errMsg.includes('MEDIA_ERR_NETWORK')) {
      wx.showToast({
        title: '网络错误，请检查网络',
        icon: 'none',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: '视频播放失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  onShootingGuideVideoLoadStart(e) {
    console.log('📹 拍摄指南视频开始加载', e);
  },

  // 上传拍摄指南演示视频（管理员功能）
  uploadShootingGuideVideo() {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFilePath;
        this.showMyLoading('上传中...');
        
        // 1. 先读取旧的视频 fileID
        db.collection('config').doc('shooting_guide').get().then(oldRes => {
          const oldFileID = oldRes.data && oldRes.data.videoFileID;
          getCosUpload()
            .uploadVideoToCos(tempFilePath, 'case/shooting-guide', {
              knownSize: typeof res.size === 'number' ? res.size : undefined
            })
            .then(publicUrl => {
              console.log('✅ 演示视频上传成功(COS):', publicUrl);
              db.collection('config').doc('shooting_guide')
                .set({
                  data: {
                    videoFileID: publicUrl,
                    updateTime: db.serverDate()
                  }
                })
                .then(() => {
                  console.log('✅ 配置已保存到数据库');
                  this.setData({
                    shootingGuideVideoFileID: publicUrl,
                    shootingGuideVideoUrl: publicUrl
                  });
                  if (oldFileID && oldFileID.startsWith('cloud://') && oldFileID !== publicUrl) {
                    wx.cloud.deleteFile({
                      fileList: [oldFileID],
                      success: deleteRes => {
                        console.log('✅ 旧云存储视频已删除:', oldFileID, deleteRes);
                      },
                      fail: deleteErr => {
                        console.warn('⚠️ 删除旧云存储视频失败（不影响使用）:', deleteErr);
                      }
                    });
                  }
                  this.hideMyLoading();
                  this._showCustomToast('上传成功', 'success');
                })
                .catch(err => {
                  console.error('❌ 保存配置失败:', err);
                  this.hideMyLoading();
                  this._showCustomToast('上传成功，但保存配置失败', 'none');
                });
            })
            .catch(err => {
              console.error('❌ 上传失败:', err);
              this.hideMyLoading();
              this._showCustomToast('上传失败，请重试', 'none');
            });
        }).catch(() => {
          console.log('📝 未找到旧配置，直接上传新视频');
          getCosUpload()
            .uploadVideoToCos(tempFilePath, 'case/shooting-guide', {
              knownSize: typeof res.size === 'number' ? res.size : undefined
            })
            .then(publicUrl => {
              console.log('✅ 演示视频上传成功(COS):', publicUrl);
              this.setData({
                shootingGuideVideoUrl: publicUrl,
                shootingGuideVideoFileID: publicUrl
              });
              db.collection('config').doc('shooting_guide')
                .set({
                  data: {
                    videoFileID: publicUrl,
                    updateTime: db.serverDate()
                  }
                })
                .then(() => {
                  console.log('✅ 配置已保存到数据库');
                  this.hideMyLoading();
                  this._showCustomToast('上传成功', 'success');
                })
                .catch(setErr => {
                  console.error('❌ 保存配置失败:', setErr);
                  this.hideMyLoading();
                  this._showCustomToast('上传成功，但保存配置失败', 'none');
                });
            })
            .catch(uploadErr => {
              console.error('❌ 上传失败:', uploadErr);
              this.hideMyLoading();
              this._showCustomToast('上传失败，请重试', 'none');
            });
        });
      },
      fail: (err) => {
        console.error('❌ 选择视频失败:', err);
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          this._showCustomToast('选择视频失败', 'none');
        }
      }
    });
  },

  loadCaseBgmAudio() {
    this._caseBgmSrc = '';
    this._caseBgmPublishTried = false;
    this._caseBgmSessionActive = false;
    this._caseBgmPlaying = false;
    this._caseBgmStartTimers = [];
    const fallback = CASE_BGM_COS_URL;
    db.collection('config').doc('case_bgm').get().then((res) => {
      const data = (res && res.data) || {};
      const fromDb = String(data.audioUrl || '').trim();
      const url = isCaseBgmMp3Url(fromDb) ? fromDb : fallback;
      this._prepareCaseBgmUrl(url);
    }).catch(() => {
      this._prepareCaseBgmUrl(fallback);
    });
  },

  /** 确认 COS 上已有文件；404 时自动调用 publishCaseBgm 上传 */
  _prepareCaseBgmUrl(url) {
    const src = String(url || '').trim();
    if (!src) return;
    wx.request({
      url: src,
      method: 'HEAD',
      success: (res) => {
        if (res.statusCode === 200) {
          this._applyCaseBgmSrc(src);
          return;
        }
        this._autoPublishCaseBgm(src);
      },
      fail: () => {
        this._autoPublishCaseBgm(src);
      }
    });
  },

  _autoPublishCaseBgm(expectedUrl) {
    if (this._caseBgmPublishTried) {
      console.warn('[case] BGM COS 文件不存在，请部署并运行云函数 publishCaseBgm', expectedUrl);
      return;
    }
    this._caseBgmPublishTried = true;
    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') return;
    wx.cloud.callFunction({
      name: 'getCosUploadUrl',
      data: { action: 'publishCaseBgm' },
      success: (cf) => {
        const r = cf && cf.result;
        const url = r && (r.audioUrl || r.publicUrl);
        const published = r && (r.via === 'publishCaseBgm' || r.ok === true);
        if (published && isCaseBgmMp3Url(url)) {
          this._applyCaseBgmSrc(url);
          return;
        }
        console.warn('[case] 发布 BGM 失败：请重新部署 getCosUploadUrl（含 case-bgm.mp3）后再进案例页', r);
      },
      fail: (e) => {
        console.warn('[case] getCosUploadUrl publishCaseBgm 调用失败', e);
      }
    });
  },

  _destroyCaseBgmAudio() {
    if (!this._caseBgmAudio) return;
    try {
      this._caseBgmAudio.stop();
      this._caseBgmAudio.destroy();
    } catch (e) {}
    this._caseBgmAudio = null;
    this._caseBgmPlaying = false;
  },

  _applyCaseBgmSrc(src) {
    if (!src || !isCaseBgmMp3Url(src)) return;
    const changed = this._caseBgmSrc !== src;
    this._caseBgmSrc = src;
    if (changed) {
      this._destroyCaseBgmAudio();
    }
    // 列表页就预取 BGM，避免点开视频时与画面抢带宽
    this._ensureCaseBgmAudio();
    if (
      this._caseBgmSessionActive &&
      this._caseBgmStartedForCurrent &&
      this.data.showVideoPlayer &&
      !this.data.caseFullscreenPaused
    ) {
      this._syncCaseBgmPlayback();
    }
  },

  _clearCaseBgmStartTimers() {
    if (!this._caseBgmStartTimers || !this._caseBgmStartTimers.length) return;
    this._caseBgmStartTimers.forEach((tid) => clearTimeout(tid));
    this._caseBgmStartTimers = [];
  },

  _isCaseBgmPlaybackAllowed() {
    return !!(
      this._caseBgmSessionActive &&
      this._caseBgmStartedForCurrent &&
      this.data.showVideoPlayer &&
      !this.data.caseFullscreenExiting &&
      !this.data.caseFullscreenCoverHidden &&
      !this.data.caseFullscreenPaused &&
      !this.data.caseFullscreenBuffering &&
      !this.data.caseFullscreenInitialLoading &&
      !this._caseFullscreenSeeking
    );
  },

  _ensureCaseBgmAudio() {
    const src = this._caseBgmSrc || '';
    if (!src) return null;
    if (this._caseBgmAudio) {
      if (this._caseBgmAudio.src !== src) this._caseBgmAudio.src = src;
      return this._caseBgmAudio;
    }
    const audio = wx.createInnerAudioContext();
    audio.loop = true;
    audio.volume = 0.7;
    audio.obeyMuteSwitch = true;
    audio.src = src;
    audio.onPlay(() => {
      this._caseBgmPlaying = true;
    });
    audio.onPause(() => {
      this._caseBgmPlaying = false;
    });
    audio.onStop(() => {
      this._caseBgmPlaying = false;
    });
    audio.onEnded(() => {
      this._caseBgmPlaying = false;
    });
    audio.onError((err) => {
      this._caseBgmPlaying = false;
      console.warn('[case] BGM 播放失败', err);
    });
    this._caseBgmAudio = audio;
    return audio;
  },

  _beginCaseBgmSession() {
    this._caseBgmSessionActive = true;
    this._caseBgmStartedForCurrent = false;
    this._caseFsStableTicks = 0;
    this._caseFsLastStableCur = -1;
    this._clearCaseBgmStartTimers();
    // 仅确保已预取；绝不在此处 play
    if (this._caseBgmSrc) {
      this._ensureCaseBgmAudio();
      this._pauseCaseBgm();
    }
  },

  _resetCaseBgmStableGate() {
    this._caseFsStableTicks = 0;
    this._caseFsLastStableCur = -1;
    this._caseBgmStartedForCurrent = false;
    this._clearCaseBgmStartTimers();
  },

  /**
   * 仅在画面时间轴持续推进后启 BGM。
   * forceReady 仅用于 seek/暂停恢复（且必须已满足稳定出画过一次）。
   */
  _startCaseBgmAfterVideoReady(forceReady, opts) {
    if (!this._caseBgmSessionActive || this._caseBgmStartedForCurrent) return;
    if (!this.data.showVideoPlayer || this.data.caseFullscreenPaused) return;
    if (this.data.caseFullscreenBuffering || this.data.caseFullscreenInitialLoading) return;
    if (this._caseFullscreenSeeking) return;
    if (!forceReady && (this._caseFsStableTicks || 0) < CASE_BGM_STABLE_TICKS) return;
    this._caseBgmStartedForCurrent = true;
    this._clearCaseBgmStartTimers();
    const delayMs = opts && opts.quick ? 40 : 120;
    const tid = setTimeout(() => {
      if (!this._caseBgmSessionActive || !this._caseBgmStartedForCurrent) return;
      this._syncCaseBgmPlayback();
    }, delayMs);
    this._caseBgmStartTimers = [tid];
  },

  /** 恢复播放时续播 BGM；若尚未稳定出画过，不强制开播 */
  _resumeCaseBgm() {
    if (!this._caseBgmSessionActive) return;
    if (!this._caseBgmStartedForCurrent) {
      this._startCaseBgmAfterVideoReady(false, { quick: true });
      return;
    }
    this._clearCaseBgmStartTimers();
    const tid = setTimeout(() => this._syncCaseBgmPlayback(), 100);
    this._caseBgmStartTimers = [tid];
  },

  _syncCaseBgmPlayback() {
    if (!this._caseBgmSessionActive || !this._caseBgmStartedForCurrent) {
      return;
    }
    if (!this._isCaseBgmPlaybackAllowed()) {
      this._pauseCaseBgm();
      return;
    }
    const src = this._caseBgmSrc || '';
    if (!src) return;
    const audio = this._ensureCaseBgmAudio();
    if (!audio) return;
    if (audio.src !== src) {
      audio.src = src;
    }
    if (this._caseBgmPlaying) return;
    try {
      audio.play();
    } catch (e) {
      console.warn('[case] 统一背景音乐播放失败', e);
    }
  },

  _pauseCaseBgm() {
    if (!this._caseBgmAudio) return;
    try {
      this._caseBgmAudio.pause();
    } catch (e) {}
    this._caseBgmPlaying = false;
  },

  _forceStopCaseBgm() {
    this._caseBgmSessionActive = false;
    this._caseBgmStartedForCurrent = false;
    this._caseFsStableTicks = 0;
    this._caseFsLastStableCur = -1;
    this._clearCaseBgmStartTimers();
    if (!this._caseBgmAudio) {
      this._caseBgmPlaying = false;
      return;
    }
    try {
      this._caseBgmAudio.stop();
    } catch (e) {}
    try {
      this._caseBgmAudio.pause();
    } catch (e) {}
    this._caseBgmPlaying = false;
  },

  _stopCaseBgm() {
    this._forceStopCaseBgm();
  },

  // 从数据库加载拍摄指南视频（页面加载时调用）
  loadShootingGuideVideo() {
    db.collection('config').doc('shooting_guide').get().then(res => {
      if (res.data && res.data.videoFileID) {
        // 保存原始 fileID 用于删除
        this.setData({ shootingGuideVideoFileID: res.data.videoFileID });
        // #region agent log
        silentAgentLog({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H4',
          location: 'case.js:loadShootingGuideVideo',
          message: 'loaded config',
          data: { videoFileID: res.data.videoFileID },
          timestamp: Date.now()
        });
        // #endregion
        
        // 如果是云存储路径，需要转换为临时 URL
        if (res.data.videoFileID.startsWith('cloud://')) {
          wx.cloud.getTempFileURL({
            fileList: [res.data.videoFileID],
            success: (urlRes) => {
              if (urlRes.fileList && urlRes.fileList[0]) {
                this.setData({
                  shootingGuideVideoUrl: urlRes.fileList[0].tempFileURL
                });
                // #region agent log
                silentAgentLog({
                  sessionId: 'debug-session',
                  runId: 'run1',
                  hypothesisId: 'H4',
                  location: 'case.js:loadShootingGuideVideo',
                  message: 'got temp file url',
                  data: { tempUrl: urlRes.fileList[0].tempFileURL },
                  timestamp: Date.now()
                });
                // #endregion
              }
            }
          });
        } else {
          this.setData({
            shootingGuideVideoUrl: res.data.videoFileID
          });
          // #region agent log
          silentAgentLog({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H4',
            location: 'case.js:loadShootingGuideVideo',
            message: 'use direct fileID as url',
            data: { directUrl: res.data.videoFileID },
            timestamp: Date.now()
          });
          // #endregion
        }
      }
    }).catch(err => {
      console.log('📝 未找到拍摄指南配置，使用默认值');
    });
  },

  // 删除拍摄指南视频（管理员功能）
  deleteShootingGuideVideo() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除演示视频吗？删除后需要重新上传才能显示。',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('删除中...');
          
          // 1. 从数据库读取 fileID
          db.collection('config').doc('shooting_guide').get().then(configRes => {
            const fileID = configRes.data && configRes.data.videoFileID;
            
            // 2. 删除云存储文件
            if (fileID && fileID.startsWith('cloud://')) {
              wx.cloud.deleteFile({
                fileList: [fileID],
                success: (deleteRes) => {
                  console.log('✅ 视频文件删除成功');
                  
                  // 3. 删除数据库配置
                  db.collection('config').doc('shooting_guide').remove().then(() => {
                    console.log('✅ 配置已删除');
                    this.setData({
                      shootingGuideVideoUrl: '',
                      shootingGuideVideoFileID: ''
                    });
                    this.hideMyLoading();
                    this._showCustomToast('删除成功', 'success');
                  }).catch(err => {
                    console.error('❌ 删除配置失败:', err);
                    this.hideMyLoading();
                    this._showCustomToast('文件已删除，但删除配置失败', 'none');
                  });
                },
                fail: (deleteErr) => {
                  console.error('❌ 删除文件失败:', deleteErr);
                  // 即使文件删除失败，也尝试删除数据库配置
                  db.collection('config').doc('shooting_guide').remove().then(() => {
                    this.setData({
                      shootingGuideVideoUrl: '',
                      shootingGuideVideoFileID: ''
                    });
                    this.hideMyLoading();
                    this._showCustomToast('配置已删除，但文件删除失败', 'none');
                  }).catch(err => {
                    this.hideMyLoading();
                    this._showCustomToast('删除失败，请重试', 'none');
                  });
                }
              });
            } else {
              // 如果没有 fileID 或不是云存储路径，只删除数据库配置
              db.collection('config').doc('shooting_guide').remove().then(() => {
                this.setData({
                  shootingGuideVideoUrl: '',
                  shootingGuideVideoFileID: ''
                });
                this.hideMyLoading();
                this._showCustomToast('删除成功', 'success');
              }).catch(err => {
                console.error('❌ 删除配置失败:', err);
                this.hideMyLoading();
                this._showCustomToast('删除失败，请重试', 'none');
              });
            }
          }).catch(err => {
            console.error('❌ 读取配置失败:', err);
            this.hideMyLoading();
            this._showCustomToast('删除失败，请重试', 'none');
          });
        }
      }
    });
  },

  // 显示绑定设备提示弹窗
  showBindDeviceTip() {
    this.setData({ showBindDeviceTip: true, bindDeviceTipClosing: false });
  },

  // 关闭绑定设备提示弹窗
  closeBindDeviceTip() {
    this._closeWithAnimation('showBindDeviceTip', 'bindDeviceTipClosing');
  },

  // 跳转到绑定设备页面
  goToBindDevice() {
    this._closeWithAnimation('showBindDeviceTip', 'bindDeviceTipClosing', () => {
      wx.navigateTo({ url: '/package-app/pages/profile/profile', animationType: 'none' });
    });
  },

  goToBindDeviceFromForm() {
    this.setData({ showBindDeviceTip: true, bindDeviceTipClosing: false });
  },

  // 阻止事件冒泡
  preventBubble(e) {
    // 阻止事件冒泡到遮罩层
    if (e) {
      e.stopPropagation && e.stopPropagation();
    }
  },

  _preloadCaseVideo(url) {
    if (this._isWxDevtools()) return;
    const src = this._swapCosHost(String(url || '').trim(), { forVideo: true });
    if (!src || typeof wx.preloadVideo !== 'function') return;
    this._caseVideoPreloaded = this._caseVideoPreloaded || {};
    if (this._caseVideoPreloaded[src]) return;
    this._caseVideoPreloaded[src] = true;
    try {
      wx.preloadVideo({ src, fail: () => {
        delete this._caseVideoPreloaded[src];
      } });
    } catch (e) {}
  },

  _preloadCaseVideosFromList(list) {
    const rows = Array.isArray(list) ? list : [];
    const limit = Math.min(rows.length, CASE_VIDEO_PRELOAD_COUNT);
    for (let i = 0; i < limit; i++) {
      const url = rows[i] && rows[i].videoUrl;
      if (url) this._preloadCaseVideo(url);
    }
  },

  /** 打开前刷新 cloud:// 临时链，避免过期导致黑屏/播不了 */
  async _resolvePlayableVideoUrl(item) {
    if (!item) return '';
    const ref = String(item.originalVideoRef || item.videoUrl || '').trim();
    if (ref.indexOf('cloud://') === 0 && wx.cloud && wx.cloud.getTempFileURL) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: [ref] });
        const temp = res && res.fileList && res.fileList[0] && res.fileList[0].tempFileURL;
        if (temp) return this._swapCosHost(temp, { forVideo: true }) || temp;
      } catch (e) {}
    }
    const https = String(item.videoUrl || '').trim();
    return this._swapCosHost(https, { forVideo: true }) || https;
  },

  // ==========================================
  // 🆕 3. 智能卡片点击 (播放 vs 编辑)
  // ==========================================
  async onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    const targetItem = this.data.displayList.find(item => item._id === id);

    if (this.data.isAdmin && this.data.adminSubMode === 'edit') {
      // 🔧 管理员编辑模式：进入编辑
      this.editCase(targetItem);
    } else {
      // 审核放行：不打开播放器，仅提示视频号筹备中
      if (!this.data.caseVideoPlaybackEnabled) {
        wx.showToast({
          title: '完善视频号链接中',
          icon: 'none',
          duration: 2200
        });
        return;
      }
      // ▶️ 普通模式或管理现有视频模式：播放视频
      if (targetItem && (targetItem.videoUrl || targetItem.originalVideoRef)) {
        this._forceStopCaseBgm();
        this._caseBgmStartedForCurrent = false;
        this._caseFsPlaybackStarted = false;
        this._caseFsDurationApplied = false;
        this._caseFsLastTuHandleAt = 0;
        this._caseFsStallRecoverCount = 0;
        this._caseFsResumeAfterRecover = 0;
        this._caseFsLastProgressAt = 0;
        this._clearCaseFullscreenStallRecover();
        this._resetCaseBgmStableGate();
        if (this._caseFsChromeTimer) {
          clearTimeout(this._caseFsChromeTimer);
          this._caseFsChromeTimer = null;
        }
        this._clearCaseFullscreenReadyTimers();
        const playUrl = await this._resolvePlayableVideoUrl(targetItem);
        if (!playUrl) {
          this._showCustomToast('暂无视频资源', 'none');
          return;
        }
        // 先预热当前视频，减轻「第一次进不去」
        this._preloadCaseVideo(playUrl);
        const playItem = { ...targetItem, videoUrl: playUrl };
        const list = this.data.displayList || [];
        const idx = list.findIndex((it) => it && it._id === id);
        if (idx >= 0) {
          for (let i = idx + 1; i <= idx + 2 && i < list.length; i++) {
            if (list[i] && list[i].videoUrl) this._preloadCaseVideo(list[i].videoUrl);
          }
        }
        this.setData({
          currentVideo: playItem,
          showVideoPlayer: true,
          caseFsVideoAlive: true,
          caseFullscreenExiting: false,
          caseFullscreenCoverHidden: false,
          caseFullscreenChromeReady: true,
          caseFullscreenDuration: 0,
          caseFullscreenProgressPercent: 0,
          caseFullscreenProgressRatio: 0,
          caseFullscreenCurrentStr: '00:00',
          caseFullscreenDurationStr: '00:00',
          caseFullscreenPaused: false,
          caseFullscreenEnded: false,
          caseFullscreenBuffering: false,
          // 首次打开立刻给反馈，避免黑屏干等
          caseFullscreenInitialLoading: true,
          caseFullscreenInitialTime: 0,
          caseFullscreenTy: 0,
          caseFullscreenNoTrans: true
        }, () => {
          // 打开瞬间不抢带宽拉 BGM；只标记会话，出画后再播
          this._caseBgmSessionActive = true;
          this._caseBgmStartedForCurrent = false;
          this._caseFsStableTicks = 0;
          this._caseFsLastStableCur = -1;
          this._clearCaseBgmStartTimers();
          this.refreshVideoWatermarkNickname();
          // 原生 video 挂载需要一拍；错开多次 play，避免首次 play 落空
          setTimeout(() => {
            if (!this.data.showVideoPlayer || this._caseFsPlaybackStarted) return;
            this._refreshCaseFullscreenTrackRect();
            this._kickCaseFullscreenAutoplay(3);
          }, 120);
          this._scheduleCaseFullscreenStuckCheck();
        });
        this._caseFullscreenTrackRectCached = null;
      } else {
        this._showCustomToast('暂无视频资源', 'none');
      }
    }
  },
  
  // 🆕 编辑图标点击事件（阻止冒泡，直接进入编辑）
  onEditIconTap(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    const targetItem = this.data.displayList.find(item => item._id === id);
    if (targetItem) {
      this.editCase(targetItem);
    }
  },

  // 编辑逻辑：回显数据
  editCase(item) {
    // 反查分类和型号的索引
    const catIdx = this.data.categoryValueArray.indexOf(item.type);
    const modIdx = this.data.modelArray.indexOf(item.model);

    this.setData({
      isEditing: true,
      editingId: item._id,
      showAdminForm: true,
      shootingGuideMode: 'publish',
      vehicleName: item.vehicleName || item.title || '',
      categoryIndex: catIdx >= 0 ? catIdx : null, // 🔴 修复：按照 zj4 的写法，找不到时使用 null
      modelIndex: modIdx >= 0 ? modIdx : null, // 🔴 修复：按照 zj4 的写法，找不到时使用 null
      adminVideoPath: item.videoUrl, // 回显现有视频
      adminThumbPath: item.coverUrl, // 回显现有封面
      adminVideoKnownSize: null
    });
  },

  // ==========================================
  // 1. 切换 Tab (修复：使用 SelectorQuery 获取准确坐标)
  // ==========================================
  _matchesCaseModelSeries(modelName, seriesTab) {
    if (!seriesTab || seriesTab === 'all') return true;
    const raw = String(modelName || '').trim();
    if (!raw) return false;
    const m = raw.toUpperCase();
    const s = String(seriesTab).trim().toUpperCase();
    if (m === s) return true;
    if (s === 'F1' || s === 'F2' || s === 'F3') {
      return m.startsWith(s + ' ');
    }
    return m === s;
  },

  _filterCaseDisplayList(list, tab) {
    let pool = list || [];
    const type = tab != null ? tab : this.data.currentTab;
    if (!type || type === 'all') return pool;
    if (CASE_MODEL_TAB_SET.has(type)) {
      return pool.filter((item) => this._matchesCaseModelSeries(item.model, type));
    }
    return pool.filter((item) => item.type === type);
  },

  switchTab(e) {
    const type = e.currentTarget.dataset.type;
    console.log('🔵 [调试] switchTab 被调用，type:', type);
    
    const baseList = this._filterCaseDisplayList(this.data.list, type);

    this.setData({
      currentTab: type,
      displayList: baseList,
      showSearchBar: true,
      searchText: '',
      searchTip: ''
    }, () => {
      this._syncCaseMainScrollLayout();
      this._preloadCaseVideosFromList(baseList);
    });

    const tabTypes = CASE_TAB_LIST.map((t) => t.id);
    const targetIndex = tabTypes.indexOf(type);
    
    if (targetIndex === -1) {
      console.error('❌ [错误] 找不到对应的 type:', type);
      return;
    }
    
    const query = wx.createSelectorQuery();
    query.selectAll('.tab-item').boundingClientRect(); // 获取所有按钮
    query.select('.tab-list').boundingClientRect(); // 获取父容器
    
    query.exec(res => {
      console.log('🔵 [调试] query.exec 返回结果:', res);
      const allTabs = res[0]; // 所有按钮位置数组
      const containerRect = res[1]; // 父容器位置
      
      console.log('🔵 [调试] allTabs (所有按钮):', allTabs);
      console.log('🔵 [调试] containerRect (容器):', containerRect);
      console.log('🔵 [调试] targetIndex:', targetIndex);
      
      if (allTabs && allTabs.length > targetIndex && containerRect) {
        const targetRect = allTabs[targetIndex]; // 找到对应的按钮
        
        console.log('🔵 [调试] targetRect (目标按钮):', targetRect);
        
        // 算出相对距离，这样无论怎么滚动，位置都是准的
        const relativeLeft = targetRect.left - containerRect.left;
        const finalLeft = relativeLeft - 10;
        const finalWidth = targetRect.width + 20;
        
        console.log('🔵 [调试] 计算结果:');
        console.log('  - targetRect.left:', targetRect.left);
        console.log('  - containerRect.left:', containerRect.left);
        console.log('  - relativeLeft:', relativeLeft);
        console.log('  - finalLeft (sliderLeft):', finalLeft);
        console.log('  - targetRect.width:', targetRect.width);
        console.log('  - finalWidth (sliderWidth):', finalWidth);
        
        this.setData({
          sliderLeft: finalLeft, // 左边往外扩 10px
          sliderWidth: finalWidth // 宽度加 20px
        });
        
        console.log('🔵 [调试] setData 完成，sliderLeft:', finalLeft, 'sliderWidth:', finalWidth);
      } else {
        console.error('❌ [错误] 找不到目标按钮或容器！');
        console.error('  - allTabs:', allTabs);
        console.error('  - allTabs.length:', allTabs ? allTabs.length : 0);
        console.error('  - targetIndex:', targetIndex);
        console.error('  - containerRect:', containerRect);
      }
    });
  },

  // ==========================================
  // 2. 初始化定位 (修复：逻辑同上)
  // ==========================================
  initTabPosition() {
    console.log('🔵 [调试] initTabPosition 被调用');
    const query = wx.createSelectorQuery();
    query.select('.tab-item.active').boundingClientRect();
    query.select('.tab-list').boundingClientRect();
    
    query.exec(res => {
      console.log('🔵 [调试] initTabPosition query.exec 返回结果:', res);
      if (res[0] && res[1]) {
        const relativeLeft = res[0].left - res[1].left;
        const finalLeft = relativeLeft - 10;
        const finalWidth = res[0].width + 20;
        
        console.log('🔵 [调试] initTabPosition 计算结果:');
        console.log('  - res[0].left (按钮):', res[0].left);
        console.log('  - res[1].left (容器):', res[1].left);
        console.log('  - relativeLeft:', relativeLeft);
        console.log('  - finalLeft (sliderLeft):', finalLeft);
        console.log('  - res[0].width:', res[0].width);
        console.log('  - finalWidth (sliderWidth):', finalWidth);
        
        this.setData({
          sliderLeft: finalLeft, 
          sliderWidth: finalWidth
        });
        
        console.log('🔵 [调试] initTabPosition setData 完成');
      } else {
        console.error('❌ [错误] initTabPosition: res[0] 或 res[1] 为空！');
        console.error('  - res[0]:', res[0]);
        console.error('  - res[1]:', res[1]);
      }
    });
  },

  onSearchInput(e) {
    const val = e.detail.value;
    this.setData({ searchText: val, searchTip: '' });

    const currentPool = this._filterCaseDisplayList(this.data.list, this.data.currentTab);

    if (!val) {
      this.setData({ displayList: currentPool });
      return;
    }

    const matched = [];
    const unmatched = [];

    currentPool.forEach(item => {
      // 模糊匹配
      if (item.title.toLowerCase().includes(val.toLowerCase()) || 
          item.model.toLowerCase().includes(val.toLowerCase())) {
        matched.push(item);
      } else {
        unmatched.push(item);
      }
    });

    if (matched.length > 0) {
      // 将匹配项置顶，未匹配项沉底
      const sortedList = [...matched, ...unmatched];
      // 只要数据源变了，配合 wx:key 和 CSS 动画，就会有位移效果
      this.setData({ displayList: sortedList });
    } else {
      this.setData({ searchTip: '暂无客户上传' });
    }
  },

  // ==========================================
  // 5. 提交表单 (兼容 新增 & 修改)
  // ==========================================
  submitAdminForm(e) {
    if (this.data.isSubmitting) return;
    const vehicleName = this._resolveVehicleName(e);
    const { categoryIndex, modelIndex, adminVideoPath, adminThumbPath, categoryValueArray, categoryArray, modelArray, isEditing, editingId } = this.data;

    if (!adminVideoPath) return this._showCustomToast('请选择视频', 'none');
    // 编辑模式下可以不改封面，新增模式必须有封面
    if (!isEditing && !adminThumbPath) return this._showCustomToast('请选择封面图', 'none');
    if (!vehicleName) return this._showCustomToast('请填写车型', 'none');
    if (vehicleName !== this.data.vehicleName) {
      this.setData({ vehicleName });
    }
    // 🔴 修复：按照 zj4 的写法，只检查是否为 null
    if (categoryIndex === null) return this._showCustomToast('请选分类', 'none');
    if (modelIndex === null) return this._showCustomToast('请选型号', 'none');

    this.setData({ isSubmitting: true });
    getApp().showLoading({ title: isEditing ? '修改中...' : '上传中...', mask: true });

    // 如果是网络图片(回显的)，不需要重新上传；如果是临时文件(新选的)，需要上传
    const isNewVideo = adminVideoPath.startsWith('wxfile') || adminVideoPath.startsWith('http://tmp');
    const isNewCover = adminThumbPath && (adminThumbPath.startsWith('wxfile') || adminThumbPath.startsWith('http://tmp'));

    const uploadTasks = [];
    if (isNewVideo) {
      uploadTasks.push(
        getCosUpload().uploadVideoToCos(adminVideoPath, 'video_go', {
          knownSize: this.data.adminVideoKnownSize || undefined
        })
      );
    } else {
      uploadTasks.push(Promise.resolve(adminVideoPath));
    }
    if (isNewCover) {
      uploadTasks.push(getCosUpload().uploadImageToCos(adminThumbPath, 'video_go'));
    } else {
      uploadTasks.push(Promise.resolve(adminThumbPath || null));
    }

    Promise.all(uploadTasks).then(results => {
      const videoID = results[0];
      const coverID = results[1] || null;

      const docData = {
        vehicleName: vehicleName,
        category: categoryValueArray[categoryIndex],
        categoryName: categoryArray[categoryIndex],
        model: modelArray[modelIndex],
        videoFileID: videoID,
        type: 'admin_upload'
      };
      if (coverID) docData.coverFileID = coverID;

      if (isEditing) {
        // --- 修改逻辑（走云函数，绕过 video_go 客户端写权限限制）---
        this._callAdminVideoGo({ action: 'update', docId: editingId, data: docData })
          .then(() => {
            this.finishSubmit('修改成功');
          })
          .catch((err) => {
            this._handleAdminVideoGoError(err, '❌ [admin] 更新失败');
          });
      } else {
        // --- 新增逻辑 ---
        this._callAdminVideoGo({ action: 'add', data: docData })
          .then(() => {
            this.finishSubmit('发布成功');
          })
          .catch((err) => {
            this._handleAdminVideoGoError(err, '❌ [admin] 发布失败');
          });
      }
    }).catch(err => {
      console.error(err);
      getApp().hideLoading();
      this.setData({ isSubmitting: false });
      this._showCustomToast('操作失败', 'none');
    });
  },

  finishSubmit(msg) {
    getApp().hideLoading();
    this._showCustomToast(msg, 'success');
    this.setData({ 
      isSubmitting: false, showAdminForm: false, 
      adminVideoPath: null, adminThumbPath: null, adminVideoKnownSize: null,
      vehicleName: '', categoryIndex: null, modelIndex: null, // 🔴 修复：按照 zj4 的写法，重置为 null
      isEditing: false, editingId: null
    });
    this.fetchCloudData();
  },

  // ==========================================
  // 6. 录制相关
  // ==========================================
  // 阻止录制页面滑动
  preventScroll() {
    return false;
  },

  openCamera() { 
    // 🔴 移除绑定设备检查：允许用户先录制视频，后续绑定设备后再上传审核
    
    // 1. 🔴 优化：先设置显示状态
    this.setData({ 
      showCamera: true, 
      cameraAnimating: true, // 标记为动画初始状态
      showPrivacyTip: true 
    }); 
    
    // 2. 🔴 优化：使用更短的延迟，减少卡顿感
    // 使用 wx.nextTick 确保在下一帧渲染（如果支持），否则用短延迟
    if (typeof wx.nextTick === 'function') {
      wx.nextTick(() => {
        this.setData({ cameraAnimating: false }); // 触发弹出动画
      });
    } else {
      setTimeout(() => {
        this.setData({ cameraAnimating: false }); // 触发弹出动画
      }, 16); // 约一帧的时间
    }
    
    // 3. 隐私提示显示 4 秒后自动消失
    setTimeout(() => {
      this.setData({ showPrivacyTip: false });
    }, 4000);
  },
  closeCamera() { 
    // 🔴 优化：立即隐藏所有组件，不等待动画
    this.setData({ 
      showPrivacyTip: false,
      isRecording: false, // 立即停止录制状态，让组件快速退场
      recTimeStr: "00:00"
    });
    
    if(this.data.isRecording) {
      // 🔴 如果正在录制，先停止录制
      this.stopRecordLogic(false); 
      // 🔴 优化：缩短延迟，快速关闭
      setTimeout(() => {
        this.setData({ 
          cameraAnimating: true, // 开始关闭动画（缩回按钮）
        });
        setTimeout(() => {
          this.setData({ showCamera: false, cameraAnimating: false });
        }, 200); // 🔴 优化：进一步缩短到 200ms
      }, 30); // 🔴 优化：缩短到 30ms
    } else {
      // 🔴 优化：直接触发关闭动画，立即隐藏组件
      this.setData({ cameraAnimating: true });
      setTimeout(() => {
        this.setData({ 
          showCamera: false, 
          cameraAnimating: false 
        }); 
      }, 200); // 🔴 优化：进一步缩短到 200ms
    }
  },
  toggleRecord() { 
    // 🔴 防止重复点击
    if (this.data.isStopping) {
      console.log('⚠️ 正在停止录制，请稍候...');
      return;
    }
    
    if(this.data.isRecording) {
      // 停止录制
      this.stopRecordLogic(true); 
    } else {
      // 🆕 仅仅震动反馈，去掉 Loading，让 UI 动画接管视觉反馈
      wx.vibrateShort();
      this.startRecordLogic(); 
    }
  },
  startRecordLogic() { 
    // 🔴 设置最大录制时长为 60 秒，防止文件过大
    const MAX_RECORD_DURATION = 60; // 最大录制时长（秒）
    
    // 这里的 startRecord 不需要改动太多，只要确保不调用 getApp().hideLoading 即可
    this.ctx.startRecord({ 
      timeoutCallback: () => {
        // 🔴 超时回调：达到最大时长时自动停止
        console.log('⏰ [超时回调] 达到最大录制时长，自动停止录制');
        if (this.data.timer) {
          clearInterval(this.data.timer);
          this.setData({ timer: null });
        }
        // 自动保存并停止
        if (this.data.isRecording) {
          this.stopRecordLogic(true);
        }
      },
      success:()=>{
        // 录制状态改变，WXML 里的 class 会自动变化，触发 CSS 动画
        this.setData({isRecording: true, recTimeStr: "00:00"});
        this.startTime = Date.now();
        
        if(this.data.timer) clearInterval(this.data.timer);
        let seconds = 0;
        this.data.timer = setInterval(() => {
          seconds++;
          
          // 🔴 双重保护：在计时器中也检查是否达到最大时长
          if (seconds >= MAX_RECORD_DURATION) {
            console.log('⏰ [计时器检查] 达到最大录制时长，自动停止录制');
            clearInterval(this.data.timer);
            this.setData({ timer: null });
            // 自动保存并停止
            this.stopRecordLogic(true);
            return;
          }
          
          const min = Math.floor(seconds / 60).toString().padStart(2, '0');
          const sec = (seconds % 60).toString().padStart(2, '0');
          this.setData({ recTimeStr: `${min}:${sec}` });
        }, 1000);
      },
      fail: (err) => {
        console.error('❌ 录制启动失败', err);
        this._showCustomToast('录制启动失败', 'none');
        this.setData({ isRecording: false });
        // 清除计时器
        if (this.data.timer) {
          clearInterval(this.data.timer);
          this.setData({ timer: null });
        }
      }
    }); 
  },
  stopRecordLogic(save) { 
    // 🔴 先清除计时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
    
    // 🔴 立即重置 UI 状态，不依赖 stopRecord 的成功回调
    this.setData({
      isRecording: false,
      isStopping: false,
      recTimeStr: "00:00"
    });
    
    // 🔴 确保 ctx 存在，如果不存在则重新创建
    if (!this.ctx) {
      this.ctx = wx.createCameraContext();
    }
    
    // 🔴 尝试停止录制，但不依赖成功回调
    try {
      this.ctx.stopRecord({
        success: (res) => {
          console.log('✅ 录制结束，返回结果:', res);
          if (save && res.tempVideoPath) {
            setTimeout(() => {
              this.setData({
                showCamera: false,
                cameraAnimating: false,
                videoPath: res.tempVideoPath,
                videoKnownSize: typeof res.size === 'number' ? res.size : null,
                showVideoPreview: true, // 🔴 先显示预览
                isVideoPlaying: true
              });
            }, 250);
          } else if (save) {
            this._showCustomToast('录制无效', 'none');
          }
        },
        fail: (err) => {
          console.error('❌ stopRecord 失败，但已重置状态', err);
          // 即使失败，也尝试处理保存逻辑
          if (save) {
            // 如果 stopRecord 失败，直接关闭相机，不保存视频
            setTimeout(() => {
              this.setData({
                showCamera: false,
                cameraAnimating: false
              });
            }, 250);
          }
        }
      });
    } catch (e) {
      console.error('❌ stopRecord 调用异常', e);
      // 即使异常，也要关闭相机
      setTimeout(() => {
        this.setData({
          showCamera: false,
          cameraAnimating: false
        });
      }, 250);
    } 
  },
  
  // 🔴 新增：关闭表单错误提示
  closeFormError() {
    this._closeWithAnimation('showFormError', 'formErrorClosing', (patch) => {
      patch.formErrorMsg = '';
    });
  },
  
  // 🔴 新增：显示表单错误提示并触发抖动
  showFormErrorWithShake(msg) {
    // 先触发抖动动画
    this.setData({ formShake: true });
    // 抖动动画结束后显示错误提示
    setTimeout(() => {
      this.setData({ 
        formShake: false,
        showFormError: true,
        formErrorMsg: msg
      });
    }, 300); // 抖动动画时长
  },
  
  async submitForm(e) {
    console.log('🔵 [提交] submitForm 被调用');
    const vehicleName = this._resolveVehicleName(e);
    const { categoryIndex, modelIndex, videoPath, categoryValueArray, categoryArray, modelArray, myDevices, selectedSnIndex } = this.data;
    if (vehicleName !== this.data.vehicleName) {
      this.setData({ vehicleName });
    }
    
    console.log('🔵 [提交] 当前数据:', {
      vehicleName,
      categoryIndex,
      modelIndex,
      videoPath: videoPath ? '存在' : '不存在',
      selectedSnIndex,
      myDevicesLength: myDevices ? myDevices.length : 0
    });
    
    // 🔴 修复：防止重复提交（在函数开始就检查并设置状态）
    if (this.data.isSubmitting) {
      console.log('⚠️ [提交] 正在提交中，忽略重复点击');
      return;
    }
    
    // 🔴 立即设置提交状态，防止竞态条件
    this.setData({ isSubmitting: true });
    
    // 🔴 修复：使用自定义提示框，并触发抖动
    if (!videoPath) {
      console.error('❌ [提交] 视频丢失');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请先选择或录制视频');
      return;
    }
    if (!vehicleName || vehicleName.trim() === '') {
      console.error('❌ [提交] 未填写车型');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请填写车型信息');
      return;
    }
    if (categoryIndex === null || categoryIndex === undefined) {
      console.error('❌ [提交] 未选择分类');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请选择车型分类');
      return;
    }
    if (modelIndex === null || modelIndex === undefined) {
      console.error('❌ [提交] 未选择型号');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请选择产品型号');
      return;
    }
    if (!myDevices || myDevices.length === 0) {
      this.setData({ isSubmitting: false });
      this.showFormErrorWithShake('请先绑定设备后再提交案例');
      return;
    }
    if (selectedSnIndex === null || selectedSnIndex === undefined || !myDevices[selectedSnIndex]) {
      this.setData({ isSubmitting: false });
      this.showFormErrorWithShake('请选择关联设备');
      return;
    }
    const targetSn = myDevices[selectedSnIndex].sn;
    console.log('🔵 [提交] 准备提交，targetSn:', targetSn);
    withRepairProgressSubscribe(() => {
      this._doSubmitCaseForm({
        e,
        vehicleName,
        categoryIndex,
        modelIndex,
        videoPath,
        categoryValueArray,
        categoryArray,
        modelArray,
        targetSn
      });
    });
  },

  _doSubmitCaseForm(ctx) {
    const {
      vehicleName,
      categoryIndex,
      modelIndex,
      videoPath,
      categoryValueArray,
      categoryArray,
      modelArray,
      targetSn
    } = ctx || {};
    this.showMyLoading('上传中...');
    console.log('🔵 [提交] 开始上传视频(COS)...');
    getCosUpload()
      .uploadVideoToCos(videoPath, 'video/user', {
        knownSize: this.data.videoKnownSize || undefined
      })
      .then(async publicUrl => {
        console.log('🔵 [提交] 视频上传成功，URL:', publicUrl);
        // 🆕 记录用户投稿次数：每次提交自增 1（管理员后台可见）
        // 方案：先查询该 openid 历史投稿次数 count，再写入本次的 applyCount = count + 1
        // 注意：这里用云函数 login 获取 openid（与项目现有逻辑保持一致）
        // 🔴 获取用户 openid（用于未绑定设备时的延保记录）
        let userOpenid = null;
        try {
          const loginRes = await wx.cloud.callFunction({ name: 'login' });
          userOpenid = loginRes.result?.openid;
        } catch (err) {
          console.error('❌ [提交] 获取 openid 失败:', err);
        }

        const countRes = await db.collection('video').where({ sn: targetSn }).count();
        const applyCount = (countRes.total || 0) + 1;

        const submitData = {
          vehicleName, 
          category: categoryValueArray[categoryIndex], 
          categoryName: categoryArray[categoryIndex], 
          model: modelArray[modelIndex], 
          videoFileID: publicUrl, 
          createTime: db.serverDate(), 
          status: 0, // 0:审核中
          sn: targetSn,
          openid: userOpenid || null,
          applyCount: applyCount
        };
        console.log('🔵 [提交] 准备写入数据库，data:', submitData);
        
        db.collection('video').add({
          data: submitData,
          success: (dbRes) => {
            console.log('🔵 [提交] 数据库写入成功，_id:', dbRes._id);
            notifyAdminTodo('case_video', `${submitData.model || ''} / ${targetSn || ''}`);
            this.hideMyLoading(); 
            this.setData({ 
              isSubmitting: false, 
              showForm: false, 
              showSuccess: true, 
              videoPath: null,
              videoKnownSize: null
            }); 
          },
          fail: (dbErr) => {
            console.error('❌ [提交] 数据库写入失败:', dbErr);
            this.hideMyLoading();
            this.setData({ isSubmitting: false });
            this.showFormErrorWithShake('保存失败，请重试');
          }
        });
      })
      .catch((err) => {
        console.error('❌ [提交] 视频上传失败:', err);
        this.hideMyLoading();
        this.setData({ isSubmitting: false });
        this.showFormErrorWithShake((err && err.message) || '上传失败，请重试');
      });
  },

  // 🆕 关闭用户表单（带收缩退出动画）
  closeForm() {
    this.setData({ formClosing: true });
    setTimeout(() => {
      this.setData({
        showForm: false,
        formClosing: false,
        videoPath: null, // 清空临时视频路径
        videoKnownSize: null,
        // 清空表单数据（可选）
        vehicleName: '',
        categoryIndex: null, // 🔴 修复：按照 zj4 的写法，重置为 null
        modelIndex: null, // 🔴 修复：按照 zj4 的写法，重置为 null
        selectedSnIndex: null
      });
    }, 420);
  },

  _closeWithAnimation(visibleKey, closingKey, afterClose, duration = 400) {
    if (!this.data[visibleKey] || this.data[closingKey]) return;
    this.setData({ [closingKey]: true });
    setTimeout(() => {
      const patch = {
        [visibleKey]: false,
        [closingKey]: false
      };
      if (typeof afterClose === 'function') afterClose(patch);
      this.setData(patch);
    }, duration);
  },

  _showDeleteCaseResult(result) {
    const cosDeleted = result && typeof result.cosDeleted === 'number' ? result.cosDeleted : 0;
    const cosSkipped = !!(result && result.cosSkipped);
    const cosKeysFound = (result && result.cosKeysFound) || [];
    const mediaHints = (result && result.mediaHints) || [];
    let detail = '• 案例库记录：已删除\n';
    if (cosDeleted > 0) {
      detail += `• COS 存储桶：已删除 ${cosDeleted} 个文件\n`;
      if (cosKeysFound.length) {
        detail += `• 路径：${cosKeysFound.join('、')}`;
      }
    } else if (cosSkipped) {
      detail += '• COS 存储桶：未配置环境变量，未删文件';
    } else if (mediaHints.length > 0) {
      detail += '• COS 存储桶：未识别到可删路径\n';
      detail += `• 库内链接：${mediaHints.map((h) => h.field).join('、')}\n`;
      detail += '请重新部署 adminUpdateVideoGo，或在控制台核对 videoFileID 格式';
    } else {
      detail += '• COS 存储桶：该记录无视频/封面链接';
    }
    wx.showModal({
      title: '删除完成',
      content: detail,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  deleteCase(e) {
     const id = e.currentTarget.dataset.id;
     this._showCustomModal({ title:'确认删除', content:'不可恢复', confirmColor:'#FF3B30', success:(res)=>{
       if (!res.confirm) return;
       this._callAdminVideoGo({ action: 'remove', docId: id })
         .then((result) => {
           this.fetchCloudData();
           this._showDeleteCaseResult(result);
         })
         .catch((err) => {
           const msg = String((err && err.message) || (err && err.errMsg) || '');
           const notDeployed = msg.indexOf('FUNCTION_NOT_FOUND') >= 0
             || msg.indexOf('FunctionName') >= 0
             || msg.indexOf('-501000') >= 0;
           if (!notDeployed) {
             console.error('[case.js] 删除失败:', err);
             if (dbPermissionHint.isPermissionDenied(err)) {
               dbPermissionHint.toastPermissionDenied('video_go');
               return;
             }
             this._showCustomToast(msg || '删除失败', 'none');
             return;
           }
           db.collection('video_go').doc(id).remove()
             .then(() => {
               this.fetchCloudData();
               this._showCustomToast('已删除');
             })
             .catch((dbErr) => {
               console.error('[case.js] 删除失败:', dbErr);
               if (dbPermissionHint.isPermissionDenied(dbErr)) {
                 dbPermissionHint.toastPermissionDenied('video_go');
                 return;
               }
               this._showCustomToast('删除失败', 'none');
             });
         });
     }});
  },
  
  // 选视频/封面
  chooseAdminVideo() {
    wx.chooseMedia({ count:1, mediaType:['video'], sourceType:['album'], success:(res)=>{
       const t = res.tempFiles[0];
       this.setData({
         adminVideoPath: t.tempFilePath,
         adminThumbPath: t.thumbTempFilePath || this.data.adminThumbPath,
         adminVideoKnownSize: typeof t.size === 'number' ? t.size : null
       });
    }});
  },
  chooseAdminCover() {
    getShopImagePrepare().chooseAndPrepare('caseThumb', { sourceType: ['album'] }).then((path) => {
      this.setData({ adminThumbPath: path });
    }).catch((err) => {
      if (!getShopImagePrepare().isCropCancelled(err)) console.error('[case] chooseAdminCover', err);
    });
  },

  // 基础交互
  handleTitleTap() {
    // 废弃旧逻辑，不再使用
  },
  /** 点左上角 ×：先摘 cover-view 再卸播放器，避免水印/关闭钮「慢一步」 */
  closeVideoPlayer() {
    if (this._caseFullscreenExitPending) return;
    this._caseFullscreenExitPending = true;
    this._forceStopCaseBgm();
    this._stopCaseFsProgressUiLoop();
    this._stopCaseFullscreenVideoPlayback();
    this.setData({ caseFullscreenCoverHidden: true }, () => {
      wx.nextTick(() => {
        this._resetCaseFullscreenPlayerState();
        this._caseFullscreenExitPending = false;
      });
    });
  },

  _stopCaseFullscreenVideoPlayback() {
    try {
      const ctx = wx.createVideoContext('caseFullscreenVideo', this);
      if (!ctx) return;
      if (typeof ctx.pause === 'function') ctx.pause();
      if (typeof ctx.stop === 'function') ctx.stop();
    } catch (e) {}
  },

  _resetCaseFullscreenPlayerState() {
    this._forceStopCaseBgm();
    this._stopCaseFullscreenVideoPlayback();
    this._stopCaseFsProgressUiLoop();
    this._caseFullscreenSeeking = false;
    this._caseFullscreenBarTouchActive = false;
    this._caseFullscreenProgressGen = (this._caseFullscreenProgressGen || 0) + 1;
    this._caseFullscreenExitTimer && clearTimeout(this._caseFullscreenExitTimer);
    this._caseFullscreenExitTimer = null;
    this._caseFullscreenExitPending = false;
    this._caseFullscreenTrackRect = null;
    this._caseFullscreenTrackRectCached = null;
    this._fsGestureMode = null;
    this.setData({
      showVideoPlayer: false,
      caseFullscreenExiting: false,
      caseFullscreenCoverHidden: false,
      currentVideo: null,
      caseFullscreenDuration: 0,
      caseFullscreenProgressPercent: 0,
      caseFullscreenProgressRatio: 0,
      caseFullscreenCurrentStr: '00:00',
      caseFullscreenDurationStr: '00:00',
      caseFullscreenPaused: false,
      caseFullscreenEnded: false,
      caseFullscreenBuffering: false,
      caseFullscreenInitialLoading: false,
      caseFullscreenInitialTime: 0,
      caseFsVideoAlive: true,
      caseFullscreenChromeReady: false,
      caseFullscreenTy: 0,
      caseFullscreenNoTrans: true
    });
    this._caseBgmStartedForCurrent = false;
    this._caseFsPlaybackStarted = false;
    this._clearCaseFullscreenReadyTimers();
  },

  closeVideoPlayerAnimated() {
    if (this._caseFullscreenExitPending) return;
    this._caseFullscreenExitPending = true;
    this._forceStopCaseBgm();
    this._stopCaseFsProgressUiLoop();
    this._stopCaseFullscreenVideoPlayback();
    wx.nextTick(() => this._stopCaseFullscreenVideoPlayback());
    const win = wx.getWindowInfo();
    const h = win.windowHeight || 667;
    const from = Number(this.data.caseFullscreenTy) || 0;
    // 底栏/列表始终挂载；仅全屏层下滑，避免关闭后 Tab 才「长出来」
    this.setData({
      caseFullscreenExiting: true,
      caseFullscreenNoTrans: false,
      caseFullscreenTy: from
    });
    wx.nextTick(() => {
      this.setData({ caseFullscreenTy: h });
      if (this._caseFullscreenExitTimer) clearTimeout(this._caseFullscreenExitTimer);
        this._caseFullscreenExitTimer = setTimeout(() => {
        this._caseFullscreenExitTimer = null;
        this.setData({ caseFullscreenCoverHidden: true }, () => {
          wx.nextTick(() => {
            this._resetCaseFullscreenPlayerState();
            this._caseFullscreenExitPending = false;
          });
        });
      }, 420);
    });
  },

  _formatCaseFullscreenClock(sec) {
    const s = Math.floor(Number(sec) || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  },

  onCaseFullscreenLoadedMeta(e) {
    const dur = Number((e.detail && e.detail.duration) || 0) || 0;
    if (dur > 0 && !this._caseFsDurationApplied) {
      this._caseFsDurationApplied = true;
      this.setData({
        caseFullscreenDuration: dur,
        caseFullscreenDurationStr: this._formatCaseFullscreenClock(dur)
      });
    }
    // 卡顿重连后：seek 回打断前进度
    const resumeAt = Number(this._caseFsResumeAfterRecover);
    if (resumeAt > 0.5) {
      this._caseFsResumeAfterRecover = 0;
      this._caseFsResumeGraceUntil = Date.now() + 2500;
      try {
        const ctx = wx.createVideoContext('caseFullscreenVideo', this);
        if (ctx && typeof ctx.seek === 'function') ctx.seek(resumeAt);
      } catch (err) {}
    }
    this._kickCaseFullscreenAutoplay(1);
    // 仅补 play，不因 metadata 提前启 BGM / 强制出画
  },

  onCaseFullscreenLoadedData() {
    this._onCaseFullscreenPlaybackStarted();
  },

  onCaseFullscreenCanPlay() {
    this._onCaseFullscreenPlaybackStarted();
  },

  onCaseFullscreenProgress(e) {
    const buffered = Number((e.detail && e.detail.buffered) || 0) || 0;
    if (buffered > 0 && !this._caseFsPlaybackStarted) {
      this._kickCaseFullscreenAutoplay(0);
    }
  },

  /** 部分机型 autoplay 不触发 play 事件，主动补一次 play */
  _kickCaseFullscreenAutoplay(retries) {
    if (!this.data.showVideoPlayer || this.data.caseFullscreenPaused || this.data.caseFullscreenEnded) return;
    try {
      const ctx = wx.createVideoContext('caseFullscreenVideo', this);
      if (ctx && typeof ctx.play === 'function') ctx.play();
    } catch (err) {}
    const left = Number(retries) || 0;
    if (left > 0) {
      setTimeout(() => this._kickCaseFullscreenAutoplay(left - 1), 320);
    }
  },

  _clearCaseFullscreenStuckTimer() {
    if (this._caseFsStuckTimer) {
      clearTimeout(this._caseFsStuckTimer);
      this._caseFsStuckTimer = null;
    }
  },

  _clearCaseFullscreenStallRecover() {
    if (this._caseFsStallTimer) {
      clearTimeout(this._caseFsStallTimer);
      this._caseFsStallTimer = null;
    }
  },

  /** 中途一直 buffering：销毁重建原生 video + 换线路，效果等同关掉再开 */
  _scheduleCaseFullscreenStallRecover() {
    if (this._caseFsStallTimer) return;
    this._caseFsStallTimer = setTimeout(() => {
      this._caseFsStallTimer = null;
      this._recoverCaseFullscreenStall();
    }, CASE_FS_STALL_RECOVER_MS);
  },

  _remountCaseFullscreenVideo(nextUrl, resumeAt) {
    const url = String(nextUrl || '').trim();
    if (!url) return;
    const at = Math.max(0, Number(resumeAt) || 0);
    this._caseFsResumeAfterRecover = at;
    this._caseFsResumeGraceUntil = Date.now() + 2800;
    this._pauseCaseBgm();
    // 重挂后必须重新走「出画」流程，否则 MT 转圈/BGM 门控会卡死
    this._caseFsPlaybackStarted = false;
    this._caseBgmStartedForCurrent = false;
    this._caseFsStableTicks = 0;
    this._caseFsLastStableCur = -1;
    this._caseFsLastProgressAt = 0;
    // 先卸掉原生组件，再挂上——这就是「关了再进」能好的本质
    this.setData({
      caseFsVideoAlive: false,
      caseFullscreenBuffering: at > 0.05,
      caseFullscreenInitialLoading: at <= 0.05,
      caseFullscreenInitialTime: at > 0.5 ? at : 0
    }, () => {
      setTimeout(() => {
        if (!this.data.showVideoPlayer) return;
        this.setData({
          caseFsVideoAlive: true,
          'currentVideo.videoUrl': url,
          caseFullscreenInitialTime: at > 0.5 ? at : 0
        }, () => {
          setTimeout(() => this._kickCaseFullscreenAutoplay(3), 80);
        });
      }, 60);
    });
  },

  _recoverCaseFullscreenStall() {
    if (!this.data.showVideoPlayer || this.data.caseFullscreenPaused || this.data.caseFullscreenEnded) return;
    if (!this.data.caseFullscreenBuffering && !this.data.caseFullscreenInitialLoading) return;
    // 进度还在走：只是偶发 waiting，不要重挂（重挂会更卡，且 MT/BGM 易错乱）
    const lastProg = Number(this._caseFsLastProgressAt) || 0;
    if (lastProg > 0 && Date.now() - lastProg < CASE_FS_STALL_RECOVER_MS - 500) {
      if (this.data.caseFullscreenBuffering) {
        this.data.caseFullscreenBuffering = false;
        this.setData({ caseFullscreenBuffering: false });
      }
      return;
    }
    const cur = this.data.currentVideo;
    if (!cur || !cur.videoUrl) return;
    const tries = Number(this._caseFsStallRecoverCount || 0);
    if (tries >= CASE_FS_STALL_RECOVER_MAX) {
      this._showCustomToast('网络较慢，视频加载困难', 'none');
      return;
    }
    this._caseFsStallRecoverCount = tries + 1;
    const resumeAt = Math.max(0, Number(this._caseFsPlaybackCur) || 0);
    // 第 1 次优先同 URL 重挂载（清掉卡死的连接）；之后再切加速/地域
    const retryUrl = tries === 0 ? cur.videoUrl : (this._buildRetryVideoUrl(cur.videoUrl) || cur.videoUrl);
    this._remountCaseFullscreenVideo(retryUrl, resumeAt);
  },

  _clearCaseFullscreenLoadingRecovery() {
    if (this._caseFsLoadingRecoveryTimer) {
      clearInterval(this._caseFsLoadingRecoveryTimer);
      this._caseFsLoadingRecoveryTimer = null;
    }
  },

  _clearCaseFullscreenReadyTimers() {
    this._clearCaseFullscreenStuckTimer();
    this._clearCaseFullscreenStallRecover();
    if (this._caseFsMetaReadyTimer) {
      clearTimeout(this._caseFsMetaReadyTimer);
      this._caseFsMetaReadyTimer = null;
    }
    this._clearCaseFullscreenLoadingRecovery();
  },

  /** 打开后若迟迟未出画：更快强制重挂载（不必等用户手动关再开） */
  _scheduleCaseFullscreenStuckCheck() {
    this._clearCaseFullscreenStuckTimer();
    this._caseFsStuckTimer = setTimeout(() => {
      this._caseFsStuckTimer = null;
      if (this._caseFsPlaybackStarted || !this.data.showVideoPlayer) return;
      if (this.data.caseFullscreenPaused || this.data.caseFullscreenCoverHidden) return;
      this._kickCaseFullscreenAutoplay(2);
      if (!this.data.caseFullscreenInitialLoading) {
        this.setData({ caseFullscreenInitialLoading: true });
      }
      this._startCaseFullscreenLoadingRecovery();
      // 首次打开卡住：直接走「关了再进」同款重挂载
      this._caseFsStuckTimer = setTimeout(() => {
        this._caseFsStuckTimer = null;
        if (this._caseFsPlaybackStarted || !this.data.showVideoPlayer) return;
        if (this.data.caseFullscreenPaused) return;
        this._recoverCaseFullscreenStall();
      }, Math.max(400, CASE_FS_FIRST_OPEN_REMOUNT_MS - 800));
    }, 800);
  },

  /** 加载圈已显示但仍未收到播放事件时，轮询补 play；仍不行则换线路重挂载 */
  _startCaseFullscreenLoadingRecovery() {
    this._clearCaseFullscreenLoadingRecovery();
    let attempts = 0;
    this._caseFsLoadingRecoveryTimer = setInterval(() => {
      attempts += 1;
      if (!this.data.showVideoPlayer || this._caseFsPlaybackStarted) {
        this._clearCaseFullscreenLoadingRecovery();
        return;
      }
      this._kickCaseFullscreenAutoplay(0);
      if (attempts === 6) {
        this._recoverCaseFullscreenStall();
        return;
      }
      // 长时间仍无事件：只关掉加载圈，避免假「已开播」拉起 BGM
      if (attempts >= 12 && this.data.caseFullscreenInitialLoading) {
        this.setData({ caseFullscreenInitialLoading: false });
        this._clearCaseFullscreenLoadingRecovery();
        return;
      }
      if (attempts >= 20) this._clearCaseFullscreenLoadingRecovery();
    }, 400);
  },

  /** 停止进度 UI 定时器（避免 timeupdate 高频 setData 导致 video/cover-view 卡顿） */
  _stopCaseFsProgressUiLoop() {
    if (this._caseFsProgressUiTimer) {
      clearInterval(this._caseFsProgressUiTimer);
      this._caseFsProgressUiTimer = null;
    }
    if (this._caseFsWaitingTimer) {
      clearTimeout(this._caseFsWaitingTimer);
      this._caseFsWaitingTimer = null;
    }
    if (this._caseFsSeekResumeTimer) {
      clearTimeout(this._caseFsSeekResumeTimer);
      this._caseFsSeekResumeTimer = null;
    }
    this._clearCaseFullscreenReadyTimers();
    if (this._caseFsChromeTimer) {
      clearTimeout(this._caseFsChromeTimer);
      this._caseFsChromeTimer = null;
    }
    this._caseFsPlaybackCur = 0;
    this._caseFsPlaybackDur = 0;
    this._caseFsLastUiPctKey = -1;
    this._caseFsLastUiSecKey = -1;
  },

  _startCaseFsProgressUiLoop() {
    if (this._caseFsProgressUiTimer) {
      clearInterval(this._caseFsProgressUiTimer);
      this._caseFsProgressUiTimer = null;
    }
    this._caseFsProgressUiTimer = setInterval(() => {
      if (!this.data.showVideoPlayer || this.data.caseFullscreenPaused || this._caseFullscreenSeeking) return;
      this._flushCaseFsProgressUi(false);
    }, 2000);
  },

  /** 视频 UI 就绪：关加载条；BGM 必须等 timeupdate 稳定推进后再启 */
  _onCaseFullscreenPlaybackStarted() {
    if (this._caseFsPlaybackStarted || !this.data.showVideoPlayer) return;
    this._caseFsPlaybackStarted = true;
    this._clearCaseFullscreenReadyTimers();
    this._clearCaseFullscreenLoadingState(() => {
      if (!this.data.caseFullscreenChromeReady) {
        this.refreshVideoWatermarkNickname();
        this.setData({ caseFullscreenChromeReady: true }, () => {
          wx.nextTick(() => this._refreshCaseFullscreenTrackRect());
        });
      }
      if (!this._caseFsProgressUiTimer && !this.data.caseFullscreenPaused) {
        this._startCaseFsProgressUiLoop();
      }
    });
  },

  /** 将进度条/时间刷到界面；播放中由定时器调用，拖拽时 force=true 立即刷新 */
  _flushCaseFsProgressUi(force) {
    const cur = Number(this._caseFsPlaybackCur) || 0;
    const dur = Number(this._caseFsPlaybackDur) || Number(this.data.caseFullscreenDuration) || 0;
    if (dur <= 0 && !force) return;
    const ratio = dur > 0 ? Math.min(1, cur / dur) : 0;
    const pct = ratio * 100;
    const curStr = this._formatCaseFullscreenClock(cur);
    const pctKey = Math.round(pct);
    const secKey = Math.floor(cur);
    if (
      !force &&
      pctKey === this._caseFsLastUiPctKey &&
      secKey === this._caseFsLastUiSecKey
    ) {
      return;
    }
    this._caseFsLastUiPctKey = pctKey;
    this._caseFsLastUiSecKey = secKey;
    this.setData({
      caseFullscreenProgressPercent: pct,
      caseFullscreenProgressRatio: ratio,
      caseFullscreenCurrentStr: curStr
    });
  },

  /** 缓存进度条轨道矩形；避免首次触摸时 query 尚未返回只能用整屏宽度估算导致拖拽乱跳 */
  _refreshCaseFullscreenTrackRect() {
    if (!this.data.showVideoPlayer) return;
    wx.createSelectorQuery()
      .in(this)
      .select('#case-fullscreen-track-inner')
      .boundingClientRect((rect) => {
        if (rect && rect.width > 0) {
          this._caseFullscreenTrackRectCached = rect;
          this._caseFullscreenTrackRect = rect;
        }
      })
      .exec();
  },

  onCaseFullscreenTimeUpdate(e) {
    if (!this.data.showVideoPlayer || this._caseFullscreenSeeking) return;

    const cur = Number((e.detail && e.detail.currentTime) || 0) || 0;
    let dur = Number((e.detail && e.detail.duration) || 0) || 0;
    if (dur <= 0) dur = Number(this.data.caseFullscreenDuration) || 0;

    this._caseFsPlaybackCur = cur;
    this._caseFsPlaybackDur = dur;
    this._caseFsLastProgressAt = Date.now();

    if (this._caseFsWaitingTimer) {
      clearTimeout(this._caseFsWaitingTimer);
      this._caseFsWaitingTimer = null;
    }
    this._clearCaseFullscreenStallRecover();

    // 进度在走 = 已出画：必须清掉 MT 转圈，否则会「画面在播、中间还在转、也没 BGM」
    if (cur > 0.05) {
      const patch = {};
      if (this.data.caseFullscreenInitialLoading) {
        this.data.caseFullscreenInitialLoading = false;
        patch.caseFullscreenInitialLoading = false;
      }
      if (this.data.caseFullscreenBuffering) {
        this.data.caseFullscreenBuffering = false;
        patch.caseFullscreenBuffering = false;
      }
      if (Object.keys(patch).length) this.setData(patch);
      if (!this._caseFsPlaybackStarted) {
        this._onCaseFullscreenPlaybackStarted();
      }
    }

    // 画面时间轴持续推进 → 才允许启 BGM
    if (
      this._caseBgmSessionActive &&
      !this.data.caseFullscreenPaused &&
      !this.data.caseFullscreenInitialLoading &&
      !this.data.caseFullscreenBuffering &&
      cur > 0.08
    ) {
      const last = Number(this._caseFsLastStableCur);
      if (!(last >= 0) || cur > last + 0.03) {
        this._caseFsStableTicks = (this._caseFsStableTicks || 0) + 1;
        this._caseFsLastStableCur = cur;
      }
      if (!this._caseBgmStartedForCurrent && (this._caseFsStableTicks || 0) >= CASE_BGM_STABLE_TICKS) {
        this._startCaseBgmAfterVideoReady(false, { quick: true });
      } else if (this._caseBgmStartedForCurrent && !this._caseBgmPlaying) {
        this._resumeCaseBgm();
      }
    }

    const now = Date.now();
    if (now - (this._caseFsLastTuHandleAt || 0) < 300) return;
    this._caseFsLastTuHandleAt = now;

    if (dur > 0 && !this._caseFsDurationApplied && Math.abs(dur - (Number(this.data.caseFullscreenDuration) || 0)) > 0.25) {
      this._caseFsDurationApplied = true;
      this.setData({
        caseFullscreenDuration: dur,
        caseFullscreenDurationStr: this._formatCaseFullscreenClock(dur)
      });
    }
  },

  toggleCaseFullscreenPlay() {
    if (this.data.caseFullscreenEnded) {
      this._replayCaseFullscreenVideo();
      return;
    }
    const ctx = wx.createVideoContext('caseFullscreenVideo', this);
    if (!ctx) return;
    if (this.data.caseFullscreenPaused) {
      ctx.play();
    } else {
      ctx.pause();
    }
  },

  onCaseFullscreenCenterTap() {
    this.toggleCaseFullscreenPlay();
  },

  _replayCaseFullscreenVideo() {
    const ctx = wx.createVideoContext('caseFullscreenVideo', this);
    if (!ctx) return;
    this._caseFsPlaybackCur = 0;
    this._caseFsLastUiPctKey = -1;
    this._caseFsLastUiSecKey = -1;
    this._caseFsPlaybackStarted = false;
    this._resetCaseBgmStableGate();
    this.setData({
      caseFullscreenEnded: false,
      caseFullscreenPaused: false,
      caseFullscreenProgressPercent: 0,
      caseFullscreenProgressRatio: 0,
      caseFullscreenCurrentStr: '00:00',
      caseFullscreenBuffering: false,
      caseFullscreenInitialLoading: false
    }, () => {
      try {
        if (typeof ctx.seek === 'function') ctx.seek(0);
        ctx.play();
      } catch (e) {}
      this._beginCaseBgmSession();
    });
  },

  onCaseFullscreenEnded() {
    if (!this.data.showVideoPlayer || this.data.caseFullscreenEnded) return;
    this._stopCaseFsProgressUiLoop();
    this._forceStopCaseBgm();
    const dur = Number(this.data.caseFullscreenDuration) || Number(this._caseFsPlaybackDur) || 0;
    const patch = {
      caseFullscreenEnded: true,
      caseFullscreenPaused: true
    };
    if (dur > 0) {
      patch.caseFullscreenProgressPercent = 100;
      patch.caseFullscreenProgressRatio = 1;
      patch.caseFullscreenCurrentStr = this._formatCaseFullscreenClock(dur);
      this._caseFsPlaybackCur = dur;
    }
    this.setData(patch);
  },

  _clearCaseFullscreenLoadingState(done) {
    if (this._caseFsWaitingTimer) {
      clearTimeout(this._caseFsWaitingTimer);
      this._caseFsWaitingTimer = null;
    }
    const patch = {};
    if (this.data.caseFullscreenInitialLoading) patch.caseFullscreenInitialLoading = false;
    if (this.data.caseFullscreenBuffering) patch.caseFullscreenBuffering = false;
    if (Object.keys(patch).length) {
      this.setData(patch, () => {
        if (typeof done === 'function') done();
      });
      return;
    }
    if (typeof done === 'function') done();
  },

  onCaseFullscreenPlayEvt() {
    const wasPaused = !!this.data.caseFullscreenPaused;
    if (!wasPaused && !this._caseFsPlaybackStarted) {
      this._onCaseFullscreenPlaybackStarted();
      return;
    }
    if (wasPaused || this.data.caseFullscreenEnded) {
      this._caseFsResumeGraceUntil = Date.now() + 2200;
      this._clearCaseFullscreenLoadingState(() => {
        this.setData({ caseFullscreenPaused: false, caseFullscreenEnded: false }, () => {
          this._resumeCaseBgm();
          if (!this._caseFsProgressUiTimer && this.data.caseFullscreenChromeReady) {
            this._startCaseFsProgressUiLoop();
          }
        });
      });
      return;
    }
    this.setData({ caseFullscreenPaused: false }, () => {
      this._resumeCaseBgm();
      if (!this._caseFsProgressUiTimer && this.data.caseFullscreenChromeReady) {
        this._startCaseFsProgressUiLoop();
      }
    });
  },

  onCaseFullscreenPauseEvt() {
    if (this.data.caseFullscreenEnded) return;
    this._stopCaseFsProgressUiLoop();
    this.setData({ caseFullscreenPaused: true }, () => this._pauseCaseBgm());
  },

  onCaseFullscreenWaiting() {
    if (Date.now() < (this._caseFsResumeGraceUntil || 0)) return;
    if (this.data.caseFullscreenPaused || this.data.caseFullscreenEnded) return;
    // 立刻停 BGM；但一卡一顿时不要马上甩 MT / 重挂，否则会出现「画面在播却一直转」
    this._pauseCaseBgm();
    if (this._caseFsWaitingTimer) clearTimeout(this._caseFsWaitingTimer);
    this._caseFsWaitingTimer = setTimeout(() => {
      this._caseFsWaitingTimer = null;
      if (!this.data.showVideoPlayer || this.data.caseFullscreenPaused) return;
      const lastProg = Number(this._caseFsLastProgressAt) || 0;
      // 最近还在推进：只是网速跟不上，别盖 MT、别重挂
      if (lastProg > 0 && Date.now() - lastProg < 800) return;
      if (!this.data.caseFullscreenInitialLoading && !this.data.caseFullscreenBuffering) {
        this.setData({ caseFullscreenBuffering: true });
      }
      this._scheduleCaseFullscreenStallRecover();
    }, CASE_FS_WAITING_UI_MS);
  },

  onCaseFullscreenProgressTouchStart(e) {
    this._caseFullscreenBarTouchActive = true;
    this._caseFullscreenSeeking = true;
    this._pauseCaseBgm();
    const gen = (this._caseFullscreenProgressGen = (this._caseFullscreenProgressGen || 0) + 1);
    const cached = this._caseFullscreenTrackRectCached;
    if (cached && cached.width > 0) {
      this._caseFullscreenTrackRect = cached;
      this._applyCaseFullscreenSeekFromTouch(e);
    }
    wx.createSelectorQuery()
      .in(this)
      .select('#case-fullscreen-track-inner')
      .boundingClientRect((rect) => {
        if (this._caseFullscreenProgressGen !== gen) return;
        if (rect && rect.width > 0) {
          this._caseFullscreenTrackRectCached = rect;
          this._caseFullscreenTrackRect = rect;
          // 仅刷新几何，禁止用 touchstart 的旧事件再 seek（晚到会把已拖动的进度拽回）
        }
      })
      .exec();
  },

  onCaseFullscreenProgressTouchMove(e) {
    if (!this._caseFullscreenSeeking) return;
    this._applyCaseFullscreenSeekFromTouch(e);
  },

  onCaseFullscreenProgressTouchEnd(e) {
    if (this._caseFullscreenSeeking && e) {
      this._applyCaseFullscreenSeekFromTouch(e);
    }
    this._caseFullscreenProgressGen = (this._caseFullscreenProgressGen || 0) + 1;
    this._caseFullscreenSeeking = false;
    this._caseFullscreenTrackRect = null;
    this._flushCaseFsProgressUi(true);
    this._finishCaseFullscreenSeek();
    setTimeout(() => {
      this._caseFullscreenBarTouchActive = false;
    }, 120);
  },

  /** 根据触点 X 计算进度条内比例（优先当前拖拽 rect，其次缓存的轨道） */
  _caseFullscreenRatioFromClientX(x) {
    const dur = Number(this.data.caseFullscreenDuration) || 0;
    if (dur <= 0 || x === undefined || x === null) return null;
    const rect =
      this._caseFullscreenTrackRect && this._caseFullscreenTrackRect.width > 0
        ? this._caseFullscreenTrackRect
        : this._caseFullscreenTrackRectCached && this._caseFullscreenTrackRectCached.width > 0
          ? this._caseFullscreenTrackRectCached
          : null;
    let ratio;
    if (rect) {
      ratio = (x - rect.left) / rect.width;
    } else {
      const win = wx.getWindowInfo();
      ratio = x / (win.windowWidth || 375);
    }
    return Math.max(0, Math.min(1, ratio));
  },

  _applyCaseFullscreenSeekFromTouch(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!touch) return;
    const dur = Number(this.data.caseFullscreenDuration) || 0;
    if (dur <= 0) return;
    const x = touch.clientX != null ? touch.clientX : touch.pageX;
    const ratio = this._caseFullscreenRatioFromClientX(x);
    if (ratio == null) return;
    const seekSec = ratio * dur;
    this._caseFsPlaybackCur = seekSec;
    this._caseFsPlaybackDur = dur;
    const isEnd = !!(e.changedTouches && e.changedTouches[0]);
    this._seekCaseFullscreenByRatio(ratio, { force: isEnd });
  },

  /** 拖拽/seek 结束后恢复 BGM（seek 会触发 waiting，需短延迟 + 宽限期） */
  _finishCaseFullscreenSeek() {
    if (!this.data.showVideoPlayer || this.data.caseFullscreenPaused) return;
    this._caseFsResumeGraceUntil = Date.now() + 2500;
    if (this._caseFsSeekResumeTimer) {
      clearTimeout(this._caseFsSeekResumeTimer);
      this._caseFsSeekResumeTimer = null;
    }
    this._caseFsSeekResumeTimer = setTimeout(() => {
      this._caseFsSeekResumeTimer = null;
      if (!this.data.showVideoPlayer || this.data.caseFullscreenPaused) return;
      this._resumeCaseBgm();
    }, 200);
  },

  _seekCaseFullscreenByRatio(ratio, opts = {}) {
    const dur = Number(this.data.caseFullscreenDuration) || 0;
    if (dur <= 0) return;
    const r = Math.max(0, Math.min(1, ratio));
    const seekSec = r * dur;
    const now = Date.now();
    if (!opts.force && now - (this._caseFsLastSeekAt || 0) < 150) {
      this._flushCaseFsProgressUi(true);
      return;
    }
    this._caseFsLastSeekAt = now;
    try {
      const ctx = wx.createVideoContext('caseFullscreenVideo', this);
      if (ctx && typeof ctx.seek === 'function') ctx.seek(seekSec);
    } catch (err) {}
    this._caseFsPlaybackCur = seekSec;
    const pct = r * 100;
    this.setData({
      caseFullscreenProgressPercent: pct,
      caseFullscreenProgressRatio: r,
      caseFullscreenCurrentStr: this._formatCaseFullscreenClock(seekSec)
    });
    this._caseFsLastUiPctKey = Math.round(pct);
    this._caseFsLastUiSecKey = Math.floor(seekSec);
  },

  onCaseFullscreenOverlayTouchStart(e) {
    if (!this.data.showVideoPlayer || this._caseFullscreenBarTouchActive) return;
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t) return;
    this._fsOx = t.pageX != null ? t.pageX : t.clientX;
    this._fsOy = t.clientY != null ? t.clientY : t.pageY;
    this._fsGestureMode = null;
    this._fsOverlayDidGesture = false;
    const win = wx.getWindowInfo();
    this._fsWinH = win.windowHeight || 667;
    this._fsWinW = win.windowWidth || 375;
  },

  onCaseFullscreenOverlayTouchMove(e) {
    if (!this.data.showVideoPlayer || this._caseFullscreenBarTouchActive) return;
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t) return;
    const dx = (t.pageX != null ? t.pageX : t.clientX) - (this._fsOx || 0);
    const dy = (t.clientY != null ? t.clientY : t.pageY) - (this._fsOy || 0);
    if (!this._fsGestureMode) {
      if (dy > 12 && dy > Math.abs(dx) * 1.15) {
        this._fsGestureMode = 'pull';
      } else if (Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        this._fsGestureMode = 'scrub';
        this._caseFullscreenSeeking = true;
        this._pauseCaseBgm();
      }
    }
    if (this._fsGestureMode === 'pull' || this._fsGestureMode === 'scrub') {
      this._fsOverlayDidGesture = true;
    }
    if (this._fsGestureMode === 'pull') {
      const ty = Math.min(Math.max(0, dy * 0.58), this._fsWinH * 0.42);
      this.setData({ caseFullscreenTy: ty, caseFullscreenNoTrans: true });
    } else if (this._fsGestureMode === 'scrub') {
      const px = t.pageX != null ? t.pageX : t.clientX;
      const ratio = this._caseFullscreenRatioFromClientX(px);
      if (ratio != null) this._seekCaseFullscreenByRatio(ratio);
    }
  },

  onCaseFullscreenOverlayTouchEnd(e) {
    if (!this.data.showVideoPlayer || this._caseFullscreenBarTouchActive) return;

    if (this._fsGestureMode === 'pull') {
      const ty = Number(this.data.caseFullscreenTy) || 0;
      if (ty > 68) {
        this.closeVideoPlayerAnimated();
      } else {
        this.setData({ caseFullscreenNoTrans: false, caseFullscreenTy: 0 });
      }
      this._fsGestureMode = null;
      return;
    }
    if (this._fsGestureMode === 'scrub') {
      this._caseFullscreenSeeking = false;
      this._fsGestureMode = null;
      this._flushCaseFsProgressUi(true);
      this._finishCaseFullscreenSeek();
      return;
    }

    const t = (e.changedTouches && e.changedTouches[0]) || {};
    const dx = (t.pageX != null ? t.pageX : this._fsOx) - (this._fsOx || 0);
    const dy = (t.clientY != null ? t.clientY : this._fsOy) - (this._fsOy || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 24 && !this._fsOverlayDidGesture) {
      this.toggleCaseFullscreenPlay();
    }
    this._fsGestureMode = null;
  },

  // 🔴 视频预览相关函数
  closeVideoPreview() {
    // 停止视频播放
    const videoContext = wx.createVideoContext('caseVideoPreviewPlayer');
    if (videoContext) {
      videoContext.pause();
    }
    
    this._closeWithAnimation('showVideoPreview', 'videoPreviewClosing', (patch) => {
      patch.isVideoPlaying = true;
    });
  },

  // 重新选择视频（关闭预览，返回上传选项）
  rechooseVideo() {
    // 停止视频播放
    const videoContext = wx.createVideoContext('caseVideoPreviewPlayer');
    if (videoContext) {
      videoContext.pause();
    }
    
    this._closeWithAnimation('showVideoPreview', 'videoPreviewClosing', (patch) => {
      patch.isVideoPlaying = true;
      patch.videoPath = null; // 重新选择时清除视频路径
      patch.videoKnownSize = null;
    });

    // 等退场动画结束后再显示上传选项
    setTimeout(() => {
      this.setData({ showUploadOptions: true, uploadOptionsClosing: false });
    }, 420);
  },

  // 确认使用视频（关闭预览，立即打开表单；表单 z-index 高于预览层）
  confirmVideoPreview() {
    const videoContext = wx.createVideoContext('caseVideoPreviewPlayer');
    if (videoContext) videoContext.pause();

    if (!this.data.categoryArray || this.data.categoryArray.length === 0) {
      console.error('❌ [错误] categoryArray 为空！');
      this._showCustomToast('数据错误：categoryArray为空', 'none', 3000);
      return;
    }

    const deviceCount = (this.data.myDevices && this.data.myDevices.length) || 0;
    const keepIndex =
      this.data.selectedSnIndex !== null &&
      this.data.selectedSnIndex !== undefined &&
      this.data.myDevices &&
      this.data.myDevices[this.data.selectedSnIndex];
    this.setData({
      showForm: true,
      formClosing: false,
      selectedSnIndex: deviceCount === 1 ? 0 : (keepIndex ? this.data.selectedSnIndex : null)
    });

    this._closeWithAnimation('showVideoPreview', 'videoPreviewClosing', (patch) => {
      patch.isVideoPlaying = true;
    }, 280);
  },

  // 视频预览播放/暂停切换
  toggleVideoPreviewPlayPause() {
    const videoContext = wx.createVideoContext('caseVideoPreviewPlayer');
    if (this.data.isVideoPlaying) {
      videoContext.pause();
    } else {
      videoContext.play();
    }
  },

  // 视频预览播放事件
  onVideoPreviewPlay() {
    this.setData({ isVideoPlaying: true });
  },

  // 视频预览暂停事件
  onVideoPreviewPause() {
    this.setData({ isVideoPlaying: false });
  },
  
  goBack() {
    if (this.data.showVideoPlayer) {
      this.closeVideoPlayerAnimated();
      return;
    }
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  onBackPress() {
    if (this.data.showVideoPlayer) {
      this.closeVideoPlayerAnimated();
      return true;
    }
    this.goBack();
    return true;
  },

  closeAdminForm() { 
    this._closeWithAnimation('showAdminForm', 'adminFormClosing', (patch) => {
      patch.adminVideoPath = null;
      patch.adminThumbPath = null;
      patch.adminVideoKnownSize = null;
      patch.isEditing = false;
      // 🔴 关闭所有选择器弹窗
      patch.showCategoryPickerModal = false;
      patch.showModelPickerModal = false;
      // 如果是从切换按钮关闭的，重置模式为教学
      patch.shootingGuideMode = 'guide';
    }); 
  },
  closeIntro() { 
    if (!this.data.showIntro || this.data.introClosing) return;
    this.setData({ introClosing: true, introAnimIn: false });
    setTimeout(() => {
      this.setData({ 
        showIntro: false,
        introClosing: false,
        introAnimIn: false
      });
      if (this._shouldShowLotteryPromo()) {
        this._openLotteryPromo();
      } else {
        this._maybeShowCaseUsageGuide();
      }
    }, 420);
  },

  closeLotteryPromo() {
    if (!this.data.showLotteryPromo || this.data.lotteryPromoClosing) return;
    this.setData({ lotteryPromoClosing: true, lotteryPromoAnimIn: false });
    setTimeout(() => {
      this.setData({
        showLotteryPromo: false,
        lotteryPromoClosing: false,
        lotteryPromoAnimIn: false
      });
      this._maybeShowCaseUsageGuide();
    }, 420);
  },
  closeSuccess() {
    this._closeWithAnimation('showSuccess', 'successClosing');
  },

  dismissTransientModals() {
    if (this.data.showIntro) this.closeIntro();
    if (this.data.showLotteryPromo) this.closeLotteryPromo();
    if (this.data.showSuccess) this.closeSuccess();
    if (this.data.showUploadOptions) this.closeUploadOptions();
  },
  _resolveVehicleName(e) {
    if (e && e.detail && e.detail.value && Object.prototype.hasOwnProperty.call(e.detail.value, 'vehicleName')) {
      return String(e.detail.value.vehicleName || '').trim();
    }
    return String(this.data.vehicleName || '').trim();
  },

  onInputVehicle(e) { this.setData({ vehicleName: e.detail.value }); },
  
  // 🔴 调试：测试 picker 点击
  testPickerClick() {
    console.log('🔵 [测试] 测试按钮被点击');
    console.log('🔵 [测试] categoryArray:', this.data.categoryArray);
    console.log('🔵 [测试] categoryIndex:', this.data.categoryIndex);
    
    // 尝试手动触发 picker
    wx.showActionSheet({
      itemList: this.data.categoryArray,
      success: (res) => {
        this.setData({ categoryIndex: res.tapIndex });
        console.log('🔵 [测试] 通过 ActionSheet 选择了:', res.tapIndex);
      }
    });
  },
  
  bindCategoryChange(e) { 
    if (e && e.detail && e.detail.value !== undefined) {
      const val = parseInt(e.detail.value);
      this.setData({ categoryIndex: val });
    }
  },
  
  bindPickerChange(e) { 
    if (e && e.detail && e.detail.value !== undefined) {
      const val = parseInt(e.detail.value);
      this.setData({ modelIndex: val });
    }
  },
  
  // 🔴 新增：模拟器使用的自定义选择器方法
  showCategoryPicker() {
    if (!this.data.useCustomPicker) return; // 真机使用原生 picker
    const currentIndex = this.data.categoryIndex !== null ? this.data.categoryIndex : 0;
    this.setData({
      showCategoryPickerModal: true,
      categoryPickerClosing: false,
      categoryPickerValue: [currentIndex],
      tempCategoryIndex: this.data.categoryIndex !== null ? this.data.categoryIndex : 0
    });
  },
  closeCategoryPicker() {
    this.setData({ categoryPickerClosing: true });
    setTimeout(() => {
      this.setData({ 
        showCategoryPickerModal: false,
        categoryPickerClosing: false
      });
    }, 420);
  },

  // 空函数，用于阻止事件冒泡和滚动
  noop() {},
  onCategoryPickerChange(e) {
    const index = e.detail.value[0];
    this.setData({ tempCategoryIndex: index });
  },
  confirmCategoryPicker() {
    this.setData({ categoryIndex: this.data.tempCategoryIndex });
    this.closeCategoryPicker();
  },
  
  showModelPicker() {
    if (!this.data.useCustomPicker) return;
    const currentIndex = this.data.modelIndex !== null ? this.data.modelIndex : 0;
    this.setData({
      showModelPickerModal: true,
      modelPickerClosing: false,
      modelPickerValue: [currentIndex],
      tempModelIndex: this.data.modelIndex !== null ? this.data.modelIndex : 0
    });
  },
  closeModelPicker() {
    this._closeWithAnimation('showModelPickerModal', 'modelPickerClosing');
  },
  onModelPickerChange(e) {
    const index = e.detail.value[0];
    this.setData({ tempModelIndex: index });
  },
  confirmModelPicker() {
    this.setData({ modelIndex: this.data.tempModelIndex });
    this.closeModelPicker();
  },
  
  showDevicePicker() {
    if (!this.data.useCustomPicker) return;
    if (!this.data.myDevices || this.data.myDevices.length === 0) {
      this._showCustomToast('暂无设备，请先绑定设备', 'none');
      return;
    }
    const currentIndex = this.data.selectedSnIndex !== null ? this.data.selectedSnIndex : 0;
    this.setData({
      showDevicePickerModal: true,
      devicePickerClosing: false,
      devicePickerValue: [currentIndex],
      tempDeviceIndex: this.data.selectedSnIndex !== null ? this.data.selectedSnIndex : 0
    });
  },
  closeDevicePicker() {
    this._closeWithAnimation('showDevicePickerModal', 'devicePickerClosing');
  },
  onDevicePickerChange(e) {
    const index = e.detail.value[0];
    this.setData({ tempDeviceIndex: index });
  },
  confirmDevicePicker() {
    this.setData({ selectedSnIndex: this.data.tempDeviceIndex });
    this.closeDevicePicker();
  },
  // ==========================
  // 🆕 本页自定义 Loading（复用 my 页样式）
  // ==========================
  showMyLoading(title = '上传中...') {
    this._loadingStartTs = Date.now();
    this.setData({ showLoadingAnimation: true, loadingText: title });
  },

  hideMyLoading() {
    const minShowMs = 600; // case 页不需要像 my 页那样 2s，避免拖沓
    const start = this._loadingStartTs || 0;
    const elapsed = start ? (Date.now() - start) : minShowMs;
    const wait = Math.max(0, minShowMs - elapsed);

    if (this._loadingHideTimer) {
      clearTimeout(this._loadingHideTimer);
      this._loadingHideTimer = null;
    }

    this._loadingHideTimer = setTimeout(() => {
      this.setData({ showLoadingAnimation: false });
      this._loadingStartTs = 0;
    }, wait);
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
      console.error('[case] 获取位置信息失败:', err);
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

  async handleIntercept(type) {
    if (screenshotExempt.isScreenshotBanExempt(this)) return;

    // 1. 停止视频播放
    this._resetCaseFullscreenPlayerState();
    
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 2. 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[case] 🔴 截屏/录屏检测，立即跳转');
    
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'case',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        console.log('[case] ✅ 设置封禁状态成功:', res);
      },
      fail: (err) => {
        console.error('[case] ⚠️ 设置封禁状态失败:', err);
      }
    });

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'case',
          ...locationData
        },
        success: (res) => {
          console.log('[case] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[case] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      console.log('[case] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[case] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[case] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    // 强制跳转拦截页
    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[case] 跳转到 blocked 页面成功');
        // 2秒后重置标志，防止卡死
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[case] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        // 路径万一错了，直接退出
        wx.exitMiniProgram();
      }
    });
  },
  
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
        // 最终降级到原生
        console.warn('[case] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 🔴 统一的自定义 Modal 方法（替换所有 wx.showModal，除了 editable 的情况）
  _showCustomModal(options) {
    // 如果 editable 为 true，使用原生（因为自定义组件不支持输入框）
    if (options.editable) {
      return wx.showModal({
        title: options.title || '提示',
        content: options.content || '',
        placeholderText: options.placeholderText || '',
        editable: true,
        showCancel: options.showCancel !== false,
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        confirmColor: options.confirmColor || '#576B95',
        success: options.success
      });
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
        // 最终降级到原生
        console.warn('[case] custom-toast 组件未找到，使用降级方案');
        wx.showModal({
          title: options.title || '提示',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          success: options.success
        });
      }
    };
    tryShow();
  },

  _caseGuideBlockingModal() {
    return !!(this.data.showIntro || this.data.introClosing ||
      this.data.showLotteryPromo || this.data.lotteryPromoClosing ||
      this.data.showVideoPlayer);
  },

  _maybeShowCaseUsageGuide() {
    if (this.data.showCaseUsageGuide || this.data.showCaseGuideIntro) return;
    const entry = resolveGuideAutoEntry(CASE_GUIDE_INTRO_KEYS);
    if (entry === 'none') return;
    if (entry === 'intro') {
      this.setData({ showCaseGuideIntro: true });
      return;
    }
    this._startCaseUsageGuide(false);
  },

  caseGuideIntroStart() {
    this.setData({ showCaseGuideIntro: false }, () => {
      this._startCaseUsageGuide(false);
    });
  },

  _startCaseUsageGuide(forceReplay) {
    if (this._caseGuideBlockingModal()) return;
    if (this.data.showCaseUsageGuide) return;
    if (this._caseUsageGuideStartTimer) {
      clearTimeout(this._caseUsageGuideStartTimer);
      this._caseUsageGuideStartTimer = null;
    }
    this._caseUsageGuideForceReplay = !!forceReplay;
    this._caseUsageGuideStartTimer = setTimeout(() => {
      this._caseUsageGuideStartTimer = null;
      if (this._caseGuideBlockingModal()) return;
      const steps = buildCaseGuideSteps(this.data);
      if (!steps.length) return;
      this._caseGuideSteps = steps;
      if (!this.data.showSearchBar) {
        this.setData({ showSearchBar: true }, () => {
          this._syncCaseMainScrollLayout();
          this._showCaseGuideStep(1);
        });
        return;
      }
      this._showCaseGuideStep(1);
    }, forceReplay ? 320 : 720);
  },

  _showCaseGuideStep(stepIndex) {
    const steps = this._caseGuideSteps || [];
    const step = steps[stepIndex - 1];
    if (!step) return;
    const isFirstShow = !this.data.showCaseUsageGuide;
    const reveal = () => {
      this._renderCaseGuideBubble(stepIndex, step, 0);
    };
    if (step.key === 'search' && !this.data.showSearchBar) {
      this.setData({ showSearchBar: true }, () => {
        this._syncCaseMainScrollLayout();
        this._scrollCaseGuideToAnchor(step, reveal);
      });
      return;
    }
    if (isFirstShow) {
      this._scrollCaseGuideToAnchor(step, reveal);
      return;
    }
    this.setData({ showCaseUsageGuide: false, caseGuideScrollIntoView: '' }, () => {
      this._scrollCaseGuideToAnchor(step, reveal);
    });
  },

  _scrollCaseGuideToAnchor(step, done) {
    if (step && step.resetListScroll) {
      const finish = () => {
        setTimeout(() => {
          if (typeof done === 'function') done();
        }, 320);
      };
      this.setData({ caseGuideScrollIntoView: '' }, () => {
        this._syncCaseMainScrollLayout();
        const prev = Number(this._caseListScrollPos) || 0;
        if (prev <= 1) {
          this.setData({ caseListScrollTop: 0 }, finish);
          return;
        }
        this.setData({ caseListScrollTop: prev + 0.01 }, () => {
          wx.nextTick(() => {
            this.setData({ caseListScrollTop: 0 }, finish);
          });
        });
      });
      return;
    }
    if (step && step.scrollIntoView) {
      this.setData({ caseGuideScrollIntoView: step.scrollIntoView }, () => {
        setTimeout(() => {
          if (typeof done === 'function') done();
        }, 420);
      });
      return;
    }
    if (typeof done === 'function') done();
  },

  _clampCaseGuideSpotRect(rect, winW, winH) {
    const chromeBottomPx = Number(this.data.caseMainScrollTop) || 0;
    let left = rect.left;
    let top = rect.top;
    let right = rect.left + rect.width;
    let bottom = rect.top + rect.height;
    if (chromeBottomPx > 0) {
      top = Math.max(top, chromeBottomPx);
    }
    left = Math.max(0, left);
    top = Math.max(0, top);
    right = Math.min(winW, right);
    bottom = Math.min(winH, bottom);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    return { left, top, width, height };
  },

  _renderCaseGuideBubble(stepIndex, step, retryCount) {
    const steps = this._caseGuideSteps || [];
    const retry = Number(retryCount) || 0;
    const query = wx.createSelectorQuery().in(this);
    if (step.key === 'card') {
      query.select('#case-guide-thumb').boundingClientRect();
      query.select('#case-guide-card').boundingClientRect();
    } else {
      query.select(step.anchor).boundingClientRect();
    }
    query.exec((res) => {
      let rect = res && res[0];
      if (step.key === 'card') {
        const cardRect = res && res[1];
        if ((!rect || !rect.height || rect.height < 12) && cardRect && cardRect.width && cardRect.height) {
          const thumbH = Math.min(cardRect.width * (4 / 3), cardRect.height * 0.82);
          rect = {
            left: cardRect.left,
            top: cardRect.top,
            width: cardRect.width,
            height: thumbH
          };
        }
      }
      const isLast = stepIndex >= steps.length;
      const readyText = isLast ? '知道了' : '下一步';
      const contentPatch = {
        showCaseUsageGuide: true,
        caseUsageGuideStep: stepIndex,
        caseGuideStepTag: step.tag,
        caseGuideTitle: step.title,
        caseGuideDesc: step.desc,
        caseGuideBtnText: readyText,
        caseGuideBtnLocked: true
      };
      if (!rect || !rect.width) {
        if (retry < 4) {
          setTimeout(() => {
            this._renderCaseGuideBubble(stepIndex, step, retry + 1);
          }, step.key === 'card' ? 240 : 180);
          return;
        }
        this.setData({
          ...contentPatch,
          caseGuideArrowDir: 'none',
          caseGuideBubbleStyle: 'left:50%; top:50%; transform:translate(-50%,-50%); width:520rpx;',
          caseGuideArrowStyle: 'display:none;',
          caseGuideSpotStyle: 'display:none;'
        }, () => this._armCaseGuideBtnLock(readyText));
        return;
      }
      let win = null;
      try {
        win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      } catch (e) {
        win = wx.getSystemInfoSync();
      }
      const winW = (win && win.windowWidth) || 375;
      const winH = (win && win.windowHeight) || 667;
      const pxToRpx = 750 / winW;

      const clamped = this._clampCaseGuideSpotRect(rect, winW, winH);
      if (!clamped.width || !clamped.height) {
        if (retry < 4) {
          setTimeout(() => {
            this._renderCaseGuideBubble(stepIndex, step, retry + 1);
          }, step.key === 'card' ? 240 : 180);
          return;
        }
      }
      const spotRect = clamped.width && clamped.height ? clamped : rect;

      const spotPadPx = 6;
      const spotLeft = (spotRect.left - spotPadPx) * pxToRpx;
      const spotTop = (spotRect.top - spotPadPx) * pxToRpx;
      const spotW = (spotRect.width + spotPadPx * 2) * pxToRpx;
      const spotH = (spotRect.height + spotPadPx * 2) * pxToRpx;
      const caseGuideSpotStyle = `left:${spotLeft}rpx; top:${spotTop}rpx; width:${spotW}rpx; height:${spotH}rpx;`;

      const bubbleWidthRpx = 480;
      const marginRpx = 24;
      const centerXrpx = (spotRect.left + spotRect.width / 2) * pxToRpx;
      let bubbleLeftRpx = centerXrpx - bubbleWidthRpx / 2;
      if (bubbleLeftRpx < marginRpx) bubbleLeftRpx = marginRpx;
      if (bubbleLeftRpx + bubbleWidthRpx > 750 - marginRpx) {
        bubbleLeftRpx = 750 - marginRpx - bubbleWidthRpx;
      }
      const arrowLeftRpx = centerXrpx - bubbleLeftRpx;
      const gapRpx = 22;

      const placeAbove = spotRect.top > winH * 0.42;
      let bubbleStyle = '';
      let arrowDir = 'down';
      if (placeAbove) {
        const bottomRpx = (winH - spotRect.top) * pxToRpx + gapRpx;
        bubbleStyle = `left:${bubbleLeftRpx}rpx; bottom:${bottomRpx}rpx; width:${bubbleWidthRpx}rpx;`;
        arrowDir = 'down';
      } else {
        const topRpx = (spotRect.top + spotRect.height) * pxToRpx + gapRpx;
        bubbleStyle = `left:${bubbleLeftRpx}rpx; top:${topRpx}rpx; width:${bubbleWidthRpx}rpx;`;
        arrowDir = 'up';
      }

      this.setData({
        ...contentPatch,
        caseGuideArrowDir: arrowDir,
        caseGuideBubbleStyle: bubbleStyle,
        caseGuideArrowStyle: `left:${arrowLeftRpx}rpx;`,
        caseGuideSpotStyle
      }, () => this._armCaseGuideBtnLock(readyText));
    });
  },

  _armCaseGuideBtnLock(readyText) {
    startGuideBtnCountdown(this, {
      lockedKey: 'caseGuideBtnLocked',
      textKey: 'caseGuideBtnText',
      readyText: readyText || '下一步',
      timerProp: '_caseGuideBtnTimer'
    });
  },

  caseUsageGuideNext() {
    if (this.data.caseGuideBtnLocked) return;
    const steps = this._caseGuideSteps || [];
    const cur = this.data.caseUsageGuideStep;
    if (cur < steps.length) {
      this._showCaseGuideStep(cur + 1);
      return;
    }
    markGuideIntroSeen(CASE_GUIDE_INTRO_KEYS);
    this.closeCaseUsageGuide(false);
  },

  caseUsageGuideSkip() {
    markGuidePermSkip(CASE_GUIDE_INTRO_KEYS);
    this.closeCaseUsageGuide(false);
  },

  closeCaseUsageGuide(_markDone = true) {
    this._caseUsageGuideForceReplay = false;
    clearGuideBtnCountdown(this, '_caseGuideBtnTimer');
    if (this._caseUsageGuideStartTimer) {
      clearTimeout(this._caseUsageGuideStartTimer);
      this._caseUsageGuideStartTimer = null;
    }
    this._caseGuideSteps = null;
    this.setData({
      showCaseUsageGuide: false,
      showCaseGuideIntro: false,
      caseGuideScrollIntoView: '',
      caseListScrollTop: 0
    });
  },

});
