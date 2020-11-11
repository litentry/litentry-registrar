'use strict';

const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');
const MongoClient = require('mongodb').MongoClient;

const config = require('app/config').mongodb;
const logger = require('app/logger');


class InMemoryStorage {
    constructor(config) {
        this.config = config;
        this.database = {};
    }
    async connect() {

    }

    async query(collection, filter) {
        const _collection = this.database[collection];
        const keys = _.keys(filter);

        for (let _content of _collection) {
            let cnt = 0;
            for (let key of keys) {
                if (_content[key] && filter[key] != _content[key]) {
                    // one of values is not the same
                    break;
                } else {
                    cnt += 1;
                }
            }
            if (cnt === keys.length) {
                return _content;
            }
        }

        return null;
    }
    async insert(collection, content) {
        const id = uuidv4();
        if (! this.database[collection]) {
            this.database[collection] = [{ ...content, _id: id }];
        } else {
            this.database[collection].push({ ...content, _id: id });
        }
        return id;
    }
    async updateById(collection, id, content) {
        const _collection = this.database[collection];
        for (let _content of _collection) {
            if (_content._id === id) {
                _.merge(_content, content);
                break;
            }
        }
    }
}

class MongodbStorage {
    constructor(config) {
        this.config = config;
        this.client = null;
        this.database = null;
    }

    async connect() {
        if (this.client) {
            logger.debug(`[MongodbStorage.connect] storage is already connected.`);
            return ;
        }

        let endpoint = '';
        if (this.config.username && this.config.password) {
            // NOTE: not tested
            endpoint = `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;
        } else {
            endpoint = `mongodb://${this.config.host}:${this.config.port}`;
        }
        try {
            this.client = new MongoClient(endpoint);
            await this.client.connect();
            this.database = this.client.db(this.config.dbName);
        } catch (error) {
            logger.error(`[Storage.connect] unexpected error occurs: ${error}`);
            console.trace(error);
        }
    }

    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} filter - a filter applied to obtain specific rows
     * @return {*} return a qualified row
     */
    async query(collection, filter) {
        await this.connect();
        const _collection = this.database.collection(collection);
        const result = await _collection.findOne(filter);
        return result;
    }

    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} content - the content to be inserted into database
     * @return {String} return insertedKey associated with this document
     */
    async insert(collection, content) {
        await this.connect();
        const _collection = this.database.collection(collection);
        const result = await _collection.insertOne(content);
        logger.debug(`[MongodbStorage.insert] insert ${result.insertedCount} document into ${collection}, insertedId is: ${result.insertedId}`);
        return result.insertedId;
    }


    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} filter
     * @param {*} content - the content to be updated
     * @return {String} return insertedKey associated with this document
     */
    async update(collection, filter, content) {
        // const filter = { _id: id };
        const options = { upsert: true };
        const updateDoc = { $set: content };
        const _collection = this.database.collection(collection);
        const result = await _collection.updateOne(filter, updateDoc, options);

        logger.debug(`[MongodbStorage.updateByID] update ${result.insertedCount} document into ${collection}, insertedId is: ${result.insertedId}`);
        return result.insertedId;
    }

    async updateById(collection, id, content) {
        const filter = { _id: id };
        return await this.update(collection, filter, content);
    }

    async updateByEmail(collection, email, content) {
        const filter = { email: email };
        return await this.update(collection, filter, content);
    }
    /* eslint-disable-next-line */
    async updateByRiot(collection, riot, content) {
        // TODO:
    }
    /* eslint-disable-next-line */
    async updateByTwitter(collection, twitter, content) {
        // TODO:
    }
}


const storage = config ? new MongodbStorage(config) : new InMemoryStorage(config);

module.exports = {
    Storage: storage
};
