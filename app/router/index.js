'use strict';

const app = require('express').Router();
const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const Keyring = require('@polkadot/api').Keyring;



// const logger = require('app/logger');

// Add our Alice dev account
// const alice = keyring.addFromUri('//test', { name: 'Alice default' });

// Log some info
// console.log(`${alice.meta.name}: has address ${alice.address} with publicKey [${alice.publicKey}]`);



const test1 = '12judcGTM6Pdd5jnHRPQKxf2KoNKv85Nypgb3qG2sTTBxJGq';
// const test3 = '16A4w21jf5o2WMehSnw7pTGtjmrjNT5ZEgnmtGYcqzEXWbT8';
// const ALICE = test1;
const BOB = '168DnmofcoAtFTFY8Dfp7yUk8Eos7o7KbReEjAg7XH38pUaF';

app.get('/', async(req, res) => {
    // initialise via static create
    // const wsProvider = new WsProvider('wss://rpc.polkadot.io');
    const wsProvider = new WsProvider('wss://westend-rpc.polkadot.io');

    const api = await ApiPromise.create({ provider: wsProvider });
    // make a call to retrieve the current network head
    // api.rpc.chain.subscribeNewHeads((header) => {
    //     console.log(`Chain is at #${header.number}`);
    // });
    // const now = await api.query.timestamp.now();
    // const { nonce, data: balance } = await api.query.system.account(test1);
    const [now, { nonce, data: balances }] = await Promise.all([
        api.query.timestamp.now(),
        api.query.system.account(test1)
    ]);
    console.log(`${now}: balance of ${balances.free} and a nonce of ${nonce}`);

    console.log(api.genesisHash.toHex());


    // console.log('Transfer sent with hash', hash.toHex());
    // const alicePair = keyring.getPair(ALICE);
    // console.log(alicePair);
  // const [{ nonce: accountNonce }, now, validators] = await Promise.all([
  //   api.query.system.account(ALICE),
  //     api.query.timestamp.now(),
  //   api.query.session.validators()
  // ]);

  // console.log(`accountNonce(${ALICE}) ${accountNonce}`);
  // console.log(`last block timestamp ${now.toNumber()}`);


    // const alice = keyring.addFromUri('//test');
    // console.log(keyring.createFromUri('//Alice').address);
    // console.log(`${alice.meta.name}: has address ${alice.address} with publicKey [${alice.publicKey}]`);
    // const transfer = api.tx.balances.transfer(BOB, 0.0001);

    // // Sign and send the transaction using our account
    // const hash = await transfer.signAndSend(alice);



    // const unsub = await api.tx.balances
    //       .transfer(test3, 12345)
    //       .signAndSend(test1, (result) => {
    //           console.log(`Current status is ${result.status}`);
    //           if (result.status.isInBlock) {
    //               console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
    //           } else if (result.status.isFinalized) {
    //               console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
    //               unsub();
    //           }
    //       });

    // Show the hash
    // console.log(`Submitted with hash ${txHash}`);

    const keyring = new Keyring({ type: 'sr25519' });
    const PHRASE = 'provide arrow relief camera crunch assume affair palm game stadium coconut climb';
    const alice = keyring.addFromUri(PHRASE);
    console.log(alice);
    console.log(`${alice.meta.name}: has address ${alice.address} with publicKey [${alice.publicKey}]`);

    const transfer = api.tx.balances.transfer(BOB, 12345);
    const hash = await transfer.signAndSend(alice);

    console.log('Transfer sent with hash', hash.toHex());

    return res.json({ status: 'success', msg: 'Hello world' });
});


module.exports = app;
