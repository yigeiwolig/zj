Add-Type -AssemblyName System.Drawing
# 3x 导出，避免小程序 420rpx 在 Retina 屏上放大发糊
$s = 3.0
$w = [int](200 * $s)
$h = [int](140 * $s)
$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$black = [System.Drawing.Color]::FromArgb(255, 28, 28, 30)
$strokeW = [single](3 * $s)
$letterOutlineW = [single](3 * $s)
$letterSize = [single](14 * $s)
function P([double]$x, [double]$y) { [System.Drawing.PointF]::new([single]($x * $s), [single]($y * $s)) }
function BodyPath() {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.StartFigure()
  $p.AddLine((P 15 30), (P 190 30))
  $p.AddBezier((P 190 30), (P 195 30), (P 195 35), (P 195 35))
  $p.AddLine((P 195 35), (P 195 48))
  $p.AddBezier((P 195 48), (P 195 53), (P 190 53), (P 190 53))
  $p.AddLine((P 190 53), (P 121 53))
  $p.AddLine((P 121 53), (P 121 69))
  $p.AddLine((P 121 69), (P 122.5 69))
  $p.AddBezier((P 122.5 69), (P 127.5 69), (P 127.5 74), (P 127.5 74))
  $p.AddLine((P 127.5 74), (P 127.5 94))
  $p.AddBezier((P 127.5 94), (P 127.5 99), (P 122.5 99), (P 122.5 99))
  $p.AddLine((P 122.5 99), (P 82.5 99))
  $p.AddBezier((P 82.5 99), (P 77.5 99), (P 77.5 94), (P 77.5 94))
  $p.AddLine((P 77.5 94), (P 77.5 74))
  $p.AddBezier((P 77.5 74), (P 77.5 69), (P 82.5 69), (P 82.5 69))
  $p.AddLine((P 82.5 69), (P 84 69))
  $p.AddLine((P 84 69), (P 84 53))
  $p.AddLine((P 84 53), (P 15 53))
  $p.AddBezier((P 15 53), (P 10 53), (P 10 48), (P 10 48))
  $p.AddLine((P 10 48), (P 10 35))
  $p.AddBezier((P 10 35), (P 10 30), (P 15 30), (P 15 30))
  $p.CloseFigure()
  $p
}
function LeftPath() {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.StartFigure()
  $p.AddLine((P 102.5 30), (P 15 30))
  $p.AddBezier((P 15 30), (P 10 30), (P 10 35), (P 10 35))
  $p.AddLine((P 10 35), (P 10 48))
  $p.AddBezier((P 10 48), (P 10 53), (P 15 53), (P 15 53))
  $p.AddLine((P 15 53), (P 84 53))
  $p.AddLine((P 84 53), (P 84 69))
  $p.AddLine((P 84 69), (P 82.5 69))
  $p.AddBezier((P 82.5 69), (P 77.5 69), (P 77.5 74), (P 77.5 74))
  $p.AddLine((P 77.5 74), (P 77.5 94))
  $p.AddBezier((P 77.5 94), (P 77.5 99), (P 82.5 99), (P 82.5 99))
  $p.AddLine((P 82.5 99), (P 102.5 99))
  $p.AddLine((P 102.5 99), (P 102.5 30))
  $p.CloseFigure()
  $p
}
function FillRoundRect($brush, $x, $y, $rw, $rh, $r) {
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
  $gp.AddArc($x + $rw - $r * 2, $y, $r * 2, $r * 2, 270, 90)
  $gp.AddArc($x + $rw - $r * 2, $y + $rh - $r * 2, $r * 2, $r * 2, 0, 90)
  $gp.AddArc($x, $y + $rh - $r * 2, $r * 2, $r * 2, 90, 90)
  $gp.CloseFigure()
  $g.FillPath($brush, $gp)
}
$body = BodyPath
$g.FillPath((New-Object System.Drawing.SolidBrush $black), $body)
$g.FillPath([System.Drawing.Brushes]::White, (LeftPath))
$penBody = New-Object System.Drawing.Pen $black, $strokeW
$penBody.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$g.DrawPath($penBody, $body)
FillRoundRect (New-Object System.Drawing.SolidBrush $black) (36 * $s) (37 * $s) (26 * $s) (8 * $s) (5 * $s)
FillRoundRect ([System.Drawing.Brushes]::White) (145 * $s) (38 * $s) (25 * $s) (8 * $s) (4 * $s)
$family = [System.Drawing.FontFamily]::GenericSansSerif
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
function LetterPath($ch, $cy) {
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddString($ch, $family, [int][System.Drawing.FontStyle]::Bold, $letterSize, (P 102.5 $cy), $sf)
  $gp
}
function DrawLeftLetter($ch, $cy) {
  $g.SetClip([System.Drawing.Rectangle]::new(0, 0, [int](102.5 * $s), $h))
  $g.FillPath((New-Object System.Drawing.SolidBrush $black), (LetterPath $ch $cy))
  $g.ResetClip()
}
function DrawRightLetter($ch, $cy) {
  $g.SetClip([System.Drawing.Rectangle]::new([int](102.5 * $s), 0, [int](97.5 * $s), $h))
  $gp = LetterPath $ch $cy
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, $letterOutlineW)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($pen, $gp)
  $g.FillPath((New-Object System.Drawing.SolidBrush $black), $gp)
  $g.ResetClip()
}
DrawLeftLetter 'M' 72
DrawLeftLetter 'T' 88
DrawRightLetter 'M' 72
DrawRightLetter 'T' 88
$out = 'c:\Users\32529\Desktop\zj\miniprogram\images\mt-f2-ultra.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
