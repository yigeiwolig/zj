const {
  listCaptureSessions,
  saveMotoProfile,
  uploadProfileConfig,
  downloadConfigJson
} = require('../../../utils/canCaptureStore.js');
const { normalizeGearValuesForDevice } = require('../../../utils/canRuntimeConfig.js');

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 44,
    isAdmin: false,
    sessions: [],
    sessionGroups: [],
    selectedSessionId: '',
    previewText: '',
    form: {
      name: '',
      model: '',
      gear_id: '',
      gear_offset: '',
      gear_neutral: '',
      gear_1: '',
      gear_2: '',
      gear_3: '',
      gear_4: '',
      gear_5: '',
      gear_6: '',
      rpm_id: '',
      rpm_pair_offset: '',
      rpm_be: false,
      rpm_idle: '',
      rpm_raw_max: '',
      rpm_max: '8000',
      published: false
    }
  },

  onLoad() {
    this._calcNav();
    this._checkAdmin();
  },

  _calcNav() {
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      const win = wx.getWindowInfo();
      this.setData({
        statusBarHeight: win.statusBarHeight || 44,
        navBarHeight: (menu.top - (win.statusBarHeight || 44)) * 2 + menu.height
      });
    } catch (e) {
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  async _checkAdmin() {
    try {
      const login = await wx.cloud.callFunction({ name: 'login' });
      const openid = (login.result && login.result.openid) || '';
      const db = wx.cloud.database();
      let res = await db.collection('guanliyuan').where({ openid }).limit(1).get();
      if (!(res.data || []).length) {
        res = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
      }
      const ok = (res.data || []).length > 0;
      this.setData({ isAdmin: ok });
      if (ok) this.loadSessions();
      else wx.showToast({ title: '无管理员权限', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '鉴权失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  async loadSessions() {
    const list = await listCaptureSessions(50);
    const map = {};
    list.forEach((item) => {
      if (!map[item.sessionId]) map[item.sessionId] = { sessionId: item.sessionId, items: [] };
      map[item.sessionId].items.push(item);
    });
    const sessionGroups = Object.values(map);
    this.setData({ sessions: list, sessionGroups });
  },

  onSelectSession(e) {
    const sid = e.currentTarget.dataset.id;
    const group = (this.data.sessionGroups || []).find((g) => g.sessionId === sid);
    const lines = (group && group.items || []).map((it) =>
      `${it.gearLabel || it.gearKey}: ${it.frameCount} 帧\n${it.cosUrl || ''}`
    );
    this.setData({
      selectedSessionId: sid,
      previewText: lines.join('\n\n')
    });
  },

  async onPreviewCos(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.showLoading({ title: '加载' });
    try {
      const data = await downloadConfigJson(url);
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const preview = text.length > 8000 ? text.slice(0, 8000) + '\n…(截断)' : text;
      this.setData({ previewText: preview });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
  },

  onToggleBe(e) {
    this.setData({ 'form.rpm_be': !!e.detail.value });
  },

  onTogglePublish(e) {
    this.setData({ 'form.published': !!e.detail.value });
  },

  async onSaveProfile() {
    const f = this.data.form;
    if (!f.name) {
      wx.showToast({ title: '请填写配置名称', icon: 'none' });
      return;
    }
    const gearValues = normalizeGearValuesForDevice(f);
    const config = {
      version: 2,
      name: f.name,
      model: f.model,
      sourceSessionId: this.data.selectedSessionId,
      gear_id: Number(f.gear_id),
      gear_offset: Number(f.gear_offset),
      gear_values: gearValues,
      gear_neutral: gearValues[0],
      gear_one: gearValues[1],
      rpm_id: Number(f.rpm_id),
      rpm_pair_offset: Number(f.rpm_pair_offset),
      rpm_be: !!f.rpm_be,
      rpm_idle: Number(f.rpm_idle),
      rpm_raw_max: Number(f.rpm_raw_max),
      rpm_max: Number(f.rpm_max) || 8000
    };

    wx.showLoading({ title: '保存中' });
    try {
      const profileId = await saveMotoProfile({
        name: f.name,
        model: f.model,
        sourceSessionId: this.data.selectedSessionId,
        published: !!f.published,
        configSummary: {
          gear_id: config.gear_id,
          rpm_id: config.rpm_id
        }
      });
      const configUrl = await uploadProfileConfig(profileId, config);
      await saveMotoProfile({
        _id: profileId,
        name: f.name,
        model: f.model,
        sourceSessionId: this.data.selectedSessionId,
        published: !!f.published,
        configUrl,
        configSummary: config
      });
      wx.hideLoading();
      wx.showToast({ title: '已发布', icon: 'success' });
      console.log('[CanAdmin] saved profile', profileId, configUrl, config);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
    }
  }
});
