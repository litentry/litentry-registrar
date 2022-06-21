import Config from 'types/config';

class Validator {
  readonly config: Config;
  /*
   * @brief Base class for validator
   * @param: (Object)
   */
  constructor(config: Config) {
    this.config = config;
  }

  async invoke(args: any) {}
}

export default Validator;
