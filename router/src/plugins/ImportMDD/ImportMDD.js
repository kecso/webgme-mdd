/*globals define*/
/*eslint-env node, browser*/

/**
 * ImportMDD — router plugin for webgme-mdd.
 *
 * 1) Resolve which Mermaid domains are needed (detect or override).
 * 2) Ensure each domain library is present on the project (addLibrary / seed).
 * 3) Invoke diagram-specific ImportMermaid plugins for each document.
 *
 * Several call sites are intentionally stubbed with TODO comments until real
 * WebGME domain seeds and registered plugin ids exist.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'router/DomainRegistry',
    'q'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    DomainRegistry,
    Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ImportMDD() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ImportMDD.metadata = pluginMetadata;
    ImportMDD.prototype = Object.create(PluginBase.prototype);
    ImportMDD.prototype.constructor = ImportMDD;

    /**
     * @param {function(Error|null, plugin.PluginResult)} callback
     */
    ImportMDD.prototype.main = function (callback) {
        const self = this;
        const config = self.getCurrentConfig();
        const source = (config.mermaidSource || '').trim();

        if (!source && !(config.diagramTypeOverride || '').trim()) {
            callback(new Error('mermaidSource (or diagramTypeOverride) is required'), self.result);
            return;
        }

        let jobs;
        try {
            jobs = self._planImportJobs(source, config);
        } catch (err) {
            callback(err, self.result);
            return;
        }

        if (!jobs.length) {
            callback(new Error('No Mermaid domains detected in source'), self.result);
            return;
        }

        self.logger.info('ImportMDD planned jobs: ' + jobs.map(function (j) {
            return j.domain.id;
        }).join(', '));

        let chain = Q(null);

        if (config.ensureLibraries !== false) {
            const uniqueDomains = self._uniqueDomains(jobs);
            uniqueDomains.forEach(function (domain) {
                chain = chain.then(function () {
                    return self._ensureDomainLibrary(domain);
                });
            });
        }

        if (config.invokeDiagramImporters !== false) {
            jobs.forEach(function (job) {
                chain = chain.then(function () {
                    return self._invokeDiagramImporter(job);
                });
            });
        }

        chain
            .then(function () {
                return self.save('ImportMDD imported ' + jobs.length + ' Mermaid document(s)');
            })
            .then(function () {
                self.result.setSuccess(true);
                self.createMessage(
                    self.activeNode,
                    'ImportMDD completed for: ' + jobs.map(function (j) {
                        return j.domain.id;
                    }).join(', '),
                    'info'
                );
                callback(null, self.result);
            })
            .catch(function (err) {
                self.logger.error(err.stack || err);
                callback(err, self.result);
            });
    };

    /**
     * Build per-document import jobs.
     * @private
     */
    ImportMDD.prototype._planImportJobs = function (source, config) {
        const self = this;
        const override = (config.diagramTypeOverride || '')
            .split(',')
            .map(function (s) { return s.trim(); })
            .filter(Boolean);

        if (override.length) {
            return override.map(function (id) {
                const domain = DomainRegistry.getById(id);
                if (!domain) {
                    throw new Error('Unknown diagram type override: ' + id);
                }
                return {
                    domain: domain,
                    source: source
                };
            });
        }

        const docs = DomainRegistry.splitDocuments(source);
        const jobs = [];
        docs.forEach(function (doc, idx) {
            const domain = DomainRegistry.detectFromSource(doc);
            if (!domain) {
                self.logger.warn('Skipping document #' + (idx + 1) + ': could not detect diagram type');
                return;
            }
            jobs.push({
                domain: domain,
                source: doc
            });
        });
        return jobs;
    };

    /**
     * @private
     */
    ImportMDD.prototype._uniqueDomains = function (jobs) {
        const seen = {};
        const out = [];
        jobs.forEach(function (job) {
            if (!seen[job.domain.id]) {
                seen[job.domain.id] = true;
                out.push(job.domain);
            }
        });
        return out;
    };

    /**
     * Ensure the Mermaid domain metamodel is available as a project library.
     * @private
     * @param {object} domain DomainRegistry entry
     * @returns {Promise}
     */
    ImportMDD.prototype._ensureDomainLibrary = function (domain) {
        const self = this;
        const libName = domain.libraryName;

        return self._listLibraryNames()
            .then(function (names) {
                if (names.indexOf(libName) !== -1) {
                    self.logger.info('Library already present: ' + libName);
                    self.createMessage(self.rootNode, 'Library OK: ' + libName, 'info');
                    return null;
                }

                self.logger.info('Importing domain library: ' + libName);
                return self._addDomainLibrary(domain);
            });
    };

    /**
     * @private
     * @returns {Promise<string[]>}
     */
    ImportMDD.prototype._listLibraryNames = function () {
        const self = this;
        // Prefer Core API when available
        if (typeof self.core.getLibraryNames === 'function') {
            try {
                return Q(self.core.getLibraryNames(self.rootNode) || []);
            } catch (err) {
                self.logger.warn('getLibraryNames failed: ' + err.message);
            }
        }

        // Fallback: children of ROOT that look like libraries
        return self.core.loadChildren(self.rootNode)
            .then(function (children) {
                return (children || [])
                    .filter(function (ch) {
                        try {
                            return typeof self.core.isLibraryRoot === 'function' &&
                                self.core.isLibraryRoot(ch);
                        } catch (e) {
                            return false;
                        }
                    })
                    .map(function (ch) {
                        return self.core.getAttribute(ch, 'name');
                    });
            });
    };

    /**
     * Add a domain package as a WebGME library.
     * Stubbed with TODOs until seeds / project ids are real.
     * @private
     * @param {object} domain
     * @returns {Promise}
     */
    ImportMDD.prototype._addDomainLibrary = function (domain) {
        const self = this;
        const libName = domain.libraryName;

        // -------------------------------------------------------------------------
        // TODO(webgme-mdd): Point these at real domain seeds once they exist.
        // Preferred paths (pick one when wiring for real):
        //
        //  A) Seed name registered in gmeConfig.seedProjects
        //     self.project ... or storage API to load seed → rootHash
        //
        //  B) Library project already in the deployment database:
        //     core.addLibrary(root, libName, libraryRootHash, {
        //       projectId: domain.projectId,
        //       branchName: domain.branchName,
        //       commitHash: '<resolved commit>'
        //     })
        //
        //  C) Client-side / blob import of a .webgmex seed:
        //     (browser) client.addLibrary(libName, seedNameOrBlobHash, cb)
        //
        // DomainRegistry placeholders today:
        //   projectId:        domain.projectId        e.g. TODO.owner.mermaid-flowchart
        //   seedName:         domain.seedName         e.g. mermaid-flowchart
        //   libraryRootHash:  domain.libraryRootHash  null until seeded
        //   packagePath:      domain.packagePath      diagrams/<id>
        // -------------------------------------------------------------------------

        self.createMessage(
            self.rootNode,
            'TODO: addLibrary for ' + libName +
                ' (seed=' + domain.seedName +
                ', projectId=' + domain.projectId +
                ', package=' + domain.packagePath + ')',
            'warning'
        );

        if (domain.libraryRootHash && typeof self.core.addLibrary === 'function') {
            // TODO(webgme-mdd): Confirm libraryRootHash is present in this project's
            // object collection before calling addLibrary (may need a prior pull/copy).
            return self.core.addLibrary(
                self.rootNode,
                libName,
                domain.libraryRootHash,
                {
                    projectId: domain.projectId,
                    branchName: domain.branchName || 'master',
                    commitHash: domain.commitHash || null
                }
            );
        }

        // Soft-success stub so orchestration can continue during scaffolding.
        // TODO(webgme-mdd): Replace with a hard error once seeds are mandatory.
        self.logger.warn(
            'Skipping real addLibrary for ' + libName +
            ' — no libraryRootHash yet. Domain package at ' + domain.packagePath
        );
        return Q(null);
    };

    /**
     * Invoke the diagram-specific ImportMermaid plugin.
     * @private
     * @param {{domain: object, source: string}} job
     * @returns {Promise}
     */
    ImportMDD.prototype._invokeDiagramImporter = function (job) {
        const self = this;
        const domain = job.domain;
        const pluginId = domain.importPluginId || 'ImportMermaid';

        // -------------------------------------------------------------------------
        // TODO(webgme-mdd): Once diagram packages are installed into this WebGME
        // deployment (or their plugins are on requirejs/plugin basePaths), the
        // invokePlugin id may need a qualified form, e.g.:
        //   'mermaid-flowchart/ImportMermaid'
        // or a globally unique id per domain:
        //   'ImportMermaid_flowchart'
        // Update DomainRegistry.json importPluginId accordingly.
        //
        // Also set namespace to the library name so META resolves inside the
        // imported domain library, e.g. namespace: domain.libraryName
        // -------------------------------------------------------------------------

        self.logger.info(
            'Invoking ' + pluginId + ' for domain ' + domain.id +
            ' (library namespace TODO: ' + domain.libraryName + ')'
        );

        if (typeof self.invokePlugin !== 'function') {
            self.createMessage(
                self.activeNode,
                'TODO: invokePlugin unavailable; would call ' + pluginId + ' for ' + domain.id,
                'warning'
            );
            return Q(null);
        }

        const pluginConfig = domain.notMermaid || domain.kind === 'textual-spec'
            ? { earsSource: job.source }
            : { mermaidSource: job.source };

        return self.invokePlugin(pluginId, {
            // TODO(webgme-mdd): Use domain.libraryName as namespace after libraries exist.
            // namespace: domain.libraryName,
            namespace: self.namespace,
            activeNode: self.activeNode,
            activeSelection: self.activeSelection,
            pluginConfig: pluginConfig
        }).then(function (interResult) {
            const ok = !interResult || interResult.getSuccess === undefined ||
                interResult.getSuccess();
            if (!ok) {
                throw new Error(
                    'Diagram importer ' + pluginId + ' failed for domain ' + domain.id
                );
            }
            self.createMessage(
                self.activeNode,
                'Invoked ' + pluginId + ' for ' + domain.id,
                'info'
            );
            return interResult;
        }).catch(function (err) {
            // Soft-fail while plugins are not yet registered in this router app.
            // TODO(webgme-mdd): Re-throw once diagram ImportMermaid plugins are on the path.
            self.logger.warn(
                'invokePlugin(' + pluginId + ') for ' + domain.id +
                ' not completed: ' + (err && err.message ? err.message : err)
            );
            self.createMessage(
                self.activeNode,
                'TODO: wire invokePlugin to real ' + pluginId +
                    ' for ' + domain.id + ' — ' + (err && err.message ? err.message : err),
                'warning'
            );
            return null;
        });
    };

    return ImportMDD;
});
