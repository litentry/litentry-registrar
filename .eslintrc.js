module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "node": true,
        "mocha": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:mocha/recommended"
    ],
    "parserOptions": {
        "ecmaVersion": 12
    },
    "plugins": [
        "mocha"
    ],
    "rules": {
    }
};
