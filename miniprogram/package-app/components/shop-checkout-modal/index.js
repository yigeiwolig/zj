const QQMapWX = require('../../../utils/qqmap-wx-jssdk.js');
const checkoutLogic = require('./checkoutLogic.js');

const MAP_KEY = 'CFDBZ-B6K6N-B3EFF-SPDJ2-Y2MRZ-7UBH2';
const DISTRICT_KEY = 'ICRBZ-VEELI-CQZGO-UE5G6-BHRMS-VQBIK';

checkoutLogic.initMaps(
  new QQMapWX({ key: MAP_KEY }),
  new QQMapWX({ key: DISTRICT_KEY })
);

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    isAdmin: {
      type: Boolean,
      value: false
    },
    portalToPage: {
      type: Boolean,
      value: false
    }
  },

  data: {
    ...checkoutLogic.checkoutDataInitial,
    sheetAnimIn: false,
    sheetClosing: false
  },

  lifetimes: {
    attached() {
      this.loadProvinceList();
    }
  },

  observers: {
    show(val) {
      if (val) {
        this.bootstrapCheckout();
        this.setData({ sheetAnimIn: false, sheetClosing: false });
        wx.nextTick(() => {
          if (this.properties.show) {
            this.setData({ sheetAnimIn: true });
          }
        });
        return;
      }
      if (!this.data.sheetClosing) {
        this.setData({ sheetAnimIn: false, sheetClosing: false });
      }
    }
  },

  methods: {
    ...checkoutLogic.methods,
    _runSheetClose(done) {
      if (this.data.sheetClosing) return;
      this.setData({ sheetAnimIn: false, sheetClosing: true });
      setTimeout(() => {
        this.setData({ sheetClosing: false });
        if (typeof done === 'function') done();
      }, 340);
    }
  }
});
