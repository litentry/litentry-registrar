import _ from 'lodash';

import { RequestJudgementCollection } from 'app/db';
import { TwitterValidator } from 'app/validator';
import { generateNonce } from 'app/utils';
import logger from 'app/logger';
import config from 'app/config';

export default async function job() {
    const interval = config.twitterValidator.jobInterval || 60 * 30;

    setInterval(async () => {
        /// If the `twitter` field is set, but the `twitterStatus` is still null
        /// It's due the unexcepected error occurs in `Event.inoke` phase
        /// We need to do a double check for that.
        /// If `twitterStatus` is set (e.g. pending), it indicates the verification message
        /// has already sent to the target user.
        const requests = await RequestJudgementCollection.query({
            $and: [{ twitterStatus: { $eq: null } }, { twitter: { $ne: null } }],
        });
        let promises: Promise<any>[] = [];
        for (let request of requests) {
            let nonce = null;
            if (_.isEmpty(request.nonce)) {
                nonce = generateNonce();
                await RequestJudgementCollection.setTwitterVerifiedPendingById(request._id, { nonce: nonce });
            } else {
                nonce = request.nonce;
            }
            /// Sanity checking
            if (_.isEmpty(request.status)) {
                /// `Status` can only be `null`, `cancelled`, `verifiedSuccess`
                promises.push(TwitterValidator.invoke(request));
            }
        }
        if (!_.isEmpty(promises)) {
            await Promise.all(promises);
            promises.length = 0;
        }
        logger.debug(`Run verified twitter field for ${requests.length} judgement requests in cron job.`);
    }, 1000 * interval);
}
