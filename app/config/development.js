module.exports = Object.freeze({
    http: {
        port: 8010,
        address: '0.0.0.0',
        username: 'litentry',
        password: 'Ux5@Q%9)B">a#yHq',
    },
    baseUrl: 'http//localhost:8010',
    chain: {
        protocol: 'ws',
        provider: '3.0.201.139',
        port: 9944,
        name: 'Kusama',
    },
    litentry: {
        useProxy: true,
        /**
         * `privateKey` or `defaultAccount` corresponds to proxy account if useProxy is true.
         * otherwise, it's primary account.
         */
        privateKey: '0x498e0f725d05a51e6529f86fb85d5e59b921cf7c10e140b7d454fd558adcc9f8',
        /**
         * primaryAccountId must be set if useProxy is true.
         * account on kusama/polkadot (publicly)
         */
        primaryAccountId: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5', // Alice

        regIndex: 0,
        provideJudgementInterval: 30, // seconds
        requestJudgementInterval: 30, // seconds
        defaultJudgement: 'Reasonable',
    },
    mongodb: {
        host: 'localhost',
        port: 27017,
        dbName: 'litentry',
        username: '',
        password: '',
    },
    emailValidator: {
        /* send grid */
        apiKey: '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',
        username: 'no-reply@litentry.com',
        subject: 'Validation From Litentry',
        jobInterval: 30, //  seconds
    },

    elementValidator: {
        callbackEndpoint: 'http://localhost:8080/callback/validationElement',
        roomId: '!fwdbUHBppFPYOJXzNx:matrix.org',
        accessToken:
            'MDAxOGxvY2F0aW9uIG1hdHJpeC5vcmcKMDAxM2lkZW50aWZpZXIga2V5CjAwMTBjaWQgZ2VuID0gMQowMDJiY2lkIHVzZXJfaWQgPSBAbGl0ZW50cnktYm90Om1hdHJpeC5vcmcKMDAxNmNpZCB0eXBlID0gYWNjZXNzCjAwMjFjaWQgbm9uY2UgPSA3fmxqWWorOXc1WnBGb0lNCjAwMmZzaWduYXR1cmUg3oXZA9SOsJE2bXUEnelgKxIbFJrqn5kFzv1LHgk3U4UK',
        userId: '@litentry-bot:matrix.org',
        homeServerUrl: 'https://matrix-client.matrix.org',
        jobInterval: 30, //  seconds
    },
    twitterValidator: {
        callbackEndpoint: 'http://localhost:8080/callback/validationTwitter',
        apiKey: 'A2AbUjYT5gjne2OAOs846nSVO',
        apiKeySecret: 'gI5ieMJIJ2qAgGcbn24lmYUla9wDpafDYLFkpK22xSwFCwQcdi',
        bearerToken:
            'AAAAAAAAAAAAAAAAAAAAAL3XJQEAAAAAKFKqbRv%2BU4cjnyOOpAzO%2B0yvg0A%3D2Y8wAh6p9LWJ5ZqenwPDRXikQK8BalIqHC2uHC3pS1OxAJ9c85',
        accessToken: '1324028605245083652-i0SQABpfeQbf5gmkVwvvEqhPMc6zKA',
        accessTokenSecret: 'rmJSmMSHffb7j0yixbI2AOreFbZ4ABSWMrCJs77PfsabF',
        jobInterval: 30, //  seconds
    },
    jwt: {
        sessionSecret: '@v96a%%3s_5gBBMW',
        expiresIn: 60 * 60 * 24 * 30,
    },
});
