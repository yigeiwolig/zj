Page({
  data: {
    isLoaded: false,     // 核心开关：控制堆叠还是炸开
    finalMargin: 0,      // 动态控制 Swiper 的间距
    currentIndex: 0,
    list: [
      { 
        id: 3, 
        title: '产品上新', 
        en: 'NEW ARRIVALS', 
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
        // 【已修复】完美镂空星标礼盒 - 解决了星星破碎的问题
        // 重新绘制了路径，确保星星是干净的剪切效果，星星位置已调整到礼盒正中间
        iconSvg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMjAsNkgxNlY0QTIsMiAwIDAsMCAxNCwySDEwQTIsMiAwIDAsMCA4LDRWNkg0QTIsMiAwIDAsMCAyLDhWMTFBMSwxIDAgMCwwIDMsMTJWMjBBMiwyIDAgMCwwIDUsMjJIMTlBMiwyIDAgMCwwIDIxLDIwVjEyQTEsMSAwIDAsMCAyMiwxMVY4QTIsMiAwIDAsMCAyMCw2Wk0xMiwxNi40TDguMjQsMTguNjdMOS4yNCwxNC4zOUw1LjkyLDExLjUxTDEwLjMsMTAuODdMMTIsNi44NkwxMy43MSwxMC44N0wxOC4wOCwxMS41MUwxNC43NiwxNC4zOUwxNS43NiwxOC42N0wxMiwxNi40WiIvPjwvc3ZnPg=="
      },
      { 
        id: 2, 
        title: '我的信息', 
        en: 'MY PROFILE', 
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
        iconSvg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+PHBhdGggZD0iTTEyLDE5LjJDOS41LDE5LjIgNy4yOSwxNy45MiA2LDE2QzYuMDMsMTQgMTAsMTIuOSAxMiwxMi45QzE0LDEyLjkgMTcuOTcsMTQgMTgsMTZDMTYuNzEsMTcuOTIgMTQuNSwxOS4yIDEyLDE5LjJNMTIsNUEzLDMgMCAwLDEgMTUsOEEzLDMgMCAwLDEgMTIsMTFBMywzIDAgMCwxIDksOEEzLDMgMCAwLDEgMTIsNU0xMiwyQTEwLDEwIDAgMCwwIDIsMTJBMTAsMTAgMCAwLDAgMTIsMjJBMTAsMTAgMCAwLDAgMjIsMTJBMTAsMTAgMCAwLDAgMTIsMloiLz48L3N2Zz4="
      },
      { 
        id: 4, 
        title: '产品选购', 
        en: 'SHOPPING', 
        // 【已修改】极光紫：高端、神秘、品质
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        // 图标：购物车 (保持不变)
        iconSvg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+PHBhdGggZD0iTTE3LDE4QTIsMiAwIDAsMSAxOSwyMEEyLDIgMCAwLDEgMTcsMjJDMTUuODksMjIgMTUsMjEuMSAxNSwyMEMxNSwxOC44OSAxNS44OSwxOCAxNywxOE0xLDJWNEgyTDYuNiwxMS41OUw1LjI0LDE0LjA0QzUuMDksMTQuMzIgNSwxNC42NSA1LDE1QTIsMiAwIDAsMCA3LDE3SDE5VjE1SDcuNDJBMC4yNSwwLjI1IDAgMCwxIDcuMTcsMTQuNzVDNy4xNywxNC43IDcuMTgsMTQuNjYgNy4yLDE0LjYzTDguMSwxM0gxNS41NUMxNi4zLDEzIDE2Ljk2LDEyLjU4IDE3LjMsMTEuOTdMMjAuODgsNS41QzIwLjk1LDUuMzQgMjEsNS4xNyAyMSw1QTEsMSAwIDAgMCAyMCw0SDUuMjFMNC4yNywyTTcsMThBMiwyIDAgMCAxIDksMjBBMiwyIDAgMCAxIDcsMjJDNS44OSwyMiA1LDIxLjEgNSwyMEM1LDE4Ljg5IDUuODksMTggNywxOFoiLz48L3N2Zz4="
      },
      { 
        id: 1, 
        title: '控制中心', 
        en: 'CONTROL CENTER', 
        gradient: 'linear-gradient(135deg, #2C3E50 0%, #000000 100%)', 
        iconSvg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+PHBhdGggZD0iTTExLDJWNC4wN0M3LjM4LDQuNTMgNC41Myw3LjM4IDQuMDcsMTFIMlYxM0g0LjA3QzQuNTMsMTYuNjIgNy4zOCwxOS40NyAxMSwxOS45M1YyMkgxM1YxOS45M0MxNi42MiwxOS40NyAxOS40NywxNi42MiAxOS45MywxM0gyMlYxMUgxOS45M0MxOS40Nyw3LjM4IDE2LjYyLDQuNTMgMTMsNC4wN1YySDExTTEyLDZBNiw2IDAgMCwxIDE4LDEyQTYsNiAwIDAsMSAxMiwxOEE2LDYgMCAwLDEgNiwxMkE2LDYgMCAwLDEgMTIsNk0xMiw4QTQsNCAwIDAsMCA4LDEyQTQsNCAwIDAsMCAxMiwxNkE0LDQgMCAwLDAgMTYsMTJBNCw0IDAgMCwwIDEyLDhaIi8+PC9zdmc+"
      },
      { 
        id: 5, 
        title: '排行榜单', 
        en: 'RANKING LIST', 
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 
        iconSvg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+PHBhdGggZD0iTTQsMThWMTNIOVYxOEg0TTEwLDE4VjlIMTVWMThIMTBNMTYsMThWMTRIMjFWMThIMTZaIi8+PC9zdmc+"
      }
    ]
  },

  onLoad() {
    this.calculateMargin();
    
    // 延时 600ms：
    // 1. 给页面初次渲染留出时间，确保用户先看到"一张卡"的堆叠状态
    // 2. 然后再触发 isLoaded，开始发牌
    setTimeout(() => {
      this.setData({ isLoaded: true });
    }, 600);
  },

  calculateMargin() {
    const { windowHeight, windowWidth } = wx.getSystemInfoSync();
    // 这里的 280 是卡片高度(rpx)
    const cardHeightPx = (windowWidth / 750) * 280; 
    
    // 计算让上下卡片露出多少
    // 减去 40 可以让间距稍微紧凑一点，更有"扇形"展开的感觉
    const margin = (windowHeight - cardHeightPx) / 2 - 40; 
    
    this.setData({
      finalMargin: margin // 存储计算结果，不直接赋值给Swiper，等待动画触发
    });
  },

  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    });
  },

  // 卡片点击事件
  onCardTap(e) {
    console.log('卡片点击事件触发', e.currentTarget.dataset);
    const { id, title } = e.currentTarget.dataset;
    
    if (!id) {
      console.error('卡片ID未获取到');
      return;
    }
    
    // 根据卡片ID跳转到对应页面
    if (id === 3) {
      // 产品上新
      console.log('准备跳转到产品上新页面');
      wx.navigateTo({
        url: '/pages/pagenew/pagenew',
        success: () => {
          console.log('跳转成功');
        },
        fail: (err) => {
          console.error('跳转失败', err);
          wx.showToast({
            title: '跳转失败，请检查页面路径',
            icon: 'none'
          });
        }
      });
    } else {
      // 其他卡片可以在这里添加跳转逻辑
      wx.showToast({
        title: `${title}功能开发中`,
        icon: 'none'
      });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
