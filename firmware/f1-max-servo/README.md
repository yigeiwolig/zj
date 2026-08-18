# F1 MAX 固件

基于 `firmware/f2-max-servo/f2_max_servo.ino` 复制并加入 **F1 折回路径**：

- 每次「**用户打开后再折回**」（按键 / 蓝牙 / 关钥匙收回）时，舵机先到 **180°**，停留约 **1 秒**，再收到 EEPROM 里的折叠角 `item4`。
- 打开时重置 detour 标志（`requestFlapOpen` / 蓝牙·按键打开 / **开机下翻**）。
- **不走 detour**：开机折回、隐蔽模式折回、故障快速收回、折叠角微调。

烧录文件：`f1_max_servo.ino`（Mixly 里粘贴到工程主 `.ino` 即可）

## Pro Mini (328P) 程序区

可用约 **30720** 字节。默认 `F1_COMPACT_FLASH=1`：关闭 USB 调试串口与自动调平日志，避免 `Sketch too big`。

若仍超限，可将 `F1_COMPACT_FLASH` 改为 `0` 前先确认已换 **Optiboot / 更小 bootloader** 的 328P，或改用 Nano（同样需留意 bootloader 占用）。

维护：F1 与 F2 分开目录，互不影响。
