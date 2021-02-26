require('dotenv').config({ debug: true });

const assert = require('chai').assert;
const { RequestJudgementCollection } = require('app/db');
const { ValidatorEvent } = require('app/validator/events');
const  utils = require('app/utils');
/* eslint-disable-next-line */
const validator = require('app/validator');

const testEmailAccount = process.env.email;
const testRiotAccount = process.env.riot;
const testTwitterAccount = process.env.twitter;

const TIMEOUT = 3;

describe('Validators', function() {
    this.timeout(20000);
    beforeEach(async function() {
        await RequestJudgementCollection.db.connect();

        try {
            await RequestJudgementCollection.db.database.collection(RequestJudgementCollection.collectionName).drop();
        } catch (error) {
            // keep silent
        }
    });

    afterEach(async function() {
    });


    it('Email/Twitter/Riot Validator', async function() {
        let normalizedInfo = {
            email: testEmailAccount,
            twitter: testTwitterAccount,
            riot: testRiotAccount,
            nonce: 'nonce',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        normalizedInfo['_id'] = insertedId;
        ValidatorEvent.emit('handleEmailVerification', normalizedInfo);
        ValidatorEvent.emit('handleTwitterVerification', normalizedInfo);
        ValidatorEvent.emit('handleRiotVerification', normalizedInfo);

        await utils.sleep(TIMEOUT);

        const [ queriedObject ] = await RequestJudgementCollection.query({ _id: insertedId });

        assert.strictEqual(queriedObject.emailStatus, 'pending');
        assert.strictEqual(queriedObject.twitterStatus, 'pending');
        assert.strictEqual(queriedObject.riotStatus, 'pending');
    });
});
