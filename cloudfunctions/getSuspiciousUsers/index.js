const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const API_VERSION = 'v2_sessions_fenxi_20260716';

const ENTER_THRESHOLD = 3;
const STAY_MINUTES_THRESHOLD = 30;

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
  dengluye: '\u767b\u5f55\u9875',
  chanpinye: '\u4ea7\u54c1\u9875',
  shangdianye: '\u5546\u5e97\u9875',
  anliye: '\u6848\u4f8b\u9875',
  gerenzhongxin: '\u4e2a\u4eba\u4e2d\u5fc3',
  shouye: '\u9996\u9875',
  paihangbang: '\u6392\u884c\u699c',
  weixiuzhongxin: '\u7ef4\u4fee\u4e2d\u5fc3',
  fengjingye: '\u5c01\u7981\u9875',
  guanliyuanye: '\u7ba1\u7406\u5458\u9875',
  guanliyuanjingjianye: '\u7ba1\u7406\u5458\u7cbe\u7b80\u9875',
  anzhuangjiaocheng: '\u5b89\u88c5\u6559\u7a0b',
  lianxieye: '\u8054\u7cfb\u9875',
  saomiaoye: '\u626b\u7801\u9875',
  otaye: 'OTA\u9875',
  xinyemian: '\u65b0\u9875\u9762'
};

function toChinesePageName(pageKey) {
  if (!pageKey) return '\u672a\u77e5\u9875\u9762';
  if (PAGE_LABEL_MAP[pageKey]) return PAGE_LABEL_MAP[pageKey];
  const routeNameMap = {
    index: '\u767b\u5f55\u9875',
    products: '\u4ea7\u54c1\u9875',
    shop: '\u5546\u5e97\u9875',
    case: '\u6848\u4f8b\u9875',
    my: '\u4e2a\u4eba\u4e2d\u5fc3',
    home: '\u9996\u9875',
    paihang: '\u6392\u884c\u699c',
    shouhou: '\u7ef4\u4fee\u4e2d\u5fc3',
    blocked: '\u5c01\u7981\u9875',
    admin: '\u7ba1\u7406\u5458\u9875',
    adminLite: '\u7ba1\u7406\u5458\u7cbe\u7b80\u9875',
    azjc: '\u5b89\u88c5\u6559\u7a0b',
    call: '\u8054\u7cfb\u9875',
    scan: '\u626b\u7801\u9875',
    ota: 'OTA\u9875',
    pagenew: '\u65b0\u9875\u9762'
  };
  if (routeNameMap[pageKey]) return routeNameMap[pageKey];
  return `\u9875\u9762(${pageKey})`;
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
    // fallback: assume UTC runtime, convert to UTC+8
    const t = d.getTime() + 8 * 60 * 60 * 1000;
    const z = new Date(t);
    return `${z.getUTCFullYear()}-${pad(z.getUTCMonth() + 1)}-${pad(z.getUTCDate())} ${pad(z.getUTCHours())}:${pad(z.getUTCMinutes())}`;
  }
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
      const ms = sec * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function toMillis(input) {
  const d = toDate(input);
  return d ? d.getTime() : 0;
}

function getPlaceholderNickname(openid) {
  const suffix = String(openid || '').slice(-6) || 'unknown';
  return `\u7528\u6237_${suffix}`;
}

function sumFenxiPageVisits(doc) {
  if (!doc || typeof doc !== 'object') return 0;
  return Object.keys(doc).reduce((total, key) => {
    if (key.startsWith('_')) return total;
    if (['openid', 'createTime', 'updateTime', 'lastActiveAt'].includes(key)) return total;
    const v = doc[key];
    return total + (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  }, 0);
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

function buildScreenshotSuspiciousRows(queueRows = []) {
  return (queueRows || []).map((row) => {
    const openid = row && row._openid ? row._openid : '';
    const province = row.province || '';
    const city = row.city || '';
    const district = row.district || '';
    const address = String(row.address || '').trim();
    const regionText = [province, city, district].filter(Boolean).join(' ') || '-';
    const addressDisplay = address ? (address.length > 56 ? `${address.slice(0, 56)}...` : address) : '-';
    const hasGeo = row.latitude != null && row.longitude != null && row.latitude !== '' && row.longitude !== '';
    const geoText = hasGeo ? `${row.latitude}, ${row.longitude}` : '-';
    const dailyCount = Number(row.dailyCount || 0);
    const hourlyCount = Number(row.hourlyCount || 0);
    return {
      rowKey: `ssq_${row._id || openid}`,
      sourceType: 'screenshot',
      riskId: row._id || '',
      viewerOpenid: openid,
      viewerNickname: getPlaceholderNickname(openid),
      creatorNickname: '-',
      shareCode: '截图风险',
      triggerReasonText: `截图行为（24小时${dailyCount}次 / 1小时${hourlyCount}次）`,
      enterCount: 0,
      pageVisitsCount: 0,
      totalStayMinutesText: '0.00',
      totalVideoMinutesText: '0.00',
      sectionClicksTotal: 0,
      dailyCount,
      hourlyCount,
      pageVisitsDetailList: [],
      lastViewTime: formatDate(row.lastScreenshotAt || row.updateTime || row.createTime) || '-',
      lastViewTs: toMillis(row.lastScreenshotAt || row.updateTime || row.createTime),
      regionText,
      address,
      addressDisplay,
      province,
      city,
      district,
      latitude: row.latitude != null ? row.latitude : null,
      longitude: row.longitude != null ? row.longitude : null,
      geoText
    };
  });
}

function buildArchivedScreenshotRows(queueRows = []) {
  return (queueRows || []).map((row) => {
    const openid = row && row._openid ? row._openid : '';
    const province = row.province || '';
    const city = row.city || '';
    const district = row.district || '';
    const address = String(row.address || '').trim();
    const regionText = [province, city, district].filter(Boolean).join(' ') || '-';
    const addressDisplay = address ? (address.length > 56 ? `${address.slice(0, 56)}...` : address) : '-';
    const hasGeo = row.latitude != null && row.longitude != null && row.latitude !== '' && row.longitude !== '';
    const geoText = hasGeo ? `${row.latitude}, ${row.longitude}` : '-';
    const dailyCount = Number(row.dailyCount || 0);
    const hourlyCount = Number(row.hourlyCount || 0);
    const decisionText = row.decision === 'ban' ? '已封禁留档' : '已处理留档';
    return {
      rowKey: `ssqa_${row._id || row.riskId || openid}`,
      sourceType: 'screenshot_archive',
      riskId: row.riskId || '',
      viewerOpenid: openid,
      viewerNickname: getPlaceholderNickname(openid),
      creatorNickname: '-',
      shareCode: '截图留档',
      triggerReasonText: `${decisionText}（24小时${dailyCount}次 / 1小时${hourlyCount}次）`,
      enterCount: 0,
      pageVisitsCount: 0,
      totalStayMinutesText: '0.00',
      totalVideoMinutesText: '0.00',
      sectionClicksTotal: 0,
      pageVisitsDetailList: [],
      lastViewTime: formatDate(row.archivedAt || row.updateTime || row.createTime) || '-',
      lastViewTs: toMillis(row.archivedAt || row.updateTime || row.createTime),
      regionText,
      address,
      addressDisplay,
      province,
      city,
      district,
      latitude: row.latitude != null ? row.latitude : null,
      longitude: row.longitude != null ? row.longitude : null,
      geoText
    };
  });
}

function pickNickname(...candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const n = String(candidates[i] || '').trim();
    if (n) return n;
  }
  return '';
}

/** 与 getBannedUsers 一致：优先白名单/登录日志，避免仅 user_list 微信短昵称（如单字 J） */
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
    const [validRes, userListRes, buttonRes] = await Promise.all([
      db.collection('valid_users').where({ _openid: _.in(batch) }).field({ _openid: true, nickname: true }).get(),
      db.collection('user_list').where({ _openid: _.in(batch) }).field({ _openid: true, nickName: true, nickname: true }).get(),
      db.collection('login_logbutton').where({ _openid: _.in(batch) }).field({ _openid: true, nickname: true }).get()
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

    const needLogs = batch.filter((openid) => !validMap[openid] && !buttonMap[openid]);
    if (needLogs.length) {
      try {
        const logRes = await db.collection('login_logs')
          .where({ _openid: _.in(needLogs) })
          .field({ _openid: true, nickname: true })
          .limit(100)
          .get();
        (logRes.data || []).forEach((log) => {
          if (!log || !log._openid || !log.nickname) return;
          const nick = String(log.nickname).trim();
          if (!nick) return;
          if (!logMap[log._openid] || logMap[log._openid].length < nick.length) {
            logMap[log._openid] = nick;
          }
        });
      } catch (e) {
        // 昵称回退到 user_list / 占位名即可，避免逐条查询拖垮 3s 超时
      }
    }
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

async function fetchBannedOpenidSet(candidates = []) {
  const openids = [...new Set((candidates || []).map((u) => u && u.viewerOpenid).filter(Boolean))];
  if (!openids.length) return new Set();
  const banned = new Set();
  const BATCH = 100;
  for (let i = 0; i < openids.length; i += BATCH) {
    const batch = openids.slice(i, i + BATCH);
    const res = await db.collection('login_logbutton')
      .where({ _openid: _.in(batch), isBanned: true })
      .field({ _openid: true })
      .get();
    (res.data || []).forEach((row) => {
      if (row && row._openid) banned.add(row._openid);
    });
  }
  return banned;
}

function buildIgnoredRowFromArchive(doc) {
  const openid = doc._openid || '';
  const province = doc.province || '';
  const city = doc.city || '';
  const district = doc.district || '';
  const address = String(doc.address || '').trim();
  const fromSourceType = doc.fromSourceType || 'session';
  const regionText = [province, city, district].filter(Boolean).join(' ') || '-';
  const addressDisplay = address ? (address.length > 56 ? `${address.slice(0, 56)}...` : address) : '-';
  const hasGeo = doc.latitude != null && doc.longitude != null && doc.latitude !== '' && doc.longitude !== '';
  const geoText = hasGeo ? `${doc.latitude}, ${doc.longitude}` : '-';
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
    sourceTypeLabel: fromSourceType === 'screenshot' ? '截图风险' : '会话可疑',
    shareCode: fromSourceType === 'screenshot' ? '截图风险' : '小程序访问',
    triggerReasonText: doc.triggerReasonText || (fromSourceType === 'screenshot' ? '截图行为（已无视）' : '可疑行为（已无视）'),
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

function buildIgnoredRowFromSession(row, fenxiStat = { total: 0, detail: {} }) {
  const openid = row && (row._openid || row.openid) || '';
  const province = row.province || '';
  const city = row.city || '';
  const district = row.district || '';
  const address = String(row.address || '').trim();
  const regionText = [province, city, district].filter(Boolean).join(' ') || '-';
  const addressDisplay = address ? (address.length > 56 ? `${address.slice(0, 56)}...` : address) : '-';
  const hasGeo = row.latitude != null && row.longitude != null && row.latitude !== '' && row.longitude !== '';
  const geoText = hasGeo ? `${row.latitude}, ${row.longitude}` : '-';
  const enterCount = Number(row.snapshotEnterCount != null ? row.snapshotEnterCount : (row.sessionCount || 0));
  const pageVisits = Number(
    row.snapshotSectionClicksTotal != null ? row.snapshotSectionClicksTotal : (fenxiStat.total || 0)
  );
  const totalStayMinutes = Number(
    row.snapshotTotalStayMinutes != null ? row.snapshotTotalStayMinutes : (row.totalStayMinutes || 0)
  );
  const pageVisitsDetailList = Object.keys(fenxiStat.detail || {})
    .map((k) => ({
      pageKey: k,
      pageName: toChinesePageName(k),
      count: Number(fenxiStat.detail[k] || 0)
    }))
    .sort((a, b) => b.count - a.count);
  let triggerReasonText = row.triggerReasonText || '';
  if (!triggerReasonText) {
    const triggers = [];
    if (enterCount >= ENTER_THRESHOLD || pageVisits >= ENTER_THRESHOLD) {
      triggers.push(`多次进入(会话${enterCount}次/页面访问${pageVisits}次)`);
    }
    if (totalStayMinutes >= STAY_MINUTES_THRESHOLD) {
      triggers.push(`长时间停留(${totalStayMinutes.toFixed(2)}分钟)`);
    }
    triggerReasonText = triggers.length ? triggers.join('；') : '可疑行为（已无视）';
  }
  return {
    rowKey: `ign_${row._id || openid}`,
    archiveId: row._id || '',
    riskId: '',
    sessionRowKey: row._id || '',
    viewerOpenid: openid,
    viewerNickname: row.viewerNickname || getPlaceholderNickname(openid),
    fromSourceType: 'session',
    sourceTypeLabel: '会话可疑',
    shareCode: '小程序访问',
    triggerReasonText,
    ignoredAt: formatDate(row.archivedAt || row.updateTime || row.createTime) || '-',
    ignoredAtTs: toMillis(row.archivedAt || row.updateTime || row.createTime),
    regionText,
    address,
    addressDisplay,
    province,
    city,
    district,
    latitude: row.latitude != null ? row.latitude : null,
    longitude: row.longitude != null ? row.longitude : null,
    geoText,
    enterCount,
    sectionClicksTotal: pageVisits,
    pageVisitsCount: pageVisits,
    totalStayMinutesText: totalStayMinutes.toFixed(2),
    totalVideoMinutesText: '0.00',
    pageVisitsDetailList,
    lastViewTime: row.lastViewTime || formatDate(row.lastActiveAt || row.updateTime) || '-'
  };
}

async function fetchIgnoredUsersOnly() {
  const users = [];
  const seenKeys = new Set();

  const pushUser = (user) => {
    if (!user) return;
    const key = user.viewerOpenid || user.rowKey;
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    users.push(user);
  };

  let fenxiMap = {};
  try {
    const fenxiRes = await db.collection('fenxishuju').limit(1000).get();
    (fenxiRes.data || []).forEach((row) => {
      const openid = row && (row._openid || row.openid);
      if (!openid) return;
      const current = fenxiMap[openid] || { total: 0, detail: {} };
      const detail = extractFenxiPageVisits(row);
      current.total += sumFenxiPageVisits(row);
      Object.keys(detail).forEach((k) => {
        current.detail[k] = (current.detail[k] || 0) + detail[k];
      });
      fenxiMap[openid] = current;
    });
  } catch (fenxiErr) {
    const fenxiMsg = String((fenxiErr && fenxiErr.message) || fenxiErr || '');
    if (!fenxiMsg.includes('collection not exists') && !fenxiMsg.includes('Db or Table not exist')) {
      throw fenxiErr;
    }
  }

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
      .forEach((row) => {
        const openid = row && (row._openid || row.openid);
        pushUser(buildIgnoredRowFromSession(row, fenxiMap[openid] || { total: 0, detail: {} }));
      });
  } catch (sessionErr) {
    const sessionMsg = String((sessionErr && sessionErr.message) || sessionErr || '');
    if (!sessionMsg.includes('collection not exists') && !sessionMsg.includes('Db or Table not exist')) {
      throw sessionErr;
    }
  }

  try {
    const archiveRes = await db.collection('suspicious_review_archive').limit(1000).get();
    (Array.isArray(archiveRes.data) ? archiveRes.data : [])
      .filter((row) => row && row.decision === 'ignore' && row.sourceType !== 'banned_manual')
      .sort((a, b) => toMillis(b.archivedAt || b.updateTime) - toMillis(a.archivedAt || a.updateTime))
      .forEach((row) => pushUser(buildIgnoredRowFromArchive(row)));
  } catch (archiveErr) {
    const archiveMsg = String((archiveErr && archiveErr.message) || archiveErr || '');
    if (!archiveMsg.includes('collection not exists') && !archiveMsg.includes('Db or Table not exist')) {
      throw archiveErr;
    }
  }

  try {
    const shotRes = await db.collection('screenshot_risk_queue')
      .where({ status: 'resolved', decision: 'ignore' })
      .limit(800)
      .get();
    (shotRes.data || [])
      .sort((a, b) => toMillis(b.updateTime || b.createTime) - toMillis(a.updateTime || a.createTime))
      .forEach((row) => {
        const openid = row && row._openid ? row._openid : '';
        pushUser({
          rowKey: `ign_ss_${row._id || openid}`,
          archiveId: '',
          riskId: row._id || '',
          sessionRowKey: '',
          viewerOpenid: openid,
          viewerNickname: getPlaceholderNickname(openid),
          fromSourceType: 'screenshot',
          sourceTypeLabel: '截图风险',
          shareCode: '截图风险',
          triggerReasonText: `截图行为（24小时${Number(row.dailyCount || 0)}次 / 1小时${Number(row.hourlyCount || 0)}次）`,
          ignoredAt: formatDate(row.updateTime || row.createTime) || '-',
          ignoredAtTs: toMillis(row.updateTime || row.createTime),
          regionText: [row.province, row.city, row.district].filter(Boolean).join(' ') || '-',
          address: String(row.address || '').trim(),
          addressDisplay: String(row.address || '').trim() || '-',
          province: row.province || '',
          city: row.city || '',
          district: row.district || '',
          latitude: row.latitude != null ? row.latitude : null,
          longitude: row.longitude != null ? row.longitude : null,
          geoText: row.latitude != null && row.longitude != null ? `${row.latitude}, ${row.longitude}` : '-',
          enterCount: 0,
          sectionClicksTotal: 0,
          pageVisitsCount: 0,
          dailyCount: Number(row.dailyCount || 0),
          hourlyCount: Number(row.hourlyCount || 0),
          totalStayMinutesText: '0.00',
          totalVideoMinutesText: '0.00',
          pageVisitsDetailList: [],
          lastViewTime: formatDate(row.updateTime || row.createTime) || '-'
        });
      });
  } catch (shotErr) {
    const shotMsg = String((shotErr && shotErr.message) || shotErr || '');
    if (!shotMsg.includes('collection not exists') && !shotMsg.includes('Db or Table not exist')) {
      throw shotErr;
    }
  }

  users.sort(compareBySuspicionLevel);
  const filled = await fillViewerNicknames(users);
  return {
    success: true,
    version: `${API_VERSION}_ignored`,
    users: filled
  };
}

exports.main = async (event = {}) => {
  try {
    await assertAdmin();
    if (event && event.scope === 'ignored_only') {
      return await fetchIgnoredUsersOnly();
    }

    const safeGet = async (label, fn) => {
      try {
        return await fn();
      } catch (err) {
        const msg = String((err && err.message) || err || '');
        if (msg.includes('collection not exists') || msg.includes('Db or Table not exist')) {
          return { data: [] };
        }
        if (label === 'sessions-ordered' || label === 'screenshot-ordered') {
          return null;
        }
        throw err;
      }
    };

    let [sessionRes, fenxiRes, screenshotRiskRes, screenshotArchiveRes] = await Promise.all([
      safeGet('sessions-ordered', () => db.collection('suspicious_user_sessions').orderBy('lastActiveAt', 'desc').limit(500).get()),
      safeGet('fenxi', () => db.collection('fenxishuju').limit(1000).get()),
      safeGet('screenshot-ordered', () => db.collection('screenshot_risk_queue').where({ status: 'pending' }).orderBy('updateTime', 'desc').limit(500).get()),
      safeGet('archive', () => db.collection('suspicious_review_archive').limit(1000).get())
    ]);
    if (!sessionRes) {
      sessionRes = await safeGet('sessions', () => db.collection('suspicious_user_sessions').limit(500).get());
    }
    if (!screenshotRiskRes) {
      screenshotRiskRes = await safeGet('screenshot', () => db.collection('screenshot_risk_queue').where({ status: 'pending' }).limit(500).get());
    }

    let screenshotArchiveRowsData = [];
    const manualHandledOpenids = new Set();
    const manualHandledRowKeys = new Set();
    const allArchiveRows = Array.isArray(screenshotArchiveRes && screenshotArchiveRes.data) ? screenshotArchiveRes.data : [];
    allArchiveRows.forEach((row) => {
      if (!row || (row.decision !== 'ban' && row.decision !== 'ignore')) return;
      if (row.sourceType === 'suspicious_manual') {
        if (row._openid) manualHandledOpenids.add(row._openid);
        if (row.rowKey) manualHandledRowKeys.add(row.rowKey);
      }
    });
    screenshotArchiveRowsData = allArchiveRows.filter((row) => row && row.sourceType === 'screenshot_archive');

    const sessionRows = Array.isArray(sessionRes.data) ? sessionRes.data : [];
    const fenxiRows = Array.isArray(fenxiRes.data) ? fenxiRes.data : [];

    const fenxiMap = {};
    fenxiRows.forEach((row) => {
      const openid = row && (row._openid || row.openid);
      if (!openid) return;
      const current = fenxiMap[openid] || { total: 0, detail: {} };
      const detail = extractFenxiPageVisits(row);
      current.total += sumFenxiPageVisits(row);
      Object.keys(detail).forEach((k) => {
        current.detail[k] = (current.detail[k] || 0) + detail[k];
      });
      fenxiMap[openid] = current;
    });

    let users = sessionRows.map((row) => {
      const openid = row && (row._openid || row.openid) || '';
      if (row && (row.reviewStatus === 'archived' || row.reviewDecision === 'ignore' || row.reviewDecision === 'ban')) {
        return null;
      }
      if (openid && manualHandledOpenids.has(openid)) return null;
      if (row && row._id && manualHandledRowKeys.has(row._id)) return null;
      const totalStayMinutes = Number(row.totalStayMinutes || 0);
      const enterCount = Number(row.sessionCount || 0);
      const fenxiStat = fenxiMap[openid] || { total: 0, detail: {} };
      const pageVisits = Number(fenxiStat.total || 0);
      const triggers = [];
      if (enterCount >= ENTER_THRESHOLD || pageVisits >= ENTER_THRESHOLD) {
        triggers.push(`\u591a\u6b21\u8fdb\u5165(\u4f1a\u8bdd${enterCount}\u6b21/\u9875\u9762\u8bbf\u95ee${pageVisits}\u6b21)`);
      }
      if (totalStayMinutes >= STAY_MINUTES_THRESHOLD) {
        triggers.push(`\u957f\u65f6\u95f4\u505c\u7559(${totalStayMinutes.toFixed(2)}\u5206\u949f)`);
      }
      if (!triggers.length) return null;

      const province = row.province || '';
      const city = row.city || '';
      const district = row.district || '';
      const address = String(row.address || '').trim();
      const regionText = [province, city, district].filter(Boolean).join(' ') || '-';
      const addressDisplay = address ? (address.length > 56 ? `${address.slice(0, 56)}...` : address) : '-';
      const hasGeo = row.latitude != null && row.longitude != null && row.latitude !== '' && row.longitude !== '';
      const geoText = hasGeo ? `${row.latitude}, ${row.longitude}` : '-';
      const pageVisitsDetailList = Object.keys(fenxiStat.detail || {})
        .map((k) => ({
          pageKey: k,
          pageName: toChinesePageName(k),
          count: Number(fenxiStat.detail[k] || 0)
        }))
        .sort((a, b) => b.count - a.count);
      return {
        rowKey: row._id || openid,
        sourceType: 'session',
        viewerOpenid: openid,
        viewerNickname: getPlaceholderNickname(openid),
        creatorNickname: '-',
        shareCode: '\u5c0f\u7a0b\u5e8f\u8bbf\u95ee',
        triggerReasonText: triggers.join('\uff1b'),
        enterCount: enterCount,
        pageVisitsCount: pageVisits,
        totalStayMinutesText: totalStayMinutes.toFixed(2),
        totalVideoMinutesText: '0.00',
        sectionClicksTotal: pageVisits,
        pageVisitsDetailList,
        lastViewTime: formatDate(row.lastActiveAt || row.updateTime || row.createTime) || '-',
        lastViewTs: toMillis(row.lastActiveAt || row.updateTime || row.createTime),
        regionText,
        address,
        addressDisplay,
        province,
        city,
        district,
        latitude: row.latitude != null ? row.latitude : null,
        longitude: row.longitude != null ? row.longitude : null,
        geoText
      };
    }).filter(Boolean);

    users = users.concat(
      buildScreenshotSuspiciousRows(Array.isArray(screenshotRiskRes.data) ? screenshotRiskRes.data : []),
      buildArchivedScreenshotRows(screenshotArchiveRowsData)
    );
    const [filledUsers, bannedOpenidSet] = await Promise.all([
      fillViewerNicknames(users),
      fetchBannedOpenidSet(users)
    ]);
    users = filledUsers.filter((u) => !bannedOpenidSet.has(u.viewerOpenid));
    users.sort(compareBySuspicionLevel);
    return {
      success: true,
      version: API_VERSION,
      stats: {
        sessionRows: sessionRows.length,
        fenxiRows: fenxiRows.length
      },
      users
    };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, error: '???????', version: API_VERSION, users: [] };
    }
    if (msg.includes('collection not exists')) {
      return { success: true, version: API_VERSION, stats: { sessionRows: 0, fenxiRows: 0 }, users: [] };
    }
    return { success: false, error: msg, version: API_VERSION, users: [] };
  }
};
