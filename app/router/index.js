'use strict';

const app = require('express').Router();
const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;

// const logger = require('app/logger');


app.get('/', async(req, res) => {
    // initialise via static create
    const wsProvider = new WsProvider('wss://rpc.polkadot.io');
    const api = await ApiPromise.create({ provider: wsProvider });
    // make a call to retrieve the current network head
    api.rpc.chain.subscribeNewHeads((header) => {
        console.log(`Chain is at #${header.number}`);
    });

    console.log(api.genesisHash.toHex());
    return res.json({ status: 'success', msg: 'Hello world' });
});


module.exports = app;
