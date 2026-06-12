/**
 * 结账优惠券：商城页 shopPageDef 与 shop-checkout-modal 共用
 */
function isCheckoutAdmin(ctx) {
  if (ctx && ctx.properties && ctx.properties.isAdmin) return true;
  return !!(ctx && ctx.data && ctx.data.isAdmin);
}

const COUPON_SHEET_MS = 320;

const data = {
  checkoutCoupons: [],
  checkoutCouponsLoading: false,
  selectedCouponIds: [],
  couponDiscountYuan: 0,
  preCouponTotalYuan: 0,
  couponSheetOpen: false,
  couponSheetClosing: false,
  couponSheetAnimIn: false,
  couponHint: ''
};

const methods = {
  loadCheckoutCoupons() {
    this.setData({ checkoutCouponsLoading: true });
    wx.cloud.callFunction({
      name: 'referral',
      data: { action: 'listCheckoutCoupons' }
    }).then((res) => {
      const r = (res && res.result) || {};
      const coupons = r.success ? (r.coupons || []) : [];
      this.setData({
        checkoutCoupons: coupons,
        checkoutCouponsLoading: false,
        selectedCouponIds: []
      });
      if (typeof this.reCalcFinalPrice === 'function') {
        this.reCalcFinalPrice();
      }
    }).catch(() => {
      this.setData({ checkoutCouponsLoading: false });
    });
  },

  openCouponSheet() {
    if (!this.data.checkoutCoupons.length) {
      if (typeof this.showAutoToast === 'function') {
        this.showAutoToast('提示', '暂无可用优惠券');
      } else {
        wx.showToast({ title: '暂无可用优惠券', icon: 'none' });
      }
      return;
    }
    if (this.data.couponSheetOpen && !this.data.couponSheetClosing) return;
    this.setData({
      couponSheetOpen: true,
      couponSheetClosing: false,
      couponSheetAnimIn: false
    });
    wx.nextTick(() => {
      if (this.data.couponSheetOpen && !this.data.couponSheetClosing) {
        this.setData({ couponSheetAnimIn: true });
      }
    });
  },

  closeCouponSheet() {
    if (!this.data.couponSheetOpen || this.data.couponSheetClosing) return;
    this.setData({ couponSheetClosing: true, couponSheetAnimIn: false });
    setTimeout(() => {
      if (!this.data.couponSheetClosing) return;
      this.setData({
        couponSheetOpen: false,
        couponSheetClosing: false,
        couponSheetAnimIn: false
      });
    }, COUPON_SHEET_MS);
  },

  toggleCouponSelect(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const disabled = !!(e.currentTarget.dataset && e.currentTarget.dataset.disabled);
    if (disabled) return;
    const selected = [...(this.data.selectedCouponIds || [])];
    const idx = selected.indexOf(id);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      selected.push(id);
    }
    this.setData({ selectedCouponIds: selected });
    if (typeof this.reCalcFinalPrice === 'function') {
      this.reCalcFinalPrice();
    }
  },

  selectAllCoupons() {
    const allIds = (this.data.checkoutCoupons || []).map((c) => c.id);
    this.setData({ selectedCouponIds: allIds });
    if (typeof this.reCalcFinalPrice === 'function') {
      this.reCalcFinalPrice();
    }
  },

  clearCouponSelection() {
    this.setData({ selectedCouponIds: [], couponHint: '' });
    if (typeof this.reCalcFinalPrice === 'function') {
      this.reCalcFinalPrice();
    }
  },

  confirmCouponSheet() {
    this.closeCouponSheet();
  },

  resetCheckoutCoupons() {
    this.setData({
      selectedCouponIds: [],
      couponDiscountYuan: 0,
      couponSheetOpen: false,
      couponSheetClosing: false,
      couponSheetAnimIn: false,
      couponHint: ''
    });
  },

  _roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
  },

  _calcCouponDiscount(subtotalYuan) {
    const ids = this.data.selectedCouponIds || [];
    const list = this.data.checkoutCoupons || [];
    if (!ids.length || isCheckoutAdmin(this)) {
      return { discount: 0, hint: '' };
    }
    const subtotal = this._roundMoney(subtotalYuan);
    if (subtotal <= 0) return { discount: 0, hint: '' };
    let discountFen = 0;
    let blockedCount = 0;
    ids.forEach((cid) => {
      const c = list.find((x) => x.id === cid);
      if (!c) return;
      const minSpend = Number(c.minSpendYuan);
      const minSpendYuan = Number.isNaN(minSpend) ? 0 : this._roundMoney(minSpend);
      if (minSpendYuan > 0 && subtotal < minSpendYuan) {
        blockedCount += 1;
        return;
      }
      discountFen += Number(c.amountFen) || 0;
    });
    const discount = this._roundMoney(discountFen / 100);
    let hint = '';
    if (blockedCount > 0) {
      hint = `${blockedCount} 张券未满足门槛，暂不生效`;
    }
    return { discount, hint };
  },

  patchFinalPriceWithCoupons(subtotalYuan) {
    const subtotal = this._roundMoney(subtotalYuan);
    const { discount, hint } = this._calcCouponDiscount(subtotal);
    let finalTotal = this._roundMoney(subtotal - discount);
    if (finalTotal < 0.01 && subtotal > 0) finalTotal = 0.01;
    const admin = isCheckoutAdmin(this);
    return {
      preCouponTotalYuan: subtotal,
      couponDiscountYuan: discount,
      couponHint: hint,
      finalTotalPrice: admin ? subtotal : finalTotal
    };
  },

  getSelectedCouponIdsForOrder() {
    if (isCheckoutAdmin(this)) return [];
    return this.data.selectedCouponIds || [];
  }
};

module.exports = {
  data,
  methods,
  isCheckoutAdmin,
  COUPON_SHEET_MS
};
