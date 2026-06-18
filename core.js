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

function getDefaultTagTarget(tag) {
  const label = getPromptTagSortLabel(tag);
  const targetMap = {
    "underbody to male's face": 'character-0',
    'top-down bottom-up': 'character-1',
    'pinching nipple': 'character-1',
    'hands on breasts': 'character-1',
    'anal penetration': 'characters-0-1',
    'anal sex': 'characters-0-1'
  };

  if (targetMap[label]) {
    return targetMap[label];
  }
  const sceneLabels = new Set([
    '1girl', '1boy', 'multiple girls', 'multiple boys', 'solo', 'yuri',
    'cowboy shot', 'medium shot', 'bust shot', 'upper body', 'full body', 'wide shot',
    'pov', 'pov hands', 'pov doorway', 'over shoulder', 'multiple views', 'straight-on',
    'facing away', 'three quarter view', 'dutch angle', 'dynamic angle', 'upside-down',
    "from above", 'high up', 'from below', "worm's eye view", 'from side',
    'facing to the side', 'profile', 'from behind', 'indoors', 'outdoors',
    'entrance', 'doorway', 'bedroom', 'bathroom', 'bathtub', 'open door',
    'bed', 'mattress', 'couch', 'table', 'desk', 'news desk', 'newsroom',
    'counter', 'cash register', 'under desk', 'sink', 'stage', 'school', 'classroom', 'market street',
    'city street', 'forest', 'night', 'sunset', 'rain', 'pussy penetration',
    'kissing', 'imminent kiss', 'saliva', 'imminent penetration',
    'penis on pussy', 'disembodied penis', 'grinding', 'sixty-nine', 'doggystyle',
    'cowgirl position', 'paizuri', 'mating press', 'missionary', 'side sex',
    'fellatio', 'deepthroat', 'gagging', 'anal plug', 'spanking', 'urine', 'after sex',
    'multiple penises', 'penis on face', 'double handjob', 'creampie', 'cum in mouth',
    'male masturbation', 'background men', 'microphone', 'swallowing',
    'pussy licking', 'cunnilingus', 'facesitting', 'pussy on face',
    'female masturbation', 'masturbation focus',
    'spread pussy', 'spread anus',
    'standing sex', 'held up', 'against wall', 'forced kiss',
    'washing dishes', 'hand on screen', 'outstretched arms', 'arms towards viewer',
    'underbody only', 'upper body only', 'face only', 'penetration focus',
    'forehead-to-forehead', 'facing another', 'reaching towards viewer'
  ]);

  return sceneLabels.has(label) ? 'scene' : 'character-0';
}

function normalizeTagAssignments(assignments, tags) {
  const source = assignments && typeof assignments === 'object' ? assignments : {};
  return Object.fromEntries(orderPromptTags(tags || []).map((tag) => {
    const target = source[tag] || source[getPromptTagSortLabel(tag)] || getDefaultTagTarget(tag);
    return [tag, target];
  }));
}

function getCharacterIndexesForTagTarget(target) {
  const normalized = String(target || '');
  const multiMatch = normalized.match(/^characters-([0-9-]+)$/);

  if (multiMatch) {
    return multiMatch[1]
      .split('-')
      .map((value) => Number(value))
      .filter((value, index, values) => Number.isInteger(value) && value >= 0 && values.indexOf(value) === index);
  }

  const singleMatch = normalized.match(/^character-(\d+)$/);
  return singleMatch ? [Number(singleMatch[1])] : [0];
}

function splitTagsByTarget(tags, assignments = {}) {
  return orderPromptTags(tags || []).reduce((acc, tag) => {
    const target = assignments[tag] || assignments[getPromptTagSortLabel(tag)] || getDefaultTagTarget(tag);

    if (target === 'scene') {
      acc.sceneTags.push(tag);
      return acc;
    }

    getCharacterIndexesForTagTarget(target).forEach((characterIndex) => {
      if (!acc.characterTags[characterIndex]) {
        acc.characterTags[characterIndex] = [];
      }
      acc.characterTags[characterIndex].push(tag);
    });
    return acc;
  }, { sceneTags: [], characterTags: [] });
}

function formatWildcardPrompt(wildcard) {
  const options = Array.isArray(wildcard?.options)
    ? wildcard.options.map((option) => String(option || '').trim()).filter(Boolean)
    : [];

  return options.length > 0 ? `||${options.join('|')}||` : '';
}

function splitWildcardPromptsByTarget(wildcards = []) {
  return (Array.isArray(wildcards) ? wildcards : []).reduce((acc, wildcard) => {
    const value = formatWildcardPrompt(wildcard);

    if (!value) {
      return acc;
    }

    if ((wildcard.target || 'scene') === 'scene') {
      acc.sceneTags.push(value);
      return acc;
    }

    getCharacterIndexesForTagTarget(wildcard.target).forEach((characterIndex) => {
      if (!acc.characterTags[characterIndex]) {
        acc.characterTags[characterIndex] = [];
      }
      acc.characterTags[characterIndex].push(value);
    });
    return acc;
  }, { sceneTags: [], characterTags: [] });
}

function normalizeProject(project) {
  const scenes = Array.isArray(project?.scenes)
    ? project.scenes.map((scene, index) => {
      const normalizedScene = normalizeSubsceneScene(scene, index);
      return {
        ...normalizedScene,
        tagAssignments: normalizeTagAssignments(normalizedScene.tagAssignments, normalizedScene.tags || []),
        wildcardPrompts: Array.isArray(normalizedScene.wildcardPrompts) ? normalizedScene.wildcardPrompts : []
      };
    })
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
      tagAssignments: {},
      negativeTags: [],
      wildcardPrompts: [],
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
      tagAssignments: {},
      negativeTags: [],
      wildcardPrompts: [],
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
  ['1girl', '1boy', 'multiple girls', 'multiple boys', 'solo', 'yuri'],
  ['cowboy shot', 'medium shot', 'bust shot', 'upper body', 'full body', 'wide shot', 'pov', 'pov hands', 'pov doorway', 'over shoulder', 'multiple views', 'straight-on', 'facing away', 'three quarter view', 'dutch angle', 'dynamic angle', 'upside-down', 'from above', 'high up', 'from below', "worm's eye view", 'from side', 'facing to the side', 'profile', 'from behind', 'looking at viewer', 'looking down', 'looking back'],
  ['indoors', 'outdoors', 'entrance', 'doorway', 'bedroom', 'bathroom', 'bathtub', 'open door', 'bed', 'mattress', 'couch', 'table', 'desk', 'news desk', 'newsroom', 'counter', 'cash register', 'under desk', 'sink', 'stage', 'school', 'classroom', 'market street', 'city street', 'forest', 'night', 'sunset', 'rain'],
  ['standing', 'walking', 'sitting', 'kneeling', 'squatting', 'lying', 'on floor', 'face down', 'arm pillow', 'bent over', 'leaning forward', 'leaning on person', 'arms around shoulders', 'arms around neck', 'arms crossed', 'hug', 'holding hands', 'holding paper', 'holding glass', 'holding money', 'holding plate', 'waving', 'bowing', 'hands behind back', 'arms behind back', 'limp arms', 'elbows on floor', 'hair flip', 'pointing', 'index finger raised', 'finger to mouth', 'straddling', 'girl on top', 'cowgirl position', 'sitting on lap', 'upright straddle', 'crossed legs', 'folded legs', 'knees up', 'yokozuwari', 'all fours', 'arched back', 'head back', 'chin up', 'hand on wall', 'hand on screen', 'hands on floor', 'hands on mattress', 'clasped hands', 'begging', 'head tilt', 'head shaking', 'holding chin', 'wink', 'whispering', 'whisper to ear', 'smelling', 'sniffing', 'selfie', 'stealing', 'cashier', 'serving customer', 'washing dishes', 'background crowd', 'background men', 'male masturbation', 'double handjob', 'outstretched arms', 'arms towards viewer'],
  ['smile', 'silly smile', 'awkward smile', 'smirk', 'expressionless', 'angry', 'glaring', 'scared', 'surprised', 'wide-eyed', 'embarrassed', 'drunk', 'blush', 'flushed face', 'tears', 'tear streaks', 'ahegao', 'rolling eyes', 'grimace', 'painful', 'open mouth', 'closed eyes', 'half-closed eyes', 'pleasure face', 'panting', 'looking up', 'disheveled', 'messy hair'],
  ['hands', 'hand focus', 'breasts', 'underboob', 'ass', 'ass focus', 'penis focus', 'penetration focus', 'lower body', 'underbody only', 'upper body only', 'cropped torso', 'male torso', 'male back', 'stomach', 'm legs', 'leg frame', 'faceless', 'face only', 'face out of frame', 'eyes out of frame', 'cropped face', 'ear', 'armpits', 'thighs', 'tail', 'tail grab', 'tail wagging', 'hand on another\'s ass', 'hands on ass', 'hand on thigh', 'grabbing thighs', 'hand on breast', 'hands on breasts', 'hand on stomach', 'hand on waist', 'groping', 'ring', 'wedding ring', 'overweight man', 'ugly man', 'highly detailed'],
  ['sex', 'pussy penetration', 'vaginal', 'anal penetration', 'anal sex', 'anal plug', 'pussy', 'pussy focus', 'spread pussy', 'spread anus', 'spread legs', 'one leg raised', 'fingering', 'fingering through panties', 'clitoris', 'breast sucking', 'breast grab', 'breast press', 'nipple flick', 'nipple stimulation', 'pinching nipple', 'hand on nipple', 'kissing', 'forced kiss', 'imminent kiss', 'saliva', 'licking lips', 'hand job', 'hands on penis', 'hand on penis', 'double handjob', 'penis', 'erection', 'clothed erection', 'large penis', 'penis on pussy', 'penis on face', 'disembodied penis', 'multiple penises', 'glans', 'testicles', 'tongue', 'licking penis', 'ear licking', 'licking', 'pussy licking', 'cunnilingus', 'facesitting', 'pussy on face', 'nude', 'topless', 'bottomless', 'partially undressed', 'open fly', 'skirt lift', 'panty pull', 'panties aside', 'wet panties', 'pants around legs', 'imminent penetration', 'grinding', 'sixty-nine', 'doggystyle', 'cowgirl position', 'paizuri', 'mating press', 'missionary', 'side sex', 'standing sex', 'held up', 'against wall', 'fellatio', 'deepthroat', 'gagging', 'spanking', 'cum', 'cumdrip', 'cum on breasts', 'cum on stomach', 'cum on hand', 'cum on body', 'cum in mouth', 'creampie', 'female ejaculation', 'urine', 'after sex', 'restrained', 'spread ass', 'clothes in mouth', 'hand over mouth', 'hair grab', 'head grab', 'masturbation', 'female masturbation', 'masturbation focus', 'seductive'],
  ['money', 'paper', 'document', 'briefcase', 'cushion', 'box', 'cardboard box', 'office chair', 'holding phone', 'phone at ear', 'smartphone', 'microphone', 'coffee', 'waffle', 'plate', 'stockings', 'bra', 'drinking', 'undressing', 'shirt lift', 'covering self', 'cheek on floor', 'leaning on door', 'forehead-to-forehead', 'facing another', 'reaching towards viewer', 'rotational symmetry', 'downblouse', 'downpants', 'swallowing']
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

const suppressedDraftTags = new Set([
  'city street',
  'rain',
  'indoors',
  'talking',
  'face focus',
  'breasts',
  'ass',
  'vaginal',
  'pussy',
  'cropped face',
  'cropped torso',
  'cropped body',
  'croped face',
  'croped body'
]);

const renaSachonDraftRules = [
  { triggers: ['1인칭', '일인칭', 'pov'], tags: ['pov'] },
  { triggers: ['다중 시점', '여러 시점', 'multiple views'], tags: ['multiple views'] },
  { triggers: ['정면에서', '정면 구도', 'straight-on', 'straight on'], tags: ['straight-on'] },
  { triggers: ['등 뒤에서', '등뒤에서', 'facing away'], tags: ['facing away'] },
  { triggers: ['45도', '45 도', 'three quarter view', '3/4 view'], tags: ['three quarter view'] },
  { triggers: ['대각선', 'dutch angle'], tags: ['dutch angle'] },
  { triggers: ['거꾸로', '상하반전', 'upside-down', 'upside down'], tags: ['upside-down'] },
  { triggers: ['위에서 - 더 높이', '더 높이', '아주 위에서', 'high up'], tags: ['high up'] },
  { triggers: ['옆에서 - 완전히 옆', '완전히 옆', 'facing to the side'], tags: ['from side', 'facing to the side'] },
  { triggers: ['옆에서 - 한쪽 얼굴만 보임', '한쪽 얼굴만 보임', '프로필', 'profile'], tags: ['from side', 'profile'] },
  { triggers: ['뒤에서', 'from behind'], tags: ['from behind'] },
  { triggers: ['1인칭 - 손', '1인칭 손', 'pov hands'], tags: ['pov hands'] },
  { triggers: ['1인칭 - 출입문', '1인칭 출입문', 'pov doorway'], tags: ['pov doorway'] },
  { triggers: ['백합 소용돌이', 'rotational symmetry'], tags: ['rotational symmetry'] },
  { triggers: ['엿보기 - 가슴', '엿보기 가슴', 'downblouse'], tags: ['downblouse'] },
  { triggers: ['엿보기 - 팬티', '엿보기 팬티', 'downpants'], tags: ['downpants'] },
  { triggers: ['from below', '밑에서', '\uC544\uB798\uC5D0\uC11C', '\uB85C\uC6B0\uC575\uAE00'], tags: ['from below'] },
  { triggers: ["worm's eye view", 'worm eye view', '\uC6DC\uC988 \uC544\uC774 \uBDF0', '\uC6DC\uC544\uC774\uBDF0'], tags: ['from below', "worm's eye view"] },
  { triggers: ['from slightly below', 'low close-up', 'low angle', '\uC544\uB798\uCABD\uC5D0\uC11C', '\uC544\uB798\uC5D0\uC11C \uC62C\uB824\uB2E4', '\uB85C\uC6B0 \uC575\uAE00'], tags: ['from below'] },
  { triggers: ['from above', '\uC704\uC5D0\uC11C', '\uB0B4\uB824\uB2E4', '\uC815\uC218\uB9AC'], tags: ['from above'] },
  { triggers: ['from side', 'side view', '옆에서', '\uCE21\uBA74', '\uC0AC\uC774\uB4DC'], tags: ['from side'] },
  { triggers: ['\uC5B4\uAE68 \uB108\uBA38', '\uC5B4\uAE68\uB108\uBA38', 'over shoulder', 'over-the-shoulder'], tags: ['over shoulder'] },
  { triggers: ['\uBBF8\uB4E4\uC0F7', '\uBBF8\uB4E4 \uC0F7', 'medium shot'], tags: ['medium shot'] },
  { triggers: ['pov', '\uB0A8\uC790 \uC2DC\uC810', '사장 시점', '사장님 시점', '\uB0A8\uC790\uAC00 \uC704\uC5D0\uC11C', '\uD558\uC774\uC575\uAE00'], tags: ['pov'] },
  { triggers: ['male pov with penis corner', 'pov penis', '\uB0A8\uC131 \uC131\uAE30\uAC00 \uD654\uBA74 \uAD6C\uC11D', '\uB0A8\uC790 \uC131\uAE30\uAC00 \uD654\uBA74 \uAD6C\uC11D', '\uD398\uB2C8\uC2A4\uAC00 \uD654\uBA74 \uAD6C\uC11D', '\uC790\uC9C0\uAC00 \uD654\uBA74 \uAD6C\uC11D'], tags: ['penis'] },
  { triggers: ['male pov with arm corner', 'pov arm', 'hand foreground', '\uB0A8\uC131 \uD314\uC774 \uD654\uBA74 \uAD6C\uC11D', '\uB0A8\uC790 \uD314\uC774 \uD654\uBA74 \uAD6C\uC11D', '\uB0A8\uC131 \uC190\uC774 \uD654\uBA74 \uAD6C\uC11D', '\uB0A8\uC790 \uC190\uC774 \uD654\uBA74 \uAD6C\uC11D'], tags: ['pov hands'] },
  { triggers: ['\uB300\uAC01\uC120', '\uB300\uAC01\uC120\uC774\uC5B4\uB3C4'], tags: ['dutch angle'] },
  { triggers: ['\uB2E4\uC774\uB098\uBBF9 \uC575\uAE00', '\uB2E4\uC774\uB098\uBBF9\uC575\uAE00', 'dynamic angle'], tags: ['dynamic angle'] },
  { triggers: ['\uB354\uD2F0\uC575\uAE00', '\uB354\uD2F0 \uC575\uAE00', 'dirty angle'], tags: ['dutch angle', 'dynamic angle'] },
  { triggers: ['\uD654\uBA74 \uBC14\uB77C\uBCF4', '\uCE74\uBA54\uB77C \uBC14\uB77C', 'looking at viewer'], tags: ['looking at viewer'] },
  { triggers: ['\uD654\uBA74\uC744 \uC815\uD655\uD788 \uBCF4', '\uD654\uBA74 \uC815\uD655\uD788 \uBCF4', '\uD654\uBA74\uC744 \uBCF4\uACE0 \uC788'], tags: ['looking at viewer'] },
  { triggers: ['looking down', '\uB0B4\uB824\uB2E4\uBD04', '\uB0B4\uB824\uB2E4\uBCF4', '\uB0B4\uB824\uB2E4\uBCF4\uB294', '\uC544\uB798\uB97C \uBC14\uB77C'], tags: ['looking down'] },
  { triggers: ['looking back', '뒤돌아보', '뒤돌아본다', '뒤를 돌아보', '\uB4A4\uB3CC\uC544\uBCF4', '\uB4A4\uC5D0\uC11C \uCE74\uBA54\uB77C', '\uC2DC\uC120\uBC29\uD5A5 \uB4A4\uB85C', '\uC2DC\uC120 \uB4A4\uB85C'], tags: ['looking back'] },
  { triggers: ['\uB4A4\uB3CC\uC544 \uBCF4', '\uB4A4\uB3CC\uC544 \uBCF4\uB294', '\uB4A4\uB3CC\uC544\uBD04', '\uB4A4 \uB3CC\uC544\uBCF4', '\uB4A4 \uB3CC\uC544\uBCF4\uBA70'], tags: ['looking back'] },
  { triggers: ['\uB4A4\uC5D0\uC11C', '\uB4A4\uC5D0\uC11C \uBC14\uB77C'], tags: ['from behind'] },
  { triggers: ['\uB4B7\uBAA8\uC2B5', '\uB4A4\uD0DC'], tags: ['from behind', 'facing away'] },
  { triggers: ['\uB3CC\uC544\uC11C\uBA70', '\uB3CC\uC544\uC11C\uB294', '\uB3CC\uC544\uC11C\uB294 \uBAA8\uC2B5', '\uB3CC\uC544\uC120'], tags: ['facing away'] },
  { triggers: ['\uBC18\uCE21\uBA74'], tags: ['three quarter view'] },
  { triggers: ['\uC644\uC804\uD55C \uC606\uBAA8\uC2B5', '\uC606\uBAA8\uC2B5', 'profile'], tags: ['from side', 'profile'] },
  { triggers: ['\uC804\uD654\uAE30', '\uD3F0', 'phone'], tags: ['holding phone', 'smartphone'] },
  { triggers: ['\uC548\uB155 \uC190', '\uAE30\uC548\uB155 \uC190'], tags: ['waving'] },
  { triggers: ['\uC190 \uB4A4\uB85C', '\uB4A4\uB85C \uAF2C\uACE0'], tags: ['hands behind back'] },
  { triggers: ['\uBA38\uB9AC\uCE74\uB77D \uB118\uAE30', '\uBA38\uB9AC \uB118\uAE30'], tags: ['hair flip'] },
  { triggers: ['\uC190 \uC7A1', '\uC190\uC7A1', '\uAE4D\uC9C0'], tags: ['holding hands'] },
  { triggers: ['\uB450 \uC190 \uC7A1', '\uB450\uC190 \uC7A1', '\uC591\uC190 \uC7A1'], tags: ['holding hands'] },
  { triggers: ['\uAC00\uC2B4', 'breast'], tags: ['breasts'] },
  { triggers: ['\uAC00\uC2B4 \uBC11', '\uAC00\uC2B4\uBC11', 'underboob'], tags: ['breasts', 'underboob'] },
  { triggers: ['\uAC00\uC2B4 \uBD80\uAC01', '\uAC00\uC2B4 \uC798 \uBCF4', '\uAC00\uC2B4\uC774 \uC798 \uBCF4'], tags: ['breasts'] },
  { triggers: ['\uC5C9\uB369\uC774'], tags: ['ass', 'ass focus'] },
  { triggers: ['\uAF2C\uB9AC'], tags: ['tail'] },
  { triggers: ['\uAF2C\uB9AC \uC7A1', '\uAF2C\uB9AC\uC7A1'], tags: ['tail', 'tail grab'] },
  { triggers: ['\uAF2C\uB9AC \uD30C\uB974\uB974', '\uAF2C\uB9AC \uC0B4\uB791', '\uC0B4\uB791\uC0B4\uB791'], tags: ['tail', 'tail wagging'] },
  { triggers: ['\uBC25\uC0C1', 'table', '\uC220\uC0C1'], tags: ['table'] },
  { triggers: ['\uCC45\uC0C1', '\uB370\uC2A4\uD06C', 'desk'], tags: ['desk'] },
  { triggers: ['\uB274\uC2A4\uB8F8', '\uB274\uC2A4\uB8F8 \uCC45\uC0C1', '\uB274\uC2A4\uB370\uC2A4\uD06C', 'newsroom', 'news desk'], tags: ['newsroom', 'news desk', 'desk'] },
  { triggers: ['\uB2E8\uC0C1', '\uB300\uAC15\uB2F9', '\uBB34\uB300', 'stage'], tags: ['stage'] },
  { triggers: ['\uACF5\uAC1C \uCD2C\uC601', '\uD64D\uBCF4\uC601\uC0C1', '\uCD2C\uC601 \uC911', '\uCE74\uBA54\uB77C\uC5D0 \uCD2C\uC601', '\uCE74\uBA54\uB77C\uB97C \uC758\uC2DD', 'front camera shot', 'camera-aware shot', 'public filming'], tags: ['straight-on', 'looking at viewer'] },
  { triggers: ['\uC8FC\uBCC0 \uC0AC\uB78C', '\uAD70\uC911', '\uAD00\uAC1D', '\uAC15\uB2F9 \uC0AC\uB78C', 'background crowd', 'crowd', 'audience'], tags: ['background crowd'] },
  { triggers: ['\uC190\uB2D8\uB4E4', '\uC190\uB2D8\uC774 \uC5EC\uB7EC', '\uCE74\uC6B4\uD130 \uC190\uB2D8', '\uC190\uB2D8 \uBCF4\uB294'], tags: ['background crowd'] },
  { triggers: ['\uB0A8\uC790\uB4E4', '\uC5EC\uB7EC \uB0A8\uC790', '\uB0A8\uC790 \uC5EC\uB7EC\uBA85', '\uB0A8\uC790 \uC5EC\uB7EC \uBA85', '\uB098\uCCB4 \uB0A8\uC790\uB4E4', '\uC8FC\uBCC0\uC758 \uB0A8\uC790\uB4E4', '\uB4A4\uC5D0 \uB0A8\uC790\uB4E4', '\uB0A8\uC790\uB4E4 \uAC00\uC6B4\uB370', 'multiple boys', 'background men'], tags: ['multiple boys', 'background men'] },
  { triggers: ['\uC790\uC704\uC911\uC778 \uB0A8\uC790\uB4E4', '\uC790\uC704\uC911\uC778 \uB0A8\uC790', '\uC790\uC704 \uD589\uC704', '\uC790\uC704\uD558\uB294 \uB0A8\uC790', 'male masturbation'], tags: ['multiple boys', 'background men', 'male masturbation', 'masturbation'] },
  { triggers: ['\uC2DC\uCCAD\uC790\uC5D0\uAC8C', '\uC2DC\uCCAD\uC790 \uC5EC\uB7EC\uBD84', '\uBC29\uC1A1 \uC9C4\uD589', '\uB9AC\uD3EC\uD305', '\uB9AC\uD3EC\uD130', '\uCE90\uC2A4\uD130'], tags: ['looking at viewer'] },
  { triggers: ['\uB9C8\uC774\uD06C', 'microphone'], tags: ['microphone'] },
  { triggers: ['\uCE74\uC6B4\uD130', 'counter'], tags: ['counter'] },
  { triggers: ['\uACC4\uC0B0\uB300', '\uACC4\uC0B0\uAE30', 'cash register'], tags: ['counter', 'cash register'] },
  { triggers: ['\uB3C8 \uD6D4\uCE58', '\uB3C8\uD6D4\uCE58', '\uD604\uAE08 \uD6D4\uCE58', 'stealing money'], tags: ['stealing', 'money', 'holding money'] },
  { triggers: ['\uC190\uACFC \uB3C8', '\uC190 + \uB3C8', '\uC190\uB9CC \uB098\uC624', 'hand focus'], tags: ['hands', 'hand focus', 'money'] },
  { triggers: ['\uD604\uAE08', '\uC9C0\uD3D0', 'money'], tags: ['money'] },
  { triggers: ['\uD06C\uB85C\uD50C', '\uC640\uD50C', 'croffle', 'waffle'], tags: ['waffle'] },
  { triggers: ['\uCEE4\uD53C', 'coffee'], tags: ['coffee'] },
  { triggers: ['\uC220 \uD14C\uC774\uBE14', '\uC220\uD14C\uC774\uBE14'], tags: ['table'] },
  { triggers: ['\uC220\uC794', '\uC220 \uC794', '\uC794\uC744 \uC950', '\uC794\uC744 \uB4E4'], tags: ['holding glass', 'drinking'] },
  { triggers: ['\uC220 \uB9C8\uC2DC', '\uAC74\uBC30', '\uB9C8\uC2DC\uB294'], tags: ['drinking'] },
  { triggers: ['\uCDE8\uD55C', '\uCDE8\uD574', '\uCDE8\uD55C\uD45C\uC815', '\uD5E4\uB871\uD5E4\uB871', '\uBE44\uD2C0\uBE44\uD2C0'], tags: ['drunk', 'blush'] },
  { triggers: ['\uCE68\uB300'], tags: ['bedroom', 'bed'] },
  { triggers: ['\uCD2C\uC601\uC6A9 \uBC30\uB4DC', '\uCD2C\uC601\uC6A9\uBC30\uB4DC', '\uBA54\uD2B8\uB9AC\uC2A4', 'mattress'], tags: ['bed', 'mattress'] },
  { triggers: ['sofa', 'couch', '\uC18C\uD30C'], tags: ['couch'] },
  { triggers: ['\uD654\uC7A5\uC2E4'], tags: ['bathroom'] },
  { triggers: ['\uC695\uC870'], tags: ['bathroom', 'bathtub'] },
  { triggers: ['\uBB38 \uC5F4', '\uBB38\uC5F4', '\uC5F4\uBA74', 'open door'], tags: ['open door'] },
  { triggers: ['\uD604\uAD00', '\uBB38 \uBC16', '\uBB38\uBC16', '\uBB38 \uC55E', '\uC785\uAD6C'], tags: ['entrance', 'doorway', 'open door'] },
  { triggers: ['\uBC14\uAE65\uD48D\uACBD', '\uBC14\uAE65 \uD48D\uACBD', '\uBC16 \uD48D\uACBD'], tags: ['outdoors'] },
  { triggers: ['\uBC29\uC11D'], tags: ['cushion'] },
  { triggers: ['\uC11C\uB958\uAC00\uBC29'], tags: ['briefcase'] },
  { triggers: ['\uC885\uC774\uBB49\uCE58', '\uC885\uC774 \uB4E4', '\uC11C\uB958 \uB4E4'], tags: ['paper', 'document', 'holding paper'] },
  { triggers: ['\uC885\uC774 \uBC14\uB77C', '\uC11C\uB958 \uBC14\uB77C'], tags: ['paper'] },
  { triggers: ['\uC0C1\uC790', '\uC0C1\uC790\uB4E4', '\uBC15\uC2A4', 'box'], tags: ['box', 'cardboard box'] },
  { triggers: ['\uC0AC\uBB34\uC2E4 \uC758\uC790', '\uC758\uC790\uC5D0 \uC549', '\uC790\uB9AC\uC5D0 \uC549'], tags: ['sitting', 'office chair'] },
  { triggers: ['\uC190\uB2D8 \uBCF4\uB294', '\uC190\uB2D8\uC744 \uBCF4\uB294', '\uACC4\uC0B0\uB300\uC5D0\uC11C \uADFC\uBB34', '\uCE74\uC6B4\uD130\uC5D0\uC11C \uADFC\uBB34'], tags: ['cashier', 'serving customer'] },
  { triggers: ['\uB204\uC6B4', '\uB204\uC6CC', '\uB204\uC6B4\uCC44', '\uB204\uD78C\uCC44', '\uB204\uD78C \uCC44', '\uB204\uD78C\uCC44\uB85C', '\uBC00\uC5B4 \uB204\uD78C', '\uBC00\uC5B4\uB204\uD78C'], tags: ['lying'] },
  { triggers: ['\uC8FC\uC800\uC549', '\uC549\uC544', '\uC790\uB9AC\uC5D0 \uC549'], tags: ['sitting'] },
  { triggers: ['\uCABC\uAD6C\uB824 \uC549', '\uCABC\uADF8\uB824 \uC549', '\uCABC\uAD6C\uB9AC\uACE0', '\uCABC\uADF8\uB9AC\uACE0', '쭈그려 앉', '쭈그러앉', '쭈구려 앉'], tags: ['squatting'] },
  { triggers: ['\uC544\uBE60\uB2E4\uB9AC', '\uC591\uBC18\uB2E4\uB9AC', 'crossed legs'], tags: ['sitting', 'crossed legs'] },
  { triggers: ['\uB2E4\uB9AC\uB97C \uC811', '\uB2E4\uB9AC \uC811', '\uC811\uC740\uCC44', '\uC811\uC740 \uCC44', 'folded legs'], tags: ['folded legs'] },
  { triggers: ['\uC778\uC5B4\uACF5\uC8FC \uC790\uC138', '\uC778\uC5B4\uACF5\uC8FC\uC790\uC138'], tags: ['sitting', 'yokozuwari'] },
  { triggers: ['\uBB34\uB98E', '\uAFC7\uC740'], tags: ['kneeling'] },
  { triggers: ['\uD074\uB85C\uC988\uC5C5'], tags: [] },
  { triggers: ['\uC804\uACBD \uBAA8\uC2B5', '\uC804\uACBD', '\uC678\uBD80\uBAA8\uC2B5', '\uC678\uBD80 \uBAA8\uC2B5'], tags: ['wide shot'] },
  { triggers: ['\uBAB8 \uB2E4 \uBCF4\uC774\uAC8C', '\uBAB8\uC774 \uB2E4 \uBCF4\uC774\uAC8C', '\uC804\uC2E0', 'full body'], tags: ['full body'] },
  { triggers: ['\uC0C1\uCCB4'], tags: ['upper body'] },
  { triggers: ['\uAC00\uC2B4\uC704\uB85C\uB9CC', '\uAC00\uC2B4 \uC704\uB85C\uB9CC', '\uAC00\uC2B4\uBD80\uD130 \uC704\uB85C'], tags: ['bust shot', 'upper body'] },
  { triggers: ['바스트샷', '바스트 샷', '버스트샷', 'bust shot'], tags: ['bust shot', 'upper body'] },
  { triggers: ['upperbody only', 'upper body only', '\uC0C1\uCCB4\uB9CC'], tags: ['upper body only', 'upper body', 'cropped torso'] },
  { triggers: ['underbody only', '\uD558\uCCB4 \uC544\uB798\uC5D0\uC11C\uB9CC', '\uC544\uB798\uCABD \uBAB8\uB9CC'], tags: ['underbody only', 'lower body'] },
  { triggers: ['\uD131 \uBC11\uC5D0\uC11C\uBD80\uD130', '\uD131\uBC11\uC5D0\uC11C', '\uD5C8\uBC85\uC9C0\uAE4C\uC9C0'], tags: ['upper body', 'cropped face', 'thighs'] },
  { triggers: ['\uC5BC\uAD74 \uBCF4\uC774\uC9C0 \uC54A\uAC8C', '\uC5BC\uAD74\uBCF4\uC774\uC9C0 \uC54A\uAC8C', '\uC5BC\uAD74 \uC548\uB098\uC640', '\uC5BC\uAD74 \uB2E4 \uC548\uB098\uC640', '\uC5BC\uAD74\uC740 \uC548\uB098\uC640', '얼굴 안 나오게', '얼굴이 안 나오게', '얼굴 안 나와도'], tags: ['face out of frame', 'cropped face'] },
  { triggers: ['face only', 'face-only', '\uC5BC\uAD74\uB9CC'], tags: ['face only', 'cropped face'] },
  { triggers: ['face focus'], tags: ['face only', 'cropped face'] },
  { triggers: ['faceless', '\uC5BC\uAD74 \uC5C6\uC774', '\uC5BC\uAD74 \uC548 \uBCF4\uC774'], tags: ['faceless', 'face out of frame', 'cropped face'] },
  { triggers: ['\uB2F9\uD669', '\uB180\uB78C', '\uB180\uB780', '\uB180\uB780\uB2E4', '\uC7A0 \uAE6C'], tags: ['surprised'] },
  { triggers: ['눈 똥그랗게', '눈을 똥그랗게', '눈이 똥그란', 'wide-eyed'], tags: ['wide-eyed', 'surprised'] },
  { triggers: ['\uD328\uB2C9', '\uD328\uB2C9\uC628', '\uAC81\uC5D0 \uC9C8\uB9B0'], tags: ['surprised', 'scared'] },
  { triggers: ['\uBB34\uD45C\uC815', '\uB364\uB364'], tags: ['expressionless'] },
  { triggers: ['\uBD80\uB044\uB7EC\uC6B4', '\uBD80\uB044\uB7EC\uC6B4\uB4EF', '\uBC1C\uADF8\uB808', '\uBCFC\uBC1C\uADF8\uB808'], tags: ['embarrassed', 'blush'] },
  { triggers: ['flush', 'flushed', '\uD654\uB048', '\uC0C1\uAE30\uB41C'], tags: ['flushed face', 'blush'] },
  { triggers: ['\uBC14\uBCF4\uAC19\uC774 \uC6C3', '\uBC14\uBCF4\uAC19\uC740 \uC6C3', '\uBC14\uBCF4\uAC19\uC774 \uC6C3\uB294', 'silly smile'], tags: ['silly smile', 'smile'] },
  { triggers: ['\uC5B4\uC0C9\uD558\uAC8C \uC6C3', '\uC5B4\uC0C9\uD55C \uC6C3', 'awkward smile'], tags: ['awkward smile', 'smile'] },
  { triggers: ['\uAC00\uC18C\uB86D', '\uBE44\uC6C3', '\uBE44\uC6C3\uB294'], tags: ['smirk'] },
  { triggers: ['\uC637 \uD6CC\uB801', '\uBC97\uACA8', '\uB0B4\uB824\uC694'], tags: ['undressing'] },
  { triggers: ['\uC637 \uC704\uB85C \uC62C\uB9B0', '\uC637\uC744 \uC704\uB85C \uC62C\uB9B0', '\uC637\uC774 \uC704\uB85C \uC62C\uB77C', '\uC0C1\uC758\uB97C \uC62C\uB9B0', 'shirt lift'], tags: ['shirt lift', 'partially undressed', 'underboob'] },
  { triggers: ['\uC0C1\uC758\uC640 \uC18D\uC637\uC744 \uBC97', '\uBE0C\uB77C\uAE4C\uC9C0 \uBC97', '\uBE0C\uB77C \uBC97', 'bra off', 'removing bra'], tags: ['undressing', 'topless', 'bra'] },
  { triggers: ['\uBC14\uC9C0\uB97C \uBC97\uAE30', '\uBC14\uC9C0\uB97C \uBC97\uAE30\uACE0', '\uBC14\uC9C0 \uBC97\uAE30', '\uBC14\uC9C0\uB97C \uB0B4\uB824', '\uBC14\uC9C0\uB97C \uB0B4\uB9AC', '\uC5F4\uB9B0 \uBC84\uD074'], tags: ['undressing', 'open fly'] },
  { triggers: ['\uC0C1\uCCB4\uB9CC \uD0C8\uC758', '\uC0C1\uCCB4 \uD0C8\uC758'], tags: ['topless', 'partially undressed'] },
  { triggers: ['\uCE58\uB9C8 \uAC77', '\uCE58\uB9C8\uB97C \uAC77', '\uCE58\uB9C8 \uC62C\uB9AC'], tags: ['skirt lift'] },
  { triggers: ['\uD32C\uD2F0 \uC816\uD78C', '\uD32C\uD2F0\uB97C \uC816\uD78C', '\uD32C\uD2F0 \uC606\uC73C\uB85C'], tags: ['panty pull', 'panties aside'] },
  { triggers: ['\uD32C\uD2F0\uB97C \uBC97', '\uD32C\uD2F0 \uBC97', '\uD32C\uD2F0\uAE4C\uC9C0 \uBC97', '\uBC14\uC9C0\uC640 \uD32C\uD2F0\uB97C \uBC97'], tags: ['undressing', 'bottomless', 'panty pull'] },
  { triggers: ['\uD558\uCCB4\uB9CC \uBC97', '\uD558\uCCB4\uB97C \uBC97'], tags: ['bottomless', 'partially undressed'] },
  { triggers: ['\uBAB8\uC744 \uAC00\uB9AC', '\uC785 \uD2C0\uC5B4\uB9C9'], tags: ['covering self'] },
  { triggers: ['\uB0A8\uC790 \uC190\uB9CC', 'pov hand only', 'pov hand', 'pov hands'], tags: ['pov hands'] },
  { triggers: ['뚱뚱한 사장', '뚱땡이 사장', '뚱뚱한 남자', '뚱땡이 못생긴 사장', 'overweight man'], tags: ['overweight man'] },
  { triggers: ['\uBABB\uC0DD\uAE34 \uC0AC\uC7A5', '\uBABB\uC0DD\uAE34 \uB0A8\uC790', 'ugly man'], tags: ['ugly man'] },
  { triggers: ['\uC640\uB77D \uB04C\uC5B4\uC548', '\uC548\uACA8 \uC788\uB294', '\uC548\uACE0 \uC788\uB294', '\uB04C\uC5B4\uC548\uACE0'], tags: ['hug'] },
  { triggers: ['\uC548\uACA8\uC788', '\uC548\uACA8 \uC788', '\uC644\uC804\uD788 \uC548\uACA8', '\uBC00\uCC29'], tags: ['hug'] },
  { triggers: ['\uAC00\uC2B4 \uBC00\uCC29', '\uAC00\uC2B4\uBC00\uCC29'], tags: ['breast press', 'hug'] },
  { triggers: ['\uB098\uB780\uD788 \uB204\uC6CC', '\uB098\uB780\uD788 \uB204\uC6B4'], tags: ['lying'] },
  { triggers: ['\uC606\uC73C\uB85C \uB118\uC5B4', '\uC606\uC73C\uB85C \uB118\uC5B4\uC9C4', '\uC606\uC73C\uB85C \uB204\uC6B4'], tags: ['lying', 'from side'] },
  { triggers: ['\uD314\uBCA0\uAC8C', '\uD314\uBCA0\uAC1C'], tags: ['lying', 'arm pillow'] },
  { triggers: ['\uC5B4\uAE68\uC5D0 \uC190', '\uC5B4\uAE68\uC5D0 \uC190 \uB450\uB974', '\uC5B4\uAE68\uC5D0 \uC190\uB450\uB974'], tags: ['arms around shoulders'] },
  { triggers: ['\uBAA9 \uC8FC\uBCC0\uBD80\uB97C \uB450\uB974', '\uBAA9\uC5D0 \uD314', '\uBAA9 \uC8FC\uBCC0'], tags: ['arms around neck'] },
  { triggers: ['\uBA38\uB9AC \uB9DE\uB300', '\uBA38\uB9AC\uB9DE\uB300', '\uAD50\uAC10\uD3EC\uC988'], tags: ['forehead-to-forehead', 'hug'] },
  { triggers: ['\uD314\uC9F1\uB07C', '\uD314\uC9F1 \uB07C', '\uD314\uC9F1\uC744 \uB07C', 'arms crossed'], tags: ['arms crossed'] },
  { triggers: ['\uC5C9\uB369\uC774 \uC704\uC5D0 \uC190', '\uC5C9\uB369\uC774 \uC7A1', '\uC5C9\uB369\uC774\uB97C \uC7A1', 'hands on ass'], tags: ['hand on another\'s ass', 'hands on ass'] },
  { triggers: ['\uC5C9\uB369\uC774\uB97C \uB04C\uC5B4\uB2F9', '\uC5C9\uB369\uC774\uB97C \uAF48\uC545', '\uB354 \uB04C\uC5B4\uB2F9\uACA8 \uC548'], tags: ['hand on another\'s ass', 'hands on ass'] },
  { triggers: ['\uC5C9\uB369\uC774 \uC4F0\uB2E4\uB4EC', '\uC5C9\uB369\uC774\uB97C \uC4F0\uB2E4\uB4EC', '\uC5C9\uB369\uC774 \uC4F0\uB2E4\uB4EC\uAE30'], tags: ['ass', 'ass focus', 'hand on another\'s ass'] },
  { triggers: ['\uC5C9\uB369\uC774\uB97C \uB9DE', '\uC5C9\uB369\uC774 \uB9DE', '\uC5C9\uB369\uC774\uB97C \uB54C\uB9AC', '\uC5C9\uB369\uC774 \uB54C\uB9AC', '스팽킹', 'spanking'], tags: ['spanking', 'ass', 'ass focus'] },
  { triggers: ['\uD5C8\uBC85\uC9C0\uC5D0 \uB450', '\uD5C8\uBC85\uC9C0\uC5D0 \uC190', '\uB2E4\uB9AC \uC704\uC5D0 \uC190'], tags: ['hand on thigh', 'thighs'] },
  { triggers: ['grab thighs', 'grabbing thighs', '\uD5C8\uBC85\uC9C0 \uC7A1', '\uD5C8\uBC85\uC9C0\uB97C \uC7A1'], tags: ['grabbing thighs', 'hand on thigh', 'thighs'] },
  { triggers: ['\uBAB8\uC744 \uB354\uB4EC', '\uBAB8 \uB354\uB4EC', '\uB354\uB4EC\uB354\uB4EC'], tags: ['groping'] },
  { triggers: ['\uAC00\uC2B4 \uC704\uC8FC\uB85C \uD130\uCE58', '\uAC00\uC2B4 \uD130\uCE58'], tags: ['breast grab', 'hand on breast'] },
  { triggers: ['\uD558\uCCB4 \uD074\uB85C\uC988\uC5C5', '\uD558\uCCB4\uB9CC', '\uD558\uCCB4 \uC704\uC8FC'], tags: ['lower body'] },
  { triggers: ['ass focus'], tags: ['ass focus'] },
  { triggers: ['\uB370\uC2A4\uD06C \uC544\uB798', '\uCC45\uC0C1 \uC544\uB798', '\uCE74\uC6B4\uD130 \uC544\uB798', 'under desk'], tags: ['under desk'] },
  { triggers: ['\uD32C\uD2F0 \uC704', '\uD32C\uD2F0\uC704', '\uD32C\uD2F0 \uC704\uB85C \uD551\uAC70\uB9C1', 'fingering through panties'], tags: ['fingering through panties'] },
  { triggers: ['\uD32C\uD2F0 \uC816', '\uD32C\uD2F0\uC816', '\uC816\uC740 \uD32C\uD2F0', 'wet panties'], tags: ['wet panties'] },
  { triggers: ['\uAC00\uC2B4\uB9CC', '\uAC00\uC2B4\uB9CC \uB098\uC624', '\uC5BC\uAD74 \uB098\uC62C \uD544\uC694\uC5C6'], tags: ['breasts', 'cropped torso', 'face out of frame'] },
  { triggers: ['\uC5BC\uAD74 \uD3EC\uCEE4\uC2A4', '\uD398\uC774\uC2A4 \uD3EC\uCEE4\uC2A4'], tags: ['face focus'] },
  { triggers: ['female reaction focus', 'close reaction shot', '\uBC18\uC751 \uD45C\uC815', '\uC5EC\uC790 \uBC18\uC751', '\uC5EC\uC131 \uBC18\uC751', '\uD45C\uC815 \uBC18\uC751'], tags: ['face focus', 'pleasure face'] },
  { triggers: ['\uD131\uAE4C\uC9C0\uB9CC', '\uB208\uC740 \uC548\uBCF4\uC5EC', '\uB208\uC774 \uC548\uBCF4\uC5EC'], tags: ['cropped face', 'eyes out of frame'] },
  { triggers: ['\uAC00\uC2B4\uD31D', '\uB0A8\uC790 \uAC00\uC2B4\uD31D', '\uC5B4\uAE68 \uC815\uB3C4\uB9CC', '\uC0AC\uC7A5\uB2D8 \uBAB8 \uD654\uBA74\uC5D0 \uAC78\uCE58', '\uB0A8\uC790 \uBAB8 \uD654\uBA74\uC5D0 \uAC78\uCE58'], tags: ['male torso', 'cropped torso'] },
  { triggers: ['\uB0A8\uC790 \uB4B7\uD1B5\uC218', '\uB4B7\uD1B5\uC218\uB9CC'], tags: ['from behind', 'cropped face'] },
  { triggers: ['\uC0AC\uC774\uB4DC \uD0A4\uC2A4', 'side kiss'], tags: ['kissing', 'from side'] },
  { triggers: ['\uADC0\uC5D0 \uB300\uACE0 \uB9D0', '\uADC0\uC5D0 \uB300\uACE0 \uB9D0\uD558', '\uADC0\uC5D0 \uB300\uACE0 \uC18D\uC0AD', '\uADC0\uC18D\uB9D0', '\uADC0 \uADFC\uCC98\uC5D0\uC11C \uB300\uD654', '\uADC0 \uADFC\uCC98\uC5D0\uC11C \uB9D0'], tags: ['whispering', 'whisper to ear'] },
  { triggers: ['\uADC0 \uAC00\uAE4C\uC774', '\uADC0\uAC00\uAE4C\uC774', '\uD0B9\uD0B9', '\uB0C4\uC0C8 \uB9E1', '\uB0C4\uC0C8\uB9E1', '\uB0C4\uC0C8 \uB9E1\uAE30', '\uB0C4\uC0C8\uB97C \uB9E1', 'sniff', 'smell'], tags: ['ear', 'smelling'] },
  { triggers: ['\uADC0\uC5D0 \uB300\uACE0 \uB9AC\uD0B9', '\uADC0 \uB9AC\uD0B9', '\uC774\uC5B4\uB9AC\uD0B9', 'ear licking'], tags: ['ear licking', 'licking', 'ear'] },
  { triggers: ['\uACA8\uB4DC\uB791\uC774', '\uACA8\uB4DC\uB791\uC774\uB97C \uBCF4', '\uACA8\uB4DC\uB791\uC774 \uB178\uCD9C', 'armpit'], tags: ['armpits'] },
  { triggers: ['\uAE30\uB300\uC11C', '\uAE30\uB300\uACE0'], tags: ['leaning on person'] },
  { triggers: ['\uBB38\uC5D0 \uAE30\uB300', '\uBB38\uC5D0\uAE30\uB300', '\uBB38\uC5D0 \uAE30\uB300\uC11C', 'leaning on door'], tags: ['leaning on door', 'doorway'] },
  { triggers: ['\uAC77\uB294', '\uC6C0\uC9C1\uC774\uB294', '\uC6C0\uC9C1\uC784'], tags: ['walking'] },
  { triggers: ['\uD5C8\uB9AC \uC219', '\uD5C8\uB9AC\uB97C \uC219', '\uD5C8\uB9AC\uB97C \uC219\uC774', '\uC5CE\uB4DC\uB9AC', '\uC5CE\uB4DC\uB9B0', '\uC5CE\uB4DC\uB9B0 \uC0C1\uD0DC', 'bent over'], tags: ['bent over', 'leaning forward'] },
  { triggers: ['\uC55E\uC73C\uB85C \uBAB8', '\uC55E\uC73C\uB85C \uAE30\uC6B8', '\uBAB8\uC744 \uB0A8\uC131 \uCABD\uC73C\uB85C \uAE30\uC6B8', '\uBAB8\uC744 \uB0A8\uC790 \uCABD\uC73C\uB85C \uAE30\uC6B8'], tags: ['leaning forward'] },
  { triggers: ['\uC5CE\uB4DC\uB824 \uC788\uB294', '\uC5CE\uB4DC\uB824\uC788\uB294', '\uC5CE\uB4DC\uB824 \uB204\uC6B4'], tags: ['face down', 'lying'] },
  { triggers: ['\uC0C1\uCCB4 \uC77C\uC73C\uD0A8', '\uC0C1\uCCB4\uB97C \uC77C\uC73C\uD0A8', '\uC0C1\uCCB4 \uC138\uC6B4', '\uC0C1\uCCB4\uB97C \uC138\uC6B4', '\uC0C1\uCCB4 \uBC18\uB9CC \uC77C\uC73C\uD0A8', '\uC0C1\uCCB4\uB97C \uBC18\uB9CC \uC77C\uC73C\uD0A8'], tags: ['sitting', 'upper body'] },
  { triggers: ['pussy focus', '\uBCF4\uC9C0'], tags: ['pussy', 'pussy focus'] },
  { triggers: ['\uC131\uAE30 \uD074\uB85C\uC988\uC5C5'], tags: ['pussy', 'pussy focus'] },
  { triggers: ['\uC190\uAC00\uB77D', '\uD551\uAC70\uB9C1', 'fingering'], tags: ['fingering'] },
  { triggers: ['\uC790\uAE30 \uD478\uC2DC\uB97C \uBC8C', '\uC790\uAE30 \uBCF4\uC9C0\uB97C \uBC8C', '\uD478\uC2DC\uB97C \uBC8C', '\uBCF4\uC9C0\uB97C \uBC8C', 'spread pussy'], tags: ['spread pussy'] },
  { triggers: ['\uB300\uB538', '\uB300\uB538 \uC2DC\uC791', '\uB300\uB538 \uC815\uC9C0', '\uB300\uB538 \uB2E4\uC2DC \uC2DC\uC791', '\uB300\uB538\uD558', '\uC190\uC73C\uB85C \uD398\uB2C8\uC2A4', '\uD398\uB2C8\uC2A4 \uB9CC\uC9C0', 'handjob', 'hand job'], tags: ['hand job', 'hands on penis'] },
  { triggers: ['\uC591\uC190\uC5D0 \uB300\uB538', '\uC591\uC190 \uB300\uB538', '\uB450 \uC190\uC73C\uB85C \uAC01\uAC01 \uB2E4\uB978 \uB0A8\uC790 \uB300\uB538', '\uB450\uC190\uC73C\uB85C \uAC01\uAC01 \uB2E4\uB978 \uB0A8\uC790 \uB300\uB538', '\uB300\uB538\uB9CC \uBCF4\uC774\uB294', 'double handjob'], tags: ['double handjob', 'hand job', 'hands on penis'] },
  { triggers: ['\uC591\uCABD \uB0A8\uC790 \uACE0\uCD94\uC7A1', '\uC591\uCABD \uB0A8\uC790 \uACE0\uCD94 \uC7A1', '\uC591\uCABD \uB0A8\uC790 \uC790\uC9C0\uC7A1', '\uC591\uCABD \uB0A8\uC790 \uC790\uC9C0 \uC7A1', '\uC591\uCABD \uACE0\uCD94\uC7A1', '\uACE0\uCD94\uC7A1'], tags: ['double handjob', 'hand job', 'hands on penis'] },
  { triggers: ['\uC790\uC9C0\uBD80\uBD84\uC744 \uB36E\uC369', '\uC790\uC9C0\uBD80\uBD84\uC744 \uC6C0\uCF1C', '\uC790\uC9C0\uB97C \uB36E\uC369', '\uC790\uC9C0\uB97C \uC6C0\uCF1C', '\uC131\uAE30\uB97C \uB36E\uC369', '\uC131\uAE30\uB97C \uC6C0\uCF1C'], tags: ['hand on penis', 'hands on penis', 'groping'] },
  { triggers: ['\uB300\uB538 \uBC1B\uB294 \uB0A8\uC790 \uBDF0', '\uB0A8\uC790 \uBDF0'], tags: ['pov'] },
  { triggers: ['\uD398\uB2C8\uC2A4', 'penis'], tags: ['penis'] },
  { triggers: ['\uB4A4\uC5D0 \uB0A8\uC790 \uD398\uB2C8\uC2A4', '\uC591 \uC606, \uB4A4\uC5D0 \uB0A8\uC790 \uD398\uB2C8\uC2A4', '\uC591\uC606, \uB4A4\uC5D0 \uB0A8\uC790 \uD398\uB2C8\uC2A4', '\uC5EC\uB7EC \uD398\uB2C8\uC2A4', '\uC5EC\uB7EC \uC790\uC9C0', 'multiple penises'], tags: ['multiple penises', 'penis', 'background men'] },
  { triggers: ['\uC5BC\uAD74\uC5D0 \uC790\uC9C0 \uBE44\uBE44', '\uC5BC\uAD74\uC5D0 \uD398\uB2C8\uC2A4 \uBE44\uBE44', '\uC5BC\uAD74\uC5D0 \uC131\uAE30 \uBE44\uBE44', 'penis on face'], tags: ['penis on face', 'penis'] },
  { triggers: ['disembodided penis', 'disembodied penis', 'penis only', '\uC808\uB2E8 \uC131\uAE30', '\uC808\uB2E8\uB41C \uC131\uAE30', '\uD398\uB2C8\uC2A4\uB9CC', '\uC131\uAE30\uB9CC', '\uC790\uC9C0\uB9CC'], tags: ['disembodied penis', 'penis'] },
  { triggers: ['\uD398\uB2C8\uC2A4 \uD3EC\uCEE4\uC2A4', '\uD398\uB2C8\uC2A4\uD3EC\uCEE4\uC2A4'], tags: ['penis', 'penis focus'] },
  { triggers: ['\uBC1C\uAE30', '\uBC1C\uAE30\uB41C', '\uBC14\uC9C0 \uBC11\uC73C\uB85C \uBC1C\uAE30', '\uBC14\uC9C0 \uBC11\uC758 \uBC1C\uAE30'], tags: ['erection', 'penis'] },
  { triggers: ['\uBC14\uC9C0 \uBC11\uC73C\uB85C \uBC1C\uAE30', '\uBC14\uC9C0 \uBC11\uC758 \uBC1C\uAE30', '\uBC14\uC9C0 \uC548\uC5D0\uC11C \uBC1C\uAE30'], tags: ['clothed erection', 'erection'] },
  { triggers: ['\uB300\uBB3C\uC790\uC9C0', '\uB300\uBB3C \uC790\uC9C0', '\uD070 \uC790\uC9C0', '\uD070\uC790\uC9C0', '\uC6B0\uB78C\uD558\uAC8C \uBC1C\uAE30'], tags: ['large penis', 'penis', 'erection'] },
  { triggers: ['\uADC0\uB450 \uC790\uADF9', '\uADC0\uB450\uB97C \uC790\uADF9'], tags: ['hand job', 'hands on penis', 'glans'] },
  { triggers: ['m legs', 'm-legs', 'm\uC790\uB85C \uC549', 'm\uC790 \uC790\uC138', 'm\uC790'], tags: ['m legs'] },
  { triggers: ['\uB0A8\uC790\uBD88\uC54C', '\uB0A8\uC790 \uBD88\uC54C', '\uBD88\uC54C', 'testicles'], tags: ['testicles'] },
  { triggers: ['\uACB0\uD63C\uBC18\uC9C0', '\uBC18\uC9C0'], tags: ['ring', 'wedding ring'] },
  { triggers: ['\uB098\uCCB4', '\uB204\uB4DC'], tags: ['nude'] },
  { triggers: ['\uD398\uB2C8\uC2A4\uB9CC \uBCF4\uC774', '\uD398\uB2C8\uC2A4\uB9CC', '\uC131\uAE30\uB9CC \uBCF4\uC774', '\uC131\uAE30\uB9CC', '\uC790\uC9C0\uB9CC \uBCF4\uC774', '\uC790\uC9C0\uB9CC', 'penis only'], tags: ['disembodied penis', 'penis', 'cropped torso'] },
  { triggers: ['\uD30C\uC774\uC988\uB9AC', 'paizuri'], tags: ['paizuri', 'penis', 'breasts', 'hands on breasts', 'breast press'] },
  { triggers: ['\uD5C8\uBC85\uC9C0', '\uD5C8\uBC85\uC9C0\uAE4C\uC9C0'], tags: ['thighs'] },
  { triggers: ['\uD5C8\uBC85\uC9C0\uC0F7', '\uD5C8\uBC85\uC9C0 \uC0F7'], tags: ['thighs', 'cowboy shot'] },
  { triggers: ['\uC11C \uC788\uB294', '\uC11C\uC788\uB294', '\uC11C \uC788\uB294 \uB290\uB08C'], tags: ['standing'] },
  { triggers: ['\uC77C\uC5B4\uB098', '\uC790\uB9AC\uC5D0\uC11C \uC77C\uC5B4'], tags: ['standing'] },
  { triggers: ['\uC778\uC0AC\uD558', '\uC778\uC0AC\uD558\uBA70', '\uC778\uC0AC\uD558\uACE0'], tags: ['bowing'] },
  { triggers: ['\uBD84\uD560\uCEF7', '\uBD84\uD560 \uCEF7', '\uD654\uBA74\uBD84\uD560'], tags: ['multiple views'] },
  { triggers: ['\uC704\uC5D0 \uD0C0\uC788', '\uC704\uC5D0 \uC62C\uB77C\uD0C0', '\uC704\uB85C \uC62C\uB77C\uD0C4', '\uC62C\uB77C\uD0C4 \uC0C1\uD0DC', '\uC62C\uB77C\uD0C4 \uC5EC\uC790', '\uC62C\uB77C\uD0C0 \uC788'], tags: ['straddling', 'girl on top'] },
  { triggers: ['\uCABC\uADF8\uB824\uC549\uB4EF\uC774 \uC62C\uB77C\uD0C0', '\uCABC\uADF8\uB824 \uC549\uC73C\uBA70 \uC62C\uB77C\uD0C0', '\uCABC\uAD6C\uB824 \uC549\uC73C\uBA70 \uC62C\uB77C\uD0C0'], tags: ['squatting', 'straddling', 'girl on top'] },
  { triggers: ['\uAE30\uC2B9\uC704', 'cowgril position', 'cowgirl position'], tags: ['cowgirl position', 'girl on top'] },
  { triggers: ['\uB300\uBA74 \uC88C\uC704', '\uB300\uBA74\uC88C\uC704'], tags: ['sitting', 'sitting on lap', 'upright straddle', 'facing another'] },
  { triggers: ['\uC88C\uC704'], tags: ['sitting', 'upright straddle'] },
  { triggers: ['spread legs', '\uB2E4\uB9AC \uBC8C\uB9B0', '\uB2E4\uB9AC\uBC8C\uB9B0', '\uB2E4\uB9AC\uB97C \uBC8C\uB9B0', '\uB2E4\uB9AC \uBC8C\uB9AC', '\uB2E4\uB9AC\uBC8C\uB9AC', '\uB2E4\uB9AC\uB97C \uBC8C\uB9AC'], tags: ['spread legs'] },
  { triggers: ['\uB2E4\uB9AC \uC0AC\uC774', '\uBC8C\uB9B0 \uB2E4\uB9AC \uC0AC\uC774'], tags: ['spread legs'] },
  { triggers: ['\uD55C\uC190\uAC00\uB77D\uC744 \uD53C', '\uC190\uAC00\uB77D \uD558\uB098', '\uC190\uAC00\uB77D\uC744 \uD558\uB098', 'index finger raised'], tags: ['index finger raised', 'pointing'] },
  { triggers: ['\uC785\uAC00\uC5D0 \uC190', '\uC785\uAC00\uC5D0 \uB300', '\uC785\uAC00\uC5D0 \uB450', 'finger to mouth'], tags: ['finger to mouth'] },
  { triggers: ['\uD074\uB9AC', '\uD074\uB9AC\uD1A0\uB9AC\uC2A4', 'clitoris'], tags: ['clitoris'] },
  { triggers: ['\uAC00\uC2B4 \uBE68', '\uAC00\uC2B4\uBE68', '\uAC00\uC2B4\uBE68\uB9AC\uAE30', '\uAC00\uC2B4 \uBE60', '\uC720\uB450 \uBE68'], tags: ['breast sucking'] },
  { triggers: ['\uAC00\uC2B4 \uC704\uC8FC', '\uAC00\uC2B4\uC744 \uBE60', '\uAC00\uC2B4 \uBE60\uB294', '\uBAB8 \uC774\uACF3\uC800\uACF3 \uBE60'], tags: ['breast sucking', 'licking'] },
  { triggers: ['\uAC00\uC2B4 \uC7A1', '\uAC00\uC2B4 \uC7A1\uAE30', '\uC2A4\uC2A4\uB85C \uC7A1'], tags: ['breast grab'] },
  { triggers: ['가슴 만지', '가슴을 만지', '가슴 만지는', 'breast touching'], tags: ['breast grab', 'groping'] },
  { triggers: ['\uAC00\uC2B4 \uAF49 \uC950', '\uAC00\uC2B4\uC744 \uAF49 \uC950', '\uAC00\uC2B4 \uAF49\uC950'], tags: ['breast grab', 'groping'] },
  { triggers: ['\uC190\uAC00\uB77D\uC73C\uB85C \uAF2D\uC9C0', '\uC190\uAC00\uB77D\uC73C\uB85C \uC720\uB450', '\uAF2D\uC9C0 \uACF5\uB7B5', '\uC720\uB450 \uACF5\uB7B5', 'nipple stimulation'], tags: ['nipple stimulation', 'hand on nipple'] },
  { triggers: ['\uC816\uAF2D\uC9C0 \uAF2C\uC9D1', '\uC720\uB450 \uAF2C\uC9D1', 'pinching nipple', 'nipple pinch'], tags: ['pinching nipple', 'hands on breasts'] },
  { triggers: ['nipple \uAD34\uB86D', '\uB2C8\uD50C \uAD34\uB86D', '\uC720\uB450 \uAD34\uB86D', '\uC816\uAF2D\uC9C0 \uB9CC\uC9C0', '\uC720\uB450 \uB9CC\uC9C0'], tags: ['nipple flick', 'hand on nipple'] },
  { triggers: ['\uD0A4\uC2A4', 'kiss'], tags: ['kissing'] },
  { triggers: ['\uAC15\uC81C\uB85C \uD0A4\uC2A4', '\uAC15\uC81C \uD0A4\uC2A4', '\uD131 \uC7A1\uACE0 \uAC15\uC81C\uB85C \uD0A4\uC2A4', 'forced kiss'], tags: ['forced kiss', 'kissing'] },
  { triggers: ['\uD131 \uC7A1', '\uD131\uC744 \uC7A1', '\uD131\uC744 \uBD99\uC7A1', 'holding chin'], tags: ['holding chin'] },
  { triggers: ['\uD0A4\uC2A4 \uC9C1\uC804', '\uD0A4\uC2A4\uC9C1\uC804'], tags: ['imminent kiss', 'kissing'] },
  { triggers: ['\uAC8C\uAC78\uC2A4\uB7FD', '\uB098\uB20C\uC11C'], tags: ['saliva'] },
  { triggers: ['saliva', '\uCE68 \uD750', '\uCE68\uC774 \uD750', '\uCE68\uBC29\uC6B8', '\uCE68 \uBB3B', '\uCE68\uC774 \uBB3B'], tags: ['saliva'] },
  { triggers: ['\uC785\uB9DB\uC744 \uB2E4', '\uC785\uB9DB\uB2E4', '\uC785\uB9DB \uB2E4', 'licking lips'], tags: ['licking lips', 'tongue'] },
  { triggers: ['\uD600\uB85C \uD398\uB2C8\uC2A4 \uD565', '\uD398\uB2C8\uC2A4 \uD565', '\uD398\uB2C8\uC2A4\uB97C \uD565'], tags: ['tongue', 'licking', 'licking penis', 'penis'] },
  { triggers: ['\uC5EC\uC131 \uB458', '\uC5EC\uC790 \uB458', '\uB450 \uC5EC\uC131', '\uB450 \uC5EC\uC790', '\uC5EC\uC131\uB07C\uB9AC', '\uC5EC\uC790\uB07C\uB9AC'], tags: ['multiple girls', 'yuri'] },
  { triggers: ['\uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565', '\uBCF4\uC9C0\uB97C \uD565', '\uBCF4\uC9C0 \uD565', '\uC5EC\uC131\uAE30\uB97C \uD565', '\uCEE4\uB2D0\uB9C1\uAD6C\uC2A4', 'cunnilingus'], tags: ['cunnilingus', 'pussy licking', 'licking', 'tongue'] },
  { triggers: ['\uC5EC\uC131 \uB458\uC774 69', '\uC5EC\uC790 \uB458\uC774 69', '\uB450 \uC5EC\uC131\uC740 \uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565', '\uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565\uC544\uC8FC\uB294'], tags: ['multiple girls', 'yuri', 'sixty-nine', 'cunnilingus', 'pussy licking'] },
  { triggers: ['\uC5BC\uAD74\uC5D0 \uC5EC\uC790\uAC00 \uBCF4\uC9C0\uB97C', '\uC5BC\uAD74\uC5D0 \uC5EC\uC790\uAC00 \uBCF4\uC9C0\uB97C \uBE44\uBE44', '\uC5BC\uAD74\uC5D0 \uC5EC\uC790\uAC00 \uBCF4\uC9C0\uB97C \uB9C9 \uBE44\uBE44', '\uC5EC\uC790 \uC5BC\uAD74 \uC704\uB85C', '\uC5EC\uC131\uC758 \uC5BC\uAD74 \uC704\uB85C', '\uC5BC\uAD74 \uC704\uB85C \uB2E4\uB978 \uC5EC\uC131', 'pussy on face', 'facesitting'], tags: ['facesitting', 'pussy on face', 'grinding', 'yuri'] },
  { triggers: ['69\uC790\uC138', '69\uC0C1\uD0DC', '69 \uC790\uC138', '69', 'sixty-nine'], tags: ['sixty-nine', "underbody to male's face", 'top-down bottom-up'] },
  { triggers: ['\uC0BD\uC785', '\uD53C\uC2A4\uD1A4', '\uBC15\uAE30', '\uBC15\uB294', '\uBC15\uB294\uB2E4', '\uBC15\uC544', '\uD37D\uD37D', 'pussy penetration'], tags: ['pussy penetration'] },
  { triggers: ['\uC0BD\uC785 \uD3EC\uCEE4\uC2A4', '\uC0BD\uC785\uD3EC\uCEE4\uC2A4', 'penetration focus'], tags: ['pussy penetration', 'penis focus', 'penetration focus'] },
  { triggers: ['\uC0BD\uC785 \uC804', '\uC0BD\uC785\uC804'], tags: ['imminent penetration'] },
  { triggers: ['\uC131\uAE30\uC5D0 \uBE44\uBE44', '\uBCF4\uC9C0\uC5D0 \uBE44\uBE44', '\uD398\uB2C8\uC2A4\uB97C \uC5EC\uC790 \uC131\uAE30\uC5D0 \uBE44\uBE44'], tags: ['penis on pussy', 'imminent penetration'] },
  { triggers: ['\uC560\uB110\uC139\uC2A4', '\uC560\uB110 \uC139\uC2A4', 'anal sex', 'anal'], tags: ['anal penetration', 'anal sex'] },
  { triggers: ['\uC560\uB110 \uD50C\uB7EC\uADF8', '\uC560\uB110\uD50C\uB7EC\uADF8', '\uC131\uC778\uC6A9\uD488', 'anal plug'], tags: ['anal plug'] },
  { triggers: ['spread anus', '\uD56D\uBB38 \uBC8C', '\uD56D\uBB38\uC744 \uBC8C', '\uC5C9\uB369\uC774 \uBC8C\uB9AC\uACE0 \uC0BD\uC785', '\uC5C9\uB369\uC774 \uBC8C\uB9AC\uACE0'], tags: ['spread anus', 'spread ass'] },
  { triggers: ['\uC2A4\uB9DB\uD0C0', '\uC2A4\uB9C8\uD0C0', '\uC131\uAE30\uB07C\uB9AC \uBE44\uBE44', '\uC131\uAE30\uB07C\uB9AC \uBB38\uC9C0\uB974'], tags: ['grinding', 'penis on pussy'] },
  { triggers: ['\uD5D8\uD551', 'humping'], tags: ['grinding', 'penis on pussy'] },
  { triggers: ['\uBA38\uB9AC \uD754\uB4E4', '\uBA38\uB9AC\uAC00 \uD754\uB4E4', '\uB4E4\uC369\uB4E4\uC369'], tags: ['head shaking'] },
  { triggers: ['\uD6C4\uBC30\uC704', '\uB4A4\uB85C \uBC15\uAE30', '\uB4A4\uC5D0\uC11C \uBC15', '\uB4A4\uC5D0\uC11C \uBC15\uACE0', '\uB4A4\uC5D0\uC11C \uBC15\uB294'], tags: ['doggystyle', 'from behind'] },
  { triggers: ['\uB4E4\uBC15', '\uB4E4\uC5B4\uC11C \uBC15', '\uB4E4\uC5B4\uC62C\uB824\uC11C \uBC15', 'standing sex'], tags: ['standing sex', 'held up'] },
  { triggers: ['\uBCBD\uC5D0 \uB4F1 \uBD99', '\uBCBD\uC5D0 \uB4F1\uC744 \uBD99', '\uBCBD\uC5D0 \uB20C\uB9B0', '\uBCBD\uC5D0 \uB20C\uB9B0 \uC0C1\uD0DC', 'against wall'], tags: ['against wall'] },
  { triggers: ['\uC815\uBA74\uC5D0\uC11C \uBCF8 \uD6C4\uBC30\uC704', '\uC815\uBA74\uC5D0\uC11C \uD6C4\uBC30\uC704'], tags: ['doggystyle', 'straight-on'] },
  { triggers: ['\uAD50\uBC30 \uD504\uB808\uC2A4', '\uAD50\uBC30\uD504\uB808\uC2A4', 'mating press', 'matingpress'], tags: ['mating press', 'missionary'] },
  { triggers: ['\uC815\uC0C1\uC704'], tags: ['missionary'] },
  { triggers: ['\uCE21\uC704', 'side sex'], tags: ['side sex', 'from side'] },
  { triggers: ['one leg raised', '\uD55C\uCABD \uB2E4\uB9AC \uB4E4', '\uB2E4\uB9AC \uD55C\uCABD \uB4E4'], tags: ['one leg raised'] },
  { triggers: ['\uD3A0\uB77C', '\uD3A0\uB77C\uCE58\uC624', '\uC790\uC9C0 \uBE68', '\uC790x \uBE68', '\uC790\uC9C0\uB97C \uBE68', '\uC790x\uB97C \uBE68', '\uC790\uC9C0\uB97C \uD565', '\uC790x\uB97C \uD565', '\uBE68\uC544\uBCF8 \uC790', '\uBE60\uB294 \uB9DB', '\uC785\uC73C\uB85C \uC790', 'fellatio'], tags: ['fellatio', 'penis'] },
  { triggers: ['\uD3A0\uB77C\uC18C\uB9AC', '\uBE60\uB978 \uD3A0\uB77C', '\uACA9\uD558\uAC8C \uD3A0\uB77C', '\uBBF8\uCE5C\uB4EF\uC774 \uBE60\uB978 \uD3A0\uB77C'], tags: ['fellatio', 'penis', 'pleasure face'] },
  { triggers: ['\uB525\uC4F0\uB86F', '\uB525 \uC4F0\uB86F', '\uBAA9\uAD6C\uBA4D', '\uBAA9\uAD6C\uBA4D\uC5D0 \uAE4A\uC774', '\uBAA9\uAD6C\uBA4D \uAE4A\uC219\uC774', '\uAE4A\uC219\uC774 \uC0BC\uD0A4', '\uAE4A\uAC8C \uBC1B\uC544', 'deepthroat'], tags: ['fellatio', 'deepthroat'] },
  { triggers: ['\uC6B0\uAD6C\uAD7D', '\uAFB8\uC6C1', '\uCEF5', '\uBAA9\uC5D0 \uAC78', '\uBABB \uACAC\uB514\uACE0', '\uBC49\uC5B4\uB0B4', '\uBC49\uC5B4', 'gagging'], tags: ['gagging', 'open mouth'] },
  { triggers: ['\uD1A0\uD0B9', '\uB9D0\uD558\uAE30', '\uB9D0\uD558\uB294'], tags: ['talking'] },
  { triggers: ['\uBA38\uB9AC \uC7A1', '\uBA38\uB9AC\uB97C \uC7A1', '\uBA38\uB9B4 \uC7A1', '\uBA38\uB9AC\uB97C \uBD99\uC7A1', '\uBA38\uB9AC\uB97C \uBD99\uC7A1\uACE0'], tags: ['head grab'] },
  { triggers: ['\uBA38\uB9AC\uCC44 \uC7A1', '\uBA38\uB9AC\uCC44\uB97C \uC7A1'], tags: ['hair grab', 'head grab'] },
  { triggers: ['\uC785\uC5D0 \uB123', '\uC785\uC5D0 \uB123\uC740', '\uC785\uC5D0 \uC790', '\uC785\uC5D0 \uC131\uAE30', '\uC785\uC5D0 \uC464\uC154\uB123'], tags: ['fellatio'] },
  { triggers: ['\uC785\uC5D0\uC11C \uC790', '\uC785\uC5D0\uC11C \uC131\uAE30', '\uC785\uC5D0\uC11C \uBE7C', '\uBE7C\uACE0 \uC228\uACE0\uB974', '\uB0B4\uB1C4\uACE0 \uC228\uACE0\uB974', '\uC228\uACE0\uB974\uB294', '\uC228 \uACE0\uB974\uB294'], tags: ['open mouth', 'panting'] },
  { triggers: ['\uC785\uC5D0 \uC2A4\uD0C0\uD0B9', '\uC785\uC5D0\uC2A4\uD0C0\uD0B9'], tags: ['stockings', 'clothes in mouth'] },
  { triggers: ['\uC2DC\uC624\uD6C4\uD0A4', '\uC2DC\uC624\uD6C4\uD0A4 \uC0AC\uC6B4\uB4DC'], tags: ['female ejaculation'] },
  { triggers: ['\uACE0\uAC1C \uC816\uD788', '\uACE0\uAC1C\uC816\uD788', 'tilt head', 'head tilt'], tags: ['head tilt'] },
  { triggers: ['chin up', '\uD131 \uC62C\uB9AC', '\uD131\uC744 \uC62C\uB9AC'], tags: ['chin up', 'head back'] },
  { triggers: ['head back', '\uACE0\uAC1C\uAC00 \uB4A4\uB85C', '\uACE0\uAC1C\uB97C \uB4A4\uB85C', '\uACE0\uAC1C\uAC00 \uB4A4\uB85C \uC816\uD600', '\uACE0\uAC1C\uB97C \uB4A4\uB85C \uC816\uD600'], tags: ['head back', 'chin up'] },
  { triggers: ['\uD65C\uCC98\uB7FC \uD5C8\uB9B4', '\uD65C\uCC98\uB7FC \uD718', '\uD5C8\uB9AC\uB97C \uD718', 'arched back'], tags: ['arched back'] },
  { triggers: ['\uC815\uC561', '\uD750\uB974\uB294', '\uD750\uB974\uB294 \uC815\uC561', '\uC0AC\uC815\uC74C', '\uC0AC\uC815 \uC2EC', '\uC0AC\uC815\uC52C', '\uC0AC\uC815 \uB098\uC624'], tags: ['cum', 'cumdrip'] },
  { triggers: ['\uC9C8\uB0B4 \uC0AC\uC815', '\uC9C8\uB0B4\uC0AC\uC815', '\uC548\uC5D0 \uC2F8', '\uC548\uC5D0\uC2F8', '\uC81C \uC548\uC5D0 \uC2F8', '\uC548\uCABD\uC5D0 \uC0AC\uC815', 'creampie'], tags: ['creampie', 'cum'] },
  { triggers: ['\uC785 \uC0AC\uC815', '\uC785\uC0AC\uC815', '\uC785\uC5D0 \uC815\uC561', '\uC785 \uC548\uC774\uB791', '\uC785 \uC18D', '\uC785\uC18D', 'cum in mouth'], tags: ['cum in mouth', 'cum'] },
  { triggers: ['\uC815\uC561 \uC0BC\uD0A4', '\uC0BC\uD0A4\uB294 \uC18C\uB9AC', '\uB9C8\uC2E4\uAC8C\uC694', '\uAFC0\uAE4D', 'swallowing'], tags: ['swallowing', 'cum in mouth'] },
  { triggers: ['\uAC00\uC2B4\uC5D0 \uC815\uC561', '\uAC00\uC2B4\uC5D0 \uC815\uC561 \uBAA8\uC5EC', '\uAC00\uC2B4\uC5D0 \uBAA8\uC5EC'], tags: ['cum', 'cum on breasts'] },
  { triggers: ['\uBC30\uC5D0 \uC815\uC561', '\uBC30\uB791 \uC190\uC5D0 \uC815\uC561', '\uBC30\uC640 \uC190\uC5D0 \uC815\uC561'], tags: ['stomach', 'cum', 'cum on stomach', 'cum on hand'] },
  { triggers: ['\uBC30\uC5D0 \uC788\uB294 \uC815\uC561 \uB9CC\uC9C0', '\uBC30\uC5D0 \uC815\uC561 \uB9CC\uC9C0'], tags: ['stomach', 'cum on stomach', 'hand on stomach'] },
  { triggers: ['\uBAB8 \uAD70\uB370\uAD70\uB370 \uC815\uC561', '\uBAB8\uC5D0 \uC815\uC561', '\uC815\uC561\uC774 \uBAB8'], tags: ['cum', 'cum on body'] },
  { triggers: ['\uB2E4\uB9AC \uC0AC\uC774\uB85C \uC815\uC561', '\uB2E4\uB9AC\uC0AC\uC774\uB85C \uC815\uC561', '\uD478\uC2DC\uC5D0 \uC815\uC561 \uD750', '\uBCF4\uC9C0\uC5D0 \uC815\uC561 \uD750'], tags: ['cum', 'cumdrip', 'pussy focus'] },
  { triggers: ['\uC9C0\uCCD0\uC11C', '\uC4F0\uB7EC\uC9C4'], tags: ['after sex', 'lying'] },
  { triggers: ['\uBC14\uB2E5\uC5D0 \uBCFC', '\uBCFC \uB300\uACE0', '\uC5BC\uAD74 \uB545\uC5D0', '\uC5BC\uAD74\uC744 \uB545\uC5D0'], tags: ['on floor', 'face down'] },
  { triggers: ['\uACE0\uAC1C \uB545\uC5D0 \uBC15', '\uACE0\uAC1C\uB97C \uB545\uC5D0 \uBC15', '\uB545\uC5D0 \uB540\uC774 \uB2FF', '\uB540\uC774 \uBC14\uB2E5\uC5D0 \uB2FF'], tags: ['on floor', 'face down', 'cheek on floor'] },
  { triggers: ['\uD798\uC774 \uB2E4 \uD480\uB9B0 \uD314', '\uD314\uC5D0 \uD798\uC774 \uD480\uB9B0', '\uD314\uB69D\uC73C\uB85C \uD314\uAFB9\uCE58', '\uD314\uAFB9\uCE58\uB97C \uB545\uC5D0'], tags: ['limp arms', 'elbows on floor'] },
  { triggers: ['\uC5C9\uB369\uC774 \uB4E4\uACE0', '\uC5C9\uB369\uC774\uB97C \uB4E4'], tags: ['ass focus'] },
  { triggers: ['\uC5C9\uB369\uC774 \uC7A1\uC544 \uBC8C', '\uC5C9\uB369\uC774\uB97C \uC7A1\uC544 \uBC8C', '\uC5C9\uB369\uC774 \uC7A1\uACE0 \uBC8C', '\uC7A1\uC544 \uBC8C\uB9AC\uACE0', '\uC7A1\uC544 \uBC8C\uB9B0', 'spread ass'], tags: ['spread ass', 'hands on ass', 'hand on another\'s ass'] },
  { triggers: ['\uB0A8\uC790 \uD558\uCCB4\uB9CC', '\uD558\uCCB4\uB9CC \uBCF4\uC774'], tags: ['lower body', 'cropped torso'] },
  { triggers: ['leg frame'], tags: ['leg frame'] },
  { triggers: ['\uC785 \uD2C0\uC5B4\uB9C9', '\uC785\uC744 \uD2C0\uC5B4\uB9C9'], tags: ['hand over mouth'] },
  { triggers: ['\uB0A8\uC790 \uB4F1\uC9DD', '\uB0A8\uC790 \uB4F1\uB9CC', '\uB0A8\uC790 \uB4F1\uC774', '\uB0A8\uC790\uC758 \uB4B7\uBAA8\uC2B5'], tags: ['male back', 'from behind'] },
  { triggers: ['back view', '\uB4B7\uBAA8\uC2B5'], tags: ['from behind'] },
  { triggers: ['\uD314 \uB4A4\uB85C \uBD99\uC7A1', '\uBD99\uC7A1\uD78C \uD314'], tags: ['restrained', 'arms behind back'] },
  { triggers: ['\uC190 \uB4A4\uB85C \uC7A1\uD78C', '\uC190\uC744 \uB4A4\uB85C \uC7A1', '\uC190 \uB4A4\uB85C \uC7A1'], tags: ['restrained', 'arms behind back'] },
  { triggers: ['\uCE68\uB300 \uC704', '\uCE68\uB300\uC5D0'], tags: ['bedroom', 'bed'] },
  { triggers: ['\uB124 \uBC1C \uAE30\uAE30', '\uB124\uBC1C\uAE30\uAE30', '\uB124 \uBC1C\uB85C', '\uB124 \uBC1C \uC790\uC138', '\uB124\uBC1C \uC790\uC138', 'on all fours'], tags: ['all fours'] },
  { triggers: ['\uBCBD\uC5D0 \uC190', '\uC190 \uC9DA\uACE0', '\uC190 \uC9DA\uACE0\uC788'], tags: ['hand on wall'] },
  { triggers: ['hands on floor', '\uBC14\uB2E5\uC5D0 \uC190', '\uBC14\uB2E5\uC744 \uC9DA'], tags: ['hands on floor'] },
  { triggers: ['hands on mattress', 'hand on mattress', 'hand on metress', 'hands on metress', '\uBA54\uD2B8\uB9AC\uC2A4\uC5D0 \uC190', '\uBA54\uD2B8\uB9AC\uC2A4\uB97C \uC9DA'], tags: ['hands on mattress', 'mattress'] },
  { triggers: ['\uD5C8\uB9AC\uC5D0 \uC190', '\uD5C8\uB9AC\uB97C \uC7A1'], tags: ['hand on waist'] },
  { triggers: ['\uD654\uBA74 \uC9DA', '\uD654\uBA74\uC744 \uC9DA', 'hand on screen'], tags: ['hand on screen'] },
  { triggers: ['\uD314\uC744 \uBED7', '\uD654\uBA74\uC73C\uB85C \uD314', '\uD654\uBA74\uC73C\uB85C \uD314\uC744', '\uD314 \uD654\uBA74\uC73C\uB85C', 'stretch arms to viewer', 'outstretched arms'], tags: ['reaching towards viewer', 'outstretched arms', 'arms towards viewer'] },
  { triggers: ['\uB9C8\uC8FC\uBCF4', '\uC11C\uB85C \uBC14\uB77C', '\uB9C8\uC8FC\uBCF4\uACE0'], tags: ['facing another'] },
  { triggers: ['\uC140\uCE74', '\uC140\uD53C', 'selfie'], tags: ['selfie', 'holding phone', 'smartphone'] },
  { triggers: ['\uD1B5\uD654\uC911', '\uC804\uD654\uC911', '\uC804\uD654 \uC911', '\uADC0\uC5D0 \uD578\uB4DC\uD3F0', '\uADC0\uC5D0 \uD3F0', 'phone at ear'], tags: ['holding phone', 'phone at ear', 'smartphone'] },
  { triggers: ['\uC720\uD639\uD558\uB294', '\uC720\uD639\uD558\uB294 \uD3EC\uC988', '\uC720\uD639\uC801\uC778 \uB208\uBE5B', '\uB07C\uBD80\uB9AC\uB4EF', '\uB07C\uBD80\uB9AC\uB294'], tags: ['seductive'] },
  { triggers: ['\uC544\uD5E4\uAC00\uC624', 'ahegao'], tags: ['ahegao'] },
  { triggers: ['rolling eyes', '\uB208\uC774 \uB4A4\uC9D1', '\uB208 \uB4A4\uC9D1'], tags: ['rolling eyes'] },
  { triggers: ['\uC77C\uADF8\uB7EC\uC9C4 \uC5BC\uAD74', '\uB9DD\uAC00\uC9C4 \uC5BC\uAD74'], tags: ['grimace'] },
  { triggers: ['painful', '\uC544\uD30C\uD558', '\uC544\uD508 \uD45C\uC815'], tags: ['painful', 'grimace'] },
  { triggers: ['open mouth', '\uC785\uC744 \uBC8C', '\uC785 \uBC8C'], tags: ['open mouth'] },
  { triggers: ['closed eyes', '\uB208\uC744 \uAC10', '\uB208 \uAC10'], tags: ['closed eyes'] },
  { triggers: ['\uCF8C\uB77D \uD45C\uC815'], tags: ['pleasure face'] },
  { triggers: ['\uBC18\uB9CC \uB72C \uB208', '\uBC18\uB9CC\uB72C \uB208', 'half-closed eyes', 'half closed eyes'], tags: ['half-closed eyes'] },
  { triggers: ['\uD480\uB9B0\uB208', '\uD480\uB9B0 \uB208', '\uB9DB\uD0F1\uC774\uAC00 \uAC04', '\uB9DB\uD0F1\uC774 \uAC04'], tags: ['half-closed eyes', 'pleasure face'] },
  { triggers: ['\uC18C\uBCC0', '\uC624\uC90C', 'urine'], tags: ['urine'] },
  { triggers: ['begging', '\uC560\uC6D0', '\uBE44\uB294 \uC911', '\uB450 \uC190 \uBAA8\uC544', '\uB450\uC190 \uBAA8\uC544'], tags: ['begging', 'clasped hands'] },
  { triggers: ['looking up', '\uC62C\uB824\uB2E4\uBCF4'], tags: ['looking up'] },
  { triggers: ['\uC140\uD504 \uD578\uB4DC\uC7A1', '\uC140\uD504\uD578\uB4DC\uC7A1'], tags: ['masturbation', 'hand job', 'hand on penis'] },
  { triggers: ['\uC811\uC2DC \uB2E6', '\uC811\uC2DC\uB97C \uB2E6', '\uC124\uAC70\uC9C0', '\uC124\uAC70\uC9C0 \uD558\uB294', 'washing dishes'], tags: ['washing dishes', 'holding plate', 'plate', 'sink'] },
  { triggers: ['\uB2E4\uB9AC\uC5D0 \uBC14\uC9C0 \uB07C', '\uB2E4\uB9AC\uC5D0 \uBC14\uC9C0\uAC00 \uB07C', '\uBC14\uC9C0\uAC00 \uB2E4\uB9AC\uC5D0', 'pants around legs'], tags: ['pants around legs', 'partially undressed'] },
  { triggers: ['\uBB34\uB98E \uC138\uC6B0', '\uBB34\uB98E\uC744 \uC138\uC6B0', '\uB2E4\uB9AC \uBB34\uB98E \uC138\uC6B4', 'knees up'], tags: ['knees up'] },
  { triggers: ['\uB208\uBB3C\uC790\uAD6D', '\uB208\uBB3C \uC790\uAD6D', 'tear streaks'], tags: ['tears', 'tear streaks'] },
  { triggers: ['\uD63C\uC790 \uC790\uC704', '\uC5EC\uC790 \uC790\uC704', '\uC5EC\uC131 \uC790\uC704', '\uC790\uC704 \uD3EC\uCEE4\uC2A4'], tags: ['solo', 'female masturbation', 'masturbation', 'masturbation focus'] },
  { triggers: ['\uD750\uD2B8\uB7EC\uC9C4 \uBAA8\uC2B5', '\uD750\uD2B8\uB7EC\uC9C4', '\uD5DD\uD074\uC5B4\uC9C4', 'disheveled', 'messy hair'], tags: ['disheveled', 'messy hair'] },
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

function isFemaleOnlySixtyNineContext(text) {
  return hasAny(text, [
    '\uC5EC\uC131 \uB458\uC774 69',
    '\uC5EC\uC790 \uB458\uC774 69',
    '\uB450 \uC5EC\uC131\uC740 \uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565',
    '\uB450 \uC5EC\uC790\uB294 \uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565',
    '\uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565\uC544\uC8FC\uB294'
  ]);
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
    label: 'wink',
    triggers: ['wink', '\uC719\uD06C', '\uD55C\uCABD \uB208'],
    tags: ['wink', 'one eye closed']
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
  const negativeTags = [];

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

  if (hasAny(text, ['\uBAB8 \uB2E4 \uBCF4\uC774\uAC8C', '\uBAB8\uC774 \uB2E4 \uBCF4\uC774\uAC8C', '\uC804\uC2E0', 'full body'])) {
    addTag(tags, 'full body');
  }

  if (hasAny(text, ['cowboy shot', '\uBB34\uB98E', '\uD5C8\uBC85\uC9C0'])) {
    addTag(tags, 'cowboy shot');
  }

  if (hasAny(text, ['bust shot', '\uBC84\uC2A4\uD2B8 \uC20F', '\uBC14\uC2A4\uD2B8 \uC20F'])) {
    addTag(tags, 'bust shot');
  }

  if (hasAny(text, ['side view', 'profile', '\uCE21\uBA74'])) {
    addTag(tags, 'from side');
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

  if (hasAny(text, ['whisper', 'murmur', '\uC218\uADFC', '\uC6C5\uC131', '\uADC0\uC18D\uB9D0'])) {
    addTag(tags, 'whispering');
    addTag(tags, 'whisper to ear');
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

  if (hasAny(text, ['\uC5EC\uC790\uB4E4', '\uC5EC\uC131\uB4E4'])) {
    addTag(tags, 'multiple girls');
  }

  applyDraftRuleSet(description, tags);

  const femaleOnlySixtyNineContext = isFemaleOnlySixtyNineContext(text);
  const leaningOnDoorContext = hasAny(text, [
    '\uBB38\uC5D0 \uAE30\uB300',
    '\uBB38\uC5D0\uAE30\uB300',
    '\uBB38\uC5D0 \uAE30\uB300\uC11C',
    'leaning on door'
  ]);
  const orderedTags = orderPromptTags(tags)
    .filter((tag) => !suppressedDraftTags.has(getPromptTagSortLabel(tag)))
    .filter((tag) => {
      const label = getPromptTagSortLabel(tag);
      return !femaleOnlySixtyNineContext || !["underbody to male's face", 'top-down bottom-up'].includes(label);
    })
    .filter((tag) => !leaningOnDoorContext || getPromptTagSortLabel(tag) !== 'leaning on person')
    .filter((tag) => !(text.includes('male pov') && getPromptTagSortLabel(tag) === 'pov'));
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
      tagAssignments: scene.tagAssignments || {},
      wildcardPrompts: scene.wildcardPrompts || [],
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
      tagAssignments: scene.tagAssignments || {},
      wildcardPrompts: scene.wildcardPrompts || [],
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
      tagAssignments: scene.tagAssignments || {},
      wildcardPrompts: scene.wildcardPrompts || [],
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
      height: generationSettings.height,
      sourceImageId: generationSettings.sourceImageId || '',
      inpaintStrength: generationSettings.inpaintStrength ?? '',
      i2iStrength: generationSettings.i2iStrength ?? '',
      i2iNoise: generationSettings.i2iNoise ?? ''
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
      tagAssignments: scene.tagAssignments || {},
      wildcardPrompts: scene.wildcardPrompts || [],
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
      tagAssignments: scene.tagAssignments || {},
      wildcardPrompts: scene.wildcardPrompts || [],
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
  normalizePromptTag,
  getPromptTagSortLabel,
  orderPromptTags,
  getDefaultTagTarget,
  normalizeTagAssignments,
  getCharacterIndexesForTagTarget,
  splitTagsByTarget,
  formatWildcardPrompt,
  splitWildcardPromptsByTarget,
  createMockGeneration,
  createGenerationRecord,
  createFailedGenerationRecord
};
