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
const nameById = {};
(meta.children || []).forEach((c) => {
  const name = (c.attributes && c.attributes.name) || c.id;
  if (c.guid) nameById[c.guid] = name;
  if (c.id) nameById[c.id] = name;
});
const concepts = (meta.children || [])
  .filter((c) => {
    const name = (c.attributes && c.attributes.name) || '';
    return name && name !== 'FCO' && name !== 'ROOT';
  })
  .map((c) => ({
    name: c.attributes.name,
    attrs: Object.keys(c.attribute_meta || {}),
    pointers: Object.keys(c.pointer_meta || {}),
    contains: Object.keys(c.children_meta || {})
      .filter((k) => k !== 'min' && k !== 'max')
      .map((k) => nameById[k] || k),
    validPlugins: (c.registry && c.registry.validPlugins) || ''
  }));

console.log(JSON.stringify({ diagram: id, language: meta.attributes.name, concepts }, null, 2));
