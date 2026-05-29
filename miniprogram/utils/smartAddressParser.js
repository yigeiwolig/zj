/**
 * 智能地址解析工具
 * 使用腾讯地图API进行精准地址解析
 */
const QQMapWX = require('./qqmap-wx-jssdk.js');

// 🔴 使用专门的关键词输入提示key（用于地址解析）
const qqmapsdk = new QQMapWX({
  key: 'CFDBZ-B6K6N-B3EFF-SPDJ2-Y2MRZ-7UBH2'
});

/** 直辖市省级名称（省市区联动：省=直辖市全称，中间「市」留空） */
const MUNICIPALITY_PROVINCES = ['北京市', '上海市', '天津市', '重庆市'];

/** 直辖市标准区县名（用于从粘贴文本反查纠偏） */
const MUNICIPALITY_DISTRICTS = {
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '顺义区', '昌平区', '大兴区', '房山区', '门头沟区', '怀柔区', '平谷区', '密云区', '延庆区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区', '嘉定区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'],
  '天津市': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区'],
  '重庆市': ['渝中区', '江北区', '南岸区', '沙坪坝区', '九龙坡区', '大渡口区', '北碚区', '渝北区', '巴南区', '两江新区', '涪陵区', '万州区', '黔江区', '长寿区', '江津区', '合川区']
};

/** 常见地级市 → 省级（含直辖市：市名→自身） */
const CITY_TO_PROVINCE_MAP = {
  '东莞市': '广东省', '深圳市': '广东省', '广州市': '广东省', '佛山市': '广东省', '中山市': '广东省',
  '珠海市': '广东省', '惠州市': '广东省', '江门市': '广东省', '肇庆市': '广东省', '汕头市': '广东省',
  '潮州市': '广东省', '揭阳市': '广东省', '汕尾市': '广东省', '湛江市': '广东省', '茂名市': '广东省',
  '阳江市': '广东省', '韶关市': '广东省', '清远市': '广东省', '云浮市': '广东省', '梅州市': '广东省',
  '河源市': '广东省', '北京市': '北京市', '上海市': '上海市', '天津市': '天津市', '重庆市': '重庆市',
  '杭州市': '浙江省', '宁波市': '浙江省', '温州市': '浙江省', '嘉兴市': '浙江省', '湖州市': '浙江省',
  '绍兴市': '浙江省', '金华市': '浙江省', '衢州市': '浙江省', '舟山市': '浙江省', '台州市': '浙江省',
  '丽水市': '浙江省', '南京市': '江苏省', '苏州市': '江苏省', '无锡市': '江苏省', '常州市': '江苏省',
  '镇江市': '江苏省', '扬州市': '江苏省', '泰州市': '江苏省', '南通市': '江苏省', '盐城市': '江苏省',
  '淮安市': '江苏省', '宿迁市': '江苏省', '连云港市': '江苏省', '徐州市': '江苏省', '成都市': '四川省',
  '武汉市': '湖北省', '长沙市': '湖南省', '郑州市': '河南省', '西安市': '陕西省', '济南市': '山东省',
  '青岛市': '山东省', '石家庄市': '河北省', '太原市': '山西省', '沈阳市': '辽宁省', '长春市': '吉林省',
  '哈尔滨市': '黑龙江省', '合肥市': '安徽省', '福州市': '福建省', '厦门市': '福建省', '南昌市': '江西省',
  '南宁市': '广西壮族自治区', '海口市': '海南省', '昆明市': '云南省', '贵阳市': '贵州省', '拉萨市': '西藏自治区',
  '兰州市': '甘肃省', '西宁市': '青海省', '银川市': '宁夏回族自治区', '乌鲁木齐市': '新疆维吾尔自治区',
  '呼和浩特市': '内蒙古自治区'
};

function inferProvinceFromCity(cityName) {
  if (!cityName || !String(cityName).trim()) return '';
  const key = String(cityName).trim();
  if (MUNICIPALITY_PROVINCES.includes(key)) return key;
  return CITY_TO_PROVINCE_MAP[key] || '';
}

function localParseQualifiesForSkipApi(lp) {
  if (!lp || !(lp.province || '').trim()) return false;
  const p = lp.province.trim();
  if (MUNICIPALITY_PROVINCES.includes(p)) return true;
  return !!(lp.city && lp.city.trim());
}

/**
 * 统一直辖市字段：省=直辖市全称、地级「市」留空、区县纠偏（与各页智能粘贴逻辑一致）
 */
function normalizeMunicipalityRegion(parsed, originalText = '') {
  let province = (parsed.province || '').trim();
  let city = (parsed.city || '').trim();
  let district = (parsed.district || '').trim();
  let detail = (parsed.detail || '').trim();
  const address = (parsed.address || parsed.fullAddress || '').trim();
  const rawCityFromParser = city;

  if (!province && city) {
    province = inferProvinceFromCity(city);
  }
  if (!province && originalText) {
    const hit = MUNICIPALITY_PROVINCES.find((m) => originalText.includes(m));
    if (hit) province = hit;
  }

  if (MUNICIPALITY_PROVINCES.includes(province) && city === province) {
    city = '';
  }
  if (!province && MUNICIPALITY_PROVINCES.includes(city)) {
    province = city;
    city = '';
  }

  if (MUNICIPALITY_PROVINCES.includes(province)) {
    const isDistrictLike = (v = '') => /(区|县|镇|乡|街道)$/.test(String(v).trim());
    const isStreetLike = (v = '') => /(\d|路|街|号|栋|单元|室|园|小区|大厦|广场|村|巷)/.test(String(v).trim());

    let targetCity = city;
    let targetDistrict = district;
    let targetDetail = detail;

    if (!targetCity || isDistrictLike(targetCity)) {
      if (!targetDistrict && targetCity) targetDistrict = targetCity;
      targetCity = province;
    }

    if (targetDistrict && isStreetLike(targetDistrict) && rawCityFromParser && isDistrictLike(rawCityFromParser)) {
      targetDetail = `${targetDistrict} ${targetDetail}`.trim();
      targetDistrict = rawCityFromParser;
      targetCity = province;
    }

    if (!targetDistrict && rawCityFromParser && isDistrictLike(rawCityFromParser)) {
      targetDistrict = rawCityFromParser;
    }

    const muniDistricts = MUNICIPALITY_DISTRICTS[province] || [];
    const sourceText = `${originalText || ''} ${address || ''} ${parsed.detail || ''}`;
    const hitDistrict = muniDistricts.find((name) => sourceText.includes(name));
    if (hitDistrict) {
      targetDistrict = hitDistrict;
    }

    city = '';
    district = targetDistrict;
    detail = targetDetail;
  }

  const parts = [];
  if (province) parts.push(province);
  if (city) parts.push(city);
  if (district) parts.push(district);
  if (detail) parts.push(detail);
  const fullAddress = parts.join(' ').trim() || (parsed.fullAddress || '').trim() || address;

  return {
    ...parsed,
    province,
    city,
    district,
    detail,
    address: fullAddress,
    fullAddress
  };
}

/**
 * 本地地址解析（备用方案）
 * @param {String} addressText - 地址文本
 * @returns {Object} 解析结果
 */
function parseAddressLocally(addressText) {
  if (!addressText || !addressText.trim()) {
    return { province: '', city: '', district: '', detail: '', fullAddress: '' };
  }
  
  let text = addressText.trim();
  let province = '';
  let city = '';
  let district = '';
  let detail = '';
  
  // 清理文本
  text = text
    .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
    .replace(/(?:电话|手机|联系电话|号码)[:：\s]*/gi, ' ')
    .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
    .replace(/(?:编号|单号|订单号|运单号)[:：\s]*/g, ' ')
    .replace(/[()（）【】\[\]<>《》""'']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  let remaining = text;
  
  // 识别省
  const provincePattern = /([\u4e00-\u9fa5]{1,10}省)/;
  const provinceMatch = remaining.match(provincePattern);
  if (provinceMatch) {
    const candidate = provinceMatch[1].trim();
    if (!candidate.includes('市') && !candidate.includes('区') && !candidate.includes('县')) {
      province = candidate;
      remaining = remaining.replace(new RegExp(province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
    }
  }
  
  // 识别不带"省"字的省份
  if (!province) {
    const provinceNames = ['广东', '江苏', '浙江', '山东', '河南', '四川', '湖北', '湖南', '安徽', '河北', '福建', '江西', '陕西', '山西', '云南', '贵州', '辽宁', '黑龙江', '吉林', '内蒙古', '新疆', '西藏', '青海', '甘肃', '宁夏', '海南', '广西'];
    for (const pName of provinceNames) {
      if (remaining.startsWith(pName) || remaining.includes(' ' + pName + ' ') || remaining.includes(pName + '省')) {
        province = pName + '省';
        remaining = remaining.replace(new RegExp(pName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
        break;
      }
    }
  }
  
  // 识别市
  const cityPattern = /([\u4e00-\u9fa5]{1,10}市)/;
  const cityMatch = remaining.match(cityPattern);
  if (cityMatch) {
    const candidate = cityMatch[1].trim();
    if (!candidate.includes('区') && !candidate.includes('县') && !candidate.includes('省')) {
      city = candidate;
      remaining = remaining.replace(new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').trim();
    }
  }
  
  // 识别区/县/镇
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
  
  // 🔴 优化：详细地址（保留完整信息，不删除公司名，因为可能是地址的一部分）
  // 只移除明显的标签，保留地址内容
  detail = remaining
    .replace(/\s+/g, ' ')
    .trim();

  // 直辖市：首个「XX市」为省级，不作为地级「市」
  if (city && MUNICIPALITY_PROVINCES.includes(city)) {
    province = city;
    city = '';
  }

  // 组装完整地址
  const parts = [];
  if (province) parts.push(province);
  if (city) parts.push(city);
  if (district) parts.push(district);
  if (detail) parts.push(detail);
  
  const fullAddress = parts.join(' ').trim() || addressText;
  
  return {
    province: province.trim(),
    city: city.trim(),
    district: district.trim(),
    detail: detail.trim(),
    fullAddress: fullAddress.trim()
  };
}

/**
 * 提取电话号码（改进版）
 */
function extractPhone(text) {
  if (!text) return '';
  
  let phone = '';
  
  // 方法1：直接匹配11位连续手机号（最准确）
  const directMatch = text.match(/1[3-9]\d{9}/);
  if (directMatch) {
    phone = directMatch[0];
    console.log('[extractPhone] 方法1找到:', phone);
    return phone;
  }
  
  // 方法2：匹配带分隔符的手机号（138-0013-8000）
  const withSeparator = text.match(/1[3-9]\d[\s\-\.]\d{4}[\s\-\.]\d{4}/);
  if (withSeparator) {
    const cleaned = withSeparator[0].replace(/[\s\-\.]/g, '');
    if (cleaned.length === 11 && /^1[3-9]\d{9}$/.test(cleaned)) {
      phone = cleaned;
      console.log('[extractPhone] 方法2找到:', phone);
      return phone;
    }
  }
  
  // 方法3：匹配带国家码的手机号（+86 13800138000）
  const withCountryCode = text.match(/\+?86[\s\-]?1[3-9]\d{9}/);
  if (withCountryCode) {
    const cleaned = withCountryCode[0].replace(/[\s\-\.\+86]/g, '');
    if (cleaned.length === 11 && /^1[3-9]\d{9}$/.test(cleaned)) {
      phone = cleaned;
      console.log('[extractPhone] 方法3找到:', phone);
      return phone;
    }
  }
  
  // 方法4：固定电话
  const telPatterns = [
    /0\d{2,3}[\s\-]?\d{7,8}/,
    /\(0\d{2,3}\)[\s\-]?\d{7,8}/,
  ];
  
  for (const pattern of telPatterns) {
    const match = text.match(pattern);
    if (match) {
      phone = match[0].replace(/[\s\-\(\)]/g, '');
      console.log('[extractPhone] 方法4找到固定电话:', phone);
      return phone;
    }
  }
  
  console.log('[extractPhone] 未找到电话号码');
  return '';
}

/**
 * 提取姓名
 */
function extractName(text, phone) {
  if (!text) return '';
  
  let name = '';
  const addressKeywords = ['省', '市', '区', '县', '镇', '街道', '路', '街', '道', '号', '室', '楼', '苑', '村', '组', '栋', '单元', '层', '房', '门', '座', '广场', '大厦', '中心', '花园', '小区'];
  
  // 从标签提取
  const labelPatterns = [
    /(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]+([\u4e00-\u9fa5]{2,5})/i,
    /([\u4e00-\u9fa5]{2,5})[:：\s]*(?:收件人|收货人|姓名|联系人)/i,
  ];
  
  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match) {
      const candidateName = match[1];
      const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
      if (!hasAddressKeyword && candidateName.length >= 2 && candidateName.length <= 5) {
        name = candidateName;
        console.log('[extractName] 从标签提取:', name);
        return name;
      }
    }
  }
  
  // 从电话前后提取（改进：优先从电话后提取，因为姓名通常在电话后面）
  if (phone) {
    const phoneIndex = text.indexOf(phone);
    if (phoneIndex !== -1) {
      // 优先：电话后（姓名通常在电话后面）
      const afterPhone = text.substring(phoneIndex + phone.length).trim();
      const nameAfterMatch = afterPhone.match(/^\s*([\u4e00-\u9fa5]{2,4})/);
      if (nameAfterMatch) {
        const candidateName = nameAfterMatch[1];
        const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
        // 排除公司、有限公司等关键词
        const excludeKeywords = ['公司', '有限', '股份', '集团', '企业', '包装', '制品', '制品有', '包装制'];
        const hasExcludeKeyword = excludeKeywords.some(keyword => candidateName.includes(keyword));
        if (!hasAddressKeyword && !hasExcludeKeyword && candidateName.length >= 2 && candidateName.length <= 4) {
          name = candidateName;
          console.log('[extractName] 从电话后提取:', name);
          return name;
        }
      }
      
      // 备用：电话前（但要排除公司名称等）
      const beforePhone = text.substring(0, phoneIndex).trim();
      // 只提取电话前最近的2-4个汉字，且不能包含地址关键词和公司关键词
      const nameBeforeMatch = beforePhone.match(/([\u4e00-\u9fa5]{2,4})\s*$/);
      if (nameBeforeMatch) {
        const candidateName = nameBeforeMatch[1];
        const hasAddressKeyword = addressKeywords.some(keyword => candidateName.includes(keyword));
        const excludeKeywords = ['公司', '有限', '股份', '集团', '企业', '包装', '制品', '制品有', '包装制', '有限公司', '包装制品'];
        const hasExcludeKeyword = excludeKeywords.some(keyword => candidateName.includes(keyword));
        if (!hasAddressKeyword && !hasExcludeKeyword && candidateName.length >= 2 && candidateName.length <= 4) {
          name = candidateName;
          console.log('[extractName] 从电话前提取:', name);
          return name;
        }
      }
    }
  }
  
  console.log('[extractName] 未找到姓名');
  return '';
}

function removePhoneLikeText(text, phone) {
  let out = String(text || '');
  if (!out) return out;
  if (phone) {
    const escaped = phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'g'), ' ');
  }
  out = out
    .replace(/1[3-9]\d[\s\-\.]?\d{4}[\s\-\.]?\d{4}/g, ' ')
    .replace(/\+?86[\s\-]?1[3-9]\d{9}/g, ' ')
    .replace(/0\d{2,3}[\s\-]?\d{7,8}/g, ' ')
    .replace(/\(0\d{2,3}\)[\s\-]?\d{7,8}/g, ' ');
  return out;
}

function sanitizeDetail(detail, ctx = {}) {
  const { name = '', phone = '', province = '', city = '', district = '' } = ctx;
  let out = String(detail || '');
  if (!out) return '';

  // 去掉姓名（中文文本里常与其它字符连写，不能只依赖空格边界）
  if (name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escapedName, 'g'), ' ');
  }

  // 去掉电话相关文本（含各种分隔符格式）
  out = removePhoneLikeText(out, phone);

  // 再次移除省市区前缀，避免重复
  if (province) out = out.replace(new RegExp(province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
  if (city) out = out.replace(new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
  if (district) out = out.replace(new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');

  return out.replace(/\s+/g, ' ').trim();
}

/**
 * 使用腾讯地图API智能解析地址文本
 * @param {String} addressText - 地址文本（可能包含姓名、电话、地址）
 * @returns {Promise} 返回解析结果 {name, phone, address, province, city, district, detail}
 */
function parseSmartAddress(addressText) {
  return new Promise((resolve, reject) => {
    if (!addressText || !addressText.trim()) {
      resolve({ name: '', phone: '', address: '', province: '', city: '', district: '', detail: '' });
      return;
    }

    const originalText = addressText.trim();
    console.log('[parseSmartAddress] ========== 开始解析 ==========');
    console.log('[parseSmartAddress] 原始文本:', originalText);

    // 第一步：提取电话号码
    const phone = extractPhone(originalText);
    
    // 第二步：提取姓名
    const name = extractName(originalText, phone);
    
    // 第三步：提取地址文本（移除姓名和电话）
    let addressTextClean = originalText;
    
    if (name) {
      const namePattern = new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'g');
      addressTextClean = addressTextClean.replace(namePattern, ' ').trim();
    }
    
    if (phone) {
      // 移除电话号码的所有格式
      addressTextClean = addressTextClean.replace(new RegExp(phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
      addressTextClean = addressTextClean.replace(/1[3-9]\d{9}/g, ' ');
      addressTextClean = addressTextClean.replace(/1[3-9]\d[\s\-\.]\d{4}[\s\-\.]\d{4}/g, ' ');
      addressTextClean = addressTextClean.replace(/\+?86[\s\-]?1[3-9]\d{9}/g, ' ');
      addressTextClean = addressTextClean.replace(/0\d{2,3}[\s\-]?\d{7,8}/g, ' ');
      addressTextClean = addressTextClean.replace(/\(0\d{2,3}\)[\s\-]?\d{7,8}/g, ' ');
    }
    
    // 清理标签
    addressTextClean = addressTextClean
      .replace(/(?:收件人|收货人|姓名|联系人|名字|称呼)[:：\s]*/gi, ' ')
      .replace(/(?:联系电话|电话|手机|号码)[:：\s]*/gi, ' ')
      .replace(/(?:地址|详细地址|收件地址|收货地址)[:：\s]*/gi, ' ')
      .replace(/(?:编号|单号|订单号|运单号)[:：\s]*/g, ' ')
      .replace(/[()（）【】\[\]<>《》""''""'']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('[parseSmartAddress] 清理后的地址文本:', addressTextClean);
    console.log('[parseSmartAddress] 提取结果 - 姓名:', name, '电话:', phone);

    // 第四步：优先使用本地解析，减少API调用（节省配额）
    // 🔴 优化：先尝试本地解析，如果已经得到完整的省市区信息，就不调用API了
    let localParse = parseAddressLocally(addressTextClean);
    localParse = normalizeMunicipalityRegion({
      province: localParse.province,
      city: localParse.city,
      district: localParse.district,
      detail: localParse.detail,
      fullAddress: localParse.fullAddress,
      address: localParse.fullAddress
    }, originalText);
    console.log('[parseSmartAddress] 本地解析结果:', localParse);

    // 🔴 优化：如果本地解析已经得到完整的省市区信息，直接返回，不调用API
    // 但需要确保详细地址不为空
    if (localParseQualifiesForSkipApi(localParse)) {
      console.log('[parseSmartAddress] ✅ 本地解析已获得完整信息，跳过API调用（节省配额）');
      
      // 确保详细地址不为空
      let finalDetail = localParse.detail || '';
      if (!finalDetail || finalDetail.trim().length === 0) {
        // 如果详细地址为空，尝试从原始文本中提取
        finalDetail = addressTextClean;
        if (localParse.province) finalDetail = finalDetail.replace(localParse.province, '').trim();
        if (localParse.city) finalDetail = finalDetail.replace(localParse.city, '').trim();
        if (localParse.district) finalDetail = finalDetail.replace(localParse.district, '').trim();
        finalDetail = finalDetail.trim();
      }

      const norm = normalizeMunicipalityRegion({
        province: localParse.province || '',
        city: localParse.city || '',
        district: localParse.district || '',
        detail: finalDetail || '',
        address: localParse.fullAddress || addressTextClean.trim(),
        fullAddress: localParse.fullAddress || addressTextClean.trim()
      }, originalText);

      const finalResult = {
        name: name.trim(),
        phone: phone.trim(),
        address: norm.fullAddress || addressTextClean.trim(),
        province: norm.province || '',
        city: norm.city || '',
        district: norm.district || '',
        detail: sanitizeDetail((norm.detail || finalDetail || addressTextClean.trim()), {
          name,
          phone,
          province: norm.province || '',
          city: norm.city || '',
          district: norm.district || ''
        })
      };

      console.log('[parseSmartAddress] 本地解析直接返回结果:', JSON.stringify(finalResult, null, 2));

      resolve(finalResult);
      return;
    }
    
    // 如果本地解析不完整，再调用API（使用getSuggestion API，专门针对收货地址场景优化）
    if (addressTextClean && addressTextClean.length > 0) {
      // 🔴 如果只有城市没有省份，调用API来获取准确的省份信息
      if (localParse.city && !localParse.province) {
        console.log('[parseSmartAddress] ⚠️ 本地解析只有城市没有省份，调用API获取省份信息');
      }
      
      console.log('[parseSmartAddress] ⚠️ 本地解析不完整，调用腾讯地图getSuggestion API（收货地址优化）');
      
      // 🔴 使用getSuggestion API，设置policy=1专门针对收货地址场景优化
      // 🔴 添加延迟，避免并发限制
      setTimeout(() => {
        qqmapsdk.getSuggestion({
        keyword: addressTextClean,
        policy: 1, // 🔴 关键：policy=1 专门针对收货地址场景优化
        region: '全国',
        region_fix: 0,
        page_size: 5, // 只取前5个结果
        success: (res) => {
          console.log('[parseSmartAddress] getSuggestion API返回:', JSON.stringify(res, null, 2));
          
          let province = '';
          let city = '';
          let district = '';
          let detail = '';
          let address = '';
          
          if (res.status === 0 && res.data && res.data.length > 0) {
            // getSuggestion返回的是数组，取第一个最匹配的结果
            const firstResult = res.data[0];
            
            // 🔴 优化：从ad_info中提取省市区（优先使用API返回的数据）
            if (firstResult.ad_info) {
              province = firstResult.ad_info.province || '';
              city = firstResult.ad_info.city || '';
              district = firstResult.ad_info.district || '';
              console.log('[parseSmartAddress] 从ad_info提取:', { province, city, district });
            }
            
            // 🔴 优化：如果ad_info没有完整信息，尝试从address_component提取
            if ((!province || !city) && firstResult.address_component) {
              console.log('[parseSmartAddress] ad_info不完整，尝试从address_component提取');
              if (!province && firstResult.address_component.province) {
                province = firstResult.address_component.province;
              }
              if (!city && firstResult.address_component.city) {
                city = firstResult.address_component.city;
              }
              if (!district && firstResult.address_component.district) {
                district = firstResult.address_component.district;
              }
            }
            
            // 使用title作为地址
            if (firstResult.title) {
              address = firstResult.title;
            } else if (firstResult.address) {
              address = firstResult.address;
            } else {
              address = addressTextClean;
            }
            
            // 🔴 优化：如果API没有返回完整省市区，使用本地解析作为补充
            if (!province || !city) {
              console.log('[parseSmartAddress] getSuggestion未返回完整省市区，使用本地解析补充');
              if (!province && localParse.province) {
                province = localParse.province;
                console.log('[parseSmartAddress] 使用本地解析的省份:', province);
              }
              if (!city && localParse.city) {
                city = localParse.city;
                console.log('[parseSmartAddress] 使用本地解析的城市:', city);
              }
              if (!district && localParse.district) {
                district = localParse.district;
                console.log('[parseSmartAddress] 使用本地解析的区县:', district);
              }
            }
            
            // 🔴 优化：提取详细地址（优先使用原始文本，确保不丢失详细信息）
            let detailText = '';
            
            // 方法1：优先使用本地解析的详细地址（因为本地解析保留了原始文本的详细信息）
            if (localParse.detail && localParse.detail.trim()) {
              detailText = localParse.detail.trim();
              console.log('[parseSmartAddress] 使用本地解析的详细地址:', detailText);
            } else {
              // 方法2：从API返回的address中提取（移除省市区）
              detailText = address;
              if (province) detailText = detailText.replace(province, '').trim();
              if (city) detailText = detailText.replace(city, '').trim();
              if (district) detailText = detailText.replace(district, '').trim();
              
              // 方法3：如果API返回的地址太短（可能只包含区县），使用原始清理后的文本
              if (!detailText || detailText.length < 5) {
                console.log('[parseSmartAddress] API返回的地址太短，使用原始文本提取详细地址');
                // 从原始清理后的文本中移除省市区，保留详细地址
                detailText = addressTextClean;
                if (province) detailText = detailText.replace(province, '').trim();
                if (city) detailText = detailText.replace(city, '').trim();
                if (district) detailText = detailText.replace(district, '').trim();
              }
            }
            
            // 🔴 优化：最终清理（只移除多余空格，保留完整地址信息，包括公司名）
            detailText = detailText
              .replace(/\s+/g, ' ')
              .trim();
            
            detail = detailText || addressTextClean;
            
            // 🔴 调试：确保detail字段有值
            if (!detail || !detail.trim()) {
              console.log('[parseSmartAddress] ⚠️ detail为空，使用addressTextClean作为备用:', addressTextClean);
              detail = addressTextClean;
            }
            
            console.log('[parseSmartAddress] 最终解析结果:', { 
              name, 
              phone, 
              address, 
              province, 
              city, 
              district, 
              detail: detail || '(空)',
              detailLength: detail ? detail.length : 0
            });
            
            const normGeo = normalizeMunicipalityRegion({
              province: province.trim(),
              city: city.trim(),
              district: district.trim(),
              detail: (detail || '').trim(),
              address: address.trim(),
              fullAddress: address.trim()
            }, originalText);
            const finalResult = {
              name: name.trim(),
              phone: phone.trim(),
              address: normGeo.fullAddress || normGeo.address || address.trim(),
              province: normGeo.province || '',
              city: normGeo.city || '',
              district: normGeo.district || '',
              detail: sanitizeDetail((normGeo.detail || detail || ''), {
                name,
                phone,
                province: normGeo.province || '',
                city: normGeo.city || '',
                district: normGeo.district || ''
              })
            };

            console.log('[parseSmartAddress] 准备返回的结果:', JSON.stringify(finalResult, null, 2));

            resolve(finalResult);
          } else {
            // API返回空结果，使用本地解析
            console.log('[parseSmartAddress] getSuggestion返回空结果，使用本地解析');
            const norm = normalizeMunicipalityRegion({
              province: localParse.province || '',
              city: localParse.city || '',
              district: localParse.district || '',
              detail: localParse.detail || '',
              address: localParse.fullAddress || addressTextClean.trim(),
              fullAddress: localParse.fullAddress || addressTextClean.trim()
            }, originalText);
            resolve({
              name: name.trim(),
              phone: phone.trim(),
              address: norm.fullAddress || addressTextClean.trim(),
              province: norm.province || '',
              city: norm.city || '',
              district: norm.district || '',
              detail: sanitizeDetail((norm.detail || addressTextClean.trim()), {
                name,
                phone,
                province: norm.province || '',
                city: norm.city || '',
                district: norm.district || ''
              })
            });
          }
        },
        fail: (err) => {
          console.error('[parseSmartAddress] getSuggestion API调用失败:', err);
          console.log('[parseSmartAddress] API失败，使用本地解析作为备用方案');
          const norm = normalizeMunicipalityRegion({
            province: localParse.province || '',
            city: localParse.city || '',
            district: localParse.district || '',
            detail: localParse.detail || '',
            address: localParse.fullAddress || addressTextClean.trim(),
            fullAddress: localParse.fullAddress || addressTextClean.trim()
          }, originalText);
          resolve({
            name: name.trim(),
            phone: phone.trim(),
            address: norm.fullAddress || addressTextClean.trim(),
            province: norm.province || '',
            city: norm.city || '',
            district: norm.district || '',
            detail: sanitizeDetail((norm.detail || addressTextClean.trim()), {
              name,
              phone,
              province: norm.province || '',
              city: norm.city || '',
              district: norm.district || ''
            })
          });
        }
        });
      }, 300); // 🔴 延迟300ms，避免并发限制
    } else {
      // 没有地址文本，只返回姓名和电话
      console.log('[parseSmartAddress] 没有地址文本');
      resolve({
        name: name.trim(),
        phone: phone.trim(),
        address: '',
        province: '',
        city: '',
        district: '',
        detail: sanitizeDetail('', { name, phone })
      });
    }
  });
}

module.exports = {
  parseSmartAddress,
  MUNICIPALITY_PROVINCES,
  MUNICIPALITY_DISTRICTS,
  inferProvinceFromCity,
  normalizeMunicipalityRegion
};
