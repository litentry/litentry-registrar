const _ = require('lodash');
const config = require('app/config').litentry;
const logger = require('app/logger');
const Chain = require('app/chain');
const { RequestJudgementCollection } = require('app/db');


/**
 * @description Run `provideJudgement` every `interval`
 */
async function job () {
    const interval = config.provideJudgementInterval || 120;
    let promises = [];
    setInterval(async () => {
        if (!_.isEmpty(promises)) {
            return;
        }

        /* Filter out requests according to following conditions:
         * 1. The `riotStatus` is existed and verified successfully.
         * 2. The `emailStatus` is existed and verified successfully.
         * 3. The `twitterStatus` is existed and verified successfully.
         * 4. The `status` is neither cancelled nor verified successfully.
         *    `status` is used to indicate the final status of requested judgement,
         *     can be 'cancelled', 'verifiedSuccess' or not existed.
         */
        const requests = await RequestJudgementCollection.query({
            $and: [
                { $or: [{ riotStatus: { $eq: 'verifiedSuccess' } }, { riot: { $eq: null } }] },
                { $or: [{ emailStatus: { $eq: 'verifiedSuccess' } }, { email: { $eq: null } }] },
                { $or: [{ twitterStatus: { $eq: 'verifiedSuccess' } }, { twitter: { $eq: null } }] },
                { $and: [{ status: { $ne: 'verifiedSuccess' } }, { status: { $ne: 'cancelled' } }] },
                // { updatedAt: { $gte: new Date(new Date() - config.expiredJudgement * 1000) }},
            ],
        });
        logger.debug(`Run provideJudgement for ${requests.length} judgement requests.`);

        const judgement = config.defaultJudgement || 'Unknown';

        for (let request of requests) {
            const target = request.account;

            // Sanity checking
            if (request.email && request.emailStatus !== 'verifiedSuccess') {
                continue;
            }
            if (request.twitter && request.twitterStatus !== 'verifiedSuccess') {
                continue;
            }
            if (request.riot && request.riotStatus !== 'verifiedSuccess') {
                continue;
            }
            if (request.status && request.status !== 'cancelled' && request.status !== 'verifiedSuccess') {
                continue;
            }
            try {
                const resp = await Chain.provideJudgement(target, judgement);
                await RequestJudgementCollection.updateById(request._id, { details: resp, status: 'verifiedSuccess' });
            } catch (e) {
                logger.error(`Error occurs during providing judgement: ${new String(e)}`);
            }
        }
    }, interval * 1000);


}

module.exports = job;
