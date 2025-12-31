# Debug Login Script - Shows full API response

Write-Host "=== Debug Login Script ===" -ForegroundColor Cyan
Write-Host ""

$email = Read-Host "Enter your email"
$password = Read-Host "Enter your password" -AsSecureString

$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$body = @{
    email    = $email
    password = $plainPassword
} | ConvertTo-Json

Write-Host ""
Write-Host "Logging in..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://podm.onrender.com/api/v1/auth/login" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json" } `
        -Body $body
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "FULL API RESPONSE:" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5
    Write-Host "========================================" -ForegroundColor Yellow
    
}
catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

$plainPassword = $null
