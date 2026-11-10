'use strict';

var path = require('path'),
    config = require('./config.webgme');

// React SPA replaces classic WebGME chrome (webgme-dss pattern).
config.client.appDir = path.join(__dirname, '..', 'public');

config.server.port = 3988;

config.plugin.allowServerExecution = true;

// Local host defaults — tighten for shared deployments.
config.authentication.enable = false;
config.authentication.allowGuests = true;

// In-memory data layer (no MongoDB). Data is lost on process exit.
// For Mongo later: NODE_ENV=mongo npm start  (see config.mongo.js).
config.storage.database.type = 'memory';
config.authentication.gmeAuth.path = require.resolve(
    'webgme-engine/src/server/middleware/auth/memorygmeauth'
);

config.seedProjects.enable = true;
config.seedProjects.defaultProject = 'EmptyProject';

module.exports = config;
