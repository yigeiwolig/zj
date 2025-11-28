const app = getApp();
const { fetchProducts } = require('../../utils/api');

Page({
  data: {
    products: [],
    loading: false
  },

  onShow() {
    this.loadProducts();
  },

  async loadProducts(force = false) {
    const now = Date.now();
    const cacheValid = app.globalData.productsCache && now - app.globalData.cacheTimestamp < 5 * 60 * 1000;
    if (cacheValid && !force) {
      this.setData({ products: app.globalData.productsCache });
      return;
    }
    this.setData({ loading: true });
    try {
      const products = await fetchProducts();
      app.globalData.productsCache = products;
      app.globalData.cacheTimestamp = now;
      this.setData({ products });
    } catch (error) {
      wx.showToast({ title: '获取失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  refreshList() {
    this.loadProducts(true);
  },

  handleAction(event) {
    const { item } = event.currentTarget.dataset;
    wx.showModal({
      title: '操作提示',
      content: `即将执行「${item.cta}」动作，可在接入后对接真实跳转。`,
      confirmText: '知道了',
      showCancel: false
    });
  }
});

