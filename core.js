const projectVersion = 1;

const defaultGenerationSettings = {
  provider: 'mock',
  endpoint: 'https://image.novelai.net/ai/generate-image',
  model: 'nai-diffusion-4-5-full',
  width: 1280,
  height: 768,
  steps: 28,
  scale: 6.8,
  sampler: 'Euler Ancestral',
  cfgRescale: 0.5,
  noiseSchedule: 'karras',
  seed: '',
  imageCount: 1,
  basePrompt: '',
  baseNegativePrompt: '',
  customTagRules: [],
  characterPromptPresets: []
};

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

function normalizeSubsceneScene(scene, index) {
  const sceneNo = String(scene?.sceneNo || '').trim();
  const description = String(scene?.description || '');
  const subsceneDescriptionMatch = description.match(/^\s*[-\u2013\u2014]\s*([A-Za-z0-9_.]+)\b\s*(.*)$/s);

  if (!sceneNo || sceneNo.includes('-') || !subsceneDescriptionMatch) {
    return scene;
  }

  const nextSceneNo = `${sceneNo}-${subsceneDescriptionMatch[1]}`;
  const nextWarnings = Array.isArray(scene.parserWarnings)
    ? scene.parserWarnings.filter((warning) => !String(warning).includes('Duplicate scene number'))
    : [];

  return {
    ...scene,
    sceneNo: nextSceneNo,
    id: scene.id || makeSceneId(nextSceneNo, index),
    description: subsceneDescriptionMatch[2].trimStart(),
    parserWarnings: nextWarnings,
    status: nextWarnings.length > 0 ? scene.status : (scene.status === 'needs_review' ? 'imported' : scene.status)
  };
}

function normalizeProject(project) {
  const scenes = Array.isArray(project?.scenes)
    ? project.scenes.map(normalizeSubsceneScene)
    : [];

  return {
    ...createEmptyProject(),
    ...project,
    scenes,
    generationJobs: Array.isArray(project?.generationJobs) ? project.generationJobs : [],
    images: Array.isArray(project?.images) ? project.images : [],
    settings: {
      ...defaultGenerationSettings,
      ...(project?.settings || {})
    }
  };
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
      negativeTags: [],
      prompt: '',
      negativePrompt: '',
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
      negativeTags: [],
      prompt: '',
      negativePrompt: '',
      parserWarnings,
      userLockedTags: [],
      createdAt: now,
      updatedAt: now
    };
  });
}

function addTag(tags, tag) {
  const normalized = normalizePromptTag(tag);

  if (normalized && !tags.includes(normalized)) {
    tags.push(normalized);
  }
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function normalizePromptTag(tag) {
  return String(tag || '').trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

function getPromptTagSortLabel(tag) {
  const normalized = normalizePromptTag(tag);
  const match = normalized.match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)::(.+)::$/);
  return match ? normalizePromptTag(match[1]) : normalized;
}

const promptTagOrder = [
  ['1girl', '1boy', 'multiple girls', 'solo'],
  ['cowboy shot', 'bust shot', 'upper body', 'close-up', 'wide shot', 'side view', 'from side', 'from above', 'from below', 'pov', 'dutch angle', 'looking at another', 'looking at viewer', 'looking back'],
  ['indoors', 'outdoors', 'bedroom', 'bed', 'table', 'school', 'classroom', 'market street', 'city street', 'forest', 'night', 'sunset', 'rain'],
  ['standing', 'walking', 'sitting', 'kneeling', 'lying', 'leaning forward', 'arms around shoulders', 'holding hands', 'waving', 'hands behind back', 'hair flip', 'pointing', 'wink', 'whispering', 'background crowd'],
  ['smile', 'angry', 'glaring', 'scared', 'surprised', 'embarrassed', 'drunk', 'blush', 'tears'],
  ['breasts', 'breast focus', 'ass focus', 'cropped torso', 'face out of frame', 'cropped face', 'highly detailed'],
  ['explicit', 'sex', 'vaginal', 'pussy', 'pussy focus', 'spread legs', 'fingering', 'clitoris', 'breast sucking', 'breast grab', 'kissing', 'saliva', 'doggystyle', 'mating press', 'missionary', 'fellatio', 'cum', 'cumdrip', 'after sex', 'restrained', 'hand over mouth', 'head grab'],
  ['holding phone', 'smartphone', 'drinking', 'undressing', 'covering self']
];

const promptTagRank = promptTagOrder.reduce((acc, group, groupIndex) => {
  group.forEach((tag, tagIndex) => {
    acc[tag] = groupIndex * 100 + tagIndex;
  });
  return acc;
}, {});

function orderPromptTags(tags) {
  return [...new Set(tags.map(normalizePromptTag).filter(Boolean))]
    .sort((left, right) => {
      const leftLabel = getPromptTagSortLabel(left);
      const rightLabel = getPromptTagSortLabel(right);
      const leftRank = promptTagRank[leftLabel] ?? 9000;
      const rightRank = promptTagRank[rightLabel] ?? 9000;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return leftLabel.localeCompare(rightLabel);
    });
}

const renaSachonDraftRules = [
  { triggers: ['from below', '\uC544\uB798\uC5D0\uC11C', '\uB85C\uC6B0\uC575\uAE00'], tags: ['from below'] },
  { triggers: ['from above', '\uC704\uC5D0\uC11C', '\uB0B4\uB824\uB2E4', '\uC815\uC218\uB9AC'], tags: ['from above'] },
  { triggers: ['from side', 'side view', '\uCE21\uBA74'], tags: ['from side', 'side view'] },
  { triggers: ['pov', '\uB0A8\uC790 \uC2DC\uC810', '\uB0A8\uC790\uAC00 \uC704\uC5D0\uC11C', '\uD558\uC774\uC575\uAE00'], tags: ['pov'] },
  { triggers: ['\uB300\uAC01\uC120', '\uB300\uAC01\uC120\uC774\uC5B4\uB3C4'], tags: ['dutch angle'] },
  { triggers: ['\uD654\uBA74 \uBC14\uB77C\uBCF4', '\uCE74\uBA54\uB77C \uBC14\uB77C', 'looking at viewer'], tags: ['looking at viewer'] },
  { triggers: ['\uB4A4\uB3CC\uC544\uBCF4', '\uB4A4\uC5D0\uC11C \uCE74\uBA54\uB77C'], tags: ['looking back'] },
  { triggers: ['\uC804\uD654\uAE30', '\uD3F0', 'phone'], tags: ['holding phone', 'smartphone'] },
  { triggers: ['\uC548\uB155 \uC190', '\uAE30\uC548\uB155 \uC190'], tags: ['waving'] },
  { triggers: ['\uC190 \uB4A4\uB85C', '\uB4A4\uB85C \uAF2C\uACE0'], tags: ['hands behind back'] },
  { triggers: ['\uBA38\uB9AC\uCE74\uB77D \uB118\uAE30', '\uBA38\uB9AC \uB118\uAE30'], tags: ['hair flip'] },
  { triggers: ['\uC190 \uC7A1', '\uC190\uC7A1', '\uAE4D\uC9C0'], tags: ['holding hands'] },
  { triggers: ['\uAC00\uC2B4', 'breast'], tags: ['breasts', 'breast focus'] },
  { triggers: ['\uC5C9\uB369\uC774'], tags: ['ass focus'] },
  { triggers: ['\uBC25\uC0C1', 'table', '\uC220\uC0C1'], tags: ['table'] },
  { triggers: ['\uC220 \uB9C8\uC2DC', '\uAC74\uBC30', '\uB9C8\uC2DC\uB294'], tags: ['drinking'] },
  { triggers: ['\uCDE8\uD55C', '\uCDE8\uD574', '\uCDE8\uD55C\uD45C\uC815', '\uD5E4\uB871\uD5E4\uB871', '\uBE44\uD2C0\uBE44\uD2C0'], tags: ['drunk', 'blush'] },
  { triggers: ['\uCE68\uB300'], tags: ['bedroom', 'bed'] },
  { triggers: ['\uB204\uC6B4', '\uB204\uC6CC'], tags: ['lying'] },
  { triggers: ['\uC8FC\uC800\uC549', '\uC549\uC544', '\uC790\uB9AC\uC5D0 \uC549'], tags: ['sitting'] },
  { triggers: ['\uBB34\uB98E', '\uAFC7\uC740'], tags: ['kneeling'] },
  { triggers: ['\uD074\uB85C\uC988\uC5C5'], tags: ['close-up'] },
  { triggers: ['\uC0C1\uCCB4'], tags: ['upper body'] },
  { triggers: ['\uC5BC\uAD74 \uBCF4\uC774\uC9C0 \uC54A\uAC8C', '\uC5BC\uAD74\uBCF4\uC774\uC9C0 \uC54A\uAC8C'], tags: ['face out of frame', 'cropped face'] },
  { triggers: ['\uB2F9\uD669', '\uB180\uB78C', '\uC7A0 \uAE6C'], tags: ['surprised'] },
  { triggers: ['\uBD80\uB044\uB7EC\uC6B4', '\uBD80\uB044\uB7EC\uC6B4\uB4EF'], tags: ['embarrassed', 'blush'] },
  { triggers: ['\uC637 \uD6CC\uB801', '\uBC97\uACA8', '\uB0B4\uB824\uC694'], tags: ['undressing'] },
  { triggers: ['\uBAB8\uC744 \uAC00\uB9AC', '\uC785 \uD2C0\uC5B4\uB9C9'], tags: ['covering self'] },
  { triggers: ['\uB0A8\uC790 \uC190\uB9CC', 'pov hand only'], tags: ['pov hands'] },
  { triggers: ['\uAC77\uB294', '\uC6C0\uC9C1\uC774\uB294', '\uC6C0\uC9C1\uC784'], tags: ['walking'] },
  { triggers: ['pussy focus', '\uBCF4\uC9C0'], tags: ['explicit', 'pussy', 'pussy focus'] },
  { triggers: ['\uC131\uAE30 \uD074\uB85C\uC988\uC5C5'], tags: ['explicit', 'pussy', 'pussy focus', 'close-up'] },
  { triggers: ['\uC190\uAC00\uB77D', '\uD551\uAC70\uB9C1', 'fingering'], tags: ['explicit', 'fingering'] },
  { triggers: ['\uB2E4\uB9AC \uBC8C\uB9B0', '\uB2E4\uB9AC\uB97C \uBC8C\uB9B0'], tags: ['spread legs'] },
  { triggers: ['\uD074\uB9AC', '\uD074\uB9AC\uD1A0\uB9AC\uC2A4', 'clitoris'], tags: ['explicit', 'clitoris'] },
  { triggers: ['\uAC00\uC2B4 \uBE68', '\uAC00\uC2B4 \uBE60', '\uC720\uB450 \uBE68'], tags: ['explicit', 'breast sucking', 'breast focus'] },
  { triggers: ['\uAC00\uC2B4 \uC7A1', '\uAC00\uC2B4 \uC7A1\uAE30'], tags: ['breast grab', 'breast focus'] },
  { triggers: ['\uD0A4\uC2A4', 'kiss'], tags: ['kissing'] },
  { triggers: ['\uAC8C\uAC78\uC2A4\uB7FD', '\uB098\uB20C\uC11C'], tags: ['saliva'] },
  { triggers: ['\uC0BD\uC785', '\uD53C\uC2A4\uD1A4', '\uBC15\uAE30', '\uD37D\uD37D'], tags: ['explicit', 'sex', 'vaginal'] },
  { triggers: ['\uD6C4\uBC30\uC704', '\uB4A4\uB85C \uBC15\uAE30'], tags: ['explicit', 'sex', 'doggystyle', 'from behind'] },
  { triggers: ['\uAD50\uBC30 \uD504\uB808\uC2A4', '\uAD50\uBC30\uD504\uB808\uC2A4'], tags: ['explicit', 'sex', 'mating press', 'missionary'] },
  { triggers: ['\uCE21\uC704'], tags: ['explicit', 'sex', 'side view'] },
  { triggers: ['\uD3A0\uB77C'], tags: ['explicit', 'fellatio'] },
  { triggers: ['\uBA38\uB9AC \uC7A1', '\uBA38\uB9AC\uB97C \uC7A1'], tags: ['head grab'] },
  { triggers: ['\uC785\uC5D0 \uB123', '\uC785\uC5D0 \uB123\uC740'], tags: ['fellatio'] },
  { triggers: ['\uC815\uC561', '\uD750\uB974\uB294', '\uD750\uB974\uB294 \uC815\uC561'], tags: ['explicit', 'cum', 'cumdrip'] },
  { triggers: ['\uC9C0\uCCD0\uC11C', '\uC4F0\uB7EC\uC9C4'], tags: ['after sex', 'lying'] },
  { triggers: ['\uC5C9\uB369\uC774 \uB4E4\uACE0', '\uC5C9\uB369\uC774\uB97C \uB4E4'], tags: ['ass focus'] },
  { triggers: ['\uC785 \uD2C0\uC5B4\uB9C9', '\uC785\uC744 \uD2C0\uC5B4\uB9C9'], tags: ['hand over mouth'] },
  { triggers: ['\uD314 \uB4A4\uB85C \uBD99\uC7A1', '\uBD99\uC7A1\uD78C \uD314'], tags: ['restrained', 'arms behind back'] },
  { triggers: ['\uCE68\uB300 \uC704', '\uCE68\uB300\uC5D0'], tags: ['bedroom', 'bed'] },
  { triggers: ['\uC6B0\uB294 \uC5BC\uAD74', '\uC6B8\uBD80\uC9D6'], tags: ['crying', 'tears'] }
];

function applyDraftRuleSet(description, tags) {
  const text = String(description || '').toLowerCase();

  renaSachonDraftRules.forEach((rule) => {
    if (!hasAny(text, rule.triggers.map((trigger) => String(trigger).toLowerCase()))) {
      return;
    }

    rule.tags.forEach((tag) => addTag(tags, tag));
  });
}

function cleanRuleLabel(value) {
  return String(value || '')
    .replace(/^[\s└├─\-•*]+/g, '')
    .trim();
}

function splitPromptTags(value) {
  return String(value || '')
    .split(',')
    .map(normalizePromptTag)
    .filter(Boolean);
}

function parseTagDictionary(text) {
  const rules = [];
  const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let category = '';

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed === '---') {
      return;
    }

    if (trimmed.startsWith('■')) {
      category = trimmed.replace(/^■\s*/, '').trim();
      return;
    }

    const separatorIndex = trimmed.indexOf(' : ');

    if (separatorIndex === -1) {
      return;
    }

    const label = cleanRuleLabel(trimmed.slice(0, separatorIndex));
    const tags = splitPromptTags(trimmed.slice(separatorIndex + 3));

    if (!label || tags.length === 0) {
      return;
    }

    rules.push({
      id: `${category}:${label}:${tags.join('|')}`,
      category,
      label,
      triggers: [label],
      tags
    });
  });

  return rules;
}

const builtInSemanticTagRules = [
  {
    label: '윙크',
    triggers: ['윙크', 'wink', '한쪽 눈'],
    tags: ['wink', 'one eye closed']
  },
  {
    label: '바라봄',
    triggers: ['바라보', '쳐다보', '보며', '시선'],
    tags: ['looking at another']
  },
  {
    label: '정면 응시',
    triggers: ['정면을 바라', '정면을 응시', '이쪽을 바라', '카메라를 바라'],
    tags: ['looking at viewer']
  }
];

function applyCustomTagRules(description, customRules = []) {
  const text = String(description || '').toLowerCase();
  const tags = [];
  const rules = [...builtInSemanticTagRules, ...(Array.isArray(customRules) ? customRules : [])];

  rules.forEach((rule) => {
    const triggers = Array.isArray(rule.triggers) && rule.triggers.length > 0
      ? rule.triggers
      : [rule.label];
    const matched = triggers.some((trigger) => {
      const normalizedTrigger = String(trigger || '').trim().toLowerCase();
      return normalizedTrigger && text.includes(normalizedTrigger);
    });

    if (!matched) {
      return;
    }

    splitPromptTags(rule.tags || []).forEach((tag) => addTag(tags, tag));
  });

  return {
    tags: orderPromptTags(tags),
    negativeTags: []
  };
}

function generateDraftTags(description) {
  const text = description.toLowerCase();
  const tags = [];
  const negativeTags = [
    'low quality',
    'worst quality',
    'bad anatomy',
    'bad hands',
    'extra fingers',
    'text',
    'watermark'
  ];

  if (hasAny(text, ['girl', 'woman', 'female', '\uC18C\uB140', '\uC5EC\uC790', '\uC5EC\uC131'])) {
    addTag(tags, '1girl');
  }

  if (hasAny(text, ['boy', 'man', 'male', '\uC18C\uB144', '\uB0A8\uC790', '\uB0A8\uC131'])) {
    addTag(tags, '1boy');
  }

  if (hasAny(text, ['solo', 'alone', '\uD63C\uC790', '\uB2E8\uB3C5'])) {
    addTag(tags, 'solo');
  }

  if (hasAny(text, ['night', '\uBC24', '\uC57C\uAC04'])) {
    addTag(tags, 'night');
  }

  if (hasAny(text, ['sunset', '\uB178\uC744', '\uD669\uD63C'])) {
    addTag(tags, 'sunset');
  }

  if (hasAny(text, ['rain', 'raining', '\uBE44', '\uBE57\uC18D'])) {
    addTag(tags, 'rain');
  }

  if (hasAny(text, ['city', 'street', '\uB3C4\uC2DC', '\uAC70\uB9AC'])) {
    addTag(tags, 'city street');
  }

  if (hasAny(text, ['\uC2DC\uC7A5', '\uC2DC\uC7A5\uAE38', '\uC2DC\uC7A5 \uAE38\uAC70\uB9AC'])) {
    addTag(tags, 'market street');
  }

  if (hasAny(text, ['room', 'bedroom', '\uBC29', '\uCE68\uC2E4'])) {
    addTag(tags, 'indoors');
  }

  if (hasAny(text, ['outside', 'outdoor', 'outdoors', '\uC57C\uC678', '\uBC16\uC5D0\uC11C'])) {
    addTag(tags, 'outdoors');
  }

  if (hasAny(text, ['school', 'classroom', '\uD559\uAD50', '\uAD50\uC2E4'])) {
    addTag(tags, 'school');
  }

  if (hasAny(text, ['classroom', '\uAD50\uC2E4'])) {
    addTag(tags, 'classroom');
  }

  if (hasAny(text, ['forest', 'tree', '\uC232', '\uB098\uBB34'])) {
    addTag(tags, 'forest');
  }

  if (hasAny(text, ['close-up', 'close up', '\uD074\uB85C\uC988\uC5C5'])) {
    addTag(tags, 'close-up');
  }

  if (hasAny(text, ['cowboy shot', '\uBB34\uB98E', '\uD5C8\uBC85\uC9C0'])) {
    addTag(tags, 'cowboy shot');
  }

  if (hasAny(text, ['bust shot', '\uBC84\uC2A4\uD2B8 \uC20F', '\uBC14\uC2A4\uD2B8 \uC20F'])) {
    addTag(tags, 'bust shot');
  }

  if (hasAny(text, ['side view', 'profile', '\uCE21\uBA74'])) {
    addTag(tags, 'side view');
  }

  if (hasAny(text, ['front view', 'facing viewer', '\uC815\uBA74'])) {
    addTag(tags, 'looking at viewer');
  }

  if (hasAny(text, ['\uCF54 ~ \uBA85\uCE58', '\uCF54~\uBA85\uCE58', '\uBA85\uCE58 \uC544\uB798', '\uBA85\uCE58\uC544\uB798'])) {
    addTag(tags, 'upper body');
    addTag(tags, 'cropped torso');
  }

  if (hasAny(text, ['wide shot', '\uC640\uC774\uB4DC'])) {
    addTag(tags, 'wide shot');
  }

  if (hasAny(text, ['\uD654\uAC00 \uB09C', '\uBD84\uB178', '\uD654\uB0B4', 'angry'])) {
    addTag(tags, 'angry');
  }

  if (hasAny(text, ['\uB178\uB824\uBD04', '\uB178\uB824\uBCF4', '\uC751\uC2DC', 'glare', 'glaring'])) {
    addTag(tags, 'glaring');
  }

  if (hasAny(text, ['\uD788\uC775', '\uB5A0\uB294', '\uBB34\uC11C', 'scared', 'frightened'])) {
    addTag(tags, 'scared');
  }

  if (hasAny(text, ['\uBD88\uC465', '\uD280\uC5B4\uB098', 'suddenly', 'surprised'])) {
    addTag(tags, 'surprised');
  }

  if (hasAny(text, ['smile', 'smiling', '\uBBF8\uC18C', '\uC6C3'])) {
    addTag(tags, 'smile');
  }

  if (hasAny(text, ['blush', '\uD64D\uC870', '\uBD89', '\uBE68\uAC1C'])) {
    addTag(tags, 'blush');
  }

  if (hasAny(text, ['cry', 'crying', 'tear', '\uB208\uBB3C', '\uC6B8'])) {
    addTag(tags, 'tears');
  }

  if (hasAny(text, ['standing', '\uC11C \uC788', '\uC11C\uC788'])) {
    addTag(tags, 'standing');
  }

  if (hasAny(text, ['walking', 'walks', '\uAC77', '\uAC78\uC5B4', '\uAC78\uC74C'])) {
    addTag(tags, 'walking');
  }

  if (hasAny(text, ['sitting', '\uC549'])) {
    addTag(tags, 'sitting');
  }

  if (hasAny(text, ['whisper', 'murmur', '\uC218\uADFC', '\uC6C5\uC131'])) {
    addTag(tags, 'whispering');
    addTag(tags, 'background crowd');
  }

  if (hasAny(text, ['wink', '\uC719\uD06C'])) {
    addTag(tags, 'wink');
  }

  if (hasAny(text, ['\uC5B4\uAE68\uB3D9\uBB34', 'arm around', 'arms around'])) {
    addTag(tags, 'arms around shoulders');
  }

  if (hasAny(text, ['\uC5BC\uAD74\uC744 \uB4E4\uC774\uBC00', '\uB4E4\uC774\uBC00', 'leaning forward'])) {
    addTag(tags, 'leaning forward');
  }

  if (hasAny(text, ['looking at', '\uBCF4\uBA70', '\uBC14\uB77C\uBCF4', '\uCCD0\uB2E4\uBCF4'])) {
    addTag(tags, 'looking at another');
  }

  if (hasAny(text, ['\uC5EC\uC790\uB4E4', '\uC5EC\uC131\uB4E4'])) {
    addTag(tags, 'multiple girls');
  }

  if (hasAny(text, ['\uC900\uCCA0', '\uB0A8\uC790 \uC8FC\uC778\uACF5', '\uC8FC\uC778\uACF5'])) {
    addTag(tags, '1boy');
  }

  applyDraftRuleSet(description, tags);

  const orderedTags = orderPromptTags(tags);
  const orderedNegativeTags = orderPromptTags(negativeTags);

  return {
    tags: orderedTags,
    negativeTags: orderedNegativeTags,
    prompt: orderedTags.join(', '),
    negativePrompt: orderedNegativeTags.join(', ')
  };
}

function createMockGeneration(project, scene, imagePath, imageUri, settings = {}) {
  const now = new Date().toISOString();
  const jobId = `job-${Date.now()}`;
  const imageId = `image-${Date.now()}`;
  const generationSettings = {
    ...defaultGenerationSettings,
    ...settings
  };

  const job = {
    id: jobId,
    sceneId: scene.id,
    status: 'generated',
    request: {
      prompt: scene.prompt,
      negativePrompt: scene.negativePrompt,
      basePrompt: scene.basePrompt || scene.prompt,
      baseNegativePrompt: scene.baseNegativePrompt || scene.negativePrompt,
      characterPromptsText: scene.characterPromptsText || '',
      characterNegativePromptsText: scene.characterNegativePromptsText || '',
      characterPositionsText: scene.characterPositionsText || '',
      mode: 'mock',
      settings: generationSettings
    },
    resultImageIds: [imageId],
    error: null,
    createdAt: now,
    updatedAt: now
  };

  const image = {
    id: imageId,
    sceneId: scene.id,
    jobId,
    path: imagePath,
    uri: imageUri,
    metadata: {
      prompt: scene.prompt,
      negativePrompt: scene.negativePrompt,
      basePrompt: scene.basePrompt || scene.prompt,
      baseNegativePrompt: scene.baseNegativePrompt || scene.negativePrompt,
      characterPromptsText: scene.characterPromptsText || '',
      characterNegativePromptsText: scene.characterNegativePromptsText || '',
      characterPositionsText: scene.characterPositionsText || '',
      seed: generationSettings.seed || 0,
      model: generationSettings.model,
      sampler: generationSettings.sampler,
      steps: generationSettings.steps,
      scale: generationSettings.scale,
      cfgRescale: generationSettings.cfgRescale,
      noiseSchedule: generationSettings.noiseSchedule,
      width: generationSettings.width,
      height: generationSettings.height,
      sourceImageId: generationSettings.sourceImageId || '',
      inpaintStrength: generationSettings.inpaintStrength ?? ''
    },
    favorite: false,
    status: 'candidate',
    note: '',
    createdAt: now
  };

  return {
    ...normalizeProject(project),
    scenes: project.scenes.map((item) => item.id === scene.id ? { ...item, status: 'generated', updatedAt: now } : item),
    generationJobs: [...(project.generationJobs || []), job],
    images: [...(project.images || []), image],
    updatedAt: now
  };
}

function createGenerationRecord(project, scene, imageRecords, settings = {}, mode = 'novelai') {
  const now = new Date().toISOString();
  const jobId = `job-${Date.now()}`;
  const generationSettings = {
    ...defaultGenerationSettings,
    ...settings
  };
  const images = imageRecords.map((record, index) => ({
    id: `${jobId}-image-${index + 1}`,
    sceneId: scene.id,
    jobId,
    path: record.path,
    uri: record.uri,
    metadata: {
      prompt: scene.prompt,
      negativePrompt: scene.negativePrompt,
      basePrompt: scene.basePrompt || scene.prompt,
      baseNegativePrompt: scene.baseNegativePrompt || scene.negativePrompt,
      characterPromptsText: scene.characterPromptsText || '',
      characterNegativePromptsText: scene.characterNegativePromptsText || '',
      characterPositionsText: scene.characterPositionsText || '',
      seed: record.seed || generationSettings.seed || 0,
      model: generationSettings.model,
      sampler: generationSettings.sampler,
      steps: generationSettings.steps,
      scale: generationSettings.scale,
      cfgRescale: generationSettings.cfgRescale,
      noiseSchedule: generationSettings.noiseSchedule,
      width: generationSettings.width,
      height: generationSettings.height
    },
    favorite: false,
    status: 'candidate',
    note: '',
    createdAt: now
  }));
  const job = {
    id: jobId,
    sceneId: scene.id,
    status: 'generated',
    request: {
      prompt: scene.prompt,
      negativePrompt: scene.negativePrompt,
      basePrompt: scene.basePrompt || scene.prompt,
      baseNegativePrompt: scene.baseNegativePrompt || scene.negativePrompt,
      characterPromptsText: scene.characterPromptsText || '',
      characterNegativePromptsText: scene.characterNegativePromptsText || '',
      characterPositionsText: scene.characterPositionsText || '',
      mode,
      settings: generationSettings
    },
    resultImageIds: images.map((image) => image.id),
    error: null,
    createdAt: now,
    updatedAt: now
  };

  return {
    ...normalizeProject(project),
    scenes: project.scenes.map((item) => item.id === scene.id ? { ...item, status: 'generated', updatedAt: now } : item),
    generationJobs: [...(project.generationJobs || []), job],
    images: [...(project.images || []), ...images],
    updatedAt: now
  };
}

function createFailedGenerationRecord(project, scene, errorMessage, settings = {}, mode = 'novelai') {
  const now = new Date().toISOString();
  const job = {
    id: `job-${Date.now()}`,
    sceneId: scene.id,
    status: 'failed',
    request: {
      prompt: scene.prompt,
      negativePrompt: scene.negativePrompt,
      basePrompt: scene.basePrompt || scene.prompt,
      baseNegativePrompt: scene.baseNegativePrompt || scene.negativePrompt,
      characterPromptsText: scene.characterPromptsText || '',
      characterNegativePromptsText: scene.characterNegativePromptsText || '',
      characterPositionsText: scene.characterPositionsText || '',
      mode,
      settings: {
        ...defaultGenerationSettings,
        ...settings
      }
    },
    resultImageIds: [],
    error: errorMessage,
    createdAt: now,
    updatedAt: now
  };

  return {
    ...normalizeProject(project),
    scenes: project.scenes.map((item) => item.id === scene.id ? { ...item, status: 'failed', updatedAt: now } : item),
    generationJobs: [...(project.generationJobs || []), job],
    updatedAt: now
  };
}

module.exports = {
  projectVersion,
  defaultGenerationSettings,
  createEmptyProject,
  normalizeProject,
  parseScenes,
  generateDraftTags,
  parseTagDictionary,
  applyCustomTagRules,
  orderPromptTags,
  createMockGeneration,
  createGenerationRecord,
  createFailedGenerationRecord
};
