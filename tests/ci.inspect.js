delete process.env.NODE_ENV;
const result = require('dotenv').config({ debug: true });
if (result.error) {
    throw result.error;
}

/**
 * See @href https://wiki.polkadot.network/docs/en/learn-identity
 */
const _ = require('lodash');

const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const Keyring = require('@polkadot/api').Keyring;
const config = require('../app/config');
const { RequestJudgementCollection } = require('../app/db');

// DEFUALT FEE is 1 Unit
const DEFAULT_REGISTRAR_FEE = 1000000000000;
const DEFAULT_SLEEP_INTERVAL = 6;

function sleep(seconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
    });
}

var self = undefined;
class Chain {
    /**
     * A wrapped APIs for block chain
     * @constructor
     */
    constructor(config) {
        if (!self) {
            self = this;
        } else {
            throw new Error(`Only one chain instance allowed`);
        }

        self.config = config;
        self.wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}:${config.chain.port}`);
        self.keyring = new Keyring({ type: 'sr25519' });

        self.unsubscribeEventListener = null;
    }

    /**
     * Connect to a configured block chain, such as polkadot, westend or local chain.
     */
    async connect() {
        const _alice = '//Alice';
        const _bob = '//Bob';
        const _charlie = '//Charlie';
        const _dave = '//Dave';
        if (!self.api) {
            self.api = await ApiPromise.create({
                provider: self.wsProvider,
                types: {
                    Address: 'MultiAddress',
                    LookupSource: 'MultiAddress',
                },
            });
        }
        if (!self.myself) {
            self.myself = self.keyring.addFromUri(_alice);
            self.alice = self.keyring.addFromUri(_alice);
            self.bob = self.keyring.addFromUri(_bob);
            self.charlie = self.keyring.addFromUri(_charlie);
            self.dave = self.keyring.addFromUri(_dave);
        }
        return self.api;
    }
    async signAndSend(tx, account) {
        try {
            const block = await tx.signAndSend(account);
            return block;
        } catch (error) {
            console.log(`Error occurs:`);
            console.trace(error);
        }
        return null;
    }
    /**
     * identity
     */
    async identitySetIdentity(account, info) {
        await self.connect();
        info = _.mapValues(info, function (elem) {
            return { Raw: elem };
        });
        const tx = self.api.tx.identity.setIdentity(info);
        await self.signAndSend(tx, account);
        console.log(`[identity.setIdentity]: ${tx}`);
        return tx;
    }

    async identityRequestJudgement(account, regIndex = 0, fee = DEFAULT_REGISTRAR_FEE) {
        const tx = self.api.tx.identity.requestJudgement(regIndex, fee);
        const resp = await self.signAndSend(tx, account);
        console.log(`[identity.RequestJudgement]: ${tx}`);
        console.log(`[identity.RequestJudgement]: ${resp}`);
        return [tx, resp];
    }

    async identityCancel(account, regIndex = 0) {
        const tx = self.api.tx.identity.cancelRequest(regIndex);
        const resp = await self.signAndSend(tx, account);
        console.log(`[identity.cancelRequest]: ${tx}`);
        console.log(`[identity.cancelRequest] resp: ${resp}`);
        return [tx, resp];
    }
    async disconnect() {
        console.log(`Disconnect from chain`);
        await self.api.disconnect();
    }

    /**
     * CI test
     */
    async ciTest() {
        await this.connect();
        // 1. Setup alice's identity info
        // 2. Request a judgement
        // 3. Verify related information, including email, twitter, riot
        // 4. Provide a judgement automatically

        try {
            await self.identityCancel(self.alice);
        } catch (e) {
            console.log(e);
        }
        const info = { display: 'Alice', email: 'no-reply@litentry.com', riot: '@litentry-bot:matrix.org' };

        await RequestJudgementCollection.db.connect();
        await RequestJudgementCollection.db.database.collection('requestJudgement').deleteMany(info);

        let [queriedObject] = await RequestJudgementCollection.query(info);
        console.log('queriedObject: ');
        console.log(queriedObject);

        await self.identitySetIdentity(self.alice, info);
        await sleep(DEFAULT_SLEEP_INTERVAL);
        await self.identityRequestJudgement(self.alice);
        await sleep(90);
        [queriedObject] = await RequestJudgementCollection.query(info);

        console.log('queriedObject: ');
        console.log(queriedObject);

        if (_.isEmpty(queriedObject)) {
            console.log('-------------------- CI Failed --------------------');
            process.exit(1);
        }

        await RequestJudgementCollection.setEmailVerifiedSuccessById(queriedObject._id);
        await RequestJudgementCollection.setRiotVerifiedSuccessById(queriedObject._id);
        await RequestJudgementCollection.setTwitterVerifiedSuccessById(queriedObject._id);
        await sleep(60);

        let _aliceIdentity = await self.api.query.identity.identityOf(self.alice.address);
        const aliceIdentity = JSON.parse(`${_aliceIdentity}`);
        const regIndex = 0;
        console.log(aliceIdentity);
        if (
            aliceIdentity.judgements &&
            aliceIdentity.judgements[0][0] === regIndex &&
            _.keys(aliceIdentity.judgements[0][1])[0] === 'Reasonable'
        ) {
            console.log('-------------------- CI Succeeded --------------------');
            process.exit(0);
        } else {
            console.log('-------------------- CI Failed --------------------');
            process.exit(1);
        }
    }
}

(async () => {
    const chain = new Chain(config);
    await chain.ciTest();
    await chain.disconnect();
})();
