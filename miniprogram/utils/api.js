const MOCK_ZHEJIANG_REGIONS = [
  '杭州市',
  '宁波市',
  '温州市',
  '嘉兴市',
  '湖州市',
  '绍兴市',
  '金华市',
  '衢州市',
  '舟山市',
  '台州市',
  '丽水市'
  // 注意：不包含广东省城市，所以广东用户可以正常访问
];



const inferCity = (location = {}) => {
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  
  console.log('推断城市 - 经纬度:', { lat, lng });
  
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.log('经纬度无效，返回默认城市');
    return '深圳市'; // 改为深圳，确保可以进入
  }
  
  // 广东省主要城市经纬度范围
  if (lat >= 20.0 && lat <= 25.5 && lng >= 109.5 && lng <= 117.5) {
    console.log('在广东省范围内');
    // 根据具体经纬度判断城市
    if (lat >= 22.4 && lat <= 22.8 && lng >= 113.8 && lng <= 114.5) {
      return '深圳市';
    } else if (lat >= 23.0 && lat <= 23.3 && lng >= 113.2 && lng <= 113.6) {
      return '广州市';
    } else if (lat >= 22.2 && lat <= 22.5 && lng >= 110.1 && lng <= 110.5) {
      return '珠海市';
    } else if (lat >= 22.8 && lat <= 23.2 && lng >= 113.0 && lng <= 113.4) {
      return '佛山市';
    } else if (lat >= 22.5 && lat <= 23.0 && lng >= 113.3 && lng <= 113.8) {
      return '东莞市';
    } else if (lat >= 21.7 && lat <= 22.0 && lng >= 110.1 && lng <= 110.4) {
      return '湛江市';
    } else if (lat >= 23.3 && lat <= 23.7 && lng >= 114.3 && lng <= 114.9) {
      return '惠州市';
    } else if (lat >= 22.7 && lat <= 23.1 && lng >= 115.3 && lng <= 115.8) {
      return '汕尾市';
    } else if (lat >= 23.1 && lat <= 23.5 && lng >= 116.1 && lng <= 116.7) {
      return '河源市';
    } else if (lat >= 24.2 && lat <= 24.8 && lng >= 114.9 && lng <= 115.5) {
      return '韶关市';
    } else if (lat >= 22.1 && lat <= 22.6 && lng >= 112.4 && lng <= 113.0) {
      return '肇庆市';
    } else if (lat >= 21.8 && lat <= 22.4 && lng >= 110.8 && lng <= 111.4) {
      return '茂名市';
    } else if (lat >= 21.4 && lat <= 21.9 && lng >= 110.9 && lng <= 111.5) {
      return '阳江市';
    } else if (lat >= 22.9 && lat <= 23.4 && lng >= 116.2 && lng <= 116.8) {
      return '梅州市';
    } else if (lat >= 23.1 && lat <= 23.6 && lng >= 116.6 && lng <= 117.2) {
      return '潮州市';
    } else if (lat >= 23.2 && lat <= 23.7 && lng >= 116.4 && lng <= 117.0) {
      return '揭阳市';
    } else if (lat >= 22.0 && lat <= 22.5 && lng >= 112.8 && lng <= 113.4) {
      return '云浮市';
    } else if (lat >= 22.1 && lat <= 22.6 && lng >= 113.2 && lng <= 113.8) {
      return '中山市';
    } else if (lat >= 22.5 && lat <= 23.0 && lng >= 113.5 && lng <= 114.1) {
      return '江门市';
    }
    return '深圳市'; // 默认广东城市
  }
  
  // 浙江省经纬度范围（稍微扩大范围）
  if (lat >= 26.5 && lat <= 32.0 && lng >= 117.5 && lng <= 124.0) {
    console.log('在浙江省范围内');
    // 根据具体经纬度判断城市
    if (lat >= 29.8 && lat <= 30.8 && lng >= 119.8 && lng <= 120.8) {
      return '杭州市';
    } else if (lat >= 29.5 && lat <= 30.2 && lng >= 120.8 && lng <= 122.2) {
      return '宁波市';
    } else if (lat >= 27.5 && lat <= 28.8 && lng >= 120.3 && lng <= 121.5) {
      return '温州市';
    } else if (lat >= 30.5 && lat <= 31.3 && lng >= 120.5 && lng <= 121.5) {
      return '嘉兴市';
    } else if (lat >= 30.5 && lat <= 31.3 && lng >= 119.5 && lng <= 120.8) {
      return '湖州市';
    } else if (lat >= 29.7 && lat <= 30.5 && lng >= 120.0 && lng <= 121.2) {
      return '绍兴市';
    } else if (lat >= 28.7 && lat <= 29.8 && lng >= 119.2 && lng <= 121.0) {
      return '金华市';
    } else if (lat >= 28.5 && lat <= 29.5 && lng >= 118.2 && lng <= 119.5) {
      return '衢州市';
    } else if (lat >= 29.8 && lat <= 30.5 && lng >= 121.8 && lng <= 123.0) {
      return '舟山市';
    } else if (lat >= 28.2 && lat <= 29.5 && lng >= 120.8 && lng <= 122.2) {
      return '台州市';
    } else if (lat >= 28.0 && lat <= 29.2 && lng >= 118.5 && lng <= 120.5) {
      return '丽水市';
    }
    return '杭州市'; // 默认浙江城市
  }
  
  console.log('不在浙江或广东范围内，返回深圳');
  return '深圳市'; // 默认其他地区改为深圳
};

const delay = (time = 500) =>
  new Promise((resolve) => {
    setTimeout(resolve, time);
  });

const generateProducts = () => [
  {
    id: 'p1',
    title: '指挥终端 v3.2',
    subtitle: '更快的调度响应能力',
    tags: ['新品', '指挥系统'],
    cover: 'https://dummyimage.com/750x360/0f59ff/ffffff&text=v3.2',
    description: '聚焦重点区域调度的终端界面升级，支持实时态势同步。',
    cta: '预约体验'
  },
  {
    id: 'p2',
    title: '位置采集组件',
    subtitle: '高频定位+合规采集',
    tags: ['SDK', '数据'],
    cover: 'https://dummyimage.com/750x360/13294b/ffffff&text=SDK',
    description: '内置隐私合规提示，适配最新腾讯位置服务能力。',
    cta: '查看文档'
  }
];

module.exports = {
  async submitLocation(payload) {
    await delay();
    const { location = {}, userInfo = {} } = payload;
    const city = inferCity(location);
    const isZhejiang = MOCK_ZHEJIANG_REGIONS.includes(city);

    return {
      isZhejiang,
      city,
      province: isZhejiang ? '浙江省' : '其他地区',
      accuracy: location.accuracy || 30,
      lat: location.latitude,
      lng: location.longitude,
      userInfo,
      judgementAt: Date.now(),
      mapUrl: `https://apis.map.qq.com/tools/poimarker?type=0&marker=coord:${location.latitude},${location.longitude};title:${userInfo.nickName ||
        '用户'};addr:${city}&referer=zhejiang-monitor`
    };
  },

  async fetchProducts() {
    await delay();
    return generateProducts();
  }
};







