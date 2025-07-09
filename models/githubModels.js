const mongoose = require('mongoose');

const defaultSchema = new mongoose.Schema({}, { strict: false });

const OrgModel = mongoose.model('github_organizations', defaultSchema);
const RepoModel = mongoose.model('github_repos', defaultSchema);
const CommitModel = mongoose.model('github_commits', defaultSchema);
const PullModel = mongoose.model('github_pulls', defaultSchema);
const IssueModel = mongoose.model('github_issues', defaultSchema);
const ChangeLogModel = mongoose.model('github_changelogs', defaultSchema);
const UserModel = mongoose.model('github_users', defaultSchema);

module.exports = {
  OrgModel,
  RepoModel,
  CommitModel,
  PullModel,
  IssueModel,
  ChangeLogModel,
  UserModel
};
