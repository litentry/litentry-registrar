import logger from 'app/logger';
import { throttle } from 'app/utils';

// https://jestjs.io/docs/timer-mocks
jest.useFakeTimers();
jest.mock('app/logger');

const mockPromise = (a?: string, b?: string): Promise<string[]> =>
  new Promise((res) => {
    const data = [];
    if (a) data.push(a);
    if (b) data.push(b);
    res(data);
  });

describe('throttle()', () => {
  it("won't fire during the waiting time", async () => {
    const func = throttle('abc', mockPromise);
    await func();
    await func();

    jest.runAllTimers();
    expect(logger.debug as jest.Mock).toHaveBeenCalledWith(
      '[throttle] mockPromise is throttled, cannot be invoked at this moment.'
    );
  });

  it('will fire after the waiting time', async () => {
    const func = throttle('abc', mockPromise);
    await func();
    jest.runAllTimers();
    await func();
    jest.runAllTimers();
    expect(logger.debug as jest.Mock).toBeCalledTimes(0);
  });

  it('will fire with the correct arguments', async () => {
    const func = throttle('abc', mockPromise);
    const result = await func('a', 'b');
    jest.runAllTimers();
    expect(result).toStrictEqual(['a', 'b']);
  });
});
