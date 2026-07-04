const { createVoiceRecognizer, warmupVoicePlugin } = require('../../../utils/voiceControl.js');
const f2VoiceBridge = require('../../../utils/f2VoiceBridge.js');

const DEFAULT_SUB_MSG = '您可以说「开」「关」，或「翻开牌照」「收起牌照」';

function buildStatusMetaText(state) {
  switch (state) {
    case 'open':
      return '牌照已打开';
    case 'closed':
      return '牌照已收起';
    case 'stealth':
      return '隐蔽模式中';
    case 'moving':
      return '牌照运动中';
    default:
      return '牌照状态未知';
  }
}

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 44,
    flapPanelState: 'unknown',
    flapPanelStateText: '状态未知',
    statusMetaText: '牌照状态未知',
    voiceListening: false,
    voiceHint: DEFAULT_SUB_MSG,
    voiceLastCmd: '',
    voiceHearing: false,
    rippleClass: 'dormant',
    mainMsg: '准备中',
    subMsg: DEFAULT_SUB_MSG,
    showAdminFooter: false
  },

  onLoad() {
    this._voiceSessionWanted = false;
    this._voiceResumeAfterBle = false;
    this._voiceHintLastAt = 0;
    this._unsubscribeBridge = null;
    this._voiceStoppedOnHide = false;
    this._voiceStopPending = false;
    this._pageActive = false;

    try {
      const windowInfo = wx.getWindowInfo();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = menuButton.height + gap * 2;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }

    warmupVoicePlugin();
    this.initVoiceRecognizer();
    this._syncFlapFromBridge();
    this._syncBleFromBridge();
  },

  onShow() {
    this._pageActive = true;
    this._voiceStoppedOnHide = false;
    this._voiceStopPending = false;
    this._unsubscribeBridge = f2VoiceBridge.subscribe((event) => this._onBridgeEvent(event));
    this._syncFlapFromBridge();
    this._syncBleFromBridge();
    if (this._voiceResumeAfterBle && this._voiceSessionWanted) {
      this._resumeVoiceAfterBleReconnect();
    } else if (!this.data.voiceListening && this._voice && this._voice.supported) {
      setTimeout(() => {
        if (!this._pageActive || this._voiceStoppedOnHide) return;
        this._requestMicAndStart();
      }, 80);
    }
  },

  onHide() {
    this._pageActive = false;
    if (this._unsubscribeBridge) {
      this._unsubscribeBridge();
      this._unsubscribeBridge = null;
    }
    this._voiceResumeAfterBle = !!this._voiceSessionWanted;
    this._voiceStoppedOnHide = true;
    this._stopVoiceListening(false);
  },

  onUnload() {
    if (this._unsubscribeBridge) {
      this._unsubscribeBridge();
      this._unsubscribeBridge = null;
    }
    this._voiceSessionWanted = false;
    this._voiceResumeAfterBle = false;
    if (!this._voiceStoppedOnHide) {
      this._stopVoiceListening(true);
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  _onBridgeEvent(event) {
    if (!event || !event.type) return;
    if (event.type === 'flap') {
      this._applyFlapState(event.flapPanelState, event.flapPanelStateText);
    } else if (event.type === 'connection') {
      this._syncBleFromBridge();
      if (!event.connected) {
        this._voiceResumeAfterBle = !!this._voiceSessionWanted;
        this._stopVoiceListening(false);
        this.setData(this._syncVoiceUiPatch({ voiceHint: '蓝牙已断开' }));
      } else if (this._voiceResumeAfterBle) {
        this._resumeVoiceAfterBleReconnect();
      }
    }
  },

  _syncFlapFromBridge() {
    const flap = f2VoiceBridge.getFlapState();
    this._applyFlapState(flap.flapPanelState, flap.flapPanelStateText);
  },

  _syncBleFromBridge() {
    const linked = f2VoiceBridge.isBleLinked();
    const admin = f2VoiceBridge.isAdmin();
    this.setData({
      showAdminFooter: admin && !linked
    });
  },

  _applyFlapState(state, subText) {
    const flapPanelState = state || 'unknown';
    this.setData({
      flapPanelState,
      flapPanelStateText: subText || '',
      statusMetaText: buildStatusMetaText(flapPanelState)
    });
  },

  _buildRippleClass(listening, hearing) {
    if (listening && hearing) return 'speaking';
    if (listening) return 'quiet';
    return 'dormant';
  },

  _buildMainMsg(listening, hearing, hint) {
    if (listening && hearing) return '正在识别';
    if (listening) return '我在听';
    if (hint && hint.indexOf('已执行') >= 0) return '好了';
    if (hint && (hint.indexOf('失败') >= 0 || hint.indexOf('断开') >= 0)) return '请稍候';
    return '准备中';
  },

  _buildSubMsg(hint, listening, hearing) {
    if (!hint) return DEFAULT_SUB_MSG;
    if (hint.indexOf('听到：') === 0) return hint;
    if (hint.indexOf('已执行：') === 0) return hint;
    if (hint === '重新聆听中…') return '马上继续听您说';
    if (!listening && !hearing && hint !== DEFAULT_SUB_MSG) return hint;
    return DEFAULT_SUB_MSG;
  },

  _syncVoiceUiPatch(extra = {}) {
    const listening = extra.voiceListening !== undefined
      ? extra.voiceListening
      : this.data.voiceListening;
    const hearing = extra.voiceHearing !== undefined
      ? extra.voiceHearing
      : this.data.voiceHearing;
    const hint = extra.voiceHint !== undefined
      ? extra.voiceHint
      : this.data.voiceHint;
    const rippleClass = this._buildRippleClass(listening, hearing);
    return {
      ...extra,
      rippleClass,
      voiceHint: hint,
      mainMsg: this._buildMainMsg(listening, hearing, hint),
      subMsg: this._buildSubMsg(hint, listening, hearing)
    };
  },

  initVoiceRecognizer() {
    this._voice = createVoiceRecognizer({
      onStart: () => {
        this.setData(this._syncVoiceUiPatch({
          voiceListening: true,
          voiceHint: DEFAULT_SUB_MSG,
          voiceHearing: false
        }));
      },
      onRecognize: (res) => {
        const now = Date.now();
        if (this._voiceHearTimer) clearTimeout(this._voiceHearTimer);
        const patch = { voiceHearing: true };
        const raw = res && res.result != null ? String(res.result).trim() : '';
        if (raw) {
          if (!this._voiceHintLastAt || now - this._voiceHintLastAt > 180) {
            this._voiceHintLastAt = now;
            const snippet = raw.length > 16 ? `…${raw.slice(-16)}` : raw;
            const nextHint = `听到：${snippet}`;
            if (nextHint !== this.data.voiceHint) {
              patch.voiceHint = nextHint;
            }
          }
        } else if (!this.data.voiceHearing) {
          patch.voiceHint = '正在聆听…';
        }
        this.setData(this._syncVoiceUiPatch(patch));
        this._voiceHearTimer = setTimeout(() => {
          this._voiceHearTimer = null;
          if (this.data.voiceListening && this.data.voiceHearing) {
            this.setData(this._syncVoiceUiPatch({
              voiceHearing: false,
              voiceHint: DEFAULT_SUB_MSG
            }));
          }
        }, 2200);
      },
      onCommand: (cmd, text, source) => {
        this._sendVoiceCommand(cmd, { source, text });
      },
      onStop: () => {
        if (this._voiceSessionWanted) {
          this.setData(this._syncVoiceUiPatch({
            voiceHint: DEFAULT_SUB_MSG,
            voiceHearing: false
          }));
        }
      },
      onError: (res, meta) => {
        if (!meta || !meta.sessionActive || !this._voiceSessionWanted) {
          this._resetVoiceUi('语音识别失败');
          const msg = (res && (res.msg || res.errMsg)) || '语音识别失败';
          this._showCustomToast(msg, 'none', 2000);
          return;
        }
        this.setData(this._syncVoiceUiPatch({ voiceHint: '重新聆听中…', voiceHearing: false }));
        if (this._voice && this._voice.supported && this._voiceSessionWanted) {
          setTimeout(() => {
            if (!this._pageActive || !this._voiceSessionWanted) return;
            if (this._voice.isActive && this._voice.isActive()) return;
            try {
              this._voice.start({ continuous: true, duration: 60000 });
            } catch (e) { /* ignore */ }
          }, 160);
        }
      }
    });
  },

  _resetVoiceUi(hint) {
    if (this._voiceHearTimer) {
      clearTimeout(this._voiceHearTimer);
      this._voiceHearTimer = null;
    }
    this.setData(this._syncVoiceUiPatch({
      voiceListening: false,
      voiceHearing: false,
      voiceHint: hint || '已停止聆听'
    }));
  },

  _stopVoiceListening(clearWanted) {
    if (this._voiceStopPending) return;
    this._voiceStopPending = true;
    if (clearWanted) this._voiceSessionWanted = false;
    if (this._voice && this._voice.supported) {
      this._voice.stop();
    }
    if (this._voiceHearTimer) {
      clearTimeout(this._voiceHearTimer);
      this._voiceHearTimer = null;
    }
    if (clearWanted) {
      this._resetVoiceUi('已停止聆听');
    } else {
      this.setData(this._syncVoiceUiPatch({ voiceListening: false, voiceHearing: false }));
    }
    setTimeout(() => {
      this._voiceStopPending = false;
    }, 300);
  },

  _sendVoiceCommand(cmd, options = {}) {
    const { source = 'final', text = '' } = options;
    console.log(`📤 [语音${source}] 发送"${cmd}"`, text);

    this._voiceHintLastAt = Date.now();
    this.setData(this._syncVoiceUiPatch({
      voiceLastCmd: cmd,
      voiceHint: `已执行：${cmd}`,
      voiceHearing: false
    }));

    if (!f2VoiceBridge.canInteract()) {
      this._showCustomToast('当前不可操作', 'none', 1800);
      return;
    }
    if (this.data.flapPanelState === 'stealth') {
      this._showCustomToast('隐蔽模式中，请先退出', 'none', 2000);
      return;
    }

    const ok = f2VoiceBridge.sendFlapCommand(cmd);
    if (!ok) {
      this._showCustomToast('指令发送失败', 'none', 1800);
      return;
    }
    wx.vibrateShort({ type: 'light' });
  },

  _resumeVoiceAfterBleReconnect() {
    if (!this._voiceResumeAfterBle || !this._voiceSessionWanted) return;
    if (!f2VoiceBridge.canInteract() || !this._voice || !this._voice.supported) {
      this._voiceResumeAfterBle = false;
      return;
    }
    this._voiceResumeAfterBle = false;
    setTimeout(() => {
      if (!f2VoiceBridge.canInteract() || !this._voiceSessionWanted) return;
      try {
        this._voice.start({ continuous: true, duration: 60000 });
      } catch (e) {
        console.warn('[语音] 重连后恢复聆听失败', e);
      }
    }, 200);
  },

  _requestMicAndStart() {
    if (!f2VoiceBridge.isRegistered()) {
      this.setData(this._syncVoiceUiPatch({ voiceHint: '请从控制中心进入' }));
      return;
    }
    if (!this._voice || !this._voice.supported) {
      this._showCustomToast('语音插件未就绪', 'none', 2500);
      this.setData(this._syncVoiceUiPatch({ voiceHint: '语音插件未就绪' }));
      return;
    }
    if (!f2VoiceBridge.canInteract()) {
      this.setData(this._syncVoiceUiPatch({
        voiceHint: f2VoiceBridge.isAdmin() ? '管理员预览模式' : '请先连接蓝牙'
      }));
      return;
    }

    const startVoice = () => {
      this._voiceSessionWanted = true;
      try {
        this._voice.start({ continuous: true, duration: 60000 });
      } catch (e) {
        this._showCustomToast('启动聆听失败', 'none', 2000);
      }
    };

    wx.getSetting({
      success: (res) => {
        const auth = res.authSetting || {};
        if (auth['scope.record']) {
          startVoice();
          return;
        }
        wx.authorize({
          scope: 'scope.record',
          success: startVoice,
          fail: () => {
            this.setData(this._syncVoiceUiPatch({ voiceHint: '需要麦克风权限' }));
            wx.showModal({
              title: '需要麦克风权限',
              content: '请允许使用麦克风，以便语音控制翻板',
              confirmText: '去设置',
              success: (r) => {
                if (r.confirm) wx.openSetting();
              }
            });
          }
        });
      },
      fail: startVoice
    });
  },

  _showCustomToast(title, icon = 'none', duration = 2000) {
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showToast) {
        toast.showToast({ title, icon, duration });
      } else if (attempt < 3) {
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  }
});
