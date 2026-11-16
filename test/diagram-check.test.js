'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { checkDiagram } = require('../studio/src/control/diagramCheck.cjs');

function lines(source) {
  return source.split('\n');
}

test('Mermaid parse accepts a flowchart whose nodes are only named on the edge', async () => {
  const verdict = await checkDiagram('flowchart', lines('flowchart TD\n  A --> B'));
  assert.equal(verdict.ok, true);
});

test('Mermaid parse rejects a broken flowchart before Apply writes it', async () => {
  const verdict = await checkDiagram('flowchart', lines('flowchart TD\n  A -->'));
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /Correct the text and apply to the model again/);
  assert.match(verdict.message, /Parse error on line 3/);
  assert.match(verdict.message, /Expecting/);
});

test('a valid diagram of another type is rejected before its syntax matters', async () => {
  const sequence = await checkDiagram('flowchart', lines('sequenceDiagram\n  A->>B: hello'));
  assert.equal(sequence.ok, false);
  assert.equal(sequence.code, 'type-change');
  assert.match(sequence.message, /Changing the diagram type is not allowed/);
  assert.match(sequence.message, /stays flowchart/);
  assert.match(sequence.message, /sequence diagram/);

  const ears = await checkDiagram('flowchart', lines('REQ-1 [event]\nWhen it rains, the system shall stop.'));
  assert.equal(ears.code, 'type-change');
  assert.match(ears.message, /EARS diagram/);

  const fromEars = await checkDiagram('ears', lines('flowchart TD\n  A --> B'));
  assert.equal(fromEars.code, 'type-change');
  assert.match(fromEars.message, /stays EARS/);

  const usecase = await checkDiagram('usecase', lines('sequenceDiagram\n  A->>B: hello'));
  assert.equal(usecase.code, 'type-change');

  const sameFamily = await checkDiagram('flowchart', lines('graph TD\n  A --> B'));
  assert.equal(sameFamily.ok, true);
  const sameC4 = await checkDiagram('c4', lines('C4Container\n  Person(driver, "Driver", "Ops")'));
  assert.equal(sameC4.ok, true);
});

test('Mermaid parse accepts the other diagram kinds it knows', async () => {
  const samples = {
    sequence: 'sequenceDiagram\n  BrakeCtrl->>FusionApp: hold',
    state: 'stateDiagram-v2\n  [*] --> Off\n  Off --> ACC',
    class: 'classDiagram\n  class Animal\n  Animal --> Dog : pet',
    er: 'erDiagram\n  Order ||--o{ Line : has',
    requirement: 'requirementDiagram\n  requirement Safety {\n    risk: high\n  }',
    c4: 'C4Context\n  Person(driver, "Driver", "Ops")\n  Rel(driver, lead, "Uses")',
    architecture: 'architecture-beta\n  group vehicle(cloud)[Ego]',
    gantt: 'gantt\n  title Plan\n  section Meta\n  Survey :done, a1, 2026-11-01, 3d',
    block: 'block-beta\n  columns 1\n  Catalog',
    kanban: 'kanban\n  Todo\n    [Write the card]'
  };
  for (const [type, source] of Object.entries(samples)) {
    const verdict = await checkDiagram(type, lines(source));
    assert.equal(verdict.ok, true, type + ' ' + (verdict.message || ''));
  }
});

test('use case is outside the Mermaid parse', async () => {
  assert.equal((await checkDiagram('usecase', lines('usecase\n  actor Modeler'))).ok, true);
});

test('EarsAst accepts the sample and names the line that breaks a pattern', async () => {
  const sample = fs.readFileSync(path.join(__dirname, '../diagrams/ears/examples/sample.ears'), 'utf8');
  assert.equal((await checkDiagram('ears', sample)).ok, true);

  const event = await checkDiagram('ears', lines('REQ-1 [event] risk=low verifymethod=test\nThe system shall stop.'));
  assert.equal(event.ok, false);
  assert.match(event.message, /Line 2: REQ-1 needs a sentence of the form "When …, the … shall …"/);

  const orphan = await checkDiagram('ears', lines('# Title\nWhen it rains, the system shall stop.'));
  assert.match(orphan.message, /Line 2: this line is not a requirement header/);

  const pattern = await checkDiagram('ears', lines('REQ-1 [maybe]\nThe system shall stop.'));
  assert.match(pattern.message, /Line 1: unknown pattern "maybe"/);

  const bracket = await checkDiagram('ears', lines('REQ-1 [event\nWhen it rains, the system shall stop.'));
  assert.match(bracket.message, /Line 1: the pattern bracket is not closed/);
});
