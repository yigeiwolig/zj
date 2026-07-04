const { normalizeProductDetailModel } = require('./productModels.js');

function scanModelToProductKey(model) {
  if (!model || model.canLearn) return '';
  const name = model.name || '';
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
  return `${name} ${type}`.trim();
}

function isRemoteAssistProduct(model) {
  if (!model || model.canLearn) return false;
  const name = model.name || '';
  return name === 'F1' || name === 'F2' || name === 'F3';
}

function productKeyToScanModel(productKey) {
  const key = normalizeProductDetailModel(productKey);
  const map = {
    'F1 PRO': { name: 'F1', type: 'Pro' },
    'F1 MAX': { name: 'F1', type: 'Max' },
    'F1 ULTRA': { name: 'F1', type: 'Ultra' },
    'F2 PRO': { name: 'F2', type: 'Pro' },
    'F2 MAX': { name: 'F2', type: 'Max' },
    'F2 Long': { name: 'F2', type: 'Long' },
    'F2 ULTRA': { name: 'F2', type: 'Ultra' },
    'F3 PRO': { name: 'F3', type: 'Pro' },
    'F3 MAX': { name: 'F3', type: 'Max' }
  };
  return map[key] || null;
}

const REMOTE_STATE_KEYS = [
  'isConnected',
  'connectedDeviceName',
  'currentConnectedRawSn',
  'showDetail',
  'detailMode',
  'editType',
  'foldGap',
  'foldServoAngle',
  'currentAngle',
  'translateX',
  'angleMode',
  'openAngleUiActive',
  'angleBtnText',
  'settingState',
  'f2ServoSpeed',
  'f2TravelModeOn',
  'delayPowerOffIndex',
  'delayPowerOffTip',
  'travelModeTip',
  'f2TravelReadbackText',
  'f2DelayPowerReadbackText',
  'flapPanelState',
  'flapPanelStateText',
  'f2ControlPanelOpen',
  'f2KeyOn',
  'f2BtnPressed',
  'f2KeyStatusText',
  'f2BtnStatusText',
  'f2HwMonitorVisible',
  'voiceListening',
  'voiceHint',
  'voiceLastCmd',
  'voiceHearing',
  'voiceStatusClass',
  'voiceStatusText'
];

function mergeRemoteCurrentModel(remoteModel, models, existingModel) {
  if (!remoteModel) return null;
  const name = remoteModel.name || '';
  const type = remoteModel.type || '';
  const legacyType = type === 'Long' ? 'Max Long' : type;
  const fromList = (models || []).find((m) => {
    if (m.name !== name) return false;
    return m.type === type || m.type === legacyType;
  });
  if (fromList) return { ...fromList };
  if (existingModel && existingModel.name === name &&
      (existingModel.type === type || existingModel.type === legacyType)) {
    return { ...existingModel };
  }
  return { name, type, icon: (existingModel && existingModel.icon) || '' };
}

function collectDeviceState(page) {
  if (!page || !page.data) return {};
  const d = page.data;
  const state = {};
  REMOTE_STATE_KEYS.forEach((k) => {
    if (d[k] !== undefined) state[k] = d[k];
  });
  if (d.currentModel) {
    state.currentModel = { name: d.currentModel.name, type: d.currentModel.type };
  }
  return state;
}

function buildStatePatch(deviceState, options = {}) {
  if (!deviceState || typeof deviceState !== 'object') return {};
  const skipForAdmin = options.forAdmin
    ? [
      'isConnected',
      'connectedDeviceName',
      'currentConnectedRawSn',
      'showDetail',
      'detailMode',
      'editType',
      'foldGap',
      'currentAngle',
      'angleMode',
      'openAngleUiActive',
      'angleBtnText',
      'f2ControlPanelOpen',
      'blockDetailTouch',
      'detailEnterAnim'
    ]
    : [];
  const patch = {};
  REMOTE_STATE_KEYS.forEach((k) => {
    if (skipForAdmin.includes(k)) return;
    if (deviceState[k] !== undefined) patch[k] = deviceState[k];
  });
  if (deviceState.currentModel) {
    const merged = mergeRemoteCurrentModel(
      deviceState.currentModel,
      options.models,
      options.currentModel
    );
    if (merged) patch.currentModel = merged;
  }
  return patch;
}

function callRemoteAssist(data) {
  return wx.cloud.callFunction({
    name: 'remoteAssist',
    data: data || {}
  }).then((res) => {
    const r = (res && res.result) || {};
    if (!r.success) {
      const err = new Error(r.msg || '远协请求失败');
      err.result = r;
      throw err;
    }
    return r;
  });
}

module.exports = {
  scanModelToProductKey,
  isRemoteAssistProduct,
  productKeyToScanModel,
  normalizeProductDetailModel,
  collectDeviceState,
  buildStatePatch,
  callRemoteAssist
};
