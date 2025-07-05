const express = require('express');
const router = express.Router();
const githubController = require('../controllers/githubController');

router.get('/auth-url', githubController.getAuthUrl);
router.get('/callback', githubController.handleCallback);
router.get('/status/:userId', githubController.getStatus);
router.delete('/remove/:userId', githubController.removeIntegration);
router.post('/resync/:userId', githubController.reSyncData);

module.exports = router;