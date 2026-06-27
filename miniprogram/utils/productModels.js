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
  normalizeProductDetailModel
};
