const { MUNICIPALITY_DISTRICTS } = require('./smartAddressParser.js');

const MUNICIPALITY_IDS = new Set(['110000', '120000', '310000', '500000']);

function isMapQuotaError(err) {
  if (!err) return false;
  if (err.status === 121) return true;
  const msg = String(err.message || err.errMsg || '');
  return msg.indexOf('上限') >= 0 || msg.indexOf('121') >= 0;
}

function getCityFallbackList(provinceId, provinceName) {
  const id = String(provinceId || '');
  const name = String(provinceName || '').trim();
  if (MUNICIPALITY_IDS.has(id)) {
    const cityName = name.endsWith('市') ? name : `${name.replace(/市$/, '')}市`;
    return [{ id, name: cityName }];
  }
  return [{ id: id || 'fallback_city', name: '其他市（请在详细地址中写明市名）' }];
}

function getDistrictFallbackList(selectedProvince, selectedCity) {
  const key = String(selectedCity || selectedProvince || '').trim();
  const fromMuni = MUNICIPALITY_DISTRICTS[key] || [];
  if (fromMuni.length) {
    return fromMuni.map((name, idx) => ({ id: `fallback_d_${idx}`, name }));
  }
  return [
    { id: 'fallback_d_0', name: '市辖区' },
    { id: 'fallback_d_1', name: '其他区县（请在详细地址中填写）' }
  ];
}

module.exports = {
  MUNICIPALITY_IDS,
  isMapQuotaError,
  getCityFallbackList,
  getDistrictFallbackList
};
