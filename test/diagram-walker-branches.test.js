'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { classifyArchitectureLine, walkArchitectureUpdate, createGroup, createService, createArchitectureEdge, setGroupText, setServiceText, setArchitectureEdgeEnds } = require('../studio/src/control/architectureUpdate.cjs');
const { classifyC4Line, walkC4Update, createC4Element, createC4Relation, setC4ElementText, setC4RelationText, setC4Level, setC4Title } = require('../studio/src/control/c4Update.cjs');
const { classifyClassLine, walkClassUpdate, createClassRelationship, setClassRelationshipText, setClassTitle } = require('../studio/src/control/classUpdate.cjs');
const { classifyEarsLine, walkEarsUpdate, createEarsRequirement, setEarsHeader, setEarsBody, setEarsTitle } = require('../studio/src/control/earsUpdate.cjs');
const { classifyErLine, walkErUpdate, createErRelationship, setErRelationshipText } = require('../studio/src/control/erUpdate.cjs');
const { classifyGanttLine, walkGanttUpdate, createTask, setGanttAttribute } = require('../studio/src/control/ganttUpdate.cjs');
const { classifyRequirementLine, walkRequirementUpdate, createTraceRelationship } = require('../studio/src/control/requirementUpdate.cjs');
const { classifyStateLine, walkStateUpdate, createState, createTransition, createStateNote, setStateText } = require('../studio/src/control/stateUpdate.cjs');
const { classifyUsecaseLine, walkUsecaseUpdate, setUsecaseTitle } = require('../studio/src/control/usecaseUpdate.cjs');

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

function adds(lines) {
  return lines.map((text, index) => ({ op: 'addLine', lineId: 'ln' + (index + 1), text, index }));
}

function run(walk, lines, extra) {
  const api = recordingApi();
  const result = walk(Object.assign({ diagramNodePath: '/a/d', lines: [] }, extra), adds(lines), api);
  return { api, result };
}

test('empty, comment, and partial lines exercise the remaining walker branches', () => {
  assert.equal(classifyArchitectureLine().kind, 'comment');
  assert.equal(classifyArchitectureLine('%% note').kind, 'comment');
  assert.equal(classifyArchitectureLine('group bare').label, 'bare');
  assert.equal(classifyC4Line(null).kind, 'comment');
  assert.equal(classifyC4Line('%% note').kind, 'comment');
  assert.equal(classifyClassLine('').kind, 'comment');
  assert.equal(classifyClassLine('%% note').kind, 'comment');
  assert.equal(classifyClassLine('#hidden').kind, 'member');
  assert.equal(classifyClassLine('eat()').kind, 'member');
  assert.equal(classifyEarsLine(null).kind, 'blank');
  assert.equal(classifyEarsLine('%% note').kind, 'comment');
  assert.equal(classifyEarsLine('REQ-1').pattern, 'ubiquitous');
  assert.equal(classifyErLine('').kind, 'comment');
  assert.equal(classifyErLine('%% note').kind, 'comment');
  assert.equal(classifyGanttLine(null).kind, 'comment');
  assert.equal(classifyGanttLine('%% note').kind, 'comment');
  assert.equal(classifyRequirementLine('').kind, 'comment');
  assert.equal(classifyRequirementLine('%% note').kind, 'comment');
  assert.equal(classifyStateLine(undefined).kind, 'comment');
  assert.equal(classifyStateLine('%% note').kind, 'comment');
  assert.equal(classifyUsecaseLine('').kind, 'comment');
  assert.equal(classifyUsecaseLine('%% note').kind, 'comment');

  const architecture = run(walkArchitectureUpdate, [
    '%% skip',
    'architecture-beta',
    'group bare',
    'group vehicle(cloud)[Ego]',
    'group vehicle(bus)[Vehicle]',
    'service lone',
    'service radar(server)[Radar] in vehicle',
    'service radar(disk)[RadarECU] in vehicle',
    'radar:R --> L:hmi',
    'nowhere'
  ]);
  assert.equal(architecture.result.names.bare, architecture.result.bindings.find((item) => item.lineId === 'ln3').nodePath);
  assert.equal(architecture.result.names.vehicle, architecture.result.bindings.find((item) => item.lineId === 'ln4').nodePath);

  const archApi = recordingApi();
  walkArchitectureUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'g', text: 'group vehicle(cloud)[Ego]', nodePath: '/Group/1' },
        { id: 's', text: 'service radar(server)[Radar] in vehicle', nodePath: '/Service/2' },
        { id: 'e', text: 'radar:R --> L:hmi', nodePath: '/Edge/3' },
        { id: 'u', text: 'group plain', nodePath: null },
        { id: 'c', text: '%% skip', nodePath: null }
      ],
      names: { vehicle: '/Group/1', radar: '/Service/2', hmi: '/Service/4', fusion: '/Service/5' }
    },
    [
      { op: 'updateText', lineId: 'g', text: 'group bus(car)[Bus]', index: 0 },
      { op: 'updateText', lineId: 's', text: 'service camera(disk)[Camera]', index: 1 },
      { op: 'updateText', lineId: 'e', text: 'radar:T --> L:hmi', index: 2 },
      { op: 'updateText', lineId: 'e', text: 'radar:T --> R:fusion', index: 2 },
      { op: 'updateText', lineId: 'u', text: 'group plain', index: 3 },
      { op: 'updateText', lineId: 'c', text: '%% still', index: 4 },
      { op: 'removeLine', lineId: 'c', index: 4 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'moveLine', lineId: 'c', text: '%% still', index: 0 },
      { op: 'addLine', lineId: 'edge', text: 'ghost:R --> L:hmi', index: 5 }
    ],
    archApi
  );
  assert.equal(archApi.steps.some((step) => step.name === 'srcSide' && step.value === 'T'), true);

  const c4 = run(walkC4Update, [
    '%% skip',
    'C4Context',
    'title Context',
    'Person(driver)',
    'Person(a, "Hello, there", "desc")',
    'System(core)',
    'Component(app, "App", "Node", "In process")',
    'Container(box, "Box")',
    'Boundary(zone)',
    'Boundary()',
    'Rel(driver, core)',
    'Person(driver, "Driver", "More")',
    'mystery'
  ]);
  assert.equal(c4.result.names.driver, c4.result.bindings.find((item) => item.lineId === 'ln4').nodePath);
  assert.equal(c4.api.steps.some((step) => step.attributes && step.attributes.alias === 'Hello, there'), true);

  const c4Api = recordingApi();
  walkC4Update(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 't', text: 'title Context', nodePath: null },
        { id: 'b', text: 'Boundary(zone, "Vehicle")', nodePath: '/Boundary/1' },
        { id: 's', text: 'System(core, "Core", "Runs")', nodePath: '/System/2' },
        { id: 'box', text: 'Container(box, "Box", "Java", "Service")', nodePath: '/Container/3' },
        { id: 'rel', text: 'Rel(core, box, "Calls", "HTTP")', nodePath: '/Relation/4' },
        { id: 'p', text: 'Person(new, "New", "User")', nodePath: null }
      ],
      names: { zone: '/Boundary/1', core: '/System/2', box: '/Container/3' }
    },
    [
      { op: 'updateText', lineId: 't', text: 'title Context revised', index: 0 },
      { op: 'updateText', lineId: 'b', text: 'Boundary(area, "Area")', index: 1 },
      { op: 'updateText', lineId: 's', text: 'System_Ext(core, "Core", "Outside")', index: 2 },
      { op: 'updateText', lineId: 'box', text: 'Container(box, "Box", "Go", "Service")', index: 3 },
      { op: 'updateText', lineId: 'rel', text: 'Rel(core, box, "Uses")', index: 4 },
      { op: 'updateText', lineId: 'p', text: 'Person(new, "Newer", "User")', index: 5 },
      { op: 'updateText', lineId: 'missing', text: 'title Added', index: 0 },
      { op: 'removeLine', lineId: 't', index: 0 },
      { op: 'addLine', lineId: 'u', text: 'not a call', index: 6 }
    ],
    c4Api
  );
  assert.equal(c4Api.steps.some((step) => step.name === 'technology' && step.value === 'Go'), true);
  assert.equal(c4Api.steps.some((step) => step.name === 'external' && step.value === 'true'), true);

  const classApi = run(walkClassUpdate, [
    '%% skip',
    'title Classes',
    'class Animal',
    'class Animal',
    '#hidden',
    'eat()',
    'Owner --> Animal',
    'Owner --> Beast : keeps'
  ]);
  assert.equal(classApi.result.skipped.length, 2);

  const classEdit = recordingApi();
  walkClassUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 't', text: 'title Classes', nodePath: null },
        { id: 'c', text: 'class Animal', nodePath: null },
        { id: 'r', text: 'Animal --> Dog : pet', nodePath: '/Relationship/1' },
        { id: 'm', text: '+String name', nodePath: null }
      ],
      names: { Animal: '/Class/1', Dog: '/Class/2', Beast: '/Class/3' }
    },
    [
      { op: 'updateText', lineId: 't', text: 'title Classes', index: 0 },
      { op: 'updateText', lineId: 't', text: 'title Revised', index: 0 },
      { op: 'updateText', lineId: 'c', text: 'class Animal', index: 1 },
      { op: 'updateText', lineId: 'r', text: 'Animal --> Beast : pet', index: 2 },
      { op: 'updateText', lineId: 'm', text: '+int age', index: 3 },
      { op: 'removeLine', lineId: 'm', index: 3 },
      { op: 'removeLine', lineId: 'gone', index: 0 },
      { op: 'updateText', lineId: 'gone', text: 'leftover', index: 0 }
    ],
    classEdit
  );
  assert.equal(classEdit.steps.some((step) => step.call === 'setPointer' && step.name === 'dst' && step.targetPath === '/Class/3'), true);

  const ears = run(walkEarsUpdate, [
    '%% skip',
    '# Title',
    '',
    'REQ-1',
    '%% still',
    'When it rains, the system shall stop.',
    '',
    'loose prose'
  ]);
  assert.equal(ears.api.steps.some((step) => step.name === 'trigger' && step.value === 'it rains'), true);
  assert.equal(ears.api.steps.filter((step) => step.name === 'text').length, 1);

  const earsEdit = recordingApi();
  walkEarsUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'r', text: 'REQ-1 [event] risk=low verifymethod=test', nodePath: null },
        { id: 'b', text: 'When it rains, the system shall stop.', nodePath: null },
        { id: 'm', text: '%% skip', nodePath: '/EARSRequirement/9' }
      ],
      names: { 'REQ-1': '/EARSRequirement/1' }
    },
    [
      { op: 'addLine', lineId: 'n', text: 'REQ-1 [state] risk=high verifymethod=analysis', index: 0 },
      { op: 'updateText', lineId: 'r', text: 'REQ-1 [event] risk=low verifymethod=test', index: 1 },
      { op: 'updateText', lineId: 'b', text: 'The system shall wait.', index: 2 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'moveLine', lineId: 'b', text: 'The system shall wait.', index: 0 },
      { op: 'updateText', lineId: 'missing', text: 'When it rains, the system shall stop.' }
    ],
    earsEdit
  );
  assert.equal(earsEdit.steps.some((step) => step.nodePath === '/EARSRequirement/1' && step.name === 'pattern' && step.value === 'state'), true);

  const er = run(walkErUpdate, [
    '%% skip',
    'A -- B',
    'Order ||-- Line',
    'CUSTOMER',
    'CUSTOMER',
    'string id PK',
    'leftover words'
  ]);
  assert.equal(er.result.names.CUSTOMER, er.result.bindings.find((item) => item.lineId === 'ln4').nodePath);
  assert.equal(er.result.skipped.length >= 1, true);

  const erEdit = recordingApi();
  walkErUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'e', text: 'Order', nodePath: null },
        { id: 'r', text: 'Order ||--o{ Line : has', nodePath: '/Relationship/1' },
        { id: 'a', text: 'string id PK', nodePath: null }
      ],
      names: { Order: '/Entity/1', Line: '/Entity/2', Sale: '/Entity/3' }
    },
    [
      { op: 'updateText', lineId: 'e', text: 'Order', index: 0 },
      { op: 'updateText', lineId: 'r', text: 'Sale ||--o{ Line : has', index: 1 },
      { op: 'updateText', lineId: 'a', text: 'int qty', index: 2 },
      { op: 'removeLine', lineId: 'e', index: 0 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'updateText', lineId: 'missing', text: 'nope', index: 0 }
    ],
    erEdit
  );
  assert.equal(erEdit.steps.some((step) => step.call === 'deleteNode' && step.nodePath === '/Entity/1'), true);
  assert.equal(erEdit.steps.some((step) => step.call === 'setPointer' && step.name === 'src'), true);

  const gantt = run(walkGanttUpdate, [
    '%% skip',
    'section Meta',
    'section Meta',
    'Survey :done, a1, 2026-11-01, 3d',
    ':dangling',
    'plain'
  ]);
  assert.equal(gantt.result.names.Meta, gantt.result.bindings.find((item) => item.lineId === 'ln2').nodePath);

  const ganttEdit = recordingApi();
  walkGanttUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 's', text: 'section Meta', nodePath: null },
        { id: 't', text: 'Survey :done, a1, 2026-11-01, 3d', nodePath: '/Task/2' },
        { id: 'f', text: 'dateFormat YYYY-MM-DD', nodePath: null }
      ],
      names: { Meta: '/Section/1', a1: '/Task/2' }
    },
    [
      { op: 'updateText', lineId: 's', text: 'section Meta', index: 0 },
      { op: 'updateText', lineId: 't', text: 'Survey :done, a9, 2026-11-01, 3d', index: 1 },
      { op: 'updateText', lineId: 'f', text: 'dateFormat YYYY-MM-DD', index: 2 },
      { op: 'removeLine', lineId: 's', index: 0 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'updateText', lineId: 'missing', text: 'gantt', index: 0 }
    ],
    ganttEdit
  );
  assert.equal(ganttEdit.steps.some((step) => step.nodePath === '/Task/2' && step.name === 'taskId' && step.value === 'a9'), true);

  const requirement = run(walkRequirementUpdate, [
    '%% skip',
    'requirement Safety',
    'requirement Safety',
    'element Sensor {',
    '}',
    'id: plain',
    'leftover'
  ]);
  assert.equal(requirement.result.names.Safety, requirement.result.bindings.find((item) => item.lineId === 'ln2').nodePath);

  const reqEdit = recordingApi();
  walkRequirementUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'r', text: 'requirement Safety {', nodePath: null },
        { id: 'e', text: 'element Sensor', nodePath: '/Element/2' },
        { id: 'rel', text: 'Sensor - verifies -> Safety', nodePath: '/Relationship/3' }
      ],
      names: { Safety: '/Requirement/1', Sensor: '/Element/2', Camera: '/Element/4' }
    },
    [
      { op: 'addLine', lineId: 'f', text: 'id: 1', index: 1 },
      { op: 'updateText', lineId: 'r', text: 'requirement Safety', index: 0 },
      { op: 'updateText', lineId: 'rel', text: 'Sensor - verifies -> Camera', index: 2 },
      { op: 'removeLine', lineId: 'e', index: 1 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'updateText', lineId: 'missing', text: '}', index: 0 }
    ],
    reqEdit
  );
  assert.equal(reqEdit.steps.some((step) => step.call === 'setPointer' && step.name === 'dst' && step.targetPath === '/Element/4'), true);

  const state = run(walkStateUpdate, [
    '%% skip',
    'state Off',
    'state Off',
    '[*] --> Off : go [ready]',
    'note over Off',
    'end note',
    'after the note'
  ]);
  assert.equal(state.api.steps.some((step) => step.attributes && step.attributes.guard === 'ready' && !step.attributes.action), true);

  const stateEdit = recordingApi();
  walkStateUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 's', text: 'state Busy {', nodePath: null },
        { id: 'n', text: 'note right of Off: parked', nodePath: '/Note/1' },
        { id: 'e', text: 'end note', nodePath: null },
        { id: 'p', text: 'still', nodePath: null },
        { id: 't', text: 'Off --> On: go', nodePath: '/Transition/2' },
        { id: 'u', text: 'state Idle', nodePath: null }
      ],
      names: { Off: '/State/1', On: '/State/2', Busy: '/State/3' }
    },
    [
      { op: 'addLine', lineId: 'inner', text: 'Busy --> On: tick', index: 1 },
      { op: 'updateText', lineId: 'n', text: 'note left of Off: parked', index: 1 },
      { op: 'updateText', lineId: 't', text: 'Off --> Busy: go', index: 4 },
      { op: 'updateText', lineId: 'u', text: 'state Idle', index: 5 },
      { op: 'updateText', lineId: 'p', text: 'still there', index: 3 },
      { op: 'removeLine', lineId: 'e', index: 2 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'updateText', lineId: 'missing', text: '%% skip' }
    ],
    stateEdit
  );
  assert.equal(stateEdit.steps.some((step) => step.call === 'setPointer' && step.name === 'dst' && step.targetPath === '/State/3'), true);

  const usecase = run(walkUsecaseUpdate, [
    '%% skip',
    'title Uses',
    'actor Modeler',
    '(Import)',
    '(Import)',
    'nowhere'
  ]);
  assert.equal(usecase.api.steps.filter((step) => step.baseName === 'UseCase').length, 1);

  const useEdit = recordingApi();
  walkUsecaseUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 't', text: 'title Uses', nodePath: null },
        { id: 'u', text: '(Import)', nodePath: '/UseCase/1' },
        { id: 'a', text: 'actor Modeler', nodePath: null },
        { id: 'x', text: 'leftover', nodePath: null }
      ]
    },
    [
      { op: 'updateText', lineId: 't', text: 'title Revised', index: 0 },
      { op: 'updateText', lineId: 'u', text: 'actor Reader', index: 1 },
      { op: 'updateText', lineId: 'a', text: 'actor Modeler', index: 2 },
      { op: 'updateText', lineId: 'x', text: 'still leftover', index: 3 },
      { op: 'removeLine', lineId: 'missing', index: 0 },
      { op: 'moveLine', lineId: 'x', text: 'still leftover', index: 0 }
    ],
    useEdit
  );
  assert.equal(useEdit.steps.some((step) => step.call === 'deleteNode' && step.nodePath === '/UseCase/1'), true);

  walkArchitectureUpdate(null, null, recordingApi());
  walkStateUpdate({}, null, recordingApi());
});

test('named transactions accept a spec that leaves optional fields empty', () => {
  const api = recordingApi();
  createGroup(api, '/a/d', { name: 'g' });
  createService(api, '/a/d', { name: 's' });
  createArchitectureEdge(api, '/a/d', { name: 'e' });
  setGroupText(api, '/Group/1', null, { icon: '', label: '' });
  setGroupText(api, '/Group/1', { icon: 'a', label: 'b' }, { icon: 'a', label: 'b' });
  setServiceText(api, '/Service/1', null, { icon: '', label: '', inGroup: '' });
  setArchitectureEdgeEnds(api, '/Edge/1', null, { srcSide: '', dstSide: '' }, null, null);

  createC4Element(api, '/a/d', { concept: 'Person', name: 'p' });
  createC4Element(api, '/a/d', { concept: 'Boundary', name: 'b' });
  createC4Element(api, '/a/d', { concept: 'Container', name: 'c' });
  createC4Relation(api, '/a/d', { name: 'r' });
  setC4ElementText(api, '/Person/1', null, { concept: 'Person', alias: '', description: '', external: '', keyword: 'Person' });
  setC4ElementText(api, '/Boundary/1', null, { concept: 'Boundary', label: '', keyword: 'Boundary' });
  setC4ElementText(api, '/Container/1', { concept: 'Container', alias: 'a', description: 'd', external: 'false', keyword: 'Container', technology: 'Java' }, { concept: 'Container', alias: 'a', description: 'd', external: 'false', keyword: 'Container', technology: 'Java' });
  setC4RelationText(api, '/Relation/1', null, { label: '', technology: '', bidirectional: '' });
  setC4Level(api, null, 'C4Context');
  setC4Title(api, null, 'title');

  createClassRelationship(api, '/a/d', { name: 'r' });
  setClassRelationshipText(api, '/Relationship/1', null, { relKind: 'association', label: '', srcCard: '', dstCard: '' });
  setClassRelationshipText(api, '/Relationship/1', { relKind: 'association', label: '', srcCard: '', dstCard: '' }, { relKind: 'association', label: '', srcCard: '', dstCard: '' });
  setClassTitle(api, null, 'title');

  createEarsRequirement(api, '/a/d', { reqId: 'REQ-1' });
  setEarsHeader(api, '/EARSRequirement/1', null, { reqId: 'REQ-1', pattern: 'event', risk: '', verifymethod: '' });
  setEarsHeader(api, '/EARSRequirement/1', { reqId: 'REQ-1', pattern: 'event', risk: '', verifymethod: '' }, { reqId: 'REQ-1', pattern: 'event', risk: '', verifymethod: '' });
  setEarsBody(api, '/EARSRequirement/1', '', 'event');
  setEarsTitle(api, null, 'title');

  createErRelationship(api, '/a/d', { name: 'r' });
  setErRelationshipText(api, '/Relationship/2', null, { label: '', srcCard: '', dstCard: '' });
  setErRelationshipText(api, '/Relationship/2', { label: '', srcCard: '', dstCard: '' }, { label: '', srcCard: '', dstCard: '' });

  createTask(api, '/a/d', { name: 'Task' });
  setGanttAttribute(api, null, 'title', 'none');

  createTraceRelationship(api, '/a/d', { name: 'r' });

  createState(api, '/a/d', { name: '[*]' });
  createState(api, '/a/d', {});
  createTransition(api, '/a/d', { name: 't', srcPath: '/State/1' });
  createStateNote(api, '/a/d', { name: 'n' });
  setStateText(api, '/State/1', { name: 'Off', stateKind: 'simple' }, { name: '[*]' });

  setUsecaseTitle(api, null, 'title');

  assert.equal(api.steps.some((step) => step.call === 'createChild' && step.baseName === 'Group' && step.attributes.icon === ''), true);
  assert.equal(api.steps.some((step) => step.call === 'createChild' && step.baseName === 'Task' && step.attributes.taskId === ''), true);
  assert.equal(api.steps.filter((step) => step.call === 'setAttribute' && step.name === 'title' && step.nodePath === null).length, 0);
});
