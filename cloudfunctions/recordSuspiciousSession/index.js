const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function sanitizeRoute(route) {
  const s = String(route || '').trim();
  if (!s) return 'unknown';
  return s.replace(/[./\\-]+/g, '_').replace(/[^\w]/g, '_').slice(0, 80);
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { success: false, error: 'NO_OPENID' };

  const durationMs = Number(event.durationMs || 0);
  const stayMinutes = Math.max(0, Math.round((durationMs / 60000) * 100) / 100);
  const routeKey = sanitizeRoute(event.route || '');
  const locationInfo = event.locationInfo || {};

  const sessionRes = await db.collection('suspicious_user_sessions').where({ _openid: OPENID }).limit(1).get();
  const now = db.serverDate();

  const baseUpdate = {
    lastActiveAt: now,
    lastRoute: routeKey,
    lastStayMinutes: stayMinutes,
    totalStayMinutes: _.inc(stayMinutes),
    sessionCount: _.inc(1),
    updateTime: now,
    [`routeCount.${routeKey}`]: _.inc(1)
  };

  if (locationInfo && typeof locationInfo === 'object') {
    if (locationInfo.province !== undefined) baseUpdate.province = locationInfo.province || '';
    if (locationInfo.city !== undefined) baseUpdate.city = locationInfo.city || '';
    if (locationInfo.district !== undefined) baseUpdate.district = locationInfo.district || '';
    if (locationInfo.address !== undefined) baseUpdate.address = locationInfo.address || '';
    if (locationInfo.latitude !== undefined) baseUpdate.latitude = locationInfo.latitude;
    if (locationInfo.longitude !== undefined) baseUpdate.longitude = locationInfo.longitude;
  }

  if (sessionRes.data && sessionRes.data.length > 0) {
    await db.collection('suspicious_user_sessions').doc(sessionRes.data[0]._id).update({ data: baseUpdate });
    return { success: true, created: false, stayMinutes };
  }

  await db.collection('suspicious_user_sessions').add({
    data: {
      _openid: OPENID,
      totalStayMinutes: stayMinutes,
      sessionCount: 1,
      lastStayMinutes: stayMinutes,
      lastRoute: routeKey,
      routeCount: { [routeKey]: 1 },
      province: locationInfo.province || '',
      city: locationInfo.city || '',
      district: locationInfo.district || '',
      address: locationInfo.address || '',
      latitude: locationInfo.latitude != null ? locationInfo.latitude : null,
      longitude: locationInfo.longitude != null ? locationInfo.longitude : null,
      lastActiveAt: now,
      createTime: now,
      updateTime: now
    }
  });

  return { success: true, created: true, stayMinutes };
};
