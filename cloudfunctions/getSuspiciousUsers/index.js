const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ENTER_THRESHOLD = 3; // 多次进入阈值
const STAY_MINUTES_THRESHOLD = 30; // 长停留阈值（分钟）

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

function formatDate(input) {
  if (!input) return '';
  let d = null;
  if (input instanceof Date) d = input;
  else if (typeof input === 'string' || typeof input === 'number') d = new Date(input);
  else if (input && input.$date) d = new Date(input.$date);
  if (!d || Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sumVideoMinutesFromViewer(viewer) {
  if (!viewer || typeof viewer !== 'object') return 0;
  let total = 0;
  Object.keys(viewer).forEach((k) => {
    if (k.indexOf('sectionDurations_video_') === 0) {
      total += Number(viewer[k]) || 0;
    }
  });
  return total;
}

function countSectionClicksFromViewer(viewer) {
  if (!viewer || typeof viewer !== 'object') return 0;
  let n = 0;
  Object.keys(viewer).forEach((k) => {
    if (k.indexOf('sectionClicks_') === 0) {
      n += Number(viewer[k]) || 0;
    }
  });
  return n;
}

exports.main = async () => {
  try {
    await assertAdmin();
    const res = await db.collection('chakan').orderBy('createdAt', 'desc').limit(200).get();
    const docs = Array.isArray(res.data) ? res.data : [];
    const users = [];

    docs.forEach((doc) => {
      const viewers = Array.isArray(doc.viewers) ? doc.viewers : [];
      const grouped = {};
      viewers.forEach((v) => {
        const openid = (v && v.openid) || '';
        const nickname = (v && v.nickname) || '未命名用户';
        const key = `${openid}__${nickname}`;
        if (!grouped[key]) {
          grouped[key] = {
            viewerNickname: nickname,
            creatorNickname: doc.creatorNickname || '未知',
            shareCode: doc.code || '普通安装',
            enterCount: 0,
            totalStayMinutes: 0,
            totalVideoMinutes: 0,
            totalSectionClicks: 0,
            lastViewTime: '',
            province: '',
            city: '',
            district: '',
            address: '',
            latitude: null,
            longitude: null
          };
        }
        const stayMin = Number(v.durationMinutes) || 0;
        grouped[key].enterCount += 1;
        grouped[key].totalStayMinutes += stayMin;
        grouped[key].totalVideoMinutes += sumVideoMinutesFromViewer(v);
        grouped[key].totalSectionClicks += countSectionClicksFromViewer(v);

        const vt = formatDate(v.viewTime);
        if (vt && (!grouped[key].lastViewTime || vt > grouped[key].lastViewTime)) {
          grouped[key].lastViewTime = vt;
          grouped[key].province = (v && v.province) || '';
          grouped[key].city = (v && v.city) || '';
          grouped[key].district = (v && v.district) || '';
          grouped[key].address = (v && v.address) || '';
          grouped[key].latitude = v && v.latitude != null ? v.latitude : null;
          grouped[key].longitude = v && v.longitude != null ? v.longitude : null;
        }
      });

      Object.keys(grouped).forEach((k) => {
        const item = grouped[k];
        const triggers = [];
        if (item.enterCount >= ENTER_THRESHOLD) triggers.push(`多次进入(${item.enterCount}次)`);
        if (item.totalStayMinutes >= STAY_MINUTES_THRESHOLD) triggers.push(`长时间停留(${item.totalStayMinutes.toFixed(2)}分)`);
        if (triggers.length === 0) return;

        const regionParts = [item.province, item.city, item.district].filter((x) => !!String(x || '').trim());
        const regionText = regionParts.length ? regionParts.join(' ') : '—';
        const addressText = String(item.address || '').trim();
        const addressDisplay = addressText.length > 56 ? `${addressText.slice(0, 56)}…` : (addressText || '—');
        const hasGeo = item.latitude != null && item.longitude != null && item.latitude !== '' && item.longitude !== '';
        const geoText = hasGeo ? `${item.latitude}, ${item.longitude}` : '—';

        users.push({
          rowKey: `${doc._id || ''}_${k}`,
          viewerNickname: item.viewerNickname,
          creatorNickname: item.creatorNickname,
          shareCode: item.shareCode || '普通安装',
          triggerReasonText: triggers.join('；'),
          enterCount: item.enterCount,
          totalStayMinutesText: item.totalStayMinutes.toFixed(2),
          totalVideoMinutesText: item.totalVideoMinutes.toFixed(2),
          sectionClicksTotal: item.totalSectionClicks,
          lastViewTime: item.lastViewTime || '—',
          regionText,
          address: addressText,
          addressDisplay,
          province: item.province || '',
          city: item.city || '',
          district: item.district || '',
          latitude: item.latitude,
          longitude: item.longitude,
          geoText
        });
      });
    });

    users.sort((a, b) => (a.lastViewTime < b.lastViewTime ? 1 : -1));
    return { success: true, users };
  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限', users: [] };
    }
    return { success: false, error: err.message || String(err), users: [] };
  }
};
