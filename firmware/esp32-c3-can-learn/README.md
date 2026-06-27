# ESP32-C3 CAN 学习固件 (MT-CAN-Learn)

## 硬件接线

| 功能 | 引脚 |
|------|------|
| CAN TX | GPIO7 |
| CAN RX | GPIO6 |
| OLED SCL | GPIO9 |
| OLED SDA | GPIO10 |
| 按钮 | GPIO8（**HIGH** 触发，内部下拉；按下接 3.3V） |
| LED 灯带数据线 | GPIO3 |

CAN 收发器：**SN65HVD230**，ESP32 TX → SN65 TXD，RX → SN65 RXD。

## 编译烧录

### Mixly / Arduino CLI（推荐你当前环境）

1. 确保已安装库：
   - **U8g2**、**FastLED**、**NimBLE-Arduino**、**CanLearnCore**（`libraries/CanLearnCore`）
2. 工程文件：`MILXY/testArduino/testArduino.ino`
3. 在 Mixly 中重新上传即可。

### PlatformIO

1. 安装 [PlatformIO](https://platformio.org/)
2. 在本目录执行：`pio run -t upload`
3. 串口监视：`pio device monitor`

## CAN 波特率

固定 **500 kbps**，**无极被动监听**：设备从不主动发 CAN 帧；确认高帧率车身广播后切 **LISTEN_ONLY**。

> 本设备仅适用于 **CAN** 总线。LIN 协议车辆无法采集。

## 屏幕

- 驱动：**U8g2** Software I2C（SCL=GPIO9, SDA=GPIO10）

## 灯带

- WS2812B，GPIO3；**灯珠总数默认 30，可通过小程序或 BLE `set_led_count` 设置（1–300）**
- 运行模式：转速控制亮灯数量（0–num_leds），挡位控制颜色（N绿/1蓝/2黄/其他红）
- 主循环逐颗步进：每次只亮/灭 **1** 颗；转速差大时间隔缩短（3–11ms/颗），快追但不整段跳

## 挡位学习

1. A/B/C/D 锁定 N、1 挡寄存器与转速
2. 小程序引导依次挂 2→6 挡，每挡采集 2 秒 CAN 字节值并匹配

## 蓝牙

- 运行模式 JSON 推送间隔 **150ms**（100-200ms 范围内）

## 按钮

- **短按（GPIO8=HIGH）**：重新锁定 CAN 并重置监听状态
