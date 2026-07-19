// 配件同步辅助工具：从 F1 PRO 完全复刻到其他型号（客户端分型号调用，避免 3 秒超时）

const ALL_MODELS = [
  'F1 PRO',
  'F1 MAX',
  'F1 ULTRA',
  'F2 PRO',
  'F2 MAX',
  'F2 ULTRA',
  'F2 Long',
  'F3 PRO',
  'F3 MAX'
];

const SOURCE_MODEL = 'F1 PRO';

function callSyncParts(data) {
  return wx.cloud.callFunction({
    name: 'syncParts',
    data,
    config: { timeout: 60000 }
  }).then((res) => res.result || {});
}

function showFail(title, content) {
  wx.showModal({
    title,
    content: String(content || '未知错误'),
    showCancel: false,
    confirmText: '知道了'
  });
}

/** 同步单个型号（云函数一次只处理一个，避免超时） */
function syncOneModel(targetModel, dryRun) {
  return callSyncParts({
    sourceModel: SOURCE_MODEL,
    targetModels: [targetModel],
    dryRun: !!dryRun
  });
}

/**
 * 分型号完全复刻
 * dryRun=true：只预演；false：先删旧再写新
 */
function syncFromF1ProCloud(dryRun) {
  const targetModels = ALL_MODELS.filter((m) => m !== SOURCE_MODEL);
  const isDry = !!dryRun;

  wx.showLoading({
    title: isDry ? '预演中...' : `同步中 0/${targetModels.length}`,
    mask: true
  });

  const results = {};
  let totalDeleted = 0;
  let totalAdded = 0;
  let sourceParts = [];
  let index = 0;

  const runNext = () => {
    if (index >= targetModels.length) {
      wx.hideLoading();
      const summary = isDry
        ? `预演：将删除约 ${totalDeleted} 条旧配件，再写入 ${totalAdded} 条（完全复刻）`
        : `完成：已删除 ${totalDeleted} 条旧配件，新写入 ${totalAdded} 条（完全复刻）`;

      const sourcePartsList = (sourceParts || [])
        .map((p) => `${p.name} ¥${p.price}`)
        .join('\n');

      const detail = Object.entries(results)
        .map(([model, stats]) => `${model}: 删${stats.deleted || 0} / 写${stats.added || 0}`)
        .join('\n');

      wx.showModal({
        title: isDry ? '预演完成' : '同步成功',
        content: `${summary}\n\n源配件列表（${SOURCE_MODEL}）：\n${sourcePartsList}\n\n详情：\n${detail}`,
        showCancel: false,
        confirmText: '知道了'
      });

      return Promise.resolve({
        success: true,
        summary,
        dryRun: isDry,
        sourceModel: SOURCE_MODEL,
        sourceParts,
        results,
        totalDeleted,
        totalAdded
      });
    }

    const model = targetModels[index];
    if (!isDry) {
      wx.showLoading({
        title: `同步 ${model} (${index + 1}/${targetModels.length})`,
        mask: true
      });
    }

    return syncOneModel(model, isDry).then((result) => {
      if (!result || !result.success) {
        wx.hideLoading();
        showFail('同步失败', (result && result.errMsg) || `${model} 同步失败`);
        return Promise.reject((result && result.errMsg) || '同步失败');
      }

      if (!sourceParts.length && result.sourceParts) {
        sourceParts = result.sourceParts;
      }

      const stats = (result.results && result.results[model]) || {
        deleted: result.totalDeleted || 0,
        added: result.totalAdded || 0
      };
      results[model] = stats;
      totalDeleted += Number(stats.deleted || 0);
      totalAdded += Number(stats.added || 0);
      index += 1;
      return runNext();
    }).catch((err) => {
      wx.hideLoading();
      const msg = (err && (err.message || err.errMsg)) || String(err) || '网络异常';
      // 已经弹过业务失败就不重复弹
      if (String(msg).indexOf('同步失败') === -1 && String(msg).indexOf('没有配件') === -1) {
        showFail('调用失败', msg);
      }
      return Promise.reject(err);
    });
  };

  return runNext();
}

/**
 * 先预演，确认后再完全复刻
 */
function syncFromCloudWithConfirm() {
  return syncFromF1ProCloud(true).then((dryRunResult) => {
    if (!dryRunResult || !dryRunResult.success) return null;

    const { totalAdded, totalDeleted, sourceParts } = dryRunResult;
    const partsCount = (sourceParts || []).length;
    const targetCount = ALL_MODELS.length - 1;

    return new Promise((resolve) => {
      wx.showModal({
        title: '确认完全复刻',
        content: `将把云端 F1 PRO（${partsCount} 个配件）完全复刻到其他 ${targetCount} 个型号\n\n预演结果：\n删除旧配件约 ${totalDeleted || 0} 条\n新写入 ${totalAdded || 0} 条\n\n⚠️ 每个型号会先清空旧配件，再按 F1 PRO 重写。是否继续？`,
        confirmText: '确认复刻',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) {
            resolve(null);
            return;
          }
          syncFromF1ProCloud(false).then(resolve).catch(() => resolve(null));
        },
        fail: () => resolve(null)
      });
    });
  });
}

module.exports = {
  syncFromF1ProCloud,
  syncFromCloudWithConfirm,
  ALL_MODELS
};
