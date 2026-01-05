const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取所有被封禁的用户（isBanned = true）
    const buttonRes = await db.collection('login_logbutton')
      .where({
        isBanned: true
      })
      .orderBy('updateTime', 'desc')
      .get();

    if (!buttonRes.data || buttonRes.data.length === 0) {
      return { success: true, users: [] };
    }

    // 获取所有 openid
    const openids = buttonRes.data.map(item => item._openid);
    
    // 并行查询 login_logs 和 fenxishuju
    // 注意：由于每个用户可能有多个 login_logs 记录，我们需要分别查询每个用户的最新记录
    const visitRes = await db.collection('fenxishuju')
      .where({
        _openid: db.command.in(openids)
      })
      .get();

    // 为每个用户查询最新的 login_logs 记录（并行查询）
    const logPromises = buttonRes.data.map(async (button) => {
      try {
        const logRes = await db.collection('login_logs')
          .where({ _openid: button._openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();
        return {
          openid: button._openid,
          log: logRes.data && logRes.data.length > 0 ? logRes.data[0] : null
        };
      } catch (e) {
        console.warn('[getBannedUsers] 查询 login_logs 失败:', button._openid, e);
        return { openid: button._openid, log: null };
      }
    });
    
    const logResults = await Promise.all(logPromises);
    const logMap = {};
    logResults.forEach(item => {
      logMap[item.openid] = item.log;
    });

    // 构建用户数据
    const users = buttonRes.data.map((button) => {
      // 从 logMap 中获取对应的记录
      const log = logMap[button._openid];
      // 从 fenxishuju 中找到对应的记录
      const visit = visitRes.data.find(v => v._openid === button._openid);
      
      // 计算总访问次数
      let totalVisits = 0;
      if (visit) {
        Object.keys(visit).forEach(key => {
          if (key !== '_openid' && key !== '_id' && key !== 'createTime' && key !== 'updateTime') {
            totalVisits += visit[key] || 0;
          }
        });
      }

      // 格式化封禁原因
      let banReasonText = '';
      switch (button.banReason) {
        case 'screenshot':
          banReasonText = '截屏封禁';
          break;
        case 'screen_record':
          banReasonText = '录屏封禁';
          break;
        case 'location_blocked':
          banReasonText = '地址拦截';
          break;
        case 'nickname_verify_fail':
          banReasonText = '昵称验证失败';
          break;
        default:
          banReasonText = button.banReason || '未知原因';
      }

      // 格式化封禁页面
      let banPageText = '';
      switch (button.banPage) {
        case 'case':
          banPageText = '案例页';
          break;
        case 'my':
          banPageText = '个人中心';
          break;
        case 'products':
          banPageText = '产品页';
          break;
        case 'shop':
          banPageText = '商店页';
          break;
        case 'home':
          banPageText = '首页';
          break;
        case 'paihang':
          banPageText = '排行榜';
          break;
        case 'shouhou':
          banPageText = '维修中心';
          break;
        case 'index':
          banPageText = '登录页';
          break;
        default:
          banPageText = button.banPage || '未知页面';
      }

      // 格式化时间
      let formattedTime = '未知时间';
      if (button.updateTime) {
        try {
          let date;
          // 处理云数据库的 Date 对象
          if (button.updateTime.getTime) {
            date = button.updateTime;
          } else if (typeof button.updateTime === 'object' && button.updateTime.constructor && button.updateTime.constructor.name === 'Date') {
            date = new Date(button.updateTime);
          } else if (typeof button.updateTime === 'number') {
            date = new Date(button.updateTime);
          } else if (typeof button.updateTime === 'string') {
            date = new Date(button.updateTime);
          } else {
            // 尝试直接使用
            date = new Date(button.updateTime);
          }
          
          if (date && !isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            formattedTime = `${year}-${month}-${day} ${hours}:${minutes}`;
          }
        } catch (e) {
          console.warn('[getBannedUsers] 时间格式化失败:', button.updateTime, e);
          // 如果格式化失败，尝试直接转换为字符串
          formattedTime = String(button.updateTime || '未知时间');
        }
      }

      return {
        _openid: button._openid,
        _id: button._id, // login_logbutton 的 _id，用于更新
        nickname: log?.nickname || '未知用户',
        banReason: button.banReason,
        banReasonText: banReasonText,
        banPage: button.banPage,
        banPageText: banPageText,
        province: button.province || '',
        city: button.city || '',
        district: button.district || '',
        address: button.address || '',
        latitude: button.latitude,
        longitude: button.longitude,
        device: button.device || '',
        phoneModel: button.phoneModel || '',
        updateTime: formattedTime,
        createTime: button.createTime,
        totalVisits: totalVisits,
        failCount: button.failCount || 0
      };
    });

    return { success: true, users: users };
  } catch (err) {
    console.error('[getBannedUsers] 查询失败:', err);
    return { success: false, error: err.message };
  }
};
