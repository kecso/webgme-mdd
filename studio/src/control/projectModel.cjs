'use strict';

/**
 * Read a studio project from a WebGME model.
 * Libraries are the diagram types that can be created. Children of the Project
 * concept are the diagrams. Their text is the source attribute.
 */

const { DIAGRAM_CONCEPT, SOURCE_ATTRIBUTE } = require('./diagramNode.cjs');

function domainsFromKind(kind) {
  const raw = String(kind || '');
  if (!raw.startsWith('MDSS:')) return [];
  return raw.slice('MDSS:'.length).split(':').filter(Boolean);
}

function diagramTypeOf(namespace, baseName) {
  if (DIAGRAM_CONCEPT[namespace]) return namespace;
  const match = Object.keys(DIAGRAM_CONCEPT).find((id) => DIAGRAM_CONCEPT[id] === baseName);
  return match || null;
}

async function readDiagrams(api) {
  const metas = await api.listMeta();
  const folder = metas.find((node) => api.name(node) === 'Project' && !api.namespace(node));
  if (!folder) return {};
  const children = await api.children(folder);
  const diagrams = {};
  for (const node of children) {
    const base = api.base(node);
    if (!base) continue;
    const diagramType = diagramTypeOf(api.namespace(base), api.name(base));
    if (!diagramType) continue;
    const nodePath = api.id(node);
    diagrams[nodePath] = {
      name: api.name(node) || diagramType,
      diagramType,
      source: api.attribute(node, SOURCE_ATTRIBUTE) || '',
      nodePath
    };
  }
  return diagrams;
}

async function modelFacts(core, root) {
  const api = {
    async listMeta() {
      return Object.values(core.getAllMetaNodes(root));
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
    async children(node) {
      return core.loadChildren(node);
    },
    id(node) {
      return core.getPath(node);
    }
  };
  return {
    libraries: core.getLibraryNames(root).slice().sort(),
    diagrams: await readDiagrams(api)
  };
}

function projectView({ id, owner, name, kind, libraries, diagrams }) {
  const enabledModelingDomains = domainsFromKind(kind);
  const allowedDiagramTypes = (libraries || [])
    .filter((libraryId) => Object.prototype.hasOwnProperty.call(DIAGRAM_CONCEPT, libraryId))
    .sort();
  const profileDomain = enabledModelingDomains.length === 1 ? enabledModelingDomains[0] : null;
  return {
    id,
    owner,
    name,
    title: name,
    profile: enabledModelingDomains.length ? 'domain' : 'empty',
    profileDomain,
    enabledModelingDomains,
    allowedDiagramTypes,
    diagrams: diagrams || {},
    correspondences: [],
    integrating: null
  };
}

function legacyDiagrams(description) {
  if (typeof description !== 'string' || !description.startsWith('mdss:')) return [];
  try {
    const parsed = JSON.parse(description.slice('mdss:'.length));
    return Object.values((parsed && parsed.diagrams) || {}).filter((inst) => inst && inst.name && inst.diagramType);
  } catch {
    return [];
  }
}

module.exports = {
  domainsFromKind,
  readDiagrams,
  modelFacts,
  projectView,
  legacyDiagrams
};
