# Dongsan

Dongsan is an Electron desktop workbench for importing scene-description TXT files, drafting Danbooru-style tags, editing NovelAI prompts, generating images, and reviewing scene images.

## Install First

처음 설치하는 사람은 Git 명령어를 직접 입력하지 않아도 됩니다.

1. `install-dongsan.bat` 파일을 원하는 설치 폴더에 둡니다.
2. `install-dongsan.bat`을 더블클릭합니다.
3. Git for Windows나 Node.js LTS가 없으면 `winget`으로 자동 설치를 먼저 시도합니다.
4. 자동 설치가 안 되는 PC에서는 설치 페이지가 자동으로 열립니다.
5. Git/Node 설치가 끝났는데 앱이 바로 이어서 실행되지 않으면 `install-dongsan.bat`을 다시 더블클릭합니다.

배치파일은 아래 명령을 자동으로 순서대로 실행합니다.

```bash
git clone https://github.com/dolwoo2234/image-dongsan.git
cd image-dongsan
npm install
npm start
```

이미 `image-dongsan` 폴더가 있으면 먼저 `git pull --ff-only`로 최신 버전을 받은 뒤 앱을 실행합니다.

설치가 끝난 뒤에는 `image-dongsan` 폴더 안의 `run.bat`을 더블클릭해서 실행할 수 있습니다.

### Manual Install

직접 명령어를 입력할 수 있는 사용자는 아래 방식으로 설치해도 됩니다.

```bash
git clone https://github.com/dolwoo2234/image-dongsan.git
cd image-dongsan
npm install
npm start
```

## Preview

![Dongsan app UI](docs/beginner-guide/view.png)

## Beginner Guide

처음 사용하는 사람은 아래 순서대로 따라 하면 됩니다.

![Dongsan workflow overview](docs/beginner-guide/01-overview.svg)

![Import TXT and select a scene](docs/beginner-guide/02-import-and-select.svg)

#txt 파일 예시

<img width="428" height="754" alt="스크린샷 2026-05-18 160631" src="https://github.com/user-attachments/assets/a56ab08a-49ae-477e-b8da-cb3d665db576" />

#00 숫자
장면묘사 방식으로 메모장에 저장하여 불러오기 하면 됩니다.

![Generate tags and insert character prompts](docs/beginner-guide/03-tags-and-character.svg)

![Generate the first image](docs/beginner-guide/04-generate-first-image.svg)

![Edit prompt and regenerate](docs/beginner-guide/05-edit-and-regenerate.svg)

![Repeat workflow tips](docs/beginner-guide/06-repeat-workflow.svg)

More guide files are available in [docs/beginner-guide](docs/beginner-guide/README.md).

On Windows, users can also double-click `run.bat`. It checks for Node.js/npm, installs dependencies when `node_modules` is missing, and then starts Electron.

NovelAI API keys are saved locally on each user's computer through Electron user data storage. They are not stored in this repository.

## Codex Harness

This repository includes a lightweight Codex harness adapted from [ganimjeong/Harness-for-codex](https://github.com/ganimjeong/Harness-for-codex).

For Windows development, use:

```powershell
.\scripts\doctor.cmd
.\scripts\bootstrap.cmd
.\scripts\check.cmd
```

The canonical workflow and command registry live in `AGENTS.md`, `harness.yml`, `docs/workflow.md`, and `docs/decisions.md`.

## Updates

Use GitHub Releases for published versions. The app can check the latest release from GitHub and, when a newer version exists, update itself with:

```bash
git pull --ff-only
```

After a successful update, Dongsan restarts automatically.

### v1.0.15

- 와일드카드 태그 입력 기능을 추가했습니다. `||선택지1|선택지2||` 형식의 랜덤 선택 태그를 만들고, 생성된 태그칩에서 장면/C1/C2/C1&C2 적용 위치를 바꿀 수 있습니다.
- 와일드카드 선택지 추가/삭제 UI를 정리했습니다. 잘못 추가한 선택지 칸은 바로 삭제할 수 있고, 입력 단계의 대상 드롭다운은 제거했습니다.
- I2I와 인페인트도 연속 실행 횟수를 따르도록 변경했습니다. 일반 생성처럼 0.5초 간격으로 순차 생성하고, 생성 중단 버튼으로 멈출 수 있습니다.
- 메타데이터가 없는 PNG를 드롭해도 I2I 또는 인페인트 소스 이미지로 가져올 수 있게 했습니다. 프롬프트 가져오기는 메타데이터가 있을 때만 활성화됩니다.
- PNG 메타데이터 가져오기에서 Seed는 기본적으로 가져오지 않고, 체크박스를 켰을 때만 가져오도록 정리했습니다.
- 갤러리 이미지를 앱 안에서 드롭하면 I2I, 인페인트, 프롬프트 가져오기 선택 창이 열리도록 했습니다.
- 처음 사용자 가이드 흐름을 보완했습니다. API 키 등록 단계가 생성 전에 안내되고, 갤러리 단계 팝업 위치가 화면 하단 중앙으로 조정되었습니다.
- 태그 드래프트 규칙을 확장했습니다. 자취방/술자리/기승위/측위/셀카/스마타/좌위/69 자세 등 최근 작품 TXT에서 일반화 가능한 태그 규칙을 추가했습니다.
- 인페인트 브러시 크기 범위를 조정했습니다. 최소값은 너무 작지 않게 올리고, 최대값은 기존보다 2배 넓혔습니다.

### v1.0.14

- Added single-instance startup handling so a second launch focuses the existing Dongsan window instead of opening another process that can fight over Chromium cache files.

### v1.0.13

- Added a first-run beginner guide that highlights the actual app buttons and workflow steps.
- Added C1&C2 tag targeting, optional seed import for PNG metadata, and refined 69-position tag routing.
- Added a Codex harness structure and helper scripts for local development checks.

### v1.0.12

- Added PNG drop choices: open as I2I, open as inpaint, or import prompt only.
- Added Image2Image generation with Strength and Noise controls.
- Added a green 2.2-second highlight for newly imported prompt fields and newly added tag chips.
- Imported PNG files can now be copied into the current scene gallery as source images.

### v1.0.11

- Added tag target assignment for draft tags: scene, Character 1, Character 2, and later character slots.
- Routed scene/camera tags to the NovelAI base caption and character/action tags to the selected character caption.
- Added more general Danbooru drafting rules from the latest scene-description sets.
- Stopped generating default negative draft tags automatically.

### v1.0.10

- Added more general Danbooru drafting rules from the Heart Delivery Service scene set.
- Removed automatic `explicit` drafting and refined pose/body/action tags.
- Fixed character preset insertion so multi-line presets stay in one character slot.

### v1.0.6

- Added `install-dongsan.bat` for one-click Windows clone, install, and start.
- Moved install instructions near the top of the README for first-time users.

### v1.0.3

- Made `run.bat` install dependencies automatically when Electron is missing.
- Added clearer Windows run instructions for cloned/downloaded copies.

### v1.0.2

- Reworked the main layout into scene list, global/character presets, editor, and settings/gallery columns.
- Added character position controls for NovelAI character prompts.
- Made character prompt carry-over apply once and then turn off automatically when changing scenes.
- Added a scene generation cancel button.
- Changed NovelAI 429 retry handling to retry 8 times at 1-second intervals.
- Expanded Danbooru tag drafting for the NSFW Rena Sachon scene set.
