# COS 数据桶迁移与读速优化说明

## 1. 架构说明

- **写**：小程序不再调用 `wx.cloud.uploadFile`。统一通过云函数 `getCosUploadUrl` 获取 COS **预签名 PUT** 地址，客户端用 `wx.request` 将文件二进制直传到对象存储。
- **存库字段**：新数据在数据库中保存 **`publicUrl`（https 直链）**，与字段名是否仍叫 `videoFileID`、`img` 等无关，值应为可公网访问的 URL。
- **读**：新数据可直接把 URL 绑定到 `<image src>`、`<video src>`、`wx.previewImage` 等，**无需** `wx.cloud.getTempFileURL`。历史 **`cloud://`** 数据仍走原有换链逻辑，避免老数据断裂。

公共封装：`miniprogram/utils/cosUpload.js`（`uploadImageToCos`、`uploadVideoToCos`、`uploadLocalFileToCos`）。

## 2. 云函数与环境变量

部署并配置 `cloudfunctions/getCosUploadUrl`：

| 变量 | 说明 |
|------|------|
| `COS_SECRET_ID` / `COS_SECRET_KEY` | 腾讯云 API 密钥 |
| `COS_BUCKET` | 完整桶名，如 `bucketname-1250000000` |
| `COS_REGION` | 地域，如 `ap-guangzhou` |
| `COS_PUBLIC_DOMAIN` | **可选**。自定义访问前缀（无尾斜杠），用于拼接 `publicUrl`（CDN、自有域名等）。**留空**时云函数自动使用 `https://{bucket}.cos.{region}.myqcloud.com`。 |
| `COS_PUBLIC_USE_ACCELERATE` | **可选**。填 `1` 或 `true` 且未配 `COS_PUBLIC_DOMAIN`（或域名被判定为错误）时，默认前缀改为 `https://{bucket}.cos.accelerate.myqcloud.com`（需桶已开全球加速）。 |

**禁止**把云开发静态域名 `*.tcb.qcloud.la` 当作 `COS_PUBLIC_DOMAIN`：文件经预签名 **PUT 到 COS 桶**，与云开发静态站点不是同一套存储，拼出来的链接会 **403**。

小程序后台 **downloadFile 合法域名**、**request 合法域名** 需包含：实际访问资源用的主机名（默认桶域名、加速域名或你的 CDN），以及 COS **PUT** 请求域名（控制台可查）。

## 3. 读速与体验优化要点

1. **直链 + CDN**：`COS_PUBLIC_DOMAIN` 建议绑定 **CDN 加速域名**（或全球加速），减少首包与图片 TTFB；大图/视频与小程序同区域就近访问。
2. **避免重复换链**：新数据已是 `https://` 时，不要再调用 `getTempFileURL`；列表页对 `cloud://` 可 **批量** `getTempFileURL` 一次，避免 N 次调用。
3. **预热解码**：首屏关键图可在拿到 URL 后调用 `wx.getImageInfo({ src })` 触发缓存，减少列表滚动时闪白（注意频率，避免并发过高）。
4. **懒加载**：非首屏 `<image>` 使用 `lazy-load`；详情多图可对前 1～2 张关闭懒加载、其余开启，与预加载策略配合。
5. **体积**：上传前适当压缩图片/视频（分辨率、码率），降低下载时间与内存占用。
6. **缓存**：业务层可对商品列表、封面等做 **内存 + 本地存储** 短期缓存（TTL），减少重复请求与换链。

## 4. 已改为 COS 直传的页面（写入）

| 页面 | 说明 |
|------|------|
| `pages/case/case.js` | 管理员视频/封面、拍摄指南、用户投稿视频 |
| `pages/home/home.js` | 店铺图片 |
| `pages/pagenew/pagenew.js` | 产品封面 |
| `pages/my/my.js` | 凭证图 `proofs/` |
| `pages/shouhou/shouhou.js` | 教程视频/封面、维修单视频 |
| `pages/azjc/azjc.js` | 安装教程媒体 |
| `pages/shop/shop.js` | `uploadToCos` / `uploadShopImageToCos` / `uploadShopVideoToCos`，仅 COS |
| `utils/mediaUpload.js` | 对 `cosUpload` 的统一出口，新代码可 `require` 本文件以示约定 |

## 5. 删除旧文件

- 仅 **`cloud://`** 旧资源可继续用 `wx.cloud.deleteFile`。
- 已迁到 COS 的旧对象若需删除，需单独云函数调用 COS API（或依赖桶 **生命周期规则** 定期清理）。

## 6. 排查清单

- 上传报「缺少 COS 环境变量」：至少配置 `COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_BUCKET` / `COS_REGION`；`COS_PUBLIC_DOMAIN` 可省略。
- **视频/图 403，且 URL 含 `tcb.qcloud.la`**：`COS_PUBLIC_DOMAIN` 误填成云开发域名。请删除或改为 COS/CDN 域名；云函数已自动忽略 `*.tcb.qcloud.la` 并改用桶默认域名生成新链接（**已写入库的旧错误 URL 需重新上传或批量替换**）。
- **404**：桶内无该 key（上传失败却写库、误删、或桶/地域与链接不一致）。确认读域名与上传目标桶一致；桶需对匿名读开放（公有读）或使用带签名的读链（需另做方案）。
- PUT 403：检查预签名是否过期、密钥与桶策略。

## 7. 重新部署

修改 `getCosUploadUrl` 后请在微信开发者工具中 **上传并部署该云函数**，环境变量在 **云开发控制台 → 云函数 → getCosUploadUrl → 配置** 中维护。
