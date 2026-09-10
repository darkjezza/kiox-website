# Restarts the Astro Node website on the remote Windows host.
# Deployed next to package.json as remote-restart.ps1
param(
  [int]$ListenPort = 4321,
  [string]$Root = "."
)
$ErrorActionPreference = "Stop"
Set-Location $Root
if (-not (Test-Path "package.json")) { throw "Missing package.json" }
if (-not (Test-Path "dist/server/entry.mjs")) { throw "Missing dist/server/entry.mjs" }
New-Item -ItemType Directory -Force -Path "run" | Out-Null
$pidFile = "run/website.pid"
$log = "run/website.log"
$err = "run/website.err.log"
if (Test-Path $pidFile) {
  $old = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($old) { Stop-Process -Id ([int]$old) -Force -ErrorAction SilentlyContinue }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Write-Host "Installing production node_modules..."
npm ci --omit=dev
if ($LASTEXITCODE -ne 0) { npm install --omit=dev }
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
$env:HOST = "0.0.0.0"
$env:PORT = "$ListenPort"
$p = Start-Process -FilePath "node" -ArgumentList @("dist/server/entry.mjs") -WorkingDirectory (Get-Location) -RedirectStandardOutput $log -RedirectStandardError $err -PassThru
Set-Content -Path $pidFile -Value $p.Id -NoNewline
Write-Host "Website PID $($p.Id) on port $ListenPort"
