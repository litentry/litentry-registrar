'use strict';

require('colors');
const logger = require('app/logger');

logger.info(`Loading config for '${process.env.NODE_ENV}' environment`.green);

if (process.env.NODE_ENV === 'development') {
    module.exports = require('app/config/development');
} else if (process.env.NODE_ENV === 'staging') {
    module.exports = require('app/config/staging');
} else if (process.env.NODE_ENV === 'production') {
    module.exports = require('app/config/production');
} else {
    // Invalid node enviroment type, crash this application
    throw Error('Not an invalid environment');
}
