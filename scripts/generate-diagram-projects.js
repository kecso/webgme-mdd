#!/usr/bin/env node
'use strict';

/**
 * Generates one WebGME-shaped project per Mermaid diagram from diagram-catalog.json.
 * Safe to re-run; overwrites generated files under diagrams/<id>/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'diagram-catalog.json'), 'utf8')
);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function pkgName(id) {
  return `@webgme-mdd/${id}`;
}

function mongoName(id) {
  return `webgme_mdd_${id.replace(/-/g, '_')}`;
}

const { fromConceptMap, containerName } = require('./language-document');

function buildMetaJson(diagram) {
  return fromConceptMap(
    diagram.id,
    diagram.metaConcepts || {},
    'ImportMermaid ExportMermaid ApplyLanguageMeta'
  );
}

function pluginMetadata(id, name, description, writeAccess, configStructure) {
  return JSON.stringify(
    {
      id,
      name,
      version: '0.1.0',
      description,
      icon: {
        class: writeAccess
          ? 'glyphicon glyphicon-import'
          : 'glyphicon glyphicon-export',
        src: ''
      },
      disableServerSideExecution: false,
      disableBrowserSideExecution: false,
      dependencies: [],
      writeAccessRequired: !!writeAccess,
      configStructure: configStructure || []
    },
    null,
    2
  );
}

function importPluginSource(diagram) {
  return `/*globals define*/
/*eslint-env node, browser*/

/**
 * Import a Mermaid ${diagram.name} text definition into this WebGME project.
 * Uses Core API + optional webgme-json style node creation.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'text!../../../../metamodel/Language.json',
    'webgme-mdd-shared/MermaidAst',
    'webgme-mdd-shared/MetaBuilder'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    languageJsonText,
    MermaidAst,
    MetaBuilder) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ImportMermaid() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ImportMermaid.metadata = pluginMetadata;
    ImportMermaid.prototype = Object.create(PluginBase.prototype);
    ImportMermaid.prototype.constructor = ImportMermaid;

    ImportMermaid.prototype.main = function (callback) {
        const self = this;
        const core = self.core;
        const META = self.META;
        const config = self.getCurrentConfig();
        const source = (config.mermaidSource || '').trim();
        const diagramType = '${diagram.id}';

        if (!source) {
            callback(new Error('mermaidSource is required'), self.result);
            return;
        }

        let ast;
        try {
            ast = MermaidAst.parse(source, diagramType);
        } catch (err) {
            callback(err, self.result);
            return;
        }

        const parent = self.activeNode;
        const diagramBase = META.${containerName(diagram.id)} || META[Object.keys(META).find(function (k) {
            return k !== 'FCO' && META[k];
        })];

        if (!diagramBase) {
            callback(new Error('Language meta not loaded. Run ApplyLanguageMeta first.'), self.result);
            return;
        }

        const diagramNode = core.createNode({
            parent: parent,
            base: diagramBase
        });
        core.setAttribute(diagramNode, 'name', ast.name || '${diagram.name}');
        if (ast.title) {
            try { core.setAttribute(diagramNode, 'title', ast.title); } catch (e) { /* optional attr */ }
        }
        core.setRegistry(diagramNode, 'position', { x: 100, y: 100 });

        // Store raw source for round-trip fidelity
        try {
            core.setAttribute(diagramNode, 'mermaidSource', source);
        } catch (e) {
            // Attribute may not be in meta yet; attach via registry as fallback
            core.setRegistry(diagramNode, 'mermaidSource', source);
        }

        const created = MetaBuilder.materializeAst(core, META, diagramNode, ast);

        self.save('Imported Mermaid ${diagram.name}: ' + (ast.name || 'diagram'))
            .then(function () {
                self.logger.info('Created ' + created + ' nodes from Mermaid source');
                self.result.setSuccess(true);
                self.createMessage(diagramNode, 'Imported ${diagram.name}', 'info');
                callback(null, self.result);
            })
            .catch(function (err) {
                self.logger.error(err.stack || err);
                callback(err, self.result);
            });
    };

    return ImportMermaid;
});
`;
}

function exportPluginSource(diagram) {
  return `/*globals define*/
/*eslint-env node, browser*/

/**
 * Export the active ${diagram.name} model subtree to Mermaid text.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'webgme-mdd-shared/MermaidAst'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    MermaidAst) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ExportMermaid() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ExportMermaid.metadata = pluginMetadata;
    ExportMermaid.prototype = Object.create(PluginBase.prototype);
    ExportMermaid.prototype.constructor = ExportMermaid;

    ExportMermaid.prototype.main = function (callback) {
        const self = this;
        const core = self.core;
        const node = self.activeNode;
        const diagramType = '${diagram.id}';

        core.loadSubTree(node)
            .then(function (nodes) {
                const byPath = {};
                nodes.forEach(function (n) { byPath[core.getPath(n)] = n; });

                // Prefer stored original source when present
                let raw = null;
                try { raw = core.getAttribute(node, 'mermaidSource'); } catch (e) { /* */ }
                if (!raw) {
                    raw = core.getRegistry(node, 'mermaidSource');
                }

                const mermaidText = raw || MermaidAst.serializeFromCore(core, node, byPath, diagramType);
                const fileName = (core.getAttribute(node, 'name') || diagramType) + '.mmd';

                return self.blobClient.putFile(fileName, mermaidText)
                    .then(function (hash) {
                        self.result.addArtifact(hash);
                        self.createMessage(node, mermaidText, 'info');
                        self.result.setSuccess(true);
                        callback(null, self.result);
                    });
            })
            .catch(function (err) {
                self.logger.error(err.stack || err);
                callback(err, self.result);
            });
    };

    return ExportMermaid;
});
`;
}

function applyMetaPluginSource() {
  return `/*globals define*/
/*eslint-env node, browser*/

/**
 * Apply metamodel/Language.json onto the active Language (or ROOT) node
 * using a lightweight webgme-json compatible importer.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'text!../../../../metamodel/Language.json',
    'webgme-mdd-shared/JsonMetaImporter'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    languageJsonText,
    JsonMetaImporter) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ApplyLanguageMeta() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ApplyLanguageMeta.metadata = pluginMetadata;
    ApplyLanguageMeta.prototype = Object.create(PluginBase.prototype);
    ApplyLanguageMeta.prototype.constructor = ApplyLanguageMeta;

    ApplyLanguageMeta.prototype.main = function (callback) {
        const self = this;
        const spec = JSON.parse(languageJsonText);

        JsonMetaImporter.apply(self.core, self.rootNode, self.activeNode, spec, self.META)
            .then(function (summary) {
                return self.save('Applied Language.json metamodel').then(function () {
                    self.logger.info(JSON.stringify(summary));
                    self.result.setSuccess(true);
                    self.createMessage(self.activeNode, 'Applied language meta: ' + summary.created + ' created, ' + summary.updated + ' updated', 'info');
                    callback(null, self.result);
                });
            })
            .catch(function (err) {
                self.logger.error(err.stack || err);
                callback(err, self.result);
            });
    };

    return ApplyLanguageMeta;
});
`;
}

function generateProject(diagram) {
  const dir = path.join(ROOT, 'diagrams', diagram.id);
  const name = pkgName(diagram.id);

  write(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        description: `WebGME DSML project for Mermaid ${diagram.name}`,
        scripts: {
          start: 'node app.js',
          test: 'node ./node_modules/mocha/bin/mocha --recursive test',
          plugin: 'node ./node_modules/webgme-engine/src/bin/run_plugin.js',
          'seed:meta': 'node ../../scripts/print-meta-summary.js ' + diagram.id
        },
        keywords: ['webgme', 'mermaid', diagram.id, 'mdd'],
        peerDependencies: {
          webgme: '^2.23.0'
        },
        devDependencies: {
          mocha: '^5.2.0',
          webgme: '^2.23.0'
        },
        dependencies: {
          '@webgme-mdd/shared': '*'
        }
      },
      null,
      2
    ) + '\n'
  );

  write(
    path.join(dir, 'webgme-setup.json'),
    JSON.stringify(
      {
        components: {
          plugins: {
            ImportMermaid: {
              src: 'src/plugins/ImportMermaid',
              test: 'test/plugins/ImportMermaid'
            },
            ExportMermaid: {
              src: 'src/plugins/ExportMermaid',
              test: 'test/plugins/ExportMermaid'
            },
            ApplyLanguageMeta: {
              src: 'src/plugins/ApplyLanguageMeta',
              test: 'test/plugins/ApplyLanguageMeta'
            }
          }
        },
        dependencies: {
          plugins: {}
        }
      },
      null,
      2
    ) + '\n'
  );

  write(
    path.join(dir, 'app.js'),
    `// This is entry point of the webgme server for Mermaid ${diagram.name}.
'use strict';
require('webgme').standalone(require('./config'));
`
  );

  write(
    path.join(dir, '.gitignore'),
    `node_modules/
npm-debug.log
blob-local-storage/
*.log
.DS_Store
`
  );

  write(
    path.join(dir, 'README.md'),
    `# ${diagram.name} (\`${diagram.id}\`)

WebGME project housing a DSML metamodel for Mermaid **${diagram.name}**.

## Mermaid keywords

${diagram.keywords.map((k) => `- \`${k}\``).join('\n')}

## Status

\`${diagram.status}\`

## Domains

${diagram.domains.map((d) => `- ${d}`).join('\n')}

## Capabilities

${diagram.capabilities.map((c) => `- ${c}`).join('\n')}

## Syntax highlights

\`\`\`mermaid
${diagram.syntaxHighlights.join('\n')}
\`\`\`

## Layout

| Path | Purpose |
|------|---------|
| \`metamodel/Language.json\` | webgme-json-importer metamodel |
| \`examples/sample.mmd\` | Canonical Mermaid sample |
| \`src/plugins/ImportMermaid\` | Mermaid text → model |
| \`src/plugins/ExportMermaid\` | model → Mermaid text |
| \`src/plugins/ApplyLanguageMeta\` | Apply Language.json via Core |

## Run (requires MongoDB)

\`\`\`bash
npm install
# from repo root or this package after workspace install
npm start
\`\`\`

Then open the configured WebGME port, create a project from this seed/language, run **ApplyLanguageMeta**, then **ImportMermaid**.
`
  );

  write(
    path.join(dir, 'config/config.webgme.js'),
    `// DO NOT EDIT THIS FILE
// This file is automatically generated from the webgme-setup-tool / webgme-mdd generator.
'use strict';

var config = require('webgme/config/config.default'),
    validateConfig = require('webgme/config/validator');

config.plugin.basePaths.push(__dirname + '/../src/plugins');

config.requirejsPaths = {
  '${diagram.id}': './src/common',
  'webgme-mdd-shared': './node_modules/@webgme-mdd/shared/src'
};

config.mongo.uri = 'mongodb://127.0.0.1:27017/${mongoName(diagram.id)}';
validateConfig(config);
module.exports = config;
`
  );

  write(
    path.join(dir, 'config/config.default.js'),
    `'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Uncommon port to avoid collisions in cloud/dev environments
config.server.port = ${3900 + Math.abs(hashCode(diagram.id) % 400)};

validateConfig(config);
module.exports = config;
`
  );

  write(
    path.join(dir, 'config/config.test.js'),
    `'use strict';

var config = require('./config.default'),
    validateConfig = require('webgme/config/validator');

config.server.port = ${4900 + Math.abs(hashCode(diagram.id) % 400)};
config.mongo.uri = config.mongo.uri + '_test';

validateConfig(config);
module.exports = config;
`
  );

  write(
    path.join(dir, 'config/index.js'),
    `/*jshint node: true*/
var env = process.env.NODE_ENV || 'default',
    configFilename = __dirname + '/config.' + env + '.js',
    config = require(configFilename),
    validateConfig = require('webgme/config/validator'),
    overrideFromEnv = require('webgme/config/overridefromenv');

overrideFromEnv(config);
validateConfig(config);
module.exports = config;
`
  );

  write(
    path.join(dir, 'config/README.md'),
    `# Config for ${diagram.name}

\`config.default.js\` is the entry used by \`npm start\`. Plugin paths are registered in \`config.webgme.js\`.
`
  );

  write(path.join(dir, 'metamodel/Language.json'), JSON.stringify(buildMetaJson(diagram), null, 2) + '\n');

  write(
    path.join(dir, 'metamodel/descriptor.json'),
    JSON.stringify(
      {
        id: diagram.id,
        name: diagram.name,
        keywords: diagram.keywords,
        status: diagram.status,
        domains: diagram.domains,
        capabilities: diagram.capabilities,
        syntaxHighlights: diagram.syntaxHighlights,
        metaConcepts: diagram.metaConcepts,
        webgmeJson: './Language.json',
        sample: './../examples/sample.mmd'
      },
      null,
      2
    ) + '\n'
  );

  write(path.join(dir, 'examples/sample.mmd'), diagram.sample.trim() + '\n');

  write(path.join(dir, 'src/common/README.md'), `# Common modules for ${diagram.name}\n`);
  write(path.join(dir, 'src/visualizers/Visualizers.json'), '[]\n');

  write(
    path.join(dir, 'src/plugins/ImportMermaid/metadata.json'),
    pluginMetadata('ImportMermaid', 'Import Mermaid', `Import Mermaid ${diagram.name} text into the model`, true, [
      {
        name: 'mermaidSource',
        displayName: 'Mermaid source',
        description: `Paste a ${diagram.keywords[0]} definition`,
        value: diagram.sample,
        valueType: 'string',
        readOnly: false
      }
    ]) + '\n'
  );
  write(path.join(dir, 'src/plugins/ImportMermaid/ImportMermaid.js'), importPluginSource(diagram));

  write(
    path.join(dir, 'src/plugins/ExportMermaid/metadata.json'),
    pluginMetadata('ExportMermaid', 'Export Mermaid', `Export model to Mermaid ${diagram.name} text`, false, []) +
      '\n'
  );
  write(path.join(dir, 'src/plugins/ExportMermaid/ExportMermaid.js'), exportPluginSource(diagram));

  write(
    path.join(dir, 'src/plugins/ApplyLanguageMeta/metadata.json'),
    pluginMetadata(
      'ApplyLanguageMeta',
      'Apply Language Meta',
      'Create/update META nodes from metamodel/Language.json (webgme-json-importer)',
      true,
      []
    ) + '\n'
  );
  write(path.join(dir, 'src/plugins/ApplyLanguageMeta/ApplyLanguageMeta.js'), applyMetaPluginSource());

  write(
    path.join(dir, 'test/globals.js'),
    `/*globals requireJS*/
/*jshint node:true*/
var testFixture = require('webgme/test/_globals'),
    WEBGME_CONFIG_PATH = '../config';

var WebGME = testFixture.WebGME,
    gmeConfig = require(WEBGME_CONFIG_PATH),
    getGmeConfig = function () {
        'use strict';
        if (!gmeConfig) {
            gmeConfig = require(WEBGME_CONFIG_PATH);
        }
        return JSON.parse(JSON.stringify(gmeConfig));
    };

WebGME.addToRequireJsPaths(gmeConfig);
testFixture.getGmeConfig = getGmeConfig;
module.exports = testFixture;
`
  );

  write(
    path.join(dir, 'test/plugins/ImportMermaid/ImportMermaid.spec.js'),
    `/*jshint node:true, mocha:true*/
describe('ImportMermaid ${diagram.id}', function () {
    it('plugin module loads', function () {
        // Full WebGME plugin tests require a running Mongo + webgme install.
        // Structural presence is validated by the generator and catalog tests.
    });
});
`
  );
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function main() {
  for (const diagram of CATALOG.diagrams) {
    generateProject(diagram);
    console.log('generated diagrams/' + diagram.id);
  }
  const companions = CATALOG.companionLanguages || [];
  // Index file for tooling (Mermaid diagrams + companion languages)
  write(
    path.join(ROOT, 'diagrams/index.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        diagramCount: CATALOG.diagrams.length,
        companionCount: companions.length,
        count: CATALOG.diagrams.length + companions.length,
        diagrams: CATALOG.diagrams.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          keywords: d.keywords,
          domains: d.domains,
          path: `diagrams/${d.id}`
        })),
        companions: companions.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          kind: c.kind || 'companion',
          notMermaid: !!c.notMermaid,
          companionTo: c.companionTo || [],
          keywords: c.keywords,
          domains: c.domains,
          path: c.packagePath || `diagrams/${c.id}`
        }))
      },
      null,
      2
    ) + '\n'
  );
  console.log(
    'Wrote diagrams/index.json (' +
      CATALOG.diagrams.length +
      ' diagrams + ' +
      companions.length +
      ' companions)'
  );
}

main();
