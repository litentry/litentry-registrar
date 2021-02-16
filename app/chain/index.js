const _ = require('lodash');

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');

const { RequestJudgementCollection } = require('app/db');
const logger = require('app/logger');
const config = require('app/config');
const { ValidatorEvent } = require('app/validator/events');
const { throttle, generateNonce, sleep } = require('app/utils');

const EventEmitter = require('events').EventEmitter;
const Event = new EventEmitter();


const Judgement = {
    Unknown: { Unknown: null },
    Reasonable: { Reasonable: null },
    KnownGood: { KnownGood: null },
    OutOfDate: { OutOfDate: null },
    LowQuality: { LowQuality: null },
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
    /**
     * A wrapped APIs for block chain
     * @constructor
     */
    constructor(config) {
        this.config = config;
        this.wsProvider = new WsProvider(`${this.config.chain.protocol}://${this.config.chain.provider}:${this.config.chain.port}`);
        this.keyring = new Keyring({ type: 'sr25519' });
        this.myself = null;

        this.unsubscribeEventListener = null;
        this.firstConnected = false;
    }

    /**
     * Connect to a configured block chain, such as polkadot, westend or local chain.
     */
    async connect() {
        if (!this.myself) {
            await cryptoWaitReady();
            if (this.config.litentry.privateKey) {
                logger.debug('Use private key');
                this.myself = this.keyring.addFromUri(this.config.litentry.privateKey);
            } else if (this.config.litentry.mnemonic) {
                logger.debug('Use mnemonic');
                this.myself = this.keyring.addFromUri(this.config.litentry.mnemonic);
            } else {
                logger.debug(`Use default accounts: ${this.config.litentry.defaultAccount}`);
                this.myself = this.keyring.addFromUri(this.config.litentry.defaultAccount);
            }
        }

        this.api = await ApiPromise.create({
            provider: this.wsProvider,
            // NOTE: https://polkadot.js.org/docs/api/FAQ/#the-node-returns-a-could-not-convert-error-on-send
            types: {
                Address: "MultiAddress",
                LookupSource: "MultiAddress"
            },
        });
        return this.api;
    }

    /**
     * Start event listener
     */
    async eventListenerStart() {
        if (this.unsubscribeEventListener) {
            logger.debug('[EventListenerStart] Event listener is running now...');
            return this.unsubscribeEventListener;
        }

        await this.connect();

        logger.debug('[EventListenerStart] Starting event listener...');
        this.unsubscribeEventListener = this.api.query.system.events((events) => {
            // Loop through the Vec<EventRecord>
            events.forEach((record) => {
                // Extract the phase, event and the event types
                const { event, phase } = record;
                const types = event.typeDef;
                logger.debug(`Received event from chain: [${event.section}.${event.method}]`);

                // Show what we are busy with
                let params = {};
                if (event.section === 'identity' && event.method === 'JudgementRequested') {
                    logger.info(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
                    logger.info(`\t\t${event.meta.documentation.toString()}`);

                    // Loop through each of the parameters, displaying the type and data
                    event.data.forEach((data, index) => {
                        logger.info(`\t\t\t${types[index].type}: ${data.toString()}`);
                        params[types[index].type] = data.toString();
                    });
                    // We only need to emit `handleRequestJudgement` event on our own registrar.
                    // NOTE: use `==` instead of `===` in the following code
                    if (params['RegistrarIndex'] == this.config.litentry.regIndex) {
                        Event.emit('handleRequestJudgement', params['AccountId']);
                    } else {
                        logger.debug(`Bypass request judgement to registrar #${params['RegistrarIndex']}, we aren't interested in it`);
                    }
                }
                if (event.section === 'identity' && event.method === 'JudgementUnrequested') {
                    logger.info(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
                    logger.info(`\t\t${event.meta.documentation.toString()}`);

                    // Loop through each of the parameters, displaying the type and data
                    event.data.forEach((data, index) => {
                        logger.info(`\t\t\t${types[index].type}: ${data.toString()}`);
                        params[types[index].type] = data.toString();
                    });
                    // We only need to emit `handleRequestJudgement` event on our own registrar.
                    if (params['RegistrarIndex'] == this.config.litentry.regIndex) {
                        Event.emit('handleUnRequestJudgement', params['AccountId']);
                    }
                }
            });
        });

        return this.unsubscribeEventListener;
    }

    /**
     * Stop event listener
     */
    async eventListenerStop() {
        logger.debug('[EventListenerStop] Stopping event listener...');
        if (this.unsubscribeEventListener) {
            this.unsubscribeEventListener();
        }
        this.unsubscribeEventListener = null;
    }

    /**
     * Restart event listener
     */
    async eventListenerRestart() {
        logger.debug('[EventListenerRestart] Restarting event listener...');
        await this.eventListenerStop();
        await this.eventListenerStart();
    }

    /**
     * Auto Restart event listener
     */
    async eventListenerAutoRestart() {
        if (! this.firstConnected) {
            await this.eventListenerStart();
            this.firstConnected = true;
        }
        this.wsProvider.on('disconnected', async () => {
            logger.warnr(`Disconnected from *${this.config.chain.provider}*, try to remedy automatically`);
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
    async provideJudgement(target, judgement) {
        await this.connect();

        const regIndex = this.config.litentry.regIndex;

        if (!_.keys(Judgement).includes(judgement)) {
            throw new Error(`Unknown judgement type: ${judgement}, should be one of [${_.keys(Judgement)}]`);
        }

        const judgement_ = Judgement[judgement];
        const transfer = this.api.tx.identity.provideJudgement(regIndex, target, judgement_);

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

                    let resp = { blockHash: status.asInBlock.toHex(), events: [] };

                    events.forEach(({ event: { data, method, section }, phase }) => {
                        console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
                        resp['events'].push(`${phase.toString()}: ${section}.${method}, ${data.toString()}`);
                    });
                    resolve(resp);
                }
            });
        });
    }
}

const chain = new Chain(config);

const convert = (from, to) => (str) => Buffer.from(str, from).toString(to);
const hexToUtf8 = convert('hex', 'utf8');

async function handleRequestJudgement(accountID) {
    if (!accountID) {
        logger.error(`[Event] handleRequestJudgement receives empty accountID`);
        return;
    }
    logger.debug(`[Event] HandleRequestJudgement: ${accountID}`);
    let identity = await chain.api.query.identity.identityOf(accountID);
    try {
        const { info } = JSON.parse(identity.toString());
        logger.debug(`[Event] originalInfo: ${JSON.stringify(info)}`);

        let normalizedInfo = { account: accountID };

        if (info.display.Raw && info.display.Raw.startsWith('0x')) {
            normalizedInfo.display = hexToUtf8(info.display.Raw.substring(2));
        } else {
            normalizedInfo.display = null;
        }

        if (info.legal.Raw && info.legal.Raw.startsWith('0x')) {
            normalizedInfo.legal = hexToUtf8(info.legal.Raw.substring(2));
        } else {
            normalizedInfo.legal = null;
        }

        if (info.web.Raw && info.web.Raw.startsWith('0x')) {
            normalizedInfo.web = hexToUtf8(info.web.Raw.substring(2));
        } else {
            normalizedInfo.web = null;
        }

        if (info.riot.Raw && info.riot.Raw.startsWith('0x')) {
            normalizedInfo.riot = hexToUtf8(info.riot.Raw.substring(2));
        } else {
            normalizedInfo.riot = null;
        }

        if (info.email.Raw && info.email.Raw.startsWith('0x')) {
            normalizedInfo.email = hexToUtf8(info.email.Raw.substring(2));
        } else {
            normalizedInfo.email = null;
        }

        // TODO: support pgp finger print and image
        normalizedInfo.pgpFingerprint = null;
        normalizedInfo.image = null;

        if (info.twitter.Raw && info.twitter.Raw.startsWith('0x')) {
            normalizedInfo.twitter = hexToUtf8(info.twitter.Raw.substring(2));
            if (normalizedInfo.twitter.startsWith('@')) {
                normalizedInfo.twitter = normalizedInfo.twitter.substring(1);
            }
        } else {
            normalizedInfo.twitter = null;
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

async function handleUnRequestJudgement(accountID) {
    logger.debug(`[Event] HandleUnRequestJudgement: ${accountID}`);
    return await RequestJudgementCollection.cancel(accountID);
}

/**
 * Event handler for cancel a request judgement
 * @param {String} accountID - the accountID to be cancelled by our platform
 */
Event.on('handleUnRequestJudgement', async (accountID) => {
    const func = throttle(`handleUnRequestJudgement:${accountID}`, handleUnRequestJudgement);
    return await func(accountID);
});

module.exports = chain;
