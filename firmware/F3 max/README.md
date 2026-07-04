# F3 MAX 完整固件

基于 **F2 MAX** 固件完整复制（`firmware/f2-max-servo/f2_max_servo.ino` 不改动），并融合 TF200C（VL53L0X）测高。

**产品名：F3 MAX**（小程序控制中心卡片同名）

主程序：**`f3_max_servo.ino`**（与 `VL53L0X.h` / `VL53L0X.cpp` 同目录）

## 与 F2 MAX 的差异

| 项目 | F2 MAX | F3 MAX |
|------|--------|--------|
| 平滑模式 | 有 | **无**（固件已裁剪） |
| 排查卡死 | 将 `F3_HEIGHT_ENABLE` 改为 **0** 烧录；若不卡则问题在测距模块 |
| 闪存 | 紧张 | 更紧张，需精简库 + `F3_FLASH_TIGHT` |

## 烧录

1. 板型：**Arduino Nano** → 处理器选 **ATmega328P**（勿选 168）
2. 将 **`f3_max_servo.ino`** 全部复制到 Mixly 工程（如 `testArduino.ino`）
3. 依赖：`EEPROM`、`SoftwareSerial`、**`Servo`（内置）**、`Wire`、**`VL53L0X`**
4. **不要**添加 `VarSpeedServo` 库

### 精简版 VL53L0X（若 Sketch too big）

```powershell
cd "firmware\F3 max"
.\install-vl53-lite.ps1
```

或手动复制本目录 `VL53L0X.h`、`VL53L0X.cpp` 到  
`MILXY\arduino-cli\libraries\VL53L0X\` 覆盖，并删除 `mixlyBuild\libraries\VL53L0X\VL53L0X.cpp.o` 后重编。

## TF200C 接线

| 模块脚 | Nano |
|--------|------|
| VCC | 5V |
| GND | GND |
| SDA | A4 |
| SCL | A5 |
| XSHUT | D4 |

## 与小程序通信

- 翻板**舵机转动时**测距并上报 **`HGT:`**（静止不测、不传，减轻 I2C/蓝牙负载）
- **`ANG:`** 仍为舵机角度，与测高无关
- **`SMO:`** 恒为 **0**（F3 MAX 无平滑模式）

### Mixly 串口调试（可选）

默认 **`F3_SENSOR_SERIAL 0`**（328P 闪存仅 30720B，开串口易超限）。

需要时在 `f3_max_servo.ino` 顶部改为 `F3_SENSOR_SERIAL 1`，串口 9600 打印 `HGT raw filt ok`。

测高仍通过蓝牙状态包 **`|HGT:`** 发到小程序，不依赖串口。
