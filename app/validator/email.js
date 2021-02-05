'use strict';

const _ = require('lodash');
const fs = require('fs');
const sgMail = require('@sendgrid/mail');

const config = require('app/config');
const logger = require('app/logger');
const Validator = require('app/validator/base');
const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

const utils = require('app/utils');

class EmailValidator extends Validator {
    constructor(config) {
        super(config);
        const templateString = fs.readFileSync(`${__dirname}/templates/email.tpl`, 'utf8');
        this.template = _.template(templateString);
    }

    async invoke(toAddr, text) {
        const confirmationAddress = `${this.config.callbackEndpoint}?token=${text}`;
        const html = this.template({ confirmationAddress: confirmationAddress });
        sgMail.setApiKey(this.config.apiKey);

        const msg = {
            to: toAddr,
            from: this.config.username, // Use the email address or domain you verified above
            subject: this.config.subject,
            html: html,
        };
        let resp = await sgMail.send(msg);
        logger.info(`Email sent, response: ${JSON.stringify(resp)}`);
    }
}

const validator = new EmailValidator(config.emailValidator);

ValidatorEvent.on('handleEmailVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle email verification: ${JSON.stringify(info)}.`);
    const token = utils.createJwtToken({ nonce: info.nonce, _id: info._id });
    await validator.invoke(info.email, token);
    await RequestJudgementCollection.setEmailVerifiedPendingById(info._id);
});

module.exports = validator;
