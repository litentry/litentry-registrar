'use strict';

const jwt = require('jsonwebtoken');
const app = require('express').Router();


const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const Keyring = require('@polkadot/api').Keyring;

const logger = require('app/logger');
const config = require('app/config');
const validator = require('app/validator');
const Chain = require('app/chain');

// TODO: Use database or store this information on the chain ?
var Storage = {};


function createJwtToken(data) {
    let options = {};
    return jwt.sign(data, 'session_secret', options);
}

function decodeJwtToken(token) {
    const data = jwt.verify(token, 'session_secret');
    return data;
}

function generateNonce(length=6) {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

app.get('/', async(req, res) => {
    // initialise via static create
    try {
        // const wsProvider = new WsProvider(`${config.chain.protocol}://${config.chain.provider}`);
        // const api = await ApiPromise.create({ provider: wsProvider });

        // const keyring = new Keyring({ type: 'sr25519' });

        // let account = '168DnmofcoAtFTFY8Dfp7yUk8Eos7o7KbReEjAg7XH38pUaF';
        // let resp = await api.query.identity.identityOf(account);
        // console.log(resp);
        // await Chain.setIdentity({ email: 'czxczf@gmail.com', display: 'zxchen' });
        Chain.watch();

        return res.json({ status: 'success', msg: 'Hello world (Just for debug, will be removed in the future).' });
    } catch (error) {
        logger.error(`GET / unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.post('/validate/email', async(req, res) => {
    try {
        const { email } = req.body;
        // const onchainAccount = '168DnmofcoAtFTFY8Dfp7yUk8Eos7o7KbReEjAg7XH38pUaF';
        const onchainAccount = req.body.account;

        const nonce = generateNonce();
        Storage[email] = { nonce: nonce, onchainAccount: onchainAccount };
        const token = createJwtToken({ email: email, nonce: nonce });

        await validator.EmailValidator.invoke(email, token);

        // await sendTransaction(onchainAccount, 12345);
        // await Chain.SetIdentity({ email: data.email });

        return res.json({ status: 'success', msg: '' });
    } catch (error) {
        logger.error(`POST /validate/email unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.get('/callback/validation', async(req, res) => {
    try {
        const { token } = req.query;
        const data = decodeJwtToken(token);
        const { nonce }= Storage[data.email];

        if (data.nonce == nonce) {
            return res.json({ status: 'success', msg: ''});
        } else {
            return res.json({ status: 'fail', msg: ''});
        }
    } catch (error) {
        logger.error(`GET /call/validation unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);
        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});


module.exports = app;
