// cloudfunctions/initShouhouParts/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 配件数据 - 与前端保持一致
const DB_PARTS = {
  'F1 PRO': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
  'F1 MAX': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 PRO': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 MAX': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 PRO Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 MAX Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"]
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  try {
    const { force = true } = event // 默认强制覆盖
    
    console.log('[initShouhouParts] 开始初始化配件数据，force:', force)
    
    const allModels = ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long']
    let totalDeleted = 0
    let totalAdded = 0
    const results = []
    
    // 逐个型号处理
    for (const modelName of allModels) {
      const partsList = DB_PARTS[modelName] || []
      if (partsList.length === 0) {
        console.log(`[initShouhouParts] ${modelName} 没有配件数据，跳过`)
        continue
      }
      
      console.log(`[initShouhouParts] 开始处理 ${modelName}，共 ${partsList.length} 个配件`)
      
      try {
        // 1. 先查询旧数据
        const queryRes = await db.collection('shouhou').where({
          modelName: modelName
        }).get()
        
        const oldCount = queryRes.data.length
        console.log(`[initShouhouParts] ${modelName} 查询到 ${oldCount} 条旧数据`)
        
        // 2. 如果强制覆盖，删除旧数据
        if (force && oldCount > 0) {
          console.log(`[initShouhouParts] ${modelName} 正在删除 ${oldCount} 条旧数据...`)
          const deletePromises = queryRes.data.map(item => {
            return db.collection('shouhou').doc(item._id).remove()
          })
          await Promise.all(deletePromises)
          totalDeleted += oldCount
          console.log(`[initShouhouParts] ${modelName} 旧数据删除完成`)
        }
        
        // 3. 添加新数据
        if (force || oldCount === 0) {
          console.log(`[initShouhouParts] ${modelName} 开始添加 ${partsList.length} 个配件...`)
          const addPromises = partsList.map((name, index) => {
            return db.collection('shouhou').add({
              data: {
                modelName: modelName,
                name: name,
                order: index,
                price: 0, // 初始价格
                createTime: db.serverDate()
              }
            })
          })
          
          const addResults = await Promise.all(addPromises)
          totalAdded += addResults.length
          console.log(`[initShouhouParts] ${modelName} 添加完成，共 ${addResults.length} 个配件`)
          
          results.push({
            modelName,
            success: true,
            deleted: oldCount,
            added: addResults.length
          })
        } else {
          console.log(`[initShouhouParts] ${modelName} 已有数据且不强制覆盖，跳过`)
          results.push({
            modelName,
            success: true,
            skipped: true,
            existing: oldCount
          })
        }
      } catch (err) {
        console.error(`[initShouhouParts] ${modelName} 处理失败:`, err)
        results.push({
          modelName,
          success: false,
          error: err.message
        })
      }
    }
    
    console.log(`[initShouhouParts] 初始化完成，删除 ${totalDeleted} 条，添加 ${totalAdded} 条`)
    
    return {
      success: true,
      message: '配件数据初始化完成',
      summary: {
        totalDeleted,
        totalAdded,
        models: results.length
      },
      details: results
    }
  } catch (err) {
    console.error('[initShouhouParts] 初始化失败:', err)
    return {
      success: false,
      message: err.message || '初始化失败'
    }
  }
}
