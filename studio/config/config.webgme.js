// Maintained for the MDSS WebGME host (webgme-dss pattern).
// Diagram plugin paths are generated from the monorepo layout — edit carefully.
'use strict';

var path = require('path'),
    fs = require('fs'),
    config = require('webgme-engine/config/config.default');

var studioRoot = path.join(__dirname, '..');
var repoRoot = path.join(studioRoot, '..');

config.plugin.basePaths = config.plugin.basePaths || [];
config.seedProjects.basePaths = config.seedProjects.basePaths || [];

// Orchestrator plugin (router package)
config.plugin.basePaths.push(path.join(repoRoot, 'router', 'src', 'plugins'));

// Per-diagram WebGME packages — same plugin ids across domains today
// (ImportMermaid / ExportMermaid / ApplyLanguageMeta). First match wins for
// bare getPlugin(id); ImportMDD / future namespaced invoke select by package.
var diagramsDir = path.join(repoRoot, 'diagrams');
if (fs.existsSync(diagramsDir)) {
    fs.readdirSync(diagramsDir).forEach(function (id) {
        var pluginsDir = path.join(diagramsDir, id, 'src', 'plugins');
        if (fs.existsSync(pluginsDir)) {
            config.plugin.basePaths.push(pluginsDir);
        }
    });
}

config.rest.components = config.rest.components || {};

config.rest.components.AppRouter = {
    src: path.join(studioRoot, 'src', 'routers', 'AppRouter', 'AppRouter.js'),
    mount: 'p',
    options: {}
};

config.rest.components.DomainManager = {
    src: path.join(studioRoot, 'src', 'routers', 'DomainManager', 'DomainManager.js'),
    mount: 'DomainManager',
    options: {}
};

config.requirejsPaths = {
    studio: './src/common',
    router: path.join(repoRoot, 'router', 'src', 'common'),
    'webgme-mdd-shared': path.join(repoRoot, 'packages', 'shared', 'src')
};

config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_mdd_studio';

module.exports = config;
