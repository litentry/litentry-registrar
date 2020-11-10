'use strict';

const config = require('app/config');

const EmailValidator = require('app/validator/email');
const TwitterValidator = require('app/validator/email');


module.exports = {
    EmailValidator: new EmailValidator(config.emailValidator),
    TwitterValidator: new TwitterValidator()
};
