// 云函数：更新售后配件数据
// 云函数有管理员权限，可以直接更新数据库，避免前端权限问题

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { _id, updateData } = event

  console.log('[updateShouhouPart] 开始更新配件数据')
  console.log('[updateShouhouPart] _id:', _id)
  console.log('[updateShouhouPart] updateData:', updateData)

  try {
    // 检查参数
    if (!_id || !updateData) {
      throw new Error('缺少必要参数：_id 或 updateData')
    }

    // 使用管理员权限更新数据
    const result = await db.collection('shouhou').doc(_id).update({
      data: updateData
    })

    console.log('[updateShouhouPart] 更新结果:', result)

    // 检查是否更新成功
    if (result.stats && result.stats.updated > 0) {
      console.log('[updateShouhouPart] ✅ 更新成功，已更新', result.stats.updated, '条数据')
      return {
        success: true,
        message: '更新成功',
        updated: result.stats.updated
      }
    } else {
      console.warn('[updateShouhouPart] ⚠️ 更新返回 updated = 0')
      // 即使 updated 为 0，也返回成功（可能是数据相同）
      return {
        success: true,
        message: '更新成功（数据可能未变化）',
        updated: 0
      }
    }
  } catch (err) {
    console.error('[updateShouhouPart] ❌ 更新失败:', err)
    return {
      success: false,
      error: err.message || '更新失败'
    }
  }
}
