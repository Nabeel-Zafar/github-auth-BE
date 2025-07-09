const axios = require('axios');
const GitHubIntegration = require('../models/GithubIntegration')

const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;
const callback_url = process.env.GITHUB_CALLBACK;
const { OrgModel, RepoModel, CommitModel, PullModel, IssueModel, ChangeLogModel, UserModel } = require('../models/githubModels');

exports.getAuthUrl = (req, res) => {
  const scopes = [
    'read:org',
    'repo',        
    'user'         
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
  return exports.fetchAllData(req, res);
};


exports.reSyncData = async (req, res) => {
  console.log(`Re-sync requested for user ${req.params.userId}`);
  return exports.fetchAllData(req, res); 
};

exports.fetchAllData = async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const integration = await GitHubIntegration.findOne({ userId });
    if (!integration || !integration.accessToken) {
      return res.status(404).json({ error: 'Integration not found for user.' });
    }

    const headers = {
      Authorization: `Bearer ${integration.accessToken}`,
      Accept: 'application/vnd.github+json'
    };

    // Step 1: Get Organizations
    const orgsRes = await axios.get('https://api.github.com/user/orgs', { headers });
    const organizations = orgsRes.data;

    console.log(`Fetched ${organizations.length} organizations`);

    await OrgModel.deleteMany({ userId });
    await OrgModel.insertMany(organizations.map(org => ({ ...org, userId })));

    for (const org of organizations) {
      const orgLogin = org.login;

      // Step 2: Get Repos
      const reposRes = await axios.get(`https://api.github.com/orgs/${orgLogin}/repos?per_page=100`, { headers });
      const repos = reposRes.data;
      console.log(`📦 Fetched ${repos.length} repos for org ${orgLogin}`);

      await RepoModel.insertMany(repos.map(repo => ({ ...repo, org: orgLogin, userId })));

      for (const repo of repos) {
        const owner = repo.owner.login;
        const repoName = repo.name;

        const commitsRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=100`, { headers });
        console.log(`${commitsRes.data.length} commits in ${repoName}`);
        await CommitModel.insertMany(commitsRes.data.map(d => ({ ...d, repo: repoName, org: orgLogin, userId })));


        const pullsRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=all&per_page=100`, { headers });
        console.log(`${pullsRes.data.length} pull requests in ${repoName}`);
        await PullModel.insertMany(pullsRes.data.map(d => ({ ...d, repo: repoName, org: orgLogin, userId })));


        const issuesRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/issues?state=all&per_page=100`, { headers });
        console.log(`${issuesRes.data.length} issues in ${repoName}`);
        await IssueModel.insertMany(issuesRes.data.map(d => ({ ...d, repo: repoName, org: orgLogin, userId })));

        const changelogRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/releases`, { headers });
        console.log(`${changelogRes.data.length} changelogs in ${repoName}`);
        await ChangeLogModel.insertMany(changelogRes.data.map(d => ({ ...d, repo: repoName, org: orgLogin, userId })));
      }
    }

    const userRes = await axios.get('https://api.github.com/user', { headers });
    await UserModel.updateOne({ id: userRes.data.id }, { ...userRes.data, userId }, { upsert: true });

    res.json({ message: 'GitHub data synced successfully.' });
  } catch (error) {
    console.error('[GitHub Sync Error]', error.message);
    res.status(500).json({ error: 'Failed to fetch GitHub data.', details: error.message });
  }
};

