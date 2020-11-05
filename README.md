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
