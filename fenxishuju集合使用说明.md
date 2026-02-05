# fenxishuju 集合使用说明

## 📍 集合位置
**数据库集合名称**: `fenxishuju`

## 🔧 云函数

### 1. **updatePageVisit** - 写入/更新数据
**位置**: `cloudfunctions/updatePageVisit/index.js`

**功能**: 记录用户访问各个页面的次数

**写入逻辑**:
- **更新现有记录**（第63行）:
  ```javascript
  await db.collection('fenxishuju').doc(record._id).update({
    data: {
      [pageNameEn]: currentCount + 1,
      updateTime: now
    }
  });
  ```

- **创建新记录**（第80行）:
  ```javascript
  await db.collection('fenxishuju').add({
    data: initialData
  });
  ```

**数据结构**（英文字段名，用于后台）:
```javascript
{
  _openid: "用户openid",
  Login: 访问次数,           // 登录页
  Products: 访问次数,        // 产品页
  Shop: 访问次数,            // 商店页
  Case: 访问次数,            // 案例页
  My: 访问次数,              // 个人中心
  Home: 访问次数,            // 首页
  Ranking: 访问次数,         // 排行榜
  Repair: 访问次数,          // 维修中心
  Blocked: 访问次数,         // 封禁页
  Admin: 访问次数,           // 管理员页
  AdminLite: 访问次数,       // 管理员精简页
  Tutorial: 访问次数,        // 安装教程
  Contact: 访问次数,         // 联系页
  Scan: 访问次数,            // 扫描页
  OTA: 访问次数,             // OTA页
  NewPage: 访问次数,         // 新页面
  createTime: 创建时间,
  updateTime: 更新时间
}
```

**页面名称映射**:
- `index` → `Login`
- `products` → `Products`
- `shop` → `Shop`
- `case` → `Case`
- `my` → `My`
- `home` → `Home`
- `paihang` → `Ranking`
- `shouhou` → `Repair`
- `blocked` → `Blocked`
- `admin` → `Admin`
- `adminLite` → `AdminLite`
- `azjc` → `Tutorial`
- `call` → `Contact`
- `scan` → `Scan`
- `ota` → `OTA`
- `pagenew` → `NewPage`

### 2. **getBannedUsers** - 读取数据
**位置**: `cloudfunctions/getBannedUsers/index.js`

**功能**: 查询被封禁用户的访问统计

**读取逻辑**（第24-28行）:
```javascript
const visitRes = await db.collection('fenxishuju')
  .where({
    _openid: db.command.in(openids)
  })
  .get();
```

**返回数据格式**（英文，用于后台）:
- `banPageText`: 封禁页面（Case, My, Products, Shop, Home, Ranking, Repair, Login, Blocked, Admin, AdminLite, Tutorial, Contact, Scan, OTA, NewPage）
- `banReasonText`: 封禁原因（Screenshot, Screen Record, Location Blocked, Nickname Verify Fail, Unknown）
- `nickname`: 用户昵称（Unknown User 如果未找到）
- `updateTime`: 格式化时间（Unknown Time 如果格式化失败）

## 📱 小程序调用位置

### 全局方法定义
**位置**: `miniprogram/app.js` 第39行

```javascript
updatePageVisit: function(pageRoute) {
  wx.cloud.callFunction({
    name: 'updatePageVisit',
    data: { pageRoute: pageRoute }
  }).catch(err => {
    console.error('[updatePageVisit] 调用失败:', err);
  });
}
```

### 各页面调用位置

所有页面的 `onLoad` 或 `onShow` 生命周期中都会调用：

1. **my.js** (第212行): `app.globalData.updatePageVisit('my')` → 存储为 `My`
2. **call.js** (第62行): `app.globalData.updatePageVisit('call')` → 存储为 `Contact`
3. **blocked.js** (第54行): `app.globalData.updatePageVisit('blocked')` → 存储为 `Blocked`
4. **index.js** (第93行): `app.globalData.updatePageVisit('index')` → 存储为 `Login`
5. **shop.js** (第204行): `app.globalData.updatePageVisit('shop')` → 存储为 `Shop`
6. **shouhou.js** (第235行): `app.globalData.updatePageVisit('shouhou')` → 存储为 `Repair`
7. **products.js** (第158行): `app.globalData.updatePageVisit('products')` → 存储为 `Products`
8. **case.js** (第120行): `app.globalData.updatePageVisit('case')` → 存储为 `Case`
9. **scan.js** (第511行): `app.globalData.updatePageVisit('scan')` → 存储为 `Scan`
10. **azjc.js** (第137行): `app.globalData.updatePageVisit('azjc')` → 存储为 `Tutorial`
11. **pagenew.js** (第32行): `app.globalData.updatePageVisit('pagenew')` → 存储为 `NewPage`
12. **home.js** (第55行): `app.globalData.updatePageVisit('home')` → 存储为 `Home`
13. **paihang.js** (第94行): `app.globalData.updatePageVisit('paihang')` → 存储为 `Ranking`
14. **adminLite.js** (第39行): `app.globalData.updatePageVisit('adminLite')` → 存储为 `AdminLite`
15. **ota.js** (第138行): `app.globalData.updatePageVisit('ota')` → 存储为 `OTA`
16. **admin.js** (第17行): `app.globalData.updatePageVisit('admin')` → 存储为 `Admin`

## 📊 数据流程

1. **用户访问页面** → 页面 `onLoad/onShow` 触发
2. **调用全局方法** → `app.globalData.updatePageVisit('页面名')`
3. **调用云函数** → `wx.cloud.callFunction({ name: 'updatePageVisit' })`
4. **云函数执行**:
   - 查询用户是否已有记录
   - 如果有：更新对应页面的访问次数 +1（使用英文字段名）
   - 如果没有：创建新记录，该页面访问次数 = 1（使用英文字段名）
5. **数据写入** → `fenxishuju` 集合（字段名为英文，便于后台使用）

## ✅ 总结

- **写入位置**: `cloudfunctions/updatePageVisit/index.js`
- **调用方式**: 通过 `app.globalData.updatePageVisit()` 全局方法
- **触发时机**: 各页面的 `onLoad` 或 `onShow` 生命周期
- **数据用途**: 统计用户访问各个页面的次数，用于数据分析
- **字段命名**: **全部使用英文**，便于后台系统使用
