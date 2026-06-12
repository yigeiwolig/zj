# 全项目代码审计（上线前）

> 范围：`miniprogram/` + `cloudfunctions/` + 仓库杂物。  
> 不只数据库权限，包含业务逻辑、支付、导航、安全、重复代码、死代码、运维。

---

## 一、致命（上线前必须处理）

### 1. 支付与资金

| # | 问题 | 位置 |
|---|------|------|
| P1 | **支付密钥、商户号、APIv3 默认值写在仓库**；`apiclient_key.pem` 随仓库分发 | `createOrder`、`payCallback`、`checkPayResult`、`adminUpdateOrder` |
| P2 | **`payCallback` 未做微信通知 RSA 签名校验**；仅 AES 解密 + 金额校验 | `cloudfunctions/payCallback/index.js` |
| P3 | **遗留伪造入口**：`outTradeNo + resultCode === 'SUCCESS'` 可直接标 PAID | `payCallback/index.js` ~392–406 |
| P4 | **`referral` 的 `grantOnOrderPaid` / `markCouponsUsed` 等可被任意登录用户调用**（知 orderId 即可） | `cloudfunctions/referral/index.js` |
| P5 | **`writeShouhouguoqi`**：订单无 `repairId` 时仍可改他人维修单「已购配件」 | `cloudfunctions/writeShouhouguoqi/index.js` |
| P6 | **`deductWarrantyForOverdue` 无管理员/本人校验**，可扣任意设备质保 | `cloudfunctions/deductWarrantyForOverdue/index.js` |
| P7 | **物流 API Key 硬编码** | `cloudfunctions/queryLogistics/index.js` |

### 2. 订单与购物车（业务资金风险）

| # | 问题 | 位置 |
|---|------|------|
| O1 | **`createOrder` 先写 `UNPAID` 订单再调起支付**；用户取消支付时 **商城/结算组件仍清空购物车** → 易重复下单、幽灵 UNPAID 单 | `checkoutLogic.js` `_finalizeUnpaidOrder`；`shopPageDef.js` `_handleShopPaymentCancelled` |
| O2 | **支付成功先清购物车，再轮询 `checkPayResult`**；若同步失败 → 钱已付、车已空、订单仍 UNPAID | `checkoutLogic.js`、`shopPageDef.js` |
| O3 | **售后 `doCloudSubmit` 支付成功路径不完整**：不调 `writeShouhouguoqi`、不更新 `purchasePartsStatus`；完整逻辑在 **`doPayment` 但从未被调用（死代码）** | `shouhou.js` ~4617 vs ~4747 |
| O4 | 支付后 **`shop_orders.repairId` 客户端 patch 失败被 `.catch(() => {})` 吞掉** | `shouhou.js`、`shopPageDef.js` |

### 3. 导航（用户可见严重 bug）

| # | 问题 | 位置 |
|---|------|------|
| N1 | **`products`（枢纽）、`shop`、`my` 无 `onBackPress`**；Android 物理返回可能回到 **`pages/index/index` 启动动画页** | `products.js`、`shop.js`、`my/` |
| N2 | 仍从枢纽 **`navigateTo` 独立 `shop` 页**（非 embed），加剧栈混乱 | `products.js` ~1398 |

---

## 二、高（强烈建议上线前修）

### 小程序业务逻辑

| # | 问题 | 位置 |
|---|------|------|
| H1 | **四套支付流程重复**（checkout / shop / my / shouhou），行为不一致 | 见下文「重复架构」 |
| H2 | **`my_cart` 全局共用**：枢纽商城、独立 shop、售后购配件、我的订单结算互相覆盖 | 多处 `setStorageSync('my_cart')` |
| H3 | **`loadMyOrders` 需复合索引** `_openid + createTime`，否则生产环境订单列表可能查空 | `myPageDef.js` |
| H4 | **`submitFillRepair` 非管理员分支仍客户端直写 `shouhou_repair`**，严格规则下失败 | `myPageDef.js` ~3887 |
| H5 | **封禁检查管理员豁免只查 `guanliyuan.openid`，未查 `_openid`** → 部分管理员被误封 | `shopPageDef.js` ~7783；`pagenew.js` ~775 |
| H6 | **`checkAdminPrivilege()` 多处 fire-and-forget 无 `.catch`**，异常可成未处理 Promise | `shop`、`shouhou`、`case`、`products` 等 |
| H7 | **`azjc.js` `checkAdminPrivilege().then(...)` 无 `.catch`** | `azjc.js` ~407 |
| H8 | 支付轮询 **shop/checkout 未像 shouhou 一样用 `_pageDestroyed` 终止**，页面卸载后仍回调 | `shopPageDef.js` vs `shouhou.js` |

### 云函数 / 权限逻辑

| # | 问题 | 位置 |
|---|------|------|
| H9 | **`userUpdateRepair` 允许用户改 `purchasePartsStatus` / `repairPaid` 无支付校验** | `userUpdateRepair/index.js` |
| H10 | **`checkPayResult` 在调用方无 openid 时可绕过订单归属** | `checkPayResult/index.js` |
| H11 | **`createOrder` 未在开头拒绝空 OPENID** | `createOrder/index.js` |
| H12 | **`addUserToList` 无鉴权** | `addUserToList/index.js` |
| H13 | **`queryLogistics` 无鉴权 + 硬编码 key** | `queryLogistics/index.js` |
| H14 | **`adminUpdateOrder` 的 `simulate_pay` 生产环境应关闭或仅环境变量开启** | `adminUpdateOrder/index.js` |
| H15 | **`login` 云函数把完整 `event` 回传客户端** | `login/index.js` |

### 数据库规则与客户端写库冲突

| 集合 | 客户端仍在写 | 严格规则下 |
|------|----------------|------------|
| `shop_series` / `shop_accessories` | 商城 EDIT 保存 | 失败（除非写权限放开） |
| `shouhou` | 部分 `.add`（非 init 云函数路径） | 失败 |
| `products` | `pagenew` 管理页增删改 | 失败 |
| `home` | 首页内容管理 | 失败 |

（用户路径已部分走 `userUpdateRepair` / `updateShouhouPart` / `initShouhouParts`。）

---

## 三、中（技术债 / 体验 / 维护）

| # | 问题 |
|---|------|
| M1 | **`myPageDef.js` ~8500 行、`shopPageDef.js` ~8000 行、`shouhou.js` ~7900 行** — 单文件承载过多，改一处易牵全身 |
| M2 | 根目录 **`tmp_my_layout_*.wxml`、`tmp-faq-icon2.js`** 应删除或加入 `.gitignore`，勿随版发布 |
| M3 | Git 在 Windows 上 **同文件正反斜杠双显示** — 非真重复，提交时注意只 stage 一份 |
| M4 | **`invest`、`admin` 页面在 app.json 注册但几乎无入口** — 死页面 |
| M5 | **`orders` / `profile` 仅 redirect 到枢纽** — 可用但增加栈深度 |
| M6 | 教程解锁密码 **`123456` 写在前端 `shouhou.js` `CODES`** + URL `autoUnlock=1` |
| M7 | **腾讯地图 Key 写在多个前端文件**，日配额 121 已触发 |
| M8 | **`openid` vs `_openid` 混用**：`sn` 用 `openid`，订单/维修用 `_openid`；部分页面管理员查询不一致 |
| M9 | `new Promise(async executor)` 反模式 | `myPageDef.js`、`home.js` |
| M10 | `hubNav.openShopCheckout` 重复 `setData` 键 |
| M11 | 调试日志/region 残留（`#region agent log`、日志仍写 `my.js` 文件名） |
| M12 | **`rateLimit` / `accessControl` 异常时 fail-open（放行）** |
| M13 | COS 上传：登录即可传多目录且 `public-read` |

---

## 四、重复架构（根因说明）

```
支付链路（4 套）
├── shop-checkout-modal/checkoutLogic.js   ← 枢纽商城结算
├── shop/shopPageDef.js                    ← 独立 shop + embed
├── my/myPageDef.js                        ← 维修费、订单 Tab
└── shouhou/shouhou.js                     ← doCloudSubmit（活） + doPayment（死）

返回链路（2 套）
├── utils/pageBack.js + hubNav.js          ← 新
└── 各页自写 navigateBack / reLaunch       ← 旧，未统一

管理员维修/配件
├── adminUpdateRepair + adminGetOrders     ← 列表/改单
├── userUpdateRepair                       ← 用户寄回
├── updateShouhouPart / deleteShouhouPart  ← shouhou 配件价
├── initShouhouParts                       ← 批量同步
└── 仍残留的客户端 db.collection('shouhou_repair').update
```

---

## 五、已做 / 不必重复做

- 枢纽返回、`pageBack` 接入多数子页（**不含 products/shop/my 的 onBackPress**）
- `userUpdateRepair` / 管理员维修云函数（你已部署且验证寄回）
- 真机隐藏测试清空、`regionFallback` 地图备用
- `docs/LAUNCH_CHECKLIST.md` 运维向检查单

---

## 六、修复优先级建议（不强制再加新云函数）

### 第一批（只改小程序，效果明显）

1. `products` / `shop` / `my` 增加 **`onBackPress` → `pageBack.popOrHub` 或 `hubNav.goHome`**
2. **取消支付不清购物车**（或仅标记 UNPAID 不删车）
3. **售后支付成功**：`doCloudSubmit` success 内补与 `checkPayResult` 一致的后处理，或删除死代码 `doPayment` 并合并逻辑
4. `shopPageDef` / `pagenew` 管理员封禁检查 **补 `_openid`**
5. `submitFillRepair` 统一 **`_userRepairPatch`**

### 第二批（云函数必须动，但不是「加新函数」）

1. 密钥进环境变量 + 轮换 + 移除 pem
2. `payCallback` 验签 + 删 legacy SUCCESS 路径
3. `referral` 敏感 action 加调用方校验
4. 收紧 `writeShouhouguoqi`、`deductWarrantyForOverdue`、`userUpdateRepair` 字段白名单

### 第三批（架构 / 上线后）

1. 支付模块抽一层公共 `paymentFlow.js`
2. 拆分三大 PageDef 工厂文件
3. 删除 tmp 文件、unregister 死页面

---

## 七、冒烟用例（全链路）

1. 加购 → 结算 → **取消支付** → 购物车是否还在、是否多 UNPAID 单  
2. 加购 → 支付成功 → 订单 PAID、优惠券/维修关联是否正确  
3. 售后引导购配件 → 支付 → 我的页「已购配件」状态  
4. 从 FAQ/售后/扫码/OTA **物理返回** 是否进启动页  
5. 管理员：待处理、需寄回、发货、商城 EDIT（若 write:false 预期失败）  
6. 非管理员无法通过抓包改他人订单/维修单（配好规则后）

---

*生成说明：基于对 miniprogram 全量路径、cloudfunctions 52 个入口、git 状态与关键用户链路的静态审计。*
