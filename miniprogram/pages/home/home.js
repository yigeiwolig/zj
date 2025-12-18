const app = getApp();

Page({
  data: {
    allServices: [
      { name: '车辆快修', icon: '🔧' }, { name: '车辆保养', icon: '⚙️' },
      { name: '车辆销售', icon: '🏍️' }, { name: '机车咖啡', icon: '☕' },
      { name: '车辆精修', icon: '🛠️' }, { name: '洗车服务', icon: '🚿' },
      { name: '机油更换', icon: '🛢️' }
    ],
    shops: [
      { id: 1, name: "杜卡迪浦东", sub: "官方旗舰店", dist: "0.8", status: "营业中", statusColor: "#00C853", img: "https://picsum.photos/600/400?1", address: "上海市浦东新区世博大道1200号", latitude: 0, longitude: 0, phone: "021-8888 8888", time: "10:00 - 22:00", services: ['车辆销售', '车辆保养', '机车咖啡'] },
      { id: 2, name: "铁骑工坊", sub: "复古改装", dist: "2.4", status: "繁忙", statusColor: "#FF9500", img: "https://picsum.photos/600/400?2", address: "上海市静安区汶水路创意园", latitude: 0, longitude: 0, phone: "138 0000 0000", time: "09:00 - 18:00", services: ['车辆精修', '机油更换'] },
    ],

    cardStyles: [],
    scroll: 0,
    target: 0,
    isDetailOpen: false,
    isAdmin: false,
    clickCount: 0,

    showPhantom: false,
    isExpanded: false,
    phantomStyle: '', 
    activeItem: {},   
    
    isEditing: false,
    isAdding: false, // 标记是否正在添加新卡片
    editData: {},
    
    // 新增：弹窗控制变量
    showAuthModal: false,
    inputPwd: ''
  },

  onLoad() {
    this.startY = 0;
    this.startScroll = 0;
    this.isDragging = false;
    
    // 1. 先初始化数据
    this.preprocessData(); 
    
    // 2. 初始位置定在最顶端（最远的店）
    this.setData({
      scroll: 0,
      target: 0
    });
    
    // 3. 渲染轮盘
    this.updateWheel();
  },

  preprocessData() {
    // 复制数组并添加 serviceSet
    let list = this.data.shops.map(item => {
      const serviceSet = {};
      (item.services || []).forEach(s => serviceSet[s] = true);
      return { ...item, serviceSet };
    });

    // --- 核心排序：远(大) -> 近(小) ---
    // 目标：远的在上面（Index 0），近的在下面（Index N）
    // 降序排列：大的在前（远的在上面）
    list.sort((a, b) => {
      // 强制转为浮点数，如果为空则默认为 0
      const valA = parseFloat(a.dist) || 0;
      const valB = parseFloat(b.dist) || 0;
      
      // 升序排列：小的在前
      // valA - valB: 如果 A < B，返回负数，A 排在 B 前面
      // 根据轮盘显示逻辑，Index 0 显示在上面，所以升序让远的在上面
      return valA - valB; 
    });

    // 强制更新数据
    this.setData({ shops: list });
    return list;
  },

  // --- 管理员认证 ---
  onBgTap(e) {
    if (e.mark && e.mark.type === 'card') return;
    this.data.clickCount++;
    if (this.clickTimer) clearTimeout(this.clickTimer);
    
    this.clickTimer = setTimeout(() => {
      this.data.clickCount = 0;
    }, 1500);

    if (this.data.clickCount >= 5) {
      this.data.clickCount = 0;
      
      // 如果已经是管理员，询问退出
      if (this.data.isAdmin) {
        wx.showModal({
          title: '提示', content: '是否退出管理员模式？',
          success: (res) => { if (res.confirm) this.setData({ isAdmin: false }); }
        });
      } else {
        // 如果不是，打开自定义密码弹窗
        this.setData({ showAuthModal: true, inputPwd: '' });
      }
    }
  },

  // 2. 新增：监听输入
  onAuthInput(e) {
    this.setData({ inputPwd: e.detail.value });
  },

  // 3. 新增：关闭弹窗
  closeAuthModal() {
    this.setData({ showAuthModal: false, inputPwd: '' });
  },

  // 4. 新增：校验密码
  checkAuth() {
    if (this.data.inputPwd === "3252955872") {
      this.setData({ 
        isAdmin: true,
        showAuthModal: false,
        inputPwd: ''
      });
      wx.showToast({ title: '管理员模式: ON', icon: 'success' });
    } else {
      wx.showToast({ title: '密码错误', icon: 'error' });
      // 可以选择是否清空输入框
      // this.setData({ inputPwd: '' }); 
    }
  },

  // --- 1. 新增卡片 (修复：新增时绝对不排序，确保打开的是新卡片) ---
  onAddShop() {
    const newShop = {
      id: 'new_' + Date.now(), // 加个前缀确保ID独特
      name: "新店铺",
      sub: "店铺描述",
      dist: "0.0",
      status: "营业中",
      statusColor: "#00C853",
      img: "https://picsum.photos/600/400?new",
      address: "", 
      phone: "", 
      time: "09:00 - 18:00",
      services: []
    };

    const list = this.data.shops;
    list.unshift(newShop); // 强行插队到第一个
    
    this.setData({ 
      shops: list, 
      scroll: 0, 
      target: 0, 
      isAdding: true 
    });
    
    // ⚠️ 严禁在这里调用 preprocessData() 排序！
    // 否则新卡片(0km)会跑到底部，导致你打开的是旧卡片。
    // 只更新样式，不排序：
    this.updateWheel();

    // 打开第0个 (肯定是刚才新增的那个)
    setTimeout(() => {
      this.openDetail(0);
      this.setData({ isEditing: true });
    }, 100);
  },

  updateWheel() {
    const { shops, scroll } = this.data;
    const styles = [];
    
    // 边界保护
    let currentIndex = Math.round(scroll);
    if(currentIndex < 0) currentIndex = 0;
    if(currentIndex >= shops.length) currentIndex = shops.length - 1;

    shops.forEach((item, i) => {
      const diff = i - scroll;
      
      // 性能优化
      if (Math.abs(diff) > 3.5) {
        styles.push('display: none;');
        return;
      }

      const rotate = diff * 12; 
      let tx = 0; 
      let scale = 0.95; 
      let opacity = 0.5;

      // 选中项 (中间那个)
      if (Math.abs(diff) < 1) {
        const p = 1 - Math.abs(diff);
        
        // --- 修改点：位置修正 ---
        // 之前是 -160 (向左移太多了)
        // 现在改为 -110 (稍微往右回一点，视觉更居中)
        tx = -110 * p; 
        
        scale = 0.95 + (0.05 * p);
        opacity = 0.5 + (0.5 * p);
      }

      // 旋转轴心 1400rpx
      const style = `
        display: flex;
        transform: rotate(${rotate}deg) translate3d(${tx}rpx, 0, 0) scale(${scale});
        opacity: ${opacity};
        z-index: ${100 - Math.round(Math.abs(diff))};
      `;
      styles.push(style);
    });

    this.setData({ cardStyles: styles, currentIndex });
  },

  loop() {
    if (!this.isDragging && !this.data.isDetailOpen) {
      const nextScroll = this.data.scroll + (this.data.target - this.data.scroll) * 0.1;
      if (Math.abs(nextScroll - this.data.target) < 0.005) {
        this.setData({ scroll: this.data.target });
      } else {
        this.setData({ scroll: nextScroll });
        this.updateWheel();
        this.animationFrame = setTimeout(() => this.loop(), 16); 
      }
    }
  },

  onTouchStart(e) { if (this.data.isDetailOpen) return; this.isDragging = true; this.startY = e.touches[0].clientY; this.startScroll = this.data.scroll; if(this.animationFrame) clearTimeout(this.animationFrame); },
  onTouchMove(e) { if (this.data.isDetailOpen) return; const delta = this.startY - e.touches[0].clientY; this.setData({ scroll: this.startScroll + (delta / 80) }); this.updateWheel(); },
  onTouchEnd() { this.isDragging = false; let target = Math.round(this.data.scroll); target = Math.max(0, Math.min(this.data.shops.length - 1, target)); this.setData({ target }); this.loop(); },
  
  onCardTap(e) { const index = e.currentTarget.dataset.index; if (this.data.currentIndex !== index) { this.setData({ target: index }); this.loop(); return; } this.openDetail(index); },

  // --- 详情与编辑 ---
  
  // 选择图片
  chooseImage() {
    if(!this.data.isEditing) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          'editData.img': tempFilePath // 预览
        });
      }
    });
  },

  // 选择位置
  chooseLocation() {
    if(!this.data.isEditing) return;
    const that = this;
    wx.chooseLocation({
      success(res) {
        // res.name (地点名称), res.address (详细地址), res.latitude, res.longitude
        that.setData({
          'editData.address': res.address || res.name, // 优先用地址
          'editData.latitude': res.latitude,
          'editData.longitude': res.longitude
        });
      },
      fail(err) {
        console.error(err);
        wx.showToast({ title: '选择位置失败', icon: 'none' });
      }
    });
  },

  // --- 2. 打开详情 (时间解析逻辑) ---
  openDetail(index) {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const query = this.createSelectorQuery().in(this);
    
    query.select(`#card-${index}`).boundingClientRect(rect => {
      if (!rect) return;
      const item = this.data.shops[index];
      
      // 拆解时间：防止 split 报错
      let timeStr = item.time || "09:00 - 18:00";
      let parts = timeStr.split('-');
      let startT = parts[0] ? parts[0].trim() : "09:00";
      let endT = parts[1] ? parts[1].trim() : "18:00";

      this.setData({
        isDetailOpen: true,
        showPhantom: true,
        activeItem: item,
        phantomStyle: `top: ${rect.top}px; left: ${rect.left}px; width: ${rect.width}px; height: ${rect.height}px; transform: none;`,
        
        editData: {
          id: item.id, // 绑定ID
          name: item.name, sub: item.sub, dist: item.dist, 
          servicesStr: item.services.join(','),
          address: item.address, phone: item.phone, 
          
          // 时间相关
          time: timeStr, 
          startTime: startT, 
          endTime: endT,
          
          img: item.img, 
          latitude: item.latitude, longitude: item.longitude,
          selectedServices: [...item.services]
        }
      });

      setTimeout(() => {
         const targetW = sys.windowWidth * 0.88; 
         const targetLeft = (sys.windowWidth - targetW) / 2;
         this.setData({
           isExpanded: true,
           phantomStyle: `top: 58%; left: ${targetLeft}px; width: ${targetW}px; height: auto; transform: translateY(-50%);`
         });
      }, 50);
    }).exec();
  },

  // --- 5. 关闭详情 (处理取消新增的情况) ---
  closeDetail() {
    // 如果是新增状态下点击了关闭，说明用户取消了创建
    // 必须把那个临时的卡片删掉
    if (this.data.isAdding) {
      const list = this.data.shops;
      // 新增的卡片通常在第一个，或者通过 ID 删
      const cleanList = list.filter(item => item.id !== this.data.activeItem.id);
      this.setData({ 
        shops: cleanList, 
        isAdding: false 
      });
      // 刷新一下列表
      this.preprocessData();
      this.updateWheel();
    }

    const query = this.createSelectorQuery().in(this);
    // 这里要小心，如果因为取消新增删除了卡片，select 可能会找不到，需要容错
    const closeIndex = this.data.target; // 使用当前的 target 索引
    
    query.select(`#card-${closeIndex}`).boundingClientRect(rect => {
      const fallbackRect = { top: 300, left: 30, width: 300, height: 130 };
      const finalRect = rect || fallbackRect;

      this.setData({
        isExpanded: false,
        isEditing: false, 
        phantomStyle: `top: ${finalRect.top}px; left: ${finalRect.left}px; width: ${finalRect.width}px; height: ${finalRect.height}px; transform: none;`
      });

      setTimeout(() => {
        this.setData({
          showPhantom: false,
          isDetailOpen: false
        });
      }, 500); 
    }).exec();
  },

  toggleEdit() { this.setData({ isEditing: !this.data.isEditing }); },
  onEditInput(e) { const field = e.currentTarget.dataset.field; this.setData({ [`editData.${field}`]: e.detail.value }); },
  
  // 2. 新增：点击标签切换选中状态
  toggleService(e) {
    const name = e.currentTarget.dataset.name;
    let list = this.data.editData.selectedServices || [];
    
    // 如果已存在则删除，不存在则添加
    if (list.includes(name)) {
      list = list.filter(item => item !== name);
    } else {
      list.push(name);
    }
    
    this.setData({
      'editData.selectedServices': list
    });
  },

  // --- 3. 时间选择器修复 (使用 setData 路径更新) ---
  onStartTimeChange(e) {
    console.log('开始时间变了:', e.detail.value);
    this.setData({ 
      'editData.startTime': e.detail.value 
    });
  },
  
  onEndTimeChange(e) {
    console.log('结束时间变了:', e.detail.value);
    this.setData({ 
      'editData.endTime': e.detail.value 
    });
  },
  
  // --- 4. 保存编辑 (保存后重新定位) ---
  saveEdit() {
    const { editData, shops } = this.data;
    const foundIndex = shops.findIndex(s => s.id === editData.id);
    if (foundIndex === -1) return;
    
    const item = shops[foundIndex];
    item.name = editData.name;
    item.sub = editData.sub;
    item.dist = editData.dist; // 这里的 dist 会被 preprocessData 转成数字排序
    item.address = editData.address;
    item.phone = editData.phone;
    item.time = `${editData.startTime} - ${editData.endTime}`;
    item.img = editData.img;
    item.latitude = editData.latitude;
    item.longitude = editData.longitude;
    item.services = editData.selectedServices;

    // 1. 先更新本地数据（不调用 setData，避免异步问题）
    // 2. 直接对 shops 数组进行排序处理
    const sortedList = shops.map(item => {
      const serviceSet = {};
      (item.services || []).forEach(s => serviceSet[s] = true);
      return { ...item, serviceSet };
    });

    // 升序排序：小的在前，根据轮盘显示逻辑，远的在上面
    sortedList.sort((a, b) => {
      const valA = parseFloat(a.dist) || 0;
      const valB = parseFloat(b.dist) || 0;
      return valA - valB; // 升序：小的在前
    });

    // 3. 找到这个店排序后的"新家"在哪
    const newIndex = sortedList.findIndex(i => i.id === item.id);

    // 4. 一次性更新所有数据
    this.setData({ 
      shops: sortedList,
      activeItem: sortedList[newIndex],
      scroll: newIndex,
      target: newIndex,
      isEditing: false, 
      isAdding: false 
    });

    this.updateWheel();
    wx.showToast({ title: '已排序更新', icon: 'success' });
  },

  deleteShop() {
    wx.showModal({
      title: '确认删除', content: '删除后无法恢复，确定吗？',
      success: (res) => {
        if(res.confirm) {
          const list = [...this.data.shops]; // 复制数组
          list.splice(this.data.currentIndex, 1);
          
          // 先排序再更新
          const sortedList = list.map(item => {
            const serviceSet = {};
            (item.services || []).forEach(s => serviceSet[s] = true);
            return { ...item, serviceSet };
          });

          sortedList.sort((a, b) => {
            const valA = parseFloat(a.dist) || 0;
            const valB = parseFloat(b.dist) || 0;
            return valA - valB; // 升序：小的在前，远的在上面
          });
          
          this.closeDetail();
          // 稍微延迟等动画做完再刷新列表
          setTimeout(() => {
            this.setData({ shops: sortedList, scroll: 0, target: 0 });
            this.updateWheel();
          }, 500);
        }
      }
    })
  },

  openLocation() {
    const item = this.data.activeItem;
    if(item.latitude && item.longitude) {
      wx.openLocation({
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name,
        address: item.address
      })
    } else {
      wx.showToast({ title: '暂无定位数据', icon: 'none' });
    }
  },
  
  makeCall() { 
    if(this.data.activeItem.phone) wx.makePhoneCall({ phoneNumber: this.data.activeItem.phone }); 
  }
});