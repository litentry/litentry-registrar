'use strict';

const logger = require('app/logger');
const TwitterApi = require('twitter');
const Configs = require('dotenv').config();
const validator = require('app/validator/base');

const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

if (Configs.error) {
  throw Configs.error;
}

const client = new TwitterApi({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.TOKEN_KEY,
  access_token_secret: process.env.TOKEN_SECRET
});

class TwitterValidator extends Validator {
  constructor(config) {
    super(config);
    this._is_twitter_verified = undefined;
  }

  async invoke(userName, walletAddr) {
    let caller = setInterval(function(){
      this._poll(userName, walletAddr);
      if (this._is_twitter_verified === true || this._is_twitter_verified === false) {
        logger.debug("Got a result, clear interval...")
        clearInterval(caller);
      } else {
        logger.debug("Retry polling...")
        // continue polling
      }
    }, 5000);
    setTimeout(function() {
      clearInterval(caller);
      logger.debug("Twitter polling reached time out, clear interval...")
      return;
    }, 8000);
  }

  _poll(userName, walletAddr) {
    const params = { screen_name: userName };

    client.get('users/lookup.json', params, function (error, msgs) {
      var UserId = "";
      if (!error && msgs.length > 0) {
        //logger.debug(msgs[0].id_str);
        UserId = msgs[0].id_str;
      } else {
        throw Error("Invalid twitter screen name!");
      }

      client.get('direct_messages/events/list', { count: 40 }, function (error, msgs) {
        if (!error && UserId !== "") {
          let obj = msgs.events.find(event => event.message_create.sender_id === UserId);
          if(obj === undefined) {
            // no match found, invoke again after configured interval
            logger.debug("Nothing from this sender found. Retry after some seconds ...");
          } else {
            // print out msg content
            logger.debug(obj.message_create.message_data.text);
            if (walletAddr === obj.message_create.message_data.text) {
              logger.debug("Twitter Check Passed!");
              this._is_twitter_verified = true;
            } else {
              logger.debug("Twitter Check Failed!");
              this._is_twitter_verified = false;
            }
          }
        } else {
          throw Error("Cannot find the DM from this user");
        }
      });
    });
  }
}

ValidatorEvent.on('handleTwitterVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle twitter verification: ${JSON.stringify(info)}.`);
    await validator.invoke(info.twitter, info.account);
    if (validator._is_twitter_verified === true) {
      await RequestJudgementCollection.setTwitterVerifiedSuccess(info.account, info.twitter);
    } else if (validator._is_twitter_verified === false) {
      await RequestJudgementCollection.setTwitterVerifiedFailed(info.account, info.twitter);
    }
});

module.exports = TwitterValidator;