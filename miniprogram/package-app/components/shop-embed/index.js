const createShopPageConfig = require('../../pages/shop/shopPageDef.js');
const { pageConfigToComponent } = require('../../../utils/pageConfigToComponent.js');
const { getWindowInfoSafe } = require('../../../utils/windowInfo.js');

Component(pageConfigToComponent(createShopPageConfig({ hubEmbed: true }), {
  properties: {
    shellAuthorized: {
      type: Boolean,
      value: false
    },
    shellAdmin: {
      type: Boolean,
      value: false
    },
    shellStatusBarHeight: {
      type: Number,
      value: 0
    },
    embedScrollHeightFromShell: {
      type: Number,
      value: 0
    }
  },
  dataPatch: {
    hubEmbedInProducts: true,
    showHubShell: false,
    hubPageEnterAnim: false,
    embedScrollHeight: 0
  },
  methodPatch: {
    _applyEmbedScrollHeight() {
      if (!this.data.hubEmbedInProducts) return;
      const fromShell = Number(this.properties.embedScrollHeightFromShell) || 0;
      if (fromShell > 0) {
        if (fromShell !== this.data.embedScrollHeight) {
          this.setData({ embedScrollHeight: fromShell });
        }
        return;
      }
      try {
        const win = getWindowInfoSafe();
        const winH = win.windowHeight || 667;
        const status = this.data.statusBarHeight || win.statusBarHeight || 44;
        const rpx = (win.windowWidth || 375) / 750;
        const segmentH = status + Math.round((128 + 28) * rpx);
        const showAdminBar =
          this.data.isAuthorized &&
          !this.data.showOrderModal &&
          !this.data.showDetail &&
          !this.data.showAccDetail;
        const adminH = showAdminBar ? Math.round(72 * rpx) : 0;
        const h = Math.max(320, Math.floor(winH - segmentH - adminH));
        if (h !== this.data.embedScrollHeight) {
          this.setData({ embedScrollHeight: h });
        }
      } catch (e) {}
    },
    layoutHubEmbedScroll() {
      if (!this.data.hubEmbedInProducts) return;
      if (this._layoutScrollTimer) clearTimeout(this._layoutScrollTimer);
      this._layoutScrollTimer = setTimeout(() => {
        this._layoutScrollTimer = null;
        this._applyEmbedScrollHeight();
        if (typeof this._syncHeroDefaultHeight === 'function') {
          this._syncHeroDefaultHeight();
        }
        const list = this.data.topMediaList || [];
        if (list.length && typeof this._primeHeroSlideHeightsForList === 'function') {
          this._primeHeroSlideHeightsForList(
            typeof this._getTopMediaListForSave === 'function'
              ? this._getTopMediaListForSave()
              : list
          ).catch(() => {});
        }
      }, 32);
    }
  },
  loadOptions: {
    hubShell: '1'
  },
  observers: {
    shellAuthorized(authorized) {
      if (!this._hubPanelAttached) return;
      if (!!authorized !== !!this.data.isAuthorized) {
        this.setData({ isAuthorized: !!authorized });
      }
      if (authorized && typeof this.checkAdminPrivilege === 'function') {
        this.checkAdminPrivilege().catch(() => {});
      }
    },
    shellAdmin(isAdmin) {
      if (!this._hubPanelAttached) return;
      if (!!isAdmin !== !!this.data.isAdmin) {
        this.setData({ isAdmin: !!isAdmin });
      }
    },
    shellStatusBarHeight(h) {
      if (!this._hubPanelAttached) return;
      const top = Number(h) || 0;
      if (top > 0 && top !== this.data.statusBarHeight) {
        this.setData({ statusBarHeight: top });
      }
    },
    embedScrollHeightFromShell(h) {
      if (!this._hubPanelAttached) return;
      const v = Number(h) || 0;
      if (v > 0 && v !== this.data.embedScrollHeight) {
        this.setData({ embedScrollHeight: v });
      }
    },
    active(val) {
      if (!this._hubPanelAttached) return;
      if (this.data.hubEmbedInProducts) {
        this.setData({ hubPanelActive: !!val });
      }
      if (!val) return;
      if (typeof this.onShow === 'function') {
        this.onShow();
      }
      wx.nextTick(() => {
        if (typeof this.layoutHubEmbedScroll === 'function') {
          this.layoutHubEmbedScroll();
        }
      });
      const sections = this.data.categorySections || [];
      const series = this.data.seriesList || [];
      if (sections.length === 0 && series.length === 0) {
        if (!this.db && wx.cloud) {
          this.db = wx.cloud.database();
        }
        if (this.db && typeof this.loadDataFromCloud === 'function') {
          this.loadDataFromCloud();
        }
      }
    }
  }
}));
