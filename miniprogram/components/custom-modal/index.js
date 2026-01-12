Component({
  data: {
    visible: false,
    type: '', // modal, toast, loading
    title: '',
    content: '',
    showCancel: true,
    cancelText: '取消',
    confirmText: '确定',
    confirmColor: '#1d1d1f',
    icon: '', // success, error, none
    duration: 1500
  },
  methods: {
    showModal(opts) {
      this.setData({
        visible: true,
        type: 'modal',
        title: opts.title || '',
        content: opts.content || '',
        showCancel: opts.showCancel !== false,
        cancelText: opts.cancelText || '取消',
        confirmText: opts.confirmText || '确定',
        confirmColor: opts.confirmColor || '#1d1d1f',
        _success: opts.success,
        _fail: opts.fail
      });
    },
    
    showToast(opts) {
      this.setData({
        visible: true,
        type: 'toast',
        title: opts.title || '',
        icon: opts.icon || 'success',
        duration: opts.duration || 1500
      });
      setTimeout(() => {
        this.setData({ visible: false });
        if (opts.success) opts.success();
      }, this.data.duration);
    },
    
    showLoading(opts) {
      this.setData({
        visible: true,
        type: 'loading',
        title: opts.title || ''
      });
    },
    
    hide() {
      this.setData({ visible: false });
    },

    handleCancel() {
      this.setData({ visible: false });
      if (this.data._success) this.data._success({ confirm: false, cancel: true });
    },
    handleConfirm() {
      this.setData({ visible: false });
      if (this.data._success) this.data._success({ confirm: true, cancel: false });
    }
  }
});