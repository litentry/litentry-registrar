'use strict';

const jwt = require('jsonwebtoken');
const LRU = require("lru-cache");

const logger = require('app/logger');


function createJwtToken(data) {
    let options = {};
    return jwt.sign(data, 'session_secret', options);
}

function decodeJwtToken(token) {
    const data = jwt.verify(token, 'session_secret');
    return data;
}

function generateNonce(length=6) {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


const waitingTime = 10 * 1000; // 100 seconds
const funcCacheSize = 100;
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
    throttle: throttle
}
