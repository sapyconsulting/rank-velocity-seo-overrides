/**
 * approval-server.js
 * Rank Velocity Agent - Slack Approval Server
 *
 * When Arjun clicks Approve in Slack, this server:
 * 1. Reads the current seo-overrides.json
 * 2. Appends the approved fix
 * 3. Commits & pushes to GitHub via API
 * 4. GitHub Pages auto-publishes the updated JSON
 * 5. Framer picks it up on next page load
 *
 * Setup:
 *   npm install express dotenv @octokit/rest
 *   Add to .env: SLACK_SIGNING_SECRET, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 */

require('dotenv').config();
const express = require('express');
const { Octokit } = require('@octokit/rest');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'sapyconsulting';
const GITHUB_REPO  = process.env.GITHUB_REPO  || 'rank-velocity-seo-overrides';
const JSON_PATH    = 'seo-overrides.json';

// --- Slack signature verification middleware ---
function verifySlackSignature(req, res, next) {
  const signature  = req.headers['x-slack-signature'];
  const timestamp  = req.headers['x-slack-request-timestamp'];
  const sigBaseStr = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const hmac       = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET);
  const mySignature = 'v0=' + hmac.update(sigBaseStr).digest('hex');
  if (mySignature !== signature) {
    return res.status(401).send('Invalid Slack signature');
  }
  next();
}

// --- Helper: fetch current JSON from GitHub ---
async function fetchCurrentOverrides() {
  const { data } = await octokit.repos.getContent({
    owner: GITHUB_OWNER,
    repo:  GITHUB_REPO,
    path:  JSON_PATH,
  });
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { json: JSON.parse(content), sha: data.sha };
}

// --- Helper: push updated JSON back to GitHub ---
async function pushUpdatedOverrides(updatedJson, sha, fixId) {
  const content = Buffer.from(JSON.stringify(updatedJson, null, 2)).toString('base64');
  await octokit.repos.createOrUpdateFileContents({
    owner:   GITHUB_OWNER,
    repo:    GITHUB_REPO,
    path:    JSON_PATH,
    message: `fix(seo): approve fix ${fixId} via Slack`,
    content: content,
    sha:     sha,
  });
}

// --- Slack interactive actions endpoint ---
app.post('/slack/actions', verifySlackSignature, async (req, res) => {
  res.status(200).send(); // Acknowledge Slack immediately

  const payload = JSON.parse(req.body.payload);
  const action  = payload.actions[0];
  const fixData = JSON.parse(action.value); // fix object sent from SEO agent

  if (action.action_id === 'approve_fix') {
    try {
      const { json: current, sha } = await fetchCurrentOverrides();

      // Append the approved fix
      current.overrides.push({
        id:           fixData.id,
        url:          fixData.url,
        title:        fixData.title        || null,
        h1:           fixData.h1           || null,
        meta_desc:    fixData.meta_desc    || null,
        canonical:    fixData.canonical    || null,
        inject_links: fixData.inject_links || [],
        approved_at:  new Date().toISOString(),
        approved_by:  payload.user.username,
      });
      current.last_updated = new Date().toISOString().split('T')[0];

      await pushUpdatedOverrides(current, sha, fixData.id);

      console.log(`[Rank Velocity] Approved fix ${fixData.id} pushed to GitHub Pages.`);
    } catch (err) {
      console.error('[Rank Velocity] GitHub push failed:', err.message);
    }
  } else if (action.action_id === 'reject_fix') {
    console.log(`[Rank Velocity] Fix ${fixData.id} rejected by ${payload.user.username}.`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Rank Velocity] Approval server running on port ${PORT}`));
