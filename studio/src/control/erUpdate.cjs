'use strict';

/**
 * ER diagram update walker.
 *
 * Decisions:
 * - erDiagram is the header and is not an element.
 * - `Name {` creates an Entity. A relationship may create that entity first;
 *   the later block line adopts it.
 * - `A ||--o{ B : label` is a Relationship. The decorations on either side of
 *   `--` are srcCard and dstCard. The colon text is the label. Missing
 *   entities are created. The line's node is the Relationship.
 * - Attribute lines inside the block are not applied. Entity does not contain
 *   Attribute, and Attribute has no owner, so `string id PK` cannot be stored
 *   on its entity. `}` only closes the block.
 * - moveLine sets the own attribute order. A kind change deletes the old node
 *   when that node is not a named entity. An entity with no remaining block or
 *   relationship is deleted at the end of the walk.
 */

const { walkLines, bind, remember, forget, skip, dropUnindexed } = require('./lineWalk.cjs');

const ATTRIBUTE_REASON = 'Entity does not contain attributes, and an attribute has no owner, so this line is not applied.';
const ELEMENT = new Set(['entity', 'relationship']);

function classifyErLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^erDiagram\b/i.test(trimmed)) return { kind: 'header' };
  if (trimmed === '}') return { kind: 'close' };
  let match = trimmed.match(/^(\w+)\s+(\S+)\s+(\w+)\s*(?::\s*(.*))?$/);
  if (match && match[2].includes('--')) {
    const cards = match[2].split('--');
    return {
      kind: 'relationship',
      src: match[1],
      dst: match[3],
      srcCard: cards[0] || '',
      dstCard: cards[1] || '',
      label: (match[4] || '').trim()
    };
  }
  match = trimmed.match(/^(\w+)\s*(\{)?\s*$/);
  if (match) return { kind: 'entity', name: match[1], opens: Boolean(match[2]) };
  if (/^[A-Za-z_][\w<>]*\s+\w+/.test(trimmed)) return { kind: 'attribute' };
  return { kind: 'unknown' };
}

function createEntity(api, parentPath, spec) {
  return api.createChild(parentPath, 'Entity', { name: spec.name });
}

function createErRelationship(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Relationship', {
    name: spec.name,
    label: spec.label || '',
    srcCard: spec.srcCard || '',
    dstCard: spec.dstCard || ''
  });
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setErRelationshipText(api, nodePath, before, after) {
  if (!before || before.label !== after.label) api.setAttribute(nodePath, 'label', after.label || '');
  if (!before || before.srcCard !== after.srcCard) api.setAttribute(nodePath, 'srcCard', after.srcCard || '');
  if (!before || before.dstCard !== after.dstCard) api.setAttribute(nodePath, 'dstCard', after.dstCard || '');
}

function deleteErElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeErElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function ensureEntity(ctx, name) {
  if (!name) return null;
  if (ctx.names.has(name)) return ctx.names.get(name);
  const nodePath = createEntity(ctx.api, ctx.diagramNodePath, { name });
  remember(ctx.names, name, nodePath);
  return nodePath;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifyErLine(line.text);
    if (info.kind === 'entity' && line.nodePath) remember(ctx.names, info.name, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifyErLine(op.text);
  switch (info.kind) {
    case 'entity':
      if (ctx.names.has(info.name)) return bind(ctx, op.lineId, ctx.names.get(info.name));
      remember(ctx.names, info.name, createEntity(ctx.api, ctx.diagramNodePath, info));
      return bind(ctx, op.lineId, ctx.names.get(info.name));
    case 'relationship': {
      const nodePath = createErRelationship(ctx.api, ctx.diagramNodePath, {
        name: op.lineId,
        label: info.label,
        srcCard: info.srcCard,
        dstCard: info.dstCard,
        srcPath: ensureEntity(ctx, info.src),
        dstPath: ensureEntity(ctx, info.dst)
      });
      return bind(ctx, op.lineId, nodePath);
    }
    case 'attribute':
      skip(ctx, op.lineId, ATTRIBUTE_REASON);
      return null;
    default:
      return null;
  }
}

function liveNames(line, live) {
  const info = classifyErLine(line.text);
  if (info.kind === 'entity' && info.name) live.add(info.name);
  if (info.kind === 'relationship') {
    if (info.src) live.add(info.src);
    if (info.dst) live.add(info.dst);
  }
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifyErLine(beforeLine.text);
  if (!ELEMENT.has(info.kind)) return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyErLine(beforeLine ? beforeLine.text : '');
  const after = classifyErLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    dropUnindexed(ctx.api, ctx.names, nodePath);
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  switch (after.kind) {
    case 'entity':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      return nodePath;
    case 'relationship':
      if (before.src !== after.src) ctx.api.setPointer(nodePath, 'src', ensureEntity(ctx, after.src));
      if (before.dst !== after.dst) ctx.api.setPointer(nodePath, 'dst', ensureEntity(ctx, after.dst));
      setErRelationshipText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'attribute':
      skip(ctx, op.lineId, ATTRIBUTE_REASON);
      return null;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeErElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkErUpdate(baseline, lineOperations, api) {
  return walkLines(baseline, lineOperations, api, {
    seed,
    add: onAdd,
    remove: onRemove,
    update: onUpdate,
    move: onMove,
    liveNames
  });
}

module.exports = {
  classifyErLine,
  walkErUpdate,
  createEntity,
  createErRelationship,
  setErRelationshipText,
  deleteErElement,
  placeErElement,
  ATTRIBUTE_REASON
};
