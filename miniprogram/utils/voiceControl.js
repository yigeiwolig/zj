// 微信同声传译：仅「打开 / 关闭」口令；partial 一旦出现关键词立即执行并截断本轮识别。

const OPEN_CMD = '打开';
const CLOSE_CMD = '关闭';

/** 越长越优先匹配，避免「开」误抢「打开」 */
const OPEN_PHRASES = [
  '翻开牌照', '打开牌照', '牌照翻开', '牌照打开', '翻开车牌', '打开车牌', '车牌翻开',
  '翻开牌子', '打开牌子', '翻开标志', '打开标志',
  '打开翻板', '翻开翻板', '打开面板', '翻开面板', '打开盖板', '翻开盖板',
  '打开盖子', '翻开盖子', '打开来', '开起来',
  '打开', '开启', '敞开', '翻开', '翻板', '开板', '开翻板', '升板', '起板',
  '弹开', '展开', '撑起', '抬起', '开一下', '开开', '开盖', '开'
];

const CLOSE_PHRASES = [
  '收起牌照', '关闭牌照', '合上牌照', '关掉牌照', '牌照收起', '牌照关闭', '牌照合上',
  '收起车牌', '关闭车牌', '车牌收起', '车牌关闭',
  '关闭翻板', '合上翻板', '关闭面板', '合上面板', '关掉面板', '关闭盖板',
  '合上盖板', '关闭盖子', '合上盖子', '关上面板',
  '关闭', '关掉', '合上', '收回', '折叠', '收板', '合板', '关板', '关翻板',
  '收起来', '折起来', '降下', '落下', '收起', '关一下', '关关', '关停', '关'
];

/** 运行时词库：内置 + 用户自定义（自定义覆盖同词冲突） */
const CMD_MAP = {};
let KEYWORD_LIST = [];
let _customOpen = [];
let _customClose = [];

function rebuildKeywordIndex() {
  Object.keys(CMD_MAP).forEach((k) => { delete CMD_MAP[k]; });
  OPEN_PHRASES.forEach((p) => { CMD_MAP[p] = OPEN_CMD; });
  CLOSE_PHRASES.forEach((p) => { CMD_MAP[p] = CLOSE_CMD; });
  _customOpen.forEach((p) => { CMD_MAP[p] = OPEN_CMD; });
  _customClose.forEach((p) => { CMD_MAP[p] = CLOSE_CMD; });
  KEYWORD_LIST = Object.keys(CMD_MAP).sort((a, b) => b.length - a.length);
}

rebuildKeywordIndex();

/**
 * 注入用户自定义口令（已规范化的短语数组）
 * @param {{ open?: string[], close?: string[] }} opts
 */
function setCustomVoiceKeywords(opts) {
  const open = Array.isArray(opts && opts.open) ? opts.open.filter(Boolean) : [];
  const close = Array.isArray(opts && opts.close) ? opts.close.filter(Boolean) : [];
  _customOpen = open.slice();
  _customClose = close.slice();
  rebuildKeywordIndex();
  return {
    open: _customOpen.slice(),
    close: _customClose.slice()
  };
}

function getCustomVoiceKeywords() {
  return {
    open: _customOpen.slice(),
    close: _customClose.slice()
  };
}

const FILLER_PATTERN = /[嗯啊呃诶嘿喂哦噢额呢吧呀啦嘛哇哈]+/g;
const NOISE_PHRASES = ['风声', '噪音', '音乐', '电视', '说话', '背景', '杂音', '嗡嗡', '哒哒'];
const CORE_HINT = /打开|关闭|开启|关掉|合上|收回|折叠|翻开|翻板|面板|盖板|牌照|车牌|牌子|敞开|弹开|展开|收起|开|关/;

/** 同声传译常见误识别，匹配前统一纠正 */
const ASR_CORRECTIONS = [
  ['翻牌照', '翻开牌照'],
  ['反开', '翻开'],
  ['翻盖', '翻开'],
  ['开牌照', '打开牌照'],
  ['关牌照', '关闭牌照'],
  ['首起', '收起'],
  ['说起', '收起'],
  ['官闭', '关闭'],
  ['管闭', '关闭'],
  ['凯', '开'],
  ['冠', '关']
];

/** 实时识别：多字立即触发；单字仅在整句就是「开/关」时也可触发 */
const PARTIAL_MIN_KW_LEN = 2;

function canDispatchHit(hit, source, text) {
  if (!hit) return false;
  if (source === 'final') return true;
  if (hit.kwLen >= PARTIAL_MIN_KW_LEN) return true;
  const raw = denoiseVoiceText(text || '');
  return (raw === '开' || raw === '关') && hit.kw === raw;
}

const SAME_CMD_COOLDOWN_MS = 120;
const ANY_CMD_COOLDOWN_MS = 0;
const RESTART_DELAY_MS = 40;
const RESTART_ERROR_DELAY_MS = 60;
const RECOGNIZE_STALL_MS = 7000;
const HEALTH_CHECK_MS = 2000;
/** 点一下说话：单次聆听时长（骑行短口令够用，减少噪音窗口） */
const TAP_SPEAK_DURATION_MS = 4000;

function normalizeVoiceText(text) {
  let s = String(text || '')
    .replace(/[，。！？、；：,.!?;:\s]/g, '')
    .trim();
  for (const [from, to] of ASR_CORRECTIONS) {
    if (s.includes(from)) s = s.split(from).join(to);
  }
  return s;
}

function denoiseVoiceText(text) {
  let s = normalizeVoiceText(text);
  if (!s) return '';

  s = s.replace(FILLER_PATTERN, '');
  for (const phrase of NOISE_PHRASES) {
    s = s.split(phrase).join('');
  }
  return s.trim();
}

function hasCommandHint(text) {
  const s = text || '';
  if (!s) return false;
  if (CORE_HINT.test(s)) return true;
  // 自定义口令也可能不含内置提示字，需一并视为有效指令线索
  for (let i = 0; i < KEYWORD_LIST.length; i++) {
    const kw = KEYWORD_LIST[i];
    if (kw && kw.length >= 2 && s.indexOf(kw) >= 0) return true;
  }
  return false;
}

function isNoiseDominant(rawText, denoised) {
  if (!denoised) return true;
  if (hasCommandHint(denoised)) return false;

  const raw = normalizeVoiceText(rawText);
  if (!raw) return true;
  // 短句不轻易当噪音丢掉，避免小声/短口令识别不到
  if (denoised.length <= 6) return false;
  if (raw.length >= 16 && denoised.length <= 1) return true;
  return denoised.length > 48;
}

/** 「打开」里的「开」、「关闭」里的「关」不单判 */
function isValidKeywordAt(text, idx, kw) {
  if (kw === '开' && idx > 0) {
    const prev = text.charAt(idx - 1);
    if (prev === '打' || prev === '开') return false;
  }
  if (kw === '关' && idx > 0) {
    const prev = text.charAt(idx - 1);
    if (prev === '闭' || prev === '关') return false;
  }
  return true;
}

/**
 * 在整段文本中找最早出现的口令（一句里有关键词即命中，不等说完）
 */
function findFirstCommandInText(text) {
  const raw = denoiseVoiceText(text);
  if (!raw || isNoiseDominant(text, raw)) return null;

  let best = null;
  for (const kw of KEYWORD_LIST) {
    let from = 0;
    while (from < raw.length) {
      const idx = raw.indexOf(kw, from);
      if (idx < 0) break;
      from = idx + 1;
      if (!isValidKeywordAt(raw, idx, kw)) continue;

      const end = idx + kw.length;
      if (!best || idx < best.idx || (idx === best.idx && kw.length > best.kwLen)) {
        best = { cmd: CMD_MAP[kw], idx, end, kwLen: kw.length, kw };
      }
    }
  }
  return best;
}

function tryFastPartialCommand(piece) {
  const hit = findFirstCommandInText(piece);
  return hit ? hit.cmd : null;
}

function matchVoiceCommand(text) {
  const hit = findFirstCommandInText(text);
  return hit ? hit.cmd : null;
}

let _warmManager = null;

function warmupVoicePlugin() {
  try {
    const plugin = requirePlugin('WechatSI');
    if (!_warmManager) {
      _warmManager = plugin.getRecordRecognitionManager();
    }
    return true;
  } catch (e) {
    return false;
  }
}

function createVoiceRecognizer(handlers) {
  let plugin;
  try {
    plugin = requirePlugin('WechatSI');
  } catch (e) {
    return {
      supported: false,
      error: '未配置同声传译插件 WechatSI',
      start() {},
      stop() {}
    };
  }

  const manager = _warmManager || plugin.getRecordRecognitionManager();
  _warmManager = manager;

  let continuous = false;
  let sessionActive = false;
  let restarting = false;
  let restartTimer = null;
  let skipFinalDispatch = false;
  let truncating = false;
  let lastFireAt = 0;
  let lastFireCmd = '';
  let streamText = '';
  let consumedLen = 0;
  let managerRecording = false;
  let stopInFlight = false;
  let pendingStartOptions = null;
  let lastRecognizeAt = 0;
  let healthTimer = null;
  let sessionStartedAt = 0;

  function clearHealthWatch() {
    if (healthTimer) {
      clearInterval(healthTimer);
      healthTimer = null;
    }
  }

  function startHealthWatch() {
    clearHealthWatch();
    healthTimer = setInterval(() => {
      if (!continuous || !sessionActive) return;

      const now = Date.now();
      if (!managerRecording && !stopInFlight && !restarting) {
        scheduleRestart(0);
        return;
      }

      if (!managerRecording || !lastRecognizeAt) return;
      if (now - sessionStartedAt < RECOGNIZE_STALL_MS) return;
      if (now - lastRecognizeAt < RECOGNIZE_STALL_MS) return;

      resetStreamState();
      safeManagerStop();
      scheduleRestart(RESTART_DELAY_MS);
    }, HEALTH_CHECK_MS);
  }

  function clearStopInFlightSoon() {
    setTimeout(() => {
      stopInFlight = false;
    }, 280);
  }

  function safeManagerStop() {
    if (!managerRecording && !stopInFlight) return;
    if (stopInFlight) return;
    stopInFlight = true;
    const wasRecording = managerRecording;
    managerRecording = false;
    if (!wasRecording) {
      clearStopInFlightSoon();
      return;
    }
    try {
      manager.stop();
    } catch (e) {
      clearStopInFlightSoon();
    }
    clearStopInFlightSoon();
  }

  function runStart(options) {
    if (!sessionActive) return;
    if (stopInFlight) {
      pendingStartOptions = options;
      setTimeout(() => {
        const opts = pendingStartOptions;
        pendingStartOptions = null;
        if (opts && sessionActive && !managerRecording && !stopInFlight) {
          runStart(opts);
        }
      }, 120);
      return;
    }
    if (managerRecording) {
      safeManagerStop();
      pendingStartOptions = options;
      setTimeout(() => {
        const opts = pendingStartOptions;
        pendingStartOptions = null;
        if (opts && sessionActive && !managerRecording) {
          runStart(opts);
        }
      }, 120);
      return;
    }
    restarting = true;
    resetStreamState();
    try {
      manager.start({
        duration: options.duration || 60000,
        lang: options.lang || 'zh_CN'
      });
    } catch (e) {
      restarting = false;
      managerRecording = false;
      scheduleRestart(RESTART_ERROR_DELAY_MS);
    }
  }

  function clearRestartTimer() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function resetStreamState() {
    streamText = '';
    consumedLen = 0;
  }

  function updateStreamText(piece) {
    const p = normalizeVoiceText(piece);
    if (!p) return streamText;

    if (!streamText) {
      streamText = p;
      return streamText;
    }
    if (p === streamText) return streamText;

    if (p.startsWith(streamText) || streamText.startsWith(p)) {
      streamText = p.length >= streamText.length ? p : streamText;
    } else if (!streamText.includes(p)) {
      streamText += p;
    }
    return streamText;
  }

  function getPendingSlice() {
    const denoised = denoiseVoiceText(streamText);
    if (consumedLen > denoised.length) consumedLen = 0;
    return denoised.slice(consumedLen);
  }

  function markConsumedThrough(matchEndInPending) {
    const denoised = denoiseVoiceText(streamText);
    consumedLen = Math.min(denoised.length, consumedLen + Math.max(0, matchEndInPending));
  }

  function consumeAllPending() {
    const denoised = denoiseVoiceText(streamText);
    consumedLen = denoised.length;
  }

  function canFire(cmd) {
    const now = Date.now();
    if (cmd === lastFireCmd && now - lastFireAt < SAME_CMD_COOLDOWN_MS) return false;
    if (cmd !== lastFireCmd && now - lastFireAt < ANY_CMD_COOLDOWN_MS) return false;
    return true;
  }

  function truncateCurrentUtterance() {
    // 常听 / 点一下说话：命中口令后都立刻截断本轮，避免噪音窗口继续识别
    if (!sessionActive || truncating) return;
    truncating = true;
    skipFinalDispatch = true;
    resetStreamState();
    if (!managerRecording) {
      truncating = false;
      return;
    }
    safeManagerStop();
  }

  function fireCommand(cmd, text, source) {
    lastFireAt = Date.now();
    lastFireCmd = cmd;
    if (handlers.onCommand) {
      handlers.onCommand(cmd, text, source);
    }
    truncateCurrentUtterance();
  }

  function tryDispatchFromText(text, source) {
    const hit = findFirstCommandInText(text);
    if (!hit || !canFire(hit.cmd) || !canDispatchHit(hit, source, text)) return false;

    updateStreamText(text);
    consumeAllPending();
    fireCommand(hit.cmd, text, source);
    return true;
  }

  function tryDispatchFromPending(source) {
    const pending = getPendingSlice();
    if (!pending) return false;

    const hit = findFirstCommandInText(pending);
    if (!hit || !canFire(hit.cmd) || !canDispatchHit(hit, source, pending)) return false;

    markConsumedThrough(hit.end);
    fireCommand(hit.cmd, streamText, source);
    return true;
  }

  function scheduleRestart(delay) {
    if (!continuous || !sessionActive) return;
    clearRestartTimer();
    const run = () => {
      restartTimer = null;
      if (!continuous || !sessionActive) return;
      if (restarting || stopInFlight) {
        scheduleRestart(60);
        return;
      }
      runStart({ duration: 60000, lang: 'zh_CN' });
    };
    if (delay <= 0) {
      run();
    } else {
      restartTimer = setTimeout(run, delay);
    }
  }

  manager.onStart = () => {
    managerRecording = true;
    stopInFlight = false;
    pendingStartOptions = null;
    restarting = false;
    truncating = false;
    sessionStartedAt = Date.now();
    lastRecognizeAt = sessionStartedAt;
    resetStreamState();
    if (handlers.onStart) handlers.onStart();
  };

  manager.onRecognize = (res) => {
    if (!res) return;
    lastRecognizeAt = Date.now();
    if (handlers.onRecognize) handlers.onRecognize(res, streamText);

    const piece = res.result != null ? String(res.result).trim() : '';
    if (!piece) return;

    updateStreamText(piece);
    if (tryDispatchFromText(piece, 'partial-fast')) return;
    tryDispatchFromPending('partial');
  };

  manager.onStop = (res) => {
    managerRecording = false;
    stopInFlight = false;
    const skip = skipFinalDispatch;
    skipFinalDispatch = false;
    truncating = false;
    let fired = false;

    if (!skip) {
      const finalPiece = res && res.result != null ? String(res.result).trim() : '';
      if (finalPiece) updateStreamText(finalPiece);
      const dispatchText = finalPiece || denoiseVoiceText(streamText);
      fired = tryDispatchFromText(dispatchText, 'final');
      if (!fired) {
        fired = tryDispatchFromPending('final');
      }
    }

    if (handlers.onStop) handlers.onStop(res, { fired: !!fired || !!skip });

    if (continuous && sessionActive) {
      scheduleRestart(RESTART_DELAY_MS);
    } else {
      // 点一下说话：本轮结束，释放会话，等待下次点击
      sessionActive = false;
      clearHealthWatch();
      clearRestartTimer();
    }
  };

  manager.onError = (res) => {
    const code = res && res.retcode;
    if (handlers.onError) handlers.onError(res, { continuous, sessionActive });

    managerRecording = false;
    stopInFlight = false;

    if (!sessionActive) {
      return;
    }
    // 连接已关闭 / 用户取消，勿再 restart 或 stop
    if (code === -30012 || code === -30002 || code === -30003) {
      sessionActive = false;
      clearHealthWatch();
      clearRestartTimer();
      return;
    }

    if (continuous && sessionActive) {
      resetStreamState();
      scheduleRestart(code === -30011 ? 120 : Math.max(RESTART_ERROR_DELAY_MS, 100));
    } else {
      sessionActive = false;
      clearHealthWatch();
      clearRestartTimer();
    }
  };

  return {
    supported: true,
    manager,
    isContinuous() {
      return continuous && sessionActive;
    },
    isActive() {
      return !!(sessionActive || restarting || managerRecording);
    },
    start(options = {}) {
      continuous = options.continuous !== false;
      sessionActive = true;
      lastFireAt = 0;
      lastFireCmd = '';
      skipFinalDispatch = false;
      truncating = false;
      resetStreamState();
      clearRestartTimer();
      startHealthWatch();
      runStart(options);
    },
    stop() {
      continuous = false;
      sessionActive = false;
      restarting = false;
      skipFinalDispatch = false;
      truncating = false;
      pendingStartOptions = null;
      resetStreamState();
      clearRestartTimer();
      clearHealthWatch();
      safeManagerStop();
    }
  };
}

module.exports = {
  CMD_MAP,
  OPEN_CMD,
  CLOSE_CMD,
  TAP_SPEAK_DURATION_MS,
  denoiseVoiceText,
  matchVoiceCommand,
  tryFastPartialCommand,
  setCustomVoiceKeywords,
  getCustomVoiceKeywords,
  warmupVoicePlugin,
  createVoiceRecognizer
};
