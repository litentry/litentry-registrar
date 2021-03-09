'use strict';

const app = require('express').Router();

const logger = require('app/logger');
const validator = require('app/validator');
const Chain = require('app/chain');
const { decodeJwtToken } = require('app/utils');
const { RequestJudgementCollection, RiotCollection } = require('app/db');

const REDIRECT_URL = 'https://www.litentry.com';


app.get(['/', '/health'], async (req, res) => {
    res.send();
});


app.post('/chain/provideJudgement', async (req, res) => {
    try {
        const { target, judgement } = req.body;
        const block = await Chain.provideJudgement(target, judgement);

        return res.json({ status: 'success', msg: block.events, blockHash: block.blockHash });
    } catch (error) {
        logger.error(`GET /chain/provideJudgement unexcepected error ${JSON.stringify(error)}`);
        console.trace(error);

        res.status(400);
        return res.json({ status: 'fail', msg: new String(error) });
    }
});

app.get('/callback/validationEmail', async (req, res) => {
    try {
        const { token } = req.query;
        const data = decodeJwtToken(token);
        // NOTE: We only extract the first row
        // Theoretically, there should be exact one element in queried array if existed.
        // We filter out the verified email and the request isn't cancelled
        const results = await RequestJudgementCollection.query({
            _id: data._id,
            emailStatus: { $ne: 'verifiedSuccess' },
        });
        const { nonce } = results[0];
        if (data.nonce == nonce) {
            await RequestJudgementCollection.setEmailVerifiedSuccessById(data._id);
            await validator.EmailValidator.sendConfirmationMessage(results[0].email, 'Verified successfully');
        } else {
            await RequestJudgementCollection.setEmailVerifiedFailedById(data._id);
            await validator.EmailValidator.sendConfirmationMessage(results[0].email, 'Verified Failed');
        }
        return res.redirect(REDIRECT_URL);
    } catch (error) {
        logger.error(`GET /callback/validationEmail unexcepected error ${JSON.stringify(error)}`);
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

        // NOTE: We only extract the first row
        // Theoretically, there should be exact one element in queried array if existed.
        // We filter out the verified element and the request isn't cancelled
        const results = await RequestJudgementCollection.query({
            _id: data._id,
            riotStatus: { $ne: 'verifiedSuccess' },
        });
        const { nonce } = results[0];
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

        const rooms = await RiotCollection.query({ riot: results[0].riot });
        const roomId = rooms[0].roomId;

        await validator.ElementValidator.sendMessage(roomId, content);
        return res.redirect(REDIRECT_URL);
    } catch (error) {
        logger.error(`GET /callback/validationElement unexcepected error.`);
        console.trace(error);
        return res.redirect(REDIRECT_URL);
    }
});

app.get('/callback/validationTwitter', async (req, res) => {
    try {
        const { token } = req.query;
        const data = decodeJwtToken(token);
        // NOTE: We only extract the first row
        // Theoretically, there should be exact one element in queried array if existed.
        // We filter out the verified twitter and the request isn't cancelled
        const results = await RequestJudgementCollection.query({
            _id: data._id,
            twitterStatus: { $ne: 'verifiedSuccess' },
        });
        const { nonce, twitter } = results[0];

        let content = null;

        if (data.nonce == nonce) {
            await RequestJudgementCollection.setTwitterVerifiedSuccessById(data._id);
            content = 'Verified successfully';
        } else {
            await RequestJudgementCollection.setTwitterVerifiedFailedById(data._id);
            content = 'Verified failed';
        }
        await validator.TwitterValidator.sendMessage(twitter, content);
        return res.redirect(REDIRECT_URL);
    } catch (error) {
        logger.error(`GET /callback/validationTwitter unexcepected error.`);
        console.trace(error);
        return res.redirect(REDIRECT_URL);
    }
});


module.exports = app;
