const state = {
  project: null,
  selectedSceneId: null,
  selectedImageId: null,
  selectedCharacterPresetId: null,
  dirty: false,
  settingsDirty: false,
  generationInProgress: false,
  generationCancelRequested: false,
  pendingCharacterPromptCarry: null,
  tagSearch: '',
  draftTags: [],
  draftTagAssignments: {},
  draftNegativeTags: [],
  settings: null,
  secretStatus: null,
  updateInfo: null,
  inpaintOpen: false,
  inpaintMode: 'brush',
  inpaintSourceImageId: null,
  inpaintDrawing: false,
  inpaintMaskPixels: null,
  inpaintLastPoint: null,
  inpaintZoom: 1,
  inpaintPanX: 0,
  inpaintPanY: 0
};

const elements = {
  importButton: document.querySelector('#importButton'),
  addSceneButton: document.querySelector('#addSceneButton'),
  deleteSceneButton: document.querySelector('#deleteSceneButton'),
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
  inpaintPanel: document.querySelector('#inpaintPanel'),
  inpaintBaseImage: document.querySelector('#inpaintBaseImage'),
  inpaintMaskCanvas: document.querySelector('#inpaintMaskCanvas'),
  inpaintBrushCursor: document.querySelector('#inpaintBrushCursor'),
  inpaintBrushButton: document.querySelector('#inpaintBrushButton'),
  inpaintEraserButton: document.querySelector('#inpaintEraserButton'),
  clearInpaintMaskButton: document.querySelector('#clearInpaintMaskButton'),
  inpaintBrushSizeInput: document.querySelector('#inpaintBrushSizeInput'),
  inpaintStrengthInput: document.querySelector('#inpaintStrengthInput'),
  inpaintMaskGrowInput: document.querySelector('#inpaintMaskGrowInput'),
  novelAiInpaintButton: document.querySelector('#novelAiInpaintButton'),
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
  carryCharacterToNextSceneButton: document.querySelector('#carryCharacterToNextSceneButton'),
  characterPromptsInput: document.querySelector('#characterPromptsInput'),
  characterNegativePromptsInput: document.querySelector('#characterNegativePromptsInput'),
  characterPositionsInput: document.querySelector('#characterPositionsInput'),
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
  cancelGenerationButton: document.querySelector('#cancelGenerationButton'),
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
  ['cowboy shot', 'bust shot', 'upper body', 'full body', 'wide shot', 'side view', 'from side', 'from above', 'from below', 'pov', 'straight-on', 'dutch angle', 'looking at viewer', 'looking down', 'looking back'],
  ['indoors', 'outdoors', 'entrance', 'doorway', 'bedroom', 'bathroom', 'bathtub', 'open door', 'bed', 'couch', 'table', 'school', 'classroom', 'market street', 'city street', 'forest', 'night', 'sunset', 'rain'],
  ['standing', 'walking', 'sitting', 'kneeling', 'lying', 'bent over', 'leaning forward', 'leaning on person', 'arms around shoulders', 'arms around neck', 'hug', 'holding hands', 'holding paper', 'waving', 'hands behind back', 'hair flip', 'pointing', 'straddling', 'girl on top', 'cowgirl position', 'sitting on lap', 'upright straddle', 'all fours', 'head tilt', 'head shaking', 'wink', 'whispering', 'whisper to ear', 'sniffing', 'background crowd'],
  ['smile', 'smirk', 'expressionless', 'angry', 'glaring', 'scared', 'surprised', 'embarrassed', 'drunk', 'blush', 'tears'],
  ['breasts', 'underboob', 'ass', 'ass focus', 'penis focus', 'face focus', 'lower body', 'cropped torso', 'male back', 'stomach', 'm legs', 'face out of frame', 'eyes out of frame', 'cropped face', 'ear', 'thighs', 'tail', 'tail grab', 'tail wagging', 'hand on another\'s ass', 'hand on thigh', 'hand on breast', 'hand on stomach', 'groping', 'ring', 'wedding ring', 'highly detailed'],
  ['sex', 'vaginal', 'pussy', 'pussy focus', 'spread legs', 'fingering', 'clitoris', 'breast sucking', 'breast grab', 'breast press', 'nipple flick', 'hand on nipple', 'kissing', 'imminent kiss', 'saliva', 'hand job', 'hands on penis', 'hand on penis', 'penis', 'glans', 'testicles', 'tongue', 'licking penis', 'ear licking', 'licking', 'nude', 'topless', 'bottomless', 'partially undressed', 'skirt lift', 'panty pull', 'panties aside', 'imminent penetration', 'penis on pussy', 'grinding', 'sixty-nine', 'doggystyle', 'cowgirl position', 'paizuri', 'mating press', 'missionary', 'fellatio', 'cum', 'cumdrip', 'cum on breasts', 'cum on stomach', 'cum on hand', 'female ejaculation', 'after sex', 'restrained', 'hand over mouth', 'hair grab', 'head grab'],
  ['paper', 'document', 'briefcase', 'cushion', 'holding phone', 'smartphone', 'drinking', 'undressing', 'covering self', 'forehead-to-forehead', 'facing another', 'reaching towards viewer']
];

const promptTagRank = promptTagOrder.reduce((acc, group, groupIndex) => {
  group.forEach((tag, tagIndex) => {
    acc[tag] = groupIndex * 100 + tagIndex;
  });
  return acc;
}, {});

const tagTargetSceneLabels = new Set([
  '1girl', '1boy', 'multiple girls', 'solo',
  'cowboy shot', 'bust shot', 'upper body', 'full body', 'wide shot',
  'pov', 'pov hands', 'pov doorway', 'multiple views', 'straight-on',
  'facing away', 'three quarter view', 'dutch angle', 'upside-down',
  'from above', 'high up', 'from below', 'side view', 'from side',
  'facing to the side', 'profile', 'from behind', 'indoors', 'outdoors',
  'entrance', 'doorway', 'bedroom', 'bathroom', 'bathtub', 'open door',
  'bed', 'couch', 'table', 'school', 'classroom', 'market street',
  'city street', 'forest', 'night', 'sunset', 'rain', 'sex', 'vaginal',
  'kissing', 'imminent kiss', 'saliva', 'imminent penetration',
  'penis on pussy', 'grinding', 'sixty-nine', 'doggystyle',
  'cowgirl position', 'paizuri', 'mating press', 'missionary',
  'fellatio', 'after sex', 'forehead-to-forehead', 'facing another',
  'reaching towards viewer'
]);

function getDefaultTagTarget(tag) {
  const label = getTagSortLabel(tag);
  return tagTargetSceneLabels.has(label) ? 'scene' : 'character-0';
}

function normalizeTagAssignments(assignments, tags) {
  const source = assignments && typeof assignments === 'object' ? assignments : {};
  return Object.fromEntries(uniqueTags(tags).map((tag) => {
    const savedTarget = source[tag] || source[getTagSortLabel(tag)];
    return [tag, savedTarget || getDefaultTagTarget(tag)];
  }));
}

function getTagTarget(tag) {
  return state.draftTagAssignments[tag] || state.draftTagAssignments[getTagSortLabel(tag)] || getDefaultTagTarget(tag);
}

function splitTagsByTarget(tags, assignments = {}) {
  return uniqueTags(tags).reduce((acc, tag) => {
    const target = assignments[tag] || assignments[getTagSortLabel(tag)] || getDefaultTagTarget(tag);

    if (target === 'scene') {
      acc.sceneTags.push(tag);
      return acc;
    }

    const match = String(target).match(/^character-(\d+)$/);
    const characterIndex = match ? Number(match[1]) : 0;
    if (!acc.characterTags[characterIndex]) {
      acc.characterTags[characterIndex] = [];
    }
    acc.characterTags[characterIndex].push(tag);
    return acc;
  }, { sceneTags: [], characterTags: [] });
}

function appendTagsToCharacterPromptLines(characterPromptsText, characterTags) {
  const lines = String(characterPromptsText || '').split('\n');
  const count = Math.max(lines.length, characterTags.length, 1);

  return Array.from({ length: count }, (_item, index) => {
    const prompt = (lines[index] || '').trim();
    const tags = orderPromptTags(characterTags[index] || []);
    return [prompt, ...tags].filter(Boolean).join(', ');
  }).filter(Boolean);
}

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

async function waitBetweenGenerationRuns(ms) {
  const stepMs = 100;
  let elapsed = 0;

  while (elapsed < ms) {
    if (state.generationCancelRequested) {
      return false;
    }

    const delay = Math.min(stepMs, ms - elapsed);
    await wait(delay);
    elapsed += delay;
  }

  return !state.generationCancelRequested;
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

function buildCombinedPrompt(basePrompt, draftTags, characterPromptsText, tagAssignments = {}) {
  const { sceneTags, characterTags } = splitTagsByTarget(draftTags, tagAssignments);
  const parts = [
    basePrompt.trim(),
    ...orderPromptTags(sceneTags),
    ...appendTagsToCharacterPromptLines(characterPromptsText, characterTags)
  ];
  return parts.filter(Boolean).join(', ');
}

function getComputedPromptPreviews() {
  return {
    prompt: buildCombinedPrompt(
    state.settings?.basePrompt || '',
    state.draftTags,
    elements.characterPromptsInput.value,
    state.draftTagAssignments
    ),
    negativePrompt: buildCombinedPrompt(
      state.settings?.baseNegativePrompt || '',
      state.draftNegativeTags,
      elements.characterNegativePromptsInput.value,
      Object.fromEntries(state.draftNegativeTags.map((tag) => [tag, 'scene']))
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
  renderCharacterSlotHighlights(query);
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
  elements.promptInput.value = computed.prompt;
  elements.negativePromptInput.value = computed.negativePrompt;
  renderPromptHighlights();
}

function captureCharacterPromptCarry() {
  syncCharacterInputsFromSlots();

  return {
    prompt: elements.characterPromptsInput.value,
    negativePrompt: elements.characterNegativePromptsInput.value,
    positions: elements.characterPositionsInput.value
  };
}

function getCharacterPromptSlots() {
  const prompts = elements.characterPromptsInput.value.split('\n');
  const negativePrompts = elements.characterNegativePromptsInput.value.split('\n');
  const positions = elements.characterPositionsInput.value.split('\n');
  const promptCount = elements.characterPromptsInput.value.trim() ? prompts.length : 0;
  const negativePromptCount = elements.characterNegativePromptsInput.value.trim() ? negativePrompts.length : 0;
  const positionCount = elements.characterPositionsInput.value.trim() ? positions.length : 0;
  const count = Math.max(promptCount, negativePromptCount, positionCount, 1);

  return Array.from({ length: count }, (_item, index) => ({
    prompt: (prompts[index] || '').trim(),
    negativePrompt: (negativePrompts[index] || '').trim(),
    position: (positions[index] || 'auto').trim() || 'auto'
  }));
}

function renumberCharacterSlots() {
  elements.characterSlots.querySelectorAll('.character-slot').forEach((slot, index) => {
    slot.querySelector('.character-slot-title').textContent = `Character ${index + 1}`;
    slot.dataset.index = String(index);
  });
}

function finishCharacterSlotReorder() {
  elements.characterSlots.querySelectorAll('.character-slot').forEach((slot) => {
    slot.classList.remove('dragging');
  });
  renumberCharacterSlots();
  syncCharacterInputsFromSlots();
  setDirty(true);
  refreshPromptPreview();
  renderTagChips();
}

function getCharacterSlotAfterDrag(container, y) {
  const slots = Array.from(container.querySelectorAll('.character-slot:not(.dragging)'));

  return slots.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - (box.height / 2);

    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }

    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function handleCharacterSlotDragOver(event) {
  event.preventDefault();
  const draggingSlot = elements.characterSlots.querySelector('.character-slot.dragging');

  if (!draggingSlot) {
    return;
  }

  const afterElement = getCharacterSlotAfterDrag(elements.characterSlots, event.clientY);

  if (afterElement) {
    elements.characterSlots.insertBefore(draggingSlot, afterElement);
  } else {
    elements.characterSlots.appendChild(draggingSlot);
  }
}

function syncCharacterInputsFromSlots() {
  const slots = Array.from(elements.characterSlots.querySelectorAll('.character-slot')).map((slot) => ({
    prompt: slot.querySelector('.character-slot-prompt').value.trim(),
    negativePrompt: slot.querySelector('.character-slot-negative').value.trim(),
    position: slot.querySelector('.character-slot-position').value
  }));
  const lastFilledIndex = slots.reduce((lastIndex, slot, index) => (
    slot.prompt || slot.negativePrompt ? index : lastIndex
  ), -1);
  const activeSlots = lastFilledIndex >= 0 ? slots.slice(0, lastFilledIndex + 1) : [];

  elements.characterPromptsInput.value = activeSlots.map((slot) => slot.prompt).join('\n');
  elements.characterNegativePromptsInput.value = activeSlots.map((slot) => slot.negativePrompt).join('\n');
  elements.characterPositionsInput.value = activeSlots.map((slot) => slot.position || 'auto').join('\n');

}

function renderCharacterSlotHighlights(query) {
  elements.characterSlots.querySelectorAll('.character-slot').forEach((slot) => {
    const promptInput = slot.querySelector('.character-slot-prompt');
    const negativeInput = slot.querySelector('.character-slot-negative');
    const promptHighlight = slot.querySelector('.character-slot-prompt-highlight');
    const negativeHighlight = slot.querySelector('.character-slot-negative-highlight');

    promptHighlight.classList.toggle('is-empty', !promptInput.value.trim());
    negativeHighlight.classList.toggle('is-empty', !negativeInput.value.trim());
    promptHighlight.innerHTML = renderHighlightedText(promptInput.value, query);
    negativeHighlight.innerHTML = renderHighlightedText(negativeInput.value, query);
  });
}

function createCharacterPromptSlot(prompt = '', negativePrompt = '', position = 'auto') {
  const slot = document.createElement('article');
  slot.className = 'character-slot';

  const header = document.createElement('div');
  header.className = 'character-slot-header';

  const title = document.createElement('strong');
  title.className = 'character-slot-title';

  const dragHandle = document.createElement('button');
  dragHandle.className = 'ghost-button compact-button character-slot-drag-handle';
  dragHandle.type = 'button';
  dragHandle.textContent = '↕';
  dragHandle.title = '드래그해서 캐릭터 순서 변경';
  dragHandle.draggable = true;

  const removeButton = document.createElement('button');
  removeButton.className = 'ghost-button compact-button character-slot-remove';
  removeButton.type = 'button';
  removeButton.textContent = '삭제';

  const positionLabel = document.createElement('label');
  positionLabel.className = 'character-slot-position-label';
  const positionTitle = document.createElement('span');
  positionTitle.textContent = '위치';
  const positionSelect = document.createElement('select');
  positionSelect.className = 'character-slot-position';
  [
    ['auto', '자동'],
    ['left', '왼쪽'],
    ['center', '가운데'],
    ['right', '오른쪽'],
    ['top', '위쪽'],
    ['bottom', '아래쪽'],
    ['top-left', '왼쪽 위'],
    ['top-right', '오른쪽 위'],
    ['bottom-left', '왼쪽 아래'],
    ['bottom-right', '오른쪽 아래']
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    positionSelect.appendChild(option);
  });
  positionSelect.value = position;
  positionLabel.append(positionTitle, positionSelect);

  const promptLabel = document.createElement('label');
  promptLabel.className = 'character-slot-field';
  const promptTitle = document.createElement('span');
  promptTitle.textContent = '프롬프트';
  const promptInput = document.createElement('textarea');
  promptInput.className = 'prompt-textarea character-slot-prompt';
  promptInput.rows = 4;
  promptInput.value = prompt;
  promptInput.placeholder = '1girl, solo, looking back';
  const promptHighlight = document.createElement('div');
  promptHighlight.className = 'prompt-highlight-preview compact-highlight-preview character-slot-prompt-highlight';
  promptLabel.append(promptTitle, promptInput, promptHighlight);

  const negativeLabel = document.createElement('label');
  negativeLabel.className = 'character-slot-field';
  const negativeTitle = document.createElement('span');
  negativeTitle.textContent = '네거티브';
  const negativeInput = document.createElement('textarea');
  negativeInput.className = 'prompt-textarea character-slot-negative';
  negativeInput.rows = 3;
  negativeInput.value = negativePrompt;
  negativeInput.placeholder = 'bad anatomy';
  const negativeHighlight = document.createElement('div');
  negativeHighlight.className = 'prompt-highlight-preview compact-highlight-preview character-slot-negative-highlight';
  negativeLabel.append(negativeTitle, negativeInput, negativeHighlight);

  [
    [promptInput, 'input'],
    [negativeInput, 'input'],
    [positionSelect, 'change']
  ].forEach(([input, eventName]) => {
    input.addEventListener(eventName, () => {
      syncCharacterInputsFromSlots();
      setDirty(true);
      refreshPromptPreview();
      renderTagChips();
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
    renderTagChips();
  });

  dragHandle.addEventListener('dragstart', (event) => {
    slot.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', slot.dataset.index || '');
  });
  dragHandle.addEventListener('dragend', finishCharacterSlotReorder);

  header.append(dragHandle, title, positionLabel, removeButton);
  slot.append(header, promptLabel, negativeLabel);
  return slot;
}

function renderCharacterPromptSlots() {
  elements.characterSlots.innerHTML = '';
  getCharacterPromptSlots().forEach((slot) => {
    elements.characterSlots.appendChild(createCharacterPromptSlot(slot.prompt, slot.negativePrompt, slot.position));
  });
  renumberCharacterSlots();
}

function getSceneCharacterPrompts(scene) {
  if (state.pendingCharacterPromptCarry) {
    return state.pendingCharacterPromptCarry;
  }

  return {
    prompt: scene.characterPromptsText || '',
    negativePrompt: scene.characterNegativePromptsText || '',
    positions: scene.characterPositionsText || ''
  };
}

function renderProjectMeta() {
  const scenes = state.project?.scenes || [];
  elements.sceneCount.textContent = `${scenes.length}개 씬`;
  elements.projectStatus.textContent = state.project?.sourceFile ? '불러온 프로젝트' : '불러온 프로젝트 없음';
  elements.deleteSceneButton.disabled = !getSelectedScene();
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
    const previousTag = state.draftTags[index];
    const previousTarget = previousTag ? getTagTarget(previousTag) : getDefaultTagTarget(nextTag);
    state.draftTags = state.draftTags.map((tag, tagIndex) => tagIndex === index ? nextTag : tag);
    delete state.draftTagAssignments[previousTag];
    state.draftTagAssignments[nextTag] = previousTarget;
  } else {
    state.draftNegativeTags = state.draftNegativeTags.map((tag, tagIndex) => tagIndex === index ? nextTag : tag);
  }

  syncPromptFromTags();
  setDirty(true);
  renderTagChips();
}

function removeTagAtIndex(target, index) {
  if (target === 'positive') {
    const previousTag = state.draftTags[index];
    state.draftTags = state.draftTags.filter((_tag, tagIndex) => tagIndex !== index);
    delete state.draftTagAssignments[previousTag];
  } else {
    state.draftNegativeTags = state.draftNegativeTags.filter((_tag, tagIndex) => tagIndex !== index);
  }

  syncPromptFromTags();
  setDirty(true);
  renderTagChips();
}

function updateTagAssignmentAtIndex(index, nextTarget) {
  const tag = state.draftTags[index];
  if (!tag) {
    return;
  }

  state.draftTagAssignments[tag] = nextTarget;
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
  const targetSelect = document.createElement('select');
  const removeButton = document.createElement('button');

  chip.className = `tag-chip${isSearchMatch ? ' search-match' : ''}`;
  name.className = 'tag-chip-name';
  name.textContent = parsed.label;
  name.title = tag;

  controls.className = target === 'positive' ? 'tag-weight-controls has-target' : 'tag-weight-controls';

  weightInput.type = 'number';
  weightInput.className = 'tag-weight-input';
  weightInput.step = '0.1';
  weightInput.value = formatWeight(parsed.weight);
  weightInput.title = 'NovelAI weight. 1 is normal, -1 suppresses the tag.';

  targetSelect.className = 'tag-target-select';
  targetSelect.title = 'Tag target';
  if (target === 'positive') {
    const slots = getCharacterPromptSlots();
    const assignedTarget = getTagTarget(tag);
    const assignedMatch = String(assignedTarget).match(/^character-(\d+)$/);
    const assignedCount = assignedMatch ? Number(assignedMatch[1]) + 1 : 1;
    const characterCount = Math.max(slots.length, assignedCount, 1);
    const options = [
      ['scene', '장면']
    ];

    for (let characterIndex = 0; characterIndex < characterCount; characterIndex += 1) {
      options.push([`character-${characterIndex}`, `C${characterIndex + 1}`]);
    }

    options.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      targetSelect.appendChild(option);
    });
    targetSelect.value = assignedTarget;
    targetSelect.addEventListener('change', () => {
      updateTagAssignmentAtIndex(index, targetSelect.value);
    });
  }

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

  if (target === 'positive') {
    controls.append(weightInput, targetSelect, removeButton);
  } else {
    controls.append(weightInput, removeButton);
  }
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
  elements.cancelGenerationButton.disabled = !state.generationInProgress || state.generationCancelRequested;
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
      const inpaintAction = document.createElement('button');
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
      inpaintAction.className = 'gallery-inpaint-button';
      inpaintAction.type = 'button';
      inpaintAction.textContent = '인페인트';
      inpaintAction.disabled = !state.secretStatus?.hasApiKey;
      inpaintAction.title = state.secretStatus?.hasApiKey ? '이 이미지로 인페인트 열기' : 'NovelAI API 키를 먼저 저장하세요';
      inpaintAction.addEventListener('click', (event) => {
        event.stopPropagation();
        state.selectedImageId = image.id;
        state.inpaintOpen = true;
        renderSelectedImage();
        renderQueueAndGallery();
      });
      caption.textContent = (image.metadata?.model || '모델 없음') + ' / ' + (image.metadata?.width || '-') + 'x' + (image.metadata?.height || '-');
      card.append(preview, badge, inpaintAction, caption);
      if (image.note) {
        note.className = 'gallery-note';
        note.textContent = image.note;
        note.title = image.note;
        card.appendChild(note);
      }
      card.addEventListener('click', () => {
        state.selectedImageId = image.id;
        state.inpaintOpen = false;
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

function renderSceneForm(options = {}) {
  const scene = getSelectedScene();
  const preserveDirtyForm = Boolean(options.preserveDirtyForm && state.dirty);

  if (!scene) {
    elements.sceneTitle.textContent = 'Load a TXT file';
    elements.sceneStatus.textContent = 'Empty';
    elements.sceneStatus.className = 'status-pill';
    elements.emptyState.classList.remove('hidden');
    elements.sceneForm.classList.add('hidden');
    state.draftTags = [];
    state.draftTagAssignments = {};
    state.draftNegativeTags = [];
    state.selectedImageId = null;
    elements.carryCharacterToNextSceneButton.disabled = true;
    renderSelectedImage();
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.sceneForm.classList.remove('hidden');
  elements.sceneTitle.textContent = `Scene ${scene.sceneNo}`;
  elements.sceneStatus.textContent = labelStatus(scene.status);
  elements.sceneStatus.className = `status-pill ${scene.status}`;
  const scenes = state.project?.scenes || [];
  const sceneIndex = scenes.findIndex((item) => item.id === scene.id);
  elements.carryCharacterToNextSceneButton.disabled = sceneIndex === -1 || sceneIndex >= scenes.length - 1;
  if (preserveDirtyForm) {
    renderQueueAndGallery();
    return;
  }

  elements.sceneNoInput.value = scene.sceneNo || '';
  elements.descriptionInput.value = scene.description || '';
  const characterPrompts = getSceneCharacterPrompts(scene);
  elements.characterPromptsInput.value = characterPrompts.prompt;
  elements.characterNegativePromptsInput.value = characterPrompts.negativePrompt;
  elements.characterPositionsInput.value = characterPrompts.positions;
  renderCharacterPromptSlots();
  state.draftTags = uniqueTags(scene.tags || []);
  state.draftTagAssignments = normalizeTagAssignments(scene.tagAssignments, state.draftTags);
  state.draftNegativeTags = uniqueTags(scene.negativeTags || []);
  const hadPendingCharacterPromptCarry = Boolean(state.pendingCharacterPromptCarry);
  const usesCarriedCharacterPrompts = Boolean(state.pendingCharacterPromptCarry);
  const promptScene = usesCarriedCharacterPrompts
    ? {
      ...scene,
      prompt: '',
      negativePrompt: '',
      characterPromptsText: characterPrompts.prompt,
      characterNegativePromptsText: characterPrompts.negativePrompt,
      characterPositionsText: characterPrompts.positions
    }
    : scene;
  renderPromptPreviewForScene(promptScene);
  state.pendingCharacterPromptCarry = null;
  if (hadPendingCharacterPromptCarry) {
    setDirty(true);
  }
  renderTagChips();
  renderWarnings(scene);
  renderQueueAndGallery();
}

function setInpaintMode(mode) {
  state.inpaintMode = mode === 'eraser' ? 'eraser' : 'brush';
  elements.inpaintBrushButton.className = state.inpaintMode === 'brush'
    ? 'primary-button compact-button'
    : 'ghost-button compact-button';
  elements.inpaintEraserButton.className = state.inpaintMode === 'eraser'
    ? 'primary-button compact-button'
    : 'ghost-button compact-button';
}

function prepareInpaintCanvas(image) {
  if (!elements.inpaintPanel || !elements.inpaintMaskCanvas || !elements.inpaintBaseImage || !image) {
    return;
  }

  elements.inpaintPanel.classList.remove('hidden');
  elements.inpaintBaseImage.onload = () => {
    const width = elements.inpaintBaseImage.naturalWidth || Number(image.metadata?.width) || 1024;
    const height = elements.inpaintBaseImage.naturalHeight || Number(image.metadata?.height) || 1024;

    if (state.inpaintSourceImageId === image.id && elements.inpaintMaskCanvas.width === width && elements.inpaintMaskCanvas.height === height) {
      return;
    }

    elements.inpaintMaskCanvas.width = width;
    elements.inpaintMaskCanvas.height = height;
    elements.inpaintMaskCanvas.parentElement.style.aspectRatio = `${width} / ${height}`;
    state.inpaintMaskPixels = new Uint8Array(width * height);
    state.inpaintZoom = 1;
    state.inpaintPanX = 0;
    state.inpaintPanY = 0;
    clearInpaintMask();
    updateInpaintViewport();
    state.inpaintSourceImageId = image.id;
  };
  elements.inpaintBaseImage.src = image.uri;
  setInpaintMode(state.inpaintMode);
}

function updateInpaintViewport() {
  const transform = `translate(${state.inpaintPanX}px, ${state.inpaintPanY}px) scale(${state.inpaintZoom})`;
  elements.inpaintBaseImage.style.transform = transform;
  elements.inpaintMaskCanvas.style.transform = transform;
  updateInpaintBrushCursor();
}

function getInpaintViewportPoint(event) {
  const rect = elements.inpaintMaskCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    rect
  };
}

function updateInpaintBrushCursor(event = null) {
  if (!elements.inpaintBrushCursor || !elements.inpaintMaskCanvas?.width) {
    return;
  }

  const brushSize = Math.max(4, Number(elements.inpaintBrushSizeInput.value) || 48);
  const rect = elements.inpaintMaskCanvas.getBoundingClientRect();
  const displaySize = (brushSize / elements.inpaintMaskCanvas.width) * rect.width;

  elements.inpaintBrushCursor.style.width = `${Math.max(4, displaySize)}px`;
  elements.inpaintBrushCursor.style.height = `${Math.max(4, displaySize)}px`;

  if (event) {
    const wrapRect = elements.inpaintMaskCanvas.parentElement.getBoundingClientRect();
    elements.inpaintBrushCursor.style.left = `${event.clientX - wrapRect.left}px`;
    elements.inpaintBrushCursor.style.top = `${event.clientY - wrapRect.top}px`;
  }
}

function zoomInpaintCanvas(event) {
  if (!elements.inpaintMaskCanvas?.width) {
    return;
  }

  event.preventDefault();
  const wrapRect = elements.inpaintMaskCanvas.parentElement.getBoundingClientRect();
  const pointerX = event.clientX - wrapRect.left;
  const pointerY = event.clientY - wrapRect.top;
  const previousZoom = state.inpaintZoom;
  const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  const nextZoom = Math.min(Math.max(previousZoom * zoomFactor, 1), 8);

  if (nextZoom === previousZoom) {
    return;
  }

  state.inpaintPanX = pointerX - ((pointerX - state.inpaintPanX) * (nextZoom / previousZoom));
  state.inpaintPanY = pointerY - ((pointerY - state.inpaintPanY) * (nextZoom / previousZoom));

  if (nextZoom === 1) {
    state.inpaintPanX = 0;
    state.inpaintPanY = 0;
  }

  state.inpaintZoom = nextZoom;
  updateInpaintViewport();
  updateInpaintBrushCursor(event);
}

function renderInpaintMaskCanvas() {
  if (!elements.inpaintMaskCanvas?.width || !state.inpaintMaskPixels) {
    return;
  }

  const canvas = elements.inpaintMaskCanvas;
  const context = canvas.getContext('2d');
  const output = context.createImageData(canvas.width, canvas.height);

  for (let pixelIndex = 0; pixelIndex < state.inpaintMaskPixels.length; pixelIndex += 1) {
    if (!state.inpaintMaskPixels[pixelIndex]) {
      continue;
    }

    const dataIndex = pixelIndex * 4;
    output.data[dataIndex] = 73;
    output.data[dataIndex + 1] = 132;
    output.data[dataIndex + 2] = 255;
    output.data[dataIndex + 3] = 112;
  }

  context.putImageData(output, 0, 0);
}

function paintInpaintCircle(point, radius, value) {
  const canvas = elements.inpaintMaskCanvas;

  if (!state.inpaintMaskPixels || !canvas.width || !canvas.height) {
    return;
  }

  const centerX = Math.round(point.x);
  const centerY = Math.round(point.y);
  const radiusValue = Math.max(1, Math.round(radius));
  const radiusSquared = radiusValue * radiusValue;
  const minX = Math.max(0, centerX - radiusValue);
  const maxX = Math.min(canvas.width - 1, centerX + radiusValue);
  const minY = Math.max(0, centerY - radiusValue);
  const maxY = Math.min(canvas.height - 1, centerY + radiusValue);

  for (let y = minY; y <= maxY; y += 1) {
    const dy = y - centerY;

    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - centerX;

      if ((dx * dx) + (dy * dy) <= radiusSquared) {
        state.inpaintMaskPixels[(y * canvas.width) + x] = value;
      }
    }
  }
}

function paintInpaintLine(fromPoint, toPoint, radius, value) {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.45)));

  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;
    paintInpaintCircle({
      x: fromPoint.x + (dx * progress),
      y: fromPoint.y + (dy * progress)
    }, radius, value);
  }
}

function getInpaintCanvasPoint(event) {
  const { x, y, rect } = getInpaintViewportPoint(event);
  return {
    x: (x / rect.width) * elements.inpaintMaskCanvas.width,
    y: (y / rect.height) * elements.inpaintMaskCanvas.height
  };
}

function drawInpaintStroke(event) {
  updateInpaintBrushCursor(event);

  if (!state.inpaintDrawing || !elements.inpaintMaskCanvas.width || !state.inpaintLastPoint) {
    return;
  }

  const point = getInpaintCanvasPoint(event);
  const brushSize = Math.max(4, Number(elements.inpaintBrushSizeInput.value) || 48);
  paintInpaintLine(state.inpaintLastPoint, point, brushSize / 2, state.inpaintMode === 'eraser' ? 0 : 1);
  state.inpaintLastPoint = point;
  renderInpaintMaskCanvas();
}

function beginInpaintStroke(event) {
  if (!elements.inpaintMaskCanvas.width) {
    return;
  }

  event.preventDefault();
  updateInpaintBrushCursor(event);
  const point = getInpaintCanvasPoint(event);
  const brushSize = Math.max(4, Number(elements.inpaintBrushSizeInput.value) || 48);
  state.inpaintDrawing = true;
  state.inpaintLastPoint = point;
  paintInpaintCircle(point, brushSize / 2, state.inpaintMode === 'eraser' ? 0 : 1);
  renderInpaintMaskCanvas();
  elements.inpaintMaskCanvas.setPointerCapture(event.pointerId);
}

function endInpaintStroke(event) {
  if (!state.inpaintDrawing) {
    return;
  }

  state.inpaintDrawing = false;
  state.inpaintLastPoint = null;

  if (elements.inpaintMaskCanvas.hasPointerCapture(event.pointerId)) {
    elements.inpaintMaskCanvas.releasePointerCapture(event.pointerId);
  }
}

function clearInpaintMask() {
  if (!elements.inpaintMaskCanvas) {
    return;
  }

  const context = elements.inpaintMaskCanvas.getContext('2d');
  context.clearRect(0, 0, elements.inpaintMaskCanvas.width, elements.inpaintMaskCanvas.height);
  state.inpaintMaskPixels?.fill(0);
}

function growInpaintMaskPixels(sourcePixels, width, height, growPixels) {
  const grow = Math.max(0, Math.round(growPixels));

  if (!grow) {
    return sourcePixels;
  }

  const grownPixels = new Uint8Array(sourcePixels);
  const radiusSquared = grow * grow;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!sourcePixels[(y * width) + x]) {
        continue;
      }

      const minX = Math.max(0, x - grow);
      const maxX = Math.min(width - 1, x + grow);
      const minY = Math.max(0, y - grow);
      const maxY = Math.min(height - 1, y + grow);

      for (let targetY = minY; targetY <= maxY; targetY += 1) {
        const dy = targetY - y;

        for (let targetX = minX; targetX <= maxX; targetX += 1) {
          const dx = targetX - x;

          if ((dx * dx) + (dy * dy) <= radiusSquared) {
            grownPixels[(targetY * width) + targetX] = 1;
          }
        }
      }
    }
  }

  return grownPixels;
}

function showInpaintBrushCursor(event) {
  elements.inpaintBrushCursor?.classList.remove('hidden');
  updateInpaintBrushCursor(event);
}

function hideInpaintBrushCursor() {
  elements.inpaintBrushCursor?.classList.add('hidden');
}

function snapMaskToNovelAiGrid(maskCanvas, targetCanvas) {
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = Math.max(1, Math.floor(maskCanvas.width / 8));
  gridCanvas.height = Math.max(1, Math.floor(maskCanvas.height / 8));
  const gridContext = gridCanvas.getContext('2d');
  gridContext.imageSmoothingEnabled = false;
  gridContext.drawImage(maskCanvas, 0, 0, gridCanvas.width, gridCanvas.height);

  const outputContext = targetCanvas.getContext('2d');
  outputContext.imageSmoothingEnabled = false;
  outputContext.fillStyle = 'black';
  outputContext.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  outputContext.drawImage(gridCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

  const snappedData = outputContext.getImageData(0, 0, targetCanvas.width, targetCanvas.height);

  for (let index = 0; index < snappedData.data.length; index += 4) {
    const maskValue = snappedData.data[index] >= 128 ? 255 : 0;
    snappedData.data[index] = maskValue;
    snappedData.data[index + 1] = maskValue;
    snappedData.data[index + 2] = maskValue;
    snappedData.data[index + 3] = 255;
  }

  outputContext.putImageData(snappedData, 0, 0);
}

function getInpaintMaskDataUrl() {
  const sourceCanvas = elements.inpaintMaskCanvas;
  const hasMask = state.inpaintMaskPixels?.some(Boolean);

  if (!hasMask) {
    return null;
  }

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = sourceCanvas.width;
  maskCanvas.height = sourceCanvas.height;
  const maskContext = maskCanvas.getContext('2d');
  const outputData = maskContext.createImageData(maskCanvas.width, maskCanvas.height);
  const maskGrow = Number(elements.inpaintMaskGrowInput.value) || 0;
  const outputMaskPixels = growInpaintMaskPixels(
    state.inpaintMaskPixels,
    maskCanvas.width,
    maskCanvas.height,
    maskGrow
  );

  for (let pixelIndex = 0; pixelIndex < outputMaskPixels.length; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const maskValue = outputMaskPixels[pixelIndex] ? 255 : 0;
    outputData.data[dataIndex] = maskValue;
    outputData.data[dataIndex + 1] = maskValue;
    outputData.data[dataIndex + 2] = maskValue;
    outputData.data[dataIndex + 3] = 255;
  }

  maskContext.putImageData(outputData, 0, 0);
  snapMaskToNovelAiGrid(maskCanvas, outputCanvas);

  return outputCanvas.toDataURL('image/png');
}

function renderSelectedImage() {
  const image = getSelectedImage();
  const scene = getSelectedScene();

  if (!scene || !image) {
    elements.imageWorkbench.classList.add('hidden');
    elements.inpaintPanel?.classList.add('hidden');
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
  elements.novelAiInpaintButton.disabled = !state.secretStatus?.hasApiKey;
  elements.novelAiInpaintButton.title = state.secretStatus?.hasApiKey
    ? 'Paint a mask and regenerate only that area'
    : 'Save a NovelAI API key first';
  if (state.inpaintOpen) {
    prepareInpaintCanvas(image);
  } else {
    elements.inpaintPanel?.classList.add('hidden');
  }
  elements.selectedImagePrompt.textContent = image.metadata?.prompt || '';
  elements.selectedImageNegative.textContent = image.metadata?.negativePrompt || '';
  elements.selectedImageSettings.textContent = [
    image.metadata?.model,
    `${image.metadata?.width || '-'}x${image.metadata?.height || '-'}`,
    `steps ${image.metadata?.steps ?? '-'}`,
    `scale ${image.metadata?.scale ?? '-'}`,
    image.metadata?.inpaintStrength !== undefined && image.metadata?.inpaintStrength !== '' ? `inpaint ${image.metadata.inpaintStrength}` : '',
    image.metadata?.sampler,
    `seed ${image.metadata?.seed ?? '-'}`
  ].filter(Boolean).join(' / ');
}

function getLatestJobResultImageId(sceneId, mode = null) {
  const jobs = state.project?.generationJobs || [];
  const latestJob = jobs
    .slice()
    .reverse()
    .find((job) => (
      job.sceneId === sceneId
      && Array.isArray(job.resultImageIds)
      && job.resultImageIds.length > 0
      && (!mode || job.request?.mode === mode)
    ));

  return latestJob?.resultImageIds?.[0] || null;
}

function render(options = {}) {
  renderProjectMeta();
  renderSettings();
  renderSceneList();
  renderSceneForm(options);
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

async function addScene() {
  const selectedScene = getSelectedScene();

  try {
    if (selectedScene) {
      await persistScene(selectedScene);
    } else {
      await persistSettingsIfDirty();
    }

    const result = await window.dongsan.addScene(state.selectedSceneId);
    state.project = result.project;
    state.selectedSceneId = result.sceneId;
    state.selectedImageId = null;
    setDirty(false);
    render();
    setGenerationStatus('done', '씬을 추가했습니다.');
  } catch (error) {
    console.error(error);
    setGenerationStatus('error', `씬 추가 실패: ${error.message}`);
  }
}

async function deleteSelectedScene() {
  const scene = getSelectedScene();

  if (!scene) {
    return;
  }

  const scenes = state.project?.scenes || [];
  const sceneIndex = scenes.findIndex((item) => item.id === scene.id);
  const confirmed = window.confirm(`Scene ${scene.sceneNo}을 삭제할까요?\n연결된 생성 기록은 목록에서 함께 제거됩니다.`);

  if (!confirmed) {
    return;
  }

  try {
    state.project = await window.dongsan.deleteScene(scene.id);
    const nextScenes = state.project?.scenes || [];
    state.selectedSceneId = nextScenes[Math.min(sceneIndex, nextScenes.length - 1)]?.id || null;
    state.selectedImageId = null;
    setDirty(false);
    render();
    setGenerationStatus('done', `Scene ${scene.sceneNo}을 삭제했습니다.`);
  } catch (error) {
    console.error(error);
    setGenerationStatus('error', `씬 삭제 실패: ${error.message}`);
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

function applyImportedSettings(settings) {
  const cleanedSettings = Object.fromEntries(
    Object.entries(settings || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

  state.settings = {
    ...(state.settings || {}),
    ...cleanedSettings,
    provider: 'novelai'
  };
}

async function saveImportedSettings() {
  const result = await window.dongsan.saveSettings({ settings: state.settings });
  state.settings = result.settings;
  state.secretStatus = result.secretStatus;
  state.settingsDirty = false;
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

function normalizeCharacterPresetSlotText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

function appendCharacterPromptPair(prompt, negativePrompt) {
  const slots = getCharacterPromptSlots().filter((slot) => slot.prompt || slot.negativePrompt);
  slots.push({
    prompt: normalizeCharacterPresetSlotText(prompt),
    negativePrompt: normalizeCharacterPresetSlotText(negativePrompt),
    position: 'auto'
  });
  elements.characterPromptsInput.value = slots.map((slot) => slot.prompt).join('\n');
  elements.characterNegativePromptsInput.value = slots.map((slot) => slot.negativePrompt).join('\n');
  elements.characterPositionsInput.value = slots.map((slot) => slot.position || 'auto').join('\n');
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
  const tagAssignments = normalizeTagAssignments(state.draftTagAssignments, tags);
  const negativeTags = uniqueTags(state.draftNegativeTags);
  const basePrompt = state.settings?.basePrompt || '';
  const baseNegativePrompt = state.settings?.baseNegativePrompt || '';
  const characterPromptsText = elements.characterPromptsInput.value.trim();
  const characterNegativePromptsText = elements.characterNegativePromptsInput.value.trim();
  const characterPositionsText = elements.characterPositionsInput.value.trim();
  const combinedPrompt = buildCombinedPrompt(basePrompt, tags, characterPromptsText, tagAssignments);
  const combinedNegativePrompt = buildCombinedPrompt(
    baseNegativePrompt,
    negativeTags,
    characterNegativePromptsText,
    Object.fromEntries(negativeTags.map((tag) => [tag, 'scene']))
  );
  const prompt = elements.promptInput.value.trim() || combinedPrompt;
  const negativePrompt = elements.negativePromptInput.value.trim() || combinedNegativePrompt;

  return {
    ...scene,
    sceneNo: elements.sceneNoInput.value.trim() || scene.sceneNo,
    description: elements.descriptionInput.value.trim(),
    tags,
    tagAssignments,
    negativeTags,
    basePrompt,
    baseNegativePrompt,
    characterPromptsText,
    characterNegativePromptsText,
    characterPositionsText,
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
  const savedScene = await persistScene(scene);

  state.project = await window.dongsan.generateTags(savedScene.id);
  state.selectedSceneId = savedScene.id;
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

async function carryCharacterPromptsToNextScene() {
  const scene = getSelectedScene();
  const scenes = state.project?.scenes || [];
  const sceneIndex = scenes.findIndex((item) => item.id === scene?.id);
  const nextScene = scenes[sceneIndex + 1];

  if (!scene || !nextScene) {
    setGenerationStatus('error', '다음 씬이 없습니다.');
    return;
  }

  const carriedPrompts = captureCharacterPromptCarry();
  await persistSettingsIfDirty();
  await persistScene(scene);

  state.pendingCharacterPromptCarry = carriedPrompts;
  state.selectedSceneId = nextScene.id;
  state.selectedImageId = null;
  setDirty(false);
  render();
  setGenerationStatus('done', `캐릭터를 유지하고 Scene ${nextScene.sceneNo}로 이동했습니다.`);
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
    const nextProject = await window.dongsan.mockGenerate(scene.id);
    const preserveDirtyForm = state.dirty;
    state.project = nextProject;
    state.selectedSceneId = scene.id;
    selectLatestSceneImage(scene.id);
    if (!preserveDirtyForm) {
      setDirty(false);
    }
    render({ preserveDirtyForm });
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
    state.generationCancelRequested = false;
    renderQueueAndGallery();

    for (let index = 0; index < runCount; index += 1) {
      if (state.generationCancelRequested) {
        setGenerationStatus('idle', `씬 생성 중단됨 (${index}/${runCount} 완료)`);
        break;
      }

      setGenerationStatus('running', `현재 씬 저장 후 생성 중... (${index + 1}/${runCount})`);
      const nextProject = await window.dongsan.novelAiGenerate(scene.id);
      const preserveDirtyForm = state.dirty;
      state.project = nextProject;
      state.selectedSceneId = scene.id;
      selectLatestSceneImage(scene.id);
      if (!preserveDirtyForm) {
        setDirty(false);
      }
      render({ preserveDirtyForm });

      if (index < runCount - 1) {
        setGenerationStatus('running', `다음 생성까지 0.5초 대기 중... (${index + 1}/${runCount} 완료)`);
        const shouldContinue = await waitBetweenGenerationRuns(500);

        if (!shouldContinue) {
          setGenerationStatus('idle', `씬 생성 중단됨 (${index + 1}/${runCount} 완료)`);
          break;
        }
      }
    }

    if (!state.generationCancelRequested) {
      setGenerationStatus('done', `NovelAI 연속 생성 완료 (${runCount}/${runCount})`);
    }
  } catch (error) {
    if (String(error.message || '').includes('canceled')) {
      setGenerationStatus('idle', '씬 생성이 중단되었습니다.');
      state.project = await window.dongsan.loadProject();
      state.selectedSceneId = scene.id;
      setDirty(false);
      render();
      return;
    }

    elements.projectStatus.textContent = error.message;
    setGenerationStatus('error', error.message);
    state.project = await window.dongsan.loadProject();
    state.selectedSceneId = scene.id;
    setDirty(false);
    render();
  } finally {
    state.generationInProgress = false;
    state.generationCancelRequested = false;
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
    state.generationCancelRequested = false;
    renderQueueAndGallery();

    for (let index = 0; index < runCount; index += 1) {
      if (state.generationCancelRequested) {
        setGenerationStatus('idle', `씬 생성 중단됨 (${index}/${runCount} 완료)`);
        break;
      }

      setGenerationStatus('running', `해당 프롬프트로 재생성 중... (${index + 1}/${runCount})`);
      const nextProject = await window.dongsan.novelAiVariation(image.id, sceneOverride);
      const preserveDirtyForm = state.dirty;
      state.project = nextProject;
      const sceneImages = state.project.images.filter((item) => item.sceneId === image.sceneId);
      state.selectedImageId = sceneImages[sceneImages.length - 1]?.id || image.id;
      render({ preserveDirtyForm });

      if (index < runCount - 1) {
        setGenerationStatus('running', `다음 재생성까지 0.5초 대기 중... (${index + 1}/${runCount} 완료)`);
        const shouldContinue = await waitBetweenGenerationRuns(500);

        if (!shouldContinue) {
          setGenerationStatus('idle', `씬 생성 중단됨 (${index + 1}/${runCount} 완료)`);
          break;
        }
      }
    }

    if (!state.generationCancelRequested) {
      setGenerationStatus('done', `프롬프트 재생성 완료 (${runCount}/${runCount})`);
    }
  } catch (error) {
    if (String(error.message || '').includes('canceled')) {
      setGenerationStatus('idle', '씬 생성이 중단되었습니다.');
      state.project = await window.dongsan.loadProject();
      render();
      return;
    }

    const message = error.message?.includes("No handler registered for 'project:novelAiVariation'")
      ? '프롬프트 재생성 기능이 현재 실행 중인 앱에 없습니다. 앱을 완전히 종료한 뒤 다시 실행하세요.'
      : error.message;
    elements.projectStatus.textContent = message;
    setGenerationStatus('error', message);
    state.project = await window.dongsan.loadProject();
    render();
  } finally {
    state.generationInProgress = false;
    state.generationCancelRequested = false;
    renderQueueAndGallery();
  }
}

async function novelAiInpaintSelectedImage() {
  const image = getSelectedImage();
  const scene = getSelectedScene();

  if (!image || !scene) {
    setGenerationStatus('error', '인페인트할 이미지를 먼저 선택하세요.');
    return;
  }

  if (typeof window.dongsan.novelAiInpaint !== 'function') {
    setGenerationStatus('error', '인페인트 기능을 불러오지 못했습니다. 앱을 완전히 종료한 뒤 다시 실행하세요.');
    return;
  }

  const maskDataUrl = getInpaintMaskDataUrl();

  if (!maskDataUrl) {
    setGenerationStatus('error', '인페인트할 영역을 먼저 브러시로 칠하세요.');
    return;
  }

  const strength = Math.min(Math.max(Number(elements.inpaintStrengthInput.value) || 1, 0), 1);
  try {
    await persistSettingsIfDirty();
    const sceneOverride = await persistScene(scene, 'prompt_approved');
    state.generationInProgress = true;
    state.generationCancelRequested = false;
    renderQueueAndGallery();
    setGenerationStatus('running', '인페인트 생성 중...');
    const nextProject = await window.dongsan.novelAiInpaint(image.id, sceneOverride, maskDataUrl, strength);
    const preserveDirtyForm = state.dirty;
    state.project = nextProject;
    state.selectedImageId = getLatestJobResultImageId(image.sceneId, 'novelai-inpaint') || image.id;
    state.inpaintOpen = false;
    clearInpaintMask();
    render({ preserveDirtyForm });
    setGenerationStatus('done', '인페인트 생성 완료');
  } catch (error) {
    if (String(error.message || '').includes('canceled')) {
      setGenerationStatus('idle', '이미지 생성이 중단되었습니다.');
      state.project = await window.dongsan.loadProject();
      render();
      return;
    }

    elements.projectStatus.textContent = error.message;
    setGenerationStatus('error', error.message);
    state.project = await window.dongsan.loadProject();
    render();
  } finally {
    state.generationInProgress = false;
    state.generationCancelRequested = false;
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
    tagAssignments: metadata.tagAssignments || scene.tagAssignments || {},
    characterPromptsText: metadata.characterPromptsText || scene.characterPromptsText || '',
    characterNegativePromptsText: metadata.characterNegativePromptsText || scene.characterNegativePromptsText || '',
    characterPositionsText: metadata.characterPositionsText || scene.characterPositionsText || '',
    prompt: metadata.prompt || scene.prompt || '',
    negativePrompt: metadata.negativePrompt || scene.negativePrompt || '',
    status: 'prompt_approved'
  };

  state.project = await window.dongsan.saveScene(nextScene);
  state.selectedSceneId = scene.id;
  setDirty(false);
  render();
}

async function applyImageMetadataToEditor(payload) {
  const metadata = payload?.metadata || {};
  const scene = getSelectedScene();

  applyImportedSettings(payload?.settings || metadata);
  await saveImportedSettings();

  if (scene) {
    const nextScene = {
      ...scene,
      basePrompt: metadata.basePrompt || metadata.prompt || scene.basePrompt || '',
      baseNegativePrompt: metadata.baseNegativePrompt || metadata.negativePrompt || scene.baseNegativePrompt || '',
      tagAssignments: metadata.tagAssignments || scene.tagAssignments || {},
      characterPromptsText: metadata.characterPromptsText || scene.characterPromptsText || '',
      characterNegativePromptsText: metadata.characterNegativePromptsText || scene.characterNegativePromptsText || '',
      characterPositionsText: metadata.characterPositionsText || scene.characterPositionsText || '',
      prompt: metadata.prompt || scene.prompt || '',
      negativePrompt: metadata.negativePrompt || scene.negativePrompt || '',
      status: 'prompt_approved'
    };

    state.project = await window.dongsan.saveScene(nextScene);
    state.selectedSceneId = scene.id;
    setDirty(false);
  }

  render();
}

async function importDroppedPngMetadata(file) {
  const filePath = file?.path || window.dongsan.getPathForFile?.(file);

  if (!filePath || !String(filePath).toLowerCase().endsWith('.png')) {
    setGenerationStatus('error', 'PNG 이미지 파일만 드롭할 수 있습니다.');
    return;
  }

  try {
    setGenerationStatus('running', 'PNG 생성 세팅 읽는 중...');
    const payload = await window.dongsan.readImageMetadata(filePath);
    await applyImageMetadataToEditor(payload);
    setGenerationStatus('done', 'PNG 생성 세팅을 불러왔습니다.');
  } catch (error) {
    setGenerationStatus('error', error.message);
  }
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
    state.draftTagAssignments = normalizeTagAssignments(state.draftTagAssignments, state.draftTags);
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
  state.draftTagAssignments = normalizeTagAssignments(state.draftTagAssignments, state.draftTags);
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
  elements.characterPositionsInput,
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

elements.addCharacterButton.addEventListener('click', () => {
  elements.characterSlots.appendChild(createCharacterPromptSlot());
  renumberCharacterSlots();
  syncCharacterInputsFromSlots();
  setDirty(true);
  refreshPromptPreview();
  renderTagChips();
});
elements.characterSlots.addEventListener('dragover', handleCharacterSlotDragOver);

elements.carryCharacterToNextSceneButton.addEventListener('click', carryCharacterPromptsToNextScene);

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
elements.addSceneButton.addEventListener('click', addScene);
elements.deleteSceneButton.addEventListener('click', deleteSelectedScene);
elements.generateTagsButton.addEventListener('click', generateTagsForSelectedScene);
elements.organizeTagsButton.addEventListener('click', organizeTagsForSelectedScene);
elements.approvePromptButton.addEventListener('click', approvePromptForSelectedScene);
elements.novelAiGenerateButton.addEventListener('click', novelAiGenerateSelectedScene);
elements.cancelGenerationButton.addEventListener('click', () => {
  if (!state.generationInProgress) {
    return;
  }

  state.generationCancelRequested = true;
  elements.cancelGenerationButton.disabled = true;
  setGenerationStatus('idle', '씬 생성 중단 요청 중...');

  if (typeof window.dongsan.cancelNovelAiGeneration === 'function') {
    window.dongsan.cancelNovelAiGeneration().catch(() => {});
  }
});
elements.toggleNegativePromptButton.addEventListener('click', toggleNegativePromptPreview);
elements.keepImageButton.addEventListener('click', keepAndExportSelectedImage);
elements.rejectImageButton.addEventListener('click', rejectSelectedImage);
elements.favoriteImageButton.addEventListener('click', toggleFavoriteSelectedImage);
elements.saveImageNoteButton.addEventListener('click', saveSelectedImageNote);
elements.novelAiVariationButton.addEventListener('click', novelAiVariationFromSelectedImage);
elements.novelAiInpaintButton.addEventListener('click', novelAiInpaintSelectedImage);
elements.inpaintBrushButton.addEventListener('click', () => setInpaintMode('brush'));
elements.inpaintEraserButton.addEventListener('click', () => setInpaintMode('eraser'));
elements.clearInpaintMaskButton.addEventListener('click', clearInpaintMask);
elements.inpaintBrushSizeInput.addEventListener('input', () => updateInpaintBrushCursor());
elements.inpaintMaskCanvas.addEventListener('wheel', zoomInpaintCanvas, { passive: false });
elements.inpaintMaskCanvas.addEventListener('pointerenter', showInpaintBrushCursor);
elements.inpaintMaskCanvas.addEventListener('pointerleave', hideInpaintBrushCursor);
elements.inpaintMaskCanvas.addEventListener('pointerdown', beginInpaintStroke);
elements.inpaintMaskCanvas.addEventListener('pointermove', drawInpaintStroke);
elements.inpaintMaskCanvas.addEventListener('pointerup', endInpaintStroke);
elements.inpaintMaskCanvas.addEventListener('pointercancel', endInpaintStroke);
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

window.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('drop', (event) => {
  event.preventDefault();
  const file = Array.from(event.dataTransfer.files || []).find((item) => (
    String(item?.name || item?.path || '').toLowerCase().endsWith('.png')
  ));

  if (file) {
    importDroppedPngMetadata(file);
  }
});

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
