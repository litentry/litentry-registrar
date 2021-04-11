# litentry-registrar
![staging](https://github.com/litentry/litentry-registrar/workflows/staging/badge.svg)

Litentry Polkadot/Kusama Registrar

## Setup development environtment

- Install `git-crypt`, useful commands for `git-crypt` (maybe `git crypt` on some different platforms)

    ```
    git-crypt lock -k /path/to/key
    git-crypt unlock /path/to/key
    git-crypt status
    git-crypt status -f
    ```

    See [git-crypt](https://github.com/AGWA/git-crypt) for details
- Add a new registrar Account on our development chain

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
    or

    ```
    npm start
    ```

- Fix import path's
  ```
  npm run link
  ```


## Staging Server (CI)

```
http://ec2-13-229-136-206.ap-southeast-1.compute.amazonaws.com:8080
```

## Chain Address
```
wss://18-140-130-138
ws://ec2-18-140-130-138.ap-southeast-1.compute.amazonaws.com:9944
```

## Useful Links:

```
https://wiki.polkadot.network/docs/en/maintain-networks#westend-test-network
https://polkadot.js.org/apps/
https://telemetry.polkadot.io/
```
