'use strict';

const TwitterApi = require('twitter');
const Configs = require('dotenv').config();

const client = new TwitterApi({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.TOKEN_KEY,
  access_token_secret: process.env.TOKEN_SECRET
});

var params = {screen_name: 'nodejs'};
client.get('direct_messages/welcome_message/list', params, function(error, tweets, response) {
  if (!error) {
    console.log(response);
  }else{
    console.error(error);
  }
});
client.get('direct_messages/events/show.json?id=1324362009534734340', params, function(error, tweets, response) {
  if (!error) {
    console.log(response);
  }else{
    console.error(error);
  }
});