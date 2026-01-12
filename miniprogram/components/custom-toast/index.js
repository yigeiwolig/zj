// components/custom-toast/index.js
Component({
  data: {
    modal: { show: false },
    toast: { show: false },
    loading: { show: false }
  },
  methods: {
    preventTouchMove() {
      // 防止背景滚动
    },
    
    // Modal
    showModal(opts) {
      this.setData({
        modal: {
          show: true,
          title: opts.title || '',
          content: opts.content || '',
          showCancel: opts.showCancel !== false,
          cancelText: opts.cancelText || '取消',
          confirmText: opts.confirmText || '确定',
          cancelColor: opts.cancelColor,
          confirmColor: opts.confirmColor,
          success: opts.success,
          fail: opts.fail
        }
      });
    },
    hideModal() {
      this.setData({ 'modal.show': false });
    },
    onCancel() {
      const { success, fail } = this.data.modal;
      this.hideModal();
      if (success) success({ confirm: false, cancel: true, errMsg: "showModal:ok" });
    },
    onConfirm() {
      const { success, fail } = this.data.modal;
      this.hideModal();
      if (success) success({ confirm: true, cancel: false, errMsg: "showModal:ok" });
    },

    // Toast
    showToast(opts) {
      const duration = opts.duration || 1500;
      this.setData({
        toast: {
          show: true,
          title: opts.title || '',
          icon: opts.icon || 'none'
        }
      });
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        this.setData({ 'toast.show': false });
        if (opts.success) opts.success({ errMsg: "showToast:ok" });
      }, duration);
    },
    hideToast() {
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this.setData({ 'toast.show': false });
    },

    // Loading
    showLoading(opts) {
      this.setData({
        loading: {
          show: true,
          title: opts.title || ''
        }
      });
      // 自动隐藏保护（防止死循环）
      if (this._loadingTimer) clearTimeout(this._loadingTimer);
      this._loadingTimer = setTimeout(() => {
        this.setData({ 'loading.show': false });
      }, 30000); // 30秒强制关闭
    },
    hideLoading() {
      if (this._loadingTimer) clearTimeout(this._loadingTimer);
      this.setData({ 'loading.show': false });
    }
  }
});