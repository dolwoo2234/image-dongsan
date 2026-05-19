# Dongsan Codex Harness

Dongsan is an Electron desktop app for scene TXT import, Danbooru-style tag drafting, NovelAI prompt assembly, image generation, metadata import, I2I, inpaint, and gallery review.

## Commands

Run these from the repository root:

```powershell
.\scripts\bootstrap.cmd
.\scripts\check.cmd
.\scripts\test.cmd
.\scripts\eval.cmd
.\scripts\doctor.cmd
```

Git Bash users can run the extensionless equivalents:

```sh
scripts/bootstrap
scripts/check
scripts/test
scripts/eval
scripts/doctor
```

- `scripts/bootstrap`: install npm dependencies when needed.
- `scripts/check`: run JavaScript syntax checks and the core test suite.
- `scripts/test`: run the focused test suite.
- `scripts/eval`: run environment discovery, bootstrap, and full checks.
- `scripts/doctor`: report repository and local tool readiness.
- `scripts/hooks`: install optional local Git hooks through `pre-commit` when available.

## Repository Layout

- `index.js`: Electron main process, persistence, NovelAI IPC, update flow, PNG metadata parsing.
- `renderer.js`: UI state, scene editor, tag chips, gallery, inpaint, I2I, drag/drop imports.
- `core.js`: pure project normalization, draft tag rules, generation record helpers, tests target this first.
- `preload.js`: safe renderer API bridge.
- `index.html` and `styles.css`: app shell and UI styling.
- `tests/`: Node-based core tests.
- `docs/txt/`: scene-description examples used to refine drafting rules.
- `docs/beginner-guide/`: user-facing guide images and docs.
- `run.bat` and `install-dongsan.bat`: Windows user entrypoints.
- `harness.yml`: machine-readable command and workflow registry.

## Operating Principles

- Prefer the existing Electron/CommonJS/plain CSS structure. Do not introduce a framework unless the task clearly requires it.
- Keep generated image data, secrets, imports, and user project state out of Git.
- For NovelAI behavior, preserve user-edited prompts and avoid silently overwriting dirty form state.
- For prompt/tag work, update both renderer preview logic and main-process request assembly when behavior affects generation.
- Treat PNG metadata import carefully: seed should stay random unless the user explicitly imports it.
- Do not push unless the user explicitly asks for a push.

## Task Loop

1. Inspect relevant files and current Git status.
2. Make the smallest change that fits the app's current workflow.
3. Run `scripts/check` or the narrowest useful command.
4. Report changed files, verification, and any remaining risk.

## Completion Criteria

Before finishing a task:

1. Confirm the requested behavior is implemented.
2. Run syntax checks for touched JavaScript files.
3. Run `npm test` or `scripts/check` when core behavior changes.
4. Say clearly when tests or live NovelAI verification could not be run.
