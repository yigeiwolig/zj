const app = getApp();
const { submitLocation } = require('../../utils/api');

Page({
  data: {
    userInfo: null,
    running: false,
    blocked: false,
    stalled: false
  },

  onShow() {
    const { lastJudgement } = app.globalData;
    if (lastJudgement) {
      this.setData({ blocked: lastJudgement.isZhejiang });
    }
  },

  handleAccess() {
    if (this.data.running || this.data.blocked) return;
    this.runGuardFlow();
  },

  async runGuardFlow() {
    if (this.data.running) return;
    this.setData({ running: true, stalled: false });
    try {
      await this.ensureUserProfile();
      const location = await this.obtainLocation();
      await this.evaluateLocation(location);
    } catch (error) {
      this.setData({ stalled: true });
    } finally {
      this.setData({ running: false });
    }
  },

  ensureUserProfile() {
    return new Promise((resolve, reject) => {
      if (this.data.userInfo) {
        resolve(this.data.userInfo);
        return;
      }
      wx.getUserProfile({
        desc: '用于优化体验',
        success: (res) => {
          const { userInfo } = res;
          app.globalData.userInfo = userInfo;
          this.setData({ userInfo });
          resolve(userInfo);
        },
        fail: reject
      });
    });
  },

  obtainLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          const location = {
            latitude: res.latitude.toFixed(6),
            longitude: res.longitude.toFixed(6),
            accuracy: Math.round(res.accuracy)
          };
          app.globalData.locationSnapshot = location;
          resolve(location);
        },
        fail: () => {
          wx.showModal({
            title: '定位未开启',
            content: '需允许定位后才能继续访问。',
            confirmText: '去设置',
            success: (result) => {
              if (result.confirm) {
                wx.openSetting();
              }
            }
          });
          reject(new Error('location denied'));
        }
      });
    });
  },

  async evaluateLocation(location) {
    wx.showLoading({ title: '处理中' });
    try {
      const judgement = await submitLocation({
        location: {
          ...location
        },
        userInfo: this.data.userInfo
      });
      app.globalData.lastJudgement = judgement;
      if (judgement.isZhejiang) {
        this.setData({ blocked: true });
        wx.showToast({ title: '访问受限', icon: 'none' });
      } else {
        wx.navigateTo({
          url: '/pages/products/products'
        });
      }
    } catch (e) {
      wx.showToast({ title: '请稍后再试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});

