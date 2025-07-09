const express = require('express');
const router = express.Router();
const githubController = require('../controllers/githubController');
const dataViewController = require('../controllers/dataViewController');

router.get('/auth-url', githubController.getAuthUrl);
router.get('/callback', githubController.handleCallback);
router.get('/status/:userId', githubController.getStatus);
router.delete('/remove/:userId', githubController.removeIntegration);
router.post('/resync/:userId', githubController.reSyncData);
router.get('/fetch-all/:userId', githubController.fetchAllData);
router.get('/collections', dataViewController.getCollections);
router.get('/data/:collection', dataViewController.getCollectionData);
router.get('/search/:keyword', dataViewController.searchAcrossCollections);

module.exports = router;