const app = getApp();

const iconF1Pro = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMjUiIHk9IjMwIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIiByeD0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHJlY3QgeD0iNDUiIHk9IjQ1IiB3aWR0aD0iMzUiIGhlaWdodD0iOCIgcng9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMTIwIiB5PSI0NSIgd2lkdGg9IjM1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMyIvPjx0ZXh0IHg9IjEwMCIgeT0iOTAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iI0ZGRkZGRiIgbGV0dGVyLXNwYWNpbmc9IjMiPk1UPC90ZXh0Pjwvc3ZnPg==';
const iconF1Max = iconF1Pro; 
const iconF2Pro = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDMwIEgxOTAgQzE5NSAzMCAxOTUgMzUgMTk1IDM1IFY0OCBDMTk1IDUzIDE5MCA1MyAxOTAgNTMgSDEyMSBWNjkgSDEyMi41IEMxMjcuNSA2OSAxMjcuNSA3NCAxMjcuNSA3NCBWOTQgQzEyNy41IDk5IDEyMi41IDk5IDEyMi41IDk5IEg4Mi41IEM3Ny41IDk5IDc3LjUgOTQgNzcuNSA5NCBWNzQgQzc3LjUgNjkgODIuNSA2OSA4Mi41IDY5IEg4NCBWNTMgSDE1IEMxMCA1MyAxMCA0OCAxMCA0OCBWMzUgQzEwIDMwIDE1IDMwIDE1IDMwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHJlY3QgeD0iMzYiIHk9IjM3IiB3aWR0aD0iMjYiIGhlaWdodD0iOCIgcng9IjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMTQ1IiB5PSIzOCIgd2lkdGg9IjI1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMyIvPjx0ZXh0IHg9IjEwMi41IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRkZGIj48dHNwYW4geD0iMTAyLjUiIGR5PSIwIj5NPC90c3Bhbj48dHNwYW4geD0iMTAyLjUiIGR5PSIxNiI+VDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==';

// BLE Helper (保持不变)
class BLEHelper {
  constructor(api = wx) {
    this.api = api; this.device = null;
    this.onDeviceFound = null; this.onConnected = null; this.onDisconnected = null; this.onError = null;
    this.isScanning = false;
  }
  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      // 先检查蓝牙适配器状态
      this.api.getBluetoothAdapterState({
        success: () => {
          // 如果已经打开，直接resolve
          resolve();
        },
        fail: () => {
          // 如果没有打开，尝试打开
          this.api.openBluetoothAdapter({
            success: (res) => { resolve(res); },
            fail: (err) => {
              // 如果是"already opened"错误，也当作成功处理
              if (err.errMsg && err.errMsg.includes('already opened')) {
                resolve();
              } else {
                if (this.onError) this.onError(err);
                reject(err);
              }
            }
          });
        }
      });
    });
  }
  startScan() {
    this.isScanning = true;
    this.api.startBluetoothDevicesDiscovery({ 
      powerLevel: 'high',
      allowDuplicatesKey: true,
      success: () => {
        this.setupDeviceFoundListener();
      },
      fail: (err) => {
        this.isScanning = false;
        console.error('开始扫描失败:', err);
        if (this.onError) this.onError(err);
      }
    });
  }

  setupDeviceFoundListener() {
    this.api.onBluetoothDeviceFound((res) => {
      // 遍历所有发现的设备，不只是第一个
      if (!res.devices || res.devices.length === 0) return;
      
      for (let i = 0; i < res.devices.length; i++) {
        const device = res.devices[i];
        // 检查设备名称是否以NB开头
        if (device.name && device.name.startsWith('NB')) {
          if (this.onDeviceFound) {
            this.onDeviceFound(device);
            // 找到设备后停止扫描
            this.stopScan();
            return;
          }
        }
      }
    });
  }

  stopScan() {
    if (this.isScanning) {
      this.api.stopBluetoothDevicesDiscovery();
      this.isScanning = false;
    }
  }
  connectDevice(device) {
    this.stopScan();
    return new Promise((resolve, reject) => {
      this.api.createBLEConnection({
        deviceId: device.deviceId,
        timeout: 20000, // 20秒超时
        success: (res) => {
          this.device = device;
          setTimeout(() => {
            if (this.onConnected) this.onConnected(device);
            this.api.onBLEConnectionStateChange((res) => {
              if (!res.connected) {
                this.device = null;
                if (this.onDisconnected) this.onDisconnected();
              }
            });
            resolve(device);
          }, 1500);
        },
        fail: (err) => {
          console.error('连接设备失败:', err);
          if (this.onError) this.onError(err);
          reject(err);
        }
      });
    });
  }
  disconnect() {
    if (this.device) this.api.closeBLEConnection({ deviceId: this.device.deviceId });
    this.api.closeBluetoothAdapter();
  }
}

Page({
  data: {
    // 🔴 状态栏高度
    statusBarHeight: 44,
    
    loaderFading: false,
    islandState: '', islandText: '', connectSuccess: false,
    showStage: false, showSelector: false,
    isInjecting: false, revealProgress: 0, exploded: false,
    showEnd: false, showFinishBtn: false, showFail: false,
    targetDevice: null,
    devices: ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX'],
    currentDevIdx: 0,
    currentSvg: iconF1Pro,
    hasSavedOtaRecord: false // 仅在动画完成且显示"升级完成"后再保存
  },

  onLoad() {
    // 🔴 获取状态栏高度
    const winInfo = wx.getWindowInfo();
    this.setData({ statusBarHeight: winInfo.statusBarHeight || 44 });
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('ota');
    }
    
    this.initCanvas();
    this.initBLE();
    this.initAudio();
  },
  
  // ================= 音效和震动 =================
  initAudio() {
    // 初始化音频上下文（如果需要播放音效文件）
    // 注意：小程序需要将音频文件放在项目目录中
    // this.successAudio = wx.createInnerAudioContext();
    // this.successAudio.src = '/audio/success.mp3';
    // this.failAudio = wx.createInnerAudioContext();
    // this.failAudio.src = '/audio/fail.mp3';
  },
  
  // 震动：短震动
  vibrateShort() {
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'medium' });
    }
  },
  
  // 震动：长震动
  vibrateLong() {
    if (wx.vibrateLong) {
      wx.vibrateLong();
    }
  },
  
  // 播放成功音效（如果需要）
  playSuccessSound() {
    // if (this.successAudio) {
    //   this.successAudio.play();
    // }
  },
  
  // 播放失败音效（如果需要）
  playFailSound() {
    // if (this.failAudio) {
    //   this.failAudio.play();
    // }
  },
  
  // 开始注入时的持续高频震动
  startInjectionVibration() {
    // 停止之前的震动（如果有）
    this.stopInjectionVibration();
    
    // 高频震动：每100ms震动一次
    this.vibrationTimer = setInterval(() => {
      this.vibrateShort();
    }, 100);
  },
  
  // 停止注入时的震动
  stopInjectionVibration() {
    if (this.vibrationTimer) {
      clearInterval(this.vibrationTimer);
      this.vibrationTimer = null;
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
    
    if(this.ble) {
      this.ble.stopScan();
      this.ble.disconnect();
    }
    if(this.canvas) this.canvas.cancelAnimationFrame(this.animReq);
    // 清除扫描超时
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    // 停止震动
    this.stopInjectionVibration();
    // 销毁音频上下文
    // if(this.successAudio) this.successAudio.destroy();
    // if(this.failAudio) this.failAudio.destroy();
  },

  // ================= 蓝牙 =================
  initBLE() {
    this.ble = new BLEHelper(wx);
    this.scanTimeout = null;
    
    this.ble.onDeviceFound = (device) => {
      console.log('🔍 发现设备:', device.name, device.deviceId);
      if(!this.data.targetDevice) {
        this.setData({ targetDevice: device });
        // 找到设备后，显示提示
        this.showIslandTip('设备已找到，点击连接', false);
      }
    };
    
    this.ble.onConnected = () => {
      // 清除扫描超时
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }
      
      // 连接成功：震动 + 音效
      this.vibrateShort();
      this.playSuccessSound();
      
      // 连接成功后，先隐藏"正在连接中"的提示，显示"连接成功"
      this.setData({ 
        islandState: 'active', 
        connectSuccess: true, 
        islandText: '连接成功',
        loaderFading: true // 连接成功后才开始淡出加载界面
      });
      setTimeout(() => {
        this.setData({ islandState: '', showStage: true });
        setTimeout(() => { this.setData({ showSelector: true }); }, 500);
      }, 1500);
    };
    
    // 监听断开 (修复闪退问题)
    this.ble.onDisconnected = () => {
      // 只有在注入过程中断开才触发
      if(this.data.isInjecting && !this.data.showEnd && !this.data.showFail) {
        if (this.injectTimer) clearInterval(this.injectTimer);
        
        // 【修改点】：这里不要 spawnExplosion()，改为直接清空数组
        this.isRaining = false;
        this.particles = []; // 直接清空屏幕上的粒子，背景变纯黑
        
        // 停止注入时的持续震动
        this.stopInjectionVibration();
        
        // 失败：长震动 + 失败音效
        this.vibrateLong();
        this.playFailSound();
        
        this.setData({ 
          exploded: true, // 隐藏图形
          showFail: true,  // 显示失败红字
          showEnd: false,  // 确保不显示成功界面
          showFinishBtn: false // 确保不显示成功按钮
        });
        
        // 这里的false代表红色叉叉
        this.showIslandTip('蓝牙断开', false);
      } else if (!this.data.showFail) {
        // 如果不在注入过程中，且还没显示失败界面，只显示提示，不自动跳转
        this.showIslandTip('蓝牙已断开', false);
        // 不调用 restart()，让用户手动点击按钮
      }
    };

    this.ble.onError = (err) => {
      console.error('蓝牙错误:', err);
      this.showIslandTip('连接失败', false);
      // 连接失败时，保持加载界面显示，不跳转
      this.setData({ loaderFading: false });
    };

    // 初始化蓝牙适配器并开始扫描
    this.ble.initBluetoothAdapter()
      .then(() => { 
        this.ble.startScan();
        // 设置扫描超时（15秒）
        this.scanTimeout = setTimeout(() => {
          if (!this.data.targetDevice) {
            this.ble.stopScan();
            this.showIslandTip('未找到设备，请重试', false);
            this.setData({ loaderFading: false });
          }
        }, 15000);
      })
      .catch((err) => {
        console.error('蓝牙初始化失败:', err);
        this.showIslandTip('蓝牙初始化失败', false);
        this.setData({ loaderFading: false });
      });
  },

  handleConnect() {
    if (this.data.loaderFading) return;
    
    if (!this.data.targetDevice) {
      // 如果没有找到设备，重新开始扫描
      this.showIslandTip('重新搜索设备...', false);
      this.setData({ targetDevice: null });
      
      // 清除之前的超时
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }
      
      // 重新扫描
      this.ble.startScan();
      this.scanTimeout = setTimeout(() => {
        if (!this.data.targetDevice) {
          this.ble.stopScan();
          this.showIslandTip('未找到设备，请确保设备已开启', false);
        }
      }, 15000);
      return;
    }
    
    // 点击后先显示"正在连接中"的灵动岛，不要立即跳转画面
    this.showIslandTip('正在连接中...', false);
    // 不设置 loaderFading，等连接成功后再跳转
    this.ble.connectDevice(this.data.targetDevice).catch((err) => {
      console.error('连接失败:', err);
      this.showIslandTip('连接失败，请重试', false);
      // 连接失败后，清除设备，允许重新扫描
      this.setData({ targetDevice: null });
    });
  },

  showIslandTip(text, isSuccess) {
    this.setData({ islandState: 'active', connectSuccess: isSuccess, islandText: text });
    setTimeout(() => { this.setData({ islandState: '' }); }, 2500);
  },

  // 🔴 保存OTA连接记录到云端
  async saveOtaConnectionToCloud() {
    try {
      // 1. 获取用户openid
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      console.log('🔍 [saveOtaConnectionToCloud] 用户openid:', openid);
      
      // 2. 获取设备信息
      const device = this.data.targetDevice;
      if (!device) {
        console.warn('⚠️ [saveOtaConnectionToCloud] 设备信息不存在');
        return;
      }
      
      console.log('🔍 [saveOtaConnectionToCloud] 设备信息:', {
        deviceId: device.deviceId,
        deviceName: device.name
      });
      
      // 3. 先检查是否已存在记录（避免重复保存）
      const db = wx.cloud.database();
      const existingRes = await db.collection('ota_connections')
        .where({ 
          _openid: openid,
          deviceId: device.deviceId 
        })
        .get();
      
      if (existingRes.data.length > 0) {
        console.log('✅ [saveOtaConnectionToCloud] 记录已存在，跳过保存');
        return;
      }
      
      // 4. 保存到云端数据库
      // 🔴 注意：_openid 是系统自动生成的，不能手动设置
      const addRes = await db.collection('ota_connections').add({
        data: {
          deviceId: device.deviceId,
          deviceName: device.name || '未知设备',
          connectTime: db.serverDate(),
          // 可选：添加其他信息
          RSSI: device.RSSI || 0,
          advertisData: device.advertisData || ''
        }
      });
      
      console.log('✅ [saveOtaConnectionToCloud] OTA连接记录已保存到云端:', addRes._id);
    } catch (err) {
      console.error('❌ [saveOtaConnectionToCloud] 保存失败:', err);
      // 🔴 静默失败，不影响用户体验和后续流程
    }
  },

  // ================= 动画交互 =================
  nextDevice() { this.switchDev(1); },
  prevDevice() { this.switchDev(-1); },
  switchDev(dir) {
    let idx = this.data.currentDevIdx + dir;
    if(idx < 0) idx = this.data.devices.length - 1;
    if(idx >= this.data.devices.length) idx = 0;
    
    let svg = idx >= 2 ? iconF2Pro : iconF1Pro;
    this.setData({ currentDevIdx: idx, currentSvg: svg });
  },

  startInject() {
    // 开始注入：短震动
    this.vibrateShort();
    // 开始一次新的流程时重置保存标记
    this.setData({ hasSavedOtaRecord: false });
    
    // 开始持续高频震动
    this.startInjectionVibration();
    
    this.setData({ isInjecting: true });
    this.isRaining = true; 
    
    // 【修改点1】根据设备类型设置不同的初始值
    // F1系列（currentDevIdx < 2）：15%
    // F2系列（currentDevIdx >= 2）：30%（更快显示）
    let p = this.data.currentDevIdx >= 2 ? 30 : 15;
    
    // 【修改点2】时间改为 20000 (20秒)
    const duration = 20000; 
    const interval = 30;
    const step = 100 / (duration / interval);

    // 【修改点3】形状延迟100ms出现，延迟后立即显示初始值
    setTimeout(() => {
      // 延迟后立即设置初始值，让形状可见
      this.setData({ revealProgress: p });
      
      this.injectTimer = setInterval(() => {
        p += step; 
        if(p > 100) p = 100;
        
        this.setData({ revealProgress: p });
        
        if (p >= 100) {
          clearInterval(this.injectTimer);
          this.explode();
        }
      }, interval);
    }, 100);
  },

  explode() {
    // 停止注入时的持续震动
    this.stopInjectionVibration();
    
    // 成功：长震动 + 成功音效
    this.vibrateLong();
    this.playSuccessSound();
    
    this.isRaining = false;
    this.spawnExplosion();
    this.setData({ exploded: true });
    
    // 【修改点】：重置清场标记
    this.isFlushing = false;

    // 1. 爆炸1秒后，开启"加速飞离"模式
    setTimeout(() => {
      this.isFlushing = true; 
    }, 1200);

    // 2. 延长等待时间，确保粒子都飞出去了，再显示 MT (这里设为 2200ms 或 2500ms)
    setTimeout(() => {
      this.setData({ showEnd: true });
      setTimeout(() => { 
        this.setData({ showFinishBtn: true }); 
        // 动画完成且显示“升级完成”后再保存 OTA 记录
        if (!this.data.hasSavedOtaRecord) {
          this.saveOtaConnectionToCloud()
            .then(() => this.setData({ hasSavedOtaRecord: true }))
            .catch(err => console.error('保存OTA记录失败:', err));
        }
      }, 500);
    }, 2200); 
  },
  
  restart() {
    // 升级完成/失败后返回选择列表
    // 重置保存标记，防止下次流程被跳过
    this.setData({ hasSavedOtaRecord: false });
    const pages = getCurrentPages();
    const productsPageIndex = pages.findIndex(page => {
      const route = page.route || '';
      return route.includes('products/products');
    });
    
    if (productsPageIndex >= 0) {
      const delta = pages.length - 1 - productsPageIndex;
      wx.navigateBack({ delta: delta });
    } else {
      wx.redirectTo({ url: '/pages/products/products' });
    }
  },

  goBack() {
    const pages = getCurrentPages();
    const productsPageIndex = pages.findIndex(page => {
      const route = page.route || '';
      return route.includes('products/products');
    });
    
    if (productsPageIndex >= 0) {
      const delta = pages.length - 1 - productsPageIndex;
      wx.navigateBack({ delta: delta });
    } else if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: '/pages/products/products' });
    }
  },

  // ================= 粒子系统 =================
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#particleCanvas').fields({ node: true, size: true }).exec((res) => {
      if(!res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const dpr = info.pixelRatio;
      
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      this.canvas = canvas; this.ctx = ctx;
      this.w = res[0].width; this.h = res[0].height;
      this.particles = [];
      this.loop();
    });
  },

  loop() {
    if(!this.ctx) return;
    const ctx = this.ctx;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, this.w, this.h);
    
    if (this.isRaining) {
      for(let i=0; i<15; i++) {
        this.particles.push({
          x: this.w/2 + (Math.random()-0.5)*280, // 【关键】底部宽度280px（原来的2倍）
          y: this.h,
          vy: -(Math.random()*15 + 10), 
          h: Math.random()*40 + 20, 
          life: 1, type: 'rain'
        });
      }
    }

    // 如果已经显示MT，让所有粒子继续飞走，飞出屏幕后自动消失
    // 不立即清空，而是让它们自然飞走
    
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      if (p.type === 'rain') {
        p.y += p.vy;
        
        // 动态聚拢效果：底部宽度280px（2倍），顶部保持原来的宽度（约47px）
        // 计算粒子从底部到顶部的进度（0 = 底部，1 = 顶部）
        const hitOffsetF1 = 70;
        const hitOffsetF2 = 40;
        let currentOffset = this.data.currentDevIdx >= 2 ? hitOffsetF2 : hitOffsetF1;
        const topY = this.h/2 + currentOffset; // 顶部位置
        const bottomY = this.h; // 底部位置
        const progress = 1 - (p.y - topY) / (bottomY - topY); // 0=底部, 1=顶部
        const progressClamped = Math.max(0, Math.min(1, progress)); // 限制在0-1之间
        
        // 底部聚拢系数0.05（保持280px宽度），顶部聚拢系数0.25（让280px缩小到47px，保持顶部宽度不变）
        const gatherCoeff = 0.05 + progressClamped * 0.20; // 从0.05到0.25
        p.x += (this.w/2 - p.x) * gatherCoeff;
        
        // ============================================
        // 【在这里调整高度】F1和F2系列可以分别设置
        // 这里的数字越大，粒子消失得越早（越靠下）
        // 这里的数字越小，粒子消失得越晚（越靠上）
        // ============================================
        
        // 图形中心在 h/2，图形高度220的一半是110
        // 所以 h/2 + offset 是粒子消失的位置
        if(p.y < topY) p.life = 0; 
        
        ctx.globalAlpha = p.life * 0.7;
        ctx.fillRect(p.x, p.y, 2, p.h);
      } 
      else if (p.type === 'explode') {
        // 【修改点】：检测 isFlushing 标记，如果为 true，粒子疯狂加速
        if (this.isFlushing) {
          p.vx *= 1.15; // 加速系数，让粒子快速飞向边缘
          p.vy *= 1.15;
          p.life -= 0.005; // 飞离时减缓透明度衰减，确保看得到它们飞出去
        } else {
          // 正常爆炸阶段，自然衰减
          p.life -= 0.015;
        }
        
        p.x += p.vx; 
        p.y += p.vy;
        
        // 边界检查：飞出屏幕则销毁
        if (p.x < -50 || p.x > this.w + 50 || p.y < -50 || p.y > this.h + 50) {
          p.life = 0;
        }
        
        // 渲染
        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          ctx.fillRect(p.x, p.y, 4, 4);
        }
      }
      if (p.life <= 0) { this.particles.splice(i, 1); i--; }
    }
    this.canvasReq = this.canvas.requestAnimationFrame(() => this.loop());
  },

  spawnExplosion() {
    for(let i=0; i<300; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 20;
      this.particles.push({
        x: this.w/2, y: this.h/2,
        vx: Math.cos(a)*s, vy: Math.sin(a)*s,
        life: 1.5, type: 'explode'
      });
    }
  }
});