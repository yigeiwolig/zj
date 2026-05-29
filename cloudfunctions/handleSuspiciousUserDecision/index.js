const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

async function upsertArchive(payload = {}) {
  const rowKey = payload.rowKey || '';
  const openid = payload._openid || '';
  let existed = null;
  try {
    if (rowKey) {
      const byRowKey = await db.collection('suspicious_review_archive').where({ rowKey }).limit(1).get();
      if (byRowKey.data && byRowKey.data.length > 0) existed = byRowKey.data[0];
    }
    if (!existed && openid) {
      const byOpenid = await db.collection('suspicious_review_archive')
        .where({ _openid: openid, sourceType: payload.sourceType || 'suspicious_manual' })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      if (byOpenid.data && byOpenid.data.length > 0) existed = byOpenid.data[0];
    }
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (!msg.includes('collection not exists') && !msg.includes('Db or Table not exist')) throw err;
  }

  try {
    if (existed && existed._id) {
      await db.collection('suspicious_review_archive').doc(existed._id).update({ data: payload });
      return;
    }
    await db.collection('suspicious_review_archive').add({
      data: {
        ...payload,
        createTime: db.serverDate()
      }
    });
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    // 留档集合不存在时不阻塞主流程（封禁/无视）
    if (msg.includes('collection not exists') || msg.includes('Db or Table not exist')) {
      return;
    }
    throw err;
  }
}

exports.main = async (event = {}) => {
  const action = event.action; // ban | ignore
  const sourceType = event.sourceType || 'session';
  const viewerOpenid = event.viewerOpenid || '';
  const viewerNickname = event.viewerNickname || '';
  const rowKey = event.rowKey || '';
  const riskId = event.riskId || '';
  const loc = event.locationInfo || {};

  if (!action || !['ban', 'ignore'].includes(action)) {
    return { success: false, error: 'INVALID_ACTION' };
  }
  if (!viewerOpenid && action === 'ban') {
    return { success: false, error: 'OPENID_REQUIRED' };
  }

  try {
    await assertAdmin();

    if (action === 'ban') {
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: viewerOpenid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();
      const updateData = {
        isBanned: true,
        banReason: 'suspicious_manual',
        banPage: 'index',
        province: loc.province || '',
        city: loc.city || '',
        district: loc.district || '',
        address: loc.address || '',
        latitude: loc.latitude != null ? loc.latitude : null,
        longitude: loc.longitude != null ? loc.longitude : null,
        updateTime: db.serverDate()
      };
      if (buttonRes.data && buttonRes.data.length > 0) {
        await db.collection('login_logbutton').doc(buttonRes.data[0]._id).update({ data: updateData });
      } else {
        await db.collection('login_logbutton').add({
          data: {
            _openid: viewerOpenid,
            ...updateData,
            bypassLocationCheck: false,
            qiangli: false,
            createTime: db.serverDate()
          }
        });
      }
    }

    await upsertArchive({
      rowKey,
      riskId,
      _openid: viewerOpenid,
      viewerNickname,
      sourceType: 'suspicious_manual',
      fromSourceType: sourceType,
      decision: action,
      status: 'archived',
      province: loc.province || '',
      city: loc.city || '',
      district: loc.district || '',
      address: loc.address || '',
      latitude: loc.latitude != null ? loc.latitude : null,
      longitude: loc.longitude != null ? loc.longitude : null,
      archivedAt: db.serverDate(),
      updateTime: db.serverDate()
    });

    return { success: true };
  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: err.message || String(err) };
  }
};

