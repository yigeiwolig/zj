/**
 * 产品型号分级：
 * - 系列级：案例库等只选到 F1 / F2 / F3 / F2 Long
 * - 明细级：绑定设备、售后配件等需具体到 PRO / MAX
 */

/** 系列级（不含「不知道」） */
const PRODUCT_SERIES_OPTIONS = ['F1', 'F2', 'F3', 'F2 Long'];

/** 案例库等产品型号选择（含「不知道」） */
const CASE_MODEL_OPTIONS = [...PRODUCT_SERIES_OPTIONS, '不知道'];

/**
 * 明细级排序：
 * F1 PRO → F1 MAX → F1 Pro Max
 * F2 PRO → F2 MAX
 * F3 PRO → F3 MAX
 * F2 MAX Long
 */
const PRODUCT_DETAIL_OPTIONS = [
  'F1 PRO',
  'F1 MAX',
  'F1 Pro Max',
  'F2 PRO',
  'F2 MAX',
  'F3 PRO',
  'F3 MAX',
  'F2 MAX Long'
];

module.exports = {
  PRODUCT_SERIES_OPTIONS,
  CASE_MODEL_OPTIONS,
  PRODUCT_DETAIL_OPTIONS
};
