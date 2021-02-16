module.exports = Object.freeze({
    http: {
        port: 8080,
        address: '0.0.0.0',
        username: 'litentry',
        password: 'Ux5@Q%9)B">a#yHq',
    },
    chain: {
        protocol: 'ws',
        provider: '18.140.130.138',
        port: 9944,
    },
    litentry: {
        mnemonic: '',
        privateKey: '',
        defaultAccount: '//Alice',
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
        callbackEndpoint: 'http://localhost:8080/callback/validationEmail',
        /* send grid */
        apiKey: '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',
        username: 'no-reply@litentry.com',
        subject: 'Validation From Litentry',
        jobInterval: 30,        //  seconds
    },

    elementValidator: {
        callbackEndpoint: 'http://localhost:8080/callback/validationElement',
        roomId: '!fwdbUHBppFPYOJXzNx:matrix.org',
        accessToken: 'MDAxOGxvY2F0aW9uIG1hdHJpeC5vcmcKMDAxM2lkZW50aWZpZXIga2V5CjAwMTBjaWQgZ2VuID0gMQowMDJiY2lkIHVzZXJfaWQgPSBAbGl0ZW50cnktYm90Om1hdHJpeC5vcmcKMDAxNmNpZCB0eXBlID0gYWNjZXNzCjAwMjFjaWQgbm9uY2UgPSA3fmxqWWorOXc1WnBGb0lNCjAwMmZzaWduYXR1cmUg3oXZA9SOsJE2bXUEnelgKxIbFJrqn5kFzv1LHgk3U4UK',
        userId: '@litentry-bot:matrix.org',
        homeServerUrl: 'https://matrix-client.matrix.org',
        jobInterval: 30,        //  seconds
    },
    twitterValidator: {
        callbackEndpoint: 'http://localhost:8080/callback/validationTwitter',
        apiKey: 'A2AbUjYT5gjne2OAOs846nSVO',
        apiKeySecret: 'gI5ieMJIJ2qAgGcbn24lmYUla9wDpafDYLFkpK22xSwFCwQcdi',
        bearerToken: 'AAAAAAAAAAAAAAAAAAAAAL3XJQEAAAAAKFKqbRv%2BU4cjnyOOpAzO%2B0yvg0A%3D2Y8wAh6p9LWJ5ZqenwPDRXikQK8BalIqHC2uHC3pS1OxAJ9c85',
        accessToken: '1324028605245083652-i0SQABpfeQbf5gmkVwvvEqhPMc6zKA',
        accessTokenSecret: 'rmJSmMSHffb7j0yixbI2AOreFbZ4ABSWMrCJs77PfsabF',
        jobInterval: 30,        //  seconds
    },
    jwt: {
        sessionSecret: '@v96a%%3s_5gBBMW',
        expiresIn: 60 * 60 * 24 * 30,
    },
});