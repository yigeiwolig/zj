/**

 * 用户自定义语音口令：本地缓存优先 + 云库同步（按 _openid）

 * 规则：本地有词时绝不被空云端覆盖；以 updateTime 较新者为准。

 */

const COLLECTION = 'voice_custom_keywords';

const LOCAL_KEY = '__voice_custom_keywords__';

const MAX_PER_GROUP = 20;

const MIN_LEN = 1;

const MAX_LEN = 8;



function stripPhrase(raw) {

  return String(raw || '')

    .replace(/[，。！？、；：,.!?;:\s"'“”‘’【】\[\]（）()]/g, '')

    .trim();

}



/**

 * 规范化两组词；同词冲突时后写组优先（closeLast=true 表示关闭组覆盖打开组）

 * @returns {{ open: string[], close: string[], conflicts: string[] }}

 */

function normalizeKeywordGroups(openList, closeList, opts) {

  const closeLast = !(opts && opts.closeLast === false);

  const conflicts = [];

  const openSet = new Set();

  const closeSet = new Set();



  const pushUnique = (list, set, otherSet, label) => {

    const arr = Array.isArray(list) ? list : [];

    for (let i = 0; i < arr.length; i++) {

      if (set.size >= MAX_PER_GROUP) break;

      const p = stripPhrase(arr[i]);

      if (!p || p.length < MIN_LEN || p.length > MAX_LEN) continue;

      if (otherSet.has(p)) {

        conflicts.push(p);

        if (closeLast && label === 'close') {

          otherSet.delete(p);

          set.add(p);

        } else if (!closeLast && label === 'open') {

          otherSet.delete(p);

          set.add(p);

        }

        continue;

      }

      set.add(p);

    }

  };



  if (closeLast) {

    pushUnique(openList, openSet, closeSet, 'open');

    pushUnique(closeList, closeSet, openSet, 'close');

  } else {

    pushUnique(closeList, closeSet, openSet, 'close');

    pushUnique(openList, openSet, closeSet, 'open');

  }



  return {

    open: Array.from(openSet),

    close: Array.from(closeSet),

    conflicts: Array.from(new Set(conflicts))

  };

}



function isEmptyKeywords(payload) {

  const open = (payload && payload.open) || [];

  const close = (payload && payload.close) || [];

  return open.length === 0 && close.length === 0;

}



function toMillis(value) {

  if (value == null) return 0;

  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {

    const n = Date.parse(value);

    return Number.isFinite(n) ? n : 0;

  }

  if (typeof value === 'object') {

    if (typeof value.getTime === 'function') {

      const t = value.getTime();

      return Number.isFinite(t) ? t : 0;

    }

    // 云开发 serverDate 偶发形态

    if (value.$date != null) return toMillis(value.$date);

  }

  return 0;

}



function readLocalCache() {

  try {

    const cache = wx.getStorageSync(LOCAL_KEY);

    if (!cache || typeof cache !== 'object') {

      return { open: [], close: [], updateTime: 0 };

    }

    const n = normalizeKeywordGroups(cache.openPhrases || cache.open, cache.closePhrases || cache.close);

    return {

      open: n.open,

      close: n.close,

      updateTime: toMillis(cache.updateTime)

    };

  } catch (e) {

    return { open: [], close: [], updateTime: 0 };

  }

}



function writeLocalCache(open, close, updateTime) {

  const ts = toMillis(updateTime) || Date.now();

  try {

    wx.setStorageSync(LOCAL_KEY, {

      openPhrases: open || [],

      closePhrases: close || [],

      updateTime: ts

    });

    return true;

  } catch (e) {

    console.warn('[voiceCustomKeywords] 本地写入失败', e);

    return false;

  }

}



async function fetchFromCloud() {

  if (!wx.cloud) return null;

  const db = wx.cloud.database();

  const res = await db.collection(COLLECTION).limit(1).get();

  const doc = res && res.data && res.data[0];

  if (!doc) {

    return { open: [], close: [], _id: null, updateTime: 0, exists: false };

  }

  const n = normalizeKeywordGroups(doc.openPhrases, doc.closePhrases);

  return {

    open: n.open,

    close: n.close,

    _id: doc._id || null,

    updateTime: toMillis(doc.updateTime),

    exists: true

  };

}



async function saveToCloud(open, close) {

  if (!wx.cloud) throw new Error('云开发未初始化');

  const db = wx.cloud.database();

  const payload = {

    openPhrases: open || [],

    closePhrases: close || [],

    updateTime: db.serverDate()

  };



  const existing = await db.collection(COLLECTION).limit(1).get();

  const doc = existing && existing.data && existing.data[0];

  if (doc && doc._id) {

    await db.collection(COLLECTION).doc(doc._id).update({ data: payload });

    return doc._id;

  }

  const addRes = await db.collection(COLLECTION).add({ data: payload });

  return addRes && addRes._id;

}



/**

 * 加载：本地优先保底；云端仅在有文档且（非空或本地为空）且不比本地旧时覆盖

 */

async function loadCustomKeywords() {

  const local = readLocalCache();

  try {

    const cloud = await fetchFromCloud();

    if (!cloud) {

      return { open: local.open, close: local.close, from: 'local' };

    }



    const cloudEmpty = isEmptyKeywords(cloud);

    const localEmpty = isEmptyKeywords(local);



    // 云端无文档：保留本地，并尝试回写云端

    if (!cloud.exists) {

      if (!localEmpty) {

        try {

          await saveToCloud(local.open, local.close);

        } catch (e) {

          console.warn('[voiceCustomKeywords] 本地回写云端失败', e);

        }

      }

      return { open: local.open, close: local.close, from: 'local' };

    }



    // 云端空、本地有词：绝不覆盖，并回写云端

    if (cloudEmpty && !localEmpty) {

      try {

        await saveToCloud(local.open, local.close);

      } catch (e) {

        console.warn('[voiceCustomKeywords] 空云端回写失败', e);

      }

      return { open: local.open, close: local.close, from: 'local' };

    }



    // 本地更新：保留本地并同步上云

    if (!localEmpty && local.updateTime > 0 && cloud.updateTime > 0

        && local.updateTime > cloud.updateTime) {

      try {

        await saveToCloud(local.open, local.close);

      } catch (e) {

        console.warn('[voiceCustomKeywords] 较新本地回写失败', e);

      }

      return { open: local.open, close: local.close, from: 'local' };

    }



    // 采用云端（含「两边都空」）

    writeLocalCache(cloud.open, cloud.close, cloud.updateTime || Date.now());

    return {

      open: cloud.open,

      close: cloud.close,

      from: cloudEmpty && localEmpty ? 'local' : 'cloud'

    };

  } catch (e) {

    console.warn('[voiceCustomKeywords] 云端读取失败，使用本地缓存', e);

  }

  return { open: local.open, close: local.close, from: 'local' };

}



/**

 * 保存：规范化 → 本地 → 云端

 * @param {string[]} openList

 * @param {string[]} closeList

 * @param {{ preferClose?: boolean }} opts 同词冲突时是否以关闭组为准（默认 true）

 */

async function saveCustomKeywords(openList, closeList, opts) {

  const preferClose = !(opts && opts.preferClose === false);

  const n = normalizeKeywordGroups(openList, closeList, { closeLast: preferClose });

  const savedLocal = writeLocalCache(n.open, n.close, Date.now());

  if (!savedLocal) {

    throw new Error('本地保存失败');

  }

  try {

    await saveToCloud(n.open, n.close);

  } catch (e) {

    console.warn('[voiceCustomKeywords] 云端保存失败，已写本地', e);

    return { ...n, savedCloud: false, savedLocal: true, error: e };

  }

  return { ...n, savedCloud: true, savedLocal: true };

}



module.exports = {

  COLLECTION,

  LOCAL_KEY,

  MAX_PER_GROUP,

  MIN_LEN,

  MAX_LEN,

  stripPhrase,

  normalizeKeywordGroups,

  readLocalCache,

  writeLocalCache,

  loadCustomKeywords,

  saveCustomKeywords

};


