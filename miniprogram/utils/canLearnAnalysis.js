/**
 * CAN 学习数据分析（小程序端）
 * 挡位：A→B→C 闭环验证
 * 转速：轰油门期间 16 位字段最大 Delta
 */

function hexId(id) {
  const n = typeof id === 'string' ? parseInt(id, 10) : Number(id);
  if (!Number.isFinite(n)) return '0x0';
  return '0x' + n.toString(16).toUpperCase();
}

function normalizeFrames(batches) {
  const map = {};
  (batches || []).forEach((batch) => {
    (batch.frames || []).forEach((f) => {
      const id = Number(f.id);
      if (!Number.isFinite(id)) return;
      map[id] = {
        data: (f.data || []).slice(0, 8).map((b) => Number(b) & 0xff),
        noise: (f.noise || []).slice(0, 8).map((b) => Number(b) & 0xff)
      };
      while (map[id].data.length < 8) map[id].data.push(0);
      while (map[id].noise.length < 8) map[id].noise.push(0);
    });
  });
  return map;
}

function mergeNoiseFromA(batchesA) {
  const noise = {};
  (batchesA || []).forEach((batch) => {
    (batch.frames || []).forEach((f) => {
      const id = Number(f.id);
      if (!noise[id]) noise[id] = new Array(8).fill(0);
      (f.noise || []).forEach((b, i) => {
        noise[id][i] |= Number(b) & 0xff;
      });
    });
  });
  return noise;
}

function isNoiseBit(noiseMask, offset) {
  return noiseMask && (noiseMask[offset] & 0xff) !== 0;
}

/**
 * 挡位特征锁定
 */
function analyzeGear(snapshotA, snapshotB, snapshotC, noiseA) {
  const mapA = normalizeFrames(snapshotA);
  const mapB = normalizeFrames(snapshotB);
  const mapC = normalizeFrames(snapshotC);
  const noiseMap = mergeNoiseFromA(snapshotA);
  Object.keys(noiseA || {}).forEach((k) => {
    const id = Number(k);
    if (!noiseMap[id]) noiseMap[id] = new Array(8).fill(0);
    (noiseA[k] || []).forEach((b, i) => {
      noiseMap[id][i] |= Number(b) & 0xff;
    });
  });

  const candidates = [];
  const ids = new Set([...Object.keys(mapA), ...Object.keys(mapB), ...Object.keys(mapC)].map(Number));

  ids.forEach((id) => {
    const a = mapA[id];
    const b = mapB[id];
    const c = mapC[id];
    if (!a || !b || !c) return;
    for (let off = 0; off < 8; off++) {
      if (isNoiseBit(noiseMap[id], off)) continue;
      const va = a.data[off];
      const vb = b.data[off];
      const vc = c.data[off];
      if (va === vb) continue;
      if (vc !== va) continue;
      candidates.push({
        id,
        idHex: hexId(id),
        offset: off,
        neutralVal: va,
        gearOneVal: vb,
        score: Math.abs(vb - va)
      });
    }
  });

  candidates.sort((x, y) => y.score - x.score);
  const best = candidates[0] || null;
  return {
    candidates,
    result: best
      ? {
          gear_id: best.id,
          gear_offset: best.offset,
          gear_neutral: best.neutralVal,
          gear_one: best.gearOneVal,
          idHex: best.idHex
        }
      : null
  };
}

/**
 * 转速特征锁定 — 找 delta 最大的 16 位 LE 字段
 */
function analyzeRpm(deltasPayload) {
  const deltas = (deltasPayload && deltasPayload.deltas) || deltasPayload || {};
  const candidates = [];

  Object.keys(deltas).forEach((idKey) => {
    const id = Number(idKey);
    const pairs = deltas[idKey];
    if (!pairs || typeof pairs !== 'object') return;
    Object.keys(pairs).forEach((offKey) => {
      const off = Number(offKey);
      const p = pairs[offKey];
      const delta = Number(p.delta || 0);
      const max = Number(p.max || 0);
      const min = Number(p.min || 0);
      if (delta <= 0) return;
      candidates.push({
        id,
        idHex: hexId(id),
        pair_offset: off,
        delta,
        min,
        max,
        rpm_raw_max: max
      });
    });
  });

  candidates.sort((a, b) => b.delta - a.delta);
  const best = candidates[0] || null;
  return {
    candidates,
    result: best
      ? {
          rpm_id: best.id,
          rpm_pair_offset: best.pair_offset,
          rpm_raw_max: best.max,
          rpm_max: 8000,
          idHex: best.idHex,
          delta: best.delta
        }
      : null
  };
}

function buildRuntimeConfig(gearResult, rpmResult, options = {}) {
  if (!gearResult || !rpmResult) return null;
  const rpmMax = Number(options.rpmMax || 8000);
  return {
    gear_id: gearResult.gear_id,
    gear_offset: gearResult.gear_offset,
    gear_neutral: gearResult.gear_neutral,
    gear_one: gearResult.gear_one,
    rpm_id: rpmResult.rpm_id,
    rpm_pair_offset: rpmResult.rpm_pair_offset,
    rpm_max: rpmMax,
    rpm_raw_max: rpmResult.rpm_raw_max || rpmResult.max || 1
  };
}

module.exports = {
  hexId,
  normalizeFrames,
  analyzeGear,
  analyzeRpm,
  buildRuntimeConfig
};
