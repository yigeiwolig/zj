/**
 * 蓝牙绑定助手（从「我的」BLEHelper 抽出，供 device-bind-modal 等复用）
 */
const { isBlockedDebugBleDevice } = require('./blockedDebugBle.js');

class BLEHelper {
  constructor(wxApi) {
    this.wx = wxApi || wx;
    this.deviceId = null;
    this.serviceId = null;
    this.characteristicId = null;
    this.isConnected = false;
    this.isScanning = false;

    this.onConnecting = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
  }

  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      this.wx.openBluetoothAdapter({
        success: () => {
          resolve();
        },
        fail: (err) => {
          console.error('蓝牙适配器初始化失败', err);
          reject(err);
        }
      });
    });
  }

  startScan() {
    if (this.isScanning) return;

    this.isScanning = true;
    this.wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => {
        this.setupDeviceFoundListener();
      },
      fail: (err) => {
        console.error('扫描失败', err);
        this.isScanning = false;
        if (this.onError) this.onError(err);
      }
    });
  }

  stopScan() {
    if (!this.isScanning) return;

    this.wx.stopBluetoothDevicesDiscovery({
      success: () => {
        this.isScanning = false;
      }
    });
  }

  setupDeviceFoundListener() {
    this.wx.onBluetoothDeviceFound((res) => {
      const devices = res.devices || [];

      const targetDevice = devices.find((device) => {
        const name = device.name || device.localName || '';
        return name.toUpperCase().startsWith('NB') && !isBlockedDebugBleDevice(device);
      });

      if (targetDevice) {
        this.stopScan();
        this.connectDevice(targetDevice);
      }
    });
  }

  connectDevice(device) {
    if (isBlockedDebugBleDevice(device)) {
      console.warn('[bind BLE] skip blocked debug device', device && (device.name || device.localName));
      return;
    }
    if (this.onConnecting) this.onConnecting();

    this.deviceId = device.deviceId;

    this.wx.createBLEConnection({
      deviceId: this.deviceId,
      success: () => {
        this.isConnected = true;
        if (this.onConnected) this.onConnected(device);
      },
      fail: (err) => {
        console.error('连接失败', err);
        this.isConnected = false;
        if (this.onError) this.onError(err);
      }
    });

    this.wx.onBLEConnectionStateChange((res) => {
      if (!res.connected) {
        this.isConnected = false;
        if (this.onDisconnected) this.onDisconnected();
      }
    });
  }

  disconnect() {
    if (!this.deviceId || !this.isConnected) return;

    this.wx.closeBLEConnection({
      deviceId: this.deviceId,
      success: () => {
        this.isConnected = false;
        this.deviceId = null;
      }
    });
  }
}

module.exports = {
  BLEHelper
};
