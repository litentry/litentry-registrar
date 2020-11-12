'use strict';

const app = require('express').Router();


const logger = require('app/logger');
const validator = require('app/validator');
const Chain = require('app/chain');
const { createJwtToken, decodeJwtToken, generateNonce } = require('app/utils');
const { RequestJudgementCollection } = require('app/db');



app.get('/', async(req, res) => {
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

        const nonce = generateNonce();
        const token = createJwtToken({ email: email, nonce: nonce });

        await validator.EmailValidator.invoke(email, token);

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
        console.log(data);

        const { nonce } = await RequestJudgementCollection.query({ email: data.email, account: data.account, emailStatus: { $ne: 'verifiedSuccess' }});
        if (data.nonce == nonce) {
            await RequestJudgementCollection.setEmailVerifiedSuccess(data.account, data.email);
            return res.json({ status: 'success', msg: ''});
        } else {
            await RequestJudgementCollection.setEmailVerifiedFailed(data.account, data.email);
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
