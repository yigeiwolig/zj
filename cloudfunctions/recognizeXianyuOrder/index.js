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
  // 去掉空格、横杠等，避免「MT摩改社」与「MT-摩改社」对不上
  return String(value || '').replace(/[\s\-_/·•．.]/g, '').toLowerCase();
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

const XIANYU_FIELD_LABEL = /卖家昵称|下单时间|拍下时间|付款时间|发货时间|成交时间|订单编号|支付宝交易号|交易快照|收货地址|实付款|成交价|交易状态/;

function isPlausibleSellerNick(value) {
  const v = String(value || '').trim();
  if (v.length < 2 || v.length > 24) return false;
  if (XIANYU_FIELD_LABEL.test(v)) return false;
  if (/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(v)) return false;
  if (/^¥?\d+(\.\d+)?$/.test(v)) return false;
  if (/复制|沟通顺畅|特别好|去评价|再次购买|联系卖家|更多/.test(v)) return false;
  return true;
}

function extractFieldAfterLabel(lines, labelRegex, valueTest) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] || '').trim();
    if (!labelRegex.test(line)) continue;

    const inline = line.replace(labelRegex, '').replace(/^[：:\s]+/, '').trim();
    if (inline && (!valueTest || valueTest(inline))) {
      return inline;
    }

    // 闲鱼详情常是左右两栏：OCR 可能先读完左列标签再读右列值，
    // 因此遇到其它字段标签时跳过继续找，不要直接 break。
    for (let j = i + 1; j < Math.min(lines.length, i + 12); j += 1) {
      const next = String(lines[j] || '').trim();
      if (!next) continue;
      if (XIANYU_FIELD_LABEL.test(next) && !labelRegex.test(next)) continue;
      if (!valueTest || valueTest(next)) return next;
    }
  }
  return '';
}

/** 整图兜底：OCR 行里直接撞上白名单店铺名（应对两栏乱序） */
function findOfficialSellerInLines(lines, officialList) {
  const list = officialList || [];
  if (!list.length) return '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] || '').trim();
    if (!line || !isPlausibleSellerNick(line)) continue;
    if (isOfficialSeller(line, list)) return line;
    for (let k = 0; k < list.length; k += 1) {
      const official = String(list[k] || '').trim();
      if (!official) continue;
      if (normalizeNick(line).includes(normalizeNick(official))) return official;
    }
  }
  const joined = lines.join(' ');
  for (let k = 0; k < list.length; k += 1) {
    const official = String(list[k] || '').trim();
    if (!official) continue;
    if (normalizeNick(joined).includes(normalizeNick(official))) return official;
  }
  return '';
}

function parseXianyuOrder(ocrResult, officialList) {
  const lines = (ocrResult && ocrResult.words_result
    ? ocrResult.words_result.map((row) => row.words || '')
    : []
  ).filter(Boolean);

  let sellerNickname = extractFieldAfterLabel(
    lines,
    /卖家昵称/,
    isPlausibleSellerNick
  );

  // 两栏乱序时「卖家昵称」后面可能先读到「下单时间」；再整图找白名单
  if (!sellerNickname || !isOfficialSeller(sellerNickname, officialList)) {
    const hit = findOfficialSellerInLines(lines, officialList);
    if (hit) sellerNickname = hit;
  }

  const orderTime = extractFieldAfterLabel(
    lines,
    /下单时间|拍下时间/,
    (value) => /\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(value)
  );

  const normalizedOrderTime = orderTime
    ? orderTime
      .replace(/年|月/g, '-')
      .replace(/日/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    : '';

  const orderStatus = detectOrderStatus(lines);
  const unpaid = isUnpaidXianyuOrder(lines, orderStatus);

  return {
    sellerNickname,
    orderTime: normalizedOrderTime,
    orderStatus,
    unpaid,
    lines
  };
}

/** 从截图文字判断是否为「拍下待付款」等未付款订单 */
function isUnpaidXianyuOrder(lines, orderStatus) {
  const text = lines.join('');
  const head = lines.slice(0, 10).join('');

  if (/拍下待付款|等待买家付款|等待付款|订单待付款/.test(text)) return true;
  if (/待付款|未付款|待支付/.test(head) && !/已付款|付款时间|交易成功/.test(text)) return true;

  const status = String(orderStatus || '');
  if (/待付款|未付款|待支付|拍下待付款/.test(status)) return true;

  return false;
}

function detectOrderStatus(lines) {
  for (let i = 0; i < Math.min(lines.length, 10); i += 1) {
    const line = String(lines[i] || '').trim();
    if (/交易成功|买家已付款|卖家已发货|等待买家收货|待发货|已发货|拍下待付款|待付款|交易关闭/.test(line)) {
      return line;
    }
  }
  const text = lines.join('');
  if (/交易成功/.test(text)) return '交易成功';
  if (/卖家已发货|等待买家收货/.test(text)) return '卖家已发货';
  if (/买家已付款|待发货/.test(text)) return '买家已付款';
  if (/拍下待付款|待付款/.test(text)) return '待付款';
  return '';
}

async function loadOfficialSellerNicknames() {
  const normalizeList = (data) => {
    const list = data && Array.isArray(data.sellerNicknames) ? data.sellerNicknames : [];
    return list.map((item) => String(item || '').trim()).filter(Boolean);
  };

  try {
    const cfg = await db.collection('app_config').doc('xianyu_order_verify').get();
    const list = normalizeList(cfg && cfg.data);
    if (list.length) return list;
  } catch (e) {
    console.warn('[recognizeXianyuOrder] 读取 app_config/xianyu_order_verify 失败:', e.message);
  }

  // 兼容：控制台无法改 _id 时，读取任意含 sellerNicknames 的 app_config 文档
  try {
    const _ = db.command;
    const res = await db.collection('app_config')
      .where({ sellerNicknames: _.exists(true) })
      .limit(20)
      .get();
    const rows = (res && res.data) || [];
    for (let i = 0; i < rows.length; i += 1) {
      const list = normalizeList(rows[i]);
      if (list.length) {
        console.log('[recognizeXianyuOrder] 使用备用 app_config 文档:', rows[i]._id);
        return list;
      }
    }
  } catch (e) {
    console.warn('[recognizeXianyuOrder] 备用读取 sellerNicknames 失败:', e.message);
  }

  return [];
}

function httpsGetBuffer(url, redirectLeft = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const code = res.statusCode || 0;
      if (code >= 300 && code < 400 && res.headers.location && redirectLeft > 0) {
        res.resume();
        httpsGetBuffer(res.headers.location, redirectLeft - 1).then(resolve).catch(reject);
        return;
      }
      if (code !== 200) {
        res.resume();
        reject(new Error(`下载截图失败 HTTP ${code}`));
        return;
      }
      const chunks = [];
      let total = 0;
      res.on('data', (chunk) => {
        total += chunk.length;
        if (total > 4 * 1024 * 1024) {
          req.destroy();
          reject(Object.assign(new Error('图片过大，请换一张更清晰的截图'), { code: 'IMAGE_TOO_LARGE' }));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

function bufferToBase64Result(buf, extra = {}) {
  if (!buf || !buf.length) {
    throw Object.assign(new Error('下载订单截图失败'), { code: 'DOWNLOAD_FAIL' });
  }
  if (buf.length > 4 * 1024 * 1024) {
    throw Object.assign(new Error('图片过大，请换一张更清晰的截图'), { code: 'IMAGE_TOO_LARGE' });
  }
  return {
    imageBase64: Buffer.from(buf).toString('base64'),
    fileID: extra.fileID || '',
    cleanup: !!extra.cleanup
  };
}

async function resolveImageFromFileID(fileID) {
  // 1) downloadFile → fileContent
  try {
    const dl = await cloud.downloadFile({ fileID });
    if (dl && dl.fileContent && dl.fileContent.length) {
      return bufferToBase64Result(dl.fileContent, { fileID, cleanup: true });
    }
    // 2) 部分运行环境只给 tempFilePath
    if (dl && dl.tempFilePath) {
      const fs = require('fs');
      const buf = fs.readFileSync(dl.tempFilePath);
      return bufferToBase64Result(buf, { fileID, cleanup: true });
    }
  } catch (e) {
    console.warn('[recognizeXianyuOrder] downloadFile 失败，改试临时链接:', e && (e.message || e.errMsg || e));
  }

  // 3) getTempFileURL + HTTPS
  const urlRes = await cloud.getTempFileURL({ fileList: [fileID] });
  const row = urlRes && urlRes.fileList && urlRes.fileList[0];
  const tempUrl = row && row.tempFileURL;
  if (!tempUrl) {
    const detail = (row && (row.errMsg || row.code)) || '无临时链接';
    throw Object.assign(new Error(`下载订单截图失败（${detail}）`), { code: 'DOWNLOAD_FAIL' });
  }
  const buf = await httpsGetBuffer(tempUrl);
  return bufferToBase64Result(buf, { fileID, cleanup: true });
}

async function resolveImageBase64(event) {
  const imageUrl = event && event.imageUrl ? String(event.imageUrl).trim() : '';
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
    const buf = await httpsGetBuffer(imageUrl);
    return bufferToBase64Result(buf, { cleanup: false });
  }

  const fileID = event && event.fileID ? String(event.fileID).trim() : '';
  if (fileID) {
    return resolveImageFromFileID(fileID);
  }

  const imageBase64 = event && event.imageBase64 ? String(event.imageBase64) : '';
  if (!imageBase64) {
    throw Object.assign(new Error('请上传订单截图'), { code: 'NO_IMAGE' });
  }
  if (imageBase64.length > 4 * 1024 * 1024) {
    throw Object.assign(new Error('图片过大，请换一张更清晰的截图'), { code: 'IMAGE_TOO_LARGE' });
  }
  return { imageBase64, fileID: '', cleanup: false };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, error: 'NO_OPENID', message: '用户身份无效' };
  }

  const apiKey = process.env.BAIDU_OCR_API_KEY;
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY;
  if (!apiKey || !secretKey) {
    return { success: false, error: 'OCR_NOT_CONFIGURED', message: 'OCR 服务未配置，请联系管理员' };
  }

  let resolved = null;
  try {
    resolved = await resolveImageBase64(event || {});
  } catch (err) {
    const code = (err && err.code) || (/download|临时链接|HTTP/i.test(String((err && err.message) || ''))
      ? 'DOWNLOAD_FAIL'
      : 'NO_IMAGE');
    const raw = String((err && (err.message || err.errMsg)) || '');
    const message = /downloadFile/i.test(raw)
      ? '截图处理失败，请换一张清晰截图重试'
      : (raw || '请上传订单截图');
    return {
      success: false,
      error: code,
      message
    };
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
    const ocrResult = await baiduGeneralOcr(resolved.imageBase64, accessToken);
    const parsed = parseXianyuOrder(ocrResult, officialSellers);

    if (parsed.unpaid) {
      return {
        success: false,
        error: 'ORDER_UNPAID',
        message: '订单尚未付款，请上传已付款订单截图（待付款无效）',
        parsed
      };
    }

    if (!parsed.sellerNickname) {
      return {
        success: false,
        error: 'SELLER_NOT_FOUND',
        message: '未识别到卖家昵称\n请上传闲鱼订单详情（交易成功/已发货均可），截图中需能看到「卖家昵称」',
        parsed
      };
    }

    const sellerMatched = isOfficialSeller(parsed.sellerNickname, officialSellers);
    if (!sellerMatched) {
      return {
        success: false,
        error: 'SELLER_MISMATCH',
        message: '非本公司订单，请重新上传',
        parsed,
        sellerMatched: false
      };
    }

    const verifyData = {
      _openid: openid,
      sellerNickname: parsed.sellerNickname,
      orderTime: parsed.orderTime || '',
      orderStatus: parsed.orderStatus || '',
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
  } finally {
    if (resolved && resolved.cleanup && resolved.fileID) {
      try {
        await cloud.deleteFile({ fileList: [resolved.fileID] });
      } catch (e) {
        console.warn('[recognizeXianyuOrder] 清理临时截图失败:', e && e.message);
      }
    }
  }
};
