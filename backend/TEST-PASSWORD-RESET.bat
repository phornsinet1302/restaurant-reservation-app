@echo off
REM This batch file runs the automated password reset test
REM Just double-click this file to run!

cd /d "%~dp0"

echo.
echo ╔═══════════════════════════════════════════╗
echo ║  🧪 PASSWORD RESET - AUTOMATED TEST       ║
echo ║  Double-click this file to run            ║
echo ╚═══════════════════════════════════════════╝
echo.

REM Kill existing Node processes
echo 📍 Killing existing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak

REM Run the Node test script
echo 📍 Starting automated test...
echo.
node run-password-reset-test.js

pause
