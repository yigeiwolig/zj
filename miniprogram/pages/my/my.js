Page({

  data: {

    currentOrderIndex: 0,

    showModal: false,

    bluetoothReady: false,

    modelOptions: ['F1 PRO', 'F1 MAX', 'F2 PRO', 'F2 MAX', 'F2 PRO Long', 'F2 MAX Long'],

    modelIndex: null,

    buyDate: '',

    

    // 模拟订单数据

    orders: [

      { id: 1, state: 0, productName: 'F2 PRO Long Edition', orderId: 'ORD20251221001', time: '2025-12-21 09:12' },

      { id: 2, state: 1, productName: 'Vision Pro G1', shippingId: 'SF144290031', lastLogistics: '包裹已到达 [上海静安分部]' },

      { id: 3, state: 2, productName: 'Smart Hub Mini', orderId: 'ORD20251105992', shippingId: 'YT99820102', time: '2025-12-20' }

    ],



    // 模拟设备数据

    deviceList: [

      { name: 'F2 PRO Long', sn: 'F2L-882019902', days: 482, hasExtra: true, expiryDate: '2026-12-15', activations: 12, firmware: 'v3.2.1' },

      { name: 'F1 MAX', sn: 'F1M-110293308', days: 28, hasExtra: false, expiryDate: '2026-01-20', activations: 1, firmware: 'v1.0.5' }

    ]

  },



  onOrderChange(e) {

    this.setData({ currentOrderIndex: e.detail.current });

  },



  copyData(e) {

    const text = e.currentTarget.dataset.text;

    wx.setClipboardData({

      data: text,

      success: () => wx.showToast({ title: '单号已复制', icon: 'none' })

    });

  },



  openBindModal() { this.setData({ showModal: true }); },

  closeBindModal() { this.setData({ showModal: false }); },



  startConnect() {

    this.setData({ bluetoothReady: false });

    wx.showLoading({ title: '搜索中...' });

    setTimeout(() => {

      wx.hideLoading();

      this.setData({ bluetoothReady: true });

    }, 1500);

  },



  onModelChange(e) { this.setData({ modelIndex: e.detail.value }); },

  onDateChange(e) { this.setData({ buyDate: e.detail.value }); },



  removeDevice(e) {

    const index = e.currentTarget.dataset.index;

    wx.showModal({

      title: '解除绑定',

      content: '确定要移除该设备并放弃相关质保权益吗？',

      confirmColor: '#FF3B30',

      success: (res) => {

        if (res.confirm) {

          let list = this.data.deviceList;

          list.splice(index, 1);

          this.setData({ deviceList: list });

        }

      }

    });

  }

});


