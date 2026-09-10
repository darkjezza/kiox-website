<#
.SYNOPSIS
  Build the Astro Node website (+ Phaser client) and SCP dist to a Windows host, then restart Node.

.EXAMPLE
  .\scripts\deploy-scp.ps1
  .\scripts\deploy-scp.ps1 -SkipBuild
  .\scripts\deploy-scp.ps1 -SavePassword
  .\scripts\deploy-scp.ps1 -Live
#>
[CmdletBinding()]
param(
  [switch]$SkipBuild,
  [switch]$NoRestart,
  [switch]$Live,
  [switch]$SavePassword,
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $EnvFile) { $EnvFile = Join-Path $PSScriptRoot "deploy.env" }

function Load-DeployEnv([string]$path) {
  if (-not (Test-Path $path)) {
    throw "Missing $path - copy scripts\deploy.env.example to scripts\deploy.env and edit it."
  }
  $map = @{}
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim().Trim('"')
    $map[$k] = $v
  }
  return $map
}

function Require([hashtable]$m, [string]$k) {
  if (-not $m.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($m[$k])) {
    throw "deploy.env missing required key: $k"
  }
  return $m[$k]
}

function Save-DeployPassword([string]$path, [string]$password) {
  $quoted = '"' + ($password -replace '"', '\"') + '"'
  $lines = @(Get-Content -LiteralPath $path -ErrorAction Stop)
  $out = New-Object System.Collections.Generic.List[string]
  $wrote = $false
  foreach ($line in $lines) {
    if ($line -match '^\s*#?\s*DEPLOY_PASSWORD\s*=') {
      if (-not $wrote) {
        $out.Add("DEPLOY_PASSWORD=$quoted")
        $wrote = $true
      }
      continue
    }
    $out.Add($line)
  }
  if (-not $wrote) {
    $out.Add("")
    $out.Add("# SSH password for OpenSSH askpass (prefer DEPLOY_KEY when you can)")
    $out.Add("DEPLOY_PASSWORD=$quoted")
  }
  Set-Content -LiteralPath $path -Value $out -Encoding utf8
}

function Enable-DeployAskPass([string]$password) {
  $dir = Join-Path $env:TEMP "kiox-deploy-askpass-$PID"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $ps1 = Join-Path $dir "askpass.ps1"
  $cmd = Join-Path $dir "askpass.cmd"
  Set-Content -LiteralPath $ps1 -Value '[Console]::Out.Write($env:KIOX_DEPLOY_PASSWORD)' -Encoding ascii
  Set-Content -LiteralPath $cmd -Value "@echo off`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"$ps1`"" -Encoding ascii
  $env:KIOX_DEPLOY_PASSWORD = $password
  $env:SSH_ASKPASS = $cmd
  $env:SSH_ASKPASS_REQUIRE = "force"
  if (-not $env:DISPLAY) { $env:DISPLAY = "localhost:0" }
  return $dir
}

function Disable-DeployAskPass([string]$dir) {
  Remove-Item Env:KIOX_DEPLOY_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:SSH_ASKPASS -ErrorAction SilentlyContinue
  Remove-Item Env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
  if ($dir -and (Test-Path -LiteralPath $dir)) {
    Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function SshArgs([hashtable]$m) {
  $a = @("-p", (Require $m "DEPLOY_PORT"), "-o", "StrictHostKeyChecking=accept-new")
  if ($m.ContainsKey("DEPLOY_KEY") -and $m["DEPLOY_KEY"]) {
    $a += @("-i", $m["DEPLOY_KEY"])
  } elseif ($m.ContainsKey("DEPLOY_PASSWORD") -and $m["DEPLOY_PASSWORD"]) {
    $a += @("-o", "PreferredAuthentications=password", "-o", "PubkeyAuthentication=no")
  }
  return $a
}

function ScpArgs([hashtable]$m) {
  # scp uses -P for port; -p means "preserve times" and treats the next arg as a file.
  $a = @("-P", (Require $m "DEPLOY_PORT"), "-o", "StrictHostKeyChecking=accept-new")
  if ($m.ContainsKey("DEPLOY_KEY") -and $m["DEPLOY_KEY"]) {
    $a += @("-i", $m["DEPLOY_KEY"])
  } elseif ($m.ContainsKey("DEPLOY_PASSWORD") -and $m["DEPLOY_PASSWORD"]) {
    $a += @("-o", "PreferredAuthentications=password", "-o", "PubkeyAuthentication=no")
  }
  return $a
}

$envMap = Load-DeployEnv $EnvFile
$hostName = Require $envMap "DEPLOY_HOST"
$user = Require $envMap "DEPLOY_USER"

if ($SavePassword) {
  $secure = Read-Host "SSH password for ${user}@${hostName}" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  if ([string]::IsNullOrEmpty($plain)) { throw "Empty password" }
  Save-DeployPassword $EnvFile $plain
  $envMap["DEPLOY_PASSWORD"] = $plain
  Write-Host "Saved DEPLOY_PASSWORD to $EnvFile"
}

$remoteDir = (Require $envMap "WEBSITE_REMOTE_DIR").Replace("\", "/")
$listenPort = if ($envMap["WEBSITE_LISTEN_PORT"]) { $envMap["WEBSITE_LISTEN_PORT"] } else { "4321" }
$target = "${user}@${hostName}"
$sshBase = @(SshArgs $envMap)
$scpBase = @(ScpArgs $envMap)

$askPassDir = $null
if (-not ($envMap["DEPLOY_KEY"]) -and $envMap["DEPLOY_PASSWORD"]) {
  $askPassDir = Enable-DeployAskPass $envMap["DEPLOY_PASSWORD"]
}

try {
  if (-not $SkipBuild) {
    $label = if ($Live) { " (live)" } else { "" }
    Write-Host "==> Building website$label..."
    Push-Location $Root
    try {
      if ($Live) { & npm run build:live } else { & npm run build }
      if ($LASTEXITCODE -ne 0) { throw "website build failed ($LASTEXITCODE)" }
    } finally {
      Pop-Location
    }
  }

  $dist = Join-Path $Root "dist"
  $pkg = Join-Path $Root "package.json"
  $lock = Join-Path $Root "package-lock.json"
  $entry = Join-Path $dist "server\entry.mjs"
  if (-not (Test-Path $dist)) { throw "Missing dist/ - build first" }
  if (-not (Test-Path $entry)) { throw "Missing dist/server/entry.mjs - Node adapter build incomplete" }

  Write-Host "==> Ensuring remote dirs..."
  # Windows OpenSSH runs via cmd.exe, so `| Out-Null` is treated as a separate command.
  & ssh @sshBase $target "powershell -NoProfile -Command `"`$null = New-Item -ItemType Directory -Force -Path '$remoteDir'`""
  if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed" }

  Write-Host "==> Uploading package manifests..."
  & scp @scpBase $pkg "${target}:${remoteDir}/package.json"
  if ($LASTEXITCODE -ne 0) { throw "scp package.json failed" }
  if (Test-Path $lock) {
    & scp @scpBase $lock "${target}:${remoteDir}/package-lock.json"
    if ($LASTEXITCODE -ne 0) { throw "scp package-lock.json failed" }
  }

  Write-Host "==> Uploading dist/ (this can take a bit)..."
  & ssh @sshBase $target "powershell -NoProfile -Command `"if (Test-Path '$remoteDir/dist') { Remove-Item -Recurse -Force '$remoteDir/dist' }`""
  & scp @scpBase -r $dist "${target}:${remoteDir}/"
  if ($LASTEXITCODE -ne 0) { throw "scp dist failed" }

  $helper = Join-Path $PSScriptRoot "remote-restart.ps1"
  & scp @scpBase $helper "${target}:${remoteDir}/remote-restart.ps1"
  if ($LASTEXITCODE -ne 0) { throw "scp remote-restart.ps1 failed" }

  if (-not $NoRestart) {
    Write-Host "==> Installing deps + restarting website on remote..."
    $cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$remoteDir/remote-restart.ps1`" -ListenPort $listenPort -Root `"$remoteDir`""
    & ssh @sshBase $target $cmd
    if ($LASTEXITCODE -ne 0) { throw "remote website restart failed" }
  }

  Write-Host "Done. Website deployed to ${target}:$remoteDir"
} finally {
  Disable-DeployAskPass $askPassDir
}
