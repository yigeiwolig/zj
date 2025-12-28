const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action, record } = event || {};

  if (!action) {
    return { success: false, errMsg: 'Missing action' };
  }

  // 校验管理员
  const adminRes = await db.collection('guanliyuan').where({ openid: OPENID }).get();
  if (!adminRes.data || adminRes.data.length === 0) {
    return { success: false, errMsg: 'Permission denied' };
  }

  const col = db.collection('moto_records_cloud');

  try {
    if (action === 'add') {
      if (!record) return { success: false, errMsg: 'Missing record' };

      const data = {
        type: record.type || 'gas',
        name: record.name || '',
        bike: record.bike || '',
        angle: Number(record.angle || 0),
        dist: Number(record.dist || 0),
        score: Number(record.score || 0),
        avatar: record.avatar || '',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
      };

      const r = await col.add({ data });
      return { success: true, _id: r._id };
    }

    if (action === 'update') {
      if (!record || !record._id) return { success: false, errMsg: 'Missing record._id' };

      const data = {
        type: record.type || 'gas',
        name: record.name || '',
        bike: record.bike || '',
        angle: Number(record.angle || 0),
        dist: Number(record.dist || 0),
        score: Number(record.score || 0),
        avatar: record.avatar || '',
        updateTime: db.serverDate(),
      };

      await col.doc(record._id).update({ data });
      return { success: true };
    }

    if (action === 'delete') {
      if (!record || !record._id) return { success: false, errMsg: 'Missing record._id' };

      await col.doc(record._id).remove();
      return { success: true };
    }

    return { success: false, errMsg: 'Unknown action' };
  } catch (e) {
    return { success: false, errMsg: e.message || String(e) };
  }
};
