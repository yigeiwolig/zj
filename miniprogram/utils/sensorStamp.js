/**
 * F3 MAX 传感器代次印章（云端）
 * imu = 陀螺仪新机；空 / tof = 测高旧机
 * 仅管理员可见；用户界面以 BLE 实测为准
 */

const SENSOR_STAMP_IMU = 'imu';
const SENSOR_STAMP_TOF = 'tof';

function normalizeSensorStamp(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === SENSOR_STAMP_IMU || s === 'gyro' || s === 'mpu') return SENSOR_STAMP_IMU;
  if (s === SENSOR_STAMP_TOF || s === 'height' || s === 'vl53') return SENSOR_STAMP_TOF;
  return '';
}

/** 管理端展示：无章视为测高旧版 */
function sensorStampLabel(raw) {
  const key = normalizeSensorStamp(raw);
  if (key === SENSOR_STAMP_IMU) return 'IMU(陀螺仪)';
  if (key === SENSOR_STAMP_TOF) return 'TOF(测高)';
  return 'TOF(测高·无章)';
}

function isF3MaxProductModel(model) {
  return String(model || '').trim().toUpperCase() === 'F3 MAX';
}

/** 全新预注册 F3 MAX 才自动盖 imu */
function shouldAutoStampImuOnRegister(productModel, existingSnDoc) {
  if (!isF3MaxProductModel(productModel)) return false;
  if (existingSnDoc && existingSnDoc._id) return false;
  return true;
}

module.exports = {
  SENSOR_STAMP_IMU,
  SENSOR_STAMP_TOF,
  normalizeSensorStamp,
  sensorStampLabel,
  isF3MaxProductModel,
  shouldAutoStampImuOnRegister
};
