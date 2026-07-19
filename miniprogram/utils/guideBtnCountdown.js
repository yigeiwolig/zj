/** 教学 / 演示弹窗：确认按钮统一至少等待秒数后才能点 */
const GUIDE_BTN_LOCK_SEC = 3;

/**
 * @param {object} ctx page 或 component（有 setData）
 * @param {{
 *   lockedKey: string,
 *   textKey: string,
 *   readyText: string,
 *   seconds?: number,
 *   timerProp?: string,
 *   lockedText?: (n:number)=>string
 * }} opts
 */
function startGuideBtnCountdown(ctx, opts) {
  if (!ctx || !opts || !opts.lockedKey || !opts.textKey) return;
  const seconds = Math.max(1, Number(opts.seconds) || GUIDE_BTN_LOCK_SEC);
  const timerProp = opts.timerProp || '_guideBtnLockTimer';
  const readyText = opts.readyText != null ? String(opts.readyText) : '知道了';
  const lockedText = typeof opts.lockedText === 'function'
    ? opts.lockedText
    : (n) => `${readyText} (${n}s)`;

  if (ctx[timerProp]) {
    clearInterval(ctx[timerProp]);
    ctx[timerProp] = null;
  }

  const patch = {};
  patch[opts.lockedKey] = true;
  patch[opts.textKey] = lockedText(seconds);
  ctx.setData(patch);

  let left = seconds;
  ctx[timerProp] = setInterval(() => {
    left -= 1;
    if (left > 0) {
      const tick = {};
      tick[opts.textKey] = lockedText(left);
      ctx.setData(tick);
      return;
    }
    clearInterval(ctx[timerProp]);
    ctx[timerProp] = null;
    const done = {};
    done[opts.lockedKey] = false;
    done[opts.textKey] = readyText;
    ctx.setData(done);
  }, 1000);
}

function clearGuideBtnCountdown(ctx, timerProp) {
  const prop = timerProp || '_guideBtnLockTimer';
  if (!ctx || !ctx[prop]) return;
  clearInterval(ctx[prop]);
  ctx[prop] = null;
}

module.exports = {
  GUIDE_BTN_LOCK_SEC,
  startGuideBtnCountdown,
  clearGuideBtnCountdown
};
