// cloudfunctions/checkUnlockStatus/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  try {
    // ==========================================================
    // 🔴 统一封禁逻辑：只检查 login_logs
    // ==========================================================
    const logRes = await db.collection('login_logs')
      .where({ _openid: OPENID })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get()

    // 如果没有登录记录，说明还没开始验证，让他回去
    if (logRes.data.length === 0) {
      return { action: 'RETRY' }
    }

    const record = logRes.data[0]
    
    // 🔴 核心：检查 login_logs 中的 isBanned 状态
    if (record.isBanned === true) {
      // 如果被封禁，直接让前端等待，除非管理员手动解封
      return { action: 'WAIT', msg: '全局封禁中' };
    }

    // --- 场景 A: 管理员开启【自动录入】 ---
    if (record.autoEntry === true) {
      const nickname = record.nickname || ''
      if (!nickname) return { action: 'WAIT' }

      // 搬运到 valid_users
      const validCheck = await db.collection('valid_users').where({ nickname: nickname }).get()
      if (validCheck.data.length === 0) {
        await db.collection('valid_users').add({
          data: {
            nickname: nickname,
            _openid: OPENID,
            createTime: db.serverDate(),
            updateTime: db.serverDate(),
            desc: '管理员放行'
          }
        })
      }

      // 解锁
      await db.collection('login_logs').doc(record._id).update({
        data: { isBanned: false, attemptCount: 0, autoEntry: false, updateTime: db.serverDate() }
      })

      return { action: 'PASS', nickname: nickname }
    }

    // --- 场景 B: 管理员开启【允许重试】 ---
    if (record.allowRetry === true) {
      await db.collection('login_logs').doc(record._id).update({
        data: { isBanned: false, attemptCount: 0, allowRetry: false, updateTime: db.serverDate() }
      })
      return { action: 'RETRY' }
    }

    // --- 场景 C: 普通解封检测 ---
    // 如果 login_logs 里显示没封号 (isBanned: false)，且尝试次数未超限
    if (record.isBanned === false && record.attemptCount < 4) {
      return { action: 'RETRY' }
    }

    return { action: 'WAIT' }

  } catch (err) {
    console.error(err)
    return { action: 'WAIT', error: err }
  }
}
