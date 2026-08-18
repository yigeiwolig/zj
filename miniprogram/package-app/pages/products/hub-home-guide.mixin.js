/**
 * 主页功能引导：框选说明各入口用途（含自动滚动到目标）
 * - 自动仅在输口令后首次进入主页弹一次，之后永不自动弹
 * - 切步骤时先收起白气泡/高亮，滚到位再重新弹出（避免气泡跟着漂移）
 */
const {
  getGuideIntroKeys,
  markGuidePermSkip,
  resolveGuideAutoEntry
} = require('../../../utils/usageGuideIntro.js');
const debugUserFlow = require('../../../utils/debugUserFlow.js');

const HOME_GUIDE_BASE_KEY = 'mt_home_first_visit_guide_done_v1';
const HOME_GUIDE_INTRO_KEYS = getGuideIntroKeys(HOME_GUIDE_BASE_KEY);

const HOME_GUIDE_STEPS = [
  {
    anchor: '#hubGuideShop',
    scrollIntoView: 'hubGuideShop',
    title: '产品选购',
    btnText: '下一步',
    desc: '进入商城选配件、下单购买。'
  },
  {
    anchor: '#hubGuideCase',
    scrollIntoView: 'hubGuideCase',
    title: '案例展示',
    btnText: '下一步',
    desc: '看安装实拍与使用案例，也可上传案例赢延保。'
  },
  {
    anchor: '#hubGuideControl',
    scrollIntoView: 'hubGuideControl',
    title: '控制中心',
    btnText: '下一步',
    desc: '蓝牙连接设备后，在这里调节角度、隐蔽、遥控等。'
  },
  {
    anchor: '#hubGuideRepair',
    scrollIntoView: 'hubGuideRepair',
    title: '维修中心',
    btnText: '下一步',
    desc: '买配件、报修、查进度，售后相关都从这里进。'
  },
  {
    anchor: '#hubGuideTutorial',
    scrollIntoView: 'hubGuideTutorial',
    title: '安装教程',
    btnText: '下一步',
    desc: '按型号查看安装步骤与注意事项。'
  },
  {
    anchor: '#hubGuideOta',
    scrollIntoView: 'hubGuideOta',
    title: 'OTA 升级',
    btnText: '下一步',
    desc: '给支持的机型升级固件，保持功能最新。'
  },
  {
    anchor: '#hubGuideFaq',
    scrollIntoView: 'hubGuideFaq',
    title: '常见问题',
    btnText: '知道了',
    desc: '自助查答案：安装、使用、售后常见疑问都在这里。'
  }
];

function getHomeGuideData() {
  return {
    showHomeGuide: false,
    showHomeGuideIntro: false,
    homeGuideStep: 0,
    homeGuideStepTag: '',
    homeGuideTitle: '',
    homeGuideDesc: '',
    homeGuideBtnText: '下一步',
    homeGuideSpotStyle: 'display:none;',
    homeGuideBubbleStyle: 'display:none;',
    homeGuideArrowStyle: '',
    homeGuideArrowDir: 'up',
    homeGuideShowSpot: false,
    homeGuideShowBubble: false,
    homeGuideAllowScroll: false,
    homeGuideScrollIntoView: ''
  };
}

const homeGuideMethods = {
  /** 已取消常驻「使用教程」；仅调试全流程可强制重播 */
  openHomeUsageTutorial() {
    if (!debugUserFlow.shouldForceUserGuides()) return;
    this._maybeShowHomeGuide(true);
  },

  homeGuideNoop() {},

  _markHomeGuideDoneForever() {
    // 只要弹过/跳过就必须落盘；管理员只是不自动开教学，不能因此写不进「已完成」
    markGuidePermSkip(HOME_GUIDE_INTRO_KEYS);
  },

  /** 等管理员身份就绪后再决定是否自动弹，避免 isAuthorized 尚未回来时误弹 */
  _maybeShowHomeGuide(forceReplay) {
    if (this.data.hubTabIndex !== 0) return;
    const run = () => {
      if (this.data.hubTabIndex !== 0) return;
      // 管理员不自动弹；调试全流程可强制
      if (this.data.isAuthorized && !forceReplay && !debugUserFlow.shouldForceUserGuides()) {
        // 若身份晚到时教学已误开，立刻关掉并记完成，避免卡在第 2/7 步
        if (this.data.showHomeGuide || this.data.showHomeGuideIntro) {
          this._markHomeGuideDoneForever();
          this.closeHomeGuide(false);
        }
        return;
      }
      if (this.data.showHomeGuide || this.data.showHomeGuideIntro) {
        if (forceReplay) {
          this.closeHomeGuide(false);
        } else {
          return;
        }
      }
      if (this._homeGuideStartTimer) {
        clearTimeout(this._homeGuideStartTimer);
        this._homeGuideStartTimer = null;
      }
      if (forceReplay) {
        this._startHomeGuideSteps({ force: true });
        return;
      }
      const entry = resolveGuideAutoEntry(HOME_GUIDE_INTRO_KEYS);
      // 仅真正的「首次」走分步教程；曾看过 intro / 已跳过 都不再弹
      if (entry !== 'steps') return;
      // 一开始就记永久完成，避免中途退出后又自动弹第二次
      this._markHomeGuideDoneForever();
      this._startHomeGuideSteps({ force: false });
    };

    if (forceReplay) {
      run();
      return;
    }
    const p = this._adminPrivilegePromise;
    if (p && typeof p.then === 'function') {
      p.then(run).catch(run);
      return;
    }
    run();
  },

  _startHomeGuideSteps(opts) {
    const force = !!(opts && opts.force);
    if (this._homeGuideStartTimer) clearTimeout(this._homeGuideStartTimer);
    this._homeGuideStartTimer = setTimeout(() => {
      this._homeGuideStartTimer = null;
      if (this.data.hubTabIndex !== 0) return;
      if (this.data.isAuthorized && !force && !debugUserFlow.shouldForceUserGuides()) {
        this._markHomeGuideDoneForever();
        this.closeHomeGuide(false);
        return;
      }
      this._showHomeGuideStep(1, 0);
    }, force ? 80 : 360);
  },

  homeGuideIntroStart() {
    // 旧版「再次进入先问看不看」已废弃；兜底当跳过处理
    this.homeGuideSkip();
  },

  _hideHomeGuideBubbleOnly() {
    return new Promise((resolve) => {
      this.setData({
        homeGuideShowBubble: false
      }, () => {
        wx.nextTick(() => resolve());
      });
    });
  },

  _scrollHomeGuideTo(viewId, done) {
    const id = String(viewId || '').replace(/^#/, '');
    if (!id) {
      if (typeof done === 'function') done();
      return;
    }
    // 仅程序滚动时短暂放开，防止用户手指拖动导致高亮错位
    this.setData({ homeGuideAllowScroll: true, homeGuideScrollIntoView: '' }, () => {
      wx.nextTick(() => {
        this.setData({ homeGuideScrollIntoView: id }, () => {
          setTimeout(() => {
            this.setData({
              homeGuideScrollIntoView: '',
              homeGuideAllowScroll: false
            });
            if (typeof done === 'function') done();
          }, 380);
        });
      });
    });
  },

  _showHomeGuideStep(stepNo, retryCount) {
    const steps = HOME_GUIDE_STEPS;
    const step = steps[stepNo - 1];
    if (!step) {
      this.closeHomeGuide(false);
      return;
    }
    const retry = Number(retryCount) || 0;
    const readyText = step.btnText || (stepNo >= steps.length ? '知道了' : '下一步');

    // 切步：白气泡先收起 → 滚到目标 → 高亮框滑过去 → 再弹出白气泡
    if (retry === 0) {
      const isFirstStep = stepNo === 1 && !this.data.homeGuideShowSpot;
      this._hideHomeGuideBubbleOnly().then(() => {
        this.setData({
          showHomeGuide: true,
          showHomeGuideIntro: false,
          homeGuideStep: stepNo,
          homeGuideStepTag: `第 ${stepNo} / ${steps.length} 步`,
          homeGuideTitle: step.title,
          homeGuideDesc: step.desc,
          homeGuideBtnText: readyText,
          homeGuideShowBubble: false
        }, () => {
          this._scrollHomeGuideTo(step.scrollIntoView || step.anchor, () => {
            setTimeout(() => this._paintHomeGuideStep(stepNo, 0, { slideSpot: !isFirstStep }), 80);
          });
        });
      });
      return;
    }

    this._paintHomeGuideStep(stepNo, retry, { slideSpot: false });
  },

  _paintHomeGuideStep(stepNo, retryCount, opts) {
    const slideSpot = !!(opts && opts.slideSpot);
    const steps = HOME_GUIDE_STEPS;
    const step = steps[stepNo - 1];
    if (!step) {
      this.closeHomeGuide(false);
      return;
    }
    const retry = Number(retryCount) || 0;
    const readyText = step.btnText || (stepNo >= steps.length ? '知道了' : '下一步');
    const query = wx.createSelectorQuery().in(this);
    query.select(step.anchor).boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      if (!rect || !rect.width) {
        if (retry < 6) {
          setTimeout(() => this._paintHomeGuideStep(stepNo, retry + 1, opts), 200);
          return;
        }
        this.setData({
          showHomeGuide: true,
          showHomeGuideIntro: false,
          homeGuideStep: stepNo,
          homeGuideStepTag: `第 ${stepNo} / ${steps.length} 步`,
          homeGuideTitle: step.title,
          homeGuideDesc: step.desc,
          homeGuideBtnText: readyText,
          homeGuideShowSpot: false,
          homeGuideShowBubble: true,
          homeGuideSpotStyle: 'display:none;',
          homeGuideBubbleStyle: 'left:50%; top:50%; transform:translate(-50%,-50%); width:520rpx;',
          homeGuideArrowDir: 'none',
          homeGuideArrowStyle: 'display:none;'
        });
        return;
      }

      let win = null;
      try {
        win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      } catch (e) {
        win = wx.getSystemInfoSync();
      }
      const winW = (win && win.windowWidth) || 375;
      const winH = (win && win.windowHeight) || 667;
      const pad = 6;
      const spotLeft = Math.max(0, rect.left - pad);
      const spotTop = Math.max(0, rect.top - pad);
      const spotW = Math.min(winW - spotLeft, rect.width + pad * 2);
      const spotH = Math.min(winH - spotTop, rect.height + pad * 2);
      const spotStyle = `left:${spotLeft}px;top:${spotTop}px;width:${spotW}px;height:${spotH}px;`;

      const bubbleW = Math.min(280, winW - 32);
      const centerX = rect.left + rect.width / 2;
      let bubbleLeft = centerX - bubbleW / 2;
      if (bubbleLeft < 16) bubbleLeft = 16;
      if (bubbleLeft + bubbleW > winW - 16) bubbleLeft = winW - 16 - bubbleW;

      const placeAbove = rect.top > winH * 0.42;
      let bubbleStyle = '';
      let arrowDir = 'up';
      if (placeAbove) {
        const bottom = winH - rect.top + 12;
        bubbleStyle = `left:${bubbleLeft}px;bottom:${bottom}px;width:${bubbleW}px;`;
        arrowDir = 'down';
      } else {
        const top = rect.top + rect.height + 12;
        bubbleStyle = `left:${bubbleLeft}px;top:${top}px;width:${bubbleW}px;`;
        arrowDir = 'up';
      }
      const arrowLeft = centerX - bubbleLeft;

      // 高亮框先到位（可带动画滑动）；白气泡等滑动稍后再出
      const revealBubbleMs = slideSpot ? 340 : 0;
      this.setData({
        showHomeGuide: true,
        showHomeGuideIntro: false,
        homeGuideStep: stepNo,
        homeGuideStepTag: `第 ${stepNo} / ${steps.length} 步`,
        homeGuideTitle: step.title,
        homeGuideDesc: step.desc,
        homeGuideBtnText: readyText,
        homeGuideShowSpot: true,
        homeGuideShowBubble: false,
        homeGuideSpotStyle: spotStyle,
        homeGuideBubbleStyle: bubbleStyle,
        homeGuideArrowDir: arrowDir,
        homeGuideArrowStyle: `left:${arrowLeft}px;`
      }, () => {
        if (this._homeGuideBubbleRevealTimer) {
          clearTimeout(this._homeGuideBubbleRevealTimer);
          this._homeGuideBubbleRevealTimer = null;
        }
        this._homeGuideBubbleRevealTimer = setTimeout(() => {
          this._homeGuideBubbleRevealTimer = null;
          if (!this.data.showHomeGuide || this.data.homeGuideStep !== stepNo) return;
          this.setData({ homeGuideShowBubble: true });
        }, revealBubbleMs);
      });
    });
  },

  homeGuideNext() {
    const cur = Number(this.data.homeGuideStep) || 0;
    if (cur >= HOME_GUIDE_STEPS.length) {
      this._markHomeGuideDoneForever();
      this.closeHomeGuide(false);
      return;
    }
    this._showHomeGuideStep(cur + 1, 0);
  },

  homeGuideSkip() {
    this._markHomeGuideDoneForever();
    this.closeHomeGuide(false);
  },

  closeHomeGuide(_markDone) {
    if (this._homeGuideStartTimer) {
      clearTimeout(this._homeGuideStartTimer);
      this._homeGuideStartTimer = null;
    }
    if (this._homeGuideBubbleRevealTimer) {
      clearTimeout(this._homeGuideBubbleRevealTimer);
      this._homeGuideBubbleRevealTimer = null;
    }
    if (this.data.showHomeGuide || this.data.showHomeGuideIntro || this.data.homeGuideScrollIntoView) {
      this.setData({
        showHomeGuide: false,
        showHomeGuideIntro: false,
        homeGuideStep: 0,
        homeGuideShowSpot: false,
        homeGuideShowBubble: false,
        homeGuideAllowScroll: false,
        homeGuideSpotStyle: 'display:none;',
        homeGuideBubbleStyle: 'display:none;',
        homeGuideScrollIntoView: ''
      });
    }
  }
};

module.exports = {
  getHomeGuideData,
  homeGuideMethods,
  HOME_GUIDE_INTRO_KEYS
};
