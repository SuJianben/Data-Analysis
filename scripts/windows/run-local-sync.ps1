param(
  [ValidateSet("events", "full")]
  [string]$Mode = "events",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
)

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "start-local-server.ps1") -ProjectRoot $ProjectRoot

$logsDirectory = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Path $logsDirectory -Force | Out-Null
$logPath = Join-Path $logsDirectory "local-sync-$Mode.log"
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$npmScript = if ($Mode -eq "full") { "sync:local" } else { "sync:events" }

Push-Location $ProjectRoot
try {
  & $npmCommand run $npmScript *>> $logPath
  if ($LASTEXITCODE -ne 0) { throw "npm run $npmScript 执行失败，退出码 $LASTEXITCODE。" }
} finally {
  Pop-Location
}
