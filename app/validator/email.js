const _ = require('lodash');
const fs = require('fs');
const sgMail = require('@sendgrid/mail');

const config = require('app/config');
const logger = require('app/logger');
const Validator = require('app/validator/base');
const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

const utils = require('app/utils');

const CHAIN_NAME = config.chain.name || '';

class EmailValidator extends Validator {
    constructor(config) {
        super(config);
        const templateString = fs.readFileSync(`${__dirname}/templates/email.tpl`, 'utf8');
        const templateEmailResultString = fs.readFileSync(
            `${__dirname}/templates/email-verification-result.tpl`,
            'utf8'
        );
        this.template = _.template(templateString);
        this.templateEmailResult = _.template(templateEmailResultString);
    }

    async invoke(info) {
        const toAddr = info.email;
        const token = utils.createJwtToken({
            nonce: info.nonce,
            _id: info._id,
            email: info.email,
            account: info.account,
        });
        const confirmationAddress = `${config.baseUrl}/verify-email?token=${token}`;
        const html = this.template({
            confirmationAddress: confirmationAddress,
            chainName: CHAIN_NAME,
            account: info.account,
        });
        sgMail.setApiKey(this.config.apiKey);

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

    async sendConfirmationMessage(email, account, content) {
        let _content = `has been ${content} at ${new Date().toISOString()}`;
        const html = this.templateEmailResult({ content: _content, chainName: CHAIN_NAME, account: account });
        sgMail.setApiKey(this.config.apiKey);

        const msg = {
            to: email,
            from: this.config.username, // Use the email address or domain you verified above
            subject: this.config.subject,
            html: html,
        };
        try {
            const resp = await sgMail.send(msg);
            logger.info(`Email sent, response: ${JSON.stringify(resp)}`);
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
