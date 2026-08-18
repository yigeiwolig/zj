const cosUpload = require('../../../utils/cosUpload.js');
const pageBack = require('../../../utils/pageBack.js');

function callManage(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'troubleshootManage',
    data: { action, ...data },
    config: { timeout: 20000 }
  }).then((res) => (res && res.result) || { ok: false, errMsg: '无返回' });
}

function stampKeyPointRows(list) {
  const src = Array.isArray(list) ? list : [];
  return src.slice(0, 8).map((item, i) => {
    if (typeof item === 'string') {
      return {
        _rowId: `kp_${Date.now()}_${i}`,
        title: String(item || ''),
        detail: ''
      };
    }
    return {
      _rowId: (item && item._rowId) || `kp_${Date.now()}_${i}`,
      title: String((item && (item.title || item.text)) || ''),
      detail: String((item && item.detail) || '')
    };
  });
}

function buildAnswerRows(options) {
  const rows = (options || []).slice(0, 4).map((opt) => ({
    label: (opt && opt.label) || '',
    nextNodeId: (opt && opt.nextNodeId) || '',
    nextTreeKey: (opt && opt.nextTreeKey) || '',
    requireUserVideo: !!(opt && opt.requireUserVideo)
  }));
  while (rows.length < 2) {
    rows.push({ label: '', nextNodeId: '', nextTreeKey: '', requireUserVideo: false });
  }
  return rows;
}

/** 从上往下的分支树：根在上，答案左右分叉往下 */
function buildFlowTree(tree, nodes) {
  // 单卡不宜太宽：两支并排 ≈ 2*CARD_W+GAP，再接近屏宽就会像「飞到两边」
  const CARD_W = 280;
  const GAP = 16;
  const nodeMap = {};
  (nodes || []).forEach((n) => {
    if (n && n._id) nodeMap[n._id] = n;
  });
  const entryId = (tree && tree.entryNodeId) || ((nodes && nodes[0] && nodes[0]._id) || '');
  const seen = new Set();

  function build(id, depth) {
    if (!id || !nodeMap[id] || seen.has(id) || depth > 10) return null;
    seen.add(id);
    const node = nodeMap[id];
    const opts = Array.isArray(node.options) ? node.options : [];
    const branches = opts.map((opt, optIndex) => {
      const nextId = (opt && opt.nextNodeId) || '';
      const child = nextId ? build(nextId, depth + 1) : null;
      const effectiveNextId = child ? nextId : '';
      return {
        label: (opt && opt.label) || `答案${optIndex + 1}`,
        optIndex,
        nextNodeId: effectiveNextId,
        nextTitle: child ? child.title : '未连接',
        linked: !!child,
        child,
        _tw: CARD_W
      };
    });
    return {
      _id: node._id,
      title: String(node.title || '').replace(/^【事例】/, ''),
      body: node.body,
      type: node.type,
      options: node.options || [],
      media: node.media || {},
      result: node.result,
      resultCta: node.resultCta,
      _typeLabel: node.type === 'result' ? '结束' : '步骤',
      _isEntry: id === entryId,
      _depth: depth,
      branches,
      _tw: CARD_W,
      _gap: GAP
    };
  }

  /** 自底向上量宽：子树多宽，父级就多宽，兄弟靠紧 */
  function measure(node) {
    if (!node) return CARD_W;
    const branches = node.branches || [];
    if (node.type === 'result' || !branches.length) {
      node._tw = CARD_W;
      node._gap = 0;
      return CARD_W;
    }
    let sum = 0;
    branches.forEach((br, i) => {
      const w = br.child ? measure(br.child) : CARD_W;
      br._tw = w;
      br._isFirst = i === 0;
      br._isLast = i === branches.length - 1;
      sum += w;
      if (i > 0) sum += GAP;
    });
    node._tw = Math.max(CARD_W, sum);
    node._gap = GAP;
    node._branchCount = branches.length;
    // 横梁：从第一支中心到最后一支中心，把父卡竖线接到各子支
    if (branches.length > 1) {
      const firstW = branches[0]._tw || CARD_W;
      const lastW = branches[branches.length - 1]._tw || CARD_W;
      node._railLeft = firstW / 2;
      node._railW = Math.max(0, node._tw - firstW / 2 - lastW / 2);
    } else {
      node._railLeft = 0;
      node._railW = 0;
    }
    return node._tw;
  }

  let root = null;
  if (entryId && nodeMap[entryId]) {
    root = build(entryId, 0);
  } else if (nodes && nodes[0]) {
    root = build(nodes[0]._id, 0);
    if (root) root._isEntry = true;
  }
  if (root) measure(root);

  const orphans = (nodes || [])
    .filter((n) => n && n._id && !seen.has(n._id))
    .map((node) => {
      const item = {
        _id: node._id,
        title: node.title,
        type: node.type,
        options: node.options || [],
        media: node.media || {},
        result: node.result,
        resultCta: node.resultCta,
        body: node.body,
        _typeLabel: node.type === 'result' ? '结束' : '步骤',
        _isEntry: false,
        _orphan: true,
        branches: (node.options || []).map((opt, optIndex) => ({
          label: opt.label || `答案${optIndex + 1}`,
          optIndex,
          nextNodeId: opt.nextNodeId || '',
          nextTitle: (nodeMap[opt.nextNodeId] && nodeMap[opt.nextNodeId].title) || '未连接',
          linked: !!opt.nextNodeId,
          child: null,
          _tw: CARD_W
        })),
        _tw: CARD_W,
        _gap: GAP
      };
      measure(item);
      return item;
    });

  return { root, orphans };
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    loading: true,
    saving: false,
    errorText: '',
    lockedTree: false,
    pageTitle: '排查方案管理',
    trees: [],
    selectedTree: null,
    nodes: [],
    flowTree: null,
    flowOrphans: [],
    connectMode: false,
    connectPhase: '', // source | target
    connectHint: '',
    connectSourceId: '',
    connectOptIndex: -1,
    connectSourceLabel: '',
    showTreeForm: false,
    treeForm: {},
    showNodeForm: false,
    nodeFormAnimIn: false,
    nodeForm: {},
    nodeSheetDragging: false,
    nodeSheetDragStyle: '',
    scrollIntoView: '',
    stepKind: 'ask', // ask | end
    answerRows: [
      { label: '', nextNodeId: '', nextTreeKey: '' },
      { label: '', nextNodeId: '', nextTreeKey: '' }
    ],
    keyPointRows: [],
    nextStepNames: ['（自动新建下一步）'],
    nextStepIds: [''],
    resultKindIndex: 0,
    resultKindLabels: ['正常结束（感谢选择 MT）', '提交售后（等待处理）'],
    nodeTempVideoPath: '',
    showPreview: false
  },

  onLoad(options = {}) {
    this._calcNav();
    this._nodeMap = {};
    this._initialTreeId = decodeURIComponent(String(options.tree || ''));
    this._questionTitle = decodeURIComponent(String(options.title || ''));
    if (this._initialTreeId) {
      this.setData({
        lockedTree: true,
        pageTitle: this._questionTitle || '排查流程'
      });
      this.loadTreeDetail(this._initialTreeId);
    } else {
      this.loadTrees();
    }
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

  _refreshFlowAndPreview(tree, nodes) {
    const built = buildFlowTree(tree, nodes);
    this._nodeMap = {};
    (nodes || []).forEach((n) => {
      if (n && n._id) this._nodeMap[n._id] = n;
    });
    this.setData({
      flowTree: built.root,
      flowOrphans: built.orphans || []
    });
  },

  toggleConnectMode() {
    if (this.data.connectMode) {
      this._resetConnect();
      return;
    }
    this.setData({
      connectMode: true,
      connectPhase: 'source',
      connectHint: '① 先点卡片上的一个答案',
      connectSourceId: '',
      connectOptIndex: -1,
      connectSourceLabel: ''
    });
  },

  _resetConnect() {
    this.setData({
      connectMode: false,
      connectPhase: '',
      connectHint: '',
      connectSourceId: '',
      connectOptIndex: -1,
      connectSourceLabel: ''
    });
  },

  onFlowCardTap(e) {
    const id = String(
      (e && e.detail && e.detail.id) ||
      (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) ||
      ''
    );
    if (!id) return;
    if (this.data.connectMode && this.data.connectPhase === 'target') {
      this._finishConnect(id);
      return;
    }
    if (this.data.connectMode) {
      this._toast('请先点一个答案，再点目标步骤');
      return;
    }
    this.openEditNode({ currentTarget: { dataset: { id } } });
  },

  onBranchTap(e) {
    const detail = (e && e.detail) || {};
    const ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const nodeId = String(detail.nodeId || ds.nodeId || '');
    const optIndex = Number(
      detail.optIndex !== undefined ? detail.optIndex : ds.optIndex
    );
    const label = String(detail.label || ds.label || '');
    if (!nodeId || Number.isNaN(optIndex)) return;

    if (!this.data.connectMode) {
      this.openEditNode({ currentTarget: { dataset: { id: nodeId } } });
      return;
    }

    if (this.data.connectPhase === 'source' || this.data.connectPhase === 'target') {
      this.setData({
        connectPhase: 'target',
        connectSourceId: nodeId,
        connectOptIndex: optIndex,
        connectSourceLabel: label,
        connectHint: `② 已选「${label || '答案'}」，再点要接到的卡片`
      });
      this._toast('再点目标步骤');
    }
  },

  async onEmptySlotTap(e) {
    if (this.data.connectMode) {
      this._toast('请先取消连接');
      return;
    }
    const detail = (e && e.detail) || {};
    const parentId = String(detail.nodeId || '');
    const optIndex = Number(detail.optIndex);
    const answerLabel = String(detail.label || '');
    if (!parentId || Number.isNaN(optIndex)) return;
    const parent = this._nodeMap[parentId];
    const tree = this.data.selectedTree;
    if (!parent || !tree) return;

    let newId = '';
    await this._withLoading('添加中', async () => {
      newId = await this._createChildUnderAnswer(parent, optIndex, answerLabel);
      await this.loadTreeDetail(tree._id, { quiet: true });
    });
    if (newId) {
      this._toast('已往下加一步', 'success');
      this._focusNode(newId);
      this.openEditNode({ currentTarget: { dataset: { id: newId } } });
    }
  },

  /** 非结束、还没答案：写出两个答案并左右分叉 */
  async onExtendNode(e) {
    if (this.data.connectMode) {
      this._toast('请先取消连接');
      return;
    }
    const id = String((e && e.detail && e.detail.id) || '');
    const node = this._nodeMap[id] || (this.data.nodes || []).find((n) => n && n._id === id);
    const tree = this.data.selectedTree;
    if (!id || !node || !tree) return;
    if (node.type === 'result') {
      this._toast('结束步骤不能再往下加，请先关掉「最后一步」');
      return;
    }

    await this._withLoading('添加中', async () => {
      let options = Array.isArray(node.options) ? node.options.map((o) => ({ ...o })) : [];
      if (!options.length) {
        options = [
          { label: '好了', nextNodeId: '', nextTreeKey: '' },
          { label: '还不行', nextNodeId: '', nextTreeKey: '' }
        ];
        const prep = await callManage('saveNode', {
          node: this._buildNodeSaveData(node, {
            type: 'guide',
            options,
            result: '',
            resultCta: ''
          })
        });
        if (!prep.ok) throw new Error(prep.errMsg || '准备失败');
        const fresh = this._buildNodeSaveData(node, {
          type: 'guide',
          options,
          result: '',
          resultCta: ''
        });
        this._nodeMap[id] = fresh;
        await this._ensureBranchesForAnswers(fresh);
        await this.loadTreeDetail(tree._id, { quiet: true });
        this._focusNode(id);
        this._toast('已生成左右两支', 'success');
        return;
      }

      // 已有答案：给第一个还没接下一步的答案补一支
      const emptyIdx = options.findIndex((o) => o && !o.nextNodeId);
      if (emptyIdx < 0) {
        this._toast('每条答案都已有下一步，可点「再加一个答案」');
        return;
      }
      const parent = this._nodeMap[id];
      const newId = await this._createChildUnderAnswer(
        parent,
        emptyIdx,
        options[emptyIdx].label || `答案${emptyIdx + 1}`
      );
      await this.loadTreeDetail(tree._id, { quiet: true });
      this._focusNode(newId);
      this.openEditNode({ currentTarget: { dataset: { id: newId } } });
    });
  },

  async _finishConnect(targetId) {
    const sourceId = this.data.connectSourceId;
    const optIndex = this.data.connectOptIndex;
    if (!sourceId || optIndex < 0) {
      this._toast('请先选择答案');
      return;
    }
    if (targetId === sourceId) {
      this._toast('不能连到自己');
      return;
    }
    const source = this._nodeMap[sourceId];
    if (!source) {
      this._toast('源步骤不存在');
      return;
    }
    const options = Array.isArray(source.options) ? source.options.map((o) => ({ ...o })) : [];
    while (options.length <= optIndex) {
      options.push({ label: `答案${options.length + 1}`, nextNodeId: '', nextTreeKey: '' });
    }
    options[optIndex] = {
      ...options[optIndex],
      label: options[optIndex].label || this.data.connectSourceLabel || `答案${optIndex + 1}`,
      nextNodeId: targetId,
      nextTreeKey: ''
    };
    this.setData({ saving: true });
    wx.showLoading({ title: '连接中', mask: true });
    try {
      const result = await callManage('saveNode', {
        node: this._buildNodeSaveData(source, {
          type: source.type === 'result' ? 'guide' : source.type,
          options
        })
      });
      if (!result.ok) throw new Error(result.errMsg || '连接失败');
      this._toast('已连接', 'success');
      this._resetConnect();
      await this.loadTreeDetail(source.treeId || (this.data.selectedTree && this.data.selectedTree._id));
    } catch (err) {
      this._toast((err && err.message) || '连接失败');
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
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
    if (this.data.lockedTree) return;
    const id = String((e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
    if (!id) return;
    await this.loadTreeDetail(id);
  },

  async loadTreeDetail(treeId, options = {}) {
    const quiet = !!(options && options.quiet);
    if (!quiet) this.setData({ loading: true, errorText: '' });
    try {
      let result = await callManage('adminGetTree', { treeId });
      if (!result.ok) throw new Error(result.errMsg || '加载失败');
      // 编辑过程中的刷新不要再跑清理，避免刚加的步骤被误伤或卡住
      if (!quiet) {
        const pruned = await this._pruneAutoStubs(result.nodes || []);
        if (pruned) {
          result = await callManage('adminGetTree', { treeId });
          if (!result.ok) throw new Error(result.errMsg || '加载失败');
        }
      }
      this.setData({
        loading: false,
        selectedTree: result.tree,
        nodes: result.nodes || [],
        pageTitle: this._questionTitle || (result.tree && result.tree.title) || '排查流程'
      });
      this._refreshFlowAndPreview(result.tree, result.nodes || []);
    } catch (e) {
      this.setData({ loading: false, errorText: (e && e.message) || '加载失败' });
    }
  },

  _withLoading(title, fn) {
    if (this._busy) return Promise.resolve();
    this._busy = true;
    this.setData({ saving: true });
    wx.showLoading({ title: title || '处理中', mask: true });
    return Promise.resolve()
      .then(() => fn())
      .catch((err) => {
        this._toast((err && err.message) || '操作失败');
      })
      .then(() => {
        wx.hideLoading();
        this._busy = false;
        this.setData({ saving: false });
      });
  },

  /** 只创建子步骤（空白步骤，由用户再填两个答案） */
  async _createChildNode(treeId) {
    const createRes = await callManage('saveNode', {
      node: {
        treeId,
        type: 'guide',
        title: '请填写这一步',
        body: '',
        media: { type: 'video', url: '', poster: '' },
        options: [],
        keyPoints: [],
        result: '',
        resultCta: '',
        sort: (this.data.nodes.length + 1) * 10 + Math.floor(Math.random() * 8)
      }
    });
    if (!createRes.ok) throw new Error(createRes.errMsg || '创建失败');
    return createRes.nodeId;
  },

  /** 给指定答案（或全部未连接答案）长出分支卡片 */
  async _ensureBranchesForAnswers(parent, onlyIndexes) {
    if (!parent || parent.type === 'result') return parent;
    const tree = this.data.selectedTree;
    if (!tree) return parent;
    let options = Array.isArray(parent.options) ? parent.options.map((o) => ({ ...o })) : [];
    let dirty = false;
    const allow = onlyIndexes
      ? new Set(onlyIndexes.map((n) => Number(n)))
      : null;
    for (let i = 0; i < options.length; i++) {
      if (allow && !allow.has(i)) continue;
      const label = String((options[i] && options[i].label) || '').trim();
      if (!label) continue;
      if (options[i].nextNodeId || options[i].nextTreeKey) continue;
      const newId = await this._createChildNode(tree._id);
      options[i] = {
        ...options[i],
        label,
        nextNodeId: newId,
        nextTreeKey: ''
      };
      dirty = true;
    }
    if (!dirty) return parent;
    const linkRes = await callManage('saveNode', {
      node: this._buildNodeSaveData(parent, {
        type: parent.type === 'result' ? 'guide' : (parent.type || 'guide'),
        options,
        result: '',
        resultCta: ''
      })
    });
    if (!linkRes.ok) throw new Error(linkRes.errMsg || '连接分支失败');
    return { ...parent, options, keyPoints: parent.keyPoints || [] };
  },

  /** 在某个答案下创建下一步并连上 */
  async _createChildUnderAnswer(parent, optIndex, answerLabel) {
    const tree = this.data.selectedTree;
    if (!parent || !tree) throw new Error('找不到当前步骤');
    const newId = await this._createChildNode(tree._id);
    const options = Array.isArray(parent.options) ? parent.options.map((o) => ({ ...o })) : [];
    while (options.length <= optIndex) {
      options.push({
        label: `答案${options.length + 1}`,
        nextNodeId: '',
        nextTreeKey: ''
      });
    }
    options[optIndex] = {
      ...options[optIndex],
      label: options[optIndex].label || answerLabel || `答案${optIndex + 1}`,
      nextNodeId: newId,
      nextTreeKey: ''
    };
    const linkRes = await callManage('saveNode', {
      node: this._buildNodeSaveData(parent, {
        type: parent.type === 'result' ? 'guide' : (parent.type || 'guide'),
        options,
        result: '',
        resultCta: ''
      })
    });
    if (!linkRes.ok) throw new Error(linkRes.errMsg || '连接失败');
    return newId;
  },

  _focusNode(nodeId) {
    if (!nodeId) return;
    this.setData({ scrollIntoView: '' });
    setTimeout(() => {
      this.setData({ scrollIntoView: `tv-${nodeId}` });
    }, 80);
  },

  openAddTree() {
    if (this.data.lockedTree) return;
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
      if (this.data.lockedTree) await this.loadTreeDetail(result.treeId || form._id);
      else await this.loadTrees(result.treeId);
    } catch (e) {
      this._toast((e && e.message) || '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  async deleteTree() {
    if (this.data.lockedTree) {
      this._toast('请在帮助中心问题列表删除');
      return;
    }
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
    this.setData({ selectedTree: null, nodes: [], flowTree: null, flowOrphans: [] });
    this._toast('已删除', 'success');
    this.loadTrees();
  },

  _buildNextStepPicker(excludeId) {
    const names = ['（自动新建下一步）'];
    const ids = [''];
    (this.data.nodes || []).forEach((node) => {
      if (!node || !node._id || node._id === excludeId) return;
      names.push(node.title || '未命名步骤');
      ids.push(node._id);
    });
    return { nextStepNames: names, nextStepIds: ids };
  },

  _answerRowsWithPickerIndex(rows, nextStepIds) {
    return (rows || []).map((row) => {
      const nextId = row.nextNodeId || '';
      let pickerIndex = 0;
      if (nextId) {
        const idx = nextStepIds.indexOf(nextId);
        pickerIndex = idx >= 0 ? idx : 0;
      }
      return { ...row, pickerIndex };
    });
  },

  _buildNodeSaveData(node, extra = {}) {
    const src = node || {};
    return {
      _id: src._id || '',
      treeId: src.treeId,
      type: extra.type != null ? extra.type : src.type,
      title: src.title,
      body: src.body,
      media: extra.media || src.media || { type: 'video', url: '', poster: '' },
      options: extra.options != null ? extra.options : (src.options || []),
      keyPoints: extra.keyPoints != null ? extra.keyPoints : (src.keyPoints || []),
      result: extra.result != null ? extra.result : (src.result || ''),
      resultCta: extra.resultCta != null ? extra.resultCta : (src.resultCta || ''),
      sort: src.sort || 0
    };
  },

  _collectKeyPoints() {
    const rows = this.data.keyPointRows || [];
    const draft = this._keyPointDraft || [];
    return rows.map((row, i) => {
      const d = draft[i] || {};
      return {
        title: String(d.title != null ? d.title : ((row && row.title) || '')).trim(),
        detail: String(d.detail != null ? d.detail : ((row && row.detail) || '')).trim()
      };
    }).filter((row) => row.title || row.detail).slice(0, 8);
  },

  _collectAnswerRows() {
    const rows = this.data.answerRows || [];
    const draft = this._answerDraft || [];
    return rows.map((row, i) => {
      const d = draft[i] || {};
      return {
        ...row,
        label: String(d.label != null ? d.label : ((row && row.label) || ''))
      };
    });
  },

  _openNodeForm(patch) {
    if (this._nodeFormTimer) clearTimeout(this._nodeFormTimer);
    this._sheetDrag = null;
    this._keyPointDraft = [];
    this._answerDraft = [];
    this.setData({
      ...patch,
      showNodeForm: true,
      nodeFormAnimIn: false,
      nodeSheetDragging: false,
      nodeSheetDragStyle: ''
    });
    wx.nextTick(() => {
      this._nodeFormTimer = setTimeout(() => {
        this.setData({ nodeFormAnimIn: true });
      }, 20);
    });
  },

  openAddNode() {
    const tree = this.data.selectedTree;
    if (!tree) {
      this._toast('请先选择主题');
      return;
    }
    const picker = this._buildNextStepPicker('');
    const answerRows = this._answerRowsWithPickerIndex(
      [
        { label: '好了', nextNodeId: '', nextTreeKey: '', requireUserVideo: false },
        { label: '还不行', nextNodeId: '', nextTreeKey: '', requireUserVideo: false }
      ],
      picker.nextStepIds
    );
    this._openNodeForm({
      stepKind: 'ask',
      resultKindIndex: 0,
      nodeForm: {
        _id: '',
        treeId: tree._id,
        type: 'guide',
        title: '',
        body: '',
        media: { type: 'video', url: '', poster: '' },
        result: 'ok',
        resultCta: '',
        sort: (this.data.nodes.length + 1) * 10
      },
      answerRows,
      keyPointRows: stampKeyPointRows([]),
      ...picker,
      nodeTempVideoPath: ''
    });
  },

  openEditNode(e) {
    const id = String((e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
    const node = (this.data.nodes || []).find((item) => item._id === id) || this._nodeMap[id];
    if (!node) return;
    const stepKind = node.type === 'result' ? 'end' : 'ask';
    const picker = this._buildNextStepPicker(id);
    const answerRows = this._answerRowsWithPickerIndex(buildAnswerRows(node.options), picker.nextStepIds);
    const rawPoints = Array.isArray(node.keyPoints) ? node.keyPoints : [];
    const keyPointRows = stampKeyPointRows(rawPoints);
    let resultKindIndex = 0;
    if (node.result === 'goto_repair' || node.result === 'fail') resultKindIndex = 1;
    this._openNodeForm({
      stepKind,
      resultKindIndex,
      nodeForm: {
        ...node,
        title: String(node.title || '').replace(/^【事例】/, ''),
        media: { ...(node.media || { type: 'video', url: '', poster: '' }) }
      },
      answerRows,
      keyPointRows,
      ...picker,
      nodeTempVideoPath: ''
    });
  },

  onNodeInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`nodeForm.${field}`]: e.detail.value });
  },

  onEndSwitch(e) {
    this.setData({ stepKind: e.detail.value ? 'end' : 'ask' });
  },

  onStepKindTap(e) {
    const kind = e.currentTarget.dataset.kind;
    this.setData({ stepKind: kind === 'end' ? 'end' : 'ask' });
  },

  onEndStepSwitch(e) {
    const on = !!(e && e.detail && e.detail.value);
    this.setData({
      stepKind: on ? 'end' : 'ask',
      resultKindIndex: on ? (Number(this.data.resultKindIndex) || 0) : this.data.resultKindIndex
    });
  },

  onStepKindChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ stepKind: idx === 1 ? 'end' : 'ask' });
  },

  onResultKindChange(e) {
    this.setData({ resultKindIndex: Number(e.detail.value) || 0 });
  },

  onResultKindTap(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx)) return;
    this.setData({ resultKindIndex: idx === 1 ? 1 : 0 });
  },

  onAnswerLabelInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const value = e.detail.value;
    if (!this._answerDraft) this._answerDraft = [];
    if (!this._answerDraft[index]) this._answerDraft[index] = {};
    this._answerDraft[index].label = value;
    this.setData({ [`answerRows[${index}].label`]: value });
  },

  onAnswerRequireVideo(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({ [`answerRows[${index}].requireUserVideo`]: !!e.detail.value });
  },

  onKeyPointInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = e.currentTarget.dataset.field || 'title';
    if (Number.isNaN(index)) return;
    const value = e.detail.value;
    if (!this._keyPointDraft) this._keyPointDraft = [];
    if (!this._keyPointDraft[index]) this._keyPointDraft[index] = {};
    this._keyPointDraft[index][field] = value;
    this.setData({ [`keyPointRows[${index}].${field}`]: value });
  },

  onAddKeyPointRow() {
    const rows = (this.data.keyPointRows || []).slice();
    if (rows.length >= 8) {
      this._toast('最多 8 个关联点');
      return;
    }
    rows.push({ _rowId: `kp_${Date.now()}_${rows.length}`, title: '', detail: '' });
    this.setData({ keyPointRows: rows });
  },

  onRemoveKeyPointRow(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const rows = (this.data.keyPointRows || []).slice();
    rows.splice(index, 1);
    if (this._keyPointDraft) this._keyPointDraft.splice(index, 1);
    this.setData({ keyPointRows: rows });
  },

  onAddAnswerRow() {
    const rows = (this.data.answerRows || []).slice();
    if (rows.length >= 4) {
      this._toast('最多 4 个答案');
      return;
    }
    rows.push({ label: '', nextNodeId: '', nextTreeKey: '', requireUserVideo: false, pickerIndex: 0 });
    this.setData({ answerRows: rows });
  },

  onAnswerNextChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const pickerIndex = Number(e.detail.value) || 0;
    const nextNodeId = (this.data.nextStepIds && this.data.nextStepIds[pickerIndex]) || '';
    this.setData({
      [`answerRows[${index}].pickerIndex`]: pickerIndex,
      [`answerRows[${index}].nextNodeId`]: nextNodeId,
      [`answerRows[${index}].nextTreeKey`]: ''
    });
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

  closeNodeForm(force) {
    // 保存中禁止点遮罩关掉；删除后可 force 收起
    if (this.data.saving && !force) return;
    if (this._nodeFormTimer) clearTimeout(this._nodeFormTimer);
    this._sheetDrag = null;
    this.setData({
      nodeFormAnimIn: false,
      nodeSheetDragging: false,
      nodeSheetDragStyle: ''
    });
    this._nodeFormTimer = setTimeout(() => {
      this.setData({ showNodeForm: false, nodeTempVideoPath: '' });
    }, 320);
  },

  onNodeSheetTouchStart(e) {
    if (this.data.saving) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    this._sheetDrag = {
      startY: t.clientY,
      dy: 0,
      active: false
    };
  },

  onNodeSheetTouchMove(e) {
    const drag = this._sheetDrag;
    if (!drag || this.data.saving) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const dy = t.clientY - drag.startY;
    if (!drag.active) {
      if (dy < 8) return;
      drag.active = true;
    }
    const nextDy = Math.max(0, dy);
    drag.dy = nextDy;
    this.setData({
      nodeSheetDragging: true,
      nodeSheetDragStyle: `transform:translateY(${nextDy}px);`
    });
  },

  onNodeSheetTouchEnd() {
    const drag = this._sheetDrag;
    this._sheetDrag = null;
    if (!drag || !drag.active) {
      this.setData({ nodeSheetDragging: false, nodeSheetDragStyle: '' });
      return;
    }
    const threshold = 88;
    if (drag.dy >= threshold) {
      this.closeNodeForm();
      return;
    }
    this.setData({ nodeSheetDragging: false, nodeSheetDragStyle: '' });
  },

  _isAutoStubNode(node) {
    if (!node || node.type === 'result') return false;
    const opts = Array.isArray(node.options) ? node.options : [];
    if (opts.length > 0) return false;
    if (node.media && String(node.media.url || '').trim()) return false;
    // 只清旧版「保存时自动生成」的空壳，不要误删用户新建的下一步
    return String(node.body || '').trim() === '请补充这一步的说明和视频。';
  },

  /** 清掉保存时误自动创建的空壳子节点，恢复「往下加一步」 */
  async _pruneAutoStubs(nodes) {
    const list = nodes || [];
    const stubIds = new Set(list.filter((n) => this._isAutoStubNode(n)).map((n) => n._id));
    if (!stubIds.size) return false;

    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      if (!node || stubIds.has(node._id)) continue;
      const options = Array.isArray(node.options) ? node.options : [];
      let dirty = false;
      const nextOptions = options.map((opt) => {
        if (opt && opt.nextNodeId && stubIds.has(opt.nextNodeId)) {
          dirty = true;
          return { ...opt, nextNodeId: '', nextTreeKey: '' };
        }
        return { ...(opt || {}) };
      });
      if (dirty) {
        await callManage('saveNode', {
          node: this._buildNodeSaveData(node, { options: nextOptions })
        });
      }
    }

    const stubList = Array.from(stubIds);
    for (let i = 0; i < stubList.length; i++) {
      await callManage('removeNode', { nodeId: stubList[i] });
    }
    return true;
  },

  async saveNode() {
    if (this.data.saving) return;
    const form = this.data.nodeForm || {};
    if (!String(form.title || '').trim()) {
      this._toast('请填写这一步的标题');
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

      const isEnd = this.data.stepKind === 'end';
      let options = [];
      if (!isEnd) {
        const rows = this._collectAnswerRows();
        for (let i = 0; i < rows.length; i++) {
          const label = String(rows[i].label || '').trim();
          if (!label) continue;
          options.push({
            label,
            nextNodeId: rows[i].nextNodeId || '',
            nextTreeKey: rows[i].nextTreeKey || '',
            requireUserVideo: !!rows[i].requireUserVideo
          });
        }
        if (options.length < 1) {
          throw new Error('请至少填写一个用户可选答案');
        }
      }

      const keyPoints = isEnd ? [] : this._collectKeyPoints();
      const savedType = isEnd ? 'result' : (form.type === 'choice' ? 'choice' : 'guide');
      const resultKind = this.data.resultKindIndex === 1 ? 'goto_repair' : 'ok';
      const media = {
        type: 'video',
        url: videoUrl,
        poster: (form.media && form.media.poster) || ''
      };
      const result = await callManage('saveNode', {
        node: this._buildNodeSaveData(form, {
          type: savedType,
          media,
          options: isEnd ? [] : options,
          keyPoints,
          result: isEnd ? resultKind : '',
          resultCta: isEnd
            ? (form.resultCta || (resultKind === 'ok' ? '完成' : '完成'))
            : ''
        })
      });
      if (!result.ok) throw new Error(result.errMsg || '保存失败');
      const savedId = result.nodeId || form._id;

      // 非结束：每个答案自动长出对应分支卡片
      if (!isEnd && savedId) {
        const parentAfter = this._buildNodeSaveData(form, {
          type: savedType,
          media,
          options,
          keyPoints,
          result: '',
          resultCta: ''
        });
        parentAfter._id = savedId;
        this._nodeMap[savedId] = parentAfter;
        await this._ensureBranchesForAnswers(parentAfter);
      }

      this.setData({ saving: false });
      this.closeNodeForm();
      this._toast('已保存', 'success');
      await this.loadTreeDetail(form.treeId, { quiet: true });
      this._focusNode(savedId);
      const tree = this.data.selectedTree;
      if (tree && !tree.entryNodeId && savedId) {
        await callManage('saveTree', {
          tree: { ...tree, entryNodeId: savedId }
        });
        await this.loadTreeDetail(form.treeId, { quiet: true });
        this._focusNode(savedId);
      }
    } catch (e) {
      this._toast((e && e.message) || '保存失败');
      this.setData({ saving: false });
    } finally {
      wx.hideLoading();
    }
  },

  async onAddAnswerBranch(e) {
    if (this.data.connectMode) {
      this._toast('请先取消连接');
      return;
    }
    const id = String((e && e.detail && e.detail.id) || '');
    const node = this._nodeMap[id] || (this.data.nodes || []).find((n) => n && n._id === id);
    const tree = this.data.selectedTree;
    if (!id || !node || !tree) return;
    if (node.type === 'result') {
      this._toast('结束步骤不能加答案，请先关掉「最后一步」');
      return;
    }

    await this._withLoading('添加中', async () => {
      let options = Array.isArray(node.options) ? node.options.map((o) => ({ ...o })) : [];
      // 第一次：一次性写好两个答案，并长出左右两支
      if (!options.length) {
        options = [
          { label: '好了', nextNodeId: '', nextTreeKey: '' },
          { label: '还不行', nextNodeId: '', nextTreeKey: '' }
        ];
        const result = await callManage('saveNode', {
          node: this._buildNodeSaveData(node, {
            type: 'guide',
            options,
            result: '',
            resultCta: ''
          })
        });
        if (!result.ok) throw new Error(result.errMsg || '添加失败');
        const parentAfter = this._buildNodeSaveData(node, {
          type: 'guide',
          options,
          result: '',
          resultCta: ''
        });
        this._nodeMap[node._id] = parentAfter;
        await this._ensureBranchesForAnswers(parentAfter);
        this._toast('已生成左右两支', 'success');
        await this.loadTreeDetail(tree._id, { quiet: true });
        this._focusNode(node._id);
        return;
      }

      // 之后每次只加「一个」答案，并只长出「一支」
      const newIndex = options.length;
      const label = `答案${newIndex + 1}`;
      options.push({ label, nextNodeId: '', nextTreeKey: '' });
      const result = await callManage('saveNode', {
        node: this._buildNodeSaveData(node, {
          type: 'guide',
          options,
          result: '',
          resultCta: ''
        })
      });
      if (!result.ok) throw new Error(result.errMsg || '添加失败');
      const parentAfter = this._buildNodeSaveData(node, {
        type: 'guide',
        options,
        result: '',
        resultCta: ''
      });
      this._nodeMap[node._id] = parentAfter;
      await this._ensureBranchesForAnswers(parentAfter, [newIndex]);
      this._toast('已加一支', 'success');
      await this.loadTreeDetail(tree._id, { quiet: true });
      this._focusNode(node._id);
    });
  },

  async onDeleteNode(e) {
    const id = String(
      (e && e.detail && e.detail.id) ||
      (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) ||
      ''
    );
    const node = (this.data.nodes || []).find((item) => item && item._id === id);
    if (!id || !node) return;
    if (this._busy || this.data.saving) return;

    const isEntry = this.data.selectedTree && this.data.selectedTree.entryNodeId === id;
    const modal = await new Promise((resolve) => {
      wx.showModal({
        title: '删除这一步',
        content: isEntry
          ? `「${node.title}」是开始步骤，删除后需重新指定开始。确认删除？`
          : `确认删除「${node.title}」？连到它的答案会变成未连接。`,
        confirmText: '删除',
        confirmColor: '#d93025',
        success: resolve,
        fail: () => resolve({ confirm: false })
      });
    });
    if (!modal.confirm) return;

    await this._withLoading('删除中', async () => {
      const nodes = this.data.nodes || [];
      for (let i = 0; i < nodes.length; i++) {
        const cur = nodes[i];
        if (!cur || cur._id === id) continue;
        const options = Array.isArray(cur.options) ? cur.options : [];
        let dirty = false;
        const nextOptions = options.map((opt) => {
          if (opt && opt.nextNodeId === id) {
            dirty = true;
            return { ...opt, nextNodeId: '', nextTreeKey: '' };
          }
          return { ...(opt || {}) };
        });
        if (dirty) {
          const linkRes = await callManage('saveNode', {
            node: this._buildNodeSaveData(cur, { options: nextOptions })
          });
          if (!linkRes.ok) throw new Error(linkRes.errMsg || '解除连接失败');
        }
      }

      const result = await callManage('removeNode', { nodeId: id });
      if (!result.ok) throw new Error(result.errMsg || '删除失败');

      const tree = this.data.selectedTree;
      if (tree && tree.entryNodeId === id) {
        await callManage('saveTree', {
          tree: { ...tree, entryNodeId: '' }
        });
      }

      if (this.data.showNodeForm && this.data.nodeForm && this.data.nodeForm._id === id) {
        this.closeNodeForm(true);
      }

      this._toast('已删除', 'success');
      if (tree) await this.loadTreeDetail(tree._id, { quiet: true });
    });
  },

  async deleteNode(e) {
    return this.onDeleteNode(e);
  },

  setAsEntry(e) {
    const id = String((e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
    const tree = this.data.selectedTree;
    if (!id || !tree) return;
    this.setData({ saving: true });
    callManage('saveTree', {
      tree: { ...tree, entryNodeId: id }
    })
      .then((result) => {
        if (!result.ok) throw new Error(result.errMsg || '设置失败');
        this._toast('已设为第一步', 'success');
        return this.loadTreeDetail(tree._id);
      })
      .catch((err) => this._toast((err && err.message) || '设置失败'))
      .finally(() => this.setData({ saving: false }));
  },

  openFullPreview() {
    const tree = this.data.selectedTree;
    if (!tree) return;
    wx.navigateTo({
      url: `/package-extra/pages/troubleshoot/troubleshoot?tree=${encodeURIComponent(tree._id)}&title=${encodeURIComponent(tree.title || '')}`
    });
  },

  goBack() {
    pageBack.goBack({ preferProducts: false, fallback: 'hub' });
  },

  stopTap() {}
});
