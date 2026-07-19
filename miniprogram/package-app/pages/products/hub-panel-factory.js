const createMyPageConfig = require('../my/myPageDef.js');
const { pageConfigToComponent } = require('../../../utils/pageConfigToComponent.js');
const { getProfileGuidePatch } = require('./hub-profile-guide.mixin.js');

function buildHubMyPanel(hubView) {
  const pageCfg = createMyPageConfig(hubView);
  const baseOnHubTabSwitch = pageCfg.onHubTabSwitch;
  const profileGuidePatch = hubView === 'profile' ? getProfileGuidePatch() : null;

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
      hubPageEnterAnim: false,
      ...(profileGuidePatch ? profileGuidePatch.dataPatch : {})
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
        // 管理员身份异步到位后：关闭误弹的教程，管理员不补弹
        if (
          profileGuidePatch &&
          authorized &&
          this.properties.active &&
          typeof this.closeProfileGuide === 'function'
        ) {
          if (this.data.showProfileGuide || this.data.showProfileGuideIntro) {
            this.closeProfileGuide(false);
          }
        }
      },
      shellAdmin(isAdmin) {
        if (!this._hubPanelAttached) return;
        const afterAdminFlag = () => {
          if (!profileGuidePatch || typeof this.closeProfileGuide !== 'function') return;
          // 管理员（管理/用户视图）均不弹「我的」教程
          if (
            isAdmin ||
            this.data.isAuthorized ||
            this.properties.shellAuthorized
          ) {
            if (this.data.showProfileGuide || this.data.showProfileGuideIntro) {
              this.closeProfileGuide(false);
            }
            return;
          }
          if (this.properties.active && typeof this._maybeShowProfileGuide === 'function') {
            this._maybeShowProfileGuide(false);
          }
        };
        if (!!isAdmin !== !!this.data.isAdmin) {
          this.setData({ isAdmin: !!isAdmin }, afterAdminFlag);
        } else {
          afterAdminFlag();
        }
      },
      ...(profileGuidePatch ? profileGuidePatch.observers : {})
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
      if (profileGuidePatch && typeof profileGuidePatch.onAttachedExtra === 'function') {
        profileGuidePatch.onAttachedExtra.call(this);
      }
    },
    onDetached() {
      if (profileGuidePatch && typeof this._clearProfileGuideTimers === 'function') {
        this._clearProfileGuideTimers();
      }
      if (this.data.profileGuideDemoBind) {
        this._profileGuideAllowClose = true;
        if (typeof this.closeBindModal === 'function') {
          this.closeBindModal();
        }
        this._profileGuideAllowClose = false;
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
      },
      ...(profileGuidePatch ? profileGuidePatch.methodPatch : {})
    }
  });
}

module.exports = { buildHubMyPanel };
