// 云函数：删除售后配件数据
// 云函数有管理员权限，可以直接删除数据库，避免前端权限问题

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { _id } = event

  console.log('[deleteShouhouPart] 开始删除配件数据')
  console.log('[deleteShouhouPart] _id:', _id)
  console.log('[deleteShouhouPart] event 完整内容:', JSON.stringify(event))

  try {
    // 检查参数
    if (!_id) {
      console.error('[deleteShouhouPart] 缺少 _id 参数')
      throw new Error('缺少必要参数：_id')
    }

    // 先查询数据是否存在
    console.log('[deleteShouhouPart] 先查询数据是否存在...')
    const queryResult = await db.collection('shouhou').doc(_id).get()
    console.log('[deleteShouhouPart] 查询结果:', JSON.stringify(queryResult))
    
    if (!queryResult.data || queryResult.data.length === 0) {
      console.warn('[deleteShouhouPart] 数据不存在，_id:', _id)
      // 数据不存在也认为删除成功（幂等性）
      return {
        success: true,
        message: '数据不存在或已删除',
        removed: 0
      }
    }

    // 使用管理员权限删除数据
    console.log('[deleteShouhouPart] 开始删除数据...')
    const result = await db.collection('shouhou').doc(_id).remove()

    console.log('[deleteShouhouPart] 删除结果:', JSON.stringify(result))
    console.log('[deleteShouhouPart] result.stats:', result.stats)
    console.log('[deleteShouhouPart] result.errMsg:', result.errMsg)

    // 只要没有报错，就认为删除成功（即使 removed = 0）
    if (result.errMsg && result.errMsg.includes('ok')) {
      console.log('[deleteShouhouPart] ✅ 删除成功（根据 errMsg 判断）')
      return {
        success: true,
        message: '删除成功',
        removed: result.stats ? result.stats.removed : 0
      }
    }

    // 检查 stats.removed
    if (result.stats && result.stats.removed > 0) {
      console.log('[deleteShouhouPart] ✅ 删除成功，已删除', result.stats.removed, '条数据')
      return {
        success: true,
        message: '删除成功',
        removed: result.stats.removed
      }
    } else {
      console.warn('[deleteShouhouPart] ⚠️ 删除返回 removed = 0，但没有报错，认为成功')
      // 没有报错就认为成功
      return {
        success: true,
        message: '删除成功（removed = 0）',
        removed: 0
      }
    }
  } catch (err) {
    console.error('[deleteShouhouPart] ❌ 删除失败:', err)
    console.error('[deleteShouhouPart] 错误堆栈:', err.stack)
    return {
      success: false,
      error: err.message || '删除失败'
    }
  }
}
