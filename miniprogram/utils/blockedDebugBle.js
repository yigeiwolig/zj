/**
 * 工厂调试机：控制中心禁止连接；我的绑定禁止走弹窗/绑定流程。
 * 用主板序列号匹配，兼容 NB- / MT- / 无前缀。
 */
const BLOCKED_DEBUG_SERIALS = new Set([
  'C790101C1C0AD',
  'C690D018D88A' // MT-C690D018D88A / NB-C690D018D88A
]);

function normalizeBleAdvertiseName(name) {
  return String(name || '').replace(/\s+/g, '').toUpperCase();
}

function bleSerialFromName(name) {
  const n = normalizeBleAdvertiseName(name);
  if (!n) return '';
  return n.replace(/^(NB|MT)-?/, '');
}

function isBlockedDebugBleName(name) {
  const serial = bleSerialFromName(name);
  return !!serial && BLOCKED_DEBUG_SERIALS.has(serial);
}

function isBlockedDebugBleDevice(device) {
  if (!device) return false;
  return isBlockedDebugBleName(device.name || device.localName || '');
}

module.exports = {
  BLOCKED_DEBUG_SERIALS,
  normalizeBleAdvertiseName,
  bleSerialFromName,
  isBlockedDebugBleName,
  isBlockedDebugBleDevice
};
