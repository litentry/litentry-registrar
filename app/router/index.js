'use strict';

const app = require('express').Router();


const logger = require('app/logger');
const validator = require('app/validator');
const Chain = require('app/chain');
const { createJwtToken, decodeJwtToken, generateNonce } = require('app/utils');
// TODO: Use database or store this information on the chain ?
var Storage = {};


app.get('/', async(req, res) => {
    // initialise via static create
    try {
        return res.json({ status: 'success', msg: 'Hello world (Just for debug, will be removed in the future).' });
    } catch (error) {
        logger.error(`GET / unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.post('/chain/eventListener/start', async(req, res) => {
    try {
        let handler = await Chain.eventListenerStart();
        if (handler) {
            return res.json({ status: 'success', msg: 'Event Listener starts successfully.'});
        } else {
            return res.json({ status: 'fail', msg: 'Event Listener fails to start successfully.'});
        }
    } catch (error) {
        logger.error(`GET /chain/event-listneer/start unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error)});
    }
});

app.post('/chain/eventListener/stop', async(req, res) => {
    try {
        Chain.eventListenerStop();
        return res.json({ status: 'success', msg: 'Event Listener stops successfully.'});
    } catch (error) {
        logger.error(`GET /chain/eventListener/stop unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error)});
    }
});

app.post('/chain/eventListener/restart', async(req, res) => {
    try {
        Chain.eventListenerRestart();
        return res.json({ status: 'success', msg: 'Event Listener stops successfully.'});
    } catch (error) {
        logger.error(`GET /chain/eventListener/restart unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error)});
    }

});

app.get('/chain/eventListener/status', async(req, res) => {
    try {
        // FIXME: It's a silly implementation.
        if (Chain.unsubscribeEventListener) {
            return res.json({ status: 'success', msg: 'Running.'});
        } else {
            return res.json({ status: 'success', msg: 'Stop.'});
        }
    } catch (error) {
        logger.error(`GET /chain/eventListener/restart unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error)});
    }

});

app.post('/chain/provideJudgement', async(req, res) => {
    try {
        // const target = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
        // const judgement = "Unknown";
        const { target, judgement } = req.body;
        const fee = req.body.fee;
        const block = await Chain.provideJudgement(target, judgement, fee);

        return res.json({ status: 'success', msg: block.events, blockHash: block.blockHash });
    } catch (error) {
        logger.error(`GET /chain/provideJudgement unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error)});
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
