/**
 * 枢纽页导航：主页 / 商城 / 订单 / 我的
 * - 底栏 Tab：在同一 products 页内 swiper 平移（不 navigate 订单/我的子页）
 * - 商城：products 内横向第 2 屏（与主页平移）
 */
const hubPageAnim = require('./hubPageAnim.js');

const ROUTES = {
  home: '/package-app/pages/products/products',
  shop: '/package-app/pages/products/products?hubTab=shop',
  orders: '/package-app/pages/products/products?hubTab=1',
  profile: '/package-app/pages/products/products?hubTab=2'
};

/** products 内面板下标：0 主页 1 商城 2 订单 3 我的 */
const PANEL_INDEX = { home: 0, shop: 1, orders: 2, profile: 3 };
/** 底栏 Tab 语义下标（仅 home/orders/profile） */
const TAB_INDEX = { home: 0, orders: 1, profile: 2 };

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
    if (idx === PANEL_INDEX.profile) return 'profile';
    return 'home';
  }
  if (route.indexOf('profile/profile') >= 0) return 'profile';
  if (route.indexOf('orders/orders') >= 0) return 'orders';
  if (route.indexOf('shop/shop') >= 0) return 'shop';
  return 'home';
}

function setProductsHubTab(idx, animate) {
  const pages = getPages();
  const productsIdx = findRouteIndex('products/products');
  if (productsIdx < 0) return false;
  const page = pages[productsIdx];
  if (!page || typeof page.setData !== 'function') return false;
  if (typeof page._setHubTabIndex === 'function') {
    page._setHubTabIndex(idx);
    return true;
  }
  const hubBottomBarIndex = idx <= 1 ? 0 : idx - 1;
  const patch = {
    hubTabIndex: idx,
    hubTrackTranslatePct: idx * 25,
    hubBottomBarIndex,
    hubPanelsAnim: !!animate,
    showHubTabBar: idx !== 1
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
  const pages = getPages();
  const idx = findRouteIndex(part);
  if (idx < 0 || idx >= pages.length - 1) return false;
  wx.navigateBack({ delta: pages.length - 1 - idx });
  return true;
}

/** 回到枢纽首页 Tab（products 内第 0 屏：主页） */
function goHome() {
  if (setProductsHubTab(PANEL_INDEX.home, true)) {
    const pages = getPages();
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      wx.navigateBack({ delta: pages.length - 1 - productsIdx });
    }
    return;
  }
  if (navigatePopToRoute('products/products')) return;
  const pages = getPages();
  if (pages.length <= 1) return;
  wx.navigateBack({ delta: pages.length - 1 });
}

/** 打开商城（products 内第 2 屏，横向平移） */
function openShop() {
  if (setProductsHubTab(PANEL_INDEX.shop, true)) {
    const pages = getPages();
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      wx.navigateBack({ delta: pages.length - 1 - productsIdx });
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
        hubShopMounted: true
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
      wx.navigateBack({ delta: getPages().length - 1 - productsIdx });
    }
    return;
  }

  hubPageAnim.markNextPageEnterAnim();
  navigatePush('/package-app/pages/products/products?hubTab=shop&openCheckout=1').catch((err) => {
    console.warn('[hubNav] openShopCheckout fail', err);
    wx.showToast({ title: '无法打开结算', icon: 'none' });
  });
}

/** 底栏 Tab：home | orders | profile（单页横向平移） */
function switchTab(tab) {
  if (!tab || tab === 'shop') return;
  const cur = currentTab();
  if (cur === tab) return;

  const panelIdx =
    tab === 'home' ? PANEL_INDEX.home : tab === 'orders' ? PANEL_INDEX.orders : PANEL_INDEX.profile;
  if (panelIdx == null) return;

  if (setProductsHubTab(panelIdx, true)) {
    const pages = getPages();
    const productsIdx = findRouteIndex('products/products');
    if (productsIdx >= 0 && productsIdx < pages.length - 1) {
      wx.navigateBack({ delta: pages.length - 1 - productsIdx });
    }
    return;
  }

  const url = ROUTES[tab] || ROUTES.home;
  wx.navigateTo({
    url,
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
  goHome,
  openShop,
  openShopCheckout,
  switchTab,
  switchSegment,
  tryPlayEnterAnimOnShow: hubPageAnim.tryPlayEnterAnimOnShow
};
