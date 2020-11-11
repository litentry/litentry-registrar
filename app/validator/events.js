'use strict';

// const logger = require('app/logger');

const EventEmitter = require('events').EventEmitter;
const Event = new EventEmitter();

// Event.on('handleTwitterVerification', (args) => {
//     logger.debug(`[ValidatorEvent] handle twitter verification: ${JSON.stringify(args)}.`);
// });

// Event.on('handleRiotVerification', (args) => {
//     logger.debug(`[ValidatorEvent] handle riot verification: ${JSON.stringify(args)}.`);
// });

module.exports = {
    ValidatorEvent: Event
};
