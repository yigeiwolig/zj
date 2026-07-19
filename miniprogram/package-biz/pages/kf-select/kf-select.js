const weworkKf = require('../../../utils/weworkCustomerService.js');
const kfFeedbackApi = require('../../../utils/kfFeedbackApi.js');

Page({
  data: {
    highlightScene: '',
    statusBarHeight: 44,
    navBarHeight: 44,
    isAdmin: false,
    boardContent: '',
    boardSending: false,
    boardFlying: false,
    boardFlyContent: '',
    boardDropIn: false,
    showFeedbackPanel: false,
    adminMessages: [],
    showAdminList: false
  },

  onLoad(options) {
    this.calcNavBarInfo();
    const scene = options && options.scene ? String(options.scene) : '';
    if (scene === 'pre' || scene === 'after') {
      this.setData({ highlightScene: scene });
    }
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('kf-select');
    }
    this.checkAdminPrivilege();
  },

  onShow() {
    const app = getApp();
    if (app && app.startQiangliCheck) app.startQiangliCheck();
    if (this.data.isAdmin) this.loadAdminMessages();
  },

  onHide() {
    const app = getApp();
    if (app && app.stopQiangliCheck) app.stopQiangliCheck();
  },

  onUnload() {
    const app = getApp();
    if (app && app.stopQiangliCheck) app.stopQiangliCheck();
    this._clearBoardAnimTimers();
  },

  _clearBoardAnimTimers() {
    if (this._flyUpFallbackTimer) {
      clearTimeout(this._flyUpFallbackTimer);
      this._flyUpFallbackTimer = null;
    }
    if (this._dropInFallbackTimer) {
      clearTimeout(this._dropInFallbackTimer);
      this._dropInFallbackTimer = null;
    }
  },

  async checkAdminPrivilege() {
    try {
      const db = wx.cloud.database();
      const { result } = await wx.cloud.callFunction({ name: 'login' });
      const openid = result && result.openid;
      if (!openid) return;
      let r = await db.collection('guanliyuan').where({ openid }).limit(1).get();
      if (!r.data || !r.data.length) {
        r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
      }
      const isAdmin = !!(r.data && r.data.length);
      this.setData({ isAdmin });
      if (isAdmin) this.loadAdminMessages();
    } catch (e) {}
  },

  handlePreSalesTap() {
    weworkKf.openPreSalesKf();
  },

  handleAfterSalesTap() {
    weworkKf.openAfterSalesKf();
  },

  onBoardInput(e) {
    this.setData({ boardContent: e.detail.value || '' });
  },

  async handleBoardSend() {
    if (this.data.boardSending || this.data.boardFlying || this.data.boardDropIn) return;
    const content = String(this.data.boardContent || '').trim();
    if (!content) {
      wx.showToast({ title: '写点什么再贴上去', icon: 'none' });
      return;
    }
    this.setData({ boardSending: true });
    try {
      const res = await kfFeedbackApi.submit(content);
      if (!res.success) {
        wx.showToast({ title: kfFeedbackApi.tipForError(res.error), icon: 'none' });
        this.setData({ boardSending: false });
        return;
      }
      this._clearBoardAnimTimers();
      this.setData({
        boardFlying: true,
        boardFlyContent: content,
        boardSending: false
      });
      this._flyUpFallbackTimer = setTimeout(() => {
        if (this.data.boardFlying) this.onFlyUpEnd();
      }, 620);
    } catch (e) {
      console.warn('[kf-select] handleBoardSend', e);
      wx.showToast({ title: kfFeedbackApi.tipForError('NETWORK'), icon: 'none' });
      this.setData({ boardSending: false });
    }
  },

  onFlyUpEnd() {
    if (!this.data.boardFlying) return;
    if (this._flyUpFallbackTimer) {
      clearTimeout(this._flyUpFallbackTimer);
      this._flyUpFallbackTimer = null;
    }
    this.setData({
      boardFlying: false,
      boardFlyContent: '',
      boardContent: '',
      boardDropIn: true
    });
    this._dropInFallbackTimer = setTimeout(() => {
      if (this.data.boardDropIn) this.onDropInEnd();
    }, 680);
  },

  onDropInEnd() {
    if (!this.data.boardDropIn) return;
    if (this._dropInFallbackTimer) {
      clearTimeout(this._dropInFallbackTimer);
      this._dropInFallbackTimer = null;
    }
    this.setData({ boardDropIn: false });
    wx.showToast({ title: '反馈已提交，感谢支持', icon: 'success' });
    if (this.data.isAdmin) this.loadAdminMessages();
  },

  async loadAdminMessages() {
    try {
      const res = await kfFeedbackApi.listAdmin();
      if (!res.success) return;
      const list = (res.list || []).map((item) => kfFeedbackApi.mapAdminMessage(item));
      this.setData({ adminMessages: list });
    } catch (e) {}
  },

  async handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除留言',
      content: '确定删除这条留言吗？',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: async (modal) => {
        if (!modal.confirm) return;
        try {
          const res = await kfFeedbackApi.remove(id);
          if (!res.success) {
            wx.showToast({ title: kfFeedbackApi.tipForError(res.error), icon: 'none' });
            return;
          }
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadAdminMessages();
        } catch (err) {
          wx.showToast({ title: kfFeedbackApi.tipForError('NETWORK'), icon: 'none' });
        }
      }
    });
  },

  toggleAdmin() {
    this.setData({ showAdminList: !this.data.showAdminList });
  },

  toggleFeedback() {
    this.setData({ showFeedbackPanel: !this.data.showFeedbackPanel });
  },

  calcNavBarInfo() {
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = (gap * 2) + menuButton.height;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  handleBack() {
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  }
});
