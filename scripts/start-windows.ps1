param(
  [int]$Port = 3000,
  [switch]$Install
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is not installed. Install Node.js 20 LTS first."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is not installed. Reinstall Node.js 20 LTS with npm enabled."
}

$nodeVersion = (node -v).TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 20) {
  throw "Node.js 20 LTS or newer is required. Current version: v$nodeVersion"
}

if ($Install -or -not (Test-Path "node_modules")) {
  if (Test-Path "package-lock.json") {
    npm ci
  } else {
    npm install
  }
}

if (-not (Test-Path "logs")) {
  New-Item -ItemType Directory -Path "logs" | Out-Null
}

$env:PORT = "$Port"
Write-Host "Starting XSS defense system at http://localhost:$Port"
Write-Host "Admin login: http://localhost:$Port/admin/login"
Write-Host "Default admin account: admin / admin123"
node app.js
