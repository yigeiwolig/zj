# 配件数据同步说明

## 已完成的修改

### 1. 本地配件列表（`shouhou.js`）
- ✅ F1 PRO 添加了"锁止模块"
- ✅ 所有型号（F1 MAX, F1 ULTRA, F2 PRO, F2 MAX, F2 ULTRA, F2 Long, F3 PRO, F3 MAX）都使用 F1 PRO 的配件列表

### 2. 云函数（`syncParts`）
- ✅ 批量同步配件到云端数据库
- ✅ 支持新增、更新、跳过
- ✅ 支持预演模式（dryRun）

### 3. 辅助工具（`syncPartsHelper.js`）
- ✅ 封装了同步逻辑
- ✅ 配置了所有配件的价格

## 使用方法

### 方法一：微信开发者工具控制台（推荐）

1. **上传并部署云函数**
   ```bash
   右键 cloudfunctions/syncParts → 上传并部署：云端安装依赖
   ```

2. **打开微信开发者工具控制台**
   - 点击开发者工具底部的"Console"标签

3. **复制以下代码到控制台执行**

   **先预演（不实际修改）：**
   ```javascript
   const syncHelper = require('./utils/syncPartsHelper.js');
   syncHelper.syncAllParts(true);
   ```

   **确认后正式同步：**
   ```javascript
   const syncHelper = require('./utils/syncPartsHelper.js');
   syncHelper.syncWithConfirm();
   ```

### 方法二：在页面代码中调用

在任意管理员页面（如 `myPageDef.js`）添加方法：

```javascript
// 在页面顶部引入
const syncPartsHelper = require('../../utils/syncPartsHelper.js');

// 在 Page({}) 中添加方法
syncPartsData() {
  if (!this.data.isAdmin) {
    wx.showToast({ title: '仅管理员可操作', icon: 'none' });
    return;
  }
  syncPartsHelper.syncWithConfirm();
}
```

然后在 WXML 中添加按钮：
```xml
<view wx:if="{{isAdmin}}" bindtap="syncPartsData">同步配件数据</view>
```

## 配件价格

当前配置的价格（在 `syncPartsHelper.js` 中）：

| 配件名称 | 价格 |
|---------|------|
| 主板外壳 | ¥10 |
| 下面板 | ¥40 |
| 上面板 | ¥40 |
| 合页 | ¥20 |
| 合页螺丝 | ¥20 |
| 90度连接件 | ¥10 |
| 连杆 | ¥20 |
| 摇臂 | ¥20 |
| 摇臂螺丝 | ¥20 |
| 电机 | ¥70 |
| 固定电机件 | ¥20 |
| 固定电机螺丝 | ¥20 |
| 装牌螺丝包 | ¥10 |
| 螺母 | ¥20 |
| 主板 | ¥130 |
| 按钮 | ¥20 |
| 遥控 | ¥20 |
| 链接线束 | ¥0 |
| **锁止模块（新增）** | **¥30** |

**如需修改价格：**
编辑 `miniprogram/utils/syncPartsHelper.js` 中的 `F1_PRO_PARTS_WITH_PRICE` 数组。

## 影响范围

同步后，以下型号的配件将全部替换为 F1 PRO 的配件列表：
- F1 PRO
- F1 MAX
- F1 ULTRA
- F2 PRO
- F2 MAX
- F2 ULTRA
- F2 Long
- F3 PRO
- F3 MAX

⚠️ **注意：** 
- 已存在的配件会更新价格和排序
- 不存在的配件会新增
- 云端有但列表中没有的配件不会被删除（需手动删除）

## 验证同步结果

同步完成后，进入小程序：
1. 以管理员身份进入"维修中心"
2. 选择任意型号
3. 查看配件清单，确认"锁止模块"已出现
4. 切换不同型号，确认配件一致
