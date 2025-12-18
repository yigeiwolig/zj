// miniprogram/pages/index/index.js
const app = getApp();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});
const db = wx.cloud.database();

Page({
  data: {
    isShowNicknameUI: false,
    isAuthorized: false,
    inputNickName: '', 
    isLoading: false,
    step: 0, 
    locationResult: null
  },

  onLoad(options) {
    // 1. 【最高优先级】全局黑名单检测
    if (wx.getStorageSync('is_user_banned')) {
      wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
      return;
    }
    this.checkGlobalBanStatus();

    // 2. 检查缓存
    const hasAuth = wx.getStorageSync('has_permanent_auth');
    if (hasAuth) {
      this.setData({ isAuthorized: true, isShowNicknameUI: false });
    } else {
      this.setData({ isShowNicknameUI: true });
    }
  },

  // === 全局封号检查 ===
  checkGlobalBanStatus() {
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      
      const p1 = db.collection('user_list').where({ _openid: openid }).orderBy('createTime', 'desc').limit(1).get();
      const p2 = db.collection('blocked_logs').where({ _openid: openid }).orderBy('createTime', 'desc').limit(1).get();
      const p3 = db.collection('login_logs').where({ _openid: openid }).get(); // 也要查 login_logs

      Promise.all([p1, p2, p3]).then(results => {
        let isBanned = false;

        // 检查 user_list
        if (results[0].data.length > 0 && results[0].data[0].isBanned === true) isBanned = true;
        // 检查 blocked_logs
        if (results[1].data.length > 0 && results[1].data[0].isBanned === true) isBanned = true;
        // 检查 login_logs (昵称输错导致的封号)
        if (results[2].data.length > 0 && results[2].data[0].isBanned === true) isBanned = true;

        if (isBanned) {
           wx.setStorageSync('is_user_banned', true);
           wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
        }
      });
    });
  },

  // =================================================================
  // 昵称验证 (已恢复 3次封号 处理逻辑)
  // =================================================================
  onNickNameInput(e) { this.setData({ inputNickName: e.detail.value }); },

  handleLogin() {
    if (this.data.isLoading) return;
    const name = this.data.inputNickName.trim();
    if (!name) return wx.showToast({ title: '请输入昵称', icon: 'none' });

    this.setData({ isLoading: true });
    wx.showLoading({ title: '验证身份...' });

    wx.cloud.callFunction({
      name: 'verifyNickname',
      data: { nickname: name }
    }).then(res => {
      this.setData({ isLoading: false });
      wx.hideLoading();
      
      const result = res.result || {};

      if (result.success) {
        // --- 成功 ---
        wx.setStorageSync('has_permanent_auth', true);
        wx.setStorageSync('user_nickname', name);
        wx.removeStorageSync('is_user_banned'); // 确保清除封号标记
        this.setData({ isAuthorized: true, isShowNicknameUI: false });
        wx.showToast({ title: '验证通过', icon: 'success' });
      } else {
        // --- 失败 ---
        // 1. 如果是封号 (次数>=3)，直接踢
        if (result.isBlocked || result.type === 'banned') {
           console.log('⛔ 错误次数过多，触发防攻击拦截');
          wx.setStorageSync('is_user_banned', true);
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
        } else {
           // 2. 普通错误：按照你的要求修改弹窗样式
           wx.showModal({
             title: '该昵称未验证',
             content: '请联系管理员进行验证\n点击键盘上方昵称一键填写确保昵称准确',
             showCancel: true,     // 保留取消按钮，方便用户关闭弹窗重输
             cancelText: '再试一次',
             confirmText: '复制微信号', // 替换“确定”为“复制微信号”
             confirmColor: '#576B95',  // 确定的蓝色
             success: (res) => {
               if (res.confirm) {
                 // 点击蓝色按钮，执行复制
                 wx.setClipboardData({
                   data: 'MT-mogaishe', // 这里填你的微信号
                   success: () => {
                     wx.showToast({ title: '已复制微信号', icon: 'none' });
                   }
                 });
               }
             }
           });
        }
      }
    }).catch(err => {
      this.setData({ isLoading: false });
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  // =================================================================
  // 点击进入 -> 收集超详细数据 -> 分流记录 (保持你要求的最新逻辑)
  // =================================================================
  handleAccess() {
    if (this.data.step > 0) return; 
    if (!this.data.isAuthorized) return; 

    // 1. 获取手机机型
    const sysInfo = wx.getSystemInfoSync();
    const phoneModel = sysInfo.model || '未知机型';

    // 2. 获取真实定位
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
          this.runAnimation();
        this.analyzeRegion(res.latitude, res.longitude, phoneModel);
            },
            fail: () => { 
        wx.showModal({
          title: '提示',
          content: '需要获取地理位置才能进入',
          success: (res) => { if (res.confirm) wx.openSetting(); }
        });
      }
    });
  },

  runAnimation() {
    this.setData({ step: 1 });
    setTimeout(() => { this.setData({ step: 2 });
      setTimeout(() => { this.setData({ step: 3 });
        setTimeout(() => { this.setData({ step: 4 }); 
          this.doFallAndSwitch();
        }, 1900); 
      }, 800); 
    }, 500);
  },

  doFallAndSwitch() {
    this.setData({ step: 5 });
  },

  // === 加载拦截配置 ===
  async loadBlockingConfig() {
    try {
      const configRes = await db.collection('app_config').doc('blocking_rules').get();
      if (configRes.data) {
        return {
          is_active: configRes.data.is_active !== undefined ? configRes.data.is_active : false,
          blocked_provinces: Array.isArray(configRes.data.blocked_provinces) ? configRes.data.blocked_provinces : [],
          blocked_cities: Array.isArray(configRes.data.blocked_cities) ? configRes.data.blocked_cities : []
        };
      }
    } catch (e) {
      // 如果 doc 方式失败，尝试 where 查询
      try {
        const queryRes = await db.collection('app_config').where({ _id: 'blocking_rules' }).get();
        if (queryRes.data && queryRes.data.length > 0) {
          const config = queryRes.data[0];
          return {
            is_active: config.is_active !== undefined ? config.is_active : false,
            blocked_provinces: Array.isArray(config.blocked_provinces) ? config.blocked_provinces : [],
            blocked_cities: Array.isArray(config.blocked_cities) ? config.blocked_cities : []
          };
        }
      } catch (e2) {}
    }
    // 默认配置
    return { is_active: false, blocked_provinces: [], blocked_cities: [] };
  },

  // === 检查地址是否匹配拦截配置 ===
  checkIsBlockedRegion(province, city, config) {
    if (!config || !config.is_active) {
      return false; // 拦截未开启，不拦截
    }

    const blockedProvinces = config.blocked_provinces || [];
    const blockedCities = config.blocked_cities || [];

    // 检查城市
    if (blockedCities.length > 0) {
      const isCityBlocked = blockedCities.some(c => 
        city.indexOf(c) !== -1 || c.indexOf(city) !== -1
      );
      if (isCityBlocked) return true;
    }

    // 检查省份
    if (blockedProvinces.length > 0) {
      const isProvinceBlocked = blockedProvinces.some(p => 
        province.indexOf(p) !== -1 || p.indexOf(province) !== -1
      );
      if (isProvinceBlocked) return true;
    }

    return false;
  },

  // === 解析详细地址 ===
  analyzeRegion(lat, lng, phoneModel) {
    qqmapsdk.reverseGeocoder({
      location: { latitude: lat, longitude: lng },
      get_poi: 1, 
      poi_options: 'policy=2', // 优先返回大厦/小区
      success: (mapRes) => {
        const result = mapRes.result;
        
        // 拼接最详细地址：街道 + (建筑名)
        let detailedAddress = result.address;
        if (result.formatted_addresses && result.formatted_addresses.recommend) {
          detailedAddress = `${result.address} (${result.formatted_addresses.recommend})`;
        }
        
        const locData = {
          province: result.address_component.province,
          city: result.address_component.city,
          district: result.address_component.district,
          full_address: detailedAddress, // 详细到楼栋/小区
          latitude: lat,
          longitude: lng,
          phoneModel: phoneModel
        };

        // 【地域拦截分流逻辑】根据 app_config 配置判断
        this.loadBlockingConfig().then(config => {
          const isBlocked = this.checkIsBlockedRegion(locData.province, locData.city, config);

          if (isBlocked) {
            // 匹配拦截配置 -> blocked_logs -> 跳主页 (pagenew)
            this.appendDataAndJump('blocked_logs', locData, '/pages/pagenew/pagenew'); 
          } else {
            // 不匹配 -> user_list -> 跳产品页 (products)
            this.appendDataAndJump('user_list', locData, '/pages/products/products');
          }
        }).catch(err => {
          console.error('加载拦截配置失败', err);
          // 配置加载失败，默认放到 user_list
          this.appendDataAndJump('user_list', locData, '/pages/products/products');
        });
      }
    });
  },

  // === 统一追加记录与跳转 (Append Only) ===
  appendDataAndJump(collectionName, locData, targetPage) {
    const nickName = wx.getStorageSync('user_nickname') || '未知用户';
    
    wx.cloud.callFunction({ name: 'login' }).then(loginRes => {
      const openid = loginRes.result.openid;

      // 1. 先查上一条记录 (为了叠加访问次数 & 检查封号)
      db.collection(collectionName)
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get()
        .then(res => {
          
          let lastCount = 0;
          let isBanned = false;

          if (res.data.length > 0) {
            const lastRecord = res.data[0];
            lastCount = lastRecord.visitCount || 0;
            if (lastRecord.isBanned === true) isBanned = true;
          }

          // 2. 如果被封号了，去拦截页，不记新数据
          if (isBanned) {
            wx.setStorageSync('is_user_banned', true);
            setTimeout(() => {
           wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
            }, 2000);
           return;
        }

          // 3. 准备新数据 (追加模式)
          const newData = {
          nickName: nickName,
            province: locData.province,
            city: locData.city,
            district: locData.district,
            address: locData.full_address,
            phoneModel: locData.phoneModel, 
            
            visitCount: lastCount + 1,
            isBanned: false, 

            createTime: db.serverDate(),
          updateTime: db.serverDate()
        };

          // 4. 执行追加写入
          db.collection(collectionName).add({
            data: newData
          });

          // 5. 放行跳转
          setTimeout(() => {
            wx.reLaunch({ url: targetPage });
          }, 2200); 
      });
    });
  }
});