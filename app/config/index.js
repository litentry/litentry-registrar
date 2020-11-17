'use strict';

require('colors');
const logger = require('app/logger');

// Ensure the NODE_ENV is loaded from .env
delete process.env.NODE_ENV;
const result = require('dotenv').config({ debug: true });

if (result.error) {
    throw result.error;
}

logger.info(`Loading config for '${process.env.NODE_ENV}' environment`.green);

if (process.env.NODE_ENV === 'dev') {
    module.exports = require('app/config/dev');
} else if (process.env.NODE_ENV === 'staging') {
    module.exports = require('app/config/staging');
} else {
    // Invalid node enviroment type, crash this application
    throw Error('Not an invalid environment');
}
