'use strict';

const app = require('express').Router();

const logger = require('app/logger');
const validator = require('app/validator');
const Chain = require('app/chain');
const { createJwtToken, decodeJwtToken, generateNonce } = require('app/utils');
const { RequestJudgementCollection, RiotCollection } = require('app/db');

const REDIRECT_URL = 'https://www.litentry.com'

app.get('/', async (req, res) => {
    try {
        return res.json({ status: 'success', msg: 'Hello world (Just for debug, will be removed in the future).' });
    } catch (error) {
        logger.error(`GET / unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.post('/chain/eventListener/start', async (req, res) => {
    try {
        let handler = await Chain.eventListenerStart();
        if (handler) {
            return res.json({ status: 'success', msg: 'Event Listener starts successfully.' });
        } else {
            return res.json({ status: 'fail', msg: 'Event Listener fails to start successfully.' });
        }
    } catch (error) {
        logger.error(`GET /chain/event-listneer/start unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.post('/chain/eventListener/stop', async (req, res) => {
    try {
        Chain.eventListenerStop();
        return res.json({ status: 'success', msg: 'Event Listener stops successfully.' });
    } catch (error) {
        logger.error(`GET /chain/eventListener/stop unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.post('/chain/eventListener/restart', async (req, res) => {
    try {
        Chain.eventListenerRestart();
        return res.json({ status: 'success', msg: 'Event Listener stops successfully.' });
    } catch (error) {
        logger.error(`GET /chain/eventListener/restart unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.get('/chain/eventListener/status', async (req, res) => {
    try {
        // FIXME: It's a silly implementation.
        if (Chain.unsubscribeEventListener) {
            return res.json({ status: 'success', msg: 'Running.' });
        } else {
            return res.json({ status: 'success', msg: 'Stop.' });
        }
    } catch (error) {
        logger.error(`GET /chain/eventListener/status unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.post('/chain/provideJudgement', async (req, res) => {
    try {
        const { target, judgement } = req.body;
        const fee = req.body.fee;
        const block = await Chain.provideJudgement(target, judgement, fee);

        return res.json({ status: 'success', msg: block.events, blockHash: block.blockHash });
    } catch (error) {
        logger.error(`GET /chain/provideJudgement unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.post('/validate/email', async (req, res) => {
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

app.get('/callback/validationEmail', async (req, res) => {
    try {
        const { token } = req.query;
        const data = decodeJwtToken(token);
        console.log(data);
        // NOTE: We only extract the first row
        // Theoretically, there should be exact one element in queried array if existed.
        // We filter out the verified email and the request isn't canceld
        const results = await RequestJudgementCollection.query({
            _id: data._id,
            emailStatus: { $ne: 'verifiedSuccess' },
        });
        let { nonce } = results[0];
        if (data.nonce == nonce) {
            await RequestJudgementCollection.setEmailVerifiedSuccessById(data._id);
            // return res.json({ status: 'success', msg: '' });
            return res.redirect(REDIRECT_URL);
        } else {
            await RequestJudgementCollection.setEmailVerifiedFailedById(data._id);
            // return res.json({ status: 'fail', msg: '' });
            return res.redirect(REDIRECT_URL);
        }
    } catch (error) {
        logger.error(`GET /call/validation unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);
        // res.status(400);
        // return res.json({ status: 'fail', msg: new String(error) });
        return res.redirect(REDIRECT_URL);
    }
});

app.get('/callback/validationElement', async (req, res) => {
    try {
        const { token } = req.query;
        const data = decodeJwtToken(token);
        console.log(data);
        // NOTE: We only extract the first row
        // Theoretically, there should be exact one element in queried array if existed.
        // We filter out the verified email and the request isn't canceld
        const results = await RequestJudgementCollection.query({
            _id: data._id,
            riotStatus: { $ne: 'verifiedSuccess' },
        });
        let { nonce } = results[0];

        const rooms = await RiotCollection.query({ riot: results[0].riot });
        const roomId = rooms[0].roomId;
        let content = null;

        if (data.nonce == nonce) {
            await RequestJudgementCollection.setRiotVerifiedSuccessById(data._id);
            content = {
                body: 'Verification from litentry-bot',
                formatted_body: 'Verified successfully.',
                format: 'org.matrix.custom.html',
                msgtype: 'm.text',
            };
        } else {
            await RequestJudgementCollection.setRiotVerifiedFailedById(data._id);
            content = {
                body: 'Verification from litentry-bot',
                formatted_body: 'Verified failed.',
                format: 'org.matrix.custom.html',
                msgtype: 'm.text',
            };
        }
        await validator.ElementValidator.sendMessage(roomId, content);
        return res.redirect(REDIRECT_URL);

    } catch (error) {
        logger.error(`GET /call/validate-element unexcepected error.`);
        console.trace(error);
        return res.redirect(REDIRECT_URL);
    }
});


module.exports = app;
