Page({
  data: {
    currentIndex: 0, // 当前选中的索引
    list: [
      {
        id: 0,
        title: '全新产品',
        desc: 'New Arrivals',
        icon: '', // 第一个用CSS画黑球
        bgColor: '#f5f5f7',
        activeColor: '#f5f5f7',
        iconColor: '#000'
      },
      {
        id: 1,
        title: '产品选购',
        desc: 'Shop All',
        icon: '🛍️', 
        bgColor: '#E1F0FF', // 淡蓝背景
        activeColor: '#007AFF', // 激活变深蓝
        iconColor: '#007AFF'
      },
      {
        id: 2,
        title: '每日排行',
        desc: 'Daily Top',
        icon: '🔥',
        bgColor: '#FFF0E0', // 淡橙背景
        activeColor: '#FF9500', // 激活变深橙
        iconColor: '#FF9500'
      },
      {
        id: 3,
        title: '我的信息',
        desc: 'My Profile',
        icon: '👤',
        bgColor: '#E0F8E0', // 淡绿背景
        activeColor: '#34C759', // 激活变翠绿
        iconColor: '#34C759'
      },
      {
        id: 4,
        title: '控制中心',
        desc: 'Settings',
        icon: '⚡',
        bgColor: '#333333', // 深灰
        activeColor: '#000000', // 纯黑
        iconColor: '#FFFFFF'
      }
    ]
  },

  // 监听轮播图切换
  onSwiperChange(e) {
    const { current } = e.detail;
    this.setData({
      currentIndex: current
    });
    
    // 可选：添加轻微震动反馈，增加高级感
    wx.vibrateShort({ type: 'light' });
  }
});





