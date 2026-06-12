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
  methods: {
    emitAction(type, e) {
      const ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
      this.triggerEvent('action', {
        type,
        index: ds.index,
        id: ds.id,
        sn: ds.sn,
        phone: ds.phone,
        tailRequired: ds.tailRequired
      }, { bubbles: true, composed: true });
    },
    onCopyUserAddress(e) {
      this.emitAction('copyUserAddress', e);
    },
    onOpenEnterTracking(e) {
      this.emitAction('openEnterTrackingModal', e);
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
    }
  }
});
