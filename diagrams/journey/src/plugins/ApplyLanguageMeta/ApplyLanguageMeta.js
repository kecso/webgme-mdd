/*globals define*/
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
