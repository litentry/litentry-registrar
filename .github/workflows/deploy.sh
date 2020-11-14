#!/bin/sh

##################################################
# NOTE:
# $USER: set in travis enviroment
# $STAGING_SERVER: set in travis environment
# You can run `travis env list` to view the values
##################################################

TARGET_DIR=$HOME/litentry-registrar
NODE_ENV=staging
GIT_CRYPT_CMD=/usr/local/bin/git-crypt
GIT_CRYPT_KEY=$HOME/litentry-registrar-git-crypt-key-default

echo "Connecting to" $USER@$STAGING_SERVER

rsync -ra . -e ssh --delete $TARGET_DIR $USER@$STAGING_SERVER:$TARGET_DIR

ssh $USER@$STAGING_SERVER "cd $TARGET_DIR && \
    $GIT_CRYPT_CMD unlock $GIT_CRYPT_KEY && \
    echo NODE_ENV=$NODE_ENV > $TARGET_DIR/.env && \
    npm install && \
    npm run link && \
    npm start &> /dev/null"
