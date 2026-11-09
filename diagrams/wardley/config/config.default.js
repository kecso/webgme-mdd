'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Uncommon port to avoid collisions in cloud/dev environments
config.server.port = 3920;

validateConfig(config);
module.exports = config;
