/**
 * 登录/封禁流程中保留用户填写的邀请码，并在已授权后自动补绑。
 */
const PENDING_KEY = 'pending_referral_invite_code';
const BOUND_KEY = 'referral_invite_bound';

let _flushPromise = null;

const INVITE_CODE_FULL_RE = /^INV[A-Z0-9]{6}$/;
const INVITE_CODE_PARTIAL_RE = /^INV[A-Z0-9]*$/;
const INVITE_CODE_PREFIX_RE = /^I(N(V)?)?$/;

function normalizeCode(raw) {
  return String(raw || '').replace(/[\s-]/g, '').trim().toUpperCase();
}

/** 登录页邀请码输入实时校验：空为合法（选填）；格式/长度不对返回 true */
function isInviteCodeInputInvalid(raw) {
  const code = normalizeCode(raw);
  if (!code) return false;
  if (code.length > 9) return true;
  if (code.length <= 2) return !INVITE_CODE_PREFIX_RE.test(code);
  if (code.length < 9) {
    if (code.slice(0, 3) !== 'INV') return true;
    return !INVITE_CODE_PARTIAL_RE.test(code);
  }
  return !INVITE_CODE_FULL_RE.test(code);
}

function setPendingInviteCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    try { wx.removeStorageSync(PENDING_KEY); } catch (e) {}
    return;
  }
  try { wx.setStorageSync(PENDING_KEY, normalized); } catch (e) {}
}

function getPendingInviteCode() {
  try {
    return normalizeCode(wx.getStorageSync(PENDING_KEY));
  } catch (e) {
    return '';
  }
}

function clearPendingInviteCode() {
  try { wx.removeStorageSync(PENDING_KEY); } catch (e) {}
}

function markInviteBound() {
  try { wx.setStorageSync(BOUND_KEY, true); } catch (e) {}
  clearPendingInviteCode();
}

function shouldSkipFlush() {
  return !getPendingInviteCode();
}

/** 本地标记与云端不一致时（如误标已绑定），允许继续补绑 */
function clearBoundFlagIfNeeded() {
  try { wx.removeStorageSync(BOUND_KEY); } catch (e) {}
}

/**
 * @param {{ onPanel?: (r: object) => void, onToast?: (title: string, content: string) => void, silent?: boolean }} opts
 */
function flushPendingReferralBind(opts) {
  if (shouldSkipFlush()) return Promise.resolve(null);
  if (_flushPromise) return _flushPromise;

  const code = getPendingInviteCode();
  const onPanel = opts && opts.onPanel;
  const onToast = opts && opts.onToast;
  const silent = !!(opts && opts.silent);

  _flushPromise = wx.cloud.callFunction({
    name: 'referral',
    data: { action: 'bindInviteCode', code }
  }).then((res) => {
    const r = (res && res.result) || {};
    if (r.success) {
      markInviteBound();
      if (typeof onPanel === 'function') onPanel(r);
      return r;
    }
    if (r.error && String(r.error).indexOf('已绑定') !== -1) {
      clearPendingInviteCode();
      markInviteBound();
    } else {
      clearBoundFlagIfNeeded();
    }
    if (r.error && !silent && typeof onToast === 'function') {
      onToast('邀请码', r.error);
    }
    return r;
  }).catch((err) => {
    console.warn('[referralPendingBind] flush failed:', err);
    return null;
  }).finally(() => {
    _flushPromise = null;
  });

  return _flushPromise;
}

module.exports = {
  PENDING_KEY,
  setPendingInviteCode,
  getPendingInviteCode,
  clearPendingInviteCode,
  markInviteBound,
  clearBoundFlagIfNeeded,
  flushPendingReferralBind,
  isInviteCodeInputInvalid
};
