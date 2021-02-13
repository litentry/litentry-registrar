'use strict';

// set env to dev
process.env.NODE_ENV = 'dev';

const config = require('app/config');
const TwitterValidator = require('app/validator/twitter');

const twitterVal = new TwitterValidator(config.twitterValidator);
const testAccount = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const testTwitterName = 'Han_Zhao_';

twitterVal.invoke(testTwitterName, testAccount);
