'use strict';

const sgMail = require('@sendgrid/mail');

const logger = require('app/logger');
const Validator = require('app/validator/base');


class EmailValidator extends Validator {
    constructor(config) {
        super(config);
    }

    async invoke(toAddr, text) {
        // TODO: customize msg
        let html = `<b>${this.config.callbackEndpoint}?token=${text}</b>`;
        sgMail.setApiKey(this.config.apiKey);
        const msg = {
            to: toAddr,
            from: this.config.username, // Use the email address or domain you verified above
            subject: this.config.subject,
            html: html
        };
        let resp = await sgMail.send(msg);
        logger.info(`Email sent, response: ${JSON.stringify(resp)}`);
    }
}

module.exports = EmailValidator;
