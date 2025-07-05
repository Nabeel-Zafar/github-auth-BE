const axios = require('axios');
const GitHubIntegration = require('../models/GithubIntegration')

const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;
const callback_url = process.env.GITHUB_CALLBACK;

exports.getAuthUrl = (req, res) => {
  const scopes = [
    'read:org',
    'repo',        // full repo access (including private repos)
    'user'         // read-only access to user profile (email, etc.)
  ].join(' ');

  const url = `https://github.com/login/oauth/authorize` +
              `?client_id=${client_id}` +
              `&redirect_uri=${callback_url}` +
              `&scope=${encodeURIComponent(scopes)}`;

  res.json({ url });
};

exports.handleCallback = async (req, res) => {
  const code = req.query.code;
  try {
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id,
      client_secret,
      code
    }, {
      headers: { Accept: 'application/json' }
    });

    const access_token = tokenResponse.data.access_token;

    const userInfo = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { id, login, avatar_url } = userInfo.data;

    await GitHubIntegration.findOneAndUpdate(
      { userId: id.toString() },
      {
        userId: id.toString(),
        username: login,
        avatar: avatar_url,
        connectedAt: new Date(),
        accessToken: access_token
      },
      { upsert: true, new: true }
    );

    res.redirect(`http://localhost:4200?userId=${id}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GitHub authentication failed' });
  }
};

exports.getStatus = async (req, res) => {
  const userId = req.params.userId;
  try {
    const record = await GitHubIntegration.findOne({ userId });
    if (!record) return res.status(404).json(null);
    res.json({
      connectedAt: record.connectedAt,
      username: record.username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

exports.removeIntegration = async (req, res) => {
  const userId = req.params.userId;
  try {
    await GitHubIntegration.deleteOne({ userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove integration' });
  }
};

exports.reSyncData = async (req, res) => {
  const userId = req.params.userId;
  try {
    const integration = await GitHubIntegration.findOne({ userId });
    if (!integration) return res.status(404).json({ error: 'Not connected' });

    const headers = {
      Authorization: `Bearer ${integration.accessToken}`,
      Accept: 'application/vnd.github+json'
    };

    // Example: fetch user's orgs and log
    const orgs = await axios.get('https://api.github.com/user/orgs', { headers });

    console.log(`User ${userId} organizations:`, orgs.data);

    // TODO: Fetch repos, issues, commits, etc.
    res.json({ message: 'Re-sync successful (orgs fetched)', orgs: orgs.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Re-sync failed' });
  }
};
