// Ensure the NODE_ENV is loaded from .env
delete process.env.NODE_ENV;
import dotenv from 'dotenv';

const result = dotenv.config({ debug: true });

if (result.error) {
    throw result.error;
}

import chalk from 'chalk';
import cluster from 'cluster';
import express from 'express';

import Chain from 'app/chain';
import logger from 'app/logger';
import config from 'app/config';
import MyRouter from 'app/router';
import { ProvideJudgementJob, ElementJob, EmailJob, TwitterJob } from 'app/jobs';

if (cluster.isMaster) {
    logger.debug(chalk.green(`Master process ${process.pid} is running...`));
    // Fork workers
    let provideJudgementWorker = cluster.fork({ type: 'provide_judgement_process' });

    let elementWorker = cluster.fork({ type: 'element_verification_process' });
    let emailWorker = cluster.fork({ type: 'email_verification_process' });
    let twitterWorker = cluster.fork({ type: 'twitter_verification_process' });

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
        } else if (worker.id === twitterWorker.id) {
            logger.info(chalk.green('Restarting twitter worker...'));
            twitterWorker = cluster.fork({ type: 'twitter_verification_process' });
        } else {
            logger.info(chalk.red(`Invalid worker ${worker.id} received`));
        }
    });
    // @ts-ignore
} else if (cluster.worker.process.env.type === 'provide_judgement_process') {
    logger.info(chalk.green(`Start ProvideJudgement cron job`));
    (async () => {
        await ProvideJudgementJob();
    })();
    // @ts-ignore
} else if (cluster.worker.process.env.type === 'web_server_process') {
    const app = express();

    app.use(express.json());
    app.use(
        express.urlencoded({
            extended: true,
        })
    );

    app.use('/', (req, res, next) => {
        // TODO: Use json web token
        if (req.path.startsWith('/chain')) {
            const username = req.query.username || req.body.username;
            const password = req.query.password || req.body.password;

            if (config.http.username !== username || config.http.password !== password) {
                return res.json({ status: 'failed', msg: `No rights to access api ${req.path}` });
            }
        }
        next();
    });

    app.use('/', MyRouter);

    /* Listen on port */
    app.listen(config.http.port);
    /* Log some basic information */
    logger.info(chalk.green(`Process ${process.pid} is listening on: ${config.http.port}`));
    logger.info(chalk.green(`NODE_ENV: ${process.env.NODE_ENV}`));
    /* Auto Restart chain event listener */
    (async () => {
        await Chain.eventListenerAutoRestart();
    })();
    // @ts-ignore
} else if (cluster.worker.process.env.type === 'element_verification_process') {
    /// start element verification process
    logger.info(chalk.green(`Start Element cron job`));
    (async () => {
        await ElementJob();
    })();
    // @ts-ignore
} else if (cluster.worker.process.env.type === 'email_verification_process') {
    /// start email verification process
    logger.info(chalk.green(`Start Email cron job`));
    (async () => {
        await EmailJob();
    })();
    // @ts-ignore
} else if (cluster.worker.process.env.type === 'twitter_verification_process') {
    logger.info(chalk.green(`Start Twitter cron job`));
    (async () => {
        await TwitterJob();
    })();
} else {
    // @ts-ignore
    logger.error(`Unknown worker type ${cluster.worker.process.env.type}`);
    // @ts-ignore
    throw new Error(`Unknown worker type ${cluster.worker.process.env.type}`);
}
