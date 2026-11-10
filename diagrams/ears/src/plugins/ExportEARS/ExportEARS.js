/*globals define*/
/*eslint-env node, browser*/

/**
 * Export the active EARS specification model subtree to .ears text.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'webgme-mdd-shared/EarsAst'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    EarsAst) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ExportEARS() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ExportEARS.metadata = pluginMetadata;
    ExportEARS.prototype = Object.create(PluginBase.prototype);
    ExportEARS.prototype.constructor = ExportEARS;

    ExportEARS.prototype.main = function (callback) {
        const self = this;
        const core = self.core;
        const node = self.activeNode;

        core.loadSubTree(node)
            .then(function (nodes) {
                let raw = null;
                try { raw = core.getAttribute(node, 'earsSource'); } catch (e) { /* */ }
                if (!raw) {
                    raw = core.getRegistry(node, 'earsSource');
                }

                let earsText = raw;
                if (!earsText) {
                    const requirements = [];
                    nodes.forEach(function (n) {
                        if (n === node) return;
                        const reqId = core.getAttribute(n, 'reqId') || core.getAttribute(n, 'name');
                        if (!reqId) return;
                        requirements.push({
                            reqId: reqId,
                            pattern: core.getAttribute(n, 'pattern') || 'ubiquitous',
                            risk: core.getAttribute(n, 'risk') || '',
                            verifymethod: core.getAttribute(n, 'verifymethod') || '',
                            text: core.getAttribute(n, 'text') || '',
                            precondition: core.getAttribute(n, 'precondition') || '',
                            trigger: core.getAttribute(n, 'trigger') || '',
                            feature: core.getAttribute(n, 'feature') || '',
                            unwantedCondition: core.getAttribute(n, 'unwantedCondition') || '',
                            system: core.getAttribute(n, 'system') || '',
                            response: core.getAttribute(n, 'response') || ''
                        });
                    });
                    earsText = EarsAst.serialize({
                        title: core.getAttribute(node, 'title') || core.getAttribute(node, 'name'),
                        requirements: requirements
                    });
                }

                const fileName = (core.getAttribute(node, 'name') || 'specification') + '.ears';
                return self.blobClient.putFile(fileName, earsText)
                    .then(function (hash) {
                        self.result.addArtifact(hash);
                        self.createMessage(node, earsText, 'info');
                        self.result.setSuccess(true);
                        callback(null, self.result);
                    });
            })
            .catch(function (err) {
                self.logger.error(err.stack || err);
                callback(err, self.result);
            });
    };

    return ExportEARS;
});
