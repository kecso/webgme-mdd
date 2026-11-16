'use strict';

/**
 * Place a named diagram node under the shared Project concept.
 * The diagram text is an attribute on that node, so the project is the copy
 * that export contains.
 */

const SOURCE_ATTRIBUTE = 'source';
const LINE_NODES_ATTRIBUTE = 'lineNodes';
const LINE_NAMES_ATTRIBUTE = 'lineNames';

const DIAGRAM_CONCEPT = {
  architecture: 'ArchitectureDiagram',
  block: 'BlockDiagram',
  c4: 'C4Diagram',
  class: 'ClassDiagram',
  cynefin: 'CynefinDiagram',
  ears: 'EARSSpecification',
  er: 'ERDiagram',
  eventmodeling: 'EventModelingDiagram',
  flowchart: 'FlowChart',
  gantt: 'GanttChart',
  gitgraph: 'GitGraph',
  ishikawa: 'IshikawaDiagram',
  journey: 'UserJourney',
  kanban: 'Kanban',
  mindmap: 'Mindmap',
  packet: 'PacketDiagram',
  pie: 'PieChart',
  quadrant: 'QuadrantChart',
  radar: 'RadarChart',
  railroad: 'RailroadDiagram',
  requirement: 'RequirementDiagram',
  sankey: 'SankeyDiagram',
  sequence: 'SequenceDiagram',
  state: 'StateDiagram',
  timeline: 'Timeline',
  treemap: 'Treemap',
  treeview: 'TreeView',
  usecase: 'UseCaseDiagram',
  venn: 'VennDiagram',
  wardley: 'WardleyMap',
  xychart: 'XYChart'
};

/**
 * @param {object} api
 * @param {{ diagramType: string, name: string }} spec
 * @returns {Promise<string>} path of the diagram node
 */
async function placeDiagramNode(api, spec) {
  const concept = DIAGRAM_CONCEPT[spec.diagramType];
  if (!concept) {
    throw new Error('No diagram concept for ' + spec.diagramType);
  }
  const metas = await api.listMeta();
  const folder = metas.find((node) => api.name(node) === 'Project' && !api.namespace(node));
  const base = metas.find((node) => api.name(node) === concept && api.namespace(node) === spec.diagramType);
  if (!folder) {
    throw new Error('This project has no Project concept to hold diagrams.');
  }
  if (!base) {
    throw new Error(concept + ' is not in this project. Add the ' + spec.diagramType + ' language first.');
  }
  const children = await api.children(folder);
  const existing = children.find((node) =>
    api.name(node) === spec.name && api.isInstanceOf(node, base)
  );
  if (existing) {
    const current = api.attribute(existing, SOURCE_ATTRIBUTE) || '';
    if (typeof spec.source === 'string' && spec.source && !current) {
      await api.setAttribute(existing, SOURCE_ATTRIBUTE, spec.source);
    }
    return api.id(existing);
  }
  return api.create(folder, base, spec.name, spec.source || '');
}

function clientDiagramApi(client) {
  return {
    async listMeta() {
      return client.getAllMetaNodes() || [];
    },
    name(node) {
      return node.getAttribute('name');
    },
    namespace(node) {
      return node.getNamespace() || '';
    },
    attribute(node, name) {
      return node.getAttribute(name);
    },
    base(node) {
      const baseId = node.getBaseId();
      return baseId ? client.getNode(baseId) : null;
    },
    async setAttribute(node, name, value) {
      await commitAttribute(client, node.getId(), name, value);
    },
    async children(folder) {
      await loadChildren(client, folder.getId());
      const current = client.getNode(folder.getId());
      if (!current) return [];
      return current.getChildrenIds().map((id) => client.getNode(id)).filter(Boolean);
    },
    isInstanceOf(node, base) {
      return node.isInstanceOf(base.getId());
    },
    id(node) {
      return node.getId();
    },
    create(folder, base, name, source) {
      return new Promise((resolve, reject) => {
        client.startTransaction('create diagram');
        const nodeId = client.createNode({
          parentId: folder.getId(),
          baseId: base.getId()
        }, {
          attributes: { name: name, source: source || '' }
        });
        client.completeTransaction('Add ' + name, (err) => {
          if (err) reject(err);
          else if (!nodeId) reject(new Error('Could not create the diagram node'));
          else resolve(nodeId);
        });
      });
    }
  };
}

function loadNode(client, nodeId, depth) {
  const children = typeof depth === 'number' ? depth : 0;
  return new Promise((resolve, reject) => {
    let settled = false;
    const guid = client.addUI({}, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.removeUI(guid);
      resolve();
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      client.removeUI(guid);
      reject(new Error('The project model did not finish loading.'));
    }, 8000);
    client.updateTerritory(guid, { [nodeId]: { children } });
  });
}

function loadChildren(client, nodeId) {
  return loadNode(client, nodeId, 1);
}

function parseStoredJson(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function bindingsFromValues(lineNodesValue, lineNamesValue) {
  const nodes = parseStoredJson(lineNodesValue);
  const names = parseStoredJson(lineNamesValue);
  return {
    nodePaths: Array.isArray(nodes) ? nodes : [],
    names: names && typeof names === 'object' && !Array.isArray(names) ? names : {}
  };
}

async function readDiagramBindings(nodePath) {
  const client = gmeClient();
  if (!client || !nodePath || !String(nodePath).startsWith('/')) {
    return { nodePaths: [], names: {} };
  }
  try {
    await loadNode(client, nodePath, 0);
  } catch {
    return { nodePaths: [], names: {} };
  }
  const node = client.getNode(nodePath);
  if (!node || typeof node.getAttribute !== 'function') return { nodePaths: [], names: {} };
  return bindingsFromValues(
    node.getAttribute(LINE_NODES_ATTRIBUTE),
    node.getAttribute(LINE_NAMES_ATTRIBUTE)
  );
}

function commitAttribute(client, nodePath, name, value) {
  return new Promise((resolve, reject) => {
    let ui = null;
    let settled = false;
    const finish = (err) => {
      if (ui) client.removeUI(ui);
      ui = null;
      if (err) reject(err);
      else resolve();
    };
    const write = () => {
      if (!client.getNode(nodePath)) {
        finish(new Error('Diagram node ' + nodePath + ' is not loaded'));
        return;
      }
      client.startTransaction();
      client.setAttribute(nodePath, name, value);
      client.completeTransaction('Set ' + name, finish);
    };
    if (client.getNode(nodePath)) {
      write();
      return;
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      finish(new Error('The diagram node did not load.'));
    }, 8000);
    ui = client.addUI({}, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      write();
    });
    client.updateTerritory(ui, { [nodePath]: { children: 0 } });
  });
}

function gmeClient() {
  return typeof window !== 'undefined' ? window.gmeClient : null;
}

async function placeDiagramOnClient(spec) {
  const client = gmeClient();
  if (!client || typeof client.getAllMetaNodes !== 'function') {
    throw new Error('WebGME is not connected');
  }
  return placeDiagramNode(clientDiagramApi(client), spec);
}

async function writeDiagramSource(nodePath, source) {
  const client = gmeClient();
  if (!client) throw new Error('WebGME is not connected');
  await commitAttribute(client, nodePath, SOURCE_ATTRIBUTE, source);
}

module.exports = {
  DIAGRAM_CONCEPT,
  SOURCE_ATTRIBUTE,
  LINE_NODES_ATTRIBUTE,
  LINE_NAMES_ATTRIBUTE,
  placeDiagramNode,
  clientDiagramApi,
  placeDiagramOnClient,
  writeDiagramSource,
  loadNode,
  bindingsFromValues,
  readDiagramBindings
};
