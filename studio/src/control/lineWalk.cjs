'use strict';

/**
 * Shared replay of diagram line operations.
 * Each walker classifies a line and calls named model transactions.
 * This only keeps the working lines, bindings, and name index in step.
 * Lines that already point at a node are indexed first. Names carried on the
 * baseline fill ids that no current line owns, such as a participant that was
 * created from a message.
 *
 * After the line operations, a named element that the remaining lines neither
 * define nor reference is deleted. The line's own node is deleted immediately
 * only when that node is not one of those names, which is how a connection is
 * removed while its ends wait for this check.
 */

function walkLines(baseline, lineOperations, api, handle) {
  const source = baseline || {};
  const working = (source.lines || []).map((line) => ({
    id: line.id,
    text: line.text,
    nodePath: line.nodePath || null
  }));
  const ctx = {
    api,
    names: new Map(),
    bindings: [],
    skipped: [],
    diagramNodePath: source.diagramNodePath || null,
    working
  };
  if (handle.seed) handle.seed(ctx);
  Object.entries((source.names) || {}).forEach(([name, nodePath]) => {
    if (name && nodePath && !ctx.names.has(name)) ctx.names.set(name, nodePath);
  });
  (lineOperations || []).forEach((op) => {
    const before = working.find((line) => line.id === op.lineId) || null;
    let nodePath = null;
    switch (op.op) {
      case 'addLine':
        nodePath = handle.add(ctx, op, before);
        break;
      case 'removeLine':
        handle.remove(ctx, before, op);
        break;
      case 'updateText':
        nodePath = handle.update(ctx, before, op);
        break;
      case 'moveLine':
        handle.move(ctx, before, op);
        break;
      default:
        break;
    }
    applyWorking(working, op, nodePath);
  });
  if (handle.finish) handle.finish(ctx);
  if (handle.liveNames) {
    const live = new Set();
    ctx.working.forEach((line) => handle.liveNames(line, live));
    releaseUnreferenced(ctx.api, ctx.names, live);
  }
  return {
    steps: (api && api.steps) || [],
    bindings: ctx.bindings,
    names: Object.fromEntries(ctx.names),
    skipped: ctx.skipped
  };
}

function bind(ctx, lineId, nodePath) {
  if (!nodePath) return null;
  ctx.bindings.push({ lineId, nodePath });
  return nodePath;
}

function remember(names, name, nodePath) {
  if (name && nodePath) names.set(name, nodePath);
}

function forget(names, name) {
  if (name) names.delete(name);
}

function isIndexed(names, nodePath) {
  if (!names || !nodePath) return false;
  for (const path of names.values()) {
    if (path === nodePath) return true;
  }
  return false;
}

function dropUnindexed(api, names, nodePath) {
  if (!nodePath || isIndexed(names, nodePath)) return;
  api.deleteNode(nodePath);
}

function releaseUnreferenced(api, names, live) {
  const livePaths = new Set();
  names.forEach((nodePath, name) => {
    if (live.has(name) && nodePath) livePaths.add(nodePath);
  });
  const dropped = [];
  const removed = new Set();
  names.forEach((nodePath, name) => {
    if (live.has(name)) return;
    if (nodePath && !livePaths.has(nodePath) && !removed.has(nodePath)) {
      api.deleteNode(nodePath);
      removed.add(nodePath);
    }
    dropped.push(name);
  });
  dropped.forEach((name) => names.delete(name));
}

function skip(ctx, lineId, reason) {
  ctx.skipped.push({ lineId, reason });
}

function writeChanged(api, nodePath, before, after, keys) {
  keys.forEach((key) => {
    const next = after[key];
    if (next === undefined) return;
    if (!before || before[key] !== next) api.setAttribute(nodePath, key, next);
  });
}

function lineAt(ctx, op, beforeLine) {
  if (beforeLine) {
    const found = ctx.working.findIndex((line) => line.id === beforeLine.id);
    if (found >= 0) return found;
  }
  return typeof op.index === 'number' ? op.index : ctx.working.length;
}

function applyWorking(working, op, nodePath) {
  if (op.op === 'removeLine') {
    const at = working.findIndex((line) => line.id === op.lineId);
    if (at >= 0) working.splice(at, 1);
    return;
  }
  if (op.op === 'addLine') {
    working.splice(op.index, 0, {
      id: op.lineId,
      text: op.text,
      nodePath: nodePath || null
    });
    return;
  }
  const current = working.find((line) => line.id === op.lineId);
  if (!current) return;
  current.text = op.text;
  if (nodePath) current.nodePath = nodePath;
  if (op.op === 'moveLine') {
    const at = working.findIndex((line) => line.id === op.lineId);
    const [line] = working.splice(at, 1);
    working.splice(op.index, 0, line);
  }
}

module.exports = {
  walkLines,
  bind,
  remember,
  forget,
  skip,
  writeChanged,
  lineAt,
  isIndexed,
  dropUnindexed,
  releaseUnreferenced
};
