# 上线检查单（摩改社小程序）

> 不新增云函数的前提下：已部署的云函数继续用；其余靠数据库规则 + 本仓库代码。

## 一、云数据库权限（控制台）

### 已配（保持）

| 集合 | 读 | 写 |
|------|----|----|
| `guanliyuan` | `doc.openid == auth.openid \|\| doc._openid == auth.openid` | `false` |
| `shop_orders` | `doc._openid == auth.openid` | `doc._openid == auth.openid` |
| `shouhou_repair` | `doc._openid == auth.openid` | `doc._openid == auth.openid` |
| `shouhou` / `shop_series` / `shop_accessories` / `shop_config` | `true` | `false` |
| `shouhouguoqi` | `doc._openid == auth.openid` | `false` |
| `user_coupons` | `doc._openid == auth.openid \|\| doc.ownerOpenid == auth.openid` | `false` |
| `referral_*` 三表 | `false` | `false` |

### 建议补配（第 7 步）

| 集合 | 读 | 写 |
|------|----|----|
| `login_logbutton` / `login_logs` / `valid_users` | `doc._openid == auth.openid` | `false` |
| `app_config` | `true` | `false` |
| `sn` | `true` | `false` |

### 管理员要在小程序里改商城/配件价时（二选一）

1. **推荐**：`shop_series`、`shop_accessories` 保持 `write: false`，只在云开发控制台改数据。  
2. **内测**：上述两集合 **写 `true`**（人少时可接受，上线人多不推荐）。

`shouhou` 集合保持只读；售后配件批量同步用已部署云函数 **`initShouhouParts`**，单条改价用 **`updateShouhouPart`**。

---

## 二、必须已部署的云函数（本次安全修复后请重新上传）

右键「上传并部署：云端安装依赖」：

- `login`、`createOrder`、`payCallback`、`checkPayResult`（支付三件套必一起部署）
- `adminGetOrders`、`adminUpdateOrder`
- `userUpdateRepair`、`adminUpdateRepair`（管理员维修列表/改单）
- `adminUpdateVideoGo`（管理员案例库 `video_go` 增删改/排序）
- `writeShouhouguoqi`、`referral`、`deductWarrantyForOverdue`、`queryLogistics`
- `setHubHomeConfig`、`setProductFeatureFlags`
- `getCosUploadUrl`、`updateShouhouPart`、`deleteShouhouPart`、`initShouhouParts`

---

## 三、云开发环境变量（上线前必配）

在「云开发 → 云函数 → 环境变量」**全环境统一配置**（未配置时支付/回调/推荐券会失败）：

| 变量名 | 用途 |
|--------|------|
| `WX_PAY_MCH_ID` | 商户号 |
| `WX_PAY_APP_ID` | 小程序 AppID |
| `WX_PAY_API_V3_KEY` | APIv3 密钥（回调解密） |
| `WX_PAY_SERIAL_NO` | 商户证书序列号 |
| `WX_PAY_CERT_PASSWORD` | p12 密码（一般为商户号） |
| `WX_APP_SECRET` | 发货同步微信订单中心 |
| `WECHATPAY_PLATFORM_PUB_PEM` | 微信支付**平台公钥** PEM（`\n` 换行可写成 `\n` 一行） |
| `INTERNAL_CALL_SECRET` | 云函数互调密钥（`payCallback`/`adminUpdateOrder` → `referral`） |
| `TANSHU_API_KEY` | 探数物流 API |

`INTERNAL_CALL_SECRET` 自行生成一串随机字符（如 32 位），**所有环境保持一致**。若配置了云定时触发器批量查单，触发参数须带 `_internalSecret`（与 `INTERNAL_CALL_SECRET` 相同），否则 `checkPayResult` 会拒绝执行。

代码已移除支付/物流硬编码默认值；请在微信商户平台**轮换**曾写入仓库的旧密钥。

---

## 四、代码侧已处理项

- 子页返回误回 `index` 启动页 → `pageBack` / `hubNav`；`products` / `shop` / `my` 支持 `onBackPress`
- 支付取消**不再清空购物车**；购物车仅在 `checkPayResult` 确认 PAID 后清空
- `payCallback`：验签 + 去掉伪造回调；`referral` 内部动作用 `INTERNAL_CALL_SECRET`
- `writeShouhouguoqi`：订单必须带且匹配 `repairId`；用户不可客户端改 `repairPaid` / `purchasePartsStatus`
- `deductWarrantyForOverdue`：仅管理员可调用
- 用户寄回提交权限 → `userUpdateRepair`（已部署则可用）
- 管理员维修单 → `adminUpdateRepair` + `adminGetOrders` 兜底
- 真机隐藏「测试清空」
- 地图 Key 配额满 → 本地省市区备用列表
- 售后一键同步配件 → 走 `initShouhouParts`（不再客户端写 `shouhou`）

---

## 五、已知限制（接受或改规则）

| 项 | 说明 |
|----|------|
| 商城 EDIT 保存 | `shop_*` 写 `false` 时会失败，见上一节 |
| 案例库编辑保存 | `video_go` 写 `false` 时需部署 `adminUpdateVideoGo`；勿对全员开放写权限 |
| 维修教程密码 | 仍在 `shouhou.js` 前端，非高保密场景可暂接受 |
| 腾讯地图 | 日配额 121 时用本地列表，详细地址写全 |
| `pagenew` 改 `products` | 需 `products` 写权限或改控制台 |

---

## 六、上线前 10 分钟冒烟

1. 普通用户：浏览商城 → 下单 → 支付成功 → 我的订单为已付款  
2. 下单后点取消支付 → 购物车**仍在**，待付款订单可继续付  
3. 需寄回：填地址 + 运单号 → 提交成功  
4. 管理员：待处理 / 需寄回列表能打开；手动扣质保需管理员身份  
5. 从子页（售后/FAQ/扫码）返回 → **不应**出现 MT 启动动画页  
6. 真机管理员界面 **无**「测试清空」

---

## 七、不要提交到 Git 的敏感文件

- `apiclient_key.pem`、`apiclient_cert.p12`
- 任何含真实 `appSecret`、支付密钥的 `.env`
