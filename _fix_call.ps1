$path = 'c:\Users\32529\Desktop\zj\miniprogram\package-extra\pages\troubleshoot\troubleshoot.js'
$utf8 = New-Object System.Text.UTF8Encoding $false
$t = [System.IO.File]::ReadAllText($path)
$from = 'stepBody: this._resolveStepBody(node),'
$to = 'stepBody: this._resolveStepBody(node, isResult),'
if ($t.Contains($from)) {
  $t2 = $t.Replace($from, $to)
  [System.IO.File]::WriteAllText($path, $t2, $utf8)
  Write-Output 'patched call'
} else {
  Write-Output 'already patched or missing'
  Write-Output ('has=' + $t.Contains('stepBody: this._resolveStepBody(node, isResult),'))
}
