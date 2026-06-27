// 微信同声传译：仅「打开 / 关闭」口令；partial 一旦出现关键词立即执行并截断本轮识别。

const OPEN_CMD = '打开';
const CLOSE_CMD = '关闭';

/** 越长越优先匹配，避免「开」误抢「打开」 */
const OPEN_PHRASES = [
  '打开翻板', '翻开翻板', '打开面板', '翻开面板', '打开盖板', '翻开盖板',
  '打开盖子', '翻开盖子', '打开开', '翻开面', '打开来', '开起来',
  '打开', '开启', '敞开', '翻开', '翻板', '开板', '开翻板', '升板', '起板',
  '弹开', '展开', '撑起', '抬起', '开一下', '开开', '开盖', '开'
];

const CLOSE_PHRASES = [
  '关闭翻板', '合上翻板', '关闭面板', '合上面板', '关掉面板', '关闭盖板',
  '合上盖板', '关闭盖子', '合上盖子', '关上面板',
  '关闭', '关掉', '合上', '收回', '折叠', '收板', '合板', '关板', '关翻板',
  '收起来', '折起来', '降下', '落下', '收起', '关一下', '关关', '关停', '关'
];

const CMD_MAP = {};
OPEN_PHRASES.forEach((p) => { CMD_MAP[p] = OPEN_CMD; });
CLOSE_PHRASES.forEach((p) => { CMD_MAP[p] = CLOSE_CMD; });

const KEYWORD_LIST = Object.keys(CMD_MAP).sort((a, b) => b.length - a.length);

const FILLER_PATTERN = /[嗯啊呃诶嘿喂哦噢额呢吧呀啦嘛哇哈]+/g;
const NOISE_PHRASES = ['风声', '噪音', '音乐', '电视', '说话', '背景', '杂音', '嗡嗡', '哒哒'];
const CORE_HINT = /打开|关闭|开启|关掉|合上|收回|折叠|翻开|翻板|面板|盖板|敞开|弹开|展开|收起|开|关/;

const SAME_CMD_COOLDOWN_MS = 180;
const ANY_CMD_COOLDOWN_MS = 0;
const RESTART_DELAY_MS = 0;
const RESTART_ERROR_DELAY_MS = 80;

function normalizeVoiceText(text) {
  return String(text || '')
    .replace(/[，。！？、；：,.!?;:\s]/g, '')
    .trim();
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
  return CORE_HINT.test(text || '');
}

function isNoiseDominant(rawText, denoised) {
  if (!denoised) return true;
  if (hasCommandHint(denoised)) return false;

  const raw = normalizeVoiceText(rawText);
  if (!raw) return true;
  if (denoised.length <= 4) return false;
  if (raw.length >= 12 && denoised.length <= 1) return true;
  return denoised.length > 36;
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
    if (!continuous || !sessionActive || truncating) return;
    truncating = true;
    skipFinalDispatch = true;
    resetStreamState();
    try {
      manager.stop();
    } catch (e) {
      truncating = false;
      skipFinalDispatch = false;
      scheduleRestart(RESTART_ERROR_DELAY_MS);
    }
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
    if (!hit || !canFire(hit.cmd)) return false;

    updateStreamText(text);
    consumeAllPending();
    fireCommand(hit.cmd, text, source);
    return true;
  }

  function tryDispatchFromPending(source) {
    const pending = getPendingSlice();
    if (!pending) return false;

    const hit = findFirstCommandInText(pending);
    if (!hit || !canFire(hit.cmd)) return false;

    markConsumedThrough(hit.end);
    fireCommand(hit.cmd, streamText, source);
    return true;
  }

  function scheduleRestart(delay) {
    if (!continuous || !sessionActive || restarting) return;
    clearRestartTimer();
    const run = () => {
      restartTimer = null;
      if (!continuous || !sessionActive) return;
      restarting = true;
      resetStreamState();
      try {
        manager.start({
          duration: 60000,
          lang: 'zh_CN'
        });
      } catch (e) {
        restarting = false;
        scheduleRestart(RESTART_ERROR_DELAY_MS);
      }
    };
    if (delay <= 0) {
      run();
    } else {
      restartTimer = setTimeout(run, delay);
    }
  }

  manager.onStart = () => {
    restarting = false;
    truncating = false;
    resetStreamState();
    if (handlers.onStart) handlers.onStart();
  };

  manager.onRecognize = (res) => {
    if (!res || !res.result) return;
    if (handlers.onRecognize) handlers.onRecognize(res, streamText);

    updateStreamText(res.result);
    if (tryDispatchFromText(res.result, 'partial-fast')) return;
    tryDispatchFromPending('partial');
  };

  manager.onStop = (res) => {
    const skip = skipFinalDispatch;
    skipFinalDispatch = false;
    truncating = false;

    if (!skip && res && res.result) {
      updateStreamText(res.result);
      if (!tryDispatchFromText(res.result, 'final')) {
        tryDispatchFromPending('final');
      }
    }

    if (handlers.onStop) handlers.onStop(res);
    if (continuous && sessionActive) {
      scheduleRestart(RESTART_DELAY_MS);
    }
  };

  manager.onError = (res) => {
    const code = res && res.retcode;
    if (handlers.onError) handlers.onError(res, { continuous, sessionActive });

    if (!sessionActive) return;
    if (code === -30012 || code === -30002) return;

    if (continuous && sessionActive) {
      resetStreamState();
      scheduleRestart(code === -30011 ? 60 : RESTART_ERROR_DELAY_MS);
    }
  };

  return {
    supported: true,
    manager,
    isContinuous() {
      return continuous && sessionActive;
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
      manager.start({
        duration: options.duration || 60000,
        lang: options.lang || 'zh_CN'
      });
    },
    stop() {
      continuous = false;
      sessionActive = false;
      restarting = false;
      skipFinalDispatch = false;
      truncating = false;
      resetStreamState();
      clearRestartTimer();
      try {
        manager.stop();
      } catch (e) {
        // ignore
      }
    }
  };
}

module.exports = {
  CMD_MAP,
  OPEN_CMD,
  CLOSE_CMD,
  denoiseVoiceText,
  matchVoiceCommand,
  tryFastPartialCommand,
  warmupVoicePlugin,
  createVoiceRecognizer
};
