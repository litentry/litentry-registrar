# litentry-registrar
Litentry Polkadot/Kusama Registrar

## Setup development environtment

Install the dependencies

```
npm install
```

Setup the development environment

```
echo 'NODE_ENV=dev' > ./.env
mkdir -p ./log/litentry-registrar
```

Start the development server

```
npm run app
```

## Example configuration
```
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
        // mnemonic: '',
        // private_key: '',
        defaultAccount: '//Alice',
        regIndex: 0
    },
    mongodb: {
        host: 'localhost',
        port: 27017,
        dbName: 'litentry',
        username: '',
        password: ''
    }
});
```

## Staging Server (CI)

**NOTE: since we don't store sensive information, such password, api-key in the repository, we need to upload configuration staging.js to Azure WebApp Server via FTP manually.**

```
https://litentry-registrar.azurewebsites.net
```



## Useful Links:

```
https://wiki.polkadot.network/docs/en/maintain-networks#westend-test-network
https://polkadot.js.org/apps/
https://telemetry.polkadot.io/
```
