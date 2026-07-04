/** scan 页注册 BLE 控制；voice-control 页订阅状态并下发口令 */

let bridge = null;
const listeners = new Set();

function registerBridge(api) {
  bridge = api || null;
}

function clearBridge() {
  bridge = null;
}

function isRegistered() {
  return !!(bridge && typeof bridge.sendCommand === 'function');
}

function isBleLinked() {
  if (!bridge || typeof bridge.isBleLinked !== 'function') return false;
  try {
    return !!bridge.isBleLinked();
  } catch (e) {
    return false;
  }
}

function canInteract() {
  if (!bridge || typeof bridge.canInteract !== 'function') return false;
  try {
    return !!bridge.canInteract();
  } catch (e) {
    return false;
  }
}

function isAdmin() {
  if (!bridge || typeof bridge.isAdmin !== 'function') return false;
  try {
    return !!bridge.isAdmin();
  } catch (e) {
    return false;
  }
}

/** @deprecated 使用 isBleLinked */
function isConnected() {
  return isBleLinked();
}

function getFlapState() {
  if (!bridge || typeof bridge.getFlapState !== 'function') {
    return { flapPanelState: 'unknown', flapPanelStateText: '状态未知' };
  }
  try {
    return bridge.getFlapState() || { flapPanelState: 'unknown', flapPanelStateText: '状态未知' };
  } catch (e) {
    return { flapPanelState: 'unknown', flapPanelStateText: '状态未知' };
  }
}

function sendFlapCommand(cmd) {
  if (!bridge || typeof bridge.sendCommand !== 'function') return false;
  if (!canInteract()) return false;
  bridge.sendCommand(cmd);
  return true;
}

function publish(event) {
  if (!event) return;
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      // ignore
    }
  });
}

function subscribe(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function buildFlapStatusTitle(state, subText) {
  switch (state) {
    case 'stealth':
      return '隐蔽模式 · 已开启';
    case 'fault':
      return subText ? `牌照架 · 故障（${subText}）` : '牌照架 · 故障';
    case 'open':
      return '牌照架 · 已打开';
    case 'closed':
      return '牌照架 · 已关闭';
    case 'moving':
      return '牌照架 · 运动中';
    default:
      return '状态未知';
  }
}

module.exports = {
  registerBridge,
  clearBridge,
  isRegistered,
  isConnected,
  isBleLinked,
  canInteract,
  isAdmin,
  getFlapState,
  sendFlapCommand,
  publish,
  subscribe,
  buildFlapStatusTitle
};
