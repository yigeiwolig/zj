# ESP32-C3 CAN 学习固件 (MT-CAN-Learn)

## 硬件接线

| 功能 | 引脚 |
|------|------|
| CAN TX | GPIO7 |
| CAN RX | GPIO6 |
| OLED SCL | GPIO9 |
| OLED SDA | GPIO10 |
| 按钮 | GPIO8（按下为 LOW，内部上拉） |
| LED 灯带数据线 | GPIO3 |

CAN 收发器：**SN65HVD230**，ESP32 TX → SN65 TXD，RX → SN65 RXD。

## 编译烧录

1. 安装 [PlatformIO](https://platformio.org/)
2. 在本目录执行：`pio run -t upload`
3. 串口监视：`pio device monitor`

## CAN 波特率

默认 **500 kbps**（可在 `src/main.cpp` 修改 `CAN_BITRATE`）。部分车型为 250 kbps。

## 蓝牙

- 广播名：`MT-CAN-Learn`
- Nordic UART Service (NUS)
- 小程序通过 JSON 指令控制学习 / 运行模式

## 按钮

- **短按**：在空闲时循环切换 OLED 显示页；学习步骤中确认当前步骤完成（与小程序 `start_learn` 等效备用）
