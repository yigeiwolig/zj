// pages/admin/admin.js
Page({
  data: {
    // 这里的数据应当从全局或云数据库获取
    products: [
      { name: 'F1 PRO / MAX' },
      { name: 'F2 PRO / MAX' },
      { name: 'F2 MAX LONG' }
    ],
    types: ['踏板车', '跨骑车', '电摩/电动自行车'],
    chapters: ['章节 01：支架固定', '章节 02：走线连接']
  },

  // 添加数据
  addItem: function(e) {
    const type = e.currentTarget.dataset.type;
    wx.showModal({
      title: '添加新项',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          if (type === 'product') {
            let list = this.data.products;
            list.push({ name: res.content });
            this.setData({ products: list });
          } else if (type === 'type') {
            let list = this.data.types;
            list.push(res.content);
            this.setData({ types: list });
          }
          wx.showToast({ title: '添加成功' });
        }
      }
    });
  },

  // 删除数据
  deleteItem: function(e) {
    const { type, index } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定吗？',
      success: (res) => {
        if (res.confirm) {
          if (type === 'product') {
            let list = this.data.products;
            list.splice(index, 1);
            this.setData({ products: list });
          } else if (type === 'type') {
            let list = this.data.types;
            list.splice(index, 1);
            this.setData({ types: list });
          }
        }
      }
    });
  }
});

