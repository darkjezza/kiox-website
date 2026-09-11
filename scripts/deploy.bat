@echo off
cd /d "%~dp0.."
call npm run deploy
if errorlevel 1 (
  echo Deploy failed.
  exit /b 1
)
