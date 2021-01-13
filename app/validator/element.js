'use strict';

const axios = require('axios');
const config = require('app/config');
const logger = require('app/logger');
const Validator = require('app/validator/base');
const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

class ElementValidator extends Validator {
    constructor(config) {
        super(config);
        this.lastReadEventID = '';
        this.isTargetMessageFoundFlag = false;
    }

    async invoke(targetUser, targetWalletAddr, databaseId) {
        this.startCheckingTargetMessage(targetUser, targetWalletAddr, databaseId);
    }

    startCheckingTargetMessage(
        targetUserId,
        targetMessage,
        databaseId,
        interval = config.elementValidator.pollingInterval,
        maxWaitingTime = config.elementValidator.maxPollingTime
    ) {
        this.checkTargetMessageFromHistory(targetUserId, targetMessage, databaseId, this.lastReadEventID, true);
        this.setupIntervalCheck(targetUserId, targetMessage, databaseId, interval, maxWaitingTime);
    }

    //Default interval: 5 sec; default waiting time: 50 sec
    setupIntervalCheck(targetUserId, targetMessage, databaseId, interval = 5000, maxWaitingTime = 50000) {
        const self = this;
        const caller = setInterval(async function () {
            await self.checkTargetMessageFromHistory(
                targetUserId,
                targetMessage,
                databaseId,
                self.lastReadEventID,
                false
            );
            //Provide 3 sec for checkTargetMessageFromHistory to process and make signal
            setTimeout(function () {
                if (self.isTargetMessageFoundFlag) {
                    logger.debug('Riot polling: The target message was found, quiting...');
                    clearInterval(caller);
                    clearTimeout(timeout);
                    return;
                }
            }, 3000);
        }, interval);

        const timeout = setTimeout(async function () {
            clearInterval(caller);
            await RequestJudgementCollection.setRiotVerifiedFailedById(databaseId);
            logger.debug(
                `Riot polling for user ${targetUserId} reached time out, set verification as failed and clear interval...`
            );
            return;
        }, maxWaitingTime);
    }

    async checkTargetMessageFromHistory(
        targetUserId,
        targetMessage,
        databaseId,
        lastReadEventId = '',
        isFirstCall = true,
        nextSyncToken = '',
        page = 0
    ) {
        // logger.debug('This is stream no.' + page);
        try {
            const result = await this.requestRoomEventHistory(nextSyncToken);
            if (result) {
                if (result.data.start === result.data.end) {
                    logger.debug('Riot polling: You have reached the end of room event history');
                    return;
                } else {
                    if (page === 0) {
                        this.lastReadEventID = result.data.chunk[0].event_id;
                    }
                    let i;
                    for (i = 0; i < result.data.chunk.length; i++) {
                        let cur_event = result.data.chunk[i];
                        if (cur_event.event_id === lastReadEventId) {
                            logger.debug('Riot polling: There is no more unread event');
                            return;
                        }
                        if (cur_event.type === 'm.room.message') {
                            // console.log('------ ' + cur_event.user_id + ' said:');
                            // console.log(cur_event.content);
                            if (cur_event.user_id === targetUserId && cur_event.content.body === targetMessage) {
                                this.isTargetMessageFoundFlag = true;
                                await RequestJudgementCollection.setRiotVerifiedSuccessById(databaseId);
                                logger.debug('Riot polling: ------ ' + cur_event.user_id + ' said:');
                                logger.debug('Riot polling:' + cur_event.content.body);
                                logger.debug('Riot polling: And congratulations! You have found the target message!');
                                return;
                            }
                        }
                    }

                    if (!isFirstCall) {
                        nextSyncToken = result.data.end;
                        page += 1;
                        return this.checkTargetMessageFromHistory(
                            targetUserId,
                            targetMessage,
                            databaseId,
                            lastReadEventId,
                            false,
                            nextSyncToken,
                            page
                        );
                    }
                }
            } else {
                logger.debug(`Riot polling failed, retry polling...`);
            }
        } catch (err) {
            logger.error('Riot polling: ' + err);
        }
    }

    async requestRoomEventHistory(nextSyncToken) {
        const hostUrl = config.elementValidator.hostUrl;
        const roomId = config.elementValidator.roomId;
        const accessToken = config.elementValidator.accessToken;
        const allMessages =
            hostUrl +
            `/_matrix/client/r0/rooms/${roomId}/messages?limit=10&from=${nextSyncToken}&access_token=${accessToken}&dir=b`;
        const res = await axios.get(allMessages);
        return res;
    }
}

const elementValidator = new ElementValidator(config);

ValidatorEvent.on('handleRiotVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle riot/element verification: ${JSON.stringify(info)}.`);
    const targetRiotUserId = info.riot;
    const targetWalletAddress = info.account;
    const dbId = info._id;
    await elementValidator.invoke(targetRiotUserId, targetWalletAddress, dbId);
});

module.exports = elementValidator;
