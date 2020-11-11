'use strict';

const _ = require('lodash');

const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const Keyring = require('@polkadot/api').Keyring;

const { Storage } = require('app/db');
const logger = require('app/logger');
const config = require('app/config');
const { ValidatorEvent } = require('app/validator/events');

const EventEmitter = require('events').EventEmitter;
const Event = new EventEmitter();

var Judgement = {
    FeePaid: {
        // value like: 100 DOT
        FeePaid: null
    },

    Unknown: { Unknown: null },
    Reasonable: { Reasonable: null },
    KnownGood: { KnownGood: null },
    OutOfDate: { OutOfDate: null },
    LowQuality: { LowQuality: null }
}


class Chain {
    /**
     * A wrapped APIs for block chain
     * @constructor
     *
     * @param (Object) config - settings for 'chain' and 'litentry'
     * @param (*) myself - on behalf of our litentry platform
     * @param (*) unsubscribeEventlistener - a event listener to a connected chain
     * @param (*) keyring
     * @param (*) wsProvider - web socket for tha chain api
     * @param (*) api - APIs used to interact with chain
     */
    constructor(config) {
        this.config = config;
        this.wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}:${config.chain.port}`);
        this.keyring = new Keyring({ type: 'sr25519' });
        this.myself = null;

        this.unsubscribeEventListener = null;
    }

    /**
     * Connect to a configured block chain, such as polkadot, westend or local chain.
     */
    async connect() {
        this.api = await ApiPromise.create({ provider: this.wsProvider });
        if (! this.myself) {
            if (config.litentry.privateKey) {
                logger.debug("Use private key");
                this.myself = this.keyring.addFromUri(config.litentry.privateKey);
            } else if (config.litentry.mnemonic) {
                logger.debug("Use mnemonic");
                this.myself = this.keyring.addFromUri(config.litentry.mnemonic);
            } else {
                logger.debug(`Use default accounts: ${config.litentry.defaultAccount}`);
                this.myself = this.keyring.addFromUri(config.litentry.defaultAccount);
            }
        }
        return this.api;
    }

    async sendTransaction(toAddr, amount) {
        await this.connect();
        const transfer = this.api.tx.balances.transfer(toAddr, amount);
        const hash = await transfer.signAndSend(this.myself);
        logger.info(`Transfer send with hash: ${hash.toHex()}`);
    }

    /**
     * @deprecated
     * @param {Object} info info is an object associated with user's identity. For example,
     * { display: 'test', email: 'test@example.com', riot: 'riot', twitter: 'twitter', web: 'http://test.com' }
     */
    async setIdentity(info) {
        await this.connect();
        // NOTE: we only support following fields at this moment.
        const validKeys = new Set(['email', 'twitter', 'riot', 'display', 'web']);
        const keys = _.keys(info);
        for (let key of keys) {
            if (! validKeys.has(key)) {
                throw Error(`Unexcepted identity info key: ${key}`);
            }
        }

        info = _.mapValues(info, function(elem) { return { Raw: elem }; });
        const transfer = await this.api.tx.identity.setIdentity(info);
        const hash = await transfer.signAndSend(this.myself);

        logger.info('SetIdentity, Transfer sent with hash', hash.toHex());
        return transfer;
    }

    async identityOf(accountID) {
        await this.connect();
        const resp = await this.api.query.identity.identifyOf(accountID);
        logger.debug(`Identity Of ${accountID}: ${resp.toString()}`);
        return resp.toString();
    }

    async blockWatcher() {
        const unsubscribeBlockerWatcher = await this.api.rpc.chain.subscribeNewHeads(async (header) => {
            console.log(`Chain is at block: #${header.number}`);
        });

        return unsubscribeBlockerWatcher;
    }

    /**
     * Start event listener
     */
    async eventListenerStart() {
        if (this.unsubscribeEventListener) {
            logger.debug("[EventListenerStart] Event listener is running now...");
            return this.unsubscribeEventListener;
        }

        logger.debug("[EventListenerStart] Starting event listener...");
        await this.connect();

        this.unsubscribeEventListener = this.api.query.system.events((events) => {
            // console.log(`\nReceived ${events.length} events:`);

            // Loop through the Vec<EventRecord>
            events.forEach((record) => {
                // Extract the phase, event and the event types
                const { event, phase } = record;
                const types = event.typeDef;

                // Show what we are busy with
                let accountID = null;
                if (event.section === 'identity' && event.method === 'IdentitySet') {
                    console.log(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
                    console.log(`\t\t${event.meta.documentation.toString()}`);

                    // Loop through each of the parameters, displaying the type and data
                    event.data.forEach((data, index) => {
                        console.log(`\t\t\t${types[index].type}: ${data.toString()}`);
                        accountID = data.toString();
                    });

                    Event.emit('handleRequestJudgement', accountID);
                }
            });
        });

        return this.unsubscribeEventListener;
    }

    /**
     * Stop event listener
     */
    async eventListenerStop() {
        logger.debug("[EventListenerStop] Stopping event listener...");
        if (this.unsubscribeEventListener) {
            this.unsubscribeEventListener();
        }
        this.unsubscribeEventListener = null;
    }

    /**
     * Restart event listener
     */
    async eventListenerRestart() {
        logger.debug("[EventListenerRestart] Restarting event listener...");
        this.eventListenerStop();
        this.eventListenerStart();
    }

    /**
     * Provide judgement for a target user
     * @param {String} target - an hex string used to represented the target user
     * @param {String} judgement - judgement for a user, should be one o
     *                 ['Unknown', 'FeePaid', 'Reasonable', 'KnownGood', 'OutOfDate', 'LowQuality]
     */
    async provideJudgement(target, judgement, fee=null) {
        await this.connect();

        const regIndex = this.config.litentry.regIndex;

        if (! _.keys(Judgement).includes(judgement)) {
            throw new Error(`Unknown judgement type: ${judgement}, should be one of [${_.keys(Judgement)}]`);
        }

        let judgement_ = Judgement[judgement];

        if (judgement == 'FeePaid') {
            if (fee) {
                judgement_['FeePaid'] = fee;
            } else {
                throw new Error(`Judgement.FeePaid must be a valid integer.`);
            }
        }

        const transfer = await this.api.tx.identity.provideJudgement(regIndex, target, judgement_);

        const { nonce } = await this.api.query.system.account(this.myself.publicKey);
        const myself = this.myself;
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

    async queryBlockByBlockHash(blockHash) {
        await this.connect();

        const block = await this.api.rpc.chain.getBlock(blockHash);
        return block;
    }
}

const chain = new Chain(config);

const convert = (from, to) => str => Buffer.from(str, from).toString(to)
const hexToUtf8 = convert('hex', 'utf8');

/**
 * Event handler for requesting a judgement by clients
 * @param {String} accountID - the accountID to be judged by our platform
 */
Event.on('handleRequestJudgement', async (accountID) => {
    if (! accountID) {
        return ;
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

        // if (info.pgpFingerprint) {
        //     normalizedInfo.pgpFingerprint = hexToUtf8(info.pgpFingerprint.substring(2))
        // } else {
        //     normalizedInfo.pgpFingerprint = null;
        // }
        // TODO: support pgp finger print
        normalizedInfo.pgpFingerprint = null;

        // if (info.image.Raw && info.image.Raw.startsWith('0x')) {
        //     normalizedInfo.image = hexToUtf8(info.image.Raw.substring(2));
        // } else {
        //     normalizedInfo.image = null;
        // }
        normalizedInfo.image = null;

        if (info.twitter.Raw && info.twitter.Raw.startsWith('0x')) {
            normalizedInfo.twitter = hexToUtf8(info.twitter.Raw.substring(2));
        } else {
            normalizedInfo.twitter = null;
        }


        logger.debug(`[Event] normalizedInfo: ${JSON.stringify(normalizedInfo)}`);
        // Store this request into database
        await Storage.insert('requestJudgement', normalizedInfo);

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

});


module.exports = chain;
