/**
 * 定点折叠：纯函数判定（可供小程序与本地脚本共用）
 *
 * 几何含义：以设点为圆心、baseRadius 为半径的圆。
 * 当前距离 ≤ 半径 = 碰到/进入圆周任意一边，一律算进圈。
 */

const GEO_FOLD_MIN_APPROACH_MPS = 0.8;
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
  const accuracyOk = cfg.accuracyLimit <= 0 || accuracy <= cfg.accuracyLimit;
  if (!accuracyOk) {
    return {
      action: 'accuracy_reject',
      hit: false,
      inZone: false,
      distance: state.smoothDist != null ? state.smoothDist : rawDistance,
      rawDistance,
      log: `accuracy ${accuracy}`
    };
  }

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

  if (state.smoothDist == null || !Number.isFinite(state.smoothDist)) {
    state.smoothDist = rawDistance;
  } else {
    state.smoothDist =
      GEO_FOLD_DIST_EMA_ALPHA * rawDistance +
      (1 - GEO_FOLD_DIST_EMA_ALPHA) * state.smoothDist;
  }
  const smoothDist = state.smoothDist;

  // 圆：半径 = baseRadius。碰到圆周任意一边即算进圈（与方位无关）。
  // 平滑距离只用于圈外 ETA，避免毛刺把提前量打乱。
  const radius = Number(cfg.baseRadius) || 50;
  const inZone = rawDistance <= radius + GEO_FOLD_EDGE_EPS_M;

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

  const gpsSpeed = geoFoldGpsSpeedMps(sample);
  const speedMps = gpsSpeed != null ? gpsSpeed : (derivedMps != null ? derivedMps : 0);
  const speedKmh = speedMps * 3.6;

  let approaching = false;
  if (inZone) {
    // 已在圆内（含刚好踩到边上）：任意方向进入都算，不再卡「必须继续靠近圆心」
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

  const leadOk =
    !inZone &&
    cfg.leadSec > 0 &&
    approachStable &&
    etaSec != null &&
    etaSec <= cfg.leadSec;

  const speedOk = cfg.maxSpeedKmh <= 0 || speedKmh <= cfg.maxSpeedKmh;
  // 进圈：碰到边就算，不受「仅靠近」限制；圈外提前量仍要靠近
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
    radius,
    etaSec,
    hits: state.hits,
    fired,
    speedKmh
  };
}

function createGeoFoldState() {
  return {
    hits: 0,
    prevDistance: null,
    prevSample: null,
    smoothDist: null,
    approachStreak: 0
  };
}

module.exports = {
  GEO_FOLD_MIN_APPROACH_MPS,
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
  createGeoFoldState
};
