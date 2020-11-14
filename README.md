# litentry-registrar
[![Build Status](https://travis-ci.org/litentry/litentry-registrar.svg?branch=master)](https://travis-ci.org/litentry/litentry-registrar)

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
	

## Staging Server (CI)

```
http://ec2-13-229-136-206.ap-southeast-1.compute.amazonaws.com:8080
```

## Chain Address 
```
wss://13.229.136.206
ws://13.229.136.206:9944
```

## Useful Links:

```
https://wiki.polkadot.network/docs/en/maintain-networks#westend-test-network
https://polkadot.js.org/apps/
https://telemetry.polkadot.io/
```
