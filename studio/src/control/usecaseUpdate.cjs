'use strict';

/**
 * Use case diagram update walker.
 *
 * Decisions:
 * - usecase and usecase-beta are the header and are not elements.
 *   `direction LR` (TB, TD, BT, RL, LR) sets the diagram direction.
 *   title sets the diagram title.
 * - `actor Name` is an Actor. The alias is the name.
 * - `(Use case name)` is a UseCase. The name and the alias are the text inside
 *   the parentheses.
 * - `Actor --> (Use case)` is a Link of kind association. A missing actor or
 *   use case is created from that line. The line's node is the Link.
 * - include, extend, and generalization arrows are not applied. Boundary
 *   rectangles are not applied.
 * - moveLine sets the own attribute order. A kind change deletes the old node
 *   when that node is not a named actor or use case. An actor or use case with
 *   no remaining declaration or link is deleted at the end of the walk.
 */

const { walkLines, bind, remember, forget, dropUnindexed } = require('./lineWalk.cjs');

const ELEMENT = new Set(['actor', 'usecase', 'link']);
const DIRECTIONS = new Set(['TB', 'TD', 'BT', 'RL', 'LR']);

function classifyUsecaseLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^usecase(-beta)?$/i.test(trimmed)) return { kind: 'header' };
  let match = trimmed.match(/^title\s+(.+)$/i);
  if (match) return { kind: 'title', title: match[1].trim() };
  match = trimmed.match(/^direction\s+(TB|TD|BT|RL|LR)$/i);
  if (match && DIRECTIONS.has(match[1].toUpperCase())) {
    return { kind: 'direction', direction: match[1].toUpperCase() };
  }
  match = trimmed.match(/^actor\s+(.+)$/i);
  if (match) return { kind: 'actor', name: match[1].trim() };
  match = trimmed.match(/^\((.+)\)\s*$/);
  if (match) return { kind: 'usecase', name: match[1].trim() };
  match = trimmed.match(/^(.+?)\s+-->\s+\((.+)\)\s*$/);
  if (match) return { kind: 'link', src: match[1].trim(), dst: match[2].trim() };
  return { kind: 'unknown' };
}

function createActor(api, parentPath, spec) {
  return api.createChild(parentPath, 'Actor', { name: spec.name, alias: spec.name });
}

function createUseCase(api, parentPath, spec) {
  return api.createChild(parentPath, 'UseCase', { name: spec.name, alias: spec.name });
}

function createUsecaseLink(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Link', { name: spec.name, kind: 'association' });
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setUsecaseDirection(api, diagramPath, direction) {
  if (diagramPath) api.setAttribute(diagramPath, 'direction', direction);
}

function setUsecaseTitle(api, diagramPath, title) {
  if (diagramPath) api.setAttribute(diagramPath, 'title', title);
}

function deleteUsecaseElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeUsecaseElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function ensureActor(ctx, name) {
  const key = 'actor:' + name;
  if (ctx.names.has(key)) return ctx.names.get(key);
  const nodePath = createActor(ctx.api, ctx.diagramNodePath, { name });
  remember(ctx.names, key, nodePath);
  return nodePath;
}

function ensureUseCase(ctx, name) {
  const key = 'usecase:' + name;
  if (ctx.names.has(key)) return ctx.names.get(key);
  const nodePath = createUseCase(ctx.api, ctx.diagramNodePath, { name });
  remember(ctx.names, key, nodePath);
  return nodePath;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    if (!line.nodePath) return;
    const info = classifyUsecaseLine(line.text);
    if (info.kind === 'actor') remember(ctx.names, 'actor:' + info.name, line.nodePath);
    if (info.kind === 'usecase') remember(ctx.names, 'usecase:' + info.name, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifyUsecaseLine(op.text);
  switch (info.kind) {
    case 'title':
      setUsecaseTitle(ctx.api, ctx.diagramNodePath, info.title);
      return null;
    case 'direction':
      setUsecaseDirection(ctx.api, ctx.diagramNodePath, info.direction);
      return null;
    case 'actor':
      return bind(ctx, op.lineId, ensureActor(ctx, info.name));
    case 'usecase':
      return bind(ctx, op.lineId, ensureUseCase(ctx, info.name));
    case 'link':
      return bind(ctx, op.lineId, createUsecaseLink(ctx.api, ctx.diagramNodePath, {
        name: op.lineId,
        srcPath: ensureActor(ctx, info.src),
        dstPath: ensureUseCase(ctx, info.dst)
      }));
    default:
      return null;
  }
}

function liveNames(line, live) {
  const info = classifyUsecaseLine(line.text);
  if (info.kind === 'actor' && info.name) live.add('actor:' + info.name);
  if (info.kind === 'usecase' && info.name) live.add('usecase:' + info.name);
  if (info.kind === 'link') {
    if (info.src) live.add('actor:' + info.src);
    if (info.dst) live.add('usecase:' + info.dst);
  }
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifyUsecaseLine(beforeLine.text);
  if (!ELEMENT.has(info.kind)) return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyUsecaseLine(beforeLine ? beforeLine.text : '');
  const after = classifyUsecaseLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    dropUnindexed(ctx.api, ctx.names, nodePath);
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  switch (after.kind) {
    case 'title':
      if (before.title !== after.title) setUsecaseTitle(ctx.api, ctx.diagramNodePath, after.title);
      return null;
    case 'direction':
      if (before.direction !== after.direction) setUsecaseDirection(ctx.api, ctx.diagramNodePath, after.direction);
      return null;
    case 'actor':
    case 'usecase':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        ctx.api.setAttribute(nodePath, 'alias', after.name);
        const prefix = after.kind + ':';
        forget(ctx.names, prefix + before.name);
        remember(ctx.names, prefix + after.name, nodePath);
      }
      return nodePath;
    case 'link':
      if (before.src !== after.src) ctx.api.setPointer(nodePath, 'src', ensureActor(ctx, after.src));
      if (before.dst !== after.dst) ctx.api.setPointer(nodePath, 'dst', ensureUseCase(ctx, after.dst));
      return nodePath;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeUsecaseElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkUsecaseUpdate(baseline, lineOperations, api) {
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
  classifyUsecaseLine,
  walkUsecaseUpdate,
  createActor,
  createUseCase,
  createUsecaseLink,
  setUsecaseDirection,
  setUsecaseTitle,
  deleteUsecaseElement,
  placeUsecaseElement
};
