#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { detectType, parse } = require('../packages/shared/cjs/MermaidAst');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'diagram-catalog.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'diagrams/index.json'), 'utf8'));

let failures = 0;

function fail(msg) {
  console.error('FAIL:', msg);
  failures += 1;
}

if (catalog.diagrams.length !== index.count) {
  fail(`catalog ${catalog.diagrams.length} != index ${index.count}`);
}

for (const d of catalog.diagrams) {
  const dir = path.join(ROOT, 'diagrams', d.id);
  for (const rel of [
    'package.json',
    'webgme-setup.json',
    'metamodel/Language.json',
    'metamodel/descriptor.json',
    'examples/sample.mmd',
    'src/plugins/ImportMermaid/ImportMermaid.js',
    'src/plugins/ExportMermaid/ExportMermaid.js',
    'src/plugins/ApplyLanguageMeta/ApplyLanguageMeta.js'
  ]) {
    if (!fs.existsSync(path.join(dir, rel))) fail(`${d.id} missing ${rel}`);
  }

  const sample = fs.readFileSync(path.join(dir, 'examples/sample.mmd'), 'utf8');
  const detected = detectType(sample);
  // experimental samples may intentionally not detect in our lightweight map
  if (d.status !== 'experimental' && !detected) {
    fail(`${d.id} sample not detectable`);
  }
  try {
    parse(sample, detected || undefined);
  } catch (e) {
    if (d.status !== 'experimental') fail(`${d.id} parse: ${e.message}`);
  }

  const language = JSON.parse(fs.readFileSync(path.join(dir, 'metamodel/Language.json'), 'utf8'));
  if (!language.children || !language.children.length) fail(`${d.id} Language.json has no concepts`);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(`OK: ${catalog.diagrams.length} diagram projects validated`);
