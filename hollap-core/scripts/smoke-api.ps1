param(
  [string]$ApiBase = "http://localhost:4001"
)

$ErrorActionPreference = "Stop"

function Get-HttpErrorMessage {
  param([System.Management.Automation.ErrorRecord]$ErrorRecord)

  if ($ErrorRecord.ErrorDetails -and $ErrorRecord.ErrorDetails.Message) {
    return $ErrorRecord.ErrorDetails.Message
  }

  return $ErrorRecord.Exception.Message
}

function Post-Json {
  param(
    [string]$Url,
    [hashtable]$Body,
    [string]$Token
  )

  $headers = @{
    "Content-Type" = "application/json"
  }

  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  return Invoke-RestMethod -Uri $Url -Method Post -Headers $headers -Body ($Body | ConvertTo-Json -Depth 6)
}

function Put-Json {
  param(
    [string]$Url,
    [hashtable]$Body,
    [string]$Token
  )

  $headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $Token"
  }

  return Invoke-RestMethod -Uri $Url -Method Put -Headers $headers -Body ($Body | ConvertTo-Json -Depth 6)
}

function Get-Json {
  param(
    [string]$Url,
    [string]$Token
  )

  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  return Invoke-RestMethod -Uri $Url -Method Get -Headers $headers
}

try {
  $stamp = Get-Date -Format "yyyyMMddHHmmss"

  $teacherEmail = "smoke.teacher.$stamp@hollap.com"
  $studentEmail = "smoke.student.$stamp@hollap.com"
  $password = "Hollap123!"

  Write-Host "1) Health check..."
  $health = Get-Json -Url "$ApiBase/api/health"
  Write-Host "   API status: $($health.status)"

  Write-Host "2) Register teacher..."
  $teacherTokens = Post-Json -Url "$ApiBase/api/auth/register" -Body @{
    email = $teacherEmail
    password = $password
    name = "Smoke Teacher"
    role = "TEACHER"
  }

  Write-Host "3) Register student..."
  $studentTokens = Post-Json -Url "$ApiBase/api/auth/register" -Body @{
    email = $studentEmail
    password = $password
    name = "Smoke Student"
    role = "STUDENT"
  }

  Write-Host "4) Create teacher profile..."
  Put-Json -Url "$ApiBase/api/teachers/me/profile" -Token $teacherTokens.accessToken -Body @{
    bio = "Smoke test teacher profile for Hollap Core."
    category = "Borsa & Finans"
    priceMonthly = 299
    assistantIds = @()
  } | Out-Null

  $teacherMe = Get-Json -Url "$ApiBase/api/auth/me" -Token $teacherTokens.accessToken

  Write-Host "5) Student checkout + mock confirm..."
  $checkout = Post-Json -Url "$ApiBase/api/subscriptions/checkout" -Token $studentTokens.accessToken -Body @{
    teacherUserId = $teacherMe.id
  }

  Post-Json -Url "$ApiBase/api/subscriptions/mock/confirm" -Token $studentTokens.accessToken -Body @{
    subscriptionId = $checkout.subscriptionId
  } | Out-Null

  Write-Host "6) Teacher creates stage room..."
  $room = Post-Json -Url "$ApiBase/api/stage/rooms" -Token $teacherTokens.accessToken -Body @{
    title = "Smoke Room $stamp"
    description = "Automated smoke test room."
  }

  Write-Host "7) Student can list teacher rooms..."
  $rooms = Get-Json -Url "$ApiBase/api/stage/teachers/$($teacherMe.id)/rooms" -Token $studentTokens.accessToken

  Write-Host ""
  Write-Host "Smoke test completed."
  Write-Host "Teacher: $teacherEmail"
  Write-Host "Student: $studentEmail"
  Write-Host "Created Room ID: $($room.id)"
  Write-Host "Visible Active Room Count For Student: $($rooms.Count)"
} catch {
  $message = Get-HttpErrorMessage -ErrorRecord $_
  Write-Host ""
  Write-Host "Smoke test failed:"
  Write-Host $message

  if ($message -like "*Database unavailable*" -or $message -like "*Internal Server Error*") {
    Write-Host ""
    Write-Host "Hint: Start PostgreSQL/Redis/MinIO and run demo setup:"
    Write-Host "  npm run infra:up"
    Write-Host "  npm run demo:setup"
  }

  exit 1
}
