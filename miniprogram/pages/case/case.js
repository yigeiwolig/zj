const app = getApp();
const db = wx.cloud.database();
var QQMapWX = require('../../utils/qqmap-wx-jssdk.js'); 
var qqmapsdk = new QQMapWX({
    key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z' // 你的Key
});

// 🔴 静默发送调试日志（不显示错误）
function silentAgentLog(data) {
  try {
    wx.request({
      url: 'http://127.0.0.1:7242/ingest/ebc7221d-3ad9-48f7-9010-43ee39582cf8',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: data,
      fail: () => {}, // 静默失败，不输出错误
      complete: () => {} // 静默完成
    });
  } catch (e) {
    // 静默捕获所有错误
  }
}

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
    introClosing: false, // 介绍弹窗退出动画中
    showCamera: false,
    showForm: false,
    formClosing: false, // 表单弹窗退出动画中
    showSuccess: false,
    showUploadOptions: false, // 显示上传选项弹窗（选择相册/录制）
    showVideoPreview: false, // 🔴 显示视频预览弹窗
    showShootingGuide: false, // 显示拍摄角度演示弹窗
    shootingGuideMode: 'guide', // 拍摄指南弹窗模式：'guide' 编辑教学页面，'publish' 发布官方案例
    shootingGuideVideoUrl: '', // 拍摄角度演示视频URL（用于播放的临时URL）
    shootingGuideVideoFileID: '', // 拍摄角度演示视频的云存储 fileID（用于删除）
    showBindDeviceTip: false, // 显示绑定设备提示弹窗
    
    // 拍摄指南按钮状态
    guideBtnDisabled: true,
    guideBtnText: '我知道了 (3s)',
    guideTimer: null,
    showCategoryPickerModal: false,
    categoryPickerClosing: false, // 分类选择器退出动画中   
    
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
    categoryArray: ['街车', '仿赛', '踏板', '巡航', '拉力', '旅行车', '电摩', '电动自行车'],
    categoryValueArray: ['street', 'sport', 'scooter', 'cruise', 'rally', 'touring', 'ebike', 'bicycle'],
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
    
    const winInfo = wx.getWindowInfo();
    this.setData({ statusBarHeight: winInfo.statusBarHeight || 44 });
    this.ctx = wx.createCameraContext();
    
    // 加载拍摄指南视频
    this.loadShootingGuideVideo();

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
    // 🔴 启动定时检查 qiangli 强制封禁
    const app = getApp();
    if (app && app.startQiangliCheck) {
      app.startQiangliCheck();
    }
    
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

  onHide() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
  },

  onUnload() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
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
            categoryName: item.categoryName || null,
            color: this.getRandomColor(),
            videoUrl: item.videoFileID,
            coverUrl: item.coverFileID || null,
            displayTime: item.createTime ? this.formatTime(item.createTime) : null
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
    this._showCustomToast(newState ? '管理模式' : '浏览模式', 'none');

    // 【新增】如果是开启管理员，立刻拉取待审核视频
    if (newState) {
      this.fetchPendingVideos();
    }
  },
  
  // 🆕 切换管理员子模式
  switchAdminSubMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ adminSubMode: mode });
    this._showCustomToast(mode === 'edit' ? '视频编辑模式' : '管理现有视频模式', 'none');
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
    if (!list || list.length === 0) return Promise.resolve(list);

    // 🔴 分别处理有 sn 和没有 sn 的记录
    const itemsWithSn = list.filter(i => i.sn);
    const itemsWithoutSn = list.filter(i => !i.sn);

    const tasks = [];

    // 1. 按 SN 统计（有 sn 的记录）
    const sns = Array.from(new Set(itemsWithSn.map(i => i.sn)));
    sns.forEach(sn => {
      tasks.push(
        Promise.all([
          db.collection('video').where({ sn, status: 1 }).count(),
          db.collection('video').where({ sn, status: -1 }).count(),
          db.collection('video').where({ sn }).count(),
        ]).then(([passRes, rejectRes, totalRes]) => {
          return {
            key: sn,
            keyType: 'sn',
            passCount: passRes.total || 0,
            rejectCount: rejectRes.total || 0,
            totalCount: totalRes.total || 0,
          };
        }).catch(err => {
          console.error('❌ [enrichPendingStats] 统计失败 sn=', sn, err);
          return { key: sn, keyType: 'sn', passCount: 0, rejectCount: 0, totalCount: 0 };
        })
      );
    });

    // 2. 按 openid 统计（没有 sn 的记录，统计该用户所有投稿）
    const openids = Array.from(new Set(itemsWithoutSn.map(i => i.openid || i._openid).filter(Boolean)));
    openids.forEach(openid => {
      tasks.push(
        Promise.all([
          db.collection('video').where({ _openid: openid, status: 1 }).count(),
          db.collection('video').where({ _openid: openid, status: -1 }).count(),
          db.collection('video').where({ _openid: openid }).count(),
        ]).then(([passRes, rejectRes, totalRes]) => {
          return {
            key: openid,
            keyType: 'openid',
            passCount: passRes.total || 0,
            rejectCount: rejectRes.total || 0,
            totalCount: totalRes.total || 0,
          };
        }).catch(err => {
          console.error('❌ [enrichPendingStats] 统计失败 openid=', openid, err);
          return { key: openid, keyType: 'openid', passCount: 0, rejectCount: 0, totalCount: 0 };
        })
      );
    });

    if (tasks.length === 0) {
      // 如果没有需要统计的，直接返回，但确保所有记录都有默认值
      return Promise.resolve(list.map(item => ({
        ...item,
        passCount: item.passCount || 0,
        rejectCount: item.rejectCount || 0,
        totalCount: item.totalCount || 0,
      })));
    }

    return Promise.all(tasks).then(statArr => {
      const snStatMap = {};
      const openidStatMap = {};
      
      statArr.forEach(s => {
        if (s.keyType === 'sn') {
          snStatMap[s.key] = s;
        } else {
          openidStatMap[s.key] = s;
        }
      });

      return list.map(item => {
        let s = null;
        if (item.sn) {
          s = snStatMap[item.sn];
        } else {
          const openid = item.openid || item._openid;
          if (openid) {
            s = openidStatMap[openid];
          }
        }
        
        if (!s) {
          // 🔴 如果没有找到统计信息，返回默认值
          return {
            ...item,
            passCount: item.passCount || 0,
            rejectCount: item.rejectCount || 0,
            totalCount: item.totalCount || 0,
          };
        }
        
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
    
    this._showCustomModal({
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
              this._showCustomToast(result.result.msg || '已发布', 'success');
              
              // 刷新两个列表
              this.fetchPendingVideos(); 
              this.fetchCloudData();
            } else {
              this._showCustomToast(result.result.errMsg || '操作失败', 'none');
            }
          }).catch(err => {
            getApp().hideLoading();
            console.error('审核失败:', err);
            this._showCustomToast('操作失败', 'none');
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
    this._showCustomModal({
      title: '拒绝理由',
      editable: true,
      placeholderText: '请输入拒绝理由（必填）',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          const rejectReason = res.content.trim();
          if (!rejectReason) {
            this._showCustomToast('请填写拒绝理由', 'none');
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
              this._showCustomToast(result.result.msg || '已驳回', 'none');
              this.fetchPendingVideos(); // 刷新列表
            } else {
              this._showCustomToast(result.result.errMsg || '操作失败', 'none');
            }
          }).catch(err => {
            getApp().hideLoading();
            console.error('拒绝失败:', err);
            this._showCustomToast('操作失败', 'none');
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
    
    this._showCustomModal({
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
                this._showCustomToast(result.result.msg || '已标记', 'success');
                this.fetchPendingVideos(); // 刷新列表
              } else {
                // 如果失败，把错误弹出来看
                this._showCustomModal({ 
                  title: '操作失败', 
                  content: result.result ? result.result.errMsg || '未知错误' : '返回数据异常',
                  showCancel: false
                });
              }
            },
            fail: (err) => {
              getApp().hideLoading();
              console.error('标记失败:', err);
              this._showCustomModal({ 
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
          this._showCustomToast('下载文件失败', 'none');
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
            this._showCustomToast('下载失败', 'none');
          }
        },
        fail: err => {
          getApp().hideLoading();
          console.error('❌ [下载] 临时 URL 下载失败:', err);
          this._showCustomToast('下载文件失败', 'none');
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
          this._showCustomToast('下载文件失败', 'none');
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
        this._showCustomToast('已保存到相册', 'success');
      },
      fail: (err) => {
        getApp().hideLoading();
        console.error('❌ [保存] 保存到相册失败:', err);
        // 如果用户拒绝授权，提示去设置
        if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
          this._showCustomModal({
            title: '权限不足',
            content: '需要保存视频权限，请在设置中开启',
            confirmText: '去设置',
            success: (settingRes) => {
              if (settingRes.confirm) wx.openSetting();
            }
          });
        } else {
          this._showCustomToast('保存失败: ' + (err.errMsg || '未知错误'), 'none');
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
      // 管理员编辑模式：显示拍摄指南弹窗（带切换功能）
      this.setData({ 
        showShootingGuide: true,
        shootingGuideMode: 'guide' // 默认显示教学页面
      });
      // 管理员不需要倒计时，直接启用按钮
      this.setData({
        guideBtnDisabled: false,
        guideBtnText: '关闭'
      });
      // 弹窗渲染完成后立刻播放视频，尽量消除等待感
      wx.nextTick(() => {
        this.playShootingGuideVideo();
      });
    } else {
      // 普通用户：先显示拍摄角度演示，然后显示选择弹窗
      this.setData({ 
        showShootingGuide: true,
        shootingGuideMode: 'guide',
        guideBtnDisabled: true,
        guideBtnText: '我知道了 (3s)'
      });
      this.startGuideTimer();
      // 弹窗渲染完成后立刻播放视频，尽量消除等待感
      wx.nextTick(() => {
        this.playShootingGuideVideo();
      });
    }
  },

  // 拍摄指南倒计时
  startGuideTimer() {
    let seconds = 3;
    if (this.data.guideTimer) clearInterval(this.data.guideTimer);
    
    const timer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(timer);
        this.setData({
          guideBtnDisabled: false,
          guideBtnText: '我知道了',
          guideTimer: null
        });
      } else {
        this.setData({
          guideBtnText: `我知道了 (${seconds}s)`
        });
      }
    }, 1000);
    
    this.setData({ guideTimer: timer });
  },

  // 切换拍摄指南弹窗模式
  switchShootingGuideMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ shootingGuideMode: mode });
    
    if (mode === 'publish') {
      // 切换到发布模式：关闭拍摄指南弹窗，打开管理员表单
      if (this.data.guideTimer) clearInterval(this.data.guideTimer); // 清除倒计时
      this.setData({ 
        showShootingGuide: false,
        isEditing: false,
        editingId: null,
        vehicleName: '',
        categoryIndex: null,
        modelIndex: null,
        adminVideoPath: null,
        adminThumbPath: null,
        showAdminForm: true
      });
    } else if (mode === 'guide') {
      // 切换到教学模式：关闭管理员表单，打开拍摄指南弹窗
      this.setData({ 
        showAdminForm: false,
        showShootingGuide: true,
        // 管理员切换回来不需要倒计时
        guideBtnDisabled: false,
        guideBtnText: '关闭'
      });
      // 弹窗渲染完成后立刻播放视频
      wx.nextTick(() => {
        this.playShootingGuideVideo();
      });
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
    
    // 🔴 移除绑定设备检查：允许用户先上传视频，后续绑定设备后再审核
    console.log('✅ 准备打开相册');
    setTimeout(() => {
      console.log('📂 调用 wx.chooseVideo');
      wx.chooseVideo({
        sourceType: ['album'],
        maxDuration: 60,
        camera: 'back',
        success: (res) => {
          console.log('✅ 选择视频成功:', res);
          // 🔴 先显示预览，确认后再打开表单
          this.setData({
            videoPath: res.tempFilePath,
            showVideoPreview: true,
            isVideoPlaying: true
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
          // 用户取消不提示
          if (err && (err.errMsg || '').includes('cancel')) {
            return;
          }
          console.error('❌ 选择视频失败:', err);
          // 根据错误类型显示友好的中文提示
          let errorMsg = '选择失败';
          if (err && err.errMsg) {
            if (err.errMsg.includes('cancel')) {
              return; // 用户取消，不提示
            } else if (err.errMsg.includes('permission') || err.errMsg.includes('权限')) {
              errorMsg = '需要相册权限，请在设置中开启';
            } else if (err.errMsg.includes('size') || err.errMsg.includes('大小')) {
              errorMsg = '视频文件过大，请选择较小的视频';
            } else if (err.errMsg.includes('format') || err.errMsg.includes('格式')) {
              errorMsg = '视频格式不支持，请选择其他视频';
            }
          }
          this._showCustomToast(errorMsg, 'none', 3000);
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
    
    // 🔴 移除绑定设备检查：允许用户先录制视频，后续绑定设备后再审核
    // 先请求摄像头和麦克风权限
    this.requestCameraAndMicrophonePermission().then(() => {
      // 权限获取成功，延迟一下让弹窗关闭动画完成
      setTimeout(() => {
        if (typeof this.openCamera === 'function') {
          console.log('📷 权限已获取，准备调用 openCamera');
          this.openCamera();
        } else {
          console.error('❌ openCamera 方法不存在');
          this._showCustomToast('打开相机失败：方法不存在', 'none', 3000);
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
            this._showCustomModal({
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

  // 关闭拍摄指南弹窗
  closeShootingGuide() {
    if (this.data.guideTimer) clearInterval(this.data.guideTimer);
    this.setData({ showShootingGuide: false });
  },

  // 跳过拍摄指南，直接进入上传选项
  skipShootingGuide() {
    if (this.data.guideBtnDisabled) return; // 禁用时不可点击
    
    if (this.data.guideTimer) clearInterval(this.data.guideTimer);
    this.setData({ 
      showShootingGuide: false 
    });
    setTimeout(() => {
      this.setData({ showUploadOptions: true });
    }, 300);
  },

  // 手动触发视频播放
  playShootingGuideVideo() {
    if (!this.data.shootingGuideVideoUrl) {
      console.log('📝 没有视频URL，跳过播放');
      // #region agent log
      silentAgentLog({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
        location: 'case.js:playShootingGuideVideo',
        message: 'no video url, skip play',
        data: { shootingGuideVideoUrl: this.data.shootingGuideVideoUrl },
        timestamp: Date.now()
      });
      // #endregion
      return;
    }
    const videoContext = wx.createVideoContext('shootingGuideVideo', this);
    if (videoContext) {
      videoContext.play();
      console.log('▶️ 手动触发视频播放');
      // #region agent log
      silentAgentLog({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
        location: 'case.js:playShootingGuideVideo',
        message: 'called videoContext.play',
        data: { shootingGuideVideoUrl: this.data.shootingGuideVideoUrl },
        timestamp: Date.now()
      });
      // #endregion
    }
  },

  // 视频播放事件处理
  onShootingGuideVideoPlay(e) {
    console.log('✅ 拍摄指南视频开始播放', e);
    // #region agent log
    silentAgentLog({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H2',
      location: 'case.js:onShootingGuideVideoPlay',
      message: 'video play event',
      data: {},
      timestamp: Date.now()
    });
    // #endregion
  },

  onShootingGuideVideoError(e) {
    console.error('❌ 拍摄指南视频播放错误:', e.detail);
    // #region agent log
    silentAgentLog({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H3',
      location: 'case.js:onShootingGuideVideoError',
      message: 'video error event',
      data: { err: e.detail && e.detail.errMsg },
      timestamp: Date.now()
    });
    // #endregion
    const errMsg = e.detail.errMsg || '';
    if (errMsg.includes('MEDIA_ERR_SRC_NOT_SUPPORTED')) {
      wx.showToast({
        title: '视频格式不支持',
        icon: 'none',
        duration: 2000
      });
    } else if (errMsg.includes('MEDIA_ERR_NETWORK')) {
      wx.showToast({
        title: '网络错误，请检查网络',
        icon: 'none',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: '视频播放失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  onShootingGuideVideoLoadStart(e) {
    console.log('📹 拍摄指南视频开始加载', e);
  },

  // 上传拍摄指南演示视频（管理员功能）
  uploadShootingGuideVideo() {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFilePath;
        this.showMyLoading('上传中...');
        
        // 1. 先读取旧的视频 fileID
        db.collection('config').doc('shooting_guide').get().then(oldRes => {
          const oldFileID = oldRes.data && oldRes.data.videoFileID;
          
          // 2. 上传新视频到云存储
          const cloudPath = `case/shooting-guide/${Date.now()}_guide.mp4`;
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            success: (uploadRes) => {
              console.log('✅ 演示视频上传成功:', uploadRes.fileID);
              
              // 3. 更新数据库配置
              db.collection('config').doc('shooting_guide').set({
                data: {
                  videoFileID: uploadRes.fileID,
                  updateTime: db.serverDate()
                }
              }).then(() => {
                console.log('✅ 配置已保存到数据库');
                
                // 4. 更新页面显示
                // 保存原始 fileID 用于删除
                this.setData({ shootingGuideVideoFileID: uploadRes.fileID });
                
                // 如果是云存储路径，需要转换为临时 URL
                if (uploadRes.fileID.startsWith('cloud://')) {
                  wx.cloud.getTempFileURL({
                    fileList: [uploadRes.fileID],
                    success: (urlRes) => {
                      if (urlRes.fileList && urlRes.fileList[0]) {
                        this.setData({
                          shootingGuideVideoUrl: urlRes.fileList[0].tempFileURL
                        });
                      }
                    }
                  });
                } else {
                  this.setData({
                    shootingGuideVideoUrl: uploadRes.fileID
                  });
                }
                
                // 5. 删除旧视频文件（如果存在）
                if (oldFileID && oldFileID.startsWith('cloud://') && oldFileID !== uploadRes.fileID) {
                  wx.cloud.deleteFile({
                    fileList: [oldFileID],
                    success: (deleteRes) => {
                      console.log('✅ 旧视频已删除:', oldFileID);
                      if (deleteRes.fileList && deleteRes.fileList[0] && deleteRes.fileList[0].status === 'success') {
                        console.log('🗑️ 旧视频文件删除成功');
                      }
                    },
                    fail: (deleteErr) => {
                      console.warn('⚠️ 删除旧视频失败（不影响使用）:', deleteErr);
                      // 删除失败不影响新视频的使用，只记录警告
                    }
                  });
                }
                
                this.hideMyLoading();
                this._showCustomToast('上传成功', 'success');
              }).catch(err => {
                console.error('❌ 保存配置失败:', err);
                this.hideMyLoading();
                this._showCustomToast('上传成功，但保存配置失败', 'none');
              });
            },
            fail: (err) => {
              console.error('❌ 上传失败:', err);
              this.hideMyLoading();
              this._showCustomToast('上传失败，请重试', 'none');
            }
          });
        }).catch(err => {
          // 如果读取旧配置失败（可能是第一次上传），直接上传新视频
          console.log('📝 未找到旧配置，直接上传新视频');
          const cloudPath = `case/shooting-guide/${Date.now()}_guide.mp4`;
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            success: (uploadRes) => {
              console.log('✅ 演示视频上传成功:', uploadRes.fileID);
              this.setData({ 
                shootingGuideVideoUrl: uploadRes.fileID 
              });
              
              db.collection('config').doc('shooting_guide').set({
                data: {
                  videoFileID: uploadRes.fileID,
                  updateTime: db.serverDate()
                }
              }).then(() => {
                console.log('✅ 配置已保存到数据库');
                this.hideMyLoading();
                this._showCustomToast('上传成功', 'success');
              }).catch(setErr => {
                console.error('❌ 保存配置失败:', setErr);
                this.hideMyLoading();
                this._showCustomToast('上传成功，但保存配置失败', 'none');
              });
            },
            fail: (uploadErr) => {
              console.error('❌ 上传失败:', uploadErr);
              this.hideMyLoading();
              this._showCustomToast('上传失败，请重试', 'none');
            }
          });
        });
      },
      fail: (err) => {
        console.error('❌ 选择视频失败:', err);
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          this._showCustomToast('选择视频失败', 'none');
        }
      }
    });
  },

  // 从数据库加载拍摄指南视频（页面加载时调用）
  loadShootingGuideVideo() {
    db.collection('config').doc('shooting_guide').get().then(res => {
      if (res.data && res.data.videoFileID) {
        // 保存原始 fileID 用于删除
        this.setData({ shootingGuideVideoFileID: res.data.videoFileID });
        // #region agent log
        silentAgentLog({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H4',
          location: 'case.js:loadShootingGuideVideo',
          message: 'loaded config',
          data: { videoFileID: res.data.videoFileID },
          timestamp: Date.now()
        });
        // #endregion
        
        // 如果是云存储路径，需要转换为临时 URL
        if (res.data.videoFileID.startsWith('cloud://')) {
          wx.cloud.getTempFileURL({
            fileList: [res.data.videoFileID],
            success: (urlRes) => {
              if (urlRes.fileList && urlRes.fileList[0]) {
                this.setData({
                  shootingGuideVideoUrl: urlRes.fileList[0].tempFileURL
                });
                // #region agent log
                silentAgentLog({
                  sessionId: 'debug-session',
                  runId: 'run1',
                  hypothesisId: 'H4',
                  location: 'case.js:loadShootingGuideVideo',
                  message: 'got temp file url',
                  data: { tempUrl: urlRes.fileList[0].tempFileURL },
                  timestamp: Date.now()
                });
                // #endregion
              }
            }
          });
        } else {
          this.setData({
            shootingGuideVideoUrl: res.data.videoFileID
          });
          // #region agent log
          silentAgentLog({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H4',
            location: 'case.js:loadShootingGuideVideo',
            message: 'use direct fileID as url',
            data: { directUrl: res.data.videoFileID },
            timestamp: Date.now()
          });
          // #endregion
        }
      }
    }).catch(err => {
      console.log('📝 未找到拍摄指南配置，使用默认值');
    });
  },

  // 删除拍摄指南视频（管理员功能）
  deleteShootingGuideVideo() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除演示视频吗？删除后需要重新上传才能显示。',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          this.showMyLoading('删除中...');
          
          // 1. 从数据库读取 fileID
          db.collection('config').doc('shooting_guide').get().then(configRes => {
            const fileID = configRes.data && configRes.data.videoFileID;
            
            // 2. 删除云存储文件
            if (fileID && fileID.startsWith('cloud://')) {
              wx.cloud.deleteFile({
                fileList: [fileID],
                success: (deleteRes) => {
                  console.log('✅ 视频文件删除成功');
                  
                  // 3. 删除数据库配置
                  db.collection('config').doc('shooting_guide').remove().then(() => {
                    console.log('✅ 配置已删除');
                    this.setData({
                      shootingGuideVideoUrl: '',
                      shootingGuideVideoFileID: ''
                    });
                    this.hideMyLoading();
                    this._showCustomToast('删除成功', 'success');
                  }).catch(err => {
                    console.error('❌ 删除配置失败:', err);
                    this.hideMyLoading();
                    this._showCustomToast('文件已删除，但删除配置失败', 'none');
                  });
                },
                fail: (deleteErr) => {
                  console.error('❌ 删除文件失败:', deleteErr);
                  // 即使文件删除失败，也尝试删除数据库配置
                  db.collection('config').doc('shooting_guide').remove().then(() => {
                    this.setData({
                      shootingGuideVideoUrl: '',
                      shootingGuideVideoFileID: ''
                    });
                    this.hideMyLoading();
                    this._showCustomToast('配置已删除，但文件删除失败', 'none');
                  }).catch(err => {
                    this.hideMyLoading();
                    this._showCustomToast('删除失败，请重试', 'none');
                  });
                }
              });
            } else {
              // 如果没有 fileID 或不是云存储路径，只删除数据库配置
              db.collection('config').doc('shooting_guide').remove().then(() => {
                this.setData({
                  shootingGuideVideoUrl: '',
                  shootingGuideVideoFileID: ''
                });
                this.hideMyLoading();
                this._showCustomToast('删除成功', 'success');
              }).catch(err => {
                console.error('❌ 删除配置失败:', err);
                this.hideMyLoading();
                this._showCustomToast('删除失败，请重试', 'none');
              });
            }
          }).catch(err => {
            console.error('❌ 读取配置失败:', err);
            this.hideMyLoading();
            this._showCustomToast('删除失败，请重试', 'none');
          });
        }
      }
    });
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
        this._showCustomToast('暂无视频资源', 'none');
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
    const tabTypes = ['all', 'street', 'sport', 'scooter', 'cruise', 'rally', 'touring', 'ebike', 'bicycle'];
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

    if (!adminVideoPath) return this._showCustomToast('请选择视频', 'none');
    // 编辑模式下可以不改封面，新增模式必须有封面
    if (!isEditing && !adminThumbPath) return this._showCustomToast('请选择封面图', 'none');
    if (!vehicleName) return this._showCustomToast('请填写车型', 'none');
    // 🔴 修复：按照 zj4 的写法，只检查是否为 null
    if (categoryIndex === null) return this._showCustomToast('请选分类', 'none');
    if (modelIndex === null) return this._showCustomToast('请选型号', 'none');

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
      this._showCustomToast('操作失败', 'none');
    });
  },

  finishSubmit(msg) {
    getApp().hideLoading();
    this._showCustomToast(msg, 'success');
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
    // 🔴 移除绑定设备检查：允许用户先录制视频，后续绑定设备后再上传审核
    
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
    // 🔴 设置最大录制时长为 60 秒，防止文件过大
    const MAX_RECORD_DURATION = 60; // 最大录制时长（秒）
    
    // 这里的 startRecord 不需要改动太多，只要确保不调用 getApp().hideLoading 即可
    this.ctx.startRecord({ 
      timeoutCallback: () => {
        // 🔴 超时回调：达到最大时长时自动停止
        console.log('⏰ [超时回调] 达到最大录制时长，自动停止录制');
        if (this.data.timer) {
          clearInterval(this.data.timer);
          this.setData({ timer: null });
        }
        // 自动保存并停止
        if (this.data.isRecording) {
          this.stopRecordLogic(true);
        }
      },
      success:()=>{
        // 录制状态改变，WXML 里的 class 会自动变化，触发 CSS 动画
        this.setData({isRecording: true, recTimeStr: "00:00"});
        this.startTime = Date.now();
        
        if(this.data.timer) clearInterval(this.data.timer);
        let seconds = 0;
        this.data.timer = setInterval(() => {
          seconds++;
          
          // 🔴 双重保护：在计时器中也检查是否达到最大时长
          if (seconds >= MAX_RECORD_DURATION) {
            console.log('⏰ [计时器检查] 达到最大录制时长，自动停止录制');
            clearInterval(this.data.timer);
            this.setData({ timer: null });
            // 自动保存并停止
            this.stopRecordLogic(true);
            return;
          }
          
          const min = Math.floor(seconds / 60).toString().padStart(2, '0');
          const sec = (seconds % 60).toString().padStart(2, '0');
          this.setData({ recTimeStr: `${min}:${sec}` });
        }, 1000);
      },
      fail: (err) => {
        console.error('❌ 录制启动失败', err);
        this._showCustomToast('录制启动失败', 'none');
        this.setData({ isRecording: false });
        // 清除计时器
        if (this.data.timer) {
          clearInterval(this.data.timer);
          this.setData({ timer: null });
        }
      }
    }); 
  },
  stopRecordLogic(save) { 
    // 🔴 先清除计时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
    
    // 🔴 立即重置 UI 状态，不依赖 stopRecord 的成功回调
    this.setData({
      isRecording: false,
      isStopping: false,
      recTimeStr: "00:00"
    });
    
    // 🔴 确保 ctx 存在，如果不存在则重新创建
    if (!this.ctx) {
      this.ctx = wx.createCameraContext();
    }
    
    // 🔴 尝试停止录制，但不依赖成功回调
    try {
      this.ctx.stopRecord({
        success: (res) => {
          console.log('✅ 录制结束，返回结果:', res);
          if (save && res.tempVideoPath) {
            setTimeout(() => {
              this.setData({
                showCamera: false,
                cameraAnimating: false,
                videoPath: res.tempVideoPath,
                showVideoPreview: true, // 🔴 先显示预览
                isVideoPlaying: true
              });
            }, 250);
          } else if (save) {
            this._showCustomToast('录制无效', 'none');
          }
        },
        fail: (err) => {
          console.error('❌ stopRecord 失败，但已重置状态', err);
          // 即使失败，也尝试处理保存逻辑
          if (save) {
            // 如果 stopRecord 失败，直接关闭相机，不保存视频
            setTimeout(() => {
              this.setData({
                showCamera: false,
                cameraAnimating: false
              });
            }, 250);
          }
        }
      });
    } catch (e) {
      console.error('❌ stopRecord 调用异常', e);
      // 即使异常，也要关闭相机
      setTimeout(() => {
        this.setData({
          showCamera: false,
          cameraAnimating: false
        });
      }, 250);
    } 
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
    
    // 🔴 修复：防止重复提交（在函数开始就检查并设置状态）
    if (this.data.isSubmitting) {
      console.log('⚠️ [提交] 正在提交中，忽略重复点击');
      return;
    }
    
    // 🔴 立即设置提交状态，防止竞态条件
    this.setData({ isSubmitting: true });
    
    // 🔴 修复：使用自定义提示框，并触发抖动
    if (!videoPath) {
      console.error('❌ [提交] 视频丢失');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请先选择或录制视频');
      return;
    }
    if (!vehicleName || vehicleName.trim() === '') {
      console.error('❌ [提交] 未填写车型');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请填写车型信息');
      return;
    }
    if (categoryIndex === null || categoryIndex === undefined) {
      console.error('❌ [提交] 未选择分类');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请选择车型分类');
      return;
    }
    if (modelIndex === null || modelIndex === undefined) {
      console.error('❌ [提交] 未选择型号');
      this.setData({ isSubmitting: false }); // 重置状态
      this.showFormErrorWithShake('请选择产品型号');
      return;
    }
    // 🔴 设备选择变为可选：如果用户没有绑定设备，targetSn 可以为空
    let targetSn = null;
    if (selectedSnIndex !== null && selectedSnIndex !== undefined && myDevices && myDevices[selectedSnIndex]) {
      targetSn = myDevices[selectedSnIndex].sn;
    }
    console.log('🔵 [提交] 准备提交，targetSn:', targetSn || '未绑定设备');
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
        // 🔴 获取用户 openid（用于未绑定设备时的延保记录）
        let userOpenid = null;
        try {
          const loginRes = await wx.cloud.callFunction({ name: 'login' });
          userOpenid = loginRes.result?.openid;
        } catch (err) {
          console.error('❌ [提交] 获取 openid 失败:', err);
        }

        // 🆕 按设备 SN 统计投稿次数（如果有 sn）
        let applyCount = 1;
        if (targetSn) {
          const countRes = await db.collection('video').where({ sn: targetSn }).count();
          applyCount = (countRes.total || 0) + 1;
        } else {
          // 如果没有 sn，按 openid 统计投稿次数
          if (userOpenid) {
            const countRes = await db.collection('video').where({ openid: userOpenid }).count();
            applyCount = (countRes.total || 0) + 1;
          }
        }

        const submitData = {
          vehicleName, 
          category: categoryValueArray[categoryIndex], 
          categoryName: categoryArray[categoryIndex], 
          model: modelArray[modelIndex], 
          videoFileID: res.fileID, 
          createTime: db.serverDate(), 
          status: 0, // 0:审核中
          sn: targetSn || null, // 🔴 关联 SN（可为空）
          openid: userOpenid || null, // 🔴 新增：保存 openid（用于未绑定设备时的延保记录）
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
            
            // 🔴 如果用户没有绑定设备，提交成功后显示提示弹窗
            if (!targetSn && (!myDevices || myDevices.length === 0)) {
              setTimeout(() => {
                this.setData({ showBindDeviceTip: true });
              }, 500); // 延迟500ms，等成功弹窗显示后再显示绑定提示
            }
          },
          fail: (dbErr) => {
            console.error('❌ [提交] 数据库写入失败:', dbErr);
            getApp().hideLoading();
            this.setData({ isSubmitting: false });
            this._showCustomToast('提交失败: ' + (dbErr.errMsg || '未知错误'), 'none', 3000);
          }
        });
      },
      fail: (uploadErr) => {
        console.error('❌ [提交] 视频上传失败:', uploadErr);
        getApp().hideLoading();
        this.setData({ isSubmitting: false });
        this._showCustomToast('上传失败: ' + (uploadErr.errMsg || '未知错误'), 'none', 3000);
      }
    });
  },

  // 🆕 关闭用户表单（带收缩退出动画）
  closeForm() {
    this.setData({ formClosing: true });
    setTimeout(() => {
      this.setData({
        showForm: false,
        formClosing: false,
        videoPath: null, // 清空临时视频路径
        // 清空表单数据（可选）
        vehicleName: '',
        categoryIndex: null, // 🔴 修复：按照 zj4 的写法，重置为 null
        modelIndex: null // 🔴 修复：按照 zj4 的写法，重置为 null
      });
    }, 420);
  },

  deleteCase(e) {
     const id = e.currentTarget.dataset.id;
     this._showCustomModal({ title:'确认删除', content:'不可恢复', confirmColor:'#FF3B30', success:(res)=>{
       if(res.confirm) { db.collection('video_go').doc(id).remove().then(()=>{ this.fetchCloudData(); this._showCustomToast({title:'已删除'}); }); }
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

  // 🔴 视频预览相关函数
  closeVideoPreview() {
    // 停止视频播放
    const videoContext = wx.createVideoContext('caseVideoPreviewPlayer');
    if (videoContext) {
      videoContext.pause();
    }
    
    this.setData({ 
      showVideoPreview: false,
      isVideoPlaying: true
      // 注意：不清除 videoPath，因为确认使用时还需要它
    });
  },

  // 重新选择视频（关闭预览，返回上传选项）
  rechooseVideo() {
    // 停止视频播放
    const videoContext = wx.createVideoContext('caseVideoPreviewPlayer');
    if (videoContext) {
      videoContext.pause();
    }
    
    this.setData({ 
      showVideoPreview: false,
      isVideoPlaying: true,
      videoPath: null // 重新选择时清除视频路径
    });
    
    // 延迟一下，确保预览关闭后再显示上传选项
    setTimeout(() => {
      this.setData({ showUploadOptions: true });
    }, 300);
  },

  // 确认使用视频（关闭预览，打开表单）
  confirmVideoPreview() {
    this.closeVideoPreview();
    
    // 🔴 延迟2秒，确保预览关闭后再打开表单
    setTimeout(() => {
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
        this._showCustomToast('数据错误：categoryArray为空', 'none', 3000);
        return;
      }
      
      // 🔴 修复：按照 zj4 的写法，打开表单时不重置 categoryIndex 和 modelIndex
      this.setData({
        showForm: true
      });
    }, 2000);
  },

  // 视频预览播放/暂停切换
  toggleVideoPreviewPlayPause() {
    const videoContext = wx.createVideoContext('caseVideoPreviewPlayer');
    if (this.data.isVideoPlaying) {
      videoContext.pause();
    } else {
      videoContext.play();
    }
  },

  // 视频预览播放事件
  onVideoPreviewPlay() {
    this.setData({ isVideoPlaying: true });
  },

  // 视频预览暂停事件
  onVideoPreviewPause() {
    this.setData({ isVideoPlaying: false });
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
      showModelPickerModal: false,
      // 如果是从切换按钮关闭的，重置模式为教学
      shootingGuideMode: 'guide'
    }); 
  },
  closeIntro() { 
    this.setData({ introClosing: true });
    setTimeout(() => {
      this.setData({ 
        showIntro: false,
        introClosing: false
      });
    }, 420);
  },
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
    this.setData({ categoryPickerClosing: true });
    setTimeout(() => {
      this.setData({ 
        showCategoryPickerModal: false,
        categoryPickerClosing: false
      });
    }, 420);
  },

  // 空函数，用于阻止事件冒泡和滚动
  noop() {},
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
      this._showCustomToast('暂无设备，请先绑定设备', 'none');
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

    console.log('[case] 🔴 截屏/录屏检测，立即跳转');
    
    // 🔴 立即跳转到封禁页面（不等待云函数）
    this._jumpToBlocked(type);

    // 🔴 异步调用云函数（不阻塞跳转）
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type: type,
        banPage: 'case',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      },
      success: (res) => {
        console.log('[case] ✅ 设置封禁状态成功:', res);
      },
      fail: (err) => {
        console.error('[case] ⚠️ 设置封禁状态失败:', err);
      }
    });

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
  
  // ===============================================
  // 🔴 统一的自定义弹窗方法（替换所有 wx.showModal 和 wx.showToast）
  // ===============================================
  
  // 🔴 统一的自定义 Toast 方法（替换所有 wx.showToast）
  _showCustomToast(title, icon = 'none', duration = 2000) {
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showToast) {
        toast.showToast({ title, icon, duration });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级到原生
        console.warn('[case] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 🔴 统一的自定义 Modal 方法（替换所有 wx.showModal，除了 editable 的情况）
  _showCustomModal(options) {
    // 如果 editable 为 true，使用原生（因为自定义组件不支持输入框）
    if (options.editable) {
      return wx.showModal({
        title: options.title || '提示',
        content: options.content || '',
        placeholderText: options.placeholderText || '',
        editable: true,
        showCancel: options.showCancel !== false,
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        confirmColor: options.confirmColor || '#576B95',
        success: options.success
      });
    }
    
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showModal) {
        toast.showModal({
          title: options.title || '提示',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          success: options.success
        });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级到原生
        console.warn('[case] custom-toast 组件未找到，使用降级方案');
        wx.showModal({
          title: options.title || '提示',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          success: options.success
        });
      }
    };
    tryShow();
  },
  
});
