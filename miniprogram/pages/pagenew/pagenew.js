// pages/launch/launch.js
const app = getApp()
// 初始化云开发（替换为你自己的环境ID，或设为 true 自动选择）
wx.cloud.init({ env: 'your-env-id' })
const db = wx.cloud.database()

Page({
  data: {
    // 页面状态
    isAdmin: false,
    isScatter: false, // 是否处于消散状态
    showDetail: false, // 是否显示详情页
    showPasswordModal: false,
    
    // 数据模型
    product: {
      cover: '', // 封面图URL
      title: 'Secret Project',
      desc: 'Loading new collection...',
      details: [] // 详情图数组
    },
    defaultCover: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', // 默认图

    // 交互辅助
    clickCount: 0,
    clickTimer: null,
    pwdInput: '',
    toast: { show: false, msg: '' }
  },

  onLoad() {
    // 加载云端数据
    this.fetchProductData();
  },

  // ================= 1. 云端数据同步 =================
  fetchProductData() {
    // 假设我们只存一条 ID 为 'LATEST' 的数据
    db.collection('products').doc('LATEST').get().then(res => {
      this.setData({ product: res.data });
    }).catch(err => {
      console.log('暂无数据或读取失败，使用默认');
      // 如果没有数据，可以在这里初始化一条
    });
  },

  updateCloudData(dataToUpdate) {
    wx.showLoading({ title: '同步中...' });
    const docRef = db.collection('products').doc('LATEST');
    
    // 尝试更新，如果不存在则创建
    docRef.update({
      data: dataToUpdate
    }).then(() => {
      wx.hideLoading();
      this.showToast('✅ 同步成功');
      this.fetchProductData(); // 刷新界面
    }).catch(() => {
      // 如果文档不存在，则 set
      docRef.set({
        data: { ...this.data.product, ...dataToUpdate }
      }).then(() => {
        wx.hideLoading();
        this.showToast('✅ 创建并同步成功');
        this.fetchProductData();
      });
    });
  },

  // ================= 2. 交互逻辑 =================
  
  // 点击“立即查看” -> 触发消散动画 -> 显示详情
  handleViewDetail() {
    // 1. 设置消散状态
    this.setData({ isScatter: true });
    
    // 2. 延迟显示详情页
    setTimeout(() => {
      this.setData({ showDetail: true });
    }, 400); // 配合 CSS transition 0.5s
  },

  // 点击返回 -> 隐藏详情 -> 恢复首页
  handleBack() {
    this.setData({ showDetail: false });
    
    // 等详情页收起后再恢复首页
    setTimeout(() => {
      this.setData({ isScatter: false });
    }, 400);
  },

  // ================= 3. 管理员解锁逻辑 =================
  handleTitleClick() {
    if (this.data.isAdmin) return;
    
    this.data.clickCount++;
    // 防抖重置
    clearTimeout(this.data.clickTimer);
    this.data.clickTimer = setTimeout(() => {
      this.data.clickCount = 0;
    }, 3000);

    if (this.data.clickCount >= 5) {
      wx.vibrateShort({ type: 'heavy' });
      this.setData({ showPasswordModal: true, clickCount: 0 });
    }
  },

  onPwdInput(e) {
    this.setData({ pwdInput: e.detail.value });
  },

  checkPassword() {
    if (this.data.pwdInput === '3252955872') {
      this.setData({ isAdmin: true, showPasswordModal: false });
      this.showToast('🔓 管理员模式已开启');
    } else {
      this.showToast('❌ 密码错误');
      wx.vibrateLong();
      this.setData({ pwdInput: '' });
    }
  },

  closeModal() {
    this.setData({ showPasswordModal: false, pwdInput: '' });
  },

  // ================= 4. 上传逻辑 =================

  // 上传封面 (单图)
  handleUploadCover() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.uploadFileToCloud(filePath, 'cover').then(fileID => {
          // 更新数据库
          this.updateCloudData({ cover: fileID });
        });
      }
    });
  },

  // 上传详情图 (多图追加)
  handleUploadDetails() {
    wx.chooseMedia({
      count: 9, mediaType: ['image'], sourceType: ['album', 'camera'], // 支持多选
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });
        const tempFiles = res.tempFiles;
        const newFileIDs = [];

        // 循环上传所有图片
        for (let i = 0; i < tempFiles.length; i++) {
          const fileID = await this.uploadFileToCloud(tempFiles[i].tempFilePath, `detail_${Date.now()}_${i}`);
          newFileIDs.push(fileID);
        }

        // 追加到现有数组
        const updatedDetails = this.data.product.details.concat(newFileIDs);
        
        // 更新数据库
        this.updateCloudData({ details: updatedDetails });
      }
    });
  },

  // 清空详情图
  handleClearDetails() {
    wx.showModal({
      title: '警告', content: '确定清空所有详情图吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateCloudData({ details: [] });
        }
      }
    });
  },

  // 封装：上传单个文件到云存储
  uploadFileToCloud(filePath, prefix) {
    return new Promise((resolve, reject) => {
      const cloudPath = `new_arrivals/${prefix}_${Date.now()}.png`;
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
        success: res => resolve(res.fileID),
        fail: err => {
          wx.hideLoading();
          this.showToast('上传失败');
          reject(err);
        }
      });
    });
  },

  // 工具：Toast
  showToast(msg) {
    this.setData({ 'toast.show': true, 'toast.msg': msg });
    setTimeout(() => {
      this.setData({ 'toast.show': false });
    }, 2000);
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
})