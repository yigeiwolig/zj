/**
 * 枢纽页导航：主页 / 商城 / 订单 / 客服 / 我的
 * - 底栏 Tab：在同一 products 页内 swiper 平移（不 navigate 子页）
 * - 商城：products 内横向第 2 屏（与主页平移）
 */
const hubPageAnim = require('./hubPageAnim.js');
const pageBack = require('./pageBack.js');

const HUB_PANEL_COUNT = 5;
const HUB_PANEL_STEP = 100 / HUB_PANEL_COUNT;

const ROUTES = {
  home: '/package-app/pages/products/products',
  shop: '/package-app/pages/products/products?hubTab=shop',
  orders: '/package-app/pages/products/products?hubTab=1',
  kf: '/package-app/pages/products/products?hubTab=kf',
  profile: '/package-app/pages/products/products?hubTab=2'
};

/** products 内面板下标：0 主页 1 商城 2 订单 3 客服 4 我的 */
const PANEL_INDEX = { home: 0, shop: 1, orders: 2, kf: 3, profile: 4 };
/** 底栏 Tab 语义下标 */
const TAB_INDEX = { home: 0, orders: 1, kf: 2, profile: 3 };

function panelIndexToTranslatePct(panelIdx) {
  return panelIdx * HUB_PANEL_STEP;
}

/** URL hubTab 参数 → 面板下标 */
function resolveHubTabParam(raw) {
  if (raw == null || raw === '') return NaN;
  const text = String(raw);
  if (text === 'shop') return PANEL_INDEX.shop;
  if (text === 'kf') return PANEL_INDEX.kf;
  const n = Number(text);
  if (Number.isNaN(n)) return NaN;
  if (n === 0) return PANEL_INDEX.home;
  if (n === 1) return PANEL_INDEX.orders;
  if (n === 2) return PANEL_INDEX.profile;
  if (n === 3) return PANEL_INDEX.kf;
  return NaN;
}

/** 面板下标 → 底栏高亮：0首页 1订单 2客服 3我的 */
function panelIndexToBottomBarActive(panelIdx) {
  if (panelIdx <= 1) return TAB_INDEX.home;
  if (panelIdx === PANEL_INDEX.orders) return TAB_INDEX.orders;
  if (panelIdx === PANEL_INDEX.kf) return TAB_INDEX.kf;
  if (panelIdx === PANEL_INDEX.profile) return TAB_INDEX.profile;
  return TAB_INDEX.home;
}

function getPages() {
  return getCurrentPages() || [];
}

function findRouteIndex(part) {
  const pages = getPages();
  return pages.findIndex((p) => (p.route || '').indexOf(part) >= 0);
}

function currentRoute() {
  const pages = getPages();
  const cur = pages[pages.length - 1];
  return (cur && cur.route) || '';
}

function currentTab() {
  const route = currentRoute();
  if (route.indexOf('products/products') >= 0) {
    const pages = getPages();
    const page = pages[pages.length - 1];
    const idx = page && page.data && page.data.hubTabIndex;
    if (idx === PANEL_INDEX.shop) return 'shop';
    if (idx === PANEL_INDEX.orders) return 'orders';
    if (idx === PANEL_INDEX.kf) return 'kf';
    if (idx === PANEL_INDEX.profile) return 'profile';
    return 'home';
  }
  if (route.indexOf('profile/profile') >= 0) return 'profile';
  if (route.indexOf('orders/orders') >= 0) return 'orders';
  if (route.indexOf('shop/shop') >= 0) return 'shop';
  if (route.indexOf('kf-select/kf-select') >= 0) return 'kf';
  return 'home';
}

function applyKfHighlight(scene) {
  const pages = getPages();
  const productsIdx = findRouteIndex('products/products');
  if (productsIdx < 0) return;
  const page = pages[productsIdx];
  if (!page || typeof page.setData !== 'function') return;
  const patch = { hubKfHighlightScene: scene || '' };
  page.setData(patch);
  const panel = page.selectComponent && page.selectComponent('#hubKfPanel');
  if (panel && typeof panel.setData === 'function') {
    panel.setData({ highlightScene: scene || '' });
  }
}

function setProductsHubTab(idx, animate, extraPatch) {
  const pages = getPages();
  const productsIdx = findRouteIndex('products/products');
  if (productsIdx < 0) return false;
  const page = pages[productsIdx];
  if (!page || typeof page.setData !== 'function') return false;
  if (typeof page._setHubTabIndex === 'function') {
    page._setHubTabIndex(idx);
    if (extraPatch && Object.keys(extraPatch).length) {
      page.setData(extraPatch);
    }
    return true;
  }
  const hubBottomBarIndex = panelIndexToBottomBarActive(idx);
  const patch = {
    hubTabIndex: idx,
    hubTrackTranslatePct: panelIndexToTranslatePct(idx),
    hubBottomBarIndex,
    hubPanelsAnim: !!animate,
    showHubTabBar: idx !== PANEL_INDEX.shop,
    ...(extraPatch || {})
  };
  if (animate) patch.hubSwiperDuration = 320;
  page.setData(patch);
  return true;
}

function navigatePush(url) {
  hubPageAnim.markNextPageEnterAnim();
  return new Promise((resolve, reject) => {
    wx.navigateTo({
      url,
      success: resolve,
      fail: (err) => {
        hubPageAnim.consumeEnterAnim();
        reject(err);
      }
    });
  });
}

function navigatePopToRoute(part) {
  return pageBack.popToRoute(part, { fallback: 'hub' });
}

/** 回到枢纽首页 Tab（products 内第 0 屏：主页） */
function goHome() {
  if (setProductsHubTab(PANEL_INDEX.home, true)) {
    const pages = getPages();
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      pageBack.safePop(pages.length - 1 - productsIdx);
    }
    return;
  }
  if (navigatePopToRoute('products/products')) return;
  pageBack.popOrHub();
}

/** 打开商城（products 内第 2 屏，横向平移） */
function openShop() {
  if (setProductsHubTab(PANEL_INDEX.shop, true)) {
    const pages = getPages();
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      pageBack.safePop(pages.length - 1 - productsIdx);
    }
    return;
  }
  hubPageAnim.markNextPageEnterAnim();
  navigatePush(ROUTES.shop).catch((err) => {
    console.warn('[hubNav] openShop fail', err);
    wx.showToast({ title: '无法打开商城', icon: 'none' });
  });
}

/** 打开商城并弹出「确认订单」结算层 */
function openShopCheckout() {
  const pages = getPages();
  const invokeCheckout = (page) => {
    if (page && typeof page.openCheckoutFromHub === 'function') {
      page.openCheckoutFromHub();
    }
  };

  const productsIdx = findRouteIndex('products/products');
  if (productsIdx >= 0) {
    const page = pages[productsIdx];
    if (typeof page._setHubTabIndex === 'function') {
      page._setHubTabIndex(PANEL_INDEX.shop);
    } else {
      page.setData({
        hubTabIndex: PANEL_INDEX.shop,
        hubShopMounted: true,
        showHubTabBar: false,
        hubBottomBarIndex: 0,
        hubTrackTranslatePct: panelIndexToTranslatePct(PANEL_INDEX.shop)
      });
    }
    setTimeout(() => {
      const panel = page.selectComponent && page.selectComponent('#hubShopPanel');
      if (panel && typeof panel.openCheckoutFromHub === 'function') {
        panel.openCheckoutFromHub();
        return;
      }
      invokeCheckout(page);
    }, 320);
    if (productsIdx < getPages().length - 1) {
      pageBack.safePop(getPages().length - 1 - productsIdx);
    }
    return;
  }

  hubPageAnim.markNextPageEnterAnim();
  navigatePush('/package-app/pages/products/products?hubTab=shop&openCheckout=1').catch((err) => {
    console.warn('[hubNav] openShopCheckout fail', err);
    wx.showToast({ title: '无法打开结算', icon: 'none' });
  });
}

/** 打开客服面板（枢纽内横滑，与订单 Tab 一致） */
function openKf(options = {}) {
  const scene = options.scene ? String(options.scene) : '';
  const extraPatch = scene ? { hubKfHighlightScene: scene } : {};
  if (setProductsHubTab(PANEL_INDEX.kf, true, extraPatch)) {
    if (scene) applyKfHighlight(scene);
    const pages = getPages();
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      pageBack.safePop(pages.length - 1 - productsIdx);
    }
    return true;
  }

  const sceneQuery = scene ? `&scene=${encodeURIComponent(scene)}` : '';
  wx.navigateTo({
    url: `${ROUTES.kf}${sceneQuery}`,
    animationType: 'none',
    fail: () => {
      wx.reLaunch({ url: `${ROUTES.kf}${sceneQuery}` });
    }
  });
  return false;
}

/** 底栏 Tab：home | orders | kf | profile（单页横向平移） */
function switchTab(tab, options = {}) {
  if (!tab || tab === 'shop') return;
  const cur = currentTab();
  if (cur === tab && tab !== 'kf') return;

  if (tab === 'kf') {
    openKf(options);
    return;
  }

  const panelIdx =
    tab === 'home' ? PANEL_INDEX.home : tab === 'orders' ? PANEL_INDEX.orders : PANEL_INDEX.profile;
  if (panelIdx == null) return;

  if (setProductsHubTab(panelIdx, true)) {
    const pages = getPages();
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      pageBack.safePop(pages.length - 1 - productsIdx);
    }
    return;
  }

  const url = ROUTES[tab] || ROUTES.home;
  wx.navigateTo({
    url,
    animationType: 'none',
    fail: () => {
      wx.reLaunch({ url });
    }
  });
}

/** 顶栏分段：home | shop（products 内 0/1 屏平移） */
function switchSegment(segment) {
  if (segment === 'shop') {
    openShop();
    return;
  }
  if (segment === 'home') {
    goHome();
  }
}

module.exports = {
  ROUTES,
  TAB_INDEX,
  PANEL_INDEX,
  HUB_PANEL_COUNT,
  HUB_PANEL_STEP,
  panelIndexToTranslatePct,
  resolveHubTabParam,
  panelIndexToBottomBarActive,
  goHome,
  openShop,
  openShopCheckout,
  openKf,
  switchTab,
  switchSegment,
  tryPlayEnterAnimOnShow: hubPageAnim.tryPlayEnterAnimOnShow
};
