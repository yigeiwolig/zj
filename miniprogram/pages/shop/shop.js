// pages/shop/shop.js
const app = getApp();

Page({
  data: {
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式

    // 新增：购物车数据
    cart: [],
    cartTotalPrice: 0,
    finalTotalPrice: 0, // 含运费总价

    // [修改] 地址相关数据
    orderInfo: { name: '', phone: '' }, // 这里不再存 address 字符串
    region: [], // 存放 ['广东省', '佛山市', '南海区']
    detailAddress: '', // 存放 '某某街道101号'

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
    shopTitle: 'MT STORE',


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

    // 新增：中间弹窗数据
    centerToast: { show: false, text: '' },

    // 新增：底部按钮栏是否显示 (默认false，滑下去才出来)
    showFooterBar: false,

    // 新增：记录通过"立即购买"添加的临时商品ID，用于覆盖
    tempBuyItemIds: [],

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

    // 新增：媒体区域的实际高度
    mediaHeight: 0
  },

  onLoad(options) {
    console.log('[shop.js] onLoad 开始', options);
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

    // 立即加载数据
    this.loadDataFromCloud();
    this.calcTotal();
  },

  // 1. 页面每次显示时，读取本地缓存的购物车
  onShow() {
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
    
    // 如果是从其他页面跳转过来的（通过号码跳转），返回到products页面
    if (this.fromOtherPage) {
      console.log('[shop.js] 从其他页面跳转过来，返回到products页面');
      wx.navigateTo({
        url: '/pages/products/products'
      });
      return;
    }
    
    // 否则正常返回上一页
    const pages = getCurrentPages();
    console.log('[shop.js] 页面栈长度:', pages.length);
    if (pages.length > 1) {
      console.log('[shop.js] 返回上一页');
      wx.navigateBack();
    } else {
      // 如果没有上一页，跳转到products页面
      console.log('[shop.js] 没有上一页，跳转到products页面');
      wx.navigateTo({
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
    this._input(this.data.shopTitle || 'MT STORE', (val) => {
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
        console.log('[shop.js] 身份验证成功：合法管理员');
    } else {
        console.log('[shop.js] 未在管理员白名单中');
      }
    } catch (err) {
      console.error('[shop.js] 权限检查失败', err);
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      wx.showToast({ title: '无权限', icon: 'none' });
      return;
    }
    
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    
    wx.showToast({
      title: nextState ? '管理模式开启' : '已回到用户模式',
      icon: 'none'
    });
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
  
  // 弹窗取消
  closeCustomEditModal() { this.setData({ showCustomEditModal: false, customEditCallback: null }); },
  
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
  loadDataFromCloud() {
    console.log('[shop.js] ========================================');
    console.log('[shop.js] ========== loadDataFromCloud 开始 ==========');
    console.log('[shop.js] ========================================');
    
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
        console.log('[shop.js] 设置 topMediaList, 数量:', res.data.list.length);
        console.log('[shop.js] topMediaList 内容:', res.data.list);
        this.setData({ topMediaList: res.data.list });
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
        
        console.log('[shop.js] 设置 seriesList, 数量:', res.data.length);
        this.setData({ seriesList: res.data });
        console.log('[shop.js] ✅ seriesList 已更新到页面数据');
        
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
        const cleanList = res.data.map(item => {
          return { ...item, selected: false };
        });

        console.log('[shop.js] 设置 accessoryList (已重置选中状态)');
        this.setData({ accessoryList: cleanList });
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
    
    console.log('[shop.js] ========== loadDataFromCloud 完成 ==========');
    console.log('[shop.js] ========================================');
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
      }).catch(err => {
        console.error('[shop.js] 添加配件失败:', err);
        console.log('[shop.js] errCode:', err.errCode, 'errMsg:', err.errMsg);
      });
    } else {
      console.log('[shop.js] 更新配件, _id:', accessory._id);
      this.db.collection('shop_accessories').doc(accessory._id).update({ data }).then(() => {
        console.log('[shop.js] 更新配件成功');
      }).catch(err => {
        console.error('[shop.js] 更新配件失败:', err);
        console.log('[shop.js] errCode:', err.errCode, 'errMsg:', err.errMsg);
      });
    }
  },

  // ================== 1. 顶部媒体 (分开上传) ==================
  adminAddImage() {
    this.chooseImageWithCrop().then(async (path) => {
      wx.showLoading({ title: '上传中...' });
      try {
        const fileID = await this.uploadToCloud(path, 'shop/topMedia');
        this.data.topMediaList.push({ type: 'image', url: fileID });
        this.setData({ topMediaList: this.data.topMediaList });
        this.saveTopMediaToCloud();
      } catch (err) {
        wx.showToast({ title: '上传失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    }).catch(() => {});
  },
  adminAddVideo() {
    wx.chooseMedia({ count: 1, mediaType: ['video'], success: async (res) => {
      wx.showLoading({ title: '上传中...' });
      try {
        const fileID = await this.uploadToCloud(res.tempFiles[0].tempFilePath, 'shop/topMedia');
        this.data.topMediaList.push({ type: 'video', url: fileID });
        this.setData({ topMediaList: this.data.topMediaList });
        this.saveTopMediaToCloud();
        wx.hideLoading();
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    }});
  },
  adminDelTopMedia(e) {
    this.data.topMediaList.splice(e.currentTarget.dataset.index, 1);
    this.setData({ topMediaList: this.data.topMediaList });
    this.saveTopMediaToCloud();
  },

  // ================== 2. 主页产品列表 CRUD ==================
  // ========================================================
  // [修改] 新建产品系列 (智能克隆模板)
  // ========================================================
  adminAddSeries() {
    // 1. 【新增】立刻显示 Loading，防止重复点击
    wx.showLoading({ title: '创建中...', mask: true });

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
        wx.hideLoading();
        wx.showToast({ title: '已新建', icon: 'success' });
    }).catch(() => {
        wx.hideLoading();
    });
  },

  // ========================================================
  // [修改] 删除产品系列 (同步删除云端)
  // ========================================================
  adminDeleteSeries(e) {
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];

    wx.showModal({
      title: '删除警告',
      content: `确定要彻底删除产品 "${series.name}" 吗？此操作不可恢复。`,
      confirmColor: '#FF3B30', // 红色确认键
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

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

          wx.hideLoading();
          wx.showToast({ title: '已删除', icon: 'none' });
      }
      }
    });
  },
  adminUploadCover(e) {
    const idx = e.currentTarget.dataset.index;
    console.log('[shop.js] ========== adminUploadCover 开始 ==========');
    console.log('[shop.js] 产品索引:', idx);
    
    this.chooseImageWithCrop().then(async (path) => {
      wx.showLoading({ title: '上传中...' });
      try {
        const fileID = await this.uploadToCloud(path, 'shop/covers');

        const series = this.data.seriesList[idx];
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

        if (isNew && saveResult && saveResult._id) {
          updatedSeries._id = saveResult._id;
          this.setData({ 
            [`seriesList[${idx}]._id`]: saveResult._id,
            [`seriesList[${idx}]`]: updatedSeries
          });
        }

        wx.showToast({ title: '上传成功', icon: 'success' });
      } catch (err) {
        console.error('[shop.js] adminUploadCover 上传失败:', err);
        wx.showToast({ title: '上传失败', icon: 'none' });
      } finally {
        wx.hideLoading();
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
  adminEditJumpNumber(e) {
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];
    const currentNumber = series.jumpNumber || '';
    
    this._input(currentNumber, (v) => {
      // 校验：必须是纯数字
      const numValue = v.trim();
      if (numValue && !/^\d+$/.test(numValue)) {
        wx.showToast({ title: '号码必须是纯数字', icon: 'none' });
        return;
      }
      
      // 校验：唯一性（如果输入了号码）
      if (numValue) {
        const duplicate = this.data.seriesList.find((item, i) => 
          i !== idx && item.jumpNumber && item.jumpNumber.toString() === numValue
        );
        if (duplicate) {
          wx.showToast({ title: '号码已存在，请使用其他号码', icon: 'none' });
          return;
        }
      }
      
      // 更新数据
      series.jumpNumber = numValue ? parseInt(numValue) : null;
      this.setData({ [`seriesList[${idx}].jumpNumber`]: series.jumpNumber });
      this.saveSeriesToCloud(series);
      wx.showToast({ title: '号码已更新', icon: 'success' });
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
        wx.showToast({ title: '最多选择2个产品对比', icon: 'none' });
      }
      
      const finalComps = list.filter(i => i.selectedForCompare);
      this.setData({ seriesList: list, compareList: finalComps });
      return;
    }

    // 正常进入详情
    const s = this.data.seriesList[idx];
    
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
    this.setData({ 
      showDetail: false,
      showFooterBar: false // 关闭详情页时也重置按钮栏
    }); 
  },

  // 修改 2：详情页添加媒体（支持视频+图片）
  adminAddDetailMedia() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image', 'video'], // 允许选视频
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });
        try {
          const file = res.tempFiles[0];
          const tempPath = file.fileType === 'image'
            ? await this.cropImageIfPossible(file.tempFilePath)
            : file.tempFilePath;
          const fileID = await this.uploadToCloud(tempPath, 'shop/detailMedia');
          const newItem = {
            type: file.fileType, // 自动识别 image 或 video
            url: fileID
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
          
          // 保存到云端
          this.saveSeriesToCloud(updatedSeries);
          
          // 检查如果现在有图了，且在顶部，可以先关掉 bar 
          // 或者为了操作方便，管理员模式下我们可以让它一直开启
          if (this.data.isAdmin) {
            this.setData({ showFooterBar: true });
          }
          
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (err) {
          console.error('[shop.js] adminAddDetailMedia 上传失败:', err);
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('[shop.js] adminAddDetailMedia 选择文件失败:', err);
        wx.showToast({ title: '选择文件失败', icon: 'none' });
      }
    });
  },
  adminDelDetailImg(e) {
    const idx = e.currentTarget.dataset.index;
    const s = this.data.currentSeries;
    
    // 【修复】确保 detailImages 数组存在
    if (!s.detailImages || idx >= s.detailImages.length) {
      wx.showToast({ title: '删除失败', icon: 'none' });
      return;
    }
    
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
      const idx = e.currentTarget.dataset.midx;
      const s = this.data.currentSeries;
      this._input(s.models[idx].price+'', (v)=>{
          s.models[idx].price = Number(v);
          this.setData({ [`seriesList[${this.data.currentSeriesIdx}].models[${idx}].price`]: Number(v), [`currentSeries.models[${idx}].price`]: Number(v) });
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
      wx.showLoading({ title: '上传中...' });
      try {
        const fileID = await this.uploadToCloud(path, 'shop/options');
          const s = this.data.currentSeries;
          
          // 【修复】确保 options 数组和对应项存在
          if (!s.options || !s.options[idx]) {
            wx.showToast({ title: '数据错误', icon: 'none' });
            wx.hideLoading();
            return;
          }
          
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
          
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (err) {
          console.error('[shop.js] adminUploadOptionImg 上传失败:', err);
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      }).catch((err) => {
        console.error('[shop.js] adminUploadOptionImg 选择文件失败:', err);
        wx.showToast({ title: '选择文件失败', icon: 'none' });
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
        wx.showToast({ title: '请至少选2个', icon: 'none' });
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
  closeSpecsModal() { this.setData({ showSpecsModal: false }); },
  
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
        wx.showToast({ title: '请先上传视频', icon: 'none' });
      } else {
        wx.showToast({ title: '暂无演示视频', icon: 'none' });
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
    this.setData({
      showVideoPlayer: false,
      currentVideoUrl: '' // 清空地址停止播放
    });
  },

  // 2. 管理员：上传/更换对比视频
  adminUploadCompareVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });
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
          
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (err) {
          wx.hideLoading();
          console.error('上传失败', err);
          wx.showToast({ title: '上传失败', icon: 'none' });
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
      wx.showToast({ title: '删除失败', icon: 'none' });
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
      wx.showToast({ title: '数据错误', icon: 'none' });
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
    wx.showActionSheet({
      itemList: ['添加参数行', '删除最后一行', '重置所有参数'],
      success: (res) => {
        const s = this.data.currentSeries;
        
        // 确保 specs 数组存在
        if (!s.specs) {
          s.specs = [];
        }
        
        if (res.tapIndex === 0) {
          // 添加行：根据型号数量动态生成列数
          const modelCount = s.models ? s.models.length : 3;
          const newRow = { label: '新参数' };
          for (let i = 1; i <= modelCount; i++) {
            newRow[`v${i}`] = '-';
          }
          s.specs.push(newRow);
        } else if (res.tapIndex === 1) {
          // 删除最后一行
          if (s.specs.length > 0) {
            s.specs.pop();
          } else {
            wx.showToast({ title: '没有可删除的行', icon: 'none' });
            return;
          }
        } else if (res.tapIndex === 2) {
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
        
        wx.showToast({ title: '已更新', icon: 'success' });
      }
    });
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
    this.setData({ showAccDetail: true, currentAccIdx: idx });
  },
  closeAccessoryDetail() { this.setData({ showAccDetail: false }); },
  
  // 在详情页点击“加入购物袋”
  addAccToCartFromDetail() {
    const idx = this.data.currentAccIdx;
    this.setData({ [`accessoryList[${idx}].selected`]: true });
    this.calcTotal();
    wx.showToast({ title: '已加入', icon: 'success' });
    this.closeAccessoryDetail();
  },
  
  // 配件 Admin 操作
  adminEditAccName() {
    const idx = this.data.currentAccIdx;
    const acc = this.data.accessoryList[idx];
    this._input(acc.name, (v) => {
      acc.name = v;
      this.setData({ [`accessoryList[${idx}].name`]: v });
      this.saveAccessoryToCloud(acc, idx);
    });
  },
  adminEditAccDesc() {
    const idx = this.data.currentAccIdx;
    const acc = this.data.accessoryList[idx];
    this._input(acc.desc, (v) => {
      acc.desc = v;
      this.setData({ [`accessoryList[${idx}].desc`]: v });
      this.saveAccessoryToCloud(acc, idx);
    });
  },
  adminEditAccPrice() {
    const idx = this.data.currentAccIdx;
    const acc = this.data.accessoryList[idx];
    this._input(acc.price+'', (v) => {
      acc.price = Number(v);
      this.setData({ [`accessoryList[${idx}].price`]: Number(v) });
      this.calcTotal();
      this.saveAccessoryToCloud(acc, idx);
    });
  },
  adminAddAccDetailImg() {
    this.chooseImageWithCrop().then(async (path) => {
      wx.showLoading({ title: '上传中...' });
      try {
        const idx = this.data.currentAccIdx;
        const fileID = await this.uploadToCloud(path, 'shop/accessories');
        const list = this.data.accessoryList;
        if(!list[idx].detailImages) list[idx].detailImages = [];
        list[idx].detailImages.push(fileID);
        this.setData({ accessoryList: list });
        this.saveAccessoryToCloud(list[idx], idx);
        wx.hideLoading();
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    }).catch((err) => {
      console.error('[shop.js] adminAddAccDetailImg 选择或裁切失败:', err);
    });
  },
  adminDelAccDetailImg(e) {
    const imgIdx = e.currentTarget.dataset.imgidx;
    const accIdx = this.data.currentAccIdx;
    const list = this.data.accessoryList;
    list[accIdx].detailImages.splice(imgIdx, 1);
    this.setData({ accessoryList: list });
    this.saveAccessoryToCloud(list[accIdx], accIdx);
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
    if (this.db && acc._id) {
      this.db.collection('shop_accessories').doc(acc._id).remove().catch(err => {
        console.log('删除配件失败:', err);
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
      wx.showLoading({ title: '上传中...' });
      try {
        const fileID = await this.uploadToCloud(path, 'shop/accessories');
        const acc = this.data.accessoryList[idx];
        acc.img = fileID;
        this.setData({ [`accessoryList[${idx}].img`]: fileID });
        this.saveAccessoryToCloud(acc, idx);
        wx.hideLoading();
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
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
  closeOrderModal() { this.setData({ showOrderModal: false }); },
  // ========================================================
  // 1. [新增] 省市区选择器监听
  // ========================================================
  onRegionChange(e) {
    console.log('选择的地区:', e.detail.value);
    this.setData({
      region: e.detail.value
    });
    // 选完地区，立刻重新计算运费
    this.reCalcFinalPrice();
  },

  // ========================================================
  // 2. [修改] 输入监听 (处理详细地址 + 手机号)
  // ========================================================
  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;

    if (key === 'detailAddress') {
      this.setData({ detailAddress: val });
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
    this.setData({ 
      showSmartPasteModal: false,
      smartPasteVal: ''
    });
  },
  
  onSmartPasteInput(e) {
    this.setData({ smartPasteVal: e.detail.value });
  },
  
  // ========================================================
  // 智能分析：解析姓名、电话、地址
  // ========================================================
  confirmSmartPaste() {
    const text = this.data.smartPasteVal.trim();
    
    if (!text) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    
    // 解析文本
    const parsed = this.parseSmartText(text);
    
    // 更新订单信息
    this.setData({
      'orderInfo.name': parsed.name || '',
      'orderInfo.phone': parsed.phone || '',
      'orderInfo.address': parsed.address || ''
    });
    
    // 关闭弹窗
    this.closeSmartPasteModal();
    
    // 提示用户
    if (parsed.name && parsed.phone && parsed.address) {
      wx.showToast({ title: '解析成功', icon: 'success' });
    } else {
      wx.showToast({ 
        title: `已解析：${parsed.name ? '姓名✓' : ''}${parsed.phone ? '电话✓' : ''}${parsed.address ? '地址✓' : ''}`, 
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // ========================================================
  // 智能文本解析：提取姓名、电话、地址
  // ========================================================
  parseSmartText(text) {
    let name = '';
    let phone = '';
    let address = '';
    
    // 1. 提取手机号（11位数字）
    const phonePattern = /1[3-9]\d{9}/;
    const phoneMatch = text.match(phonePattern);
    if (phoneMatch) {
      phone = phoneMatch[0];
      text = text.replace(phone, '').trim();
    }
    
    // 2. 提取固定电话（带区号的）
    if (!phone) {
      const telPattern = /0\d{2,3}-?\d{7,8}/;
      const telMatch = text.match(telPattern);
      if (telMatch) {
        phone = telMatch[0];
        text = text.replace(phone, '').trim();
      }
    }
    
    // 3. 提取姓名（通常在开头，2-4个汉字）
    // 先尝试匹配开头的2-4个汉字
    const namePattern = /^[\u4e00-\u9fa5]{2,4}/;
    const nameMatch = text.match(namePattern);
    if (nameMatch) {
      name = nameMatch[0];
      text = text.replace(name, '').trim();
    }
    
    // 4. 剩余部分作为地址（使用现有的地址解析函数）
    if (text) {
      const parsedAddress = this.parseAddress(text);
      address = parsedAddress.fullAddress;
    }
    
    // 5. 如果姓名没提取到，尝试从常见格式提取
    // 例如："张三 13800138000 广东省..."
    if (!name && text) {
      // 尝试匹配：姓名 + 空格/换行 + 电话
      const namePhonePattern = /^([\u4e00-\u9fa5]{2,4})\s+(\d+)/;
      const namePhoneMatch = text.match(namePhonePattern);
      if (namePhoneMatch) {
        name = namePhoneMatch[1];
        if (!phone) {
          phone = namePhoneMatch[2];
        }
      }
    }
    
    return { name, phone, address };
  },
  
  // ========================================================
  // 一键粘贴并自动解析地址（保留旧方法，兼容性）
  // ========================================================
  pasteAndParseAddress() {
    wx.getClipboardData({
      success: (res) => {
        const clipboardText = res.data.trim();
        if (!clipboardText) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' });
          return;
        }
        
        // 解析地址
        const parsed = this.parseAddress(clipboardText);
        
        // 更新地址信息
        this.setData({
          'orderInfo.address': parsed.fullAddress
        });
        
        // 如果解析出了省市区，可以提示用户
        if (parsed.province || parsed.city || parsed.district) {
          let msg = '地址已解析：';
          if (parsed.province) msg += parsed.province;
          if (parsed.city) msg += parsed.city;
          if (parsed.district) msg += parsed.district;
          wx.showToast({ title: msg, icon: 'none', duration: 2000 });
        } else {
          wx.showToast({ title: '地址已粘贴', icon: 'success' });
        }
      },
      fail: () => {
        wx.showToast({ title: '获取剪贴板失败', icon: 'none' });
      }
    });
  },
  
  // ========================================================
  // 地址解析函数（智能识别省市区）
  // ========================================================
  parseAddress(addressText) {
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
      const directCityPattern = /(北京市|上海市|天津市|重庆市|北京市|上海市|天津市|重庆市)/;
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
  // 继续选购
  onContinueShopping() {
    this.setData({ showCartSuccess: false });
  },
  
  // 立即结算 (从成功弹窗跳转)
  onGoToCheckout() {
    this.setData({ 
      showCartSuccess: false,
      showOrderModal: true 
    });
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
  // [修改] 错误提示改为微信原生样式 (去掉红色横幅)
  // ========================================================
  showError(msg) {
    // 使用微信自带的黑色气泡，不显示那个红条了
    wx.showToast({
      title: msg,
      icon: 'none',
      duration: 2000
    });
  },

  // ========================================================
  // 新增：显示中间提示
  // ========================================================
  showCenterToast(msg) {
    this.setData({
      centerToast: { show: true, text: msg }
    });
    // 1.5秒后自动消失
    setTimeout(() => {
      this.setData({ 'centerToast.show': false });
    }, 1500);
  },


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
  
  closeOrderModal() { this.setData({ showOrderModal: false }); },

  // 修改 4：退出管理员模式

  // ========================================================
  // 6. [核心] 提交校验与组装
  // ========================================================
  submitOrder() {
    const { cart, orderInfo, region, detailAddress, finalTotalPrice, shippingFee, shippingMethod } = this.data;

    // A. 购物车校验
    if (cart.length === 0) return this.showError('购物车为空');

    // B. 信息校验
    if (!orderInfo.name) return this.showError('请填写收货人姓名');

    // 手机号 11 位校验
    if (!orderInfo.phone || !/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
      return this.showError('请输入正确的11位手机号');
    }

    // 地址校验 (省市区 + 详细)
    if (region.length === 0) return this.showError('请选择省市区');
    if (!detailAddress) return this.showError('请填写详细街道门牌');

    // C. 组装完整地址字符串 (给后端和微信支付用)
    // 格式：广东省 佛山市 南海区 某某街道101号
    const fullAddressString = `${region[0]} ${region[1]} ${region[2]} ${detailAddress}`;

    // 更新 orderInfo 里的 address，因为之前的逻辑是读这个字段的
    const finalOrderInfo = {
      ...orderInfo,
      address: fullAddressString
    };

    // D. 顺丰未选地址拦截 (虽然上面已经校验了region，但为了保险)
    if (shippingMethod === 'sf' && region.length === 0) {
      return this.showError('请先选择收货地址以计算运费');
    }

    // E. 唤起支付 (复用之前的逻辑)
    this.doRealPayment(cart, finalOrderInfo, finalTotalPrice);
  },

  // ========================================================
  // 真实支付流程
  // ========================================================
  doRealPayment() {
    const { cart, orderInfo, finalTotalPrice, shippingFee, shippingMethod } = this.data;

    // 【新增】检查支付金额
    console.log('正在支付，金额为:', finalTotalPrice); // 检查控制台，这里绝对不能是 0 或 undefined
    
    if (!finalTotalPrice || finalTotalPrice <= 0) {
      wx.showToast({ title: '金额异常', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '唤起收银台...', mask: true });

    // 3. 调用云函数获取支付参数
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: finalTotalPrice,
        goods: cart,
        addressData: orderInfo,
        shippingFee: shippingFee,
        shippingMethod: shippingMethod
      },
      success: res => {
        wx.hideLoading();
        const payment = res.result;

        // 【新增检测】检查云函数返回的错误
        if (payment && payment.error) {
          wx.showModal({ 
            title: '支付失败', 
            content: payment.msg || '支付系统异常，请稍后再试', 
            showCancel: false 
          });
      return;
    }

        if (!payment || !payment.paySign) {
          // 如果这里报错，通常是商户号审核还没过
          wx.showModal({ title: '提示', content: '支付系统对接中，请稍后再试', showCancel: false });
      return;
    }

        // 4. 唤起微信原生支付界面
        wx.requestPayment({
          ...payment,
          success: (payRes) => {
            // 支付成功处理
            wx.showToast({ title: '支付成功', icon: 'success' });
            this.closeOrderModal();
            
            // 清理购物车
            this.setData({ cart: [], cartTotalPrice: 0 });
            wx.removeStorageSync('my_cart');
            wx.setStorageSync('last_address', this.data.orderInfo);
            
            // 跳转到我的页面查看订单
            wx.navigateTo({ url: '/pages/my/my' });
          },
          fail: (err) => {
            console.error('用户取消或支付失败', err);
            wx.showToast({ title: '支付已取消', icon: 'none' });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error('创建订单失败', err);
        wx.showToast({ title: '创建订单失败', icon: 'none' });
      }
    });
  },

  // ========================================================
  // [新增] 清空购物车
  // ========================================================
  clearCart() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
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
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  // ========================================================
  // 5. [核心] 运费与总价计算逻辑
  // ========================================================
  reCalcFinalPrice(goodsPrice = this.data.cartTotalPrice) {
    const { shippingMethod, region } = this.data;
    let fee = 0;

    if (shippingMethod === 'zto') {
      fee = 0; // 中通包邮
    } else if (shippingMethod === 'sf') {
      // 顺丰逻辑：只有选择了地区才算钱
      if (region.length === 0) {
        fee = 0; // 没选地址，运费暂计为0
      } else {
        const province = region[0]; // 获取省份
        // 判断是否广东
        if (province.indexOf('广东') > -1) {
          fee = 13;
        } else {
          fee = 22;
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
  // [新增] 提交定制需求 (只下单不支付)
  // ========================================================
  // 定制单提交逻辑 (同理修改校验)
  submitCustomOrder() {
    const { cart, orderInfo, region, detailAddress, finalTotalPrice, shippingFee, shippingMethod } = this.data;

    if (cart.length === 0) return this.showError('购物车为空');
    if (!orderInfo.name) return this.showError('请填写姓名');
    if (!/^1[3-9]\d{9}$/.test(orderInfo.phone)) return this.showError('手机号格式错误');
    if (region.length === 0 || !detailAddress) return this.showError('请完善收货地址');

    const fullAddressString = `${region[0]} ${region[1]} ${region[2]} ${detailAddress}`;
    const finalOrderInfo = { ...orderInfo, address: fullAddressString };

    wx.showModal({
      title: '提交定制需求',
      content: '订单将提交给管理员进行核价。',
      confirmText: '提交',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '提交中...' });
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
              wx.hideLoading();
              wx.showToast({ title: '提交成功' });
              this.closeOrderModal();
              wx.removeStorageSync('my_cart');
              this.setData({ cart: [], cartTotalPrice: 0 });
              setTimeout(() => { wx.navigateTo({ url: '/pages/my/my' }); }, 1000);
            },
            fail: () => {
              wx.hideLoading();
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
})