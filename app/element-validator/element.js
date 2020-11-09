// const express = require('express')
// const app = express()
// const sdk = require('matrix-js-sdk')
const axios = require('axios');
const config = require('./dev_element_config');


async function requestRoomEventHistory(nextSyncToken) {
    let hostUrl = config.elementValidator.hostUrl;
    let roomId = config.elementValidator.roomId;
    let accessToken = config.elementValidator.accessToken;
    let allMessages = hostUrl +  `/_matrix/client/r0/rooms/${roomId}/messages?limit=10&from=${nextSyncToken}&access_token=${accessToken}&dir=b`
    let res = await axios.get(allMessages)
    return res;
}

async function getRoomEventHistory(nextSyncToken, page, isFirstCall, lastReadEventId) {
    console.log('This is stream no.' + page)
    await requestRoomEventHistory(nextSyncToken).then(
        function(result) {
            if (result.data.start == result.data.end) {
                console.log('You have reached the end of room event history');
                return;
            }
            else {
                result.data.chunk.forEach(cur_event => {
                    if (cur_event.event_id == lastReadEventId) {
                        console.log('There is no new event');
                        return;
                    }
                    if (cur_event.type == 'm.room.message') {
                        console.log('------ ' + cur_event.user_id + ' said:');
                        console.log(cur_event.content);
                    }
                });
                //Only request the next page/steam(10 events default), if this is not the first call
                if (!isFirstCall) {
                    nextSyncToken = result.data.end;
                    page += 1;
                    return getRoomEventHistory(nextSyncToken, page, false, lastReadEventId);
                }
            }
        },
        function(error){
            console.log(error);
        }
    );
}

// getRoomEventHistory(``, 0, true, '');

