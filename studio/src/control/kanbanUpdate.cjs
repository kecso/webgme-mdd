'use strict';

/**
 * Kanban update walker.
 *
 * Mermaid 11 draws each of these as its own shape. The label on that shape
 * is the label of that line. A repeated id does not concatenate labels and
 * does not replace the earlier label.
 *
 * - The first content line's indent is the column indent. A line at that
 *   indent is a column. Any other indent is a ticket of the column above it.
 *   A ticket before the columns is a parse error, so Apply never stores it.
 * - Each column line is its own column, in that order, including a repeated
 *   id (`id1[First]` then `id1[Second]`) and a column with no id (`[Doing]`,
 *   or a bare `Todo`). `name` stores an explicit id. `label` stores that
 *   line's display name. A missing id is not a shared key, so those columns
 *   stay apart by position.
 * - Each ticket line is its own ticket. The same id in one column, with the
 *   same or a different label, is two tickets. A later bare `t1` does not
 *   reuse an earlier label: `t1[one]`, `t1[2]`, `t1` display "one", "2",
 *   and "t1". The same id under two columns stays in the column where each
 *   line is written, with that line's label. `[label]` leaves name unset.
 * - Mermaid also paints every ticket of a shared column id into every column
 *   with that id, and paints each of those tickets twice. That second copy
 *   comes from listing the children once per column and then filtering that
 *   list again. The model keeps one ticket per line.
 *
 * Other decisions:
 * - `kanban` is the header and is not an element. A `%%` comment is skipped.
 * - A column contains its tickets. The diagram contains the columns.
 * - `@{ ... }` stays on the ticket as meta text. `assigned` is also copied
 *   onto the assigned attribute. Those references are not checked.
 * - A line has no relation to another line. `name` and `label` are the text
 *   on that line, and repeating them does not reuse a node. Typing the same
 *   text again is a new column or a new ticket.
 * - `moveLine` is the relation that is kept. The line keeps its node. A
 *   ticket is moved under the column now above it. A column keeps its
 *   tickets only while their lines stay under that column line. Order is
 *   the index of the column lines, and of the ticket lines under each one.
 */

const { walkLines, bind, remember, forget, dropUnindexed, skip } = require('./lineWalk.cjs');

const TICKET_REASON = 'This ticket is not under a column, so it is not stored.';

function indentOf(text) {
  const lead = (String(text || '').match(/^[ \t]*/) || [''])[0];
  return lead.replace(/\t/g, '  ').length;
}

function assignedOf(meta) {
  const match = String(meta || '').match(/assigned\s*:\s*(?:'([^']*)'|"([^"]*)"|([^,\s}]+))/i);
  if (!match) return '';
  return match[1] || match[2] || match[3] || '';
}

function parseItem(trimmed) {
  let meta = '';
  let body = trimmed;
  const at = trimmed.indexOf('@{');
  if (at >= 0) {
    meta = trimmed.slice(at).trim();
    body = trimmed.slice(0, at).trim();
  }
  const match = body.match(/^(?:([^\s[\]]+)\s*)?\[([\s\S]*)\]\s*$/);
  if (match) {
    return {
      id: (match[1] || '').trim(),
      label: (match[2] || '').trim(),
      assigned: assignedOf(meta),
      meta
    };
  }
  return { id: body, label: body, assigned: '', meta: '' };
}

function classifyKanbanLine(text) {
  const raw = String(text || '');
  const trimmed = raw.trim();
  const indent = indentOf(raw);
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment', indent };
  if (/^kanban$/i.test(trimmed)) return { kind: 'header', indent };
  return { kind: 'item', indent, ...parseItem(trimmed) };
}

function columnIndent(lines) {
  for (const line of lines || []) {
    const info = classifyKanbanLine(line.text);
    if (info.kind === 'item') return info.indent;
  }
  return null;
}

function roleOf(info, level) {
  if (!info || info.kind !== 'item') return info ? info.kind : 'unknown';
  if (level === null || info.indent === level) return 'column';
  return 'ticket';
}

function lineKey(lineId) {
  return 'line:' + lineId;
}

function columnAttributes(info) {
  const attributes = { label: info.label || '' };
  if (info.id) attributes.name = info.id;
  return attributes;
}

function ticketAttributes(info) {
  const attributes = {
    label: info.label || '',
    assigned: info.assigned || '',
    meta: info.meta || ''
  };
  if (info.id) attributes.name = info.id;
  return attributes;
}

function formatKanbanItem(info, role) {
  const item = info;
  const indent = role === 'ticket' ? '    ' : '  ';
  let body;
  if (!item.id) body = '[' + (item.label || '') + ']';
  else if (role === 'column' && item.id === item.label && !item.meta) body = item.id;
  else body = item.id + '[' + (item.label || '') + ']';
  if (item.meta) body += item.meta;
  return indent + body;
}

function retarget(ctx, from, to) {
  if (!from || !to || from === to) return;
  if (ctx.parents.has(from)) {
    ctx.parents.set(to, ctx.parents.get(from));
    ctx.parents.delete(from);
  }
  if (ctx.orders.has(from)) {
    ctx.orders.set(to, ctx.orders.get(from));
    ctx.orders.delete(from);
  }
  ctx.names.forEach((path, key) => {
    if (path === from) ctx.names.set(key, to);
  });
  ctx.working.forEach((line) => {
    if (line.nodePath === from) line.nodePath = to;
  });
}

function rememberLine(ctx, lineId, nodePath) {
  remember(ctx.names, lineKey(lineId), nodePath);
}

function syncName(api, nodePath, beforeId, afterId) {
  if ((beforeId || '') === (afterId || '')) return;
  if (afterId) api.setAttribute(nodePath, 'name', afterId);
  else api.delAttribute(nodePath, 'name');
}

function writeTicketFields(api, nodePath, before, after) {
  if (!before || before.label !== after.label) api.setAttribute(nodePath, 'label', after.label || '');
  if (!before || before.assigned !== after.assigned) api.setAttribute(nodePath, 'assigned', after.assigned || '');
  if (!before || before.meta !== after.meta) api.setAttribute(nodePath, 'meta', after.meta || '');
  syncName(api, nodePath, before && before.id, after.id);
}

function writeColumnFields(api, nodePath, before, after) {
  if (!before || before.label !== after.label) api.setAttribute(nodePath, 'label', after.label || '');
  syncName(api, nodePath, before && before.id, after.id);
}

function finalLines(baseline, operations) {
  const lines = ((baseline && baseline.lines) || []).map((line) => ({
    id: line.id,
    text: line.text
  }));
  (operations || []).forEach((op) => {
    if (op.op === 'removeLine') {
      const at = lines.findIndex((line) => line.id === op.lineId);
      if (at >= 0) lines.splice(at, 1);
      return;
    }
    if (op.op === 'addLine') {
      lines.splice(op.index, 0, { id: op.lineId, text: op.text });
      return;
    }
    const current = lines.find((line) => line.id === op.lineId);
    if (!current) return;
    if (op.text != null) current.text = op.text;
    if (op.op === 'moveLine') {
      const at = lines.findIndex((line) => line.id === op.lineId);
      const [line] = lines.splice(at, 1);
      lines.splice(op.index, 0, line);
    }
  });
  return lines;
}

function columnBefore(ctx, index) {
  let columnPath = null;
  ctx.working.slice(0, index).forEach((line) => {
    const info = classifyKanbanLine(line.text);
    if (roleOf(info, ctx.columnLevel) === 'column' && line.nodePath) columnPath = line.nodePath;
  });
  return columnPath;
}

function onAdd(ctx, op) {
  const info = classifyKanbanLine(op.text);
  const role = roleOf(info, ctx.columnLevel);
  if (role !== 'column' && role !== 'ticket') return null;
  if (role === 'ticket') {
    const parentPath = columnBefore(ctx, op.index);
    if (!parentPath) {
      skip(ctx, op.lineId, TICKET_REASON);
      return null;
    }
    const nodePath = ctx.api.createChild(parentPath, 'Ticket', ticketAttributes(info));
    ctx.parents.set(nodePath, parentPath);
    rememberLine(ctx, op.lineId, nodePath);
    return bind(ctx, op.lineId, nodePath);
  }
  const nodePath = ctx.api.createChild(ctx.diagramNodePath, 'Column', columnAttributes(info));
  ctx.parents.set(nodePath, ctx.diagramNodePath);
  rememberLine(ctx, op.lineId, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifyKanbanLine(beforeLine.text);
  const role = roleOf(info, ctx.columnLevel);
  if (role !== 'column' && role !== 'ticket') return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifyKanbanLine(beforeLine ? beforeLine.text : '');
  const after = classifyKanbanLine(op.text);
  const beforeRole = roleOf(before, ctx.columnLevel);
  const afterRole = roleOf(after, ctx.columnLevel);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (beforeRole !== afterRole) {
    if (nodePath) {
      forget(ctx.names, lineKey(beforeLine.id));
      dropUnindexed(ctx.api, ctx.names, nodePath);
    }
    return onAdd(ctx, op);
  }
  if ((afterRole === 'column' || afterRole === 'ticket') && !nodePath) return onAdd(ctx, op);
  if (afterRole === 'column') {
    writeColumnFields(ctx.api, nodePath, before, after);
    rememberLine(ctx, op.lineId, nodePath);
    return nodePath;
  }
  if (afterRole === 'ticket') {
    writeTicketFields(ctx.api, nodePath, before, after);
    rememberLine(ctx, op.lineId, nodePath);
    return nodePath;
  }
  return null;
}

function onMove() {}

function settle(ctx, repair) {
  const level = ctx.columnLevel;
  let columnPath = null;
  let columnOrder = 0;
  let ticketOrder = 0;
  ctx.working.forEach((line) => {
    const info = classifyKanbanLine(line.text);
    const role = roleOf(info, level);
    if (role !== 'column' && role !== 'ticket') return;
    if (role === 'ticket' && !columnPath) {
      if (repair && line.nodePath) {
        forget(ctx.names, lineKey(line.id));
        ctx.api.deleteNode(line.nodePath);
        ctx.parents.delete(line.nodePath);
        ctx.orders.delete(line.nodePath);
        line.nodePath = null;
        ctx.bindings.push({ lineId: line.id, nodePath: null });
      }
      return;
    }
    if (!line.nodePath) return;
    const parentPath = role === 'column' ? ctx.diagramNodePath : columnPath;
    let nodePath = line.nodePath;
    if (repair && ctx.parents.get(nodePath) && ctx.parents.get(nodePath) !== parentPath) {
      const previous = nodePath;
      const moved = ctx.api.moveNode(nodePath, parentPath) || nodePath;
      retarget(ctx, previous, moved);
      nodePath = moved;
      line.nodePath = moved;
      if (moved !== previous) bind(ctx, line.id, moved);
    }
    if (parentPath) ctx.parents.set(nodePath, parentPath);
    if (role === 'column') {
      if (columnPath !== nodePath) {
        ticketOrder = 0;
        const order = String(columnOrder++);
        if (repair && ctx.orders.get(nodePath) !== order) {
          ctx.api.setAttribute(nodePath, 'order', order);
        }
        ctx.orders.set(nodePath, order);
      }
      columnPath = nodePath;
    } else {
      const order = String(ticketOrder++);
      if (repair && ctx.orders.get(nodePath) !== order) {
        ctx.api.setAttribute(nodePath, 'order', order);
      }
      ctx.orders.set(nodePath, order);
    }
    rememberLine(ctx, line.id, nodePath);
  });
}

function walkKanbanUpdate(baseline, lineOperations, api) {
  const source = baseline || {};
  const plannedLevel = columnIndent(finalLines(source, lineOperations));
  function namesOf(line, live) {
    const info = classifyKanbanLine(line.text);
    if (info.kind !== 'item') return;
    const level = columnIndent(thisLines());
    const role = roleOf(info, level);
    if (role !== 'column' && role !== 'ticket') return;
    live.add(lineKey(line.id));
    if (line.nodePath && held.ctx) {
      held.ctx.names.forEach((path, key) => {
        if (path === line.nodePath) live.add(key);
      });
    }
  }
  function thisLines() {
    return current.working || [];
  }
  const current = { working: source.lines || [] };
  const held = { ctx: null };
  const result = walkLines(baseline, lineOperations, api, {
    seed(ctx) {
      held.ctx = ctx;
      ctx.columnLevel = plannedLevel;
      ctx.parents = new Map();
      ctx.orders = new Map();
      current.working = ctx.working;
      settle(ctx, false);
    },
    add: onAdd,
    remove: onRemove,
    update: onUpdate,
    move: onMove,
    finish(ctx) {
      current.working = ctx.working;
      settle(ctx, true);
    },
    liveNames(line, live) {
      namesOf(line, live);
    }
  });
  return result;
}

module.exports = {
  classifyKanbanLine,
  columnIndent,
  roleOf,
  formatKanbanItem,
  walkKanbanUpdate,
  TICKET_REASON
};
