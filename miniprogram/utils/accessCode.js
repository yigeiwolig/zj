const ACCESS_CODE_PREFIX = 'VK';
const ACCESS_CODE_BODY_LEN = 6;
const ACCESS_CODE_RE = /^VK[A-Z0-9]{6}$/;

function normalizeAccessCode(raw) {
  return String(raw || '').replace(/[\s-]/g, '').toUpperCase();
}

function isAccessCodeFormat(raw) {
  return ACCESS_CODE_RE.test(normalizeAccessCode(raw));
}

/** 复制/展示用：去掉「用户-」等前缀，只保留 VK 口令 */
function extractPlainAccessCode(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (s.indexOf('用户-') === 0) {
    s = s.slice(3);
  }
  const normalized = normalizeAccessCode(s);
  if (ACCESS_CODE_RE.test(normalized)) return normalized;
  return s.trim();
}

module.exports = {
  ACCESS_CODE_PREFIX,
  ACCESS_CODE_BODY_LEN,
  ACCESS_CODE_RE,
  normalizeAccessCode,
  isAccessCodeFormat,
  extractPlainAccessCode
};
