const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 记录分享码查看者的浏览数据
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  const { 
    shareCodeId,  // 分享码记录的 _id
    viewerData,   // 查看者数据 { nickname, durationMs, sectionClicks, sectionDurations, province, city, district, address, latitude, longitude }
    isUpdate      // 🔴 是否更新现有记录（true=更新最后一条记录，false=创建新记录）
  } = event;
  
  if (!shareCodeId) {
    console.error('[recordShareCodeViewer] 缺少 shareCodeId 参数');
    return { success: false, error: '缺少 shareCodeId 参数' };
  }

  try {
    // 🔴 先查询记录是否存在
    const docRes = await db.collection('chakan').doc(shareCodeId).get();
    
    if (!docRes.data) {
      console.error('[recordShareCodeViewer] 分享码记录不存在:', shareCodeId);
      return { success: false, error: '分享码记录不存在' };
    }

    const existingData = docRes.data;
    const hasViewers = existingData.viewers && Array.isArray(existingData.viewers);

    console.log('[recordShareCodeViewer] 记录是否存在 viewers 字段:', hasViewers);
    console.log('[recordShareCodeViewer] 现有 viewers 数量:', hasViewers ? existingData.viewers.length : 0);

    // 🔴 构建新的 viewer 记录
    const newViewer = {
      openid: openid,
      nickname: viewerData.nickname || '',
      viewTime: db.serverDate(),
      // 🔴 时长转换为分钟（保留2位小数）
      durationMinutes: viewerData.durationMs ? Math.round((viewerData.durationMs / 60000) * 100) / 100 : 0,
      province: viewerData.province || '',
      city: viewerData.city || '',
      district: viewerData.district || '',
      address: viewerData.address || '',
      latitude: viewerData.latitude || null,
      longitude: viewerData.longitude || null
    };

    // 🔴 将 sectionClicks 展开为独立字段（将键中的 "-" 替换为 "_"）
    const sectionClicks = viewerData.sectionClicks || {};
    for (const [key, value] of Object.entries(sectionClicks)) {
      const fieldName = `sectionClicks_${key.replace(/-/g, '_')}`;
      newViewer[fieldName] = value;
    }

    // 🔴 将 sectionDurations 展开为独立字段（转换为分钟，保留2位小数）
    const sectionDurations = viewerData.sectionDurations || {};
    for (const [key, value] of Object.entries(sectionDurations)) {
      const fieldName = `sectionDurations_${key.replace(/-/g, '_')}`;
      // 将毫秒转换为分钟
      newViewer[fieldName] = Math.round((value / 60000) * 100) / 100;
    }

    console.log('[recordShareCodeViewer] 准备保存的新 viewer 数据:', JSON.stringify(newViewer, null, 2));
    console.log('[recordShareCodeViewer] isUpdate:', isUpdate);

    const _ = db.command;
    
    let updateRes;
    
    // 🔴 如果是更新模式，找到最后一条相同 openid 的记录并更新
    if (isUpdate === true && hasViewers && existingData.viewers.length > 0) {
      // 找到最后一条相同 openid 的记录索引（从后往前找）
      let lastIndex = -1;
      for (let i = existingData.viewers.length - 1; i >= 0; i--) {
        if (existingData.viewers[i].openid === openid) {
          lastIndex = i;
          break;
        }
      }
      
      if (lastIndex >= 0) {
        // 🔴 更新最后一条相同 openid 的记录
        console.log('[recordShareCodeViewer] 更新第', lastIndex, '条记录（相同 openid 的最后一条）');
        
        // 构建更新对象（只更新可变字段，保留 viewTime 不变）
        const updateData = {};
        // 更新 durationMinutes
        updateData[`viewers.${lastIndex}.durationMinutes`] = newViewer.durationMinutes;
        
        // 更新地址信息
        updateData[`viewers.${lastIndex}.province`] = newViewer.province;
        updateData[`viewers.${lastIndex}.city`] = newViewer.city;
        updateData[`viewers.${lastIndex}.district`] = newViewer.district;
        updateData[`viewers.${lastIndex}.address`] = newViewer.address;
        updateData[`viewers.${lastIndex}.latitude`] = newViewer.latitude;
        updateData[`viewers.${lastIndex}.longitude`] = newViewer.longitude;
        
        // 更新 sectionClicks 字段
        for (const [key, value] of Object.entries(sectionClicks)) {
          const fieldName = `sectionClicks_${key.replace(/-/g, '_')}`;
          updateData[`viewers.${lastIndex}.${fieldName}`] = value;
        }
        
        // 更新 sectionDurations 字段
        for (const [key, value] of Object.entries(sectionDurations)) {
          const fieldName = `sectionDurations_${key.replace(/-/g, '_')}`;
          updateData[`viewers.${lastIndex}.${fieldName}`] = Math.round((value / 60000) * 100) / 100;
        }
        
        updateRes = await db.collection('chakan').doc(shareCodeId).update({
          data: updateData
        });
      } else {
        // 没找到相同 openid 的记录，当作新记录添加
        console.log('[recordShareCodeViewer] 未找到相同 openid 的记录，当作新记录添加');
        updateRes = await db.collection('chakan').doc(shareCodeId).update({
          data: {
            viewers: _.push(newViewer)
          }
        });
      }
    } else {
      // 🔴 创建新记录（首次保存）
      if (hasViewers) {
        // 使用 push 追加到现有数组
        console.log('[recordShareCodeViewer] 创建新记录，追加到现有 viewers 数组');
        updateRes = await db.collection('chakan').doc(shareCodeId).update({
          data: {
            viewers: _.push(newViewer)
          }
        });
      } else {
        // 使用 set 初始化数组
        console.log('[recordShareCodeViewer] 初始化新的 viewers 数组');
        updateRes = await db.collection('chakan').doc(shareCodeId).update({
          data: {
            viewers: [newViewer]
          }
        });
      }
    }

    console.log('[recordShareCodeViewer] update 结果:', updateRes);
    console.log('[recordShareCodeViewer] update 结果详情:', JSON.stringify(updateRes, null, 2));

    // 🔴 验证更新是否成功
    if (updateRes && updateRes.stats && updateRes.stats.updated > 0) {
      console.log('[recordShareCodeViewer] ✅ 数据保存成功');
      
      // 🔴 再次查询验证数据是否真的保存成功
      const verifyRes = await db.collection('chakan').doc(shareCodeId).get();
      const verifyData = verifyRes.data || {};
      console.log('[recordShareCodeViewer] 🔍 验证：viewers 字段是否存在:', verifyData.viewers ? '是' : '否');
      console.log('[recordShareCodeViewer] 🔍 验证：viewers 数组长度:', verifyData.viewers ? verifyData.viewers.length : 0);
      
      return {
        success: true,
        viewersCount: verifyData.viewers ? verifyData.viewers.length : 0
      };
    } else {
      console.error('[recordShareCodeViewer] ❌ 数据库更新失败，updated:', updateRes?.stats?.updated);
      return { 
        success: false, 
        error: '数据库更新失败',
        updateStats: updateRes?.stats
      };
    }

  } catch (err) {
    console.error('[recordShareCodeViewer] ❌ 记录分享码查看者失败:', err);
    return { success: false, error: err.message };
  }
};
