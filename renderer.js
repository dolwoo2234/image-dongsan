const state = {
  project: null,
  selectedSceneId: null,
  selectedImageId: null,
  selectedCharacterPresetId: null,
  dirty: false,
  settingsDirty: false,
  generationInProgress: false,
  pinCharacterPrompt: false,
  pinnedCharacterPromptsText: '',
  pinnedCharacterNegativePromptsText: '',
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
  pinCharacterPromptToggle: document.querySelector('#pinCharacterPromptToggle'),
  characterPromptsInput: document.querySelector('#characterPromptsInput'),
  characterNegativePromptsInput: document.querySelector('#characterNegativePromptsInput'),
  characterSlots: document.querySelector('#characterSlots'),
  addCharacterButton: document.querySelector('#addCharacterButton'),
  characterPromptHighlightPreview: document.querySelector('#characterPromptHighlightPreview'),
  characterNegativePromptHighlightPreview: document.querySelector('#characterNegativePromptHighlightPreview'),
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
  elements.saveState.textContent = isDirty ? '저장되지 않은 변경 있음' : '저장됨';
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

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSearchRegex(query) {
  const tokens = String(query || '').trim().split(/[\s_]+/).filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  return new RegExp(tokens.map(escapeRegExp).join('[\\s_]+'), 'gi');
}

function renderHighlightedText(value, query) {
  const text = String(value || '');
  const searchRegex = createSearchRegex(query);

  if (!text) {
    return '\uD504\uB86C\uD504\uD2B8\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.';
  }

  if (!searchRegex) {
    return escapeHtml(text);
  }

  const parts = [];
  let cursor = 0;
  let match = searchRegex.exec(text);

  while (match) {
    const matchIndex = match.index;
    const matchedText = match[0];
    parts.push(escapeHtml(text.slice(cursor, matchIndex)));
    parts.push(`<mark>${escapeHtml(matchedText)}</mark>`);
    cursor = matchIndex + matchedText.length;
    match = searchRegex.exec(text);
  }

  parts.push(escapeHtml(text.slice(cursor)));
  return parts.join('');
}

function renderPromptHighlights() {
  const query = state.tagSearch;
  const characterPrompt = elements.characterPromptsInput.value;
  const characterNegativePrompt = elements.characterNegativePromptsInput.value;
  const prompt = elements.promptInput.value;
  const negativePrompt = elements.negativePromptInput.value;

  elements.characterPromptHighlightPreview.classList.toggle('is-empty', !characterPrompt);
  elements.characterNegativePromptHighlightPreview.classList.toggle('is-empty', !characterNegativePrompt);
  elements.promptHighlightPreview.classList.toggle('is-empty', !prompt);
  elements.negativePromptHighlightPreview.classList.toggle('is-empty', !negativePrompt);
  elements.characterPromptHighlightPreview.innerHTML = renderHighlightedText(characterPrompt, query);
  elements.characterNegativePromptHighlightPreview.innerHTML = renderHighlightedText(characterNegativePrompt, query);
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

function capturePinnedCharacterPrompts() {
  state.pinnedCharacterPromptsText = elements.characterPromptsInput.value;
  state.pinnedCharacterNegativePromptsText = elements.characterNegativePromptsInput.value;
}

function getCharacterPromptSlots() {
  const prompts = elements.characterPromptsInput.value.split('\n');
  const negativePrompts = elements.characterNegativePromptsInput.value.split('\n');
  const promptCount = elements.characterPromptsInput.value.trim() ? prompts.length : 0;
  const negativePromptCount = elements.characterNegativePromptsInput.value.trim() ? negativePrompts.length : 0;
  const count = Math.max(promptCount, negativePromptCount, 1);

  return Array.from({ length: count }, (_item, index) => ({
    prompt: (prompts[index] || '').trim(),
    negativePrompt: (negativePrompts[index] || '').trim()
  }));
}

function renumberCharacterSlots() {
  elements.characterSlots.querySelectorAll('.character-slot').forEach((slot, index) => {
    slot.querySelector('.character-slot-title').textContent = `Character ${index + 1}`;
  });
}

function syncCharacterInputsFromSlots() {
  const slots = Array.from(elements.characterSlots.querySelectorAll('.character-slot')).map((slot) => ({
    prompt: slot.querySelector('.character-slot-prompt').value.trim(),
    negativePrompt: slot.querySelector('.character-slot-negative').value.trim()
  }));
  const lastFilledIndex = slots.reduce((lastIndex, slot, index) => (
    slot.prompt || slot.negativePrompt ? index : lastIndex
  ), -1);
  const activeSlots = lastFilledIndex >= 0 ? slots.slice(0, lastFilledIndex + 1) : [];

  elements.characterPromptsInput.value = activeSlots.map((slot) => slot.prompt).join('\n');
  elements.characterNegativePromptsInput.value = activeSlots.map((slot) => slot.negativePrompt).join('\n');

  if (state.pinCharacterPrompt) {
    capturePinnedCharacterPrompts();
  }
}

function createCharacterPromptSlot(prompt = '', negativePrompt = '') {
  const slot = document.createElement('article');
  slot.className = 'character-slot';

  const header = document.createElement('div');
  header.className = 'character-slot-header';

  const title = document.createElement('strong');
  title.className = 'character-slot-title';

  const removeButton = document.createElement('button');
  removeButton.className = 'ghost-button compact-button character-slot-remove';
  removeButton.type = 'button';
  removeButton.textContent = '삭제';

  const promptLabel = document.createElement('label');
  promptLabel.className = 'character-slot-field';
  const promptTitle = document.createElement('span');
  promptTitle.textContent = '프롬프트';
  const promptInput = document.createElement('textarea');
  promptInput.className = 'prompt-textarea character-slot-prompt';
  promptInput.rows = 4;
  promptInput.value = prompt;
  promptInput.placeholder = '1girl, solo, looking back';
  promptLabel.append(promptTitle, promptInput);

  const negativeLabel = document.createElement('label');
  negativeLabel.className = 'character-slot-field';
  const negativeTitle = document.createElement('span');
  negativeTitle.textContent = '네거티브';
  const negativeInput = document.createElement('textarea');
  negativeInput.className = 'prompt-textarea character-slot-negative';
  negativeInput.rows = 3;
  negativeInput.value = negativePrompt;
  negativeInput.placeholder = 'bad anatomy';
  negativeLabel.append(negativeTitle, negativeInput);

  [promptInput, negativeInput].forEach((input) => {
    input.addEventListener('input', () => {
      syncCharacterInputsFromSlots();
      setDirty(true);
      refreshPromptPreview();
    });
  });

  removeButton.addEventListener('click', () => {
    slot.remove();

    if (elements.characterSlots.children.length === 0) {
      elements.characterSlots.appendChild(createCharacterPromptSlot());
    }

    renumberCharacterSlots();
    syncCharacterInputsFromSlots();
    setDirty(true);
    refreshPromptPreview();
  });

  header.append(title, removeButton);
  slot.append(header, promptLabel, negativeLabel);
  return slot;
}

function renderCharacterPromptSlots() {
  elements.characterSlots.innerHTML = '';
  getCharacterPromptSlots().forEach((slot) => {
    elements.characterSlots.appendChild(createCharacterPromptSlot(slot.prompt, slot.negativePrompt));
  });
  renumberCharacterSlots();
}

function getSceneCharacterPrompts(scene) {
  if (state.pinCharacterPrompt) {
    return {
      prompt: state.pinnedCharacterPromptsText,
      negativePrompt: state.pinnedCharacterNegativePromptsText
    };
  }

  return {
    prompt: scene.characterPromptsText || '',
    negativePrompt: scene.characterNegativePromptsText || ''
  };
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
    title.textContent = `Scene ${scene.sceneNo}`;
    description.textContent = scene.description || 'No description';
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
  weightInput.title = 'NovelAI weight. 1 is normal, -1 suppresses the tag.';

  removeButton.type = 'button';
  removeButton.className = 'tag-remove-button';
  removeButton.textContent = 'x';
  removeButton.title = '태그 삭제';

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
    renderTagEmpty(elements.tagChips, '아직 태그 초안이 없습니다');
  }

  if (state.draftNegativeTags.length === 0) {
    renderTagEmpty(elements.negativeTagChips, '아직 네거티브 태그가 없습니다');
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
    elements.queueList.appendChild(createEmptyPanel('상태를 보려면 씬을 선택하세요'));
    elements.galleryList.appendChild(createEmptyPanel('이미지를 보려면 씬을 선택하세요'));
    return;
  }

  if (sceneJobs.length === 0) {
    elements.queueList.appendChild(createEmptyPanel('아직 생성 작업이 없습니다.'));
  } else {
    sceneJobs.slice().reverse().forEach((job) => {
      const item = document.createElement('article');
      item.className = 'queue-item';
      const title = document.createElement('strong');
      const meta = document.createElement('span');
      title.textContent = labelStatus(job.status);
      meta.textContent = new Date(job.createdAt).toLocaleString();
      item.append(title, meta);
      elements.queueList.appendChild(item);
    });
  }

  if (sceneImages.length === 0) {
    elements.galleryList.appendChild(createEmptyPanel('이 씬에 연결된 이미지가 없습니다.'));
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
      preview.alt = `Scene ${scene.sceneNo} generated image preview`;
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
    elements.sceneTitle.textContent = 'Load a TXT file';
    elements.sceneStatus.textContent = 'Empty';
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
  elements.sceneTitle.textContent = `Scene ${scene.sceneNo}`;
  elements.sceneStatus.textContent = labelStatus(scene.status);
  elements.sceneStatus.className = `status-pill ${scene.status}`;
  elements.sceneNoInput.value = scene.sceneNo || '';
  elements.descriptionInput.value = scene.description || '';
  const characterPrompts = getSceneCharacterPrompts(scene);
  elements.characterPromptsInput.value = characterPrompts.prompt;
  elements.characterNegativePromptsInput.value = characterPrompts.negativePrompt;
  renderCharacterPromptSlots();
  state.draftTags = uniqueTags(scene.tags || []);
  state.draftNegativeTags = uniqueTags(scene.negativeTags || []);
  const promptScene = state.pinCharacterPrompt
    ? {
      ...scene,
      prompt: '',
      negativePrompt: '',
      characterPromptsText: characterPrompts.prompt,
      characterNegativePromptsText: characterPrompts.negativePrompt
    }
    : scene;
  renderPromptPreviewForScene(promptScene);
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
  elements.favoriteImageButton.textContent = image.favorite ? 'Unfavorite' : 'Favorite';
  elements.novelAiVariationButton.disabled = !state.secretStatus?.hasApiKey;
  elements.novelAiVariationButton.title = state.secretStatus?.hasApiKey
    ? 'Regenerate with the selected image prompt and settings'
    : 'Save a NovelAI API key first';
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
  try {
    await persistSettingsIfDirty();
    const project = await window.dongsan.importText();

    if (!project) {
      setGenerationStatus('idle', 'TXT 불러오기를 취소했습니다');
      return;
    }

    state.project = project;
    state.settings = project.settings || state.settings;
    state.selectedSceneId = project.scenes[0]?.id || null;
    state.selectedImageId = null;
    state.settingsDirty = false;
    setDirty(false);
    render();
    setGenerationStatus('done', `TXT 불러오기 완료 (${project.scenes.length}개 씬)`);
  } catch (error) {
    console.error(error);
    setGenerationStatus('error', `TXT 불러오기 실패: ${error.message}`);
  }
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
    empty.textContent = '저장된 캐릭터 프롬프트가 없습니다';
    elements.characterPresetList.appendChild(empty);
    return;
  }

  presets.forEach((preset) => {
    const item = document.createElement('button');
    const title = document.createElement('strong');
    const preview = document.createElement('span');

    item.type = 'button';
    item.className = `preset-item${preset.id === state.selectedCharacterPresetId ? ' active' : ''}`;
    title.textContent = preset.name || '이름 없음';
    preview.textContent = preset.prompt || '프롬프트 없음';
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
    setGenerationStatus('error', '저장할 캐릭터 프롬프트를 입력하세요');
    return;
  }

  const presets = getCharacterPresets();
  const id = state.selectedCharacterPresetId || `character-preset-${Date.now()}`;
  const nextPreset = {
    id,
    name: name || '이름 없음',
    prompt,
    negativePrompt,
    updatedAt: new Date().toISOString()
  };
  const nextPresets = presets.some((preset) => preset.id === id)
    ? presets.map((preset) => preset.id === id ? nextPreset : preset)
    : [...presets, nextPreset];

  state.selectedCharacterPresetId = id;
  await persistCharacterPresets(nextPresets, '캐릭터 프롬프트 저장 완료');
}

async function deleteCharacterPreset() {
  const preset = getSelectedCharacterPreset();

  if (!preset) {
    setGenerationStatus('error', '삭제할 프리셋을 선택하세요');
    return;
  }

  const nextPresets = getCharacterPresets().filter((item) => item.id !== preset.id);
  state.selectedCharacterPresetId = null;
  elements.characterPresetNameInput.value = '';
  elements.characterPresetPromptInput.value = '';
  elements.characterPresetNegativeInput.value = '';
  await persistCharacterPresets(nextPresets, '캐릭터 프롬프트 삭제 완료');
}

function appendLineValue(currentValue, value) {
  const lines = currentValue.split('\n').map((line) => line.trim()).filter(Boolean);

  if (!lines.includes(value)) {
    lines.push(value);
  }

  return lines.join('\n');
}

function appendCharacterPromptPair(prompt, negativePrompt) {
  const slots = getCharacterPromptSlots().filter((slot) => slot.prompt || slot.negativePrompt);
  slots.push({ prompt, negativePrompt });
  elements.characterPromptsInput.value = slots.map((slot) => slot.prompt).join('\n');
  elements.characterNegativePromptsInput.value = slots.map((slot) => slot.negativePrompt).join('\n');
}

function insertCharacterPreset() {
  const prompt = elements.characterPresetPromptInput.value.trim();
  const negativePrompt = elements.characterPresetNegativeInput.value.trim();

  if (!prompt && !negativePrompt) {
    setGenerationStatus('error', '넣을 캐릭터 프롬프트를 선택하거나 입력하세요');
    return;
  }

  appendCharacterPromptPair(prompt, negativePrompt);

  renderCharacterPromptSlots();
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
    setGenerationStatus('error', '복사할 캐릭터 프롬프트가 없습니다');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setGenerationStatus('done', '캐릭터 프롬프트 복사 완료');
  } catch (_error) {
    elements.characterPresetPromptInput.focus();
    elements.characterPresetPromptInput.select();
    setGenerationStatus('error', '클립보드 복사 실패. 프롬프트 칸을 선택해두었습니다.');
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
  return nextScene;
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
  setGenerationStatus('done', '현재 프롬프트 저장 완료');
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
    setGenerationStatus('running', '테스트 이미지 생성 중...');
    state.project = await window.dongsan.mockGenerate(scene.id);
    state.selectedSceneId = scene.id;
    selectLatestSceneImage(scene.id);
    setDirty(false);
    render();
    setGenerationStatus('done', '테스트 이미지 생성 완료');
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
      setGenerationStatus('running', `NovelAI 생성 중... (${index + 1}/${runCount})`);
      state.project = await window.dongsan.novelAiGenerate(scene.id);
      state.selectedSceneId = scene.id;
      selectLatestSceneImage(scene.id);
      setDirty(false);
      render();

      if (index < runCount - 1) {
        setGenerationStatus('running', `다음 생성까지 0.5초 대기 중... (${index + 1}/${runCount} 완료)`);
        await wait(500);
      }
    }

    setGenerationStatus('done', `NovelAI 연속 생성 완료 (${runCount}/${runCount})`);
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
    setGenerationStatus('running', '채택 이미지 저장 위치 선택 중...');
    const result = await window.dongsan.keepAndExportImage(image.id);

    if (result.canceled) {
      setGenerationStatus('idle', 'PNG 내보내기 취소됨');
      return;
    }

    state.project = result.project;
    state.selectedImageId = image.id;
    render();
    setGenerationStatus('done', '채택 이미지 PNG 내보내기 완료');
  } catch (error) {
    elements.projectStatus.textContent = error.message;
    setGenerationStatus('error', error.message);
  }
}

async function saveSelectedImageNote() {
  await updateSelectedImage({ note: elements.imageNoteInput.value.trim() });
  setGenerationStatus('done', '메모 저장 완료');
}

async function rejectSelectedImage() {
  await updateSelectedImage({ status: 'rejected' });
  setGenerationStatus('done', '이미지 보류 처리 완료');
}

async function toggleFavoriteSelectedImage() {
  const image = getSelectedImage();

  if (!image) {
    return;
  }

  await updateSelectedImage({ favorite: !image.favorite });
  setGenerationStatus('done', image.favorite ? '즐겨찾기 해제 완료' : '즐겨찾기 추가 완료');
}

async function novelAiVariationFromSelectedImage() {
  const image = getSelectedImage();
  const scene = getSelectedScene();

  if (!image || !scene) {
    setGenerationStatus('error', '재생성할 이미지 프롬프트를 먼저 선택하세요');
    return;
  }

  if (typeof window.dongsan.novelAiVariation !== 'function') {
    setGenerationStatus('error', '프롬프트 재생성 기능을 불러오지 못했습니다. 앱을 완전히 종료한 뒤 다시 실행하세요.');
    return;
  }

  const runCount = getGenerationRunCount();

  try {
    await persistSettingsIfDirty();
    const sceneOverride = await persistScene(scene, 'prompt_approved');
    state.generationInProgress = true;
    renderQueueAndGallery();

    for (let index = 0; index < runCount; index += 1) {
      setGenerationStatus('running', `해당 프롬프트로 재생성 중... (${index + 1}/${runCount})`);
      state.project = await window.dongsan.novelAiVariation(image.id, sceneOverride);
      const sceneImages = state.project.images.filter((item) => item.sceneId === image.sceneId);
      state.selectedImageId = sceneImages[sceneImages.length - 1]?.id || image.id;
      render();

      if (index < runCount - 1) {
        setGenerationStatus('running', `다음 재생성까지 0.5초 대기 중... (${index + 1}/${runCount} 완료)`);
        await wait(500);
      }
    }

    setGenerationStatus('done', `프롬프트 재생성 완료 (${runCount}/${runCount})`);
  } catch (error) {
    const message = error.message?.includes("No handler registered for 'project:novelAiVariation'")
      ? '프롬프트 재생성 기능이 현재 실행 중인 앱에 없습니다. 앱을 완전히 종료한 뒤 다시 실행하세요.'
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
  setGenerationStatus('done', '태그를 가이드 순서로 정리했습니다');
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
    if (state.pinCharacterPrompt) {
      capturePinnedCharacterPrompts();
    }
    refreshPromptPreview();
  });
});

elements.pinCharacterPromptToggle.addEventListener('change', () => {
  state.pinCharacterPrompt = elements.pinCharacterPromptToggle.checked;

  if (state.pinCharacterPrompt) {
    capturePinnedCharacterPrompts();
  }

  refreshPromptPreview();
});

elements.addCharacterButton.addEventListener('click', () => {
  elements.characterSlots.appendChild(createCharacterPromptSlot());
  renumberCharacterSlots();
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
    setGenerationStatus('done', '수정 메모 저장 및 보류 처리 완료');
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
    setGenerationStatus(payload?.status || 'running', payload?.message || 'NovelAI 상태 업데이트 수신');
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
