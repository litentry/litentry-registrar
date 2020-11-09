'use strict';

const _ = require('lodash');
const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const Keyring = require('@polkadot/api').Keyring;


const logger = require('app/logger');
const config = require('app/config');


class Chain {
    constructor(config) {
        this.config = config;
        this.wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}`);
        this.keyring = new Keyring({ type: 'sr25519' });
        this.myself = null;
    }

    async connect() {
        this.api = await ApiPromise.create({ provider: this.wsProvider });
        if (! this.myself) {
            if (config.litentry.privateKey) {
                logger.debug("Use private key");
                this.myself = this.keyring.addFromUri(config.litentry.privateKey);
            } else if (config.litentry.mnemonic) {
                logger.debug("Use mnemonic");
                this.myself = this.keyring.addFromUri(config.litentry.mnemonic);
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
        logger.debug("Identity Of: ");
        console.log(resp);
        return resp;
    }

    async watch() {
        await this.connect();
        // const unsubscribe = await this.api.rpc.chain.subscribeNewHeads(async (header) => {
        //     console.log(`Chain is at block: #${header.number}`);
        //     console.log(`Chain registry: `);
        //     console.log(header.registry);
        //     console.log(`Chain digest: ${header.digest}`);

        //     // const resp = await this.api.rpc.chain.getBlock(header.digest);
        //     // console.log(resp);

        //     console.log("================================================================================");
        // });
        // let hash = '0x82757579064efb7a26f5a6e5adf0d77cd125d64bd1003b9c61b35ffa714cd8bc';
        // let number = 4803302;
        // let hash = await this.api.rpc.chain.getBlockHash(number);
        // console.log("---------------------------------------- HASH ----------------------------------------");
        // // console.log(hash);

        // let block = await this.api.rpc.chain.getBlock(hash);
        // console.log('-------------------- Block --------------------');
        // // console.log(block.block.number);

        // // console.log(block.justification);


        // // console.log(block.block);
        // console.log(block.block.header.extrinsics);
        // console.log(block.registry);
        // console.log(block.justification);
        // console.log(_.keys(block.block));
        let accountID = '5DocVH1PVK8ABYjGKnLQBopsUBNgDpXEuKx6tYGgKNRfn3ak';
        let resp = null;
        // let resp = await this.api.query.system.account(accountID);
        // console.log(resp);
        // console.log(resp.data);
        // console.log(new String(resp.data.free));
        // console.log(new String(resp.data.reserved));
        // console.log(new String(resp.nonce));
        // console.log(_.keys(resp.registry));

        // console.log(_.keys(resp.registry));
        resp = await this.api.query.identity.identityOf(accountID);
        console.log("--------------------------------------------------------------------------------");
        console.log(resp.registry);
        // resp = await this.api.query.identity.registrars();
        // console.log("--------------------------------------------------------------------------------");
        // console.log(resp);
        // console.log('================================================================================');
    }
}


module.exports = new Chain(config);
