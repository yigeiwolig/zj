const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ENTER_THRESHOLD = 3;
const STAY_MINUTES_THRESHOLD = 30;

function sanitizeRoute(route) {
  const s = String(route || '').trim();
  if (!s) return 'unknown';
  return s.replace(/[./\\-]+/g, '_').replace(/[^\w]/g, '_').slice(0, 80);
}

async function softWecomSuspicious(oneLine) {
  try {
    await cloud.callFunction({
      name: 'wecomNotify',
      data: { action: 'notifyAdminTodo', kind: 'suspicious', oneLine: oneLine || '' }
    });
  } catch (e) {
    console.warn('[recordSuspiciousSession] wecomAdminTodo failed', e);
  }
}

function crossedSuspiciousThreshold(enterCount, totalStayMinutes) {
  return (
    Number(enterCount || 0) >= ENTER_THRESHOLD ||
    Number(totalStayMinutes || 0) >= STAY_MINUTES_THRESHOLD
  );
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
    const prev = sessionRes.data[0];
    const nextEnter = Number(prev.sessionCount || 0) + 1;
    const nextStay = Number(prev.totalStayMinutes || 0) + stayMinutes;
    const shouldNotify =
      !prev.wecomSuspiciousNotifySent &&
      crossedSuspiciousThreshold(nextEnter, nextStay) &&
      prev.reviewDecision !== 'ignore' &&
      prev.reviewDecision !== 'ban' &&
      prev.reviewStatus !== 'archived';

    if (shouldNotify) {
      baseUpdate.wecomSuspiciousNotifySent = true;
      baseUpdate.wecomSuspiciousNotifyAt = now;
    }

    await db.collection('suspicious_user_sessions').doc(sessionRes.data[0]._id).update({ data: baseUpdate });

    if (shouldNotify) {
      await softWecomSuspicious(`会话${nextEnter}次 / 停留${nextStay.toFixed(1)}分钟`);
    }
    return { success: true, created: false, stayMinutes, notified: !!shouldNotify };
  }

  const shouldNotifyOnCreate = crossedSuspiciousThreshold(1, stayMinutes);
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
      updateTime: now,
      wecomSuspiciousNotifySent: !!shouldNotifyOnCreate,
      ...(shouldNotifyOnCreate ? { wecomSuspiciousNotifyAt: now } : {})
    }
  });

  if (shouldNotifyOnCreate) {
    await softWecomSuspicious(`会话1次 / 停留${stayMinutes.toFixed(1)}分钟`);
  }

  return { success: true, created: true, stayMinutes, notified: !!shouldNotifyOnCreate };
};
