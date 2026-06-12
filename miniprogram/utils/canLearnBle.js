/**
 * MT-CAN-Learn BLE 通信（Nordic UART Service）
 */
const NUS_SERVICE = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const NUS_RX = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const NUS_TX = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';
const TARGET_NAME = 'MT-CAN-Learn';

function ab2str(buffer) {
  const arr = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return s;
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i) & 0xff;
  return buf;
}

class CanLearnBle {
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.deviceId = '';
    this.serviceId = NUS_SERVICE;
    this.rxId = NUS_RX;
    this.txId = NUS_TX;
    this._rxBuf = '';
    this._snapBuffers = { A: [], B: [], C: [] };
    this._currentStep = '';
  }

  _emit(type, payload) {
    if (this.hooks.onMessage) this.hooks.onMessage(type, payload);
  }

  _handleLine(line) {
    let msg = null;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      return;
    }
    const type = msg.type || '';
    if (type === 'snap_batch') {
      const step = msg.step || this._currentStep;
      if (step === 'A' || step === 'B' || step === 'C') {
        this._snapBuffers[step].push(msg);
      }
      this._emit('snap_batch', msg);
      return;
    }
    if (type === 'step_done') {
      const step = msg.step;
      if (step === 'A' || step === 'B' || step === 'C') {
        this._emit('snapshot', {
          step,
          batches: this._snapBuffers[step].slice(),
          meta: msg
        });
        this._snapBuffers[step] = [];
      } else if (step === 'D') {
        this._emit('rpm_deltas', msg);
      }
      this._emit('step_done', msg);
      return;
    }
    if (type === 'runtime') {
      this._emit('runtime', msg);
      return;
    }
    this._emit(type, msg);
  }

  _onValueChange(res) {
    this._rxBuf += ab2str(res.value);
    let idx;
    while ((idx = this._rxBuf.indexOf('\n')) >= 0) {
      const line = this._rxBuf.slice(0, idx).trim();
      this._rxBuf = this._rxBuf.slice(idx + 1);
      if (line) this._handleLine(line);
    }
  }

  openAdapter() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: resolve,
        fail: reject
      });
    });
  }

  scanAndConnect(timeoutMs = 12000) {
    return this.openAdapter().then(() => new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, arg) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        wx.stopBluetoothDevicesDiscovery({});
        fn(arg);
      };

      const timer = setTimeout(() => finish(reject, new Error('未找到 MT-CAN-Learn 设备')), timeoutMs);

      wx.onBluetoothDeviceFound((res) => {
        (res.devices || []).forEach((d) => {
          const name = d.name || d.localName || '';
          if (name.indexOf(TARGET_NAME) >= 0) {
            this.connect(d.deviceId).then((r) => finish(resolve, r)).catch((e) => finish(reject, e));
          }
        });
      });

      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: () => {},
        fail: (err) => finish(reject, err)
      });
    }));
  }

  connect(deviceId) {
    this.deviceId = deviceId;
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId,
        success: () => {
          wx.getBLEDeviceServices({
            deviceId,
            success: () => {
              wx.notifyBLECharacteristicValueChange({
                deviceId,
                serviceId: this.serviceId,
                characteristicId: this.txId,
                state: true,
                success: () => {
                  wx.onBLECharacteristicValueChange((res) => {
                    if (res.deviceId === deviceId) this._onValueChange(res);
                  });
                  resolve({ deviceId });
                },
                fail: reject
              });
            },
            fail: reject
          });
        },
        fail: reject
      });
    });
  }

  sendCommand(obj) {
    const line = JSON.stringify(obj) + '\n';
    return new Promise((resolve, reject) => {
      if (!this.deviceId) {
        reject(new Error('未连接'));
        return;
      }
      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.rxId,
        value: str2ab(line),
        success: resolve,
        fail: reject
      });
    });
  }

  startLearnStep(step) {
    this._currentStep = step;
    if (step === 'A' || step === 'B' || step === 'C') {
      this._snapBuffers[step] = [];
    }
    return this.sendCommand({ cmd: 'start_learn', step });
  }

  stopLearn() {
    return this.sendCommand({ cmd: 'stop_learn' });
  }

  setRuntime(config) {
    return this.sendCommand(Object.assign({ cmd: 'set_runtime' }, config));
  }

  stopRuntime() {
    return this.sendCommand({ cmd: 'stop_runtime' });
  }

  disconnect() {
    if (!this.deviceId) return Promise.resolve();
    const id = this.deviceId;
    this.deviceId = '';
    return new Promise((resolve) => {
      wx.closeBLEConnection({ deviceId: id, complete: resolve });
    });
  }
}

module.exports = {
  CanLearnBle,
  NUS_SERVICE,
  TARGET_NAME
};
