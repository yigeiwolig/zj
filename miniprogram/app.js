// app.js
App({
  globalData: {
    mockLocation: null, // 模拟定位：'shenzhen' 或 'hangzhou'
    blockedLocation: null, // 被拦截的位置信息
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // ⚠️ 核心修复：在这里统一初始化，强行指定环境 ID
      wx.cloud.init({
        // 请务必确认这个 ID 和你云开发控制台顶部显示的一样！
        env: 'cloud1-0glvisq557b25d16', 
        traceUser: true,
      });
      console.log('✅ 云开发已在 app.js 初始化，环境ID: cloud1-0glvisq557b25d16');
    }

    // 🔴 注释掉：把控制权交给 index.js，不要在启动时就拦截
    // this.getLocationAndCheck(); 
    
    // 解释：注释掉它，把控制权交给 index.js。
    // 你的 getMockLocation 等其他函数都保留不动，供后面调用。
  },

  // 获取模拟定位坐标
  getMockLocation: function(city) {
    const mockLocations = {
      'shenzhen': {
        latitude: 22.5431,  // 深圳坐标
        longitude: 114.0579
      },
      'hangzhou': {
        latitude: 30.2741,  // 杭州坐标
        longitude: 120.1551
      }
    };
    
    return mockLocations[city] || mockLocations['shenzhen'];
  },

  getLocationAndCheck: function() {
    const that = this;
    
    // 优先使用模拟定位（如果设置了）
    if (this.globalData.mockLocation) {
      const mockLoc = this.getMockLocation(this.globalData.mockLocation);
      console.log('=== 使用模拟定位 ===');
      console.log('模拟定位城市:', this.globalData.mockLocation);
      console.log('模拟定位坐标:', mockLoc);
      this.callCloudCheck(mockLoc.latitude, mockLoc.longitude);
      return;
    }
    
    console.log('=== 获取真实定位 ===');

    // 1. 发起定位请求（高精度模式）
    wx.getLocation({
      type: 'gcj02', // 使用国测局坐标系，在国内地图上更准
      isHighAccuracy: true, // 【关键】开启高精度模式 (GPS + WiFi + 基站)
      highAccuracyExpireTime: 4000, // 高精度定位超时时间(ms)
      success(res) {
        // 2. 获取成功，拿到经纬度
        const latitude = res.latitude;
        const longitude = res.longitude;
        console.log('前端获取定位成功:', latitude, longitude);

        // 3. 传给云函数检查
        that.callCloudCheck(latitude, longitude);
      },
      fail(err) {
        console.error('获取定位失败或用户拒绝:', err);
        // 如果用户拒绝授权，为了安全（或者为了不影响使用），你可以选择：
        // 方案A：默认允许进入（不做处理）
        // 方案B：提示必须授权才能使用（比较强硬）
      }
    });
  },

  // 获取用户昵称（静默方式，不弹授权弹窗）
  getUserNickName: function() {
    return new Promise((resolve) => {
      // 方法1：尝试从本地存储获取
      const cachedUserInfo = wx.getStorageSync('userInfo');
      if (cachedUserInfo && cachedUserInfo.nickName) {
        console.log('从缓存获取到昵称:', cachedUserInfo.nickName);
        resolve(cachedUserInfo.nickName);
        return;
      }

      // 方法2：尝试使用 wx.getUserInfo（不需要用户点击，但可能返回空）
      // 注意：这个 API 在某些情况下可能返回空，但不会弹窗
      try {
        wx.getUserInfo({
          success: (res) => {
            const nickName = res.userInfo?.nickName || '未获取到昵称';
            if (nickName !== '未获取到昵称') {
              // 缓存用户信息
              wx.setStorageSync('userInfo', res.userInfo);
              console.log('静默获取到用户昵称:', nickName);
            }
            resolve(nickName);
          },
          fail: () => {
            // 如果获取失败，使用默认值（不弹窗）
            console.log('无法静默获取用户信息，使用默认值');
            resolve('未获取到昵称');
          }
        });
      } catch (err) {
        // 如果 API 不存在或出错，直接返回默认值
        console.log('getUserInfo 调用失败，使用默认值:', err);
        resolve('未获取到昵称');
      }
    });
  },

  // 主动请求用户昵称（需要用户点击触发，用于需要昵称的场景）
  requestUserNickName: function() {
    return new Promise((resolve) => {
      // 先检查缓存
      const cachedUserInfo = wx.getStorageSync('userInfo');
      if (cachedUserInfo && cachedUserInfo.nickName) {
        resolve(cachedUserInfo.nickName);
        return;
      }

      // 使用 getUserProfile（必须在用户点击事件中调用）
      wx.getUserProfile({
        desc: '用于记录访问信息',
        success: (res) => {
          const nickName = res.userInfo?.nickName || '未获取到昵称';
          // 缓存用户信息
          wx.setStorageSync('userInfo', res.userInfo);
          console.log('用户授权获取到昵称:', nickName);
          resolve(nickName);
        },
        fail: () => {
          console.log('用户拒绝授权，使用默认值');
          resolve('未获取到昵称');
        }
      });
    });
  },

  callCloudCheck: async function(lat, lng) {
    // 防抖：如果正在调用，直接返回
    if (this._isCallingCloudCheck) {
      console.log('云函数正在调用中，忽略重复请求');
      return;
    }
    
    console.log('=== 开始调用云函数检查 ===');
    console.log('传递的坐标:', { latitude: lat, longitude: lng });
    
    // 标记正在调用
    this._isCallingCloudCheck = true;
    
    
    // 尝试获取用户昵称
    let nickName = '未获取到昵称';
    try {
      nickName = await this.getUserNickName();
    } catch (err) {
      console.log('获取昵称失败，使用默认值:', err);
    }
    
    // 使用新的 API 获取设备信息
    const deviceInfo = wx.getDeviceInfo();
    
    wx.cloud.callFunction({
      name: 'accessControl',
      data: {
        latitude: lat,
        longitude: lng,
        nickName: nickName, // 传递用户昵称
        deviceInfo: deviceInfo.model // 顺便传个设备型号
      },
      success: res => {
        wx.hideLoading();
        this._isCallingCloudCheck = false; // 重置标记
        console.log('=== 云函数调用成功 ===');
        console.log('完整返回结果:', res);
        console.log('检查结果:', res.result);
        
        if (res.result && res.result.isBlocked === true) {
          console.log('🚫 检测到浙江用户，准备跳转到拦截页');
          // 保存位置信息到全局数据
          this.globalData.blockedLocation = {
            city: res.result.city || '未知城市',
            province: res.result.province || '浙江省',
            location: res.result.location || '浙江省',
            latitude: res.result.latitude,
            longitude: res.result.longitude
          };
          // 是浙江用户，跳转到拦截页
          wx.reLaunch({
            url: '/pages/blocked/blocked'
          });
        } else {
          console.log('✅ 允许访问，isBlocked:', res.result?.isBlocked);
          if (res.result?.msg === '白名单放行') {
            console.log('✅ 白名单用户，已放行');
          }
        }
      },
      fail: err => {
        wx.hideLoading();
        this._isCallingCloudCheck = false; // 重置标记
        console.error('=== 云函数调用失败 ===');
        console.error('错误信息:', err);
      }
    });
  },

  // 兼容之前的 checkAccess 调用（用于模拟定位切换）
  checkAccess: function() {
    this.getLocationAndCheck();
  }
})
