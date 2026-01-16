// cloudfunctions/addNicknameToWhitelist/index.js
// 管理员直接录入昵称到 valid_users 白名单（不经过验证）
// 🔴 录入时 _openid 为空，供其他用户绑定

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const nickname = (event && event.nickname ? String(event.nickname) : '').trim();

  // 基本校验
  if (!nickname) {
    return { 
      success: false, 
      errMsg: '昵称不能为空' 
    };
  }

  try {
    // 检查昵称是否已存在
    const existingRes = await db.collection('valid_users')
      .where({ nickname: nickname })
      .get();

    if (existingRes.data && existingRes.data.length > 0) {
      // 如果已存在，检查是否有空位（未绑定 openid）
      // 🔴 与 verifyNickname 保持一致：查找 _openid 不存在或为空/null 的记录
      const emptySlot = existingRes.data.find(item => !item._openid);
      
      if (emptySlot) {
        // 有空位，说明已经有一个空位了，不需要再添加
        return {
          success: false,
          errMsg: `昵称 "${nickname}" 已存在且有空位，无需重复录入`
        };
      } else {
        // 所有位置都被占用，可以再添加一个空位
        // 继续执行下面的添加逻辑
      }
    }

    // 🔴 不存在或需要添加新空位：添加新记录，不设置 _openid 字段（或设置为空字符串）
    // 注意：微信数据库可能会自动生成 _openid，所以我们需要明确不设置或设置为空
    // 为了与 verifyNickname 的占位逻辑兼容（!r._openid），我们设置为空字符串
    await db.collection('valid_users').add({
      data: {
        nickname: nickname,
        // 🔴 不设置 _openid 字段，或者设置为空字符串，让 verifyNickname 的 !r._openid 能匹配到
        // 微信数据库可能会自动添加 _openid，所以我们显式设置为空字符串更安全
        _openid: '', 
        desc: '管理员直接录入',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: `昵称 "${nickname}" 已成功录入到白名单（空位）`,
      isNew: true
    };

  } catch (err) {
    console.error('[addNicknameToWhitelist] 录入失败:', err);
    return {
      success: false,
      errMsg: err.message || '录入失败，请稍后重试'
    };
  }
};
