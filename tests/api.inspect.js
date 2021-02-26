/// set env to development
process.env.NODE_ENV = 'development';

const Request = require('supertest');
const assert = require('chai').assert;
const { RequestJudgementCollection } = require('app/db');
const  utils = require('app/utils');

const request = Request('http://localhost:8080');

describe('GET /callback/validationEmail', function() {
    beforeEach(async function() {
        await RequestJudgementCollection.db.connect();

        try {
            await RequestJudgementCollection.db.database.collection(RequestJudgementCollection.collectionName).drop();
        } catch (error) {
            // keep silent
        }
    });
    afterEach(async function() {});

    it('validate successfully', function(done) {
        RequestJudgementCollection.insert({
            nonce: 'nonce',
        }).then(function (_id) {
            const token = utils.createJwtToken({ nonce: 'nonce', _id: _id });
            request
                .get(`/callback/validationEmail?token=${token}`)
                .expect(302)
                .end(async function(err) {
                    if (err) throw err;

                    RequestJudgementCollection.query(_id)
                        .then(function (queriedObjects) {
                            const queriedObject = queriedObjects[0];
                            assert.strictEqual(queriedObject.emailStatus, 'verifiedSuccess');
                            done();
                        });
                });
        });
    });
    it('validate failed', function(done) {
        RequestJudgementCollection.insert({
            nonce: 'nonce',
        }).then(function (_id) {
            const token = utils.createJwtToken({ nonce: 'malicious-nonce', _id: _id });
            request
                .get(`/callback/validationEmail?token=${token}`)
                .expect(302)
                .end(async function(err) {
                    if (err) throw err;

                    RequestJudgementCollection.query(_id)
                        .then(function (queriedObjects) {
                            const queriedObject = queriedObjects[0];

                            assert.strictEqual(queriedObject.emailStatus, 'verifiedFailed');
                            done();
                        });
                });
        });
    });
});

describe('GET /callback/validationElement', function() {
    beforeEach(async function() {
        await RequestJudgementCollection.db.connect();

        try {
            await RequestJudgementCollection.db.database.collection(RequestJudgementCollection.collectionName).drop();
        } catch (error) {
            // keep silent
        }
    });
    afterEach(async function() {});

    it('validate successfully', function(done) {
        RequestJudgementCollection.insert({
            nonce: 'nonce',
        }).then(function (_id) {
            const token = utils.createJwtToken({ nonce: 'nonce', _id: _id });
            request
                .get(`/callback/validationElement?token=${token}`)
                .expect(302)
                .end(async function(err) {
                    if (err) throw err;

                    RequestJudgementCollection.query(_id)
                        .then(function (queriedObjects) {
                            const queriedObject = queriedObjects[0];
                            assert.strictEqual(queriedObject.riotStatus, 'verifiedSuccess');
                            done();
                        });

                });
        });

    });
    it('validate failed', function(done) {
        RequestJudgementCollection.insert({
            nonce: 'nonce',
        }).then(function (_id) {
            const token = utils.createJwtToken({ nonce: 'malicious-nonce', _id: _id });
            request
                .get(`/callback/validationElement?token=${token}`)
                .expect(302)
                .end(async function(err) {
                    if (err) throw err;

                    RequestJudgementCollection.query(_id)
                        .then(function (queriedObjects) {
                            const queriedObject = queriedObjects[0];
                            assert.strictEqual(queriedObject.riotStatus, 'verifiedFailed');
                            done();
                        });
                });
        });
    });
});

describe('GET /callback/validationTwitter', function() {
    beforeEach(async function() {
        await RequestJudgementCollection.db.connect();

        try {
            await RequestJudgementCollection.db.database.collection(RequestJudgementCollection.collectionName).drop();
        } catch (error) {
            // keep silent
        }
    });
    afterEach(async function() {});

    it('validate successfully', function(done) {
        RequestJudgementCollection.insert({
            nonce: 'nonce',
        }).then(function (_id) {
            const token = utils.createJwtToken({ nonce: 'nonce', _id: _id });
            request
                .get(`/callback/validationTwitter?token=${token}`)
                .expect(302)
                .end(async function(err) {
                    if (err) throw err;

                    RequestJudgementCollection.query(_id)
                        .then(function (queriedObjects) {
                            const queriedObject = queriedObjects[0];

                            assert.strictEqual(queriedObject.twitterStatus, 'verifiedSuccess');
                            done();
                        });
                });
        });
    });
    it('validate failed', function(done) {
        RequestJudgementCollection.insert({
            nonce: 'nonce',
        }).then(function (_id) {
            const token = utils.createJwtToken({ nonce: 'malicious-nonce', _id: _id });
            request
                .get(`/callback/validationTwitter?token=${token}`)
                .expect(302)
                .end(async function(err) {
                    if (err) throw err;

                    RequestJudgementCollection.query(_id)
                        .then(function (queriedObjects) {
                            const queriedObject = queriedObjects[0];

                            assert.strictEqual(queriedObject.twitterStatus, 'verifiedFailed');
                            done();
                        });
                });
        });
    });
});
