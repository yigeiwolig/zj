/**
 * 转速自动识别 — 从 RPM 录制帧中找最佳 16 位字段
 * 切片 B0B1~B6B7，大/小端双序，单调上涨 + 打分
 */
const { normalizeFrameBytes } = require('./canFrameFormat.js');

function readU16BE(bytes, off) {
  if (off > 6) return 0;
  return (bytes[off] << 8) | bytes[off + 1];
}

function readU16LE(bytes, off) {
  if (off > 6) return 0;
  return (bytes[off + 1] << 8) | bytes[off];
}

function collectIds(frames) {
  const set = new Set();
  (frames || []).forEach((f) => {
    const id = Number(f.id);
    if (Number.isFinite(id)) set.add(id);
  });
  return [...set].sort((a, b) => a - b);
}

function extractSeries(frames, id, offset, bigEndian) {
  const series = [];
  (frames || []).forEach((f) => {
    if (Number(f.id) !== id) return;
    const bytes = normalizeFrameBytes(f);
    const v = bigEndian ? readU16BE(bytes, offset) : readU16LE(bytes, offset);
    series.push(v);
  });
  return series;
}

/**
 * 单调性 + 相关性打分
 */
function scoreRpmSeries(values) {
  const n = values.length;
  if (n < 8) return null;

  let min = values[0];
  let max = values[0];
  let changes = 0;
  let upward = 0;
  let downward = 0;
  let zeroDrops = 0;
  let spikes = 0;

  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;

    if (i === 0) continue;
    const prev = values[i - 1];
    const diff = v - prev;

    if (diff !== 0) changes++;

    if (diff > 0) upward++;
    else if (diff < 0) downward++;

    if (prev > 200 && v < Math.max(50, prev * 0.08)) {
      zeroDrops++;
    }

    if (i >= 2) {
      const prev2 = values[i - 2];
      const rise = prev - prev2;
      const fall = prev - v;
      if (rise > 400 && fall > 400 && v < prev) {
        spikes++;
      }
    }
  }

  const range = max - min;
  if (range < 80) return null;

  const monotonicRatio = upward / (upward + downward + 1);
  if (monotonicRatio < 0.45) return null;
  if (zeroDrops > 0) return null;

  const changeRate = changes / n;
  const smoothness = 1 / (1 + spikes * 0.8);

  const startAvg = avgSlice(values, 0, Math.max(1, Math.floor(n * 0.15)));
  const endAvg = avgSlice(values, Math.floor(n * 0.75), n);
  if (endAvg <= startAvg + range * 0.15) return null;

  const score =
    changeRate * 25 +
    Math.min(range, 20000) * 0.018 +
    monotonicRatio * 35 +
    smoothness * 6 -
    spikes * 3 -
    zeroDrops * 40;

  return {
    score,
    min,
    max,
    range,
    changes,
    changeRate,
    monotonicRatio,
    zeroDrops,
    spikes,
    smoothness,
    sampleCount: n
  };
}

function avgSlice(arr, from, to) {
  let sum = 0;
  let cnt = 0;
  for (let i = from; i < to && i < arr.length; i++) {
    sum += arr[i];
    cnt++;
  }
  return cnt ? sum / cnt : 0;
}

/**
 * @param {Array} frames RPM 步骤全部帧（按时间顺序）
 */
function analyzeRpmFromFrames(frames) {
  const list = frames || [];
  if (list.length < 8) {
    return { candidates: [], best: null, hint: '转速数据太少，请重新采集' };
  }

  const ids = collectIds(list);
  const candidates = [];

  ids.forEach((id) => {
    for (let offset = 0; offset <= 6; offset++) {
      [true, false].forEach((bigEndian) => {
        const series = extractSeries(list, id, offset, bigEndian);
        const metrics = scoreRpmSeries(series);
        if (!metrics) return;

        candidates.push({
          rpm_id: id,
          rpm_pair_offset: offset,
          rpm_be: bigEndian,
          rpm_idle: metrics.min,
          rpm_raw_max: metrics.max,
          score: Math.round((metrics.score + (bigEndian ? metrics.range * 0.002 : 0)) * 10) / 10,
          range: metrics.range,
          changeRate: Math.round(metrics.changeRate * 1000) / 1000,
          monotonicRatio: Math.round(metrics.monotonicRatio * 1000) / 1000,
          spikes: metrics.spikes,
          sampleCount: metrics.sampleCount,
          endianLabel: bigEndian ? '大端 BE' : '小端 LE'
        });
      });
    }
  });

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] || null;
  if (best) {
    best.calib_raw = measureCalibRawFromTail(list, best);
  }

  return {
    candidates: candidates.slice(0, 6),
    best,
    hint: best
      ? `转速字段：ID ${best.rpm_id} 字节 ${best.rpm_pair_offset} ${best.endianLabel}，校准点 raw ${best.calib_raw || best.rpm_raw_max}`
      : '未识别到符合条件的转速序列，请确保从低转速匀速拧至 4000 转'
  };
}

function rpmFormPatchFromCandidate(candidate) {
  if (!candidate) return null;
  return {
    rpm_id: String(candidate.rpm_id),
    rpm_pair_offset: String(candidate.rpm_pair_offset),
    rpm_be: !!candidate.rpm_be,
    rpm_idle: String(candidate.rpm_idle),
    rpm_raw_max: String(candidate.rpm_raw_max)
  };
}

/** N 挡静止帧中，取已识别转速字段的中位 raw 作为怠速基准 */
function measureNeutralIdleRaw(neutralFrames, rpmCandidate) {
  if (!rpmCandidate || !neutralFrames || !neutralFrames.length) return null;

  const series = extractSeries(
    neutralFrames,
    rpmCandidate.rpm_id,
    rpmCandidate.rpm_pair_offset,
    rpmCandidate.rpm_be
  );
  if (series.length < 3) return null;

  const sorted = series.slice().sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)]);
}

/** 确认到达 4000 转时，取录制末尾一段 CAN raw 的中位数 */
function measureCalibRawFromTail(frames, rpmCandidate, tailMs = 1200) {
  if (!rpmCandidate || !frames || !frames.length) return null;

  const id = rpmCandidate.rpm_id;
  const offset = rpmCandidate.rpm_pair_offset;
  const be = rpmCandidate.rpm_be;

  const matched = (frames || []).filter((f) => Number(f.id) === id);
  if (!matched.length) return null;

  let cutoff = 0;
  const lastTs = matched[matched.length - 1].ts;
  if (Number.isFinite(lastTs) && lastTs > 0) {
    cutoff = lastTs - tailMs;
  }

  let series;
  if (cutoff > 0) {
    series = matched
      .filter((f) => (f.ts || 0) >= cutoff)
      .map((f) => {
        const bytes = normalizeFrameBytes(f);
        return be ? readU16BE(bytes, offset) : readU16LE(bytes, offset);
      });
  }
  if (!series || series.length < 3) {
    series = extractSeries(frames, id, offset, be);
    const tailCount = Math.max(3, Math.floor(series.length * 0.2));
    series = series.slice(-tailCount);
  }
  if (!series.length) return null;

  const sorted = series.slice().sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)]);
}

module.exports = {
  analyzeRpmFromFrames,
  rpmFormPatchFromCandidate,
  measureNeutralIdleRaw,
  measureCalibRawFromTail,
  extractSeries,
  scoreRpmSeries
};
