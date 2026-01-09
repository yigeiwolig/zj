// 云函数：删除售后配件数据
// 云函数有管理员权限，可以直接删除数据库，避免前端权限问题

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { _id } = event

  console.log('[deleteShouhouPart] 开始删除配件数据')
  console.log('[deleteShouhouPart] _id:', _id)

  try {
    // 检查参数
    if (!_id) {
      throw new Error('缺少必要参数：_id')
    }

    // 使用管理员权限删除数据
    const result = await db.collection('shouhou').doc(_id).remove()

    console.log('[deleteShouhouPart] 删除结果:', result)

    // 检查是否删除成功
    if (result.stats && result.stats.removed > 0) {
      console.log('[deleteShouhouPart] ✅ 删除成功，已删除', result.stats.removed, '条数据')
      return {
        success: true,
        message: '删除成功',
        removed: result.stats.removed
      }
    } else {
      console.warn('[deleteShouhouPart] ⚠️ 删除返回 removed = 0')
      return {
        success: false,
        error: '未找到数据或已删除'
      }
    }
  } catch (err) {
    console.error('[deleteShouhouPart] ❌ 删除失败:', err)
    return {
      success: false,
      error: err.message || '删除失败'
    }
  }
}
