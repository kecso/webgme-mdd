'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createSession,
  noteContentChanges,
  foldEdits,
  formatDiagramOperation
} = require('../studio/src/control/sourceEdits.cjs');

function change(startLine, startColumn, endLine, endColumn, text) {
  return {
    isFlush: false,
    changes: [{
      range: { startLineNumber: startLine, startColumn, endLineNumber: endLine, endColumn },
      text
    }]
  };
}

function opsOf(source, events) {
  const session = createSession(source);
  events.forEach((event) => noteContentChanges(session, event));
  return foldEdits(session);
}

test('keystrokes on one line become one text update of that line', () => {
  const folded = opsOf('alpha\nbeta', [
    change(1, 1, 1, 1, 'X'),
    change(1, 2, 1, 2, 'Y')
  ]);
  assert.equal(folded.lines[0].id, 'ln1');
  assert.equal(folded.lines[0].text, 'XYalpha');
  assert.equal(folded.lines[1].id, 'ln2');
  assert.deepEqual(folded.operations, [
    { op: 'updateText', lineId: 'ln1', nodePath: null, text: 'XYalpha', index: 0 }
  ]);
});

test('enter inserts a line and leaves the surrounding lines in place', () => {
  const folded = opsOf('alpha\nbeta', [
    change(1, 6, 1, 6, '\n')
  ]);
  assert.deepEqual(folded.lines.map((line) => line.text), ['alpha', '', 'beta']);
  assert.equal(folded.lines[0].id, 'ln1');
  assert.equal(folded.lines[2].id, 'ln2');
  assert.equal(folded.operations.length, 1);
  assert.equal(folded.operations[0].op, 'addLine');
  assert.equal(folded.operations[0].index, 1);
  assert.notEqual(folded.operations[0].lineId, 'ln1');
  assert.notEqual(folded.operations[0].lineId, 'ln2');
});

test('deleting a whole line removes that line id', () => {
  const folded = opsOf('alpha\nbeta\ngamma', [
    change(2, 1, 3, 1, '')
  ]);
  assert.deepEqual(folded.lines.map((line) => [line.id, line.text]), [
    ['ln1', 'alpha'],
    ['ln3', 'gamma']
  ]);
  assert.deepEqual(folded.operations, [
    { op: 'removeLine', lineId: 'ln2', nodePath: null, text: 'beta' }
  ]);
});

test('deleting a line and later typing it again is a removal and an addition', () => {
  const folded = opsOf('alpha\nbeta\ngamma', [
    change(2, 1, 3, 1, ''),
    change(1, 1, 1, 1, 'beta\n')
  ]);
  assert.equal(folded.lines[0].text, 'beta');
  assert.notEqual(folded.lines[0].id, 'ln2');
  assert.equal(folded.lines[1].id, 'ln1');
  assert.deepEqual(folded.operations.map((operation) => operation.op), ['removeLine', 'addLine']);
  assert.equal(folded.operations[0].lineId, 'ln2');
  assert.equal(folded.operations[1].text, 'beta');
  assert.equal(folded.operations[1].nodePath, null);
});

test('one editor gesture that relocates a line keeps its WebGME node', () => {
  const session = createSession('alpha\nbeta\ngamma', {
    diagramNodePath: '/a/d',
    nodePaths: ['/a/d/1', '/a/d/2', '/a/d/3']
  });
  noteContentChanges(session, {
    isFlush: false,
    changes: [
      { range: { startLineNumber: 2, startColumn: 1, endLineNumber: 3, endColumn: 1 }, text: '' },
      { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'beta\n' }
    ]
  });
  const folded = foldEdits(session);
  assert.equal(folded.diagramNodePath, '/a/d');
  assert.deepEqual(folded.lines.map((line) => [line.id, line.nodePath, line.text]), [
    ['ln2', '/a/d/2', 'beta'],
    ['ln1', '/a/d/1', 'alpha'],
    ['ln3', '/a/d/3', 'gamma']
  ]);
  assert.deepEqual(folded.operations, [
    { op: 'moveLine', lineId: 'ln2', nodePath: '/a/d/2', text: 'beta', index: 0 }
  ]);
});

test('a line typed and then deleted leaves no operation', () => {
  const folded = opsOf('alpha', [
    change(1, 6, 1, 6, '\nnew'),
    change(1, 6, 2, 4, '')
  ]);
  assert.deepEqual(folded.lines.map((line) => [line.id, line.text]), [['ln1', 'alpha']]);
  assert.deepEqual(folded.operations, []);
});

test('replacing two whole lines keeps neither old id', () => {
  const folded = opsOf('alpha\nbeta', [
    change(1, 1, 2, 5, 'gamma')
  ]);
  assert.deepEqual(folded.lines.map((line) => line.text), ['gamma']);
  assert.equal(folded.lines[0].id === 'ln1' || folded.lines[0].id === 'ln2', false);
  assert.equal(folded.operations.some((op) => op.op === 'addLine' && op.text === 'gamma'), true);
});

test('two identical removed lines are not one move', () => {
  const folded = opsOf('alpha\nalpha', [
    change(1, 1, 2, 6, 'alpha')
  ]);
  assert.equal(folded.operations.some((op) => op.op === 'moveLine'), false);
});

test('diagram operations format with their node path', () => {
  assert.equal(formatDiagramOperation({ op: 'removeLine', lineId: 'ln1', nodePath: '/a/1' }), 'removeLine ln1 /a/1');
  assert.equal(formatDiagramOperation({ op: 'addLine', lineId: 'ln2', index: 3 }), 'addLine ln2 @3');
  assert.equal(formatDiagramOperation({ op: 'moveLine', lineId: 'ln3', nodePath: '/a/3', index: 0 }), 'moveLine ln3 /a/3 @0');
  assert.equal(formatDiagramOperation({ op: 'updateText', lineId: 'ln4', index: 1 }), 'updateText ln4 @1');
  assert.equal(noteContentChanges(null, null), null);
});

test('a flushed model reset is not an edit', () => {
  const session = createSession('alpha');
  noteContentChanges(session, {
    isFlush: true,
    changes: [{
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6 },
      text: 'replaced'
    }]
  });
  const folded = foldEdits(session);
  assert.deepEqual(folded.operations, []);
  assert.equal(folded.lines[0].text, 'alpha');
});
