const pageBack = require('../../../utils/pageBack.js');

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
    loading: true,
    model: '',
    trees: [],
    activeTree: null,
    currentNode: null,
    historyCount: 0,
    errorText: '',
    hasVideo: false,
    videoEnded: false,
    showOptions: true,
    videoSession: 0
  },

  onLoad(options = {}) {
    this._calcNav();
    this._nodeMap = {};
    this._history = [];
    this._optionsRevealed = false;
    this._initialTreeId = decodeURIComponent(String(options.tree || ''));
    this.setData({ model: decodeURIComponent(String(options.model || '')) });
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
  },

  _calcNav() {
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const statusBarHeight = info.statusBarHeight || 20;
      const navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      this.setData({ statusBarHeight: 20, navBarHeight: 44 });
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

  _enterNode(node, extra = {}) {
    const hasVideo = this._nodeHasPlayableVideo(node);
    const isResult = !!(node && node.type === 'result');
    this._optionsRevealed = isResult || !hasVideo;
    this.setData({
      currentNode: node,
      historyCount: this._history.length,
      hasVideo,
      videoEnded: !hasVideo,
      showOptions: this._optionsRevealed,
      videoSession: (this.data.videoSession || 0) + 1,
      ...extra
    });
  },

  _revealOptions() {
    if (this._optionsRevealed) return;
    if (!this.data.currentNode || this.data.currentNode.type === 'result') {
      this.setData({ videoEnded: true });
      return;
    }
    this._optionsRevealed = true;
    this.setData({
      videoEnded: true,
      showOptions: true
    });
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
      if (!preserveHistory) this._history = [];
      this._enterNode(first, {
        loading: false,
        activeTree: result.tree,
        errorText: ''
      });
    } catch (e) {
      this.setData({
        loading: false,
        errorText: (e && e.message) || '排查主题加载失败'
      });
    }
  },

  async chooseOption(e) {
    if (!this.data.showOptions) {
      this._toast('请先看完演示视频');
      return;
    }
    const index = Number(e.currentTarget.dataset.index);
    const node = this.data.currentNode;
    const option = node && Array.isArray(node.options) ? node.options[index] : null;
    if (!option) return;
    this._pauseVideo();
    this._history.push({
      tree: this.data.activeTree,
      node,
      nodeMap: this._nodeMap
    });
    if (option.nextTreeKey) {
      await this._loadAndEnterTree(option.nextTreeKey, true);
      return;
    }
    const next = this._nodeMap[option.nextNodeId];
    if (!next) {
      this._history.pop();
      this._toast('下一步骤尚未配置');
      return;
    }
    this._enterNode(next);
  },

  previousStep() {
    if (!this._history.length) return;
    this._pauseVideo();
    const previous = this._history.pop();
    this._nodeMap = previous.nodeMap || {};
    this._enterNode(previous.node, { activeTree: previous.tree });
  },

  onVideoEnded() {
    this._revealOptions();
  },

  onVideoTimeUpdate(e) {
    if (this._optionsRevealed || !this.data.hasVideo) return;
    const detail = (e && e.detail) || {};
    const currentTime = Number(detail.currentTime) || 0;
    const duration = Number(detail.duration) || 0;
    if (duration > 0.8 && currentTime >= duration - 0.25) {
      this._revealOptions();
    }
  },

  onVideoError() {
    this._revealOptions();
  },

  restartTree() {
    const tree = this.data.activeTree;
    if (!tree) return;
    this._history = [];
    this._loadAndEnterTree(tree._id || tree.key, false);
  },

  returnToList() {
    this._pauseVideo();
    this._history = [];
    this._nodeMap = {};
    this._optionsRevealed = false;
    this.setData({
      activeTree: null,
      currentNode: null,
      historyCount: 0,
      errorText: '',
      hasVideo: false,
      videoEnded: false,
      showOptions: true
    });
    if (!this.data.trees.length) this.loadTrees();
  },

  onResultAction() {
    const node = this.data.currentNode;
    if (!node || node.type !== 'result') return;
    if (node.result === 'goto_repair' || node.result === 'fail') {
      const query = ['serviceType=repair'];
      if (this.data.model) query.push(`model=${encodeURIComponent(this.data.model)}`);
      wx.navigateTo({
        url: `/package-biz/pages/shouhou/shouhou?${query.join('&')}`
      });
      return;
    }
    this.returnToList();
  },

  retryLoad() {
    if (this.data.activeTree) {
      this._loadAndEnterTree(this.data.activeTree._id || this.data.activeTree.key, false);
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
      if (this._history.length) this.previousStep();
      else this.returnToList();
      return;
    }
    pageBack.popOrHub();
  },

  onBackPress() {
    this.goBack();
    return true;
  }
});
