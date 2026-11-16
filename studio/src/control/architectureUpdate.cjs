'use strict';

/**
 * Architecture diagram update walker.
 *
 * Decisions:
 * - architecture-beta is the header and is not an element.
 * - `group id(icon)[Label]` is a Group. `service id(icon)[Label] in group` is
 *   a Service. The id is the name, the parentheses are the icon, and the
 *   brackets are the label. inGroup stores the group id.
 * - A service is a child of its group when that group line already has a node.
 *   Otherwise it stays on the diagram. Group contains Service, not Edge, so an
 *   edge always stays on the diagram.
 * - `id:Side --> Side:id` is an Edge. The side letters are srcSide and dstSide.
 *   The ends are services or groups already declared. A missing end is not
 *   invented, and that pointer is left unset.
 * - moveLine sets the own attribute order. A kind change deletes the old node
 *   when that node is not a named group or service. A group or service with no
 *   remaining declaration or edge is deleted at the end of the walk.
 */

const { walkLines, bind, remember, forget, skip, dropUnindexed } = require('./lineWalk.cjs');

const END_REASON = 'This edge end is not a group or service line yet, so that pointer is not set.';
const ELEMENT = new Set(['group', 'service', 'edge']);

function classifyArchitectureLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^architecture-beta\b/i.test(trimmed)) return { kind: 'header' };
  let match = trimmed.match(/^group\s+(\w+)(?:\(([^)]*)\))?(?:\[([^\]]*)\])?\s*$/i);
  if (match) return { kind: 'group', name: match[1], icon: match[2] || '', label: match[3] || match[1] };
  match = trimmed.match(/^service\s+(\w+)(?:\(([^)]*)\))?(?:\[([^\]]*)\])?(?:\s+in\s+(\w+))?\s*$/i);
  if (match) {
    return {
      kind: 'service',
      name: match[1],
      icon: match[2] || '',
      label: match[3] || match[1],
      inGroup: match[4] || ''
    };
  }
  match = trimmed.match(/^(\w+):([A-Za-z]+)\s+-+>+\s+([A-Za-z]+):(\w+)\s*$/);
  if (match) {
    return { kind: 'edge', src: match[1], srcSide: match[2], dstSide: match[3], dst: match[4] };
  }
  return { kind: 'unknown' };
}

function createGroup(api, parentPath, spec) {
  return api.createChild(parentPath, 'Group', {
    name: spec.name,
    icon: spec.icon || '',
    label: spec.label || spec.name
  });
}

function setGroupText(api, nodePath, before, after) {
  if (!before || before.icon !== after.icon) api.setAttribute(nodePath, 'icon', after.icon || '');
  if (!before || before.label !== after.label) api.setAttribute(nodePath, 'label', after.label || '');
}

function createService(api, parentPath, spec) {
  return api.createChild(parentPath, 'Service', {
    name: spec.name,
    icon: spec.icon || '',
    label: spec.label || spec.name,
    inGroup: spec.inGroup || ''
  });
}

function setServiceText(api, nodePath, before, after) {
  setGroupText(api, nodePath, before, after);
  if (!before || before.inGroup !== after.inGroup) api.setAttribute(nodePath, 'inGroup', after.inGroup || '');
}

function createArchitectureEdge(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Edge', {
    name: spec.name,
    label: '',
    srcSide: spec.srcSide || '',
    dstSide: spec.dstSide || ''
  });
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setArchitectureEdgeEnds(api, nodePath, before, after, srcPath, dstPath) {
  if (srcPath && (!before || before.src !== after.src)) api.setPointer(nodePath, 'src', srcPath);
  if (dstPath && (!before || before.dst !== after.dst)) api.setPointer(nodePath, 'dst', dstPath);
  if (!before || before.srcSide !== after.srcSide) api.setAttribute(nodePath, 'srcSide', after.srcSide || '');
  if (!before || before.dstSide !== after.dstSide) api.setAttribute(nodePath, 'dstSide', after.dstSide || '');
}

function deleteArchitectureElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeArchitectureElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function knownEnd(ctx, name, lineId) {
  if (name && ctx.names.has(name)) return ctx.names.get(name);
  skip(ctx, lineId, END_REASON);
  return null;
}

function serviceParent(ctx, inGroup) {
  if (inGroup && ctx.names.has(inGroup)) return ctx.names.get(inGroup);
  return ctx.diagramNodePath;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifyArchitectureLine(line.text);
    if ((info.kind === 'group' || info.kind === 'service') && line.nodePath) {
      remember(ctx.names, info.name, line.nodePath);
    }
  });
}

function onAdd(ctx, op) {
  const info = classifyArchitectureLine(op.text);
  switch (info.kind) {
    case 'group':
      return addGroup(ctx, op, info);
    case 'service':
      return addService(ctx, op, info);
    case 'edge':
      return addEdge(ctx, op, info);
    default:
      return null;
  }
}

function addGroup(ctx, op, info) {
  if (ctx.names.has(info.name)) {
    setGroupText(ctx.api, ctx.names.get(info.name), null, info);
    return bind(ctx, op.lineId, ctx.names.get(info.name));
  }
  const nodePath = createGroup(ctx.api, ctx.diagramNodePath, info);
  remember(ctx.names, info.name, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addService(ctx, op, info) {
  if (ctx.names.has(info.name)) {
    setServiceText(ctx.api, ctx.names.get(info.name), null, info);
    return bind(ctx, op.lineId, ctx.names.get(info.name));
  }
  const nodePath = createService(ctx.api, serviceParent(ctx, info.inGroup), info);
  remember(ctx.names, info.name, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addEdge(ctx, op, info) {
  const nodePath = createArchitectureEdge(ctx.api, ctx.diagramNodePath, {
    name: op.lineId,
    srcSide: info.srcSide,
    dstSide: info.dstSide,
    srcPath: knownEnd(ctx, info.src, op.lineId),
    dstPath: knownEnd(ctx, info.dst, op.lineId)
  });
  return bind(ctx, op.lineId, nodePath);
}

function liveNames(line, live) {
  const info = classifyArchitectureLine(line.text);
  if ((info.kind === 'group' || info.kind === 'service') && info.name) live.add(info.name);
  if (info.kind === 'service' && info.inGroup) live.add(info.inGroup);
  if (info.kind === 'edge') {
    if (info.src) live.add(info.src);
    if (info.dst) live.add(info.dst);
  }
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifyArchitectureLine(beforeLine.text);
  if (!ELEMENT.has(info.kind)) return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyArchitectureLine(beforeLine ? beforeLine.text : '');
  const after = classifyArchitectureLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    dropUnindexed(ctx.api, ctx.names, nodePath);
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  switch (after.kind) {
    case 'group':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      setGroupText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'service':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      setServiceText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'edge':
      setArchitectureEdgeEnds(
        ctx.api,
        nodePath,
        before,
        after,
        before.src !== after.src ? knownEnd(ctx, after.src, op.lineId) : null,
        before.dst !== after.dst ? knownEnd(ctx, after.dst, op.lineId) : null
      );
      return nodePath;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeArchitectureElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkArchitectureUpdate(baseline, lineOperations, api) {
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
  classifyArchitectureLine,
  walkArchitectureUpdate,
  createGroup,
  createService,
  createArchitectureEdge,
  setGroupText,
  setServiceText,
  setArchitectureEdgeEnds,
  deleteArchitectureElement,
  placeArchitectureElement,
  END_REASON
};
