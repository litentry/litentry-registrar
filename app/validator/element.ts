import _ from 'lodash';
import { createClient, MatrixClient, Room } from 'matrix-js-sdk';
import config from 'app/config';
import logger from 'app/logger';
import Validator from './base';
import { ValidatorEvent } from 'app/validator/events';
import { RequestJudgementCollection, RiotCollection } from 'app/db';
import { createJwtToken } from 'app/utils';
import Config from 'types/config';

const CHAIN_NAME = config.chain.name || '';

class ElementValidator extends Validator {
    private readonly chainName = 'kusama';
    private readonly maxRetries = 10;
    private readonly pollingRoomMessageInterval = 3;
    private readonly pollingRoomInterval = 2;
    private readonly client: MatrixClient;

    constructor(config: Config) {
        super(config);
        const { accessToken, userId, homeServerUrl } = config.elementValidator;
        this.client = createClient({
            baseUrl: homeServerUrl,
            accessToken: accessToken,
            userId: userId,
        });
    }

    async _invoke(riotAccount: string, token: string, account: string) {
        let roomId = null;

        /// If the client is not running, start the client
        // @ts-ignore
        if (!this.client.clientRunning) {
            /// NOTE: Do nothing, but listening for incoming messages. Do not remove !
            /// Capture user input events
            this.client.on('Room.timeline', async function (/* event, room, toStartOfTimeline, removed, data */) {});
            await this.client.startClient();
        }

        const results = await RiotCollection.query({ riot: riotAccount });
        if (!_.isEmpty(results) && results[0].roomId) {
            roomId = results[0].roomId;
            logger.debug(`Already has room for riot user: ${riotAccount}, room id: ${roomId}`);
        } else {
            roomId = await this.createRoom(riotAccount);
        }
        /// Fetch this room from remote.
        /// Make sure we obtain an avaiable room instance
        /// If we cannot fetch the room instance, it means this room is destroyed by user (admin) manually.
        /// We need to create a new one.
        let room = await this.getRoom(roomId);
        if (_.isEmpty(room)) {
            logger.debug(`Create a new room since the old room ${roomId} isn't found`);
            roomId = await this.createRoom(riotAccount);
            room = await this.getRoom(roomId);
        }

        /// Check if the target riot account join our room or not
        /// If yes, we needn't to invite him/her again
        /// otherwise, we send an invitation request to target riot user
        const joinedMembers = room!.getMembersWithMembership('join');
        const isNotJoined = _.isEmpty(_.find(joinedMembers, ['userId', riotAccount]));

        if (isNotJoined) {
            logger.debug(`Riot user ${riotAccount} isn't joined the room.`);
            const invitedMembers = room!.getMembersWithMembership('invite');
            /// Expectation: the `invitedMembers` only contains at most *one* element, and the `userId`
            /// should be equal to our `riotAccount`.
            /// However, the invited user may be corrupted by malicious user.
            /// Case: malicious user join the group and invite another person, then left the group.
            /// In this case, we simply think the invited user is our target riot user.
            /// Don't send invitation again
            if (
                !_.isEmpty(invitedMembers)
                // && invitedMembers[0].userId === riotAccount
            ) {
                logger.debug(`Already invited user ${riotAccount}, no need to invite again`);
            } else {
                logger.debug(`Inviting user ${riotAccount}`);
                await this.invite(roomId, riotAccount);
            }
        } else {
            logger.debug(`Riot user ${riotAccount} already joined the room.`);
        }
        /// Send prompt message to riot user
        let messageSentTimestamp = Date.now();
        logger.debug(
            `Send prompt message to riot user: ${riotAccount}, roomId: ${roomId} at timestamp: ${messageSentTimestamp}`
        );

        const link = `${config.baseUrl}/verify-element-account?token=${token}`;

        const msg = `<h4>Verification From Litentry Registrar</h4><p>Thank you for using the Registrar service from <strong><em>Litentry</em></strong>. You have submitted an identity verification on <strong><em>${CHAIN_NAME}</em></strong> network. And the account connected to this verification is</p><pre>${account}</pre><p>If you have initiated this verification and are the account owner, please click the following link to finish the process. If not, you can safely ignore this message.</p><p>If you have any questions during the verification process, please contact our support at registrar-support@litentry.com or #litentry-registrar-support:matrix.org on Element.</p><p></p><a href="${link}">Click me to verify your account</a><p></p><p></p>`;
        const content = {
            body: 'Verification from Litentry Bot',
            formatted_body: msg,
            format: 'org.matrix.custom.html',
            msgtype: 'm.text',
        };

        const resp = await this.sendMessage(roomId, content);
        return resp;
    }

    async invoke(info: { nonce: string; _id: string; riot: string; account: string }) {
        const riotAccount = info.riot;
        const token = createJwtToken({ nonce: info.nonce, _id: info._id });
        try {
            await this._invoke(riotAccount, token, info.account);
            await RequestJudgementCollection.setRiotVerifiedPendingById(info._id);
        } catch (error) {
            /// We need a method to detect failure
            logger.error(`Unexpected error occurs`);
            console.trace(error);
        }
    }

    async invite(roomId: string, riotAccount: string) {
        const result = await this.client.invite(roomId, riotAccount);
        return result;
    }

    async sendMessage(roomId: string, content: object) {
        const result = await this.client.sendEvent(roomId, 'm.room.message', content, '');
        return result;
    }

    async createRoom(riotAccount: string) {
        logger.debug(`Create a new room for riot user: ${riotAccount}`);
        const { room_id } = await this.client.createRoom({
            preset: 'trusted_private_chat',
            invite: [riotAccount],
            is_direct: true,
        });

        logger.debug(`room id: ${room_id}`);

        await RiotCollection.upsert(riotAccount, { roomId: room_id, riot: riotAccount });
        return room_id;
    }

    async getRoom(roomId: string): Promise<Room | null> {
        return new Promise((resolve) => {
            let retry = 0;
            let room: Room | null = null;
            let handler = setInterval(async () => {
                if (_.isEmpty(room)) {
                    logger.debug(`Try to retrive room by ${roomId}`);
                    room = await this.client.getRoom(roomId);
                    retry += 1;
                    if (!_.isEmpty(room) || retry > this.maxRetries) {
                        logger.debug(`Fetched room by ${roomId} with retry count: ${retry}`);
                        clearInterval(handler);
                        resolve(room);
                    }
                } else {
                    clearInterval(handler);
                    resolve(room);
                }
            }, this.pollingRoomInterval * 1000);
        });
    }
}

const validator = new ElementValidator(config);

ValidatorEvent.on('handleRiotVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle riot/element verification: ${JSON.stringify(info)}.`);
    await validator.invoke(info);
});

export default validator;
