# F3_max_最新 批量改造：去 TOF 钩子 + 改头 + 灯/IMU 接入点
$path = Join-Path $PSScriptRoot "F3_max_最新.ino"
if (-not (Test-Path $path)) {
  $dir = Get-ChildItem "c:\Users\32529\Desktop\zj\firmware" -Directory | Where-Object { $_.Name -eq "F3_max_最新" } | Select-Object -First 1
  $path = Join-Path $dir.FullName "F3_max_最新.ino"
}
$c = [System.IO.File]::ReadAllText($path)

$header = @'
#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <string.h>
#include <Wire.h>
#include <math.h>

/*
 * F3 MAX 最新代码（陀螺仪版）
 * --------------------------------
 * 相对旧 F3 MAX：去掉全部 TOF/VL53 测高与「翻开未收到位」红绿爆闪检测。
 * 新增 MPU6050：倾斜→牌照正常、扶正→收起（仅无震动时）；功能可开关。
 * 三项标定：倾斜角 / 扶正角 / 打火振动。照明灯 D12 可由小程序手动开关。
 * 烧录：ATmega328P Nano / Old Bootloader。MPU：SCL=A5 SDA=A4。
 * 详见同目录 需求说明.txt
 */

#define F3_MAX_BUILD 1
#define F3_FLASH_TIGHT 1
#define F3_SENSOR_SERIAL 0
#define F3_HEIGHT_ENABLE 0   // 最新代码：永久关闭 TOF 测高
#define F3_IMU_ENABLE 1      // MPU6050 停车姿态 / 标定
#define F3_BLE_CMD_DEBUG 0
#define F3_BLE_RX_SERIAL 0
#define F3_BLE_RX_USB_DEBUG 0

'@

# 砍掉旧头到 Wire/VL53 之前，保留 Servo 条件编译块
if ($c -match '(?s)#include <EEPROM\.h>.*?\#endif\r?\n\r?\n#include <Wire\.h>\r?\n#include "VL53L0X\.h"') {
  $servoBlock = [regex]::Match($c, '(?s)(// 328P：F3 用更小 Servo 库.*?\#endif\r?\n\#endif\r?\n)').Groups[1].Value
  if (-not $servoBlock) {
    $servoBlock = [regex]::Match($c, '(?s)(// 328P：F3 用更小 Servo.*?\#endif\r?\n\#endif\r?\n)').Groups[1].Value
  }
  $rest = [regex]::Replace($c, '(?s)^.*?\#include "VL53L0X\.h"\r?\n', '', 1)
  $c = $header + $servoBlock + "`r`n" + $rest
} else {
  Write-Host "WARN: header pattern miss, doing simple replaces"
  $c = $c -replace '#define F3_HEIGHT_ENABLE 1', '#define F3_HEIGHT_ENABLE 0'
  $c = $c -replace '#include "VL53L0X\.h"\r?\n', ''
}

$c = $c -replace '#define F3_HEIGHT_ENABLE 1', '#define F3_HEIGHT_ENABLE 0'
$c = $c -replace '#include "VL53L0X\.h"\r?\n', ''

# 去掉 VL53 对象与长距配置里的 f3Tof（HEIGHT 关闭后仍可能残留）
$c = $c -replace '(?s)#if !F3_FLASH_TIGHT\r?\nstatic void f3ConfigureLongRange\(\) \{.*?\n\}\r?\n#endif\r?\n', ''
$c = $c -replace 'VL53L0X f3Tof;\r?\n', ''

# 循环里去掉折叠监视
$c = $c -replace '\r?\n  f3TickFoldCloseWatch\(\);', ''

# 危险拦翻开：无 TOF 时恒 false（若仍有定义则保留 #if 内实现）
$stub = @'

#if !F3_HEIGHT_ENABLE
static bool f3FlapOpenDangerBlocked() { return false; }
void f3SensorInit() { f3SensorOk = 0; }
void f3SensorServiceTick() {}
void f3SensorRecoverTick() {}
bool f3DangerLedActive() { return false; }
bool f3HeightMonitorActive() { return false; }
static void f3TickFoldCloseWatch() {}
static bool f3HeightCfgModeActive() { return false; }
void f3LoadHeightFromEeprom() { f3DangerMm = 0; f3BaseMm = 0; f3HfCfg = 0; }
#endif

'@

# 插到 F3_PIN_LED_GREEN 常量后附近
if ($c -notmatch 'F3_IMU_ENABLE') {
  # already may have from header
}
if ($c -notmatch 'static bool f3FlapOpenDangerBlocked\(\) \{ return false; \}') {
  $c = $c -replace '(const uint8_t F3_PIN_LED_GREEN = 10;)', "`$1`r`n$stub"
}

# D12 灯：改为调用 f3WorkLightApply（在 IMU 文件实现）
$c = $c -replace '// D12 工作灯：折叠\(item=0\)亮，翻开\(item=1\)灭，高电平导通\r?\n  digitalWrite\(12, \(item == 0\) \? HIGH : LOW\);', "// D12 照明灯：见 f3_mpu_park.ino（可小程序手动开关）`r`n  f3WorkLightApply();"
$c = $c -replace 'digitalWrite\(12, \(item == 0\) \? HIGH : LOW\);', 'f3WorkLightApply();'

# setup 里注释
$c = $c -replace 'digitalWrite\(12, LOW\); // D12 工作灯：高电平亮（AO3402 低端）', 'digitalWrite(12, LOW); // D12 照明灯：高电平亮（AO3402 低端）'

# setup 末尾加 IMU init 调用点（在 f3SensorInit 后）
$c = $c -replace 'f3SensorInit\(\);', "f3SensorInit();`r`n#if F3_IMU_ENABLE`r`n  f3ImuInit();`r`n#endif"

# loop 主路径加 IMU tick（在 f3SensorServiceTick 后）
$c = $c -replace 'f3SensorRecoverTick\(\);\r?\n  f3SensorServiceTick\(\);', "f3SensorRecoverTick();`r`n  f3SensorServiceTick();`r`n#if F3_IMU_ENABLE`r`n  f3ImuServiceTick();`r`n#endif"

# 前向声明
$fwd = @'
#if F3_IMU_ENABLE
void f3ImuInit();
void f3ImuServiceTick();
void f3WorkLightApply();
uint8_t f3ImuTryHandleBleCmd(char *cmd);
#else
static void f3WorkLightApply() { digitalWrite(12, (item == 0) ? HIGH : LOW); }
#endif

'@
if ($c -notmatch 'void f3ImuInit\(') {
  $c = $c -replace '(#include <Wire\.h>)', "`$1`r`n$fwd"
}

[System.IO.File]::WriteAllText($path, $c, [System.Text.UTF8Encoding]::new($false))
Write-Host "Patched $path len=$($c.Length)"
