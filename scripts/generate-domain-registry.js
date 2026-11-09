#!/usr/bin/env node
'use strict';

/**
 * Regenerates router/src/common/DomainRegistry.json from diagram-catalog.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'diagram-catalog.json'), 'utf8')
);

function libName(id) {
  return (
    'Mermaid_' +
    id
      .split('-')
      .map(function (p) {
        return p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join('')
  );
}

const registry = {
  generatedFrom: 'scripts/diagram-catalog.json',
  notes: [
    'projectId / seedName / libraryRootHash are placeholders until real WebGME domain seeds exist.',
    'importPluginId is the diagram-package plugin id; router invokes it after ensuring the library.'
  ],
  domains: catalog.diagrams.map(function (d) {
    return {
      id: d.id,
      name: d.name,
      keywords: d.keywords,
      libraryName: libName(d.id),
      seedName: 'mermaid-' + d.id,
      projectId: 'TODO.owner.mermaid-' + d.id,
      branchName: 'master',
      libraryRootHash: null,
      importPluginId: 'ImportMermaid',
      exportPluginId: 'ExportMermaid',
      packagePath: 'diagrams/' + d.id
    };
  })
};

const out = path.join(ROOT, 'router/src/common/DomainRegistry.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(registry, null, 2) + '\n');
console.log('Wrote ' + out + ' (' + registry.domains.length + ' domains)');
