/**
 * CAN 帧可读格式（十进制）：ID:544 | 8 144 2 16 0 40 8 0
 */

function byteDec(b) {
  return String(Number(b) & 0xff);
}

function formatFrameLine(frame) {
  const id = Number(frame.id);
  if (!Number.isFinite(id)) return '';
  const raw = frame.data || frame.d || [];
  const bytes = [];
  for (let i = 0; i < 8; i++) bytes.push(raw[i] != null ? raw[i] : 0);
  return `ID:${id} | ${bytes.map(byteDec).join(' ')}`;
}

function formatFramesText(frames, maxLines) {
  const list = frames || [];
  const limit = maxLines == null ? list.length : Math.min(list.length, maxLines);
  const lines = [];
  for (let i = 0; i < limit; i++) {
    const line = formatFrameLine(list[i]);
    if (line) lines.push(line);
  }
  let text = lines.join('\n');
  if (maxLines != null && list.length > maxLines) {
    text += `\n… 共 ${list.length} 帧，已显示前 ${maxLines} 行`;
  }
  return text;
}

function formatPayloadFrames(payload) {
  if (!payload) return '';
  const frames = payload.frames || [];
  return formatFramesText(frames, 500);
}

function normalizeFrameBytes(frame) {
  const raw = frame.data || frame.d || [];
  const bytes = [];
  for (let i = 0; i < 8; i++) {
    bytes.push(Number(raw[i] != null ? raw[i] : 0) & 0xff);
  }
  return bytes;
}

/** OBD 诊断应答 ID（不是车身挡位/转速广播） */
function isObdDiagnosticFrameId(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return false;
  if (n === 0x7df) return true;
  if (n >= 0x7e0 && n <= 0x7ef) return true;
  if (n >= 0x18da0000 && n <= 0x18dbffff) return true;
  return false;
}

/** 录入/分析用：去掉 OBD 应答与完全重复的连续帧 */
function filterFramesForLearning(frames) {
  const list = frames || [];
  const out = [];
  let lastKey = '';
  list.forEach((f) => {
    const id = Number(f.id);
    if (!Number.isFinite(id) || isObdDiagnosticFrameId(id)) return;
    const bytes = normalizeFrameBytes(f);
    const key = `${id}|${bytes.join(',')}`;
    if (key === lastKey) return;
    lastKey = key;
    out.push(f);
  });
  return out;
}

function frameBytesKey(frame) {
  const id = Number(frame.id);
  return `${id}|${normalizeFrameBytes(frame).join(',')}`;
}

/**
 * 按 CAN ID 分组，返回 8 格填空结构（不变=有值可复制，变化=空）
 */
function analyzeFramesStable(frames) {
  const groups = {};
  (frames || []).forEach((f) => {
    const id = Number(f.id);
    if (!Number.isFinite(id)) return;
    if (!groups[id]) groups[id] = [];
    groups[id].push(normalizeFrameBytes(f));
  });

  const idList = Object.keys(groups).map(Number).sort((a, b) => a - b);
  if (!idList.length) {
    return { rows: [], idCount: 0 };
  }

  const rows = idList.map((id) => {
    const list = groups[id];
    const slots = [];
    for (let off = 0; off < 8; off++) {
      const vals = list.map((r) => r[off]);
      const first = vals[0];
      const stable = vals.every((v) => v === first);
      slots.push({
        offset: off,
        stable,
        val: stable ? byteDec(first) : ''
      });
    }
    return {
      idDec: id,
      frameCount: list.length,
      slots
    };
  });

  return { rows, idCount: rows.length };
}

/** N→6 挡采集步（不含 RPM） */
const GEAR_CROSS_STEP_DEFS = [
  { key: 'N_first', gear: 'N' },
  { key: '1', gear: '1' },
  { key: 'N_verify', gear: 'N' },
  { key: '2', gear: '2' },
  { key: '3', gear: '3' },
  { key: '4', gear: '4' },
  { key: '5', gear: '5' },
  { key: '6', gear: '6' }
];

const GEAR_LABEL_ORDER = ['N', '1', '2', '3', '4', '5', '6'];

function resolveGearValueFromSteps(steps, gear, rawByStepKey) {
  const gearSteps = steps.filter((s) => s.gear === gear);
  if (!gearSteps.length) {
    return { gear, val: '', missing: true, conflict: false, inferred: false };
  }

  const entries = gearSteps
    .map((s) => rawByStepKey[s.gearKey])
    .filter((e) => e != null);
  if (!entries.length) {
    return { gear, val: '', missing: true, conflict: false, inferred: false };
  }
  if (entries.some((e) => e === 'CONFLICT')) {
    return { gear, val: '', missing: false, conflict: true, inferred: false };
  }

  const uniq = [...new Set(entries)];
  if (uniq.length > 1) {
    if (gear === 'N') {
      const primary = rawByStepKey.N_first;
      if (primary != null && primary !== 'CONFLICT') {
        return { gear, val: byteDec(primary), missing: false, conflict: false, inferred: false };
      }
    }
    return {
      gear,
      val: uniq.map(byteDec).join('/'),
      missing: false,
      conflict: true,
      inferred: false
    };
  }

  return { gear, val: byteDec(uniq[0]), missing: false, conflict: false, inferred: false };
}

function pickDominantStep(nums, maxStep = 3) {
  const votes = {};
  const n = nums.length;
  for (let i = 0; i < n; i++) {
    if (nums[i] == null) continue;
    for (let j = i + 1; j < n; j++) {
      if (nums[j] == null) continue;
      const dI = j - i;
      const dV = nums[j] - nums[i];
      if (dI > 0 && dV > 0 && dV % dI === 0) {
        const step = dV / dI;
        if (step >= 1 && step <= maxStep) {
          votes[step] = (votes[step] || 0) + 1;
        }
      }
    }
  }
  let bestStep = 1;
  let bestVotes = 0;
  Object.keys(votes).forEach((k) => {
    if (votes[k] > bestVotes) {
      bestVotes = votes[k];
      bestStep = Number(k);
    }
  });
  return { step: bestStep, votes: bestVotes };
}

/**
 * 对 N~6 挡已知值做顺序补猜（如 8,9,10,?,12,13,? → ~11,~14）
 * 支持中间缺失与末尾外推，步长默认 +1
 */
function inferSequentialGearValues(valuesByGear) {
  const list = (valuesByGear || []).map((g) => ({
    gear: g.gear,
    val: g.val,
    missing: !!g.missing,
    conflict: !!g.conflict,
    inferred: !!g.inferred
  }));
  const n = list.length;
  const nums = list.map((g) => {
    if (g.missing || g.conflict || !g.val) return null;
    const v = Number(g.val);
    return Number.isFinite(v) ? v : null;
  });

  const knownCount = nums.filter((v) => v != null).length;
  if (knownCount < 2) {
    return { ok: false, valuesByGear: list, inferredCount: 0, step: 1 };
  }

  /* 仅学到 N+1 两挡时也可外推（常见 0,1,2…） */
  if (knownCount >= 2 && nums[0] != null && nums[1] != null) {
    const step2 = nums[1] - nums[0];
    if (step2 !== 0) {
      let inferredCount = 0;
      for (let i = 0; i < n; i++) {
        if (nums[i] != null || list[i].conflict) continue;
        const predicted = nums[0] + i * step2;
        if (predicted < 0 || predicted > 255) continue;
        list[i] = {
          gear: list[i].gear,
          val: byteDec(predicted),
          missing: false,
          conflict: false,
          inferred: true
        };
        nums[i] = predicted;
        inferredCount++;
      }
      if (inferredCount) {
        return { ok: true, valuesByGear: list, inferredCount, step: step2 };
      }
    }
  }

  if (knownCount < 3) {
    return { ok: false, valuesByGear: list, inferredCount: 0, step: 1 };
  }

  const { step, votes } = pickDominantStep(nums);
  if (votes < 1 && knownCount < 4) {
    return { ok: false, valuesByGear: list, inferredCount: 0, step };
  }

  const firstKnown = nums.findIndex((v) => v != null);
  let inferredCount = 0;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      if (nums[i] != null || list[i].conflict) continue;

      let left = null;
      let right = null;
      for (let j = i - 1; j >= 0; j--) {
        if (nums[j] != null) { left = { idx: j, v: nums[j] }; break; }
      }
      for (let j = i + 1; j < n; j++) {
        if (nums[j] != null) { right = { idx: j, v: nums[j] }; break; }
      }

      let predicted = null;
      if (left && right) {
        const dI = right.idx - left.idx;
        const dV = right.v - left.v;
        if (dI > 0 && dV === dI * step) {
          predicted = left.v + (i - left.idx) * step;
        }
      } else if (left) {
        predicted = left.v + (i - left.idx) * step;
      } else if (right) {
        predicted = right.v - (right.idx - i) * step;
      }

      if (predicted == null || predicted < 0 || predicted > 255) continue;

      if (firstKnown >= 0) {
        const onLine = nums[firstKnown] + (i - firstKnown) * step;
        if (onLine !== predicted) continue;
      }

      list[i] = {
        gear: list[i].gear,
        val: byteDec(predicted),
        missing: false,
        conflict: false,
        inferred: true
      };
      nums[i] = predicted;
      inferredCount++;
    }
  }

  if (!inferredCount) {
    return { ok: false, valuesByGear: valuesByGear || list, inferredCount: 0, step };
  }
  return { ok: true, valuesByGear: list, inferredCount, step };
}

function formatGearSequenceText(valuesByGear) {
  return (valuesByGear || []).map((g) => {
    if (g.conflict) return '!';
    if (g.missing || !g.val) return '?';
    return (g.inferred ? '~' : '') + g.val;
  }).join('→');
}

function rankGearCandidate(c) {
  if (!c) return 0;
  let rank = 0;
  rank += (c.completeCount || 0) * 1000;
  rank += (c.inferredCount || 0) * 80;
  if (c.qualified) rank += 600;
  if (c.inferenceApplied) rank += 300;
  rank += (c.uniqueCount || 0) * 25;
  rank += c.score || 0;
  return rank;
}

function compareGearCandidates(a, b) {
  return rankGearCandidate(b) - rankGearCandidate(a);
}

function buildStableByteMap(frames) {
  const { rows } = analyzeFramesStable(frames);
  const map = {};
  rows.forEach((row) => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const slot = row.slots[i];
      arr[i] = slot.stable ? Number(slot.val) : null;
    }
    map[row.idDec] = arr;
  });
  return map;
}

function enhanceCandidateWithInference(c) {
  if (!c) return c;
  const inf = inferSequentialGearValues(c.valuesByGear);
  const valuesByGear = inf.ok ? inf.valuesByGear : (c.valuesByGear || []);
  const okGears = valuesByGear.filter((g) => !g.missing && !g.conflict && g.val);
  const uniqueVals = new Set(okGears.map((g) => g.val));
  let score = c.score;
  if (inf.ok) {
    score += inf.inferredCount * 15 + okGears.length * 6;
    if (okGears.length >= 7) score += 40;
    else if (okGears.length >= 5) score += 25;
  }

  const qualified = okGears.length === 7
    && uniqueVals.size >= 6
    && !valuesByGear.some((g) => g.conflict);
  const inferenceQualified = !qualified
    && inf.ok
    && okGears.length >= 5
    && inf.inferredCount > 0;

  const issues = [];
  if (inf.ok && inf.inferredCount) {
    const inferredGears = valuesByGear.filter((g) => g.inferred).map((g) => g.gear);
    issues.push(`已补猜 ${inferredGears.join('/')}`);
  } else {
    const missing = valuesByGear.filter((g) => g.missing).map((g) => g.gear);
    const conflict = valuesByGear.filter((g) => g.conflict).map((g) => g.gear);
    if (missing.length) issues.push(`缺失 ${missing.join('/')}`);
    if (conflict.length) issues.push(`冲突 ${conflict.join('/')}`);
  }

  return {
    ...c,
    valuesByGear,
    score,
    uniqueCount: uniqueVals.size,
    completeCount: okGears.length,
    inferredCount: inf.inferredCount || 0,
    inferenceApplied: !!(inf.ok && inf.inferredCount),
    qualified,
    inferenceQualified,
    sequenceText: formatGearSequenceText(valuesByGear),
    issues,
    issuesText: issues.join('；')
  };
}

function pickBestGearCandidate(candidates) {
  const list = (candidates || []).slice().sort(compareGearCandidates);
  const qualified = list.find((c) => c.qualified);
  if (qualified) return qualified;
  const inferred = list.find((c) => c.inferenceApplied);
  if (inferred) return inferred;
  return list[0] || null;
}

/**
 * 跨 N~6 挡对比：找出「各挡内不变、挡位间取值不同」的字节候选
 */
function analyzeGearCrossSteps(stepList) {
  const steps = (stepList || []).filter((s) => s.frames && s.frames.length);
  if (steps.length < 2) {
    return { candidates: [], best: null, hint: '至少需要 2 个挡位采集数据' };
  }

  const stableMaps = {};
  steps.forEach((step) => {
    stableMaps[step.gearKey] = buildStableByteMap(step.frames);
  });

  const allIds = new Set();
  Object.values(stableMaps).forEach((m) => {
    Object.keys(m).forEach((id) => allIds.add(Number(id)));
  });

  const candidates = [];
  const stepCount = steps.length;

  allIds.forEach((id) => {
    for (let off = 0; off < 8; off++) {
      const rawByStepKey = {};
      let stableStepCount = 0;

      steps.forEach((step) => {
        const map = stableMaps[step.gearKey];
        if (!map || !map[id]) return;
        const v = map[id][off];
        if (v === null || v === undefined) return;
        stableStepCount++;
        if (!rawByStepKey[step.gearKey]) {
          rawByStepKey[step.gearKey] = v;
        } else if (rawByStepKey[step.gearKey] !== v) {
          rawByStepKey[step.gearKey] = 'CONFLICT';
        }
      });

      if (stableStepCount < Math.max(2, Math.ceil(stepCount * 0.5))) continue;

      const valuesByGear = GEAR_LABEL_ORDER.map((gear) =>
        resolveGearValueFromSteps(steps, gear, rawByStepKey)
      );

      const okGears = valuesByGear.filter((g) => !g.missing && !g.conflict);
      const uniqueVals = new Set(okGears.map((g) => g.val));
      if (uniqueVals.size < 2) continue;

      let score = uniqueVals.size * 12 + okGears.length * 5 + stableStepCount;
      const nEntry = valuesByGear.find((g) => g.gear === 'N');
      if (nEntry && !nEntry.missing && !nEntry.conflict) score += 15;
      if (okGears.length >= 7) score += 40;
      else if (okGears.length >= 5) score += 25;
      else if (okGears.length >= 4) score += 15;
      if (uniqueVals.size >= 6) score += 25;
      if (uniqueVals.size >= 7) score += 10;
      valuesByGear.forEach((g) => {
        if (g.conflict) score -= 40;
        if (g.missing) score -= 5;
      });

      candidates.push({
        idDec: id,
        offset: off,
        score,
        uniqueCount: uniqueVals.size,
        stableStepCount,
        completeCount: okGears.length,
        valuesByGear
      });
    }
  });

  function getCandidateIssues(c) {
    if (!c || !c.valuesByGear) return [];
    const issues = [];
    const missing = c.valuesByGear.filter((g) => g.missing).map((g) => g.gear);
    const conflict = c.valuesByGear.filter((g) => g.conflict).map((g) => g.gear);
    if (missing.length) issues.push(`缺失 ${missing.join('/')}`);
    if (conflict.length) issues.push(`冲突 ${conflict.join('/')}`);
    if (c.uniqueCount < 6) issues.push(`仅 ${c.uniqueCount} 种取值`);
    return issues;
  }

  function buildFailureHint(top, steps) {
    if (!top) {
      const keys = (steps || []).map((s) => s.gearKey).join('、');
      return keys
        ? `未找到跨挡位变化的固定字段（已加载：${keys}）`
        : '未找到跨挡位变化的固定字段';
    }
    const issues = getCandidateIssues(top);
    const base = `最接近 ID ${top.idDec} 字节 ${top.offset}，但未达完整标准`;
    return issues.length ? `${base}：${issues.join('；')}` : base;
  }

  candidates.sort((a, b) => b.score - a.score);
  let enhanced = candidates.map(enhanceCandidateWithInference);
  enhanced.sort(compareGearCandidates);
  enhanced = enhanced.map((c, idx) => ({ ...c, rank: idx + 1 }));

  const qualified = enhanced.filter((c) => c.qualified);
  const best = qualified[0] || null;
  const bestForUse = pickBestGearCandidate(enhanced);
  const displayList = enhanced.slice(0, 8);

  let hint;
  if (best) {
    hint = `最可能挡位字段：ID ${best.idDec} 字节 ${best.offset}（${best.uniqueCount} 种取值）`;
  } else if (bestForUse && bestForUse.inferenceApplied) {
    hint = `挡位字段：ID ${bestForUse.idDec} 字节 ${bestForUse.offset}（${bestForUse.sequenceText}，含补猜）`;
  } else if (bestForUse) {
    hint = `最接近：ID ${bestForUse.idDec} 字节 ${bestForUse.offset}（${bestForUse.sequenceText || ''}）`;
  } else {
    hint = buildFailureHint(displayList[0] || null, steps);
  }

  return {
    candidates: displayList,
    best,
    bestForUse,
    hasPartialOnly: !best && displayList.length > 0,
    stepCount: steps.length,
    hint
  };
}

function gearFormPatchFromCandidate(candidate) {
  if (!candidate) return null;
  const inf = inferSequentialGearValues(candidate.valuesByGear || []);
  const valuesByGear = inf.ok ? inf.valuesByGear : (candidate.valuesByGear || []);
  const patch = {
    gear_id: String(candidate.idDec),
    gear_offset: String(candidate.offset)
  };
  const fieldMap = {
    N: 'gear_neutral',
    1: 'gear_1',
    2: 'gear_2',
    3: 'gear_3',
    4: 'gear_4',
    5: 'gear_5',
    6: 'gear_6'
  };
  valuesByGear.forEach((g) => {
    const field = fieldMap[g.gear];
    if (field && !g.conflict && g.val && !g.missing) {
      patch[field] = g.val;
    }
  });
  return patch;
}

module.exports = {
  byteDec,
  formatFrameLine,
  formatFramesText,
  formatPayloadFrames,
  normalizeFrameBytes,
  isObdDiagnosticFrameId,
  filterFramesForLearning,
  frameBytesKey,
  analyzeFramesStable,
  analyzeGearCrossSteps,
  gearFormPatchFromCandidate,
  inferSequentialGearValues,
  pickBestGearCandidate,
  formatGearSequenceText,
  GEAR_CROSS_STEP_DEFS
};
