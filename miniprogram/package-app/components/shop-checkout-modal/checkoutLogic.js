/**
 * Checkout logic for shop-checkout-modal component.
 * Methods are merged into Component({ methods }) and use `this` as the instance.
 */
const { MUNICIPALITY_DISTRICTS } = require('../../../utils/smartAddressParser.js');
const couponMixin = require('../../../utils/checkoutCouponMixin.js');
const { withRepairProgressSubscribe, sendSubscribeNotify } = require('../../../utils/subscribeMessage.js');

let qqmapsdk = null;
let qqmapsdkDistrict = null;

function initMaps(sdk, sdkDistrict) {
  qqmapsdk = sdk;
  qqmapsdkDistrict = sdkDistrict;
}

const checkoutDataInitial = {
  cart: [],
  cartTotalPrice: 0,
  finalTotalPrice: 0,

  orderInfo: { name: '', phone: '' },
  detailAddress: '',

  selectedProvince: '',
  selectedCity: '',
  selectedDistrict: '',
  provinceList: [],
  cityList: [],
  districtList: [],
  provinceIndex: -1,
  cityIndex: -1,
  districtIndex: -1,

  shippingMethod: 'zto',
  shippingFee: 0,
  checkoutFreeShipping: false,

  ...couponMixin.data,

  agreedToDisclaimer: false,

  dialog: {
    show: false,
    title: '',
    content: '',
    showCancel: false,
    callback: null,
    confirmText: '确定',
    cancelText: '取消'
  },
  dialogClosing: false,

  autoToast: { show: false, title: '', content: '' },
  autoToastClosing: false,

  showSmartPasteModal: false,
  smartPasteVal: '',
  smartPasteClosing: false,

  showLoadingAnimation: false,
  loadingText: '加载中...'
};

const methods = {
  ...couponMixin.methods,

  bootstrapCheckout() {
    let cachedCart = [];
    try {
      cachedCart = wx.getStorageSync('my_cart') || [];
    } catch (e) {
      cachedCart = [];
    }
    if (!cachedCart.length) {
      cachedCart = this.data.cart || [];
    }
    let total = 0;
    cachedCart.forEach((item) => {
      total += Number(item.total) || 0;
    });
    this.setData({
      cart: cachedCart,
      cartTotalPrice: total
    });
    try {
      const last = wx.getStorageSync('last_address');
      if (last && (last.name || last.phone || last.address)) {
        const patch = {};
        if (last.name) patch['orderInfo.name'] = last.name;
        if (last.phone) patch['orderInfo.phone'] = last.phone;
        if (last.address) {
          patch['orderInfo.address'] = last.address;
          patch.detailAddress = last.address;
        }
        if (Object.keys(patch).length) this.setData(patch);
      }
    } catch (e) {}
    this.reCalcFinalPrice(total);
    this.loadCheckoutCoupons();
  },

  _roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
  },

  _calcCouponDiscount(subtotalYuan) {
    const ids = this.data.selectedCouponIds || [];
    const list = this.data.checkoutCoupons || [];
    if (!ids.length || this.properties.isAdmin) {
      return { discount: 0, hint: '' };
    }
    let discountFen = 0;
    ids.forEach((cid) => {
      const c = list.find((x) => x.id === cid);
      if (c) discountFen += Number(c.amountFen) || 0;
    });
    const discount = this._roundMoney(discountFen / 100);
    const minRequired = this._roundMoney(discount + 0.01);
    let hint = '';
    if (subtotalYuan > 0 && subtotalYuan < minRequired) {
      hint = `还差 ¥${this._roundMoney(minRequired - subtotalYuan).toFixed(2)} 满足用券门槛`;
    }
    return { discount, hint };
  },

  closeCheckout() {
    if (typeof this._runSheetClose === 'function') {
      this._runSheetClose(() => {
        this.setData({
          agreedToDisclaimer: false,
          selectedCouponIds: [],
          couponDiscountYuan: 0,
          couponSheetOpen: false,
          couponSheetClosing: false,
          couponSheetAnimIn: false,
          couponHint: ''
        });
        this.triggerEvent('close');
      });
      return;
    }
    this.setData({
      agreedToDisclaimer: false,
      sheetAnimIn: false,
      selectedCouponIds: [],
      couponDiscountYuan: 0,
      couponSheetOpen: false,
      couponSheetClosing: false,
      couponSheetAnimIn: false,
      couponHint: ''
    });
    this.triggerEvent('close');
  },

  /** 已创建待付款订单但用户取消/失败支付：保留购物车，仅关闭弹窗 */
  _finalizeUnpaidOrder(payment) {
    const orderId = payment && payment.outTradeNo;
    if (orderId) {
      sendSubscribeNotify({ scene: 'shop_unpaid', orderId: String(orderId) });
    }
    const finish = () => {
      this.setData({ agreedToDisclaimer: false });
      this.triggerEvent('unpaid', { orderId: orderId || '' });
      this.triggerEvent('close');
    };
    if (typeof this._runSheetClose === 'function') {
      this._runSheetClose(finish);
      return;
    }
    finish();
  },

  _clearCartAfterPaid() {
    if (this._cartClearedAfterPay) return;
    this._cartClearedAfterPay = true;
    try {
      wx.removeStorageSync('my_cart');
    } catch (e) {}
    this.setData({
      cart: [],
      cartTotalPrice: 0,
      finalTotalPrice: 0,
      shippingFee: 0,
      selectedCouponIds: [],
      couponDiscountYuan: 0,
      couponSheetOpen: false
    });
    if (typeof this.loadCheckoutCoupons === 'function') {
      this.loadCheckoutCoupons();
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;

    if (key === 'detailAddress') {
      this.setData({ detailAddress: val });
      if (val && val.trim()) {
        this.reCalcFinalPrice();
      }
    } else {
      this.setData({ [`orderInfo.${key}`]: val });
    }
  },

  openSmartPasteModal() {
    this.setData({
      showSmartPasteModal: true,
      smartPasteVal: ''
    });
  },

  closeSmartPasteModal() {
    this.setData({ smartPasteClosing: true });
    setTimeout(() => {
      this.setData({
        showSmartPasteModal: false,
        smartPasteVal: '',
        smartPasteClosing: false
      });
    }, 420);
  },

  onSmartPasteInput(e) {
    this.setData({ smartPasteVal: e.detail.value });
  },

  async confirmSmartPaste() {
    const text = this.data.smartPasteVal.trim();
    if (!text) {
      this.showAutoToast('提示', '请输入内容');
      return;
    }

    wx.showLoading({
      title: '智能解析中...',
      mask: true
    });

    try {
      const { parseSmartAddress, MUNICIPALITY_PROVINCES } = require('../../../utils/smartAddressParser.js');
      const result = await parseSmartAddress(text);

      let updateData = {};

      if (result.name) updateData['orderInfo.name'] = result.name;
      if (result.phone) updateData['orderInfo.phone'] = result.phone;

      const finalProvince = result.province || '';
      const cityForFill = MUNICIPALITY_PROVINCES.includes(finalProvince) ? '' : (result.city || '');
      const districtForFill = result.district || '';

      if (!finalProvince) {
        updateData.provinceIndex = -1;
        updateData.selectedProvince = '';
        updateData.cityList = [];
        updateData.districtList = [];
        updateData.cityIndex = -1;
        updateData.districtIndex = -1;
        updateData.selectedCity = '';
        updateData.selectedDistrict = '';
      } else {
        const provinceName = finalProvince.replace('省', '').replace('市', '').replace('自治区', '').replace('特别行政区', '');
        const provinceIndex = this.data.provinceList.findIndex((p) => {
          const pName = p.name.replace('省', '').replace('自治区', '').replace('市', '').replace('特别行政区', '');
          return (
            p.name === finalProvince ||
            p.name.includes(provinceName) ||
            provinceName.includes(pName) ||
            pName === provinceName
          );
        });

        if (provinceIndex !== -1) {
          updateData.provinceIndex = provinceIndex;
          updateData.selectedProvince = this.data.provinceList[provinceIndex].name;
          updateData.cityList = [];
          updateData.districtList = [];
          updateData.cityIndex = -1;
          updateData.districtIndex = -1;
          updateData.selectedCity = '';
          updateData.selectedDistrict = '';

          if (result.detail && result.detail.trim()) {
            updateData.detailAddress = result.detail.trim();
          } else if (result.address && result.address.trim()) {
            let detail = result.address;
            if (result.province) detail = detail.replace(result.province, '').trim();
            if (cityForFill) detail = detail.replace(cityForFill, '').trim();
            if (districtForFill) detail = detail.replace(districtForFill, '').trim();
            updateData.detailAddress = detail.trim() || result.address.trim();
          }

          const fullAddressParts = [];
          if (result.province) fullAddressParts.push(result.province);
          if (cityForFill) fullAddressParts.push(cityForFill);
          if (districtForFill) fullAddressParts.push(districtForFill);
          if (result.detail) fullAddressParts.push(result.detail);
          const fullAddress = fullAddressParts.join(' ').trim() || result.address || '';
          if (fullAddress) {
            updateData['orderInfo.address'] = fullAddress;
          }

          this.setData(updateData, () => {
            if (this.data.provinceList[provinceIndex].id) {
              this.loadCityListForSmartPaste(this.data.provinceList[provinceIndex].id, cityForFill, districtForFill);
            }
            if (fullAddress && fullAddress.trim()) {
              this.reCalcFinalPrice();
            }
          });

          wx.hideLoading();
          this.closeSmartPasteModal();
          this.showAutoToast('成功', '解析完成');
          return;
        }

        updateData.provinceIndex = -1;
        updateData.selectedProvince = '';
        updateData.cityList = [];
        updateData.districtList = [];
        updateData.cityIndex = -1;
        updateData.districtIndex = -1;
        updateData.selectedCity = '';
        updateData.selectedDistrict = '';
      }

      if (result.detail && result.detail.trim()) {
        updateData.detailAddress = result.detail.trim();
      } else if (result.address && result.address.trim()) {
        let detail = result.address;
        if (result.province) detail = detail.replace(result.province, '').trim();
        if (cityForFill) detail = detail.replace(cityForFill, '').trim();
        if (districtForFill) detail = detail.replace(districtForFill, '').trim();
        updateData.detailAddress = detail.trim() || result.address.trim();
      }

      const fullAddressParts = [];
      if (result.province) fullAddressParts.push(result.province);
      if (cityForFill) fullAddressParts.push(cityForFill);
      if (districtForFill) fullAddressParts.push(districtForFill);
      if (result.detail) fullAddressParts.push(result.detail);
      const fullAddress = fullAddressParts.join(' ').trim() || result.address || '';
      if (fullAddress) {
        updateData['orderInfo.address'] = fullAddress;
      }

      this.setData(updateData);

      if (fullAddress && fullAddress.trim()) {
        this.reCalcFinalPrice();
      }

      this.closeSmartPasteModal();
      wx.hideLoading();

      if (result.name && result.phone && updateData.detailAddress) {
        this.showAutoToast('成功', '解析成功');
      } else {
        this.showAutoToast(
          '提示',
          `已解析：${result.name ? '姓名✓' : ''}${result.phone ? '电话✓' : ''}${updateData.detailAddress ? '地址✓' : ''}`
        );
      }
    } catch (error) {
      console.error('[checkout] 智能地址解析失败:', error);
      wx.hideLoading();

      const result = this.parseSmartText(text);
      const updateData = {};
      if (result.name) updateData['orderInfo.name'] = result.name;
      if (result.phone) updateData['orderInfo.phone'] = result.phone;
      if (result.address) {
        updateData.detailAddress = result.address;
        updateData['orderInfo.address'] = result.address;
      }
      this.setData(updateData);
      if (result.address && result.address.trim()) {
        this.reCalcFinalPrice();
      }
      this.closeSmartPasteModal();
      this.showAutoToast('提示', '解析完成（使用备用方案）');
    }
  },

  parseSmartText(text) {
    if (!text || !text.trim()) {
      return { name: '', phone: '', address: '' };
    }

    let name = '';
    let phone = '';
    let address = '';
    const originalText = text;

    const phonePatterns = [
      /1[3-9]\d[\s\-\.]?\d{4}[\s\-\.]?\d{4}/g,
      /\b1[3-9]\d{9}\b/g,
      /\+?86[\s\-]?1[3-9]\d{9}/g
    ];

    for (const pattern of phonePatterns) {
      const matches = originalText.match(pattern);
      if (matches && matches.length > 0) {
        phone = matches[0].replace(/[\s\-\.\+86]/g, '');
        if (phone.length === 11 && phone.startsWith('1') && /^1[3-9]\d{9}$/.test(phone)) {
          break;
        }
      }
    }

    if (!phone) {
      const telPatterns = [/0\d{2,3}[\s\-]?\d{7,8}/g, /\(0\d{2,3}\)[\s\-]?\d{7,8}/g];
      for (const pattern of telPatterns) {
        const matches = originalText.match(pattern);
        if (matches && matches.length > 0) {
          phone = matches[0].replace(/[\s\-\(\)]/g, '');
          break;
        }
      }
    }

    const addressKeywords = [
      '省', '市', '区', '县', '镇', '街道', '路', '街', '道', '号', '室', '楼', '苑', '村', '组', '栋', '单元', '层', '房', '门', '座', '广场', '大厦', '中心', '花园', '小区'
    ];
    const commonSurnames = [
      '欧阳', '太史', '端木', '上官', '司马', '东方', '独孤', '南宫', '万俟', '闻人', '夏侯', '诸葛', '尉迟', '公羊', '赫连', '澹台', '皇甫', '宗政', '濮阳', '公冶', '太叔', '申屠', '公孙', '慕容', '仲孙', '钟离', '长孙', '宇文', '司徒', '鲜于', '司空', '闾丘', '子车', '亓官', '司寇', '巫马', '公西', '颛孙', '壤驷', '公良', '漆雕', '乐正', '宰父', '谷梁', '拓跋', '夹谷', '轩辕', '令狐', '段干', '百里', '呼延', '东郭', '南门', '羊舌', '微生', '公户', '公玉', '公仪', '梁丘', '公仲', '公上', '公门', '公山', '公坚', '左丘', '公伯', '西门', '公祖', '第五', '公乘', '贯丘', '公皙', '南荣', '东里', '东宫', '仲长', '子书', '子桑', '即墨', '达奚', '褚师'
    ];

    const labelPatterns = [
      /(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]+([\u4e00-\u9fa5]{2,5})/i,
      /([\u4e00-\u9fa5]{2,5})[:：\s]*(?:收件人|收货人|姓名|联系人)/i
    ];

    for (const pattern of labelPatterns) {
      const match = originalText.match(pattern);
      if (match) {
        const candidateName = match[1];
        const hasAddressKeyword = addressKeywords.some((keyword) => candidateName.includes(keyword));
        if (!hasAddressKeyword && candidateName.length >= 2 && candidateName.length <= 5) {
          name = candidateName;
          break;
        }
      }
    }

    if (!name && phone) {
      const phoneInText = originalText.replace(/[\s\-\.]/g, '').indexOf(phone);
      if (phoneInText !== -1) {
        const beforePhone = originalText.substring(0, phoneInText).trim();
        const nameBeforeMatch = beforePhone.match(/([\u4e00-\u9fa5]{2,5})\s*$/);
        if (nameBeforeMatch) {
          const candidateName = nameBeforeMatch[1];
          const hasAddressKeyword = addressKeywords.some((keyword) => candidateName.includes(keyword));
          if (!hasAddressKeyword) {
            name = candidateName;
          }
        }

        if (!name) {
          const afterPhone = originalText.substring(phoneInText + phone.length).trim();
          const nameAfterMatch = afterPhone.match(/^\s*([\u4e00-\u9fa5]{2,5})/);
          if (nameAfterMatch) {
            const candidateName = nameAfterMatch[1];
            const hasAddressKeyword = addressKeywords.some((keyword) => candidateName.includes(keyword));
            const isCompoundSurname = commonSurnames.some((surname) => candidateName.startsWith(surname));
            if (!hasAddressKeyword && (candidateName.length <= 4 || isCompoundSurname)) {
              name = candidateName;
            }
          }
        }
      }
    }

    if (!name) {
      const cleanText = originalText
        .replace(/收件人[:：]?|收货人[:：]?|姓名[:：]?|联系人[:：]?|联系电话[:：]?|电话[:：]?|手机[:：]?|地址[:：]?|详细地址[:：]?|收件地址[:：]?|收货地址[:：]?/g, ' ')
        .replace(/号码[:：]?|编号[:：]?|单号[:：]?|订单号[:：]?|运单号[:：]?/g, ' ')
        .replace(/[()（）【】\[\]<>《》""''""''、，。；：！？]/g, ' ')
        .replace(/\d+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const nameMatch = cleanText.match(/^([\u4e00-\u9fa5]{2,5})/);
      if (nameMatch) {
        const candidateName = nameMatch[1];
        const hasAddressKeyword = addressKeywords.some((keyword) => candidateName.includes(keyword));
        const isCompoundSurname = commonSurnames.some((surname) => candidateName.startsWith(surname));
        if (!hasAddressKeyword && (candidateName.length <= 4 || isCompoundSurname)) {
          name = candidateName;
        }
      }
    }

    let addressText = originalText
      .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
      .replace(/(?:联系电话|电话|手机|号码)[:：\s]*/gi, ' ')
      .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
      .replace(/[()（）【】\[\]<>《》""''""'']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (name && name.length >= 2) {
      const namePattern = new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'g');
      addressText = addressText.replace(namePattern, ' ').trim();
    }

    if (phone) {
      addressText = addressText.replace(new RegExp(phone.replace(/(\d)/g, '\\$1'), 'g'), ' ');
      addressText = addressText.replace(/1[3-9]\d[\s\-\.]?\d{4}[\s\-\.]?\d{4}/g, ' ');
      addressText = addressText.replace(/\+?86[\s\-]?1[3-9]\d{9}/g, ' ');
    }

    addressText = addressText
      .replace(/(?:号码|编号|单号|订单号|运单号)[:：\s]*/g, ' ')
      .replace(/[、，。；：！？]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (addressText) {
      const parsedAddress = this.parseAddress(addressText);
      address = parsedAddress.fullAddress || addressText;
    }

    return {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim()
    };
  },

  parseAddress(addressText) {
    if (!addressText || !addressText.trim()) {
      return { province: '', city: '', district: '', detail: '', fullAddress: addressText };
    }

    let text = addressText.trim();
    let province = '';
    let city = '';
    let district = '';
    let detail = '';

    text = text
      .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
      .replace(/(?:电话|手机|联系电话|号码)[:：\s]*/gi, ' ')
      .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
      .replace(/(?:编号|单号|订单号|运单号)[:：\s]*/g, ' ')
      .replace(/[()（）【】\[\]<>《》""'']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let remaining = text;

    const provincePattern = /([\u4e00-\u9fa5]{1,10}省)/;
    const provinceMatch = remaining.match(provincePattern);
    if (provinceMatch) {
      const candidate = provinceMatch[1].trim();
      if (!candidate.includes('市') && !candidate.includes('区') && !candidate.includes('县')) {
        province = candidate;
        remaining = remaining.replace(new RegExp(province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }

    if (!province) {
      const provinceNames = [
        '广东', '江苏', '浙江', '山东', '河南', '四川', '湖北', '湖南', '安徽', '河北', '福建', '江西', '陕西', '山西', '云南', '贵州', '辽宁', '黑龙江', '吉林', '内蒙古', '新疆', '西藏', '青海', '甘肃', '宁夏', '海南', '广西'
      ];
      for (const pName of provinceNames) {
        if (remaining.startsWith(pName) || remaining.includes(' ' + pName + ' ') || remaining.includes(pName + '省')) {
          province = pName + '省';
          remaining = remaining.replace(new RegExp(pName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
          break;
        }
      }
    }

    const cityPattern = /([\u4e00-\u9fa5]{1,10}市)/;
    const cityMatch = remaining.match(cityPattern);
    if (cityMatch) {
      const candidate = cityMatch[1].trim();
      if (!candidate.includes('区') && !candidate.includes('县') && !candidate.includes('省')) {
        city = candidate;
        remaining = remaining.replace(new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }

    const districtPattern = /([\u4e00-\u9fa5]{1,10}[区县])/;
    const districtMatch = remaining.match(districtPattern);
    if (districtMatch) {
      const candidate = districtMatch[1].trim();
      if (!candidate.includes('省') && !candidate.includes('市')) {
        district = candidate;
        remaining = remaining.replace(new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }

    if (!district) {
      const townPattern = /([\u4e00-\u9fa5]{1,10}(?:镇|街道|乡))/;
      const townMatch = remaining.match(townPattern);
      if (townMatch) {
        district = townMatch[1].trim();
        remaining = remaining.replace(new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
      }
    }

    if (!province && !city && !district) {
      const directCities = ['北京市', '上海市', '天津市', '重庆市'];
      for (const dc of directCities) {
        if (text.includes(dc)) {
          city = dc;
          remaining = text.replace(dc, '').trim();

          const districtMatch2 = remaining.match(districtPattern);
          if (districtMatch2) {
            const candidate = districtMatch2[1].trim();
            if (!candidate.includes('省') && !candidate.includes('市')) {
              district = candidate;
              remaining = remaining.replace(new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
            }
          }
          break;
        }
      }
    }

    detail = remaining
      .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
      .replace(/(?:电话|手机|联系电话|号码)[:：\s]*/gi, ' ')
      .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
      .replace(/(?:编号|单号|订单号|运单号)[:：\s]*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const parts = [];
    if (province) parts.push(province);
    if (city) parts.push(city);
    if (district) parts.push(district);
    if (detail) parts.push(detail);

    let fullAddress = parts.join(' ').trim();

    if (!fullAddress || (!province && !city)) {
      const cleanedOriginal = addressText
        .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
        .replace(/(?:电话|手机|联系电话|号码)[:：\s]*/gi, ' ')
        .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      fullAddress = cleanedOriginal || addressText;
    }

    return {
      province,
      city,
      district,
      detail,
      fullAddress
    };
  },

  resolveAddressForOrder() {
    const detailAddress = (this.data.detailAddress || '').trim();
    const parsedDetail = this.parseAddress(detailAddress);
    const orderAddr = this.data.orderInfo && this.data.orderInfo.address ? String(this.data.orderInfo.address).trim() : '';
    const parsedOrder = orderAddr
      ? this.parseAddress(orderAddr)
      : { province: '', city: '', district: '', detail: '', fullAddress: '' };
    const pSel = (this.data.selectedProvince || '').trim();
    const cSel = (this.data.selectedCity || '').trim();
    const dSel = (this.data.selectedDistrict || '').trim();

    const province = parsedDetail.province || parsedOrder.province || pSel;
    const city = parsedDetail.city || parsedOrder.city || cSel;
    const district = parsedDetail.district || parsedOrder.district || dSel;
    const detail = parsedDetail.detail && parsedDetail.detail.trim() ? parsedDetail.detail.trim() : detailAddress;

    const seg = [province, city, district, detail].filter((s) => s && String(s).trim());
    const fullAddress =
      seg.join(' ').trim() || parsedDetail.fullAddress || parsedOrder.fullAddress || orderAddr || detailAddress;

    return { province, city, district, detail, fullAddress };
  },

  handleCartQty(e) {
    const idx = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    const cart = [...this.data.cart];

    if (type === 'plus') {
      cart[idx].quantity++;
    } else if (cart[idx].quantity > 1) {
      cart[idx].quantity--;
    } else {
      cart.splice(idx, 1);
    }

    if (cart[idx]) {
      cart[idx].total = cart[idx].quantity * cart[idx].price;
    }

    this.saveCartToCache(cart);
  },

  saveCartToCache(newCart) {
    const newTotal = newCart.reduce((sum, item) => sum + item.total, 0);

    this.setData({
      cart: newCart,
      cartTotalPrice: newTotal
    });
    this.reCalcFinalPrice(newTotal);

    wx.setStorageSync('my_cart', newCart);
  },

  clearCart() {
    this.showMyDialog({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      showCancel: true,
      confirmText: '清空',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            cart: [],
            cartTotalPrice: 0,
            finalTotalPrice: 0,
            shippingFee: 0
          });
          wx.removeStorageSync('my_cart');
          this.showAutoToast('成功', '已清空');
        }
      }
    });
  },

  _cartIsAccessoryOnly(cart) {
    const list = cart || this.data.cart || [];
    if (!list.length) return false;
    if (list.some((item) => item && item.type === 'main')) return false;
    return list.every((item) => item && item.type === 'accessory');
  },

  _shopQualifiesFreeShipping(cart, goodsSubtotal) {
    if (this._cartIsAccessoryOnly(cart)) return true;
    return (Number(goodsSubtotal) || 0) > 50;
  },

  _provinceShippingFee(province) {
    const p = (province || '').trim();
    if (!p) return 0;
    if (p.indexOf('广东') > -1) return 13;
    return 22;
  },

  _ztoAccessoryShippingFee(province) {
    const p = (province || '').trim();
    if (!p) return 0;
    if (p.indexOf('广东') > -1) return 12;
    return 15;
  },

  _resolveProvinceForShipping() {
    const { detailAddress } = this.data;
    if (!detailAddress || !String(detailAddress).trim()) return '';
    return (this.resolveAddressForOrder().province || '').trim();
  },

  reCalcFinalPrice(goodsPrice = this.data.cartTotalPrice) {
    const { shippingMethod } = this.data;
    const cart = this.data.cart || [];
    const freeShipping = this._shopQualifiesFreeShipping(cart, goodsPrice);
    const province = this._resolveProvinceForShipping();
    let fee = 0;

    if (!freeShipping) {
      if (shippingMethod === 'zto') {
        fee = this._ztoAccessoryShippingFee(province);
      } else if (shippingMethod === 'sf') {
        fee = this._provinceShippingFee(province);
      }
    }

    const subtotal = this._roundMoney(goodsPrice + fee);
    const { discount, hint } = this._calcCouponDiscount(subtotal);
    let finalTotal = this._roundMoney(subtotal - discount);
    if (finalTotal < 0.01 && subtotal > 0) finalTotal = 0.01;

    this.setData({
      shippingFee: fee,
      cartTotalPrice: goodsPrice,
      preCouponTotalYuan: subtotal,
      couponDiscountYuan: discount,
      couponHint: hint,
      finalTotalPrice: this.properties.isAdmin ? subtotal : finalTotal,
      checkoutFreeShipping: freeShipping
    });
  },

  changeShipping(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({ shippingMethod: method });
    this.reCalcFinalPrice();
  },

  loadProvinceList() {
    const cachedProvinceList = wx.getStorageSync('province_list');
    const cacheTime = wx.getStorageSync('province_list_time') || 0;
    const now = Date.now();
    const cacheValidTime = 24 * 60 * 60 * 1000;

    if (cachedProvinceList && cachedProvinceList.length > 0 && now - cacheTime < cacheValidTime) {
      this.setData({ provinceList: cachedProvinceList });
      return;
    }

    if (cachedProvinceList && now - cacheTime >= cacheValidTime) {
      wx.removeStorageSync('province_list');
      wx.removeStorageSync('province_list_time');
    }

    this.setDefaultProvinceList();
  },

  setDefaultProvinceList() {
    const defaultProvinces = [
      { name: '北京市', id: '110000' },
      { name: '天津市', id: '120000' },
      { name: '河北省', id: '130000' },
      { name: '山西省', id: '140000' },
      { name: '内蒙古自治区', id: '150000' },
      { name: '辽宁省', id: '210000' },
      { name: '吉林省', id: '220000' },
      { name: '黑龙江省', id: '230000' },
      { name: '上海市', id: '310000' },
      { name: '江苏省', id: '320000' },
      { name: '浙江省', id: '330000' },
      { name: '安徽省', id: '340000' },
      { name: '福建省', id: '350000' },
      { name: '江西省', id: '360000' },
      { name: '山东省', id: '370000' },
      { name: '河南省', id: '410000' },
      { name: '湖北省', id: '420000' },
      { name: '湖南省', id: '430000' },
      { name: '广东省', id: '440000' },
      { name: '广西壮族自治区', id: '450000' },
      { name: '海南省', id: '460000' },
      { name: '重庆市', id: '500000' },
      { name: '四川省', id: '510000' },
      { name: '贵州省', id: '520000' },
      { name: '云南省', id: '530000' },
      { name: '西藏自治区', id: '540000' },
      { name: '陕西省', id: '610000' },
      { name: '甘肃省', id: '620000' },
      { name: '青海省', id: '630000' },
      { name: '宁夏回族自治区', id: '640000' },
      { name: '新疆维吾尔自治区', id: '650000' }
    ];

    wx.setStorageSync('province_list', defaultProvinces);
    wx.setStorageSync('province_list_time', Date.now());

    this.setData({ provinceList: defaultProvinces });
  },

  onProvinceChange(e) {
    const index = parseInt(e.detail.value, 10);
    const province = this.data.provinceList[index];
    if (!province) return;

    this.setData({
      provinceIndex: index,
      selectedProvince: province.name,
      selectedCity: '',
      selectedDistrict: '',
      cityList: [],
      districtList: [],
      cityIndex: -1,
      districtIndex: -1
    });

    if (province.id) this.loadCityList(province.id);
    this.reCalcFinalPrice();
  },

  onCityChange(e) {
    const index = parseInt(e.detail.value, 10);
    const city = this.data.cityList[index];
    if (!city) return;

    this.setData({
      cityIndex: index,
      selectedCity: city.name,
      selectedDistrict: '',
      districtList: [],
      districtIndex: -1
    });

    if (city.id) this.loadDistrictList(city.id);
    this.reCalcFinalPrice();
  },

  onDistrictChange(e) {
    const index = parseInt(e.detail.value, 10);
    const district = this.data.districtList[index];
    if (!district) return;

    this.setData({
      districtIndex: index,
      selectedDistrict: district.name
    });
    this.reCalcFinalPrice();
  },

  loadCityList(provinceId) {
    if (!qqmapsdk || !qqmapsdkDistrict) return;

    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
      this.setData({ cityList: cachedCityList });
      return;
    }

    const setCityList = (cities) => {
      const cityList = (cities || []).map((c) => ({ id: c.id, name: c.fullname || c.name }));
      wx.setStorageSync(cacheKey, cityList);
      this.setData({ cityList });
    };

    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          const allCities = res.result[1] || [];
          const provincePrefix = String(provinceId).substring(0, 2);
          const cityList = allCities
            .filter((c) => String(c.id || '').substring(0, 2) === provincePrefix)
            .map((c) => ({ id: c.id, name: c.fullname || c.name }));
          wx.setStorageSync(cacheKey, cityList);
          this.setData({ cityList });
          return;
        }
        qqmapsdkDistrict.getDistrictByCityId({
          id: provinceId,
          success: (res2) => {
            if (res2.status === 0 && res2.result && res2.result.length > 0) {
              setCityList(res2.result[0] || []);
            } else {
              this.setData({ cityList: [] });
            }
          },
          fail: () => this.setData({ cityList: [] })
        });
      },
      fail: () => {
        qqmapsdkDistrict.getDistrictByCityId({
          id: provinceId,
          success: (res2) => {
            if (res2.status === 0 && res2.result && res2.result.length > 0) {
              setCityList(res2.result[0] || []);
            } else {
              this.setData({ cityList: [] });
            }
          },
          fail: () => this.setData({ cityList: [] })
        });
      }
    });
  },

  loadDistrictList(cityId) {
    if (!qqmapsdkDistrict) return;

    const cacheKey = `district_list_${cityId}`;
    const cachedDistrictList = wx.getStorageSync(cacheKey);
    if (cachedDistrictList && cachedDistrictList.length > 0) {
      this.setData({ districtList: cachedDistrictList });
      return;
    }

    qqmapsdkDistrict.getDistrictByCityId({
      id: cityId,
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 0) {
          const districtList = (res.result[0] || []).map((d) => ({
            id: d.id,
            name: d.fullname || d.name
          }));
          wx.setStorageSync(cacheKey, districtList);
          this.setData({ districtList });
        } else {
          this._applyDistrictFallbackBySelectedCity();
        }
      },
      fail: () => this._applyDistrictFallbackBySelectedCity()
    });
  },

  _applyDistrictFallbackBySelectedCity() {
    const selectedCity = String(this.data.selectedCity || '').trim();
    const selectedProvince = String(this.data.selectedProvince || '').trim();
    const key = selectedCity || selectedProvince;
    const fallback = MUNICIPALITY_DISTRICTS[key] || [];
    if (!fallback.length) {
      this.setData({ districtList: [] });
      return;
    }
    const districtList = fallback.map((name, idx) => ({ id: `fallback_${idx}`, name }));
    this.setData({ districtList });
  },

  loadCityListForSmartPaste(provinceId, targetCity, targetDistrict) {
    if (!qqmapsdk || !qqmapsdkDistrict) {
      if (targetCity) this.setData({ selectedCity: targetCity, cityList: [] });
      return;
    }

    const cacheKey = `city_list_${provinceId}`;
    const cachedCityList = wx.getStorageSync(cacheKey);
    if (cachedCityList && cachedCityList.length > 0) {
      this.setData({ cityList: cachedCityList });
      if (targetCity) {
        let cityIndex = cachedCityList.findIndex((c) => c.name === targetCity);
        if (cityIndex === -1) {
          const cityName = targetCity.replace('市', '').replace('自治州', '').replace('地区', '');
          cityIndex = cachedCityList.findIndex((c) => {
            const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
            return cName === cityName;
          });
        }
        if (cityIndex === -1) {
          const cityName = targetCity.replace('市', '');
          cityIndex = cachedCityList.findIndex(
            (c) => c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''))
          );
        }
        if (cityIndex !== -1) {
          wx.nextTick(() => {
            this.setData(
              {
                cityIndex,
                selectedCity: cachedCityList[cityIndex].name
              },
              () => {
                if (cachedCityList[cityIndex].id && targetDistrict) {
                  this.loadDistrictListForSmartPaste(cachedCityList[cityIndex].id, targetDistrict);
                }
              }
            );
          });
        } else {
          this.setData({ selectedCity: targetCity });
        }
      }
      return;
    }

    qqmapsdk.getCityList({
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 1) {
          const allCities = res.result[1] || [];
          const provincePrefix = String(provinceId).substring(0, 2);
          const cityList = allCities
            .filter((c) => String(c.id || '').substring(0, 2) === provincePrefix)
            .map((c) => ({ id: c.id, name: c.fullname || c.name }));
          wx.setStorageSync(cacheKey, cityList);
          this.setData({ cityList });
          this._matchCityAfterSmartPasteLoad(cityList, targetCity, targetDistrict);
        } else {
          this._loadCityListForSmartPasteFallback(provinceId, targetCity, targetDistrict, cacheKey);
        }
      },
      fail: () => {
        this._loadCityListForSmartPasteFallback(provinceId, targetCity, targetDistrict, cacheKey);
      }
    });
  },

  _loadCityListForSmartPasteFallback(provinceId, targetCity, targetDistrict, cacheKey) {
    qqmapsdkDistrict.getDistrictByCityId({
      id: provinceId,
      success: (res2) => {
        if (res2.status === 0 && res2.result && res2.result.length > 0) {
          const cities = res2.result[0] || [];
          const cityList = cities.map((c) => ({ id: c.id, name: c.fullname || c.name }));
          wx.setStorageSync(cacheKey, cityList);
          this.setData({ cityList });
          this._matchCityAfterSmartPasteLoad(cityList, targetCity, targetDistrict);
        }
      },
      fail: () => {
        if (targetCity) {
          this.setData({ selectedCity: targetCity, cityList: [] });
        }
      }
    });
  },

  _matchCityAfterSmartPasteLoad(cityList, targetCity, targetDistrict) {
    if (!targetCity || !cityList || !cityList.length) return;
    let cityIndex = cityList.findIndex((c) => c.name === targetCity);
    if (cityIndex === -1) {
      const cityName = targetCity.replace('市', '').replace('自治州', '').replace('地区', '');
      cityIndex = cityList.findIndex((c) => {
        const cName = c.name.replace('市', '').replace('自治州', '').replace('地区', '');
        return cName === cityName;
      });
    }
    if (cityIndex === -1) {
      const cityName = targetCity.replace('市', '');
      cityIndex = cityList.findIndex(
        (c) => c.name.includes(cityName) || cityName.includes(c.name.replace('市', ''))
      );
    }
    if (cityIndex !== -1) {
      wx.nextTick(() => {
        this.setData(
          {
            cityIndex,
            selectedCity: cityList[cityIndex].name
          },
          () => {
            if (cityList[cityIndex].id && targetDistrict) {
              this.loadDistrictListForSmartPaste(cityList[cityIndex].id, targetDistrict);
            }
          }
        );
      });
    } else {
      this.setData({ selectedCity: targetCity });
    }
  },

  loadDistrictListForSmartPaste(cityId, targetDistrict) {
    if (!qqmapsdkDistrict) return;

    qqmapsdkDistrict.getDistrictByCityId({
      id: cityId,
      success: (res) => {
        if (res.status === 0 && res.result && res.result.length > 0) {
          const districts = res.result[0] || [];
          const districtList = districts.map((d) => ({
            id: d.id,
            name: d.fullname || d.name
          }));
          this.setData({ districtList });
          if (targetDistrict) {
            const districtName = targetDistrict.replace('区', '').replace('县', '').replace('镇', '').replace('街道', '');
            const districtIndex = districtList.findIndex((d) => {
              const dName = d.name.replace('区', '').replace('县', '').replace('自治县', '').replace('市辖区', '');
              return (
                d.name === targetDistrict ||
                d.name.includes(districtName) ||
                districtName.includes(dName) ||
                dName === districtName
              );
            });
            if (districtIndex !== -1) {
              this.setData({
                districtIndex,
                selectedDistrict: districtList[districtIndex].name
              });
            }
          }
        }
      },
      fail: () => {
        this.setData({ districtList: [] });
      }
    });
  },

  onDisclaimerChange(e) {
    const checked = Array.isArray(e.detail.value) && e.detail.value.includes('agree');
    this.setData({ agreedToDisclaimer: checked });
  },

  showDisclaimerModal() {
    const disclaimerContent = `
<div style="line-height: 2; font-size: 28rpx; color: #333;">
  <div style="font-weight: 600; margin-bottom: 30rpx; font-size: 32rpx; color: #000;">重要提示</div>
  
  <div style="margin-bottom: 30rpx; line-height: 2.2;">
    本产品（<span style="font-weight: 600;">电动折叠牌照架</span>）<span style="color: #FF3B30; font-weight: 600;">仅限赛道使用</span>。
  </div>
  
  <div style="margin-bottom: 20rpx; line-height: 2.2;">
    如用户将本产品用于道路行驶，用户需自行承担一切法律责任和风险，包括但不限于：
  </div>
  
  <div style="margin-left: 30rpx; margin-bottom: 20rpx; line-height: 2.2;">
    • 交通违法责任
  </div>
  <div style="margin-left: 30rpx; margin-bottom: 20rpx; line-height: 2.2;">
    • 交通事故责任
  </div>
  <div style="margin-left: 30rpx; margin-bottom: 20rpx; line-height: 2.2;">
    • 车辆年检不合格责任
  </div>
  <div style="margin-left: 30rpx; margin-bottom: 30rpx; line-height: 2.2;">
    • 其他因违规使用导致的法律后果
  </div>
  
  <div style="color: #666; font-size: 26rpx; line-height: 2; margin-top: 30rpx; padding-top: 20rpx; border-top: 1rpx solid #eee;">
    购买即视为用户已充分理解并同意上述免责条款。
  </div>
</div>
    `.trim();

    this.showMyDialog({
      title: '免责协议',
      content: disclaimerContent,
      showCancel: false,
      confirmText: '我已阅读并同意'
    });
  },

  showError(msg) {
    this.showAutoToast('提示', msg);
  },

  showMyLoading(title = '加载中...') {
    if (wx.__mt_oldHideLoading) {
      wx.__mt_oldHideLoading();
    }
    this.setData({ showLoadingAnimation: true, loadingText: title });
  },

  hideMyLoading() {
    this.setData({ showLoadingAnimation: false });
  },

  showMyDialog(options) {
    this._dialogCallback = typeof options.success === 'function' ? options.success : null;
    this.setData({
      'dialog.show': true,
      'dialog.title': options.title || '提示',
      'dialog.content': options.content || '',
      'dialog.showCancel': options.showCancel || false,
      'dialog.confirmText': options.confirmText || '确定',
      'dialog.cancelText': options.cancelText || '取消'
    });
  },

  _closeDialogWithAnimation(callback) {
    this.setData({ dialogClosing: true });
    setTimeout(() => {
      this.setData({
        'dialog.show': false,
        dialogClosing: false
      });
      if (typeof callback === 'function') {
        callback();
      }
    }, 420);
  },

  closeCustomDialog() {
    this._dialogCallback = null;
    this._closeDialogWithAnimation();
  },

  onDialogConfirm() {
    const cb = this._dialogCallback;
    this._dialogCallback = null;
    this._closeDialogWithAnimation(() => {
      if (cb) cb({ confirm: true });
    });
  },

  showAutoToast(title = '提示', content = '') {
    if (this.data.autoToast.show) {
      this._closeAutoToastWithAnimation();
      setTimeout(() => {
        this._showAutoToastInternal(title, content);
      }, 420);
    } else {
      this._showAutoToastInternal(title, content);
    }
  },

  _showAutoToastInternal(title, content) {
    this.setData({
      'autoToast.show': true,
      'autoToast.title': title,
      'autoToast.content': content,
      autoToastClosing: false
    });
    setTimeout(() => {
      this._closeAutoToastWithAnimation();
    }, 2000);
  },

  _closeAutoToastWithAnimation() {
    if (!this.data.autoToast.show) return;
    this.setData({ autoToastClosing: true });
    setTimeout(() => {
      this.setData({
        'autoToast.show': false,
        autoToastClosing: false
      });
    }, 420);
  },

  noop() {},

  submitOrder() {
    const { cart, orderInfo, detailAddress, shippingFee, shippingMethod } = this.data;

    if (!this.data.agreedToDisclaimer) {
      this.setData({ 'autoToast.show': false });
      this.showMyDialog({
        title: '确认',
        content: '是否已阅读免责协议？',
        showCancel: true,
        cancelText: '取消',
        confirmText: '确认',
        success: () => {
          this.setData({ agreedToDisclaimer: true });
        }
      });
      return;
    }

    if (cart.length === 0) {
      return this.showError('购物车为空');
    }

    if (!orderInfo.name) {
      return this.showError('请填写收货人姓名');
    }

    if (!orderInfo.phone || !/^1[3-9]\d{9}$/.test(orderInfo.phone)) {
      return this.showError('请输入正确的11位手机号');
    }

    if (!detailAddress || !detailAddress.trim()) {
      return this.showError('请填写详细地址');
    }

    const addr = this.resolveAddressForOrder();
    if (!addr.province && !addr.city) {
      return this.showError('请填写省、市、区');
    }

    const fullAddressString = addr.fullAddress || detailAddress;
    const finalOrderInfo = {
      ...orderInfo,
      address: fullAddressString
    };

    const needShipFee = !this.data.checkoutFreeShipping;
    if (needShipFee && shippingFee === 0) {
      return this.showError('请完善地址信息以计算运费');
    }

    this.reCalcFinalPrice();
    const currentFinalTotalPrice = this.data.finalTotalPrice;
    const currentShippingFee = this.data.shippingFee;

    if (this.data.couponHint && (this.data.selectedCouponIds || []).length) {
      return this.showError(this.data.couponHint);
    }

    this.setData({ 'autoToast.show': false });

    this.showMyDialog({
      title: '确认支付',
      content: '定制产品不支持退换服务。',
      showCancel: true,
      confirmText: '支付',
      cancelText: '取消',
      success: () => {
        withRepairProgressSubscribe(() => {
          this.doRealPayment(cart, finalOrderInfo, currentFinalTotalPrice, currentShippingFee, shippingMethod);
        });
      }
    });
  },

  doRealPayment(cart, orderInfo, finalTotalPrice, shippingFee, shippingMethod) {
    if (!cart) {
      const data = this.data;
      cart = data.cart;
      orderInfo = data.orderInfo;
      finalTotalPrice = data.finalTotalPrice;
      shippingFee = data.shippingFee;
      shippingMethod = data.shippingMethod;
    }

    const isAdminPay = !!this.properties.isAdmin;
    let payAmount = finalTotalPrice;
    if (isAdminPay) {
      payAmount = 0.01;
    }

    if (!payAmount || payAmount <= 0 || isNaN(payAmount)) {
      this.showAutoToast('支付失败', `订单金额异常（${payAmount}），请重新选择商品`);
      return;
    }

    this.showMyLoading('唤起收银台...');

    let userNickname = '';
    try {
      const savedNickname = wx.getStorageSync('user_nickname');
      if (savedNickname) {
        userNickname = savedNickname;
      } else {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.nickName) {
          userNickname = userInfo.nickName;
        }
      }
    } catch (e) {}

    let addressPayload = orderInfo;
    try {
      const a = this.resolveAddressForOrder();
      addressPayload = { ...(orderInfo || {}), province: a.province, city: a.city, district: a.district };
    } catch (e) {
      addressPayload = {
        ...(orderInfo || {}),
        province: this.data.selectedProvince,
        city: this.data.selectedCity,
        district: this.data.selectedDistrict
      };
    }

    const repairId = (() => {
      let r = ((this.properties && this.properties.repairId) || '').toString().trim();
      if (r) return r;
      try {
        r = (wx.getStorageSync('guided_parts_repair_id') || '').toString().trim();
      } catch (e) {}
      return r;
    })();

    const couponIds = isAdminPay ? [] : (this.data.selectedCouponIds || []);

    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        totalPrice: payAmount,
        goods: cart,
        addressData: addressPayload,
        shippingFee: isAdminPay ? 0 : shippingFee,
        shippingMethod: shippingMethod,
        orderSource: 'shop',
        userNickname: userNickname,
        repairId: repairId,
        couponIds
      },
      success: (res) => {
        this.hideMyLoading();
        const payment = res.result;

        if (payment && payment.error) {
          this.showAutoToast('支付失败', payment.msg || '支付系统异常，请稍后再试');
          return;
        }

        if (!payment || !payment.paySign) {
          this.showAutoToast('提示', '支付系统对接中，请稍后再试');
          return;
        }

        wx.requestPayment({
          ...payment,
          success: () => {
            this.showAutoToast('成功', '支付成功');
            this._cartClearedAfterPay = false;

            const orderId = payment.outTradeNo;
            if (orderId) {
              this.startPaymentVerification(orderId, { clearCartOnConfirm: true });
            }

            const addrForSave = this.resolveAddressForOrder();
            const saveOrderInfo = {
              ...orderInfo,
              address: addrForSave.fullAddress || orderInfo.address
            };
            wx.setStorageSync('last_address', saveOrderInfo);

            this.triggerEvent('paid', { orderId });
            this.closeCheckout();
          },
          fail: (err) => {
            let errorMsg = '支付已取消';
            if (err.errMsg) {
              if (err.errMsg.indexOf('cancel') > -1 || err.errMsg.indexOf('取消') > -1) {
                errorMsg = '订单已生成，可在待付款中继续支付';
              } else if (err.errMsg.indexOf('fail') > -1 || err.errMsg.indexOf('失败') > -1) {
                errorMsg = '支付失败，请在待付款中重试';
              } else {
                errorMsg = err.errMsg;
              }
            }
            this._finalizeUnpaidOrder(payment);
            this.showAutoToast('提示', errorMsg);
          }
        });
      },
      fail: (err) => {
        this.hideMyLoading();
        this.showAutoToast('创建订单失败', err.errMsg || '网络错误，请重试');
      }
    });
  },

  startPaymentVerification(orderId, opts = {}) {
    if (!orderId) return;
    const clearCartOnConfirm = !!opts.clearCartOnConfirm;
    this.callCheckPayResult(orderId, 1, {
      maxAttempts: 6,
      intervalMs: 2500,
      showLoading: true,
      silent: false,
      clearCartOnConfirm
    });
    setTimeout(() => {
      this.callCheckPayResult(orderId, 1, {
        maxAttempts: 4,
        intervalMs: 3000,
        showLoading: false,
        silent: true,
        clearCartOnConfirm
      });
    }, 12000);
    setTimeout(() => {
      this.callCheckPayResult(orderId, 1, {
        maxAttempts: 3,
        intervalMs: 3500,
        showLoading: false,
        silent: true,
        clearCartOnConfirm
      });
    }, 28000);
  },

  callCheckPayResult(orderId, attempt = 1, options = {}) {
    if (!orderId) return;
    const maxAttempts = options.maxAttempts || 6;
    const intervalMs = options.intervalMs || 2500;
    const silent = !!options.silent;
    const showLoading = !!options.showLoading && !silent;
    if (showLoading) {
      this.showMyLoading(attempt === 1 ? '确认订单中...' : '再次确认...');
    }

    wx.cloud.callFunction({
      name: 'checkPayResult',
      data: { orderId },
      success: (res) => {
        const result = res.result || {};
        if (result.success) {
          if (options.clearCartOnConfirm) {
            this._clearCartAfterPaid();
          }
          if (!silent) {
            this.showAutoToast('成功', '订单已确认');
          }
        } else if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1, options), intervalMs);
        } else if (!silent) {
          this.showAutoToast('提示', result.msg || '支付状态待确认，请稍后在"我的订单"查看');
        }
      },
      fail: () => {
        if (attempt < maxAttempts) {
          setTimeout(() => this.callCheckPayResult(orderId, attempt + 1, options), intervalMs);
        } else if (!silent) {
          this.showAutoToast('提示', '网络异常，请稍后在"我的订单"查看');
        }
      },
      complete: () => {
        if (showLoading) {
          this.hideMyLoading();
        }
      }
    });
  }
};

module.exports = {
  checkoutDataInitial,
  initMaps,
  methods
};
