// pages/shop/shop.js
// 🔴 性能优化：关闭调试日志（生产环境）
const DEBUG = false; // 设为 false 关闭所有 console.log，设为 true 开启调试
const log = DEBUG ? console.log.bind(console) : () => {};

const app = getApp();
const cosUpload = require('../../../utils/cosUpload.js');
const shopImagePrepare = require('../../../utils/shopImagePrepare.js');
const hubNav = require('../../../utils/hubNav.js');
const shareApp = require('../../../utils/shareApp.js');
var QQMapWX = require('../../../utils/qqmap-wx-jssdk.js'); 
const SHOP_MAIN_DOC_ID = 'shopMain';
/** 商城首次进入：设备型号更换政策说明（仅弹一次） */
const SHOP_EXCHANGE_POLICY_SEEN_KEY = 'mt_shop_exchange_policy_seen_v2';
/** 调试：true=每次进商城都弹；正式环境必须为 false（仅首次） */
const SHOP_GUIDE_DEBUG_EVERY_ENTRY = false;
/** 商城首次进入：按预算理性选购提示（仅弹一次，在升级说明之后） */
const SHOP_BUDGET_GUIDE_SEEN_KEY = 'mt_shop_budget_guide_seen_v1';
/** 列表卡片封面比例 4:3 → padding-bottom = 3/4 = 75% */
const SHOP_COVER_ASPECT_PADDING_PERCENT = 75;
// 🔴 使用专门的行政区key（用于省市区选择器 - getCityList）
const MAP_KEY = 'CFDBZ-B6K6N-B3EFF-SPDJ2-Y2MRZ-7UBH2'; // 与 shouhou 统一
var qqmapsdk = new QQMapWX({
    key: MAP_KEY
});

// 🔴 使用专门的行政区划子key（用于区县选择器 - getDistrictByCityId）
const DISTRICT_KEY = 'ICRBZ-VEELI-CQZGO-UE5G6-BHRMS-VQBIK'; // 行政区划子key（专门用于区县选择器）
var qqmapsdkDistrict = new QQMapWX({
    key: DISTRICT_KEY
});

const { MUNICIPALITY_DISTRICTS } = require('../../../utils/smartAddressParser.js');
const checkoutCouponMixin = require('../../../utils/checkoutCouponMixin.js');
const dbPermissionHint = require('../../../utils/dbPermissionHint.js');
const screenshotExempt = require('../../../utils/screenshotAdminExempt.js');
const weworkKf = require('../../../utils/weworkCustomerService.js');
const { withRepairProgressSubscribe, sendSubscribeNotify } = require('../../../utils/subscribeMessage.js');

module.exports = function createShopPageConfig(opts = {}) {
  const __hubEmbed = !!(opts && opts.hubEmbed);
  const pageConfig = {
  data: {
    mainCategories: ['电动版本', '手动版本', '汽车版本', '配件系列'],
    /** 各版本行展示模式：series=产品系列 accessory=配件横滑 */
    sectionRowModes: {},
    categorySections: [],
    /** 配件编号多选弹层 */
    accSlotPickerVisible: false,
    accSlotPickerAccIndex: -1,
    /** 各版本下的编号多选 [{ version, options:[{num,on}] }] */
    accSlotPickerGroups: [],

    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式

    // 🔴 屏幕适配：状态栏和导航栏高度
    statusBarHeight: 44,  // 状态栏高度（px）
    navBarHeight: 44,     // 导航栏高度（px）
    /** 从 products 顶栏「商城」进入：显示主页/商城分段，隐藏左上角返回 */
    showHubShell: false,
    /** 嵌入 products 横向枢纽（顶部分段由 products 渲染） */
    hubEmbedInProducts: __hubEmbed,
    /** 嵌入枢纽时：仅 MT 商城 Tab 激活为 true（避免 root-portal 浮层盖到主页） */
    hubPanelActive: !__hubEmbed,
    hubPageEnterAnim: false,
    /** 嵌入枢纽时 scroll-view 实测高度（px） */
    embedScrollHeight: 0,

    // 新增：购物车数据
    cart: [],
    cartTotalPrice: 0,
    finalTotalPrice: 0, // 含运费总价

    // [修改] 地址相关数据
    orderInfo: { name: '', phone: '' }, // 这里不再存 address 字符串
    detailAddress: '', // 存放完整地址，如 '广东省 佛山市 南海区 某某街道101号'
    
    // 🔴 新增：省市区选择（复制自 shouhou 页面）
    selectedProvince: '',  // 选中的省份
    selectedCity: '',      // 选中的城市
    selectedDistrict: '',  // 选中的区县
    provinceList: [],      // 省份列表
    cityList: [],          // 城市列表
    districtList: [],      // 区县列表
    provinceIndex: -1,     // 省份选择索引
    cityIndex: -1,         // 城市选择索引
    districtIndex: -1,      // 区县选择索引

    // [修改] 运费相关
    shippingMethod: 'zto', // 默认中通
    shippingFee: 0,
    checkoutFreeShipping: false, // 商城是否包邮（仅配件或商品合计>50）
    ...checkoutCouponMixin.data,

    // 新增：自定义编辑弹窗状态
    showCustomEditModal: false,
    customEditTitle: '',
    customEditVal: '',
    customEditCallback: null,

    // 新增：对比选择模式
    isModelCompareMode: false,
    compareSelectedModels: [],
    // 参数对比引导：1=仅提示选型号（约5s），2=显示开始对比区域
    compareGuidePhase: 0,
    // 第2步中的说明文案与箭头（仅展示约5秒）
    compareGuidePhase2HintVisible: false,

    // 顶部媒体资源 (混合图片和视频)
    topMediaList: [],
    heroCurrent: 0,
    /** 顶部轮播高度(px)：视频固定 16:9，图片按真实比例（含 1:1）由 bindload 更新 */
    heroSwiperHeightPx: 211,
    heroSlideHeightsPx: {},
    /** 顶部视频滚出视口后卸载，避免原生 video 层遮挡下方卡片 */
    heroVideoMountEnabled: true,
    heroAutoCarouselEnabled: false,
    isEditingMedia: false,
    sortedTopMediaList: [],

    // 商店标题
    shopTitle: '选购',

    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },
    
    // 【新增】自定义操作菜单
    actionSheet: { show: false, itemList: [], callback: null },

    // 🔴 新增：视频播放状态跟踪（用于控制播放按钮显示）
    heroVideoPlaying: {}, // {0: true, 1: false, ...} 跟踪每个hero视频的播放状态
    heroHdLoaded: {}, // 顶部图片高清层加载状态（先低清后高清）
    detailVideoPlaying: {}, // {0: true, 1: false, ...} 跟踪每个detail视频的播放状态
    imageHdLoaded: {}, // 图片高清加载状态（先低清再无感切高清）

    // 🔴 新增：详情页拖拽排序相关
    detailDragIndex: -1,        // 当前拖拽的卡片索引
    detailDragStartY: 0,        // 拖拽开始时的Y坐标
    detailDragCurrentY: 0,      // 当前拖拽的Y坐标
    detailDragOffsetY: 0,       // 拖拽偏移量（px）
    isDetailDragging: false,    // 是否正在拖拽
    detailLongPressTimer: null, // 长按定时器
    detailLastSwapIndex: -1,    // 上次交换的位置
    detailLastVibrateTime: 0,   // 上次震动时间



    // ============ 核心产品数据 ============
    // 核心数据 (注意 labels 的变化)
    seriesList: [
      {
        id: '1',
        name: 'MT-1 Pro Series',
        desc: '强劲核心，静音运行',
        cover: '',
        detailImages: [], // 注意：现在里面存的是 {type:'image', url:'...'}
        specHeaders: ['Standard', 'Max', 'Ultra'], // 新增：这里存表头文字
        // 关键：每个产品独立的标签文字
        labels: {
          configTitle: '选购配置',
          modelTitle: '选择型号 (MODEL)',
          optionTitle: '配置方案 (OPTION)',
          accTitle: '配件加购'
        },
        // 对比表格数据 (Label + 3列值)
        specs: [
            { label: '续航时间', v1: '10h', v2: '15h', v3: '20h' },
            { label: '机身重量', v1: '1.2kg', v2: '1.4kg', v3: '1.5kg' },
            { label: '外壳材质', v1: '铝合金', v2: '碳纤维', v3: '钛金属' }
        ],
        models: [
          { name: 'Standard', price: 1299, desc: '基础版' },
          { name: 'Max Power', price: 1599, desc: '增强版' },
          { name: 'Ultra', price: 1999, desc: '顶配版' }
        ],
        options: [
          { name: '机械按键', price: 0, img: '' },
          { name: '触控屏', price: 300, img: '' }
        ]
      }
    ],

    // ============ 配件数据 ============
    accessoryList: [
      {
        id: 'a1',
        name: '备用电池',
        price: 299,
        img: '',
        selected: false,
        desc: '双倍续航，无忧出行，采用高密度锂离子电芯。',
        detailImages: []
      },
      {
        id: 'a2',
        name: '挂绳',
        price: 59,
        img: '',
        selected: false,
        desc: '高强度尼龙材质，防丢防摔。',
        detailImages: []
      }
    ],

    // ============ 状态变量 ============
    currentSeries: {},      // 当前选中的产品对象
    currentSeriesIdx: -1,   // 当前选中的产品索引
    /** 当前产品详情内可展示的配件（已按 versionSlots 配对） */
    seriesAccessoryList: [],
    selectedModelIdx: -1,   // 选中的型号索引 (初始为 -1，未选中状态)
    selectedOptionIdx: -1,  // 选中的配置索引 (初始为 -1，未选中状态)
    totalPrice: 0,          // 总价

    // 弹窗控制开关
    showDetail: false,      // 产品选购主弹窗
    showAccDetail: false,   // 配件详情弹窗
    accDetailClosing: false, // 配件详情下滑退出动画中
    accDetailShowPurchaseFooter: false, // 首页配件行进入：显示加入购物车/立即购买
    accCheckoutActive: false, // 配件详情发起立即购买：结算关闭后恢复配件弹窗
    currentAccIdx: -1,      // 当前查看的配件索引
    accDetailSwiperIndex: 0, // 配件详情轮播当前页
    showSpecsModal: false,  // 对比表格弹窗
    showOrderModal: false,  // 订单弹窗
    orderSheetAnimIn: false, // 结算抽屉上滑动画
    orderSheetClosing: false,
    showCartSuccess: false, // 新增：加入购物车成功弹窗
    cartSuccessClosing: false, // 收缩退出动画中
    dialogClosing: false, // 自定义弹窗退出动画中
    autoToastClosing: false, // 自动提示退出动画中
    customModalClosing: false, // 自定义编辑弹窗退出动画中
    actionSheetClosing: false, // 操作菜单退出动画中
    smartPasteClosing: false, // 智能粘贴弹窗退出动画中
    centerToastClosing: false, // 中间提示退出动画中

    // 新增：中间弹窗数据
    centerToast: { show: false, text: '' },

    // 新增：免责协议同意状态
    agreedToDisclaimer: false,

    // 新增：底部按钮栏是否显示 (默认false，滑下去才出来)
    showFooterBar: false,

    // 立即购买：关闭结算未支付时，回滚到打开结算前的购物车快照
    buyNowCartSnapshot: null,

    // 🔴 新增：从维修单跳转过来的配件信息
    fromRepair: false,
    repairId: null,
    requiredParts: [], // 需要购买的配件列表 [{model: 'F1 MAX', parts: ['主板', '按钮']}]
    requiredPartsMap: {}, // 快速查找用的Map，格式：{'F1 MAX': ['主板', '按钮']}

    // 新增：对比模式相关
    isCompareMode: false,      // 是否处于首页对比模式
    compareList: [],           // 选中的产品列表（用于首页对比）
    compareData: {             // 用于渲染对比表格的数据
      headers: [],
      rows: []
    },

    // 智能粘贴相关
    showSmartPasteModal: false,
    smartPasteVal: '',

    // [新增] 自定义视频弹窗控制
    showVideoPlayer: false,
    currentVideoUrl: '',
    isVideoPlaying: true, // 全屏视频播放状态

    // 「选购配置」标题行底边距滚动内容顶部的偏移(px)、详情 scroll-view 可视高度(px)
    detailConfigAnchorPx: 0,
    detailScrollViewHeight: 0,

    // 自定义弹窗
    dialog: {
      show: false,
      kind: '',
      title: '',
      content: '',
      showCancel: false,
      callback: null,
      confirmText: '确定',
      cancelText: '取消',
      confirmLocked: false,
      confirmCountdown: 0,
      confirmBtnText: '确定'
    },

    // Loading 状态（使用和 index.js 一样的白色背景进度条动画）
    showLoadingAnimation: false,
    loadingText: '加载中...'
  },

  // 为现有图片URL生成低清预览图URL（支持云存储图片处理参数）
  buildLowQualityUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const u = url.trim();
    if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) return url;
    if (/imageMogr2|imageView2/i.test(u)) return u;
    const host = (() => {
      try {
        return new URL(u).hostname || '';
      } catch (e) {
        return '';
      }
    })();
    const cosLike =
      /myqcloud\.com$|tcb\.qcloud\.la$|tencentcos\.cn$|file\.myqcloud\.com$/i.test(host) ||
      /^cos\.[^.]+\.myqcloud\.com$/i.test(host);
    if (!cosLike) return u;
    const sep = u.indexOf('?') === -1 ? '?' : '&';
    return `${u}${sep}imageMogr2/thumbnail/960x`;
  },

  // 给产品系列补齐预览字段，兼容历史数据和新上传数据
  decorateSeriesImageFields(seriesList = []) {
    return (seriesList || []).map(series => {
      const detailImages = (series.detailImages || []).map(item => {
        if (!item || item.type !== 'image' || !item.url) return item;
        return {
          ...item,
          previewUrl: item.previewUrl || this.buildLowQualityUrl(item.url)
        };
      });
      return {
        ...series,
        coverPreview: series.coverPreview || this.buildLowQualityUrl(series.cover),
        detailImages
      };
    });
  },

  /** 从 DB 拉取后的产品列表：补全 detailImages 缺少的 type */
  normalizeSeriesListFromDb(list = []) {
    const mapped = (list || []).map(series => {
      const fixedDetailImages = (series.detailImages || []).map(item => {
        if (!item || item.type) return item;
        const url = (item.url || '').toLowerCase();
        const isVideo =
          url.endsWith('.mp4') ||
          url.endsWith('.mov') ||
          url.indexOf('.mp4?') !== -1 ||
          url.indexOf('.mov?') !== -1;
        return { type: isVideo ? 'video' : 'image', ...item };
      });
      const sortOrder =
        series.sortOrder != null && !Number.isNaN(Number(series.sortOrder))
          ? Number(series.sortOrder)
          : null;
      return { ...series, detailImages: fixedDetailImages, sortOrder };
    });
    return this._ensureCategorySortOrders(mapped, this.data.mainCategories);
  },

  /** 各版本分类内补全 1..n 的 sortOrder（仅内存，不写库） */
  _ensureCategorySortOrders(seriesList, mainCategories) {
    const list = (seriesList || []).map(s => ({ ...s }));
    const defaultCat = '电动版本';
    const catOrder =
      Array.isArray(mainCategories) && mainCategories.length
        ? mainCategories
        : [...new Set(list.map(s => s.mainCategory || defaultCat))];

    catOrder.forEach(catName => {
      const inCat = list
        .map((s, listIndex) => ({ s, listIndex }))
        .filter(({ s }) => (s.mainCategory || defaultCat) === catName);

      inCat.sort((a, b) => {
        const oa = a.s.sortOrder;
        const ob = b.s.sortOrder;
        if (oa != null && ob != null) return oa - ob;
        if (oa != null) return -1;
        if (ob != null) return 1;
        return a.listIndex - b.listIndex;
      });

      inCat.forEach(({ listIndex }, i) => {
        list[listIndex] = { ...list[listIndex], sortOrder: i + 1 };
      });
    });
    return list;
  },

  _countSeriesInCategory(seriesList, categoryName) {
    const defaultCat = '电动版本';
    const cat = categoryName || defaultCat;
    return (seriesList || []).filter(s => (s.mainCategory || defaultCat) === cat).length;
  },

  _applyCategorySortOrder(seriesIndex, newPosition, categoryName) {
    const defaultCat = '电动版本';
    const cat = categoryName || defaultCat;
    const list = this.data.seriesList.map(s => ({ ...s }));

    const indicesInCat = [];
    list.forEach((s, i) => {
      if ((s.mainCategory || defaultCat) === cat) indicesInCat.push(i);
    });
    if (!indicesInCat.includes(seriesIndex)) return;

    const ordered = indicesInCat
      .map(i => ({ index: i, series: list[i] }))
      .sort((a, b) => (a.series.sortOrder || 0) - (b.series.sortOrder || 0));

    const fromPos = ordered.findIndex(o => o.index === seriesIndex);
    if (fromPos < 0) return;

    const moving = ordered.splice(fromPos, 1)[0];
    const count = ordered.length + 1;
    const target = Math.min(Math.max(1, newPosition), count);
    ordered.splice(target - 1, 0, moving);

    ordered.forEach((o, i) => {
      list[o.index] = { ...list[o.index], sortOrder: i + 1 };
    });

    this.showMyLoading('保存排序...');
    Promise.all(ordered.map(o => this.saveSeriesToCloud(list[o.index])))
      .then(() => {
        this.hideMyLoading();
        this.setData({ seriesList: list });
        this.showAutoToast('成功', '排序已更新');
      })
      .catch(err => {
        this.hideMyLoading();
        this.showAutoToast('提示', '保存失败');
        console.error(err);
      });
  },

  _chunkArray(arr, size) {
    const out = [];
    const a = arr || [];
    for (let i = 0; i < a.length; i += size) out.push(a.slice(i, i + size));
    return out;
  },

  async _batchResolveCloudFileIds(fileIdList) {
    const map = {};
    const ids = [...new Set((fileIdList || []).filter(id => typeof id === 'string' && id.indexOf('cloud://') === 0))];
    if (!ids.length || !wx.cloud || !wx.cloud.getTempFileURL) return map;
    const chunks = this._chunkArray(ids, 50);
    const partials = await Promise.all(
      chunks.map(async ch => {
        const part = {};
        try {
          const resp = await wx.cloud.getTempFileURL({ fileList: ch });
          (resp.fileList || []).forEach(f => {
            if (f && f.fileID && f.tempFileURL) part[f.fileID] = f.tempFileURL;
          });
        } catch (e) {
        }
        return part;
      })
    );
    partials.forEach(part => {
      Object.assign(map, part);
    });
    return map;
  },

  _collectSeriesCloudFileIdsFromList(seriesList) {
    const ids = [];
    const add = id => {
      if (typeof id === 'string' && id.indexOf('cloud://') === 0) ids.push(id);
    };
    (seriesList || []).forEach(s => {
      add(s.cover);
      add(s.compareVideo);
      (s.options || []).forEach(o => o && add(o.img));
      (s.detailImages || []).forEach(d => d && add(d.url));
    });
    return ids;
  },

  _applySeriesCloudUrlMap(seriesList, map) {
    const m = map || {};
    return (seriesList || []).map(s => ({
      ...s,
      coverDisplay: (s.cover && m[s.cover]) || '',
      compareVideoDisplay: (s.compareVideo && m[s.compareVideo]) || '',
      options: (s.options || []).map(o => ({
        ...o,
        imgDisplay: (o && o.img && m[o.img]) || ''
      })),
      detailImages: (s.detailImages || []).map(d => {
        if (!d || typeof d !== 'object') return d;
        const u = d.url;
        return { ...d, urlDisplay: (u && m[u]) || '' };
      })
    }));
  },

  _collectAccessoryCloudFileIdsFromList(list) {
    const ids = [];
    const add = id => {
      if (typeof id === 'string' && id.indexOf('cloud://') === 0) ids.push(id);
    };
    (list || []).forEach(acc => {
      add(acc.img);
      (acc.detailImages || []).forEach(u => add(u));
    });
    return ids;
  },

  _applyAccessoryCloudUrlMap(list, map) {
    const m = map || {};
    return (list || []).map(acc => ({
      ...acc,
      imgDisplay: (acc.img && m[acc.img]) || '',
      detailImagesDisplay: (acc.detailImages || []).map(u => (u && m[u]) || '')
    }));
  },

  /** 一次 getTempFileURL，同时 Hydrate 产品与配件（省一轮网络） */
  async hydrateSeriesAndAccessoriesTogether(decoratedSeriesList, accessoryCleanList) {
    const sid = this._collectSeriesCloudFileIdsFromList(decoratedSeriesList);
    const aid = this._collectAccessoryCloudFileIdsFromList(accessoryCleanList);
    const map = await this._batchResolveCloudFileIds([...new Set([...sid, ...aid])]);
    return {
      series: this._applySeriesCloudUrlMap(decoratedSeriesList, map),
      accessories: this._applyAccessoryCloudUrlMap(accessoryCleanList, map)
    };
  },

  /** 是否包含需要 getTempFileURL 的 cloud://（无则可直接 setData，避免白等） */
  _shopListsNeedCloudHydrate(decoratedSeriesList, accessoryCleanList) {
    try {
      const bundle = require('../../../utils/shopPreloadBundle.js');
      if (bundle.listsHaveCompleteCloudDisplays(decoratedSeriesList, accessoryCleanList)) {
        return false;
      }
    } catch (e) {
      // ignore
    }
    return (
      this._collectSeriesCloudFileIdsFromList(decoratedSeriesList).length > 0 ||
      this._collectAccessoryCloudFileIdsFromList(accessoryCleanList).length > 0
    );
  },

  _getShopPreloadBundle() {
    try {
      return require('../../../utils/shopPreloadBundle.js');
    } catch (e) {
      return null;
    }
  },

  _topMediaNeedsCloudResolve(list) {
    const bundle = this._getShopPreloadBundle();
    if (bundle && bundle.topMediaNeedsCloudResolve) {
      return bundle.topMediaNeedsCloudResolve(list);
    }
    return (list || []).some(
      item =>
        item &&
        typeof item.url === 'string' &&
        item.url.indexOf('cloud://') === 0 &&
        !item.renderUrl
    );
  },

  /**
   * 首屏：顶部轮播与产品/配件合并解析后一次 setData，避免视频晚于卡片出现。
   */
  async applyShopFirstScreenData({
    rawTopList,
    decoratedSeries,
    accessoryList,
    shopTitle,
    heroAutoCarouselEnabled,
    mainCategories,
    sectionRowModes
  }) {
    const cache = this.ensureShopDataCache();
    const rawTop = Array.isArray(rawTopList) ? rawTopList : [];
    const seriesDecorated = decoratedSeries || [];
    const accClean = accessoryList || [];

    if (shopTitle) {
      cache.shopTitle = this._normalizeShopTitle(shopTitle);
    }
    if (typeof heroAutoCarouselEnabled === 'boolean') {
      cache.heroAutoCarouselEnabled = heroAutoCarouselEnabled;
    }

    const topNeeds = this._topMediaNeedsCloudResolve(rawTop);
    const listsNeed = this._shopListsNeedCloudHydrate(seriesDecorated, accClean);

    let topRender;
    let seriesOut = seriesDecorated;
    let accOut = accClean;

    if (topNeeds || listsNeed) {
      const bundle = this._getShopPreloadBundle();
      if (bundle && bundle.hydrateShopFirstScreenTogether) {
        const hydrated = await bundle.hydrateShopFirstScreenTogether(
          rawTop,
          seriesDecorated,
          accClean,
          u => this.buildLowQualityUrl(u)
        );
        topRender = hydrated.topRender;
        seriesOut = hydrated.series;
        accOut = hydrated.accessories;
      } else {
        topRender = this._buildTopMediaRenderListSync(rawTop);
        if (listsNeed) {
          const h = await this.hydrateSeriesAndAccessoriesTogether(seriesDecorated, accClean);
          seriesOut = h.series;
          accOut = h.accessories;
        }
      }
    } else {
      topRender = this._buildTopMediaRenderListSync(rawTop);
    }

    cache.topMediaList = this._normalizeTopMediaList(rawTop);
    cache.seriesList = this.stripSeriesListForCache(seriesOut);
    cache.accessoryList = (accOut || []).map(a => this.stripOneAccessoryEphemeral(a));
    cache.cacheTime = Date.now();

    const patch = {
      seriesList: seriesOut,
      accessoryList: accOut,
      imageHdLoaded: {},
      heroHdLoaded: {}
    };
    if (shopTitle) patch.shopTitle = this._normalizeShopTitle(shopTitle);
    if (typeof heroAutoCarouselEnabled === 'boolean') {
      patch.heroAutoCarouselEnabled = heroAutoCarouselEnabled;
    }
    if (mainCategories && Array.isArray(mainCategories) && mainCategories.length) {
      patch.mainCategories = mainCategories;
    }
    if (sectionRowModes && typeof sectionRowModes === 'object') {
      patch.sectionRowModes = sectionRowModes;
    }
    const cats = patch.mainCategories || this.data.mainCategories;
    const modes = patch.sectionRowModes || this.data.sectionRowModes;
    patch.categorySections = this._buildCategorySections(
      cats,
      seriesOut,
      this.data.categorySections,
      this.data.isAdmin,
      accOut,
      modes
    );
    this._mergeHeroFieldsIntoPatch(patch, topRender);
    this.setData(patch, () => {
      wx.nextTick(() => {
        this._syncHeroAutoForCurrent();
        this.preloadMediaResources();
        if (this.data.hubEmbedInProducts && typeof this.layoutHubEmbedScroll === 'function') {
          this.layoutHubEmbedScroll();
        }
      });
    });
    this.syncHydratedShopListsToGlobalCache(seriesOut, accOut);
    if (this.jumpNumber) wx.nextTick(() => this.jumpToProductByNumber(this.jumpNumber));
  },

  _mergeHeroFieldsIntoPatch(patch, renderList) {
    const list = Array.isArray(renderList) ? renderList : [];
    const len = list.length;
    let cur = Number(this.data.heroCurrent) || 0;
    if (len === 0) cur = 0;
    else if (cur >= len) cur = 0;
    const wxw = this._windowWidthPx || (wx.getSystemInfoSync().windowWidth || 375);
    this._windowWidthPx = wxw;
    const def = this._defaultHeroHeightPx();
    const prevHeights = this.data.heroSlideHeightsPx || {};
    const heights = {};
    list.forEach((item, i) => {
      if (item && item.type === 'video') {
        heights[i] = def;
      } else if (prevHeights[i] != null) {
        heights[i] = this._capHeroHeightPx(prevHeights[i]);
      }
    });
    const h = this._resolveHeroSlideHeightPx(cur, list, heights);
    patch.topMediaList = list;
    patch.heroCurrent = cur;
    patch.heroSlideHeightsPx = heights;
    patch.heroSwiperHeightPx = h;
    patch.heroVideoMountEnabled = true;
  },

  stripOneSeriesEphemeral(series) {
    if (!series || typeof series !== 'object') return series;
    const s = { ...series };
    delete s.coverDisplay;
    delete s.compareVideoDisplay;
    delete s.coverPreview;
    if (Array.isArray(s.options)) {
      s.options = s.options.map(o => {
        if (!o || typeof o !== 'object') return o;
        const { imgDisplay, ...r } = o;
        return r;
      });
    }
    if (Array.isArray(s.detailImages)) {
      s.detailImages = this.sanitizeDetailImagesForDb(s.detailImages);
    }
    return s;
  },

  /** 写入数据库前的详情图：去掉展示字段与本地临时路径 */
  sanitizeDetailImagesForDb(detailImages) {
    return (detailImages || [])
      .map(d => {
        if (typeof d === 'string') {
          const url = d.trim();
          if (!url || url.indexOf('wxfile://') === 0 || url.indexOf('http://tmp') === 0) return null;
          return { type: 'image', url };
        }
        if (!d || typeof d !== 'object') return d;
        const { urlDisplay, previewUrl, ...r } = d;
        const item = { ...r };
        const url = typeof item.url === 'string' ? item.url.trim() : '';
        if (
          !url ||
          url.indexOf('wxfile://') === 0 ||
          url.indexOf('http://tmp') === 0 ||
          url.indexOf('https://tmp') === 0
        ) {
          return null;
        }
        item.url = url;
        const poster = typeof item.poster === 'string' ? item.poster.trim() : '';
        if (
          !poster ||
          poster.indexOf('wxfile://') === 0 ||
          poster.indexOf('http://tmp') === 0 ||
          poster.indexOf('https://tmp') === 0
        ) {
          delete item.poster;
        }
        return item;
      })
      .filter(Boolean);
  },

  _shopErrText(err) {
    if (!err) return '';
    return String(
      (typeof err === 'string' ? err : '') ||
        err.message ||
        err.errMsg ||
        err.error ||
        (err.result && err.result.message) ||
        ''
    ).trim();
  },

  _normalizeDetailUrlForSig(url) {
    let u = String(url || '').trim();
    if (!u) return '';
    const q = u.indexOf('?');
    if (q >= 0) u = u.slice(0, q);
    const h = u.indexOf('#');
    if (h >= 0) u = u.slice(0, h);
    try {
      u = decodeURIComponent(u);
    } catch (e) {
      // keep raw
    }
    if (u.indexOf('http://') === 0) u = 'https://' + u.slice(7);
    const cosKey = cosUpload.extractCosKeyFromPublicUrl(u);
    if (cosKey) return cosKey.toLowerCase();
    if (u.indexOf('cloud://') === 0) return u;
    return u.toLowerCase();
  },

  _isAndroidDevice() {
    try {
      const info = typeof wx.getDeviceInfo === 'function' ? wx.getDeviceInfo() : wx.getSystemInfoSync();
      return String((info && info.platform) || '').toLowerCase() === 'android';
    } catch (e) {
      return false;
    }
  },

  _readSeriesDetailImages(docId) {
    const coll = this.db.collection('shop_series');
    const pick = (snap) => ((snap && snap.data && snap.data.detailImages) || []);
    const readDoc = () => coll.doc(docId).field({ detailImages: true }).get().then(pick).catch(() => []);
    const readWhere = () => coll.where({ _id: docId }).field({ detailImages: true }).limit(1).get()
      .then((res) => {
        const row = res && res.data && res.data[0];
        return (row && row.detailImages) || [];
      })
      .catch(() => []);
    return Promise.all([readDoc(), readWhere()]).then(([fromDoc, fromWhere]) => {
      if (fromWhere.length >= fromDoc.length) return fromWhere;
      return fromDoc.length ? fromDoc : fromWhere;
    });
  },

  _saveDetailImagesViaCloud(docId, detailImages) {
    if (!wx.cloud || !wx.cloud.callFunction) {
      return Promise.reject(new Error('云开发未就绪'));
    }
    const sanitized = this.sanitizeDetailImagesForDb(detailImages);
    return wx.cloud.callFunction({
      name: 'patchShopSeriesDetailImages',
      data: {
        seriesId: docId,
        detailImages: sanitized
      }
    }).then((res) => {
      const payload = (res && res.result) || {};
      if (!payload.success) {
        const err = new Error(payload.error || '详情图保存失败，请部署云函数 patchShopSeriesDetailImages');
        err.payload = payload;
        throw err;
      }
      return payload.detailImages || sanitized;
    });
  },

  _detailImageUrlList(list) {
    return (list || [])
      .map(d => {
        if (typeof d === 'string') return this._normalizeDetailUrlForSig(d);
        return this._normalizeDetailUrlForSig(d && d.url);
      })
      .filter(Boolean)
      .sort();
  },

  _detailImagesDbMatch(expected, saved) {
    const a = this._detailImageUrlList(expected);
    const b = this._detailImageUrlList(saved);
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  },

  _detailImagesDbContainsUrls(saved, requiredUrls) {
    const savedSet = new Set(this._detailImageUrlList(saved));
    const required = (requiredUrls || [])
      .map(u => this._normalizeDetailUrlForSig(u))
      .filter(Boolean);
    if (!required.length) return true;
    return required.every(u => savedSet.has(u));
  },

  _detailImagesDbSignature(list) {
    try {
      return JSON.stringify(this._detailImageUrlList(list));
    } catch (e) {
      return '[]';
    }
  },

  /** 写库后读回校验（安卓读回偏慢，多试几次；最终仍失败则信任 update 成功结果） */
  _verifyDetailImagesInDb(docId, expectedImages, opts = {}) {
    const attempt = opts.attempt || 0;
    const rewrote = opts.rewrote === true;
    const requiredUrls = Array.isArray(opts.requiredUrls) ? opts.requiredUrls : null;
    const android = this._isAndroidDevice();
    const delays = android
      ? [1200, 2500, 4000, 6000, 9000, 12000]
      : [800, 1800, 3500, 5500];
    const delay = delays[Math.min(attempt, delays.length - 1)];

    const isMatch = (saved) => {
      if (requiredUrls && requiredUrls.length) {
        return this._detailImagesDbContainsUrls(saved, requiredUrls);
      }
      return this._detailImagesDbMatch(expectedImages, saved);
    };

    return new Promise((resolve) => setTimeout(resolve, delay))
      .then(() => this._readSeriesDetailImages(docId))
      .then((saved) => {
        if (isMatch(saved)) {
          return saved;
        }
        if (attempt < delays.length - 1) {
          return this._verifyDetailImagesInDb(docId, expectedImages, {
            attempt: attempt + 1,
            rewrote,
            requiredUrls
          });
        }
        if (!rewrote) {
          return this.db.collection('shop_series').doc(docId).update({
            data: {
              detailImages: this.sanitizeDetailImagesForDb(expectedImages),
              updateTime: new Date()
            }
          }).then(() =>
            this._verifyDetailImagesInDb(docId, expectedImages, {
              attempt: 0,
              rewrote: true,
              requiredUrls
            })
          );
        }
        throw new Error('详情图未写入数据库，请检查网络后重试');
      });
  },

  /** 删除商城媒体：cloud:// 走云存储，https 走 COS 桶 */
  _deleteShopMediaFromCos(url) {
    const u = String(url || '').trim();
    if (!u) return Promise.resolve({ skipped: true });
    if (u.indexOf('cloud://') === 0) {
      return new Promise((resolve) => {
        wx.cloud.deleteFile({
          fileList: [u],
          complete: () => resolve({ deleted: 1 })
        });
      });
    }
    return cosUpload.deleteCosObjectsByUrls([u]).catch((err) => {
      console.error('[shop.js] COS 桶删除失败:', u, err);
      throw err;
    });
  },

  stripSeriesListForCache(list) {
    return (list || []).map(s => this.stripOneSeriesEphemeral(s));
  },

  stripOneAccessoryEphemeral(acc) {
    if (!acc || typeof acc !== 'object') return acc;
    const a = { ...acc };
    delete a.imgDisplay;
    delete a.detailImagesDisplay;
    return a;
  },

  async hydrateSeriesCloudDisplayUrls(seriesList) {
    const list = seriesList || [];
    const ids = this._collectSeriesCloudFileIdsFromList(list);
    const map = await this._batchResolveCloudFileIds(ids);
    return this._applySeriesCloudUrlMap(list, map);
  },

  async hydrateAccessoryCloudDisplayUrls(accessoryList) {
    const list = accessoryList || [];
    const ids = this._collectAccessoryCloudFileIdsFromList(list);
    const map = await this._batchResolveCloudFileIds(ids);
    return this._applyAccessoryCloudUrlMap(list, map);
  },

  async finalizeSeriesListForPage(seriesRaw) {
    const normalized = this.normalizeSeriesListFromDb(seriesRaw || []);
    const decorated = this.decorateSeriesImageFields(normalized);
    return await this.hydrateSeriesCloudDisplayUrls(decorated);
  },

  // 高清图加载完成后切换显示
  onHdImageLoad(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ [`imageHdLoaded.${key}`]: true });
  },

  // 产品封面加载失败时做一次二次检测重试（避免偶发空白）
  async onCoverImageError(e) {
    const index = Number(e.currentTarget.dataset.index);
    const kind = e.currentTarget.dataset.kind || 'high';
    if (Number.isNaN(index) || index < 0) return;

    const retryKey = `${kind}_${index}`;
    this._coverRetryMap = this._coverRetryMap || {};
    const tried = this._coverRetryMap[retryKey] || 0;
    if (tried >= 1) {
      // 二次检测后仍失败：不要把高清源降级成缩略图，直接用原图做占位层兜底
      if (kind === 'high') {
        const series = this.data.seriesList[index];
        const origin = (series && series.cover) || '';
        if (origin) {
          this.setData({
            [`seriesList[${index}].coverPreview`]: origin,
            [`seriesList[${index}].coverDisplay`]: origin,
            [`imageHdLoaded.cover_${index}`]: false
          });
        }
      }
      return;
    } // 只重试一次，避免死循环
    this._coverRetryMap[retryKey] = tried + 1;

    const series = this.data.seriesList[index];
    if (!series || !series.cover) return;

    let nextCover = series.cover;
    try {
      // cloud:// 图片在个别场景会偶发失效，二次检测时换临时 HTTPS 地址
      if (typeof series.cover === 'string' && series.cover.indexOf('cloud://') === 0 && wx.cloud && wx.cloud.getTempFileURL) {
        const resp = await wx.cloud.getTempFileURL({ fileList: [series.cover] });
        const temp = resp && resp.fileList && resp.fileList[0] && resp.fileList[0].tempFileURL;
        if (temp) {
          nextCover = temp;
        }
      } else if (typeof series.cover === 'string') {
        // http(s) 地址追加时间戳，绕开偶发缓存坏链
        const joiner = series.cover.indexOf('?') === -1 ? '?' : '&';
        nextCover = `${series.cover}${joiner}rt=${Date.now()}`;
      }
    } catch (err) {
    }

    this.setData({
      [`seriesList[${index}].cover`]: nextCover,
      [`seriesList[${index}].coverDisplay`]: nextCover,
      [`imageHdLoaded.cover_${index}`]: false
    });
  },

  onLoad(options) {
    this._bindCategorySectionSync();
    
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('shop');
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();

    // 🔴 检查封禁状态（确保重启后也能拦截）
    this.checkBanStatus();

    if (__hubEmbed) {
      this.setData({ hubEmbedInProducts: true, showHubShell: false });
      this.fromHubShell = true;
    } else {
      const hubShell = !!(options && (options.hubShell === '1' || options.hubShell === 'true'));
      if (hubShell) {
        this.setData({ showHubShell: true });
        this.fromHubShell = true;
      }
    }
    if (options && (options.openCheckout === '1' || options.openCheckout === 'true')) {
      this._pendingOpenCheckout = true;
    }
    
    // 使用 app.js 中已初始化的云开发（不需要重复初始化）
    if (wx.cloud) {
      // 直接获取数据库实例（app.js 中已初始化）
      this.db = wx.cloud.database();
    } else {
      console.error('[shop.js] wx.cloud 不存在！请检查云开发是否已开通');
    }

    // 检查管理员权限
    this.checkAdminPrivilege();

    // 检查是否有跳转号码参数
    if (options && options.jumpNumber) {
      this.jumpNumber = parseInt(options.jumpNumber);
      // 标记是从其他页面跳转过来的（需要特殊处理返回逻辑）
      this.fromOtherPage = true;
    }
    
    // 🔴 检查是否从维修单跳转过来
    if (options && options.repairId) {
      this.setData({
        fromRepair: true,
        repairId: options.repairId
      });
      
      // 解析配件信息
      if (options.parts) {
        try {
          const partsList = JSON.parse(decodeURIComponent(options.parts));
          const partsMap = {};
          partsList.forEach(item => {
            partsMap[item.model] = item.parts || [];
          });
          
          this.setData({
            requiredParts: partsList,
            requiredPartsMap: partsMap
          });
        } catch (e) {
          console.error('[shop.js] 解析配件信息失败:', e);
        }
      }
    } else {
      try {
        const sid = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
        if (sid) {
          this.setData({ fromRepair: true, repairId: sid });
        }
      } catch (e) {}
    }

    // 🔴 计算屏幕适配信息（状态栏和导航栏高度）
    this.calcNavBarInfo();
    this._syncHeroDefaultHeight();

    // 图片预热去重缓存（全局复用，避免每次进页重复预热同图）
    const g = getApp();
    if (!g.globalData.__shopWarmImageSet) {
      g.globalData.__shopWarmImageSet = new Set();
    }
    this._shopWarmImageSet = g.globalData.__shopWarmImageSet;

    // 是否允许从全局快照恢复详情 UI（直达/维修引导不恢复，避免打乱业务）
    let guidedRepair = false;
    try {
      guidedRepair = !!(wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
    } catch (e) {}
    this._allowShopSnapshotRestore =
      !(options && options.jumpNumber) &&
      !(options && options.repairId) &&
      !guidedRepair;

    // 尽量等启动预拉写完 globalData（最多约 4s），再读缓存，避免秒进商城重复请求 + 分帧闪动
    const kickLoad = () => {
      this.loadDataFromCloud();
      this.calcTotal();
      this.loadProvinceList();
    };
    const afterKick = () => {
      kickLoad();
      if (this._allowShopSnapshotRestore) {
        this._shopSnapshotRestoreDone = false;
        [50, 220, 600, 1200].forEach(ms => {
          setTimeout(() => this._tryRestoreShopUiSnapshot(), ms);
        });
      }
    };
    if (typeof g.waitShopPreloadReady === 'function') {
      g.waitShopPreloadReady(2800).then(afterKick, afterKick);
    } else {
      afterKick();
    }

    this.setData({
      categorySections: this._buildCategorySections(
        this.data.mainCategories,
        this.data.seriesList,
        [],
        this.data.isAdmin,
        this.data.accessoryList,
        this.data.sectionRowModes
      )
    });
  },

  // 🔴 新增：页面隐藏时清理拖拽状态
  onHide() {
    if (this.data.hubEmbedInProducts) {
      this.setData({ hubPanelActive: false });
      if (this._shopExchangePolicyShowTimer) {
        clearTimeout(this._shopExchangePolicyShowTimer);
        this._shopExchangePolicyShowTimer = null;
      }
      if (this._shopBudgetGuideShowTimer) {
        clearTimeout(this._shopBudgetGuideShowTimer);
        this._shopBudgetGuideShowTimer = null;
      }
    }
    this._clearCompareGuideTimers();
    this._clearHeroAutoTimer();
    // 清理拖拽定时器和状态，防止卡住
    if (this.data.detailLongPressTimer) {
      clearTimeout(this.data.detailLongPressTimer);
      this.data.detailLongPressTimer = null;
    }
    this.setData({
      isDetailDragging: false,
      detailDragIndex: -1,
      detailDragStartY: 0,
      detailDragCurrentY: 0,
      detailDragOffsetY: 0,
      detailLastSwapIndex: -1
    });
  },

  onUnload() {
    this._pageDestroyed = true;
    this._persistShopUiSnapshot();
    this._clearCompareGuideTimers();
    this._clearHeroAutoTimer();
    this._teardownDetailFooterIO();
    if (this._detailFooterMeasureTimer) {
      clearTimeout(this._detailFooterMeasureTimer);
      this._detailFooterMeasureTimer = null;
    }
    if (this._shopBgDebounceTimer) {
      clearTimeout(this._shopBgDebounceTimer);
      this._shopBgDebounceTimer = null;
    }
    if (this.data.detailLongPressTimer) {
      clearTimeout(this.data.detailLongPressTimer);
      this.data.detailLongPressTimer = null;
    }
    this._teardownScreenshotProtection();
  },

  onShareAppMessage() {
    const idx = this.data.currentSeriesIdx;
    const series = idx >= 0 && this.data.seriesList ? this.data.seriesList[idx] : null;
    if (series && series.jumpNumber != null) {
      return shareApp.getShareAppMessage({
        title: (series.name || shareApp.DEFAULT_TITLE) + ' - MT商城',
        path: '/package-app/pages/shop/shop?jumpNumber=' + series.jumpNumber
      });
    }
    return shareApp.getShareAppMessage({
      path: '/package-app/pages/products/products'
    });
  },

  onShareTimeline() {
    const idx = this.data.currentSeriesIdx;
    const series = idx >= 0 && this.data.seriesList ? this.data.seriesList[idx] : null;
    if (series && series.jumpNumber != null) {
      return shareApp.getShareTimeline({
        title: (series.name || shareApp.DEFAULT_TITLE) + ' - MT商城',
        query: 'jumpNumber=' + series.jumpNumber
      });
    }
    return shareApp.getShareTimeline({
      path: '/package-app/pages/products/products'
    });
  },

  /** 离开商城页（如返回 PRODUCTS）时写入全局，便于下次 navigateTo 恢复详情弹层 */
  _persistShopUiSnapshot() {
    try {
      const app = getApp();
      if (!app || !app.globalData) return;
      const d = this.data;
      if (d.showOrderModal) return;
      app.globalData.shopUiSnapshot = {
        ts: Date.now(),
        showDetail: !!d.showDetail,
        showAccDetail: !!d.showAccDetail,
        currentSeriesIdx: typeof d.currentSeriesIdx === 'number' ? d.currentSeriesIdx : -1,
        currentAccIdx: typeof d.currentAccIdx === 'number' ? d.currentAccIdx : -1,
        selectedModelIdx: d.selectedModelIdx,
        selectedOptionIdx: d.selectedOptionIdx,
        isModelCompareMode: !!d.isModelCompareMode
      };
    } catch (e) {
      // ignore
    }
  },

  /** 再次进入商城且列表已就绪时，恢复上次详情/配件弹层（与 shopDataCache TTL 一致） */
  _tryRestoreShopUiSnapshot() {
    if (!this._allowShopSnapshotRestore || this._shopSnapshotRestoreDone) return;
    if (this.data.fromRepair) return;
    const app = getApp();
    const snap = app && app.globalData && app.globalData.shopUiSnapshot;
    if (!snap || !snap.ts) return;
    const ttl = this._getShopGlobalCacheTtlMs();
    if (Date.now() - snap.ts > ttl) {
      app.globalData.shopUiSnapshot = null;
      return;
    }
    if (!snap.showDetail && !snap.showAccDetail) {
      app.globalData.shopUiSnapshot = null;
      return;
    }

    const list = this.data.seriesList || [];
    const accList = this.data.accessoryList || [];

    if (snap.showDetail) {
      const idx = snap.currentSeriesIdx;
      if (typeof idx !== 'number' || idx < 0 || idx >= list.length) {
        app.globalData.shopUiSnapshot = null;
        return;
      }
      const s = list[idx];
      const seriesAccessoryList = this._buildSeriesAccessoryList(s);
      this.setData(
        {
          currentSeriesIdx: idx,
          currentSeries: s,
          seriesAccessoryList,
          selectedModelIdx: snap.selectedModelIdx,
          selectedOptionIdx: snap.selectedOptionIdx,
          showDetail: true,
          showFooterBar: false,
          isModelCompareMode: !!snap.isModelCompareMode
        },
        () => {
          this.calcTotal();
          wx.nextTick(() => {
            this._scheduleDetailFooterAnchorMeasure();
          });
        }
      );
      this._shopSnapshotRestoreDone = true;
      app.globalData.shopUiSnapshot = null;
      return;
    }

    if (snap.showAccDetail) {
      const aidx = snap.currentAccIdx;
      if (typeof aidx !== 'number' || aidx < 0 || aidx >= accList.length) {
        app.globalData.shopUiSnapshot = null;
        return;
      }
      this.setData({ showAccDetail: true, currentAccIdx: aidx });
      this._shopSnapshotRestoreDone = true;
      app.globalData.shopUiSnapshot = null;
    }
  },

  _clearCompareGuideTimers() {
    if (this._compareGuidePhaseTimer) {
      clearTimeout(this._compareGuidePhaseTimer);
      this._compareGuidePhaseTimer = null;
    }
    if (this._compareGuidePhase2HintTimer) {
      clearTimeout(this._compareGuidePhase2HintTimer);
      this._compareGuidePhase2HintTimer = null;
    }
  },

  /** 根据已选型号数量切换对比引导：≥2 个立即显示「开始对比」 */
  _updateCompareGuideBySelection(selectedCount) {
    if (!this.data.isModelCompareMode) return;
    this._clearCompareGuideTimers();
    const count = Number(selectedCount) || 0;
    if (count >= 2) {
      this.setData({
        compareGuidePhase: 2,
        compareGuidePhase2HintVisible: true
      });
      this._compareGuidePhase2HintTimer = setTimeout(() => {
        this._compareGuidePhase2HintTimer = null;
        if (!this.data.isModelCompareMode) return;
        this.setData({ compareGuidePhase2HintVisible: false });
      }, 5000);
    } else {
      this.setData({
        compareGuidePhase: 1,
        compareGuidePhase2HintVisible: false
      });
    }
  },

  // 1. 页面每次显示时，读取本地缓存的购物车
  onShow() {
    if (this.data.hubEmbedInProducts) {
      this.setData({ hubPanelActive: true });
    }
    hubNav.tryPlayEnterAnimOnShow(this);
    this._syncHeroAutoForCurrent();
    try {
      const sid = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
      if (sid && !this.data.repairId) {
        this.setData({ fromRepair: true, repairId: sid });
      }
    } catch (e) {}
    // 先展示页面，再延后重任务，减轻“点进来卡一下”
    setTimeout(() => {
      const app = getApp();
      if (app && app.startQiangliCheck) {
        app.startQiangliCheck();
      }
      
      // 重新检查管理员权限（确保从其他页面返回时也能显示开关）
      this.checkAdminPrivilege();
      
      if (wx.getScreenRecordingState) {
        wx.getScreenRecordingState({
          success: (res) => {
            if (res.state === 'on' || res.recording) {
              this.handleIntercept('record');
            }
          }
        });
      }
    }, 100);
    
    // 读取本地存储的购物车数据
    const cachedCart = wx.getStorageSync('my_cart') || [];
    
    // 如果有数据，计算一下总价并显示
    if (cachedCart.length > 0) {
      let total = 0;
      cachedCart.forEach(item => total += item.total);
      
      this.setData({
        cart: cachedCart,
        cartTotalPrice: total
      });
    }

    if (this._pendingOpenCheckout) {
      this._pendingOpenCheckout = false;
      setTimeout(() => this.openCheckoutFromHub(), 220);
    }
    
    // 🔴 强制同步：每次进入 shop 页都后台拉最新云端数据，避免多端（电脑/手机）看见不同步
    const cache = this.ensureShopDataCache();
    cache.cacheTime = null; // 先失效本地内存缓存，再拉取
    this.loadDataFromCloudBackground();

    this._prepareShopGuideForShow();
    this.scheduleShopExchangePolicyModal(720);
  },
  
  onReady() {
    if (this.data.hubEmbedInProducts && typeof this.layoutHubEmbedScroll === 'function') {
      wx.nextTick(() => this.layoutHubEmbedScroll());
    }
  },

  // ========================================================
  // 返回上一页
  // ========================================================
  onHubSegmentSwitch(e) {
    const segment = e.detail && e.detail.segment;
    if (!segment || segment === 'shop') return;
    if (this.data.hubEmbedInProducts && typeof this.triggerEvent === 'function') {
      this.triggerEvent('segment', { segment });
      return;
    }
    hubNav.switchSegment(segment);
  },

  onBackPress() {
    this.goBack();
    return true;
  },

  goBack() {
    if (this.data.hubEmbedInProducts && typeof this.triggerEvent === 'function') {
      this.triggerEvent('segment', { segment: 'home' });
      return;
    }
    if (this.data.showHubShell && !this.data.showOrderModal && !this.data.showDetail && !this.data.showAccDetail) {
      hubNav.goHome();
      return;
    }
    if (this.data.showOrderModal) {
      this.closeOrderModal();
      return;
    }
    if (this.data.showAccDetail) {
      if (this.data.accDetailClosing) return;
      this.onAccDetailNavClose();
      return;
    }
    if (this.data.showDetail) {
      this.closeDetail();
      return;
    }

    // 从 pagenew(带 jumpNumber) 进入 shop 时，返回 products 必须回到“产品选购”卡片
    if (this.fromOtherPage) {
      try {
        wx.removeStorageSync('__products_skip_return_focus_once__');
        wx.setStorageSync('__products_force_focus_once__', {
          cardId: 4,
          source: 'shop_goBack_from_jumpNumber',
          ts: Date.now()
        });
        wx.setStorageSync('__products_return_focus__', {
          cardId: 4,
          source: 'shop_goBack_from_jumpNumber',
          ts: Date.now()
        });
      } catch (e) {}
    }
    
    const pages = getCurrentPages();
    // 检查页面栈中是否有products页面
    const productsPageIndex = pages.findIndex(page => {
      const route = page.route || '';
      return route.includes('products/products');
    });
    
    if (productsPageIndex >= 0) {
      // 从 jumpNumber 链路返回时，直接改写栈内 products 实例，避免仅靠 storage 被后续逻辑覆盖
      if (this.fromOtherPage) {
        try {
          const productsPage = pages[productsPageIndex];
          const list = (productsPage && productsPage.data && productsPage.data.list) || [];
          const targetIndex = list.findIndex(item => Number(item && item.id) === 4);
          if (productsPage && typeof productsPage.setData === 'function') {
            const patch = { newArrivalIndex: 0 };
            if (targetIndex >= 0) {
              patch.currentIndex = targetIndex;
            }
            productsPage.setData(patch);
          }
        } catch (e) {
        }
      }

      // 如果页面栈中有products页面，计算需要返回的层数
      const pageBack = require('../../../utils/pageBack.js');
      pageBack.safePop(pages.length - 1 - productsPageIndex);
      return;
    }

    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },
  
  // ========================================================
  // 根据号码跳转到对应产品（快速跳转）
  // ========================================================
  jumpToProductByNumber(jumpNumber) {
    const list = this.data.seriesList;
    const targetIndex = list.findIndex(item => item.jumpNumber === jumpNumber);
    
    if (targetIndex >= 0) {
      const s = list[targetIndex];
      // 立即设置，不延迟
      this.setData({
        currentSeriesIdx: targetIndex,
        currentSeries: s,
        selectedModelIdx: -1,
        selectedOptionIdx: -1,
        showDetail: true
      });
      this.calcTotal();
    }
    // 未找到时静默处理，不显示任何提示
  },

  // ================== Admin 权限逻辑 ==================
  handleTitleClick() {
    // 如果是管理员模式，直接编辑标题
    if (this.data.isAdmin) {
      this.adminEditShopTitle();
      return;
    }
  },
  
  // ========================================================
  // 编辑商店标题
  // ========================================================
  adminEditShopTitle() {
    this._input(this.data.shopTitle || '选购', (val) => {
      this.setData({ shopTitle: val });
      this.saveShopTitleToCloud(val);
    });
  },

  // ========================================================
  // 保存商店标题到云端
  // ========================================================
  saveShopTitleToCloud(title) {
    if (!this.db) {
      console.error('[shop.js] saveShopTitleToCloud: this.db 不存在！');
      return;
    }
    this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).update({
      data: { title: title }
    }).then(() => {
    }).catch(err => {
      console.error('[shop.js] saveShopTitleToCloud 更新失败:', err);
      // 如果文档不存在，创建新文档
      const errMsg = err.errMsg || '';
      if (err.errCode === -502005 || err.errCode === -502002 || err.errCode === -502007 || 
          errMsg.includes('cannot find document') || errMsg.includes('not exist')) {
        this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).set({
          data: {
            title: title,
            topMediaList: this._getTopMediaListForSave(),
            autoCarouselEnabled: this.data.heroAutoCarouselEnabled === true
          }
        }).then(() => {
        }).catch(createErr => {
          console.error('[shop.js] saveShopTitleToCloud 创建失败:', createErr);
        });
      }
    });
  },
  // ================== 权限检查逻辑 ==================
  // 🔴 计算导航栏信息（屏幕适配）
  calcNavBarInfo() {
    try {
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      let navBarHeight = 44;
      try {
        const menuButton = wx.getMenuButtonBoundingClientRect();
        const gap = menuButton.top - statusBarHeight;
        navBarHeight = (gap * 2) + menuButton.height;
      } catch (e) {}
      this.setData({ statusBarHeight, navBarHeight });
      if (this.data.hubEmbedInProducts && typeof this.layoutHubEmbedScroll === 'function') {
        wx.nextTick(() => this.layoutHubEmbedScroll());
      }
    } catch (e) {
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  async checkAdminPrivilege() {
    const ADMIN_CACHE_KEY = '__shop_admin_privilege_cache__';
    const ADMIN_CACHE_TTL = 10 * 60 * 1000;
    try {
      const cache = wx.getStorageSync(ADMIN_CACHE_KEY);
      if (cache && typeof cache.isAuthorized === 'boolean' && cache.ts && (Date.now() - cache.ts < ADMIN_CACHE_TTL)) {
        if (this.data.isAuthorized !== cache.isAuthorized) {
          this.setData({ isAuthorized: cache.isAuthorized });
        }
        return;
      }
    } catch (e) {}

    try {
      // 1. 获取当前用户的 OpenID (利用云函数)
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
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
        try { wx.setStorageSync(ADMIN_CACHE_KEY, { isAuthorized: true, ts: Date.now() }); } catch (e) {}
    } else {
        this.setData({ isAuthorized: false });
        try { wx.setStorageSync(ADMIN_CACHE_KEY, { isAuthorized: false, ts: Date.now() }); } catch (e) {}
      }
    } catch (err) {
      console.error('[shop.js] ❌ 权限检查失败:', err);
      // 网络抖动时保留当前态，避免权限闪烁
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this.showAutoToast('提示', '无权限');
      return;
    }
    
    const nextState = !this.data.isAdmin;
    this.setData({
      isAdmin: nextState,
      categorySections: this._buildCategorySections(
        this.data.mainCategories,
        this.data.seriesList,
        this.data.categorySections,
        nextState,
        this.data.accessoryList,
        this.data.sectionRowModes
      )
    }, () => {
      if (this.data.hubEmbedInProducts && typeof this.layoutHubEmbedScroll === 'function') {
        wx.nextTick(() => this.layoutHubEmbedScroll());
      }
    });
    this.showAutoToast(
      '提示',
      nextState
        ? '管理模式：空白处见比例提示；上传后自动压缩体积'
        : '已回到用户模式'
    );
  },

  // ========================================================
  // 1. 核心修改：重写 _input 方法，使用自定义弹窗代替 wx.showModal
  // ========================================================
  _input(currentVal, callback, title) {
    const normalizedVal = currentVal === undefined || currentVal === null ? '' : String(currentVal);
    this._customEditCallback = typeof callback === 'function' ? callback : null;
    this.setData({
      showCustomEditModal: true,
      customEditTitle: title || '编辑内容',
      customEditVal: normalizedVal
    });
  },
  
  // 弹窗输入监听
  onCustomEditInput(e) { this.setData({ customEditVal: e.detail.value }); },
  
  // 弹窗取消（带收缩退出动画）
  closeCustomEditModal() {
    this._customEditCallback = null;
    this.setData({ customModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showCustomEditModal: false,
        customModalClosing: false
      });
    }, 420);
  },
  
  // 弹窗确定
  confirmCustomEdit() {
    const cb = this._customEditCallback;
    this._customEditCallback = null;
    if (cb) {
      const safeVal = this.data.customEditVal === undefined || this.data.customEditVal === null
        ? ''
        : String(this.data.customEditVal);
      cb(safeVal);
    }
    this.closeCustomEditModal();
  },

  // ========================================================
  // 数据桶（COS）上传：统一走 utils/cosUpload（本地 readFile / 分片，禁止对 http://tmp 发 request）
  // ========================================================
  uploadToCos(path, folder = 'shop', forceSuffix = '', extra = {}) {
    if (!wx.cloud) {
      return Promise.reject(new Error('wx.cloud 未就绪'));
    }
    const suffix = forceSuffix || path.match(/\.[^.]+?$/)?.[0] || '.png';
    const ext = suffix.startsWith('.') ? suffix : `.${suffix}`;
    return cosUpload.uploadLocalFileToCos(path, {
      folder,
      ext,
      knownSize: extra.knownSize,
      onProgress: extra.onProgress
    });
  },

  uploadShopImageToCos(path, folder, extra = {}) {
    const preset = extra.preset;
    const skipPrepare = extra.skipPrepare === true;
    const preparePromise =
      !skipPrepare && preset
        ? shopImagePrepare.prepareImageFile(path, preset)
        : Promise.resolve(path);
    return preparePromise.then((preparedPath) =>
      cosUpload.uploadImageToCos(preparedPath, folder, {
        knownSize: extra.knownSize,
        onProgress: extra.onProgress
      })
    );
  },

  chooseShopImage(presetKey, options = {}) {
    return shopImagePrepare.chooseAndPrepare(presetKey, options);
  },

  uploadShopVideoToCos(path, folder, forceSuffix = '', extra = {}) {
    const raw = (forceSuffix || path.match(/\.[^.]+?$/)?.[0] || '.mp4').toLowerCase();
    const ext = raw.startsWith('.') ? raw : `.${raw}`;
    return cosUpload.uploadVideoToCos(path, folder, {
      ext,
      knownSize: extra.knownSize,
      onProgress: extra.onProgress
    });
  },

  // 历史兼容：通用选图（详情长图等）
  chooseImageWithCrop() {
    return this.chooseShopImage('detail');
  },

  _normalizeSlotNumArray(raw, maxSlot) {
    const max = Math.max(1, Number(maxSlot) || 1);
    let arr = raw;
    if (!Array.isArray(arr)) {
      if (raw != null && raw !== '') arr = [raw];
      else arr = [];
    }
    const set = new Set();
    arr.forEach((n) => {
      const v = Math.floor(Number(n));
      if (v >= 1 && v <= max) set.add(v);
    });
    return Array.from(set).sort((a, b) => a - b);
  },

  _normalizeAccessoryVersionSlots(acc, categories, seriesList, accessoryList) {
    const cats = Array.isArray(categories) && categories.length ? categories : ['电动版本'];
    const defaultCat = cats[0];
    const list = Array.isArray(accessoryList) ? accessoryList : [];
    const series = Array.isArray(seriesList) ? seriesList : [];
    const raw = acc && acc.versionSlots;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const out = {};
      cats.forEach((cat) => {
        if (!Object.prototype.hasOwnProperty.call(raw, cat)) return;
        const max = this._getCategorySeriesSlotCount(cat, series, list);
        const nums = this._normalizeSlotNumArray(raw[cat], max);
        if (nums.length) out[cat] = nums;
      });
      Object.keys(raw).forEach((cat) => {
        if (out[cat] || cats.indexOf(cat) === -1) return;
        const max = this._getCategorySeriesSlotCount(cat, series, list);
        const nums = this._normalizeSlotNumArray(raw[cat], max);
        if (nums.length) out[cat] = nums;
      });
      return out;
    }
    const legacyCat = (acc && acc.mainCategory) || defaultCat;
    const max = this._getCategorySeriesSlotCount(legacyCat, series, list);
    let legacyNums = acc && acc.slotNumbers;
    if (!Array.isArray(legacyNums) || !legacyNums.length) {
      if (acc && acc.slotNumber != null && acc.slotNumber !== '') legacyNums = [acc.slotNumber];
      else legacyNums = [1];
    }
    return { [legacyCat]: this._normalizeSlotNumArray(legacyNums, max) };
  },

  _getAccessorySlotsForVersion(acc, versionName, maxSlot) {
    if (!acc) return [];
    const vs = acc.versionSlots;
    if (!vs || typeof vs !== 'object') return [];
    return this._normalizeSlotNumArray(vs[versionName], maxSlot);
  },

  _accessoryAppearsInVersion(acc, versionName) {
    return this._getAccessorySlotsForVersion(acc, versionName, 99).length > 0;
  },

  /** 产品在本版本横滑中的格号（与 sortOrder 一致，默认 1） */
  _getSeriesCatalogSlot(series) {
    if (!series) return 1;
    const n = Math.floor(Number(series.sortOrder));
    return n >= 1 ? n : 1;
  },

  /** 配件是否配对到指定产品的版本+格号 */
  _accessoryMatchesSeries(acc, series) {
    if (!acc || !series) return false;
    const cat = series.mainCategory || '电动版本';
    const slotNum = this._getSeriesCatalogSlot(series);
    return this._getAccessorySlotsForVersion(acc, cat, 99).includes(slotNum);
  },

  _buildSeriesAccessoryList(series) {
    if (!series) return [];
    const list = this.data.accessoryList || [];
    const out = [];
    list.forEach((acc, listIndex) => {
      if (!this._accessoryMatchesSeries(acc, series)) return;
      out.push({
        ...acc,
        listIndex,
        rowKey: 'sa-' + String(acc.id || acc._id || listIndex)
      });
    });
    return out;
  },

  _refreshSeriesAccessoryList() {
    if (!this.data.showDetail || this.data.currentSeriesIdx < 0) return;
    const series = this.data.seriesList[this.data.currentSeriesIdx];
    if (!series) return;
    this.setData({ seriesAccessoryList: this._buildSeriesAccessoryList(series) });
  },

  normalizeAccessoryFromDb(item) {
    if (!item || typeof item !== 'object') return item;
    const cats = this.data.mainCategories || [];
    const defaultCat = cats.includes('配件系列') ? '配件系列' : (cats[0] || '电动版本');
    const rawPrice = item.price != null && item.price !== '' ? Number(item.price) : NaN;
    const price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
    const versionSlots = this._normalizeAccessoryVersionSlots(
      item,
      cats,
      this.data.seriesList,
      this.data.accessoryList
    );
    return {
      ...item,
      price,
      versionSlots,
      detailImages: Array.isArray(item.detailImages) ? item.detailImages.filter(Boolean) : [],
      detailImagesAutoplay: item.detailImagesAutoplay === true
    };
  },

  _getCategorySeriesSlotCount(catName, seriesList, accessoryList) {
    const defaultCat = '电动版本';
    const list = Array.isArray(seriesList) ? seriesList : [];
    let count = this._countSeriesInCategory(list, catName);
    const accAll = Array.isArray(accessoryList) ? accessoryList : [];
    accAll.forEach((acc) => {
      const nums = this._getAccessorySlotsForVersion(acc, catName, 99);
      nums.forEach((n) => {
        if (n > count) count = n;
      });
    });
    return Math.max(count, 1);
  },

  _buildAccSlotsForCategory(catName, accAll, seriesList, defaultCat, isAdmin) {
    const accWithIndex = (accAll || []).map((acc, index) => ({ acc, index }));
    const slotCount = this._getCategorySeriesSlotCount(catName, seriesList, accAll);
    const slots = [];
    for (let n = 1; n <= slotCount; n++) {
      const matches = accWithIndex
        .filter(({ acc }) => this._getAccessorySlotsForVersion(acc, catName, slotCount).includes(n))
        .sort((a, b) => (a.acc.sortOrder || 0) - (b.acc.sortOrder || 0));
      const winner = matches[0] || null;
      const accId = winner ? String(winner.acc.id || winner.acc._id || winner.index) : 'empty';
      slots.push({
        slotNum: n,
        acc: winner ? winner.acc : null,
        index: winner ? winner.index : -1,
        slideKey: 'slot-' + catName + '-' + n + '-' + accId,
        conflictCount: matches.length
      });
    }
    const accSlots = isAdmin ? slots : slots.filter((s) => s.acc);
    return {
      accSlots,
      accSlotsAll: slots,
      seriesSlotCount: slotCount,
      accSlotMode: 'grid'
    };
  },

  _resolveAccSectionSwiperIndex(accSlots, slideCount, prevSec) {
    const maxIndex = Math.max(slideCount - 1, 0);
    const focus = this._accSectionSwiperFocus;
    if (focus && focus.category === (prevSec && prevSec.name)) {
      if (focus.goAddSlide) {
        this._accSectionSwiperFocus = null;
        return maxIndex;
      }
      if (typeof focus.accIndex === 'number' && focus.accIndex >= 0) {
        const found = (accSlots || []).findIndex((s) => s.index === focus.accIndex);
        this._accSectionSwiperFocus = null;
        if (found >= 0) return found;
      }
      if (typeof focus.slotNum === 'number' && focus.slotNum > 0) {
        const found = (accSlots || []).findIndex((s) => s.slotNum === focus.slotNum);
        this._accSectionSwiperFocus = null;
        if (found >= 0) return found;
      }
      this._accSectionSwiperFocus = null;
    }
    const prevCurrent = prevSec && typeof prevSec.current === 'number' ? prevSec.current : 0;
    return Math.min(prevCurrent, maxIndex);
  },

  _syncCategorySections(extraPatch = {}) {
    const patch = {
      categorySections: this._buildCategorySections(
        this.data.mainCategories,
        this.data.seriesList,
        this.data.categorySections,
        this.data.isAdmin,
        this.data.accessoryList,
        this.data.sectionRowModes
      ),
      ...extraPatch
    };
    this.setData(patch);
  },

  // 历史兼容：保留函数名，但不再裁切
  cropImageIfPossible(tempPath) {
    return Promise.resolve(tempPath);
  },

  // ========================================================
  // 从云端加载数据
  // ========================================================
  // 🔴 辅助函数：确保 shopDataCache 存在
  ensureShopDataCache() {
    const app = getApp();
    if (!app.globalData.shopDataCache) {
      app.globalData.shopDataCache = {
        shopTitle: null,
        topMediaList: null,
        heroAutoCarouselEnabled: false,
        seriesList: null,
        accessoryList: null,
        cacheTime: null,
        isLoading: false
      };
    }
    return app.globalData.shopDataCache;
  },

  _getShopGlobalCacheTtlMs() {
    try {
      return require('../../../utils/shopPreloadBundle.js').SHOP_GLOBAL_CACHE_TTL_MS || 12 * 60 * 1000;
    } catch (e) {
      return 12 * 60 * 1000;
    }
  },

  /**
   * 同步「当前可渲染」系列/配件到 globalData.shopDataCache。
   * 必须保留 coverDisplay/imgDisplay 等，否则退回 products 再 navigateTo 会新建商城页，读到的缓存被 strip 掉后又整页 hydrate，体感像重新刷新。
   */
  syncHydratedShopListsToGlobalCache(seriesList, accessoryList) {
    const c = this.ensureShopDataCache();
    if (seriesList !== undefined && seriesList !== null) {
      c.seriesList = Array.isArray(seriesList)
        ? seriesList.map(s => (s && typeof s === 'object' ? { ...s } : s))
        : seriesList;
    }
    if (accessoryList !== undefined && accessoryList !== null) {
      c.accessoryList = Array.isArray(accessoryList)
        ? accessoryList.map(a => (a && typeof a === 'object' ? { ...a } : a))
        : accessoryList;
    }
  },

  loadDataFromCloud() {
    // 🔴 确保缓存对象存在
    const cache = this.ensureShopDataCache();
    
    // 🔴 优先使用缓存数据，立即显示，提升用户体验
    const shopMemTtl2 = this._getShopGlobalCacheTtlMs();
    if (cache && cache.cacheTime && Date.now() - cache.cacheTime < shopMemTtl2) {
      const requiredPartsMap = this.data.requiredPartsMap || {};
      const currentModel = this.data.currentSeries?.name || '';
      const requiredPartsForModel = requiredPartsMap[currentModel] || [];
      const seriesQuick = cache.seriesList
        ? this.decorateSeriesImageFields(this.normalizeSeriesListFromDb(cache.seriesList))
        : null;
      const accQuick = cache.accessoryList
        ? cache.accessoryList.map(item => ({
          ...this.normalizeAccessoryFromDb(item),
          selected: false,
          isRequired: requiredPartsForModel.includes(item.name)
        }))
        : null;
      const runPreloadOnce = () => wx.nextTick(() => this.preloadMediaResources());
      const topListReady =
        cache.topMediaList === undefined || cache.topMediaList === null
          ? undefined
          : this._buildTopMediaRenderListSync(cache.topMediaList);

      const canOneShot =
        seriesQuick &&
        accQuick &&
        !this._shopListsNeedCloudHydrate(seriesQuick, accQuick) &&
        topListReady !== null;

      if (canOneShot) {
        const patch = {
          imageHdLoaded: {},
          seriesList: seriesQuick,
          accessoryList: accQuick
        };
        if (cache.shopTitle) patch.shopTitle = this._normalizeShopTitle(cache.shopTitle);
        if (typeof cache.heroAutoCarouselEnabled === 'boolean') {
          patch.heroAutoCarouselEnabled = cache.heroAutoCarouselEnabled;
        }
        if (topListReady !== undefined) this._mergeHeroFieldsIntoPatch(patch, topListReady);
        this.setData(patch, () => {
          wx.nextTick(() => this._syncHeroAutoForCurrent());
        });
        this.syncHydratedShopListsToGlobalCache(seriesQuick, accQuick);
        if (this.jumpNumber) wx.nextTick(() => this.jumpToProductByNumber(this.jumpNumber));
        runPreloadOnce();
        this.loadDataFromCloudBackground();
        if (!cache.seriesList && !cache.accessoryList) {
          this.preloadMediaResources();
        }
        return;
      }

      const rawTop = cache.topMediaList || [];
      const topNeeds = rawTop.length > 0 && this._topMediaNeedsCloudResolve(rawTop);
      const listsNeed = this._shopListsNeedCloudHydrate(seriesQuick || [], accQuick || []);

      if (topNeeds || listsNeed) {
        this.applyShopFirstScreenData({
          rawTopList: rawTop,
          decoratedSeries: seriesQuick || [],
          accessoryList: accQuick || [],
          shopTitle: cache.shopTitle,
          heroAutoCarouselEnabled: cache.heroAutoCarouselEnabled
        }).catch(err => {
          runPreloadOnce();
        });
        this.loadDataFromCloudBackground();
        return;
      }

      const patch = { imageHdLoaded: {}, heroHdLoaded: {} };
      if (cache.shopTitle) patch.shopTitle = this._normalizeShopTitle(cache.shopTitle);
      if (typeof cache.heroAutoCarouselEnabled === 'boolean') {
        patch.heroAutoCarouselEnabled = cache.heroAutoCarouselEnabled;
      }
      if (topListReady !== undefined && topListReady !== null) {
        this._mergeHeroFieldsIntoPatch(patch, topListReady);
      }
      if (seriesQuick) patch.seriesList = seriesQuick;
      if (accQuick) patch.accessoryList = accQuick;
      this.setData(patch, () => {
        wx.nextTick(() => {
          this._syncHeroAutoForCurrent();
          this.preloadMediaResources();
        });
      });
      if (seriesQuick) this.syncHydratedShopListsToGlobalCache(seriesQuick, accQuick);
      if (this.jumpNumber) wx.nextTick(() => this.jumpToProductByNumber(this.jumpNumber));
      this.loadDataFromCloudBackground();
      return;
    }
    
    // 缓存无效或不存在，正常加载
    if (!this.db) {
      console.error('[shop.js] ❌ loadDataFromCloud: this.db 不存在！');
      return;
    }
    // 移除加载提示，静默加载
    
    const loadShopMainDoc = async () => {
      try {
        const res = await this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).get();
        if (res && res.data) return res.data;
      } catch (e) {
      }
      const [titleRes, mediaRes] = await Promise.all([
        this.db.collection('shop_config').doc('shopTitle').get().catch(() => ({ data: null })),
        this.db.collection('shop_config').doc('topMedia').get().catch(() => ({ data: null }))
      ]);
      const legacyData = {
        title: this._normalizeShopTitle((titleRes && titleRes.data && titleRes.data.title) || this.data.shopTitle),
        topMediaList: (mediaRes && mediaRes.data && mediaRes.data.list) || [],
        autoCarouselEnabled: !!(mediaRes && mediaRes.data && mediaRes.data.autoCarouselEnabled)
      };
      this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).set({
        data: {
          title: legacyData.title,
          topMediaList: this._normalizeTopMediaList(legacyData.topMediaList),
          autoCarouselEnabled: legacyData.autoCarouselEnabled
        }
      }).then(() => {
      }).catch(() => {});
      return legacyData;
    };
    Promise.all([
      loadShopMainDoc(),
      this.db.collection('shop_series').get().catch(err => {
        console.error('[shop.js] ❌ shop_series:', err && err.errMsg ? err.errMsg : err);
        return { data: [] };
      }),
      this.db.collection('shop_accessories').get().catch(err => {
        console.error('[shop.js] ❌ shop_accessories:', err && err.errMsg ? err.errMsg : err);
        return { data: [] };
      })
    ])
      .then(async ([mainData, seriesRes, accRes]) => {
        const title = this._normalizeShopTitle((mainData && mainData.title) || this.data.shopTitle);
        const autoCarouselEnabled = mainData && mainData.autoCarouselEnabled === true;
        const rawTop = this._normalizeTopMediaList((mainData && (mainData.topMediaList || mainData.list)) || []);
        const mainCategories =
          mainData && Array.isArray(mainData.mainCategories) && mainData.mainCategories.length
            ? mainData.mainCategories
            : this.data.mainCategories;
        const sectionRowModes =
          mainData && mainData.sectionRowModes && typeof mainData.sectionRowModes === 'object'
            ? mainData.sectionRowModes
            : {};

        const seriesData = (seriesRes && seriesRes.data) ? seriesRes.data : [];
        const accRaw = (accRes && accRes.data) ? accRes.data : [];
        const decorated = this.decorateSeriesImageFields(this.normalizeSeriesListFromDb(seriesData));
        const requiredPartsMap = this.data.requiredPartsMap || {};
        const currentModel = this.data.currentSeries?.name || '';
        const requiredPartsForModel = requiredPartsMap[currentModel] || [];
        const cleanList = accRaw.map(item => ({
          ...this.normalizeAccessoryFromDb(item),
          selected: false,
          isRequired: requiredPartsForModel.includes(item.name)
        }));

        await this.applyShopFirstScreenData({
          rawTopList: rawTop,
          decoratedSeries: decorated,
          accessoryList: cleanList,
          shopTitle: title,
          heroAutoCarouselEnabled: autoCarouselEnabled,
          mainCategories,
          sectionRowModes
        });
      })
      .catch(err => {
        console.error('[shop.js] 首屏并行加载失败:', err);
      });
  },

  // 🔴 后台刷新数据（不阻塞页面显示，静默更新；防抖避免与首屏 hydrate 抢带宽）
  loadDataFromCloudBackground() {
    if (!this.db) {
      return;
    }
    clearTimeout(this._shopBgDebounceTimer);
    this._shopBgDebounceTimer = setTimeout(() => {
      this._shopBgDebounceTimer = null;
      this._executeLoadDataFromCloudBackground();
    }, 380);
  },

  _executeLoadDataFromCloudBackground() {
    if (!this.db) {
      return;
    }
    if (this._topMediaSaving) {
      return;
    }
    const app = getApp();
    
    // 并行加载所有数据
    Promise.all([
      // 1. 加载统一配置（title + topMedia）
      this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).get().catch(() => ({ data: null })),
      // 2. 加载产品系列
      this.db.collection('shop_series').get().catch(() => ({ data: [] })),
      // 3. 加载配件
      this.db.collection('shop_accessories').get().catch(() => ({ data: [] }))
    ]).then(async ([shopMainRes, seriesRes, accRes]) => {
      // 🔴 确保缓存对象存在
      const cache = this.ensureShopDataCache();
      let hasUpdate = false;
      
      // 更新缓存和页面数据（统一配置）
      const main = (shopMainRes && shopMainRes.data) || null;
      if (main) {
        if (main.title) {
          const normTitle = this._normalizeShopTitle(main.title);
          if (cache.shopTitle !== normTitle) {
            cache.shopTitle = normTitle;
            this.setData({ shopTitle: normTitle });
            hasUpdate = true;
          }
        }
        if (main.mainCategories && Array.isArray(main.mainCategories) && main.mainCategories.length > 0) {
          this.setData({ mainCategories: main.mainCategories });
        }
        if (main.sectionRowModes && typeof main.sectionRowModes === 'object') {
          this.setData({ sectionRowModes: main.sectionRowModes });
        }
      }
      const seriesData = Array.isArray(seriesRes.data) ? seriesRes.data : [];
      const accRaw = Array.isArray(accRes.data) ? accRes.data : [];
      const decorated = this.decorateSeriesImageFields(this.normalizeSeriesListFromDb(seriesData));
      const requiredPartsMap = this.data.requiredPartsMap || {};
      const currentModel = this.data.currentSeries?.name || '';
      const requiredPartsForModel = requiredPartsMap[currentModel] || [];
      const cleanList = accRaw.map(item => ({
        ...this.normalizeAccessoryFromDb(item),
        selected: false,
        isRequired: requiredPartsForModel.includes(item.name)
      }));

      const bundle = this._getShopPreloadBundle();
      let rawTop = [];
      let autoCarouselEnabled = this.data.heroAutoCarouselEnabled === true;
      if (main) {
        if (bundle && bundle.fixTopMediaListFromDoc) {
          const fixed = bundle.fixTopMediaListFromDoc(main);
          rawTop = fixed.list;
          autoCarouselEnabled = fixed.autoCarouselEnabled;
        } else {
          rawTop = main.topMediaList || main.list || [];
          autoCarouselEnabled = main.autoCarouselEnabled === true;
        }
      } else if (cache.topMediaList) {
        rawTop = cache.topMediaList;
        autoCarouselEnabled = cache.heroAutoCarouselEnabled === true;
      }

      if (main || seriesData.length || accRaw.length) {
        await this.applyShopFirstScreenData({
          rawTopList: rawTop,
          decoratedSeries: decorated,
          accessoryList: cleanList,
          shopTitle: cache.shopTitle || this.data.shopTitle,
          heroAutoCarouselEnabled: autoCarouselEnabled
        });
        hasUpdate = true;
      }
      
      cache.cacheTime = Date.now();
      
      if (hasUpdate) {
      } else {
      }
    }).catch(err => {
      console.error('[shop.js] 后台刷新失败:', err);
    });
  },

  // 🔴 保存数据后刷新缓存（重新加载所有数据）
  refreshShopDataCacheAfterSave() {
    try {
      const app = getApp();
      if (app && app.globalData) app.globalData.shopUiSnapshot = null;
    } catch (e) {}
    // 清除缓存时间，强制重新加载
    this.ensureShopDataCache().cacheTime = null;
    // 后台刷新数据
    this.loadDataFromCloudBackground();
  },

  // 🔴 静默预加载媒体资源（图片和视频）
  preloadMediaResources() {
    const imageUrls = [];
    
    // 1. 收集顶部轮播媒体（首屏优先：图片 + 当前第一条视频）
    if (this.data.topMediaList && this.data.topMediaList.length > 0) {
      const heroIdx = Number(this.data.heroCurrent) || 0;
      this.data.topMediaList.forEach((item, idx) => {
        if (!item) return;
        if (item.type === 'image') {
          imageUrls.push(item.renderUrl || item.renderThumb || item.url);
        } else if (item.type === 'video' && idx === heroIdx) {
          const v = item.renderUrl || item.url;
          if (v && v.indexOf('cloud://') !== 0) {
            this._preloadHeroVideoFile(v);
          }
          if (item.poster) imageUrls.push(item.poster);
        }
      });
    }
    
    // 2. 收集产品封面的图片URL（首屏可见，只预加载前3个）
    if (this.data.seriesList && this.data.seriesList.length > 0) {
      this.data.seriesList.slice(0, 3).forEach(series => {
        const c = series.coverDisplay || series.cover;
        if (c) {
          imageUrls.push(c);
        }
      });
    }

    // 2b. 前几条产品的详情首图/次图（点开「选购配置」弹层时少等解码）
    if (this.data.seriesList && this.data.seriesList.length > 0) {
      this.data.seriesList.slice(0, 4).forEach(series => {
        (series.detailImages || [])
          .filter(m => m && m.type === 'image' && m.url)
          .slice(0, 2)
          .forEach(m => {
            const u = m.urlDisplay || m.url;
            if (u) imageUrls.push(u);
          });
      });
    }
    
    // 3. 收集配件的缩略图URL（首屏可见，只预加载前5个）
    if (this.data.accessoryList && this.data.accessoryList.length > 0) {
      this.data.accessoryList.slice(0, 5).forEach(acc => {
        const u = acc.imgDisplay || acc.img;
        if (u) {
          imageUrls.push(u);
        }
      });
    }
    
    // 4. 批量预加载图片（静默进行，不阻塞）
    if (imageUrls.length > 0) {
      // 分批预加载：提高并发，尽快把首屏资源拉到本地缓存
      const batchSize = 6;
      let currentIndex = 0;
      
      const preloadBatch = () => {
        const batch = imageUrls.slice(currentIndex, currentIndex + batchSize);
        batch.forEach((url, index) => {
          if (this._shopWarmImageSet && this._shopWarmImageSet.has(url)) return;
          // 延迟执行，避免同时发起太多请求
          setTimeout(() => {
            wx.getImageInfo({
              src: url,
              success: () => {
                if (this._shopWarmImageSet) this._shopWarmImageSet.add(url);
                // 静默成功，不输出日志
              },
              fail: () => {
                // 静默失败，不输出日志（避免控制台噪音）
              }
            });
          }, index * 6);
        });
        
        currentIndex += batchSize;
        if (currentIndex < imageUrls.length) {
          setTimeout(preloadBatch, 40);
        }
      };
      
      // 立即开始预加载（越早发起，首屏图片越快）
      preloadBatch();
    }
  },

  // ========================================================
  // 保存顶部媒体到云端
  // ========================================================
  /** 顶部轮播已带 renderUrl 或无需 cloud 解析时返回列表；否则返回 null（需走 setTopMediaListForRender 异步） */
  _buildTopMediaRenderListSync(safeList) {
    const list = Array.isArray(safeList) ? safeList : [];
    if (this._topMediaNeedsCloudResolve(list)) return null;
    const bundle = this._getShopPreloadBundle();
    if (bundle && bundle.buildTopMediaRenderList) {
      return bundle.buildTopMediaRenderList(list, {}, u => this.buildLowQualityUrl(u));
    }
    return list.map(item => (item ? { ...item, renderUrl: item.renderUrl || item.url } : item));
  },

  /** 嵌入 products 时 shop-hero-wrap 左右各 32rpx，高度须按实际展示宽度算 */
  _heroEmbedSidePaddingPx() {
    if (!this.data.hubEmbedInProducts) return 0;
    const ww = this._windowWidthPx || (wx.getSystemInfoSync().windowWidth || 375);
    return Math.ceil((ww / 750) * 64);
  },

  _heroContentWidthPx() {
    const ww = this._windowWidthPx || (wx.getSystemInfoSync().windowWidth || 375);
    return Math.max(160, ww - this._heroEmbedSidePaddingPx());
  },

  _syncHeroDefaultHeight() {
    try {
      const win = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : null;
      this._windowWidthPx = (win && win.windowWidth) || 375;
    } catch (e) {
      this._windowWidthPx = 375;
    }
    this.setData({ heroSwiperHeightPx: this._defaultHeroHeightPx() });
  },

  _defaultHeroHeightPx() {
    return Math.round(this._heroContentWidthPx() * 9 / 16);
  },

  _maxHeroHeightPx() {
    return Math.round(this._heroContentWidthPx() * 2.5);
  },

  _capHeroHeightPx(h) {
    const n = Math.max(0, Math.round(Number(h) || 0));
    const def = this._defaultHeroHeightPx();
    if (n <= 0) return def;
    return Math.min(n, this._maxHeroHeightPx());
  },

  _resolveHeroSlideHeightPx(index, list, heightsMap) {
    const items = Array.isArray(list) ? list : (this.data.topMediaList || []);
    const heights = heightsMap || this.data.heroSlideHeightsPx || {};
    const idx = Number(index) || 0;
    const item = items[idx];
    if (item && item.type === 'video') return this._defaultHeroHeightPx();
    if (heights[idx] != null) return this._capHeroHeightPx(heights[idx]);
    return this._defaultHeroHeightPx();
  },

  /** 顶部轮播列表更新后：同步 swiper 高度与各 slide 已知高度（视频=16:9） */
  _applyTopMediaListToView(renderList) {
    const patch = { heroHdLoaded: {} };
    this._mergeHeroFieldsIntoPatch(patch, renderList);
    return new Promise((resolve) => {
      this.setData(patch, resolve);
    });
  },

  _inferTopMediaType(url) {
    const u = String(url || '').toLowerCase();
    if (
      u.endsWith('.mp4') ||
      u.endsWith('.mov') ||
      u.endsWith('.m4v') ||
      u.indexOf('.mp4?') !== -1 ||
      u.indexOf('.mov?') !== -1 ||
      u.indexOf('.m4v?') !== -1
    ) {
      return 'video';
    }
    return 'image';
  },

  _normalizeTopMediaItemForStorage(item) {
    if (!item) return item;
    const {
      renderUrl,
      renderThumb,
      renderFull,
      dualRender,
      ...rest
    } = item;
    let url = typeof rest.url === 'string' ? rest.url.trim() : '';
    if (!url && typeof renderUrl === 'string') {
      const r = renderUrl.trim();
      if (
        r &&
        r.indexOf('wxfile://') !== 0 &&
        r.indexOf('http://tmp/') !== 0 &&
        !/^file:\/\//i.test(r)
      ) {
        url = r;
      }
    }
    const type = rest.type || this._inferTopMediaType(url);
    const next = { type, url };
    if (type === 'video' && rest.autoplay === true) next.autoplay = true;
    if (typeof rest.poster === 'string') {
      const p = rest.poster.trim();
      if (
        p &&
        p.indexOf('wxfile://') !== 0 &&
        p.indexOf('http://tmp/') !== 0 &&
        !/^file:\/\//i.test(p) &&
        !/^[a-zA-Z]:[\\/]/.test(p)
      ) {
        next.poster = p;
      }
    }
    return next;
  },

  _normalizeTopMediaList(rawList) {
    return (rawList || []).map((item) => this._normalizeTopMediaItemForStorage(item));
  },

  /** 预拉当前 hero 视频到本地，减少首屏黑屏等待 */
  _preloadHeroVideoFile(url) {
    if (!url || typeof url !== 'string' || url.indexOf('cloud://') === 0) return;
    if (this._heroVideoPreloadUrl === url) return;
    this._heroVideoPreloadUrl = url;
    wx.downloadFile({
      url,
      success: () => {},
      fail: () => {}
    });
  },

  async setTopMediaListForRender(list) {
    const safeList = Array.isArray(list) ? list : [];
    const bundle = this._getShopPreloadBundle();
    let renderList;
    if (!this._topMediaNeedsCloudResolve(safeList)) {
      if (bundle && bundle.buildTopMediaRenderList) {
        renderList = bundle.buildTopMediaRenderList(safeList, {}, u => this.buildLowQualityUrl(u));
      } else {
        renderList = this._buildTopMediaRenderListSync(safeList) || [];
      }
    } else {
      const tempUrlMap = await this._batchResolveCloudFileIds(
        bundle && bundle.collectTopMediaCloudFileIds
          ? bundle.collectTopMediaCloudFileIds(safeList)
          : safeList.filter(i => i && i.url && i.url.indexOf('cloud://') === 0).map(i => i.url)
      );
      if (bundle && bundle.buildTopMediaRenderList) {
        renderList = bundle.buildTopMediaRenderList(safeList, tempUrlMap, u => this.buildLowQualityUrl(u));
      } else {
        renderList = safeList.map(item => (item ? { ...item, renderUrl: tempUrlMap[item.url] || item.url } : item));
      }
    }
    await this._applyTopMediaListToView(renderList);
    await this._primeHeroSlideHeightsForList(safeList);
  },

  /** 上传/刷新后根据图片 URL 预计算轮播高度，减少底部留白 */
  _primeHeroSlideHeightsForList(list) {
    const items = Array.isArray(list) ? list : [];
    const ww = this._windowWidthPx || (wx.getSystemInfoSync().windowWidth || 375);
    this._windowWidthPx = ww;
    const w = this._heroContentWidthPx();
    const heights = { ...(this.data.heroSlideHeightsPx || {}) };
    const cur = Number(this.data.heroCurrent) || 0;
    let curH = null;
    const tasks = items.map((item, idx) => {
      if (!item || item.type !== 'image') return Promise.resolve();
      const src = item.url || item.renderFull || item.renderUrl;
      if (!src || typeof src !== 'string') return Promise.resolve();
      return new Promise((resolve) => {
        wx.getImageInfo({
          src,
          success: (info) => {
            if (info.width > 0 && info.height > 0) {
              const h = this._capHeroHeightPx(Math.round(w * (info.height / info.width)));
              heights[idx] = h;
              if (idx === cur) curH = h;
            }
            resolve();
          },
          fail: () => resolve()
        });
      });
    });
    return Promise.all(tasks).then(() => {
      const patch = { heroSlideHeightsPx: heights };
      if (curH != null) patch.heroSwiperHeightPx = curH;
      else if (items[cur] && items[cur].type === 'video') {
        patch.heroSwiperHeightPx = this._defaultHeroHeightPx();
      }
      this.setData(patch);
    });
  },

  /** 顶部轮播图片（含 1:1）加载后，按屏宽换算显示高度并可选更新当前 swiper 高度 */
  onHeroSlideImageLoad(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || idx < 0) return;
    const list = this.data.topMediaList || [];
    if (!list[idx] || list[idx].type !== 'image') return;
    const d = e.detail || {};
    const ww = this._windowWidthPx || (wx.getSystemInfoSync().windowWidth || 375);
    this._windowWidthPx = ww;
    const cw = this._heroContentWidthPx();
    let h = this._defaultHeroHeightPx();
    if (d.width > 0 && d.height > 0) {
      h = this._capHeroHeightPx(Math.round(cw * (d.height / d.width)));
    }
    const heights = { ...(this.data.heroSlideHeightsPx || {}) };
    const prev = heights[idx];
    if (prev == null || h > prev) heights[idx] = h;
    const cur = Number(this.data.heroCurrent) || 0;
    const patch = { heroSlideHeightsPx: heights };
    if (idx === cur) patch.heroSwiperHeightPx = this._capHeroHeightPx(heights[idx]);
    this.setData(patch);
  },

  onHeroDualFullLoad(e) {
    this.onHeroSlideImageLoad(e);
    this.onHeroHdLoad(e);
  },

  onHeroHdLoad(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || idx < 0) return;
    this.setData({ [`heroHdLoaded.${idx}`]: true });
  },

  _clearHeroAutoTimer() {
    if (this._heroAutoTimer) {
      clearTimeout(this._heroAutoTimer);
      this._heroAutoTimer = null;
    }
    if (this._heroPlayKickTimer) {
      clearTimeout(this._heroPlayKickTimer);
      this._heroPlayKickTimer = null;
    }
  },

  _goNextHeroSlide() {
    const list = this.data.topMediaList || [];
    if (!list.length) return;
    const next = (Number(this.data.heroCurrent) + 1) % list.length;
    const heights = this.data.heroSlideHeightsPx || {};
    const h = heights[next] != null ? heights[next] : this._defaultHeroHeightPx();
    this.setData({ heroCurrent: next, heroSwiperHeightPx: h });
    this._syncHeroAutoForCurrent();
  },

  _syncHeroAutoForCurrent() {
    this._clearHeroAutoTimer();
    const list = this.data.topMediaList || [];
    if (!this.data.heroAutoCarouselEnabled || !list.length) return;

    const current = Number(this.data.heroCurrent) || 0;
    const item = list[current];
    if (!item) return;

    if (item.type === 'image') {
      this._heroAutoTimer = setTimeout(() => {
        this._goNextHeroSlide();
      }, 3000);
      return;
    }

    if (item.type === 'video') {
      const expectIndex = current;
      this._heroPlayKickTimer = setTimeout(() => {
        this._heroPlayKickTimer = null;
        // 避免用户已快速滑走时仍触发旧视频播放
        if ((Number(this.data.heroCurrent) || 0) !== expectIndex) return;
        const videoContext = wx.createVideoContext(`hero-video-${current}`);
        if (videoContext) videoContext.play();
      }, 80);
    }
  },

  _getTopMediaListForSave(sourceList) {
    const list = Array.isArray(sourceList) ? sourceList : (this.data.topMediaList || []);
    return this._normalizeTopMediaList(list);
  },

  saveTopMediaToCloud(explicitList) {
    if (!this.db) {
      console.error('[shop.js] saveTopMediaToCloud: this.db 不存在！');
      return Promise.reject(new Error('数据库未初始化'));
    }
    const saveList = this._getTopMediaListForSave(explicitList);
    const autoCarouselEnabled = this.data.heroAutoCarouselEnabled === true;
    const payload = {
      topMediaList: saveList,
      autoCarouselEnabled,
      updateTime: this.db.serverDate()
    };
    this._topMediaSaving = true;
    const finishCache = () => {
      const cache = this.ensureShopDataCache();
      cache.topMediaList = saveList;
      cache.heroAutoCarouselEnabled = autoCarouselEnabled;
      cache.cacheTime = Date.now();
    };
    const isDocMissing = (err) => {
      const errMsg = (err && err.errMsg) || '';
      return (
        err.errCode === -502005 ||
        err.errCode === -502002 ||
        err.errCode === -502007 ||
        errMsg.includes('cannot find document') ||
        errMsg.includes('not exist')
      );
    };
    const applySaveResult = () => {
      finishCache();
      try {
        const app = getApp();
        if (app && app.globalData && app.globalData.shopDataCache) {
          app.globalData.shopDataCache.topMediaList = saveList;
          app.globalData.shopDataCache.heroAutoCarouselEnabled = autoCarouselEnabled;
          app.globalData.shopDataCache.cacheTime = Date.now();
        }
      } catch (e) {}
    };

    return wx.cloud.callFunction({
      name: 'setShopMainConfig',
      data: {
        topMediaList: saveList,
        autoCarouselEnabled
      }
    }).then((res) => {
      const result = res && res.result;
      if (!result || !result.success) {
        const errMsg = (result && result.error) || '云函数保存失败，请部署 setShopMainConfig';
        throw new Error(errMsg);
      }
      applySaveResult();
    }).catch((err) => {
      console.error('[shop.js] saveTopMediaToCloud 云函数失败，尝试客户端直写:', err);
      return this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).update({
        data: payload
      }).then(() => {
        applySaveResult();
      }).catch((dbErr) => {
        console.error('[shop.js] saveTopMediaToCloud 客户端更新失败:', dbErr);
        if (!isDocMissing(dbErr)) {
          if (dbPermissionHint.isPermissionDenied(dbErr)) {
            dbPermissionHint.toastPermissionDenied('shop_config');
          }
          throw dbErr;
        }
        return this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).set({
          data: {
            title: this.data.shopTitle || '选购',
            topMediaList: saveList,
            autoCarouselEnabled
          }
        }).then(() => {
          applySaveResult();
        });
      });
    }).finally(() => {
      this._topMediaSaving = false;
    });
  },

  // ========================================================
  // 保存产品系列到云端
  // ========================================================
  saveSeriesToCloud(series, isNew = false, saveOpts = {}) {
    if (!this.db) {
      console.error('[shop.js] saveSeriesToCloud: this.db 不存在！');
      return Promise.reject(new Error('数据库未初始化'));
    }

    const data = {
      ...this.stripOneSeriesEphemeral(series),
      updateTime: new Date()
    };
    delete data._id;
    delete data._openid;

    const detailImages = this.sanitizeDetailImagesForDb(data.detailImages);
    data.detailImages = detailImages;

    if (isNew || !series._id) {
      return this.db.collection('shop_series').add({ data }).then(res => {
        series._id = res._id;
        if (this.data.currentSeriesIdx >= 0) {
          this.setData({ [`seriesList[${this.data.currentSeriesIdx}]`]: series });
        }
        this.refreshShopDataCacheAfterSave();
        return res;
      }).catch(err => {
        if (dbPermissionHint.isPermissionDenied(err)) {
          dbPermissionHint.toastPermissionDenied('shop_series');
        }
        console.error('[shop.js] ❌ 添加产品系列失败:', err);
        throw err;
      });
    }

    const docId = series._id;
    const rest = { ...data };
    delete rest.detailImages;

    const updateDoc = (patch) =>
      this.db.collection('shop_series').doc(docId).update({ data: patch });

    const verifyOpts = {};
    if (Array.isArray(saveOpts.verifyAddedUrls) && saveOpts.verifyAddedUrls.length) {
      verifyOpts.requiredUrls = saveOpts.verifyAddedUrls;
    }

    const saveDetailImages = () =>
      this._saveDetailImagesViaCloud(docId, detailImages).then((savedImages) => {
        if (verifyOpts.requiredUrls && verifyOpts.requiredUrls.length) {
          if (!this._detailImagesDbContainsUrls(savedImages, verifyOpts.requiredUrls)) {
            throw new Error('详情图未写入数据库，请检查网络后重试');
          }
        } else if (!this._detailImagesDbMatch(detailImages, savedImages)) {
          throw new Error('详情图未写入数据库，请检查网络后重试');
        }
        return savedImages;
      });

    if (saveOpts.detailImagesOnly) {
      return saveDetailImages()
        .then(() => {
          this.refreshShopDataCacheAfterSave();
          return { success: true };
        })
        .catch(err => {
          if (dbPermissionHint.isPermissionDenied(err)) {
            dbPermissionHint.toastPermissionDenied('shop_series');
          }
          console.error('[shop.js] ❌ 保存详情图失败:', err);
          throw err;
        });
    }

    return saveDetailImages()
      .then(() => {
        const keys = Object.keys(rest);
        if (!keys.length) return null;
        return updateDoc(rest).catch((err) => {
          console.warn('[shop.js] detailImages 已写入，其余字段保存失败:', err);
          return null;
        });
      })
      .then(() => {
        this.refreshShopDataCacheAfterSave();
        return { success: true };
      })
      .catch(err => {
        if (dbPermissionHint.isPermissionDenied(err)) {
          dbPermissionHint.toastPermissionDenied('shop_series');
        }
        console.error('[shop.js] ❌ 保存产品系列失败:', err);
        throw err;
      });
  },

  // ========================================================
  // 保存配件到云端
  // ========================================================
  saveAccessoryToCloud(accessory, index, isNew = false) {
    if (!this.db) {
      console.error('[shop.js] saveAccessoryToCloud: this.db 不存在！');
      return;
    }
    const data = {
      ...this.stripOneAccessoryEphemeral(accessory),
      selected: false, // 重置选中状态
      updateTime: new Date()
    };
    // 【修复】移除 _id 和 _openid，因为它们是数据库自动管理的字段
    delete data._id;
    delete data._openid;
    if (isNew || !accessory._id) {
      this.db.collection('shop_accessories').add({ data }).then(res => {
        accessory._id = res._id;
        this.setData({ [`accessoryList[${index}]`]: accessory });
        // 🔴 刷新缓存
        this.refreshShopDataCacheAfterSave();
      }).catch(err => {
        if (dbPermissionHint.isPermissionDenied(err)) {
          dbPermissionHint.toastPermissionDenied('shop_accessories');
        }
        console.error('[shop.js] 添加配件失败:', err);
      });
    } else {
      this.db.collection('shop_accessories').doc(accessory._id).update({ data }).then(() => {
        // 🔴 刷新缓存
        this.refreshShopDataCacheAfterSave();
      }).catch(err => {
        if (dbPermissionHint.isPermissionDenied(err)) {
          dbPermissionHint.toastPermissionDenied('shop_accessories');
        }
        console.error('[shop.js] 更新配件失败:', err);
      });
    }
  },

  // ================== 1. 顶部轮播媒体 ==================
  _topMediaSlotsLeft() {
    return Math.max(0, 9 - (this.data.topMediaList || []).length);
  },

  async _uploadOneTopMediaFile(file) {
    const isVideo = file.fileType === 'video';
    if (isVideo) {
      const tempPath = file.tempFilePath || '';
      const rawSuffix = tempPath.match(/\.[^.]+?$/)?.[0] || '';
      const safeSuffix = rawSuffix ? rawSuffix.toLowerCase() : '';
      const supported = ['.mp4', '.mov', '.m4v'];
      if (safeSuffix && supported.indexOf(safeSuffix) === -1) {
        throw new Error('UNSUPPORTED_VIDEO');
      }
      const videoSuffix = safeSuffix || '.mp4';
      const knownSize = typeof file.size === 'number' ? file.size : undefined;
      const fileID = await this.uploadShopVideoToCos(tempPath, 'shop/topMedia', videoSuffix, { knownSize });
      return { type: 'video', url: fileID, poster: '', autoplay: false };
    }
    const tempPath = await shopImagePrepare.prepareImageFile(file.tempFilePath, 'topMedia');
    const knownSize = typeof file.size === 'number' ? file.size : undefined;
    const fileID = await this.uploadShopImageToCos(tempPath, 'shop/topMedia', { knownSize, skipPrepare: true });
    return { type: 'image', url: fileID };
  },

  adminAddTopMedia() {
    const remain = this._topMediaSlotsLeft();
    if (remain <= 0) {
      this.showAutoToast('提示', '顶部轮播最多 9 张');
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: async (res) => {
        const files = res.tempFiles || [];
        if (!files.length) return;
        this.showMyLoading(`上传中 0/${files.length}`);
        let done = 0;
        const mergedList = this._getTopMediaListForSave();
        try {
          for (let i = 0; i < files.length; i++) {
            const item = await this._uploadOneTopMediaFile(files[i]);
            mergedList.push(item);
            done += 1;
            this.showMyLoading(`上传中 ${done}/${files.length}`);
          }
        } catch (err) {
          this.hideMyLoading();
          if (err && err.message === 'UNSUPPORTED_VIDEO') {
            this.showAutoToast('提示', '请使用 MP4/MOV 格式视频');
          } else if (done > 0) {
            this.showAutoToast('提示', `部分上传成功（${done}/${files.length}），正在保存…`);
          } else {
            this.showAutoToast('提示', '上传失败');
            return;
          }
        }
        if (done <= 0) return;
        try {
          await this.setTopMediaListForRender(mergedList);
          await this.saveTopMediaToCloud(mergedList);
          this.hideMyLoading();
          this.setData({ heroVideoMountEnabled: true });
          this.showAutoToast('成功', done === files.length ? `已添加 ${done} 项` : `已添加 ${done}/${files.length} 项`);
          wx.nextTick(() => {
            this._syncHeroAutoForCurrent();
            if (this.data.hubEmbedInProducts && typeof this.layoutHubEmbedScroll === 'function') {
              this.layoutHubEmbedScroll();
            }
          });
        } catch (err) {
          this.hideMyLoading();
          console.error('[shop.js] adminAddTopMedia 保存失败:', err);
          const tip = String((err && err.message) || '').indexOf('setShopMainConfig') !== -1
            ? '已上传但保存失败：请部署云函数 setShopMainConfig 后重试'
            : '已上传但保存到云端失败，请重试或检查管理员权限';
          this.showAutoToast('提示', tip);
        }
      }
    });
  },

  adminAddImage() {
    this.adminAddTopMedia();
  },

  adminAddVideo() {
    this.adminAddTopMedia();
  },

  adminEnterMediaSort() {
    const list = this.data.topMediaList || [];
    if (!list.length) {
      this.showAutoToast('提示', '请先添加轮播内容');
      return;
    }
    const sortedTopMediaList = list.map((item, originalIndex) => ({
      ...item,
      originalIndex,
      renderUrl: item.renderUrl || item.url
    }));
    this.setData({ isEditingMedia: true, sortedTopMediaList });
  },

  adminCancelDrag() {
    this.setData({ isEditingMedia: false, sortedTopMediaList: [] });
  },

  adminConfirmDrag() {
    const sorted = this.data.sortedTopMediaList || [];
    const source = this.data.topMediaList || [];
    const reordered = sorted
      .map((row) => source[row.originalIndex])
      .filter(Boolean);
    const saveList = this._getTopMediaListForSave(reordered);
    this.setData({ isEditingMedia: false, sortedTopMediaList: [], heroCurrent: 0 });
    this.setTopMediaListForRender(saveList)
      .then(() => this.saveTopMediaToCloud(saveList))
      .catch((err) => {
        console.error('[shop.js] adminConfirmDrag 保存失败:', err);
        this.showAutoToast('提示', '排序保存失败，请重试');
      });
    wx.nextTick(() => this._syncHeroAutoForCurrent());
  },

  adminMoveTopMediaInSort(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const dir = e.currentTarget.dataset.dir;
    const list = [...(this.data.sortedTopMediaList || [])];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (Number.isNaN(idx) || target < 0 || target >= list.length) return;
    const next = [...list];
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    this.setData({ sortedTopMediaList: next });
  },
  adminDelTopMedia(e) {
    const index = e.currentTarget.dataset.index;
    const deletedItem = this.data.topMediaList[index];
    const oldFileID = deletedItem.url; // 🔴 保存要删除的图片/视频ID
    
    const saveList = this._getTopMediaListForSave();
    saveList.splice(index, 1);
    this.setTopMediaListForRender(saveList)
      .then(() => this.saveTopMediaToCloud(saveList))
      .then(() => this._deleteShopMediaFromCos(oldFileID))
      .catch((err) => {
        console.error('[shop.js] adminDelTopMedia 保存/删除失败:', err);
        this.showAutoToast('提示', '删除后保存失败，请重试');
      });
  },

  adminToggleTopVideoAutoplay(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || !this.data.topMediaList[index]) return;
    const item = this.data.topMediaList[index];
    if (item.type !== 'video') return;

    const nextList = this._getTopMediaListForSave();
    nextList[index] = {
      ...nextList[index],
      autoplay: !nextList[index].autoplay
    };
    this.setTopMediaListForRender(nextList)
      .then(() => this.saveTopMediaToCloud(nextList))
      .catch((err) => {
        console.error('[shop.js] adminToggleTopVideoAutoplay 保存失败:', err);
        this.showAutoToast('提示', '设置保存失败，请重试');
      });
    if (!nextList[index].autoplay) {
      const videoContext = wx.createVideoContext(`hero-video-${index}`);
      if (videoContext) videoContext.pause();
      const heroVideoPlaying = { ...this.data.heroVideoPlaying, [index]: false };
      this.setData({ heroVideoPlaying });
    }
    this.showAutoToast('提示', nextList[index].autoplay ? '已开启自动播放' : '已关闭自动播放');
  },

  adminToggleHeroAutoCarousel() {
    const next = !this.data.heroAutoCarouselEnabled;
    this.setData({ heroAutoCarouselEnabled: next }, () => {
      this.saveTopMediaToCloud().catch((err) => {
        console.error('[shop.js] adminToggleHeroAutoCarousel 保存失败:', err);
        this.showAutoToast('提示', '轮播设置保存失败，请重试');
      });
      if (next) {
        this._syncHeroAutoForCurrent();
      } else {
        this._clearHeroAutoTimer();
      }
      this.showAutoToast('提示', next ? '已开启自动切卡' : '已关闭自动切卡');
    });
  },


  // 🔴 新增：切换详情页视频置顶
  adminToggleDetailVideoPin(e) {
    const index = e.currentTarget.dataset.index;
    const currentSeries = this.data.currentSeries;
    if (currentSeries.detailImages && currentSeries.detailImages[index] && currentSeries.detailImages[index].type === 'video') {
      currentSeries.detailImages[index].isPinned = !currentSeries.detailImages[index].isPinned;
      // 重新排序：置顶项在前
      const sortedImages = [...currentSeries.detailImages].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      currentSeries.detailImages = sortedImages;
      // 更新数据
      this.setData({
        currentSeries: currentSeries,
        [`seriesList[${this.data.currentSeriesIdx}].detailImages`]: sortedImages
      });
      // 保存到云端
      this.saveSeriesToCloud(currentSeries);
    }
  },

  // 🔴 新增：切换详情页视频自动播放
  adminToggleDetailVideoAutoplay(e) {
    const index = e.currentTarget.dataset.index;
    const currentSeries = this.data.currentSeries;
    if (currentSeries.detailImages && currentSeries.detailImages[index] && currentSeries.detailImages[index].type === 'video') {
      currentSeries.detailImages[index].autoplay = !currentSeries.detailImages[index].autoplay;
      // 更新数据
      this.setData({
        currentSeries: currentSeries,
        [`seriesList[${this.data.currentSeriesIdx}].detailImages[${index}].autoplay`]: currentSeries.detailImages[index].autoplay
      });
      // 保存到云端
      this.saveSeriesToCloud(currentSeries);
    }
  },

  // 🔴 新增：详情页长按开始拖拽
  onDetailDragStart(e) {
    if (!this.data.isAdmin) return;
    
    // 🔴 修复：如果之前有未清理的定时器，先清理
    if (this.data.detailLongPressTimer) {
      clearTimeout(this.data.detailLongPressTimer);
      this.data.detailLongPressTimer = null;
    }
    
    // 🔴 修复：如果之前有未完成的拖拽，先重置状态
    if (this.data.isDetailDragging) {
      this.setData({
        isDetailDragging: false,
        detailDragIndex: -1,
        detailDragOffsetY: 0
      });
    }
    
    const index = parseInt(e.currentTarget.dataset.index);
    const startY = e.touches[0].clientY;
    
    this.setData({
      detailDragStartY: startY,
      detailDragCurrentY: startY,
      detailDragIndex: index,
      isDetailDragging: false,
      detailLastSwapIndex: -1 // 重置交换索引
    });
    
    // 设置长按定时器
    this.data.detailLongPressTimer = setTimeout(() => {
      wx.vibrateShort({ type: 'medium' });
      this.setData({
        isDetailDragging: true,
        detailLastVibrateTime: Date.now()
      });
    }, 300);
  },

  // 🔴 新增：详情页拖拽移动
  onDetailDragMove(e) {
    if (!this.data.isAdmin) return;
    
    // 如果还没开始拖拽，但移动距离超过阈值，取消长按定时器
    if (!this.data.isDetailDragging && this.data.detailLongPressTimer) {
      const moveY = Math.abs(e.touches[0].clientY - this.data.detailDragStartY);
      if (moveY > 10) {
        clearTimeout(this.data.detailLongPressTimer);
        this.data.detailLongPressTimer = null;
        // 🔴 修复：取消拖拽时也要重置状态
        this.setData({
          detailDragIndex: -1,
          detailDragStartY: 0,
          detailDragCurrentY: 0,
          detailDragOffsetY: 0
        });
      }
      return;
    }
    
    if (!this.data.isDetailDragging) return;
    
    // 🔴 修复：检查是否有有效的拖拽索引
    if (this.data.detailDragIndex === -1) {
      return;
    }
    
    e.preventDefault && e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.data.detailDragStartY;
    
    // 卡片跟随手指移动
    this.setData({
      detailDragCurrentY: currentY,
      detailDragOffsetY: deltaY
    });
    
    // 计算卡片高度（rpx转px）- 详情页图片高度约422rpx
    const winInfo = wx.getWindowInfo();
    const cardHeightPx = 422 * winInfo.windowWidth / 750;
    
    // 🔴 修复：使用更精确的计算方式，支持向上和向下拖动
    // 计算目标位置索引
    const moveIndex = Math.round(deltaY / cardHeightPx);
    const targetIndex = this.data.detailDragIndex + moveIndex;
    const list = this.data.currentSeries.detailImages;
    
    // 🔴 修复：检查列表是否有效
    if (!list || list.length === 0 || this.data.detailDragIndex < 0 || this.data.detailDragIndex >= list.length) {
      // 如果数据无效，重置拖拽状态
      this.setData({
        isDetailDragging: false,
        detailDragIndex: -1,
        detailDragOffsetY: 0
      });
      return;
    }
    
    // 交换位置 - 移除detailLastSwapIndex的限制，允许连续交换
    if (targetIndex >= 0 && 
        targetIndex < list.length && 
        targetIndex !== this.data.detailDragIndex) {
      
      const newList = [...list];
      const temp = newList[this.data.detailDragIndex];
      newList[this.data.detailDragIndex] = newList[targetIndex];
      newList[targetIndex] = temp;
      
      // 🔴 修复：计算剩余偏移量，确保连续拖动时位置正确
      const remainingOffset = deltaY - (moveIndex * cardHeightPx);
      
      // 🔴 修复：确保currentSeriesIdx有效，防止卡住
      if (this.data.currentSeriesIdx >= 0 && this.data.currentSeriesIdx < this.data.seriesList.length) {
        this.setData({
          'currentSeries.detailImages': newList,
          [`seriesList[${this.data.currentSeriesIdx}].detailImages`]: newList,
          detailDragIndex: targetIndex,
          detailDragStartY: currentY - remainingOffset,
          detailDragOffsetY: remainingOffset,
          detailLastSwapIndex: -1 // 🔴 修复：重置lastSwapIndex，允许连续交换
        });
      } else {
        // 如果索引无效，只更新currentSeries，防止卡住
        this.setData({
          'currentSeries.detailImages': newList,
          detailDragIndex: targetIndex,
          detailDragStartY: currentY - remainingOffset,
          detailDragOffsetY: remainingOffset,
          detailLastSwapIndex: -1
        });
      }
      
      // 震动反馈（节流）
      const now = Date.now();
      if (now - this.data.detailLastVibrateTime > 100) {
        wx.vibrateShort({ type: 'light' });
        this.setData({ detailLastVibrateTime: now });
      }
    }
  },

  // 🔴 新增：详情页拖拽结束
  onDetailDragEnd(e) {
    // 🔴 修复：无论是否在拖拽状态，都要清理定时器和重置状态，防止卡住
    if (this.data.detailLongPressTimer) {
      clearTimeout(this.data.detailLongPressTimer);
      this.data.detailLongPressTimer = null;
    }
    
    // 如果正在拖拽，保存到云端
    if (this.data.isDetailDragging) {
      const currentSeries = this.data.currentSeries;
      this.saveSeriesToCloud(currentSeries, false, { detailImagesOnly: true });
    }
    
    // 🔴 修复：无论是否在拖拽状态，都要重置所有状态，防止卡住
    this.setData({
      isDetailDragging: false,
      detailDragIndex: -1,
      detailDragStartY: 0,
      detailDragCurrentY: 0,
      detailDragOffsetY: 0,
      detailLastSwapIndex: -1
    });
  },


  // ================== 分类区块（Editorial 横向分页） ==================
  _normalizeShopTitle(title) {
    const t = (title || '').trim();
    if (!t || t === 'MT 配件中心') return '选购';
    return t;
  },

  _bindCategorySectionSync() {
    if (this._categorySyncBound) return;
    this._categorySyncBound = true;
    const origSetData = this.setData.bind(this);
    this.setData = (patch, callback) => {
      if (patch && typeof patch === 'object') {
        const hasSeries = Object.prototype.hasOwnProperty.call(patch, 'seriesList');
        const hasCategories = Object.prototype.hasOwnProperty.call(patch, 'mainCategories');
        const hasAcc = Object.prototype.hasOwnProperty.call(patch, 'accessoryList');
        const hasModes = Object.prototype.hasOwnProperty.call(patch, 'sectionRowModes');
        if (hasSeries || hasCategories || hasAcc || hasModes) {
          patch.categorySections = this._buildCategorySections(
            hasCategories ? patch.mainCategories : this.data.mainCategories,
            hasSeries ? patch.seriesList : this.data.seriesList,
            this.data.categorySections,
            undefined,
            hasAcc ? patch.accessoryList : this.data.accessoryList,
            hasModes ? patch.sectionRowModes : this.data.sectionRowModes
          );
        }
      }
      return origSetData(patch, callback);
    };
  },

  _buildCategorySections(
    mainCategories,
    seriesList,
    prevSections,
    isAdminOverride,
    accessoryList,
    sectionRowModes
  ) {
    const cats = Array.isArray(mainCategories) ? mainCategories : [];
    const list = Array.isArray(seriesList) ? seriesList : [];
    const accAll = Array.isArray(accessoryList) ? accessoryList : this.data.accessoryList || [];
    const modes = sectionRowModes && typeof sectionRowModes === 'object' ? sectionRowModes : this.data.sectionRowModes || {};
    const prev = Array.isArray(prevSections) ? prevSections : [];
    const isAdmin = typeof isAdminOverride === 'boolean' ? isAdminOverride : this.data.isAdmin;
    const prevByName = {};
    prev.forEach((p) => {
      if (p && p.name) prevByName[p.name] = p;
    });
    const defaultCat = '电动版本';
    return cats.map((name) => {
      const items = list
        .map((series, index) => ({
          series,
          index,
          sortOrder: series.sortOrder || 0,
          slideKey: String(series.id || series._id || ('idx-' + index))
        }))
        .filter(({ series }) => (series.mainCategory || defaultCat) === name)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const rowMode = modes[name] === 'accessory' ? 'accessory' : 'series';
      const accSlotBundle =
        rowMode === 'accessory'
          ? this._buildAccSlotsForCategory(name, accAll, list, defaultCat, isAdmin)
          : { accSlots: [], accSlotsAll: [], seriesSlotCount: 0 };
      const accSlots = accSlotBundle.accSlots;
      const accSlotsAll = accSlotBundle.accSlotsAll;
      const seriesSlotCount = accSlotBundle.seriesSlotCount;
      const accSlotMode = accSlotBundle.accSlotMode || 'grid';
      const activeLen = rowMode === 'accessory' ? accSlots.length : items.length;
      const prevSec = prevByName[name];
      const slideCount = activeLen + (isAdmin ? 1 : 0);
      const cur =
        rowMode === 'accessory'
          ? this._resolveAccSectionSwiperIndex(accSlots, slideCount, prevSec ? { ...prevSec, name } : { name })
          : Math.min(
              prevSec && typeof prevSec.current === 'number' ? prevSec.current : 0,
              Math.max(slideCount - 1, 0)
            );
      const dotIndices = [];
      for (let i = 0; i < slideCount; i++) dotIndices.push(i);
      return {
        name,
        rowMode,
        items,
        accSlots,
        accSlotsAll,
        seriesSlotCount,
        accSlotMode,
        slideCount,
        dotIndices,
        current: cur
      };
    });
  },

  _saveSectionRowModesToCloud(sectionRowModes) {
    if (!this.db) return Promise.reject(new Error('db missing'));
    const modes = sectionRowModes && typeof sectionRowModes === 'object' ? sectionRowModes : {};
    return this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).update({
      data: { sectionRowModes: modes, updateTime: this.db.serverDate() }
    }).catch(err => {
      const errMsg = (err && err.errMsg) || '';
      if (err.errCode === -502005 || err.errCode === -502002 || errMsg.includes('cannot find document')) {
        return this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).set({
          data: {
            mainCategories: this.data.mainCategories,
            title: this.data.shopTitle || '选购',
            sectionRowModes: modes,
            updateTime: this.db.serverDate()
          }
        });
      }
      throw err;
    });
  },

  toggleSectionRowMode(e) {
    if (!this.data.isAdmin) return;
    const catIndex = Number(e.currentTarget.dataset.catIndex);
    if (Number.isNaN(catIndex)) return;
    const section = this.data.categorySections && this.data.categorySections[catIndex];
    if (!section) return;
    const next = section.rowMode === 'accessory' ? 'series' : 'accessory';
    const modes = { ...(this.data.sectionRowModes || {}) };
    modes[section.name] = next;
    this.setData({ sectionRowModes: modes });
    this._syncCategorySections();
    const sections = this.data.categorySections || [];
    const sec = sections[catIndex];
    if (sec) {
      this.setData({
        [`categorySections[${catIndex}].current`]: 0
      });
    }
    if (!this.data.isAdmin) return;
    this._saveSectionRowModesToCloud(modes).catch(err => {
      console.error('[shop.js] 保存版本行模式失败', err);
    });
    wx.vibrateShort({ type: 'light' });
  },

  /** 分类横滑：仅在动画结束后更新 current，避免滑动过程中频繁 setData */
  onSectionSwiperAnimationFinish(e) {
    const catIndex = Number(e.currentTarget.dataset.catIndex);
    if (Number.isNaN(catIndex)) return;
    const current = e.detail.current;
    const section = this.data.categorySections && this.data.categorySections[catIndex];
    if (!section || section.current === current) return;
    this.setData({
      [`categorySections[${catIndex}].current`]: current
    });
  },

  onMainScroll(e) {
    const scrollTop = (e && e.detail && e.detail.scrollTop) || 0;
    const heroH = Number(this.data.heroSwiperHeightPx) || this._defaultHeroHeightPx();
    const adminExtra = this.data.isAdmin && !this.data.isEditingMedia ? 140 : 0;
    const inView = scrollTop < heroH + adminExtra;
    if (inView !== this.data.heroVideoMountEnabled) {
      if (!inView) {
        const cur = Number(this.data.heroCurrent) || 0;
        try {
          const ctx = wx.createVideoContext(`hero-video-${cur}`, this);
          if (ctx) ctx.pause();
        } catch (err) {}
        const heroVideoPlaying = { ...(this.data.heroVideoPlaying || {}) };
        heroVideoPlaying[cur] = false;
        this.setData({ heroVideoMountEnabled: false, heroVideoPlaying });
      } else {
        this.setData({ heroVideoMountEnabled: true });
      }
    }
    if (this._mainScrollPauseTimer) return;
    this._mainScrollPauseTimer = setTimeout(() => {
      this._mainScrollPauseTimer = null;
    }, 120);
    const cur = Number(this.data.heroCurrent) || 0;
    const list = this.data.topMediaList || [];
    list.forEach((item, i) => {
      if (i === cur || !item || item.type !== 'video') return;
      try {
        const ctx = wx.createVideoContext(`hero-video-${i}`, this);
        if (ctx) ctx.pause();
      } catch (err) {}
    });
  },

  _saveMainCategoriesToCloud(mainCategories) {
    if (!this.db) return Promise.reject(new Error('db missing'));
    const list = Array.isArray(mainCategories) ? mainCategories : [];
    return this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).update({
      data: { mainCategories: list, updateTime: this.db.serverDate() }
    }).catch(err => {
      const errMsg = (err && err.errMsg) || '';
      if (err.errCode === -502005 || err.errCode === -502002 || errMsg.includes('cannot find document')) {
        return this.db.collection('shop_config').doc(SHOP_MAIN_DOC_ID).set({
          data: {
            mainCategories: list,
            title: this.data.shopTitle || '选购',
            updateTime: this.db.serverDate()
          }
        });
      }
      throw err;
    });
  },

  adminAddCategory() {
    if (!this.data.isAdmin) return;
    this._input('新版本', (val) => {
      const name = (val || '').trim();
      if (!name) return;
      if (this.data.mainCategories.includes(name)) {
        this.showAutoToast('提示', '该版本名称已存在');
        return;
      }
      const newCategories = [...this.data.mainCategories, name];
      this.showMyLoading('保存中...');
      this._saveMainCategoriesToCloud(newCategories).then(() => {
        this.hideMyLoading();
        this.setData({ mainCategories: newCategories });
        this.showAutoToast('成功', '已添加版本');
      }).catch(err => {
        this.hideMyLoading();
        this.showAutoToast('提示', '保存失败');
        console.error(err);
      });
    }, '添加版本分类');
  },

  adminDeleteCategory(e) {
    if (!this.data.isAdmin) return;
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const name = this.data.mainCategories[index];
    if (!name) return;
    if (this.data.mainCategories.length <= 1) {
      this.showAutoToast('提示', '至少保留一个版本');
      return;
    }
    const fallback = this.data.mainCategories.filter((_, i) => i !== index)[0];
    this.showMyDialog({
      title: '删除版本',
      content: `确定删除「${name}」？该版本下产品将归入「${fallback}」`,
      showCancel: true,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        const newCategories = this.data.mainCategories.filter((_, i) => i !== index);
        const seriesList = this.data.seriesList.slice();
        const accessoryList = this.data.accessoryList.slice();
        const modes = { ...(this.data.sectionRowModes || {}) };
        delete modes[name];
        const updateTasks = [];
        let seriesChanged = false;
        let accChanged = false;
        seriesList.forEach((s, i) => {
          if ((s.mainCategory || '电动版本') === name) {
            seriesList[i] = { ...s, mainCategory: fallback };
            seriesChanged = true;
            if (s._id) {
              updateTasks.push(
                this.db.collection('shop_series').doc(s._id).update({
                  data: { mainCategory: fallback, updateTime: this.db.serverDate() }
                })
              );
            }
          }
        });
        accessoryList.forEach((a, i) => {
          const vs = { ...(a.versionSlots || {}) };
          if (!Object.prototype.hasOwnProperty.call(vs, name)) return;
          delete vs[name];
          accessoryList[i] = { ...a, versionSlots: vs };
          accChanged = true;
          if (a._id) {
            updateTasks.push(
              this.db.collection('shop_accessories').doc(a._id).update({
                data: { versionSlots: vs, updateTime: this.db.serverDate() }
              })
            );
          }
        });
        this.showMyLoading('删除中...');
        Promise.all([
          this._saveMainCategoriesToCloud(newCategories),
          this._saveSectionRowModesToCloud(modes),
          ...updateTasks
        ]).then(() => {
          this.hideMyLoading();
          const patch = {
            mainCategories: newCategories,
            sectionRowModes: modes
          };
          if (seriesChanged) patch.seriesList = seriesList;
          if (accChanged) patch.accessoryList = accessoryList;
          this.setData(patch);
          this.showAutoToast('成功', '已删除');
        }).catch(err => {
          this.hideMyLoading();
          this.showAutoToast('提示', '删除失败');
          console.error(err);
        });
      }
    });
  },

  adminEditCategory(e) {
    if (!this.data.isAdmin) return;
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const oldName = this.data.mainCategories[index];
    if (!oldName) return;

    this._input(oldName, (newName) => {
      const trimmed = (newName || '').trim();
      if (!trimmed || trimmed === oldName) return;

      this.showMyLoading('保存中...');
      const newCategories = [...this.data.mainCategories];
      newCategories[index] = trimmed;

      this._saveMainCategoriesToCloud(newCategories).then(async () => {
        const seriesList = this.data.seriesList.slice();
        const accessoryList = this.data.accessoryList.slice();
        const updateTasks = [];
        let seriesChanged = false;
        let accChanged = false;

        for (let i = 0; i < seriesList.length; i++) {
          const s = seriesList[i];
          if ((s.mainCategory || '电动版本') === oldName) {
            seriesList[i] = { ...s, mainCategory: trimmed };
            seriesChanged = true;
            if (s._id) {
              updateTasks.push(
                this.db.collection('shop_series').doc(s._id).update({
                  data: { mainCategory: trimmed, updateTime: this.db.serverDate() }
                })
              );
            }
          }
        }

        for (let i = 0; i < accessoryList.length; i++) {
          const a = accessoryList[i];
          const vs = { ...(a.versionSlots || {}) };
          if (!Object.prototype.hasOwnProperty.call(vs, oldName)) continue;
          vs[trimmed] = vs[oldName];
          delete vs[oldName];
          accessoryList[i] = { ...a, versionSlots: vs };
          accChanged = true;
          if (a._id) {
            updateTasks.push(
              this.db.collection('shop_accessories').doc(a._id).update({
                data: { versionSlots: vs, updateTime: this.db.serverDate() }
              })
            );
          }
        }

        const modes = { ...(this.data.sectionRowModes || {}) };
        if (Object.prototype.hasOwnProperty.call(modes, oldName)) {
          modes[trimmed] = modes[oldName];
          delete modes[oldName];
        }

        if (updateTasks.length > 0) {
          await Promise.all(updateTasks);
        }
        if (Object.prototype.hasOwnProperty.call(this.data.sectionRowModes || {}, oldName)) {
          await this._saveSectionRowModesToCloud(modes);
        }

        this.hideMyLoading();
        const patch = {
          mainCategories: newCategories,
          sectionRowModes: modes
        };
        if (seriesChanged) patch.seriesList = seriesList;
        if (accChanged) patch.accessoryList = accessoryList;
        this.setData(patch);
        this.showAutoToast('成功', '修改成功');
      }).catch(err => {
        this.hideMyLoading();
        this.showAutoToast('提示', '修改失败');
        console.error(err);
      });
    }, '编辑版本名称');
  },

  // ================== 2. 主页产品列表 CRUD ==================
  adminChangeMainCategory(e) {
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];
    const defaultCat = '电动版本';
    const oldCat = series.mainCategory || defaultCat;
    wx.showActionSheet({
      itemList: this.data.mainCategories,
      success: (res) => {
        const newCat = this.data.mainCategories[res.tapIndex];
        if (newCat === oldCat) return;

        this.showMyLoading('修改中...');
        const nextSort =
          this._countSeriesInCategory(
            this.data.seriesList.filter((_, i) => i !== idx),
            newCat
          ) + 1;
        this.db.collection('shop_series').doc(series._id).update({
          data: {
            mainCategory: newCat,
            sortOrder: nextSort,
            updateTime: this.db.serverDate()
          }
        }).then(() => {
          let list = this.data.seriesList.map((s, i) =>
            i === idx ? { ...s, mainCategory: newCat, sortOrder: nextSort } : { ...s }
          );
          list = this._ensureCategorySortOrders(list, this.data.mainCategories);
          const catsToSave = new Set([oldCat, newCat]);
          const saveTasks = list
            .filter(s => catsToSave.has(s.mainCategory || defaultCat))
            .map(s => this.saveSeriesToCloud(s));
          return Promise.all(saveTasks).then(() => list);
        }).then(list => {
          this.hideMyLoading();
          this.setData({ seriesList: list });
          this.showAutoToast('成功', '已切换到「' + newCat + '」');
        }).catch(err => {
          this.hideMyLoading();
          this.showAutoToast('提示', '修改失败');
          console.error(err);
        });
      }
    });
  },

  // ========================================================
  // [修改] 新建产品系列 (智能克隆模板)
  // ========================================================
  adminAddSeries(e) {
    const category = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.category) || '电动版本';
    // 1. 【新增】立刻显示 Loading，防止重复点击
    this.showMyLoading('创建中...');

    // 2. 尝试找一个现有的产品做模板（通常是第1个）
    const template = this.data.seriesList.length > 0 ? this.data.seriesList[0] : null;

    // 3. 准备初始化数据
    // 如果有模板，就复制它的 labels 和 specs 结构；如果没有，就用兜底默认值
    
    // 深度复制 labels (防止修改新的时候影响旧的)
    const initLabels = template 
      ? JSON.parse(JSON.stringify(template.labels)) 
      : { configTitle: '选购配置', modelTitle: '选择型号', optionTitle: '配置方案', accTitle: '配件加购' };
    
    // 深度复制 specs (只复制 label 名，把值重置为 '-')
    // 根据模板的型号数量动态生成列数
    const modelCount = template && template.models ? template.models.length : 3;
    const initSpecs = template && template.specs
      ? template.specs.map(item => {
          const newSpec = { label: item.label };
          // 动态生成 v1, v2, v3... 根据型号数量
          for (let i = 1; i <= modelCount; i++) {
            newSpec[`v${i}`] = '-';
          }
          return newSpec;
        })
      : [{ label: '续航', v1: '-', v2: '-', v3: '-' }];

    const nextSort = this._countSeriesInCategory(this.data.seriesList, category) + 1;

    // 4. 构建新对象
    const newOne = {
      id: Date.now().toString(), // 确保 ID 唯一
      name: '新产品名称 (点击修改)',
      desc: '请添加描述',
      cover: '', // 封面为空
      jumpNumber: null,
      sortOrder: nextSort,
      mainCategory: category,

      // 初始化必须的空数组，防止报错
      detailImages: [], 
      
      // 复制过来的表头
      specHeaders: template ? [...template.specHeaders] : ['标准版', '高配版', '顶配版'],
      
      // 【关键】应用复制来的结构
      labels: initLabels,
      specs: initSpecs,

      // 初始化默认型号 (必须有至少一个，否则支付会报错)
      models: [
        { name: '默认型号', price: 999, desc: '点击修改描述' }
      ],

      // 初始化默认配置 (必须有至少一个)
      options: [
        { name: '标准配置', price: 0, img: '' }
      ],
      
      // 默认不参与对比勾选
      selectedForCompare: false
    };

    // 5. 更新本地列表
    const newList = [...this.data.seriesList, newOne];
    this.setData({ seriesList: newList });

    // 6. 保存到云端 (isNew = true)
    this.saveSeriesToCloud(newOne, true).then(() => {
        // 【新增】创建完了再关掉 Loading
        this.hideMyLoading();
        this.showAutoToast('成功', '已新建');
    }).catch(() => {
        this.hideMyLoading();
    });
  },

  // ========================================================
  // [修改] 删除产品系列 (同步删除云端)
  // ========================================================
  adminDeleteSeries(e) {
    if (!this.data.isAdmin) return;
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];
    if (!series) return;

    this.showMyDialog({
      title: '删除产品系列',
      content: `确定删除「${series.name}」？此操作不可恢复。`,
      showCancel: true,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('删除中...');

          // 1. 如果有 _id，说明已经在云数据库里，需要删库
        if (this.db && series._id) {
            this.db.collection('shop_series').doc(series._id).remove()
              .then(() => {
              })
              .catch(err => {
                console.error('云端删除失败', err);
              });
          }

          const deletedCat = series.mainCategory || '电动版本';
          let newList = this.data.seriesList.filter((_, i) => i !== idx);
          newList = this._ensureCategorySortOrders(newList, this.data.mainCategories);

          const saveRenumber = newList
            .filter(s => (s.mainCategory || '电动版本') === deletedCat)
            .map(s => this.saveSeriesToCloud(s));

          Promise.all(saveRenumber)
            .then(() => {
              const patch = { seriesList: newList };
              if (this.data.currentSeriesIdx === idx) {
                patch.showDetail = false;
              }
              this.setData(patch);
              this.hideMyLoading();
              this.showAutoToast('提示', '已删除');
            })
            .catch(err => {
              console.error(err);
              this.setData({ seriesList: newList });
              this.hideMyLoading();
              this.showAutoToast('提示', '已删除（排序保存失败）');
            });
          return;
      }
      }
    });
  },
  adminUploadCover(e) {
    const idx = e.currentTarget.dataset.index;
    this.chooseShopImage('cover').then(async (path) => {
      this.showMyLoading('上传中...');
      try {
        const series = this.data.seriesList[idx];
        const oldFileID = series.cover; // 🔴 保存旧图片ID
        
        const fileID = await this.uploadShopImageToCos(path, 'shop/covers', { skipPrepare: true });

        const updatedSeries = {
          ...series,
          cover: fileID,
          coverPreview: this.buildLowQualityUrl(fileID),
          coverDisplay: ''
        };

        const hydratedOne = await this.hydrateSeriesCloudDisplayUrls([updatedSeries]);
        const merged = hydratedOne[0] || updatedSeries;
        this.setData({ [`seriesList[${idx}]`]: merged });
        if (this.data.currentSeriesIdx === idx) {
          this.setData({ currentSeries: merged });
        }

        const isNew = !series._id;
        const saveResult = await this.saveSeriesToCloud(merged, isNew);
        
        // 🔴 删除旧图片
        if (oldFileID && oldFileID.startsWith('cloud://')) {
          wx.cloud.deleteFile({
            fileList: [oldFileID],
            success: () => {
            },
            fail: (err) => {
              console.error('[shop.js] 删除旧产品封面失败:', err);
            }
          });
        }

        if (isNew && saveResult && saveResult._id) {
          updatedSeries._id = saveResult._id;
          this.setData({ 
            [`seriesList[${idx}]._id`]: saveResult._id,
            [`seriesList[${idx}]`]: updatedSeries
          });
        }

        this.showAutoToast('成功', '封面已上传（原图）');
      } catch (err) {
        console.error('[shop.js] adminUploadCover 上传失败:', err);
        this.showAutoToast('提示', '上传失败');
      } finally {
        this.hideMyLoading();
      }
    }).catch((err) => {
      console.error('[shop.js] adminUploadCover 选择或裁切失败:', err);
    });
  },
  adminEditSeriesName(e) {
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];
    this._input(series.name, (v) => {
      series.name = v;
      this.setData({ [`seriesList[${idx}].name`]: v });
      this.saveSeriesToCloud(series);
    });
  },
  
  // ========================================================
  // 编辑跳转号码（带唯一性校验）
  // ========================================================
  // 编辑第一级页面的价格（编辑整个价格显示文本）
  adminEditSeriesPrice(e) {
    // 🔴 检查管理员权限
    if (!this.data.isAdmin) {
      return;
    }
    
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];
    
    if (!series || !series.models || !series.models[0]) {
      console.error('[shop.js] adminEditSeriesPrice: 数据不存在');
      return;
    }
    
    // 获取当前显示的价格文本（如果有自定义显示，否则使用默认格式）
    const currentDisplay = series.priceDisplay || `¥${series.models[0].price} 起`;
    
    this._input(currentDisplay, (v) => {
      // 保存完整的显示文本
      const newDisplay = v.trim();
      
      // 尝试从文本中提取价格数字（用于更新第一个型号的价格）
      const priceMatch = newDisplay.match(/¥?\s*(\d+(?:\.\d+)?)/);
      if (priceMatch) {
        const extractedPrice = Number(priceMatch[1]);
        if (!isNaN(extractedPrice)) {
          // 更新第一个型号的价格
          series.models[0].price = extractedPrice;
        }
      }
      
      // 保存完整的显示文本
      series.priceDisplay = newDisplay;
      
      this.setData({ 
        [`seriesList[${idx}].priceDisplay`]: newDisplay,
        [`seriesList[${idx}].models[0].price`]: series.models[0].price
      });
      this.saveSeriesToCloud(series);
    });
  },

  adminEditSortOrder(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    const series = this.data.seriesList[idx];
    if (!series) return;
    const defaultCat = '电动版本';
    const cat = series.mainCategory || defaultCat;
    const cur = series.sortOrder || 1;
    const count = this._countSeriesInCategory(this.data.seriesList, cat);
    if (count <= 1) {
      this.showAutoToast('提示', '该版本下仅一个产品');
      return;
    }

    this._input(String(cur), (v) => {
      const n = parseInt(String(v || '').trim(), 10);
      if (!n || n < 1 || n > count) {
        this.showAutoToast('提示', '请输入 1-' + count + ' 的序号');
        return;
      }
      if (n === cur) return;
      this._applyCategorySortOrder(idx, n, cat);
    }, '排序序号（1-' + count + '）');
  },

  adminEditJumpNumber(e) {
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];
    const currentNumber = series.jumpNumber || '';
    
    this._input(currentNumber, (v) => {
      // 校验：必须是纯数字
      const numValue = v.trim();
      if (numValue && !/^\d+$/.test(numValue)) {
        this.showAutoToast('提示', '号码必须是纯数字');
        return;
      }
      
      // 校验：唯一性（如果输入了号码）
      if (numValue) {
        const duplicate = this.data.seriesList.find((item, i) => 
          i !== idx && item.jumpNumber && item.jumpNumber.toString() === numValue
        );
        if (duplicate) {
          this.showAutoToast('提示', '号码已存在，请使用其他号码');
          return;
        }
      }
      
      // 更新数据
      series.jumpNumber = numValue ? parseInt(numValue) : null;
      this.setData({ [`seriesList[${idx}].jumpNumber`]: series.jumpNumber });
      this.saveSeriesToCloud(series);
      this.showAutoToast('成功', '号码已更新');
    });
  },
  
  // ========================================================
  // 在详情页编辑产品名称
  // ========================================================
  adminEditSeriesNameInDetail() {
    const s = this.data.currentSeries;
    this._input(s.name, (v) => {
      s.name = v;
      this.setData({ 
        currentSeries: s,
        [`seriesList[${this.data.currentSeriesIdx}].name`]: v 
      });
      this.saveSeriesToCloud(s);
    });
  },

  // ================== 3. 产品选购页逻辑 ==================
  // ========================================================
  // 1. 打开详情页时：重置按钮为隐藏
  // ========================================================
  // ========================================================
  // 1. 打开详情页 (常驻显示底部)
  // ========================================================
  // ========================================================
  // 详情底栏：进入「选购配置」区块后显示（IO + 视口坐标 + scrollTop 三保险）
  // ========================================================
  _detailLastScrollTop: 0,
  _detailFooterMeasureTimer: null,
  _detailFooterScrollTicking: false,
  _detailFooterAnchorPx: 0,
  _detailScrollViewHeightPx: 0,
  _detailFooterIO: null,

  _hasDetailMediaImages() {
    const imgs = (this.data.currentSeries && this.data.currentSeries.detailImages) || [];
    return imgs.length > 0;
  },

  _applyDetailFooterVisible(should) {
    const cur = !!this.data.showFooterBar;
    if (!!should !== cur) this.setData({ showFooterBar: !!should });
  },

  _teardownDetailFooterIO() {
    if (this._detailFooterIO) {
      try {
        this._detailFooterIO.disconnect();
      } catch (e) {}
      this._detailFooterIO = null;
    }
  },

  _setupDetailFooterIO() {
    this._teardownDetailFooterIO();
    if (!this.data.showDetail || this.data.isModelCompareMode) return;
    if (!this._hasDetailMediaImages()) {
      this._applyDetailFooterVisible(true);
      return;
    }
    try {
      this._detailFooterIO = this.createIntersectionObserver({ thresholds: [0, 0.01, 0.1] });
      this._detailFooterIO
        .relativeTo('#detail-scroll-port', { bottom: 0 })
        .observe('#detail-footer-sentinel', (res) => {
          if (!this.data.showDetail || this.data.isModelCompareMode) return;
          if (res.intersectionRatio > 0) {
            this._applyDetailFooterVisible(true);
          } else if ((this._detailLastScrollTop || 0) < 80) {
            this._applyDetailFooterVisible(false);
          }
        });
    } catch (e) {
    }
  },

  _measureDetailFooterAnchor() {
    if (!this.data.showDetail) return;
    this.createSelectorQuery()
      .select('#detail-scroll-inner')
      .boundingClientRect()
      .select('#detail-footer-sentinel')
      .boundingClientRect()
      .select('#detail-scroll-port')
      .boundingClientRect()
      .exec((res) => {
        const inner = res && res[0];
        const sentinel = res && res[1];
        const port = res && res[2];
        if (!inner || !sentinel) return;
        const anchorPx = Math.max(
          0,
          Math.ceil(sentinel.top - inner.top + Math.max(sentinel.height || 0, 1))
        );
        const viewH = port && port.height ? Math.ceil(port.height) : 0;
        this._detailFooterAnchorPx = anchorPx;
        if (viewH > 0) this._detailScrollViewHeightPx = viewH;
        this.setData({
          detailConfigAnchorPx: anchorPx,
          detailScrollViewHeight: viewH || this.data.detailScrollViewHeight
        });
      });
  },

  _scheduleDetailFooterAnchorMeasure() {
    const run = () => {
      if (!this.data.showDetail) return;
      this._measureDetailFooterAnchor();
      this._setupDetailFooterIO();
      this._updateDetailFooterVisibility();
    };
    wx.nextTick(run);
    [100, 350, 800, 1500].forEach((delay) => setTimeout(run, delay));
  },

  /** 视口判定：「选购配置」标题行已进入滚动可视区 */
  _updateDetailFooterVisibility() {
    if (!this.data.showDetail || this.data.isModelCompareMode) return;

    if (!this._hasDetailMediaImages()) {
      this._applyDetailFooterVisible(true);
      return;
    }

    this.createSelectorQuery()
      .select('#detail-config-header')
      .boundingClientRect()
      .select('#detail-scroll-port')
      .boundingClientRect()
      .exec((res) => {
        const header = res && res[0];
        const port = res && res[1];
        const scrollTop = this._detailLastScrollTop || 0;

        if (!header || !port || !port.height) {
          const anchor = this._detailFooterAnchorPx;
          const viewH = this._detailScrollViewHeightPx || 600;
          if (anchor > 0) {
            this._applyDetailFooterVisible(scrollTop + viewH >= anchor - 32);
          } else {
            this._applyDetailFooterVisible(scrollTop > 120);
          }
          return;
        }

        const cur = !!this.data.showFooterBar;
        const headerInView = header.top < port.bottom - 6;
        const pastHeader = header.bottom <= port.top + 16;
        const should = cur
          ? headerInView || pastHeader
          : headerInView;

        this._applyDetailFooterVisible(should);
      });
  },

  onDetailMediaImageLoad() {
    if (this._detailFooterMeasureTimer) clearTimeout(this._detailFooterMeasureTimer);
    this._detailFooterMeasureTimer = setTimeout(() => {
      this._detailFooterMeasureTimer = null;
      if (!this.data.showDetail) return;
      this._measureDetailFooterAnchor();
      this._setupDetailFooterIO();
      this._updateDetailFooterVisibility();
    }, 80);
  },

  onDetailScroll(e) {
    const scrollTop = e.detail.scrollTop || 0;
    this._detailLastScrollTop = scrollTop;

    if (this.data.isModelCompareMode) {
      if (this.data.showFooterBar) this.setData({ showFooterBar: false });
      return;
    }

    if (!this._hasDetailMediaImages()) {
      this._applyDetailFooterVisible(true);
      return;
    }

    const anchor = this._detailFooterAnchorPx;
    const viewH = this._detailScrollViewHeightPx;
    if (anchor > 0 && viewH > 0) {
      this._applyDetailFooterVisible(scrollTop + viewH >= anchor - 28);
    }

    if (!this._detailFooterScrollTicking) {
      this._detailFooterScrollTicking = true;
      setTimeout(() => {
        this._detailFooterScrollTicking = false;
        this._updateDetailFooterVisibility();
      }, 48);
    }
  },

  handleProductClick(e) {
    const idx = e.currentTarget.dataset.index;
    
    // 如果是首页对比模式，处理勾选逻辑
    if (this.data.isCompareMode) {
      const list = this.data.seriesList;
      if (!list[idx].selectedForCompare) {
        list[idx].selectedForCompare = true;
      } else {
        list[idx].selectedForCompare = false;
      }
      
      // 获取所有选中的产品
      const comps = list.filter(i => i.selectedForCompare);
      
      // 限制最多选2个
      if (comps.length > 2) {
        // 如果超过2个，取消最后一个
        const lastIdx = list.findIndex(i => i.selectedForCompare && i.id === comps[comps.length - 1].id);
        if (lastIdx >= 0) {
          list[lastIdx].selectedForCompare = false;
        }
        this.showAutoToast('提示', '最多选择2个产品对比');
      }
      
      const finalComps = list.filter(i => i.selectedForCompare);
      this.setData({ seriesList: list, compareList: finalComps });
      return;
    }

    // 正常进入详情
    const s = this.data.seriesList[idx];
    // 点击进入详情前，优先预热当前产品封面和前两张详情图
    try {
      const warmList = [];
      if (s && (s.coverDisplay || s.cover)) warmList.push(s.coverDisplay || s.cover);
      if (s && Array.isArray(s.detailImages)) {
        s.detailImages
          .filter(m => m && m.type === 'image' && m.url)
          .slice(0, 6)
          .forEach(m => warmList.push(m.urlDisplay || m.url));
      }
      warmList.forEach((url, i) => {
        if (!url) return;
        if (this._shopWarmImageSet && this._shopWarmImageSet.has(url)) return;
        setTimeout(() => {
          wx.getImageInfo({
            src: url,
            success: () => {
              if (this._shopWarmImageSet) this._shopWarmImageSet.add(url);
            },
            fail: () => {}
          });
        }, i * 60);
      });
    } catch (e2) {}
    
    // 🔴 对详情图片进行排序：置顶项在前
    if (s.detailImages && s.detailImages.length > 0) {
      s.detailImages = [...s.detailImages].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
    }
    
    const openDetailModal = () => {
      const seriesAccessoryList = this._buildSeriesAccessoryList(s);
      this.setData({
        currentSeriesIdx: idx,
        currentSeries: s,
        selectedModelIdx: -1,
        selectedOptionIdx: -1,
        seriesAccessoryList,
        showDetail: true,
        showFooterBar: false
      }, () => {
        this._detailLastScrollTop = 0;
        this._scheduleDetailFooterAnchorMeasure();
      });
    };

    // 先秒开详情，避免点击后“卡住感”
    openDetailModal();
    // 首图异步预热（不阻塞交互）
    const firstVisual = (s.detailImages || []).find(m => m && m.type === 'image' && m.url);
    const firstVisualUrl = (firstVisual && (firstVisual.urlDisplay || firstVisual.url)) || s.coverDisplay || s.cover || '';
    if (firstVisualUrl && !(this._shopWarmImageSet && this._shopWarmImageSet.has(firstVisualUrl))) {
      wx.getImageInfo({
        src: firstVisualUrl,
        success: () => {
          if (this._shopWarmImageSet) this._shopWarmImageSet.add(firstVisualUrl);
        },
        fail: () => {}
      });
    }
    
    this.calcTotal();
  },
  _resetModelCompareState() {
    const series = this.data.currentSeries;
    if (!series || !series.models) return null;
    const clearedModels = series.models.map((m) => ({ ...m, isCompareChecked: false }));
    return { ...series, models: clearedModels };
  },

  closeDetail() { 
    if (this.data.detailLongPressTimer) {
      clearTimeout(this.data.detailLongPressTimer);
      this.data.detailLongPressTimer = null;
    }
    
    this._teardownDetailFooterIO();
    this._clearCompareGuideTimers();
    this._detailFooterAnchorPx = 0;
    this._detailScrollViewHeightPx = 0;

    const clearedSeries = this._resetModelCompareState();
    const patch = {
      showDetail: false,
      seriesAccessoryList: [],
      showFooterBar: false,
      isModelCompareMode: false,
      compareSelectedModels: [],
      compareGuidePhase: 0,
      compareGuidePhase2HintVisible: false,
      detailConfigAnchorPx: 0,
      detailScrollViewHeight: 0,
      isDetailDragging: false,
      detailDragIndex: -1,
      detailDragStartY: 0,
      detailDragCurrentY: 0,
      detailDragOffsetY: 0,
      detailLastSwapIndex: -1
    };
    if (clearedSeries) {
      patch.currentSeries = clearedSeries;
      patch[`seriesList[${this.data.currentSeriesIdx}].models`] = clearedSeries.models;
    }
    this.setData(patch); 
  },

  /** 详情视频：根据文件宽高计算占位高度比例（宽 100% 时 padding-bottom = 高/宽 * 100），与 1:1、竖屏一致 */
  _getDetailVideoAspectPaddingPercent(tempPath) {
    return new Promise((resolve) => {
      if (!tempPath) {
        resolve(56.25);
        return;
      }
      wx.getVideoInfo({
        src: tempPath,
        success: (info) => {
          let w = Number(info.width) || 1;
          let h = Number(info.height) || 1;
          const ori = Number(info.orientation) || 0;
          if (ori === 90 || ori === -90 || ori === 270) {
            const t = w;
            w = h;
            h = t;
          }
          let pct = (h / w) * 100;
          if (!Number.isFinite(pct) || pct <= 0) pct = 56.25;
          pct = Math.min(280, Math.max(36, pct));
          resolve(Math.round(pct * 100) / 100);
        },
        fail: () => resolve(56.25)
      });
    });
  },

  _detailUploadFailToast(err, done) {
    const msg = this._shopErrText(err);
    if (msg.indexOf('详情图未写入') !== -1 || msg.indexOf('数据库') !== -1) {
      this.showAutoToast('提示', '图片已上传但保存失败，请重试');
      return;
    }
    if (done > 0) {
      this.showAutoToast('提示', `部分成功，已添加 ${done} 项`);
      return;
    }
    if (msg.indexOf('合法域名') !== -1 || msg.indexOf('domain list') !== -1) {
      this.showAutoToast('提示', 'COS 域名未配置，请联系管理员');
      return;
    }
    if (msg.indexOf('getCosUploadUrl') !== -1 || msg.indexOf('云函数') !== -1) {
      this.showAutoToast('提示', '上传服务未就绪，请部署云函数后重试');
      return;
    }
    if (msg.indexOf('无法读取文件大小') !== -1 || msg.indexOf('读取本地文件') !== -1) {
      this.showAutoToast('提示', '读取图片失败，请换一张或重选');
      return;
    }
    this.showAutoToast('提示', msg ? `上传失败：${msg.slice(0, 48)}` : '上传失败');
  },

  // 修改 2：详情页添加媒体（支持视频+图片）
  adminAddDetailMedia() {
    const cur = (this.data.currentSeries && this.data.currentSeries.detailImages) || [];
    const remain = Math.max(1, 9 - cur.length);
    wx.chooseMedia({
      count: remain,
      mediaType: ['image', 'video'], // 允许选视频
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const files = res.tempFiles || [];
        if (!files.length) return;
        this.showMyLoading(`上传中 0/${files.length}`);
        let done = 0;
        try {
          const idx = this.data.currentSeriesIdx;
          const s = (idx >= 0 && this.data.seriesList[idx]) || this.data.currentSeries;
          if (!s || !s._id) {
            throw new Error('商品数据未加载完成，请返回后重试');
          }
          if (!s.detailImages) s.detailImages = [];
          const added = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const knownSize = file && typeof file.size === 'number' ? file.size : undefined;
            const tempPath = file.fileType === 'image'
              ? await shopImagePrepare.prepareImageFile(file.tempFilePath, 'detail')
              : file.tempFilePath;
            const videoSuffix = file.fileType === 'video'
              ? ((file.tempFilePath && file.tempFilePath.match(/\.[^.]+?$/)?.[0]) || '.mp4')
              : '';
            let aspectPaddingPercent = 56.25;
            if (file.fileType === 'video') {
              aspectPaddingPercent = await this._getDetailVideoAspectPaddingPercent(tempPath);
            }
            let fileID;
            if (file.fileType === 'image') {
              fileID = await this.uploadShopImageToCos(tempPath, 'shop/detailMedia', { knownSize, skipPrepare: true });
            } else {
              fileID = await this.uploadShopVideoToCos(tempPath, 'shop/detailMedia', videoSuffix, { knownSize });
            }
            added.push({
              type: file.fileType,
              url: fileID,
              autoplay: false,
              isPinned: false,
              ...(file.fileType === 'video' ? { aspectPaddingPercent } : {})
            });
            done += 1;
            this.showMyLoading(`上传中 ${done}/${files.length}`);
          }
          const updatedDetailImages = [...s.detailImages, ...added];
          const updatedSeries = { ...s, detailImages: updatedDetailImages };
      await this.saveSeriesToCloud(updatedSeries, false, {
        detailImagesOnly: true,
        verifyAddedUrls: added.map(item => item.url)
      });
          const hydratedList = await this.hydrateSeriesCloudDisplayUrls([updatedSeries]);
          const merged = hydratedList[0] || updatedSeries;
          this.setData({
            currentSeries: merged,
            [`seriesList[${this.data.currentSeriesIdx}]`]: merged,
            [`seriesList[${this.data.currentSeriesIdx}].detailImages`]: merged.detailImages
          });
          if (this.data.isAdmin) {
            this.setData({ showFooterBar: true });
          } else {
            wx.nextTick(() => this._scheduleDetailFooterAnchorMeasure());
          }
          this.hideMyLoading();
          this.showAutoToast('成功', `已添加 ${done} 项`);
        } catch (err) {
          console.error('[shop.js] adminAddDetailMedia 上传失败:', err);
          this.hideMyLoading();
          this._detailUploadFailToast(err, done);
        } finally {
          if (this.data.detailLongPressTimer) {
            clearTimeout(this.data.detailLongPressTimer);
            this.data.detailLongPressTimer = null;
          }
          this.setData({
            isDetailDragging: false,
            detailDragIndex: -1,
            detailDragStartY: 0,
            detailDragCurrentY: 0,
            detailDragOffsetY: 0,
            detailLastSwapIndex: -1
          });
        }
      },
      fail: (err) => {
        console.error('[shop.js] adminAddDetailMedia 选择文件失败:', err);
        this.showAutoToast('提示', '选择文件失败');
        if (this.data.detailLongPressTimer) {
          clearTimeout(this.data.detailLongPressTimer);
          this.data.detailLongPressTimer = null;
        }
        this.setData({
          isDetailDragging: false,
          detailDragIndex: -1,
          detailDragStartY: 0,
          detailDragCurrentY: 0,
          detailDragOffsetY: 0,
          detailLastSwapIndex: -1
        });
      }
    });
  },
  async adminDelDetailImg(e) {
    const idx = e.currentTarget.dataset.index;
    const s = this.data.currentSeries;

    if (!s.detailImages || idx >= s.detailImages.length) {
      this.showAutoToast('提示', '删除失败');
      return;
    }

    const deletedItem = s.detailImages[idx];
    const oldFileID = deletedItem.url;
    const updatedDetailImages = s.detailImages.filter((item, i) => i !== idx);
    const updatedSeries = { ...s, detailImages: updatedDetailImages };

    this.showMyLoading('删除中...');
    this.setData({
      currentSeries: updatedSeries,
      [`seriesList[${this.data.currentSeriesIdx}]`]: updatedSeries,
      [`seriesList[${this.data.currentSeriesIdx}].detailImages`]: updatedDetailImages
    });

    try {
      await this.saveSeriesToCloud(updatedSeries, false, { detailImagesOnly: true });
      try {
        await this._deleteShopMediaFromCos(oldFileID);
      } catch (cosErr) {
        console.error('[shop.js] 详情图 COS 删除失败:', cosErr);
        this.hideMyLoading();
        this.showAutoToast('提示', '已从商品移除，但存储桶文件未删，请稍后重试');
        return;
      }
      this.hideMyLoading();
      this.showAutoToast('成功', '已删除');
    } catch (err) {
      console.error('[shop.js] 删除详情图保存失败:', err);
      this.hideMyLoading();
      this.setData({
        currentSeries: s,
        [`seriesList[${this.data.currentSeriesIdx}]`]: s,
        [`seriesList[${this.data.currentSeriesIdx}].detailImages`]: s.detailImages
      });
      this.showAutoToast('提示', '删除未保存，请重试');
      return;
    }
  },

  // --- 型号 (Models) ---
  adminAddModel() {
    const s = this.data.currentSeries;
    // 原来是 desc: ''，现在改成 desc: '点击修改描述'
    s.models.push({
      name:'新型号',
      price:0,
      desc:'标准版',                 // 版本文案
      modelVersion:'标准版',         // 兼容字段（老逻辑/新逻辑都能读）
      sceneDesc:'适用于日常通勤、城市骑行场景',
      cardIntro:'适用于日常通勤、城市骑行场景',
      intro:'适用于日常通勤、城市骑行场景'
    });
    this.setData({ 
      currentSeries: s, 
      [`seriesList[${this.data.currentSeriesIdx}]`]: s 
    });
    this.saveSeriesToCloud(s);
  },
  adminDelModel(e) {
     const s = this.data.currentSeries;
     if(s.models.length>1) { 
       s.models.splice(e.currentTarget.dataset.midx,1); 
       this.setData({currentSeries:s, selectedModelIdx:0, [`seriesList[${this.data.currentSeriesIdx}]`]: s});
       this.calcTotal();
       this.saveSeriesToCloud(s);
     }
  },
  adminEditModelName(e) {
      const idx = e.currentTarget.dataset.midx;
      const s = this.data.currentSeries;
      this._input(s.models[idx].name, (v)=>{
          s.models[idx].name = v;
          
          // 【修复】同步更新 specHeaders（参数对比表头）
          if (s.specHeaders && s.specHeaders[idx] !== undefined) {
            s.specHeaders[idx] = v;
          } else if (!s.specHeaders) {
            // 如果 specHeaders 不存在，初始化它
            s.specHeaders = s.models.map(m => m.name);
          }
          
          this.setData({ 
            [`seriesList[${this.data.currentSeriesIdx}].models[${idx}].name`]: v, 
            [`currentSeries.models[${idx}].name`]: v,
            [`seriesList[${this.data.currentSeriesIdx}].specHeaders`]: s.specHeaders,
            [`currentSeries.specHeaders`]: s.specHeaders
          });
          this.saveSeriesToCloud(s);
      });
  },

  // 2. 新增：编辑型号描述的函数 (直接复制到 adminEditModelName 下面)
  adminEditModelDesc(e) {
    const idx = e.currentTarget.dataset.midx;
    const s = this.data.currentSeries;
    const oldVal = s.models[idx].desc || '';

    this._input(oldVal, (val) => {
      s.models[idx].desc = val;
      s.models[idx].modelVersion = val; // 兼容保存
      this.setData({ 
        currentSeries: s, 
        [`seriesList[${this.data.currentSeriesIdx}]`]: s 
      });
      this.saveSeriesToCloud(s);
    });
  },
  adminEditModelScene(e) {
    const idx = e.currentTarget.dataset.midx;
    const s = this.data.currentSeries;
    const oldVal = s.models[idx].sceneDesc || s.models[idx].cardIntro || s.models[idx].intro || '';

    this._input(oldVal, (val) => {
      s.models[idx].sceneDesc = val;
      s.models[idx].cardIntro = val; // 兼容保存
      s.models[idx].intro = val;     // 兼容保存
      this.setData({
        currentSeries: s,
        [`seriesList[${this.data.currentSeriesIdx}]`]: s
      });
      this.saveSeriesToCloud(s);
    });
  },
  adminEditModelPrice(e) {
      // 🔴 检查管理员权限
      if (!this.data.isAdmin) {
        return;
      }
      
      const idx = e.currentTarget.dataset.midx;
      const s = this.data.currentSeries;
      
      if (!s || !s.models || !s.models[idx]) {
        console.error('[shop.js] adminEditModelPrice: 数据不存在');
        return;
      }
      this._input(s.models[idx].price+'', (v)=>{
          const newPrice = Number(v);
          if (isNaN(newPrice)) {
            this.showAutoToast('提示', '请输入有效数字');
            return;
          }
          
          s.models[idx].price = newPrice;
          this.setData({ 
            [`seriesList[${this.data.currentSeriesIdx}].models[${idx}].price`]: newPrice, 
            [`currentSeries.models[${idx}].price`]: newPrice 
          });
          this.calcTotal();
          this.saveSeriesToCloud(s);
      });
  },

  // ========================================================
  // 3. 选择配置：触发底部栏显示
  // ========================================================
  selectOption(e) {
    const idx = e.currentTarget.dataset.index;
    const newIdx = (this.data.selectedOptionIdx === idx) ? -1 : idx;
    
    this.setData({ 
      selectedOptionIdx: newIdx
    });
    this.calcTotal();
  },
  adminAddOption() {
      const s = this.data.currentSeries;
      s.options.push({name:'新配置', price:0, img:''});
      this.setData({ currentSeries: s, [`seriesList[${this.data.currentSeriesIdx}]`]: s });
      this.saveSeriesToCloud(s);
  },
  adminDelOption(e) {
      const idx = e.currentTarget.dataset.oidx;
      const s = this.data.currentSeries;

      if (!s.options || s.options.length === 0) {
        return;
      }

      // 直接删除当前索引的配置项，允许删到 0 个
      s.options.splice(idx, 1);

      // 重新计算选中索引：
      // - 如果还有配置项，尽量保持在相同位置
      // - 如果删到 0 个，则设置为 -1（未选择）
      let newSelectedIdx = this.data.selectedOptionIdx;
      if (s.options.length === 0) {
        newSelectedIdx = -1;
      } else {
        if (newSelectedIdx >= s.options.length) {
          newSelectedIdx = s.options.length - 1;
        }
      }

      this.setData({
        currentSeries: s,
        selectedOptionIdx: newSelectedIdx,
        [`seriesList[${this.data.currentSeriesIdx}]`]: s
      });

      this.calcTotal();
      this.saveSeriesToCloud(s);
  },
  adminUploadOptionImg(e) {
      const idx = e.currentTarget.dataset.oidx;
    this.chooseShopImage('option').then(async (path)=>{
      this.showMyLoading('上传中...');
      try {
          const s = this.data.currentSeries;
          
          // 【修复】确保 options 数组和对应项存在
          if (!s.options || !s.options[idx]) {
            this.showAutoToast('提示', '数据错误');
            this.hideMyLoading();
            return;
          }
        
        const oldFileID = s.options[idx].img; // 🔴 保存旧图片ID
        
        const fileID = await this.uploadShopImageToCos(path, 'shop/options', { skipPrepare: true });
          
          // 【修复】使用深拷贝更新
          const updatedOptions = s.options.map((opt, i) => {
            if (i === idx) {
              return { ...opt, img: fileID };
            }
            return opt;
          });
          const updatedSeries = { ...s, options: updatedOptions };
          const hydratedList = await this.hydrateSeriesCloudDisplayUrls([updatedSeries]);
          const merged = hydratedList[0] || updatedSeries;
          this.setData({ 
            currentSeries: merged,
            [`seriesList[${this.data.currentSeriesIdx}]`]: merged
          });
          this.saveSeriesToCloud(merged);
        
        // 🔴 删除旧图片
        if (oldFileID && oldFileID.startsWith('cloud://')) {
          wx.cloud.deleteFile({
            fileList: [oldFileID],
            success: () => {
            },
            fail: (err) => {
              console.error('[shop.js] 删除旧配置方案图片失败:', err);
            }
          });
        }
          
          this.hideMyLoading();
          this.showAutoToast('成功', '上传成功');
        } catch (err) {
          console.error('[shop.js] adminUploadOptionImg 上传失败:', err);
          this.hideMyLoading();
          this.showAutoToast('提示', '上传失败');
        }
      }).catch((err) => {
        console.error('[shop.js] adminUploadOptionImg 选择文件失败:', err);
        this.showAutoToast('提示', '选择文件失败');
      });
  },
  adminEditOptName(e) {
      const idx = e.currentTarget.dataset.oidx;
      const s = this.data.currentSeries;
      this._input(s.options[idx].name, (v)=>{
          s.options[idx].name = v;
          this.setData({ [`seriesList[${this.data.currentSeriesIdx}].options[${idx}].name`]: v, [`currentSeries.options[${idx}].name`]: v });
          this.saveSeriesToCloud(s);
      });
  },
  adminEditOptPrice(e) {
      if (!this.data.isAdmin) return;
      const idx = e.currentTarget.dataset.oidx;
      const s = this.data.currentSeries;
      this._input(s.options[idx].price+'', (v)=>{
          s.options[idx].price = Number(v);
          this.setData({ [`seriesList[${this.data.currentSeriesIdx}].options[${idx}].price`]: Number(v), [`currentSeries.options[${idx}].price`]: Number(v) });
          this.calcTotal();
          this.saveSeriesToCloud(s);
      });
  },

  // ========================================================
  // 2. 打开对比表格 (数据组装)
  // ========================================================
  openSpecsModal() {
    // 只有在用户点击"查看对比"或者管理员点击配置时触发
    
    const s = this.data.currentSeries;
    let headers = []; // 表头 (型号名)
    let rows = [];    // 数据行

    // --- A. 管理员模式：显示所有列 (方便编辑) ---
    if (this.data.isAdmin) {
      // 如果 specHeaders 还没数据，用 models 的名字填充
      if (!s.specHeaders || s.specHeaders.length !== s.models.length) {
        s.specHeaders = s.models.map(m => m.name);
        // 同步更新到 seriesList
        this.setData({ 
          currentSeries: s,
          [`seriesList[${this.data.currentSeriesIdx}].specHeaders`]: s.specHeaders
        });
      }
      headers = s.specHeaders;

      // 组装所有数据：动态获取所有列的值
      const modelCount = s.models ? s.models.length : 0;
      rows = (s.specs || []).map((spec, i) => {
        const vals = [];
        for (let j = 1; j <= modelCount; j++) {
          vals.push(spec[`v${j}`] || '-');
        }
        return {
          label: spec.label,
          rowIdx: i, // 记录原始行号，方便编辑
          vals: vals
        };
      });
    } 
    
    // --- B. 用户模式：只显示选中的列 ---
    else {
      // 1. 找到所有被勾选的索引 (0, 1, 2...)
      const selectedIndices = [];
      s.models.forEach((m, i) => {
        if (m.isCompareChecked) selectedIndices.push(i);
      });

      if (selectedIndices.length < 2) {
        this.showAutoToast('提示', '请至少选2个');
        return;
      }

      // 2. 组装表头 (只取选中的)
      // 优先用 specHeaders 里的自定义名字，没有就用 model.name
      const sourceHeaders = s.specHeaders || s.models.map(m => m.name);
      headers = selectedIndices.map(idx => sourceHeaders[idx]);

      // 3. 组装内容行 (只取选中的列)
      rows = (s.specs || []).map(spec => {
        // 动态获取所有列的值（不限制为3列）
        const modelCount = s.models ? s.models.length : 0;
        const allVals = [];
        for (let i = 1; i <= modelCount; i++) {
          allVals.push(spec[`v${i}`] || '-');
        }
        
        // 过滤出选中的值
        const filteredVals = selectedIndices.map(idx => allVals[idx] || '-');
        
        return {
          label: spec.label,
          vals: filteredVals
        };
      });
    }

    this.setData({
      showSpecsModal: true,
      compareData: { headers, rows }
    });
  },
  closeSpecsModal() { 
    this.setData({ showSpecsModal: false }); 
  },
  
  // 阻止事件冒泡（防止点击弹窗内容时关闭弹窗）
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },
  
  // ========================================================
  // [新增] 底部全局对比视频逻辑 (请复制这段代码到 shop.js)
  // ========================================================

  // ========================================================
  // [修改] 视频播放逻辑 (改为自定义弹窗)
  // ========================================================
  
  // 1. 点击播放 (打开弹窗)
  watchCompareVideo() {
    const s = this.data.currentSeries;
    
    if (!s.compareVideo) {
      if (this.data.isAdmin) {
        this.showAutoToast('提示', '请先上传视频');
      } else {
        this.showAutoToast('提示', '暂无演示视频');
      }
      return;
    }

    // 不再调用 wx.previewMedia，而是打开我们自己的弹窗
    this.setData({
      showVideoPlayer: true,
      currentVideoUrl: s.compareVideoDisplay || s.compareVideo
    });
  },

  // 2. [新增] 关闭视频弹窗
  closeVideoPlayer() {
    // 停止视频播放
    const videoContext = wx.createVideoContext('fullscreen-video');
    if (videoContext) {
      videoContext.pause();
    }
    
    this.setData({
      showVideoPlayer: false,
      currentVideoUrl: '', // 清空地址停止播放
      isVideoPlaying: true // 重置播放状态
    });
  },

  // 3. [新增] 播放视频（打开全屏播放器）
  playVideo(e) {
    const url = e.currentTarget.dataset.url || '';
    if (!url) {
      return;
    }
    // 🔴 修复：初始状态设为 false，等待视频真正开始播放后再设为 true
    this.setData({
      showVideoPlayer: true,
      currentVideoUrl: url,
      isVideoPlaying: false // 初始状态为 false，等待视频开始播放
    });

    // 等待DOM更新后播放视频
    setTimeout(() => {
      const videoContext = wx.createVideoContext('fullscreen-video');
      if (videoContext) {
        videoContext.play();
        // 🔴 额外保险：延迟设置状态为 true（如果事件没触发）
        // 使用多个延迟点，确保状态能正确更新
        setTimeout(() => {
          if (!this.data.isVideoPlaying) {
            this.setData({
              isVideoPlaying: true
            });
          }
        }, 300);
        setTimeout(() => {
          if (!this.data.isVideoPlaying) {
            this.setData({
              isVideoPlaying: true
            });
          }
        }, 800);
      }
    }, 100);
  },

  // 🔴 新增：视频可以播放时（确保状态同步）
  onVideoCanPlay() {
    // 如果视频设置了 autoplay，此时应该已经开始播放了
    // 延迟一下，确保视频已经开始播放
    setTimeout(() => {
      this.setData({
        isVideoPlaying: true
      });
    }, 200);
  },

  // 🔴 新增：免责协议勾选状态变化
  onDisclaimerChange(e) {
    // checkbox 的 value 是数组，包含所有被选中的 value
    const checked = Array.isArray(e.detail.value) && e.detail.value.includes('agree');
    this.setData({
      agreedToDisclaimer: checked
    }, () => {
      // 设置完成后再次确认状态
    });
  },

  // 🔴 新增：点击文字区域也可以切换勾选状态
  toggleDisclaimerCheckbox() {
    const newState = !this.data.agreedToDisclaimer;
    this.setData({
      agreedToDisclaimer: newState
    });
  },

  // 🔴 新增：显示免责协议弹窗
  showDisclaimerModal() {
    const disclaimerContent = `
<div style="line-height: 2; font-size: 28rpx; color: #333;">
  <div style="font-weight: 600; margin-bottom: 30rpx; font-size: 32rpx; color: #000;">重要提示</div>
  
  <div style="margin-bottom: 30rpx; line-height: 2.2;">
    本产品（<span style="font-weight: 600;">电动折叠牌照架</span>）<span style="color: #FF3B30; font-weight: 600;">仅限赛道使用</span>。
  </div>
  
  <div style="margin-bottom: 20rpx; line-height: 2.2;">
    如用户将本产品用于道路行驶，用户需自行承担一切法律责任和风险，包括但不限于：
  </div>
  
  <div style="margin-left: 30rpx; margin-bottom: 20rpx; line-height: 2.2;">
    • 交通违法责任
  </div>
  <div style="margin-left: 30rpx; margin-bottom: 20rpx; line-height: 2.2;">
    • 交通事故责任
  </div>
  <div style="margin-left: 30rpx; margin-bottom: 20rpx; line-height: 2.2;">
    • 车辆年检不合格责任
  </div>
  <div style="margin-left: 30rpx; margin-bottom: 30rpx; line-height: 2.2;">
    • 其他因违规使用导致的法律后果
  </div>
  
  <div style="color: #666; font-size: 26rpx; line-height: 2; margin-top: 30rpx; padding-top: 20rpx; border-top: 1rpx solid #eee;">
    购买即视为用户已充分理解并同意上述免责条款。
  </div>
</div>
    `.trim();

    // 免责协议弹窗保留，因为需要用户阅读完整内容
    this.showMyDialog({
      title: '免责协议',
      content: disclaimerContent,
      showCancel: false,
      confirmText: '我已阅读并同意'
    });
  },

  // 4. [新增] 切换播放/暂停
  toggleVideoPlayPause() {
    const videoContext = wx.createVideoContext('fullscreen-video');
    if (!videoContext) {
      return;
    }

    if (this.data.isVideoPlaying) {
      videoContext.pause();
    } else {
      videoContext.play();
      // 🔴 额外保险：如果 onVideoPlay 事件没触发，延迟设置状态
      setTimeout(() => {
        if (!this.data.isVideoPlaying) {
          this.setData({
            isVideoPlaying: true
          });
        }
      }, 300);
    }
  },

  // 5. [新增] 视频播放事件
  onVideoPlay(e) {
    const { index, location } = e.currentTarget.dataset || {};
    // 更新全屏播放器状态
    this.setData({
      isVideoPlaying: true
    });
    
    // 更新对应位置的视频播放状态
    if (location === 'hero' && index !== undefined) {
      const heroVideoPlaying = { ...this.data.heroVideoPlaying };
      heroVideoPlaying[index] = true;
      this.setData({ heroVideoPlaying });
    } else if (location === 'detail' && index !== undefined) {
      const detailVideoPlaying = { ...this.data.detailVideoPlaying };
      detailVideoPlaying[index] = true;
      this.setData({ detailVideoPlaying });
    }
  },

  // 6. [新增] 视频暂停事件
  onVideoPause(e) {
    const { index, location } = e.currentTarget.dataset || {};
    // 更新全屏播放器状态
    this.setData({
      isVideoPlaying: false
    });
    
    // 更新对应位置的视频播放状态
    if (location === 'hero' && index !== undefined) {
      const heroVideoPlaying = { ...this.data.heroVideoPlaying };
      heroVideoPlaying[index] = false;
      this.setData({ heroVideoPlaying });
    } else if (location === 'detail' && index !== undefined) {
      const detailVideoPlaying = { ...this.data.detailVideoPlaying };
      detailVideoPlaying[index] = false;
      this.setData({ detailVideoPlaying });
    }
  },

  // 🔴 新增：swiper切换事件处理，确保视频自动播放
  onSwiperChange(e) {
    const currentIndex = e.detail.current;
    const topMediaList = this.data.topMediaList;
    const heights = this.data.heroSlideHeightsPx || {};
    const h = this._resolveHeroSlideHeightPx(currentIndex, topMediaList, heights);
    const prevIndex = Number(this.data.heroCurrent) || 0;
    if (currentIndex === prevIndex && Number(this.data.heroSwiperHeightPx) === Number(h)) {
      this._syncHeroAutoForCurrent();
      return;
    }

    const patch = { heroCurrent: currentIndex, heroSwiperHeightPx: h };
    if (topMediaList && topMediaList[prevIndex] && topMediaList[prevIndex].type === 'video') {
      const prevCtx = wx.createVideoContext(`hero-video-${prevIndex}`);
      if (prevCtx) prevCtx.pause();
      patch[`heroVideoPlaying.${prevIndex}`] = false;
    }
    this.setData(patch);

    if (topMediaList && topMediaList[currentIndex] && topMediaList[currentIndex].type === 'video') {
      // 自动轮播开启时，或当前视频手动设置了自动播放，都自动播
      if (this.data.heroAutoCarouselEnabled || topMediaList[currentIndex].autoplay === true) {
        if (this._heroPlayKickTimer) {
          clearTimeout(this._heroPlayKickTimer);
          this._heroPlayKickTimer = null;
        }
        const expectIndex = currentIndex;
        this._heroPlayKickTimer = setTimeout(() => {
          this._heroPlayKickTimer = null;
          if ((Number(this.data.heroCurrent) || 0) !== expectIndex) return;
          const videoContext = wx.createVideoContext(`hero-video-${expectIndex}`);
          if (videoContext) videoContext.play();
        }, 120);
      }
    }
    this._syncHeroAutoForCurrent();
  },

  onHeroVideoEnded() {
    if (!this.data.heroAutoCarouselEnabled) return;
    this._goNextHeroSlide();
  },

  // 7. [新增] 视频加载错误处理
  onVideoError(e) {
    const { index, location } = e.currentTarget.dataset;
    const errMsg = e.detail.errMsg || '未知错误';
    console.error(`[onVideoError] 视频加载失败 - 位置: ${location}, 索引: ${index}, 错误: ${errMsg}`);
    
    // 如果是管理员，显示详细错误信息
    if (this.data.isAdmin) {
      this.showAutoToast('视频加载失败', `位置: ${location === 'hero' ? '顶部轮播' : '详情页'}\n错误: ${errMsg}\n\n请检查视频文件是否存在或重新上传`);
    } else {
      // 普通用户只显示简单提示
    }
  },

  // 顶部轮播图加载失败（常见：未配置 downloadFile 合法域名、或 COS 对象无公有读权限）
  onHeroImageError(e) {
    const idx = e.currentTarget.dataset.index;
    const src = e.currentTarget.dataset.src || '';
    const errMsg = (e.detail && e.detail.errMsg) || '未知错误';
    console.error('[shop.js][HeroImage] 图片加载失败 index:', idx, 'errMsg:', errMsg, 'src:', src);
    if (this.data.isAdmin) {
      const isCos = src.indexOf('.myqcloud.com') !== -1;
      const hint403 = isCos && /403|Forbidden/i.test(errMsg)
        ? '\n\nCOS 返回 403：请在腾讯云 COS 把该桶或前缀设为「公有读」或配置匿名读策略，否则小程序无法直接展示 HTTPS 图片。'
        : '';
      this.showAutoToast(
        '顶部图片无法显示',
        '请检查：1）小程序后台已添加 COS 域名为「downloadFile 合法域名」\n2）云存储图需有读权限；COS 图需桶/对象为公有读\n3）旧 cloud:// 图已自动换临时链接展示' + hint403 + '\n\n' + errMsg
      );
    }
  },

  // 🔴 新增：视频时间更新事件（用于检测播放状态）
  onVideoTimeUpdate() {
    // 如果视频时间在更新，说明视频正在播放
    // 这是一个备用机制，确保状态正确
    if (!this.data.isVideoPlaying) {
      this.setData({
        isVideoPlaying: true
      });
    }
  },

  // 2. 管理员：上传/更换对比视频
  adminUploadCompareVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        this.showMyLoading('上传中...');
        try {
          const tempFile = res.tempFiles[0];
          const tempPath = tempFile.tempFilePath;
          const knownSize = tempFile && typeof tempFile.size === 'number' ? tempFile.size : undefined;

          const fileID = await this.uploadShopVideoToCos(tempPath, 'shop/compare_videos', '', { knownSize });
          
          const s = this.data.currentSeries;
          const next = { ...s, compareVideo: fileID };
          if (next.showCompareVideo === undefined) {
            next.showCompareVideo = true;
          }
          const hydratedList = await this.hydrateSeriesCloudDisplayUrls([next]);
          const merged = hydratedList[0] || next;
          this.setData({ 
            currentSeries: merged,
            [`seriesList[${this.data.currentSeriesIdx}]`]: merged 
          });
          this.saveSeriesToCloud(merged);
          
          this.hideMyLoading();
          this.showAutoToast('成功', '上传成功');
        } catch (err) {
          this.hideMyLoading();
          console.error('上传失败', err);
          this.showAutoToast('提示', '上传失败');
        }
      }
    });
  },

  // 3. 管理员：切换视频显示/隐藏状态
  adminToggleVideoVis() {
    const s = this.data.currentSeries;
    
    // 切换布尔值 (true变false，false变true)
    s.showCompareVideo = !s.showCompareVideo;

    // 更新页面
    this.setData({ 
      currentSeries: s,
      [`seriesList[${this.data.currentSeriesIdx}]`]: s 
    });
    
    // 保存状态到云端
    this.saveSeriesToCloud(s); 
  },
  
  adminAddSpecRow() {
    const s = this.data.currentSeries;
    
    // 确保 specs 数组存在
    if (!s.specs) {
      s.specs = [];
    }
    
    // 根据型号数量动态生成列数
    const modelCount = s.models ? s.models.length : 3;
    const newRow = { label: '新项' };
    for (let i = 1; i <= modelCount; i++) {
      newRow[`v${i}`] = '-';
    }
    
    s.specs.push(newRow);
    
    // 同步到 currentSeries 和 seriesList
    this.setData({ 
      currentSeries: s, 
      [`seriesList[${this.data.currentSeriesIdx}]`]: s 
    });
    
    // 保存到云端
    this.saveSeriesToCloud(s);
    
    // 刷新对比表格显示
    if (this.data.showSpecsModal) {
      this.openSpecsModal();
    }
  },
  adminDelSpecRow(e) {
    const s = this.data.currentSeries;
    const idx = e.currentTarget.dataset.index;
    
    if (!s.specs || idx >= s.specs.length) {
      this.showAutoToast('提示', '删除失败');
      return;
    }
    
    s.specs.splice(idx, 1);
    
    // 同步到 currentSeries 和 seriesList
    this.setData({ 
      currentSeries: s, 
      [`seriesList[${this.data.currentSeriesIdx}]`]: s 
    });
    
    // 保存到云端
    this.saveSeriesToCloud(s);
    
    // 刷新对比表格显示
    if (this.data.showSpecsModal) {
      this.openSpecsModal();
    }
  },
  // 编辑任意格子
  adminEditSpecCell(e) {
    const rIdx = e.currentTarget.dataset.row;
    const key = e.currentTarget.dataset.key; // label, v1, v2, v3
    const s = this.data.currentSeries;
    
    // 确保 specs 数组存在
    if (!s.specs || !s.specs[rIdx]) {
      this.showAutoToast('提示', '数据错误');
      return;
    }
    
    this._input(s.specs[rIdx][key] || '', (v) => {
        // 更新数据
        s.specs[rIdx][key] = v;
        
        // 同步到 currentSeries 和 seriesList
        this.setData({ 
          currentSeries: s, 
          [`seriesList[${this.data.currentSeriesIdx}]`]: s 
        });
        
        // 保存到云端
        this.saveSeriesToCloud(s);
        
        // 【关键】刷新对比表格显示，确保编辑后立即看到更新
        if (this.data.showSpecsModal) {
          this.openSpecsModal();
        }
    });
  },

  // ========================================================
  // 2. 新增：管理员管理参数 (添加/删除行)
  // ========================================================
  adminManageSpecs() {
    // 🔴 使用自定义actionSheet替代wx.showActionSheet
    this.setData({
      actionSheet: {
        show: true,
        itemList: ['添加参数行', '删除最后一行', '重置所有参数'],
        callback: (tapIndex) => {
          const s = this.data.currentSeries;
          
          // 确保 specs 数组存在
          if (!s.specs) {
            s.specs = [];
          }
          
          if (tapIndex === 0) {
            // 添加行：根据型号数量动态生成列数
            const modelCount = s.models ? s.models.length : 3;
            const newRow = { label: '新参数' };
            for (let i = 1; i <= modelCount; i++) {
              newRow[`v${i}`] = '-';
            }
            s.specs.push(newRow);
          } else if (tapIndex === 1) {
            // 删除最后一行
            if (s.specs.length > 0) {
              s.specs.pop();
            } else {
              this.showAutoToast('提示', '没有可删除的行');
              return;
            }
          } else if (tapIndex === 2) {
            // 重置 (慎用)
            const modelCount = s.models ? s.models.length : 3;
            const defaultRow = { label: '续航' };
            for (let i = 1; i <= modelCount; i++) {
              defaultRow[`v${i}`] = '-';
            }
            s.specs = [defaultRow];
          }
          
          // 同步到 currentSeries 和 seriesList
          this.setData({ 
            currentSeries: s, 
            [`seriesList[${this.data.currentSeriesIdx}]`]: s 
          });
          
          // 保存到云端
          this.saveSeriesToCloud(s);
          
          // 如果对比表格正在显示，刷新它
          if (this.data.showSpecsModal) {
            this.openSpecsModal();
          }
          
          this.showAutoToast('成功', '已更新');
        }
      }
    });
  },
  
  // 🔴 新增：关闭自定义actionSheet（带收缩退出动画）
  closeActionSheet() {
    this.setData({ actionSheetClosing: true });
    setTimeout(() => {
      this.setData({ 
        actionSheet: { show: false, itemList: [], callback: null },
        actionSheetClosing: false
      });
    }, 420);
  },
  
  // 🔴 新增：点击actionSheet选项
  onActionSheetItemTap(e) {
    const index = e.currentTarget.dataset.index;
    const callback = this.data.actionSheet.callback;
    this.closeActionSheet();
    if (callback) {
      callback(index);
    }
  },
  
  // 🔴 新增：阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // ================== 5. 配件 (Accessory) 新交互 ==================
  
  // 仅切换选中状态（右侧小按钮）
  toggleAccessorySelection(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || !this.data.accessoryList[idx]) return;
    const key = `accessoryList[${idx}].selected`;
    const next = !this.data.accessoryList[idx].selected;
    this.setData({ [key]: next }, () => {
      this._refreshSeriesAccessoryList();
      this.calcTotal();
    });
  },

  // 打开配件详情页（产品详情内配件加购列表）
  openAccessoryDetail(e) {
    const idx = e.currentTarget.dataset.index;
    this._openAccessoryDetailAt(idx, false);
  },

  /** 首页版本行「配件模式」卡片 → 配件详情 + 购买底栏 */
  openAccessoryDetailFromRow(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || idx < 0) return;
    this._openAccessoryDetailAt(idx, true);
  },

  _openAccessoryDetailAt(idx, showPurchaseFooter) {
    const acc = this.data.accessoryList[idx];
    if (acc) {
      if (acc.price == null || isNaN(acc.price) || acc.price < 0) {
        acc.price = 0;
        this.setData({ [`accessoryList[${idx}].price`]: 0 });
      }
    }
    if (this._accDetailCloseTimer) {
      clearTimeout(this._accDetailCloseTimer);
      this._accDetailCloseTimer = null;
    }
    this.setData({
      showAccDetail: true,
      accDetailClosing: false,
      currentAccIdx: idx,
      accDetailSwiperIndex: 0,
      accDetailShowPurchaseFooter: !!showPurchaseFooter
    });
  },

  closeAccessoryDetail(opts = {}) {
    const immediate = !!(opts && opts.immediate);
    if (!this.data.showAccDetail && !this.data.accDetailClosing) return;
    if (this._accDetailCloseTimer) {
      clearTimeout(this._accDetailCloseTimer);
      this._accDetailCloseTimer = null;
    }
    if (immediate) {
      this.setData({
        showAccDetail: false,
        accDetailClosing: false,
        accDetailSwiperIndex: 0,
        accDetailShowPurchaseFooter: false,
        accCheckoutActive: false
      });
      return;
    }
    if (this.data.accDetailClosing) return;
    this.setData({ accDetailClosing: true });
    this._accDetailCloseTimer = setTimeout(() => {
      this._accDetailCloseTimer = null;
      this.setData({
        showAccDetail: false,
        accDetailClosing: false,
        accDetailSwiperIndex: 0,
        accDetailShowPurchaseFooter: false,
        accCheckoutActive: false
      });
    }, 400);
  },

  /** 配件详情左上角 ✕：只关详情层，保留下层（产品详情 / 商城列表） */
  onAccDetailNavClose() {
    this.closeAccessoryDetail();
  },

  onAccDetailSwiperChange(e) {
    const current = (e && e.detail && e.detail.current) || 0;
    this.setData({ accDetailSwiperIndex: current });
  },

  onAccDetailAutoplayChange(e) {
    if (!this.data.isAdmin) return;
    const idx = this.data.currentAccIdx;
    const enabled = !!e.detail.value;
    const acc = this.data.accessoryList[idx];
    if (!acc) return;
    acc.detailImagesAutoplay = enabled;
    this.setData({
      [`accessoryList[${idx}].detailImagesAutoplay`]: enabled
    });
    this.saveAccessoryToCloud(acc, idx);
  },
  
  // 在详情页点击“加入购物袋”（产品详情内加购）
  addAccToCartFromDetail() {
    const idx = this.data.currentAccIdx;
    this.setData({ [`accessoryList[${idx}].selected`]: true });
    this.calcTotal();
    this.showAutoToast('成功', '已加入');
    this.closeAccessoryDetail();
  },

  _addStandaloneAccessoryToCart(accIdx) {
    const acc = this.data.accessoryList[accIdx];
    if (!acc) return { success: false };
    let newCart = [...this.data.cart];
    const existingIdx = newCart.findIndex(item => item.type === 'accessory' && item.name === acc.name);
    if (existingIdx > -1) {
      newCart[existingIdx].quantity++;
      newCart[existingIdx].total = newCart[existingIdx].quantity * newCart[existingIdx].price;
    } else {
      newCart.push({
        id: Date.now(),
        type: 'accessory',
        name: acc.name,
        spec: '配件',
        price: acc.price,
        quantity: 1,
        total: acc.price
      });
    }
    const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);
    return { success: true, newCart, newTotal };
  },

  addAccToCartFromDetailPurchase() {
    const idx = this.data.currentAccIdx;
    const result = this._addStandaloneAccessoryToCart(idx);
    if (!result.success) return;
    this.saveCartToCache(result.newCart);
    this.setData({ showCartSuccess: true });
  },

  buyAccFromDetailPurchase() {
    const idx = this.data.currentAccIdx;
    const result = this._addStandaloneAccessoryToCart(idx);
    if (!result.success) return;
    this._openBuyNowCheckout(result.newCart, { fromAccDetail: true });
  },

  adminChangeAccSlotNumbers(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || idx < 0) return;
    this._openAccSlotPicker(idx);
  },

  _openAccSlotPicker(accIndex) {
    const acc = this.data.accessoryList[accIndex];
    if (!acc) return;
    const cats = this.data.mainCategories || [];
    const groups = cats.map((version) => {
      const max = this._getCategorySeriesSlotCount(
        version,
        this.data.seriesList,
        this.data.accessoryList
      );
      const selected = this._getAccessorySlotsForVersion(acc, version, max);
      const options = [];
      for (let i = 1; i <= max; i++) {
        options.push({ num: i, on: selected.includes(i) });
      }
      return { version, max, options };
    });
    this.setData({
      accSlotPickerVisible: true,
      accSlotPickerAccIndex: accIndex,
      accSlotPickerGroups: groups
    });
  },

  closeAccSlotPicker() {
    this.setData({
      accSlotPickerVisible: false,
      accSlotPickerAccIndex: -1,
      accSlotPickerGroups: []
    });
  },

  toggleAccSlotPickerOption(e) {
    const version = e.currentTarget.dataset.version;
    const num = Number(e.currentTarget.dataset.num);
    if (!version || Number.isNaN(num)) return;
    const groups = (this.data.accSlotPickerGroups || []).map((g) => {
      if (g.version !== version) return g;
      return {
        ...g,
        options: (g.options || []).map((o) => (o.num === num ? { ...o, on: !o.on } : o))
      };
    });
    this.setData({ accSlotPickerGroups: groups });
  },

  confirmAccSlotPicker() {
    const idx = this.data.accSlotPickerAccIndex;
    const acc = this.data.accessoryList[idx];
    if (!acc) {
      this.closeAccSlotPicker();
      return;
    }
    const groups = this.data.accSlotPickerGroups || [];
    const versionSlots = { ...(acc.versionSlots || {}) };
    let hasAny = false;
    const conflicts = [];
    groups.forEach((g) => {
      const version = g.version;
      const max = g.max || 1;
      const selected = (g.options || [])
        .filter((o) => o.on)
        .map((o) => o.num)
        .sort((a, b) => a - b);
      if (selected.length) {
        hasAny = true;
        versionSlots[version] = selected;
      } else {
        delete versionSlots[version];
      }
      selected.forEach((n) => {
        const other = (this.data.accessoryList || []).find(
          (a, i) =>
            i !== idx &&
            this._getAccessorySlotsForVersion(a, version, max).includes(n)
        );
        if (other) conflicts.push({ version, num: n, name: other.name });
      });
    });
    if (!hasAny) {
      this.showAutoToast('提示', '请至少在某一版本选择一个编号');
      return;
    }
    const apply = () => {
      acc.versionSlots = versionSlots;
      const list = this.data.accessoryList.map((a, i) =>
        i === idx ? { ...a, versionSlots: { ...versionSlots } } : a
      );
      this._accSectionSwiperFocus = { accIndex: idx };
      this.closeAccSlotPicker();
      this._syncCategorySections({ accessoryList: list });
      this.saveAccessoryToCloud(acc, idx);
      this._refreshSeriesAccessoryList();
      this.showAutoToast('成功', '显示位置已更新');
    };
    if (conflicts.length) {
      const c0 = conflicts[0];
      wx.showModal({
        title: '编号已被占用',
        content:
          '「' +
          c0.name +
          '」已占用「' +
          c0.version +
          '」' +
          c0.num +
          ' 号位，同号仅展示排序靠前的一条。是否继续？',
        confirmText: '继续',
        success: (res) => {
          if (res.confirm) apply();
        }
      });
      return;
    }
    apply();
  },
  
  // 配件 Admin 操作
  adminEditAccName() {
    const idx = this.data.currentAccIdx;
    const acc = this.data.accessoryList[idx];
    const currentName = acc.name || '';
    this._input(currentName, (v) => {
      // 清理输入内容，去除首尾空格
      const cleanedName = (v || '').trim();
      if (!cleanedName) {
        this.showAutoToast('提示', '名称不能为空');
        return;
      }
      acc.name = cleanedName;
      this.setData({ [`accessoryList[${idx}].name`]: cleanedName }, () => {
        this._refreshSeriesAccessoryList();
      });
      this.saveAccessoryToCloud(acc, idx);
    });
  },
  adminEditAccDesc() {
    const idx = this.data.currentAccIdx;
    const acc = this.data.accessoryList[idx];
    const currentDesc = acc.desc || '';
    this._input(currentDesc, (v) => {
      // 清理输入内容，去除首尾空格
      const cleanedDesc = (v || '').trim();
      acc.desc = cleanedDesc;
      this.setData({ [`accessoryList[${idx}].desc`]: cleanedDesc });
      this.saveAccessoryToCloud(acc, idx);
    });
  },
  _editAccessoryPriceAt(idx, currentPrice) {
    const acc = this.data.accessoryList[idx];
    if (!acc) return;
    const base = (currentPrice != null && !isNaN(currentPrice)) ? currentPrice : 0;
    this._input(base + '', (v) => {
      const cleaned = v.replace(/[^\d.]/g, '');
      const newPrice = Number(cleaned);
      if (isNaN(newPrice) || newPrice < 0) {
        this.showAutoToast('提示', '请输入有效的价格数字');
        return;
      }
      acc.price = newPrice;
      this._syncCategorySections({ [`accessoryList[${idx}].price`]: newPrice });
      this.calcTotal();
      this.saveAccessoryToCloud(acc, idx);
    });
  },

  adminEditAccPriceFromRow(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx)) return;
    const acc = this.data.accessoryList[idx];
    if (!acc) return;
    this._editAccessoryPriceAt(idx, acc.price);
  },

  adminEditAccNameFromRow(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx)) return;
    const acc = this.data.accessoryList[idx];
    if (!acc) return;
    this._input(acc.name || '', (v) => {
      const name = (v || '').trim() || '新配件';
      acc.name = name;
      this._syncCategorySections({ [`accessoryList[${idx}].name`]: name });
      this.saveAccessoryToCloud(acc, idx);
    });
  },

  adminEditAccPrice() {
    if (!this.data.isAdmin) return;
    const idx = this.data.currentAccIdx;
    const acc = this.data.accessoryList[idx];
    if (!acc) return;
    this._editAccessoryPriceAt(idx, acc.price);
  },
  adminAddAccDetailImg() {
    const idx = this.data.currentAccIdx;
    const list = this.data.accessoryList;
    const acc = list[idx];
    if (!acc) return;
    const currentLen = (acc.detailImages || []).length;
    const remain = 9 - currentLen;
    if (remain <= 0) {
      this.showAutoToast('提示', '最多上传 9 张图片');
      return;
    }
    this.chooseShopImage('accDetail', { count: remain }).then(async (picked) => {
      const paths = Array.isArray(picked) ? picked : (picked ? [picked] : []);
      if (!paths.length) return;
      this.showMyLoading('上传中...');
      try {
        if (!list[idx].detailImages) list[idx].detailImages = [];
        const newIds = [];
        for (let i = 0; i < paths.length; i++) {
          const fileID = await this.uploadShopImageToCos(paths[i], 'shop/accessories', { skipPrepare: true });
          newIds.push(fileID);
        }
        list[idx].detailImages = [...list[idx].detailImages, ...newIds];
        const hydrated = await this.hydrateAccessoryCloudDisplayUrls(list);
        const jumpTo = list[idx].detailImages.length - newIds.length;
        this.setData({
          accessoryList: hydrated,
          accDetailSwiperIndex: jumpTo
        });
        this.saveAccessoryToCloud(hydrated[idx], idx);
        this.hideMyLoading();
        this.showAutoToast('成功', `已添加 ${newIds.length} 张图片`);
      } catch (err) {
        this.hideMyLoading();
        this.showAutoToast('提示', '上传失败');
      }
    }).catch((err) => {
      if (err && err.errMsg && String(err.errMsg).indexOf('cancel') !== -1) return;
      console.error('[shop.js] adminAddAccDetailImg 选择失败:', err);
    });
  },

  async adminDelAccDetailImg(e) {
    const imgIdx = Number(e.currentTarget.dataset.imgidx);
    const accIdx = this.data.currentAccIdx;
    const list = this.data.accessoryList;
    const acc = list[accIdx];
    if (!acc || !acc.detailImages || imgIdx < 0 || imgIdx >= acc.detailImages.length) return;
    const deletedImgID = acc.detailImages[imgIdx];
    acc.detailImages.splice(imgIdx, 1);
    const hydrated = await this.hydrateAccessoryCloudDisplayUrls(list);
    let swiperIdx = this.data.accDetailSwiperIndex || 0;
    if (swiperIdx >= acc.detailImages.length) {
      swiperIdx = Math.max(0, acc.detailImages.length - 1);
    }
    this.setData({ accessoryList: hydrated, accDetailSwiperIndex: swiperIdx });
    this.saveAccessoryToCloud(hydrated[accIdx], accIdx);
    if (deletedImgID && String(deletedImgID).indexOf('cloud://') === 0) {
      wx.cloud.deleteFile({ fileList: [deletedImgID] }).catch(() => {});
    }
  },
  adminAddAccForSeries() {
    const seriesIdx = this.data.currentSeriesIdx;
    if (seriesIdx < 0 || !this.data.seriesList[seriesIdx]) {
      this.adminAddAcc();
      return;
    }
    const series = this.data.seriesList[seriesIdx];
    const category = series.mainCategory || '电动版本';
    const slotNum = this._getSeriesCatalogSlot(series);
    const list = this.data.accessoryList.slice();
    const newAcc = {
      id: Date.now(),
      name: '新配件',
      price: 99,
      img: '',
      versionSlots: { [category]: [slotNum] },
      sortOrder: Date.now(),
      selected: false,
      desc: '描述',
      detailImages: [],
      detailImagesAutoplay: false
    };
    list.push(newAcc);
    const newIdx = list.length - 1;
    this._accSectionSwiperFocus = { category, accIndex: newIdx, slotNum };
    this._syncCategorySections({ accessoryList: list });
    this.saveAccessoryToCloud(newAcc, newIdx, true);
    this.setData({ seriesAccessoryList: this._buildSeriesAccessoryList(series) });
    wx.vibrateShort({ type: 'light' });
  },

  // 首页配件列表添加
  adminAddAcc(e) {
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const category = ds.category || '配件系列';
    const presetSlot = Number(ds.slotNum);
    const list = this.data.accessoryList.slice();
    const slotMax = this._getCategorySeriesSlotCount(category, this.data.seriesList, list);
    const used = new Set();
    list.forEach((a) => {
      this._getAccessorySlotsForVersion(a, category, slotMax).forEach((n) => used.add(n));
    });
    let firstFree = slotMax + 1;
    if (presetSlot >= 1 && presetSlot <= slotMax && !used.has(presetSlot)) {
      firstFree = presetSlot;
    } else {
      for (let n = 1; n <= slotMax; n++) {
        if (!used.has(n)) {
          firstFree = n;
          break;
        }
      }
    }
    const newAcc = {
      id: Date.now(),
      name: '新配件',
      price: 99,
      img: '',
      versionSlots: { [category]: [firstFree] },
      sortOrder: Date.now(),
      selected: false,
      desc: '描述',
      detailImages: [],
      detailImagesAutoplay: false
    };
    list.push(newAcc);
    const newIdx = list.length - 1;
    this._accSectionSwiperFocus = { category, accIndex: newIdx, slotNum: firstFree };
    this._syncCategorySections({ accessoryList: list });
    this.saveAccessoryToCloud(newAcc, newIdx, true);
    wx.vibrateShort({ type: 'light' });
  },
  adminDelAcc(e) {
    const idx = e.currentTarget.dataset.index;
    const acc = this.data.accessoryList[idx];
    
    // 🔴 收集所有需要删除的文件ID
    const fileIDsToDelete = [];
    if (acc.img && acc.img.startsWith('cloud://')) {
      fileIDsToDelete.push(acc.img);
    }
    if (acc.detailImages && Array.isArray(acc.detailImages)) {
      acc.detailImages.forEach(imgID => {
        if (imgID && imgID.startsWith('cloud://')) {
          fileIDsToDelete.push(imgID);
        }
      });
    }
    
    if (this.db && acc._id) {
      this.db.collection('shop_accessories').doc(acc._id).remove().catch(err => {
      });
    }
    
    // 🔴 删除云存储中的文件
    if (fileIDsToDelete.length > 0) {
      wx.cloud.deleteFile({
        fileList: fileIDsToDelete,
        success: () => {
        },
        fail: (err) => {
          console.error('[shop.js] 删除配件所有图片失败:', err);
        }
      });
    }
    
    const list = this.data.accessoryList;
    list.splice(idx, 1);
    this._syncCategorySections({ accessoryList: list });
    this._refreshSeriesAccessoryList();
    this.calcTotal();
  },
  adminUploadAccThumb(e) {
    const idx = e.currentTarget.dataset.index;
    this.chooseShopImage('accThumb').then(async (path)=>{
      this.showMyLoading('上传中...');
      try {
        const acc = this.data.accessoryList[idx];
        const oldFileID = acc.img; // 🔴 保存旧图片ID
        
        const fileID = await this.uploadShopImageToCos(path, 'shop/accessories', { skipPrepare: true });
        acc.img = fileID;
        const list = [...this.data.accessoryList];
        list[idx] = { ...acc };
        const hydrated = await this.hydrateAccessoryCloudDisplayUrls(list);
        this._syncCategorySections({ accessoryList: hydrated });
        this.saveAccessoryToCloud(hydrated[idx], idx);
        
        // 🔴 删除旧图片
        if (oldFileID && oldFileID.startsWith('cloud://')) {
          wx.cloud.deleteFile({
            fileList: [oldFileID],
            success: () => {
            },
            fail: (err) => {
              console.error('[shop.js] 删除旧配件缩略图失败:', err);
            }
          });
        }
        
        this.hideMyLoading();
      } catch (err) {
        this.hideMyLoading();
        this.showAutoToast('提示', '上传失败');
      }
    }).catch((err)=>{
      console.error('[shop.js] adminUploadAccThumb 选择或裁切失败:', err);
    });
  },

  // ================== 6. 订单 & 总价 ==================
  // ========================================================
  // 修改 3：计算总价 (增加防空判断)
  // ========================================================
  calcTotal() {
    if(!this.data.currentSeries.models) return;

    // 获取 Model 价格 (如果没有选中，则为 0)
    const m = this.data.selectedModelIdx > -1 
      ? this.data.currentSeries.models[this.data.selectedModelIdx] 
      : { price: 0 };

    // 获取 Option 价格 (如果没有选中，则为 0)
    const o = this.data.selectedOptionIdx > -1 
      ? this.data.currentSeries.options[this.data.selectedOptionIdx] 
      : { price: 0 };

    let accP = 0;
    if (this.data.showDetail && Array.isArray(this.data.seriesAccessoryList)) {
      this.data.seriesAccessoryList.forEach((row) => {
        if (row.selected) accP += Number(row.price) || 0;
      });
    } else {
      this.data.accessoryList.forEach((a) => {
        if (a.selected) accP += Number(a.price) || 0;
      });
    }

    this.setData({ totalPrice: m.price + o.price + accP });
  },
  _openOrderSheet(extra = {}) {
    const fromAccDetail = !!(this.data.accCheckoutActive || extra.accCheckoutActive);
    const patch = {
      showOrderModal: true,
      orderSheetAnimIn: false,
      orderSheetClosing: false,
      hasModalOpen: true,
      ...extra
    };
    if (fromAccDetail) {
      // 兜底：从配件详情发起时，必须保留详情层作为底层，不允许回落到商城页
      patch.showAccDetail = true;
      patch.accDetailShowPurchaseFooter = true;
    }
    this.setData(patch, () => {
      wx.nextTick(() => {
        if (this.data.showOrderModal) {
          this.setData({ orderSheetAnimIn: true });
          if (typeof this.loadCheckoutCoupons === 'function') {
            this.loadCheckoutCoupons();
          }
        }
      });
    });
  },

  _refreshHubOrdersIfEmbedded() {
    if (!this.data.hubEmbedInProducts) return;
    try {
      const pages = getCurrentPages();
      const page = pages[pages.length - 1];
      const ordersPanel = page && page.selectComponent && page.selectComponent('#hubOrdersPanel');
      if (ordersPanel && typeof ordersPanel.loadMyOrdersPromise === 'function') {
        ordersPanel.loadMyOrdersPromise().catch(() => {});
      }
    } catch (e) {}
  },

  _handleShopPaymentCancelled(payment) {
    const orderId = payment && payment.outTradeNo;
    const tip = orderId
      ? '订单已生成，可在「订单」待付款中继续支付'
      : '支付已取消';
    if (orderId) {
      sendSubscribeNotify({ scene: 'shop_unpaid', orderId: String(orderId) });
    }
    const restoreAccDetail = !!this.data.accCheckoutActive;
    const afterAnim = () => {
      if (this.data.buyNowCartSnapshot !== null) {
        this.setData({ buyNowCartSnapshot: null });
      }
      const patch = {
        cart: [],
        cartTotalPrice: 0,
        showOrderModal: false,
        orderSheetAnimIn: false,
        orderSheetClosing: false,
        agreedToDisclaimer: false,
        accCheckoutActive: false,
        hasModalOpen: false
      };
      if (restoreAccDetail) {
        patch.showAccDetail = true;
        patch.accDetailShowPurchaseFooter = true;
      }
      this.setData(patch);
      this._refreshHubOrdersIfEmbedded();
      this.showAutoToast('提示', tip);
    };
    if (this.data.showOrderModal) {
      this.setData({ orderSheetAnimIn: false, orderSheetClosing: true });
      setTimeout(afterAnim, 340);
    } else {
      afterAnim();
    }
  },

  openOrderModal() {
    this._openOrderSheet();
  },

  /** 枢纽订单 Tab 购物车「去结算」：同步 my_cart 并打开确认订单弹窗 */
  openCheckoutFromHub() {
    let cachedCart = [];
    try {
      cachedCart = wx.getStorageSync('my_cart') || [];
    } catch (e) {
      cachedCart = [];
    }
    if (!cachedCart.length) {
      cachedCart = this.data.cart || [];
    }
    if (!cachedCart.length) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    let total = 0;
    cachedCart.forEach((item) => {
      total += Number(item.total) || 0;
    });
    this.setData({
      cart: cachedCart,
      cartTotalPrice: total
    });
    this._prefillCheckoutAddressFromCache();
    this.reCalcFinalPrice(total);
    if (typeof this.loadCheckoutCoupons === 'function') {
      this.loadCheckoutCoupons();
    }
    this.openOrderModal();
  },

  _prefillCheckoutAddressFromCache() {
    try {
      const last = wx.getStorageSync('last_address');
      if (!last || (!last.name && !last.phone && !last.address)) return;
      const patch = {};
      if (last.name) patch['orderInfo.name'] = last.name;
      if (last.phone) patch['orderInfo.phone'] = last.phone;
      if (last.address) {
        patch['orderInfo.address'] = last.address;
        patch.detailAddress = last.address;
      }
      if (Object.keys(patch).length) this.setData(patch);
    } catch (e) {}
  },

  /** 主列表悬浮购物车：快速打开结算弹窗（不触发「立即购买」加购逻辑） */
  onFloatingCartTap() {
    const cart = this.data.cart || [];
    if (!cart.length) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    this.reCalcFinalPrice(this.data.cartTotalPrice);
    this.openOrderModal();
  },
  // ========================================================
  // 1. [修改] 输入监听 (处理详细地址 + 手机号)
  // ========================================================
  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;

    if (key === 'detailAddress') {
      this.setData({ detailAddress: val });
      // 输入详细地址后，解析地址并重新计算运费
      if (val && val.trim()) {
        this.reCalcFinalPrice();
      }
    } else {
      this.setData({ [`orderInfo.${key}`]: val });
    }
  },
  
  // ========================================================
  // 智能粘贴相关方法
  // ========================================================
  openSmartPasteModal() {
    this.setData({ 
      showSmartPasteModal: true,
      smartPasteVal: ''
    });
  },
  
  closeSmartPasteModal() {
    this.setData({ smartPasteClosing: true });
    setTimeout(() => {
      this.setData({ 
        showSmartPasteModal: false,
        smartPasteVal: '',
        smartPasteClosing: false
      });
    }, 420);
  },
  
  onSmartPasteInput(e) {
    this.setData({ smartPasteVal: e.detail.value });
  },
  
  // ========================================================
  // 智能分析：解析姓名、电话、地址
  // ========================================================
  // 智能分析：解析姓名、电话、地址 - 使用腾讯地图API精准解析（完整版，复制自 shouhou 页面）
  async confirmSmartPaste() {
    const text = this.data.smartPasteVal.trim();
    if (!text) {
      this.showAutoToast('提示', '请输入内容');
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '智能解析中...',
      mask: true
    });
    
    try {
      // 使用腾讯地图API进行精准解析
      const { parseSmartAddress } = require('../../../utils/smartAddressParser.js');
      const result = await parseSmartAddress(text);
      
      // 🔴 调试：打印完整的解析结果
      // 构造更新数据
      let updateData = {};
      const { MUNICIPALITY_PROVINCES } = require('../../../utils/smartAddressParser.js');

      if (result.name) updateData['orderInfo.name'] = result.name;
      if (result.phone) updateData['orderInfo.phone'] = result.phone;
      
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
            updateData['detailAddress'] = result.detail.trim();
          } else if (result.address && result.address.trim()) {
            // 如果没有detail，从address中移除省市区
            let detail = result.address;
            if (result.province) detail = detail.replace(result.province, '').trim();
            if (cityForFill) detail = detail.replace(cityForFill, '').trim();
            if (districtForFill) detail = detail.replace(districtForFill, '').trim();
            updateData['detailAddress'] = detail.trim() || result.address.trim();
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
          wx.hideLoading();
      this.closeSmartPasteModal();
          this.showAutoToast('成功', '解析完成');
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
        }
      }
      
      // 🔴 修复：详细地址只填充详细部分（优先使用detail字段）
      if (result.detail && result.detail.trim()) {
        updateData['detailAddress'] = result.detail.trim();
      } else if (result.address && result.address.trim()) {
        // 如果没有detail，从address中移除省市区
        let detail = result.address;
        if (result.province) detail = detail.replace(result.province, '').trim();
        if (cityForFill) detail = detail.replace(cityForFill, '').trim();
        if (districtForFill) detail = detail.replace(districtForFill, '').trim();
        updateData['detailAddress'] = detail.trim() || result.address.trim();
      } else {
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
        
      // 关闭弹窗
        this.closeSmartPasteModal();
        
      wx.hideLoading();
      
      // 提示用户
      if (result.name && result.phone && updateData['detailAddress']) {
        this.showAutoToast('成功', '解析成功');
        } else {
        this.showAutoToast('提示', `已解析：${result.name ? '姓名✓' : ''}${result.phone ? '电话✓' : ''}${updateData['detailAddress'] ? '地址✓' : ''}`);
        }
    } catch (error) {
      console.error('[shop] 智能地址解析失败:', error);
        wx.hideLoading();
      
      // 失败时使用本地解析作为备用方案
      const result = this.parseSmartText(text);
      let updateData = {};
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
      this.closeSmartPasteModal();
      this.showAutoToast('提示', '解析完成（使用备用方案）');
    }
  },
  
  // ========================================================
  // 🔴 优化：智能文本解析（提取姓名、电话、地址）- 更精准版本
  // ========================================================
  parseSmartText(text) {
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
      const parsedAddress = this.parseAddress(addressText);
      address = parsedAddress.fullAddress || addressText;
    }
    
    return { 
      name: name.trim(), 
      phone: phone.trim(), 
      address: address.trim() 
    };
  },
  
  // ========================================================
  // 一键粘贴并自动解析地址（保留旧方法，兼容性）
  // ========================================================
  pasteAndParseAddress() {
    wx.getClipboardData({
      success: (res) => {
        const clipboardText = res.data.trim();
        if (!clipboardText) {
          this.showAutoToast('提示', '剪贴板为空');
          return;
        }
        
        // 解析地址
        const parsed = this.parseAddress(clipboardText);
        
        // 更新地址信息到 detailAddress
        this.setData({
          detailAddress: parsed.fullAddress
        });
        
        // 重新计算运费
        this.reCalcFinalPrice();
        
        // 如果解析出了省市区，可以提示用户
        if (parsed.province || parsed.city || parsed.district) {
          let msg = '地址已解析：';
          if (parsed.province) msg += parsed.province;
          if (parsed.city) msg += parsed.city;
          if (parsed.district) msg += parsed.district;
          this.showAutoToast('提示', msg);
        } else {
          this.showAutoToast('成功', '地址已粘贴');
        }
      },
      fail: () => {
        this.showAutoToast('提示', '获取剪贴板失败');
      }
    });
  },
  
  // 🔴 优化：地址解析函数（智能识别省市区）
  // ========================================================
  parseAddress(addressText) {
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

  /**
   * 下单用：合并「详细地址框 parse」+「智能粘贴写入的 orderInfo.address」+「省市区选择器」
   * 智能粘贴常把 detailAddress 收成纯门牌，省市区在 selectedProvince/City/District，不能只用 parseAddress(detailAddress)
   */
  resolveAddressForOrder() {
    const detailAddress = (this.data.detailAddress || '').trim();
    const parsedDetail = this.parseAddress(detailAddress);
    const orderAddr = (this.data.orderInfo && this.data.orderInfo.address)
      ? String(this.data.orderInfo.address).trim()
      : '';
    const parsedOrder = orderAddr ? this.parseAddress(orderAddr) : {
      province: '', city: '', district: '', detail: '', fullAddress: ''
    };
    const pSel = (this.data.selectedProvince || '').trim();
    const cSel = (this.data.selectedCity || '').trim();
    const dSel = (this.data.selectedDistrict || '').trim();

    const province = parsedDetail.province || parsedOrder.province || pSel;
    const city = parsedDetail.city || parsedOrder.city || cSel;
    const district = parsedDetail.district || parsedOrder.district || dSel;
    const detail = (parsedDetail.detail && parsedDetail.detail.trim())
      ? parsedDetail.detail.trim()
      : detailAddress;

    const seg = [province, city, district, detail].filter(s => s && String(s).trim());
    const fullAddress = seg.join(' ').trim()
      || parsedDetail.fullAddress
      || parsedOrder.fullAddress
      || orderAddr
      || detailAddress;

    return { province, city, district, detail, fullAddress };
  },
  
  // 修改 3：编辑对比表头文字
  adminEditSpecHeader(e) {
    const idx = e.currentTarget.dataset.idx; // 获取点击的是第几列 (0, 1, 2)
    const s = this.data.currentSeries;
    // 如果还没初始化数组，初始化一下
    if(!s.specHeaders) s.specHeaders = ['M1', 'M2', 'M3'];
    
    this._input(s.specHeaders[idx], (val) => {
      s.specHeaders[idx] = val;
      this.setData({ 
        currentSeries: s, 
        [`seriesList[${this.data.currentSeriesIdx}]`]: s 
      });
      this.saveSeriesToCloud(s);
    });
  },

  // ========================================================
  // 2. 修改：标题编辑 (存入当前产品的 labels 字段)
  // ========================================================
  adminEditLabel(e) {
    const key = e.currentTarget.dataset.key; // configTitle, modelTitle 等
    const s = this.data.currentSeries;
    // 初始化 labels 对象（如果旧数据没有）
    if(!s.labels) s.labels = {};
    const oldVal = s.labels[key] || '默认标题';
    
    this._input(oldVal, (val) => {
      s.labels[key] = val;
      this.setData({ 
        currentSeries: s,
        [`seriesList[${this.data.currentSeriesIdx}]`]: s 
      });
      this.saveSeriesToCloud(s);
    });
  },

  // ========================================================
  // 售前咨询（企业微信客服）
  // ========================================================
  openPreSalesCustomerService() {
    const series = this.data.currentSeries || {};
    weworkKf.openPreSalesKf({ series });
  },

  // ========================================================
  // 3. 新增：购物车逻辑
  // ========================================================
  
  // ========================================================
  // 1. 核心：加入购物车 (点击左边按钮)
  // ========================================================
  addToCart() {
    const result = this._addCurrentSelectionToCart();
    
    if (result.success) {
      // 1. 准备重置配件列表
      const resetAccList = this.data.accessoryList.map(a => ({...a, selected: false}));

      // 2. 【修改这里】调用保存函数，而不是只 setData
      this.saveCartToCache(result.newCart);
        
      this.setData({
        // 重置选中状态
        accessoryList: resetAccList,
        selectedModelIdx: -1, 
        selectedOptionIdx: -1, 
        showCartSuccess: true 
      });
    }
  },

  // ========================================================
  // 新增：成功弹窗的操作
  // ========================================================
  // 加入购物车成功弹窗：带收缩退出动画的关闭
  _closeCartSuccess(extra) {
    this.setData({ cartSuccessClosing: true });
    setTimeout(() => {
      this.setData({
        showCartSuccess: false,
        cartSuccessClosing: false,
        ...(extra || {})
      });
    }, 420); // 等待动画完成（0.4s = 400ms，加20ms缓冲）
  },

  // 继续选购
  onContinueShopping() {
    this._closeCartSuccess();
  },

  // 立即结算 (从成功弹窗跳转)
  onGoToCheckout() {
    // 打开结算前先按最新购物车金额重算，避免展示旧总价
    this.reCalcFinalPrice(this.data.cartTotalPrice);
    this._closeCartSuccess({ showOrderModal: true });
  },

  // ========================================================
  // 购物车数量增减 (适配新的数据结构)
  // ========================================================
  handleCartQty(e) {
    const idx = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    const cart = [...this.data.cart]; // 复制一份
    
    if (type === 'plus') {
      cart[idx].quantity++;
    } else {
      if (cart[idx].quantity > 1) {
        cart[idx].quantity--;
      } else {
        // 如果数量是1还减，就删掉
        cart.splice(idx, 1);
    }
    }
    
    // 更新该项的总价
    if(cart[idx]) {
      cart[idx].total = cart[idx].quantity * cart[idx].price;
    }

    // 【修改这里】立即购买会话内只改页面数据；普通结算才写入本地缓存
    if (this.data.buyNowCartSnapshot !== null) {
      const newTotal = cart.reduce((sum, item) => sum + item.total, 0);
      this.setData({ cart, cartTotalPrice: newTotal });
      this.reCalcFinalPrice(newTotal);
    } else {
      this.saveCartToCache(cart);
    }
  },

  // ========================================================
  // 修改：执行添加逻辑 (加入严谨验证)
  // ========================================================
  _addCurrentSelectionToCart() {
    const { currentSeries } = this.data;

    // 1. 验证：是否选择了型号
    if (this.data.selectedModelIdx === -1) {
      this.showCenterToast('未选购产品'); // 中间弹窗
      return { success: false };
    }

    // 2. 验证：是否选择了配置
    //    只有在当前系列"确实存在配置项"时才强制要求选择；
    //    如果该系列没有任何配置项（options 为空），则跳过此校验。
    const hasOptions = currentSeries && Array.isArray(currentSeries.options) && currentSeries.options.length > 0;
    if (hasOptions && this.data.selectedOptionIdx === -1) {
      this.showCenterToast('请选择配置'); // 中间弹窗
      return { success: false };
    }

    // ... 以下逻辑保持不变 ...
    const { selectedModelIdx, selectedOptionIdx, accessoryList } = this.data;
    const m = currentSeries.models[selectedModelIdx];
    // 如果没有配置项，或未选择配置，则使用一个“虚拟配置”，价格为 0
    const hasRealOption = hasOptions && selectedOptionIdx > -1 && currentSeries.options[selectedOptionIdx];
    const o = hasRealOption 
      ? currentSeries.options[selectedOptionIdx] 
      : { name: '默认配置', price: 0 };

    let newCart = [...this.data.cart];

    // --- 1. 处理主产品 ---
    const mainItem = {
      type: 'main',
      seriesId: currentSeries.id,
      modelName: m.name,
      optionName: o.name,
      
      // 大标题：显示型号 (如 Ultra)
      name: m.name, 
      
      // 【修改这里】副标题：只显示配置名称 (如 触控屏)
      spec: o.name,
      
      price: m.price + o.price,
      quantity: 1,
      total: m.price + o.price
    };

    // 合并逻辑
    const existingMainIdx = newCart.findIndex(item => 
      item.type === 'main' && 
      item.seriesId === mainItem.seriesId &&
      item.modelName === mainItem.modelName && 
      item.optionName === mainItem.optionName
    );

    if (existingMainIdx > -1) {
      newCart[existingMainIdx].quantity++;
      newCart[existingMainIdx].total = newCart[existingMainIdx].quantity * newCart[existingMainIdx].price;
    } else {
      mainItem.id = Date.now();
      newCart.push(mainItem);
    }

    // --- 2. 处理配件 ---
    accessoryList.forEach((acc, i) => {
      if (acc.selected) {
        const existingAccIdx = newCart.findIndex(item => 
          item.type === 'accessory' && item.name === acc.name
        );

        if (existingAccIdx > -1) {
          newCart[existingAccIdx].quantity++;
          newCart[existingAccIdx].total = newCart[existingAccIdx].quantity * newCart[existingAccIdx].price;
        } else {
          newCart.push({
            id: Date.now() + i + 200,
            type: 'accessory',
            name: acc.name,
            spec: '配件',
            price: acc.price,
            quantity: 1,
            total: acc.price
          });
        }
      }
    });

    // 计算总价
    const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);

    return { success: true, newCart, newTotal };
  },

  // 辅助：重算总购物车金额
  reCalcCartTotal(cart) {
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    this.setData({ cartTotalPrice: total });
  },

  // ========================================================
  // [修改] 错误提示使用自定义弹窗
  // ========================================================
  showError(msg) {
    // 使用自动消失提示显示错误信息
    this.showAutoToast('提示', msg);
  },

  // ========================================================
  // 新增：显示中间提示
  // ========================================================
  showCenterToast(msg) {
    this.setData({
      centerToast: { show: true, text: msg },
      centerToastClosing: false
    });
    // 1.5秒后自动消失（带收缩退出动画）
    setTimeout(() => {
      this.setData({ centerToastClosing: true });
      setTimeout(() => {
        this.setData({ 
          'centerToast.show': false,
          centerToastClosing: false
        });
      }, 420);
    }, 1500);
  },

  // ========================================================
  // 自定义加载动画方法
  // ========================================================
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

  // ========================================================
  // 商城首次进入：设备更换政策说明
  // ========================================================
  _shopExchangePolicyBlockingModal() {
    const d = this.data;
    return !!(d.showDetail || d.showAccDetail || d.showOrderModal || d.showCartSuccess ||
      d.showCustomEditModal || d.showSmartPasteModal || d.showVideoPlayer || d.showSpecsModal ||
      (d.dialog && d.dialog.show) || d.showLoadingAnimation);
  },

  /** 是否每次进商城强制预览引导：仅调试开关打开时 */
  _shouldShopGuideAlwaysForAdmin() {
    return !!SHOP_GUIDE_DEBUG_EVERY_ENTRY;
  },

  _prepareShopGuideForShow() {
    if (SHOP_GUIDE_DEBUG_EVERY_ENTRY || this._shouldShopGuideAlwaysForAdmin()) {
      this._shopExchangePolicyShownThisSession = false;
      this._shopBudgetGuideShownThisSession = false;
    }
  },

  _markShopGuideSeenIfUser(key) {
    if (SHOP_GUIDE_DEBUG_EVERY_ENTRY) return;
    if (this._shouldShopGuideAlwaysForAdmin()) return;
    try { wx.setStorageSync(key, true); } catch (e) { /* ignore */ }
  },

  _hasShopGuideSeen(key) {
    if (SHOP_GUIDE_DEBUG_EVERY_ENTRY) return false;
    if (this._shouldShopGuideAlwaysForAdmin()) return false;
    try {
      return !!wx.getStorageSync(key);
    } catch (e) {
      return false;
    }
  },

  scheduleShopExchangePolicyModal(delay = 480) {
    if (this._shopExchangePolicyShowTimer) clearTimeout(this._shopExchangePolicyShowTimer);
    this._shopExchangePolicyShowTimer = setTimeout(() => {
      this._shopExchangePolicyShowTimer = null;
      this._maybeShowShopExchangePolicyModal();
    }, delay);
  },

  scheduleShopBudgetGuideModal(delay = 480) {
    if (this._shopBudgetGuideShowTimer) clearTimeout(this._shopBudgetGuideShowTimer);
    this._shopBudgetGuideShowTimer = setTimeout(() => {
      this._shopBudgetGuideShowTimer = null;
      this._maybeShowShopBudgetGuideModal();
    }, delay);
  },

  _maybeShowShopExchangePolicyModal() {
    if (this._shopExchangePolicyShownThisSession) return;
    if (this._hasShopGuideSeen(SHOP_EXCHANGE_POLICY_SEEN_KEY)) {
      this._shopExchangePolicyShownThisSession = true;
      this.scheduleShopBudgetGuideModal(360);
      return;
    }
    if (this._shopExchangePolicyBlockingModal()) {
      if (!this._shopExchangePolicyRetryTimer) {
        this._shopExchangePolicyRetryTimer = setTimeout(() => {
          this._shopExchangePolicyRetryTimer = null;
          this._maybeShowShopExchangePolicyModal();
        }, 800);
      }
      return;
    }
    this._shopExchangePolicyShownThisSession = true;
    this.showMyDialog({
      kind: 'shop-exchange',
      title: '升级换新说明',
      showCancel: false,
      confirmText: '我明白了',
      confirmDelaySec: 5,
      success: () => {
        this._markShopGuideSeenIfUser(SHOP_EXCHANGE_POLICY_SEEN_KEY);
        this.scheduleShopBudgetGuideModal(420);
      }
    });
  },

  _maybeShowShopBudgetGuideModal() {
    if (this._shopBudgetGuideShownThisSession) return;
    if (this._hasShopGuideSeen(SHOP_BUDGET_GUIDE_SEEN_KEY)) {
      this._shopBudgetGuideShownThisSession = true;
      return;
    }
    if (this._shopExchangePolicyBlockingModal()) {
      if (!this._shopBudgetGuideRetryTimer) {
        this._shopBudgetGuideRetryTimer = setTimeout(() => {
          this._shopBudgetGuideRetryTimer = null;
          this._maybeShowShopBudgetGuideModal();
        }, 800);
      }
      return;
    }
    this._shopBudgetGuideShownThisSession = true;
    this.showMyDialog({
      kind: 'shop-budget',
      title: '怎么选配置',
      showCancel: false,
      confirmText: '开始逛逛',
      success: () => {
        this._markShopGuideSeenIfUser(SHOP_BUDGET_GUIDE_SEEN_KEY);
      }
    });
  },

  // ========================================================
  // 自定义弹窗方法
  // ========================================================
  _clearDialogConfirmDelay() {
    if (this._dialogConfirmDelayTimer) {
      clearInterval(this._dialogConfirmDelayTimer);
      this._dialogConfirmDelayTimer = null;
    }
  },

  _startDialogConfirmDelay(sec, confirmText) {
    this._clearDialogConfirmDelay();
    const label = confirmText || '确定';
    const total = Math.max(0, parseInt(sec, 10) || 0);
    if (total <= 0) {
      this.setData({
        'dialog.confirmLocked': false,
        'dialog.confirmCountdown': 0,
        'dialog.confirmBtnText': label
      });
      return;
    }
    const startedAt = Date.now();
    const paint = () => {
      const left = Math.max(0, total - Math.floor((Date.now() - startedAt) / 1000));
      if (left <= 0) {
        this._clearDialogConfirmDelay();
        this.setData({
          'dialog.confirmLocked': false,
          'dialog.confirmCountdown': 0,
          'dialog.confirmBtnText': label
        });
        return;
      }
      this.setData({
        'dialog.confirmLocked': true,
        'dialog.confirmCountdown': left,
        'dialog.confirmBtnText': `${label}（${left}）`
      });
    };
    paint();
    this._dialogConfirmDelayTimer = setInterval(paint, 200);
  },

  // 显示自定义弹窗
  showMyDialog(options) {
    this._dialogCallback = typeof options.success === 'function' ? options.success : null;
    const confirmText = options.confirmText || '确定';
    const delaySec = Math.max(0, parseInt(options.confirmDelaySec, 10) || 0);
    this._clearDialogConfirmDelay();
    this.setData({
      dialog: {
        show: true,
        kind: options.kind || '',
        title: options.title || '提示',
        content: options.content || '',
        showCancel: !!options.showCancel,
        confirmText,
        cancelText: options.cancelText || '取消',
        confirmLocked: delaySec > 0,
        confirmCountdown: delaySec,
        confirmBtnText: delaySec > 0 ? `${confirmText}（${delaySec}）` : confirmText
      }
    });
    if (delaySec > 0) {
      this._startDialogConfirmDelay(delaySec, confirmText);
    }
  },

  // 关闭自定义弹窗（带收缩退出动画）
  _closeDialogWithAnimation(callback) {
    this._clearDialogConfirmDelay();
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({
        'dialog.show': false,
        'dialog.kind': '',
        'dialog.confirmLocked': false,
        'dialog.confirmCountdown': 0,
        dialogClosing: false
      });
      if (typeof callback === 'function') {
        callback();
      }
    }, 420);
  },

  // 关闭自定义弹窗
  closeCustomDialog() {
    this._dialogCallback = null;
    this._paySuccessDialogShown = false;
    this._closeDialogWithAnimation();
  },

  dismissTransientModals() {
    // 倒计时未结束：不允许点遮罩关掉说明弹窗
    if (this.data.dialog && this.data.dialog.show && this.data.dialog.confirmLocked) {
      return;
    }
    this._dialogCallback = null;
    this._paySuccessDialogShown = false;
    this._clearDialogConfirmDelay();
    const patch = {};
    if (this.data.dialog && this.data.dialog.show) patch['dialog.show'] = false;
    if (this.data.autoToast && this.data.autoToast.show) patch['autoToast.show'] = false;
    if (Object.keys(patch).length) this.setData(patch);
  },

  /** 支付成功或离开商城 Tab：关掉 portal 上的选购配置/结算层，避免盖住订单页 */
  _dismissShopOverlaysAfterPay() {
    if (this.data.showCartSuccess) {
      this.setData({ showCartSuccess: false, cartSuccessClosing: false });
    }
    if (this.data.showAccDetail || this.data.accDetailClosing) {
      this.closeAccessoryDetail({ immediate: true });
    }
    if (this.data.showDetail) {
      this.closeDetail();
    } else if (this.data.showOrderModal || this.data.orderSheetClosing) {
      this.closeOrderModal({ skipRevert: true });
    }
    this.setData({ hasModalOpen: false });
    this.dismissTransientModals();
  },

  /** 支付成功后去枢纽「订单」Tab（个人中心看单） */
  _goToHubOrdersAfterPay() {
    this._dismissShopOverlaysAfterPay();
    const hubNav = require('../../../utils/hubNav.js');
    const pageBack = require('../../../utils/pageBack.js');
    const pages = pageBack.getPages();
    const productsIdx = pageBack.findRouteIndex('products/products');
    if (productsIdx >= 0) {
      hubNav.switchTab('orders');
      if (productsIdx < pages.length - 1) {
        setTimeout(() => {
          pageBack.safePop(pages.length - 1 - productsIdx);
        }, 120);
      }
      return;
    }
    wx.reLaunch({
      url: '/package-app/pages/products/products?hubTab=1',
      fail: () => {
        wx.reLaunch({
          url: '/package-app/pages/orders/orders',
          fail: () => {
            wx.navigateTo({ url: '/package-app/pages/orders/orders' });
          }
        });
      }
    });
  },

  _showPaySuccessNavigateDialog() {
    if (this._paySuccessDialogShown) return;
    this._paySuccessDialogShown = true;
    if (this.data.autoToast && this.data.autoToast.show) {
      this.setData({ 'autoToast.show': false, autoToastClosing: false });
    }
    this.showMyDialog({
      title: '支付成功',
      content: '是否前往个人中心查看订单？',
      showCancel: true,
      confirmText: '去个人中心',
      cancelText: '继续选购',
      success: () => {
        this._goToHubOrdersAfterPay();
      }
    });
  },

  // 点击弹窗确定
  onDialogConfirm() {
    if (this.data.dialog && this.data.dialog.confirmLocked) return;
    const cb = this._dialogCallback;
    this._dialogCallback = null;
    this._closeDialogWithAnimation(() => {
      if (cb) cb({ confirm: true });
    });
  },

  // 【新增】自动消失提示（无按钮，2秒后自动消失，带收缩退出动画）
  showAutoToast(title = '提示', content = '') {
    // 如果已有toast在显示，先关闭它
    if (this.data.autoToast.show) {
      this._closeAutoToastWithAnimation();
      // 等待关闭动画完成后再显示新的
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

  // 空函数，用于阻止事件冒泡和滚动
  noop() {},


  // ========================================================
  // 2. 修改：立即购买 (覆盖旧配置逻辑)
  // ========================================================
  openCartOrder() {
    // 情况 A: 用户正在选购某个型号 -> 立即购买（含已有购物车展示，关闭未支付则不入库）
    if (this.data.selectedModelIdx > -1) {
      const result = this._addCurrentSelectionToCart();
      if (result.success) {
        this._openBuyNowCheckout(result.newCart);
      }
      return;
    }

    // 情况 B: 没选型号，直接用已有购物车结算
    if (this.data.cart.length > 0) {
      this.reCalcFinalPrice(this.data.cartTotalPrice);
      this._openOrderSheet({ buyNowCartSnapshot: null });
      return;
    }

    this.showCenterToast('请先选择配置');
  },

  _snapshotCart(cart) {
    return JSON.parse(JSON.stringify(cart || []));
  },

  /** 立即购买：结算页展示合并后的购物车，但不立刻持久化 */
  _openBuyNowCheckout(newCart, opts = {}) {
    const snapshot = this._snapshotCart(this.data.cart);
    const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);
    const patch = {
      cart: newCart,
      cartTotalPrice: newTotal,
      buyNowCartSnapshot: snapshot
    };
    if (opts.fromAccDetail) {
      patch.accCheckoutActive = true;
      // 保留配件详情弹窗在原位，不做下滑收起；结算层直接叠在上面
      patch.showAccDetail = true;
      patch.accDetailShowPurchaseFooter = true;
    }
    this.setData(patch);
    this.reCalcFinalPrice(newTotal);
    this._openOrderSheet();
  },

  /** 关闭结算且未支付：回滚立即购买临时加购 */
  _revertBuyNowCartIfNeeded() {
    if (this.data.buyNowCartSnapshot === null) return;
    const snapshot = this.data.buyNowCartSnapshot;
    this.setData({ buyNowCartSnapshot: null });
    this.saveCartToCache(snapshot);
  },

  /** 用户确认支付：将立即购买商品正式写入购物车 */
  _commitBuyNowCart() {
    if (this.data.buyNowCartSnapshot === null) return;
    this.saveCartToCache(this.data.cart);
    this.setData({ buyNowCartSnapshot: null });
  },

  closeOrderModal(opts = {}) {
    if (!this.data.showOrderModal && !this.data.orderSheetClosing) return;
    if (this.data.orderSheetClosing) return;

    const restoreAccDetail = this.data.accCheckoutActive;
    const finish = () => {
      if (!opts.skipRevert) {
        this._revertBuyNowCartIfNeeded();
      } else {
        this.setData({ buyNowCartSnapshot: null });
      }
      const patch = {
        showOrderModal: false,
        orderSheetAnimIn: false,
        orderSheetClosing: false,
        agreedToDisclaimer: false,
        accCheckoutActive: false,
        hasModalOpen: false,
        selectedCouponIds: [],
        couponDiscountYuan: 0,
        couponSheetOpen: false,
        couponSheetClosing: false,
        couponSheetAnimIn: false,
        couponHint: ''
      };
      if (restoreAccDetail) {
        patch.showAccDetail = true;
        patch.accDetailShowPurchaseFooter = true;
      }
      this.setData(patch);
    };

    this.setData({ orderSheetAnimIn: false, orderSheetClosing: true });
    setTimeout(finish, 340);
  },

  // 修改 4：退出管理员模式

  // ========================================================
  // 6. [核心] 提交校验与组装
  // ========================================================
  submitOrder(e) {
    const { cart, orderInfo, detailAddress, finalTotalPrice, shippingFee, shippingMethod } = this.data;
    // 【未勾选免责时】点击灰色立即支付：弹出「是否阅读免责协议」确认，确认后自动打钩
    if (!this.data.agreedToDisclaimer) {
      this.setData({ 'autoToast.show': false });
      this.showMyDialog({
        title: '确认',
        content: '是否已阅读免责协议？',
        showCancel: true,
        cancelText: '取消',
        confirmText: '确认',
        success: () => {
          this.setData({ agreedToDisclaimer: true });
        }
      });
      return;
    }

    // A. 购物车校验
    if (cart.length === 0) {
      return this.showError('购物车为空');
    }

    // B. 信息校验
    if (!orderInfo.name) {
      return this.showError('请填写收货人姓名');
    }

    // 手机号 11 位校验
    if (!orderInfo.phone || !/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
      return this.showError('请输入正确的11位手机号');
    }

    // 地址校验
    if (!detailAddress || !detailAddress.trim()) {
      return this.showError('请填写详细地址');
    }

    // C. 省市区：详细地址框 + 选择器 + orderInfo.address（智能粘贴）合并后再校验
    const addr = this.resolveAddressForOrder();
    if (!addr.province && !addr.city) {
      return this.showError('请填写省、市、区');
    }

    // D. 组装完整地址字符串 (给后端和微信支付用)
    const fullAddressString = addr.fullAddress || detailAddress;

    // 更新 orderInfo 里的 address，因为之前的逻辑是读这个字段的
    const finalOrderInfo = {
      ...orderInfo,
      address: fullAddressString
    };

    // E. 运费校验（未达商城包邮条件时需有运费）
    const needShipFee = !this.data.checkoutFreeShipping;
    if (needShipFee && shippingFee === 0) {
      return this.showError('请完善地址信息以计算运费');
    }
    // 【修复】在调用支付前，重新计算最终价格，确保金额准确
    this.reCalcFinalPrice();
    const currentFinalTotalPrice = this.data.finalTotalPrice;
    const currentShippingFee = this.data.shippingFee;

    if (this.data.couponHint && (this.data.selectedCouponIds || []).length) {
      return this.showError(this.data.couponHint);
    }
    // 先关闭可能存在的自动提示，确保确认弹窗能马上显示
    this.setData({ 'autoToast.show': false });

    // G. 点击立即支付后马上弹出：定制产品不可退换，用户确认后再唤起收银台
    this.showMyDialog({
      title: '确认支付',
      content: '定制产品不支持退换服务。',
      showCancel: true,
      confirmText: '支付',
      cancelText: '取消',
      success: () => {
        this._commitBuyNowCart();
        withRepairProgressSubscribe(() => {
          this.doRealPayment(cart, finalOrderInfo, currentFinalTotalPrice, currentShippingFee, shippingMethod);
        });
      }
    });
  },

  // ========================================================
  // 真实支付流程
  // ========================================================
  doRealPayment(cart, orderInfo, finalTotalPrice, shippingFee, shippingMethod) {
    // 如果没有传入参数，则从 this.data 读取（兼容旧调用）
    if (!cart) {
      const data = this.data;
      cart = data.cart;
      orderInfo = data.orderInfo;
      finalTotalPrice = data.finalTotalPrice;
      shippingFee = data.shippingFee;
      shippingMethod = data.shippingMethod;
    }
    // 【新增】仅管理员身份支付 0.01 元（普通用户按真实金额）
    const isAdminPay = this.data.isAdmin;
    let payAmount = finalTotalPrice;
    if (isAdminPay) {
      payAmount = 0.01;
    }

    // 【新增】检查支付金额
    if (!payAmount || payAmount <= 0 || isNaN(payAmount)) {
      console.error('[doRealPayment] 金额异常:', payAmount);
      this.showAutoToast('支付失败', `订单金额异常（${payAmount}），请重新选择商品`);
      return;
    }
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
      console.error('[doRealPayment] 获取用户昵称失败:', e);
    }

    // 3. 调用云函数（金额由云端按库价重算；附带省市区便于顺丰运费一致）
    let addressPayload = orderInfo;
    try {
      const a = this.resolveAddressForOrder();
      addressPayload = { ...(orderInfo || {}), province: a.province, city: a.city, district: a.district };
    } catch (e) {
      addressPayload = { ...(orderInfo || {}), province: this.data.selectedProvince, city: this.data.selectedCity, district: this.data.selectedDistrict };
    }
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: payAmount,
        goods: cart,
        addressData: addressPayload,
        shippingFee: this.data.isAdmin ? 0 : shippingFee,
        shippingMethod: shippingMethod,
        orderSource: 'shop',
        userNickname: userNickname, // 🔴 传递用户昵称
        repairId: (() => {
          let r = (this.data.repairId || '').toString().trim();
          if (r) return r;
          try {
            r = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
          } catch (e) {}
          return r;
        })(),
        couponIds: typeof this.getSelectedCouponIdsForOrder === 'function'
          ? this.getSelectedCouponIdsForOrder()
          : []
      },
      success: res => {
        this.hideMyLoading();
        const payment = res.result;
        // 【新增检测】检查云函数返回的错误
        if (payment && payment.error) {
          console.error('[doRealPayment] 云函数返回错误:', payment);
          this.showAutoToast('支付失败', payment.msg || '支付系统异常，请稍后再试');
          return;
        }

        if (!payment || !payment.paySign) {
          console.error('[doRealPayment] 支付参数缺失:', payment);
          // 如果这里报错，通常是商户号审核还没过
          this.showAutoToast('提示', '支付系统对接中，请稍后再试');
          return;
        }
        // 4. 唤起微信原生支付界面
        wx.requestPayment({
          ...payment,
          success: (payRes) => {
            this.closeAccessoryDetail({ immediate: true });
            this.closeOrderModal({ skipRevert: true });
            this._dismissShopOverlaysAfterPay();

            // 🔴 如果是从维修单跳转过来的，更新维修单状态
            let repairId = (this.data.repairId || '').toString().trim();
            if (!repairId) {
              try {
                repairId = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
              } catch (e) {}
            }
            const orderIdPatch = payment.outTradeNo;
            if (orderIdPatch && repairId) {
              this._pendingPayCtx = {
                orderId: orderIdPatch,
                repairId,
                cart: cart || [],
                addr: orderInfo || this.data.orderInfo || {}
              };
            }

            wx.setStorageSync('last_address', this.data.orderInfo);
            this._cartClearedAfterPay = false;

            const orderId = payment.outTradeNo;
            if (orderId) {
              this.startPaymentVerification(orderId, {
                clearCartOnConfirm: true,
                finalizeRepairParts: !!(orderIdPatch && repairId)
              });
            }

            setTimeout(() => this._showPaySuccessNavigateDialog(), 280);
          },
          fail: (err) => {
            console.error('[doRealPayment] 支付失败:', err);
            this._handleShopPaymentCancelled(payment);
          }
        });
      },
      fail: err => {
        console.error('[doRealPayment] 云函数调用失败:', err);
        this.hideMyLoading();
        this.showAutoToast('创建订单失败', err.errMsg || '网络错误，请重试');
      }
    });
  },

  _clearCartAfterPaid() {
    if (this._cartClearedAfterPay) return;
    this._cartClearedAfterPay = true;
    this.setData({ cart: [], cartTotalPrice: 0 });
    try {
      wx.removeStorageSync('my_cart');
      this.saveCartToCache([]);
    } catch (e) {}
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
      fail: (err) => console.error('[doRealPayment] writeShouhouguoqi:', err)
    });
    try {
      wx.removeStorageSync('guided_parts_repair_id');
    } catch (e) {}
  },

  startPaymentVerification(orderId, opts = {}) {
    if (!orderId) return;
    const baseOpts = {
      maxAttempts: 6,
      intervalMs: 2500,
      showLoading: true,
      silent: false,
      clearCartOnConfirm: !!opts.clearCartOnConfirm,
      finalizeRepairParts: !!opts.finalizeRepairParts
    };
    this.callCheckPayResult(orderId, 1, baseOpts);
    // 第二段：延迟复查，覆盖回调慢/网络抖动导致的漏检
    const clearCartOnConfirm = !!opts.clearCartOnConfirm;
    const finalizeRepairParts = !!opts.finalizeRepairParts;
    setTimeout(() => {
      this.callCheckPayResult(orderId, 1, {
        maxAttempts: 4,
        intervalMs: 3000,
        showLoading: false,
        silent: true,
        clearCartOnConfirm,
        finalizeRepairParts
      });
    }, 12000);
    setTimeout(() => {
      this.callCheckPayResult(orderId, 1, {
        maxAttempts: 3,
        intervalMs: 3500,
        showLoading: false,
        silent: true,
        clearCartOnConfirm,
        finalizeRepairParts
      });
    }, 28000);
  },

  callCheckPayResult(orderId, attempt = 1, options = {}) {
    if (!orderId) return;
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
        if (result.success) {
          this._dismissShopOverlaysAfterPay();
          if (options.clearCartOnConfirm) {
            this._clearCartAfterPaid();
          }
          if (options.finalizeRepairParts && this._pendingPayCtx) {
            this._syncRepairPartsAfterPaid(this._pendingPayCtx);
            this._pendingPayCtx = null;
          }
          if (!silent && !this._paySuccessDialogShown && !(this.data.dialog && this.data.dialog.show)) {
            this.showAutoToast('成功', '订单已确认');
          }
        } else if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1, options), intervalMs);
        } else if (!silent && !this._paySuccessDialogShown) {
          this.showAutoToast('提示', result.msg || '支付状态待确认，请稍后在"我的订单"查看');
        }
      },
      fail: (err) => {
        console.error('[callCheckPayResult] 调用失败:', err);
        if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1, options), intervalMs);
        } else if (!silent) {
          this.showAutoToast('提示', '网络异常，请稍后在"我的订单"查看');
        }
      },
      complete: () => {
        if (showLoading) {
          this.hideMyLoading();
        }
      }
    });
  },

  // ========================================================
  // [新增] 清空购物车
  // ========================================================
  clearCart() {
    this.showMyDialog({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      showCancel: true,
      confirmText: '清空',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清空购物车数据
          this.setData({
            cart: [],
            cartTotalPrice: 0,
            finalTotalPrice: 0,
            shippingFee: 0,
            buyNowCartSnapshot: null
          });
          // 清空本地存储
          wx.removeStorageSync('my_cart');
          this.showAutoToast('成功', '已清空');
        }
      }
    });
  },

  // ========================================================
  // 5. [核心] 运费与总价计算逻辑（从详细地址解析省市区）
  // ========================================================
  /** 购物车是否仅含配件（无主机） */
  _cartIsAccessoryOnly(cart) {
    const list = cart || this.data.cart || [];
    if (!list.length) return false;
    if (list.some((item) => item && item.type === 'main')) return false;
    return list.every((item) => item && item.type === 'accessory');
  },

  /** 商城包邮：仅配件，或商品金额合计 > 50 元 */
  _shopQualifiesFreeShipping(cart, goodsSubtotal) {
    if (this._cartIsAccessoryOnly(cart)) return true;
    return (Number(goodsSubtotal) || 0) > 50;
  },

  /** 顺丰：省内 13 / 省外 22 */
  _provinceShippingFee(province) {
    const p = (province || '').trim();
    if (!p) return 0;
    if (p.indexOf('广东') > -1) return 13;
    return 22;
  },

  /** 商城仅配件 + 中通：省内 12 / 省外 15 */
  _ztoAccessoryShippingFee(province) {
    const p = (province || '').trim();
    if (!p) return 0;
    if (p.indexOf('广东') > -1) return 12;
    return 15;
  },

  _resolveProvinceForShipping() {
    const { detailAddress } = this.data;
    if (!detailAddress || !String(detailAddress).trim()) return '';
    return (this.resolveAddressForOrder().province || '').trim();
  },

  reCalcFinalPrice(goodsPrice = this.data.cartTotalPrice) {
    const { shippingMethod } = this.data;
    const cart = this.data.cart || [];
    const freeShipping = this._shopQualifiesFreeShipping(cart, goodsPrice);
    const province = this._resolveProvinceForShipping();
    let fee = 0;

    if (!freeShipping) {
      if (shippingMethod === 'zto') {
        fee = this._ztoAccessoryShippingFee(province);
      } else if (shippingMethod === 'sf') {
        fee = this._provinceShippingFee(province);
      }
    }

    const subtotal = this._roundMoney ? this._roundMoney(goodsPrice + fee) : Math.round((goodsPrice + fee) * 100) / 100;
    const couponPatch = typeof this.patchFinalPriceWithCoupons === 'function'
      ? this.patchFinalPriceWithCoupons(subtotal)
      : { finalTotalPrice: subtotal };

    this.setData({
      shippingFee: fee,
      cartTotalPrice: goodsPrice,
      checkoutFreeShipping: freeShipping,
      ...couponPatch
    });
  },

  // ========================================================
  // [新增] 切换快递方式
  // ========================================================
  changeShipping(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({ shippingMethod: method });
    this.reCalcFinalPrice();
  },

  // ========================================================
  // [新增] 加载省份列表（省市区选择器）
  // ========================================================
  loadProvinceList() {
    // 🔴 优化：先检查缓存，避免频繁调用API
    const cachedProvinceList = wx.getStorageSync('province_list');
    const cacheTime = wx.getStorageSync('province_list_time') || 0;
    const now = Date.now();
    const cacheValidTime = 24 * 60 * 60 * 1000; // 24小时有效期
    
    // 如果缓存存在且未过期，直接使用
    if (cachedProvinceList && cachedProvinceList.length > 0 && (now - cacheTime) < cacheValidTime) {
      this.setData({
        provinceList: cachedProvinceList
      });
      return;
    }
    
    // 如果缓存过期，清除旧缓存
    if (cachedProvinceList && (now - cacheTime) >= cacheValidTime) {
      wx.removeStorageSync('province_list');
      wx.removeStorageSync('province_list_time');
    }
    
    // 🔴 修复：如果API配额用完，直接使用本地数据，不调用API
    // 先尝试使用默认省份列表（不依赖API）
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
    wx.setStorageSync('province_list_time', Date.now());
    
    this.setData({
      provinceList: defaultProvinces
    });
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

  // [新增] 区县选择变化
  onDistrictChange(e) {
    const index = parseInt(e.detail.value, 10);
    const district = this.data.districtList[index];
    if (!district) return;

    this.setData({
      districtIndex: index,
      selectedDistrict: district.name
    });
    this.reCalcFinalPrice();
  },

  // [新增] 加载城市列表
  loadCityList(provinceId) {
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
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
          const provincePrefix = String(provinceId).substring(0, 2);
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
          const districtList = (res.result[0] || []).map(d => ({
            id: d.id,
            name: d.fullname || d.name
          }));
          wx.setStorageSync(cacheKey, districtList);
          this.setData({ districtList });
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

  // 智能粘贴：按省加载城市并匹配市、区（与 shouhou 页逻辑一致，供 confirmSmartPaste 回调调用）
  loadCityListForSmartPaste(provinceId, targetCity, targetDistrict) {
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
      this.setData({ cityList: cachedCityList });
      if (targetCity) {
        let cityIndex = cachedCityList.findIndex(c => c.name === targetCity);
        if (cityIndex === -1) {
          const cityName = targetCity.replace('市', '').replace('自治州', '').replace('地区', '');
          cityIndex = cachedCityList.findIndex(c => {
            const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
            return cName === cityName;
          });
        }
        if (cityIndex === -1) {
          const cityName = targetCity.replace('市', '');
          cityIndex = cachedCityList.findIndex(c =>
            c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''))
          );
        }
        if (cityIndex !== -1) {
          wx.nextTick(() => {
            this.setData({
              cityIndex,
              selectedCity: cachedCityList[cityIndex].name
            }, () => {
              if (cachedCityList[cityIndex].id && targetDistrict) {
                this.loadDistrictListForSmartPaste(cachedCityList[cityIndex].id, targetDistrict);
              }
            });
          });
        } else {
          this.setData({ selectedCity: targetCity });
        }
      }
      return;
    }

    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          const allCities = res.result[1] || [];
          const provincePrefix = String(provinceId).substring(0, 2);
          const cityList = allCities
            .filter(c => String(c.id || '').substring(0, 2) === provincePrefix)
            .map(c => ({ id: c.id, name: c.fullname || c.name }));
          wx.setStorageSync(cacheKey, cityList);
          this.setData({ cityList });
          this._matchCityAfterSmartPasteLoad(cityList, targetCity, targetDistrict);
        } else {
          this._loadCityListForSmartPasteFallback(provinceId, targetCity, targetDistrict, cacheKey);
        }
      },
      fail: () => {
        this._loadCityListForSmartPasteFallback(provinceId, targetCity, targetDistrict, cacheKey);
      }
    });
  },

  _loadCityListForSmartPasteFallback(provinceId, targetCity, targetDistrict, cacheKey) {
    qqmapsdkDistrict.getDistrictByCityId({
      id: provinceId,
      success: (res2) => {
        if (res2.status === 0 && res2.result && res2.result.length > 0) {
          const cities = res2.result[0] || [];
          const cityList = cities.map(c => ({ id: c.id, name: c.fullname || c.name }));
          wx.setStorageSync(cacheKey, cityList);
          this.setData({ cityList });
          this._matchCityAfterSmartPasteLoad(cityList, targetCity, targetDistrict);
        }
      },
      fail: (err) => {
        console.error('[shop] 智能粘贴加载城市失败:', err);
        if (targetCity) {
          this.setData({ selectedCity: targetCity, cityList: [] });
        }
      }
    });
  },

  _matchCityAfterSmartPasteLoad(cityList, targetCity, targetDistrict) {
    if (!targetCity || !cityList || !cityList.length) return;
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
      cityIndex = cityList.findIndex(c =>
        c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''))
      );
    }
    if (cityIndex !== -1) {
      wx.nextTick(() => {
        this.setData({
          cityIndex,
          selectedCity: cityList[cityIndex].name
        }, () => {
          if (cityList[cityIndex].id && targetDistrict) {
            this.loadDistrictListForSmartPaste(cityList[cityIndex].id, targetDistrict);
          }
        });
      });
    } else {
      this.setData({ selectedCity: targetCity });
    }
  },

  loadDistrictListForSmartPaste(cityId, targetDistrict) {
    qqmapsdkDistrict.getDistrictByCityId({
      id: cityId,
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 0) {
          const districts = res.result[0] || [];
          const districtList = districts.map(d => ({
            id: d.id,
            name: d.fullname || d.name
          }));
          this.setData({ districtList });
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
                districtIndex,
                selectedDistrict: districtList[districtIndex].name
              });
            }
          }
        }
      },
      fail: (err) => {
        console.error('[shop] 智能粘贴加载区县失败:', err);
        this.setData({ districtList: [] });
      }
    });
  },

  // ========================================================
  // [新增] 提交定制需求 (只下单不支付)
  // ========================================================
  // 定制单提交逻辑 (同理修改校验)
  submitCustomOrder() {
    const { cart, orderInfo, detailAddress, finalTotalPrice, shippingFee, shippingMethod } = this.data;

    if (cart.length === 0) return this.showError('购物车为空');
    if (!orderInfo.name) return this.showError('请填写姓名');
    if (!/^1[3-9]\d{9}$/.test(orderInfo.phone)) return this.showError('手机号格式错误');
    if (!detailAddress || !detailAddress.trim()) return this.showError('请完善收货地址');

    const addr = this.resolveAddressForOrder();
    if (!addr.province && !addr.city) {
      return this.showError('请填写省、市、区');
    }
    const fullAddressString = addr.fullAddress || detailAddress;
    const finalOrderInfo = { ...orderInfo, address: fullAddressString };

    this.showMyDialog({
      title: '提交定制需求',
      content: '订单将提交给管理员进行核价。',
      showCancel: true,
      confirmText: '提交',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this._commitBuyNowCart();
          this.showMyLoading('提交中...');
          let saveAddr = finalOrderInfo;
          try {
            const a = this.resolveAddressForOrder();
            saveAddr = { ...(finalOrderInfo || {}), province: a.province, city: a.city, district: a.district };
          } catch (e) {}
          wx.cloud.callFunction({
            name: 'createOrder',
            data: {
              action: 'save_only',
              totalPrice: finalTotalPrice,
              goods: cart,
              addressData: saveAddr,
              shippingFee: shippingFee,
              shippingMethod: shippingMethod
            },
            success: () => {
              this.hideMyLoading();
              this.showAutoToast('成功', '提交成功');
              this.closeOrderModal({ skipRevert: true });
              wx.removeStorageSync('my_cart');
              this.setData({ cart: [], cartTotalPrice: 0 });
              wx.navigateTo({ url: '/package-app/pages/orders/orders', animationType: 'none' });
            },
            fail: () => {
              this.hideMyLoading();
              this.showError('提交失败');
            }
          });
        }
      }
    });
  },

  // ========================================================
  // [新增] 辅助函数：更新购物车并保存到本地缓存
  // ========================================================
  saveCartToCache(newCart) {
    // 1. 算总价
    const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);
    
    // 2. 更新页面显示
    this.setData({
      cart: newCart,
      cartTotalPrice: newTotal
    });
    // 3. 同步更新最终应付价（含运费），保证结算弹窗实时显示
    this.reCalcFinalPrice(newTotal);

    // 4. 【关键】存入本地缓存 (持久化)
    wx.setStorageSync('my_cart', newCart);
  },

  // ========================================================
  // 4. 修改：对比逻辑 (先选后对比)
  // ========================================================
  
  // 切换对比选择模式
  toggleModelCompareMode() {
    const mode = !this.data.isModelCompareMode;
    const clearedModels = (this.data.currentSeries.models || []).map(m => ({
      ...m,
      isCompareChecked: false
    }));
    const clearedSeries = { ...this.data.currentSeries, models: clearedModels };

    this.setData({
      isModelCompareMode: mode,
      currentSeries: clearedSeries,
      [`seriesList[${this.data.currentSeriesIdx}].models`]: clearedModels,
      compareSelectedModels: [],
      compareGuidePhase: mode ? 1 : 0,
      compareGuidePhase2HintVisible: false,
      showFooterBar: false
    }, () => {
      this._clearCompareGuideTimers();
      if (mode) {
        this._teardownDetailFooterIO();
      } else {
        this._scheduleDetailFooterAnchorMeasure();
      }
    });
  },

  // ========================================================
  // 1. 选择型号 (核心分流逻辑)
  // ========================================================
  selectModel(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const s = this.data.currentSeries;

    // --- A. 如果是对比模式 ---
    if (this.data.isModelCompareMode) {
      if (!Number.isFinite(idx) || idx < 0 || !s.models || idx >= s.models.length) {
        return;
      }

      const newCheckedState = !s.models[idx].isCompareChecked;
      const updatedModels = s.models.map((m, i) => {
        if (i === idx) {
          return { ...m, isCompareChecked: newCheckedState };
        }
        return m;
      });
      const selected = updatedModels.filter(m => !!m.isCompareChecked);
      const updatedSeries = { ...s, models: updatedModels };

      this.setData({
        currentSeries: updatedSeries,
        [`seriesList[${this.data.currentSeriesIdx}].models`]: updatedModels,
        compareSelectedModels: selected,
        compareGuidePhase: selected.length >= 2 ? 2 : 1
      });

    } else {
      // --- B. 正常选购模式 ---
      // 点击选中/取消选中
      const newIdx = (this.data.selectedModelIdx === idx) ? -1 : idx;
      this.setData({ 
        selectedModelIdx: newIdx
      });
      this.calcTotal();
    }
  },

  // ========================================================
  // 3. 点击"查看对比结果"按钮 (用户专用)
  // ========================================================
  startCompare() {
    this._clearCompareGuideTimers();
    this.openSpecsModal();
  },

  // 🔴 检查封禁状态
  async checkBanStatus() {
    const now = Date.now();
    if (this._lastBanCheckAt && (now - this._lastBanCheckAt < 15 * 1000)) {
      return;
    }
    this._lastBanCheckAt = now;
    try {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();
      
      // 🔴 关键修复：先检查是否是管理员，管理员豁免封禁检查
      const adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        return; // 管理员直接返回，不检查封禁状态
      }
      
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const rawFlag = btn.isBanned;
        const isBanned = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
        
        if (isBanned) {
          const banType = btn.banReason === 'screenshot' || btn.banReason === 'screen_record' 
            ? 'screenshot' 
            : (btn.banReason === 'location_blocked' ? 'location' : 'banned');
          wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
          return;
        }
      }
    } catch (err) {
      const msg = (err.errMsg || err.message || '') + '';
      if (msg.indexOf('access_token') !== -1) {
        return;
      }
      console.error('[shop] 检查封禁状态失败:', err);
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
        success: () => {}
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

  // 注意：onShow 方法已在上面定义，这里删除重复定义

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
      console.error('[shop] 获取位置信息失败:', err);
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
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'shop',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
      },
      fail: (err) => {
        console.error('[shop] ⚠️ 设置封禁状态失败:', err);
      }
    });

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'shop',
          ...locationData
        },
        success: (res) => {
        },
        fail: (err) => {
          console.error('[shop] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[shop] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        wx.exitMiniProgram();
      }
    });
  }
  };
  Object.assign(pageConfig, checkoutCouponMixin.methods);
  return pageConfig;
};