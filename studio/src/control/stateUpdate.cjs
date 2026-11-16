'use strict';

/**
 * State diagram update walker.
 *
 * Decisions:
 * - stateDiagram and stateDiagram-v2 are the header and are not elements.
 *   title sets the diagram title.
 * - A transition line is `src --> dst` with an optional `: description`.
 *   The description is the event. `event [guard] / action` and `event / action`
 *   fill guard and action. Other descriptions stay entirely in event.
 *   Missing states are created. The line's node is the Transition.
 * - `[*]` is one State named `[*]` with kind initial, shared by every line
 *   that writes `[*]`. Other states use kind simple and a label equal to the
 *   name.
 * - `state Name {` opens a composite. State contains State and Transition, so
 *   states and transitions inside the braces are children of that state.
 *   `}` or a bare `end` closes it. A composite line with no node yet does not
 *   receive children; they stay on the diagram.
 * - Notes are children of the diagram, because State does not contain Note.
 *   `note left of`, `note right of`, and `note over` set placement and point
 *   target at the named state. A colon on that line sets the text. Otherwise
 *   the following prose line sets the text, until `end note`. One prose line
 *   is the note text; a later prose line replaces it.
 * - `state "long" as id` is not applied.
 * - moveLine sets the own attribute order. A kind change deletes the old node.
 */

const { walkLines, bind, remember, forget, writeChanged, lineAt } = require('./lineWalk.cjs');

const ELEMENT = new Set(['state', 'transition', 'note']);

function classifyStateLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^stateDiagram(-v2)?\b/i.test(trimmed)) return { kind: 'header' };
  if (/^end\s+note$/i.test(trimmed)) return { kind: 'endNote' };
  let match = trimmed.match(/^title\s+(.+)$/i);
  if (match) return { kind: 'title', title: match[1].trim() };
  if (trimmed === '}') return { kind: 'close' };
  if (/^end$/i.test(trimmed)) return { kind: 'end' };
  match = trimmed.match(/^note\s+(left of|right of|over)\s+(\S+)\s*(?::\s*(.*))?$/i);
  if (match) {
    return {
      kind: 'note',
      placement: match[1].toLowerCase(),
      target: match[2],
      text: (match[3] || '').trim()
    };
  }
  match = trimmed.match(/^state\s+(\w+)\s*(\{)?\s*$/i);
  if (match) return { kind: 'state', name: match[1], opens: Boolean(match[2]), stateKind: 'simple' };
  match = trimmed.match(/^(.+?)\s+-->\s+([^:\n]+?)(?:\s*:\s*(.*))?$/);
  if (match) {
    const description = splitEvent((match[3] || '').trim());
    return {
      kind: 'transition',
      src: match[1].trim(),
      dst: match[2].trim(),
      event: description.event,
      guard: description.guard,
      action: description.action
    };
  }
  return { kind: 'unknown' };
}

function splitEvent(text) {
  if (text.includes('[')) {
    const guarded = text.match(/^(.*?)\s*\[([^\]]*)\]\s*(?:\/\s*(.*))?$/);
    if (guarded) {
      return { event: guarded[1].trim(), guard: guarded[2].trim(), action: (guarded[3] || '').trim() };
    }
  }
  if (text.includes('/')) {
    const acted = text.match(/^(.*?)\s*\/\s*(.*)$/);
    if (acted) return { event: acted[1].trim(), guard: '', action: acted[2].trim() };
  }
  return { event: text, guard: '', action: '' };
}

function regionAt(lines, index, diagramPath) {
  const stack = [diagramPath || null];
  let notePath = null;
  const stop = Math.min(index, lines.length);
  for (let i = 0; i < stop; i += 1) {
    const info = classifyStateLine(lines[i].text);
    if (info.kind === 'state' && info.opens) stack.push(lines[i].nodePath || stack[stack.length - 1]);
    else if ((info.kind === 'close' || info.kind === 'end') && stack.length > 1) stack.pop();
    else if (info.kind === 'note') notePath = lines[i].nodePath || null;
    else if (info.kind === 'endNote') notePath = null;
  }
  return { parent: stack[stack.length - 1], notePath };
}

function createState(api, parentPath, spec) {
  const initial = spec.name === '[*]';
  return api.createChild(parentPath, 'State', {
    name: spec.name,
    kind: initial ? 'initial' : (spec.stateKind || 'simple'),
    label: spec.name
  });
}

function setStateText(api, nodePath, before, after) {
  writeChanged(api, nodePath, before, {
    name: after.name,
    kind: after.name === '[*]' ? 'initial' : (after.stateKind || 'simple'),
    label: after.name
  }, ['name', 'kind', 'label']);
}

function createTransition(api, parentPath, spec) {
  const attributes = { name: spec.name, event: spec.event || '' };
  if (spec.guard) attributes.guard = spec.guard;
  if (spec.action) attributes.action = spec.action;
  const nodePath = api.createChild(parentPath, 'Transition', attributes);
  if (spec.srcPath) api.setPointer(nodePath, 'src', spec.srcPath);
  if (spec.dstPath) api.setPointer(nodePath, 'dst', spec.dstPath);
  return nodePath;
}

function setTransitionEnds(api, nodePath, srcPath, dstPath) {
  if (srcPath) api.setPointer(nodePath, 'src', srcPath);
  if (dstPath) api.setPointer(nodePath, 'dst', dstPath);
}

function setTransitionText(api, nodePath, before, after) {
  writeChanged(api, nodePath, before, after, ['event', 'guard', 'action']);
}

function createStateNote(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Note', {
    name: spec.name,
    text: spec.text || '',
    placement: spec.placement || ''
  });
  if (spec.targetPath) api.setPointer(nodePath, 'target', spec.targetPath);
  return nodePath;
}

function setStateNoteText(api, nodePath, text) {
  api.setAttribute(nodePath, 'text', text);
}

function setStateTitle(api, diagramPath, title) {
  if (diagramPath) api.setAttribute(diagramPath, 'title', title);
}

function deleteStateElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeStateElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function ensureState(ctx, name, parentPath) {
  if (!name) return null;
  if (ctx.names.has(name)) return ctx.names.get(name);
  const nodePath = createState(ctx.api, parentPath, { name });
  remember(ctx.names, name, nodePath);
  return nodePath;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifyStateLine(line.text);
    if (info.kind === 'state' && line.nodePath) remember(ctx.names, info.name, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifyStateLine(op.text);
  const at = typeof op.index === 'number' ? op.index : ctx.working.length;
  const region = regionAt(ctx.working, at, ctx.diagramNodePath);
  switch (info.kind) {
    case 'title':
      setStateTitle(ctx.api, ctx.diagramNodePath, info.title);
      return null;
    case 'state':
      return addState(ctx, op, info, region.parent);
    case 'transition':
      return addTransition(ctx, op, info, region.parent);
    case 'note':
      return addNote(ctx, op, info);
    case 'unknown':
      if (region.notePath) {
        setStateNoteText(ctx.api, region.notePath, String(op.text || '').trim());
      }
      return null;
    default:
      return null;
  }
}

function addState(ctx, op, info, parentPath) {
  if (ctx.names.has(info.name)) return bind(ctx, op.lineId, ctx.names.get(info.name));
  const nodePath = createState(ctx.api, parentPath, info);
  remember(ctx.names, info.name, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addTransition(ctx, op, info, parentPath) {
  const nodePath = createTransition(ctx.api, parentPath, {
    name: op.lineId,
    event: info.event,
    guard: info.guard,
    action: info.action,
    srcPath: ensureState(ctx, info.src, parentPath),
    dstPath: ensureState(ctx, info.dst, parentPath)
  });
  return bind(ctx, op.lineId, nodePath);
}

function addNote(ctx, op, info) {
  const nodePath = createStateNote(ctx.api, ctx.diagramNodePath, {
    name: op.lineId,
    text: info.text,
    placement: info.placement,
    targetPath: ensureState(ctx, info.target, ctx.diagramNodePath)
  });
  return bind(ctx, op.lineId, nodePath);
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine) return;
  const info = classifyStateLine(beforeLine.text);
  const at = ctx.working.findIndex((line) => line.id === beforeLine.id);
  if (info.kind === 'unknown') {
    const region = regionAt(ctx.working, at, ctx.diagramNodePath);
    if (region.notePath) setStateNoteText(ctx.api, region.notePath, '');
    return;
  }
  if (!beforeLine.nodePath || !ELEMENT.has(info.kind)) return;
  deleteStateElement(ctx.api, beforeLine.nodePath);
  if (info.kind === 'state') forget(ctx.names, info.name);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyStateLine(beforeLine ? beforeLine.text : '');
  const after = classifyStateLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    if (nodePath && ELEMENT.has(before.kind)) {
      deleteStateElement(ctx.api, nodePath);
      if (before.kind === 'state') forget(ctx.names, before.name);
    }
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  const at = lineAt(ctx, op, beforeLine);
  const region = regionAt(ctx.working, at, ctx.diagramNodePath);
  switch (after.kind) {
    case 'title':
      if (before.title !== after.title) setStateTitle(ctx.api, ctx.diagramNodePath, after.title);
      return null;
    case 'state':
      if (before.name !== after.name) {
        setStateText(ctx.api, nodePath, before, after);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      return nodePath;
    case 'transition':
      if (before.src !== after.src || before.dst !== after.dst) {
        setTransitionEnds(
          ctx.api,
          nodePath,
          before.src !== after.src ? ensureState(ctx, after.src, region.parent) : null,
          before.dst !== after.dst ? ensureState(ctx, after.dst, region.parent) : null
        );
      }
      setTransitionText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'note':
      if (before.placement !== after.placement) ctx.api.setAttribute(nodePath, 'placement', after.placement);
      if (before.text !== after.text) setStateNoteText(ctx.api, nodePath, after.text);
      if (before.target !== after.target) {
        ctx.api.setPointer(nodePath, 'target', ensureState(ctx, after.target, ctx.diagramNodePath));
      }
      return nodePath;
    case 'unknown':
      if (region.notePath) setStateNoteText(ctx.api, region.notePath, String(op.text || '').trim());
      return null;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeStateElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkStateUpdate(baseline, lineOperations, api) {
  return walkLines(baseline, lineOperations, api, {
    seed,
    add: onAdd,
    remove: onRemove,
    update: onUpdate,
    move: onMove
  });
}

module.exports = {
  classifyStateLine,
  walkStateUpdate,
  createState,
  createTransition,
  createStateNote,
  setStateText,
  setTransitionText,
  setTransitionEnds,
  setStateNoteText,
  setStateTitle,
  deleteStateElement,
  placeStateElement
};
