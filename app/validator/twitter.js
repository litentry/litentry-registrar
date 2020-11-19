'use strict';

const logger = require('app/logger');
const config = require('app/config');
const TwitterApi = require('twitter');
const Validator = require('app/validator/base');

const { ValidatorEvent } = require('app/validator/events');
const { RequestJudgementCollection } = require('app/db');

class TwitterValidator extends Validator {
  constructor(config, requestJudgementCollection) {
    super(config);
    this._is_twitter_verified = undefined;
    this._db_obj = requestJudgementCollection;
  }

  async invoke(userName, walletAddr) {
    const client = new TwitterApi({
      consumer_key: this.config.consumerKey,
      consumer_secret: this.config.consumerSecret,
      access_token_key: this.config.tokenKey,
      access_token_secret: this.config.tokenSecret
    });

    let caller = setInterval(function(){
      this._poll(client, userName, walletAddr);
      if (this._is_twitter_verified === true) {
        logger.debug("Twitter verification passed, clear interval...")
        clearInterval(caller);
        //await this._db_obj.setTwitterVerifiedSuccess(info.account, info.twitter);
      } else if (this._is_twitter_verified === false) {
        logger.debug("Twitter verification failed, clear interval...")
        clearInterval(caller);
        //await this._db_obj.setTwitterVerifiedFailed(info.account, info.twitter);
      } else {
        logger.debug("Retry polling...")
        // continue polling
      }
    }, this.config.pollingInterval);
    setTimeout(function() {
      clearInterval(caller);
      logger.debug("Twitter polling reached time out, clear interval...")
      return;
    }, this.config.maxPollingTime);
  }

  _poll(client, userName, walletAddr) {
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

const validator = new TwitterValidator(config.twitterValidater, RequestJudgementCollection);

ValidatorEvent.on('handleTwitterVerification', async (info) => {
    logger.debug(`[ValidatorEvent] handle twitter verification: ${JSON.stringify(info)}.`);
    await validator.invoke(info.twitter, info.account);
    logger.debug("Twitter verification task starts running ...");
});

module.exports = TwitterValidator;