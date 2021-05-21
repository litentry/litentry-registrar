import _ from 'lodash';

import { RequestJudgementCollection } from 'app/db';
import { ElementValidator } from 'app/validator';
import { generateNonce } from 'app/utils';
import logger from 'app/logger';
import config from 'app/config';

export default async function job() {
    const interval = config.emailValidator.jobInterval || 60 * 30;
    setInterval(async () => {
        /// If the `riot` field is set, but the `riotStatus` is still null
        /// It's due the unexcepected error occurs in `Event.inoke` phase
        /// We need to do a double check for that.
        const requests = await RequestJudgementCollection.query({
            $and: [{ riotStatus: { $eq: null } }, { riot: { $ne: null } }],
        });
        let promises = [];
        for (let request of requests) {
            let nonce = null;
            if (_.isEmpty(request.nonce)) {
                nonce = generateNonce();
                await RequestJudgementCollection.setEmailVerifiedPendingById(request._id, { nonce: nonce });
            } else {
                nonce = request.nonce;
            }
            /// Sanity checking
            if (_.isEmpty(request.status)) {
                /// `Status` can only be `null`, `cancelled`, `verifiedSuccess`
                promises.push(ElementValidator.invoke(request));
            }
        }
        if (!_.isEmpty(promises)) {
            await Promise.all(promises);
            promises.length = 0;
        }
        logger.debug(`Run verified riot field for ${requests.length} judgement requests in cron job.`);
    }, 1000 * interval);
}
