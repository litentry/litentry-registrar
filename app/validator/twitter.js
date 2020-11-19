'use strict';

const _ = require('lodash');
const logger = require('app/logger');
const config = require('app/config');
const TwitterApi = require('twitter');
const Validator = require('app/validator/base');

const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

class TwitterValidator extends Validator {
    constructor(config, requestJudgementCollection) {
        super(config);
        this._is_twitter_verified = undefined;
        this._db_obj = requestJudgementCollection;
    }

    async invoke(userName, walletAddr) {
        const client = new TwitterApi({
            consumer_key: this.config.consumerKey,
            consumer_secret: this.config.consumerSecret,
            access_token_key: this.config.tokenKey,
            access_token_secret: this.config.tokenSecret,
        });

        logger.debug('Twitter verification task starts running ...');
        // Save context of current function
        const self = this;
        const caller = setInterval(async () => {
            const resp = await self._poll(client, userName, walletAddr);
            if (resp) {
                logger.debug(
                    `Twitter verification for user ${userName}, account ${walletAddr} passed, clear interval...`
                );
                // TODO Manipulate database, the following code may result in bugs
                await RequestJudgementCollection.setTwitterVerificationSuccess(walletAddr, userName);
                clearInterval(caller);
            } else {
                logger.debug(`Retry polling twitter message for user ${userName}, account ${walletAddr}...`);
            }
        }, this.config.pollingInterval);

        setTimeout(async () => {
            // NOTE: We must clear the interval first, otherwise, may occur bugs accidentally.
            clearInterval(caller);

            logger.debug('Twitter polling reached time out, clear interval...');
            // Manipulate database, the following code may result in bugs
            // await requestJudgementCollection.setTwitterVerificationFailed(walletAddr, userName)
        }, this.config.maxPollingTime);
    }

    _poll(client, userName, walletAddr) {
        const params = { screen_name: userName };
        const limit = 40;
        return new Promise((resolve, reject) => {
            client.get('users/lookup.json', params, (error, msgs) => {
                if (error || _.isEmpty(msgs)) {
                    reject(new Error('Invalid twitter screen name!'));
                }
                const userId = msgs[0].id_str;
                client.get('direct_messages/events/list', { count: limit }, (error, msgs) => {
                    if (error || _.isEmpty(userId)) {
                        reject(new Error('Cannot find the DM from this user'));
                    }
                    const found = msgs.events.find(
                        (event) =>
                            event.message_create.sender_id === userId &&
                            walletAddr === event.message_create.message_data.text
                    );
                    // Return `undefined` or `Object`
                    resolve(found);
                });
            });
        });
    }
}

const validator = new TwitterValidator(config.twitterValidater, RequestJudgementCollection);

ValidatorEvent.on('handleTwitterVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle twitter verification: ${JSON.stringify(info)}.`);
    await validator.invoke(info.twitter, info.account);
    logger.debug('Twitter verification task starts running ...');
});

module.exports = TwitterValidator;
