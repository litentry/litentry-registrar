import fs from 'fs';
import hogan from 'hogan.js';

export function renderVerifyIdentityItemPage(vars: {
    account: object;
    chainName: string;
    confirmationAddress: string;
}) {
    const template = fs.readFileSync(`${__dirname}/templates/verifyIdentityItemTemplate.mustache`, 'utf8');
    const compiled = hogan.compile(template);

    return compiled.render(vars);
}

export function renderVerificationResultPage(vars: {
    identityItem: string;
    account: object;
    chainName: string;
    content: string;
}) {
    const template = fs.readFileSync(`${__dirname}/templates/verificationResultTemplate.mustache`, 'utf8');
    const compiled = hogan.compile(template);

    return compiled.render(vars);
}
