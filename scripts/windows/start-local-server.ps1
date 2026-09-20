param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
)

$ErrorActionPreference = "Stop"
$healthUrl = "http://localhost:3000/api/health"

try {
  $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
  if ($response.StatusCode -eq 200) { exit 0 }
} catch {
  # 服务未启动时继续执行启动流程。
}

$logsDirectory = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Path $logsDirectory -Force | Out-Null
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source

Start-Process `
  -FilePath $npmCommand `
  -ArgumentList @("run", "start") `
  -WorkingDirectory $ProjectRoot `
  -RedirectStandardOutput (Join-Path $logsDirectory "local-server.stdout.log") `
  -RedirectStandardError (Join-Path $logsDirectory "local-server.stderr.log") `
  -WindowStyle Hidden

for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) { exit 0 }
  } catch {
    # 启动中的短暂失败属于正常状态。
  }
}

throw "本地数据服务未能在 20 秒内启动。"
