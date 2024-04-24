# litentry-registrar

![staging](https://github.com/litentry/litentry-registrar/workflows/staging/badge.svg)

Litentry Polkadot/Kusama Registrar

## Getting started locally

- Install `mongodb-community`, details [here](https://docs.mongodb.com/manual/administration/install-community).

- Install `git-crypt`. See [git-crypt](https://github.com/AGWA/git-crypt/blob/master/INSTALL.md) for details, Mac users can simply run `brew install git-crypt`.

- Set the node env: `echo 'NODE_ENV=development' > ./.env`.

- Create the log directory: `mkdir -p ./log/litentry/registrar`.

- Install packages: `yarn`.

- Before running the app, you need to decrypt the config files. For this you will need the key on your machine, then run: `git-crypt unlock /path/to/key`.

- Add a new registrar account on our development chain: `yarn run setup`.

- Start the development server: `yarn run app`.

- Run tests: `yarn run test`.

## Set up production environment

```
npm start
```

Please make sure `pm2` is contronlled by system-level process, like `systemd`.

## How to Verify Your Identity

Request judgement from our registrar in [PolkadotJs](https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fkusama-rpc.polkadot.io#/explorer).

If you meet any problems during identity verification, please follow the instruction given in the link [https://docs.litentry.com/registrar/HowToVerifyYourIdentity.html](https://docs.litentry.com/registrar/HowToVerifyYourIdentity.html)
