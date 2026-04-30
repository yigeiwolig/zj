const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/** 与客户端 azjc 统计展示一致，勿随意修改 */
const POOL_CODE = '__AZJC_DIRECT_POOL__';

exports.main = async () => {
  try {
    const existing = await db.collection('chakan').where({ code: POOL_CODE }).limit(1).get();
    if (existing.data && existing.data.length > 0) {
      return { success: true, _id: existing.data[0]._id, code: POOL_CODE };
    }

    const far = new Date();
    far.setFullYear(far.getFullYear() + 10);

    try {
      const addRes = await db.collection('chakan').add({
        data: {
          code: POOL_CODE,
          creatorOpenid: 'system',
          creatorNickname: '普通安装汇总',
          creatorOrderId: '',
          createdAt: db.serverDate(),
          expiresAt: far,
          totalViews: 999999,
          usedViews: 0,
          status: 'active',
          source: 'azjc_direct_pool',
          viewers: []
        }
      });
      return { success: true, _id: addRes._id, code: POOL_CODE };
    } catch (e) {
      const again = await db.collection('chakan').where({ code: POOL_CODE }).limit(1).get();
      if (again.data && again.data.length > 0) {
        return { success: true, _id: again.data[0]._id, code: POOL_CODE };
      }
      throw e;
    }
  } catch (err) {
    console.error('[getOrCreateAzjcDirectPool]', err);
    return { success: false, error: err.message || '创建汇总池失败' };
  }
};
