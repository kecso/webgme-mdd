'use strict';

/**
 * Class diagram update walker.
 *
 * Decisions:
 * - classDiagram is the header and is not an element. title sets the diagram title.
 * - `class Name` and `class Name {` create a Class. A later line adopts a Class
 *   that a relationship already created for that name.
 * - A relationship line's left and right ends are src and dst. kind is
 *   inheritance when the mark contains `<|`, composition when it contains `*`,
 *   aggregation when it contains `o`, and association otherwise. Quoted cards
 *   (`"1"` and `"*"`) are srcCard and dstCard. The text after the colon is the
 *   label. Missing classes are created. The line's node is the Relationship.
 *   Pointers follow the written direction.
 * - Dependency (`..>`) and realization (`<|..`) are not applied.
 * - Member and method lines are not applied. Class does not contain Member or
 *   Method, and neither has an owner pointer, so a line inside `{ }` cannot be
 *   stored on its class. Those lines are skipped until `}`.
 * - moveLine sets the own attribute order. A kind change deletes the old node
 *   when that node is not a named class. A class with no remaining declaration
 *   or relationship is deleted at the end of the walk.
 */

const { walkLines, bind, remember, forget, skip, writeChanged, dropUnindexed } = require('./lineWalk.cjs');

const MEMBER_REASON = 'Class does not contain members or methods, and they have no owner, so this line is not applied.';
const ELEMENT = new Set(['class', 'relationship']);

function classifyClassLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^classDiagram\b/i.test(trimmed)) return { kind: 'header' };
  let match = trimmed.match(/^title\s+(.+)$/i);
  if (match) return { kind: 'title', title: match[1].trim() };
  if (trimmed === '}') return { kind: 'close' };
  match = trimmed.match(/^class\s+(\w+)\s*(\{)?\s*$/i);
  if (match) return { kind: 'class', name: match[1], opens: Boolean(match[2]) };
  match = trimmed.match(/^(\w+)\s+"([^"]*)"\s+([<|*o.]*)--([>|*.o]*)\s*"([^"]*)"\s*(\w+)\s*(?::\s*(.*))?$/);
  if (match) {
    return relationship(match[1], match[3], match[4], match[6], match[7], match[2], match[5]);
  }
  match = trimmed.match(/^(\w+)\s+([<|*o.]*)--([>|*.o]*)\s*(\w+)\s*(?::\s*(.*))?$/);
  if (match) return relationship(match[1], match[2], match[3], match[4], match[5], '', '');
  if (/^[\+\-\#\~]/.test(trimmed) || /\(/.test(trimmed)) return { kind: 'member' };
  return { kind: 'unknown' };
}

function relationship(src, left, right, dst, label, srcCard, dstCard) {
  return {
    kind: 'relationship',
    src,
    dst,
    left,
    right,
    label: (label || '').trim(),
    srcCard: srcCard || '',
    dstCard: dstCard || '',
    relKind: relationshipKind(left, right)
  };
}

function relationshipKind(left, right) {
  const mark = String(left || '') + String(right || '');
  if (mark.includes('<|') || mark.includes('|>')) return 'inheritance';
  if (mark.includes('*')) return 'composition';
  if (mark.includes('o')) return 'aggregation';
  return 'association';
}

function createClass(api, parentPath, spec) {
  return api.createChild(parentPath, 'Class', { name: spec.name });
}

function createClassRelationship(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Relationship', {
    name: spec.name,
    kind: spec.relKind || 'association',
    label: spec.label || '',
    srcCard: spec.srcCard || '',
    dstCard: spec.dstCard || ''
  });
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setClassRelationshipText(api, nodePath, before, after) {
  const next = {
    relKind: after.relKind,
    label: after.label || '',
    srcCard: after.srcCard || '',
    dstCard: after.dstCard || ''
  };
  const prev = before ? {
    relKind: before.relKind,
    label: before.label || '',
    srcCard: before.srcCard || '',
    dstCard: before.dstCard || ''
  } : null;
  if (prev && next.relKind !== prev.relKind) api.setAttribute(nodePath, 'kind', next.relKind);
  writeChanged(api, nodePath, prev, next, ['label', 'srcCard', 'dstCard']);
}

function setClassTitle(api, diagramPath, title) {
  if (diagramPath) api.setAttribute(diagramPath, 'title', title);
}

function deleteClassElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeClassElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function ensureClass(ctx, name) {
  if (!name) return null;
  if (ctx.names.has(name)) return ctx.names.get(name);
  const nodePath = createClass(ctx.api, ctx.diagramNodePath, { name });
  remember(ctx.names, name, nodePath);
  return nodePath;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifyClassLine(line.text);
    if (info.kind === 'class' && line.nodePath) remember(ctx.names, info.name, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifyClassLine(op.text);
  switch (info.kind) {
    case 'title':
      setClassTitle(ctx.api, ctx.diagramNodePath, info.title);
      return null;
    case 'class':
      return addClass(ctx, op, info);
    case 'relationship':
      return addRelationship(ctx, op, info);
    case 'member':
      skip(ctx, op.lineId, MEMBER_REASON);
      return null;
    default:
      return null;
  }
}

function addClass(ctx, op, info) {
  if (ctx.names.has(info.name)) return bind(ctx, op.lineId, ctx.names.get(info.name));
  const nodePath = createClass(ctx.api, ctx.diagramNodePath, info);
  remember(ctx.names, info.name, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addRelationship(ctx, op, info) {
  const nodePath = createClassRelationship(ctx.api, ctx.diagramNodePath, {
    name: op.lineId,
    relKind: info.relKind,
    label: info.label,
    srcCard: info.srcCard,
    dstCard: info.dstCard,
    srcPath: ensureClass(ctx, info.src),
    dstPath: ensureClass(ctx, info.dst)
  });
  return bind(ctx, op.lineId, nodePath);
}

function liveNames(line, live) {
  const info = classifyClassLine(line.text);
  if (info.kind === 'class' && info.name) live.add(info.name);
  if (info.kind === 'relationship') {
    if (info.src) live.add(info.src);
    if (info.dst) live.add(info.dst);
  }
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifyClassLine(beforeLine.text);
  if (!ELEMENT.has(info.kind)) return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyClassLine(beforeLine ? beforeLine.text : '');
  const after = classifyClassLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    dropUnindexed(ctx.api, ctx.names, nodePath);
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  switch (after.kind) {
    case 'title':
      if (before.title !== after.title) setClassTitle(ctx.api, ctx.diagramNodePath, after.title);
      return null;
    case 'class':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      return nodePath;
    case 'relationship':
      if (before.src !== after.src) ctx.api.setPointer(nodePath, 'src', ensureClass(ctx, after.src));
      if (before.dst !== after.dst) ctx.api.setPointer(nodePath, 'dst', ensureClass(ctx, after.dst));
      setClassRelationshipText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'member':
      skip(ctx, op.lineId, MEMBER_REASON);
      return null;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeClassElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkClassUpdate(baseline, lineOperations, api) {
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
  classifyClassLine,
  walkClassUpdate,
  createClass,
  createClassRelationship,
  setClassRelationshipText,
  setClassTitle,
  deleteClassElement,
  placeClassElement,
  MEMBER_REASON
};
