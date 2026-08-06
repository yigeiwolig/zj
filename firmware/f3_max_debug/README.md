# F3 MAX 调试程序（测高专用）

路径：`firmware/f3_max_debug/`

## Mixly 编译说明（重要）

Mixly 全局库 `VL53L0X` 是 F3 精简版，公开接口只有：

- `init` / `startContinuous` / `readRangeContinuousMillimeters`
- `setSignalRateLimit(uint16_t q97)`

**没有** `setVcselPulsePeriod` / `setMeasurementTimingBudget`（调用会编译失败）。

本程序已按精简库改好：档位只调 **信号门限 + 连续测距周期**。

把 `f3_max_debug.ino` 贴进 Mixly / `testArduino` 后直接上传即可。

## 小程序实测

1. 烧录成功 → 连蓝牙 → F3 MAX
2. 主界面切 **TQ2 / TQ3** 测黑胎
3. 看「翻板高度」「原始」是否跟着距离变

| 档 | 门限(约) | 周期 |
|----|----------|------|
| TQ0 | 0.10 MCPS | 40ms |
| TQ1 | 0.05 MCPS | 60ms |
| TQ2 | 0.03 MCPS | 90ms（黑胎） |
| TQ3 | 0.016 MCPS | 120ms（极限） |
