#!/usr/bin/env node
'use strict';

/**
 * Regenerates router/src/common/DomainRegistry.json from diagram-catalog.json.
 * Includes Mermaid diagrams plus companionLanguages (e.g. EARS).
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

const mermaidDomains = catalog.diagrams.map(function (d) {
  return {
    id: d.id,
    name: d.name,
    keywords: d.keywords,
    kind: 'mermaid',
    libraryName: libName(d.id),
    seedName: 'mermaid-' + d.id,
    projectId: 'TODO.owner.mermaid-' + d.id,
    branchName: 'master',
    libraryRootHash: null,
    importPluginId: 'ImportMermaid',
    exportPluginId: 'ExportMermaid',
    packagePath: 'diagrams/' + d.id
  };
});

const companionDomains = (catalog.companionLanguages || []).map(function (c) {
  return {
    id: c.id,
    name: c.name,
    keywords: c.keywords,
    kind: c.kind || 'companion',
    notMermaid: !!c.notMermaid,
    companionTo: c.companionTo || [],
    libraryName: c.libraryName || libName(c.id),
    seedName: c.seedName || c.id,
    projectId: 'TODO.owner.' + (c.seedName || c.id),
    branchName: 'master',
    libraryRootHash: null,
    importPluginId: c.importPluginId || 'ImportEARS',
    exportPluginId: c.exportPluginId || 'ExportEARS',
    packagePath: c.packagePath || 'diagrams/' + c.id
  };
});

const registry = {
  generatedFrom: 'scripts/diagram-catalog.json',
  notes: [
    'projectId / seedName / libraryRootHash are placeholders until real WebGME domain seeds exist.',
    'importPluginId is the diagram-package plugin id; router invokes it after ensuring the library.',
    'Companion languages (kind != mermaid) are textual/spec domains such as EARS — not Mermaid diagrams.'
  ],
  domains: mermaidDomains.concat(companionDomains)
};

const out = path.join(ROOT, 'router/src/common/DomainRegistry.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(registry, null, 2) + '\n');
console.log(
  'Wrote ' +
    out +
    ' (' +
    registry.domains.length +
    ' domains: ' +
    mermaidDomains.length +
    ' mermaid + ' +
    companionDomains.length +
    ' companion)'
);
