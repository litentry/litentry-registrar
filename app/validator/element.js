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
    }

    async invoke(account, riotAccount, dbId) {
        let self = this;
        const found = await RequestJudgementCollection.query({ _id: dbId });
        if ((! _.isEmpty(found)) && (found[0].riotStatus === 'verifiedSuccess')) {
            logger.debug(`Already verified riot field successfully.`);
            return;
        }

        const { accessToken, userId, homeServerUrl } = config;
        const client = sdk.createClient({
            baseUrl: homeServerUrl,
            accessToken: accessToken,
            userId: userId,
            cacheLevel: -1,
        });
        let roomId = null;

        client.on('sync', async function(state /*, prevState, res */) {
            // NOTE: state will be 'PREPARED' when the client is ready to use
            if (state === 'PREPARED') {
                const results = await RiotCollection.query({ riot: riotAccount });
                if ((! _.isEmpty(results)) && results[0].roomId) {
                    roomId = results[0].roomId;
                    logger.debug(`Already has room for riot user: ${riotAccount}, corresponding address: ${account},room id: ${roomId}`);
                } else {
                    const { room_id } = await client.createRoom({
                        preset: "trusted_private_chat",
                        invite: [riotAccount],
                        is_direct: true,
                    });

                    roomId = room_id;
                    logger.debug(`Create a new room for riot user: ${riotAccount}, corresponding address: ${account}, room id: ${roomId}`);
                    await RiotCollection.insert({ riot: riotAccount, account: account, roomId: roomId });
                }
                const room = client.getRoom(roomId);
                // console.log(room);
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
                await self.sendMessage(client, roomId, 'Please reply your address: ');
            } else {
                console.log(`Unknown state: ${state}`);
            }
        });

        // Capture user input events
        client.on("Room.timeline", async function(event, room /*, toStartOfTimeline, removed, data */) {
            if (_.isEmpty(roomId)) {
                return;
            }
            if (event.getType() === 'm.room.message' &&
                event.event.sender === riotAccount &&
                roomId === room.roomId
               ) {

                logger.debug(`Receive input from riot user ${riotAccount}, input is: ${event.event.content.body}`);

                // Compare user's inputs with his account on chain
                if (account === event.event.content.body.trim()) {
                    // Verified correctly
                    await RequestJudgementCollection.setRiotVerifiedSuccessById(dbId);
                    await self.sendMessage(client, roomId, 'Verified successfully.');
                } else {
                    // Verified correctly
                    await self.sendMessage(client, roomId, 'You account on chain is mismatched.');
                }
            }
        });

        // client.on("RoomMember.membership", async function(event, member /*, oldMembership*/) {
        //     let roomId = '!xdKhDisLEwtxBryqyQ:matrix.org';
        //     if (event.event.room_id != roomId ||
        //         member.userId === '@litentry-bot:matrix.org') {
        //         return;
        //     }
        //     if (member.membership !== 'join' ||
        //         member.membership !== 'invite') {
        //         logger.debug(`Invite user ${member.userId} ...`);
        //         await self.invite(client, roomId, member.userId);
        //     } else {
        //         logger.debug(`No need to invite a user ${member.userId}`);
        //     }
        // });

        // Start the client
        await client.startClient();
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
}

const elementValidator = new ElementValidator(config);
(async () => {
    const account = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const riotAccount = '@zxchen:matrix.org';
    const dbId = 1;
    await elementValidator.invoke(account, riotAccount, dbId);
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
