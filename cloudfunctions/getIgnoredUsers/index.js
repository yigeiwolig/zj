const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const API_VERSION = 'v1_ignored_archive_20260606';

function calcSuspicionScore(item) {
  if (!item) return 0;
  const enterCount = Number(item.enterCount || 0);
  const pageVisits = Number(
    item.sectionClicksTotal != null ? item.sectionClicksTotal : (item.pageVisitsCount || 0)
  );
  const stayMinutes = Number(
    item.totalStayMinutesText != null ? item.totalStayMinutesText : (item.totalStayMinutes || 0)
  );
  const dailyCount = Number(item.dailyCount || 0);
  const hourlyCount = Number(item.hourlyCount || 0);
  if (dailyCount || hourlyCount) {
    return hourlyCount * 10000 + dailyCount * 1000 + pageVisits;
  }
  return enterCount * 1000 + pageVisits * 100 + stayMinutes;
}

function compareBySuspicionLevel(a, b) {
  const scoreDiff = calcSuspicionScore(b) - calcSuspicionScore(a);
  if (scoreDiff !== 0) return scoreDiff;
  return (b.lastViewTs || b.ignoredAtTs || 0) - (a.lastViewTs || a.ignoredAtTs || 0);
}

const PAGE_LABEL_MAP = {
  dengluye: '登录页',
  chanpinye: '产品页',
  shangdianye: '商店页',
  anliye: '案例页',
  gerenzhongxin: '个人中心',
  shouye: '首页',
  paihangbang: '排行榜',
  weixiuzhongxin: '维修中心',
  fengjingye: '封禁页',
  guanliyuanye: '管理员页',
  guanliyuanjingjianye: '管理员精简页',
  anzhuangjiaocheng: '安装教程',
  lianxieye: '联系页',
  saomiaoye: '扫码页',
  otaye: 'OTA页',
  xinyemian: '新页面'
};

function toChinesePageName(pageKey) {
  if (!pageKey) return '未知页面';
  if (PAGE_LABEL_MAP[pageKey]) return PAGE_LABEL_MAP[pageKey];
  return `页面(${pageKey})`;
}

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if ((byOpenid.data || []).length > 0) return;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if ((bySystemOpenid.data || []).length > 0) return;
  throw new Error('FORBIDDEN');
}

function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'object') {
    if (typeof input.toDate === 'function') {
      const d = input.toDate();
      if (d && !Number.isNaN(d.getTime())) return d;
    }
    if (input.$date) {
      const d = new Date(input.$date);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const sec = input._seconds ?? input.seconds ?? input.sec;
    if (typeof sec === 'number') {
      const d = new Date(sec * 1000);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function toMillis(input) {
  const d = toDate(input);
  return d ? d.getTime() : 0;
}

function formatDate(input) {
  const d = toDate(input);
  if (!d || Number.isNaN(d.getTime())) return '';
  try {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = fmt.formatToParts(d);
    const get = (type) => (parts.find((p) => p.type === type) || {}).value || '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
  } catch (e) {
    const pad = (n) => String(n).padStart(2, '0');
    const t = d.getTime() + 8 * 60 * 60 * 1000;
    const z = new Date(t);
    return `${z.getUTCFullYear()}-${pad(z.getUTCMonth() + 1)}-${pad(z.getUTCDate())} ${pad(z.getUTCHours())}:${pad(z.getUTCMinutes())}`;
  }
}

function getPlaceholderNickname(openid) {
  const suffix = String(openid || '').slice(-6) || 'unknown';
  return `用户_${suffix}`;
}

function mapSourceLabel(fromSourceType) {
  const t = String(fromSourceType || '').trim();
  if (t === 'screenshot') return '截图风险';
  if (t === 'screenshot_archive') return '截图留档';
  if (t === 'session') return '会话可疑';
  return t || '可疑会话';
}

function buildRegionText(province, city, district) {
  return [province, city, district].filter(Boolean).join(' ') || '-';
}

function buildAddressDisplay(address) {
  const s = String(address || '').trim();
  if (!s) return '-';
  return s.length > 56 ? `${s.slice(0, 56)}...` : s;
}

function buildGeoText(latitude, longitude) {
  const hasGeo = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  return hasGeo ? `${latitude}, ${longitude}` : '-';
}

function extractFenxiPageVisits(doc) {
  if (!doc || typeof doc !== 'object') return {};
  const out = {};
  Object.keys(doc).forEach((key) => {
    if (key.startsWith('_')) return;
    if (['openid', 'createTime', 'updateTime', 'lastActiveAt'].includes(key)) return;
    const v = doc[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return;
    out[key] = (out[key] || 0) + v;
  });
  return out;
}

function pickNickname(...candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const n = String(candidates[i] || '').trim();
    if (n) return n;
  }
  return '';
}

async function fillViewerNicknames(users) {
  const openids = [...new Set(users.map((u) => u.viewerOpenid).filter(Boolean))];
  if (!openids.length) return users;

  const validMap = {};
  const logMap = {};
  const buttonMap = {};
  const userListMap = {};
  const BATCH = 100;

  for (let i = 0; i < openids.length; i += BATCH) {
    const batch = openids.slice(i, i + BATCH);
    const [validRes, userListRes, buttonRes, logResults] = await Promise.all([
      db.collection('valid_users').where({ _openid: _.in(batch) }).get(),
      db.collection('user_list').where({ _openid: _.in(batch) }).get(),
      db.collection('login_logbutton').where({ _openid: _.in(batch) }).get(),
      Promise.all(batch.map(async (openid) => {
        try {
          const logRes = await db.collection('login_logs')
            .where({ _openid: openid })
            .orderBy('updateTime', 'desc')
            .limit(1)
            .get();
          return { openid, log: (logRes.data && logRes.data[0]) || null };
        } catch (e) {
          return { openid, log: null };
        }
      }))
    ]);

    (validRes.data || []).forEach((row) => {
      if (row && row._openid && row.nickname) validMap[row._openid] = String(row.nickname).trim();
    });
    (userListRes.data || []).forEach((row) => {
      if (!row || !row._openid) return;
      const nick = row.nickName || row.nickname;
      if (nick) userListMap[row._openid] = String(nick).trim();
    });
    (buttonRes.data || []).forEach((row) => {
      if (row && row._openid && row.nickname) {
        const nick = String(row.nickname).trim();
        if (!buttonMap[row._openid] || buttonMap[row._openid].length < nick.length) {
          buttonMap[row._openid] = nick;
        }
      }
    });
    logResults.forEach(({ openid, log }) => {
      if (openid && log && log.nickname) {
        const nick = String(log.nickname).trim();
        if (!logMap[openid] || logMap[openid].length < nick.length) {
          logMap[openid] = nick;
        }
      }
    });
  }

  return users.map((u) => {
    const openid = u.viewerOpenid;
    const viewerNickname = pickNickname(
      validMap[openid],
      logMap[openid],
      buttonMap[openid],
      userListMap[openid],
      u.viewerNickname
    ) || getPlaceholderNickname(openid);
    return { ...u, viewerNickname };
  });
}

async function enrichFromSessionsAndFenxi(users) {
  const sessionKeys = [...new Set(users.map((u) => u.sessionRowKey).filter(Boolean))];
  const openids = [...new Set(users.map((u) => u.viewerOpenid).filter(Boolean))];
  const sessionMap = {};
  const fenxiMap = {};

  await Promise.all(sessionKeys.map(async (key) => {
    try {
      const res = await db.collection('suspicious_user_sessions').doc(key).get();
      if (res.data) sessionMap[key] = res.data;
    } catch (e) {}
  }));

  if (openids.length) {
    const BATCH = 100;
    for (let i = 0; i < openids.length; i += BATCH) {
      const batch = openids.slice(i, i + BATCH);
      try {
        const fenxiRes = await db.collection('fenxishuju').where({ _openid: _.in(batch) }).get();
        (fenxiRes.data || []).forEach((row) => {
          const openid = row && row._openid;
          if (!openid) return;
          const current = fenxiMap[openid] || {};
          const detail = extractFenxiPageVisits(row);
          Object.keys(detail).forEach((k) => {
            current[k] = (current[k] || 0) + detail[k];
          });
          fenxiMap[openid] = current;
        });
      } catch (e) {}
    }
  }

  return users.map((user) => {
    const session = user.sessionRowKey ? sessionMap[user.sessionRowKey] : null;
    const fenxiDetail = fenxiMap[user.viewerOpenid] || {};
    const enterCount = session
      ? Number(session.sessionCount || 0)
      : Number(user.enterCount || 0);
    const totalStayMinutes = session
      ? Number(session.totalStayMinutes || 0)
      : Number(user.totalStayMinutesText || user.totalStayMinutes || 0);
    const pageVisits = Object.values(fenxiDetail).reduce((sum, n) => sum + Number(n || 0), 0);
    const resolvedPageVisits = pageVisits || Number(user.sectionClicksTotal || user.pageVisitsCount || 0);
    const pageVisitsDetailList = Object.keys(fenxiDetail)
      .map((k) => ({
        pageKey: k,
        pageName: toChinesePageName(k),
        count: Number(fenxiDetail[k] || 0)
      }))
      .sort((a, b) => b.count - a.count);

    let triggerReasonText = user.triggerReasonText || '已无视';
    if (session) {
      const triggers = [];
      if (enterCount >= 3 || pageVisits >= 3) {
        triggers.push(`多次进入(会话${enterCount}次/页面访问${pageVisits}次)`);
      }
      if (totalStayMinutes >= 10) {
        triggers.push(`长时间停留(${totalStayMinutes.toFixed(2)}分钟)`);
      }
      if (triggers.length) triggerReasonText = triggers.join('；');
    } else if (user.triggerReasonText) {
      triggerReasonText = user.triggerReasonText;
    }

    return {
      ...user,
      enterCount,
      pageVisitsCount: resolvedPageVisits,
      totalStayMinutesText: totalStayMinutes.toFixed(2),
      totalVideoMinutesText: user.totalVideoMinutesText || '0.00',
      sectionClicksTotal: resolvedPageVisits,
      pageVisitsDetailList,
      triggerReasonText,
      shareCode: user.shareCode || '小程序访问',
      creatorNickname: user.creatorNickname || '-',
      lastViewTime: session
        ? (formatDate(session.lastActiveAt || session.updateTime) || user.ignoredAt)
        : user.lastViewTime || user.ignoredAt
    };
  });
}

function buildRowFromArchive(doc) {
  const openid = doc._openid || '';
  const province = doc.province || '';
  const city = doc.city || '';
  const district = doc.district || '';
  const address = String(doc.address || '').trim();
  const fromSourceType = doc.fromSourceType || 'session';
  const regionText = buildRegionText(province, city, district);
  const addressDisplay = buildAddressDisplay(address);
  const hasGeo = doc.latitude != null && doc.longitude != null && doc.latitude !== '' && doc.longitude !== '';
  const geoText = buildGeoText(doc.latitude, doc.longitude);
  const enterCount = Number(doc.enterCount || 0);
  const sectionClicksTotal = Number(doc.sectionClicksTotal || 0);
  const totalStayMinutes = Number(doc.totalStayMinutes || 0);
  return {
    rowKey: `ign_${doc._id || openid}`,
    archiveId: doc._id || '',
    riskId: doc.riskId || '',
    sessionRowKey: doc.rowKey || '',
    viewerOpenid: openid,
    viewerNickname: doc.viewerNickname || getPlaceholderNickname(openid),
    fromSourceType,
    sourceTypeLabel: mapSourceLabel(fromSourceType),
    shareCode: mapSourceLabel(fromSourceType),
    triggerReasonText: doc.triggerReasonText || (fromSourceType === 'screenshot'
      ? `截图行为（已无视）`
      : '可疑行为（已无视）'),
    ignoredAt: formatDate(doc.archivedAt || doc.updateTime || doc.createTime) || '-',
    ignoredAtTs: toMillis(doc.archivedAt || doc.updateTime || doc.createTime),
    regionText,
    address,
    addressDisplay,
    province,
    city,
    district,
    latitude: doc.latitude != null ? doc.latitude : null,
    longitude: doc.longitude != null ? doc.longitude : null,
    geoText,
    enterCount,
    sectionClicksTotal,
    pageVisitsCount: sectionClicksTotal,
    totalStayMinutesText: totalStayMinutes.toFixed(2),
    totalVideoMinutesText: '0.00',
    pageVisitsDetailList: [],
    lastViewTime: doc.lastViewTime || formatDate(doc.archivedAt || doc.updateTime) || '-'
  };
}

function buildRowFromScreenshotQueue(doc) {
  const openid = doc._openid || '';
  const province = doc.province || '';
  const city = doc.city || '';
  const district = doc.district || '';
  const address = String(doc.address || '').trim();
  const dailyCount = Number(doc.dailyCount || 0);
  const hourlyCount = Number(doc.hourlyCount || 0);
  return {
    rowKey: `ssign_${doc._id || openid}`,
    archiveId: '',
    riskId: doc._id || '',
    sessionRowKey: '',
    viewerOpenid: openid,
    viewerNickname: getPlaceholderNickname(openid),
    fromSourceType: 'screenshot',
    sourceTypeLabel: '截图风险',
    shareCode: '截图风险',
    triggerReasonText: `截图行为（24小时${dailyCount}次 / 1小时${hourlyCount}次）`,
    ignoredAt: formatDate(doc.updateTime || doc.createTime) || '-',
    ignoredAtTs: toMillis(doc.updateTime || doc.createTime),
    regionText: buildRegionText(province, city, district),
    address,
    addressDisplay: buildAddressDisplay(address),
    province,
    city,
    district,
    latitude: doc.latitude != null ? doc.latitude : null,
    longitude: doc.longitude != null ? doc.longitude : null,
    geoText: buildGeoText(doc.latitude, doc.longitude),
    enterCount: 0,
    sectionClicksTotal: 0,
    dailyCount,
    hourlyCount,
    totalStayMinutesText: '0.00',
    totalVideoMinutesText: '0.00',
    pageVisitsDetailList: [],
    lastViewTime: formatDate(doc.updateTime || doc.createTime) || '-'
  };
}

function buildRowFromSession(row) {
  const openid = row && (row._openid || row.openid) || '';
  const province = row.province || '';
  const city = row.city || '';
  const district = row.district || '';
  const address = String(row.address || '').trim();
  const enterCount = Number(row.snapshotEnterCount != null ? row.snapshotEnterCount : (row.sessionCount || 0));
  const sectionClicksTotal = Number(
    row.snapshotSectionClicksTotal != null ? row.snapshotSectionClicksTotal : 0
  );
  const totalStayMinutes = Number(
    row.snapshotTotalStayMinutes != null ? row.snapshotTotalStayMinutes : (row.totalStayMinutes || 0)
  );
  return {
    rowKey: `ign_${row._id || openid}`,
    archiveId: row._id || '',
    riskId: '',
    sessionRowKey: row._id || '',
    viewerOpenid: openid,
    viewerNickname: row.viewerNickname || getPlaceholderNickname(openid),
    fromSourceType: 'session',
    sourceTypeLabel: mapSourceLabel('session'),
    shareCode: '小程序访问',
    triggerReasonText: row.triggerReasonText || '可疑行为（已无视）',
    ignoredAt: formatDate(row.archivedAt || row.updateTime || row.createTime) || '-',
    ignoredAtTs: toMillis(row.archivedAt || row.updateTime || row.createTime),
    regionText: buildRegionText(province, city, district),
    address,
    addressDisplay: buildAddressDisplay(address),
    province,
    city,
    district,
    latitude: row.latitude != null ? row.latitude : null,
    longitude: row.longitude != null ? row.longitude : null,
    geoText: buildGeoText(row.latitude, row.longitude),
    enterCount,
    sectionClicksTotal,
    pageVisitsCount: sectionClicksTotal,
    totalStayMinutesText: totalStayMinutes.toFixed(2),
    totalVideoMinutesText: '0.00',
    pageVisitsDetailList: [],
    lastViewTime: row.lastViewTime || formatDate(row.lastActiveAt || row.updateTime) || '-'
  };
}

exports.main = async () => {
  try {
    await assertAdmin();

    const users = [];
    const seenKeys = new Set();
    const pushUser = (user) => {
      if (!user) return;
      const key = user.viewerOpenid || user.rowKey;
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      users.push(user);
    };

    try {
      let sessionRows = [];
      try {
        const sessionRes = await db.collection('suspicious_user_sessions')
          .where({ reviewDecision: 'ignore' })
          .limit(1000)
          .get();
        sessionRows = Array.isArray(sessionRes.data) ? sessionRes.data : [];
      } catch (queryErr) {
        const sessionRes = await db.collection('suspicious_user_sessions').limit(1000).get();
        sessionRows = (Array.isArray(sessionRes.data) ? sessionRes.data : [])
          .filter((row) => row && row.reviewDecision === 'ignore');
      }
      sessionRows
        .sort((a, b) => toMillis(b.archivedAt || b.updateTime) - toMillis(a.archivedAt || a.updateTime))
        .forEach((row) => pushUser(buildRowFromSession(row)));
    } catch (err) {
      const msg = String((err && err.message) || err || '');
      if (!msg.includes('collection not exists') && !msg.includes('Db or Table not exist')) {
        throw err;
      }
    }

    let archiveRows = [];
    try {
      const archiveRes = await db.collection('suspicious_review_archive').limit(1000).get();
      archiveRows = (Array.isArray(archiveRes.data) ? archiveRes.data : [])
        .filter((row) => row && row.decision === 'ignore')
        .sort((a, b) => toMillis(b.archivedAt || b.updateTime) - toMillis(a.archivedAt || a.updateTime));
    } catch (err) {
      const msg = String((err && err.message) || err || '');
      if (!msg.includes('collection not exists') && !msg.includes('Db or Table not exist')) {
        throw err;
      }
    }
    archiveRows.forEach((row) => pushUser(buildRowFromArchive(row)));

    const archivedRiskIds = new Set(
      users.map((row) => row && row.riskId).filter(Boolean)
    );

    let screenshotIgnoreRows = [];
    try {
      const shotRes = await db.collection('screenshot_risk_queue')
        .where({ status: 'resolved', decision: 'ignore' })
        .limit(800)
        .get();
      screenshotIgnoreRows = (shotRes.data || []).filter(
        (row) => row && row._id && !archivedRiskIds.has(row._id)
      );
      screenshotIgnoreRows.sort(
        (a, b) => toMillis(b.updateTime || b.createTime) - toMillis(a.updateTime || a.createTime)
      );
    } catch (err) {
      const msg = String((err && err.message) || err || '');
      if (!msg.includes('collection not exists') && !msg.includes('Db or Table not exist')) {
        throw err;
      }
    }
    screenshotIgnoreRows.forEach((row) => pushUser(buildRowFromScreenshotQueue(row)));

    users.sort((a, b) => (b.ignoredAtTs || 0) - (a.ignoredAtTs || 0));
    let filled = await fillViewerNicknames(users);
    filled = await enrichFromSessionsAndFenxi(filled);
    filled.sort(compareBySuspicionLevel);

    return {
      success: true,
      version: API_VERSION,
      users: filled
    };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限', version: API_VERSION, users: [] };
    }
    return { success: false, error: msg, version: API_VERSION, users: [] };
  }
};
