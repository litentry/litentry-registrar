import _ from 'lodash';
import { Db, FilterQuery, MongoClient, ObjectId } from 'mongodb';

import config from 'app/config';
import logger from 'app/logger';

type MongoConfig = {
    host: string;
    port: number;
    dbName: string;
    username?: string;
    password?: string;
};

class MongodbStorage {
    private readonly config: MongoConfig;

    private client?: MongoClient;

    public database: Db;

    constructor(config: MongoConfig) {
        this.config = config;
    }

    /**
     * Connect to mongodb
     * TODO: We need to make sure this connection is correct and handle some exceptions if
     *       errors occur.
     */
    async connect() {
        if (this.client) {
            // logger.debug(`[MongodbStorage.connect] storage is already connected.`);
            return;
        }

        let endpoint = '';
        if (this.config.username && this.config.password) {
            // TODO: not tested
            endpoint = `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;
        } else {
            endpoint = `mongodb://${this.config.host}:${this.config.port}`;
        }
        this.client = new MongoClient(endpoint, { useUnifiedTopology: true });

        if (!this.client.isConnected()) {
            await this.client.connect();
            this.database = this.client.db(this.config.dbName);
            logger.info(`[MongodbStorage.connect] connect to mongodb successfully.`);
        }
    }
    /**
     * Disconnect from mongodb
     */
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = undefined;
        }
    }
    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {FilterQuery} filter - a filter applied to obtain specific rows
     * @return {*} return a qualified row
     */
    async query(collection: string, filter: FilterQuery<any>) {
        await this.connect();

        if (_.keys(filter).includes('_id') && _.isString(filter['_id'])) {
            filter['_id'] = new ObjectId(filter['_id']);
        }

        const _collection = this.database.collection(collection);

        const results = await _collection.find(filter).toArray();
        return results;
    }

    async queryById(collection: string, id: string | ObjectId): Promise<any[]> {
        let _id = id;
        if (_.isString(id)) {
            _id = new ObjectId(id);
        }
        const result = await this.query(collection, { _id: _id });
        return result;
    }

    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} content - the content to be inserted into database
     * @return {String} return insertedKey associated with this document
     */
    async insert(collection: string, content: object): Promise<string> {
        await this.connect();
        const _collection = this.database.collection(collection);
        const result = await _collection.insertOne({ ...content, createdAt: new Date(), updatedAt: new Date() });
        logger.debug(
            `[MongodbStorage.insert] insert ${result.insertedCount} document into ${collection}, insertedId is: ${result.insertedId}`
        );
        return result.insertedId;
    }

    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} filter
     * @param {*} content - the content to be updated
     * @return {String} return insertedKey associated with this document
     */
    async update(collection: string, filter: FilterQuery<any>, content: object) {
        await this.connect();

        if (_.keys(filter).includes('_id') && _.isString(filter['_id'])) {
            filter['_id'] = new ObjectId(filter['_id']);
        }
        const options = { upsert: true };

        const updateDoc = { $set: { ...content, updatedAt: new Date() } };
        const _collection = this.database.collection(collection);
        const result = await _collection.updateOne(filter, updateDoc, options);
        // logger.debug(`[MongodbStorage.update] update ${result.modifiedCount} document into ${collection}`);
    }

    async updateById(collection: string, id: string, content: object) {
        const filter = { _id: id };
        return await this.update(collection, filter, content);
    }
}

class RequestJudgementCollection {
    public readonly db: MongodbStorage;

    private readonly collectionName = 'requestJudgement';

    constructor(db: MongodbStorage) {
        this.db = db;
    }

    async insert(content: object) {
        return await this.db.insert(this.collectionName, content);
    }

    async updateById(id: string, content: object) {
        return await this.db.updateById(this.collectionName, id, content);
    }

    async query(filter: FilterQuery<any>) {
        const results = await this.db.query(this.collectionName, filter);
        return results;
    }

    async setEmailVerifiedPendingById(id: string, addition = {}) {
        const filter = { _id: id };
        const content = { emailStatus: 'pending', ...addition };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setEmailVerifiedSuccessById(id: string) {
        const filter = { _id: id };
        const content = { emailStatus: 'verifiedSuccess' };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setEmailVerifiedFailedById(id: string) {
        const filter = { _id: id };
        const content = { emailStatus: 'verifiedFailed' };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setTwitterVerifiedPendingById(id: string, addition = {}) {
        const filter = { _id: id };
        const content = { twitterStatus: 'pending', ...addition };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setTwitterVerifiedSuccessById(id: string) {
        const filter = { _id: id };
        const content = { twitterStatus: 'verifiedSuccess' };
        return await this.db.update(this.collectionName, filter, content);
    }
    async setTwitterVerifiedFailedById(id: string) {
        const filter = { _id: id };
        const content = { twitterStatus: 'verifiedFailed' };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setRiotVerifiedPendingById(id: string, addition: object = {}) {
        const filter = { _id: id };
        const content = { riotStatus: 'pending', ...addition };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setRiotVerifiedSuccessById(id: string) {
        const filter = { _id: id };
        const content = { riotStatus: 'verifiedSuccess' };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setRiotVerifiedFailedById(id: string) {
        const filter = { _id: id };
        const content = { riotStatus: 'verifiedFailed' };
        return await this.db.update(this.collectionName, filter, content);
    }

    async cancel(account: string) {
        /* The account is still not verified, we can set it to be cancelled  */
        await this.db.connect();
        const _collection = this.db.database.collection(this.collectionName);
        const results = await _collection.updateMany(
            { account: account, $and: [{ status: { $ne: 'verifiedSuccess' } }, { status: { $ne: 'cancelled' } }] },
            { $set: { status: 'cancelled' } }
        );
        // logger.debug(`[MongodbStorage.update] update ${results.modifiedCount} document into ${this.collectionName}`);
    }
}

class RiotCollection {
    public readonly db: MongodbStorage;

    private readonly collectionName = 'riot';

    constructor(db: MongodbStorage) {
        this.db = db;
    }

    async upsert(riot: string, content: object) {
        return await this.db.update(this.collectionName, { riot: riot }, content);
    }

    async query(filter: FilterQuery<any>) {
        const results = await this.db.query(this.collectionName, filter);
        return results;
    }
}

class BlockCollection {
    public readonly db: MongodbStorage;

    private readonly collectionName = 'block';

    constructor(db: MongodbStorage) {
        this.db = db;
    }

    async setProcessedBlockHeight(blockHeight: number) {
        return await this.db.update(this.collectionName, { name: 'kusama' }, { blockHeight });
    }

    async getNextBlockHeight(): Promise<number | undefined> {
        const results = await this.db.query(this.collectionName, { name: 'kusama' });
        return results.length > 0 ? results[0].blockHeight + 1 : undefined;
    }
    async reset() {
        const _collection = this.db.database.collection(this.collectionName);
        await _collection.deleteOne({ name: 'kusama' });
    }
}

if (!config.mongodb) {
    throw new Error('Add configuration for mongodb.');
}

const storage = new MongodbStorage(config.mongodb);
const requestJudgementCollection = new RequestJudgementCollection(storage);
const riotCollection = new RiotCollection(storage);
const blockCollection = new BlockCollection(storage);

export { storage as Storage };
export { requestJudgementCollection as RequestJudgementCollection };
export { riotCollection as RiotCollection };
export { blockCollection as BlockCollection };
