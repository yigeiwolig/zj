const cosUpload = require('../../utils/cosUpload.js');
const shopImagePrepare = require('../../utils/shopImagePrepare.js');
const { PRODUCT_DETAIL_OPTIONS } = require('../../utils/productModels.js');
const { normalizeControlVariant } = require('../../utils/controlVariant.js');
const { isBlockedDebugBleDevice } = require('../../utils/blockedDebugBle.js');
const { withRepairProgressSubscribe } = require('../../utils/subscribeMessage.js');
const { BLEHelper } = require('../../utils/bleBindHelper.js');

Component({
  options: {
    // isolated: avoid host page .form-item/.upload-box breaking upload layout
    styleIsolation: 'isolated',
    multipleSlots: false
  },

  properties: {
    show: {
      type: Boolean,
      value: false
    },
    preferredModel: {
      type: String,
      value: ''
    }
  },

  observers: {
    show(next) {
      // Parent also calls openBindModal explicitly; ignore duplicate show=true
      if (next) {
        if (!this.data.showModal && !this._closingBindModal) {
          this.openBindModal();
        }
        return;
      }
      if (this.data.showModal || this.data.bindModalClosing) {
        this.closeBindModal({ emitClose: false });
      }
    }
  },

  data: {
    showModal: false,
    bindSheetFromBottom: false,
    bindModalClosing: false,
    showFaultBindForm: false,
    showBindAuditForm: false,
    showBindSuccess: false,
    bindSuccessTitle: '',
    bindSuccessContent: '',
    bluetoothReady: false,
    isScanning: false,
    connectStatusText: '\u70b9\u51fb\u641c\u7d22\u8bbe\u5907',
    currentSn: '',
    connectedDeviceName: '',
    isDeviceLocked: false,
    lockedReason: '',
    modelOptions: PRODUCT_DETAIL_OPTIONS,
    modelIndex: null,
    buyDate: '',
    bindType: 'new',
    controlVariant: '',
    imgReceipt: '',
    imgChat: '',
    previewImgReceipt: '',
    previewImgChat: ''
  },

  lifetimes: {
    attached() {
      this.ble = new BLEHelper(wx);
      this.setupBleCallbacks();
      this._closingBindModal = false;
      this._pendingSuccess = null;
      if (this.properties.show) {
        this.openBindModal();
      }
    },
    detached() {
      this._clearCloseTimer();
      try {
        if (this.ble) {
          this.ble.stopScan();
          this.ble.disconnect();
        }
      } catch (e) { /* ignore */ }
    }
  },

  methods: {
    noop() {},

    _toast(title, icon = 'none') {
      wx.showToast({ title: String(title || '').slice(0, 20), icon, duration: 2000 });
    },

    _showLoading(title) {
      wx.showLoading({ title: title || '\u52a0\u8f7d\u4e2d...', mask: true });
    },

    _hideLoading() {
      try { wx.hideLoading(); } catch (e) { /* ignore */ }
    },

    _clearCloseTimer() {
      if (this._closeTimer) {
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
      }
    },

    _resolvePreferredModelIndex() {
      const pref = String(this.properties.preferredModel || '').trim();
      if (!pref) return null;
      const opts = this.data.modelOptions || PRODUCT_DETAIL_OPTIONS;
      let idx = opts.indexOf(pref);
      if (idx < 0) {
        const upper = pref.toUpperCase();
        idx = opts.findIndex((m) => String(m).toUpperCase() === upper);
      }
      return idx >= 0 ? idx : null;
    },

    openBindModal() {
      // Always cancel any in-flight close timer first (prevents "open then auto-close")
      this._clearCloseTimer();
      this._closingBindModal = false;
      this._pendingSuccess = null;

      try {
        if (this.ble) {
          this.ble.stopScan();
          this.ble.disconnect();
        }
      } catch (e) {
        console.error('[device-bind-modal] ble reset failed', e);
      }

      const preferredIdx = this._resolvePreferredModelIndex();

      // Real device: open already visible (skip from-bottom delay that can leave sheet off-screen)
      this.setData({
        showModal: true,
        showFaultBindForm: false,
        bindSheetFromBottom: false,
        bindModalClosing: false,
        isScanning: false,
        bluetoothReady: false,
        connectStatusText: '\u70b9\u51fb\u641c\u7d22\u8bbe\u5907',
        currentSn: '',
        connectedDeviceName: '',
        isDeviceLocked: false,
        lockedReason: '',
        modelIndex: preferredIdx,
        buyDate: '',
        bindType: 'new',
        controlVariant: '',
        imgReceipt: '',
        imgChat: '',
        previewImgReceipt: '',
        previewImgChat: '',
        showBindAuditForm: false,
        showBindSuccess: false,
        bindSuccessTitle: '',
        bindSuccessContent: ''
      });
    },

    onCloseTap() {
      this.closeBindModal({ emitClose: true });
    },

    closeBindModal(options) {
      const emitClose = !(options && options.emitClose === false);
      if (this._closingBindModal) return;
      if (!this.data.showModal && !this.data.bindModalClosing) {
        if (emitClose) this.triggerEvent('close');
        return;
      }

      this._closingBindModal = true;
      try {
        if (this.ble) {
          this.ble.stopScan();
          this.ble.disconnect();
        }
      } catch (e) { /* ignore */ }

      this.setData({
        bindModalClosing: true,
        bindSheetFromBottom: true
      });

      this._clearCloseTimer();
      this._closeTimer = setTimeout(() => {
        this._closeTimer = null;
        this._closingBindModal = false;
        this.resetBluetoothState();
        this.setData({
          showModal: false,
          bindModalClosing: false,
          bindSheetFromBottom: false,
          showFaultBindForm: false,
          showBindSuccess: false,
          bindSuccessTitle: '',
          bindSuccessContent: ''
        });

        const pending = this._pendingSuccess;
        this._pendingSuccess = null;
        if (pending) {
          this.triggerEvent('success', pending);
        } else if (emitClose) {
          this.triggerEvent('close');
        }
      }, 300);
    },

    _finishWithSuccess(detail) {
      this._pendingSuccess = detail || { mode: 'pending' };
      this.closeBindModal({ emitClose: false });
    },

    onBindSuccessConfirm() {
      this._finishWithSuccess({ mode: 'auto' });
    },

    resetBluetoothState() {
      if (this.ble) {
        this.ble.stopScan();
        this.ble.disconnect();
      }
      this.setData({
        isScanning: false,
        bluetoothReady: false,
        connectStatusText: '\u70b9\u51fb\u641c\u7d22\u8bbe\u5907',
        currentSn: '',
        connectedDeviceName: '',
        isDeviceLocked: false,
        lockedReason: '',
        modelIndex: this._resolvePreferredModelIndex(),
        buyDate: '',
        imgReceipt: '',
        imgChat: '',
        previewImgReceipt: '',
        previewImgChat: '',
        showBindAuditForm: false,
        showFaultBindForm: false,
        showBindSuccess: false,
        bindSuccessTitle: '',
        bindSuccessContent: '',
        bindType: 'new',
        controlVariant: ''
      });
    },

    setupBleCallbacks() {
      this.ble.onConnecting = () => {
        this.setData({
          isScanning: true,
          connectStatusText: '\u6b63\u5728\u8fde\u63a5\u8bbe\u5907...'
        });
      };

      this.ble.onConnected = (device) => {
        this.handleDeviceBound(device);
      };

      this.ble.onDisconnected = () => {
        this.setData({
          isScanning: false,
          bluetoothReady: false,
          connectStatusText: '\u8fde\u63a5\u65ad\u5f00\uff0c\u8bf7\u91cd\u8bd5'
        });
      };

      this.ble.onError = (err) => {
        this._hideLoading();
        this.setData({
          isScanning: false,
          connectStatusText: '\u84dd\u7259\u9519\u8bef\uff0c\u8bf7\u68c0\u67e5\u6743\u9650'
        });
        console.error(err);
      };
    },

    startConnect() {
      if (this.data.bluetoothReady) return;

      this.setData({
        isScanning: true,
        connectStatusText: '\u641c\u7d22\u9644\u8fd1\u8bbe\u5907\u4e2d...'
      });

      this.ble.initBluetoothAdapter()
        .then(() => {
          this.ble.startScan();
        })
        .catch(() => {
          this._toast('\u8bf7\u5f00\u542f\u624b\u673a\u84dd\u7259');
          this.setData({ isScanning: false, connectStatusText: '\u8bf7\u5f00\u542f\u84dd\u7259\u540e\u91cd\u8bd5' });
        });
    },

    normalizeSnFromBluetoothName(rawName) {
      const upper = String(rawName || '').trim().toUpperCase();
      if (!upper.startsWith('NB')) return '';
      const suffix = upper.replace(/^NB-?/, '').replace(/\s+/g, '');
      if (!suffix) return '';
      return `MT-${suffix}`;
    },

    handleDeviceBound(device) {
      const rawName = device.name || device.localName || '';

      if (isBlockedDebugBleDevice(device)) {
        console.warn('[device-bind-modal] reject blocked debug device', rawName);
        try { this.ble && this.ble.disconnect(); } catch (e) {}
        this.setData({
          isScanning: false,
          bluetoothReady: false,
          showBindAuditForm: false,
          showBindSuccess: false,
          isDeviceLocked: false,
          connectStatusText: '\u8c03\u8bd5\u8bbe\u5907\u4e0d\u53ef\u7ed1\u5b9a'
        });
        this._toast('\u8c03\u8bd5\u8bbe\u5907\u4e0d\u53ef\u7ed1\u5b9a');
        return;
      }

      if (!rawName.toUpperCase().startsWith('NB')) {
        return;
      }

      const normalizedSn = this.normalizeSnFromBluetoothName(rawName);
      if (!normalizedSn) {
        this._toast('\u65e0\u6cd5\u8bc6\u522bSN\u7801');
        this.ble.disconnect();
        return;
      }

      const displayName = normalizedSn;
      this.setData({
        isScanning: false,
        bluetoothReady: true,
        connectedDeviceName: displayName,
        currentSn: normalizedSn,
        connectStatusText: `\u6b63\u5728\u9a8c\u8bc1: ${displayName}...`,
        isDeviceLocked: true,
        showBindAuditForm: false,
        showBindSuccess: false
      });

      this._bindDeviceWithRetry(normalizedSn, displayName, 0);
    },

    _bindDeviceWithRetry(normalizedSn, displayName, retryCount = 0) {
      const maxRetries = 3;

      wx.cloud.callFunction({
        name: 'bindDevice',
        data: {
          sn: normalizedSn,
          deviceName: displayName
        },
        success: (res) => {
          const result = res.result;
          if (result && result.success) {
            this.setData({ connectStatusText: '\u5df2\u8fde\u63a5' });
            if (result.status === 'AUTO_APPROVED') {
              const bindOkContent = result.fromPreRegister
                ? '\u8be5\u8bbe\u5907\u5df2\u9884\u767b\u8bb0\uff0c\u5df2\u81ea\u52a8\u6fc0\u6d3b\u5e76\u7ed1\u5b9a\uff0c\u65e0\u9700\u63d0\u4ea4\u5ba1\u6838\u3002'
                : (result.fromFaultAutoBind
                  ? '\u8bbe\u5907\u5df2\u8fde\u63a5\u5e76\u7ed1\u5b9a\u5230\u6863\u6848\u3002'
                  : '\u8bbe\u5907\u5df2\u6fc0\u6d3b\u5e76\u8fde\u63a5\uff0c\u6570\u636e\u5df2\u540c\u6b65\u3002');
              this.setData({
                isDeviceLocked: false,
                lockedReason: '',
                showBindAuditForm: false,
                showBindSuccess: true,
                bindSuccessTitle: '\u7ed1\u5b9a\u6210\u529f',
                bindSuccessContent: bindOkContent
              });
              setTimeout(() => {
                if (this.data.showBindSuccess) {
                  this._finishWithSuccess({ mode: 'auto' });
                }
              }, 900);
            } else if (result.status === 'NEED_AUDIT') {
              this.setData({
                currentSn: normalizedSn,
                isDeviceLocked: false,
                bluetoothReady: true,
                lockedReason: '',
                showBindAuditForm: true,
                showBindSuccess: false
              });
            } else {
              this.setData({
                isDeviceLocked: false,
                currentSn: normalizedSn,
                showBindAuditForm: false,
                showBindSuccess: false
              });
              this._toast(result.msg || '\u8fde\u63a5\u6210\u529f');
            }
          } else {
            const blockedConnect = result && (
              result.status === 'SCRAPPED'
              || result.status === 'LOCKED_REPLACEMENT'
              || result.status === 'FAULT_PENDING_BLOCK'
            );
            if (blockedConnect) {
              this.ble.disconnect();
            }
            this.setData({
              connectStatusText: blockedConnect
                ? ((result && result.msg) || '\u8bbe\u5907\u4e0d\u53ef\u7528')
                : (result && result.status === 'LOCKED' ? '\u8bbe\u5907\u5df2\u7ed1\u5b9a' : '\u9a8c\u8bc1\u5931\u8d25'),
              bluetoothReady: blockedConnect ? false : this.data.bluetoothReady,
              isDeviceLocked: true,
              lockedReason: (result && result.msg) || '\u8bbe\u5907\u7ed1\u5b9a\u5931\u8d25',
              showBindAuditForm: false,
              showBindSuccess: false
            });
            if (blockedConnect) {
              this._toast((result && result.msg) || '\u8be5\u8bbe\u5907\u4e0d\u53ef\u7528');
            }
          }
        },
        fail: (err) => {
          console.error('[device-bind-modal] bindDevice fail', err);
          const errMsg = err.errMsg || err.message || '\u672a\u77e5\u9519\u8bef';
          const isNetworkError = errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('\u7f51\u7edc');

          this.setData({
            bluetoothReady: true,
            connectStatusText: isNetworkError ? '\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u91cd\u8bd5' : '\u9a8c\u8bc1\u5931\u8d25',
            isDeviceLocked: !isNetworkError,
            lockedReason: isNetworkError ? '' : '\u4e91\u51fd\u6570\u8c03\u7528\u5931\u8d25',
            showBindAuditForm: false,
            currentSn: normalizedSn
          });

          if (retryCount < maxRetries && isNetworkError) {
            const nextRetry = retryCount + 1;
            this.setData({
              connectStatusText: `\u7f51\u7edc\u6821\u9a8c\u5931\u8d25\uff0c\u6b63\u5728\u91cd\u8bd5 (${nextRetry}/${maxRetries})...`
            });
            setTimeout(() => {
              this._bindDeviceWithRetry(normalizedSn, displayName, nextRetry);
            }, 1000 * nextRetry);
          } else {
            const errorText = retryCount >= maxRetries
              ? `\u7f51\u7edc\u6821\u9a8c\u5931\u8d25\uff0c\u5df2\u91cd\u8bd5 ${maxRetries} \u6b21\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5`
              : `\u7f51\u7edc\u6821\u9a8c\u5931\u8d25: ${errMsg}`;
            wx.showModal({
              title: '\u9a8c\u8bc1\u5931\u8d25',
              content: errorText + '\uff0c\u4f46\u8bbe\u5907\u5df2\u8fde\u63a5\uff0c\u60a8\u53ef\u4ee5\u7ee7\u7eed\u586b\u5199\u8868\u5355\u3002',
              confirmText: '\u91cd\u8bd5\u9a8c\u8bc1',
              cancelText: '\u53d6\u6d88',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this._bindDeviceWithRetry(normalizedSn, displayName, 0);
                }
              }
            });
          }
        }
      });
    },

    chooseProofImage(e) {
      const type = e.currentTarget.dataset.type;
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const rawPath = res.tempFiles[0].tempFilePath;
          let tempPath = rawPath;
          try {
            tempPath = await shopImagePrepare.prepareImageFile(rawPath, 'proof');
          } catch (err) {
            if (shopImagePrepare.isCropCancelled(err)) return;
            console.error('[device-bind-modal] chooseProofImage crop', err);
            this._toast('\u56fe\u7247\u5904\u7406\u5931\u8d25');
            return;
          }
          if (type === 'receipt') {
            this.setData({ previewImgReceipt: tempPath });
          } else {
            this.setData({ previewImgChat: tempPath });
          }

          this._showLoading('\u4e0a\u4f20\u4e2d...');
          cosUpload
            .uploadImageToCos(tempPath, 'proofs')
            .then((publicUrl) => {
              this._hideLoading();
              const updateData = {};
              if (type === 'receipt') {
                updateData.imgReceipt = publicUrl;
              } else {
                updateData.imgChat = publicUrl;
              }
              this.setData(updateData);
            })
            .catch((err) => {
              this._hideLoading();
              this._toast((err && (err.message || err.errMsg)) || '\u4e0a\u4f20\u5931\u8d25');
            });
        }
      });
    },

    submitAudit() {
      if (!this.data.bluetoothReady || !this.data.currentSn) {
        this._toast('\u8bf7\u5148\u8fde\u63a5MT\u8bbe\u5907');
        return;
      }
      if (this.data.modelIndex === null || this.data.modelIndex === '') {
        this._toast('\u8bf7\u9009\u62e9\u578b\u53f7');
        return;
      }
      if (!this.data.imgReceipt) {
        this._toast('\u8bf7\u4e0a\u4f20\u8d2d\u4e70\u622a\u56fe');
        return;
      }
      if (this.data.bindType === 'used' && !this.data.imgChat) {
        this._toast('\u8bf7\u4e0a\u4f20\u804a\u5929\u8bb0\u5f55');
        return;
      }
      if (!this.data.buyDate) {
        this._toast('\u8bf7\u9009\u62e9\u8d2d\u4e70\u65e5\u671f');
        return;
      }
      if (!normalizeControlVariant(this.data.controlVariant)) {
        wx.showModal({
          title: '\u63d0\u793a',
          content: '\u8bf7\u9009\u62e9\u6309\u94ae\u7248\u6216\u9065\u63a7\u7248',
          showCancel: false,
          confirmText: '\u77e5\u9053\u4e86'
        });
        return;
      }

      withRepairProgressSubscribe(() => this._submitAuditNow());
    },

    _submitAuditNow() {
      const controlVariant = normalizeControlVariant(this.data.controlVariant);
      if (!controlVariant) {
        wx.showModal({
          title: '\u63d0\u793a',
          content: '\u8bf7\u9009\u62e9\u6309\u94ae\u7248\u6216\u9065\u63a7\u7248',
          showCancel: false,
          confirmText: '\u77e5\u9053\u4e86'
        });
        return;
      }

      this._showLoading('\u63d0\u4ea4\u4e2d...');
      wx.cloud.callFunction({
        name: 'submitFaultBind',
        data: {
          action: 'submitDevice',
          sn: this.data.currentSn,
          fullDeviceName: this.data.currentSn,
          productModel: this.data.modelOptions[this.data.modelIndex],
          buyDate: this.data.buyDate,
          bindType: this.data.bindType || 'new',
          controlVariant,
          imgReceipt: this.data.imgReceipt,
          imgChat: this.data.imgChat || ''
        }
      }).then((res) => {
        this._hideLoading();
        const result = res.result || {};
        if (!result.success) {
          wx.showModal({
            title: result.blocked ? '\u65e0\u6cd5\u91cd\u590d\u63d0\u4ea4' : '\u63d0\u4ea4\u5931\u8d25',
            content: result.msg || '\u8bf7\u7a0d\u540e\u91cd\u8bd5',
            showCancel: false,
            confirmText: '\u77e5\u9053\u4e86'
          });
          return;
        }
        wx.showToast({ title: '\u5df2\u63d0\u4ea4', icon: 'success', duration: 1200 });
        this._finishWithSuccess({
          mode: 'pending',
          bindType: this.data.bindType || 'new'
        });
      }).catch((err) => {
        this._hideLoading();
        console.error(err);
        this._toast(err.errMsg || '\u63d0\u4ea4\u5931\u8d25');
      });
    },

    openFaultBindForm() {
      wx.showModal({
        title: '\u65e0\u8bbe\u5907\u6838\u9a8c\u987b\u77e5',
        content: '\u8bf7\u52a1\u5fc5\u786e\u8ba4\uff1a\u5f53\u524d\u5fc5\u987b\u662f\u63a7\u5236\u5668\u6545\u969c\u3002\u82e5\u5e76\u975e\u63a7\u5236\u5668\u6545\u969c\u4ecd\u70b9\u63d0\u4ea4\uff0c\u6211\u4eec\u5c06\u62d2\u7edd\u7533\u62a5\u3002',
        showCancel: true,
        confirmText: '\u786e\u8ba4\u662f\u63a7\u5236\u5668\u6545\u969c',
        cancelText: '\u53d6\u6d88',
        success: (res) => {
          if (!res || !res.confirm) return;
          this._proceedOpenFaultBindForm();
        }
      });
    },

    _proceedOpenFaultBindForm() {
      this._checkFaultBindEligibility().then((blocked) => {
        if (blocked) return;
        const preferredIdx = this._resolvePreferredModelIndex();
        this.setData({
          showModal: true,
          showFaultBindForm: true,
          bindType: 'fault',
          modelIndex: preferredIdx,
          buyDate: '',
          controlVariant: '',
          imgReceipt: '',
          imgChat: '',
          previewImgReceipt: '',
          previewImgChat: '',
          showBindAuditForm: false,
          showBindSuccess: false,
          bindSheetFromBottom: false
        });
      });
    },

    previewFaultReceipt() {
      const url = this.data.previewImgReceipt;
      if (!url) return;
      wx.previewImage({ urls: [url], current: url });
    },

    _checkFaultBindEligibility() {
      return wx.cloud.callFunction({
        name: 'submitFaultBind',
        data: { action: 'check' }
      }).then((res) => {
        const result = res.result || {};
        if (result.blocked) {
          wx.showModal({
            title: '\u65e0\u6cd5\u63d0\u4ea4',
            content: result.msg || '\u6682\u65f6\u65e0\u6cd5\u63d0\u4ea4',
            showCancel: false,
            confirmText: '\u77e5\u9053\u4e86'
          });
          return true;
        }
        if (!result.success) {
          wx.showModal({
            title: '\u63d0\u793a',
            content: result.msg || '\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
            showCancel: false,
            confirmText: '\u77e5\u9053\u4e86'
          });
          return true;
        }
        return false;
      }).catch((err) => {
        console.error('[device-bind-modal] fault eligibility failed', err);
        wx.showModal({
          title: '\u63d0\u793a',
          content: '\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
          showCancel: false,
          confirmText: '\u77e5\u9053\u4e86'
        });
        return true;
      });
    },

    submitFaultAudit() {
      if (this.data.modelIndex == null || this.data.modelIndex === '') {
        wx.showModal({
          title: '\u63d0\u793a',
          content: '\u8bf7\u9009\u62e9\u578b\u53f7',
          showCancel: false,
          confirmText: '\u77e5\u9053\u4e86'
        });
        return;
      }
      const controlVariant = normalizeControlVariant(this.data.controlVariant);
      if (!controlVariant) {
        wx.showModal({
          title: '\u63d0\u793a',
          content: '\u8bf7\u9009\u62e9\u6309\u94ae\u7248\u6216\u9065\u63a7\u7248',
          showCancel: false,
          confirmText: '\u77e5\u9053\u4e86'
        });
        return;
      }
      if (!this.data.imgReceipt) {
        wx.showModal({
          title: '\u63d0\u793a',
          content: '\u8bf7\u4e0a\u4f20\u8d2d\u4e70\u622a\u56fe',
          showCancel: false,
          confirmText: '\u77e5\u9053\u4e86'
        });
        return;
      }
      if (!this.data.buyDate) {
        wx.showModal({
          title: '\u63d0\u793a',
          content: '\u8bf7\u9009\u62e9\u8d2d\u4e70\u65e5\u671f',
          showCancel: false,
          confirmText: '\u77e5\u9053\u4e86'
        });
        return;
      }

      withRepairProgressSubscribe(() => {
        this._checkFaultBindEligibility().then((blocked) => {
          if (blocked) return;
          this._showLoading('\u63d0\u4ea4\u4e2d...');
          wx.cloud.callFunction({
            name: 'submitFaultBind',
            data: {
              action: 'submit',
              productModel: this.data.modelOptions[this.data.modelIndex],
              buyDate: this.data.buyDate,
              controlVariant,
              imgReceipt: this.data.imgReceipt
            }
          }).then((res) => {
            this._hideLoading();
            const result = res.result || {};
            if (!result.success) {
              wx.showModal({
                title: result.blocked ? '\u65e0\u6cd5\u91cd\u590d\u63d0\u4ea4' : '\u63d0\u4ea4\u5931\u8d25',
                content: result.msg || '\u8bf7\u91cd\u8bd5',
                showCancel: false,
                confirmText: '\u77e5\u9053\u4e86'
              });
              return;
            }
            wx.showToast({ title: '\u5df2\u63d0\u4ea4', icon: 'success', duration: 1200 });
            this._finishWithSuccess({
              mode: 'pending',
              bindType: 'fault'
            });
          }).catch((err) => {
            this._hideLoading();
            console.error(err);
            this._toast(err.errMsg || '\u63d0\u4ea4\u5931\u8d25');
          });
        });
      });
    },

    changeBindType(e) {
      this.setData({ bindType: e.currentTarget.dataset.type });
    },

    onModelChange(e) {
      this.setData({ modelIndex: Number(e.detail.value) });
    },

    onDateChange(e) {
      this.setData({ buyDate: e.detail.value });
    },

    onCtrlVariantTouchStart(e) {
      const t = e && e.touches && e.touches[0];
      this._ctrlVariantTouch = t ? { x: t.clientX, y: t.clientY } : null;
    },

    onCtrlVariantTouchEnd(e) {
      const start = this._ctrlVariantTouch;
      this._ctrlVariantTouch = null;
      if (!start) return;
      const t = e && e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
      const value = dx < 0 ? 'remote' : 'button';
      if (this.data.controlVariant === value) return;
      this.setData({ controlVariant: value });
    },

    onControlVariantChange(e) {
      const value = normalizeControlVariant(
        e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value
      );
      if (!value || this.data.controlVariant === value) return;
      this.setData({ controlVariant: value });
    }
  }
});
