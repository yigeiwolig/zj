// 云函数：获取客户端IP地址
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  // 从微信云函数上下文中获取IP
  const ip = context.request?.sourceIP || 
             context.request?.clientIP || 
             event.clientIP || 
             '未知';
  
  console.log('获取到的IP地址:', ip);
  
  return {
    ip: ip,
    timestamp: Date.now()
  };
};


