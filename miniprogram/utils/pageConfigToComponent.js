/**
 * 将 Page({...}) 配置转为 Component 配置（用于枢纽内嵌面板）
 */
const PAGE_LIFECYCLE = new Set([
  'onLoad',
  'onShow',
  'onHide',
  'onUnload',
  'onReady',
  'onPullDownRefresh',
  'onReachBottom',
  'onShareAppMessage',
  'onShareTimeline',
  'onTabItemTap',
  'onResize',
  'onAddToFavorites',
  'onPageScroll'
]);

function pageConfigToComponent(pageConfig, options = {}) {
  const data = { ...(pageConfig.data || {}) };
  const methods = {};
  const lifecycles = {};

  Object.keys(pageConfig).forEach((key) => {
    if (key === 'data') return;
    if (PAGE_LIFECYCLE.has(key)) {
      lifecycles[key] = pageConfig[key];
    } else if (typeof pageConfig[key] === 'function') {
      methods[key] = pageConfig[key];
    }
  });

  const loadOptions = options.loadOptions || {};

  return {
    properties: {
      active: {
        type: Boolean,
        value: false
      },
      ...(options.properties || {})
    },
    data: {
      ...data,
      ...(options.dataPatch || {})
    },
    lifetimes: {
      attached() {
        this._hubPanelAttached = true;
        this._isLoading = false;
        this._isLoadingSince = 0;
        if (typeof options.onAttached === 'function') {
          options.onAttached.call(this);
        }
        if (lifecycles.onLoad) {
          lifecycles.onLoad.call(this, loadOptions);
        }
        if (lifecycles.onReady) {
          wx.nextTick(() => {
            if (this._hubPanelAttached) {
              lifecycles.onReady.call(this);
            }
          });
        }
        if (this.properties.active && lifecycles.onShow) {
          lifecycles.onShow.call(this);
        }
      },
      detached() {
        this._hubPanelAttached = false;
        if (lifecycles.onUnload) {
          lifecycles.onUnload.call(this);
        }
      }
    },
    pageLifetimes: {
      show() {
        if (!this.properties.active) return;
        if (lifecycles.onShow) {
          lifecycles.onShow.call(this);
        }
      },
      hide() {
        if (lifecycles.onHide) {
          lifecycles.onHide.call(this);
        }
      }
    },
    observers: {
      active(active) {
        if (!this._hubPanelAttached) return;
        if (active) {
          this._isLoading = false;
          this._isLoadingSince = 0;
          if (lifecycles.onShow) lifecycles.onShow.call(this);
        } else if (lifecycles.onHide) {
          lifecycles.onHide.call(this);
        }
      },
      ...(options.observers || {})
    },
    methods: {
      ...methods,
      ...(options.methodPatch || {})
    }
  };
}

module.exports = { pageConfigToComponent };
