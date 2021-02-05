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
         * 4. The `status` is neither canceled nor verified successfully.
         *    `status` is used to indicate the final status of requested judgement,
         *     can be 'canceled', 'verifiedSuccess' or not existed.
         */
        const requests = await RequestJudgementCollection.query({
            $and: [
                { $or: [{ riotStatus: { $eq: 'verifiedSuccess' } }, { riot: { $eq: null } }] },
                { $or: [{ emailStatus: { $eq: 'verifiedSuccess', $exists: true } }, { email: { $eq: null } }] },
                { $or: [{ twitterStatus: { $eq: 'verifiedSuccess', $exists: true } }, { twitter: { $eq: null } }] },
                { $and: [{ status: { $ne: 'verifiedSuccess' } }, { status: { $ne: 'canceled' } }] },
            ],
        });
        logger.debug(`Run provideJudgement for ${requests.length} judgement requests.`);

        const judgement = config.defaultJudgement || 'Unknown';
        const fee = null;

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
            if (request.status && request.status !== 'canceled' && request.status !== 'verifiedSuccess') {
                continue;
            }
            /* eslint-disable-next-line */
            const promise = new Promise(async (resolve, reject) => {
                const resp = await Chain.provideJudgement(target, judgement, fee);
                await RequestJudgementCollection.updateById(request._id, { details: resp, status: 'verifiedSuccess' });
                resolve(true);
            });
            promises.push(promise);
        }
        /* Run all asynchronous tasks at the same time */
        if (!_.isEmpty(promises)) {
            await Promise.all(promises);
            /* Clear all elements in array */
            promises.length = 0;
        }
    }, interval * 1000);


}

module.exports = job;
