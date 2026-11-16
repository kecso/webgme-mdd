'use strict';

/**
 * C4 diagram update walker.
 *
 * Decisions:
 * - The header keyword is the diagram level: C4Context, C4Container,
 *   C4Component, C4Dynamic, or C4Deployment. title sets the diagram title.
 * - Person, System, System_Ext, SystemDb, SystemQueue, Container, Container_Ext,
 *   ContainerDb, Component, Component_Ext, and a one-line Boundary(...) are
 *   elements. The first argument is the name used by Rel. The next arguments
 *   are alias and description. A Container or Component with four arguments
 *   stores the third as technology and the fourth as description. A keyword
 *   containing _Ext sets external to true. kind is the keyword for System,
 *   Container, and Boundary. Component is stored as a Container.
 * - Rel and BiRel create a Relation. technology is the fourth argument.
 *   BiRel sets bidirectional to true. An end that has no element line yet is
 *   not invented, because it could be a person, system, container, or boundary.
 *   That pointer is left unset.
 * - Rel_Back and the direction-specific Rel forms are not applied.
 * - A Boundary block that wraps other lines in braces is not applied. Nested
 *   elements stay on the diagram.
 * - moveLine sets the own attribute order. A kind change deletes the old node.
 */

const { walkLines, bind, remember, forget, skip } = require('./lineWalk.cjs');

const END_REASON = 'This relation end is not an element line yet, so that pointer is not set.';
const ELEMENT = new Set(['element', 'relation']);

function splitArgs(inner) {
  const args = [];
  let current = '';
  let quoted = false;
  for (const ch of String(inner || '')) {
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === ',' && !quoted) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function conceptFor(keyword) {
  if (keyword === 'Person') return 'Person';
  if (keyword === 'Boundary') return 'Boundary';
  if (keyword.startsWith('Container') || keyword.startsWith('Component')) return 'Container';
  if (keyword.startsWith('System')) return 'System';
  return null;
}

function classifyC4Line(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  let match = trimmed.match(/^(C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/);
  if (match) return { kind: 'header', level: match[1] };
  match = trimmed.match(/^title\s+(.+)$/i);
  if (match) return { kind: 'title', title: match[1].trim() };
  match = trimmed.match(/^(Person|System_Ext|SystemDb|SystemQueue|System|Container_Ext|ContainerDb|Container|Component_Ext|Component|Boundary)\s*\((.*)\)\s*$/);
  if (match && !trimmed.includes('{')) {
    const args = splitArgs(match[2]);
    const keyword = match[1];
    const concept = conceptFor(keyword);
    const fields = { alias: args[1] || args[0] || '', description: args[2] || '', technology: '' };
    if ((concept === 'Container') && args.length >= 4) {
      fields.technology = args[2] || '';
      fields.description = args[3] || '';
    }
    return {
      kind: 'element',
      concept,
      keyword,
      name: args[0] || '',
      alias: concept === 'Boundary' ? '' : fields.alias,
      label: concept === 'Boundary' ? (args[1] || args[0] || '') : '',
      description: concept === 'Boundary' ? '' : fields.description,
      technology: fields.technology,
      external: /_Ext/.test(keyword) ? 'true' : 'false'
    };
  }
  match = trimmed.match(/^(BiRel|Rel)\s*\((.*)\)\s*$/);
  if (match) {
    const args = splitArgs(match[2]);
    return {
      kind: 'relation',
      keyword: match[1],
      src: args[0] || '',
      dst: args[1] || '',
      label: args[2] || '',
      technology: args[3] || '',
      bidirectional: match[1] === 'BiRel' ? 'true' : 'false'
    };
  }
  return { kind: 'unknown' };
}

function createC4Element(api, parentPath, spec) {
  const attributes = { name: spec.name };
  if (spec.concept === 'Boundary') {
    attributes.label = spec.label || '';
    attributes.kind = spec.keyword;
  } else {
    attributes.alias = spec.alias || '';
    attributes.description = spec.description || '';
    attributes.external = spec.external || 'false';
    if (spec.concept !== 'Person') attributes.kind = spec.keyword;
    if (spec.concept === 'Container') attributes.technology = spec.technology || '';
  }
  return api.createChild(parentPath, spec.concept, attributes);
}

function setC4ElementText(api, nodePath, before, after) {
  if (after.concept === 'Boundary') {
    if (!before || before.label !== after.label) api.setAttribute(nodePath, 'label', after.label || '');
    if (!before || before.keyword !== after.keyword) api.setAttribute(nodePath, 'kind', after.keyword);
    return;
  }
  if (!before || before.alias !== after.alias) api.setAttribute(nodePath, 'alias', after.alias || '');
  if (!before || before.description !== after.description) api.setAttribute(nodePath, 'description', after.description || '');
  if (!before || before.external !== after.external) api.setAttribute(nodePath, 'external', after.external || 'false');
  if (after.concept !== 'Person' && (!before || before.keyword !== after.keyword)) {
    api.setAttribute(nodePath, 'kind', after.keyword);
  }
  if (after.concept === 'Container' && (!before || before.technology !== after.technology)) {
    api.setAttribute(nodePath, 'technology', after.technology || '');
  }
}

function createC4Relation(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Relation', {
    name: spec.name,
    label: spec.label || '',
    technology: spec.technology || '',
    bidirectional: spec.bidirectional || 'false'
  });
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setC4RelationText(api, nodePath, before, after) {
  if (!before || before.label !== after.label) api.setAttribute(nodePath, 'label', after.label || '');
  if (!before || before.technology !== after.technology) api.setAttribute(nodePath, 'technology', after.technology || '');
  if (!before || before.bidirectional !== after.bidirectional) {
    api.setAttribute(nodePath, 'bidirectional', after.bidirectional || 'false');
  }
}

function setC4Level(api, diagramPath, level) {
  if (diagramPath) api.setAttribute(diagramPath, 'level', level);
}

function setC4Title(api, diagramPath, title) {
  if (diagramPath) api.setAttribute(diagramPath, 'title', title);
}

function deleteC4Element(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeC4Element(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function knownEnd(ctx, name, lineId) {
  if (name && ctx.names.has(name)) return ctx.names.get(name);
  skip(ctx, lineId, END_REASON);
  return null;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifyC4Line(line.text);
    if (info.kind === 'element' && line.nodePath) remember(ctx.names, info.name, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifyC4Line(op.text);
  switch (info.kind) {
    case 'header':
      setC4Level(ctx.api, ctx.diagramNodePath, info.level);
      return null;
    case 'title':
      setC4Title(ctx.api, ctx.diagramNodePath, info.title);
      return null;
    case 'element':
      return addElement(ctx, op, info);
    case 'relation':
      return addRelation(ctx, op, info);
    default:
      return null;
  }
}

function addElement(ctx, op, info) {
  if (!info.name || !info.concept) return null;
  if (ctx.names.has(info.name)) {
    const nodePath = ctx.names.get(info.name);
    setC4ElementText(ctx.api, nodePath, null, info);
    return bind(ctx, op.lineId, nodePath);
  }
  const nodePath = createC4Element(ctx.api, ctx.diagramNodePath, info);
  remember(ctx.names, info.name, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addRelation(ctx, op, info) {
  const nodePath = createC4Relation(ctx.api, ctx.diagramNodePath, {
    name: op.lineId,
    label: info.label,
    technology: info.technology,
    bidirectional: info.bidirectional,
    srcPath: knownEnd(ctx, info.src, op.lineId),
    dstPath: knownEnd(ctx, info.dst, op.lineId)
  });
  return bind(ctx, op.lineId, nodePath);
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifyC4Line(beforeLine.text);
  if (!ELEMENT.has(info.kind)) return;
  deleteC4Element(ctx.api, beforeLine.nodePath);
  if (info.kind === 'element') forget(ctx.names, info.name);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyC4Line(beforeLine ? beforeLine.text : '');
  const after = classifyC4Line(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind || (after.kind === 'element' && before.concept !== after.concept)) {
    if (nodePath && ELEMENT.has(before.kind)) {
      deleteC4Element(ctx.api, nodePath);
      if (before.kind === 'element') forget(ctx.names, before.name);
    }
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  switch (after.kind) {
    case 'header':
      if (before.level !== after.level) setC4Level(ctx.api, ctx.diagramNodePath, after.level);
      return null;
    case 'title':
      if (before.title !== after.title) setC4Title(ctx.api, ctx.diagramNodePath, after.title);
      return null;
    case 'element':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      setC4ElementText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'relation':
      if (before.src !== after.src) {
        const srcPath = knownEnd(ctx, after.src, op.lineId);
        if (srcPath) ctx.api.setPointer(nodePath, 'src', srcPath);
      }
      if (before.dst !== after.dst) {
        const dstPath = knownEnd(ctx, after.dst, op.lineId);
        if (dstPath) ctx.api.setPointer(nodePath, 'dst', dstPath);
      }
      setC4RelationText(ctx.api, nodePath, before, after);
      return nodePath;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeC4Element(ctx.api, beforeLine.nodePath, op.index);
}

function walkC4Update(baseline, lineOperations, api) {
  return walkLines(baseline, lineOperations, api, {
    seed,
    add: onAdd,
    remove: onRemove,
    update: onUpdate,
    move: onMove
  });
}

module.exports = {
  classifyC4Line,
  walkC4Update,
  createC4Element,
  createC4Relation,
  setC4ElementText,
  setC4RelationText,
  setC4Level,
  setC4Title,
  deleteC4Element,
  placeC4Element,
  END_REASON
};
