'use strict';

/**
 * Requirement diagram update walker.
 *
 * Decisions:
 * - requirementDiagram is the header and is not an element.
 * - `requirement Name {` and `element Name {` create those nodes. The field
 *   lines inside the braces update that node: id, text, risk, and verifymethod
 *   on a requirement (id is stored as reqId), type and docref on an element
 *   (type is stored as elementType). `}` closes the block. A field outside a
 *   block is not applied.
 * - Removing a field line clears that attribute. Changing a field line into
 *   another kind clears the old attribute first.
 * - `A - kind -> B` is a Relationship. kind is the word between the dashes
 *   (satisfies, verifies, and the other labels written on the line). The ends
 *   have to be requirement or element lines already applied: a name is not
 *   created here, because it could be either concept. A missing end is skipped
 *   and that pointer is left unset. The line's node is the Relationship.
 * - moveLine sets the own attribute order. A requirement or element with no
 *   remaining declaration or relationship is deleted at the end of the walk.
 */

const { walkLines, bind, remember, forget, skip, lineAt, dropUnindexed } = require('./lineWalk.cjs');

const FIELD_REASON = 'This field is outside a requirement or element block, so it is not applied.';
const UNKNOWN_FIELD = 'This field is not an attribute of the open element, so it is not applied.';
const END_REASON = 'This relationship end is not a requirement or element line yet, so that pointer is not set.';
const REQUIREMENT_FIELDS = { id: 'reqId', text: 'text', risk: 'risk', verifymethod: 'verifymethod' };
const ELEMENT_FIELDS = { type: 'elementType', docref: 'docRef' };
const ELEMENT = new Set(['requirement', 'element', 'relationship']);

function unquote(value) {
  const text = String(value || '').trim();
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  return text;
}

function classifyRequirementLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^requirementDiagram\b/i.test(trimmed)) return { kind: 'header' };
  if (trimmed === '}') return { kind: 'close' };
  let match = trimmed.match(/^(requirement|element)\s+(\w+)\s*(\{)?\s*$/i);
  if (match) {
    return { kind: match[1].toLowerCase(), name: match[2], opens: Boolean(match[3]) };
  }
  match = trimmed.match(/^(\w+)\s+-\s+(\w+)\s+->\s+(\w+)\s*$/);
  if (match) return { kind: 'relationship', src: match[1], relKind: match[2], dst: match[3] };
  match = trimmed.match(/^(\w+)\s*:\s*(.*)$/);
  if (match) return { kind: 'field', field: match[1].toLowerCase(), value: unquote(match[2]) };
  return { kind: 'unknown' };
}

function openElement(lines, index) {
  const stack = [];
  const stop = Math.min(index, lines.length);
  for (let i = 0; i < stop; i += 1) {
    const info = classifyRequirementLine(lines[i].text);
    if ((info.kind === 'requirement' || info.kind === 'element') && info.opens) {
      stack.push({ path: lines[i].nodePath || null, concept: info.kind, name: info.name });
    } else if (info.kind === 'close' && stack.length) stack.pop();
  }
  return stack.length ? stack[stack.length - 1] : null;
}

function attributeName(concept, field) {
  const table = concept === 'element' ? ELEMENT_FIELDS : REQUIREMENT_FIELDS;
  return table[field] || null;
}

function createRequirement(api, parentPath, spec) {
  return api.createChild(parentPath, 'Requirement', { name: spec.name });
}

function createTraceElement(api, parentPath, spec) {
  return api.createChild(parentPath, 'Element', { name: spec.name });
}

function createTraceRelationship(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Relationship', {
    name: spec.name,
    kind: spec.relKind || ''
  });
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setRequirementField(api, nodePath, attribute, value) {
  api.setAttribute(nodePath, attribute, value);
}

function deleteTraceElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeTraceElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function knownEnd(ctx, name, lineId) {
  if (name && ctx.names.has(name)) return ctx.names.get(name);
  skip(ctx, lineId, END_REASON);
  return null;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifyRequirementLine(line.text);
    if ((info.kind === 'requirement' || info.kind === 'element') && line.nodePath) {
      remember(ctx.names, info.name, line.nodePath);
    }
  });
}

function onAdd(ctx, op) {
  const info = classifyRequirementLine(op.text);
  const at = typeof op.index === 'number' ? op.index : ctx.working.length;
  switch (info.kind) {
    case 'requirement':
      return addNamed(ctx, op, info, createRequirement);
    case 'element':
      return addNamed(ctx, op, info, createTraceElement);
    case 'relationship':
      return addRelationship(ctx, op, info);
    case 'field':
      return addField(ctx, op, info, openElement(ctx.working, at));
    default:
      return null;
  }
}

function addNamed(ctx, op, info, create) {
  if (ctx.names.has(info.name)) return bind(ctx, op.lineId, ctx.names.get(info.name));
  const nodePath = create(ctx.api, ctx.diagramNodePath, info);
  remember(ctx.names, info.name, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addRelationship(ctx, op, info) {
  const nodePath = createTraceRelationship(ctx.api, ctx.diagramNodePath, {
    name: op.lineId,
    relKind: info.relKind,
    srcPath: knownEnd(ctx, info.src, op.lineId),
    dstPath: knownEnd(ctx, info.dst, op.lineId)
  });
  return bind(ctx, op.lineId, nodePath);
}

function addField(ctx, op, info, open) {
  if (!open || !open.path) {
    skip(ctx, op.lineId, FIELD_REASON);
    return null;
  }
  const attribute = attributeName(open.concept, info.field);
  if (!attribute) {
    skip(ctx, op.lineId, UNKNOWN_FIELD);
    return null;
  }
  setRequirementField(ctx.api, open.path, attribute, info.value);
  return null;
}

function clearField(ctx, beforeLine, info) {
  const at = ctx.working.findIndex((line) => line.id === beforeLine.id);
  const open = openElement(ctx.working, at);
  if (!open || !open.path) return;
  const attribute = attributeName(open.concept, info.field);
  if (attribute) setRequirementField(ctx.api, open.path, attribute, '');
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine) return;
  const info = classifyRequirementLine(beforeLine.text);
  if (info.kind === 'field') {
    clearField(ctx, beforeLine, info);
    return;
  }
  if (!beforeLine.nodePath || !ELEMENT.has(info.kind)) return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function liveNames(line, live) {
  const info = classifyRequirementLine(line.text);
  if ((info.kind === 'requirement' || info.kind === 'element') && info.name) live.add(info.name);
  if (info.kind === 'relationship') {
    if (info.src) live.add(info.src);
    if (info.dst) live.add(info.dst);
  }
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyRequirementLine(beforeLine ? beforeLine.text : '');
  const after = classifyRequirementLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    if (before.kind === 'field' && beforeLine) clearField(ctx, beforeLine, before);
    dropUnindexed(ctx.api, ctx.names, nodePath);
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  const at = lineAt(ctx, op, beforeLine);
  switch (after.kind) {
    case 'requirement':
    case 'element':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      return nodePath;
    case 'relationship':
      if (before.relKind !== after.relKind) ctx.api.setAttribute(nodePath, 'kind', after.relKind);
      if (before.src !== after.src) {
        const srcPath = knownEnd(ctx, after.src, op.lineId);
        if (srcPath) ctx.api.setPointer(nodePath, 'src', srcPath);
      }
      if (before.dst !== after.dst) {
        const dstPath = knownEnd(ctx, after.dst, op.lineId);
        if (dstPath) ctx.api.setPointer(nodePath, 'dst', dstPath);
      }
      return nodePath;
    case 'field':
      return addField(ctx, op, after, openElement(ctx.working, at));
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeTraceElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkRequirementUpdate(baseline, lineOperations, api) {
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
  classifyRequirementLine,
  walkRequirementUpdate,
  createRequirement,
  createTraceElement,
  createTraceRelationship,
  setRequirementField,
  deleteTraceElement,
  placeTraceElement,
  FIELD_REASON,
  UNKNOWN_FIELD,
  END_REASON
};
