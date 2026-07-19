const {
  getGuideIntroKeys,
  markGuideIntroSeen,
  markGuidePermSkip,
  resolveGuideAutoEntry
} = require('../../../utils/usageGuideIntro.js');
const { startGuideBtnCountdown, clearGuideBtnCountdown } = require('../../../utils/guideBtnCountdown.js');
const debugUserFlow = require('../../../utils/debugUserFlow.js');

const PROFILE_GUIDE_BASE_KEY = 'mt_profile_first_visit_guide_done_v1';
const PROFILE_GUIDE_INTRO_KEYS = getGuideIntroKeys(PROFILE_GUIDE_BASE_KEY);

const PROFILE_GUIDE_STEPS = [
  {
    key: 'invite',
    anchor: '#myGuideInviteBlock',
    scrollIntoView: 'myGuideInviteBlock',
    title: '邀请有礼',
    btnText: '下一步',
    desc: '邀请好友注册并下单，每成功邀请 1 人可获得一张 ¥15 商城通用券（满 15.01 可用），优惠券会出现在下方卡券区。'
  },
  {
    key: 'device',
    anchor: '#myGuideBindDevice',
    scrollIntoView: 'myGuideBindDevice',
    title: '我的设备',
    btnText: '下一步',
    desc: '这里展示您已绑定的设备。需要绑定新产品时，点「绑定新产品」进入蓝牙连接与资料提交流程。'
  },
  {
    key: 'bind_scan',
    anchor: '#myGuideBtScan',
    inModal: true,
    openBindDemo: true,
    title: '蓝牙连接设备',
    btnText: '下一步',
    desc: '实际绑定时，点击此处搜索并连接附近设备；连接成功后会自动识别序列号。'
  },
  {
    key: 'bind_form',
    anchor: '#myGuideBindForm',
    inModal: true,
    mockConnected: true,
    title: '填写绑定资料',
    btnText: '知道了',
    desc: '选择产品型号，上传购买截图与购买日期后提交审核。教程演示结束，请关闭弹窗后在实际绑定时按此流程操作。'
  }
];

function getProfileGuideDataPatch() {
  return {
    showProfileGuide: false,
    showProfileGuideIntro: false,
    profileGuideActive: false,
    profileGuideDemoBind: false,
    profileGuideStep: 0,
    profileGuideStepTag: '',
    profileGuideTitle: '',
    profileGuideDesc: '',
    profileGuideBtnText: '下一步',
    profileGuideBtnLocked: true,
    profileGuideSpotStyle: 'display:none;',
    profileGuideBubbleStyle: '',
    profileGuideArrowStyle: '',
    profileGuideArrowDir: 'up',
    profileGuideShowSpot: false,
    profileGuideShowBubble: false,
    profileGuideBubbleEnter: false,
    profileGuideCenterOnly: false,
    profileGuideScrollIntoView: '',
    profileGuideModalScrollIntoView: '',
    profileGuideAnimating: false,
    profileGuideMaskPassthrough: false
  };
}

function getProfileGuidePatch() {
  return {
    dataPatch: getProfileGuideDataPatch(),
    observers: {
      active(val) {
        if (!this._hubPanelAttached || this.data.hubView !== 'profile') return;
        if (val && !this._isProfileGuideAdmin()) {
          this._maybeShowProfileGuide(false);
        } else {
          if (this.data.showProfileGuide || this.data.showProfileGuideIntro) {
            this.closeProfileGuide(false);
          }
          if (this.data.hubInShell && this.data.showModal) {
            this.setData({ showModal: false });
            if (typeof this.updateModalState === 'function') {
              this.updateModalState();
            }
          }
        }
      }
    },
    onAttachedExtra() {
      if (this.properties.active && this.data.hubView === 'profile' && !this._isProfileGuideAdmin()) {
        this._maybeShowProfileGuide(false);
      }
    },
    methodPatch: {
      profileGuideNoop() {},

      /** 白名单管理员（含壳层同步身份）：不弹「我的」功能教程 */
      _isProfileGuideAdmin() {
        if (debugUserFlow.shouldForceUserGuides()) return false;
        return !!(
          this.data.isAdmin ||
          this.data.isAuthorized ||
          this.properties.shellAdmin ||
          this.properties.shellAuthorized
        );
      },

      _clearProfileGuideForUserAction() {
        this._clearProfileGuideTimers();
        this._profileGuideBusy = false;
        this.setData({
          showProfileGuide: false,
          showProfileGuideIntro: false,
          profileGuideActive: false,
          profileGuideDemoBind: false,
          profileGuideShowSpot: false,
          profileGuideShowBubble: false,
          profileGuideCenterOnly: false,
          profileGuideMaskPassthrough: false,
          profileGuideStep: 0,
          profileGuideSpotStyle: 'display:none;',
          profileGuideBubbleStyle: '',
          profileGuideModalScrollIntoView: ''
        }, () => {
          if (typeof this.updateModalState === 'function') this.updateModalState();
        });
      },

      profileGuideSkip() {
        if (!this._isProfileGuideAdmin()) {
          markGuidePermSkip(PROFILE_GUIDE_INTRO_KEYS);
        }
        this.closeProfileGuide(false);
      },

      profileGuideIntroStart() {
        this.setData({ showProfileGuideIntro: false }, () => {
          if (typeof this.updateModalState === 'function') this.updateModalState();
          this._startProfileGuideSteps();
        });
      },

      _maybeShowProfileGuide(forceReplay) {
        if (this.data.hubView !== 'profile') return;
        // 管理员（管理模式 / 白名单）一律不弹
        if (this._isProfileGuideAdmin()) {
          if (this.data.showProfileGuide || this.data.showProfileGuideIntro) {
            this.closeProfileGuide(false);
          }
          return;
        }
        if (this.data.showProfileGuide || this.data.showProfileGuideIntro) return;
        if (this._profileGuideStartTimer) clearTimeout(this._profileGuideStartTimer);
        if (forceReplay) {
          this._startProfileGuideSteps();
          return;
        }
        const entry = resolveGuideAutoEntry(PROFILE_GUIDE_INTRO_KEYS);
        if (entry === 'none') return;
        if (entry === 'intro') {
          this.setData({ showProfileGuideIntro: true }, () => {
            if (typeof this.updateModalState === 'function') this.updateModalState();
          });
          return;
        }
        this._startProfileGuideSteps();
      },

      _startProfileGuideSteps() {
        if (this._profileGuideStartTimer) clearTimeout(this._profileGuideStartTimer);
        // 枢纽横滑停稳后再量坐标，避免高亮框左右偏
        this._profileGuideStartTimer = setTimeout(() => {
          this._profileGuideStartTimer = null;
          if (!this.properties.active || this._isProfileGuideAdmin()) return;
          this._showProfileGuideStep(1, 0, { isFirst: true });
        }, 360);
      },

      _clearProfileGuideTimers() {
        if (this._profileGuideStartTimer) {
          clearTimeout(this._profileGuideStartTimer);
          this._profileGuideStartTimer = null;
        }
        if (this._profileGuideStepTimer) {
          clearTimeout(this._profileGuideStepTimer);
          this._profileGuideStepTimer = null;
        }
        if (this._profileGuideRefineTimers && this._profileGuideRefineTimers.length) {
          this._profileGuideRefineTimers.forEach((t) => clearTimeout(t));
          this._profileGuideRefineTimers = [];
        }
        clearGuideBtnCountdown(this, '_profileGuideBtnTimer');
      },

      _armProfileGuideBtnLock(readyText) {
        startGuideBtnCountdown(this, {
          lockedKey: 'profileGuideBtnLocked',
          textKey: 'profileGuideBtnText',
          readyText: readyText || '下一步',
          timerProp: '_profileGuideBtnTimer'
        });
      },

      _profileGuideDelay(ms) {
        // 每次独立 timer，避免相互 clear 导致 await 永久挂起
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      },

      /** 收起当前气泡（框先留着，等下一步再移） */
      _profileGuideHideBubble() {
        return new Promise((resolve) => {
          this.setData({
            profileGuideShowBubble: false,
            profileGuideBubbleEnter: false,
            profileGuideAnimating: false
          }, () => {
            setTimeout(resolve, 40);
          });
        });
      },

      /** 弹出说明气泡：先挂载再触发 transition，避免卡在透明 */
      _profileGuideRevealBubble() {
        return new Promise((resolve) => {
          this.setData({
            profileGuideShowBubble: true,
            profileGuideBubbleEnter: true,
            profileGuideAnimating: false
          }, () => {
            setTimeout(() => {
              this.setData({
                profileGuideBubbleEnter: false,
                profileGuideAnimating: true
              }, () => {
                setTimeout(() => {
                  this.setData({ profileGuideAnimating: false });
                  resolve();
                }, 100);
              });
            }, 16);
          });
        });
      },

      /**
       * 步骤展示顺序：
       * 1) 准备目标（滚动 / 打开演示弹窗）
       * 2) 高亮框移到新位置
       * 3) 再弹出说明气泡
       */
      async _showProfileGuideStep(stepNo, retryCount, options) {
        const opts = options || {};
        const step = PROFILE_GUIDE_STEPS[stepNo - 1];
        if (!step) {
          this.closeProfileGuide(false);
          return;
        }

        // 下一步切换时：先只收气泡，框稍后挪到新锚点
        if (!opts.isFirst && this.data.profileGuideShowBubble) {
          await this._profileGuideHideBubble();
        }

        if (step.openBindDemo) {
          this.setData({
            profileGuideShowSpot: false,
            profileGuideSpotStyle: 'display:none;',
            profileGuideMaskPassthrough: false
          });
          this._profileGuideOpenBindDemo();
          // 等白卡上滑到位即可，不要空等太久
          await this._profileGuideDelay(180);
        } else if (step.mockConnected) {
          // 最后一步「填写绑定资料」：尽快露出表单并弹出说明，避免连串空等
          this.setData({
            profileGuideShowSpot: false,
            profileGuideSpotStyle: 'display:none;'
          });
          await this._profileGuideMockConnectedAsync();
          await new Promise((resolve) => {
            this.setData({ profileGuideModalScrollIntoView: 'myGuideBindForm' }, () => {
              setTimeout(() => {
                this.setData({ profileGuideModalScrollIntoView: '' });
                resolve();
              }, 80);
            });
          });
        } else if (step.scrollIntoView) {
          this.setData({
            profileGuideShowSpot: false,
            profileGuideSpotStyle: 'display:none;'
          });
          await new Promise((resolve) => {
            this.setData({ profileGuideScrollIntoView: step.scrollIntoView }, () => {
              setTimeout(() => {
                this.setData({ profileGuideScrollIntoView: '' });
                resolve();
              }, opts.isFirst ? 160 : 200);
            });
          });
        }

        await this._profileGuideDelay(step.mockConnected ? 16 : (step.inModal ? 40 : 40));
        await this._paintProfileGuideSpotThenBubble(stepNo, step, retryCount, opts.isFirst);
      },

      _profileGuideQueryIn() {
        if (typeof this.createSelectorQuery === 'function') {
          return this.createSelectorQuery();
        }
        return wx.createSelectorQuery().in(this);
      },

      _measureProfileGuideAnchor(step) {
        return new Promise((resolve) => {
          const query = this._profileGuideQueryIn();
          query.select(step.anchor).boundingClientRect();
          query.exec((res) => {
            resolve((res && res[0]) || null);
          });
        });
      },

      _calcProfileGuideLayout(step, rect) {
        let win = null;
        try {
          win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        } catch (e) {
          win = { windowWidth: 375, windowHeight: 667 };
        }
        const winW = (win && win.windowWidth) || 375;
        const winH = (win && win.windowHeight) || 667;
        const padPx = 4;
        // 高亮框+光晕不得越出屏幕内容区
        const edgeInset = 12;
        const marginPx = 16;
        const gapPx = 12;
        const bubbleMaxH = Math.min(320, Math.round(winH * 0.42));
        let spotLeft = rect.left - padPx;
        let spotTop = rect.top - padPx;
        let spotRight = rect.left + rect.width + padPx;
        let spotBottom = rect.top + rect.height + padPx;
        spotLeft = Math.max(edgeInset, spotLeft);
        spotTop = Math.max(edgeInset, spotTop);
        spotRight = Math.min(winW - edgeInset, spotRight);
        spotBottom = Math.min(winH - edgeInset, spotBottom);
        const spotW = Math.max(1, spotRight - spotLeft);
        const spotH = Math.max(1, spotBottom - spotTop);
        const spotStyle = `left:${spotLeft}px; top:${spotTop}px; width:${spotW}px; height:${spotH}px;`;

        const spaceBelowPx = winH - (rect.top + rect.height);
        const spaceAbovePx = rect.top;
        let bubbleStyle = '';
        let arrowDir = 'up';

        if (step.key === 'bind_form' || spaceBelowPx < 160) {
          if (spaceAbovePx > 180) {
            const bottomPx = winH - rect.top + gapPx;
            bubbleStyle = `left:${marginPx}px; right:${marginPx}px; bottom:${bottomPx}px; width:auto; max-height:${bubbleMaxH}px; overflow-y:auto;`;
            arrowDir = 'down';
          } else {
            const topPx = rect.top + rect.height + gapPx;
            bubbleStyle = `left:${marginPx}px; right:${marginPx}px; top:${topPx}px; width:auto; max-height:${bubbleMaxH}px; overflow-y:auto;`;
            arrowDir = 'up';
          }
        } else if (spaceBelowPx > 140) {
          const topPx = rect.top + rect.height + gapPx;
          bubbleStyle = `left:${marginPx}px; right:${marginPx}px; top:${topPx}px; width:auto; max-height:${bubbleMaxH}px; overflow-y:auto;`;
          arrowDir = 'up';
        } else {
          const bottomPx = winH - rect.top + gapPx;
          bubbleStyle = `left:${marginPx}px; right:${marginPx}px; bottom:${bottomPx}px; width:auto; max-height:${bubbleMaxH}px; overflow-y:auto;`;
          arrowDir = 'down';
        }

        const arrowLeftPx = rect.left + rect.width / 2 - marginPx;
        return {
          spotStyle,
          bubbleStyle,
          arrowDir,
          arrowStyle: `left:${arrowLeftPx}px;`
        };
      },

      /** 横滑/回流后二次校准高亮，专治框往右/往左偏 */
      _refineProfileGuideSpot(stepNo) {
        const step = PROFILE_GUIDE_STEPS[stepNo - 1];
        if (!step || !this.data.showProfileGuide || this.data.profileGuideStep !== stepNo) return;
        this._measureProfileGuideAnchor(step).then((rect) => {
          if (!rect || !rect.width || !rect.height) return;
          if (!this.data.showProfileGuide || this.data.profileGuideStep !== stepNo) return;
          const layout = this._calcProfileGuideLayout(step, rect);
          this.setData({
            profileGuideSpotStyle: layout.spotStyle,
            profileGuideBubbleStyle: layout.bubbleStyle,
            profileGuideArrowDir: layout.arrowDir,
            profileGuideArrowStyle: layout.arrowStyle
          });
        });
      },

      _scheduleProfileGuideSpotRefine(stepNo) {
        if (this._profileGuideRefineTimers && this._profileGuideRefineTimers.length) {
          this._profileGuideRefineTimers.forEach((t) => clearTimeout(t));
        }
        this._profileGuideRefineTimers = [120, 280].map((ms) =>
          setTimeout(() => this._refineProfileGuideSpot(stepNo), ms)
        );
      },

      async _paintProfileGuideSpotThenBubble(stepNo, step, retryCount, isFirst) {
        const rect = await this._measureProfileGuideAnchor(step);
        if (!rect || !rect.width || !rect.height) {
          const retry = Number(retryCount) || 0;
          // 绑定表单锚点偶发未渲染：缩短重试间隔，避免最后一步干等数秒
          const maxRetry = step.mockConnected ? 12 : 14;
          const retryMs = step.mockConnected ? 50 : 200;
          if (retry < maxRetry) {
            await this._profileGuideDelay(retryMs);
            return this._paintProfileGuideSpotThenBubble(stepNo, step, retry + 1, isFirst);
          }
          this._profileGuidePaintCenter(stepNo, step);
          return;
        }

        const layout = this._calcProfileGuideLayout(step, rect);

        // ① 先搬高亮框（气泡仍隐藏）
        await new Promise((resolve) => {
          this.setData({
            showProfileGuide: true,
            profileGuideActive: true,
            profileGuideStep: stepNo,
            profileGuideStepTag: `第 ${stepNo} 步`,
            profileGuideTitle: step.title,
            profileGuideDesc: step.desc,
            profileGuideBtnText: step.btnText || '下一步',
            profileGuideBtnLocked: true,
            profileGuideShowSpot: true,
            profileGuideShowBubble: false,
            profileGuideBubbleEnter: false,
            profileGuideCenterOnly: false,
            profileGuideMaskPassthrough: false,
            profileGuideSpotStyle: layout.spotStyle,
            profileGuideBubbleStyle: layout.bubbleStyle,
            profileGuideArrowDir: layout.arrowDir,
            profileGuideArrowStyle: layout.arrowStyle,
            profileGuideAnimating: false
          }, () => {
            if (typeof this.updateModalState === 'function') this.updateModalState();
            resolve();
          });
        });

        // ② 等框移动/落下（最后一步尽量缩短）
        await this._profileGuideDelay(isFirst ? 40 : (step.mockConnected ? 40 : 100));

        // ③ 再弹出说明气泡（保证最终不透明）
        await this._profileGuideRevealBubble();
        this._armProfileGuideBtnLock(step.btnText || '下一步');
        this._scheduleProfileGuideSpotRefine(stepNo);
      },

      async profileGuideNext() {
        if (this.data.profileGuideBtnLocked) return;
        if (this._profileGuideBusy) return;
        const cur = this.data.profileGuideStep;
        const step = PROFILE_GUIDE_STEPS[cur - 1];
        if (step && step.key === 'bind_form') {
          this._profileGuideFinishBindDemo();
          return;
        }
        if (cur >= PROFILE_GUIDE_STEPS.length) {
          markGuideIntroSeen(PROFILE_GUIDE_INTRO_KEYS);
          this.closeProfileGuide(false);
          return;
        }

        this._profileGuideBusy = true;
        try {
          const next = cur + 1;
          await this._showProfileGuideStep(next, 0, { isFirst: false });
        } finally {
          this._profileGuideBusy = false;
        }
      },

      _profileGuidePaintCenter(stepNo, step) {
        let win = null;
        try {
          win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        } catch (e) {
          win = { windowHeight: 667 };
        }
        const winH = (win && win.windowHeight) || 667;
        const marginPx = 16;
        const bubbleMaxH = Math.min(320, Math.round(winH * 0.42));
        this.setData({
          showProfileGuide: true,
          profileGuideActive: true,
          profileGuideStep: stepNo,
          profileGuideStepTag: `第 ${stepNo} 步`,
          profileGuideTitle: step.title,
          profileGuideDesc: step.desc,
          profileGuideBtnText: step.btnText || '下一步',
          profileGuideBtnLocked: true,
          profileGuideShowSpot: false,
          profileGuideShowBubble: true,
          profileGuideBubbleEnter: false,
          profileGuideCenterOnly: true,
          profileGuideMaskPassthrough: false,
          profileGuideSpotStyle: 'display:none;',
          profileGuideBubbleStyle: `left:${marginPx}px; right:${marginPx}px; top:50%; width:auto; max-height:${bubbleMaxH}px; overflow-y:auto;`,
          profileGuideArrowDir: 'up',
          profileGuideArrowStyle: 'display:none;',
          profileGuideAnimating: true
        }, () => {
          if (typeof this.updateModalState === 'function') this.updateModalState();
          this._armProfileGuideBtnLock(step.btnText || '下一步');
        });
      },

      _profileGuideOpenBindDemo() {
        this._profileGuideAllowBindOpen = true;
        this._profileGuideAllowReset = true;
        if (typeof this.resetBluetoothState === 'function') {
          this.resetBluetoothState();
        }
        this._profileGuideAllowReset = false;
        this.setData({
          profileGuideDemoBind: true,
          profileGuideMaskPassthrough: false,
          showModal: true,
          bindSheetFromBottom: true,
          bindModalScrollH: typeof this._calcBindModalScrollH === 'function'
            ? this._calcBindModalScrollH()
            : 400,
          bluetoothReady: false,
          isScanning: false,
          connectStatusText: '点击搜索设备（演示）',
          showBindAuditForm: false,
          showFaultBindForm: false
        }, () => {
          // 尽快松开 from-bottom，白卡马上滑上来
          setTimeout(() => {
            this.setData({ bindSheetFromBottom: false });
          }, 16);
          if (typeof this.updateModalState === 'function') {
            this.updateModalState();
          }
          this._profileGuideAllowBindOpen = false;
        });
      },

      _profileGuideMockConnected() {
        const modelOptions = this.data.modelOptions || [];
        this.setData({
          profileGuideDemoBind: true,
          isScanning: false,
          bluetoothReady: true,
          showBindAuditForm: true,
          showFaultBindForm: false,
          connectStatusText: '演示：已连接设备',
          connectedDeviceName: 'MT-DEMO（演示）',
          bindType: 'new',
          modelIndex: modelOptions.length ? 0 : null,
          buyDate: '2025-01-01',
          isDeviceLocked: false,
          lockedReason: ''
        });
      },

      /** 等演示「已连接 + 表单」真正 setData 完成再测锚点，减少干等重试 */
      _profileGuideMockConnectedAsync() {
        return new Promise((resolve) => {
          const modelOptions = this.data.modelOptions || [];
          this.setData({
            profileGuideDemoBind: true,
            isScanning: false,
            bluetoothReady: true,
            showBindAuditForm: true,
            showFaultBindForm: false,
            connectStatusText: '演示：已连接设备',
            connectedDeviceName: 'MT-DEMO（演示）',
            bindType: 'new',
            modelIndex: modelOptions.length ? 0 : null,
            buyDate: '2025-01-01',
            isDeviceLocked: false,
            lockedReason: ''
          }, () => {
            wx.nextTick(() => resolve());
          });
        });
      },

      _profileGuideFinishBindDemo() {
        this._profileGuideAllowClose = true;
        if (typeof this.closeBindModal === 'function') {
          this.closeBindModal();
        }
        this._profileGuideAllowClose = false;
        this._profileGuideBusy = false;
        this.setData({
          profileGuideDemoBind: false,
          profileGuideActive: false,
          profileGuideShowSpot: false,
          profileGuideShowBubble: false,
          profileGuideCenterOnly: false,
          profileGuideMaskPassthrough: false,
          showProfileGuide: false,
          profileGuideStep: 0,
          profileGuideSpotStyle: 'display:none;',
          profileGuideModalScrollIntoView: ''
        }, () => {
          if (typeof this.updateModalState === 'function') this.updateModalState();
        });
        markGuideIntroSeen(PROFILE_GUIDE_INTRO_KEYS);
        wx.showToast({ title: '教程已完成', icon: 'success' });
      },

      closeProfileGuide(_markDone) {
        this._clearProfileGuideTimers();
        this._profileGuideBusy = false;
        if (this.data.profileGuideDemoBind) {
          this._profileGuideFinishBindDemo();
          return;
        }
        if (this.data.showProfileGuide || this.data.showProfileGuideIntro) {
          this.setData({
            showProfileGuide: false,
            showProfileGuideIntro: false,
            profileGuideActive: false,
            profileGuideShowSpot: false,
            profileGuideShowBubble: false,
            profileGuideCenterOnly: false,
            profileGuideMaskPassthrough: false,
            profileGuideStep: 0,
            profileGuideSpotStyle: 'display:none;',
            profileGuideModalScrollIntoView: ''
          }, () => {
            if (typeof this.updateModalState === 'function') this.updateModalState();
          });
        }
      }
    }
  };
}

module.exports = {
  PROFILE_GUIDE_BASE_KEY,
  getProfileGuidePatch
};
