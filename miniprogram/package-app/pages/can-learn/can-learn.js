const { CanLearnBle } = require('../../../utils/canLearnBle.js');
const { analyzeGear, analyzeRpm, buildRuntimeConfig } = require('../../../utils/canLearnAnalysis.js');

const STEPS = [
  {
    key: 'A',
    title: '动作 A · 空挡基准',
    desc: '保持空挡，不要踩离合。点击开始后 ESP32 将采集 2 秒 CAN 快照。',
    actionLabel: '开始采集空挡基准',
    durationMs: 2200
  },
  {
    key: 'B',
    title: '动作 B · 1 挡确认',
    desc: '挂入 1 挡，脚和手都离开。采集 2 秒。',
    actionLabel: '开始采集 1 挡',
    durationMs: 2200
  },
  {
    key: 'C',
    title: '动作 C · 闭环验证',
    desc: '挂回空挡，手脚离开。采集 2 秒，用于验证挡位信号能回到空挡值。',
    actionLabel: '开始采集空挡验证',
    durationMs: 2200
  },
  {
    key: 'D',
    title: '动作 D · 转速学习',
    desc: '打火并原地深轰油门（约 10 秒）。ESP32 记录各 16 位字段最大变化量。',
    actionLabel: '开始轰油门采集',
    durationMs: 12000
  }
];

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 44,
    connected: false,
    connecting: false,
    phase: 'learn',
    stepIndex: 0,
    currentStep: STEPS[0],
    learnProgress: 0,
    learnHint: '请先连接 MT-CAN-Learn 设备',
    stepRunning: false,
    snapshots: { A: null, B: null, C: null },
    rpmDeltas: null,
    gearResult: null,
    rpmResult: null,
    canApplyRuntime: false,
    runtime: { rpm: 0, rpmRaw: 0, gear: -1, gearLabel: '--' }
  },

  onLoad() {
    this._calcNav();
    this._snapshots = { A: null, B: null, C: null };
    this._runtimeConfig = null;
    this.ble = new CanLearnBle({
      onMessage: (type, payload) => this._onBleMessage(type, payload)
    });
  },

  onUnload() {
    if (this.ble) this.ble.disconnect();
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

  _toast(title, content) {
    const toast = this.selectComponent('#customToast');
    if (toast && toast.showToast) toast.showToast({ title, content: content || '' });
    else wx.showToast({ title: title || content, icon: 'none' });
  },

  goBack() {
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  _onBleMessage(type, payload) {
    if (type === 'snapshot') {
      this._snapshots[payload.step] = payload.batches;
      const currentKey = STEPS[this.data.stepIndex].key;
      if (payload.step === currentKey && this.data.stepRunning) {
        this._finishStepRun(false);
      }
      return;
    }
    if (type === 'rpm_deltas') {
      this._rpmDeltas = payload;
      if (this.data.stepRunning && this.data.stepIndex === 3) {
        this._finishStepRun(true);
      }
      return;
    }
    if (type === 'runtime') {
      this.setData({
        runtime: {
          rpm: payload.rpm || 0,
          rpmRaw: payload.rpmRaw || 0,
          gear: payload.gear,
          gearLabel: payload.gearLabel || '--'
        }
      });
    }
    if (type === 'runtime_configured') {
      this._toast('成功', '已写入运行配置');
      this.setData({ phase: 'runtime' });
    }
  },

  onConnect() {
    this.setData({ connecting: true });
    this.ble.scanAndConnect()
      .then(() => {
        this.setData({
          connected: true,
          connecting: false,
          learnHint: '已连接，请按步骤开始采集'
        });
        this._toast('成功', '已连接 MT-CAN-Learn');
      })
      .catch((err) => {
        this.setData({ connecting: false });
        this._toast('连接失败', (err && err.message) || '请检查蓝牙与设备');
      });
  },

  onDisconnect() {
    this.ble.disconnect().then(() => {
      this.setData({ connected: false, learnHint: '请先连接设备' });
    });
  },

  onStartStep() {
    if (!this.data.connected || this.data.stepRunning) return;
    const step = STEPS[this.data.stepIndex];
    this.setData({
      stepRunning: true,
      learnHint: '采集中，请保持动作…',
      learnProgress: Math.round((this.data.stepIndex / STEPS.length) * 100)
    });
    this.ble.startLearnStep(step.key).catch((err) => {
      this.setData({ stepRunning: false });
      this._toast('失败', err.message || '发送指令失败');
    });
    if (step.key === 'D') {
      this._stepTimer = setTimeout(() => {
        this.ble.stopLearn().catch(() => {});
      }, step.durationMs);
    } else {
      this._stepTimer = setTimeout(() => {
        if (this.data.stepRunning) {
          this.setData({ stepRunning: false });
          this._toast('超时', '未收到设备数据，请重试');
        }
      }, step.durationMs + 3000);
    }
  },

  _finishStepRun(fromD) {
    if (this._stepTimer) {
      clearTimeout(this._stepTimer);
      this._stepTimer = null;
    }
    if (!this.data.stepRunning && !fromD) return;
    const nextIndex = this.data.stepIndex + 1;
    if (nextIndex >= STEPS.length) {
      this._runAnalysis();
      return;
    }
    this.setData({
      stepIndex: nextIndex,
      currentStep: STEPS[nextIndex],
      stepRunning: false,
      learnProgress: Math.round((nextIndex / STEPS.length) * 100),
      learnHint: '本步骤完成，请进行下一步'
    });
    this._toast('完成', STEPS[nextIndex - 1].title);
  },

  _runAnalysis() {
    const gearAnalysis = analyzeGear(
      this._snapshots.A,
      this._snapshots.B,
      this._snapshots.C,
      {}
    );
    const rpmAnalysis = analyzeRpm(this._rpmDeltas || {});
    const gearResult = gearAnalysis.result;
    const rpmResult = rpmAnalysis.result;
    const runtimeConfig = buildRuntimeConfig(gearResult, rpmResult, { rpmMax: 8000 });
    this._runtimeConfig = runtimeConfig;
    this.setData({
      phase: 'analyze',
      stepRunning: false,
      learnProgress: 100,
      gearResult,
      rpmResult,
      canApplyRuntime: !!(gearResult && rpmResult && runtimeConfig)
    });
  },

  onApplyRuntime() {
    if (!this._runtimeConfig || !this.data.connected) return;
    this.ble.setRuntime(this._runtimeConfig).catch((err) => {
      this._toast('写入失败', err.message || '');
    });
  },

  onRestartLearn() {
    if (this.data.connected) this.ble.stopRuntime().catch(() => {});
    this._snapshots = { A: null, B: null, C: null };
    this._rpmDeltas = null;
    this._runtimeConfig = null;
    this.setData({
      phase: 'learn',
      stepIndex: 0,
      currentStep: STEPS[0],
      learnProgress: 0,
      learnHint: '请从动作 A 重新开始',
      stepRunning: false,
      gearResult: null,
      rpmResult: null,
      canApplyRuntime: false,
      runtime: { rpm: 0, rpmRaw: 0, gear: -1, gearLabel: '--' }
    });
  }
});
