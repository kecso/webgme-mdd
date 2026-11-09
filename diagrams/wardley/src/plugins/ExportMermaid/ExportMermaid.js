/*globals define*/
/*eslint-env node, browser*/

/**
 * Export the active Wardley Map model subtree to Mermaid text.
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
        const diagramType = 'wardley';

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
