const assert = require('assert');
const {
  createEmptyProject,
  createFailedGenerationRecord,
  defaultGenerationSettings,
  normalizeProject,
  parseScenes,
  generateDraftTags,
  parseTagDictionary,
  applyCustomTagRules,
  orderPromptTags,
  createMockGeneration
} = require('../core');

function testSceneParser() {
  const scenes = parseScenes([
    'Scene 1: A girl stands in a rainy city street at night.',
    'She smiles under neon light.',
    'Scene 2: A boy sits in a classroom.',
    '[3] Forest wide shot at sunset.'
  ].join('\n'));

  assert.strictEqual(scenes.length, 3);
  assert.strictEqual(scenes[0].sceneNo, '1');
  assert.match(scenes[0].description, /rainy city street/);
  assert.strictEqual(scenes[0].status, 'imported');
  assert.strictEqual(scenes[2].sceneNo, '3');
}

function testParserWarnings() {
  const duplicates = parseScenes('Scene 1: First\nScene 1: Duplicate');
  assert.strictEqual(duplicates.length, 2);
  assert.ok(duplicates[0].parserWarnings.some((warning) => warning.includes('Duplicate')));

  const unmarked = parseScenes('No marker here, just a raw scene.');
  assert.strictEqual(unmarked.length, 1);
  assert.strictEqual(unmarked[0].status, 'needs_review');
}

function testSubsceneParser() {
  const scenes = parseScenes([
    '#01 -1',
    '\uC804\uD654\uAE30 \uB4E4\uACE0 \uAC77\uAE30',
    '',
    '#01 -2',
    '\uB4A4\uB3CC\uC544\uBCF4\uB294 \uC790\uC138',
    '',
    '#02 - \uAE30\uBCF8\uD3EC\uC988',
    '\uC548\uB155 \uC190',
    '',
    '#16 \u2013 1 \uBC14\uC9C0\uB3C4 \uB9C8\uCC2C\uAC00\uC9C0\uB85C \uB0B4\uB824\uC694'
  ].join('\n'));

  assert.strictEqual(scenes.length, 4);
  assert.strictEqual(scenes[0].sceneNo, '01-1');
  assert.strictEqual(scenes[1].sceneNo, '01-2');
  assert.strictEqual(scenes[2].sceneNo, '02');
  assert.strictEqual(scenes[3].sceneNo, '16-1');
  assert.match(scenes[2].description, /\uAE30\uBCF8\uD3EC\uC988/);
  assert.match(scenes[3].description, /\uBC14\uC9C0\uB3C4/);
  scenes.forEach((scene) => {
    assert.strictEqual(scene.parserWarnings.some((warning) => warning.includes('Duplicate')), false);
  });
}

function testLegacySubsceneNormalization() {
  const project = normalizeProject({
    scenes: [
      {
        id: 'scene-16-016',
        sceneNo: '16',
        description: '\uC637\uC18C\uB9AC \uB098\uC62C \uB54C\uBD80\uD130 \uD074\uB85C\uC988\uC5C5',
        parserWarnings: ['Duplicate scene number "16" found.'],
        status: 'needs_review'
      },
      {
        id: 'scene-16-017',
        sceneNo: '16',
        description: '-1 \uBC14\uC9C0\uB3C4 \uB9C8\uCC2C\uAC00\uC9C0\uB85C \uB3D9\uC77C\uD558\uAC8C \uB0B4\uB824\uC694',
        parserWarnings: ['Duplicate scene number "16" found.'],
        status: 'needs_review'
      }
    ]
  });

  assert.strictEqual(project.scenes[0].sceneNo, '16');
  assert.strictEqual(project.scenes[1].sceneNo, '16-1');
  assert.match(project.scenes[1].description, /^\uBC14\uC9C0\uB3C4/);
  assert.strictEqual(project.scenes[1].parserWarnings.length, 0);
  assert.strictEqual(project.scenes[1].status, 'imported');
}

function testKoreanHashSceneParser() {
  const scenes = parseScenes([
    '아이얀)',
    '저기요 아저씨.',
    '',
    '#31',
    '화가 난 준철의 옆으로 아이얀의',
    '얼굴이 불쑥 튀어나옵니다.',
    '준철)',
    '(속마음)',
    '...이 씹새끼 진짜 죽여버릴까?',
    '[0초 / 00:00 ~ 00:00]',
    '',
    '#32',
    '준철의 옆에 선 아이얀이',
    '정면을 바라보며 주인장에게',
    '따지는 장면입니다.',
    '아이얀)',
    '아무리 세상물정 모르는 야만인이라고 해도 그렇지',
    '[0초 / 00:00 ~ 00:00]',
    '',
    '#33',
    '아이얀이 준철을 바라보며 윙크를 날립니다.',
    '[0초 / 00:00 ~ 00:00]'
  ].join('\n'));

  assert.strictEqual(scenes.length, 3);
  assert.strictEqual(scenes[0].sceneNo, '31');
  assert.match(scenes[0].description, /화가 난 준철/);
  assert.match(scenes[1].description, /따지는 장면입니다/);
  assert.strictEqual(scenes[2].sceneNo, '33');
}

function testDraftTags() {
  const draft = generateDraftTags('A girl stands alone in a rainy city street at night and smiles.');
  assert.ok(draft.tags.includes('1girl'));
  assert.ok(draft.tags.includes('solo'));
  assert.ok(draft.tags.includes('rain'));
  assert.ok(draft.tags.includes('city street'));
  assert.ok(draft.tags.includes('night'));
  assert.ok(draft.negativeTags.includes('bad anatomy'));
  assert.strictEqual(draft.tags.includes('best quality'), false);
  assert.strictEqual(draft.tags.includes('amazing quality'), false);
}

function testKoreanActionCameraTags() {
  const draft = generateDraftTags([
    '준철이 시장 길거리를 걷자',
    '주변에 있던 여자들이 준철을 보며',
    '수근거리는 장면입니다.',
    '',
    '여자들의 얼굴엔 하나같이 홍조가',
    '띄워져 있습니다.',
    '',
    '코 ~ 명치 아래까지 보이는 측면 바스트 숏',
    '여자들)',
    '웅성웅성웅성~'
  ].join('\n'));

  assert.ok(draft.tags.includes('1boy'));
  assert.ok(draft.tags.includes('multiple girls'));
  assert.ok(draft.tags.includes('walking'));
  assert.ok(draft.tags.includes('blush'));
  assert.ok(draft.tags.includes('whispering'));
  assert.ok(draft.tags.includes('side view'));
  assert.ok(draft.tags.includes('bust shot'));
  assert.ok(draft.tags.includes('upper body'));
  assert.ok(draft.tags.includes('market street'));
}

function testGuideTagOrderingAndExpandedCues() {
  const ordered = orderPromptTags(['blush', 'market_street', '1boy', 'walking', 'side view']);
  assert.deepStrictEqual(ordered, ['1boy', 'side view', 'market street', 'walking', 'blush']);

  const weightedOrdered = orderPromptTags(['blush', '1.5::looking back::', '-1::breast focus::', '1girl']);
  assert.deepStrictEqual(weightedOrdered, ['1girl', '1.5::looking back::', 'blush', '-1::breast focus::']);

  const draft = generateDraftTags([
    '화가 난 준철이 정면을 응시합니다.',
    '아이얀이 준철을 바라보며 윙크를 날립니다.',
    '주인장은 히익 하고 무서워하며 떱니다.',
    '아이얀이 주인장에게 어깨동무를 합니다.',
    '준철이 얼굴을 들이밀어 노려봅니다.'
  ].join('\n'));

  assert.ok(draft.tags.includes('1boy'));
  assert.ok(draft.tags.includes('looking at viewer'));
  assert.ok(draft.tags.includes('angry'));
  assert.ok(draft.tags.includes('wink'));
  assert.ok(draft.tags.includes('scared'));
  assert.ok(draft.tags.includes('arms around shoulders'));
  assert.ok(draft.tags.includes('leaning forward'));
  assert.ok(draft.tags.includes('glaring'));
}

function testRenaSachonDraftTags() {
  const draft = generateDraftTags([
    '\uC5EC\uC790\uAC00 \uC804\uD654\uAE30 \uB4E4\uACE0 \uAC77\uB294 \uC911. \uAC00\uC2B4 \uBD80\uAC01\uB418\uAC8C FROM BELOW.',
    '\uB4A4\uB3CC\uC544\uBCF4\uB294 \uC790\uC138\uB85C \uD654\uBA74 \uBC14\uB77C\uBCF4\uAE30.',
    '\uC548\uB155 \uC190 / \uC190 \uB4A4\uB85C \uAF2C\uACE0 / \uBA38\uB9AC\uCE74\uB77D \uB118\uAE30\uAE30.',
    '\uB0A8\uC790 \uC2DC\uC810, \uC190 \uC7A1\uACE0 \uC788\uB294 \uC0C1\uD0DC, FROM ABOVE.',
    '\uBC25\uC0C1(table)\uC5D0 \uAE30\uB300\uC11C \uC220 \uB9C8\uC2DC\uB294 \uC0C1\uD0DC, from side.',
    '\uCE68\uB300\uC5D0 \uB204\uC6B4 \uC0C1\uD0DC, \uCDE8\uD574\uC11C \uD64D\uC870, \uBD80\uB044\uB7EC\uC6B4\uB4EF \uBAB8\uC744 \uAC00\uB9AC\uB294 \uD3EC\uC988.'
  ].join('\n'));

  [
    '1girl',
    '1boy',
    'from below',
    'from above',
    'from side',
    'pov',
    'looking at viewer',
    'looking back',
    'holding phone',
    'waving',
    'hands behind back',
    'hair flip',
    'holding hands',
    'breast focus',
    'table',
    'drinking',
    'bed',
    'lying',
    'drunk',
    'embarrassed',
    'covering self'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testCustomTagDictionaryRules() {
  const rules = parseTagDictionary([
    '■ 얼굴 - 감정',
    '└ 윙크 : ;d',
    '앞에서 : straight-on',
    '몸을 약간 : leaning forward'
  ].join('\n'));

  assert.strictEqual(rules.length, 3);
  assert.ok(rules.some((rule) => rule.label === '윙크' && rule.tags.includes(';d')));

  const applied = applyCustomTagRules('아이얀이 준철을 바라보며 윙크를 날립니다.', rules);
  assert.ok(applied.tags.includes('wink'));
  assert.ok(applied.tags.includes('one eye closed'));
  assert.ok(applied.tags.includes('looking at another'));
  assert.ok(applied.tags.includes(';d'));
}

function testMockGeneration() {
  const project = createEmptyProject();
  const scene = {
    id: 'scene-1-001',
    sceneNo: '1',
    prompt: '1girl, solo',
    negativePrompt: 'bad anatomy',
    basePrompt: 'beautiful background',
    baseNegativePrompt: 'low quality',
    characterPromptsText: '1girl, solo',
    characterNegativePromptsText: 'bad anatomy',
    status: 'prompt_approved',
    updatedAt: new Date().toISOString()
  };

  project.scenes.push(scene);
  const settings = {
    ...defaultGenerationSettings,
    model: 'nai-diffusion-4-5-full',
    width: 1280,
    height: 768,
    steps: 28,
    scale: 6.8,
    sampler: 'Euler Ancestral',
    cfgRescale: 0.5,
    noiseSchedule: 'karras'
  };
  const nextProject = createMockGeneration(project, scene, 'C:/tmp/mock.svg', 'file:///C:/tmp/mock.svg', settings);

  assert.strictEqual(nextProject.scenes[0].status, 'generated');
  assert.strictEqual(nextProject.generationJobs.length, 1);
  assert.strictEqual(nextProject.images.length, 1);
  assert.strictEqual(nextProject.images[0].sceneId, scene.id);
  assert.strictEqual(nextProject.images[0].metadata.prompt, scene.prompt);
  assert.strictEqual(nextProject.images[0].metadata.basePrompt, scene.basePrompt);
  assert.strictEqual(nextProject.images[0].metadata.characterPromptsText, scene.characterPromptsText);
  assert.strictEqual(nextProject.images[0].metadata.model, settings.model);
  assert.strictEqual(nextProject.images[0].metadata.width, settings.width);
  assert.strictEqual(nextProject.generationJobs[0].request.settings.scale, settings.scale);
  assert.strictEqual(nextProject.generationJobs[0].request.settings.cfgRescale, settings.cfgRescale);
  assert.strictEqual(nextProject.generationJobs[0].request.settings.noiseSchedule, settings.noiseSchedule);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(nextProject.settings, 'apiKey'), false);
}

function testFailedGeneration() {
  const project = createEmptyProject();
  const scene = {
    id: 'scene-2-001',
    sceneNo: '2',
    prompt: '1boy',
    negativePrompt: 'bad anatomy',
    basePrompt: 'classroom',
    baseNegativePrompt: 'lowres',
    characterPromptsText: '1boy',
    characterNegativePromptsText: 'bad anatomy',
    status: 'prompt_approved',
    updatedAt: new Date().toISOString()
  };

  project.scenes.push(scene);
  const nextProject = createFailedGenerationRecord(project, scene, 'network failed', project.settings, 'novelai');

  assert.strictEqual(nextProject.scenes[0].status, 'failed');
  assert.strictEqual(nextProject.generationJobs.length, 1);
  assert.strictEqual(nextProject.generationJobs[0].status, 'failed');
  assert.match(nextProject.generationJobs[0].error, /network failed/);
}

testSceneParser();
testParserWarnings();
testSubsceneParser();
testLegacySubsceneNormalization();
testKoreanHashSceneParser();
testDraftTags();
testKoreanActionCameraTags();
testGuideTagOrderingAndExpandedCues();
testRenaSachonDraftTags();
testCustomTagDictionaryRules();
testMockGeneration();
testFailedGeneration();

console.log('core tests passed');
