/**
 * CAN 学习数据分析
 * 挡位：快照终值 A→B→A 闭环（noise 仅扣分不剔除）
 * 转速：LE/BE 双扫描，delta>100 即参与打分，不设绝对上下限
 */

function hexId(id) {
  const n = typeof id === 'string' ? parseInt(id, 10) : Number(id);
  if (!Number.isFinite(n)) return '0x0';
  return '0x' + n.toString(16).toUpperCase();
}

function readU16LE(data, off) {
  if (!data || off > 6) return 0;
  return ((data[off + 1] & 0xff) << 8) | (data[off] & 0xff);
}

function readU16BE(data, off) {
  if (!data || off > 6) return 0;
  return ((data[off] & 0xff) << 8) | (data[off + 1] & 0xff);
}

function mergeStepFrames(batches) {
  const map = {};
  (batches || []).forEach((batch) => {
    (batch.frames || []).forEach((f) => {
      const id = Number(f.id);
      if (!Number.isFinite(id)) return;
      const data = (f.data || []).slice(0, 8).map((b) => Number(b) & 0xff);
      const noise = (f.noise || []).slice(0, 8).map((b) => Number(b) & 0xff);
      while (data.length < 8) data.push(0);
      while (noise.length < 8) noise.push(0);
      map[id] = { data, noise };
    });
  });
  return map;
}

function byteSnapshot(frame, offset) {
  if (!frame) return { value: 0, noisy: true };
  const noise = Number(frame.noise[offset] || 0) & 0xff;
  const value = Number(frame.data[offset] || 0) & 0xff;
  return { value, noisy: noise !== 0 };
}

function gearIdTieBreak(id) {
  const n = Number(id);
  if (n === 0x220 || n === 0x320) return 100;
  return 0;
}

function gearOffsetTieBreak(offset) {
  if (offset === 0 || offset === 5) return 50;
  return 0;
}

function noisePenalty(fa, fb, fc, off) {
  let p = 0;
  if (fa && (Number(fa.noise[off] || 0) & 0xff)) p += 200;
  if (fb && (Number(fb.noise[off] || 0) & 0xff)) p += 200;
  if (fc && (Number(fc.noise[off] || 0) & 0xff)) p += 200;
  return p;
}

/**
 * 挡位：只看三步快照终值 — A≠B 且 A===C（闭环）
 * noise 仅通过 noisePenalty 扣分，绝不参与 continue / reject
 */
function analyzeGear(snapshotA, snapshotB, snapshotC) {
  const mapA = mergeStepFrames(snapshotA);
  const mapB = mergeStepFrames(snapshotB);
  const mapC = mergeStepFrames(snapshotC);

  const ids = new Set([
    ...Object.keys(mapA),
    ...Object.keys(mapB),
    ...Object.keys(mapC)
  ].map(Number));

  const candidates = [];
  const rejected = [];

  ids.forEach((id) => {
    const fa = mapA[id];
    const fb = mapB[id];
    const fc = mapC[id];

    if (!fa || !fb) {
      rejected.push({ id, idHex: hexId(id), reason: 'missing_step', step: !fa ? 'A' : 'B' });
      return;
    }

    for (let off = 0; off < 8; off++) {
      const va = fa.data[off];
      const vb = fb.data[off];
      const tag = { id, idHex: hexId(id), offset: off };

      if (va === vb) continue;

      if (fc) {
        const vc = fc.data[off];
        if (vc !== va) {
          rejected.push({
            ...tag,
            reason: 'no_loop_closure',
            valueA: va,
            valueB: vb,
            valueC: vc
          });
          continue;
        }
        candidates.push({
          id,
          idHex: hexId(id),
          offset: off,
          neutralVal: va,
          gearOneVal: vb,
          valueC: vc,
          partial: false,
          cycle: 'A→B→A',
          noisePenalty: noisePenalty(fa, fb, fc, off),
          score: 0
        });
      } else {
        candidates.push({
          id,
          idHex: hexId(id),
          offset: off,
          neutralVal: va,
          gearOneVal: vb,
          valueC: va,
          partial: true,
          cycle: 'A→B',
          noisePenalty: noisePenalty(fa, fb, null, off),
          score: 0
        });
      }
    }
  });

  candidates.forEach((c) => {
    const jump = Math.abs(c.gearOneVal - c.neutralVal);
    let score = 100000 + jump;
    score += gearIdTieBreak(c.id);
    score += gearOffsetTieBreak(c.offset);
    score -= c.noisePenalty || 0;
    if (c.partial) score -= 50000;
    c.score = score;
  });

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] || null;

  return {
    candidates,
    rejected,
    result: best
      ? {
          gear_id: best.id,
          gear_offset: best.offset,
          gear_neutral: best.neutralVal,
          gear_one: best.gearOneVal,
          idHex: best.idHex,
          score: best.score,
          cycle: best.cycle
        }
      : null
  };
}

/** 仅排除无效增量，不设 min/max 绝对上限 */
function isPlausibleRpmCandidate(c) {
  const delta = Number(c.delta != null ? c.delta : (Number(c.max) - Number(c.min)));
  const min = Number(c.min || 0);
  const max = Number(c.max || 0);
  if (delta <= 100) return false;
  if (max <= min) return false;
  return true;
}

function scoreRpmCandidate(c) {
  const delta = Number(c.delta || 0);
  const changes = Number(c.changes || 0);
  const samples = Math.max(Number(c.samples || 0), 1);
  const up = Number(c.up || 0);
  const down = Number(c.down || 0);
  const spikes = Number(c.spikes || 0);
  const wraps = Number(c.wraps != null ? c.wraps : c.wrap_count || 0);

  let score = delta * 2.5;
  if (changes > 0) {
    const changeRate = changes / samples;
    const upRatio = up / Math.max(changes, 1);
    const downRatio = down / Math.max(changes, 1);
    const smoothness = Math.max(0.05, 1 - spikes / Math.max(changes, 1));
    score *= (0.6 + changeRate * 1.2);
    score *= (0.35 + upRatio * 0.5);
    score *= (0.55 + smoothness * 0.12);
    if (upRatio < 0.45) score *= 0.15;
    if (downRatio > 0.35) score *= 0.2;
    if (changeRate > 0.15) score *= 1.5;
    if (upRatio > 0.6) score *= 1.4;
  }
  score -= wraps * 10000;
  if (c.be) score += 4500;
  if (Number(c.id) === 0x110) score += 3500;
  return score;
}

function analyzeRpm(deltasPayload) {
  const candidates = [];
  const tops = (deltasPayload && deltasPayload.tops) || [];

  const pushCandidate = (raw) => {
    const item = {
      id: Number(raw.id),
      idHex: hexId(raw.id),
      pair_offset: Number(raw.off != null ? raw.off : raw.pair_offset),
      be: !!(raw.be || raw.big_endian),
      min: Number(raw.min || 0),
      max: Number(raw.max || 0),
      delta: Number(raw.delta != null ? raw.delta : (Number(raw.max) - Number(raw.min))),
      changes: Number(raw.changes || 0),
      samples: Number(raw.samples || 0),
      up: Number(raw.up || 0),
      down: Number(raw.down || 0),
      wraps: Number(raw.wraps != null ? raw.wraps : raw.wrap_count || 0),
      spikes: Number(raw.spikes || 0)
    };
    if (!isPlausibleRpmCandidate(item)) return;
    item.rpm_raw_max = item.max;
    item.rpm_idle = item.min;
    item.score = scoreRpmCandidate(item);
    candidates.push(item);
  };

  if (Array.isArray(tops) && tops.length) {
    tops.forEach(pushCandidate);
  } else {
    const deltas = (deltasPayload && deltasPayload.deltas) || deltasPayload || {};
    Object.keys(deltas).forEach((idKey) => {
      const id = Number(idKey);
      const pairs = deltas[idKey];
      if (!pairs || typeof pairs !== 'object') return;
      Object.keys(pairs).forEach((offKey) => {
        const off = Number(offKey);
        const p = pairs[offKey];
        pushCandidate({
          id, off, be: false,
          min: p.min, max: p.max, delta: p.delta,
          changes: p.changes, samples: p.samples, up: p.up, spikes: p.spikes
        });
        if (p.min_be != null || p.max_be != null) {
          pushCandidate({
            id, off, be: true,
            min: p.min_be, max: p.max_be,
            delta: p.delta_be != null ? p.delta_be : (Number(p.max_be) - Number(p.min_be)),
            changes: p.changes_be, samples: p.samples_be, up: p.up_be, spikes: p.spikes_be
          });
        }
      });
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] || null;

  const rawIdle = best ? best.min : 0;
  const rawMax = best ? best.max : 1;
  const rpmDisplayMax = Math.max(1000, Math.ceil(((rawMax - rawIdle) * 1.15) / 500) * 500);

  return {
    candidates,
    result: best
      ? {
          rpm_id: best.id,
          rpm_pair_offset: best.pair_offset,
          rpm_be: best.be,
          rpm_idle: rawIdle,
          rpm_raw_max: rawMax,
          rpm_max: rpmDisplayMax,
          idHex: best.idHex,
          delta: best.delta,
          score: best.score
        }
      : null
  };
}

function buildRuntimeConfig(gearResult, rpmResult, options = {}) {
  if (!gearResult || !rpmResult) return null;
  const { normalizeGearValuesForDevice, configPatchFromGearValues } = require('./canRuntimeConfig.js');
  const rpmMax = Number(options.rpmMax || rpmResult.rpm_max || 8000);
  const rpmIdle = Number(rpmResult.rpm_idle != null ? rpmResult.rpm_idle : rpmResult.min || 0);
  const rawMax = Number(rpmResult.rpm_raw_max || rpmResult.max || 1);
  const extraGears = options.gearValues || {};
  const partial = {
    gear_neutral: gearResult.gear_neutral,
    gear_1: gearResult.gear_one,
    gear_id: gearResult.gear_id,
    gear_offset: gearResult.gear_offset
  };
  for (let g = 2; g <= 6; g += 1) {
    if (extraGears[g] != null) partial[`gear_${g}`] = Number(extraGears[g]) & 0xff;
  }
  const gear_values = normalizeGearValuesForDevice(partial);
  const gearPatch = configPatchFromGearValues(gear_values);
  return {
    gear_id: gearResult.gear_id,
    gear_offset: gearResult.gear_offset,
    ...gearPatch,
    rpm_id: rpmResult.rpm_id,
    rpm_pair_offset: rpmResult.rpm_pair_offset,
    rpm_be: !!rpmResult.rpm_be,
    rpm_idle: rpmIdle,
    rpm_max: rpmMax,
    rpm_raw_max: rawMax > rpmIdle ? rawMax : rpmIdle + 1
  };
}

module.exports = {
  hexId,
  readU16LE,
  readU16BE,
  mergeStepFrames,
  byteSnapshot,
  isPlausibleRpmCandidate,
  analyzeGear,
  analyzeRpm,
  buildRuntimeConfig
};
