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

const params = { screen_name: 'nodejs' };

client.get('direct_messages/events/list', params, function (error, msgs) {
  if (!error) {
    console.log(msgs.events);
  } else {
    console.error(error);
  }


});

