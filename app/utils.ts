import _ from 'lodash';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import LRU from 'lru-cache';

import logger from 'app/logger';
import config from 'app/config';

export function createJwtToken(data: { iat?: number; exp?: number; [property: string]: any }) {
  return jwt.sign(data, config.jwt.sessionSecret, {
    noTimestamp: !data.iat,
    expiresIn: data.exp || config.jwt.expiresIn,
  });
}

export function decodeJwtToken(token: string) {
  const data = jwt.verify(token, config.jwt.sessionSecret);
  return data;
}

export function generateNonce(length = 6) {
  return crypto.randomBytes(length).toString('hex');
}

export async function sleep(secs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, secs * 1000);
  });
}

const waitingTime = config.litentry.requestJudgementInterval * 1000 || 60 * 1000; // 60 seconds
const funcCacheSize = 4096;
const FunctionCache = new LRU(funcCacheSize);

/**
 * Invoke a function `func` every `waitingTime`
 * @param (String) funcId - the id of a throttled function
 * @param (Funcntion) func - the function to be throttled
 * @return (*) return the returns of throttled functions
 */
export function throttle(funcId: string, func: (...args: any) => any): (...args: any) => Promise<any> {
  return async function throttled(...args: any) {
    let scheduled = FunctionCache.get(funcId) as NodeJS.Timeout;

    if (scheduled) {
      logger.debug(`[throttle] ${func.name} is throttled, cannot be invoked at this moment.`);
      return;
    }

    scheduled = setTimeout(() => {
      FunctionCache.set(funcId, undefined);
      clearTimeout(scheduled);
    }, waitingTime);

    FunctionCache.set(funcId, scheduled);

    const resp = await func.apply(throttled, args);
    return resp;
  };
}
