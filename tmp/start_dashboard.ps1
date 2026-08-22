$ErrorActionPreference = "Stop"
$root = Join-Path $env:USERPROFILE "Desktop\工作\实习面试\Demo\ai-job-search"
$nodePath = "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node).Source }
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $nodePath
$startInfo.Arguments = "dashboard\server.js"
$startInfo.WorkingDirectory = $root
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$proc = [System.Diagnostics.Process]::Start($startInfo)
Start-Sleep -Milliseconds 900
$listener = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:4173/api/data" -UseBasicParsing -TimeoutSec 3
  Write-Output "Started pid=$($proc.Id), HTTP $($r.StatusCode)"
} else {
  $proc.Refresh()
  if ($proc.HasExited) { Write-Output "Process exited with code $($proc.ExitCode)" }
  else { Write-Output "Started pid=$($proc.Id) but port not listening yet" }
}
