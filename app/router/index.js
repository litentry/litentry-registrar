'use strict';

const app = require('express').Router();


const logger = require('app/logger');
const validator = require('app/validator');
const Chain = require('app/chain');
const { createJwtToken, decodeJwtToken, generateNonce, throttle } = require('app/utils');
const { Storage } = require('app/db');



app.get('/', async(req, res) => {
    try {
        // const doc = { name: "Red", town: "kanto" };

        // let collection = 'requestJudgement';
        // let id = await Storage.insert(collection, doc);

        // // id = await Storage.insert(collection, doc);
        // console.log(id);
        // const _doc = await Storage.query(collection, { _id: id });
        // console.log(_doc);

        // await Storage.updateById(collection, id, { name: 'Black', LastName: 'Black' });

        // const __doc = await Storage.query(collection, { _id: id });
        // console.log(__doc);
        // console.log(Storage.database);
        let test = throttle('hello-world', async (x) => { logger.debug(`Hello world: ${x}`); return 'test' } );
        let resp = await test('jack');
        console.log("resp: ", resp);
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
        // const onchainAccount = req.body.account;

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

        const { nonce } = await Storage.query({ email: data.email });

        if (data.nonce == nonce) {
            await Storage.updateByEmail(data.email, { emailStatus: 'verifiedSuccess' });

            return res.json({ status: 'success', msg: ''});
        } else {
            await Storage.updateByEmail(data.email, { emailStatus: 'verifiedFailed' });
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
