const { app, BrowserWindow, dialog, ipcMain, nativeImage, safeStorage } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const { promisify } = require('util');
const zlib = require('zlib');
const extractZip = require('extract-zip');
const packageData = require('./package.json');
const {
  applyCustomTagRules,
  createFailedGenerationRecord,
  createGenerationRecord,
  createMockGeneration,
  defaultGenerationSettings,
  generateDraftTags,
  normalizeProject,
  normalizeTagAssignments,
  orderPromptTags,
  parseTagDictionary,
  splitTagsByTarget,
  splitWildcardPromptsByTarget
} = require('./core');

const execFileAsync = promisify(execFile);
const projectVersion = 1;
const appName = 'Dongsan';
const githubOwner = 'dolwoo2234';
const githubRepo = 'image-dongsan';
const githubRepoUrl = `https://github.com/${githubOwner}/${githubRepo}.git`;
let activeNovelAiAbortController = null;

app.setName(appName);

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  const [win] = BrowserWindow.getAllWindows();

  if (!win) {
    return;
  }

  if (win.isMinimized()) {
    win.restore();
  }

  win.focus();
});

function getProjectPaths() {
  const root = app.getPath('userData');
  return {
    root,
    dataDir: path.join(root, 'data'),
    projectFile: path.join(root, 'data', 'project.json'),
    secretFile: path.join(root, 'data', 'secrets.json'),
    importsDir: path.join(root, 'data', 'imports'),
    imagesDir: path.join(root, 'data', 'images')
  };
}

function createEmptyProject() {
  return {
    version: projectVersion,
    updatedAt: new Date().toISOString(),
    sourceFile: null,
    scenes: [],
    generationJobs: [],
    images: [],
    settings: { ...defaultGenerationSettings }
  };
}

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

async function runGit(args) {
  const result = await execFileAsync('git', args, {
    cwd: __dirname,
    windowsHide: true,
    maxBuffer: 1024 * 1024
  });

  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

async function ensureOriginRemote() {
  try {
    const { stdout } = await runGit(['remote', 'get-url', 'origin']);

    if (stdout) {
      return stdout;
    }
  } catch (_error) {
    await runGit(['remote', 'add', 'origin', githubRepoUrl]);
    return githubRepoUrl;
  }

  await runGit(['remote', 'set-url', 'origin', githubRepoUrl]);
  return githubRepoUrl;
}

async function fetchLatestRelease() {
  const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/latest`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': `${packageData.name}/${packageData.version}`
    }
  });

  if (response.status === 404) {
    return fetchLatestTag();
  }

  if (!response.ok) {
    throw new Error(`GitHub 최신 버전 확인 실패 (${response.status})`);
  }

  return response.json();
}

async function fetchLatestTag() {
  const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/tags?per_page=1`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': `${packageData.name}/${packageData.version}`
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub 태그 확인 실패 (${response.status})`);
  }

  const tags = await response.json();
  const latestTag = Array.isArray(tags) ? tags[0] : null;

  if (!latestTag?.name) {
    throw new Error('GitHub에 등록된 버전 태그가 아직 없습니다.');
  }

  return {
    tag_name: latestTag.name,
    name: latestTag.name,
    html_url: `https://github.com/${githubOwner}/${githubRepo}/releases/tag/${latestTag.name}`,
    published_at: null
  };
}

async function checkForUpdates() {
  const release = await fetchLatestRelease();
  const currentVersion = packageData.version;
  const latestVersion = normalizeVersion(release.tag_name);

  return {
    currentVersion,
    latestVersion,
    updateAvailable: compareVersions(currentVersion, latestVersion) < 0,
    releaseName: release.name || release.tag_name,
    releaseUrl: release.html_url,
    publishedAt: release.published_at
  };
}

async function applyGitUpdate() {
  await ensureOriginRemote();

  const status = await runGit(['status', '--porcelain']);
  if (status.stdout) {
    throw new Error('로컬 변경사항이 있어서 자동 업데이트를 중단했습니다. 변경사항을 커밋하거나 백업한 뒤 다시 시도하세요.');
  }

  const branch = (await runGit(['branch', '--show-current'])).stdout || 'main';
  await runGit(['pull', '--ff-only', 'origin', branch]);
  app.relaunch();
  app.exit(0);

  return { restarted: true };
}

async function ensureProjectDirs() {
  const paths = getProjectPaths();
  await fs.mkdir(paths.dataDir, { recursive: true });
  await migrateLegacyUserData(paths);
  await fs.mkdir(paths.importsDir, { recursive: true });
  await fs.mkdir(paths.imagesDir, { recursive: true });
  return paths;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function copyIfMissing(sourcePath, targetPath) {
  if (!(await pathExists(sourcePath)) || (await pathExists(targetPath))) {
    return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.cp(sourcePath, targetPath, { recursive: true });
}

async function migrateLegacyUserData(paths) {
  const legacyRoots = [
    path.join(path.dirname(paths.root), 'harness-desktop-viewer'),
    path.join(path.dirname(paths.root), 'Harness Desktop Viewer')
  ];

  for (const legacyRoot of legacyRoots) {
    if (legacyRoot === paths.root || !(await pathExists(legacyRoot))) {
      continue;
    }

    const legacyDataDir = path.join(legacyRoot, 'data');
    await copyIfMissing(path.join(legacyDataDir, 'project.json'), paths.projectFile);
    await copyIfMissing(path.join(legacyDataDir, 'secrets.json'), paths.secretFile);
    await copyIfMissing(path.join(legacyDataDir, 'imports'), paths.importsDir);
    await copyIfMissing(path.join(legacyDataDir, 'images'), paths.imagesDir);
  }
}

async function readSecretStore() {
  const paths = await ensureProjectDirs();

  try {
    const text = await fs.readFile(paths.secretFile, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    return {};
  }
}

async function writeSecretStore(store) {
  const paths = await ensureProjectDirs();
  await fs.writeFile(paths.secretFile, JSON.stringify(store, null, 2), 'utf8');
}

async function saveApiKey(apiKey) {
  const trimmed = String(apiKey || '').trim();

  if (!trimmed) {
    return clearApiKey();
  }

  const store = await readSecretStore();
  const canEncrypt = safeStorage.isEncryptionAvailable();
  const encoded = canEncrypt
    ? safeStorage.encryptString(trimmed).toString('base64')
    : Buffer.from(trimmed, 'utf8').toString('base64');

  await writeSecretStore({
    ...store,
    novelAiApiKey: {
      encoding: canEncrypt ? 'safeStorage' : 'base64',
      value: encoded,
      updatedAt: new Date().toISOString()
    }
  });
}

function decodeApiKeyEntry(entry) {
  if (!entry?.value) {
    return '';
  }

  if (entry.encoding === 'safeStorage') {
    return safeStorage.decryptString(Buffer.from(entry.value, 'base64'));
  }

  return Buffer.from(entry.value, 'base64').toString('utf8');
}

async function readApiKey() {
  const store = await readSecretStore();

  try {
    return decodeApiKeyEntry(store.novelAiApiKey);
  } catch (error) {
    delete store.novelAiApiKey;
    await writeSecretStore(store);
    throw new Error('저장된 NovelAI API 키를 복호화할 수 없어 삭제했습니다. 설정에서 API 키를 다시 입력하고 저장해주세요.');
  }
}

async function clearApiKey() {
  const store = await readSecretStore();
  delete store.novelAiApiKey;
  await writeSecretStore(store);
}

async function getSecretStatus() {
  const store = await readSecretStore();

  if (store.novelAiApiKey) {
    try {
      decodeApiKeyEntry(store.novelAiApiKey);
    } catch (_error) {
      delete store.novelAiApiKey;
      await writeSecretStore(store);
    }
  }

  return {
    hasApiKey: Boolean(store.novelAiApiKey),
    encryptionAvailable: safeStorage.isEncryptionAvailable()
  };
}

async function readProject() {
  const paths = await ensureProjectDirs();

  try {
    const text = await fs.readFile(paths.projectFile, 'utf8');
    return normalizeProject(JSON.parse(text));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    const project = createEmptyProject();
    await writeProject(project);
    return project;
  }
}

async function writeProject(project) {
  const paths = await ensureProjectDirs();
  const nextProject = {
    ...normalizeProject(project),
    version: projectVersion,
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(paths.projectFile, JSON.stringify(nextProject, null, 2), 'utf8');
  return nextProject;
}

function makeSceneId(sceneNo, index) {
  const normalized = String(sceneNo || index + 1)
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `scene-${normalized || index + 1}-${String(index + 1).padStart(3, '0')}`;
}

function parseSceneMarker(line) {
  const sceneKo = '\uC52C';
  const jangmyeonKo = '\uC7A5\uBA74';
  const subscenePattern = new RegExp(`^\\s*(?:(?:scene|${sceneKo}|${jangmyeonKo})\\s*)?#?\\s*([A-Za-z0-9_.]+)\\s*[-\u2013\u2014]\\s*([A-Za-z0-9_.]+)\\s*[:.)-]?\\s*(.*)$`, 'i');
  const patterns = [
    new RegExp(`^\\s*(?:scene|${sceneKo}|${jangmyeonKo})\\s*#?\\s*([A-Za-z0-9_.-]+)\\s*[:.)-]?\\s*(.*)$`, 'i'),
    /^\s*#\s*([A-Za-z0-9_.-]+)\s*[:.)-]?\s*(.*)$/,
    /^\s*\[([A-Za-z0-9_.-]+)\]\s*(.*)$/,
    /^\s*([0-9]{1,4}[A-Za-z]?)\s*[.)]\s+(.+)$/
  ];

  const subsceneMatch = line.match(subscenePattern);
  if (subsceneMatch) {
    return {
      sceneNo: `${subsceneMatch[1]}-${subsceneMatch[2]}`,
      rest: subsceneMatch[3] || ''
    };
  }

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return {
        sceneNo: match[1],
        rest: match[2] || ''
      };
    }
  }

  return null;
}

function parseScenes(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const marker = parseSceneMarker(line);

    if (marker) {
      if (current) {
        blocks.push(current);
      }

      current = {
        sceneNo: marker.sceneNo,
        lines: marker.rest ? [marker.rest] : [],
        rawLines: [line]
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
      current.rawLines.push(line);
    }
  }

  if (current) {
    blocks.push(current);
  }

  if (blocks.length === 0) {
    const now = new Date().toISOString();
    return [{
      id: 'scene-unmarked-001',
      sceneNo: 'Unmarked',
      description: text.trim(),
      rawText: text,
      status: 'needs_review',
      tags: [],
      tagAssignments: {},
      negativeTags: [],
      wildcardPrompts: [],
      prompt: '',
      negativePrompt: '',
      basePrompt: '',
      baseNegativePrompt: '',
      characterPromptsText: '',
      characterNegativePromptsText: '',
      characterPositionsText: '',
      parserWarnings: ['No scene markers were found. Review and split this scene manually.'],
      userLockedTags: [],
      createdAt: now,
      updatedAt: now
    }];
  }

  const counts = blocks.reduce((acc, block) => {
    acc[block.sceneNo] = (acc[block.sceneNo] || 0) + 1;
    return acc;
  }, {});

  const now = new Date().toISOString();

  return blocks.map((block, index) => {
    const description = block.lines.join('\n').trim();
    const parserWarnings = [];

    if (!description) {
      parserWarnings.push('Scene has no parsed description.');
    }

    if (counts[block.sceneNo] > 1) {
      parserWarnings.push(`Duplicate scene number "${block.sceneNo}" found.`);
    }

    return {
      id: makeSceneId(block.sceneNo, index),
      sceneNo: block.sceneNo,
      description,
      rawText: block.rawLines.join('\n'),
      status: parserWarnings.length > 0 ? 'needs_review' : 'imported',
      tags: [],
      tagAssignments: {},
      negativeTags: [],
      wildcardPrompts: [],
      prompt: '',
      negativePrompt: '',
      basePrompt: '',
      baseNegativePrompt: '',
      characterPromptsText: '',
      characterNegativePromptsText: '',
      characterPositionsText: '',
      parserWarnings,
      userLockedTags: [],
      createdAt: now,
      updatedAt: now
    };
  });
}


function createWindow() {
  const win = new BrowserWindow({
    title: appName,
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#111318',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('project:load', async () => {
  return readProject();
});

ipcMain.handle('settings:load', async () => {
  const project = await readProject();
  const secretStatus = await getSecretStatus();

  return {
    settings: {
      ...defaultGenerationSettings,
      ...(project.settings || {})
    },
    secretStatus
  };
});

ipcMain.handle('settings:save', async (_event, payload) => {
  const project = await readProject();
  const settings = payload?.settings || {};

  project.settings = {
    ...defaultGenerationSettings,
    ...settings
  };

  if (Object.prototype.hasOwnProperty.call(payload || {}, 'apiKey')) {
    await saveApiKey(payload.apiKey);
  }

  const nextProject = await writeProject(project);
  const secretStatus = await getSecretStatus();

  return {
    settings: nextProject.settings,
    secretStatus
  };
});

ipcMain.handle('settings:clearApiKey', async () => {
  await clearApiKey();
  return getSecretStatus();
});

ipcMain.handle('app:checkForUpdates', async () => {
  return checkForUpdates();
});

ipcMain.handle('app:applyUpdate', async () => {
  return applyGitUpdate();
});

ipcMain.handle('settings:importTagDictionary', async () => {
  const result = await dialog.showOpenDialog({
    title: '태그 사전 불러오기',
    properties: ['openFile'],
    filters: [{ name: 'Text files', extensions: ['txt', 'md'] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const text = await fs.readFile(filePath, 'utf8');
  const importedRules = parseTagDictionary(text);
  const project = await readProject();
  const existingRules = Array.isArray(project.settings?.customTagRules) ? project.settings.customTagRules : [];
  const byId = new Map();

  [...existingRules, ...importedRules].forEach((rule) => {
    byId.set(rule.id || `${rule.label}:${(rule.tags || []).join('|')}`, rule);
  });

  project.settings = {
    ...defaultGenerationSettings,
    ...(project.settings || {}),
    customTagRules: [...byId.values()]
  };

  const nextProject = await writeProject(project);
  const secretStatus = await getSecretStatus();

  return {
    settings: nextProject.settings,
    secretStatus,
    importedCount: importedRules.length,
    totalCount: nextProject.settings.customTagRules.length
  };
});

ipcMain.handle('project:saveScene', async (_event, scene) => {
  const project = await readProject();
  const now = new Date().toISOString();
  const index = project.scenes.findIndex((item) => item.id === scene.id);

  if (index === -1) {
    throw new Error(`Scene not found: ${scene.id}`);
  }

  project.scenes[index] = {
    ...project.scenes[index],
    ...scene,
    updatedAt: now
  };

  return writeProject(project);
});

function getNextManualSceneNo(scenes) {
  const numbers = scenes
    .map((scene) => Number.parseInt(String(scene.sceneNo || '').match(/\d+/)?.[0] || '', 10))
    .filter((number) => Number.isFinite(number));
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : scenes.length + 1;

  return String(nextNumber).padStart(2, '0');
}

ipcMain.handle('project:addScene', async (_event, afterSceneId = null) => {
  const project = await readProject();
  const now = new Date().toISOString();
  const insertIndex = afterSceneId
    ? project.scenes.findIndex((scene) => scene.id === afterSceneId) + 1
    : project.scenes.length;
  const safeInsertIndex = insertIndex > 0 ? insertIndex : project.scenes.length;
  const sceneNo = getNextManualSceneNo(project.scenes);
  const scene = {
    id: `scene-manual-${Date.now()}`,
    sceneNo,
    description: '',
    rawText: `#${sceneNo}`,
    status: 'imported',
    tags: [],
    tagAssignments: {},
    negativeTags: [],
    prompt: '',
    negativePrompt: '',
    basePrompt: '',
    baseNegativePrompt: '',
    characterPromptsText: '',
    characterNegativePromptsText: '',
    characterPositionsText: '',
    parserWarnings: [],
    userLockedTags: [],
    createdAt: now,
    updatedAt: now
  };

  project.scenes.splice(safeInsertIndex, 0, scene);
  project.updatedAt = now;
  const nextProject = await writeProject(project);

  return {
    project: nextProject,
    sceneId: scene.id
  };
});

ipcMain.handle('project:deleteScene', async (_event, sceneId) => {
  const project = await readProject();
  const index = project.scenes.findIndex((scene) => scene.id === sceneId);

  if (index === -1) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  project.scenes.splice(index, 1);
  project.generationJobs = (project.generationJobs || []).filter((job) => job.sceneId !== sceneId);
  project.images = (project.images || []).filter((image) => image.sceneId !== sceneId);
  project.updatedAt = new Date().toISOString();

  return writeProject(project);
});

ipcMain.handle('project:generateTags', async (_event, sceneId) => {
  const project = await readProject();
  const index = project.scenes.findIndex((item) => item.id === sceneId);

  if (index === -1) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  const scene = project.scenes[index];
  const draft = generateDraftTags(scene.description || '');
  const customDraft = applyCustomTagRules(scene.description || '', project.settings?.customTagRules || []);
  const tags = orderPromptTags([...(scene.userLockedTags || []), ...draft.tags, ...customDraft.tags]);
  const tagAssignments = normalizeTagAssignments(scene.tagAssignments, tags);
  const negativeTags = orderPromptTags([...draft.negativeTags, ...customDraft.negativeTags]);

  project.scenes[index] = {
    ...scene,
    tags,
    tagAssignments,
    negativeTags,
    prompt: tags.join(', '),
    negativePrompt: negativeTags.join(', '),
    status: scene.status === 'prompt_approved' ? 'prompt_approved' : 'tag_draft',
    updatedAt: new Date().toISOString()
  };

  return writeProject(project);
});

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createMockSvg(scene) {
  const title = escapeXml(`Scene ${scene.sceneNo}`);
  const prompt = escapeXml((scene.prompt || scene.description || '').slice(0, 180));

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">',
    '<rect width="960" height="640" fill="#101218"/>',
    '<rect x="36" y="36" width="888" height="568" rx="18" fill="#181b22" stroke="#3f9d8d" stroke-width="4"/>',
    `<text x="78" y="122" fill="#57b8a7" font-family="Segoe UI, Arial" font-size="38" font-weight="700">${title}</text>`,
    '<text x="78" y="184" fill="#edf0f4" font-family="Segoe UI, Arial" font-size="24">Mock generation result</text>',
    `<foreignObject x="78" y="230" width="804" height="260"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#9aa4b2;font-family:Segoe UI,Arial;font-size:24px;line-height:1.45;">${prompt}</div></foreignObject>`,
    '<text x="78" y="552" fill="#9aa4b2" font-family="Segoe UI, Arial" font-size="18">NovelAI adapter placeholder</text>',
    '</svg>'
  ].join('');
}

function buildNovelAiPayload(scene, settings) {
  const seed = settings.seed ? Number(settings.seed) : Math.floor(Math.random() * 4294967295);
  const sampler = normalizeNovelAiSampler(settings.sampler);
  const characterPrompts = parseCharacterPrompts(scene);
  const basePrompt = buildNovelAiBasePrompt(scene, 'prompt');
  const baseNegativePrompt = buildNovelAiBasePrompt(scene, 'negativePrompt');
  const charCaptions = characterPrompts.map((character) => ({
    char_caption: character.prompt,
    centers: [character.center]
  }));
  const charNegativeCaptions = characterPrompts.map((character) => ({
    char_caption: character.uc || '',
    centers: [character.center]
  }));

  return {
    input: basePrompt,
    model: settings.model,
    action: 'generate',
    parameters: {
      params_version: 3,
      width: Number(settings.width),
      height: Number(settings.height),
      scale: Number(settings.scale),
      cfg_rescale: Number(settings.cfgRescale ?? 0.5),
      noise_schedule: settings.noiseSchedule || 'karras',
      sampler,
      steps: Number(settings.steps),
      n_samples: Number(settings.imageCount) || 1,
      seed,
      negative_prompt: baseNegativePrompt,
      ucPreset: 0,
      qualityToggle: true,
      legacy: false,
      legacy_uc: false,
      legacy_v3_extend: false,
      dynamic_thresholding: false,
      controlnet_strength: 1,
      add_original_image: true,
      autoSmea: false,
      normalize_reference_strength_multiple: true,
      reference_image_multiple: [],
      reference_information_extracted_multiple: [],
      reference_strength_multiple: [],
      use_coords: characterPrompts.length > 0,
      characterPrompts,
      v4_prompt: {
        caption: {
          base_caption: basePrompt,
          char_captions: charCaptions
        },
        use_coords: characterPrompts.length > 0,
        use_order: true
      },
      v4_negative_prompt: {
        caption: {
          base_caption: baseNegativePrompt,
          char_captions: charNegativeCaptions
        },
        legacy_uc: false
      }
    }
  };
}

function stripDataUrlPrefix(value) {
  return String(value || '').replace(/^data:[^;]+;base64,/, '');
}

function normalizeInpaintStrength(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 1;
  }

  return Math.min(Math.max(numberValue, 0), 1);
}

function normalizeImageToImageNoise(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.min(Math.max(numberValue, 0), 1);
}

function getNovelAiInpaintModel(model) {
  const normalized = String(model || '').trim();

  if (/inpaint/i.test(normalized)) {
    return normalized;
  }

  const knownModels = {
    'nai-diffusion-4-5-full': 'nai-diffusion-4-5-full-inpainting',
    'nai-diffusion-4-full': 'nai-diffusion-4-full-inpainting',
    'nai-diffusion-3': 'nai-diffusion-3-inpainting'
  };

  return knownModels[normalized] || normalized;
}

function buildNovelAiInpaintPayload(scene, settings, sourceImageBase64, maskBase64, strength) {
  const payload = buildNovelAiPayload(scene, settings);

  payload.model = getNovelAiInpaintModel(settings.model);
  payload.action = 'infill';
  payload.parameters.image = sourceImageBase64;
  payload.parameters.mask = maskBase64;
  payload.parameters.inpaintImg2ImgStrength = normalizeInpaintStrength(strength);
  payload.parameters.img2img = {
    strength: normalizeInpaintStrength(strength),
    color_correct: true
  };
  payload.parameters.extra_noise_seed = payload.parameters.seed;
  payload.parameters.add_original_image = false;
  payload.parameters.noise = 0;
  payload.parameters.n_samples = 1;

  return payload;
}

function buildNovelAiImageToImagePayload(scene, settings, sourceImageBase64, strength, noise) {
  const payload = buildNovelAiPayload(scene, settings);
  const normalizedStrength = normalizeInpaintStrength(strength);
  const normalizedNoise = normalizeImageToImageNoise(noise);

  payload.action = 'img2img';
  payload.parameters.image = sourceImageBase64;
  payload.parameters.strength = normalizedStrength;
  payload.parameters.img2img = {
    strength: normalizedStrength,
    color_correct: true
  };
  payload.parameters.noise = normalizedNoise;
  payload.parameters.extra_noise_seed = payload.parameters.seed;
  payload.parameters.add_original_image = false;
  payload.parameters.n_samples = 1;

  return payload;
}

function splitPromptParts(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripCharacterPromptParts(prompt, characterPromptText) {
  const characterParts = new Set(
    String(characterPromptText || '')
      .split('\n')
      .flatMap(splitPromptParts)
      .map((part) => part.toLowerCase())
  );

  if (characterParts.size === 0) {
    return String(prompt || '').trim();
  }

  return splitPromptParts(prompt)
    .filter((part) => !characterParts.has(part.toLowerCase()))
    .join(', ');
}

function buildNovelAiBasePrompt(scene, kind) {
  const isNegative = kind === 'negativePrompt';
  const baseText = isNegative ? scene.baseNegativePrompt : scene.basePrompt;
  const tags = isNegative ? scene.negativeTags : scene.tags;
  const savedPrompt = isNegative ? scene.negativePrompt : scene.prompt;
  const characterText = isNegative ? scene.characterNegativePromptsText : scene.characterPromptsText;
  const tagAssignments = isNegative
    ? Object.fromEntries(orderPromptTags(tags || []).map((tag) => [tag, 'scene']))
    : normalizeTagAssignments(scene.tagAssignments, tags || []);
  const sceneTags = splitTagsByTarget(tags || [], tagAssignments).sceneTags;
  const wildcardTargets = isNegative ? { sceneTags: [] } : splitWildcardPromptsByTarget(scene.wildcardPrompts || []);
  const tagPrompt = [
    String(baseText || '').trim(),
    ...orderPromptTags(sceneTags),
    ...wildcardTargets.sceneTags
  ].filter(Boolean).join(', ');

  if (tagPrompt || orderPromptTags(tags || []).length > 0) {
    return tagPrompt;
  }

  return stripCharacterPromptParts(savedPrompt, characterText) || String(baseText || '').trim();
}

function parseCharacterPrompts(scene) {
  const tagAssignments = normalizeTagAssignments(scene.tagAssignments, scene.tags || []);
  const characterTags = splitTagsByTarget(scene.tags || [], tagAssignments).characterTags;
  const wildcardTargets = splitWildcardPromptsByTarget(scene.wildcardPrompts || []);
  const prompts = String(scene.characterPromptsText || '')
    .split('\n')
    .map((line) => line.trim());
  const negatives = String(scene.characterNegativePromptsText || '')
    .split('\n')
    .map((line) => line.trim());
  const positions = String(scene.characterPositionsText || '')
    .split('\n')
    .map((line) => line.trim());
  const count = Math.min(Math.max(
    prompts.filter(Boolean).length,
    characterTags.length,
    wildcardTargets.characterTags.length
  ), 6);

  return Array.from({ length: count }, (_item, index) => {
    const prompt = [
      prompts[index] || '',
      ...orderPromptTags(characterTags[index] || []),
      ...(wildcardTargets.characterTags[index] || [])
    ].filter(Boolean).join(', ');

    return {
    prompt,
    uc: negatives[index] || '',
    center: resolveCharacterCenter(positions[index], index, count),
    enabled: true
    };
  }).filter((character) => character.prompt || character.uc);
}

function resolveCharacterCenter(position, index, count) {
  const normalized = String(position || 'auto').trim().toLowerCase();
  const positionMap = {
    left: { x: 0.25, y: 0.5 },
    center: { x: 0.5, y: 0.5 },
    right: { x: 0.75, y: 0.5 },
    top: { x: 0.5, y: 0.25 },
    bottom: { x: 0.5, y: 0.75 },
    'top-left': { x: 0.25, y: 0.25 },
    'top-right': { x: 0.75, y: 0.25 },
    'bottom-left': { x: 0.25, y: 0.75 },
    'bottom-right': { x: 0.75, y: 0.75 }
  };

  if (positionMap[normalized]) {
    return positionMap[normalized];
  }

  const coordinateMatch = normalized.match(/^([0-9]*\.?[0-9]+)\s*,\s*([0-9]*\.?[0-9]+)$/);

  if (coordinateMatch) {
    return {
      x: Math.min(Math.max(Number(coordinateMatch[1]), 0), 1),
      y: Math.min(Math.max(Number(coordinateMatch[2]), 0), 1)
    };
  }

  return {
    x: count <= 1 ? 0.5 : Number((0.2 + (0.6 * index / (count - 1))).toFixed(2)),
    y: 0.5
  };
}

function normalizeNovelAiSampler(sampler) {
  const normalized = String(sampler || '').trim().toLowerCase();
  const samplerMap = {
    'euler ancestral': 'k_euler_ancestral',
    euler_ancestral: 'k_euler_ancestral',
    'k euler ancestral': 'k_euler_ancestral',
    k_euler_ancestral: 'k_euler_ancestral',
    euler: 'k_euler',
    'dpm++ 2m': 'k_dpmpp_2m',
    k_dpmpp_2m: 'k_dpmpp_2m'
  };

  return samplerMap[normalized] || sampler || 'k_euler_ancestral';
}

function denormalizeNovelAiSampler(sampler) {
  const normalized = String(sampler || '').trim().toLowerCase();
  const samplerMap = {
    k_euler_ancestral: 'Euler Ancestral',
    k_euler: 'Euler',
    k_dpmpp_2m: 'DPM++ 2M'
  };

  return samplerMap[normalized] || sampler || '';
}

function isPngBuffer(buffer) {
  return buffer.length > 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a;
}

function parsePngTextChunks(buffer) {
  if (!isPngBuffer(buffer)) {
    throw new Error('PNG 파일만 지원합니다.');
  }

  const chunks = {};
  const imageInfo = {};
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd > buffer.length) {
      break;
    }

    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR' && data.length >= 8) {
      imageInfo.width = data.readUInt32BE(0);
      imageInfo.height = data.readUInt32BE(4);
    } else if (type === 'tEXt') {
      const separator = data.indexOf(0);

      if (separator > -1) {
        const key = data.subarray(0, separator).toString('latin1');
        chunks[key] = data.subarray(separator + 1).toString('utf8');
      }
    } else if (type === 'zTXt') {
      const separator = data.indexOf(0);

      if (separator > -1 && data.length > separator + 2) {
        const key = data.subarray(0, separator).toString('latin1');
        const compressed = data.subarray(separator + 2);
        chunks[key] = zlib.inflateSync(compressed).toString('utf8');
      }
    } else if (type === 'iTXt') {
      const firstSeparator = data.indexOf(0);

      if (firstSeparator > -1 && data.length > firstSeparator + 2) {
        const key = data.subarray(0, firstSeparator).toString('utf8');
        const compressionFlag = data[firstSeparator + 1];
        const compressionMethod = data[firstSeparator + 2];
        let cursor = firstSeparator + 3;

        for (let part = 0; part < 2; part += 1) {
          const nextSeparator = data.indexOf(0, cursor);
          cursor = nextSeparator > -1 ? nextSeparator + 1 : data.length;
        }

        const textData = data.subarray(cursor);
        chunks[key] = compressionFlag === 1 && compressionMethod === 0
          ? zlib.inflateSync(textData).toString('utf8')
          : textData.toString('utf8');
      }
    }

    offset = dataEnd + 4;

    if (type === 'IEND') {
      break;
    }
  }

  return { chunks, imageInfo };
}

function parseJsonMaybe(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function formatCharacterPosition(center) {
  if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') {
    return 'auto';
  }

  return `${Number(center.x.toFixed(3))},${Number(center.y.toFixed(3))}`;
}

function modelFromNovelAiSource(source) {
  const normalized = String(source || '').toLowerCase();

  if (normalized.includes('v4.5')) {
    return 'nai-diffusion-4-5-full';
  }

  if (normalized.includes('v4')) {
    return 'nai-diffusion-4-full';
  }

  if (normalized.includes('v3')) {
    return 'nai-diffusion-3';
  }

  return '';
}

function normalizeNovelAiPngMetadata(comment, chunks, imageInfo) {
  const promptCaption = comment?.v4_prompt?.caption || {};
  const negativeCaption = comment?.v4_negative_prompt?.caption || {};
  const characterPrompts = Array.isArray(promptCaption.char_captions)
    ? promptCaption.char_captions
    : [];
  const characterNegativePrompts = Array.isArray(negativeCaption.char_captions)
    ? negativeCaption.char_captions
    : [];
  const prompt = String(comment?.prompt || promptCaption.base_caption || chunks.Description || '').trim();
  const negativePrompt = String(comment?.uc || negativeCaption.base_caption || '').trim();
  const model = String(comment?.model || modelFromNovelAiSource(chunks.Source) || '').trim();

  return {
    metadata: {
      prompt,
      negativePrompt,
      basePrompt: String(promptCaption.base_caption || prompt).trim(),
      baseNegativePrompt: String(negativeCaption.base_caption || negativePrompt).trim(),
      characterPromptsText: characterPrompts.map((item) => String(item?.char_caption || '').trim()).join('\n'),
      characterNegativePromptsText: characterNegativePrompts.map((item) => String(item?.char_caption || '').trim()).join('\n'),
      characterPositionsText: characterPrompts.map((item) => formatCharacterPosition(item?.centers?.[0])).join('\n'),
      seed: comment?.seed ?? '',
      model,
      sampler: denormalizeNovelAiSampler(comment?.sampler || ''),
      steps: comment?.steps ?? '',
      scale: comment?.scale ?? '',
      cfgRescale: comment?.cfg_rescale ?? '',
      noiseSchedule: comment?.noise_schedule || '',
      width: comment?.width || imageInfo.width || '',
      height: comment?.height || imageInfo.height || ''
    },
    settings: {
      provider: 'novelai',
      ...(model ? { model } : {}),
      ...(comment?.width || imageInfo.width ? { width: Number(comment?.width || imageInfo.width) } : {}),
      ...(comment?.height || imageInfo.height ? { height: Number(comment?.height || imageInfo.height) } : {}),
      ...(comment?.steps ? { steps: Number(comment.steps) } : {}),
      ...(comment?.scale ? { scale: Number(comment.scale) } : {}),
      ...(comment?.sampler ? { sampler: denormalizeNovelAiSampler(comment.sampler) } : {}),
      ...(comment?.cfg_rescale !== undefined ? { cfgRescale: Number(comment.cfg_rescale) } : {}),
      ...(comment?.noise_schedule ? { noiseSchedule: comment.noise_schedule } : {}),
      ...(comment?.seed !== undefined ? { seed: String(comment.seed) } : {})
    }
  };
}

async function saveNovelAiResponse(responseBuffer, scene, settings, options = {}) {
  const paths = await ensureProjectDirs();
  const sceneImageDir = path.join(paths.imagesDir, scene.id);
  await fs.mkdir(sceneImageDir, { recursive: true });

  const timestamp = Date.now();
  const zipPath = path.join(sceneImageDir, `${timestamp}-novelai.zip`);
  const extractedDir = path.join(sceneImageDir, `${timestamp}-novelai`);
  await fs.writeFile(zipPath, responseBuffer);

  const imageRecords = [];

  try {
    await extractZip(zipPath, { dir: extractedDir });
    const entries = (await collectFiles(extractedDir)).sort((first, second) => first.localeCompare(second));

    for (const entryPath of entries) {
      if (options.maxImages && imageRecords.length >= options.maxImages) {
        break;
      }

      const ext = path.extname(entryPath).toLowerCase();

      if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        continue;
      }

      const finalPath = path.join(sceneImageDir, `${timestamp}-${imageRecords.length + 1}${ext}`);
      await fs.copyFile(entryPath, finalPath);
      imageRecords.push({
        path: finalPath,
        uri: pathToFileURL(finalPath).toString(),
        seed: settings.seed
      });
    }
  } catch (_error) {
    const finalPath = path.join(sceneImageDir, `${timestamp}-response.bin`);
    await fs.writeFile(finalPath, responseBuffer);
    imageRecords.push({
      path: finalPath,
      uri: pathToFileURL(finalPath).toString(),
      seed: settings.seed
    });
  }

  if (imageRecords.length === 0) {
    throw new Error('NovelAI response did not contain an image file.');
  }

  return imageRecords;
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitWithAbort(ms, signal) {
  if (!signal) {
    return wait(ms);
  }

  if (signal.aborted) {
    return Promise.reject(new Error('NovelAI generation canceled.'));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new Error('NovelAI generation canceled.'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function isConcurrentGenerationLock(status, message) {
  return status === 429 && String(message || '').toLowerCase().includes('concurrent generation is locked');
}

function isCloudflareRateLimit(status, message) {
  const normalized = String(message || '').toLowerCase();
  return status === 429 && (
    normalized.includes('cloudflare')
    || normalized.includes('access denied')
    || normalized.includes('used cloudflare to restrict access')
  );
}

function getNovelAiRetryReason(status, message) {
  if (isConcurrentGenerationLock(status, message)) {
    return 'concurrent generation locked';
  }

  if (isCloudflareRateLimit(status, message)) {
    return 'Cloudflare rate limit';
  }

  if (status === 429) {
    return 'rate limit';
  }

  return '';
}

function stripHtmlForErrorMessage(message) {
  return String(message || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeNovelAiError(status, message, statusText) {
  if (isCloudflareRateLimit(status, message)) {
    return 'NovelAI/Cloudflare temporarily restricted the request. Please wait a moment and try again.';
  }

  const cleaned = stripHtmlForErrorMessage(message);
  return cleaned || statusText || 'Unknown error';
}

async function requestNovelAiGeneration(endpoint, apiKey, payload, retryOptions = {}) {
  const maxRetries = retryOptions.maxRetries ?? 8;
  const retryDelayMs = retryOptions.retryDelayMs || 1000;
  const requestTimeoutMs = retryOptions.requestTimeoutMs || 120000;
  const onAttempt = typeof retryOptions.onAttempt === 'function' ? retryOptions.onAttempt : null;
  const onRetry = typeof retryOptions.onRetry === 'function' ? retryOptions.onRetry : null;
  const signal = retryOptions.signal || null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    if (signal?.aborted) {
      throw new Error('NovelAI generation canceled.');
    }

    onAttempt?.({
      attempt,
      maxAttempts: maxRetries + 1,
      requestTimeoutMs
    });

    const requestController = new AbortController();
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      requestController.abort();
    }, requestTimeoutMs);
    const onAbort = () => requestController.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    let response;
    let responseBuffer;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/zip,image/png,image/webp,*/*'
        },
        body: JSON.stringify(payload),
        signal: requestController.signal
      });
      responseBuffer = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('NovelAI generation canceled.');
      }

      if (didTimeout) {
        throw new Error(`NovelAI request timed out after ${Math.round(requestTimeoutMs / 1000)} seconds. Please try again.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }

    if (response.ok) {
      return responseBuffer;
    }

    const message = responseBuffer.toString('utf8').slice(0, 500);
    const retryReason = getNovelAiRetryReason(response.status, message);

    if (retryReason && attempt <= maxRetries) {
      onRetry?.({
        retryAttempt: attempt,
        maxRetries,
        retryDelayMs,
        reason: retryReason,
        status: response.status
      });
      await waitWithAbort(retryDelayMs, signal);
      continue;
    }

    throw new Error(`NovelAI request failed (${response.status}): ${summarizeNovelAiError(response.status, message, response.statusText)}`);
  }

  throw new Error('NovelAI request failed: retry attempts exhausted.');
}

async function generateWithNovelAi(project, scene, settingsOverride = null, webContents = null) {
  const settings = {
    ...defaultGenerationSettings,
    ...(project.settings || {}),
    ...(settingsOverride || {}),
    provider: 'novelai'
  };
  const apiKey = await readApiKey();

  if (!apiKey) {
    throw new Error('NovelAI API key is not stored.');
  }

  const endpoint = settings.endpoint || defaultGenerationSettings.endpoint;
  activeNovelAiAbortController = new AbortController();
  let responseBuffer;

  try {
    responseBuffer = await requestNovelAiGeneration(endpoint, apiKey, buildNovelAiPayload(scene, settings), {
    signal: activeNovelAiAbortController.signal,
    onAttempt: ({ attempt, maxAttempts, requestTimeoutMs }) => {
      webContents?.send('generation:status', {
        status: 'running',
        message: `NovelAI request sent... (${attempt}/${maxAttempts}, timeout ${Math.round(requestTimeoutMs / 1000)}s)`
      });
    },
    onRetry: ({ retryAttempt, maxRetries, retryDelayMs, reason }) => {
      webContents?.send('generation:status', {
        status: 'running',
        message: `NovelAI 429 ${reason}. Retrying in ${retryDelayMs / 1000}s... (${retryAttempt}/${maxRetries})`
      });
    }
    });
  } finally {
    activeNovelAiAbortController = null;
  }

  const imageRecords = await saveNovelAiResponse(responseBuffer, scene, settings);
  return createGenerationRecord(project, scene, imageRecords, settings, 'novelai');
}

async function generateWithNovelAiInpaint(project, scene, image, maskDataUrl, strength, settingsOverride = null, webContents = null) {
  const settings = {
    ...defaultGenerationSettings,
    ...(image.metadata || {}),
    ...(project.settings || {}),
    ...(settingsOverride || {}),
    provider: 'novelai',
    seed: ''
  };

  if (image.metadata?.width && image.metadata?.height) {
    settings.width = image.metadata.width;
    settings.height = image.metadata.height;
  }
  const apiKey = await readApiKey();

  if (!apiKey) {
    throw new Error('NovelAI API key is not stored.');
  }

  const sourceImageBase64 = await fs.readFile(image.path, 'base64');
  const maskBase64 = stripDataUrlPrefix(maskDataUrl);
  const endpoint = settings.endpoint || defaultGenerationSettings.endpoint;
  const inpaintStrength = normalizeInpaintStrength(strength);
  activeNovelAiAbortController = new AbortController();
  let responseBuffer;

  try {
    responseBuffer = await requestNovelAiGeneration(
      endpoint,
      apiKey,
      buildNovelAiInpaintPayload(scene, settings, sourceImageBase64, maskBase64, inpaintStrength),
      {
        signal: activeNovelAiAbortController.signal,
        onAttempt: ({ attempt, maxAttempts, requestTimeoutMs }) => {
          webContents?.send('generation:status', {
            status: 'running',
            message: `NovelAI inpaint request sent... (${attempt}/${maxAttempts}, timeout ${Math.round(requestTimeoutMs / 1000)}s)`
          });
        },
        onRetry: ({ retryAttempt, maxRetries, retryDelayMs, reason }) => {
          webContents?.send('generation:status', {
            status: 'running',
            message: `NovelAI 429 ${reason}. Retrying in ${retryDelayMs / 1000}s... (${retryAttempt}/${maxRetries})`
          });
        }
      }
    );
  } finally {
    activeNovelAiAbortController = null;
  }

  const imageRecords = await saveNovelAiResponse(responseBuffer, scene, settings, { maxImages: 1 });
  return createGenerationRecord(project, scene, imageRecords, {
    ...settings,
    mode: 'novelai-inpaint',
    sourceImageId: image.id,
    inpaintStrength
  }, 'novelai-inpaint');
}

async function generateWithNovelAiImageToImage(project, scene, image, strength, noise, settingsOverride = null, webContents = null) {
  const settings = {
    ...defaultGenerationSettings,
    ...(image.metadata || {}),
    ...(project.settings || {}),
    ...(settingsOverride || {}),
    provider: 'novelai',
    seed: ''
  };

  if (image.metadata?.width && image.metadata?.height) {
    settings.width = image.metadata.width;
    settings.height = image.metadata.height;
  }

  const apiKey = await readApiKey();

  if (!apiKey) {
    throw new Error('NovelAI API key is not stored.');
  }

  const sourceImageBase64 = await fs.readFile(image.path, 'base64');
  const endpoint = settings.endpoint || defaultGenerationSettings.endpoint;
  const i2iStrength = normalizeInpaintStrength(strength);
  const i2iNoise = normalizeImageToImageNoise(noise);
  activeNovelAiAbortController = new AbortController();
  let responseBuffer;

  try {
    responseBuffer = await requestNovelAiGeneration(
      endpoint,
      apiKey,
      buildNovelAiImageToImagePayload(scene, settings, sourceImageBase64, i2iStrength, i2iNoise),
      {
        signal: activeNovelAiAbortController.signal,
        onAttempt: ({ attempt, maxAttempts, requestTimeoutMs }) => {
          webContents?.send('generation:status', {
            status: 'running',
            message: `NovelAI i2i request sent... (${attempt}/${maxAttempts}, timeout ${Math.round(requestTimeoutMs / 1000)}s)`
          });
        },
        onRetry: ({ retryAttempt, maxRetries, retryDelayMs, reason }) => {
          webContents?.send('generation:status', {
            status: 'running',
            message: `NovelAI 429 ${reason}. Retrying in ${retryDelayMs / 1000}s... (${retryAttempt}/${maxRetries})`
          });
        }
      }
    );
  } finally {
    activeNovelAiAbortController = null;
  }

  const imageRecords = await saveNovelAiResponse(responseBuffer, scene, settings, { maxImages: 1 });
  return createGenerationRecord(project, scene, imageRecords, {
    ...settings,
    mode: 'novelai-i2i',
    sourceImageId: image.id,
    i2iStrength,
    i2iNoise
  }, 'novelai-i2i');
}

ipcMain.handle('project:mockGenerate', async (_event, sceneId) => {
  const project = await readProject();
  const scene = project.scenes.find((item) => item.id === sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  if (!['prompt_approved', 'generated'].includes(scene.status)) {
    throw new Error('프롬프트를 먼저 승인하거나 저장한 뒤 생성해주세요.');
  }

  const paths = await ensureProjectDirs();
  const sceneImageDir = path.join(paths.imagesDir, scene.id);
  await fs.mkdir(sceneImageDir, { recursive: true });

  const imagePath = path.join(sceneImageDir, `${Date.now()}-mock.svg`);
  await fs.writeFile(imagePath, createMockSvg(scene), 'utf8');

  const nextProject = createMockGeneration(
    project,
    scene,
    imagePath,
    pathToFileURL(imagePath).toString(),
    project.settings
  );

  return writeProject(nextProject);
});

ipcMain.handle('project:updateImage', async (_event, imageId, patch) => {
  const project = await readProject();
  const index = project.images.findIndex((image) => image.id === imageId);

  if (index === -1) {
    throw new Error(`Image not found: ${imageId}`);
  }

  project.images[index] = {
    ...project.images[index],
    ...patch,
    metadata: {
      ...(project.images[index].metadata || {}),
      ...(patch?.metadata || {})
    }
  };

  return writeProject(project);
});

ipcMain.handle('project:readImageMetadata', async (_event, imagePath) => {
  const normalizedPath = path.normalize(String(imagePath || ''));

  if (!normalizedPath || path.extname(normalizedPath).toLowerCase() !== '.png') {
    throw new Error('PNG 이미지 파일만 불러올 수 있습니다.');
  }

  const project = await readProject();
  const existingImage = (project.images || []).find((image) => (
    image.path && path.normalize(image.path).toLowerCase() === normalizedPath.toLowerCase()
  ));

  if (existingImage?.metadata) {
    return {
      source: 'project',
      metadata: existingImage.metadata,
      settings: {
        provider: 'novelai',
        model: existingImage.metadata.model,
        width: existingImage.metadata.width,
        height: existingImage.metadata.height,
        steps: existingImage.metadata.steps,
        scale: existingImage.metadata.scale,
        sampler: existingImage.metadata.sampler,
        cfgRescale: existingImage.metadata.cfgRescale,
        noiseSchedule: existingImage.metadata.noiseSchedule,
        seed: existingImage.metadata.seed
      }
    };
  }

  const buffer = await fs.readFile(normalizedPath);
  const { chunks, imageInfo } = parsePngTextChunks(buffer);
  const comment = parseJsonMaybe(chunks.Comment);

  if (!comment) {
    return {
      source: chunks.Software || 'png',
      metadata: {},
      settings: {
        width: imageInfo.width,
        height: imageInfo.height
      },
      hasMetadata: false
    };
  }

  return {
    source: chunks.Software || 'png',
    ...normalizeNovelAiPngMetadata(comment, chunks, imageInfo),
    hasMetadata: true
  };
});

ipcMain.handle('project:importImageForScene', async (_event, sceneId, imagePath, metadata = {}) => {
  const normalizedPath = path.normalize(String(imagePath || ''));

  if (!normalizedPath || path.extname(normalizedPath).toLowerCase() !== '.png') {
    throw new Error('Only PNG images can be imported.');
  }

  const project = await readProject();
  const scene = project.scenes.find((item) => item.id === sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  const paths = await ensureProjectDirs();
  const sceneImageDir = path.join(paths.imagesDir, scene.id);
  await fs.mkdir(sceneImageDir, { recursive: true });

  const now = new Date().toISOString();
  const timestamp = Date.now();
  const originalName = path.basename(normalizedPath, path.extname(normalizedPath)).replace(/[^\w.-]+/g, '-');
  const finalPath = path.join(sceneImageDir, `${timestamp}-import-${originalName || 'image'}.png`);
  await fs.copyFile(normalizedPath, finalPath);

  const imageId = `imported-${timestamp}`;
  const image = {
    id: imageId,
    sceneId: scene.id,
    jobId: 'imported-image',
    path: finalPath,
    uri: pathToFileURL(finalPath).toString(),
    metadata: {
      ...(metadata || {}),
      importedFrom: normalizedPath
    },
    favorite: false,
    status: 'candidate',
    note: '가져온 PNG',
    createdAt: now
  };

  const nextProject = {
    ...normalizeProject(project),
    images: [...(project.images || []), image],
    updatedAt: now
  };

  return {
    project: await writeProject(nextProject),
    imageId
  };
});

function makeExportFilename(project, image) {
  const scene = project.scenes.find((item) => item.id === image.sceneId);
  const sceneNo = String(scene?.sceneNo || image.sceneId || 'scene').replace(/[^\w.-]+/g, '-');
  const created = String(image.createdAt || '').slice(0, 10).replace(/-/g, '');
  const sceneImages = (project.images || []).filter((item) => item.sceneId === image.sceneId);
  const imageIndex = Math.max(sceneImages.findIndex((item) => item.id === image.id), 0) + 1;
  const imageSuffix = `img${String(imageIndex).padStart(2, '0')}`;

  return `scene-${sceneNo}-${created || Date.now()}-${imageSuffix}.png`;
}

async function writePngExport(sourcePath, targetPath) {
  const sourceExt = path.extname(sourcePath).toLowerCase();

  if (sourceExt === '.png') {
    await fs.copyFile(sourcePath, targetPath);
    return;
  }

  const image = nativeImage.createFromPath(sourcePath);

  if (image.isEmpty()) {
    throw new Error('이 이미지 파일은 PNG로 변환할 수 없습니다.');
  }

  await fs.writeFile(targetPath, image.toPNG());
}

ipcMain.handle('project:keepAndExportImage', async (event, imageId) => {
  const project = await readProject();
  const index = project.images.findIndex((image) => image.id === imageId);

  if (index === -1) {
    throw new Error(`Image not found: ${imageId}`);
  }

  const image = project.images[index];

  if (!image.path) {
    throw new Error('내보낼 이미지 파일 경로가 없습니다.');
  }

  const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
    title: '채택 이미지 PNG로 내보내기',
    defaultPath: makeExportFilename(project, image),
    filters: [{ name: 'PNG 이미지', extensions: ['png'] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true, project };
  }

  const outputPath = result.filePath.toLowerCase().endsWith('.png')
    ? result.filePath
    : `${result.filePath}.png`;

  await writePngExport(image.path, outputPath);

  project.images[index] = {
    ...image,
    status: 'keep',
    exportedAt: new Date().toISOString(),
    exportedPath: outputPath
  };

  return {
    canceled: false,
    filePath: outputPath,
    project: await writeProject(project)
  };
});

ipcMain.handle('project:mockVariation', async (_event, imageId) => {
  const project = await readProject();
  const image = project.images.find((item) => item.id === imageId);

  if (!image) {
    throw new Error(`Image not found: ${imageId}`);
  }

  const scene = project.scenes.find((item) => item.id === image.sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${image.sceneId}`);
  }

  const variationScene = {
    ...scene,
    prompt: scene.prompt || image.metadata?.prompt,
    negativePrompt: scene.negativePrompt || image.metadata?.negativePrompt,
    basePrompt: scene.basePrompt || image.metadata?.basePrompt,
    baseNegativePrompt: scene.baseNegativePrompt || image.metadata?.baseNegativePrompt,
    characterPromptsText: scene.characterPromptsText || image.metadata?.characterPromptsText,
    characterNegativePromptsText: scene.characterNegativePromptsText || image.metadata?.characterNegativePromptsText,
    characterPositionsText: scene.characterPositionsText || image.metadata?.characterPositionsText,
    status: 'prompt_approved'
  };
  const settings = {
    ...defaultGenerationSettings,
    ...(image.metadata || {}),
    ...(project.settings || {}),
    seed: ''
  };
  const paths = await ensureProjectDirs();
  const sceneImageDir = path.join(paths.imagesDir, scene.id);
  await fs.mkdir(sceneImageDir, { recursive: true });

  const imagePath = path.join(sceneImageDir, `${Date.now()}-variation.svg`);
  await fs.writeFile(imagePath, createMockSvg(variationScene), 'utf8');

  const nextProject = createMockGeneration(
    project,
    variationScene,
    imagePath,
    pathToFileURL(imagePath).toString(),
    settings
  );

  return writeProject(nextProject);
});

ipcMain.handle('project:novelAiVariation', async (event, imageId, sceneOverride = null) => {
  const project = await readProject();
  const image = project.images.find((item) => item.id === imageId);

  if (!image) {
    throw new Error(`Image not found: ${imageId}`);
  }

  const scene = project.scenes.find((item) => item.id === image.sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${image.sceneId}`);
  }

  const currentScene = sceneOverride && sceneOverride.id === scene.id
    ? {
      ...scene,
      ...sceneOverride,
      prompt: String(sceneOverride.prompt || '').trim() || scene.prompt,
      negativePrompt: String(sceneOverride.negativePrompt || '').trim() || scene.negativePrompt
    }
    : scene;

  const variationScene = {
    ...currentScene,
    prompt: currentScene.prompt || image.metadata?.prompt,
    negativePrompt: currentScene.negativePrompt || image.metadata?.negativePrompt,
    basePrompt: currentScene.basePrompt || image.metadata?.basePrompt,
    baseNegativePrompt: currentScene.baseNegativePrompt || image.metadata?.baseNegativePrompt,
    characterPromptsText: currentScene.characterPromptsText || image.metadata?.characterPromptsText,
    characterNegativePromptsText: currentScene.characterNegativePromptsText || image.metadata?.characterNegativePromptsText,
    characterPositionsText: currentScene.characterPositionsText || image.metadata?.characterPositionsText,
    status: 'prompt_approved'
  };
  const settings = {
    ...defaultGenerationSettings,
    ...(image.metadata || {}),
    ...(project.settings || {}),
    seed: ''
  };

  try {
    const nextProject = await generateWithNovelAi(project, variationScene, settings, event.sender);
    return writeProject(nextProject);
  } catch (error) {
    if (String(error.message || '').includes('canceled')) {
      throw error;
    }

    const failedProject = createFailedGenerationRecord(project, variationScene, error.message, settings, 'novelai-variation');
    await writeProject(failedProject);
    throw error;
  }
});

ipcMain.handle('project:novelAiImageToImage', async (event, imageId, sceneOverride = null, strength = 0.7, noise = 0) => {
  const project = await readProject();
  const image = project.images.find((item) => item.id === imageId);

  if (!image) {
    throw new Error(`Image not found: ${imageId}`);
  }

  const scene = project.scenes.find((item) => item.id === image.sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${image.sceneId}`);
  }

  const currentScene = sceneOverride && sceneOverride.id === scene.id
    ? {
      ...scene,
      ...sceneOverride,
      prompt: String(sceneOverride.prompt || '').trim() || scene.prompt || image.metadata?.prompt || '',
      negativePrompt: String(sceneOverride.negativePrompt || '').trim() || scene.negativePrompt || image.metadata?.negativePrompt || ''
    }
    : scene;

  const i2iScene = {
    ...currentScene,
    prompt: currentScene.prompt || image.metadata?.prompt,
    negativePrompt: currentScene.negativePrompt || image.metadata?.negativePrompt,
    basePrompt: currentScene.basePrompt || image.metadata?.basePrompt,
    baseNegativePrompt: currentScene.baseNegativePrompt || image.metadata?.baseNegativePrompt,
    characterPromptsText: currentScene.characterPromptsText || image.metadata?.characterPromptsText,
    characterNegativePromptsText: currentScene.characterNegativePromptsText || image.metadata?.characterNegativePromptsText,
    characterPositionsText: currentScene.characterPositionsText || image.metadata?.characterPositionsText,
    status: 'prompt_approved'
  };
  const settings = {
    ...defaultGenerationSettings,
    ...(image.metadata || {}),
    ...(project.settings || {}),
    seed: '',
    i2iStrength: normalizeInpaintStrength(strength),
    i2iNoise: normalizeImageToImageNoise(noise),
    sourceImageId: image.id
  };

  try {
    const nextProject = await generateWithNovelAiImageToImage(project, i2iScene, image, strength, noise, settings, event.sender);
    return writeProject(nextProject);
  } catch (error) {
    if (String(error.message || '').includes('canceled')) {
      throw error;
    }

    const failedProject = createFailedGenerationRecord(project, i2iScene, error.message, settings, 'novelai-i2i');
    await writeProject(failedProject);
    throw error;
  }
});

ipcMain.handle('project:novelAiInpaint', async (event, imageId, sceneOverride = null, maskDataUrl = '', strength = 1) => {
  const project = await readProject();
  const image = project.images.find((item) => item.id === imageId);

  if (!image) {
    throw new Error(`Image not found: ${imageId}`);
  }

  if (!maskDataUrl) {
    throw new Error('Inpaint mask is empty.');
  }

  const scene = project.scenes.find((item) => item.id === image.sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${image.sceneId}`);
  }

  const currentScene = sceneOverride && sceneOverride.id === scene.id
    ? {
      ...scene,
      ...sceneOverride,
      prompt: String(sceneOverride.prompt || '').trim() || scene.prompt || image.metadata?.prompt || '',
      negativePrompt: String(sceneOverride.negativePrompt || '').trim() || scene.negativePrompt || image.metadata?.negativePrompt || ''
    }
    : scene;

  const inpaintScene = {
    ...currentScene,
    prompt: currentScene.prompt || image.metadata?.prompt,
    negativePrompt: currentScene.negativePrompt || image.metadata?.negativePrompt,
    basePrompt: currentScene.basePrompt || image.metadata?.basePrompt,
    baseNegativePrompt: currentScene.baseNegativePrompt || image.metadata?.baseNegativePrompt,
    characterPromptsText: currentScene.characterPromptsText || image.metadata?.characterPromptsText,
    characterNegativePromptsText: currentScene.characterNegativePromptsText || image.metadata?.characterNegativePromptsText,
    characterPositionsText: currentScene.characterPositionsText || image.metadata?.characterPositionsText,
    status: 'prompt_approved'
  };
  const settings = {
    ...defaultGenerationSettings,
    ...(image.metadata || {}),
    ...(project.settings || {}),
    seed: '',
    inpaintStrength: normalizeInpaintStrength(strength),
    sourceImageId: image.id
  };

  try {
    const nextProject = await generateWithNovelAiInpaint(project, inpaintScene, image, maskDataUrl, strength, settings, event.sender);
    return writeProject(nextProject);
  } catch (error) {
    if (String(error.message || '').includes('canceled')) {
      throw error;
    }

    const failedProject = createFailedGenerationRecord(project, inpaintScene, error.message, settings, 'novelai-inpaint');
    await writeProject(failedProject);
    throw error;
  }
});

ipcMain.handle('project:novelAiGenerate', async (event, sceneId) => {
  const project = await readProject();
  const scene = project.scenes.find((item) => item.id === sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  if (!['prompt_approved', 'generated'].includes(scene.status)) {
    throw new Error('프롬프트를 먼저 승인하거나 저장한 뒤 생성해주세요.');
  }

  try {
    const nextProject = await generateWithNovelAi(project, scene, null, event.sender);
    return writeProject(nextProject);
  } catch (error) {
    if (String(error.message || '').includes('canceled')) {
      throw error;
    }

    const failedProject = createFailedGenerationRecord(project, scene, error.message, project.settings, 'novelai');
    await writeProject(failedProject);
    throw error;
  }
});

ipcMain.handle('project:cancelNovelAiGeneration', async () => {
  if (activeNovelAiAbortController) {
    activeNovelAiAbortController.abort();
  }

  return { canceled: true };
});

ipcMain.handle('project:importText', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import scene text',
    properties: ['openFile'],
    filters: [{ name: 'Text files', extensions: ['txt', 'md'] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const sourceText = await fs.readFile(filePath, 'utf8');
  const scenes = parseScenes(sourceText);
  const currentProject = await readProject();
  const paths = await ensureProjectDirs();
  const importedName = `${Date.now()}-${path.basename(filePath)}`;
  const importedPath = path.join(paths.importsDir, importedName);

  await fs.copyFile(filePath, importedPath);

  const project = {
    ...createEmptyProject(),
    settings: {
      ...defaultGenerationSettings,
      ...(currentProject.settings || {})
    },
    sourceFile: {
      originalPath: filePath,
      importedPath,
      importedAt: new Date().toISOString()
    },
    scenes
  };

  return writeProject(project);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
