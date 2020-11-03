'use strict';

const app = require('express').Router();
const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const Keyring = require('@polkadot/api').Keyring;

const test1 = '12judcGTM6Pdd5jnHRPQKxf2KoNKv85Nypgb3qG2sTTBxJGq';
const BOB = '168DnmofcoAtFTFY8Dfp7yUk8Eos7o7KbReEjAg7XH38pUaF';

app.get('/', async(req, res) => {
    // initialise via static create
    // const wsProvider = new WsProvider('wss://rpc.polkadot.io');
    const wsProvider = new WsProvider('wss://westend-rpc.polkadot.io');

    const api = await ApiPromise.create({ provider: wsProvider });
    const [now, { nonce, data: balances }] = await Promise.all([
        api.query.timestamp.now(),
        api.query.system.account(test1)
    ]);
    console.log(`${now}: balance of ${balances.free} and a nonce of ${nonce}`);
    console.log(api.genesisHash.toHex());


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
