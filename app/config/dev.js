'use strict';

module.exports = Object.freeze({
    http: {
        port: 4000,
        address: '0.0.0.0',
    },
    chain: {
        protocol: 'wss',
        provider: 'westend-rpc.polkadot.io'
    },
    emailValidator: {
        callbackEndpoint: 'http://localhost:4000/callback/validation',
        /* send grid */
        apiKey: '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',
        // TODO: change to no-reply@litentry.com
        username: 'zongxiong.chen@litentry.com',
        subject: 'Validation From Litentry'
    },

    litentry: {
        mnemonic: 'provide arrow relief camera crunch assume affair palm game stadium coconut climb',
        private_key: ''
    },
});
