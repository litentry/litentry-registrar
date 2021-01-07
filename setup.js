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

class Chain {
  /**
   * A wrapped APIs for block chain
   * @constructor
   */
  constructor(config) {
    this.config = config;
    this.wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}:${config.chain.port}`);
    this.keyring = new Keyring({ type: 'sr25519' });
    this.myself = null;

    this.unsubscribeEventListener = null;
    this.firstConnected = false;
  }

  /**
   * Connect to a configured block chain, such as polkadot, westend or local chain.
   */
  async connect() {
    const _alice = '//Alice';
    const _bob = '//Bob';
    const _charlie = '//Charlie';
    const _dave = '//Dave';
    if (! this.api) {
      this.api = await ApiPromise.create({ provider: this.wsProvider });
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
  /**
   * elections
   */
  async electionsCandidates() {
    await this.connect();
    const candidates = await this.api.query.electionsPhragmen.candidates();
    console.log(`[elections.candidates]: ${candidates.toJSON()}`);
    return candidates;
  }

  async electionsMembers() {
    await this.connect();
    const members = await this.api.query.electionsPhragmen.members();
    console.log(`[elections.members] ${members.toJSON()}`);
    return members;
  }
  async electionsElectionRounds() {
    await this.connect();
    const rounds = await this.api.query.electionsPhragmen.electionRounds();
    console.log(`[elections.electionRounds]: ${rounds}`);
  }

  async electionsSubmitCandidacy() {
    await this.connect();
    let candidateCount = 0;
    let tx = this.api.tx.electionsPhragmen.submitCandidacy(candidateCount);
    let hash = await tx.signAndSend(this.alice);
    console.log(`[elections.submitCandidacy]: ${hash.toHex()}`);
    return hash;
  }

  async electionsVote() {
    await this.connect();
    const candidates = await this.electionsCandidates();
    // vote for 1 unit
    const value = 1000000000000000;
    const tx = this.api.tx.electionsPhragmen.vote(candidates, value);
    console.log(`[elections.vote]: tx = ${tx}`);
    const hash = await tx.signAndSend(this.myself);
    console.log(`[elections.vote]: ${hash}`);
    return hash.toHex();
  }

  /**
   * council
   */
  async councilMembers() {
    await this.connect();
    const members = await this.api.query.council.members();
    console.log(`[council.members]: ${members.length}`);
  }
  async councilProposalCount() {
    await this.connect();
    const proposalCount = await this.api.query.council.proposalCount();
    console.log(`[council.proposalCount]: ${proposalCount}`);
  }
  async councilProposals() {
    await this.connect();
    const proposals = await this.api.query.council.proposals();
    console.log(`[council.proposals]: ${proposals}`);
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
    const identityOf = await this.api.query.identity.identityOf(this.myself.address);
    console.log(`[identity.identityOf]: ${identityOf.toHuman()}`);
    return identityOf;
  }
  async identityAddRegistrar() {
    await this.connect();
    const registrar = this.api.tx.identity.addRegistrar(this.myself.address);
    console.log(`[identity.addRegistrar]: ${registrar}`);
    return registrar;
  }
  async identitySetIdentity() {
    await this.connect();
    let info = { display: 'Alice', email: 'test@example.com', riot: 'riot', twitter: 'twitter', web: 'http://test.com' };
    info = _.mapValues(info, function (elem) {
      return { Raw: elem };
    });
    const transfer = this.api.tx.identity.setIdentity(info);
    const hash = await transfer.signAndSend(this.myself);
    console.log(`[identity.setIdentity]: ${hash.toHex()}`);
  }
  async identityRequestJudgement() {
    const regIndex = 0;
    const fee = 1;
    const transfer = this.api.tx.identity.requestJudgement(regIndex, fee);
    const hash = await transfer.signAndSend(this.myself);
    console.log(`[identity.RequestJudgement]: ${hash.toHex()}`);
  }

  async identityProvideJudgement() {
    await this.connect();
    const regIndex = 0;
    const target = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const judgement = 'KnownGood';
    let judgement_ = Judgement[judgement];

    const transfer = this.api.tx.identity.provideJudgement(regIndex, target, judgement_);

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

  async identitySetFee() {
    const index = 0;
    const fee = 100000000000000;
    const tx = this.api.tx.identity.setFee(index, fee);
    const hash = await tx.signAndSend(this.myself);
    console.log(`[identity.setFee]: ${hash.toHex()}`);
    return hash;
  }
  /**
   * democracy
   */
  async democracyPublicPropCount() {
    await this.connect();
    const publicPropCount = await this.api.query.democracy.publicPropCount();
    console.log(`public propose count: ${publicPropCount}`);
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
    for (let i = 0; i < referendumCount; i ++) {
      const info = await this.api.query.democracy.referendumInfoOf(i);
      console.log(`[democracy.referendumInfoOf]: ${info}`);
      referendumInfo.push(info);
    }

    return referendumInfo;
  }

  async democracyPropose() {
    await this.connect();
    const toAddRegistrar = await this.identityAddRegistrar();
    const encodedProposal = toAddRegistrar.method.toHex();

    const preimage = blake2AsHex(encodedProposal);

    const value = 1000000000000000;
    const proposal = this.api.tx.democracy.propose(preimage, value);
    const hash = await proposal.signAndSend(this.myself);
    console.log(`[democracy.propose] with hash: ${hash.toHex()}`);

  }

  async democracyNotePreimage() {
    await this.connect();
    const toAddRegistrar = await this.identityAddRegistrar();
    const encodedProposal = toAddRegistrar.method.toHex();
    const preimage = this.api.tx.democracy.notePreimage(encodedProposal);
    const hash = await preimage.signAndSend(this.myself);
    console.log(`[democracy.notePreimage]: ${hash.toHex()}`)
    return hash;
  }

  async democracyVote() {
    await this.connect();
    const referendumInfo = await this.democracyReferendumInfoOf();
    const vote = {
      Standard: {
        vote: true,
        conviction: 'None',
        // 0.1 Unit
        balance: 1000000000000000
      }
    };
    console.log(`vote on referendumInfo: ${referendumInfo[referendumInfo.length-1]}`);
    const voted = this.api.tx.democracy.vote(referendumInfo.length-1, vote);
    const hash = await voted.signAndSend(this.myself);
    console.log(`[democracy.vote]: ${voted}`);
    return hash;
  }
  /**
   * session
   */
  async sessionValidators() {
    await this.connect();

    const validators = await this.api.query.session.validators();
    console.log(`Validators: ${validators.toJSON()}`);
  }
  async sessionDisabledValidators() {
    await this.connect();

    const disabledValidators = await this.api.query.session.disabledValidators();
    console.log(`DisabledValidators: ${disabledValidators.toJSON()}`);
  }
  async sessionCurrentIndex() {
    await this.connect();

    const currentIndex = await this.api.query.session.currentIndex();
    console.log(`Session current index: ${currentIndex}`);
    return currentIndex;
  }

  async sessionNextKeys() {
    await this.connect();
    const keys = await this.api.query.session.nextKeys('5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY');
    console.log(`Next session keys: ${keys}`);
  }

  async sessionQueuedKeys() {
    await this.connect();

    const queuedKeys = await this.api.query.session.queuedKeys();
    console.log(`Queued session keys: ${queuedKeys}`);
  }
  /**
   * imOnline
   */
  async imOnlineHeartbeatAfter() {
    await this.connect();

    const blockNumber = await this.api.query.imOnline.heartbeatAfter();
    console.log(`heart beat block number: ${blockNumber}`);
  }
  async imOnlineAuthoredBlocks() {
    await this.connect();
    const validatorId = '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY';
    const sessionIndex = await this.sessionCurrentIndex();
    const authorizedBlocks = await this.api.query.imOnline.authoredBlocks(sessionIndex, validatorId);
    console.log(`authorized blocks: ${authorizedBlocks}`);
    return authorizedBlocks;
  }
  async imOnlineKeys() {
    await this.connect();
    const keys = await this.api.query.imOnline.keys();
    console.log(`imOnline keys: ${keys}`);
    return keys;
  }
  /**
   * sudo
   */
  async sudoKey() {
    await this.connect();
    const key = await this.api.query.sudo.key();
    console.log(`sudo key: ${key}`);
    return key;
  }
  /**
   * babe
   */
  async babeNextRandomness() {
    await this.connect();
    const result = await this.api.query.babe.nextRandomness();
    console.log(`[babe.nextRandomness]: ${result}`);
  }
  async babeRandomness() {
    await this.connect();
    const result = await this.api.query.babe.randomness();
    console.log(`[babe.randomness]: ${result}`);
  }
  /**
   * staking
   */
  async stakingCurrentEra() {
    await this.connect();
    const currentIndex = await this.api.query.staking.currentEra();
    console.log(`[staking.currentEra]: ${currentIndex}`);
    return currentIndex;
  }
  async stakingEraElectionStatus() {
    await this.connect();
    const status = await this.api.query.staking.eraElectionStatus();
    console.log(`[staking.eraElectionStatus]: ${status}`);
    return status;
  }
  async stakingValidatorCount() {
    await this.connect();
    const validatorCount = await this.api.query.staking.validatorCount();
    console.log(`[staking.validatorCount]: ${validatorCount}`);
    return validatorCount;
  }

  async disconnect() {
    await this.api.disconnect();
  }
}

async function setupRegistrar() {
  const chain = new Chain(config);
  /**
   * check if there is a registrar
   */
  let registrars = await chain.identityRegistrars();
  if (registrars.length > 0) {
    // await chain.identitySetFee();
    // await sleep(3);
    // registrars = await chain.identityRegistrars();
    await chain.disconnect();
    return;
  }
  /**
   * Setup a council member
   */
  const councilMembers = await chain.electionsMembers();
  if (councilMembers.length === 0) {
    // No council members, let's elect a new council member
    let candicates = await chain.electionsCandidates();
    while (candicates.length === 0) {
      candicates = await chain.electionsSubmitCandidacy();
      await sleep(3);
    }
    await chain.electionsVote();
  }
  /**
   * create a proposal for registrar
   */
  let publicProps = await chain.democracyPublicProps();
  await sleep(3);
  if (`${publicProps.length}` === '0') {
    await chain.democracyNotePreimage();
    await sleep(3);
    await chain.democracyPropose();
    await sleep(3);
  }
  let referendumInfo = await chain.democracyReferendumInfoOf();
  while (`${referendumInfo.length}` === '0') {
    await sleep(3);
    referendumInfo = await chain.democracyReferendumInfoOf();
  }
  let lastReferendumInfo = referendumInfo[referendumInfo.length-1];
  if (lastReferendumInfo.Finished && lastReferendumInfo.Finished.approved === false) {
    console.log(`Some error`);
    return;
  } else {
    await chain.democracyVote();
    await sleep(3);
  }
  /**
   * query the result of registrar
   */
  registrars = await chain.identityRegistrars();
  while (registrars.length == 0) {
    await sleep(3);
    registrars = await chain.identityRegistrars();
  }
  /**
   * set registrar fee and query results
   */
  await chain.identitySetFee();
  await sleep(3);
  registrars = await chain.identityRegistrars();

  await chain.disconnect();
}


(async () => {
  await setupRegistrar();
})();
