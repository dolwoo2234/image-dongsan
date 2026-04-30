# Dongsan

Dongsan is an Electron desktop workbench for importing scene-description TXT files, drafting Danbooru-style tags, editing NovelAI prompts, generating images, and reviewing scene images.

## Preview

![Dongsan app UI](docs/beginner-guide/view.png)

## Beginner Guide

처음 사용하는 사람은 아래 순서대로 따라 하면 됩니다.

![Dongsan workflow overview](docs/beginner-guide/01-overview.svg)

![Import TXT and select a scene](docs/beginner-guide/02-import-and-select.svg)

![Generate tags and insert character prompts](docs/beginner-guide/03-tags-and-character.svg)

![Generate the first image](docs/beginner-guide/04-generate-first-image.svg)

![Edit prompt and regenerate](docs/beginner-guide/05-edit-and-regenerate.svg)

![Repeat workflow tips](docs/beginner-guide/06-repeat-workflow.svg)

More guide files are available in [docs/beginner-guide](docs/beginner-guide/README.md).

## Install

```bash
git clone https://github.com/dolwoo2234/image-dongsan.git
cd image-dongsan
npm install
npm start
```

NovelAI API keys are saved locally on each user's computer through Electron user data storage. They are not stored in this repository.

## Updates

Use GitHub Releases for published versions. The app can check the latest release from GitHub and, when a newer version exists, update itself with:

```bash
git pull --ff-only
```

After a successful update, Dongsan restarts automatically.
