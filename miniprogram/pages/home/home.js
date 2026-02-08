const app = getApp();
const db = wx.cloud.database();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});

Page({
  data: {
    allServices: [
      { name: '车辆快修', icon: '🔧' }, { name: '车辆保养', icon: '⚙️' },
      { name: '车辆销售', icon: '🏍️' }, { name: '机车咖啡', icon: '☕' },
      { name: '车辆精修', icon: '🛠️' }, { name: '洗车服务', icon: '🚿' },
      { name: '机油更换', icon: '🛢️' }
    ],
    shops: [], // 从云数据库读取，不再使用硬编码数据
    userLocation: null, // 用户位置 { latitude, longitude }

    cardStyles: [],
    scroll: 0,
    target: 0,
    isDetailOpen: false,
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式

    showPhantom: false,
    isExpanded: false,
    phantomStyle: '', 
    activeItem: {},   
    
    isEditing: false,
    isAdding: false, // 标记是否正在添加新卡片
    editData: {},
    
    
    // 测试模式
    isTestMode: false,
    
    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },
    autoToastClosing: false, // 自动提示退出动画中
    
    // 【新增】自定义对话框
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },
    dialogClosing: false, // 自定义弹窗退出动画中
    
    // 【新增】自定义加载动画
    showLoadingAnimation: false,
    loadingText: '加载中...'
  },

  onLoad() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('home');
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();
    
    this.startY = 0;
    this.startScroll = 0;
    this.isDragging = false;
    this._isLoadingShops = false; // 防止重复加载的标志
    this._isDeleting = false; // 防止重复删除的标志
    this._deletedIds = new Set(); // 记录已删除的ID，避免重复删除
    this._hasGeneratedTestData = false; // 标记是否已经生成过测试数据（本次会话）
    
    // 检查管理员权限
    this.checkAdminPrivilege();
    
    // 1. 获取用户位置
    this.getUserLocation().then(() => {
      // 2. 从云数据库加载店铺数据
      this.loadShopsFromCloud().then(() => {
        // 3. 处理数据（计算距离、营业状态等）
        this.preprocessData();
        
        // 4. 初始位置定在最顶端（最远的店）
        this.setData({
          scroll: 0,
          target: 0
        });
        
        // 5. 渲染轮盘
        this.updateWheel();
      });
    });
    
    // 6. 定时更新营业状态（每分钟检查一次）
    this.statusTimer = setInterval(() => {
      this.updateShopStatus();
    }, 60000); // 60秒 = 1分钟
  },
  
  onHide() {
    // 🔴 修复：页面隐藏时也清理定时器
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
  },

  onUnload() {
    // 清理定时器
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
  },
  
  // 返回按钮
  goBack() {
    wx.navigateBack({
      fail: () => { 
        wx.reLaunch({ url: '/pages/products/products' }); 
      }
    });
  },
  
  // 更新所有店铺的营业状态
  updateShopStatus() {
    const { shops, activeItem, isDetailOpen } = this.data;
    const updatedShops = shops.map(item => {
      const serviceSet = {};
      (item.services || []).forEach(s => serviceSet[s] = true);
      const isOpen = this.isShopOpen(item.time);
      const status = isOpen ? '营业中' : '未营业';
      const statusColor = isOpen ? '#00C853' : '#FF3B30';
      console.log(`更新状态 - 店铺 ${item.name}: ${isOpen ? '营业中(绿色)' : '未营业(红色)'}`);
      return { ...item, serviceSet, isOpen, status, statusColor };
    });
    
    // 如果详情页已打开，同时更新 activeItem 的状态
    if (isDetailOpen && activeItem && (activeItem.id || activeItem._id)) {
      const currentItem = updatedShops.find(item => 
        (item.id && activeItem.id && item.id === activeItem.id) || 
        (item._id && activeItem._id && item._id === activeItem._id)
      );
      if (currentItem) {
        const updatedActiveItem = {
          ...activeItem,
          isOpen: currentItem.isOpen,
          status: currentItem.status,
          statusColor: currentItem.statusColor
        };
        this.setData({ 
          shops: updatedShops,
          activeItem: updatedActiveItem
        });
      } else {
        this.setData({ shops: updatedShops });
      }
    } else {
      this.setData({ shops: updatedShops });
    }
    
    // 更新后重新渲染轮盘
    this.updateWheel();
  },

  // 获取用户位置（从云数据库或本地存储）
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      // 方法1：尝试从云数据库获取（user_list 集合）
      db.collection('user_list').limit(1).get({
        success: (res) => {
          if (res.data.length > 0 && res.data[0].latitude && res.data[0].longitude) {
            const userLoc = {
              latitude: res.data[0].latitude,
              longitude: res.data[0].longitude
            };
            this.setData({ userLocation: userLoc });
            console.log('从云数据库获取用户位置:', userLoc);
            resolve(userLoc);
            return;
          }
          
          // 方法2：尝试从本地存储获取
          const cachedLoc = wx.getStorageSync('user_location');
          if (cachedLoc && cachedLoc.latitude && cachedLoc.longitude) {
            this.setData({ userLocation: cachedLoc });
            console.log('从本地存储获取用户位置:', cachedLoc);
            resolve(cachedLoc);
            return;
          }
          
          // 方法3：实时获取位置并进行逆地理编码
          wx.getLocation({
            type: 'gcj02',
            isHighAccuracy: true,
            success: (res) => {
              const lat = res.latitude;
              const lng = res.longitude;
              
              // 🔴 必须进行逆地理编码获取详细地址
              qqmapsdk.reverseGeocoder({
                location: { latitude: lat, longitude: lng },
                get_poi: 1,
                poi_options: 'policy=2',
                success: (mapRes) => {
                  const result = mapRes.result;
                  let detailedAddress = result.address;
                  if (result.formatted_addresses && result.formatted_addresses.recommend) {
                    detailedAddress = `${result.address} (${result.formatted_addresses.recommend})`;
                  }
                  
                  const fullLocData = {
                    latitude: lat,
                    longitude: lng,
                    province: result.address_component?.province || '',
                    city: result.address_component?.city || '',
                    district: result.address_component?.district || '',
                    address: detailedAddress || result.address || '',
                    full_address: detailedAddress || result.address || ''
                  };
                  
                  // 保存完整地址信息到缓存
                  wx.setStorageSync('last_location', fullLocData);
                  wx.setStorageSync('user_location', { latitude: lat, longitude: lng });
                  
                  this.setData({ userLocation: { latitude: lat, longitude: lng } });
                  console.log('实时获取用户位置并解析地址:', fullLocData);
                  resolve({ latitude: lat, longitude: lng });
                },
                fail: () => {
                  // 逆地理编码失败，至少保存经纬度
                  const userLoc = {
                    latitude: lat,
                    longitude: lng
                  };
                  this.setData({ userLocation: userLoc });
                  wx.setStorageSync('user_location', userLoc);
                  console.log('实时获取用户位置（逆地理编码失败）:', userLoc);
                  resolve(userLoc);
                }
              });
            },
            fail: (err) => {
              console.error('获取用户位置失败:', err);
              // 使用默认位置（可选）
              const defaultLoc = { latitude: 31.2304, longitude: 121.4737 }; // 上海
              this.setData({ userLocation: defaultLoc });
              resolve(defaultLoc);
            }
          });
        },
        fail: (err) => {
          console.error('从云数据库获取位置失败:', err);
          // 尝试其他方法（进行逆地理编码）
          wx.getLocation({
            type: 'gcj02',
            isHighAccuracy: true,
            success: (res) => {
              const lat = res.latitude;
              const lng = res.longitude;
              
              // 🔴 必须进行逆地理编码获取详细地址
              qqmapsdk.reverseGeocoder({
                location: { latitude: lat, longitude: lng },
                get_poi: 1,
                poi_options: 'policy=2',
                success: (mapRes) => {
                  const result = mapRes.result;
                  let detailedAddress = result.address;
                  if (result.formatted_addresses && result.formatted_addresses.recommend) {
                    detailedAddress = `${result.address} (${result.formatted_addresses.recommend})`;
                  }
                  
                  const fullLocData = {
                    latitude: lat,
                    longitude: lng,
                    province: result.address_component?.province || '',
                    city: result.address_component?.city || '',
                    district: result.address_component?.district || '',
                    address: detailedAddress || result.address || '',
                    full_address: detailedAddress || result.address || ''
                  };
                  
                  // 保存完整地址信息到缓存
                  wx.setStorageSync('last_location', fullLocData);
                  wx.setStorageSync('user_location', { latitude: lat, longitude: lng });
                  
                  this.setData({ userLocation: { latitude: lat, longitude: lng } });
                  console.log('实时获取用户位置并解析地址（方法2）:', fullLocData);
                  resolve({ latitude: lat, longitude: lng });
                },
                fail: () => {
                  // 逆地理编码失败，至少保存经纬度
                  const userLoc = {
                    latitude: lat,
                    longitude: lng
                  };
                  this.setData({ userLocation: userLoc });
                  wx.setStorageSync('user_location', userLoc);
                  console.log('实时获取用户位置（逆地理编码失败，方法2）:', userLoc);
                  resolve(userLoc);
                }
              });
            },
            fail: () => {
              const defaultLoc = { latitude: 31.2304, longitude: 121.4737 };
              this.setData({ userLocation: defaultLoc });
              resolve(defaultLoc);
            }
          });
        }
      });
    });
  },

  // 计算两点间距离（Haversine 公式，返回公里数）
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  },

  // 从云数据库 home 集合读取测试模式开关
  async loadTestModeConfig() {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await db.collection('home').doc('testModeSwitch').get();
        const isTestMode = res.data && res.data.enabled === true;
        this.setData({ isTestMode });
        console.log('✅ 测试模式开关读取成功:', res.data);
        console.log('✅ 测试模式状态:', isTestMode);
        resolve(isTestMode);
      } catch (err) {
        // 如果开关不存在，尝试创建默认开关（关闭状态）
        console.log('⚠️ 测试模式开关不存在，尝试创建默认开关...');
        console.log('错误信息:', err);
        
        try {
          // 在 home 集合中创建默认开关（关闭状态）
          await db.collection('home').doc('testModeSwitch').set({
            data: {
              enabled: false,
              createTime: new Date(),
              updateTime: new Date()
            }
          });
          console.log('✅ 默认测试模式开关已创建（enabled: false）');
          this.setData({ isTestMode: false });
          resolve(false);
        } catch (createErr) {
          console.error('❌ 创建测试模式开关失败:', createErr);
          // 如果创建失败，默认为关闭
          this.setData({ isTestMode: false });
          resolve(false);
        }
      }
    });
  },

  // 从云数据库加载店铺数据
  async loadShopsFromCloud(isRetry = false) {
    return new Promise((resolve, reject) => {
      // 防止无限递归：如果已经是重试，检查是否正在加载
      if (isRetry && this._isLoadingShops) {
        console.warn('⚠️ 检测到重复加载，等待当前加载完成...');
        // 等待当前加载完成
        let waitCount = 0;
        const checkLoading = () => {
          if (!this._isLoadingShops || waitCount > 100) {
            resolve(this.data.shops || []);
          } else {
            waitCount++;
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
        return;
      }
      
      this._isLoadingShops = true;
      
      db.collection('home').get({
        success: async (res) => {
          try {
            console.log('从云数据库加载店铺数据:', res.data);
            
            // 先加载测试模式开关（仅管理员可用）
            const isAdmin = this.data.isAdmin || false;
            const isTestMode = isAdmin ? await this.loadTestModeConfig() : false;
            
            // 过滤掉开关文档本身，只保留店铺数据
            let shops = res.data
              .filter(item => item._id !== 'testModeSwitch') // 排除开关文档
              .map(item => ({
                _id: item._id, // 保留云数据库的 _id
                id: item.id || item._id, // 兼容 id 字段
                name: item.name || '',
                sub: item.sub || '',
                dist: item.dist || '0',
                status: item.status || '营业中',
                statusColor: item.statusColor || '#00C853',
                img: item.img || '',
                address: item.address || '',
                latitude: item.latitude || 0,
                longitude: item.longitude || 0,
                phone: item.phone || '',
                time: item.time || '09:00 - 18:00',
                services: item.services || [],
                isTest: item.isTest || false, // 标记是否为测试数据
                testLocation: item.testLocation || null // 保存生成时的用户位置
              }));
            
            // 如果测试模式开关为开，检查是否需要生成测试数据
            if (isTestMode) {
              const oldTestShops = shops.filter(item => item.isTest);
              const nonTestShops = shops.filter(item => !item.isTest);
              
              // 如果是重试加载（刚生成完测试数据），直接使用现有数据，不再删除和生成
              if (isRetry) {
                console.log('🔄 重试加载：使用刚生成的测试数据，不再删除和生成');
                shops = shops.filter(item => item.isTest);
                this.setData({ shops });
                // 处理数据（计算距离、营业状态、排序）
                this.preprocessData();
                this.updateWheel();
                this._isLoadingShops = false;
                resolve(shops);
                return;
              }
              
              // 只在首次加载且测试数据数量不对时才生成，不再检查位置变化
              // 如果已经生成过测试数据（本次会话），不再重新生成
              if (this._hasGeneratedTestData) {
                console.log('✅ 本次会话已生成过测试数据，不再重新生成，直接使用现有数据');
                shops = shops.filter(item => item.isTest);
                this.setData({ shops });
                this._isLoadingShops = false;
                resolve(shops);
                return;
              }
              
              // 只在测试数据数量不对时才生成（首次加载）
              if (oldTestShops.length !== 6) {
                console.log(`✅ 测试模式已开启，当前测试数据数量: ${oldTestShops.length}，需要生成（首次加载）`);
                
                // 先删除旧的测试数据（如果有）
                if (oldTestShops.length > 0 && !this._isDeleting) {
                  this._isDeleting = true;
                  try {
                    // 过滤掉已经删除过的ID
                    const shopsToDelete = oldTestShops.filter(shop => 
                      shop._id && !this._deletedIds.has(shop._id)
                    );
                    
                    if (shopsToDelete.length === 0) {
                      console.log('⚠️ 所有测试数据都已被标记为已删除，跳过删除操作');
                      this._isDeleting = false;
                    } else {
                      console.log(`准备删除 ${shopsToDelete.length} 个测试数据`);
                      
                      // 逐个删除，添加延迟避免请求过快
                      for (let i = 0; i < shopsToDelete.length; i++) {
                        const shop = shopsToDelete[i];
                        if (shop._id && !this._deletedIds.has(shop._id)) {
                          try {
                            // 先检查文档是否存在
                            const doc = await db.collection('home').doc(shop._id).get();
                            if (doc.data) {
                              await db.collection('home').doc(shop._id).remove();
                              this._deletedIds.add(shop._id);
                              console.log(`✅ 已删除测试数据: ${shop._id}`);
                            } else {
                              console.log(`⚠️ 文档不存在，跳过: ${shop._id}`);
                              this._deletedIds.add(shop._id);
                            }
                          } catch (deleteErr) {
                            // 单个删除失败不影响整体流程
                            const errMsg = deleteErr.errMsg || deleteErr.message || String(deleteErr);
                            if (errMsg.includes('not exist') || errMsg.includes('不存在')) {
                              console.log(`⚠️ 文档已不存在，跳过: ${shop._id}`);
                              this._deletedIds.add(shop._id);
                            } else {
                              console.warn(`⚠️ 删除测试数据失败: ${shop._id}`, errMsg);
                            }
                          }
                          // 添加延迟，避免请求过快
                          if (i < shopsToDelete.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                          }
                        }
                      }
                      console.log('✅ 旧测试数据清理完成');
                    }
                  } catch (err) {
                    console.error('删除旧测试数据过程出错:', err);
                    // 即使删除失败，也继续生成新数据
                  } finally {
                    this._isDeleting = false;
                  }
                } else if (this._isDeleting) {
                  console.log('⚠️ 删除操作正在进行中，等待删除完成...');
                  // 等待删除完成，最多等待5秒
                  let waitCount = 0;
                  while (this._isDeleting && waitCount < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waitCount++;
                  }
                }
                
                // 等待一小段时间，确保删除操作完全完成
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 生成新的测试数据
                try {
                  console.log('开始生成新的测试数据...');
                  await this.generateTestData();
                  console.log('✅ 测试数据生成完成，等待数据保存...');
                  
                  // 等待数据保存完成（5个数据，每个200ms延迟，总共约1秒，再加上额外等待时间）
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  // 重新加载数据（标记为重试，避免无限循环）
                  this._isLoadingShops = false;
                  // 清空已删除ID记录，因为已经重新生成了
                  this._deletedIds.clear();
                  
                  // 标记已生成过测试数据
                  this._hasGeneratedTestData = true;
                  
                  // 重新加载，但这次应该能加载到新生成的测试数据
                  const reloadedShops = await this.loadShopsFromCloud(true);
                  
                  // 确保只显示测试数据
                  const testShopsOnly = reloadedShops.filter(item => item.isTest);
                  this.setData({ shops: testShopsOnly });
                  this.preprocessData();
                  this.updateWheel();
                  
                  this._isLoadingShops = false;
                  resolve(testShopsOnly);
                  return;
                } catch (err) {
                  console.error('生成测试数据失败:', err);
                  // 生成失败，使用现有数据
                  shops = shops.filter(item => item.isTest);
                  this.setData({ shops });
                  this._isLoadingShops = false;
                  resolve(shops);
                  return;
                }
              } else {
                console.log('✅ 测试模式已开启，测试数据已存在（6个），沿用旧数据');
              }
              
              // 测试模式开启时，只显示测试数据，隐藏真实店铺
              shops = shops.filter(item => item.isTest);
              console.log('✅ 测试模式已开启，已隐藏真实店铺，只显示测试数据');
            } else {
            // 如果测试模式关闭，只过滤测试数据（不删除），只显示真实店铺
            shops = shops.filter(item => !item.isTest);
            console.log('✅ 测试模式已关闭，已过滤测试数据，只显示真实店铺（测试数据保留在数据库中）');
            }
            
            this.setData({ shops });
            this._isLoadingShops = false;
            resolve(shops);
          } catch (err) {
            console.error('处理店铺数据失败:', err);
            this._isLoadingShops = false;
            this.setData({ shops: [] });
            resolve([]);
          }
        },
        fail: (err) => {
          console.error('从云数据库加载数据失败:', err);
          this._isLoadingShops = false;
          // 如果加载失败，使用空数组
          this.setData({ shops: [] });
          resolve([]);
        }
      });
    });
  },

  // 判断店铺是否在营业时间内
  isShopOpen(timeStr) {
    if (!timeStr) return false;
    
    try {
      // 解析时间字符串，格式： "10:00 - 22:00"
      const parts = timeStr.split('-');
      if (parts.length !== 2) return false;
      
      const startTime = parts[0].trim();
      const endTime = parts[1].trim();
      
      // 获取当前时间
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute; // 转换为分钟数
      
      // 解析开始和结束时间
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startTimeMinutes = startHour * 60 + startMin;
      const endTimeMinutes = endHour * 60 + endMin;
      
      // 判断是否在营业时间内
      if (startTimeMinutes <= endTimeMinutes) {
        // 正常情况：09:00 - 18:00
        return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes;
      } else {
        // 跨天情况：22:00 - 02:00
        return currentTime >= startTimeMinutes || currentTime <= endTimeMinutes;
      }
    } catch (e) {
      console.error('解析营业时间失败:', e);
      return false;
    }
  },

  preprocessData() {
    const { shops, userLocation } = this.data;
    if (!userLocation) {
      console.warn('用户位置未获取，无法计算距离');
      return;
    }

    // 复制数组并添加 serviceSet、isOpen 状态和计算真实距离
    let list = shops.map(item => {
      const serviceSet = {};
      (item.services || []).forEach(s => serviceSet[s] = true);
      
      // 计算营业状态
      const isOpen = this.isShopOpen(item.time);
      
      // 计算真实距离（如果店铺有位置信息）
      let dist = parseFloat(item.dist) || 0;
      if (item.latitude && item.longitude && userLocation.latitude && userLocation.longitude) {
        dist = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          item.latitude,
          item.longitude
        );
        // 保留一位小数
        dist = Math.round(dist * 10) / 10;
      }
      
      console.log(`店铺 ${item.name} - 距离: ${dist}KM, 营业状态: ${isOpen ? '营业中' : '未营业'}`);
      
      return { 
        ...item, 
        serviceSet, 
        isOpen,
        dist: dist.toString() // 转换为字符串，保持格式一致
      };
    });

    // --- 核心排序：远(大) -> 近(小) ---
    // 目标：远的在上面（Index 0），近的在下面（Index N）
    list.sort((a, b) => {
      const valA = parseFloat(a.dist) || 0;
      const valB = parseFloat(b.dist) || 0;
      return valA - valB; // 升序：小的在前（近的在上面）
    });

    // 强制更新数据
    this.setData({ shops: list });
    return list;
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
        console.log('[home.js] 身份验证成功：合法管理员');
      }
    } catch (err) {
      console.error('[home.js] 权限检查失败', err);
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this.showAutoToast('提示', '无权限');
      return;
    }
    const nextState = !this.data.isAdmin;
    this.setData({ isAdmin: nextState });
    this.showAutoToast('提示', nextState ? '管理模式开启' : '已回到用户模式');
  },

  // 点击空白处进入管理员模式（仅管理员）
  onBgTap(e) {
    // 如果点击的是卡片或其他交互元素，不处理
    if (e.target.dataset && e.target.dataset.type === 'card') {
      return;
    }
    // 如果详情页已打开，不处理
    if (this.data.isDetailOpen) {
      return;
    }
    // 只有管理员才能通过点击空白处进入管理员模式
    if (this.data.isAuthorized && !this.data.isAdmin) {
      this.setData({ isAdmin: true });
      this.showAutoToast('提示', '管理模式开启');
    }
  },

  // --- 1. 新增卡片 (修复：新增时绝对不排序，确保打开的是新卡片) ---
  onAddShop() {
    const newShop = {
      id: 'new_' + Date.now(), // 临时ID，保存到云数据库后会生成真实 _id
      name: "新店铺",
      sub: "店铺描述",
      dist: "0.0",
      status: "营业中",
      statusColor: "#00C853",
      img: "https://picsum.photos/600/400?new",
      address: "",
      phone: "",
      time: "09:00 - 18:00",
      services: [],
      latitude: 0,
      longitude: 0
    };

    // 计算营业状态
    newShop.isOpen = this.isShopOpen(newShop.time);

    const list = this.data.shops;
    list.unshift(newShop); // 强行插队到第一个
    
    this.setData({ 
      shops: list, 
      scroll: 0, 
      target: 0, 
      isAdding: true 
    });
    
    // ⚠️ 严禁在这里调用 preprocessData() 排序！
    // 否则新卡片(0km)会跑到底部，导致你打开的是旧卡片。
    // 只更新样式，不排序：
    this.updateWheel();

    // 打开第0个 (肯定是刚才新增的那个)
    setTimeout(() => {
      this.openDetail(0);
      this.setData({ isEditing: true });
    }, 100);
  },

  updateWheel() {
    const { shops, scroll } = this.data;
    const styles = [];
    
    // 边界保护
    let currentIndex = Math.round(scroll);
    if(currentIndex < 0) currentIndex = 0;
    if(currentIndex >= shops.length) currentIndex = shops.length - 1;

    shops.forEach((item, i) => {
      const diff = i - scroll;
      
      // 性能优化
      if (Math.abs(diff) > 3.5) {
        styles.push('display: none;');
        return;
      }

      const rotate = diff * 12; 
      let tx = 0; 
      let scale = 0.95; 
      let opacity = 0.5;

      // 选中项 (中间那个)
      if (Math.abs(diff) < 1) {
        const p = 1 - Math.abs(diff);
        
        // --- 修改点：位置修正 ---
        // 之前是 -160 (向左移太多了)
        // 现在改为 -110 (稍微往右回一点，视觉更居中)
        tx = -110 * p; 
        
        scale = 0.95 + (0.05 * p);
        opacity = 0.5 + (0.5 * p);
      }

      // 旋转轴心 1400rpx
      const style = `
        display: flex;
        transform: rotate(${rotate}deg) translate3d(${tx}rpx, 0, 0) scale(${scale});
        opacity: ${opacity};
        z-index: ${100 - Math.round(Math.abs(diff))};
      `;
      styles.push(style);
    });

    this.setData({ cardStyles: styles, currentIndex });
  },

  loop() {
    if (!this.isDragging && !this.data.isDetailOpen) {
      const nextScroll = this.data.scroll + (this.data.target - this.data.scroll) * 0.1;
      if (Math.abs(nextScroll - this.data.target) < 0.005) {
        this.setData({ scroll: this.data.target });
      } else {
        this.setData({ scroll: nextScroll });
        this.updateWheel();
        this.animationFrame = setTimeout(() => this.loop(), 16); 
      }
    }
  },

  onTouchStart(e) { 
    if (this.data.isDetailOpen) return; 
    this.isDragging = true; 
    this.startY = e.touches[0].clientY; 
    this.startScroll = this.data.scroll; 
    if(this.animationFrame) clearTimeout(this.animationFrame); 
  },
  onTouchMove(e) { 
    if (this.data.isDetailOpen) return; 
    // 修复方向：向上滑动（startY > currentY）应该增加scroll，向下滑动应该减少scroll
    // 修复灵敏度：增大除数，从150改为250，使滑动更平滑、更不敏感
    const delta = this.startY - e.touches[0].clientY;
    this.setData({ scroll: this.startScroll - (delta / 250) }); 
    this.updateWheel(); 
  },
  onTouchEnd() { 
    this.isDragging = false; 
    let target = Math.round(this.data.scroll); 
    target = Math.max(0, Math.min(this.data.shops.length - 1, target)); 
    this.setData({ target }); 
    this.loop(); 
  },
  
  onCardTap(e) { const index = e.currentTarget.dataset.index; if (this.data.currentIndex !== index) { this.setData({ target: index }); this.loop(); return; } this.openDetail(index); },

  // --- 详情与编辑 ---
  
  // 选择图片并上传到云存储（管理员模式下可直接调用，编辑模式下也可调用）
  chooseImage() {
    // 管理员模式或编辑模式下都可以选择图片
    if(!this.data.isAdmin && !this.data.isEditing) return;
    
    const that = this;
    const { activeItem } = this.data;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('选择的图片临时路径:', tempFilePath);
        
        // 如果是编辑模式，先更新 editData
        if (that.data.isEditing) {
          that.setData({
            'editData.img': tempFilePath
          });
        }
        
        // 如果是浏览模式（管理员模式），直接更新 activeItem 显示
        if (!that.data.isEditing && that.data.isAdmin) {
          that.setData({
            'activeItem.img': tempFilePath
          });
        }
        
        // 上传到云存储
        getApp().showLoading({ title: '上传图片中...', mask: true });
        const cloudPath = `home/images/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: async (uploadRes) => {
            console.log('图片上传成功，云存储文件ID:', uploadRes.fileID);
            const cloudFileID = uploadRes.fileID;
            
            try {
              // 更新显示
              if (that.data.isEditing) {
                // 编辑模式下，更新 editData
                that.setData({
                  'editData.img': cloudFileID
                });
                getApp().hideLoading();
                this.showAutoToast('成功', '图片已更新');
              } else if (that.data.isAdmin) {
                // 管理员浏览模式下，直接更新并保存到云数据库
                const shopId = activeItem._id || activeItem.id;
                if (shopId && !shopId.toString().startsWith('new_')) {
                  // 更新云数据库
                  await that.updateShopImageInCloud(shopId, cloudFileID);
                  // 更新本地显示
                  that.setData({
                    'activeItem.img': cloudFileID
                  });
                  // 更新 shops 数组中的图片
                  const shops = that.data.shops.map(shop => {
                    if ((shop._id && shop._id === shopId) || (shop.id === shopId)) {
                      shop.img = cloudFileID;
                    }
                    return shop;
                  });
                  that.setData({ shops });
                  
                  getApp().hideLoading();
                  this.showAutoToast('成功', '图片已更新');
                } else {
                  getApp().hideLoading();
                  this.showAutoToast('成功', '图片上传成功');
                }
              } else {
                // 其他情况，确保隐藏 loading
                getApp().hideLoading();
              }
            } catch (err) {
              console.error('处理图片更新失败:', err);
              getApp().hideLoading();
              this.showAutoToast('提示', '保存失败，请重试');
            }
          },
          fail: (err) => {
            console.error('图片上传失败:', err);
            getApp().hideLoading();
            this.showAutoToast('提示', '图片上传失败: ' + (err.errMsg || '未知错误'));
          }
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        this.showAutoToast('提示', '选择图片失败');
      }
    });
  },

  // 更新店铺图片到云数据库
  async updateShopImageInCloud(shopId, imageUrl) {
    return new Promise((resolve, reject) => {
      db.collection('home').doc(shopId).update({
        data: {
          img: imageUrl,
          updateTime: new Date()
        },
        success: () => {
          console.log('图片更新到云数据库成功，ID:', shopId);
          resolve();
        },
        fail: (err) => {
          console.error('图片更新到云数据库失败:', err);
          reject(err);
        }
      });
    });
  },

  // 选择位置
  chooseLocation() {
    if(!this.data.isEditing) return;
    const that = this;
    wx.chooseLocation({
      success(res) {
        // res.name (地点名称), res.address (详细地址), res.latitude, res.longitude
        that.setData({
          'editData.address': res.address || res.name, // 优先用地址
          'editData.latitude': res.latitude,
          'editData.longitude': res.longitude
        });
      },
      fail(err) {
        console.error(err);
        this.showAutoToast('提示', '选择位置失败');
      }
    });
  },

  // --- 2. 打开详情 (时间解析逻辑) ---
  openDetail(index) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const query = this.createSelectorQuery().in(this);
    
    query.select(`#card-${index}`).boundingClientRect(rect => {
      if (!rect) return;
      const item = this.data.shops[index];
      
      // 拆解时间：防止 split 报错
      let timeStr = item.time || "09:00 - 18:00";
      let parts = timeStr.split('-');
      let startT = parts[0] ? parts[0].trim() : "09:00";
      let endT = parts[1] ? parts[1].trim() : "18:00";
      
      // 确保图片路径正确
      const imgPath = item.img || '';
      console.log('打开详情，图片路径:', imgPath);
      
      // 根据营业时间计算当前状态
      const isOpen = this.isShopOpen(item.time);
      const status = isOpen ? '营业中' : '未营业';
      const statusColor = isOpen ? '#00C853' : '#FF3B30';
      
      // 更新 activeItem，包含最新的营业状态
      const updatedActiveItem = {
        ...item,
        isOpen,
        status,
        statusColor
      };
      
      // 计算初始位置（卡片当前位置）
      const initialTop = rect.top;
      const initialLeft = rect.left;
      const initialWidth = rect.width;
      const initialHeight = rect.height;
      
      this.setData({
        isDetailOpen: true,
        showPhantom: true,
        activeItem: updatedActiveItem,
        phantomStyle: `top: ${initialTop}px; left: ${initialLeft}px; width: ${initialWidth}px; height: ${initialHeight}px; transform: none;`,
        
        editData: {
          id: item.id, // 绑定ID
          _id: item._id, // 绑定云数据库ID
          name: item.name, sub: item.sub, dist: item.dist, 
          servicesStr: item.services.join(','),
          address: item.address, phone: item.phone, 
          
          // 时间相关
          time: timeStr, 
          startTime: startT, 
          endTime: endT,
          
          img: imgPath, // 确保图片路径被正确设置
          latitude: item.latitude, longitude: item.longitude,
          selectedServices: [...item.services]
        }
      });

      // 延迟执行展开动画，确保初始位置已设置
      setTimeout(() => {
         const targetW = sys.windowWidth * 0.88; 
         const targetLeft = (sys.windowWidth - targetW) / 2;
         const targetTop = sys.windowHeight / 2; // 屏幕中心位置（像素值）
         const maxHeight = sys.windowHeight * 0.85; // 最大高度为屏幕的85%
         
         this.setData({
           isExpanded: true,
           phantomStyle: `top: ${targetTop}px; left: ${targetLeft}px; width: ${targetW}px; max-height: ${maxHeight}px; transform: translateY(-50%);`
         });
      }, 100); // 稍微增加延迟，确保初始样式已应用
    }).exec();
  },

  // --- 5. 关闭详情 (处理取消新增的情况) ---
  // 取消添加新卡片（专门用于添加模式下的取消）
  cancelAddShop() {
    const list = this.data.shops;
    // 删除临时的新卡片
    const cleanList = list.filter(item => {
      const itemId = item.id || item._id;
      const activeId = this.data.activeItem.id || this.data.activeItem._id;
      return itemId !== activeId;
    });
    
    // 先关闭详情页面，避免卡死
    this.setData({ 
      isExpanded: false,
      isEditing: false,
      isAdding: false
    });
    
    // 延迟关闭 phantom，确保动画完成
    setTimeout(() => {
      this.setData({
        showPhantom: false,
        isDetailOpen: false,
        shops: cleanList
      });
      
      // 刷新列表
      this.preprocessData();
      this.updateWheel();
    }, 300);
  },

  closeDetail() {
    // 如果是新增状态下点击了关闭，说明用户取消了创建
    // 必须把那个临时的卡片删掉
    if (this.data.isAdding) {
      this.cancelAddShop();
      return;
    }

    const query = this.createSelectorQuery().in(this);
    // 这里要小心，如果因为取消新增删除了卡片，select 可能会找不到，需要容错
    const closeIndex = this.data.target; // 使用当前的 target 索引
    
    query.select(`#card-${closeIndex}`).boundingClientRect(rect => {
      const fallbackRect = { top: 300, left: 30, width: 300, height: 130 };
      const finalRect = rect || fallbackRect;

      this.setData({
        isExpanded: false,
        isEditing: false, 
        phantomStyle: `top: ${finalRect.top}px; left: ${finalRect.left}px; width: ${finalRect.width}px; height: ${finalRect.height}px; transform: none;`
      });

      setTimeout(() => {
        this.setData({
          showPhantom: false,
          isDetailOpen: false
        });
      }, 500); 
    }).exec();
  },

  toggleEdit() { this.setData({ isEditing: !this.data.isEditing }); },
  
  // 检查是否需要重新生成测试数据（位置变化超过5km才重新生成）
  async shouldRegenerateTestData(oldTestShops) {
    const { userLocation } = this.data;
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      return true; // 没有位置信息，需要生成
    }
    
    if (oldTestShops.length === 0) {
      return true; // 没有旧数据，需要生成
    }
    
    // 从旧测试数据中获取生成时的位置（保存在第一个测试店铺的 testLocation 字段，或从店铺位置推算）
    // 如果没有保存位置，检查第一个测试店铺的位置
    const firstTestShop = oldTestShops[0];
    if (!firstTestShop.testLocation && (!firstTestShop.latitude || !firstTestShop.longitude)) {
      return true; // 没有位置信息，需要重新生成
    }
    
    // 获取旧位置（优先使用 testLocation，否则使用第一个店铺的位置）
    const oldLocation = firstTestShop.testLocation || {
      latitude: firstTestShop.latitude,
      longitude: firstTestShop.longitude
    };
    
    // 计算当前位置和旧位置的距离
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      oldLocation.latitude,
      oldLocation.longitude
    );
    
    console.log(`当前位置与测试数据生成位置距离: ${distance.toFixed(2)}km`);
    
    // 如果距离超过5km，需要重新生成
    return distance > 5;
  },

  // 生成测试数据
  async generateTestData() {
    const { userLocation, allServices } = this.data;
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      this.showAutoToast('提示', '请先获取位置信息');
      return;
    }
    
    // 随机昵称列表
    const randomNames = [
      '小张', '老王', '李师傅', '陈师傅', '刘师傅', '张师傅', '王师傅', '李师傅',
      '老李', '老陈', '老刘', '老张', '老赵', '老孙', '老周', '老吴',
      '阿强', '阿明', '阿华', '阿伟', '阿军', '阿斌', '阿杰', '阿勇',
      '大伟', '小强', '小明', '小华', '小军', '小斌', '小杰', '小勇'
    ];
    
    // 随机选择6个不同的昵称
    const shuffledNames = [...randomNames].sort(() => Math.random() - 0.5);
    const selectedNames = shuffledNames.slice(0, 6);
    
    const testSubs = [
      '专业维修服务', '快速保养中心', '精品改装店', '咖啡机车馆', '洗车美容店', '高端定制中心'
    ];
    const testAddresses = [
      '测试地址A', '测试地址B', '测试地址C', '测试地址D', '测试地址E', '测试地址F'
    ];
    const testPhones = [
      '13800000001', '13800000002', '13800000003', '13800000004', '13800000005', '13800000006'
    ];
    const testTimes = [
      '08:00 - 20:00', '09:00 - 18:00', '10:00 - 22:00', '07:00 - 19:00', '09:30 - 21:30', '08:30 - 20:30'
    ];
    
    // 随机生成6个测试点位（距离在40-60km之间）
    const testShops = [];
    for (let i = 0; i < 6; i++) {
      // 生成随机距离（40-60km）
      const targetDistance = 40 + Math.random() * 20; // 40-60km
      
      // 生成随机方向角度（0-360度）
      const angle = Math.random() * 2 * Math.PI;
      
      // 计算经纬度偏移量
      // 1度纬度 ≈ 111km
      // 1度经度 ≈ 111km * cos(纬度)
      const latOffset = (targetDistance * Math.cos(angle)) / 111.0;
      const lonOffset = (targetDistance * Math.sin(angle)) / (111.0 * Math.cos(userLocation.latitude * Math.PI / 180));
      
      const randomLat = userLocation.latitude + latOffset;
      const randomLon = userLocation.longitude + lonOffset;
      
      // 随机选择服务（1-3个）
      const serviceCount = Math.floor(Math.random() * 3) + 1;
      const shuffledServices = [...allServices].sort(() => Math.random() - 0.5);
      const selectedServices = shuffledServices.slice(0, serviceCount).map(s => s.name);
      
      // 计算实际距离（用于显示）
      const dist = this.calculateDistance(
        userLocation.latitude, 
        userLocation.longitude,
        randomLat,
        randomLon
      );
      
      const testShop = {
        id: 'test_' + Date.now() + '_' + i,
        name: selectedNames[i] + '维修店', // 统一命名为"xx维修店"
        sub: testSubs[i],
        dist: dist.toFixed(1),
        status: Math.random() > 0.5 ? '营业中' : '休息中',
        statusColor: Math.random() > 0.5 ? '#00C853' : '#FF3B30',
        img: `https://picsum.photos/600/400?random=${Date.now()}_${i}`, // 随机图片
        address: testAddresses[i],
        latitude: randomLat,
        longitude: randomLon,
        phone: testPhones[i],
        time: testTimes[i],
        services: selectedServices,
        isTest: true, // 标记为测试数据
        createTime: new Date(),
        updateTime: new Date()
      };
      
      testShops.push(testShop);
    }
    
    // 逐个保存到云数据库（小程序端不支持 batch）
    try {
      console.log('开始保存测试数据到云数据库，共', testShops.length, '个');
      for (let i = 0; i < testShops.length; i++) {
        const shop = testShops[i];
        try {
          const res = await db.collection('home').add({
            data: {
              name: shop.name,
              sub: shop.sub,
              dist: shop.dist,
              status: shop.status,
              statusColor: shop.statusColor,
              img: shop.img,
              address: shop.address,
              latitude: shop.latitude,
              longitude: shop.longitude,
              phone: shop.phone,
              time: shop.time,
              services: shop.services,
              isTest: true,
              id: shop.id,
              // 保存生成时的用户位置，用于判断是否需要重新生成
              testLocation: {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude
              },
              createTime: shop.createTime,
              updateTime: shop.updateTime
            }
          });
          console.log(`✅ 测试数据 ${i + 1}/${testShops.length} 保存成功，ID:`, res._id);
        } catch (saveErr) {
          console.error(`❌ 测试数据 ${i + 1}/${testShops.length} 保存失败:`, saveErr);
        }
        // 添加延迟，避免请求过快
        if (i < testShops.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      console.log('✅ 所有测试数据保存完成');
      
      // 注意：不在这里重新加载，避免循环
      // 由调用方（loadShopsFromCloud）决定是否重新加载
    } catch (err) {
      console.error('生成测试数据失败:', err);
      throw err; // 抛出错误，让调用方知道生成失败
    }
  },
  
  onEditInput(e) { const field = e.currentTarget.dataset.field; this.setData({ [`editData.${field}`]: e.detail.value }); },
  
  // 2. 新增：点击标签切换选中状态
  toggleService(e) {
    const name = e.currentTarget.dataset.name;
    let list = this.data.editData.selectedServices || [];
    
    // 如果已存在则删除，不存在则添加
    if (list.includes(name)) {
      list = list.filter(item => item !== name);
    } else {
      list.push(name);
    }
    
    this.setData({
      'editData.selectedServices': list
    });
  },

  // --- 3. 时间选择器修复 (使用 setData 路径更新) ---
  onStartTimeChange(e) {
    console.log('开始时间变了:', e.detail.value);
    this.setData({ 
      'editData.startTime': e.detail.value 
    });
  },
  
  onEndTimeChange(e) {
    console.log('结束时间变了:', e.detail.value);
    this.setData({ 
      'editData.endTime': e.detail.value 
    });
  },
  
  // 保存店铺到云数据库
  async saveShopToCloud(shopData, isNew = false) {
    return new Promise((resolve, reject) => {
      const dataToSave = {
        name: shopData.name,
        sub: shopData.sub,
        dist: shopData.dist,
        status: shopData.status || '营业中',
        statusColor: shopData.statusColor || '#00C853',
        img: shopData.img,
        address: shopData.address,
        latitude: shopData.latitude,
        longitude: shopData.longitude,
        phone: shopData.phone,
        time: shopData.time,
        services: shopData.services || [],
        updateTime: new Date()
      };

      if (isNew) {
        // 新建
        dataToSave.id = shopData.id;
        dataToSave.createTime = new Date();
        dataToSave.isTest = false; // 🔴 明确标记为非测试数据
        db.collection('home').add({
          data: dataToSave,
          success: (res) => {
            console.log('新建店铺成功，云数据库ID:', res._id);
            resolve(res._id);
          },
          fail: (err) => {
            console.error('新建店铺失败:', err);
            reject(err);
          }
        });
      } else {
        // 更新
        const docId = shopData._id || shopData.id;
        db.collection('home').doc(docId).update({
          data: dataToSave,
          success: () => {
            console.log('更新店铺成功，ID:', docId);
            resolve(docId);
          },
          fail: (err) => {
            console.error('更新店铺失败:', err);
            reject(err);
          }
        });
      }
    });
  },

  // --- 4. 保存编辑 (保存后重新定位并同步到云数据库) ---
  async saveEdit() {
    const { editData, shops } = this.data;
    
    // 判断是新店铺还是编辑已有店铺
    // 关键：通过 _id 判断，如果有 _id 且不是临时ID就是编辑，否则是新建
    const hasRealId = editData._id && typeof editData._id === 'string' && !editData._id.toString().startsWith('new_');
    const isTempId = editData.id && editData.id.toString().startsWith('new_');
    const isNewShop = !hasRealId && (isTempId || !editData._id);
    
    console.log('保存判断:', { 
      hasRealId, 
      isTempId, 
      isNewShop, 
      editDataId: editData.id, 
      editData_id: editData._id 
    });
    
    let item;
    let foundIndex = -1;
    
    if (isNewShop) {
      // 新店铺：从 shops 数组中找到临时创建的店铺
      foundIndex = shops.findIndex(s => s.id === editData.id);
      if (foundIndex === -1) {
        this.showAutoToast('提示', '店铺不存在');
        return;
      }
      item = shops[foundIndex];
    } else {
      // 编辑已有店铺：优先通过 _id 查找，其次通过 id 查找
      foundIndex = shops.findIndex(s => {
        if (s._id && editData._id && s._id === editData._id) return true;
        if (s.id && editData.id && s.id === editData.id && !editData.id.toString().startsWith('new_')) return true;
        return false;
      });
      if (foundIndex === -1) {
        this.showAutoToast('提示', '店铺不存在');
        return;
      }
      item = shops[foundIndex];
    }
    
    // 更新本地数据
    item.name = editData.name;
    item.sub = editData.sub;
    item.address = editData.address;
    item.phone = editData.phone;
    item.time = `${editData.startTime} - ${editData.endTime}`;
    item.img = editData.img;
    item.latitude = editData.latitude;
    item.longitude = editData.longitude;
    item.services = editData.selectedServices;
    // 确保 _id 被保留
    if (editData._id) {
      item._id = editData._id;
    }

    // 重新计算距离（如果位置变化了）
    if (this.data.userLocation && item.latitude && item.longitude) {
      const dist = this.calculateDistance(
        this.data.userLocation.latitude,
        this.data.userLocation.longitude,
        item.latitude,
        item.longitude
      );
      item.dist = (Math.round(dist * 10) / 10).toString();
    }

    // 同步到云数据库
    try {
      const savedId = await this.saveShopToCloud(item, isNewShop);
      
      // 如果是新店铺，更新 _id
      if (isNewShop) {
        // 更新 item 的 _id
        item._id = savedId;
        
        // 重新从云数据库加载以获取完整的店铺列表
        await this.loadShopsFromCloud();
        // 重新处理数据
        this.preprocessData();
        
        // 找到新店铺在排序后的位置（使用保存后的 _id）
        const sortedList = this.data.shops;
        const newIndex = sortedList.findIndex(i => {
          // 优先使用 _id 匹配
          if (i._id && savedId && i._id === savedId) return true;
          // 其次使用 id 匹配（排除临时ID）
          if (i.id === item.id && item.id && !item.id.toString().startsWith('new_')) return true;
          return false;
        });
        
        // 更新界面
        this.setData({ 
          activeItem: sortedList[newIndex] || item,
          scroll: newIndex >= 0 ? newIndex : 0,
          target: newIndex >= 0 ? newIndex : 0,
          isEditing: false, 
          isAdding: false 
        });
        
        this.updateWheel();
        
        // 如果找不到新店铺（可能被测试模式过滤），提示用户
        if (newIndex < 0) {
          this.showAutoToast('提示', '保存成功，但当前测试模式已开启，请关闭测试模式查看');
        } else {
          this.showAutoToast('成功', '保存成功');
        }
      } else {
        // 编辑已有店铺：更新本地数据中的 _id（如果返回了新的ID）
        if (savedId && !item._id) {
          item._id = savedId;
        }
        // 重新处理数据（计算距离、营业状态、排序）
        this.preprocessData();
        
        // 找到这个店排序后的位置
        const sortedList = this.data.shops;
        const newIndex = sortedList.findIndex(i => {
          // 优先使用 _id 匹配
          if (i._id && item._id && i._id === item._id) return true;
          // 其次使用 id 匹配（排除临时ID）
          if (i.id === item.id && item.id && !item.id.toString().startsWith('new_')) return true;
          return false;
        });

        // 更新界面
        this.setData({ 
          activeItem: sortedList[newIndex] || item,
          scroll: newIndex >= 0 ? newIndex : 0,
          target: newIndex >= 0 ? newIndex : 0,
          isEditing: false, 
          isAdding: false 
        });

        this.updateWheel();
        this.showAutoToast('成功', '保存成功');
      }
    } catch (err) {
      console.error('保存到云数据库失败:', err);
      this.showAutoToast('提示', '保存失败，请重试');
    }
  },

  // 从云数据库删除店铺
  async deleteShopFromCloud(shopId) {
    return new Promise((resolve, reject) => {
      db.collection('home').doc(shopId).remove({
        success: () => {
          console.log('从云数据库删除店铺成功，ID:', shopId);
          resolve();
        },
        fail: (err) => {
          console.error('从云数据库删除店铺失败:', err);
          reject(err);
        }
      });
    });
  },

  deleteShop() {
    this.showMyDialog({
      title: '确认删除', 
      content: '删除后无法恢复，确定吗？',
      showCancel: true,
      confirmText: '删除',
      cancelText: '取消',
      success: async (res) => {
        if(res.confirm) {
          const { activeItem, shops } = this.data;
          const shopId = activeItem._id || activeItem.id;
          
          // 如果是新店铺（还未保存到云数据库），直接删除本地数据
          if (shopId && shopId.toString().startsWith('new_')) {
            const list = shops.filter(item => item.id !== shopId);
            this.closeDetail();
            setTimeout(() => {
              this.setData({ shops: list, scroll: 0, target: 0 });
              this.preprocessData();
              this.updateWheel();
            }, 500);
            return;
          }
          
          // 从云数据库删除
          try {
            await this.deleteShopFromCloud(shopId);
            
            // 从本地数据中删除
            const list = shops.filter(item => 
              (item._id && item._id !== shopId) && 
              (item.id && item.id !== shopId)
            );
            
            this.closeDetail();
            // 稍微延迟等动画做完再刷新列表
            setTimeout(() => {
              this.setData({ shops: list, scroll: 0, target: 0 });
              this.preprocessData();
              this.updateWheel();
              this.showAutoToast('成功', '删除成功');
            }, 500);
          } catch (err) {
            console.error('删除失败:', err);
            this.showAutoToast('提示', '删除失败，请重试');
          }
        }
      }
    });
  },

  openLocation() {
    const item = this.data.activeItem;
    if(item.latitude && item.longitude) {
      wx.openLocation({
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name,
        address: item.address
      })
    } else {
      this.showAutoToast('提示', '暂无定位数据');
    }
  },
  
  makeCall() { 
    if(this.data.activeItem.phone) wx.makePhoneCall({ phoneNumber: this.data.activeItem.phone }); 
  },

  onShow() {
    // 🔴 检查录屏状态
    if (wx.getScreenRecordingState) {
      wx.getScreenRecordingState({
        success: (res) => {
          if (res.state === 'on' || res.recording) {
            this.handleIntercept('record');
          }
        }
      });
    }
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    // 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('[home] 🛡️ 硬件级防偷拍锁定')
      });
    }

    // 截屏监听
    wx.onUserCaptureScreen(() => {
      this.handleIntercept('screenshot');
    });

    // 录屏监听
    if (wx.onUserScreenRecord) {
      wx.onUserScreenRecord(() => {
        this.handleIntercept('record');
      });
    }
  },

  // 🔴 获取位置和设备信息的辅助函数
  async _getLocationAndDeviceInfo() {
    const sysInfo = wx.getSystemInfoSync();
    const deviceInfo = {
      deviceInfo: sysInfo.system || '',
      phoneModel: sysInfo.model || ''
    };
    
    // 尝试从缓存获取位置信息
    const cachedLocation = wx.getStorageSync('last_location');
    if (cachedLocation && cachedLocation.province && cachedLocation.city) {
      // 如果缓存中有完整的地址信息，直接使用
      return {
        ...cachedLocation,
        ...deviceInfo
      };
    }
    
    try {
      // 获取当前位置
      const locationRes = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        });
      });

      const lat = locationRes.latitude;
      const lng = locationRes.longitude;
      
      // 🔴 使用带重试机制的逆地理编码获取详细地址
      const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
      const addressData = await reverseGeocodeWithRetry(lat, lng, {
        maxRetries: 3,
        timeout: 10000,
        retryDelay: 1000
      });

      return {
        ...addressData,
        ...deviceInfo
      };
    } catch (err) {
      console.error('[home] 获取位置信息失败:', err);
      // 获取定位失败，尝试使用缓存的位置信息
      if (cachedLocation) {
        return {
          ...cachedLocation,
          ...deviceInfo
        };
      } else {
        // 完全失败，只返回设备信息
        return deviceInfo;
      }
    }
  },

  // 🔴 处理截屏/录屏拦截
  async handleIntercept(type) {
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[home] 🔴 截屏/录屏检测，立即跳转');
    
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'home',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        console.log('[home] ✅ 设置封禁状态成功:', res);
      },
      fail: (err) => {
        console.error('[home] ⚠️ 设置封禁状态失败:', err);
      }
    });

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'home',
          ...locationData
        },
        success: (res) => {
          console.log('[home] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[home] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      console.log('[home] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[home] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[home] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[home] 跳转到 blocked 页面成功');
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[home] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        wx.exitMiniProgram();
      }
    });
  },
  
  // 【新增】自动消失提示（无按钮，2秒后自动消失，带收缩退出动画）
  showAutoToast(title = '提示', content = '') {
    // 如果已有toast在显示，先关闭它
    if (this.data.autoToast.show) {
      this._closeAutoToastWithAnimation();
      setTimeout(() => {
        this._showAutoToastInternal(title, content);
      }, 420);
    } else {
      this._showAutoToastInternal(title, content);
    }
  },

  // 内部方法：显示自动提示
  _showAutoToastInternal(title, content) {
    this.setData({
      'autoToast.show': true,
      'autoToast.title': title,
      'autoToast.content': content,
      autoToastClosing: false
    });
    // 2秒后自动消失（带退出动画）
    setTimeout(() => {
      this._closeAutoToastWithAnimation();
    }, 2000);
  },

  // 关闭自动提示（带收缩退出动画）
  _closeAutoToastWithAnimation() {
    if (!this.data.autoToast.show) return;
    this.setData({ autoToastClosing: true });
    setTimeout(() => {
      this.setData({ 
        'autoToast.show': false,
        autoToastClosing: false
      });
    }, 420);
  },
  
  // 【新增】自定义对话框
  showMyDialog(options) {
    this.setData({
      'dialog.show': true,
      'dialog.title': options.title || '提示',
      'dialog.content': options.content || '',
      'dialog.showCancel': options.showCancel || false,
      'dialog.confirmText': options.confirmText || '确定',
      'dialog.cancelText': options.cancelText || '取消',
      'dialog.callback': options.success || null
    });
  },
  
  // 【新增】关闭自定义对话框（带收缩退出动画）
  closeCustomDialog() {
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
    }, 420);
  },
  
  // 【新增】点击对话框确定（带收缩退出动画）
  onDialogConfirm() {
    const cb = this.data.dialog.callback;
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
      if (cb) cb({ confirm: true });
    }, 420);
  },

  // 空函数，用于阻止事件冒泡和滚动
  noop() {}
})