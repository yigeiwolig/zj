// pages/pagenew/pagenew.js
const app = getApp()

Page({
  data: {
    isAdmin: false,
    showPasswordModal: false,
    
    currentIndex: 0,
    products: [], 
    defaultCover: '',

    clickCount: 0,
    clickTimer: null,
    pwdInput: '',
    
    // 新增：自定义编辑弹窗
    showCustomEditModal: false,
    customEditTitle: '',
    customEditVal: '',
    customEditCallback: null
  },

  onLoad: function() {
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true });
      this.db = wx.cloud.database();
      this.fetchProducts();
    }
    
    // 尝试从storage读取管理员状态
    const savedAdmin = wx.getStorageSync('isAdmin');
    if (savedAdmin) {
      this.setData({ isAdmin: true });
    }
  },

  // 左上角返回
  goBack: function() {
    wx.navigateBack({
      fail: () => { wx.reLaunch({ url: '/pages/index/index' }); }
    });
  },

  // 读取数据
  fetchProducts: function() {
    var _this = this;
    this.db.collection('products').get().then(res => {
      // 确保每个产品都有jumpNumber字段
      const products = (res.data || []).map(item => ({
        ...item,
        jumpNumber: item.jumpNumber || null
      }));
      _this.setData({ products: products });
      console.log('[pagenew] 加载产品列表成功，数量:', products.length);
    }).catch(console.error);
  },

  onSwiperChange: function(e) {
    this.setData({ currentIndex: e.detail.current });
  },

  // 退出管理员
  exitAdmin: function() {
    this.setData({ isAdmin: false });
    wx.removeStorageSync('isAdmin');
    wx.showToast({ title: '已退出编辑', icon: 'none' });
  },

  // 1. 新增
  handleAddNew: function() {
    var _this = this;
    wx.showLoading({ title: '创建中' });
    const newProduct = { title: 'New Product', price: '0', cover: '' }; // 不再需要 details 字段
    this.db.collection('products').add({ data: newProduct }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已创建' });
      _this.fetchProducts();
    });
  },

  // 2. 改名
  handleEditTitle: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    wx.showModal({
      title: '修改标题', editable: true, content: item.title,
      success(res) {
        if (res.confirm && res.content) {
          _this.setData({ [`products[${idx}].title`]: res.content });
          _this.db.collection('products').doc(item._id).update({ data: { title: res.content } });
        }
      }
    });
  },

  // 3. 改价
  handleEditPrice: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    wx.showModal({
      title: '修改价格', editable: true, content: item.price,
      success(res) {
        if (res.confirm && res.content) {
          _this.setData({ [`products[${idx}].price`]: res.content });
          _this.db.collection('products').doc(item._id).update({ data: { price: res.content } });
        }
      }
    });
  },

  // 4. 删除
  handleDeleteProduct: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    wx.showModal({
      title: '删除', content: '确认删除？', confirmColor: '#FF3B30',
      success(res) {
        if(res.confirm) {
          _this.db.collection('products').doc(item._id).remove().then(() => {
            _this.setData({ currentIndex: 0 });
            _this.fetchProducts();
          });
        }
      }
    });
  },

  // 5. 换图
  handleUploadCover: function() {
    var _this = this;
    var idx = this.data.currentIndex;
    var item = this.data.products[idx];
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: function(res) {
        var path = res.tempFiles[0].tempFilePath;
        _this.setData({ [`products[${idx}].cover`]: path }); // 预览
        _this.uploadFile(path, 'cover').then(id => {
          _this.db.collection('products').doc(item._id).update({ data: { cover: id } });
        });
      }
    });
  },

  uploadFile: function(path, prefix) {
    return new Promise((resolve, reject) => {
      var suffix = path.match(/\.[^.]+?$/)[0] || '.png';
      wx.cloud.uploadFile({
        cloudPath: 'mt_products/' + prefix + '_' + Date.now() + suffix,
        filePath: path,
        success: res => resolve(res.fileID),
        fail: reject
      });
    });
  },

  // 触发管理员
  handleTitleClick: function() {
    if (this.data.isAdmin) return;
    this.data.clickCount++;
    clearTimeout(this.data.clickTimer);
    this.data.clickTimer = setTimeout(() => { this.data.clickCount = 0; }, 3000);
    if (this.data.clickCount >= 5) {
      this.setData({ showPasswordModal: true, clickCount: 0 });
    }
  },

  onPwdInput: function(e) { this.setData({ pwdInput: e.detail.value }); },
  
  checkPassword: function() {
    if (this.data.pwdInput === '3252955872') {
      this.setData({ isAdmin: true, showPasswordModal: false });
      wx.setStorageSync('isAdmin', true);
    } else {
      this.setData({ pwdInput: '' });
      wx.showToast({ title: '密码错误', icon: 'error' });
    }
  },
  
  closeModal: function() { this.setData({ showPasswordModal: false }); },
  
  // ========================================================
  // 点击卡片：根据号码跳转到shop页面
  // ========================================================
  handleCardClick: function(e) {
    // 管理员模式下，点击卡片不跳转（由号码编辑按钮处理）
    if (this.data.isAdmin) {
      return;
    }
    
    const index = e.currentTarget.dataset.index;
    const product = this.data.products[index];
    
    // 如果没有号码，静默返回，不显示任何提示
    if (!product || !product.jumpNumber) {
      return;
    }
    
    // 快速跳转到shop页面（静默跳转，失败也不提示）
    wx.navigateTo({
      url: `/pages/shop/shop?jumpNumber=${product.jumpNumber}`,
      animationType: 'none', // 禁用动画，加快跳转速度
      fail: (err) => {
        // 静默处理，不显示错误提示
        console.log('[pagenew] 跳转失败（静默）:', err);
      }
    });
  },
  
  // ========================================================
  // 编辑跳转号码（带唯一性校验）
  // ========================================================
  handleEditJumpNumber: function(e) {
    // 注意：微信小程序中，使用catchtap已经阻止了冒泡，不需要stopPropagation
    
    if (!this.data.isAdmin) {
      wx.showToast({ title: '请先进入管理员模式', icon: 'none' });
      return;
    }
    
    const idx = parseInt(e.currentTarget.dataset.index);
    const product = this.data.products[idx];
    
    if (!product) {
      wx.showToast({ title: '产品数据错误', icon: 'none' });
      return;
    }
    
    const currentNumber = product.jumpNumber ? product.jumpNumber.toString() : '';
    
    this._input(currentNumber, (v) => {
      // 校验：必须是纯数字
      const numValue = v.trim();
      if (numValue && !/^\d+$/.test(numValue)) {
        wx.showToast({ title: '号码必须是纯数字', icon: 'none' });
        return;
      }
      
      // 校验：唯一性（检查products集合中所有产品的号码）
      if (numValue) {
        this.db.collection('products')
          .where({
            jumpNumber: parseInt(numValue)
          })
          .get()
          .then(res => {
            // 检查是否有其他产品使用了这个号码
            const otherProduct = res.data.find(item => item._id !== product._id);
            if (otherProduct) {
              wx.showToast({ title: '号码已存在，请使用其他号码', icon: 'none' });
              return;
            }
            
            // 更新数据
            this.updateProductJumpNumber(product._id, parseInt(numValue), idx);
          })
          .catch(err => {
            console.error('[pagenew] 校验号码失败:', err);
            wx.showToast({ title: '校验失败', icon: 'none' });
          });
      } else {
        // 清空号码
        this.updateProductJumpNumber(product._id, null, idx);
      }
    });
  },
  
  // ========================================================
  // 更新产品号码到云端
  // ========================================================
  updateProductJumpNumber: function(productId, jumpNumber, localIdx) {
    if (!this.db || !productId) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }
    
    this.db.collection('products').doc(productId).update({
      data: { jumpNumber: jumpNumber }
    }).then(() => {
      // 更新本地数据
      const updatedProducts = [...this.data.products];
      updatedProducts[localIdx].jumpNumber = jumpNumber;
      this.setData({ products: updatedProducts });
      wx.showToast({ title: '号码已更新', icon: 'success' });
    }).catch(err => {
      console.error('[pagenew] 更新号码失败:', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },
  
  // ========================================================
  // 通用输入弹窗
  // ========================================================
  _input: function(initVal, callback) {
    this.setData({
      showCustomEditModal: true,
      customEditTitle: '编辑跳转号码',
      customEditVal: initVal || '',
      customEditCallback: callback
    });
  },
  
  onCustomEditInput: function(e) {
    this.setData({ customEditVal: e.detail.value });
  },
  
  closeCustomEditModal: function() {
    this.setData({
      showCustomEditModal: false,
      customEditTitle: '',
      customEditVal: '',
      customEditCallback: null
    });
  },
  
  confirmCustomEdit: function() {
    const callback = this.data.customEditCallback;
    if (callback) {
      callback(this.data.customEditVal);
    }
    this.closeCustomEditModal();
  }
})