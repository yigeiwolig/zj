const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get()
  if (byOpenid.data.length > 0) return OPENID
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return OPENID
  throw new Error('FORBIDDEN')
}

exports.main = async (event) => {
  const riskId = event && event.riskId
  const action = event && event.action // ban | ignore
  if (!riskId || !action) return { success: false, error: 'MISSING_PARAMS' }

  try {
    await assertAdmin()

    const riskRes = await db.collection('screenshot_risk_queue').doc(riskId).get()
    const risk = riskRes.data
    if (!risk) return { success: false, error: 'RISK_NOT_FOUND' }

    const openid = risk._openid
    if (!openid) return { success: false, error: 'OPENID_NOT_FOUND' }

    if (action === 'ban') {
      const buttonRes = await db.collection('login_logbutton')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()

      const updateData = {
        isBanned: true,
        banReason: 'screenshot',
        banPage: risk.page || 'scan',
        updateTime: db.serverDate()
      }

      if (buttonRes.data && buttonRes.data.length > 0) {
        await db.collection('login_logbutton').doc(buttonRes.data[0]._id).update({ data: updateData })
      } else {
        await db.collection('login_logbutton').add({
          data: {
            _openid: openid,
            ...updateData,
            bypassLocationCheck: false,
            qiangli: false,
            createTime: db.serverDate()
          }
        })
      }

      // 截图封禁留档：保存在可疑处理留档集合，便于后续在“可疑人员处理”页追溯
      const archivePayload = {
        riskId,
        _openid: openid,
        page: risk.page || 'scan',
        dateKey: risk.dateKey || '',
        hourlyCount: Number(risk.hourlyCount || 0),
        dailyCount: Number(risk.dailyCount || 0),
        reason: risk.reason || '',
        province: risk.province || '',
        city: risk.city || '',
        district: risk.district || '',
        address: risk.address || '',
        latitude: risk.latitude != null ? risk.latitude : null,
        longitude: risk.longitude != null ? risk.longitude : null,
        decision: 'ban',
        sourceType: 'screenshot_archive',
        status: 'archived',
        archivedAt: db.serverDate(),
        updateTime: db.serverDate()
      };
      let archiveExisting = null;
      try {
        const archiveRes = await db.collection('suspicious_review_archive')
          .where({ riskId })
          .limit(1)
          .get();
        archiveExisting = archiveRes.data && archiveRes.data.length > 0 ? archiveRes.data[0] : null;
      } catch (archiveQueryErr) {
        const archiveMsg = String((archiveQueryErr && archiveQueryErr.message) || archiveQueryErr || '');
        if (!archiveMsg.includes('collection not exists') && !archiveMsg.includes('Db or Table not exist')) {
          throw archiveQueryErr;
        }
      }
      try {
        if (archiveExisting && archiveExisting._id) {
          await db.collection('suspicious_review_archive')
            .doc(archiveExisting._id)
            .update({ data: archivePayload });
        } else {
          await db.collection('suspicious_review_archive').add({
            data: {
              ...archivePayload,
              createTime: db.serverDate()
            }
          });
        }
      } catch (archiveWriteErr) {
        const archiveWriteMsg = String((archiveWriteErr && archiveWriteErr.message) || archiveWriteErr || '');
        // 留档集合不存在时不阻塞主流程（封禁/放行）
        if (!archiveWriteMsg.includes('collection not exists') && !archiveWriteMsg.includes('Db or Table not exist')) {
          throw archiveWriteErr;
        }
      }
    }

    if (action === 'ignore') {
      const archivePayload = {
        riskId,
        _openid: openid,
        page: risk.page || 'scan',
        dateKey: risk.dateKey || '',
        hourlyCount: Number(risk.hourlyCount || 0),
        dailyCount: Number(risk.dailyCount || 0),
        reason: risk.reason || '',
        province: risk.province || '',
        city: risk.city || '',
        district: risk.district || '',
        address: risk.address || '',
        latitude: risk.latitude != null ? risk.latitude : null,
        longitude: risk.longitude != null ? risk.longitude : null,
        decision: 'ignore',
        sourceType: 'suspicious_manual',
        fromSourceType: 'screenshot',
        status: 'archived',
        archivedAt: db.serverDate(),
        updateTime: db.serverDate()
      };
      let archiveExisting = null;
      try {
        const archiveRes = await db.collection('suspicious_review_archive')
          .where({ riskId })
          .limit(1)
          .get();
        archiveExisting = archiveRes.data && archiveRes.data.length > 0 ? archiveRes.data[0] : null;
      } catch (archiveQueryErr) {
        const archiveMsg = String((archiveQueryErr && archiveQueryErr.message) || archiveQueryErr || '');
        if (!archiveMsg.includes('collection not exists') && !archiveMsg.includes('Db or Table not exist')) {
          throw archiveQueryErr;
        }
      }
      try {
        if (archiveExisting && archiveExisting._id) {
          await db.collection('suspicious_review_archive')
            .doc(archiveExisting._id)
            .update({ data: archivePayload });
        } else {
          await db.collection('suspicious_review_archive').add({
            data: {
              ...archivePayload,
              createTime: db.serverDate()
            }
          });
        }
      } catch (archiveWriteErr) {
        const archiveWriteMsg = String((archiveWriteErr && archiveWriteErr.message) || archiveWriteErr || '');
        if (!archiveWriteMsg.includes('collection not exists') && !archiveWriteMsg.includes('Db or Table not exist')) {
          throw archiveWriteErr;
        }
      }
    }

    await db.collection('screenshot_risk_queue').doc(riskId).update({
      data: {
        status: 'resolved',
        decision: action === 'ban' ? 'ban' : 'ignore',
        updateTime: db.serverDate()
      }
    })

    return { success: true }
  } catch (err) {
    if (String(err && err.message).includes('UNAUTHORIZED') || String(err && err.message).includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' }
    }
    return { success: false, error: err.message || String(err) }
  }
}

