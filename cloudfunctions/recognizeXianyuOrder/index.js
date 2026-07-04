const cloud = require('wx-server-sdk');
const https = require('https');
const querystring = require('querystring');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

let tokenCache = { value: '', expireAt: 0 };

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data || '{}') });
        } catch (e) {
          reject(new Error('解析接口返回失败'));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getBaiduAccessToken(apiKey, secretKey) {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expireAt > now + 60000) {
    return tokenCache.value;
  }
  const qs = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: apiKey,
    client_secret: secretKey
  });
  const res = await httpsRequest({
    hostname: 'aip.baidubce.com',
    path: `/oauth/2.0/token?${qs}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!res.data || !res.data.access_token) {
    throw new Error((res.data && res.data.error_description) || '获取百度 OCR Token 失败');
  }
  const expiresIn = Number(res.data.expires_in || 2592000);
  tokenCache = {
    value: res.data.access_token,
    expireAt: now + expiresIn * 1000
  };
  return tokenCache.value;
}

async function baiduGeneralOcr(imageBase64, accessToken) {
  const body = querystring.stringify({
    image: imageBase64,
    detect_direction: 'true',
    paragraph: 'false',
    probability: 'false'
  });
  const res = await httpsRequest({
    hostname: 'aip.baidubce.com',
    path: `/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (res.statusCode !== 200 || !res.data || res.data.error_code) {
    const msg = (res.data && (res.data.error_msg || res.data.error_description)) || `OCR HTTP ${res.statusCode}`;
    throw new Error(msg);
  }
  return res.data;
}

function normalizeNick(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function isOfficialSeller(seller, officialList) {
  const normalizedSeller = normalizeNick(seller);
  if (!normalizedSeller) return false;
  return (officialList || []).some((item) => {
    const official = normalizeNick(item);
    if (!official) return false;
    return normalizedSeller === official
      || normalizedSeller.includes(official)
      || official.includes(normalizedSeller);
  });
}

function extractFieldAfterLabel(lines, labelRegex, valueTest) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] || '').trim();
    if (!labelRegex.test(line)) continue;

    const inline = line.replace(labelRegex, '').replace(/^[：:\s]+/, '').trim();
    if (inline && (!valueTest || valueTest(inline))) {
      return inline;
    }

    for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
      const next = String(lines[j] || '').trim();
      if (!next) continue;
      if (/卖家昵称|下单时间|订单编号|实付款|交易状态/.test(next)) break;
      if (!valueTest || valueTest(next)) return next;
    }
  }
  return '';
}

function parseXianyuOrder(ocrResult) {
  const lines = (ocrResult && ocrResult.words_result
    ? ocrResult.words_result.map((row) => row.words || '')
    : []
  ).filter(Boolean);

  const sellerNickname = extractFieldAfterLabel(
    lines,
    /卖家昵称/,
    (value) => value.length >= 2 && !/下单时间|订单编号/.test(value)
  );

  const orderTime = extractFieldAfterLabel(
    lines,
    /下单时间/,
    (value) => /\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(value)
  );

  const normalizedOrderTime = orderTime
    ? orderTime
      .replace(/年|月/g, '-')
      .replace(/日/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    : '';

  return {
    sellerNickname,
    orderTime: normalizedOrderTime,
    lines
  };
}

async function loadOfficialSellerNicknames() {
  try {
    const cfg = await db.collection('app_config').doc('xianyu_order_verify').get();
    const data = cfg && cfg.data ? cfg.data : {};
    const list = Array.isArray(data.sellerNicknames) ? data.sellerNicknames : [];
    return list.map((item) => String(item || '').trim()).filter(Boolean);
  } catch (e) {
    console.warn('[recognizeXianyuOrder] 读取 app_config/xianyu_order_verify 失败:', e.message);
    return [];
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const imageBase64 = event && event.imageBase64 ? String(event.imageBase64) : '';

  if (!openid) {
    return { success: false, error: 'NO_OPENID', message: '用户身份无效' };
  }
  if (!imageBase64) {
    return { success: false, error: 'NO_IMAGE', message: '请上传订单截图' };
  }
  if (imageBase64.length > 4 * 1024 * 1024) {
    return { success: false, error: 'IMAGE_TOO_LARGE', message: '图片过大，请换一张更清晰的截图' };
  }

  const apiKey = process.env.BAIDU_OCR_API_KEY;
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY;
  if (!apiKey || !secretKey) {
    return { success: false, error: 'OCR_NOT_CONFIGURED', message: 'OCR 服务未配置，请联系管理员' };
  }

  try {
    const officialSellers = await loadOfficialSellerNicknames();
    if (!officialSellers.length) {
      return {
        success: false,
        error: 'SELLER_LIST_EMPTY',
        message: '官方店铺昵称未配置，请联系管理员'
      };
    }

    const accessToken = await getBaiduAccessToken(apiKey, secretKey);
    const ocrResult = await baiduGeneralOcr(imageBase64, accessToken);
    const parsed = parseXianyuOrder(ocrResult);

    if (!parsed.sellerNickname) {
      return {
        success: false,
        error: 'SELLER_NOT_FOUND',
        message: '未识别到卖家昵称，请上传完整的闲鱼订单详情截图',
        parsed
      };
    }

    const sellerMatched = isOfficialSeller(parsed.sellerNickname, officialSellers);
    if (!sellerMatched) {
      return {
        success: false,
        error: 'SELLER_MISMATCH',
        message: '卖家昵称不匹配，请确认是在本店下的单',
        parsed,
        sellerMatched: false
      };
    }

    const verifyData = {
      _openid: openid,
      sellerNickname: parsed.sellerNickname,
      orderTime: parsed.orderTime || '',
      verified: true,
      source: 'xianyu_ocr',
      updateTime: db.serverDate()
    };

    const existing = await db.collection('xianyu_azjc_verified')
      .where({ _openid: openid })
      .limit(1)
      .get();

    if (existing.data && existing.data.length > 0) {
      await db.collection('xianyu_azjc_verified').doc(existing.data[0]._id).update({ data: verifyData });
    } else {
      await db.collection('xianyu_azjc_verified').add({
        data: {
          ...verifyData,
          createTime: db.serverDate()
        }
      });
    }

    return {
      success: true,
      sellerMatched: true,
      sellerNickname: parsed.sellerNickname,
      orderTime: parsed.orderTime || '',
      message: '验证通过，已解锁安装教程'
    };
  } catch (err) {
    console.error('[recognizeXianyuOrder] 失败:', err);
    return {
      success: false,
      error: 'OCR_FAILED',
      message: (err && err.message) || '识别失败，请稍后重试'
    };
  }
};
