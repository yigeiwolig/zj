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
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式
    // 新增：自定义编辑弹窗
    showCustomEditModal: false,
    customEditTitle: '',
    customEditVal: '',
    customEditCallback: null
  },

  onLoad() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('adminLite');
    }
    
    // 初始化云数据库
    if (wx.cloud) {
      this.db = wx.cloud.database();
    }
    
    // 检查管理员权限
    this.checkAdminPrivilege();
    
    // 加载产品列表
    this.loadProductList();
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
        console.log('[adminLite.js] 身份验证成功：合法管理员');
      }
    } catch (err) {
      console.error('[adminLite.js] 权限检查失败', err);
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this._showCustomToast('无权限', 'none');
      return;
    }
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    this._showCustomToast(nextState ? '管理模式开启' : '已回到用户模式', 'none');
  },

  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    
    const cache = wx.getStorageSync('admin-lite-latest');
    if (cache) {
      this.setData({ lastSubmission: cache });
    }
    // 重新加载产品列表（可能在其他页面有更新）
    this.loadProductList();
  },

  // 🔴 返回按钮
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: '/pages/products/products' });
    }
  },

  onHide() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
  },

  onUnload() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
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
  // 管理员权限逻辑（已废弃旧逻辑）
  handleTitleClick() {
    // 废弃旧逻辑，不再使用
  },

  // ========================================================
  // 点击产品卡片：根据号码跳转到shop页面
  // ========================================================
  handleProductClick(e) {
    const index = e.currentTarget.dataset.index;
    const productList = this.data.productList || [];
    
    if (index < 0 || index >= productList.length) {
      this._showCustomToast('产品数据错误', 'none');
      return;
    }
    
    const product = productList[index];
    if (!product) {
      this._showCustomToast('产品不存在', 'none');
      return;
    }
    
    // 如果没有号码，提示设置
    if (!product.jumpNumber) {
      if (this.data.isAdmin) {
        this._showCustomToast('请先设置号码', 'none');
      } else {
        this._showCustomToast('该产品未设置跳转号码', 'none');
      }
      return;
    }

    // 跳转到shop页面，并传递号码参数
    wx.navigateTo({
      url: `/pages/shop/shop?jumpNumber=${product.jumpNumber}`,
      fail: (err) => {
        console.error('[adminLite] 跳转失败:', err);
        this._showCustomToast('跳转失败', 'none');
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
      this._showCustomToast('请先进入管理员模式', 'none');
      return;
    }
    
    const idx = parseInt(e.currentTarget.dataset.index);
    console.log('[adminLite] 产品索引:', idx);
    const productList = this.data.productList || [];
    
    if (idx < 0 || idx >= productList.length) {
      console.error('[adminLite] 产品索引错误:', idx, '列表长度:', productList.length);
      this._showCustomToast('产品索引错误', 'none');
      return;
    }
    
    const product = productList[idx];
    if (!product) {
      console.error('[adminLite] 产品不存在');
      this._showCustomToast('产品数据错误', 'none');
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
          this._showCustomToast('号码必须是纯数字', 'none');
          return;
        }
        
        // 校验：唯一性（需要检查shop_series集合中所有产品的号码）
        if (numValue) {
          if (!this.db) {
            this._showCustomToast('数据库未初始化', 'none');
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
                this._showCustomToast('号码已存在，请使用其他号码', 'none');
                return;
              }
              
              // 更新数据
              this.updateProductJumpNumber(product._id, parseInt(numValue), idx);
            })
            .catch(err => {
              console.error('[adminLite] 校验号码失败:', err);
              this._showCustomToast('校验失败', 'none');
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
      this._showCustomToast('数据错误', 'none');
      return;
    }
    
    this.db.collection('shop_series').doc(productId).update({
      data: { jumpNumber: jumpNumber }
    }).then(() => {
      // 更新本地数据
      const updatedList = [...this.data.productList];
      updatedList[localIdx].jumpNumber = jumpNumber;
      this.setData({ productList: updatedList });
      this._showCustomToast('号码已更新', 'success');
    }).catch(err => {
      console.error('[adminLite] 更新号码失败:', err);
      this._showCustomToast('更新失败', 'none');
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
    this.setData({ customEditModalClosing: true });
    setTimeout(() => {
      this.setData({
        showCustomEditModal: false,
        customEditTitle: '',
        customEditVal: '',
        customEditCallback: null,
        customEditModalClosing: false
      });
    }, 420);
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
      this._showCustomToast('标题必填', 'none');
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
    this._showCustomToast('已保存至本地', 'success');
  },

  // ===============================================
  // 🔴 统一的自定义弹窗方法（替换所有 wx.showToast）
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
        // 最终降级
        console.warn('[adminLite] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
  }
    };
    tryShow();
  },
});


























