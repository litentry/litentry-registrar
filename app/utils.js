'use strict';

const jwt = require('jsonwebtoken');


function createJwtToken(data) {
    let options = {};
    return jwt.sign(data, 'session_secret', options);
}

function decodeJwtToken(token) {
    const data = jwt.verify(token, 'session_secret');
    return data;
}

function generateNonce(length=6) {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


module.exports = {
    createJwtToken: createJwtToken,
    decodeJwtToken: decodeJwtToken,
    generateNonce: generateNonce
}
