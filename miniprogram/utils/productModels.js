/**
 * 产品型号分级：
 * - 系列级：案例库等只选到 F1 / F2 / F3 / F2 Long
 * - 明细级：绑定设备、售后配件等需具体到 PRO / MAX / ULTRA 等
 */

/** 系列级（不含「不知道」） */
const PRODUCT_SERIES_OPTIONS = ['F1', 'F2', 'F3', 'F2 Long'];

/** 案例库等产品型号选择（含「不知道」） */
const CASE_MODEL_OPTIONS = [...PRODUCT_SERIES_OPTIONS, '不知道'];

/**
 * 明细级标准名（全项目统一使用）：
 * F1 PRO → F1 MAX → F1 ULTRA
 * F2 PRO → F2 MAX → F2 ULTRA → F2 Long
 * F3 PRO → F3 MAX
 */
const PRODUCT_DETAIL_OPTIONS = [
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

/** 历史/别名 → 标准明细名（读云端、旧数据时归一） */
const PRODUCT_DETAIL_LEGACY_ALIASES = {
  'F1 Pro Max': 'F1 ULTRA',
  'F1 ultra': 'F1 ULTRA',
  'F2 MAX Long': 'F2 Long',
  'F2 MAX LONG': 'F2 Long',
  'F2 Max Long': 'F2 Long'
};

/** OTA 升级页：仅 F1 ULTRA / F2 ULTRA */
const OTA_DEVICE_OPTIONS = ['F1 ULTRA', 'F2 ULTRA'];

/** 各明细型号官方参考价（元），供用户按购买价辨认机型 */
const PRODUCT_MODEL_PRICES = {
  'F1 PRO': 288,
  'F1 MAX': 388,
  'F1 ULTRA': 588,
  'F2 PRO': 488,
  'F2 MAX': 588,
  'F2 ULTRA': 688,
  'F2 Long': 588,
  'F3 PRO': 788,
  'F3 MAX': 888
};

function scanModelToProductDetailKey(model) {
  if (!model || model.canLearn || !model.name) return '';
  const name = model.name;
  const type = model.type || '';
  if (name === 'F1' && type === 'Pro') return 'F1 PRO';
  if (name === 'F1' && type === 'Max') return 'F1 MAX';
  if (name === 'F1' && (type === 'Ultra' || type === 'ultra' || type === 'Pro Max')) return 'F1 ULTRA';
  if (name === 'F2' && type === 'Pro') return 'F2 PRO';
  if (name === 'F2' && type === 'Max') return 'F2 MAX';
  if (name === 'F2' && (type === 'Long' || type === 'Max Long')) return 'F2 Long';
  if (name === 'F2' && type === 'Ultra') return 'F2 ULTRA';
  if (name === 'F3' && type === 'Pro') return 'F3 PRO';
  if (name === 'F3' && type === 'Max') return 'F3 MAX';
  return normalizeProductDetailModel(`${name} ${type}`.trim());
}

function getProductModelPrice(modelOrKey) {
  const key = typeof modelOrKey === 'string'
    ? normalizeProductDetailModel(modelOrKey)
    : scanModelToProductDetailKey(modelOrKey);
  return PRODUCT_MODEL_PRICES[key] || 0;
}

function formatProductModelPrice(modelOrKey) {
  const price = typeof modelOrKey === 'number'
    ? modelOrKey
    : getProductModelPrice(modelOrKey);
  return price > 0 ? `¥${price}` : '';
}

function enrichScanGalleryModel(entry) {
  const price = getProductModelPrice(entry);
  return {
    ...entry,
    price,
    priceDisplay: formatProductModelPrice(price)
  };
}

/** 控制中心连接前是否校验云端 OTA 记录（仅 Ultra 系） */
function modelRequiresOtaGate(model) {
  if (!model || !model.name) return false;
  const type = model.type || '';
  return (model.name === 'F1' && type === 'Ultra')
    || (model.name === 'F2' && type === 'Ultra');
}

function normalizeProductDetailModel(name) {
  const key = String(name || '').trim();
  if (!key) return '';
  return PRODUCT_DETAIL_LEGACY_ALIASES[key] || key;
}

module.exports = {
  PRODUCT_SERIES_OPTIONS,
  CASE_MODEL_OPTIONS,
  PRODUCT_DETAIL_OPTIONS,
  PRODUCT_DETAIL_LEGACY_ALIASES,
  OTA_DEVICE_OPTIONS,
  PRODUCT_MODEL_PRICES,
  modelRequiresOtaGate,
  normalizeProductDetailModel,
  scanModelToProductDetailKey,
  getProductModelPrice,
  formatProductModelPrice,
  enrichScanGalleryModel
};
