# PASSWORD RESET AUTOMATED TEST
# Run this in PowerShell: .\test-password-reset.ps1

Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🧪 PASSWORD RESET - AUTOMATED TEST      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill Node processes
Write-Host "📍 Step 1: Killing existing Node processes..." -ForegroundColor Yellow
Get-Process node* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "   ✅ Old processes killed" -ForegroundColor Green

# Step 2: Start backend
Write-Host ""
Write-Host "📍 Step 2: Starting backend server..." -ForegroundColor Yellow
$backendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$process = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $backendPath -PassThru -NoNewWindow
Write-Host "   ✅ Backend process started (PID: $($process.Id))" -ForegroundColor Green
Write-Host "   ⏳ Waiting 5 seconds for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 3: Run the test script
Write-Host ""
Write-Host "📍 Step 3: Running password reset test..." -ForegroundColor Yellow
node "$backendPath\run-password-reset-test.js"

# Cleanup
Write-Host ""
Write-Host "📍 Cleanup: Stopping backend process..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ Backend stopped" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Test complete!" -ForegroundColor Green
