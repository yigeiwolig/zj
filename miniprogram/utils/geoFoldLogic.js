/**
 * 定点折叠：纯函数判定（可供小程序与本地脚本共用）
 *
 * 几何含义：以设点为圆心、baseRadius 为半径的圆。
 * 当前距离 ≤ 半径 = 碰到/进入圆周任意一边，一律算进圈。
 */

const GEO_FOLD_MIN_APPROACH_MPS = 0.8;
/** 提前发令最低接近速度：约 8km/h。慢速掉头只认真实圆边，避免圈边发糊 */
const GEO_FOLD_LEAD_MIN_MPS = 2.2;
const GEO_FOLD_LEAD_REACT_SEC = 2.2;
const GEO_FOLD_LEAD_DIST_MAX = 80;
/** 出圈后需离开圆边这么远，才允许再次按车速提前发令 */
const GEO_FOLD_LEAD_REARM_M = 22;
const GEO_FOLD_TREND_EPS_M = 3;
const GEO_FOLD_DIST_EMA_ALPHA = 0.32;
const GEO_FOLD_APPROACH_STREAK_NEED = 2;
const GEO_FOLD_TELEPORT_MIN_M = 55;
const GEO_FOLD_TELEPORT_MAX_MPS = 48;
/** 踩边容差（米）：距离 ≤ 半径 + 容差 即算进圈，避免浮点刚好卡在边上不算 */
const GEO_FOLD_EDGE_EPS_M = 0.5;

function geoDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function geoFoldGpsSpeedMps(res) {
  const speed = Number(res && res.speed);
  if (!Number.isFinite(speed) || speed < 0) return null;
  return speed;
}

function geoFoldIsTeleport(prevSample, lat, lng, now, accuracy) {
  if (!prevSample || !prevSample.t) return false;
  const dt = (now - prevSample.t) / 1000;
  if (dt <= 0 || dt > 20) return false;
  const moved = geoDistanceMeters(prevSample.lat, prevSample.lng, lat, lng);
  const slack = accuracy + (Number(prevSample.accuracy) || 0) + 25;
  const maxMove = GEO_FOLD_TELEPORT_MAX_MPS * dt + slack;
  return moved > GEO_FOLD_TELEPORT_MIN_M && moved > maxMove;
}

/** 从圆心沿方位角（度）偏移 distanceM 米，得到新经纬度 */
function geoOffsetMeters(lat, lng, distanceM, bearingDeg) {
  const R = 6371000;
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const ang = distanceM / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

// ─── 简化卡尔曼滤波（2D 位置 + 速度） ────────────────────────────────────────
// 状态向量：[lat, lng, vLat, vLng]（速度单位：度/秒）
// 只做位置预测和测量更新，不追求完整矩阵乘法，够用且性能好。

/**
 * 创建卡尔曼状态
 * @param {number} lat  初始纬度
 * @param {number} lng  初始经度
 * @param {number} [accuracy]  初始精度（米），影响初始协方差
 */
function createKalmanState(lat, lng, accuracy) {
  const initVar = Math.pow(Math.max(accuracy || 30, 5), 2);
  return {
    lat,
    lng,
    vLat: 0,      // 度/秒
    vLng: 0,
    // 协方差（对角线简化）
    pLat: initVar,
    pLng: initVar,
    pVLat: 1e-4,
    pVLng: 1e-4,
    lastT: null
  };
}

/**
 * 卡尔曼预测步骤（在两次 GPS 之间用速度外推当前位置）
 * @param {object} k  卡尔曼状态（就地更新）
 * @param {number} now  当前时间戳（ms）
 * @param {number} [processNoise]  过程噪声（越大越信 GPS，越小越信惯性）
 */
function kalmanPredict(k, now, processNoise) {
  if (k.lastT == null) { k.lastT = now; return; }
  const dt = Math.min((now - k.lastT) / 1000, 2); // 最多预测 2 秒
  if (dt <= 0) return;
  const q = processNoise != null ? processNoise : 1.0; // m²/s³ 转度²/s³ 约 8e-12，但我们量级用米不精确，直接给经验值

  // 位置 = 上次位置 + 速度 × dt
  k.lat += k.vLat * dt;
  k.lng += k.vLng * dt;

  // 协方差增长
  const dt2 = dt * dt;
  const dt3 = dt2 * dt;
  k.pLat += k.pVLat * dt2 + q * dt3 / 3;
  k.pLng += k.pVLng * dt2 + q * dt3 / 3;
  k.pVLat += q * dt;
  k.pVLng += q * dt;

  k.lastT = now;
}

/**
 * 卡尔曼更新步骤（收到新 GPS 坐标时融合）
 * @param {object} k  卡尔曼状态（就地更新）
 * @param {number} lat  GPS 纬度
 * @param {number} lng  GPS 经度
 * @param {number} accuracy  GPS 精度（米），越大越不信
 * @param {number} now  时间戳（ms）
 * @param {number|null} gpsSpeedMps  GPS 速度（m/s），null 表示无效
 * @param {number|null} gpsBearing  GPS 方位角（度），null 表示无效
 */
function kalmanUpdate(k, lat, lng, accuracy, now, gpsSpeedMps, gpsBearing) {
  // 精度转换为度²方差（1米 ≈ 9e-12 度²，简化：1m ≈ 1e-5度，1m²≈1e-10度²）
  const R_POS = Math.pow(accuracy * 8.98e-6, 2); // accuracy 米 → 度方差

  // 先预测到当前时刻
  if (k.lastT != null) {
    kalmanPredict(k, now, 0.5);
  } else {
    k.lastT = now;
  }

  // 卡尔曼增益（位置）
  const KLat = k.pLat / (k.pLat + R_POS);
  const KLng = k.pLng / (k.pLng + R_POS);

  // 更新位置
  k.lat = k.lat + KLat * (lat - k.lat);
  k.lng = k.lng + KLng * (lng - k.lng);

  // 更新协方差
  k.pLat = (1 - KLat) * k.pLat;
  k.pLng = (1 - KLng) * k.pLng;

  // 速度：GPS 有效速度 + 方位角 → 分解到 lat/lng 方向
  if (gpsSpeedMps != null && gpsSpeedMps >= 0 && gpsBearing != null) {
    const br = (gpsBearing * Math.PI) / 180;
    // speed m/s → 度/秒（纬度方向 1m ≈ 8.98e-6 度）
    const degPerMeter = 8.98e-6;
    const vLat = gpsSpeedMps * Math.cos(br) * degPerMeter;
    const vLng = gpsSpeedMps * Math.sin(br) * degPerMeter / Math.max(Math.cos(lat * Math.PI / 180), 0.01);
    // EMA 融合 GPS 速度（精度够时权重大）
    const alpha = Math.max(0.3, Math.min(0.9, 1 - accuracy / 80));
    k.vLat = alpha * vLat + (1 - alpha) * k.vLat;
    k.vLng = alpha * vLng + (1 - alpha) * k.vLng;
  }

  k.lastT = now;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 单步判定。state 会被就地更新。
 * @returns {{ action: string, hit: boolean, inZone: boolean, distance: number, rawDistance: number, fired?: boolean, log?: string }}
 */
function geoFoldJudgeStep(state, sample, cfg, point) {
  const lat = Number(sample.latitude);
  const lng = Number(sample.longitude);
  const now = Number(sample.t || sample.timestamp || Date.now());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { action: 'bad_coord', hit: false, inZone: false, distance: state.smoothDist || 0, rawDistance: 0 };
  }

  const rawDistance = geoDistanceMeters(lat, lng, point.lat, point.lng);
  const accuracy = Math.max(0, Number(sample.accuracy) || 0);

  // 精度超限时不再直接丢弃，而是降权融入卡尔曼，只标记 accuracyWeak
  const accuracyWeak = cfg.accuracyLimit > 0 && accuracy > cfg.accuracyLimit;

  if (geoFoldIsTeleport(state.prevSample, lat, lng, now, accuracy)) {
    state.hits = 0;
    state.approachStreak = 0;
    return {
      action: 'teleport_reject',
      hit: false,
      inZone: false,
      distance: state.smoothDist != null ? state.smoothDist : rawDistance,
      rawDistance,
      log: 'teleport'
    };
  }

  // 卡尔曼更新
  const gpsSpeed = geoFoldGpsSpeedMps(sample);
  const gpsBearing = (sample.direction != null && Number.isFinite(Number(sample.direction)))
    ? Number(sample.direction)
    : null;

  if (!state.kalman) {
    state.kalman = createKalmanState(lat, lng, accuracy);
    state.kalman.lastT = now;
  } else {
    // 精度差时增大测量噪声（减小增益），让滤波器更信惯性预测
    const effectiveAcc = accuracyWeak ? accuracy * 2.5 : accuracy;
    kalmanUpdate(state.kalman, lat, lng, effectiveAcc, now, gpsSpeed, gpsBearing);
  }

  const filtLat = state.kalman.lat;
  const filtLng = state.kalman.lng;
  const filtDist = geoDistanceMeters(filtLat, filtLng, point.lat, point.lng);

  // 平滑距离用于 ETA（卡尔曼已是平滑距离，兼容旧逻辑）
  state.smoothDist = filtDist;
  const smoothDist = filtDist;

  const radius = Number(point && point.radius) || Number(cfg.baseRadius) || 50;
  const inZone = filtDist <= radius + GEO_FOLD_EDGE_EPS_M;

  const prevSample = state.prevSample;
  const prevDist = state.prevDistance;
  let derivedMps = null;
  let closingMps = 0;
  if (prevSample && prevSample.t > 0) {
    const dt = (now - prevSample.t) / 1000;
    if (dt >= 0.4 && dt <= 20) {
      const moved = geoDistanceMeters(prevSample.lat, prevSample.lng, lat, lng);
      derivedMps = moved / dt;
      if (prevDist != null) closingMps = (prevDist - smoothDist) / dt;
    }
  }

  const speedMps = gpsSpeed != null ? gpsSpeed : (derivedMps != null ? derivedMps : 0);
  const speedKmh = speedMps * 3.6;

  let approaching = false;
  if (inZone) {
    approaching = true;
  } else if (prevDist == null) {
    approaching = false;
  } else {
    const delta = prevDist - smoothDist;
    if (delta > GEO_FOLD_TREND_EPS_M) approaching = true;
    else if (delta < -GEO_FOLD_TREND_EPS_M) approaching = false;
    else approaching = closingMps >= GEO_FOLD_MIN_APPROACH_MPS;
  }

  state.approachStreak = approaching ? (state.approachStreak || 0) + 1 : 0;
  const approachStable = inZone || state.approachStreak >= GEO_FOLD_APPROACH_STREAK_NEED;

  const remainToCircle = Math.max(0, smoothDist - radius);
  const approachSpeed = Math.max(speedMps, closingMps > 0 ? closingMps : 0);
  let etaSec = null;
  if (!inZone && approachSpeed >= GEO_FOLD_MIN_APPROACH_MPS && approachStable) {
    etaSec = remainToCircle / approachSpeed;
  }

  // 提前发令：只在明确朝圆心收近、且车速够时按 v×反应时间外扩。
  // leadSec 可由用户配置（秒）；再加一个最小提前距离，避免贴边才弹提醒。
  const inbound = closingMps >= GEO_FOLD_MIN_APPROACH_MPS;
  const reactSec = Math.max(
    1.5,
    Math.min(20, Number(cfg && cfg.leadSec) || GEO_FOLD_LEAD_REACT_SEC)
  );
  const minLeadM = Math.max(12, Math.min(60, Number(cfg && cfg.leadMinM) || 28));
  let leadDist = 0;
  if (approachSpeed >= GEO_FOLD_LEAD_MIN_MPS && approachStable && inbound) {
    leadDist = Math.min(
      GEO_FOLD_LEAD_DIST_MAX,
      Math.max(minLeadM, approachSpeed * reactSec)
    );
  } else if (!inZone && approachStable && inbound && approachSpeed >= GEO_FOLD_MIN_APPROACH_MPS) {
    // 慢速也至少给一点提醒窗口（只用于 leadOk；出圈仍不预判）
    leadDist = Math.min(GEO_FOLD_LEAD_DIST_MAX, minLeadM);
  }
  const leadOk = !inZone && leadDist > 0 && remainToCircle <= leadDist;

  const speedOk = cfg.maxSpeedKmh <= 0 || speedKmh <= cfg.maxSpeedKmh;
  const trendOk = inZone || !cfg.requireApproaching || approaching;
  const inRange = inZone || leadOk;
  const hit = speedOk && trendOk && inRange;

  state.hits = hit ? (state.hits || 0) + 1 : 0;
  state.prevDistance = smoothDist;
  state.prevSample = { lat, lng, t: now, accuracy };

  const fired = state.hits >= (cfg.confirmHits || 1);
  return {
    action: fired ? 'fire' : (hit ? 'hit' : 'track'),
    hit,
    inZone,
    leadOk,
    distance: smoothDist,
    rawDistance,
    filtLat,
    filtLng,
    radius,
    remainToCircle,
    leadDist,
    etaSec,
    hits: state.hits,
    fired,
    speedKmh,
    accuracyWeak
  };
}

function createGeoFoldState() {
  return {
    hits: 0,
    prevDistance: null,
    prevSample: null,
    smoothDist: null,
    approachStreak: 0,
    kalman: null
  };
}

module.exports = {
  GEO_FOLD_MIN_APPROACH_MPS,
  GEO_FOLD_LEAD_MIN_MPS,
  GEO_FOLD_LEAD_REACT_SEC,
  GEO_FOLD_LEAD_DIST_MAX,
  GEO_FOLD_LEAD_REARM_M,
  GEO_FOLD_TREND_EPS_M,
  GEO_FOLD_DIST_EMA_ALPHA,
  GEO_FOLD_APPROACH_STREAK_NEED,
  GEO_FOLD_TELEPORT_MIN_M,
  GEO_FOLD_TELEPORT_MAX_MPS,
  GEO_FOLD_EDGE_EPS_M,
  geoDistanceMeters,
  geoFoldGpsSpeedMps,
  geoFoldIsTeleport,
  geoOffsetMeters,
  geoFoldJudgeStep,
  createGeoFoldState,
  createKalmanState,
  kalmanPredict,
  kalmanUpdate
};
