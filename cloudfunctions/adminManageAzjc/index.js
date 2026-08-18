/**
 * 管理员维护安装教程 azjc 集合。
 * 云库「仅创建者可写」时，B 管理员无法直接删/改 A 上传的文档，统一走本云函数。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function assertAdmin() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid: OPENID }).limit(1).get();
  if (byOpenid.data && byOpenid.data.length > 0) return OPENID;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: OPENID }).limit(1).get();
  if (bySystemOpenid.data && bySystemOpenid.data.length > 0) return OPENID;
  throw new Error('FORBIDDEN');
}

function sanitizePatch(raw) {
  const data = raw && typeof raw === 'object' ? { ...raw } : {};
  delete data._id;
  delete data._openid;
  delete data.openid;
  return data;
}

exports.main = async (event) => {
  try {
    await assertAdmin();
    const action = String((event && event.action) || 'remove').trim();
    const _id = String((event && event._id) || '').trim();
    if (!_id) {
      return { success: false, error: '缺少 _id' };
    }

    if (action === 'remove') {
      try {
        const exists = await db.collection('azjc').doc(_id).get();
        if (!exists.data) {
          return { success: true, message: '已不存在', removed: 0 };
        }
      } catch (e) {
        // 文档不存在时 get 也可能抛错，按已删除处理
        const msg = String((e && e.message) || e || '');
        if (/not exist|不存在|DOCUMENT_NOT_EXIST/i.test(msg)) {
          return { success: true, message: '已不存在', removed: 0 };
        }
      }
      await db.collection('azjc').doc(_id).remove();
      return { success: true, message: '删除成功', removed: 1 };
    }

    if (action === 'update') {
      const data = sanitizePatch(event && event.data);
      if (!Object.keys(data).length) {
        return { success: false, error: '缺少更新字段' };
      }
      await db.collection('azjc').doc(_id).update({ data });
      return { success: true, message: '更新成功' };
    }

    return { success: false, error: '未知操作' };
  } catch (err) {
    const msg = String((err && err.message) || err || '操作失败');
    console.error('[adminManageAzjc]', msg, err);
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, error: '无管理员权限' };
    }
    return { success: false, error: msg };
  }
};
