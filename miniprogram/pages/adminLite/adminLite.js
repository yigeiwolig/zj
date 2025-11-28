const formatTime = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

Page({
  data: {
    form: {
      title: '',
      subtitle: '',
      cover: '',
      tags: '',
      description: '',
      cta: ''
    },
    submitting: false,
    lastSubmission: null
  },

  onShow() {
    const cache = wx.getStorageSync('admin-lite-latest');
    if (cache) {
      this.setData({ lastSubmission: cache });
    }
  },

  async handleSubmit(event) {
    const formData = event.detail.value;
    if (!formData.title) {
      wx.showToast({ title: '标题必填', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    await new Promise((resolve) => setTimeout(resolve, 600));
    const submission = {
      ...formData,
      time: formatTime()
    };
    wx.setStorageSync('admin-lite-latest', submission);
    this.setData({
      submitting: false,
      lastSubmission: submission
    });
    wx.showToast({ title: '已保存至本地', icon: 'success' });
  }
});

