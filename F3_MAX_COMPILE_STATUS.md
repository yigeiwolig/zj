# F3 MAX 固件编译状态

## 当前版本修改

### 1. WRN:3 翻开测距异常逻辑反转 ✅
- 新增 `f3TofSaysFoldOpenFault()` 函数：`mm >= 80mm` 时返回 true
- 修改 `f3TickFoldCloseWatch()`：
  - 翻开时测距 `< 8cm` → 绿灯常亮，正常
  - 翻开时测距 `>= 8cm` 连续 8 秒 → 报 WRN:3 异常
  - 运动过程中暂停监控（检查 `f3ServoMotionBusy()`）

### 2. LED 指示灯修改 ✅
- 新增 `BOOT_LED_ON` / `BOOT_LED_OFF` 宏，开机/配置时显示绿灯
- 修改所有非故障场景的 LED 为绿灯：
  - 开机自检：绿灯
  - 测高配置模式：绿灯
  - 隐蔽模式进入/退出：绿灯
  - 设置确认闪烁：绿灯
- 保留故障时的红灯指示

### 3. 按钮打断运动 ✅
- 修改 `requestFlapOpen()` 和 `requestFlapClose()`:
  - 检查 `servoMoveCommitted`、`openEaseActive`、`forceServoMove`、`flapSettleUntil`
  - 只有真正到位且不在运动中才返回
  - 清除 `flapSettleUntil` 以允许新运动

### 4. 小程序自动校准修复 ✅
- `scan.js` 新增 `_f3EnsureHeightConfigModeForWrite`:
  - 轮询 `F3C:1` 状态
  - 失败时重试 `M1#`（最多 8 次，每次间隔 2 秒）
- 确保写入测高配置前设备已进入配置模式

### 5. 故障说明文本更新 ✅
- `f2FaultReport.js` WRN:3 说明修改为：
  "正常翻开时绿灯常亮，测距应小于 8cm。若测距连续 8 秒仍不小于 8cm，则报此异常，请检查机械位置与测距窗口。"

### 6. 代码大小优化
- ✅ LED 控制函数改为宏 (`BOOT_LED_ON`/`BOOT_LED_OFF`)
- ✅ 新增 `F3_AUTOLEVEL_ENABLE` 条件编译标志（当前设为 0）
  - 禁用自动找平功能可节省约 800 字节
  - 代码保留，如需启用可改为 1

## 编译状态

### ATmega328P 闪存限制
- 最大容量：32KB (32768 字节)
- 当前状态：**仍然超限**

### 最近尝试
1. 第一次超限 → 将 LED 函数改为宏
2. 宏定义位置错误 → 移动到文件开头
3. 仍然超限 → 禁用自动找平功能 (`F3_AUTOLEVEL_ENABLE = 0`)
4. 最近编译输出：`Error during build: exit status 1`（无详细错误）

### 条件编译结构（已验证）
```cpp
#if F3_AUTOLEVEL_ENABLE
  int autoScanStall(...) { ... }
  
  #if F3_FLASH_TIGHT
    void runAutoLevel() { /* 简化版 */ }
  #else
    void runAutoLevel() { /* 完整调试版 */ }
  #endif
  
#else
  void runAutoLevel() { 
    blinkPin8(3, 100, 100); // 提示功能未编译进固件
  }
#endif
```

## 文件同步状态 ✅
所有三个固件文件已同步：
1. `firmware/F3 max/f3_max_servo.ino`
2. `firmware/_compile_f3_max/f3_max_servo/f3_max_servo.ino`
3. `firmware/f3_max_servo/f3_max_servo.ino`

## 下一步建议

### 编译问题排查
1. 检查编译器详细输出（可能被截断）
2. 尝试重新打开 Arduino IDE/Mixly
3. 清理构建缓存重新编译

### 进一步优化（如需要）
如果仍然超限，可以考虑：
- 禁用更多调试串口输出 (`F3_BLE_RX_SERIAL` 等)
- 简化字符串常量（使用更短的消息）
- 检查是否有重复或未使用的代码
- 考虑使用 ATmega328PB (40KB) 或更大容量的 MCU

## 功能测试清单（待编译成功后）
- [ ] 翻开状态测距 < 8cm，绿灯常亮
- [ ] 翻开状态测距 >= 8cm 持续 8 秒，报 WRN:3
- [ ] 开机自检显示绿灯
- [ ] 测高配置模式显示绿灯
- [ ] 按钮可打断运动并立即反向
- [ ] 自动校准高度写入成功
- [ ] 高级设置（打开收回、开机下翻）接收正常
