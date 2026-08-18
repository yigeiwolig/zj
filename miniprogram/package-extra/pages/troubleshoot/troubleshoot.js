const pageBack = require('../../../utils/pageBack.js');
const cosUpload = require('../../../utils/cosUpload.js');

function callManage(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'troubleshootManage',
    data: { action, ...data },
    config: { timeout: 20000 }
  }).then((res) => (res && res.result) || { ok: false, errMsg: '无返回' });
}

function buildNodeMap(nodes) {
  const map = {};
  (nodes || []).forEach((node) => {
    if (node && node._id) map[node._id] = node;
  });
  return map;
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    navRightPad: 16,
    loading: true,
    model: '',
    pageTitle: '自助排查',
    lockedTree: false,
    trees: [],
    activeTree: null,
    currentNode: null,
    historyCount: 0,
    errorText: '',
    hasVideo: false,
    videoEnded: false,
    videoPlaying: false,
    showOptions: false,
    optionsPop: false,
    sheetVisible: false,
    sheetMounted: false,
    sheetAnimIn: false,
    videoSession: 0,
    displayTitle: '',
    displayTitleLines: [],
    stepGuide: '',
    stepBody: '',
    stepIndex: 1,
    stepCode: '01',
    stepProgressPct: 40,
    keyPointsView: [],
    footerOptions: [],
    resultTitle: '',
    resultDesc: '',
    resultCtaText: '完成',
    recordMode: false,
    pendingAnswerLabel: '',
    recordTempPath: '',
    mediaHeightPx: 200,
    submitting: false
  },

  onLoad(options = {}) {
    this._calcNav();
    this._calcMediaSize();
    this._nodeMap = {};
    this._history = [];
    this._reportSteps = [];
    this._reportSubmitted = false;
    this._pendingOption = null;
    this._optionsRevealed = false;
    this._initialTreeId = decodeURIComponent(String(options.tree || ''));
    const title = decodeURIComponent(String(options.title || ''));
    this.setData({
      model: decodeURIComponent(String(options.model || '')),
      pageTitle: title || (this._initialTreeId ? '排查助手' : '自助排查'),
      lockedTree: !!this._initialTreeId
    });
    if (this._initialTreeId) {
      this._loadAndEnterTree(this._initialTreeId, false);
    } else {
      this.loadTrees();
    }
  },

  onHide() {
    this._pauseVideo();
  },

  onUnload() {
    this._pauseVideo();
    if (this._sheetOpenTimer) {
      clearTimeout(this._sheetOpenTimer);
      this._sheetOpenTimer = null;
    }
    if (this._sheetCloseTimer) {
      clearTimeout(this._sheetCloseTimer);
      this._sheetCloseTimer = null;
    }
  },

  _calcNav() {
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const statusBarHeight = info.statusBarHeight || 20;
      // 仅导航内容行高度（不含状态栏）
      const navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
      const navTotalHeight = statusBarHeight + navBarHeight;
      // 右侧避开微信胶囊
      const navRightPad = Math.max(12, Math.round((info.windowWidth || 375) - menu.left + 6));
      this.setData({ statusBarHeight, navBarHeight, navTotalHeight, navRightPad });
    } catch (e) {
      this.setData({ statusBarHeight: 20, navBarHeight: 44, navTotalHeight: 64, navRightPad: 16 });
    }
  },

  /** 实拍视频为 16:9；左右各 64rpx（px-8） */
  _calcMediaSize() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const winW = info.windowWidth || 375;
      const sidePad = (64 / 750) * winW * 2;
      const mediaW = Math.max(200, winW - sidePad);
      const mediaHeightPx = Math.round(mediaW * 9 / 16);
      this.setData({ mediaHeightPx });
    } catch (e) {
      this.setData({ mediaHeightPx: 200 });
    }
  },

  _toast(title) {
    try {
      const app = getApp();
      if (app && typeof app.showToast === 'function') {
        app.showToast({ title, icon: 'none', duration: 2200 });
        return;
      }
    } catch (e) {}
    wx.showToast({ title, icon: 'none', duration: 2200 });
  },

  async loadTrees() {
    this.setData({ loading: true, errorText: '' });
    try {
      const result = await callManage('listTrees', { model: this.data.model });
      if (!result.ok) throw new Error(result.errMsg || '加载失败');
      this.setData({ trees: result.list || [], loading: false });
    } catch (e) {
      this.setData({
        loading: false,
        errorText: (e && e.message) || '排查方案加载失败'
      });
    }
  },

  async _resolveNodeMedia(nodes) {
    const fileIds = [];
    (nodes || []).forEach((node) => {
      const media = node && node.media;
      if (media && String(media.url || '').startsWith('cloud://')) fileIds.push(media.url);
      if (media && String(media.poster || '').startsWith('cloud://')) fileIds.push(media.poster);
    });
    if (!fileIds.length || !wx.cloud || !wx.cloud.getTempFileURL) return nodes || [];
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: Array.from(new Set(fileIds)) });
      const urlMap = {};
      (res.fileList || []).forEach((row) => {
        if (row.fileID && row.tempFileURL) urlMap[row.fileID] = row.tempFileURL;
      });
      return (nodes || []).map((node) => ({
        ...node,
        media: {
          ...(node.media || {}),
          url: urlMap[node.media && node.media.url] || (node.media && node.media.url) || '',
          poster: urlMap[node.media && node.media.poster] || (node.media && node.media.poster) || ''
        }
      }));
    } catch (e) {
      return nodes || [];
    }
  },

  async startTree(e) {
    const treeId = String((e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
    if (!treeId) return;
    this._history = [];
    await this._loadAndEnterTree(treeId, false);
  },

  _nodeHasPlayableVideo(node) {
    const media = node && node.media;
    if (!media || !String(media.url || '').trim()) return false;
    const type = String(media.type || 'video').toLowerCase();
    return type !== 'image';
  },

  _cleanStepTitle(title) {
    return String(title || '')
      .replace(/^【事例】\s*/, '')
      .trim();
  },

  /** 两行大标题；过短或带问号的短句保持一行 */
  _formatTitleLines(title) {
    const t = this._cleanStepTitle(title);
    if (!t) return ['排查步骤'];
    if (t.includes('\n')) return t.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
    // 「点击没反应?」这类短问句不要硬拆
    if (t.length <= 8 || /[?？]$/.test(t) && t.length <= 10) {
      return [t];
    }
    if (t.length >= 9 && t.length <= 14) {
      return [t.slice(0, 3), t.slice(3)];
    }
    if (t.length > 14) {
      const mid = Math.ceil(t.length / 2);
      return [t.slice(0, mid), t.slice(mid)];
    }
    return [t];
  },

  _resolveStepBody(node, isResult) {
    const body = String((node && node.body) || '').trim();
    if (body && !/事例流程|管理端修改|帮助中心事例|对照演示视频排查/.test(body)) {
      return body;
    }
    if (isResult) return '';
    return '这通常是由于物理连接异常引起的。请按照视频指引，检查链路末端的接头状态。';
  },

  _buildKeyPointsView(node) {
    const list = Array.isArray(node && node.keyPoints) ? node.keyPoints : [];
    const normalized = list.map((item) => {
      if (typeof item === 'string') {
        const title = String(item || '').trim();
        return title ? { title, detail: '' } : null;
      }
      const title = String((item && (item.title || item.text)) || '').trim();
      const detail = String((item && item.detail) || '').trim();
      if (!title && !detail) return null;
      return { title: title || detail, detail: title ? detail : '' };
    }).filter(Boolean).slice(0, 8);
    return normalized.map((item, i) => ({
      ...item,
      active: i === 0
    }));
  },

  _buildFooterOptions(node) {
    const opts = Array.isArray(node && node.options) ? node.options : [];
    return opts.map((item) => ({
      label: String((item && item.label) || '').trim() || '继续',
      requireUserVideo: !!(item && item.requireUserVideo)
    })).filter((item) => item.label).slice(0, 4);
  },

  _buildStepMeta(stepIndex) {
    const idx = Math.max(1, Number(stepIndex) || 1);
    // 参考稿 Step 01 进度条约 40%
    const stepProgressPct = Math.min(100, Math.max(40, Math.round(idx * 40)));
    const stepCode = idx < 10 ? `0${idx}` : String(idx);
    return { stepCode, stepProgressPct };
  },

  _openSheet(patch = {}) {
    if (this._sheetCloseTimer) {
      clearTimeout(this._sheetCloseTimer);
      this._sheetCloseTimer = null;
    }
    if (this._sheetOpenTimer) {
      clearTimeout(this._sheetOpenTimer);
      this._sheetOpenTimer = null;
    }
    const mounted = !!this.data.sheetMounted;
    if (mounted) {
      this.setData(Object.assign({ sheetAnimIn: true }, patch));
      return;
    }
    this.setData(Object.assign({
      sheetMounted: true,
      sheetAnimIn: false
    }, patch), () => {
      this._sheetOpenTimer = setTimeout(() => {
        this._sheetOpenTimer = null;
        this.setData({ sheetAnimIn: true });
      }, 40);
    });
  },

  _closeSheet(patch = {}, after) {
    if (this._sheetOpenTimer) {
      clearTimeout(this._sheetOpenTimer);
      this._sheetOpenTimer = null;
    }
    if (!this.data.sheetMounted) {
      this.setData(patch);
      if (typeof after === 'function') after();
      return;
    }
    this.setData({ sheetAnimIn: false });
    if (this._sheetCloseTimer) clearTimeout(this._sheetCloseTimer);
    this._sheetCloseTimer = setTimeout(() => {
      this._sheetCloseTimer = null;
      this.setData(Object.assign({
        sheetMounted: false,
        sheetAnimIn: false,
        sheetVisible: false,
        recordMode: false
      }, patch), () => {
        if (typeof after === 'function') after();
      });
    }, 380);
  },

  _buildResultView(node) {
    const isRepair = !!(node && (node.result === 'goto_repair' || node.result === 'fail'));
    if (isRepair) {
      return {
        resultTitle: '您的信息已提交售后，请等待售后部门处理',
        resultDesc: '',
        resultCtaText: String((node && node.resultCta) || '').trim() || '完成'
      };
    }
    return {
      resultTitle: '感谢您选择MT',
      resultDesc: '',
      resultCtaText: String((node && node.resultCta) || '').trim() || '完成'
    };
  },

  _enterNode(node, extra = {}) {
    const hasVideo = this._nodeHasPlayableVideo(node);
    const isResult = !!(node && node.type === 'result');
    this._optionsRevealed = false;
    this._pendingOption = null;
    this._videoEverPlayed = false;
    if (this._optionsPopTimer) {
      clearTimeout(this._optionsPopTimer);
      this._optionsPopTimer = null;
    }
    const stepIndex = (this._history.length || 0) + 1;
    const stepMeta = this._buildStepMeta(stepIndex);
    const displayTitle = this._cleanStepTitle(node && node.title);
    const footerOptions = isResult ? [] : this._buildFooterOptions(node);
    const resultView = isResult ? this._buildResultView(node) : {
      resultTitle: '',
      resultDesc: '',
      resultCtaText: '完成'
    };
    // 无视频时进页直接弹出问题；有视频必须播完再弹
    const openSheetNow = !isResult && !hasVideo && footerOptions.length > 0;
    this._optionsRevealed = openSheetNow;
    const wasOpen = !!(this.data.sheetMounted && this.data.sheetAnimIn);
    this.setData({
      currentNode: node,
      historyCount: this._history.length,
      stepIndex,
      ...stepMeta,
      hasVideo,
      videoEnded: !hasVideo,
      videoPlaying: false,
      showOptions: openSheetNow,
      optionsPop: false,
      sheetVisible: false,
      sheetAnimIn: false,
      videoSession: (this.data.videoSession || 0) + 1,
      displayTitle,
      displayTitleLines: isResult ? [displayTitle || '排查结果'] : this._formatTitleLines(displayTitle),
      stepGuide: '',
      stepBody: this._resolveStepBody(node, isResult),
      keyPointsView: isResult ? [] : this._buildKeyPointsView(node),
      footerOptions,
      ...resultView,
      recordMode: false,
      pendingAnswerLabel: '',
      recordTempPath: '',
      ...extra
    });
    const afterSlide = () => {
      this.setData({ sheetMounted: false, sheetVisible: false, recordMode: false }, () => {
        if (openSheetNow) this._openSheet({ sheetVisible: true, showOptions: true });
      });
    };
    if (wasOpen) {
      if (this._sheetCloseTimer) clearTimeout(this._sheetCloseTimer);
      this._sheetCloseTimer = setTimeout(() => {
        this._sheetCloseTimer = null;
        afterSlide();
      }, 360);
    } else {
      afterSlide();
    }
    if (isResult) this._submitReportIfNeeded();
  },

  _revealOptions() {
    if (this._optionsRevealed) {
      if (!this.data.recordMode) {
        this._openSheet({ showOptions: true, sheetVisible: true });
      }
      return;
    }
    this._optionsRevealed = true;
    this._openSheet({
      videoEnded: true,
      showOptions: true,
      sheetVisible: true,
      optionsPop: true
    });
  },

  playDemoVideo() {
    if (!this.data.hasVideo) return;
    this._videoEverPlayed = true;
    this.setData({ videoPlaying: true });
    try {
      const context = wx.createVideoContext('troubleshoot-video', this);
      if (context && context.play) context.play();
    } catch (e) {}
  },

  onVideoPlay() {
    this._videoEverPlayed = true;
    this.setData({ videoPlaying: true });
  },

  onVideoPause() {
    // 暂停时仍保留控件，不强制盖回遮罩，方便拖进度
  },

  showChoiceSheet() {
    if (!this._optionsRevealed) {
      this._toast('请先看完视频再选结果');
      return;
    }
    this._openSheet({ sheetVisible: true, recordMode: false });
  },

  hideChoiceSheet() {
    this._closeSheet();
  },

  onSheetMaskTap() {
    if (this.data.recordMode) {
      this.cancelUserRecord();
      return;
    }
    if (this.data.sheetVisible) {
      this.hideChoiceSheet();
    }
  },

  async _loadAndEnterTree(treeIdOrKey, preserveHistory) {
    this._pauseVideo();
    this.setData({ loading: true, errorText: '' });
    try {
      const result = await callManage('getTree', { treeId: treeIdOrKey });
      if (!result.ok) throw new Error(result.errMsg || '排查主题加载失败');
      const nodes = await this._resolveNodeMedia(result.nodes || []);
      this._nodeMap = buildNodeMap(nodes);
      const entryId = result.tree && result.tree.entryNodeId;
      const first = this._nodeMap[entryId] || nodes[0] || null;
      if (!first) throw new Error('该主题还没有排查步骤');
      if (!preserveHistory) {
        this._history = [];
        this._reportSteps = [];
        this._reportSubmitted = false;
      }
      this._enterNode(first, {
        loading: false,
        activeTree: result.tree,
        errorText: '',
        pageTitle: this.data.pageTitle && this.data.lockedTree
          ? this.data.pageTitle
          : ((result.tree && result.tree.title) || '排查助手')
      });
    } catch (e) {
      this.setData({
        loading: false,
        errorText: (e && e.message) || '排查主题加载失败'
      });
    }
  },

  async chooseOption(e) {
    if (this.data.recordMode) return;
    if (!this.data.showOptions) {
      this._toast('请先按视频操作并看完');
      return;
    }
    const index = Number(e.currentTarget.dataset.index);
    const node = this.data.currentNode;
    const option = node && Array.isArray(node.options) ? node.options[index] : null;
    if (!option) return;
    if (option.requireUserVideo) {
      this._pendingOption = option;
      this._closeSheet({}, () => {
        this._openSheet({
          recordMode: true,
          sheetVisible: false,
          pendingAnswerLabel: option.label || '',
          recordTempPath: ''
        });
      });
      return;
    }
    await this._commitOption(option, '');
  },

  cancelUserRecord() {
    this._closeSheet({
      pendingAnswerLabel: '',
      recordTempPath: ''
    }, () => {
      this._pendingOption = null;
      if (this._optionsRevealed) {
        this._openSheet({ sheetVisible: true, recordMode: false });
      }
    });
  },

  startUserRecord() {
    if (!wx.chooseMedia) {
      this._toast('当前环境不支持录制');
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file && file.tempFilePath) {
          this.setData({ recordTempPath: file.tempFilePath });
        }
      }
    });
  },

  async confirmUserRecord() {
    const option = this._pendingOption;
    const tempPath = this.data.recordTempPath;
    if (!option) {
      this.cancelUserRecord();
      return;
    }
    if (!tempPath) {
      this._toast('请先录制视频');
      return;
    }
    // 先只记本地路径；正常结束会整段抛弃，提交售后时再上传推管理员
    await this._commitOption(option, '', tempPath);
  },

  async _commitOption(option, videoUrl, localVideoPath = '') {
    const node = this.data.currentNode;
    if (!node || !option) return;
    this._pauseVideo();
    if (!Array.isArray(this._reportSteps)) this._reportSteps = [];
    this._reportSteps.push({
      nodeId: node._id || '',
      title: this.data.displayTitle || node.title || '',
      answer: option.label || '',
      requireUserVideo: !!option.requireUserVideo,
      videoUrl: videoUrl || '',
      localVideoPath: localVideoPath || ''
    });
    this._history.push({
      tree: this.data.activeTree,
      node,
      nodeMap: this._nodeMap
    });
    this._pendingOption = null;
    await new Promise((resolve) => {
      this._closeSheet({
        pendingAnswerLabel: '',
        recordTempPath: ''
      }, resolve);
    });
    if (option.nextTreeKey) {
      await this._loadAndEnterTree(option.nextTreeKey, true);
      return;
    }
    const next = this._nodeMap[option.nextNodeId];
    if (!next) {
      this._history.pop();
      this._reportSteps.pop();
      this._toast('下一步骤尚未配置');
      return;
    }
    this._enterNode(next);
  },

  _isRepairResult(node) {
    const result = String((node && node.result) || '').trim();
    return result === 'goto_repair' || result === 'fail';
  },

  async _uploadPendingReportVideos() {
    const steps = this._reportSteps || [];
    const tree = this.data.activeTree || {};
    const folder = `troubleshoot/user/${tree._id || tree.key || 'report'}`;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      if (step.videoUrl) continue;
      const localPath = String(step.localVideoPath || '').trim();
      if (!localPath) continue;
      const videoUrl = await cosUpload.uploadVideoToCos(localPath, folder);
      step.videoUrl = videoUrl || '';
      step.localVideoPath = '';
    }
  },

  async _submitReportIfNeeded() {
    if (this._reportSubmitted) return;
    const node = this.data.currentNode;
    const steps = this._reportSteps || [];

    // 正常结束：视频与排查记录全部抛弃，不推管理员
    if (!this._isRepairResult(node)) {
      this._reportSteps = [];
      this._reportSubmitted = true;
      return;
    }

    if (!steps.length) {
      this._reportSubmitted = true;
      return;
    }

    this._reportSubmitted = true;
    const tree = this.data.activeTree || {};
    this.setData({ submitting: true });
    try {
      await this._uploadPendingReportVideos();
      const payloadSteps = (this._reportSteps || []).map((step) => ({
        nodeId: step.nodeId || '',
        title: step.title || '',
        answer: step.answer || '',
        requireUserVideo: !!step.requireUserVideo,
        videoUrl: step.videoUrl || ''
      }));
      const result = await callManage('submitReport', {
        treeId: tree._id || tree.key || '',
        treeTitle: tree.title || this.data.pageTitle || '自助排查',
        model: this.data.model || '',
        result: String((node && node.result) || 'goto_repair'),
        steps: payloadSteps
      });
      this.setData({ submitting: false });
      if (!result.ok) throw new Error(result.errMsg || '提交失败');
      this._reportSteps = [];
    } catch (e) {
      this.setData({ submitting: false });
      this._reportSubmitted = false;
      console.warn('[troubleshoot] submitReport', e);
      this._toast((e && e.message) || '排查记录提交失败');
    }
  },

  previousStep() {
    if (this.data.recordMode) {
      this.cancelUserRecord();
      return;
    }
    if (!this._history.length) return;
    this._pauseVideo();
    if (this._reportSteps && this._reportSteps.length) this._reportSteps.pop();
    const previous = this._history.pop();
    this._nodeMap = previous.nodeMap || {};
    this._enterNode(previous.node, { activeTree: previous.tree });
  },

  onVideoEnded() {
    this._revealOptions();
  },

  onVideoTimeUpdate(e) {
    if (this._optionsRevealed || !this.data.hasVideo) return;
    if (!this._videoEverPlayed) return;
    const detail = (e && e.detail) || {};
    const currentTime = Number(detail.currentTime) || 0;
    const duration = Number(detail.duration) || 0;
    // 必须真正播过一段，且接近片尾，才弹问题
    if (duration > 1 && currentTime >= 1 && currentTime >= duration - 0.35) {
      this._revealOptions();
    }
  },

  onVideoError() {
    // 加载失败时也允许作答，避免卡死；但未开播前不立刻弹
    if (this._videoEverPlayed || !this.data.hasVideo) {
      this._revealOptions();
      return;
    }
    if (this._optionsPopTimer) clearTimeout(this._optionsPopTimer);
    this._optionsPopTimer = setTimeout(() => {
      this._optionsPopTimer = null;
      this._revealOptions();
    }, 1200);
  },

  restartTree() {
    const tree = this.data.activeTree;
    if (!tree) return;
    this._history = [];
    this._reportSteps = [];
    this._reportSubmitted = false;
    this._loadAndEnterTree(tree._id || tree.key, false);
  },

  returnToList() {
    this._pauseVideo();
    this._history = [];
    this._nodeMap = {};
    this._reportSteps = [];
    this._reportSubmitted = false;
    this._pendingOption = null;
    this._optionsRevealed = false;
    if (this.data.lockedTree) {
      pageBack.goBack({ preferProducts: false, fallback: 'hub' });
      return;
    }
    this.setData({
      activeTree: null,
      currentNode: null,
      historyCount: 0,
      stepIndex: 1,
      errorText: '',
      hasVideo: false,
      videoEnded: false,
      videoPlaying: false,
      showOptions: false,
      optionsPop: false,
      sheetVisible: false,
      sheetMounted: false,
      sheetAnimIn: false,
      recordMode: false,
      pendingAnswerLabel: '',
      recordTempPath: '',
      displayTitle: '',
      displayTitleLines: [],
      stepGuide: '',
      stepBody: '',
      keyPointsView: [],
      footerOptions: [],
      stepCode: '01',
      stepProgressPct: 40,
      pageTitle: '自助排查'
    });
    if (!this.data.trees.length) this.loadTrees();
  },

  async onResultAction() {
    const node = this.data.currentNode;
    if (!node || node.type !== 'result') return;
    await this._submitReportIfNeeded();
    // 两种结束都直接离开：正常结束 / 信息已提交售后
    if (this.data.lockedTree) {
      pageBack.goBack({ preferProducts: false, fallback: 'hub' });
      return;
    }
    this.returnToList();
  },

  retryLoad() {
    if (this._initialTreeId || this.data.activeTree) {
      this._loadAndEnterTree(
        this._initialTreeId || this.data.activeTree._id || this.data.activeTree.key,
        false
      );
    } else {
      this.loadTrees();
    }
  },

  _pauseVideo() {
    try {
      const context = wx.createVideoContext('troubleshoot-video', this);
      if (context && context.pause) context.pause();
    } catch (e) {}
  },

  goBack() {
    if (this.data.currentNode) {
      if (this._history.length) {
        this.previousStep();
        return;
      }
      if (this.data.lockedTree) {
        pageBack.goBack({ preferProducts: false, fallback: 'hub' });
        return;
      }
      this.returnToList();
      return;
    }
    pageBack.goBack({ preferProducts: false, fallback: 'hub' });
  },

  onBackPress() {
    this.goBack();
    return true;
  }
});
