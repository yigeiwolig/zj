/**
 * 根据挡位/转速识别结果 + 用户仪表参数，构建 ESP32 运行配置
 *
 * 灯带映射：检测到的 CAN 怠速 raw → 0 颗；检测峰值 raw → num_leds 颗（默认 30）；
 * 用户 input_idle / input_redline 定义表盘转速区间，用于微调满刻度 raw 范围。
 */
const { gearFormPatchFromCandidate } = require('./canFrameFormat.js');
const { rpmFormPatchFromCandidate, measureNeutralIdleRaw } = require('./canRpmAnalysis.js');

const DEFAULT_INPUT_IDLE = 1400;
const DEFAULT_INPUT_REDLINE = 10000;
const RPM_CALIB_TARGET = 4000;
const DEFAULT_NUM_LEDS = 30;
const MIN_NUM_LEDS = 1;
const MAX_NUM_LEDS = 300;
const NUM_LEDS_STORAGE_KEY = 'can_learn_num_leds';

function clampNumLeds(value, fallback = DEFAULT_NUM_LEDS) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_NUM_LEDS, Math.max(MIN_NUM_LEDS, n));
}

function loadStoredNumLeds() {
  try {
    const stored = wx.getStorageSync(NUM_LEDS_STORAGE_KEY);
    return clampNumLeds(stored);
  } catch (e) {
    return DEFAULT_NUM_LEDS;
  }
}

function saveStoredNumLeds(value) {
  const n = clampNumLeds(value);
  try {
    wx.setStorageSync(NUM_LEDS_STORAGE_KEY, n);
  } catch (e) { /* ignore */ }
  return n;
}

function resolveNumLeds(configOrValue) {
  if (configOrValue && typeof configOrValue === 'object') {
    return clampNumLeds(configOrValue.num_leds);
  }
  return clampNumLeds(configOrValue);
}

function gearFieldPresent(v) {
  return v != null && v !== '' && Number.isFinite(Number(v));
}

/** 挡位表是否损坏（全 0、大量重复、仅 N 有效） */
function isBrokenGearTable(values) {
  if (!Array.isArray(values) || values.length < 7) return true;
  const nums = values.map((x) => Number(x) & 0xff);
  const onlyNeutral = nums[0] === 0 && nums.slice(1).every((x) => x === 0);
  if (onlyNeutral) return true;
  const uniq = new Set(nums);
  if (uniq.size < 4) return true;
  if (nums[0] === nums[1]) return true;
  return false;
}

/** 从学习结果补全顺序挡位 raw 值（如 ID294 字节0 = 0,1,2…） */
function resolveGearValues(gearPatch) {
  if (!gearPatch) return null;
  const fieldFor = (g) => (g === 0 ? 'gear_neutral' : `gear_${g}`);
  const values = [];
  for (let g = 0; g <= 6; g += 1) {
    const raw = gearPatch[fieldFor(g)];
    if (gearFieldPresent(raw)) {
      values[g] = Number(raw) & 0xff;
    } else if (gearFieldPresent(gearPatch[`gear_${g}`])) {
      values[g] = Number(gearPatch[`gear_${g}`]) & 0xff;
    } else {
      values[g] = null;
    }
  }

  let step = null;
  if (values[0] != null && values[1] != null) step = values[1] - values[0];
  if (step == null || step === 0) {
    for (let i = 0; i < 6; i += 1) {
      if (values[i] != null && values[i + 1] != null) {
        const s = values[i + 1] - values[i];
        if (s !== 0) {
          step = s;
          break;
        }
      }
    }
  }

  if (step != null && step !== 0) {
    let anchorIdx = values.findIndex((v) => v != null);
    if (anchorIdx < 0) return null;
    const anchorVal = values[anchorIdx];
    for (let g = 0; g <= 6; g += 1) {
      if (values[g] == null) {
        values[g] = (anchorVal + (g - anchorIdx) * step) & 0xff;
      }
    }
  } else if (values[0] != null && values[0] === 0) {
    for (let g = 0; g <= 6; g += 1) {
      if (values[g] == null) values[g] = g & 0xff;
    }
  } else {
    for (let g = 0; g <= 6; g += 1) {
      if (values[g] == null) return null;
    }
  }

  return values;
}

function gearValuesFromCandidate(candidate) {
  const patch = gearFormPatchFromCandidate(candidate);
  return resolveGearValues(patch);
}

function configPatchFromGearValues(values) {
  if (!values || values.length < 7) return {};
  return {
    gear_values: values,
    gear_neutral: values[0],
    gear_one: values[1],
    gear_1: values[1],
    gear_2: values[2],
    gear_3: values[3],
    gear_4: values[4],
    gear_5: values[5],
    gear_6: values[6]
  };
}

/** 写入设备 / 加载缓存前统一纠正挡位表 */
function normalizeGearValuesForDevice(config) {
  if (!config) return [0, 1, 2, 3, 4, 5, 6];

  if (Array.isArray(config.gear_values) && config.gear_values.length >= 7) {
    const nums = config.gear_values.map((x) => Number(x) & 0xff);
    if (!isBrokenGearTable(nums)) {
      const resolved = resolveGearValues({
        gear_neutral: nums[0],
        gear_1: gearFieldPresent(nums[1]) ? nums[1] : undefined,
        gear_2: gearFieldPresent(nums[2]) ? nums[2] : undefined,
        gear_3: gearFieldPresent(nums[3]) ? nums[3] : undefined,
        gear_4: gearFieldPresent(nums[4]) ? nums[4] : undefined,
        gear_5: gearFieldPresent(nums[5]) ? nums[5] : undefined,
        gear_6: gearFieldPresent(nums[6]) ? nums[6] : undefined
      });
      if (resolved) return resolved;
      return nums;
    }
  }

  const resolved = resolveGearValues({
    gear_neutral: config.gear_neutral,
    gear_1: config.gear_1 != null ? config.gear_1 : config.gear_one,
    gear_2: config.gear_2,
    gear_3: config.gear_3,
    gear_4: config.gear_4,
    gear_5: config.gear_5,
    gear_6: config.gear_6
  });
  return resolved || [0, 1, 2, 3, 4, 5, 6];
}

function validateGearTable(values) {
  const nums = normalizeGearValuesForDevice({ gear_values: values });
  const uniq = new Set(nums);
  if (uniq.size < 4) {
    return { ok: false, issue: '挡位 raw 值重复过多，请重新录入 N~6 挡或核对字节偏移' };
  }
  return { ok: true, values: nums };
}

function safeInputIdle(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safeInputRedline(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 用怠速 raw + 校准点(4000转) raw，外推表盘红区对应的 CAN raw */
function extrapolateRedlineRaw(idle_raw, calib_raw, input_idle, input_redline, calib_rpm = RPM_CALIB_TARGET) {
  const idleRpm = Number(input_idle);
  const redlineRpm = Number(input_redline);
  const calibRpm = Number(calib_rpm);
  if (!Number.isFinite(idle_raw) || !Number.isFinite(calib_raw)) return null;
  if (!Number.isFinite(idleRpm) || !Number.isFinite(redlineRpm) || !Number.isFinite(calibRpm)) return null;
  if (redlineRpm <= idleRpm) return null;
  if (calibRpm <= idleRpm) return null;
  if (calib_raw <= idle_raw) return null;

  const rpmSpan = calibRpm - idleRpm;
  const rawSpan = calib_raw - idle_raw;
  const userSpan = redlineRpm - idleRpm;
  return Math.round(idle_raw + rawSpan * (userSpan / rpmSpan));
}

/** @deprecated 保留旧名，内部走外推 */
function computeRpmRawMax(idle_raw, calib_raw, input_idle, input_redline) {
  return extrapolateRedlineRaw(idle_raw, calib_raw, input_idle, input_redline, RPM_CALIB_TARGET);
}

/** 当前 CAN raw → 预估亮灯颗数（与固件 smoothstep 一致） */
function rawToLedCount(raw, config) {
  if (!config) return 0;
  const lo = Number(config.rpm_idle);
  const hi = Number(config.rpm_raw_max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return 0;

  let t = (Number(raw) - lo) / (hi - lo);
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  t = t * t * (3 - 2 * t);
  const total = resolveNumLeds(config);
  return Math.round(t * total);
}

function buildRuntimeConfig(gearCandidate, rpmCandidate, options = {}) {
  if (!gearCandidate || !rpmCandidate) return null;

  const gearPatch = gearFormPatchFromCandidate(gearCandidate);
  const rpmPatch = rpmFormPatchFromCandidate(rpmCandidate);
  if (!gearPatch || !rpmPatch) return null;

  const safeInputIdleVal = safeInputIdle(options.input_idle, DEFAULT_INPUT_IDLE);
  const safeInputRedlineVal = safeInputRedline(options.input_redline, DEFAULT_INPUT_REDLINE);
  const num_leds = resolveNumLeds(options.num_leds);

  const neutralFrames = options.neutral_frames || [];
  const neutralIdle = measureNeutralIdleRaw(neutralFrames, rpmCandidate);
  const blipMinRaw = Number(rpmCandidate.rpm_idle);
  const detected_idle_raw = Number.isFinite(neutralIdle) && neutralIdle > 0
    ? neutralIdle
    : blipMinRaw;
  if (!Number.isFinite(detected_idle_raw) || detected_idle_raw <= 0) return null;

  const detected_calib_raw = Number(
    options.detected_calib_raw != null
      ? options.detected_calib_raw
      : rpmCandidate.calib_raw != null
        ? rpmCandidate.calib_raw
        : rpmCandidate.rpm_raw_max
  );
  if (!Number.isFinite(detected_calib_raw) || detected_calib_raw <= detected_idle_raw) return null;

  const rpm_raw_max = extrapolateRedlineRaw(
    detected_idle_raw,
    detected_calib_raw,
    safeInputIdleVal,
    safeInputRedlineVal,
    RPM_CALIB_TARGET
  );
  if (!Number.isFinite(rpm_raw_max) || rpm_raw_max <= detected_idle_raw) return null;

  const rawSpan = rpm_raw_max - detected_idle_raw;
  const userRpmSpan = safeInputRedlineVal - safeInputIdleVal;
  const scaleK = userRpmSpan > 0 ? rawSpan / userRpmSpan : 0;

  const gearValues = gearValuesFromCandidate(gearCandidate) || resolveGearValues(gearPatch);
  if (!gearValues) return null;

  return {
    version: 4,
    num_leds,
    gear_id: Number(gearPatch.gear_id),
    gear_offset: Number(gearPatch.gear_offset),
    gear_values: gearValues,
    gear_neutral: gearValues[0],
    gear_one: gearValues[1],
    gear_2: gearValues[2],
    gear_3: gearValues[3],
    gear_4: gearValues[4],
    gear_5: gearValues[5],
    gear_6: gearValues[6],
    rpm_id: Number(rpmPatch.rpm_id),
    rpm_pair_offset: Number(rpmPatch.rpm_pair_offset),
    rpm_be: !!rpmPatch.rpm_be,
    rpm_idle: Math.round(detected_idle_raw),
    rpm_raw_max: rpm_raw_max,
    rpm_max: Math.round(safeInputRedlineVal),
    scaleK,
    input_idle: safeInputIdleVal,
    input_redline: safeInputRedlineVal,
    detected_idle_raw: Math.round(detected_idle_raw),
    detected_calib_raw: Math.round(detected_calib_raw),
    detected_peak_raw: Math.round(rpm_raw_max),
    calib_rpm: RPM_CALIB_TARGET,
    detected_idle_source: Number.isFinite(neutralIdle) && neutralIdle > 0 ? 'neutral' : 'rpm_blip_min',
    blip_min_raw: Number.isFinite(blipMinRaw) ? Math.round(blipMinRaw) : 0
  };
}

/** 已有基准配置时，仅按新仪表怠速/红区重算满刻度 raw */
function recalcRpmCalibration(savedConfig, options = {}) {
  if (!savedConfig) return null;

  const detected_idle_raw = Number(savedConfig.detected_idle_raw || savedConfig.rpm_idle);
  let detected_calib_raw = Number(savedConfig.detected_calib_raw);
  if (!Number.isFinite(detected_calib_raw) || detected_calib_raw <= detected_idle_raw) {
    detected_calib_raw = Number(savedConfig.detected_peak_raw || savedConfig.rpm_raw_max);
  }
  if (!Number.isFinite(detected_idle_raw) || detected_idle_raw <= 0) return null;
  if (!Number.isFinite(detected_calib_raw) || detected_calib_raw <= detected_idle_raw) return null;

  const safeInputIdleVal = safeInputIdle(
    options.input_idle,
    Number(savedConfig.input_idle) || DEFAULT_INPUT_IDLE
  );
  const safeInputRedlineVal = safeInputRedline(
    options.input_redline,
    Number(savedConfig.input_redline) || DEFAULT_INPUT_REDLINE
  );

  const calib_rpm = Number(savedConfig.calib_rpm) || RPM_CALIB_TARGET;
  const rpm_raw_max = extrapolateRedlineRaw(
    detected_idle_raw,
    detected_calib_raw,
    safeInputIdleVal,
    safeInputRedlineVal,
    calib_rpm
  );
  if (!Number.isFinite(rpm_raw_max) || rpm_raw_max <= detected_idle_raw) return null;

  const rawSpan = rpm_raw_max - detected_idle_raw;
  const userRpmSpan = safeInputRedlineVal - safeInputIdleVal;
  const scaleK = userRpmSpan > 0 ? rawSpan / userRpmSpan : 0;

  return {
    ...savedConfig,
    num_leds: resolveNumLeds(savedConfig.num_leds),
    rpm_idle: Math.round(detected_idle_raw),
    rpm_raw_max,
    rpm_max: Math.round(safeInputRedlineVal),
    scaleK,
    input_idle: safeInputIdleVal,
    input_redline: safeInputRedlineVal,
    detected_idle_raw: Math.round(detected_idle_raw),
    detected_calib_raw: Math.round(detected_calib_raw),
    detected_peak_raw: Math.round(rpm_raw_max),
    calib_rpm
  };
}

function buildRpmCalibrationPayload(config) {
  if (!config) return null;
  return {
    rpm_idle: config.rpm_idle,
    rpm_raw_max: config.rpm_raw_max,
    rpm_max: config.rpm_max,
    num_leds: resolveNumLeds(config)
  };
}

function buildRuntimePayload(config) {
  if (!config) return null;
  const gear_values = normalizeGearValuesForDevice(config);
  return {
    gear_id: config.gear_id,
    gear_offset: config.gear_offset,
    gear_values,
    gear_neutral: gear_values[0],
    gear_one: gear_values[1],
    gear_2: gear_values[2],
    gear_3: gear_values[3],
    gear_4: gear_values[4],
    gear_5: gear_values[5],
    gear_6: gear_values[6],
    rpm_id: config.rpm_id,
    rpm_pair_offset: config.rpm_pair_offset,
    rpm_be: config.rpm_be,
    rpm_idle: config.rpm_idle,
    rpm_raw_max: config.rpm_raw_max,
    rpm_max: config.rpm_max,
    num_leds: resolveNumLeds(config)
  };
}

module.exports = {
  DEFAULT_INPUT_IDLE,
  DEFAULT_INPUT_REDLINE,
  RPM_CALIB_TARGET,
  DEFAULT_NUM_LEDS,
  MIN_NUM_LEDS,
  MAX_NUM_LEDS,
  NUM_LEDS_STORAGE_KEY,
  clampNumLeds,
  loadStoredNumLeds,
  saveStoredNumLeds,
  resolveNumLeds,
  resolveGearValues,
  gearValuesFromCandidate,
  configPatchFromGearValues,
  normalizeGearValuesForDevice,
  validateGearTable,
  isBrokenGearTable,
  NUM_LEDS: DEFAULT_NUM_LEDS,
  buildRuntimeConfig,
  buildRuntimePayload,
  recalcRpmCalibration,
  buildRpmCalibrationPayload,
  rawToLedCount,
  extrapolateRedlineRaw,
  computeRpmRawMax
};
