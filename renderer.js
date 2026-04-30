const state = {
  project: null,
  selectedSceneId: null,
  selectedImageId: null,
  selectedCharacterPresetId: null,
  dirty: false,
  settingsDirty: false,
  generationInProgress: false,
  tagSearch: '',
  draftTags: [],
  draftNegativeTags: [],
  settings: null,
  secretStatus: null,
  updateInfo: null
};

const elements = {
  importButton: document.querySelector('#importButton'),
  sceneCount: document.querySelector('#sceneCount'),
  projectStatus: document.querySelector('#projectStatus'),
  sceneList: document.querySelector('#sceneList'),
  sceneTitle: document.querySelector('#sceneTitle'),
  sceneStatus: document.querySelector('#sceneStatus'),
  emptyState: document.querySelector('#emptyState'),
  sceneForm: document.querySelector('#sceneForm'),
  imageWorkbench: document.querySelector('#imageWorkbench'),
  selectedPreviewImage: document.querySelector('#selectedPreviewImage'),
  selectedImageTitle: document.querySelector('#selectedImageTitle'),
  selectedImageStatus: document.querySelector('#selectedImageStatus'),
  keepImageButton: document.querySelector('#keepImageButton'),
  rejectImageButton: document.querySelector('#rejectImageButton'),
  favoriteImageButton: document.querySelector('#favoriteImageButton'),
  novelAiVariationButton: document.querySelector('#novelAiVariationButton'),
  loadImagePromptButton: document.querySelector('#loadImagePromptButton'),
  imageNoteInput: document.querySelector('#imageNoteInput'),
  saveImageNoteButton: document.querySelector('#saveImageNoteButton'),
  selectedImagePrompt: document.querySelector('#selectedImagePrompt'),
  selectedImageNegative: document.querySelector('#selectedImageNegative'),
  selectedImageSettings: document.querySelector('#selectedImageSettings'),
  generateTagsButton: document.querySelector('#generateTagsButton'),
  organizeTagsButton: document.querySelector('#organizeTagsButton'),
  approvePromptButton: document.querySelector('#approvePromptButton'),
  sceneNoInput: document.querySelector('#sceneNoInput'),
  descriptionInput: document.querySelector('#descriptionInput'),
  tagSearchInput: document.querySelector('#tagSearchInput'),
  tagInput: document.querySelector('#tagInput'),
  addTagButton: document.querySelector('#addTagButton'),
  tagChips: document.querySelector('#tagChips'),
  negativeTagInput: document.querySelector('#negativeTagInput'),
  addNegativeTagButton: document.querySelector('#addNegativeTagButton'),
  negativeTagChips: document.querySelector('#negativeTagChips'),
  characterPromptsInput: document.querySelector('#characterPromptsInput'),
  characterNegativePromptsInput: document.querySelector('#characterNegativePromptsInput'),
  promptInput: document.querySelector('#promptInput'),
  negativePromptSection: document.querySelector('#negativePromptSection'),
  toggleNegativePromptButton: document.querySelector('#toggleNegativePromptButton'),
  negativePromptInput: document.querySelector('#negativePromptInput'),
  promptHighlightPreview: document.querySelector('#promptHighlightPreview'),
  negativePromptHighlightPreview: document.querySelector('#negativePromptHighlightPreview'),
  warningsPanel: document.querySelector('#warningsPanel'),
  warningsList: document.querySelector('#warningsList'),
  saveState: document.querySelector('#saveState'),
  saveButton: document.querySelector('#saveButton'),
  settingsSection: document.querySelector('#settingsSection'),
  toggleSettingsButton: document.querySelector('#toggleSettingsButton'),
  settingsForm: document.querySelector('#settingsForm'),
  apiKeyInput: document.querySelector('#apiKeyInput'),
  saveSettingsButton: document.querySelector('#saveSettingsButton'),
  clearApiKeyButton: document.querySelector('#clearApiKeyButton'),
  apiKeyStatus: document.querySelector('#apiKeyStatus'),
  checkUpdateButton: document.querySelector('#checkUpdateButton'),
  applyUpdateButton: document.querySelector('#applyUpdateButton'),
  updateStatus: document.querySelector('#updateStatus'),
  importTagDictionaryButton: document.querySelector('#importTagDictionaryButton'),
  tagDictionaryStatus: document.querySelector('#tagDictionaryStatus'),
  projectBasePromptInput: document.querySelector('#projectBasePromptInput'),
  projectBaseNegativePromptInput: document.querySelector('#projectBaseNegativePromptInput'),
  modelInput: document.querySelector('#modelInput'),
  endpointInput: document.querySelector('#endpointInput'),
  widthInput: document.querySelector('#widthInput'),
  heightInput: document.querySelector('#heightInput'),
  stepsInput: document.querySelector('#stepsInput'),
  scaleInput: document.querySelector('#scaleInput'),
  samplerInput: document.querySelector('#samplerInput'),
  cfgRescaleInput: document.querySelector('#cfgRescaleInput'),
  noiseScheduleInput: document.querySelector('#noiseScheduleInput'),
  seedInput: document.querySelector('#seedInput'),
  characterPresetList: document.querySelector('#characterPresetList'),
  characterPresetNameInput: document.querySelector('#characterPresetNameInput'),
  characterPresetPromptInput: document.querySelector('#characterPresetPromptInput'),
  characterPresetNegativeInput: document.querySelector('#characterPresetNegativeInput'),
  newCharacterPresetButton: document.querySelector('#newCharacterPresetButton'),
  saveCharacterPresetButton: document.querySelector('#saveCharacterPresetButton'),
  deleteCharacterPresetButton: document.querySelector('#deleteCharacterPresetButton'),
  copyCharacterPresetButton: document.querySelector('#copyCharacterPresetButton'),
  insertCharacterPresetButton: document.querySelector('#insertCharacterPresetButton'),
  novelAiGenerateButton: document.querySelector('#novelAiGenerateButton'),
  generationRunCountInput: document.querySelector('#generationRunCountInput'),
  generationStatus: document.querySelector('#generationStatus'),
  queueList: document.querySelector('#queueList'),
  galleryList: document.querySelector('#galleryList')
};

const statusLabels = {
  empty: '비어 있음',
  needs_review: '검토 필요',
  imported: '불러옴',
  tag_draft: '태그 초안',
  reviewed: '검토 완료',
  prompt_approved: '프롬프트 승인됨',
  generating: '생성 중',
  generated: '생성 완료',
  failed: '오류',
  candidate: '후보',
  keep: '채택',
  rejected: '보류'
};

function labelStatus(status) {
  return statusLabels[status] || status || '없음';
}
function normalizeTag(value) {
  return value.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

function parseWeightedTag(value) {
  const normalized = normalizeTag(String(value || ''));
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))::(.+)::$/);

  if (!match) {
    return {
      label: normalized,
      weight: 1,
      isWeighted: false
    };
  }

  const weight = Number(match[1]);

  return {
    label: normalizeTag(match[2]),
    weight: Number.isFinite(weight) ? weight : 1,
    isWeighted: true
  };
}

function formatWeight(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '1';
  }

  return String(Math.round(number * 10) / 10).replace(/\.0$/, '');
}

function formatWeightedTag(label, weight) {
  const normalizedLabel = normalizeTag(label);
  const normalizedWeight = Number(formatWeight(weight));

  if (!normalizedLabel) {
    return '';
  }

  if (!Number.isFinite(normalizedWeight) || normalizedWeight === 1) {
    return normalizedLabel;
  }

  return `${formatWeight(normalizedWeight)}::${normalizedLabel}::`;
}

function getTagSortLabel(tag) {
  return parseWeightedTag(tag).label;
}

function uniqueTags(tags) {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))];
}

const promptTagOrder = [
  ['1girl', '1boy', 'multiple girls', 'solo'],
  ['cowboy shot', 'bust shot', 'upper body', 'close-up', 'wide shot', 'side view', 'from side', 'from above', 'from below', 'pov', 'dutch angle', 'looking at another', 'looking at viewer', 'looking back'],
  ['indoors', 'outdoors', 'bedroom', 'bed', 'table', 'school', 'classroom', 'market street', 'city street', 'forest', 'night', 'sunset', 'rain'],
  ['standing', 'walking', 'sitting', 'kneeling', 'lying', 'leaning forward', 'arms around shoulders', 'holding hands', 'waving', 'hands behind back', 'hair flip', 'pointing', 'wink', 'whispering', 'background crowd'],
  ['smile', 'angry', 'glaring', 'scared', 'surprised', 'embarrassed', 'drunk', 'blush', 'tears'],
  ['breasts', 'breast focus', 'ass focus', 'cropped torso', 'face out of frame', 'cropped face', 'highly detailed'],
  ['holding phone', 'smartphone', 'drinking', 'undressing', 'covering self']
];

const promptTagRank = promptTagOrder.reduce((acc, group, groupIndex) => {
  group.forEach((tag, tagIndex) => {
    acc[tag] = groupIndex * 100 + tagIndex;
  });
  return acc;
}, {});

function orderPromptTags(tags) {
  return uniqueTags(tags).sort((left, right) => {
    const leftLabel = getTagSortLabel(left);
    const rightLabel = getTagSortLabel(right);
    const leftRank = promptTagRank[leftLabel] ?? 9000;
    const rightRank = promptTagRank[rightLabel] ?? 9000;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return leftLabel.localeCompare(rightLabel);
  });
}

function getSelectedScene() {
  return state.project?.scenes.find((scene) => scene.id === state.selectedSceneId) || null;
}

function getSelectedImage() {
  return state.project?.images.find((image) => image.id === state.selectedImageId) || null;
}

function getLatestSceneImageId(sceneId) {
  const sceneImages = (state.project?.images || []).filter((image) => image.sceneId === sceneId);
  return sceneImages[sceneImages.length - 1]?.id || null;
}

function selectLatestSceneImage(sceneId) {
  const latestImageId = getLatestSceneImageId(sceneId);

  if (latestImageId) {
    state.selectedImageId = latestImageId;
  }
}

function setDirty(isDirty) {
  state.dirty = isDirty;
  elements.saveState.textContent = isDirty ? '??λ릺吏 ?딆? 蹂寃??덉쓬' : '??λ맖';
}

function setGenerationStatus(status, message) {
  elements.generationStatus.textContent = message;
  elements.generationStatus.className = `generation-status ${status}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGenerationRunCount() {
  const count = Number.parseInt(elements.generationRunCountInput.value, 10);

  if (!Number.isFinite(count)) {
    return 5;
  }

  return Math.min(Math.max(count, 1), 50);
}

function syncPromptFromTags() {
  refreshPromptPreview();
}

function buildCombinedPrompt(basePrompt, draftTags, characterPromptsText) {
  const parts = [
    basePrompt.trim(),
    ...orderPromptTags(draftTags),
    ...characterPromptsText.split('\n').map((line) => line.trim()).filter(Boolean)
  ];
  return parts.filter(Boolean).join(', ');
}

function getComputedPromptPreviews() {
  return {
    prompt: buildCombinedPrompt(
    state.settings?.basePrompt || '',
    state.draftTags,
    elements.characterPromptsInput.value
    ),
    negativePrompt: buildCombinedPrompt(
      state.settings?.baseNegativePrompt || '',
      state.draftNegativeTags,
      elements.characterNegativePromptsInput.value
    )
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHighlightedText(value, query) {
  const text = String(value || '');
  const trimmedQuery = String(query || '').trim();

  if (!text) {
    return '?꾨＼?꾪듃媛 鍮꾩뼱 ?덉뒿?덈떎.';
  }

  if (!trimmedQuery) {
    return escapeHtml(text);
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();
  const parts = [];
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, cursor);

  while (matchIndex !== -1) {
    parts.push(escapeHtml(text.slice(cursor, matchIndex)));
    parts.push(`<mark>${escapeHtml(text.slice(matchIndex, matchIndex + trimmedQuery.length))}</mark>`);
    cursor = matchIndex + trimmedQuery.length;
    matchIndex = lowerText.indexOf(lowerQuery, cursor);
  }

  parts.push(escapeHtml(text.slice(cursor)));
  return parts.join('');
}

function renderPromptHighlights() {
  const query = state.tagSearch;
  const prompt = elements.promptInput.value;
  const negativePrompt = elements.negativePromptInput.value;

  elements.promptHighlightPreview.classList.toggle('is-empty', !prompt);
  elements.negativePromptHighlightPreview.classList.toggle('is-empty', !negativePrompt);
  elements.promptHighlightPreview.innerHTML = renderHighlightedText(prompt, query);
  elements.negativePromptHighlightPreview.innerHTML = renderHighlightedText(negativePrompt, query);
}

function toggleNegativePromptPreview() {
  const isCollapsed = elements.negativePromptSection.classList.toggle('collapsed');
  elements.toggleNegativePromptButton.textContent = isCollapsed ? '펼치기' : '접기';
  elements.toggleNegativePromptButton.setAttribute('aria-expanded', String(!isCollapsed));
}

function refreshPromptPreview() {
  const computed = getComputedPromptPreviews();
  elements.promptInput.value = computed.prompt;
  elements.negativePromptInput.value = computed.negativePrompt;
  renderPromptHighlights();
}

function renderPromptPreviewForScene(scene) {
  const computed = getComputedPromptPreviews();
  elements.promptInput.value = scene.prompt || computed.prompt;
  elements.negativePromptInput.value = scene.negativePrompt || computed.negativePrompt;
  renderPromptHighlights();
}

function renderProjectMeta() {
  const scenes = state.project?.scenes || [];
  elements.sceneCount.textContent = `${scenes.length}개 씬`;
  elements.projectStatus.textContent = state.project?.sourceFile ? '불러온 프로젝트' : '불러온 프로젝트 없음';
}

function renderSettings() {
  const settings = state.settings || {};

  elements.modelInput.value = settings.model || '';
  elements.endpointInput.value = settings.endpoint || '';
  elements.widthInput.value = settings.width || '';
  elements.heightInput.value = settings.height || '';
  elements.stepsInput.value = settings.steps || '';
  elements.scaleInput.value = settings.scale || '';
  elements.samplerInput.value = settings.sampler || '';
  elements.cfgRescaleInput.value = settings.cfgRescale ?? '';
  elements.noiseScheduleInput.value = settings.noiseSchedule || '';
  elements.seedInput.value = settings.seed || '';
  elements.projectBasePromptInput.value = settings.basePrompt || '';
  elements.projectBaseNegativePromptInput.value = settings.baseNegativePrompt || '';

  const hasKey = Boolean(state.secretStatus?.hasApiKey);
  const encrypted = Boolean(state.secretStatus?.encryptionAvailable);
  elements.apiKeyStatus.textContent = hasKey
    ? `API 키 저장됨${encrypted ? ' (OS 암호화)' : ' (암호화 미사용)'}`
    : '저장된 API 키 없음';
  elements.apiKeyStatus.className = `secret-status${hasKey ? ' has-key' : ''}`;
  elements.tagDictionaryStatus.textContent = `태그 사전 ${(settings.customTagRules || []).length}개`;
  renderCharacterPromptLibrary();
}

function toggleSettings() {
  const collapsed = elements.settingsSection.classList.toggle('collapsed');
  elements.toggleSettingsButton.textContent = collapsed ? '펼치기' : '접기';
}

function setUpdateStatus(message, isUpdateAvailable = false) {
  elements.updateStatus.textContent = message;
  elements.updateStatus.className = `secret-status${isUpdateAvailable ? ' has-key' : ''}`;
}

async function checkForUpdates() {
  elements.checkUpdateButton.disabled = true;
  elements.applyUpdateButton.disabled = true;
  setUpdateStatus('GitHub Releases에서 최신 버전 확인 중...');

  try {
    const info = await window.dongsan.checkForUpdates();
    state.updateInfo = info;

    if (info.updateAvailable) {
      elements.applyUpdateButton.disabled = false;
      setUpdateStatus(`새 버전 ${info.latestVersion} 사용 가능 (현재 ${info.currentVersion})`, true);
      return;
    }

    setUpdateStatus(`최신 버전입니다 (${info.currentVersion})`);
  } catch (error) {
    state.updateInfo = null;
    setUpdateStatus(error.message);
  } finally {
    elements.checkUpdateButton.disabled = false;
  }
}

async function applyUpdate() {
  if (!state.updateInfo?.updateAvailable) {
    await checkForUpdates();
  }

  if (!state.updateInfo?.updateAvailable) {
    return;
  }

  const confirmed = window.confirm('git pull로 최신 버전을 적용한 뒤 앱을 자동 재시작할까요?');
  if (!confirmed) {
    return;
  }

  elements.checkUpdateButton.disabled = true;
  elements.applyUpdateButton.disabled = true;
  setUpdateStatus('업데이트 적용 중... 앱이 곧 재시작됩니다.');

  try {
    await window.dongsan.applyUpdate();
  } catch (error) {
    setUpdateStatus(error.message);
    elements.checkUpdateButton.disabled = false;
    elements.applyUpdateButton.disabled = false;
  }
}
function renderSceneList() {
  const scenes = state.project?.scenes || [];
  elements.sceneList.innerHTML = '';

  scenes.forEach((scene) => {
    const item = document.createElement('button');
    const body = document.createElement('div');
    const title = document.createElement('strong');
    const description = document.createElement('span');
    const status = document.createElement('span');

    item.type = 'button';
    item.className = `scene-item${scene.id === state.selectedSceneId ? ' active' : ''}`;
    title.textContent = String(scene.sceneNo) + '번 씬';
    description.textContent = scene.description || '장면 묘사 없음';
    status.className = `scene-status-label ${scene.status || 'empty'}`;
    status.textContent = labelStatus(scene.status);

    body.append(title, description);
    item.append(body, status);
    item.addEventListener('click', () => {
      state.selectedSceneId = scene.id;
      state.selectedImageId = null;
      setDirty(false);
      render();
    });
    elements.sceneList.appendChild(item);
  });
}
function updateTagAtIndex(target, index, nextTag) {
  if (target === 'positive') {
    state.draftTags = state.draftTags.map((tag, tagIndex) => tagIndex === index ? nextTag : tag);
  } else {
    state.draftNegativeTags = state.draftNegativeTags.map((tag, tagIndex) => tagIndex === index ? nextTag : tag);
  }

  syncPromptFromTags();
  setDirty(true);
  renderTagChips();
}

function removeTagAtIndex(target, index) {
  if (target === 'positive') {
    state.draftTags = state.draftTags.filter((_tag, tagIndex) => tagIndex !== index);
  } else {
    state.draftNegativeTags = state.draftNegativeTags.filter((_tag, tagIndex) => tagIndex !== index);
  }

  syncPromptFromTags();
  setDirty(true);
  renderTagChips();
}

function createChip(tag, index, target, isSearchMatch = false) {
  const parsed = parseWeightedTag(tag);
  const chip = document.createElement('div');
  const name = document.createElement('span');
  const controls = document.createElement('span');
  const weightInput = document.createElement('input');
  const removeButton = document.createElement('button');

  chip.className = `tag-chip${isSearchMatch ? ' search-match' : ''}`;
  name.className = 'tag-chip-name';
  name.textContent = parsed.label;
  name.title = tag;

  controls.className = 'tag-weight-controls';

  weightInput.type = 'number';
  weightInput.className = 'tag-weight-input';
  weightInput.step = '0.1';
  weightInput.value = formatWeight(parsed.weight);
  weightInput.title = 'NovelAI 媛以묒튂. 1? ?쇰컲 ?쒓렇, -1? ?듭젣 ?쒓렇?낅땲??';

  removeButton.type = 'button';
  removeButton.className = 'tag-remove-button';
  removeButton.textContent = '횞';
  removeButton.title = '?쒓렇 ?쒓굅';

  const commitWeight = (nextWeight) => {
    updateTagAtIndex(target, index, formatWeightedTag(parsed.label, nextWeight));
  };

  weightInput.addEventListener('change', () => {
    commitWeight(weightInput.value);
  });

  weightInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitWeight(weightInput.value);
    }
  });

  removeButton.addEventListener('click', () => {
    removeTagAtIndex(target, index);
  });

  controls.append(weightInput, removeButton);
  chip.append(name, controls);
  return chip;
}

function renderTagEmpty(target, text) {
  const empty = document.createElement('span');
  empty.className = 'tag-empty';
  empty.textContent = text;
  target.appendChild(empty);
}

function renderTagChips() {
  elements.tagChips.innerHTML = '';
  elements.negativeTagChips.innerHTML = '';
  const query = state.tagSearch.trim().toLowerCase();

  if (state.draftTags.length === 0) {
    renderTagEmpty(elements.tagChips, '?꾩쭅 ?쒓렇 珥덉븞???놁뒿?덈떎');
  }

  if (state.draftNegativeTags.length === 0) {
    renderTagEmpty(elements.negativeTagChips, '?꾩쭅 ?ㅺ굅?곕툕 ?쒓렇媛 ?놁뒿?덈떎');
  }

  state.draftTags.forEach((tag, index) => {
    const parsed = parseWeightedTag(tag);
    const isSearchMatch = Boolean(query && (
      tag.toLowerCase().includes(query) || parsed.label.toLowerCase().includes(query)
    ));
    elements.tagChips.appendChild(createChip(tag, index, 'positive', isSearchMatch));
  });

  state.draftNegativeTags.forEach((tag, index) => {
    const parsed = parseWeightedTag(tag);
    const isSearchMatch = Boolean(query && (
      tag.toLowerCase().includes(query) || parsed.label.toLowerCase().includes(query)
    ));
    elements.negativeTagChips.appendChild(createChip(tag, index, 'negative', isSearchMatch));
  });
}

function renderWarnings(scene) {
  elements.warningsList.innerHTML = '';

  if (!scene.parserWarnings || scene.parserWarnings.length === 0) {
    elements.warningsPanel.classList.add('hidden');
    return;
  }

  scene.parserWarnings.forEach((warning) => {
    const item = document.createElement('li');
    item.textContent = warning;
    elements.warningsList.appendChild(item);
  });

  elements.warningsPanel.classList.remove('hidden');
}

function renderQueueAndGallery() {
  const scene = getSelectedScene();
  const jobs = state.project?.generationJobs || [];
  const images = state.project?.images || [];
  const sceneJobs = scene ? jobs.filter((job) => job.sceneId === scene.id) : [];
  const sceneImages = scene ? images.filter((image) => image.sceneId === scene.id) : [];

  if (sceneImages.length > 0 && !sceneImages.some((image) => image.id === state.selectedImageId)) {
    state.selectedImageId = sceneImages[sceneImages.length - 1].id;
  }

  elements.novelAiGenerateButton.disabled = !scene || !state.secretStatus?.hasApiKey || state.generationInProgress;
  elements.queueList.innerHTML = '';
  elements.galleryList.innerHTML = '';

  if (!scene) {
    elements.queueList.appendChild(createEmptyPanel('?곹깭瑜?蹂대젮硫??ъ쓣 ?좏깮?섏꽭??'));
    elements.galleryList.appendChild(createEmptyPanel('?대?吏瑜?蹂대젮硫??ъ쓣 ?좏깮?섏꽭??'));
    return;
  }

  if (sceneJobs.length === 0) {
    elements.queueList.appendChild(createEmptyPanel('?꾩쭅 ?앹꽦 ?묒뾽???놁뒿?덈떎.'));
  } else {
    sceneJobs.slice().reverse().forEach((job) => {
      const item = document.createElement('article');
      item.className = 'queue-item';
      const title = document.createElement('strong');
      const meta = document.createElement('span');
      title.textContent = String(scene.sceneNo) + '번 씬';
      meta.textContent = new Date(job.createdAt).toLocaleString();
      item.append(title, meta);
      elements.queueList.appendChild(item);
    });
  }

  if (sceneImages.length === 0) {
    elements.galleryList.appendChild(createEmptyPanel('???ъ뿉 ?곌껐???대?吏媛 ?놁뒿?덈떎.'));
  } else {
    sceneImages.slice().reverse().forEach((image) => {
      const card = document.createElement('article');
      const preview = document.createElement('img');
      const caption = document.createElement('span');
      const note = document.createElement('span');
      const badge = document.createElement('span');
      const imageStatus = image.status || 'candidate';
      card.className = 'gallery-card';
      if (image.id === state.selectedImageId) {
        card.classList.add('selected');
      }
      badge.className = `gallery-status ${imageStatus}`;
      badge.textContent = labelStatus(imageStatus);
      preview.src = image.uri;
      preview.alt = String(scene.sceneNo) + '번 씬 생성 이미지 미리보기';
      caption.textContent = (image.metadata?.model || '모델 없음') + ' / ' + (image.metadata?.width || '-') + 'x' + (image.metadata?.height || '-');
      card.append(preview, badge, caption);
      if (image.note) {
        note.className = 'gallery-note';
        note.textContent = image.note;
        note.title = image.note;
        card.appendChild(note);
      }
      card.addEventListener('click', () => {
        state.selectedImageId = image.id;
        renderSelectedImage();
        renderQueueAndGallery();
      });
      elements.galleryList.appendChild(card);
    });
  }

  renderSelectedImage();
}

function createEmptyPanel(text) {
  const panel = document.createElement('div');
  panel.className = 'queue-empty';
  panel.textContent = text;
  return panel;
}

function renderSceneForm() {
  const scene = getSelectedScene();

  if (!scene) {
    elements.sceneTitle.textContent = '씬 파일을 불러와주세요';
    elements.sceneStatus.textContent = '비어 있음';
    elements.sceneStatus.className = 'status-pill';
    elements.emptyState.classList.remove('hidden');
    elements.sceneForm.classList.add('hidden');
    state.draftTags = [];
    state.draftNegativeTags = [];
    state.selectedImageId = null;
    renderSelectedImage();
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.sceneForm.classList.remove('hidden');
  elements.sceneTitle.textContent = String(scene.sceneNo) + '번 씬';
  elements.sceneStatus.textContent = labelStatus(scene.status);
  elements.sceneStatus.className = `status-pill ${scene.status}`;
  elements.sceneNoInput.value = scene.sceneNo || '';
  elements.descriptionInput.value = scene.description || '';
  elements.characterPromptsInput.value = scene.characterPromptsText || '';
  elements.characterNegativePromptsInput.value = scene.characterNegativePromptsText || '';
  state.draftTags = uniqueTags(scene.tags || []);
  state.draftNegativeTags = uniqueTags(scene.negativeTags || []);
  renderPromptPreviewForScene(scene);
  renderTagChips();
  renderWarnings(scene);
  renderQueueAndGallery();
}
function renderSelectedImage() {
  const image = getSelectedImage();
  const scene = getSelectedScene();

  if (!scene || !image) {
    elements.imageWorkbench.classList.add('hidden');
    elements.selectedPreviewImage.removeAttribute('src');
    return;
  }

  elements.imageWorkbench.classList.remove('hidden');
  elements.selectedPreviewImage.src = image.uri;
  elements.selectedImageTitle.textContent = `Scene ${scene.sceneNo}`;
  elements.selectedImageStatus.textContent = labelStatus(image.status || 'candidate');
  elements.selectedImageStatus.className = `status-pill ${image.status || 'candidate'}`;
  elements.imageNoteInput.value = image.note || '';
  elements.favoriteImageButton.textContent = image.favorite ? '즐겨찾기 해제' : '즐겨찾기';
  elements.novelAiVariationButton.disabled = !state.secretStatus?.hasApiKey;
  elements.novelAiVariationButton.title = state.secretStatus?.hasApiKey
    ? '선택 이미지의 프롬프트와 설정으로 다시 생성합니다'
    : 'NovelAI API 키를 저장해야 사용할 수 있습니다';
  elements.selectedImagePrompt.textContent = image.metadata?.prompt || '';
  elements.selectedImageNegative.textContent = image.metadata?.negativePrompt || '';
  elements.selectedImageSettings.textContent = [
    image.metadata?.model,
    `${image.metadata?.width || '-'}x${image.metadata?.height || '-'}`,
    `steps ${image.metadata?.steps ?? '-'}`,
    `scale ${image.metadata?.scale ?? '-'}`,
    image.metadata?.sampler,
    `seed ${image.metadata?.seed ?? '-'}`
  ].filter(Boolean).join(' / ');
}
function render() {
  renderProjectMeta();
  renderSettings();
  renderSceneList();
  renderSceneForm();
  if (!getSelectedScene()) {
    renderQueueAndGallery();
  }
}

async function loadProject() {
  state.project = await window.dongsan.loadProject();
  const settingsPayload = await window.dongsan.loadSettings();
  state.settings = settingsPayload.settings;
  state.secretStatus = settingsPayload.secretStatus;
  state.selectedSceneId = state.project.scenes[0]?.id || null;
  state.selectedImageId = null;
  state.settingsDirty = false;
  setDirty(false);
  render();
}

async function importText() {
  await persistSettingsIfDirty();
  const project = await window.dongsan.importText();

  if (!project) {
    return;
  }

  state.project = project;
  state.settings = project.settings || state.settings;
  state.selectedSceneId = project.scenes[0]?.id || null;
  state.selectedImageId = null;
  state.settingsDirty = false;
  setDirty(false);
  render();
}

function readSettingsFromForm() {
  return {
    provider: 'mock',
    endpoint: elements.endpointInput.value.trim() || 'https://image.novelai.net/ai/generate-image',
    model: elements.modelInput.value.trim() || 'nai-diffusion-4-5-full',
    width: Number(elements.widthInput.value) || 1280,
    height: Number(elements.heightInput.value) || 768,
    steps: Number(elements.stepsInput.value) || 28,
    scale: Number(elements.scaleInput.value) || 6.8,
    sampler: elements.samplerInput.value.trim() || 'Euler Ancestral',
    cfgRescale: Number(elements.cfgRescaleInput.value) || 0.5,
    noiseSchedule: elements.noiseScheduleInput.value.trim() || 'karras',
    seed: elements.seedInput.value.trim(),
    imageCount: 1,
    basePrompt: elements.projectBasePromptInput.value.trim(),
    baseNegativePrompt: elements.projectBaseNegativePromptInput.value.trim(),
    customTagRules: state.settings?.customTagRules || [],
    characterPromptPresets: state.settings?.characterPromptPresets || []
  };
}

function buildSettingsPayload() {
  const payload = {
    settings: readSettingsFromForm()
  };

  if (elements.apiKeyInput.value.trim()) {
    payload.apiKey = elements.apiKeyInput.value.trim();
  }

  return payload;
}

async function saveSettings(event, options = {}) {
  if (event) {
    event.preventDefault();
  }

  const previousPrompt = elements.promptInput.value;
  const previousNegativePrompt = elements.negativePromptInput.value;
  const result = await window.dongsan.saveSettings(buildSettingsPayload());
  state.settings = result.settings;
  state.secretStatus = result.secretStatus;
  state.settingsDirty = false;
  elements.apiKeyInput.value = '';
  renderSettings();

  if (options.preservePromptInputs) {
    elements.promptInput.value = previousPrompt;
    elements.negativePromptInput.value = previousNegativePrompt;
    renderPromptHighlights();
  } else {
    refreshPromptPreview();
  }
}

async function persistSettingsIfDirty() {
  if (!state.settingsDirty && !elements.apiKeyInput.value.trim()) {
    return;
  }

  await saveSettings(null, { preservePromptInputs: true });
}

async function clearApiKey() {
  state.secretStatus = await window.dongsan.clearApiKey();
  elements.apiKeyInput.value = '';
  renderSettings();
}

async function importTagDictionary() {
  await persistSettingsIfDirty();
  const result = await window.dongsan.importTagDictionary();

  if (!result) {
    return;
  }

  state.settings = result.settings;
  state.secretStatus = result.secretStatus;
  state.settingsDirty = false;
  renderSettings();
  refreshPromptPreview();
  setGenerationStatus('done', '태그 사전 ' + result.importedCount + '개 불러옴 / 총 ' + result.totalCount + '개');
}

function getCharacterPresets() {
  return Array.isArray(state.settings?.characterPromptPresets)
    ? state.settings.characterPromptPresets
    : [];
}

function getSelectedCharacterPreset() {
  return getCharacterPresets().find((preset) => preset.id === state.selectedCharacterPresetId) || null;
}

function clearCharacterPresetEditor() {
  state.selectedCharacterPresetId = null;
  elements.characterPresetNameInput.value = '';
  elements.characterPresetPromptInput.value = '';
  elements.characterPresetNegativeInput.value = '';
  renderCharacterPromptLibrary();
}

function renderCharacterPromptLibrary() {
  const presets = getCharacterPresets();
  elements.characterPresetList.innerHTML = '';

  if (presets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'preset-empty';
    empty.textContent = '??λ맂 罹먮┃???꾨＼?꾪듃媛 ?놁뒿?덈떎';
    elements.characterPresetList.appendChild(empty);
    return;
  }

  presets.forEach((preset) => {
    const item = document.createElement('button');
    const title = document.createElement('strong');
    const preview = document.createElement('span');

    item.type = 'button';
    item.className = `preset-item${preset.id === state.selectedCharacterPresetId ? ' active' : ''}`;
    title.textContent = String(scene.sceneNo) + '번 씬';
    preview.textContent = preset.prompt || '?꾨＼?꾪듃 ?놁쓬';
    item.append(title, preview);
    item.addEventListener('click', () => {
      state.selectedCharacterPresetId = preset.id;
      elements.characterPresetNameInput.value = preset.name || '';
      elements.characterPresetPromptInput.value = preset.prompt || '';
      elements.characterPresetNegativeInput.value = preset.negativePrompt || '';
      renderCharacterPromptLibrary();
    });
    elements.characterPresetList.appendChild(item);
  });
}

async function persistCharacterPresets(nextPresets, message) {
  state.settings = {
    ...(state.settings || {}),
    characterPromptPresets: nextPresets
  };
  state.settingsDirty = true;
  await saveSettings(null, { preservePromptInputs: true });
  renderCharacterPromptLibrary();
  setGenerationStatus('done', message);
}

async function saveCharacterPreset() {
  const name = elements.characterPresetNameInput.value.trim();
  const prompt = elements.characterPresetPromptInput.value.trim();
  const negativePrompt = elements.characterPresetNegativeInput.value.trim();

  if (!name && !prompt && !negativePrompt) {
    setGenerationStatus('error', '??ν븷 罹먮┃???꾨＼?꾪듃瑜??낅젰?섏꽭??');
    return;
  }

  const presets = getCharacterPresets();
  const id = state.selectedCharacterPresetId || `character-preset-${Date.now()}`;
  const nextPreset = {
    id,
    name: name || '?대쫫 ?놁쓬',
    prompt,
    negativePrompt,
    updatedAt: new Date().toISOString()
  };
  const nextPresets = presets.some((preset) => preset.id === id)
    ? presets.map((preset) => preset.id === id ? nextPreset : preset)
    : [...presets, nextPreset];

  state.selectedCharacterPresetId = id;
  await persistCharacterPresets(nextPresets, '罹먮┃???꾨＼?꾪듃 ????꾨즺');
}

async function deleteCharacterPreset() {
  const preset = getSelectedCharacterPreset();

  if (!preset) {
    setGenerationStatus('error', '??젣???꾨━?뗭쓣 ?좏깮?섏꽭??');
    return;
  }

  const nextPresets = getCharacterPresets().filter((item) => item.id !== preset.id);
  state.selectedCharacterPresetId = null;
  elements.characterPresetNameInput.value = '';
  elements.characterPresetPromptInput.value = '';
  elements.characterPresetNegativeInput.value = '';
  await persistCharacterPresets(nextPresets, '罹먮┃???꾨＼?꾪듃 ??젣 ?꾨즺');
}

function appendLineValue(currentValue, value) {
  const lines = currentValue.split('\n').map((line) => line.trim()).filter(Boolean);

  if (!lines.includes(value)) {
    lines.push(value);
  }

  return lines.join('\n');
}

function insertCharacterPreset() {
  const prompt = elements.characterPresetPromptInput.value.trim();
  const negativePrompt = elements.characterPresetNegativeInput.value.trim();

  if (!prompt && !negativePrompt) {
    setGenerationStatus('error', '?ｌ쓣 罹먮┃???꾨＼?꾪듃瑜??좏깮?섍굅???낅젰?섏꽭??');
    return;
  }

  if (prompt) {
    elements.characterPromptsInput.value = appendLineValue(elements.characterPromptsInput.value, prompt);
  }

  if (negativePrompt) {
    elements.characterNegativePromptsInput.value = appendLineValue(elements.characterNegativePromptsInput.value, negativePrompt);
  }

  refreshPromptPreview();
  setDirty(true);
  setGenerationStatus('done', '현재 씬에 캐릭터 프롬프트를 넣었습니다');
}

async function copyCharacterPreset() {
  const prompt = elements.characterPresetPromptInput.value.trim();
  const negativePrompt = elements.characterPresetNegativeInput.value.trim();
  const text = [
    prompt,
    negativePrompt ? `Negative: ${negativePrompt}` : ''
  ].filter(Boolean).join('\n');

  if (!text) {
    setGenerationStatus('error', '蹂듭궗??罹먮┃???꾨＼?꾪듃媛 ?놁뒿?덈떎.');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setGenerationStatus('done', '罹먮┃???꾨＼?꾪듃 蹂듭궗 ?꾨즺');
  } catch (_error) {
    elements.characterPresetPromptInput.focus();
    elements.characterPresetPromptInput.select();
    setGenerationStatus('error', '?대┰蹂대뱶 蹂듭궗 ?ㅽ뙣. ?꾨＼?꾪듃 移몄쓣 ?좏깮?대몢?덉뒿?덈떎.');
  }
}

function buildSceneFromForm(scene, statusOverride) {
  const tags = uniqueTags(state.draftTags);
  const negativeTags = uniqueTags(state.draftNegativeTags);
  const basePrompt = state.settings?.basePrompt || '';
  const baseNegativePrompt = state.settings?.baseNegativePrompt || '';
  const characterPromptsText = elements.characterPromptsInput.value.trim();
  const characterNegativePromptsText = elements.characterNegativePromptsInput.value.trim();
  const combinedPrompt = buildCombinedPrompt(basePrompt, tags, characterPromptsText);
  const combinedNegativePrompt = buildCombinedPrompt(baseNegativePrompt, negativeTags, characterNegativePromptsText);
  const prompt = elements.promptInput.value.trim() || combinedPrompt;
  const negativePrompt = elements.negativePromptInput.value.trim() || combinedNegativePrompt;

  return {
    ...scene,
    sceneNo: elements.sceneNoInput.value.trim() || scene.sceneNo,
    description: elements.descriptionInput.value.trim(),
    tags,
    negativeTags,
    basePrompt,
    baseNegativePrompt,
    characterPromptsText,
    characterNegativePromptsText,
    prompt,
    negativePrompt,
    status: statusOverride || (scene.status === 'needs_review' ? 'reviewed' : scene.status)
  };
}

async function persistScene(scene, statusOverride) {
  await persistSettingsIfDirty();
  const nextScene = buildSceneFromForm(scene, statusOverride);
  state.project = await window.dongsan.saveScene(nextScene);
  state.selectedSceneId = nextScene.id;
  setDirty(false);
  render();
}

async function saveSelectedScene(event) {
  event.preventDefault();

  const scene = getSelectedScene();
  if (!scene) {
    return;
  }

  await persistScene(scene);
}

async function generateTagsForSelectedScene() {
  const scene = getSelectedScene();
  if (!scene) {
    return;
  }

  await persistSettingsIfDirty();

  if (state.dirty) {
    await persistScene(scene);
  }

  state.project = await window.dongsan.generateTags(scene.id);
  state.selectedSceneId = scene.id;
  setDirty(false);
  render();
}

async function approvePromptForSelectedScene() {
  const scene = getSelectedScene();
  if (!scene) {
    return;
  }

  await persistSettingsIfDirty();
  await persistScene(scene, 'prompt_approved');
  setGenerationStatus('done', '현재 씬에 캐릭터 프롬프트를 넣었습니다');
}

async function prepareSceneForGeneration() {
  const scene = getSelectedScene();
  if (!scene) {
    return null;
  }

  await persistSettingsIfDirty();
  await persistScene(scene, 'prompt_approved');
  return getSelectedScene();
}

async function mockGenerateSelectedScene() {
  const scene = await prepareSceneForGeneration();
  if (!scene) {
    return;
  }

  try {
    setGenerationStatus('running', '?꾩옱 ?꾨＼?꾪듃 ??????뚯뒪???대?吏 ?앹꽦 以?..');
    state.project = await window.dongsan.mockGenerate(scene.id);
    state.selectedSceneId = scene.id;
    selectLatestSceneImage(scene.id);
    setDirty(false);
    render();
    setGenerationStatus('done', '?뚯뒪???대?吏 ?앹꽦 ?꾨즺');
  } catch (error) {
    setGenerationStatus('error', error.message);
  }
}

async function novelAiGenerateSelectedScene() {
  const scene = await prepareSceneForGeneration();
  if (!scene) {
    return;
  }

  const runCount = getGenerationRunCount();

  try {
    state.generationInProgress = true;
    renderQueueAndGallery();

    for (let index = 0; index < runCount; index += 1) {
      setGenerationStatus('running', `NovelAI ?앹꽦 以?.. (${index + 1}/${runCount})`);
      state.project = await window.dongsan.novelAiGenerate(scene.id);
      state.selectedSceneId = scene.id;
      selectLatestSceneImage(scene.id);
      setDirty(false);
      render();

      if (index < runCount - 1) {
        setGenerationStatus('running', `?ㅼ쓬 ?앹꽦源뚯? 0.5珥??湲?以?.. (${index + 1}/${runCount} ?꾨즺)`);
        await wait(500);
      }
    }

    setGenerationStatus('done', `NovelAI ?곗냽 ?앹꽦 ?꾨즺 (${runCount}/${runCount})`);
  } catch (error) {
    elements.projectStatus.textContent = error.message;
    setGenerationStatus('error', error.message);
    state.project = await window.dongsan.loadProject();
    state.selectedSceneId = scene.id;
    setDirty(false);
    render();
  } finally {
    state.generationInProgress = false;
    renderQueueAndGallery();
  }
}

async function updateSelectedImage(patch) {
  const image = getSelectedImage();

  if (!image) {
    return;
  }

  state.project = await window.dongsan.updateImage(image.id, patch);
  state.selectedImageId = image.id;
  render();
}

async function keepAndExportSelectedImage() {
  const image = getSelectedImage();

  if (!image) {
    return;
  }

  try {
    setGenerationStatus('running', '梨꾪깮 ?대?吏 ????꾩튂 ?좏깮 以?..');
    const result = await window.dongsan.keepAndExportImage(image.id);

    if (result.canceled) {
      setGenerationStatus('idle', 'PNG 내보내기 취소됨');
      return;
    }

    state.project = result.project;
    state.selectedImageId = image.id;
    render();
    setGenerationStatus('done', '梨꾪깮 ?대?吏 PNG ?대낫?닿린 ?꾨즺');
  } catch (error) {
    elements.projectStatus.textContent = error.message;
    setGenerationStatus('error', error.message);
  }
}

async function saveSelectedImageNote() {
  await updateSelectedImage({ note: elements.imageNoteInput.value.trim() });
  setGenerationStatus('done', '硫붾え ????꾨즺');
}

async function rejectSelectedImage() {
  await updateSelectedImage({ status: 'rejected' });
  setGenerationStatus('done', '?대?吏 蹂대쪟 泥섎━ ?꾨즺');
}

async function toggleFavoriteSelectedImage() {
  const image = getSelectedImage();

  if (!image) {
    return;
  }

  await updateSelectedImage({ favorite: !image.favorite });
  setGenerationStatus('done', image.favorite ? '利먭꺼李얘린 ?댁젣 ?꾨즺' : '利먭꺼李얘린 異붽? ?꾨즺');
}

async function novelAiVariationFromSelectedImage() {
  const image = getSelectedImage();
  const scene = getSelectedScene();

  if (!image || !scene) {
    setGenerationStatus('error', '?ъ깮?깊븷 ?대?吏 ?꾨＼?꾪듃瑜?癒쇱? ?좏깮?섏꽭??');
    return;
  }

  if (typeof window.dongsan.novelAiVariation !== 'function') {
    setGenerationStatus('error', '?꾨＼?꾪듃 ?ъ깮??湲곕뒫??遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?깆쓣 ?꾩쟾??醫낅즺?????ㅼ떆 ?ㅽ뻾?섏꽭??');
    return;
  }

  const runCount = getGenerationRunCount();

  try {
    await persistSettingsIfDirty();
    await persistScene(scene, 'prompt_approved');
    state.generationInProgress = true;
    renderQueueAndGallery();

    for (let index = 0; index < runCount; index += 1) {
      setGenerationStatus('running', `?대떦 ?꾨＼?꾪듃濡??ъ깮??以?.. (${index + 1}/${runCount})`);
      state.project = await window.dongsan.novelAiVariation(image.id);
      const sceneImages = state.project.images.filter((item) => item.sceneId === image.sceneId);
      state.selectedImageId = sceneImages[sceneImages.length - 1]?.id || image.id;
      render();

      if (index < runCount - 1) {
        setGenerationStatus('running', `?ㅼ쓬 ?ъ깮?깃퉴吏 0.5珥??湲?以?.. (${index + 1}/${runCount} ?꾨즺)`);
        await wait(500);
      }
    }

    setGenerationStatus('done', `?꾨＼?꾪듃 ?ъ깮???꾨즺 (${runCount}/${runCount})`);
  } catch (error) {
    const message = error.message?.includes("No handler registered for 'project:novelAiVariation'")
      ? '?꾨＼?꾪듃 ?ъ깮???몃뱾?ш? ?꾩옱 ?ㅽ뻾 以묒씤 ?깆뿉 ?놁뒿?덈떎. ?깆쓣 ?꾩쟾??醫낅즺?????ㅼ떆 ?ㅽ뻾?섏꽭??'
      : error.message;
    elements.projectStatus.textContent = message;
    setGenerationStatus('error', message);
    state.project = await window.dongsan.loadProject();
    render();
  } finally {
    state.generationInProgress = false;
    renderQueueAndGallery();
  }
}

async function loadSelectedImagePromptToEditor() {
  const image = getSelectedImage();
  const scene = getSelectedScene();

  if (!image || !scene) {
    return;
  }

  const metadata = image.metadata || {};
  const nextScene = {
    ...scene,
    basePrompt: metadata.basePrompt || scene.basePrompt || '',
    baseNegativePrompt: metadata.baseNegativePrompt || scene.baseNegativePrompt || '',
    characterPromptsText: metadata.characterPromptsText || scene.characterPromptsText || '',
    characterNegativePromptsText: metadata.characterNegativePromptsText || scene.characterNegativePromptsText || '',
    prompt: metadata.prompt || scene.prompt || '',
    negativePrompt: metadata.negativePrompt || scene.negativePrompt || '',
    status: 'prompt_approved'
  };

  state.project = await window.dongsan.saveScene(nextScene);
  state.selectedSceneId = scene.id;
  setDirty(false);
  render();
}

function addTagFromInput(input, target) {
  const tags = input.value
    .split(/[,\n]/)
    .map(normalizeTag)
    .filter(Boolean);

  if (tags.length === 0) {
    return;
  }

  if (target === 'positive') {
    state.draftTags = orderPromptTags([...state.draftTags, ...tags]);
  } else {
    state.draftNegativeTags = orderPromptTags([...state.draftNegativeTags, ...tags]);
  }

  input.value = '';
  syncPromptFromTags();
  setDirty(true);
  renderTagChips();
}

function organizeTagsForSelectedScene() {
  state.draftTags = orderPromptTags(state.draftTags);
  state.draftNegativeTags = orderPromptTags(state.draftNegativeTags);
  refreshPromptPreview();
  setDirty(true);
  renderTagChips();
  setGenerationStatus('done', '?쒓렇瑜?媛?대뱶 ?쒖꽌濡??뺣━?덉뒿?덈떎');
}

[
  elements.sceneNoInput,
  elements.descriptionInput,
  elements.characterPromptsInput,
  elements.characterNegativePromptsInput,
].forEach((element) => {
  element.addEventListener('input', () => setDirty(true));
});

[
  elements.promptInput,
  elements.negativePromptInput
].forEach((element) => {
  element.addEventListener('input', () => {
    setDirty(true);
    renderPromptHighlights();
  });
});

[
  elements.characterPromptsInput,
  elements.characterNegativePromptsInput
].forEach((element) => {
  element.addEventListener('input', () => {
    refreshPromptPreview();
  });
});

elements.tagSearchInput.addEventListener('input', () => {
  state.tagSearch = elements.tagSearchInput.value;
  renderTagChips();
  renderPromptHighlights();
});

elements.tagSearchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    state.tagSearch = '';
    elements.tagSearchInput.value = '';
    renderTagChips();
    renderPromptHighlights();
  }
});

[
  elements.projectBasePromptInput,
  elements.projectBaseNegativePromptInput,
  elements.modelInput,
  elements.endpointInput,
  elements.widthInput,
  elements.heightInput,
  elements.stepsInput,
  elements.scaleInput,
  elements.samplerInput,
  elements.cfgRescaleInput,
  elements.noiseScheduleInput,
  elements.seedInput
].forEach((element) => {
  element.addEventListener('input', () => {
    state.settings = readSettingsFromForm();
    state.settingsDirty = true;
    refreshPromptPreview();
  });
});

elements.apiKeyInput.addEventListener('input', () => {
  state.settingsDirty = true;
});

elements.importButton.addEventListener('click', importText);
elements.generateTagsButton.addEventListener('click', generateTagsForSelectedScene);
elements.organizeTagsButton.addEventListener('click', organizeTagsForSelectedScene);
elements.approvePromptButton.addEventListener('click', approvePromptForSelectedScene);
elements.novelAiGenerateButton.addEventListener('click', novelAiGenerateSelectedScene);
elements.toggleNegativePromptButton.addEventListener('click', toggleNegativePromptPreview);
elements.keepImageButton.addEventListener('click', keepAndExportSelectedImage);
elements.rejectImageButton.addEventListener('click', rejectSelectedImage);
elements.favoriteImageButton.addEventListener('click', toggleFavoriteSelectedImage);
elements.saveImageNoteButton.addEventListener('click', saveSelectedImageNote);
elements.novelAiVariationButton.addEventListener('click', novelAiVariationFromSelectedImage);
elements.loadImagePromptButton.addEventListener('click', loadSelectedImagePromptToEditor);

document.querySelectorAll('[data-reject-reason]').forEach((button) => {
  button.addEventListener('click', async () => {
    const reason = button.getAttribute('data-reject-reason');
    elements.imageNoteInput.value = appendLineValue(elements.imageNoteInput.value, reason);
    await updateSelectedImage({ note: elements.imageNoteInput.value.trim(), status: 'rejected' });
    setGenerationStatus('done', '?섏젙 硫붾え ???諛?蹂대쪟 泥섎━ ?꾨즺');
  });
});
elements.toggleSettingsButton.addEventListener('click', toggleSettings);
elements.settingsForm.addEventListener('submit', saveSettings);
elements.checkUpdateButton.addEventListener('click', checkForUpdates);
elements.applyUpdateButton.addEventListener('click', applyUpdate);
elements.importTagDictionaryButton.addEventListener('click', importTagDictionary);
elements.clearApiKeyButton.addEventListener('click', clearApiKey);
elements.generationRunCountInput.addEventListener('change', () => {
  elements.generationRunCountInput.value = String(getGenerationRunCount());
});
document.querySelectorAll('[data-run-count]').forEach((button) => {
  button.addEventListener('click', () => {
    elements.generationRunCountInput.value = button.getAttribute('data-run-count') || '1';
  });
});
elements.newCharacterPresetButton.addEventListener('click', clearCharacterPresetEditor);
elements.saveCharacterPresetButton.addEventListener('click', saveCharacterPreset);
elements.deleteCharacterPresetButton.addEventListener('click', deleteCharacterPreset);
elements.copyCharacterPresetButton.addEventListener('click', copyCharacterPreset);
elements.insertCharacterPresetButton.addEventListener('click', insertCharacterPreset);
elements.sceneForm.addEventListener('submit', saveSelectedScene);
elements.addTagButton.addEventListener('click', () => addTagFromInput(elements.tagInput, 'positive'));
elements.addNegativeTagButton.addEventListener('click', () => addTagFromInput(elements.negativeTagInput, 'negative'));

if (typeof window.dongsan.onGenerationStatus === 'function') {
  window.dongsan.onGenerationStatus((payload) => {
    setGenerationStatus(payload?.status || 'running', payload?.message || 'NovelAI ?곹깭 ?낅뜲?댄듃 ?섏떊');
  });
}

elements.tagInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTagFromInput(elements.tagInput, 'positive');
  }
});

elements.negativeTagInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTagFromInput(elements.negativeTagInput, 'negative');
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    elements.tagSearchInput.focus();
    elements.tagSearchInput.select();
  }
});

loadProject().catch((error) => {
  elements.projectStatus.textContent = error.message;
  console.error(error);
});
