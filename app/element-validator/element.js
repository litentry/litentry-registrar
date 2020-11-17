'use strict';

// const config = require('app/config');
const config = require('./dev_element_config');
const logger = require('app/logger');
const Validator = require('app/validator/base');
const { ValidatorEvent } = require('app/validator/events');
// const { RequestJudgementCollection } = require('app/db');

// const utils = require('app/utils');

const elementUtils = require('./element_utils');

class ElementValidator {
    
    constructor(config) {
        super(config);
    }

    async invoke(targetUser, targetWalletAddr) {
        elementUtils.startCheckingTargetMessage(targetUser, targetWalletAddr);
    }
}

const validator = new ElementValidator(config);


ValidatorEvent.on('handleRiotVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle riot/element verification: ${JSON.stringify(info)}.`);
    // const targetWalletAddress = '';
    // await validator.invoke(info.riot, );
});

module.exports = validator;
