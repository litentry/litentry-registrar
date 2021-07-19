import _ from 'lodash';
import { EventEmitter } from 'events';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import { RequestJudgementCollection } from 'app/db';
import logger from 'app/logger';
import config from 'app/config';
import { ValidatorEvent } from 'app/validator/events';
import { throttle, generateNonce, sleep } from 'app/utils';
import Config from 'types/config';

const Event = new EventEmitter();

export enum JudgementType {
    Unknown = 'Unknown',
    FeePaid = 'FeePaid',
    Reasonable = 'Reasonable',
    KnownGood = 'KnownGood',
    OutOfDate = 'OutOfDate',
    LowQuality = 'LowQuality',
}

const Judgement: {
    [JudgementType.Unknown]: { [JudgementType.Unknown]: null };
    [JudgementType.FeePaid]: { [JudgementType.FeePaid]: null };
    [JudgementType.Reasonable]: { [JudgementType.Reasonable]: null };
    [JudgementType.KnownGood]: { [JudgementType.KnownGood]: null };
    [JudgementType.OutOfDate]: { [JudgementType.OutOfDate]: null };
    [JudgementType.LowQuality]: { [JudgementType.LowQuality]: null };
} = {
    [JudgementType.Unknown]: { [JudgementType.Unknown]: null },
    [JudgementType.FeePaid]: { [JudgementType.FeePaid]: null },
    [JudgementType.Reasonable]: { [JudgementType.Reasonable]: null },
    [JudgementType.KnownGood]: { [JudgementType.KnownGood]: null },
    [JudgementType.OutOfDate]: { [JudgementType.OutOfDate]: null },
    [JudgementType.LowQuality]: { [JudgementType.LowQuality]: null },
};

/**
 *
 * @property (Object) config - settings for 'chain' and 'litentry'
 * @property (*) myself - on behalf of our litentry platform
 * @property (*) unsubscribeEventlistener - a event listener to a connected chain
 * @property (*) keyring
 * @property (*) wsProvider - web socket for tha chain api
 * @property (*) api - APIs used to interact with chain
 */
class Chain {
    private readonly config: Config;

    private readonly wsProvider: WsProvider;

    private readonly keyring: Keyring;

    public api: ApiPromise;

    private firstConnected: boolean = false;

    private unsubscribeEventListener?: () => void;

    private myself: KeyringPair;

    /**
     * A wrapped APIs for block chain
     * @constructor
     */
    constructor(config: Config) {
        this.config = config;
        this.wsProvider = new WsProvider(
            `${this.config.chain.protocol}://${this.config.chain.provider}:${this.config.chain.port}`
        );
        this.keyring = new Keyring({ type: 'sr25519' });

        if (this.config.litentry.useProxy && _.isEmpty(this.config.litentry.primaryAccountId)) {
            throw new Error(`No primary account found in proxy mode.`);
        }
    }

    /**
     * Connect to a configured block chain, such as polkadot, westend or local chain.
     */
    async connect() {
        if (!this.myself) {
            await cryptoWaitReady();
            // defined only in production
            if (this.config.litentry.privateKey) {
                logger.debug('Use private key');
                this.myself = this.keyring.addFromUri(this.config.litentry.privateKey);
            } else {
                // defaultAccount is defined only in development & staging
                logger.debug(`Use default accounts: ${this.config.litentry.defaultAccount}`);
                this.myself = this.keyring.addFromUri(this.config.litentry.defaultAccount as string);
            }
        }

        this.api = await ApiPromise.create({
            provider: this.wsProvider,
            // NOTE: https://polkadot.js.org/docs/api/FAQ/#the-node-returns-a-could-not-convert-error-on-send
            types: {
                Address: 'MultiAddress',
                LookupSource: 'MultiAddress',
            },
        });
        return this.api;
    }

    /**
     * Start event listener
     */
    async eventListenerStart() {
        if (this.unsubscribeEventListener) {
            logger.debug('[EventListenerStart] Event listener is already running...');
            return;
        }

        await this.connect();

        logger.debug('[EventListenerStart] Starting event listener...');
        this.unsubscribeEventListener = await this.api.query.system.events((events) => {
            // Loop through the Vec<EventRecord>
            events.forEach((record) => {
                // Extract the phase, event and the event types
                const { event, phase } = record;
                const types = event.typeDef;
                logger.debug(`Received event from chain: [${event.section}.${event.method}]`);

                // Show what we are busy with
                const params: {
                    [key: string]: string;
                } = {};

                if (event.section === 'identity' && event.method === 'JudgementRequested') {
                    logger.info(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);

                    // Loop through each of the parameters, displaying the type and data
                    event.data.forEach((data, index) => {
                        logger.info(`\t\t\t${types[index].type}: ${data.toString()}`);
                        params[types[index].type] = data.toString();
                    });
                    // We only need to emit `handleRequestJudgement` event on our own registrar.
                    if (params['RegistrarIndex'] === this.config.litentry.regIndex.toString()) {
                        Event.emit('handleRequestJudgement', params['AccountId']);
                    } else {
                        logger.debug(
                            `Bypass request judgement to registrar #${params['RegistrarIndex']}, we aren't interested in it`
                        );
                    }
                }
                // NOTE: Identity.JugementUnrequested
                if (event.section === 'identity' && event.method === 'JudgementUnrequested') {
                    logger.info(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
                    // Loop through each of the parameters, displaying the type and data
                    event.data.forEach((data, index) => {
                        logger.info(`\t\t\t${types[index].type}: ${data.toString()}`);
                        params[types[index].type] = data.toString();
                    });
                    // We only need to emit `handleRequestJudgement` event on our own registrar.
                    if (params['RegistrarIndex'] === this.config.litentry.regIndex.toString()) {
                        Event.emit('handleUnRequestJudgement', params['AccountId']);
                    }
                }

                // NOTE: Identity.IdentityCleared
                if (event.section === 'identity' && event.method === 'IdentityCleared') {
                    logger.info(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
                    // Loop through each of the parameters, displaying the type and data
                    event.data.forEach((data, index) => {
                        logger.info(`\t\t\t${types[index].type}: ${data.toString()}`);
                        params[types[index].type] = data.toString();
                    });
                    // We only need to emit `handleRequestJudgement` event on our own registrar.
                    Event.emit('handleUnRequestJudgement', params['AccountId']);
                }
            });
        });
    }

    /**
     * Stop event listener
     */
    eventListenerStop() {
        logger.debug('[EventListenerStop] Stopping event listener...');
        if (this.unsubscribeEventListener) {
            this.unsubscribeEventListener();
        }
        this.unsubscribeEventListener = undefined;
    }

    /**
     * Restart event listener
     */
    async eventListenerRestart() {
        logger.debug('[EventListenerRestart] Restarting event listener...');
        this.eventListenerStop();
        await this.eventListenerStart();
    }

    /**
     * Auto Restart event listener
     */
    async eventListenerAutoRestart() {
        if (!this.firstConnected) {
            await this.eventListenerStart();
            this.firstConnected = true;
        }
        this.wsProvider.on('disconnected', async () => {
            logger.warn(`Disconnected from *${this.config.chain.provider}*, try to remedy automatically`);
            await this.eventListenerAutoRestart();
            await sleep(60);
        });

        this.wsProvider.on('error', async () => {
            logger.error(`Error occurs in chain *${this.config.chain.provider}*, try to remedy automatically`);
            await this.eventListenerAutoRestart();
            await sleep(120);
        });
    }

    /**
     * Provide judgement for a target user
     * @param {String} target - an hex string used to represented the target user
     * @param {String} judgement - judgement for a user, should be one of
     *                 ['Unknown', 'FeePaid', 'Reasonable', 'KnownGood', 'OutOfDate', 'LowQuality]
     */
    async provideJudgement(target: string, judgement: JudgementType) {
        await this.connect();

        const regIndex = this.config.litentry.regIndex;

        if (!_.keys(Judgement).includes(judgement)) {
            throw new Error(`Unknown judgement type: ${judgement}, should be one of [${_.keys(Judgement)}]`);
        }

        const judgement_ = Judgement[judgement];

        let transfer = this.api.tx.identity.provideJudgement(regIndex, target, judgement_);

        if (this.config.litentry.useProxy) {
            transfer = this.api.tx.proxy.proxy(this.config.litentry.primaryAccountId, 'IdentityJudgement', transfer);
        }

        const { nonce } = await this.api.query.system.account(this.myself.publicKey);
        const myself = this.myself;
        logger.debug(`Get nonce from system account: ${nonce}`);
        /* eslint-disable-next-line */
        return new Promise((resolve, reject) => {
            transfer.signAndSend(myself, { nonce }, ({ events = [], status }) => {
                console.log('Transaction status:', status.type);
                if (status.isInBlock) {
                    console.log('Included at block hash', status.asInBlock.toHex());
                    console.log('Events:');
                    let error = false;
                    const resp: {
                        blockHash: string;
                        events: string[][];
                    } = { blockHash: status.asInBlock.toHex(), events: [] };

                    events.forEach(({ event: { data, method, section }, phase }) => {
                        console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
                        resp['events'].push([`${section}.${method}`, data.toString()]);

                        if (data && data.length > 0) {
                            for (let d of data) {
                                if ((d.toJSON() as { asModule?: { error?: boolean } })?.asModule?.error) {
                                    error = true;
                                }
                            }
                        }
                    });
                    if (error) {
                        reject(resp);
                    } else {
                        resolve(resp);
                    }
                }
            });
        });
    }
}

const chain = new Chain(config);

const convert = (from: BufferEncoding, to: BufferEncoding) => (str: string) => Buffer.from(str, from).toString(to);

const hexToUtf8 = convert('hex', 'utf8');

async function handleRequestJudgement(accountID: string) {
    if (!accountID) {
        logger.error(`[Event] handleRequestJudgement receives empty accountID`);
        return;
    }
    logger.debug(`[Event] HandleRequestJudgement: ${accountID}`);
    let identity = await chain.api.query.identity.identityOf(accountID);
    try {
        const { info } = JSON.parse(identity.toString());
        logger.debug(`[Event] originalInfo: ${JSON.stringify(info)}`);

        const normalizedInfo: {
            account: string;
            display?: string;
            legal?: string;
            web?: string;
            riot?: string;
            email?: string;
            pgpFingerprint?: string;
            image?: string;
            twitter?: string;
            nonce?: string;
            _id?: string;
            // TODO: support pgp finger print and image
        } = {
            account: accountID,
        };

        if (info.display.raw && info.display.raw.startsWith('0x')) {
            normalizedInfo.display = hexToUtf8(info.display.raw.substring(2));
        }

        if (info.legal.raw && info.legal.raw.startsWith('0x')) {
            normalizedInfo.legal = hexToUtf8(info.legal.raw.substring(2));
        }

        if (info.web.raw && info.web.raw.startsWith('0x')) {
            normalizedInfo.web = hexToUtf8(info.web.raw.substring(2));
        }

        if (info.riot.raw && info.riot.raw.startsWith('0x')) {
            normalizedInfo.riot = hexToUtf8(info.riot.raw.substring(2));
        }

        if (info.email.raw && info.email.raw.startsWith('0x')) {
            normalizedInfo.email = hexToUtf8(info.email.raw.substring(2));
        }

        if (info.twitter.raw && info.twitter.raw.startsWith('0x')) {
            normalizedInfo.twitter = hexToUtf8(info.twitter.raw.substring(2));
            if (normalizedInfo.twitter.startsWith('@')) {
                normalizedInfo.twitter = normalizedInfo.twitter.substring(1);
            }
        }

        normalizedInfo.nonce = generateNonce();

        logger.debug(`[Event] normalizedInfo: ${JSON.stringify(normalizedInfo)}`);
        // Store this request into database
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        normalizedInfo['_id'] = insertedId;

        if (normalizedInfo.email) {
            ValidatorEvent.emit('handleEmailVerification', normalizedInfo);
        }
        if (normalizedInfo.riot) {
            ValidatorEvent.emit('handleRiotVerification', normalizedInfo);
        }
        if (normalizedInfo.twitter) {
            ValidatorEvent.emit('handleTwitterVerification', normalizedInfo);
        }
    } catch (error) {
        // TODO: record this event into database for further processing.
        logger.error(`Fail to handle judgement request for account ${accountID}, error ${JSON.stringify(error)}`);
        console.trace(error);
    }
}

/**
 * Event handler for requesting a judgement by clients
 * @param {String} accountID - the accountID to be judged by our platform
 */
Event.on('handleRequestJudgement', async (accountID) => {
    const func = throttle(`handlRequestJudgement:${accountID}`, handleRequestJudgement);
    return await func(accountID);
});

async function handleUnRequestJudgement(accountID: string) {
    try {
        logger.debug(`[Event] HandleUnRequestJudgement: ${accountID}`);
        return await RequestJudgementCollection.cancel(accountID);
    } catch (e) {
        logger.error(`[Event] HandleUnRequestJudgement: ${accountID}, maybe verified successfully.`);
        console.trace(e);
    }
}

/**
 * Event handler for cancel a request judgement
 * @param {String} accountID - the accountID to be cancelled by our platform
 */
Event.on('handleUnRequestJudgement', async (accountID: string) => {
    const func = throttle(`handleUnRequestJudgement:${accountID}`, handleUnRequestJudgement);
    return await func(accountID);
});

export default chain;
