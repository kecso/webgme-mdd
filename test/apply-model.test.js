'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createSession, foldEdits } = require('../studio/src/control/sourceEdits.cjs');
const { inputForApply, commitDiagramUpdate } = require('../studio/src/control/applyModel.cjs');
const { createMddProject } = require('../scripts/mdd-project');
const { placeDiagramNode } = require('../studio/src/control/diagramNode.cjs');

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

function coreClient(host) {
  const { core, root } = host;
  const byPath = new Map();
  const calls = [];
  function track(node) {
    const path = core.getPath(node);
    byPath.set(path, node);
    return path;
  }
  Object.values(core.getAllMetaNodes(root)).forEach(track);
  let ui = null;
  return {
    calls,
    byPath,
    track,
    addUI(_ui, fn) {
      ui = fn;
      return 'ui';
    },
    removeUI() {
      ui = null;
    },
    updateTerritory() {
      if (ui) ui();
    },
    getNode(path) {
      return byPath.has(path) ? { getId: () => path } : null;
    },
    getAllMetaNodes() {
      return Object.values(core.getAllMetaNodes(root)).map((node) => ({
        getId: () => core.getPath(node),
        getAttribute: (name) => core.getAttribute(node, name),
        getNamespace: () => core.getNamespace(node) || ''
      }));
    },
    startTransaction() {
      calls.push('startTransaction');
    },
    completeTransaction(_msg, callback) {
      calls.push('completeTransaction');
      if (callback) callback(null);
    },
    createNode({ parentId, baseId }, desc) {
      const base = byPath.get(baseId);
      calls.push('createNode:' + core.getAttribute(base, 'name'));
      const node = core.createNode({ parent: byPath.get(parentId), base });
      const attributes = (desc && desc.attributes) || {};
      Object.keys(attributes).forEach((name) => core.setAttribute(node, name, attributes[name]));
      assert.equal(core.isValidChildOf(node, byPath.get(parentId)), true);
      return track(node);
    },
    setAttribute(path, name, value) {
      calls.push('setAttribute:' + name);
      assert.ok(byPath.get(path), path);
      core.setAttribute(byPath.get(path), name, value);
    },
    setPointer(path, name, target) {
      calls.push('setPointer:' + name);
      const node = byPath.get(path);
      const targetNode = byPath.get(target);
      assert.equal(core.isValidTargetOf(targetNode, node, name), true);
      core.setPointer(node, name, targetNode);
    },
    deleteNode(path) {
      calls.push('deleteNode');
      core.deleteNode(byPath.get(path));
      byPath.delete(path);
    },
    delAttribute(path, name) {
      calls.push('delAttribute:' + name);
      core.delAttribute(byPath.get(path), name);
    },
    moveNode(path, parentPath) {
      calls.push('moveNode');
      const moved = core.moveNode(byPath.get(path), byPath.get(parentPath));
      byPath.delete(path);
      return track(moved);
    }
  };
}

function baseNames(host, parent) {
  const { core } = host;
  return core.loadChildren(parent).then((children) => children.map((node) =>
    core.getAttribute(core.getBase(node), 'name')
  ).sort());
}

test('an unbound diagram is created from every current line', () => {
  const source = 'flowchart TD\n  A[Start] --> B[End]';
  const session = createSession(source, { diagramNodePath: '/a/6' });
  const walked = inputForApply(session, foldEdits(session));
  assert.equal(walked.baseline.lines.length, 0);
  assert.deepEqual(walked.operations.map((op) => op.op), ['addLine', 'addLine']);
  assert.match(walked.operations[1].text, /A\[Start\]/);
});

test('a linked diagram does not recreate untouched lines', () => {
  const session = createSession('flowchart TD\n  A[Start] --> B[End]', {
    diagramNodePath: '/a/6',
    nodePaths: [null, '/e']
  });
  const walked = inputForApply(session, foldEdits(session));
  assert.equal(walked.operations.length, 0);
  assert.equal(walked.baseline.lines[1].nodePath, '/e');
});

test('a missing concept does not open a transaction', async () => {
  const client = {
    calls: [],
    getNode() {
      return { getId: () => '/d' };
    },
    getAllMetaNodes() {
      return [];
    },
    addUI(_ui, fn) {
      this.fn = fn;
      return 'ui';
    },
    removeUI() {},
    updateTerritory() {
      this.fn();
    },
    startTransaction() {
      this.calls.push('startTransaction');
    }
  };
  await assert.rejects(
    () => commitDiagramUpdate(client, {
      diagramType: 'flowchart',
      diagramNodePath: '/d',
      baseline: { diagramNodePath: '/d', lines: [], names: {} },
      lineOperations: [{ op: 'addLine', lineId: 'ln2', text: 'A[Start]', index: 1 }],
      source: 'flowchart TD\nA[Start]\n',
      lines: []
    }),
    /Node is not in the flowchart language/
  );
  assert.deepEqual(client.calls, []);
});

test('flowchart Apply creates nodes and an edge in one commit, then updates', async () => {
  const host = await createMddProject({ libraries: ['flowchart'] });
  try {
    const { core, root } = host;
    const source = 'flowchart TD\n  A[Start] --> B[End]';
    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'flowchart',
      name: 'flowchart-1',
      source
    });
    const client = coreClient(host);
    client.track(await core.loadByPath(root, diagramPath));
    const lines = createSession(source, { diagramNodePath: diagramPath }).lines;
    const first = await commitDiagramUpdate(client, {
      diagramType: 'flowchart',
      diagramNodePath: diagramPath,
      baseline: { diagramNodePath: diagramPath, lines: [], names: {} },
      lineOperations: lines.map((line, index) => ({
        op: 'addLine',
        lineId: line.id,
        nodePath: null,
        text: line.text,
        index
      })),
      source,
      lines
    });

    assert.equal(client.calls[0], 'startTransaction');
    assert.equal(client.calls[client.calls.length - 1], 'completeTransaction');
    assert.equal(client.calls.filter((call) => call === 'startTransaction').length, 1);
    assert.equal(client.calls.filter((call) => call === 'completeTransaction').length, 1);
    assert.ok(client.calls.includes('setAttribute:source'));
    assert.ok(client.calls.includes('createNode:Node'));
    assert.ok(client.calls.includes('createNode:Edge'));
    assert.ok(client.calls.indexOf('setAttribute:source') < client.calls.lastIndexOf('completeTransaction'));

    const diagram = client.byPath.get(diagramPath);
    assert.equal(core.getAttribute(diagram, 'source'), source);
    assert.equal(core.getAttribute(diagram, 'direction'), 'TD');
    assert.deepEqual(await baseNames(host, diagram), ['Edge', 'Node', 'Node']);
    const stored = JSON.parse(core.getAttribute(diagram, 'lineNodes'));
    assert.equal(stored.length, 2);
    assert.equal(stored[0], null);
    assert.equal(stored[1], first.lines[1].nodePath);

    const edge = client.byPath.get(first.lines[1].nodePath);
    assert.equal(core.getAttribute(core.getBase(edge), 'name'), 'Edge');
    assert.equal(
      core.getAttribute(client.byPath.get(core.getPointerPath(edge, 'src')), 'name'),
      'A'
    );
    assert.equal(
      core.getAttribute(client.byPath.get(core.getPointerPath(edge, 'dst')), 'name'),
      'B'
    );

    const created = client.calls.filter((call) => call.startsWith('createNode:')).length;
    const nextSource = 'flowchart TD\n  A[Start] -->|go| B[End]';
    const nextLines = first.lines.map((line, index) => (
      index === 1 ? { id: line.id, text: '  A[Start] -->|go| B[End]', nodePath: line.nodePath } : line
    ));
    await commitDiagramUpdate(client, {
      diagramType: 'flowchart',
      diagramNodePath: diagramPath,
      baseline: { diagramNodePath: diagramPath, lines: first.lines, names: first.names },
      lineOperations: [{
        op: 'updateText',
        lineId: nextLines[1].id,
        nodePath: nextLines[1].nodePath,
        text: nextLines[1].text,
        index: 1
      }],
      source: nextSource,
      lines: nextLines
    });
    assert.equal(client.calls.filter((call) => call === 'completeTransaction').length, 2);
    assert.equal(client.calls.filter((call) => call.startsWith('createNode:')).length, created);
    assert.equal(core.getAttribute(edge, 'label'), 'go');
    assert.deepEqual(await baseNames(host, diagram), ['Edge', 'Node', 'Node']);
  } finally {
    await host.close();
  }
});

test('sequence Apply commits participants and the message together', async () => {
  const host = await createMddProject({ libraries: ['sequence'] });
  try {
    const { core, root } = host;
    const source = 'sequenceDiagram\n  participant BrakeCtrl\n  participant FusionApp\n  BrakeCtrl->>FusionApp: hold\n';
    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'sequence',
      name: 'obstacle-brake',
      source
    });
    const client = coreClient(host);
    client.track(await core.loadByPath(root, diagramPath));
    const lines = createSession(source, { diagramNodePath: diagramPath }).lines;
    await commitDiagramUpdate(client, {
      diagramType: 'sequence',
      diagramNodePath: diagramPath,
      baseline: { diagramNodePath: diagramPath, lines: [], names: {} },
      lineOperations: lines.map((line, index) => ({
        op: 'addLine',
        lineId: line.id,
        nodePath: null,
        text: line.text,
        index
      })),
      source,
      lines
    });
    assert.equal(client.calls.filter((call) => call === 'completeTransaction').length, 1);
    assert.deepEqual(await baseNames(host, client.byPath.get(diagramPath)), [
      'Message',
      'Participant',
      'Participant'
    ]);
  } finally {
    await host.close();
  }
});

test('an incomplete diagram is refused before a transaction', async () => {
  const host = await createMddProject({ libraries: ['sequence'] });
  try {
    const { core, root } = host;
    const source = 'sequenceDiagram\n  BrakeCtrl->>\n';
    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'sequence',
      name: 'obstacle-brake',
      source
    });
    const client = coreClient(host);
    client.track(await core.loadByPath(root, diagramPath));
    const lines = createSession(source, { diagramNodePath: diagramPath }).lines;
    await assert.rejects(
      () => commitDiagramUpdate(client, {
        diagramType: 'sequence',
        diagramNodePath: diagramPath,
        baseline: { diagramNodePath: diagramPath, lines: [], names: {} },
        lineOperations: lines.map((line, index) => ({
          op: 'addLine',
          lineId: line.id,
          nodePath: null,
          text: line.text,
          index
        })),
        source,
        lines
      }),
      /Correct the text and apply to the model again/
    );
    assert.equal(client.calls.includes('startTransaction'), false);
  } finally {
    await host.close();
  }
});

test('kanban Apply stores each ticket inside its column', async () => {
  const host = await createMddProject({ libraries: ['kanban'] });
  try {
    const { core, root } = host;
    const source = [
      'kanban',
      '  Todo',
      '    [Write the card]',
      '    docs[Draft the note]@{ assigned: \'ada\', ticket: \'MC-1\' }',
      '  Doing',
      '    [Review]'
    ].join('\n');
    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'kanban',
      name: 'kanban-1',
      source
    });
    const client = coreClient(host);
    client.track(await core.loadByPath(root, diagramPath));
    const lines = createSession(source, { diagramNodePath: diagramPath }).lines;
    const outcome = await commitDiagramUpdate(client, {
      diagramType: 'kanban',
      diagramNodePath: diagramPath,
      baseline: { diagramNodePath: diagramPath, lines: [], names: {} },
      lineOperations: lines.map((line, index) => ({
        op: 'addLine',
        lineId: line.id,
        nodePath: null,
        text: line.text,
        index
      })),
      source,
      lines
    });
    assert.equal(outcome.status, 'applied');
    const diagram = client.byPath.get(diagramPath);
    const columns = await core.loadChildren(diagram);
    assert.deepEqual(columns.map((node) => core.getAttribute(core.getBase(node), 'name')), ['Column', 'Column']);
    const todo = columns.find((node) => core.getAttribute(node, 'name') === 'Todo');
    const tickets = await core.loadChildren(todo);
    assert.equal(tickets.length, 2);
    const idless = tickets.find((node) => core.getAttribute(node, 'label') === 'Write the card');
    assert.equal(core.getOwnAttribute(idless, 'name'), undefined);
    assert.equal(core.getAttribute(idless, 'name'), 'Ticket');
    const named = tickets.find((node) => core.getAttribute(node, 'name') === 'docs');
    assert.equal(core.getAttribute(named, 'assigned'), 'ada');
    assert.match(core.getAttribute(named, 'meta'), /MC-1/);
    const doing = columns.find((node) => core.getAttribute(node, 'name') === 'Doing');
    assert.equal((await core.loadChildren(doing)).length, 1);
  } finally {
    await host.close();
  }
});

test('kanban Apply keeps repeated ids as separate columns and tickets', async () => {
  const host = await createMddProject({ libraries: ['kanban'] });
  try {
    const { core, root } = host;
    const source = [
      'kanban',
      '  id1[First]',
      '    t1[Alpha]',
      '    t1[Beta]',
      '  id1[Second]',
      '    t1[Alpha]',
      '  [Doing]',
      '    [C]'
    ].join('\n');
    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'kanban',
      name: 'kanban-repeat',
      source
    });
    const client = coreClient(host);
    client.track(await core.loadByPath(root, diagramPath));
    const lines = createSession(source, { diagramNodePath: diagramPath }).lines;
    const outcome = await commitDiagramUpdate(client, {
      diagramType: 'kanban',
      diagramNodePath: diagramPath,
      baseline: { diagramNodePath: diagramPath, lines: [], names: {} },
      lineOperations: lines.map((line, index) => ({
        op: 'addLine',
        lineId: line.id,
        nodePath: null,
        text: line.text,
        index
      })),
      source,
      lines
    });
    assert.equal(outcome.status, 'applied');
    const diagram = client.byPath.get(diagramPath);
    const columns = await core.loadChildren(diagram);
    const labeled = (label) => columns.filter((node) => core.getAttribute(node, 'label') === label);
    const first = labeled('First');
    const second = labeled('Second');
    const doing = labeled('Doing');
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(doing.length, 1);
    assert.equal(core.getAttribute(first[0], 'name'), 'id1');
    assert.equal(core.getAttribute(second[0], 'name'), 'id1');
    assert.equal(core.getAttribute(first[0], 'order'), '0');
    assert.equal(core.getAttribute(second[0], 'order'), '1');
    assert.equal(core.getAttribute(doing[0], 'order'), '2');
    assert.equal(core.getOwnAttribute(doing[0], 'name'), undefined);
    const firstTickets = await core.loadChildren(first[0]);
    const secondTickets = await core.loadChildren(second[0]);
    assert.deepEqual(firstTickets.map((node) => core.getAttribute(node, 'label')).sort(), ['Alpha', 'Beta']);
    assert.deepEqual(firstTickets.map((node) => core.getAttribute(node, 'name')), ['t1', 't1']);
    assert.deepEqual(secondTickets.map((node) => core.getAttribute(node, 'label')), ['Alpha']);
    assert.equal((await core.loadChildren(doing[0])).length, 1);
  } finally {
    await host.close();
  }
});

test('block Apply saves the source and creates no elements', async () => {
  const host = await createMddProject({ libraries: ['block'] });
  try {
    const { core, root } = host;
    const source = 'block-beta\n  columns 1\n';
    const diagramPath = await placeDiagramNode(coreApi(host), {
      diagramType: 'block',
      name: 'block-1',
      source
    });
    const client = coreClient(host);
    client.track(await core.loadByPath(root, diagramPath));
    const lines = createSession(source, { diagramNodePath: diagramPath }).lines;
    const outcome = await commitDiagramUpdate(client, {
      diagramType: 'block',
      diagramNodePath: diagramPath,
      baseline: { diagramNodePath: diagramPath, lines: [], names: {} },
      lineOperations: lines.map((line, index) => ({
        op: 'addLine',
        lineId: line.id,
        nodePath: null,
        text: line.text,
        index
      })),
      source,
      lines
    });
    assert.equal(outcome.status, 'needs-design');
    assert.match(outcome.reason, /Needs further design/);
    assert.equal(client.calls.filter((call) => call.startsWith('createNode:')).length, 0);
    assert.equal(client.calls.filter((call) => call === 'completeTransaction').length, 1);
    assert.equal(core.getAttribute(client.byPath.get(diagramPath), 'source'), source);
    assert.deepEqual(await baseNames(host, client.byPath.get(diagramPath)), []);
  } finally {
    await host.close();
  }
});
