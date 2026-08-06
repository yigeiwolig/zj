# -*- coding: utf-8 -*-
$path = "c:\Users\32529\Desktop\zj\firmware\F3_max_最新\F3_max_最新.ino"
$utf8 = New-Object System.Text.UTF8Encoding $false
$c = [System.IO.File]::ReadAllText($path, $utf8)

# 1) 开关
$c = $c.Replace("#define F3_HEIGHT_ENABLE 1 // 0=完全关闭测高（排查卡死时先改 0 试）", "#define F3_HEIGHT_ENABLE 0 // 最新代码：永久关闭 TOF`r`n#define F3_IMU_ENABLE 1      // MPU6050 停车姿态")

# 2) 去 VL53 头与对象
$c = $c.Replace("#include `"VL53L0X.h`"`r`n", "")
$c = $c.Replace("#include `"VL53L0X.h`"`n", "")
$c = $c.Replace("VL53L0X f3Tof;`r`n", "")
$c = $c.Replace("VL53L0X f3Tof;`n", "")

# 3) 包住仍引用 f3Tof 的恢复/读样函数
$c = $c.Replace("static void f3RecoverSensor() {", "#if F3_HEIGHT_ENABLE`r`nstatic void f3RecoverSensor() {")
# 在 f3ReadSample 结束后加 #endif —— 找 f3FilterMm 之前
if ($c -notmatch "(?s)static bool f3ReadSample.*?return true;\r?\n\}\r?\n\r?\n#if !F3_FLASH_TIGHT") {
  Write-Host "readsample end pattern miss"
} else {
  $c = [regex]::Replace($c, "(static bool f3ReadSample\(uint16_t &mm\) \{[\s\S]*?return true;\r?\n\})", "`$1`r`n#endif // F3_HEIGHT_ENABLE", 1)
}

# 4) 去掉长距配置（含 f3Tof）
$c = [regex]::Replace($c, "(?s)#if !F3_FLASH_TIGHT\r?\nstatic void f3ConfigureLongRange\(\) \{[\s\S]*?\}\r?\n#endif\r?\n", "")

# 5) 头注释
$oldHead = [regex]::Match($c, "(?s)/\*.*?F3 MAX 无平滑模式.*?F3_FLASH_TIGHT\.\r?\n \*/").Value
if ($oldHead) {
  $newHead = @"
/*
 * F3 MAX 最新代码（陀螺仪版）
 * --------------------------------
 * 去掉全部 TOF/VL53 测高，以及翻开后「未收到位」红绿爆闪检测。
 * 新增 MPU6050：无震动时，倾斜→牌照正常(item=0)，扶正→收起(item=1)；有震动则不自动翻板。
 * 功能可小程序开关。三项标定：倾斜 / 扶正 / 打火振动。
 * D12 照明灯可由小程序手动开关（正常位可手动关灯）。
 * 烧录：ATmega328P Nano Old Bootloader。MPU6050：SCL=A5 SDA=A4。
 * 详见 需求说明.txt
 */
"@
  $c = $c.Replace($oldHead, $newHead)
}

# 6) 危险拦翻开 stub（原函数在 HEIGHT_ENABLE 内）
if ($c -notmatch "F3_NO_TOF_STUB") {
  $insert = @"

/* F3_NO_TOF_STUB：无测高时的空实现 */
#if !F3_HEIGHT_ENABLE
static bool f3FlapOpenDangerBlocked() { return false; }
#endif

"@
  $c = $c.Replace("const uint8_t F3_PIN_LED_GREEN = 10;", "const uint8_t F3_PIN_LED_GREEN = 10;" + $insert)
}

# 7) 循环去掉折叠监视
$c = $c.Replace("`r`n  f3TickFoldCloseWatch();", "")
$c = $c.Replace("`n  f3TickFoldCloseWatch();", "")

# 8) 灯与 IMU 钩子
$c = $c.Replace("digitalWrite(12, (item == 0) ? HIGH : LOW);", "f3WorkLightApply();")
$c = $c.Replace("digitalWrite(12, LOW); // D12 工作灯：高电平亮（AO3402 低端）", "digitalWrite(12, LOW); // D12 照明灯")

if ($c -notmatch "f3ImuInit\(\)") {
  $c = $c.Replace("  f3SensorInit();", "  f3SensorInit();`r`n#if F3_IMU_ENABLE`r`n  f3ImuInit();`r`n#endif")
}
if ($c -notmatch "f3ImuServiceTick\(\)") {
  $c = $c.Replace("  f3SensorServiceTick();", "  f3SensorServiceTick();`r`n#if F3_IMU_ENABLE`r`n  f3ImuServiceTick();`r`n#endif")
}

# 9) 前向声明（放在 Wire 后）
if ($c -notmatch "void f3ImuInit\(") {
  $fwd = @"

#if F3_IMU_ENABLE
void f3ImuInit();
void f3ImuServiceTick();
void f3WorkLightApply();
uint8_t f3ImuTryHandleBleCmd(char *cmd);
void f3ImuAppendStatus(Stream &out);
#else
static inline void f3WorkLightApply() { digitalWrite(12, (item == 0) ? HIGH : LOW); }
#endif

"@
  # Wire.h 可能已在头里，插到 F3_MAX_BUILD 定义后
  $c = $c.Replace("#define F3_IMU_ENABLE 1      // MPU6050 停车姿态", "#define F3_IMU_ENABLE 1      // MPU6050 停车姿态" + $fwd)
}

# 10) BLE 命令钩子：在处理命令的合适位置 —— 找 processBle 或类似
# 稍后在 f3_mpu 里用弱符号；主文件里搜 tryShortHeight 旁插入

[System.IO.File]::WriteAllText($path, $c, $utf8)
Write-Host "OK bytes=$($c.Length)"
