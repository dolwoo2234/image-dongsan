# Decisions

## 2026-05-19: Establish Repository-Level Codex Harness

- Added `AGENTS.md` as the shared project instruction file for Codex-compatible agents.
- Added `harness.yml` as a machine-readable registry for commands, documents, and task-loop stages.
- Added Windows `.cmd` script entrypoints because this project is developed primarily on Windows.
- Kept Git Bash-compatible extensionless scripts so the upstream Harness-for-codex structure remains recognizable.

## 2026-05-19: Keep Local Claude Harness Separate

- Existing `.claude/` agents and `CLAUDE.md` remain local because `.gitignore` excludes them.
- The distributable harness lives in `AGENTS.md`, `harness.yml`, `scripts/`, `docs/`, and `tasks/`.
- This avoids publishing old project-planning workspace files while still giving future agents a stable workflow.

## 2026-05-19: Dongsan Verification Gate

- The default check gate runs syntax checks for `index.js`, `renderer.js`, `preload.js`, and `core.js`.
- The gate also runs `npm test`, which currently covers core parsing, tag drafting, and project normalization behavior.
- Live NovelAI generation remains a manual verification step because it requires user credentials and network/API availability.
