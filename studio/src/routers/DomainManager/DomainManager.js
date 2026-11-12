/*globals requireJS*/
/**
 * Domain / project lifecycle for MDSS (webgme-dss DomainManager analogue).
 *
 * createProject seeds mdd/mdd.webgmex (a Project folder that can hold any FCO)
 * and mounts each language the selected domains use as a library. The library
 * name is the diagram directory. updateProject adds any libraries the new
 * domain selection needs. A library that is already mounted is left in place.
 */
'use strict';

var path = require('path'),
    fs = require('fs'),
    express = require('express'),
    Q = require('q'),
    router = express.Router(),
    CONSTANTS = requireJS('common/Constants');

var REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
var REGISTRY_PATH = path.join(REPO_ROOT, 'router', 'src', 'common', 'DomainRegistry.json');
var CATALOG_PATH = path.join(REPO_ROOT, 'scripts', 'diagram-catalog.json');
var STORIES_PATH = path.join(REPO_ROOT, 'docs', 'stories', 'stories.json');
var DOMAINS_PATH = path.join(REPO_ROOT, 'mdd', 'domains.json');

function librariesForDomains(domains) {
    var map = loadJson(DOMAINS_PATH);
    var found = {};
    (domains || []).forEach(function (domain) {
        (map[domain] || []).forEach(function (id) {
            found[id] = true;
        });
    });
    return Object.keys(found).sort();
}

function addLibraries(swm, token, projectId, libraryIds) {
    return (libraryIds || []).reduce(function (chain, libraryName) {
        return chain.then(function () {
            return Q.ninvoke(swm, 'request', {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.ADD_LIBRARY,
                webgmeToken: token,
                projectId: projectId,
                branchName: 'master',
                libraryName: libraryName,
                seed: libraryName
            }).catch(function (err) {
                var message = err && err.message ? err.message : String(err);
                if (message.toLowerCase().indexOf('unique') !== -1) {
                    return null;
                }
                throw err;
            });
        });
    }, Q());
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getSeedInfo() {
    var registry = loadJson(REGISTRY_PATH);
    var catalog = loadJson(CATALOG_PATH);
    var domainIndex = catalog.domainIndex || {};
    return {
        version: registry.generatedFrom || '0.1.0',
        // Modeling domains (ci-cd, uml, …) — what projects enable.
        domains: Object.keys(domainIndex).sort(),
        domainIndex: domainIndex,
        // Diagram packages remain available for couplings / translators.
        diagramPackages: (registry.domains || []).map(function (d) {
            return d.id;
        }),
        entries: registry.domains || [],
        notes: (registry.notes || []).concat([
            'domains[] are modeling domains from catalog.domainIndex, not diagram package ids.',
            'Translators should be configured per domain→diagramType coupling.'
        ])
    };
}

function initialize(middlewareOpts) {
    var logger = middlewareOpts.logger.fork('DomainManager'),
        ensureAuthenticated = middlewareOpts.ensureAuthenticated,
        swm = middlewareOpts.workerManager,
        gmeAuth = middlewareOpts.gmeAuth,
        getUserId = middlewareOpts.getUserId;

    function getNewJWToken(userId) {
        if (middlewareOpts.gmeConfig.authentication.enable === true) {
            return middlewareOpts.gmeAuth.generateJWTokenForAuthenticatedUser(userId);
        }
        return Q();
    }

    logger.debug('initializing ...');

    router.use('*', function (req, res, next) {
        res.setHeader('X-WebGME-Media-Type', 'webgme.v1');
        next();
    });

    router.use('*', ensureAuthenticated);

    router.get('/seedInfo', function (req, res, next) {
        try {
            res.json(getSeedInfo());
        } catch (err) {
            next(err);
        }
    });

    router.get('/catalog', function (req, res, next) {
        try {
            res.json(loadJson(CATALOG_PATH));
        } catch (err) {
            next(err);
        }
    });

    router.get('/registry', function (req, res, next) {
        try {
            res.json(loadJson(REGISTRY_PATH));
        } catch (err) {
            next(err);
        }
    });

    router.get('/stories', function (req, res, next) {
        try {
            res.json(loadJson(STORIES_PATH));
        } catch (err) {
            next(err);
        }
    });

    router.get('/sample/:id', function (req, res, next) {
        try {
            var id = req.params.id;
            var candidates = [
                path.join(REPO_ROOT, 'diagrams', id, 'examples', 'sample.mmd'),
                path.join(REPO_ROOT, 'diagrams', id, 'examples', 'sample.ears')
            ];
            var file = candidates.find(function (f) {
                return fs.existsSync(f);
            });
            if (!file) {
                res.status(404).send('Not found');
                return;
            }
            res.type('text/plain').send(fs.readFileSync(file, 'utf8'));
        } catch (err) {
            next(err);
        }
    });

    /**
     * body: { projectName: string, domains: string[] }
     */
    router.post('/createProject', function (req, res, next) {
        var userId = getUserId(req);
        var seedInfo;
        var domains;
        var projectName;
        var returnData = { projectId: null, kind: null, libraries: [] };
        var token;

        logger.debug('createProject', req.body);

        try {
            seedInfo = getSeedInfo();
            domains = req.body && Array.isArray(req.body.domains) ? req.body.domains : [];
            projectName = req.body && req.body.projectName;

            if (typeof projectName !== 'string' || !projectName.trim()) {
                throw new Error('body.projectName is required');
            }

            domains.forEach(function (domain) {
                if (seedInfo.domains.indexOf(domain) === -1) {
                    throw new Error('Selected domain [' + domain + '] not available in registry');
                }
            });
        } catch (err) {
            next(err);
            return;
        }

        getNewJWToken(userId)
            .then(function (newToken) {
                var kind = 'MDSS:' + domains.join(':');
                var seedProjectParameters = {
                    command: CONSTANTS.SERVER_WORKER_REQUESTS.SEED_PROJECT,
                    webgmeToken: newToken,
                    type: 'file',
                    seedName: 'mdd',
                    projectName: projectName.trim(),
                    branchName: 'master',
                    kind: kind
                };

                token = newToken;
                returnData.kind = kind;
                returnData.libraries = librariesForDomains(domains);
                logger.debug('Seeding', seedProjectParameters);
                return Q.ninvoke(swm, 'request', seedProjectParameters);
            })
            .then(function (result) {
                returnData.projectId = result.projectId;
                return addLibraries(swm, token, returnData.projectId, returnData.libraries)
                    .then(function () {
                        return result;
                    });
            })
            .then(function (result) {
                if (gmeAuth && gmeAuth.metadataStorage && returnData.projectId) {
                    return gmeAuth.metadataStorage.updateProjectInfo(returnData.projectId, {
                        kind: returnData.kind
                    }).then(function () {
                        return result;
                    }, function () {
                        return result;
                    });
                }
                return result;
            })
            .then(function () {
                res.json(returnData);
            })
            .catch(function (err) {
                logger.error(err);
                next(err);
            });
    });

    /**
     * body: { projectId: string, domains: string[] }
     * Stamps kind and adds any language libraries the domains require.
     */
    router.post('/updateProject', function (req, res, next) {
        var userId = getUserId(req);
        var projectId = req.body && req.body.projectId;
        var domains = req.body && Array.isArray(req.body.domains) ? req.body.domains : [];
        var seedInfo;
        var kind;
        var libraries;

        logger.debug('updateProject', req.body);

        try {
            if (typeof projectId !== 'string') {
                throw new Error('body.projectId is required');
            }
            seedInfo = getSeedInfo();
            domains.forEach(function (domain) {
                if (seedInfo.domains.indexOf(domain) === -1) {
                    throw new Error('Selected domain [' + domain + '] not available in registry');
                }
            });
            kind = 'MDSS:' + domains.join(':');
            libraries = librariesForDomains(domains);
        } catch (err) {
            next(err);
            return;
        }

        getNewJWToken(userId)
            .then(function (token) {
                return addLibraries(swm, token, projectId, libraries);
            })
            .then(function () {
                if (gmeAuth && gmeAuth.metadataStorage) {
                    return gmeAuth.metadataStorage.updateProjectInfo(projectId, { kind: kind });
                }
                return null;
            })
            .then(function () {
                res.json({
                    projectId: projectId,
                    kind: kind,
                    libraries: libraries,
                    librariesSynced: true
                });
            })
            .catch(function (err) {
                logger.error(err);
                next(err);
            });
    });
}

function start(callback) {
    callback();
}

function stop(callback) {
    callback();
}

module.exports = {
    initialize: initialize,
    router: router,
    start: start,
    stop: stop
};
