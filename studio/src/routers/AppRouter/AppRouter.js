/*globals*/
/**
 * Serves the React SPA index.html for deep links under /p/:owner/:name
 * (and book preview). Mount point matches react-router paths — webgme-dss pattern.
 */
'use strict';

var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    ejs = require('ejs'),
    router = express.Router(),
    DIST_DIR = path.join(__dirname, '..', '..', '..', 'public');

function sendIndex(req, res, logger) {
    fs.readFile(path.join(DIST_DIR, 'index.html'), 'utf8', function (err, indexTemplate) {
        if (err) {
            logger.error(err);
            res.status(404).send(
                'MDSS client not built. Run `npm run build` in studio/ ' +
                '(expects public/index.html + public/app/).'
            );
            return;
        }
        res.contentType('text/html');
        res.send(ejs.render(indexTemplate, {
            mountedPath: req.header('X-Proxy-Mounted-Path') || ''
        }));
    });
}

function initialize(middlewareOpts) {
    var logger = middlewareOpts.logger.fork('AppRouter'),
        ensureAuthenticated = middlewareOpts.ensureAuthenticated;

    logger.debug('initializing ...');

    router.use('*', function (req, res, next) {
        res.setHeader('X-WebGME-Media-Type', 'webgme.v1');
        next();
    });

    router.use('*', ensureAuthenticated);

    router.get('/:owner/:name', function (req, res) {
        sendIndex(req, res, logger);
    });

    router.get('/:owner/:name/book', function (req, res) {
        sendIndex(req, res, logger);
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
