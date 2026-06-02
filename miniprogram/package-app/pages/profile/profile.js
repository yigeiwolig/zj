Page({
  onLoad() {
    wx.redirectTo({
      url: '/package-app/pages/products/products?hubTab=2',
      fail: () => {
        wx.reLaunch({ url: '/package-app/pages/products/products?hubTab=2' });
      }
    });
  }
});
