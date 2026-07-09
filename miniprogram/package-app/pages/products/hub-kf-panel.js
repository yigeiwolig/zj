const weworkKf = require('../../../utils/weworkCustomerService.js');
const kfFeedbackApi = require('../../../utils/kfFeedbackApi.js');

Component({
  properties: {
    active: {
      type: Boolean,
      value: false
    },
    shellStatusBarHeight: {
      type: Number,
      value: 44
    },
    shellAdmin: {
      type: Boolean,
      value: false
    },
    highlightScene: {
      type: String,
      value: ''
    }
  },

  data: {
    localHighlight: '',
    isAdmin: false,
    boardContent: '',
    boardSending: false,
    boardTearing: false,
    boardSentTip: false,
    showFeedbackPanel: false,
    adminMessages: [],
    showAdminList: false
  },

  lifetimes: {
    attached() {
      this.checkAdminPrivilege();
    }
  },

  observers: {
    highlightScene(scene) {
      if (scene === 'pre' || scene === 'after') {
        this.setData({ localHighlight: scene });
      }
    },
    shellAdmin(isAdmin) {
      if (isAdmin) {
        this.loadAdminMessages();
      }
    },
    active(val) {
      if (val && this.properties.shellAdmin) {
        this.loadAdminMessages();
      }
    }
  },

  methods: {
    async checkAdminPrivilege() {
      if (this.properties.shellAdmin) {
        this.setData({ isAdmin: true });
        this.loadAdminMessages();
        return;
      }
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
      if (this.properties.shellAdmin) {
        this.loadAdminMessages();
      }
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
        if (res.success) {
          this.loadAdminMessages();
        }
      } catch (err) {}
    },

    toggleAdmin() {
      this.setData({ showAdminList: !this.data.showAdminList });
    },

    toggleFeedback() {
      this.setData({ showFeedbackPanel: !this.data.showFeedbackPanel });
    }
  }
});
