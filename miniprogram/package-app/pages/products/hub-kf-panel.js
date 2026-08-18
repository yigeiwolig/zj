const weworkKf = require('../../../utils/weworkCustomerService.js');
const kfFeedbackApi = require('../../../utils/kfFeedbackApi.js');
const {
  getGuideIntroKeys,
  markGuidePermSkip,
  resolveGuideAutoEntry
} = require('../../../utils/usageGuideIntro.js');
const { startGuideBtnCountdown, clearGuideBtnCountdown } = require('../../../utils/guideBtnCountdown.js');

const KF_GUIDE_BASE_KEY = 'mt_kf_first_visit_guide_done_v1';
const KF_GUIDE_INTRO_KEYS = getGuideIntroKeys(KF_GUIDE_BASE_KEY);

const KF_GUIDE_STEPS = [
  {
    anchor: '#kfGuidePreCard',
    title: '售前客服',
    btnText: '下一步',
    desc: '还没购买或准备下单？选购建议、型号对比、优惠活动、发货时间等问题，点这张卡片联系售前客服。'
  },
  {
    anchor: '#kfGuideAfterCard',
    title: '售后客服',
    btnText: '知道了',
    desc: '已购设备遇到问题？维修进度、安装与技术支持、退换货等，点这张卡片联系售后客服。'
  }
];

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
    boardFlying: false,
    boardFlyContent: '',
    boardDropIn: false,
    showFeedbackPanel: false,
    adminMessages: [],
    showAdminList: false,
    showKfGuide: false,
    showKfGuideIntro: false,
    kfGuideStep: 0,
    kfGuideStepTag: '',
    kfGuideTitle: '',
    kfGuideDesc: '',
    kfGuideBtnText: '下一步',
    kfGuideBtnLocked: true,
    kfGuideSpotStyle: 'display:none;',
    kfGuideBubbleStyle: '',
    kfGuideArrowStyle: '',
    kfGuideArrowDir: 'up',
    kfGuideShowSpot: false
  },

  lifetimes: {
    attached() {
      this.checkAdminPrivilege().finally(() => {
        if (this.properties.active) {
          this._maybeShowKfGuide(false);
        }
      });
    },
    detached() {
      if (this._kfGuideStartTimer) {
        clearTimeout(this._kfGuideStartTimer);
        this._kfGuideStartTimer = null;
      }
      this._clearBoardAnimTimers();
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
        // 升为管理员后收掉已弹出的引导
        if (this.data.showKfGuide || this.data.showKfGuideIntro) {
          this.closeKfGuide(false);
        }
      }
    },
    active(val) {
      if (val && this.properties.shellAdmin) {
        this.loadAdminMessages();
      }
      if (val) {
        this._maybeShowKfGuide(false);
      } else if (this.data.showKfGuide || this.data.showKfGuideIntro) {
        this.closeKfGuide(false);
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
        if (isAdmin) {
          this.loadAdminMessages();
          if (this.data.showKfGuide || this.data.showKfGuideIntro) {
            this.closeKfGuide(false);
          }
        }
      } catch (e) {}
    },

    kfGuideNoop() {},

    _maybeShowKfGuide(forceReplay) {
      // 管理员不自动弹客服引导（与主页引导一致）
      if (!forceReplay && (this.properties.shellAdmin || this.data.isAdmin)) return;
      if (this.data.showKfGuide || this.data.showKfGuideIntro) return;
      if (this._kfGuideStartTimer) clearTimeout(this._kfGuideStartTimer);
      if (forceReplay) {
        this._startKfGuideSteps();
        return;
      }
      const entry = resolveGuideAutoEntry(KF_GUIDE_INTRO_KEYS);
      // 仅真正的「首次」自动播；看过 / 跳过都不再自动弹
      // （以前完成只记 introSeen，下次仍弹「查看教程」；中途切走则什么都不记，导致每次都从第 1 步重来）
      if (entry !== 'steps') return;
      markGuidePermSkip(KF_GUIDE_INTRO_KEYS);
      this._startKfGuideSteps();
    },

    _startKfGuideSteps() {
      if (this._kfGuideStartTimer) clearTimeout(this._kfGuideStartTimer);
      this._kfGuideStartTimer = setTimeout(() => {
        this._kfGuideStartTimer = null;
        if (!this.properties.active) return;
        this._showKfGuideStep(1, 0);
      }, 560);
    },

    kfGuideIntroStart() {
      // 旧版「再次进入先问看不看」已废弃；兜底当跳过处理
      this.kfGuideSkip();
    },

    _showKfGuideStep(stepNo, retryCount) {
      const step = KF_GUIDE_STEPS[stepNo - 1];
      if (!step) {
        this.closeKfGuide(false);
        return;
      }
      const retry = Number(retryCount) || 0;

      const measureAndPaint = () => {
        const query = wx.createSelectorQuery().in(this);
        query.select(step.anchor).boundingClientRect();
        query.exec((res) => {
          const rect = res && res[0];
          if (!rect || !rect.width || !rect.height) {
            if (retry < 10) {
              setTimeout(() => this._showKfGuideStep(stepNo, retry + 1), 240);
              return;
            }
            this.setData({
              showKfGuide: true,
              kfGuideStep: stepNo,
              kfGuideStepTag: `第 ${stepNo} 步`,
              kfGuideTitle: step.title,
              kfGuideDesc: step.desc,
              kfGuideBtnText: step.btnText || '下一步',
              kfGuideBtnLocked: true,
              kfGuideShowSpot: false,
              kfGuideSpotStyle: 'display:none;',
              kfGuideBubbleStyle: 'left:50%; top:50%; transform:translate(-50%,-50%); width:520rpx;',
              kfGuideArrowDir: 'none',
              kfGuideArrowStyle: 'display:none;'
            }, () => this._armKfGuideBtnLock(step.btnText || '下一步'));
            return;
          }

          let win = null;
          try {
            win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
          } catch (e) {
            win = { windowWidth: 375, windowHeight: 667 };
          }
          const winH = (win && win.windowHeight) || 667;
          const padPx = 8;
          const marginPx = 16;
          const gapPx = 12;
          const spotStyle = `left:${rect.left - padPx}px; top:${rect.top - padPx}px; width:${rect.width + padPx * 2}px; height:${rect.height + padPx * 2}px;`;

          const spaceBelowPx = winH - (rect.top + rect.height);
          let bubbleStyle = '';
          let arrowDir = 'up';
          if (spaceBelowPx > 120) {
            const topPx = rect.top + rect.height + gapPx;
            bubbleStyle = `left:${marginPx}px; right:${marginPx}px; top:${topPx}px; width:auto;`;
          } else {
            const bottomPx = winH - rect.top + gapPx;
            bubbleStyle = `left:${marginPx}px; right:${marginPx}px; bottom:${bottomPx}px; width:auto;`;
            arrowDir = 'down';
          }
          const arrowLeftPx = rect.left + rect.width / 2 - marginPx;

          this.setData({
            showKfGuide: true,
            kfGuideStep: stepNo,
            kfGuideStepTag: `第 ${stepNo} 步`,
            kfGuideTitle: step.title,
            kfGuideDesc: step.desc,
            kfGuideBtnText: step.btnText || '下一步',
            kfGuideBtnLocked: true,
            kfGuideShowSpot: true,
            kfGuideSpotStyle: spotStyle,
            kfGuideBubbleStyle: bubbleStyle,
            kfGuideArrowDir: arrowDir,
            kfGuideArrowStyle: `left:${arrowLeftPx}px;`
          }, () => this._armKfGuideBtnLock(step.btnText || '下一步'));
        });
      };

      measureAndPaint();
    },

    _armKfGuideBtnLock(readyText) {
      startGuideBtnCountdown(this, {
        lockedKey: 'kfGuideBtnLocked',
        textKey: 'kfGuideBtnText',
        readyText: readyText || '下一步',
        timerProp: '_kfGuideBtnTimer'
      });
    },

    kfGuideNext() {
      if (this.data.kfGuideBtnLocked) return;
      const cur = Number(this.data.kfGuideStep) || 0;
      if (cur >= KF_GUIDE_STEPS.length) {
        markGuidePermSkip(KF_GUIDE_INTRO_KEYS);
        this.closeKfGuide(false);
        return;
      }
      const next = cur + 1;
      this._showKfGuideStep(next, 0);
    },

    kfGuideSkip() {
      markGuidePermSkip(KF_GUIDE_INTRO_KEYS);
      this.closeKfGuide(false);
    },

    closeKfGuide(_markDone) {
      if (this._kfGuideStartTimer) {
        clearTimeout(this._kfGuideStartTimer);
        this._kfGuideStartTimer = null;
      }
      clearGuideBtnCountdown(this, '_kfGuideBtnTimer');
      if (this.data.showKfGuide || this.data.showKfGuideIntro) {
        this.setData({
          showKfGuide: false,
          showKfGuideIntro: false,
          kfGuideStep: 0,
          kfGuideShowSpot: false,
          kfGuideSpotStyle: 'display:none;'
        });
      }
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
        console.warn('[hub-kf-panel] handleBoardSend', e);
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
      if (this.properties.shellAdmin) {
        this.loadAdminMessages();
      }
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
    }
  }
});
