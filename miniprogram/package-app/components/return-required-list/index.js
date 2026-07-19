Component({
  properties: {
    list: {
      type: Array,
      value: []
    },
    isAdmin: {
      type: Boolean,
      value: false
    },
    simple: {
      type: Boolean,
      value: false
    }
  },
  data: {
    expandedMap: {}
  },
  methods: {
    onToggleExpand(e) {
      const id = String((e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || '').trim();
      if (!id) return;
      const next = Object.assign({}, this.data.expandedMap || {});
      next[id] = !next[id];
      this.setData({ expandedMap: next });
    },
    emitAction(type, e) {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
      this.triggerEvent('action', {
        type,
        index: ds.index,
        id: ds.id,
        repairId: ds.id,
        sn: ds.sn,
        phone: ds.phone,
        company: ds.company,
        tailRequired: ds.tailRequired
      }, { bubbles: true, composed: true });
    },
    onCopyUserAddress(e) {
      this.emitAction('copyUserAddress', e);
    },
    onOpenEnterTracking(e) {
      this.emitAction('openEnterTrackingModal', e);
    },
    onEnterOutboundTracking(e) {
      this.emitAction('enterOutboundTracking', e);
    },
    onViewLogistics(e) {
      this.emitAction('viewLogisticsDetail', e);
    },
    onAdminShipOut(e) {
      this.emitAction('adminShipOutAfterRepair', e);
    },
    onOpenFillRepair(e) {
      this.emitAction('openFillRepairModal', e);
    },
    onDeductWarranty(e) {
      this.emitAction('deductWarrantyForRepair', e);
    },
    onConfirmReceived(e) {
      this.emitAction('confirmReturnReceived', e);
    },
    onCancelReturn(e) {
      this.emitAction('cancelReturnRequired', e);
    },
    onCompleteReturn(e) {
      this.emitAction('completeReturnRequired', e);
    },
    onResendWecomNotify(e) {
      this.emitAction('resendWecomReturnNotify', e);
    },
    onReplaceMotherboard(e) {
      this.emitAction('replaceMotherboard', e);
    }
  }
});
