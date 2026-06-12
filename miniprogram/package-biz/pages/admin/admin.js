// pages/admin/admin.js
const { PRODUCT_SERIES_OPTIONS } = require('../../../utils/productModels.js');

Page({
  data: {
    // 这里的数据应当从全局或云数据库获取
    products: PRODUCT_SERIES_OPTIONS.map((name) => ({ name })),
    types: ['踏板车', '跨骑车', '电摩/电动自行车'],
    chapters: ['章节 01：支架固定', '章节 02：走线连接']
  },

  onLoad() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('admin');
    }
  },

  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
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

  // 添加数据
  addItem: function(e) {
    const type = e.currentTarget.dataset.type;
    wx.showModal({
      title: '添加新项',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          if (type === 'product') {
            let list = this.data.products;
            list.push({ name: res.content });
            this.setData({ products: list });
          } else if (type === 'type') {
            let list = this.data.types;
            list.push(res.content);
            this.setData({ types: list });
          }
          this._showCustomToast('添加成功', 'success');
        }
      }
    });
  },

  // 删除数据
  deleteItem: function(e) {
    const { type, index } = e.currentTarget.dataset;
    this._showCustomModal({
      title: '确认删除',
      content: '删除后无法恢复，确定吗？',
      success: (res) => {
        if (res.confirm) {
          if (type === 'product') {
            let list = this.data.products;
            list.splice(index, 1);
            this.setData({ products: list });
          } else if (type === 'type') {
            let list = this.data.types;
            list.splice(index, 1);
            this.setData({ types: list });
          }
        }
      }
    });
  },

  // ===============================================
  // 🔴 统一的自定义弹窗方法（替换所有 wx.showModal 和 wx.showToast）
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
        console.warn('[admin] custom-toast 组件未找到，使用降级方案');
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
        console.warn('[admin] custom-toast 组件未找到，使用降级方案');
        wx.showModal(options);
      }
    };
    tryShow();
  },
});

