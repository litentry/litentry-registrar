type Config = {
    http: {
        port: number;
        address: string;
        username: string;
        password: string;
    };
    baseUrl: string;
    chain: {
        protocol: string;
        provider: string;
        port: number;
        name: string;
    };
    litentry: {
        useProxy: boolean;
        primaryAccountId: string;
        regIndex: number;
        provideJudgementInterval: number;
        requestJudgementInterval: number;
        defaultJudgement: string;

        // development & staging
        defaultAccount?: string;

        // production
        privateKey?: string;
    };
    mongodb: {
        host: string;
        port: number;
        dbName: string;
        username: string;
        password: string;
    };
    emailValidator: {
        apiKey: string;
        username: string;
        subject: string;
        jobInterval: number;
    };
    elementValidator: {
        accessToken: string;
        userId: string;
        homeServerUrl: string;
        jobInterval: number;
    };
    twitterValidator: {
        apiKey: string;
        apiKeySecret: string;
        accessToken: string;
        accessTokenSecret: string;
        jobInterval: number;
    };
    jwt: {
        sessionSecret: string;
        expiresIn: number;
    };
};

export default Config;
