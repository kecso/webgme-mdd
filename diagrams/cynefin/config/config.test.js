'use strict';

var config = require('./config.default'),
    validateConfig = require('webgme/config/validator');

config.server.port = 4962;
config.mongo.uri = config.mongo.uri + '_test';

validateConfig(config);
module.exports = config;
