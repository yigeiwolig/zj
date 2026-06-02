Page({
  onLoad() {
    wx.redirectTo({
      url: '/package-app/pages/products/products?hubTab=1',
      fail: () => {
        wx.reLaunch({ url: '/package-app/pages/products/products?hubTab=1' });
      }
    });
  }
});
