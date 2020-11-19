'use strict'

const axios = require('axios');
const config = require('app/config');
const logger = require('app/logger');
const Validator = require('app/validator/base');
const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');
// const utils = require('app/utils');
let lastReadEventID;
let isTargetMessageFoundFlag = false;

class ElementValidator extends Validator {
    constructor(config) {
        super(config);
    }

    async invoke(targetUser, targetWalletAddr, databaseId) {
        startCheckingTargetMessage(targetUser, targetWalletAddr, databaseId);
    }
}

const validator = new ElementValidator(config);

ValidatorEvent.on('handleRiotVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle riot/element verification: ${JSON.stringify(info)}.`);
    const targetRiotUserId = info.riot;
    const targetWalletAddress = info.account;
    const dbId = info._id;
    await validator.invoke(targetRiotUserId, targetWalletAddress, dbId);
});

module.exports = validator;

function startCheckingTargetMessage(targetUserId, targetMessage, databaseId, interval=120000, maxWaitingTime=1800000) {
    checkTargetMessageFromHistory(targetUserId, targetMessage, databaseId, lastReadEventID, true);
    setupIntervalCheck(targetUserId, targetMessage, databaseId, interval, maxWaitingTime);
}

//Default interval: 2 min; default waiting time: 30 min
function setupIntervalCheck(targetUserId, targetMessage, databaseId, interval=120000, maxWaitingTime=1800000) {
    if (isTargetMessageFoundFlag) {
        console.log("The target message was found on first call, quiting...")
        return;
    }
    
    let caller = setInterval(function(){
        checkTargetMessageFromHistory(targetUserId, targetMessage, databaseId, lastReadEventID, false);
        //Provide 3 sec for checkTargetMessageFromHistory to process and make signal
        setTimeout(function() {
            if (isTargetMessageFoundFlag) {
                console.log("The target message was found, quiting...")
                clearInterval(caller);
                clearTimeout(timeout);
                return;
            }
        }, 3000);

    }, interval);

    let timeout = setTimeout(function() {
        clearInterval(caller);
        console.log("Max waiting time has passed, clearInterval...")
        return;
    }, maxWaitingTime);
    
}

function checkTargetMessageFromHistory(targetUserId, targetMessage, databaseId, lastReadEventId='', isFirstCall=true, nextSyncToken='', page=0) {

    console.log('This is stream no.' + page);
    requestRoomEventHistory(nextSyncToken).then(
        function(result) {
            if (result.data.start == result.data.end) {
                console.log('You have reached the end of room event history');
                return;
            }
            else {
                if (page == 0) {
                    lastReadEventID = result.data.chunk[0].event_id;
                }
                let i;
                for (i=0; i<result.data.chunk.length; i++) {
                    let cur_event = result.data.chunk[i];
                    if (cur_event.event_id == lastReadEventId) {
                        console.log('There is no more unread event');
                        return;
                    }
                    if (cur_event.type == 'm.room.message') {
                        console.log('------ ' + cur_event.user_id + ' said:');
                        console.log(cur_event.content);
                    }
                    if (cur_event.user_id == targetUserId && cur_event.content.body == targetMessage) {
                        isTargetMessageFoundFlag = true;
                        RequestJudgementCollection.setRiotVerifiedSuccessById(databaseId);
                        console.log('And congratulations! You have found the target message!');
                        return;
                    }
                }
                
                if (!isFirstCall) {
                    nextSyncToken = result.data.end;
                    page += 1;
                    return checkTargetMessageFromHistory(targetUserId, targetMessage, databaseId, lastReadEventId, false, nextSyncToken, page);
                }
            }
        },
        function(error){
            console.log(error);
        }
    );
}

async function requestRoomEventHistory(nextSyncToken) {
    let hostUrl = config.elementValidator.hostUrl;
    let roomId = config.elementValidator.roomId;
    let accessToken = config.elementValidator.accessToken;
    let allMessages = hostUrl +  `/_matrix/client/r0/rooms/${roomId}/messages?limit=10&from=${nextSyncToken}&access_token=${accessToken}&dir=b`
    let res = await axios.get(allMessages)
    return res;
}

// startCheckingTargetMessage('@testingshark:matrix.org', 'hello testing', 15000, 120000);
