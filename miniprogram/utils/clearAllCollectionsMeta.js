/**
 * 与 cloudfunctions/clearAllCollections 保持同步（测试清空范围说明）
 * 保留：app_config、guanliyuan
 */

const PRESERVED_COLLECTIONS = ['app_config', 'guanliyuan'];

const CLEAR_COLLECTION_GROUPS = [
  {
    title: '商城与订单',
    items: ['shop_orders', 'shop_series', 'shop_accessories', 'shop_config', 'products', 'logistics_cache']
  },
  {
    title: '邀请与优惠券',
    items: ['user_coupons', 'referral_codes', 'referral_bindings', 'referral_rewards']
  },
  {
    title: '售后与维修',
    items: ['shouhou', 'shouhou_repair', 'shouhou_read', 'shouhouvideo', 'shouhouguoqi']
  },
  {
    title: '设备与延保',
    items: ['sn', 'guanliyuanSN', 'pending_warranty', 'my_read', 'ota_connections']
  },
  {
    title: '案例与视频',
    items: ['video', 'video_go', 'config']
  },
  {
    title: '内容与教程',
    items: ['home', 'azjc', 'chakan', 'faq_items']
  },
  {
    title: '用户与登录',
    items: ['user_list', 'valid_users', 'login_logs', 'login_logbutton', 'blocked_logs', 'rate_limit_logs']
  },
  {
    title: '风控与统计',
    items: [
      'fenxishuju',
      'suspicious_user_sessions',
      'screenshot_risk_queue',
      'suspicious_review_archive',
      'moto_records_cloud'
    ]
  },
  {
    title: '其它',
    items: ['system_config']
  }
];

/** 测试清空时一并清除的本地缓存键 */
const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  'my_cart',
  'referral_invite_bound',
  'pending_referral_invite_code'
];

function withDisplayText(groups) {
  return (groups || []).map((g) => ({
    title: g.title,
    items: g.items,
    itemsText: (g.items || []).join('、')
  }));
}

function flattenClearCollections() {
  const seen = new Set();
  const out = [];
  CLEAR_COLLECTION_GROUPS.forEach((g) => {
    (g.items || []).forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      out.push(name);
    });
  });
  return out;
}

/** 与云函数 collectionsToClear 顺序无关，仅用于展示 */
const ALL_CLEAR_COLLECTIONS = flattenClearCollections();
const CLEAR_COLLECTION_GROUPS_DISPLAY = withDisplayText(CLEAR_COLLECTION_GROUPS);
const LOCAL_STORAGE_KEYS_TEXT = LOCAL_STORAGE_KEYS_TO_CLEAR.join('、');

module.exports = {
  PRESERVED_COLLECTIONS,
  CLEAR_COLLECTION_GROUPS,
  CLEAR_COLLECTION_GROUPS_DISPLAY,
  ALL_CLEAR_COLLECTIONS,
  LOCAL_STORAGE_KEYS_TO_CLEAR,
  LOCAL_STORAGE_KEYS_TEXT
};
