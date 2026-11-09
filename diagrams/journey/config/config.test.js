'use strict';

var config = require('./config.default'),
    validateConfig = require('webgme/config/validator');

config.server.port = 5268;
config.mongo.uri = config.mongo.uri + '_test';

validateConfig(config);
module.exports = config;
