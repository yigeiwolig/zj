# F3 MAX 调试裁剪备份（可复原）

> 当 `f3_max_servo.ino` 顶部 **`F3_TRIM_FOR_DEBUG 1`** 时，为腾出 328P 闪存给 **USB 串口调试**，临时删除了下面功能。  
> **标定/波轮调试完成后请复原。**

## 如何关闭调试裁剪、恢复完整固件

1. 打开 `f3_max_servo.ino` 顶部，改：
   ```c
   #define F3_TRIM_FOR_DEBUG 0   // 恢复自动调平
   #define F3_USB_DEBUG 0        // 关闭 USB 串口刷屏（可选）
   ```
2. 确认 `#if !F3_TRIM_FOR_DEBUG` … `#else` … `#endif` 块中 **`#else` 分支的 stub `runAutoLevel()` 不会被编译**（`F3_TRIM_FOR_DEBUG 0` 时会编译完整版）。
3. 重新烧录。

## 被裁剪的内容

| 功能 | 调试版行为 | 完整版 |
|------|------------|--------|
| **自动调平** `runAutoLevel()` | 仅闪灯 1 次，不扫描 A0 | 完整 fold/open 扫描写 EEPROM |
| **`autoScanStall()`** | 整段不编译 | 自动调平依赖 |

**未删除（仍可用）**：翻板、折叠微调、F3 测高配置、`F3FU/F3FR`、标定预览、隐蔽模式、故障检测等。

## USB 串口调试（`F3_USB_DEBUG 1`）

- Mixly / Arduino：**9600 波特率** 打开串口监视器
- 每条蓝牙指令完整包会打印：`RX:调大` 或 `RX:F3FU`
- 配置模式丢弃：`DROP:xxx`
- 收到调大/调小预览：`PREVIEW ang=149`
- 与小程序 `DBG:` 行并行（蓝牙回传）

## 完整 `runAutoLevel` 源码备份

以下为 **`F3_FLASH_TIGHT` 版**（与当前主文件 `#if F3_FLASH_TIGHT` 分支一致）。  
若 git 有历史，也可：`git show HEAD:firmware/F3\ max/f3_max_servo.ino` 对照恢复。

```cpp
int autoScanStall(int from, int to, int thr) {
  int d = (to >= from) ? 1 : -1;
  for (int a = from; a != to + d; a += d) {
    servo.write(a);
    lastWrittenAngle = a;
    delayWithBlePoll(500);
    int a0 = analogRead(A0);
    if (a0 < thr) return a;
  }
  return to;
}

void runAutoLevel() {
  if (autoLevelBusy) { blinkPin8(1, 80, 80); return; }
  clearAutoLevelDone();
  if (item == 3) {
    stealthActive = 0;
    stealthElapsedMin = 0;
    stealthMinuteMark = 0;
    item = 0;
    foldHoldActive = 1;
    btn5NoteStealthExited();
    updatePin9Power();
    statusLedUpdate();
  }
  autoLevelBusy = 1;
  blinkPin8(2, 80, 80);
  servoPrepareMove();
  servo.write(120);
  lastWrittenAngle = 120;
  delayWithBlePoll(1500);
  y = autoScanStall(120, 180, AUTO_LEVEL_FOLD_THR);
  y -= 10;
  int u = autoScanStall(y, 180, AUTO_LEVEL_FOLD_THR);
  if (u == 180) { item4 = 180; delayWithBlePoll(300); }
  else { item4 = u - 3; }
  EEPROM.put(3, item4);
  servo.write(90);
  lastWrittenAngle = 90;
  y = autoScanStall(90, 0, AUTO_LEVEL_OPEN_THR);
  y += 10;
  int m = autoScanStall(y, 0, AUTO_LEVEL_OPEN_THR);
  if (m == 0) { delayWithBlePoll(300); bianlaing = 0; servo.write(0); }
  else { bianlaing = m; servo.write(bianlaing); delayWithBlePoll(300); }
  lastWrittenAngle = bianlaing;
  EEPROM.put(1, bianlaing);
  invalidateServoHold();
  item = 0;
  writeServo(item4);
  waitServoReach(item4);
  blinkPin8(3, 100, 100);
  saveAutoLevelDoneToEeprom();
  autoLevelBusy = 0;
  drainBleRx();
}
```

## 曾发现的 BLE 解析问题（已修）

- **`pollBleSerial` 曾丢弃 `>0x7E` 字节** → 中文「调大/调小」永远收不到，只有 ASCII 如 `M1` 有效
- **缓冲上限曾为 14 字节** → 长指令/模块杂讯易 `RX OVERFLOW`；现改为 24 字节

## 标定波轮指令

优先发 ASCII：**`F3FU#` / `F3FD#`**（与 `M1#` 同类）；中文「调大#」在 UTF-8 修复后也可用。
