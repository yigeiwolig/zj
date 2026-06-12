# 摩改社 · 配置总表（环境变量 + 本地文件）

> **填写位置（统一）**：微信开发者工具 → **云开发** → **云函数** → **环境变量**  
> 不要写进某个云函数的 `index.js`。  
> 云开发环境 ID：`cloudbase-4gn1heip7c38ec6c`（见 `deploy-cloudfunctions.md`）

---

## 一、支付 / 小程序（必配 9 项）

| 环境变量名 | 你的值（已确认 / 历史） | 来源 | 用到的云函数 |
|------------|-------------------------|------|----------------|
| `WX_PAY_MCH_ID` | `1103782674` | 你已确认 | `createOrder`、`payCallback`、`checkPayResult`、`adminUpdateOrder` |
| `WX_PAY_APP_ID` | `wxf1a81dd77d810edf` | `project.config.json` | 同上 |
| `WX_PAY_API_V3_KEY` | `MTMoGaiSheWeChatPay2025Key888888` | 文档/历史；忘记则以商户平台为准或重置 | 同上（不含 adminUpdateOrder） |
| `WX_PAY_SERIAL_NO` | `73F820E3A9CBFF6FF509EAB7B2449CEBAB33E479` | 文档/历史；与商户平台 API 证书核对 | `createOrder`、`payCallback`、`checkPayResult` |
| `WX_PAY_CERT_PASSWORD` | `1103782674` | 一般等于商户号 | `createOrder`（p12 备用） |
| `WX_APP_SECRET` | `5bfe65370c582c7bb7c4010c609ec2c1` | **你已确认：小程序 AppSecret** | `checkPayResult`、`adminUpdateOrder` |
| `WECHATPAY_PLATFORM_PUB_PEM` | ⚠️ **待补：公钥 PEM 正文** | 商户平台 → API 安全 → 微信支付公钥 → **复制公钥**（不是 ID） | **`payCallback` only** |
| `INTERNAL_CALL_SECRET` | `Mt_2026_32529587` | 你自己生成 | `referral`（校验）；`payCallback`、`adminUpdateOrder`（调用 referral） |
| `TANSHU_API_KEY` | `f3cb439c7700cbc370f469d07b557609`（Git 历史） | 探数后台；建议换新 Key | **`queryLogistics` only** |

### 你提供的 `PUB_KEY_ID_0111037826742026010900382216001600`

- 这是 **公钥编号**，不能代替 `WECHATPAY_PLATFORM_PUB_PEM`。
- 请在商户平台同一页点击 **查看/复制公钥**，粘贴以 `-----BEGIN PUBLIC KEY-----` 开头的整段。

---

## 二、云函数目录里的证书文件（不是环境变量）

| 文件 | 路径 | 说明 |
|------|------|------|
| `apiclient_key.pem` | `cloudfunctions/createOrder/` | 商户 API 私钥，部署时随函数上传 |
| 同上 | `cloudfunctions/payCallback/` | 同上 |
| 同上 | `cloudfunctions/checkPayResult/` | 同上 |

缺文件时：微信支付商户平台 → API 安全 → 申请/下载 API 证书。

---

## 三、其它云函数环境变量（上传图片等，与支付表分开）

若 COS 上传已正常，说明可能已在云开发配过，无需改支付表。

| 环境变量名 | 用到的云函数 |
|------------|----------------|
| `COS_SECRET_ID` | `getCosUploadUrl`、`cosMultipartUpload`、`clearAllCollections`（案例删除 COS 亦走 `getCosUploadUrl`） |
| `COS_SECRET_KEY` | 同上 |
| `COS_BUCKET` | 同上 |
| `COS_REGION` | 同上 |
| `COS_PUBLIC_DOMAIN` | 可选 |
| `COS_PUBLIC_USE_ACCELERATE` | 可选 `1` |
| `CLEAR_ALL_PASSWORD` | `clearAllCollections`（测试清空，上线可不管） |

---

## 四、写在前端代码里（不进云函数环境变量）

| 类型 | 位置 | 说明 |
|------|------|------|
| 腾讯地图 Key | `shouhou.js`、`myPageDef.js`、`products.js` 等 | 省市区选择；配额满走本地备用 |
| 小程序 AppID | `project.config.json` | 与 `WX_PAY_APP_ID` 一致 |

---

## 五、填完环境变量后必须重新部署

`createOrder`、`payCallback`、`checkPayResult`、`referral`、`adminUpdateOrder`、`queryLogistics`

---

## 六、你还差哪一项

- [x] 商户号、AppID、AppSecret、互调密钥  
- [x] APIv3 密钥、证书序列号（历史值可先填）  
- [ ] **`WECHATPAY_PLATFORM_PUB_PEM`（公钥 PEM 正文）**  
- [ ] **探数 Key `TANSHU_API_KEY`（物流查询必配，否则自定义物流弹窗会报错）**
