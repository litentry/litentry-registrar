import _ from 'lodash';
import { EventsNewParams, TwitterClient, UsersLookup } from 'twitter-api-client';
import logger from 'app/logger';
import config from 'app/config';
import Validator from 'app/validator/base';
import { ValidatorEvent } from 'app/validator/events';
import { RequestJudgementCollection } from 'app/db';
import { createJwtToken } from 'app/utils';
import Config from 'types/config';

const CHAIN_NAME = config.chain.name || '';

class TwitterValidator extends Validator {
    private readonly client: TwitterClient;

    private readonly _is_twitter_verified = undefined;

    constructor(config: Config) {
        super(config);
        this.client = new TwitterClient({
            apiKey: this.config.twitterValidator.apiKey,
            apiSecret: this.config.twitterValidator.apiKeySecret,
            accessToken: this.config.twitterValidator.accessToken,
            accessTokenSecret: this.config.twitterValidator.accessTokenSecret,
            disableCache: true,
            maxByteSize: 32000000,
            ttl: 360,
        });
    }

    async invoke(info: { twitter: string; nonce: string; account: string; _id: string }) {
        const twitterAccount = info.twitter;
        const token = createJwtToken({ nonce: info.nonce, _id: info._id });

        const link = `${config.baseUrl}/verify-twitter-account?token=${token}`;
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

    async sendCtaMessage(twitterAccount: string, content: string, account: string) {
        // NOTE:  CTA means call to action
        const resp = await this.client.accountsAndUsers.usersLookup({ screen_name: twitterAccount });

        if (!resp.length) {
            throw new Error(`[sendCtaMessage] Twitter user: ${twitterAccount} not found`);
        }

        const text = `Verification From Litentry Registrar\n\nThank you for using the Registrar service from Litentry. You have submitted an identity verification on ${CHAIN_NAME} network. And the account connected to this verification is \n\n${account}\n\nIf you have initiated this verification and are the account owner, please click the following button to finish the process. If not, you can safely ignore this message.`;

        const params = {
            event: {
                type: 'message_create',
                message_create: {
                    target: {
                        /// NOTE: at most *one* result
                        recipient_id: resp[0].id_str,
                    },
                    message_data: {
                        text,
                        ctas: [
                            {
                                type: 'web_url',
                                label: 'Click me to verify your account',
                                url: content,
                            },
                        ],
                    },
                },
            },
        };
        const events = await this.client.directMessages.eventsNew(params);
        return events;
    }

    async sendMessage(twitterAccount: string, content: string) {
        // NOTE:  CTA means call to action
        const resp = await this.client.accountsAndUsers.usersLookup({ screen_name: twitterAccount });

        if (!resp.length) {
            throw new Error(`[sendMessage] Twitter user: ${twitterAccount} not found`);
        }

        let userId = null;
        if (!_.isEmpty(resp)) {
            userId = resp[0].id_str;
        }

        const params: EventsNewParams = {
            event: {
                type: 'message_create',
                message_create: {
                    target: {
                        /// NOTE: at most *one* result
                        recipient_id: resp[0].id_str,
                    },
                    message_data: {
                        text: content,
                    },
                },
            },
        };

        const events = await this.client.directMessages.eventsNew(params);
        return events;
    }
}

const validator = new TwitterValidator(config);

ValidatorEvent.on('handleTwitterVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle twitter verification: ${JSON.stringify(info)}.`);
    await validator.invoke(info);
});

export default validator;
