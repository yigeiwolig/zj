const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  try {
    const res = await db.collection('moto_records_cloud').orderBy('updateTime', 'desc').get();
    return { success: true, data: res.data || [] };
  } catch (e) {
    return { success: false, errMsg: e.message || String(e), data: [] };
  }
};















