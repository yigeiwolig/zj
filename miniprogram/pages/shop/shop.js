// pages/shop/shop.js
// 🔴 性能优化：关闭调试日志（生产环境）
const DEBUG = false; // 设为 false 关闭所有 console.log，设为 true 开启调试
const log = DEBUG ? console.log.bind(console) : () => {};

const app = getApp();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
// 🔴 使用专门的行政区key（用于省市区选择器 - getCityList）
const MAP_KEY = 'CGRBZ-FLLLL-CNCPC-MQ6YK-YENYT-2MFCD'; // 行政区key（专门用于省市区选择器）
console.log('[shop] ✅ 初始化腾讯地图SDK（城市列表），使用的key:', MAP_KEY);
var qqmapsdk = new QQMapWX({
    key: MAP_KEY
});

// 🔴 使用专门的行政区划子key（用于区县选择器 - getDistrictByCityId）
const DISTRICT_KEY = 'ICRBZ-VEELI-CQZGO-UE5G6-BHRMS-VQBIK'; // 行政区划子key（专门用于区县选择器）
console.log('[shop] ✅ 初始化腾讯地图SDK（区县列表），使用的key:', DISTRICT_KEY);
var qqmapsdkDistrict = new QQMapWX({
    key: DISTRICT_KEY
});

Page({
  data: {
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式

    // 🔴 屏幕适配：状态栏和导航栏高度
    statusBarHeight: 20,  // 状态栏高度（px）
    navBarHeight: 44,     // 导航栏高度（px）

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

    // 新增：自定义编辑弹窗状态
    showCustomEditModal: false,
    customEditTitle: '',
    customEditVal: '',
    customEditCallback: null,

    // 新增：对比选择模式
    isModelCompareMode: false,
    compareSelectedModels: [],

    // 顶部媒体资源 (混合图片和视频)
    topMediaList: [],

    // 商店标题
    shopTitle: 'MT 配件中心',

    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },
    
    // 【新增】自定义操作菜单
    actionSheet: { show: false, itemList: [], callback: null },

    // 🔴 新增：视频播放状态跟踪（用于控制播放按钮显示）
    heroVideoPlaying: {}, // {0: true, 1: false, ...} 跟踪每个hero视频的播放状态
    detailVideoPlaying: {}, // {0: true, 1: false, ...} 跟踪每个detail视频的播放状态

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
    selectedModelIdx: -1,   // 选中的型号索引 (初始为 -1，未选中状态)
    selectedOptionIdx: -1,  // 选中的配置索引 (初始为 -1，未选中状态)
    totalPrice: 0,          // 总价

    // 弹窗控制开关
    showDetail: false,      // 产品选购主弹窗
    showAccDetail: false,   // 配件详情弹窗
    currentAccIdx: -1,      // 当前查看的配件索引
    showSpecsModal: false,  // 对比表格弹窗
    showOrderModal: false,  // 订单弹窗
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

    // 新增：记录通过"立即购买"添加的临时商品ID，用于覆盖
    tempBuyItemIds: [],

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

    // 新增：媒体区域的实际高度
    mediaHeight: 0,

    // 自定义弹窗
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },

    // Loading 状态（使用和 index.js 一样的白色背景进度条动画）
    showLoadingAnimation: false,
    loadingText: '加载中...'
  },

  onLoad(options) {
    console.log('[shop.js] onLoad 开始', options);
    
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('shop');
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();
    
    // 🔴 检查封禁状态（确保重启后也能拦截）
    this.checkBanStatus();
    
    // 使用 app.js 中已初始化的云开发（不需要重复初始化）
    if (wx.cloud) {
      // 直接获取数据库实例（app.js 中已初始化）
      this.db = wx.cloud.database();
      console.log('[shop.js] 获取数据库实例, db:', this.db);
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
      console.log('[shop.js] 接收到跳转号码:', this.jumpNumber);
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
          
          console.log('[shop.js] 从维修单跳转，需要购买的配件:', partsList);
        } catch (e) {
          console.error('[shop.js] 解析配件信息失败:', e);
        }
      }
    }

    // 🔴 计算屏幕适配信息（状态栏和导航栏高度）
    this.calcNavBarInfo();

    // 立即加载数据
    this.loadDataFromCloud();
    this.calcTotal();
    
    // 🔴 加载省份列表（省市区选择器）
    this.loadProvinceList();
  },

  // 🔴 新增：页面隐藏时清理拖拽状态
  onHide() {
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

  // 1. 页面每次显示时，读取本地缓存的购物车
  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    
    // 🔴 重新检查管理员权限（确保从其他页面返回时也能显示开关）
    this.checkAdminPrivilege();
    
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
    
    // 🔴 页面显示时，如果缓存超过5分钟，后台刷新数据
    const cache = this.ensureShopDataCache();
    if (cache.cacheTime && (Date.now() - cache.cacheTime > 5 * 60 * 1000)) {
      console.log('[shop.js] 缓存已过期，后台刷新数据...');
      this.loadDataFromCloudBackground();
    }
  },
  
  onReady() {
    // 页面渲染完成后执行
    console.log('[shop.js] onReady 页面渲染完成');
  },

  // ========================================================
  // 返回上一页
  // ========================================================
  goBack() {
    console.log('[shop.js] goBack 被调用, fromOtherPage:', this.fromOtherPage);
    
    const pages = getCurrentPages();
    console.log('[shop.js] 页面栈长度:', pages.length);
    
    // 检查页面栈中是否有products页面
    const productsPageIndex = pages.findIndex(page => {
      const route = page.route || '';
      return route.includes('products/products');
    });
    
    if (productsPageIndex >= 0) {
      // 如果页面栈中有products页面，计算需要返回的层数
      const delta = pages.length - 1 - productsPageIndex;
      console.log('[shop.js] 找到products页面，在栈中位置:', productsPageIndex, '需要返回层数:', delta);
      wx.navigateBack({ delta: delta });
      return;
    }
    
    // 如果页面栈中没有products页面，但有上一页，正常返回
    if (pages.length > 1) {
      console.log('[shop.js] 返回上一页');
      wx.navigateBack();
    } else {
      // 如果没有上一页，跳转到products页面（这种情况应该很少见）
      console.log('[shop.js] 没有上一页，跳转到products页面');
      wx.redirectTo({
        url: '/pages/products/products'
      });
    }
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
    this._input(this.data.shopTitle || 'MT 配件中心', (val) => {
      this.setData({ shopTitle: val });
      this.saveShopTitleToCloud(val);
    });
  },
  
  // ========================================================
  // 保存商店标题到云端
  // ========================================================
  saveShopTitleToCloud(title) {
    console.log('[shop.js] saveShopTitleToCloud 开始, title:', title);
    if (!this.db) {
      console.error('[shop.js] saveShopTitleToCloud: this.db 不存在！');
      return;
    }
    this.db.collection('shop_config').doc('shopTitle').update({
      data: { title: title }
    }).then(() => {
      console.log('[shop.js] saveShopTitleToCloud 更新成功');
    }).catch(err => {
      console.error('[shop.js] saveShopTitleToCloud 更新失败:', err);
      // 如果文档不存在，创建新文档
      const errMsg = err.errMsg || '';
      if (err.errCode === -502005 || err.errCode === -502002 || err.errCode === -502007 || 
          errMsg.includes('cannot find document') || errMsg.includes('not exist')) {
        console.log('[shop.js] 文档不存在，尝试创建 shop_config.shopTitle');
        this.db.collection('shop_config').doc('shopTitle').set({
          data: { title: title }
        }).then(() => {
          console.log('[shop.js] saveShopTitleToCloud 创建成功');
        }).catch(createErr => {
          console.error('[shop.js] saveShopTitleToCloud 创建失败:', createErr);
        });
      }
    });
  },
  // ================== 权限检查逻辑 ==================
  // 🔴 计算导航栏信息（屏幕适配）
  calcNavBarInfo() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo(); 
    const statusBarHeight = windowInfo.statusBarHeight;
    const gap = menuButton.top - statusBarHeight;
    const navBarHeight = (gap * 2) + menuButton.height;
    this.setData({ statusBarHeight, navBarHeight });
    console.log('[shop.js] 屏幕适配信息:', { statusBarHeight, navBarHeight, gap, menuButtonHeight: menuButton.height });
  },

  async checkAdminPrivilege() {
    try {
      // 1. 获取当前用户的 OpenID (利用云函数)
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      console.log('[shop.js] 当前用户 OpenID:', myOpenid);

      // 2. 去数据库比对白名单
      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({
        openid: myOpenid
      }).get();

      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }

      console.log('[shop.js] 管理员查询结果:', adminCheck.data);

      // 3. 如果找到了记录，说明你是受信任的管理员
      if (adminCheck.data.length > 0) {
        this.setData({ isAuthorized: true });
        console.log('[shop.js] ✅ 身份验证成功：合法管理员，EDIT 开关已显示');
    } else {
        this.setData({ isAuthorized: false });
        console.log('[shop.js] ❌ 未在管理员白名单中，EDIT 开关已隐藏');
      }
    } catch (err) {
      console.error('[shop.js] ❌ 权限检查失败:', err);
      // 即使失败，也确保状态正确
      this.setData({ isAuthorized: false });
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this.showAutoToast('提示', '无权限');
      return;
    }
    
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    
    this.showAutoToast('提示', nextState ? '管理模式开启' : '已回到用户模式');
  },

  // ========================================================
  // 1. 核心修改：重写 _input 方法，使用自定义弹窗代替 wx.showModal
  // ========================================================
  _input(currentVal, callback) {
    this.setData({
      showCustomEditModal: true,
      customEditTitle: '编辑内容',
      customEditVal: currentVal,
      customEditCallback: callback // 暂存回调函数
    });
  },
  
  // 弹窗输入监听
  onCustomEditInput(e) { this.setData({ customEditVal: e.detail.value }); },
  
  // 弹窗取消（带收缩退出动画）
  closeCustomEditModal() {
    this.setData({ customModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showCustomEditModal: false, 
        customEditCallback: null,
        customModalClosing: false
      });
    }, 420);
  },
  
  // 弹窗确定
  confirmCustomEdit() {
    if (this.data.customEditCallback) {
      this.data.customEditCallback(this.data.customEditVal);
    }
    this.closeCustomEditModal();
  },

  // ========================================================
  // 云存储上传函数
  // ========================================================
  uploadToCloud(path, folder = 'shop') {
    console.log('[shop.js] uploadToCloud 开始, path:', path, 'folder:', folder);
    return new Promise((resolve, reject) => {
      if (!wx.cloud) {
        console.error('[shop.js] uploadToCloud: wx.cloud 不存在！');
        reject(new Error('wx.cloud 不存在'));
        return;
      }
      const suffix = path.match(/\.[^.]+?$/)?.[0] || '.png';
      const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${suffix}`;
      console.log('[shop.js] 上传到云存储, cloudPath:', cloudPath);
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: path,
        success: res => {
          console.log('[shop.js] 上传成功, fileID:', res.fileID);
          resolve(res.fileID);
        },
        fail: err => {
          console.error('[shop.js] 上传失败:', err);
          reject(err);
        }
      });
    });
  },

  // 统一选择并裁切图片（如果支持裁切）
  chooseImageWithCrop() {
    return new Promise((resolve, reject) => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempPath = res.tempFiles[0].tempFilePath;
          if (wx.cropImage) {
            wx.cropImage({
              src: tempPath,
              cropScale: '1:1',
              success: (cropRes) => resolve(cropRes.tempFilePath),
              fail: () => resolve(tempPath) // 裁切失败则用原图
            });
          } else {
            resolve(tempPath);
          }
        },
        fail: (err) => {
          console.error('[shop.js] chooseImageWithCrop 选择失败:', err);
          reject(err);
        }
      });
    });
  },

  // 已有路径的图片再裁切（不重新选择）
  cropImageIfPossible(tempPath) {
    return new Promise((resolve) => {
      if (!wx.cropImage) return resolve(tempPath);
      wx.cropImage({
        src: tempPath,
        cropScale: '1:1',
        success: (cropRes) => resolve(cropRes.tempFilePath),
        fail: () => resolve(tempPath)
      });
    });
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
        seriesList: null,
        accessoryList: null,
        cacheTime: null,
        isLoading: false
      };
    }
    return app.globalData.shopDataCache;
  },

  loadDataFromCloud() {
    console.log('[shop.js] ========================================');
    console.log('[shop.js] ========== loadDataFromCloud 开始 ==========');
    console.log('[shop.js] ========================================');
    
    // 🔴 确保缓存对象存在
    const cache = this.ensureShopDataCache();
    
    // 🔴 优先使用缓存数据，立即显示，提升用户体验
    if (cache && cache.cacheTime && (Date.now() - cache.cacheTime < 5 * 60 * 1000)) {
      console.log('[shop.js] ✅ 使用预加载的缓存数据，立即显示');
      
      if (cache.shopTitle) {
        this.setData({ shopTitle: cache.shopTitle });
        console.log('[shop.js] 从缓存加载 shopTitle:', cache.shopTitle);
      }
      
      if (cache.topMediaList) {
        this.setData({ topMediaList: cache.topMediaList });
        console.log('[shop.js] 从缓存加载 topMediaList, 数量:', cache.topMediaList.length);
      }
      
      if (cache.seriesList) {
        this.setData({ seriesList: cache.seriesList });
        console.log('[shop.js] 从缓存加载 seriesList, 数量:', cache.seriesList.length);
        
        // 如果有跳转号码，立即跳转到对应产品
        if (this.jumpNumber) {
          wx.nextTick(() => {
            this.jumpToProductByNumber(this.jumpNumber);
          });
        }
      }
      
      if (cache.accessoryList) {
        // 强制把所有配件设为"未选中"，防止数据库脏数据导致自动加购
        const requiredPartsMap = this.data.requiredPartsMap || {};
        const currentModel = this.data.currentSeries?.name || '';
        const requiredPartsForModel = requiredPartsMap[currentModel] || [];
        
        const cleanList = cache.accessoryList.map(item => {
          const isRequired = requiredPartsForModel.includes(item.name);
          return { 
            ...item, 
            selected: false,
            isRequired: isRequired
          };
        });
        
        this.setData({ accessoryList: cleanList });
        console.log('[shop.js] 从缓存加载 accessoryList, 数量:', cleanList.length);
      }
      
      // 🔴 后台刷新数据（不阻塞页面显示）
      console.log('[shop.js] 后台刷新数据，确保数据最新...');
      this.loadDataFromCloudBackground();
      
      // 🔴 静默预加载媒体资源（不阻塞页面）
      setTimeout(() => {
        this.preloadMediaResources();
      }, 500);
      return;
    }
    
    // 缓存无效或不存在，正常加载
    console.log('[shop.js] 缓存无效或不存在，从云端加载数据...');
    
    if (!this.db) {
      console.error('[shop.js] ❌ loadDataFromCloud: this.db 不存在！');
      return;
    }
    
    console.log('[shop.js] ✅ 数据库实例存在');
    console.log('[shop.js] 开始加载云端数据...');
    // 移除加载提示，静默加载
    
    // 加载商店标题
    console.log('[shop.js] ---------- 加载 shop_config.shopTitle ----------');
    console.log('[shop.js] 尝试读取文档: shop_config/shopTitle');
    this.db.collection('shop_config').doc('shopTitle').get().then(res => {
      console.log('[shop.js] ✅ shop_config.shopTitle 加载成功');
      console.log('[shop.js] res.errMsg:', res.errMsg);
      console.log('[shop.js] res.data:', res.data);
      if (res.data && res.data.title) {
        console.log('[shop.js] 设置 shopTitle:', res.data.title);
        this.setData({ shopTitle: res.data.title });
        // 🔴 更新缓存
        this.ensureShopDataCache().shopTitle = res.data.title;
      } else {
        console.log('[shop.js] ⚠️ res.data 为空或没有 title 字段');
        console.log('[shop.js] res.data:', res.data);
      }
    }).catch(err => {
      const errMsg = err.errMsg || '';
      console.log('[shop.js] ❌ shop_config.shopTitle 读取失败');
      console.log('[shop.js] errCode:', err.errCode);
      console.log('[shop.js] errMsg:', errMsg);
      console.log('[shop.js] 完整错误:', err);
      
      if (err.errCode === -502005 || err.errCode === -502002 || err.errCode === -502007 || 
          errMsg.includes('cannot find document') || errMsg.includes('not exist')) {
        console.log('[shop.js] 错误类型: 文档不存在');
        console.log('[shop.js] 将使用默认值');
      } else {
        console.log('[shop.js] 错误类型: 其他错误');
      }
    });

    // 加载顶部媒体
    console.log('[shop.js] ---------- 加载 shop_config.topMedia ----------');
    console.log('[shop.js] 尝试读取文档: shop_config/topMedia');
    this.db.collection('shop_config').doc('topMedia').get().then(res => {
      console.log('[shop.js] ✅ shop_config.topMedia 加载成功');
      console.log('[shop.js] res.errMsg:', res.errMsg);
      console.log('[shop.js] res.data:', res.data);
      if (res.data && res.data.list) {
        // 🔴 防御性修复：如果未配置 type，根据 url 自动识别图片/视频
        const fixedList = (res.data.list || []).map(item => {
          if (item.type) return item;
          const url = (item.url || '').toLowerCase();
          const isVideo = url.endsWith('.mp4') || url.endsWith('.mov') || url.indexOf('.mp4?') !== -1 || url.indexOf('.mov?') !== -1;
          return {
            type: isVideo ? 'video' : 'image',
            ...item,
          };
        });

        console.log('[shop.js] 设置 topMediaList, 数量:', fixedList.length);
        console.log('[shop.js] topMediaList 内容(修正后):', fixedList);
        this.setData({ topMediaList: fixedList });
        // 🔴 更新缓存
        this.ensureShopDataCache().topMediaList = fixedList;
      } else {
        console.log('[shop.js] ⚠️ res.data 为空或没有 list 字段');
      }
    }).catch(err => {
      console.error('[shop.js] ❌ shop_config.topMedia 加载失败');
      console.error('[shop.js] errCode:', err.errCode);
      console.error('[shop.js] errMsg:', err.errMsg);
      console.error('[shop.js] 完整错误:', err);
      
      // 文档不存在或集合不存在，都尝试创建
      const errMsg = err.errMsg || '';
      if (err.errCode === -502005 || err.errCode === -502002 || err.errCode === -502007 || 
          errMsg.includes('cannot find document') || errMsg.includes('not exist')) {
        console.log('[shop.js] 错误类型: 文档不存在');
        console.log('[shop.js] 尝试创建 shop_config.topMedia 文档...');
        this.db.collection('shop_config').doc('topMedia').set({
          data: { list: this.data.topMediaList }
        }).then(() => {
          console.log('[shop.js] ✅ shop_config.topMedia 创建成功');
        }).catch(createErr => {
          console.error('[shop.js] ❌ shop_config.topMedia 创建失败');
          console.error('[shop.js] 创建失败 errCode:', createErr.errCode);
          console.error('[shop.js] 创建失败 errMsg:', createErr.errMsg);
          console.error('[shop.js] 创建失败完整错误:', createErr);
        });
      }
    });

    // 加载产品系列
    console.log('[shop.js] ========== 开始加载 shop_series ==========');
    console.log('[shop.js] 数据库实例:', this.db ? '存在' : '不存在');
    console.log('[shop.js] 尝试查询 shop_series 集合...');
    
    this.db.collection('shop_series').get().then(res => {
      console.log('[shop.js] ✅ shop_series 查询成功!');
      console.log('[shop.js] 查询结果 - errMsg:', res.errMsg);
      console.log('[shop.js] 查询结果 - data 数量:', res.data ? res.data.length : 0);
      
      if (res.data && res.data.length > 0) {
        console.log('[shop.js] 查询到的数据详情:');
        res.data.forEach((item, index) => {
          console.log(`[shop.js] 产品 ${index + 1}:`);
          console.log(`[shop.js]   _id: ${item._id}`);
          console.log(`[shop.js]   id: ${item.id}`);
          console.log(`[shop.js]   name: ${item.name}`);
          console.log(`[shop.js]   cover: ${item.cover}`);
          console.log(`[shop.js]   jumpNumber: ${item.jumpNumber}`);
          console.log(`[shop.js]   完整对象:`, JSON.stringify(item, null, 2));
        });
        // 🔴 防御性修复：为 detailImages 自动补全 type（image / video）
        const fixedSeriesList = (res.data || []).map(series => {
          const fixedDetailImages = (series.detailImages || []).map(item => {
            if (item.type) return item;
            const url = (item.url || '').toLowerCase();
            const isVideo =
              url.endsWith('.mp4') ||
              url.endsWith('.mov') ||
              url.indexOf('.mp4?') !== -1 ||
              url.indexOf('.mov?') !== -1;
            return {
              type: isVideo ? 'video' : 'image',
              ...item,
            };
          });
          return {
            ...series,
            detailImages: fixedDetailImages,
          };
        });
        
        console.log('[shop.js] 设置 seriesList, 数量:', fixedSeriesList.length);
        this.setData({ seriesList: fixedSeriesList });
        console.log('[shop.js] ✅ seriesList 已更新到页面数据');
        // 🔴 更新缓存
        this.ensureShopDataCache().seriesList = fixedSeriesList;
        
        // 如果有跳转号码，立即跳转到对应产品
        if (this.jumpNumber) {
          // 使用 nextTick 确保数据已更新
          wx.nextTick(() => {
            this.jumpToProductByNumber(this.jumpNumber);
          });
        }
      } else {
        console.log('[shop.js] ⚠️ shop_series 数据为空');
        console.log('[shop.js] res.data:', res.data);
        console.log('[shop.js] 将使用本地默认数据');
      }
    }).catch(err => {
      console.error('[shop.js] ❌ shop_series 加载失败!');
      console.error('[shop.js] errCode:', err.errCode);
      console.error('[shop.js] errMsg:', err.errMsg);
      console.error('[shop.js] 完整错误对象:', err);
      
      // 集合不存在时，使用本地默认数据
      if (err.errCode === -502005 || err.errCode === -502002) {
        console.log('[shop.js] 错误类型: 集合不存在 (errCode: ' + err.errCode + ')');
        console.log('[shop.js] 将使用本地默认数据');
      } else {
        console.log('[shop.js] 错误类型: 其他错误');
        console.log('[shop.js] 将使用本地默认数据');
      }
    });

    // 加载配件
    console.log('[shop.js] ---------- 加载 shop_accessories ----------');
    console.log('[shop.js] 尝试查询 shop_accessories 集合...');
    this.db.collection('shop_accessories').get().then(res => {
      console.log('[shop.js] ✅ shop_accessories 查询成功!');
      
      if (res.data && res.data.length > 0) {
        // 【关键修改】强制把所有配件设为"未选中"，防止数据库脏数据导致自动加购
        // 🔴 同时检查是否需要高亮显示（从维修单跳转过来的配件）
        const requiredPartsMap = this.data.requiredPartsMap || {};
        const currentModel = this.data.currentSeries?.name || '';
        const requiredPartsForModel = requiredPartsMap[currentModel] || [];
        
        const cleanList = res.data.map(item => {
          const isRequired = requiredPartsForModel.includes(item.name);
          return { 
            ...item, 
            selected: false,
            isRequired: isRequired // 🔴 标记是否需要高亮
          };
        });

        console.log('[shop.js] 设置 accessoryList (已重置选中状态)');
        this.setData({ accessoryList: cleanList });
        // 🔴 更新缓存（保存原始数据，不包含selected状态）
        const cache = this.ensureShopDataCache();
        cache.accessoryList = res.data;
        cache.cacheTime = Date.now();
      } else {
        console.log('[shop.js] ⚠️ shop_accessories 数据为空');
        console.log('[shop.js] 将使用本地默认数据');
      }
    }).catch(err => {
      console.error('[shop.js] ❌ shop_accessories 加载失败!');
      console.error('[shop.js] errCode:', err.errCode);
      console.error('[shop.js] errMsg:', err.errMsg);
      console.error('[shop.js] 完整错误:', err);
      // 集合不存在时，使用本地默认数据
      if (err.errCode === -502005 || err.errCode === -502002) {
        console.log('[shop.js] 错误类型: 集合不存在');
        console.log('[shop.js] 将使用本地数据');
      } else {
        console.log('[shop.js] 错误类型: 其他错误');
        console.log('[shop.js] 将使用本地数据');
      }
    });
    
    // 🔴 更新缓存时间
    this.ensureShopDataCache().cacheTime = Date.now();
    
    // 🔴 数据加载完成后，静默预加载媒体资源（延迟执行，不阻塞页面）
    setTimeout(() => {
      this.preloadMediaResources();
    }, 500);
    
    console.log('[shop.js] ========== loadDataFromCloud 完成 ==========');
    console.log('[shop.js] ========================================');
  },

  // 🔴 后台刷新数据（不阻塞页面显示，静默更新）
  loadDataFromCloudBackground() {
    if (!this.db) {
      return;
    }
    
    console.log('[shop.js] 后台刷新数据开始...');
    const app = getApp();
    
    // 并行加载所有数据
    Promise.all([
      // 1. 加载商店标题
      this.db.collection('shop_config').doc('shopTitle').get().catch(() => ({ data: null })),
      // 2. 加载顶部媒体
      this.db.collection('shop_config').doc('topMedia').get().catch(() => ({ data: null })),
      // 3. 加载产品系列
      this.db.collection('shop_series').get().catch(() => ({ data: [] })),
      // 4. 加载配件
      this.db.collection('shop_accessories').get().catch(() => ({ data: [] }))
    ]).then(([titleRes, mediaRes, seriesRes, accRes]) => {
      // 🔴 确保缓存对象存在
      const cache = this.ensureShopDataCache();
      let hasUpdate = false;
      
      // 更新缓存和页面数据
      if (titleRes.data && titleRes.data.title) {
        if (cache.shopTitle !== titleRes.data.title) {
          cache.shopTitle = titleRes.data.title;
          this.setData({ shopTitle: titleRes.data.title });
          hasUpdate = true;
        }
      }
      
      if (mediaRes.data && mediaRes.data.list) {
        cache.topMediaList = mediaRes.data.list;
        this.setData({ topMediaList: mediaRes.data.list });
        hasUpdate = true;
      }
      
      if (seriesRes.data && Array.isArray(seriesRes.data)) {
        cache.seriesList = seriesRes.data;
        this.setData({ seriesList: seriesRes.data });
        hasUpdate = true;
      }
      
      if (accRes.data && Array.isArray(accRes.data)) {
        // 保存原始数据到缓存
        cache.accessoryList = accRes.data;
        
        // 更新页面数据（重置选中状态）
        const requiredPartsMap = this.data.requiredPartsMap || {};
        const currentModel = this.data.currentSeries?.name || '';
        const requiredPartsForModel = requiredPartsMap[currentModel] || [];
        
        const cleanList = accRes.data.map(item => {
          const isRequired = requiredPartsForModel.includes(item.name);
          return { 
            ...item, 
            selected: false,
            isRequired: isRequired
          };
        });
        
        this.setData({ accessoryList: cleanList });
        hasUpdate = true;
      }
      
      cache.cacheTime = Date.now();
      
      if (hasUpdate) {
        console.log('[shop.js] ✅ 后台刷新完成，数据已更新');
      } else {
        console.log('[shop.js] ✅ 后台刷新完成，数据无变化');
      }
    }).catch(err => {
      console.error('[shop.js] 后台刷新失败:', err);
    });
  },

  // 🔴 保存数据后刷新缓存（重新加载所有数据）
  refreshShopDataCacheAfterSave() {
    console.log('[shop.js] 保存数据后刷新缓存...');
    // 清除缓存时间，强制重新加载
    this.ensureShopDataCache().cacheTime = null;
    // 后台刷新数据
    this.loadDataFromCloudBackground();
  },

  // 🔴 静默预加载媒体资源（图片和视频）
  preloadMediaResources() {
    console.log('[shop.js] 开始静默预加载媒体资源...');
    
    const imageUrls = [];
    
    // 1. 收集顶部轮播的图片URL（首屏优先）
    if (this.data.topMediaList && this.data.topMediaList.length > 0) {
      this.data.topMediaList.forEach(item => {
        if (item.url && item.type === 'image') {
          imageUrls.push(item.url);
        }
      });
    }
    
    // 2. 收集产品封面的图片URL（首屏可见，只预加载前3个）
    if (this.data.seriesList && this.data.seriesList.length > 0) {
      this.data.seriesList.slice(0, 3).forEach(series => {
        if (series.cover) {
          imageUrls.push(series.cover);
        }
      });
    }
    
    // 3. 收集配件的缩略图URL（首屏可见，只预加载前5个）
    if (this.data.accessoryList && this.data.accessoryList.length > 0) {
      this.data.accessoryList.slice(0, 5).forEach(acc => {
        if (acc.img) {
          imageUrls.push(acc.img);
        }
      });
    }
    
    // 4. 批量预加载图片（静默进行，不阻塞）
    if (imageUrls.length > 0) {
      // 分批预加载，避免一次性加载太多
      const batchSize = 3;
      let currentIndex = 0;
      
      const preloadBatch = () => {
        const batch = imageUrls.slice(currentIndex, currentIndex + batchSize);
        batch.forEach((url, index) => {
          // 延迟执行，避免同时发起太多请求
          setTimeout(() => {
            wx.getImageInfo({
              src: url,
              success: () => {
                // 静默成功，不输出日志
              },
              fail: () => {
                // 静默失败，不输出日志（避免控制台噪音）
              }
            });
          }, index * 100); // 每个图片间隔100ms
        });
        
        currentIndex += batchSize;
        if (currentIndex < imageUrls.length) {
          // 下一批延迟执行，避免阻塞
          setTimeout(preloadBatch, 500);
        }
      };
      
      // 延迟开始预加载，确保页面已渲染
      setTimeout(preloadBatch, 300);
    }
    
    console.log('[shop.js] 媒体资源预加载任务已启动（图片:', imageUrls.length, '个）');
  },

  // ========================================================
  // 保存顶部媒体到云端
  // ========================================================
  saveTopMediaToCloud() {
    console.log('[shop.js] saveTopMediaToCloud 开始');
    if (!this.db) {
      console.error('[shop.js] saveTopMediaToCloud: this.db 不存在！');
      return;
    }
    console.log('[shop.js] 保存 topMediaList:', this.data.topMediaList);
    this.db.collection('shop_config').doc('topMedia').update({
      data: { list: this.data.topMediaList }
    }).then(() => {
      console.log('[shop.js] saveTopMediaToCloud 更新成功');
      // 🔴 更新缓存
      const cache = this.ensureShopDataCache();
      cache.topMediaList = this.data.topMediaList;
      cache.cacheTime = Date.now();
    }).catch(err => {
      console.error('[shop.js] saveTopMediaToCloud 更新失败:', err);
      console.log('[shop.js] errCode:', err.errCode, 'errMsg:', err.errMsg);
      // 如果文档不存在，创建新文档
      const errMsg = err.errMsg || '';
      if (err.errCode === -502005 || err.errCode === -502002 || err.errCode === -502007 || 
          errMsg.includes('cannot find document') || errMsg.includes('not exist')) {
        console.log('[shop.js] 文档不存在，尝试创建');
        this.db.collection('shop_config').doc('topMedia').set({
          data: { list: this.data.topMediaList }
        }).then(() => {
          console.log('[shop.js] saveTopMediaToCloud 创建成功');
        }).catch(createErr => {
          console.error('[shop.js] saveTopMediaToCloud 创建失败:', createErr);
          console.log('[shop.js] 创建失败 errCode:', createErr.errCode, 'errMsg:', createErr.errMsg);
        });
      }
    });
  },

  // ========================================================
  // 保存产品系列到云端
  // ========================================================
  saveSeriesToCloud(series, isNew = false) {
    console.log('[shop.js] ========== saveSeriesToCloud 开始 ==========');
    console.log('[shop.js] isNew:', isNew);
    console.log('[shop.js] series._id:', series._id);
    console.log('[shop.js] series.id:', series.id);
    console.log('[shop.js] series.cover:', series.cover);
    console.log('[shop.js] series 完整对象:', JSON.stringify(series, null, 2));
    
    if (!this.db) {
      console.error('[shop.js] saveSeriesToCloud: this.db 不存在！');
      return Promise.reject(new Error('数据库未初始化'));
    }
    
    const data = {
      ...series,
      updateTime: new Date()
    };
    // 【修复】移除 _id 和 _openid，因为它们是数据库自动管理的字段
    delete data._id;
    delete data._openid;
    
    console.log('[shop.js] 准备保存的数据 (移除 _id 和 _openid 后):');
    console.log('[shop.js] data.cover:', data.cover);
    console.log('[shop.js] data.id:', data.id);
    console.log('[shop.js] data 完整对象:', JSON.stringify(data, null, 2));
    
    if (isNew || !series._id) {
      console.log('[shop.js] 操作类型: 添加新产品系列到 shop_series');
      return this.db.collection('shop_series').add({ data }).then(res => {
        console.log('[shop.js] ✅ 添加成功!');
        console.log('[shop.js] 返回的 _id:', res._id);
        console.log('[shop.js] 返回的完整结果:', res);
        series._id = res._id;
        if (this.data.currentSeriesIdx >= 0) {
          this.setData({ [`seriesList[${this.data.currentSeriesIdx}]`]: series });
        }
        // 🔴 刷新缓存
        this.refreshShopDataCacheAfterSave();
        return res;
      }).catch(err => {
        console.error('[shop.js] ❌ 添加产品系列失败!');
        console.error('[shop.js] errCode:', err.errCode);
        console.error('[shop.js] errMsg:', err.errMsg);
        console.error('[shop.js] 完整错误:', err);
        throw err;
      });
    } else {
      console.log('[shop.js] 操作类型: 更新产品系列');
      console.log('[shop.js] 使用的文档ID:', series._id);
      
      // 【关键修复】对于已存在的文档，直接使用 update 方法
      // update 方法专门用于更新已存在的文档，不会产生重复键错误
      console.log('[shop.js] 准备更新文档，_id:', series._id);
      console.log('[shop.js] 要更新的 cover:', data.cover);
      
      // 先单独更新 cover 字段（最关键）
      return this.db.collection('shop_series').doc(series._id).update({
        data: { cover: data.cover }
      }).then(coverRes => {
        console.log('[shop.js] ✅ cover 字段更新完成!');
        console.log('[shop.js] cover 更新结果:', coverRes);
        console.log('[shop.js] updated:', coverRes.updated);
        
        // 更新其他字段（除了 cover）
        const otherData = { ...data };
        delete otherData.cover;
        
        const updateOtherPromise = Object.keys(otherData).length > 0 
          ? this.db.collection('shop_series').doc(series._id).update({
              data: otherData
            }).then(otherRes => {
              console.log('[shop.js] ✅ 其他字段更新完成!');
              return otherRes;
            }).catch(otherErr => {
              console.error('[shop.js] ⚠️ 其他字段更新失败（非关键）:', otherErr);
              // 其他字段更新失败不影响，继续执行
              return { updated: 0 };
            })
          : Promise.resolve({ updated: 0 });
        
        return updateOtherPromise.then(() => {
          // 【关键修复】多次重试验证直到成功
          const verifyWithRetry = (retryCount = 0, maxRetries = 5) => {
            return new Promise((resolve) => {
              setTimeout(() => {
                this.db.collection('shop_series').doc(series._id).get().then(verifyRes => {
                  console.log(`[shop.js] 验证 (尝试 ${retryCount + 1}/${maxRetries + 1}):`);
                  console.log('[shop.js] 验证结果 - cover:', verifyRes.data?.cover);
                  console.log('[shop.js] 验证结果 - 期望 cover:', data.cover);
                  const isMatch = verifyRes.data?.cover === data.cover;
                  console.log('[shop.js] 验证结果 - 是否匹配:', isMatch);
                  
                  if (isMatch) {
                    console.log('[shop.js] ✅ 验证成功，cover 已正确更新!');
                    // 🔴 刷新缓存
                    this.refreshShopDataCacheAfterSave();
                    resolve({ success: true, verified: verifyRes.data, retried: retryCount > 0 });
                  } else if (retryCount < maxRetries) {
                    console.log(`[shop.js] ⚠️ 验证失败，${500 * (retryCount + 1)}ms 后重试更新并验证...`);
                    // 如果验证失败，再次尝试更新
                    return this.db.collection('shop_series').doc(series._id).update({
                      data: { cover: data.cover }
                    }).then(() => {
                      return verifyWithRetry(retryCount + 1, maxRetries);
                    }).catch(updateErr => {
                      console.error('[shop.js] 重试更新失败:', updateErr);
                      return verifyWithRetry(retryCount + 1, maxRetries);
                    });
                  } else {
                    console.error('[shop.js] ❌ 验证失败，已达到最大重试次数');
                    console.error('[shop.js] 最终读取到的 cover:', verifyRes.data?.cover);
                    console.error('[shop.js] 期望的 cover:', data.cover);
                    // 即使验证失败，也返回成功（因为更新操作本身成功了）
                    resolve({ success: true, verified: verifyRes.data, retried: true, warning: '验证失败但更新操作已执行' });
                  }
                }).catch(verifyErr => {
                  console.error('[shop.js] ⚠️ 验证时出错:', verifyErr);
                  if (retryCount < maxRetries) {
                    return verifyWithRetry(retryCount + 1, maxRetries);
                  } else {
                    resolve({ success: true, verified: null, retried: true });
                  }
                });
              }, 500 * (retryCount + 1)); // 每次重试等待时间递增
            });
          };
          
          return verifyWithRetry();
        });
      }).catch(updateErr => {
        console.error('[shop.js] ❌ update 操作失败!');
        console.error('[shop.js] errCode:', updateErr.errCode);
        console.error('[shop.js] errMsg:', updateErr.errMsg);
        console.error('[shop.js] 完整错误:', updateErr);
        throw updateErr;
      });
    }
  },

  // ========================================================
  // 保存配件到云端
  // ========================================================
  saveAccessoryToCloud(accessory, index, isNew = false) {
    console.log('[shop.js] saveAccessoryToCloud 开始, isNew:', isNew, 'accessory._id:', accessory._id, 'index:', index);
    if (!this.db) {
      console.error('[shop.js] saveAccessoryToCloud: this.db 不存在！');
      return;
    }
    const data = {
      ...accessory,
      selected: false, // 重置选中状态
      updateTime: new Date()
    };
    // 【修复】移除 _id 和 _openid，因为它们是数据库自动管理的字段
    delete data._id;
    delete data._openid;
    console.log('[shop.js] 准备保存的配件数据:', data);
    
    if (isNew || !accessory._id) {
      console.log('[shop.js] 添加新配件到 shop_accessories');
      this.db.collection('shop_accessories').add({ data }).then(res => {
        console.log('[shop.js] 添加配件成功, _id:', res._id);
        accessory._id = res._id;
        this.setData({ [`accessoryList[${index}]`]: accessory });
        // 🔴 刷新缓存
        this.refreshShopDataCacheAfterSave();
      }).catch(err => {
        console.error('[shop.js] 添加配件失败:', err);
        console.log('[shop.js] errCode:', err.errCode, 'errMsg:', err.errMsg);
      });
    } else {
      console.log('[shop.js] 更新配件, _id:', accessory._id);
      this.db.collection('shop_accessories').doc(accessory._id).update({ data }).then(() => {
        console.log('[shop.js] 更新配件成功');
        // 🔴 刷新缓存
        this.refreshShopDataCacheAfterSave();
      }).catch(err => {
        console.error('[shop.js] 更新配件失败:', err);
        console.log('[shop.js] errCode:', err.errCode, 'errMsg:', err.errMsg);
      });
    }
  },

  // ================== 1. 顶部媒体 (分开上传) ==================
  adminAddImage() {
    this.chooseImageWithCrop().then(async (path) => {
      this.showMyLoading('上传中...');
      try {
        const fileID = await this.uploadToCloud(path, 'shop/topMedia');
        const newItem = {
          type: 'image',
          url: fileID
        };
        this.data.topMediaList.push(newItem);
        this.setData({ topMediaList: this.data.topMediaList });
        this.saveTopMediaToCloud();
      } catch (err) {
        this.showAutoToast('提示', '上传失败');
      } finally {
        this.hideMyLoading();
      }
    }).catch(() => {});
  },
  adminAddVideo() {
    wx.chooseMedia({ count: 1, mediaType: ['video'], success: async (res) => {
      this.showMyLoading('上传中...');
      try {
        const fileID = await this.uploadToCloud(res.tempFiles[0].tempFilePath, 'shop/topMedia');
        const newItem = {
          type: 'video',
          url: fileID
        };
        this.data.topMediaList.push(newItem);
        this.setData({ topMediaList: this.data.topMediaList });
        this.saveTopMediaToCloud();
        this.hideMyLoading();
      } catch (err) {
        this.hideMyLoading();
        this.showAutoToast('提示', '上传失败');
      }
    }});
  },
  adminDelTopMedia(e) {
    const index = e.currentTarget.dataset.index;
    const deletedItem = this.data.topMediaList[index];
    const oldFileID = deletedItem.url; // 🔴 保存要删除的图片/视频ID
    
    this.data.topMediaList.splice(index, 1);
    this.setData({ topMediaList: this.data.topMediaList });
    this.saveTopMediaToCloud();
    
    // 🔴 删除云存储中的文件
    if (oldFileID && oldFileID.startsWith('cloud://')) {
      wx.cloud.deleteFile({
        fileList: [oldFileID],
        success: () => {
          console.log('[shop.js] 删除顶部媒体成功:', oldFileID);
        },
        fail: (err) => {
          console.error('[shop.js] 删除顶部媒体失败:', err);
        }
      });
    }
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
      this.saveSeriesToCloud(currentSeries);
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


  // ================== 2. 主页产品列表 CRUD ==================
  // ========================================================
  // [修改] 新建产品系列 (智能克隆模板)
  // ========================================================
  adminAddSeries() {
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

    // 4. 构建新对象
    const newOne = {
      id: Date.now().toString(), // 确保 ID 唯一
      name: '新产品名称 (点击修改)',
      desc: '请添加描述',
      cover: '', // 封面为空
      jumpNumber: null,

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
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];

    this.showMyDialog({
      title: '删除警告',
      content: `确定要彻底删除产品 "${series.name}" 吗？此操作不可恢复。`,
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
                console.log('云端删除成功');
              })
              .catch(err => {
                console.error('云端删除失败', err);
              });
          }

          // 2. 删除本地数据
          const newList = this.data.seriesList.filter((_, i) => i !== idx);
          this.setData({ seriesList: newList });
          
          // 如果删的是当前选中的，关闭详情页
          if (this.data.currentSeriesIdx === idx) {
            this.setData({ showDetail: false });
          }

          this.hideMyLoading();
          this.showAutoToast('提示', '已删除');
      }
      }
    });
  },
  adminUploadCover(e) {
    const idx = e.currentTarget.dataset.index;
    console.log('[shop.js] ========== adminUploadCover 开始 ==========');
    console.log('[shop.js] 产品索引:', idx);
    
    this.chooseImageWithCrop().then(async (path) => {
      this.showMyLoading('上传中...');
      try {
        const series = this.data.seriesList[idx];
        const oldFileID = series.cover; // 🔴 保存旧图片ID
        
        const fileID = await this.uploadToCloud(path, 'shop/covers');

        const updatedSeries = { ...series, cover: fileID };

        this.setData({ 
          [`seriesList[${idx}]`]: updatedSeries,
          [`seriesList[${idx}].cover`]: fileID
        });

        if (this.data.currentSeriesIdx === idx) {
          this.setData({ currentSeries: updatedSeries });
        }

        const isNew = !series._id;
        const saveResult = await this.saveSeriesToCloud(updatedSeries, isNew);
        
        // 🔴 删除旧图片
        if (oldFileID && oldFileID.startsWith('cloud://')) {
          wx.cloud.deleteFile({
            fileList: [oldFileID],
            success: () => {
              console.log('[shop.js] 删除旧产品封面成功:', oldFileID);
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

        this.showAutoToast('成功', '上传成功');
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
      console.warn('[shop.js] adminEditSeriesPrice: 非管理员模式，忽略操作');
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
      console.log('[shop.js] adminEditSeriesPrice: 价格显示已更新为:', newDisplay);
    });
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
  // 滚动监听 (实现"过界显示")
  // ========================================================
  onDetailScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const { mediaHeight, showFooterBar, isAdmin } = this.data;

    // 如果没有图片高度（比如还没传图的新产品），直接显示
    if (mediaHeight <= 0) {
      if (!showFooterBar) this.setData({ showFooterBar: true });
      return;
    }

    // 【核心修改】判定条件
    // 当滚动距离大于等于媒体区高度时显示；小于高度则隐藏
    // 这里建议减去一个缓冲值（比如 50px），让过渡更顺滑一点点
    if (scrollTop >= (mediaHeight - 50)) {
      if (!showFooterBar) {
      this.setData({ showFooterBar: true });
      }
    } else {
      // 只有在非管理员模式下才在滚回顶部时隐藏
      // 如果是管理员，建议保持常显方便操作，或者也同步隐藏
      if (showFooterBar) {
      this.setData({ showFooterBar: false });
      }
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
    
    // 🔴 对详情图片进行排序：置顶项在前
    if (s.detailImages && s.detailImages.length > 0) {
      s.detailImages = [...s.detailImages].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
    }
    
    this.setData({
      currentSeriesIdx: idx, 
      currentSeries: s,
      selectedModelIdx: -1, // 默认不选型号
      selectedOptionIdx: -1, // 默认不选配置
      showDetail: true,
      showFooterBar: false // 初始先隐藏
    }, () => {
      // 【核心修改】弹窗打开后，动态计算媒体区高度
      const query = wx.createSelectorQuery();
      query.select('.detail-images').boundingClientRect(res => {
        if (res) {
          // 将测得的高度存入变量，作为滚动的阈值
          this.setData({ mediaHeight: res.height });
        }
      }).exec();
    });
    
    this.calcTotal();
  },
  closeDetail() { 
    console.log('[shop] closeDetail called'); 
    
    // 🔴 修复：关闭详情页时清理拖拽状态，防止卡住
    if (this.data.detailLongPressTimer) {
      clearTimeout(this.data.detailLongPressTimer);
      this.data.detailLongPressTimer = null;
    }
    
    this.setData({ 
      showDetail: false,
      showFooterBar: false, // 关闭详情页时也重置按钮栏
      isDetailDragging: false,
      detailDragIndex: -1,
      detailDragStartY: 0,
      detailDragCurrentY: 0,
      detailDragOffsetY: 0,
      detailLastSwapIndex: -1
    }); 
  },

  // 修改 2：详情页添加媒体（支持视频+图片）
  adminAddDetailMedia() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image', 'video'], // 允许选视频
      sourceType: ['album', 'camera'],
      success: async (res) => {
        this.showMyLoading('上传中...');
        try {
          const file = res.tempFiles[0];
          const tempPath = file.fileType === 'image'
            ? await this.cropImageIfPossible(file.tempFilePath)
            : file.tempFilePath;
          const fileID = await this.uploadToCloud(tempPath, 'shop/detailMedia');
          const newItem = {
            type: file.fileType, // 自动识别 image 或 video
            url: fileID,
            autoplay: false, // 详情页视频默认不自动播放
            isPinned: false // 详情页视频默认不置顶
          };
          
          const s = this.data.currentSeries;
          
          // 【修复】确保 detailImages 数组存在
          if (!s.detailImages) {
            s.detailImages = [];
          }
          
          // 【修复】使用深拷贝创建新数组，确保小程序能检测到变化
          const updatedDetailImages = [...s.detailImages, newItem];
          const updatedSeries = { ...s, detailImages: updatedDetailImages };
          
          // 【修复】使用明确的路径更新，确保数据同步
          this.setData({ 
            currentSeries: updatedSeries,
            [`seriesList[${this.data.currentSeriesIdx}]`]: updatedSeries,
            [`seriesList[${this.data.currentSeriesIdx}].detailImages`]: updatedDetailImages
          });
          
          // 保存到云端（等待完成）
          await this.saveSeriesToCloud(updatedSeries);
          
          // 检查如果现在有图了，且在顶部，可以先关掉 bar 
          // 或者为了操作方便，管理员模式下我们可以让它一直开启
          if (this.data.isAdmin) {
            this.setData({ showFooterBar: true });
          }
          
          this.hideMyLoading();
          this.showAutoToast('成功', '上传成功');
        } catch (err) {
          console.error('[shop.js] adminAddDetailMedia 上传失败:', err);
          this.hideMyLoading();
          this.showAutoToast('提示', '上传失败');
        }
      },
      fail: (err) => {
        console.error('[shop.js] adminAddDetailMedia 选择文件失败:', err);
        this.showAutoToast('提示', '选择文件失败');
      }
    });
  },
  adminDelDetailImg(e) {
    const idx = e.currentTarget.dataset.index;
    const s = this.data.currentSeries;
    
    // 【修复】确保 detailImages 数组存在
    if (!s.detailImages || idx >= s.detailImages.length) {
      this.showAutoToast('提示', '删除失败');
      return;
    }
    
    const deletedItem = s.detailImages[idx];
    const oldFileID = deletedItem.url; // 🔴 保存要删除的图片/视频ID
    
    // 【修复】使用深拷贝创建新数组
    const updatedDetailImages = s.detailImages.filter((item, i) => i !== idx);
    const updatedSeries = { ...s, detailImages: updatedDetailImages };
    
    // 【修复】使用明确的路径更新
    this.setData({ 
      currentSeries: updatedSeries,
      [`seriesList[${this.data.currentSeriesIdx}]`]: updatedSeries,
      [`seriesList[${this.data.currentSeriesIdx}].detailImages`]: updatedDetailImages
    });
    
    // 【修复】保存到云端
    this.saveSeriesToCloud(updatedSeries);
    
    // 🔴 删除云存储中的文件
    if (oldFileID && oldFileID.startsWith('cloud://')) {
      wx.cloud.deleteFile({
        fileList: [oldFileID],
        success: () => {
          console.log('[shop.js] 删除详情图片/视频成功:', oldFileID);
        },
        fail: (err) => {
          console.error('[shop.js] 删除详情图片/视频失败:', err);
        }
      });
    }
  },

  // --- 型号 (Models) ---
  adminAddModel() {
    const s = this.data.currentSeries;
    // 原来是 desc: ''，现在改成 desc: '点击修改描述'
    s.models.push({name:'新型号', price:0, desc:'点击修改描述'});
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
        console.warn('[shop.js] adminEditModelPrice: 非管理员模式，忽略操作');
        return;
      }
      
      const idx = e.currentTarget.dataset.midx;
      const s = this.data.currentSeries;
      
      if (!s || !s.models || !s.models[idx]) {
        console.error('[shop.js] adminEditModelPrice: 数据不存在');
        return;
      }
      
      console.log('[shop.js] adminEditModelPrice: 开始编辑价格, idx:', idx, '当前价格:', s.models[idx].price);
      
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
          console.log('[shop.js] adminEditModelPrice: 价格已更新为:', newPrice);
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
      const s = this.data.currentSeries;
      if(s.options.length>1) {
          s.options.splice(e.currentTarget.dataset.oidx, 1);
          this.setData({currentSeries:s, selectedOptionIdx:0, [`seriesList[${this.data.currentSeriesIdx}]`]: s});
          this.calcTotal();
          this.saveSeriesToCloud(s);
      }
  },
  adminUploadOptionImg(e) {
      const idx = e.currentTarget.dataset.oidx;
    this.chooseImageWithCrop().then(async (path)=>{
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
        
        const fileID = await this.uploadToCloud(path, 'shop/options');
          
          // 【修复】使用深拷贝更新
          const updatedOptions = s.options.map((opt, i) => {
            if (i === idx) {
              return { ...opt, img: fileID };
            }
            return opt;
          });
          const updatedSeries = { ...s, options: updatedOptions };
          
          // 【修复】使用明确的路径更新
          this.setData({ 
            currentSeries: updatedSeries,
            [`seriesList[${this.data.currentSeriesIdx}]`]: updatedSeries,
            [`seriesList[${this.data.currentSeriesIdx}].options[${idx}].img`]: fileID,
            [`currentSeries.options[${idx}].img`]: fileID
          });
          
          // 保存到云端
          this.saveSeriesToCloud(updatedSeries);
        
        // 🔴 删除旧图片
        if (oldFileID && oldFileID.startsWith('cloud://')) {
          wx.cloud.deleteFile({
            fileList: [oldFileID],
            success: () => {
              console.log('[shop.js] 删除旧配置方案图片成功:', oldFileID);
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
    console.log('[shop] 关闭参数对比弹窗');
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
      currentVideoUrl: s.compareVideo
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

    console.log('[playVideo] 打开视频播放器，URL:', url);

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
        console.log('[playVideo] 调用 videoContext.play()');
        videoContext.play();
        // 🔴 额外保险：延迟设置状态为 true（如果事件没触发）
        // 使用多个延迟点，确保状态能正确更新
        setTimeout(() => {
          if (!this.data.isVideoPlaying) {
            console.log('[playVideo] 300ms后检查，状态仍为false，强制设为true');
            this.setData({
              isVideoPlaying: true
            });
          }
        }, 300);
        setTimeout(() => {
          if (!this.data.isVideoPlaying) {
            console.log('[playVideo] 800ms后检查，状态仍为false，强制设为true（最终保险）');
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
    console.log('[onVideoCanPlay] 视频可以播放');
    // 如果视频设置了 autoplay，此时应该已经开始播放了
    // 延迟一下，确保视频已经开始播放
    setTimeout(() => {
      this.setData({
        isVideoPlaying: true
      });
      console.log('[onVideoCanPlay] 设置 isVideoPlaying 为 true');
    }, 200);
  },

  // 🔴 新增：免责协议勾选状态变化
  onDisclaimerChange(e) {
    // checkbox 的 value 是数组，包含所有被选中的 value
    const checked = Array.isArray(e.detail.value) && e.detail.value.includes('agree');
    console.log('[onDisclaimerChange] 协议状态变化:', {
      checked: checked,
      value: e.detail.value,
      currentState: this.data.agreedToDisclaimer
    });
    
    this.setData({
      agreedToDisclaimer: checked
    }, () => {
      // 设置完成后再次确认状态
      console.log('[onDisclaimerChange] 设置完成后的状态:', this.data.agreedToDisclaimer);
    });
  },

  // 🔴 新增：点击文字区域也可以切换勾选状态
  toggleDisclaimerCheckbox() {
    const newState = !this.data.agreedToDisclaimer;
    console.log('[toggleDisclaimerCheckbox] 切换协议状态:', newState);
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
      console.log('[toggleVideoPlayPause] 当前播放中，执行暂停');
      videoContext.pause();
    } else {
      console.log('[toggleVideoPlayPause] 当前暂停中，执行播放');
      videoContext.play();
      // 🔴 额外保险：如果 onVideoPlay 事件没触发，延迟设置状态
      setTimeout(() => {
        if (!this.data.isVideoPlaying) {
          console.log('[toggleVideoPlayPause] 延迟设置状态为 true');
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
    console.log('[onVideoPlay] 视频开始播放，位置:', location, '索引:', index);
    
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
    console.log('[onVideoPause] 视频暂停，位置:', location, '索引:', index);
    
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
    
    if (topMediaList && topMediaList[currentIndex] && topMediaList[currentIndex].type === 'video') {
      // 暂停所有视频并更新状态
      topMediaList.forEach((item, index) => {
        if (item.type === 'video') {
          const videoContext = wx.createVideoContext(`hero-video-${index}`);
          if (videoContext) {
            videoContext.pause();
          }
          // 更新播放状态
          const heroVideoPlaying = { ...this.data.heroVideoPlaying };
          heroVideoPlaying[index] = false;
          this.setData({ heroVideoPlaying });
        }
      });
      
      // 播放当前视频并更新状态
      setTimeout(() => {
        const videoContext = wx.createVideoContext(`hero-video-${currentIndex}`);
        if (videoContext) {
          videoContext.play();
          // 更新播放状态
          const heroVideoPlaying = { ...this.data.heroVideoPlaying };
          heroVideoPlaying[currentIndex] = true;
          this.setData({ heroVideoPlaying });
        }
      }, 100);
    }
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
      console.warn('[onVideoError] 视频加载失败，但不显示错误给用户');
    }
  },

  // 🔴 新增：视频时间更新事件（用于检测播放状态）
  onVideoTimeUpdate() {
    // 如果视频时间在更新，说明视频正在播放
    // 这是一个备用机制，确保状态正确
    if (!this.data.isVideoPlaying) {
      console.log('[onVideoTimeUpdate] 检测到视频正在播放，更新状态');
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
          const tempPath = res.tempFiles[0].tempFilePath;
          
          // 上传到云存储 (文件夹路径可以自己定)
          const fileID = await this.uploadToCloud(tempPath, 'shop/compare_videos');
          
          const s = this.data.currentSeries;
          s.compareVideo = fileID; // 更新视频地址
          
          // 如果之前没设置过开关，默认上传后自动开启显示
          if (s.showCompareVideo === undefined) {
            s.showCompareVideo = true;
          }

          // 更新页面数据
          this.setData({ 
            currentSeries: s,
            [`seriesList[${this.data.currentSeriesIdx}]`]: s 
          });
          
          // 马上保存到云端
          this.saveSeriesToCloud(s);
          
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
    const idx = e.currentTarget.dataset.index;
    const key = `accessoryList[${idx}].selected`;
    this.setData({ [key]: !this.data.accessoryList[idx].selected });
    this.calcTotal();
  },

  // 打开配件详情页（点击卡片主体）
  openAccessoryDetail(e) {
    const idx = e.currentTarget.dataset.index;
    // 清理并验证配件数据，确保价格是有效数字
    const acc = this.data.accessoryList[idx];
    if (acc) {
      // 确保价格是有效数字
      if (acc.price == null || isNaN(acc.price) || acc.price < 0) {
        acc.price = 0;
        this.setData({ [`accessoryList[${idx}].price`]: 0 });
      }
    }
    this.setData({ showAccDetail: true, currentAccIdx: idx });
  },
  closeAccessoryDetail() { this.setData({ showAccDetail: false }); },
  
  // 在详情页点击“加入购物袋”
  addAccToCartFromDetail() {
    const idx = this.data.currentAccIdx;
    this.setData({ [`accessoryList[${idx}].selected`]: true });
    this.calcTotal();
    this.showAutoToast('成功', '已加入');
    this.closeAccessoryDetail();
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
      this.setData({ [`accessoryList[${idx}].name`]: cleanedName });
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
  adminEditAccPrice() {
    const idx = this.data.currentAccIdx;
    const acc = this.data.accessoryList[idx];
    // 确保价格是有效数字，如果不是则使用0
    const currentPrice = (acc.price && !isNaN(acc.price)) ? acc.price : 0;
    this._input(currentPrice+'', (v) => {
      // 移除所有非数字字符（保留小数点）
      const cleaned = v.replace(/[^\d.]/g, '');
      const newPrice = Number(cleaned);
      if (isNaN(newPrice) || newPrice < 0) {
        this.showAutoToast('提示', '请输入有效的价格数字');
        return;
      }
      acc.price = newPrice;
      this.setData({ [`accessoryList[${idx}].price`]: newPrice });
      this.calcTotal();
      this.saveAccessoryToCloud(acc, idx);
    });
  },
  adminAddAccDetailImg() {
    this.chooseImageWithCrop().then(async (path) => {
      this.showMyLoading('上传中...');
      try {
        const idx = this.data.currentAccIdx;
        const list = this.data.accessoryList;
        if(!list[idx].detailImages) list[idx].detailImages = [];
        
        // 🔴 保存旧图片的fileID，用于后续删除
        const oldFileID = list[idx].detailImages.length > 0 ? list[idx].detailImages[0] : null;
        
        // 上传新图片
        const fileID = await this.uploadToCloud(path, 'shop/accessories');
        
        // 🔴 替换第一张图片（而不是push），这样新图片会立即显示
        if (list[idx].detailImages.length > 0) {
          list[idx].detailImages[0] = fileID;
        } else {
        list[idx].detailImages.push(fileID);
        }
        
        this.setData({ accessoryList: list });
        this.saveAccessoryToCloud(list[idx], idx);
        
        // 🔴 删除旧的云存储文件
        if (oldFileID) {
          wx.cloud.deleteFile({
            fileList: [oldFileID],
            success: () => {
              console.log('[shop.js] 删除配件详情旧图片成功:', oldFileID);
            },
            fail: (err) => {
              console.error('[shop.js] 删除配件详情旧图片失败:', err);
            }
          });
        }
        
        this.hideMyLoading();
      } catch (err) {
        this.hideMyLoading();
        this.showAutoToast('提示', '上传失败');
      }
    }).catch((err) => {
      console.error('[shop.js] adminAddAccDetailImg 选择或裁切失败:', err);
    });
  },
  adminDelAccDetailImg(e) {
    const imgIdx = e.currentTarget.dataset.imgidx;
    const accIdx = this.data.currentAccIdx;
    const list = this.data.accessoryList;
    const deletedImgID = list[accIdx].detailImages[imgIdx]; // 🔴 保存要删除的图片ID
    
    list[accIdx].detailImages.splice(imgIdx, 1);
    this.setData({ accessoryList: list });
    this.saveAccessoryToCloud(list[accIdx], accIdx);
    
    // 🔴 删除云存储中的文件
    if (deletedImgID && deletedImgID.startsWith('cloud://')) {
      wx.cloud.deleteFile({
        fileList: [deletedImgID],
        success: () => {
          console.log('[shop.js] 删除配件详情图片成功:', deletedImgID);
        },
        fail: (err) => {
          console.error('[shop.js] 删除配件详情图片失败:', err);
        }
      });
    }
  },
  // 首页配件列表添加
  adminAddAcc() {
    const list = this.data.accessoryList;
    const newAcc = {id: Date.now(), name:'新配件', price:99, img:'', selected:false, desc:'描述', detailImages: []};
    list.push(newAcc);
    this.setData({accessoryList: list});
    this.saveAccessoryToCloud(newAcc, list.length - 1, true);
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
        console.log('删除配件失败:', err);
      });
    }
    
    // 🔴 删除云存储中的文件
    if (fileIDsToDelete.length > 0) {
      wx.cloud.deleteFile({
        fileList: fileIDsToDelete,
        success: () => {
          console.log('[shop.js] 删除配件所有图片成功:', fileIDsToDelete);
        },
        fail: (err) => {
          console.error('[shop.js] 删除配件所有图片失败:', err);
        }
      });
    }
    
    const list = this.data.accessoryList;
    list.splice(idx, 1);
    this.setData({accessoryList: list});
    this.calcTotal();
  },
  adminUploadAccThumb(e) {
    const idx = e.currentTarget.dataset.index;
    this.chooseImageWithCrop().then(async (path)=>{
      this.showMyLoading('上传中...');
      try {
        const acc = this.data.accessoryList[idx];
        const oldFileID = acc.img; // 🔴 保存旧图片ID
        
        const fileID = await this.uploadToCloud(path, 'shop/accessories');
        acc.img = fileID;
        this.setData({ [`accessoryList[${idx}].img`]: fileID });
        this.saveAccessoryToCloud(acc, idx);
        
        // 🔴 删除旧图片
        if (oldFileID && oldFileID.startsWith('cloud://')) {
          wx.cloud.deleteFile({
            fileList: [oldFileID],
            success: () => {
              console.log('[shop.js] 删除旧配件缩略图成功:', oldFileID);
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
    this.data.accessoryList.forEach(a => { if(a.selected) accP += a.price; });
    
    this.setData({ totalPrice: m.price + o.price + accP });
  },
  openOrderModal() { this.setData({ showOrderModal: true }); },
  closeOrderModal() { 
    this.setData({ 
      showOrderModal: false,
      agreedToDisclaimer: false // 🔴 关闭时重置协议状态
    }); 
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
      const { parseSmartAddress } = require('../../utils/smartAddressParser.js');
      const result = await parseSmartAddress(text);
      
      // 🔴 调试：打印完整的解析结果
      console.log('[confirmSmartPaste] 完整解析结果:', JSON.stringify(result, null, 2));
      console.log('[confirmSmartPaste] result.detail:', result.detail);
      console.log('[confirmSmartPaste] result.address:', result.address);

      // 构造更新数据
      let updateData = {};

      if (result.name) updateData['orderInfo.name'] = result.name;
      if (result.phone) updateData['orderInfo.phone'] = result.phone;
      
      // 🔴 修复：如果解析结果中没有省份，但有城市，尝试从城市推断省份
      let finalProvince = result.province;
      if (!finalProvince && result.city) {
        // 常见城市到省份的映射
        const cityToProvince = {
          '东莞市': '广东省', '深圳市': '广东省', '广州市': '广东省', '佛山市': '广东省', '中山市': '广东省',
          '珠海市': '广东省', '惠州市': '广东省', '江门市': '广东省', '肇庆市': '广东省', '汕头市': '广东省',
          '潮州市': '广东省', '揭阳市': '广东省', '汕尾市': '广东省', '湛江市': '广东省', '茂名市': '广东省',
          '阳江市': '广东省', '韶关市': '广东省', '清远市': '广东省', '云浮市': '广东省', '梅州市': '广东省',
          '河源市': '广东省', '北京市': '北京市', '上海市': '上海市', '天津市': '天津市', '重庆市': '重庆市',
          '杭州市': '浙江省', '宁波市': '浙江省', '温州市': '浙江省', '嘉兴市': '浙江省', '湖州市': '浙江省',
          '绍兴市': '浙江省', '金华市': '浙江省', '衢州市': '浙江省', '舟山市': '浙江省', '台州市': '浙江省',
          '丽水市': '浙江省', '南京市': '江苏省', '苏州市': '江苏省', '无锡市': '江苏省', '常州市': '江苏省',
          '镇江市': '江苏省', '扬州市': '江苏省', '泰州市': '江苏省', '南通市': '江苏省', '盐城市': '江苏省',
          '淮安市': '江苏省', '宿迁市': '江苏省', '连云港市': '江苏省', '徐州市': '江苏省', '成都市': '四川省',
          '武汉市': '湖北省', '长沙市': '湖南省', '郑州市': '河南省', '西安市': '陕西省', '济南市': '山东省',
          '青岛市': '山东省', '石家庄市': '河北省', '太原市': '山西省', '沈阳市': '辽宁省', '长春市': '吉林省',
          '哈尔滨市': '黑龙江省', '合肥市': '安徽省', '福州市': '福建省', '厦门市': '福建省', '南昌市': '江西省',
          '南宁市': '广西壮族自治区', '海口市': '海南省', '昆明市': '云南省', '贵阳市': '贵州省', '拉萨市': '西藏自治区',
          '兰州市': '甘肃省', '西宁市': '青海省', '银川市': '宁夏回族自治区', '乌鲁木齐市': '新疆维吾尔自治区',
          '呼和浩特市': '内蒙古自治区'
        };
        
        finalProvince = cityToProvince[result.city] || '';
        if (finalProvince) {
          console.log('[confirmSmartPaste] 从城市推断省份:', result.city, '->', finalProvince);
        }
      }
      
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
            if (result.city) detail = detail.replace(result.city, '').trim();
            if (result.district) detail = detail.replace(result.district, '').trim();
            updateData['detailAddress'] = detail.trim() || result.address.trim();
            console.log('[confirmSmartPaste] 提取后的详细地址:', updateData['detailAddress']);
          }
          
          // 组装完整地址用于orderInfo.address（兼容旧逻辑）
          const fullAddressParts = [];
          if (result.province) fullAddressParts.push(result.province);
          if (result.city) fullAddressParts.push(result.city);
          if (result.district) fullAddressParts.push(result.district);
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
              this.loadCityListForSmartPaste(this.data.provinceList[provinceIndex].id, result.city, result.district);
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
        if (result.city) detail = detail.replace(result.city, '').trim();
        if (result.district) detail = detail.replace(result.district, '').trim();
        updateData['detailAddress'] = detail.trim() || result.address.trim();
        console.log('[confirmSmartPaste] 提取后的详细地址:', updateData['detailAddress']);
      } else {
        console.log('[confirmSmartPaste] ⚠️ 没有找到详细地址，result.detail和result.address都为空');
      }
      
      // 组装完整地址用于orderInfo.address（兼容旧逻辑）
      const fullAddressParts = [];
      if (result.province) fullAddressParts.push(result.province);
      if (result.city) fullAddressParts.push(result.city);
      if (result.district) fullAddressParts.push(result.district);
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

    // 【修改这里】调用保存函数
    this.saveCartToCache(cart);
  },

  // ========================================================
  // 修改：执行添加逻辑 (加入严谨验证)
  // ========================================================
  _addCurrentSelectionToCart() {
    // 1. 验证：是否选择了型号
    if (this.data.selectedModelIdx === -1) {
      this.showCenterToast('未选购产品'); // 中间弹窗
      return { success: false };
    }

    // 2. 验证：是否选择了配置 (新增逻辑)
    if (this.data.selectedOptionIdx === -1) {
      this.showCenterToast('请选择配置'); // 中间弹窗
      return { success: false };
    }

    // ... 以下逻辑保持不变 ...
    const {currentSeries, selectedModelIdx, selectedOptionIdx, accessoryList} = this.data;
    const m = currentSeries.models[selectedModelIdx];
    const o = currentSeries.options[selectedOptionIdx]; // 此时肯定选了

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
  // 自定义弹窗方法
  // ========================================================
  // 显示自定义弹窗
  showMyDialog(options) {
    this.setData({
      'dialog.show': true,
      'dialog.title': options.title || '提示',
      'dialog.content': options.content || '',
      'dialog.showCancel': options.showCancel || false,
      'dialog.confirmText': options.confirmText || '确定',
      'dialog.cancelText': options.cancelText || '取消',
      'dialog.callback': options.success || null
    });
  },

  // 关闭自定义弹窗（带收缩退出动画）
  _closeDialogWithAnimation(callback) {
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
      if (typeof callback === 'function') {
        callback();
      }
    }, 420);
  },

  // 关闭自定义弹窗
  closeCustomDialog() {
    this._closeDialogWithAnimation();
  },

  // 点击弹窗确定
  onDialogConfirm() {
    const cb = this.data.dialog.callback;
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
    // 情况 A: 用户正在选购某个型号 -> 走"立即购买"逻辑
    if (this.data.selectedModelIdx > -1) {
      

      const {currentSeries, selectedModelIdx, selectedOptionIdx, accessoryList} = this.data;

      const m = currentSeries.models[selectedModelIdx];

      const o = selectedOptionIdx > -1 ? currentSeries.options[selectedOptionIdx] : {name: '标配', price: 0};
      
      

      // 1. 获取当前购物车副本

      let currentCart = [...this.data.cart];



      // 2. 清理旧的"立即购买"商品 (包括主产品 和 配件)

      if (this.data.tempBuyItemIds && this.data.tempBuyItemIds.length > 0) {

        currentCart = currentCart.filter(item => !this.data.tempBuyItemIds.includes(item.id));

      }



      // 3. 更新购物车 (此时旧的已删干净)

      this.setData({ cart: currentCart });



      // 4. 执行添加新商品逻辑

      const result = this._addCurrentSelectionToCart();

      
      
      if (result.success) {

        // === 【核心修改：同时记录主产品 ID 和 配件 ID】 ===

        

        let newTempIds = [];



        // A. 找到刚刚加进去的主产品

        const newMainItem = result.newCart.find(item => 

          item.type === 'main' && 

          item.seriesId === currentSeries.id &&

          item.modelName === m.name && 

          item.optionName === o.name

        );

        if (newMainItem) newTempIds.push(newMainItem.id);



        // B. 找到刚刚加进去的配件

        // (遍历所有被选中的配件，去购物车里找对应的 ID)

        accessoryList.forEach(acc => {

          if (acc.selected) {

            // 在购物车里找同名的配件项

            // 注意：这里可能会找到之前已有的同名配件，但在立即购买场景下，我们通常视为本次购买的一部分

            const accItem = result.newCart.find(item => 

              item.type === 'accessory' && item.name === acc.name

            );

            if (accItem) newTempIds.push(accItem.id);

          }

        });



        // 去重 (防止万一有重复 ID)

        newTempIds = [...new Set(newTempIds)];



        // 5. 保存购物车并持久化

        this.saveCartToCache(result.newCart);

        

        // 6. 更新 tempBuyItemIds (下次点立即购买时，这一批 ID 会被全部删掉)
        // 7. 计算运费和最终价格
        this.reCalcFinalPrice(result.newCartTotal);

        this.setData({

          showOrderModal: true,

          tempBuyItemIds: newTempIds 

        });

      }

      return;

    }



    // 情况 B: 没选型号，直接去结算

    if (this.data.cart.length > 0) {
      // 计算运费和最终价格
      this.reCalcFinalPrice(this.data.cartTotalPrice);
      this.setData({ showOrderModal: true });
      return;
    }



    this.showCenterToast('请先选择配置');

  },
  
  closeOrderModal() { 
    this.setData({ 
      showOrderModal: false,
      agreedToDisclaimer: false // 🔴 关闭时重置协议状态
    }); 
  },

  // 修改 4：退出管理员模式

  // ========================================================
  // 6. [核心] 提交校验与组装
  // ========================================================
  submitOrder(e) {
    console.log('[submitOrder] 按钮被点击');
    console.log('[submitOrder] 事件数据:', e?.currentTarget?.dataset);
    console.log('[submitOrder] 当前数据状态:', {
      agreedToDisclaimer: this.data.agreedToDisclaimer,
      type: typeof this.data.agreedToDisclaimer
    });
    
    const { cart, orderInfo, detailAddress, finalTotalPrice, shippingFee, shippingMethod } = this.data;

    console.log('[submitOrder] 当前数据:', { 
      cartLength: cart.length, 
      orderInfo, 
      detailAddress, 
      finalTotalPrice 
    });

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
      console.log('[submitOrder] 购物车为空');
      return this.showError('购物车为空');
    }

    // B. 信息校验
    if (!orderInfo.name) {
      console.log('[submitOrder] 校验失败：收货人姓名为空');
      return this.showError('请填写收货人姓名');
    }

    // 手机号 11 位校验
    if (!orderInfo.phone || !/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
      console.log('[submitOrder] 校验失败：手机号格式错误', orderInfo.phone);
      return this.showError('请输入正确的11位手机号');
    }

    // 地址校验
    if (!detailAddress || !detailAddress.trim()) {
      console.log('[submitOrder] 校验失败：详细地址为空');
      return this.showError('请填写详细地址');
    }

    // C. 解析地址，验证是否包含省市区信息
    const parsed = this.parseAddress(detailAddress);
    if (!parsed.province && !parsed.city) {
      console.log('[submitOrder] 校验失败：省市区未填写', parsed);
      return this.showError('请填写省、市、区');
    }

    // D. 组装完整地址字符串 (给后端和微信支付用)
    const fullAddressString = parsed.fullAddress || detailAddress;

    // 更新 orderInfo 里的 address，因为之前的逻辑是读这个字段的
    const finalOrderInfo = {
      ...orderInfo,
      address: fullAddressString
    };

    // E. 顺丰运费校验
    if (shippingMethod === 'sf' && shippingFee === 0) {
      console.log('[submitOrder] 校验失败：顺丰运费未计算');
      return this.showError('请完善地址信息以计算运费');
    }

    console.log('[submitOrder] 协议校验通过，继续支付流程');

    // 【修复】在调用支付前，重新计算最终价格，确保金额准确
    this.reCalcFinalPrice();
    const currentFinalTotalPrice = this.data.finalTotalPrice;
    const currentShippingFee = this.data.shippingFee;

    console.log('[submitOrder] 所有校验通过，准备弹出「定制产品不可退换」确认');
    console.log('[submitOrder] 重新计算后的价格:', {
      finalTotalPrice: currentFinalTotalPrice,
      shippingFee: currentShippingFee,
      cartTotalPrice: this.data.cartTotalPrice
    });

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
        this.doRealPayment(cart, finalOrderInfo, currentFinalTotalPrice, currentShippingFee, shippingMethod);
      }
    });
  },

  // ========================================================
  // 真实支付流程
  // ========================================================
  doRealPayment(cart, orderInfo, finalTotalPrice, shippingFee, shippingMethod) {
    console.log('[doRealPayment] 开始执行支付流程');
    
    // 如果没有传入参数，则从 this.data 读取（兼容旧调用）
    if (!cart) {
      console.log('[doRealPayment] 参数为空，从 this.data 读取');
      const data = this.data;
      cart = data.cart;
      orderInfo = data.orderInfo;
      finalTotalPrice = data.finalTotalPrice;
      shippingFee = data.shippingFee;
      shippingMethod = data.shippingMethod;
    }

    console.log('[doRealPayment] 支付参数:', {
      cartLength: cart ? cart.length : 0,
      orderInfo,
      finalTotalPrice,
      shippingFee,
      shippingMethod
    });

    // 【新增】仅管理员身份支付 0.01 元（普通用户按真实金额）
    const isAdminPay = this.data.isAdmin;
    let payAmount = finalTotalPrice;
    if (isAdminPay) {
      payAmount = 0.01;
      console.log('[doRealPayment] 管理员身份，支付金额调整为 0.01 元');
    }

    // 【新增】检查支付金额
    console.log('[doRealPayment] 正在支付，金额为:', payAmount);
    
    if (!payAmount || payAmount <= 0 || isNaN(payAmount)) {
      console.error('[doRealPayment] 金额异常:', payAmount);
      this.showAutoToast('支付失败', `订单金额异常（${payAmount}），请重新选择商品`);
      return;
    }

    console.log('[doRealPayment] 准备调用云函数 createOrder');
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

    // 3. 调用云函数获取支付参数
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: payAmount,
        goods: cart,
        addressData: orderInfo,
        shippingFee: (this.data.isAdmin || this.data.isAuthorized) ? 0 : shippingFee,
        shippingMethod: shippingMethod,
        userNickname: userNickname // 🔴 传递用户昵称
      },
      success: res => {
        console.log('[doRealPayment] 云函数调用成功，返回结果:', res);
        this.hideMyLoading();
        const payment = res.result;
        console.log('[doRealPayment] 支付参数:', payment);

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

        console.log('[doRealPayment] 准备调用 wx.requestPayment');
        // 4. 唤起微信原生支付界面
        wx.requestPayment({
          ...payment,
          success: (payRes) => {
            console.log('[doRealPayment] 支付成功:', payRes);
            // 支付成功处理
            this.showAutoToast('成功', '支付成功');
            this.closeOrderModal();
            
            // 🔴 如果是从维修单跳转过来的，更新维修单状态
            const { repairId } = this.data;
            if (repairId) {
              const db = wx.cloud.database();
              db.collection('shouhou_repair').doc(repairId).update({
                data: {
                  purchasePartsStatus: 'completed'
                }
              }).then(() => {
                console.log('[doRealPayment] 维修单配件购买状态已更新');
              }).catch(err => {
                console.error('[doRealPayment] 更新维修单状态失败:', err);
              });
            }
            
            // 清理购物车
            this.setData({ cart: [], cartTotalPrice: 0 });
            wx.removeStorageSync('my_cart');
            wx.setStorageSync('last_address', this.data.orderInfo);
            
            // 🔴 支付成功后，延迟同步订单信息（等待支付回调先处理，获得交易单号）
            const orderId = payment.outTradeNo;
            console.log('[doRealPayment] 支付成功，订单号:', orderId);
            
            if (orderId) {
              this.callCheckPayResult(orderId);
            }
            
            // 延迟一下，然后返回上一页
            setTimeout(() => {
              const pages = getCurrentPages();
              // 如果页面栈中有上一页，则返回上一页；否则跳转到 my 页面
              if (pages.length > 1) {
                wx.navigateBack({
                  delta: 1,
                  success: () => {
                    console.log('[doRealPayment] 已返回到上一页');
                    // 通知上一页刷新数据（如果是 my 页面）
                    setTimeout(() => {
                      const prevPage = pages[pages.length - 2];
                      if (prevPage && prevPage.route === 'pages/my/my') {
                        if (typeof prevPage.loadMyOrders === 'function') {
                          console.log('[doRealPayment] 刷新 my 页面订单列表');
                          prevPage.loadMyOrders();
                        }
                        if (typeof prevPage.loadMyActivitiesPromise === 'function') {
                          console.log('[doRealPayment] 刷新 my 页面活动列表（包含购买配件状态）');
                          prevPage.loadMyActivitiesPromise();
                        }
                        // 🔴 如果是管理员，还需要刷新待处理维修工单列表
                        if (prevPage.data.isAdmin && typeof prevPage.loadPendingRepairs === 'function') {
                          console.log('[doRealPayment] 刷新管理员待处理维修工单列表');
                          prevPage.loadPendingRepairs();
                        }
                      }
                    }, 300);
                  }
                });
              } else {
                // 如果没有上一页，跳转到 my 页面
              wx.redirectTo({ 
                url: '/pages/my/my',
                success: () => {
                  // 通知 my 页面刷新订单列表和活动列表
                  setTimeout(() => {
                    const pages = getCurrentPages();
                    const myPage = pages[pages.length - 1];
                    if (myPage) {
                      // 🔴 修复：同时刷新订单列表和活动列表（活动列表包含需要购买配件的维修单）
                      if (typeof myPage.loadMyOrders === 'function') {
                        console.log('[doRealPayment] 刷新 my 页面订单列表');
                        myPage.loadMyOrders();
                      }
                      if (typeof myPage.loadMyActivitiesPromise === 'function') {
                        console.log('[doRealPayment] 刷新 my 页面活动列表（包含购买配件状态）');
                        myPage.loadMyActivitiesPromise();
                      }
                      // 🔴 如果是管理员，还需要刷新待处理维修工单列表
                      if (myPage.data.isAdmin && typeof myPage.loadPendingRepairs === 'function') {
                        console.log('[doRealPayment] 刷新管理员待处理维修工单列表');
                        myPage.loadPendingRepairs();
                      }
                    }
                  }, 500);
                }
              });
              }
            }, 500);
          },
          fail: (err) => {
            console.error('[doRealPayment] 支付失败:', err);
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
            this.showAutoToast('支付提示', errorMsg);
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

  callCheckPayResult(orderId, attempt = 1) {
    if (!orderId) return;
    const maxAttempts = 3;
    if (attempt === 1) {
      this.showMyLoading('确认订单中...');
    } else {
      this.showMyLoading('再次确认...');
    }

    wx.cloud.callFunction({
      name: 'checkPayResult',
      data: { orderId },
      success: (res) => {
        const result = res.result || {};
        console.log('[callCheckPayResult] 云函数返回:', result);
        if (result.success) {
          this.showAutoToast('成功', '订单已确认');
        } else if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          this.showAutoToast('提示', result.msg || '支付状态待确认，请稍后在"我的订单"查看');
        }
      },
      fail: (err) => {
        console.error('[callCheckPayResult] 调用失败:', err);
        if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1), 2000);
        } else {
          this.showAutoToast('提示', '网络异常，请稍后在"我的订单"查看');
        }
      },
      complete: () => {
        this.hideMyLoading();
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
            shippingFee: 0
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
  reCalcFinalPrice(goodsPrice = this.data.cartTotalPrice) {
    const { shippingMethod, detailAddress } = this.data;
    let fee = 0;

    if (shippingMethod === 'zto') {
      fee = 0; // 中通包邮
    } else if (shippingMethod === 'sf') {
      // 顺丰逻辑：从详细地址中解析省市区
      if (!detailAddress || !detailAddress.trim()) {
        fee = 0; // 没填地址，运费暂计为0
      } else {
        // 解析地址，提取省份信息
        const parsed = this.parseAddress(detailAddress);
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

    this.setData({
      shippingFee: fee,
      cartTotalPrice: goodsPrice,
      finalTotalPrice: goodsPrice + fee
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
      console.log('[shop] 使用缓存的省份列表（未过期）');
      this.setData({
        provinceList: cachedProvinceList
      });
      return;
    }
    
    // 如果缓存过期，清除旧缓存
    if (cachedProvinceList && (now - cacheTime) >= cacheValidTime) {
      console.log('[shop] 省份列表缓存已过期，重新加载');
      wx.removeStorageSync('province_list');
      wx.removeStorageSync('province_list_time');
    }
    
    // 🔴 修复：如果API配额用完，直接使用本地数据，不调用API
    // 先尝试使用默认省份列表（不依赖API）
    console.log('[shop] 使用本地省份列表（避免API配额限制）');
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
    console.log('[shop] 使用默认省份列表（不依赖API）');
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

    // 解析地址
    const parsed = this.parseAddress(detailAddress);
    const fullAddressString = parsed.fullAddress || detailAddress;
    const finalOrderInfo = { ...orderInfo, address: fullAddressString };

    this.showMyDialog({
      title: '提交定制需求',
      content: '订单将提交给管理员进行核价。',
      showCancel: true,
      confirmText: '提交',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('提交中...');
          wx.cloud.callFunction({
            name: 'createOrder',
            data: {
              action: 'save_only',
              totalPrice: finalTotalPrice,
              goods: cart,
              addressData: finalOrderInfo, // 传拼好的地址
              shippingFee: shippingFee,
              shippingMethod: shippingMethod
            },
            success: () => {
              this.hideMyLoading();
              this.showAutoToast('成功', '提交成功');
              this.closeOrderModal();
              wx.removeStorageSync('my_cart');
              this.setData({ cart: [], cartTotalPrice: 0 });
              setTimeout(() => { wx.navigateTo({ url: '/pages/my/my' }); }, 1000);
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

    // 3. 【关键】存入本地缓存 (持久化)
    wx.setStorageSync('my_cart', newCart);
  },

  // ========================================================
  // 4. 修改：对比逻辑 (先选后对比)
  // ========================================================
  
  // 切换对比选择模式
  toggleModelCompareMode() {
    const mode = !this.data.isModelCompareMode;
    // 清空之前的勾选
    const models = this.data.currentSeries.models.map(m => ({...m, isCompareChecked: false}));
    this.data.currentSeries.models = models;
    
    this.setData({ 
      isModelCompareMode: mode,
      currentSeries: this.data.currentSeries,
      compareSelectedModels: []
    });
  },

  // ========================================================
  // 1. 选择型号 (核心分流逻辑)
  // ========================================================
  selectModel(e) {
    const idx = e.currentTarget.dataset.index;
    const s = this.data.currentSeries;

    // --- A. 如果是对比模式 ---
    if (this.data.isModelCompareMode) {
      
      // 1. 管理员：点击卡片 -> 直接打开参数设置弹窗
      if (this.data.isAdmin) {
        this.openSpecsModal(); // 打开表格让他改
        return;
      }

      // 2. 用户：点击卡片 -> 切换勾选状态
      // 【修复】使用明确的路径更新，确保小程序能检测到变化
      const newCheckedState = !s.models[idx].isCompareChecked;
      
      // 更新 models 数组
      const updatedModels = s.models.map((m, i) => {
        if (i === idx) {
          return { ...m, isCompareChecked: newCheckedState };
        }
        return m;
      });
      
      const updatedSeries = { ...s, models: updatedModels };
      const selected = updatedModels.filter(m => m.isCompareChecked);
      
      this.setData({ 
        currentSeries: updatedSeries,
        [`seriesList[${this.data.currentSeriesIdx}].models`]: updatedModels,
        compareSelectedModels: selected
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
    this.openSpecsModal();
  },

  // 🔴 检查封禁状态
  async checkBanStatus() {
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
        console.log('[shop] ✅ 检测到管理员身份，豁免封禁检查');
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
          console.log('[shop] 检测到封禁状态，跳转到封禁页');
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
        console.warn('[shop] 云会话未就绪，跳过封禁检查（请确保已登录/选择云环境）');
        return;
      }
      console.error('[shop] 检查封禁状态失败:', err);
    }
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    // 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('[shop] 🛡️ 硬件级防偷拍锁定')
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
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[shop] 🔴 截屏/录屏检测，立即跳转');
    
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
        console.log('[shop] ✅ 设置封禁状态成功:', res);
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
          console.log('[shop] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[shop] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      console.log('[shop] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[shop] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[shop] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[shop] 跳转到 blocked 页面成功');
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
})