/**
 * 官方电子眼点位（定点折叠用）
 * 数据：COS 全量 JSON，本地缓存；按距离裁剪后上图/参与触发
 * 点格式：[id, lng, lat, typeId]
 */

const MANIFEST_URL =
  'https://mt-1392958388.cos.accelerate.myqcloud.com/geo-cameras/v1/official-cameras-manifest.json';
const DEFAULT_DATA_URL =
  'https://mt-1392958388.cos.accelerate.myqcloud.com/geo-cameras/v1/official-cameras-v1.json';
const DEFAULT_REMARKS_URL =
  'https://mt-1392958388.cos.accelerate.myqcloud.com/geo-cameras/v1/official-cameras-remarks-v1.json';

const STORAGE_META_KEY = 'mt_official_cam_meta_v1';
const FS_FILE = 'official-cameras-v1.json';
const FS_REMARKS = 'official-cameras-remarks-v1.json';

/** typeId → 短标签（地图气泡） */
const TYPE_SHORT = {
  1: '限行',
  2: '应急道',
  3: '非机动车道',
  4: '闯红灯',
  5: '超速',
  6: '公交车道',
  7: '压线',
  8: '逆行',
  9: '尾号限行',
  10: '头盔',
  11: '噪音',
  12: '现场罚单',
  13: '压线',
  14: '用灯',
  15: '靠右',
  16: '无人机'
};

/** typeId → 颜色分级：现场罚单橙 / 重点红 / 次要浅红（白底红图标定位针） */
const TYPE_TIER = {
  12: 'yellow',
  1: 'red',
  4: 'red',
  5: 'red',
  8: 'red',
  9: 'red',
  10: 'red',
  16: 'red'
};

const TIER_BG = {
  yellow: '#FF9500',
  red: '#FF3B30',
  light: '#FF8A80'
};

/** typeId → 专用图标（其余按分级用通用红/浅红圆点） */
const TYPE_ICON = {
  1: '/images/gf-cam/gf-cam-ban.png',
  4: '/images/gf-cam/gf-cam-light.png',
  5: '/images/gf-cam/gf-cam-speed.png',
  8: '/images/gf-cam/gf-cam-reverse.png',
  9: '/images/gf-cam/gf-cam-red.png',
  10: '/images/gf-cam/gf-cam-helmet.png',
  12: '/images/gf-cam/gf-cam-ticket.png',
  16: '/images/gf-cam/gf-cam-drone.png'
};

const ICON_RED = '/images/gf-cam/gf-cam-red.png';
const ICON_LITE = '/images/gf-cam/gf-cam-lite.png';

/** 避让面板可选类型（defaultOn = 重点默认勾选） */
const AVOID_TYPE_OPTIONS = [
  { id: 1, short: '限行', icon: '/images/gf-cam/gf-cam-ban.png', defaultOn: true },
  { id: 10, short: '头盔', icon: '/images/gf-cam/gf-cam-helmet.png', defaultOn: true },
  { id: 16, short: '无人机', icon: '/images/gf-cam/gf-cam-drone.png', defaultOn: true },
  { id: 12, short: '罚单', icon: '/images/gf-cam/gf-cam-ticket.png', defaultOn: true },
  { id: 4, short: '红灯', icon: '/images/gf-cam/gf-cam-light.png', defaultOn: true },
  { id: 5, short: '超速', icon: '/images/gf-cam/gf-cam-speed.png', defaultOn: true },
  { id: 8, short: '逆行', icon: '/images/gf-cam/gf-cam-reverse.png', defaultOn: true },
  { id: 9, short: '尾号', icon: '/images/gf-cam/gf-cam-red.png', defaultOn: true },
  { id: 2, short: '应急道', icon: ICON_LITE, defaultOn: false },
  { id: 3, short: '非机道', icon: ICON_LITE, defaultOn: false },
  { id: 6, short: '公交道', icon: ICON_LITE, defaultOn: false },
  { id: 7, short: '压线', icon: ICON_LITE, defaultOn: false },
  { id: 11, short: '噪音', icon: ICON_LITE, defaultOn: false },
  { id: 13, short: '压线', icon: ICON_LITE, defaultOn: false },
  { id: 14, short: '用灯', icon: ICON_LITE, defaultOn: false },
  { id: 15, short: '靠右', icon: ICON_LITE, defaultOn: false }
];

const DEFAULT_AVOID_TYPE_IDS = AVOID_TYPE_OPTIONS.filter((t) => t.defaultOn).map((t) => t.id);
const AVOID_BASE_RADIUS_DEFAULT = 40;
const AVOID_BASE_RADIUS_MIN = 25;
const AVOID_BASE_RADIUS_MAX = 80;
const AVOID_RADIUS_HARD_MAX = 90;
const AVOID_CIRCLE_CAP = 24;
/** 地图展示用附近点上限（跟踪判定可另取更多） */
const AVOID_MAP_NEARBY_MAX = 24;

function defaultAvoidTypeIds() {
  return DEFAULT_AVOID_TYPE_IDS.slice();
}

function normalizeAvoidTypeIds(ids) {
  const allowed = {};
  for (let i = 0; i < AVOID_TYPE_OPTIONS.length; i++) {
    allowed[AVOID_TYPE_OPTIONS[i].id] = true;
  }
  const out = [];
  const seen = {};
  const list = Array.isArray(ids) ? ids : defaultAvoidTypeIds();
  for (let i = 0; i < list.length; i++) {
    const id = Number(list[i]);
    if (!allowed[id] || seen[id]) continue;
    seen[id] = true;
    out.push(id);
  }
  return out;
}

function clampAvoidBaseRadius(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return AVOID_BASE_RADIUS_DEFAULT;
  return Math.max(AVOID_BASE_RADIUS_MIN, Math.min(AVOID_BASE_RADIUS_MAX, Math.round(n)));
}

/**
 * 近距自动加大：邻居越多 / 最近邻越近 → 半径越大，硬顶 90m
 * @returns {number[]} 与 points 等长的半径数组（米）
 */
function computeAvoidRadii(points, baseRadius) {
  const base = clampAvoidBaseRadius(baseRadius);
  const list = Array.isArray(points) ? points : [];
  const n = list.length;
  const radii = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = list[i];
    if (!a || !Number.isFinite(Number(a.lat)) || !Number.isFinite(Number(a.lng))) {
      radii[i] = base;
      continue;
    }
    const lat1 = Number(a.lat);
    const lng1 = Number(a.lng);
    let neighbors = 0;
    let nearest = Infinity;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = list[j];
      if (!b || !Number.isFinite(Number(b.lat)) || !Number.isFinite(Number(b.lng))) continue;
      const d = haversineM(lat1, lng1, Number(b.lat), Number(b.lng));
      if (d < 80) neighbors += 1;
      if (d < nearest) nearest = d;
    }
    let r = base + neighbors * 6;
    if (Number.isFinite(nearest) && nearest < 60) {
      r = Math.max(r, base + (60 - nearest) * 0.5);
    }
    radii[i] = Math.max(25, Math.min(AVOID_RADIUS_HARD_MAX, Math.round(r)));
  }
  return radii;
}

function filterByAvoidTypes(nearbyList, typeIds) {
  const set = {};
  const ids = normalizeAvoidTypeIds(typeIds);
  for (let i = 0; i < ids.length; i++) set[ids[i]] = true;
  if (!ids.length) return [];
  const list = nearbyList || [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (!c) continue;
    const tid = Number(c.tid != null ? c.tid : c.typeId) || 0;
    if (set[tid]) out.push(c);
  }
  return out;
}

/** 米偏移 → 经纬度（近似） */
function offsetLatLng(lat, lng, eastM, northM) {
  const dLat = northM / 111320;
  const cosLat = Math.cos((lat * Math.PI) / 180) || 0.01;
  const dLng = eastM / (111320 * Math.abs(cosLat));
  return { latitude: lat + dLat, longitude: lng + dLng };
}

function _ufFind(parent, i) {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}

function _ufUnion(parent, a, b) {
  const ra = _ufFind(parent, a);
  const rb = _ufFind(parent, b);
  if (ra !== rb) parent[rb] = ra;
}

/**
 * 重叠圆并集外轮廓 → 微信 map polygons
 * 内部交叉线不画，只留连通块外圈
 * disks: [{ lat, lng, radius }]
 */
function buildAvoidUnionPolygons(disks, style) {
  const strokeColor = (style && style.strokeColor) || '#FFCC00CC';
  const fillColor = (style && style.fillColor) || '#FF3B3028';
  const strokeWidth = (style && style.strokeWidth) != null ? style.strokeWidth : 2;
  const list = [];
  const src = Array.isArray(disks) ? disks : [];
  for (let i = 0; i < src.length; i++) {
    const d = src[i];
    if (!d) continue;
    const lat = Number(d.lat);
    const lng = Number(d.lng);
    const r = Number(d.radius);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(r) || r <= 0) continue;
    list.push({ lat, lng, r });
  }
  const n = list.length;
  if (!n) return [];

  const parent = new Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = haversineM(list[i].lat, list[i].lng, list[j].lat, list[j].lng);
      if (dist <= list[i].r + list[j].r - 0.5) {
        _ufUnion(parent, i, j);
      }
    }
  }
  const groups = {};
  for (let i = 0; i < n; i++) {
    const root = _ufFind(parent, i);
    if (!groups[root]) groups[root] = [];
    groups[root].push(i);
  }

  const polygons = [];
  const roots = Object.keys(groups);
  for (let g = 0; g < roots.length; g++) {
    const idxs = groups[roots[g]];
    const points = _circleGroupOutline(list, idxs);
    if (!points || points.length < 3) continue;
    polygons.push({
      points,
      strokeWidth,
      strokeColor,
      fillColor,
      zIndex: 1
    });
  }
  return polygons;
}

/** 局部平面坐标（米），以 ref 为原点 */
function _toLocalXY(refLat, refLng, lat, lng) {
  const cosLat = Math.cos((refLat * Math.PI) / 180) || 0.01;
  return {
    x: ((lng - refLng) * Math.PI) / 180 * 6371000 * cosLat,
    y: ((lat - refLat) * Math.PI) / 180 * 6371000
  };
}

function _fromLocalXY(refLat, refLng, x, y) {
  const cosLat = Math.cos((refLat * Math.PI) / 180) || 0.01;
  return {
    latitude: refLat + (y / 6371000) * (180 / Math.PI),
    longitude: refLng + (x / (6371000 * cosLat)) * (180 / Math.PI)
  };
}

function _normAngle(a) {
  let x = a;
  while (x < 0) x += Math.PI * 2;
  while (x >= Math.PI * 2) x -= Math.PI * 2;
  return x;
}

/**
 * 连通圆组外轮廓：交点切弧，只保留外侧弧并首尾相接
 */
function _circleGroupOutline(list, idxs) {
  if (!idxs || !idxs.length) return null;
  if (idxs.length === 1) {
    return _sampleFullCircle(list[idxs[0]], 8);
  }

  const refLat = list[idxs[0]].lat;
  const refLng = list[idxs[0]].lng;
  const disks = idxs.map((i) => {
    const d = list[i];
    const p = _toLocalXY(refLat, refLng, d.lat, d.lng);
    return { i, cx: p.x, cy: p.y, r: d.r };
  });
  const m = disks.length;
  const eps = 0.8;

  // 每圆收集切割角（交点）
  const cuts = disks.map(() => [0]);
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const A = disks[a];
      const B = disks[b];
      const dx = B.cx - A.cx;
      const dy = B.cy - A.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1e-3 || dist >= A.r + B.r - 0.2 || dist <= Math.abs(A.r - B.r) + 0.2) continue;
      const ang = Math.atan2(dy, dx);
      const cosA = (A.r * A.r + dist * dist - B.r * B.r) / (2 * A.r * dist);
      const cosB = (B.r * B.r + dist * dist - A.r * A.r) / (2 * B.r * dist);
      const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
      const beta = Math.acos(Math.max(-1, Math.min(1, cosB)));
      cuts[a].push(_normAngle(ang - alpha), _normAngle(ang + alpha));
      cuts[b].push(_normAngle(ang + Math.PI - beta), _normAngle(ang + Math.PI + beta));
    }
  }

  // 外侧弧段
  const arcs = [];
  for (let a = 0; a < m; a++) {
    const angles = cuts[a].slice().sort((u, v) => u - v);
    // 去重
    const uniq = [];
    for (let k = 0; k < angles.length; k++) {
      if (!uniq.length || Math.abs(angles[k] - uniq[uniq.length - 1]) > 1e-4) uniq.push(angles[k]);
    }
    if (uniq.length === 1) {
      // 无交点：整圆若不被包含则保留
      let covered = false;
      for (let b = 0; b < m; b++) {
        if (b === a) continue;
        const d = Math.sqrt(
          (disks[a].cx - disks[b].cx) ** 2 + (disks[a].cy - disks[b].cy) ** 2
        );
        if (d + disks[a].r <= disks[b].r + eps) {
          covered = true;
          break;
        }
      }
      if (!covered) {
        arcs.push({ disk: a, a0: 0, a1: Math.PI * 2 });
      }
      continue;
    }
    for (let k = 0; k < uniq.length; k++) {
      const a0 = uniq[k];
      const a1 = k + 1 < uniq.length ? uniq[k + 1] : uniq[0] + Math.PI * 2;
      let mid = (a0 + a1) / 2;
      if (mid >= Math.PI * 2) mid -= Math.PI * 2;
      const mx = disks[a].cx + disks[a].r * Math.cos(mid);
      const my = disks[a].cy + disks[a].r * Math.sin(mid);
      let inside = false;
      for (let b = 0; b < m; b++) {
        if (b === a) continue;
        const d = Math.sqrt((mx - disks[b].cx) ** 2 + (my - disks[b].cy) ** 2);
        if (d < disks[b].r - eps) {
          inside = true;
          break;
        }
      }
      if (!inside) {
        arcs.push({ disk: a, a0, a1 });
      }
    }
  }

  if (!arcs.length) {
    return _sampleFullCircle(list[idxs[0]], 8);
  }

  // 采样所有外侧弧，再按质心极角排序（交点切弧已去掉内部，排序只负责成环）
  let cx = 0;
  let cy = 0;
  for (let a = 0; a < m; a++) {
    cx += disks[a].cx;
    cy += disks[a].cy;
  }
  cx /= m;
  cy /= m;

  const samples = [];
  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i];
    const d = disks[arc.disk];
    const span = arc.a1 - arc.a0;
    const steps = Math.max(3, Math.ceil((span / (Math.PI * 2)) * 28));
    for (let s = 0; s <= steps; s++) {
      const t = arc.a0 + (span * s) / steps;
      const ang = t >= Math.PI * 2 ? t - Math.PI * 2 : t;
      const x = d.cx + d.r * Math.cos(ang);
      const y = d.cy + d.r * Math.sin(ang);
      samples.push({
        x,
        y,
        bearing: Math.atan2(y - cy, x - cx)
      });
    }
  }
  samples.sort((u, v) => u.bearing - v.bearing);

  const out = [];
  const minGap = 3.5;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!out.length) {
      out.push(s);
      continue;
    }
    const p = out[out.length - 1];
    const dist = Math.sqrt((s.x - p.x) ** 2 + (s.y - p.y) ** 2);
    if (dist >= minGap) out.push(s);
  }
  if (out.length >= 3) {
    const f = out[0];
    const l = out[out.length - 1];
    if (Math.sqrt((f.x - l.x) ** 2 + (f.y - l.y) ** 2) < minGap) out.pop();
  }
  if (out.length < 3) return _sampleFullCircle(list[idxs[0]], 8);
  return out.map((p) => _fromLocalXY(refLat, refLng, p.x, p.y));
}

function _sampleFullCircle(disk, stepDeg) {
  const step = ((stepDeg || 8) * Math.PI) / 180;
  const pts = [];
  for (let ang = 0; ang < Math.PI * 2 - 1e-9; ang += step) {
    const north = disk.r * Math.cos(ang);
    const east = disk.r * Math.sin(ang);
    pts.push(offsetLatLng(disk.lat, disk.lng, east, north));
  }
  return pts;
}

const DEFAULT_TYPES = {
  1: '闯限行',
  2: '占用应急车道',
  3: '占用非机动车道',
  4: '闯红灯',
  5: '超速',
  6: '占用公交车道',
  7: '压线',
  8: '逆行',
  9: '尾号限行',
  10: '未戴头盔',
  11: '噪音抓拍',
  12: '现场罚单',
  13: '压线',
  14: '违规用灯',
  15: '未靠右行驶',
  16: '无人机抓拍'
};

let _cache = null;
let _remarks = null;
let _loadPromise = null;
let _seedLocal = null;

/** 分包内可注入本地 JSON 兜底（COS 未上传时） */
function seedLocalPayload(raw) {
  try {
    _seedLocal = parsePayload(raw);
  } catch (e) {
    _seedLocal = null;
  }
}

function typeName(tid, types) {
  const t = Number(tid) || 0;
  const map = types || (_cache && _cache.types) || DEFAULT_TYPES;
  return map[t] || map[String(t)] || DEFAULT_TYPES[t] || '电子眼';
}

function typeShort(tid) {
  const t = Number(tid) || 0;
  return TYPE_SHORT[t] || typeName(t).slice(0, 4);
}

function typeTier(tid) {
  const t = Number(tid) || 0;
  return TYPE_TIER[t] || 'light';
}

function typeBg(tid) {
  return TIER_BG[typeTier(tid)] || TIER_BG.light;
}

function typeIcon(tid) {
  const t = Number(tid) || 0;
  if (TYPE_ICON[t]) return TYPE_ICON[t];
  return typeTier(t) === 'light' ? ICON_LITE : ICON_RED;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function parsePayload(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || !Array.isArray(data.points)) throw new Error('invalid cameras json');
  const types = data.types || DEFAULT_TYPES;
  const points = [];
  for (let i = 0; i < data.points.length; i++) {
    const row = data.points[i];
    if (!row || row.length < 4) continue;
    const id = row[0];
    const lng = Number(row[1]);
    const lat = Number(row[2]);
    const tid = Number(row[3]) || 12;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    points.push({ id: String(id), lng, lat, tid });
  }
  return { v: Number(data.v) || 1, types, points, count: points.length };
}

function fsPath(name) {
  try {
    const base = (wx.env && wx.env.USER_DATA_PATH) || '';
    return base ? `${base}/${name}` : '';
  } catch (e) {
    return '';
  }
}

function readFs(name) {
  const path = fsPath(name);
  if (!path) return null;
  try {
    return wx.getFileSystemManager().readFileSync(path, 'utf8');
  } catch (e) {
    return null;
  }
}

function writeFs(name, text) {
  const path = fsPath(name);
  if (!path) return false;
  try {
    wx.getFileSystemManager().writeFileSync(path, text, 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 60000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const d = res.data;
          if (typeof d === 'string') resolve(d);
          else resolve(JSON.stringify(d));
        } else reject(new Error('http ' + res.statusCode));
      },
      fail: reject
    });
  });
}

/**
 * 确保全量点位在内存（先本地缓存，再 COS）
 */
function ensureOfficialCameras(opt) {
  if (_cache && _cache.points && _cache.points.length) {
    return Promise.resolve(_cache);
  }
  if (_loadPromise) return _loadPromise;
  const force = !!(opt && opt.force);

  _loadPromise = Promise.resolve()
    .then(() => {
      if (!force) {
        const cached = readFs(FS_FILE);
        if (cached) {
          try {
            _cache = parsePayload(cached);
            return _cache;
          } catch (e) {
            /* fallthrough */
          }
        }
      }
      return null;
    })
    .then((hit) => {
      if (hit) return hit;
      return requestText(MANIFEST_URL)
        .then((manText) => {
          let man = {};
          try {
            man = JSON.parse(manText);
          } catch (e) {
            man = {};
          }
          const meta = wx.getStorageSync(STORAGE_META_KEY) || {};
          const url = man.url || DEFAULT_DATA_URL;
          if (!force && meta.sha1 && man.sha1 && meta.sha1 === man.sha1) {
            const cached = readFs(FS_FILE);
            if (cached) {
              _cache = parsePayload(cached);
              return _cache;
            }
          }
          return requestText(url).then((body) => {
            writeFs(FS_FILE, body);
            try {
              wx.setStorageSync(STORAGE_META_KEY, {
                sha1: man.sha1 || '',
                count: man.count || 0,
                updatedAt: man.updatedAt || '',
                url
              });
            } catch (e) {
              /* ignore */
            }
            _cache = parsePayload(body);
            const rmUrl = man.remarksUrl || DEFAULT_REMARKS_URL;
            requestText(rmUrl)
              .then((rm) => {
                writeFs(FS_REMARKS, rm);
                try {
                  _remarks = JSON.parse(rm);
                } catch (e2) {
                  _remarks = {};
                }
              })
              .catch(() => {});
            return _cache;
          });
        })
        .catch(() => {
          const cached = readFs(FS_FILE);
          if (cached) {
            _cache = parsePayload(cached);
            return _cache;
          }
          if (_seedLocal && _seedLocal.points && _seedLocal.points.length) {
            _cache = _seedLocal;
            return _cache;
          }
          throw new Error('官方点位加载失败');
        });
    })
    .then((data) => {
      if (!_remarks) {
        const rm = readFs(FS_REMARKS);
        if (rm) {
          try {
            _remarks = JSON.parse(rm);
          } catch (e) {
            _remarks = {};
          }
        }
      }
      return data;
    })
    .finally(() => {
      _loadPromise = null;
    });

  return _loadPromise;
}

/** 附近点：默认 5km，最多 max 个 */
function queryNearbyOfficialCameras(lat, lng, opt) {
  const radiusM = Math.max(200, Number(opt && opt.radiusM) || 5000);
  const max = Math.max(1, Math.min(200, Number(opt && opt.max) || 80));
  return ensureOfficialCameras(opt).then((data) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const dLat = radiusM / 111000;
    const cosLat = Math.cos((lat * Math.PI) / 180) || 0.01;
    const dLng = radiusM / (111000 * Math.abs(cosLat));
    const scored = [];
    const pts = data.points;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (Math.abs(p.lat - lat) > dLat) continue;
      if (Math.abs(p.lng - lng) > dLng) continue;
      const dist = haversineM(lat, lng, p.lat, p.lng);
      if (dist > radiusM) continue;
      scored.push({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        tid: p.tid,
        typeName: typeName(p.tid, data.types),
        typeShort: typeShort(p.tid),
        typeBg: typeBg(p.tid),
        typeTier: typeTier(p.tid),
        typeIcon: typeIcon(p.tid),
        dist,
        remark: (_remarks && _remarks[p.id]) || ''
      });
    }
    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, max);
  });
}

/**
 * 转成定点折叠可判定点
 * cfg.avoidTypeIds / cfg.avoidBaseRadius：仅勾选类型 + 动态半径
 */
function toGeoFoldPoints(nearbyList, cfg) {
  const enterCmd = (cfg && cfg.enterCmd) === '打开' ? '打开' : '关闭';
  const exitCmd = (cfg && cfg.exitCmd) === '打开' ? '打开' : '关闭';
  const typeIds = cfg && cfg.avoidTypeIds != null
    ? normalizeAvoidTypeIds(cfg.avoidTypeIds)
    : defaultAvoidTypeIds();
  const baseRadius = cfg && cfg.avoidBaseRadius != null
    ? clampAvoidBaseRadius(cfg.avoidBaseRadius)
    : Math.max(15, Math.min(150, Number(cfg && cfg.baseRadius) || AVOID_BASE_RADIUS_DEFAULT));
  const filtered = filterByAvoidTypes(nearbyList, typeIds);
  const radii = computeAvoidRadii(filtered, baseRadius);
  const out = [];
  for (let i = 0; i < filtered.length; i++) {
    const c = filtered[i];
    if (!c) continue;
    out.push({
      id: 'cam_' + c.id,
      camId: c.id,
      lat: c.lat,
      lng: c.lng,
      name: c.typeShort || c.typeName || '电子眼',
      radius: radii[i] || baseRadius,
      enterCmd,
      exitCmd,
      official: true,
      typeId: c.tid,
      typeName: c.typeName,
      typeShort: c.typeShort,
      typeBg: c.typeBg,
      typeIcon: c.typeIcon,
      typeTier: c.typeTier,
      remark: c.remark || '',
      dist: c.dist
    });
  }
  return out;
}

function getRemark(id) {
  if (!_remarks) return '';
  return _remarks[String(id)] || '';
}

function getCacheCount() {
  return (_cache && _cache.points && _cache.points.length) || 0;
}

module.exports = {
  ensureOfficialCameras,
  queryNearbyOfficialCameras,
  toGeoFoldPoints,
  computeAvoidRadii,
  filterByAvoidTypes,
  buildAvoidUnionPolygons,
  defaultAvoidTypeIds,
  normalizeAvoidTypeIds,
  clampAvoidBaseRadius,
  typeName,
  typeShort,
  typeBg,
  typeTier,
  typeIcon,
  getRemark,
  getCacheCount,
  seedLocalPayload,
  AVOID_TYPE_OPTIONS,
  DEFAULT_AVOID_TYPE_IDS,
  AVOID_BASE_RADIUS_DEFAULT,
  AVOID_BASE_RADIUS_MIN,
  AVOID_BASE_RADIUS_MAX,
  AVOID_RADIUS_HARD_MAX,
  AVOID_CIRCLE_CAP,
  AVOID_MAP_NEARBY_MAX,
  TYPE_SHORT,
  TYPE_TIER,
  TIER_BG,
  TYPE_ICON,
  MANIFEST_URL,
  DEFAULT_DATA_URL
};
