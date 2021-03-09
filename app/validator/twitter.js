const _ = require('lodash');
const logger = require('app/logger');
const config = require('app/config');
const { TwitterClient } = require('twitter-api-client');

const Validator = require('app/validator/base');

const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

const utils = require('app/utils');
const CHAIN_NAME = config.chain.name || '';

class TwitterValidator extends Validator {
    constructor(config) {
        super(config);
        this._is_twitter_verified = undefined;
        this.client = new TwitterClient({
            apiKey: this.config.apiKey,
            apiSecret: this.config.apiKeySecret,
            accessToken: this.config.accessToken,
            accessTokenSecret: this.config.accessTokenSecret,
            disableCache: true,
            maxByteSize: 32000000,
            ttl: 360,
        });
    }

    async invoke(info) {
        const twitterAccount = info.twitter;
        const token = utils.createJwtToken({ nonce: info.nonce, _id: info._id });

        const link = `${this.config.callbackEndpoint}?token=${token}`;
        try {
            const resp = await this.sendCtaMessage(twitterAccount, link, info.account);
            logger.debug(`Send verification message to ${JSON.stringify(resp)} successfully.`);

            await RequestJudgementCollection.setTwitterVerifiedPendingById(info._id);
        } catch (error) {
            const errorData = JSON.parse(error.data);
            /* eslint-disable-next-line */
            if (errorData.hasOwnProperty('errors')) {
                for (let e of errorData.errors) {
                    if (e.code === 17) {
                        /// NOTE You cannot send messages to this user.
                        logger.warn(`${twitterAccount}: ${e.message}`);
                    } else if (e.code === 349) {
                        logger.warn(`${twitterAccount}: ${e.message}`);
                    } else {
                        logger.error(`Unexcepted errors occurs for ${twitterAccount}`);
                        console.trace(error);
                    }
                }
            }
        }
    }

    async sendCtaMessage(twitterAccount, content, account) {
        // NOTE:  CTA means call to action
        let resp = null;
        resp = await this.client.accountsAndUsers.usersLookup({ screen_name: twitterAccount });
        let userId = null;
        /// NOTE: at most *one* result
        if (! _.isEmpty(resp)) {
            userId = resp[0].id;
        }
        const msg = `Verification From Litentry Registrar\n\nThank you for using the Registrar service from Litentry. You have submitted an identity verification on ${CHAIN_NAME} network. And the account connected to this verification is \n\n${account}\n\nIf you have initiated this verification and are the account owner, please click the following button to finish the process. If not, you can safely ignore this message.`;

        const params = {
            event: {
                type: "message_create", message_create: {
                    target: {
                        recipient_id: userId
                    },
                    message_data: {
                        text: msg,
                        ctas: [
                            {
                                type: 'web_url',
                                label: 'Click me to verify your account',
                                url: content
                            },
                        ]
                    }
                }
            }
        };
        resp = await this.client.directMessages.eventsNew(params);
        return resp;
    }

    async sendMessage(twitterAccount, content) {
        // NOTE:  CTA means call to action
        let resp = null;
        resp = await this.client.accountsAndUsers.usersLookup({ screen_name: twitterAccount });
        let userId = null;
        /// NOTE: at most *one* result
        if (! _.isEmpty(resp)) {
            userId = resp[0].id;
        }

        const params = {
            event: {
                type: "message_create", message_create: {
                    target: {
                        recipient_id: userId
                    },
                    message_data: {
                        text: content,
                    }
                }
            }
        };
        resp = await this.client.directMessages.eventsNew(params);
        return resp;
    }
}


const validator = new TwitterValidator(config.twitterValidator);


ValidatorEvent.on('handleTwitterVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle twitter verification: ${JSON.stringify(info)}.`);
    await validator.invoke(info);
});

module.exports = validator;
