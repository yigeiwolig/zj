const F2_FAULT_ERR_MAP = {
  1: {
    title: '电机不转',
    content: '开启自检后，翻板打开时未检测到电机运转（Pin8 双闪）。请检查舵机接线、机械是否卡死，或重新自动校准。'
  },
  2: {
    title: '卡住堵转',
    content: '打开时连续遇阻，已收回并进入故障报警（Pin8 三下闪）。请排除障碍物后点「关闭」解除，或断电重启。'
  }
};

const F2_FAULT_WRN_MAP = {
  1: {
    title: '遇阻收回',
    content: '首次打开遇阻已自动收回，约 0.8 秒后将重试打开（Pin8 快闪）。若仍顶住会报卡住故障。'
  },
  2: {
    title: '连续关钥匙',
    content: '检测到关钥匙后多次自动收回（打开收回已启用）。请注意电瓶电量，避免长时间待机亏电。'
  }
};

function parseF2StatusLine(line) {
  if (!line || line.indexOf('ANG:') < 0) return null;
  const pick = (re) => {
    const m = line.match(re);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    ang: pick(/ANG:(\d+)/),
    acc: pick(/\|ACC:(\d+)/),
    btn: pick(/\|BTN:(\d+)/),
    itm: pick(/\|ITM:(\d+)/),
    err: pick(/\|ERR:(\d+)/) || 0,
    wrn: pick(/\|WRN:(\d+)/) || 0,
    trv: pick(/\|TRV:(\d+)/) || 0,
    trm: pick(/\|TRM:(\d+)/),
    stm: pick(/\|STM:(\d+)/),
    tsd: pick(/\|TSD:(\d+)/),
    spd: pick(/\|SPD:(\d+)/),
    dpo: pick(/\|DPO:(\d+)/),
    smo: pick(/\|SMO:(\d+)/),
    chk: pick(/\|CHK:(\d+)/),
    ret: pick(/\|RET:(\d+)/),
    pwr: pick(/\|PWR:(\d+)/)
  };
}

function buildF2SettingStateFromPacket(parsed, currentState, options) {
  const force = !!(options && options.force);
  const base = { ...(currentState || {}) };
  if (!parsed) return null;
  let changed = false;

  if (parsed.chk === 0 || parsed.chk === 1) {
    const v = parsed.chk === 1 ? 'left' : 'right';
    if (force || base.faultDetect !== v) {
      base.faultDetect = v;
      changed = true;
    }
  }
  if (parsed.ret === 0 || parsed.ret === 1) {
    const v = parsed.ret === 1 ? 'left' : 'right';
    if (force || base.shutdown !== v) {
      base.shutdown = v;
      changed = true;
    }
  }
  if (parsed.pwr === 0 || parsed.pwr === 1) {
    const v = parsed.pwr === 0 ? 'left' : 'right';
    if (force || base.powerOn !== v) {
      base.powerOn = v;
      changed = true;
    }
  }
  if (parsed.trv === 0 || parsed.trv === 1) {
    const v = parsed.trv === 1 ? 'right' : 'left';
    if (force || base.travelMode !== v) {
      base.travelMode = v;
      changed = true;
    }
  }
  if (parsed.smo === 0 || parsed.smo === 1) {
    const v = parsed.smo === 1 ? 'left' : 'right';
    if (force || base.smoothMode !== v) {
      base.smoothMode = v;
      changed = true;
    }
  }

  if (!changed && !force) return null;
  return base;
}

function buildF2AdvUiUpdates(parsed, ctx) {
  if (!parsed) return {};
  const force = !!(ctx && ctx.force);
  const delayPowerOffOptions = (ctx && ctx.delayPowerOffOptions) || [];
  const current = (ctx && ctx.currentUi) || {};
  const updates = {};

  const settingState = buildF2SettingStateFromPacket(parsed, ctx && ctx.currentState, { force });
  if (settingState) {
    updates.settingState = settingState;
  }

  if (parsed.trv === 1 || parsed.trv === 0) {
    const on = parsed.trv === 1;
    if (force || on !== current.f2TravelModeOn) {
      updates.f2TravelModeOn = on;
      updates.delayPowerOffTip = on
        ? '出行模式中，延时断电已暂停（关钥匙保持3分钟）'
        : '请根据电瓶容量选择';
      updates.travelModeTip = on
        ? '出行模式：关钥匙收起，3分钟内再开钥匙自动放牌（24小时内有效）'
        : '关钥匙保持供电3分钟，24小时内可反复自动放牌';
    }
  }

  const travelOn = updates.f2TravelModeOn !== undefined
    ? updates.f2TravelModeOn
    : (parsed.trv === 1);

  let nextDelayIdx;
  if (travelOn && parsed.tsd !== null) {
    nextDelayIdx = delayPowerOffOptions.findIndex((o) => o.minutes === parsed.tsd);
    if (nextDelayIdx < 0) nextDelayIdx = 0;
  } else if (parsed.dpo !== null && !travelOn) {
    nextDelayIdx = delayPowerOffOptions.findIndex((o) => o.minutes === parsed.dpo);
    if (nextDelayIdx < 0) nextDelayIdx = 0;
  }
  if (nextDelayIdx !== undefined && (force || nextDelayIdx !== current.delayPowerOffIndex)) {
    updates.delayPowerOffIndex = nextDelayIdx;
  }

  const readback = buildF2ReadbackTexts(parsed, delayPowerOffOptions);
  if (force || readback.f2TravelReadbackText !== current.f2TravelReadbackText) {
    updates.f2TravelReadbackText = readback.f2TravelReadbackText;
  }
  if (force || readback.f2DelayPowerReadbackText !== current.f2DelayPowerReadbackText) {
    updates.f2DelayPowerReadbackText = readback.f2DelayPowerReadbackText;
  }

  return updates;
}

function buildF2FaultModalPayload(err, wrn) {
  if (err > 0 && F2_FAULT_ERR_MAP[err]) {
    const info = F2_FAULT_ERR_MAP[err];
    return {
      kind: 'error',
      title: `故障：${info.title}`,
      content: info.content
    };
  }
  if (wrn > 0 && F2_FAULT_WRN_MAP[wrn]) {
    const info = F2_FAULT_WRN_MAP[wrn];
    return {
      kind: 'warn',
      title: `提示：${info.title}`,
      content: info.content
    };
  }
  return null;
}

function buildF2StealthModalPayload(itm) {
  if (itm === 3) {
    return {
      kind: 'info',
      title: '隐蔽模式',
      content: '当前正处于隐蔽模式，按按钮会导致没有反应。如需解除，请在控制页面关闭或长按按钮。最长持续3小时，超时将自动断电'
    };
  }
  return null;
}

function buildF2ConnectModalQueue(parsed) {
  if (!parsed) return [];
  const queue = [];
  const errPayload = buildF2FaultModalPayload(parsed.err, 0);
  if (errPayload) queue.push(errPayload);
  const wrnPayload = buildF2FaultModalPayload(0, parsed.wrn);
  if (wrnPayload) queue.push(wrnPayload);
  const stealthPayload = buildF2StealthModalPayload(parsed.itm);
  if (stealthPayload) queue.push(stealthPayload);
  return queue;
}

function formatTravelRemainingMinutes(minutes) {
  if (!minutes || minutes <= 0) return '即将自动关闭';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `剩余 ${h} 小时 ${m} 分钟`;
  if (h > 0) return `剩余 ${h} 小时`;
  return `剩余 ${m} 分钟`;
}

function delayMinutesLabel(minutes, delayPowerOffOptions) {
  if (!minutes) return '关闭（关钥匙仅保持10秒）';
  const opt = (delayPowerOffOptions || []).find((o) => o.minutes === minutes);
  if (opt) {
    const short = opt.label.split('（')[0];
    return short || opt.label;
  }
  if (minutes < 60) return `${minutes} 分钟`;
  if (minutes % 60 === 0) return `${minutes / 60} 小时`;
  return `${minutes} 分钟`;
}

function buildF2ReadbackTexts(parsed, delayPowerOffOptions) {
  if (!parsed) {
    return {
      f2TravelReadbackText: '读取中…',
      f2DelayPowerReadbackText: '读取中…'
    };
  }

  const travelOn = parsed.trv === 1;
  let travelText = travelOn ? '已开启' : '已关闭';
  if (travelOn && parsed.trm != null) {
    travelText += ` · ${formatTravelRemainingMinutes(parsed.trm)}`;
  }

  let delayText;
  if (travelOn) {
    if (parsed.tsd != null) {
      const savedLabel = delayMinutesLabel(parsed.tsd, delayPowerOffOptions);
      delayText = `出行中已暂停（恢复后 ${savedLabel}）`;
    } else {
      delayText = '出行中已暂停';
    }
  } else {
    const dpoMin = parsed.dpo != null ? parsed.dpo : 0;
    delayText = `当前 ${delayMinutesLabel(dpoMin, delayPowerOffOptions)}`;
  }

  return {
    f2TravelReadbackText: travelText,
    f2DelayPowerReadbackText: delayText
  };
}

function buildFlapPanelStateFromItm(itm, stm) {
  if (itm === 1) return { flapPanelState: 'open', flapPanelStateText: '已打开' };
  if (itm === 0) return { flapPanelState: 'closed', flapPanelStateText: '已关闭' };
  if (itm === 2) return { flapPanelState: 'moving', flapPanelStateText: '运动中' };
  if (itm === 3) {
    let text = '最长持续 3 小时';
    if (stm != null && stm > 0) {
      text = `剩余 ${formatTravelRemainingMinutes(stm)}`;
    }
    return { flapPanelState: 'stealth', flapPanelStateText: text };
  }
  return null;
}

/** Pin2 高电平=钥匙打开；Pin5 低电平=按钮按下 */
function buildF2HwMonitorUpdates(parsed, current) {
  if (!parsed) return {};
  const cur = current || {};
  const updates = {};

  if (parsed.acc === 0 || parsed.acc === 1) {
    const on = parsed.acc === 1;
    if (on !== cur.f2KeyOn || cur.f2KeyStatusText === '监测中…') {
      updates.f2KeyOn = on;
      updates.f2KeyStatusText = on ? '钥匙已打开' : '钥匙已关闭';
    }
  }
  if (parsed.btn === 0 || parsed.btn === 1) {
    const pressed = parsed.btn === 0;
    if (pressed !== cur.f2BtnPressed || cur.f2BtnStatusText === '监测中…') {
      updates.f2BtnPressed = pressed;
      updates.f2BtnStatusText = pressed ? '按钮已按下' : '按钮未按下';
    }
  }
  return updates;
}

module.exports = {
  parseF2StatusLine,
  buildF2SettingStateFromPacket,
  buildF2AdvUiUpdates,
  buildF2FaultModalPayload,
  buildF2StealthModalPayload,
  buildF2ConnectModalQueue,
  buildF2ReadbackTexts,
  buildFlapPanelStateFromItm,
  buildF2HwMonitorUpdates
};
