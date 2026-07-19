/**
 * 用户订阅消息：服务进度(A) + 发货(B) + 待支付(C)
 * 一次授权最多勾 3 个模板；每允许一次 ≈ 该模板可推 1 条。
 */
const TMPL = {
  progress: '3fLmcXWdGMpYtnHbpSxjGFnW0zubj52IAA-go7uRxlY',
  ship: 'SrAJkbpEWoo3EUGnmuQu4aFG8LM2MOlfwnyX6GeENSg',
  pay: 'ekcNRwB-aUObfL4_AsFBOoBbCvoBnzDtCYKCKWu3jwc'
};

const ALL_TMPL_IDS = [TMPL.progress, TMPL.ship, TMPL.pay];

function requestSubscribeMessage(tmplIds) {
  const ids = Array.isArray(tmplIds) && tmplIds.length ? tmplIds : ALL_TMPL_IDS;
  return new Promise((resolve) => {
    if (!wx.requestSubscribeMessage) {
      resolve({ ok: false, reason: 'unsupported' });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: ids,
      success: (res) => {
        const accepted = ids.filter((id) => res && res[id] === 'accept');
        resolve({
          ok: accepted.length > 0,
          accepted,
          raw: res
        });
      },
      fail: (err) => {
        resolve({
          ok: false,
          reason: 'fail',
          errMsg: (err && err.errMsg) || ''
        });
      }
    });
  });
}

/** 一次弹 A+B+C */
function requestAllSubscribe() {
  return requestSubscribeMessage(ALL_TMPL_IDS);
}

/** 兼容旧名 */
function requestRepairProgressSubscribe() {
  return requestAllSubscribe();
}

function sendSubscribeNotify(payload = {}) {
  if (!wx.cloud || !wx.cloud.callFunction) {
    return Promise.resolve({ success: false, errMsg: 'no cloud' });
  }
  return wx.cloud
    .callFunction({
      name: 'sendSubscribeMessage',
      data: payload || {}
    })
    .then((res) => (res && res.result) || { success: false })
    .catch((err) => {
      console.warn('[subscribeMessage] send failed', err);
      return { success: false, errMsg: (err && err.errMsg) || String(err) };
    });
}

function sendRepairProgressNotify(payload = {}) {
  return sendSubscribeNotify(payload);
}

/** 先弹授权，再执行 next（拒绝也继续业务） */
function withSubscribeThen(next, tmplIds) {
  const run = typeof next === 'function' ? next : () => {};
  return requestSubscribeMessage(tmplIds)
    .catch(() => ({ ok: false }))
    .then(() => run());
}

function withRepairProgressSubscribe(next) {
  return withSubscribeThen(next, ALL_TMPL_IDS);
}

module.exports = {
  TMPL,
  ALL_TMPL_IDS,
  REPAIR_PROGRESS_TMPL_ID: TMPL.progress,
  requestSubscribeMessage,
  requestAllSubscribe,
  requestRepairProgressSubscribe,
  sendSubscribeNotify,
  sendRepairProgressNotify,
  withSubscribeThen,
  withRepairProgressSubscribe
};
