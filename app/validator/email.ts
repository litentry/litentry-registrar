import Config from 'types/config';

import _ from 'lodash';
import fs from 'fs';
import sgMail from '@sendgrid/mail';

import config from 'app/config';
import logger from 'app/logger';
import Validator from 'app/validator/base';
import { ValidatorEvent } from 'app/validator/events';
import { RequestJudgementCollection } from 'app/db';
import { createJwtToken } from 'app/utils';

const CHAIN_NAME = config.chain.name || '';

class EmailValidator extends Validator {
  private readonly template: _.TemplateExecutor;

  private readonly templateEmailResult: _.TemplateExecutor;

  constructor(config: Config) {
    super(config);
    const templateString = fs.readFileSync(`${__dirname}/templates/email.tpl`, 'utf8');
    const templateEmailResultString = fs.readFileSync(`${__dirname}/templates/email-verification-result.tpl`, 'utf8');
    this.template = _.template(templateString);
    this.templateEmailResult = _.template(templateEmailResultString);
  }

  async invoke(info: { nonce: string; _id: string; email: string; account: string }) {
    const toAddr = info.email;
    const token = createJwtToken({
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
    sgMail.setApiKey(this.config.emailValidator.apiKey);

    const msg = {
      to: toAddr,
      from: this.config.emailValidator.username, // Use the email address or domain you verified above
      subject: this.config.emailValidator.subject,
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

  async sendConfirmationMessage(email: string, account: string, content: string) {
    let _content = `has been ${content} at ${new Date().toISOString()}`;
    const html = this.templateEmailResult({ content: _content, chainName: CHAIN_NAME, account: account });
    sgMail.setApiKey(this.config.emailValidator.apiKey);

    const msg = {
      to: email,
      from: this.config.emailValidator.username, // Use the email address or domain you verified above
      subject: this.config.emailValidator.subject,
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

const validator = new EmailValidator(config);

ValidatorEvent.on('handleEmailVerification', async (info) => {
  logger.debug(`[ValidatorEvent] handle email verification: ${JSON.stringify(info)}.`);
  await validator.invoke(info);
});

export default validator;
