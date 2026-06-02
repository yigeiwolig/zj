const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const DOC_ID = 'productFeatureFlags';
const HUB_HOME_DOC_ID = 'hubHomeConfig';

function isFlagEnabled(val) {
  if (val === undefined || val === null) return true;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  if (val === true || val === 1 || val === '1' || val === 'true') return true;
  return !!val;
}

function normalizeFlags(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  Object.keys(src).forEach((k) => {
    const key = String(k).trim();
    if (!key) return;
    out[key] = isFlagEnabled(src[k]);
  });
  return out;
}

function extractFlags(doc) {
  if (!doc || typeof doc !== 'object') return {};
  if (doc.flags && typeof doc.flags === 'object') return normalizeFlags(doc.flags);
  if (doc.data && doc.data.flags) return normalizeFlags(doc.data.flags);
  return {};
}

async function readHubNewCover() {
  try {
    const res = await db.collection('shop_config').doc(HUB_HOME_DOC_ID).get();
    const data = (res && res.data) || {};
    return String(data.hubNewCover || '').trim();
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('does not exist') || msg.includes('not exist') || msg.includes('DOCUMENT_NOT_EXIST')) {
      return '';
    }
    return '';
  }
}

exports.main = async () => {
  try {
    const res = await db.collection('shop_config').doc(DOC_ID).get();
    const data = (res && res.data) || {};
    const hubNewCover = await readHubNewCover();
    return {
      success: true,
      flags: extractFlags(data),
      updateTime: data.updateTime || null,
      hubNewCover
    };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('does not exist') || msg.includes('not exist') || msg.includes('DOCUMENT_NOT_EXIST')) {
      const hubNewCover = await readHubNewCover();
      return { success: true, flags: {}, updateTime: null, hubNewCover };
    }
    return { success: false, error: msg, flags: {}, hubNewCover: '' };
  }
};
