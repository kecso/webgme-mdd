#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/print-meta-summary.js <diagram-id>');
  process.exit(1);
}

const file = path.join(__dirname, '..', 'diagrams', id, 'metamodel', 'Language.json');
const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
const concepts = (meta.children || []).map((c) => ({
  id: c.id,
  attrs: Object.keys(c.attribute_meta || {}),
  pointers: Object.keys(c.pointer_meta || {}),
  contains: Object.keys(c.children_meta || {}).filter((k) => k !== 'min' && k !== 'max')
}));

console.log(JSON.stringify({ diagram: id, language: meta.attributes.name, concepts }, null, 2));
