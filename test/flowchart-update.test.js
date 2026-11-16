'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createSession, noteContentChanges, foldEdits } = require('../studio/src/control/sourceEdits.cjs');
const {
  classifyFlowLine,
  createFlowEdge,
  setFlowEdgeEnds,
  setFlowEdgeText,
  setFlowNodeText,
  setSubgraphText,
  walkFlowchartUpdate
} = require('../studio/src/control/flowchartUpdate.cjs');
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

test('an added flowchart edge creates its nodes and points src and dst at them', () => {
  const api = recordingApi();
  const walked = walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [{ id: 'ln1', text: 'flowchart TD', nodePath: null }]
    },
    [{
      op: 'addLine',
      lineId: 'ln2',
      text: '  Start([Start]) --> Decide{Ready?}',
      index: 1
    }],
    api
  );

  const created = calls(api, 'createChild');
  assert.deepEqual(created.map((step) => [step.baseName, step.attributes.name, step.attributes.shape || step.attributes.lineStyle]), [
    ['Node', 'Start', 'stadium'],
    ['Node', 'Decide', 'decision'],
    ['Edge', 'ln2', '-->']
  ]);
  assert.equal(created[0].attributes.label, 'Start');
  assert.equal(created[1].attributes.label, 'Ready?');
  assert.equal(created[0].parentPath, '/a/d');
  const pointers = calls(api, 'setPointer');
  assert.deepEqual(pointers.map((step) => [step.name, step.targetPath]), [
    ['src', '/Node/1'],
    ['dst', '/Node/2']
  ]);
  assert.deepEqual(walked.bindings, [{ lineId: 'ln2', nodePath: '/Edge/3' }]);
});

test('editing an edge label sets that attribute and leaves the ends', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'flowchart TD', nodePath: null },
        { id: 'ln2', text: 'Decide --> Work', nodePath: '/a/d/e' }
      ]
    },
    [{
      op: 'updateText',
      lineId: 'ln2',
      nodePath: '/a/d/e',
      text: 'Decide -->|Yes| Work',
      index: 1
    }],
    api
  );
  assert.deepEqual(api.steps, [
    { call: 'setAttribute', nodePath: '/a/d/e', name: 'label', value: 'Yes' }
  ]);
});

test('removing a linked node deletes that element', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [{ id: 'ln1', text: 'Work[Do work]', nodePath: '/a/d/n' }]
    },
    [{ op: 'removeLine', lineId: 'ln1', nodePath: '/a/d/n', text: 'Work[Do work]' }],
    api
  );
  assert.deepEqual(api.steps, [{ call: 'deleteNode', nodePath: '/a/d/n' }]);
});

test('a move records the new order of the existing element', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'A[One]', nodePath: '/a/d/1' },
        { id: 'ln2', text: 'B[Two]', nodePath: '/a/d/2' }
      ]
    },
    [{ op: 'moveLine', lineId: 'ln2', nodePath: '/a/d/2', text: 'B[Two]', index: 0 }],
    api
  );
  assert.deepEqual(api.steps, [
    { call: 'setAttribute', nodePath: '/a/d/2', name: 'order', value: 0 }
  ]);
});

test('an edge added inside a known subgraph is created there', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'flowchart TD', nodePath: null },
        { id: 'ln2', text: 'subgraph one [One]', nodePath: '/a/d/s' },
        { id: 'ln3', text: 'end', nodePath: null }
      ]
    },
    [{ op: 'addLine', lineId: 'ln4', text: 'A --> B', index: 2 }],
    api
  );
  const created = calls(api, 'createChild');
  assert.equal(created.find((step) => step.baseName === 'Edge').parentPath, '/a/d/s');
  assert.equal(calls(api, 'deleteNode').length, 0);
});

test('rewriting a node line into an edge deletes the node and creates the edge', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [{ id: 'ln1', text: 'A[Alone]', nodePath: '/a/d/n' }]
    },
    [{ op: 'updateText', lineId: 'ln1', nodePath: '/a/d/n', text: 'A --> B', index: 0 }],
    api
  );
  assert.equal(api.steps[0].call, 'deleteNode');
  assert.equal(api.steps[0].nodePath, '/a/d/n');
  assert.ok(calls(api, 'createChild').some((step) => step.baseName === 'Edge'));
  assert.equal(calls(api, 'setPointer').length, 2);
});

test('a direction edit sets the diagram direction', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [{ id: 'ln1', text: 'flowchart TD', nodePath: null }]
    },
    [{ op: 'updateText', lineId: 'ln1', nodePath: null, text: 'flowchart LR', index: 0 }],
    api
  );
  assert.deepEqual(api.steps, [
    { call: 'setAttribute', nodePath: '/a/d', name: 'direction', value: 'LR' }
  ]);
});

test('node, title, and subgraph lines create and then update their own fields', () => {
  const api = recordingApi();
  const walked = walkFlowchartUpdate(
    { diagramNodePath: '/a/d', lines: [] },
    [
      { op: 'addLine', lineId: 'ln1', text: 'flowchart LR', index: 0 },
      { op: 'addLine', lineId: 'ln2', text: 'title Hello', index: 1 },
      { op: 'addLine', lineId: 'ln3', text: 'Work[Do work]', index: 2 },
      { op: 'addLine', lineId: 'ln4', text: 'subgraph gate [Gate] direction TD', index: 3 },
      { op: 'addLine', lineId: 'ln5', text: '%% a note', index: 4 },
      { op: 'addLine', lineId: 'ln6', text: 'not a statement', index: 5 }
    ],
    api
  );
  assert.deepEqual(calls(api, 'setAttribute').map((step) => [step.name, step.value]), [
    ['direction', 'LR'],
    ['title', 'Hello']
  ]);
  assert.equal(calls(api, 'createChild').map((step) => step.baseName).join(','), 'Node,Subgraph');
  assert.equal(walked.names.Work, '/Node/1');
  assert.equal(walked.names.gate, '/Subgraph/2');

  const again = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'title Hello', nodePath: null },
        { id: 'ln2', text: 'Work[Do work]', nodePath: '/a/d/n' },
        { id: 'ln3', text: 'subgraph gate [Gate]', nodePath: '/a/d/s' }
      ]
    },
    [
      { op: 'updateText', lineId: 'ln1', text: 'title There', index: 0 },
      { op: 'updateText', lineId: 'ln2', nodePath: '/a/d/n', text: 'Task((Do work))', index: 1 },
      { op: 'updateText', lineId: 'ln3', nodePath: '/a/d/s', text: 'subgraph room [Room] direction LR', index: 2 }
    ],
    again
  );
  assert.deepEqual(again.steps.map((step) => [step.name, step.value]), [
    ['title', 'There'],
    ['name', 'Task'],
    ['shape', 'circle'],
    ['name', 'room'],
    ['label', 'Room'],
    ['direction', 'LR']
  ]);
});

test('an unchanged node and a comment edit leave the model, and a removed edge is deleted', () => {
  const api = recordingApi();
  const walked = walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'A[One]', nodePath: '/a/d/n' },
        { id: 'ln2', text: '%% keep', nodePath: null },
        { id: 'ln3', text: 'end', nodePath: null },
        { id: 'ln4', text: 'A --> B', nodePath: '/a/d/e' }
      ]
    },
    [
      { op: 'updateText', lineId: 'ln1', nodePath: '/a/d/n', text: 'A[One]', index: 0 },
      { op: 'updateText', lineId: 'ln2', text: '%% still', index: 1 },
      { op: 'removeLine', lineId: 'ln2', text: '%% keep' },
      { op: 'removeLine', lineId: 'missing', text: 'gone' },
      { op: 'removeLine', lineId: 'ln4', nodePath: '/a/d/e', text: 'A --> B' },
      { op: 'moveLine', lineId: 'ln2', text: '%% keep', index: 0 },
      { op: 'updateText', lineId: 'absent', text: 'C[New]', index: 0 },
      { op: 'mystery' }
    ],
    api
  );
  assert.deepEqual(api.steps.filter((step) => step.call === 'deleteNode'), [
    { call: 'deleteNode', nodePath: '/a/d/e' }
  ]);
  assert.equal(calls(api, 'createChild')[0].attributes.name, 'C');
  assert.equal(walked.names.A, '/a/d/n');
  assert.equal(walked.names.C, '/Node/1');
});

test('retargeting an edge reuses a known node and creates the missing one', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'A[One]', nodePath: '/a/d/a' },
        { id: 'ln2', text: 'A --> B', nodePath: '/a/d/e' }
      ]
    },
    [{ op: 'updateText', lineId: 'ln2', nodePath: '/a/d/e', text: 'A -.-> C[Next]', index: 1 }],
    api
  );
  assert.deepEqual(calls(api, 'setPointer').map((step) => [step.name, step.targetPath]), [
    ['src', '/a/d/a'],
    ['dst', '/Node/1']
  ]);
  assert.deepEqual(calls(api, 'setAttribute'), [
    { call: 'setAttribute', nodePath: '/a/d/e', name: 'lineStyle', value: '-.->' }
  ]);
  assert.equal(calls(api, 'createChild')[0].attributes.shape, 'rect');
});

test('an unlinked edge line is created, and a removed subgraph drops its name', () => {
  const api = recordingApi();
  const walked = walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'subgraph one [One]', nodePath: '/a/d/s' },
        { id: 'ln2', text: 'A --> B', nodePath: null },
        { id: 'ln3', text: 'end', nodePath: null }
      ]
    },
    [
      { op: 'updateText', lineId: 'ln2', text: 'A ==> B', index: 1 },
      { op: 'removeLine', lineId: 'ln1', nodePath: '/a/d/s', text: 'subgraph one [One]' }
    ],
    api
  );
  assert.equal(calls(api, 'createChild').some((step) => step.baseName === 'Edge'), true);
  assert.deepEqual(api.steps.filter((step) => step.call === 'deleteNode'), [
    { call: 'deleteNode', nodePath: '/a/d/s' }
  ]);
  assert.equal(walked.names.one, undefined);
});

test('a line added after a subgraph ends belongs to the diagram', () => {
  const api = recordingApi();
  walkFlowchartUpdate(
    {
      diagramNodePath: '/a/d',
      lines: [
        { id: 'ln1', text: 'subgraph one [One]', nodePath: '/a/d/s' },
        { id: 'ln2', text: 'end', nodePath: null }
      ]
    },
    [{ op: 'addLine', lineId: 'ln3', text: 'A[]', index: 2 }],
    api
  );
  const created = calls(api, 'createChild');
  assert.equal(created[0].parentPath, '/a/d');
  assert.equal(created[0].attributes.label, 'A');
  assert.equal(created[0].attributes.shape, 'rect');
});

test('partial field writes and a subgraph without a node stay on the diagram', () => {
  const api = recordingApi();
  setFlowNodeText(api, '/n', { label: 'Only' });
  setFlowEdgeText(api, '/e', {});
  setFlowEdgeEnds(api, '/e', null, '/dst');
  setSubgraphText(api, '/s', { direction: '' });
  createFlowEdge(api, '/a/d', { label: 'Yes' });
  walkFlowchartUpdate(
    {
      lines: [
        { id: 'ln1', text: 'end' },
        { id: 'ln2', text: 'subgraph one' },
        { id: 'ln3', text: 'A' }
      ]
    },
    [
      { op: 'addLine', lineId: 'ln4', text: 'B --> C', index: 2 },
      { op: 'updateText', lineId: 'ln3', text: 'A[Named]', index: 3 },
      { op: 'updateText', lineId: 'gone', text: 'subgraph box [Box]', index: 0 },
      { op: 'updateText', lineId: 'ln1', text: 'flowchart TD', index: 0 }
    ],
    api
  );
  assert.equal(calls(api, 'createChild').some((step) => step.baseName === 'Edge' && step.parentPath == null), true);
  assert.equal(calls(api, 'setAttribute').some((step) => step.name === 'direction' && step.value === 'TD'), true);
});

test('flowchart shapes and leftover text classify without a model call', () => {
  assert.equal(classifyFlowLine('A[(Tank)]').shape, 'cylinder');
  assert.equal(classifyFlowLine('A[[Sub]]').shape, 'subroutine');
  assert.equal(classifyFlowLine('A{{Hex}}').shape, 'hexagon');
  assert.equal(classifyFlowLine('A[/Trap/]').shape, 'trapezoid');
  assert.equal(classifyFlowLine('A[\\Trap\\]').shape, 'trapezoidAlt');
  assert.equal(classifyFlowLine('A>Flag]').shape, 'asymmetric');
  assert.equal(classifyFlowLine('A(Round)').shape, 'round');
  assert.equal(classifyFlowLine('').kind, 'comment');
  assert.equal(classifyFlowLine('subgraph One Two').kind, 'unknown');
  assert.equal(classifyFlowLine('1nope').kind, 'unknown');
  const api = recordingApi();
  walkFlowchartUpdate(null, null, api);
  assert.deepEqual(api.steps, []);
});

test('folded editor input for a new sample line becomes flowchart transactions', () => {
  const session = createSession('flowchart TD\n', { diagramNodePath: '/a/d' });
  noteContentChanges(session, {
    isFlush: false,
    changes: [{
      range: { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 },
      text: 'Start([Start]) --> Decide{Ready?}'
    }]
  });
  const folded = foldEdits(session);
  const api = recordingApi();
  walkFlowchartUpdate(
    { diagramNodePath: session.diagramNodePath, lines: session.lines },
    folded.operations,
    api
  );
  assert.equal(calls(api, 'createChild').filter((step) => step.baseName === 'Node').length, 2);
  assert.equal(calls(api, 'setPointer').map((step) => step.name).join(','), 'src,dst');
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
      core.getAttribute(node, 'name') === name && core.getNamespace(node) === 'flowchart'
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

test('flowchart src and dst are pointers to a node or a subgraph', async () => {
  const host = await createMddProject({ libraries: ['flowchart'] });
  try {
    const { core, root } = host;
    const metas = Object.values(core.getAllMetaNodes(root));
    const concept = (name) => metas.find((node) =>
      core.getAttribute(node, 'name') === name && core.getNamespace(node) === 'flowchart'
    );
    const edge = concept('Edge');
    const node = concept('Node');
    const subgraph = concept('Subgraph');
    const chart = concept('FlowChart');
    assert.deepEqual(core.getValidPointerNames(edge).slice().sort(), ['dst', 'src']);
    assert.deepEqual(core.getValidSetNames(edge), []);
    assert.equal(core.isValidTargetOf(node, edge, 'src'), true);
    assert.equal(core.isValidTargetOf(subgraph, edge, 'dst'), true);
    assert.equal(core.isValidTargetOf(chart, edge, 'src'), false);
    assert.equal(core.isValidTargetOf(edge, edge, 'dst'), false);

    const childNames = Object.keys(core.getChildrenMeta(subgraph))
      .filter((key) => key !== 'min' && key !== 'max')
      .map((path) => {
        const meta = metas.find((item) => core.getPath(item) === path);
        return meta ? core.getAttribute(meta, 'name') : path;
      })
      .sort();
    assert.deepEqual(childNames, ['Edge', 'Node', 'Subgraph']);

    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'flowchart',
      name: 'sample',
      source: 'flowchart TD\n'
    });
    const api = modelApi(host);
    api.keep(await core.loadByPath(root, diagramPath));
    const walked = walkFlowchartUpdate(
      { diagramNodePath: diagramPath, lines: [{ id: 'ln1', text: 'flowchart TD', nodePath: null }] },
      [
        { op: 'addLine', lineId: 'ln2', text: 'subgraph gate [Gate]', index: 1 },
        { op: 'addLine', lineId: 'ln3', text: 'Start([Start]) --> Decide{Ready?}', index: 2 },
        { op: 'addLine', lineId: 'ln4', text: 'end', index: 3 }
      ],
      api
    );
    const edgePath = walked.bindings.find((item) => item.lineId === 'ln3').nodePath;
    const edgeNode = api.byPath.get(edgePath);
    const subgraphPath = walked.bindings.find((item) => item.lineId === 'ln2').nodePath;
    assert.equal(core.getParent(edgeNode), api.byPath.get(subgraphPath));
    assert.equal(core.isInstanceOf(edgeNode, concept('Edge')), true);
    assert.equal(core.getAttribute(api.byPath.get(core.getPointerPath(edgeNode, 'src')), 'name'), 'Start');
    assert.equal(core.getAttribute(api.byPath.get(core.getPointerPath(edgeNode, 'dst')), 'shape'), 'decision');
  } finally {
    await host.close();
  }
});
