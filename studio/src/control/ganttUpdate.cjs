'use strict';

/**
 * Gantt update walker.
 *
 * Decisions:
 * - title, dateFormat, axisFormat, and excludes set those diagram attributes.
 *   The gantt header is not an element.
 * - `section Name` creates a Section on the diagram.
 * - A task line is the title, a colon, then comma-separated tokens. done,
 *   active, crit, and milestone are the status. A token after `after` is the
 *   after attribute (the other task's id, stored as text; Task has no
 *   dependency pointer). A YYYY-MM-DD token is start, and a second one is end.
 *   A duration such as 3d is duration. The remaining id is taskId. The first
 *   colon separates the title from those tokens.
 * - Section does not contain Task, and Task has no section pointer, so a task
 *   is a child of the diagram even while a section is open. Section membership
 *   is not stored.
 * - moveLine sets the own attribute order. A kind change deletes the old node
 *   when that node is not a named section or task. A section or task id with
 *   no remaining definition, and no task that says `after` that id, is deleted
 *   at the end of the walk.
 */

const { walkLines, bind, remember, forget, dropUnindexed } = require('./lineWalk.cjs');

const STATUS = new Set(['done', 'active', 'crit', 'milestone']);
const ELEMENT = new Set(['section', 'task']);

function classifyGanttLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^gantt$/i.test(trimmed)) return { kind: 'header' };
  let match = trimmed.match(/^(title|dateFormat|axisFormat|excludes)\s+(.+)$/i);
  if (match) return { kind: 'diagram', attribute: match[1], value: match[2].trim() };
  match = trimmed.match(/^section\s+(.+)$/i);
  if (match) return { kind: 'section', name: match[1].trim() };
  const colon = trimmed.indexOf(':');
  if (colon > 0) return { kind: 'task', ...parseTask(trimmed.slice(0, colon).trim(), trimmed.slice(colon + 1)) };
  return { kind: 'unknown' };
}

function parseTask(title, rest) {
  const task = {
    name: title,
    taskId: '',
    status: '',
    start: '',
    end: '',
    duration: '',
    after: ''
  };
  const statuses = [];
  rest.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    const lower = part.toLowerCase();
    if (STATUS.has(lower)) {
      statuses.push(lower);
      return;
    }
    if (/^after\s+/i.test(part)) {
      task.after = part.replace(/^after\s+/i, '').trim();
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
      if (!task.start) task.start = part;
      else task.end = part;
      return;
    }
    if (/^\d+[a-z]+$/i.test(part)) {
      task.duration = part;
      return;
    }
    if (!task.taskId && /^[\w]+$/.test(part)) task.taskId = part;
  });
  task.status = statuses.join(',');
  return task;
}

function diagramAttribute(info) {
  const names = {
    title: 'title',
    dateformat: 'dateFormat',
    axisformat: 'axisFormat',
    excludes: 'excludes'
  };
  return names[String(info.attribute || '').toLowerCase()] || info.attribute;
}

function createSection(api, parentPath, spec) {
  return api.createChild(parentPath, 'Section', { name: spec.name });
}

function createTask(api, parentPath, spec) {
  return api.createChild(parentPath, 'Task', {
    name: spec.name,
    taskId: spec.taskId || '',
    status: spec.status || '',
    start: spec.start || '',
    end: spec.end || '',
    duration: spec.duration || '',
    after: spec.after || ''
  });
}

function setTaskText(api, nodePath, before, after) {
  ['name', 'taskId', 'status', 'start', 'end', 'duration', 'after'].forEach((key) => {
    const next = after[key] || '';
    if (!before || (before[key] || '') !== next) api.setAttribute(nodePath, key, next);
  });
}

function setGanttAttribute(api, diagramPath, name, value) {
  if (diagramPath) api.setAttribute(diagramPath, name, value);
}

function deleteGanttElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeGanttElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    if (!line.nodePath) return;
    const info = classifyGanttLine(line.text);
    if (info.kind === 'section') remember(ctx.names, info.name, line.nodePath);
    if (info.kind === 'task' && info.taskId) remember(ctx.names, info.taskId, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifyGanttLine(op.text);
  switch (info.kind) {
    case 'diagram':
      setGanttAttribute(ctx.api, ctx.diagramNodePath, diagramAttribute(info), info.value);
      return null;
    case 'section':
      if (ctx.names.has(info.name)) return bind(ctx, op.lineId, ctx.names.get(info.name));
      remember(ctx.names, info.name, createSection(ctx.api, ctx.diagramNodePath, info));
      return bind(ctx, op.lineId, ctx.names.get(info.name));
    case 'task': {
      const nodePath = createTask(ctx.api, ctx.diagramNodePath, info);
      if (info.taskId) remember(ctx.names, info.taskId, nodePath);
      return bind(ctx, op.lineId, nodePath);
    }
    default:
      return null;
  }
}

function liveNames(line, live) {
  const info = classifyGanttLine(line.text);
  if (info.kind === 'section' && info.name) live.add(info.name);
  if (info.kind === 'task') {
    if (info.taskId) live.add(info.taskId);
    if (info.after) live.add(info.after);
  }
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifyGanttLine(beforeLine.text);
  if (!ELEMENT.has(info.kind)) return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyGanttLine(beforeLine ? beforeLine.text : '');
  const after = classifyGanttLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    dropUnindexed(ctx.api, ctx.names, nodePath);
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  switch (after.kind) {
    case 'diagram':
      if (before.value !== after.value || before.attribute.toLowerCase() !== after.attribute.toLowerCase()) {
        setGanttAttribute(ctx.api, ctx.diagramNodePath, diagramAttribute(after), after.value);
      }
      return null;
    case 'section':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      return nodePath;
    case 'task':
      if (before.taskId !== after.taskId) {
        forget(ctx.names, before.taskId);
        remember(ctx.names, after.taskId, nodePath);
      }
      setTaskText(ctx.api, nodePath, before, after);
      return nodePath;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeGanttElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkGanttUpdate(baseline, lineOperations, api) {
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
  classifyGanttLine,
  walkGanttUpdate,
  createSection,
  createTask,
  setTaskText,
  setGanttAttribute,
  deleteGanttElement,
  placeGanttElement
};
