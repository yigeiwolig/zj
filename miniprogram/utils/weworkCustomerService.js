/**
 * 企业微信 · 微信客服（小程序 openCustomerServiceChat）
 * 售前 / 售后可共用 corpId，客服链接 url 分开配置。
 *
 * 客服侧要收到「小程序卡片」需同时满足：
 * showMessageCard + sendMessageTitle + sendMessagePath（路径须带 .html，参数放最后）+ sendMessageImg（HTTPS）
 *
 * 注意：微信规定卡片不能代用户自动发出。showMessageCard 只会在会话右下角显示
 * 「可能要发送的小程序」气泡，用户必须自己点一下，卡片才会出现在聊天记录里。
 */

const hubNav = require('./hubNav.js');

const WEWORK_CORP_ID = 'wwc4146491f9b5d26f';

/** 售前客服链接（企业微信 → 微信客服 → 对应账号 → 小程序接入） */
const PRE_SALES_KF_URL = 'https://work.weixin.qq.com/kfid/kfc859b7d81a1a1e48f';

/**
 * 售后客服链接（企业微信 → 微信客服 → 售后账号 → 小程序接入）
 * 配置步骤与售前相同，换绑售后接待人员即可；留空则走备用联系页。
 */
const AFTER_SALES_KF_URL = 'https://work.weixin.qq.com/kfid/kfcaf201a5021dee20f';

const CALL_PAGE = '/package-biz/pages/call/call';
const DEFAULT_FALLBACK_URL = `${CALL_PAGE}?from=shop&scene=pre`;
const AFTER_SALES_FALLBACK_URL = `${CALL_PAGE}?scene=after`;

/** 无商品图时的客服气泡缩略图（须为 HTTPS 或本地包内路径） */
const DEFAULT_KF_MESSAGE_IMG = '/images/qrcode.jpg';

function buildKfMessagePath(series) {
  const s = series || {};
  const jumpNumber = s.jumpNumber;
  if (jumpNumber != null && jumpNumber !== '') {
    return `/package-app/pages/shop/shop.html?jumpNumber=${encodeURIComponent(jumpNumber)}`;
  }
  const seriesId = s.id || s._id || s.seriesId;
  if (seriesId) {
    return `/package-app/pages/shop/shop.html?seriesId=${encodeURIComponent(seriesId)}`;
  }
  return '/package-app/pages/products/products.html';
}

function pickHttpsUrl(value) {
  const url = String(value || '').trim();
  return /^https:\/\//i.test(url) ? url : '';
}

function resolveKfMessageImgSync(series) {
  const s = series || {};
  const candidates = [
    s.coverDisplay,
    s.cover,
    s.img,
    s.options && s.options[0] && s.options[0].img
  ].filter(Boolean);

  for (let i = 0; i < candidates.length; i += 1) {
    const https = pickHttpsUrl(candidates[i]);
    if (https) return https;
  }
  return DEFAULT_KF_MESSAGE_IMG;
}

function openWeworkKf(options = {}) {
  const {
    url,
    corpId = WEWORK_CORP_ID,
    title = 'MT商城售前咨询',
    path = '/package-app/pages/products/products.html',
    sendMessageImg = DEFAULT_KF_MESSAGE_IMG,
    showMessageCard = true,
    fallbackUrl = DEFAULT_FALLBACK_URL,
    onFail
  } = options;

  if (!url) {
    wx.navigateTo({ url: fallbackUrl });
    return;
  }

  if (typeof wx.openCustomerServiceChat !== 'function') {
    wx.showToast({ title: '请升级微信后重试', icon: 'none' });
    setTimeout(() => wx.navigateTo({ url: fallbackUrl }), 800);
    return;
  }

  const messagePath = String(path || '').trim();
  const messageTitle = String(title || '').trim();
  const canSendCard = !!(showMessageCard && messageTitle && messagePath);

  const chatData = {
    extInfo: { url },
    corpId,
    showMessageCard: canSendCard,
    sendMessageTitle: messageTitle,
    sendMessagePath: messagePath
  };
  if (sendMessageImg) {
    chatData.sendMessageImg = sendMessageImg;
  }

  wx.openCustomerServiceChat({
    ...chatData,
    success() {},
    fail(err) {
      const code = err && err.errCode;
      const msg = (err && err.errMsg) || '';
      console.warn('[wework-kf] openCustomerServiceChat fail', err);
      if (typeof onFail === 'function') {
        onFail(err);
        return;
      }
      let tip = '客服暂不可用，已为您打开备用联系方式';
      if (code === 6 || /not bound|未绑定/i.test(msg)) {
        tip = '企业微信未绑定本小程序，请联系管理员在公众平台完成绑定';
      }
      wx.showToast({ title: tip, icon: 'none', duration: 2800 });
      setTimeout(() => wx.navigateTo({ url: fallbackUrl }), 800);
    }
  });
}

function openPreSalesKf(options = {}) {
  const series = options.series || null;
  const seriesName = series && series.name ? String(series.name).trim() : '';
  const title = seriesName ? `【售前】${seriesName}` : '【售前】MT商城咨询';
  const path = buildKfMessagePath(series);
  const sendMessageImg = resolveKfMessageImgSync(series);

  // 必须在用户点击的同一调用栈里同步打开，否则右下角气泡可能不出现
  openWeworkKf({
    url: PRE_SALES_KF_URL,
    title,
    path,
    sendMessageImg,
    showMessageCard: true,
    fallbackUrl: DEFAULT_FALLBACK_URL,
    ...options
  });
}

function openAfterSalesKf(options = {}) {
  const title = options.title || '【售后】维修 / 质保咨询';
  const path = options.path || '/package-biz/pages/shouhou/shouhou.html';

  openWeworkKf({
    url: AFTER_SALES_KF_URL,
    title,
    path,
    sendMessageImg: DEFAULT_KF_MESSAGE_IMG,
    showMessageCard: true,
    fallbackUrl: AFTER_SALES_FALLBACK_URL,
    ...options
  });
}

/** 底栏「客服」等：枢纽内横滑切到客服面板（与订单 Tab 一致） */
function navigateToKfSelect(options = {}) {
  hubNav.openKf(options);
}

function openKfPicker(options = {}) {
  navigateToKfSelect(options);
}

module.exports = {
  WEWORK_CORP_ID,
  PRE_SALES_KF_URL,
  AFTER_SALES_KF_URL,
  buildKfMessagePath,
  resolveKfMessageImgSync,
  openWeworkKf,
  openPreSalesKf,
  openAfterSalesKf,
  openKfPicker,
  navigateToKfSelect,
  CALL_PAGE
};
