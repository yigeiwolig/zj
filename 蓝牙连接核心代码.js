// ==========================================
// 蓝牙连接核心代码（从 scan.js 提取）
// ==========================================

// ==========================================
// 1. BLEHelper 蓝牙工具类
// ==========================================
class BLEHelper {
  constructor(api = wx) {
    this.api = api; 
    this.bleList = [];
    this.hasConnected = false;
    this.isScanning = false;
    this.autoScanInterval = null;
    this.openTimer = null;
    this.openCandidate = null;
    
    // 设备信息
    this.device = null;
    this.serviceId = '';
    this.characteristicId = '';      // 用于接收数据
    this.characteristicId2 = '';    // 用于发送数据
    this.serviceIdf0 = '';
    this.characteristicId01 = '';    
    this.characteristicId02 = '';    
    
    // 回调函数
    this.onDeviceFound = null;       // 发现设备回调
    this.onConnecting = null;        // 连接中回调
    this.onConnected = null;         // 连接成功回调
    this.onDisconnected = null;      // 断开连接回调
    this.onDataReceived = null;      // 接收数据回调
    this.onError = null;             // 错误回调
  }

  // 初始化蓝牙适配器
  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      this.api.openBluetoothAdapter({
        success: (res) => {
          this.api.onBluetoothAdapterStateChange((res) => {
            console.log('蓝牙适配器状态变化', res);
          });
          resolve(res);
        },
        fail: (err) => {
          if (this.onError) this.onError(err);
          reject(err);
        }
      });
    });
  }

  // 开始扫描
  startScan(options = {}) {
    const { powerLevel = 'high', allowDuplicatesKey = true } = options;
    this.isScanning = true;
    this.hasConnected = false;
    this.bleList = [];

    this.api.startBluetoothDevicesDiscovery({
      powerLevel: powerLevel,
      allowDuplicatesKey: allowDuplicatesKey,
      success: (res) => {
        this.setupDeviceFoundListener();
      },
      fail: (err) => {
        this.isScanning = false;
        if (this.onError) this.onError(err);
      }
    });
  }

  // 停止扫描
  stopScan() {
    this.api.stopBluetoothDevicesDiscovery();
    this.isScanning = false;
    if (this.autoScanInterval) {
      clearInterval(this.autoScanInterval);
      this.autoScanInterval = null;
    }
  }

  // 设置设备发现监听器
  setupDeviceFoundListener() {
    this.api.onBluetoothDeviceFound((res) => {
      const device = res.devices[0];
      if (!device) return;

      const index = this.bleList.findIndex(item => item.deviceId === device.deviceId);
      if (index === -1) {
        this.bleList.push(device);
      } else {
        this.bleList.splice(index, 1, device);
      }
      
      if (this.onDeviceFound) {
        this.onDeviceFound(this.bleList);
      }

      // 自动连接逻辑：NB开头优先
      if (!this.hasConnected && device.name && device.name.startsWith('NB')) {
        if (this.openTimer) {
          clearTimeout(this.openTimer);
          this.openTimer = null;
        }
        this.hasConnected = true;
        // 设置连接中状态
        if (this.onConnecting) this.onConnecting();
        this.connectDevice(device); // 内部会stopScan
        return;
      }
    });
  }

  // 连接设备
  connectDevice(device) {
    this.stopScan();
    
    return new Promise((resolve, reject) => {
      this.api.createBLEConnection({
        deviceId: device.deviceId,
        success: (res) => {
          this.device = device;
          this.isScanning = false;
          
          setTimeout(() => {
            this.discoverServices().then(() => {
              if (this.onConnected) this.onConnected(device);
              resolve(device);
            }).catch(reject);
          }, 1500);
        },
        fail: (err) => {
          this.isScanning = false;
          if (this.onError) this.onError(err);
          reject(err);
        }
      });
    });
  }

  // 断开连接
  disconnect() {
    if (this.device) {
      this.api.closeBLEConnection({
        deviceId: this.device.deviceId,
        success: () => {
          this.device = null;
          this.hasConnected = false;
          if (this.onDisconnected) this.onDisconnected();
        }
      });
    }
  }

  // 发现服务
  discoverServices() {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('设备未连接'));
        return;
      }
      this.api.getBLEDeviceServices({
        deviceId: this.device.deviceId,
        success: (res) => {
          res.services.forEach(service => {
            const serviceUuid = service.uuid.toString().toUpperCase();
            if (serviceUuid.includes('FFF0')) {
              this.serviceId = service.uuid;
              this.discoverCharacteristics(this.serviceId).then(resolve).catch(reject);
            }
          });
          // 如果没有找到特定服务，也resolve以便不卡流程（视实际硬件而定）
          resolve(); 
        },
        fail: reject
      });
    });
  }

  // 发现特征值
  discoverCharacteristics(serviceId) {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('设备未连接'));
        return;
      }
      this.api.getBLEDeviceCharacteristics({
        deviceId: this.device.deviceId,
        serviceId: serviceId,
        success: (res) => {
          res.characteristics.forEach(char => {
            const charUuid = char.uuid.toUpperCase();
            if (charUuid.includes('FF1')) this.characteristicId = char.uuid;  // 接收
            if (charUuid.includes('FF2')) this.characteristicId2 = char.uuid; // 发送
          });
          if (serviceId === this.serviceId) {
            this.enableNotify().then(resolve).catch(reject);
          } else {
            resolve();
          }
        },
        fail: reject
      });
    });
  }

  // 启用通知（接收数据）
  enableNotify() {
    return new Promise((resolve, reject) => {
      if (!this.device || !this.serviceId || !this.characteristicId) {
        // 如果没有特征值，静默失败即可，不中断流程
        resolve(); 
        return;
      }
      this.api.notifyBLECharacteristicValueChange({
        state: true,
        deviceId: this.device.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.characteristicId,
        success: (res) => {
          // 监听数据接收
          this.api.onBLECharacteristicValueChange((res) => {
             if (this.onDataReceived) this.onDataReceived(res.value);
          });
          // 监听连接状态变化
          this.api.onBLEConnectionStateChange((res) => {
            if (res.deviceId === this.device.deviceId && !res.connected) {
              this.device = null;
              if (this.onDisconnected) this.onDisconnected();
            }
          });
          resolve(res);
        },
        fail: reject
      });
    });
  }
}

// ==========================================
// 2. 数据发送工具方法
// ==========================================

// 字符串转ArrayBuffer（UTF-8编码）
function stringToArrayBuffer(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6));
      bytes.push(0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(0xe0 | (charCode >> 12));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    } else {
      i++;
      const charCode2 = str.charCodeAt(i);
      const codePoint = 0x10000 + (((charCode & 0x3ff) << 10) | (charCode2 & 0x3ff));
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }
  }
  return new Uint8Array(bytes).buffer;
}

// 写入蓝牙数据
function writeBleData(bleHelper, arrayBuffer) {
  if (!bleHelper || !bleHelper.device || !bleHelper.characteristicId2) {
    console.log('❌ [蓝牙] 设备未连接或特征值未找到');
    return;
  }

  wx.writeBLECharacteristicValue({
    deviceId: bleHelper.device.deviceId,
    serviceId: bleHelper.serviceId,
    characteristicId: bleHelper.characteristicId2,
    value: arrayBuffer,
    success: (res) => {
      console.log('✅ [蓝牙] 发送成功:', res.errMsg);
    },
    fail: (err) => {
      console.log('❌ [蓝牙] 发送失败:', err.errMsg);
    }
  });
}

// 发送字符串数据
function sendData(bleHelper, text) {
  const arrayBuffer = stringToArrayBuffer(text);
  writeBleData(bleHelper, arrayBuffer);
}

// ==========================================
// 3. 使用示例（Page 中的调用方式）
// ==========================================

/*
// 在 Page 的 onLoad 中初始化
onLoad() {
  this.ble = new BLEHelper(wx);
  
  // 设置回调
  this.ble.onConnecting = () => {
    this.setData({ isConnecting: true });
  };
  
  this.ble.onConnected = (device) => {
    this.setData({ 
      isConnected: true,
      connectedDeviceName: device.name 
    });
  };
  
  this.ble.onDisconnected = () => {
    this.setData({ isConnected: false });
  };
  
  this.ble.onDataReceived = (value) => {
    // 处理接收到的数据
    console.log('收到数据:', value);
  };
  
  this.ble.onError = (err) => {
    console.error('蓝牙错误:', err);
  };
}

// 连接设备
handleConnect() {
  this.setData({ isScanning: true });
  
  this.ble.initBluetoothAdapter()
    .then(() => { 
      this.ble.startScan(); 
    })
    .catch((err) => {
      console.error("蓝牙初始化失败", err);
      this.setData({ isScanning: false });
    });
}

// 断开连接
handleDisconnect() {
  this.ble.disconnect();
}

// 发送数据
sendCommand(text) {
  sendData(this.ble, text);
}

// 页面卸载时清理
onUnload() {
  if (this.ble) this.ble.disconnect();
  wx.closeBluetoothAdapter();
}
*/

// ==========================================
// 核心流程总结：
// ==========================================
// 1. 初始化：new BLEHelper(wx)
// 2. 设置回调：onConnected, onDisconnected, onDataReceived 等
// 3. 初始化适配器：initBluetoothAdapter()
// 4. 开始扫描：startScan() - 自动连接 NB 开头的设备
// 5. 连接成功：自动发现服务和特征值，启用通知
// 6. 发送数据：sendData(bleHelper, '文本数据')
// 7. 接收数据：通过 onDataReceived 回调处理
// 8. 断开连接：disconnect()

