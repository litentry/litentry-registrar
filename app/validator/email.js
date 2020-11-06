'use strict';

const _ = require('lodash');
const fs = require('fs');
const sgMail = require('@sendgrid/mail');

const logger = require('app/logger');
const Validator = require('app/validator/base');


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
            html: html
        };
        let resp = await sgMail.send(msg);
        logger.info(`Email sent, response: ${JSON.stringify(resp)}`);
    }
}

module.exports = EmailValidator;
