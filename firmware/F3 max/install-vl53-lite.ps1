# 将 F3 MAX 精简版 VL53L0X 驱动覆盖到 Mixly 的 arduino-cli 库目录
$src = $PSScriptRoot
if (-not $src) { $src = "c:\Users\32529\Desktop\zj\firmware\F3 max" }
$dst = "C:\Users\32529\Desktop\MILXY\arduino-cli\libraries\VL53L0X"
if (-not (Test-Path $dst)) {
  Write-Error "未找到 VL53L0X 库目录: $dst"
  exit 1
}
Copy-Item (Join-Path $src "VL53L0X.h") (Join-Path $dst "VL53L0X.h") -Force
Copy-Item (Join-Path $src "VL53L0X.cpp") (Join-Path $dst "VL53L0X.cpp") -Force
Write-Host "已覆盖精简版 VL53L0X -> $dst"
Write-Host "请删除 mixlyBuild 缓存后重新编译"
