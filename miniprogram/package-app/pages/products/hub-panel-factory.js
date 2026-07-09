const createMyPageConfig = require('../my/myPageDef.js');
const { pageConfigToComponent } = require('../../../utils/pageConfigToComponent.js');

function buildHubMyPanel(hubView) {
  const pageCfg = createMyPageConfig(hubView);
  const baseOnHubTabSwitch = pageCfg.onHubTabSwitch;

  return pageConfigToComponent(pageCfg, {
    properties: {
      active: {
        type: Boolean,
        value: false
      },
      shellAuthorized: {
        type: Boolean,
        value: false
      },
      shellAdmin: {
        type: Boolean,
        value: false
      }
    },
    dataPatch: {
      hubView,
      hubTabIndex: hubView === 'orders' ? 2 : 4,
      hubInShell: true,
      showHubTabBar: false,
      hubPageEnterAnim: false
    },
    observers: {
      shellAuthorized(authorized) {
        if (!this._hubPanelAttached) return;
        if (!!authorized !== !!this.data.isAuthorized) {
          this.setData({ isAuthorized: !!authorized });
        }
        // 仅拉取 openid；勿在已授权后重复 checkAdminPrivilege，以免异步结果把 isAdmin 打回 false
        if (authorized && !this.data.myOpenid && typeof this.checkAdminPrivilege === 'function') {
          this.checkAdminPrivilege().catch(() => {});
        }
      },
      shellAdmin(isAdmin) {
        if (!this._hubPanelAttached) return;
        if (!!isAdmin !== !!this.data.isAdmin) {
          this.setData({ isAdmin: !!isAdmin });
        }
      }
    },
    onAttached() {
      const authPatch = {};
      if (this.properties.shellAuthorized) {
        authPatch.isAuthorized = true;
      }
      if (this.properties.shellAdmin) {
        authPatch.isAdmin = true;
      }
      if (Object.keys(authPatch).length) {
        this.setData(authPatch);
      }
    },
    methodPatch: {
      onHubTabSwitch(e) {
        if (this.data.hubInShell) {
          const tab = e.detail && e.detail.tab;
          if (tab) this.triggerEvent('switch', { tab });
          return;
        }
        if (baseOnHubTabSwitch) baseOnHubTabSwitch.call(this, e);
      }
    }
  });
}

module.exports = { buildHubMyPanel };
