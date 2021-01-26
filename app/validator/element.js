'use strict';

const _ = require('lodash');
const sdk = require('matrix-js-sdk');
// const axios = require('axios');
const config = require('app/config').elementValidator;
const logger = require('app/logger');
const Validator = require('app/validator/base');
const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection, RiotCollection } = require('app/db');


class ElementValidator extends Validator {
    constructor(config) {
        super(config);
        const { accessToken, userId, homeServerUrl } = config;
        this.client = sdk.createClient({
            baseUrl: homeServerUrl,
            accessToken: accessToken,
            userId: userId,
            cacheLevel: -1,
        });
        this.chainName = 'kusama';
        this.maxRetries = 10;
        this.pollingRoomMessageInterval = 3;
        this.pollingRoomInterval = 2;
    }

    async invoke(account, riotAccount, dbId) {
        /// Check if this judgement already verified
        const found = await RequestJudgementCollection.query({ _id: dbId });
        if ((! _.isEmpty(found)) && (found[0].riotStatus === 'verifiedSuccess')) {
            logger.debug(`Already verified riot field successfully.`);
            return;
        }

        let self = this;
        let roomId = null;
        let client = self.client;

        /// If the client is not running.
        /// Start the client
        if (! client.clientRunning) {
            /// Capture user input events
            client.on("Room.timeline", async function(/* event, room, toStartOfTimeline, removed, data */) {
                /// NOTE: Do nothing, but listening for incoming messages. Do not remove !
            });

            await client.startClient();
        }

        const results = await RiotCollection.query({ riot: riotAccount, account: account });
        if ((! _.isEmpty(results)) && results[0].roomId) {
            roomId = results[0].roomId;
            logger.debug(`Already has room for riot user: ${riotAccount}, corresponding address: ${account},room id: ${roomId}`);
        } else {
            roomId = await self.createRoom(client, riotAccount, account);
        }
        /// Fetch this room from remote.
        /// Make sure we obtain the room instance
        /// If we cannot fetch the room instance, it means this room is destroyed by user (admin) manually.
        /// We need to create a new one.
        let room = await self.getRoom(client, roomId);
        if (_.isEmpty(room)) {
            logger.debug(`Create a new room since the old room ${roomId} isn't found`);
            roomId = await self.createRoom(client, riotAccount, account);
            room = await self.getRoom(client, roomId);
        }

        /// Check if the target riot account join our room or not
        /// If yes, we needn't to invite him/her again
        /// otherwise, we send an invitation request to target riot user
        const joinedMembers = room.getMembersWithMembership('join');
        const isNotJoined = _.isEmpty(_.find(joinedMembers, ['userId', riotAccount]));

        if (isNotJoined) {
            logger.debug(`Riot user ${riotAccount} isn't joined the room.`);
            const invitedMembers = room.getMembersWithMembership('invite');
            if ((! _.isEmpty(invitedMembers)) && (invitedMembers[0].userId === riotAccount)) {
                logger.debug(`Already invited user ${riotAccount}, no need to invite again`);
            } else {
                logger.debug(`Inviting user ${riotAccount}`);
                await self.invite(client, roomId, riotAccount);
            }
        } else {
            logger.debug(`Riot user ${riotAccount} joined the room.`);
        }
        /// Send prompt message to riot user
        logger.debug(`Send prompt message to riot user: ${riotAccount}, roomId: ${roomId}`);
        let messageSentTimestamp = Date.now();
        await self.sendMessage(client, roomId, 'Please reply your address: ');
        /// Poll user's input
        await self.pollRoomMessage(room, riotAccount, account, dbId, messageSentTimestamp);
        /// We keep this connection alive. Never close it
        // await client.stopClient();
    }

    async invite(client, roomId, riotAccount) {
        return new Promise((resolve, reject) => {
            client.invite(roomId, riotAccount, function(err, res) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }
    async sendMessage(client, roomId, body) {
        return new Promise((resolve, reject) => {
            const content = {
                body: body,
                msgtype: 'm.text',
            };

            client.sendEvent(roomId, 'm.room.message', content, '', (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }
    async createRoom(client, riotAccount, account) {
        const { room_id } = await client.createRoom({
            preset: "trusted_private_chat",
            invite: [riotAccount],
            is_direct: true,
        });

        logger.debug(`Create a new room for riot user: ${riotAccount}, room id: ${room_id}`);
        await RiotCollection.upsert(riotAccount, { roomId: room_id, riot: riotAccount, account: account });
        return room_id;
    }
    async getRoom(client, roomId) {
        let self = this;
        return new Promise((resolve) => {
            let retry = 0;
            let room = null;
            let handler = setInterval(() => {
                if (_.isEmpty(room)) {
                    logger.debug(`Try to retrive room by ${roomId}`);
                    room = client.getRoom(roomId);
                    retry += 1;
                    if (! _.isEmpty(room) || retry > self.maxRetries) {
                        logger.debug(`Fetched room by ${roomId} with retry count: ${retry}`);
                        clearInterval(handler);
                        resolve(room);
                    }
                } else {
                    clearInterval(handler);
                    resolve(room);
                }
            }, self.pollingRoomInterval * 1000);
        });
    }
    async pollRoomMessage(room, riotAccount, account, dbId, messageSentTimestamp) {
        /// Sanity check the room value
        if (_.isEmpty(room)) {
            logger.warn(`Room shouldn't be empty. Bug!`);
            return;
        }

        let self = this;
        let client = self.client;

        return new Promise((resolve) => {
            let retry = 0;
            let handler = setInterval(async () => {
                for (let event of room.timeline) {
                    if (event.getType() === 'm.room.message' &&
                        event.event.sender === riotAccount &&
                        event.event.origin_server_ts >= messageSentTimestamp
                       ) {
                        logger.debug(`Receive input from riot user ${event.event.sender}, input is: ${event.event.content.body}`);
                        if (account === event.event.content.body.trim()) {
                            await RequestJudgementCollection.setRiotVerifiedSuccessById(dbId);
                            await self.sendMessage(client, room.roomId, 'Verified successfully.');
                            clearInterval(handler);
                            resolve(true);
                        } else {
                            await self.sendMessage(client, room.roomId, `Your account is mismatched. Please input the right account on ${self.chainName}`);
                        }
                    }
                }
                retry += 1;
                if (retry > self.maxRetries) {
                    clearInterval(handler);
                    resolve(false);
                }
            }, 1000 * self.pollingRoomMessageInterval);
        })
    }
}

const elementValidator = new ElementValidator(config);
(async () => {
    const account = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const riotAccount = '@zxchen:matrix.org';
    await elementValidator.invoke(account, riotAccount, 1);
    console.log('--------------------------------------------------------------------------------');
    // await elementValidator.invoke(account, riotAccount, 2);
    // console.log('--------------------------------------------------------------------------------');
})();

ValidatorEvent.on('handleRiotVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle riot/element verification: ${JSON.stringify(info)}.`);
    // const targetRiotUserId = info.riot;
    // const targetWalletAddress = info.account;
    const account = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const riotAccount = '@zxchen:matrix.org';

    const dbId = info._id;
    await elementValidator.invoke(riotAccount, account, dbId);
});

module.exports = elementValidator;
