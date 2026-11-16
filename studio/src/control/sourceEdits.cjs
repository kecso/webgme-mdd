/**
 * Fold Monaco content changes into diagram-level line operations.
 *
 * The session is the editor baseline: the text when the editor opened, and
 * the WebGME node each of those lines already referred to. Replaying the
 * editor's own changes keeps that node on every line the edit did not destroy.
 *
 * Limitation: a move is one Monaco event that removes a whole line and inserts
 * that same text, and exactly one discarded line has that text. The same words
 * typed in a later event are a removal and an addition, so the new line has no
 * WebGME node. Two removed lines with the same text are not a move either,
 * because the event does not say which node returned.
 */

function sourceToLines(source, nodePaths) {
  const text = String(source ?? '');
  const parts = text.split(/\r\n|\n|\r/);
  const paths = nodePaths || [];
  return parts.map((line, index) => ({
    id: `ln${index + 1}`,
    text: line,
    nodePath: paths[index] || null
  }));
}

function createSession(source, options) {
  const opts = options || {};
  const lines = sourceToLines(source, opts.nodePaths);
  return {
    diagramNodePath: opts.diagramNodePath || null,
    lines,
    names: Object.assign({}, opts.names || {}),
    edits: [],
    nextId: lines.length + 1
  };
}

function copyChange(change) {
  const range = change && change.range;
  if (!range) return null;
  return {
    range: {
      startLineNumber: range.startLineNumber,
      startColumn: range.startColumn,
      endLineNumber: range.endLineNumber,
      endColumn: range.endColumn
    },
    text: String(change.text ?? '')
  };
}

function noteContentChanges(session, event) {
  if (!session || !event || event.isFlush) return session;
  const changes = (Array.isArray(event.changes) ? event.changes : [])
    .map(copyChange)
    .filter(Boolean);
  if (changes.length) session.edits.push({ changes });
  return session;
}

function applyRange(lines, change, session, discarded, movedIds) {
  const startLine = change.range.startLineNumber - 1;
  const endLine = change.range.endLineNumber - 1;
  const startCol = change.range.startColumn - 1;
  const endCol = change.range.endColumn - 1;
  const first = lines[startLine];
  const last = lines[endLine];
  if (!first || !last || startLine < 0 || endLine < startLine) return lines;

  const prefix = first.text.slice(0, startCol);
  const suffix = last.text.slice(endCol);
  const parts = change.text.split(/\r\n|\n|\r/);
  const covered = lines.slice(startLine, endLine + 1);
  const singleLine = startLine === endLine;

  const built = parts.map((part, index) => {
    let text = part;
    if (index === 0) text = prefix + text;
    if (index === parts.length - 1) text = text + suffix;
    return { text };
  });
  const keeper = keeperId(built.length, singleLine, prefix, suffix, first, last);
  built.forEach((line, index) => {
    if (keeper.at === index) {
      line.id = keeper.id;
      line.nodePath = keeper.nodePath;
      return;
    }
    const reused = takeDiscarded(discarded, line.text);
    if (reused) {
      movedIds.add(reused.id);
      line.id = reused.id;
      line.nodePath = reused.nodePath;
      return;
    }
    line.id = `ln${session.nextId++}`;
    line.nodePath = null;
  });

  const kept = new Set(built.map((line) => line.id));
  covered.forEach((line) => {
    if (kept.has(line.id)) return;
    const merged = (!singleLine && line.id === last.id && suffix.length > 0 && prefix.length > 0);
    if (!merged) discarded.push({ id: line.id, text: line.text, nodePath: line.nodePath || null });
  });

  return lines.slice(0, startLine).concat(built, lines.slice(endLine + 1));
}

function keeperId(pieceCount, singleLine, prefix, suffix, first, last) {
  if (singleLine) {
    const at = pieceCount === 1 || prefix.length > 0 || suffix.length === 0 ? 0 : pieceCount - 1;
    return { at, id: first.id, nodePath: first.nodePath || null };
  }
  if (prefix.length > 0) return { at: 0, id: first.id, nodePath: first.nodePath || null };
  if (suffix.length > 0) return { at: pieceCount - 1, id: last.id, nodePath: last.nodePath || null };
  return { at: -1, id: null, nodePath: null };
}

function takeDiscarded(discarded, text) {
  const matches = [];
  discarded.forEach((line, index) => {
    if (line.text === text) matches.push(index);
  });
  if (matches.length !== 1) return null;
  const [line] = discarded.splice(matches[0], 1);
  return line;
}

function diagramOperations(before, after, movedIds) {
  const beforeById = new Map(before.map((line) => [line.id, line]));
  const afterIds = new Set(after.map((line) => line.id));
  const operations = [];

  before.forEach((line) => {
    if (!afterIds.has(line.id)) {
      operations.push({
        op: 'removeLine',
        lineId: line.id,
        nodePath: line.nodePath || null,
        text: line.text
      });
    }
  });

  after.forEach((line, index) => {
    const previous = beforeById.get(line.id);
    if (!previous) {
      operations.push({
        op: 'addLine',
        lineId: line.id,
        nodePath: null,
        text: line.text,
        index
      });
      return;
    }
    if (movedIds.has(line.id)) {
      operations.push({
        op: 'moveLine',
        lineId: line.id,
        nodePath: previous.nodePath || null,
        text: line.text,
        index
      });
    }
    if (previous.text !== line.text) {
      operations.push({
        op: 'updateText',
        lineId: line.id,
        nodePath: previous.nodePath || null,
        text: line.text,
        index
      });
    }
  });

  return operations;
}

function foldEdits(session) {
  const before = session.lines.map((line) => ({
    id: line.id,
    text: line.text,
    nodePath: line.nodePath || null
  }));
  const movedIds = new Set();
  let lines = before.map((line) => ({
    id: line.id,
    text: line.text,
    nodePath: line.nodePath
  }));
  session.edits.forEach((event) => {
    const discarded = [];
    event.changes.forEach((change) => {
      lines = applyRange(lines, change, session, discarded, movedIds);
    });
  });
  if (!lines.length) {
    lines = [{ id: `ln${session.nextId++}`, text: '', nodePath: null }];
  }
  return {
    diagramNodePath: session.diagramNodePath || null,
    operations: diagramOperations(before, lines, movedIds),
    lines
  };
}

function formatDiagramOperation(operation) {
  const ref = operation.nodePath ? ` ${operation.nodePath}` : '';
  if (operation.op === 'removeLine') return `removeLine ${operation.lineId}${ref}`;
  if (operation.op === 'addLine') return `addLine ${operation.lineId} @${operation.index}`;
  if (operation.op === 'moveLine') return `moveLine ${operation.lineId}${ref} @${operation.index}`;
  return `updateText ${operation.lineId}${ref} @${operation.index}`;
}

module.exports = {
  sourceToLines,
  createSession,
  noteContentChanges,
  foldEdits,
  formatDiagramOperation
};
