# Get Authentication Token Script
# This script will help you get your auth token for API testing

Write-Host "=== PoDM Authentication Token Retriever ===" -ForegroundColor Cyan
Write-Host ""

# Prompt for credentials
$email = Read-Host "Enter your email"
$password = Read-Host "Enter your password" -AsSecureString

# Convert secure string to plain text for API call
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$body = @{
    email    = $email
    password = $plainPassword
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "Logging in..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://podm.onrender.com/api/v1/auth/login" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "User Info:" -ForegroundColor Cyan
    Write-Host "  Name: $($response.user.profile.name)" -ForegroundColor White
    Write-Host "  Email: $($response.user.email)" -ForegroundColor White
    Write-Host "  Role: $($response.user.role)" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "YOUR TOKEN (copy everything below):" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host $response.token -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to copy to clipboard
    try {
        $response.token | Set-Clipboard
        Write-Host "✅ Token copied to clipboard!" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Could not copy to clipboard automatically" -ForegroundColor Yellow
        Write-Host "   Please manually copy the token above" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Copy the token above (the long string)" -ForegroundColor White
    Write-Host "2. Open test-notifications.ps1" -ForegroundColor White
    Write-Host "3. Paste it where it says: " -NoNewline -ForegroundColor White
    Write-Host '$token = ""' -ForegroundColor Yellow
    Write-Host "4. Run: .\test-notifications.ps1" -ForegroundColor White
    
}
catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
        catch {
            Write-Host "Could not read error response" -ForegroundColor Red
        }
    }
}

# Clear the plain password from memory
$plainPassword = $null
