$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

if (Test-Path "package-lock.json") {
  npm ci
} elseif (Test-Path "package.json") {
  npm install
} else {
  Write-Host "No Node dependency manifest found. Nothing to bootstrap."
}
