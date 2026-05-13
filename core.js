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
  ['cowboy shot', 'bust shot', 'upper body', 'full body', 'wide shot', 'pov', 'pov hands', 'pov doorway', 'multiple views', 'straight-on', 'facing away', 'three quarter view', 'dutch angle', 'upside-down', 'from above', 'high up', 'from below', 'side view', 'from side', 'facing to the side', 'profile', 'from behind', 'looking at viewer', 'looking back'],
  ['indoors', 'outdoors', 'entrance', 'doorway', 'bedroom', 'bathroom', 'bathtub', 'open door', 'bed', 'table', 'school', 'classroom', 'market street', 'city street', 'forest', 'night', 'sunset', 'rain'],
  ['standing', 'walking', 'sitting', 'kneeling', 'lying', 'leaning forward', 'leaning on person', 'arms around shoulders', 'arms around neck', 'hug', 'holding hands', 'holding paper', 'waving', 'hands behind back', 'hair flip', 'pointing', 'straddling', 'girl on top', 'cowgirl position', 'sitting on lap', 'upright straddle', 'all fours', 'head tilt', 'head shaking', 'wink', 'whispering', 'whisper to ear', 'sniffing', 'talking', 'background crowd'],
  ['smile', 'expressionless', 'angry', 'glaring', 'scared', 'surprised', 'embarrassed', 'drunk', 'blush', 'tears'],
  ['breasts', 'ass focus', 'lower body', 'cropped torso', 'male torso', 'face out of frame', 'cropped face', 'ear', 'thighs', 'tail', 'tail grab', 'tail wagging', 'hand on another\'s ass', 'hand on thigh', 'highly detailed'],
  ['sex', 'vaginal', 'pussy', 'pussy focus', 'spread legs', 'fingering', 'clitoris', 'breast sucking', 'breast grab', 'breast press', 'nipple flick', 'hand on nipple', 'kissing', 'saliva', 'hand job', 'hands on penis', 'penis', 'ear licking', 'licking', 'nude', 'bottomless', 'partially undressed', 'doggystyle', 'cowgirl position', 'paizuri', 'mating press', 'missionary', 'fellatio', 'cum', 'cumdrip', 'cum on breasts', 'female ejaculation', 'after sex', 'restrained', 'hand over mouth', 'head grab', 'seductive'],
  ['paper', 'document', 'briefcase', 'cushion', 'holding phone', 'smartphone', 'drinking', 'undressing', 'covering self', 'forehead-to-forehead', 'facing another', 'reaching towards viewer', 'rotational symmetry', 'downblouse', 'downpants']
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
  { triggers: ['from above', '\uC704\uC5D0\uC11C', '\uB0B4\uB824\uB2E4', '\uC815\uC218\uB9AC'], tags: ['from above'] },
  { triggers: ['from side', 'side view', '옆에서', '\uCE21\uBA74', '\uC0AC\uC774\uB4DC'], tags: ['from side', 'side view'] },
  { triggers: ['pov', '\uB0A8\uC790 \uC2DC\uC810', '\uB0A8\uC790\uAC00 \uC704\uC5D0\uC11C', '\uD558\uC774\uC575\uAE00'], tags: ['pov'] },
  { triggers: ['\uB300\uAC01\uC120', '\uB300\uAC01\uC120\uC774\uC5B4\uB3C4'], tags: ['dutch angle'] },
  { triggers: ['\uD654\uBA74 \uBC14\uB77C\uBCF4', '\uCE74\uBA54\uB77C \uBC14\uB77C', 'looking at viewer'], tags: ['looking at viewer'] },
  { triggers: ['\uB4A4\uB3CC\uC544\uBCF4', '\uB4A4\uC5D0\uC11C \uCE74\uBA54\uB77C'], tags: ['looking back'] },
  { triggers: ['\uB4A4\uC5D0\uC11C', '\uB4A4\uC5D0\uC11C \uBC14\uB77C'], tags: ['from behind'] },
  { triggers: ['\uBC18\uCE21\uBA74'], tags: ['three quarter view'] },
  { triggers: ['\uC804\uD654\uAE30', '\uD3F0', 'phone'], tags: ['holding phone', 'smartphone'] },
  { triggers: ['\uC548\uB155 \uC190', '\uAE30\uC548\uB155 \uC190'], tags: ['waving'] },
  { triggers: ['\uC190 \uB4A4\uB85C', '\uB4A4\uB85C \uAF2C\uACE0'], tags: ['hands behind back'] },
  { triggers: ['\uBA38\uB9AC\uCE74\uB77D \uB118\uAE30', '\uBA38\uB9AC \uB118\uAE30'], tags: ['hair flip'] },
  { triggers: ['\uC190 \uC7A1', '\uC190\uC7A1', '\uAE4D\uC9C0'], tags: ['holding hands'] },
  { triggers: ['\uB450 \uC190 \uC7A1', '\uB450\uC190 \uC7A1', '\uC591\uC190 \uC7A1'], tags: ['holding hands'] },
  { triggers: ['\uAC00\uC2B4', 'breast'], tags: ['breasts'] },
  { triggers: ['\uC5C9\uB369\uC774'], tags: ['ass focus'] },
  { triggers: ['\uAF2C\uB9AC'], tags: ['tail'] },
  { triggers: ['\uAF2C\uB9AC \uC7A1', '\uAF2C\uB9AC\uC7A1'], tags: ['tail', 'tail grab'] },
  { triggers: ['\uAF2C\uB9AC \uD30C\uB974\uB974', '\uAF2C\uB9AC \uC0B4\uB791', '\uC0B4\uB791\uC0B4\uB791'], tags: ['tail', 'tail wagging'] },
  { triggers: ['\uBC25\uC0C1', 'table', '\uC220\uC0C1'], tags: ['table'] },
  { triggers: ['\uC220 \uB9C8\uC2DC', '\uAC74\uBC30', '\uB9C8\uC2DC\uB294'], tags: ['drinking'] },
  { triggers: ['\uCDE8\uD55C', '\uCDE8\uD574', '\uCDE8\uD55C\uD45C\uC815', '\uD5E4\uB871\uD5E4\uB871', '\uBE44\uD2C0\uBE44\uD2C0'], tags: ['drunk', 'blush'] },
  { triggers: ['\uCE68\uB300'], tags: ['bedroom', 'bed'] },
  { triggers: ['\uD654\uC7A5\uC2E4'], tags: ['bathroom'] },
  { triggers: ['\uC695\uC870'], tags: ['bathroom', 'bathtub'] },
  { triggers: ['\uBB38 \uC5F4', '\uBB38\uC5F4', '\uC5F4\uBA74', 'open door'], tags: ['open door'] },
  { triggers: ['\uD604\uAD00', '\uBB38 \uBC16', '\uBB38\uBC16', '\uBB38 \uC55E', '\uC785\uAD6C'], tags: ['entrance', 'doorway', 'open door'] },
  { triggers: ['\uBC14\uAE65\uD48D\uACBD', '\uBC14\uAE65 \uD48D\uACBD', '\uBC16 \uD48D\uACBD'], tags: ['outdoors'] },
  { triggers: ['\uBC29\uC11D'], tags: ['cushion'] },
  { triggers: ['\uC11C\uB958\uAC00\uBC29'], tags: ['briefcase'] },
  { triggers: ['\uC885\uC774\uBB49\uCE58', '\uC885\uC774 \uB4E4', '\uC11C\uB958 \uB4E4'], tags: ['paper', 'document', 'holding paper'] },
  { triggers: ['\uC885\uC774 \uBC14\uB77C', '\uC11C\uB958 \uBC14\uB77C'], tags: ['paper'] },
  { triggers: ['\uB204\uC6B4', '\uB204\uC6CC'], tags: ['lying'] },
  { triggers: ['\uC8FC\uC800\uC549', '\uC549\uC544', '\uC790\uB9AC\uC5D0 \uC549'], tags: ['sitting'] },
  { triggers: ['\uBB34\uB98E', '\uAFC7\uC740'], tags: ['kneeling'] },
  { triggers: ['\uD074\uB85C\uC988\uC5C5'], tags: [] },
  { triggers: ['\uBAB8 \uB2E4 \uBCF4\uC774\uAC8C', '\uBAB8\uC774 \uB2E4 \uBCF4\uC774\uAC8C', '\uC804\uC2E0', 'full body'], tags: ['full body'] },
  { triggers: ['\uC0C1\uCCB4'], tags: ['upper body'] },
  { triggers: ['\uC5BC\uAD74 \uBCF4\uC774\uC9C0 \uC54A\uAC8C', '\uC5BC\uAD74\uBCF4\uC774\uC9C0 \uC54A\uAC8C'], tags: ['face out of frame', 'cropped face'] },
  { triggers: ['\uB2F9\uD669', '\uB180\uB78C', '\uC7A0 \uAE6C'], tags: ['surprised'] },
  { triggers: ['\uBB34\uD45C\uC815', '\uB364\uB364'], tags: ['expressionless'] },
  { triggers: ['\uBD80\uB044\uB7EC\uC6B4', '\uBD80\uB044\uB7EC\uC6B4\uB4EF'], tags: ['embarrassed', 'blush'] },
  { triggers: ['\uC637 \uD6CC\uB801', '\uBC97\uACA8', '\uB0B4\uB824\uC694'], tags: ['undressing'] },
  { triggers: ['\uD558\uCCB4\uB9CC \uBC97', '\uD558\uCCB4\uB97C \uBC97'], tags: ['bottomless', 'partially undressed'] },
  { triggers: ['\uBAB8\uC744 \uAC00\uB9AC', '\uC785 \uD2C0\uC5B4\uB9C9'], tags: ['covering self'] },
  { triggers: ['\uB0A8\uC790 \uC190\uB9CC', 'pov hand only'], tags: ['pov hands'] },
  { triggers: ['\uC640\uB77D \uB04C\uC5B4\uC548', '\uC548\uACA8 \uC788\uB294', '\uC548\uACE0 \uC788\uB294', '\uB04C\uC5B4\uC548\uACE0'], tags: ['hug'] },
  { triggers: ['\uC548\uACA8\uC788', '\uC548\uACA8 \uC788', '\uC644\uC804\uD788 \uC548\uACA8', '\uBC00\uCC29'], tags: ['hug'] },
  { triggers: ['\uAC00\uC2B4 \uBC00\uCC29', '\uAC00\uC2B4\uBC00\uCC29'], tags: ['breast press', 'hug'] },
  { triggers: ['\uC5B4\uAE68\uC5D0 \uC190', '\uC5B4\uAE68\uC5D0 \uC190 \uB450\uB974', '\uC5B4\uAE68\uC5D0 \uC190\uB450\uB974'], tags: ['arms around shoulders'] },
  { triggers: ['\uBAA9 \uC8FC\uBCC0\uBD80\uB97C \uB450\uB974', '\uBAA9\uC5D0 \uD314', '\uBAA9 \uC8FC\uBCC0'], tags: ['arms around neck'] },
  { triggers: ['\uBA38\uB9AC \uB9DE\uB300', '\uBA38\uB9AC\uB9DE\uB300', '\uAD50\uAC10\uD3EC\uC988'], tags: ['forehead-to-forehead', 'hug'] },
  { triggers: ['\uC5C9\uB369\uC774 \uC704\uC5D0 \uC190', '\uC5C9\uB369\uC774 \uC7A1', '\uC5C9\uB369\uC774\uB97C \uC7A1'], tags: ['hand on another\'s ass'] },
  { triggers: ['\uD5C8\uBC85\uC9C0\uC5D0 \uB450', '\uD5C8\uBC85\uC9C0\uC5D0 \uC190'], tags: ['hand on thigh', 'thighs'] },
  { triggers: ['\uD558\uCCB4 \uD074\uB85C\uC988\uC5C5', '\uD558\uCCB4\uB9CC', '\uD558\uCCB4 \uC704\uC8FC'], tags: ['lower body'] },
  { triggers: ['\uAC00\uC2B4\uB9CC', '\uAC00\uC2B4\uB9CC \uB098\uC624', '\uC5BC\uAD74 \uB098\uC62C \uD544\uC694\uC5C6'], tags: ['breasts', 'cropped torso', 'face out of frame'] },
  { triggers: ['\uAC00\uC2B4\uD31D', '\uB0A8\uC790 \uAC00\uC2B4\uD31D', '\uC5B4\uAE68 \uC815\uB3C4\uB9CC'], tags: ['male torso', 'cropped torso'] },
  { triggers: ['\uB0A8\uC790 \uB4B7\uD1B5\uC218', '\uB4B7\uD1B5\uC218\uB9CC'], tags: ['from behind', 'cropped face'] },
  { triggers: ['\uC0AC\uC774\uB4DC \uD0A4\uC2A4', 'side kiss'], tags: ['kissing', 'from side'] },
  { triggers: ['\uADC0\uC5D0 \uB300\uACE0 \uB9D0', '\uADC0\uC5D0 \uB300\uACE0 \uB9D0\uD558', '\uADC0\uC5D0 \uB300\uACE0 \uC18D\uC0AD', '\uADC0\uC18D\uB9D0', '\uADC0 \uADFC\uCC98\uC5D0\uC11C \uB300\uD654', '\uADC0 \uADFC\uCC98\uC5D0\uC11C \uB9D0'], tags: ['whispering', 'whisper to ear'] },
  { triggers: ['\uADC0 \uAC00\uAE4C\uC774', '\uADC0\uAC00\uAE4C\uC774', '\uD0B9\uD0B9', '\uB0C4\uC0C8 \uB9E1', '\uB0C4\uC0C8\uB9E1', 'sniff'], tags: ['ear', 'sniffing'] },
  { triggers: ['\uADC0\uC5D0 \uB300\uACE0 \uB9AC\uD0B9', '\uADC0 \uB9AC\uD0B9', '\uC774\uC5B4\uB9AC\uD0B9', 'ear licking'], tags: ['ear licking', 'licking', 'ear'] },
  { triggers: ['\uAE30\uB300\uC11C', '\uAE30\uB300\uACE0'], tags: ['leaning on person'] },
  { triggers: ['\uAC77\uB294', '\uC6C0\uC9C1\uC774\uB294', '\uC6C0\uC9C1\uC784'], tags: ['walking'] },
  { triggers: ['pussy focus', '\uBCF4\uC9C0'], tags: ['pussy', 'pussy focus'] },
  { triggers: ['\uC131\uAE30 \uD074\uB85C\uC988\uC5C5'], tags: ['pussy', 'pussy focus'] },
  { triggers: ['\uC190\uAC00\uB77D', '\uD551\uAC70\uB9C1', 'fingering'], tags: ['fingering'] },
  { triggers: ['\uB300\uB538', '\uC190\uC73C\uB85C \uD398\uB2C8\uC2A4', '\uD398\uB2C8\uC2A4 \uB9CC\uC9C0', 'handjob', 'hand job'], tags: ['hand job', 'hands on penis'] },
  { triggers: ['\uD398\uB2C8\uC2A4', 'penis'], tags: ['penis'] },
  { triggers: ['\uB098\uCCB4', '\uB204\uB4DC'], tags: ['nude'] },
  { triggers: ['\uD398\uB2C8\uC2A4\uB9CC \uBCF4\uC774', '\uD398\uB2C8\uC2A4\uB9CC'], tags: ['penis', 'cropped torso'] },
  { triggers: ['\uD30C\uC774\uC988\uB9AC', 'paizuri'], tags: ['paizuri', 'penis', 'breasts'] },
  { triggers: ['\uD5C8\uBC85\uC9C0', '\uD5C8\uBC85\uC9C0\uAE4C\uC9C0'], tags: ['thighs'] },
  { triggers: ['\uC11C \uC788\uB294', '\uC11C\uC788\uB294', '\uC11C \uC788\uB294 \uB290\uB08C'], tags: ['standing'] },
  { triggers: ['\uBD84\uD560\uCEF7', '\uBD84\uD560 \uCEF7', '\uD654\uBA74\uBD84\uD560'], tags: ['multiple views'] },
  { triggers: ['\uC704\uC5D0 \uD0C0\uC788', '\uC704\uC5D0 \uC62C\uB77C\uD0C0', '\uC62C\uB77C\uD0C0 \uC788'], tags: ['straddling', 'girl on top'] },
  { triggers: ['\uAE30\uC2B9\uC704'], tags: ['sex', 'cowgirl position', 'girl on top'] },
  { triggers: ['\uB300\uBA74 \uC88C\uC704', '\uB300\uBA74\uC88C\uC704'], tags: ['sex', 'sitting', 'sitting on lap', 'upright straddle', 'facing another'] },
  { triggers: ['\uC88C\uC704'], tags: ['sitting', 'upright straddle'] },
  { triggers: ['\uB2E4\uB9AC \uBC8C\uB9B0', '\uB2E4\uB9AC\uB97C \uBC8C\uB9B0'], tags: ['spread legs'] },
  { triggers: ['\uD074\uB9AC', '\uD074\uB9AC\uD1A0\uB9AC\uC2A4', 'clitoris'], tags: ['clitoris'] },
  { triggers: ['\uAC00\uC2B4 \uBE68', '\uAC00\uC2B4 \uBE60', '\uC720\uB450 \uBE68'], tags: ['breast sucking'] },
  { triggers: ['\uAC00\uC2B4 \uC704\uC8FC', '\uAC00\uC2B4\uC744 \uBE60', '\uAC00\uC2B4 \uBE60\uB294', '\uBAB8 \uC774\uACF3\uC800\uACF3 \uBE60'], tags: ['breast sucking', 'licking'] },
  { triggers: ['\uAC00\uC2B4 \uC7A1', '\uAC00\uC2B4 \uC7A1\uAE30', '\uC2A4\uC2A4\uB85C \uC7A1'], tags: ['breast grab'] },
  { triggers: ['nipple \uAD34\uB86D', '\uB2C8\uD50C \uAD34\uB86D', '\uC720\uB450 \uAD34\uB86D', '\uC816\uAF2D\uC9C0 \uB9CC\uC9C0', '\uC720\uB450 \uB9CC\uC9C0'], tags: ['nipple flick', 'hand on nipple'] },
  { triggers: ['\uD0A4\uC2A4', 'kiss'], tags: ['kissing'] },
  { triggers: ['\uAC8C\uAC78\uC2A4\uB7FD', '\uB098\uB20C\uC11C'], tags: ['saliva'] },
  { triggers: ['\uC0BD\uC785', '\uD53C\uC2A4\uD1A4', '\uBC15\uAE30', '\uD37D\uD37D'], tags: ['sex', 'vaginal'] },
  { triggers: ['\uBA38\uB9AC \uD754\uB4E4', '\uBA38\uB9AC\uAC00 \uD754\uB4E4', '\uB4E4\uC369\uB4E4\uC369'], tags: ['head shaking'] },
  { triggers: ['\uD6C4\uBC30\uC704', '\uB4A4\uB85C \uBC15\uAE30'], tags: ['sex', 'doggystyle', 'from behind'] },
  { triggers: ['\uAD50\uBC30 \uD504\uB808\uC2A4', '\uAD50\uBC30\uD504\uB808\uC2A4'], tags: ['sex', 'mating press', 'missionary'] },
  { triggers: ['\uCE21\uC704'], tags: ['sex', 'side view'] },
  { triggers: ['\uD3A0\uB77C'], tags: ['fellatio'] },
  { triggers: ['\uD1A0\uD0B9', '\uB9D0\uD558\uAE30', '\uB9D0\uD558\uB294'], tags: ['talking'] },
  { triggers: ['\uBA38\uB9AC \uC7A1', '\uBA38\uB9AC\uB97C \uC7A1'], tags: ['head grab'] },
  { triggers: ['\uC785\uC5D0 \uB123', '\uC785\uC5D0 \uB123\uC740'], tags: ['fellatio'] },
  { triggers: ['\uC2DC\uC624\uD6C4\uD0A4', '\uC2DC\uC624\uD6C4\uD0A4 \uC0AC\uC6B4\uB4DC'], tags: ['female ejaculation'] },
  { triggers: ['\uACE0\uAC1C \uC816\uD788', '\uACE0\uAC1C\uC816\uD788'], tags: ['head tilt'] },
  { triggers: ['\uC815\uC561', '\uD750\uB974\uB294', '\uD750\uB974\uB294 \uC815\uC561'], tags: ['cum', 'cumdrip'] },
  { triggers: ['\uAC00\uC2B4\uC5D0 \uC815\uC561', '\uAC00\uC2B4\uC5D0 \uC815\uC561 \uBAA8\uC5EC', '\uAC00\uC2B4\uC5D0 \uBAA8\uC5EC'], tags: ['cum', 'cum on breasts'] },
  { triggers: ['\uC9C0\uCCD0\uC11C', '\uC4F0\uB7EC\uC9C4'], tags: ['after sex', 'lying'] },
  { triggers: ['\uC5C9\uB369\uC774 \uB4E4\uACE0', '\uC5C9\uB369\uC774\uB97C \uB4E4'], tags: ['ass focus'] },
  { triggers: ['\uC785 \uD2C0\uC5B4\uB9C9', '\uC785\uC744 \uD2C0\uC5B4\uB9C9'], tags: ['hand over mouth'] },
  { triggers: ['\uD314 \uB4A4\uB85C \uBD99\uC7A1', '\uBD99\uC7A1\uD78C \uD314'], tags: ['restrained', 'arms behind back'] },
  { triggers: ['\uCE68\uB300 \uC704', '\uCE68\uB300\uC5D0'], tags: ['bedroom', 'bed'] },
  { triggers: ['\uB124 \uBC1C \uAE30\uAE30', '\uB124\uBC1C\uAE30\uAE30', '\uB124 \uBC1C\uB85C', 'on all fours'], tags: ['all fours'] },
  { triggers: ['\uD314\uC744 \uBED7', '\uD654\uBA74\uC73C\uB85C \uD314', '\uD654\uBA74\uC73C\uB85C \uD314\uC744'], tags: ['reaching towards viewer'] },
  { triggers: ['\uB9C8\uC8FC\uBCF4', '\uC11C\uB85C \uBC14\uB77C', '\uB9C8\uC8FC\uBCF4\uACE0'], tags: ['facing another'] },
  { triggers: ['\uC720\uD639\uD558\uB294', '\uC720\uD639\uD558\uB294 \uD3EC\uC988'], tags: ['seductive'] },
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
