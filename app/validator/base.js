'use strict';
class Validator {
    /*
     * @brief Base class for validator
     * @param: (Object)
     */
    constructor(config) {
        this.config = config;
    }

    async invoke() {}
}

module.exports = Validator;
