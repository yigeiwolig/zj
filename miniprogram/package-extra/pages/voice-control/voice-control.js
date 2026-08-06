const {
  createVoiceRecognizer,
  warmupVoicePlugin,
  setCustomVoiceKeywords,
  TAP_SPEAK_DURATION_MS
} = require('../../../utils/voiceControl.js');
const voiceCustomKeywords = require('../../../utils/voiceCustomKeywords.js');
const f2VoiceBridge = require('../../../utils/f2VoiceBridge.js');

const DEFAULT_SUB_MSG = '点一下，再说「开」或「关」';
const IDLE_MAIN_MSG = '点一下说话';

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
    voiceBusy: false,
    rippleClass: 'dormant',
    mainMsg: IDLE_MAIN_MSG,
    subMsg: DEFAULT_SUB_MSG,
    showAdminFooter: false,
    showKeywordEditor: false,
    keywordEditorClosing: false,
    keywordSaving: false,
    draftOpenPhrases: [],
    draftClosePhrases: [],
    draftOpenInput: '',
    draftCloseInput: '',
    savedOpenPhrases: [],
    savedClosePhrases: [],
    kwMaxPerGroup: voiceCustomKeywords.MAX_PER_GROUP,
    kwMaxLen: voiceCustomKeywords.MAX_LEN
  },

  onLoad() {
    this._voiceSessionWanted = false;
    this._voiceHintLastAt = 0;
    this._unsubscribeBridge = null;
    this._voiceStoppedOnHide = false;
    this._voiceStopPending = false;
    this._pageActive = false;
    this._tapSpeakArmed = false;
    this._lastCommandAt = 0;

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
    this._applyCustomKeywords(voiceCustomKeywords.readLocalCache());
    this._loadCustomKeywords();
    this.initVoiceRecognizer();
    this._syncFlapFromBridge();
    this._syncBleFromBridge();
    this.setData(this._syncVoiceUiPatch({
      voiceListening: false,
      voiceHearing: false,
      voiceBusy: false,
      voiceHint: DEFAULT_SUB_MSG
    }));
  },

  onShow() {
    this._pageActive = true;
    this._voiceStoppedOnHide = false;
    this._voiceStopPending = false;
    this._unsubscribeBridge = f2VoiceBridge.subscribe((event) => this._onBridgeEvent(event));
    this._syncFlapFromBridge();
    this._syncBleFromBridge();
    // 点一下说话：进入页面不自动开麦，只刷新本地口令
    this._applyCustomKeywords(voiceCustomKeywords.readLocalCache());
  },

  onHide() {
    this._pageActive = false;
    if (this._unsubscribeBridge) {
      this._unsubscribeBridge();
      this._unsubscribeBridge = null;
    }
    this._voiceStoppedOnHide = true;
    this._tapSpeakArmed = false;
    this._stopVoiceListening(true);
  },

  onUnload() {
    if (this._unsubscribeBridge) {
      this._unsubscribeBridge();
      this._unsubscribeBridge = null;
    }
    this._voiceSessionWanted = false;
    this._tapSpeakArmed = false;
    if (!this._voiceStoppedOnHide) {
      this._stopVoiceListening(true);
    }
  },

  noop() {},

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  _applyCustomKeywords(payload) {
    const open = ((payload && payload.open) || []).slice();
    const close = ((payload && payload.close) || []).slice();
    setCustomVoiceKeywords({ open, close });
    this.setData({
      savedOpenPhrases: open,
      savedClosePhrases: close
    });
  },

  async _loadCustomKeywords() {
    try {
      const res = await voiceCustomKeywords.loadCustomKeywords();
      this._applyCustomKeywords(res);
    } catch (e) {
      console.warn('[voice-control] 加载自定义口令失败', e);
      this._applyCustomKeywords(voiceCustomKeywords.readLocalCache());
    }
  },

  openKeywordEditor() {
    if (this.data.keywordEditorClosing) return;
    // 始终以本地持久化为准，避免编辑器打开时读到空列表
    const cur = voiceCustomKeywords.readLocalCache();
    const open = (cur.open && cur.open.length)
      ? cur.open.slice()
      : (this.data.savedOpenPhrases || []).slice();
    const close = (cur.close && cur.close.length)
      ? cur.close.slice()
      : (this.data.savedClosePhrases || []).slice();
    this.setData({
      showKeywordEditor: true,
      keywordEditorClosing: false,
      keywordSaving: false,
      draftOpenPhrases: open,
      draftClosePhrases: close,
      draftOpenInput: '',
      draftCloseInput: ''
    });
  },

  closeKeywordEditor() {
    if (this.data.keywordSaving) return;
    if (!this.data.showKeywordEditor || this.data.keywordEditorClosing) return;
    this.setData({ keywordEditorClosing: true });
    setTimeout(() => {
      this.setData({
        showKeywordEditor: false,
        keywordEditorClosing: false
      });
    }, 280);
  },

  onDraftOpenInput(e) {
    this.setData({ draftOpenInput: (e.detail && e.detail.value) || '' });
  },

  onDraftCloseInput(e) {
    this.setData({ draftCloseInput: (e.detail && e.detail.value) || '' });
  },

  _tryAddPhrase(side) {
    const isOpen = side === 'open';
    const raw = isOpen ? this.data.draftOpenInput : this.data.draftCloseInput;
    const phrase = voiceCustomKeywords.stripPhrase(raw);
    if (!phrase) {
      this._showCustomToast('请输入关键词', 'none', 1600);
      return;
    }
    if (phrase.length > voiceCustomKeywords.MAX_LEN) {
      this._showCustomToast(`最多 ${voiceCustomKeywords.MAX_LEN} 个字`, 'none', 1600);
      return;
    }
    const open = (this.data.draftOpenPhrases || []).slice();
    const close = (this.data.draftClosePhrases || []).slice();
    const list = isOpen ? open : close;
    const other = isOpen ? close : open;
    if (list.length >= voiceCustomKeywords.MAX_PER_GROUP) {
      this._showCustomToast(`每组最多 ${voiceCustomKeywords.MAX_PER_GROUP} 个`, 'none', 1800);
      return;
    }
    if (list.indexOf(phrase) >= 0) {
      this._showCustomToast('已在本组中', 'none', 1600);
      return;
    }
    let conflictTip = '';
    const otherIdx = other.indexOf(phrase);
    if (otherIdx >= 0) {
      other.splice(otherIdx, 1);
      conflictTip = '已从另一组移除同词';
    }
    list.push(phrase);
    this.setData({
      draftOpenPhrases: open,
      draftClosePhrases: close,
      draftOpenInput: isOpen ? '' : this.data.draftOpenInput,
      draftCloseInput: isOpen ? this.data.draftCloseInput : ''
    });
    if (conflictTip) this._showCustomToast(conflictTip, 'none', 1800);
  },

  addOpenPhrase() {
    this._tryAddPhrase('open');
  },

  addClosePhrase() {
    this._tryAddPhrase('close');
  },

  removeDraftPhrase(e) {
    const side = e.currentTarget.dataset.side;
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isFinite(index) || index < 0) return;
    if (side === 'open') {
      const next = (this.data.draftOpenPhrases || []).slice();
      next.splice(index, 1);
      this.setData({ draftOpenPhrases: next });
      return;
    }
    const next = (this.data.draftClosePhrases || []).slice();
    next.splice(index, 1);
    this.setData({ draftClosePhrases: next });
  },

  async saveKeywordEditor() {
    if (this.data.keywordSaving) return;
    this.setData({ keywordSaving: true });
    try {
      const result = await voiceCustomKeywords.saveCustomKeywords(
        this.data.draftOpenPhrases,
        this.data.draftClosePhrases,
        { preferClose: true }
      );
      this._applyCustomKeywords(result);
      // 再读一遍本地，确保 UI / 下次进入一致
      this._applyCustomKeywords(voiceCustomKeywords.readLocalCache());
      this.setData({
        keywordSaving: false,
        draftOpenPhrases: (result.open || []).slice(),
        draftClosePhrases: (result.close || []).slice()
      });
      this.closeKeywordEditor();
      let tip = result.savedCloud === false ? '已保存到本机（云同步失败）' : '口令已保存';
      if (result.conflicts && result.conflicts.length) {
        tip += '，冲突词保留在关闭组';
      }
      this._showCustomToast(tip, 'success', 2200);
    } catch (e) {
      this.setData({ keywordSaving: false });
      this._showCustomToast('保存失败，请重试', 'none', 2000);
    }
  },

  _onBridgeEvent(event) {
    if (!event || !event.type) return;
    if (event.type === 'flap') {
      this._applyFlapState(event.flapPanelState, event.flapPanelStateText);
    } else if (event.type === 'connection') {
      this._syncBleFromBridge();
      if (!event.connected) {
        this._tapSpeakArmed = false;
        this._stopVoiceListening(true);
        this.setData(this._syncVoiceUiPatch({ voiceHint: '蓝牙已断开' }));
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
    if (listening) return '请说话';
    if (hint && hint.indexOf('已执行') >= 0) return '好了';
    if (hint && hint.indexOf('没听清') >= 0) return '没听清';
    if (hint && (hint.indexOf('失败') >= 0 || hint.indexOf('断开') >= 0)) return '请稍候';
    return IDLE_MAIN_MSG;
  },

  _buildSubMsg(hint, listening) {
    if (listening) {
      if (hint && hint.indexOf('听到：') === 0) return hint;
      return '说完后会自动识别';
    }
    if (!hint) return DEFAULT_SUB_MSG;
    if (hint.indexOf('已执行：') === 0) return hint;
    if (hint.indexOf('没听清') >= 0) return '再点一下重试';
    if (hint !== DEFAULT_SUB_MSG && hint !== IDLE_MAIN_MSG) return hint;
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
      subMsg: this._buildSubMsg(hint, listening)
    };
  },

  initVoiceRecognizer() {
    this._voice = createVoiceRecognizer({
      onStart: () => {
        this.setData(this._syncVoiceUiPatch({
          voiceListening: true,
          voiceBusy: true,
          voiceHint: '请说话…',
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
        }
        this.setData(this._syncVoiceUiPatch(patch));
        this._voiceHearTimer = setTimeout(() => {
          this._voiceHearTimer = null;
          if (this.data.voiceListening && this.data.voiceHearing) {
            this.setData(this._syncVoiceUiPatch({
              voiceHearing: false
            }));
          }
        }, 1800);
      },
      onCommand: (cmd, text, source) => {
        this._lastCommandAt = Date.now();
        this._sendVoiceCommand(cmd, { source, text });
      },
      onStop: (res, meta) => {
        this._tapSpeakArmed = false;
        this._voiceSessionWanted = false;
        const justFired = (meta && meta.fired)
          || (Date.now() - this._lastCommandAt < 1200);
        if (this._voiceHearTimer) {
          clearTimeout(this._voiceHearTimer);
          this._voiceHearTimer = null;
        }
        if (justFired) {
          this.setData(this._syncVoiceUiPatch({
            voiceListening: false,
            voiceHearing: false,
            voiceBusy: false
          }));
          return;
        }
        this.setData(this._syncVoiceUiPatch({
          voiceListening: false,
          voiceHearing: false,
          voiceBusy: false,
          voiceHint: '没听清，再点一下'
        }));
      },
      onError: (res) => {
        this._tapSpeakArmed = false;
        this._voiceSessionWanted = false;
        this._resetVoiceUi('识别失败，再点一下');
        const msg = (res && (res.msg || res.errMsg)) || '识别失败，再点一下';
        this._showCustomToast(msg, 'none', 2000);
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
      voiceBusy: false,
      voiceHint: hint || DEFAULT_SUB_MSG
    }));
  },

  _stopVoiceListening(clearWanted) {
    if (this._voiceStopPending) return;
    this._voiceStopPending = true;
    if (clearWanted) this._voiceSessionWanted = false;
    this._tapSpeakArmed = false;
    if (this._voice && this._voice.supported) {
      this._voice.stop();
    }
    if (this._voiceHearTimer) {
      clearTimeout(this._voiceHearTimer);
      this._voiceHearTimer = null;
    }
    this.setData(this._syncVoiceUiPatch({
      voiceListening: false,
      voiceHearing: false,
      voiceBusy: false
    }));
    setTimeout(() => {
      this._voiceStopPending = false;
    }, 280);
  },

  _sendVoiceCommand(cmd, options = {}) {
    const { source = 'final', text = '' } = options;
    console.log(`📤 [语音${source}] 发送"${cmd}"`, text);

    this._voiceHintLastAt = Date.now();
    this.setData(this._syncVoiceUiPatch({
      voiceLastCmd: cmd,
      voiceHint: `已执行：${cmd}`,
      voiceHearing: false,
      voiceListening: false,
      voiceBusy: false
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

  /** 点一下说话（主入口） */
  onTapSpeak() {
    if (this.data.showKeywordEditor || this.data.keywordEditorClosing) return;
    if (this.data.voiceListening || this.data.voiceBusy || this._tapSpeakArmed) {
      this._showCustomToast('正在听，请稍候', 'none', 1200);
      return;
    }
    this._requestMicAndStart();
  },

  _requestMicAndStart() {
    if (!f2VoiceBridge.isRegistered()) {
      this.setData(this._syncVoiceUiPatch({ voiceHint: '请从控制中心进入' }));
      this._showCustomToast('请从控制中心进入', 'none', 2000);
      return;
    }
    if (!this._voice || !this._voice.supported) {
      this._showCustomToast('语音插件未就绪', 'none', 2500);
      this.setData(this._syncVoiceUiPatch({ voiceHint: '语音插件未就绪' }));
      return;
    }
    if (!f2VoiceBridge.canInteract()) {
      const tip = f2VoiceBridge.isAdmin() ? '管理员预览模式' : '请先连接蓝牙';
      this.setData(this._syncVoiceUiPatch({ voiceHint: tip }));
      this._showCustomToast(tip, 'none', 2000);
      return;
    }

    const startVoice = () => {
      if (!this._pageActive || this._voiceStoppedOnHide) return;
      if (this.data.voiceListening || this._tapSpeakArmed) return;
      this._tapSpeakArmed = true;
      this._voiceSessionWanted = true;
      this.setData(this._syncVoiceUiPatch({
        voiceBusy: true,
        voiceHint: '准备聆听…'
      }));
      try {
        this._voice.start({
          continuous: false,
          duration: TAP_SPEAK_DURATION_MS
        });
      } catch (e) {
        this._tapSpeakArmed = false;
        this._voiceSessionWanted = false;
        this._resetVoiceUi('启动失败，再点一下');
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
