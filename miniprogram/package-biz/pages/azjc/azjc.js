const db = wx.cloud.database();
const cosUpload = require('../../../utils/cosUpload.js');
const shopImagePrepare = require('../../../utils/shopImagePrepare.js');
const azjcAccessDebug = require('../../../utils/azjcAccessDebug.js');
const { compressVideoForUpload } = require('../../../utils/compressVideoForUpload.js');
const AZJC_DEFAULT_PRODUCTS = [
  { name: 'F1', series: '智能系列', suffix: 'F1', number: 1 },
  { name: 'F2', series: '性能系列', suffix: 'F2', number: 2 },
  { name: 'F3', series: '旗舰系列', suffix: 'F3', number: 3 },
  { name: 'F2 Long', series: '长续航系列', suffix: 'L', number: 4 }
];

/** 与云函数 getOrCreateAzjcDirectPool 内 POOL_CODE 保持一致 */
const AZJC_DIRECT_POOL_CODE = '__AZJC_DIRECT_POOL__';

/** 真机调试用：设为 false 可关闭全部「安装教程调试」日志 */
const AZJC_DEBUG_LOG = false;

function _azjcLog(标签, 负载) {
  if (!AZJC_DEBUG_LOG) return;
  const ts = Date.now();
  let extra = '';
  try {
    extra = 负载 !== undefined && 负载 !== null
      ? (typeof 负载 === 'string' ? 负载 : JSON.stringify(负载))
      : '';
  } catch (e) {
    extra = '【日志内容无法序列化】';
  }
  console.log(`[安装教程调试 ${ts}] 【${标签}】 ${extra}`);
}

/* ===== 匹配码：一条内容可以同时挂多个「产品+车型」组合，每个组合的次序互相独立 =====
 * 库里的字段：
 *   matchCodes  ['1+1','2+3']        全部组合；老数据没有这个字段，回落到单个 matchCode
 *   matchCode   '1+1'                仍然写，保持老代码/老数据可读
 *   orders      [{code,order}]       每个组合各自的次序；用数组是因为云数据库 update
 *                                    对嵌套对象是合并而不是替换，删码时对象会残留
 *   order       0                    仍然写（取首个组合的值），loadVideosAndGraphics
 *                                    还在用 orderBy('order') 做初始排序
 */

/** 把 '1+1'、' 01 + 2 ' 这类写法统一成 '1+1'；不合法返回空串 */
function normalizeMatchCode(code) {
  const parts = String(code == null ? '' : code).split('+');
  if (parts.length !== 2) return '';
  const p = parseInt(parts[0], 10);
  const t = parseInt(parts[1], 10);
  if (!Number.isFinite(p) || !Number.isFinite(t)) return '';
  return `${p}+${t}`;
}

/** 一条内容挂的全部匹配码（去重、去非法）；老数据只有单码时返回单元素数组 */
function readMatchCodes(item) {
  const out = [];
  const push = (c) => {
    const code = normalizeMatchCode(c);
    if (code && out.indexOf(code) < 0) out.push(code);
  };
  const list = item && Array.isArray(item.matchCodes) ? item.matchCodes : [];
  list.forEach(push);
  if (!out.length) push(item && item.matchCode);
  return out;
}

function hasMatchCode(item, code) {
  if (!code) return false;
  return readMatchCodes(item).indexOf(code) >= 0;
}

function normalizeDuplicateVideoKey(input) {
  let raw = String(input == null ? '' : input).trim();
  if (!raw) return '';
  raw = raw.replace(/\?.*$/, '');
  if (/^cloud:\/\//i.test(raw)) return raw.toLowerCase();
  raw = raw.replace(/^https?:\/\//i, '');
  return raw.toLowerCase();
}

function normalizeSuspectedVideoTitle(input) {
  let raw = String(input == null ? '' : input).trim().toLowerCase();
  if (!raw) return '';
  raw = raw.replace(/^\s*\d+\s*[\.．、)\]】）-]?\s*/g, '');
  raw = raw.replace(/[\s\-_.,，。:：;；!！?？"'`~()（）\[\]【】/\\]+/g, '');
  return raw;
}

function readOrderMap(item) {
  const map = {};
  const list = item && Array.isArray(item.orders) ? item.orders : [];
  list.forEach((e) => {
    const code = normalizeMatchCode(e && e.code);
    if (!code) return;
    const n = Number(e && e.order);
    if (Number.isFinite(n)) map[code] = n;
  });
  return map;
}

function legacyOrderOf(item) {
  const n = Number(item && item.order);
  return Number.isFinite(n) ? n : 0;
}

/** 某条内容在指定组合下的次序；该组合没单独设过就回落到老的 order 字段 */
function readOrderFor(item, code) {
  const map = readOrderMap(item);
  if (Object.prototype.hasOwnProperty.call(map, code)) return map[code];
  return legacyOrderOf(item);
}

/**
 * 生成「只改 code 这一个组合的次序」的 orders 数组，其余组合原样保留。
 * 老数据只有一个 order，这里先把它补到自己已挂的每个码上，
 * 否则第一次拖排序会把同一条内容在别的组合里的位置一起冲掉。
 */
function buildOrdersWith(item, code, order) {
  const map = readOrderMap(item);
  const legacy = legacyOrderOf(item);
  readMatchCodes(item).forEach((c) => {
    if (!Object.prototype.hasOwnProperty.call(map, c)) map[c] = legacy;
  });
  if (code) map[code] = order;
  return Object.keys(map).map((c) => ({ code: c, order: map[c] }));
}

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
    currentComboLabel: '', // 当前选中的「产品+车型」展示文案，如 F1+跨骑车
    showComboSwitchModal: false,
    comboSwitchClosing: false,
    comboSwitchPIndex: -1,
    comboSwitchTIndex: -1,
    comboSwitchPreview: '',
    startY: 0,
    scrollToId: 'step1',
    canScroll: false,

    // 管理员相关
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式
    
    // 匹配码选择弹窗
    showMatchCodePicker: false,
    matchCodePickerClosing: false, // 匹配码选择器退出动画中
    availableProducts: [], // 可勾选的产品 [{...p, num, key, checked}]
    availableTypes: [], // 可勾选的车型 [{...t, num, key, checked}]
    matchCodePreviewCodes: [], // 勾选后两两组合出的全部匹配码
    matchCodePreviewText: '',
    matchCodeSelectedCount: 0,
    tempUploadData: null, // 临时保存上传数据

    // 预设数据（将从云数据库加载）
    products: [], // 产品型号 [{name: '', series: '', suffix: '', number: 1, _id: ''}]
    types: [],    // 车型分类 [{name: '', number: 1, _id: ''}]
    
    // 教程数据（从云数据库加载，根据选择的product+type过滤）
    // 一条内容可挂多个组合：matchCodes ['1+1','2+3']，orders [{code,order}] 各组合次序独立
    chapters: [], // 视频分段 [{title, url, matchCode, matchCodes, orders, _id}]
    graphics: [], // 图文详情 [{title, img, desc, matchCode, matchCodes, orders, _id}]
    
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
    showDuplicateCheckModal: false,
    duplicateCheckClosing: false,
    duplicateVideoRows: [],
    duplicateVideoGroupCount: 0,
    duplicateVideoItemCount: 0,
    duplicateVideoExactGroupCount: 0,
    duplicateVideoSuspectGroupCount: 0,
    // 新增：用于布局的精确高度变量
    winHeight: 0,
    scrollViewHeight: 0,

    // 滚动控制
    locked: false,
    
    // 🔴 全屏视频控制
    fullScreenVideoPaused: false, // 全屏视频是否暂停
    fullScreenVideoCurrentTime: 0,
    fullScreenVideoDuration: 0,
    fullScreenVideoProgress: 0, // 0-1000
    fullScreenVideoProgressPercent: 0, // 0-100
    fullScreenVideoCurrentText: '00:00',
    fullScreenVideoDurationText: '00:00',
    fullScreenVideoTransform: '', // 全屏视频的初始transform（用于动画）
    fullScreenVideoInitialStyle: '', // 全屏视频的初始样式（用于动画）
    fullScreenVideoMaskClosing: false, // 🔴 背景遮罩层关闭状态（用于同步背景变透明动画）
    /** 全屏下窗口是否为横屏（宽>高）；竖屏时不允许播放并显示引导层 */
    fullScreenLandscapeOk: false,
    /** 横屏播放中点关闭：先显示「竖握手机」示意再退出 */
    fullScreenExitPortraitHint: false,
    /** 竖屏引导遮罩是否在 5 秒后自动收起（仍不播放，仅去掉大字提示） */
    fullScreenRotateHintDismissed: false,
    /** 用户主动选择「竖屏播放」（如竖排锁定无法横屏）；此时仍视为可播放，且竖屏回调不再强制暂停 */
    fullScreenPortraitFallback: false,
    /** 竖屏门闸（现仅保留一步横屏提示；字段保留避免旧逻辑报错） */
    fullScreenGateStage: 1,
    /** 全屏横屏时关闭按钮 cover-view 的 top/left（相对 video 节点，需 JS 计算） */
    fullScreenCloseCoverStyle: '',
    videoSlideEndTime: 0, // 🔴 视频拖拽结束时间戳（用于阻止后续1秒内的页面滚动）
    videoSlideDirection: '', // 🔴 视频拖拽方向（'down'=向下，'up'=向上）
    /** 列表内只挂一个原生 video，避免多解码器同时抢 GPU/带宽导致卡顿 */
    chapterInlineMountIndex: -1,
    /** 列表内嵌视频是否正在播（用于 cover-view 大暂停热区，与 filteredChapters 下标对齐） */
    chapterInlinePlaying: [],
    /** 点击播放后三角消隐动画期间仍为 true，overlay 暂留避免 wx:if 瞬间消失 */
    chapterInlinePauseExitAnim: [],

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
    shareCodeRecordCreated: false,  // 🔴 是否已创建分享码记录（用于区分首次保存和更新）
    tutorialDirectPoolId: '',       // 🔴 普通用户安装教程写入的 chakan 汇总文档 _id
    shouldRecordTutorialInstall: false,
    installSessionRecordCreated: false,

    // 🔴 管理员查看分享码统计
    showShareCodeStats: false,
    loadingShareCodeStats: false,
    shareCodeStatsRows: [],
    shareCodeStatsDisplayRows: [],
    statsSearchKeyword: '',
    statsScrollTop: 0,
    statsExpandedMap: {}, // 分享码用户卡展开状态 { rowKey: true }

    // 闲鱼订单截图验证（无小程序订单/未绑设备时解锁教程）
    showXianyuVerifyModal: false,
    xianyuVerifying: false,
    xianyuVerifyResult: '',
    xianyuVerifyResultType: '', // success | error
    showWatchNotice: false, // 首次进入安装教程须知

    // 普通用户：安装教程查看码（发给安装人员）
    userInstallShareCode: '',
    showUserInstallCode: false
  },

  _isCloudFileId(u) {
    return typeof u === 'string' && u.indexOf('cloud://') === 0;
  },

  _isDirectMediaUrl(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u);
  },

  /** 管理员写 azjc：云函数绕过「仅创建者可写」，任意管理员可删/改 */
  _adminAzjcWrite(action, payload) {
    return new Promise((resolve, reject) => {
      if (!wx.cloud || !wx.cloud.callFunction) {
        reject(new Error('云能力未就绪'));
        return;
      }
      wx.cloud.callFunction({
        name: 'adminManageAzjc',
        data: Object.assign({ action }, payload || {}),
        success: (res) => {
          const r = (res && res.result) || {};
          if (r.success) resolve(r);
          else reject(new Error(r.error || '操作失败'));
        },
        fail: reject
      });
    });
  },

  _adminAzjcRemove(_id) {
    return this._adminAzjcWrite('remove', { _id });
  },

  _adminAzjcUpdate(_id, data) {
    return this._adminAzjcWrite('update', { _id, data });
  },

  /** COS 返回 https 直链；仅 cloud:// 才走 getTempFileURL */
  _resolveAzjcMediaUrl(urlOrId) {
    if (!urlOrId) return Promise.resolve('');
    if (this._isDirectMediaUrl(urlOrId)) {
      return Promise.resolve(urlOrId);
    }
    if (!this._isCloudFileId(urlOrId) || !wx.cloud || !wx.cloud.getTempFileURL) {
      return Promise.resolve(urlOrId);
    }
    return new Promise((resolve) => {
      wx.cloud.getTempFileURL({
        fileList: [urlOrId],
        success: (r) => {
          const row = r.fileList && r.fileList[0];
          resolve((row && row.tempFileURL) || urlOrId);
        },
        fail: () => resolve(urlOrId)
      });
    });
  },

  _buildAzjcMediaUrlMap(urls) {
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
    if (!cloudIds.length) return Promise.resolve(map);
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

  _mediaCacheBust(url) {
    if (!url || !/^https?:\/\//i.test(url)) return url;
    const base = url.split('?')[0];
    return `${base}?_v=${Date.now()}`;
  },

  /** 无独立封面时，用 COS 视频截帧当列表图（不挂原生 video） */
  _azjcVideoSnapshotUrl(videoUrl) {
    const raw = String(videoUrl || '').trim();
    if (!raw || !/^https?:\/\//i.test(raw)) return '';
    if (/ci-process=snapshot/i.test(raw)) return raw;
    const pathPart = raw.split('#')[0].split('?')[0];
    if (!pathPart) return '';
    return `${pathPart}?ci-process=snapshot&time=1&format=jpg`;
  },

  _azjcDisplayCover(item) {
    const own = String((item && item.coverUrl) || '').trim();
    if (own) return own;
    return this._azjcVideoSnapshotUrl((item && (item.url || item.fileID)) || '');
  },

  _uploadAzjcCover(thumbPath) {
    const p = String(thumbPath || '');
    if (!p || p === 'AUTO_GENERATE') return Promise.resolve('');
    return cosUpload.uploadImageToCos(p, 'azjc/cover').catch((err) => {
      console.warn('[azjc] 封面上传失败', err);
      return '';
    });
  },

  /** 4K/高码率原片先压到 1080p，否则真机 video 解码会卡 */
  _prepareAzjcVideoForUpload(file) {
    const src = file && file.tempFilePath;
    if (!src) return Promise.reject(new Error('未选择视频'));
    const knownSize = file && typeof file.size === 'number' ? file.size : undefined;
    return compressVideoForUpload(src, {
      knownSize,
      width: file.width,
      height: file.height
    }).then((r) => {
      if (r && r.tooHeavy && !r.compressed) {
        this._showCustomToast('4K 原片小程序会卡，建议剪映导出 1080p 后再传', 'none', 3500);
      }
      return r;
    });
  },

  async _buildRetryImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (this._isCloudFileId(url) && wx.cloud && wx.cloud.getTempFileURL) {
      try {
        const resp = await wx.cloud.getTempFileURL({ fileList: [url] });
        const temp = resp && resp.fileList && resp.fileList[0] && resp.fileList[0].tempFileURL;
        if (temp) return this._mediaCacheBust(temp);
      } catch (e) {}
      return url;
    }
    if (this._isDirectMediaUrl(url)) {
      return this._mediaCacheBust(url);
    }
    return url;
  },

  _clearPendingUploadTemp() {
    const p = this._pendingUploadTemp;
    if (!p) return;
    this._cleanupTempUploadPath(p.copiedPath, p.originPath);
    this._pendingUploadTemp = null;
  },

  onAzjcGraphicImageLoad(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || idx < 0) return;
    const item = (this.data.filteredGraphics || [])[idx];
    if (!item || !item.previewLocal || !this._isDirectMediaUrl(item.img)) return;
    wx.getImageInfo({
      src: item.img,
      success: () => {
        const cur = (this.data.filteredGraphics || [])[idx];
        if (!cur || !cur.previewLocal) return;
        const patch = { [`filteredGraphics[${idx}].previewLocal`]: '' };
        const gIdx = (this.data.graphics || []).findIndex((g) => g._id === cur._id);
        if (gIdx >= 0) patch[`graphics[${gIdx}].previewLocal`] = '';
        this.setData(patch);
      }
    });
  },

  async onAzjcGraphicImageError(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || idx < 0) return;
    this._azjcGraphicRetryMap = this._azjcGraphicRetryMap || {};
    if (this._azjcGraphicRetryMap[idx]) return;
    this._azjcGraphicRetryMap[idx] = true;
    const item = (this.data.filteredGraphics || [])[idx];
    if (!item) return;
    const remote = item.img || item.fileID;
    if (!remote) return;
    const next = await this._buildRetryImageUrl(remote);
    const patch = {
      [`filteredGraphics[${idx}].img`]: next,
      [`filteredGraphics[${idx}].previewLocal`]: ''
    };
    const gIdx = (this.data.graphics || []).findIndex((g) => g._id === item._id);
    if (gIdx >= 0) {
      patch[`graphics[${gIdx}].img`] = next;
      patch[`graphics[${gIdx}].previewLocal`] = '';
    }
    this.setData(patch);
  },

  // 关闭分享码提示弹窗
  closeShareCodeModal() {
    this.setData({
      showShareCodeModal: false
    }, () => {
      this._maybeShowWatchNotice();
    });
  },

  _watchNoticeStorageKey() {
    return 'azjc_install_notice_v7';
  },

  _maybeShowWatchNotice() {
    if (this.data.shareCodeViewsExhausted) return;
    if (this.data.showXianyuVerifyModal) return;
    if (this.data.showShareCodeModal) return;
    if (this.data.showWatchNotice) return;
    let seen = false;
    try {
      seen = !!wx.getStorageSync(this._watchNoticeStorageKey());
    } catch (e) {
      seen = false;
    }
    if (seen) return;
    this.setData({ showWatchNotice: true });
  },

  closeWatchNotice() {
    try {
      wx.setStorageSync(this._watchNoticeStorageKey(), 1);
    } catch (e) { /* ignore */ }
    this.setData({ showWatchNotice: false });
  },

  dismissTransientModals() {
    if (this.data.showShareCodeModal) {
      this.setData({ showShareCodeModal: false });
    }
  },

  // 页面加载时从云数据库读取数据
  onLoad: function(options) {

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
      
      // 🔴 分享码用户不采集地址信息
      const locationInfo = {
        province: '',
        city: '',
        district: '',
        address: '',
        latitude: null,
        longitude: null
      };
      
      this.setData({
        sessionStartTime: startTime,
        sectionClicks: {},
        sectionDurations: {},
        shareCodeLocationInfo: locationInfo
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

    this._azjcWindowResize = () => {
      if (!this.data.isVideoFullScreen) return;
      if (this._maybeCompleteCloseForPortraitExitHint()) return;
      this._syncFullscreenOrientationFromWindow();
      this._syncAzjcFullscreenOrientationFromLayoutRect({ immediate: true });
      wx.nextTick(() => {
        if (this._maybeCompleteCloseForPortraitExitHint()) return;
        this._syncFullscreenOrientationFromWindow();
        this._syncAzjcFullscreenOrientationFromLayoutRect({ immediate: true });
        this._refreshAzjcFullscreenTrackRect();
        this._syncAzjcFullscreenCloseCoverLayout();
      });
    };
    wx.onWindowResize(this._azjcWindowResize);

    this._azjcDeviceOrientationHandler = (res) => {
      if (!this.data.isVideoFullScreen || this._isClosingFullScreen) return;
      const raw = res && (res.value != null ? res.value : res.deviceOrientation);
      const v = String(raw || '').toLowerCase();
      if (/landscape/i.test(v)) {
        const { ww, hh } = this._readAzjcFullscreenViewport();
        if (ww > 0 && hh > 0) {
          this._applyFullscreenOrientation(ww, hh, { forceLandscape: true });
        }
        this._syncAzjcFullscreenOrientationFromLayoutRect({ immediate: true });
        wx.nextTick(() => {
          this._syncFullscreenOrientationFromWindow();
          this._syncAzjcFullscreenOrientationFromLayoutRect({ immediate: true });
          this._syncAzjcFullscreenCloseCoverLayout();
        });
      } else if (v && /portrait/i.test(v)) {
        this._syncFullscreenOrientationFromWindow();
        this._maybeCompleteCloseForPortraitExitHint();
      }
    };
    if (typeof wx.onDeviceOrientationChange === 'function') {
      wx.onDeviceOrientationChange(this._azjcDeviceOrientationHandler);
    }

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
    if (this.data.isVideoFullScreen) {
      this._restoreAzjcPageOrientationAutoForFullScreen();
      wx.nextTick(() => {
        this._syncFullscreenOrientationFromWindow();
        this._startAzjcFullscreenOrientPoll();
      });
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
    
    if ((this.data.isShareCodeUser || this.data.shouldRecordTutorialInstall) && this.data.sessionStartTime > 0) {
      console.log('[azjc] onHide: 开始上传统计数据');
      await this._uploadSessionStats();
    } else {
      console.log('[azjc] onHide: 无需上传统计');
    }
  },

  async onUnload() {
    try {
      if (this._azjcWindowResize && wx.offWindowResize) {
        wx.offWindowResize(this._azjcWindowResize);
      }
    } catch (e) {}
    this._azjcWindowResize = null;
    this._stopAzjcFullscreenOrientPoll();
    if (this._azjcFsCloseDelayTimer) {
      clearTimeout(this._azjcFsCloseDelayTimer);
      this._azjcFsCloseDelayTimer = null;
    }
    if (this._azjcDeviceOrientationHandler && typeof wx.offDeviceOrientationChange === 'function') {
      try {
        wx.offDeviceOrientationChange(this._azjcDeviceOrientationHandler);
      } catch (e) {}
    }
    this._azjcDeviceOrientationHandler = null;
    if (this._exitPortraitAnimTimer) {
      clearTimeout(this._exitPortraitAnimTimer);
      this._exitPortraitAnimTimer = null;
    }
    this._clearRotateHintDismissTimer();
    this._clearGateStageTimers();
    if (this._chapterInlineExitAnimTimers) {
      Object.keys(this._chapterInlineExitAnimTimers).forEach((k) => {
        const t = this._chapterInlineExitAnimTimers[k];
        if (t) clearTimeout(t);
      });
      this._chapterInlineExitAnimTimers = {};
    }

    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
    // 🔴 停止定时保存
    this._stopAutoSave();
    
    if ((this.data.isShareCodeUser || this.data.shouldRecordTutorialInstall) && this.data.sessionStartTime > 0) {
      console.log('[azjc] onUnload: 开始上传统计数据');
      try {
        await this._uploadSessionStats();
      } catch (err) {
        console.error('[azjc] onUnload: 上传统计数据失败:', err);
      }
    } else {
      console.log('[azjc] onUnload: 无需上传统计');
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
      
      if (!azjcAccessDebug.IGNORE_ADMIN_FOR_ACCESS && adminCheck.total > 0) {
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

      // 2.5 闲鱼订单截图已验证通过 -> 放行（适用于在闲鱼下单、无小程序订单的用户）
      const xianyuVerified = await this._checkXianyuOrderVerified(openid);
      if (xianyuVerified) {
        console.log('[azjc checkAccessPermission] ✅ 闲鱼订单验证已通过，直接放行');
        this.hideMyLoading();
        await this.checkAdminPrivilege();
        this.loadDataFromCloud();
        return;
      }

      // 3. 如果有未确认收货的订单 -> 提示先确认收货
      if (realPendingOrders.length > 0) {
        console.log('[azjc checkAccessPermission] ⚠️ 有未确认收货的订单:', realPendingOrders.length);
        this.hideMyLoading();
        this._showCustomModal({
          title: '提示',
          content: '请到「订单」确认收货后\n再解锁安装教程',
          showCancel: false,
          confirmText: '去订单',
          success: (res) => {
            if (res && res.cancel) return;
            const hubNav = require('../../../utils/hubNav.js');
            hubNav.switchTab('orders');
          }
        });
        return;
      }

      // 4. 无设备、无已确认订单、无待确认收货的已发货订单 -> 引导闲鱼截图验证
      // （含：完全无小程序订单、仅有未付款/待发货订单的闲鱼用户）
      console.log('[azjc checkAccessPermission] ⚠️ 展示闲鱼订单验证');
      this.hideMyLoading();
      this.showXianyuVerifyModal();
      return;

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
        const pageBack = require('../../../utils/pageBack.js');
        pageBack.popOrHub();
      }
    });
  },

  async _checkXianyuOrderVerified(openid) {
    if (!openid) return false;
    try {
      const db = wx.cloud.database();
      const res = await db.collection('xianyu_azjc_verified')
        .where({ _openid: openid, verified: true })
        .limit(1)
        .get();
      return !!(res.data && res.data.length > 0);
    } catch (err) {
      console.warn('[azjc] 查询闲鱼验证记录失败:', err);
      return false;
    }
  },

  showXianyuVerifyModal() {
    this.setData({
      showXianyuVerifyModal: true,
      xianyuVerifyResult: '',
      xianyuVerifyResultType: ''
    });
  },

  closeXianyuVerifyModal() {
    if (this.data.xianyuVerifying) return;
    this.setData({ showXianyuVerifyModal: false });
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  onChooseXianyuOrderScreenshot() {
    if (this.data.xianyuVerifying) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) {
          this._showCustomToast('未选择图片', 'none');
          return;
        }
        this._verifyXianyuOrderScreenshot(file.tempFilePath);
      },
      fail: (err) => {
        const msg = String((err && err.errMsg) || '');
        if (msg.indexOf('cancel') === -1) {
          this._showCustomToast('选择图片失败', 'none');
        }
      }
    });
  },

  _formatXianyuVerifyError(result) {
    const base = (result && result.message) || '验证未通过，请重试';
    if (result && result.error === 'ORDER_UNPAID') {
      return base;
    }
    if (result && result.error === 'SELLER_LIST_EMPTY') {
      return `${base}\n（云端未配置 sellerNicknames）`;
    }
    if (result && result.error === 'OCR_NOT_CONFIGURED') {
      return `${base}\n（云函数未配置百度 OCR 密钥）`;
    }
    if (result && result.error === 'IMAGE_TOO_LARGE') {
      return '截图太大，传不上去\n请只截「卖家昵称」附近那一段，或缩小后再传';
    }
    if (result && result.error === 'DOWNLOAD_FAIL') {
      return '截图处理失败，请换一张清晰截图重试';
    }
    const parsed = result && result.parsed;
    const nick = (parsed && parsed.sellerNickname) || (result && result.sellerNickname) || '';
    const status = parsed && parsed.orderStatus;
    if (result && (result.error === 'SELLER_MISMATCH' || /卖家昵称不匹配|非本公司/.test(base))) {
      let msg = '非本公司订单，请重新上传';
      if (nick) msg += `\n识别到卖家昵称：${nick}`;
      if (status) msg += `\n订单状态：${status}`;
      return msg;
    }
    if (result && result.error === 'SELLER_NOT_FOUND') {
      return (result && result.message) || '未识别到卖家昵称\n请上传能看到「卖家昵称」的完整订单详情图';
    }
    if (nick) {
      let msg = `${base}\n识别到卖家昵称：${nick}`;
      if (status) msg += `\n订单状态：${status}`;
      return msg;
    }
    return base;
  },

  /** 压缩前读本地文件体积 */
  _getLocalFileSize(filePath) {
    return new Promise((resolve) => {
      try {
        wx.getFileSystemManager().getFileInfo({
          filePath,
          success: (res) => resolve(Number(res && res.size) || 0),
          fail: () => resolve(0)
        });
      } catch (e) {
        resolve(0);
      }
    });
  },

  _compressImageOnce(src, quality, compressedWidth) {
    return new Promise((resolve) => {
      if (!wx.compressImage) {
        resolve(src);
        return;
      }
      const opts = {
        src,
        quality,
        success: (res) => resolve((res && res.tempFilePath) || src),
        fail: () => resolve(src)
      };
      if (compressedWidth > 0) opts.compressedWidth = compressedWidth;
      wx.compressImage(opts);
    });
  },

  /** 轻量压缩，方便上传云存储（不再塞进 callFunction 入参） */
  async _prepareXianyuScreenshotForUpload(filePath) {
    const MAX_FILE_BYTES = 1.5 * 1024 * 1024;
    const steps = [
      { quality: 70, compressedWidth: 1280 },
      { quality: 55, compressedWidth: 1080 },
      { quality: 45, compressedWidth: 900 },
      { quality: 35, compressedWidth: 720 }
    ];
    let path = filePath;
    let size = await this._getLocalFileSize(path);
    for (let i = 0; i < steps.length; i += 1) {
      if (size > 0 && size <= MAX_FILE_BYTES) break;
      const step = steps[i];
      path = await this._compressImageOnce(path, step.quality, step.compressedWidth);
      size = await this._getLocalFileSize(path);
    }
    return { path, size };
  },

  _uploadXianyuScreenshotToCos(filePath, knownSize) {
    return cosUpload.uploadImageToCos(filePath, 'xianyu_verify', {
      knownSize: typeof knownSize === 'number' ? knownSize : undefined
    });
  },

  _verifyXianyuOrderScreenshot(filePath) {
    this.setData({
      xianyuVerifying: true,
      xianyuVerifyResult: '',
      xianyuVerifyResultType: ''
    });
    const toast = this._getCustomToast();
    if (toast && toast.showLoading) {
      toast.showLoading({ title: '识别订单中...' });
    }

    // 走 COS 公网 URL，避免 cloud.downloadFile 在云函数里失败
    this._prepareXianyuScreenshotForUpload(filePath)
      .then(({ path, size }) => this._uploadXianyuScreenshotToCos(path, size))
      .then((imageUrl) => {
        if (!imageUrl || !/^https?:\/\//i.test(String(imageUrl))) {
          throw new Error('截图上传失败');
        }
        return wx.cloud.callFunction({
          name: 'recognizeXianyuOrder',
          data: { imageUrl: String(imageUrl) }
        });
      })
      .then((cfRes) => {
        const result = cfRes && cfRes.result ? cfRes.result : {};
        if (toast && toast.hideLoading) toast.hideLoading();
        this.setData({ xianyuVerifying: false });
        if (result.success) {
          this.setData({
            showXianyuVerifyModal: false,
            xianyuVerifyResult: '',
            xianyuVerifyResultType: ''
          });
          this._showCustomToast(result.message || '验证通过', 'success');
          this.checkAdminPrivilege().then(() => {
            this.loadDataFromCloud();
          });
          return;
        }
        this.setData({
          xianyuVerifyResult: this._formatXianyuVerifyError(result),
          xianyuVerifyResultType: 'error'
        });
      })
      .catch((err) => {
        console.error('[azjc] 闲鱼订单识别失败:', err);
        if (toast && toast.hideLoading) toast.hideLoading();
        const msg = String((err && (err.errMsg || err.message)) || '');
        let tip = '识别失败，请稍后重试';
        if (/downloadFile|DOWNLOAD_FAIL|下载/i.test(msg)) {
          tip = '截图处理失败，请换一张清晰截图重试';
        } else if (/exceed max size|too large|过大/i.test(msg)) {
          tip = '截图太大，传不上去\n请只截含「卖家昵称」的那一段后再传';
        } else if (/upload|上传|COS|合法域名/i.test(msg)) {
          tip = '截图上传失败，请检查网络后重试';
        } else if (err && err.code === 'READ_FAIL') {
          tip = '读取图片失败';
        }
        this.setData({
          xianyuVerifying: false,
          xianyuVerifyResult: tip,
          xianyuVerifyResultType: 'error'
        });
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
    if (nextState && this.data.shouldRecordTutorialInstall) {
      this._stopAutoSave();
      this._uploadSessionStats().catch(() => {});
      this.setData({
        shouldRecordTutorialInstall: false,
        sessionStartTime: 0,
        installSessionRecordCreated: false,
        sectionClicks: {},
        sectionDurations: {},
        currentSectionKey: null,
        currentSectionStartTime: 0
      });
    }
    this.setData({
      isAdmin: nextState,
      showUserInstallCode: nextState ? false : !!this.data.userInstallShareCode
    });
    this._showCustomToast(nextState ? '管理模式开启' : '已回到用户模式', 'none');
  },

  /** 普通用户进入教程后获取/生成安装教程查看码，供复制给安装人员 */
  async _loadUserInstallShareCode() {
    if (this.data.isShareCodeUser || this.data.shareCodeViewsExhausted || this.data.isAdmin) return;
    try {
      let creatorNickname = '';
      try {
        const userInfo = wx.getStorageSync('userInfo');
        creatorNickname = (userInfo && userInfo.nickName) || '';
      } catch (e) { /* ignore */ }

      const res = await wx.cloud.callFunction({
        name: 'generateShareCode',
        data: { creatorNickname }
      });
      const result = (res && res.result) || {};
      let code = '';
      if (result.success && result.code) {
        code = result.code;
      } else if (result.existingCode) {
        code = result.existingCode;
      }
      if (code) {
        this.setData({
          userInstallShareCode: code,
          showUserInstallCode: true
        });
      }
    } catch (err) {
      console.warn('[azjc] 加载安装码失败:', err);
    }
  },

  copyUserInstallShareCode() {
    const code = String(this.data.userInstallShareCode || '').trim();
    if (!code) {
      this._showCustomToast('安装码暂不可用', 'none');
      return;
    }
    wx.setClipboardData({
      data: code,
      success: () => {
        this._showCustomToast('安装码已复制', 'success');
      },
      fail: () => {
        this._showCustomToast('复制失败，请手动复制', 'none');
      }
    });
  },

  // 从云数据库加载数据
  loadDataFromCloud: function(done) {
    // 🔴 如果分享码次数已用完，不加载教程内容（保持页面空白）
    if (this.data.shareCodeViewsExhausted) {
      console.log('[azjc loadDataFromCloud] 分享码次数已用完，跳过加载教程内容');
      if (typeof done === 'function') done(false);
      return;
    }

    this._ensureDirectTutorialRecording();
    this._loadUserInstallShareCode();
    this._maybeShowWatchNotice();

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
          : AZJC_DEFAULT_PRODUCTS;
        
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
            this.loadVideosAndGraphics(done);
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
            this.loadVideosAndGraphics(done);
          }
        });
      },
      fail: (err) => {
        console.error('加载产品数据失败:', err);
        // 使用默认数据
        const products = AZJC_DEFAULT_PRODUCTS;
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
            this.loadVideosAndGraphics(done);
          },
          fail: () => {
            const types = [
              { name: '踏板车', number: 1 },
              { name: '跨骑车', number: 2 },
              { name: '电摩/电动自行车', number: 3 }
            ];
            this.setData({ types });
            this.loadVideosAndGraphics(done);
          }
        });
      }
    });
  },

  /** 普通用户（非分享码、非编辑模式）进入教程后开始打点，写入 chakan 汇总池供管理员列表展示 */
  async _ensureDirectTutorialRecording() {
    try {
      if (this.data.isShareCodeUser || this.data.shareCodeViewsExhausted) return;
      if (this.data.isAdmin) return;
      if (this.data.shouldRecordTutorialInstall && this.data.sessionStartTime > 0) return;

      const res = await wx.cloud.callFunction({ name: 'getOrCreateAzjcDirectPool' });
      if (!res.result || !res.result.success || !res.result._id) {
        console.warn('[azjc] getOrCreateAzjcDirectPool 失败', res);
        return;
      }

      let locationInfo = {
        province: '',
        city: '',
        district: '',
        address: '',
        latitude: null,
        longitude: null
      };
      try {
        const cached = wx.getStorageSync('last_location') || {};
        locationInfo = {
          province: cached.province || '',
          city: cached.city || '',
          district: cached.district || '',
          address: cached.address || '',
          latitude: cached.latitude != null ? cached.latitude : null,
          longitude: cached.longitude != null ? cached.longitude : null
        };
      } catch (e) {}

      this.setData({
        tutorialDirectPoolId: res.result._id,
        shouldRecordTutorialInstall: true,
        installSessionRecordCreated: false,
        sessionStartTime: Date.now(),
        sectionClicks: {},
        sectionDurations: {},
        currentSectionKey: null,
        currentSectionStartTime: 0,
        shareCodeLocationInfo: locationInfo
      });
      this._startAutoSave();
    } catch (err) {
      console.error('[azjc] _ensureDirectTutorialRecording', err);
    }
  },

  // 加载视频章节（图文详情已下线，不再拉取 image 类型）
  loadVideosAndGraphics: function(done) {
    db.collection('azjc').where({
      type: 'video'
    }).orderBy('order', 'asc').get({
      success: (res) => {
        const applyChapters = (chapters) => {
          this.setData({ chapters, graphics: [], filteredGraphics: [] });
          this.filterContent();
          if (typeof done === 'function') done(true);
        };

        if (!res.data.length) {
          applyChapters([]);
          return;
        }

        const videoUrls = res.data.map((item) => item.url).filter((id) => id);
        const mapRows = (urlMap) =>
          res.data.map((item) => {
            const raw = item.url;
            const display = (urlMap && urlMap[raw]) || raw;
            return {
              title: item.title,
              url: display,
              fileID: raw,
              coverUrl: item.coverUrl || this._azjcVideoSnapshotUrl(display) || '',
              matchCode: item.matchCode || '',
              matchCodes: readMatchCodes(item),
              orders: Array.isArray(item.orders) ? item.orders : [],
              order: item.order || 0,
              important: !!item.important,
              _id: item._id,
              needRefresh: this._isCloudFileId(raw) && !(urlMap && urlMap[raw])
            };
          });

        if (videoUrls.length > 0) {
          this._buildAzjcMediaUrlMap(videoUrls).then((urlMap) => {
            applyChapters(mapRows(urlMap));
          });
        } else {
          applyChapters(mapRows(null));
        }
      },
      fail: (err) => {
        console.error('加载视频数据失败:', err);
        this._showCustomToast('加载数据失败', 'none');
        if (typeof done === 'function') done(false);
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

  /** 教程页回到顶部：回到「选产品」，清空已选，便于重新判断组合 */
  backToTopAndReselect() {
    if (this.data.isVideoFullScreen) return;
    if (this.data.stepIndex !== 2) return;
    wx.vibrateShort({ type: 'light' });
    // 尽量暂停列表内联视频，避免切回选择页后仍在播
    try {
      const mounted = Number(this.data.chapterInlineMountIndex);
      if (mounted >= 0) {
        wx.createVideoContext(`azjc-inline-${mounted}`, this).pause();
      }
    } catch (e) { /* ignore */ }

    this.setData({
      stepIndex: 0,
      pIndex: -1,
      tIndex: -1,
      canScroll: false,
      filteredChapters: [],
      filteredGraphics: [],
      chapterInlineMountIndex: -1,
      pageTitle: '请选择产品',
      showAll: false,
      currentComboLabel: ''
    });
  },

  /** 当前选中的「产品+车型」组合码；没选全返回空串 */
  _currentMatchCode: function() {
    const { products, types, pIndex, tIndex } = this.data;
    if (pIndex < 0 || tIndex < 0) return '';
    const product = products[pIndex];
    const type = types[tIndex];
    if (!product || !type) return '';
    const pn = product.number != null && product.number !== '' ? Number(product.number) : pIndex + 1;
    const tn = type.number != null && type.number !== '' ? Number(type.number) : tIndex + 1;
    return normalizeMatchCode(`${pn}+${tn}`);
  },

  /** 把 '1+2' 转成「产品名+车型名」，查不到名字时退回原码 */
  _formatMatchCodeLabel: function(code) {
    const normalized = normalizeMatchCode(code);
    if (!normalized) return String(code || '');
    const parts = normalized.split('+');
    const pn = Number(parts[0]);
    const tn = Number(parts[1]);
    const products = this.data.products || [];
    const types = this.data.types || [];
    const product = products.find((row, i) => {
      const n = row.number != null && row.number !== '' ? Number(row.number) : i + 1;
      return n === pn;
    });
    const type = types.find((row, i) => {
      const n = row.number != null && row.number !== '' ? Number(row.number) : i + 1;
      return n === tn;
    });
    const pName = (product && product.name) || '';
    const tName = (type && type.name) || '';
    if (!pName && !tName) return normalized;
    return `${pName || ('产品' + pn)}+${tName || ('车型' + tn)}`;
  },

  /** 更新页面级「当前组合」文案；显示全部或未选全时为空 */
  _updateCurrentComboLabel: function() {
    const { stepIndex, showAll, pIndex, tIndex } = this.data;
    let label = '';
    if (stepIndex === 2 && !showAll && pIndex >= 0 && tIndex >= 0) {
      const code = this._currentMatchCode();
      if (code) label = this._formatMatchCodeLabel(code);
    }
    this.setData({ currentComboLabel: label });
  },

  _updateComboSwitchPreview: function() {
    const { comboSwitchPIndex, comboSwitchTIndex, products, types } = this.data;
    let preview = '';
    if (comboSwitchPIndex >= 0 && comboSwitchTIndex >= 0) {
      const product = products[comboSwitchPIndex];
      const type = types[comboSwitchTIndex];
      if (product && type) {
        const pn = product.number != null && product.number !== '' ? Number(product.number) : comboSwitchPIndex + 1;
        const tn = type.number != null && type.number !== '' ? Number(type.number) : comboSwitchTIndex + 1;
        preview = this._formatMatchCodeLabel(`${pn}+${tn}`);
      }
    }
    if (!preview) preview = '请选择产品和车型';
    this.setData({ comboSwitchPreview: preview });
  },

  openComboSwitch: function() {
    if (!this.data.isAdmin || this.data.showAll || this.data.stepIndex !== 2) return;
    const { pIndex, tIndex, products, types } = this.data;
    if (!products.length || !types.length) return;
    wx.vibrateShort({ type: 'light' });
    this.setData({
      showComboSwitchModal: true,
      comboSwitchClosing: false,
      comboSwitchPIndex: pIndex >= 0 ? pIndex : 0,
      comboSwitchTIndex: tIndex >= 0 ? tIndex : 0
    }, () => this._updateComboSwitchPreview());
  },

  hideComboSwitch: function() {
    this.setData({ comboSwitchClosing: true });
    setTimeout(() => {
      this.setData({
        showComboSwitchModal: false,
        comboSwitchClosing: false,
        comboSwitchPIndex: -1,
        comboSwitchTIndex: -1,
        comboSwitchPreview: ''
      });
    }, 420);
  },

  selectComboSwitchProduct: function(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!(index >= 0)) return;
    this.setData({ comboSwitchPIndex: index }, () => this._updateComboSwitchPreview());
  },

  selectComboSwitchType: function(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!(index >= 0)) return;
    this.setData({ comboSwitchTIndex: index }, () => this._updateComboSwitchPreview());
  },

  confirmComboSwitch: function() {
    const { comboSwitchPIndex, comboSwitchTIndex, products, types } = this.data;
    if (comboSwitchPIndex < 0 || comboSwitchTIndex < 0) {
      this._showCustomToast('请选择产品和车型', 'none');
      return;
    }
    if (!products[comboSwitchPIndex] || !types[comboSwitchTIndex]) return;
    if (comboSwitchPIndex === this.data.pIndex && comboSwitchTIndex === this.data.tIndex) {
      this.hideComboSwitch();
      return;
    }
    try {
      const mounted = Number(this.data.chapterInlineMountIndex);
      if (mounted >= 0) {
        wx.createVideoContext(`azjc-inline-${mounted}`, this).pause();
      }
    } catch (err) { /* ignore */ }
    wx.vibrateShort({ type: 'medium' });
    // 和上面两步点选一样：改当前产品/车型，教程按新组合重新过滤
    this.setData({
      pIndex: comboSwitchPIndex,
      tIndex: comboSwitchTIndex,
      canScroll: true,
      chapterInlineMountIndex: -1
    }, () => {
      this._trackSectionClick(`product-${comboSwitchPIndex}`);
      this._switchToSection(`product-${comboSwitchPIndex}`);
      this._trackSectionClick(`type-${comboSwitchTIndex}`);
      this._switchToSection(`type-${comboSwitchTIndex}`);
      this.filterContent();
      this.hideComboSwitch();
      this._scrollTutorialToTop();
    });
  },

  _scrollTutorialToTop: function() {
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#tutorialScroll').node();
      query.exec((res) => {
        const node = res && res[0] && res[0].node;
        if (node) node.scrollTop = 0;
      });
    });
  },

  /** 列表渲染用：多个组合拼成「产品名+车型名」给管理员看 */
  _decorateMatchCode: function(item) {
    const codes = readMatchCodes(item);
    return {
      ...item,
      matchCodes: codes,
      matchCodeText: codes.length
        ? codes.map((c) => this._formatMatchCodeLabel(c)).join('、')
        : '未设置',
      coverUrl: this._azjcDisplayCover(item),
      important: !!item.important
    };
  },

  onChapterCoverError(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (!(idx >= 0)) return;
    this.setData({ [`filteredChapters[${idx}].coverUrl`]: '' });
  },

  toggleChapterImportant: function(e) {
    if (!this.data.isAdmin) return;
    const idx = this._listVideoIndexFromEvent(e);
    if (idx < 0) return;
    const row = (this.data.filteredChapters || [])[idx];
    if (!row || !row._id) return;
    const next = !row.important;
    this._adminAzjcUpdate(row._id, { important: next })
      .then(() => {
        const chapters = (this.data.chapters || []).map((c) =>
          c._id === row._id ? { ...c, important: next } : c
        );
        this.setData({ chapters }, () => {
          this.filterContent();
          this._showCustomToast(next ? '已标为重要视频' : '已取消重要', 'success');
        });
      })
      .catch((err) => {
        console.error('toggleChapterImportant', err);
        this._showCustomToast((err && err.message) || '保存失败', 'none');
      });
  },

  // 根据选择的product+type过滤内容
  filterContent: function() {
    const { products, types, chapters, graphics, pIndex, tIndex, showAll, isAdmin } = this.data;
    _azjcLog('过滤·进入', {
      产品下标: pIndex,
      车型下标: tIndex,
      显示全部: showAll,
      管理员: isAdmin,
      章节条数: (chapters && chapters.length) || 0,
      图文章数: (graphics && graphics.length) || 0,
      说明: '会重建列表里的进度字段，进度条突然归零可对这条和「过滤·结果」'
    });
    
    // 管理员模式下，如果开启了"显示全部"，显示所有内容
    if (isAdmin && showAll) {
      // 一条内容可能挂多个码，这里按它的首个码分组，组内按该码自己的次序排
      const sortAll = (list) => [...list].sort((a, b) => {
        const ca = readMatchCodes(a)[0] || '';
        const cb = readMatchCodes(b)[0] || '';
        if (ca !== cb) return ca.localeCompare(cb);
        return readOrderFor(a, ca) - readOrderFor(b, cb);
      });
      const allChapters = sortAll(chapters);
      const allGraphics = sortAll(graphics);

      this.setData({
        filteredChapters: allChapters.map((item) => this._decorateMatchCode(item)),
        filteredGraphics: allGraphics.map((item) => this._decorateMatchCode(item)),
        chapterInlineMountIndex: -1,
        ...this._chapterInlinePlayingArrays(allChapters.length)
      });
      _azjcLog('过滤·结果', { 模式: '管理员显示全部', 视频条数: allChapters.length });
      this._updateCurrentComboLabel();
      return;
    }
    
    if (pIndex < 0 || tIndex < 0) {
      // 如果还没选择完整，不显示内容
      this.setData({
        filteredChapters: [],
        filteredGraphics: [],
        chapterInlineMountIndex: -1,
        ...this._chapterInlinePlayingArrays(0)
      });
      _azjcLog('过滤·结果', { 模式: '暂无教程', 原因: '未选全产品或车型' });
      this._updateCurrentComboLabel();
      return;
    }
    
    const product = products[pIndex];
    const type = types[tIndex];
    
    if (!product || !type) {
      this.setData({
        filteredChapters: [],
        filteredGraphics: [],
        chapterInlineMountIndex: -1,
        ...this._chapterInlinePlayingArrays(0)
      });
      this._updateCurrentComboLabel();
      return;
    }
    
    // 构建匹配码，如 '1+1', '2+3' 等（与上传/编辑时 number 解析一致）
    const matchCode = this._currentMatchCode();

    // 挂了这个组合的内容都要显示，并按「这个组合自己的次序」排
    const pickByCode = (list) => list
      .filter((item) => hasMatchCode(item, matchCode))
      .sort((a, b) => readOrderFor(a, matchCode) - readOrderFor(b, matchCode));

    const filteredChapters = pickByCode(chapters);
    const filteredGraphics = pickByCode(graphics);

    this.setData({
      filteredChapters: filteredChapters.map((item) => this._decorateMatchCode(item)),
      filteredGraphics: filteredGraphics.map((item) => this._decorateMatchCode(item)),
      chapterInlineMountIndex: -1,
      ...this._chapterInlinePlayingArrays(filteredChapters.length)
    });
    _azjcLog('过滤·结果', {
      模式: '按匹配码过滤',
      匹配码: matchCode,
      视频条数: filteredChapters.length,
      图文章数: filteredGraphics.length
    });
    this._updateCurrentComboLabel();
  },

  // 模式切换已下线（仅保留分段视频）
  switchMode: function() {
    if (this.data.mode !== 'v') this.setData({ mode: 'v' });
  },

  // 切换显示全部模式
  toggleShowAll: function() {
    const showAll = !this.data.showAll;
    this.setData({ showAll }, () => {
      this.filterContent();
    });
  },

  runDuplicateVideoCheck: function() {
    if (!this.data.isAdmin) return;
    const chapters = Array.isArray(this.data.chapters) ? this.data.chapters : [];
    if (!chapters.length) {
      this._showCustomToast('暂无视频可查重', 'none');
      return;
    }
    const exactGroups = {};
    chapters.forEach((item) => {
      const key = normalizeDuplicateVideoKey(item.fileID || item.url);
      if (!key) return;
      if (!exactGroups[key]) exactGroups[key] = [];
      exactGroups[key].push(item);
    });
    const exactRows = [];
    const exactMatchedIds = {};
    Object.keys(exactGroups).forEach((key) => {
      const list = exactGroups[key];
      if (!list || list.length < 2) return;
      const items = list.map((item) => {
        exactMatchedIds[item._id] = true;
        const decorated = this._decorateMatchCode(item);
        return {
          _id: item._id,
          title: item.title || '未命名视频',
          matchCodeText: decorated.matchCodeText || '未设置'
        };
      });
      exactRows.push({
        kind: 'exact',
        kindLabel: '精确重复',
        ruleText: '同一文件地址 / 文件 ID',
        key,
        count: items.length,
        title: items[0] && items[0].title ? items[0].title : '未命名视频',
        items
      });
    });

    const suspectGroups = {};
    chapters.forEach((item) => {
      if (exactMatchedIds[item._id]) return;
      const titleKey = normalizeSuspectedVideoTitle(item.title);
      if (!titleKey || titleKey.length < 2) return;
      if (!suspectGroups[titleKey]) suspectGroups[titleKey] = [];
      suspectGroups[titleKey].push(item);
    });
    const suspectRows = [];
    Object.keys(suspectGroups).forEach((key) => {
      const list = suspectGroups[key];
      if (!list || list.length < 2) return;
      const uniqueExactKeys = {};
      list.forEach((item) => {
        uniqueExactKeys[normalizeDuplicateVideoKey(item.fileID || item.url) || item._id] = true;
      });
      if (Object.keys(uniqueExactKeys).length < 2) return;
      const items = list.map((item) => {
        const decorated = this._decorateMatchCode(item);
        return {
          _id: item._id,
          title: item.title || '未命名视频',
          matchCodeText: decorated.matchCodeText || '未设置'
        };
      });
      suspectRows.push({
        kind: 'suspect',
        kindLabel: '疑似重复',
        ruleText: '标题归一化后相同',
        key,
        count: items.length,
        title: items[0] && items[0].title ? items[0].title : '未命名视频',
        items
      });
    });

    const duplicateVideoRows = exactRows
      .concat(suspectRows)
      .sort((a, b) => {
        const rankA = a.kind === 'exact' ? 0 : 1;
        const rankB = b.kind === 'exact' ? 0 : 1;
        return rankA - rankB || b.count - a.count || String(a.title).localeCompare(String(b.title));
      });
    if (!duplicateVideoRows.length) {
      this._showCustomToast('没有查到重复视频', 'success');
      return;
    }
    const duplicateVideoItemCount = duplicateVideoRows.reduce((sum, row) => sum + row.count, 0);
    this.setData({
      showDuplicateCheckModal: true,
      duplicateCheckClosing: false,
      duplicateVideoRows,
      duplicateVideoGroupCount: duplicateVideoRows.length,
      duplicateVideoItemCount,
      duplicateVideoExactGroupCount: exactRows.length,
      duplicateVideoSuspectGroupCount: suspectRows.length
    });
  },

  refreshAzjcData: function() {
    if (!this.data.isAdmin) return;
    this.showMyLoading('同步最新数据...');
    this.loadDataFromCloud((ok) => {
      this.hideMyLoading();
      this._showCustomToast(ok ? '已同步最新数据' : '刷新失败', ok ? 'success' : 'none');
    });
  },

  hideDuplicateCheckModal: function() {
    this.setData({ duplicateCheckClosing: true });
    setTimeout(() => {
      this.setData({
        showDuplicateCheckModal: false,
        duplicateCheckClosing: false
      });
    }, 420);
  },

  toggleShareCodeStats: function() {
    if (!this.data.isAuthorized) return;
    const next = !this.data.showShareCodeStats;
    this.setData({ showShareCodeStats: next }, () => {
      if (next) {
        this.loadShareCodeStats();
      } else {
        this.setData({
          statsSearchKeyword: '',
          statsScrollTop: 0,
          statsExpandedMap: {},
          shareCodeStatsDisplayRows: this.data.shareCodeStatsRows || []
        });
      }
    });
  },

  toggleStatsCardExpand: function(e) {
    const key = String((e.currentTarget.dataset && e.currentTarget.dataset.key) || '');
    if (!key) return;
    const map = { ...(this.data.statsExpandedMap || {}) };
    map[key] = !map[key];
    this.setData({ statsExpandedMap: map });
  },

  onStatsSearchInput: function(e) {
    const keyword = String((e && e.detail && e.detail.value) || '').trim().toUpperCase();
    this.setData({ statsSearchKeyword: keyword }, () => {
      this.applyShareCodeStatsFilter();
    });
  },

  applyShareCodeStatsFilter: function() {
    const rows = Array.isArray(this.data.shareCodeStatsRows) ? this.data.shareCodeStatsRows.slice() : [];
    const keyword = String(this.data.statsSearchKeyword || '').trim().toUpperCase();
    if (!keyword) {
      this.setData({
        shareCodeStatsDisplayRows: rows,
        statsScrollTop: 0
      });
      return;
    }
    const matchRows = [];
    rows.forEach((item) => {
      const raw = String((item && item.shareCodeRaw) || '').toUpperCase();
      const disp = String((item && item.shareCode) || '').toUpperCase();
      const nick = String((item && item.viewerNickname) || '').toUpperCase();
      if (raw.indexOf(keyword) !== -1 || disp.indexOf(keyword) !== -1 || nick.indexOf(keyword) !== -1) {
        matchRows.push(item);
      }
    });
    this.setData({
      shareCodeStatsDisplayRows: matchRows,
      statsScrollTop: 0
    });
  },

  formatStatsDate: function(input) {
    if (!input) return '';
    let d = null;
    if (input instanceof Date) d = input;
    else if (typeof input === 'string' || typeof input === 'number') d = new Date(input);
    else if (input && input.$date) d = new Date(input.$date);
    if (!d || Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  _sumVideoMinutesFromViewer: function(viewer) {
    if (!viewer || typeof viewer !== 'object') return 0;
    let total = 0;
    Object.keys(viewer).forEach((k) => {
      if (k.indexOf('sectionDurations_video_') === 0) {
        total += Number(viewer[k]) || 0;
      }
    });
    return total;
  },

  _countSectionClicksFromViewer: function(viewer) {
    if (!viewer || typeof viewer !== 'object') return 0;
    let n = 0;
    Object.keys(viewer).forEach((k) => {
      if (k.indexOf('sectionClicks_') === 0) {
        n += Number(viewer[k]) || 0;
      }
    });
    return n;
  },

  async loadShareCodeStats() {
    if (!this.data.isAuthorized) return;
    this.setData({ loadingShareCodeStats: true });
    try {
      const res = await db.collection('chakan').orderBy('createdAt', 'desc').limit(100).get();
      const docs = Array.isArray(res.data) ? res.data : [];
      const rows = [];
      const docId = (d) => String((d && d._id) != null ? d._id : '');

      docs.forEach((doc) => {
        const viewers = Array.isArray(doc.viewers) ? doc.viewers : [];
        const isPool = doc.code === AZJC_DIRECT_POOL_CODE;
        const shareCodeDisplay = isPool ? '普通安装' : (doc.code || '—');
        const shareCodeRaw = doc.code || '';
        const grouped = {};
        viewers.forEach((v) => {
          const openid = (v && v.openid) || '';
          const nickname = (v && v.nickname) || '未命名用户';
          const key = `${openid}__${nickname}`;
          if (!grouped[key]) {
            grouped[key] = {
              viewerNickname: nickname,
              creatorNickname: doc.creatorNickname || '未知',
              enterCount: 0,
              totalStayMinutes: 0,
              totalVideoMinutes: 0,
              totalSectionClicks: 0,
              lastViewTimeRaw: '',
              province: '',
              city: '',
              district: '',
              address: '',
              latitude: null,
              longitude: null
            };
          }
          const stayMin = Number(v.durationMinutes) || 0;
          const videoMin = this._sumVideoMinutesFromViewer(v);
          const clicks = this._countSectionClicksFromViewer(v);
          grouped[key].enterCount += 1;
          grouped[key].totalStayMinutes += stayMin;
          grouped[key].totalVideoMinutes += videoMin;
          grouped[key].totalSectionClicks += clicks;
          const vt = this.formatStatsDate(v.viewTime);
          if (vt && (!grouped[key].lastViewTimeRaw || vt > grouped[key].lastViewTimeRaw)) {
            grouped[key].lastViewTimeRaw = vt;
            grouped[key].province = (v && v.province) || '';
            grouped[key].city = (v && v.city) || '';
            grouped[key].district = (v && v.district) || '';
            grouped[key].address = (v && v.address) || '';
            grouped[key].latitude = v && v.latitude != null ? v.latitude : null;
            grouped[key].longitude = v && v.longitude != null ? v.longitude : null;
          }
        });

        const codePart = String(doc.code || '');
        Object.keys(grouped).forEach((k) => {
          const item = grouped[k];
          const regionParts = [item.province, item.city, item.district].filter((x) => !!String(x || '').trim());
          const regionText = regionParts.length ? regionParts.join(' ') : '—';
          const addr = String(item.address || '').trim();
          const addressDisplay = addr.length > 56 ? `${addr.slice(0, 56)}…` : addr || '—';
          const latOk = item.latitude != null && item.latitude !== '';
          const lngOk = item.longitude != null && item.longitude !== '';
          const geoText = latOk && lngOk ? `${item.latitude}, ${item.longitude}` : '—';
          rows.push({
            rowKey: `${docId(doc)}_${codePart}__${k}`,
            shareCode: shareCodeDisplay,
            shareCodeRaw,
            viewerNickname: item.viewerNickname,
            creatorNickname: item.creatorNickname,
            enterCount: item.enterCount,
            totalStayMinutesText: item.totalStayMinutes.toFixed(2),
            totalVideoMinutesText: item.totalVideoMinutes.toFixed(2),
            sectionClicksTotal: item.totalSectionClicks,
            lastViewTime: item.lastViewTimeRaw || '—',
            regionText,
            addressDisplay,
            geoText
          });
        });
      });

      rows.sort((a, b) => (a.lastViewTime < b.lastViewTime ? 1 : -1));
      this.setData({
        shareCodeStatsRows: rows,
        shareCodeStatsDisplayRows: rows,
        statsScrollTop: 0
      });
      this.applyShareCodeStatsFilter();
    } catch (err) {
      console.error('[azjc] 加载分享码统计失败:', err);
      this._showCustomToast('加载分享码统计失败', 'none', 2000);
    } finally {
      this.setData({ loadingShareCodeStats: false });
    }
  },


  // 真实媒体上传
  _ensureLocalUploadPath(filePath) {
    return new Promise((resolve, reject) => {
      const p = String(filePath || '');
      if (!p) {
        reject(new Error('文件路径无效'));
        return;
      }
      // wxfile:// 已是本地可切片读取路径，直接使用
      if (!/^https?:\/\//i.test(p) && p.indexOf('http://tmp/') !== 0) {
        resolve(p);
        return;
      }
      // http://tmp 等路径先复制到 USER_DATA_PATH，避免 saveFile 配额限制
      const extMatch = p.match(/\.[^.?#/]+(?=([?#].*)?$)/);
      const ext = extMatch ? extMatch[0] : '.bin';
      const target = `${wx.env.USER_DATA_PATH}/azjc_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      wx.getFileSystemManager().copyFile({
        srcPath: p,
        destPath: target,
        success: () => resolve(target),
        fail: (err) => {
          const msg = String((err && err.errMsg) || '');
          // 本地文件配额已满时，回退为直接使用原临时路径，避免“连上传都无法开始”
          if (msg.indexOf('maximum size of the file storage limit') !== -1 || msg.indexOf('storage limit') !== -1) {
            resolve(p);
            return;
          }
          reject(err || new Error('临时文件复制失败'));
        }
      });
    });
  },

  _cleanupTempUploadPath(path, originalPath) {
    const p = String(path || '');
    const o = String(originalPath || '');
    if (!p || p === o) return;
    if (p.indexOf(`${wx.env.USER_DATA_PATH}/azjc_upload_`) !== 0) return;
    try {
      wx.getFileSystemManager().unlink({
        filePath: p,
        fail: () => {}
      });
    } catch (e) {}
  },

  uploadMedia: function(e) {
    const mediaType = e.currentTarget.dataset.type; // 仅支持 'video'
    if (mediaType !== 'video') {
      this._showCustomToast('安装教程仅支持视频', 'none');
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: [mediaType],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const rawPath = res.tempFiles[0].tempFilePath;
        const thumbPath = (res.tempFiles[0] && res.tempFiles[0].thumbTempFilePath) || '';
        const knownSize = res.tempFiles[0] && typeof res.tempFiles[0].size === 'number' ? res.tempFiles[0].size : undefined;
        let tempPath = rawPath;
        if (mediaType === 'image') {
          try {
            tempPath = await shopImagePrepare.prepareImageFile(rawPath, 'azjc');
          } catch (err) {
            if (shopImagePrepare.isCropCancelled(err)) return;
            console.error('[azjc] uploadMedia crop', err);
            this._showCustomToast('图片处理失败', 'none', 3000);
            return;
          }
        }
        wx.showModal({
          title: '设置标题',
          editable: true,
          placeholderText: '例如：支架固定指导',
          success: (resModal) => {
            if (resModal.confirm) {
              const title = resModal.content || '未命名步骤';
              
              this.showMyLoading(mediaType === 'video' ? '压缩视频...' : '上传中...');
              const folder = `azjc/${mediaType}`;
              let copiedPath = '';
              const ready =
                mediaType === 'video'
                  ? this._prepareAzjcVideoForUpload(res.tempFiles[0])
                  : Promise.resolve({ path: tempPath, size: knownSize });
              ready
                .then((prepared) => {
                  this.showMyLoading('上传中...');
                  return this._ensureLocalUploadPath(prepared.path || tempPath).then((localPath) => {
                    copiedPath = localPath;
                    const size = prepared.size != null ? prepared.size : knownSize;
                    return mediaType === 'video'
                      ? cosUpload.uploadVideoToCos(localPath, folder, { knownSize: size })
                      : cosUpload.uploadImageToCos(localPath, folder, { knownSize: size });
                  });
                })
                .then(async (fileID) => {
                  let coverUrl = '';
                  if (mediaType === 'video' && thumbPath) {
                    coverUrl = await this._uploadAzjcCover(thumbPath);
                  }
                  const data = {
                    type: mediaType,
                    title: title,
                    createTime: db.serverDate()
                  };
                  if (mediaType === 'video') {
                    data.url = fileID;
                    if (coverUrl) data.coverUrl = coverUrl;
                  } else {
                    data.img = fileID;
                    data.desc = '';
                  }
                  const { products, types, pIndex, tIndex } = this.data;
                  let preset = '';
                  if (pIndex >= 0 && tIndex >= 0 && products[pIndex] && types[tIndex]) {
                    const pr = products[pIndex];
                    const ty = types[tIndex];
                    const pn = pr.number != null && pr.number !== '' ? Number(pr.number) : pIndex + 1;
                    const tn = ty.number != null && ty.number !== '' ? Number(ty.number) : tIndex + 1;
                    if (Number.isFinite(pn) && Number.isFinite(tn)) {
                      preset = `${pn}+${tn}`;
                    }
                  }
                  data._previewLocal = copiedPath || tempPath;
                  this._pendingUploadTemp = { copiedPath, originPath: tempPath };
                  this.showMatchCodeModal(mediaType, fileID, title, data, preset);
                  this.hideMyLoading();
                })
                .catch(err => {
                  console.error('上传文件失败:', err);
                  this.hideMyLoading();
                  this._cleanupTempUploadPath(copiedPath, tempPath);
                  this._showCustomToast('上传失败: ' + ((err && err.message) || (err && err.errMsg) || '未知错误'), 'none', 3000);
                });
            }
          }
        });
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '';
        // 用户主动取消不提示
        if (msg.indexOf('cancel') !== -1) return;
        console.error('选择媒体失败:', err);
        this._showCustomToast('选择视频失败，请重试', 'none', 2500);
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

  // 显示匹配码选择弹窗（presetMatchCode 如 "1+2"，与当前筛选一致时上传不必重选）
  showMatchCodeModal: function(mediaType, fileID, title, data, presetMatchCode) {
    const { products, types } = this._getMatchCodeSourceLists();
    
    console.log('可用产品:', products);
    console.log('可用车型:', types);
    
    // 如果确实没有任何数据，才提示
    if (products.length === 0 || types.length === 0) {
      this._showCustomToast('请先创建产品和车型', 'none', 2000);
      this.hideMyLoading();
      return;
    }
    
    // 预选：presetMatchCode 可以是 '1+2'，也可以是多码数组 ['1+2','2+3']（编辑已有内容时）
    const presetCodes = this._parsePresetMatchCodes(presetMatchCode);
    const presetProductNums = presetCodes.map((c) => Number(c.split('+')[0]));
    const presetTypeNums = presetCodes.map((c) => Number(c.split('+')[1]));

    const productOptions = this._buildMatchCodeOptions(products, presetProductNums);
    const typeOptions = this._buildMatchCodeOptions(types, presetTypeNums);

    this.setData({
      showMatchCodePicker: true,
      tempUploadData: { mediaType, fileID, title, data },
      availableProducts: productOptions,
      availableTypes: typeOptions,
      ...this._buildMatchCodePreview(productOptions, typeOptions)
    });
  },

  /** 优先用已入库（有 _id）的产品/车型；都没有时回退到当前页面列表（含默认项） */
  _getMatchCodeSourceLists: function() {
    const products = this.data.products || [];
    const types = this.data.types || [];
    const cloudProducts = products.filter((p) => p && p._id);
    const cloudTypes = types.filter((t) => t && t._id);
    return {
      products: cloudProducts.length > 0 ? cloudProducts : products,
      types: cloudTypes.length > 0 ? cloudTypes : types
    };
  },

  /** presetMatchCode 支持 '1+2' 或 ['1+2','2+3'] 两种写法 */
  _parsePresetMatchCodes: function(preset) {
    const raw = Array.isArray(preset) ? preset : [preset];
    const out = [];
    raw.forEach((c) => {
      const code = normalizeMatchCode(c);
      if (code && out.indexOf(code) < 0) out.push(code);
    });
    return out;
  },

  /**
   * 把产品/车型列表加工成可勾选项。number 缺失时沿用「下标+1」的老规则，
   * 保证生成的码和 _currentMatchCode 对得上。
   */
  _buildMatchCodeOptions: function(rows, presetNums) {
    const wanted = (presetNums || []).filter((n) => Number.isFinite(n));
    const options = (rows || []).map((row, i) => {
      const num = row.number != null && row.number !== '' ? Number(row.number) : i + 1;
      return {
        ...row,
        num,
        key: `${num}-${row._id || i}`,
        checked: wanted.indexOf(num) >= 0
      };
    });
    // 一个都没勾中（新上传、或预设的号码已被删）就默认勾第一个，避免出现空匹配码
    if (options.length && !options.some((o) => o.checked)) options[0].checked = true;
    return options;
  },

  /** 勾选的产品 × 勾选的车型 = 全部组合（预览用名称，入库仍用数字码） */
  _buildMatchCodePreview: function(productOptions, typeOptions) {
    const pChecked = (productOptions || []).filter((o) => o.checked);
    const tChecked = (typeOptions || []).filter((o) => o.checked);
    const codes = [];
    const labels = [];
    pChecked.forEach((p) => {
      tChecked.forEach((t) => {
        const code = normalizeMatchCode(`${p.num}+${t.num}`);
        if (!code || codes.indexOf(code) >= 0) return;
        codes.push(code);
        labels.push(`${p.name || ('产品' + p.num)}+${t.name || ('车型' + t.num)}`);
      });
    });
    return {
      matchCodePreviewCodes: codes,
      matchCodePreviewText: labels.length ? labels.join('、') : '请至少各选一个',
      matchCodeSelectedCount: codes.length
    };
  },

  _toggleMatchCodeOption: function(listKey, num) {
    const target = Number(num);
    if (!Number.isFinite(target)) return;
    const list = (this.data[listKey] || []).map((o) => (
      o.num === target ? { ...o, checked: !o.checked } : o
    ));
    const productOptions = listKey === 'availableProducts' ? list : this.data.availableProducts;
    const typeOptions = listKey === 'availableTypes' ? list : this.data.availableTypes;
    this.setData({
      [listKey]: list,
      ...this._buildMatchCodePreview(productOptions, typeOptions)
    });
  },

  toggleMatchCodeProduct: function(e) {
    this._toggleMatchCodeOption('availableProducts', e.currentTarget.dataset.num);
  },

  toggleMatchCodeType: function(e) {
    this._toggleMatchCodeOption('availableTypes', e.currentTarget.dataset.num);
  },

  // 关闭匹配码选择弹窗
  hideMatchCodePicker: function() {
    this.setData({ matchCodePickerClosing: true });
    setTimeout(() => {
      this._clearPendingUploadTemp();
      this.setData({
        showMatchCodePicker: false,
        tempUploadData: null,
        matchCodePickerClosing: false
      });
    }, 420);
  },

  /** 某个组合下已有内容的最大次序，用来把新内容排到该组合的末尾 */
  _maxOrderInCode: function(list, code) {
    let max = -1;
    (list || []).forEach((item) => {
      if (!hasMatchCode(item, code)) return;
      const n = readOrderFor(item, code);
      if (n > max) max = n;
    });
    return max;
  },

  // 确认匹配码选择
  confirmMatchCode: function() {
    const { tempUploadData, matchCodePreviewCodes, chapters, graphics } = this.data;
    
    if (!tempUploadData) {
      this._showCustomToast('上传数据丢失，请重新上传', 'none');
      this.hideMatchCodePicker();
      return;
    }

    const codes = (matchCodePreviewCodes || []).slice();
    if (!codes.length) {
      this._showCustomToast('产品和车型都要至少选一个', 'none');
      return;
    }
    
    const { mediaType, fileID, title, data, isEdit } = tempUploadData;
    const matchCode = codes[0];
    const siblings = mediaType === 'video' ? chapters : graphics;
    
    // 如果是编辑模式，更新现有记录
    if (isEdit && data._id) {
      const allList = mediaType === 'video' ? this.data.chapters : this.data.graphics;
      const current = allList.find(i => i._id === data._id);
      // 保留还在的组合的原有次序，新加的组合排到那个组合的末尾
      const keptOrders = readOrderMap(current || {});
      const orders = codes.map((code) => {
        if (Object.prototype.hasOwnProperty.call(keptOrders, code)) {
          return { code, order: keptOrders[code] };
        }
        if (current && hasMatchCode(current, code)) {
          return { code, order: legacyOrderOf(current) };
        }
        return { code, order: this._maxOrderInCode(siblings.filter(i => i._id !== data._id), code) + 1 };
      });
      const payload = {
        matchCode,
        matchCodes: codes,
        orders,
        order: orders[0].order
      };
      this._adminAzjcUpdate(data._id, payload)
        .then(() => {
          if (current) {
            Object.assign(current, payload);
            this.setData({
              [mediaType === 'video' ? 'chapters' : 'graphics']: allList
            });
            this.filterContent();
          }
          this.hideMatchCodePicker();
          this._showCustomToast('匹配码已更新', 'success');
        })
        .catch((err) => {
          console.error('更新匹配码失败:', err);
          this._showCustomToast((err && err.message) || '更新失败', 'none');
        });
      return;
    }
    
    // 每个组合各自排到自己那一组的末尾
    const orders = codes.map((code) => ({
      code,
      order: this._maxOrderInCode(siblings, code) + 1
    }));
    
    // 保存到云数据库
    data.matchCode = matchCode;
    data.matchCodes = codes;
    data.orders = orders;
    data.order = orders[0].order; // 兼容老字段：初始加载还在用 orderBy('order')
    if (mediaType === 'video') data.important = false;
    
    console.log('保存到数据库，数据:', data);
    this.showMyLoading('保存中...');
    
    db.collection('azjc').add({
      data: data,
      success: (addRes) => {
        const previewLocal = (data && data._previewLocal) || '';
        const sortByOrder = (a, b) => {
          const ca = readMatchCodes(a)[0] || '';
          const cb = readMatchCodes(b)[0] || '';
          if (ca !== cb) return 0;
          return readOrderFor(a, ca) - readOrderFor(b, cb);
        };
        const finishUpload = (patchLists, extraSetData) => {
          this._clearPendingUploadTemp();
          this.setData(
            {
              ...patchLists,
              ...extraSetData
            },
            () => {
              this.filterContent();
              this.hideMatchCodePicker();
              this.hideMyLoading();
              this._showCustomToast('上传成功', 'success');
            }
          );
        };

        this._resolveAzjcMediaUrl(fileID).then((resolved) => {
          const remoteUrl = resolved || fileID;

          if (mediaType === 'video') {
            const list = [...this.data.chapters];
            list.push({
              title,
              url: this._mediaCacheBust(remoteUrl),
              fileID: remoteUrl,
              coverUrl: data.coverUrl || this._azjcVideoSnapshotUrl(remoteUrl) || '',
              matchCode,
              matchCodes: codes,
              orders,
              order: data.order,
              important: false,
              _id: addRes._id
            });
            list.sort(sortByOrder);
            finishUpload({ chapters: list }, { mode: 'v' });
            return;
          }

          const list = [...this.data.graphics];
          list.push({
            title,
            img: remoteUrl,
            previewLocal,
            fileID: remoteUrl,
            matchCode,
            matchCodes: codes,
            orders,
            order: data.order,
            desc: '',
            _id: addRes._id
          });
          list.sort(sortByOrder);
          finishUpload({ graphics: list }, { mode: 'g' });

          if (previewLocal && remoteUrl) {
            wx.getImageInfo({
              src: remoteUrl,
              success: () => {
                const gIdx = this.data.graphics.findIndex((g) => g._id === addRes._id);
                const fIdx = (this.data.filteredGraphics || []).findIndex((g) => g._id === addRes._id);
                const patch = {};
                if (gIdx >= 0) patch[`graphics[${gIdx}].previewLocal`] = '';
                if (fIdx >= 0) patch[`filteredGraphics[${fIdx}].previewLocal`] = '';
                if (Object.keys(patch).length) this.setData(patch);
              }
            });
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
          
          // 更新云数据库（管理员云函数，可改他人创建的文档）
          if (item._id) {
            this._adminAzjcUpdate(item._id, {
              number: number,
              order: number
            })
              .then(() => {
                let list = [...this.data[type]];
                list[index].number = number;
                list.sort((a, b) => (a.number || 0) - (b.number || 0));
                this.setData({ [type]: list });
                this.filterContent();
                this._showCustomToast('设置成功', 'success');
              })
              .catch((err) => {
                console.error('更新失败:', err);
                this._showCustomToast((err && err.message) || '更新失败', 'none');
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

  /**
   * 交换两条内容在「当前组合」下的次序，别的组合不动。
   * 返回 Promise，写库失败时 reject。
   */
  _swapOrderInCurrentCode: function(type, itemA, itemB) {
    const code = this._currentMatchCode();
    if (!code) return Promise.reject(new Error('未选定产品或车型，无法排序'));

    const allList = type === 'chapters' ? this.data.chapters : this.data.graphics;
    const a = allList.find(i => i._id === itemA._id);
    const b = allList.find(i => i._id === itemB._id);
    if (!a || !b) return Promise.reject(new Error('找不到对应内容'));

    const orderA = readOrderFor(a, code);
    const orderB = readOrderFor(b, code);
    a.orders = buildOrdersWith(a, code, orderB);
    b.orders = buildOrdersWith(b, code, orderA);

    const writes = [a, b]
      .filter(row => row._id)
      .map(row => this._adminAzjcUpdate(row._id, { orders: row.orders }));

    this.setData({ [type === 'chapters' ? 'chapters' : 'graphics']: allList });
    return Promise.all(writes);
  },

  // 上移视频/图文
  moveItemUp: function(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = type === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    
    if (index <= 0) return; // 已经在最上面
    
    const item = list[index];
    const prevItem = list[index - 1];
    
    // 交换order
    this._swapOrderInCurrentCode(type, item, prevItem).then(() => {
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
    
    this._swapOrderInCurrentCode(type, list[index], list[index + 1]).then(() => {
      this.filterContent();
      this._showCustomToast('已下移', 'success');
    }).catch(err => {
      console.error('更新排序失败:', err);
      this._showCustomToast('更新失败', 'none');
    });
  },

  // 原地删除数据
  // chapters：列表是 filteredChapters；products/types：直接用本表下标
  // 删除走管理员云函数，任意管理员可删他人上传的内容
  deleteItem: function(e) {
    const { type, index } = e.currentTarget.dataset;
    let item = null;
    let masterKey = '';
    if (type === 'products' || type === 'types') {
      masterKey = type;
      item = (this.data[type] || [])[index];
    } else if (type === 'chapters') {
      masterKey = 'chapters';
      item = (this.data.filteredChapters || [])[index];
    } else if (type === 'graphics') {
      masterKey = 'graphics';
      item = (this.data.filteredGraphics || [])[index];
    } else {
      return;
    }

    this._showCustomModal({
      title: '确认删除',
      content: '删除后无法撤销',
      success: (res) => {
        if (!res.confirm) return;
        if (!item) {
          this._showCustomToast('未找到该条目', 'none');
          return;
        }

        const dropFromMaster = (list, target) => {
          const rows = list || [];
          if (target._id) return rows.filter((row) => row._id !== target._id);
          const hit = rows.findIndex((row, i) => {
            if (type === 'products' || type === 'types') {
              return !row._id && i === index;
            }
            return (
              !row._id &&
              row.url === target.url &&
              row.img === target.img &&
              row.title === target.title
            );
          });
          if (hit < 0) return rows;
          const next = rows.slice();
          next.splice(hit, 1);
          return next;
        };

        const applyLocalDelete = () => {
          const patch = { [masterKey]: dropFromMaster(this.data[masterKey], item) };
          this.setData(patch, () => {
            if (type === 'chapters' || type === 'graphics' || type === 'products' || type === 'types') {
              this.filterContent();
            }
            this.hideMyLoading();
            this._showCustomToast('已删除', 'success');
          });
        };

        const purgeMedia = (target) => {
          if (type !== 'chapters' && type !== 'graphics') return;
          const fileRef = target.fileID || (type === 'chapters' ? target.url : target.img);
          if (!fileRef || typeof fileRef !== 'string') return;
          if (fileRef.indexOf('cloud://') === 0) {
            wx.cloud.deleteFile({
              fileList: [fileRef],
              fail: (err) => console.error('云存储文件删除失败:', err)
            });
            return;
          }
          if (/^https?:\/\//i.test(fileRef)) {
            cosUpload.deleteCosObjectsByUrls([fileRef]).catch((err) => {
              console.error('COS 文件删除失败:', err);
            });
          }
        };

        if (!item._id) {
          applyLocalDelete();
          return;
        }

        this.showMyLoading('删除中...');
        this._adminAzjcRemove(item._id)
          .then(() => {
            purgeMedia(item);
            applyLocalDelete();
          })
          .catch((err) => {
            console.error('删除数据库记录失败:', err);
            this.hideMyLoading();
            this._showCustomToast((err && err.message) || '删除失败', 'none');
          });
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
          
          this._adminAzjcUpdate(editItemData._id, { title: newTitle })
            .then(() => {
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
            })
            .catch((err) => {
              console.error('更新失败:', err);
              this._showCustomToast((err && err.message) || '更新失败', 'none');
            });
        }
      }
    });
  },

  // 编辑匹配码
  editMatchCode: function() {
    const { editItemData } = this.data;
    
    if (!editItemData) return;

    const { products, types } = this._getMatchCodeSourceLists();
    if (products.length === 0 || types.length === 0) {
      this._showCustomToast('请先创建产品和车型', 'none', 2000);
      return;
    }

    // 该条内容已挂的全部组合都要回勾上，否则编辑一次就把别的组合弄丢了
    const presetCodes = readMatchCodes(editItemData);
    const productOptions = this._buildMatchCodeOptions(
      products,
      presetCodes.map((c) => Number(c.split('+')[0]))
    );
    const typeOptions = this._buildMatchCodeOptions(
      types,
      presetCodes.map((c) => Number(c.split('+')[1]))
    );

    this.setData({
      showMatchCodePicker: true,
      tempUploadData: {
        mediaType: editItemData.url ? 'video' : 'image',
        fileID: editItemData.fileID,
        title: editItemData.title,
        data: { _id: editItemData._id },
        isEdit: true // 标记为编辑模式
      },
      availableProducts: productOptions,
      availableTypes: typeOptions,
      ...this._buildMatchCodePreview(productOptions, typeOptions)
    });
    
    this.hideEditModal();
  },

  /** 图文：更换配图并写回云库 */
  replaceGraphicImage: function() {
    const { editItemData, editItemType } = this.data;
    if (!editItemData || !editItemData._id || editItemType !== 'graphics') return;
    shopImagePrepare.chooseAndPrepare('azjc').then((tempPath) => {
        const knownSize = undefined;
        let copiedPath = '';
        this.showMyLoading('上传中...');
        this._ensureLocalUploadPath(tempPath)
          .then((localPath) => {
            copiedPath = localPath;
            return cosUpload.uploadImageToCos(localPath, 'azjc/image', { knownSize });
          })
          .then((imageUrl) => {
            const previewLocal = copiedPath || tempPath;
            return this._adminAzjcUpdate(editItemData._id, { img: imageUrl }).then(() => {
              const gList = [...this.data.graphics];
              const hit = gList.find(i => i._id === editItemData._id);
              if (hit) {
                hit.img = imageUrl;
                hit.fileID = imageUrl;
                hit.previewLocal = previewLocal;
              }
              this.setData({
                graphics: gList,
                editItemData: {
                  ...this.data.editItemData,
                  img: imageUrl,
                  fileID: imageUrl,
                  previewLocal
                }
              });
              this.filterContent();
              this.hideMyLoading();
              this._cleanupTempUploadPath(copiedPath, tempPath);
              this._showCustomToast('配图已更新', 'success');
            });
          })
          .catch((err) => {
            console.error('[azjc] replaceGraphicImage', err);
            this.hideMyLoading();
            this._cleanupTempUploadPath(copiedPath, tempPath);
            this._showCustomToast('上传失败', 'none');
          });
    }).catch((err) => {
      if (!shopImagePrepare.isCropCancelled(err)) {
        console.error('[azjc] replaceGraphicImage pick', err);
      }
    });
  },

  // 长按开始拖拽
  onDragStart: function(e) {
    if (!this.data.isAdmin) return;
    // 「显示全部」是把各个组合混在一起列的，排序没有明确归属，先退出该模式再拖
    if (this.data.showAll) {
      this._showCustomToast('排序请先关掉「显示全部」，进到具体车型下拖', 'none', 2000);
      return;
    }
    if (!this._currentMatchCode()) {
      this._showCustomToast('请先选好产品和车型再排序', 'none', 2000);
      return;
    }
    
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
      
      // 只改当前组合下的次序，这条内容挂的其他组合不受影响
      const allList = this.data.dragType === 'chapters' ? this.data.chapters : this.data.graphics;
      const dragCode = this._currentMatchCode();
      const allItem1 = allList.find(i => i._id === list[this.data.dragIndex]._id);
      const allItem2 = allList.find(i => i._id === list[targetIndex]._id);
      
      if (dragCode && allItem1 && allItem2) {
        const order1 = readOrderFor(allItem1, dragCode);
        const order2 = readOrderFor(allItem2, dragCode);
        allItem1.orders = buildOrdersWith(allItem1, dragCode, order2);
        allItem2.orders = buildOrdersWith(allItem2, dragCode, order1);
        
        // 同步到云数据库（管理员云函数，可改他人创建的文档）
        Promise.all([allItem1, allItem2]
          .filter(row => row._id)
          .map(row => this._adminAzjcUpdate(row._id, { orders: row.orders }))
        ).catch(err => {
          console.error('更新排序失败:', err);
        });
      }
      
      const remainingOffset = deltaY - (moveIndex * cardHeightPx);
      
      const patch = {
        [this.data.dragType === 'chapters' ? 'filteredChapters' : 'filteredGraphics']: newList,
        [this.data.dragType === 'chapters' ? 'chapters' : 'graphics']: allList,
        dragIndex: targetIndex,
        dragStartY: currentY - remainingOffset,
        dragOffsetY: remainingOffset,
        lastSwapIndex: targetIndex
      };
      if (this.data.dragType === 'chapters') {
        Object.assign(patch, this._chapterInlinePlayingArrays(newList.length));
        patch.chapterInlineMountIndex = -1;
      }
      this.setData(patch);
      
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
    
    // 按当前显示顺序重排「当前组合」的次序；这条内容在别的组合里的位置原样保留
    const endCode = this._currentMatchCode();
    const updatePromises = [];
    list.forEach((item, index) => {
      const allItem = allList.find(i => i._id === item._id);
      if (!allItem || !endCode) return;
      if (readOrderFor(allItem, endCode) === index) return;
      allItem.orders = buildOrdersWith(allItem, endCode, index);
      if (allItem._id) {
        updatePromises.push(
          this._adminAzjcUpdate(allItem._id, { orders: allItem.orders }).catch(err => {
            console.error('更新order失败:', err);
          })
        );
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
    // 教程页纵向滑动主要是 scroll-view，不要写 videoSlideEndTime，否则回到前两步会短时间误伤 touchStart/touchEnd
    if (this._videoTouchMoved && this.data.stepIndex !== 2) {
      // 记录视频拖拽结束时间和方向（向下拖拽为正数）
      const slideDirection = this._videoLastMoveY > 0 ? 'down' : 'up';
      const slideDirectionZh = this._videoLastMoveY > 0 ? '向下' : '向上';
      this.setData({
        videoSlideEndTime: Date.now(),
        videoSlideDirection: slideDirection // 记录滑动方向
      });
      
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
    // 教程详情步（stepIndex=2）：内容由 scroll-view 纵向滚动，禁止与整页 translate 滑动手势混用（否则滑不动、易误触上滑换页）
    if (this.data.stepIndex === 2) {
      return;
    }
    // 🔴 修复：如果视频拖拽刚结束（1秒内），不记录起始位置，防止触发翻页
    const now = Date.now();
    const videoSlideEndTime = this.data.videoSlideEndTime;
    if (videoSlideEndTime && (now - videoSlideEndTime) < 1000) return;
    
    // 如果正在全屏或已锁定，不记录起始位置，防止误触发翻页
    if (this.data.isVideoFullScreen || this.data.locked || this._videoSwipeLock) {
      return;
    }
    this.setData({ startY: e.touches[0].pageY });
  },

  touchEnd: function(e) {
    // 如果正在全屏或已锁定，不处理翻页
    // 🔴 额外检查：如果正在处理全屏切换，也不处理翻页（防止点击全屏按钮时触发）
    if (this.data.isVideoFullScreen || this.data.locked || this._isHandlingFullScreen || this._videoSwipeLock) return;

    // 教程详情步：不根据纵向滑动切换 step，避免与 scroll-view 抢手势
    if (this.data.stepIndex === 2) {
      return;
    }

    // 🔴 修复：如果视频拖拽刚结束（1秒内），完全阻止页面滚动
    const now = Date.now();
    const videoSlideEndTime = this.data.videoSlideEndTime;

    // 🔴 修复：如果视频拖拽刚结束（1.5秒内），完全阻止页面滚动（不管什么方向）
    if (videoSlideEndTime && (now - videoSlideEndTime) < 1500) return; // 完全阻止，不管什么方向

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

    // 🔴 分享码用户：与管理员相同的手势，可在产品/车型/教程间上下滑切换（含上划回退重新选产品）
    if (this.data.isShareCodeUser) {
      if (Math.abs(distance) > 50) {
        if (distance > 0 && this.data.stepIndex > 0) {
          const newStepIndex = this.data.stepIndex - 1;
          const patch = { stepIndex: newStepIndex };
          if (newStepIndex < 2) {
            patch.canScroll = newStepIndex >= 1;
          }
          this.setData(patch);
          this.updatePageTitle(newStepIndex);
          if (newStepIndex === 1) {
            wx.nextTick(() => this.filterContent());
          }
        } else if (distance < 0 && this.data.stepIndex < 2) {
          if (this.data.stepIndex === 0 && this.data.pIndex < 0) {
            return;
          }
          if (this.data.stepIndex === 1 && this.data.tIndex < 0) {
            return;
          }
          const newStepIndex = this.data.stepIndex + 1;
          const patch = { stepIndex: newStepIndex };
          if (newStepIndex >= 1) {
            patch.canScroll = true;
          }
          this.setData(patch);
          this.updatePageTitle(newStepIndex);
          if (newStepIndex === 2) {
            wx.nextTick(() => this.filterContent());
          }
        }
      }
      return;
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
  /** cover-view 上 data-index 在模拟器/部分真机 currentTarget.dataset 为空，需配合 wxml mark:listIdx */
  _listVideoIndexFromEvent(e) {
    const ds = e.currentTarget && e.currentTarget.dataset;
    let raw = ds && ds.index;
    if (raw === undefined || raw === null || raw === '') {
      const mk = e.mark || {};
      raw = mk.listIdx !== undefined && mk.listIdx !== '' ? mk.listIdx : mk.idx;
    }
    const n = Number(raw);
    return Number.isNaN(n) || n < 0 ? -1 : n;
  },
  _formatVideoTime(sec) {
    const total = Math.max(0, Math.floor(Number(sec) || 0));
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    const mStr = mm < 10 ? `0${mm}` : `${mm}`;
    const sStr = ss < 10 ? `0${ss}` : `${ss}`;
    return `${mStr}:${sStr}`;
  },

  /** 与 filteredChapters 等长的播放态数组（openFullScreenVideo 等仍会 patch） */
  _chapterInlinePlayingArrays(len) {
    const n = Math.max(0, Math.floor(Number(len) || 0));
    return {
      chapterInlinePlaying: new Array(n).fill(false),
      chapterInlinePauseExitAnim: new Array(n).fill(false)
    };
  },
  _clearChapterInlineExitAnimTimer(idx) {
    this._chapterInlineExitAnimTimers = this._chapterInlineExitAnimTimers || {};
    const t = this._chapterInlineExitAnimTimers[idx];
    if (t) {
      clearTimeout(t);
      this._chapterInlineExitAnimTimers[idx] = null;
    }
  },
  _pauseMountedChapterInline() {
    const mounted = Number(this.data.chapterInlineMountIndex);
    if (!(mounted >= 0)) return;
    try {
      wx.createVideoContext(`azjc-inline-${mounted}`, this).pause();
    } catch (err) {}
  },

  /** 点封面才挂载原生 video；列表同时只允许一个解码器 */
  onChapterCoverTap(e) {
    const idx = this._listVideoIndexFromEvent(e);
    if (idx < 0) return;
    const item = (this.data.filteredChapters || [])[idx];
    if (!item || !item.url) {
      this._showCustomToast('视频加载中，请稍候', 'none');
      return;
    }
    const prev = Number(this.data.chapterInlineMountIndex);
    if (prev === idx) return;
    if (prev >= 0) this._pauseMountedChapterInline();
    this.setData({ chapterInlineMountIndex: idx }, () => {
      wx.nextTick(() => {
        try {
          wx.createVideoContext(`azjc-inline-${idx}`, this).play();
        } catch (err) {}
      });
    });
  },

  /** 列表内嵌视频（原生 controls）：记时长、同步进度给全屏页；同时只播一条 */
  onChapterInlineLoadedMeta(e) {
    const idx = this._listVideoIndexFromEvent(e);
    const dur = Number((e.detail && e.detail.duration) || 0) || 0;
    if (idx >= 0 && dur > 0) {
      this._chapterInlineDurationMap = this._chapterInlineDurationMap || {};
      this._chapterInlineDurationMap[idx] = Math.floor(dur);
    }
  },

  onChapterInlineTimeUpdate(e) {
    const idx = this._listVideoIndexFromEvent(e);
    if (idx < 0) return;
    const cur = Number((e.detail && e.detail.currentTime) || 0) || 0;
    this._videoProgressMap = this._videoProgressMap || {};
    this._videoProgressMap[idx] = cur;
  },

  onChapterInlinePlay(e) {
    const idx = this._listVideoIndexFromEvent(e);
    if (idx < 0) return;
    this._inlinePlayingMap = this._inlinePlayingMap || {};
    this._videoPausedMap = this._videoPausedMap || {};
    const n = (this.data.filteredChapters || []).length;
    const patch = {};
    const mounted = Number(this.data.chapterInlineMountIndex);
    for (let i = 0; i < n; i++) {
      if (i === idx) continue;
      if (i === mounted) {
        try {
          wx.createVideoContext(`azjc-inline-${i}`, this).pause();
        } catch (err) {}
      }
      this._inlinePlayingMap[i] = false;
      patch[`chapterInlinePlaying[${i}]`] = false;
      patch[`chapterInlinePauseExitAnim[${i}]`] = false;
      this._clearChapterInlineExitAnimTimer(i);
    }
    this._inlinePlayingMap[idx] = true;
    this._videoPausedMap[idx] = false;
    patch[`chapterInlinePlaying[${idx}]`] = true;
    if (Object.keys(patch).length) this.setData(patch);
  },

  onChapterInlinePause(e) {
    const idx = this._listVideoIndexFromEvent(e);
    this._clearChapterInlineExitAnimTimer(idx);
    this._inlinePlayingMap = this._inlinePlayingMap || {};
    if (idx >= 0) this._inlinePlayingMap[idx] = false;
    if (idx >= 0) {
      this.setData({
        [`chapterInlinePlaying[${idx}]`]: false,
        [`chapterInlinePauseExitAnim[${idx}]`]: false
      });
    }
    this._videoPausedMap = this._videoPausedMap || {};
    if (idx >= 0) this._videoPausedMap[idx] = true;
  },

  onChapterInlineEnded(e) {
    const idx = this._listVideoIndexFromEvent(e);
    this._clearChapterInlineExitAnimTimer(idx);
    this._inlinePlayingMap = this._inlinePlayingMap || {};
    if (idx >= 0) this._inlinePlayingMap[idx] = false;
    if (idx >= 0) {
      this.setData({
        [`chapterInlinePlaying[${idx}]`]: false,
        [`chapterInlinePauseExitAnim[${idx}]`]: false
      });
    }
    const dur = (this._chapterInlineDurationMap && this._chapterInlineDurationMap[idx]) || 0;
    if (idx >= 0 && dur > 0) {
      this._videoProgressMap = this._videoProgressMap || {};
      this._videoProgressMap[idx] = dur;
    }
  },
  _setAzjcVideoPlaybackRate(videoId, rate) {
    try {
      const ctx = wx.createVideoContext(videoId, this);
      if (ctx && typeof ctx.playbackRate === 'function') {
        ctx.playbackRate(rate);
      }
    } catch (e) {}
  },

  _clearRotateHintDismissTimer() {
    if (this._rotateHintDismissTimer) {
      clearTimeout(this._rotateHintDismissTimer);
      this._rotateHintDismissTimer = null;
    }
  },

  _stopAzjcFullscreenOrientPoll() {
    if (this._azjcFullscreenOrientInterval) {
      clearInterval(this._azjcFullscreenOrientInterval);
      this._azjcFullscreenOrientInterval = null;
    }
  },

  /** 门闸阶段：与 shouhou 一致，短周期轮询 + 布局兜底补判横竖屏 */
  _startAzjcFullscreenOrientPoll() {
    this._stopAzjcFullscreenOrientPoll();
    const TICK_MS = 56;
    const MAX_TICKS = Math.ceil(120000 / TICK_MS);
    let ticks = 0;
    this._azjcFullscreenOrientInterval = setInterval(() => {
      ticks += 1;
      if (!this.data.isVideoFullScreen || this._isClosingFullScreen) {
        this._stopAzjcFullscreenOrientPoll();
        return;
      }
      if (this.data.fullScreenPortraitFallback || this.data.fullScreenLandscapeOk) {
        this._stopAzjcFullscreenOrientPoll();
        return;
      }
      if (ticks > MAX_TICKS) {
        this._stopAzjcFullscreenOrientPoll();
        return;
      }
      this._syncFullscreenOrientationFromWindow();
    }, TICK_MS);
  },

  /** 合并 window/screen 与 deviceOrientation（与 shouhou 一致） */
  _readAzjcFullscreenViewport() {
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

  _clearGateStageTimers() {
    if (this._gateStageTimer1) {
      clearTimeout(this._gateStageTimer1);
      this._gateStageTimer1 = null;
    }
    if (this._gateStageTimer2) {
      clearTimeout(this._gateStageTimer2);
      this._gateStageTimer2 = null;
    }
    if (this._gateStageTimer3) {
      clearTimeout(this._gateStageTimer3);
      this._gateStageTimer3 = null;
    }
    this._stopLandscapeGatePhoneTilt();
  },

  _stopLandscapeGatePhoneTilt() {
    if (this._landscapeGatePhoneFirstTiltTimer) {
      clearTimeout(this._landscapeGatePhoneFirstTiltTimer);
      this._landscapeGatePhoneFirstTiltTimer = null;
    }
    if (this._landscapeGatePhoneTiltTimer) {
      clearInterval(this._landscapeGatePhoneTiltTimer);
      this._landscapeGatePhoneTiltTimer = null;
    }
  },

  /** 竖屏门闸动画在 WXML 同层 view + WXSS @keyframes；此处不再跑定时器 */
  _startLandscapeGatePhoneTilt() {},

  /** 已取消多步教程，仅保留横屏提示；此处只做清理，兼容旧调用 */
  _startGateStageSequence() {
    this._clearGateStageTimers();
    this._clearRotateHintDismissTimer();
    if (!this.data.isVideoFullScreen || this.data.fullScreenLandscapeOk) return;
    this._startLandscapeGatePhoneTilt();
  },

  /** 「请竖握」叠层出现时：检测到窗口已竖屏则立刻完成退场，避免仍跑横竖逻辑把状态打乱 */
  _maybeCompleteCloseForPortraitExitHint() {
    if (!this.data.isVideoFullScreen || this._isClosingFullScreen) return false;
    if (!this.data.fullScreenExitPortraitHint) return false;
    const { ww, hh } = this._readAzjcFullscreenViewport();
    if (ww > 0 && hh > 0 && ww <= hh) {
      this._runCloseFullScreenVideoImmediate();
      return true;
    }
    return false;
  },

  _syncFullscreenOrientationFromWindow() {
    try {
      if (this.data.fullScreenExitPortraitHint) {
        this._maybeCompleteCloseForPortraitExitHint();
        return;
      }
      const { ww, hh, deviceOrientation } = this._readAzjcFullscreenViewport();
      if (ww > 0 && hh > 0) {
        let forceLandscape = false;
        if (ww <= hh && deviceOrientation && /landscape/i.test(deviceOrientation)) {
          forceLandscape = true;
        }
        this._applyFullscreenOrientation(ww, hh, { forceLandscape });
      }
    } catch (e) {}
    this._syncAzjcFullscreenOrientationFromLayoutRect();
  },

  /** 全屏容器真实渲染宽高（px），与 shouhou 一致 */
  _syncAzjcFullscreenOrientationFromLayoutRect(options) {
    if (!this.data.isVideoFullScreen || this._isClosingFullScreen) return;
    if (this.data.fullScreenLandscapeOk && !this.data.fullScreenPortraitFallback) return;
    const immediate = !!(options && options.immediate);
    const run = () => {
      if (!this.data.isVideoFullScreen || this._isClosingFullScreen) return;
      if (this.data.fullScreenLandscapeOk && !this.data.fullScreenPortraitFallback) return;
      wx.createSelectorQuery()
        .in(this)
        .select('.fullscreen-video-container')
        .boundingClientRect((rect) => {
          if (!this.data.isVideoFullScreen || this._isClosingFullScreen) return;
          if (this.data.fullScreenLandscapeOk && !this.data.fullScreenPortraitFallback) return;
          if (!rect || rect.width <= 0 || rect.height <= 0) return;
          if (rect.width > rect.height) {
            this._applyFullscreenOrientation(rect.width, rect.height);
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
   * 全屏时根据窗口宽高判断横竖屏。勿用 page-meta 强制 landscape，否则部分机型原生 video 与 cover-view 不同步。
   * options.forceLandscape：系统已报横屏但 window 宽高尚未交换时的兜底（与 shouhou 一致）。
   */
  _applyFullscreenOrientation(w, h, options) {
    const opt = options || {};
    const ww = Number(w) || 0;
    const hh = Number(h) || 0;
    if (!this.data.isVideoFullScreen || ww <= 0 || hh <= 0) return;
    const forceLandscape = !!opt.forceLandscape;
    const isLs = forceLandscape || ww > hh;
    const wasOk = !!this.data.fullScreenLandscapeOk;

    if (isLs) {
      this._azjcFsPortraitHoldSince = 0;
      if (!wasOk) {
        this._stopAzjcFullscreenOrientPoll();
        const wantPlay =
          this._fsSavedWantPlay !== undefined && this._fsSavedWantPlay !== null
            ? !!this._fsSavedWantPlay
            : !!this._fullScreenPlayIntent;
        this._fsSavedWantPlay = undefined;
        this._clearRotateHintDismissTimer();
        this._clearGateStageTimers();
        this.setData(
          {
            fullScreenLandscapeOk: true,
            fullScreenPortraitFallback: false,
            fullScreenVideoPaused: !wantPlay,
          },
          () => {
            try {
              const ctx = wx.createVideoContext('fullscreen-video-player', this);
              if (wantPlay) {
                this._azjcFsSessionHadPlayback = true;
                ctx.play();
              } else ctx.pause();
            } catch (err) {}
            wx.nextTick(() => {
              this._refreshAzjcFullscreenTrackRect();
              this._syncAzjcFullscreenCloseCoverLayout();
            });
            setTimeout(() => {
              if (!this.data.isVideoFullScreen || this._isClosingFullScreen) return;
              if (!this.data.fullScreenLandscapeOk) return;
              this._syncAzjcFullscreenOrientationFromLayoutRect({ immediate: true });
              this._syncAzjcFullscreenCloseCoverLayout();
            }, 0);
          }
        );
      } else if (this.data.fullScreenPortraitFallback) {
        this.setData({ fullScreenPortraitFallback: false });
      }
    } else if (this.data.fullScreenPortraitFallback) {
      wx.nextTick(() => this._refreshAzjcFullscreenTrackRect());
    } else {
      // 横屏播放中 window/布局偶发返回竖屏比例：短暂忽略，避免反复进竖屏分支导致门闸闪、play/pause 打架
      if (
        this.data.fullScreenLandscapeOk &&
        this._azjcFsSessionHadPlayback &&
        !this.data.fullScreenVideoPaused
      ) {
        const now = Date.now();
        if (!this._azjcFsPortraitHoldSince) this._azjcFsPortraitHoldSince = now;
        if (now - this._azjcFsPortraitHoldSince < 2000) {
          return;
        }
      }

      const playedSeconds = Number(this._fullScreenCurrentTime || 0) || 0;
      // 仅「本次全屏里真的播过」才在竖屏时静默，避免第二个视频带着上次进度 >0.2s 却跳过横屏提示
      const sessionHadPlayback = !!this._azjcFsSessionHadPlayback;
      const playingInLandscape = this.data.fullScreenLandscapeOk && !this.data.fullScreenVideoPaused;
      const timelineLooksUsed = playedSeconds > 0.2 || !this.data.fullScreenVideoPaused;
      const hasStartedPlayback =
        (sessionHadPlayback || playingInLandscape) && timelineLooksUsed;
      if (hasStartedPlayback) {
        if (
          this.data.fullScreenPortraitFallback &&
          this.data.fullScreenRotateHintDismissed &&
          this.data.fullScreenLandscapeOk
        ) {
          return;
        }
        this._azjcFsPortraitHoldSince = 0;
        this._stopAzjcFullscreenOrientPoll();
        this._clearRotateHintDismissTimer();
        this._clearGateStageTimers();
        const wantPlay =
          this._fsSavedWantPlay !== undefined && this._fsSavedWantPlay !== null
            ? !!this._fsSavedWantPlay
            : !!this._fullScreenPlayIntent;
        this._fsSavedWantPlay = undefined;
        this.setData(
          {
            fullScreenPortraitFallback: true,
            fullScreenLandscapeOk: true,
            fullScreenRotateHintDismissed: true,
            fullScreenVideoPaused: !wantPlay
          },
          () => {
            try {
              const ctx = wx.createVideoContext('fullscreen-video-player', this);
              if (wantPlay) ctx.play();
              else ctx.pause();
            } catch (err) {}
            wx.nextTick(() => {
              this._refreshAzjcFullscreenTrackRect();
              this._syncAzjcFullscreenCloseCoverLayout();
            });
          }
        );
        return;
      }
      this._azjcFsPortraitHoldSince = 0;
      if (wasOk) {
        this._fsSavedWantPlay = !this.data.fullScreenVideoPaused;
      }
      this.setData(
        {
          fullScreenLandscapeOk: false,
          fullScreenRotateHintDismissed: false,
          fullScreenGateStage: 1,
          fullScreenVideoPaused: true,
        },
        () => {
          try {
            wx.createVideoContext('fullscreen-video-player', this).pause();
          } catch (e) {}
          wx.nextTick(() => this._refreshAzjcFullscreenTrackRect());
          this._startGateStageSequence();
          this._startAzjcFullscreenOrientPoll();
        }
      );
    }
  },

  /** 与 case 全屏一致：缓存轨道 inner 矩形，拖拽比例按 inner 宽度计算，避免「拖一下跳一下」 */
  _refreshAzjcFullscreenTrackRect() {
    if (!this.data.isVideoFullScreen) return;
    wx.createSelectorQuery()
      .in(this)
      .select('#azjc-fullscreen-track-inner')
      .boundingClientRect((rect) => {
        if (rect && rect.width > 0) {
          this._fullScreenTrackInnerRectCached = rect;
        }
      })
      .exec();
  },

  /** cover-view 坐标相对 video 布局框；用窗口胶囊/安全区与 video rect 做差，避免横屏「飘」到中间 */
  _syncAzjcFullscreenCloseCoverLayout() {
    if (!this.data.isVideoFullScreen || !this.data.fullScreenLandscapeOk || this._isClosingFullScreen) return;
    wx.nextTick(() => {
      if (!this.data.isVideoFullScreen || !this.data.fullScreenLandscapeOk || this._isClosingFullScreen) return;
      wx.createSelectorQuery()
        .in(this)
        .select('#fullscreen-video-player')
        .boundingClientRect((rect) => {
          if (!rect || rect.width <= 0 || rect.height <= 0) return;
          if (!this.data.isVideoFullScreen || !this.data.fullScreenLandscapeOk || this._isClosingFullScreen) return;
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
          if (this.data.fullScreenCloseCoverStyle === nextStyle) return;
          this.setData({ fullScreenCloseCoverStyle: nextStyle });
        })
        .exec();
    });
  },

  _azjcFullscreenRatioFromClientX(x) {
    const duration = Number(this.data.fullScreenVideoDuration || 0) || 0;
    if (duration <= 0 || x === undefined || x === null) return null;
    const rect =
      this._fullScreenTrackDrag && this._fullScreenTrackDrag.width > 0
        ? this._fullScreenTrackDrag
        : this._fullScreenTrackInnerRectCached && this._fullScreenTrackInnerRectCached.width > 0
          ? this._fullScreenTrackInnerRectCached
          : null;
    let ratio;
    if (rect) {
      ratio = (x - rect.left) / rect.width;
    } else {
      try {
        const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        ratio = x / (win.windowWidth || win.screenWidth || 375);
      } catch (e) {
        ratio = x / 375;
      }
    }
    return Math.max(0, Math.min(1, ratio));
  },

  /**
   * touchPhase: start | move | end
   * 拖动中只改 UI，不调 seek：频繁 seek 会卡解码，手指跟不住。
   * 仅在 start/end  seek（start 对齐起点，松手终点对齐）。
   */
  _applyAzjcFullscreenSeekFromTouch(clientX, touchPhase) {
    const ratio = this._azjcFullscreenRatioFromClientX(clientX);
    if (ratio == null) return;
    const duration = Number(this.data.fullScreenVideoDuration || 0) || 0;
    const target = ratio * duration;
    this._fullScreenCurrentTime = target;
    const percent = ratio * 100;
    const patch = {
      fullScreenVideoCurrentTime: target,
      fullScreenVideoCurrentText: this._formatVideoTime(target),
      fullScreenVideoProgress: Math.round(ratio * 1000),
      fullScreenVideoProgressPercent: percent
    };
    const phase = touchPhase || 'start';
    const runSeek = () => {
      try {
        const videoContext = wx.createVideoContext('fullscreen-video-player', this);
        if (videoContext && typeof videoContext.seek === 'function') {
          videoContext.seek(target);
        }
      } catch (err) {}
    };

    if (phase === 'end') {
      this._azjcDragUiRaf = 0;
      this._azjcSeekThrottleAt = 0;
      this.setData(patch);
      runSeek();
      return;
    }

    if (phase === 'move') {
      this.setData(patch);
      return;
    }

    this.setData(patch);
    runSeek();
  },

  _forceAzjcPortraitExit() {
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

  /** 见售后 shouhou：退出全屏锁 portrait 后需恢复 auto，否则第二次进全屏旋转不更新窗口尺寸 */
  _restoreAzjcPageOrientationAutoForFullScreen() {
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

  onFullscreenVideoSpeedHoldStart() {
    if (!this.data.isVideoFullScreen || !this.data.fullScreenLandscapeOk) return;
    if (this._fsSpeedHoldTimer) clearTimeout(this._fsSpeedHoldTimer);
    this._fsSpeedHoldTimer = setTimeout(() => {
      this._fsSpeedHoldTimer = null;
      this._setAzjcVideoPlaybackRate('fullscreen-video-player', 2);
      this._fsSpeedHoldActive = true;
    }, 400);
  },

  onFullscreenVideoSpeedHoldEnd() {
    if (this._fsSpeedHoldTimer) {
      clearTimeout(this._fsSpeedHoldTimer);
      this._fsSpeedHoldTimer = null;
      return;
    }
    if (this._fsSpeedHoldActive) {
      this._setAzjcVideoPlaybackRate('fullscreen-video-player', 1);
      this._fsSpeedHoldActive = false;
    }
  },

// 3. 修改：滚动监听 (只记录不渲染)

  onScroll(e) {
    if (!this.data.isVideoFullScreen) {
      this.privateScrollTop = e.detail.scrollTop;
    }
  },

  /** 列表封面卡片点击进入全屏播放 */
  onChapterCardTap(e) {
    this.openFullScreenVideo(e);
  },

  _cleanupReplacedChapterAssets(oldRow, newVideoUrl, newCoverUrl) {
    const oldVideo = String((oldRow && (oldRow.fileID || oldRow.url)) || '').trim();
    const oldCover = String((oldRow && oldRow.coverUrl) || '').trim();
    const removeList = [];
    if (oldVideo && oldVideo !== String(newVideoUrl || '').trim()) removeList.push(oldVideo);
    if (oldCover && newCoverUrl && oldCover !== String(newCoverUrl || '').trim()) removeList.push(oldCover);
    if (!removeList.length) return Promise.resolve();
    return cosUpload.deleteCosObjectsByUrls(removeList).catch((err) => {
      console.warn('[azjc] cleanup replaced chapter assets failed', err);
    });
  },

  /** 管理员：替换本条章节视频（COS），写入 azjc 文档 url */
  uploadChapterVideo(e) {
    const idx = this._listVideoIndexFromEvent(e);
    if (idx < 0 || !this.data.isAdmin) return;
    const row = (this.data.filteredChapters || [])[idx];
    if (!row || !row._id) {
      this._showCustomToast('无法保存视频', 'none');
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const f = res.tempFiles && res.tempFiles[0];
        if (!f || !f.tempFilePath) return;
        const tempPath = f.tempFilePath;
        const thumbPath = f.thumbTempFilePath || '';
        const knownSize = typeof f.size === 'number' ? f.size : undefined;
        const oldRow = { ...row };
        this.showMyLoading('压缩视频...');
        let copiedPath = '';
        this._prepareAzjcVideoForUpload(f)
          .then((prepared) => {
            this.showMyLoading('上传视频...');
            return this._ensureLocalUploadPath(prepared.path || tempPath).then((localPath) => {
              copiedPath = localPath;
              const size = prepared.size != null ? prepared.size : knownSize;
              return cosUpload.uploadVideoToCos(localPath, 'azjc/video', { knownSize: size });
            });
          })
          .then((videoUrl) => {
            const coverP = thumbPath ? this._uploadAzjcCover(thumbPath) : Promise.resolve('');
            return coverP.then((coverUrl) => {
              const patch = { url: videoUrl };
              if (coverUrl) patch.coverUrl = coverUrl;
              return this._adminAzjcUpdate(row._id, patch).then(() => ({ videoUrl, coverUrl }));
            });
          })
          .then(({ videoUrl, coverUrl }) => {
            const displayUrl = this._mediaCacheBust(videoUrl);
            const chapters = (this.data.chapters || []).map((c) =>
              c._id === row._id
                ? {
                    ...c,
                    url: displayUrl,
                    fileID: videoUrl,
                    coverUrl: coverUrl || this._azjcVideoSnapshotUrl(displayUrl) || ''
                  }
                : c
            );
            this.setData({ chapters }, () => {
              this.filterContent();
              this.hideMyLoading();
              this._cleanupTempUploadPath(copiedPath, tempPath);
              this._cleanupReplacedChapterAssets(oldRow, videoUrl, coverUrl);
              this._showCustomToast('视频已替换', 'success');
            });
          })
          .catch((err) => {
            console.error('uploadChapterVideo', err);
            this.hideMyLoading();
            if (copiedPath) this._cleanupTempUploadPath(copiedPath, tempPath);
            this._showCustomToast('视频上传失败', 'none');
          });
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.indexOf('cancel') !== -1) return;
        console.error('uploadChapterVideo chooseMedia', err);
        this._showCustomToast('选择视频失败', 'none', 2500);
      }
    });
  },

  // 🔴 打开全屏视频遮罩层（自定义按钮触发）
  openFullScreenVideo(e) {
    const index = this._listVideoIndexFromEvent(e);
    if (index < 0) return;
    const sectionKey = `video-${index}`;
    this._trackSectionClick(sectionKey);
    this._switchToSection(sectionKey);
    const videoUrl = this.data.filteredChapters[index]?.url || '';
    if (!videoUrl) {
      this._showCustomToast('暂无视频', 'none');
      return;
    }

    this._pauseMountedChapterInline();
    this._inlinePlayingMap = this._inlinePlayingMap || {};
    this._inlinePlayingMap[index] = false;
    this._clearChapterInlineExitAnimTimer(index);
    this.setData({
      chapterInlineMountIndex: -1,
      [`chapterInlinePlaying[${index}]`]: false,
      [`chapterInlinePauseExitAnim[${index}]`]: false
    });

    if (this._azjcFsCloseDelayTimer) {
      clearTimeout(this._azjcFsCloseDelayTimer);
      this._azjcFsCloseDelayTimer = null;
    }
    this._isClosingFullScreen = false;

    const fromMap = Number((this._videoProgressMap && this._videoProgressMap[index]) || 0) || 0;
    const mainCurrentTime = fromMap;
    const mapP = this._videoPausedMap && this._videoPausedMap[index];
    const mainPaused = mapP !== undefined && mapP !== null ? !!mapP : false;

    let sys = {};
    try {
      sys = (wx.getDeviceInfo && wx.getDeviceInfo()) || (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {};
    } catch (e) {
      sys = { 取系统信息失败: String(e) };
    }
    _azjcLog('全屏·打开·进入', {
      视频序号: index,
      是否有地址: !!videoUrl,
      当前秒数: mainCurrentTime,
      是否暂停: mainPaused,
      时间对齐: { 内存进度秒: fromMap, 采用秒数: mainCurrentTime },
      设备: { 平台: sys.platform, 机型: sys.brand, 系统: sys.system }
    });

    // 🔴 标记正在处理全屏切换，防止 touchEnd 事件干扰
    this._isHandlingFullScreen = true;

    // 仅用于日志：卡片位置（不再用于飞入动画；真机上容器 transform 会导致 video 内 cover-view 错位「从中间飞到四角」）
    wx.createSelectorQuery()
      .in(this)
      .select(`#video-card-${index}`)
      .boundingClientRect((rect) => {
        _azjcLog('全屏·打开·卡片位置', rect || { 说明: '未取到布局' });
      })
      .exec();

    this._azjcFsSessionHadPlayback = false;
    this._azjcFsPortraitHoldSince = 0;
    this._fullScreenCurrentTime = mainCurrentTime;
    this._fullScreenFromVideoIndex = index;
    this._fullScreenPlayIntent = !mainPaused;
    this._fullScreenExitPausedFallback = mainPaused;
    this._fsSavedWantPlay = undefined;
    this._videoPausedMap = this._videoPausedMap || {};
    this._videoPausedMap[index] = mainPaused;
    this._videoProgressMap = this._videoProgressMap || {};
    this._videoProgressMap[index] = mainCurrentTime;

    if (this._exitPortraitAnimTimer) {
      clearTimeout(this._exitPortraitAnimTimer);
      this._exitPortraitAnimTimer = null;
    }
    this._clearRotateHintDismissTimer();
    this._clearGateStageTimers();

    const openPatch = {
      isVideoFullScreen: true,
      fullScreenVideoUrl: videoUrl,
      fullScreenVideoIndex: index,
      fullScreenLandscapeOk: false,
      fullScreenExitPortraitHint: false,
      fullScreenRotateHintDismissed: false,
      fullScreenPortraitFallback: false,
      fullScreenGateStage: 1,
      fullScreenVideoPaused: true,
      fullScreenVideoCurrentTime: mainCurrentTime,
      fullScreenVideoCurrentText: this._formatVideoTime(mainCurrentTime),
      fullScreenVideoDuration: 0,
      fullScreenVideoDurationText: '00:00',
      fullScreenVideoProgress: 0,
      fullScreenVideoProgressPercent: 0,
      fullScreenVideoInitialStyle: '',
      fullScreenVideoTransform: 'active',
      fullScreenVideoMaskClosing: false,
      fullScreenCloseCoverStyle: '',
      locked: true
    };

    _azjcLog('全屏·打开·界面数据', {
      写入字段数: Object.keys(openPatch).length,
      无飞入动画: true,
      容器状态类: openPatch.fullScreenVideoTransform
    });

    this._azjcFsTuLogAt = 0;

    this.setData(openPatch, () => {
      _azjcLog('全屏·打开·界面回调', { 视频序号: index });
      this._startGateStageSequence();
    });

    wx.setPageStyle({
      style: {
        overflow: 'hidden',
        height: '100vh'
      }
    });
    this._restoreAzjcPageOrientationAutoForFullScreen();
    this._azjcFsOrientPollAt = 0;

    wx.nextTick(() => {
      try {
        const videoContext = wx.createVideoContext('fullscreen-video-player', this);
        if (typeof videoContext.playbackRate === 'function') {
          videoContext.playbackRate(1);
        }
        if (mainCurrentTime > 0) {
          videoContext.seek(mainCurrentTime);
        }
        videoContext.pause();
        this._syncFullscreenOrientationFromWindow();
        this._startAzjcFullscreenOrientPoll();
        wx.nextTick(() => {
          this._refreshAzjcFullscreenTrackRect();
          this._syncAzjcFullscreenCloseCoverLayout();
        });
        _azjcLog('全屏·打开·播放器', {
          已跳转秒: mainCurrentTime,
          列表意图播放: !mainPaused,
          说明: '竖屏不播，横屏后按意图播放'
        });
      } catch (err) {
        _azjcLog('全屏·打开·播放器异常', { 错误: String(err) });
      }
    });
  },

  /**
   * 竖排锁定等无法横屏时：允许在竖屏窗口内播放（体验较差，仅兜底）
   */
  onAllowPortraitPlayback() {
    if (!this.data.isVideoFullScreen || this.data.fullScreenLandscapeOk) return;
    this._azjcFsSessionHadPlayback = true;
    this._stopAzjcFullscreenOrientPoll();
    this._clearRotateHintDismissTimer();
    this._clearGateStageTimers();
    const wantPlay =
      this._fsSavedWantPlay !== undefined && this._fsSavedWantPlay !== null
        ? !!this._fsSavedWantPlay
        : !!this._fullScreenPlayIntent;
    this._fsSavedWantPlay = undefined;
    this.setData(
      {
        fullScreenPortraitFallback: true,
        fullScreenLandscapeOk: true,
        fullScreenVideoPaused: !wantPlay,
      },
      () => {
        try {
          const ctx = wx.createVideoContext('fullscreen-video-player', this);
          if (wantPlay) ctx.play();
          else ctx.pause();
        } catch (err) {}
        wx.nextTick(() => {
          this._refreshAzjcFullscreenTrackRect();
          this._syncAzjcFullscreenCloseCoverLayout();
        });
      }
    );
  },

  /** 全屏主画面区单击：暂停/播放（底部留白见 .fullscreen-native-tap-pause：含进度条区+边框） */
  onFullScreenCoverTap() {
    this.toggleFullScreenVideoPlay();
  },

  toggleFullScreenVideoPlay() {
    if (!this.data.fullScreenLandscapeOk) {
      this._showCustomToast('请先横屏观看，或使用下方竖屏播放', 'none');
      return;
    }
    const paused = !this.data.fullScreenVideoPaused;
    const idx = this.data.fullScreenVideoIndex;
    this._videoPausedMap = this._videoPausedMap || {};
    if (idx >= 0) this._videoPausedMap[idx] = paused;
    this.setData({ fullScreenVideoPaused: paused }, () => {
      const ctx = wx.createVideoContext('fullscreen-video-player', this);
      try {
        if (paused) ctx.pause();
        else ctx.play();
      } catch (err) {}
    });
  },

  // 🔴 关闭全屏视频遮罩层
  closeFullScreenVideo(e) {
    _azjcLog('全屏·关闭·点击', { 来源: e ? '触摸事件' : '无事件对象' });

    if (this._fsSpeedHoldTimer) {
      clearTimeout(this._fsSpeedHoldTimer);
      this._fsSpeedHoldTimer = null;
    }
    if (this._fsSpeedHoldActive) {
      this._setAzjcVideoPlaybackRate('fullscreen-video-player', 1);
      this._fsSpeedHoldActive = false;
    }

    if (this.data.fullScreenExitPortraitHint) {
      if (this._exitPortraitAnimTimer) {
        clearTimeout(this._exitPortraitAnimTimer);
        this._exitPortraitAnimTimer = null;
      }
      this._runCloseFullScreenVideoImmediate();
      return;
    }

    if (this._isClosingFullScreen) {
      _azjcLog('全屏·关闭·跳过', { 原因: '正在关闭中重复点击' });
      return;
    }

    // 横屏观看中退出：小提示叠层；视频不强制暂停，用户未竖屏可继续播；竖屏窗口后自动退场
    if (
      this.data.fullScreenLandscapeOk &&
      !this.data.fullScreenExitPortraitHint &&
      !this.data.fullScreenPortraitFallback
    ) {
      this.setData({ fullScreenExitPortraitHint: true });
      return;
    }

    this._runCloseFullScreenVideoImmediate();
  },

  _runCloseFullScreenVideoImmediate() {
    if (this._isClosingFullScreen) return;
    this._isClosingFullScreen = true;
    this._azjcFsSessionHadPlayback = false;
    this._azjcFsPortraitHoldSince = 0;
    this._stopAzjcFullscreenOrientPoll();
    this._forceAzjcPortraitExit();

    const pausedState = this.data.fullScreenLandscapeOk
      ? this.data.fullScreenVideoPaused
      : !!this._fullScreenExitPausedFallback;
    this._fullScreenExitPausedFallback = undefined;
    const videoIndex = this.data.fullScreenVideoIndex;
    const exitTime = Number(this._fullScreenCurrentTime || 0) || 0;
    const fsDur = Number(this.data.fullScreenVideoDuration || 0) || 0;
    if (videoIndex >= 0 && fsDur > 0) {
      this._chapterInlineDurationMap = this._chapterInlineDurationMap || {};
      this._chapterInlineDurationMap[videoIndex] = Math.floor(fsDur);
    }

    _azjcLog('全屏·关闭·开始', { 全屏时是否暂停: pausedState, 视频序号: videoIndex, 退出秒数: exitTime });

    this.setData({
      fullScreenExitPortraitHint: false,
      fullScreenVideoTransform: '',
      fullScreenVideoMaskClosing: true
    });

    try {
      const fsCtx = wx.createVideoContext('fullscreen-video-player', this);
      if (fsCtx) fsCtx.pause();
    } catch (e) {}

    this._videoProgressMap = this._videoProgressMap || {};
    this._videoPausedMap = this._videoPausedMap || {};
    if (videoIndex >= 0) {
      this._videoProgressMap[videoIndex] = exitTime;
      this._videoPausedMap[videoIndex] = pausedState;
    }

    this._clearRotateHintDismissTimer();
    this._clearGateStageTimers();

    const closeDelayMs = 380;
    this._azjcFsCloseDelayTimer = setTimeout(() => {
      this._azjcFsCloseDelayTimer = null;
      this.setData({
        isVideoFullScreen: false,
        fullScreenLandscapeOk: false,
        fullScreenExitPortraitHint: false,
        fullScreenRotateHintDismissed: false,
        fullScreenPortraitFallback: false,
        fullScreenGateStage: 1,
        fullScreenVideoUrl: '',
        fullScreenVideoIndex: -1,
        fullScreenVideoPaused: false,
        fullScreenVideoCurrentTime: 0,
        fullScreenVideoCurrentText: '00:00',
        fullScreenVideoDuration: 0,
        fullScreenVideoDurationText: '00:00',
        fullScreenVideoProgress: 0,
        fullScreenVideoProgressPercent: 0,
        fullScreenVideoInitialStyle: '',
        fullScreenVideoMaskClosing: false,
        fullScreenCloseCoverStyle: '',
        chapterInlineMountIndex: videoIndex >= 0 ? videoIndex : -1
      }, () => {
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
            this.setData({ locked: false });
            this._isHandlingFullScreen = false;
            this._isClosingFullScreen = false;
            _azjcLog('全屏·关闭·结束', { 视频序号: videoIndex, 退出秒数: exitTime });
            if (videoIndex >= 0) {
              wx.nextTick(() => {
                try {
                  const ictx = wx.createVideoContext(`azjc-inline-${videoIndex}`, this);
                  if (exitTime > 0.05) ictx.seek(exitTime);
                  ictx.pause();
                } catch (e) {}
              });
            }
          }, 100);
        });
      });
    }, closeDelayMs);
  },

  onFullScreenVideoError(e) {
    console.error('全屏视频错误', e && e.detail);
    this._showCustomToast('视频加载失败', 'none');
  },

  onFullScreenVideoTimeUpdate: function(e) {
    if (this._fullScreenTrackDragging) return;
    if (this.data.isVideoFullScreen) {
      if (this.data.fullScreenExitPortraitHint) {
        this._maybeCompleteCloseForPortraitExitHint();
      }
      const now = Date.now();
      let orientGap = 140;
      if (!this.data.fullScreenLandscapeOk) orientGap = 56;
      else if (this.data.fullScreenExitPortraitHint) orientGap = 72;
      if (!this._azjcFsOrientPollAt || now - this._azjcFsOrientPollAt > orientGap) {
        this._azjcFsOrientPollAt = now;
        this._syncFullscreenOrientationFromWindow();
      }
    }
    const current = Number((e && e.detail && e.detail.currentTime) || 0) || 0;
    this._fullScreenCurrentTime = current;
    if (this.data.isVideoFullScreen && this.data.fullScreenLandscapeOk && current > 0.05) {
      this._azjcFsSessionHadPlayback = true;
    }
    const fsIdx = this.data.fullScreenVideoIndex;
    if (fsIdx >= 0) {
      this._videoProgressMap = this._videoProgressMap || {};
      this._videoProgressMap[fsIdx] = current;
    }
    const duration = Number(this.data.fullScreenVideoDuration || 0) || 0;
    const progress = duration > 0 ? Math.min(1000, Math.max(0, Math.floor(current / duration * 1000))) : 0;
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    const inLandscapeGate = this.data.isVideoFullScreen && !this.data.fullScreenLandscapeOk;
    if (!inLandscapeGate) {
      const tick = Date.now();
      if (!this._azjcFsSetDataAt || tick - this._azjcFsSetDataAt >= 250) {
        this._azjcFsSetDataAt = tick;
        this.setData({
          fullScreenVideoCurrentTime: current,
          fullScreenVideoProgress: progress,
          fullScreenVideoProgressPercent: percent,
          fullScreenVideoCurrentText: this._formatVideoTime(current)
        });
      }
    }
    const now = Date.now();
    if (!this._azjcFsTuLogAt || now - this._azjcFsTuLogAt > 2000) {
      this._azjcFsTuLogAt = now;
      _azjcLog('全屏·播放进度更新', { 当前秒: current, 总时长秒: duration, 进度百分比: percent, 正在拖拽进度条: false });
    }
  },

  onFullScreenVideoLoadedMetadata: function(e) {
    const duration = Number((e && e.detail && e.detail.duration) || 0) || 0;
    const current = Number(this._fullScreenCurrentTime || 0) || 0;
    const idx = this.data.fullScreenVideoIndex;
    if (idx >= 0) {
      this._videoDurationMap = this._videoDurationMap || {};
      this._videoDurationMap[idx] = duration;
    }
    _azjcLog('全屏·元数据就绪', {
      总时长秒: duration,
      当前秒: current,
      视频序号: this.data.fullScreenVideoIndex
    });
    const progress = duration > 0 ? Math.min(1000, Math.max(0, Math.floor(current / duration * 1000))) : 0;
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    this.setData({
      fullScreenVideoDuration: duration,
      fullScreenVideoDurationText: this._formatVideoTime(duration),
      fullScreenVideoCurrentText: this._formatVideoTime(current),
      fullScreenVideoProgress: progress,
      fullScreenVideoProgressPercent: percent
    });
    wx.nextTick(() => {
      this._refreshAzjcFullscreenTrackRect();
      this._syncAzjcFullscreenCloseCoverLayout();
    });
  },

  onFullScreenNativePlay() {
    if (!this.data.isVideoFullScreen) return;
    this._azjcFsSessionHadPlayback = true;
    const idx = this.data.fullScreenVideoIndex;
    this._videoPausedMap = this._videoPausedMap || {};
    if (idx >= 0) this._videoPausedMap[idx] = false;
    if (this.data.fullScreenVideoPaused) {
      this.setData({ fullScreenVideoPaused: false });
    }
  },

  onFullScreenNativePause() {
    if (!this.data.isVideoFullScreen) return;
    const idx = this.data.fullScreenVideoIndex;
    this._videoPausedMap = this._videoPausedMap || {};
    if (idx >= 0) this._videoPausedMap[idx] = true;
    if (!this.data.fullScreenVideoPaused) {
      this.setData({ fullScreenVideoPaused: true });
    }
  },

  onFullScreenSeekChanging(e) {
    const value = Number((e && e.detail && e.detail.value) || 0) || 0;
    const duration = Number(this.data.fullScreenVideoDuration || 0) || 0;
    const current = duration > 0 ? value / 1000 * duration : 0;
    this.setData({
      fullScreenVideoProgress: value,
      fullScreenVideoCurrentText: this._formatVideoTime(current)
    });
  },

  onFullScreenSeekChange(e) {
    const value = Number((e && e.detail && e.detail.value) || 0) || 0;
    const duration = Number(this.data.fullScreenVideoDuration || 0) || 0;
    const target = duration > 0 ? value / 1000 * duration : 0;
    const videoContext = wx.createVideoContext('fullscreen-video-player', this);
    if (videoContext && typeof videoContext.seek === 'function') {
      videoContext.seek(target);
    }
    this._fullScreenCurrentTime = target;
    this.setData({
      fullScreenVideoCurrentTime: target,
      fullScreenVideoCurrentText: this._formatVideoTime(target),
      fullScreenVideoProgress: value,
      fullScreenVideoProgressPercent: duration > 0 ? Math.min(100, Math.max(0, (target / duration) * 100)) : 0
    });
  },

  onFullScreenTrackTouchStart(e) {
    if (!this.data.fullScreenLandscapeOk) {
      this._showCustomToast('请先横屏观看', 'none');
      return;
    }
    this._fullScreenTrackDragging = true;
    const gen = (this._fullScreenTrackGen = (this._fullScreenTrackGen || 0) + 1);
    const touch = e.touches && e.touches[0];
    const clientX = touch
      ? touch.clientX != null
        ? touch.clientX
        : touch.pageX
      : undefined;
    this._fullScreenLastTouchX = clientX;
    const cached = this._fullScreenTrackInnerRectCached;
    if (cached && cached.width > 0) {
      this._fullScreenTrackDrag = { left: cached.left, width: cached.width };
      if (clientX !== undefined) this._applyAzjcFullscreenSeekFromTouch(clientX, 'start');
    }
    wx.createSelectorQuery()
      .in(this)
      .select('#azjc-fullscreen-track-inner')
      .boundingClientRect((rect) => {
        if (this._fullScreenTrackGen !== gen) return;
        if (!rect || !rect.width) return;
        this._fullScreenTrackInnerRectCached = rect;
        this._fullScreenTrackDrag = { left: rect.left, width: rect.width };
        const x = this._fullScreenLastTouchX !== undefined ? this._fullScreenLastTouchX : clientX;
        if (x !== undefined) this._applyAzjcFullscreenSeekFromTouch(x, 'start');
      })
      .exec();
  },

  onFullScreenTrackTouchMove(e) {
    if (!this.data.fullScreenLandscapeOk) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const clientX = touch.clientX != null ? touch.clientX : touch.pageX;
    this._fullScreenLastTouchX = clientX;
    this._applyAzjcFullscreenSeekFromTouch(clientX, 'move');
  },

  onFullScreenTrackTouchEnd(e) {
    if (!this.data.fullScreenLandscapeOk) return;
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (touch) {
      const clientX = touch.clientX != null ? touch.clientX : touch.pageX;
      this._fullScreenLastTouchX = clientX;
      this._applyAzjcFullscreenSeekFromTouch(clientX, 'end');
    }
    this._fullScreenTrackGen = (this._fullScreenTrackGen || 0) + 1;
    this._fullScreenTrackDrag = null;
    this._fullScreenTrackDragging = false;
  },

  onGraphicTap: function(e) {
    const index = e.currentTarget.dataset.index
    // 🔴 分享码用户：记录图文点击
    const sectionKey = `graphic-${index}`
    this._trackSectionClick(sectionKey)
    this._switchToSection(sectionKey)
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
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  onBackPress() {
    this.handleBack();
    return true;
  },

  // 🔴 记录板块点击（分享码用户 / 普通安装用户）
  _trackSectionClick(sectionKey) {
    if (!this.data.isShareCodeUser && !this.data.shouldRecordTutorialInstall) return
    
    const clicks = this.data.sectionClicks
    clicks[sectionKey] = (clicks[sectionKey] || 0) + 1
    this.setData({ sectionClicks: clicks })
  },

  // 🔴 记录板块停留时长（切换板块时调用）
  _recordCurrentSectionDuration() {
    if ((!this.data.isShareCodeUser && !this.data.shouldRecordTutorialInstall) || !this.data.currentSectionKey) return
    
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
    if (!this.data.isShareCodeUser && !this.data.shouldRecordTutorialInstall) return
    
    // 先记录当前板块时长
    this._recordCurrentSectionDuration()
    
    // 切换到新板块
    this.setData({
      currentSectionKey: newSectionKey,
      currentSectionStartTime: Date.now()
    })
  },

  // 🔴 上传统计数据到云数据库（分享码 chakan 文档 或 普通安装汇总池）
  async _uploadSessionStats() {
    const trackShare = this.data.isShareCodeUser;
    const trackDirect = this.data.shouldRecordTutorialInstall && !!this.data.tutorialDirectPoolId;
    if (!trackShare && !trackDirect) return;
    if (this._uploadSessionStatsBusy) return;

    const app = getApp();
    if (!app || !app.recordShareCodeSession) {
      console.warn('[azjc] app.recordShareCodeSession 不存在，无法上传统计数据');
      return;
    }

    this._recordCurrentSectionDuration();

    const totalDuration = Date.now() - this.data.sessionStartTime;
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
      locationInfo
    };

    const isUpdate = trackShare ? this.data.shareCodeRecordCreated : this.data.installSessionRecordCreated;
    this._uploadSessionStatsBusy = true;

    try {
      const result = trackShare
        ? await app.recordShareCodeSession(stats, isUpdate)
        : await app.recordShareCodeSession(stats, isUpdate, this.data.tutorialDirectPoolId);

      if (result && result.success) {
        this._shareStatsFailCount = 0;
        if (!isUpdate) {
          this.setData(trackShare
            ? { shareCodeRecordCreated: true }
            : { installSessionRecordCreated: true });
        }
      } else if (!(result && result.skipped)) {
        this._shareStatsFailCount = (this._shareStatsFailCount || 0) + 1;
        if (this._shareStatsFailCount >= 3) {
          console.warn('[azjc] 统计写入连续失败，已停止自动保存');
          this._stopAutoSave();
        }
      }
    } catch (err) {
      console.error('[azjc] ❌ 统计数据上传失败:', err);
      this._shareStatsFailCount = (this._shareStatsFailCount || 0) + 1;
      if (this._shareStatsFailCount >= 3) this._stopAutoSave();
    } finally {
      this._uploadSessionStatsBusy = false;
    }
  },

  // 🔴 启动定时自动保存
  _startAutoSave() {
    if (!this.data.isShareCodeUser && !this.data.shouldRecordTutorialInstall) {
      return;
    }

    this._stopAutoSave();

    this.autoSaveTimer = setInterval(() => {
      if ((this.data.isShareCodeUser || this.data.shouldRecordTutorialInstall) && this.data.sessionStartTime > 0) {
        this._uploadSessionStats().catch((err) => {
          console.error('[azjc] 定时自动保存失败:', err);
        });
      }
    }, 30000);
  },

  // 🔴 停止定时自动保存
  _stopAutoSave() {
    // 🔴 修复：从实例变量中获取定时器ID
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
});
