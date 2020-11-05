# litentry-registrar
Litentry Polkadot/Kusama Registrar

Install `git-crypt` to decrypted some sensive information, see [https://github.com/AGWA/git-crypt
](https://github.com/AGWA/git-crypt)

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


Staging Server (CI)


```
https://litentry-registrar.azurewebsites.net
```

Useful Links:

```
https://wiki.polkadot.network/docs/en/maintain-networks#westend-test-network
https://polkadot.js.org/apps/
https://telemetry.polkadot.io/
```
