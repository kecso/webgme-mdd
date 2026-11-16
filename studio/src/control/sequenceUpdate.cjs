'use strict';

/**
 * Sequence diagram update walker.
 *
 * Line operations are the input. A line is classified, then a named model
 * transaction writes the node. Lines this edit does not touch are left alone.
 * A line with no node yet is created from that line. Comments (%%) and the
 * sequenceDiagram header are ignored.
 *
 * Decisions:
 * - actor / participant lines are Participant nodes on the diagram. The word
 *   after actor or participant is the name. Text after "as" is the alias, and
 *   the alias defaults to the name. kind is actor or participant.
 * - A message may name a participant that has no line yet. That participant is
 *   created on the diagram (kind participant, alias equal to the name). A later
 *   declaration of the same name adopts that node. Removing a message deletes
 *   that message. A participant stays while a remaining line defines or names
 *   it; otherwise it is deleted at the end of the walk.
 * - A message line needs a colon. The arrow is ->>, -->>, ->, -->, -x, --x,
 *   -), or --). A + or - glued to the arrow is Message.activate. The rest of
 *   the line is the label. The line's node is the Message, named by the line id.
 *   from and to point at Participants.
 * - alt, opt, loop, par, critical, and break open a Fragment of that kind.
 *   The guard text is the label. Messages and notes that follow are children of
 *   that fragment. else is a nested Fragment of kind else inside the open
 *   fragment. A second else replaces the previous else as the open branch.
 *   Mermaid closes an alt/else with one end, so end pops an else and the
 *   fragment it divided. end on its own pops one fragment. A fragment line that
 *   has no node yet does not receive children; they stay on the diagram.
 * - Participants are always children of the diagram. Fragment does not contain
 *   them.
 * - "Note over A,B: text" is a Note. overStart and overEnd point at those
 *   participants. One participant sets both pointers, because each pointer is
 *   1..1. placement is over.
 * - title sets the diagram title. autonumber sets the diagram autonumber
 *   attribute to the rest of the line, or true when the line has no value.
 * - A separate activate line, box, and rect are not applied.
 * - moveLine sets the own attribute order to the new index.
 * - Changing a line from one element kind to another deletes the old node and
 *   creates the new one.
 */

const { walkLines, bind, remember, forget, writeChanged, dropUnindexed } = require('./lineWalk.cjs');

const ELEMENT = new Set(['participant', 'message', 'fragment', 'note']);

function classifySequenceLine(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.startsWith('%%')) return { kind: 'comment' };
  if (/^sequenceDiagram\b/i.test(trimmed)) return { kind: 'header' };
  if (/^autonumber\b/i.test(trimmed)) {
    const value = trimmed.replace(/^autonumber\b/i, '').trim();
    return { kind: 'autonumber', value: value || 'true' };
  }
  let match = trimmed.match(/^title\s+(.+)$/i);
  if (match) return { kind: 'title', title: match[1].trim() };
  match = trimmed.match(/^(actor|participant)\s+(\S+)(?:\s+as\s+(.+))?$/i);
  if (match) {
    return {
      kind: 'participant',
      participantKind: match[1].toLowerCase(),
      name: match[2],
      alias: (match[3] || match[2]).trim()
    };
  }
  if (/^end$/i.test(trimmed)) return { kind: 'end' };
  match = trimmed.match(/^(alt|opt|loop|par|critical|break|else)\b\s*(.*)$/i);
  if (match) {
    return { kind: 'fragment', fragmentKind: match[1].toLowerCase(), label: match[2].trim() };
  }
  match = trimmed.match(/^Note\s+over\s+([^,:]+)(?:,\s*([^:]+))?\s*:\s*(.*)$/i);
  if (match) {
    const start = match[1].trim();
    return {
      kind: 'note',
      placement: 'over',
      start,
      end: (match[2] || start).trim(),
      text: match[3].trim()
    };
  }
  match = trimmed.match(/^(\S+?)\s*(-{1,2}(?:>>?|x|\)))([+-])?\s*(\S+)\s*:\s*(.*)$/);
  if (match) {
    return {
      kind: 'message',
      from: match[1],
      arrowType: match[2],
      activate: match[3] || '',
      to: match[4],
      label: match[5].trim()
    };
  }
  return { kind: 'unknown' };
}

function framesBefore(lines, index, diagramPath) {
  const stack = [{ kind: 'diagram', path: diagramPath || null }];
  const stop = Math.min(index, lines.length);
  for (let i = 0; i < stop; i += 1) {
    const info = classifySequenceLine(lines[i].text);
    if (info.kind === 'fragment') {
      if (info.fragmentKind === 'else' && stack[stack.length - 1].kind === 'else') stack.pop();
      const path = lines[i].nodePath || stack[stack.length - 1].path;
      stack.push({ kind: info.fragmentKind, path });
    } else if (info.kind === 'end' && stack.length > 1) {
      const popped = stack.pop();
      if (popped.kind === 'else' && stack.length > 1 && stack[stack.length - 1].kind !== 'diagram') {
        stack.pop();
      }
    }
  }
  return stack;
}

function parentFor(lines, index, diagramPath, fragmentKind) {
  const stack = framesBefore(lines, index, diagramPath);
  if (fragmentKind === 'else' && stack[stack.length - 1].kind === 'else') stack.pop();
  return stack[stack.length - 1].path;
}

function createParticipant(api, parentPath, spec) {
  return api.createChild(parentPath, 'Participant', {
    name: spec.name,
    alias: spec.alias || spec.name,
    kind: spec.participantKind || 'participant'
  });
}

function setParticipantText(api, nodePath, spec) {
  if (spec.name !== undefined) api.setAttribute(nodePath, 'name', spec.name);
  if (spec.alias !== undefined) api.setAttribute(nodePath, 'alias', spec.alias);
  if (spec.participantKind !== undefined) api.setAttribute(nodePath, 'kind', spec.participantKind);
}

function createMessage(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Message', {
    name: spec.name,
    label: spec.label || '',
    arrowType: spec.arrowType || '',
    activate: spec.activate || ''
  });
  if (spec.fromPath) api.setPointer(nodePath, 'from', spec.fromPath);
  if (spec.toPath) api.setPointer(nodePath, 'to', spec.toPath);
  return nodePath;
}

function setMessageEnds(api, nodePath, fromPath, toPath) {
  if (fromPath) api.setPointer(nodePath, 'from', fromPath);
  if (toPath) api.setPointer(nodePath, 'to', toPath);
}

function setMessageText(api, nodePath, before, after) {
  writeChanged(api, nodePath, before, after, ['label', 'arrowType', 'activate']);
}

function createFragment(api, parentPath, spec) {
  return api.createChild(parentPath, 'Fragment', {
    name: spec.name,
    kind: spec.fragmentKind,
    label: spec.label || ''
  });
}

function setFragmentText(api, nodePath, before, after) {
  const next = { kind: after.fragmentKind, label: after.label || '' };
  const prev = before ? { kind: before.fragmentKind, label: before.label || '' } : null;
  writeChanged(api, nodePath, prev, next, ['kind', 'label']);
}

function createNote(api, parentPath, spec) {
  const nodePath = api.createChild(parentPath, 'Note', {
    name: spec.name,
    text: spec.text || '',
    placement: spec.placement || 'over'
  });
  if (spec.startPath) api.setPointer(nodePath, 'overStart', spec.startPath);
  if (spec.endPath) api.setPointer(nodePath, 'overEnd', spec.endPath);
  return nodePath;
}

function setNoteText(api, nodePath, before, after) {
  writeChanged(api, nodePath, before, after, ['text', 'placement']);
}

function setSequenceTitle(api, diagramPath, title) {
  if (diagramPath) api.setAttribute(diagramPath, 'title', title);
}

function setAutonumber(api, diagramPath, value) {
  if (diagramPath) api.setAttribute(diagramPath, 'autonumber', value);
}

function deleteSequenceElement(api, nodePath) {
  api.deleteNode(nodePath);
}

function placeSequenceElement(api, nodePath, index) {
  api.setAttribute(nodePath, 'order', index);
}

function ensureParticipant(ctx, name) {
  if (!name) return null;
  if (ctx.names.has(name)) return ctx.names.get(name);
  const nodePath = createParticipant(ctx.api, ctx.diagramNodePath, {
    name,
    alias: name,
    participantKind: 'participant'
  });
  remember(ctx.names, name, nodePath);
  return nodePath;
}

function seed(ctx) {
  ctx.working.forEach((line) => {
    const info = classifySequenceLine(line.text);
    if (info.kind === 'participant' && line.nodePath) remember(ctx.names, info.name, line.nodePath);
  });
}

function onAdd(ctx, op) {
  const info = classifySequenceLine(op.text);
  const at = typeof op.index === 'number' ? op.index : ctx.working.length;
  switch (info.kind) {
    case 'title':
      setSequenceTitle(ctx.api, ctx.diagramNodePath, info.title);
      return null;
    case 'autonumber':
      setAutonumber(ctx.api, ctx.diagramNodePath, info.value);
      return null;
    case 'participant':
      return addParticipant(ctx, op, info);
    case 'message':
      return addMessage(ctx, op, info, parentFor(ctx.working, at, ctx.diagramNodePath));
    case 'fragment':
      return addFragment(ctx, op, info, parentFor(ctx.working, at, ctx.diagramNodePath, info.fragmentKind));
    case 'note':
      return addNote(ctx, op, info, parentFor(ctx.working, at, ctx.diagramNodePath));
    default:
      return null;
  }
}

function addParticipant(ctx, op, info) {
  if (ctx.names.has(info.name)) {
    const nodePath = ctx.names.get(info.name);
    setParticipantText(ctx.api, nodePath, info);
    return bind(ctx, op.lineId, nodePath);
  }
  const nodePath = createParticipant(ctx.api, ctx.diagramNodePath, info);
  remember(ctx.names, info.name, nodePath);
  return bind(ctx, op.lineId, nodePath);
}

function addMessage(ctx, op, info, parentPath) {
  const nodePath = createMessage(ctx.api, parentPath, {
    name: op.lineId,
    label: info.label,
    arrowType: info.arrowType,
    activate: info.activate,
    fromPath: ensureParticipant(ctx, info.from),
    toPath: ensureParticipant(ctx, info.to)
  });
  return bind(ctx, op.lineId, nodePath);
}

function addFragment(ctx, op, info, parentPath) {
  const nodePath = createFragment(ctx.api, parentPath, {
    name: op.lineId,
    fragmentKind: info.fragmentKind,
    label: info.label
  });
  return bind(ctx, op.lineId, nodePath);
}

function addNote(ctx, op, info, parentPath) {
  const nodePath = createNote(ctx.api, parentPath, {
    name: op.lineId,
    text: info.text,
    placement: info.placement,
    startPath: ensureParticipant(ctx, info.start),
    endPath: ensureParticipant(ctx, info.end)
  });
  return bind(ctx, op.lineId, nodePath);
}

function liveNames(line, live) {
  const info = classifySequenceLine(line.text);
  if (info.kind === 'participant' && info.name) live.add(info.name);
  if (info.kind === 'message') {
    if (info.from) live.add(info.from);
    if (info.to) live.add(info.to);
  }
  if (info.kind === 'note') {
    if (info.start) live.add(info.start);
    if (info.end) live.add(info.end);
  }
}

function onRemove(ctx, beforeLine) {
  if (!beforeLine || !beforeLine.nodePath) return;
  const info = classifySequenceLine(beforeLine.text);
  if (!ELEMENT.has(info.kind)) return;
  dropUnindexed(ctx.api, ctx.names, beforeLine.nodePath);
}

function onUpdate(ctx, beforeLine, op) {
  const before = classifySequenceLine(beforeLine ? beforeLine.text : '');
  const after = classifySequenceLine(op.text);
  const nodePath = (beforeLine && beforeLine.nodePath) || null;
  if (before.kind !== after.kind) {
    dropUnindexed(ctx.api, ctx.names, nodePath);
    return onAdd(ctx, op);
  }
  if (ELEMENT.has(after.kind) && !nodePath) return onAdd(ctx, op);
  switch (after.kind) {
    case 'title':
      if (before.title !== after.title) setSequenceTitle(ctx.api, ctx.diagramNodePath, after.title);
      return null;
    case 'autonumber':
      if (before.value !== after.value) setAutonumber(ctx.api, ctx.diagramNodePath, after.value);
      return null;
    case 'participant':
      if (before.name !== after.name) {
        ctx.api.setAttribute(nodePath, 'name', after.name);
        forget(ctx.names, before.name);
        remember(ctx.names, after.name, nodePath);
      }
      if (before.alias !== after.alias) ctx.api.setAttribute(nodePath, 'alias', after.alias);
      if (before.participantKind !== after.participantKind) {
        ctx.api.setAttribute(nodePath, 'kind', after.participantKind);
      }
      return nodePath;
    case 'message':
      if (before.from !== after.from || before.to !== after.to) {
        setMessageEnds(
          ctx.api,
          nodePath,
          before.from !== after.from ? ensureParticipant(ctx, after.from) : null,
          before.to !== after.to ? ensureParticipant(ctx, after.to) : null
        );
      }
      setMessageText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'fragment':
      setFragmentText(ctx.api, nodePath, before, after);
      return nodePath;
    case 'note':
      if (before.start !== after.start || before.end !== after.end) {
        if (before.start !== after.start) {
          ctx.api.setPointer(nodePath, 'overStart', ensureParticipant(ctx, after.start));
        }
        if (before.end !== after.end) {
          ctx.api.setPointer(nodePath, 'overEnd', ensureParticipant(ctx, after.end));
        }
      }
      setNoteText(ctx.api, nodePath, before, after);
      return nodePath;
    default:
      return null;
  }
}

function onMove(ctx, beforeLine, op) {
  if (beforeLine && beforeLine.nodePath) placeSequenceElement(ctx.api, beforeLine.nodePath, op.index);
}

function walkSequenceUpdate(baseline, lineOperations, api) {
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
  classifySequenceLine,
  walkSequenceUpdate,
  createParticipant,
  createMessage,
  createFragment,
  createNote,
  setParticipantText,
  setMessageText,
  setMessageEnds,
  setFragmentText,
  setNoteText,
  setSequenceTitle,
  setAutonumber,
  deleteSequenceElement,
  placeSequenceElement
};
