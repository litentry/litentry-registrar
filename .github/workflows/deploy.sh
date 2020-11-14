#!/bin/sh

####
# NOTE:
# $USER: set in travis enviroment
# $STAGING_SERVER: set in travis environment
# You can run `travis env list` to view the values
####

TARGET_DIR=$HOME/litentry-registrar

echo "Connecting to" $USER@$STAGING_SERVER

rsync -ra . -e ssh --exclude='.git/' \
      --delete ./ $USER@$STAGING_SERVER:$TARGET_DIR

ssh $USER@$STAGING_SERVER "cd $TARGET_DIR && \
    echo NODE_ENV=staging > $TARGET_DIR/.env && \
    npm install && \
    npm run link && \
    npm start &> /dev/null"
