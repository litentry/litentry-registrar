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

    async invoke(info) {
        const token = utils.createJwtToken({ nonce: info.nonce, _id: info._id });
        const confirmationAddress = `${this.config.callbackEndpoint}?token=${token}`;
        const html = this.template({ confirmationAddress: confirmationAddress });
        sgMail.setApiKey(this.config.apiKey);

        const toAddr = info.email;
        const msg = {
            to: toAddr,
            from: this.config.username, // Use the email address or domain you verified above
            subject: this.config.subject,
            html: html,
        };
        try {
            const resp = await sgMail.send(msg);
            logger.info(`Email sent, response: ${JSON.stringify(resp)}`);
            await RequestJudgementCollection.setEmailVerifiedPendingById(info._id);
        } catch (error) {
            console.log(`Unexcepted error occurs: `);
            console.trace(error);
        }
    }
}

const validator = new EmailValidator(config.emailValidator);

ValidatorEvent.on('handleEmailVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle email verification: ${JSON.stringify(info)}.`);
    await validator.invoke(info);
});

module.exports = validator;
