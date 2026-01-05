// 带重试机制的逆地理编码工具函数
const QQMapWX = require('./qqmap-wx-jssdk.js');

const qqmapsdk = new QQMapWX({
  key: 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z'
});

// 腾讯地图 API Key
const TENCENT_MAP_KEY = 'WYWBZ-ZFY3G-WLKQV-QOD5M-2S6EJ-CSF7Z';
const TENCENT_MAP_API_URL = 'https://apis.map.qq.com/ws/geocoder/v1/';

/**
 * 带重试机制的逆地理编码
 * @param {Number} latitude - 纬度
 * @param {Number} longitude - 经度
 * @param {Object} options - 配置选项
 * @param {Number} options.maxRetries - 最大重试次数，默认3次
 * @param {Number} options.timeout - 超时时间（毫秒），默认10000ms
 * @param {Number} options.retryDelay - 重试延迟（毫秒），默认1000ms，每次重试递增
 * @returns {Promise} 返回包含地址信息的Promise
 */
function reverseGeocodeWithRetry(latitude, longitude, options = {}) {
  const {
    maxRetries = 3,
    timeout = 10000,
    retryDelay = 1000
  } = options;

  return new Promise((resolve, reject) => {
    let retryCount = 0;
    let timeoutTimer = null;

    // 🔴 备用方案：直接使用 wx.request 调用腾讯地图 API
    const callDirectAPI = () => {
      return new Promise((resolveAPI, rejectAPI) => {
        const url = `${TENCENT_MAP_API_URL}?location=${latitude},${longitude}&get_poi=1&poi_options=policy=2&key=${TENCENT_MAP_KEY}&output=json`;
        console.log('[reverseGeocode] 直接调用 API:', url);
        
        wx.request({
          url: url,
          method: 'GET',
          success: (res) => {
            console.log('[reverseGeocode] 直接 API 调用成功:', res);
            if (res.statusCode === 200 && res.data && res.data.status === 0) {
              resolveAPI(res.data);
            } else {
              rejectAPI({
                status: res.data?.status || res.statusCode,
                message: res.data?.message || 'API 返回错误'
              });
            }
          },
          fail: (err) => {
            console.error('[reverseGeocode] 直接 API 调用失败:', err);
            rejectAPI(err);
          }
        });
      });
    };

    const attemptReverseGeocode = () => {
      console.log(`[reverseGeocode] 尝试逆地理编码 (${retryCount + 1}/${maxRetries + 1})，位置:`, latitude, longitude);

      // 设置超时
      timeoutTimer = setTimeout(() => {
        console.error(`[reverseGeocode] 逆地理编码超时 (${timeout}ms)`);
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = retryDelay * retryCount; // 递增延迟
          console.log(`[reverseGeocode] ${delay}ms 后进行第 ${retryCount + 1} 次重试...`);
          setTimeout(attemptReverseGeocode, delay);
        } else {
          console.error('[reverseGeocode] 已达到最大重试次数，尝试直接 API 调用...');
          // 最后一次尝试：直接调用 API
          callDirectAPI().then((apiData) => {
            const result = apiData.result;
            let detailedAddress = result.address;
            if (result.formatted_addresses && result.formatted_addresses.recommend) {
              detailedAddress = `${result.address} (${result.formatted_addresses.recommend})`;
            }
            const addressData = {
              latitude,
              longitude,
              province: result.address_component?.province || '',
              city: result.address_component?.city || '',
              district: result.address_component?.district || '',
              address: detailedAddress || result.address || '',
              full_address: detailedAddress || result.address || ''
            };
            wx.setStorageSync('last_location', addressData);
            resolve(addressData);
          }).catch(() => {
            resolve({
              latitude,
              longitude,
              province: '',
              city: '',
              district: '',
              address: '位置解析失败（超时）',
              full_address: '位置解析失败（超时）'
            });
          });
        }
      }, timeout);

      qqmapsdk.reverseGeocoder({
        location: { latitude, longitude },
        get_poi: 1,
        poi_options: 'policy=2',
        success: (mapRes) => {
          clearTimeout(timeoutTimer);
          console.log(`[reverseGeocode] ✅ 逆地理编码成功 (尝试 ${retryCount + 1} 次)`);
          console.log('[reverseGeocode] 完整响应数据:', JSON.stringify(mapRes, null, 2));
          
          // 🔴 检查响应数据结构
          if (!mapRes || !mapRes.result) {
            console.error('[reverseGeocode] ⚠️ API 响应数据格式错误，缺少 result 字段');
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = retryDelay * retryCount;
              console.log(`[reverseGeocode] 数据格式错误，${delay}ms 后进行第 ${retryCount + 1} 次重试...`);
              setTimeout(attemptReverseGeocode, delay);
              return;
            } else {
              console.error('[reverseGeocode] 数据格式错误且已达到最大重试次数');
              resolve({
                latitude,
                longitude,
                province: '',
                city: '',
                district: '',
                address: '位置解析失败（数据格式错误）',
                full_address: '位置解析失败（数据格式错误）'
              });
              return;
            }
          }
          
          const result = mapRes.result;
          
          // 🔴 检查 API 返回的错误码
          if (result.status !== undefined && result.status !== 0) {
            console.error(`[reverseGeocode] ⚠️ API 返回错误码: ${result.status}, 消息: ${result.message || '未知错误'}`);
            // 如果返回错误码，尝试重试
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = retryDelay * retryCount;
              console.log(`[reverseGeocode] API 错误，${delay}ms 后进行第 ${retryCount + 1} 次重试...`);
              setTimeout(attemptReverseGeocode, delay);
              return;
            } else {
              console.error('[reverseGeocode] API 错误且已达到最大重试次数');
              resolve({
                latitude,
                longitude,
                province: '',
                city: '',
                district: '',
                address: `位置解析失败（API错误: ${result.status || '未知'}）`,
                full_address: `位置解析失败（API错误: ${result.status || '未知'}）`
              });
              return;
            }
          }
          
          let detailedAddress = result.address;
          if (result.formatted_addresses && result.formatted_addresses.recommend) {
            detailedAddress = `${result.address} (${result.formatted_addresses.recommend})`;
          }

          const addressData = {
            latitude,
            longitude,
            province: result.address_component?.province || '',
            city: result.address_component?.city || '',
            district: result.address_component?.district || '',
            address: detailedAddress || result.address || '',
            full_address: detailedAddress || result.address || ''
          };

          console.log('[reverseGeocode] 解析后的地址数据:', addressData);
          console.log('[reverseGeocode] 地址组件详情:', result.address_component);

          // 验证关键字段
          if (!addressData.city || addressData.city.trim() === '') {
            console.warn('[reverseGeocode] ⚠️ 逆地理编码成功但 city 为空');
            console.warn('[reverseGeocode] 完整地址组件信息:', JSON.stringify(result.address_component, null, 2));
            
            // 如果 city 为空，尝试重试
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = retryDelay * retryCount;
              console.log(`[reverseGeocode] city 为空，${delay}ms 后进行第 ${retryCount + 1} 次重试...`);
              setTimeout(attemptReverseGeocode, delay);
              return;
            } else {
              console.warn('[reverseGeocode] city 为空且已达到最大重试次数，返回部分数据');
            }
          }

          // 保存到缓存
          wx.setStorageSync('last_location', addressData);
          console.log('[reverseGeocode] 已保存地址信息到缓存:', addressData);
          
          resolve(addressData);
        },
        fail: (err) => {
          clearTimeout(timeoutTimer);
          console.error(`[reverseGeocode] ❌ 逆地理编码失败 (尝试 ${retryCount + 1} 次)`);
          console.error('[reverseGeocode] 错误对象:', err);
          console.error('[reverseGeocode] 错误类型:', typeof err);
          console.error('[reverseGeocode] 错误详情 - message:', err.message);
          console.error('[reverseGeocode] 错误详情 - errMsg:', err.errMsg);
          console.error('[reverseGeocode] 错误详情 - errCode:', err.errCode);
          console.error('[reverseGeocode] 错误详情 - 完整对象:', JSON.stringify(err, null, 2));

          // 尝试重试
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = retryDelay * retryCount; // 递增延迟
            console.log(`[reverseGeocode] ${delay}ms 后进行第 ${retryCount + 1} 次重试...`);
            setTimeout(attemptReverseGeocode, delay);
          } else {
            console.error('[reverseGeocode] SDK 调用已达到最大重试次数，尝试直接 API 调用...');
            
            // 最后一次尝试：直接调用 API
            callDirectAPI().then((apiData) => {
              const result = apiData.result;
              let detailedAddress = result.address;
              if (result.formatted_addresses && result.formatted_addresses.recommend) {
                detailedAddress = `${result.address} (${result.formatted_addresses.recommend})`;
              }
              const addressData = {
                latitude,
                longitude,
                province: result.address_component?.province || '',
                city: result.address_component?.city || '',
                district: result.address_component?.district || '',
                address: detailedAddress || result.address || '',
                full_address: detailedAddress || result.address || ''
              };
              wx.setStorageSync('last_location', addressData);
              console.log('[reverseGeocode] 直接 API 调用成功，已保存地址信息:', addressData);
              resolve(addressData);
            }).catch((apiErr) => {
              console.error('[reverseGeocode] 直接 API 调用也失败:', apiErr);
              
              // 尝试使用缓存
              const cachedLocation = wx.getStorageSync('last_location');
              if (cachedLocation && cachedLocation.province && cachedLocation.city) {
                console.log('[reverseGeocode] 使用缓存地址信息:', cachedLocation);
                resolve({
                  ...cachedLocation,
                  latitude, // 使用最新的经纬度
                  longitude
                });
              } else {
                // 即使失败，也返回至少包含经纬度的数据
                resolve({
                  latitude,
                  longitude,
                  province: '',
                  city: '',
                  district: '',
                  address: '位置解析失败',
                  full_address: '位置解析失败'
                });
              }
            });
          }
        },
        complete: (res) => {
          console.log('[reverseGeocode] complete 回调:', res);
        }
      });
    };

    // 开始第一次尝试
    attemptReverseGeocode();
  });
}

module.exports = {
  reverseGeocodeWithRetry
};
