'use strict';

const _ = require('lodash');
const app = require('express').Router();

const logger = require('app/logger');
const validator = require('app/validator');
const Chain = require('app/chain');
const { decodeJwtToken } = require('app/utils');
const { RequestJudgementCollection, RiotCollection } = require('app/db');
const config = require('app/config');
const emailPage = require('app/pages/email');

const REDIRECT_URL = 'https://www.litentry.com';
const CHAIN_NAME = config.chain.name || '';

app.get(['/', '/health'], async (_, res) => {
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

app.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    const confirmationAddress = `${config.baseUrl}/email-verification?token=${token}`;
    const data = decodeJwtToken(token);

    return res.send(
        emailPage.renderVerifyEmailPage({
            account: data.account,
            chainName: config.chain.name,
            confirmationAddress,
        })
    );
});

app.get('/email-verification', async (req, res) => {
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
            await validator.EmailValidator.sendConfirmationMessage(
                results[0].email,
                results[0].account,
                'verified successfully'
            );
            return res.send(
                emailPage.renderVerificationResultPage({
                    chainName: config.chain.name,
                    account: results[0].account,
                    content: `has been verified successfully at ${new Date().toISOString()}`,
                })
            );
        } else {
            await RequestJudgementCollection.setEmailVerifiedFailedById(data._id);
            await validator.EmailValidator.sendConfirmationMessage(
                results[0].email,
                results[0].account,
                'verification has failed'
            );
            return res.send(
                emailPage.renderVerificationResultPage({
                    chainName: config.chain.name,
                    account: results[0].account,
                    content: 'verification has failed',
                })
            );
        }
    } catch (error) {
        logger.error(`GET /email-verification unexcepected error ${new String(error)}`);
        console.trace(error);
        // res.status(400);
        // return res.json({ status: 'fail', msg: new String(error) });
        return res.redirect(REDIRECT_URL); // TODO: Add error page
    }
});

app.get('/callback/validationElement', async (req, res) => {
    try {
        // NOTE: we ignore the request invoked by element preview url functionality (synapse)
        const userAgent = req.headers['user-agent'] || '';
        logger.info(`UserAgent is: ${userAgent}`);

        if (_.includes(userAgent.toLowerCase(), 'synapse')) {
            // return res.redirect(REDIRECT_URL);
            return req.socket.end();
        }

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
            const msg = `<p>Your Element ownership of <strong><em>${CHAIN_NAME}</em></strong> account</p><pre>${
                results[0].account
            }</pre><p>has been verified successfully at ${new Date().toISOString()}.</p>`;
            content = {
                body: 'Verification from Litentry Bot',
                formatted_body: msg,
                format: 'org.matrix.custom.html',
                msgtype: 'm.text',
            };
        } else {
            await RequestJudgementCollection.setRiotVerifiedFailedById(data._id);
            const msg = `<p>Your Element ownership of <strong><em>${CHAIN_NAME}</em></strong> account</p><pre>${
                results[0].account
            }</pre><p>has been verified failed at ${new Date().toISOString()}.</p>`;
            content = {
                body: 'Verification from Litentry Bot',
                formatted_body: msg,
                format: 'org.matrix.custom.html',
                msgtype: 'm.text',
            };
        }

        const rooms = await RiotCollection.query({ riot: results[0].riot });
        const roomId = rooms[0].roomId;

        await validator.ElementValidator.sendMessage(roomId, content);
        return res.redirect(REDIRECT_URL);
    } catch (error) {
        logger.error(`GET /callback/validationElement unexcepected error ${new String(error)}.`);
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
            content = `Your Twitter ownership of ${CHAIN_NAME} account\n ${
                results[0].account
            } \n\nhas been verified successfully at ${new Date().toISOString()}`;
        } else {
            await RequestJudgementCollection.setTwitterVerifiedFailedById(data._id);
            content = `Your Twitter ownership of ${CHAIN_NAME} account\n ${
                results[0].account
            } \n\nhas been verified failed at ${new Date().toISOString()}`;
        }
        await validator.TwitterValidator.sendMessage(twitter, content);
        return res.redirect(REDIRECT_URL);
    } catch (error) {
        logger.error(`GET /callback/validationTwitter unexcepected error ${new String(error)}.`);
        console.trace(error);
        return res.redirect(REDIRECT_URL);
    }
});

module.exports = app;
