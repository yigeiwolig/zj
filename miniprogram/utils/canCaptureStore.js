/**
 * CAN 采集包 — 写本地 JSON → 上传 COS → 写入云数据库
 */
const { uploadLocalFileToCos } = require('./cosUpload.js');

const CAPTURE_FOLDER = 'can-capture';
const CONFIG_FOLDER = 'can-config';
const SNAPSHOT_LOCAL_KEY = 'can_user_runtime_snapshots_local';
const SNAPSHOT_COLLECTION = 'can_user_runtime_snapshots';

function isDbCollectionMissingError(err) {
  const msg = String((err && (err.errMsg || err.message)) || err || '');
  return msg.indexOf('collection not exists') >= 0
    || msg.indexOf('Db or Table not exist') >= 0
    || msg.indexOf('-502005') >= 0;
}

function loadLocalSnapshotMap() {
  try {
    const raw = wx.getStorageSync(SNAPSHOT_LOCAL_KEY);
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

function saveLocalRuntimeSnapshot(sessionId, runtimeConfig) {
  const map = loadLocalSnapshotMap();
  map[sessionId] = {
    sessionId,
    runtimeConfig,
    gear_id: runtimeConfig.gear_id,
    rpm_id: runtimeConfig.rpm_id,
    input_idle: runtimeConfig.input_idle,
    input_redline: runtimeConfig.input_redline,
    savedAt: new Date().toISOString(),
    local: true
  };
  wx.setStorageSync(SNAPSHOT_LOCAL_KEY, map);
  return map[sessionId];
}

function getLocalRuntimeSnapshot(sessionId) {
  const map = loadLocalSnapshotMap();
  return map[sessionId] || null;
}

function getUserDataPath() {
  try {
    if (wx.env && wx.env.USER_DATA_PATH) return wx.env.USER_DATA_PATH;
  } catch (e) { /* ignore */ }
  return `${wx.env.USER_DATA_PATH || ''}`;
}

function writeJsonTemp(name, obj) {
  const fs = wx.getFileSystemManager();
  const path = `${getUserDataPath()}/${name}`;
  fs.writeFileSync(path, JSON.stringify(obj), 'utf8');
  return path;
}

async function uploadCaptureJson(sessionId, gearKey, payload) {
  const fileName = `${gearKey}.json`;
  const localPath = writeJsonTemp(`can_${sessionId}_${fileName}`, payload);
  const folder = `${CAPTURE_FOLDER}/${sessionId}`;
  const raw = await uploadLocalFileToCos(localPath, {
    folder,
    ext: '.json',
    contentType: 'application/json'
  });
  const cosUrl = typeof raw === 'string' ? raw : (raw.publicUrl || raw.url || '');
  if (!cosUrl) throw new Error('COS 上传成功但未返回 URL');
  return {
    cosUrl,
    cosKey: `${folder}/${fileName}`
  };
}

async function saveCaptureRecord(record) {
  const db = wx.cloud.database();
  return db.collection('can_capture_sessions').add({
    data: {
      ...record,
      createdAt: db.serverDate()
    }
  });
}

async function uploadCapture(sessionId, gearKey, gearLabel, frames, extra = {}) {
  let openid = extra.openid || '';
  if (!openid) {
    try {
      const login = await wx.cloud.callFunction({ name: 'login' });
      openid = (login.result && login.result.openid) || '';
    } catch (e) { /* ignore */ }
  }
  const payload = {
    version: 1,
    sessionId,
    gearKey,
    gearLabel,
    capturedAt: new Date().toISOString(),
    durationMs: extra.durationMs || 3000,
    frameCount: frames.length,
    frames
  };
  const { cosUrl, cosKey } = await uploadCaptureJson(sessionId, gearKey, payload);
  const addRes = await saveCaptureRecord({
    sessionId,
    gearKey,
    gearLabel,
    frameCount: frames.length,
    cosUrl,
    cosKey,
    openid,
    frames,
    note: extra.note || ''
  });
  return { cosUrl, cosKey, docId: addRes._id, payload };
}

async function listSessionsGrouped(limit = 80) {
  const list = await listCaptureSessions(limit);
  const map = {};
  list.forEach((item) => {
    if (!map[item.sessionId]) {
      map[item.sessionId] = { sessionId: item.sessionId, openid: item.openid, items: [] };
    }
    map[item.sessionId].items.push(item);
  });
  return Object.values(map);
}

async function fetchSessionBundle(sessionId) {
  const db = wx.cloud.database();
  const res = await db.collection('can_capture_sessions').where({ sessionId }).limit(20).get();
  const items = res.data || [];
  const bundle = { sessionId, capturedAt: new Date().toISOString(), steps: [] };
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    let data = null;
    if (it.cosUrl) {
      try {
        data = await downloadConfigJson(it.cosUrl);
      } catch (e) {
        console.warn('[canCapture] cos download fail', it.gearKey, e);
      }
    }
    if (!data && Array.isArray(it.frames) && it.frames.length) {
      data = {
        version: 1,
        sessionId: it.sessionId,
        gearKey: it.gearKey,
        gearLabel: it.gearLabel,
        frameCount: it.frameCount,
        frames: it.frames
      };
    }
    if (!data) continue;
    bundle.steps.push({
      gearKey: it.gearKey,
      gearLabel: it.gearLabel,
      frameCount: it.frameCount,
      cosUrl: it.cosUrl,
      data
    });
  }
  return bundle;
}

async function getProfileForSession(sessionId) {
  const db = wx.cloud.database();
  const res = await db.collection('can_moto_profiles')
    .where({ sourceSessionId: sessionId, published: true })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();
  return (res.data && res.data[0]) || null;
}

async function publishProfile(sessionId, form, config) {
  const profileId = await saveMotoProfile({
    name: form.name || ('配置-' + sessionId),
    model: form.model || '',
    sourceSessionId: sessionId,
    published: true,
    configSummary: { gear_id: config.gear_id, rpm_id: config.rpm_id }
  });
  const configUrl = await uploadProfileConfig(profileId, config);
  await saveMotoProfile({
    _id: profileId,
    name: form.name,
    model: form.model,
    sourceSessionId: sessionId,
    published: true,
    configUrl,
    configSummary: config
  });
  return { profileId, configUrl, config };
}

async function listCaptureSessions(limit = 30) {
  const db = wx.cloud.database();
  const res = await db.collection('can_capture_sessions')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return res.data || [];
}

function groupCaptureItems(items) {
  const map = {};
  (items || []).forEach((item) => {
    if (!map[item.sessionId]) {
      map[item.sessionId] = {
        sessionId: item.sessionId,
        openid: item.openid,
        items: [],
        latestAt: item.createdAt || null
      };
    }
    map[item.sessionId].items.push(item);
    if (item.createdAt && (!map[item.sessionId].latestAt || item.createdAt > map[item.sessionId].latestAt)) {
      map[item.sessionId].latestAt = item.createdAt;
    }
  });
  return Object.values(map).sort((a, b) => {
    const ta = a.latestAt ? new Date(a.latestAt).getTime() : sessionIdToTime(a.sessionId);
    const tb = b.latestAt ? new Date(b.latestAt).getTime() : sessionIdToTime(b.sessionId);
    return tb - ta;
  });
}

function sessionIdToTime(sessionId) {
  const ts = Number(String(sessionId || '').replace(/^S/, ''));
  return Number.isFinite(ts) ? ts : 0;
}

function formatSessionTimeLabel(sessionId, createdAt) {
  let d = null;
  if (createdAt) {
    try { d = new Date(createdAt); } catch (e) { /* ignore */ }
  }
  if (!d || Number.isNaN(d.getTime())) {
    const ts = sessionIdToTime(sessionId);
    if (ts) d = new Date(ts);
  }
  if (!d || Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 当前用户的采集会话（按 sessionId 分组） */
async function listUserSessionsGrouped(openid, limit = 30) {
  if (!openid) return [];
  const db = wx.cloud.database();
  let items = [];
  try {
    const res = await db.collection('can_capture_sessions')
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .limit(Math.max(limit * 10, 60))
      .get();
    items = res.data || [];
  } catch (e) {
    console.warn('[canCapture] user sessions query fallback', e);
    const all = await listCaptureSessions(120);
    items = all.filter((it) => it.openid === openid);
  }
  return groupCaptureItems(items).slice(0, limit);
}

/** 用户历史：采集 + 是否已保存分析 */
async function listUserHistorySessions(openid, limit = 30) {
  const groups = await listUserSessionsGrouped(openid, limit);
  if (!groups.length) return [];

  const localMap = loadLocalSnapshotMap();
  const db = wx.cloud.database();
  let snapshots = [];
  try {
    const res = await db.collection(SNAPSHOT_COLLECTION)
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    snapshots = res.data || [];
  } catch (e) {
    if (!isDbCollectionMissingError(e)) {
      console.warn('[canCapture] snapshots query fail', e);
    }
  }

  const snapMap = {};
  Object.keys(localMap).forEach((sid) => {
    snapMap[sid] = localMap[sid];
  });
  snapshots.forEach((s) => {
    if (!snapMap[s.sessionId]) snapMap[s.sessionId] = s;
  });

  return groups.map((g) => ({
    ...g,
    stepCount: g.items.length,
    timeLabel: formatSessionTimeLabel(g.sessionId, g.latestAt),
    hasSnapshot: !!snapMap[g.sessionId],
    snapshotSummary: snapMap[g.sessionId]
      ? {
        gear_id: snapMap[g.sessionId].gear_id,
        rpm_id: snapMap[g.sessionId].rpm_id,
        input_idle: snapMap[g.sessionId].input_idle,
        input_redline: snapMap[g.sessionId].input_redline
      }
      : null
  }));
}

async function saveUserRuntimeSnapshot(sessionId, runtimeConfig, openid) {
  if (!sessionId || !runtimeConfig) throw new Error('缺少会话或配置');
  let uid = openid || '';
  if (!uid) {
    try {
      const login = await wx.cloud.callFunction({ name: 'login' });
      uid = (login.result && login.result.openid) || '';
    } catch (e) { /* ignore */ }
  }

  const localRow = saveLocalRuntimeSnapshot(sessionId, runtimeConfig);

  let configUrl = '';
  try {
    const snapshotId = `user_${sessionId}_${Date.now()}`;
    configUrl = await uploadProfileConfig(snapshotId, runtimeConfig);
  } catch (e) {
    console.warn('[canCapture] snapshot cos upload fail', e);
  }

  try {
    const db = wx.cloud.database();
    const record = {
      sessionId,
      openid: uid,
      configUrl,
      gear_id: runtimeConfig.gear_id,
      rpm_id: runtimeConfig.rpm_id,
      input_idle: runtimeConfig.input_idle,
      input_redline: runtimeConfig.input_redline,
      runtimeConfig,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    };
    const addRes = await db.collection(SNAPSHOT_COLLECTION).add({ data: record });
    return { docId: addRes._id, configUrl, local: false };
  } catch (e) {
    if (!isDbCollectionMissingError(e)) {
      throw e;
    }
    return { docId: '', configUrl, local: true, runtimeConfig: localRow.runtimeConfig };
  }
}

async function getUserRuntimeSnapshot(sessionId) {
  if (!sessionId) return null;

  const localRow = getLocalRuntimeSnapshot(sessionId);
  const db = wx.cloud.database();
  try {
    const res = await db.collection(SNAPSHOT_COLLECTION)
      .where({ sessionId })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const row = (res.data && res.data[0]) || null;
    if (row) {
      if (row.runtimeConfig) return row;
      if (row.configUrl) {
        try {
          const runtimeConfig = await downloadConfigJson(row.configUrl);
          return { ...row, runtimeConfig };
        } catch (e) {
          console.warn('[canCapture] snapshot download fail', e);
        }
      }
      return row;
    }
  } catch (e) {
    if (!isDbCollectionMissingError(e)) {
      console.warn('[canCapture] get snapshot fail', e);
    }
  }

  return localRow;
}

async function saveMotoProfile(profile) {
  const db = wx.cloud.database();
  const data = {
    ...profile,
    updatedAt: db.serverDate()
  };
  if (profile._id) {
    const id = profile._id;
    delete data._id;
    await db.collection('can_moto_profiles').doc(id).update({ data });
    return id;
  }
  data.createdAt = db.serverDate();
  const res = await db.collection('can_moto_profiles').add({ data });
  return res._id;
}

async function uploadProfileConfig(profileId, config) {
  const fileName = `${profileId}.json`;
  const localPath = writeJsonTemp(`can_profile_${fileName}`, config);
  const folder = CONFIG_FOLDER;
  const raw = await uploadLocalFileToCos(localPath, {
    folder,
    ext: '.json',
    contentType: 'application/json'
  });
  const url = typeof raw === 'string' ? raw : (raw.publicUrl || raw.url || '');
  if (!url) throw new Error('配置 COS 上传成功但未返回 URL');
  return url;
}

async function listPublishedProfiles() {
  const db = wx.cloud.database();
  const res = await db.collection('can_moto_profiles')
    .where({ published: true })
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get();
  return res.data || [];
}

async function clearAllCanLearnData() {
  const res = await wx.cloud.callFunction({
    name: 'getCosUploadUrl',
    data: { action: 'clearCanLearnData' }
  });
  const result = (res && res.result) || {};
  if (!result.success) {
    throw new Error(result.message || '清空失败');
  }
  return result;
}

function downloadConfigJson(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error('下载失败 ' + res.statusCode));
      },
      fail: (err) => reject(new Error(err.errMsg || '下载失败'))
    });
  });
}

module.exports = {
  uploadCapture,
  listCaptureSessions,
  listSessionsGrouped,
  listUserSessionsGrouped,
  listUserHistorySessions,
  fetchSessionBundle,
  getProfileForSession,
  publishProfile,
  saveMotoProfile,
  uploadProfileConfig,
  saveUserRuntimeSnapshot,
  getUserRuntimeSnapshot,
  listPublishedProfiles,
  downloadConfigJson,
  clearAllCanLearnData
};
