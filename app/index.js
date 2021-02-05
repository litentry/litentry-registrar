'use strict';

// Ensure the NODE_ENV is loaded from .env
delete process.env.NODE_ENV;
const result = require('dotenv').config({ debug: true });

if (result.error) {
    throw result.error;
}
const chalk = require('chalk');
const cluster = require('cluster');

const Chain = require('app/chain');
const logger = require('app/logger');

if (cluster.isMaster) {
    logger.debug(chalk.green(`Master process ${process.pid} is running...`));
    // Fork workers
    let provideJudgementWorker = cluster.fork({ type: 'provide_judgement_process' });

    let elementWorker = cluster.fork({ type: 'element_verification_process' });
    let emailWorker = cluster.fork({ type: 'email_verification_process' });

    let webServerWorker = cluster.fork({ type: 'web_server_process' });

    cluster.on('exit', (worker, code, signal) => {
        if (signal) {
            logger.warn(chalk.yellow(`Worker was killed by signal: ${signal}`));
        } else if (code != 0) {
            logger.warn(chalk.yellow(`Worker exited with error code: ${code}`));
        }

        if (worker.id === provideJudgementWorker.id) {
            logger.info(chalk.green('Restarting provideJudgement worker...'));
            provideJudgementWorker = cluster.fork({ type: 'provide_judgement_process' });
        } else if (worker.id === webServerWorker.id) {
            logger.info(chalk.green('Restarting webServer worker...'));
            webServerWorker = cluster.fork({ type: 'web_server_process' });
        } else if (worker.id === elementWorker.id) {
            logger.info(chalk.green('Restarting element worker...'));
            elementWorker = cluster.fork({ type: 'element_verification_process' });
        } else if (worker.id === emailWorker.id) {
            logger.info(chalk.green('Restarting email worker...'));
            emailWorker = cluster.fork({ type: 'email_verification_process' });
        } else {
            logger.info(chalk.red(`Invalid worker ${worker.id} received`));
        }
    });
} else if (cluster.worker.process.env.type === 'provide_judgement_process') {
    const _ = require('lodash');
    // Run `provideJudgement` every `interval`
    const config = require('app/config').litentry;
    const { RequestJudgementCollection } = require('app/db');

    logger.info(chalk.green(`Start provide judgement cron job`));

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
} else if (cluster.worker.process.env.type === 'web_server_process') {
    const config = require('app/config').http;

    const express = require('express');
    const bodyParser = require('body-parser');
    const MyRouter = require('app/router');
    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    app.use('/', (req, res, next) => {
        // TODO: Use json web token
        if (req.path.startsWith('/chain')) {
            const username = req.query.username || req.body.username;
            const password = req.query.password || req.body.password;

            if (config.username !== username || config.password !== password) {
                return res.json({ status: 'failed', msg: `No rights to access api ${req.path}` });
            }
        }
        next();
    });

    app.use('/', MyRouter);

    /* Listen on port */
    app.listen(config.port);
    /* Log some basic information */
    logger.info(chalk.green(`Process ${process.pid} is listening on: ${config.port}`));
    logger.info(chalk.green(`NODE_ENV: ${process.env.NODE_ENV}`));
    /* Auto Restart chain event listener */
    (async () => {
        await Chain.eventListenerAutoRestart();
    })();
} else if (cluster.worker.process.env.type === 'element_verification_process') {
    /// start element verification process
    const { ElementJob } = require('app/jobs');
    logger.info(chalk.green(`Start Element cron job`));
    (async () => {
        await ElementJob();
    })();
} else if (cluster.worker.process.env.type === 'email_verification_process') {
    /// start email  verification process
    const { EmailJob } = require('app/jobs');
    logger.info(chalk.green(`Start Email cron job`));
    (async () => {
        await EmailJob();
    })();
    /// TODO: Add Twitter
} else {
    logger.error(`Unknown worker type ${cluster.worker.process.env.type}`);
    throw new Error(`Unknown worker type ${cluster.worker.process.env.type}`);
}
