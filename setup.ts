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
import { blake2AsHex } from '@polkadot/util-crypto';
import config from 'app/config';
import Config from 'types/config';
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

let self: any = null;
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
    self = this;
    self.wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}:${config.chain.port}`);
    self.keyring = new Keyring({ type: 'sr25519' });
  }

  async connect() {
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
      self.myself = self.keyring.addFromUri('//Alice');
      self.alice = self.keyring.addFromUri('//Alice');
      self.bob = self.keyring.addFromUri('//Bob');
      self.charlie = self.keyring.addFromUri('//Charlie');
      self.dave = self.keyring.addFromUri('//Dave');
      self.eve = self.keyring.addFromUri('//Eve');
    }

    return self.api;
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
    await self.connect();
    const registrars = await self.api.query.identity.registrars();
    console.log(`[identity.registrars]: ${registrars}`);
    return registrars;
  }

  async identityIdentityOf() {
    await self.connect();
    const identityOf = await self.api.query.identity.identityOf(self.myself!.address);
    console.log(`[identity.identityOf]: ${identityOf.toHuman()}`);
    return identityOf;
  }

  async identityAddRegistrar(registrarAccount: string | Uint8Array) {
    await self.connect();
    const tx = self.api.tx.identity.addRegistrar(registrarAccount);
    console.log(`[identity.addRegistrar]: ${tx}`);
    return tx;
  }

  async identitySetFee(account: AddressOrPair, regIndex = 0, fee = DEFAULT_REGISTRAR_FEE) {
    const tx = self.api.tx.identity.setFee(regIndex, fee);
    await self.signAndSend(tx, account);
    console.log(`[identity.setFee]: ${tx}`);
    return tx;
  }

  /**
   * democracy
   */
  async democracyPublicPropCount() {
    await self.connect();
    const publicPropCount = await self.api.query.democracy.publicPropCount();
    console.log(`[democracy.publicPropCount]: ${publicPropCount}`);
    return publicPropCount;
  }

  async democracyPublicProps() {
    await self.connect();
    const publicProps = await self.api.query.democracy.publicProps();
    console.log(`[democracy.publicProposals]: ${publicProps}`);
    return publicProps;
  }

  async democracyReferendumCount() {
    await self.connect();
    const referendumCount = await self.api.query.democracy.referendumCount();
    console.log(`[democracy.referendumCount]: ${referendumCount}`);
    return referendumCount;
  }

  async democracyReferendumInfoOf() {
    await self.connect();
    const referendumCount = await self.democracyReferendumCount();
    let referendumInfo = [];
    // TODO_CHECK, I've added .toNumber() here as the ReferendumIndex type wasn't happy being used as a number
    for (let i = 0; i < referendumCount.toNumber(); i++) {
      const info = await self.api.query.democracy.referendumInfoOf(i);
      console.log(`[democracy.referendumInfoOf]: ${info}`);
      referendumInfo.push(info);
    }
    return referendumInfo;
  }

  async democracyPropose(
    account: AddressOrPair,
    func: (args: any) => Promise<SubmittableExtrinsic<'promise', ISubmittableResult>>,
    args: any,
    value = DEFAULT_DEMOCRACY_PROPOSAL_FEE
  ) {
    await self.connect();
    // @ts-ignore
    const result = await func(...args);
    const encodedProposal = result.method.toHex();
    console.log('encodeProposal: ', encodedProposal);
    const preimage = blake2AsHex(encodedProposal);
    console.log('preimage: ', preimage);
    const tx = self.api.tx.democracy.propose(preimage, value);
    await self.signAndSend(tx, account);
    console.log(`[democracy.propose]: ${tx}`);
    return tx;
  }

  async democracyNotePreimage(
    account: AddressOrPair,
    func: (args: any) => Promise<SubmittableExtrinsic<'promise', ISubmittableResult>>,
    args: any
  ) {
    await self.connect();
    // @ts-ignore
    const result = await func(...args);
    const encodedProposal = result.method.toHex();
    const tx = self.api.tx.democracy.notePreimage(encodedProposal);
    await self.signAndSend(tx, account);
    console.log(`[democracy.notePreimage]: ${tx}`);
    return tx;
  }

  async democracyVote(account: AddressOrPair, balance = DEFAULT_DEMOCRACY_VOTE_FEE) {
    await self.connect();
    const referendumInfo = await self.democracyReferendumInfoOf();
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
    const tx = self.api.tx.democracy.vote(referendumInfo.length - 1, vote);
    await self.signAndSend(tx, account);
    console.log(`[democracy.vote]: ${tx}`);
    return tx;
  }

  async proxyProxies(account: string | Uint8Array) {
    await self.connect();
    const resp = await self.api.query.proxy.proxies(account);
    console.log(`[proxy.proxies]: ${resp}`);
    return resp;
  }

  async proxyAddProxy(
    account: AddressOrPair,
    delegateAccount: string | Uint8Array,
    proxyType = 'IdentityJudgement',
    delay = 0
  ) {
    await self.connect();
    // TODO_CHECK 'IdentityJudgement' doesn't match the types allowed in the polkadot library
    // @ts-ignore
    const tx = self.api.tx.proxy.addProxy(delegateAccount, proxyType, delay);
    const resp = await self.signAndSend(tx, account);
    console.log(`[identity.RequestJudgement] tx: ${tx}`);
    console.log(`[identity.RequestJudgement] resp: ${resp}`);
    return [tx, resp];
  }

  async disconnect() {
    console.log(`Disconnect from chain`);
    await self.api.disconnect();
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
    console.log(account2registrar[`${registrarAccount.address}`]);
    await self.connect();
    /**
     * check if there is a registrar
     */
    let registrars = await self.identityRegistrars();

    if (registrars.length > 0) {
      for (let registrar of registrars.toArray()) {
        const account = (
          registrar.value.toJSON() as {
            [index: string]: AnyJson;
          }
        ).account;
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
    let publicProps = await self.democracyPublicProps();
    await sleep(DEFAULT_SLEEP_INTERVAL);
    if (`${publicProps.length}` === '0') {
      // TODO_CHECK self code isn't being hit, and it's throwing build errors (remove the 2 ts-ignores to highlight the issues)
      // @ts-ignore
      await self.democracyNotePreimage(self.alice, self.identityAddRegistrar, [
        account2registrar[`${registrarAccount.address}`],
      ]);
      await sleep(DEFAULT_SLEEP_INTERVAL);
      // @ts-ignore
      await self.democracyPropose(self.alice, self.identityAddRegistrar, [
        account2registrar[`${registrarAccount.address}`],
      ]);
      await sleep(DEFAULT_SLEEP_INTERVAL);
    }
    let referendumInfo = await self.democracyReferendumInfoOf();
    // Make sure there is at least one referendum in array
    while (`${referendumInfo.length}` === '0') {
      await sleep(DEFAULT_SLEEP_INTERVAL);
      referendumInfo = await self.democracyReferendumInfoOf();
    }
    // Extract latest referendum from given array
    let lastReferendumInfo = referendumInfo[referendumInfo.length - 1];
    // Make sure self referendum is `isOngoing` status
    while (!lastReferendumInfo.value.isOngoing) {
      await sleep(DEFAULT_SLEEP_INTERVAL);
      referendumInfo = await self.democracyReferendumInfoOf();
      lastReferendumInfo = referendumInfo[referendumInfo.length - 1];
    }
    // Now we can safely vote self proposal
    await self.democracyVote(self.alice);
    await sleep(DEFAULT_SLEEP_INTERVAL);
    /**
     * query the result of registrar
     */
    registrars = await self.identityRegistrars();

    let waiting = true;
    let regIndex = -1;
    while (waiting) {
      await sleep(DEFAULT_SLEEP_INTERVAL);
      registrars = await self.identityRegistrars();
      console.log(`Number of existed registrars: ${registrars.length}`);
      for (let registrar of registrars) {
        regIndex += 1;

        const account = (
          registrar.value.toJSON() as {
            [index: string]: AnyJson;
          }
        ).account;

        console.log(`registrar.value: ${registrar}`);
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
    await self.identitySetFee(registrarAccount, regIndex, fee);
    await sleep(DEFAULT_SLEEP_INTERVAL);
    await self.identityRegistrars();
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
