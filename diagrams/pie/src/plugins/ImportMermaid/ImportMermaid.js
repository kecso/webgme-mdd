/*globals define*/
/*eslint-env node, browser*/

/**
 * Import a Mermaid Pie Chart text definition into this WebGME project.
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
        const diagramType = 'pie';

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
        const diagramBase = META.PieChart || META[Object.keys(META).find(function (k) {
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
        core.setAttribute(diagramNode, 'name', ast.name || 'Pie Chart');
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

        self.save('Imported Mermaid Pie Chart: ' + (ast.name || 'diagram'))
            .then(function () {
                self.logger.info('Created ' + created + ' nodes from Mermaid source');
                self.result.setSuccess(true);
                self.createMessage(diagramNode, 'Imported Pie Chart', 'info');
                callback(null, self.result);
            })
            .catch(function (err) {
                self.logger.error(err.stack || err);
                callback(err, self.result);
            });
    };

    return ImportMermaid;
});
