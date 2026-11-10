/*globals*/
/**
 * Markdown System Studio — webgme-engine standalone host (webgme-dss pattern).
 *
 * Default config uses in-memory storage + memorygmeauth (no MongoDB).
 * For Mongo: NODE_ENV=mongo npm start
 */
'use strict';

var gmeConfig = require('./config'),
    webgme = require('webgme-engine');

webgme.addToRequireJsPaths(gmeConfig);

var myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function () {
    var dbType = gmeConfig.storage && gmeConfig.storage.database &&
        gmeConfig.storage.database.type;
    console.info(
        'MDSS WebGME host listening on port ' + gmeConfig.server.port +
        ' (storage=' + (dbType || 'unknown') + ')'
    );
});
