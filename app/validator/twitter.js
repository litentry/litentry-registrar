const _ = require('lodash');
const logger = require('app/logger');
const config = require('app/config');
const { TwitterClient } = require('twitter-api-client');

const Validator = require('app/validator/base');

const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

const utils = require('app/utils');

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

    async invoke(twitterAccount, token) {
        const link = `${this.config.callbackEndpoint}?token=${token}`;
        try {
            await this.sendMessage(twitterAccount, "Please click the following link to finish verification:");
            const resp = await this.sendMessage(twitterAccount, link);
            logger.debug(`Send verification message to ${JSON.stringify(resp)} successfully.`);
            return resp;
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

    async sendMessage(twitterAccount, content) {
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
                    message_data: { text: content }
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
    const token = utils.createJwtToken({ nonce: info.nonce, _id: info._id });
    await validator.invoke(info.twitter, token);
    await RequestJudgementCollection.setTwitterVerifiedPendingById(info._id);
});

module.exports = validator;
