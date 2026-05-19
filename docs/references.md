# References

- Upstream harness pattern: https://github.com/ganimjeong/Harness-for-codex
- App repository: https://github.com/dolwoo2234/image-dongsan
- Main app entrypoint: `index.js`
- Renderer/UI state: `renderer.js`
- Pure core logic and tests: `core.js`, `tests/core.test.js`
- User install entrypoint: `install-dongsan.bat`
- User run entrypoint: `run.bat`

## Project-Specific Notes

- NovelAI API keys are stored locally through Electron user data and must never be committed.
- Generated images, imports, and project state are local runtime data.
- PNG metadata import should default to random seed unless the user chooses to import seed.
- Tag target assignments affect both the editor preview and the NovelAI v4 character caption payload.
