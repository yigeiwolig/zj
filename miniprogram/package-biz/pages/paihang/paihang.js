const app = getApp();
const cosUpload = require('../../../utils/cosUpload.js');
const shopImagePrepare = require('../../../utils/shopImagePrepare.js');

function isLocalOrTmpImagePath(s) {
  if (!s || typeof s !== 'string') return false;
  if (s.indexOf('cloud://') === 0) return false;
  if (/^https?:\/\//i.test(s)) return s.indexOf('http://tmp') === 0;
  return s.indexOf('wxfile') === 0 || s.indexOf('/') === 0 || /^[a-zA-Z]:[\\/]/.test(s);
}

// 图标资源库 (Base64 SVG)
const ICONS = {
  rank_on: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2RjMjYyNiI+PHBhdGggZD0iTTUgMTV2NGEyIDIgMCAwIDAtMiAyaDJhMiAyIDAgMCAwIDItMnYtNHptMCAwVjVhMiAyIDAgMCAxIDItMmgyYTIgMiAwIDAgMSAyIDJ2MTBtLTYgMGEyIDIgMCAwIDAgMiAyaDJhMiAyIDAgMCAwIDItMm0wIDBWOWEyIDIgMCAwIDEgMi0yaDJhMiAyIDAgMCAxIDIgMnYxMGEyIDIgMCAwIDAgMiAyaDJhMiAyIDAgMCAwIDItMnIiLz48L3N2Zz4=',
  rank_off: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMTV2NGEyIDIgMCAwIDAtMiAyaDJhMiAyIDAgMCAwIDItMnYtNHptMCAwVjVhMiAyIDAgMCAxIDItMmgyYTIgMiAwIDAgMSAyIDJ2MTBtLTYgMGEyIDIgMCAwIDAgMiAyaDJhMiAyIDAgMCAwIDItMm0wIDBWOWEyIDIgMCAwIDEgMi0yaDJhMiAyIDAgMCAxIDIgMnYxMGEyIDIgMCAwIDAgMiAyaDJhMiAyIDAgMCAwIDItMnIiLz48L3N2Zz4=',
  garage_on: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2RjMjYyNiI+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiLz48L3N2Zz4=',
  garage_off: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiLz48L3N2Zz4=',
  
  crown_gold: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZiYmYyNCIgc3Ryb2tlPSIjYjQ1MzA5IiBzdHJva2Utd2lkdGg9IjEiPjxwYXRoIGQ9Ik0yIDRsMyAxMiA1LTggNSA4IDMtMTJzMSAzIDMgMy0zIDEwLTMgMTBIOHMtNS0xLTUtMTB6Ii8+PHBhdGggZD0iTTEyIDIzYTEgMSAwIDEgMCAwLTIgMSAxIDAgMCAwIDAgMnoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  crown_silver: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2QxZDVkYiIgc3Ryb2tlPSIjNGI1NTYzIiBzdHJva2Utd2lkdGg9IjEiPjxwYXRoIGQ9Ik0yIDRsMyAxMiA1LTggNSA4IDMtMTJzMSAzIDMgMy0zIDEwLTMgMTBIOHMtNS0xLTUtMTB6Ii8+PC9zdmc+',
  crown_bronze: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Q5NzcwNiIgc3Ryb2tlPSIjNzgzNTBmIiBzdHJva2Utd2lkdGg9IjEiPjxwYXRoIGQ9Ik0yIDRsMyAxMiA1LTggNSA4IDMtMTJzMSAzIDMgMy0zIDEwLTMgMTBIOHMtNS0xLTUtMTB6Ii8+PC9zdmc+',
  
  bluetooth: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjODg4ODg4IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTE2LjQ5IDExLjE2LTIuODMgMi44M00xMS4zNyA4LjE3TDE5LjA3IDE2bC03LjcxIDcuNzFWMi4yOUwxOS4wNyAxMCAxNi40OSAxMi41OCIgLz48L3N2Zz4='
};

Page({
  // ================= 开发中弹窗（本页专属，带收缩退出动画） =================
  closeDevDialog() {
    this.setData({ devDialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        showDevDialog: false,
        devDialogClosing: false
      });
    }, 420);
  },
  dismissTransientModals() {
    const patch = {};
    if (this.data.showDevDialog) patch.showDevDialog = false;
    if (this.data.dialog && this.data.dialog.show) patch['dialog.show'] = false;
    if (this.data.autoToast && this.data.autoToast.show) patch['autoToast.show'] = false;
    if (Object.keys(patch).length) this.setData(patch);
  },
  noop() {},

  data: {
    icons: ICONS,

    // 🆕 开发中弹窗
    showDevDialog: false,
    devDialogClosing: false, // 开发中弹窗退出动画中
    
    // 【新增】自动消失提示（无按钮，2秒后自动消失）
    autoToast: { show: false, title: '', content: '' },
    autoToastClosing: false, // 自动提示退出动画中
    
    // 【新增】自定义对话框
    dialog: { show: false, title: '', content: '', showCancel: false, callback: null, confirmText: '确定', cancelText: '取消' },
    dialogClosing: false, // 自定义弹窗退出动画中
    
    // 【新增】自定义加载动画
    showLoadingAnimation: false,
    loadingText: '加载中...',
    
    // 布局适配
    statusBarHeight: 20,
    navBarHeight: 44,

    // 业务状态
    currentTab: 'rank',
    rankType: 'gas', 
    sortType: 'comp',
    pageTheme: 'gas', // 当前页面主题 ('gas' or 'ev')

    // 数据源
    top3: [],
    userRankList: [],
    rankList: [],
    allRecords: [],

    // 我的数据
    myInfo: { 
      rank: 24, 
      name: 'User_99', // 将在 onLoad 中从缓存昵称覆盖

      type: 'gas', // 个人身份
      bike: 'DUCATI V4',
      deviceId: 'MOTO-8821',
      avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Me', 
      // 统计数据
      totalDist: '0.00', maxAngle: '0.0', avgAngle: '0.0',
      history: [] // 历史记录
    },

    // 管理员 & 表单
    isAuthorized: false, // 是否是白名单里的管理员
    isAdminMode: false,   // 当前是否开启了管理员模式
    showEditModal: false, isEdit: false,
    form: { id: null, type: 'gas', name: '', bike: '', angle: '', dist: '', score: '', avatar: '' },

    // 用户上传
    showUserUpload: false,
    userForm: { dataImg: '', video: '', nickname: '', bikeModel: '', dist: '--', maxAngle: '--', avgAngle: '--', deviceId: '--' },
    isBluetoothConnected: false, isReading: false
  },

  onLoad() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('paihang');
    }
    
    // 🔴 截屏/录屏封禁
    this.initScreenshotProtection();
    
    // 调试用：清除旧缓存防止图片黑框 (发布时删除)
    // wx.clearStorageSync(); 

    // 🆕 读取小程序启动时保存的昵称（与 my 页一致：user_nickname）
    const savedNickname = wx.getStorageSync('user_nickname');
    if (savedNickname) {
      this.setData({ 'myInfo.name': savedNickname });
    }

    // 🆕 产品开发中提示（使用全局自定义 Dialog）
    // 进入页面就提示一次，避免每次 tab 切换都弹
    if (!this._devTipShown) {
      this._devTipShown = true;
      // 延迟一帧，避免阻塞页面初始渲染
      setTimeout(() => {
        // 用本页的弹窗（更好看，且不依赖全局 UI 注入）
        this.setData({ showDevDialog: true });
      }, 200);
    }

    this.calcNavBarInfo();
    this.updateTheme(); // 初始化主题

    // 检查管理员权限
    this.checkAdminPrivilege();

    // 读取数据：优先云端，其次本地缓存，最后 mock
    this.fetchRankFromCloud().finally(() => {
      this.calculateStats(); // 计算个人统计
      this.computeRankings(); // 计算排名
    });
  },

  // 🔴 返回按钮点击事件
  goBack() {
    const pageBack = require('../../../utils/pageBack.js');
    pageBack.popOrHub();
  },

  onBackPress() {
    this.goBack();
    return true;
  },

  // ================== 权限检查逻辑 ==================
  async checkAdminPrivilege() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }
      if (adminCheck.data.length > 0) {
        this.setData({ isAuthorized: true });
        console.log('[paihang.js] 身份验证成功：合法管理员');
      }
    } catch (err) {
      console.error('[paihang.js] 权限检查失败', err);
    }
  },

  // 管理员模式手动切换开关
  toggleAdminMode() {
    if (!this.data.isAuthorized) {
      this.showAutoToast('提示', '无权限');
      return;
    }
    const nextState = !this.data.isAdminMode;
    this.setData({ isAdminMode: nextState });
    this.showAutoToast('提示', nextState ? '管理模式开启' : '已回到用户模式');
  },


  // 2. 核心：计算排名
  computeRankings() {
    const { rankType, sortType, allRecords } = this.data;
    let list = allRecords.filter(item => item.type === rankType);

    list.sort((a, b) => {
      const angleA = parseFloat(a.angle||0), angleB = parseFloat(b.angle||0);
      const distA = parseFloat(a.dist||0), distB = parseFloat(b.dist||0);
      const scoreA = parseFloat(a.score||0), scoreB = parseFloat(b.score||0);

      if (sortType === 'angle') return angleB - angleA;
      if (sortType === 'dist') return distB - distA;
      return scoreB - scoreA; // 综合
    });

    list = list.map((item, index) => ({ ...item, rank: index + 1 }));

    this.setData({
      top3: list.slice(0, 3),
      userRankList: list.slice(3),
      rankList: list // 管理员看全量
    });
  },

  // 3. 核心：智能主题切换
  updateTheme() {
    let theme = 'gas';
    // 如果在榜单页，看什么榜就什么色；如果在个人页，我是什么车就什么色
    if (this.data.currentTab === 'rank') {
      theme = this.data.rankType;
    } else {
      theme = this.data.myInfo.type;
    }
    this.setData({ pageTheme: theme });
    
    // 设置手机状态栏颜色
    wx.setNavigationBarColor({
      frontColor: theme === 'ev' ? '#000000' : '#ffffff',
      backgroundColor: theme === 'ev' ? '#ffffff' : '#000000'
    });
  },

  // 4. 核心：个人数据统计
  calculateStats() {
    const history = this.data.myInfo.history;
    if (!history || history.length === 0) return;

    let totalDist = 0, maxAngle = 0, totalAngle = 0;
    history.forEach(item => {
      totalDist += parseFloat(item.dist);
      totalAngle += parseFloat(item.angle);
      if (parseFloat(item.angle) > maxAngle) maxAngle = parseFloat(item.angle);
    });
    const avgAngle = (totalAngle / history.length).toFixed(1);

    this.setData({
      'myInfo.totalDist': totalDist.toFixed(2),
      'myInfo.maxAngle': maxAngle.toFixed(1),
      'myInfo.avgAngle': avgAngle
    });
  },

  // === 交互事件 ===
  
  switchTab(e) {
    wx.vibrateShort({ type: 'medium' });
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab }, () => { this.updateTheme(); });
  },

  switchRankType(e) {
    wx.vibrateShort({ type: 'light' });
    const type = e.currentTarget.dataset.type;
    this.setData({ rankType: type }, () => {
      this.updateTheme();
      this.computeRankings();
    });
  },

  switchSort(e) {
    wx.vibrateShort({ type: 'light' });
    this.setData({ sortType: e.currentTarget.dataset.type });
    this.computeRankings();
  },

  toggleUserType() {
    wx.vibrateShort({ type: 'medium' });
    const newType = this.data.myInfo.type === 'gas' ? 'ev' : 'gas';
    this.setData({ 'myInfo.type': newType }, () => {
      this.updateTheme();
      this.showAutoToast('提示', newType==='gas'?'黑金主题':'极简白主题');
    });
  },

  calcNavBarInfo() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo(); 
    const statusBarHeight = windowInfo.statusBarHeight;
    const gap = menuButton.top - statusBarHeight;
    const navBarHeight = (gap * 2) + menuButton.height;
    this.setData({ statusBarHeight, navBarHeight });
  },

  // ================= 云端榜单同步 =================
  fetchRankFromCloud() {
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'getMotoRank',
        data: {},
        success: (res) => {
          const list = (res.result && res.result.success) ? (res.result.data || []) : [];
          if (list.length > 0) {
            // 云端数据统一转换为页面需要的结构：使用 _id 作为唯一标识
            const mapped = list.map((i) => ({
              id: i._id, // 兼容旧渲染逻辑
              _id: i._id,
              type: i.type,
              name: i.name,
              bike: i.bike,
              angle: i.angle,
              dist: i.dist,
              score: i.score,
              avatar: i.avatar
            }));
            this.setData({ allRecords: mapped });
            wx.setStorageSync('moto_records', mapped);
          } else {
            // 云端没数据：回退本地缓存或 mock
            const cache = wx.getStorageSync('moto_records');
            if (cache && cache.length > 0) {
              this.setData({ allRecords: cache });
            } else {
              // 云端和缓存都为空：保持空榜单
              this.setData({ allRecords: [] });
            }
          }
          resolve();
        },
        fail: () => {
          const cache = wx.getStorageSync('moto_records');
          if (cache && cache.length > 0) {
            this.setData({ allRecords: cache });
          } else {
            // 云端失败且本地缓存也无：保持空榜单
            this.setData({ allRecords: [] });
          }
          resolve();
        }
      });
    });
  },

  // 图片加载错误兜底
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const defaultImg = 'https://api.dicebear.com/9.x/adventurer/svg?seed=default';
    const up = `top3[${index}].avatar`;
    this.setData({ [up]: defaultImg });
  },

  // === 用户上传逻辑 ===

  onUpload() {
    wx.vibrateShort({ type: 'medium' });
    this.setData({ 
      showUserUpload: true, 
      userForm: { dataImg: '', video: '', nickname: '', bikeModel: '', dist: '--', maxAngle: '--', avgAngle: '--', deviceId: '--' },
      isBluetoothConnected: false, isReading: false 
    }, () => {
      this.updateTheme(); // 弹窗跟随主题
    });
  },
  
  closeUserUpload() { this.setData({ showUserUpload: false }); },

  chooseDataImg() {
    shopImagePrepare.chooseAndPrepare('avatar').then((path) => {
      this.setData({ 'userForm.dataImg': path });
    }).catch((err) => {
      if (!shopImagePrepare.isCropCancelled(err)) console.error('[paihang] chooseDataImg', err);
    });
  },

  chooseVideo() {
    wx.chooseMedia({
      count: 1, mediaType: ['video'], sourceType: ['album', 'camera'],
      success: (res) => { this.setData({ 'userForm.video': res.tempFiles[0].tempFilePath }); }
    })
  },

  readBluetooth() {
    wx.vibrateShort({ type: 'light' });
    this.setData({ isReading: true });
    setTimeout(() => {
      this.setData({
        isReading: false, isBluetoothConnected: true,
        'userForm.deviceId': 'MOTO-BLE-8821',
        'userForm.dist': (Math.random() * 2 + 0.5).toFixed(2),
        'userForm.maxAngle': (Math.random() * 15 + 75).toFixed(1),
        'userForm.avgAngle': (Math.random() * 10 + 60).toFixed(1),
      });
      this.showAutoToast('成功', '数据读取成功');
    }, 1500);
  },

  handleUserFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`userForm.${field}`]: e.detail.value });
  },

  // === 管理员逻辑 ===

  handleTitleClick() {
    // 废弃旧逻辑，不再使用
  },

  openAddModal() {
    this.setData({ showEditModal: true, isEdit: false, form: { id: null, type: this.data.rankType, name: '', bike: '', angle: '', dist: '', score: '', avatar: '' } });
  },
  openEditModal(e) {
    this.setData({ showEditModal: true, isEdit: true, form: { ...e.currentTarget.dataset.item } });
  },
  closeEditModal() { this.setData({ showEditModal: false }) },

  chooseAvatar() {
    shopImagePrepare.chooseAndPrepare('avatar').then((path) => {
      this.setData({ 'form.avatar': path });
    }).catch((err) => {
      if (!shopImagePrepare.isCropCancelled(err)) console.error('[paihang] chooseAvatar', err);
    });
  },

  // 个人中心修改头像
  changeMyAvatar() {
    shopImagePrepare.chooseAndPrepare('avatar').then((path) => {
      this.setData({ 'myInfo.avatar': path });
    }).catch((err) => {
      if (!shopImagePrepare.isCropCancelled(err)) console.error('[paihang] changeMyAvatar', err);
    });
  },
  
  handleMyInfoInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`myInfo.${field}`]: e.detail.value });
  },
  handleFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },
  setFormType(e) {
    this.setData({ 'form.type': e.currentTarget.dataset.val });
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    this.showMyDialog({
      title: '警告',
      content: '确定删除?',
      showCancel: true,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;

        this.showMyLoading('删除中...');
        wx.cloud.callFunction({
          name: 'adminUpdateMotoRank',
          data: { action: 'delete', record: { _id: id } },
          success: (r) => {
            this.hideMyLoading();
            if (r.result && r.result.success) {
              this.fetchRankFromCloud().then(() => {
                this.computeRankings();
                this.showAutoToast('成功', '已删除');
              });
            } else {
              this.showAutoToast('提示', (r.result && r.result.errMsg) ? r.result.errMsg : '删除失败');
            }
          },
          fail: (err) => {
            this.hideMyLoading();
            console.error('adminUpdateMotoRank delete fail', err);
            this.showAutoToast('提示', '删除失败');
          }
        });
      }
    });
  },

  // 统一保存逻辑（管理员新增/用户上传）
  saveRecord() {
    wx.vibrateShort({ type: 'medium' });
    
    // 判断是 用户上传 还是 管理员操作
    if (this.data.showUserUpload) {
      // --- 用户上传流程 ---
      const u = this.data.userForm;
      if(u.maxAngle === '--') {
        this.showAutoToast('提示', '请先读取数据');
        return;
      }
      
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        angle: u.maxAngle,
        dist: u.dist,
        bike: u.bikeModel || this.data.myInfo.bike,
        img: u.dataImg
      };
      
      const newHistory = [newHistoryItem, ...this.data.myInfo.history];
      this.setData({ 'myInfo.history': newHistory, showUserUpload: false });
      this.calculateStats(); // 重新算分
      this.showAutoToast('成功', '提交成功');

    } else {
      // --- 管理员操作流程（写入云端） ---
      const f = this.data.form;
      if (!f.name || !f.bike) {
        this.showAutoToast('提示', '信息不全');
        return;
      }

      const finalScore = f.score || (parseFloat(f.angle||0) + parseFloat(f.dist||0)).toFixed(1);
      const defaultAvatar = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(f.name)}`;
      const action = this.data.isEdit ? 'update' : 'add';

      const syncRecordWithAvatar = (avatarUrl) => {
        const record = {
          _id: f._id || f.id || null,
          type: f.type || this.data.rankType,
          name: f.name,
          bike: f.bike,
          angle: parseFloat(f.angle || 0),
          dist: parseFloat(f.dist || 0),
          score: parseFloat(finalScore || 0),
          avatar: avatarUrl
        };
        this.showMyLoading('同步中...');
        wx.cloud.callFunction({
          name: 'adminUpdateMotoRank',
          data: { action, record },
          success: (res) => {
            this.hideMyLoading();
            if (res.result && res.result.success) {
              this.setData({ showEditModal: false });
              this.fetchRankFromCloud().then(() => {
                this.computeRankings();
                this.showAutoToast('成功', '已发布');
              });
            } else {
              this.showAutoToast('提示', (res.result && res.result.errMsg) ? res.result.errMsg : '同步失败');
            }
          },
          fail: (err) => {
            this.hideMyLoading();
            console.error('adminUpdateMotoRank fail', err);
            this.showAutoToast('提示', '同步失败');
          }
        });
      };

      if (isLocalOrTmpImagePath(f.avatar)) {
        this.showMyLoading('上传头像中...');
        cosUpload
          .uploadImageToCos(f.avatar, 'paihang/avatar')
          .then(url => syncRecordWithAvatar(url))
          .catch(err => {
            this.hideMyLoading();
            this.showAutoToast('提示', (err && err.message) || '头像上传失败');
          });
        return;
      }

      syncRecordWithAvatar(f.avatar || defaultAvatar);
    }
  },

  onShow() {
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    
    // 🔴 检查录屏状态
    if (wx.getScreenRecordingState) {
      wx.getScreenRecordingState({
        success: (res) => {
          if (res.state === 'on' || res.recording) {
            this.handleIntercept('record');
          }
        }
      });
    }
  },

  onHide() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
  },

  onUnload() {
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    if (typeof this._teardownScreenshotProtection === 'function') {
      this._teardownScreenshotProtection();
    }
  },

  // 🔴 初始化截屏/录屏保护
  initScreenshotProtection() {
    // 物理防线：确保录屏、截屏出来的全是黑屏
    if (wx.setVisualEffectOnCapture) {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
        success: () => console.log('[paihang] 🛡️ 硬件级防偷拍锁定')
      });
    }

    try {
      this._onCaptureScreenHandler = () => this.handleIntercept('screenshot');
      wx.onUserCaptureScreen(this._onCaptureScreenHandler);
    } catch (e) {}

    if (wx.onUserScreenRecord) {
      try {
        this._onScreenRecordHandler = () => this.handleIntercept('record');
        wx.onUserScreenRecord(this._onScreenRecordHandler);
      } catch (e) {}
    }
  },

  _teardownScreenshotProtection() {
    if (this._onCaptureScreenHandler && wx.offUserCaptureScreen) {
      try { wx.offUserCaptureScreen(this._onCaptureScreenHandler); } catch (e) {}
      this._onCaptureScreenHandler = null;
    }
    if (this._onScreenRecordHandler && wx.offUserScreenRecord) {
      try { wx.offUserScreenRecord(this._onScreenRecordHandler); } catch (e) {}
      this._onScreenRecordHandler = null;
    }
  },

  // 🔴 获取位置和设备信息的辅助函数
  async _getLocationAndDeviceInfo() {
    const sysInfo = wx.getSystemInfoSync();
    const deviceInfo = {
      deviceInfo: sysInfo.system || '',
      phoneModel: sysInfo.model || ''
    };
    
    // 尝试从缓存获取位置信息
    const cachedLocation = wx.getStorageSync('last_location');
    if (cachedLocation && cachedLocation.province && cachedLocation.city) {
      // 如果缓存中有完整的地址信息，直接使用
      return {
        ...cachedLocation,
        ...deviceInfo
      };
    }
    
    try {
      // 获取当前位置
      const locationRes = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        });
      });

      const lat = locationRes.latitude;
      const lng = locationRes.longitude;
      
      // 🔴 使用带重试机制的逆地理编码获取详细地址
      const { reverseGeocodeWithRetry } = require('../../../utils/reverseGeocode.js');
      const addressData = await reverseGeocodeWithRetry(lat, lng, {
        maxRetries: 3,
        timeout: 10000,
        retryDelay: 1000
      });

      return {
        ...addressData,
        ...deviceInfo
      };
    } catch (err) {
      console.error('[paihang] 获取位置信息失败:', err);
      // 获取定位失败，尝试使用缓存的位置信息
      if (cachedLocation) {
        return {
          ...cachedLocation,
          ...deviceInfo
        };
      } else {
        // 完全失败，只返回设备信息
        return deviceInfo;
      }
    }
  },

  // 🔴 处理截屏/录屏拦截
  async handleIntercept(type) {
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[paihang] 🔴 截屏/录屏检测，立即跳转');
    
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'paihang',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        console.log('[paihang] ✅ 设置封禁状态成功:', res);
      },
      fail: (err) => {
        console.error('[paihang] ⚠️ 设置封禁状态失败:', err);
      }
    });

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'paihang',
          ...locationData
        },
        success: (res) => {
          console.log('[paihang] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[paihang] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      console.log('[paihang] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[paihang] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[paihang] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[paihang] 跳转到 blocked 页面成功');
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[paihang] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        wx.exitMiniProgram();
      }
    });
  },
  
  // 【新增】自动消失提示（无按钮，2秒后自动消失，带收缩退出动画）
  showAutoToast(title = '提示', content = '') {
    // 如果已有toast在显示，先关闭它
    if (this.data.autoToast.show) {
      this._closeAutoToastWithAnimation();
      setTimeout(() => {
        this._showAutoToastInternal(title, content);
      }, 420);
    } else {
      this._showAutoToastInternal(title, content);
    }
  },

  // 内部方法：显示自动提示
  _showAutoToastInternal(title, content) {
    this.setData({
      'autoToast.show': true,
      'autoToast.title': title,
      'autoToast.content': content,
      autoToastClosing: false
    });
    // 2秒后自动消失（带退出动画）
    setTimeout(() => {
      this._closeAutoToastWithAnimation();
    }, 2000);
  },

  // 关闭自动提示（带收缩退出动画）
  _closeAutoToastWithAnimation() {
    if (!this.data.autoToast.show) return;
    this.setData({ autoToastClosing: true });
    setTimeout(() => {
      this.setData({ 
        'autoToast.show': false,
        autoToastClosing: false
      });
    }, 420);
  },
  
  // 【新增】自定义对话框
  showMyDialog(options) {
    this.setData({
      'dialog.show': true,
      'dialog.title': options.title || '提示',
      'dialog.content': options.content || '',
      'dialog.showCancel': options.showCancel || false,
      'dialog.confirmText': options.confirmText || '确定',
      'dialog.cancelText': options.cancelText || '取消',
      'dialog.callback': options.success || null
    });
  },
  
  // 【新增】关闭自定义对话框（带收缩退出动画）
  closeCustomDialog() {
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
    }, 420);
  },
  
  // 【新增】点击对话框确定（带收缩退出动画）
  onDialogConfirm() {
    const cb = this.data.dialog.callback;
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({ 
        'dialog.show': false,
        dialogClosing: false
      });
      if (cb) cb({ confirm: true });
    }, 420);
  },
  
  // 【新增】显示自定义加载动画
  showMyLoading(title = '加载中...') {
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    this.setData({ showLoadingAnimation: true, loadingText: title });
  },
  
  // 【新增】隐藏自定义加载动画
  hideMyLoading() {
    this.setData({ showLoadingAnimation: false });
  }
})