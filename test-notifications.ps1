# Quick Notification API Test Script for PowerShell
# 
# HOW TO GET YOUR TOKEN:
# 1. Run: .\get-token.ps1
# 2. Enter your email and password
# 3. Copy the token that appears (it's also copied to your clipboard)
# 4. Paste it below where it says "YOUR_TOKEN_HERE"

# STEP 1: Set your token here
$token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjlzMXFlS1Q5aUFlVTk4bTMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pnZGl3Zm12eHV3ZWRuZGdhbmplLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NDdkZWZhMS0wYTY0LTQwMDUtYWUwMy1iYzNiYzM4NzAwNGEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY3MTY1MzQwLCJpYXQiOjE3NjcxNjE3NDAsImVtYWlsIjoiZGFtb25AZW1haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImRhbW9uQGVtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijg0N2RlZmExLTBhNjQtNDAwNS1hZTAzLWJjM2JjMzg3MDA0YSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY3MTYxNzQwfV0sInNlc3Npb25faWQiOiI3ZDNlYzFmMy1iOWFkLTRjMmMtODFiMy03NmNlN2EyMzI3ZDkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.E2FMrkGijkdH_kk2oku57gM6QY8ysDtdIi4q8x6AAek"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

$baseUrl = "https://podm.onrender.com/api/v1"

Write-Host "Testing Notification API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Get Unread Count
Write-Host "1. Getting unread count..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/notifications/unread-count" -Method GET -Headers $headers
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Unread Count: $($response.data.count)" -ForegroundColor White
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Get All Notifications
Write-Host "2. Getting all notifications..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method GET -Headers $headers
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Total Notifications: $($response.data.Count)" -ForegroundColor White
    
    if ($response.data.Count -gt 0) {
        Write-Host "`nFirst Notification:" -ForegroundColor Cyan
        $response.data[0] | ConvertTo-Json -Depth 3
    }
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Subscribe to a creator as a fan"
Write-Host "2. Post new content as that creator"
Write-Host "3. Run this script again to see the notification"
