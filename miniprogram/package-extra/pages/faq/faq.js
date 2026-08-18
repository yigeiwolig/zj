const pageBack = require('../../../utils/pageBack.js');
const { PRODUCT_SERIES_OPTIONS } = require('../../../utils/productModels.js');
const { requestRepairProgressSubscribe } = require('../../../utils/subscribeMessage.js');

const ADMIN_CACHE_KEY = '__faq_admin_privilege_cache__';

function callManage(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'troubleshootManage',
    data: { action, ...data },
    config: { timeout: 25000 }
  }).then((res) => (res && res.result) || { ok: false, errMsg: '无返回' });
}

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 44,
    windowHeight: 667,
    isAdmin: false,
    seriesList: PRODUCT_SERIES_OPTIONS.map((name) => ({ name })),
    showDetail: false,
    detailClosing: false,
    detailAnimIn: false,
    currentSeries: '',
    questions: [],
    questionsLoading: false,
    questionsError: '',
    saving: false,
    showEditModal: false,
    editModalAnimIn: false,
    editModalTitle: '',
    editModalValue: '',
    editModalMode: '', // add | rename
    editModalSyncAll: false,
    showDeleteSheet: false,
    deleteSheetAnimIn: false,
    deleteSheetTitle: ''
  },

  onLoad() {
    this.calcNavBarInfo();
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('faq');
    }
    if (!wx.cloud) return;
    try {
      wx.cloud.init({ traceUser: true });
    } catch (e) {}
    this.db = wx.cloud.database();
    this.checkAdminPrivilege();
    this._ensureFaqSubscribe();
    this._checkRepairNotice();
  },

  onShow() {
    const app = getApp();
    if (app && app.startQiangliCheck) app.startQiangliCheck();
    if (this.data.showDetail && this.data.currentSeries) {
      this.loadQuestions(this.data.currentSeries);
    }
    this._ensureFaqSubscribe();
    this._checkRepairNotice();
  },

  /** 进入常见问题：申请售后进度订阅，售后回复时可推送 */
  _ensureFaqSubscribe() {
    if (this.data.isAdmin || this._faqSubscribeAsked) return;
    this._faqSubscribeAsked = true;
    requestRepairProgressSubscribe().catch(() => {});
  },

  /** 售后已回复排查记录时，进页提醒用户 */
  _checkRepairNotice() {
    if (this.data.isAdmin || this._faqRepairNoticeShown) return;
    if (!wx.cloud || !wx.cloud.callFunction) return;
    callManage('listMyRepairNotice')
      .then((r) => {
        const item = Array.isArray(r.list) && r.list[0];
        if (!item || !item._id) return;
        this._faqRepairNoticeShown = true;
        const model = item.model ? `（${item.model}）` : '';
        wx.showModal({
          title: '售后已回复',
          content: `售后部门已查看你的排查记录${model}，请按指引前往维修中心申报。`,
          confirmText: '去申报',
          cancelText: '稍后',
          success: (dlg) => {
            callManage('ackRepairNotice', { reportId: item._id }).catch(() => {});
            if (!dlg || !dlg.confirm) return;
            const query = ['serviceType=repair'];
            if (item.model) query.push(`model=${encodeURIComponent(item.model)}`);
            wx.navigateTo({
              url: `/package-biz/pages/shouhou/shouhou?${query.join('&')}`
            });
          }
        });
      })
      .catch(() => {});
  },

  onHide() {
    const app = getApp();
    if (app && app.stopQiangliCheck) app.stopQiangliCheck();
  },

  onUnload() {
    if (this._detailAnimTimer) clearTimeout(this._detailAnimTimer);
    if (this._editModalTimer) clearTimeout(this._editModalTimer);
    if (this._deleteSheetTimer) clearTimeout(this._deleteSheetTimer);
    const app = getApp();
    if (app && app.stopQiangliCheck) app.stopQiangliCheck();
  },

  calcNavBarInfo() {
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = gap * 2 + menuButton.height;
      this.setData({
        statusBarHeight,
        navBarHeight,
        windowHeight: windowInfo.windowHeight || 667
      });
    } catch (e) {
      this.setData({ statusBarHeight: 44, navBarHeight: 44, windowHeight: 667 });
    }
  },

  _toast(title, icon = 'none') {
    try {
      const app = getApp();
      if (app && typeof app.showToast === 'function') {
        app.showToast({ title, icon, duration: 2200 });
        return;
      }
    } catch (e) {}
    wx.showToast({ title, icon, duration: 2200 });
  },

  _readAdminPrivilegeCache() {
    const keys = [
      ADMIN_CACHE_KEY,
      '__products_admin_privilege_cache__',
      '__shop_admin_privilege_cache__',
      '__pagenew_admin_privilege_cache__'
    ];
    const ttl = 10 * 60 * 1000;
    for (let i = 0; i < keys.length; i++) {
      try {
        const cache = wx.getStorageSync(keys[i]);
        if (cache && cache.isAuthorized === true && cache.ts && Date.now() - cache.ts < ttl) {
          return true;
        }
      } catch (e) {}
    }
    return null;
  },

  async checkAdminPrivilege() {
    const cached = this._readAdminPrivilegeCache();
    if (cached === true) {
      if (!this.data.isAuthorized) this.setData({ isAuthorized: true });
      return;
    }
    if (!wx.cloud) return;
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = (res && res.result && res.result.openid) || '';
      if (!myOpenid) return;
      if (!this.db) this.db = wx.cloud.database();
      let adminCheck = await this.db.collection('guanliyuan').where({ openid: myOpenid }).get();
      if (!adminCheck.data || !adminCheck.data.length) {
        adminCheck = await this.db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }
      const isAuthorized = !!(adminCheck.data && adminCheck.data.length);
      this.setData({ isAuthorized });
      try {
        wx.setStorageSync(ADMIN_CACHE_KEY, { isAuthorized, ts: Date.now() });
      } catch (e) {}
    } catch (err) {
      console.error('[faq] checkAdminPrivilege', err);
    }
  },

  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this._toast('无权限');
      return;
    }
    const next = !this.data.isAdmin;
    this.setData({ isAdmin: next });
    if (this.data.showDetail && this.data.currentSeries) {
      this.loadQuestions(this.data.currentSeries);
    }
  },

  goBack() {
    if (this.data.showDetail && !this.data.detailClosing) {
      this.closeDetail();
      return;
    }
    // 只退一层，不要一口气跳回产品主页
    pageBack.goBack({ preferProducts: false, fallback: 'hub' });
  },

  onBackPress() {
    if (this.data.showDetail && !this.data.detailClosing) {
      this.closeDetail();
      return true;
    }
    pageBack.goBack({ preferProducts: false, fallback: 'hub' });
    return true;
  },

  openSeries(e) {
    const name = String((e.currentTarget.dataset && e.currentTarget.dataset.name) || '');
    if (!name || this.data.detailClosing) return;
    if (this._detailAnimTimer) clearTimeout(this._detailAnimTimer);
    this.setData({
      showDetail: true,
      detailClosing: false,
      detailAnimIn: false,
      currentSeries: name,
      questions: [],
      questionsLoading: true,
      questionsError: ''
    });
    wx.nextTick(() => {
      this._detailAnimTimer = setTimeout(() => {
        this._detailAnimTimer = null;
        if (!this.data.showDetail || this.data.detailClosing) return;
        this.setData({ detailAnimIn: true });
      }, 32);
    });
    this.loadQuestions(name);
  },

  closeDetail() {
    if (!this.data.showDetail || this.data.detailClosing) return;
    if (this._detailAnimTimer) clearTimeout(this._detailAnimTimer);
    this.setData({ detailClosing: true });
    this._detailAnimTimer = setTimeout(() => {
      this._detailAnimTimer = null;
      this.setData({
        showDetail: false,
        detailClosing: false,
        detailAnimIn: false,
        currentSeries: '',
        questions: [],
        questionsLoading: false,
        questionsError: ''
      });
    }, 420);
  },

  async loadQuestions(seriesOrEvent) {
    let name = this.data.currentSeries;
    if (typeof seriesOrEvent === 'string' && seriesOrEvent) {
      name = seriesOrEvent;
    }
    if (!name) return;
    this.setData({ questionsLoading: true, questionsError: '' });
    try {
      const action = this.data.isAdmin ? 'adminListQuestions' : 'listQuestions';
      const result = await callManage(action, { series: name });
      if (!result.ok) throw new Error(result.errMsg || '加载失败');
      if (this.data.currentSeries !== name) return;
      this.setData({
        questions: result.list || [],
        questionsLoading: false
      });
    } catch (e) {
      if (this.data.currentSeries !== name) return;
      const raw = String((e && e.message) || e || '')
      const timedOut = /504003|TIME_LIMIT|timed out|超时/i.test(raw)
      this.setData({
        questionsLoading: false,
        questionsError: timedOut
          ? '首次初始化事例较慢，请点重试（需已上传最新云函数）'
          : (raw.slice(0, 180) || '问题加载失败')
      });
    }
  },

  openQuestion(e) {
    const treeId = String((e.currentTarget.dataset && e.currentTarget.dataset.treeId) || '');
    const questionId = String((e.currentTarget.dataset && (e.currentTarget.dataset.qid || e.currentTarget.dataset.id)) || '');
    const title = String((e.currentTarget.dataset && e.currentTarget.dataset.title) || '');
    if (!treeId) {
      this._toast('该问题尚未配置排查流程');
      return;
    }
    if (this.data.isAdmin) {
      wx.navigateTo({
        url: `/package-extra/pages/troubleshoot-admin/troubleshoot-admin?tree=${encodeURIComponent(treeId)}&questionId=${encodeURIComponent(questionId)}&title=${encodeURIComponent(title)}`
      });
      return;
    }
    wx.navigateTo({
      url: `/package-extra/pages/troubleshoot/troubleshoot?tree=${encodeURIComponent(treeId)}&title=${encodeURIComponent(title)}`
    });
  },

  async onAddQuestion() {
    if (!this.data.isAuthorized) {
      this._toast('无管理员权限');
      return;
    }
    if (!this.data.isAdmin) {
      this._toast('请先点右上角 EDIT');
      return;
    }
    if (this.data.saving) return;
    if (!this.data.currentSeries) {
      this._toast('请先选择系列');
      return;
    }
    this._editQuestionId = '';
    this._openEditModal({
      editModalTitle: '新增问题',
      editModalValue: '',
      editModalMode: 'add',
      editModalSyncAll: false
    });
  },

  async onRenameQuestion(e) {
    if (!this.data.isAdmin) return;
    const id = String((e.currentTarget.dataset && (e.currentTarget.dataset.qid || e.currentTarget.dataset.id)) || '');
    const oldTitle = String((e.currentTarget.dataset && e.currentTarget.dataset.title) || '');
    const syncAll = !!(e.currentTarget.dataset && e.currentTarget.dataset.syncAll);
    if (!id) return;
    this._editQuestionId = id;
    this._editOldTitle = oldTitle;
    this._openEditModal({
      editModalTitle: '修改问题标题',
      editModalValue: oldTitle,
      editModalMode: 'rename',
      editModalSyncAll: syncAll
    });
  },

  _openEditModal(patch) {
    if (this._editModalTimer) clearTimeout(this._editModalTimer);
    this.setData({
      ...patch,
      showEditModal: true,
      editModalAnimIn: false
    });
    wx.nextTick(() => {
      this._editModalTimer = setTimeout(() => {
        this.setData({ editModalAnimIn: true });
      }, 20);
    });
  },

  onEditModalInput(e) {
    this.setData({ editModalValue: e.detail.value });
  },

  toggleEditSyncAll() {
    this.setData({ editModalSyncAll: !this.data.editModalSyncAll });
  },

  closeEditModal() {
    if (this.data.saving) return;
    this._closeEditModalAnimated();
  },

  _closeEditModalAnimated(extra = {}) {
    if (this._editModalTimer) clearTimeout(this._editModalTimer);
    this.setData({ editModalAnimIn: false });
    this._editModalTimer = setTimeout(() => {
      this._editQuestionId = '';
      this.setData({
        showEditModal: false,
        editModalValue: '',
        editModalMode: '',
        editModalSyncAll: false,
        ...extra
      });
    }, 280);
  },

  async confirmEditModal() {
    if (this.data.saving) return;
    const title = String(this.data.editModalValue || '').trim();
    if (!title) {
      this._toast('请填写问题标题');
      return;
    }
    const mode = this.data.editModalMode;
    const series = this.data.currentSeries;
    const syncAll = !!this.data.editModalSyncAll;
    this.setData({ saving: true });
    wx.showLoading({ title: mode === 'add' ? '创建中' : '保存中', mask: true });
    try {
      if (mode === 'add') {
        const result = await callManage('createQuestion', { series, title, syncAll });
        if (!result.ok) throw new Error(result.errMsg || '创建失败');
        this._toast(syncAll ? '已同步到全部系列' : '已创建', 'success');
      } else if (mode === 'rename') {
        const result = await callManage('updateQuestion', {
          questionId: this._editQuestionId,
          title,
          syncAll,
          series
        });
        if (!result.ok) throw new Error(result.errMsg || '保存失败');
        this._toast('已更新', 'success');
      }
      this._closeEditModalAnimated();
      await this.loadQuestions(series);
    } catch (e) {
      this._toast((e && e.message) || '操作失败');
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  async onToggleQuestionSyncAll(e) {
    if (!this.data.isAdmin || this.data.saving) return;
    const id = String((e.currentTarget.dataset && (e.currentTarget.dataset.qid || e.currentTarget.dataset.id)) || '');
    if (!id) return;
    const raw = e.currentTarget.dataset && e.currentTarget.dataset.syncAll;
    const current = raw === true || raw === 'true';
    const next = !current;
    this.setData({ saving: true });
    try {
      const result = await callManage('updateQuestion', {
        questionId: id,
        syncAll: next,
        series: this.data.currentSeries
      });
      if (!result.ok) throw new Error(result.errMsg || '保存失败');
      const questions = (this.data.questions || []).map((q) => (
        q._id === id ? { ...q, syncAll: next } : q
      ));
      this.setData({ questions });
      this._toast(next ? '已同步到全部系列' : '已取消同步', 'success');
    } catch (err) {
      this._toast((err && err.message) || '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  async onDeleteQuestion(e) {
    if (!this.data.isAdmin) return;
    const id = String((e.currentTarget.dataset && (e.currentTarget.dataset.qid || e.currentTarget.dataset.id)) || '');
    const title = String((e.currentTarget.dataset && e.currentTarget.dataset.title) || '');
    if (!id) return;
    this._deleteQuestionId = id;
    this._openDeleteSheet(title);
  },

  _openDeleteSheet(title) {
    if (this._deleteSheetTimer) clearTimeout(this._deleteSheetTimer);
    this.setData({
      showDeleteSheet: true,
      deleteSheetAnimIn: false,
      deleteSheetTitle: title || ''
    });
    wx.nextTick(() => {
      this._deleteSheetTimer = setTimeout(() => {
        this.setData({ deleteSheetAnimIn: true });
      }, 20);
    });
  },

  closeDeleteSheet() {
    if (this.data.saving) return;
    this._closeDeleteSheetAnimated();
  },

  _closeDeleteSheetAnimated(extra = {}) {
    if (this._deleteSheetTimer) clearTimeout(this._deleteSheetTimer);
    this.setData({ deleteSheetAnimIn: false });
    this._deleteSheetTimer = setTimeout(() => {
      this._deleteQuestionId = '';
      this.setData({
        showDeleteSheet: false,
        deleteSheetTitle: '',
        ...extra
      });
    }, 280);
  },

  async confirmDeleteQuestion(e) {
    if (!this.data.isAdmin || this.data.saving) return;
    const scope = String((e.currentTarget.dataset && e.currentTarget.dataset.scope) || 'series');
    const id = this._deleteQuestionId;
    if (!id) return;
    this.setData({ saving: true });
    try {
      const result = await callManage('removeQuestion', {
        questionId: id,
        series: this.data.currentSeries,
        scope: scope === 'all' ? 'all' : 'series'
      });
      if (!result.ok) throw new Error(result.errMsg || '删除失败');
      this._closeDeleteSheetAnimated();
      this._toast(scope === 'all' || result.removedAll ? '已全量删除' : '已从本系列删除', 'success');
      await this.loadQuestions(this.data.currentSeries);
    } catch (err) {
      this._toast((err && err.message) || '删除失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  stopTap() {}
});
