// pages/shouhou/shouhou.js
// 通用测试视频地址（可替换为你自己的云存储链接）
const TEST_VIDEO_URL = "https://wxsnsdy.tc.qq.com/105/20210/snsdyvideodownload?filekey=30280201010421301f0201690402534804102ca905ce620b1241b726bc41dcff44e00204012882540400&bizid=1023&hy=SH&fileparam=302c020101042530230204136ffd93020457e3c4ff02024ef202031e8d7f02030f42400204045a320a0201000400";

// 配件数据 - 按型号独立存储
const DB_PARTS = {
  'F1 PRO': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
  'F1 MAX': ["主板外壳", "下面板", "上面板", "合页", "合页螺丝", "90度连接件", "连杆", "摇臂", "摇臂螺丝", "电机", "固定电机件", "固定电机螺丝", "装牌螺丝包", "螺母", "主板", "按钮", "遥控", "链接线束"],
  'F2 PRO': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 MAX': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 PRO Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"],
  'F2 MAX Long': ["固定牌支架", "固定车上支架", "电机", "固定电机螺丝", "固定支架螺丝", "固定支架软胶", "固定支架硬胶", "负侧边固定螺丝", "主板", "按钮", "连接线束", "固定支架胶垫", "主板外壳"]
};

// 视频数据 - 按组同步（同组型号共享视频）
// 分组：F1 PRO + F1 MAX 一组，F2 PRO + F2 MAX 一组，F2 PRO Long + F2 MAX Long 一组
const VIDEO_GROUPS = {
  'F1': ['F1 PRO', 'F1 MAX'],           // F1 组
  'F2': ['F2 PRO', 'F2 MAX'],           // F2 组
  'F2 Long': ['F2 PRO Long', 'F2 MAX Long'] // F2 Long 组
};

// 型号到组的映射
const MODEL_TO_GROUP = {
  'F1 PRO': 'F1',
  'F1 MAX': 'F1',
  'F2 PRO': 'F2',
  'F2 MAX': 'F2',
  'F2 PRO Long': 'F2 Long',
  'F2 MAX Long': 'F2 Long'
};

// 本地视频数据（已清空演示视频）
const DB_VIDEOS = {
  'F1 PRO': [],
  'F1 MAX': [],
  'F2 PRO': [],
  'F2 MAX': [],
  'F2 PRO Long': [],
  'F2 MAX Long': []
};

// 密码 - 按型号独立设置（可以设置不同密码）
const CODES = { 
  'F1 PRO': '123456', 
  'F1 MAX': '123456',
  'F2 PRO': '456789',
  'F2 MAX': '456789',
  'F2 PRO Long': '456789',
  'F2 MAX Long': '456789'
};
const ADMIN_PASSWORD = '3252955872'; // 管理员密码

// 拖拽相关常量
const DRAG_CONFIG = {
  LONG_PRESS_DELAY: 300,    // 长按触发延迟（ms）
  MOVE_THRESHOLD: 10,       // 移动阈值（px），超过此值取消长按定时器
  CARD_HEIGHT_RPX: 540,     // 卡片总高度（rpx）
  VIBRATE_INTERVAL: 200     // 震动反馈最小间隔（ms），避免过于频繁
};

Page({
  data: {
    inDetail: false,
    isAdmin: false,
    adminClickCount: 0,

    // 当前页面状态
    currentModelName: '',
    currentSeries: '', // F1 或 F2
    activeTab: 'order', // order 或 tutorial
    serviceType: 'parts', // parts 或 repair

    // 数据列表
    currentPartsList: [],
    currentVideoList: [],

    // 选中状态
    selectedCount: 0,

    // 表单数据
    contactName: '',
    contactPhone: '',
    contactAddr: '',
    contactWechat: '',
    videoFileName: '',
    repairDescription: '', // 故障描述

    // 密码锁
    isLocked: true,
    passInput: '',
    passError: false,
    focusPass: false,

    // 弹窗
    showModal: false,
    modalMode: '', // part 或 video
    modalInputVal: '',
    
    // 管理员密码弹窗
    showAdminModal: false,
    adminPasswordInput: '',

    // 临时视频信息
    tempVideoPath: '',

    // 上传视频封面预览
    tempVideoThumb: '',

    // 联系信息折叠
    isContactExpanded: true,

    // 当前正在播放的视频索引 (-1 表示都没播)
    playingIndex: -1,

    // 是否正在提取封面
    extractingThumb: false,

    // 拖拽排序相关
    dragIndex: -1,        // 当前拖拽的卡片索引
    dragStartY: 0,        // 拖拽开始时的Y坐标（相对于页面）
    dragCurrentY: 0,      // 当前拖拽的Y坐标
    dragOffsetY: 0,       // 拖拽偏移量（用于动画，单位px）
    isDragging: false,    // 是否正在拖拽
    longPressTimer: null, // 长按定时器
    lastSwapIndex: -1,    // 上次交换的位置，避免重复交换
    lastVibrateTime: 0,   // 上次震动时间，用于节流
    
    // 状态栏高度
    statusBarHeight: 0
  },

  // 页面加载时初始化
  onLoad() {
    // 初始化云数据库
    if (wx.cloud) {
      this.db = wx.cloud.database();
    }
    
    // 缓存系统信息，避免拖拽时重复调用
    const systemInfo = wx.getSystemInfoSync();
    this._systemInfo = systemInfo;
    this._cardHeightPx = DRAG_CONFIG.CARD_HEIGHT_RPX * (systemInfo.screenWidth / 750);
    
    // 获取状态栏高度，用于适配导航栏
    // 如果没有状态栏高度，使用安全区域，如果都没有，默认 44px（iPhone X 系列）
    const statusBarHeight = systemInfo.statusBarHeight || 44;
    this.setData({ statusBarHeight });
    console.log('状态栏高度:', statusBarHeight);
  },

  // 页面卸载时清理
  onUnload() {
    this._cleanupDrag();
  },

  // 页面隐藏时清理（防止拖拽过程中切换页面）
  onHide() {
    this._cleanupDrag();
  },

  // 清理拖拽状态
  _cleanupDrag() {
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.data.longPressTimer = null;
    }
    if (this.data.isDragging) {
      this.setData({
        isDragging: false,
        dragIndex: -1,
        dragStartY: 0,
        dragCurrentY: 0,
        dragOffsetY: 0,
        lastSwapIndex: -1
      });
    }
  },

  // 1. 首页逻辑
  triggerAdmin() {
    if (this.data.isAdmin) return;
    
    // 点击计数
    this.data.adminClickCount = (this.data.adminClickCount || 0) + 1;
    
    // 点击5次后才显示密码输入弹窗
    if (this.data.adminClickCount >= 5) {
      this.setData({ 
        showAdminModal: true,
        adminPasswordInput: '',
        adminClickCount: 0 // 重置计数
      });
    }
  },

  // 管理员密码输入
  onAdminPasswordInput(e) {
    this.setData({ adminPasswordInput: e.detail.value });
  },

  // 确认管理员密码
  confirmAdminPassword() {
    if (this.data.adminPasswordInput === ADMIN_PASSWORD) {
      this.setData({ 
        isAdmin: true,
        showAdminModal: false,
        adminPasswordInput: ''
      });
      wx.showToast({ title: '管理员模式开启', icon: 'success' });
      if (this.data.inDetail) this.renderParts();
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' });
      this.setData({ adminPasswordInput: '' });
    }
  },

  // 取消管理员密码输入
  cancelAdminPassword() {
    this.setData({ 
      showAdminModal: false,
      adminPasswordInput: '',
      adminClickCount: 0 // 重置计数
    });
  },

  // 退出管理员模式
  exitAdmin() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出管理员模式吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ 
            isAdmin: false,
            adminClickCount: 0
          });
          wx.showToast({ title: '已退出管理员模式', icon: 'success' });
        }
      }
    });
  },

  enterModel(e) {
    const { name, series } = e.currentTarget.dataset;
    // 使用 modelName 作为唯一标识，每个型号数据完全独立
    this.setData({
      currentModelName: name,
      currentSeries: series, // 保留 series 用于显示，但数据查询使用 modelName
      inDetail: true,
      activeTab: 'order',
      serviceType: 'parts',
      playingIndex: -1,
      currentVideoList: [] // 立即清空视频列表，避免显示旧数据
    });
    this.renderParts();
    this.resetLock();
  },

  exitModel() {
    // 直接返回选择界面，不需要管理员模式
    this.setData({ inDetail: false, playingIndex: -1 });
    this.setData({
      contactName: '', contactPhone: '', contactAddr: '', contactWechat: '', videoFileName: '', repairDescription: ''
    });
  },

  // 返回上一页
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      // 如果没有上一页，跳转到首页
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 2. 详情页逻辑
  switchTab(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ activeTab: mode });
    if (mode === 'order') {
      this.renderParts();
    }
    // 切换到教程页时重置播放状态并重新加载视频
    if (mode === 'tutorial') {
      this.setData({ 
        playingIndex: -1,
        currentVideoList: [] // 先清空，避免显示旧数据
      });
      if (!this.data.isLocked) {
        // 延迟一点再加载，确保状态已更新
        setTimeout(() => {
          this.renderVideos();
        }, 50);
      }
    }
  },

  toggleService(e) {
    this.setData({ serviceType: e.currentTarget.dataset.type });
  },

  // 配件逻辑 - 从云数据库 shouhou 集合读取（按型号独立）
  renderParts() {
    const modelName = this.data.currentModelName; // 使用型号名称作为唯一标识
    
    if (!modelName) {
      console.error('型号名称未设置');
      return;
    }
    
    // 从云数据库读取配件数据（按型号查询）
    if (this.db) {
      this.db.collection('shouhou')
        .where({
          modelName: modelName // 使用 modelName 而不是 series
        })
        .orderBy('order', 'asc') // 按 order 排序
        .get()
        .then(res => {
          if (res.data && res.data.length > 0) {
            // 有数据，使用云数据库数据
            const renderList = res.data.map(item => ({
              _id: item._id,
              name: item.name,
              selected: false,
              order: item.order || 0
            }));
            // 按 order 排序
            renderList.sort((a, b) => (a.order || 0) - (b.order || 0));
            const selectedCount = renderList.filter(item => item.selected).length;
            this.setData({
              currentPartsList: renderList,
              selectedCount: selectedCount
            });
          } else {
            // 没有数据，使用本地数据并同步到云端
            const localList = DB_PARTS[modelName] || [];
            const renderList = localList.map((name, index) => ({
              name: name,
              selected: false,
              order: index
            }));
            this.setData({
              currentPartsList: renderList,
              selectedCount: 0
            });
            // 同步本地数据到云端
            this.syncPartsToCloud(modelName, localList);
          }
        })
        .catch(err => {
          console.error('读取配件失败:', err);
          // 失败时使用本地数据
          const list = DB_PARTS[modelName] || [];
          const renderList = list.map(item => ({ name: item, selected: false }));
          const selectedCount = renderList.filter(item => item.selected).length;
          this.setData({
            currentPartsList: renderList,
            selectedCount: selectedCount
          });
        });
    } else {
      // 没有云数据库时使用本地数据
      const list = DB_PARTS[modelName] || [];
      const renderList = list.map(item => ({ name: item, selected: false }));
      const selectedCount = renderList.filter(item => item.selected).length;
      this.setData({
        currentPartsList: renderList,
        selectedCount: selectedCount
      });
    }
  },

  // 同步配件数据到云端（按型号独立）
  syncPartsToCloud(modelName, partsList) {
    if (!this.db || !partsList || partsList.length === 0) return;
    
    // 循环单个添加配件到 shouhou 集合（更可靠）
    let addPromises = partsList.map((name, index) => {
      return this.db.collection('shouhou').add({
        data: {
          modelName: modelName, // 使用 modelName 作为唯一标识
          name: name,
          order: index,
          createTime: this.db.serverDate()
        }
      });
    });
    
    Promise.all(addPromises)
      .then(() => {
        console.log(`${modelName} 配件数据已同步到云端，共 ${partsList.length} 个`);
      })
      .catch(err => {
        console.error('同步配件失败:', err);
      });
  },

  // 一键同步所有本地配件数据到云端（管理员功能）
  syncAllPartsToCloud() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '需要管理员权限', icon: 'none' });
      return;
    }

    if (!this.db) {
      wx.showToast({ title: '云服务未初始化', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认同步',
      content: '将同步所有6个型号（F1 PRO、F1 MAX、F2 PRO、F2 MAX、F2 PRO Long、F2 MAX Long）的配件数据到云端，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '同步中...', mask: true });
          
          // 先检查云端是否已有数据（6个独立型号）
          const allModels = ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'];
          let totalParts = 0;
          let syncedCount = 0;
          
          // 统计需要同步的配件数量
          allModels.forEach(modelName => {
            totalParts += (DB_PARTS[modelName] || []).length;
          });

          // 逐个型号同步（6个独立型号）
          const syncPromises = allModels.map(modelName => {
            const partsList = DB_PARTS[modelName] || [];
            if (partsList.length === 0) {
              return Promise.resolve();
            }

            // 先检查云端是否已有该型号的数据
            return this.db.collection('shouhou')
              .where({ modelName: modelName }) // 使用 modelName 查询
              .count()
              .then(countRes => {
                if (countRes.total > 0) {
                  // 已有数据，跳过
                  console.log(`${modelName} 已有 ${countRes.total} 个配件，跳过同步`);
                  syncedCount += partsList.length;
                  return Promise.resolve();
                } else {
                  // 没有数据，开始同步（使用循环单个添加，避免 batch 问题）
                  const addPromises = partsList.map((name, index) => {
                    return this.db.collection('shouhou').add({
                      data: {
                        modelName: modelName, // 使用 modelName 作为标识
                        name: name,
                        order: index,
                        createTime: this.db.serverDate()
                      }
                    });
                  });
                  
                  return Promise.all(addPromises)
                    .then(() => {
                      syncedCount += partsList.length;
                      console.log(`${modelName} 同步完成，共 ${partsList.length} 个配件`);
                    })
                    .catch(err => {
                      console.error(`${modelName} 同步失败:`, err);
                    });
                }
              })
              .catch(err => {
                console.error(`检查 ${modelName} 失败:`, err);
              });
          });

          // 等待所有同步完成
          Promise.all(syncPromises)
            .then(() => {
              wx.hideLoading();
              if (syncedCount > 0) {
                wx.showToast({ 
                  title: `同步完成！共 ${syncedCount} 个配件`, 
                  icon: 'success',
                  duration: 2000
                });
                // 如果当前在详情页，重新加载配件列表
                if (this.data.inDetail && this.data.currentSeries) {
                  setTimeout(() => {
                    this.renderParts();
                  }, 500);
                }
              } else {
                wx.showToast({ 
                  title: '所有数据已存在，无需同步', 
                  icon: 'none',
                  duration: 2000
                });
              }
            })
            .catch(err => {
              wx.hideLoading();
              console.error('同步过程出错:', err);
              wx.showToast({ title: '同步失败，请重试', icon: 'none' });
            });
        }
      }
    });
  },

  togglePart(e) {
    if (e.target.dataset.type === 'del') return;
    const idx = e.currentTarget.dataset.index;
    const key = `currentPartsList[${idx}].selected`;
    const currentVal = this.data.currentPartsList[idx].selected;

    this.setData({
      [key]: !currentVal,
      selectedCount: this.data.selectedCount + (!currentVal ? 1 : -1)
    });
  },

  // 管理员删除配件
  deletePart(e) {
    const idx = e.currentTarget.dataset.index;
    const modelName = this.data.currentModelName;
    const part = this.data.currentPartsList[idx];
    const partName = part.name;

    wx.showModal({
      title: '提示',
      content: `确定删除配件: ${partName}?`,
      success: (res) => {
        if (res.confirm) {
          // 从云数据库删除
          if (this.db && part._id) {
            this.db.collection('shouhou').doc(part._id).remove()
              .then(() => {
                // 重新加载配件列表
                this.renderParts();
                wx.showToast({ title: '已删除', icon: 'success' });
              })
              .catch(err => {
                console.error('删除失败:', err);
                wx.showToast({ title: '删除失败', icon: 'none' });
              });
          } else {
            // 本地删除（兼容旧数据）
            if (DB_PARTS[modelName]) {
              DB_PARTS[modelName].splice(idx, 1);
            }
            this.renderParts();
            wx.showToast({ title: '已删除', icon: 'success' });
          }
        }
      }
    });
  },

  // 视频上传模拟
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      success: (res) => {
        this.setData({ videoFileName: '已选择视频 (点击重新上传)' });
      }
    });
  },

  // 智能粘贴
  smartPaste() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data;
        if (!text) { wx.showToast({ title: '剪贴板为空', icon: 'none' }); return; }
        const phoneReg = /\d{11}/;
        const phone = text.match(phoneReg);
        if (phone) this.setData({ contactPhone: phone[0] });
        const parts = text.split(/[\s,，]+/);
        if (parts.length > 0) this.setData({ contactName: parts[0] });
        let addr = '';
        parts.forEach(p => { if (p.length > addr.length) addr = p; });
        this.setData({ contactAddr: addr });
        wx.showToast({ title: '已识别', icon: 'success' });
      }
    });
  },

  // 联系信息输入处理
  handleContactInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({ [field]: value });
  },

  // 故障描述输入处理
  handleRepairInput(e) {
    this.setData({ repairDescription: e.detail.value });
  },

  submitOrder() {
    // 验证逻辑
    const { serviceType, selectedCount, contactName, contactPhone, contactAddr, contactWechat, repairDescription, videoFileName } = this.data;
    
    // 1. 验证购买配件或故障报修至少选一个
    if (serviceType === 'parts' && selectedCount === 0) {
      wx.showToast({ title: '请至少选择一个配件', icon: 'none' });
      return;
    }
    
    if (serviceType === 'repair') {
      if (!repairDescription || repairDescription.trim() === '') {
        wx.showToast({ title: '请填写故障描述', icon: 'none' });
        return;
      }
    }
    
    // 2. 验证联系信息（每一项都必须填写）
    if (!contactName || contactName.trim() === '') {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    
    if (!contactPhone || contactPhone.trim() === '') {
      wx.showToast({ title: '请填写手机号码', icon: 'none' });
      return;
    }
    
    // 验证手机号格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(contactPhone)) {
      wx.showToast({ title: '手机号码格式不正确', icon: 'none' });
      return;
    }
    
    if (!contactAddr || contactAddr.trim() === '') {
      wx.showToast({ title: '请填写详细收货地址', icon: 'none' });
      return;
    }
    
    if (!contactWechat || contactWechat.trim() === '') {
      wx.showToast({ title: '请填写微信昵称', icon: 'none' });
      return;
    }
    
    // 验证通过，提交到云数据库
    wx.showLoading({ title: '提交中...', mask: true });
    
    // 准备提交数据
    const orderData = {
      serviceType: serviceType, // 'parts' 或 'repair'
      modelName: this.data.currentModelName,
      series: this.data.currentSeries,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactAddr: contactAddr.trim(),
      contactWechat: contactWechat.trim(),
      createTime: this.db ? this.db.serverDate() : new Date(),
      status: 'pending' // 待处理
    };
    
    // 根据服务类型添加不同数据
    if (serviceType === 'parts') {
      // 购买配件：记录选中的配件
      const selectedParts = this.data.currentPartsList
        .filter(item => item.selected)
        .map(item => item.name);
      orderData.selectedParts = selectedParts;
      orderData.partsCount = selectedCount;
    } else if (serviceType === 'repair') {
      // 故障报修：记录故障描述和视频
      orderData.repairDescription = repairDescription.trim();
      orderData.videoFileName = videoFileName || '';
      // TODO: 如果有视频文件，需要上传到云存储
    }
    
    // 提交到 shouhou_read 集合
    if (this.db) {
      this.db.collection('shouhou_read').add({
        data: orderData,
        success: () => {
          wx.hideLoading();
          wx.showToast({ title: '提交成功', icon: 'success' });
          
          // 清空表单
          setTimeout(() => {
            this.setData({
              selectedCount: 0,
              contactName: '',
              contactPhone: '',
              contactAddr: '',
              contactWechat: '',
              repairDescription: '',
              videoFileName: ''
            });
            // 重置配件选择状态
            this.renderParts();
          }, 1500);
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('提交失败:', err);
          wx.showToast({ title: '提交失败，请重试', icon: 'none' });
        }
      });
    } else {
      wx.hideLoading();
      wx.showToast({ title: '云服务未初始化', icon: 'none' });
    }
  },

  // 3. 教程逻辑
  onPassInput(e) {
    const val = e.detail.value;
    this.setData({ passInput: val });

    if (val.length === 6) {
      const modelName = this.data.currentModelName;
      // 使用 modelName 查找对应的密码
      if (val === CODES[modelName]) {
        this.setData({ isLocked: false, passError: false });
        this.renderVideos();
      } else {
        this.setData({ passError: true, passInput: '' });
      }
    } else {
      this.setData({ passError: false });
    }
  },

  renderVideos() {
    // 从云数据库 shouhouvideo 读取视频列表（按组同步）
    const modelName = this.data.currentModelName;
    
    // 立即清空列表，避免显示旧数据
    this.setData({ currentVideoList: [] });
    
    if (!modelName) {
      return;
    }
    
    // 获取当前型号所属的组
    const groupName = MODEL_TO_GROUP[modelName];
    if (!groupName) {
      console.warn('未找到型号对应的组:', modelName);
      return;
    }
    
    // 生成请求标识，确保只使用最新的请求结果
    const requestId = Date.now();
    this._lastVideoRequestId = requestId;
    
    if (this.db) {
      // 先尝试按 order 排序（使用 groupName 查询，同组共享视频）
      this.db.collection('shouhouvideo')
        .where({
          groupName: groupName // 使用 groupName 查询，同组型号共享视频
        })
        .orderBy('order', 'asc')
        .get()
        .then(res => {
          // 检查请求是否已过期（防止异步请求时序问题）
          if (this._lastVideoRequestId !== requestId) {
            console.log('视频请求已过期，忽略结果');
            return;
          }
          
          // 再次验证当前型号是否匹配
          if (this.data.currentModelName !== modelName) {
            console.log('型号已切换，忽略旧请求结果');
            return;
          }
          
          if (res.data && res.data.length > 0) {
            // 有数据，使用云数据库数据
            const videoList = res.data.map(item => ({
              _id: item._id,
              title: item.title,
              time: item.time || this.formatDuration(item.duration) || '00:00',
              src: item.videoFileID || item.src || TEST_VIDEO_URL,
              thumb: item.thumbFileID || item.thumb || '',
              coverColor: item.coverColor || '#1c1c1e',
              createTime: item.createTime,
              order: item.order || 0
            }));
            // 按 order 排序（如果数据库排序失败）
            videoList.sort((a, b) => (a.order || 0) - (b.order || 0));
            this.setData({ currentVideoList: videoList });
            console.log(`✅ 加载 ${modelName} (${groupName}组) 的视频，共 ${videoList.length} 个`);
          } else {
            // 没有数据，使用本地数据
            this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
            console.log(`⚠️ ${modelName} (${groupName}组) 没有云端视频，使用本地数据`);
          }
        })
        .catch(err => {
          // 检查请求是否已过期
          if (this._lastVideoRequestId !== requestId) {
            return;
          }
          
          console.error('读取视频失败（尝试按 createTime 排序）:', err);
          // 如果 orderBy order 失败，尝试按 createTime 排序
          this.db.collection('shouhouvideo')
            .where({
              groupName: groupName
            })
            .orderBy('createTime', 'desc')
            .get()
            .then(res => {
              // 再次检查请求是否已过期
              if (this._lastVideoRequestId !== requestId || this.data.currentModelName !== modelName) {
                return;
              }
              
              if (res.data && res.data.length > 0) {
                const videoList = res.data.map(item => ({
                  _id: item._id,
                  title: item.title,
                  time: item.time || this.formatDuration(item.duration) || '00:00',
                  src: item.videoFileID || item.src || TEST_VIDEO_URL,
                  thumb: item.thumbFileID || item.thumb || '',
                  coverColor: item.coverColor || '#1c1c1e',
                  createTime: item.createTime,
                  order: item.order || 0
                }));
                // 按 order 排序
                videoList.sort((a, b) => (a.order || 0) - (b.order || 0));
                this.setData({ currentVideoList: videoList });
                console.log(`✅ 加载 ${modelName} (${groupName}组) 的视频，共 ${videoList.length} 个`);
              } else {
                this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
                console.log(`⚠️ ${modelName} (${groupName}组) 没有云端视频，使用本地数据`);
              }
            })
            .catch(err2 => {
              // 检查请求是否已过期
              if (this._lastVideoRequestId !== requestId || this.data.currentModelName !== modelName) {
                return;
              }
              
              console.error('读取视频完全失败:', err2);
              // 完全失败时使用本地数据
              this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
            });
        });
    } else {
      // 没有云数据库时使用本地数据
      this.setData({ currentVideoList: DB_VIDEOS[modelName] || [] });
      console.log(`⚠️ 云数据库未初始化，${modelName} 使用本地数据`);
    }
  },

  // 格式化时长（秒转 mm:ss）
  formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  // 核心：点击播放某个视频
  playVideo(e) {
    // 如果正在拖拽，不触发播放
    if (this.data.isDragging) return;
    
    const idx = Number(e.currentTarget.dataset.index); // dataset 中是字符串，这里转成数字
    this.setData({ playingIndex: idx });
  },

  // 管理员删除视频（删除同组的所有视频）
  deleteVideo(e) {
    if (!this.data.isAdmin) return;
    // 如果正在拖拽，不触发删除
    if (this.data.isDragging) return;
    
    const idx = Number(e.currentTarget.dataset.index);
    const videoList = this.data.currentVideoList;
    const target = videoList[idx];
    if (!target) return;

    wx.showModal({
      title: '提示',
      content: `确定删除教程「${target.title}」吗？\n（同组型号的视频也会被删除）`,
      success: (res) => {
        if (res.confirm) {
          // 从云数据库删除（同组共享，删除一个即可）
          if (this.db && target._id) {
            this.db.collection('shouhouvideo').doc(target._id).remove()
              .then(() => {
                this.renderVideos();
                wx.showToast({ title: '已删除', icon: 'success' });
              })
              .catch(err => {
                console.error('删除失败:', err);
                wx.showToast({ title: '删除失败', icon: 'none' });
              });
          } else {
            // 本地删除（兼容旧数据）
            const modelName = this.data.currentModelName;
            if (DB_VIDEOS[modelName]) {
              DB_VIDEOS[modelName].splice(idx, 1);
            }
            this.renderVideos();
            wx.showToast({ title: '已删除', icon: 'success' });
          }
        }
      }
    });
  },

  // 长按开始拖拽
  onLongPress(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    const startY = e.touches[0].clientY;
    
    // 清除可能存在的定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.data.longPressTimer = null;
    }
    
    wx.vibrateShort({ type: 'medium' });
    this.setData({
      isDragging: true,
      dragIndex: idx,
      dragStartY: startY,
      dragCurrentY: startY,
      dragOffsetY: 0,
      lastSwapIndex: idx,
      lastVibrateTime: Date.now()
    });
  },

  // 触摸开始（用于记录初始位置）
  onDragStart(e) {
    if (!this.data.isAdmin) return;
    const idx = Number(e.currentTarget.dataset.index);
    const startY = e.touches[0].clientY;
    
    // 先记录初始位置
    this.setData({
      dragStartY: startY,
      dragCurrentY: startY,
      dragOffsetY: 0,
      lastSwapIndex: idx
    });
    
    // 清除可能存在的定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
    }
    
    // 设置长按定时器
    this.data.longPressTimer = setTimeout(() => {
      wx.vibrateShort({ type: 'medium' });
      this.setData({
        isDragging: true,
        dragIndex: idx,
        lastVibrateTime: Date.now()
      });
    }, DRAG_CONFIG.LONG_PRESS_DELAY);
  },

  // 拖拽移动
  onDragMove(e) {
    if (!this.data.isAdmin) return;
    
    // 如果还没开始拖拽，但移动距离超过阈值，取消长按定时器
    if (!this.data.isDragging && this.data.longPressTimer) {
      const moveY = Math.abs(e.touches[0].clientY - this.data.dragStartY);
      if (moveY > DRAG_CONFIG.MOVE_THRESHOLD) {
        clearTimeout(this.data.longPressTimer);
        this.data.longPressTimer = null;
      }
      return;
    }
    
    if (!this.data.isDragging) return;
    
    // 阻止默认滚动行为
    e.preventDefault && e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.data.dragStartY;
    
    // 直接 1:1 跟手，让卡片平滑跟随手指
    this.setData({
      dragCurrentY: currentY,
      dragOffsetY: deltaY
    });

    // 使用缓存的卡片高度（避免重复计算）
    const cardHeightPx = this._cardHeightPx || (DRAG_CONFIG.CARD_HEIGHT_RPX * (this._systemInfo?.screenWidth || 375) / 750);
    
    // 计算目标位置索引
    const moveIndex = Math.round(deltaY / cardHeightPx);
    const targetIndex = this.data.dragIndex + moveIndex;
    const list = this.data.currentVideoList;
    
    // 只在目标位置有效且与上次交换位置不同时才交换（避免重复交换导致跳跃）
    if (targetIndex >= 0 && 
        targetIndex < list.length && 
        targetIndex !== this.data.dragIndex &&
        targetIndex !== this.data.lastSwapIndex) {
      
      // 交换位置
      const newList = [...list];
      const temp = newList[this.data.dragIndex];
      newList[this.data.dragIndex] = newList[targetIndex];
      newList[targetIndex] = temp;
      
      // 计算剩余偏移量（交换后，卡片应该继续跟随手指）
      // 关键：保持视觉连续性，不跳跃
      const remainingOffset = deltaY - (moveIndex * cardHeightPx);
      
      this.setData({
        currentVideoList: newList,
        dragIndex: targetIndex,
        dragStartY: currentY - remainingOffset, // 更新起始位置，保持连续性
        dragOffsetY: remainingOffset, // 保持剩余偏移量，让卡片继续跟随
        lastSwapIndex: targetIndex // 记录本次交换的位置
      });
      
      // 同步到云数据库（更新排序）- 同组共享，更新一个即可
      if (this.db) {
        const modelName = this.data.currentModelName;
        const groupName = MODEL_TO_GROUP[modelName];
        // 更新云数据库中的 order 字段
        newList.forEach((item, index) => {
          if (item._id) {
            this.db.collection('shouhouvideo').doc(item._id).update({
              data: { order: index }
            }).catch(err => console.error('更新排序失败:', err));
          }
        });
      }
      
      // 同步到本地 DB_VIDEOS（兼容）
      const modelName = this.data.currentModelName;
      if (DB_VIDEOS[modelName]) {
        DB_VIDEOS[modelName] = newList;
      }
      
      // 震动反馈（节流，避免过于频繁）
      const now = Date.now();
      if (now - this.data.lastVibrateTime > DRAG_CONFIG.VIBRATE_INTERVAL) {
        wx.vibrateShort({ type: 'light' });
        this.setData({ lastVibrateTime: now });
      }
    }
  },

  // 拖拽结束
  onDragEnd(e) {
    if (!this.data.isAdmin) return;
    
    // 清除长按定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.data.longPressTimer = null;
    }
    
    if (this.data.isDragging) {
      // 保存最终顺序到云数据库（同组共享）
      const videoList = this.data.currentVideoList;
      const modelName = this.data.currentModelName;
      const groupName = MODEL_TO_GROUP[modelName];
      
      // 同步到本地（兼容）
      if (DB_VIDEOS[modelName]) {
        DB_VIDEOS[modelName] = videoList;
      }
      
      // 更新云数据库中的 order 字段
      if (this.db) {
        let updateCount = 0;
        videoList.forEach((item, index) => {
          if (item._id) {
            this.db.collection('shouhouvideo').doc(item._id).update({
              data: { order: index }
            }).then(() => {
              updateCount++;
              // 所有更新完成后提示
              if (updateCount === videoList.filter(v => v._id).length) {
                wx.showToast({ 
                  title: '顺序已更新', 
                  icon: 'success',
                  duration: 1000
                });
              }
            }).catch(err => {
              console.error('更新排序失败:', err);
            });
          }
        });
        
        // 如果没有需要更新的项，直接提示
        if (videoList.filter(v => v._id).length === 0) {
          wx.showToast({ 
            title: '顺序已更新', 
            icon: 'success',
            duration: 1000
          });
        }
      } else {
        // 只有在实际移动了位置时才提示
        if (this.data.dragIndex !== this.data.lastSwapIndex || Math.abs(this.data.dragOffsetY) > 10) {
          wx.showToast({ 
            title: '顺序已更新', 
            icon: 'success',
            duration: 1000
          });
        }
      }
    }
    
    // 重置拖拽状态，添加过渡动画让卡片回到原位
    this.setData({
      isDragging: false,
      dragIndex: -1,
      dragStartY: 0,
      dragCurrentY: 0,
      dragOffsetY: 0,
      lastSwapIndex: -1,
      lastVibrateTime: 0
    });
  },

  resetLock() {
    this.setData({
      isLocked: true,
      passInput: '',
      passError: false,
      playingIndex: -1
    });
  },

  reLock() {
    this.resetLock();
  },

  // 点击锁屏区域时，强制触发输入框聚焦（主要照顾开发者工具）
  focusInput() {
    this.setData({ focusPass: false });
    setTimeout(() => {
      this.setData({ focusPass: true });
    }, 50);
  },

  // 4. 模态框逻辑
  openModal(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      showModal: true,
      modalMode: mode,
      modalInputVal: '',
      tempVideoPath: '',
      tempVideoThumb: ''
    });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  confirmModal() {
    const val = this.data.modalInputVal;
    if (!val) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    const series = this.data.currentSeries;

    if (this.data.modalMode === 'part') {
      // 配件模式：添加到云数据库 shouhou 集合（按型号独立）
      const modelName = this.data.currentModelName;
      if (this.db) {
        // 获取当前最大 order 值
        this.db.collection('shouhou')
          .where({
            modelName: modelName // 使用 modelName 查询
          })
          .orderBy('order', 'desc')
          .limit(1)
          .get()
          .then(res => {
            const maxOrder = (res.data && res.data.length > 0) 
              ? (res.data[0].order || 0) 
              : -1;
            
            // 添加新配件到云端
            this.db.collection('shouhou').add({
              data: {
                modelName: modelName, // 使用 modelName 作为标识
                name: val,
                order: maxOrder + 1,
                createTime: this.db.serverDate()
              },
              success: () => {
                // 重新加载配件列表
                this.renderParts();
                wx.showToast({ title: '配件已添加', icon: 'success' });
                this.closeModal();
              },
              fail: (err) => {
                console.error('添加配件失败:', err);
                wx.showToast({ title: '添加失败，请重试', icon: 'none' });
              }
            });
          })
          .catch(err => {
            console.error('获取 order 失败:', err);
            // 如果获取失败，直接添加，order 设为 0
            this.db.collection('shouhou').add({
              data: {
                modelName: modelName,
                name: val,
                order: 0,
                createTime: this.db.serverDate()
              },
              success: () => {
                this.renderParts();
                wx.showToast({ title: '配件已添加', icon: 'success' });
                this.closeModal();
              },
              fail: (err2) => {
                console.error('添加配件失败:', err2);
                wx.showToast({ title: '添加失败，请重试', icon: 'none' });
              }
            });
          });
      } else {
        // 没有云数据库时使用本地数据
        if (!DB_PARTS[modelName]) {
          DB_PARTS[modelName] = [];
        }
        DB_PARTS[modelName].push(val);
        this.renderParts();
        wx.showToast({ title: '配件已添加', icon: 'success' });
        this.closeModal();
      }
    } else {
      // 视频模式：校验是否选择了视频
      if (!this.data.tempVideoPath) {
        wx.showToast({ title: '请先选择视频', icon: 'none' });
        return;
      }

      // 上传视频到云存储并写入 shouhouvideo 集合（按型号独立）
      wx.showLoading({ title: '上传中...', mask: true });
      
      const modelName = this.data.currentModelName;
      const timestamp = Date.now();
      const videoCloudPath = `shouhou/videos/${modelName}/${timestamp}_${val}.mp4`;
      const thumbCloudPath = this.data.tempVideoThumb 
        ? `shouhou/thumbs/${modelName}/${timestamp}_${val}.jpg`
        : null;

      // 先上传视频文件
      wx.cloud.uploadFile({
        cloudPath: videoCloudPath,
        filePath: this.data.tempVideoPath,
        success: (videoRes) => {
              // 视频上传成功，如果有封面则上传封面
              if (thumbCloudPath && this.data.tempVideoThumb) {
                wx.cloud.uploadFile({
                  cloudPath: thumbCloudPath,
                  filePath: this.data.tempVideoThumb,
                  success: (thumbRes) => {
                    // 封面上传成功，写入数据库
                    this.saveVideoToDB(val, modelName, videoRes.fileID, thumbRes.fileID);
                  },
                  fail: (err) => {
                    console.error('封面上传失败:', err);
                    // 封面上传失败，只保存视频
                    this.saveVideoToDB(val, modelName, videoRes.fileID, null);
                  }
                });
              } else {
                // 没有封面，直接保存视频
                this.saveVideoToDB(val, modelName, videoRes.fileID, null);
              }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('视频上传失败:', err);
          wx.showToast({ title: '视频上传失败', icon: 'none' });
        }
      });
    }
  },

  // 保存视频信息到数据库（按组同步，同组型号共享视频）
  saveVideoToDB(title, modelName, videoFileID, thumbFileID) {
    if (!this.db) {
      wx.hideLoading();
      wx.showToast({ title: '云服务未初始化', icon: 'none' });
      return;
    }

    // 获取当前型号所属的组
    const groupName = MODEL_TO_GROUP[modelName];
    if (!groupName) {
      wx.hideLoading();
      wx.showToast({ title: '型号分组错误', icon: 'none' });
      return;
    }

    // 获取当前组最大 order 值
    this.db.collection('shouhouvideo')
      .where({ groupName: groupName })
      .orderBy('order', 'desc')
      .limit(1)
      .get()
      .then(res => {
        const maxOrder = (res.data && res.data.length > 0) 
          ? (res.data[0].order || 0) 
          : -1;

        // 保存视频到数据库（使用 groupName，同组共享）
        this.db.collection('shouhouvideo').add({
          data: {
            title: title,
            groupName: groupName, // 使用 groupName，同组型号共享
            videoFileID: videoFileID,
            thumbFileID: thumbFileID || '',
            coverColor: '#1c1c1e', // 默认封面颜色
            createTime: this.db.serverDate(),
            order: maxOrder + 1 // 用于排序，管理员可以调整
          },
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '教程发布成功', icon: 'success' });
            this.closeModal();
            // 重新加载视频列表
            this.renderVideos();
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('保存失败:', err);
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          }
        });
      })
      .catch(err => {
        console.error('获取 order 失败:', err);
        // 如果获取失败，直接添加，order 设为 0
        this.db.collection('shouhouvideo').add({
          data: {
            title: title,
            groupName: groupName,
            videoFileID: videoFileID,
            thumbFileID: thumbFileID || '',
            coverColor: '#1c1c1e',
            createTime: this.db.serverDate(),
            order: 0
          },
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '教程发布成功', icon: 'success' });
            this.closeModal();
            this.renderVideos();
          },
          fail: (err2) => {
            wx.hideLoading();
            console.error('保存失败:', err2);
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          }
        });
      });
  },

  onModalInput(e) {
    this.setData({ modalInputVal: e.detail.value });
  },

  // 管理员选择视频
  adminChooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        const videoPath = file.tempFilePath;
        const thumbPath = file.thumbTempFilePath;

        // 如果微信已经生成了封面，直接使用
        if (thumbPath) {
          this.setData({
            tempVideoPath: videoPath,
            tempVideoThumb: thumbPath
          });
          if (!this.data.modalInputVal) {
            this.setData({ modalInputVal: "新上传教程" });
          }
          wx.showToast({ title: '视频已选择', icon: 'success' });
        } else {
          // 如果没有封面，使用 video 组件的 snapshot 方法提取第一帧
          this.setData({
            tempVideoPath: videoPath,
            tempVideoThumb: '',
            extractingThumb: true
          });
          if (!this.data.modalInputVal) {
            this.setData({ modalInputVal: "新上传教程" });
          }
          wx.showLoading({ title: '正在提取封面...', mask: true });
        }
      }
    });
  },

  // 视频元数据加载完成，准备截图
  onVideoMetadataLoaded() {
    // 等待一小段时间确保视频帧已准备好
    setTimeout(() => {
      this.captureVideoFrame();
    }, 300);
  },

  // 视频时间更新（用于确保第一帧已加载）
  onVideoTimeUpdate() {
    // 如果当前时间接近0秒，可以尝试截图
    // 这个事件主要用于确保视频帧已准备好
  },

  // 截取视频第一帧
  captureVideoFrame() {
    const videoContext = wx.createVideoContext('thumbVideo', this);
    
    // 先定位到第一帧
    videoContext.seek(0);
    
    // 等待定位完成后再截图
    setTimeout(() => {
      videoContext.snapshot({
        success: (res) => {
          // 截图成功，保存封面路径
          this.setData({
            tempVideoThumb: res.tempImagePath,
            extractingThumb: false
          });
          wx.hideLoading();
          wx.showToast({ title: '视频已选择', icon: 'success' });
        },
        fail: (err) => {
          // 截图失败，使用占位提示
          console.error('截图失败:', err);
          this.setData({
            extractingThumb: false
          });
          wx.hideLoading();
          wx.showToast({ 
            title: '视频已选择（封面提取失败）', 
            icon: 'none',
            duration: 2000
          });
        }
      });
    }, 500);
  },

  // 联系信息折叠/展开
  toggleContact() {
    this.setData({
      isContactExpanded: !this.data.isContactExpanded
    });
  }
})
