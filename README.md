# litentry-registrar
![staging](https://github.com/litentry/litentry-registrar/workflows/staging/badge.svg)

Litentry Polkadot/Kusama Registrar

## Set up development environtment

- Install `git-crypt`, useful commands for `git-crypt` (maybe `git crypt` on some different platforms)

    ```
    git-crypt lock -k /path/to/key
    git-crypt unlock /path/to/key
    git-crypt status
    ```

    See [git-crypt](https://github.com/AGWA/git-crypt) for details
- Add a new registrar account on our development chain

   ```
   node setup.js
   ```

- Install node packages dependencies

    ```
    npm install
    ```

- Setup the development environment

    ```
    echo 'NODE_ENV=dev' > ./.env
    mkdir -p ./log/litentry-registrar
    ```

- Start the development server

    ```
    npm run app
    ```

- Fix import path's
  ```
  npm run link
  ```

## Set up production environment

```
npm start
```


Please make sure `pm2` is contronlled by system-level process, like `systemd`.

## Chain Address
```
wss://testnet.litentry.io
```


## How to Verify Your Identity
If you meet any problems during identity verification, please follow the instruction given in the link [https://docs.litentry.com/registrar/HowToVerifyYourIdentity.html](https://docs.litentry.com/registrar/HowToVerifyYourIdentity.html)
