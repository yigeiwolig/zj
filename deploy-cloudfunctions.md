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

## 项目配置信息

- **AppID:** wxf1a81dd77d810edf
- **云开发环境:** cloudbase-4gn1heip7c38ec6c
- **云函数根目录:** cloudfunctions/
