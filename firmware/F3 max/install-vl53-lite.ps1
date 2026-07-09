# F3 MAX: copy trimmed VL53L0X driver into Mixly arduino-cli libraries
$src = $PSScriptRoot
if (-not $src) { $src = "c:\Users\32529\Desktop\zj\firmware\F3 max" }
$dst = "C:\Users\32529\Desktop\MILXY\arduino-cli\libraries\VL53L0X"
if (-not (Test-Path $dst)) {
  Write-Error "VL53L0X library folder not found: $dst"
  exit 1
}
Copy-Item (Join-Path $src "VL53L0X.h") (Join-Path $dst "VL53L0X.h") -Force
Copy-Item (Join-Path $src "VL53L0X.cpp") (Join-Path $dst "VL53L0X.cpp") -Force
Write-Host "Installed lite VL53L0X -> $dst"
$o = "C:\Users\32529\Desktop\MILXY\mixlyBuild\libraries\VL53L0X\VL53L0X.cpp.o"
if (Test-Path $o) {
  Remove-Item $o -Force
  Write-Host "Removed cached: $o"
}
Write-Host "Re-upload from Mixly now."
