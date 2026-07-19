// 批量同步配件数据到云端
// 使用方法：传入 { models: { 'F1 PRO': [...], 'F2 MAX': [...] } }

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 验证管理员权限
async function assertAdmin() {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) throw new Error('UNAUTHORIZED');
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (byOpenid.data.length > 0) return openid;
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  if (bySystemOpenid.data.length > 0) return openid;
  throw new Error('FORBIDDEN');
}

const PARTS_MANIFEST_TYPE = 'parts_manifest';

/** 删除某型号下全部配件（保留 parts_manifest） */
async function clearModelParts(modelName) {
  let deleted = 0;
  // 优先 where.remove（更快）；失败再逐条删
  for (let round = 0; round < 20; round++) {
    try {
      const rm = await db.collection('shouhou')
        .where({
          modelName,
          recordType: _.neq(PARTS_MANIFEST_TYPE)
        })
        .remove();
      const n = (rm.stats && rm.stats.removed) || 0;
      deleted += n;
      if (n < 100) break;
      continue;
    } catch (e) {
      // where.remove 不可用时降级
    }

    const res = await db.collection('shouhou')
      .where({
        modelName,
        recordType: _.neq(PARTS_MANIFEST_TYPE)
      })
      .limit(100)
      .get();
    const rows = (res.data || []).filter((row) => row && row._id && row.name);
    if (!rows.length) break;
    await Promise.all(rows.map((row) => db.collection('shouhou').doc(row._id).remove()));
    deleted += rows.length;
    if (rows.length < 100) break;
  }
  return deleted;
}

/** 标记该型号为自定义清单，避免本地默认配件又合并回来 */
async function setPartsListModeCustom(modelName) {
  const payload = {
    modelName,
    recordType: PARTS_MANIFEST_TYPE,
    partsListMode: 'custom',
    updatedAt: db.serverDate()
  };
  const res = await db.collection('shouhou')
    .where({ modelName, recordType: PARTS_MANIFEST_TYPE })
    .limit(1)
    .get();
  const existing = (res.data && res.data[0]) || null;
  if (existing && existing._id) {
    await db.collection('shouhou').doc(existing._id).update({ data: payload });
  } else {
    await db.collection('shouhou').add({ data: payload });
  }
}

// 从云端读取源型号配件，完全复刻到目标型号（先删旧再写新）
async function syncFromCloudSource(sourceModel, targetModels, dryRun = false) {
  try {
    console.log(`[syncFromCloudSource] 完全复刻：${sourceModel} → ${targetModels.length} 个型号`);

    // 1. 读取源型号配件
    const sourceRes = await db.collection('shouhou')
      .where({
        modelName: sourceModel,
        recordType: _.neq(PARTS_MANIFEST_TYPE)
      })
      .orderBy('order', 'asc')
      .get();

    const sourceParts = (sourceRes.data || []).filter((item) => item && item.name);

    if (sourceParts.length === 0) {
      return { success: false, errMsg: `源型号 ${sourceModel} 没有配件数据` };
    }

    console.log(`[syncFromCloudSource] ${sourceModel} 有 ${sourceParts.length} 个配件`);

    const results = {};
    let totalDeleted = 0;
    let totalAdded = 0;

    const syncOneModel = async (targetModel) => {
      // 统计将要删除的旧数据
      const oldRes = await db.collection('shouhou')
        .where({
          modelName: targetModel,
          recordType: _.neq(PARTS_MANIFEST_TYPE)
        })
        .limit(100)
        .get();
      const oldCount = (oldRes.data || []).filter((r) => r && r.name).length;

      if (dryRun) {
        console.log(`[DRY RUN] ${targetModel}: 将删除约 ${oldCount}+ 条，新增 ${sourceParts.length} 条`);
        return {
          targetModel,
          deleted: oldCount,
          added: sourceParts.length
        };
      }

      // 先删干净旧配件
      const deleted = await clearModelParts(targetModel);

      // 再完整写入源配件
      const writeOps = sourceParts.map((sourcePart, i) => {
        const name = String(sourcePart.name || '').trim();
        const price = sourcePart.price || 0;
        return db.collection('shouhou').add({
          data: {
            modelName: targetModel,
            name,
            price,
            order: i,
            selected: false,
            createdAt: db.serverDate()
          }
        });
      });
      await Promise.all(writeOps);

      // 设为自定义清单，避免默认列表再合并回来
      await setPartsListModeCustom(targetModel);

      console.log(`[syncFromCloudSource] ${targetModel} 完成: 删除 ${deleted}，新增 ${sourceParts.length}`);
      return {
        targetModel,
        deleted,
        added: sourceParts.length
      };
    };

    const modelResults = await Promise.all(targetModels.map(syncOneModel));

    for (const r of modelResults) {
      results[r.targetModel] = {
        deleted: r.deleted,
        added: r.added,
        total: sourceParts.length
      };
      totalDeleted += r.deleted;
      totalAdded += r.added;
    }

    const summary = dryRun
      ? `预演：将删除约 ${totalDeleted} 条旧配件，再写入 ${totalAdded} 条（完全复刻）`
      : `完成：已删除 ${totalDeleted} 条旧配件，新写入 ${totalAdded} 条（完全复刻）`;

    return {
      success: true,
      summary,
      dryRun: !!dryRun,
      sourceModel,
      sourceParts: sourceParts.map((p) => ({ name: p.name, price: p.price })),
      results,
      totalDeleted,
      totalAdded
    };
  } catch (err) {
    console.error('[syncFromCloudSource] 失败:', err);
    return {
      success: false,
      errMsg: (err && err.message) || String(err)
    };
  }
}

exports.main = async (event, context) => {
  // 权限检查
  try {
    await assertAdmin();
  } catch (e) {
    const msg = String((e && e.message) || e || '');
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, errMsg: '仅管理员可同步配件数据' };
    }
    return { success: false, errMsg: '权限验证失败: ' + msg };
  }

  const { models, dryRun, sourceModel, targetModels } = event;

  // 新增：从云端读取源型号配件，同步到目标型号
  if (sourceModel && targetModels) {
    return await syncFromCloudSource(sourceModel, targetModels, dryRun);
  }

  if (!models || typeof models !== 'object') {
    return { success: false, errMsg: '请提供 models 对象，格式：{ "F1 PRO": [{name, price}, ...], ... }' };
  }

  const results = {};
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    for (const [modelName, partsList] of Object.entries(models)) {
      if (!Array.isArray(partsList)) {
        results[modelName] = { error: '配件列表必须是数组' };
        continue;
      }

      console.log(`[syncParts] 开始处理型号: ${modelName}，共 ${partsList.length} 个配件`);

      // 读取云端现有配件
      const existingRes = await db.collection('shouhou')
        .where({ 
          modelName,
          recordType: _.neq('parts_manifest')
        })
        .get();
      
      const existing = existingRes.data || [];
      const existingMap = new Map();
      existing.forEach(item => {
        if (item.name) {
          existingMap.set(item.name, item);
        }
      });

      let added = 0;
      let updated = 0;
      let skipped = 0;

      for (let i = 0; i < partsList.length; i++) {
        const part = partsList[i];
        
        if (!part || typeof part !== 'object') {
          console.warn(`[syncParts] ${modelName} 第 ${i} 项无效，跳过`);
          skipped++;
          continue;
        }

        const name = String(part.name || '').trim();
        if (!name) {
          console.warn(`[syncParts] ${modelName} 第 ${i} 项缺少 name，跳过`);
          skipped++;
          continue;
        }

        const price = typeof part.price === 'number' ? part.price : 0;
        const order = typeof part.order === 'number' ? part.order : i;

        const existingDoc = existingMap.get(name);

        if (dryRun) {
          if (existingDoc) {
            console.log(`[syncParts] [DRY RUN] ${modelName} - 将更新: ${name} (价格: ${existingDoc.price} → ${price})`);
            updated++;
          } else {
            console.log(`[syncParts] [DRY RUN] ${modelName} - 将新增: ${name} (价格: ${price})`);
            added++;
          }
          continue;
        }

        if (existingDoc) {
          // 更新现有配件
          const needsUpdate = 
            existingDoc.price !== price || 
            existingDoc.order !== order;

          if (needsUpdate) {
            await db.collection('shouhou').doc(existingDoc._id).update({
              data: {
                price,
                order,
                updatedAt: db.serverDate()
              }
            });
            console.log(`[syncParts] ${modelName} - 已更新: ${name} (价格: ${price}, 排序: ${order})`);
            updated++;
          } else {
            skipped++;
          }
        } else {
          // 新增配件
          await db.collection('shouhou').add({
            data: {
              modelName,
              name,
              price,
              order,
              selected: false,
              createdAt: db.serverDate()
            }
          });
          console.log(`[syncParts] ${modelName} - 已新增: ${name} (价格: ${price}, 排序: ${order})`);
          added++;
        }
      }

      results[modelName] = { added, updated, skipped, total: partsList.length };
      totalAdded += added;
      totalUpdated += updated;
      totalSkipped += skipped;
    }

    const summary = dryRun 
      ? `预演模式：将新增 ${totalAdded} 个，更新 ${totalUpdated} 个，跳过 ${totalSkipped} 个`
      : `同步完成：新增 ${totalAdded} 个，更新 ${totalUpdated} 个，跳过 ${totalSkipped} 个`;

    return {
      success: true,
      summary,
      dryRun: !!dryRun,
      results,
      totalAdded,
      totalUpdated,
      totalSkipped
    };
  } catch (err) {
    console.error('[syncParts] 同步失败:', err);
    return {
      success: false,
      errMsg: (err && err.message) || String(err),
      results
    };
  }
};
