'use strict'

// const express = require('express')
// const app = express()
// const sdk = require('matrix-js-sdk')
const axios = require('axios');
const config = require('./dev_element_config');

let lastReadEventID;
const TARGET_MESSAGE_FOUND = 'TARGET_MESSAGE_FOUND';
let isTargetMessageFoundFlag = false;


function startCheckingTargetMessage(targetUserId, targetMessage, interval=120000, maxWaitingTime=1800000) {
    checkTargetMessageFromHistory(targetUserId, targetMessage, lastReadEventID);
    //Provide 2 sec for checkTargetMessageFromHistory to process and make signal
    setTimeout(function() {  
        setupIntervalCheck(targetUserId, targetMessage, interval, maxWaitingTime);
    }, 2000);
}

//Default interval: 2 min; default waiting time: 30 min
function setupIntervalCheck(targetUserId, targetMessage, interval=120000, maxWaitingTime=1800000) {
    if (isTargetMessageFoundFlag) {
            console.log("The target message was found on first call, quiting...")
            return;
        }
        else {
            let caller = setInterval(function(){
                if (isTargetMessageFoundFlag) {
                    console.log("The target message was found, quiting...")
                    clearInterval(caller);
                    clearTimeout(timeout);
                    return;
                } else {
                    checkTargetMessageFromHistory(targetUserId, targetMessage, lastReadEventID);
                }
    
            }, interval);
            let timeout = setTimeout(function() {
                clearInterval(caller);
                console.log("clearInterval...")
                return;
            }, maxWaitingTime-2000);
        }
}

function checkTargetMessageFromHistory(targetUserId, targetMessage, lastReadEventId='', nextSyncToken='', page=0, isFirstCall=true) {

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
                        console.log('And congratulations! You have found the target message!');
                        return;
                    }
                }
                if (page <= 5) {
                    nextSyncToken = result.data.end;
                    page += 1;
                    return checkTargetMessageFromHistory(targetUserId, targetMessage, lastReadEventId, nextSyncToken, page, false);
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
startCheckingTargetMessage('@testingshark:matrix.org', 'hello', 3000, 60000);
