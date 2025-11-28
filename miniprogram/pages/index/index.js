const app = getApp();
const { submitLocation } = require('../../utils/api');

Page({
  data: {
    userInfo: null,
    running: false,
    blocked: false,
    stalled: false,
    locationStatus: '',
    locationProgress: 0,
    isAnimating: false,
    animationLock: false, // 防止过早重置的锁
    mockLocation: null
  },

  onShow() {
    const { lastJudgement } = app.globalData;
    if (lastJudgement) {
      this.setData({ blocked: lastJudgement.isZhejiang });
    }
    // 重置按钮状态
    this.resetButtonAnimation();
    
    // 页面一显示就开始获取定位
    this.startAutoLocation();
  },

  onHide() {
    // 页面隐藏时也重置按钮状态
    this.resetButtonAnimation();
  },

  onUnload() {
    // 页面卸载时也重置按钮状态
    this.resetButtonAnimation();
  },

  handleAccess() {
    if (this.data.running || this.data.blocked || this.data.isAnimating) return;
    
    // 开始动画
    this.setData({ isAnimating: true });
    
    // 阴影结束后立即执行验证流程并跳转（阴影3秒开始，持续2.2秒，5.2秒结束）
    setTimeout(() => {
      this.runGuardFlow().then(() => {
        // 验证成功后不重置，等待二级页面显示后才重置
      }).catch(() => {
        // 验证失败时重置动画状态
        this.setData({ isAnimating: false });
      });
    }, 5200); // 阴影结束后立即执行
  },

  async runGuardFlow() {
    if (this.data.running) return;
    this.setData({ running: true, stalled: false });
    try {
      console.log('=== 开始验证流程 ===');
      
      // 步骤1: 获取用户信息
      console.log('步骤1: 获取用户信息');
      await this.ensureUserProfile();
      console.log('用户信息获取成功:', this.data.userInfo);
      
      // 步骤2: 获取位置
      console.log('步骤2: 获取位置信息');
      let location;
      if (this.data.mockLocation) {
        // 使用模拟位置
        location = app.globalData.locationSnapshot;
        console.log('使用模拟位置:', location);

      } else if (app.globalData.locationSnapshot) {
        // 使用已缓存的定位信息
        location = app.globalData.locationSnapshot;
        console.log('使用缓存位置:', location);
      } else {
        // 获取新位置
        location = await this.obtainLocation();
        console.log('新位置获取成功:', location);
      }
      
      // 步骤3: 评估位置
      console.log('步骤3: 评估位置信息');
      await this.evaluateLocation(location);
      console.log('=== 验证流程完成 ===');
    } catch (error) {
      console.error('验证流程失败:', error);

      this.setData({ stalled: true });
    } finally {
      this.setData({ running: false });
      // 验证流程完成后重置按钮状态
      this.resetButtonAnimation();
    }
  },

  ensureUserProfile() {
    return new Promise((resolve, reject) => {
      if (this.data.userInfo) {
        console.log('使用缓存的用户信息');
        resolve(this.data.userInfo);
        return;
      }
      console.log('请求用户信息授权');
      wx.getUserProfile({
        desc: '用于优化体验',
        success: (res) => {
          console.log('用户信息授权成功:', res);
          const { userInfo } = res;
          app.globalData.userInfo = userInfo;
          this.setData({ userInfo });
          resolve(userInfo);
        },
        fail: (error) => {
          console.error('用户信息授权失败:', error);
          // 如果用户拒绝授权，使用默认信息继续流程
          const defaultUserInfo = {
            nickName: '用户',
            avatarUrl: '',
            gender: 0,
            language: 'zh_CN'
          };
          app.globalData.userInfo = defaultUserInfo;
          this.setData({ userInfo: defaultUserInfo });
          resolve(defaultUserInfo);
        }
      });
    });
  },

  obtainLocation() {
    return new Promise((resolve, reject) => {
      console.log('开始获取位置信息');
      
      // 先检查定位权限
      wx.getSetting({
        success: (settingRes) => {
          console.log('权限检查结果:', settingRes.authSetting);
          
          if (!settingRes.authSetting['scope.userLocation']) {
            console.log('用户未授权定位，请求授权');
            // 用户未授权，请求授权
            wx.authorize({
              scope: 'scope.userLocation',
              success: () => {
                console.log('定位授权成功');
                this.getLocationWithRetry(resolve, reject);
              },
              fail: (error) => {
                console.error('定位授权失败:', error);
                this.showLocationAuthDialog(reject);
              }
            });
          } else {
            console.log('已有定位权限，直接获取');
            // 已授权，直接获取位置
            this.getLocationWithRetry(resolve, reject);
          }
        },
        fail: (error) => {
          console.error('权限检查失败:', error);
          this.getLocationWithRetry(resolve, reject);
        }
      });
    });
  },

  getLocationWithRetry(resolve, reject, retryCount = 0) {
    const maxRetries = 3;
    
    // 模拟位置数据 - 用于调试
    const mockLocation = {
      latitude: 22.5431, // 深圳市坐标
      longitude: 114.0579,
      accuracy: 30,
      altitude: 10,
      speed: 0,
      timestamp: Date.now(),
      retryCount: 0,
      isMock: true
    };
    
    console.log(`尝试获取位置 (${retryCount + 1}/${maxRetries})`);
    
    wx.getLocation({
      type: 'gcj02',
      altitude: true,
      isHighAccuracy: true,
      highAccuracyExpireTime: 5000,
      success: (res) => {
        console.log('定位成功:', res);
        
        // 验证定位精度
        if (res.accuracy > 500) {
          console.warn('定位精度较低:', res.accuracy + '米');
          if (retryCount < maxRetries) {
            console.log(`重试定位 (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              this.getLocationWithRetry(resolve, reject, retryCount + 1);
            }, 1000);
            return;
          }
        }
        
        const location = {
          latitude: parseFloat(res.latitude.toFixed(6)),
          longitude: parseFloat(res.longitude.toFixed(6)),
          accuracy: Math.round(res.accuracy),
          altitude: res.altitude ? parseFloat(res.altitude.toFixed(2)) : 0,
          speed: res.speed || 0,
          timestamp: Date.now(),
          retryCount: retryCount,
          isMock: false
        };
        
        app.globalData.locationSnapshot = location;
        resolve(location);
      },
      fail: (error) => {
        console.error('定位失败:', error);
        
        // 如果重试次数用完，使用模拟位置
        if (retryCount >= maxRetries) {
          console.log('重试次数用尽，使用模拟位置数据进行调试');
          app.globalData.locationSnapshot = mockLocation;
          resolve(mockLocation);
          return;
        }
        
        console.log(`定位失败，重试 (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          this.getLocationWithRetry(resolve, reject, retryCount + 1);
        }, 1000);
      }
    });
  },

  showLocationAuthDialog(reject) {
    wx.showModal({
      title: '位置权限',
      content: '需要获取您的位置信息来提供服务，请在设置中允许位置权限',
      confirmText: '去设置',
      cancelText: '取消',
      success: (result) => {
        if (result.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.userLocation']) {
                this.getLocationWithRetry(resolve, reject);
              } else {
                reject(new Error('location permission denied'));
              }
            }
          });
        } else {
          reject(new Error('location permission denied'));
        }
      }
    });
  },

  handleLocationError(error, reject) {
    let errorMessage = '定位失败，请稍后重试';
    
    switch (error.errMsg) {
      case 'getLocation:fail auth deny':
        errorMessage = '位置权限被拒绝，请在设置中允许';
        break;
      case 'getLocation:fail:ERROR_NETWORK':
        errorMessage = '网络连接异常，请检查网络';
        break;
      case 'getLocation:fail:ERROR_LOCATION':
        errorMessage = '无法获取位置，请检查GPS是否开启';
        break;
      default:
        if (error.errMsg && error.errMsg.includes('timeout')) {
          errorMessage = '定位超时，请重试';
        }
    }
    

  },

  async evaluateLocation(location) {

    try {
      console.log('=== 位置评估开始 ===');
      console.log('位置数据:', location);
      console.log('用户信息:', this.data.userInfo);
      
      const judgement = await submitLocation({
        location: {
          ...location
        },
        userInfo: this.data.userInfo
      });
      
      console.log('=== 位置判断结果 ===');
      console.log('判断结果:', judgement);
      console.log('是否在浙江:', judgement.isZhejiang);
      console.log('城市:', judgement.city);
      console.log('省份:', judgement.province);
      
      app.globalData.lastJudgement = judgement;
      
      if (judgement.isZhejiang) {
        console.log('🚫 被判定为浙江地区，阻止访问');
        this.setData({ blocked: true });
        wx.showToast({ 
          title: `网络出错，请联系管理员修复`, 
          icon: 'none', 
          duration: 3000 
        });
      } else {
        console.log('✅ 可以正常访问，立即跳转到产品页面');

        
        // 跳转前设置动画锁
        this.setData({ animationLock: true });
        
        // 立即跳转，无延迟
        wx.navigateTo({
          url: '/pages/products/products',
          success: () => {
            console.log('✅ 页面跳转成功，动画锁已设置');
            // 跳转成功后不要立即重置，等待二级页面显示3秒后再重置
          },
          fail: (err) => {
            console.error('❌ 页面跳转失败:', err);
            wx.showToast({ 
              title: `跳转失败: ${err.errMsg}`, 
              icon: 'none',
              duration: 3000
            });
            // 跳转失败时清除动画锁并立即重置动画状态
            this.setData({ isAnimating: false, animationLock: false });
          }
        });
      }
    } catch (e) {
      console.error('❌ 位置评估异常:', e);
      wx.showToast({ 
        title: `位置服务异常: ${e.message || '未知错误'}`, 
        icon: 'none',
        duration: 3000
      });
      this.setData({ isAnimating: false });
    } finally {

    }
  },

  // 设置模拟位置
  setMockLocation(event) {
    const locationType = event.currentTarget.dataset.location;
    console.log('设置模拟位置:', locationType);
    
    const mockLocations = {
      shenzhen: {
        name: '深圳',
        lat: 22.5431,
        lng: 114.0579,
        city: '深圳市',
        province: '广东省'
      },
      guangzhou: {
        name: '广州',
        lat: 23.1291,
        lng: 113.2644,
        city: '广州市',
        province: '广东省'
      },
      hangzhou: {
        name: '杭州',
        lat: 30.2741,
        lng: 120.1551,
        city: '杭州市',
        province: '浙江省'
      },
      ningbo: {
        name: '宁波',
        lat: 29.8683,
        lng: 121.5440,
        city: '宁波市',
        province: '浙江省'
      }
    };
    
    const selectedLocation = mockLocations[locationType];
    if (selectedLocation) {
      this.setData({ mockLocation: selectedLocation });
      
      // 创建模拟位置对象
      const mockLocationData = {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        accuracy: 30,
        altitude: 10,
        speed: 0,
        timestamp: Date.now(),
        retryCount: 0,
        isMock: true
      };
      
      // 保存到全局数据
      app.globalData.locationSnapshot = mockLocationData;
      

      
      // 重置状态
      this.setData({
        blocked: false,
        stalled: false
      });
      
      console.log('模拟位置设置成功:', selectedLocation);
    }
  },

  // 自动获取定位
  async startAutoLocation() {
    try {
      console.log('页面加载，开始自动获取定位');
      await this.ensureUserProfile();
      
      // 获取定位
      const location = await this.obtainLocationWithForce();
      console.log('自动定位成功:', location);
      
      // 保存位置信息
      app.globalData.locationSnapshot = location;
      

      
    } catch (error) {
      console.error('自动定位失败:', error);
      
      // 如果是定位权限被拒绝，直接闪退
      if (error.message === 'location permission denied') {
        wx.showModal({
          title: '需要定位权限',
          content: '本应用需要获取您的位置信息才能使用，请在设置中允许定位权限',
          confirmText: '去设置',
          cancelText: '退出应用',
          success: (result) => {
            if (result.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.userLocation']) {
                    // 用户同意了权限，重新获取定位
                    this.startAutoLocation();
                  } else {
                    // 用户仍然拒绝，闪退
                    this.exitApp();
                  }
                },
                fail: () => {
                  this.exitApp();
                }
              });
            } else {
              // 用户选择退出，直接闪退
              this.exitApp();
            }
          }
        });
        } else {
        // 其他错误，不显示提示
      }
    }
  },

  // 强制获取定位（不允许跳过）
  obtainLocationWithForce() {
    return new Promise((resolve, reject) => {
      console.log('强制获取位置信息');
      
      // 先检查定位权限
      wx.getSetting({
        success: (settingRes) => {
          console.log('权限检查结果:', settingRes.authSetting);
          
          if (!settingRes.authSetting['scope.userLocation']) {
            console.log('用户未授权定位，请求授权');
            // 用户未授权，请求授权
            wx.authorize({
              scope: 'scope.userLocation',
              success: () => {
                console.log('定位授权成功');
                this.getLocationWithRetryForce(resolve, reject);
              },
              fail: (error) => {
                console.error('定位授权失败:', error);
                reject(new Error('location permission denied'));
              }
            });
          } else {
            console.log('已有定位权限，直接获取');
            // 已授权，直接获取位置
            this.getLocationWithRetryForce(resolve, reject);
          }
        },
        fail: (error) => {
          console.error('权限检查失败:', error);
          this.getLocationWithRetryForce(resolve, reject);
        }
      });
    });
  },

  // 强制定位重试（不使用模拟位置）
  getLocationWithRetryForce(resolve, reject, retryCount = 0) {
    const maxRetries = 3;
    
    console.log(`强制获取位置 (${retryCount + 1}/${maxRetries})`);
    
    wx.getLocation({
      type: 'gcj02',
      altitude: true,
      isHighAccuracy: true,
      highAccuracyExpireTime: 5000,
      success: (res) => {
        console.log('定位成功:', res);
        
        // 验证定位精度
        if (res.accuracy > 500) {
          console.warn('定位精度较低:', res.accuracy + '米');
          if (retryCount < maxRetries) {
            console.log(`重试定位 (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              this.getLocationWithRetryForce(resolve, reject, retryCount + 1);
            }, 1000);
            return;
          }
        }
        
        const location = {
          latitude: parseFloat(res.latitude.toFixed(6)),
          longitude: parseFloat(res.longitude.toFixed(6)),
          accuracy: Math.round(res.accuracy),
          altitude: res.altitude ? parseFloat(res.altitude.toFixed(2)) : 0,
          speed: res.speed || 0,
          timestamp: Date.now(),
          retryCount: retryCount,
          isMock: false
        };
        
        app.globalData.locationSnapshot = location;
        resolve(location);
      },
      fail: (error) => {
        console.error('定位失败:', error);
        
        // 如果重试次数用完，直接拒绝（不使用模拟位置）
        if (retryCount >= maxRetries) {
          console.log('定位重试次数用尽');
          reject(new Error('location failed after retries'));
          return;
        }
        
        console.log(`定位失败，重试 (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          this.getLocationWithRetryForce(resolve, reject, retryCount + 1);
        }, 1000);
      }
    });
  },

  // 退出应用
  exitApp() {
    wx.showModal({
      title: '无法使用',
      content: '没有定位权限将无法使用本应用',
      showCancel: false,
      confirmText: '确定',
      success: () => {
        // 小程序无法直接退出，只能跳转到首页或关闭页面
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }
    });
  },

  // 重置按钮动画状态
  resetButtonAnimation() {
    // 重置按钮状态
    this.setData({
      isAnimating: false,
      animationLock: false
    });
  }
});







