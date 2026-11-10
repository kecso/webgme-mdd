#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { detectType, parse } = require('../packages/shared/cjs/MermaidAst');
const EarsAst = require('../packages/shared/cjs/EarsAst');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'diagram-catalog.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'diagrams/index.json'), 'utf8'));

let failures = 0;

function fail(msg) {
  console.error('FAIL:', msg);
  failures += 1;
}

const companions = catalog.companionLanguages || [];
const expectedCount = catalog.diagrams.length + companions.length;

if (index.count !== expectedCount && index.diagramCount !== catalog.diagrams.length) {
  // Prefer new shape: diagramCount + companionCount; fall back to legacy count === diagrams only
  if (index.count !== catalog.diagrams.length && index.count !== expectedCount) {
    fail(`index count ${index.count} does not match catalog diagrams ${catalog.diagrams.length} (+${companions.length} companions)`);
  }
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

for (const c of companions) {
  const dir = path.join(ROOT, c.packagePath || path.join('diagrams', c.id));
  const importId = c.importPluginId || 'ImportEARS';
  const exportId = c.exportPluginId || 'ExportEARS';
  for (const rel of [
    'package.json',
    'webgme-setup.json',
    'metamodel/Language.json',
    'metamodel/descriptor.json',
    'src/plugins/ApplyLanguageMeta/ApplyLanguageMeta.js',
    `src/plugins/${importId}/${importId}.js`,
    `src/plugins/${exportId}/${exportId}.js`
  ]) {
    if (!fs.existsSync(path.join(dir, rel))) fail(`${c.id} missing ${rel}`);
  }

  const samplePath = path.join(ROOT, c.sampleFile || path.join(dir, 'examples/sample.ears'));
  if (!fs.existsSync(samplePath)) {
    fail(`${c.id} missing sample at ${c.sampleFile || 'examples/sample.ears'}`);
  } else if (c.id === 'ears') {
    const src = fs.readFileSync(samplePath, 'utf8');
    const ast = EarsAst.parse(src);
    if (!ast.requirements || !ast.requirements.length) {
      fail('ears sample parsed zero requirements');
    }
    ast.requirements.forEach(function (r) {
      if (!EarsAst.wellFormed(r)) fail(`ears ${r.reqId} not well-formed`);
    });
  }

  const language = JSON.parse(fs.readFileSync(path.join(dir, 'metamodel/Language.json'), 'utf8'));
  if (!language.children || !language.children.length) fail(`${c.id} Language.json has no concepts`);

  if (c.leanDomain) {
    const leanPath = path.join(ROOT, c.leanDomain);
    if (!fs.existsSync(leanPath)) fail(`${c.id} missing lean ${c.leanDomain}`);
  }
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `OK: ${catalog.diagrams.length} diagram projects + ${companions.length} companion language(s) validated`
);
