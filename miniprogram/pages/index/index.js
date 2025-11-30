Page({
  data: {
    step: 0, // 0:初始, 1:缩小, 2:后退蓄力, 3:冲刺+出字, 4:停留展示, 5:掉落+转场
  },

  handleAccess() {
    if (this.data.step > 0) return; // 防止重复点击

    // === Step 1: 变身 (水滴 -> 齿轮) ===
    this.setData({ step: 1 });

    // 0.5s 后进入 Step 2
    setTimeout(() => {
      // === Step 2: 蓄力 (向左滚) ===
      this.setData({ step: 2 });
      
      // 0.8s 后进入 Step 3
      setTimeout(() => {
        // === Step 3: 冲刺 (向右滚 + 文字跳出) ===
        // 这里动画设置为 1.6秒
        this.setData({ step: 3 });

        // 1.6s (滚动结束) + 0.3s (短暂停留) = 1.9s 后进入下一步
        setTimeout(() => {
          // === Step 4: 停留展示完成，准备掉落 ===
          // 实际上界面在 Step 3 结束时就是静止的，这里的 Step 4 主要是为了标记逻辑点
          this.setData({ step: 4 }); 
          
          // 紧接着执行掉落
          this.doFallAndSwitch();

        }, 1900); // 1600ms滚动 + 300ms短暂停留

      }, 800); 

    }, 500);
  },

  doFallAndSwitch() {
    // === Step 5: 齿轮掉落 ===
    this.setData({ step: 5 });

    // 等待掉落动画完成（0.8s）后再跳转
    // 让用户能看到完整的掉落动画
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/products/products',
        success: () => {
          this.setData({ step: 0 });
        }
      });
    }, 800); // 等待掉落动画完成
  }
})
