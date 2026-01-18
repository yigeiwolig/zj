// components/custom-toast/index.js
Component({
  data: {
    modal: { show: false },
    toast: { show: false },
    loading: { show: false },
    modalClosing: false, // Modal退出动画中
    toastClosing: false // Toast退出动画中
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
      this.setData({ modalClosing: true });
      setTimeout(() => {
        this.setData({ 
          'modal.show': false,
          modalClosing: false
        });
      }, 420);
    },
    onCancel() {
      const { success, fail } = this.data.modal;
      this.setData({ modalClosing: true });
      setTimeout(() => {
        this.setData({ 
          'modal.show': false,
          modalClosing: false
        });
        if (success) success({ confirm: false, cancel: true, errMsg: "showModal:ok" });
      }, 420);
    },
    onConfirm() {
      const { success, fail } = this.data.modal;
      this.setData({ modalClosing: true });
      setTimeout(() => {
        this.setData({ 
          'modal.show': false,
          modalClosing: false
        });
        if (success) success({ confirm: true, cancel: false, errMsg: "showModal:ok" });
      }, 420);
    },

    // Toast（带收缩退出动画）
    showToast(opts) {
      const duration = opts.duration || 1500;
      // 如果已有toast在显示，先关闭它
      if (this.data.toast.show) {
        this._closeToastWithAnimation();
        setTimeout(() => {
          this._showToastInternal(opts, duration);
        }, 420);
      } else {
        this._showToastInternal(opts, duration);
      }
    },
    // 内部方法：显示Toast
    _showToastInternal(opts, duration) {
      this.setData({
        toast: {
          show: true,
          title: opts.title || '',
          icon: opts.icon || 'none'
        },
        toastClosing: false
      });
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        this._closeToastWithAnimation(() => {
          if (opts.success) opts.success({ errMsg: "showToast:ok" });
        });
      }, duration);
    },
    // 关闭Toast（带收缩退出动画）
    _closeToastWithAnimation(callback) {
      if (!this.data.toast.show) {
        if (callback) callback();
        return;
      }
      this.setData({ toastClosing: true });
      setTimeout(() => {
        this.setData({ 
          'toast.show': false,
          toastClosing: false
        });
        if (callback) callback();
      }, 420);
    },
    hideToast() {
      this._closeToastWithAnimation();
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