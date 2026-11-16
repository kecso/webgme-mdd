'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createMddProject } = require('../scripts/mdd-project');
const { placeDiagramNode } = require('../studio/src/control/diagramNode.cjs');
const { readDiagrams, projectView } = require('../studio/src/control/projectModel.cjs');

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
      assert.equal(core.isValidChildOf(node, parent), true);
      return core.getPath(node);
    }
  };
}

test('a named requirement diagram is a child of the Project concept', async () => {
  const host = await createMddProject({ libraries: ['requirement'] });
  try {
    const api = coreApi(host);
    const first = await placeDiagramNode(api, {
      diagramType: 'requirement',
      name: 'braking',
      source: 'The vehicle shall brake.'
    });
    const again = await placeDiagramNode(api, {
      diagramType: 'requirement',
      name: 'braking',
      source: 'This later text must not replace the saved source.'
    });
    assert.equal(again, first);

    const folder = (await api.listMeta()).find((node) => api.name(node) === 'Project' && !api.namespace(node));
    const children = await api.children(folder);
    const named = children.filter((node) => api.name(node) === 'braking');
    assert.equal(named.length, 1);
    assert.equal(host.core.getAttribute(host.core.getBase(named[0]), 'name'), 'RequirementDiagram');

    const diagrams = await readDiagrams(api);
    assert.deepEqual(diagrams[first], {
      name: 'braking',
      diagramType: 'requirement',
      source: 'The vehicle shall brake.',
      nodePath: first
    });
  } finally {
    await host.close();
  }
});

test('an empty diagram source is filled from a later place', async () => {
  const host = await createMddProject({ libraries: ['requirement'] });
  try {
    const api = coreApi(host);
    const path = await placeDiagramNode(api, { diagramType: 'requirement', name: 'empty' });
    await placeDiagramNode(api, {
      diagramType: 'requirement',
      name: 'empty',
      source: 'REQ-001 [ubiquitous]\nThe system shall start.\n'
    });
    const diagrams = await readDiagrams(api);
    assert.equal(diagrams[path].source, 'REQ-001 [ubiquitous]\nThe system shall start.\n');
  } finally {
    await host.close();
  }
});

test('project view is libraries, kind, and diagram nodes', () => {
  const view = projectView({
    id: 'guest+my_mdd',
    owner: 'guest',
    name: 'my_mdd',
    kind: 'MDSS:software-architecture:systems-engineering',
    libraries: ['requirement', 'ears', 'c4', 'class', 'architecture', 'block', 'not-a-diagram'],
    diagrams: {
      '/a/x': { name: 'block-1', diagramType: 'block', source: 'flowchart TD', nodePath: '/a/x' }
    }
  });
  assert.equal(view.title, 'my_mdd');
  assert.equal(view.profile, 'domain');
  assert.equal(view.profileDomain, null);
  assert.deepEqual(view.enabledModelingDomains, ['software-architecture', 'systems-engineering']);
  assert.deepEqual(view.allowedDiagramTypes, ['architecture', 'block', 'c4', 'class', 'ears', 'requirement']);
  assert.equal(view.diagrams['/a/x'].source, 'flowchart TD');
  assert.equal(view.integrating, null);
});
