'use strict';
process.env.NODE_ENV = 'dev';
/**
 * See @href https://wiki.polkadot.network/docs/en/learn-identity
 */
const _ = require('lodash');

const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const Keyring = require('@polkadot/api').Keyring;
const { blake2AsHex } = require('@polkadot/util-crypto');
const { GenericExtrinsic } = require('@polkadot/types/extrinsic/Extrinsic');

console.log(GenericExtrinsic);
const config = require('./app/config');

// DEFUALT FEE is 0.1 Unit
const DEFAULT_REGISTRAR_FEE = 100000000000000;
const DEFAULT_DEMOCRACY_VOTE_FEE = 100000000000000;
const DEFAULT_DEMOCRACY_PROPOSAL_FEE = 100000000000000;
const DEFAULT_SLEEP_INTERVAL = 6;

const Judgement = {
  FeePaid: {
    // value like: 100 DOT
    FeePaid: null,
  },

  Unknown: { Unknown: null },
  Reasonable: { Reasonable: null },
  KnownGood: { KnownGood: null },
  OutOfDate: { OutOfDate: null },
  LowQuality: { LowQuality: null },
};

function sleep(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds*1000);
  });
}

var self = undefined;
class Chain {
  /**
   * A wrapped APIs for block chain
   * @constructor
   */
  constructor(config) {
    if (! self) {
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
    if (! self.api) {
      self.api = await ApiPromise.create({ provider: self.wsProvider });
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
   * elections
   */
  async electionsCandidates() {
    await self.connect();
    const candidates = await self.api.query.electionsPhragmen.candidates();
    console.log(`[elections.candidates]: ${candidates.toJSON()}`);
    return candidates;
  }
  async electionsMembers() {
    await self.connect();
    const members = await self.api.query.electionsPhragmen.members();
    console.log(`[elections.members] ${members.toJSON()}`);
    return members;
  }
  async electionsElectionRounds() {
    await self.connect();
    const rounds = await self.api.query.electionsPhragmen.electionRounds();
    console.log(`[elections.electionRounds]: ${rounds}`);
    return rounds;
  }
  async electionsSubmitCandidacy(account, candidateCount = 0) {
    await self.connect();
    // const candidateCount = 0;
    const tx = self.api.tx.electionsPhragmen.submitCandidacy(candidateCount);
    await self.signAndSend(tx, account);
    console.log(`[elections.submitCandidacy]: ${tx}`);
    return tx;
  }
  async electionsVote(account) {
    await self.connect();
    const candidates = await self.electionsCandidates();
    // vote for 1 unit
    const value = 1000000000000000;
    const tx = self.api.tx.electionsPhragmen.vote(candidates, value);
    console.log(`[elections.vote]: ${tx}`);
    await self.signAndSend(tx, account);
    return tx;
  }

  /**
   * council
   */
  async councilMembers() {
    await self.connect();
    const members = await self.api.query.council.members();
    console.log(`[council.members]: ${members}`);
    return members;
  }
  async councilProposalCount() {
    await self.connect();
    const proposalCount = await self.api.query.council.proposalCount();
    console.log(`[council.proposalCount]: ${proposalCount}`);
    return proposalCount;
  }
  async councilProposals() {
    await self.connect();
    const proposals = await self.api.query.council.proposals();
    console.log(`[council.proposals]: ${proposals}`);
    return proposals;
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
    const identityOf = await self.api.query.identity.identityOf(self.myself.address);
    console.log(`[identity.identityOf]: ${identityOf.toHuman()}`);
    return identityOf;
  }
  async identityAddRegistrar(account, registrarAccount) {
    await self.connect();
    const tx = self.api.tx.identity.addRegistrar(registrarAccount.address);
    console.log(`[identity.addRegistrar]: ${tx}`);
    return tx;
  }
  async identitySetIdentity(account) {
    await self.connect();
    let info = { display: 'Alice', email: 'test@example.com', riot: 'riot', twitter: 'twitter', web: 'http://test.com' };
    info = _.mapValues(info, function (elem) {
      return { Raw: elem };
    });
    const tx = self.api.tx.identity.setIdentity(info);
    await self.signAndSend(tx, account);
    console.log(`[identity.setIdentity]: ${tx}`);
    return tx;
  }
  async identityRequestJudgement(account, regIndex = 0, fee = DEFAULT_REGISTRAR_FEE) {
    // const regIndex = 0;
    // const fee = 1;
    const tx = self.api.tx.identity.requestJudgement(regIndex, fee);
    await self.signAndSend(tx, account);
    console.log(`[identity.RequestJudgement]: ${tx}`);
    return tx;
  }

  async identityProvideJudgement(account, target = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', regIndex = 0,
                                 judgement = 'KnownGood') {
    await self.connect();
    // const regIndex = 0;
    // const target = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    // const judgement = 'KnownGood';
    let judgement_ = Judgement[judgement];

    const tx = self.api.tx.identity.provideJudgement(regIndex, target, judgement_);

    // const { nonce } = await self.api.query.system.account(self.myself.publicKey);
    // const myself = self.myself;
    // /* eslint-disable-next-line */
    // return new Promise((resolve, reject) => {
    //   tx.signAndSend(myself, { nonce }, ({ events = [], status }) => {
    //     console.log('Transaction status:', status.type);
    //     if (status.isInBlock) {
    //       console.log('Included at block hash', status.asInBlock.toHex());
    //       console.log('Events:');

    //       let resp = { blockHash: status.asInBlock.toHex(), events: [] };

    //       events.forEach(({ event: { data, method, section }, phase }) => {
    //         console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
    //         resp['events'].push(`${phase.toString()}: ${section}.${method}, ${data.toString()}`);
    //       });
    //       resolve(resp);
    //     }
    //   });
    // });
    await self.signAndSend(tx, account);
    return tx;
  }

  async identitySetFee(account, regIndex = 0, fee = DEFAULT_REGISTRAR_FEE) {
    // const index = 0;
    // const fee = 100000000000000;
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
    for (let i = 0; i < referendumCount; i ++) {
      const info = await self.api.query.democracy.referendumInfoOf(i);
      console.log(`[democracy.referendumInfoOf]: ${info}`);
      referendumInfo.push(info);
    }

    return referendumInfo;
  }

  // async democracyPropose(account, registrarAccount) {
  async democracyPropose(account, func, args, value = DEFAULT_DEMOCRACY_PROPOSAL_FEE) {
    await self.connect();
    // const toAddRegistrar = await self.identityAddRegistrar(registrarAccount);
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

  async democracyNotePreimage(account, func, args) {
    await self.connect();
    // const toAddRegistrar = await self.identityAddRegistrar();
    const result = await func(...args);
    // const encodedProposal = toAddRegistrar.method.toHex();
    const encodedProposal = result.method.toHex();
    const tx = self.api.tx.democracy.notePreimage(encodedProposal);
    await self.signAndSend(tx, account);
    console.log(`[democracy.notePreimage]: ${tx}`)
    return tx;
  }

  async democracyVote(account, balance = DEFAULT_DEMOCRACY_VOTE_FEE) {
    await self.connect();
    const referendumInfo = await self.democracyReferendumInfoOf();
    const vote = {
      Standard: {
        vote: true,
        conviction: 'None',
        // 0.1 Unit
        // balance: 1000000000000000
        balance: balance
      }
    };
    console.log(`vote on referendumInfo: ${referendumInfo[referendumInfo.length-1]}`);
    const tx = self.api.tx.democracy.vote(referendumInfo.length-1, vote);
    await self.signAndSend(tx, account);
    console.log(`[democracy.vote]: ${tx}`);
    tx;
  }
  /**
   * session
   */
  async sessionValidators() {
    await self.connect();
    const validators = await self.api.query.session.validators();
    console.log(`Validators: ${validators.toJSON()}`);
    return validators;
  }
  async sessionDisabledValidators() {
    await self.connect();
    const disabledValidators = await self.api.query.session.disabledValidators();
    console.log(`DisabledValidators: ${disabledValidators.toJSON()}`);
    return disabledValidators;
  }
  async sessionCurrentIndex() {
    await self.connect();

    const currentIndex = await self.api.query.session.currentIndex();
    console.log(`[session.currentIndex]: ${currentIndex}`);
    return currentIndex;
  }

  async sessionNextKeys() {
    await self.connect();
    const keys = await self.api.query.session.nextKeys('5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY');
    console.log(`[session]Next session keys: ${keys}`);
  }

  async sessionQueuedKeys() {
    await self.connect();
    const queuedKeys = await self.api.query.session.queuedKeys();
    console.log(`[session.queuedKeys]: ${queuedKeys}`);
    return queuedKeys;
  }
  /**
   * imOnline
   */
  async imOnlineHeartbeatAfter() {
    await self.connect();

    const blockNumber = await self.api.query.imOnline.heartbeatAfter();
    console.log(`[imOnline.heartBeatAfter]: ${blockNumber}`);
    return blockNumber;
  }
  async imOnlineAuthoredBlocks() {
    await self.connect();
    const validatorId = '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY';
    const sessionIndex = await self.sessionCurrentIndex();
    const authorizedBlocks = await self.api.query.imOnline.authoredBlocks(sessionIndex, validatorId);
    console.log(`[imOnline.authorizedBlocks]: ${authorizedBlocks}`);
    return authorizedBlocks;
  }
  async imOnlineKeys() {
    await self.connect();
    const keys = await self.api.query.imOnline.keys();
    console.log(`[imOnline.keys]: ${keys}`);
    return keys;
  }
  /**
   * sudo
   */
  async sudoKey() {
    await self.connect();
    const key = await self.api.query.sudo.key();
    console.log(`[sudo.key]: ${key}`);
    return key;
  }
  /**
   * babe
   */
  async babeNextRandomness() {
    await self.connect();
    const result = await self.api.query.babe.nextRandomness();
    console.log(`[babe.nextRandomness]: ${result}`);
    return result;
  }
  async babeRandomness() {
    await self.connect();
    const result = await self.api.query.babe.randomness();
    console.log(`[babe.randomness]: ${result}`);
    return result;
  }
  /**
   * staking
   */
  async stakingCurrentEra() {
    await self.connect();
    const currentIndex = await self.api.query.staking.currentEra();
    console.log(`[staking.currentEra]: ${currentIndex}`);
    return currentIndex;
  }
  async stakingEraElectionStatus() {
    await self.connect();
    const status = await self.api.query.staking.eraElectionStatus();
    console.log(`[staking.eraElectionStatus]: ${status}`);
    return status;
  }
  async stakingValidatorCount() {
    await self.connect();
    const validatorCount = await self.api.query.staking.validatorCount();
    console.log(`[staking.validatorCount]: ${validatorCount}`);
    return validatorCount;
  }

  async disconnect() {
    console.log(`Disconnect from chain`);
    await self.api.disconnect();
  }


  /**
   * @description set up a registrar for an account
   */
  async setupRegistrar(registrarAccount) {
    console.log(`[setupRegistrar] Try to add registrar: `);
    console.log(registrarAccount.toJson());
    await self.connect();
    /**
     * check if there is a registrar
     */
    let registrars = await self.identityRegistrars();

    if (registrars.length > 0) {
      for (let registrar of registrars.toArray()) {
        if (`${registrar.value.account}` === `${registrarAccount.address}`) {
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
      await self.democracyNotePreimage(self.alice, self.identityAddRegistrar, [self.alice, registrarAccount]);
      await sleep(DEFAULT_SLEEP_INTERVAL);
      await self.democracyPropose(self.alice, self.identityAddRegistrar, [self.alice, registrarAccount]);
      await sleep(DEFAULT_SLEEP_INTERVAL);
    }
    let referendumInfo = await self.democracyReferendumInfoOf();
    // Make sure there is at least one referendum in array
    while (`${referendumInfo.length}` === '0') {
      await sleep(DEFAULT_SLEEP_INTERVAL);
      referendumInfo = await self.democracyReferendumInfoOf();
    }
    // Extract latest referendum from given array
    let lastReferendumInfo = referendumInfo[referendumInfo.length-1];
    // Make sure this referendum is `isOngoing` status
    while (! lastReferendumInfo.value.isOngoing) {
      await sleep(DEFAULT_SLEEP_INTERVAL);
      referendumInfo = await self.democracyReferendumInfoOf();
      lastReferendumInfo = referendumInfo[referendumInfo.length-1];
    }
    // Now we can safely vote this proposal
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

      for (let registrar of registrars) {
        regIndex += 1;
        if (`${registrar.value.account}` === `${registrarAccount.address}`) {
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
  const chain = new Chain(config);
  await chain.connect();
  await chain.setupRegistrar(chain.alice);
  await chain.setupRegistrar(chain.bob);
  await chain.disconnect();
})();
