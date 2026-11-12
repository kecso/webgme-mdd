'use strict';

/**
 * Build a webgme-json-importer document (deepforge-dev/webgme-json-importer)
 * from a legacy @meta: Language.json or from a concept map.
 *
 * ROOT holds FCO and every concept. The container concept (FlowChart,
 * BlockDiagram, EARSSpecification, …) contains every other concept.
 * Translator plugins are registered on that diagram concept.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const CONTAINER_NAMES = {
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

function containerName(diagramId) {
  const name = CONTAINER_NAMES[diagramId];
  if (!name) throw new Error('No container concept name for ' + diagramId);
  return name;
}

function guidFor(diagramId, name) {
  const hex = crypto.createHash('sha1').update(`webgme-mdd:${diagramId}:${name}`).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function relidFor(index) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let n = index;
  let out = '';
  do {
    out = alphabet[n % alphabet.length] + out;
    n = Math.floor(n / alphabet.length);
  } while (n > 0);
  return out;
}

function isImporterDocument(spec) {
  return !!(spec && spec.guid && spec.pointers && spec.attributes && spec.attributes.name === 'ROOT');
}

function conceptName(node) {
  if (node && node.attributes && node.attributes.name) return node.attributes.name;
  const id = (node && node.id) || '';
  return id.indexOf('@meta:') === 0 ? id.slice(6) : id;
}

function metaKeyName(key) {
  return String(key || '').indexOf('@meta:') === 0 ? String(key).slice(6) : String(key || '');
}

function metaNode(fields) {
  return {
    id: fields.id,
    path: fields.path,
    guid: fields.guid,
    attributes: fields.attributes,
    attribute_meta: fields.attribute_meta,
    pointers: fields.pointers,
    pointer_meta: fields.pointer_meta,
    mixins: fields.mixins || [],
    registry: fields.registry,
    sets: fields.sets || {},
    member_registry: fields.member_registry || {},
    member_attributes: fields.member_attributes || {},
    children: fields.children || [],
    children_meta: fields.children_meta
  };
}

/**
 * @param {string} diagramId
 * @param {Array<object>} concepts name, attributes, attributeMeta, pointerMeta, contains, position, registry
 * @param {string} mainName
 * @param {string} validPlugins
 */
function buildDocument(diagramId, concepts, mainName, validPlugins) {
  const fcoGuid = guidFor(diagramId, 'FCO');
  const rootGuid = guidFor(diagramId, 'ROOT');
  const sheetId = 'MetaAspectSet_' + guidFor(diagramId, 'META');
  const plugins = String(validPlugins || '').trim();
  const rootPluginList = plugins
    .split(/\s+/)
    .filter((name) => name === 'ApplyLanguageMeta' || name.indexOf('Import') === 0)
    .join(' ');

  const guidOf = {};
  concepts.forEach((concept) => {
    guidOf[concept.name] = guidFor(diagramId, concept.name);
  });

  const ordered = concepts.filter((c) => c.name !== mainName).concat(concepts.filter((c) => c.name === mainName));

  function rewriteContains(contains) {
    const names = Object.keys(contains || {});
    if (!names.length) return null;
    const out = {};
    names.forEach((name) => {
      const guid = guidOf[name];
      if (!guid) return;
      const lim = contains[name] || {};
      out[guid] = {
        min: lim.min != null ? lim.min : -1,
        max: lim.max != null ? lim.max : -1
      };
    });
    return Object.keys(out).length ? out : null;
  }

  function rewritePointers(pointerMeta) {
    const out = {};
    Object.keys(pointerMeta || {}).forEach((ptr) => {
      const def = pointerMeta[ptr] || {};
      const next = {
        min: def.min != null ? def.min : 0,
        max: def.max != null ? def.max : 1
      };
      Object.keys(def.targets || {}).forEach((name) => {
        const guid = guidOf[name];
        if (!guid) return;
        const lim = def.targets[name] || {};
        next[guid] = {
          min: lim.min != null ? lim.min : -1,
          max: lim.max != null ? lim.max : 1
        };
      });
      out[ptr] = next;
    });
    return out;
  }

  const fco = metaNode({
    id: fcoGuid,
    path: '/1',
    guid: fcoGuid,
    attributes: { name: 'FCO' },
    attribute_meta: { name: { type: 'string' } },
    pointers: { base: null },
    pointer_meta: {},
    registry: {
      position: { x: 80, y: 70 },
      DisplayFormat: '$name'
    },
    children_meta: null
  });

  const metaNodes = [fco];
  ordered.forEach((concept, index) => {
    const guid = guidOf[concept.name];
    const isMain = concept.name === mainName;
    const pointerMeta = rewritePointers(concept.pointerMeta);
    const pointers = { base: fcoGuid };
    Object.keys(pointerMeta).forEach((ptr) => {
      if (pointerMeta[ptr].max === 1) pointers[ptr] = null;
    });
    let contains = Object.assign({}, concept.contains || {});
    if (isMain) {
      concepts.forEach((other) => {
        if (other.name === concept.name) return;
        if (!contains[other.name]) contains[other.name] = { min: -1, max: -1 };
      });
    }
    const registry = Object.assign({}, concept.registry || {}, {
      position: concept.position || { x: 100 + (index % 4) * 220, y: 180 + Math.floor(index / 4) * 160 }
    });
    if (isMain && plugins) registry.validPlugins = plugins;

    metaNodes.push(metaNode({
      id: guid,
      path: '/' + relidFor(index),
      guid: guid,
      attributes: concept.attributes,
      attribute_meta: concept.attributeMeta || {},
      pointers: pointers,
      pointer_meta: pointerMeta,
      registry: registry,
      children_meta: rewriteContains(contains)
    }));
  });

  const memberIds = metaNodes.map((node) => node.guid);
  const memberRegistry = {};
  const memberAttributes = {};
  metaNodes.forEach((node) => {
    memberRegistry[node.guid] = { position: node.registry.position };
    memberAttributes[node.guid] = {};
  });

  const rootRegistry = {};
  if (rootPluginList) rootRegistry.validPlugins = rootPluginList;
  rootRegistry.ProjectRegistry = { FCO_ID: '/1' };
  rootRegistry.MetaSheets = [{ SetID: sheetId, order: 0, title: 'META' }];

  return metaNode({
    id: rootGuid,
    path: '',
    guid: rootGuid,
    attributes: { name: 'ROOT' },
    attribute_meta: { name: { type: 'string' } },
    pointers: { base: null },
    pointer_meta: {},
    registry: rootRegistry,
    sets: {
      MetaAspectSet: memberIds.slice(),
      [sheetId]: memberIds.slice()
    },
    member_registry: {
      MetaAspectSet: memberRegistry,
      [sheetId]: JSON.parse(JSON.stringify(memberRegistry))
    },
    member_attributes: {
      MetaAspectSet: memberAttributes,
      [sheetId]: JSON.parse(JSON.stringify(memberAttributes))
    },
    children: metaNodes,
    children_meta: {
      [fcoGuid]: { min: -1, max: -1 }
    }
  });
}

function reorderDocument(spec) {
  if (!isImporterDocument(spec)) return spec;
  const rootRegistry = {};
  if (spec.registry.validPlugins) rootRegistry.validPlugins = spec.registry.validPlugins;
  if (spec.registry.ProjectRegistry) rootRegistry.ProjectRegistry = spec.registry.ProjectRegistry;
  if (spec.registry.MetaSheets) rootRegistry.MetaSheets = spec.registry.MetaSheets;
  return metaNode({
    id: spec.id,
    path: spec.path,
    guid: spec.guid,
    attributes: spec.attributes,
    attribute_meta: spec.attribute_meta,
    pointers: spec.pointers,
    pointer_meta: spec.pointer_meta,
    mixins: spec.mixins,
    registry: rootRegistry,
    sets: spec.sets,
    member_registry: spec.member_registry,
    member_attributes: spec.member_attributes,
    children: (spec.children || []).map((child) => metaNode(child)),
    children_meta: spec.children_meta
  });
}

function pointerMetaFromLegacy(node) {
  if (!node.pointer_meta) return null;
  const out = {};
  Object.keys(node.pointer_meta).forEach((ptr) => {
    const def = node.pointer_meta[ptr] || {};
    const targets = {};
    Object.keys(def).forEach((key) => {
      if (key === 'min' || key === 'max') return;
      targets[metaKeyName(key)] = def[key];
    });
    out[ptr] = {
      min: def.min != null ? def.min : 0,
      max: def.max != null ? def.max : 1,
      targets
    };
  });
  return out;
}

function containsFromLegacy(node) {
  const out = {};
  Object.keys(node.children_meta || {}).forEach((key) => {
    if (key === 'min' || key === 'max') return;
    out[metaKeyName(key)] = node.children_meta[key];
  });
  return out;
}

function fromLegacy(diagramId, spec) {
  if (isImporterDocument(spec)) return spec;
  const raw = (spec.children || []).filter((node) => conceptName(node) && conceptName(node) !== 'FCO');
  const preferred = containerName(diagramId);
  const names = raw.map((node) => {
    const name = conceptName(node);
    return name === 'Diagram' || name === 'Specification' ? preferred : name;
  });
  let mainName = names.indexOf(preferred) >= 0 ? preferred : null;
  if (!mainName) {
    const declared = Object.keys(spec.children_meta || {}).filter((key) => key !== 'min' && key !== 'max');
    mainName = declared.length ? metaKeyName(declared[0]) : names[0];
  }
  const concepts = raw.map((node, index) => {
    const rawName = conceptName(node);
    const name = rawName === 'Diagram' || rawName === 'Specification' ? preferred : rawName;
    const registry = Object.assign({}, node.registry || {});
    delete registry.validPlugins;
    const position = registry.position;
    delete registry.position;
    return {
      name,
      attributes: Object.assign({}, node.attributes || {}, { name }),
      attributeMeta: node.attribute_meta || { name: { type: 'string' } },
      pointerMeta: pointerMetaFromLegacy(node),
      contains: containsFromLegacy(node),
      position: position || { x: 100 + (index % 4) * 220, y: 180 + Math.floor(index / 4) * 160 },
      registry
    };
  });
  concepts.forEach((concept) => {
    const contained = {};
    Object.keys(concept.contains || {}).forEach((key) => {
      const next = key === 'Diagram' || key === 'Specification' ? preferred : key;
      contained[next] = concept.contains[key];
    });
    concept.contains = contained;
    if (!concept.pointerMeta) return;
    Object.keys(concept.pointerMeta).forEach((ptr) => {
      const targets = {};
      Object.keys(concept.pointerMeta[ptr].targets || {}).forEach((key) => {
        const next = key === 'Diagram' || key === 'Specification' ? preferred : key;
        targets[next] = concept.pointerMeta[ptr].targets[key];
      });
      concept.pointerMeta[ptr].targets = targets;
    });
  });
  const validPlugins =
    (spec.registry && spec.registry.validPlugins) || 'ImportMermaid ExportMermaid ApplyLanguageMeta';
  return buildDocument(diagramId, concepts, mainName, validPlugins);
}

function fromConceptMap(diagramId, conceptMap, validPlugins) {
  const preferred = containerName(diagramId);
  const renamed = {};
  Object.keys(conceptMap || {}).forEach((name) => {
    const next = name === 'Diagram' || name === 'Specification' ? preferred : name;
    const concept = Object.assign({}, conceptMap[name]);
    if (concept.contains) {
      concept.contains = concept.contains.map((child) =>
        child === 'Diagram' || child === 'Specification' ? preferred : child
      );
    }
    renamed[next] = concept;
  });
  const names = Object.keys(renamed);
  const mainName = renamed[preferred] ? preferred : names[0];
  const concepts = names.map((name, index) => {
    const concept = renamed[name] || {};
    const attributes = { name };
    const attributeMeta = { name: { type: 'string' } };
    (concept.attrs || []).forEach((attr) => {
      if (attr === 'name') return;
      attributes[attr] = '';
      attributeMeta[attr] = { type: 'string' };
    });
    let pointerMeta = null;
    if (concept.pointers && concept.pointers.length) {
      pointerMeta = {};
      concept.pointers.forEach((ptr) => {
        const targets = {};
        names.forEach((other) => {
          targets[other] = { min: -1, max: 1 };
        });
        pointerMeta[ptr] = { min: 0, max: 1, targets };
      });
    }
    if (concept.sets && typeof concept.sets === 'object' && !Array.isArray(concept.sets)) {
      if (!pointerMeta) pointerMeta = {};
      Object.keys(concept.sets).forEach((setName) => {
        const targets = {};
        (concept.sets[setName] || []).forEach((targetName) => {
          targets[targetName] = { min: -1, max: -1 };
        });
        pointerMeta[setName] = { min: -1, max: -1, targets };
      });
    }
    const contains = {};
    (concept.contains || []).forEach((childName) => {
      contains[childName] = { min: -1, max: -1 };
    });
    return {
      name,
      attributes,
      attributeMeta,
      pointerMeta,
      contains,
      position: { x: 100 + (index % 4) * 220, y: 180 + Math.floor(index / 4) * 160 },
      registry: {}
    };
  });
  return buildDocument(
    diagramId,
    concepts,
    mainName,
    validPlugins || 'ImportMermaid ExportMermaid ApplyLanguageMeta'
  );
}

function rewriteLanguageFile(filePath) {
  const diagramId = path.basename(path.dirname(path.dirname(filePath)));
  const spec = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (isImporterDocument(spec)) return false;
  const next = fromLegacy(diagramId, spec);
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2) + '\n');
  return true;
}

function rewriteAll(rootDir) {
  const base = rootDir || path.join(ROOT, 'diagrams');
  const entries = fs.readdirSync(base, { withFileTypes: true });
  const written = [];
  entries.forEach((entry) => {
    if (!entry.isDirectory()) return;
    const filePath = path.join(base, entry.name, 'metamodel', 'Language.json');
    if (!fs.existsSync(filePath)) return;
    if (rewriteLanguageFile(filePath)) written.push(entry.name);
  });
  return written;
}

module.exports = {
  guidFor,
  containerName,
  CONTAINER_NAMES,
  isImporterDocument,
  buildDocument,
  fromLegacy,
  fromConceptMap,
  reorderDocument,
  rewriteLanguageFile,
  rewriteAll
};
