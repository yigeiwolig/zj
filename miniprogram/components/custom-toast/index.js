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
      // 互斥：关闭 toast/loading，避免重叠
      if (this._toastTimer) clearTimeout(this._toastTimer);
      if (this._loadingTimer) clearTimeout(this._loadingTimer);
      this.setData({
        toastClosing: false,
        'toast.show': false,
        'loading.show': false
      });
      // 🔴 修复：函数不能通过 setData 保存，使用实例变量保存回调
      this._modalSuccess = opts.success;
      this._modalFail = opts.fail;
      this.setData({
        modal: {
          show: true,
          title: opts.title || '',
          content: opts.content || '',
          showCancel: opts.showCancel !== false,
          cancelText: opts.cancelText || '取消',
          confirmText: opts.confirmText || '确定',
          cancelColor: opts.cancelColor,
          confirmColor: opts.confirmColor
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
      const success = this._modalSuccess;
      const fail = this._modalFail;
      this.setData({ modalClosing: true });
      setTimeout(() => {
        this.setData({ 
          'modal.show': false,
          modalClosing: false
        });
        // 🔴 修复：从实例变量读取回调
        if (success) success({ confirm: false, cancel: true, errMsg: "showModal:ok" });
        // 清理回调
        this._modalSuccess = null;
        this._modalFail = null;
      }, 420);
    },
    onConfirm() {
      const success = this._modalSuccess;
      const fail = this._modalFail;
      this.setData({ modalClosing: true });
      setTimeout(() => {
        this.setData({ 
          'modal.show': false,
          modalClosing: false
        });
        // 🔴 修复：从实例变量读取回调
        if (success) success({ confirm: true, cancel: false, errMsg: "showModal:ok" });
        // 清理回调
        this._modalSuccess = null;
        this._modalFail = null;
      }, 420);
    },

    // Toast（带收缩退出动画）
    showToast(opts) {
      const duration = opts.duration || 1500;
      // 互斥：关闭 modal/loading，避免重叠
      if (this.data.modal.show) this.hideModal();
      if (this.data.loading.show) this.hideLoading();
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
      // 互斥：关闭 toast/modal，避免重叠
      if (this._toastTimer) clearTimeout(this._toastTimer);
      if (this.data.toast.show) this._closeToastWithAnimation();
      if (this.data.modal.show) this.hideModal();
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