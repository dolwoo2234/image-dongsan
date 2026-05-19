$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

if (-not (Get-Command pre-commit -ErrorAction SilentlyContinue)) {
  Write-Host "pre-commit is not installed. Install it, then run scripts/hooks again."
  exit 0
}

pre-commit install --hook-type pre-commit --hook-type pre-push
