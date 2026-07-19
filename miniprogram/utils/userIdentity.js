const { isAccessCodeFormat, extractPlainAccessCode } = require('./accessCode.js');

const STORAGE_KEYS = {
  LOGIN_IDENTITY_TYPE: 'login_identity_type',
  USER_NICKNAME: 'user_nickname',
  USER_ACCESS_CODE: 'user_access_code',
  HAS_PERMANENT_AUTH: 'has_permanent_auth'
};

const IDENTITY_TYPE = {
  NICKNAME: 'nickname',
  ACCESS_CODE: 'access_code'
};

function _readStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    return '';
  }
}

function getLoginIdentityType() {
  const stored = _readStorage(STORAGE_KEYS.LOGIN_IDENTITY_TYPE);
  if (stored === IDENTITY_TYPE.NICKNAME || stored === IDENTITY_TYPE.ACCESS_CODE) {
    return stored;
  }

  const accessCode = extractPlainAccessCode(_readStorage(STORAGE_KEYS.USER_ACCESS_CODE));
  if (accessCode && isAccessCodeFormat(accessCode)) {
    return IDENTITY_TYPE.ACCESS_CODE;
  }

  const nickname = String(_readStorage(STORAGE_KEYS.USER_NICKNAME) || '').trim();
  if (nickname && isAccessCodeFormat(nickname)) {
    return IDENTITY_TYPE.ACCESS_CODE;
  }
  if (nickname) {
    return IDENTITY_TYPE.NICKNAME;
  }
  return '';
}

function hasVerifiedAuth() {
  return !!_readStorage(STORAGE_KEYS.HAS_PERMANENT_AUTH) && !!getLoginIdentityType();
}

function _truncate(text, maxLen) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (!maxLen || maxLen <= 0 || s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}...`;
}

function getDisplayIdentity(options = {}) {
  const { fallback = '匿名用户', maxLen = 0 } = options;
  const type = getLoginIdentityType();

  if (type === IDENTITY_TYPE.ACCESS_CODE) {
    let code = extractPlainAccessCode(_readStorage(STORAGE_KEYS.USER_ACCESS_CODE));
    if (!code || !isAccessCodeFormat(code)) {
      code = extractPlainAccessCode(_readStorage(STORAGE_KEYS.USER_NICKNAME));
    }
    if (code && isAccessCodeFormat(code)) {
      return _truncate(code, maxLen) || fallback;
    }
  }

  if (type === IDENTITY_TYPE.NICKNAME) {
    const nickname = String(_readStorage(STORAGE_KEYS.USER_NICKNAME) || '').trim();
    if (nickname && !isAccessCodeFormat(nickname)) {
      return _truncate(nickname, maxLen) || fallback;
    }
  }

  return fallback;
}

function saveLoginIdentity({ identityType, nickname, accessCode }) {
  if (identityType === IDENTITY_TYPE.ACCESS_CODE) {
    const code = extractPlainAccessCode(accessCode || nickname);
    wx.setStorageSync(STORAGE_KEYS.LOGIN_IDENTITY_TYPE, IDENTITY_TYPE.ACCESS_CODE);
    wx.setStorageSync(STORAGE_KEYS.USER_ACCESS_CODE, code);
    wx.setStorageSync(STORAGE_KEYS.USER_NICKNAME, code);
    return;
  }

  if (identityType === IDENTITY_TYPE.NICKNAME) {
    const nick = String(nickname || '').trim();
    wx.setStorageSync(STORAGE_KEYS.LOGIN_IDENTITY_TYPE, IDENTITY_TYPE.NICKNAME);
    wx.setStorageSync(STORAGE_KEYS.USER_NICKNAME, nick);
    wx.removeStorageSync(STORAGE_KEYS.USER_ACCESS_CODE);
  }
}

function saveLoginIdentityFromLoginResult({ isAccessCodeLogin, nickname, accessCode }) {
  if (isAccessCodeLogin) {
    saveLoginIdentity({
      identityType: IDENTITY_TYPE.ACCESS_CODE,
      accessCode: accessCode || nickname
    });
    return;
  }
  saveLoginIdentity({
    identityType: IDENTITY_TYPE.NICKNAME,
    nickname
  });
}

function restoreLoginIdentityFromRecord(userRecord) {
  if (!userRecord) return false;

  const accessCode = extractPlainAccessCode(userRecord.accessCode);
  if (accessCode && isAccessCodeFormat(accessCode)) {
    saveLoginIdentity({
      identityType: IDENTITY_TYPE.ACCESS_CODE,
      accessCode
    });
    return true;
  }

  const nickname = String(userRecord.nickname || '').trim();
  if (!nickname) return false;

  if (isAccessCodeFormat(nickname)) {
    saveLoginIdentity({
      identityType: IDENTITY_TYPE.ACCESS_CODE,
      accessCode: nickname
    });
  } else {
    saveLoginIdentity({
      identityType: IDENTITY_TYPE.NICKNAME,
      nickname
    });
  }
  return true;
}

function clearLoginIdentity() {
  wx.removeStorageSync(STORAGE_KEYS.LOGIN_IDENTITY_TYPE);
  wx.removeStorageSync(STORAGE_KEYS.USER_NICKNAME);
  wx.removeStorageSync(STORAGE_KEYS.USER_ACCESS_CODE);
}

module.exports = {
  IDENTITY_TYPE,
  getLoginIdentityType,
  hasVerifiedAuth,
  getDisplayIdentity,
  saveLoginIdentity,
  saveLoginIdentityFromLoginResult,
  restoreLoginIdentityFromRecord,
  clearLoginIdentity
};
