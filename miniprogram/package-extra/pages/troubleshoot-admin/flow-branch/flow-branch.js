Component({
  options: {
    // 去掉组件外壳拉伸，宽度由内部 .tv-unit 的 _tw 真正约束
    virtualHost: true,
    styleIsolation: 'isolated'
  },

  properties: {
    item: { type: Object, value: null },
    connectMode: { type: Boolean, value: false },
    connectPhase: { type: String, value: '' },
    connectSourceId: { type: String, value: '' },
    connectOptIndex: { type: Number, value: -1 }
  },

  methods: {
    _forward(name, detail) {
      this.triggerEvent(name, detail || {});
    },

    onCardTap(e) {
      if (e && e.detail && e.detail.id && !(e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)) {
        this._forward('cardtap', e.detail);
        return;
      }
      const id = String((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
      if (id) this._forward('cardtap', { id });
    },

    onBranchTap(e) {
      if (e && e.detail && e.detail.nodeId && !(e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.nodeId)) {
        this._forward('branchtap', e.detail);
        return;
      }
      const ds = (e.currentTarget && e.currentTarget.dataset) || {};
      this._forward('branchtap', {
        nodeId: String(ds.nodeId || ''),
        optIndex: Number(ds.optIndex),
        label: String(ds.label || '')
      });
    },

    onSlotTap(e) {
      if (e && e.detail && e.detail.nodeId && !(e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.nodeId)) {
        this._forward('slotap', e.detail);
        return;
      }
      const ds = (e.currentTarget && e.currentTarget.dataset) || {};
      this._forward('slotap', {
        nodeId: String(ds.nodeId || ''),
        optIndex: Number(ds.optIndex),
        label: String(ds.label || '')
      });
    },

    onDeleteTap(e) {
      if (e && e.detail && e.detail.id && !(e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)) {
        this._forward('deletetap', e.detail);
        return;
      }
      const id = String((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
      if (id) this._forward('deletetap', { id });
    },

    onAddAnswerTap(e) {
      if (e && e.detail && e.detail.id && !(e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)) {
        this._forward('addanswertap', e.detail);
        return;
      }
      const id = String((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
      if (id) this._forward('addanswertap', { id });
    },

    onExtendTap(e) {
      if (e && e.detail && e.detail.id && !(e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)) {
        this._forward('extendtap', e.detail);
        return;
      }
      const id = String((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || '');
      if (id) this._forward('extendtap', { id });
    }
  }
});
