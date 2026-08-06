const { CanStreamBle, recordFrames } = require('../../../utils/canStreamBle.js');
const {
  formatFrameLine,
  formatFramesText,
  analyzeFramesStable,
  analyzeGearCrossSteps,
  gearFormPatchFromCandidate,
  isObdDiagnosticFrameId,
  filterFramesForLearning,
  GEAR_CROSS_STEP_DEFS
} = require('../../../utils/canFrameFormat.js');
const { analyzeRpmFromFrames, rpmFormPatchFromCandidate } = require('../../../utils/canRpmAnalysis.js');
const {
  buildRuntimeConfig,
  buildRuntimePayload,
  recalcRpmCalibration,
  buildRpmCalibrationPayload,
  rawToLedCount,
  DEFAULT_INPUT_IDLE,
  DEFAULT_INPUT_REDLINE,
  DEFAULT_NUM_LEDS,
  MAX_NUM_LEDS,
  RPM_CALIB_TARGET,
  loadStoredNumLeds,
  saveStoredNumLeds,
  clampNumLeds,
  normalizeGearValuesForDevice,
  configPatchFromGearValues,
  validateGearTable
} = require('../../../utils/canRuntimeConfig.js');
const {
  uploadCapture,
  listSessionsGrouped,
  fetchSessionBundle,
  listUserHistorySessions,
  saveUserRuntimeSnapshot,
  getUserRuntimeSnapshot,
  getProfileForSession,
  publishProfile,
  downloadConfigJson,
  clearAllCanLearnData
} = require('../../../utils/canCaptureStore.js');

const GEAR_STEPS = [
  { key: 'N_first', label: '第 1 步：N 挡', confirmText: '我已挂到 N 挡', hint: '挂 N 挡后点击，录制 3 秒', recordMs: 3000 },
  { key: '1', label: '第 2 步：1 挡', confirmText: '我已挂到 1 挡', hint: '请挂入 1 挡，点击后开始录制 3 秒', recordMs: 3000 },
  { key: 'N_verify', label: '第 3 步：N 挡', confirmText: '我已挂到 N 挡', hint: '再次挂入空挡 N 挡，点击后开始录制 3 秒', recordMs: 3000 },
  { key: '2', label: '第 4 步：2 挡', confirmText: '我已挂到 2 挡', hint: '请挂入 2 挡，点击后开始录制 3 秒', recordMs: 3000 },
  { key: '3', label: '第 5 步：3 挡', confirmText: '我已挂到 3 挡', hint: '请挂入 3 挡，点击后开始录制 3 秒', recordMs: 3000 },
  { key: '4', label: '第 6 步：4 挡', confirmText: '我已挂到 4 挡', hint: '请挂入 4 挡，点击后开始录制 3 秒', recordMs: 3000 },
  { key: '5', label: '第 7 步：5 挡', confirmText: '我已挂到 5 挡', hint: '请挂入 5 挡，点击后开始录制 3 秒', recordMs: 3000 },
  { key: '6', label: '第 8 步：6 挡', confirmText: '我已挂到 6 挡', hint: '请挂入 6 挡，点击后开始录制 3 秒', recordMs: 3000 },
  { key: 'RPM', label: '第 9 步：转速校准', confirmText: '开始自动采集（6秒）', hint: `挂行驶挡，点击后 6 秒内从怠速匀速拧到转速表约 ${RPM_CALIB_TARGET} 转`, recordMs: 6000 }
];

const STEP_ORDER = GEAR_STEPS.map((s) => s.key);

const GEAR_FORM_FIELDS = [
  { key: 'gear_neutral', label: 'N 挡', short: 'N' },
  { key: 'gear_1', label: '1 挡', short: '1' },
  { key: 'gear_2', label: '2 挡', short: '2' },
  { key: 'gear_3', label: '3 挡', short: '3' },
  { key: 'gear_4', label: '4 挡', short: '4' },
  { key: 'gear_5', label: '5 挡', short: '5' },
  { key: 'gear_6', label: '6 挡', short: '6' }
];

const EMPTY_FORM = {
  name: '',
  model: '',
  gear_id: '',
  gear_offset: '',
  gear_neutral: '',
  gear_1: '',
  gear_2: '',
  gear_3: '',
  gear_4: '',
  gear_5: '',
  gear_6: '',
  rpm_id: '',
  rpm_pair_offset: '',
  rpm_be: false,
  rpm_idle: '',
  rpm_raw_max: '',
  rpm_max: '8000'
};

const LIVE_MAX_LINES = 10000;
const LIVE_DISPLAY_LINES = 500;

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 44,
    isAdmin: false,
    adminMode: false,
    connected: false,
    connecting: false,
    streamFps: 0,
    liveStreamText: '',
    liveLineCount: 0,
    liveStreamTotal: 0,
    liveStreamTruncated: false,
    liveStreamWarn: '',
    liveVehicleIdCount: 0,
    canBitrateText: '未连接',
    canBitrateLocked: false,
    canRxTotal: 0,
    vehicleProfile: 'wuji',
    vehicleProfileLabel: '无极',
    canProbeLogText: '',
    sessionId: '',
    stepIndex: 0,
    currentStep: GEAR_STEPS[0],
    stepKey: GEAR_STEPS[0].key,
    stepPrimaryLabel: GEAR_STEPS[0].confirmText,
    recording: false,
    uploading: false,
    captures: [],
    allDone: false,
    awaitingMeterInput: false,
    meterParamsConfirmed: false,
    rpmCapturing: false,
    rpmCaptureFrameCount: 0,
    rpmCalibTarget: RPM_CALIB_TARGET,
    hint: '请先连接 MT-CAN-Learn 设备',
    userAnalyzing: false,
    userAnalysisReady: false,
    userAnalysisError: '',
    userRuntimeConfig: null,
    selectedUserGearIdx: 0,
    input_idle: String(DEFAULT_INPUT_IDLE),
    input_redline: String(DEFAULT_INPUT_REDLINE),
    num_leds: String(DEFAULT_NUM_LEDS),
    maxNumLeds: MAX_NUM_LEDS,
    userTab: 'capture',
    deviceMode: '',
    savedMotoConfig: null,
    tuneRuntimeConfig: null,
    tuneSending: false,
    liveRuntimeGear: -1,
    liveRuntimeRpmRaw: 0,
    liveRuntimeLedCount: 0,
    userHistoryGroups: [],
    loadingUserHistory: false,
    selectedHistorySessionId: '',
    historyLoaded: false,
    savingAnalysis: false,
    sessionProfile: null,
    writingDevice: false,
    sessionGroups: [],
    selectedSessionId: '',
    sessionSteps: [],
    loadingSteps: false,
    gearTotalAnalysis: null,
    rpmTotalAnalysis: null,
    gearFormFields: GEAR_FORM_FIELDS.map((g) => ({ ...g, value: '' })),
    form: { ...EMPTY_FORM }
  },

  onLoad() {
    this._calcNav();
    this._sessionId = '';
    this._captures = {};
    this._liveLines = [];
    this._probeLogLines = [];
    this._lastLiveUiMs = 0;
    this._lastRuntimeUiMs = 0;
    this._stepTextCache = {};
    this._stepFramesCache = {};
    let vehicleProfile = 'wuji';
    try {
      wx.setStorageSync('can_learn_vehicle_profile', 'wuji');
    } catch (e) { /* ignore */ }
    this.setData({
      vehicleProfile,
      vehicleProfileLabel: '无极',
      num_leds: String(loadStoredNumLeds())
    });
    this._syncStepUi(0);
    this._syncGearInputs();
    this._checkAdmin().then(() => this.loadUserHistory());
    this._loadSavedMotoConfig();
    this.ble = new CanStreamBle({
      onStats: ({ fps }) => this.setData({ streamFps: fps }),
      onMessage: (type, msg) => {
        if (type === 'connected') {
          const mode = (msg && msg.mode) || 'stream';
          this.setData({ deviceMode: mode });
          this._pushProbeLog(`蓝牙已连接 · 设备模式 ${mode.toUpperCase()}`);
        }
        if (type === 'vehicle_profile') {
          this._pushProbeLog('设备车型 无极 · 被动监听');
        }
        if (type === 'can_bitrate') {
          this._onCanBitrate(msg);
        }
        if (type === 'can_status') {
          this._onCanStatus(msg);
        }
        if (type === 'can_reprobe') {
          this._pushProbeLog('已重新开始 CAN 波特率探测');
        }
        if (type === 'btn_click') {
          this._onDeviceBtnClick();
        }
        if (type === 'runtime') {
          const gear = Number(msg.gear);
          const rpmRaw = Number(msg.rpmRaw) || 0;
          const now = Date.now();
          const gearChanged = gear !== this.data.liveRuntimeGear;
          if (!gearChanged && now - this._lastRuntimeUiMs < 50) return;
          this._lastRuntimeUiMs = now;
          const tuneCfg = this.data.tuneRuntimeConfig || this.data.userRuntimeConfig;
          const liveRuntimeLedCount = Number.isFinite(Number(msg.ledCount))
            ? Number(msg.ledCount)
            : rawToLedCount(rpmRaw, tuneCfg);
          const patch = { liveRuntimeGear: gear, liveRuntimeRpmRaw: rpmRaw, liveRuntimeLedCount };
          if (Number.isFinite(Number(msg.num_leds))) {
            patch.num_leds = String(clampNumLeds(msg.num_leds));
          }
          this.setData(patch);
        }
        if (type === 'runtime_configured') console.log('[CanLearn] runtime ok', msg);
        if (type === 'rpm_calibration_updated') console.log('[CanLearn] rpm cal ok', msg);
      },
      onDisconnected: () => {
        this._liveLines = [];
        this._probeLogLines = [];
        this.setData({
          connected: false,
          deviceMode: '',
          streamFps: 0,
          liveStreamText: '',
          liveLineCount: 0,
          liveStreamTotal: 0,
          liveStreamTruncated: false,
          liveStreamWarn: '',
          liveVehicleIdCount: 0,
          canBitrateText: '未连接',
          canBitrateLocked: false,
          canRxTotal: 0,
          canProbeLogText: '',
          liveRuntimeGear: -1,
          liveRuntimeRpmRaw: 0,
          hint: '蓝牙已断开，请重新连接'
        });
      }
    });
    this._bindBleFrameListener();
  },

  _bindBleFrameListener() {
    if (!this.ble) return;
    if (this._onFrameHandler) {
      this.ble.offFrame(this._onFrameHandler);
    }
    this._onFrameHandler = (frame) => this._pushLiveLine(frame);
    this.ble.onFrame(this._onFrameHandler);
  },

  onUnload() {
    if (this._liveMonitorTimer) {
      clearTimeout(this._liveMonitorTimer);
      this._liveMonitorTimer = null;
    }
    if (this.ble) this.ble.disconnect();
  },

  onShow() {
    if (this.data.allDone && this._sessionId) {
      this._refreshSessionProfile();
    }
  },

  _gearStepsForProfile(profile) {
    return GEAR_STEPS.map((s) => {
      if (s.key !== 'N_first') return s;
      return { ...s, hint: '无极：请先通电，挂 N 挡后点击，录制 3 秒（500k 被动监听）' };
    });
  },

  _stepForProfile(stepIndex, profile) {
    const steps = this._gearStepsForProfile(profile);
    return steps[stepIndex] || steps[0];
  },

  _syncStepUi(stepIndex, patch = {}) {
    const step = GEAR_STEPS[stepIndex] || GEAR_STEPS[0];
    this.setData({
      stepIndex,
      currentStep: step,
      stepKey: step.key,
      stepPrimaryLabel: step.confirmText,
      ...patch
    });
  },

  _vehicleProfileHint() {
    return '无极模式：被动监听 500k，灯带响应更快';
  },

  async _applyVehicleProfileToDevice() {
    if (!this.ble || !this.data.connected) return;
    try {
      const waitP = this.ble.waitForMessage('vehicle_profile', 8000);
      await this.ble.setVehicleProfile('wuji');
      await waitP;
    } catch (err) {
      console.warn('[CanLearn] set_vehicle_profile fail', err);
    }
  },

  onVehicleProfileTap() {
    wx.showToast({ title: '当前仅支持无极 CAN', icon: 'none' });
  },

  _formatProbeTime() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  },

  _pushProbeLog(text) {
    const line = `[${this._formatProbeTime()}] ${text}`;
    console.log('[CanLearn]', line);
    this._probeLogLines.push(line);
    if (this._probeLogLines.length > 40) {
      this._probeLogLines.splice(0, this._probeLogLines.length - 40);
    }
    this.setData({ canProbeLogText: this._probeLogLines.join('\n') });
  },

  _onCanBitrate(msg) {
    const kbps = String(msg.kbps || '?');
    const idx = Number(msg.index);
    const total = Number(msg.total) || 5;
    const locked = msg.locked === true || msg.locked === 'true';
    const rxTotal = Number(msg.rx_total) || 0;
    const msSince = Number(msg.ms_since_rx) || 0;
    const ord = Number.isFinite(idx) ? `${idx + 1}/${total}` : '';
    let text = locked
      ? `CAN ${kbps} kbps 已锁定（收包 ${rxTotal}）· 被动监听`
      : `探测 ${kbps} kbps (${ord}) · ${Math.round(msSince / 1000)}s 无数据`;
    this._pushProbeLog(text);
    this.setData({
      canBitrateText: locked ? `${kbps} kbps ✓` : `探测 ${kbps} kbps (${ord})`,
      canBitrateLocked: locked,
      canRxTotal: rxTotal
    });
    wx.showToast({
      title: locked ? `CAN ${kbps}k 锁定` : `探测 ${kbps}k`,
      icon: 'none',
      duration: 1800
    });
  },

  _onCanStatus(msg) {
    const locked = msg.locked === true || msg.locked === 'true';
    const rxTotal = Number(msg.rx_total) || 0;
    const kbps = String(msg.kbps || '?');
    const idx = Number(msg.index);
    const total = 5;
    const ord = Number.isFinite(idx) ? `${idx + 1}/${total}` : '';
    let warn = '';
    if (msg.knock === true || msg.knock === 'true') {
      warn = '⚠ 设备仍在主动发 CAN，请重烧无极版固件';
    }
    this.setData({
      canRxTotal: rxTotal,
      canBitrateLocked: locked,
      canBitrateText: locked
        ? `${kbps} kbps ✓ · 无极 被动`
        : `探测 ${kbps} kbps (${ord}) · 无极`,
      liveStreamWarn: warn
    });
  },

  _scheduleLiveMonitorRefresh() {
    if (this._liveMonitorTimer) return;
    this._liveMonitorTimer = setTimeout(() => {
      this._liveMonitorTimer = null;
      this._refreshLiveMonitor();
    }, 80);
  },

  _appendLiveLine(line) {
    if (!line) return;
    if (!this._liveLines) this._liveLines = [];
    this._liveLines.push(line);
    if (this._liveLines.length > LIVE_MAX_LINES) {
      this._liveLines.splice(0, this._liveLines.length - LIVE_MAX_LINES);
    }
    this._scheduleLiveMonitorRefresh();
  },

  _refreshLiveMonitor() {
    const all = this._liveLines || [];
    const total = all.length;
    const displayStart = Math.max(0, total - LIVE_DISPLAY_LINES);
    const displayLines = all.slice(displayStart);
    const vehicleIdSet = {};
    all.forEach((line) => {
      const m = /^ID:(\d+)/.exec(line);
      if (!m) return;
      const id = Number(m[1]);
      if (Number.isFinite(id) && !isObdDiagnosticFrameId(id)) vehicleIdSet[id] = true;
    });
    const vehicleIds = Object.keys(vehicleIdSet).length;
    let monitorWarn = '';
    if (total === 0) {
      monitorWarn = '';
    } else if (vehicleIds === 0) {
      monitorWarn = '暂无车身广播帧，请确认车辆已通电且接在 CAN 总线';
    }
    const existing = this.data.liveStreamWarn || '';
    const keepStatusWarn = existing.indexOf('敲门') >= 0;
    this.setData({
      liveStreamText: displayLines.join('\n'),
      liveLineCount: displayLines.length,
      liveStreamTotal: total,
      liveStreamTruncated: total > LIVE_DISPLAY_LINES,
      liveVehicleIdCount: vehicleIds,
      liveStreamWarn: keepStatusWarn ? existing : monitorWarn
    });
  },

  _pushLiveLine(frame) {
    const id = Number(frame.id);
    if (!Number.isFinite(id)) return;
    const line = formatFrameLine(frame);
    if (!line) return;
    this._appendLiveLine(line);
  },

  _onDeviceBtnClick() {
    this._pushProbeLog('设备按键：开始当前步骤录制');
    if (!this.data.connected) {
      wx.showToast({ title: '请先连接蓝牙', icon: 'none' });
      return;
    }
    if (this.data.userTab === 'capture' && !this.data.allDone && !this.data.recording && !this.data.uploading) {
      this.onRecordStep();
      return;
    }
    wx.showToast({ title: '当前状态无法录制', icon: 'none' });
  },

  _calcNav() {
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      const win = wx.getWindowInfo();
      const statusBarHeight = win.statusBarHeight || 44;
      const navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  async _checkAdmin() {
    try {
      const login = await wx.cloud.callFunction({ name: 'login' });
      const openid = (login.result && login.result.openid) || '';
      this._openid = openid;
      const db = wx.cloud.database();
      let res = await db.collection('guanliyuan').where({ openid }).limit(1).get();
      if (!(res.data || []).length) {
        res = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
      }
      const ok = (res.data || []).length > 0;
      this.setData({ isAdmin: ok });
    } catch (e) {
      console.warn('[CanLearn] admin check fail', e);
    }
  },

  _normalizeMotoConfig(config) {
    if (!config) return null;
    const gear_values = normalizeGearValuesForDevice(config);
    const patch = configPatchFromGearValues(gear_values);
    return { ...config, ...patch };
  },

  _applyGearPatchToForm(patch) {
    if (!patch) return;
    const updates = {};
    Object.keys(patch).forEach((k) => {
      if (k.indexOf('gear_') === 0 || k === 'gear_id' || k === 'gear_offset') {
        updates[`form.${k}`] = String(patch[k]);
      }
    });
    if (Object.keys(updates).length) {
      this.setData(updates, () => this._syncGearInputs());
    }
  },

  _loadSavedMotoConfig() {
    try {
      const raw = wx.getStorageSync('can_moto_config_latest');
      if (!raw || !raw.rpm_idle) return;
      const saved = this._normalizeMotoConfig(raw);
      wx.setStorageSync('can_moto_config_latest', saved);
      this.setData({
        savedMotoConfig: saved,
        input_idle: String(saved.input_idle || DEFAULT_INPUT_IDLE),
        input_redline: String(saved.input_redline || DEFAULT_INPUT_REDLINE),
        num_leds: String(clampNumLeds(saved.num_leds || loadStoredNumLeds())),
        tuneRuntimeConfig: this._decorateRuntimeConfig(
          recalcRpmCalibration(saved, {
            input_idle: saved.input_idle || DEFAULT_INPUT_IDLE,
            input_redline: saved.input_redline || DEFAULT_INPUT_REDLINE,
            num_leds: saved.num_leds || loadStoredNumLeds()
          })
        )
      });
    } catch (e) {
      console.warn('[CanLearn] load saved config fail', e);
    }
  },

  _getTuneBaseline() {
    return this.data.savedMotoConfig || this.data.userRuntimeConfig || null;
  },

  _rebuildTuneRuntime() {
    const baseline = this._getTuneBaseline();
    const runtime = recalcRpmCalibration(baseline, this._runtimeBuildOptions());
    this.setData({
      tuneRuntimeConfig: this._decorateRuntimeConfig(runtime),
      liveRuntimeLedCount: rawToLedCount(this.data.liveRuntimeRpmRaw, runtime)
    });
    return runtime;
  },

  onUserTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.userTab) return;
    this.setData({ userTab: tab });
    if (tab === 'tune') this._rebuildTuneRuntime();
    if (tab === 'history') this.loadUserHistory();
  },

  async loadUserHistory() {
    if (!this._openid) {
      try {
        const login = await wx.cloud.callFunction({ name: 'login' });
        this._openid = (login.result && login.result.openid) || '';
      } catch (e) { /* ignore */ }
    }
    if (!this._openid) return;
    this.setData({ loadingUserHistory: true });
    try {
      const userHistoryGroups = await listUserHistorySessions(this._openid, 40);
      this.setData({ userHistoryGroups, loadingUserHistory: false });
    } catch (err) {
      this.setData({ loadingUserHistory: false });
      console.warn('[CanLearn] load user history fail', err);
    }
  },

  async onSelectUserHistory(e) {
    const sid = e.currentTarget.dataset.id;
    if (!sid || sid === this.data.selectedHistorySessionId) return;
    await this._loadUserHistorySession(sid);
  },

  async _loadUserHistorySession(sessionId) {
    wx.showLoading({ title: '读取历史数据' });
    try {
      const bundle = await fetchSessionBundle(sessionId);
      if (!bundle.steps || !bundle.steps.length) {
        wx.hideLoading();
        wx.showToast({ title: '该会话无可用数据', icon: 'none' });
        return;
      }

      this._sessionId = sessionId;
      this._captures = {};
      this._stepFramesCache = {};
      this._stepTextCache = {};

      const captures = [];
      bundle.steps.forEach((step) => {
        const frames = (step.data && step.data.frames) || [];
        this._stepFramesCache[step.gearKey] = frames;
        this._stepTextCache[step.gearKey] = formatFramesText(frames);
        this._captures[step.gearKey] = {
          payload: { frames, frameCount: frames.length }
        };
        captures.push({
          key: step.gearKey,
          label: step.gearLabel || step.gearKey,
          frameCount: frames.length
        });
      });

      captures.sort((a, b) => {
        const ia = STEP_ORDER.indexOf(a.key);
        const ib = STEP_ORDER.indexOf(b.key);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });

      const snapshot = await getUserRuntimeSnapshot(sessionId);
      let input_idle = this.data.input_idle;
      let input_redline = this.data.input_redline;
      if (snapshot && snapshot.runtimeConfig) {
        input_idle = String(snapshot.runtimeConfig.input_idle || DEFAULT_INPUT_IDLE);
        input_redline = String(snapshot.runtimeConfig.input_redline || DEFAULT_INPUT_REDLINE);
      } else if (snapshot && snapshot.input_idle) {
        input_idle = String(snapshot.input_idle);
        input_redline = String(snapshot.input_redline || DEFAULT_INPUT_REDLINE);
      }

      const allDone = STEP_ORDER.every((k) => this._captures[k]);

      wx.hideLoading();
      this.setData({
        selectedHistorySessionId: sessionId,
        historyLoaded: true,
        sessionId,
        captures,
        allDone,
        input_idle,
        input_redline,
        userAnalyzing: true,
        userAnalysisError: '',
        hint: `已载入历史 ${sessionId}，共 ${captures.length} 步`
      });
      this._runAnalysisFromCache();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '读取失败', icon: 'none' });
    }
  },

  async onSaveAnalysisSnapshot() {
    if (!this._sessionId) {
      wx.showToast({ title: '请先载入会话', icon: 'none' });
      return;
    }
    const runtime = this._rebuildUserRuntime();
    if (!runtime) {
      wx.showToast({ title: '分析未就绪', icon: 'none' });
      return;
    }
    this.setData({ savingAnalysis: true });
    wx.showLoading({ title: '上传分析结果' });
    try {
      await saveUserRuntimeSnapshot(this._sessionId, runtime, this._openid);
      wx.hideLoading();
      this.setData({ savingAnalysis: false });
      wx.showToast({ title: '分析已保存', icon: 'success' });
      this.loadUserHistory();
    } catch (err) {
      wx.hideLoading();
      this.setData({ savingAnalysis: false });
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
    }
  },

  async _syncDeviceAfterConnect(connectResult) {
    let deviceMode = (connectResult && connectResult.mode) || 'stream';
    let saved = this.data.savedMotoConfig;

    if (deviceMode === 'runtime') {
      try {
        const devCfg = await this.ble.getRuntime();
        if (devCfg && devCfg.ok) {
          deviceMode = devCfg.mode || 'runtime';
          if (!saved && devCfg.rpm_idle) {
            saved = this._normalizeMotoConfig({
              version: 2,
              gear_id: devCfg.gear_id,
              gear_offset: devCfg.gear_offset,
              gear_values: devCfg.gear_values || [],
              rpm_id: devCfg.rpm_id,
              rpm_pair_offset: devCfg.rpm_pair_offset,
              rpm_be: !!devCfg.rpm_be,
              detected_idle_raw: devCfg.detected_idle_raw || devCfg.rpm_idle,
              rpm_idle: devCfg.rpm_idle,
              rpm_raw_max: devCfg.rpm_raw_max,
              rpm_max: devCfg.rpm_max,
              num_leds: clampNumLeds(devCfg.num_leds),
              input_idle: Number(this.data.input_idle) || DEFAULT_INPUT_IDLE,
              input_redline: Number(this.data.input_redline) || DEFAULT_INPUT_REDLINE
            });
            wx.setStorageSync('can_moto_config_latest', saved);
          } else if (saved) {
            saved = this._normalizeMotoConfig(saved);
            wx.setStorageSync('can_moto_config_latest', saved);
          }
        }
      } catch (e) {
        console.warn('[CanLearn] get_runtime fail', e);
      }
    }

    const userTab = (deviceMode === 'runtime' && (saved || this.data.userRuntimeConfig))
      ? 'tune'
      : this.data.userTab;

    this.setData({
      deviceMode,
      userTab,
      savedMotoConfig: saved || this.data.savedMotoConfig,
      num_leds: String(saved && saved.num_leds ? clampNumLeds(saved.num_leds) : this._getNumLeds())
    }, () => {
      if (this.data.userTab === 'tune') this._rebuildTuneRuntime();
    });

    await this._applyVehicleProfileToDevice();
    await this._syncLedCountToDevice();
  },

  goBack() {
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  toggleAdminMode() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '无管理员权限', icon: 'none' });
      return;
    }
    const adminMode = !this.data.adminMode;
    this.setData({ adminMode });
    if (adminMode) this.loadAdminSessions();
  },

  onConnect() {
    this.setData({ connecting: true });
    this.ble.scanAndConnect()
      .then((result) => {
        if (!this._sessionId) {
          this._sessionId = 'S' + Date.now();
          this._captures = {};
        }
        this._liveLines = [];
        this._probeLogLines = [];
        this.setData({
          connected: true,
          connecting: false,
          sessionId: this._sessionId,
          liveStreamText: '',
          liveLineCount: 0,
          liveStreamTotal: 0,
          liveStreamTruncated: false,
          streamFps: 0,
          liveStreamWarn: '',
          liveVehicleIdCount: 0,
          canProbeLogText: '',
          canBitrateText: '探测中…',
          canBitrateLocked: false,
          canRxTotal: 0,
          hint: '已连接，请选择「初始化录入」或「转速调节」',
          liveRuntimeGear: -1,
          liveRuntimeRpmRaw: 0
        });
        return this._syncDeviceAfterConnect(result);
      })
      .then(() => {
        this._bindBleFrameListener();
        if (this.data.deviceMode === 'runtime') {
          wx.showModal({
            title: '设备在运行模式',
            content: '当前无法录入 CAN。若要重新采集，请点「切换为采集模式」。监视器仍会显示 CAN 原始数据。',
            showCancel: false
          });
        } else {
          this._pushProbeLog('请确保车辆已通电；设备将自动探测波特率');
        }
        wx.showToast({ title: '已连接', icon: 'success' });
      })
      .catch((err) => {
        this.setData({ connecting: false });
        const msg = (err && err.message) || '连接失败';
        console.error('[CanLearn] connect fail', err);
        wx.showModal({
          title: '蓝牙连接失败',
          content: msg + '\n\n请确认：\n1. 手机蓝牙已开启\n2. 设备名称为 MT-CAN-Learn 且已上电\n3. 未与其他手机占用连接\n4. 灯带运行中请靠近设备，可多试几次连接',
          showCancel: false
        });
      });
  },

  onNewCaptureSession() {
    wx.showModal({
      title: '开始新采集',
      content: '将清空当前会话进度，重新从第 1 步录入。已写入设备的配置不受影响。',
      success: (res) => {
        if (!res.confirm) return;
        this._sessionId = 'S' + Date.now();
        this._captures = {};
        this._stepFramesCache = {};
        if (this._rpmFramePoll) {
          clearInterval(this._rpmFramePoll);
          this._rpmFramePoll = null;
        }
        this.setData({
          sessionId: this._sessionId,
          stepIndex: 0,
          currentStep: GEAR_STEPS[0],
          stepKey: GEAR_STEPS[0].key,
          stepPrimaryLabel: GEAR_STEPS[0].confirmText,
          captures: [],
          allDone: false,
          awaitingMeterInput: false,
          meterParamsConfirmed: false,
          rpmCapturing: false,
          rpmCaptureFrameCount: 0,
          recording: false,
          uploading: false,
          historyLoaded: false,
          selectedHistorySessionId: '',
          userAnalyzing: false,
          userAnalysisReady: false,
          userAnalysisError: '',
          userRuntimeConfig: null,
          gearTotalAnalysis: null,
          rpmTotalAnalysis: null,
          hint: '新会话已开始，请按步骤操作'
        });
      }
    });
  },

  async onResetCaptureMode() {
    if (!this.data.connected) return;
    wx.showModal({
      title: '切换采集模式',
      content: '设备将回到 STREAM 采集模式，灯带熄灭。用于重新录入 CAN 数据。',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '切换中' });
        try {
          const waitP = this.ble.waitForMessage('stream_reset', 8000);
          await this.ble.resetStream();
          await waitP;
          wx.hideLoading();
          this.setData({
            deviceMode: 'stream',
            userTab: 'capture',
            liveRuntimeGear: -1,
            liveRuntimeRpmRaw: 0,
            hint: '已切换为采集模式，可开始录入'
          });
          wx.showToast({ title: '已切换', icon: 'success' });
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || '切换失败', icon: 'none' });
        }
      }
    });
  },

  async onReprobeCan() {
    if (!this.data.connected) return;
    try {
      await this.ble.reprobeCan();
      this._pushProbeLog('手动触发波特率重新探测');
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '探测失败', icon: 'none' });
    }
  },

  onDisconnect() {
    this.ble.disconnect().then(() => {
      this._liveLines = [];
      this.setData({
        connected: false,
        streamFps: 0,
        liveStreamText: '',
        liveLineCount: 0,
        hint: '请先连接设备'
      });
    });
  },

  onCopyLiveStream() {
    const lines = this._liveLines || [];
    const text = lines.join('\n');
    if (!text) {
      wx.showToast({ title: '暂无实时数据', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: `已复制 ${lines.length} 行`, icon: 'none' })
    });
  },

  onClearLiveStream() {
    this._liveLines = [];
    this.setData({
      liveStreamText: '',
      liveLineCount: 0,
      liveStreamTotal: 0,
      liveStreamTruncated: false,
      liveVehicleIdCount: 0
    });
    wx.showToast({ title: '已清空', icon: 'none' });
  },

  async _refreshSessionProfile() {
    if (!this._sessionId) return;
    try {
      const profile = await getProfileForSession(this._sessionId);
      this.setData({ sessionProfile: profile });
    } catch (e) {
      console.warn('[CanLearn] profile check fail', e);
    }
  },

  async onRecordStep() {
    if (!this.data.connected || this.data.recording || this.data.uploading) return;
    const step = GEAR_STEPS[this.data.stepIndex];
    if (!step) return;

    const sec = (step.recordMs || 3000) / 1000;
    const hint = step.key === 'RPM'
      ? `正在采集转速… ${sec} 秒内请从怠速匀速拧至约 ${RPM_CALIB_TARGET} 转`
      : `正在录制 ${step.label}… 请保持 ${sec} 秒`;

    this.setData({ recording: true, hint });

    try {
      const rawFrames = await recordFrames(this.ble, step.recordMs || 3000);
      await this._uploadStepCapture(step, rawFrames, step.recordMs);
    } catch (err) {
      console.error('[CanLearn] record/upload fail', err);
      this.setData({
        recording: false,
        uploading: false,
        hint: (err && err.message) || '录制或上传失败'
      });
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  _pickLearningFrames(rawFrames) {
    const filtered = filterFramesForLearning(rawFrames);
    if (filtered.length >= 3) return filtered;
    if (rawFrames.length >= 3) return rawFrames;
    return filtered.length ? filtered : rawFrames;
  },

  _buildCapturesList() {
    return GEAR_STEPS.filter((s) => this._captures[s.key]).map((s) => ({
      key: s.key,
      label: s.label,
      frameCount: (this._captures[s.key].payload && this._captures[s.key].payload.frameCount) || 0
    }));
  },

  async _uploadStepCapture(step, rawFrames, durationMs) {
    const frames = this._pickLearningFrames(rawFrames);
    const obdCnt = rawFrames.filter((f) => isObdDiagnosticFrameId(Number(f.id))).length;
    const isRpm = step.key === 'RPM';

    if (!frames.length) {
      this.setData({ recording: false, uploading: false });
      wx.showModal({
        title: '未采集到 CAN',
        content: `共 ${rawFrames.length} 帧，有效 0 帧。请确认车辆已打火且监视器有车身广播。`,
        showCancel: false
      });
      this.setData({ hint: '录制取消：无有效 CAN 数据' });
      return;
    }

    if (!isRpm && frames.length < 3) {
      this.setData({ recording: false, uploading: false });
      wx.showModal({
        title: '有效车身帧太少',
        content: `共 ${rawFrames.length} 帧，其中约 ${obdCnt} 帧是 OBD 回声。车身广播仅 ${frames.length} 帧。`,
        showCancel: false
      });
      this.setData({ hint: '录制取消：有效车身帧不足' });
      return;
    }

    if (!this._sessionId) {
      this._sessionId = 'S' + Date.now();
      this.setData({ sessionId: this._sessionId });
    }

    this._stepFramesCache[step.key] = frames;
    this.setData({
      uploading: true,
      hint: isRpm
        ? `保存转速数据… ${frames.length} 帧`
        : `上传中… 车身帧 ${frames.length}（已滤 OBD ${obdCnt}）`
    });

    const uploadMeta = {
      durationMs: durationMs || rawFrames.length,
      ...(isRpm ? { calibRpm: RPM_CALIB_TARGET } : {})
    };

    try {
      const result = await uploadCapture(this._sessionId, step.key, step.label, frames, uploadMeta);
      this._captures[step.key] = result;
    } catch (err) {
      console.warn('[CanLearn] cloud upload fail, keep local', err);
      this._captures[step.key] = { payload: { frames, frameCount: frames.length } };
    }

    const captures = this._buildCapturesList();

    if (isRpm) {
      this._syncStepUi(this.data.stepIndex, {
        recording: false,
        uploading: false,
        captures,
        allDone: true,
        awaitingMeterInput: false,
        hint: `转速采集完成（${frames.length} 帧），正在自动分析…`
      });
      wx.showToast({ title: '采集完成，分析中', icon: 'success' });
      this.loadUserHistory();
      this._runUserAutoAnalysis();
      return;
    }

    const nextIndex = this.data.stepIndex + 1;
    const stepsComplete = nextIndex >= GEAR_STEPS.length;

    this._syncStepUi(stepsComplete ? this.data.stepIndex : nextIndex, {
      recording: false,
      uploading: false,
      captures,
      allDone: false,
      hint: `「${step.label}」已上传 ${frames.length} 帧，请继续下一步`
    });

    this.loadUserHistory();
    wx.showToast({ title: '上传成功', icon: 'success' });
  },

  onConfirmMeterParams() {
    const input_idle = Number(this.data.input_idle);
    const input_redline = Number(this.data.input_redline);
    if (!Number.isFinite(input_idle) || input_idle <= 0) {
      wx.showToast({ title: '请填写表盘怠速', icon: 'none' });
      return;
    }
    if (!Number.isFinite(input_redline) || input_redline <= input_idle) {
      wx.showToast({ title: '红区须大于怠速', icon: 'none' });
      return;
    }
    if (input_idle >= RPM_CALIB_TARGET) {
      wx.showToast({ title: `怠速须小于 ${RPM_CALIB_TARGET} 转`, icon: 'none' });
      return;
    }
    if (input_redline <= RPM_CALIB_TARGET) {
      wx.showToast({ title: `红区须大于 ${RPM_CALIB_TARGET} 转`, icon: 'none' });
      return;
    }

    this.setData({
      awaitingMeterInput: false,
      meterParamsConfirmed: true,
      allDone: true,
      hint: '正在分析挡位与转速映射…'
    }, () => {
      this._runUserAutoAnalysis();
    });
  },

  _syncUserFramesFromCaptures() {
    this._stepFramesCache = {};
    Object.keys(this._captures || {}).forEach((k) => {
      const payload = this._captures[k] && this._captures[k].payload;
      if (payload && payload.frames) {
        this._stepFramesCache[k] = payload.frames;
      }
    });
  },

  _getNumLeds() {
    return clampNumLeds(this.data.num_leds);
  },

  async _syncLedCountToDevice() {
    if (!this.data.connected || !this.ble || !this.ble.setLedCount) return;
    try {
      await this.ble.setLedCount(this._getNumLeds());
    } catch (err) {
      console.warn('[CanLearn] set_led_count fail', err);
    }
  },

  onNumLedsInput(e) {
    const raw = e.detail.value;
    this.setData({ num_leds: raw }, () => {
      if (String(raw).trim() === '' || !Number.isFinite(Number(raw))) return;
      const n = saveStoredNumLeds(raw);
      if (this.data.userTab === 'tune' || this.data.historyLoaded) {
        this._rebuildTuneRuntime();
      }
      if (this.data.allDone || this.data.historyLoaded) {
        this._rebuildUserRuntime();
      }
      if (this.data.connected) {
        this._syncLedCountToDevice();
      }
    });
  },

  onNumLedsBlur() {
    const n = saveStoredNumLeds(this.data.num_leds);
    this.setData({ num_leds: String(n) });
  },

  _runtimeBuildOptions(extra = {}) {
    return {
      input_idle: this.data.input_idle,
      input_redline: this.data.input_redline,
      num_leds: this._getNumLeds(),
      ...extra
    };
  },

  _decorateRuntimeConfig(runtime) {
    if (!runtime) return null;
    const rawSpan = Number(runtime.rpm_raw_max) - Number(runtime.detected_idle_raw);
    const userSpan = Number(runtime.input_redline) - Number(runtime.input_idle);
    return {
      ...runtime,
      scaleKText: Number.isFinite(runtime.scaleK) ? runtime.scaleK.toFixed(4) : '',
      rawSpanText: Number.isFinite(rawSpan) ? String(Math.round(rawSpan)) : '',
      userRpmSpanText: Number.isFinite(userSpan) ? String(Math.round(userSpan)) : '',
      idleSourceText: runtime.detected_idle_source === 'neutral' ? 'N挡采集' : '转速序列',
      calibRpmText: String(runtime.calib_rpm || RPM_CALIB_TARGET)
    };
  },

  _getNeutralFramesForIdle() {
    const cache = this._stepFramesCache || {};
    return (cache.N_first || []).concat(cache.N_verify || []);
  },

  _getUserGearCandidate() {
    const analysis = this.data.gearTotalAnalysis;
    if (!analysis) return null;
    const list = analysis.candidates || [];
    const idx = Number(this.data.selectedUserGearIdx) || 0;
    if (list.length) return list[idx] || list[0];
    return analysis.bestForUse || analysis.best || null;
  },

  _rebuildUserRuntime() {
    const gearBest = this._getUserGearCandidate();
    const rpmBest = this.data.rpmTotalAnalysis && this.data.rpmTotalAnalysis.best;
    const runtime = buildRuntimeConfig(gearBest, rpmBest, {
      ...this._runtimeBuildOptions(),
      neutral_frames: this._getNeutralFramesForIdle()
    });
    this.setData({
      userRuntimeConfig: this._decorateRuntimeConfig(runtime),
      userAnalysisReady: !!runtime,
      userAnalysisError: runtime ? '' : '无法生成运行配置，请检查挡位方案或仪表参数'
    });
    return runtime;
  },

  _runAnalysisFromCache() {
    this._syncUserFramesFromCaptures();

    const stepList = GEAR_CROSS_STEP_DEFS.map((def) => ({
      gearKey: def.key,
      gear: def.gear,
      frames: (this._stepFramesCache && this._stepFramesCache[def.key]) || []
    })).filter((s) => s.frames.length > 0);

    const gearTotalAnalysis = stepList.length >= 2
      ? analyzeGearCrossSteps(stepList)
      : { candidates: [], best: null, bestForUse: null, hint: '挡位数据不足' };

    const rpmFrames = (this._stepFramesCache && this._stepFramesCache.RPM) || [];
    const rpmTotalAnalysis = rpmFrames.length >= 8
      ? analyzeRpmFromFrames(rpmFrames)
      : { candidates: [], best: null, hint: '转速数据不足' };

    const gearCandidate = gearTotalAnalysis.bestForUse || gearTotalAnalysis.best;
    const runtime = buildRuntimeConfig(gearCandidate, rpmTotalAnalysis.best, {
      ...this._runtimeBuildOptions(),
      neutral_frames: this._getNeutralFramesForIdle()
    });

    if (gearCandidate) {
      this._applyGearPatchToForm(gearFormPatchFromCandidate(gearCandidate));
    }

    let hint = '分析完成，请核对挡位方案';
    let userAnalysisError = '';
    if (!gearCandidate) {
      userAnalysisError = gearTotalAnalysis.hint || '挡位识别失败';
      hint = userAnalysisError;
    } else if (!rpmTotalAnalysis.best) {
      userAnalysisError = rpmTotalAnalysis.hint || '转速识别失败';
      hint = userAnalysisError;
    } else if (!runtime) {
      userAnalysisError = '无法计算转速映射，请检查怠速/红区参数';
      hint = userAnalysisError;
    } else if (gearCandidate.inferenceApplied) {
      hint = '分析完成（含顺序补猜），可保存或写入 ESP32';
    } else if (this.data.historyLoaded) {
      hint = '历史数据已分析，可在上方保存或写入 ESP32';
    }

    this.setData({
      userAnalyzing: false,
      gearTotalAnalysis,
      rpmTotalAnalysis,
      selectedUserGearIdx: 0,
      userRuntimeConfig: this._decorateRuntimeConfig(runtime),
      userAnalysisReady: !!runtime,
      userAnalysisError,
      hint
    }, () => {
      if (runtime) this._rebuildTuneRuntime();
      if (this.data.allDone) {
        setTimeout(() => {
          wx.pageScrollTo({ selector: '#analysis-result', duration: 300 }).catch(() => {
            wx.pageScrollTo({ scrollTop: 0, duration: 300 });
          });
        }, 100);
      }
    });
  },

  _runUserAutoAnalysis() {
    this.setData({ userAnalyzing: true, userAnalysisError: '' });
    this._runAnalysisFromCache();
  },

  onSelectUserGearCandidate(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (!Number.isFinite(idx)) return;
    this.setData({ selectedUserGearIdx: idx }, () => {
      this._rebuildUserRuntime();
      this._rebuildTuneRuntime();
    });
  },

  onUserMeterInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value }, () => {
      if (this.data.userTab === 'tune' || this.data.historyLoaded) {
        this._rebuildTuneRuntime();
      }
      if (this.data.allDone || this.data.historyLoaded) {
        this._rebuildUserRuntime();
      }
    });
  },

  async onWriteRuntimeToDevice() {
    if (!this.data.connected) {
      wx.showToast({ title: '请先连接设备', icon: 'none' });
      return;
    }
    const runtime = this._rebuildUserRuntime();
    if (!runtime) {
      wx.showToast({ title: this.data.userAnalysisError || '配置未就绪', icon: 'none' });
      return;
    }
    const gearCheck = validateGearTable(runtime.gear_values);
    if (!gearCheck.ok) {
      wx.showToast({ title: gearCheck.issue, icon: 'none', duration: 3000 });
      return;
    }
    const payload = buildRuntimePayload(runtime);
    this.setData({ writingDevice: true });
    wx.showLoading({ title: '写入设备' });
    try {
      const ack = await this.ble.setRuntime(payload);
      if (!ack || ack.ok === false) {
        throw new Error((ack && ack.err === 'invalid_config') ? '配置无效，请重新分析' : '设备拒绝配置');
      }
      wx.setStorageSync('can_moto_config_latest', runtime);
      this.setData({
        writingDevice: false,
        savedMotoConfig: runtime,
        deviceMode: 'runtime',
        userTab: 'tune',
        tuneRuntimeConfig: this._decorateRuntimeConfig(runtime),
        hint: '已写入 ESP32，灯带运行中，可在「转速调节」微调'
      });
      wx.hideLoading();
      wx.showToast({ title: '写入成功', icon: 'success' });
      if (this._sessionId) {
        saveUserRuntimeSnapshot(this._sessionId, runtime, this._openid).catch(() => {});
        this.loadUserHistory();
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ writingDevice: false });
      const msg = (err && err.message) || '写入失败';
      const hint = msg.indexOf('超时') >= 0 || msg.indexOf('响应') >= 0
        ? '写入超时：请靠近设备，灯带运行中可重试；仍失败请先「切换采集模式」再写入'
        : msg;
      wx.showToast({ title: hint, icon: 'none', duration: 3000 });
    }
  },

  async onSendRpmCalibration() {
    if (!this.data.connected) {
      wx.showToast({ title: '请先连接设备', icon: 'none' });
      return;
    }
    const baseline = this._getTuneBaseline();
    if (!baseline) {
      wx.showToast({ title: '请先完成初始化录入', icon: 'none' });
      return;
    }
    const runtime = this._rebuildTuneRuntime();
    if (!runtime) {
      wx.showToast({ title: '参数无效，请检查怠速/红区', icon: 'none' });
      return;
    }

    this.setData({ tuneSending: true });
    wx.showLoading({ title: '发送校准' });
    try {
      if (this.data.deviceMode !== 'runtime') {
        const payload = buildRuntimePayload(runtime);
        const ack = await this.ble.setRuntime(payload);
        if (!ack || ack.ok === false) {
          throw new Error((ack && ack.err === 'invalid_config') ? '配置无效，请重新分析' : '设备拒绝配置');
        }
      } else {
        const cal = buildRpmCalibrationPayload(runtime);
        const ack = await this.ble.updateRpmCalibration(cal);
        if (!ack || !ack.ok) {
          throw new Error((ack && ack.err) || '设备拒绝校准');
        }
      }
      wx.setStorageSync('can_moto_config_latest', runtime);
      this.setData({
        tuneSending: false,
        savedMotoConfig: runtime,
        deviceMode: 'runtime'
      });
      wx.hideLoading();
      wx.showToast({ title: '已发送到设备', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      this.setData({ tuneSending: false });
      const msg = (err && err.message) || '发送失败';
      const hint = msg.indexOf('超时') >= 0 || msg.indexOf('响应') >= 0
        ? '发送超时：请靠近设备后重试'
        : msg;
      wx.showToast({ title: hint, icon: 'none', duration: 3000 });
    }
  },

  async loadAdminSessions() {
    try {
      const sessionGroups = await listSessionsGrouped(80);
      this.setData({ sessionGroups });
    } catch (err) {
      wx.showToast({ title: '加载会话失败', icon: 'none' });
    }
  },

  onClearAllCanData() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '无管理员权限', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '清空 CAN 全部数据',
      content: '将删除 COS 中 can-capture、can-config 目录下所有文件，并清空数据库采集记录与车型配置。此操作不可恢复，确定继续？',
      confirmText: '全部删除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '清空中…', mask: true });
        try {
          const result = await clearAllCanLearnData();
          this._stepTextCache = {};
          this._stepFramesCache = {};
          this.setData({
            sessionGroups: [],
            selectedSessionId: '',
            sessionSteps: [],
            loadingSteps: false,
            gearTotalAnalysis: null,
            rpmTotalAnalysis: null,
            form: { ...EMPTY_FORM }
          });
          this._syncGearInputs();
          wx.hideLoading();
          wx.showModal({
            title: '清空完成',
            content: result.message || `COS ${result.cosDeleted || 0} 个，数据库 ${result.dbDeleted || 0} 条`,
            showCancel: false
          });
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || '清空失败', icon: 'none' });
        }
      }
    });
  },

  _buildStepView(step) {
    const frames = (step.data && step.data.frames) || [];
    const previewText = formatFramesText(frames, 80);
    const previewFirstLine = frames.length ? formatFrameLine(frames[0]) : '(无数据)';
    return {
      gearKey: step.gearKey,
      gearLabel: step.gearLabel || step.gearKey,
      frameCount: step.frameCount || frames.length,
      previewText,
      previewFirstLine,
      expanded: false,
      showAnalyze: false,
      analyzeRows: []
    };
  },

  async onSelectSession(e) {
    const sid = e.currentTarget.dataset.id;
    if (sid === this.data.selectedSessionId && this.data.sessionSteps.length) return;

    this.setData({
      selectedSessionId: sid,
      'form.name': '配置-' + sid,
      sessionSteps: [],
      loadingSteps: true,
      gearTotalAnalysis: null,
      rpmTotalAnalysis: null
    });

    try {
      const bundle = await fetchSessionBundle(sid);
      const orderMap = {};
      STEP_ORDER.forEach((k, i) => { orderMap[k] = i; });
      const sorted = (bundle.steps || []).slice().sort((a, b) => {
        const ia = orderMap[a.gearKey] != null ? orderMap[a.gearKey] : 99;
        const ib = orderMap[b.gearKey] != null ? orderMap[b.gearKey] : 99;
        return ia - ib;
      });
      const sessionSteps = sorted.map((s) => this._buildStepView(s));
      sorted.forEach((s) => {
        const frames = (s.data && s.data.frames) || [];
        this._stepTextCache[s.gearKey] = formatFramesText(frames);
        this._stepFramesCache[s.gearKey] = frames;
      });
      this.setData({ sessionSteps, loadingSteps: false });
      this.onGearTotalAnalyze(false);
      this.onRpmTotalAnalyze(false);
      if (!sessionSteps.length) {
        const group = (this.data.sessionGroups || []).find((g) => g.sessionId === sid);
        const n = group && group.items ? group.items.length : 0;
        if (n > 0) {
          wx.showModal({
            title: '数据无法读取',
            content: `该会话有 ${n} 条记录，但 COS 链接为空（旧版本 bug）。请让用户重新采集一遍。`,
            showCancel: false
          });
        }
      }
    } catch (err) {
      this.setData({ loadingSteps: false });
      wx.showToast({ title: (err && err.message) || '加载数据失败', icon: 'none' });
    }
  },

  onToggleStepExpand(e) {
    const key = e.currentTarget.dataset.key;
    const sessionSteps = (this.data.sessionSteps || []).map((s) => {
      if (s.gearKey === key) return { ...s, expanded: !s.expanded };
      return s;
    });
    this.setData({ sessionSteps });
  },

  onCopyStep(e) {
    const key = e.currentTarget.dataset.key;
    const text = this._stepTextCache[key];
    if (!text) {
      wx.showToast({ title: '暂无数据', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制该挡位数据', icon: 'success' })
    });
  },

  onRpmTotalAnalyze(showToast = true) {
    const frames = (this._stepFramesCache && this._stepFramesCache.RPM) || [];
    if (frames.length < 8) {
      this.setData({ rpmTotalAnalysis: null });
      if (showToast) {
        wx.showToast({ title: '暂无转速采集数据', icon: 'none' });
      }
      return;
    }
    const rpmTotalAnalysis = analyzeRpmFromFrames(frames);
    this.setData({ rpmTotalAnalysis });
    if (showToast && !rpmTotalAnalysis.best) {
      wx.showToast({ title: rpmTotalAnalysis.hint, icon: 'none' });
    }
  },

  onApplyRpmAnalysis(e) {
    const idx = e.currentTarget.dataset.idx;
    const list = (this.data.rpmTotalAnalysis && this.data.rpmTotalAnalysis.candidates) || [];
    const candidate = idx != null && idx !== '' ? list[Number(idx)] : (this.data.rpmTotalAnalysis && this.data.rpmTotalAnalysis.best);
    const patch = rpmFormPatchFromCandidate(candidate);
    if (!patch) {
      wx.showToast({ title: '无可填入结果', icon: 'none' });
      return;
    }
    const updates = {};
    Object.keys(patch).forEach((k) => {
      updates[`form.${k}`] = patch[k];
    });
    this.setData(updates);
    wx.showToast({ title: '已填入转速配置', icon: 'success' });
  },

  onGearTotalAnalyze(showToast = true) {
    const stepList = GEAR_CROSS_STEP_DEFS.map((def) => ({
      gearKey: def.key,
      gear: def.gear,
      frames: (this._stepFramesCache && this._stepFramesCache[def.key]) || []
    })).filter((s) => s.frames.length > 0);

    if (stepList.length < 2) {
      this.setData({ gearTotalAnalysis: null });
      if (showToast) {
        wx.showToast({ title: '挡位数据不足', icon: 'none' });
      }
      return;
    }

    const gearTotalAnalysis = analyzeGearCrossSteps(stepList);
    this.setData({ gearTotalAnalysis });
    if (showToast && !gearTotalAnalysis.best) {
      wx.showToast({ title: gearTotalAnalysis.hint, icon: 'none' });
    }
  },

  onApplyGearAnalysis(e) {
    const idx = e.currentTarget.dataset.idx;
    const list = (this.data.gearTotalAnalysis && this.data.gearTotalAnalysis.candidates) || [];
    const candidate = idx != null && idx !== '' ? list[Number(idx)] : (
      this.data.gearTotalAnalysis && (
        this.data.gearTotalAnalysis.bestForUse || this.data.gearTotalAnalysis.best
      )
    );
    const patch = gearFormPatchFromCandidate(candidate);
    if (!patch) {
      wx.showToast({ title: '无可填入结果', icon: 'none' });
      return;
    }
    const gearValues = normalizeGearValuesForDevice(patch);
    const fullPatch = { ...patch, ...configPatchFromGearValues(gearValues) };
    this._applyGearPatchToForm(fullPatch);
    wx.showToast({ title: '已填入挡位配置', icon: 'success' });
  },

  onCopyGearAnalysisCell(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    wx.setClipboardData({ data: text });
  },

  onAnalyzeStep(e) {
    const key = e.currentTarget.dataset.key;
    const frames = this._stepFramesCache[key];
    if (!frames || !frames.length) {
      wx.showToast({ title: '暂无数据', icon: 'none' });
      return;
    }
    const { rows } = analyzeFramesStable(frames);
    if (!rows.length) {
      wx.showToast({ title: '无有效 CAN 帧', icon: 'none' });
      return;
    }
    const sessionSteps = (this.data.sessionSteps || []).map((s) => {
      if (s.gearKey !== key) return s;
      return {
        ...s,
        showAnalyze: true,
        analyzeRows: rows,
        expanded: true
      };
    });
    this.setData({ sessionSteps });
  },

  onCopyAnalyzeId(e) {
    const idDec = e.currentTarget.dataset.iddec;
    if (idDec == null || idDec === '') return;
    const text = String(idDec);
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: `已复制 ID ${text}`, icon: 'none' })
    });
  },

  onCopyAnalyzeByte(e) {
    const stable = e.currentTarget.dataset.stable;
    const val = e.currentTarget.dataset.val;
    const offset = e.currentTarget.dataset.offset;
    if (stable !== '1' && stable !== 1 && stable !== true) return;
    if (val == null || val === '') return;
    wx.setClipboardData({
      data: String(val),
      success: () => wx.showToast({ title: `字节${offset}: ${val}`, icon: 'none' })
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value }, () => {
      if (field.indexOf('gear_') === 0) this._syncGearInputs();
    });
  },

  _syncGearInputs() {
    const f = this.data.form;
    const gearFormFields = GEAR_FORM_FIELDS.map((g) => ({
      ...g,
      value: f[g.key] || ''
    }));
    this.setData({ gearFormFields });
  },

  onToggleBe(e) {
    this.setData({ 'form.rpm_be': !!e.detail.value });
  },

  _buildConfigFromForm() {
    const f = this.data.form;
    const gearValues = normalizeGearValuesForDevice(f);
    return {
      version: 2,
      name: f.name,
      model: f.model,
      sourceSessionId: this.data.selectedSessionId,
      gear_id: Number(f.gear_id),
      gear_offset: Number(f.gear_offset),
      gear_values: gearValues,
      gear_neutral: gearValues[0],
      gear_one: gearValues[1],
      gear_2: gearValues[2],
      gear_3: gearValues[3],
      gear_4: gearValues[4],
      gear_5: gearValues[5],
      gear_6: gearValues[6],
      rpm_id: Number(f.rpm_id),
      rpm_pair_offset: Number(f.rpm_pair_offset),
      rpm_be: !!f.rpm_be,
      rpm_idle: Number(f.rpm_idle),
      rpm_raw_max: Number(f.rpm_raw_max),
      rpm_max: Number(f.rpm_max) || 8000
    };
  },

  async onPublishConfig() {
    const sid = this.data.selectedSessionId;
    const f = this.data.form;
    if (!sid) {
      wx.showToast({ title: '请先选择会话', icon: 'none' });
      return;
    }
    if (!f.gear_id || !f.rpm_id) {
      wx.showToast({ title: '请填写 CAN ID', icon: 'none' });
      return;
    }
    const config = this._buildConfigFromForm();
    wx.showLoading({ title: '上传配置' });
    try {
      await publishProfile(sid, f, config);
      wx.hideLoading();
      wx.showToast({ title: '已发布', icon: 'success' });
      if (sid === this._sessionId) {
        this._refreshSessionProfile();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '发布失败', icon: 'none' });
    }
  },

  async onDownloadAndWrite() {
    const profile = this.data.sessionProfile;
    if (!profile || !profile.configUrl) {
      wx.showToast({ title: '暂无可用配置', icon: 'none' });
      return;
    }
    if (!this.data.connected) {
      wx.showToast({ title: '请先连接设备', icon: 'none' });
      return;
    }
    this.setData({ writingDevice: true });
    wx.showLoading({ title: '写入设备' });
    try {
      const config = await downloadConfigJson(profile.configUrl);
      const runtimePayload = buildRuntimePayload(config);
      const ack = await this.ble.setRuntime(runtimePayload);
      if (!ack || ack.ok === false) {
        throw new Error((ack && ack.err === 'invalid_config') ? '配置无效' : '设备拒绝配置');
      }
      wx.setStorageSync('can_moto_config_latest', config);
      wx.hideLoading();
      this.setData({ writingDevice: false, hint: '配置已写入设备，进入运行模式' });
      wx.showToast({ title: '写入成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      this.setData({ writingDevice: false });
      wx.showToast({ title: (err && err.message) || '写入失败', icon: 'none' });
    }
  }
});
