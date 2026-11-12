'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createMddProject } = require('../scripts/mdd-project');

async function withProject(options, fn) {
  const host = await createMddProject(options);
  try {
    return await fn(host);
  } finally {
    await host.close();
  }
}

function namesIn(described, library) {
  return described.meta
    .filter((entry) => entry.library === library)
    .map((entry) => entry.name)
    .sort();
}

function metaNode(host, name, library) {
  return Object.values(host.core.getAllMetaNodes(host.root)).find((node) => {
    return host.core.getAttribute(node, 'name') === name
      && (host.core.getNamespace(node) || '') === library;
  });
}

async function folderNode(host) {
  const metaPaths = new Set(
    Object.values(host.core.getAllMetaNodes(host.root)).map((node) => host.core.getPath(node))
  );
  const children = await host.core.loadChildren(host.root);
  return children.find((node) =>
    host.core.getAttribute(node, 'name') === 'Project' && !metaPaths.has(host.core.getPath(node))
  );
}

test('an empty project is the Project shell and no libraries', async () => {
  await withProject({}, async (host) => {
    const described = await host.describe();
    assert.deepEqual(described.libraries, []);
    assert.deepEqual(namesIn(described, ''), ['FCO', 'Project']);
    assert.equal(described.folder.name, 'Project');
    assert.equal(described.folder.base, 'Project');

    const project = metaNode(host, 'Project', '');
    const fco = host.core.getFCO(host.root);
    const rules = host.core.getChildrenMeta(project);
    const rule = rules[host.core.getPath(fco)];
    assert.ok(rule, 'Project must be able to contain FCO');
    assert.equal(rule.max, -1);
  });
});

test('requirements-specification mounts the ears library', async () => {
  await withProject({ domains: ['requirements-specification'] }, async (host) => {
    const described = await host.describe();
    assert.deepEqual(described.libraries, ['ears']);
    assert.ok(namesIn(described, 'ears').includes('EARSSpecification'));
    assert.deepEqual(namesIn(described, ''), ['FCO', 'Project']);
    assert.equal(described.folder.base, 'Project');
  });
});

test('uml mounts class, sequence, state, and usecase', async () => {
  await withProject({ domains: ['uml'] }, async (host) => {
    const described = await host.describe();
    assert.deepEqual(described.libraries, ['class', 'sequence', 'state', 'usecase']);
    assert.ok(namesIn(described, 'class').includes('ClassDiagram'));
    assert.ok(namesIn(described, 'sequence').includes('SequenceDiagram'));
    assert.ok(namesIn(described, 'state').includes('StateDiagram'));
    assert.ok(namesIn(described, 'usecase').includes('UseCaseDiagram'));
  });
});

test('two domains union their libraries', async () => {
  await withProject({
    domains: ['requirements-specification', 'finite-state-machines']
  }, async (host) => {
    const described = await host.describe();
    assert.deepEqual(described.libraries, ['ears', 'state']);
  });
});

test('a language can be added after the project exists', async () => {
  await withProject({}, async (host) => {
    await host.addLanguage('state');
    let described = await host.describe();
    assert.deepEqual(described.libraries, ['state']);
    assert.ok(namesIn(described, 'state').includes('StateDiagram'));
    await host.addLanguage('state');
    described = await host.describe();
    assert.deepEqual(described.libraries, ['state']);
  });
});

test('a library diagram node is a valid child of the Project folder', async () => {
  await withProject({ domains: ['requirements-specification'] }, async (host) => {
    const folder = await folderNode(host);
    const ears = metaNode(host, 'EARSSpecification', 'ears');
    assert.ok(folder);
    assert.ok(ears);
    const diagram = host.core.createNode({ parent: folder, base: ears });
    assert.equal(host.core.isValidChildOf(diagram, folder), true);
    assert.equal(host.core.getParent(diagram), folder);
    const children = await host.core.loadChildren(folder);
    assert.equal(children.length, 1);
    assert.equal(host.core.getPath(children[0]), host.core.getPath(diagram));
  });
});
