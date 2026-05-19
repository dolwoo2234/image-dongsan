$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

& (Join-Path $PSScriptRoot "doctor.ps1")
& (Join-Path $PSScriptRoot "bootstrap.ps1")
& (Join-Path $PSScriptRoot "check.ps1")
