/**
 * 定点折叠本地仿真：不骑车，用坐标推演验证圆圈判定
 * 运行：node scripts/test-geo-fold.js
 */
const path = require('path');
const logic = require(path.join(__dirname, '../miniprogram/utils/geoFoldLogic.js'));

const {
  geoDistanceMeters,
  geoOffsetMeters,
  geoFoldJudgeStep,
  createGeoFoldState
} = logic;

const CENTER = { lat: 31.2304, lng: 121.4737 }; // 任意圆心
const RADIUS = 51;
let failed = 0;
let passed = 0;

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function cfg(extra) {
  return {
    baseRadius: RADIUS,
    leadSec: 0,
    confirmHits: 2,
    maxSpeedKmh: 0,
    accuracyLimit: 50,
    requireApproaching: true,
    ...extra
  };
}

function sampleAt(distM, bearingDeg, t, extra) {
  const p = geoOffsetMeters(CENTER.lat, CENTER.lng, distM, bearingDeg);
  return {
    latitude: p.lat,
    longitude: p.lng,
    accuracy: 15,
    speed: 5,
    t,
    ...extra
  };
}

console.log('\n=== 1) 几何：半径 51m 圆，任意方位距离应≈设定 ===');
[0, 45, 90, 135, 180, 225, 270, 315].forEach((b) => {
  const p = geoOffsetMeters(CENTER.lat, CENTER.lng, RADIUS, b);
  const d = geoDistanceMeters(CENTER.lat, CENTER.lng, p.lat, p.lng);
  assert(`方位 ${b}° 距离≈51m`, Math.abs(d - RADIUS) < 0.8, `got ${d.toFixed(2)}`);
});

console.log('\n=== 2) 碰到圆周任意一边 = 进圈（八个方向）===');
[0, 45, 90, 135, 180, 225, 270, 315].forEach((b) => {
  const state = createGeoFoldState();
  const c = cfg({ confirmHits: 1, requireApproaching: false });
  // 先在圈外
  geoFoldJudgeStep(state, sampleAt(80, b, 1000), c, CENTER);
  // 踩到边上（51m）
  const r = geoFoldJudgeStep(state, sampleAt(51, b, 3000, { speed: 8 }), c, CENTER);
  assert(`方位 ${b}° 踩 51m 边进圈`, r.inZone === true && r.hit === true, JSON.stringify(r));
});

console.log('\n=== 3) 刚过边内侧 50m 进圈；外侧 52m 不进圈 ===');
{
  const stateIn = createGeoFoldState();
  const stateOut = createGeoFoldState();
  const c = cfg({ confirmHits: 1, requireApproaching: false });
  geoFoldJudgeStep(stateIn, sampleAt(80, 0, 1000), c, CENTER);
  const rin = geoFoldJudgeStep(stateIn, sampleAt(50, 0, 3000), c, CENTER);
  geoFoldJudgeStep(stateOut, sampleAt(80, 0, 1000), c, CENTER);
  const rout = geoFoldJudgeStep(stateOut, sampleAt(52, 0, 3000), c, CENTER);
  assert('50m 在圈内', rin.inZone === true, `raw=${rin.rawDistance}`);
  assert('52m 在圈外', rout.inZone === false, `raw=${rout.rawDistance}`);
}

console.log('\n=== 4) 从东/南/西/北驶入，连续命中后应触发 ===');
[0, 90, 180, 270].forEach((b) => {
  const state = createGeoFoldState();
  const c = cfg({ confirmHits: 2, leadSec: 0 });
  let fired = false;
  const path = [120, 100, 80, 65, 55, 51, 48, 45];
  path.forEach((d, i) => {
    const r = geoFoldJudgeStep(
      state,
      sampleAt(d, b, 1000 + i * 2000, { speed: 10 }),
      c,
      CENTER
    );
    if (r.fired) fired = true;
  });
  assert(`方位 ${b}° 驶入应触发`, fired === true);
});

console.log('\n=== 5) 瞬移脏点不应直接触发 ===');
{
  const state = createGeoFoldState();
  const c = cfg({ confirmHits: 1, requireApproaching: false });
  geoFoldJudgeStep(state, sampleAt(200, 0, 1000), c, CENTER);
  const r = geoFoldJudgeStep(
    state,
    sampleAt(10, 0, 3000, { speed: 0 }), // 2s 内跳 ~190m
    c,
    CENTER
  );
  assert('瞬移被拒绝', r.action === 'teleport_reject' && r.fired !== true, r.action);
}

console.log('\n=== 6) 精度超限样本作废 ===');
{
  const state = createGeoFoldState();
  const c = cfg({ confirmHits: 1, accuracyLimit: 30, requireApproaching: false });
  const r = geoFoldJudgeStep(
    state,
    sampleAt(40, 0, 1000, { accuracy: 80 }),
    c,
    CENTER
  );
  assert('精度超限拒绝', r.action === 'accuracy_reject' && !r.hit);
}

console.log('\n=== 7) 提前量：靠近且 ETA≤lead 可命中（仍在圈外）===');
{
  const state = createGeoFoldState();
  const c = cfg({ confirmHits: 1, leadSec: 5, requireApproaching: true });
  // 约 10m/s 连续靠近；平滑距离会滞后，lead 取 5s 更稳
  let hit = false;
  [120, 100, 90, 80, 70].forEach((d, i) => {
    const r = geoFoldJudgeStep(
      state,
      sampleAt(d, 90, 1000 + i * 2000, { speed: 10 }),
      c,
      CENTER
    );
    if (!r.inZone && r.hit) hit = true;
  });
  assert('圈外提前命中', hit === true);
}

console.log('\n=== 8) 远离穿过不应因「在圈内」以外的趋势误触提前量 ===');
{
  const state = createGeoFoldState();
  const c = cfg({ confirmHits: 1, leadSec: 5, requireApproaching: true });
  geoFoldJudgeStep(state, sampleAt(40, 0, 1000, { speed: 10 }), c, CENTER); // 已在圈内
  const r1 = geoFoldJudgeStep(state, sampleAt(45, 0, 3000, { speed: 10 }), c, CENTER);
  assert('圈内仍算命中', r1.inZone === true && r1.hit === true);
  // 出圈后远离
  geoFoldJudgeStep(state, sampleAt(60, 0, 5000, { speed: 10 }), c, CENTER);
  const r2 = geoFoldJudgeStep(state, sampleAt(80, 0, 7000, { speed: 10 }), c, CENTER);
  assert('出圈远离不提前命中', r2.hit === false && r2.inZone === false, `hit=${r2.hit}`);
}

console.log('\n=== 9) 侧向擦边：从切线方向碰到圆边 ===');
{
  // 圆心在原点概念上：先走在 y=51 的切线外侧，再碰到北边
  const state = createGeoFoldState();
  const c = cfg({ confirmHits: 2, leadSec: 0 });
  let fired = false;
  // 北方 70m → 55m → 51m → 50m
  [70, 60, 55, 51, 50].forEach((d, i) => {
    const r = geoFoldJudgeStep(state, sampleAt(d, 0, 1000 + i * 2000, { speed: 6 }), c, CENTER);
    if (r.fired) fired = true;
  });
  assert('北方擦边触发', fired === true);
}

console.log(`\n======= 结果: ${passed} passed, ${failed} failed =======\n`);
process.exit(failed ? 1 : 0);
