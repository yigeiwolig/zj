const app = getApp()

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
  data: {
    icons: ICONS,
    
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
      name: 'User_99', 
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
    // 调试用：清除旧缓存防止图片黑框 (发布时删除)
    // wx.clearStorageSync(); 

    this.calcNavBarInfo();
    this.updateTheme(); // 初始化主题

    // 检查管理员权限
    this.checkAdminPrivilege();

    // 读取数据
    const cache = wx.getStorageSync('moto_records');
    if (cache && cache.length > 0) {
      this.setData({ allRecords: cache });
    } else {
      this.initMockData();
    }
    
    this.calculateStats(); // 计算个人统计
    this.computeRankings(); // 计算排名
  },

  // ================== 权限检查逻辑 ==================
  async checkAdminPrivilege() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      const db = wx.cloud.database();
      const adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
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
      wx.showToast({ title: '无权限', icon: 'none' });
      return;
    }
    const nextState = !this.data.isAdminMode;
    this.setData({ isAdminMode: nextState });
    wx.showToast({
      title: nextState ? '管理模式开启' : '已回到用户模式',
      icon: 'none'
    });
  },

  // 1. 初始化假数据
  initMockData() {
    const mocks = [
      { id: 1, type: 'gas', name: 'Street_King', bike: 'DUCATI V4S', angle: 89.5, dist: 2.1, score: 98, avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=King' },
      { id: 2, type: 'gas', name: 'Ghost', bike: 'KTM 390', angle: 85.2, dist: 1.8, score: 90, avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Ghost' },
      { id: 3, type: 'ev', name: 'E-Rider', bike: 'Sur-Ron', angle: 88.0, dist: 1.5, score: 95, avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Elec' }
    ];
    this.setData({ allRecords: mocks });
    wx.setStorageSync('moto_records', mocks);
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
      wx.showToast({ title: newType==='gas'?'黑金主题':'极简白主题', icon:'none' });
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
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        wx.cropImage({
          src: res.tempFiles[0].tempFilePath,
          cropScale: '16:9', // 强制横屏比例
          success: (c) => { this.setData({ 'userForm.dataImg': c.tempFilePath }); }
        })
      }
    })
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
      wx.showToast({ title: '数据读取成功', icon: 'success' });
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
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: (res) => {
        wx.cropImage({
          src: res.tempFiles[0].tempFilePath,
          cropScale: '1:1', // 强制正方形
          success: (c) => { this.setData({ 'form.avatar': c.tempFilePath }) }
        })
      }
    })
  },

  // 个人中心修改头像
  changeMyAvatar() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: (res) => {
        wx.cropImage({
          src: res.tempFiles[0].tempFilePath,
          cropScale: '1:1',
          success: (c) => { this.setData({ 'myInfo.avatar': c.tempFilePath }) }
        })
      }
    })
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
    wx.showModal({
      title: '警告', content: '确定删除?',
      success: (res) => {
        if(res.confirm) {
          const newList = this.data.allRecords.filter(i => i.id !== id);
          this.setData({ allRecords: newList });
          wx.setStorageSync('moto_records', newList);
          this.computeRankings();
        }
      }
    })
  },

  // 统一保存逻辑（管理员新增/用户上传）
  saveRecord() {
    wx.vibrateShort({ type: 'medium' });
    
    // 判断是 用户上传 还是 管理员操作
    if (this.data.showUserUpload) {
      // --- 用户上传流程 ---
      const u = this.data.userForm;
      if(u.maxAngle === '--') return wx.showToast({title:'请先读取数据', icon:'none'});
      
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
      wx.showToast({ title: '提交成功', icon: 'success' });

    } else {
      // --- 管理员操作流程 ---
      const f = this.data.form;
      if (!f.name || !f.bike) return wx.showToast({ title: '信息不全', icon: 'none' });

      let newList = [...this.data.allRecords];
      let finalScore = f.score || (parseFloat(f.angle||0) + parseFloat(f.dist||0)).toFixed(1);
      let finalAvatar = f.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${f.name}`;

      const recordData = {
        ...f, angle: parseFloat(f.angle), dist: parseFloat(f.dist), score: parseFloat(finalScore), avatar: finalAvatar
      };

      if (this.data.isEdit) {
        const index = newList.findIndex(i => i.id === f.id);
        if (index > -1) newList[index] = recordData;
      } else {
        recordData.id = Date.now();
        newList.unshift(recordData);
      }

      this.setData({ allRecords: newList, showEditModal: false });
      wx.setStorageSync('moto_records', newList);
      this.computeRankings();
      wx.showToast({ title: '已发布', icon: 'success' });
    }
  }
})