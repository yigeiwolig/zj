# 云函数批量部署指南

## 云函数列表

以下是所有需要部署的云函数：

### 已确认有 package.json 的云函数（29个）
- accessControl
- addNicknameToWhitelist
- adminAuditDevice
- adminAuditVideo
- adminGetOrders
- adminUpdateMotoRank
- adminUpdateOrder
- adminUpdateVideoGo
- banUserByLocation
- banUserByScreenshot
- bindDevice
- checkPayResult
- checkUnlockStatus
- clearAllCollections
- createOrder
- deductWarrantyForOverdue
- deleteShouhouPart
- generateShareCode
- getBannedUsers
- getIgnoredUsers
- getClientIP
- getMotoRank
- login
- payCallback
- queryLogistics
- sendBlockedUser
- unbanUser
- unbindDevice
- updatePageVisit
- updateShouhouPart
- verifyNickname

### 新增（商城顶部轮播保存，必部署）
- **setShopMainConfig** — 管理员保存 `shop_config/shopMain` 顶部轮播（`shop_config` 客户端写权限为 false 时必须走此云函数）

### 需要检查的云函数
- addQiangliField（可能缺少 package.json）
- adminUpdateRepair（可能缺少 package.json）
- initShouhouParts（可能缺少 package.json）
- updateOrderStatus（可能缺少 package.json）

## 部署方法

### 方法一：使用微信开发者工具（推荐）

1. **打开微信开发者工具**
   - 打开你的小程序项目

2. **批量部署步骤**
   - 在左侧文件树中找到 `cloudfunctions` 文件夹
   - 展开 `cloudfunctions` 文件夹
   - 对于每个云函数文件夹，执行以下操作：
     - 右键点击云函数文件夹
     - 选择 **"上传并部署：云端安装依赖"**（推荐）
     - 或者选择 **"上传并部署：所有文件"**

3. **注意事项**
   - 如果云函数有 `config.json` 配置文件，请确保配置正确
   - 部署时间取决于云函数数量和依赖包大小
   - 建议按功能模块分批部署，避免一次性部署过多导致超时

### 方法二：使用命令行工具

如果你已安装微信开发者工具CLI，可以使用以下命令：

```bash
# 进入云函数目录
cd cloudfunctions

# 批量部署所有云函数
for dir in */; do
    dirname=$(basename "$dir")
    if [ -f "${dir}package.json" ] || [ -f "${dir}index.js" ]; then
        echo "正在部署: $dirname"
        cli cloud functions deploy "$dirname" --env cloudbase-4gn1heip7c38ec6c
    fi
done
```

## 部署后检查

部署完成后，请在微信开发者工具中检查：

1. **云函数列表**
   - 打开 "云开发" -> "云函数"
   - 确认所有云函数都已成功部署
   - 检查每个云函数的运行环境版本

2. **测试云函数**
   - 选择云函数
   - 点击 "测试" 按钮
   - 输入测试参数进行测试

3. **查看日志**
   - 如果部署失败，查看云函数日志
   - 检查是否有依赖安装错误或代码错误

## 常见问题

### 1. 部署失败：依赖安装错误
**解决方法：**
- 检查 `package.json` 中的依赖版本是否兼容
- 确保所有依赖都是 Node.js 支持的版本
- 可以尝试在本地 `npm install` 测试

### 2. 部署失败：代码错误
**解决方法：**
- 检查 `index.js` 中是否有语法错误
- 确保所有引用的模块都已正确导入
- 检查是否有环境变量未配置

### 3. 部署超时
**解决方法：**
- 分批部署，不要一次性部署所有云函数
- 检查网络连接是否稳定
- 减少云函数的依赖包大小

### 4. 封面上传 / 图片报 `127.0.0.1` 或 `url not in domain list`

#### 4.1 `http://127.0.0.1:xxxxx/__tmp__/...`（开发者工具常见）
**不是缺域名。** 这是微信开发者工具把本地临时图映射到本机地址，**不能**也**无需**配进公众平台域名列表。

**处理：**
- 开发者工具 → 详情 → 本地设置 → 勾选 **不校验合法域名**（仅本地调试）
- 封面已改为：上传成功后再用 **COS https 链接** 显示，不再用本地临时路径当 `<image src>`

#### 4.2 正式环境需配置的域名（你当前列表已基本齐全）

| 类型 | 需添加的域名 | 用途 |
|------|----------------|------|
| **request 合法域名** | `https://mt-1392958388.cos.ap-guangzhou.myqcloud.com` | COS 预签名 PUT 上传 |
| **request 合法域名** | `https://mt-1392958388.cos.accelerate.myqcloud.com` | COS 全球加速上传（若开启） |
| **downloadFile 合法域名** | 同上两条 + 你用于展示的 CDN 域名 | `<image>` / 下载 COS 图片 |
| **request 合法域名** | `https://apis.map.qq.com` | 腾讯地图（省市区） |
| **request 合法域名** | `https://tcb-api.tencentcloudapi.com` | 云开发 API |
| **request 合法域名** | `https://*.tcb.qcloud.la`（云开发静态，按控制台提示） | 云开发资源 |

修改后台域名后：开发者工具 → **详情 → 域名信息 → 刷新**，并重新编译。

#### 4.3 仅 PUT 上传仍报 domain list
重新部署 **`getCosUploadUrl`**（小图可走云函数 `putObject` 直传，不依赖客户端 PUT 域名）。

#### 4.4 商城顶部轮播上传成功但其他用户看不到
**原因：** `shop_config` 集合写权限为 `false`，小程序端 `db.update` 无法写入；仅本机缓存里暂时能看到。

**解决：** 部署云函数 **`setShopMainConfig`**，并重新编译小程序（保存逻辑已改为优先调该云函数）。同时确保 **`getCosUploadUrl`** 已部署（图片/视频上传到 COS）。

### 5. 物流弹窗报「缺少环境变量 TANSHU_API_KEY」
**原因：** 仅部署了改为只读环境变量的 `queryLogistics`，但云开发未配置 `TANSHU_API_KEY`。

**解决方法（二选一）：**
- **推荐：** 重新上传并部署当前仓库里的 `queryLogistics`（已恢复探数默认 Key，与历史一致）。
- **或：** 云开发 → 云函数 → **环境变量** → 添加 `TANSHU_API_KEY`（探数后台 Key）→ 再部署 `queryLogistics`。

## 项目配置信息

- **AppID:** wxf1a81dd77d810edf
- **云开发环境:** cloudbase-4gn1heip7c38ec6c
- **云函数根目录:** cloudfunctions/
