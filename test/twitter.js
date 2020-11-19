'use strict';

const TwitterApi = require('twitter');
const Configs = require('dotenv').config();

if (Configs.error) {
  throw Configs.error;
}

const client = new TwitterApi({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.TOKEN_KEY,
  access_token_secret: process.env.TOKEN_SECRET
});


const params = { screen_name: 'LitentryR' };
const walletAddr = "0x12345";

function poolDirectMsg () {
  client.get('users/lookup.json', params, function (error, msgs) {
    var UserId = "";
    if (!error && msgs.length > 0) {
      //console.log(msgs[0].id_str);
      UserId = msgs[0].id_str;
    } else {
      throw Error("Invalid twitter screen name!");
    }

    client.get('direct_messages/events/list', { count: 40 }, function (error, msgs) {
      if (!error && UserId !== "") {
        let obj = msgs.events.find(event => event.message_create.sender_id === UserId);
        if(obj === undefined) {
          // no match found, invoke again after configured interval
          console.log("Nothing from this sender found. Retry after x seconds ...");
        } else {
          // print out msg content
          console.log(obj.message_create.message_data.text);

          if (walletAddr === obj.message_create.message_data.text) {
            console.log("Twitter Check Passed!");
          } else {
            console.log("Twitter Check Failed!");
          }
        }

      } else {
        throw Error("Cannot find the DM from this user");
      }
    });
  });
}

let caller = setInterval(function(){
  poolDirectMsg();
 // if (res === "pass") {
 //   clearInterval(caller);
 // } else if (res === "fail") {
 //   console.log("Fail happened, clear interval...")
 //   clearInterval(caller);
 // } else {
 //   // continue running
 // }
}, 3000);
setTimeout(function() {
  clearInterval(caller);
  console.log("Twitter polling reached time out, clear interval...")
  return;
}, 8000);