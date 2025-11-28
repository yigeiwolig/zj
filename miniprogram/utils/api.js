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
];

const inferCity = (location = {}) => {
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return '上海市';
  }
  if (lat >= 27.5 && lat <= 31.5 && lng >= 118 && lng <= 123.5) {
    return '杭州市';
  }
  return '上海市';
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

