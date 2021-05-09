delete process.env.NODE_ENV;

import dotenv from 'dotenv';

const result = dotenv.config({ debug: true });

if (result.error) {
    throw result.error;
}

/**
 * See @href https://wiki.polkadot.network/docs/en/learn-identity
 */
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { AddressOrPair, ApiTypes, SubmittableExtrinsic } from '@polkadot/api/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { AccountId } from '@polkadot/types/interfaces/runtime';
import { blake2AsHex } from '@polkadot/util-crypto';
import config from './app/config';
import Config from './types/config';
import { AnyJson, ISubmittableResult } from '@polkadot/types/types';

// DEFUALT FEE is 1 Unit
const DEFAULT_REGISTRAR_FEE = 1000000000000;
const DEFAULT_DEMOCRACY_VOTE_FEE = 1000000000000;
const DEFAULT_DEMOCRACY_PROPOSAL_FEE = 1000000000000;
const DEFAULT_SLEEP_INTERVAL = 6;

function sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
    });
}

// TODO_CHECK I don't think we need this to enforce a singleton as the code using it only attempts to create it once
// let self = undefined;

class Chain {
    private readonly config: Config;

    private readonly wsProvider: WsProvider;

    private readonly keyring: Keyring;

    private api: ApiPromise;

    private myself: KeyringPair;
    alice: KeyringPair;
    bob: KeyringPair;
    charlie: KeyringPair;
    dave: KeyringPair;
    eve: KeyringPair;

    // TODO_CHECK is this being used?
    private readonly unsubscribeEventListener: null;

    /**
     * A wrapped APIs for block chain
     * @constructor
     */
    constructor(config: Config) {
        // if (!self) {
        //     self = this;
        // } else {
        //     throw new Error(`Only one chain instance allowed`);
        // }

        this.config = config;
        this.wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}:${config.chain.port}`);
        this.keyring = new Keyring({ type: 'sr25519' });

        this.unsubscribeEventListener = null;
    }

    async connect() {
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
            this.myself = this.keyring.addFromUri('//Alice');
            this.alice = this.keyring.addFromUri('//Alice');
            this.bob = this.keyring.addFromUri('//Bob');
            this.charlie = this.keyring.addFromUri('//Charlie');
            this.dave = this.keyring.addFromUri('//Dave');
            this.eve = this.keyring.addFromUri('//Eve');
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
    async identityRegistrars() {
        await this.connect();
        const registrars = await this.api.query.identity.registrars();
        console.log(`[identity.registrars]: ${registrars}`);
        return registrars;
    }

    async identityIdentityOf() {
        await this.connect();
        const identityOf = await this.api.query.identity.identityOf(this.myself!.address);
        console.log(`[identity.identityOf]: ${identityOf.toHuman()}`);
        return identityOf;
    }

    async identityAddRegistrar(registrarAccount: string | AccountId | Uint8Array) {
        await this.connect();
        const tx = this.api.tx.identity.addRegistrar(registrarAccount);
        console.log(`[identity.addRegistrar]: ${tx}`);
        return tx;
    }

    async identitySetFee(account: AddressOrPair, regIndex = 0, fee = DEFAULT_REGISTRAR_FEE) {
        const tx = this.api.tx.identity.setFee(regIndex, fee);
        await this.signAndSend(tx, account);
        console.log(`[identity.setFee]: ${tx}`);
        return tx;
    }

    /**
     * democracy
     */
    async democracyPublicPropCount() {
        await this.connect();
        const publicPropCount = await this.api.query.democracy.publicPropCount();
        console.log(`[democracy.publicPropCount]: ${publicPropCount}`);
        return publicPropCount;
    }

    async democracyPublicProps() {
        await this.connect();
        const publicProps = await this.api.query.democracy.publicProps();
        console.log(`[democracy.publicProposals]: ${publicProps}`);
        return publicProps;
    }

    async democracyReferendumCount() {
        await this.connect();
        const referendumCount = await this.api.query.democracy.referendumCount();
        console.log(`[democracy.referendumCount]: ${referendumCount}`);
        return referendumCount;
    }

    async democracyReferendumInfoOf() {
        await this.connect();
        const referendumCount = await this.democracyReferendumCount();
        let referendumInfo = [];
        // TODO_CHECK, I've added .toNumber() here as the ReferendumIndex type wasn't happy being used as a number
        for (let i = 0; i < referendumCount.toNumber(); i++) {
            const info = await this.api.query.democracy.referendumInfoOf(i);
            console.log(`[democracy.referendumInfoOf]: ${info}`);
            referendumInfo.push(info);
        }
        return referendumInfo;
    }

    async democracyPropose(
        account: AddressOrPair,
        func: (
            registrarAccount: string | AccountId | Uint8Array
        ) => Promise<SubmittableExtrinsic<'promise', ISubmittableResult>>,
        args: string | AccountId | Uint8Array,
        value = DEFAULT_DEMOCRACY_PROPOSAL_FEE
    ) {
        await this.connect();
        // const toAddRegistrar = await self.identityAddRegistrar(registrarAccount);
        const result = await func(args);
        const encodedProposal = result.method.toHex();
        console.log('encodeProposal: ', encodedProposal);
        const preimage = blake2AsHex(encodedProposal);
        console.log('preimage: ', preimage);
        const tx = this.api.tx.democracy.propose(preimage, value);
        await this.signAndSend(tx, account);
        console.log(`[democracy.propose]: ${tx}`);
        return tx;
    }

    async democracyNotePreimage(
        account: AddressOrPair,
        func: (
            registrarAccount: string | AccountId | Uint8Array
        ) => Promise<SubmittableExtrinsic<'promise', ISubmittableResult>>,
        args: string | AccountId | Uint8Array
    ) {
        await this.connect();
        // const toAddRegistrar = await self.identityAddRegistrar();
        const result = await func(args);
        // const encodedProposal = toAddRegistrar.method.toHex();
        const encodedProposal = result.method.toHex();
        const tx = this.api.tx.democracy.notePreimage(encodedProposal);
        await this.signAndSend(tx, account);
        console.log(`[democracy.notePreimage]: ${tx}`);
        return tx;
    }

    async democracyVote(account: AddressOrPair, balance = DEFAULT_DEMOCRACY_VOTE_FEE) {
        await this.connect();
        const referendumInfo = await this.democracyReferendumInfoOf();
        const vote = {
            Standard: {
                vote: true,
                conviction: 'None',
                // 0.1 Unit
                // balance: 1000000000000000
                balance: balance,
            },
        };
        console.log(`vote on referendumInfo: ${referendumInfo[referendumInfo.length - 1]}`);
        const tx = this.api.tx.democracy.vote(referendumInfo.length - 1, vote);
        await this.signAndSend(tx, account);
        console.log(`[democracy.vote]: ${tx}`);
        return tx;
    }

    async proxyProxies(account: string | Uint8Array | AccountId) {
        await this.connect();
        const resp = await this.api.query.proxy.proxies(account);
        console.log(`[proxy.proxies]: ${resp}`);
        return resp;
    }

    async proxyAddProxy(
        account: AddressOrPair,
        delegateAccount: string | AccountId | Uint8Array,
        proxyType = 'IdentityJudgement',
        delay = 0
    ) {
        await this.connect();
        // TODO_CHECK 'IdentityJudgement' doesn't match the types allowed in the polkadot library
        // @ts-ignore
        const tx = this.api.tx.proxy.addProxy(delegateAccount, proxyType, delay);
        const resp = await this.signAndSend(tx, account);
        console.log(`[identity.RequestJudgement] tx: ${tx}`);
        console.log(`[identity.RequestJudgement] resp: ${resp}`);
        return [tx, resp];
    }

    async disconnect() {
        console.log(`Disconnect from chain`);
        await this.api.disconnect();
    }

    /**
     * @description set up a registrar for an account
     */
    async setupRegistrar(registrarAccount: KeyringPair) {
        // FIXME: Enforce address mapping
        const account2registrar: {
            [key: string]: string;
        } = {
            '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY': '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
            '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty': '14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3',
        };
        console.log(`[setupRegistrar] Try to add registrar: `);
        console.log(registrarAccount.toJson());
        await this.connect();
        /**
         * check if there is a registrar
         */
        let registrars = await this.identityRegistrars();

        if (registrars.length > 0) {
            for (let registrar of registrars.toArray()) {
                const account = (registrar.value.toJSON() as {
                    [index: string]: AnyJson;
                }).account;
                console.log(`registrar.value: ${account}`);
                console.log(`registrarAccount: ${registrarAccount.address}`);
                if (`${account}` === `${account2registrar[registrarAccount.address]}`) {
                    console.log(`registrar already existed, ignore.`);
                    return;
                }
            }
        }
        /**
         * create a proposal for registrar
         */
        let publicProps = await this.democracyPublicProps();
        await sleep(DEFAULT_SLEEP_INTERVAL);
        if (`${publicProps.length}` === '0') {
            // TODO_CHECK this code isn't being hit, and it's throwing build errors (remove the 2 ts-ignores to highlight the issues)
            // @ts-ignore
            await this.democracyNotePreimage(this.alice, this.identityAddRegistrar, [this.alice, registrarAccount]);
            await sleep(DEFAULT_SLEEP_INTERVAL);
            // @ts-ignore
            await this.democracyPropose(this.alice, this.identityAddRegistrar, [this.alice, registrarAccount]);
            await sleep(DEFAULT_SLEEP_INTERVAL);
        }
        let referendumInfo = await this.democracyReferendumInfoOf();
        // Make sure there is at least one referendum in array
        while (`${referendumInfo.length}` === '0') {
            await sleep(DEFAULT_SLEEP_INTERVAL);
            referendumInfo = await this.democracyReferendumInfoOf();
        }
        // Extract latest referendum from given array
        let lastReferendumInfo = referendumInfo[referendumInfo.length - 1];
        // Make sure this referendum is `isOngoing` status
        while (
            !(lastReferendumInfo.value.toJSON() as {
                [index: string]: AnyJson;
            }).isOngoing
        ) {
            await sleep(DEFAULT_SLEEP_INTERVAL);
            referendumInfo = await this.democracyReferendumInfoOf();
            lastReferendumInfo = referendumInfo[referendumInfo.length - 1];
        }
        // Now we can safely vote this proposal
        await this.democracyVote(this.alice);
        await sleep(DEFAULT_SLEEP_INTERVAL);
        /**
         * query the result of registrar
         */
        registrars = await this.identityRegistrars();

        let waiting = true;
        let regIndex = -1;
        while (waiting) {
            await sleep(DEFAULT_SLEEP_INTERVAL);
            registrars = await this.identityRegistrars();
            console.log(`Number of existed registrars: ${registrars.length}`);
            for (let registrar of registrars) {
                regIndex += 1;

                const account = (registrar.value.toJSON() as {
                    [index: string]: AnyJson;
                }).account;

                console.log(`registrar.value: ${account}`, registrar.value);
                console.log(`registrarAccount: ${registrarAccount.address}`);

                if (`${account}` === `${account2registrar[registrarAccount.address]}`) {
                    waiting = false;
                    break;
                }
            }
        }

        /**
         * set registrar fee and query results
         */
        const fee = DEFAULT_REGISTRAR_FEE;
        await this.identitySetFee(registrarAccount, regIndex, fee);
        await sleep(DEFAULT_SLEEP_INTERVAL);
        await this.identityRegistrars();
        await this.proxyAddProxy(registrarAccount, this.eve.address);
    }
}

(async () => {
    // we need `as Config` here until we update the encrypted config file to TS
    const chain = new Chain(config as Config);
    await chain.connect();
    await chain.setupRegistrar(chain.alice);
    const resp = await chain.proxyProxies(chain.alice.address);
    let shouldAddProxy = true;
    if (resp && resp[0]) {
        for (let tmp of resp[0]) {
            const delegateAccount = `${tmp.delegate}`;
            console.log(delegateAccount);
            if (delegateAccount === '16D2eVuK5SWfwvtFD3gVdBC2nc2BafK31BY6PrbZHBAGew7L') {
                shouldAddProxy = false;
                break;
            }
        }
    }
    if (shouldAddProxy) {
        console.log('Should add proxy');
        await chain.proxyAddProxy(chain.alice, chain.eve.address);
    } else {
        console.log('No need to add proxy');
    }

    await chain.disconnect();
})();
