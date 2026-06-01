const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const API_VERSION = 'v2_sessions_fenxi_20260430';

const ENTER_THRESHOLD = 3;
const STAY_MINUTES_THRESHOLD = 10;
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

exports.main = async () => {
  try {
    await assertAdmin();

    const [sessionRes, fenxiRes, screenshotRiskRes] = await Promise.all([
      db.collection('suspicious_user_sessions').orderBy('lastActiveAt', 'desc').limit(500).get(),
      db.collection('fenxishuju').limit(1000).get(),
      db.collection('screenshot_risk_queue').where({ status: 'pending' }).orderBy('updateTime', 'desc').limit(500).get()
    ]);
    let screenshotArchiveRowsData = [];
    const manualHandledOpenids = new Set();
    try {
      const screenshotArchiveRes = await db.collection('suspicious_review_archive')
        .orderBy('updateTime', 'desc')
        .limit(500)
        .get();
      screenshotArchiveRowsData = Array.isArray(screenshotArchiveRes.data) ? screenshotArchiveRes.data : [];
      screenshotArchiveRowsData.forEach((row) => {
        if (
          row &&
          row.sourceType === 'suspicious_manual' &&
          row._openid &&
          (row.decision === 'ban' || row.decision === 'ignore')
        ) {
          manualHandledOpenids.add(row._openid);
        }
      });
      screenshotArchiveRowsData = screenshotArchiveRowsData.filter((row) => row && row.sourceType === 'screenshot_archive');
    } catch (archiveErr) {
      const archiveMsg = String((archiveErr && archiveErr.message) || archiveErr || '');
      if (!archiveMsg.includes('collection not exists') && !archiveMsg.includes('Db or Table not exist')) {
        throw archiveErr;
      }
    }

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

    users = users.filter((u) => !manualHandledOpenids.has(u.viewerOpenid));
    users = await fillViewerNicknames(users);
    const screenshotUsersRaw = buildScreenshotSuspiciousRows(
      Array.isArray(screenshotRiskRes.data) ? screenshotRiskRes.data : []
    );
    const screenshotUsers = await fillViewerNicknames(screenshotUsersRaw);
    users = users.concat(screenshotUsers);
    const screenshotArchiveRowsRaw = buildArchivedScreenshotRows(
      screenshotArchiveRowsData
    );
    const screenshotArchiveRows = await fillViewerNicknames(screenshotArchiveRowsRaw);
    users = users.concat(screenshotArchiveRows);
    const bannedOpenidSet = await fetchBannedOpenidSet(users);
    users = users.filter((u) => !bannedOpenidSet.has(u.viewerOpenid));
    users.sort((a, b) => (b.lastViewTs || 0) - (a.lastViewTs || 0));
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
