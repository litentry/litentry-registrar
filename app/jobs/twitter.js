const _ = require('lodash');

const { RequestJudgementCollection } = require('app/db');
const validator = require('app/validator');
const utils = require('app/utils');
const logger = require('app/logger');
const twitterValidator = validator.TwitterValidator;
const config = require('app/config');


async function job() {
    const interval = config.twitterValidator.jobInterval || 60 * 30;

    setInterval(async () => {
        /// If the `twitter` field is set, but the `twitterStatus` is still null
        /// It's due the unexcepected error occurs in `Event.inoke` phase
        /// We need to do a double check for that.
        /// If `twitterStatus` is set (e.g. pending), it indicates the verification message
        /// has already sent to the target user.
        const requests = await RequestJudgementCollection.query(
            { $and: [{ twitterStatus: { $eq: null } }, { twitter: { $ne: null } }] }
        );
        let promises = [];
        for (let request of requests) {
            let nonce = null;
            if (_.isEmpty(request.nonce)) {
                nonce = utils.generateNonce();
                await RequestJudgementCollection.setTwitterVerifiedPendingById(request._id, { nonce: nonce });
            } else {
                nonce = request.nonce;
            }
            const token = utils.createJwtToken({ nonce: nonce, _id: request._id });
            /// Sanity checking
            if (_.isEmpty(request.status)) {
                /// `Status` can only be `null`, `canceled`, `verifiedSuccess`
                promises.push(twitterValidator.invoke(request.twitter, token));
            }
        }
        if (! _.isEmpty(promises)) {
            await Promise.all(promises);
            promises.length = 0;
        }
        logger.debug(`Run verified twitter field for ${requests.length} judgement requests in cron job.`);
    }, 1000 * interval);
}

module.exports = job;
