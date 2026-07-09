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
    boardTearing: false,
    boardSentTip: false,
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
    if (this.data.boardSending || this.data.boardTearing) return;
    const content = String(this.data.boardContent || '').trim();
    if (!content) {
      wx.showToast({ title: '写点什么再贴上去', icon: 'none' });
      return;
    }
    this.setData({ boardSending: true });
    try {
      const res = await kfFeedbackApi.submit(content, kfFeedbackApi.resolveNickName());
      if (!res.success) {
        let tip = '发送失败，请稍后重试';
        if (res.error === 'RATE_LIMIT') tip = '发送太频繁，请稍后再试';
        if (res.error === 'TOO_LONG') tip = '内容过长，请精简后重试';
        wx.showToast({ title: tip, icon: 'none' });
        this.setData({ boardSending: false });
        return;
      }
      this.setData({ boardTearing: true, boardSending: false });
      if (this._tearFallbackTimer) clearTimeout(this._tearFallbackTimer);
      this._tearFallbackTimer = setTimeout(() => {
        if (this.data.boardTearing) this.onBoardTearEnd();
      }, 780);
    } catch (e) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
      this.setData({ boardSending: false });
    }
  },

  onBoardTearEnd() {
    if (!this.data.boardTearing) return;
    if (this._tearFallbackTimer) {
      clearTimeout(this._tearFallbackTimer);
      this._tearFallbackTimer = null;
    }
    this.setData({
      boardTearing: false,
      boardContent: '',
      boardSentTip: true
    });
    setTimeout(() => {
      this.setData({ boardSentTip: false });
    }, 1600);
    if (this.data.isAdmin) this.loadAdminMessages();
  },

  async loadAdminMessages() {
    try {
      const res = await kfFeedbackApi.listAdmin();
      if (!res.success) return;
      const list = (res.list || []).map((item) => ({
        ...item,
        timeText: kfFeedbackApi.formatTime(item.createTime)
      }));
      this.setData({ adminMessages: list });
    } catch (e) {}
  },

  async handleMarkRead(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      const res = await kfFeedbackApi.markRead(id);
      if (res.success) this.loadAdminMessages();
    } catch (err) {}
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
