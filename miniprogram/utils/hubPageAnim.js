/**
 * 枢纽 Tab 前进时给下一页播放「从右侧滑入」动画（弥补部分环境下路由动画不明显）
 */
let pendingEnterAnim = false;

function markNextPageEnterAnim() {
  pendingEnterAnim = true;
}

function consumeEnterAnim() {
  const v = pendingEnterAnim;
  pendingEnterAnim = false;
  return v;
}

function playEnterAnim(pageCtx) {
  if (!pageCtx || typeof pageCtx.setData !== 'function') return;
  pageCtx.setData({ hubPageEnterAnim: true });
  setTimeout(() => {
    if (pageCtx && typeof pageCtx.setData === 'function') {
      pageCtx.setData({ hubPageEnterAnim: false });
    }
  }, 320);
}

function tryPlayEnterAnimOnShow(pageCtx) {
  if (consumeEnterAnim()) {
    playEnterAnim(pageCtx);
  }
}

module.exports = {
  markNextPageEnterAnim,
  consumeEnterAnim,
  playEnterAnim,
  tryPlayEnterAnimOnShow
};
