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

    // 自定义 Toast 状态（保留用于其他提示）
    toastVisible: false,
    toastMsg: '',
    toastIcon: 'success', // success 或 none

    // 【新增】控制"内容已复制"弹窗
    showCopySuccessModal: false,

    iconTop: iconWechat,   
    iconBottom: iconEmail, 
    iconCheck: iconCheck,
    
    // 你的二维码
    qrCodeUrl: "/images/qrcode.jpg" 
  },

  // 1. 微信点击逻辑 (统一使用自定义弹窗)
  handleWechatTap() {
    if (this.data.showQr) {
      // 🔴 确保拦截微信官方的 toast（如果存在）
      if (wx.__mt_oldHideLoading) {
        wx.__mt_oldHideLoading();
      }
      
      wx.setClipboardData({
        data: 'MT-mogaishe',
        success: () => {
          // 🔴 再次确保关闭微信官方 toast（如果被触发）
          if (wx.__mt_oldHideLoading) {
            wx.__mt_oldHideLoading();
          }
          // 显示自定义"内容已复制"弹窗（白色，大一点）
          this.setData({ showCopySuccessModal: true });
          // 2秒后自动关闭
          setTimeout(() => {
            this.setData({ showCopySuccessModal: false });
          }, 2000);
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

  // 3. 发送邮件逻辑 (统一使用自定义弹窗)
  handleSendEmail() {
    const content = this.data.emailContent;
    if (!content) {
      this.showCustomToast('请输入内容', 'none'); 
      return;
    }

    // 🔴 确保拦截微信官方的 toast（如果存在）
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }

    wx.setClipboardData({
      data: content,
      success: () => {
        // 🔴 再次确保关闭微信官方 toast（如果被触发）
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
        // 显示自定义"内容已复制"弹窗（白色，大一点）
        this.setData({ showCopySuccessModal: true });
        // 2秒后自动关闭
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
        
        // 再过0.5秒切换到下一步界面
        setTimeout(() => {
          this.setData({ step: 2 });
        }, 500);
      }
    })
  },

  // 复制邮箱 (第二步) - 统一使用自定义弹窗
  handleCopyEmail() {
    const targetEmail = "3252955872@qq.com";
    
    // 🔴 确保拦截微信官方的 toast（如果存在）
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    
    wx.setClipboardData({
      data: targetEmail,
      success: () => {
        // 🔴 再次确保关闭微信官方 toast（如果被触发）
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
        // 关闭弹窗并重置状态
        this.setData({ showModal: false, emailContent: '', step: 1 });
        // 显示自定义"内容已复制"弹窗（白色，大一点）
        this.setData({ showCopySuccessModal: true });
        // 2秒后自动关闭
        setTimeout(() => {
          this.setData({ showCopySuccessModal: false });
        }, 2000);
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