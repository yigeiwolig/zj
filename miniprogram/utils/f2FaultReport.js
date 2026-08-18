const F2_FAULT_ERR_MAP = {
  1: {
    title: '电机不转',
    content: '开机或刚打开时电机未正常转动（常见：机械未解锁、舵机线束松动/线序错误，或翻板卡死）。指示灯会持续快闪。请先确认已解锁并检查线束与机械，修复后重新上电测试。'
  },
  2: {
    title: '卡住堵转',
    content: '运行中打开/收回连续遇阻，已自动处理并报警。指示灯会红-绿交替闪烁。请检查：是否有异物顶住、机械是否卡滞；舵机及电流检测线（A0）连接是否可靠。排除后重新上电再试。'
  }
};

/** 小程序确认已读故障后发给固件，清除 EEPROM 待上报记录 */
const F2_FAULT_ACK_CMD = '故障已读';

const F2_FAULT_WRN_MAP = {
  1: {
    title: '遇阻收回',
    content: '首次打开遇阻已自动收回，约 0.8 秒后将重试打开（Pin8 快闪）。若仍顶住会报卡住故障。'
  },
  2: {
    title: '连续关钥匙',
    content: '检测到关钥匙后多次自动收回（打开收回已启用）。请注意电瓶电量，避免长时间待机亏电。'
  },
  3: {
    title: '翻开测距异常',
    content: '正常翻开时绿灯常亮，测距应小于 8cm。若测距连续 8 秒仍不小于 8cm，则报此异常，请检查机械位置与测距窗口。'
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
  const out = {
    ang: pick(/ANG:(\d+)/),
    acc: pick(/\|ACC:(\d+)/),
    btn: pick(/\|BTN:(\d+)/),
    itm: pick(/\|ITM:(\d+)/),
    err: pick(/\|ERR:(\d+)/) || 0,
    wrn: pick(/\|WRN:(\d+)/) || 0,
    trv: pick(/\|TRV:(\d+)/) || 0,
    trm: pick(/\|TRM:(\d+)/),
    thm: pick(/\|THM:(\d+)/),
    tah: pick(/\|TAH:(\d+)/),
    stm: pick(/\|STM:(\d+)/),
    stb: pick(/\|STB:(\d+)/),
    tsd: pick(/\|TSD:(\d+)/),
    spd: pick(/\|SPD:(\d+)/),
    hgt: pick(/\|HGT:(\d+)/),
    hrw: pick(/\|HRW:(\d+)/),
    tq: pick(/\|TQ:(\d+)/),
    tsr: pick(/\|TSR:(\d+)/),
    ttb: pick(/\|TTB:(\d+)/),
    dga: pick(/\|DGA:(\d+)/),
    dgb: pick(/\|DGB:(\d+)/),
    f3c: pick(/\|F3C:(\d+)/),
    dgd: pick(/\|DGD:(\d+)/),
    adr: pick(/\|ADR:(\d+)/), // 兼容旧字段，可不存在
    mok: pick(/\|MOK:(\d+)/),
    who: pick(/\|WHO:(\d+)/),
    pa: pick(/\|PA:(\d+)/),
    ims: pick(/\|IMS:(\d+)/),
    lit: pick(/\|LIT:(\d+)/),
    il: pick(/\|IL:(\d+)/),
    iu: pick(/\|IU:(\d+)/),
    iv: pick(/\|IV:(\d+)/),
    ss: pick(/\|SS:(\d+)/),
    bs: pick(/\|BS:(\d+)/),
    ird: pick(/\|IRD:(-?\d+)/),
    ipk: pick(/\|IPK:(-?\d+)/),
    iev: pick(/\|IEV:(\d+)/),
    cal: pick(/\|CAL:(\d+)/),
    calm: pick(/\|CALM:(\d+)/),
    dpo: pick(/\|DPO:(\d+)/),
    smo: pick(/\|SMO:(\d+)/),
    chk: pick(/\|CHK:(\d+)/),
    ret: pick(/\|RET:(\d+)/),
    pwr: pick(/\|PWR:(\d+)/),
    std: pick(/\|STD:(\d+)/),
    mwr: pick(/\|MWR:(\d+)/),
    mot: pick(/\|MOT:(\d+)/),
    tkf: pick(/\|TKF:(\d+)/),
    pol: pick(/\|POL:(\d+)/),
    bp: pick(/\|BP:(\d+)/),
    hf: pick(/\|HF:(\d+)/),
    f3w: pick(/\|F3W:(\d+)/),
  };
  return out;
}

function buildF2SettingStateFromPacket(parsed, currentState, options) {
  const force = !!(options && options.force);
  const isMtUltra = !!(options && options.isMtUltraCard);
  const isF3Max = !!(options && options.isF3Max);
  const base = { ...(currentState || {}) };
  if (!parsed) return null;
  let changed = false;

  if (isMtUltra) {
    if (parsed.std === 0 || parsed.std === 1) {
      const v = parsed.std === 1 ? 'left' : 'right';
      if (force || base.faultDetect !== v) {
        base.faultDetect = v;
        changed = true;
      }
    } else if (parsed.chk === 0 || parsed.chk === 1) {
      const v = parsed.chk === 1 ? 'left' : 'right';
      if (force || base.faultDetect !== v) {
        base.faultDetect = v;
        changed = true;
      }
    }
    if (parsed.mwr === 0 || parsed.mwr === 1) {
      const v = parsed.mwr === 1 ? 'left' : 'right';
      if (force || base.selfRepair !== v) {
        base.selfRepair = v;
        changed = true;
      }
    }
  } else if (parsed.chk === 0 || parsed.chk === 1) {
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
    const v = isMtUltra
      ? (parsed.pwr === 1 ? 'left' : 'right')
      : (parsed.pwr === 0 ? 'left' : 'right');
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
  if (isMtUltra && (parsed.stb === 0 || parsed.stb === 1)) {
    const v = parsed.stb === 1 ? 'left' : 'right';
    if (force || base.stealthBtnExit !== v) {
      base.stealthBtnExit = v;
      changed = true;
    }
  }

  if (isF3Max && (parsed.pol === 0 || parsed.pol === 1)) {
    const v = parsed.pol === 1 ? 'left' : 'right';
    if (force || base.powerOffLock !== v) {
      base.powerOffLock = v;
      changed = true;
    }
    if (parsed.pol === 1 && (force || base.shutdown !== 'left')) {
      base.shutdown = 'left';
      changed = true;
    }
  }

  if (isF3Max && (parsed.bp === 0 || parsed.bp === 1)) {
    const v = parsed.bp === 1 ? 'left' : 'right';
    if (force || base.bootPinDetect !== v) {
      base.bootPinDetect = v;
      changed = true;
    }
  }

  if (isF3Max && parsed.hf !== null && parsed.hf !== undefined) {
    const vMon = (parsed.hf & 1) ? 'left' : 'right';
    if (force || base.heightMon !== vMon) {
      base.heightMon = vMon;
      changed = true;
    }
  }

  if (!changed && !force) return null;
  return base;
}

/** F2 / Ultra 回读校验：点击后期望的状态包字段 */
function buildF2SettingVerifyExpectation(key, targetVal, options) {
  if (!key || !targetVal) return null;
  const isMtUltra = !!(options && options.isMtUltra);
  switch (key) {
    case 'faultDetect':
      if (isMtUltra) {
        return { std: targetVal === 'left' ? 1 : 0 };
      }
      return { chk: targetVal === 'left' ? 1 : 0 };
    case 'selfRepair':
      return { mwr: targetVal === 'left' ? 1 : 0 };
    case 'shutdown':
      return { ret: targetVal === 'left' ? 1 : 0 };
    case 'powerOn':
      if (isMtUltra) {
        return { pwr: targetVal === 'left' ? 1 : 0 };
      }
      return { pwr: targetVal === 'left' ? 0 : 1 };
    case 'travelMode':
      return { trv: targetVal === 'right' ? 1 : 0 };
    case 'smoothMode':
      return { smo: targetVal === 'left' ? 1 : 0 };
    case 'stealthBtnExit':
      return { stb: targetVal === 'left' ? 1 : 0 };
    case 'powerOffLock':
      return { pol: targetVal === 'left' ? 1 : 0 };
    case 'bootPinDetect':
      return null; // 固件省闪存无 |BP:| 回读
    case 'multiRetry':
      return null;
    case 'heightMon':
      return { hfMon: targetVal === 'left' ? 1 : 0 };
    default:
      return null;
  }
}

function packetMatchesBleVerify(parsed, verify) {
  if (!verify || !parsed) return true;
  if (verify.type === 'setting') {
    const exp = buildF2SettingVerifyExpectation(verify.key, verify.targetVal, {
      isMtUltra: !!verify.isMtUltra
    });
    if (!exp) return true;
    return Object.keys(exp).every((field) => {
      if (field === 'hfMon') return parsed.hf != null && (parsed.hf & 1) === exp.hfMon;
      // 状态包缺字段时跳过该项（F3 省闪存无 |POL:|/|PWR:| 等），避免误报「数据发送不成功」
      if (parsed[field] == null) return true;
      return parsed[field] === exp[field];
    });
  }
  if (verify.type === 'speed') {
    return parsed.spd != null && parsed.spd === verify.value;
  }
  if (verify.type === 'delayPower') {
    const want = verify.minutes != null ? verify.minutes : 0;
    const got = parsed.dpo != null ? parsed.dpo : 0;
    return got === want;
  }
  if (verify.type === 'flap') {
    const itm = parsed.itm;
    if (verify.cmd === '打开') return itm === 1 || itm === 2;
    if (verify.cmd === '关闭') return itm === 0 || itm === 2;
    return true;
  }
  return true;
}

function buildF2AdvUiUpdates(parsed, ctx) {
  if (!parsed) return {};
  const force = !!(ctx && ctx.force);
  const isMtUltra = !!(ctx && ctx.isMtUltraCard);
  const isF3Max = !!(ctx && ctx.isF3Max);
  const delayPowerOffOptions = (ctx && ctx.delayPowerOffOptions) || [];
  const current = (ctx && ctx.currentUi) || {};
  const updates = {};

  const settingState = buildF2SettingStateFromPacket(parsed, ctx && ctx.currentState, {
    force,
    isMtUltraCard: isMtUltra,
    isF3Max
  });
  if (settingState) {
    updates.settingState = settingState;
  }

  if (isMtUltra && (parsed.trv === 1 || parsed.trv === 0)) {
    const on = parsed.trv === 1;
    const holdMin = parsed.thm != null ? parsed.thm : (current.travelHoldMin != null ? current.travelHoldMin : 3);
    const durHours = parsed.tah != null ? parsed.tah : (current.travelDurationHours != null ? current.travelDurationHours : 12);
    const keyOffRetract = parsed.tkf === 1
      || (parsed.tkf == null && current.travelKeyOffIndex === 1);
    const tip = buildTravelModeTip(holdMin, durHours, on, keyOffRetract);
    if (force || on !== current.f2TravelModeOn) {
      updates.f2TravelModeOn = on;
      updates.delayPowerOffTip = on
        ? '出行模式中，延时断电已暂停'
        : '请根据电瓶容量选择';
      updates.travelModeTip = tip;
    } else if (force || tip !== current.travelModeTip) {
      updates.travelModeTip = tip;
    }
    if (parsed.thm != null && (force || parsed.thm !== current.travelHoldMin)) {
      updates.travelHoldMin = parsed.thm;
    }
    if (parsed.tah != null && (force || parsed.tah !== current.travelDurationHours)) {
      updates.travelDurationHours = parsed.tah;
    }
    if (parsed.tkf === 0 || parsed.tkf === 1) {
      const idx = parsed.tkf === 1 ? 1 : 0;
      if (force || idx !== current.travelKeyOffIndex) {
        updates.travelKeyOffIndex = idx;
      }
    }
  }

  const travelOn = isMtUltra && (updates.f2TravelModeOn !== undefined
    ? updates.f2TravelModeOn
    : (parsed.trv === 1));

  let nextDelayIdx;
  if (isMtUltra && travelOn && parsed.tsd !== null) {
    nextDelayIdx = delayPowerOffOptions.findIndex((o) => o.minutes === parsed.tsd);
    if (nextDelayIdx < 0) nextDelayIdx = 0;
  } else if (isMtUltra && !isF3Max && parsed.dpo !== null && !travelOn) {
    nextDelayIdx = delayPowerOffOptions.findIndex((o) => o.minutes === parsed.dpo);
    if (nextDelayIdx < 0) nextDelayIdx = 0;
  }
  if (nextDelayIdx !== undefined && (force || nextDelayIdx !== current.delayPowerOffIndex)) {
    updates.delayPowerOffIndex = nextDelayIdx;
  }

  if (isMtUltra && !isF3Max) {
    const readback = buildF2ReadbackTexts(parsed, delayPowerOffOptions);
    if (force || readback.f2TravelReadbackText !== current.f2TravelReadbackText) {
      updates.f2TravelReadbackText = readback.f2TravelReadbackText;
    }
    if (force || readback.f2DelayPowerReadbackText !== current.f2DelayPowerReadbackText) {
      updates.f2DelayPowerReadbackText = readback.f2DelayPowerReadbackText;
    }
  }

  if (isF3Max && (parsed.pol === 0 || parsed.pol === 1)) {
    const lockText = parsed.pol === 1 ? '已开启' : '已关闭';
    if (force || lockText !== current.f3PowerOffLockReadbackText) {
      updates.f3PowerOffLockReadbackText = lockText;
    }
  }

  return updates;
}

function buildF2FaultModalPayload(err, wrn) {
  if (err > 0 && F2_FAULT_ERR_MAP[err]) {
    const info = F2_FAULT_ERR_MAP[err];
    return {
      kind: 'error',
      errCode: err,
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

function buildF2StealthModalPayload(itm, stb) {
  if (itm === 3) {
    const exitHint = stb === 0
      ? '如需解除，请在小程序控制页点击「退出隐蔽模式」'
      : '如需解除，请在控制页面关闭或长按按钮 8 秒';
    return {
      kind: 'info',
      title: '隐蔽模式',
      content: `当前正处于隐蔽模式，按按钮会导致没有反应。${exitHint}。最长持续3小时，超时将自动断电`
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
  const stealthPayload = buildF2StealthModalPayload(parsed.itm, parsed.stb);
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

function buildTravelModeTip(holdMin, hours, travelOn, keyOffRetract) {
  const hold = holdMin > 0 ? holdMin : 3;
  const dur = hours > 0 ? hours : 12;
  const keyOffLine = keyOffRetract ? '关钥匙收回，开钥匙下翻' : '关钥匙不动，开钥匙下翻';
  if (travelOn) {
    return `出行中 · ${keyOffLine} · 保持供电 ${hold} 分钟 · ${dur} 小时后自动关闭`;
  }
  return `${keyOffLine} · 保持供电 ${hold} 分钟（${dur} 小时内有效）`;
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
  const holdMin = parsed.thm != null ? parsed.thm : null;
  const durHours = parsed.tah != null ? parsed.tah : null;
  let travelText = travelOn ? '已开启' : '已关闭';
  if (holdMin != null && durHours != null) {
    travelText += ` · 保持${holdMin}分 / ${durHours}小时`;
  }
  if (travelOn && parsed.trm != null) {
    travelText += ` · ${formatTravelRemainingMinutes(parsed.trm)}`;
  }
  if (parsed.tkf === 1) {
    travelText += ' · 关钥匙收回，开钥匙下翻';
  } else if (parsed.tkf === 0) {
    travelText += ' · 关钥匙不动，开钥匙下翻';
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

function buildFlapPanelStateFromItm(itm, stm, stb, mot) {
  if (itm === 1) return { flapPanelState: 'open', flapPanelStateText: '已打开', flapMotionDir: '' };
  if (itm === 0) return { flapPanelState: 'closed', flapPanelStateText: '已关闭', flapMotionDir: '' };
  if (itm === 2) {
    const opening = mot === 1;
    const closing = mot === 0;
    return {
      flapPanelState: 'moving',
      flapPanelStateText: opening ? '打开中…' : (closing ? '收回中…' : '转动中…'),
      flapMotionDir: opening ? 'open' : (closing ? 'close' : '')
    };
  }
  if (itm === 3) {
    let text = '最长 3 小时';
    if (stm != null && stm > 0) {
      text = formatTravelRemainingMinutes(stm);
    }
    return { flapPanelState: 'stealth', flapPanelStateText: text };
  }
  return null;
}

/** 当前状态卡片：ERR 故障优先于 WRN 翻开测距，再 ITM 折叠/翻开 */
function buildFlapPanelStateFromPacket(parsed) {
  if (!parsed) return null;
  const err = parsed.err || 0;
  if (err > 0 && F2_FAULT_ERR_MAP[err]) {
    return {
      flapPanelState: 'fault',
      flapPanelStateText: F2_FAULT_ERR_MAP[err].title
    };
  }
  const wrn = parsed.wrn || 0;
  if (wrn === 3 && F2_FAULT_WRN_MAP[3]) {
    return {
      flapPanelState: 'fault',
      flapPanelStateText: F2_FAULT_WRN_MAP[3].title
    };
  }
  if (parsed.itm === null || parsed.itm === undefined) return null;
  return buildFlapPanelStateFromItm(parsed.itm, parsed.stm, parsed.stb, parsed.mot);
}

/** Pin2 高电平=钥匙打开；Pin5 低电平=按钮按下 */
function buildF2HwMonitorUpdates(parsed, current) {
  if (!parsed) return {};
  const cur = current || {};
  const force = !!cur.force;
  const updates = {};

  if (parsed.acc === 0 || parsed.acc === 1) {
    const on = parsed.acc === 1;
    if (force || on !== cur.f2KeyOn || cur.f2KeyOn == null) {
      updates.f2KeyOn = on;
      updates.f2KeyStatusText = on ? '开' : '关';
    }
  }
  if (parsed.btn === 0 || parsed.btn === 1) {
    const pressed = parsed.btn === 0;
    if (force || pressed !== cur.f2BtnPressed || cur.f2BtnPressed == null) {
      updates.f2BtnPressed = pressed;
      updates.f2BtnStatusText = pressed ? '按下' : '松开';
    }
  }
  return updates;
}

function formatF3HeightMm(mm) {
  const n = Math.round(Number(mm));
  if (!Number.isFinite(n) || n <= 0) return '未设置';
  if (n > 3000 || n < 10) return '数据异常';
  return `${n} mm`;
}

/** @deprecated 使用 formatF3HeightMm */
function formatF3HeightCm(mm) {
  return formatF3HeightMm(mm);
}

function isF3HeightMmValid(mm) {
  const n = Math.round(Number(mm));
  if (!Number.isFinite(n)) return false;
  if (n === 0) return true;
  return n >= 10 && n <= 3000;
}

/** F3 MAX：危险/检测高度配置回读 */
function buildF3HeightSettingsUpdates(parsed, current) {
  if (!parsed) return {};
  const cur = current || {};
  const force = !!cur.force;
  const updates = {};
  if (parsed.dga !== null && parsed.dga !== undefined) {
    const mm = Math.round(Number(parsed.dga));
    if (Number.isFinite(mm) && isF3HeightMmValid(mm)) {
      if (force || mm !== (cur.f3DangerMm || 0)) {
        updates.f3DangerMm = mm;
        updates.f3DangerReadback = formatF3HeightMm(mm);
      } else if (force) {
        updates.f3DangerReadback = formatF3HeightMm(mm);
      }
    }
  }
  if (parsed.dgb !== null && parsed.dgb !== undefined) {
    const mm = Math.round(Number(parsed.dgb));
    if (Number.isFinite(mm) && isF3HeightMmValid(mm)) {
      if (force || mm !== (cur.f3BaseMm || 0)) {
        updates.f3BaseMm = mm;
        updates.f3BaseReadback = formatF3HeightMm(mm);
      } else if (force) {
        updates.f3BaseReadback = formatF3HeightMm(mm);
      }
    }
  }
  if (parsed.f3c === 0 || parsed.f3c === 1) {
    const on = parsed.f3c === 1;
    if (force || on !== !!cur.f3HeightConfigModeOn) {
      updates.f3HeightConfigModeOn = on;
    }
  }
  if (parsed.dgd === 0 || parsed.dgd === 1) {
    const blocked = parsed.dgd === 1;
    if (force || blocked !== !!cur.f3DangerBlocked) {
      updates.f3DangerBlocked = blocked;
    }
  }
  return updates;
}

/** F3 MAX：TF200C 测高 HGT(mm)，与打开角度无关 */
function buildF3HeightMonitorUpdates(parsed, current) {
  if (!parsed) return {};
  const cur = current || {};
  const force = !!cur.force;
  const updates = {};
  if (parsed.hf !== null && parsed.hf !== undefined && !(parsed.hf & 1)) {
    if (force || cur.f3HeightLive) {
      updates.f3HeightMm = 0;
      updates.f3HeightText = '测高已关闭';
      updates.f3HeightLive = false;
      updates.f3DangerBlocked = false;
    }
    return updates;
  }
  if (parsed.hgt !== null && parsed.hgt !== undefined) {
    const mm = Math.round(Number(parsed.hgt));
    if (Number.isFinite(mm)) {
      if (mm > 0) {
        if (force || mm !== cur.f3HeightMm || cur.f3HeightMm == null) {
          updates.f3HeightMm = mm;
          updates.f3HeightText = `${mm} mm`;
          updates.f3HeightLive = true;
        }
      } else if (force || cur.f3HeightLive) {
        if (!cur.f3HeightConfigModeOn) {
          updates.f3HeightMm = 0;
          updates.f3HeightText = '传感器无数据';
          updates.f3HeightLive = false;
        }
      }
    }
  } else if (force) {
    updates.f3HeightText = cur.f3HeightMm != null ? cur.f3HeightText : '读取中…';
    updates.f3HeightLive = false;
  }
  const liveMm = updates.f3HeightMm != null
    ? updates.f3HeightMm
    : (cur.f3HeightMm != null ? cur.f3HeightMm : null);
  const dangerMm = Math.round(Number(cur.f3DangerMm)) || 0;
  if (dangerMm > 0 && liveMm != null && liveMm > 0) {
    const blocked = liveMm <= dangerMm;
    if (force || blocked !== !!cur.f3DangerBlocked) {
      updates.f3DangerBlocked = blocked;
    }
  }
  if (parsed.f3w === 0 || parsed.f3w === 1 || parsed.f3w === 2) {
    const watchText = parsed.f3w === 1
      ? '≥8cm 计时中…'
      : (parsed.f3w === 2 ? '翻开测距异常' : '');
    if (force || watchText !== (cur.f3FoldWatchText || '')) {
      updates.f3FoldWatchText = watchText;
    }
  }
  return updates;
}

/** 连接后首包：强制刷新牌照架大屏与 Pin2/Pin5，避免与缓存 UI 相等而跳过 setData */
function buildF2FlapPanelUpdates(parsed, current, options) {
  if (!parsed) return {};
  const cur = current || {};
  const force = !!(options && options.force);
  const err = parsed.err || 0;
  if (!force && err <= 0 && (parsed.itm === null || parsed.itm === undefined)) {
    return {};
  }
  const flap = buildFlapPanelStateFromPacket(parsed);
  if (!flap) return {};
  const updates = {};
  if (force || flap.flapPanelState !== cur.flapPanelState) {
    updates.flapPanelState = flap.flapPanelState;
  }
  if (force || flap.flapPanelStateText !== cur.flapPanelStateText) {
    updates.flapPanelStateText = flap.flapPanelStateText;
  }
  if (flap.flapMotionDir !== undefined && (force || flap.flapMotionDir !== cur.flapMotionDir)) {
    updates.flapMotionDir = flap.flapMotionDir;
  }
  return updates;
}

module.exports = {
  F2_FAULT_ACK_CMD,
  parseF2StatusLine,
  buildF2SettingStateFromPacket,
  buildF2SettingVerifyExpectation,
  packetMatchesBleVerify,
  buildF2AdvUiUpdates,
  buildF2FaultModalPayload,
  buildF2StealthModalPayload,
  buildF2ConnectModalQueue,
  buildF2ReadbackTexts,
  buildTravelModeTip,
  buildFlapPanelStateFromItm,
  buildFlapPanelStateFromPacket,
  buildF2FlapPanelUpdates,
  buildF2HwMonitorUpdates,
  buildF3HeightMonitorUpdates,
  buildF3HeightSettingsUpdates,
  formatF3HeightMm,
  formatF3HeightCm
};
