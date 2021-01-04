const _ = require('lodash');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const LRU = require('lru-cache');

const logger = require('app/logger');
const config = require('app/config');

function createJwtToken(data) {
    let options = {};
    if (_.isNil(data.iat)) {
        options.noTimestamp = true;
    }
    if (_.isNil(data.exp)) {
        options.expiresIn = config.jwt.expiresIn;
    }
    return jwt.sign(data, config.jwt.sessionSecret, options);
}

function decodeJwtToken(token) {
    const data = jwt.verify(token, config.jwt.sessionSecret);
    return data;
}

function generateNonce(length = 6) {
    return crypto.randomBytes(length).toString('hex');
}

const waitingTime = config.litentry.requestJudgementInterval || 60 * 1000; // 60 seconds
const funcCacheSize = 4096;
var FunctionCache = new LRU(funcCacheSize);

/**
 * Invoke a function `func` every `waitingTime`
 * @param (String) funcId - the id of a throttled function
 * @param (Funcntion) func - the function to be throttled
 * @return (*) return the returns of throttled functions
 */
function throttle(funcId, func) {
    return async function throttled() {
        let scheduled = FunctionCache.get(funcId);

        if (scheduled) {
            logger.debug(`[throttle] ${func.name} is throttled, cannot be invoked at this moment.`);
            return;
        }

        scheduled = setTimeout(() => {
            FunctionCache.set(funcId, undefined);
            clearTimeout(scheduled);
        }, waitingTime);

        FunctionCache.set(funcId, scheduled);

        const context = this;
        const args = arguments;
        const resp = await func.apply(context, args);
        /* eslint-disable-next-line */
        return resp;
    };
}

module.exports = {
    createJwtToken: createJwtToken,
    decodeJwtToken: decodeJwtToken,
    generateNonce: generateNonce,
    throttle: throttle,
};
