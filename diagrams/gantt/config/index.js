/*jshint node: true*/
var env = process.env.NODE_ENV || 'default',
    configFilename = __dirname + '/config.' + env + '.js',
    config = require(configFilename),
    validateConfig = require('webgme/config/validator'),
    overrideFromEnv = require('webgme/config/overridefromenv');

overrideFromEnv(config);
validateConfig(config);
module.exports = config;
