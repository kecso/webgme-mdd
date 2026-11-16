'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { walkDiagramUpdate } = require('../studio/src/control/diagramWalkers.cjs');
const { classifySequenceLine, walkSequenceUpdate } = require('../studio/src/control/sequenceUpdate.cjs');
const { walkStateUpdate } = require('../studio/src/control/stateUpdate.cjs');
const { walkClassUpdate, MEMBER_REASON } = require('../studio/src/control/classUpdate.cjs');
const { walkErUpdate, ATTRIBUTE_REASON } = require('../studio/src/control/erUpdate.cjs');
const { walkEarsUpdate } = require('../studio/src/control/earsUpdate.cjs');
const { walkRequirementUpdate } = require('../studio/src/control/requirementUpdate.cjs');
const { walkC4Update } = require('../studio/src/control/c4Update.cjs');
const { walkArchitectureUpdate } = require('../studio/src/control/architectureUpdate.cjs');
const { walkUsecaseUpdate } = require('../studio/src/control/usecaseUpdate.cjs');
const { walkGanttUpdate } = require('../studio/src/control/ganttUpdate.cjs');
const { createMddProject } = require('../scripts/mdd-project');
const { placeDiagramNode } = require('../studio/src/control/diagramNode.cjs');

function recordingApi() {
  const steps = [];
  let n = 0;
  return {
    steps,
    createChild(parentPath, baseName, attributes) {
      const nodePath = '/' + baseName + '/' + (++n);
      steps.push({ call: 'createChild', parentPath, baseName, attributes, nodePath });
      return nodePath;
    },
    setAttribute(nodePath, name, value) {
      steps.push({ call: 'setAttribute', nodePath, name, value });
    },
    setPointer(nodePath, name, targetPath) {
      steps.push({ call: 'setPointer', nodePath, name, targetPath });
    },
    deleteNode(nodePath) {
      steps.push({ call: 'deleteNode', nodePath });
    }
  };
}

function calls(api, name) {
  return api.steps.filter((step) => step.call === name);
}

function adds(lines) {
  return lines.map((text, index) => ({
    op: 'addLine',
    lineId: 'ln' + (index + 1),
    text,
    index
  }));
}

function created(api, baseName, name) {
  return calls(api, 'createChild').find((step) =>
    step.baseName === baseName && step.attributes.name === name
  );
}

function walk(fn, lines, api, extra) {
  return fn(Object.assign({ diagramNodePath: '/a/d', lines: [] }, extra), adds(lines), api);
}

test('sequence lines create participants, messages, fragments, and notes', () => {
  const lines = [
    'sequenceDiagram',
    'actor Driver',
    'participant RadarECU',
    'participant FusionApp',
    'participant BrakeCtrl as BrakeController',
    'participant HMI',
    'Driver->>FusionApp: CACC engaged',
    'RadarECU->>+FusionApp: ObstacleDetect',
    'FusionApp->>FusionApp: PlausibilityCheck',
    'alt confidence >= threshold',
    'FusionApp->>+BrakeCtrl: BrakeRequest',
    'BrakeCtrl-->>-FusionApp: ActuatorAck',
    'BrakeCtrl->>HMI: AEB_Active',
    'Note over FusionApp,BrakeCtrl: Happy path',
    'else low confidence REQ-AEB-003',
    'FusionApp-->>RadarECU: InhibitBrake',
    'Note over FusionApp: No BrakeRequest',
    'end',
    'HMI->>Driver: done'
  ];
  const api = recordingApi();
  const walked = walk(walkSequenceUpdate, lines, api);

  assert.equal(created(api, 'Participant', 'Driver').attributes.kind, 'actor');
  assert.equal(created(api, 'Participant', 'BrakeCtrl').attributes.alias, 'BrakeController');
  assert.equal(created(api, 'Participant', 'BrakeCtrl').parentPath, '/a/d');
  assert.equal(created(api, 'Message', 'ln8').attributes.activate, '+');
  assert.equal(created(api, 'Message', 'ln8').attributes.arrowType, '->>');
  assert.equal(created(api, 'Message', 'ln12').attributes.activate, '-');
  assert.equal(created(api, 'Message', 'ln12').attributes.arrowType, '-->>');
  assert.equal(created(api, 'Message', 'ln7').parentPath, '/a/d');
  assert.equal(created(api, 'Message', 'ln11').parentPath, created(api, 'Fragment', 'ln10').nodePath);
  assert.equal(created(api, 'Fragment', 'ln15').parentPath, created(api, 'Fragment', 'ln10').nodePath);
  assert.equal(created(api, 'Fragment', 'ln15').attributes.kind, 'else');
  assert.equal(created(api, 'Message', 'ln16').parentPath, created(api, 'Fragment', 'ln15').nodePath);
  assert.equal(created(api, 'Message', 'ln19').parentPath, '/a/d');
  assert.equal(created(api, 'Note', 'ln17').parentPath, created(api, 'Fragment', 'ln15').nodePath);

  const notePointers = calls(api, 'setPointer').filter((step) => step.nodePath === created(api, 'Note', 'ln14').nodePath);
  assert.deepEqual(notePointers.map((step) => step.targetPath), [
    created(api, 'Participant', 'FusionApp').nodePath,
    created(api, 'Participant', 'BrakeCtrl').nodePath
  ]);
  const single = calls(api, 'setPointer').filter((step) => step.nodePath === created(api, 'Note', 'ln17').nodePath);
  assert.equal(single[0].targetPath, created(api, 'Participant', 'FusionApp').nodePath);
  assert.equal(single[1].targetPath, single[0].targetPath);
  assert.equal(walked.names.Driver, created(api, 'Participant', 'Driver').nodePath);
  assert.equal(calls(api, 'createChild').some((step) => step.attributes.name === 'end'), false);
});

test('sequence edits retarget, adopt, and ignore lines that are not elements', () => {
  const api = recordingApi();
  walkSequenceUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'title Obstacle', nodePath: null },
        { id: 'ln2', text: 'actor Driver', nodePath: '/Participant/1' },
        { id: 'ln3', text: 'Driver->>FusionApp: CACC engaged', nodePath: '/Message/2' },
        { id: 'ln4', text: 'alt ready', nodePath: '/Fragment/3' },
        { id: 'ln5', text: '%% comment', nodePath: null }
      ],
      names: { FusionApp: '/Participant/9' }
    },
    [
      { op: 'updateText', lineId: 'ln1', text: 'title Brake', index: 0 },
      { op: 'updateText', lineId: 'ln3', text: 'Driver->>HMI: CACC engaged', index: 2 },
      { op: 'updateText', lineId: 'ln4', text: 'loop ready', index: 3 },
      { op: 'updateText', lineId: 'ln2', text: 'Driver->>HMI: hello', index: 1 },
      { op: 'addLine', lineId: 'ln6', text: 'autonumber 4', index: 5 },
      { op: 'addLine', lineId: 'ln7', text: 'opt later', index: 6 },
      { op: 'removeLine', lineId: 'ln5', text: '%% comment', index: 4 },
      { op: 'moveLine', lineId: 'ln4', text: 'loop ready', index: 1 },
      { op: 'addLine', lineId: 'ln8', text: 'Note over Driver: wait', index: 2 },
      { op: 'updateText', lineId: 'ln3', text: 'Driver->>HMI: CACC engaged', index: 2 }
    ],
    api
  );

  assert.equal(calls(api, 'setAttribute').some((step) => step.name === 'title' && step.value === 'Brake'), true);
  assert.equal(calls(api, 'setAttribute').some((step) => step.nodePath === '/a/d' && step.name === 'autonumber' && step.value === '4'), true);
  const retarget = calls(api, 'setPointer').find((step) => step.nodePath === '/Message/2' && step.name === 'to');
  assert.equal(retarget.targetPath, created(api, 'Participant', 'HMI').nodePath);
  assert.equal(calls(api, 'setAttribute').some((step) => step.nodePath === '/Fragment/3' && step.name === 'kind' && step.value === 'loop'), true);
  assert.equal(calls(api, 'deleteNode').some((step) => step.nodePath === '/Participant/1'), true);
  assert.equal(calls(api, 'setAttribute').some((step) => step.name === 'order' && step.value === 1), true);
  assert.equal(created(api, 'Note', 'ln8').attributes.text, 'wait');
});

test('a later participant declaration adopts the node a message created', () => {
  const api = recordingApi();
  walkSequenceUpdate(
    { diagramNodePath: '/a/d', lines: [] },
    adds([
      'RadarECU->>FusionApp: ObstacleDetect',
      'actor RadarECU'
    ]),
    api
  );
  const radar = created(api, 'Participant', 'RadarECU');
  assert.equal(calls(api, 'createChild').filter((step) => step.baseName === 'Participant' && step.attributes.name === 'RadarECU').length, 1);
  assert.equal(calls(api, 'setAttribute').some((step) => step.nodePath === radar.nodePath && step.name === 'kind' && step.value === 'actor'), true);
});

test('state transitions, composites, and notes follow the open state', () => {
  const lines = [
    'stateDiagram-v2',
    'title AEB modes',
    '[*] --> Off',
    'Off --> ACC: DriverEngageCACC',
    'state Busy {',
    'Idle --> Work : start [ready] / go',
    '}',
    'note right of ACC',
    '  While AEB_Active ignore accel',
    'end note'
  ];
  const api = recordingApi();
  walk(walkStateUpdate, lines, api);
  assert.equal(created(api, 'State', '[*]').attributes.kind, 'initial');
  assert.equal(created(api, 'State', 'Off').attributes.kind, 'simple');
  assert.equal(created(api, 'Transition', 'ln4').attributes.event, 'DriverEngageCACC');
  assert.equal(created(api, 'Transition', 'ln4').parentPath, '/a/d');
  assert.equal(created(api, 'Transition', 'ln6').parentPath, created(api, 'State', 'Busy').nodePath);
  assert.equal(created(api, 'Transition', 'ln6').attributes.guard, 'ready');
  assert.equal(created(api, 'Transition', 'ln6').attributes.action, 'go');
  assert.equal(created(api, 'Note', 'ln8').parentPath, '/a/d');
  assert.equal(calls(api, 'setAttribute').some((step) =>
    step.nodePath === created(api, 'Note', 'ln8').nodePath && step.value === 'While AEB_Active ignore accel'
  ), true);
  assert.equal(calls(api, 'setAttribute').some((step) => step.name === 'title' && step.value === 'AEB modes'), true);
});

test('class relationships are stored and member lines are skipped', () => {
  const api = recordingApi();
  const walked = walk(walkClassUpdate, [
    'classDiagram',
    'class Animal',
    'Animal <|-- Dog',
    'Owner "1" --> "*" Animal : owns',
    'class Box {',
    '+String name',
    '+eat() float',
    '}'
  ], api);
  assert.equal(created(api, 'Relationship', 'ln3').attributes.kind, 'inheritance');
  assert.equal(created(api, 'Relationship', 'ln4').attributes.srcCard, '1');
  assert.equal(created(api, 'Relationship', 'ln4').attributes.dstCard, '*');
  assert.equal(created(api, 'Relationship', 'ln4').attributes.label, 'owns');
  assert.equal(created(api, 'Class', 'Dog').parentPath, '/a/d');
  assert.equal(walked.skipped.map((item) => item.reason).every((reason) => reason === MEMBER_REASON), true);
  assert.equal(walked.skipped.length, 2);
  assert.equal(created(api, 'Class', 'Animal').nodePath, walked.bindings.find((item) => item.lineId === 'ln2').nodePath);
});

test('er relationships create entities and attribute lines are skipped', () => {
  const api = recordingApi();
  const walked = walk(walkErUpdate, [
    'erDiagram',
    'ObstacleTrack ||--o{ BrakeEvent : triggers',
    'ObstacleTrack {',
    'string obstacleId PK',
    '}',
    'BrakeEvent ||--o| DTC : may_raise'
  ], api);
  const rel = created(api, 'Relationship', 'ln2');
  assert.equal(rel.attributes.srcCard, '||');
  assert.equal(rel.attributes.dstCard, 'o{');
  assert.equal(rel.attributes.label, 'triggers');
  assert.equal(calls(api, 'createChild').filter((step) => step.baseName === 'Entity' && step.attributes.name === 'ObstacleTrack').length, 1);
  assert.equal(walked.bindings.find((item) => item.lineId === 'ln3').nodePath, walked.names.ObstacleTrack);
  assert.deepEqual(walked.skipped, [{ lineId: 'ln4', reason: ATTRIBUTE_REASON }]);
  assert.equal(created(api, 'Entity', 'DTC').parentPath, '/a/d');
});

test('ears headers own the requirement and the next sentence fills its clauses', () => {
  const api = recordingApi();
  walk(walkEarsUpdate, [
    '# EARS — AEB / CACC shalls (S1 demo)',
    '# Patterns: ubiquitous | state | event',
    'REQ-AEB-001 [event] risk=high verifymethod=test',
    'When an obstacle is detected, the BrakeController shall command deceleration.',
    '',
    'REQ-CACC-003 [complex] risk=high verifymethod=test',
    'While ACC is engaged, when the lead vehicle brakes, the LongitudinalController shall reduce speed.',
    'REQ-CACC-001 [ubiquitous] risk=medium verifymethod=analysis',
    'The LongitudinalController shall maintain gap error.',
    'REQ-AEB-003 [unwanted] risk=high verifymethod=test',
    'If confidence is low, then the BrakeController shall not command braking.',
    'REQ-CACC-002 [where] risk=medium verifymethod=demonstration',
    'Where the vehicle has V2XGateway, the FusionApp shall incorporate tracks.',
    'REQ-PLAIN [ubiquitous]',
    'keep the whole sentence'
  ], api);
  const titles = calls(api, 'setAttribute').filter((step) => step.name === 'title');
  assert.equal(titles.length, 1);
  assert.equal(titles[0].value, 'EARS — AEB / CACC shalls (S1 demo)');
  const event = created(api, 'EARSRequirement', 'REQ-AEB-001');
  assert.equal(event.attributes.pattern, 'event');
  assert.equal(event.attributes.risk, 'high');
  const eventText = calls(api, 'setAttribute').filter((step) => step.nodePath === event.nodePath);
  assert.equal(eventText.find((step) => step.name === 'trigger').value, 'an obstacle is detected');
  assert.equal(eventText.find((step) => step.name === 'system').value, 'BrakeController');
  const complex = created(api, 'EARSRequirement', 'REQ-CACC-003');
  const complexText = calls(api, 'setAttribute').filter((step) => step.nodePath === complex.nodePath);
  assert.equal(complexText.find((step) => step.name === 'precondition').value, 'ACC is engaged');
  assert.equal(complexText.find((step) => step.name === 'trigger').value, 'the lead vehicle brakes');
  const ubi = created(api, 'EARSRequirement', 'REQ-CACC-001');
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === ubi.nodePath && step.name === 'response').value, 'maintain gap error');
  const unwanted = created(api, 'EARSRequirement', 'REQ-AEB-003');
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === unwanted.nodePath && step.name === 'unwantedCondition').value, 'confidence is low');
  const optional = created(api, 'EARSRequirement', 'REQ-CACC-002');
  assert.equal(optional.attributes.pattern, 'optional');
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === optional.nodePath && step.name === 'feature').value, 'the vehicle has V2XGateway');
  const plain = created(api, 'EARSRequirement', 'REQ-PLAIN');
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === plain.nodePath && step.name === 'response').value, 'keep the whole sentence');
});

test('a sentence after a closed ears requirement does not attach to the previous one', () => {
  const api = recordingApi();
  walk(walkEarsUpdate, [
    'REQ-AEB-002 [state] risk=high verifymethod=test',
    'While AEB_Active, the BrakeController shall ignore driver acceleration.',
    '',
    'this is not a requirement'
  ], api);
  const node = created(api, 'EARSRequirement', 'REQ-AEB-002').nodePath;
  const texts = calls(api, 'setAttribute').filter((step) => step.nodePath === node && step.name === 'text');
  assert.deepEqual(texts.map((step) => step.value), [
    'While AEB_Active, the BrakeController shall ignore driver acceleration.'
  ]);
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === node && step.name === 'precondition').value, 'AEB_Active');
});

test('requirement fields update the open element and relations use those nodes', () => {
  const api = recordingApi();
  const walked = walk(walkRequirementUpdate, [
    'requirementDiagram',
    'requirement AEB_DetectAndBrake {',
    'id: "REQ-AEB-001"',
    'text: "Detect obstacle and brake within 100ms"',
    'risk: high',
    'verifymethod: test',
    '}',
    'element DriverEngageCACC {',
    'type: usecase',
    '}',
    'DriverEngageCACC - satisfies -> AEB_DetectAndBrake',
    'missing - verifies -> AEB_DetectAndBrake'
  ], api);
  const req = created(api, 'Requirement', 'AEB_DetectAndBrake').nodePath;
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === req && step.name === 'reqId').value, 'REQ-AEB-001');
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === req && step.name === 'text').value, 'Detect obstacle and brake within 100ms');
  const element = created(api, 'Element', 'DriverEngageCACC').nodePath;
  assert.equal(calls(api, 'setAttribute').find((step) => step.nodePath === element && step.name === 'elementType').value, 'usecase');
  const rel = created(api, 'Relationship', 'ln11');
  assert.equal(rel.attributes.kind, 'satisfies');
  const pointers = calls(api, 'setPointer').filter((step) => step.nodePath === rel.nodePath);
  assert.deepEqual(pointers.map((step) => step.targetPath), [element, req]);
  assert.equal(walked.skipped.some((item) => item.lineId === 'ln12'), true);
  assert.equal(created(api, 'Relationship', 'ln12').attributes.kind, 'verifies');
});

test('c4 elements and relations use the alias as the name', () => {
  const api = recordingApi();
  walk(walkC4Update, [
    'C4Context',
    'title S1 Vehicle AEB / CACC context',
    'Person(driver, "Driver", "Operates vehicle and CACC")',
    'System_Ext(lead, "Lead Vehicle", "V2X peer")',
    'Container(app, "Fusion", "Node", "In-vehicle app")',
    'Rel(driver, lead, "V2X tracks / gap", "V2X")',
    'BiRel(driver, app, "Uses")'
  ], api);
  assert.equal(calls(api, 'setAttribute').find((step) => step.name === 'level').value, 'C4Context');
  assert.equal(created(api, 'Person', 'driver').attributes.alias, 'Driver');
  assert.equal(created(api, 'System', 'lead').attributes.external, 'true');
  assert.equal(created(api, 'System', 'lead').attributes.kind, 'System_Ext');
  assert.equal(created(api, 'Container', 'app').attributes.technology, 'Node');
  assert.equal(created(api, 'Container', 'app').attributes.description, 'In-vehicle app');
  const rel = created(api, 'Relation', 'ln6');
  assert.equal(rel.attributes.technology, 'V2X');
  assert.deepEqual(
    calls(api, 'setPointer').filter((step) => step.nodePath === rel.nodePath).map((step) => step.name),
    ['src', 'dst']
  );
  assert.equal(created(api, 'Relation', 'ln7').attributes.bidirectional, 'true');
});

test('architecture services sit in their group and edges stay on the diagram', () => {
  const api = recordingApi();
  walk(walkArchitectureUpdate, [
    'architecture-beta',
    'group vehicle(cloud)[Ego Vehicle]',
    'service radar(server)[RadarECU] in vehicle',
    'service hmi(server)[HMI]',
    'radar:R --> L:fusion',
    'radar:R --> L:hmi'
  ], api);
  const group = created(api, 'Group', 'vehicle');
  assert.equal(group.attributes.icon, 'cloud');
  assert.equal(group.attributes.label, 'Ego Vehicle');
  assert.equal(created(api, 'Service', 'radar').parentPath, group.nodePath);
  assert.equal(created(api, 'Service', 'radar').attributes.inGroup, 'vehicle');
  assert.equal(created(api, 'Service', 'hmi').parentPath, '/a/d');
  const missingEnd = created(api, 'Edge', 'ln5');
  const edge = created(api, 'Edge', 'ln6');
  assert.equal(edge.parentPath, '/a/d');
  assert.equal(edge.attributes.srcSide, 'R');
  assert.equal(edge.attributes.dstSide, 'L');
  assert.equal(calls(api, 'setPointer').filter((step) => step.nodePath === missingEnd.nodePath).length, 1);
  const pointers = calls(api, 'setPointer').filter((step) => step.nodePath === edge.nodePath);
  assert.deepEqual(pointers.map((step) => step.name), ['src', 'dst']);
  assert.equal(pointers[1].targetPath, created(api, 'Service', 'hmi').nodePath);
});

test('usecase actors, use cases, and association links are created from one line each', () => {
  const api = recordingApi();
  walk(walkUsecaseUpdate, [
    'usecase-beta',
    'direction LR',
    'actor Modeler',
    '(Import Mermaid)',
    'Modeler --> (Import Mermaid)',
    'Modeler --> (Export Mermaid)'
  ], api);
  assert.equal(calls(api, 'setAttribute').find((step) => step.name === 'direction').value, 'LR');
  assert.equal(created(api, 'Actor', 'Modeler').parentPath, '/a/d');
  assert.equal(created(api, 'UseCase', 'Import Mermaid').attributes.alias, 'Import Mermaid');
  const link = created(api, 'Link', 'ln5');
  assert.equal(link.attributes.kind, 'association');
  assert.equal(calls(api, 'createChild').filter((step) => step.baseName === 'Actor').length, 1);
  assert.equal(created(api, 'UseCase', 'Export Mermaid').parentPath, '/a/d');
});

test('gantt tasks keep their ids and are not stored inside the section', () => {
  const api = recordingApi();
  walk(walkGanttUpdate, [
    'gantt',
    'title Housing sprint',
    'dateFormat YYYY-MM-DD',
    'section Meta',
    'Survey diagrams :done, a1, 2026-11-01, 3d',
    'Draft metamodels :active, a2, after a1, 5d',
    'Import/Export :a3, after a2, 4d',
    'Milestone :milestone, a4, 2026-11-08, 2026-11-09'
  ], api);
  assert.equal(calls(api, 'setAttribute').find((step) => step.name === 'dateFormat').value, 'YYYY-MM-DD');
  assert.equal(created(api, 'Section', 'Meta').parentPath, '/a/d');
  const survey = created(api, 'Task', 'Survey diagrams');
  assert.equal(survey.parentPath, '/a/d');
  assert.equal(survey.attributes.taskId, 'a1');
  assert.equal(survey.attributes.status, 'done');
  assert.equal(survey.attributes.duration, '3d');
  assert.equal(created(api, 'Task', 'Draft metamodels').attributes.after, 'a1');
  assert.equal(created(api, 'Task', 'Import/Export').attributes.status, '');
  const milestone = created(api, 'Task', 'Milestone');
  assert.equal(milestone.attributes.status, 'milestone');
  assert.equal(milestone.attributes.end, '2026-11-09');
});

test('block and kanban are marked as needing further design', () => {
  const block = walkDiagramUpdate('block', { diagramNodePath: '/a/d', lines: [] }, adds(['Catalog Catalog']), recordingApi());
  const kanban = walkDiagramUpdate('kanban', { diagramNodePath: '/a/d', lines: [] }, adds(['  [Card]']), recordingApi());
  const missing = walkDiagramUpdate('pie', { diagramNodePath: '/a/d', lines: [] }, [], recordingApi());
  assert.equal(block.status, 'needs-design');
  assert.match(block.reason, /one line operation is not one block/);
  assert.equal(kanban.status, 'needs-design');
  assert.match(kanban.reason, /no column/);
  assert.equal(missing.status, 'unsupported');
});

test('the dispatcher runs the flowchart walker for a flowchart line', () => {
  const api = recordingApi();
  const walked = walkDiagramUpdate('flowchart', {
    diagramNodePath: '/a/d',
    lines: [{ id: 'ln1', text: 'flowchart TD', nodePath: null }]
  }, [{ op: 'addLine', lineId: 'ln2', text: 'Start([Start]) --> Stop([Stop])', index: 1 }], api);
  assert.equal(walked.status, 'applied');
  assert.equal(calls(api, 'createChild').some((step) => step.baseName === 'Edge'), true);
});

test('removing a linked state and updating a class label write only that change', () => {
  const stateApi = recordingApi();
  walkStateUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'Off --> ACC: go', nodePath: '/Transition/1' },
        { id: 'ln2', text: 'note right of Off: parked', nodePath: '/Note/2' }
      ]
    },
    [
      { op: 'removeLine', lineId: 'ln1', text: 'Off --> ACC: go', index: 0 },
      { op: 'updateText', lineId: 'ln2', text: 'note left of ACC: parked', index: 1 },
      { op: 'moveLine', lineId: 'ln2', text: 'note left of ACC: parked', index: 0 }
    ],
    stateApi
  );
  assert.deepEqual(calls(stateApi, 'deleteNode').map((step) => step.nodePath), ['/Transition/1']);
  assert.equal(calls(stateApi, 'setAttribute').some((step) => step.name === 'placement' && step.value === 'left of'), true);
  assert.equal(calls(stateApi, 'setAttribute').some((step) => step.name === 'order'), true);

  const classApi = recordingApi();
  walkClassUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [{ id: 'ln1', text: 'Animal --> Dog : pet', nodePath: '/Relationship/1' }],
      names: { Animal: '/Class/1', Dog: '/Class/2' }
    },
    [{ op: 'updateText', lineId: 'ln1', text: 'Animal --> Dog : owns', index: 0 }],
    classApi
  );
  assert.deepEqual(calls(classApi, 'setAttribute'), [
    { call: 'setAttribute', nodePath: '/Relationship/1', name: 'label', value: 'owns' }
  ]);
});

test('sequence edits rename, retarget, and close else branches', () => {
  const api = recordingApi();
  const walked = walkSequenceUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'p', text: 'participant API as Service', nodePath: '/Participant/1' },
        { id: 'm', text: 'API->>DB: read', nodePath: '/Message/2' },
        { id: 'n', text: 'Note over API,DB: rows', nodePath: '/Note/3' },
        { id: 'a', text: 'autonumber', nodePath: null },
        { id: 't', text: 'title Old', nodePath: null },
        { id: 'h', text: 'sequenceDiagram', nodePath: null }
      ],
      names: { API: '/Participant/1', DB: '/Participant/4' }
    },
    [
      { op: 'updateText', lineId: 'p', text: 'actor Service as API', index: 0 },
      { op: 'updateText', lineId: 'm', text: 'DB--xAPI: write', index: 1 },
      { op: 'updateText', lineId: 'n', text: 'Note over HMI,Cache: rows changed', index: 2 },
      { op: 'updateText', lineId: 'a', text: 'autonumber off', index: 3 },
      { op: 'updateText', lineId: 't', text: 'title Old', index: 4 },
      { op: 'updateText', lineId: 'h', text: 'sequenceDiagram', index: 5 },
      { op: 'addLine', lineId: 'box', text: 'box rgb(1,2,3)', index: 6 },
      { op: 'removeLine', lineId: 'm', index: 1 },
      { op: 'removeLine', lineId: 'p', index: 0 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'noop' }
    ],
    api
  );
  assert.equal(calls(api, 'setAttribute').some((step) => step.nodePath === '/Participant/1' && step.name === 'name' && step.value === 'Service'), true);
  assert.equal(calls(api, 'setAttribute').some((step) => step.nodePath === '/Participant/1' && step.name === 'kind' && step.value === 'actor'), true);
  assert.equal(calls(api, 'setAttribute').some((step) => step.nodePath === '/Message/2' && step.name === 'arrowType' && step.value === '--x'), true);
  assert.equal(calls(api, 'setAttribute').some((step) => step.nodePath === '/Note/3' && step.name === 'text' && step.value === 'rows changed'), true);
  assert.equal(calls(api, 'setPointer').filter((step) => step.nodePath === '/Note/3').length, 2);
  assert.equal(calls(api, 'setAttribute').some((step) => step.name === 'autonumber' && step.value === 'off'), true);
  assert.equal(calls(api, 'deleteNode').map((step) => step.nodePath).includes('/Message/2'), true);
  assert.equal(calls(api, 'deleteNode').map((step) => step.nodePath).includes('/Participant/1'), true);
  assert.equal(walked.names.Service, undefined);

  const arrows = recordingApi();
  walk(walkSequenceUpdate, [
    'title Fresh',
    'autonumber',
    'A-xB: n',
    'A--)B: n',
    'critical stop',
    'else one',
    'else two',
    'A->B: inside',
    'end',
    'break stop',
    'A-->B: after'
  ], arrows);
  assert.equal(created(arrows, 'Message', 'ln3').attributes.arrowType, '-x');
  assert.equal(created(arrows, 'Message', 'ln4').attributes.arrowType, '--)');
  assert.equal(created(arrows, 'Message', 'ln8').parentPath, created(arrows, 'Fragment', 'ln7').nodePath);
  assert.equal(created(arrows, 'Message', 'ln11').parentPath, created(arrows, 'Fragment', 'ln10').nodePath);
  assert.equal(calls(arrows, 'setAttribute').some((step) => step.name === 'autonumber' && step.value === 'true'), true);

  const bare = recordingApi();
  walkSequenceUpdate(
    { diagramNodePath: null, lines: [{ id: 'm', text: 'API->>DB: read', nodePath: null }] },
    [
      { op: 'updateText', lineId: 'm', text: 'API->>DB: write' },
      { op: 'addLine', lineId: 't', text: 'title Nowhere' },
      { op: 'moveLine', lineId: 'gone', text: 'API->>DB: write', index: 0 }
    ],
    bare
  );
  assert.equal(created(bare, 'Message', 'm').attributes.label, 'write');
  assert.equal(calls(bare, 'setAttribute').some((step) => step.name === 'title'), false);

  const quiet = recordingApi();
  walkSequenceUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'p', text: 'participant API as Service', nodePath: '/Participant/1' },
        { id: 'm', text: 'API->>DB: read', nodePath: '/Message/2' },
        { id: 'n', text: 'Note over API,DB: rows', nodePath: '/Note/3' },
        { id: 'f', text: 'alt ready', nodePath: null },
        { id: 'g', text: 'API->>DB: inside', nodePath: null }
      ],
      names: { API: '/Participant/1', DB: '/Participant/4' }
    },
    [
      { op: 'updateText', lineId: 'p', text: 'participant API as Gateway', index: 0 },
      { op: 'updateText', lineId: 'm', text: 'API->>DB: write', index: 1 },
      { op: 'updateText', lineId: 'n', text: 'Note over API,DB: done', index: 2 },
      { op: 'updateText', lineId: 'g', text: 'API->>DB: still', index: 4 },
      { op: 'addLine', lineId: 'e', text: 'A->>B:', index: 5 },
      { op: 'addLine', lineId: 'solo', text: 'else lone', index: 6 },
      { op: 'addLine', lineId: 'in', text: 'A->>B: x', index: 7 },
      { op: 'addLine', lineId: 'en', text: 'end', index: 8 },
      { op: 'addLine', lineId: 'out', text: 'A->>B: y', index: 9 }
    ],
    quiet
  );
  assert.equal(calls(quiet, 'setAttribute').some((step) => step.nodePath === '/Participant/1' && step.name === 'alias' && step.value === 'Gateway'), true);
  assert.deepEqual(calls(quiet, 'setAttribute').filter((step) => step.nodePath === '/Message/2'), [
    { call: 'setAttribute', nodePath: '/Message/2', name: 'label', value: 'write' }
  ]);
  assert.equal(calls(quiet, 'setAttribute').some((step) => step.nodePath === '/Note/3' && step.name === 'text' && step.value === 'done'), true);
  assert.equal(created(quiet, 'Message', 'out').parentPath, '/a/d');
  assert.equal(created(quiet, 'Message', 'g').parentPath, '/a/d');

  const edges = recordingApi();
  walkSequenceUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 't', text: 'title Kept', nodePath: '/a/d' },
        { id: 'm', text: 'API->>DB: read', nodePath: '/Message/2' }
      ],
      names: { API: '/Participant/1', DB: '/Participant/4' }
    },
    [
      { op: 'updateText', lineId: 'missing', text: 'actor API', index: 0 },
      { op: 'removeLine', lineId: 't', index: 0 },
      { op: 'updateText', lineId: 'm', text: 'HMI->>DB: read', index: 1 }
    ],
    edges
  );
  assert.equal(calls(edges, 'setAttribute').some((step) => step.nodePath === '/Participant/1' && step.name === 'kind' && step.value === 'actor'), true);
  assert.equal(calls(edges, 'deleteNode').length, 0);
  assert.equal(calls(edges, 'setPointer').some((step) => step.name === 'from' && step.targetPath !== '/Participant/4'), true);
  assert.equal(calls(edges, 'setPointer').some((step) => step.name === 'to'), false);
  assert.equal(classifySequenceLine().kind, 'comment');
  assert.equal(classifySequenceLine(null).kind, 'comment');
});

test('a line that changes kind replaces the element it used to be', () => {
  const stateApi = recordingApi();
  walkStateUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'n', text: 'note right of Off', nodePath: '/Note/1' },
        { id: 'p', text: 'parked', nodePath: null },
        { id: 'e', text: 'end note', nodePath: null }
      ],
      names: { Off: '/State/1' }
    },
    [
      { op: 'updateText', lineId: 'p', text: 'still parked', index: 1 },
      { op: 'updateText', lineId: 'e', text: 'end note', index: 2 },
      { op: 'updateText', lineId: 'n', text: 'end note', index: 0 }
    ],
    stateApi
  );
  assert.equal(calls(stateApi, 'setAttribute').some((step) => step.nodePath === '/Note/1' && step.value === 'still parked'), true);
  assert.equal(calls(stateApi, 'deleteNode').some((step) => step.nodePath === '/Note/1'), true);

  function replaced(walk, before, after) {
    const api = recordingApi();
    walk(
      { diagramNodePath: '/a/d', lines: [{ id: 'ln', text: before, nodePath: '/Old/1' }], names: {} },
      [{ op: 'updateText', lineId: 'ln', text: after, index: 0 }],
      api
    );
    assert.equal(calls(api, 'deleteNode').some((step) => step.nodePath === '/Old/1'), true, before);
    return api;
  }
  replaced(walkClassUpdate, 'class Animal', 'Animal --> Dog : pet');
  replaced(walkErUpdate, 'Order {', 'Order ||--o{ Line : has');
  replaced(walkC4Update, 'Person(driver, "Driver", "Ops")', 'Rel(driver, lead, "Uses")');
  replaced(walkArchitectureUpdate, 'group vehicle(cloud)[Ego]', 'radar:R --> L:hmi');
  replaced(walkUsecaseUpdate, 'actor Modeler', '(Import Mermaid)');
  replaced(walkGanttUpdate, 'section Meta', 'Survey :done, a1, 2026-11-01, 3d');
  replaced(walkRequirementUpdate, 'requirement Safety {', 'risk: high');
  const earsApi = replaced(walkEarsUpdate, 'REQ-1 [event] risk=low verifymethod=test', 'When it rains, the system shall stop.');
  assert.equal(calls(earsApi, 'createChild').length, 0);

  const spaced = recordingApi();
  walk(walkEarsUpdate, [
    'REQ-1 [event] risk=low verifymethod=test',
    '',
    'When it rains, the system shall stop.'
  ], spaced);
  assert.equal(calls(spaced, 'setAttribute').some((step) => step.name === 'trigger' && step.value === 'it rains'), true);
});

test('the other diagram edits update, retarget, and remove their own elements', () => {
  const stateApi = recordingApi();
  walkStateUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 's', text: 'state Off', nodePath: '/State/1' },
        { id: 't', text: 'Off --> On: go', nodePath: '/Transition/2' },
        { id: 'n', text: 'note right of Off', nodePath: '/Note/3' },
        { id: 'p', text: '  parked', nodePath: null },
        { id: 'title', text: 'title Old', nodePath: null }
      ],
      names: { Off: '/State/1', On: '/State/4' }
    },
    [
      { op: 'updateText', lineId: 's', text: 'state On', index: 0 },
      { op: 'updateText', lineId: 't', text: 'Idle --> On: start / go', index: 1 },
      { op: 'updateText', lineId: 'title', text: 'title New', index: 4 },
      { op: 'removeLine', lineId: 'p', index: 3 },
      { op: 'addLine', lineId: 'e', text: 'end', index: 5 },
      { op: 'updateText', lineId: 's', text: 'Idle --> On: go', index: 0 }
    ],
    stateApi
  );
  assert.equal(calls(stateApi, 'setAttribute').some((step) => step.nodePath === '/State/1' && step.value === 'On'), true);
  assert.equal(calls(stateApi, 'setAttribute').some((step) => step.nodePath === '/Transition/2' && step.name === 'action' && step.value === 'go'), true);
  assert.equal(calls(stateApi, 'setAttribute').some((step) => step.nodePath === '/Note/3' && step.value === ''), true);
  assert.equal(calls(stateApi, 'deleteNode').some((step) => step.nodePath === '/State/1'), true);

  const classApi = recordingApi();
  walkClassUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'c', text: 'class Animal', nodePath: '/Class/1' },
        { id: 'r', text: 'Animal --> Dog : pet', nodePath: '/Relationship/2' },
        { id: 'm', text: '+String name', nodePath: null }
      ],
      names: { Animal: '/Class/1', Dog: '/Class/3' }
    },
    [
      { op: 'updateText', lineId: 'c', text: 'class Beast', index: 0 },
      { op: 'updateText', lineId: 'r', text: 'Beast *-- Dog : owns', index: 1 },
      { op: 'updateText', lineId: 'm', text: '+int age', index: 2 },
      { op: 'removeLine', lineId: 'c', index: 0 },
      { op: 'moveLine', lineId: 'r', text: 'Beast *-- Dog : owns', index: 0 },
      { op: 'addLine', lineId: 'g', text: 'Pack o-- Dog', index: 2 }
    ],
    classApi
  );
  assert.equal(calls(classApi, 'setAttribute').some((step) => step.nodePath === '/Relationship/2' && step.name === 'kind' && step.value === 'composition'), true);
  assert.equal(created(classApi, 'Relationship', 'g').attributes.kind, 'aggregation');
  assert.equal(calls(classApi, 'deleteNode').some((step) => step.nodePath === '/Class/1'), true);

  const erApi = recordingApi();
  walkErUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'e', text: 'Order {', nodePath: '/Entity/1' },
        { id: 'r', text: 'Order ||--o{ Line : has', nodePath: '/Relationship/2' },
        { id: 'a', text: 'string id PK', nodePath: null }
      ],
      names: { Order: '/Entity/1', Line: '/Entity/3' }
    },
    [
      { op: 'updateText', lineId: 'e', text: 'Sale {', index: 0 },
      { op: 'updateText', lineId: 'r', text: 'Sale ||--|{ Line : contains', index: 1 },
      { op: 'updateText', lineId: 'a', text: 'int qty', index: 2 },
      { op: 'removeLine', lineId: 'r', index: 1 },
      { op: 'moveLine', lineId: 'e', text: 'Sale {', index: 1 }
    ],
    erApi
  );
  assert.equal(calls(erApi, 'setAttribute').some((step) => step.nodePath === '/Relationship/2' && step.name === 'dstCard' && step.value === '|{'), true);
  assert.equal(calls(erApi, 'deleteNode').some((step) => step.nodePath === '/Relationship/2'), true);

  const earsApi = recordingApi();
  walkEarsUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'h', text: '# Title', nodePath: null },
        { id: 'r', text: 'REQ-1 [event] risk=low verifymethod=test', nodePath: '/EARSRequirement/1' },
        { id: 'b', text: 'When it rains, the system shall stop.', nodePath: null }
      ]
    },
    [
      { op: 'updateText', lineId: 'h', text: '# Title revised', index: 0 },
      { op: 'updateText', lineId: 'r', text: 'REQ-2 [state] risk=high verifymethod=analysis', index: 1 },
      { op: 'updateText', lineId: 'b', text: 'While moving, the system shall steer.', index: 2 },
      { op: 'removeLine', lineId: 'b', index: 2 },
      { op: 'moveLine', lineId: 'r', text: 'REQ-2 [state] risk=high verifymethod=analysis', index: 0 },
      { op: 'removeLine', lineId: 'r', index: 0 }
    ],
    earsApi
  );
  assert.equal(calls(earsApi, 'setAttribute').some((step) => step.name === 'reqId' && step.value === 'REQ-2'), true);
  assert.equal(calls(earsApi, 'setAttribute').some((step) => step.name === 'precondition' && step.value === 'moving'), true);
  assert.equal(calls(earsApi, 'deleteNode').some((step) => step.nodePath === '/EARSRequirement/1'), true);

  const reqApi = recordingApi();
  walkRequirementUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'r', text: 'requirement Safety {', nodePath: '/Requirement/1' },
        { id: 'f', text: 'risk: high', nodePath: null },
        { id: 'e', text: 'element Sensor {', nodePath: '/Element/2' },
        { id: 'rel', text: 'Sensor - verifies -> Safety', nodePath: '/Relationship/3' }
      ],
      names: { Safety: '/Requirement/1', Sensor: '/Element/2' }
    },
    [
      { op: 'updateText', lineId: 'f', text: 'risk: low', index: 1 },
      { op: 'updateText', lineId: 'e', text: 'element Camera {', index: 2 },
      { op: 'updateText', lineId: 'rel', text: 'Camera - satisfies -> Safety', index: 3 },
      { op: 'removeLine', lineId: 'f', index: 1 },
      { op: 'addLine', lineId: 'u', text: 'owner: tamas', index: 2 },
      { op: 'moveLine', lineId: 'rel', text: 'Camera - satisfies -> Safety', index: 0 },
      { op: 'removeLine', lineId: 'r', index: 1 }
    ],
    reqApi
  );
  assert.equal(calls(reqApi, 'setAttribute').some((step) => step.nodePath === '/Requirement/1' && step.name === 'risk' && step.value === 'low'), true);
  assert.equal(calls(reqApi, 'setAttribute').some((step) => step.nodePath === '/Requirement/1' && step.name === 'risk' && step.value === ''), true);
  assert.equal(calls(reqApi, 'setAttribute').some((step) => step.nodePath === '/Relationship/3' && step.name === 'kind' && step.value === 'satisfies'), true);

  const c4Api = recordingApi();
  walkC4Update(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'h', text: 'C4Context', nodePath: null },
        { id: 'p', text: 'Person(driver, "Driver", "Ops")', nodePath: '/Person/1' },
        { id: 'rel', text: 'Rel(driver, lead, "Uses")', nodePath: '/Relation/2' }
      ],
      names: { driver: '/Person/1', lead: '/System/3' }
    },
    [
      { op: 'updateText', lineId: 'h', text: 'C4Container', index: 0 },
      { op: 'updateText', lineId: 'p', text: 'Person(driver, "Operator", "Drives")', index: 1 },
      { op: 'updateText', lineId: 'rel', text: 'BiRel(lead, driver, "Sees", "V2X")', index: 2 },
      { op: 'addLine', lineId: 'b', text: 'Boundary(zone, "Vehicle")', index: 3 },
      { op: 'removeLine', lineId: 'p', index: 1 },
      { op: 'moveLine', lineId: 'rel', text: 'BiRel(lead, driver, "Sees", "V2X")', index: 0 }
    ],
    c4Api
  );
  assert.equal(calls(c4Api, 'setAttribute').some((step) => step.name === 'level' && step.value === 'C4Container'), true);
  assert.equal(calls(c4Api, 'setAttribute').some((step) => step.nodePath === '/Person/1' && step.name === 'alias' && step.value === 'Operator'), true);
  assert.equal(calls(c4Api, 'setAttribute').some((step) => step.nodePath === '/Relation/2' && step.name === 'bidirectional' && step.value === 'true'), true);
  assert.equal(created(c4Api, 'Boundary', 'zone').attributes.label, 'Vehicle');

  const archApi = recordingApi();
  walkArchitectureUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'g', text: 'group vehicle(cloud)[Ego]', nodePath: '/Group/1' },
        { id: 's', text: 'service radar(server)[Radar] in vehicle', nodePath: '/Service/2' },
        { id: 'e', text: 'radar:R --> L:hmi', nodePath: '/Edge/3' }
      ],
      names: { vehicle: '/Group/1', radar: '/Service/2', hmi: '/Service/4' }
    },
    [
      { op: 'updateText', lineId: 'g', text: 'group vehicle(car)[Vehicle]', index: 0 },
      { op: 'updateText', lineId: 's', text: 'service radar(disk)[RadarECU] in other', index: 1 },
      { op: 'updateText', lineId: 'e', text: 'hmi:L --> R:radar', index: 2 },
      { op: 'removeLine', lineId: 's', index: 1 },
      { op: 'moveLine', lineId: 'e', text: 'hmi:L --> R:radar', index: 0 }
    ],
    archApi
  );
  assert.equal(calls(archApi, 'setAttribute').some((step) => step.nodePath === '/Group/1' && step.name === 'label' && step.value === 'Vehicle'), true);
  assert.equal(calls(archApi, 'setAttribute').some((step) => step.nodePath === '/Service/2' && step.name === 'inGroup' && step.value === 'other'), true);
  assert.equal(calls(archApi, 'setAttribute').some((step) => step.nodePath === '/Edge/3' && step.name === 'srcSide' && step.value === 'L'), true);
  assert.equal(calls(archApi, 'deleteNode').some((step) => step.nodePath === '/Service/2'), true);

  const useApi = recordingApi();
  walkUsecaseUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'd', text: 'direction LR', nodePath: null },
        { id: 'a', text: 'actor Modeler', nodePath: '/Actor/1' },
        { id: 'u', text: '(Import Mermaid)', nodePath: '/UseCase/2' },
        { id: 'l', text: 'Modeler --> (Import Mermaid)', nodePath: '/Link/3' }
      ]
    },
    [
      { op: 'updateText', lineId: 'd', text: 'direction TD', index: 0 },
      { op: 'updateText', lineId: 'a', text: 'actor Engineer', index: 1 },
      { op: 'updateText', lineId: 'u', text: '(Export Mermaid)', index: 2 },
      { op: 'updateText', lineId: 'l', text: 'Engineer --> (Export Mermaid)', index: 3 },
      { op: 'removeLine', lineId: 'a', index: 1 },
      { op: 'moveLine', lineId: 'l', text: 'Engineer --> (Export Mermaid)', index: 0 }
    ],
    useApi
  );
  assert.equal(calls(useApi, 'setAttribute').some((step) => step.name === 'direction' && step.value === 'TD'), true);
  assert.equal(calls(useApi, 'setAttribute').some((step) => step.nodePath === '/Actor/1' && step.name === 'alias' && step.value === 'Engineer'), true);
  assert.equal(calls(useApi, 'setPointer').some((step) => step.nodePath === '/Link/3' && step.name === 'dst'), true);

  const ganttApi = recordingApi();
  walkGanttUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 's', text: 'section Meta', nodePath: '/Section/1' },
        { id: 't', text: 'Survey :done, a1, 2026-11-01, 3d', nodePath: '/Task/2' },
        { id: 'f', text: 'dateFormat YYYY-MM-DD', nodePath: null }
      ],
      names: { a1: '/Task/2', Meta: '/Section/1' }
    },
    [
      { op: 'updateText', lineId: 's', text: 'section Build', index: 0 },
      { op: 'updateText', lineId: 't', text: 'Survey :active, a1, 2026-11-02, 4d', index: 1 },
      { op: 'updateText', lineId: 'f', text: 'excludes weekends', index: 2 },
      { op: 'addLine', lineId: 'ax', text: 'axisFormat %m', index: 3 },
      { op: 'removeLine', lineId: 't', index: 1 },
      { op: 'moveLine', lineId: 's', text: 'section Build', index: 1 }
    ],
    ganttApi
  );
  assert.equal(calls(ganttApi, 'setAttribute').some((step) => step.nodePath === '/Task/2' && step.name === 'status' && step.value === 'active'), true);
  assert.equal(calls(ganttApi, 'setAttribute').some((step) => step.name === 'excludes' && step.value === 'weekends'), true);
  assert.equal(calls(ganttApi, 'setAttribute').some((step) => step.name === 'axisFormat' && step.value === '%m'), true);
  assert.equal(calls(ganttApi, 'deleteNode').some((step) => step.nodePath === '/Task/2'), true);
});

function coreApi(host) {
  const { core } = host;
  return {
    async listMeta() {
      return Object.values(core.getAllMetaNodes(host.root));
    },
    name(node) {
      return core.getAttribute(node, 'name');
    },
    namespace(node) {
      return core.getNamespace(node) || '';
    },
    attribute(node, name) {
      return core.getAttribute(node, name);
    },
    base(node) {
      return core.getBase(node);
    },
    async setAttribute(node, name, value) {
      core.setAttribute(node, name, value);
    },
    async children(node) {
      return core.loadChildren(node);
    },
    isInstanceOf(node, base) {
      return core.isInstanceOf(node, base);
    },
    id(node) {
      return core.getPath(node);
    },
    async create(parent, base, name, source) {
      const node = core.createNode({ parent, base });
      core.setAttribute(node, 'name', name);
      if (source) core.setAttribute(node, 'source', source);
      return core.getPath(node);
    }
  };
}

function modelApi(host) {
  const { core, root } = host;
  const byPath = new Map();
  function keep(node) {
    const path = core.getPath(node);
    byPath.set(path, node);
    return path;
  }
  const metas = Object.values(core.getAllMetaNodes(root));
  function concept(name) {
    return metas.find((node) =>
      core.getAttribute(node, 'name') === name && core.getNamespace(node) === 'sequence'
    );
  }
  return {
    byPath,
    keep,
    concept,
    createChild(parentPath, baseName, attributes) {
      const node = core.createNode({ parent: byPath.get(parentPath), base: concept(baseName) });
      Object.keys(attributes).forEach((name) => core.setAttribute(node, name, attributes[name]));
      assert.equal(core.isValidChildOf(node, byPath.get(parentPath)), true);
      return keep(node);
    },
    setAttribute(nodePath, name, value) {
      core.setAttribute(byPath.get(nodePath), name, value);
    },
    setPointer(nodePath, name, targetPath) {
      const node = byPath.get(nodePath);
      const target = byPath.get(targetPath);
      assert.equal(core.isValidTargetOf(target, node, name), true);
      core.setPointer(node, name, target);
    },
    deleteNode(nodePath) {
      core.deleteNode(byPath.get(nodePath));
      byPath.delete(nodePath);
    }
  };
}

test('a sequence message inside a fragment is a valid child with participant ends', async () => {
  const host = await createMddProject({ libraries: ['sequence'] });
  try {
    const { core, root } = host;
    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'sequence',
      name: 'obstacle',
      source: 'sequenceDiagram\n'
    });
    const api = modelApi(host);
    api.keep(await core.loadByPath(root, diagramPath));
    const walked = walkSequenceUpdate(
      { diagramNodePath: diagramPath, lines: [] },
      adds([
        'actor Driver',
        'participant FusionApp',
        'Driver->>FusionApp: CACC engaged',
        'alt confidence >= threshold',
        'FusionApp->>FusionApp: PlausibilityCheck',
        'end'
      ]),
      api
    );
    const message = api.byPath.get(walked.bindings.find((item) => item.lineId === 'ln5').nodePath);
    const fragment = api.byPath.get(walked.bindings.find((item) => item.lineId === 'ln4').nodePath);
    assert.equal(core.getParent(message), fragment);
    assert.equal(core.isInstanceOf(message, api.concept('Message')), true);
    assert.equal(core.getAttribute(api.byPath.get(core.getPointerPath(message, 'from')), 'name'), 'FusionApp');
    assert.equal(core.getAttribute(api.byPath.get(core.getPointerPath(message, 'to')), 'name'), 'FusionApp');
    assert.deepEqual(core.getValidSetNames(api.concept('Message')), []);
  } finally {
    await host.close();
  }
});
