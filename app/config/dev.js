'use strict';

module.exports = Object.freeze({
    http: {
        port: 8080,
        address: '0.0.0.0',
    },
    chain: {
        // protocol: 'wss',
        // provider: 'westend-rpc.polkadot.io'
        // port: 443
        protocol: 'ws',
        provider: '127.0.0.1',
        port: 9944
    },
    emailValidator: {
        callbackEndpoint: 'http://localhost:8080/callback/validation',
        /* send grid */
        apiKey: '',
        username: 'no-reply@litentry.com',
        subject: 'Validation From Litentry'
    },

    litentry: {
        // mnemonic: 'provide arrow relief camera crunch assume affair palm game stadium coconut climb',
        // privateKey: '',
        defaultAccount: '//Alice',
        regIndex: 0
    },
    mongodb: {
        host: 'localhost',
        port: 27017,
        dbName: 'litentry',
        username: '',
        password: ''
    },
    requestJudgementInterval: 60*1000, // 60 seconds
});
