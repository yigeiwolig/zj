const formatTime = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const app = getApp();

Page({
  data: {
    form: {
      title: '',
      subtitle: '',
      cover: '',
      tags: '',
      description: '',
      cta: ''
    },
    submitting: false,
    lastSubmission: null,
    // 新增：产品列表
    productList: [],
    isAdmin: false,
    password: '3252955872', // 管理员密码
    showPasswordModal: false,
    clickCount: 0,
    // 新增：自定义编辑弹窗
    showCustomEditModal: false,
    customEditTitle: '',
    customEditVal: '',
    customEditCallback: null
  },

  onLoad() {
    // 初始化云数据库
    if (wx.cloud) {
      this.db = wx.cloud.database();
    }
    
    // 尝试从storage读取管理员状态（如果从shop页面跳转过来）
    const savedAdmin = wx.getStorageSync('isAdmin');
    if (savedAdmin) {
      this.setData({ isAdmin: true });
      console.log('[adminLite] 从storage恢复管理员状态');
    }
    
    // 加载产品列表
    this.loadProductList();
    
    // 调试：检查管理员状态
    console.log('[adminLite] onLoad, isAdmin:', this.data.isAdmin);
  },

  onShow() {
    const cache = wx.getStorageSync('admin-lite-latest');
    if (cache) {
      this.setData({ lastSubmission: cache });
    }
    // 重新加载产品列表（可能在其他页面有更新）
    this.loadProductList();
  },

  // ========================================================
  // 加载产品列表（从shop_series集合）
  // ========================================================
  loadProductList() {
    if (!this.db) {
      console.error('[adminLite] db 不存在');
      // 确保 productList 是数组
      if (!Array.isArray(this.data.productList)) {
        this.setData({ productList: [] });
      }
      return;
    }
    this.db.collection('shop_series')
      .get()
      .then(res => {
        console.log('[adminLite] 加载产品列表成功，数量:', res.data ? res.data.length : 0);
        console.log('[adminLite] 当前管理员状态:', this.data.isAdmin);
        // 确保数据是数组，并添加必要的字段
        const productList = (res.data || []).map(item => {
          // 确保每个产品都有必要的字段
          return {
            ...item,
            id: item._id || item.id || Date.now() + Math.random(),
            name: item.name || '未命名产品',
            cover: item.cover || '',
            models: item.models || [],
            jumpNumber: item.jumpNumber || null
          };
        });
        this.setData({ productList: productList });
        console.log('[adminLite] 产品列表已设置，数量:', productList.length, '管理员模式:', this.data.isAdmin);
      })
      .catch(err => {
        console.error('[adminLite] 加载产品列表失败:', err);
        // 失败时确保 productList 是空数组
        this.setData({ productList: [] });
      });
  },

  // ========================================================
  // 管理员权限逻辑
  // ========================================================
  handleTitleClick() {
    if (this.data.isAdmin) {
      return;
    }
    this.data.clickCount++;
    if (this.data.clickCount >= 5) {
      this.setData({ showPasswordModal: true, clickCount: 0 });
    }
  },

  onPwdInput(e) {
    this.pwdVal = e.detail.value;
  },

  checkPassword() {
    if (this.pwdVal === this.data.password) {
      this.setData({ isAdmin: true, showPasswordModal: false });
      // 保存管理员状态到storage
      wx.setStorageSync('isAdmin', true);
      console.log('[adminLite] 管理员模式已激活');
      wx.showToast({ title: 'Admin On', icon: 'success' });
    } else {
      wx.showToast({ title: 'Error', icon: 'none' });
    }
  },

  exitAdmin() {
    this.setData({ isAdmin: false });
    // 清除管理员状态
    wx.removeStorageSync('isAdmin');
    wx.showToast({ title: 'Admin Off', icon: 'success' });
  },

  closePasswordModal() {
    this.setData({ showPasswordModal: false, clickCount: 0 });
  },

  // ========================================================
  // 点击产品卡片：根据号码跳转到shop页面
  // ========================================================
  handleProductClick(e) {
    const index = e.currentTarget.dataset.index;
    const productList = this.data.productList || [];
    
    if (index < 0 || index >= productList.length) {
      wx.showToast({ title: '产品数据错误', icon: 'none' });
      return;
    }
    
    const product = productList[index];
    if (!product) {
      wx.showToast({ title: '产品不存在', icon: 'none' });
      return;
    }
    
    // 如果没有号码，提示设置
    if (!product.jumpNumber) {
      if (this.data.isAdmin) {
        wx.showToast({ title: '请先设置号码', icon: 'none' });
      } else {
        wx.showToast({ title: '该产品未设置跳转号码', icon: 'none' });
      }
      return;
    }

    // 跳转到shop页面，并传递号码参数
    wx.navigateTo({
      url: `/pages/shop/shop?jumpNumber=${product.jumpNumber}`,
      fail: (err) => {
        console.error('[adminLite] 跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  // ========================================================
  // 编辑跳转号码（带唯一性校验）
  // ========================================================
  adminEditJumpNumber(e) {
    console.log('[adminLite] adminEditJumpNumber 被调用', e);
    e.stopPropagation(); // 阻止事件冒泡
    
    if (!this.data.isAdmin) {
      console.log('[adminLite] 不是管理员模式');
      wx.showToast({ title: '请先进入管理员模式', icon: 'none' });
      return;
    }
    
    const idx = parseInt(e.currentTarget.dataset.index);
    console.log('[adminLite] 产品索引:', idx);
    const productList = this.data.productList || [];
    
    if (idx < 0 || idx >= productList.length) {
      console.error('[adminLite] 产品索引错误:', idx, '列表长度:', productList.length);
      wx.showToast({ title: '产品索引错误', icon: 'none' });
      return;
    }
    
    const product = productList[idx];
    if (!product) {
      console.error('[adminLite] 产品不存在');
      wx.showToast({ title: '产品数据错误', icon: 'none' });
      return;
    }
    
    const currentNumber = product.jumpNumber ? product.jumpNumber.toString() : '';
    
    console.log('[adminLite] 编辑号码，当前值:', currentNumber, '产品ID:', product._id || product.id);
    
    // 使用自定义标题和回调
    this.setData({
      showCustomEditModal: true,
      customEditTitle: '编辑跳转号码',
      customEditVal: currentNumber,
      customEditCallback: (v) => {
        console.log('[adminLite] 输入回调被调用，值:', v);
        // 校验：必须是纯数字
        const numValue = v.trim();
        if (numValue && !/^\d+$/.test(numValue)) {
          wx.showToast({ title: '号码必须是纯数字', icon: 'none' });
          return;
        }
        
        // 校验：唯一性（需要检查shop_series集合中所有产品的号码）
        if (numValue) {
          if (!this.db) {
            wx.showToast({ title: '数据库未初始化', icon: 'none' });
            return;
          }
          
          this.db.collection('shop_series')
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
              console.error('[adminLite] 校验号码失败:', err);
              wx.showToast({ title: '校验失败', icon: 'none' });
            });
        } else {
          // 清空号码
          this.updateProductJumpNumber(product._id, null, idx);
        }
      }
    });
  },

  // ========================================================
  // 更新产品号码到云端
  // ========================================================
  updateProductJumpNumber(productId, jumpNumber, localIdx) {
    if (!this.db || !productId) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }
    
    this.db.collection('shop_series').doc(productId).update({
      data: { jumpNumber: jumpNumber }
    }).then(() => {
      // 更新本地数据
      const updatedList = [...this.data.productList];
      updatedList[localIdx].jumpNumber = jumpNumber;
      this.setData({ productList: updatedList });
      wx.showToast({ title: '号码已更新', icon: 'success' });
    }).catch(err => {
      console.error('[adminLite] 更新号码失败:', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  // ========================================================
  // 通用输入弹窗
  // ========================================================
  _input(initVal, callback) {
    this.setData({
      showCustomEditModal: true,
      customEditTitle: '编辑',
      customEditVal: initVal || '',
      customEditCallback: callback
    });
  },

  onCustomEditInput(e) {
    this.setData({ customEditVal: e.detail.value });
  },

  closeCustomEditModal() {
    this.setData({
      showCustomEditModal: false,
      customEditTitle: '',
      customEditVal: '',
      customEditCallback: null
    });
  },

  confirmCustomEdit() {
    const callback = this.data.customEditCallback;
    if (callback) {
      callback(this.data.customEditVal);
    }
    this.closeCustomEditModal();
  },

  async handleSubmit(event) {
    const formData = event.detail.value;
    if (!formData.title) {
      wx.showToast({ title: '标题必填', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    await new Promise((resolve) => setTimeout(resolve, 600));
    const submission = {
      ...formData,
      time: formatTime()
    };
    wx.setStorageSync('admin-lite-latest', submission);
    this.setData({
      submitting: false,
      lastSubmission: submission
    });
    wx.showToast({ title: '已保存至本地', icon: 'success' });
  }
});


























