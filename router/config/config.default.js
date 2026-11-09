'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Uncommon port for the router WebGME app
config.server.port = 3888;

validateConfig(config);
module.exports = config;
