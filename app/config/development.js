module.exports = Object.freeze({
    http: {
        port: 8080,
        address: '0.0.0.0',
        username: 'litentry',
        password: 'Ux5@Q%9)B">a#yHq',
    },
    chain: {
        protocol: 'ws',
        provider: 'localhost',
        port: 9944,
    },
    litentry: {
        mnemonic: '',
        privateKey: '',
        defaultAccount: '//Alice',
        regIndex: 0,
        provideJudgementInterval: 300, // seconds
        requestJudgementInterval: 300, // seconds
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
        callbackEndpoint: 'http://ec2-18-140-130-138.ap-southeast-1.compute.amazonaws.com:8080/callback/validationEmail',
        /* send grid */
        apiKey: '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',
        username: 'no-reply@litentry.com',
        subject: 'Validation From Litentry',
        jobInterval: 60 * 30,        //  seconds
    },

    elementValidator: {
        callbackEndpoint: 'http://ec2-18-140-130-138.ap-southeast-1.compute.amazonaws.com:8080/callback/validationElement',
        roomId: '!fwdbUHBppFPYOJXzNx:matrix.org',
        accessToken: 'MDAxOGxvY2F0aW9uIG1hdHJpeC5vcmcKMDAxM2lkZW50aWZpZXIga2V5CjAwMTBjaWQgZ2VuID0gMQowMDJiY2lkIHVzZXJfaWQgPSBAbGl0ZW50cnktYm90Om1hdHJpeC5vcmcKMDAxNmNpZCB0eXBlID0gYWNjZXNzCjAwMjFjaWQgbm9uY2UgPSA3fmxqWWorOXc1WnBGb0lNCjAwMmZzaWduYXR1cmUg3oXZA9SOsJE2bXUEnelgKxIbFJrqn5kFzv1LHgk3U4UK',
        userId: '@litentry-bot:matrix.org',
        homeServerUrl: 'https://matrix-client.matrix.org',
        jobInterval: 60 * 30,        //  seconds

    },
    twitterValidator: {
        consumerKey: 'wh3mmqzMRCkbCpZ3OLEDMfchG',
        consumerSecret: 'BgHD74K0jCtzSVa9Gs8jrqmIsvKBcb7FqFTXTSlPdCfAOs1Ys6',
        tokenKey: '1324028605245083652-lzOEpYdTV8eKaIKXT1BapS417hmf85',
        tokenSecret: '7RmFBmWpOZejZd7AhPan6MLWGRAWeA38NEgJdLsGqSE8f',
        pollingInterval: 5000,
        maxPollingTime: 20000,
    },
    jwt: {
        sessionSecret: '@v96a%%3s_5gBBMW',
        expiresIn: 60 * 60 * 24 * 30,
    },
});
