// 1. 【线框版】微信图标
const iconWechat = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzA3QzE2MCI+PHBhdGggZD0iTTguNSwxMy41QTEuNSwxLjUgMCAxLDEgMTAsMTJBMS41LDEuNSAwIDAsMSA4LjUsMTMuNU0xNS41LDEzLjVBMS41LDEuNSAwIDEsMSAxNywxMkExLjUsMS41IDAgMCwxIDE1LjUsMTMuNU0xMiwyQTEwLDEwIDAgMCwwIDIsMTJBMTAsMTAgMCAwLDAgMTIsMjJBMTAsMTAgMCAwLDAgMjIsMTJBMTAsMTAgMCAwLDAgMTIsMlpNMTIsMjAuNUE4LjUsOC41IDAgMSwxIDIwLjUsMTJBOC41LDguNSAwIDAsMSAxMiwyMC41WiIvPjwvc3ZnPg==";

// 2. 【线框版】邮箱图标
const iconEmail = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIiBmaWxsPSJub25lIj48cmVjdCB4PSI2IiB5PSIxMiIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjM2IiByeD0iNCIgc3Ryb2tlPSIjMDA3QUZGIiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNNiAxNkwzMCAzNEw1NCAxNiIgc3Ryb2tlPSIjMDA3QUZGIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==";

// 成功图标 (用于弹窗第二步)
const iconCheck = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTI0IDQ0QzM1LjA0NTcgNDQgNDQgMzUuMDQ1NyA0NCAyNEM0NCAxMi45NTQzIDM1LjA0NTcgNCAyNCA0QzEyLjk1NDMgNCA0IDEyLjk1NDMgNCAyNEM0IDM1LjA0NTcgMTIuOTU0MyA0NCAyNCA0NFoiIGZpbGw9IiMwMDdBRkYiLz48cGF0aCBkPSJNMzIuOTUwMyAxNi45NDk4TDIwLjIyNTMgMjkuNjc0OUwxNS4wNDk4IDI0LjQ5OTMiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";

Page({
  data: {
    showQr: false,
    showModal: false,
    emailContent: '',
    step: 1, // 1:输入, 2:成功

    // 自定义 Toast 状态（保留，用于错误提示）
    toastVisible: false,
    toastMsg: '',
    toastIcon: 'success', // success 或 none

    // 统一的"内容已复制"弹窗（和首页一致样式）
    showCopySuccessModal: false,

    iconTop: iconWechat,   
    iconBottom: iconEmail, 
    iconCheck: iconCheck,
    
    // 你的二维码
    qrCodeUrl: "/images/qrcode.jpg" 
  },

  onLoad() {
    // 🔴 更新页面访问统计
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('call');
    }
  },

  // 1. 微信点击逻辑 (极速消灭系统弹窗版)
  handleWechatTap() {
    if (this.data.showQr) {
      // 🔴 提前隐藏可能的 toast
      wx.hideToast();
      
      wx.setClipboardData({
        data: 'MT-mogaishe',
        success: () => {
          // 1）立即干掉系统 toast，多次尝试确保隐藏
          wx.hideToast();
          setTimeout(() => { wx.hideToast(); }, 50);
          setTimeout(() => { wx.hideToast(); }, 100);
          setTimeout(() => { wx.hideToast(); }, 150);

          // 2）显示统一的居中大弹窗
          this.setData({ showCopySuccessModal: true });
          setTimeout(() => {
            this.setData({ showCopySuccessModal: false });
          }, 2000);
        },
        fail: () => {
          wx.hideToast();
          setTimeout(() => { wx.hideToast(); }, 50);
        }
      })
    } else {
      this.setData({ showQr: true })
    }
  },

  // --- 邮箱弹窗逻辑 ---
  openModal() { this.setData({ showModal: true, step: 1 }) },
  closeModal() { this.setData({ showModal: false }) },
  handleInput(e) { this.setData({ emailContent: e.detail.value }) },

  // 3. 发送邮件逻辑 (极速消灭系统弹窗版)
  handleSendEmail() {
    const content = this.data.emailContent;
    if (!content) {
      // 无内容时仍用顶部自定义 toast 提示
      this.showCustomToast('请输入内容', 'none'); 
      return;
    }

    // 🔴 提前隐藏可能的 toast
    wx.hideToast();
    
    wx.setClipboardData({
      data: content,
      success: () => {
        // 1）立即干掉系统 toast，多次尝试确保隐藏
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
        setTimeout(() => { wx.hideToast(); }, 100);
        setTimeout(() => { wx.hideToast(); }, 150);

        // 2）显示统一"内容已复制"弹窗
        this.setData({ showCopySuccessModal: true });
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false, step: 2 });
        }, 2000);
      },
      fail: () => {
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
      }
    })
  },

  // 复制邮箱 (第二步) - 极速消灭系统弹窗版
  handleCopyEmail() {
    const targetEmail = "3252955872@qq.com";
    // 🔴 提前隐藏可能的 toast
    wx.hideToast();
    
    wx.setClipboardData({
      data: targetEmail,
      success: () => {
        // 1）立即干掉系统 toast，多次尝试确保隐藏
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
        setTimeout(() => { wx.hideToast(); }, 100);
        setTimeout(() => { wx.hideToast(); }, 150);

        // 2）显示统一"内容已复制"弹窗
        this.setData({ showCopySuccessModal: true, showModal: false, emailContent: '', step: 1 });
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
      },
      fail: () => {
        wx.hideToast();
        setTimeout(() => { wx.hideToast(); }, 50);
      }
    })
  },
  
  // --- 自定义高级 Toast 显示逻辑 ---
  showCustomToast(msg, type) {
    this.setData({
      toastVisible: true,
      toastMsg: msg,
      toastIcon: type
    });
    
    // 2秒后自动消失
    setTimeout(() => {
      this.setData({ toastVisible: false });
    }, 2000);
  },

  preventMove() { return },

  // 返回上一页
  handleBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1
      });
    } else {
      // 如果没有上一页，跳转到首页
      wx.reLaunch({
        url: '/pages/home/home'
      });
    }
  }
})