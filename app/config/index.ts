import colors from 'colors/safe';
import logger from 'app/logger';
import Config from 'types/config';
import development from './development';
import staging from './staging';
import production from './production';

logger.info(colors.green(`Loading config for '${process.env.NODE_ENV}' environment`));

let config: Config;

switch (process.env.NODE_ENV) {
  case 'development':
  case 'test':
    config = development;
    break;
  case 'staging':
    config = staging;
    break;
  case 'production':
    config = production;
    break;
  default:
    throw Error('Not an invalid environment');
}

export default config;
