const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DOC_ID = 'blocking_rules';

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

function normalizeCityEntry(item) {
  if (typeof item === 'string') {
    const city = String(item || '').trim();
    return city ? { city, district: '' } : null;
  }
  if (item && typeof item === 'object') {
    const city = String(item.city || '').trim();
    const district = String(item.district || '').trim();
    if (!city) return null;
    return { city, district };
  }
  return null;
}

function entryKey(entry) {
  if (!entry) return '';
  return `${entry.city}||${entry.district || ''}`;
}

function entriesEqual(a, b) {
  return entryKey(a) === entryKey(b);
}

async function loadConfig() {
  try {
    const res = await db.collection('app_config').doc(DOC_ID).get();
    if (res.data) {
      return {
        is_active: res.data.is_active !== false,
        blocked_provinces: Array.isArray(res.data.blocked_provinces) ? res.data.blocked_provinces : [],
        blocked_cities: Array.isArray(res.data.blocked_cities) ? res.data.blocked_cities : []
      };
    }
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (!msg.includes('does not exist') && !msg.includes('not exist')) {
      throw err;
    }
  }
  return {
    is_active: true,
    blocked_provinces: [],
    blocked_cities: []
  };
}

async function saveConfig(config) {
  const payload = {
    is_active: config.is_active !== false,
    blocked_provinces: Array.isArray(config.blocked_provinces) ? config.blocked_provinces : [],
    blocked_cities: Array.isArray(config.blocked_cities) ? config.blocked_cities : [],
    updateTime: db.serverDate()
  };
  try {
    await db.collection('app_config').doc(DOC_ID).update({ data: payload });
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('does not exist') || msg.includes('not exist')) {
      await db.collection('app_config').doc(DOC_ID).set({ data: payload });
      return;
    }
    throw err;
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'get';

  try {
    await assertAdmin();

    if (action === 'get') {
      const config = await loadConfig();
      return { success: true, config };
    }

    if (action === 'set_active') {
      const config = await loadConfig();
      config.is_active = event.is_active !== false;
      await saveConfig(config);
      return { success: true, config, message: config.is_active ? '已开启地域拦截' : '已关闭地域拦截（审核放行）' };
    }

    if (action === 'add_city') {
      const city = String(event.city || '').trim();
      const district = event.wholeCity === true ? '' : String(event.district || '').trim();
      const province = String(event.province || '').trim();
      if (!city) {
        return { success: false, errMsg: '请选择城市' };
      }

      const config = await loadConfig();
      const nextEntry = { city, district };
      const normalizedList = (config.blocked_cities || [])
        .map(normalizeCityEntry)
        .filter(Boolean);

      if (normalizedList.some((item) => entriesEqual(item, nextEntry))) {
        return { success: false, errMsg: '该地址已在封禁列表中' };
      }

      normalizedList.push(nextEntry);
      config.blocked_cities = normalizedList;
      if (province && !config.blocked_provinces.includes(province)) {
        config.blocked_provinces = config.blocked_provinces.concat(province);
      }
      await saveConfig(config);

      const label = district ? `${city} ${district}` : `${city}（整市）`;
      return { success: true, config, message: `已添加封禁地址：${label}` };
    }

    if (action === 'remove_city') {
      const index = Number(event.index);
      const city = String(event.city || '').trim();
      const district = String(event.district || '').trim();
      const config = await loadConfig();
      let normalizedList = (config.blocked_cities || [])
        .map(normalizeCityEntry)
        .filter(Boolean);

      if (Number.isInteger(index) && index >= 0 && index < normalizedList.length) {
        normalizedList.splice(index, 1);
      } else if (city) {
        const target = { city, district };
        normalizedList = normalizedList.filter((item) => !entriesEqual(item, target));
      } else {
        return { success: false, errMsg: '缺少要删除的地址' };
      }

      config.blocked_cities = normalizedList;
      await saveConfig(config);
      return { success: true, config, message: '已移除封禁地址' };
    }

    return { success: false, errMsg: 'INVALID_ACTION' };
  } catch (err) {
    console.error('[updateBlockingRules] failed:', err);
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' };
    }
    return { success: false, errMsg: err.message || '操作失败' };
  }
};
