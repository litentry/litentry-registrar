import _ from 'lodash';
import { Router } from 'express';

import logger from 'app/logger';
import { ElementValidator, EmailValidator, TwitterValidator } from 'app/validator';
import Chain from 'app/chain';
import { decodeJwtToken } from 'app/utils';
import { RequestJudgementCollection, RiotCollection } from 'app/db';
import config from 'app/config';
import { renderVerifyIdentityItemPage, renderVerificationResultPage } from 'app/pages';

const REDIRECT_URL = 'https://www.litentry.com';
const CHAIN_NAME = config.chain.name || '';

const IDENTITY_ITEMS = Object.freeze({
  email: 'Email',
  twitter: 'Twitter',
  element: 'Element',
});

const app = Router();

app.get(['/', '/health'], async (_, res) => {
  res.send();
});

app.post('/chain/provideJudgement', async (req, res) => {
  try {
    const { target, judgement } = req.body;
    const block = (await Chain.provideJudgement(target, judgement)) as { events: any[]; blockHash: string };

    return res.json({ status: 'success', msg: block.events, blockHash: block.blockHash });
  } catch (error) {
    logger.error(`GET /chain/provideJudgement unexcepected error ${JSON.stringify(error)}`);
    console.trace(error);

    res.status(400);
    return res.json({ status: 'fail', msg: new String(error) });
  }
});

app.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  const confirmationAddress = `/email-verification?token=${token}`;
  const data = decodeJwtToken(token as string) as { account: object };

  return res.send(
    renderVerifyIdentityItemPage({
      account: data.account,
      chainName: CHAIN_NAME,
      confirmationAddress,
    })
  );
});

app.get('/query', async (req, res) => {
  const { account } = req.query;
  console.log('account', account);

  if (account) {
    const results = await RequestJudgementCollection.query({
      account: account,
    });

    if (results.length) {
      res.send(results[results.length - 1]);
    } else {
      res.send({});
    }
  } else {
    res.send({
      status: 'fail',
      msg: 'account is required',
    });
  }
});
app.get('/email-verification', async (req, res) => {
  try {
    const { token } = req.query;
    const data = decodeJwtToken(token as string) as {
      _id: string;
      nonce: string;
    };
    // NOTE: We only extract the first row
    // Theoretically, there should be exact one element in queried array if existed.
    // We filter out the verified email and the request isn't cancelled
    const results = await RequestJudgementCollection.query({
      _id: data._id,
      emailStatus: { $ne: 'verifiedSuccess' },
    });
    const { nonce } = results[0];
    if (data.nonce == nonce) {
      await RequestJudgementCollection.setEmailVerifiedSuccessById(data._id);
      EmailValidator.sendConfirmationMessage(results[0].email, results[0].account, 'verified successfully');

      return res.send(
        renderVerificationResultPage({
          identityItem: IDENTITY_ITEMS.email,
          chainName: CHAIN_NAME,
          account: results[0].account,
          content: `has been verified successfully at ${new Date().toISOString()}`,
        })
      );
    } else {
      await RequestJudgementCollection.setEmailVerifiedFailedById(data._id);
      EmailValidator.sendConfirmationMessage(results[0].email, results[0].account, 'verification has failed');

      return res.send(
        renderVerificationResultPage({
          identityItem: IDENTITY_ITEMS.email,
          chainName: CHAIN_NAME,
          account: results[0].account,
          content: 'verification has failed',
        })
      );
    }
  } catch (error) {
    logger.error(`GET /email-verification unexcepected error ${new String(error)}`);
    console.trace(error);
    // res.status(400);
    // return res.json({ status: 'fail', msg: new String(error) });
    return res.redirect(REDIRECT_URL);
  }
});

app.get('/verify-element-account', async (req, res) => {
  const { token } = req.query;
  const confirmationAddress = `/element-verification?token=${token}`;
  const data = decodeJwtToken(token as string) as { account: object };

  return res.send(
    renderVerifyIdentityItemPage({
      account: data.account,
      chainName: CHAIN_NAME,
      confirmationAddress,
    })
  );
});

app.get('/element-verification', async (req, res) => {
  try {
    // NOTE: we ignore the request invoked by element preview url functionality (synapse)
    const userAgent = req.headers['user-agent'] || '';
    logger.info(`UserAgent is: ${userAgent}`);

    if (_.includes(userAgent.toLowerCase(), 'synapse')) {
      // return res.redirect(REDIRECT_URL);
      return req.socket.end();
    }

    const { token } = req.query;
    const data = decodeJwtToken(token as string) as {
      _id: string;
      nonce: string;
    };

    // NOTE: We only extract the first row
    // Theoretically, there should be exact one element in queried array if existed.
    // We filter out the verified element and the request isn't cancelled
    const results = await RequestJudgementCollection.query({
      _id: data._id,
      riotStatus: { $ne: 'verifiedSuccess' },
    });
    const { nonce } = results[0];
    let content = null;
    const rooms = await RiotCollection.query({ riot: results[0].riot });
    const roomId = rooms[0].roomId;

    if (data.nonce == nonce) {
      await RequestJudgementCollection.setRiotVerifiedSuccessById(data._id);
      const msg = `<p>Your Element ownership of <strong><em>${CHAIN_NAME}</em></strong> account</p><pre>${
        results[0].account
      }</pre><p>has been verified successfully at ${new Date().toISOString()}.</p>`;
      content = {
        body: 'Verification from Litentry Bot',
        formatted_body: msg,
        format: 'org.matrix.custom.html',
        msgtype: 'm.text',
      };
      ElementValidator.sendMessage(roomId, content);

      return res.send(
        renderVerificationResultPage({
          identityItem: IDENTITY_ITEMS.element,
          account: results[0].account,
          chainName: CHAIN_NAME,
          content: `has been verified successfully at ${new Date().toISOString()}.`,
        })
      );
    } else {
      await RequestJudgementCollection.setRiotVerifiedFailedById(data._id);
      const msg = `<p>Your Element ownership of <strong><em>${CHAIN_NAME}</em></strong> account</p><pre>${
        results[0].account
      }</pre><p>has been verified failed at ${new Date().toISOString()}.</p>`;
      content = {
        body: 'Verification from Litentry Bot',
        formatted_body: msg,
        format: 'org.matrix.custom.html',
        msgtype: 'm.text',
      };
      ElementValidator.sendMessage(roomId, content);

      return res.send(
        renderVerificationResultPage({
          identityItem: IDENTITY_ITEMS.element,
          chainName: CHAIN_NAME,
          account: results[0].account,
          content: 'verification has failed',
        })
      );
    }
  } catch (error) {
    logger.error(`GET /element-verification unexcepected error ${new String(error)}.`);
    console.trace(error);
    return res.redirect(REDIRECT_URL);
  }
});

app.get('/verify-twitter-account', async (req, res) => {
  const { token } = req.query;
  const confirmationAddress = `/twitter-verification?token=${token}`;
  const data = decodeJwtToken(token as string) as { account: object };

  return res.send(
    renderVerifyIdentityItemPage({
      account: data.account,
      chainName: config.chain.name,
      confirmationAddress,
    })
  );
});

app.get('/twitter-verification', async (req, res) => {
  try {
    const { token } = req.query;
    const data = decodeJwtToken(token as string) as {
      _id: string;
      nonce: string;
    };

    // NOTE: We only extract the first row
    // Theoretically, there should be exact one element in queried array if existed.
    // We filter out the verified twitter and the request isn't cancelled
    const results = await RequestJudgementCollection.query({
      _id: data._id,
      twitterStatus: { $ne: 'verifiedSuccess' },
    });
    const { nonce, twitter } = results[0];

    let content = null;

    if (data.nonce === nonce) {
      await RequestJudgementCollection.setTwitterVerifiedSuccessById(data._id);
      content = `Your Twitter ownership of ${CHAIN_NAME} account\n ${
        results[0].account
      } \n\nhas been verified successfully at ${new Date().toISOString()}`;
      TwitterValidator.sendMessage(twitter, content);

      return res.send(
        renderVerificationResultPage({
          identityItem: IDENTITY_ITEMS.twitter,
          account: results[0].account,
          chainName: CHAIN_NAME,
          content: `has been verified successfully at ${new Date().toISOString()}`,
        })
      );
    } else {
      await RequestJudgementCollection.setTwitterVerifiedFailedById(data._id);
      content = `Your Twitter ownership of ${CHAIN_NAME} account\n ${
        results[0].account
      } \n\nhas been verified failed at ${new Date().toISOString()}`;
      TwitterValidator.sendMessage(twitter, content);

      return res.send(
        renderVerificationResultPage({
          identityItem: IDENTITY_ITEMS.twitter,
          account: results[0].account,
          chainName: CHAIN_NAME,
          content: 'verification has failed',
        })
      );
    }
  } catch (error) {
    logger.error(`GET /twitter-verification unexcepected error ${new String(error)}.`);
    console.trace(error);
    return res.redirect(REDIRECT_URL);
  }
});

export default app;
