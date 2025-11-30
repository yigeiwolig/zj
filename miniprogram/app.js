App({
  globalData: {
    userInfo: null,
    locationSnapshot: null,
    lastJudgement: null,
    productsCache: null,
    cacheTimestamp: 0,
    locationConfig: {
      maxRetries: 3,
      accuracyThreshold: 100,
      timeout: 5000,
      retryDelay: 1000
    },
    locationStatus: {
      isLocating: false,
      lastLocationTime: null,
      locationHistory: []
    }
  },

  onLaunch() {
    console.log('新品体验小程序启动');
    this.initLocationService();
  },

  initLocationService() {
    // 检查定位权限状态
    wx.getSetting({
      success: (res) => {
        console.log('定位权限状态:', res.authSetting['scope.userLocation']);
        if (res.authSetting['scope.userLocation'] === false) {
          console.log('用户已拒绝定位权限');
        }
      }
    });

    // 监听位置变化（如果需要）
    wx.onLocationChange((res) => {
      console.log('位置变化:', res);
      this.globalData.locationStatus.lastLocationTime = Date.now();
    });
  },

  // 获取定位配置
  getLocationConfig() {
    return this.globalData.locationConfig;
  },

  // 更新定位状态
  updateLocationStatus(status) {
    this.globalData.locationStatus = {
      ...this.globalData.locationStatus,
      ...status
    };
  },

  // 添加位置历史记录
  addLocationHistory(location) {
    const history = this.globalData.locationStatus.locationHistory;
    history.unshift({
      ...location,
      timestamp: Date.now()
    });
    
    // 只保留最近10条记录
    if (history.length > 10) {
      history.splice(10);
    }
  }
});



















