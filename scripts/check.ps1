$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

node --check index.js
node --check renderer.js
node --check preload.js
node --check core.js
npm test
