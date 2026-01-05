const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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
    // 🔴 统一只检查 login_logs 的封禁状态
    const logPromise = db.collection('login_logs').where({ _openid: openid }).orderBy('updateTime', 'desc').limit(1).get();
    const blockedLogPromise = db.collection('blocked_logs').where({ _openid: openid }).orderBy('updateTime', 'desc').limit(1).get();
    const userPromise = db.collection('user_list').where({ _openid: openid }).limit(1).get();
    const [logRecord, blockedLogRecord, userRecord] = await Promise.all([logPromise, blockedLogPromise, userPromise]);

    let historyIsAllowed = false, historyIsBanned = false, globalBan = false;
    // 从 login_logs 检查封禁状态
    if (logRecord.data.length > 0) { 
      globalBan = logRecord.data[0].isBanned === true; 
    }
    // 从 blocked_logs 检查允许状态（用于 VIP 特权）
    if (blockedLogRecord.data.length > 0) { 
      historyIsAllowed = blockedLogRecord.data[0].isAllowed; 
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

    if (globalBan) { 
      finalIsBlocked = true; 
      finalMsg = "🚫 账号已被永久封禁"; 
    } else if (historyIsAllowed) { 
      finalIsBlocked = false; 
      finalMsg = "✅ VIP特权放行"; 
    } else {
      if (isValidGPS) {
        if (!isChina) { 
          finalIsBlocked = true; 
          finalMsg = "⚠️ 海外IP访问受限"; 
        } else if (isZhejiang) { 
          finalIsBlocked = true; 
          finalMsg = "⚠️ 当前区域暂无法访问"; 
        } else { 
          finalIsBlocked = false; 
          finalMsg = "📍 访问通过"; 
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
    
    if (logRecord.data.length > 0) {
      await db.collection('blocked_logs').doc(logRecord.data[0]._id).update({ data: logData });
    } else {
      await db.collection('blocked_logs').add({ data: logData });
    }

    // 存用户表
    if (userRecord.data.length > 0) {
      await db.collection('user_list').doc(userRecord.data[0]._id).update({ 
        data: {
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
        }
      });
    } else {
      // 🔴 移除 isBanned 字段，封禁状态统一在 login_logs 中管理
      await db.collection('user_list').add({ 
        data: { 
          ...userInfo, 
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
    return { isBlocked: false, msg: "系统错误" };
  }
};
