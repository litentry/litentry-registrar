const fs = require('fs');
const hogan = require('hogan.js');

function renderVerifyEmailPage(vars) {
    const template = fs.readFileSync(`${__dirname}/templates/verifyEmail.mustache`, 'utf8');
    const compiled = hogan.compile(template);

    return compiled.render(vars);
}

function renderVerificationResultPage(vars) {
    const template = fs.readFileSync(`${__dirname}/templates/verificationResult.mustache`, 'utf8');
    const compiled = hogan.compile(template);

    return compiled.render(vars);
}

module.exports = {
    renderVerifyEmailPage,
    renderVerificationResultPage,
};
