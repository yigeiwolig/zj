const app = getApp();
const db = wx.cloud.database();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});

Page({
  data: {
    statusBarHeight: 20,
    currentTab: 'all',
    showRecordStartTip: false, // 🆕 显示录制开始提示
    
    // --- 🆕 滑块动画核心数据 ---
    sliderLeft: 0,    // 滑块距离左边的距离 (px)
    sliderWidth: 0,   // 滑块的宽度 (px)
    scrollLeft: 0,    // 滚动条的位置 (用于自动居中)
    
    // --- 页面状态 ---
    showIntro: true,
    showCamera: false,
    showForm: false,      
    showSuccess: false,
    showUploadOptions: false, // 显示上传选项弹窗（选择相册/录制）
    showBindDeviceTip: false, // 显示绑定设备提示弹窗   
    
    // --- 播放器与管理员状态 ---
    showVideoPlayer: false, 
    currentVideo: null,     

    // --- 🆕 搜索栏状态 ---
    showSearchBar: true, // 默认显示
    searchText: '',       
    searchTip: '',        

    // 滚动相关
    lastScrollTop: 0, // 上一次滚动的位置

    // --- 录制状态 ---
    isRecording: false,
    recTimeStr: "00:00",
    timer: null,
    videoPath: null,
    showPrivacyTip: false, // 🆕 隐私提示显隐控制
    isStopping: false, // 🆕 防止重复点击停止按钮
    cameraAnimating: false, // 🆕 录制页面动画状态
    
    // --- 管理员上传/编辑相关 ---
    isAuthorized: false, // 是否是白名单里的管理员
    isAdmin: false,      // 当前是否开启了管理员模式（使用 isAdminUnlocked 的别名）
    adminSubMode: 'edit', // 管理员子模式：'edit' 视频编辑，'manage' 管理现有视频
    showAdminForm: false,
    
    // 🆕 编辑模式状态
    isEditing: false,     // 是否正在编辑现有案例
    editingId: null,      //正在编辑的ID
    
    adminVideoPath: null,
    adminThumbPath: null, 
    
    // --- 表单数据 ---
    vehicleName: '',
    categoryArray: ['街车', '仿赛', '踏板', '巡航', '电摩', '电动自行车'],
    categoryValueArray: ['street', 'sport', 'scooter', 'cruise', 'ebike', 'bicycle'],
    categoryIndex: null, // 🔴 修复：按照 zj4 的写法，使用 null
    modelArray: ['F1', 'F2', 'F2 Long', '不知道'],
    modelIndex: null, // 🔴 修复：按照 zj4 的写法，使用 null
    isSubmitting: false,
    
    // 🔴 新增：表单错误提示相关
    showFormError: false,
    formErrorMsg: '',
    formShake: false, // 抖动动画状态
    
    // --- 列表数据 ---
    list: [],        
    displayList: [],
    
    // --- 🆕 待审核列表 ---
    pendingList: [],  // 管理员待审核的用户投稿
    
    // --- 🆕 设备选择相关 ---
    myDevices: [], // 用户已绑定的设备
    selectedSnIndex: null, // 选中的设备索引
    
    // 🔴 新增：环境检测和自定义选择器
    isSimulator: false,
    useCustomPicker: false,
    showCategoryPickerModal: false,
    categoryPickerValue: [0],
    showModelPickerModal: false,
    modelPickerValue: [0],
    showDevicePickerModal: false,
    devicePickerValue: [0],
    tempCategoryIndex: null,
    tempModelIndex: null,
    tempDeviceIndex: null,

    // 🆕 复用 my 页同款 Loading
    showLoadingAnimation: false,
    loadingText: '请稍候...'
  },

  onLoad() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('case');
    }
    
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight });
    this.ctx = wx.createCameraContext();

    // 🔴 物理防线：确保录屏、截屏出来的全是黑屏 (这是最稳的)
    if (wx.setVisualEffectOnCapture) {
      try {
      wx.setVisualEffectOnCapture({
        visualEffect: 'hidden',
          success: () => console.log('🛡️ 硬件级防偷拍锁定'),
          fail: (err) => {
            console.warn('⚠️ setVisualEffectOnCapture 失败（可能是预览模式）:', err);
          }
      });
      } catch (e) {
        console.warn('⚠️ setVisualEffectOnCapture 不支持（可能是预览模式）:', e);
      }
    } else {
      console.warn('⚠️ setVisualEffectOnCapture API 不存在（可能是预览模式）');
    }

    // 🔴 截屏监听：安卓和iOS通常都很灵敏
    try {
    wx.onUserCaptureScreen(() => {
        console.log('🛡️ [case] 检测到截屏');
      this.handleIntercept('screenshot');
    });
    } catch (e) {
      console.warn('⚠️ onUserCaptureScreen 不支持（可能是预览模式）:', e);
    }

    // 🔴 录屏监听：尽力而为，抓到信号就跳
    if (wx.onUserScreenRecord) {
      try {
      wx.onUserScreenRecord(() => {
          console.log('🛡️ [case] 检测到录屏');
        this.handleIntercept('record');
      });
      } catch (e) {
        console.warn('⚠️ onUserScreenRecord 不支持（可能是预览模式）:', e);
      }
    } else {
      console.warn('⚠️ onUserScreenRecord API 不存在（可能是预览模式）');
    }

    this.fetchCloudData();
    this.checkAdminPrivilege();
    this.loadUserDevices();
    this.detectEnvironment();
    
    setTimeout(() => { this.initTabPosition(); }, 500);
  },
  
  onShow() {
    // 针对进入页面前就在录屏的情况，尝试抓一次
    if (wx.getScreenRecordingState) {
      try {
      wx.getScreenRecordingState({
        success: (res) => {
          if (res.state === 'on' || res.recording) {
              console.log('🛡️ [case] onShow 检测到录屏');
            this.handleIntercept('record');
          }
          },
          fail: (err) => {
            console.warn('⚠️ getScreenRecordingState 失败（可能是预览模式）:', err);
        }
      });
      } catch (e) {
        console.warn('⚠️ getScreenRecordingState 不支持（可能是预览模式）:', e);
      }
    } else {
      console.warn('⚠️ getScreenRecordingState API 不存在（可能是预览模式）');
    }
  },
  
  // 🔴 新增：检测运行环境
  detectEnvironment() {
    const sysInfo = wx.getSystemInfoSync();
    // 模拟器通常 platform 是 'devtools'，或者可以通过其他方式判断
    const isSimulator = sysInfo.platform === 'devtools' || 
                        sysInfo.system.indexOf('devtools') !== -1 ||
                        !sysInfo.brand || // 模拟器可能没有品牌信息
                        sysInfo.model === 'devtools';
    
    // 🔴 检测预览模式（通过二维码扫描进入）
    // 预览模式通常没有完整的 API 支持，特别是截屏/录屏检测
    const isPreview = sysInfo.platform !== 'devtools' && 
                      !sysInfo.brand && 
                      !sysInfo.model;
    
    this.setData({ 
      isSimulator: isSimulator,
      useCustomPicker: isSimulator, // 模拟器使用自定义选择器
      isPreview: isPreview
    });
    
    console.log('🔵 [环境检测] 运行环境:', isSimulator ? '模拟器' : (isPreview ? '预览模式' : '真机'));
    
    if (isPreview) {
      console.warn('⚠️ [环境检测] 预览模式可能不支持截屏/录屏检测 API');
    }
  },

  onUnload() {
    // 清理定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  // ==========================================
  // 🆕 核心：监听屏幕滚动，控制搜索框显隐
  // ==========================================
  // 🔴 新增：处理 ScrollView 的滚动，替代原来的 onPageScroll
  handleScrollViewScroll(e) {
    const currentTop = e.detail.scrollTop;
    
    // 1. 防止负值
    if (currentTop < 0) return;

    // 2. 只有滚动距离超过一定阈值（比如 20px）才触发，防止手指微颤导致闪烁
    const diff = currentTop - this.data.lastScrollTop;
    
    if (Math.abs(diff) < 20) return;

    if (diff > 0) {
      // 向下滚动 (页面内容上移，手指上滑) -> 收起搜索框
      if (this.data.showSearchBar) {
        this.setData({ showSearchBar: false });
      }
    } else {
      // 向上滚动 (页面内容下移，手指下拉) -> 显示搜索框
      if (!this.data.showSearchBar) {
        this.setData({ showSearchBar: true });
      }
    }

    // 更新位置
    this.setData({ lastScrollTop: currentTop });
  },

  // 原来的 onPageScroll 已失效（因为 disableScroll: true），保留为空函数
  onPageScroll(e) {},

  // ==========================================
  // 1. 拉取数据
  // ==========================================
  fetchCloudData() {
    // 稍微延迟一下loading，防止动画冲突
    if(this.data.list.length === 0) getApp().showLoading({ title: '加载中...' });
    
    db.collection('video_go')
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        getApp().hideLoading();
        const cloudList = res.data.map(item => {
          return {
            _id: item._id,
            type: item.category || 'street',
            title: item.vehicleName || '无标题',
            model: item.model || '未知',
            categoryName: item.categoryName || '官方视频',
            color: this.getRandomColor(),
            videoUrl: item.videoFileID,
            coverUrl: item.coverFileID || null
          };
        });
        this.setData({ list: cloudList, displayList: cloudList });
        
        // 数据回来后再次校准滑块
        setTimeout(() => this.initTabPosition(), 200);
      })
      .catch(err => {
        getApp().hideLoading();
        console.error(err);
      });
    
    // 🆕 如果是管理员，同时加载待审核列表
    if (this.data.isAdmin) {
      this.loadPendingList();
    }
  },
  
  // 🆕 检查管理员权限
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
      }
    } catch (err) {
      console.error('[case.js] 权限检查失败', err);
    }
  },
  
  // 🆕 切换管理员模式
  toggleAdminMode() {
    if (!this.data.isAuthorized) return;
    const newState = !this.data.isAdmin;
    
    this.setData({ 
      isAdmin: newState,
      adminSubMode: 'edit' // 默认切换到编辑模式
    });
    wx.showToast({ title: newState ? '管理模式' : '浏览模式', icon: 'none' });

    // 【新增】如果是开启管理员，立刻拉取待审核视频
    if (newState) {
      this.fetchPendingVideos();
    }
  },
  
  // 🆕 切换管理员子模式
  switchAdminSubMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ adminSubMode: mode });
    wx.showToast({ 
      title: mode === 'edit' ? '视频编辑模式' : '管理现有视频模式', 
      icon: 'none' 
    });
  },

  // ==========================================
  // [新增] 管理员审核逻辑模块
  // ==========================================

  // 1. 加载用户可用设备
  loadUserDevices() {
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      db.collection('sn').where({
        openid: openid,
        isActive: true // 必须是已激活的
      }).get().then(devRes => {
        const devices = devRes.data;
        // 为每个设备添加显示用的SN（带MT前缀）
        const devicesWithDisplaySn = devices.map(device => ({
          ...device,
          displaySn: 'MT' + device.sn // 添加显示用的SN字段
        }));
        this.setData({ myDevices: devicesWithDisplaySn });
        
        // 【核心】如果只有 1 个设备，自动选中
        if (devices.length === 1) {
          this.setData({ selectedSnIndex: 0 });
        }
      });
    });
  },

  // 2. 监听设备选择
  bindSnChange(e) {
    this.setData({ selectedSnIndex: e.detail.value });
  },

  // [修改] 获取待审核视频 (修复时间显示问题)
  fetchPendingVideos() {
    db.collection('video')
      .where({ status: 0 }) 
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        // 数据清洗
        const formattedList = res.data.map(item => {
          return {
            ...item,
            // 【核心修复】把时间对象转成字符串
            displayTime: this.formatTime(item.createTime) 
          };
        });
        
        // 🆕 先把统计信息（通过/拒绝次数等）合并进每条记录，再转换视频 URL
        this.enrichPendingStats(formattedList).then((listWithStats) => {
          // 🔴 新增：转换云存储路径为临时 URL（用于预览）
          this.convertVideoUrls(listWithStats);
        });
      });
  },
  
  // 🆕 为待审核列表补充统计信息：同 SN 的通过次数/拒绝次数/总投稿次数
  // 返回 Promise<list>
  enrichPendingStats(list) {
    const sns = Array.from(new Set((list || []).map(i => i.sn).filter(Boolean)));
    if (sns.length === 0) return Promise.resolve(list);

    const tasks = sns.map(sn => {
      // 通过：status = 1；拒绝：status = -1；总投稿：全部（包含审核中/通过/拒绝）
      return Promise.all([
        db.collection('video').where({ sn, status: 1 }).count(),
        db.collection('video').where({ sn, status: -1 }).count(),
        db.collection('video').where({ sn }).count(),
      ]).then(([passRes, rejectRes, totalRes]) => {
        return {
          sn,
          passCount: passRes.total || 0,
          rejectCount: rejectRes.total || 0,
          totalCount: totalRes.total || 0,
        };
      }).catch(err => {
        console.error('❌ [enrichPendingStats] 统计失败 sn=', sn, err);
        return { sn, passCount: 0, rejectCount: 0, totalCount: 0 };
      });
    });

    return Promise.all(tasks).then(statArr => {
      const statMap = {};
      statArr.forEach(s => { statMap[s.sn] = s; });

      return (list || []).map(item => {
        const s = statMap[item.sn];
        if (!s) return item;
        return {
          ...item,
          passCount: s.passCount,
          rejectCount: s.rejectCount,
          totalCount: s.totalCount,
        };
      });
    });
  },

  // 🔴 新增：转换云存储路径为临时 URL
  convertVideoUrls(list) {
    const fileIDs = list.map(item => item.videoFileID).filter(id => id && id.startsWith('cloud://'));
    
    if (fileIDs.length === 0) {
      // 如果没有云存储路径，直接使用原数据
      this.setData({ pendingList: list });
      return;
    }
    
    // 批量获取临时 URL
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: async (res) => {
        // 创建 fileID 到 tempURL 的映射
        const urlMap = {};
        res.fileList.forEach(file => {
          urlMap[file.fileID] = file.tempFileURL;
        });
        
        // 更新列表中的视频路径（保留原始 fileID 用于下载）
        const updatedList = list.map(item => {
          if (item.videoFileID && item.videoFileID.startsWith('cloud://')) {
            return {
              ...item,
              videoFileID: urlMap[item.videoFileID] || item.videoFileID, // 用于显示/播放的临时 URL
              originalFileID: item.videoFileID // 🔴 保留原始云存储路径用于下载
            };
          }
          return item;
        });
        
        this.setData({ pendingList: updatedList });
        console.log('🔵 [视频] 已转换视频路径:', updatedList);
      },
      fail: err => {
        console.error('❌ [视频] 转换视频路径失败:', err);
        // 转换失败时使用原数据
        this.setData({ pendingList: list });
      }
    });
  },

  // [新增] 简易时间格式化工具
  formatTime(dateInput) {
    if (!dateInput) return '刚刚';
    const date = new Date(dateInput);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${m}-${d} ${h}:${min}`;
  },

  // 2. 审核通过：调用云函数处理（包含自动延保）
  approvePending(e) {
    const item = e.currentTarget.dataset.item;
    
    wx.showModal({
      title: '确认通过',
      content: '该视频将发布到公开案例列表，并自动赠送30天延保',
      success: (res) => {
        if (res.confirm) {
          getApp().showLoading({ title: '处理中...' });
          
          // 调用云函数处理审核和延保
          wx.cloud.callFunction({
            name: 'adminAuditVideo',
            data: {
              item: item,
              action: 'approve'
            }
          }).then(result => {
            this.hideMyLoading();
            if (result.result.success) {
              wx.showToast({ title: result.result.msg || '已发布', icon: 'success' });
              
              // 刷新两个列表
              this.fetchPendingVideos(); 
              this.fetchCloudData();
            } else {
              wx.showToast({ title: result.result.errMsg || '操作失败', icon: 'none' });
            }
          }).catch(err => {
            getApp().hideLoading();
            console.error('审核失败:', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          });
        }
      }
    });
  },

  // 3. 审核拒绝：调用云函数处理（需要填写拒绝理由）
  rejectPending(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.pendingList.find(i => i._id === id);
    if (!item) return;
    
    // 使用输入框让管理员填写拒绝理由
    wx.showModal({
      title: '拒绝理由',
      editable: true,
      placeholderText: '请输入拒绝理由（必填）',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          const rejectReason = res.content.trim();
          if (!rejectReason) {
            wx.showToast({ title: '请填写拒绝理由', icon: 'none' });
            return;
          }
          
          getApp().showLoading({ title: '处理中...' });
          
          // 调用云函数处理，传递拒绝理由
          wx.cloud.callFunction({
            name: 'adminAuditVideo',
            data: {
              item: item,
              action: 'reject',
              rejectReason: rejectReason // 传递拒绝理由
            }
          }).then(result => {
            getApp().hideLoading();
            if (result.result.success) {
              wx.showToast({ title: result.result.msg || '已驳回', icon: 'none' });
              this.fetchPendingVideos(); // 刷新列表
            } else {
              wx.showToast({ title: result.result.errMsg || '操作失败', icon: 'none' });
            }
          }).catch(err => {
            getApp().hideLoading();
            console.error('拒绝失败:', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          });
        }
      }
    });
  },

  // [新增] 标记为已采纳 (告诉用户视频通过了，可以领奖励了)
  markAsProcessed(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.pendingList.find(i => i._id === id);
    if (!item) return;
    
    wx.showModal({
      title: '确认采纳',
      content: '将通知用户审核通过并发放奖励，但不会直接发布此视频（需您手动打码后上传）。',
      success: (res) => {
        if (res.confirm) {
          getApp().showLoading({ title: '处理中...' });
          // 调用云函数，只改状态，不搬运数据
          // 必须是 item: { _id: ..., sn: ... } 这种结构，因为云函数里需要 item._id 和 item.sn
          wx.cloud.callFunction({
            name: 'adminAuditVideo',
            data: { 
              item: {
                _id: item._id,
                sn: item.sn // 为了能发奖励，必须传 sn
              },
              action: 'mark_pass'
            },
            success: (result) => {
              getApp().hideLoading();
              if (result.result && result.result.success) {
                wx.showToast({ title: result.result.msg || '已标记', icon: 'success' });
                this.fetchPendingVideos(); // 刷新列表
              } else {
                // 如果失败，把错误弹出来看
                wx.showModal({ 
                  title: '操作失败', 
                  content: result.result ? result.result.errMsg || '未知错误' : '返回数据异常',
                  showCancel: false
                });
              }
            },
            fail: (err) => {
              getApp().hideLoading();
              console.error('标记失败:', err);
              wx.showModal({ 
                title: '调用失败', 
                content: err.errMsg || '网络错误，请重试',
                showCancel: false
              });
            }
          });
        }
      }
    });
  },

  // [新增] 下载视频到相册
  downloadPending(e) {
    const fileID = e.currentTarget.dataset.fileid;
    if (!fileID) return;

    // 🔴 修复：获取原始 fileID（用于下载）
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.pendingList.find(i => i._id === itemId);
    const originalFileID = item?.originalFileID || fileID; // 如果有原始 fileID 则使用，否则使用传入的
    
    getApp().showLoading({ title: '下载中...', mask: true });

    // 🔴 修复：判断是云存储路径还是临时 URL
    if (originalFileID && originalFileID.startsWith('cloud://')) {
      // 云存储路径：使用 wx.cloud.downloadFile
      wx.cloud.downloadFile({
        fileID: originalFileID,
        success: async (res) => {
          this.saveVideoToAlbum(res.tempFilePath);
        },
        fail: err => {
          getApp().hideLoading();
          console.error('❌ [下载] 云存储下载失败:', err);
          wx.showToast({ title: '下载文件失败', icon: 'none' });
        }
      });
    } else if (fileID.startsWith('http://') || fileID.startsWith('https://')) {
      // 临时 URL：直接下载
      wx.downloadFile({
        url: fileID,
        success: res => {
          if (res.statusCode === 200) {
            this.saveVideoToAlbum(res.tempFilePath);
          } else {
            getApp().hideLoading();
            wx.showToast({ title: '下载失败', icon: 'none' });
          }
        },
        fail: err => {
          getApp().hideLoading();
          console.error('❌ [下载] 临时 URL 下载失败:', err);
          wx.showToast({ title: '下载文件失败', icon: 'none' });
        }
      });
    } else {
      // 其他情况：尝试作为云存储路径
      wx.cloud.downloadFile({
        fileID: originalFileID,
        success: res => {
          this.saveVideoToAlbum(res.tempFilePath);
        },
        fail: err => {
          getApp().hideLoading();
          console.error('❌ [下载] 下载失败:', err);
          wx.showToast({ title: '下载文件失败', icon: 'none' });
        }
      });
    }
  },
  
  // 🔴 新增：保存视频到相册的通用方法
  saveVideoToAlbum(tempFilePath) {
    wx.saveVideoToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        getApp().hideLoading();
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        getApp().hideLoading();
        console.error('❌ [保存] 保存到相册失败:', err);
        // 如果用户拒绝授权，提示去设置
        if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
          wx.showModal({
            title: '权限不足',
            content: '需要保存视频权限，请在设置中开启',
            confirmText: '去设置',
            success: (settingRes) => {
              if (settingRes.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: '保存失败: ' + (err.errMsg || '未知错误'), icon: 'none' });
        }
      }
    });
  },

  getRandomColor() {
    const colors = ['#E0E0E0', '#D6D6D6', '#CCCCCC', '#C2C2C2', '#B8B8B8', '#ADADAD'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // ==========================================
  // 🆕 2. 智能底部按钮 (录制 vs 上传)
  // ==========================================
  handleFabTap() {
    if (this.data.isAdmin && this.data.adminSubMode === 'edit') {
      // 管理员编辑模式：直接打开上传表单 (新增模式)
      this.setData({
        isEditing: false,
        editingId: null,
        vehicleName: '',
        categoryIndex: null, // 🔴 修复：按照 zj4 的写法，使用 null
        modelIndex: null, // 🔴 修复：按照 zj4 的写法，使用 null
        adminVideoPath: null,
        adminThumbPath: null,
        showAdminForm: true
      });
    } else {
      // 普通用户：显示选择弹窗（选择相册/录制）
      this.setData({ showUploadOptions: true });
    }
  },

  // 选择相册
  chooseVideoFromAlbum(e) {
    console.log('✅ chooseVideoFromAlbum 被调用', e);
    console.log('📱 当前设备列表:', this.data.myDevices);
    console.log('📱 设备数量:', this.data.myDevices ? this.data.myDevices.length : 0);
    
    // 🔴 致命修复：必须强行关闭录制层，防止它的 z-index 盖住表单
    this.setData({ 
      showUploadOptions: false,
      showCamera: false, // 强制关闭录制层
      cameraAnimating: false,
      isRecording: false // 确保录制状态也关闭
    });
    
    // 校验：必须先绑定设备
    if (!this.data.myDevices || this.data.myDevices.length === 0) {
      console.log('⚠️ 没有绑定设备，显示自定义弹窗');
      setTimeout(() => {
        this.showBindDeviceTip();
      }, 300);
      return;
    }

    console.log('✅ 设备检查通过，准备打开相册');
    setTimeout(() => {
      console.log('📂 调用 wx.chooseVideo');
      wx.chooseVideo({
        sourceType: ['album'],
        maxDuration: 60,
        camera: 'back',
        success: (res) => {
          console.log('✅ 选择视频成功:', res);
          // 直接打开表单，使用选择的视频
          console.log('📋 打开表单，当前数据:', {
            categoryArray: this.data.categoryArray,
            categoryArrayLength: this.data.categoryArray ? this.data.categoryArray.length : 0,
            modelArray: this.data.modelArray,
            categoryIndex: this.data.categoryIndex,
            modelIndex: this.data.modelIndex
          });
          // 🔴 调试：确保数据存在
          if (!this.data.categoryArray || this.data.categoryArray.length === 0) {
            console.error('❌ [错误] categoryArray 为空！');
            wx.showToast({ title: '数据错误：categoryArray为空', icon: 'none', duration: 3000 });
          }
          // 🔴 修复：按照 zj4 的写法，打开表单时不重置 categoryIndex 和 modelIndex
          this.setData({
            showForm: true,
            videoPath: res.tempFilePath
          });
          // 🔴 调试：延迟检查数据是否正确传递到页面
          setTimeout(() => {
            console.log('🔵 [调试] 表单已打开，检查数据:', {
              showForm: this.data.showForm,
              categoryArray: this.data.categoryArray,
              categoryIndex: this.data.categoryIndex
            });
          }, 100);
        },
        fail: (err) => {
          console.error('❌ 选择视频失败:', err);
          wx.showToast({ title: '选择失败: ' + (err.errMsg || '未知错误'), icon: 'none', duration: 3000 });
        }
      });
    }, 300);
  },

  // 选择录制
  chooseRecord(e) {
    console.log('✅ chooseRecord 被调用', e);
    console.log('📱 当前设备列表:', this.data.myDevices);
    console.log('📱 设备数量:', this.data.myDevices ? this.data.myDevices.length : 0);
    
    // 🔴 致命修复：确保关闭上传选项弹窗，避免层级冲突
    this.setData({ showUploadOptions: false });
    
    // 校验：必须先绑定设备
    if (!this.data.myDevices || this.data.myDevices.length === 0) {
      console.log('⚠️ 没有绑定设备，显示自定义弹窗');
      setTimeout(() => {
        this.showBindDeviceTip();
      }, 300);
      return;
    }
    
    // 先请求摄像头和麦克风权限
    this.requestCameraAndMicrophonePermission().then(() => {
      // 权限获取成功，延迟一下让弹窗关闭动画完成
      setTimeout(() => {
        if (typeof this.openCamera === 'function') {
          console.log('📷 权限已获取，准备调用 openCamera');
          this.openCamera();
        } else {
          console.error('❌ openCamera 方法不存在');
          wx.showToast({ title: '打开相机失败：方法不存在', icon: 'none', duration: 3000 });
        }
      }, 300);
    }).catch((err) => {
      console.error('❌ 权限获取失败:', err);
      // 权限获取失败，不打开相机
    });
  },

  // 请求摄像头和麦克风权限
  requestCameraAndMicrophonePermission() {
    return new Promise((resolve, reject) => {
      // 先检查当前权限状态
      wx.getSetting({
        success: (res) => {
          const cameraAuth = res.authSetting['scope.camera'];
          const recordAuth = res.authSetting['scope.record'];
          
          // 如果两个权限都已授权，直接resolve
          if (cameraAuth === true && recordAuth === true) {
            console.log('✅ 摄像头和麦克风权限已授权');
            resolve();
            return;
          }
          
          // 如果有权限被拒绝且不可再次请求，提示用户去设置
          if (cameraAuth === false || recordAuth === false) {
            wx.showModal({
              title: '需要权限',
              content: '录制视频需要摄像头和麦克风权限，请在设置中开启',
              confirmText: '去设置',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.camera'] && settingRes.authSetting['scope.record']) {
                        resolve();
                      } else {
                        reject(new Error('用户未开启权限'));
                      }
                    },
                    fail: () => {
                      reject(new Error('打开设置失败'));
                    }
                  });
                } else {
                  reject(new Error('用户取消授权'));
                }
              }
            });
            return;
          }
          
          // 请求摄像头权限
          const requestCamera = () => {
            return new Promise((resolveCam, rejectCam) => {
              if (cameraAuth === true) {
                resolveCam();
                return;
              }
              wx.authorize({
                scope: 'scope.camera',
                success: () => {
                  console.log('✅ 摄像头权限授权成功');
                  resolveCam();
                },
                fail: (err) => {
                  console.error('❌ 摄像头权限授权失败:', err);
                  rejectCam(err);
                }
              });
            });
          };
          
          // 请求麦克风权限
          const requestRecord = () => {
            return new Promise((resolveRec, rejectRec) => {
              if (recordAuth === true) {
                resolveRec();
                return;
              }
              wx.authorize({
                scope: 'scope.record',
                success: () => {
                  console.log('✅ 麦克风权限授权成功');
                  resolveRec();
                },
                fail: (err) => {
                  console.error('❌ 麦克风权限授权失败:', err);
                  rejectRec(err);
                }
              });
            });
          };
          
          // 依次请求两个权限
          requestCamera().then(() => {
            return requestRecord();
          }).then(() => {
            resolve();
          }).catch((err) => {
            reject(err);
          });
        },
        fail: (err) => {
          console.error('❌ 获取权限设置失败:', err);
          reject(err);
        }
      });
    });
  },

  // 关闭上传选项弹窗
  closeUploadOptions() {
    this.setData({ showUploadOptions: false });
  },

  // 显示绑定设备提示弹窗
  showBindDeviceTip() {
    this.setData({ showBindDeviceTip: true });
  },

  // 关闭绑定设备提示弹窗
  closeBindDeviceTip() {
    this.setData({ showBindDeviceTip: false });
  },

  // 跳转到绑定设备页面
  goToBindDevice() {
    this.setData({ showBindDeviceTip: false });
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/my/my' });
    }, 300);
  },

  // 阻止事件冒泡
  preventBubble(e) {
    // 阻止事件冒泡到遮罩层
    if (e) {
      e.stopPropagation && e.stopPropagation();
    }
  },

  // ==========================================
  // 🆕 3. 智能卡片点击 (播放 vs 编辑)
  // ==========================================
  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    const targetItem = this.data.displayList.find(item => item._id === id);

    if (this.data.isAdmin && this.data.adminSubMode === 'edit') {
      // 🔧 管理员编辑模式：进入编辑
      this.editCase(targetItem);
    } else {
      // ▶️ 普通模式或管理现有视频模式：播放视频
      if (targetItem && targetItem.videoUrl) {
        this.setData({ currentVideo: targetItem, showVideoPlayer: true });
      } else {
        wx.showToast({ title: '暂无视频资源', icon: 'none' });
      }
    }
  },
  
  // 🆕 编辑图标点击事件（阻止冒泡，直接进入编辑）
  onEditIconTap(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    const targetItem = this.data.displayList.find(item => item._id === id);
    if (targetItem) {
      this.editCase(targetItem);
    }
  },

  // 编辑逻辑：回显数据
  editCase(item) {
    // 反查分类和型号的索引
    const catIdx = this.data.categoryValueArray.indexOf(item.type);
    const modIdx = this.data.modelArray.indexOf(item.model);

    this.setData({
      isEditing: true,
      editingId: item._id,
      showAdminForm: true,
      vehicleName: item.title,
      categoryIndex: catIdx >= 0 ? catIdx : null, // 🔴 修复：按照 zj4 的写法，找不到时使用 null
      modelIndex: modIdx >= 0 ? modIdx : null, // 🔴 修复：按照 zj4 的写法，找不到时使用 null
      adminVideoPath: item.videoUrl, // 回显现有视频
      adminThumbPath: item.coverUrl  // 回显现有封面
    });
  },

  // ==========================================
  // 1. 切换 Tab (修复：使用 SelectorQuery 获取准确坐标)
  // ==========================================
  switchTab(e) {
    const type = e.currentTarget.dataset.type;
    console.log('🔵 [调试] switchTab 被调用，type:', type);
    
    // 先更新数据，让界面立刻响应
    let baseList = this.data.list;
    if (type !== 'all') {
      baseList = baseList.filter(item => item.type === type);
    }

    this.setData({ 
      currentTab: type,
      displayList: baseList, 
      showSearchBar: true,   
      searchText: '',        
      searchTip: ''          
    });

    // 🔴 核心修复：使用小程序专用 API 获取位置
    // 小程序不支持属性选择器，需要查询所有 tab-item 然后找到对应的
    const tabTypes = ['all', 'street', 'sport', 'scooter', 'cruise', 'ebike', 'bicycle'];
    const targetIndex = tabTypes.indexOf(type);
    
    if (targetIndex === -1) {
      console.error('❌ [错误] 找不到对应的 type:', type);
      return;
    }
    
    const query = wx.createSelectorQuery();
    query.selectAll('.tab-item').boundingClientRect(); // 获取所有按钮
    query.select('.tab-list').boundingClientRect(); // 获取父容器
    
    query.exec(res => {
      console.log('🔵 [调试] query.exec 返回结果:', res);
      const allTabs = res[0]; // 所有按钮位置数组
      const containerRect = res[1]; // 父容器位置
      
      console.log('🔵 [调试] allTabs (所有按钮):', allTabs);
      console.log('🔵 [调试] containerRect (容器):', containerRect);
      console.log('🔵 [调试] targetIndex:', targetIndex);
      
      if (allTabs && allTabs.length > targetIndex && containerRect) {
        const targetRect = allTabs[targetIndex]; // 找到对应的按钮
        
        console.log('🔵 [调试] targetRect (目标按钮):', targetRect);
        
        // 算出相对距离，这样无论怎么滚动，位置都是准的
        const relativeLeft = targetRect.left - containerRect.left;
        const finalLeft = relativeLeft - 10;
        const finalWidth = targetRect.width + 20;
        
        console.log('🔵 [调试] 计算结果:');
        console.log('  - targetRect.left:', targetRect.left);
        console.log('  - containerRect.left:', containerRect.left);
        console.log('  - relativeLeft:', relativeLeft);
        console.log('  - finalLeft (sliderLeft):', finalLeft);
        console.log('  - targetRect.width:', targetRect.width);
        console.log('  - finalWidth (sliderWidth):', finalWidth);
        
        this.setData({
          sliderLeft: finalLeft, // 左边往外扩 10px
          sliderWidth: finalWidth // 宽度加 20px
        });
        
        console.log('🔵 [调试] setData 完成，sliderLeft:', finalLeft, 'sliderWidth:', finalWidth);
      } else {
        console.error('❌ [错误] 找不到目标按钮或容器！');
        console.error('  - allTabs:', allTabs);
        console.error('  - allTabs.length:', allTabs ? allTabs.length : 0);
        console.error('  - targetIndex:', targetIndex);
        console.error('  - containerRect:', containerRect);
      }
    });
  },

  // ==========================================
  // 2. 初始化定位 (修复：逻辑同上)
  // ==========================================
  initTabPosition() {
    console.log('🔵 [调试] initTabPosition 被调用');
    const query = wx.createSelectorQuery();
    query.select('.tab-item.active').boundingClientRect();
    query.select('.tab-list').boundingClientRect();
    
    query.exec(res => {
      console.log('🔵 [调试] initTabPosition query.exec 返回结果:', res);
      if (res[0] && res[1]) {
        const relativeLeft = res[0].left - res[1].left;
        const finalLeft = relativeLeft - 10;
        const finalWidth = res[0].width + 20;
        
        console.log('🔵 [调试] initTabPosition 计算结果:');
        console.log('  - res[0].left (按钮):', res[0].left);
        console.log('  - res[1].left (容器):', res[1].left);
        console.log('  - relativeLeft:', relativeLeft);
        console.log('  - finalLeft (sliderLeft):', finalLeft);
        console.log('  - res[0].width:', res[0].width);
        console.log('  - finalWidth (sliderWidth):', finalWidth);
        
        this.setData({
          sliderLeft: finalLeft, 
          sliderWidth: finalWidth
        });
        
        console.log('🔵 [调试] initTabPosition setData 完成');
      } else {
        console.error('❌ [错误] initTabPosition: res[0] 或 res[1] 为空！');
        console.error('  - res[0]:', res[0]);
        console.error('  - res[1]:', res[1]);
      }
    });
  },

  onSearchInput(e) {
    const val = e.detail.value;
    this.setData({ searchText: val, searchTip: '' });

    const type = this.data.currentTab;
    let currentPool = this.data.list;
    if (type !== 'all') {
      currentPool = currentPool.filter(item => item.type === type);
    }

    if (!val) {
      this.setData({ displayList: currentPool });
      return;
    }

    const matched = [];
    const unmatched = [];

    currentPool.forEach(item => {
      // 模糊匹配
      if (item.title.toLowerCase().includes(val.toLowerCase()) || 
          item.model.toLowerCase().includes(val.toLowerCase())) {
        matched.push(item);
      } else {
        unmatched.push(item);
      }
    });

    if (matched.length > 0) {
      // 将匹配项置顶，未匹配项沉底
      const sortedList = [...matched, ...unmatched];
      // 只要数据源变了，配合 wx:key 和 CSS 动画，就会有位移效果
      this.setData({ displayList: sortedList });
    } else {
      this.setData({ searchTip: '暂无客户上传' });
    }
  },

  // ==========================================
  // 5. 提交表单 (兼容 新增 & 修改)
  // ==========================================
  submitAdminForm() {
    const { vehicleName, categoryIndex, modelIndex, adminVideoPath, adminThumbPath, categoryValueArray, categoryArray, modelArray, isEditing, editingId } = this.data;

    if (!adminVideoPath) return wx.showToast({ title: '请选择视频', icon: 'none' });
    // 编辑模式下可以不改封面，新增模式必须有封面
    if (!isEditing && !adminThumbPath) return wx.showToast({ title: '请选择封面图', icon: 'none' });
    if (!vehicleName) return wx.showToast({ title: '请填写车型', icon: 'none' });
    // 🔴 修复：按照 zj4 的写法，只检查是否为 null
    if (categoryIndex === null) return wx.showToast({ title: '请选分类', icon: 'none' });
    if (modelIndex === null) return wx.showToast({ title: '请选型号', icon: 'none' });

    this.setData({ isSubmitting: true });
    getApp().showLoading({ title: isEditing ? '修改中...' : '上传中...', mask: true });

    // 如果是网络图片(回显的)，不需要重新上传；如果是临时文件(新选的)，需要上传
    const isNewVideo = adminVideoPath.startsWith('wxfile') || adminVideoPath.startsWith('http://tmp');
    const isNewCover = adminThumbPath && (adminThumbPath.startsWith('wxfile') || adminThumbPath.startsWith('http://tmp'));

    const timestamp = Date.now();
    const uploadTasks = [];
    
    // 任务1：视频
    if (isNewVideo) {
      uploadTasks.push(wx.cloud.uploadFile({ cloudPath: `video_go/${timestamp}_video.mp4`, filePath: adminVideoPath }));
    } else {
      uploadTasks.push(Promise.resolve({ fileID: adminVideoPath })); // 保持原ID
    }

    // 任务2：封面
    if (isNewCover) {
      uploadTasks.push(wx.cloud.uploadFile({ cloudPath: `video_go/${timestamp}_cover.jpg`, filePath: adminThumbPath }));
    } else {
      uploadTasks.push(Promise.resolve({ fileID: adminThumbPath })); // 保持原ID或null
    }

    Promise.all(uploadTasks).then(results => {
      const videoID = results[0].fileID;
      const coverID = results[1] ? results[1].fileID : null;

      const docData = {
        vehicleName: vehicleName,
        category: categoryValueArray[categoryIndex],
        categoryName: categoryArray[categoryIndex],
        model: modelArray[modelIndex],
        videoFileID: videoID,
        coverFileID: coverID,
        type: 'admin_upload',
        // 🆕 管理员后台发布/编辑也打上次数标记：用于后台区分“第几次发布/编辑记录”
        // 这里的次数是按管理员(openid)维度统计 video_go 的 admin_upload 记录数
        // （如果你想统计“某个用户投稿被采纳后管理员发布”的次数，需要另加 userOpenid/userId 维度字段）
        // 如果是新增，加时间；如果是修改，更新时间可选
        ...(isEditing ? { updateTime: db.serverDate() } : { createTime: db.serverDate() })
      };

      if (isEditing) {
        // --- 修改逻辑 ---
        db.collection('video_go').doc(editingId).update({ data: docData })
          .then(() => {
             this.finishSubmit('修改成功');
          });
      } else {
        // --- 新增逻辑 ---
        // 🆕 记录管理员在 video_go 发布次数（后台可见）
        // 注意：这里统计的是“管理员发布官方案例”的次数，不等同于“用户投稿次数”
        wx.cloud.callFunction({ name: 'login' }).then(async (loginRes) => {
          const openid = loginRes.result.openid;
          const countRes = await db.collection('video_go').where({ _openid: openid, type: 'admin_upload' }).count();
          const applyCount = (countRes.total || 0) + 1;

          db.collection('video_go').add({ data: { ...docData, applyCount } })
            .then(() => {
               this.finishSubmit('发布成功');
            });
        }).catch(err => {
          console.error('❌ [admin] 获取 openid / 统计次数失败:', err);
          // 兜底：即使统计失败也允许发布
          db.collection('video_go').add({ data: docData })
            .then(() => {
              this.finishSubmit('发布成功');
            });
        });
      }
    }).catch(err => {
      console.error(err);
      getApp().hideLoading();
      this.setData({ isSubmitting: false });
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  finishSubmit(msg) {
    getApp().hideLoading();
    wx.showToast({ title: msg, icon: 'success' });
    this.setData({ 
      isSubmitting: false, showAdminForm: false, 
      adminVideoPath: null, adminThumbPath: null,
      vehicleName: '', categoryIndex: null, modelIndex: null, // 🔴 修复：按照 zj4 的写法，重置为 null
      isEditing: false, editingId: null
    });
    this.fetchCloudData();
  },

  // ==========================================
  // 6. 录制相关
  // ==========================================
  // 阻止录制页面滑动
  preventScroll() {
    return false;
  },

  openCamera() { 
    // 校验：必须先绑定设备
    if (this.data.myDevices.length === 0) {
      wx.showModal({
        title: '无法上传',
        content: '您尚未绑定任何 MT 设备，无法参与延保活动。请先去"我的"页面绑定设备。',
        confirmText: '去绑定',
        success: (res) => {
          if(res.confirm) {
             wx.navigateTo({ url: '/pages/my/my' }); // 跳转去绑定
          }
        }
      });
      return;
    }
    
    // 1. 🔴 优化：先设置显示状态
    this.setData({ 
      showCamera: true, 
      cameraAnimating: true, // 标记为动画初始状态
      showPrivacyTip: true 
    }); 
    
    // 2. 🔴 优化：使用更短的延迟，减少卡顿感
    // 使用 wx.nextTick 确保在下一帧渲染（如果支持），否则用短延迟
    if (typeof wx.nextTick === 'function') {
      wx.nextTick(() => {
        this.setData({ cameraAnimating: false }); // 触发弹出动画
      });
    } else {
      setTimeout(() => {
        this.setData({ cameraAnimating: false }); // 触发弹出动画
      }, 16); // 约一帧的时间
    }
    
    // 3. 隐私提示显示 4 秒后自动消失
    setTimeout(() => {
      this.setData({ showPrivacyTip: false });
    }, 4000);
  },
  closeCamera() { 
    // 🔴 优化：立即隐藏所有组件，不等待动画
    this.setData({ 
      showPrivacyTip: false,
      isRecording: false, // 立即停止录制状态，让组件快速退场
      recTimeStr: "00:00"
    });
    
    if(this.data.isRecording) {
      // 🔴 如果正在录制，先停止录制
      this.stopRecordLogic(false); 
      // 🔴 优化：缩短延迟，快速关闭
      setTimeout(() => {
        this.setData({ 
          cameraAnimating: true, // 开始关闭动画（缩回按钮）
        });
        setTimeout(() => {
          this.setData({ showCamera: false, cameraAnimating: false });
        }, 200); // 🔴 优化：进一步缩短到 200ms
      }, 30); // 🔴 优化：缩短到 30ms
    } else {
      // 🔴 优化：直接触发关闭动画，立即隐藏组件
      this.setData({ cameraAnimating: true });
      setTimeout(() => {
        this.setData({ 
          showCamera: false, 
          cameraAnimating: false 
        }); 
      }, 200); // 🔴 优化：进一步缩短到 200ms
    }
  },
  toggleRecord() { 
    // 🔴 防止重复点击
    if (this.data.isStopping) {
      console.log('⚠️ 正在停止录制，请稍候...');
      return;
    }
    
    if(this.data.isRecording) {
      // 停止录制
      this.stopRecordLogic(true); 
    } else {
      // 🆕 仅仅震动反馈，去掉 Loading，让 UI 动画接管视觉反馈
      wx.vibrateShort();
      this.startRecordLogic(); 
    }
  },
  startRecordLogic() { 
    // 这里的 startRecord 不需要改动太多，只要确保不调用 getApp().hideLoading 即可
    this.ctx.startRecord({ 
      timeoutCallback: { duration: 60 },
      success:()=>{
        // 录制状态改变，WXML 里的 class 会自动变化，触发 CSS 动画
        this.setData({isRecording: true, recTimeStr: "00:00"});
        this.startTime = Date.now();
        
        if(this.data.timer) clearInterval(this.data.timer);
        let seconds = 0;
        this.data.timer = setInterval(() => {
          seconds++;
          const min = Math.floor(seconds / 60).toString().padStart(2, '0');
          const sec = (seconds % 60).toString().padStart(2, '0');
          this.setData({ recTimeStr: `${min}:${sec}` });
        }, 1000);
      },
      fail: (err) => {
        console.error('录制失败', err);
        wx.showToast({ title: '录制启动失败', icon: 'none' });
        this.setData({ isRecording: false });
      }
    }); 
  },
  stopRecordLogic(save) { 
    if (!this.data.isRecording) {
      console.log('⚠️ [警告] 当前未在录制，无需停止');
      return;
    }
    
    // 🔴 设置停止标志，防止重复点击
    this.setData({ isStopping: true });
    
    // 🔴 添加震动反馈
    wx.vibrateShort();
    
    // 🔴 确保 ctx 存在
    if (!this.ctx) {
      console.error('❌ camera context 不存在');
      this.setData({ 
        isRecording: false, 
        isStopping: false 
      });
      return;
    }
    
    console.log('🔄 开始停止录制...');
    
    this.ctx.stopRecord({ 
      success:(res)=>{
        console.log('✅ 录制结束，返回结果:', res);
        
        // 1. 先清除计时器
        if (this.data.timer) {
          clearInterval(this.data.timer);
          this.setData({ timer: null });
        }

        // 2. 🔴 关键一步：先只改变 UI 状态，让方块变回圆形
        // 设置 isRecording 为 false，WXML 里的 class 会移除 'recording'，触发 CSS 动画
        this.setData({
          isRecording: false, 
          recTimeStr: "00:00",
          isStopping: false // 🔴 重置停止标志
        }); 

        // 3. 🔴 延迟跳转：给动画留出时间 (500ms > CSS transition 0.4s)
        setTimeout(() => {
            if(save && res.tempVideoPath) {
              // 🔴 致命修复：必须彻底关闭相机层，防止 z-index 遮挡表单
              this.setData({
                showCamera: false, 
                cameraAnimating: false, // 确保动画状态也关闭
                showForm: true, 
                videoPath: res.tempVideoPath
                // 🔴 修复：按照 zj4 的写法，不重置 categoryIndex 和 modelIndex
              }); 
            } else if (save) {
              wx.showToast({ title: '录制无效', icon: 'none' });
            }
        }, 250); // 🔴 优化：从 500ms 缩短到 250ms，加快响应
      },
      fail: (err) => {
        console.error('❌ 停止失败', err);
        // 🔴 失败时也要重置状态
        this.setData({
          isRecording: false,
          isStopping: false
        });
        wx.showToast({ title: '停止录制失败', icon: 'none' });
      }
    }); 
  },
  
  // 🔴 新增：关闭表单错误提示
  closeFormError() {
    this.setData({ showFormError: false, formErrorMsg: '' });
  },
  
  // 🔴 新增：显示表单错误提示并触发抖动
  showFormErrorWithShake(msg) {
    // 先触发抖动动画
    this.setData({ formShake: true });
    // 抖动动画结束后显示错误提示
    setTimeout(() => {
      this.setData({ 
        formShake: false,
        showFormError: true,
        formErrorMsg: msg
      });
    }, 300); // 抖动动画时长
  },
  
  async submitForm() {
    console.log('🔵 [提交] submitForm 被调用');
    const { vehicleName, categoryIndex, modelIndex, videoPath, categoryValueArray, categoryArray, modelArray, myDevices, selectedSnIndex } = this.data;
    
    console.log('🔵 [提交] 当前数据:', {
      vehicleName,
      categoryIndex,
      modelIndex,
      videoPath: videoPath ? '存在' : '不存在',
      selectedSnIndex,
      myDevicesLength: myDevices ? myDevices.length : 0
    });
    
    // 🔴 修复：防止重复提交
    if (this.data.isSubmitting) {
      console.log('⚠️ [提交] 正在提交中，忽略重复点击');
      return;
    }
    
    // 🔴 修复：使用自定义提示框，并触发抖动
    if (!videoPath) {
      console.error('❌ [提交] 视频丢失');
      this.showFormErrorWithShake('请先选择或录制视频');
      return;
    }
    if (!vehicleName || vehicleName.trim() === '') {
      console.error('❌ [提交] 未填写车型');
      this.showFormErrorWithShake('请填写车型信息');
      return;
    }
    if (categoryIndex === null || categoryIndex === undefined) {
      console.error('❌ [提交] 未选择分类');
      this.showFormErrorWithShake('请选择车型分类');
      return;
    }
    if (modelIndex === null || modelIndex === undefined) {
      console.error('❌ [提交] 未选择型号');
      this.showFormErrorWithShake('请选择产品型号');
      return;
    }
    if (selectedSnIndex === null || selectedSnIndex === undefined) {
      console.error('❌ [提交] 未选择设备');
      this.showFormErrorWithShake('请选择关联设备');
      return;
    }
    if (!myDevices || !myDevices[selectedSnIndex]) {
      console.error('❌ [提交] 设备数据异常');
      this.showFormErrorWithShake('设备数据异常，请重新选择');
      return;
    }
    
    const targetSn = myDevices[selectedSnIndex].sn; // 获取选中的 SN
    console.log('🔵 [提交] 准备提交，targetSn:', targetSn);
    
    // 🔴 修复：防止重复提交
    if (this.data.isSubmitting) {
      console.log('⚠️ [提交] 正在提交中，忽略重复点击');
      return;
    }
    
    this.setData({ isSubmitting: true });
    this.showMyLoading('上传中...');
    const cloudPath = `video/${Date.now()}_user.mp4`;
    
    console.log('🔵 [提交] 开始上传视频，cloudPath:', cloudPath);
    wx.cloud.uploadFile({
      cloudPath: cloudPath, 
      filePath: videoPath,
      success: async (res) => {
        console.log('🔵 [提交] 视频上传成功，fileID:', res.fileID);
        // 🆕 记录用户投稿次数：每次提交自增 1（管理员后台可见）
        // 方案：先查询该 openid 历史投稿次数 count，再写入本次的 applyCount = count + 1
        // 注意：这里用云函数 login 获取 openid（与项目现有逻辑保持一致）
        // 🆕 按设备 SN 统计投稿次数（口径A：只按 sn 计数）
        // 同一个 sn 无论哪个用户投稿，次数都累加
        // 只统计“仍存在的投稿记录”。用户在 my 页撤销会直接 remove 掉记录，因此天然不计入。
        // 为了避免把旧的已删除记录算进去，这里按 sn 维度 count 当前集合中仍存在的记录即可。
        const countRes = await db.collection('video').where({ sn: targetSn }).count();
        const applyCount = (countRes.total || 0) + 1;

        const submitData = {
          vehicleName, 
          category: categoryValueArray[categoryIndex], 
          categoryName: categoryArray[categoryIndex], 
          model: modelArray[modelIndex], 
          videoFileID: res.fileID, 
          createTime: db.serverDate(), 
          status: 0, // 0:审核中
          sn: targetSn, // 【新增】关联 SN
          applyCount: applyCount // 🆕 第几次申请/投稿
        };
        console.log('🔵 [提交] 准备写入数据库，data:', submitData);
        
        db.collection('video').add({
          data: submitData,
          success: (dbRes) => {
            console.log('🔵 [提交] 数据库写入成功，_id:', dbRes._id);
            this.hideMyLoading(); 
            this.setData({ 
              isSubmitting: false, 
              showForm: false, 
              showSuccess: true, 
              videoPath: null 
            }); 
          },
          fail: (dbErr) => {
            console.error('❌ [提交] 数据库写入失败:', dbErr);
            getApp().hideLoading();
            this.setData({ isSubmitting: false });
            wx.showToast({ title: '提交失败: ' + (dbErr.errMsg || '未知错误'), icon: 'none', duration: 3000 });
          }
        });
      },
      fail: (uploadErr) => {
        console.error('❌ [提交] 视频上传失败:', uploadErr);
        getApp().hideLoading();
        this.setData({ isSubmitting: false });
        wx.showToast({ title: '上传失败: ' + (uploadErr.errMsg || '未知错误'), icon: 'none', duration: 3000 });
      }
    });
  },

  // 🆕 关闭用户表单
  closeForm() {
    this.setData({
      showForm: false,
      videoPath: null, // 清空临时视频路径
      // 清空表单数据（可选）
      vehicleName: '',
      categoryIndex: null, // 🔴 修复：按照 zj4 的写法，重置为 null
      modelIndex: null // 🔴 修复：按照 zj4 的写法，重置为 null
    });
  },

  deleteCase(e) {
     const id = e.currentTarget.dataset.id;
     wx.showModal({ title:'确认删除', content:'不可恢复', confirmColor:'#FF3B30', success:(res)=>{
       if(res.confirm) { db.collection('video_go').doc(id).remove().then(()=>{ this.fetchCloudData(); wx.showToast({title:'已删除'}); }); }
     }});
  },
  
  // 选视频/封面
  chooseAdminVideo() {
    wx.chooseMedia({ count:1, mediaType:['video'], sourceType:['album'], success:(res)=>{
       const t = res.tempFiles[0]; this.setData({ adminVideoPath: t.tempFilePath, adminThumbPath: t.thumbTempFilePath || this.data.adminThumbPath });
    }});
  },
  chooseAdminCover() {
    wx.chooseMedia({ count:1, mediaType:['image'], sourceType:['album'], success:(res)=>{ this.setData({ adminThumbPath: res.tempFiles[0].tempFilePath }); }});
  },

  // 基础交互
  handleTitleTap() {
    // 废弃旧逻辑，不再使用
  },
  closeVideoPlayer() { 
    this.setData({ showVideoPlayer: false, currentVideo: null });
  },
  
  // 🔴 新增：视频播放器手势控制（下拉关闭）
  videoTouchStartY: 0,
  videoTouchMoveY: 0,
  videoIsDragging: false,
  
  onVideoTouchStart(e) {
    this.videoTouchStartY = e.touches[0].clientY;
    this.videoTouchMoveY = 0;
    this.videoIsDragging = false;
  },
  
  onVideoTouchMove(e) {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.videoTouchStartY;
    
    // 只处理向下滑动
    if (deltaY > 0) {
      this.videoTouchMoveY = deltaY;
      this.videoIsDragging = true;
    }
  },
  
  onVideoTouchEnd(e) {
    // 如果向下滑动超过 100px（约 200rpx），则关闭视频
    // 使用 px 单位，因为 touch 事件返回的是 px
    if (this.videoIsDragging && this.videoTouchMoveY > 100) {
      this.closeVideoPlayer();
    }
    
    // 重置状态
    this.videoTouchStartY = 0;
    this.videoTouchMoveY = 0;
    this.videoIsDragging = false;
  },
  
  goBack() { wx.navigateBack(); },
  closeAdminForm() { 
    this.setData({ 
      showAdminForm: false, 
      adminVideoPath: null, 
      adminThumbPath: null, 
      isEditing: false,
      // 🔴 关闭所有选择器弹窗
      showCategoryPickerModal: false,
      showModelPickerModal: false
    }); 
  },
  closeIntro() { this.setData({ showIntro: false }); },
  closeSuccess() { this.setData({ showSuccess: false }); },
  onInputVehicle(e) { this.setData({ vehicleName: e.detail.value }); },
  
  // 🔴 调试：测试 picker 点击
  testPickerClick() {
    console.log('🔵 [测试] 测试按钮被点击');
    console.log('🔵 [测试] categoryArray:', this.data.categoryArray);
    console.log('🔵 [测试] categoryIndex:', this.data.categoryIndex);
    
    // 尝试手动触发 picker
    wx.showActionSheet({
      itemList: this.data.categoryArray,
      success: (res) => {
        this.setData({ categoryIndex: res.tapIndex });
        console.log('🔵 [测试] 通过 ActionSheet 选择了:', res.tapIndex);
      }
    });
  },
  
  bindCategoryChange(e) { 
    if (e && e.detail && e.detail.value !== undefined) {
      const val = parseInt(e.detail.value);
      this.setData({ categoryIndex: val });
    }
  },
  
  bindPickerChange(e) { 
    if (e && e.detail && e.detail.value !== undefined) {
      const val = parseInt(e.detail.value);
      this.setData({ modelIndex: val });
    }
  },
  
  // 🔴 新增：模拟器使用的自定义选择器方法
  showCategoryPicker() {
    if (!this.data.useCustomPicker) return; // 真机使用原生 picker
    const currentIndex = this.data.categoryIndex !== null ? this.data.categoryIndex : 0;
    this.setData({
      showCategoryPickerModal: true,
      categoryPickerValue: [currentIndex],
      tempCategoryIndex: this.data.categoryIndex !== null ? this.data.categoryIndex : 0
    });
  },
  closeCategoryPicker() {
    this.setData({ showCategoryPickerModal: false });
  },
  onCategoryPickerChange(e) {
    const index = e.detail.value[0];
    this.setData({ tempCategoryIndex: index });
  },
  confirmCategoryPicker() {
    this.setData({
      categoryIndex: this.data.tempCategoryIndex,
      showCategoryPickerModal: false
    });
  },
  
  showModelPicker() {
    if (!this.data.useCustomPicker) return;
    const currentIndex = this.data.modelIndex !== null ? this.data.modelIndex : 0;
    this.setData({
      showModelPickerModal: true,
      modelPickerValue: [currentIndex],
      tempModelIndex: this.data.modelIndex !== null ? this.data.modelIndex : 0
    });
  },
  closeModelPicker() {
    this.setData({ showModelPickerModal: false });
  },
  onModelPickerChange(e) {
    const index = e.detail.value[0];
    this.setData({ tempModelIndex: index });
  },
  confirmModelPicker() {
    this.setData({
      modelIndex: this.data.tempModelIndex,
      showModelPickerModal: false
    });
  },
  
  showDevicePicker() {
    if (!this.data.useCustomPicker) return;
    if (!this.data.myDevices || this.data.myDevices.length === 0) {
      wx.showToast({ title: '暂无设备，请先绑定设备', icon: 'none' });
      return;
    }
    const currentIndex = this.data.selectedSnIndex !== null ? this.data.selectedSnIndex : 0;
    this.setData({
      showDevicePickerModal: true,
      devicePickerValue: [currentIndex],
      tempDeviceIndex: this.data.selectedSnIndex !== null ? this.data.selectedSnIndex : 0
    });
  },
  closeDevicePicker() {
    this.setData({ showDevicePickerModal: false });
  },
  onDevicePickerChange(e) {
    const index = e.detail.value[0];
    this.setData({ tempDeviceIndex: index });
  },
  confirmDevicePicker() {
    this.setData({
      selectedSnIndex: this.data.tempDeviceIndex,
      showDevicePickerModal: false
    });
  },
  // ==========================
  // 🆕 本页自定义 Loading（复用 my 页样式）
  // ==========================
  showMyLoading(title = '上传中...') {
    this._loadingStartTs = Date.now();
    this.setData({ showLoadingAnimation: true, loadingText: title });
  },

  hideMyLoading() {
    const minShowMs = 600; // case 页不需要像 my 页那样 2s，避免拖沓
    const start = this._loadingStartTs || 0;
    const elapsed = start ? (Date.now() - start) : minShowMs;
    const wait = Math.max(0, minShowMs - elapsed);

    if (this._loadingHideTimer) {
      clearTimeout(this._loadingHideTimer);
      this._loadingHideTimer = null;
    }

    this._loadingHideTimer = setTimeout(() => {
      this.setData({ showLoadingAnimation: false });
      this._loadingStartTs = 0;
    }, wait);
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
      const { reverseGeocodeWithRetry } = require('../../utils/reverseGeocode.js');
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
      console.error('[case] 获取位置信息失败:', err);
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

  async handleIntercept(type) {
    // 1. 停止视频播放
    this.setData({ showVideoPlayer: false, currentVideo: null });
    
    // 🔴 关键修复：立即清除本地授权状态，防止第二次截屏时被自动放行
    wx.removeStorageSync('has_permanent_auth');
    
    // 2. 标记封禁（本地存储）
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }

    console.log('[case] 🔴 截屏/录屏检测，立即设置封禁状态');
    
    // 🔴 关键修复：立即调用云函数设置 isBanned = true，不等待位置信息
    try {
      const sysInfo = wx.getSystemInfoSync();
      const immediateRes = await wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'case',
          deviceInfo: sysInfo.system || '',
          phoneModel: sysInfo.model || ''
        }
      });
      console.log('[case] ✅ 立即设置封禁状态成功:', immediateRes);
    } catch (err) {
      console.error('[case] ⚠️ 立即设置封禁状态失败:', err);
    }

    // 🔴 跳转到封禁页面
    console.log('[case] 🔴 跳转到封禁页');
    this._jumpToBlocked(type);

    // 🔴 异步补充位置信息（不阻塞，可选）
    this._getLocationAndDeviceInfo().then(locationData => {
      wx.cloud.callFunction({
        name: 'banUserByScreenshot',
        data: {
          type: type,
          banPage: 'case',
          ...locationData
        },
        success: (res) => {
          console.log('[case] 补充位置信息成功，类型:', type, '结果:', res);
        },
        fail: (err) => {
          console.error('[case] 补充位置信息失败:', err);
        }
      });
    }).catch(() => {
      console.log('[case] 位置信息获取失败，但封禁状态已设置');
    });
  },

  _jumpToBlocked(type) {
    // 🔴 防止重复跳转
    const app = getApp();
    if (app.globalData._isJumpingToBlocked) {
      console.log('[case] 正在跳转中，忽略重复跳转请求');
      return;
    }

    // 检查当前页面是否已经是 blocked 页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/blocked/blocked') {
      console.log('[case] 已在 blocked 页面，无需重复跳转');
      return;
    }

    app.globalData._isJumpingToBlocked = true;

    // 强制跳转拦截页
    wx.reLaunch({
      url: `/pages/blocked/blocked?type=${type}`,
      success: () => {
        console.log('[case] 跳转到 blocked 页面成功');
        // 2秒后重置标志，防止卡死
        setTimeout(() => {
          app.globalData._isJumpingToBlocked = false;
        }, 2000);
      },
      fail: (err) => {
        console.error('[case] 跳转失败:', err);
        app.globalData._isJumpingToBlocked = false;
        // 路径万一错了，直接退出
        wx.exitMiniProgram();
      }
    });
  },
  
});
