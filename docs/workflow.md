# Workflow

## Starting Work

Run:

```powershell
.\scripts\doctor.cmd
.\scripts\bootstrap.cmd
```

Then inspect the relevant files and current Git status.

## During Work

- Keep changes scoped to the requested behavior.
- Prefer existing app patterns over new abstractions.
- For prompt generation changes, check both `renderer.js` previews and `index.js` NovelAI payload construction.
- For tag rule changes, add or update core tests when the rule is general enough to preserve.
- For UI changes, keep controls compact and readable in the existing four-column app layout.
- Record durable decisions in `docs/decisions.md`.

## Finishing Work

Run:

```powershell
.\scripts\check.cmd
```

Use `.\scripts\eval.cmd` before a larger handoff or release.

If a command cannot run, report why in the handoff.

## Release Work

When the user asks to version and push:

1. Update `package.json` and `package-lock.json`.
2. Add a README update note in newest-first order.
3. Run `.\scripts\check.cmd`.
4. Commit with a release message.
5. Tag the version when appropriate.
6. Push only after explicit user approval.
