const cosUpload = require('../../../utils/cosUpload.js');
const pageBack = require('../../../utils/pageBack.js');

const OPERATOR_STORAGE_KEY = 'inventory_selected_operator';

function callInventory(action, data = {}) {
  return wx.cloud
    .callFunction({
      name: 'inventoryManage',
      data: { action, ...data },
      // 默认约 3s 易 FUNCTIONS_TIME_LIMIT；出入库写库略慢时需放宽
      config: { timeout: 20000 }
    })
    .then((res) => (res && res.result) || { ok: false, errMsg: '无返回' })
    .catch((err) => {
      const raw = String((err && (err.errMsg || err.message)) || '');
      if (raw.indexOf('-502005') >= 0 || /collection not exist/i.test(raw)) {
        return { ok: false, errMsg: '数据库集合未创建，请先部署云函数并完成首次入库' };
      }
      if (/TIME_LIMIT|timed out|timeout|-50400|-501000/i.test(raw)) {
        return { ok: false, errMsg: '请求超时，请再试一次（若已成功请刷新列表确认）' };
      }
      return { ok: false, errMsg: raw || '网络异常' };
    });
}

function compressPhoto(path) {
  return new Promise((resolve) => {
    if (!wx.compressImage) {
      resolve(path);
      return;
    }
    wx.compressImage({
      src: path,
      quality: 45,
      compressedWidth: 960,
      success: (r) => resolve((r && r.tempFilePath) || path),
      fail: () => resolve(path)
    });
  });
}

function mapStatusValue(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'empty' || s === 'none' || s === '没货' || s === '0' || s === '0%') return 'empty';
  if (s === 'scarce' || s === 'few' || s === '紧缺' || s === '少' || s === '25' || s === '25%') return 'scarce';
  if (s === 'enough' || s === 'mid' || s === '够用' || s === '适中' || s === '50' || s === '50%') return 'enough';
  if (s === 'plenty' || s === 'high' || s === '较足' || s === '充足' || s === '75' || s === '75%') return 'plenty';
  return 'many';
}

function mapUsageFreq(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'uncommon' || s === '不常用' || s === 'rare') return 'uncommon';
  return 'common';
}

/** 厂家条码：恰好 9 位数字 */
function isValidInventoryBarcode(code) {
  return /^\d{9}$/.test(String(code || '').trim());
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    loading: true,
    list: [],
    displayList: [],
    keyword: '',
    lastScannedBarcode: '',

    staffList: [],
    selectedOperator: '',
    myStaffId: '',
    /** 当前微信号是否已绑定操作昵称 */
    staffEntered: false,
    logs: [],
    logsLoading: false,
    logsCollapsed: true,

    // 人员管理
    showStaff: false,
    staffClosing: false,
    staffSubmitting: false,
    staffNameInput: '',

    // 入库
    showInbound: false,
    inboundClosing: false,
    inboundSubmitting: false,
    inboundBarcode: '',
    inboundName: '',
    inboundUnitType: 'status', // status | piece | qty
    inboundStatus: 'many',
    inboundUsageFreq: 'common', // common | uncommon
    inboundQty: '',
    inboundPhotoLocal: '',
    inboundPhotoUrl: '',
    inboundIsRestock: false,
    inboundExisting: null,

    // 出库
    showOutbound: false,
    outboundClosing: false,
    outboundSubmitting: false,
    outboundItem: null,
    outboundStatus: 'many',
    outboundUsedQty: '',

    // 修改
    showEdit: false,
    editClosing: false,
    editSubmitting: false,
    editItem: null,
    editBarcode: '',
    editBarcodeChanged: false,
    editName: '',
    editUnitType: 'status',
    editStatus: 'many',
    editUsageFreq: 'common',
    editQty: '',
    editPhotoLocal: '',
    editPhotoUrl: '',

    // 底部确认条（替代系统 showModal）
    showConfirm: false,
    confirmClosing: false,
    confirmTitle: '',
    confirmDesc: '',
    confirmBarcode: '',
    confirmOkText: '确定',
    confirmCancelText: '取消',

    // 上滑卡片下滑关闭（跟手）
    sheetDragKind: '',
    sheetDragY: 0,
    /** iOS 上 scroll-view 必须用明确 px 高度，flex+height:0 会塌成只露出标题 */
    inboundSheetHeightPx: 620,
    inboundSheetBodyPx: 540,
    editSheetHeightPx: 620,
    editSheetBodyPx: 540
  },

  /** 底部大表单：按窗口算高度，兼容苹果安全区 */
  _calcTallSheetMetrics() {
    try {
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const winH = Number(sys.windowHeight) || 667;
      let safeBottom = 0;
      if (sys.safeAreaInsets && sys.safeAreaInsets.bottom != null) {
        safeBottom = Number(sys.safeAreaInsets.bottom) || 0;
      } else if (sys.safeArea && sys.screenHeight) {
        safeBottom = Math.max(0, Number(sys.screenHeight) - Number(sys.safeArea.bottom || sys.screenHeight));
      }
      const sheetH = Math.max(420, Math.floor(winH * 0.92));
      const headerH = 58;
      const bodyH = Math.max(320, sheetH - headerH - safeBottom - 10);
      return { sheetH, bodyH };
    } catch (e) {
      return { sheetH: 620, bodyH: 540 };
    }
  },

  onLoad(query) {
    try {
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const metrics = this._calcTallSheetMetrics();
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        navBarHeight: 44,
        inboundSheetHeightPx: metrics.sheetH,
        inboundSheetBodyPx: metrics.bodyH,
        editSheetHeightPx: metrics.sheetH,
        editSheetBodyPx: metrics.bodyH
      });
    } catch (e) { /* ignore */ }

    try {
      const saved = String(wx.getStorageSync(OPERATOR_STORAGE_KEY) || '').trim();
      if (saved) this.setData({ selectedOperator: saved });
    } catch (e) { /* ignore */ }

    const mode = String((query && query.mode) || '').trim();
    this._bootMode = mode;
    Promise.all([this.refreshList(), this.refreshStaff(), this.refreshLogs()]).then(() => {
      if (!this.data.staffEntered) {
        if (mode === 'inbound' || mode === 'outbound') this.openStaffSheet();
        return;
      }
      if (mode === 'inbound') this.scanInbound();
      else if (mode === 'outbound') this.scanOutbound();
    });
  },

  onShow() {
    if (!this._bootMode) {
      this.refreshList();
      this.refreshLogs();
      this.refreshStaff();
    }
    this._bootMode = '';
  },

  goBack() {
    pageBack.popOrHub();
  },

  _resetSheetDrag() {
    if (this.data.sheetDragKind || this.data.sheetDragY) {
      this.setData({ sheetDragKind: '', sheetDragY: 0 });
    }
    this._sheetTouch = null;
  },

  /** 条码必须 9 位数字；不合规则弹窗拦截，并可在关闭后自动重新扫码 */
  _requireNineDigitBarcode(code, retryScan) {
    const c = String(code || '').trim();
    if (isValidInventoryBarcode(c)) return c;
    if (this._barcodeRetryTimer) {
      clearTimeout(this._barcodeRetryTimer);
      this._barcodeRetryTimer = null;
    }
    const doRetry = typeof retryScan === 'function'
      ? () => {
          if (this._barcodeRetryTimer) {
            clearTimeout(this._barcodeRetryTimer);
            this._barcodeRetryTimer = null;
          }
          setTimeout(() => {
            try {
              retryScan();
            } catch (e) { /* ignore */ }
          }, 280);
        }
      : null;
    this.openConfirmSheet({
      title: '禁止录入',
      desc: c
        ? `条码必须是 9 位数字，系统已拦截。\n当前：${c}（${c.length} 位）\n即将重新打开扫码`
        : '条码必须是 9 位数字，系统已拦截。\n即将重新打开扫码',
      barcode: c,
      okText: '重新扫码',
      cancelText: '关闭',
      onOk: doRetry,
      onCancel: null
    });
    // 弹窗出现后自动重开扫码（也可点「重新扫码」立刻重试）
    if (doRetry) {
      this._barcodeRetryTimer = setTimeout(() => {
        this._barcodeRetryTimer = null;
        if (!this.data.showConfirm) return;
        this.closeConfirmSheet();
        doRetry();
      }, 1400);
    }
    return '';
  },

  _closeSheetByKind(kind) {
    this._resetSheetDrag();
    if (kind === 'outbound') this.closeOutbound(true);
    else if (kind === 'inbound') this.closeInbound(true);
    else if (kind === 'edit') this.closeEdit(true);
    else if (kind === 'staff') this.closeStaffSheet(true);
    else if (kind === 'confirm') this.closeConfirmSheet();
  },

  /** 顶部下滑关闭上滑卡片 */
  onSheetTouchStart(e) {
    const kind = (e.currentTarget.dataset && e.currentTarget.dataset.sheet) || '';
    const t = e.touches && e.touches[0];
    if (!kind || !t) return;
    this._sheetTouch = {
      kind,
      x: t.clientX,
      y: t.clientY,
      time: Date.now(),
      dragging: false
    };
  },

  onSheetTouchMove(e) {
    const st = this._sheetTouch;
    const t = e.touches && e.touches[0];
    if (!st || !t) return;
    const dy = t.clientY - st.y;
    const dx = t.clientX - st.x;
    if (!st.dragging) {
      if (dy < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this._sheetTouch = null;
        return;
      }
      st.dragging = true;
    }
    const y = dy > 0 ? dy : 0;
    this.setData({ sheetDragKind: st.kind, sheetDragY: y });
  },

  onSheetTouchEnd() {
    const st = this._sheetTouch;
    if (!st) return;
    const dy = Number(this.data.sheetDragY) || 0;
    const duration = Math.max(1, Date.now() - (st.time || Date.now()));
    const velocity = dy / duration;
    const shouldClose = dy > 90 || (velocity > 0.35 && dy > 40);
    this._sheetTouch = null;
    if (shouldClose) {
      this._closeSheetByKind(st.kind);
      return;
    }
    this.setData({ sheetDragKind: '', sheetDragY: 0 });
  },

  _getCustomToast() {
    return this.selectComponent('#custom-toast');
  },

  _showCustomToast(title, icon = 'none', duration = 2000) {
    const tryShow = (attempt = 0) => {
      const toast = this._getCustomToast();
      if (toast && toast.showToast) {
        toast.showToast({ title: String(title || ''), icon, duration });
        return;
      }
      if (attempt < 3) {
        setTimeout(() => tryShow(attempt + 1), 80 * (attempt + 1));
      }
    };
    tryShow();
  },

  _showCustomLoading(title) {
    const toast = this._getCustomToast();
    if (toast && toast.showLoading) {
      toast.showLoading({ title: String(title || '') });
    }
  },

  _hideCustomLoading() {
    const toast = this._getCustomToast();
    if (toast && toast.hideLoading) toast.hideLoading();
  },

  onKeywordInput(e) {
    this.setData({ keyword: (e.detail && e.detail.value) || '' });
  },

  filteredList() {
    const kw = String(this.data.keyword || '').trim().toLowerCase();
    const list = this.data.list || [];
    if (!kw) return list;
    return list.filter((it) => {
      const name = String(it.name || '').toLowerCase();
      const code = String(it.barcode || '').toLowerCase();
      return name.indexOf(kw) >= 0 || code.indexOf(kw) >= 0;
    });
  },

  applyFilter() {
    this.setData({ displayList: this.filteredList() });
  },

  async refreshList() {
    this.setData({ loading: true });
    const r = await callInventory('list');
    if (!r.ok) {
      this.setData({ loading: false });
      this._showCustomToast(r.errMsg || '加载失败');
      return;
    }
    this.setData({ list: r.list || [], loading: false }, () => this.applyFilter());
  },

  async refreshStaff() {
    const r = await callInventory('listStaff');
    if (!r.ok) {
      this.setData({
        staffList: [],
        staffEntered: false,
        selectedOperator: '',
        myStaffId: ''
      });
      console.warn('[inventory] listStaff failed', r.errMsg);
      return;
    }
    const list = (r.list || []).filter((x) => x && String(x.name || '').trim());
    const myName = String(r.myName || '').trim();
    const staffEntered = !!(r.myBound || myName);
    this.setData({
      staffList: list,
      selectedOperator: myName,
      staffEntered,
      myStaffId: r.myStaffId || '',
      staffNameInput: myName || ''
    });
    if (myName) {
      try {
        wx.setStorageSync(OPERATOR_STORAGE_KEY, myName);
      } catch (e) { /* ignore */ }
    }
  },

  async refreshLogs() {
    this.setData({ logsLoading: true });
    const r = await callInventory('listLogs', { limit: 100 });
    this.setData({
      logsLoading: false,
      logs: r.ok ? (r.list || []) : []
    });
  },

  toggleLogsCollapse() {
    this.setData({ logsCollapsed: !this.data.logsCollapsed });
  },

  onSearchConfirm() {
    this.applyFilter();
  },

  /** 扫码填入搜索框并过滤列表（不走出/入库） */
  async scanSearch() {
    try {
      const code = await this.scanBarcode();
      this.setData({ keyword: code }, () => this.applyFilter());
      if (!this.filteredList().length) {
        this._showCustomToast('未找到该条码', 'none', 2000);
      }
    } catch (e) {
      const msg = (e && e.message) || String(e || '');
      if (msg === 'cancel') return;
      if (String(msg).indexOf('BARCODE_LEN:') === 0) {
        this._requireNineDigitBarcode(msg.slice('BARCODE_LEN:'.length), () => this.scanSearch());
        return;
      }
      this._showCustomToast(msg || '扫码失败', 'none', 2500);
      setTimeout(() => this.scanSearch(), 1600);
    }
  },

  /** 当前账号未绑定昵称时禁止扫码 */
  ensureStaffEntered() {
    const name = String(this.data.selectedOperator || '').trim();
    if (this.data.staffEntered && name) return true;
    this._showCustomToast('请先绑定你的操作昵称');
    this.openStaffSheet();
    return false;
  },

  ensureOperatorSelected() {
    if (!this.ensureStaffEntered()) return '';
    return String(this.data.selectedOperator || '').trim();
  },

  // ---------- 人员管理：本账号绑定昵称 ----------
  openStaffSheet() {
    this.setData({
      showStaff: true,
      staffClosing: false,
      staffNameInput: this.data.selectedOperator || ''
    });
    this.refreshStaff();
  },

  closeStaffSheet(force) {
    if (!force && this.data.staffSubmitting) return;
    this._resetSheetDrag();
    this.setData({ staffClosing: true });
    setTimeout(() => {
      this.setData({
        showStaff: false,
        staffClosing: false,
        staffSubmitting: false
      });
    }, 220);
  },

  onStaffNameInput(e) {
    this.setData({ staffNameInput: (e.detail && e.detail.value) || '' });
  },

  async submitAddStaff() {
    if (this.data.staffSubmitting) return;
    const name = String(this.data.staffNameInput || '').trim();
    if (!name) {
      this._showCustomToast('请输入你的操作昵称');
      return;
    }
    this.setData({ staffSubmitting: true });
    const r = await callInventory('addStaff', { name });
    this.setData({ staffSubmitting: false });
    if (!r.ok) {
      this._showCustomToast(r.errMsg || '绑定失败');
      return;
    }
    this.setData({
      selectedOperator: name,
      staffEntered: true,
      staffNameInput: name
    });
    try {
      wx.setStorageSync(OPERATOR_STORAGE_KEY, name);
    } catch (e) { /* ignore */ }
    await this.refreshStaff();
    this._showCustomToast(r.updated ? '已更新昵称' : '已绑定', 'success');
  },

  async removeStaff(e) {
    const staffId = (e.currentTarget.dataset && e.currentTarget.dataset.id) || '';
    const name = (e.currentTarget.dataset && e.currentTarget.dataset.name) || '';
    if (!staffId) return;
    this.openConfirmSheet({
      title: '删除绑定',
      desc: name ? `确认删除「${name}」的绑定？` : '确认删除该绑定？',
      okText: '删除',
      onOk: async () => {
        const r = await callInventory('removeStaff', { staffId });
        if (!r.ok) {
          this._showCustomToast(r.errMsg || '删除失败');
          return;
        }
        if (this.data.selectedOperator === name || this.data.myStaffId === staffId) {
          this.setData({ selectedOperator: '', staffEntered: false, staffNameInput: '' });
          try {
            wx.removeStorageSync(OPERATOR_STORAGE_KEY);
          } catch (err) { /* ignore */ }
        }
        await this.refreshStaff();
        this._showCustomToast('已删除', 'success');
      }
    });
  },

  // ---------- 扫码工具：微信原生摄像头，只扫商品条形码 ----------
  _normalizeScanPayload(res) {
    // 只用解码后的 result，绝不用 rawData（那是 Base64，常变成 C/A 开头的乱码）
    let code = String((res && res.result) || '').trim();
    code = code.replace(/[\u0000-\u001F\u007F]/g, '').trim();
    // 少数机型会把类型拼进结果
    code = code.replace(/^(QR_CODE|CODE_128|CODE_39|EAN_13|EAN_8|UPC_A|UPC_E|CODABAR|DATA_MATRIX|PDF_417)[:\s,|]*/i, '');
    code = code.trim();
    return {
      code,
      scanType: String((res && res.scanType) || '')
    };
  },

  _isLikelyGarbageBarcode(code) {
    if (!code) return true;
    if (code.length > 64) return true;
    if (/^https?:\/\//i.test(code) || /^cloud:\/\//i.test(code)) return true;
    // Base64 乱码：很长且几乎全是 Base64 字符
    if (code.length >= 24 && /^[A-Za-z0-9+/]+={0,2}$/.test(code) && !/^\d{8,14}$/.test(code)) {
      return true;
    }
    // 不可见/异常比例过高
    const printable = code.replace(/[^\x20-\x7E\u4e00-\u9fff]/g, '');
    if (printable.length < Math.min(4, code.length)) return true;
    return false;
  },

  scanBarcode() {
    return new Promise((resolve, reject) => {
      if (!wx.scanCode) {
        reject(new Error('当前环境不支持扫码'));
        return;
      }
      wx.scanCode({
        onlyFromCamera: true,
        // 只要条形码，避免扫到二维码内容变成一长串乱码
        scanType: ['barCode'],
        success: (res) => {
          const { code, scanType } = this._normalizeScanPayload(res);
          console.log('[inventory][scan]', { scanType, code, rawResult: res && res.result });
          if (!code) {
            reject(new Error('未识别到条码'));
            return;
          }
          if (this._isLikelyGarbageBarcode(code)) {
            reject(new Error('识别异常，请对准商品条形码重试'));
            return;
          }
          if (!isValidInventoryBarcode(code)) {
            reject(new Error(`BARCODE_LEN:${code}`));
            return;
          }
          resolve(code);
        },
        fail: (err) => {
          const msg = String((err && err.errMsg) || '');
          if (/cancel|取消/i.test(msg)) {
            reject(new Error('cancel'));
            return;
          }
          if (/fail|not support|不支持|scan/i.test(msg)) {
            reject(new Error('请用手机预览扫码（开发者工具无法调摄像头）'));
            return;
          }
          reject(new Error(msg || '扫码失败'));
        }
      });
    });
  },

  // ---------- 出库（扫码默认） ----------
  async scanOutbound() {
    if (!this.ensureStaffEntered()) return;
    try {
      const code = await this.scanBarcode();
      this.setData({ lastScannedBarcode: code });
      await this.openOutboundByBarcode(code);
    } catch (e) {
      if (String(e && e.message) === 'cancel') return;
      const msg = String((e && e.message) || '');
      if (msg.indexOf('BARCODE_LEN:') === 0) {
        this._requireNineDigitBarcode(msg.slice('BARCODE_LEN:'.length), () => this.scanOutbound());
        return;
      }
      this._showCustomToast(msg || '扫码失败', 'none', 2500);
      setTimeout(() => this.scanOutbound(), 1600);
    }
  },

  async openOutboundByBarcode(barcode) {
    const code = this._requireNineDigitBarcode(barcode, () => this.scanOutbound());
    if (!code) return;
    this.setData({ lastScannedBarcode: code });
    this._showCustomLoading('查询中');
    const r = await callInventory('getByBarcode', { barcode: code });
    this._hideCustomLoading();
    if (!r.ok) {
      if (r.code === 'BARCODE_LEN') {
        this._requireNineDigitBarcode(code, () => this.scanOutbound());
        return;
      }
      this.openConfirmSheet({
        title: '已扫到条码',
        desc: `查询失败：${r.errMsg || '未知错误'}\n是否先按此条码入库？`,
        barcode: code,
        okText: '去入库',
        onOk: () => this.openInbound({ barcode: code })
      });
      return;
    }
    if (!r.found || !r.item) {
      this.openConfirmSheet({
        title: '已扫到条码',
        desc: '尚未建档，是否现在入库？',
        barcode: code,
        okText: '去入库',
        onOk: () => this.openInbound({ barcode: code })
      });
      return;
    }
    const item = r.item;
    this.setData({
      showOutbound: true,
      outboundClosing: false,
      outboundItem: item,
      lastScannedBarcode: item.barcode || code,
      outboundStatus: mapStatusValue(item.status),
      outboundUsedQty: ''
    });
  },

  openConfirmSheet({ title, desc, barcode, okText, cancelText, onOk, onCancel }) {
    if (this._barcodeRetryTimer) {
      clearTimeout(this._barcodeRetryTimer);
      this._barcodeRetryTimer = null;
    }
    this._confirmOk = typeof onOk === 'function' ? onOk : null;
    this._confirmCancel = typeof onCancel === 'function' ? onCancel : null;
    this.setData({
      showConfirm: true,
      confirmClosing: false,
      confirmTitle: title || '提示',
      confirmDesc: desc || '',
      confirmBarcode: barcode || '',
      confirmOkText: okText || '确定',
      confirmCancelText: cancelText || '取消'
    });
  },

  closeConfirmSheet() {
    if (this._barcodeRetryTimer) {
      clearTimeout(this._barcodeRetryTimer);
      this._barcodeRetryTimer = null;
    }
    this._resetSheetDrag();
    this.setData({ confirmClosing: true });
    setTimeout(() => {
      this.setData({
        showConfirm: false,
        confirmClosing: false,
        confirmTitle: '',
        confirmDesc: '',
        confirmBarcode: ''
      });
      this._confirmOk = null;
      this._confirmCancel = null;
    }, 220);
  },

  onConfirmCancel() {
    const fn = this._confirmCancel;
    if (this._barcodeRetryTimer) {
      clearTimeout(this._barcodeRetryTimer);
      this._barcodeRetryTimer = null;
    }
    this.closeConfirmSheet();
    if (fn) setTimeout(() => fn(), 240);
  },

  onConfirmOk() {
    const fn = this._confirmOk;
    if (this._barcodeRetryTimer) {
      clearTimeout(this._barcodeRetryTimer);
      this._barcodeRetryTimer = null;
    }
    this.closeConfirmSheet();
    if (fn) setTimeout(() => fn(), 240);
  },

  openOutboundFromCard(e) {
    if (!this.ensureStaffEntered()) return;
    const barcode = (e.currentTarget.dataset && e.currentTarget.dataset.barcode) || '';
    if (!barcode) return;
    // 卡片点出库：条码异常只提示，不自动开扫（避免打断浏览）
    const code = this._requireNineDigitBarcode(barcode);
    if (!code) return;
    this.openOutboundByBarcode(code);
  },

  /** 全量删除：耗材档案 + 相关出入库记录 */
  onDeleteItem(e) {
    if (!this.ensureStaffEntered()) return;
    const ds = (e.currentTarget && e.currentTarget.dataset) || {};
    const itemId = String(ds.id || '').trim();
    const barcode = String(ds.barcode || '').trim();
    const name = String(ds.name || '').trim();
    if (!itemId && !barcode) {
      this._showCustomToast('缺少耗材信息');
      return;
    }
    this.openConfirmSheet({
      title: '确认全量删除',
      desc: `将永久删除「${name || barcode || '该耗材'}」：\n· 耗材档案（数据库）\n· 全部相关出入库记录\n删除后不可恢复。`,
      barcode,
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        this._showCustomLoading('删除中');
        const r = await callInventory('remove', { itemId, barcode });
        this._hideCustomLoading();
        if (!r.ok) {
          this._showCustomToast(r.errMsg || '删除失败');
          return;
        }
        const n = Number(r.logsRemoved) || 0;
        this._showCustomToast(n > 0 ? `已删除（含 ${n} 条记录）` : '已删除', 'success');
        this.refreshList();
        this.refreshLogs();
      }
    });
  },

  closeOutbound(force) {
    if (!force && this.data.outboundSubmitting) return;
    this._resetSheetDrag();
    this.setData({ outboundClosing: true });
    setTimeout(() => {
      this.setData({
        showOutbound: false,
        outboundClosing: false,
        outboundItem: null,
        outboundUsedQty: '',
        outboundSubmitting: false
      });
    }, 220);
  },

  onOutboundStatusTap(e) {
    const v = (e.currentTarget.dataset && e.currentTarget.dataset.value) || '';
    if (!v) return;
    this.setData({ outboundStatus: v });
  },

  onOutboundUsedInput(e) {
    this.setData({ outboundUsedQty: (e.detail && e.detail.value) || '' });
  },

  async submitOutbound() {
    if (this.data.outboundSubmitting) return;
    const item = this.data.outboundItem;
    if (!item) return;
    const operatorName = this.ensureOperatorSelected();
    if (!operatorName) return;
    this.setData({ outboundSubmitting: true });
    const payload = { barcode: item.barcode, operatorName };
    if (item.unitType === 'status') {
      payload.status = this.data.outboundStatus;
    } else {
      payload.usedQty = this.data.outboundUsedQty;
    }
    const r = await callInventory('outbound', payload);
    this.setData({ outboundSubmitting: false });
    if (!r.ok) {
      this._showCustomToast(r.errMsg || '出库失败');
      return;
    }
    this._showCustomToast('已更新', 'success');
    this.closeOutbound(true);
    this.refreshList();
    this.refreshLogs();
  },

  // ---------- 入库：先调微信摄像头扫码，再打开表单 ----------
  async scanInbound() {
    if (!this.ensureStaffEntered()) return;
    try {
      const code = await this.scanBarcode();
      this.setData({ lastScannedBarcode: code });
      await this.openInbound({ barcode: code });
      // 状态型再次扫码会直接补货弹窗，不打开表单
      if (!this.data.showInbound) return;
      // 仅首次入库自动拍照；再次入库（数量型）沿用原图
      if (!this.data.inboundIsRestock) {
        setTimeout(() => this.takeInboundPhoto(), 280);
      }
    } catch (e) {
      if (String(e && e.message) === 'cancel') return;
      const msg = String((e && e.message) || '');
      if (msg.indexOf('BARCODE_LEN:') === 0) {
        this._requireNineDigitBarcode(msg.slice('BARCODE_LEN:'.length), () => this.scanInbound());
        return;
      }
      this._showCustomToast(msg || '扫码失败', 'none', 2500);
      setTimeout(() => this.scanInbound(), 1600);
    }
  },

  /**
   * 状态型二次扫码＝补货：直接置为「多 100%」，只弹简短结果，不打开明细表单
   */
  async quickRestockStatus(existing) {
    if (!existing || !existing.barcode) return false;
    const operatorName = this.ensureOperatorSelected();
    if (!operatorName) return false;
    this._showCustomLoading('补货中');
    const r = await callInventory('inbound', {
      barcode: existing.barcode,
      name: existing.name || '',
      photoUrl: existing.photoUrl || '',
      unitType: 'status',
      status: 'many',
      usageFreq: mapUsageFreq(existing.usageFreq),
      operatorName
    });
    this._hideCustomLoading();
    if (!r.ok) {
      this._showCustomToast(r.errMsg || '补货失败');
      return false;
    }
    this.openConfirmSheet({
      title: '已改变状态',
      desc: `「${existing.name || existing.barcode}」已补货为多（100%）`,
      barcode: String(existing.barcode || ''),
      okText: '知道了',
      cancelText: '关闭'
    });
    this.refreshList();
    this.refreshLogs();
    return true;
  },

  async openInbound(preset = {}) {
    // bindtap 会传入 event，不能当 preset 用
    const fromEvent = !!(preset && preset.type && preset.currentTarget);
    let barcode = fromEvent ? '' : String((preset && preset.barcode) || '').trim();
    if (barcode) {
      barcode = this._requireNineDigitBarcode(barcode, () => this.scanInbound());
      if (!barcode) return;
    }
    let existing = null;
    let isRestock = false;
    if (barcode) {
      const r = await callInventory('getByBarcode', { barcode });
      if (r.ok && r.found && r.item) {
        existing = r.item;
        isRestock = true;
      }
    }

    // 二次扫码补货：状态型直接改高，不弹详细录入
    if (isRestock && existing && existing.unitType === 'status') {
      await this.quickRestockStatus(existing);
      return;
    }

    const metrics = this._calcTallSheetMetrics();
    this.setData({
      showInbound: true,
      inboundClosing: false,
      inboundSheetHeightPx: metrics.sheetH,
      inboundSheetBodyPx: metrics.bodyH,
      inboundBarcode: barcode,
      lastScannedBarcode: barcode || this.data.lastScannedBarcode,
      inboundName: existing ? existing.name : '',
      inboundUnitType: existing ? existing.unitType : 'status',
      inboundStatus: 'many',
      inboundUsageFreq: existing ? mapUsageFreq(existing.usageFreq) : 'common',
      inboundQty: '',
      inboundPhotoLocal: '',
      inboundPhotoUrl: existing ? (existing.photoUrl || '') : '',
      inboundIsRestock: isRestock,
      inboundExisting: existing
    });
  },

  closeInbound(force) {
    if (!force && this.data.inboundSubmitting) return;
    this._resetSheetDrag();
    this.setData({ inboundClosing: true });
    setTimeout(() => {
      this.setData({
        showInbound: false,
        inboundClosing: false,
        inboundPhotoLocal: '',
        inboundPhotoUrl: '',
        inboundExisting: null,
        inboundSubmitting: false
      });
    }, 220);
  },

  async scanInboundBarcode() {
    try {
      const code = await this.scanBarcode();
      const r = await callInventory('getByBarcode', { barcode: code });
      const existing = r.ok && r.found ? r.item : null;
      this.setData({
        inboundBarcode: code,
        lastScannedBarcode: code,
        inboundIsRestock: !!existing,
        inboundExisting: existing,
        inboundName: existing ? existing.name : this.data.inboundName,
        inboundUnitType: existing ? existing.unitType : this.data.inboundUnitType,
        inboundUsageFreq: existing ? mapUsageFreq(existing.usageFreq) : this.data.inboundUsageFreq,
        inboundPhotoLocal: '',
        inboundPhotoUrl: existing ? (existing.photoUrl || '') : ''
      });
      // 仅新条码自动拍照
      if (!existing) {
        this.takeInboundPhoto();
      }
    } catch (e) {
      if (String(e && e.message) === 'cancel') return;
      const msg = String((e && e.message) || '');
      if (msg.indexOf('BARCODE_LEN:') === 0) {
        this._requireNineDigitBarcode(msg.slice('BARCODE_LEN:'.length), () => this.scanInboundBarcode());
        return;
      }
      this._showCustomToast(msg || '扫码失败');
      setTimeout(() => this.scanInboundBarcode(), 1600);
    }
  },

  onInboundField(e) {
    const field = e.currentTarget.dataset.field;
    let value = (e.detail && e.detail.value) || '';
    if (!field) return;
    if (field === 'inboundBarcode') {
      value = String(value).replace(/\D/g, '').slice(0, 9);
    }
    this.setData({ [field]: value });
  },

  onInboundBarcodeBlur() {
    const code = String(this.data.inboundBarcode || '').trim();
    if (!code) return;
    if (!isValidInventoryBarcode(code)) {
      this.setData({ inboundBarcode: '' });
      this._requireNineDigitBarcode(code, () => this.scanInboundBarcode());
    }
  },

  onInboundUnitTap(e) {
    if (this.data.inboundIsRestock) {
      this._showCustomToast('已建档类型不可在入库改，请用修改');
      return;
    }
    const v = (e.currentTarget.dataset && e.currentTarget.dataset.value) || '';
    if (!v) return;
    this.setData({ inboundUnitType: v });
  },

  onInboundStatusTap(e) {
    if (this.data.inboundIsRestock) return;
    const v = (e.currentTarget.dataset && e.currentTarget.dataset.value) || '';
    if (!v) return;
    this.setData({ inboundStatus: v });
  },

  onInboundUsageFreqTap(e) {
    const v = (e.currentTarget.dataset && e.currentTarget.dataset.value) || '';
    if (v !== 'common' && v !== 'uncommon') return;
    this.setData({ inboundUsageFreq: v });
  },

  async takeInboundPhoto() {
    try {
      const choose = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['camera', 'album'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        });
      });
      const file = choose.tempFiles && choose.tempFiles[0];
      const path = file && file.tempFilePath;
      if (!path) return;
      const compressed = await compressPhoto(path);
      this.setData({ inboundPhotoLocal: compressed, inboundPhotoUrl: '' });
    } catch (e) {
      const msg = String((e && e.errMsg) || e || '');
      if (msg.indexOf('cancel') >= 0) return;
      this._showCustomToast('拍照失败');
    }
  },

  async submitInbound() {
    if (this.data.inboundSubmitting) return;
    const barcode = this._requireNineDigitBarcode(this.data.inboundBarcode, () => this.scanInboundBarcode());
    const name = String(this.data.inboundName || '').trim();
    if (!barcode) return;
    if (!name) {
      this._showCustomToast('请填写名称');
      return;
    }
    if (!this.data.inboundIsRestock && !this.data.inboundPhotoLocal && !this.data.inboundPhotoUrl) {
      this._showCustomToast('入库必须拍照');
      return;
    }
    const operatorName = this.ensureOperatorSelected();
    if (!operatorName) return;

    this.setData({ inboundSubmitting: true });
    try {
      let photoUrl = this.data.inboundPhotoUrl;
      if (!photoUrl && this.data.inboundPhotoLocal) {
        this._showCustomLoading('上传照片');
        photoUrl = await cosUpload.uploadImageToCos(this.data.inboundPhotoLocal, 'inventory');
        this._hideCustomLoading();
      }
      const payload = {
        barcode,
        name,
        photoUrl,
        unitType: this.data.inboundUnitType,
        usageFreq: this.data.inboundUsageFreq || 'common',
        operatorName
      };
      if (this.data.inboundUnitType === 'status') {
        payload.status = this.data.inboundIsRestock ? 'many' : this.data.inboundStatus;
      } else {
        payload.quantity = this.data.inboundQty;
      }
      const r = await callInventory('inbound', payload);
      if (!r.ok) {
        this._showCustomToast(r.errMsg || '入库失败');
        return;
      }
      this._showCustomToast(r.isNew ? '入库成功' : '已累加/更新', 'success');
      this.closeInbound(true);
      this.refreshList();
      this.refreshLogs();
    } catch (e) {
      this._hideCustomLoading();
      this._showCustomToast((e && e.message) || '入库失败');
    } finally {
      this.setData({ inboundSubmitting: false });
    }
  },

  // ---------- 修改 ----------
  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.list || []).find((x) => x._id === id);
    if (!item) return;
    const metrics = this._calcTallSheetMetrics();
    this.setData({
      showEdit: true,
      editClosing: false,
      editSheetHeightPx: metrics.sheetH,
      editSheetBodyPx: metrics.bodyH,
      editItem: item,
      editBarcode: item.barcode || '',
      editBarcodeChanged: false,
      editName: item.name || '',
      editUnitType: item.unitType || 'status',
      editStatus: mapStatusValue(item.status),
      editUsageFreq: mapUsageFreq(item.usageFreq),
      editQty: item.unitType === 'status' ? '' : String(item.quantity != null ? item.quantity : ''),
      editPhotoLocal: '',
      editPhotoUrl: item.photoUrl || ''
    });
  },

  closeEdit(force) {
    if (!force && this.data.editSubmitting) return;
    this._resetSheetDrag();
    this.setData({ editClosing: true });
    setTimeout(() => {
      this.setData({
        showEdit: false,
        editClosing: false,
        editItem: null,
        editBarcode: '',
        editBarcodeChanged: false,
        editSubmitting: false
      });
    }, 220);
  },

  async scanEditBarcode() {
    try {
      const code = await this.scanBarcode();
      const oldCode = String((this.data.editItem && this.data.editItem.barcode) || '').trim();
      this.setData({
        editBarcode: code,
        editBarcodeChanged: code !== oldCode,
        lastScannedBarcode: code
      });
      this._showCustomToast(code !== oldCode ? '已更新条码，保存后生效' : '与原条码相同');
    } catch (e) {
      if (String(e && e.message) === 'cancel') return;
      const msg = String((e && e.message) || '');
      if (msg.indexOf('BARCODE_LEN:') === 0) {
        this._requireNineDigitBarcode(msg.slice('BARCODE_LEN:'.length), () => this.scanEditBarcode());
        return;
      }
      this._showCustomToast(msg || '扫码失败');
      setTimeout(() => this.scanEditBarcode(), 1600);
    }
  },

  onEditField(e) {
    const field = e.currentTarget.dataset.field;
    const value = (e.detail && e.detail.value) || '';
    if (!field) return;
    this.setData({ [field]: value });
  },

  onEditUnitTap(e) {
    const v = (e.currentTarget.dataset && e.currentTarget.dataset.value) || '';
    if (!v) return;
    this.setData({ editUnitType: v });
  },

  onEditStatusTap(e) {
    const v = (e.currentTarget.dataset && e.currentTarget.dataset.value) || '';
    if (!v) return;
    this.setData({ editStatus: v });
  },

  onEditUsageFreqTap(e) {
    const v = (e.currentTarget.dataset && e.currentTarget.dataset.value) || '';
    if (v !== 'common' && v !== 'uncommon') return;
    this.setData({ editUsageFreq: v });
  },

  async takeEditPhoto() {
    try {
      const choose = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['camera', 'album'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        });
      });
      const file = choose.tempFiles && choose.tempFiles[0];
      const path = file && file.tempFilePath;
      if (!path) return;
      const compressed = await compressPhoto(path);
      this.setData({ editPhotoLocal: compressed });
    } catch (e) {
      const msg = String((e && e.errMsg) || e || '');
      if (msg.indexOf('cancel') >= 0) return;
      this._showCustomToast('拍照失败');
    }
  },

  async submitEdit() {
    if (this.data.editSubmitting) return;
    const item = this.data.editItem;
    if (!item) return;
    const newBarcode = this._requireNineDigitBarcode(this.data.editBarcode, () => this.scanEditBarcode());
    if (!newBarcode) return;
    this.setData({ editSubmitting: true });
    try {
      let photoUrl = this.data.editPhotoUrl;
      if (this.data.editPhotoLocal) {
        this._showCustomLoading('上传照片');
        photoUrl = await cosUpload.uploadImageToCos(this.data.editPhotoLocal, 'inventory');
      }
      this._showCustomLoading('保存中');
      const payload = {
        itemId: item._id,
        barcode: item.barcode,
        newBarcode,
        name: this.data.editName,
        unitType: this.data.editUnitType,
        usageFreq: this.data.editUsageFreq || 'common',
        photoUrl,
        operatorName: String(this.data.selectedOperator || '').trim() || '管理员'
      };
      if (this.data.editUnitType === 'status') payload.status = this.data.editStatus;
      else payload.quantity = this.data.editQty;
      const r = await callInventory('update', payload);
      this._hideCustomLoading();
      if (!r.ok) {
        // 偶发超时：库可能已写入，先刷新列表避免界面与数据不一致
        this.refreshList();
        this.refreshLogs();
        if (r.code === 'BARCODE_LEN') {
          this._requireNineDigitBarcode(newBarcode, () => this.scanEditBarcode());
          return;
        }
        this._showCustomToast(r.errMsg || '保存失败');
        return;
      }
      this._showCustomToast('已保存', 'success');
      this.closeEdit(true);
      this.refreshList();
      this.refreshLogs();
    } catch (e) {
      this._hideCustomLoading();
      this.refreshList();
      this.refreshLogs();
      this._showCustomToast((e && e.message) || '保存失败');
    } finally {
      this.setData({ editSubmitting: false });
    }
  },

  previewPhoto(e) {
    const url = (e.currentTarget.dataset && e.currentTarget.dataset.url) || '';
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  noop() {}
});
