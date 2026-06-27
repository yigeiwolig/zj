const cosUpload = require('../../../utils/cosUpload.js');

const DETAIL_ANIM_MS = 420;
const FAQ_COLLECTION = 'faq_items';
const FAQ_STORE_DOC = 'faqStore';
const ADMIN_CACHE_KEY = '__faq_admin_privilege_cache__';

function isDbNotExist(err) {
  const msg = String((err && err.errMsg) || (err && err.message) || err || '');
  return msg.includes('not exist') || msg.includes('NOT_EXIST') || msg.includes('DATABASE_COLLECTION_NOT_EXIST');
}

function genFaqId() {
  return `faq_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

const VIDEO_PANEL_HEIGHT = '580rpx';
const MIXED_PANEL_HEIGHT = '780rpx';
const EMPTY_VIDEO_PANEL_HEIGHT = '420rpx';
const { PRODUCT_DETAIL_OPTIONS } = require('../../../utils/productModels.js');

const FALLBACK_FAQS = {
  'F1 PRO': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F1 PRO 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持 F1 PRO 电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  'F1 MAX': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F1 MAX 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '如何调节性能模式？', answer: '进入控制中心，选择 F1 MAX 对应车型参数页中的性能档位；保存后设备将按新配置运行。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持设备电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  'F1 ULTRA': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F1 ULTRA 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '如何调节性能模式？', answer: '进入控制中心，选择 F1 Ultra 对应车型参数页中的性能档位；保存后设备将按新配置运行。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持 F1 ULTRA 电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  'F2 PRO': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F2 PRO 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持 F2 PRO 电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  'F2 MAX': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F2 MAX 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '如何调节性能模式？', answer: '进入控制中心，选择 F2 MAX 对应车型参数页中的性能档位；保存后设备将按新配置运行。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持设备电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  'F2 ULTRA': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F2 ULTRA 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '如何调节性能模式？', answer: '进入控制中心，选择 F2 Ultra 对应车型参数页中的性能档位；保存后设备将按新配置运行。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持 F2 ULTRA 电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  'F2 Long': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F2 Long 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '如何调节性能模式？', answer: '进入控制中心，选择 F2 Long 对应车型参数页中的性能档位；保存后设备将按新配置运行。', videoUrl: '' },
    { question: 'F2 MAX 与 F2 Long 有何区别？', answer: 'F2 Long 为加长版线束/安装方案，核心控制逻辑与 F2 MAX 一致；具体线长与安装位请以产品说明书为准。', videoUrl: '' }
  ],
  'F3 PRO': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F3 PRO 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持 F3 PRO 电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  'F3 MAX': [
    { question: '无法连接蓝牙怎么办？', answer: '请确认手机蓝牙已开启，并在系统设置中允许小程序使用蓝牙；关闭 F3 MAX 后重新上电，再进入控制中心重试配对。', videoUrl: '' },
    { question: '如何调节性能模式？', answer: '进入控制中心，选择 F3 MAX 对应车型参数页中的性能档位；保存后设备将按新配置运行。', videoUrl: '' },
    { question: '设备固件更新失败？', answer: '请保持设备电量充足、网络稳定；若多次失败，可重启设备与小程序后重试，或联系客服协助处理。', videoUrl: '' }
  ],
  '购买与订单': [
    { question: '如何查看订单与物流？', answer: '打开「个人中心」→ 我的订单，点击订单卡片可查看状态；已发货会显示快递公司与物流信息。', videoUrl: '' },
    { question: '订单可以取消或改地址吗？', answer: '未发货前请联系客服处理；已发货请按物流签收规则办理。', videoUrl: '' }
  ],
  '维修与售后': [
    { question: '如何提交维修？', answer: '产品页 →「维修中心」填写信息并寄出；进度在「个人中心」查看。', videoUrl: '' },
    { question: '维修大概需要多久？', answer: '视检测与配件情况而定，提交后可在工单里查看状态更新。', videoUrl: '' }
  ],
  '联系客服': [
    { question: '如何联系人工客服？', answer: '产品页 →「联系方式」，工作日 9:00–18:00 可通过微信咨询。', videoUrl: '' },
    { question: '投诉建议如何提交？', answer: '在「联系方式」页选择投诉建议，填写内容后按指引发送邮件，24 小时内处理。', videoUrl: '' }
  ]
};

function cloneFaqList(list) {
  return (list || []).map((item) => ({
    ...item,
    isOpen: false,
    panelHeight: resolvePanelHeight(item)
  }));
}

function resolvePanelHeight(item) {
  const hasVideo = !!(item && item.videoUrl);
  const hasAnswer = !!(item && item.answer && String(item.answer).trim());
  if (!hasVideo) return EMPTY_VIDEO_PANEL_HEIGHT;
  if (hasAnswer) return MIXED_PANEL_HEIGHT;
  return VIDEO_PANEL_HEIGHT;
}

function isLocalMediaPath(path) {
  const p = String(path || '');
  return p.startsWith('wxfile') || p.startsWith('http://tmp') || p.startsWith('https://tmp');
}

function isCloudFileId(url) {
  return String(url || '').indexOf('cloud://') === 0;
}

function isDirectMediaUrl(url) {
  const u = String(url || '');
  return u.startsWith('http://') || u.startsWith('https://');
}

function categoryFolder(name) {
  return String(name || 'default').trim().replace(/\s+/g, '_');
}

Page({
  data: {
    showDetail: false,
    detailAnimIn: false,
    detailClosing: false,
    faqDetailLoading: false,
    isAuthorized: false,
    isAdmin: false,
    currentProductName: '',
    currentFaqList: [],
    generalTopics: [
      { name: '购买与订单', icon: 'MT' },
      { name: '维修与售后', icon: 'MT' },
      { name: '联系客服', icon: 'MT' }
    ],
    products: PRODUCT_DETAIL_OPTIONS.map((name) => ({
      name,
      icon: 'MT'
    })),
    showAdminModal: false,
    showRenameModal: false,
    renameModalClosing: false,
    renameOldName: '',
    renameNewName: '',
    renameModalMode: 'rename',
    renameTargetType: 'device',
    adminModalClosing: false,
    adminEditingId: '',
    adminFormQuestion: '',
    adminFormAnswer: '',
    adminTempVideoPath: '',
    adminTempVideoKnownSize: null,
    adminExistingVideoUrl: '',
    isAdminSaving: false,
    statusBarHeight: 44,
    navBarHeight: 44
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
    this._faqStoreCache = null;
    this._faqUseStore = false;
    this.checkAdminPrivilege();
    this._loadCategoriesFromStore();
  },

  onShow() {
    const app = getApp();
    if (app && app.startQiangliCheck) app.startQiangliCheck();
  },

  onHide() {
    this._pauseAllVideos();
    const app = getApp();
    if (app && app.stopQiangliCheck) app.stopQiangliCheck();
  },

  onUnload() {
    if (this._detailAnimTimer) clearTimeout(this._detailAnimTimer);
    this._pauseAllVideos();
    const app = getApp();
    if (app && app.stopQiangliCheck) app.stopQiangliCheck();
  },

  _readAdminPrivilegeCache() {
    const keys = [
      '__faq_admin_privilege_cache__',
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

  async _buildMediaUrlMap(fileIds) {
    const ids = [...new Set((fileIds || []).filter((id) => isCloudFileId(id)))];
    const map = {};
    if (!ids.length) return map;
    if (!wx.cloud || !wx.cloud.getTempFileURL) {
      ids.forEach((id) => { map[id] = id; });
      return map;
    }
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: ids });
      (res.fileList || []).forEach((f) => {
        if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL;
      });
    } catch (e) {
      console.warn('[faq] getTempFileURL', e);
    }
    ids.forEach((id) => {
      if (!map[id]) map[id] = id;
    });
    return map;
  },

  _resolveMediaUrl(raw, urlMap) {
    if (!raw) return '';
    const mapped = (urlMap && urlMap[raw]) || raw;
    if (isDirectMediaUrl(mapped)) return mapped;
    if (isCloudFileId(mapped)) return (urlMap && urlMap[mapped]) || '';
    return mapped;
  },

  _mapDbRows(rows, urlMap) {
    return (rows || [])
      .map((row) => ({
        _id: row._id,
        question: row.question || '',
        answer: row.answer || '',
        videoUrl: this._resolveMediaUrl(row.videoUrl || row.videoFileID || '', urlMap),
        order: typeof row.order === 'number' ? row.order : 0
      }))
      .sort((a, b) => a.order - b.order);
  },

  async _loadFaqStoreAll(force = false) {
    if (!force && this._faqStoreCache) return this._faqStoreCache;
    const empty = { items: [], categories: null };
    if (!this.db) {
      this._faqStoreCache = empty;
      return empty;
    }
    try {
      const res = await this.db.collection('shop_config').doc(FAQ_STORE_DOC).get();
      const data = (res && res.data) || {};
      this._faqStoreCache = {
        items: Array.isArray(data.items) ? data.items : [],
        categories: data.categories || null
      };
      this._faqUseStore = true;
      return this._faqStoreCache;
    } catch (err) {
      if (!isDbNotExist(err)) {
        console.warn('[faq] _loadFaqStoreAll', err);
      }
      this._faqStoreCache = empty;
      this._faqUseStore = true;
      return empty;
    }
  },

  async _persistFaqStore(store) {
    const payload = {
      items: store.items || [],
      categories: store.categories || {
        devices: this.data.products,
        general: this.data.generalTopics
      },
      updateTime: this.db.serverDate()
    };
    try {
      await this.db.collection('shop_config').doc(FAQ_STORE_DOC).set({ data: payload });
    } catch (err) {
      if (isDbNotExist(err)) {
        await this.db.collection('shop_config').doc(FAQ_STORE_DOC).set({ data: payload });
      } else {
        await this.db.collection('shop_config').doc(FAQ_STORE_DOC).update({ data: payload });
      }
    }
    this._faqStoreCache = {
      items: payload.items,
      categories: payload.categories
    };
  },

  async _loadCategoriesFromStore() {
    const store = await this._loadFaqStoreAll();
    const patch = {};
    if (store.categories && store.categories.devices && store.categories.devices.length) {
      patch.products = store.categories.devices;
    }
    if (store.categories && store.categories.general && store.categories.general.length) {
      patch.generalTopics = store.categories.general.map((p) => ({
        ...p,
        icon: 'MT'
      }));
    }
    if (Object.keys(patch).length) this.setData(patch);
  },

  async _fetchFaqFromStore(category) {
    const store = await this._loadFaqStoreAll();
    const rows = (store.items || []).filter((i) => i && i.category === category);
    if (!rows.length) return null;
    const fileIds = [];
    rows.forEach((row) => {
      const v = row.videoUrl || row.videoFileID;
      if (v) fileIds.push(v);
    });
    const urlMap = await this._buildMediaUrlMap(fileIds);
    return this._mapDbRows(rows, urlMap);
  },

  async _fetchFaqFromCloud(category) {
    if (!this.db || !category) return null;
    try {
      let res = await this.db.collection(FAQ_COLLECTION)
        .where({ category })
        .orderBy('order', 'asc')
        .get();
      if (!res.data || !res.data.length) {
        res = await this.db.collection(FAQ_COLLECTION)
          .where({ category })
          .orderBy('createTime', 'asc')
          .get()
          .catch(() => ({ data: [] }));
      }
      if (res.data && res.data.length) {
        const fileIds = [];
        res.data.forEach((row) => {
          const v = row.videoUrl || row.videoFileID;
          if (v) fileIds.push(v);
        });
        const urlMap = await this._buildMediaUrlMap(fileIds);
        this._faqUseStore = false;
        return this._mapDbRows(res.data, urlMap);
      }
    } catch (err) {
      if (!isDbNotExist(err)) {
        console.warn('[faq] faq_items 读取失败，改用 shop_config/faqStore', err);
      }
    }
    return this._fetchFaqFromStore(category);
  },

  async _loadFaqForCategory(category) {
    const cloudList = await this._fetchFaqFromCloud(category);
    const source = (cloudList && cloudList.length)
      ? cloudList
      : (FALLBACK_FAQS[category] || []);
    return cloneFaqList(source);
  },

  stopTap() {},

  onRenameTap(e) {
    this.adminRenameCategory(e);
  },

  onManageTap(e) {
    this.openDetail(e);
  },

  openDetail(e) {
    const name = e.currentTarget.dataset.name;
    if (!name || this.data.detailClosing) return;
    if (this.data.isAdmin) {
      this._toast('进入管理：可添加/编辑视频与文字');
    }
    if (this._detailAnimTimer) clearTimeout(this._detailAnimTimer);
    this.setData({
      showDetail: true,
      detailClosing: false,
      detailAnimIn: false,
      currentProductName: name,
      currentFaqList: [],
      faqDetailLoading: true
    });
    wx.nextTick(() => {
      this._detailAnimTimer = setTimeout(() => {
        this._detailAnimTimer = null;
        if (!this.data.showDetail || this.data.detailClosing) return;
        this.setData({ detailAnimIn: true });
      }, 32);
    });
    const reqId = Date.now();
    this._faqLoadReqId = reqId;
    this._loadFaqForCategory(name).then((list) => {
      if (this._faqLoadReqId !== reqId || this.data.currentProductName !== name) return;
      this.setData({ currentFaqList: list, faqDetailLoading: false });
    });
  },

  calcNavBarInfo() {
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = (gap * 2) + menuButton.height;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  goBack() {
    if (this.data.showDetail && !this.data.detailClosing) {
      this.closeDetail();
      return;
    }
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  onBackPress() {
    if (this.data.showDetail && !this.data.detailClosing) {
      this.closeDetail();
      return true;
    }
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
    return true;
  },

  closeDetail() {
    if (!this.data.showDetail || this.data.detailClosing) return;
    this._faqLoadReqId = 0;
    this._pauseAllVideos();
    if (this._detailAnimTimer) clearTimeout(this._detailAnimTimer);
    this.setData({ detailClosing: true });
    this._detailAnimTimer = setTimeout(() => {
      this._detailAnimTimer = null;
      this.setData({
        showDetail: false,
        detailClosing: false,
        detailAnimIn: false,
        currentProductName: '',
        currentFaqList: [],
        faqDetailLoading: false
      });
    }, DETAIL_ANIM_MS);
  },

  _setCurrentFaqList(list) {
    this.setData({ currentFaqList: list });
  },

  toggleFaq(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || index < 0) return;
    const list = (this.data.currentFaqList || []).map((item, i) => {
      if (i !== index) return { ...item, isOpen: false };
      return { ...item, isOpen: !item.isOpen };
    });
    this._setCurrentFaqList(list);
    if (!list[index] || !list[index].isOpen) this._pauseVideoAt(index);
  },

  onVideoPlay(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    (this.data.currentFaqList || []).forEach((_, i) => {
      if (i !== index) this._pauseVideoAt(i);
    });
  },

  _pauseVideoAt(index) {
    try {
      const ctx = wx.createVideoContext(`faq-video-${index}`, this);
      if (ctx && ctx.pause) ctx.pause();
    } catch (err) {}
  },

  _pauseAllVideos() {
    (this.data.currentFaqList || []).forEach((_, i) => this._pauseVideoAt(i));
  },

  _toast(title, icon = 'none') {
    try {
      const app = getApp();
      if (app && typeof app.showToast === 'function') {
        app.showToast({ title, icon, duration: 2000 });
        return;
      }
    } catch (e) {}
    wx.showToast({ title, icon, duration: 2000 });
  },

  _onPickVideoFail(err, retryFn) {
    const msg = String((err && err.errMsg) || err || '');
    console.warn('[faq] pick video fail:', msg);
    if (msg.includes('cancel')) return;
    if (typeof retryFn === 'function') {
      retryFn();
      return;
    }
    if (msg.includes('auth deny') || msg.includes('authorize')) {
      this._toast('请允许相册/相机权限');
      return;
    }
    this._toast('选择失败，请用「从相册选择」');
  },

  _pickFromAlbum(done) {
    const apply = (file) => {
      if (!file || !file.path) {
        this._toast('未选择视频');
        return;
      }
      done(file);
    };
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType: ['album'],
        maxDuration: 300,
        success: (res) => {
          const f = res.tempFiles && res.tempFiles[0];
          if (!f || !f.tempFilePath) {
            apply(null);
            return;
          }
          if (f.fileType && f.fileType !== 'video') {
            this._toast('请选择视频文件');
            return;
          }
          apply({
            path: f.tempFilePath,
            size: typeof f.size === 'number' ? f.size : null
          });
        },
        fail: (err) => {
          this._onPickVideoFail(err, () => {
            wx.chooseVideo({
              sourceType: ['album'],
              maxDuration: 300,
              compressed: false,
              success: (res) => {
                apply({
                  path: res.tempFilePath || '',
                  size: typeof res.size === 'number' ? res.size : null
                });
              },
              fail: (e2) => this._onPickVideoFail(e2)
            });
          });
        }
      });
      return;
    }
    wx.chooseVideo({
      sourceType: ['album'],
      maxDuration: 300,
      compressed: false,
      success: (res) => {
        apply({
          path: res.tempFilePath || '',
          size: typeof res.size === 'number' ? res.size : null
        });
      },
      fail: (err) => this._onPickVideoFail(err)
    });
  },

  _pickFromCamera(done) {
    wx.chooseVideo({
      sourceType: ['camera'],
      maxDuration: 300,
      compressed: false,
      camera: 'back',
      success: (res) => {
        done({
          path: res.tempFilePath || '',
          size: typeof res.size === 'number' ? res.size : null
        });
      },
      fail: (err) => this._onPickVideoFail(err)
    });
  },

  /** 选视频：弹窗内延迟 + 相册/拍摄（与 shouhou/case 一致，兼容开发者工具） */
  _pickAdminVideo(done) {
    if (!this.data.isAdmin) return;
    let isDevtools = false;
    try {
      isDevtools = wx.getDeviceInfo().platform === 'devtools';
    } catch (e) {}
    const run = () => {
      if (isDevtools) {
        this._pickFromAlbum(done);
        return;
      }
      wx.showActionSheet({
        itemList: ['从相册选择', '拍摄视频'],
        success: (res) => {
          if (res.tapIndex === 1) {
            this._pickFromCamera(done);
          } else {
            this._pickFromAlbum(done);
          }
        },
        fail: (err) => {
          const msg = String((err && err.errMsg) || '');
          if (msg.includes('cancel')) return;
          this._pickFromAlbum(done);
        }
      });
    };
    setTimeout(run, 280);
  },

  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this._toast('无权限');
      return;
    }
    const next = !this.data.isAdmin;
    const patch = { isAdmin: next };
    if (!next) {
      if (this.data.showAdminModal) {
        patch.showAdminModal = false;
        patch.adminModalClosing = false;
        patch.isAdminSaving = false;
      }
      if (this.data.showRenameModal) {
        patch.showRenameModal = false;
        patch.renameModalClosing = false;
      }
    }
    this.setData(patch);
    this._toast(next ? '管理模式开启' : '已回到用户模式');
  },

  adminOpenAddModal() {
    if (!this.data.isAdmin) return;
    this.setData({
      showAdminModal: true,
      adminModalClosing: false,
      adminEditingId: '',
      adminFormQuestion: '',
      adminFormAnswer: '',
      adminTempVideoPath: '',
      adminTempVideoKnownSize: null,
      adminExistingVideoUrl: ''
    });
  },

  adminOpenEditModal(e) {
    if (!this.data.isAdmin) return;
    const index = Number(e.currentTarget.dataset.index);
    const item = (this.data.currentFaqList || [])[index];
    if (!item) return;
    this.setData({
      showAdminModal: true,
      adminModalClosing: false,
      adminEditingId: item._id || '',
      adminFormQuestion: item.question || '',
      adminFormAnswer: item.answer || '',
      adminTempVideoPath: '',
      adminTempVideoKnownSize: null,
      adminExistingVideoUrl: item.videoUrl || ''
    });
  },

  closeAdminModal() {
    if (!this.data.showAdminModal) return;
    this.setData({ adminModalClosing: true });
    setTimeout(() => {
      this.setData({
        showAdminModal: false,
        adminModalClosing: false,
        isAdminSaving: false
      });
    }, 280);
  },

  onAdminQuestionInput(e) {
    this.setData({ adminFormQuestion: e.detail.value });
  },

  onAdminAnswerInput(e) {
    this.setData({ adminFormAnswer: e.detail.value });
  },

  adminChooseVideo() {
    this._pickAdminVideo((file) => {
      this.setData({
        adminTempVideoPath: file.path,
        adminTempVideoKnownSize: file.size,
        adminExistingVideoUrl: ''
      });
      this._toast('视频已选择', 'success');
    });
  },

  onVideoPlaceholderTap(e) {
    if (!this.data.isAdmin) return;
    this.adminReplaceVideo(e);
  },

  adminReplaceVideo(e) {
    if (!this.data.isAdmin) return;
    const index = Number(e.currentTarget.dataset.index);
    const item = (this.data.currentFaqList || [])[index];
    if (!item) return;
    if (!item._id) {
      this.setData({
        showAdminModal: true,
        adminModalClosing: false,
        adminEditingId: '',
        adminFormQuestion: item.question || '',
        adminFormAnswer: item.answer || '',
        adminTempVideoPath: '',
        adminTempVideoKnownSize: null,
        adminExistingVideoUrl: ''
      });
      return;
    }
    this._pickAdminVideo(async (file) => {
      const path = file.path;
      if (!path) return;
      wx.showLoading({ title: '上传视频中...', mask: true });
      try {
        const category = this.data.currentProductName;
        const videoUrl = await cosUpload.uploadVideoToCos(
          path,
          `faq/videos/${categoryFolder(category)}`,
          { knownSize: file.size || undefined }
        );
        if (!this._faqUseStore) {
          try {
            await this.db.collection(FAQ_COLLECTION).doc(item._id).update({
              data: {
                videoUrl,
                updateTime: this.db.serverDate()
              }
            });
          } catch (dbErr) {
            if (!isDbNotExist(dbErr)) throw dbErr;
            this._faqUseStore = true;
            await this._updateFaqVideoInStore(item._id, videoUrl);
          }
        } else {
          await this._updateFaqVideoInStore(item._id, videoUrl);
        }
        wx.hideLoading();
        this._toast('视频已更新', 'success');
        await this._reloadCurrentCategory();
      } catch (err) {
        wx.hideLoading();
        console.error('[faq] adminReplaceVideo', err);
        this._toast('视频上传失败');
      }
    });
  },

  async _reloadCurrentCategory() {
    const category = this.data.currentProductName;
    if (!category) return;
    const openIndex = (this.data.currentFaqList || []).findIndex((i) => i.isOpen);
    const list = await this._loadFaqForCategory(category);
    if (openIndex >= 0 && list[openIndex]) list[openIndex].isOpen = true;
    this._setCurrentFaqList(list);
  },

  async _uploadAdminVideoIfNeeded() {
    const temp = this.data.adminTempVideoPath;
    if (temp && isLocalMediaPath(temp)) {
      const category = this.data.currentProductName;
      return cosUpload.uploadVideoToCos(
        temp,
        `faq/videos/${categoryFolder(category)}`,
        { knownSize: this.data.adminTempVideoKnownSize || undefined }
      );
    }
    return this.data.adminExistingVideoUrl || '';
  },

  async confirmAdminModal() {
    if (!this.data.isAdmin || this.data.isAdminSaving) return;
    const question = String(this.data.adminFormQuestion || '').trim();
    const answer = String(this.data.adminFormAnswer || '').trim();
    if (!question) {
      this._toast('请填写问题标题');
      return;
    }
    const hasVideo = !!(this.data.adminTempVideoPath || this.data.adminExistingVideoUrl);
    if (!hasVideo) {
      this._toast('请选择教学视频');
      return;
    }
    const category = this.data.currentProductName;
    if (!category || !this.db) {
      this._toast('数据未就绪');
      return;
    }

    this.setData({ isAdminSaving: true });
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      const videoUrl = await this._uploadAdminVideoIfNeeded();
      if (!videoUrl) {
        throw new Error('NO_VIDEO');
      }
      const payload = {
        category,
        question,
        answer,
        videoUrl,
        updateTime: this.db.serverDate()
      };
      const editingId = this.data.adminEditingId;
      let saved = false;
      if (!this._faqUseStore) {
        try {
          if (editingId) {
            await this.db.collection(FAQ_COLLECTION).doc(editingId).update({ data: payload });
          } else {
            const maxOrder = await this._getNextOrder(category);
            await this.db.collection(FAQ_COLLECTION).add({
              data: {
                ...payload,
                order: maxOrder,
                createTime: this.db.serverDate()
              }
            });
          }
          saved = true;
        } catch (err) {
          if (!isDbNotExist(err)) throw err;
          this._faqUseStore = true;
        }
      }
      if (!saved) {
        if (editingId) {
          await this._saveFaqToStore(payload, editingId);
        } else {
          const maxOrder = await this._getNextOrder(category);
          await this._saveFaqToStore({ ...payload, order: maxOrder });
        }
      }
      wx.hideLoading();
      this.setData({ isAdminSaving: false });
      this.closeAdminModal();
      this._toast('已保存', 'success');
      await this._reloadCurrentCategory();
    } catch (err) {
      wx.hideLoading();
      this.setData({ isAdminSaving: false });
      console.error('[faq] confirmAdminModal', err);
      const msg = String((err && err.errMsg) || (err && err.message) || '');
      if (msg.includes('NO_VIDEO')) {
        this._toast('请上传视频');
      } else if (msg.includes('getCosUploadUrl') || msg.includes('COS')) {
        this._toast('视频上传失败，请检查 COS 云函数');
      } else {
        this._toast('保存失败，请重试');
      }
    }
  },

  async _getNextOrder(category) {
    if (!this._faqUseStore) {
      try {
        const res = await this.db.collection(FAQ_COLLECTION)
          .where({ category })
          .orderBy('order', 'desc')
          .limit(1)
          .get();
        if (res.data && res.data.length) return (res.data[0].order || 0) + 1;
      } catch (e) {
        if (!isDbNotExist(e)) console.warn('[faq] _getNextOrder', e);
      }
    }
    const store = await this._loadFaqStoreAll();
    const list = (store.items || []).filter((i) => i.category === category);
    if (!list.length) return 0;
    return Math.max(...list.map((i) => Number(i.order) || 0)) + 1;
  },

  async _saveFaqToStore(payload, editingId) {
    const store = await this._loadFaqStoreAll(true);
    let items = [...(store.items || [])];
    const now = Date.now();
    if (editingId) {
      items = items.map((row) =>
        row._id === editingId ? { ...row, ...payload, _id: editingId, updateTime: now } : row
      );
    } else {
      const id = genFaqId();
      items.push({
        ...payload,
        _id: id,
        createTime: now,
        updateTime: now
      });
    }
    store.items = items;
    store.categories = {
      devices: this.data.products,
      general: this.data.generalTopics
    };
    await this._persistFaqStore(store);
    return editingId || items[items.length - 1]._id;
  },

  async _removeFaqFromStore(id) {
    const store = await this._loadFaqStoreAll(true);
    store.items = (store.items || []).filter((row) => row._id !== id);
    await this._persistFaqStore(store);
  },

  async _updateFaqVideoInStore(id, videoUrl) {
    const store = await this._loadFaqStoreAll(true);
    store.items = (store.items || []).map((row) =>
      row._id === id ? { ...row, videoUrl, updateTime: Date.now() } : row
    );
    await this._persistFaqStore(store);
  },

  adminRenameCategory(e) {
    if (!this.data.isAdmin) {
      this._toast('请先点 EDIT 进入管理模式');
      return;
    }
    const oldName = e.currentTarget.dataset.name;
    const type = e.currentTarget.dataset.type || 'device';
    if (!oldName) return;
    if (this.data.showAdminModal) {
      this.setData({ showAdminModal: false, adminModalClosing: false });
    }
    this.setData({
      showRenameModal: true,
      renameModalClosing: false,
      renameModalMode: 'rename',
      renameOldName: oldName,
      renameNewName: oldName,
      renameTargetType: type
    });
  },

  adminAddCategory(e) {
    if (!this.data.isAdmin) {
      this._toast('请先点 EDIT 进入管理模式');
      return;
    }
    const type = e.currentTarget.dataset.type || 'device';
    if (this.data.showAdminModal) {
      this.setData({ showAdminModal: false, adminModalClosing: false });
    }
    this.setData({
      showRenameModal: true,
      renameModalClosing: false,
      renameModalMode: 'add',
      renameOldName: '',
      renameNewName: '',
      renameTargetType: type,
    });
  },

  onRenameInput(e) {
    this.setData({ renameNewName: e.detail.value });
  },

  closeRenameModal() {
    if (!this.data.showRenameModal) return;
    this.setData({ renameModalClosing: true });
    setTimeout(() => {
      this.setData({
        showRenameModal: false,
        renameModalClosing: false,
        renameModalMode: 'rename',
        renameOldName: '',
        renameNewName: '',
      });
    }, 280);
  },

  _categoryNameExists(name, type) {
    const list = type === 'device' ? (this.data.products || []) : (this.data.generalTopics || []);
    return list.some((p) => p && String(p.name).trim() === name);
  },

  async confirmRenameCategory() {
    if (!this.data.isAdmin || !this.db) return;
    const mode = this.data.renameModalMode || 'rename';
    const oldName = String(this.data.renameOldName || '').trim();
    const newName = String(this.data.renameNewName || '').trim();
    if (!newName) {
      this._toast('名称不能为空');
      return;
    }
    if (mode === 'rename' && newName === oldName) {
      this.closeRenameModal();
      return;
    }
    if (mode === 'add' && this._categoryNameExists(newName, this.data.renameTargetType)) {
      this._toast('该名称已存在');
      return;
    }
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      const type = this.data.renameTargetType;
      let products = [...(this.data.products || [])];
      let generalTopics = [...(this.data.generalTopics || [])];

      if (mode === 'add') {
        if (type === 'device') {
          products.push({ name: newName, icon: 'MT' });
        } else {
          generalTopics.push({ name: newName, icon: 'MT' });
        }
      } else if (type === 'device') {
        products = products.map((p) =>
          p.name === oldName ? { ...p, name: newName } : p
        );
      } else {
        generalTopics = generalTopics.map((p) =>
          p.name === oldName ? { ...p, name: newName } : p
        );
      }
      this.setData({ products, generalTopics });
      const store = await this._loadFaqStoreAll(true);
      store.items = (store.items || []).map((row) =>
        row.category === oldName ? { ...row, category: newName } : row
      );
      store.categories = { devices: products, general: generalTopics };
      await this._persistFaqStore(store);
      if (!this._faqUseStore) {
        try {
          const batch = await this.db.collection(FAQ_COLLECTION).where({ category: oldName }).get();
          const tasks = (batch.data || []).map((row) =>
            this.db.collection(FAQ_COLLECTION).doc(row._id).update({
              data: { category: newName, updateTime: this.db.serverDate() }
            })
          );
          if (tasks.length) await Promise.all(tasks);
        } catch (err) {
          if (!isDbNotExist(err)) console.warn('[faq] rename faq_items', err);
        }
      }
      if (this.data.currentProductName === oldName) {
        this.setData({ currentProductName: newName });
        await this._reloadCurrentCategory();
      }
      wx.hideLoading();
      this.closeRenameModal();
      this._toast(mode === 'add' ? '已添加' : '已更新', 'success');
    } catch (err) {
      wx.hideLoading();
      console.error('[faq] confirmRenameCategory', err);
      this._toast(mode === 'add' ? '添加失败' : '改名失败');
    }
  },

  adminDeleteFaq(e) {
    if (!this.data.isAdmin) return;
    const index = Number(e.currentTarget.dataset.index);
    const item = (this.data.currentFaqList || [])[index];
    if (!item) return;
    if (!item._id) {
      wx.showModal({
        title: '删除占位问题',
        content: '该条为内置占位，确定从本页移除？（未写入云端）',
        success: (res) => {
          if (!res.confirm) return;
          const list = (this.data.currentFaqList || []).filter((_, i) => i !== index);
          this._setCurrentFaqList(list);
        }
      });
      return;
    }
    wx.showModal({
      title: '删除问题',
      content: `确定删除「${item.question}」？`,
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...', mask: true });
        try {
          if (!this._faqUseStore) {
            try {
              await this.db.collection(FAQ_COLLECTION).doc(item._id).remove();
            } catch (dbErr) {
              if (!isDbNotExist(dbErr)) throw dbErr;
              this._faqUseStore = true;
              await this._removeFaqFromStore(item._id);
            }
          } else {
            await this._removeFaqFromStore(item._id);
          }
          wx.hideLoading();
          this._toast('已删除', 'success');
          await this._reloadCurrentCategory();
        } catch (err) {
          wx.hideLoading();
          console.error('[faq] adminDeleteFaq', err);
          this._toast('删除失败');
        }
      }
    });
  }
});
