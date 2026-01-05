const db = wx.cloud.database();

Page({
  data: {
    // 基础交互数据
    isVideoFullScreen: false,
    stepIndex: 0,
    pIndex: -1,
    tIndex: -1,
    mode: 'v',
    showAll: false, // 显示全部模式（管理员专用）
    startY: 0,
    scrollToId: 'step1',
    canScroll: false,

    // 管理员相关
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式
    
    // 匹配码选择弹窗
    showMatchCodePicker: false,
    availableProducts: [], // 可用的产品列表（已创建的）
    availableTypes: [], // 可用的车型列表（已创建的）
    matchCodeProductNum: 1,
    matchCodeTypeNum: 1,
    matchCodeProductIndex: 0,
    matchCodeTypeIndex: 0,
    currentProductName: '',
    currentTypeName: '',
    tempUploadData: null, // 临时保存上传数据

    // 预设数据（将从云数据库加载）
    products: [], // 产品型号 [{name: '', series: '', suffix: '', number: 1, _id: ''}]
    types: [],    // 车型分类 [{name: '', number: 1, _id: ''}]
    
    // 教程数据（从云数据库加载，根据选择的product+type过滤）
    chapters: [], // 视频分段 [{title: '', url: '', matchCode: '1+1', _id: ''}]
    graphics: [], // 图文详情 [{title: '', img: '', desc: '', matchCode: '1+1', _id: ''}]
    
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
    editItemData: null,  // 正在编辑的项目数据
    editItemType: '',    // 编辑类型：'chapters' 或 'graphics'
    editItemIndex: -1,
    // 新增：用于布局的精确高度变量
    winHeight: 0,
    scrollViewHeight: 0,

    // 滚动控制
    scrollTopValue: 0,
    locked: false
  },

  // 页面加载时从云数据库读取数据
  onLoad: function() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('azjc');
    }
    
    // 1. 获取系统屏幕高度（px）
    const sys = wx.getSystemInfoSync();
    const winHeight = sys.windowHeight;

    // 2. 计算滚动区域高度（按你页面结构预留顶部区域）
    const scrollViewHeight = winHeight - 90;

    this.setData({
      winHeight,
      scrollViewHeight
    });

    // 检查管理员权限
    this.checkAdminPrivilege();
    this.loadDataFromCloud();
  },

  // ================== 权限检查逻辑 ==================
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
        this.setData({ isAuthorized: true });
        console.log('[azjc.js] 身份验证成功：合法管理员');
      }
    } catch (err) {
      console.error('[azjc.js] 权限检查失败', err);
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

  // 从云数据库加载数据
  loadDataFromCloud: function() {
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
          : [
              { name: 'F1 PRO / MAX', series: '智能系列', suffix: 'F1', number: 1 },
              { name: 'F2 PRO / MAX', series: '性能系列', suffix: 'F2', number: 2 },
              { name: 'F2 MAX LONG', series: '长续航系列', suffix: 'L', number: 3 }
            ];
        
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
            this.loadVideosAndGraphics();
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
            this.loadVideosAndGraphics();
          }
        });
      },
      fail: (err) => {
        console.error('加载产品数据失败:', err);
        // 使用默认数据
        const products = [
          { name: 'F1 PRO / MAX', series: '智能系列', suffix: 'F1', number: 1 },
          { name: 'F2 PRO / MAX', series: '性能系列', suffix: 'F2', number: 2 },
          { name: 'F2 MAX LONG', series: '长续航系列', suffix: 'L', number: 3 }
        ];
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
            this.loadVideosAndGraphics();
          },
          fail: () => {
            const types = [
              { name: '踏板车', number: 1 },
              { name: '跨骑车', number: 2 },
              { name: '电摩/电动自行车', number: 3 }
            ];
            this.setData({ types });
            this.loadVideosAndGraphics();
          }
        });
      }
    });
  },

  // 加载视频和图文数据
  loadVideosAndGraphics: function() {
    // 读取视频章节
    db.collection('azjc').where({
      type: 'video'
    }).orderBy('createTime', 'desc').get({
      success: (res) => {
        if (res.data.length === 0) {
          // 没有视频数据，继续读取图文
          this.loadGraphicsData([]);
          return;
        }
        
        // 获取所有视频文件ID
        const videoFileIDs = res.data.map(item => item.url).filter(id => id);
        
        if (videoFileIDs.length > 0) {
          // 批量获取临时链接
          wx.cloud.getTempFileURL({
            fileList: videoFileIDs,
            success: (urlRes) => {
              // 创建 fileID 到 tempURL 的映射
              const urlMap = {};
              urlRes.fileList.forEach(file => {
                urlMap[file.fileID] = file.tempFileURL;
              });
              
              const chapters = res.data.map(item => {
                // 检查是否有临时链接，如果没有或获取失败，标记需要重新获取
                const tempURL = urlMap[item.url];
                return {
                  title: item.title,
                  url: tempURL || item.url, // 使用临时链接，如果没有则使用原ID
                  fileID: item.url, // 保存原始fileID用于删除和重新获取
                  matchCode: item.matchCode || '', // 匹配码，如 '1+1', '1+2' 等
                  _id: item._id,
                  needRefresh: !tempURL // 标记是否需要刷新链接
                };
              });
              
              this.setData({ chapters });
              this.filterContent(); // 根据当前选择过滤内容
              
              // 读取图文详情
              this.loadGraphicsData(chapters);
            },
            fail: (err) => {
              console.error('获取视频临时链接失败:', err);
              // 即使获取失败，也使用原始fileID
              const chapters = res.data.map(item => ({
                title: item.title,
                url: item.url,
                fileID: item.url,
                matchCode: item.matchCode || '',
                _id: item._id
              }));
              this.setData({ chapters });
              this.filterContent();
              this.loadGraphicsData(chapters);
            }
          });
        } else {
          this.loadGraphicsData([]);
        }
      },
      fail: (err) => {
        console.error('加载视频数据失败:', err);
        wx.showToast({ title: '加载数据失败', icon: 'none' });
      }
    });
  },

  // 加载图文数据
  loadGraphicsData: function(chapters) {
    db.collection('azjc').where({
      type: 'image'
    }).orderBy('createTime', 'desc').get({
      success: (imgRes) => {
        if (imgRes.data.length === 0) {
          this.setData({
            chapters: chapters,
            graphics: []
          });
          this.filterContent();
          return;
        }
        
        // 获取所有图片文件ID
        const imageFileIDs = imgRes.data.map(item => item.img).filter(id => id);
        
        if (imageFileIDs.length > 0) {
          // 批量获取临时链接
          wx.cloud.getTempFileURL({
            fileList: imageFileIDs,
            success: (urlRes) => {
              // 创建 fileID 到 tempURL 的映射
              const urlMap = {};
              urlRes.fileList.forEach(file => {
                urlMap[file.fileID] = file.tempFileURL;
              });
              
              const graphics = imgRes.data.map(item => ({
                title: item.title,
                img: urlMap[item.img] || item.img, // 使用临时链接
                fileID: item.img, // 保存原始fileID用于删除
                desc: item.desc || '',
                matchCode: item.matchCode || '', // 匹配码，如 '1+1', '1+2' 等
                _id: item._id
              }));
              
              this.setData({ graphics });
              this.filterContent(); // 根据当前选择过滤内容
            },
            fail: (err) => {
              console.error('获取图片临时链接失败:', err);
              // 即使获取失败，也使用原始fileID
              const graphics = imgRes.data.map(item => ({
                title: item.title,
                img: item.img,
                fileID: item.img,
                desc: item.desc || '',
                matchCode: item.matchCode || '',
                _id: item._id
              }));
              
              this.setData({
                chapters: chapters,
                graphics: graphics
              });
              this.filterContent();
            }
          });
        } else {
          this.setData({ graphics: [] });
          this.filterContent();
        }
      },
      fail: (err) => {
        console.error('加载图文数据失败:', err);
        wx.showToast({ title: '加载数据失败', icon: 'none' });
      }
    });
  },

  // 第一步：选产品
  selectProduct: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ pIndex: index });
    wx.vibrateShort({ type: 'medium' });
    setTimeout(() => {
      this.setData({ stepIndex: 1, canScroll: true });
      this.filterContent(); // 选择产品后重新过滤内容
    }, 450);
  },

  // 第二步：选车型
  selectType: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ tIndex: index });
    wx.vibrateShort({ type: 'medium' });
    setTimeout(() => {
      this.setData({ stepIndex: 2 });
      this.filterContent(); // 选择车型后重新过滤内容
    }, 450);
  },

  // 根据选择的product+type过滤内容
  filterContent: function() {
    const { products, types, chapters, graphics, pIndex, tIndex, showAll, isAdmin } = this.data;
    
    // 管理员模式下，如果开启了"显示全部"，显示所有内容
    if (isAdmin && showAll) {
      const allChapters = [...chapters].sort((a, b) => {
        // 先按匹配码分组，再按order排序
        if (a.matchCode !== b.matchCode) {
          return (a.matchCode || '').localeCompare(b.matchCode || '');
        }
        return (a.order || 0) - (b.order || 0);
      });
      
      const allGraphics = [...graphics].sort((a, b) => {
        if (a.matchCode !== b.matchCode) {
          return (a.matchCode || '').localeCompare(b.matchCode || '');
        }
        return (a.order || 0) - (b.order || 0);
      });
      
      this.setData({
        filteredChapters: allChapters,
        filteredGraphics: allGraphics
      });
      return;
    }
    
    if (pIndex < 0 || tIndex < 0) {
      // 如果还没选择完整，不显示内容
      this.setData({
        filteredChapters: [],
        filteredGraphics: []
      });
      return;
    }
    
    const product = products[pIndex];
    const type = types[tIndex];
    
    if (!product || !type) {
      this.setData({
        filteredChapters: [],
        filteredGraphics: []
      });
      return;
    }
    
    // 构建匹配码，如 '1+1', '2+3' 等
    const matchCode = `${product.number || (pIndex + 1)}+${type.number || (tIndex + 1)}`;
    
    // 过滤视频：只显示匹配码相同的内容，并按order排序
    const filteredChapters = chapters.filter(item => {
      if (!item.matchCode) return false; // 没有匹配码的不显示
      return item.matchCode === matchCode;
    }).sort((a, b) => {
      // 相同匹配码的内容按order排序
      if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
      return 0;
    });
    
    // 过滤图文：只显示匹配码相同的内容，并按order排序
    const filteredGraphics = graphics.filter(item => {
      if (!item.matchCode) return false; // 没有匹配码的不显示
      return item.matchCode === matchCode;
    }).sort((a, b) => {
      // 相同匹配码的内容按order排序
      if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
      return 0;
    });
    
    this.setData({
      filteredChapters: filteredChapters,
      filteredGraphics: filteredGraphics
    });
  },

  // 模式切换
  switchMode: function(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
    this.filterContent(); // 重新过滤内容
  },

  // 切换显示全部模式
  toggleShowAll: function() {
    const showAll = !this.data.showAll;
    this.setData({ showAll: showAll });
    this.filterContent(); // 重新过滤内容
  },


  // 真实媒体上传
  uploadMedia: function(e) {
    const mediaType = e.currentTarget.dataset.type; // 'video' 或 'image'
    wx.chooseMedia({
      count: 1,
      mediaType: [mediaType],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        wx.showModal({
          title: '设置标题',
          editable: true,
          placeholderText: '例如：支架固定指导',
          success: (resModal) => {
            if (resModal.confirm) {
              const title = resModal.content || '未命名步骤';
              
              // 显示上传进度
              getApp().showLoading({ title: '上传中...', mask: true });
              
              // 生成云存储路径
              const suffix = mediaType === 'video' ? '.mp4' : '.jpg';
              const cloudPath = `azjc/${mediaType}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${suffix}`;
              
              // 上传到云存储
              wx.cloud.uploadFile({
                cloudPath: cloudPath,
                filePath: tempPath,
                success: (uploadRes) => {
                  // 上传成功，保存到云数据库
                  const fileID = uploadRes.fileID;
                  const data = {
                    type: mediaType,
                    title: title,
                    createTime: db.serverDate()
                  };
                  
                  if (mediaType === 'video') {
                    data.url = fileID;
                  } else {
                    data.img = fileID;
                    data.desc = ''; // 留空，不显示描述
                  }
                  
                  // 弹出设置匹配码的弹窗
                  this.showMatchCodeModal(mediaType, fileID, title, data);
              // 关闭上传中的 loading，等待用户选择匹配码
              getApp().hideLoading();
                },
                fail: (err) => {
                  console.error('上传文件失败:', err);
                  getApp().hideLoading();
                  wx.showToast({ title: '上传失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 });
                }
              });
            }
          }
        });
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
              
              wx.showToast({ title: '添加成功', icon: 'success' });
            },
            fail: (err) => {
              console.error('保存到数据库失败:', err);
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 显示匹配码选择弹窗
  showMatchCodeModal: function(mediaType, fileID, title, data) {
    const { products, types } = this.data;
    
    // 显示所有从云端读取的产品和车型（有_id的，说明是已创建并保存到云端的）
    // 如果没有从云端读取到数据，则使用当前data中的数据（可能是默认数据或刚创建的）
    const availableProducts = products.filter(p => p._id).length > 0 
      ? products.filter(p => p._id)  // 优先使用从云端读取的
      : products;  // 如果没有云端数据，使用当前数据（包括默认数据）
    
    const availableTypes = types.filter(t => t._id).length > 0
      ? types.filter(t => t._id)  // 优先使用从云端读取的
      : types;  // 如果没有云端数据，使用当前数据（包括默认数据）
    
    console.log('可用产品:', availableProducts);
    console.log('可用车型:', availableTypes);
    
    // 如果确实没有任何数据，才提示
    if (availableProducts.length === 0 || availableTypes.length === 0) {
      wx.showToast({ title: '请先创建产品和车型', icon: 'none', duration: 2000 });
      getApp().hideLoading();
      return;
    }
    
    const firstProduct = availableProducts[0];
    const firstType = availableTypes[0];
    
    // 保存临时数据
    this.setData({
      showMatchCodePicker: true,
      tempUploadData: { mediaType, fileID, title, data },
      availableProducts: availableProducts, // 显示所有可用的产品
      availableTypes: availableTypes, // 显示所有可用的车型
      matchCodeProductNum: firstProduct ? (firstProduct.number || 1) : 1,
      matchCodeTypeNum: firstType ? (firstType.number || 1) : 1,
      matchCodeProductIndex: 0,
      matchCodeTypeIndex: 0,
      currentProductName: firstProduct ? firstProduct.name : '请选择',
      currentTypeName: firstType ? firstType.name : '请选择'
    });
  },

  // 关闭匹配码选择弹窗
  hideMatchCodePicker: function() {
    this.setData({
      showMatchCodePicker: false,
      tempUploadData: null
    });
  },

  // 选择产品号码
  onProductNumChange: function(e) {
    const selectedIndex = parseInt(e.detail.value);
    const availableProducts = this.data.availableProducts || [];
    const selectedProduct = availableProducts[selectedIndex];
    
    if (!selectedProduct) return;
    
    const productNum = selectedProduct.number || (selectedIndex + 1);
    this.setData({
      matchCodeProductNum: productNum,
      matchCodeProductIndex: selectedIndex,
      currentProductName: selectedProduct.name || '请选择'
    });
  },

  // 选择车型号码
  onTypeNumChange: function(e) {
    const selectedIndex = parseInt(e.detail.value);
    const availableTypes = this.data.availableTypes || [];
    const selectedType = availableTypes[selectedIndex];
    
    if (!selectedType) return;
    
    const typeNum = selectedType.number || (selectedIndex + 1);
    this.setData({
      matchCodeTypeNum: typeNum,
      matchCodeTypeIndex: selectedIndex,
      currentTypeName: selectedType.name || '请选择'
    });
  },

  // 确认匹配码选择
  confirmMatchCode: function() {
    const { tempUploadData, matchCodeProductNum, matchCodeTypeNum, products, types, chapters, graphics } = this.data;
    
    if (!tempUploadData) {
      wx.showToast({ title: '上传数据丢失，请重新上传', icon: 'none' });
      this.hideMatchCodePicker();
      return;
    }
    
    const { mediaType, fileID, title, data, isEdit } = tempUploadData;
    const matchCode = `${matchCodeProductNum}+${matchCodeTypeNum}`;
    
    // 如果是编辑模式，更新现有记录
    if (isEdit && data._id) {
      db.collection('azjc').doc(data._id).update({
        data: { matchCode: matchCode },
        success: () => {
          // 更新本地数据
          const allList = mediaType === 'video' ? this.data.chapters : this.data.graphics;
          const item = allList.find(i => i._id === data._id);
          if (item) {
            item.matchCode = matchCode;
            this.setData({
              [mediaType === 'video' ? 'chapters' : 'graphics']: allList
            });
            this.filterContent();
          }
          
          this.hideMatchCodePicker();
          wx.showToast({ title: '匹配码已更新', icon: 'success' });
        },
        fail: (err) => {
          console.error('更新匹配码失败:', err);
          wx.showToast({ title: '更新失败', icon: 'none' });
        }
      });
      return;
    }
    
    // 计算当前匹配码的最大order值
    const sameMatchCodeItems = mediaType === 'video' 
      ? chapters.filter(item => item.matchCode === matchCode)
      : graphics.filter(item => item.matchCode === matchCode);
    const maxOrder = sameMatchCodeItems.length > 0 
      ? Math.max(...sameMatchCodeItems.map(item => item.order || 0))
      : -1;
    
    // 保存到云数据库
    data.matchCode = matchCode;
    data.order = maxOrder + 1; // 新上传的排在最后
    
    console.log('保存到数据库，数据:', data);
    getApp().showLoading({ title: '保存中...', mask: true });
    
    db.collection('azjc').add({
      data: data,
      success: (addRes) => {
        // 获取临时访问链接用于显示
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: (urlRes) => {
            const tempURL = urlRes.fileList[0].tempFileURL;
            
            // 添加到本地数据
            if (mediaType === 'video') {
              let list = [...this.data.chapters];
              list.push({ 
                title: title, 
                url: tempURL,
                fileID: fileID,
                matchCode: matchCode,
                order: data.order,
                _id: addRes._id 
              });
              // 重新排序
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ chapters: list });
            } else {
              let list = [...this.data.graphics];
              list.push({ 
                title: title, 
                img: tempURL,
                fileID: fileID,
                matchCode: matchCode,
                order: data.order,
                desc: '',
                _id: addRes._id 
              });
              // 重新排序
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ graphics: list });
            }
            
            this.filterContent(); // 重新过滤内容
            this.hideMatchCodePicker(); // 关闭弹窗
            getApp().hideLoading();
            wx.showToast({ title: '上传成功', icon: 'success' });
          },
          fail: (err) => {
            console.error('获取临时链接失败:', err);
            // 即使获取失败，也添加到本地
            if (mediaType === 'video') {
              let list = [...this.data.chapters];
              list.push({ title: title, url: fileID, fileID: fileID, matchCode: matchCode, order: data.order, _id: addRes._id });
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ chapters: list });
            } else {
              let list = [...this.data.graphics];
              list.push({ title: title, img: fileID, fileID: fileID, matchCode: matchCode, order: data.order, desc: '', _id: addRes._id });
              list.sort((a, b) => {
                if (a.matchCode !== b.matchCode) return 0;
                return (a.order || 0) - (b.order || 0);
              });
              this.setData({ graphics: list });
            }
            this.filterContent();
            this.hideMatchCodePicker();
            getApp().hideLoading();
            wx.showToast({ title: '上传成功', icon: 'success' });
          }
        });
      },
      fail: (err) => {
        console.error('保存到数据库失败:', err);
        getApp().hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
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
          
          // 更新云数据库
          if (item._id) {
            db.collection('azjc').doc(item._id).update({
              data: {
                number: number,
                order: number
              },
              success: () => {
                // 更新本地数据
                let list = [...this.data[type]];
                list[index].number = number;
                // 重新排序
                list.sort((a, b) => (a.number || 0) - (b.number || 0));
                this.setData({ [type]: list });
                this.filterContent(); // 重新过滤内容
                wx.showToast({ title: '设置成功', icon: 'success' });
              },
              fail: (err) => {
                console.error('更新失败:', err);
                wx.showToast({ title: '更新失败', icon: 'none' });
              }
            });
          } else {
            // 如果没有_id，只更新本地
            let list = [...this.data[type]];
            list[index].number = number;
            list.sort((a, b) => (a.number || 0) - (b.number || 0));
            this.setData({ [type]: list });
            this.filterContent();
            wx.showToast({ title: '设置成功', icon: 'success' });
          }
        }
      }
    });
  },

  // 上移视频/图文
  moveItemUp: function(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = type === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    
    if (index <= 0) return; // 已经在最上面
    
    const item = list[index];
    const prevItem = list[index - 1];
    
    // 交换order
    const tempOrder = item.order || 0;
    const newOrder = prevItem.order || 0;
    
    // 更新云数据库
    const updatePromises = [];
    if (item._id) {
      updatePromises.push(
        db.collection('azjc').doc(item._id).update({
          data: { order: newOrder }
        })
      );
    }
    if (prevItem._id) {
      updatePromises.push(
        db.collection('azjc').doc(prevItem._id).update({
          data: { order: tempOrder }
        })
      );
    }
    
    Promise.all(updatePromises).then(() => {
      // 更新本地数据
      const allList = type === 'chapters' ? this.data.chapters : this.data.graphics;
      const allItem = allList.find(i => i._id === item._id);
      const allPrevItem = allList.find(i => i._id === prevItem._id);
      
      if (allItem) allItem.order = newOrder;
      if (allPrevItem) allPrevItem.order = tempOrder;
      
      this.setData({
        [type === 'chapters' ? 'chapters' : 'graphics']: allList
      });
      this.filterContent();
      wx.showToast({ title: '已上移', icon: 'success' });
    }).catch(err => {
      console.error('更新排序失败:', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  // 下移视频/图文
  moveItemDown: function(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = type === 'chapters' ? this.data.filteredChapters : this.data.filteredGraphics;
    
    if (index >= list.length - 1) return; // 已经在最下面
    
    const item = list[index];
    const nextItem = list[index + 1];
    
    // 交换order
    const tempOrder = item.order || 0;
    const newOrder = nextItem.order || 0;
    
    // 更新云数据库
    const updatePromises = [];
    if (item._id) {
      updatePromises.push(
        db.collection('azjc').doc(item._id).update({
          data: { order: newOrder }
        })
      );
    }
    if (nextItem._id) {
      updatePromises.push(
        db.collection('azjc').doc(nextItem._id).update({
          data: { order: tempOrder }
        })
      );
    }
    
    Promise.all(updatePromises).then(() => {
      // 更新本地数据
      const allList = type === 'chapters' ? this.data.chapters : this.data.graphics;
      const allItem = allList.find(i => i._id === item._id);
      const allNextItem = allList.find(i => i._id === nextItem._id);
      
      if (allItem) allItem.order = newOrder;
      if (allNextItem) allNextItem.order = tempOrder;
      
      this.setData({
        [type === 'chapters' ? 'chapters' : 'graphics']: allList
      });
      this.filterContent();
      wx.showToast({ title: '已下移', icon: 'success' });
    }).catch(err => {
      console.error('更新排序失败:', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  // 原地删除数据
  deleteItem: function(e) {
    const { type, index } = e.currentTarget.dataset;
    (wx.__mt_oldShowModal || wx.showModal)({
      title: '确认删除',
      content: '删除后无法撤销',
      success: (res) => {
        if (res.confirm) {
          const list = this.data[type];
          const item = list[index];
          
          if (!item._id) {
            // 如果没有 _id，说明是本地数据，直接删除
            list.splice(index, 1);
            this.setData({ [type]: list });
            wx.showToast({ title: '已删除', icon: 'success' });
            return;
          }
          
          // 显示删除进度
          getApp().showLoading({ title: '删除中...', mask: true });
          
          // 删除云数据库记录
          db.collection('azjc').doc(item._id).remove({
            success: () => {
              // 删除云存储文件（使用保存的fileID）
              const fileID = item.fileID || (type === 'chapters' ? item.url : item.img);
              // 判断是否是云存储fileID（以cloud://开头）
              if (fileID && fileID.startsWith('cloud://')) {
                wx.cloud.deleteFile({
                  fileList: [fileID],
                  success: () => {
                    console.log('云存储文件删除成功');
                  },
                  fail: (err) => {
                    console.error('云存储文件删除失败:', err);
                    // 即使文件删除失败，也继续删除本地数据
                  }
                });
              }
              
              // 更新本地数据
              list.splice(index, 1);
              this.setData({ [type]: list });
              // 重新过滤以刷新显示
              this.filterContent();
              
              getApp().hideLoading();
              wx.showToast({ title: '已删除', icon: 'success' });
            },
            fail: (err) => {
              console.error('删除数据库记录失败:', err);
              getApp().hideLoading();
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          });
        }
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
    this.setData({
      showEditModal: false,
      editItemData: null,
      editItemType: '',
      editItemIndex: -1
    });
  },

  // 保存编辑
  saveEdit: function() {
    const { editItemData, editItemType, editItemIndex } = this.data;
    
    if (!editItemData || !editItemData._id) {
      wx.showToast({ title: '数据错误', icon: 'none' });
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
          
          // 更新云数据库
          db.collection('azjc').doc(editItemData._id).update({
            data: { title: newTitle },
            success: () => {
              // 更新本地数据
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
              wx.showToast({ title: '编辑成功', icon: 'success' });
            },
            fail: (err) => {
              console.error('更新失败:', err);
              wx.showToast({ title: '更新失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 编辑匹配码
  editMatchCode: function() {
    const { editItemData } = this.data;
    
    if (!editItemData) return;
    
    // 显示匹配码选择弹窗
    const availableProducts = this.data.products.filter(p => p._id);
    const availableTypes = this.data.types.filter(t => t._id);
    
    let productNum = 1;
    let typeNum = 1;
    let productIndex = 0;
    let typeIndex = 0;
    
    // 如果有现有匹配码，解析并设置
    if (editItemData.matchCode) {
      const matchParts = editItemData.matchCode.split('+');
      if (matchParts.length === 2) {
        productNum = parseInt(matchParts[0]);
        typeNum = parseInt(matchParts[1]);
        
        productIndex = availableProducts.findIndex(p => p.number === productNum);
        typeIndex = availableTypes.findIndex(t => t.number === typeNum);
        
        if (productIndex < 0) productIndex = 0;
        if (typeIndex < 0) typeIndex = 0;
      }
    }
    
    this.setData({
      showMatchCodePicker: true,
      tempUploadData: {
        mediaType: editItemData.url ? 'video' : 'image',
        fileID: editItemData.fileID,
        title: editItemData.title,
        data: { _id: editItemData._id },
        isEdit: true // 标记为编辑模式
      },
      availableProducts: availableProducts,
      availableTypes: availableTypes,
      matchCodeProductNum: productNum,
      matchCodeTypeNum: typeNum,
      matchCodeProductIndex: productIndex,
      matchCodeTypeIndex: typeIndex,
      currentProductName: availableProducts[productIndex] ? availableProducts[productIndex].name : '',
      currentTypeName: availableTypes[typeIndex] ? availableTypes[typeIndex].name : ''
    });
    
    this.hideEditModal();
  },

  // 长按开始拖拽
  onDragStart: function(e) {
    if (!this.data.isAdmin) return;
    
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
    const systemInfo = wx.getSystemInfoSync();
    const cardHeightPx = 540 * systemInfo.windowWidth / 750; // 假设卡片高度540rpx
    
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
      
      // 更新order值
      const allList = this.data.dragType === 'chapters' ? this.data.chapters : this.data.graphics;
      const allItem1 = allList.find(i => i._id === list[this.data.dragIndex]._id);
      const allItem2 = allList.find(i => i._id === list[targetIndex]._id);
      
      if (allItem1 && allItem2) {
        const tempOrder = allItem1.order || 0;
        allItem1.order = allItem2.order || 0;
        allItem2.order = tempOrder;
        
        // 同步到云数据库
        const updatePromises = [];
        if (allItem1._id) {
          updatePromises.push(
            db.collection('azjc').doc(allItem1._id).update({
              data: { order: allItem1.order }
            })
          );
        }
        if (allItem2._id) {
          updatePromises.push(
            db.collection('azjc').doc(allItem2._id).update({
              data: { order: allItem2.order }
            })
          );
        }
        
        Promise.all(updatePromises).catch(err => {
          console.error('更新排序失败:', err);
        });
      }
      
      const remainingOffset = deltaY - (moveIndex * cardHeightPx);
      
      this.setData({
        [this.data.dragType === 'chapters' ? 'filteredChapters' : 'filteredGraphics']: newList,
        [this.data.dragType === 'chapters' ? 'chapters' : 'graphics']: allList,
        dragIndex: targetIndex,
        dragStartY: currentY - remainingOffset,
        dragOffsetY: remainingOffset,
        lastSwapIndex: targetIndex
      });
      
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
    
    // 重新计算所有项目的order值（根据当前显示顺序）
    const updatePromises = [];
    list.forEach((item, index) => {
      const allItem = allList.find(i => i._id === item._id);
      if (allItem && allItem.order !== index) {
        allItem.order = index;
        if (allItem._id) {
          updatePromises.push(
            db.collection('azjc').doc(allItem._id).update({
              data: { order: index }
            }).catch(err => {
              console.error('更新order失败:', err);
            })
          );
        }
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
      
      wx.showToast({ title: '排序已保存', icon: 'success', duration: 1000 });
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
  touchStart: function(e) {
    // 如果正在全屏或已锁定，不记录起始位置，防止误触发翻页
    if (this.data.isVideoFullScreen || this.data.locked) {
      return;
    }
    this.setData({ startY: e.touches[0].pageY });
  },

  touchEnd: function(e) {
    // 如果是管理员模式，或者正在全屏，或者刚才摸了视频区域 -> 都不准翻页
    if (this.data.isAdmin || this.data.isVideoFullScreen || this.data.locked) return;

    let endY = e.changedTouches[0].pageY;
    let distance = endY - this.data.startY;
    
    // 如果是管理员，放开所有限制
    if (this.data.isAdmin) {
      if (Math.abs(distance) > 50) {
        if (distance > 0 && this.data.stepIndex > 0) {
          // 向下滑动 -> 回退上一页
          this.setData({ stepIndex: this.data.stepIndex - 1 });
        } else if (distance < 0 && this.data.stepIndex < 2) {
          // 向上滑动 -> 进入下一页
          this.setData({ stepIndex: this.data.stepIndex + 1 });
        }
      }
      return; // 管理员逻辑执行完直接结束，不走下面的普通锁定逻辑
    }

    // --- 以下是普通用户逻辑 (保持原有的锁定逻辑) ---
    if (distance > 80) { // 向下滑动
      // 仅在非视频列表页（stepIndex不为2）时才允许向下滑动返回
      if (this.data.stepIndex === 1) {
        this.setData({ stepIndex: 0 }); // 产品保持记录
      }
    }
  },

  // 1. 新增：拦截视频区域的触摸，防止翻页
  doNothing: function() {},
  videoTouchStart: function() { 
    // 立即锁定，防止点击全屏按钮时触发翻页
    this.setData({ locked: true }); 
  },
  videoTouchEnd: function() { 
    // 延迟释放，防止误触
    // 注意：如果正在全屏，锁定会由 onVideoFullScreen 管理，这里不释放
    setTimeout(() => { 
      if (!this.data.isVideoFullScreen) {
        this.setData({ locked: false }); 
      }
    }, 150); 
  },

// 3. 修改：滚动监听 (只记录不渲染)

  onScroll(e) {
    if (!this.data.isVideoFullScreen) {
      this.privateScrollTop = e.detail.scrollTop;
    this.scrollTopValue = e.detail.scrollTop;
    }
  },

  // 视频进入/退出全屏
  onVideoFullScreen(e) {
    const isFull = e.detail.fullScreen;
    const currentPos = this.privateScrollTop || 0;

    if (isFull) {
      // 进入全屏：立即锁定翻页，防止点击全屏按钮时触发 touchEnd 翻页
      this.setData({
        isVideoFullScreen: true,
        locked: true, // 立即锁定，防止翻页
        scrollTopValue: currentPos
      });
      this._savedPos = currentPos;
      
    } else {
      // 退出全屏
      this.setData({ isVideoFullScreen: false });
      
      // 延迟恢复位置和释放锁定
      setTimeout(() => {
        this.setData({ 
          scrollTopValue: this._savedPos,
          locked: false // 延迟释放锁定，防止退出时误触发翻页
        });
      }, 300);
      
    } // <--- 【注意】这里是 else 的结束，绝对不能加逗号！
    
  },

  // 视频播放错误处理
  onVideoError: function(e) {
    const { index, fileid } = e.currentTarget.dataset;
    console.error('视频播放失败:', e.detail, 'fileID:', fileid);
    
    // 如果播放失败，尝试重新获取临时链接
    if (fileid && fileid.startsWith('cloud://')) {
      getApp().showLoading({ title: '重新加载...', mask: true });
      
      wx.cloud.getTempFileURL({
        fileList: [fileid],
        success: (urlRes) => {
          if (urlRes.fileList && urlRes.fileList.length > 0 && urlRes.fileList[0].tempFileURL) {
            const tempURL = urlRes.fileList[0].tempFileURL;
            const chapters = [...this.data.chapters];
            if (chapters[index]) {
              chapters[index].url = tempURL;
              chapters[index].needRefresh = false;
              this.setData({ chapters: chapters });
              getApp().hideLoading();
              wx.showToast({ title: '视频已重新加载', icon: 'success', duration: 1500 });
            }
          } else {
            getApp().hideLoading();
            wx.showToast({ title: '视频加载失败，请稍后重试', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('重新获取临时链接失败:', err);
          getApp().hideLoading();
          wx.showToast({ title: '视频加载失败', icon: 'none' });
        }
      });
    } else {
      wx.showToast({ title: '视频文件无效', icon: 'none' });
    }
  },

  // 返回键处理
  handleBack: function() {
    wx.navigateBack({
      fail: () => {
        // 如果没有上一页，则跳转到首页
        wx.reLaunch({
          url: '/pages/home/home'
        });
      }
    });
  }
});
