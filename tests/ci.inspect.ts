delete process.env.NODE_ENV;

import dotenv from 'dotenv';
import util from 'util';

const result = dotenv.config({ debug: true });

if (result.error) {
    throw result.error;
}

import _ from 'lodash';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { AddressOrPair, ApiTypes, SubmittableExtrinsic } from '@polkadot/api/types';
import { KeyringPair } from '@polkadot/keyring/types';
import config from 'app/config';
import Config from 'types/config';
import { RequestJudgementCollection } from 'app/db';

/**
 * See @href https://wiki.polkadot.network/docs/en/learn-identity
 */

// DEFUALT FEE is 1 Unit
const DEFAULT_REGISTRAR_FEE = 1000000000000;
const DEFAULT_SLEEP_INTERVAL = 6;

function sleep(seconds: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
    });
}

class Chain {
    private readonly wsProvider: WsProvider;

    private readonly keyring: Keyring;

    private api: ApiPromise;

    private myself: KeyringPair;
    alice: KeyringPair;
    bob: KeyringPair;
    charlie: KeyringPair;
    dave: KeyringPair;
    eve: KeyringPair;

    /**
     * A wrapped APIs for block chain
     * @constructor
     */
    constructor(config: Config) {
        this.wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}:${config.chain.port}`);
        this.keyring = new Keyring({ type: 'sr25519' });
    }

    /**
     * Connect to a configured block chain, such as polkadot, westend or local chain.
     */
    async connect() {
        const _alice = '//Alice';
        const _bob = '//Bob';
        const _charlie = '//Charlie';
        const _dave = '//Dave';

        if (!this.api) {
            this.api = await ApiPromise.create({
                provider: this.wsProvider,
                types: {
                    Address: 'MultiAddress',
                    LookupSource: 'MultiAddress',
                },
            });
        }

        if (!this.myself) {
            this.myself = this.keyring.addFromUri(_alice);
            this.alice = this.keyring.addFromUri(_alice);
            this.bob = this.keyring.addFromUri(_bob);
            this.charlie = this.keyring.addFromUri(_charlie);
            this.dave = this.keyring.addFromUri(_dave);
        }

        return this.api;
    }

    async signAndSend(tx: SubmittableExtrinsic<ApiTypes>, account: AddressOrPair) {
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
    async identitySetIdentity(account: AddressOrPair, info: { display: string; email: string; riot: string }) {
        await this.connect();
        const tx = this.api.tx.identity.setIdentity(_.mapValues(info, (elem) => ({ Raw: elem })));
        await this.signAndSend(tx, account);
        console.log(`[identity.setIdentity]: ${tx}`);
        return tx;
    }

    async identityRequestJudgement(account: AddressOrPair, regIndex = 0, fee = DEFAULT_REGISTRAR_FEE) {
        const tx = this.api.tx.identity.requestJudgement(regIndex, fee);
        const resp = await this.signAndSend(tx, account);
        console.log(`[identity.RequestJudgement]: ${tx}`);
        console.log(`[identity.RequestJudgement]: ${resp}`);
        return [tx, resp];
    }

    async identityCancel(account: AddressOrPair, regIndex = 0) {
        const tx = this.api.tx.identity.cancelRequest(regIndex);
        const resp = await this.signAndSend(tx, account);
        console.log(`[identity.cancelRequest]: ${tx}`);
        console.log(`[identity.cancelRequest] resp: ${resp}`);
        return [tx, resp];
    }

    async disconnect() {
        console.log(`Disconnect from chain`);
        await this.api.disconnect();
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
            await this.identityCancel(this.bob);
        } catch (e) {
            console.log(e);
        }
        const info = { display: 'Bob', email: 'no-reply@litentry.com', riot: '@litentry-bot:matrix.org' };

        await RequestJudgementCollection.db.connect();
        await RequestJudgementCollection.db.database.collection('requestJudgement').deleteMany(info);

        let [queriedObject] = await RequestJudgementCollection.query(info);
        console.log('queriedObject: ');
        console.log(queriedObject);

        await this.identitySetIdentity(this.bob, info);
        await sleep(DEFAULT_SLEEP_INTERVAL);
        await this.identityRequestJudgement(this.bob);
        await sleep(60);
        [queriedObject] = await RequestJudgementCollection.query(info);

        console.log('queriedObject: ');
        console.log(queriedObject);

        if (_.isEmpty(queriedObject)) {
            console.log('-------------------- CI Failed --------------------');
            process.exit(1);
        }

        if (queriedObject.emailStatus === 'pending') {
            await RequestJudgementCollection.setEmailVerifiedSuccessById(queriedObject._id);
        }
        if (queriedObject.riotStatus === 'pending') {
            await RequestJudgementCollection.setRiotVerifiedSuccessById(queriedObject._id);
        }
        await RequestJudgementCollection.setTwitterVerifiedSuccessById(queriedObject._id);
        await sleep(90);

        let _bobIdentity = await this.api.query.identity.identityOf(this.bob.address);
        const bobIdentity = JSON.parse(`${_bobIdentity}`);
        const regIndex = 0;
        console.log(util.inspect(bobIdentity, { showHidden: true, depth: null }));
        if (
            bobIdentity.judgements &&
            bobIdentity.judgements[0][0] === regIndex &&
            _.keys(bobIdentity.judgements[0][1])[0] === 'reasonable'
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
