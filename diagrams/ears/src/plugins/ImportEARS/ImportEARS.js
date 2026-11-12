/*globals define*/
/*eslint-env node, browser*/

/**
 * Import an EARS requirements specification into this WebGME project.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'text!../../../../metamodel/Language.json',
    'webgme-mdd-shared/EarsAst'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    languageJsonText,
    EarsAst) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ImportEARS() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ImportEARS.metadata = pluginMetadata;
    ImportEARS.prototype = Object.create(PluginBase.prototype);
    ImportEARS.prototype.constructor = ImportEARS;

    ImportEARS.prototype.main = function (callback) {
        const self = this;
        const core = self.core;
        const META = self.META;
        const config = self.getCurrentConfig();
        const source = (config.earsSource || '').trim();

        if (!source) {
            callback(new Error('earsSource is required'), self.result);
            return;
        }

        let ast;
        try {
            ast = EarsAst.parse(source);
        } catch (err) {
            callback(err, self.result);
            return;
        }

        const parent = self.activeNode;
        const specBase = META.EARSSpecification || META.EARSRequirement ||
            META[Object.keys(META).find(function (k) {
                return k !== 'FCO' && META[k];
            })];

        if (!specBase) {
            callback(new Error('Language meta not loaded. Run ApplyLanguageMeta first.'), self.result);
            return;
        }

        const reqBase = META.EARSRequirement || specBase;
        const specNode = core.createNode({
            parent: parent,
            base: META.EARSSpecification || specBase
        });
        core.setAttribute(specNode, 'name', ast.name || 'EARS Specification');
        if (ast.title) {
            try { core.setAttribute(specNode, 'title', ast.title); } catch (e) { /* optional */ }
        }
        core.setRegistry(specNode, 'position', { x: 100, y: 100 });
        try {
            core.setAttribute(specNode, 'earsSource', source);
        } catch (e) {
            core.setRegistry(specNode, 'earsSource', source);
        }

        let created = 1;
        (ast.requirements || []).forEach(function (r, idx) {
            const node = core.createNode({
                parent: specNode,
                base: reqBase
            });
            core.setAttribute(node, 'name', r.reqId || r.name || ('REQ-' + (idx + 1)));
            const attrs = [
                'reqId', 'pattern', 'precondition', 'trigger', 'feature',
                'unwantedCondition', 'system', 'response', 'text', 'risk', 'verifymethod'
            ];
            attrs.forEach(function (a) {
                if (r[a] === undefined || r[a] === null || r[a] === '') return;
                try { core.setAttribute(node, a, String(r[a])); } catch (e) { /* */ }
            });
            core.setRegistry(node, 'position', { x: 120, y: 160 + idx * 60 });
            created += 1;
        });

        self.save('Imported EARS specification: ' + (ast.name || 'spec'))
            .then(function () {
                self.logger.info('Created ' + created + ' nodes from EARS source');
                self.result.setSuccess(true);
                self.createMessage(specNode, 'Imported EARS specification (' +
                    (ast.requirements || []).length + ' requirements)', 'info');
                callback(null, self.result);
            })
            .catch(function (err) {
                self.logger.error(err.stack || err);
                callback(err, self.result);
            });
    };

    return ImportEARS;
});
