const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const BAN_REASON_TEXT = {
  screenshot: '截屏封号',
  screen_record: '录屏封号',
  location_blocked: '定位异常',
  nickname_verify_fail: '昵称审核失败',
  suspicious_manual: '可疑人员手动封禁',
  screenshot_risk_review: '截图审核封禁'
};

const BAN_PAGE_TEXT = {
  case: '案例页',
  my: '个人中心',
  products: '产品页',
  shop: '商店页',
  home: '首页',
  paihang: '排行榜',
  shouhou: '维修中心',
  index: '登录页',
  blocked: '封禁页',
  admin: '管理员页',
  adminLite: '管理员精简页',
  azjc: '安装教程',
  call: '联系页',
  scan: '扫描页',
  ota: 'OTA页',
  pagenew: '新页面'
};

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
        .where({
          _openid: openid,
          sourceType: 'banned_manual'
        })
        .limit(50)
        .get();
      const rows = byOpenid.data || [];
      if (rows.length) {
        existed = rows.sort((a, b) => {
          const ta = a.archivedAt || a.updateTime || 0;
          const tb = b.archivedAt || b.updateTime || 0;
          return tb - ta;
        })[0];
      }
    }
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (!msg.includes('collection not exists') && !msg.includes('Db or Table not exist')) {
      throw err;
    }
  }

  try {
    if (existed && existed._id) {
      await db.collection('suspicious_review_archive').doc(existed._id).update({ data: payload });
      return { ok: true, id: existed._id };
    }
    const addRes = await db.collection('suspicious_review_archive').add({
      data: {
        ...payload,
        createTime: db.serverDate()
      }
    });
    return { ok: true, id: addRes._id };
  } catch (err) {
    const msg = String((err && err.message) || err || '');
    if (msg.includes('collection not exists') || msg.includes('Db or Table not exist')) {
      return { ok: false, error: 'ARCHIVE_COLLECTION_MISSING' };
    }
    throw err;
  }
}

function mapBanReasonText(reason) {
  return BAN_REASON_TEXT[reason] || reason || '未知原因';
}

function mapBanPageText(page) {
  return BAN_PAGE_TEXT[page] || page || '未知页面';
}

exports.main = async (event = {}) => {
  const action = event.action;
  const buttonId = event.buttonId || '';
  const snapshot = event.snapshot || {};

  if (!action || !['ignore', 'ban'].includes(action)) {
    return { success: false, error: 'INVALID_ACTION' };
  }
  if (!buttonId) {
    return { success: false, error: 'MISSING_BUTTON_ID' };
  }

  try {
    await assertAdmin();
    const btnRes = await db.collection('login_logbutton').doc(buttonId).get();
    const button = btnRes.data;
    if (!button) {
      return { success: false, error: 'NOT_FOUND' };
    }

    const openid = button._openid || '';
    const banReason = snapshot.banReason || button.banReason || '';
    const banPage = snapshot.banPage || button.banPage || '';
    const banReasonText = snapshot.banReasonText || mapBanReasonText(banReason);
    const banPageText = snapshot.banPageText || mapBanPageText(banPage);
    const archiveRowKey = `banned_${buttonId}`;

    if (action === 'ignore') {
      await db.collection('login_logbutton').doc(buttonId).update({
        data: {
          isBanned: false,
          updateTime: db.serverDate()
        }
      });

      const archiveResult = await upsertArchive({
        rowKey: archiveRowKey,
        buttonId,
        _openid: openid,
        viewerNickname: button.nickname || snapshot.nickname || '',
        sourceType: 'banned_manual',
        fromSourceType: banReason || 'banned',
        decision: 'ignore',
        status: 'archived',
        banReason,
        banPage,
        banReasonText,
        banPageText,
        triggerReasonText: snapshot.triggerReasonText || `${banReasonText}（已无视）`,
        totalVisits: Number(snapshot.totalVisits || 0),
        failCount: Number(snapshot.failCount || 0),
        phoneModel: snapshot.phoneModel || '',
        province: button.province || snapshot.province || '',
        city: button.city || snapshot.city || '',
        district: button.district || snapshot.district || '',
        address: button.address || snapshot.address || '',
        latitude: button.latitude != null ? button.latitude : (snapshot.latitude != null ? snapshot.latitude : null),
        longitude: button.longitude != null ? button.longitude : (snapshot.longitude != null ? snapshot.longitude : null),
        bannedAt: snapshot.bannedAt || '',
        archivedAt: db.serverDate(),
        updateTime: db.serverDate()
      });

      return {
        success: true,
        archiveOk: !!(archiveResult && archiveResult.ok),
        archiveId: (archiveResult && archiveResult.id) || '',
        archiveError: archiveResult && archiveResult.ok ? '' : ((archiveResult && archiveResult.error) || 'ARCHIVE_FAILED')
      };
    }

    await db.collection('login_logbutton').doc(buttonId).update({
      data: {
        isBanned: true,
        banReason: banReason || button.banReason || 'manual',
        banPage: banPage || button.banPage || 'index',
        updateTime: db.serverDate()
      }
    });

    try {
      const archiveRes = await db.collection('suspicious_review_archive').where({ rowKey: archiveRowKey }).limit(1).get();
      if (archiveRes.data && archiveRes.data[0] && archiveRes.data[0]._id) {
        await db.collection('suspicious_review_archive').doc(archiveRes.data[0]._id).update({
          data: {
            decision: 'ban',
            status: 're-banned',
            updateTime: db.serverDate()
          }
        });
      }
    } catch (archiveErr) {
      const msg = String((archiveErr && archiveErr.message) || archiveErr || '');
      if (!msg.includes('collection not exists') && !msg.includes('Db or Table not exist')) {
        throw archiveErr;
      }
    }

    return { success: true, archiveOk: true };
  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: err.message || String(err) };
  }
};
