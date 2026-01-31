// pages/shouhou/shouhou.js
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
// 🔴 使用专门的行政区key（用于省市区选择器 - getCityList）
const MAP_KEY = 'CGRBZ-FLLLL-CNCPC-MQ6YK-YENYT-2MFCD'; // 行政区key（专门用于省市区选择器）
console.log('[shouhou] ✅ 初始化腾讯地图SDK（城市列表），使用的key:', MAP_KEY);
var qqmapsdk = new QQMapWX({
    key: MAP_KEY
});

// 🔴 使用专门的行政区划子key（用于区县选择器 - getDistrictByCityId）
const DISTRICT_KEY = 'ICRBZ-VEELI-CQZGO-UE5G6-BHRMS-VQBIK'; // 行政区划子key（专门用于区县选择器）
console.log('[shouhou] ✅ 初始化腾讯地图SDK（区县列表），使用的key:', DISTRICT_KEY);
var qqmapsdkDistrict = new QQMapWX({
    key: DISTRICT_KEY
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
    
    // 状态栏高度（默认 44，与 azjc 一致，避免首屏顶得太高）
    statusBarHeight: 44,

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

    // [新增] 自定义加载动画
    showLoadingAnimation: false
  },

  // 页面加载时初始化
  onLoad(options) {
    // 🔴 尽早设置状态栏高度，避免详情页顶得太高
    const winInfo = wx.getWindowInfo();
    this.setData({ statusBarHeight: winInfo.statusBarHeight || 44 });
    
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('shouhou');
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
    if (modelToOpen) {
      const baseModel = modelToOpen.split(/\s*-\s*/)[0].trim();
      if (MODEL_TO_GROUP[baseModel]) {
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
  
  onReady() {
    // 🔴 从「去购买配件」带 model 进入时，先让详情滑入再加载配件数据
    if (this._openModelFromQuery) {
      const modelName = this._openModelFromQuery;
      this._openModelFromQuery = null;
      if (modelName && MODEL_TO_GROUP[modelName]) {
        this.enterModelByModelName(modelName);
      }
    }
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
    const index = parseInt(e.detail.value);
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
    
    // 加载该省份下的城市列表
    if (province.id) {
      this.loadCityList(province.id);
    }
    
    // 重新计算运费
    this.reCalcFinalPrice();
  },
  
  // [新增] 加载城市列表
  loadCityList(provinceId) {
    // 🔴 优化：先检查缓存
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
      console.log('[shouhou] 使用缓存的城市列表');
      this.setData({
        cityList: cachedCityList
      });
      return;
    }
    
    // 🔴 修复：使用 getCityList 获取所有城市，然后筛选出该省份的城市
    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          // result[1] 是所有城市列表
          const allCities = res.result[1] || [];
          
          // 🔴 筛选出属于该省份的城市（通过城市ID的前2位匹配省份ID的前2位）
          const provincePrefix = provinceId.substring(0, 2);
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
          console.log('[shouhou] 城市列表加载成功:', cityList.length, '个城市');
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
                console.log('[shouhou] 城市列表加载成功（备用方案）:', cityList.length, '个城市');
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
              console.log('[shouhou] 城市列表加载成功（备用方案）:', cityList.length, '个城市');
            }
          },
          fail: (err2) => {
            console.error('[shouhou] 加载城市列表失败:', err2);
          }
        });
      }
    });
  },
  
  // [新增] 为智能粘贴加载城市列表（并自动匹配城市和区县）
  loadCityListForSmartPaste(provinceId, targetCity, targetDistrict) {
    // 🔴 优化：先检查缓存
    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
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
          this.setData({
            selectedCity: targetCity
          });
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
          const provincePrefix = provinceId.substring(0, 2);
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
              this.setData({
                selectedCity: targetCity
              });
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
              this.setData({
                selectedDistrict: targetDistrict
              });
            }
          }
        }
      },
      fail: (err) => {
        console.error('[shouhou] 加载区县列表失败:', err);
        // 🔴 修复：如果API失败，至少设置区县文本，让用户知道解析到了什么
        if (targetDistrict) {
          this.setData({
            selectedDistrict: targetDistrict,
            districtList: [] // 清空列表，避免显示错误数据
          });
          console.log('[shouhou] ⚠️ API调用失败，已设置区县文本:', targetDistrict);
        }
      }
    });
  },
  
  // [新增] 城市选择变化
  onCityChange(e) {
    const index = parseInt(e.detail.value);
    const city = this.data.cityList[index];
    
    if (!city) return;
    
    this.setData({
      cityIndex: index,
      selectedCity: city.name,
      selectedDistrict: '',
      districtList: [],
      districtIndex: -1
    });
    
    // 加载该城市下的区县列表
    if (city.id) {
      this.loadDistrictList(city.id);
    }
    
    // 重新计算运费
    this.reCalcFinalPrice();
  },
  
  // [新增] 加载区县列表
  loadDistrictList(cityId) {
    // 🔴 优化：先检查缓存
    const cacheKey = `district_list_${cityId}`;
    const cachedDistrictList = wx.getStorageSync(cacheKey);
    if (cachedDistrictList && cachedDistrictList.length > 0) {
      console.log('[shouhou] 使用缓存的区县列表');
      this.setData({
        districtList: cachedDistrictList
      });
      return;
    }
    
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
          
          // 保存到缓存
          wx.setStorageSync(cacheKey, districtList);
          
          this.setData({
            districtList: districtList
          });
          console.log('[shouhou] 区县列表加载成功:', districtList.length, '个区县');
        }
      },
      fail: (err) => {
        console.error('[shouhou] 加载区县列表失败:', err);
        // 🔴 修复：如果API失败，清空区县列表，但保留已选择的区县文本（如果有）
        this.setData({
          districtList: []
        });
        // 如果已经有选择的区县文本，保留它
        if (this.data.selectedDistrict) {
          console.log('[shouhou] ⚠️ API调用失败，保留已选择的区县文本:', this.data.selectedDistrict);
        }
      }
    });
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
    
    // 再次确认状态栏高度（onLoad 已设，此处兜底）
    this.setData({ statusBarHeight: winInfo.statusBarHeight || 44 });
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
  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
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

  onUnload() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
    this._cleanupDrag();
  },

  // 页面隐藏时清理（防止拖拽过程中切换页面）
  onHide() {
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
    const name = modelName || '';
    const seriesVal = series || (MODEL_TO_GROUP[name] || '');
    // 先只更新页面状态，让详情视图立即滑入，避免被后续 setData 覆盖或延迟
    this.setData({
      currentModelName: name,
      currentSeries: seriesVal,
      inDetail: true,
      activeTab: 'order',
      serviceType: 'parts',
      playingIndex: -1,
      currentVideoList: [],
      selectedCount: 0,
      totalPrice: 0
    }, () => {
      this.loadParts(name);
      this.resetLock();
    });
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
        const msg = (err.errMsg || err.message || '') + '';
        if (msg.indexOf('access_token') !== -1) {
          console.warn('[shouhou] 云会话未就绪，跳过寄回订单检查');
        } else {
          console.error('检查寄回订单失败:', err);
        }
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
      // 🔴 从「去购买配件」带来的需购配件：预选并高亮
      const app = getApp();
      const preselect = (app && app.globalData && app.globalData.shouhouPreselectParts) ? app.globalData.shouhouPreselectParts : [];
      if (preselect.length) {
        const set = new Set(preselect.map(p => String(p).trim()));
        parts.forEach(p => { p.selected = set.has(String(p.name).trim()); });
        app.globalData.shouhouPreselectParts = [];
      }
      const selectedCount = parts.filter(p => p.selected).length;
      const totalPrice = parts.filter(p => p.selected).reduce((sum, p) => sum + (p.price || 0), 0);
      this.setData({ currentPartsList: parts, selectedCount, totalPrice });
      
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
      const app = getApp();
      const preselect = (app && app.globalData && app.globalData.shouhouPreselectParts) ? app.globalData.shouhouPreselectParts : [];
      if (preselect.length) {
        const set = new Set(preselect.map(p => String(p).trim()));
        parts.forEach(p => { p.selected = set.has(String(p.name).trim()); });
        app.globalData.shouhouPreselectParts = [];
      }
      const selectedCount = parts.filter(p => p.selected).length;
      const totalPrice = parts.filter(p => p.selected).reduce((sum, p) => sum + (p.price || 0), 0);
      this.setData({ currentPartsList: parts, selectedCount, totalPrice });
      
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
    
    // 🔴 检查 snapshot 方法是否存在
    if (!videoContext || typeof videoContext.snapshot !== 'function') {
      console.warn('[captureRepairVideoFrame] snapshot 方法不可用，跳过封面提取');
      this.setData({
        extractingThumb: false
      });
      getApp().hideDialog();
      return;
    }
    
    // 先定位到第一帧
    videoContext.seek(0);
    
    // 等待定位完成后再截图
    setTimeout(() => {
      try {
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
      } catch (error) {
        console.error('[captureRepairVideoFrame] snapshot 调用异常:', error);
        this.setData({
          extractingThumb: false
        });
        getApp().hideDialog();
      }
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

  // [修改] 高级智能粘贴 - 使用腾讯地图API精准解析
  async confirmSmartPaste() {
    const text = this.data.smartPasteVal.trim();
    if (!text) {
      this._showCustomToast('内容不能为空', 'none');
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
      let updateData = {
        showSmartPasteModal: false
      };

      if (result.name) updateData['orderInfo.name'] = result.name;
      if (result.phone) updateData['orderInfo.phone'] = result.phone;
      
      // 🔴 修改：将省市区和详细地址分开填充
      // 省市区填充到选择器
      
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
      
      wx.hideLoading();
      this._showCustomToast('解析完成', 'success');
    } catch (error) {
      console.error('[shouhou] 智能地址解析失败:', error);
      wx.hideLoading();
      
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

  // [新增] 计算含运费的总价（从省市区选择器获取省市区）
  reCalcFinalPrice(cart = this.data.cart) {
    console.log('[shouhou] reCalcFinalPrice 开始计算，购物车数据:', cart);
    const goodsTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const { shippingMethod, detailAddress, selectedProvince, selectedCity, selectedDistrict } = this.data;
    let fee = 0;

    if (shippingMethod === 'zto') {
      fee = 12; // 中通运费12元
    } else if (shippingMethod === 'sf') {
      // 顺丰逻辑：优先使用省市区选择器的值
      let province = selectedProvince || '';
      
      // 如果选择器没有值，尝试从详细地址解析
      if (!province && detailAddress && detailAddress.trim()) {
        const parsed = this.parseAddressForShipping(detailAddress);
        province = parsed.province || '';
      }
      
      // 判断是否广东
      if (province && province.indexOf('广东') > -1) {
        fee = 13;
      } else if (province) {
        // 如果解析到了省份但不是广东，则按省外计算
        fee = 22;
      } else {
        // 如果解析不到省份，运费暂计为0（待用户完善地址）
        fee = 0;
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
      // 🔴 修改：检查省市区和详细地址
      const { selectedProvince, selectedCity, selectedDistrict, detailAddress } = this.data;
      
      if (!orderInfo.name || !orderInfo.phone) {
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
      
      // 组装完整地址
      const addressParts = [];
      if (selectedProvince) addressParts.push(selectedProvince);
      if (selectedCity) addressParts.push(selectedCity);
      if (selectedDistrict) addressParts.push(selectedDistrict);
      if (detailAddress) addressParts.push(detailAddress);
      const address = addressParts.join(' ').trim();
      
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

      // 故障报修直接提交，不需要确认弹窗（因为不涉及支付和退款）
      this.submitRepairTicket();
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
    
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        action,
        totalPrice: total,
        goods,
        addressData: addr,
        shippingFee: fee,
        shippingMethod: method,
        userNickname: userNickname // 🔴 传递用户昵称
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

    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: totalPrice,
        goods: goodsList, // 直接传购物车数组
        addressData: addressData,
        userNickname: userNickname // 🔴 传递用户昵称
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
    
    // 🔴 检查 snapshot 方法是否存在
    if (!videoContext || typeof videoContext.snapshot !== 'function') {
      console.warn('[captureVideoFrame] snapshot 方法不可用，跳过封面提取');
      this.setData({
        extractingThumb: false
      });
      this.hideMyLoading();
      this._showCustomToast('视频已选择（封面提取不可用）', 'none', 2000);
      return;
    }
    
    // 先定位到第一帧
    videoContext.seek(0);
    
    // 等待定位完成后再截图
    setTimeout(() => {
      try {
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
      } catch (error) {
        console.error('[captureVideoFrame] snapshot 调用异常:', error);
        this.setData({
          extractingThumb: false
        });
        this.hideMyLoading();
        this._showCustomToast('视频已选择（封面提取失败）', 'none', 2000);
      }
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
      console.log('[submitRepairTicket] 开始上传视频，路径:', tempVideoPath);
      // 2. 上传视频
      const cloudPath = `repair_video/${Date.now()}_${Math.floor(Math.random()*1000)}.mp4`;
      wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempVideoPath,
      success: async (res) => {
        console.log('[submitRepairTicket] 视频上传成功，fileID:', res.fileID);
        const fileID = res.fileID;
        
        // 3. 写入数据库
        const db = wx.cloud.database();
        // 🔴 修改：组装完整地址（省市区 + 详细地址）
        const { selectedProvince, selectedCity, selectedDistrict, detailAddress } = this.data;
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
        
        console.log('[submitRepairTicket] 准备写入数据库，数据:', {
          model: currentModelName,
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
              model: currentModelName,
              description: repairDescription.trim(),
              videoFileID: fileID,
              contact: finalContact,
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
              model: currentModelName,
              description: repairDescription.trim(),
              videoFileID: fileID,
              contact: finalContact,
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
                    repairDescription: '', videoFileName: '', tempVideoPath: '', tempVideoThumb: '',
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
        db.collection('sn').where({
          openid: userOpenid,
          productModel: currentModelName,
          isActive: true
        }).get().then(deviceRes => {
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
              model: currentModelName,
              description: repairDescription.trim(),
              videoFileID: fileID,
              contact: finalContact, // 存入联系人信息（包含完整地址）
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
              model: currentModelName,
              description: repairDescription.trim(),
              videoFileID: fileID,
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
