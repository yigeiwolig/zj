// cloudfunctions/addUserToList/index.js
// 手动添加用户到 user_list 集合

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { nickname, openid, bypassLocationCheck } = event;
  
  // 基本校验
  if (!nickname) {
    return { 
      success: false, 
      errMsg: '昵称不能为空' 
    };
  }

  try {
    const now = db.serverDate();
    
    // 检查是否已存在该昵称的记录
    const existingRes = await db.collection('user_list')
      .where({ nickName: nickname })
      .get();
    
    if (existingRes.data && existingRes.data.length > 0) {
      return {
        success: false,
        errMsg: `昵称 "${nickname}" 已存在于 user_list 中`
      };
    }

    // 创建新用户记录
    const userData = {
      nickName: nickname,
      device: 'unknown',
      address: '未知地址',
      building: '未知楼栋',
      province: '',
      city: '',
      district: '',
      locationDesc: '未知区域',
      latitude: 0,
      longitude: 0,
      createTime: now,
      updateTime: now
    };

    // 如果传了 openid，则添加
    if (openid) {
      userData._openid = openid;
    }

    // 如果传了 bypassLocationCheck，则添加
    if (bypassLocationCheck !== undefined) {
      userData.bypassLocationCheck = bypassLocationCheck === true;
    }

    const result = await db.collection('user_list').add({
      data: userData
    });

    console.log('[addUserToList] ✅ 已添加用户到 user_list:', nickname, '记录ID:', result._id);

    return {
      success: true,
      message: `用户 "${nickname}" 已成功添加到 user_list`,
      _id: result._id
    };

  } catch (err) {
    console.error('[addUserToList] 添加失败:', err);
    return {
      success: false,
      errMsg: err.message || '添加失败，请稍后重试'
    };
  }
};
