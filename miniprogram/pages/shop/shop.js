// pages/shop/shop.js
const app = getApp();

Page({
  data: {
    // ... 原有 isAdmin, password 等保持不变 ...
    isAdmin: false,
    password: '3252955872', // 管理员密码
    showPasswordModal: false,
    clickCount: 0,

    // 新增：购物车数据
    cart: [],
    cartTotalPrice: 0,

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
    errorMsg: '', // 错误提示文字

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

    // 订单信息
    orderInfo: { name: '', phone: '', address: '' }
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
    // 普通模式：点击5次进入管理员
    this.data.clickCount++;
    console.log('[shop.js] 点击标题次数:', this.data.clickCount);
    if(this.data.clickCount >= 5) {
      this.setData({ showPasswordModal: true, clickCount: 0 });
      console.log('[shop.js] 显示密码输入框');
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
  onPwdInput(e) { this.pwdVal = e.detail.value; },
  checkPassword() {
    if(this.pwdVal === this.data.password) {
      this.setData({ isAdmin: true, showPasswordModal: false });
      wx.showToast({ title: 'Admin On', icon: 'success' });
    } else {
      wx.showToast({ title: 'Error', icon: 'none' });
    }
  },
  closePwdModal() { this.setData({ showPasswordModal: false }); },

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
      console.log('[shop.js] 查询结果 - errMsg:', res.errMsg);
      console.log('[shop.js] 查询结果 - data 数量:', res.data ? res.data.length : 0);
      if (res.data && res.data.length > 0) {
        console.log('[shop.js] 设置 accessoryList, 数量:', res.data.length);
        this.setData({ accessoryList: res.data });
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
  adminAddSeries() {
    const newOne = {
      id: Date.now(), name: '新产品名称', desc: '简短描述', cover: '',
      jumpNumber: null, // 新增：跳转号码
      detailImages: [], 
      specHeaders: ['型号1', '型号2', '型号3'],
      labels: {
        configTitle: '选购配置',
        modelTitle: '选择型号 (MODEL)',
        optionTitle: '配置方案 (OPTION)',
        accTitle: '配件加购'
      },
      specs: [{label:'参数1', v1:'-', v2:'-', v3:'-'}],
      models: [{name:'默认型号', price:999, desc:''}], 
      options: [{name:'默认配置', price:0, img:''}]
    };
    this.setData({ seriesList: [...this.data.seriesList, newOne] });
    this.saveSeriesToCloud(newOne, true);
  },
  adminDeleteSeries(e) {
    const idx = e.currentTarget.dataset.index;
    const series = this.data.seriesList[idx];
    wx.showModal({title:'确认删除?', success:(res)=>{
      if(res.confirm) {
        if (this.db && series._id) {
          this.db.collection('shop_series').doc(series._id).remove();
        }
        this.data.seriesList.splice(idx, 1);
        this.setData({ seriesList: this.data.seriesList });
      }
    }});
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
    // 设定阈值：350rpx (对应顶部大图 + 标题的高度)
    // 当滚动超过 350 时，显示底部栏；否则隐藏
    if (scrollTop > 350 && !this.data.showFooterBar) {
      this.setData({ showFooterBar: true });
    } else if (scrollTop <= 350 && this.data.showFooterBar) {
      this.setData({ showFooterBar: false });
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
      
      // 【关键】刚进来时，肯定在顶部，所以隐藏底部栏
      showFooterBar: false 
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
  onInput(e) { this.setData({ [`orderInfo.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  
  // ========================================================
  // 一键粘贴并自动解析地址
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
    // 调用内部添加逻辑
    const result = this._addCurrentSelectionToCart();
    
    if (result.success) {
      // 成功后操作：
      
      // 1. 准备重置配件列表
      const resetAccList = this.data.accessoryList.map(a => ({...a, selected: false}));

      this.setData({
        cart: result.newCart,
        cartTotalPrice: result.newTotal,
        
        // 【关键修改】全部重置为未选中状态 (-1)
        accessoryList: resetAccList,
        selectedModelIdx: -1, 
        selectedOptionIdx: -1, 
        
        // 弹出成功提示
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
    const cart = this.data.cart;
    
    if (type === 'plus') {
      cart[idx].quantity++;
    } else {
      if (cart[idx].quantity > 1) cart[idx].quantity--;
      else cart.splice(idx, 1);
    }
    
    if(cart[idx]) cart[idx].total = cart[idx].quantity * cart[idx].price;
    this.setData({ cart });
    this.reCalcCartTotal(cart);
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
      name: currentSeries.name + ' ' + m.name,
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
  // 2. 自定义错误提示 (Top Toast)
  // ========================================================
  showError(msg) {
    this.setData({ errorMsg: msg });
    // 2秒后自动消失
    setTimeout(() => {
      this.setData({ errorMsg: '' });
    }, 2000);
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
      
      // 获取当前选购信息
      const {currentSeries, selectedModelIdx, selectedOptionIdx} = this.data;
      const m = currentSeries.models[selectedModelIdx];
      const o = selectedOptionIdx > -1 ? currentSeries.options[selectedOptionIdx] : {name: '标配', price: 0};
      
      // 1. 【核心优化】清理之前的"立即购买"临时项
      // 如果用户之前点过立即购买但没付款，这次又换了配置点立即购买，
      // 我们要把上次那个临时的删掉，避免购物车堆积。
      let currentCart = [...this.data.cart];
      if (this.data.tempBuyItemIds.length > 0) {
        currentCart = currentCart.filter(item => !this.data.tempBuyItemIds.includes(item.id));
      }

      // 2. 更新购物车数据，以便 _addCurrentSelectionToCart 基于干净的数据操作
      this.setData({ cart: currentCart });

      // 3. 执行添加逻辑
      const result = this._addCurrentSelectionToCart();
      
      if (result.success) {
        // 4. 记录这次生成的 ID，标记为"临时购买项"
        // 找到主产品项（type === 'main'），可能是新添加的或合并的
        const mainItem = result.newCart.find(item => 
          item.type === 'main' && 
          item.seriesId === currentSeries.id &&
          item.modelName === m.name && 
          item.optionName === o.name
        );
        const tempIds = mainItem ? [mainItem.id] : [];
        
        // 5. 直接打开订单页
        this.setData({
          cart: result.newCart,
          cartTotalPrice: result.newTotal,
          showOrderModal: true,
          tempBuyItemIds: tempIds // 更新临时ID
        });
      }
      return;
    }

    // 情况 B: 没选型号，但购物车里有东西 -> 直接去结算
    if (this.data.cart.length > 0) {
      this.setData({ showOrderModal: true });
      return;
    }

    // 情况 C: 啥都没
    this.showCenterToast('请先选择配置');
  },
  
  closeOrderModal() { this.setData({ showOrderModal: false }); },

  // 修改 4：退出管理员模式
  exitAdmin() {
    wx.showModal({
      title: '退出管理',
      content: '确定要退出管理员模式吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ isAdmin: false });
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  },

  // ========================================================
  // 3. 提交订单 (校验 + 美化)
  // ========================================================
  submitOrder() {
    const { cart, orderInfo } = this.data;

    // 校验购物车
    if (cart.length === 0) {
      this.showError('购物车是空的，请先选购');
      return;
    }

    // 校验表单
    if (!orderInfo.name.trim()) {
      this.showError('请填写收货人姓名');
      return;
    }
    if (!orderInfo.phone.trim()) {
      this.showError('请填写联系电话');
      return;
    }
    if (orderInfo.phone.length < 11) { // 简单校验
      this.showError('手机号码格式不正确');
      return;
    }
    if (!orderInfo.address.trim()) {
      this.showError('请填写详细地址');
      return;
    }

    // 生成文本
    let txt = "【MT STORE 订单】\n----------------\n";
    cart.forEach((item, i) => {
      txt += `${i+1}. ${item.name} (${item.spec})\n   x${item.quantity} | ¥${item.total}\n`;
    });
    txt += `----------------\n💰 总计: ¥${this.data.cartTotalPrice}\n----------------\n`;
    txt += `👤 ${orderInfo.name}\n📞 ${orderInfo.phone}\n📍 ${orderInfo.address}`;

    wx.setClipboardData({
      data: txt,
      success: () => {
        wx.showModal({
          title: '下单成功',
          content: '订单信息已复制。请点击确定跳转客服发送。',
          showCancel: false,
          success: () => {
            this.closeOrderModal();
            // 可选：清空购物车
            // this.setData({ cart: [], cartTotalPrice: 0 });
          }
        });
      }
    });
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