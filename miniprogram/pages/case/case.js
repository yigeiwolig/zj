const app = getApp();
const db = wx.cloud.database();

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
    categoryIndex: null,
    modelArray: ['F1', 'F2', 'F2 Long', '不知道'],
    modelIndex: null,
    isSubmitting: false,
    
    // --- 列表数据 ---
    list: [],        
    displayList: []  
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight });
    this.ctx = wx.createCameraContext();
    this.fetchCloudData();
    
    // 检查管理员权限
    this.checkAdminPrivilege();
    
    this.captureScreenHandler = () => { this.handleScreenshot(); };
    wx.onUserCaptureScreen(this.captureScreenHandler);

    // 🆕 初始化：延迟计算第一个滑块位置
    setTimeout(() => {
       this.initTabPosition();
    }, 500);
  },

  onUnload() {
    if (this.captureScreenHandler) wx.offUserCaptureScreen(this.captureScreenHandler);
    if (this.data.timer) clearInterval(this.data.timer);
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
    if(this.data.list.length === 0) wx.showLoading({ title: '加载中...' });
    
    db.collection('video_go')
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        wx.hideLoading();
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
        wx.hideLoading();
        console.error(err);
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
    if (this.data.isAdmin) {
      // 管理员模式：直接打开上传表单 (新增模式)
      this.setData({
        isEditing: false,
        editingId: null,
        vehicleName: '',
        categoryIndex: null,
        modelIndex: null,
        adminVideoPath: null,
        adminThumbPath: null,
        showAdminForm: true
      });
    } else {
      // 普通用户：打开录制
      this.openCamera();
    }
  },

  // ==========================================
  // 🆕 3. 智能卡片点击 (播放 vs 编辑)
  // ==========================================
  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    const targetItem = this.data.displayList.find(item => item._id === id);

    if (this.data.isAdmin) {
      // 🔧 管理员模式：进入编辑
      this.editCase(targetItem);
    } else {
      // ▶️ 普通模式：播放视频
      if (targetItem && targetItem.videoUrl) {
        this.setData({ currentVideo: targetItem, showVideoPlayer: true });
      } else {
        wx.showToast({ title: '暂无视频资源', icon: 'none' });
      }
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
      categoryIndex: catIdx >= 0 ? catIdx : null,
      modelIndex: modIdx >= 0 ? modIdx : null,
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
    if (categoryIndex === null) return wx.showToast({ title: '请选分类', icon: 'none' });
    if (modelIndex === null) return wx.showToast({ title: '请选型号', icon: 'none' });

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: isEditing ? '修改中...' : '上传中...', mask: true });

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
        db.collection('video_go').add({ data: docData })
          .then(() => {
             this.finishSubmit('发布成功');
          });
      }
    }).catch(err => {
      console.error(err);
      wx.hideLoading();
      this.setData({ isSubmitting: false });
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  finishSubmit(msg) {
    wx.hideLoading();
    wx.showToast({ title: msg, icon: 'success' });
    this.setData({ 
      isSubmitting: false, showAdminForm: false, 
      adminVideoPath: null, adminThumbPath: null,
      vehicleName: '', categoryIndex: null, modelIndex: null,
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
    // 1. 🔴 先设置显示状态，但动画还未开始（初始状态：很小，圆形，透明）
    this.setData({ 
      showCamera: true, 
      cameraAnimating: true, // 标记为动画初始状态
      showPrivacyTip: true 
    }); 
    
    // 2. 🔴 等待一帧（约16ms），让初始状态先渲染，然后触发弹出动画
    setTimeout(() => {
      this.setData({ cameraAnimating: false }); // 触发弹出动画
    }, 20);
    
    // 3. 隐私提示显示 4 秒后自动消失
    setTimeout(() => {
      this.setData({ showPrivacyTip: false });
    }, 4000);
  },
  closeCamera() { 
    if(this.data.isRecording) {
      // 🔴 如果正在录制，先停止录制
      this.stopRecordLogic(false); 
      // 🔴 等待停止完成后再关闭相机（延迟一下）
      setTimeout(() => {
        this.setData({ 
          cameraAnimating: true, // 开始关闭动画（缩回按钮）
          showPrivacyTip: false 
        });
        setTimeout(() => {
          this.setData({ showCamera: false, cameraAnimating: false });
        }, 500); // 等待动画完成（与CSS动画时间一致）
      }, 100);
    } else {
      // 🔴 如果没有录制，先触发关闭动画（缩回按钮）
      this.setData({ cameraAnimating: true });
      setTimeout(() => {
        this.setData({ 
          showCamera: false, 
          showPrivacyTip: false,
          cameraAnimating: false 
        }); 
      }, 500); // 等待动画完成（与CSS动画时间一致）
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
    // 这里的 startRecord 不需要改动太多，只要确保不调用 wx.hideLoading 即可
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
              // 动画播完了，现在跳转到表单页
              this.setData({
                showCamera: false, 
                showForm: true, 
                videoPath: res.tempVideoPath
              }); 
            } else if (save) {
              wx.showToast({ title: '录制无效', icon: 'none' });
            }
        }, 500); // 等待 500 毫秒
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
  
  submitForm() {
    const { vehicleName, categoryIndex, modelIndex, videoPath, categoryValueArray, categoryArray, modelArray } = this.data;
    if (!videoPath) return wx.showToast({ title: '视频丢失', icon: 'none' });
    if (!vehicleName) return wx.showToast({ title: '请填写车型', icon: 'none' });
    if (categoryIndex === null) return wx.showToast({ title: '请选分类', icon: 'none' });
    if (modelIndex === null) return wx.showToast({ title: '请选型号', icon: 'none' });
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '上传中...', mask: true });
    const cloudPath = `video/${Date.now()}_user.mp4`;
    wx.cloud.uploadFile({
      cloudPath: cloudPath, filePath: videoPath,
      success: res => {
        db.collection('video').add({
          data: {
            vehicleName, category: categoryValueArray[categoryIndex], categoryName: categoryArray[categoryIndex], model: modelArray[modelIndex], videoFileID: res.fileID, createTime: db.serverDate(), status: 0
          },
          success: () => { wx.hideLoading(); this.setData({ isSubmitting: false, showForm: false, showSuccess: true, videoPath: null }); }
        });
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
      categoryIndex: null,
      modelIndex: null
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
  closeVideoPlayer() { this.setData({ showVideoPlayer: false, currentVideo: null }); },
  goBack() { wx.navigateBack(); },
  closeAdminForm() { this.setData({ showAdminForm: false, adminVideoPath: null, adminThumbPath: null, isEditing: false }); },
  closeIntro() { this.setData({ showIntro: false }); },
  closeSuccess() { this.setData({ showSuccess: false }); },
  onInputVehicle(e) { this.setData({ vehicleName: e.detail.value }); },
  bindCategoryChange(e) { this.setData({ categoryIndex: e.detail.value }); },
  bindPickerChange(e) { this.setData({ modelIndex: e.detail.value }); },
  handleScreenshot() { 
    // 🔴 截图封禁：设置特殊标记，不允许自动解封
    wx.setStorageSync('is_user_banned', true);
    wx.setStorageSync('is_screenshot_banned', true); // 截图封禁标记
    
    // 🔴 核心修复：将截图封禁统一写入 login_logs
    wx.cloud.callFunction({ name: 'login' }).then(loginRes => {
      const openid = loginRes.result.openid;
      
      // 查询 login_logs 最新记录
      db.collection('login_logs')
        .where({ _openid: openid })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
        .then(res => {
          if (res.data.length > 0) {
            // 更新现有记录
            db.collection('login_logs').doc(res.data[0]._id).update({
              data: { 
                isBanned: true, 
                updateTime: db.serverDate(),
                banReason: '截图违规'
              }
            });
          } else {
            // 如果不存在，创建新记录
            db.collection('login_logs').add({
              data: {
                _openid: openid,
                isBanned: true,
                attemptCount: 0,
                createTime: db.serverDate(),
                updateTime: db.serverDate(),
                banReason: '截图违规'
              }
            });
          }
        });
    });
    
    wx.reLaunch({ url: '/pages/blocked/blocked?type=screenshot' }); 
  }
});
