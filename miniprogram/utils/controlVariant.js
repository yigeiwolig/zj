/**
 * 设备控制版本：全系列统一「按钮版 / 遥控版」
 * 存库值：button | remote
 * 兼容旧值 bluetooth → button
 */

const CONTROL_VARIANT_BUTTON = 'button';
const CONTROL_VARIANT_REMOTE = 'remote';
/** @deprecated 旧值，normalize 时映射为 button */
const CONTROL_VARIANT_BLUETOOTH = 'bluetooth';

const CONTROL_VARIANT_OPTIONS = [
  { value: CONTROL_VARIANT_BUTTON, label: '按钮版' },
  { value: CONTROL_VARIANT_REMOTE, label: '遥控版' }
];

const CONTROL_VARIANT_LABELS = {
  [CONTROL_VARIANT_BUTTON]: '按钮版',
  [CONTROL_VARIANT_REMOTE]: '遥控版',
  [CONTROL_VARIANT_BLUETOOTH]: '按钮版'
};

function normalizeControlVariant(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (
    s === CONTROL_VARIANT_BUTTON ||
    s === 'btn' ||
    s === CONTROL_VARIANT_BLUETOOTH ||
    s === 'ble' ||
    s === 'bt' ||
    s.indexOf('按钮') >= 0 ||
    s.indexOf('按键') >= 0 ||
    s.indexOf('蓝牙') >= 0
  ) {
    return CONTROL_VARIANT_BUTTON;
  }
  if (
    s === CONTROL_VARIANT_REMOTE ||
    s === '遥控' ||
    s.indexOf('遥控') >= 0
  ) {
    return CONTROL_VARIANT_REMOTE;
  }
  return '';
}

function controlVariantLabel(raw) {
  const key = normalizeControlVariant(raw);
  return key ? (CONTROL_VARIANT_LABELS[key] || '') : '';
}

/** 型号后附带控制版本：F2 MAX (遥控版) */
function formatModelWithControlVariant(model, variant) {
  const name = String(model || '').trim() || '未知型号';
  const label = controlVariantLabel(variant);
  if (!label) return name;
  // 已带括号版本时不重复追加
  if (/[（(]\s*(按钮版|遥控版|蓝牙版)\s*[）)]/.test(name)) return name;
  return `${name} (${label})`;
}

function isValidControlVariant(raw) {
  return !!normalizeControlVariant(raw);
}

module.exports = {
  CONTROL_VARIANT_BUTTON,
  CONTROL_VARIANT_REMOTE,
  CONTROL_VARIANT_BLUETOOTH,
  CONTROL_VARIANT_OPTIONS,
  CONTROL_VARIANT_LABELS,
  normalizeControlVariant,
  controlVariantLabel,
  formatModelWithControlVariant,
  isValidControlVariant
};
