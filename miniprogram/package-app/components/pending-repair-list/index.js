Component({
  properties: {
    list: {
      type: Array,
      value: []
    }
  },
  data: {
    expandedMap: {}
  },
  observers: {
    list(list) {
      const rows = Array.isArray(list) ? list : [];
      if (!rows.length) {
        this.setData({ expandedMap: {} });
        return;
      }
      const expandedMap = Object.assign({}, this.data.expandedMap || {});
      const validIds = {};
      rows.forEach((row) => {
        if (row && row._id) validIds[row._id] = true;
      });
      Object.keys(expandedMap).forEach((id) => {
        if (!validIds[id]) delete expandedMap[id];
      });
      const hasExpanded = Object.keys(expandedMap).some((id) => expandedMap[id]);
      if (!hasExpanded && rows[0] && rows[0]._id) {
        expandedMap[rows[0]._id] = true;
      }
      this.setData({ expandedMap });
    }
  },
  methods: {
    onToggleExpand(e) {
      const id = String((e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || '').trim();
      if (!id) return;
      const currentlyOpen = !!((this.data.expandedMap || {})[id]);
      if (currentlyOpen) {
        this.setData({ expandedMap: {} });
        return;
      }
      this.setData({ expandedMap: { [id]: true } });
    },
    emitAction(type, e) {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
      this.triggerEvent('action', {
        type,
        index: ds.index,
        id: ds.id,
        repairId: ds.id,
        item: ds.item,
        resolveType: ds.type,
        model: ds.model,
        name: ds.name,
        url: ds.url,
        phone: ds.phone,
        address: ds.address
      }, { bubbles: true, composed: true });
    },
    onPreviewImage(e) {
      this.emitAction('previewImage', e);
    },
    onCopyAddress(e) {
      this.emitAction('copyRepairAddress', e);
    },
    onCompleteRepair(e) {
      this.emitAction('adminCompleteRepair', e);
    },
    onOpenDiagnosis(e) {
      this.emitAction('openDiagnosisDialog', e);
    },
    onResolveRepair(e) {
      this.emitAction('resolveRepair', e);
    },
    onOpenPurchase(e) {
      this.emitAction('openPurchasePartsModal', e);
    },
    onRequestReturn(e) {
      this.emitAction('requestUserReturn', e);
    },
    onResendWecom(e) {
      this.emitAction('resendRepairWecomNotify', e);
    },
    onDeleteRepair(e) {
      this.emitAction('adminDeleteRepair', e);
    }
  }
});
