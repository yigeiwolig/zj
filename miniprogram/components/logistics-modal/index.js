Component({
  properties: {
    portalToPage: {
      type: Boolean,
      value: true
    }
  },

  data: {
    show: false,
    closing: false,
    currentTrackingId: '',
    currentLogisticsCompany: '',
    logisticsData: null,
    logisticsLoading: false,
    logisticsError: null,
    logisticsExpectedTail: '',
    logisticsBlockDisplay: false
  },

  methods: {
    open(payload) {
      const p = payload || {};
      const sn = String(p.sn || p.trackingId || '').trim().toUpperCase();
      const expressCompany = String(p.company || p.expressCompany || '').trim();
      const phone = String(p.phone || '').trim();
      const tailRequired = String(p.tailRequired || '').trim();
      const defaultTail = tailRequired || (phone && phone.length >= 4 ? phone.slice(-4) : '');

      if (!sn) {
        wx.showModal({
          title: '提示',
          content: '运单号为空，无法查询物流信息',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      this.setData({
        show: true,
        closing: false,
        currentTrackingId: sn,
        currentLogisticsCompany: expressCompany,
        logisticsData: null,
        logisticsLoading: true,
        logisticsError: null,
        logisticsExpectedTail: defaultTail,
        logisticsBlockDisplay: false
      });
      this.triggerEvent('modalchange', { open: true });
      this.fetchLogisticsByTail({
        trackingId: sn,
        expressCompany,
        receiverPhone: defaultTail || phone || ''
      });
    },

    fetchLogisticsByTail({ trackingId, expressCompany = '', receiverPhone = '' }) {
      wx.cloud.callFunction({
        name: 'queryLogistics',
        data: { trackingId, expressCompany, receiverPhone },
        success: (res) => {
          if (res.result && res.result.success) {
            const raw = res.result.data || {};
            // 兼容不同字段名（path_list / list / traces）
            const rawList = raw.path_list || raw.list || raw.traces || [];
            const path_list = (Array.isArray(rawList) ? rawList : []).map((item) => {
              const fullTime = String(item.time || item.datetime || item.ftime || '').trim();
              const desc = String(item.desc || item.remark || item.context || item.status || '').trim();
              let _dateStr = '';
              let time = fullTime;
              if (fullTime.indexOf(' ') > -1) {
                const parts = fullTime.split(' ');
                _dateStr = parts[0];
                time = parts.slice(1).join(' ');
              }
              return { desc, time, _dateStr, location: item.location || '' };
            }).filter((item) => item.desc || item.time);

            const logisticsData = {
              ...raw,
              path_list,
              express_company_name: raw.express_company_name || raw.company || '查询中...',
              status_text: raw.status_text || raw.status_desc || '',
              status: String(raw.status != null ? raw.status : '')
            };

            this.setData({
              logisticsData,
              logisticsLoading: false,
              logisticsError: null,
              logisticsBlockDisplay: false
            });
            return;
          }
          const errorMsg = (res.result && res.result.errMsg) || '查询失败，请稍后重试';
          const tailMismatch = /尾号|手机号|phone|收件人/.test(errorMsg);
          this.setData({
            logisticsData: null,
            logisticsLoading: false,
            logisticsError: errorMsg,
            logisticsBlockDisplay: tailMismatch
          });
        },
        fail: (err) => {
          this.setData({
            logisticsData: null,
            logisticsLoading: false,
            logisticsError: (err && err.errMsg) || '网络错误，请稍后重试'
          });
        }
      });
    },

    onLogisticsException() {
      wx.showModal({
        title: '物流校准',
        editable: true,
        placeholderText: '请输入4位手机号尾号',
        success: (res) => {
          if (!res || !res.confirm) return;
          const tail = String(res.content || '').trim();
          if (!/^\d{4}$/.test(tail)) {
            wx.showToast({ title: '请输入4位尾号', icon: 'none' });
            return;
          }
          this.setData({
            logisticsLoading: true,
            logisticsError: null,
            logisticsData: null,
            logisticsBlockDisplay: false
          });
          this.fetchLogisticsByTail({
            trackingId: this.data.currentTrackingId,
            expressCompany: this.data.currentLogisticsCompany || '',
            receiverPhone: tail
          });
        }
      });
    },

    onCopyTrackingId(e) {
      const sn = e.currentTarget.dataset.sn;
      if (sn) wx.setClipboardData({ data: sn });
    },

    onClose() {
      if (!this.data.show) return;
      this.setData({ closing: true });
      setTimeout(() => {
        this.setData({
          show: false,
          closing: false,
          currentTrackingId: '',
          currentLogisticsCompany: '',
          logisticsData: null,
          logisticsError: null,
          logisticsLoading: false,
          logisticsExpectedTail: '',
          logisticsBlockDisplay: false
        });
        this.triggerEvent('modalchange', { open: false });
      }, 320);
    },

    noop() {}
  }
});
