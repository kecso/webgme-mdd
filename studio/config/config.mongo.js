'use strict';

/**
 * Optional Mongo-backed config: NODE_ENV=mongo npm start
 * (requires a running MongoDB at config.mongo.uri)
 */
var path = require('path'),
    config = require('./config.webgme');

config.client.appDir = path.join(__dirname, '..', 'public');
config.server.port = 3988;
config.plugin.allowServerExecution = true;

config.authentication.enable = false;
config.authentication.allowGuests = true;

config.storage.database.type = 'mongo';
config.mongo.uri = process.env.WEBGME_MONGO_URI || 'mongodb://127.0.0.1:27017/webgme_mdd_studio';

config.seedProjects.enable = true;
config.seedProjects.defaultProject = 'EmptyProject';

module.exports = config;
