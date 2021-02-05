const EmailJob = require('app/jobs/email');
const ElementJob = require('app/jobs/element');
const ProvideJudgementJob = require('app/jobs/provideJudgement');

module.exports = {
    EmailJob: EmailJob,
    ElementJob: ElementJob,
    ProvideJudgementJob: ProvideJudgementJob,
};
