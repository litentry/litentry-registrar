require('dotenv').config({ debug: true });

const { RequestJudgementCollection, RiotCollection } = require('app/db');
const assert = require('chai').assert;

describe(`RequestJudgement Test`, function () {
    beforeEach(async function () {
        await RequestJudgementCollection.db.connect();

        try {
            await RequestJudgementCollection.db.database.collection(RequestJudgementCollection.collectionName).drop();
        } catch (error) {
            // keep silent
        }
    });

    it('Create & Query a RequestJudgement', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.twitter, normalizedInfo.twitter);
        assert.strictEqual(queriedObject.riot, normalizedInfo.riot);
        assert.strictEqual(queriedObject.email, normalizedInfo.email);
        assert.strictEqual(queriedObject.display, normalizedInfo.display);
    });
    it('Set email status pending', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setEmailVerifiedPendingById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.emailStatus, 'pending');
    });
    it('Set email status verifiedSuccess', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setEmailVerifiedSuccessById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.emailStatus, 'verifiedSuccess');
    });
    it('Set email status verifiedFailed', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setEmailVerifiedFailedById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.emailStatus, 'verifiedFailed');
    });
    it('Set twitter status pending', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setTwitterVerifiedPendingById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.twitterStatus, 'pending');
    });
    it('Set twitter status verifiedSuccess', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setTwitterVerifiedSuccessById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.twitterStatus, 'verifiedSuccess');
    });
    it('Set twitter status verifiedFailed', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setTwitterVerifiedFailedById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.twitterStatus, 'verifiedFailed');
    });
    it('Set element status pending', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setRiotVerifiedPendingById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.riotStatus, 'pending');
    });
    it('Set element status verifiedSuccess', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setRiotVerifiedSuccessById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.riotStatus, 'verifiedSuccess');
    });
    it('Set element status verifiedFailed', async function () {
        const normalizedInfo = {
            twitter: 'twitter',
            email: 'email',
            riot: 'riot',
            display: 'display',
        };
        const insertedId = await RequestJudgementCollection.insert(normalizedInfo);
        await RequestJudgementCollection.setRiotVerifiedFailedById(insertedId);
        const [queriedObject] = await RequestJudgementCollection.query({ _id: insertedId });
        assert.strictEqual(queriedObject.riotStatus, 'verifiedFailed');
    });

    it('Create & Query riot account and room id mapping', async function () {
        const riotAccount = 'riot-account';
        const roomId = 'room-id';
        await RiotCollection.upsert(riotAccount, { roomId: roomId, riot: riotAccount });
        const [queriedObject] = await RiotCollection.query({ riot: riotAccount });

        assert.strictEqual(queriedObject.riot, riotAccount);
        assert.strictEqual(queriedObject.roomId, roomId);

        const upsertedId = queriedObject._id.toString();
        await RiotCollection.upsert(riotAccount, { roomId: 'updated-room-id', riot: riotAccount });
        const [updatedQueriedObject] = await RiotCollection.query({ riot: riotAccount });
        assert.strictEqual(updatedQueriedObject.roomId, 'updated-room-id');
        assert.strictEqual(upsertedId, updatedQueriedObject._id.toString());
    });
});
