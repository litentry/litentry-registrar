'use strict';

module.exports = Object.freeze({
    http: {
        port: 8080,
        address: '0.0.0.0',
    },
    chain: {
        protocol: 'wss',
        provider: 'westend-rpc.polkadot.io'
    },
    emailValidator: {
        callbackEndpoint: 'https://litentry-registrar.azurewebsites.net/callback/validation',
        /* send grid */
        apiKey: '',
        username: 'no-reply@litentry.com',
        subject: 'Validation From Litentry'
    },

    litentry: {
        mnemonic: 'provide arrow relief camera crunch assume affair palm game stadium coconut climb',
        privateKey: ''
    },
});
