@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-scp.ps1" -Live %*
if errorlevel 1 (
  echo Deploy failed.
  exit /b 1
)
