const fs = require('fs');
const hogan = require('hogan.js');

function renderVerifyIdentityItemPage(vars) {
    const template = fs.readFileSync(`${__dirname}/templates/verifyIdentityItemTemplate.mustache`, 'utf8');
    const compiled = hogan.compile(template);

    return compiled.render(vars);
}

function renderVerificationResultPage(vars) {
    const template = fs.readFileSync(`${__dirname}/templates/verificationResultTemplate.mustache`, 'utf8');
    const compiled = hogan.compile(template);

    return compiled.render(vars);
}

module.exports = {
    renderVerifyIdentityItemPage,
    renderVerificationResultPage,
};
