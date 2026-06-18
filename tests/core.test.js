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
  normalizeTagAssignments,
  splitTagsByTarget,
  splitWildcardPromptsByTarget,
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
  assert.strictEqual(draft.tags.includes('1girl'), false);
  assert.ok(draft.tags.includes('solo'));
  assert.strictEqual(draft.tags.includes('rain'), false);
  assert.strictEqual(draft.tags.includes('city street'), false);
  assert.strictEqual(generateDraftTags('A girl stands indoors.').tags.includes('indoors'), false);
  assert.ok(draft.tags.includes('night'));
  assert.deepStrictEqual(draft.negativeTags, []);
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

  assert.strictEqual(draft.tags.includes('1boy'), false);
  assert.ok(draft.tags.includes('multiple girls'));
  assert.ok(draft.tags.includes('walking'));
  assert.ok(draft.tags.includes('blush'));
  assert.ok(draft.tags.includes('whispering'));
  assert.ok(draft.tags.includes('from side'));
  assert.ok(draft.tags.includes('bust shot'));
  assert.ok(draft.tags.includes('upper body'));
  assert.ok(draft.tags.includes('market street'));
}

function testGuideTagOrderingAndExpandedCues() {
  const ordered = orderPromptTags(['blush', 'market_street', '1boy', 'walking', 'from side']);
  assert.deepStrictEqual(ordered, ['1boy', 'from side', 'market street', 'walking', 'blush']);

  const weightedOrdered = orderPromptTags(['blush', '1.5::looking back::', '-1::breasts::', '1girl']);
  assert.deepStrictEqual(weightedOrdered, ['1girl', '1.5::looking back::', 'blush', '-1::breasts::']);

  const draft = generateDraftTags([
    '화가 난 준철이 정면을 응시합니다.',
    '아이얀이 준철을 바라보며 윙크를 날립니다.',
    '주인장은 히익 하고 무서워하며 떱니다.',
    '아이얀이 주인장에게 어깨동무를 합니다.',
    '준철이 얼굴을 들이밀어 노려봅니다.'
  ].join('\n'));

  assert.strictEqual(draft.tags.includes('1boy'), false);
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

function testRenaSachonNsfwDraftTags() {
  const pussyFocusDraft = generateDraftTags([
    '\uB0A8\uC790\uAC00 \uAC00\uC2B4 \uBE68\uBA74\uC11C \uC5EC\uC790 \uBCF4\uC9C0 \uB9CC\uC9C0\uACE0 \uC788\uB294 \uC0F7',
    'PUSSY FOCUS',
    '\uC5EC\uC790 \uB2E4\uB9AC \uBC8C\uB9B0 \uC0C1\uD0DC',
    '\uC190\uAC00\uB77D\uC774 \uD551\uAC70\uB9C1\uC911 FROM ABOVE'
  ].join('\n'));

  [
    'pussy focus',
    'fingering',
    'breast sucking',
    'spread legs'
  ].forEach((tag) => {
    assert.ok(pussyFocusDraft.tags.includes(tag), `Expected ${tag} in ${pussyFocusDraft.tags.join(', ')}`);
  });

  const positionDraft = generateDraftTags([
    '\uD6C4\uBC30\uC704 \uB4A4\uB85C \uBC15\uAE30 / \uD314 \uB4A4\uB85C \uBD99\uC7A1\uD78C',
    '\uAD50\uBC30\uD504\uB808\uC2A4 PUSSY FOCUS',
    '\uC815\uC561\uC774 \uC544\uB798\uB85C \uD750\uB974\uB294 \uC7A5\uBA74'
  ].join('\n'));

  [
    'pussy penetration',
    'doggystyle',
    'from behind',
    'restrained',
    'mating press',
    'missionary',
    'cum',
    'cumdrip'
  ].forEach((tag) => {
    assert.ok(positionDraft.tags.includes(tag), `Expected ${tag} in ${positionDraft.tags.join(', ')}`);
  });
}

function testFocusCompositionDraftTags() {
  const draft = generateDraftTags([
    '확대 / 1인칭 / 다중 시점 / 정면에서 / 등 뒤에서',
    '45도 / 대각선 / 거꾸로 / 위에서 - 더 높이 / 밑에서',
    '옆에서 / 옆에서 - 완전히 옆 / 옆에서 - 한쪽 얼굴만 보임 / 뒤에서',
    '1인칭 - 손 / 1인칭 - 출입문 / 백합 소용돌이',
    '엿보기 - 가슴 / 엿보기 - 팬티'
  ].join('\n'));

  [
    'pov',
    'multiple views',
    'straight-on',
    'facing away',
    'three quarter view',
    'dutch angle',
    'upside-down',
    'from above',
    'high up',
    'from below',
    'from side',
    'facing to the side',
    'profile',
    'from behind',
    'pov hands',
    'pov doorway',
    'rotational symmetry',
    'downblouse',
    'downpants'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testEmbraceAndSexCompositionDraftTags() {
  const draft = generateDraftTags([
    '\uC5EC\uC790\uAC00 \uB0A8\uC790 \uC640\uB77D \uB04C\uC5B4\uC548\uC740 \uBAA8\uC2B5, \uB0A8\uC790 \uAC00\uC2B4\uD31D\uB9CC \uBCF4\uC5EC\uB3C4 \uB429\uB2C8\uB2E4.',
    '\uC0AC\uC774\uB4DC \uD0A4\uC2A4, \uC5BC\uAD74 \uD074\uB85C\uC988\uC5C5.',
    '\uB300\uB538 \uD074\uB85C\uC988\uC5C5, \uD314\uC774\uB791 \uD398\uB2C8\uC2A4\uB9CC \uB098\uC640\uB3C4 \uAD1C\uCC2E\uC544\uC694.',
    '\uC5EC\uC790\uAC00 \uB0A8\uC790 \uADC0\uC5D0 \uB300\uACE0 \uB9D0\uD558\uB294 \uC0C1\uD0DC, \uB0A8\uC790 \uB4B7\uD1B5\uC218\uB9CC \uBCF4\uC774\uAC8C.',
    '\uBD84\uD560\uCEF7, \uC5EC\uC790\uB294 \uADF8 \uC704\uC5D0 \uD0C0\uC788\uACE0 \uC624\uB978\uCABD\uC5D0 \uB300\uB538\uD558\uACE0 \uC788\uB294 \uC190.',
    '\uC5EC\uC790 \uBAB8 \uB2E4 \uBCF4\uC774\uAC8C.',
    '\uC5EC\uC790\uAC00 \uD074\uB9AC \uC790\uADF9\uD558\uBA74\uC11C \uC720\uD639\uD558\uB294 \uD3EC\uC988.',
    '\uD6C4\uBC30\uC704, \uC5EC\uC790\uB294 \uB124 \uBC1C \uAE30\uAE30 \uC790\uC138, \uB4A4\uB3CC\uC544\uBCF4\uBA74\uC11C \uB9D0\uD558\uAE30, \uC5C9\uB369\uC774 \uC798 \uBCF4\uC774\uAC8C.'
  ].join('\n'));

  [
    'hug',
    'male torso',
    'kissing',
    'from side',
    'hand job',
    'hands on penis',
    'penis',
    'whispering',
    'whisper to ear',
    'from behind',
    'multiple views',
    'full body',
    'straddling',
    'girl on top',
    'clitoris',
    'seductive',
    'doggystyle',
    'all fours',
    'looking back',
    'ass focus'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['close-up', 'breast focus', 'looking at another'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testSecondSequenceCompositionDraftTags() {
  const draft = generateDraftTags([
    '\uB450 \uC190 \uC7A1\uACE0 \uD6C4\uBC30\uC704 \uD53C\uC2A4\uD1A4, \uBA38\uB9AC \uD754\uB4E4\uB9AC\uB294 \uAC83\uC774 \uBCF4\uC774\uAC8C, from below.',
    '\uD6C4\uBC30\uC704 \uC0C1\uD0DC\uC5D0\uC11C \uAF2C\uB9AC \uC7A1\uACE0 \uC0AC\uC774\uB4DC\uBDF0, \uC2DC\uC624\uD6C4\uD0A4 \uB098\uC62C \uB54C \uACE0\uAC1C \uC816\uD788\uAE30.',
    '\uD654\uBA74\uC0C1 \uB300\uAC01\uC120\uC73C\uB85C \uC704\uCE58, \uB4A4\uB3CC\uC544 \uC788\uB294 \uC0C1\uD0DC, \uAF2C\uB9AC \uD30C\uB974\uB974.',
    '\uC5EC\uC790\uAC00 \uB0A8\uC790\uD55C\uD14C \uC644\uC804\uD788 \uC548\uACA8\uC788\uACE0 \uC5B4\uAE68\uC5D0 \uC190 \uB450\uB974\uAE30, \uB0A8\uC790\uB294 \uC5EC\uC790 \uC5C9\uB369\uC774 \uC704\uC5D0 \uC190.',
    '\uB0A8\uC790\uB294 \uC695\uC870 \uC548\uC5D0 \uC788\uACE0 \uC5EC\uC790\uAC00 \uD654\uC7A5\uC2E4 \uBB38 \uC5F4\uBA74 \uB124\uBC1C\uAE30\uAE30 \uC790\uC138\uB85C \uBB34\uB98E\uAFC7\uACE0 \uC788\uB294 \uC0C1\uD0DC.',
    '\uB0A8\uC790 \uADC0 \uAC00\uAE4C\uC774 \uC5EC\uC790 \uD0B9\uD0B9.',
    '\uBA38\uB9AC \uB9DE\uB300\uACE0 \uC548\uACA8\uC788\uB294 \uAD50\uAC10\uD3EC\uC988.',
    'from above, \uD398\uB2C8\uC2A4\uB9CC \uBCF4\uC774\uAC8C \uD30C\uC774\uC988\uB9AC.',
    '\uC816\uAF2D\uC9C0 \uB9CC\uC9C0\uAE30, \uC720\uB450 \uAD34\uB86D.',
    '\uAC00\uC2B4\uC5D0 \uC815\uC561 \uBAA8\uC5EC\uC788\uB294 \uC0C1\uD0DC, \uAC00\uC2B4 \uC2A4\uC2A4\uB85C \uC7A1\uACE0 \uD754\uB4E4\uC5B4\uC694, from below.',
    '\uB0A8\uC790 \uB204\uC6CC\uC788\uACE0 \uC5EC\uC790\uAC00 \uC0C1\uCCB4 \uC219\uC774\uACE0 \uC5C9\uB369\uC774 \uB4E4\uACE0 \uC788\uB294 \uC0C1\uD0DC, \uAE30\uC2B9\uC704.',
    '\uD654\uBA74\uC73C\uB85C \uD314\uC744 \uBED7\uC740 \uC0C1\uD0DC, \uAE30\uC2B9\uC704 \uB0A8\uC790 \uC2DC\uC810.',
    '\uB300\uBA74\uC88C\uC704, \uD0A4\uC2A4, \uC11C\uB85C \uB9C8\uC8FC\uBCF4\uACE0 \uC788\uB294 \uC0C1\uD0DC.',
    '\uC5EC\uC790 \uD314\uC744 \uB0A8\uC790 \uBAA9 \uC8FC\uBCC0\uBD80\uB97C \uB450\uB974\uACE0, \uB0A8\uC790 \uC591 \uC190\uC740 \uC5EC\uC131\uC758 \uD5C8\uBC85\uC9C0\uC5D0 \uB450\uACE0 \uBC1C\uADF8\uB808.'
  ].join('\n'));

  [
    'holding hands',
    'doggystyle',
    'head shaking',
    'tail',
    'tail grab',
    'tail wagging',
    'female ejaculation',
    'head tilt',
    'dutch angle',
    'hug',
    'arms around shoulders',
    'hand on another\'s ass',
    'bathroom',
    'bathtub',
    'open door',
    'all fours',
    'kneeling',
    'ear',
    'smelling',
    'forehead-to-forehead',
    'paizuri',
    'penis',
    'hands on breasts',
    'breast press',
    'nipple flick',
    'hand on nipple',
    'cum on breasts',
    'breast grab',
    'cowgirl position',
    'reaching towards viewer',
    'pov',
    'sitting on lap',
    'upright straddle',
    'facing another',
    'arms around neck',
    'hand on thigh',
    'thighs'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  assert.strictEqual(draft.tags.includes('explicit'), false);
}

function testHeartDeliveryServiceDraftTags() {
  const draft = generateDraftTags([
    '\uC5F4\uB9B0 \uBB38, \uD604\uAD00\uC5D0 \uC11C\uC788\uB294 \uC5EC\uC790, \uBC14\uAE65\uD48D\uACBD, \uBB38 \uBC16\uC5D0\uC11C \uBB34\uD45C\uC815\uD558\uAC8C \uC11C \uC788\uB294 \uC5EC\uC790.',
    '\uBB34\uB98E\uAFC7\uACE0 \uBC29\uC11D\uC5D0 \uC549\uC544\uC788\uB294 \uC0C1\uD0DC, \uC606\uC5D0 \uC11C\uB958\uAC00\uBC29, \uC885\uC774\uBB49\uCE58 \uB4E4\uACE0 \uC788\uC5B4\uC694, \uC885\uC774 \uBC14\uB77C\uBCF4\uB294 \uC911, \uB0A8\uC790 \uC2DC\uC810.',
    '\uC885\uC774 \uB4E4\uACE0\uC788\uAE30, \uD654\uBA74 \uBC14\uB77C\uBCF4\uAE30, \uBC18\uCE21\uBA74, \uD5C8\uBC85\uC9C0 \uC704\uC8FC\uB85C \uBCF4\uC774\uAC8C \uC544\uB798\uC5D0\uC11C \uC62C\uB824\uB2E4\uBCF8 below.',
    '\uC704\uC5D0\uC11C \uBC14\uB77C\uBCF8 \uB098\uCCB4, \uBB34\uB98E \uAFC7\uACE0 \uBC29\uC11D\uC5D0 \uC549\uC544\uC788\uC74C.',
    '\uAC00\uC2B4 \uD074\uB85C\uC988\uC5C5, \uC5BC\uAD74 \uB098\uC62C \uD544\uC694\uC5C6\uC774 \uAC00\uC2B4\uB9CC.',
    '\uB0A8\uC790 \uD558\uCCB4\uB9CC \uBC97\uACA8\uB193\uC740 \uC0C1\uD0DC, \uC5EC\uC790\uB294 \uB098\uCCB4.',
    '\uC5EC\uC790 \uB4A4\uC5D0\uC11C \uBC14\uB77C\uBCF4\uB294 \uAC01\uB3C4, \uB300\uB538\uC911.',
    '\uB300\uB538, \uC704\uC5D0\uC11C \uBCF8 \uAC01\uB3C4, \uADC0 \uADFC\uCC98\uC5D0\uC11C \uC774\uC5B4\uB9AC\uD0B9.',
    '\uBC18\uCE21\uBA74 \uC704\uCE58, \uC5EC\uC790\uAC00 \uB0A8\uC790\uD55C\uD14C \uAE30\uB300\uC11C \uB300\uB538, \uADC0 \uADFC\uCC98\uC5D0\uC11C \uB300\uD654.',
    '\uB0A8\uC790\uAC00 \uC5EC\uC790 \uBAB8 \uC774\uACF3\uC800\uACF3 \uBE60\uB294\uC911, \uAC00\uC2B4 \uC704\uC8FC, \uB364\uB364\uD558\uAC8C \uBC1B\uC544\uB4E4\uC774\uB294 \uB290\uB08C.',
    '\uC5EC\uC790 \uD558\uCCB4 \uD074\uB85C\uC988\uC5C5, \uB0A8\uC790 \uC190\uAC00\uB77D\uC73C\uB85C \uD551\uAC70\uB9C1.'
  ].join('\n'));

  [
    'open door',
    'entrance',
    'doorway',
    'outdoors',
    'standing',
    'expressionless',
    'kneeling',
    'sitting',
    'cushion',
    'briefcase',
    'paper',
    'document',
    'holding paper',
    'pov',
    'looking at viewer',
    'three quarter view',
    'thighs',
    'from below',
    'from above',
    'nude',
    'face out of frame',
    'lower body',
    'bottomless',
    'partially undressed',
    'from behind',
    'hand job',
    'hands on penis',
    'ear licking',
    'licking',
    'leaning on person',
    'whispering',
    'whisper to ear',
    'breast sucking',
    'fingering'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  assert.strictEqual(draft.tags.includes('explicit'), false);
}

function testPastedSceneDescriptionRuleTags() {
  const draft = generateDraftTags([
    'male POV with penis corner, male POV with arm corner, hand foreground.',
    'front camera shot, camera-aware shot, public filming on stage with background crowd.',
    'female reaction focus and close reaction shot.',
    'anal plug, deepthroat, armpit, spanking.',
    '\uB300\uB538 \uC2DC\uC791, \uC2A4\uB9C8\uD0C0, \uB124 \uBC1C \uC790\uC138.'
  ].join('\n'));

  [
    'penis',
    'pov hands',
    'straight-on',
    'looking at viewer',
    'stage',
    'background crowd',
    'pleasure face',
    'anal plug',
    'fellatio',
    'deepthroat',
    'armpits',
    'spanking',
    'hand job',
    'hands on penis',
    'grinding',
    'penis on pussy',
    'all fours'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['pov', 'disembodied penis', 'face focus', 'talking'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });

  const nippleDraft = generateDraftTags('\uC816\uAF2D\uC9C0 \uAF2C\uC9D1\uAE30, \uD30C\uC774\uC988\uB9AC');
  [
    'pinching nipple',
    'hands on breasts',
    'breast press',
    'paizuri'
  ].forEach((tag) => {
    assert.ok(nippleDraft.tags.includes(tag), `Expected ${tag} in ${nippleDraft.tags.join(', ')}`);
  });

  const assignments = normalizeTagAssignments({}, nippleDraft.tags);
  assert.strictEqual(assignments['pinching nipple'], 'character-1');
  assert.strictEqual(assignments['hands on breasts'], 'character-1');
}

function testWorkplaceShopIntroDraftTags() {
  const draft = generateDraftTags([
    '\uD68C\uC0AC \uC804\uACBD \uBAA8\uC2B5.',
    '\uD558\uB9B0\uC774 \uC778\uC0AC\uD558\uACE0 \uC788\uACE0 \uC815\uD601\uC774 \uC0AC\uBB34\uC2E4 \uC758\uC790\uC5D0 \uC549\uC544 \uB4A4\uB3CC\uC544 \uBCF4\uB294 \uBAA8\uC2B5.',
    '\uC0C1\uC790\uB4E4, wide shot, \uB458\uB2E4 \uCABC\uAD6C\uB824 \uC549\uC544\uC11C \uC0C1\uC790\uB97C \uC815\uB9AC\uC911.',
    '\uB07C\uBD80\uB9AC\uB4EF \uBBF8\uC18C, \uB0A8\uC790\uC758 \uC606\uBAA8\uC2B5(faceless,profile), \uD55C\uC190\uAC00\uB77D\uC744 \uD53C\uACE0 \uC720\uD639\uC801\uC778 \uB208\uBE5B, \uAC00\uC2B4\uC704\uB85C\uB9CC \uBCF4\uC774\uB294 \uC0F7.',
    '\uBCFC\uBC1C\uADF8\uB808, \uC190 \uD558\uB098\uB97C \uC790\uAE30 \uC785\uAC00\uC5D0 \uB300\uACE0 \uC55E\uC73C\uB85C \uBAB8\uC744 \uB0A8\uC131 \uCABD\uC73C\uB85C \uAE30\uC6B8\uC5EC\uC788\uB2E4.',
    '\uBC14\uC9C0 \uBC11\uC73C\uB85C \uBC1C\uAE30, \uC790\uC9C0\uBD80\uBD84\uC744 \uB36E\uC369 \uC6C0\uCF1C\uC950\uACE0, \uBC14\uC9C0\uB97C \uB0B4\uB824 \uB0A8\uC131\uC740 penis only, \uD070 \uC790\uC9C0\uC5D0 \uB180\uB780\uB2E4.'
  ].join('\n'));

  [
    'wide shot',
    'sitting',
    'office chair',
    'looking back',
    'bowing',
    'squatting',
    'box',
    'cardboard box',
    'from side',
    'profile',
    'faceless',
    'index finger raised',
    'pointing',
    'seductive',
    'bust shot',
    'upper body',
    'blush',
    'finger to mouth',
    'leaning forward',
    'clothed erection',
    'erection',
    'hand on penis',
    'hands on penis',
    'groping',
    'undressing',
    'open fly',
    'disembodied penis',
    'large penis',
    'penis',
    'surprised'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['indoors', 'city street', 'talking', 'face focus'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testFellatioTransitionDraftTags() {
  const draft = generateDraftTags([
    '구도 : 펠라 하는 모습 pov , from above.',
    '(딥쓰롯) 목구멍 깊숙이 삼키는 모습, 못 견디고 뱉어내고 숨고르는 모습.',
    '하린의 머리를 붙잡고 입에 자X를 쑤셔넣는 모습, 미친듯이 빠른 펠라소리.',
    'leg frame, from below, worm\'s eye view, testicles, 여자 faceless, 펠라치오.',
    '정혁이 하린의 입에서 자X를 뽑고 하린을 그대로 눕힌채 정상위로 박는다.',
    '다리를 접은채 밀어 눕혀진 여성, 옆으로 넘어진 상태.',
    '촬영용 배드(메트리스)에 눕힌채 바지와 팬티를 벗기는 모습.'
  ].join('\n'));

  [
    'pov',
    'from above',
    'fellatio',
    'penis',
    'deepthroat',
    'gagging',
    'open mouth',
    'panting',
    'head grab',
    'leg frame',
    'from below',
    "worm's eye view",
    'testicles',
    'faceless',
    'lying',
    'missionary',
    'pussy penetration',
    'folded legs',
    'from side',
    'bed',
    'mattress',
    'undressing',
    'bottomless',
    'panty pull'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['city street', 'rain', 'indoors', 'talking', 'face focus'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testMissionaryIntensificationDraftTags() {
  const draft = generateDraftTags([
    '설레어하며 독백하는 하린, face focus, face only, blush, flush, saliva, looking down, profile.',
    '정상위로 박아대는 모습, mating press, hands on ass, 남자는 hands on floor, 여자 open mouth, closed eyes, painful.',
    '정혁의 엉덩이를 하린이 꽈악 끌어당기며 박아대는 모습, underbody only, hands on ass, 남자 3::back view::.',
    '하얀 매트리스에 누워있고 격렬한 피스톤에 반쯤 가버린 하린, solo, saliva, half-closed eyes, upperbody only.',
    '하얀 매트리스에 누워있음, matingpress 자세, 누워있는걸 머리쪽에서 본 모습, penetration focus.',
    '활처럼 허릴 휘며 고개가 뒤로 젖혀진채, 남자 hand on metress, from side, profile, 여자 chin up, head back, open mouth, saliva.',
    '시오후키하며 덜덜 떠는 하린, upside-down, 남자 하얀 메트리스 위에 무릎 꿇고 있음, ahegao, rolling eyes.',
    '여성은 매트리스에 반쯤 누워있고 왼쪽에는 남성의 penis only, 여성은 penis를 바라보며 입맛 다신다.',
    '상의와 속옷을 벗는 하린, 상의 벗고 브라까지 벗는 모습.',
    '정혁을 눕히고 그 위로 쪼그려앉듯이 올라타는 자세.'
  ].join('\n'));

  [
    'face only',
    'blush',
    'flushed face',
    'saliva',
    'looking down',
    'from side',
    'profile',
    'missionary',
    'mating press',
    'hands on ass',
    'hand on another\'s ass',
    'hands on floor',
    'open mouth',
    'closed eyes',
    'painful',
    'grimace',
    'underbody only',
    'lower body',
    'from behind',
    'mattress',
    'lying',
    'solo',
    'half-closed eyes',
    'upper body only',
    'upper body',
    'penetration focus',
    'pussy penetration',
    'penis focus',
    'arched back',
    'head back',
    'chin up',
    'hands on mattress',
    'upside-down',
    'kneeling',
    'ahegao',
    'rolling eyes',
    'disembodied penis',
    'penis',
    'licking lips',
    'tongue',
    'undressing',
    'topless',
    'bra',
    'squatting',
    'straddling',
    'girl on top'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['face focus', 'talking', 'indoors'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testSuppressedGenericBodyAndPenetrationTags() {
  const draft = generateDraftTags([
    '가슴, 엉덩이, 보지, 삽입, 피스톤, cropped face, cropped body, 하체만 보이게.',
    'pussy penetration, vaginal, pussy, breasts, ass, cropped torso.'
  ].join('\n'));

  [
    'breasts',
    'ass',
    'vaginal',
    'pussy',
    'cropped face',
    'cropped torso',
    'cropped body',
    'croped face',
    'croped body'
  ].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });

  assert.ok(draft.tags.includes('pussy penetration'), `Expected pussy penetration in ${draft.tags.join(', ')}`);
}

function testBroadcastGroupNsfwDraftTags() {
  const draft = generateDraftTags([
    '\uC2DC\uCCAD\uC790 \uC5EC\uB7EC\uBD84, \uC790\uC704\uC911\uC778 \uB0A8\uC790\uB4E4 \uAC00\uC6B4\uB370\uC5D0 \uC549\uC740 \uC218\uC544, \uD5C8\uBC85\uC9C0\uC0F7.',
    '\uC5BC\uAD74\uC5D0 \uC790\uC9C0 \uBE44\uBE44\uB294 \uC18C\uB9AC, \uC591 \uC606, \uB4A4\uC5D0 \uB0A8\uC790 \uD398\uB2C8\uC2A4, \uD558\uCCB4\uB9CC \uBCF4\uC774\uAC8C, \uD398\uB2C8\uC2A4 \uC950\uACE0 \uB300\uB538.',
    '\uD5C8\uB9AC\uB97C \uC219\uC774\uACE0 \uB450 \uC190\uC73C\uB85C \uAC01\uAC01 \uB2E4\uB978 \uB0A8\uC790 \uB300\uB538, \uC5C9\uB369\uC774 \uC7A1\uC544 \uBC8C\uB9AC\uACE0, \uBE44\uC5B4\uC788\uB294 \uD654\uBA74 \uACF5\uAC04\uC5D0\uC11C \uC790\uC704\uC911\uC778 \uB0A8\uC790\uB4E4.',
    '\uBC18\uCE21\uBA74\uBDF0, \uC544\uB798\uC5D0\uC11C, \uB4A4\uC5D0\uC11C \uBC15\uACE0 \uC591\uC190\uC5D0 \uB300\uB538\uC911, worm\'s eye view, leg frame.',
    '\uD3A0\uB77C POV, \uB4A4\uC5D0 \uB0A8\uC790 \uC880 \uBCF4\uC774\uAC8C, \uD53C\uC2A4\uD1A4, \uB300\uB538 \uC18C\uB9AC \uCD5C\uACE0 \uC18D\uB3C4.',
    '\uC9C8\uB0B4 \uC0AC\uC815 \uC52C, \uC785 \uC0AC\uC815\uC52C, \uB300\uB538 \uC0AC\uC815 \uC52C, \uC0AC\uC815\uC74C, \uC815\uC561 \uC0BC\uD0A4\uB294 \uC18C\uB9AC.',
    'PUSSY FOCUS, \uC218\uC544\uB9CC \uB098\uC624\uAC8C, \uC0C1\uCCB4\uB97C \uBC18\uB9CC \uC77C\uC73C\uD0A8 \uC0C1\uD0DC, \uC785\uC5D0 \uCE68 \uD750\uB974\uAC8C, \uBC30\uACBD\uC5D0 \uB0A8\uC790\uB4E4.',
    '\uD750\uD2B8\uB7EC\uC9C4 \uBAA8\uC2B5, M\uC790\uB85C \uC549\uC740 \uC0C1\uD0DC, \uC815\uBA74, \uB9C8\uC774\uD06C \uB4E4\uACE0 \uD798\uACB9\uAC8C \uB9AC\uD3EC\uD305, \uB4A4\uC5D0 \uB098\uCCB4 \uB0A8\uC790\uB4E4 \uC11C \uC788\uC5B4\uC694.'
  ].join('\n'));

  [
    'looking at viewer',
    'multiple boys',
    'background men',
    'male masturbation',
    'cowboy shot',
    'thighs',
    'penis on face',
    'multiple penises',
    'lower body',
    'penis',
    'hand job',
    'hands on penis',
    'double handjob',
    'bent over',
    'from side',
    'three quarter view',
    'from below',
    "worm's eye view",
    'leg frame',
    'doggystyle',
    'from behind',
    'pussy penetration',
    'spread ass',
    'hands on ass',
    'fellatio',
    'pov',
    'cum',
    'cum in mouth',
    'creampie',
    'swallowing',
    'pussy focus',
    'sitting',
    'upper body',
    'saliva',
    'disheveled',
    'messy hair',
    'm legs',
    'microphone',
    'nude',
    'standing'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  [
    'breasts',
    'ass',
    'vaginal',
    'pussy',
    'cropped face',
    'cropped torso',
    'cropped body',
    'face focus',
    'talking',
    'indoors'
  ].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testBackViewCowgirlDraftTags() {
  const draft = generateDraftTags([
    '\uB4B7\uBAA8\uC2B5, \uC5C9\uB369\uC774 \uC798 \uBCF4\uC774\uAC8C \uD5C8\uBC85\uC9C0\uAE4C\uC9C0, \uC5C9\uB369\uC774 \uC4F0\uB2E4\uB4EC\uAE30 \uC88B\uC740 \uD3EC\uC988, \uAC77\uAE30 \uC88B\uC740 \uC790\uC138.',
    '\uB204\uC6CC\uC788\uB294 \uB0A8\uC790 \uC2DC\uC810, \uC5EC\uC790\uAC00 \uD5C8\uB9AC \uC219\uC5EC\uC11C \uB0B4\uB824\uB2E4\uBD04.',
    '\uC0C1\uCCB4 \uC77C\uC73C\uD0A8 \uC0C1\uD0DC, \uAC00\uC2B4 \uBC11\uC5D0\uC11C \uC798 \uBCF4\uC774\uAC8C.',
    '\uB0A8\uC790 \uC704\uB85C \uC62C\uB77C\uD0C4 \uC0C1\uD0DC, \uAC00\uC2B4 \uBD80\uAC01, \uD314 \uD654\uBA74\uC73C\uB85C \uBED7\uC740 \uC0C1\uD0DC, \uB0A8\uC790\uC2DC\uC810 \uC0B4\uC9DD BELOW.',
    '\uBC18\uCE21\uBA74\uC73C\uB85C \uBC14\uB77C\uBCF8 \uAC01\uB3C4, \uD398\uB2C8\uC2A4 \uD3EC\uCEE4\uC2A4, \uC5EC\uC790 \uC5BC\uAD74 \uB2E4 \uC548\uB098\uC640\uB3C4 \uB3FC\uC694.',
    '\uD654\uBA74 \uAC00\uC6B4\uB370 \uD398\uB2C8\uC2A4, \uC5EC\uC790 \uB2E4\uB9AC \uBC8C\uB9AC\uACE0 \uB0A8\uC790 \uC704\uC5D0 \uC62C\uB77C\uD0C4 \uC0C1\uD0DC, FROM BELOW.',
    '\uB300\uB538 \uD074\uB85C\uC988\uC5C5, \uD398\uB2C8\uC2A4 \uD3EC\uCEE4\uC2A4.',
    '\uC0AC\uC774\uB4DC\uBDF0, \uC5EC\uC790 \uC62C\uB77C\uD0C4 \uC0C1\uD0DC, \uC190\uBC14\uB2E5\uC73C\uB85C \uADC0\uB450 \uC790\uADF9.',
    '\uBC18\uCE21\uBA74\uC73C\uB85C \uB0A8\uC790 \uC704\uC5D0 \uC62C\uB77C\uD0C0\uC788\uACE0 \uB300\uB538\uC0C1\uD0DC, \uC5EC\uC790\uAC00 \uC0B4\uC9DD \uB0B4\uB824\uB2E4\uBCF4\uB294 \uB290\uB08C, \uAC00\uC18C\uB86D\uB2E4\uB294 \uD45C\uC815.',
    '\uB300\uB538 \uBC1B\uB294 \uB0A8\uC790 \uBDF0, \uC5BC\uAD74 \uD3EC\uCEE4\uC2A4, \uAC00\uC2B4 \uC798 \uBCF4\uC774\uAC8C, \uC5EC\uC790\uB294 \uB0A8\uC790 \uC704\uC5D0 \uC5CE\uB4DC\uB9AC\uB4EF \uD5C8\uB9AC \uC219\uC778 \uC0C1\uD0DC.',
    '\uB300\uB538\uD558\uB294 \uC190\uC744 \uB0A8\uC790\uAC00 \uC190\uC73C\uB85C \uB9C9\uACE0 \uC788\uB294\uB370 \uADF8 \uC190\uC5D0 \uACB0\uD63C\uBC18\uC9C0, \uD131\uAE4C\uC9C0\uB9CC \uBCF4\uC774\uACE0 \uB208\uC740 \uC548\uBCF4\uC5EC.',
    '\uD600\uB85C \uD398\uB2C8\uC2A4 \uD565\uB294 \uC0C1\uD0DC, 69\uC790\uC138, \uC5EC\uC790 \uD398\uC774\uC2A4 + \uD398\uB2C8\uC2A4\uC5D0 \uD3EC\uCEE4\uC2A4, \uB0A8\uC790 \uB2E4\uB9AC \uC704\uC5D0 \uC190.',
    '\uB300\uAC01\uC120\uBDF0, \uB0A8\uC790 \uC704\uC5D0 \uC5CE\uB4DC\uB9B0 \uC0C1\uD0DC\uC5D0\uC11C \uD30C\uC774\uC988\uB9AC, \uC5EC\uC790 \uC2DC\uC120\uBC29\uD5A5 \uB4A4\uB85C.',
    '\uC0C1\uCCB4\uB9CC \uD0C8\uC758\uD55C \uC0C1\uD0DC\uC5D0\uC11C \uCE58\uB9C8 \uAC77\uACE0 \uD32C\uD2F0 \uC816\uD78C\uC0C1\uD0DC, \uC0BD\uC785 \uC804, \uD398\uB2C8\uC2A4\uB97C \uC5EC\uC790 \uC131\uAE30\uC5D0 \uBE44\uBE44\uC801, \uC5C9\uB369\uC774 \uD654\uBA74\uC5D0 \uBCF4\uC774\uACE0.',
    '\uAE30\uC2B9\uC704, \uC0BD\uC785 \uD3EC\uCEE4\uC2A4, \uC5BC\uAD74 \uC548\uB098\uC640\uB3C4 \uB429\uB2C8\uB2E4.',
    '\uAE30\uC2B9\uC704 \uBC11\uC5D0\uC11C \uBC14\uB77C\uBCF4\uB294 \uB290\uB08C, \uC5EC\uC790 \uAC00\uC2B4 \uC798 \uBCF4\uC774\uAC8C, \uC5EC\uC790\uAC00 \uB0A8\uC790 \uBA38\uB9AC\uCC44 \uC7A1\uACE0 \uC788\uC5B4\uC694, \uB0A8\uC790 \uB204\uC6CC\uC788\uC5B4\uC694.'
  ].join('\n'));

  [
    'from behind',
    'facing away',
    'ass focus',
    'thighs',
    'hand on another\'s ass',
    'walking',
    'pov',
    'lying',
    'bent over',
    'leaning forward',
    'looking down',
    'underboob',
    'upper body',
    'sitting',
    'straddling',
    'girl on top',
    'reaching towards viewer',
    'from below',
    'three quarter view',
    'penis',
    'penis focus',
    'face out of frame',
    'spread legs',
    'from side',
    'glans',
    'hand job',
    'hands on penis',
    'smirk',
    'ring',
    'wedding ring',
    'eyes out of frame',
    'tongue',
    'licking',
    'licking penis',
    'sixty-nine',
    "underbody to male's face",
    'top-down bottom-up',
    'hand on thigh',
    'looking back',
    'paizuri',
    'topless',
    'skirt lift',
    'panty pull',
    'panties aside',
    'imminent penetration',
    'penis on pussy',
    'cowgirl position',
    'pussy penetration',
    'hair grab',
    'head grab',
    'hands on breasts',
    'breast press'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['close-up', 'breast focus', 'face focus', 'explicit'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testSofaMissionaryDraftTags() {
  const draft = generateDraftTags([
    'pov hand, from above, sofa, humping, penis on pussy, standing, m legs.',
    '\uD131 \uBC11\uC5D0\uC11C\uBD80\uD130 \uD5C8\uBC85\uC9C0\uAE4C\uC9C0 \uBCF4\uC774\uAC8C, \uBAB8\uC744 \uB354\uB4EC\uB354\uB4EC, \uAC00\uC2B4 \uC704\uC8FC\uB85C \uD130\uCE58.',
    '\uBC30\uB791 \uC190\uC5D0 \uC815\uC561\uC788\uB294 \uC0C1\uD0DC, \uC190\uC73C\uB85C \uBC30\uC5D0 \uC788\uB294 \uC815\uC561 \uB9CC\uC9C0\uB294 \uC911.',
    '\uC815\uC0C1\uC704 side view \uC774\uC5B4\uB9AC\uD0B9\uC911, \uD0A4\uC2A4 \uC9C1\uC804.',
    '\uC815\uBA74\uC5D0\uC11C \uBCF8 \uD6C4\uBC30\uC704, \uB0A8\uC790\uBD88\uC54C, \uB0A8\uC790 \uB4F1\uC9DD\uB9CC \uBCF4\uC774\uB294 \uC0C1\uD0DC.'
  ].join('\n'));

  [
    'pov',
    'pov hands',
    'from above',
    'couch',
    'grinding',
    'penis on pussy',
    'standing',
    'm legs',
    'upper body',
    'thighs',
    'groping',
    'breast grab',
    'hand on breast',
    'stomach',
    'cum',
    'cum on stomach',
    'cum on hand',
    'hand on stomach',
    'missionary',
    'from side',
    'ear licking',
    'licking',
    'imminent kiss',
    'kissing',
    'doggystyle',
    'straight-on',
    'testicles',
    'male back',
    'from behind'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testRoomDrinkingCowgirlDraftTags() {
  const draft = generateDraftTags([
    '\uC790\uCDE8\uBC29 \uCE68\uB300\uC5D0 \uAE30\uB300\uC11C \uC220\uC794\uC744 \uC950\uACE0 \uC544\uBE60\uB2E4\uB9AC\uB85C \uC549\uC544\uC788\uB2E4.',
    '\uC778\uC5B4\uACF5\uC8FC \uC790\uC138\uB85C \uC549\uC544\uC11C \uB0A8\uC790\uB97C \uC62C\uB824\uB2E4\uBCF4\uB294 \uC5EC\uC790.',
    '\uC5F4\uB9B0 \uBC84\uD074, \uBC14\uC9C0\uB97C \uBC97\uAE30\uACE0 \uC5EC\uC790\uAC00 \uC704\uC5D0\uC11C \uC2A4\uB9C8\uD0C0.',
    'disembodided penis, pussy penetration, M legs, side sex, one leg raised.',
    '\uD314\uBCA0\uAC1C \uD558\uACE0 \uB098\uB780\uD788 \uB204\uC6CC\uC11C \uC140\uCE74 \uC719\uD06C.'
  ].join('\n'));

  [
    'bedroom',
    'bed',
    'leaning on person',
    'holding glass',
    'drinking',
    'sitting',
    'crossed legs',
    'yokozuwari',
    'open fly',
    'undressing',
    'grinding',
    'penis on pussy',
    'disembodied penis',
    'pussy penetration',
    'm legs',
    'side sex',
    'from side',
    'one leg raised',
    'arm pillow',
    'selfie',
    'holding phone',
    'smartphone',
    'wink'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testAnalHumiliationDraftTags() {
  const draft = generateDraftTags([
    '반측면 뷰, 애널섹스, ASS FOCUS, 남자 하체만 보이게, 입에 스타킹.',
    '가슴 꽉 쥐고 후배위, 삽입장면 안보이게 상체만.',
    '아헤가오, 밑에서 본 후배위, 벽에 손 짚고있는 여성, 남자가 여성 허리에 손.',
    '여자 얼굴 땅에 대고 남자에게 손 뒤로 잡힌상태, 일그러진 얼굴.',
    'anal sex, 시오후키, leg frame, disembodided penis, 무릎꿇고 엉덩이 든 상태, 아래에서 본 뷰.',
    '바닥에 볼 대고 쓰러지듯 누워있어요, 홍조, 쾌락 표정.',
    '소변 위에 앉아있는 여자, 남자가 여자 머리채 잡고있어요.',
    '펠라 위에서 바라본 pov, 남자 back view, 반측면 펠라 from below.',
    'begging, looking up, 두 손 모아서 비는 중, 한손으로 셀프 핸드잡중, 몸 군데군데 정액.',
    'PUSSY FOCUS, 망가진 얼굴, 반만 뜬 눈, 다리벌린상태.'
  ].join('\n'));

  [
    'three quarter view',
    'anal penetration',
    'anal sex',
    'ass focus',
    'lower body',
    'stockings',
    'clothes in mouth',
    'breast grab',
    'groping',
    'doggystyle',
    'upper body',
    'ahegao',
    'from below',
    'hand on wall',
    'hand on waist',
    'kneeling',
    'on floor',
    'face down',
    'restrained',
    'arms behind back',
    'grimace',
    'female ejaculation',
    'leg frame',
    'disembodied penis',
    'blush',
    'pleasure face',
    'urine',
    'hair grab',
    'head grab',
    'fellatio',
    'from above',
    'pov',
    'from behind',
    'begging',
    'looking up',
    'clasped hands',
    'masturbation',
    'hand job',
    'hand on penis',
    'cum',
    'cum on body',
    'pussy focus',
    'half-closed eyes',
    'spread legs'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testFemaleSixtyNineAndMasturbationDraftTags() {
  const draft = generateDraftTags([
    '#20',
    '\uC138\uC624\uC5BC\uAD74\uC5D0 \uC5EC\uC790\uAC00 \uBCF4\uC9C0\uB97C \uB9C9 \uBE44\uBE55\uB2C8\uB2E4.',
    '\uC5EC\uC131\uC758 \uC5BC\uAD74 \uC704\uB85C \uB2E4\uB978 \uC5EC\uC131\uC758 \uC5C9\uB369\uC774 \uB4B7\uBAA8\uC2B5.',
    '#21',
    '\uC5EC\uC131 \uB458\uC774 69\uC790\uC138, \uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565\uACE0\uC788\uB2E4.',
    '#22-1',
    '\uB204\uC6CC\uC788\uB294 \uC5EC\uC131, \uC704\uC5D0\uB294 \uC5EC\uC131\uC774 69\uC790\uC138\uB85C \uC704\uB85C \uC62C\uB77C\uAC00\uC788\uB294\uB370 \uBCF4\uC774\uC9C0 \uC54A\uC74C, \uC2DC\uC624\uD6C4\uD0A4, \uB450 \uC5EC\uC131\uC740 \uC11C\uB85C \uBCF4\uC9C0\uB97C \uD565\uC544\uC8FC\uB294 \uC911.',
    '#22-2',
    '\uC704\uC5D0 \uC5CE\uB4DC\uB824 \uC788\uB294 \uC5EC\uC131, upside-down, \uBC11\uC5D0\uC11C \uBCF8 \uBDF0, \uBCF4\uC9C0\uAC00 \uC704\uCABD.',
    '#23',
    '\uC5EC\uC790 \uC785\uAC00\uC5D0 \uCE68 \uBB3B\uC740\uCC44\uB85C \uD328\uB2C9\uC628\uB4EF \uB2F9\uD669\uD55C \uD45C\uC815, dutch angle, M legs.',
    '#24',
    '\uB4B7\uBAA8\uC2B5, bent over, \uD63C\uC790 \uC790\uC704, \uD551\uAC70\uB9C1, \uB4A4 \uB3CC\uC544\uBCF4\uBA70, \uC790\uC704 \uD3EC\uCEE4\uC2A4, \uD480\uB9B0\uB208, \uB9DB\uD0F1\uC774\uAC00 \uAC04 \uD45C\uC815.'
  ].join('\n'));

  [
    'multiple girls',
    'yuri',
    'facesitting',
    'pussy on face',
    'grinding',
    'from behind',
    'facing away',
    'sixty-nine',
    'cunnilingus',
    'pussy licking',
    'licking',
    'tongue',
    'lying',
    'female ejaculation',
    'upside-down',
    'from below',
    'face down',
    'saliva',
    'surprised',
    'scared',
    'dutch angle',
    'm legs',
    'bent over',
    'solo',
    'female masturbation',
    'masturbation',
    'masturbation focus',
    'fingering',
    'looking back',
    'half-closed eyes',
    'pleasure face'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ["underbody to male's face", 'top-down bottom-up', 'pussy', 'vaginal', 'breasts', 'ass'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testNewsroomGroupPenetrationDraftTags() {
  const draft = generateDraftTags([
    '#25',
    'pussy focus, \uB2E4\uC774\uB098\uBBF9 \uC575\uAE00\uC774\uB098 \uB354\uD2F0\uC575\uAE00, \uBC14\uBCF4\uAC19\uC774 \uC6C3\uB294 \uD45C\uC815, \uB274\uC2A4\uB8F8 \uCC45\uC0C1\uC5D0 \uC549\uC544\uC788\uC5B4\uC694.',
    '#26',
    '\uC5CE\uB4DC\uB9B0 \uCC44 \uC591\uC190\uC73C\uB85C \uC790\uAE30 \uD478\uC2DC\uB97C \uBC8C\uB9AC\uACE0\uC788\uC5B4\uC5EC, bent over, spread pussy, leg frame.',
    '#27',
    'pov \uB0A8\uC790\uAC00 \uC5C9\uB369\uC774 \uBC8C\uB9AC\uACE0 \uC0BD\uC785, spread anus, pussy penetration.',
    '#28',
    '\uD6C4\uBC30\uC704 \uD558\uB2E4\uAC00 \uBAB8 \uB4E4\uC5B4\uC62C\uB824\uC11C \uD0A4\uC2A4\uD558\uB294\uB290\uB08C, face focus, bentover, looking back, kiss, tilt head.',
    '#29',
    '\uB0A8\uC790 \uC5EC\uB7EC\uBA85, \uAC00\uC2B4\uBE68\uB9AC\uAE30 + \uD3A0\uB77C + pussy penetration, grab thighs, M legs, spread legs.',
    '#30',
    '\uC591\uCABD \uB0A8\uC790 \uACE0\uCD94\uC7A1\uC740\uCC44\uB85C, double handjob, pussy penetration, cowgril position.'
  ].join('\n'));

  [
    'pussy focus',
    'dynamic angle',
    'dutch angle',
    'silly smile',
    'smile',
    'newsroom',
    'news desk',
    'desk',
    'sitting',
    'bent over',
    'spread pussy',
    'leg frame',
    'pov',
    'spread anus',
    'spread ass',
    'pussy penetration',
    'doggystyle',
    'from behind',
    'face only',
    'looking back',
    'kissing',
    'head tilt',
    'multiple boys',
    'background men',
    'breast sucking',
    'fellatio',
    'grabbing thighs',
    'hand on thigh',
    'm legs',
    'spread legs',
    'double handjob',
    'hand job',
    'hands on penis',
    'cowgirl position',
    'girl on top'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['face focus', 'pussy', 'vaginal', 'breasts', 'ass'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
  });
}

function testShopCounterCoercionSequenceDraftTags() {
  const draft = generateDraftTags([
    '#1 카운터와 계산대, 어깨 너머로 돈 훔치는 모습, 손과 돈만 나오는 hand focus.',
    '#3 뚱뚱한 사장, 못생긴 남자가 보라를 뒤에서 끌어안고 from below, 가슴 바로 아래에 손.',
    '#4 옷을 위로 올린 shirt lift 상태, 뒤에서 끌어안고 가슴 만지며 손가락으로 꼭지 공략.',
    '#5 눈을 똥그랗게 뜨고 놀란 여자, 남자가 턱 잡고 강제로 키스, 반측면.',
    '#6 데스크 아래에서 쭈그려 앉아 팬티 위로 핑거링, 하체만, 얼굴 안 나오게.',
    '#7 팬티 젖힌 상태로 핑거링, 데스크 아래, from above.',
    '#8 카운터 위 크로플과 커피, 어색하게 웃는 여자, 엥 하고 쳐다보는 손님들.',
    '#9 팬티 젖은 상태, pussy focus, from below, 화면을 정확히 보고 있다.',
    '#10 웃으면서 전화중, 발그레한 상태, 바스트샷.',
    '#11 전화중, 뒤에서 끌어안은 상태로 험핑.',
    '#12 화면을 짚고 화면을 향해 팔을 뻗은 상태, 후배위, 통화중.',
    '#13 후배위 사장 시점, 페니스와 손만 나오고 한손으로 엉덩이 잡고 통화하며 뒤돌아본다.',
    '#14 고개를 땅에 박고 뺨이 바닥에 닿은 상태, 힘이 다 풀린 팔과 팔꿈치를 바닥에 대고 귀에 핸드폰.',
    '#15 들박, from side, 벽에 등을 붙이고 남자가 엉덩이를 잡은 상태.',
    '#18 접시 닦고 설거지 하는중, 접시와 싱크대, 옆에서 본 구도.',
    '#20 팔짱끼고 사장 노려보는 알바생, 허벅지샷.',
    '#23 스팽킹, 후배위 ass focus, 사장님 몸 화면에 걸치게.',
    '#25 분할컷, 문 너머 남자친구, 문에 기대서 후배위 상태.',
    '#26 화면 향해 팔 뻗어서 후배위, stretch arms to viewer.',
    '#28 문 앞에 주저앉아 다리에 바지가 끼워진 상태, 무릎 세우고 다리 사이로 정액 흐르게, 눈물자국, 미들샷.'
  ].join('\n'));

  [
    'counter',
    'cash register',
    'over shoulder',
    'stealing',
    'money',
    'holding money',
    'hands',
    'hand focus',
    'overweight man',
    'ugly man',
    'hug',
    'from below',
    'underboob',
    'shirt lift',
    'partially undressed',
    'breast grab',
    'nipple stimulation',
    'hand on nipple',
    'wide-eyed',
    'surprised',
    'forced kiss',
    'kissing',
    'holding chin',
    'three quarter view',
    'desk',
    'under desk',
    'squatting',
    'fingering through panties',
    'lower body',
    'face out of frame',
    'panties aside',
    'fingering',
    'from above',
    'waffle',
    'coffee',
    'awkward smile',
    'background crowd',
    'wet panties',
    'pussy focus',
    'looking at viewer',
    'holding phone',
    'phone at ear',
    'smartphone',
    'blush',
    'bust shot',
    'grinding',
    'penis on pussy',
    'hand on screen',
    'reaching towards viewer',
    'outstretched arms',
    'arms towards viewer',
    'doggystyle',
    'from behind',
    'pov',
    'penis',
    'hands on ass',
    'looking back',
    'on floor',
    'face down',
    'cheek on floor',
    'limp arms',
    'elbows on floor',
    'standing sex',
    'held up',
    'against wall',
    'from side',
    'washing dishes',
    'holding plate',
    'plate',
    'sink',
    'arms crossed',
    'glaring',
    'thighs',
    'spanking',
    'ass focus',
    'male torso',
    'multiple views',
    'doorway',
    'leaning on door',
    'pants around legs',
    'knees up',
    'cum',
    'cumdrip',
    'tear streaks',
    'tears',
    'medium shot'
  ].forEach((tag) => {
    assert.ok(draft.tags.includes(tag), `Expected ${tag} in ${draft.tags.join(', ')}`);
  });

  ['leaning on person', 'pussy', 'vaginal', 'breasts', 'ass', 'cropped face', 'cropped torso'].forEach((tag) => {
    assert.strictEqual(draft.tags.includes(tag), false, `Did not expect ${tag} in ${draft.tags.join(', ')}`);
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
  assert.strictEqual(applied.tags.includes('looking at another'), false);
  assert.ok(applied.tags.includes(';d'));
}

function testTagAssignments() {
  const assignments = normalizeTagAssignments({}, [
    'from below',
    'closed eyes',
    'hand job',
    'couch',
    '2::smile::'
  ]);

  assert.strictEqual(assignments['from below'], 'scene');
  assert.strictEqual(assignments.couch, 'scene');
  assert.strictEqual(assignments['closed eyes'], 'character-0');
  assert.strictEqual(assignments['hand job'], 'character-0');
  assert.strictEqual(assignments['2::smile::'], 'character-0');

  const pairedAssignments = normalizeTagAssignments({}, [
    "underbody to male's face",
    'top-down bottom-up',
    'anal penetration',
    'anal sex'
  ]);
  assert.strictEqual(pairedAssignments["underbody to male's face"], 'character-0');
  assert.strictEqual(pairedAssignments['top-down bottom-up'], 'character-1');
  assert.strictEqual(pairedAssignments['anal penetration'], 'characters-0-1');
  assert.strictEqual(pairedAssignments['anal sex'], 'characters-0-1');

  const preserved = normalizeTagAssignments({ 'closed eyes': 'character-1' }, ['closed eyes']);
  assert.strictEqual(preserved['closed eyes'], 'character-1');
}

function testTagTargetSplitting() {
  const tags = ['from below', 'closed eyes', 'anal sex', "underbody to male's face", 'top-down bottom-up'];
  const assignments = normalizeTagAssignments({}, tags);
  const split = splitTagsByTarget(tags, assignments);

  assert.deepStrictEqual(split.sceneTags, ['from below']);
  assert.deepStrictEqual(split.characterTags[0], ['closed eyes', 'anal sex', "underbody to male's face"]);
  assert.deepStrictEqual(split.characterTags[1], ['anal sex', 'top-down bottom-up']);

  const wildcardSplit = splitWildcardPromptsByTarget([
    { options: ['red hair', 'blue hair'], target: 'scene' },
    { options: ['smile', 'smirk'], target: 'characters-0-1' }
  ]);

  assert.deepStrictEqual(wildcardSplit.sceneTags, ['||red hair|blue hair||']);
  assert.deepStrictEqual(wildcardSplit.characterTags[0], ['||smile|smirk||']);
  assert.deepStrictEqual(wildcardSplit.characterTags[1], ['||smile|smirk||']);
}

function testMockGeneration() {
  const project = createEmptyProject();
  const scene = {
    id: 'scene-1-001',
    sceneNo: '1',
    prompt: '1girl, solo, ||red hair|blue hair||',
    negativePrompt: 'bad anatomy',
    basePrompt: 'beautiful background',
    baseNegativePrompt: 'low quality',
    characterPromptsText: '1girl, solo',
    characterNegativePromptsText: 'bad anatomy',
    wildcardPrompts: [{ options: ['red hair', 'blue hair'], target: 'scene' }],
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
  assert.deepStrictEqual(nextProject.images[0].metadata.wildcardPrompts, scene.wildcardPrompts);
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
testRenaSachonNsfwDraftTags();
testFocusCompositionDraftTags();
testEmbraceAndSexCompositionDraftTags();
testSecondSequenceCompositionDraftTags();
testHeartDeliveryServiceDraftTags();
testPastedSceneDescriptionRuleTags();
testWorkplaceShopIntroDraftTags();
testFellatioTransitionDraftTags();
testMissionaryIntensificationDraftTags();
testSuppressedGenericBodyAndPenetrationTags();
testBroadcastGroupNsfwDraftTags();
testBackViewCowgirlDraftTags();
testSofaMissionaryDraftTags();
testRoomDrinkingCowgirlDraftTags();
testAnalHumiliationDraftTags();
testFemaleSixtyNineAndMasturbationDraftTags();
testNewsroomGroupPenetrationDraftTags();
testShopCounterCoercionSequenceDraftTags();
testCustomTagDictionaryRules();
testTagAssignments();
testTagTargetSplitting();
testMockGeneration();
testFailedGeneration();

console.log('core tests passed');
