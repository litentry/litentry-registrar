const _ = require('lodash');

const { RequestJudgementCollection } = require('app/db');
const validator = require('app/validator');
const utils = require('app/utils');
const logger = require('app/logger');
const elementValidator = validator.ElementValidator;
const config = require('app/config');


async function job() {
    const interval = config.emailValidator.jobInterval || 60 * 30;
    setInterval(async () => {
        /// If the `riot` field is set, but the `riotStatus` is still null
        /// It's due the unexcepected error occurs in `Event.inoke` phase
        /// We need to do a double check for that.
        const requests = await RequestJudgementCollection.query(
            { $and: [{ riotStatus: { $eq: null } }, { riot: { $ne: null } }] }
        );
        let promises = [];
        for (let request of requests) {
            let nonce = null;
            if (_.isEmpty(request.nonce)) {
                nonce = utils.generateNonce();
                await RequestJudgementCollection.setEmailVerifiedPendingById(request._id, { nonce: nonce });
            } else {
                nonce = request.nonce;
            }
            /// Sanity checking
            if (_.isEmpty(request.status)) {
                /// `Status` can only be `null`, `cancelled`, `verifiedSuccess`
                promises.push(elementValidator.invoke(request));
            }
        }
        if (! _.isEmpty(promises)) {
            await Promise.all(promises);
            promises.length = 0;
        }
        logger.debug(`Run verified riot field for ${requests.length} judgement requests in cron job.`);
    }, 1000 * interval);
}

module.exports = job;
