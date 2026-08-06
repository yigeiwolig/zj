const cosUpload = require('../../../utils/cosUpload.js');
const pageBack = require('../../../utils/pageBack.js');

function callManage(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'troubleshootManage',
    data: { action, ...data },
    config: { timeout: 20000 }
  }).then((res) => (res && res.result) || { ok: false, errMsg: '无返回' });
}

function optionsToText(options) {
  return (options || []).map((option) => {
    const target = option.nextTreeKey ? `tree:${option.nextTreeKey}` : option.nextNodeId;
    return `${option.label} | ${target || ''}`;
  }).join('\n');
}

function parseOptions(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    const label = parts[0] || '';
    const target = parts[1] || '';
    return {
      label,
      nextTreeKey: target.startsWith('tree:') ? target.slice(5).trim() : '',
      nextNodeId: target.startsWith('tree:') ? '' : target
    };
  }).filter((option) => option.label && (option.nextNodeId || option.nextTreeKey));
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    loading: true,
    saving: false,
    errorText: '',
    trees: [],
    selectedTree: null,
    nodes: [],
    showTreeForm: false,
    treeForm: {},
    showNodeForm: false,
    nodeForm: {},
    nodeTypeRange: ['guide', 'choice', 'result'],
    nodeResultRange: ['ok', 'goto_repair', 'fail'],
    nodeOptionsText: '',
    nodeTempVideoPath: ''
  },

  onLoad() {
    this._calcNav();
    this.loadTrees();
  },

  _calcNav() {
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const statusBarHeight = info.statusBarHeight || 20;
      this.setData({
        statusBarHeight,
        navBarHeight: (menu.top - statusBarHeight) * 2 + menu.height
      });
    } catch (e) {}
  },

  _toast(title, icon = 'none') {
    wx.showToast({ title, icon, duration: 2200 });
  },

  async loadTrees(selectId) {
    this.setData({ loading: true, errorText: '' });
    try {
      const result = await callManage('adminListTrees');
      if (!result.ok) throw new Error(result.errMsg || '加载失败');
      const trees = result.list || [];
      const currentId = selectId || (this.data.selectedTree && this.data.selectedTree._id);
      const selected = trees.find((tree) => tree._id === currentId) || null;
      this.setData({ trees, loading: false, selectedTree: selected });
      if (selected) await this.loadTreeDetail(selected._id);
    } catch (e) {
      this.setData({ loading: false, errorText: (e && e.message) || '加载失败' });
    }
  },

  async selectTree(e) {
    const id = String((e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
    if (!id) return;
    await this.loadTreeDetail(id);
  },

  async loadTreeDetail(treeId) {
    this.setData({ loading: true, errorText: '' });
    try {
      const result = await callManage('adminGetTree', { treeId });
      if (!result.ok) throw new Error(result.errMsg || '加载失败');
      this.setData({
        loading: false,
        selectedTree: result.tree,
        nodes: result.nodes || []
      });
    } catch (e) {
      this.setData({ loading: false, errorText: (e && e.message) || '加载失败' });
    }
  },

  openAddTree() {
    this.setData({
      showTreeForm: true,
      treeForm: {
        _id: '',
        key: '',
        title: '',
        subtitle: '',
        entryNodeId: '',
        modelTagsText: '',
        sort: 0,
        enabled: true
      }
    });
  },

  openEditTree() {
    const tree = this.data.selectedTree;
    if (!tree) return;
    this.setData({
      showTreeForm: true,
      treeForm: {
        ...tree,
        modelTagsText: (tree.modelTags || []).join('，')
      }
    });
  },

  onTreeInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`treeForm.${field}`]: e.detail.value });
  },

  onTreeEnabled(e) {
    this.setData({ 'treeForm.enabled': !!e.detail.value });
  },

  closeTreeForm() {
    if (this.data.saving) return;
    this.setData({ showTreeForm: false });
  },

  async saveTree() {
    if (this.data.saving) return;
    const form = this.data.treeForm || {};
    if (!String(form.title || '').trim()) {
      this._toast('请填写主题名称');
      return;
    }
    this.setData({ saving: true });
    try {
      const result = await callManage('saveTree', {
        tree: {
          _id: form._id || '',
          key: form.key || '',
          title: form.title,
          subtitle: form.subtitle,
          entryNodeId: form.entryNodeId,
          modelTags: String(form.modelTagsText || '').split(/[,，\n]/).filter(Boolean),
          sort: Number(form.sort) || 0,
          enabled: form.enabled !== false
        }
      });
      if (!result.ok) throw new Error(result.errMsg || '保存失败');
      this.setData({ showTreeForm: false });
      this._toast('主题已保存', 'success');
      await this.loadTrees(result.treeId);
    } catch (e) {
      this._toast((e && e.message) || '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  async deleteTree() {
    const tree = this.data.selectedTree;
    if (!tree) return;
    const modal = await new Promise((resolve) => {
      wx.showModal({
        title: '删除排查主题',
        content: `将同时删除「${tree.title}」及其全部节点，且不可恢复。`,
        confirmText: '删除',
        confirmColor: '#d93025',
        success: resolve,
        fail: () => resolve({ confirm: false })
      });
    });
    if (!modal.confirm) return;
    const result = await callManage('removeTree', { treeId: tree._id });
    if (!result.ok) {
      this._toast(result.errMsg || '删除失败');
      return;
    }
    this.setData({ selectedTree: null, nodes: [] });
    this._toast('已删除', 'success');
    this.loadTrees();
  },

  openAddNode() {
    const tree = this.data.selectedTree;
    if (!tree) {
      this._toast('请先选择主题');
      return;
    }
    this.setData({
      showNodeForm: true,
      nodeForm: {
        _id: '',
        treeId: tree._id,
        type: 'choice',
        title: '',
        body: '',
        media: { type: 'video', url: '', poster: '' },
        result: 'ok',
        resultCta: '',
        sort: (this.data.nodes.length + 1) * 10
      },
      nodeOptionsText: '',
      nodeTempVideoPath: ''
    });
  },

  openEditNode(e) {
    const id = String((e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
    const node = (this.data.nodes || []).find((item) => item._id === id);
    if (!node) return;
    this.setData({
      showNodeForm: true,
      nodeForm: {
        ...node,
        media: { ...(node.media || { type: 'video', url: '', poster: '' }) }
      },
      nodeOptionsText: optionsToText(node.options),
      nodeTempVideoPath: ''
    });
  },

  onNodeInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`nodeForm.${field}`]: e.detail.value });
  },

  onNodeTypeChange(e) {
    const values = ['guide', 'choice', 'result'];
    this.setData({ 'nodeForm.type': values[Number(e.detail.value)] || 'choice' });
  },

  onNodeResultChange(e) {
    const values = ['ok', 'goto_repair', 'fail'];
    this.setData({ 'nodeForm.result': values[Number(e.detail.value)] || 'ok' });
  },

  onNodeOptionsInput(e) {
    this.setData({ nodeOptionsText: e.detail.value });
  },

  chooseNodeVideo() {
    if (!wx.chooseMedia) {
      this._toast('当前环境不支持选择视频');
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 300,
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file && file.tempFilePath) {
          this.setData({ nodeTempVideoPath: file.tempFilePath });
        }
      }
    });
  },

  clearNodeVideo() {
    this.setData({
      nodeTempVideoPath: '',
      'nodeForm.media.url': ''
    });
  },

  closeNodeForm() {
    if (this.data.saving) return;
    this.setData({ showNodeForm: false, nodeTempVideoPath: '' });
  },

  async saveNode() {
    if (this.data.saving) return;
    const form = this.data.nodeForm || {};
    if (!String(form.title || '').trim()) {
      this._toast('请填写节点标题');
      return;
    }
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中', mask: true });
    try {
      let videoUrl = (form.media && form.media.url) || '';
      if (this.data.nodeTempVideoPath) {
        videoUrl = await cosUpload.uploadVideoToCos(
          this.data.nodeTempVideoPath,
          `troubleshoot/videos/${form.treeId}`
        );
      }
      const result = await callManage('saveNode', {
        node: {
          ...form,
          media: {
            type: 'video',
            url: videoUrl,
            poster: (form.media && form.media.poster) || ''
          },
          options: form.type === 'result' ? [] : parseOptions(this.data.nodeOptionsText)
        }
      });
      if (!result.ok) throw new Error(result.errMsg || '保存失败');
      this.setData({ showNodeForm: false, nodeTempVideoPath: '' });
      this._toast('节点已保存', 'success');
      await this.loadTreeDetail(form.treeId);
    } catch (e) {
      this._toast((e && e.message) || '保存失败');
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  async deleteNode(e) {
    const id = String((e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
    const node = (this.data.nodes || []).find((item) => item._id === id);
    if (!node) return;
    const modal = await new Promise((resolve) => {
      wx.showModal({
        title: '删除节点',
        content: `确认删除「${node.title}」？请同时检查其他选项是否仍指向该节点。`,
        confirmText: '删除',
        confirmColor: '#d93025',
        success: resolve,
        fail: () => resolve({ confirm: false })
      });
    });
    if (!modal.confirm) return;
    const result = await callManage('removeNode', { nodeId: id });
    if (!result.ok) {
      this._toast(result.errMsg || '删除失败');
      return;
    }
    this._toast('节点已删除', 'success');
    this.loadTreeDetail(this.data.selectedTree._id);
  },

  previewTree() {
    const tree = this.data.selectedTree;
    if (!tree) return;
    wx.navigateTo({
      url: `/package-extra/pages/troubleshoot/troubleshoot?tree=${encodeURIComponent(tree._id)}`
    });
  },

  goBack() {
    pageBack.popOrHub();
  }
});
