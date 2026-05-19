$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

Write-Host "Repository"
Write-Host " root: $(Get-Location)"

try {
  git rev-parse --is-inside-work-tree *> $null
  Write-Host " git: yes"
  Write-Host " branch: $(git branch --show-current 2>$null)"
  Write-Host " status:"
  git status --short
} catch {
  Write-Host " git: no"
}

Write-Host ""
Write-Host "Harness"
@(
  "AGENTS.md",
  "harness.yml",
  "docs/workflow.md",
  "docs/decisions.md",
  "docs/references.md",
  "tasks/TEMPLATE.md",
  "scripts/bootstrap.cmd",
  "scripts/check.cmd",
  "scripts/test.cmd",
  "scripts/eval.cmd",
  "scripts/doctor.cmd",
  "scripts/hooks.cmd"
) | ForEach-Object {
  if (Test-Path $_) {
    Write-Host " ok: $_"
  } else {
    Write-Host " missing: $_"
  }
}

Write-Host ""
Write-Host "Tools"
@("rg", "git", "node", "npm", "powershell", "bash", "pre-commit") | ForEach-Object {
  if (Get-Command $_ -ErrorAction SilentlyContinue) {
    Write-Host " ok: $_"
  } else {
    Write-Host " missing: $_"
  }
}
