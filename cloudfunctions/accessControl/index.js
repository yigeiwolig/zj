const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isGuanliyuan(openid) {
  if (!openid) return false;
  let r = await db.collection('guanliyuan').where({ openid }).limit(1).get();
  if (r.data && r.data.length > 0) return true;
  r = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get();
  return !!(r.data && r.data.length > 0);
}

// 工具：判断浙江 (用于拦截逻辑)
function checkIsZhejiang(lat, lng) {
  return (lat > 27.0 && lat < 31.2 && lng > 118.0 && lng < 123.0);
}

// 工具：判断中国 (用于判断是否海外)
function checkIsChina(lat, lng) {
  return (lat > 3.8 && lat < 53.5 && lng > 73.0 && lng < 135.5);
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 接收前端传来的详细拆解数据
  const { 
    latitude, longitude, nickName, deviceInfo, 
    addressDetail, buildingName, 
    province, city, district // 【新增】接收省市区
  } = event;

  console.log('=== 用户进入 ===', { nickName, province, city });

  try {
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    const isValidGPS = Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum !== 0;

    // --- 权限判定 ---
    // 1. blocked_logs：历史放行记录（VIP 特权）
    // 2. user_list：用户资料
    // 3. login_logbutton：唯一的封禁控制源 (昵称封禁 + 地址拦截)
    // 🔴 移除 login_logs 查询，它不控制封禁
    
    const blockedLogPromise = db.collection('blocked_logs')
      .where({ _openid: openid })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();
    const userPromise = db.collection('user_list')
      .where({ _openid: openid })
      .limit(1)
      .get();
    const buttonPromise = db.collection('login_logbutton')
      .where({ _openid: openid })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();
    
    // 以 openid 为主键检查 valid_users 白名单放行，昵称仅作为兜底兼容
    const validUsersBypassPromise = db.collection('valid_users')
      .where({
        _openid: openid,
        bypassLocationCheck: true
      })
      .limit(1)
      .get();

    const [blockedLogRecord, userRecord, buttonRecordRes, validUsersBypassRes] =
      await Promise.all([blockedLogPromise, userPromise, buttonPromise, validUsersBypassPromise]);

    const adminBypassLocation = await isGuanliyuan(openid);

    let historyIsAllowed = false;
    let globalBan = false;               // 对应 nickname_verify_fail
    let bypassLocationCheck = false;     // 免死金牌
    let locationBannedByButton = false;  // 对应 location_blocked

    // 1. 从 blocked_logs 检查允许状态（VIP 特权）
    if (blockedLogRecord.data.length > 0) { 
      historyIsAllowed = blockedLogRecord.data[0].isAllowed; 
    }

    // 1.5. 检查 valid_users 白名单放行（openid 主键）
    if (validUsersBypassRes.data && validUsersBypassRes.data.length > 0) {
      bypassLocationCheck = true;
      console.log('[accessControl] ✅ 检测到白名单放行（valid_users openid 匹配）:', openid);
    }

    // 2. 🔴 核心：从 login_logbutton 检查所有封禁状态
    if (buttonRecordRes.data && buttonRecordRes.data.length > 0) {
      const btn = buttonRecordRes.data[0];
      const rawFlag = btn.isBanned;
      const isBannedFlag = rawFlag === true || rawFlag === 1 || rawFlag === 'true' || rawFlag === '1';

      const existingBypass = btn.bypassLocationCheck === true;
      // 🔴 如果 user_list 中已经有放行标记，或者 login_logbutton 中有放行标记，都算放行
      bypassLocationCheck = bypassLocationCheck || existingBypass;

      if (isBannedFlag) {
        // 截屏/录屏封禁：管理员（guanliyuan）豁免
        if (btn.banReason === 'screenshot' || btn.banReason === 'screen_record' || btn.banReason === 'screenshot_risk_review') {
          if (adminBypassLocation) {
            console.log('[accessControl] 管理员豁免截屏/录屏封禁');
          } else {
            globalBan = true;
            console.log('[accessControl] 🔒 检测到截屏/录屏封禁，全局封禁');
          }
        } else if (btn.banReason === 'location_blocked') {
          if (existingBypass) {
            locationBannedByButton = false;
            console.log('[accessControl] 🛡️ 免死金牌用户，跳过地址封禁');
          } else {
            locationBannedByButton = true;
          }
        } else {
          // 其他封禁原因（如 nickname_verify_fail）
          globalBan = true;
        }
      }
    }

    // --- 拦截逻辑 ---
    let finalIsBlocked = false;
    let finalMsg = "正常访问";
    let isZhejiang = false;
    let isChina = true;

    if (isValidGPS) {
      isZhejiang = checkIsZhejiang(latNum, lngNum);
      isChina = checkIsChina(latNum, lngNum);
    }

    // 1. 账号层面全局封禁（例如昵称封禁），最高优先级
    if (globalBan) { 
      finalIsBlocked = true; 
      finalMsg = "🚫 账号已被永久封禁"; 
    }
    // 2. login_logbutton 标记的地址封禁（且没有免死金牌；管理员不参与地址拦截）
    else if (locationBannedByButton && !adminBypassLocation) {
      finalIsBlocked = true;
      finalMsg = "⚠️ 当前区域暂无法访问";
    }
    // 3. 历史允许记录（VIP 特权）
    else if (historyIsAllowed || bypassLocationCheck) { 
      finalIsBlocked = false; 
      finalMsg = "✅ VIP特权放行"; 
    } 
    // 4. 检查 app_config.blocking_rules.blocked_cities（如果传了省市信息）
    else if (city) {
      try {
        const configRes = await db.collection('app_config').doc('blocking_rules').get();
        const config = configRes.data || { 
          is_active: false, 
          blocked_cities: [] 
        };
        
        // 检查拦截开关是否开启
        if (!config.is_active) {
          finalIsBlocked = false;
          finalMsg = "📍 访问通过";
        } else {
          const blockedCities = Array.isArray(config.blocked_cities) ? config.blocked_cities : [];
          // 🔴 新的拦截判断逻辑：支持对象数组格式 {city, district}，同时兼容旧格式字符串数组
          const isBlockedCity = blockedCities.some(blockedItem => {
            let blockedCity = '';
            let blockedDistrict = '';
            
            // 判断是新格式（对象）还是旧格式（字符串）
            if (typeof blockedItem === 'object' && blockedItem !== null) {
              // 新格式：{city: "佛山市", district: "南海区"} 或 {city: "佛山市", district: ""}
              blockedCity = blockedItem.city || '';
              blockedDistrict = blockedItem.district || '';
            } else if (typeof blockedItem === 'string') {
              // 旧格式：兼容 "佛山市" 这样的字符串
              blockedCity = blockedItem;
              blockedDistrict = ''; // 旧格式默认拦截整个市
            }
            
            // 如果城市不匹配，直接返回 false
            if (!city || !blockedCity || 
                (city.indexOf(blockedCity) === -1 && blockedCity.indexOf(city) === -1)) {
              return false;
            }
            
            // 城市匹配了，检查区级拦截
            if (blockedDistrict && blockedDistrict.trim() !== '') {
              // 如果配置了区，则只拦截该区
              // 如果用户没有区信息，不拦截（因为无法判断）
              if (!district || district.trim() === '') {
                return false;
              }
              // 检查区是否匹配
              return district.indexOf(blockedDistrict) !== -1 || 
                     blockedDistrict.indexOf(district) !== -1;
            } else {
              // 如果没有配置区（district 为空），则拦截整个市
              return true;
            }
          });

          if (isBlockedCity && !bypassLocationCheck && !adminBypassLocation) {
          // 城市被拦截，更新 login_logbutton
          // 🔴 构建地址和设备信息对象
          const locationInfo = {
            province: province || '',
            city: city || '',
            district: district || '',
            address: addressDetail || '',
            latitude: isValidGPS ? latNum : undefined,
            longitude: isValidGPS ? lngNum : undefined
          };
          
          const deviceInfoObj = {
            device: deviceInfo || '',
            phoneModel: deviceInfo || ''
          };
          
          if (buttonRecordRes.data && buttonRecordRes.data.length > 0) {
            await db.collection('login_logbutton').doc(buttonRecordRes.data[0]._id).update({
              data: {
                isBanned: true,
                banReason: 'location_blocked',
                banPage: 'index', // 地址拦截发生在 index 页面
                ...locationInfo,   // 地址信息
                ...deviceInfoObj,  // 设备信息
                updateTime: db.serverDate()
              }
            });
          } else {
            await db.collection('login_logbutton').add({
              data: {
                _openid: openid,
                isBanned: true,
                banReason: 'location_blocked',
                banPage: 'index', // 地址拦截发生在 index 页面
                ...locationInfo,   // 地址信息
                ...deviceInfoObj,  // 设备信息
                bypassLocationCheck: false,
                qiangli: false, // 🔴 自动添加qiangli字段，默认false
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            });
          }
          
            finalIsBlocked = true;
            finalMsg = "⚠️ 当前区域暂无法访问";
          } else {
            finalIsBlocked = false;
            finalMsg = "📍 访问通过";
          }
        }
      } catch (e) {
        console.error('[accessControl] 检查拦截配置失败:', e);
        // 配置检查失败，使用旧的经纬度判断作为兜底
        if (isValidGPS) {
          if (!adminBypassLocation && !isChina) {
            finalIsBlocked = true;
            finalMsg = "⚠️ 海外IP访问受限";
          } else if (!adminBypassLocation && isZhejiang) {
            finalIsBlocked = true;
            finalMsg = "⚠️ 当前区域暂无法访问";
          } else {
            finalIsBlocked = false;
            finalMsg = adminBypassLocation ? "📍 管理员跳过地域规则" : "📍 访问通过";
          }
    } else {
          finalIsBlocked = true;
          finalMsg = "⚠️ 系统暂时无法校验访问权限";
        }
      }
    } 
    // 5. 兜底：使用旧的经纬度判断（如果没有传省市信息）
    else {
      if (isValidGPS) {
        if (!adminBypassLocation && !isChina) {
          finalIsBlocked = true;
          finalMsg = "⚠️ 海外IP访问受限";
        } else if (!adminBypassLocation && isZhejiang) {
          finalIsBlocked = true;
          finalMsg = "⚠️ 当前区域暂无法访问";
        } else {
          finalIsBlocked = false;
          finalMsg = adminBypassLocation ? "📍 管理员跳过地域规则" : "📍 访问通过";
        }
      } else {
        finalIsBlocked = false; 
        finalMsg = "⚠️ 未获取定位"; 
      }
    }

    // --- 构建数据 ---
    const now = db.serverDate();
    let geoPointData = isValidGPS ? db.Geo.Point(lngNum, latNum) : null;

    // 【新增】生成更友好的位置描述
    // 如果在中国，显示 "广东省 深圳市" 这种格式；如果在海外，显示 "海外地区"
    let readableLocation = "未知区域";
    if (isValidGPS) {
      if (!isChina) {
        readableLocation = "海外地区";
      } else {
        // 如果前端传了省市，就用前端的，否则给个默认值
        const p = province || "";
        const c = city || "";
        readableLocation = `${p} ${c}`.trim() || (isZhejiang ? "浙江省" : "中国大陆");
      }
    }

    const userInfo = {
      _openid: openid,
      nickName: nickName || "匿名",
      device: deviceInfo || 'unknown',
      
      address: addressDetail || "未知地址",
      building: buildingName || "未知楼栋",
      
      // 【新增】独立字段存储，方便筛选
      province: province || "", 
      city: city || "",
      district: district || "",
      
      // 【修改】这里现在存的是 "xx省 xx市" 或者 "海外地区"
      locationDesc: readableLocation,
      
      ...(geoPointData ? { geography: geoPointData } : {}),
      latitude: isValidGPS ? latNum : 0,
      longitude: isValidGPS ? lngNum : 0,
      updateTime: now
    };

    // 存日志
    // 🔴 移除 isBanned 字段，封禁状态统一在 login_logs 中管理
    const logData = { 
      ...userInfo, 
      isBlocked: finalIsBlocked, 
      isAllowed: historyIsAllowed, 
      isOverseas: !isChina, 
      createTime: now 
    };
    
    if (blockedLogRecord.data.length > 0) {
      await db.collection('blocked_logs').doc(blockedLogRecord.data[0]._id).update({ data: logData });
    } else {
      await db.collection('blocked_logs').add({ data: logData });
    }

    // 存用户表
    if (userRecord.data.length > 0) {
      const existingUser = userRecord.data[0];
      // 🔴 如果 user_list 中已经有 bypassLocationCheck 字段，保留它；否则不设置
      const updateData = {
        nickName: userInfo.nickName,
        address: userInfo.address,
        building: userInfo.building,
        province: userInfo.province,
        city: userInfo.city,
        district: userInfo.district,
        locationDesc: userInfo.locationDesc,
        ...(geoPointData ? { geography: geoPointData } : {}),
        latitude: userInfo.latitude,
        longitude: userInfo.longitude,
        updateTime: now
      };
      // 🔴 如果已有 bypassLocationCheck 字段，保留它
      if (existingUser.bypassLocationCheck !== undefined) {
        updateData.bypassLocationCheck = existingUser.bypassLocationCheck;
      }
      await db.collection('user_list').doc(userRecord.data[0]._id).update({ 
        data: updateData
      });
    } else {
      // 🔴 移除 isBanned 字段，封禁状态统一在 login_logs 中管理
      // 🔴 检查 valid_users 白名单中是否有该昵称对应的记录且 bypassLocationCheck 为 true
      let inheritBypass = false;
      if (validUsersBypassRes.data && validUsersBypassRes.data.length > 0) {
        inheritBypass = true;
      }
      await db.collection('user_list').add({ 
        data: { 
          ...userInfo,
          bypassLocationCheck: inheritBypass, // 🔴 如果 valid_users 中昵称匹配且放行开关打开，继承该设置
          createTime: now 
        } 
      });
    }

    return { 
      isBlocked: finalIsBlocked, 
      msg: finalMsg 
    };

  } catch (err) {
    console.error(err);
    // 权限状态无法确认时不得默认放行。
    return { isBlocked: true, msg: "系统暂时无法校验访问权限，请稍后重试" };
  }
};
