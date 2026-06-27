/**
 * MT-CAN-Stream BLE — 仅接收 CAN 流，不做解析
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

function uuidMatches(uuid, needle) {
  return String(uuid || '').replace(/-/g, '').toLowerCase().indexOf(needle) >= 0;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFrame(raw) {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const dlc = Math.min(Number(raw.dlc || (raw.d && raw.d.length) || 8), 8);
  const data = (raw.d || raw.data || []).slice(0, 8).map((b) => Number(b) & 0xff);
  while (data.length < 8) data.push(0);
  return { id, dlc, data, ts: Date.now() };
}

/** 紧凑格式：544|8,144,2,16,0,40,8,0 */
function parseCanTxtLine(s) {
  const str = String(s || '').trim();
  const pipe = str.indexOf('|');
  if (pipe < 0) return null;
  const id = Number(str.slice(0, pipe));
  if (!Number.isFinite(id)) return null;
  const parts = str.slice(pipe + 1).split(',');
  const data = [];
  for (let i = 0; i < 8; i++) {
    data.push(i < parts.length && parts[i] !== '' ? Number(parts[i]) & 0xff : 0);
  }
  const dlc = Math.min(Math.max(parts.length, 0), 8) || 8;
  return { id, dlc, data, d: data, ts: Date.now() };
}

class CanStreamBle {
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.deviceId = '';
    this.serviceId = '';
    this.rxId = '';
    this.txId = '';
    this._rxBuf = '';
    this._connected = false;
    this._connecting = false;
    this._notifyReady = false;
    this._frameListeners = [];
    this._stats = { total: 0, lastSec: 0 };
    this._lastStatMs = Date.now();
    /** 微信 BLE 默认单次最多 20 字节；协商 MTU 后可加大 */
    this._writeChunkSize = 20;
    this._writeChain = Promise.resolve();
    this._writeNoResponse = false;
    this._writeWithResponse = true;
  }

  _clearWaitQueue(err) {
    const q = this._waitQueue || [];
    this._waitQueue = [];
    q.forEach((w) => {
      clearTimeout(w.timer);
      w.reject(err || new Error('蓝牙已断开'));
    });
  }

  _rejectWriteChain(err) {
    this._writeChain = Promise.reject(err);
    this._writeChain.catch(() => {});
  }

  isConnected() {
    return !!(this._connected && this.deviceId && this.rxId);
  }

  /** GATT 已发现 RX/TX，但 ping 握手可能尚未完成 */
  _isGattReady() {
    return !!(this.deviceId && this.serviceId && this.rxId && this.txId);
  }

  _deviceMatchesTarget(d) {
    if (!d || !d.deviceId) return false;
    const name = d.name || d.localName || '';
    if (name.indexOf(TARGET_NAME) >= 0) return true;
    const uuids = d.advertisServiceUUIDs || d.serviceUUIDs || [];
    return uuids.some((u) => uuidMatches(u, '6e400001'));
  }

  onFrame(fn) {
    if (typeof fn === 'function') this._frameListeners.push(fn);
  }

  offFrame(fn) {
    this._frameListeners = this._frameListeners.filter((f) => f !== fn);
  }

  _emitFrames(frames) {
    (frames || []).forEach((raw) => {
      const f = normalizeFrame(raw);
      if (!f) return;
      this._stats.total += 1;
      this._frameListeners.forEach((fn) => {
        try { fn(f); } catch (e) { /* ignore */ }
      });
    });
    const now = Date.now();
    if (now - this._lastStatMs >= 1000) {
      this._stats.lastSec = this._stats.total;
      this._stats.total = 0;
      this._lastStatMs = now;
      if (this.hooks.onStats) this.hooks.onStats({ fps: this._stats.lastSec });
    }
  }

  _handleLine(line) {
    let msg = null;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      console.warn('[CanStream] bad json', line.slice(0, 80));
      return;
    }
    const type = msg.type || '';
    if (type === 'can_batch' && Array.isArray(msg.frames)) {
      this._emitFrames(msg.frames);
      if (this.hooks.onMessage) this.hooks.onMessage(type, msg);
      return;
    }
    if (type === 'can_txt' && Array.isArray(msg.lines)) {
      const frames = msg.lines.map(parseCanTxtLine).filter(Boolean);
      this._emitFrames(frames);
      if (this.hooks.onMessage) this.hooks.onMessage(type, msg);
      return;
    }
    if (type === 'can_monitor') {
      return;
    }
    if (type === 'can') {
      this._emitFrames([msg]);
      if (this.hooks.onMessage) this.hooks.onMessage(type, msg);
      return;
    }
    if (this.hooks.onMessage) this.hooks.onMessage(type, msg);
    if (this._waitQueue && this._waitQueue.length) {
      for (let i = this._waitQueue.length - 1; i >= 0; i--) {
        const w = this._waitQueue[i];
        if (w.type === type) {
          clearTimeout(w.timer);
          this._waitQueue.splice(i, 1);
          w.resolve(msg);
        }
      }
    }
  }

  _onValueChange(res) {
    if (res.deviceId !== this.deviceId) return;
    this._rxBuf += ab2str(res.value);
    if (this._rxBuf.length > 65536) {
      const cut = this._rxBuf.lastIndexOf('\n', this._rxBuf.length - 8192);
      this._rxBuf = cut >= 0 ? this._rxBuf.slice(cut + 1) : this._rxBuf.slice(-4096);
    }
    let idx;
    while ((idx = this._rxBuf.indexOf('\n')) >= 0) {
      const line = this._rxBuf.slice(0, idx).trim();
      this._rxBuf = this._rxBuf.slice(idx + 1);
      if (line) this._handleLine(line);
    }
  }

  _negotiateMtu(deviceId) {
    return new Promise((resolve) => {
      if (typeof wx.setBLEMTU !== 'function') {
        this._writeChunkSize = 20;
        resolve(20);
        return;
      }
      wx.setBLEMTU({
        deviceId,
        mtu: 512,
        success: (res) => {
          const mtu = Number(res.mtu) || 512;
          this._writeChunkSize = Math.min(Math.max(20, mtu - 3), 509);
          console.log('[CanStream] MTU', mtu, 'chunk', this._writeChunkSize);
          resolve(this._writeChunkSize);
        },
        fail: () => {
          this._writeChunkSize = 20;
          resolve(20);
        }
      });
    });
  }

  /** 按 MTU 分包写入 NUS RX；长 JSON（set_runtime）需排队 + 重试 */
  _writeBytesOnce(buffer, offset, chunkSize, writeType) {
    const view = new Uint8Array(buffer);
    if (offset >= view.length) return Promise.resolve();
    const end = Math.min(offset + chunkSize, view.length);
    const chunk = view.subarray(offset, end);
    const gapMs = chunkSize <= 20 ? (view.length > 120 ? 55 : 45) : 28;
    const ab = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
    return new Promise((resolve, reject) => {
      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.rxId,
        value: ab,
        writeType,
        success: resolve,
        fail: (err) => reject(new Error((err && err.errMsg) || '写入失败'))
      });
    }).then(() => {
      if (end < view.length) {
        return delay(gapMs).then(() => this._writeBytesOnce(buffer, end, chunkSize, writeType));
      }
      return delay(30);
    });
  }

  _writeBytesWithRetry(buffer, attempt = 0, forceWriteType) {
    const chunkSize = this._writeChunkSize || 20;
    const longPayload = buffer.byteLength > chunkSize;
    let writeType = forceWriteType;
    if (!writeType) {
      writeType = longPayload && this._writeWithResponse ? 'write' : 'writeNoResponse';
      if (!this._writeNoResponse && this._writeWithResponse) writeType = 'write';
    }
    return this._writeBytesOnce(buffer, 0, chunkSize, writeType).catch((err) => {
      if (attempt >= 3) throw err;
      const alt = writeType === 'write' ? 'writeNoResponse' : 'write';
      let nextType = alt;
      if (alt === 'write' && !this._writeWithResponse) nextType = 'writeNoResponse';
      if (alt === 'writeNoResponse' && !this._writeNoResponse) nextType = 'write';
      return delay(150 * (attempt + 1)).then(() => (
        this._writeBytesWithRetry(buffer, attempt + 1, nextType)
      ));
    });
  }

  _dropWaitForType(type) {
    if (!this._waitQueue || !this._waitQueue.length) return;
    this._waitQueue = this._waitQueue.filter((w) => {
      if (w.type === type) {
        clearTimeout(w.timer);
        return false;
      }
      return true;
    });
  }

  /** 写入长 JSON 前稍等，避免与设备 runtime 遥测抢 BLE 带宽 */
  prepareForWrite() {
    return delay(this._connected ? 450 : 200);
  }

  async _pingWithRetry(tries = 4) {
    let lastErr = null;
    for (let i = 0; i < tries; i++) {
      try {
        this._dropWaitForType('pong');
        const waitPong = this.waitForMessage('pong', 10000);
        await this._sendCommandRaw({ cmd: 'ping' }, true);
        return await waitPong;
      } catch (err) {
        lastErr = err;
        if (i < tries - 1) await delay(500 + i * 400);
      }
    }
    throw lastErr || new Error('设备无响应');
  }

  async sendCommandWithAck(buildPayload, ackType, timeoutMs = 20000, retries = 3) {
    let lastErr = null;
    for (let i = 0; i < retries; i++) {
      try {
        if (i > 0) {
          this._dropWaitForType(ackType);
          await delay(600 + i * 500);
          if (!this.isConnected()) throw new Error('蓝牙已断开');
        }
        await this.prepareForWrite();
        const waitP = this.waitForMessage(ackType, timeoutMs);
        await this.sendCommand(typeof buildPayload === 'function' ? buildPayload() : buildPayload);
        const ack = await waitP;
        return ack;
      } catch (err) {
        lastErr = err;
        console.warn(`[CanStream] ${ackType} attempt ${i + 1}/${retries} fail`, err);
      }
    }
    throw lastErr || new Error('写入失败');
  }

  _writeBytes(buffer) {
    if (!this.deviceId || !this.rxId) {
      return Promise.reject(new Error('未连接'));
    }
    const run = () => {
      if (!this.deviceId || !this.rxId) {
        return Promise.reject(new Error('未连接'));
      }
      return this._writeBytesWithRetry(buffer, 0, 'write');
    };
    this._writeChain = this._writeChain.then(run, run);
    return this._writeChain;
  }

  openAdapter() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: resolve,
        fail: (err) => reject(new Error((err && err.errMsg) || '请打开蓝牙'))
      });
    });
  }

  scanAndConnect(timeoutMs = 20000) {
    if (this.isConnected()) return Promise.resolve({ deviceId: this.deviceId });
    const startScan = () => {
      if (this._connecting) return Promise.reject(new Error('正在连接中'));
      return this.openAdapter()
        .then(() => new Promise((resolve) => {
          wx.stopBluetoothDevicesDiscovery({ complete: () => resolve() });
        }))
        .then(() => this._scanAndConnectInner(timeoutMs));
    };
    if (this.deviceId) {
      return this.disconnect()
        .catch(() => {})
        .then(() => delay(350))
        .then(startScan);
    }
    return startScan();
  }

  _scanAndConnectInner(timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const onFound = (res) => {
        (res.devices || []).forEach((d) => {
          if (this._deviceMatchesTarget(d) && !this._connecting && !done) {
            this._connecting = true;
            wx.stopBluetoothDevicesDiscovery({});
            const label = d.name || d.localName || d.deviceId;
            console.log('[CanStream] 发现设备', label);
            this.connect(d.deviceId).then((r) => finish(resolve, r)).catch((e) => finish(reject, e));
          }
        });
      };
      const finish = (fn, arg) => {
        if (done) return;
        done = true;
        this._connecting = false;
        clearTimeout(timer);
        wx.stopBluetoothDevicesDiscovery({});
        if (typeof wx.offBluetoothDeviceFound === 'function') {
          wx.offBluetoothDeviceFound(onFound);
        }
        fn(arg);
      };
      const timer = setTimeout(() => finish(reject, new Error('未找到 MT-CAN-Learn，请确认设备已上电且在附近')), timeoutMs);
      wx.onBluetoothDeviceFound(onFound);
      const startScan = (withServiceFilter) => {
        wx.startBluetoothDevicesDiscovery({
          allowDuplicatesKey: true,
          powerLevel: 'high',
          services: withServiceFilter ? [NUS_SERVICE] : [],
          success: () => {},
          fail: (err) => {
            if (withServiceFilter) {
              startScan(false);
              return;
            }
            finish(reject, new Error((err && err.errMsg) || '无法开始蓝牙扫描'));
          }
        });
      };
      startScan(true);
    });
  }

  _discoverNusWithRetry(deviceId, tries = 4) {
    const attempt = (n) => this._discoverNus(deviceId).catch((err) => {
      if (n >= tries - 1) throw err;
      return delay(350 * (n + 1)).then(() => attempt(n + 1));
    });
    return attempt(0);
  }

  _discoverNus(deviceId) {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId,
        success: (res) => {
          const svc = (res.services || []).find((s) => uuidMatches(s.uuid, '6e400001'));
          if (!svc) { reject(new Error('未找到 NUS')); return; }
          this.serviceId = svc.uuid;
          wx.getBLEDeviceCharacteristics({
            deviceId,
            serviceId: this.serviceId,
            success: (cres) => {
              const chars = cres.characteristics || [];
              const rx = chars.find((c) => uuidMatches(c.uuid, '6e400002'));
              const tx = chars.find((c) => uuidMatches(c.uuid, '6e400003'));
              if (!rx || !tx) { reject(new Error('未找到 RX/TX')); return; }
              this.rxId = rx.uuid;
              this.txId = tx.uuid;
              const props = rx.properties || {};
              this._writeNoResponse = !!(props.writeNoResponse || props.writeWithoutResponse);
              this._writeWithResponse = !!props.write;
              resolve();
            },
            fail: (err) => reject(new Error(err.errMsg || '读特征失败'))
          });
        },
        fail: (err) => reject(new Error(err.errMsg || '读服务失败'))
      });
    });
  }

  _enableNotify(deviceId) {
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
                this._clearWaitQueue(new Error('蓝牙已断开'));
                this._rejectWriteChain(new Error('蓝牙已断开'));
                this._writeChain = Promise.resolve();
                this.deviceId = '';
                this.serviceId = '';
                this.rxId = '';
                this.txId = '';
                if (this.hooks.onDisconnected) this.hooks.onDisconnected();
              }
            });
          }
          this._notifyReady = true;
          resolve();
        },
        fail: (err) => reject(new Error(err.errMsg || 'notify 失败'))
      });
    });
  }

  connect(deviceId) {
    this._connected = false;
    this._writeChain = Promise.resolve();
    this.deviceId = deviceId;
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId,
        timeout: 20000,
        success: () => delay(1200)
          .then(() => this._discoverNusWithRetry(deviceId))
          .then(() => this._enableNotify(deviceId))
          .then(() => this._negotiateMtu(deviceId))
          .then(() => this._pingWithRetry(4))
          .then((msg) => {
            this._connected = true;
            const mode = (msg && msg.mode) || 'stream';
            if (mode === 'runtime') {
              return delay(400).then(() => ({
                deviceId,
                mode,
                profile: (msg && msg.profile) || 'wuji'
              }));
            }
            return {
              deviceId,
              mode,
              profile: (msg && msg.profile) || 'wuji'
            };
          })
          .then((result) => resolve(result))
          .catch((err) => {
            this._connected = false;
            this.deviceId = '';
            this.serviceId = '';
            this.rxId = '';
            this.txId = '';
            wx.closeBLEConnection({ deviceId, complete: () => {} });
            reject(err);
          }),
        fail: (err) => {
          this.deviceId = '';
          reject(new Error(err.errMsg || '连接失败'));
        }
      });
    });
  }

  /** 握手阶段也可写（不依赖 _connected） */
  _sendCommandRaw(obj, quiet) {
    const line = JSON.stringify(obj) + '\n';
    return new Promise((resolve, reject) => {
      if (!this._isGattReady()) {
        reject(new Error('蓝牙未就绪'));
        return;
      }
      if (!quiet) console.log('[CanStream TX]', line.trim(), `(${line.length}B)`);
      this._writeBytes(str2ab(line)).then(resolve).catch(reject);
    });
  }

  sendCommand(obj, quiet) {
    const line = JSON.stringify(obj) + '\n';
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('未连接'));
        return;
      }
      if (!quiet) console.log('[CanStream TX]', line.trim(), `(${line.length}B)`);
      this._writeBytes(str2ab(line)).then(resolve).catch(reject);
    });
  }

  setRuntime(config) {
    if (!config) return Promise.reject(new Error('配置为空'));
    const payload = { cmd: 'set_runtime', ...config };
    return this.sendCommandWithAck(payload, 'runtime_configured', 30000, 3);
  }

  getRuntime() {
    return this.sendCommandWithAck({ cmd: 'get_runtime' }, 'runtime_config', 12000, 2);
  }

  updateRpmCalibration(cal) {
    const payload = { cmd: 'update_rpm_calibration', ...cal };
    return this.sendCommandWithAck(payload, 'rpm_calibration_updated', 20000, 3);
  }

  setLedCount(numLeds) {
    const n = Math.round(Number(numLeds));
    if (!Number.isFinite(n) || n < 1) {
      return Promise.reject(new Error('灯珠数量无效'));
    }
    return this.sendCommandWithAck({ cmd: 'set_led_count', num_leds: n }, 'led_count_set', 12000, 2);
  }

  resetStream() {
    return this.sendCommand({ cmd: 'reset_stream' });
  }

  reprobeCan() {
    return this.sendCommand({ cmd: 'reprobe_can' });
  }

  setVehicleProfile(profile) {
    const p = profile === 'cfmoto' ? 'cfmoto' : 'wuji';
    return this.sendCommand({ cmd: 'set_vehicle_profile', profile: p });
  }

  getVehicleProfile() {
    const waitP = this.waitForMessage('vehicle_profile', 8000);
    return this.sendCommand({ cmd: 'get_vehicle_profile' }).then(() => waitP);
  }

  waitForMessage(type, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const entry = { type, resolve, reject };
      if (!this._waitQueue) this._waitQueue = [];
      this._waitQueue.push(entry);
      entry.timer = setTimeout(() => {
        const idx = this._waitQueue.indexOf(entry);
        if (idx >= 0) this._waitQueue.splice(idx, 1);
        reject(new Error('等待设备响应超时'));
      }, timeoutMs);
    });
  }

  disconnect() {
    if (!this.deviceId) return Promise.resolve();
    const id = this.deviceId;
    this._clearWaitQueue(new Error('已断开'));
    this.deviceId = '';
    this.serviceId = '';
    this.rxId = '';
    this.txId = '';
    this._connected = false;
    this._notifyReady = false;
    this._writeChain = Promise.resolve();
    return new Promise((resolve) => wx.closeBLEConnection({ deviceId: id, complete: resolve }));
  }
}

/** 录制指定时长内的 CAN 帧 */
function recordFrames(ble, durationMs = 3000) {
  const frames = [];
  const handler = (f) => frames.push(f);
  ble.onFrame(handler);
  return new Promise((resolve) => {
    setTimeout(() => {
      ble.offFrame(handler);
      resolve(frames.slice());
    }, durationMs);
  });
}

/** 手动停止的 CAN 录制（用于转速校准等） */
function startManualRecord(ble) {
  const frames = [];
  const handler = (f) => frames.push(f);
  ble.onFrame(handler);
  return {
    stop() {
      ble.offFrame(handler);
      return frames.slice();
    },
    snapshot() {
      return frames.slice();
    },
    get count() {
      return frames.length;
    }
  };
}

module.exports = {
  CanStreamBle,
  recordFrames,
  startManualRecord,
  parseCanTxtLine,
  TARGET_NAME
};
