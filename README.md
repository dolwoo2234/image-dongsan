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

업데이트가 성공하면 Dongsan이 자동으로 재시작됩니다.

### v1.0.16

- 애널 관련 드래프트 규칙을 `anal penetration`, `anal sex`로 정리하고 두 태그가 기본적으로 C1&C2에 들어가도록 했습니다.
- `gag` 태그와 `side view` 태그 자동 생성을 제거했습니다. 사이드 구도는 `from side`로 정리됩니다.
- 입에 스타킹, 아헤가오, 바닥에 얼굴, 손 뒤로 잡힘, 애원 포즈, 소변, 셀프 핸드잡 등 최근 TXT에서 일반화 가능한 태그 규칙을 추가했습니다.
- 태그 초안 위에 인원 프리셋 패널을 추가했습니다. `1girl,1boy,couple`, `1girl,solo`, `1boy,solo`를 최종 프롬프트 앞에만 붙일 수 있습니다.
- 인원 프리셋은 전체 기본 프롬프트 입력칸을 직접 수정하지 않으며, 사용자가 추가한 프리셋은 추가/저장/삭제할 수 있습니다.
- 기본 인원 프리셋은 실수로 삭제되지 않도록 보호했습니다.

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

- 앱을 두 번 실행했을 때 새 프로세스를 또 열지 않고, 이미 열린 Dongsan 창을 앞으로 가져오도록 했습니다.
- 여러 창이 동시에 Chromium 캐시를 사용하면서 생기던 캐시 생성 오류 가능성을 줄였습니다.

### v1.0.13

- 처음 실행하는 사용자를 위한 초보자 가이드를 추가했습니다. 실제 앱 버튼과 작업 순서를 화면에서 강조해 안내합니다.
- 태그 적용 위치에 `C1&C2`를 추가해서 두 캐릭터에 동시에 들어가야 하는 태그를 지정할 수 있게 했습니다.
- PNG 메타데이터를 가져올 때 Seed를 가져올지 선택할 수 있게 했습니다.
- 69 자세 관련 태그가 장면/C1/C2에 더 적절히 배치되도록 태그 라우팅을 보완했습니다.
- Codex 하네스 구조와 로컬 개발 점검용 보조 스크립트를 추가했습니다.

### v1.0.12

- PNG 파일을 앱에 드롭했을 때 `I2I로 열기`, `인페인트로 열기`, `프롬프트만 가져오기` 중에서 선택할 수 있게 했습니다.
- Image2Image 기능을 추가하고 Strength, Noise 조절 슬라이더를 넣었습니다.
- 가져온 프롬프트 필드와 새로 추가된 태그칩이 2.2초 동안 초록색으로 강조되어 변경 위치를 쉽게 볼 수 있게 했습니다.
- 외부 PNG 파일을 현재 씬 갤러리에 소스 이미지로 복사해 사용할 수 있게 했습니다.

### v1.0.11

- 태그 초안에 적용 위치를 지정하는 기능을 추가했습니다. 장면, Character 1, Character 2, 이후 캐릭터 슬롯으로 나눠 넣을 수 있습니다.
- 카메라/구도/배경 태그는 NovelAI 기본 프롬프트로, 캐릭터 행동 태그는 선택한 캐릭터 프롬프트로 들어가도록 정리했습니다.
- 최신 장면 묘사 TXT에서 일반화 가능한 Danbooru 태그 드래프트 규칙을 추가했습니다.
- 네거티브 태그 초안이 자동으로 생성되지 않도록 변경했습니다.

### v1.0.10

- Heart Delivery Service 장면 세트에서 일반화 가능한 Danbooru 태그 드래프트 규칙을 추가했습니다.
- `explicit` 태그가 자동으로 들어가지 않도록 제거하고, 포즈/신체/행동 태그 규칙을 다듬었습니다.
- 캐릭터 프리셋을 현재 씬에 넣을 때 여러 줄 프리셋이 여러 캐릭터로 쪼개지지 않고 하나의 캐릭터 슬롯에 유지되도록 고쳤습니다.

### v1.0.6

- Windows에서 한 번에 clone, 설치, 실행을 할 수 있는 `install-dongsan.bat`를 추가했습니다.
- 처음 받는 사용자가 바로 볼 수 있도록 설치 방법을 README 상단으로 옮겼습니다.

### v1.0.3

- Electron이 없을 때 `run.bat`가 필요한 의존성을 자동 설치하도록 했습니다.
- clone 또는 다운로드한 사용자를 위한 Windows 실행 안내를 더 명확하게 정리했습니다.

### v1.0.2

- 메인 UI를 씬 목록, 글로벌/캐릭터 프리셋, 편집 화면, 설정/갤러리 컬럼 구조로 재배치했습니다.
- NovelAI 캐릭터 프롬프트의 Character Position을 설정할 수 있는 컨트롤을 추가했습니다.
- 다음 씬으로 캐릭터 프롬프트를 넘기는 기능이 한 번만 적용되고, 씬 변경 후 자동으로 꺼지도록 변경했습니다.
- 씬 생성 중단 버튼을 추가했습니다.
- NovelAI 429 오류가 발생했을 때 1초 간격으로 최대 8번 재시도하도록 변경했습니다.
- NSFW Rena Sachon 장면 세트에 맞춘 Danbooru 태그 드래프트 규칙을 확장했습니다.
