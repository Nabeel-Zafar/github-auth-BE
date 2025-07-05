const mongoose = require('mongoose');

const GitHubIntegrationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  avatar: String,
  connectedAt: Date,
  accessToken: String
}, { collection: 'github-integration' });

module.exports = mongoose.model('GitHubIntegration', GitHubIntegrationSchema);