const EmailJob = require('app/jobs/email');
const ElementJob = require('app/jobs/element');
const TwitterJob = require('app/jobs/twitter');
const ProvideJudgementJob = require('app/jobs/provideJudgement');

module.exports = {
    EmailJob: EmailJob,
    ElementJob: ElementJob,
    TwitterJob: TwitterJob,
    ProvideJudgementJob: ProvideJudgementJob,
};
