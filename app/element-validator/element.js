'use strict'

// const express = require('express')
// const app = express()
// const sdk = require('matrix-js-sdk')
const axios = require('axios');
const config = require('./dev_element_config');


function checkTargetMessageFromHistory(targetUserId, targetMessage) {
    getRoomEventHistory(targetUserId, targetMessage,'', 0, true, '');
}

async function getRoomEventHistory(targetUserId, targetMessage, nextSyncToken, page, isFirstCall, lastReadEventId) {

    console.log('This is stream no.' + page)
    await requestRoomEventHistory(nextSyncToken).then(
        function(result) {
            if (result.data.start == result.data.end) {
                console.log('You have reached the end of room event history');
                return;
            }
            else {
                let i;
                for (i=0; i<result.data.chunk.length; i++) {
                    let cur_event = result.data.chunk[i];
                    if (cur_event.event_id == lastReadEventId) {
                        console.log('There is no more new event');
                        return;
                    }
                    if (cur_event.type == 'm.room.message') {
                        console.log('------ ' + cur_event.user_id + ' said:');
                        console.log(cur_event.content);
                    }
                    if (cur_event.user_id == targetUserId && cur_event.content.body == targetMessage) {
                        console.log('And congratulations! You have found the target message!');
                        return;
                    }
                }
                //Only request the next page/steam of the 10 events, if this is not the first call
                // if (!isFirstCall) {
                if (page <= 5) {
                    nextSyncToken = result.data.end;
                    page += 1;
                    return getRoomEventHistory(targetUserId, targetMessage, nextSyncToken, page, false, lastReadEventId);
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

// getRoomEventHistory('','',``, 0, false, '');
// checkTargetMessageFromHistory('@testingshark:matrix.org', 'hlel');

