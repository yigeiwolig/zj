// app.js
App({
  globalData: {
    blockedLocation: null, // 被拦截的位置信息

    // 全局 UI 弹窗状态（由 app.wxml 渲染）
    ui: {
      loading: { show: false, text: '加载中...' },
      dialog: { show: false, title: '提示', content: '', showCancel: false, confirmText: '确定', cancelText: '取消', maskClosable: true },
      sheet: { show: false, title: '', items: [] },
      input: { show: false, title: '请输入', placeholder: '', value: '', maskClosable: true }
    },

    // Toast 专用计时器
    _toastTimer: null,

    // 回调暂存
    _uiCb: {
      dialogConfirm: null,
      dialogCancel: null,
      sheetSelect: null,
      inputConfirm: null,
      inputCancel: null
    },

    // 🔴 防止重复跳转到 blocked 页面的标志
    _isJumpingToBlocked: false,

    // 🔴 分享码相关
    isShareCodeUser: false, // 是否是通过分享码进入的用户
    shareCodeInfo: null,     // 分享码信息 { code, usedViews, totalViews, expiresAt }
    
    // 🔴 「去购买配件」跳转：进入售后中心时要打开的型号（如 'F1 MAX'），shouhou 读后清空
    shouhouOpenModel: '',
    // 🔴 需要预选高亮的配件名列表（如 ['固定牌支架','固定车上支架']），shouhou 读后清空
    shouhouPreselectParts: [],
    
    // 🔴 更新页面访问统计的辅助函数
    updatePageVisit: function(pageRoute) {
      // 异步调用，不阻塞页面加载
      wx.cloud.callFunction({
        name: 'updatePageVisit',
        data: { pageRoute: pageRoute },
        success: (res) => {
          console.log('[app] 页面访问统计更新成功:', pageRoute, res);
        },
        fail: (err) => {
          console.error('[app] 页面访问统计更新失败:', pageRoute, err);
        }
      });
    },
    
    // 🔴 shop页面数据预加载缓存
    shopDataCache: {
      shopTitle: null,
      topMediaList: null,
      seriesList: null,
      accessoryList: null,
      cacheTime: null, // 缓存时间戳
      isLoading: false // 是否正在加载
    }
  },

  // ======================== 全局 UI API（替代 wx.showToast/showModal/showLoading/showActionSheet） ========================
  // 统一 Loading：既支持字符串，也支持对象({ title:'...', mask:true })
  showLoading(option = '加载中...') {
    const text = typeof option === 'string' ? option : (option.title || '加载中...');
    this.globalData.ui.loading = { show: true, text };
    this._emitUI();
  },
  hideLoading() {
    this.globalData.ui.loading = { show: false, text: this.globalData.ui.loading.text };
    this._emitUI();
  },

  showDialog({
    title = '提示',
    content = '',
    showCancel = false,
    confirmText = '确定',
    cancelText = '取消',
    maskClosable = true,
    onConfirm = null,
    onCancel = null
  } = {}) {
    this.globalData.ui.dialog = { show: true, title, content, showCancel, confirmText, cancelText, maskClosable };
    this.globalData._uiCb.dialogConfirm = typeof onConfirm === 'function' ? onConfirm : null;
    this.globalData._uiCb.dialogCancel = typeof onCancel === 'function' ? onCancel : null;
    this._emitUI();
  },
  hideDialog() {
    this.globalData.ui.dialog = { ...this.globalData.ui.dialog, show: false };
    this.globalData._uiCb.dialogConfirm = null;
    this.globalData._uiCb.dialogCancel = null;
    this._emitUI();
  },

  showSheet({ title = '', items = [], onSelect = null } = {}) {
    this.globalData.ui.sheet = { show: true, title, items };
    this.globalData._uiCb.sheetSelect = typeof onSelect === 'function' ? onSelect : null;
    this._emitUI();
  },
  hideSheet() {
    this.globalData.ui.sheet = { ...this.globalData.ui.sheet, show: false };
    this.globalData._uiCb.sheetSelect = null;
    this._emitUI();
  },

  showInput({ title = '请输入', placeholder = '', value = '', maskClosable = true, onConfirm = null, onCancel = null } = {}) {
    this.globalData.ui.input = { show: true, title, placeholder, value, maskClosable };
    this.globalData._uiCb.inputConfirm = typeof onConfirm === 'function' ? onConfirm : null;
    this.globalData._uiCb.inputCancel = typeof onCancel === 'function' ? onCancel : null;
    this._emitUI();
  },
  hideInput() {
    this.globalData.ui.input = { ...this.globalData.ui.input, show: false };
    this.globalData._uiCb.inputConfirm = null;
    this.globalData._uiCb.inputCancel = null;
    this._emitUI();
  },

  // 事件派发：通知当前页面刷新 ui
  _emitUI() {
    // 用 getCurrentPages() 通知所有已挂载页面刷新 ui（避免进入新页面时 ui 未同步导致 loading 不显示）
    try {
      const pages = getCurrentPages();
      if (pages && pages.length) {
        pages.forEach(p => {
          if (p && typeof p.setData === 'function') {
            try { p.setData({ ui: this.globalData.ui }); } catch (e) {}
          }
        });
      }
    } catch (e) {
      // ignore
    }
  },

  // 内部辅助：获取当前页面上的自定义弹窗组件
  _getCustomToast() {
    try {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        return curPage.selectComponent('#custom-toast');
      }
    } catch (e) {
      console.error('[app] 获取custom-toast组件失败', e);
    }
    return null;
  },

  // ======================== 生命周期 ========================
  onLaunch: function (options) {
    // 🔴 1. 启动时立即检查PC端
    this.checkIsPC();

    // 🔴 2. 检测分享码参数
    if (options && options.query && options.query.shareCode) {
      const shareCode = options.query.shareCode
      console.log('[app] 检测到分享码参数:', shareCode)
      this.verifyShareCode(shareCode)
    }

    // ======================== 方案A：全局拦截微信官方弹窗 ========================
    // 将 wx.showModal / wx.showToast / wx.showLoading / wx.hideLoading 统一替换为自定义白底黑字 UI
    try {
      // 保存原生 API (防止重复保存)
      if (!wx.__mt_oldShowModal) wx.__mt_oldShowModal = wx.showModal;
      if (!wx.__mt_oldShowToast) wx.__mt_oldShowToast = wx.showToast;
      if (!wx.__mt_oldHideToast) wx.__mt_oldHideToast = wx.hideToast;
      if (!wx.__mt_oldShowLoading) wx.__mt_oldShowLoading = wx.showLoading;
      if (!wx.__mt_oldHideLoading) wx.__mt_oldHideLoading = wx.hideLoading;
      if (!wx.__mt_oldSetClipboardData) wx.__mt_oldSetClipboardData = wx.setClipboardData;

      // 辅助函数：获取自定义弹窗组件
      const getToast = () => {
        try {
          const pages = getCurrentPages();
          const curPage = pages[pages.length - 1];
          if (curPage) {
            return curPage.selectComponent('#custom-toast');
          }
        } catch (e) {
          console.error('[app] 获取custom-toast组件失败', e);
        }
        return null;
      };

      // 互斥：尝试关闭页面上可能存在的自定义弹窗/遮罩，避免与 custom-toast 重叠
      const hideKnownPagePopups = () => {
        try {
          const pages = getCurrentPages();
          const curPage = pages[pages.length - 1];
          if (!curPage || !curPage.setData || !curPage.data) return;
          const d = curPage.data || {};
          const patch = {};
          const knownFlags = [
            'showCustomSuccessModal',
            'customSuccessModalClosing',
            'showCopySuccessModal',
            'showShareCodeGenerateModal',
            'showConfirmModal',
            'showModal', // my 页底部自定义 modal
            'autoToastClosing' // my 页自动提示退出动画
          ];
          knownFlags.forEach(k => {
            if (d[k]) patch[k] = false;
          });
          // 🔴 特殊处理：autoToast 是对象，需要单独处理
          if (d.autoToast && d.autoToast.show) {
            patch['autoToast.show'] = false;
          }
          if (Object.keys(patch).length) curPage.setData(patch);
        } catch (e) {
          // ignore
        }
      };

      // 1) showModal
      wx.showModal = (opt = {}) => {
        // 如果使用了 editable 等高级特性，直接调用官方原方法（组件暂不支持）
        if (opt && opt.editable) {
          return wx.__mt_oldShowModal ? wx.__mt_oldShowModal(opt) : undefined;
        }
        
        const toast = getToast();
        if (toast) {
          hideKnownPagePopups();
          toast.showModal(opt);
        } else {
          // 降级回退到原生
          console.warn('[app] 当前页面未找到 #custom-toast 组件，降级使用原生 showModal');
          return wx.__mt_oldShowModal(opt);
        }
      };

      // 2) showToast
      wx.showToast = (opt = {}) => {
        // 处理字符串参数（兼容 wx.showToast('提示') 这种调用方式）
        if (typeof opt === 'string') {
          opt = { title: opt };
        }
        
        const toast = getToast();
        if (toast) {
          console.log('[app] 使用自定义弹窗显示 Toast:', opt);
          hideKnownPagePopups();
          toast.showToast(opt);
        } else {
          console.warn('[app] 当前页面未找到 #custom-toast 组件，降级使用原生 showToast', opt);
          return wx.__mt_oldShowToast(opt);
        }
      };
      wx.hideToast = () => {
        const toast = getToast();
        if (toast) toast.hideToast();
        else wx.__mt_oldHideToast();
      };

      // 3) showLoading/hideLoading
      wx.showLoading = (opt = {}) => {
        const toast = getToast();
        if (toast) {
          hideKnownPagePopups();
          toast.showLoading(opt);
        } else {
          console.warn('[app] 当前页面未找到 #custom-toast 组件，降级使用原生 showLoading');
          return wx.__mt_oldShowLoading(opt);
        }
      };
      wx.hideLoading = () => {
        const toast = getToast();
        if (toast) toast.hideLoading();
        else wx.__mt_oldHideLoading();
      };

      // 4) setClipboardData - 拦截并立即隐藏官方弹窗
      wx.setClipboardData = (opt = {}) => {
        const originalSuccess = opt.success;
        const originalFail = opt.fail;
        
        // 🔴 复制前立即隐藏可能的官方弹窗
        if (wx.__mt_oldHideToast) {
          wx.__mt_oldHideToast();
        }
        if (wx.__mt_oldHideLoading) {
          wx.__mt_oldHideLoading();
        }
        
        // 包装 success 回调，立即隐藏官方弹窗
        opt.success = (res) => {
          // 🔴 立即疯狂隐藏官方弹窗（多次尝试，不同时机）
          const hideOfficialToast = () => {
            try {
              if (wx.__mt_oldHideToast) wx.__mt_oldHideToast();
              if (wx.__mt_oldHideLoading) wx.__mt_oldHideLoading();
            } catch (e) {}
          };
          
          // 立即执行多次，确保官方弹窗不会显示
          hideOfficialToast();
          setTimeout(hideOfficialToast, 1);
          setTimeout(hideOfficialToast, 3);
          setTimeout(hideOfficialToast, 5);
          setTimeout(hideOfficialToast, 10);
          setTimeout(hideOfficialToast, 15);
          setTimeout(hideOfficialToast, 20);
          setTimeout(hideOfficialToast, 30);
          setTimeout(hideOfficialToast, 50);
          setTimeout(hideOfficialToast, 80);
          setTimeout(hideOfficialToast, 120);
          setTimeout(hideOfficialToast, 180);
          setTimeout(hideOfficialToast, 250);
          setTimeout(hideOfficialToast, 350);
          setTimeout(hideOfficialToast, 500);
          
          // 执行原始 success 回调
          if (originalSuccess) originalSuccess(res);
        };
        
        // 调用原生 API
        return wx.__mt_oldSetClipboardData(opt);
      };
    } catch (e) {
      console.error('[app] 替换API失败:', e);
    }

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-4gn1heip7c38ec6c',
        traceUser: true,
      });
      console.log('✅ 云开发已在 app.js 初始化，环境ID: cloudbase-4gn1heip7c38ec6c');
      
      // 🔴 预加载shop页面数据（不阻塞启动）
      this.preloadShopData();
      
      // 🔴 应用启动时检查封禁状态（确保重启后也能拦截）
      // PC端检测已在onLaunch最开始执行，这里不再重复检查
      // 开发环境下跳过封禁检查，避免误判和自动解封
      try {
        const deviceInfo = wx.getDeviceInfo();
        const isDevTools = deviceInfo.platform === 'devtools';
        if (!isDevTools) {
          this.checkBanStatusOnLaunch();
        } else {
          console.log('[app] 开发工具环境，跳过封禁状态检查');
        }
      } catch (e) {
        console.warn('[app] 无法判断环境，跳过封禁检查', e);
      }
    }
  },

  onShow: function () {
    // 🔴 2. 每次从后台切回前台，或者从别的页面切回来时，再次检查
    // 防止用户通过"浮窗"、"分享卡片"等方式绕过
    this.checkIsPC();
  },

  // --- 🔴 核心检测函数 ---
  checkIsPC() {
    try {
      const deviceInfo = wx.getDeviceInfo();
      const platform = deviceInfo.platform.toLowerCase();

      // 🔴 开发工具环境下跳过检测，允许开发调试
      if (platform === 'devtools') {
        console.log('[app] 开发工具环境，跳过PC端检测');
        return;
      }

      // 定义要封禁的平台
      // windows: PC微信
      // mac: Mac微信
      const bannedPlatforms = ['windows', 'mac']; 

      if (bannedPlatforms.includes(platform)) {
        console.warn('[app] 检测到非法设备访问:', platform);
        
        // 获取当前页面栈，避免在 blocked 页面重复跳转导致死循环
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && currentPage.route && currentPage.route.includes('pages/blocked/blocked')) {
          console.log('[app] 已在封禁页面，跳过重复跳转');
          return; 
        }

        // 强制重启动到封禁页 (使用 reLaunch 清空所有页面栈，让用户无法返回)
        wx.reLaunch({
          url: '/pages/blocked/blocked?type=pc',
          fail: (err) => {
            // 如果跳转失败，延迟重试
            console.error('[app] PC端跳转失败，延迟重试:', err);
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/blocked/blocked?type=pc'
              });
            }, 300);
          }
        });
        
        // 再次隐藏 home 按钮（虽然 reLaunch 已经清空了栈，加一层保险）
        if (wx.hideHomeButton) {
          wx.hideHomeButton();
        }
      }
    } catch (e) {
      // 如果获取失败，为了安全起见，可以选择放行或阻断
      // 这里选择放行，避免误判导致正常用户无法使用
      console.error('[app] 设备检测失败', e);
    }
  },

  // 🔴 应用启动时检查封禁状态
  async checkBanStatusOnLaunch() {
    try {
      // 🔴 开发环境下跳过封禁检查，避免误判
      const deviceInfo = wx.getDeviceInfo();
      const isDevTools = deviceInfo.platform === 'devtools';
      if (isDevTools) {
        console.log('[app] 开发工具环境，跳过封禁检查');
        return;
      }

      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();
      
      // 🔴 同时检查 login_logbutton 和 login_logs 两个集合
      const [buttonRes, logRes] = await Promise.all([
        db.collection('login_logbutton')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get(),
        db.collection('login_logs')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get()
      ]);
      
      // 检查 login_logbutton 集合
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        if (qiangli) {
          console.log('[app] ⚠️ 检测到强制封禁按钮 qiangli 已开启（login_logbutton），无视一切放行，直接封禁');
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }, 500);
          return;
        }
      }

      // 🔴 同时检查 login_logs 集合（兼容用户在 login_logs 中设置 qiangli 的情况）
      if (logRes.data && logRes.data.length > 0) {
        const log = logRes.data[0];
        const qiangli = log.qiangli === true || log.qiangli === 1 || log.qiangli === 'true' || log.qiangli === '1';
        if (qiangli) {
          console.log('[app] ⚠️ 检测到强制封禁按钮 qiangli 已开启（login_logs），无视一切放行，直接封禁');
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          }, 500);
          return;
        }
      }
      
      // 🔴 关键修复：先检查是否是管理员，管理员豁免封禁检查（但qiangli优先级更高）
      let adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data && adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan')
          .where({ _openid: openid })
          .limit(1)
          .get();
      }
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        console.log('[app] ✅ 检测到管理员身份，豁免封禁检查');
        return; // 管理员直接返回，不检查封禁状态
      }
      
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const rawFlag = btn.isBanned;
        const isBanned = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';
        
        if (isBanned) {
          console.log('[app] 应用启动时检测到封禁状态，跳转到封禁页');
          const banType = btn.banReason === 'screenshot' || btn.banReason === 'screen_record' 
            ? 'screenshot' 
            : (btn.banReason === 'location_blocked' ? 'location' : 'banned');
          
          // 延迟一下，确保页面加载完成
          setTimeout(() => {
            wx.reLaunch({ url: `/pages/blocked/blocked?type=${banType}` });
          }, 500);
          return;
        }
      }
    } catch (err) {
      const msg = (err.errMsg || err.message || '') + '';
      if (msg.indexOf('access_token') !== -1) {
        console.warn('[app] 云会话未就绪，跳过启动封禁检查（请确保已登录/选择云环境）');
        return;
      }
      console.error('[app] 启动时检查封禁状态失败:', err);
    }
  },

  // 🔴 全局定时检查 qiangli 强制封禁（所有页面都会调用）
  _qiangliCheckTimer: null, // 定时器ID

  // 🔴 启动定时检查 qiangli 强制封禁
  startQiangliCheck() {
    // 清除旧的定时器
    if (this._qiangliCheckTimer) {
      clearInterval(this._qiangliCheckTimer);
      this._qiangliCheckTimer = null;
    }

    // 立即检查一次
    this.checkQiangliStatus();

    // 每2秒检查一次
    this._qiangliCheckTimer = setInterval(() => {
      this.checkQiangliStatus();
    }, 2000);
  },

  // 🔴 停止定时检查
  stopQiangliCheck() {
    if (this._qiangliCheckTimer) {
      clearInterval(this._qiangliCheckTimer);
      this._qiangliCheckTimer = null;
    }
  },

  // 🔴 检查 qiangli 强制封禁状态
  async checkQiangliStatus() {
    try {
      // 🔴 开发环境下跳过封禁检查，避免误判
      const deviceInfo = wx.getDeviceInfo();
      const isDevTools = deviceInfo.platform === 'devtools';
      if (isDevTools) {
        return; // 开发工具环境，直接返回
      }

      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      const openid = loginRes.result.openid;
      const db = wx.cloud.database();

      // 🔴 先检查是否是管理员，管理员豁免检查
      let adminCheck = await db.collection('guanliyuan')
        .where({ openid: openid })
        .limit(1)
        .get();
      
      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data && adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan')
          .where({ _openid: openid })
          .limit(1)
          .get();
      }
      
      if (adminCheck.data && adminCheck.data.length > 0) {
        return; // 管理员直接返回，不检查封禁状态
      }

      // 🔴 检查 qiangli 强制封禁（同时检查 login_logbutton 和 login_logs 两个集合）
      const [buttonRes, logRes] = await Promise.all([
        db.collection('login_logbutton')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get(),
        db.collection('login_logs')
          .where({ _openid: openid })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get()
      ]);

      // 检查 login_logbutton 集合
      if (buttonRes.data && buttonRes.data.length > 0) {
        const btn = buttonRes.data[0];
        const qiangli = btn.qiangli === true || btn.qiangli === 1 || btn.qiangli === 'true' || btn.qiangli === '1';
        
        if (qiangli) {
          console.log('[app] 🚫 定时检查：检测到 qiangli 强制封禁（login_logbutton），立即跳转');
          this.stopQiangliCheck();
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }

      // 🔴 同时检查 login_logs 集合（兼容用户在 login_logs 中设置 qiangli 的情况）
      if (logRes.data && logRes.data.length > 0) {
        const log = logRes.data[0];
        const qiangli = log.qiangli === true || log.qiangli === 1 || log.qiangli === 'true' || log.qiangli === '1';
        
        if (qiangli) {
          console.log('[app] 🚫 定时检查：检测到 qiangli 强制封禁（login_logs），立即跳转');
          this.stopQiangliCheck();
          wx.reLaunch({ url: '/pages/blocked/blocked?type=banned' });
          return;
        }
      }
    } catch (err) {
      console.error('[app] 定时检查 qiangli 状态失败:', err);
    }
  },

  // 🔴 验证分享码
  async verifyShareCode(shareCode) {
    try {
      const db = wx.cloud.database()
      
      // 🔴 添加超时保护（5秒超时）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('查询分享码超时')), 5000);
      });
      
      // 查询分享码（带超时）
      const codeRes = await Promise.race([
        db.collection('chakan')
        .where({ code: shareCode })
          .get(),
        timeoutPromise
      ])

      if (!codeRes.data || codeRes.data.length === 0) {
        console.log('[app] 分享码不存在:', shareCode)
        // 🔴 返回错误信息，让调用方显示弹窗
        return { success: false, error: '分享码无效' }
      }

      const codeInfo = codeRes.data[0]

      // 检查是否过期
      const now = new Date()
      const expiresAt = new Date(codeInfo.expiresAt)
      if (now > expiresAt) {
        console.log('[app] 分享码已过期')
        // 🔴 返回错误信息，让调用方显示弹窗
        return { success: false, error: '分享码已过期' }
      }

      // 检查查看次数
      if (codeInfo.usedViews >= codeInfo.totalViews) {
        console.log('[app] 分享码查看次数已用完')
        // 🔴 返回错误信息，让调用方显示弹窗
        return { success: false, error: '分享码查看次数已用完' }
      }

      // 检查状态
      if (codeInfo.status !== 'active') {
        console.log('[app] 分享码已失效')
        // 🔴 返回错误信息，让调用方显示弹窗
        return { success: false, error: '分享码已失效' }
      }

      // 验证通过，设置全局标识
      this.globalData.isShareCodeUser = true
      this.globalData.shareCodeInfo = {
        code: shareCode,
        usedViews: codeInfo.usedViews,
        totalViews: codeInfo.totalViews,
        expiresAt: codeInfo.expiresAt,
        _id: codeInfo._id
      }

      console.log('[app] ✅ 分享码验证通过:', this.globalData.shareCodeInfo)
      // 位置权限改由首页在用户点击后统一请求，这里只负责验证和标记状态
      return { success: true }
    } catch (err) {
      console.error('[app] 验证分享码失败:', err)
      // 🔴 返回错误信息，让调用方显示弹窗
      return { success: false, error: err.message || '验证分享码失败' }
    }
  },

  // 🔴 更新分享码查看次数（调用云函数，不在前端处理）
  async updateShareCodeViews() {
    if (!this.globalData.isShareCodeUser || !this.globalData.shareCodeInfo) {
      return { success: false, error: '不是分享码用户或缺少分享码信息' }
    }

    try {
      const codeInfo = this.globalData.shareCodeInfo
      const shareCodeId = codeInfo._id

      console.log('[app] 调用云函数更新分享码查看次数，shareCodeId:', shareCodeId)

      // 🔴 调用云函数更新查看次数（在服务端处理，确保原子性）
      const res = await wx.cloud.callFunction({
        name: 'updateShareCodeViews',
        data: {
          shareCodeId: shareCodeId
        }
      })

      if (!res.result || !res.result.success) {
        console.error('[app] 云函数返回失败:', res.result)
        return { success: false, error: res.result?.error || '更新失败' }
      }

      // 🔴 更新全局数据（使用云函数返回的最新值）
      this.globalData.shareCodeInfo.usedViews = res.result.usedViews
      this.globalData.shareCodeInfo.totalViews = res.result.total

      console.log('[app] ✅ 查看次数更新成功，剩余:', res.result.remaining, '/', res.result.total)

      // 返回结果给调用方处理 UI
      return {
        success: true,
        remaining: res.result.remaining,
        total: res.result.total,
        usedViews: res.result.usedViews,
        isExhausted: res.result.isExhausted
      }
    } catch (err) {
      console.error('[app] ❌ 调用云函数更新分享码查看次数失败:', err)
      return { success: false, error: err.message || '网络错误' }
    }
  },

  // 🔴 记录分享码用户在 azjc 页面的停留和行为统计
  async recordShareCodeSession(sessionStats, isUpdate = false) {
    console.log('[app] recordShareCodeSession 被调用');
    console.log('[app] isShareCodeUser:', this.globalData.isShareCodeUser);
    console.log('[app] shareCodeInfo:', this.globalData.shareCodeInfo);
    
    if (!this.globalData.isShareCodeUser || !this.globalData.shareCodeInfo) {
      console.log('[app] ❌ 不是分享码用户或缺少 shareCodeInfo，退出');
      return
    }

    try {
      // 获取当前用户 openid（用于 viewers 记录）
      let openid = ''
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' })
        openid = loginRes.result.openid || ''
        console.log('[app] 获取到 openid:', openid);
      } catch (e) {
        console.error('[app] 获取 openid 失败:', e);
      }

      const baseInfo = this.globalData.shareCodeInfo
      
      if (!baseInfo || !baseInfo._id) {
        console.error('[app] ❌ shareCodeInfo 缺少 _id 字段:', baseInfo);
        return;
      }
      
      console.log('[app] 分享码信息 - _id:', baseInfo._id, ', code:', baseInfo.code);
      const durationMs = sessionStats && typeof sessionStats.durationMs === 'number'
        ? sessionStats.durationMs
        : 0
      const sectionClicks = sessionStats && sessionStats.sectionClicks ? sessionStats.sectionClicks : {}
      const sectionDurations = sessionStats && sessionStats.sectionDurations ? sessionStats.sectionDurations : {}

      // 🔴 获取被分享用户的昵称
      let viewerNickname = '';
      try {
        const userInfo = wx.getStorageSync('userInfo');
        viewerNickname = userInfo?.nickName || '';
      } catch (e) {
        console.log('[app] 获取用户昵称失败:', e);
      }

      // 🔴 获取被分享用户的地址信息（如果 stats 中已包含则使用，否则从缓存读取）
      let locationInfo = sessionStats.locationInfo || {
        province: '',
        city: '',
        district: '',
        address: '',
        latitude: null,
        longitude: null
      };
      
      // 如果 stats 中没有地址信息，才从缓存读取（兼容旧逻辑）
      if (!sessionStats.locationInfo) {
        try {
          const cachedLocation = wx.getStorageSync('last_location') || {};
          locationInfo = {
            province: cachedLocation.province || '',
            city: cachedLocation.city || '',
            district: cachedLocation.district || '',
            address: cachedLocation.address || '',
            latitude: cachedLocation.latitude || null,
            longitude: cachedLocation.longitude || null
          };
          console.log('[app] 从缓存读取地址信息（兼容旧逻辑）');
        } catch (e) {
          console.log('[app] 获取地址信息失败:', e);
        }
      } else {
        console.log('[app] 使用传入的固定地址信息（不再重复获取）');
      }

      console.log('[app] recordShareCodeSession - 准备保存数据:');
      console.log('[app] - shareCodeId:', baseInfo._id);
      console.log('[app] - openid:', openid);
      console.log('[app] - viewerNickname:', viewerNickname);
      console.log('[app] - locationInfo:', locationInfo);
      console.log('[app] - durationMs:', durationMs);
      console.log('[app] - sectionClicks:', JSON.stringify(sectionClicks));
      console.log('[app] - sectionDurations:', JSON.stringify(sectionDurations));

      // 🔴 准备调用云函数保存数据（云函数会处理所有数据库操作）

      // 🔴 构建新的 viewer 记录（注意：在客户端不能使用 db.serverDate()，需要使用 Date 对象或时间戳）
      const newViewer = {
        openid: openid,
        nickname: viewerNickname, // 🔴 被分享用户昵称
        viewTime: new Date(), // 🔴 使用客户端时间（会自动转换为服务端时间）
        durationMs: durationMs, // 🔴 页面查看总时长（毫秒）
        sectionClicks: sectionClicks,       // 🔴 点击了哪些块，次数是多少 { 'product-1': 3, 'type-2': 1, 'video-0': 5, ... }
        sectionDurations: sectionDurations, // 🔴 各板块停留时长 { 'video-0': 12000, 'graphic-1': 5000, ... }
        // 🔴 地址信息
        province: locationInfo.province,
        city: locationInfo.city,
        district: locationInfo.district,
        address: locationInfo.address,
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude
      };

      console.log('[app] 准备保存的新 viewer 数据:', JSON.stringify(newViewer, null, 2));

      // 🔴 使用云函数保存数据（避免客户端权限问题）
      console.log('[app] 调用云函数 recordShareCodeViewer 保存数据，isUpdate:', isUpdate);
      const cloudRes = await wx.cloud.callFunction({
        name: 'recordShareCodeViewer',
        data: {
          shareCodeId: baseInfo._id,
          isUpdate: isUpdate, // 🔴 是否更新现有记录
          viewerData: {
            nickname: viewerNickname,
            durationMs: durationMs,
            sectionClicks: sectionClicks,
            sectionDurations: sectionDurations,
            province: locationInfo.province,
            city: locationInfo.city,
            district: locationInfo.district,
            address: locationInfo.address,
            latitude: locationInfo.latitude,
            longitude: locationInfo.longitude
          }
        }
      });

      console.log('[app] 云函数返回结果:', cloudRes);
      console.log('[app] 云函数返回结果详情:', JSON.stringify(cloudRes, null, 2));

      if (cloudRes.result && cloudRes.result.success) {
        console.log('[app] ✅ recordShareCodeSession - 数据保存成功');
        console.log('[app] 当前 viewers 数组长度:', cloudRes.result.viewersCount || 0);
      } else {
        console.error('[app] ❌ 云函数保存失败:', cloudRes.result?.error || '未知错误');
      }
    } catch (err) {
      console.error('[app] ❌ 记录分享码会话失败:', err)
      console.error('[app] 错误详情:', JSON.stringify(err, null, 2))
    }
  },

  // 获取模拟定位坐标
  getMockLocation: function(city) {
    const mockLocations = {
      'shenzhen': {
        latitude: 22.5431,
        longitude: 114.0579
      },
      'hangzhou': {
        latitude: 30.2741,
        longitude: 120.1551
      }
    };
    return mockLocations[city] || mockLocations['shenzhen'];
  },

  getLocationAndCheck: function() {
    const that = this;

    if (this.globalData.mockLocation) {
      const mockLoc = this.getMockLocation(this.globalData.mockLocation);
      console.log('=== 使用模拟定位 ===');
      console.log('模拟定位城市:', this.globalData.mockLocation);
      console.log('模拟定位坐标:', mockLoc);
      this.callCloudCheck(mockLoc.latitude, mockLoc.longitude);
      return;
    }

    console.log('=== 获取真实定位 ===');

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success(res) {
        const latitude = res.latitude;
        const longitude = res.longitude;
        console.log('前端获取定位成功:', latitude, longitude);
        that.callCloudCheck(latitude, longitude);
      },
      fail(err) {
        console.error('获取定位失败或用户拒绝:', err);
      }
    });
  },

  // 获取用户昵称（静默方式，不弹授权弹窗）
  getUserNickName: function() {
    return new Promise((resolve) => {
      const cachedUserInfo = wx.getStorageSync('userInfo');
      if (cachedUserInfo && cachedUserInfo.nickName) {
        resolve(cachedUserInfo.nickName);
        return;
      }

      try {
        wx.getUserInfo({
          success: (res) => {
            const nickName = res.userInfo?.nickName || '未获取到昵称';
            if (nickName !== '未获取到昵称') {
              wx.setStorageSync('userInfo', res.userInfo);
            }
            resolve(nickName);
          },
          fail: () => resolve('未获取到昵称')
        });
      } catch (err) {
        resolve('未获取到昵称');
      }
    });
  },

  requestUserNickName: function() {
    return new Promise((resolve) => {
      const cachedUserInfo = wx.getStorageSync('userInfo');
      if (cachedUserInfo && cachedUserInfo.nickName) {
        resolve(cachedUserInfo.nickName);
        return;
      }

      wx.getUserProfile({
        desc: '用于记录访问信息',
        success: (res) => {
          const nickName = res.userInfo?.nickName || '未获取到昵称';
          wx.setStorageSync('userInfo', res.userInfo);
          resolve(nickName);
        },
        fail: () => resolve('未获取到昵称')
      });
    });
  },

  callCloudCheck: async function(lat, lng) {
    if (this._isCallingCloudCheck) return;
    this._isCallingCloudCheck = true;

    let nickName = '未获取到昵称';
    try {
      nickName = await this.getUserNickName();
    } catch (err) {}

    const deviceInfo = wx.getDeviceInfo();

    wx.cloud.callFunction({
      name: 'accessControl',
      data: {
        latitude: lat,
        longitude: lng,
        nickName: nickName,
        deviceInfo: deviceInfo.model
      },
      success: res => {
        this._isCallingCloudCheck = false;
        if (res.result && res.result.isBlocked === true) {
          this.globalData.blockedLocation = {
            city: res.result.city || '未知城市',
            province: res.result.province || '浙江省',
            location: res.result.location || '浙江省',
            latitude: res.result.latitude,
            longitude: res.result.longitude
          };
          wx.reLaunch({ url: '/pages/blocked/blocked' });
        }
      },
      fail: err => {
        this._isCallingCloudCheck = false;
        console.error('云函数调用失败:', err);
      }
    });
  },

  checkAccess: function() {
    this.getLocationAndCheck();
  },

  // 🔴 预加载shop页面数据（应用启动时调用，提升用户体验）
  preloadShopData() {
    // 防止重复加载
    if (this.globalData.shopDataCache.isLoading) {
      console.log('[app] shop数据正在加载中，跳过重复请求');
      return;
    }

    // 检查缓存是否有效（5分钟内有效）
    const now = Date.now();
    const cacheTime = this.globalData.shopDataCache.cacheTime;
    if (cacheTime && (now - cacheTime < 5 * 60 * 1000)) {
      console.log('[app] shop数据缓存有效，无需重新加载');
      return;
    }

    console.log('[app] 开始预加载shop页面数据...');
    this.globalData.shopDataCache.isLoading = true;

    if (!wx.cloud) {
      console.warn('[app] 云开发未初始化，跳过shop数据预加载');
      this.globalData.shopDataCache.isLoading = false;
      return;
    }

    const db = wx.cloud.database();
    const cache = this.globalData.shopDataCache;

    // 并行加载所有数据
    Promise.all([
      // 1. 加载商店标题
      db.collection('shop_config').doc('shopTitle').get().catch(err => {
        console.warn('[app] 预加载shopTitle失败:', err);
        return { data: null };
      }),
      // 2. 加载顶部媒体
      db.collection('shop_config').doc('topMedia').get().catch(err => {
        console.warn('[app] 预加载topMedia失败:', err);
        return { data: null };
      }),
      // 3. 加载产品系列
      db.collection('shop_series').get().catch(err => {
        console.warn('[app] 预加载shop_series失败:', err);
        return { data: [] };
      }),
      // 4. 加载配件
      db.collection('shop_accessories').get().catch(err => {
        console.warn('[app] 预加载shop_accessories失败:', err);
        return { data: [] };
      })
    ]).then(([titleRes, mediaRes, seriesRes, accRes]) => {
      // 保存到缓存
      if (titleRes.data && titleRes.data.title) {
        cache.shopTitle = titleRes.data.title;
      }
      if (mediaRes.data && mediaRes.data.list) {
        cache.topMediaList = mediaRes.data.list;
      }
      if (seriesRes.data && Array.isArray(seriesRes.data)) {
        cache.seriesList = seriesRes.data;
      }
      if (accRes.data && Array.isArray(accRes.data)) {
        cache.accessoryList = accRes.data;
      }
      cache.cacheTime = Date.now();
      cache.isLoading = false;
      
      console.log('[app] ✅ shop数据预加载完成');
      console.log('[app] - shopTitle:', cache.shopTitle ? '已加载' : '无数据');
      console.log('[app] - topMediaList:', cache.topMediaList ? `${cache.topMediaList.length}项` : '无数据');
      console.log('[app] - seriesList:', cache.seriesList ? `${cache.seriesList.length}项` : '无数据');
      console.log('[app] - accessoryList:', cache.accessoryList ? `${cache.accessoryList.length}项` : '无数据');
    }).catch(err => {
      console.error('[app] shop数据预加载失败:', err);
      cache.isLoading = false;
    });
  },

  // 🔴 刷新shop数据缓存（后台刷新，不影响当前页面）
  refreshShopDataCache() {
    console.log('[app] 后台刷新shop数据缓存...');
    this.globalData.shopDataCache.cacheTime = null; // 清除缓存时间，强制刷新
    this.preloadShopData();
  }
})
