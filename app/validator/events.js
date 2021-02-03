'use strict';

const EventEmitter = require('events').EventEmitter;


/**
 * @description {Event} - singleton pattern for events dispatching
 */
const Event = new EventEmitter();

module.exports = {
    ValidatorEvent: Event,
};
