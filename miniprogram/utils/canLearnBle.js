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

function uuidCompact(uuid) {
  return String(uuid || '').replace(/-/g, '').toLowerCase();
}

function uuidMatches(uuid, needle) {
  return uuidCompact(uuid).indexOf(needle) >= 0;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wxErrMsg(err, fallback) {
  if (!err) return fallback || '未知错误';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.errMsg) return err.errMsg;
  return fallback || '未知错误';
}

function hexIdNum(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return String(id);
  return '0x' + n.toString(16).toUpperCase();
}

function dataHex(data) {
  return (data || []).map((b) => ('0' + (Number(b) & 0xff).toString(16)).slice(-2)).join(' ');
}

class CanLearnBle {
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.deviceId = '';
    this.serviceId = '';
    this.rxId = '';
    this.txId = '';
    this._rxBuf = '';
    this._snapBuffers = { A: [], B: [], C: [] };
    this._rpmTops = [];
    this._currentStep = '';
    this._connected = false;
    this._connecting = false;
    this._notifyReady = false;
    this._log = hooks.onLog || null;
    this._debug = hooks.debug !== false;
    this._lastRuntimeLogMs = 0;
  }

  _debugPrint(msg) {
    if (!this._debug || !msg) return;
    const type = msg.type || '';
    if (type === 'live') {
      const now = Date.now();
      console.log('[CAN-Learn][live]', {
        canCount: msg.canCount,
        gear: msg.gear,
        gearLabel: msg.gearLabel,
        gearRaw: msg.gearRaw,
        rpm: msg.rpm,
        rpmRaw: msg.rpmRaw,
        maxDelta: msg.maxDelta,
        revLearning: msg.revLearning
      });
      return;
    }
    if (type === 'runtime') {
      const now = Date.now();
      if (now - this._lastRuntimeLogMs < 400) return;
      this._lastRuntimeLogMs = now;
      console.log('[CAN-Learn][runtime]', {
        gear: msg.gear,
        gearLabel: msg.gearLabel,
        rpm: msg.rpm,
        rpmRaw: msg.rpmRaw,
        ledCount: msg.ledCount
      });
      return;
    }
    if (type === 'snap_batch') {
      const frames = (msg.frames || []).map((f) => ({
        id: hexIdNum(f.id),
        data: f.data,
        dataHex: dataHex(f.data),
        noise: f.noise
      }));
      console.log('[CAN-Learn][snap_batch]', { step: msg.step, count: frames.length, frames });
      return;
    }
    if (type === 'rpm_top') {
      console.log('[CAN-Learn][rpm_top]', msg);
      return;
    }
    if (type === 'pong') return;
    console.log('[CAN-Learn][' + type + ']', msg);
  }

  _logLine(msg, force) {
    if (!force && (msg.indexOf('"type":"live"') >= 0 || msg.indexOf('"type":"pong"') >= 0)) return;
    if (this._log) this._log(msg);
    console.log('[CanLearnBle]', msg);
  }

  _emit(type, payload) {
    if (this.hooks.onMessage) this.hooks.onMessage(type, payload);
  }

  _handleLine(line) {
    let msg = null;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      this._logLine('非 JSON 行: ' + line.slice(0, 80), true);
      return;
    }
    const type = msg.type || '';
    this._debugPrint(msg);
    if (type === 'snap_batch') {
      const step = msg.step || this._currentStep;
      if (step === 'A' || step === 'B' || step === 'C') {
        this._snapBuffers[step].push(msg);
      }
      this._emit('snap_batch', msg);
      return;
    }
    if (type === 'rpm_top') {
      if (!this._rpmTops) this._rpmTops = [];
      this._rpmTops.push(msg);
      this._emit('rpm_top', msg);
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
        const tops = (this._rpmTops || []).slice();
        this._logLine('RX step_done D tops=' + tops.length, true);
        this._emit('rpm_deltas', { step: 'D', tops, count: msg.count || tops.length, meta: msg });
        this._rpmTops = [];
      }
      this._emit('step_done', msg);
      return;
    }
    if (type === 'gear_value') {
      this._emit('gear_value', msg);
      return;
    }
    if (type === 'gear_base_set') {
      this._emit('gear_base_set', msg);
      return;
    }
    if (type === 'runtime') {
      this._emit('runtime', msg);
      return;
    }
    this._emit(type, msg);
  }

  _onValueChange(res) {
    if (res.deviceId !== this.deviceId) return;
    this._rxBuf += ab2str(res.value);
    let idx;
    while ((idx = this._rxBuf.indexOf('\n')) >= 0) {
      const line = this._rxBuf.slice(0, idx).trim();
      this._rxBuf = this._rxBuf.slice(idx + 1);
      if (line) {
        this._logLine('RX: ' + line.slice(0, 120));
        this._handleLine(line);
      }
    }
  }

  openAdapter() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: resolve,
        fail: (err) => reject(new Error(wxErrMsg(err, '请打开手机蓝牙并授权小程序使用蓝牙')))
      });
    });
  }

  scanAndConnect(timeoutMs = 15000) {
    if (this._connected && this.deviceId) {
      return Promise.resolve({ deviceId: this.deviceId });
    }
    if (this._connecting) {
      return Promise.reject(new Error('正在连接中，请稍候'));
    }

    return this.openAdapter().then(() => new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, arg) => {
        if (done) return;
        done = true;
        this._connecting = false;
        clearTimeout(timer);
        wx.stopBluetoothDevicesDiscovery({});
        fn(arg);
      };

      const timer = setTimeout(() => finish(reject, new Error('未找到 MT-CAN-Learn，请确认设备已上电')), timeoutMs);

      const onFound = (res) => {
        if (done || this._connecting) return;
        (res.devices || []).forEach((d) => {
          if (done || this._connecting) return;
          const name = d.name || d.localName || '';
          if (name.indexOf(TARGET_NAME) >= 0) {
            this._connecting = true;
            wx.stopBluetoothDevicesDiscovery({});
            this._logLine('发现设备: ' + name, true);
            this.connect(d.deviceId).then((r) => finish(resolve, r)).catch((e) => finish(reject, e));
          }
        });
      };

      wx.onBluetoothDeviceFound(onFound);

      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        powerLevel: 'high',
        success: () => this._logLine('开始扫描…', true),
        fail: (err) => finish(reject, new Error(wxErrMsg(err, '无法开始蓝牙扫描')))
      });
    }));
  }

  _discoverNus(deviceId) {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId,
        success: (res) => {
          const svc = (res.services || []).find((s) => uuidMatches(s.uuid, '6e400001'));
          if (!svc) {
            reject(new Error('未找到 NUS 服务'));
            return;
          }
          this.serviceId = svc.uuid;
          wx.getBLEDeviceCharacteristics({
            deviceId,
            serviceId: this.serviceId,
            success: (cres) => {
              const chars = cres.characteristics || [];
              const rx = chars.find((c) => uuidMatches(c.uuid, '6e400002'));
              const tx = chars.find((c) => uuidMatches(c.uuid, '6e400003'));
              if (!rx || !tx) {
                reject(new Error('未找到 RX/TX 特征值'));
                return;
              }
              this.rxId = rx.uuid;
              this.txId = tx.uuid;
              this._logLine('NUS 就绪 RX/TX', true);
              resolve();
            },
            fail: (err) => reject(new Error(wxErrMsg(err, '读取特征值失败')))
          });
        },
        fail: (err) => reject(new Error(wxErrMsg(err, '读取服务失败')))
      });
    });
  }

  _enableNotify(deviceId) {
    if (this._notifyReady && this.deviceId === deviceId) return Promise.resolve();
    return new Promise((resolve, reject) => {
      wx.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId: this.serviceId,
        characteristicId: this.txId,
        state: true,
        success: () => {
          if (!this._notifyBound) {
            this._notifyBound = true;
            wx.onBLECharacteristicValueChange((res) => this._onValueChange(res));
            wx.onBLEConnectionStateChange((res) => {
              if (res.deviceId === this.deviceId && !res.connected) {
                this._connected = false;
                this._notifyReady = false;
                this.deviceId = '';
                this._logLine('连接已断开', true);
                if (this.hooks.onDisconnected) this.hooks.onDisconnected();
              }
            });
          }
          this._notifyReady = true;
          resolve();
        },
        fail: (err) => reject(new Error(wxErrMsg(err, '开启 notify 失败')))
      });
    });
  }

  _verifyPing() {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('设备无响应（ping 超时）'));
      }, 5000);
      const prev = this.hooks.onMessage;
      this.hooks.onMessage = (type, payload) => {
        if (type === 'pong' && !settled) {
          settled = true;
          clearTimeout(timer);
          this.hooks.onMessage = prev;
          this._logLine('ping/pong 成功', true);
          resolve();
        } else if (prev) {
          prev(type, payload);
        } else {
          this._emit(type, payload);
        }
      };
      this.sendCommand({ cmd: 'ping' }, true).catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.hooks.onMessage = prev;
        reject(new Error(wxErrMsg(err, '发送 ping 失败')));
      });
    });
  }

  connect(deviceId) {
    if (this._connected && this.deviceId === deviceId) {
      return Promise.resolve({ deviceId });
    }
    this.deviceId = deviceId;
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId,
        timeout: 20000,
        success: () => {
          this._logLine('GATT 已连接', true);
          delay(1500)
            .then(() => this._discoverNus(deviceId))
            .then(() => this._enableNotify(deviceId))
            .then(() => {
              this._connected = true;
              return this._verifyPing();
            })
            .then(() => resolve({ deviceId }))
            .catch((err) => {
              wx.closeBLEConnection({ deviceId, complete: () => {} });
              this.deviceId = '';
              this._connected = false;
              this._notifyReady = false;
              reject(err);
            });
        },
        fail: (err) => reject(new Error(wxErrMsg(err, '蓝牙连接失败')))
      });
    });
  }

  sendCommand(obj, quiet) {
    const line = JSON.stringify(obj) + '\n';
    return new Promise((resolve, reject) => {
      if (!this.deviceId || !this.rxId) {
        reject(new Error('未连接'));
        return;
      }
      if (!quiet) this._logLine('TX: ' + line.trim(), true);
      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.rxId,
        value: str2ab(line),
        success: resolve,
        fail: (err) => reject(new Error(wxErrMsg(err, '写入失败')))
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
    if (this._stopLearnPending) return Promise.resolve();
    this._stopLearnPending = true;
    return this.sendCommand({ cmd: 'stop_learn' }).finally(() => {
      setTimeout(() => { this._stopLearnPending = false; }, 800);
    });
  }

  setGearBase(config) {
    return this.sendCommand({ cmd: 'set_gear_base', ...config });
  }

  setRuntime(config) {
    return this.sendCommand({ cmd: 'set_runtime', ...config });
  }

  stopRuntime() {
    return this.sendCommand({ cmd: 'stop_runtime' });
  }

  disconnect() {
    if (!this.deviceId) return Promise.resolve();
    const id = this.deviceId;
    this.deviceId = '';
    this._connected = false;
    this._notifyReady = false;
    this._connecting = false;
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
