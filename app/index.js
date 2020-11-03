'use strict';

require('colors'); // required by .green, don't remove, TODO: introduce eslint to disable warning for this line
const express = require('express');
const bodyParser = require('body-parser');

const config = require('app/config').http;
const logger = require('app/logger');
// const MyRouter = require('app/router');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// MyRouter.AppRouterV1(app);

/* Listen on port */
app.listen(config.port);
/* logging some basic information */
logger.info(`Process ${process.pid} is listening on: ${config.port}`.green);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`.green);
