#!/usr/bin/env node
'use strict';

/**
 * Generate a webgme-lean-style Domain.lean from metamodel/Language.json
 * (and optionally metamodel/descriptor.json).
 *
 * Fashion matches kecso/webgme-lean examples/statechart/*.lean:
 *   - _NodeId, _Contained, _Type inductive
 *   - structure per meta concept (extends FCO when sensible)
 *   - pointer fields as typed references
 *   - containment as sum type + List
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function metaName(id) {
  return String(id || '').replace(/^@meta:/, '');
}

function sanitize(name) {
  return String(name).replace(/[^A-Za-z0-9_]/g, '_');
}

function loadLanguage(diagramId) {
  const langPath = path.join(ROOT, 'diagrams', diagramId, 'metamodel', 'Language.json');
  return JSON.parse(fs.readFileSync(langPath, 'utf8'));
}

function conceptsFromLanguage(language) {
  return (language.children || []).map((c) => {
    const name = metaName(c.id) || c.attributes.name;
    const attrs = Object.keys(c.attribute_meta || {}).filter((a) => a !== 'name');
    const pointers = Object.keys(c.pointer_meta || {});
    const contains = Object.keys(c.children_meta || {}).filter((k) => k !== 'min' && k !== 'max').map(metaName);
    return { name: sanitize(name), attrs, pointers, contains };
  });
}

function generateLean(diagramId, concepts) {
  const ns = sanitize(diagramId.charAt(0).toUpperCase() + diagramId.slice(1)) + 'Domain';
  const typeCtors = ['_FCO'].concat(concepts.map((c) => 'c' + c.name));
  const lines = [];
  lines.push(`-- Auto-generated from diagrams/${diagramId}/metamodel/Language.json`);
  lines.push(`-- Fashion: kecso/webgme-lean (META → Lean structures). Regenerate: npm run generate:lean -- ${diagramId}`);
  lines.push(`-- DO NOT hand-edit permanent semantics here without updating Language.json.`);
  lines.push('');
  lines.push(`namespace ${ns}`);
  lines.push('');
  lines.push('structure _NodeId where');
  lines.push('  path : String');
  lines.push('  deriving DecidableEq, Repr');
  lines.push('');
  lines.push('class _Contained (parent child : Type) where');
  lines.push('  children : parent → List child');
  lines.push('');
  lines.push('inductive _Type where');
  for (const t of typeCtors) {
    lines.push(`  | ${t}`);
  }
  lines.push('  deriving DecidableEq, BEq, Repr');
  lines.push('');
  lines.push('structure FCO where');
  lines.push('  _id : _NodeId');
  lines.push('  _type : _Type');
  lines.push('  name : String');
  lines.push('  deriving Repr');
  lines.push('');

  // First pass: structures without pointer fields typed to not-yet-defined types —
  // use FCO for pointer targets to keep generation simple & checkable, matching
  // a conservative webgme-lean subset (Turnstile uses State for src/dst because
  // State is already defined). We emit pointers as _NodeId for forward refs,
  // plus a comment listing intended target META names from Language.json.
  for (const c of concepts) {
    lines.push(`-- META concept ${c.name}`);
    if (c.pointers.length) {
      lines.push(`-- pointers: ${c.pointers.join(', ')} (stored as _NodeId; bind via Integrating/correspondences)`);
    }
    lines.push(`structure ${c.name} extends FCO where`);
    for (const a of c.attrs) {
      lines.push(`  ${sanitize(a)} : String := ""`);
    }
    for (const p of c.pointers) {
      lines.push(`  ${sanitize(p)} : _NodeId := ⟨""⟩`);
    }
    if (c.contains.length) {
      lines.push(`  -- containment allows: ${c.contains.join(', ')}`);
      lines.push(`  _childIds : List _NodeId := []`);
    }
    lines.push('  deriving Repr');
    lines.push('');
    lines.push(`instance : Coe ${c.name} FCO where`);
    lines.push(`  coe := ${c.name}.toFCO`);
    lines.push('');
  }

  lines.push(`/-- Well-formedness scaffold: every node name non-empty (domain-local). -/`);
  lines.push(`def AllNamesNonEmpty (nodes : List FCO) : Bool :=`);
  lines.push(`  nodes.all fun n => n.name ≠ ""`);
  lines.push('');
  lines.push('end ' + ns);
  lines.push('');
  return lines.join('\n');
}

function writeForDiagram(diagramId) {
  const language = loadLanguage(diagramId);
  const concepts = conceptsFromLanguage(language);
  if (!concepts.length) {
    throw new Error('No concepts in ' + diagramId);
  }
  const outDir = path.join(ROOT, 'diagrams', diagramId, 'lean');
  fs.mkdirSync(outDir, { recursive: true });
  const lean = generateLean(diagramId, concepts);
  const outFile = path.join(outDir, 'Domain.lean');
  fs.writeFileSync(outFile, lean);
  // Point descriptor at lean artifact
  const descPath = path.join(ROOT, 'diagrams', diagramId, 'metamodel', 'descriptor.json');
  if (fs.existsSync(descPath)) {
    const desc = JSON.parse(fs.readFileSync(descPath, 'utf8'));
    desc.leanDomain = '../lean/Domain.lean';
    desc.leanNamespace = sanitize(diagramId.charAt(0).toUpperCase() + diagramId.slice(1)) + 'Domain';
    fs.writeFileSync(descPath, JSON.stringify(desc, null, 2) + '\n');
  }
  console.log('Wrote', outFile, '(' + concepts.length + ' concepts)');
}

function main() {
  const args = process.argv.slice(2);
  const ids =
    args.length > 0
      ? args
      : [
          'state',
          'sequence',
          'requirement',
          'architecture',
          'c4',
          'flowchart',
          'er',
          'class',
          'packet',
          'ishikawa',
          'usecase',
          'journey',
          'eventmodeling'
        ];
  for (const id of ids) {
    writeForDiagram(id);
  }
}

main();
